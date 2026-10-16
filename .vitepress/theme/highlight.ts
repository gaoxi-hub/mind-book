// 纯前端读者划线：选区高亮 + localStorage 持久化（刷新仍在）
// 用法：在正文里按住选中文字即高亮；点击已高亮处可清除。
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { onMounted, watch, nextTick } from 'vue'
import './custom.css'
import './highlight.css'

type Mark = { s: number; e: number; t: string }

function container(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.vp-doc')
}

function key(): string {
  // 带 base 前缀的路径，避免不同页冲突
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

// 计算某个 (node, offset) 在 container 纯文本中的整体偏移
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

// 去掉所有已渲染的高亮（还原文本），保留文字
function unwrapAll(root: HTMLElement) {
  root.querySelectorAll('mark.hl').forEach((m) => {
    const parent = m.parentNode
    if (!parent) return
    while (m.firstChild) parent.insertBefore(m.firstChild, m)
    parent.removeChild(m)
    parent.normalize()
  })
}

// 按保存的偏移列表重新套上高亮
function applyMarks(root: HTMLElement, list: Mark[]) {
  unwrapAll(root)
  list.forEach((m, i) => {
    const a = pointAt(root, m.s)
    const b = pointAt(root, m.e)
    if (!a || !b) return
    try {
      const range = document.createRange()
      range.setStart(a.node, a.offset)
      range.setEnd(b.node, b.offset)
      const frag = range.extractContents()
      const mark = document.createElement('mark')
      mark.className = 'hl'
      mark.dataset.i = String(i)
      mark.appendChild(frag)
      range.insertNode(mark)
      root.normalize()
    } catch {
      /* 跨结构选区套不上就跳过这一条 */
    }
  })
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

function applyAll() {
  const root = container()
  if (!root) return
  applyMarks(root, load())
}

function onMouseUp() {
  const root = container()
  if (!root) return
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

  const range = sel.getRangeAt(0)
  // 选区必须整体落在正文中
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return

  // 点选已高亮处 → 只清除这一条
  let node: Node | null = range.startContainer
  while (node && node !== root) {
    if (node instanceof HTMLElement && node.classList.contains('hl')) {
      const idx = Number(node.dataset.i)
      const list = load()
      if (!Number.isNaN(idx) && list[idx]) list.splice(idx, 1)
      save(list)
      unwrapAll(root)
      applyMarks(root, list)
      sel.removeAllRanges()
      toast('已清除划线')
      return
    }
    node = node.parentNode
  }

  const s = offsetOf(root, range.startContainer, range.startOffset)
  const e = offsetOf(root, range.endContainer, range.endOffset)
  if (e <= s) return
  const text = sel.toString()
  const list = load().filter((m) => !(m.s < e && m.e > s)) // 去重覆盖
  list.push({ s, e, t: text })
  list.sort((a, b) => a.s - b.s)
  save(list)
  applyMarks(root, list)
  sel.removeAllRanges()
  toast('已划线')
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()
    onMounted(() => {
      document.addEventListener('mouseup', onMouseUp)
      nextTick(applyAll)
    })
    watch(
      () => route.path,
      () => nextTick(applyAll)
    )
  }
}
