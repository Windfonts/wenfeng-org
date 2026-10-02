# 对照原型备忘 · 2026-10-02

站名：**文风 · 源文件**。只改 org lab，不动 fonts-front，不部署 wenfeng.org。

## 审计（改前）

| 页 | 当时状态 | 问题 |
|---|---|---|
| `home-options.html` | A 搜+数 / B 搜+可带走卡 / C 极简一句 | 偏浏览与搜索，**不是**工坊三入口 |
| `home-a/b/c.html` | 高保真：列表 / 面孔 / 大样张 | 样张与下载感强，缺「查授权 / 下源文件 / 报缺字」主 IA |
| `source-options.html` | A 顶筛行 / B 左栏 / C 搜索优先 | **都是行表**，卡布局不清晰 |
| 授权查询结果 | **无独立对照页** | `/license` 在 site.js 是索引+原文，缺三态结果卡对照 |

## 本轮交付

1. **首页 IA** `home-options.html` → 甲乙丙  
   - 甲：三任务大卡并列  
   - 乙：胶囊 + 搜索 + 任务行  
   - 丙：左任务竖排 / 右口径与灰位  
2. **授权查询结果** `license-query-options.html`（新）→ 甲乙丙  
   - 三态样例：可商用可改可分发 / 仅查询不可下载 / 未核实  
   - 甲卡栅 · 乙行表 · 丙单结果深面板  
3. **目录卡片** `source-options.html` → 甲乙丙卡布局  
   - 甲字面三列 · 乙横卡双列 · 丙密格  
4. 索引：`options.html`、`lab.html` 已挂链；样式在 `css/options.css` 追加段。

## 建议冯先看

1. 打开 `/options.html`  
2. **先定首页甲/乙/丙**（工坊入口怎么摆）  
3. 再定授权结果甲/乙（卡栅 vs 行表；丙作「单款深查」备选）  
4. 目录卡：若要仓库感选甲；要密度选丙  

定稿后再说落到 `js/site.js`，仍不碰生产域名。

## 完整首页整页（2026-10-02 晚）

对照页片段不够，已拆成三份可独立打开的整页：

| 文件 | 版 | 差异 |
|---|---|---|
| `home-v1.html` | 甲 | 三任务大卡主导 |
| `home-v2.html` | 乙 | 胶囊任务 + 搜索优先 |
| `home-v3.html` | 丙 | 左任务 / 右说明双栏 |

枢纽 `home-options.html` 改为 iframe 预览卡 +「打开整页」同标签链。样式 `css/home-versions.css`。截图 `_shots/home-full-2026-10-02/`。

## 丁 · 设计感整页（同晚）

冯反馈：丙看着还行，但没设计感。保留丙 IA（左任务 / 右说明），新整页：

| 文件 | 版 | 差异 |
|---|---|---|
| `home-v4.html` | 丁 | 同丙双栏 IA；超大「源文件」字阶、非对称英雄、01墨色单点、开放型右栏、等宽路径屑 |

枢纽已挂丁；截图 `_shots/home-full-2026-10-02/home-v4-desktop.png`。预览 `http://127.0.0.1:16030/home-v4.html`。未部署生产。


## 戊 · 丁再拧（同晚续）

冯反馈：丁方向对，再拧紧设计感。

| 文件 | 版 | 差异 |
|---|---|---|
| `home-v5.html` | 戊 | 同丁 IA；更大「源文件」、更短导语、竖向 01+墨线、右栏编辑短文、去 chrome 噪点 |

枢纽已挂戊；截图 `_shots/home-full-2026-10-02/home-v5-desktop.png`。预览 `http://127.0.0.1:16030/home-v5.html`。未部署生产。

## 定稿锁定 · 丁（2026-10-02 晚）

冯锁定 **丁（home-v4）** 为 wenfeng-org 首页定稿。

本轮把丁打磨成「真源站」观感（对照 app chrome，不抄进 fonts-front）：

- 顶栏 / 页脚：站名「文风 · 源文件」；导航 源文件 / 授权 / 目录 / 核验 / 关于；店面链弱化；主题用 Remix 线标（`assets/icons.svg`）
- 任务行：线标 + fill 轻翻 / 01 墨色选中；无重阴影
- 统计条：556 开源字体、113 可带走、345 许可全文、132 源镜像（samples.json / export-report · 2026-10-01；字符覆盖未计入，已诚实标注）
- 共享外壳：`css/shop.css` 的 `.site-foot` / `.icon` / `.wm-sub`；`js/site.js` 的 `chrome()` / `footer()` 已对齐，供其他页后续采用

截图：`_shots/home-full-2026-10-02/home-v4-ding-final.png`  
预览：`http://127.0.0.1:16030/home-v4.html`  
未部署生产。

## 丁反馈拧紧（2026-10-02 晚续）

冯反馈锁定稿：

1. **统计条改回之前的**：去掉四卡大数 + 悬停 fill，回到甲乙丙式行内 `<b>数</b>标签`，无悬停。
2. **01/02/03 悬停对齐谱系**：同 fonts-front `.lin-row` — fill 灰底；箭头如 `.lin-meta` 悬停才显；去掉 icon 翻色与位移动画。
3. **「本站」「稍后」可办事**：本站挂真实计数链（`/source`、`?offer=source`、`/license`）；稍后挂 `#gap` 报缺字、`/slice`、`/attest`、`/how`。

预览：`http://127.0.0.1:16030/home-v4.html`  
截图：`_shots/home-full-2026-10-02/home-v4-ding-feedback.png`


## 丁再拧 · 大数统计 + 设计/开发视图（2026-10-02 晚续 2）

冯反馈：

1. **统计要大数字效果** — 恢复四卡大数栅格（同 eeb4aaa），**仍不要悬停**（无 `.hv4-stat:hover` fill）。
2. **此站也需要设计 / 开发模式** — 对齐 fonts-front：`data-view="design|dev"`、顶栏分段开关、`localStorage wf-view`、`?view=` 覆盖；`.for-design` / `.for-dev` 显隐。写进共享 `css/shop.css` + `js/site.js` chrome，home-v4 与其他页可用。

改动：`home-v4.html`、`css/home-versions.css`、`css/shop.css`、`js/site.js`、`index.html`。

预览：`http://127.0.0.1:16030/home-v4.html`（`?view=dev` / `?view=design`）  
截图：`_shots/home-full-2026-10-02/home-v4-stats-view-design.png` · `home-v4-stats-view-dev.png`


## 丁硬修 · 大数卡 + 干净设计/开发（2026-10-02 晚续 3）

冯怒点：

1. **统计必须是大数卡** — fill 底、字阶 `clamp(2.5–3.25rem)`、无悬停；禁止退回行内文字条。
2. **设计/开发要对齐 fonts-front 干净分工** — 设计=人话中文（去「口径」等黑话）；开发=`.for-dev` 只露路径 / ID / API，hero/lead 禁止掺黑话。

保留：01/02/03 谱系悬停、本站/稍后可办事、顶栏视图开关。

预览：`http://127.0.0.1:16030/home-v4.html`（`?view=design` / `?view=dev`）  
截图：`_shots/home-full-2026-10-02/home-v4-hardfix-design.png` · `home-v4-hardfix-dev.png`

## 丁 · 统计改戊式（2026-10-02 晚续 4）

冯定调：统计要 **v5 / 戊** 风格（对照 `home-v5` 与附图像），应用到锁定丁 `home-v4.html`：

1. 大号粗体数字 + 下方小灰标签
2. 顶细横线、列间竖线
3. 白底 / 极简 / 左对齐 — **不要灰卡**
4. 统计无悬停

并收干净设计 / 开发视图文案（设计=人话；开发=路径 / ID / API）。

改动：`home-v4.html`、`css/home-versions.css`、`NOTES-OPTIONS.md`。

预览：`http://127.0.0.1:16030/home-v4.html`（`?view=design` / `?view=dev`）  
截图：`_shots/home-full-2026-10-02/home-v4-v5stats-design.png` · `home-v4-v5stats-dev.png`

## 丁挂真首页 `/`（2026-10-02 晚续 5）

冯：把锁定丁换过去，首页就用这个。

- SPA：`js/site.js` 的 `home()` 改为丁 markup（`hv4-*`）；`/` → `index.html` + site.js 按 pathname `home` 渲染
- 样式：`index.html` 链 `css/home-versions.css`；`paint` 时 `body` 为 `hv hv-v4`（不再用旧 `page-home` 样张墙首页）
- 别名：`home-v4.html` 仍可打开（对照 / 枢纽 iframe）；字标与导航指回 `/`
- 预览：`http://127.0.0.1:16030/` 应与原 `/home-v4.html` 观感一致
- 未部署生产（本仓仍是原型真源）

路由（preview.py + build.py）：

| URL | 谁出内容 |
| --- | --- |
| `/` · `/index.html` | 静态壳 `index.html` → SPA `home()` = 丁 |
| `/license` `/source` … | SITE 正则 → 同一壳 → site.js 各页 |
| `/home-v4.html` | 静态整页别名（非 SPA） |
| `build.py` 各路由 `index.html` 副本 | 同壳；OSS 静态托管按 pathname 进 SPA |

## 授权查询整页 · 甲乙丙（2026-10-02 夜）

首页丁已定。下一站：授权查询。片段卡不够，拆成三份可独立打开的整页（同丁 chrome：顶栏 / 设计·开发 / 店面 / 主题 / 页脚）。

| 文件 | 版 | 差异 |
|---|---|---|
| `license-v1.html` | 甲 | 三态卡栅并排 |
| `license-v2.html` | 乙 | 结论行表 |
| `license-v3.html` | 丙 | 单结果深面板 + 另两态小卡 |

三态样例：霞鹜文楷（可商用可改可分发）· 普惠体（仅查询不可下载）· EBAS（未核实）。

- 枢纽：`license-query-options.html`（iframe 预览 + 打开整页）
- 样式：`css/license-versions.css`（配 `shop.css`）
- **未改** SPA `js/site.js` 的 `licensesPage()` / `/license`
- 无首页式 v5 统计条（本页不需要）；命中计数用行内文案
- 截图：`_shots/license-full-2026-10-02/`
- 预览：`http://127.0.0.1:16030/license-query-options.html` · `/license-v1.html` 等

定稿后再说落到 `js/site.js`，仍不碰生产域名。
