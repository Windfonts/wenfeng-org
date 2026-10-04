# 许可原文 `/license/{norm}/`

状态：**D-11 活页**。URL 冻结。

## 第一屏要回答的问题

这一款许可叫什么、有没有全文、从哪取的；开源款能否出证、保留名在哪。

## 分型（同路径）

| 型 | 判定 | 骨架 |
|---|---|---|
| A 开源全文 | `textState=full` 且 SPDX 在出证集合 | 结论条 · 原文/译文切换 · RFN 高亮 · 出证 · 取证 |
| B 厂商协议 | `pointer` / 禁再分发 / 无开源全文 | 出处 · 阅读器（body 或 artifacts）· 取证 |
| C 空档 | 无文本 | 说明未归档 · 去出处或报缺 |

## 骨架（A · OFL 等）

```
crumb：授权 / 字体名
许可名（玄宗 h1）
一句：{字体名}。开源许可已核对原文。
可商用 · 可改 · 可分发 · SPDX · 有保留名
[ 出授权证明 ] [ 返回条目 ]
作者声明（通栏）：版权段 + RFN 说明
原文（左）              │ [ 译文 | 原版 ]（右）
PREAMBLE                │ 序言 ↔ PREAMBLE
DEFINITIONS             │ 定义 ↔ DEFINITIONS
…
取证记录（文末，证据层）
```

作者声明通栏单列（版权 + RFN + 额外说明），不进双栏。双栏只排 OFL 五段并一一对齐。左栏固定归档原件；右栏默认译文，可切到原版英文。无 `bodyZh` 时读站内共享译文。不写译文出处。

文末取证是证据层：`来源 · 日期 · 方式` + 文本哈希；`history` 多于一条才列变更。不含保留名。不做成卷宗表或营销证面。

## 字段

`data/license-text/{norm}.json`：

- `body` / `bodyZh` / `translationRef`
- `artifacts[]`：`{ kind: pdf|image|html|text, href, label, sha256? }`
- `evidence`：`url` · `fetchedAt` · `textSha256` · `method` · `history[]`

`history[].event`：`archive` | `reverify` | `source_moved` | `hash_changed`。无 history 时构建期把当前条当作第一条。

RFN 真源：字体 `license.rfn`；页上 `<mark class="lic-mark">`。

## 禁止

改路径。改证面。机翻编造译文。页面（含开发视图）写译文出处。取证区做成营销证面。
