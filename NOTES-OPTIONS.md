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


## 授权查询整页 · 丁戊己重做（2026-10-02 夜续）

冯否决甲乙丙（卡栅 / 行表 / 深面板）整轮。按 **home-v4 语感**（超大字阶、细线、非对称、开放右栏）重做三版；B soft 白底，**无暖纸**。SPA `/license` 仍未动。

| 文件 | 版 | IA |
|---|---|---|
| `license-v4.html` | 丁 | 裁决轨：01/02/03 细线条 + 墨色强调 + 右栏「三态怎么读」 |
| `license-v5.html` | 戊 | 主命中舞台：超大结论字阶 + 墨线卷宗；另两态细线陪衬 |
| `license-v6.html` | 己 | 三态对读栏：竖线分栏（同统计条语感），非卡非表 |

三态样例不变：霞鹜文楷（可商用可改可分发）· 普惠体（仅查询不可下载）· EBAS（未核实）。

- 枢纽：`license-query-options.html`（改挂丁戊己；甲乙丙保留备查）
- 样式：`css/license-versions.css`（追加 lq4/lq5/lq6）
- chrome：同丁首页（文风·开源、设计/开发、店面、主题、页脚）
- **未改** `js/site.js` `licensesPage()` / `/license`
- 截图：`_shots/license-full-2026-10-02/`（v4/v5/v6）
- 预览：`http://127.0.0.1:16030/license-query-options.html`


## 授权查询 · 己′ 精修（2026-10-02 夜续 2）

冯锁 **己（license-v6 三态对读栏）**，反馈太糙。本轮不换 IA，按 home-v4 丁工艺抬升：

| 文件 | 版 | 差异 |
|---|---|---|
| `license-v6b.html` | 己′ | 同己：竖线分栏 / 统计条语感 / 字阶主导 / 三态并排。结论即大数；列等高钉底动作；mono 屑与阶标（全文/摘要/空）；访客导语；无列悬停 fill |

- 枢纽 / lab / options 已挂己′
- 样式：`css/license-versions.css`（`.lq6b-*`）
- **未改** SPA `licensesPage()` / `/license`
- 截图：`_shots/license-full-2026-10-02/license-v6b-*.png`
- 预览：`http://127.0.0.1:16030/license-v6b.html`


## 授权查询 · 换向庚辛壬（2026-10-02 夜续 3）

冯对己′选「换方向」——不要再磨三态对读栏。新开三版完整整页，IA 与丁戊己明确不同：

| 文件 | 版 | IA |
|---|---|---|
| `license-v7.html` | 庚 | 权限三轴：每款堆叠表，商用/修改/分发写成大数轴（统计条语感） |
| `license-v8.html` | 辛 | 态滤展开：分段过滤三态，当前态放大；另两态跳转行 |
| `license-v9.html` | 壬 | 短码索引：左 norm 索引 / 右结论详情（master-detail） |

三态样例不变：霞鹜文楷（可商用可改可分发）· 普惠体（仅查询不可下载）· EBAS（未核实）。

- 枢纽：`license-query-options.html`（改挂庚辛壬；丁戊己/己′与甲乙丙保留备查）
- 样式：`css/license-versions.css`（追加 lq7/lq8/lq9）
- chrome：同丁首页（文风·开源、设计/开发、店面、主题、页脚、统计条工艺）
- **未改** `js/site.js` `licensesPage()` / `/license`
- 截图：`_shots/license-full-2026-10-02/`（v7/v8/v9）
- 预览：`http://127.0.0.1:16030/license-query-options.html`


## 授权查询 · 锁回戊 · 戊′精修（2026-10-03）

冯否<strong>庚辛壬</strong>：「都不行，还是先 v5」。锁回<strong>戊 · 主命中舞台</strong>。本轮不换 IA，按 home-v4 丁工艺抬升：

| 文件 | 版 | 差异 |
|---|---|---|
| `license-v5b.html` | 戊′ | 同戊：超大结论 + 右栏卷宗 + 下方细线陪衬。字阶对齐丁；结论即大数；卷宗墨线 KV；陪衬行谱系悬停；动作强墨+次级链；mono 屑 |

- 枢纽：`license-query-options.html`（戊′ 当前方向；戊原稿；庚辛壬/丁己/己′/甲乙丙归档）
- 样式：`css/license-versions.css`（`.lq5b-*`）
- **未改** SPA `licensesPage()` / `/license`
- 截图：`_shots/license-full-2026-10-02/license-v5b-desktop.png`
- 预览：`http://127.0.0.1:16030/license-v5b.html`



## 授权查询 · 戊′落入 SPA `/license`（2026-10-03）

冯说「先就这个，接着来」。戊′不再只是静态稿。

- 活页：`/license` → `licensesPage()` 用戊′主命中舞台（`lq lq-v5b` + `css/license-versions.css`）
- 无检索：三态示范（霞鹜文楷 / 普惠体 / 日暮黑体），结论按收录记录，不照抄别名里不准确的「许可空」
- 有检索：主命中 + 至多 6 条陪衬；`/license/{norm}` 原文页未改
- 别名：`license-v5b.html` 仍可打开（对照 / 枢纽 iframe）；「授权」指回 `/license`
- 预览：`http://127.0.0.1:16030/license` 应与 `/license-v5b.html` 同一版式


## 源文件目录 · 甲三轨 / 乙索引（2026-10-03）

授权戊′已落 `/license` 之后，下一站是源文件目录。不做一款详情。

| 文件 | 版 | 差异 |
|---|---|---|
| `source-v1.html` | 甲 · 三轨 | 按能办的事分三块浅灰面板：带走 / 出处 / 还缺。名字下挂许可、切片、缺字 |
| `source-v2.html` | 乙 · 索引 | 一条短码文件名索引 + 胶囊筛状态；右栏只写边界（源文件 / 许可 / 缺字 / 工具，不是 CDN） |

- 枢纽：`source-options.html`（旧的一页三卡片段已撤下）
- 样式：`css/source-versions.css`（B soft：白底、浅灰、胶囊；无投影、无红、无暖纸；字阶对齐丁）
- **未改** SPA `listPage()` / `/source`
- 截图：`_shots/source-full-2026-10-03/`
- 预览：`http://127.0.0.1:16030/source-options.html`

## 源文件目录 · 重做丙厂商册 / 丁四事（2026-10-03）

冯否甲（三轨）和乙（索引）。不是精修，换两套信息结构。SPA `/source` 仍未动。不做一款详情。

| 文件 | 版 | 差异 |
|---|---|---|
| `source-v3.html` | 丙 · 厂商册 | 按造字的人分册。浅灰面板里是这一家的字，下载 / 许可 / 切片 / 缺字写在名字旁边。不按状态拆三栏 |
| `source-v4.html` | 丁 · 四事 | 每一款横读四件事：源文件、许可、缺字、工具。没有状态胶囊，没有右栏口径。不是文件名索引 |

- 枢纽：`source-options.html`（改挂丙丁；甲乙标已否，页还在）
- 样式：`css/source-versions.css`（追加 sd3 / sd4；B soft：白底、浅灰、胶囊；无投影、无红、无暖纸）
- **未改** SPA `listPage()` / `/source`
- 截图：`_shots/source-full-2026-10-03/`（v3 / v4）
- 预览：`http://127.0.0.1:16030/source-options.html`

## 源文件目录 · 锁回乙 · 乙′精修并落入 `/source`（2026-10-03）

冯否丙（厂商册）和丁（四事），回到乙做精细化，不换信息结构。然后落入活页。

| 文件 | 版 | 差异 |
|---|---|---|
| `source-v2b.html` | 乙′ | 同乙：短码文件名索引 + 胶囊筛状态 + 右栏边界（源文件 / 许可 / 缺字 / 工具）。间距与字阶对齐丁；列题 mono；行悬停只填底；动作是常显文字不是胶囊，悬停才收到墨色；名字不加下划线 |

- 活页：`/source` → `listPage()` 用乙′（`sd sd-v2b` + `css/source-versions.css`）
- 全表按中文名排序；`offer=later` 暂无下载、`offer=check` 待核实；`offer=pending` 仍是两者合集（首页图例链过来）
- 别名：`source-v2b.html` 仍可打开；「目录」指回 `/source`
- 枢纽：`source-options.html`（乙′ 当前方向；乙原稿；甲 / 丙 / 丁已否）
- 预览：`http://127.0.0.1:16030/source` 应与 `/source-v2b.html` 同一版式
- 条目页 `/source/{norm}` 本轮不改

## 一款详情整页 · 甲动作舞台 / 乙四事纵读（2026-10-03）

目录乙′落定之后的下一站。两套完整整页，不是片段。样例固定霞鹜文楷（归档稍后、上游可取、许可全文）。**未改** `renderFont()` / `/source/{norm}`。

| 文件 | 版 | 差异 |
|---|---|---|
| `font-v1.html` | 甲 · 动作舞台 | 动词占标题（去上游），右栏卷宗；许可 / 缺字 / 切片 / 店面是下方细线 |
| `font-v2.html` | 乙 · 四事纵读 | 标题是字体名。源文件、许可、缺字、工具四条纵带，没有右栏，也没有一个动词占满舞台 |

- 枢纽：`detail-options.html`（旧片段 A/B/C 已换成整页枢纽）
- 样式：`css/font-versions.css`
- 截图：`_shots/font-full-2026-10-03/` 与下载目录
- 预览：`http://127.0.0.1:16030/detail-options.html`


## 一款详情 · 锁回甲 · 甲′精修并落入 `/source/{norm}`（2026-10-03）

冯选定甲（动作舞台）。不换信息结构。乙（四事纵读）归档。然后落入活页。

| 文件 | 版 | 差异 |
|---|---|---|
| `font-v1b.html` | 甲′ | 同甲：动词占标题（去上游）+ 右栏卷宗 + 下方细线（许可 / 缺字 / 切片 / 店面）。动词用丁的展示字阶；卷宗墨线拉满、KV 无灰卡；细线悬停只填底，名字不加下划线；强墨动作 + 次级文字链；mono 屑 |

- 活页：`/source/{norm}` → `renderFont()` 用甲′（`fd fd-v1b` + `css/font-versions.css`）
- 归档包仍是 `staged`。主动作是去上游仓库，不把稍后的 tar.gz 做成下载按钮
- 别名：`font-v1b.html` 仍可打开（样例霞鹜文楷）；「这一款」指回 `/source/{norm}`
- 枢纽：`detail-options.html`（甲′ 当前方向；甲原稿；乙已归档）
- 预览：`http://127.0.0.1:16030/source/Xwwk/` 应与 `/font-v1b.html` 同一版式



## 报缺字整页 · 甲短笺 / 乙三事纵读（2026-10-03）

首页丁、授权戊′、目录乙′、一款甲′都已落活页。还在旧壳（`page-pad` / `page-head` / `ways` / `tool-page`，不是丁字阶）的活页：`/about`、`/how`、`/legal`、`/use`、`/foundry`、`/attest`、`/slice`、`/v`。造字不在本站（关于页写明编辑器另域，开发准备里页面不建）。

下一件是**报缺字**。它是首页三件事的第三件，现在只有 `/#gap`，文案写着入口开放后再提交，开发视图写着表单未接。没有独立页。

两套完整整页，信息结构不同。当时**未改** `js/site.js`，没有 `/gap` 路由（随后甲′已落入 `/gap`）。

| 文件 | 版 | 差异 |
|---|---|---|
| `gap-v1.html` | 甲 · 短笺 | 标题是「报缺字」。左栏一条短笺，右栏边界卷宗。缺字形 / 缺收录 / 勘误用胶囊换字段，一次一件。缺的字用展示字阶 |
| `gap-v2.html` | 乙 · 三事纵读 | 标题是「三件事」。三条纵带各写各的，没有右栏，也没有胶囊切换 |

- 样例字「龘」只是版式，不表示霞鹜文楷缺少。不报覆盖率，不收账号。点提交不会发送
- 枢纽：`gap-options.html`
- 样式：`css/gap-versions.css`（B soft：白底、浅灰、胶囊；无投影、无红、无暖纸）
- 截图：`_shots/gap-full-2026-10-03/`
- 预览：`http://127.0.0.1:16030/gap-options.html`


## 报缺字 · 锁回甲 · 甲′精修并落入 `/gap`（2026-10-03）

冯选定甲（短笺）。不换信息结构。乙（三事纵读）归档。然后落入活页。

| 文件 | 版 | 差异 |
|---|---|---|
| `gap-v1b.html` | 甲′ | 同甲：标题是报缺字 + 左短笺 + 右栏边界。缺字形 / 缺收录 / 勘误用胶囊换字段。标题用丁的展示字阶；卷宗墨线拉满；字段悬停只填底；强墨动作 + 次级文字链；mono 屑 |

- 活页：`/gap` → `gapPage()` 用甲′（`gp gp-v1b` + `css/gap-versions.css`）
- 提交仍不发送；样例字「龘」只是版式
- 别名：`gap-v1b.html` 仍可打开；「报缺字」指回 `/gap`
- 枢纽：`gap-options.html`（甲′ 当前方向；甲原稿；乙已归档）
- 首页任务 03、页脚、目录边界、一款细线、授权陪衬里的 `#gap` /「表单未接」改为 `/gap` /「提交未接」；旧 `/#gap` 重定向到 `/gap`
- 预览：`http://127.0.0.1:16030/gap` 应与 `/gap-v1b.html` 同一版式

## 关于整页 · 甲三处 / 乙短文（2026-10-03）

首页丁、授权戊′、目录乙′、一款甲′、报缺字甲′都已落活页。还在旧壳的活页：`/about`、`/how`、`/legal`、`/use`、`/foundry`、`/attest`、`/slice`、`/v`。

下一件是**关于**。活页仍是 `aboutPage()` 的 `page-pad` / `ways`。本轮只出对照，**未改** `js/site.js`。

| 文件 | 版 | 差异 |
|---|---|---|
| `about-v1.html` | 甲 · 三处 | 标题是「不是店面」。三列竖线对读店面 / 仓库 / 造字。开源立场、不代言、出证范围收在栏下细线，没有右栏短文 |
| `about-v2.html` | 乙 · 短文 | 标题是「不卖字」。左栏纵读开源立场、出证范围、本站沿革。右栏只放三处地图，不把地方做成三列 |

- 文案沿用现活页：仓库不是店面、开源立场、不卖字不代言、出证范围、WordPress 已改为静态站
- 枢纽：`about-options.html`
- 样式：`css/about-versions.css`（B soft：白底、浅灰、胶囊；无投影、无红、无暖纸；字阶对齐丁）
- **未改** `aboutPage()` / `/about`
- 截图：`_shots/about-full-2026-10-03/`
- 预览：`http://127.0.0.1:16030/about-options.html`
