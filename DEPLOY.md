# wenfeng.org 部署手册（M1 静态站）

2026-10-01 侦查 + 方案 + **当日上线**。目标：`build.py` 产出的 `dist/` 上线到 wenfeng.org。

## 0. 上线后实况（2026-10-01 晚，已生效）

```
访客 → Cloudflare（橙云，边缘证书自动，SSL Full）
     → Worker「wenfeng-org-proxy」路由 wenfeng.org/*（账号 46b8a2fb…）
     → oss://wenfeng-org（文派账号·广州·公共读·BPA 已关·静态托管 index/404）
```

| 项 | 实况 |
| --- | --- |
| 域名 | 已注册（July Name Limited，2005 老域）。**到期 2026-12-14，需续费** |
| DNS | Cloudflare（jaime/raphaela）。apex 记录=CNAME wenfeng-org.oss-cn-guangzhou.aliyuncs.com（橙云；实际流量被 Worker 路由接管） |
| 源站桶 | oss://wenfeng-org 广州，两段缓存（数据 no-cache / assets immutable 一年），4184 文件，manifest git=943c683 |
| 索引 | **robots 全站拒收（noindex 构建款）**；放开=重建 `--allow-index` + 重传 + 清 CF 缓存 |
| 备案 | **.org 后缀不在工信部可备案清单，永久备不了案（feibisi 2026-10-01 拍板口径）**——大陆 CDN 此路不通，长期走 CF；大陆可达性=CF 线路质量 |
| 遗留 DNS | api/app/cdn.wenfeng.org 三条 A 仍指死机 47.76.95.55（520 元凶），未动，留待 feibisi 定用途；_dnsauth TXT 一条（绑域尝试遗留，无害） |

## 1. 踩坑记录（为什么是 Worker 而不是 OSS 自定义域名）

1. **OSS 默认 endpoint 对 html 强制 `Content-Disposition: attachment`**（2024-04 起风控，广州/香港默认端点都中，浏览器会下载页面而不是渲染）。自定义域名可解，但——
2. **OSS 绑自定义域名要求 CNAME 公网可见**。wenfeng.org 是 zone 顶点，Cloudflare 对 apex CNAME 无条件 flattening（橙云灰云都看不见 CNAME 本尊）→ 绑定永远 NoSuchCnameInRecord。`_dnsauth` TXT 令牌流程也过不了这关。
3. **CF Origin Rule 改写 Host 头是企业版功能**（`not entitled`，action=`route` + `host_header`）。
4. **破法=Worker 剥响应头**：附件头只是响应头，Worker 转发到桶 endpoint（Host 天然正确）后 `delete('content-disposition')`，最终响应头由 Worker 决定。顺带补了 **目录→/index.html 重写**（OSS 静态托管只解析根路径 index，子目录不解析）。
5. 桶名全局唯一：wenfeng-org 已被广州桶占用，试香港同名桶撞墙，用 -hk 后再删——最后回归广州桶（反正 Worker 剥头后地区无所谓）。

## 2. 日常更新流程（数据或页面变更后）

HTML 仍走 CF Worker → `oss://wenfeng-org`（广州）。页眉 CSS/JS/woff2/图走已备案 `cn.windfonts.com` → `oss://wenfeng-fonts/assets/`（广州；zone `windfonts` 未切杭州前不要灌 `wenfeng-fonts-hz`）。构建默认 `WF_ASSET_ORIGIN=https://cn.windfonts.com`。授权 PDF 仍 `/assets/licenses/` 同源。不要把 org HTML 写进 `wenfeng-web-hz`。不要改 Worker / 不要给 `.org` 挂大陆七 A。

```bash
# Mac 侧：site/ v2（不要用根 build.py / deploy.sh）
python3 site/build.py [--allow-index]   # 放开索引时加

# 1) 页眉静态 → 字体桶（occupancy-safe：tar + scp devops，Mac 无 wenpai 写钥匙）
#    源：site/assets/ + assets/shs/ + assets/shsans/（不要 licenses）
aliyun --profile wenpai oss cp <chrome>/ oss://wenfeng-fonts/assets/ -r -f \
  -e oss-cn-guangzhou.aliyuncs.com --meta Cache-Control:max-age=31536000,immutable

# 2) HTML + licenses → 网页桶
aliyun --profile wenpai oss cp <html>/ oss://wenfeng-org/ -r -f \
  -e oss-cn-guangzhou.aliyuncs.com --exclude '.DS_Store' \
  --meta Cache-Control:no-cache

# 清 CF 缓存（html/数据是 no-cache 会重验证，可跳过；换 HTML 戳后建议清）
CF_PROFILE=default ~/bin/cf-api POST /zones/91c9a7ea3da441c2b912a15420216af4/purge_cache \
  -d '{"purge_everything":true}'
```

本地只预览页眉、不走 cn：`WF_ASSET_ORIGIN= python3 site/build.py`。

Mac 侧根目录 `deploy.sh` 是旧 M1 ossutil 路径，不要用。静态托管（index/404）已配好不用重跑。

## 3. Worker 运维

- 脚本：`/tmp/wf-worker.js`（modiqi，源码同步在本仓 `worker/wf-worker.js`）；改动后重传：
  `curl -X PUT .../accounts/46b8a2fbfc5b85ffe934f0d725f784b0/workers/scripts/wenfeng-org-proxy -F metadata… -F script…`（**认证用 default.conf 的 Global Key 头；cf-api 会强加 Content-Type: application/json 破坏 multipart，别用 cf-api 传脚本**）
- 路由：id 46922e29d63e48e9869a5cf9fbdc7180，pattern `wenfeng.org/*` → wenfeng-org-proxy
- 回滚：删路由即回 apex 直连桶（会回到 attachment 下载页）；删 Worker 脚本清干净

## 4. 上线校验（2026-10-01 已全绿）

- [x] 首页 556 款渲染、`text/html`、无 attachment
- [x] /source/Xwwk/ /license/Xwwk/（目录重写）
- [x] /v 查验页渲染
- [x] /api/v1/certs → JSON（Worker 边缘签发过渡版，2026-10-07）
- [x] /attest/ledger/ → 证明记录可读（KV）
- [x] 未知路径 → 404 状态 + SPA「没有这一页」视图
- [x] build-manifest.json 与本地一致
- [x] woff2 immutable 缓存头

已知行为：大小写变体 URL（/license/xwwk/）返回 404 状态但壳仍渲染正确页面（站内链接全为规范大小写，仅手输会碰到）。

## 5. 后续

- M2 证书签发服务上线后：CF 再加一条 Worker/路由把 `/api/v1/certs/*` 与 `/badge/*` 分流到签发服务，静态部分不动
- wenfeng-original/ 原件包生产（113 款镜像源打包上传 wenfeng-fonts 桶，换 `ARCHIVE_HREF_PREFIX` 真值重导出）
- 放开索引（`--allow-index`）等 feibisi 发令
