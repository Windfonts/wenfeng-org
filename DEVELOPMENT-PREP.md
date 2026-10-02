# wenfeng.org 实际开发准备

2026-10-01。原型（本目录）已完成证书线闭环，进入实际开发准备。本文档是开发启动前的完整底稿：现状基线、待拍板决策、换值清单、建议分期。拍板一项，执行一项。

**2026-10-01 晚更新：feibisi「那你开始做吧」，按推荐默认开工，不再等逐项拍板。** 决策 1 按方案 A（静态+独立签发服务）推进，决策 3 数据源管线与 M1 构建侧已落地（见 §6 执行记录）。部署侧（OSS 桶、DNS、HTTPS）仍属基础设施动作，执行前照旧单独确认。

## 0. 现状基线

原型形态：SPA（js/site.js 字符串渲染）+ python preview 服务器（本目录 `preview.py`，端口 16030）。数据 `samples.json` 10 款演示样本 + `data/attest-ledger.json` 签发台账。全部已提交（807643b…f0c9124，feat/document-wordpress-guide 分支，未推送）。

已闭环能力（生产开发以此为基线，不重做）：

- 全站 16 视图：首页/目录/详情/许可原文/许可单页/核验索引/授权证明/核对/台账/切片索引/切片工具/用法/关于/法务/怎么核/查证 /v
- 证书生命周期：签发（同申报按日幂等）→ 证面 → PDF（headless Chrome 矢量 A4 单页）→ 二维码（真码，短址 `wenfeng.org/v?s=编号`）→ 两要素在线查验（编号+持证单位）→ PDF 下载计数 → SVG 分享徽章（服务器出图，嵌入站不可改）
- 证书视觉定稿：标准公章（环文+大五星）、寒蝉宽黑体字标与水印、思源宋/黑双字体分工、外金细线+内深双线框、公文腔文案、特此证明落款
- 防错机制：外链确认层（白名单）、状态机词表、无真值字段整行不渲染、同页同概念只说一次

## 1. 开发前待拍板（5 项决策）

### 决策 1：托管形态与技术栈

约束：证面与引用只用 wenfeng.org；与 windfonts 店面分开部署；国内可达。

- 方案 A（推荐）：站点纯静态（构建产物上 OSS+CDN），证书签发/查验/徽章做成独立小服务（函数计算或轻量常驻）。静态部分零运维，签发服务面小、可审计。
- 方案 B：单台轻量服务器 + 服务端渲染。签发和站点同进程，运维集中，但多一台常驻机器。

### 决策 2：证书签发服务正规化

- 原型 HMAC-SHA256（`data/attest-hmac.json`，kid wf-proto-1）→ 生产 Ed25519
- 签发动作显式化：生产不能 GET 即签发，需要签发入口 + 权限（谁可签：运营后台？CLI？）
- 签发记录持久化（数据库或只追加日志），台账加哈希链防篡改
- 六年留存的技术落实（只追加日志天然满足）

### 决策 3：数据源管线

原型 `samples.json` 是手写演示。生产数据源需要一条管线：vault/目录真源 → 站点数据（字体条目、许可文本状态、来源 URL、取证日期、文本哈希、lineage）。

- 谁生成：扩展现有 export-fonts.mjs 管线，或独立生成器
- 真值字段：`textSha256`（许可原文归档字节哈希，原型目前是 URL 摘要占位）、`fetchedAt`、`verifiedAt`
- 更新频率与触发（上游字体更新时站点数据如何跟进）

### 决策 4：域名 / DNS / HTTPS

- wenfeng.org 解析现状与指向（现未建）
- 部署位置（国内 OSS+CDN / 海外）——影响可达性与备案
- HTTPS 证书签发方式
- 查验短址 `wenfeng.org/v` 与徽章域 `wenfeng.org/badge/` 在生产域名下生效

### 决策 5：持久化层级

签发台账、下载计数目前是 JSON 文件。生产的量级选择：SQLite 单文件即可（读写低频），或并入主数据库。下载计数按「次数」语义需要原子递增。

## 2. 原型 → 生产换值清单

| 占位 | 真值来源 | 状态 |
| --- | --- | --- |
| 原件下载地址 `cn.windfonts.com/wenfeng-original/` 前缀 | 实际 OSS 桶目录 | 占位（export-wenfeng.py 常量，桶目录定值后换） |
| 原件 `hrefSha256`（地址摘要） | 原件字节 sha256 | 待原件入桶时算 |
| `textSha256` derived（URL 摘要） | 归档许可文本字节哈希 | **已换真值**（345 款，font-licenses LICENSE 字节 sha256） |
| `fetchedAt` / `verifiedAt` 空 | 取证管线写入 | **已换真值**（git 首次入库日 / license-info verifiedAt） |
| HMAC 原型密钥 | Ed25519 生产密钥对 | M2 |
| 台账 JSON | 持久化存储 | M2 |
| 样本 10 款 | 真实目录全量 | **已换真值**（556 款，export-wenfeng.py） |
| 签发单位中文日期/issuer 常量 | 不变（已定） | — |

## 3. 建议分期

- **M1 静态站点真数据上线**：决策 1/3/4 拍板后执行——全站构建产物 + 真数据管线 + DNS/HTTPS。证书模块此期不上线（或指向占位说明页）。
- **M2 证书签发服务**：决策 2/5 拍板后执行——Ed25519 签发、显式签发入口、/v 查验、徽章、下载计数、台账哈希链。
- **M3 切片包与扩展**：切片工具真实化（对接切片管线）、造字平台入口预留（入口已留，页面不建）。

## 4. 不做清单

账号/评论系统（无登录场景）；店面功能重复（windfonts 负责）；授权证书（仅授权证明）；钓鱼维权模式（永不做，定位即「安全岛」）。

## 5. 已知边界

- 目录已是真数据（556 款，2026-10-01 换装）；出证对象定版为文风造字分叉款，等第一个真款
- 造字平台 M0 终评（A/B）降级不急（2026-10-01 feibisi 定）
- 证书生产义务：签发责任的书面化（法务页已有立场文本，生产需正式化）

## 6. 执行记录（2026-10-01 晚，M1 构建侧）

### 决策 3 数据源管线（已落地）

`export-wenfeng.py`：从本地真源导出站点数据，全程只读。

- 真源：`fonts-front/data/fonts-by-slug/*.json`（556 款店面条目）、`font-licenses/licenses/<norm>/`（474 份结构化 license-info + 345 份 LICENSE 原文字节）、`font-licenses/data/source-mirrors.json`（镜像线 134）、`fonts-front/data/font-lineage.json`（谱系 439 byName）、`font-foundries/foundries/*/profile.json`（出品方名录）
- 真值字段：`textSha256`=LICENSE 字节 sha256；`fetchedAt`=font-licenses 仓该文件首次入库日；`verifiedAt`=license-info；`rfn`=OFL 原文 Reserved Font Name 行解析（42 款）；`origin`=谱系 fork 关系拼装（206 款）
- 手工考证层：`data/export-overrides.json`（自动导出覆盖不了的考证结论，rfnNote/origin 注/别名/访客注记），导出时按 norm 合并
- 产出：`samples.json` 635KB（556 款全量）+ `data/licenses.json` 125KB 索引 + `data/license-text/<norm>.json` 345 份按需加载 + `data/export-report.json` 对账
- 口径：目录跟店面 556 款；19 个已镜像但未上货架的 norm（Clcalli/Xcdz2/Xczzsch 等）进报告不进目录；offer 分布 source 113 / jump 86 / pending 227 / missing 130
- 站点配合改造：许可原文从单体 licenses.json 拆为「索引 + 按需正文」（licensePage 路由先解析 norm 再取正文）；全套「样本/演示/10 款」文案随真数据替换为目录口径

### 决策 1 方案 A 构建侧（已落地）

`build.py`：产出 `dist/` 纯静态包（本地 gitignore，不入仓）。

- 内容：index/404 壳 + css/js/assets + samples.json + 许可索引与 345 份正文 + 逐路由壳（2363 条：source/license/slice/attest × 每款 + foundry + 顶层页）
- `robots.txt` 默认全站拒收，`--allow-index` 才放行并生成 sitemap.xml（防半成品被收录）
- `build-manifest.json`：git 版本、条目数、全文件 sha256 清单
- 不带出仓：attest-hmac.json（原型密钥）、attest-ledger.json（台账归 M2 服务）、export 报告与 overrides
- 证书 API 缺席时的降级：attest / ledger / attests 页渲染「证明服务未随本部署开放」正式占位（apiJson 探测 r.ok 与 content-type），不再报错
- 验证：纯 `python3 -m http.server` 托管 dist/，首页/详情/许可（含大小写 norm）/v 页全绿；404 回退壳就位

### 部署侧待办（执行前单独确认）

1. OSS 桶与 `wenfeng-original/` 目录定值 → 换 `ARCHIVE_HREF_PREFIX` 重导出
2. wenfeng.org DNS 指向 + HTTPS 证书（决策 4）
3. 静态托管配置：错误文档指向 /404.html
4. 首次上传 dist/（ossutil，dry-run 先行）+ `--allow-index` 构建时机

### 部署侧侦查与工具（2026-10-01 晚补，详见 DEPLOY.md）

- 域名实查：已注册（July Name Limited，2005 老域），**到期 2026-12-14 需续费**；DNS 在 Cloudflare 且已有橙云记录，现源站 520
- 本机 ossutil AK **不属文派账号**（对 wenfeng-fonts 报 does not belong to you）；`wenfeng-org` 桶名全局未被占
- 未发现 wenfeng.org 备案记录 → 期一方案=CF 前置 + OSS 源站，免备案可跑；大陆边缘等备案
- `deploy.sh`：两段缓存（数据 no-cache / assets immutable）+ 静态托管配置 + dry-run 默认，已 dry-run 验证
- `DEPLOY.md`：完整手册（现状事实表 / feibisi 四件事 / 上传步骤 / 上线校验清单）

### 部署侧执行完毕——wenfeng.org 已上线（2026-10-01 深夜）

feibisi「modiqi 里面有，现在 org 备不了案」——**.org 不在工信部可备案后缀清单，备案决策点永久关闭，长期架构=Cloudflare**。当晚上线：

- modiqi aliyun CLI wenpai profile 建桶 `wenfeng-org`（广州，BPA 关/公共读/静态托管），dist 4184 文件两段缓存上传
- apex CNAME 指桶 + **Worker「wenfeng-org-proxy」路由 wenfeng.org/\*** 转发（破三坑：OSS 默认端点 html 强制 attachment、apex CNAME 被 CF flattening 绑不了域、Origin Rule Host 改写是企业版——Worker 剥响应头一招全解，源码 worker/wf-worker.js）
- 端到端全绿：556 款/许可原文/大小写/证明降级/404/manifest 对账
- robots 仍全站拒收（noindex 构建款），放开索引等发令
- 遗留：域名续费 2026-12-14；api/app/cdn 三条死 A 记录（47.76.95.55）待 feibisi 定
