# wenfeng-org

文风源档案：原件、许可、切片、核验。不是店面，不是字体 CDN。

## 目录跟店面同一套短码

- 本站全量在 `data/samples-full.json`。2026-10-07 人说「目录这些都要一致」之后：店面有的都进本站；6 款 BDF（BestTen / LanaPixel / 台北字体 / 坊宋 / 柳宋 / 粗宋）两边都有；寒蝉端黑并进寒蝉端黑体 `hcdht`（`Clduan` 别名页）。无包、vault 也没有的 26 条仍只在本站。不要把「缺字」写成收录状态。缺字是 `/gap/`。
- 店面名单 `fonts-front/data/fonts-list.json`。同一天：店面 713，本站 739；中文名对上的短码一致；店面独有 0。`offer`：`source` 本站下载、`jump` 官方下载、`pending` 里全文的显示成暂无下载、其余待核实、`missing` 未收录。
- 有网页包的子集名单是 `data/webfonts.json`。没有包就不要给那一行发 `/api/css`。
- 许可原文是 `data/licenses.json`。改页面文案不要改原文。

## 和店面的链接

- 本站「去店面」写 `https://app.windfonts.com/fonts/{norm}`。`norm` / `family` / shop 路径用店面短码。旧 CamelCase 留在 `aliases`，构建时再写 `/source/{old}/` 等别名页。Worker 混写 301 小写。
- 店面「文风存档」写 `https://wenfeng.org/source/{normalized 小写}/`。
- `data/norm-history.json` 是短码对照。不要跑 `export-wenfeng.py` 全量覆盖：它会 `unlink` 全部 `data/font/*.json`，把 overlay 冲掉。补缺用追加，不要全量导出。

## 不要做

- 不要在本站界面加载店面字体。界面用黑白灰。样字才可以用目录里的字。
- 不要改 `wenfeng.org` 的 DNS。不要把静态页推进 `wenfeng-web-hz`（那是 app）。
- 不要把店面 chrome、选字袋、账号做进本站。
- 本目录下的 `AGENTS.md` / `CLAUDE.md` 是给代理看的，不要当成页面发布。
