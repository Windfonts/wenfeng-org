> 10-04 夜：长会话 4746 已整理（首页丙′定稿/许可ABC/核验簇/切片防盗链），集群记忆 wenfeng-org-prototype-state 已补，DECISIONS D-14。当前构建 2157 页，check 基线 2148。

# 交接 · wenfeng-org

日期：2026-10-03。依据 `NOTES-OPTIONS.md`、`index.html`、`js/site.js` 的 `parsePath()` / `paint()`、`preview.py` 的 `SITE`。不新开页面。

站名活页顶栏是「文风 · 开源」。本仓是原型真源。只改本仓，不动 `fonts-front`。不部署 `wenfeng.org`，除非人明确要求（见 `README.md`、`DEPLOY.md`）。

## 当前主线（10-04）

- 真源仍是 v2：预览 **`python3 site/build.py && python3 site/serve.py --port 16031`**。`:16030` 只对照。
- 目录三稿对照：`/lab/source-a/` 甲大字行、`/lab/source-b/` 乙双列、`/lab/source-c/` 丙左行右预览。**活页 `/source/` 未改**。
- 边缘 `/api/css` 以夜⑯ 节点分裂为准。不部署 `wenfeng.org`，除非人点。

## 已落活页

`paint()` 给这些路由单独的 body class。静态 HTML 是对照别名，活页由 `index.html` + `js/site.js` 渲染。

| 路由 | 方向 | 活页函数 | body class | 别名 | 样式 |
|---|---|---|---|---|---|
| `/` | 丙′ 定稿 | `page_home()` | `lab-home-page` | `/lab/home-c/` | `lab-home.css` |
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

- wenfeng.org 是源文件、许可、缺字，不是 CDN，不是店面。店面是 `app.windfonts.com`（fonts-front）。页脚写明：源文件、许可原文、缺字反馈；不做样张墙，不当 CDN。造字编辑器不挂本站，但缺字要能导到造字平台；首页衬字「造字」合法（`DECISIONS.md` **D-10**）。
- 国内口径：侧门常显「授权查询 / 获取证书 / 缺字勘误」，悬停衬字「正版 / 免费 / 造字」。后续收商业字体查询库、证书分免费与付费合规、缺字导造字平台。不要用「更正确」的词替换这三字。
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

## 2026-10-03 v2 静态重做与字体对齐 [GC]

- 新站在 `site/`（静态多页，`python3 site/build.py && python3 site/serve.py --port 16031`），说明见 `site/README.md`。
- 一份 layout、一份 `site.css`、一份 `site.js`，全部路由保留（source/license/attest/slice/foundry/use/how/legal/about/gap/v）。
- 根目录历史过程稿（*-v*.html、*-options.html、a–f、hifi、home-*、lab、from-app、_shots）移至 `archive/prototype-2026-09/` 归档。旧版对照原型（16030）保留未动。
- 字体与证面严格对齐 16030 真源：
  1. 默认恢复 16030 经典正式证面（双框、金线织纹、寒蝉宽黑体「文风字体」水印、思源宋体 `WF-Systsc` 骨架、思源黑体 `WF-Syhtsc` 表格与朱红印章），保留 16031 现代极简版式备用，支持一键切换与记忆。
  2. 修复寒蝉宽黑体四个字形（15 体, 16 文, 18 风, 19 字）的 `@font-face` 声明。
  3. `site/build.py` 通过软链引用 `assets/shs` 与 `assets/shsans` 分片，并在 `page_attest` 与 `page_lookup` 通过 `extra_head` 预加载样式表；`site.js` 实现 `lazyPreviews()` 与 WebFont 按需加载。
- 调整完毕并验证通过后执行提交合并。

## 2026-10-04 22:15 - [CC] 首次部署上线（da1185a）

- 人指令「提交推送并部署一版上线」。通道=DEPLOY.md §2：dist 2206 文件 → scp 推 modiqi → `aliyun --profile wenpai` 双层上传 oss://wenfeng-org（HTML/数据 no-cache、woff2/png/webp immutable）。
- 坑：macOS tar 带出 4376 个 `._*` AppleDouble（文件数 6582 vs 本地 2206），`COPYFILE_DISABLE=1 tar --exclude='._*'` 重打后对齐。
- 线上核验全绿：品牌句「持续更新、许可清晰」/data-rot 轮换标记/文风云®/三侧门句/导语/轮换切片 6d3e.woff2 200/lab-home.css 玄宗新码点/目录路由 /source/Xwwk/ 200。CF 缓存未清（HTML no-cache 自重验证）。
- modiqi 工位已归还（~/wf-deploy/ 残留 dist 包与解包目录，下次可覆盖）。
