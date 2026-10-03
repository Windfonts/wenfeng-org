# wenfeng-org · 文风开源

**wenfeng.org** 站点仓，站名「文风开源」（与店面「文风字体」对仗）：造字、授权、源文件下载（以及缺字 / 开源工具的后续落点）。

- **不是** Windfonts 分发店面。店面是 [`Windfonts/fonts-front`](https://feicode.com/Windfonts/fonts-front)（`app.windfonts.com`）。
- 双平台分工见 fonts-front 的 [`docs/PLATFORMS.md`](https://feicode.com/Windfonts/fonts-front/src/branch/main/docs/PLATFORMS.md)（造字 / 授权 / 源文件 → org；逛库 / CDN / 子集化 → Windfonts）。
- **不要**把本仓内容合进 `fonts-front`。生产 DNS / 部署变更须人明确要求（部署手册见 `DEPLOY.md`）。

## 本机预览

端口 **16030**（与店面 16016 分开）。

```bash
cd ~/Projects/wenfeng-org
# 如有 joy-port：joy-port claim 16030
python3 preview.py --port 16030
# http://127.0.0.1:16030/           首页 = 丁（锁定 home-v4）
# http://127.0.0.1:16030/home-v4.html 丁别名（对照）
# http://127.0.0.1:16030/license    授权 = 戊′（license-v5b 为静态别名）
# http://127.0.0.1:16030/source     目录 = 乙′（source-v2b 为静态别名）
# http://127.0.0.1:16030/source-options.html  目录枢纽（乙′当前；甲 / 丙 / 丁已否）
# http://127.0.0.1:16030/detail-options.html  一款详情甲′（已落 /source/{norm}；乙已归档）
# http://127.0.0.1:16030/source/Xwwk/        条目 = 甲′（font-v1b 为静态别名）
# http://127.0.0.1:16030/gap             报缺字 = 甲′（gap-v1b 为静态别名）
# http://127.0.0.1:16030/gap-options.html  报缺字枢纽（甲′当前；甲原稿；乙已归档）
# http://127.0.0.1:16030/gap-v1b.html       甲′ · 短笺精修
# http://127.0.0.1:16030/gap-v1.html         甲 · 原稿
# http://127.0.0.1:16030/gap-v2.html         乙 · 已归档
# http://127.0.0.1:16030/about             关于 = 己′（about-v6b 为静态别名）
# http://127.0.0.1:16030/about-options.html  关于枢纽（己′当前；己原稿；甲乙丙丁戊已否）
# http://127.0.0.1:16030/about-v6b.html      己′ · 路径精修
# http://127.0.0.1:16030/about-v6.html       己 · 原稿
# http://127.0.0.1:16030/about-v5.html       戊 · 来信 · 已否
# http://127.0.0.1:16030/about-v3.html       丙 · 三件 · 已否
# http://127.0.0.1:16030/about-v4.html       丁 · 五不 · 已否
# http://127.0.0.1:16030/about-v1.html       甲 · 三处 · 已否
# http://127.0.0.1:16030/about-v2.html       乙 · 短文 · 已否
# http://127.0.0.1:16030/how               怎么核 = 甲′（how-v1b 为静态别名）
# http://127.0.0.1:16030/how-options.html   怎么核枢纽（甲′当前；甲原稿；乙已归档）
# http://127.0.0.1:16030/how-v1b.html       甲′ · 三条精修
# http://127.0.0.1:16030/how-v1.html        甲 · 原稿
# http://127.0.0.1:16030/how-v2.html        乙 · 已归档
# http://127.0.0.1:16030/options.html  结构对照 lab（首页 IA · 授权结果 · 目录卡）
# http://127.0.0.1:16030/lab         旧稿 A–F 对照
```

依赖：Python 3；证书 PDF 预览需要本机 `qrcode` 与 Chrome（可选）。

静态包：`python3 build.py` → `dist/`（已 gitignore；勿提交构建噪声）。

## 仓结构（要点）

| 路径 | 角色 |
|---|---|
| `index.html` + `js/site.js` + `css/` | 完整站 SPA；`/` = 丁首页 |
| `home-v4.html` | 丁静态别名（枢纽对照） |
| `license-v5b.html` | 戊′静态别名（`/license` 活页） |
| `source-v2b.html` | 乙′静态别名（`/source` 活页） |
| `font-v1b.html` | 甲′静态别名（`/source/{norm}` 活页） |
| `font-v1.html` · `font-v2.html` | 一款详情原稿甲 / 已归档乙 |
| `gap-v1b.html` | 甲′静态别名（`/gap` 活页） |
| `gap-v1.html` · `gap-v2.html` | 报缺字原稿甲 / 已归档乙 |
| `about-v6b.html` | 己′静态别名（`/about` 活页） |
| `about-v6.html` | 关于原稿己（路径） |
| `about-v1.html`…`about-v5.html` | 关于已否：甲三处 / 乙短文 / 丙三件 / 丁五不 / 戊来信 |
| `how-v1b.html` | 甲′静态别名（`/how` 活页） |
| `how-v1.html` · `how-v2.html` | 怎么核原稿甲 / 已归档乙 |
| `preview.py` / `build.py` / `deploy.sh` | 本地预览、静态构建、部署脚本 |
| `samples.json` / `data/` | 演示样本与许可数据 |
| `options.html` · `*-options.html` · `NOTES-OPTIONS.md` | **lab**：对照选项，未定稿 |
| `lab.html` · `a.html`…`f.html` · `hifi-*` | 否决 / 过程稿对照（见 `archive/README.md`） |
| `from-app/` | 从 fonts-front 拷的设计令牌对照 |
| `docs/` | 简报与计划摘录 |
| `worker/` | CF Worker 草稿 |

## 从 linuxjoy 迁出

此前活源在 `linuxjoy/docs/plans/wenfeng-org-prototype/`。本仓为定稿后的 FeiCode 真源；linuxjoy 该路径现仅留 `MOVED.md` 指针，原型树已删。

## 非生产

本仓是**原型 / 本地预览**真源，**不是**生产站。勿改 `wenfeng.org` DNS 或现网部署，除非人明确要求。`data/attest-hmac.json` 为原型假密钥（已 gitignore），不能用于生产存档。
