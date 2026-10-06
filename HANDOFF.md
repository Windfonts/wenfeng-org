> 10-06 档案版式冻结：[Cursor]。`/source/{norm}/` 版式已冻（样字→领取→怎么用标签页；`wenfeng-{norm}/fonts.css`；侧栏档案号）。真源 `docs/pages/source-norm.md` + DESIGN §8.3。已提交并推 FeiCode `5812918`。生产 OSS 待 modiqi 可连后再 `deploy.sh --bucket wenfeng-org --go`。
>
> 10-06 包名缩短：[Cursor]。装机目录与 zip 用 `wenfeng-{norm}/`（去中间 `slice`）；`wenfeng-` 品牌前缀仍不可丢。「切片」只在领取文案。未提交。
>
> 10-06 全小写：[Cursor]。对外 norm / `wenfeng-*` / 切片路径 / API / 店面链接路径一律小写。仅 OSS CDN `fonts-packages/{Canon}/` 保留原样（`xwwk`→404）。未提交。
>
> 10-06 品牌前缀：[Cursor]。`wenfeng-` 是访客识别文风的唯一方式，切片包/目录/示例路径不可丢此前缀。冻结 `wenfeng-slice-{norm}/fonts.css`，`{norm}` 小写。代码块对齐 APP `.code`（`--well` + 右上角复制）。未提交。
>
> 10-06 D-16 双视图纠正：[Cursor]。作废「中文 for-design + 英文/路径 for-dev 整段替换」。人话常显，开发只追加字段/哈希/API。清 `build.py` / `slice.js` / 页脚 / 首页侧门；页头导语与目录 lmeta 仍按 DESIGN §6.3。厂商索引可搜可分页；缺字从条目带 `name` 预填并切勘误。2217 页。未提交。
>
> 10-06 许可原文：[Grok]。`/license/{norm}/` 页头间距与用法同。玄宗行高 1.4。等宽标签字重 400。去向双视图。空档补 `textState empty`。A/B/C 骨架未改。未提交。
>
> 10-06 许可原文细化：[Grok]。A/B/C 骨架不动。页头间距与用法同；玄宗行高 1.4；等宽标签字重 400；按钮双视图路径；空档补开发视图。句子未改。未提交。
>
> 10-06 切片细化：[Grok]。三步与侧栏去向双视图；索引可套真字；页头行高 1.4；悬停只下划线。`slice.js` 重绘同套。D-15 规则未改。2217 页。未提交。
>
> 10-06 核验簇细化：[Grok]。`/attest/` 侧栏出证边界词上说明下；表单与任务行去向双视图；窄屏侧栏改 `--rule`；建议列表去掉投影。`/attest/verify` `/v` `/attest/ledger` 同套。证面不动。句子未改。2217 页。未提交。
>
> 10-06 条目细化：[Grok]。页头与用法同距；真字标题行高 1.4；等宽标签字重 400；按钮与报缺去向双视图；悬停只下划线。句子未改。2217 页。未提交。
>
> 10-06 许可原文细化：[Grok]。页头与用法同距；玄宗行高 1.4；等宽标签字重 400；按钮去向双视图；空档补开发句。句子未改。2217 页。未提交。
>
> 10-06 法务细化：[Grok]。仍是阅读栏。侧栏出证边界改词上说明下。窄屏 01–05 在标题左。去向只下划线。句子未改。未提交。
>
> 10-05 目录名字：[Grok]。人要显示名称用字体本身，照 app 详情谱系列表。`.lnm` 22px，只套名字；`data-face-pack` / `data-face-subset` 走 OSS 原样路径。无网页包的仍界面字。2217 页。未提交。
>
> 10-04 夜续：Cursor `4746a3b9` 末句。D-14 的 `/pack/slice/` 作废，见 **D-15**。这 556 款没有 `source/index.json`；网页分片用 `slice/index.json` 的 cssUrl，否则 `fonts-packages/…/result.css`。`wenfeng-slice` zip 与 `wenfeng-original` tar.gz 公网 404。条目页「还能办的事」改为紧凑任务行。
>
> 10-05：[Grok] D-11 续。`page_use` / `page_how` / `page_legal` / `page_about` 输出阅读栏，样式 `site/assets/pages/read.css`。缺字仍是短笺 `page-gap`。下面路由表里 about=ab-v6b、use=us-v4b、how=hw-v1b、gap=gp-v1b 是 10-03 旧壳记录，表未改。证明 409 无 serial 时显示「这一款还不能出证」。窄屏 `minmax(0, 1fr)`。`#id` 避开顶栏。构建 2217 页。未提交，未发 worker，未改 DNS。
>
> 10-05 再改：[Grok]。人要重做用法、关于。活页不再用阅读栏。用法是三列（原件 / 切片 / 网页，`gate.css`），注释、进主题、目录 API 在下面。关于是四字大字，店面和造字另起一栏。怎么核、法务仍是阅读栏。文案未改。未提交。
>
> 10-05 字与眉题：[Grok]。用法、关于的设计视图大字改为玄宗，字重 400。开发视图路径名仍等宽。用法、怎么核、法务、关于的眉题不再写 wenfeng.org；面包屑仍有一次。关于导语和「不挂在 wenfeng.org 下面」未改。全站扫过，没有第二处把域名当眉题。2217 页。未提交。
>
> 10-05 用法细化：[Grok]。三列不再撑满视口；大字与说明贴在一起。玄宗行高 1.4。悬停只下划线去向，不铺底。代码块 pre-wrap。关于未改。未提交。
>
> 10-05 关于细化：[Grok]。四字与店面、造字玄宗行高 1.4。说明用满格子。悬停只下划线去向。页头与用法同距。句子未改。未提交。
>
> 10-05 怎么核细化：[Grok]。仍是阅读栏。玄宗行高 1.4。五态上下排。窄屏 01 在标题左。句子未改。未提交。
>
> 10-05 开发视图：[Grok]。用法 / 关于 / 怎么核 / 法务。活页标题行高 1.4，等宽大字 1.2，阅读栏等宽小标题字重 400，页脚开发视图 URL 换行并显示。去向：`/source` `/slice` `/license` `/gap` `/attest`，店面 `shop ↗`，造字 `none`。批准句未改。法务侧栏与五态词仍中文。未提交。

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
