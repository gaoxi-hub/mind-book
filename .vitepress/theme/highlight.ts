// 纯前端读者划线（CSS Custom Highlight API 实现）
// 关键点：用 Range 上色，完全不改动 DOM 结构，所以不会把文档搞乱。
// 选中文字即高亮，存 localStorage（按页面路径区分），刷新/切页仍在；点击已高亮处清除这一条。
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import './custom.css'

const HL_NAME = 'mindbook-hl'
type Mark = { s: number; e: number; t: string }

// 样式在运行时注入，避免打包器把 ::highlight() 当未知伪元素丢弃
const HL_CSS = `
::highlight(mindbook-hl) {
  background-color: rgba(156, 43, 43, 0.16);
  text-decoration: underline;
  text-decoration-color: rgba(156, 43, 43, 0.55);
  text-decoration-thickness: 2px;
}
.hl-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(43, 40, 35, 0.92);
  color: #f6f1e6;
  font-family: 'Kaiti SC', 'STKaiti', '楷体', serif;
  font-size: 13px;
  letter-spacing: 0.05em;
  padding: 7px 14px;
  border-radius: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.hl-toast.show { opacity: 1; }
`

function injectStyle() {
  if (document.getElementById('mindbook-hl-style')) return
  const s = document.createElement('style')
  s.id = 'mindbook-hl-style'
  s.textContent = HL_CSS
  document.head.appendChild(s)
}

function container(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.vp-doc')
}

function key(): string {
  return 'mindbook-hl:' + location.pathname
}

function load(): Mark[] {
  try {
    return JSON.parse(localStorage.getItem(key()) || '[]')
  } catch {
    return []
  }
}

function save(list: Mark[]) {
  localStorage.setItem(key(), JSON.stringify(list))
}

// 计算 (node, offset) 在 container 纯文本中的整体偏移
function offsetOf(root: HTMLElement, node: Node, off: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let total = 0
  let cur: Node | null
  while ((cur = walker.nextNode())) {
    if (cur === node) return total + off
    total += (cur.textContent || '').length
  }
  return total + off
}

// 由整体偏移找回对应的 (node, offset)
function pointAt(root: HTMLElement, target: number): { node: Node; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null)
  let total = 0
  let cur: Node | null
  while ((cur = walker.nextNode())) {
    const len = (cur.textContent || '').length
    if (total + len >= target) return { node: cur, offset: target - total }
    total += len
  }
  return null
}

function makeRange(root: HTMLElement, s: number, e: number): Range | null {
  const a = pointAt(root, s)
  const b = pointAt(root, e)
  if (!a || !b) return null
  const r = document.createRange()
  r.setStart(a.node, a.offset)
  r.setEnd(b.node, b.offset)
  return r
}

function supported(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof (window as any).Highlight === 'function'
}

function applyAll() {
  if (!supported()) return
  const root = container()
  if (!root) return
  const fresh = new (window as any).Highlight()
  for (const m of load()) {
    const r = makeRange(root, m.s, m.e)
    if (r) fresh.add(r)
  }
  CSS.highlights.set(HL_NAME, fresh)
}

function toast(msg: string) {
  let el = document.querySelector<HTMLElement>('.hl-toast')
  if (!el) {
    el = document.createElement('div')
    el.className = 'hl-toast'
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.classList.add('show')
  window.clearTimeout((el as any)._t)
  ;(el as any)._t = window.setTimeout(() => el!.classList.remove('show'), 1400)
}

function addHighlight() {
  if (!supported()) {
    toast('当前浏览器不支持划线')
    return
  }
  const root = container()
  if (!root) return
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return

  const s = offsetOf(root, range.startContainer, range.startOffset)
  const e = offsetOf(root, range.endContainer, range.endOffset)
  if (e <= s) return

  const list = load().filter((m) => !(m.s < e && m.e > s)) // 去掉被覆盖的旧条目
  list.push({ s, e, t: sel.toString() })
  list.sort((a, b) => a.s - b.s)
  save(list)
  applyAll()
  sel.removeAllRanges()
  toast('已划线')
}

// 点击落在某个高亮区间内 → 清除那一条
function onClick(ev: MouseEvent) {
  const root = container()
  if (!root) return
  let pos: { node: Node; offset: number } | null = null
  const cp = (document as any).caretPositionFromPoint?.(ev.clientX, ev.clientY)
  if (cp) pos = { node: cp.offsetNode, offset: cp.offset }
  else {
    const cr = (document as any).caretRangeFromPoint?.(ev.clientX, ev.clientY)
    if (cr) pos = { node: cr.startContainer, offset: cr.startOffset }
  }
  if (!pos) return

  const off = offsetOf(root, pos.node, pos.offset)
  const list = load()
  const idx = list.findIndex((m) => off > m.s && off < m.e)
  if (idx >= 0) {
    list.splice(idx, 1)
    save(list)
    applyAll()
    toast('已清除划线')
  }
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()
    onMounted(() => {
      injectStyle()
      document.addEventListener('mouseup', addHighlight)
      document.addEventListener('click', onClick)
      nextTick(applyAll)
    })
    onBeforeUnmount(() => {
      document.removeEventListener('mouseup', addHighlight)
      document.removeEventListener('click', onClick)
    })
    watch(
      () => route.path,
      () => nextTick(() => setTimeout(applyAll, 30)),
      { flush: 'post' }
    )
  }
}
