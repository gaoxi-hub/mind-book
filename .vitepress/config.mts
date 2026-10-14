import { defineConfig } from 'vitepress'

// 道德经 81 章，自动生成侧边栏，避免手写 81 行
const daodejing = Array.from({ length: 81 }, (_, i) => {
  const n = i + 1
  return {
    text: `第${n}章`,
    link: `/daodejing/${String(n).padStart(2, '0')}`
  }
})

export default defineConfig({
  title: '古书计划',
  description: '以现代人的眼睛重读《道德经》',
  lang: 'zh-CN',

  // 项目页部署：仓库名 mind-book → 必须带前缀 /mind-book/
  // （若以后改成同名库 gaoxi-hub.github.io 再改回 '/'）
  base: '/mind-book/',

  // 本地预览地址(http://localhost:5173)不是真链接，跳过死链检查
  ignoreDeadLinks: [/localhost/],

  themeConfig: {
    nav: [
      { text: '道德经', link: '/daodejing/01' },
      { text: '关于', link: '/about' }
    ],
    sidebar: [
      {
        text: '道德经',
        collapsed: false,
        items: daodejing
      }
    ],
    search: true,
    lastUpdated: true,
    docFooter: { prev: false, next: true },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '主题',
    outlineTitle: '本页目录'
  }
})
