# wenfeng.org 原型定位评审（2026-09-30）

评审人：[CC]（平台产品分析专员）。只分析，未改任何原型文件。依据：原型代码（js/site.js、preview.py、samples.json、data/licenses.json、OPEN-SOURCE-ATTEST.md、COPY-AUDIT-2026-09-30.md）+ 三份项目记忆 + 集群记忆 #8899/#8911/#8912/#8648 + 同类平台公开页对照（来源见文末）。

## 结论先行

1. 原型把「源文件和下载」这条主线做出来了，offer 四态、切片门、证书三件事都在。离「独立授权平台」还差的**是证据链**：许可原文页一半不是原文、下载没有哈希、核验方法没有专页、出错没有纠错入口。
2. 「开源商用」落到产品上是五个硬要求：进站标准、取证标准、纠错通道、RFN 纪律、再分发边界。原型已覆盖 RFN 和再分发边界（/legal），其余三个只有零散文案。
3. 数据模型字段基本够用，缺的是「证据」和「时间」：licenseTextState、licenseSourceUrl、verifiedAt、files[].sha256、lineage 保留字段，最小集见 §3。
4. 访客三条路都能走通，断点集中在：gated 款详情页拿不到厂商官网链接（纯文本）、pending 款详情页没有下一跳、missing 与 source 两种状态对同一现实（上游可得）给出两套说辞。逐条见 §4。
5. 造字平台预留量级很小：关于页三域卡已有，API 加一个 nullable 的 lineage 字段加一句 schema 说明即可，不做 UI。

---

## 1. 定位拆解：两句话职责边界

集群记忆 #8899（2026-09-29 人纠偏）：wenfeng.org 是源文件和下载站，授权存档只是一小块。对照三域记忆（windfonts-glyph-platform-2026-09）里的三件套飞轮，边界可以写成两句话：

**wenfeng.org 提供：**
- 开源原件的带走通道（镜像归档、上游跳转），带完整性凭证（哈希、镜像同步状态）。
- 授权原文的存档与出处链（原文文本、来源 URL、取得日期、哈希）。
- 标准开源协议的核验证书（文派科技签发，只证收录时状态）。
- 禁再分发免费商用字的自托管切片通道（原包核验门）。
- 造字平台产出物的收录与谱系记录（预留）。

**wenfeng.org 拒绝：**
- 不托管厂商禁再分发的原件（offer 四态里的 jump + distribution=false，普惠体样例已正确执行）。
- 不给厂商自拟协议出证（OPEN-SOURCE-ATTEST.md 出证范围，代码 `_spdx()` 白名单一致）。
- 不把素材站声明、README 徽标当授权依据（windfonts-license-text-archive 记忆里的取证铁律：以发布件 name 表内嵌声明/随包 LICENSE 原文为准）。
- 不做账号、不做网页托管 CSS、不做控制台（这些归店面 app.windfonts.com，顶栏「去店面」分工清楚）。
- 不走钓鱼维权（windfonts-glyph-platform 记忆 §行业暗面：安全岛定位，永不收割用户）。

对照店面分工：windfonts.com 管「网页里用」（托管 CSS、账号、控制台），wenfeng.org 管「带走」（原件、原文、证书、切片包）。原型顶栏和关于页三域卡已经表达了这个分工，定位本身在页面上是清楚的。

**和同类平台的差异点**：Google Fonts 全库只收标准开源协议，许可信息靠每包附带 LICENSE（[Google Fonts Licensing](https://fonts.google.com/knowledge/glossary/licensing)、[FAQ](https://fonts.google.com/faq)）；Fontsource 每个 npm 包带 license 字段和 LICENSE 文件（[fontsource/fontsource](https://github.com/fontsource/fontsource)）；字体天下这类下载站则明确声明「商用请与权属方联系」，下载站自己不给授权结论。国内下载站不敢给结论、国外平台只做开源单一档，wenfeng.org 卡在中间给结论（开源出证、厂商协议给原文），这个位置的差异化成立，但前提是**每个结论都带证据链**。这正是原型目前的薄弱处。

---

## 2. 缺失页面/功能块清单（按优先级）

标注：**in-prototype** = 纯前端 + preview.py 静态 API 能做；**生产期** = 需要数据管线或后端；**待拍板** = 需要人定方向。

| # | 缺失项 | 现状证据 | 级别 | 优先级 |
|---|--------|----------|------|--------|
| 1 | **许可原文页的状态标注** | data/licenses.json 里 Albbpht、Tsanger 的 body 是条款摘要，Xxzt、Dyh、Syhtcjk 是「原文在某仓」的指引，只有 Xwwk、Qhddl 是真原文。页面标题一律叫「许可原文」（site.js:871 `font-flag`），访客分不清看到的是原文还是摘要 | in-prototype | P0 |
| 2 | **纠错/申诉入口** | 全站没有任何联系方式。pending 款（Qzkswjz）详情页访客明知许可实情也无法反馈；许可写错了也没有「报告问题」入口。猫啃网的做法是详情页展示协议并建议用户截图存证（[猫啃网授权指南](https://www.maoken.com)），wenfeng 的证书正中这个需求，但纠错方向是反的：用户发现问题要能递进来 | in-prototype | P0 |
| 3 | **「我们怎么核」方法页** | 取证铁律（发布件 name 表内嵌声明/随包 LICENSE 为准、README 徽标不作数、OFL 衍生件不得加限）只存在于内部记忆，页面侧只有 /legal #legal-what 讲证书是什么，没讲授权怎么取的证 | in-prototype | P0 |
| 4 | **收录标准页** | 什么字能进目录，现在散在 offer 四态和 /legal 出证范围里。缺一页正面回答：标准开源协议进镜像、厂商自拟协议只进许可档、只标免费商用无文本的不进 | in-prototype | P1 |
| 5 | **API 字段语义** | /use 的 API 段列了端点（site.js:1208-1222），但 offer/slice/distribution/licenseName 的取值语义没有任何文档。第三方拿了 `/api/v1/fonts` 不知道 `slice:"gated"` 和 `offer:"jump"` 怎么读 | in-prototype | P1 |
| 6 | **下载完整性** | 开源款 archive 下载无 SHA-256 显示（已知缺口：无私有收录整包对照表）。镜像款至少可显示「整包哈希待收录」的诚实占位 | in-prototype（字段+占位）/ 生产期（真哈希管线） | P1 |
| 7 | **切片筛选拆分** | 目录筛「切片」混装 planned+gated（site.js:250-256 byOffer），countNote 有分计数但筛选项不区分。须核验和稍后提供是两种访客意图 | in-prototype | P2 |
| 8 | **厂商索引入口** | /foundries 页面存在（site.js:1146）但顶栏、页脚都没有入口，只有卡片和详情页的厂商链接能到达。孤页 | in-prototype | P2 |
| 9 | **外链确认** | 集群记忆 #8648：文风公开站点到站外网址先弹「即将离开文风」。原型所有外链（feicode/github/alibabafonts/tsanger）都是直接 `target="_blank"`（site.js hrefAttrs），拦截未实现 | in-prototype | P2 |
| 10 | **gated 款详情页的厂商官网链接** | Albbpht 的 visitorNote 写「原包去阿里巴巴字体官网取」但是纯文本（site.js:781 esc 输出），sliceGate.origin 里的链接只在 /slice 工具页渲染（site.js:982-988）。详情页该有可点的「去厂商官网取原包」 | in-prototype | P1 |
| 11 | **许可变更记录** | 许可条款、核实状态随时间变化（Arkp 就是现成案例：店面曾写 MIT，收录记 OFL）。现在无处记录「何时从什么改成什么」 | 生产期（需 font-licenses 仓管线） | P2 |
| 12 | **下架公示** | /legal #legal-cn 写「文风下架以核验页和目录状态为准」，但没有下架记录页。集群记忆 #8708 里寒蝉矩阵体等商用款已安排下架，这类动作将来要有公示处 | 生产期 | P2 |
| 13 | **收录提名入口** | 「想推荐一款字体」没有入口。原型期可以只放一行「提名请到……」的占位 | 生产期（表单）/ in-prototype（占位一行） | P3 |
| 14 | **sliceGate 判据是否进公开 API** | preview.py `_public_font` 原样返回 sliceGate（含 nameHints、minBytes），`/api/v1/fonts/Albbpht` 实测可见。无害但算内部判据外泄，收不收要定 | 待拍板 | P3 |
| 15 | **证书 embed 结论硬编码** | preview.py:164-172 `_conclusions` 里 `embed: True` 写死。白名单内协议嵌入大体成立，但 CC-BY-SA 的嵌入语义、未来白名单扩充时这个字段需要按协议判 | 待拍板 | P3 |
| 16 | **「可再分发但本站没有」的状态词** | 仓耳舒圆 license 明确「允许修改与再分发」（licenses.json），却因注册墙拿不到完整包，状态词是「去出处」，和普惠体「禁再分发」共用一个词。法律事实和库存事实在 UI 上混了 | 待拍板 | P2 |

---

## 3. 数据模型字段扩展建议（最小集）

现字段（samples.json）：norm/name/en/aliases/licenseName/foundry/foundrySlug/offer/slice/distribution/shop/weights/mirror/files/jump/visitorNote/sliceGate/restrictedLogin。

**评估**：状态机表达（offer/slice/distribution/sliceGate/mirror）是够的，也和渲染逻辑对得上。缺的全是「证据」和「时间」：

- 许可只有 name 字符串。SPDX 是运行时从名字猜的（preview.py `_spdx`、site.js `licenseSpdx`），名字写法一变就猜错。Arkp 的「店面写 MIT、收录记 OFL」说明名字不可靠，得有独立字段。
- 原文哈希是 preview.py 运行时对 licenses.json body 现算的（preview.py:219），body 一改哈希就变，没有「何时从何处取得」的锚点。
- 文件无 sha256。证书里 files.hrefSha256 是下载 URL 字符串的哈希（preview.py:223），自己注了「原型用下载地址摘要，生产换成原件 sha256」。
- 无 verifiedAt/verifiedBy。证书有 issuedAt，但那是出证时间，收录核实时间没有。
- 无 lineage。造字平台派生件将来进站需要的字段完全没预留。

**最小扩展集**（全部 nullable，老数据不填照跑；原型期只给已知真值，不造假扩样本）：

```json
{
  "norm": "Xwwk",
  "licenseName": "SIL Open Font License 1.1",
  "license": {
    "spdx": "OFL-1.1",
    "textState": "full",
    "textSha256": "（对 licenses.json body 的 sha256，生成时写入）",
    "sourceUrl": "https://github.com/lxgw/LxgwWenKai/blob/master/OFL.txt",
    "fetchedAt": "2026-09-26",
    "verifiedAt": "2026-09-26",
    "verifiedBy": "font-licenses 授权线"
  },
  "files": [
    {
      "kind": "archive",
      "href": "https://feicode.com/lxgw/LxgwWenKai/archive/master.tar.gz",
      "sha256": null,
      "sha256Note": "整包哈希待收录"
    }
  ],
  "mirror": {
    "state": "mirrored",
    "syncedAt": null,
    "feicode": "https://feicode.com/lxgw/LxgwWenKai",
    "upstream": "https://github.com/lxgw/LxgwWenKai"
  },
  "lineage": null
}
```

字段语义：
- `license.spdx`：收录时核定的 SPDX，落库不再猜。
- `license.textState`：`full`（原文全文）/ `summary`（条款摘要）/ `pointer`（只给原文出处）/ `missing`。许可原文页按这个值换标题和说明（对应 §2 第 1 条）。
- `license.sourceUrl + fetchedAt + textSha256`：证据三件套，证书里已经引用哈希，补上出处和时间链才闭环。
- `files[].sha256`：整包哈希，null 时 UI 显示「待收录」，不说谎。
- `mirror.syncedAt`：镜像最近同步时间（生产数据源已有 source-mirrors.json 的 mirror_updated，8h 同步周期，记忆 windfonts-license-text-archive）。
- `lineage`：造字平台预留，见 §5。

不建议加的：attestable 布尔（现有 `_spdx` 白名单逻辑迁到数据侧即可，别两处维护）、licenseVersion 独立字段（OFL 只有 1.1 在用，spdx 里已含版本，真需要时从 spdx 解析）。

---

## 4. 访客三路走查断点清单

### 路 A：开源直接拿（以霞鹜文楷 Xwwk 为例）

首页 hero「拿走文风·霞鹜文楷」→ /source/Xxxk 详情 → 「下载原件」→ feicode tar.gz。

| 位置 | 问题 | 建议改法 |
|------|------|----------|
| 详情页 pack 区（site.js:634-655 archive 行） | 下载无哈希、无「包内含许可原文」提示。授权平台发原件不给校验值，第一信条就弱 | archive 行加 hint「含许可原文与构建脚本」；sha256 字段就位后显示，没有则「整包哈希待收录」 |
| 详情页 mirror 徽标（site.js:767-772「本站已镜像」） | 无同步时间。8h 同步是真实卖点，现在说不出口 | mirror.syncedAt 就位后显示「同步于 X 小时前」 |
| Qhddl/Xxzt（offer=source、mirror absent） | 状态词「可带走」+ 区块标题「拿走」，实际按钮是「去上游仓库」。承诺和动作对不上：本站什么都没给 | source 且无本地文件时，区块标题降为「原件在上游」，状态词可保留但 visitorNote 已有说明，别双标 |
| Dyh/Syhtcjk（offer=missing、mirror.upstream 已知） | 和上一条是同一个现实（都能去 GitHub 拿），却显示「待收录」「源文件尚未收入」+「去 GitHub 取」。同一情况两套说辞，访客会困惑到底能不能拿 | 统一口径：上游可得就明确「可去上游取，本站存档待补」。四态是本站动作，不是许可结论，页面上别让访客猜 |
| /source/Xwwk 无 this 问题但整体 | 下载后没有「下一步」：怎么装、怎么确认许可 | 详情页尾部加两行：用法页链接 + 许可原文链接（许可链接在 pack-meta 里有，用法链接没有） |

### 路 B：禁再分发走切片门（以普惠体 Albbpht 为例）

首页 → 目录筛「去出处」→ 普惠体详情 → 「打开工具」→ /slice/Albbpht/ → 传 zip → 核验 → 领样张包。

| 位置 | 问题 | 建议改法 |
|------|------|----------|
| 详情页 pack 区（site.js:781） | 「原包去阿里巴巴字体官网取」是纯文本。sliceGate.origin 的链接只在切片工具页出现。访客在详情页就该能点去官网 | packRows 对 gated 款加一行「去厂商官网取原包」，href 取 sliceGate.origin |
| 首页 hero lead（site.js:465） | 「不能再分发的，只去出处。」与同页下方切片区块（site.js:489-490「上传官方原包核验后领取」）打架：到底是只去出处，还是能领切片包 | hero lead 改「不能再分发的，验原包领切片」一类，与切片区块同一句话 |
| 目录筛「去出处」 | 混着三种情况：禁再分发（普惠体）、可再分发但没收录（扛重族）、注册墙（仓耳）。筛进来的访客意图各异 | 卡片状态词已区分不了，至少 visitorNote 分层写清；长期看 #16 待拍板的状态词是正解 |
| /slice 工具页核验中（site.js:940-942） | 「正在计算摘要。文件留在这一页。」好。但失败后重试靠「更换」标签，没有显式「重新核验」 | 失败态加一个 data-slice-reset 按钮（handler 已存在 site.js:1765-1773，按钮没渲染，白写的） |
| 核验通过态（site.js:944-953） | 「名称指纹」结论词是好设计，但通过后没有「本次核验记录」可保存。用户领了切片包，核验行为本身无凭据 | 样张包 README 已含哈希（site.js:1686-1688），够用；生产期可考虑核验回执，原型不动 |
| 已知缺口（记忆 wenfeng-org-prototype-state） | 开源款切片 href 全空「稍后提供」、gated 样本只有普惠体一款 | 不造假扩样本，维持现状；「稍后提供」行已有 |

### 路 C：待定状态先看清楚（以 EBAS 无衬线体 Qzkswjz 为例）

目录筛「待核实」→ 详情页。

| 位置 | 问题 | 建议改法 |
|------|------|----------|
| 详情页 pack 区（site.js:704-710） | 标题「许可尚未核对」+ visitorNote「许可尚未核实，本站不提供原件」。说了现状，没说会怎样：会不会核、多久、核完会怎样 | 加一行「核实后状态会更新」+ /legal 待核实段链接（#legal-phish 已有内容，没链过去） |
| 详情页整页 | 知情访客（比如知道这款真实许可的人）无法反馈。纠错入口缺失在 pending 态伤害最大 | 每款详情页页脚一行「信息有误？告诉我们」，mailto 或占位 |
| 卡片动作（site.js:377） | pending 卡片徽章和按钮都是「待核实」，同词重复（COPY-AUDIT 风险 1 已提，待拍板） | 若拍板，非可带走态统一「查看条目」类动作词 |
| /attest 索引页（site.js:1396-1398） | 「待核实/待收录：EBAS 无衬线体」列出来了，这一行没链到详情页或说明 | skipped 名单项加链接到 /source/{norm}，让「为什么不出证」一键可达 |

### 横切断点（三条路共用）

- **外链确认未实现**：#8648 要求站外先弹「即将离开文风」。三条路都会跨出去（feicode/github/官网）。in-prototype 可做：拦截 click，弹确认层，sessionStorage 记跳过域名。
- **/use 页缺 fonts.css 实例**（记忆已知缺口）：切片包怎么进 WordPress 有代码样例（site.js:1198-1207），但下载到的样张包和样例的目录名（wenfeng-slice-Xwwk）对得上，缺一个「解压后长这样」的最小文件树展示。
- **预览自检信息**（COPY-AUDIT 风险 5、7）：页脚「非生产 · 不占正式端口」行和 /data/attest-hmac.json 可直接 GET。生产前整行删除、密钥文件收回，进生产 checklist。

---

## 5. 造字平台入口与接入预留

命名已收敛（记忆 windfonts-glyph-platform：平台和产品统一「文风造字」，「文风出品」做合作背书，派生关系靠 lineage 谱系页+Credits 元数据）。wenfeng.org 对它的角色只有两个：**入口**和**收录**。原型期要做的就这么多。

**入口（页面位置）：**
1. 关于页三域卡已有（site.js:1246-1250「造字平台 / 编辑器放在独立新域，不挂在本站。本站以后只做入口和收录。」）。保持，不加速链（域名未定）。
2. 页脚加不加「造字」链接：待拍板。域名人拍之前，页脚放文字不放链接最稳。
3. 不在目录、详情页、顶栏放任何造字入口。访客来 wenfeng.org 是拿文件的，创作是另一域的事，混进来稀释授权可信卖点（2026-09-27 底稿原话）。

**接入（字段级，全部 nullable 预留）：**

```json
"lineage": null
```
有值时的形状（schema 文档写一句话，不做 UI）：
```json
"lineage": {
  "origin": "derived",
  "parent": { "norm": "Xwwk", "name": "霞鹜文楷" },
  "program": "文风造字"
}
```
- `origin`: `upstream`（现镜像款）/ `collected`（收录款）/ `derived`（造字平台派生）/ `original`（文风造字原创）。
- 派生件进站前提已拍死：众包成果须 OFL 才能进档案与货架（2026-09-27 底稿），字段里不用表达许可，license 字段照常走。
- RFN 纪律在数据侧的落点：derived 款的 name 是自立新名（文风造字·XX），lineage.parent 记录基于谁，谱系关系靠数据不靠名字（09-29 品牌收敛拍板）。

**下载详情的谱系占位**：detail 页 pack 区当 `lineage.origin === "derived"` 时显示一行「基于文风·霞鹜文楷（谱系）」，链到将来的谱系页。原型期 samples.json 十款全是 null，一行条件渲染代码 + schema 一句话的量级，不写死任何样例数据（不造假扩样本的既有纪律）。

**API**：`/api/v1/fonts` 原样透出 lineage 字段即为预留完成。/use 的 API 语义段加一行：「lineage：谱系，造字平台接入后使用，现恒为 null」。

**明确不做的**：contributed 投票数据、合成脚本状态、谱系图 UI、造字平台 OAuth。那些是第三域的事，wenfeng.org 只在数据模型上留一个可挂载的钩子。

---

## 6. 改进要求汇总（给下一棒实现代理，按序可照做）

以下全部 in-prototype 能力内（静态前端 + preview.py），不碰 COMMENT 冻结地址，不碰 licenses.json 真源文本，不 commit。

1. **许可原文页分档标注**：samples.json 每款加 `license.textState`（full/summary/pointer/missing，按 §3 语义对十款真值标注：Xwwk=full、Qhddl=full、Arkp=pointer、Xxzt=pointer、Mkkzh=pointer、Albbpht=summary、Tsanger=summary、Qzkswjz=missing、Dyh=pointer、Syhtcjk=pointer）。licensePage 按值渲染：full 显示「许可原文」，summary 显示「条款摘要」，pointer 显示「原文出处」，missing 维持「还没有原文」。位置 site.js:851-883。
2. **详情页加纠错入口**：pack 区尾部一行「信息有误？告诉我们」（mailto 占位或链接到将来的反馈页），三态（source/jump/pending）都放。位置 site.js:773-791 packSec。
3. **gated 款详情页厂商链接**：packRows 对 sliceGateOf(f) 且 gate.origin 存在时加行「去厂商官网取原包」，href=gate.origin.href。位置 site.js:668-676。
4. **pending/missing 详情页下一跳**：pack 区加「核实后状态会更新，见法务说明」链到 /legal#legal-phish；attest 索引页 skipped 名单项链到 /source/{norm}。位置 site.js:1396-1398、:773-791。
5. **首页 hero lead 对齐切片事实**：「不能再分发的，只去出处。」改为与切片区块同口径的一句（建议「不能再分发的，验原包领切片」），位置 site.js:465。
6. **目录切片筛拆分**：filterBar 的「切片」拆成「切片·须核验」（gated）与「切片·稍后」（planned），offer 参数值用 slice-gated / slice-planned，byOffer 相应改。位置 site.js:250-256、:425-439。
7. **/foundries 入口**：页脚 extra-links 加「厂商」。位置 site.js:344-354。
8. **外链确认层**：实现 #8648（点击 http 外链先弹「即将离开文风」，写明域名与完整网址，按钮「留在本站/继续前往」，sessionStorage 键 wf-exit-skip: 按域名记跳过；不拦站内、修饰键、下载；白名单细则按记忆原文核对后写死）。位置 handleClick（site.js:1720）前挂全局捕获。
9. **切片失败态加重试按钮**：sliceBoard bad 态渲染 `<button data-slice-reset>重新核验</button>`，handler 已存在。位置 site.js:954-959。
10. **schema 说明进 /use**：API 段加字段语义块：offer 四态、slice 四值（planned/ready/gated/false）、distribution 三值（true/false/null=未核实）、license.textState 四值、files[].sha256 可空、lineage 预留恒 null。位置 site.js:1208-1222。
11. **数据字段落地**：§3 最小集写进 samples.json 十款真值（syncedAt/sha256 真没有就 null），preview.py `_public_font` 透传，证书 license 块改读落库的 spdx 和 textSha256（不再运行时猜）。位置 preview.py:75-82、:210-267。
12. **「我们怎么核」方法块**：/about 或 /legal 新增小节，内容取自取证铁律（发布件 name 表内嵌声明/随包 LICENSE 原文为准；README 徽标不作数；OFL 衍生件不得加限，玄冬楷书案例；素材站声明不当原文，licenses.json Qzkswjz 已有此表述）。文案与 OPEN-SOURCE-ATTEST.md 同步维护。
13. **收录标准块**：/about 加「什么字能进」三行：标准开源协议进镜像可带走；厂商自拟协议进许可档只给原文；只标免费商用无文本不进。与 offer 四态对齐，不新造词。
14. **生产 checklist 记一笔**（本原型不动）：页脚自检行删除、/data/attest-hmac.json 收回、preview.py API 根 comment 改中文（COPY-AUDIT 风险 5/6/7）、证书 embed 按协议判（#15 待拍板）。

优先做 1-5：全是访客可感知的信任缺口，改动都在 pack 区附近，一轮能过。

---

## 来源

- 原型文件：js/site.js、preview.py、samples.json、data/licenses.json、OPEN-SOURCE-ATTEST.md、COPY-AUDIT-2026-09-30.md（均在本文档所在目录）。
- 记忆：wenfeng-org-prototype-state.md、windfonts-glyph-platform-2026-09.md、windfonts-license-text-archive-2026-09.md；集群记忆 #8899（定位纠偏）、#8911/#8912（核验证书拍板）、#8648（外链确认）、#8708（归档收口）、#8939（状态词与主按钮，经 COPY-AUDIT 转引）。
- 外部对照：[Google Fonts Licensing](https://fonts.google.com/knowledge/glossary/licensing)、[Google Fonts FAQ](https://fonts.google.com/faq)、[fontsource/fontsource](https://github.com/fontsource/fontsource)、[猫啃网字体授权指南](https://www.maoken.com)、[字体天下授权声明示例](https://www.fonts.net.cn)。
