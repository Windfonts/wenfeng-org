# 交接 · wenfeng-org

日期：2026-10-03。依据 `NOTES-OPTIONS.md`、`index.html`、`js/site.js` 的 `parsePath()` / `paint()`、`preview.py` 的 `SITE`。不新开页面。

站名活页顶栏是「文风 · 开源」。本仓是原型真源。只改本仓，不动 `fonts-front`。不部署 `wenfeng.org`，除非人明确要求（见 `README.md`、`DEPLOY.md`）。

## 已落活页

`paint()` 给这些路由单独的 body class。静态 HTML 是对照别名，活页由 `index.html` + `js/site.js` 渲染。

| 路由 | 方向 | 活页函数 | body class | 别名 | 样式 |
|---|---|---|---|---|---|
| `/` | 丁 | `home()` | `hv hv-v4` | `home-v4.html` | `css/home-versions.css` |
| `/license` | 戊′ | `licensesPage()` | `lq lq-v5b` | `license-v5b.html` | `css/license-versions.css` |
| `/source` | 乙′ | `listPage()` | `sd sd-v2b` | `source-v2b.html` | `css/source-versions.css` |
| `/source/{norm}` | 甲′ | `renderFont()` | `fd fd-v1b` | `font-v1b.html`（样例霞鹜文楷） | `css/font-versions.css` |
| `/gap` | 甲′ | `gapPage()` | `gp gp-v1b` | `gap-v1b.html` | `css/gap-versions.css` |
| `/about` | 己′ | `aboutPage()` | `ab ab-v6b` | `about-v6b.html` | `css/about-versions.css` |
| `/how` | 甲′ | `howPage()` | `hw hw-v1b` | `how-v1b.html` | `css/how-versions.css` |
| `/use` | 丁′ | `usePage()` | `us us-v4b` | `use-v4b.html` | `css/use-versions.css` |

`preview.py` 的 `SITE` 把 `/source` `/license` `/foundry` `/use` `/about` `/how` `/attest` `/legal` `/slice` `/gap` 映到 `index.html`。`/` 同样是这张壳。`/#gap` 在 `site.js` 里 `location.replace('/gap')`。

各页已否的对照（页还在，不是活页）：

- 首页丁之前：甲乙丙整页 `home-v1/2/3.html`，戊 `home-v5.html`。锁定的是丁 `home-v4.html`。
- 授权：甲乙丙 `license-v1/2/3.html` 整轮否；丁 `license-v4.html`、己 `license-v6.html`、己′ `license-v6b.html`、庚辛壬 `license-v7/8/9.html` 否。锁回戊，精修为戊′后落入 `/license`。`/license/{norm}` 原文页当时未改，现在仍未改。
- 目录：甲 `source-v1.html`、乙原稿 `source-v2.html` 之后丙丁 `source-v3/4.html` 否。锁回乙，精修为乙′后落入 `/source`。
- 一款：乙 `font-v2.html` 归档。甲精修为甲′后落入 `/source/{norm}`。
- 报缺字：乙 `gap-v2.html` 归档。甲精修为甲′后落入 `/gap`。
- 关于：甲乙丙丁戊 `about-v1.html`…`about-v5.html` 否。己精修为己′后落入 `/about`。
- 怎么核：乙 `how-v2.html` 归档。甲精修为甲′后落入 `/how`。
- 用法：甲乙丙 `use-v1/2/3.html`、戊己 `use-v5/6.html` 归档。看过戊己之后锁定丁 `use-v4.html`，精修为丁′后落入 `/use`。

## 还开着的页：法务

`/legal` 仍是 `legalPage()`，旧壳。`legal-options.html` 标题是「丙 / 丁（未选定）」。四版都没有写入 `js/site.js`。`index.html` 没有链 `css/legal-versions.css`。

| 文件 | 版 | 状态 |
|---|---|---|
| `legal-v1.html` | 甲 · 范围 | 已否。出证和不出证左右分开 |
| `legal-v2.html` | 乙 · 误读 | 已否。六条误读占舞台 |
| `legal-v3.html` | 丙 · 栏位 | 未选定。按证明栏往下排 |
| `legal-v4.html` | 丁 · 先后 | 未选定。五个时刻 |

甲乙丙丁都没有被选成活页方向。

## 仍是旧壳

`paint()` 未单列的路由用 `page-` + `route.page`。下面这些没有丁字阶整页，也没有枢纽选定。

| 路由 | 函数 | 标记 |
|---|---|---|
| `/legal` | `legalPage()` | `page-pad legal-page`。对照见上，未选定 |
| `/license/{norm}` | `licensePage()` | `font-page`。许可原文，戊′落入 `/license` 时写明未改 |
| `/foundry` | `foundriesPage()` | `page-pad` |
| `/foundry/{slug}` | `foundryPage()` | `page-pad` |
| `/attest` | `attestIndex()` | `page-pad` |
| `/attest/{norm}` | `attestPage()` | `cert-wrap`（不能出证时是 `page-state`） |
| `/attest/verify` | `attestVerifyPage()` | `page-pad` |
| `/attest/ledger` | `ledgerView()` | `page-pad` |
| `/slice` | `slicesPage()` | `tool-page` |
| `/slice/{norm}` | `slicePage()` | `tool-page` |
| `/v` | `lookupPage()` | `page-pad`。`parsePath()` 认 `v`；`SITE` 正则不含 `v`，无扩展名路径回退到 `index.html` |

`parsePath()` 除此之外只有 `home` 和 `notfound`。没有别的活页路由。

## 必须守的规则

- wenfeng.org 是源文件、许可、缺字，不是 CDN，不是店面。店面是 `app.windfonts.com`（fonts-front）。页脚写明：源文件、许可原文、缺字反馈；不做样张墙，不当 CDN。
- 视觉是 fonts-front 的 B，落到本仓是 B soft + home-v4 丁工艺：白底、浅灰、胶囊；无投影、无红、无暖纸；字阶对齐丁。设计视图讲人话，开发视图只露路径 / ID / API。顶栏设计/开发开关、`localStorage wf-view`、`?view=` 已在 `css/shop.css` 和 `js/site.js`。
- 微观界面先出至少两份完整整页，选定后再精修成 ′，然后才写入 `js/site.js`。不要用片段卡直接接线。已落活页都是这条路径。
- 归档是 `staged` 时不要做成下载。`fontVerb()`：`files[archive].staged` 且有上游时，主动作是「去上游」，不是下载按钮。`primaryFile()` 跳过 `staged`。
- `/gap` 的提交不发送。`gapPage()` 写明「这一下没有送出」；开发视图是 `click → no request`、`POST 未接`。样例字「龘」只是版式。

## 建议的下一序

下面是接手顺序，不是冯已经定下的方向。

1. 法务。在丙 · 栏位、丁 · 先后里选定一版，再精修，再改 `legalPage()`。不要回头修甲乙。
2. 许可原文 `/license/{norm}`。还是 `font-page`，没有整页对照。
3. 核验簇：`/attest`、`/attest/{norm}`、`/attest/verify`、`/attest/ledger`、`/v`。
4. 切片：`/slice`、`/slice/{norm}`。
5. 厂商：`/foundry`、`/foundry/{slug}`。

每一站仍是：至少两份完整整页，选定，精修，再挂路由。

## 预览与远程

```bash
cd ~/Projects/wenfeng-org
python3 preview.py --port 16030
```

本机：`http://127.0.0.1:16030/`。

远程：FeiCode `Windfonts/wenfeng-org`。

```
origin  ssh://git@feicode.com:2222/Windfonts/wenfeng-org.git
```

分支 `main`。过程备忘在 `NOTES-OPTIONS.md`。枢纽从 `options.html` 和各 `*-options.html` 进。
