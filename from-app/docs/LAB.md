# 对照实验室（原型 / 决策留档）

> **禁止把 `*-options.html`、`v5-*.html`、`oss-audit.html` 及配套 css/js 当垃圾删除。**  
> 人没明确说删就留着。生产导航不链这些页（`noindex`）。

## 怎么找

| | |
|---|---|
| 浏览索引 | [`lab.html`](../lab.html) |
| 机器真源 | [`data/lab-archive.json`](../data/lab-archive.json) |
| 本说明 | `docs/LAB.md` |

HTML **留在仓根**，不搬进子目录——相对路径（`css/` `js/` `data/`）不用改。索引负责收集，不负责挪文件。

## 状态口径

| status | 含义 |
|---|---|
| `active` | 还在用的研究页（如 OSS 审计） |
| `archive` | 甲乙丙丁对照，供回调 |
| `shipped-ref` | 某一套已上正式站，页仍留档对照 |
| `rejected` | 已否（如整站 v5），仍留档 |

## 新增对照页时

1. 仓根加 `*-options.html`（或研究页），`meta robots=noindex`。
2. 配套 css/js 仍放 `css/`、`js/pages/`。
3. 在 `data/lab-archive.json` 对应 `groups[].items` 加一条（href / title / status / assets / note）。
4. 打开 `lab.html` 确认出现。

## 与上线

- [LAUNCH-GATES.md](LAUNCH-GATES.md)：对照页不进生产入口。
- [HANDOFF.md](HANDOFF.md)：双轨只维护主线；实验室页是留档不是正式产品。

## 研究页附带文档

OSS 审计：`oss-audit.html` → `_oss-authors-github-audit.*` → `_oss-ingest-batch1.json`。  
产品规格：`FAMILY-VARIANTS.md`。
