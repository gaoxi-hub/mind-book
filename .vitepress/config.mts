import { defineConfig } from 'vitepress'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// 站点基础路径（项目页部署必须带仓库名前缀）。
// head 里引用的静态资源不会自动补 base，所以需要这个常量手动拼接。
const BASE = '/mind-book/'

// 书目配置：以后要加新书，只要建对应文件夹并在这里加一行即可
// 章节文件名建议：01.md / 02.md ...（数字命名，避免中文路径坑）
const BOOKS = [
  { key: 'daodejing', name: '道德经' },
  { key: 'chuanxilu', name: '传习录（阳明心学）' }
  // { key: 'yijing', name: '易经' }
]

// 从章节正文首行标题里解析出「章节名 + 金句」
// 标题格式：# 书名 · 第N章 · 金句
function parseChapterTitle(firstLine) {
  const raw = firstLine.trim().replace(/^#\s*/, '')
  const parts = raw.split('·').map(s => s.trim()).filter(Boolean)
  if (parts.length >= 3) {
    return { label: parts[1], quote: parts.slice(2).join('·').trim() }
  }
  if (parts.length === 2) {
    return { label: parts[1], quote: '' }
  }
  return { label: '', quote: '' }
}

// 生成一本书的侧边栏条目：第N章:本章金句
function buildBookGroup(key, name) {
  const dir = path.join(root, key)
  if (!fs.existsSync(dir)) return null

  const items = fs
    .readdirSync(dir)
    // 只认 01.md / 02.md 这类纯数字命名，避免 index.md 之类的页面混进目录
    .filter(f => /^\d+\.md$/.test(f))
    .sort()
    .map(f => {
      const slug = f.replace(/\.md$/, '')
      let label = `第${Number(slug)}章`
      let quote = ''
      try {
        const first = fs.readFileSync(path.join(dir, f), 'utf-8').split('\n')[0]
        const p = parseChapterTitle(first)
        if (p.label) label = p.label
        quote = p.quote
      } catch {
        /* 读不到就用默认章节名 */
      }
      return {
        text: quote ? `${label}:${quote}` : label,
        link: `/${key}/${slug}`
      }
    })

  if (items.length === 0) return null
  return { text: name, collapsed: false, items }
}

// 侧边栏用「对象形式」按路径分段：
// 只有在 /daodejing/ 下的页面才显示道德经目录，
// /books、/about 这类独立页面不匹配任何键，就不显示侧边栏。
// （若写成数组形式，会对所有页面生效——独立页面也会带出目录）
const sidebar = {}
for (const b of BOOKS) {
  const group = buildBookGroup(b.key, b.name)
  if (group) {
    sidebar[`/${b.key}/`] = [group]
  }
}

export default defineConfig({
  title: 'XiXi 慢读',
  description: '国学经典读书笔记：用大白话重读《道德经》《易经》《传习录》',
  lang: 'zh-CN',

  // 项目页部署：仓库名 mind-book → 必须带前缀 /mind-book/
  // （若以后改成同名库 gaoxi-hub.github.io 再改回 '/'）
  base: BASE,

  // 本地预览地址(http://localhost:5173)不是真链接，跳过死链检查
  ignoreDeadLinks: [/localhost/],

  // 站点图标：朱印「讀」（路径需手动拼 BASE）
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#f6f1e6' }]
  ],

  themeConfig: {
    nav: [
      { text: '书目', link: '/books' },
      { text: '道德经', link: '/daodejing/01' },
      { text: '传习录', link: '/chuanxilu/01' },
      { text: '关于', link: '/about' }
    ],
    sidebar,
    search: true,
    lastUpdated: true,
    lastUpdatedText: '最后修订于',
    docFooter: { prev: false, next: '下一篇' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    outlineTitle: '本页目录',

    footer: {
      message: '慢慢读古书，慢慢过日子',
      copyright: 'Copyright © 2026 XiXi · 本站内容为个人读书笔记'
    }
  }
})
