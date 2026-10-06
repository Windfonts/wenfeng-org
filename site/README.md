# wenfeng.org v2（静态多页）

2026-10-03 重做。替代根目录的单页应用原型（`index.html` + `js/site.js` + 17 份 `css/*-versions.css`）。旧过程稿已移到 `archive/prototype-2026-09/`。

## 跑起来

```bash
python3 site/build.py                 # 生成 site/dist/（约 1600 页）
python3 site/serve.py --port 16031    # 预览：静态页 + preview.py 的原型 API
```

16030 仍是旧原型（`preview.py`），两者互不影响。

## 结构

| 文件 | 作用 |
|---|---|
| `build.py` | 唯一生成器。数据 → 页面，所有页共用 `layout()` 和一组组件（`badge` `btn` `panel` `kv` `font_row` `font_list`） |
| `assets/site.css` | 唯一样式表，令牌对齐 app.windfonts.com |
| `assets/site.js` | 唯一脚本，只做渐进增强：列表筛选、证明表单/证面、核对、台账、查验、切片核验、报缺字 |
| `serve.py` | 预览服务器，`/api/v1/*` 复用 `preview.py` |

数据只读：`samples.json`、`data/font/*.json`、`data/licenses.json`、`data/license-text/*.json`。

## 站点地图

顶栏：目录 `/source/` · 许可 `/license/` · 授权证明 `/attest/` · 切片包 `/slice/` · 用法 `/use/`
页脚：厂商 `/foundry/` · 报缺字 `/gap/` · 证书查验 `/v/` · 收录与核验 `/how/` · 法务 `/legal/` · 关于 `/about/`

| 路由 | 内容 |
|---|---|
| `/` | 定位一句话 + 搜索 + 四条路径 + 样例 + 五种状态 + 嵌入注释 |
| `/source/` `/source/{norm}/` | 全目录（搜索 + 状态筛选）；一款页：一个主按钮 + 文件/出处/许可/证明四块 |
| `/license/` `/license/{norm}/` | 嵌入注释 + 协议统计 + 查询；原文页：全文 + 取证记录侧栏 |
| `/attest/` `/attest/{norm}/` | 说明 + 生成表单 + 可出证列表；证面（打印/PDF/JSON/徽章） |
| `/attest/verify/` `/attest/ledger/` `/v/` | 核对 JSON / 台账 / 两要素查验（需 API） |
| `/slice/` `/slice/{norm}/` | 说明 + 不可再分发款列表；浏览器本地 SHA-256 核验 |
| `/foundry/` `/foundry/{slug}/` | 厂商列表 / 厂商下的字体 |
| `/use/` `/how/` `/legal/` `/about/` `/gap/` | 用法、关于是三列 / 四字大字（`gate.css`，设计视图大字为玄宗）。怎么核、法务仍是阅读栏。缺字仍是短笺。文案沿用已拍板的句子。页眉的 wenfeng.org 只写在面包屑 |

`/font/{norm}` → 301 `/source/{norm}/`。

## 规则（沿用）

- 状态只有五种：本站下载 / 官方下载 / 暂无下载 / 待核实 / 未收录。徽章和按钮不说同一句话。
- 归档 `staged` 不做下载按钮，主动作改成去上游。
- 嵌入注释原样，不改。
- 不再有「设计视图 / 开发视图」双份文案。
- 新页面先加进 `build.py` 用现有组件拼，组件不够再加组件，不加单页样式表。

## 已知

- `GET /api/v1/certs/{norm}` 每次调用都会写台账（preview.py 旧行为），打开证面即记一笔。
- 切片包：数据里没有 `sliceGate.sha256`，所有款都会提示「摘要尚未登记」。
- 报缺字不发送。
