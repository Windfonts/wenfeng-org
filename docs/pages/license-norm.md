# 许可原文 `/license/{norm}/`

状态：**D-11 活页**。URL 冻结。

## 第一屏要回答的问题

这一款许可叫什么、有没有全文、从哪取的；开源款能否出证、保留名在哪。

## 分型（同路径）

| 型 | 判定 | 骨架 |
|---|---|---|
| A 开源全文 | `textState=full` 且 SPDX 在出证集合 | 精简导语 · 原文/译文 · RFN · 出证 · 取证 |
| B 厂商协议 | `pointer` / 禁再分发 / 非出证 SPDX | 归档原文（font-licenses / OSS）· PDF · 出处 · 取证 |
| C 空档 | 无文本 | 说明未归档 · 去出处或报缺 |

商用三结论的详细解释在 `/source/{norm}/`；许可页只保留一行结论词 + 原文。

## 骨架（A · OFL 等）

```
crumb：授权 / 字体名
许可名（玄宗 h1）
一句：{字体名}。开源许可已核对原文。
可商用 · 可改 · 可分发 · SPDX · 有保留名
[ 出授权证明 ] [ 返回条目 ]
作者声明（通栏）：RFN 外露 · 版权原文默认展开（可折起）
原文（左）              │ [ 译文 | 原版 ]（右）
PREAMBLE                │ 序言 / 原版（同左）· PREAMBLE
DEFINITIONS             │ 定义 / …
…
取证记录（文末，证据层）
```

作者声明通栏：保留名与额外说明外露，版权原文 `<details open>` 默认展开、可折起。双栏只排 OFL 五段、段顶对齐，不强行行高。左栏固定归档原件；右栏默认译文，切「原版」时标明同左。无 `bodyZh` 时读站内共享译文。不写译文出处。

文末取证是证据层：`来源 · 日期 · 方式` + 文本哈希；`history` 多于一条才列变更。不含保留名。不做成卷宗表或营销证面。

## 字段

`data/license-text/{norm}.json`：

- `body` / `bodyZh` / `translationRef`
- `artifacts[]`：`{ kind: pdf|image|html|text, href, label, sha256? }`
- 构建期：若 `font-licenses/licenses/{norm}/`（或共用包如仓耳→Cexwz）有 `LICENSE`/`license.pdf`，自动回填正文并拷 PDF 到 `/assets/licenses/{norm}/`；已知 OSS CDN（如 Opsa）并入原件链接。
- `evidence`：`url` · `fetchedAt` · `textSha256` · `method` · `history[]`

`history[].event`：`archive` | `reverify` | `source_moved` | `hash_changed`。无 history 时构建期把当前条当作第一条。

RFN 真源：字体 `license.rfn`；页上 `<mark class="lic-mark">`。

## 禁止

改路径。改证面。机翻编造译文。页面（含开发视图）写译文出处。取证区做成营销证面。
