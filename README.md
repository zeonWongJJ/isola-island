# ISOLA · 潮汐之岛

一座可以 360° 自由查看的 Three.js 微缩海岛。包含灯塔、瀑布、农场、市集、帆船港口、蓝色洞穴和远海遗迹，支持白昼、日落、星夜切换。

[在线访问](https://zeonwongjj.github.io/isola-island/)

## 操作

- 拖动旋转，滚轮缩放；手机支持双指缩放与平移。
- 点击目的地或地标，镜头自动靠近景点。
- 点击「沉浸查看」收起界面，按 Esc 退出。
- 手机端通过底部「探索岛屿」打开目的地列表。
- 支持自动环绕、环岛漫游和原画对照。

## 本地开发

使用 Node.js 20 或更新版本。

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
```

测试覆盖楼梯遮挡、步道支撑、建筑基座、桥头、码头、洞穴、岛礁、镜头取景和天空可见性。

## 发布到 GitHub Pages

```sh
npm run build:pages
git add docs/index.html
git commit -m "Update island website"
git push
```

GitHub 仓库的 Settings → Pages 使用 **Deploy from a branch**，选择 **main** 分支的 **/docs** 文件夹。

`docs/index.html` 包含脚本、样式和原画图片，不依赖站点根路径，可以通过仓库子路径访问，也可以下载后直接打开。保留 `docs/.nojekyll`。

## 项目结构

- `src/`：场景、模型、地形、水面、天空、灯光与交互。
- `public/reference.png`：原始海岛概念图。
- `tests/`：结构与取景检查。
- `build-portable.mjs`：生成单文件网页。
- `docs/`：GitHub Pages 发布文件。
