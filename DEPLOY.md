# 部署到 GitHub Pages（VitePress）

站点已经用 VitePress 搭好，推到 GitHub 后会自动构建并发布到 `https://你的用户名.github.io/仓库名/`。

## 0. 本地启动（写内容时实时预览）

首次需要装依赖，之后直接起服务即可：

```bash
cd /Users/xixi/Desktop/XiXi的一生/mind-book

# 1) 安装依赖（仅首次）
npm install

# 2) 启动本地开发服务器
npm run dev
```

- 启动后终端会打印本地地址，浏览器打开 **http://localhost:5173** 即可看到站点。
- 修改任意 `daodejing/*.md` 保存后**自动热更新**，不用重启。
- 停止服务：在终端按 `Ctrl + C`。
- 想看最终构建产物（和线上一致）：`npm run build`，产物在 `.vitepress/dist`，可用 `npm run preview` 本地预览构建结果。

## 1. 在 GitHub 新建仓库
- 登录 github.com → **New repository**
- 仓库名建议：`mind-book`
  - 想要直接 `用户名.github.io` 访问 → 仓库名必须叫 `<你的用户名>.github.io`
  - 否则就是项目页 `用户名.github.io/mind-book`
- 设为 **Public**（GitHub Pages 免费版要求公开仓库）
- **不要**勾选 Initialize with README（本地已有文件）

## 2. 本地初始化并推送
```bash
cd /Users/xixi/Desktop/XiXi的一生/mind-book
git init
git add .
git commit -m "init: 古书计划 VitePress 站点"
git branch -M main
git remote add origin https://github.com/你的用户名/mind-book.git
git push -u origin main
```

## 3. 开启 GitHub Pages（用 Actions 部署）
- 仓库 → **Settings → Pages**
- Source 选择 **GitHub Actions**（仓库里已放 `.github/workflows/deploy.yml`）
- 推送 `main` 后，Actions 会自动 `npm ci → build → 发布`
- 等 Action 跑完（几分钟），访问：
  - 项目页：`https://<用户名>.github.io/mind-book/`
  - 用户页：`https://<用户名>.github.io/`

## 4. 自定义域名（可选）
- **Settings → Pages → Custom domain** 填你的域名
- 按提示在域名商加一条 **CNAME** 解析指向 `<用户名>.github.io`
- 同时在 `.vitepress/config.mts` 里把 `base` 改成 `'/'`（用户页）或 `'/仓库名/'`（项目页）

## 5. 以后怎么更新
- 改/加 `daodejing/*.md` → `git add . && git commit -m "..." && git push`
- 推送后自动重新部署，几分钟生效，无需手动操作

## 常见坑
- **项目页资源 404**：必须在 `config.mts` 设 `base: '/仓库名/'`，否则 CSS/JS 路径错。
- Action 里 Node 已锁 20，和本地 22 都能跑 VitePress 1.x。
