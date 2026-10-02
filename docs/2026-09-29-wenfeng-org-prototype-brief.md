# 2026-09-29 wenfeng.org 原型准备

状态：完整原型在根路径 `http://127.0.0.1:16030/`。2026-09-29 人评「毛坯房」后打磨：顶栏施工条收进页脚；首页大样张 + 数字一行 + 卡片证明行 + 收尾带；一款页文件改成块、出处改芯片；许可注释进面板。A/B/C 已否；D/E/F 过程稿在 `/lab`。皮仍是店面令牌。预览 `python3 docs/plans/wenfeng-org-prototype/preview.py --port 16030`。
样本：`docs/plans/wenfeng-org-prototype/samples.json`（10 款，覆盖可带走 / 去出处 / 待核实 / 待收录）。
建设口径：计划稿 §18；09-28「页面先不建」仍指**生产域名**。

## 1. 这个原型当时想证明什么

当时写成「自选文件 + 授权出处」。那句口号过窄：授权存档 / `/license` 只是 org 的一小块。站本身是源文件和下载。开源原文件可拿走；不允许再分发的只给跳转；`/license` 仍须接住嵌入注释。不证明店面样张、不证明托管 CSS、不证明造字编辑器。

成功看起来像：霞鹜文楷有「获取源文件」；普惠体只有「在网页里用」。失败看起来像：norm 密表、`git clone`、GitHub 组织墙、字林。

## 2. 冻结 URL（原型就要用真路径）

| 路径 | 角色 |
|---|---|
| `/` | 本站是什么 + 进索引 |
| `/license` | 许可原文总入口（嵌入注释已冻，不能改） |
| `/license/{Norm}` | 单款原文 |
| `/source/{Norm}/` | 档案页 canonical |
| `/font/{Norm}` | 店面现链；原型里 301 到 `/source/{Norm}/` |
| `/source` | 总表 |

外链：网页预览只去 `https://app.windfonts.com/fonts/{Norm}`。不在 org 页 `ensureFontCss`。

## 3. 样本覆盖（不要用假字）

| norm | 名 | 用来看什么 |
|---|---|---|
| Xwwk | 霞鹜文楷 | 镜像 + OFL，可带走 |
| Arkp | 方舟像素 | 另一组织镜像 + MIT |
| Qhddl | 权衡度量体 | 店面已上架，映射表尚未写入 |
| Xxzt | 玄宗体 | 同上，OFL |
| Mkkzh | 猫啃扛重族黑 | skipped-too-heavy，不给假下载 |
| Albbpht | 阿里巴巴普惠体 | 免费商用、不可再分发，只展示 |
| TsangerShuYuanTW01 | 仓耳舒圆体 | restricted-login |
| Qzkswjz | EBAS 无衬线体 | 待核实，许可空 |

覆盖差：店面 574，镜像表 134，许可目录 520。455 款在店面不在镜像表。Qhddl/Xxzt 是其中两款（09-29 入库未跑 MIRROR-SOP）。

## 4. 视觉约束

A/B/C 纸色刊头已否。人 2026-09-29 改口：**用 app 同一套设计语言**（tokens.css：白底、浅灰面板、胶囊、墨黑主按钮、普惠体 UI）。D/E/F 按这个做。不要再做授权馆 / CC Deed / 字造社纸。

仍不要：选字袋、控制台、登录、拉 574 款 webfont、把私有仓当下载盘。可带走的字名可用系统切（楷/像素等），不 `ensureFontCss`。

## 5. 仓与预览（原型阶段）

- 文件先放 linuxjoy `docs/plans/wenfeng-org-prototype/`。定稿再开 FeiCode `Windfonts/wenfeng-org`。
- 不要写进 `fonts-front`，不要发 `wenfeng-web-hz`。
- 本机预览号 **16030**（`joy-port free mac` 当时给出；起服务前 `joy-port claim 16030`）。
- 不要占 16016（店面 main 重写）。

## 6. 三种原型路线（A/B/C 已否）

## 6b. D/E/F（2026-09-29 店面设计语言）

**D. 字体库**  
店面 `fonts.html` 那种浅灰卡目录。筛选全部 / 可带走 / 去出处 / 待核实。卡上主按钮「获取源文件」或跳转文案。

**E. 一款字**  
首页先出霞鹜文楷大标题 + 墨黑「获取源文件」，下面再列其余。详情：拿走面板 + 许可侧栏（许可不是整页）。

**F. 可带走 / 跳转**  
两栏浅灰卡，和 C 同一分流，皮换成店面。

**A. 自己带走**  
按字体名卡片。开源款主按钮「获取源文件」，其余跳店面或官网。给 WordPress 自托管。

**B. 从注释进来**  
首页即 `/license`：引用冻结的 HTML 注释，再按名读原文。

**C. 可带走 / 去出处**  
左栏许可允许再分发的原文件（本站没收的跳上游）。右栏禁再分发、须注册、待核实，只跳转。

## 7. 明确不做

造字、缺字报告、登录、选字袋、WordPress、拉 574 款 webfont、把私有仓当下载盘、改生产 `wenfeng.org` DNS。
