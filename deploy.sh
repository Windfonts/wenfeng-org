#!/usr/bin/env bash
# wenfeng.org dist 上传器。默认 dry-run，--go 才真传。
#
# 用法：
#   bash deploy.sh --bucket wenfeng-org --endpoint oss-cn-guangzhou.aliyuncs.com [--go] [--allow-index]
#
# 前置：
#   - python3 build.py 已跑（或由本脚本跑）
#   - ossutil 配置好文派科技账号 AK（本机 ~/.ossutilconfig 现属别的账号，勿混用；
#     可用 -c /path/to/wenpai.ossutilconfig 指定独立配置）
#
# 缓存策略：
#   - HTML 壳 / samples.json / data/*.json：no-cache（走 CF 时 CF 侧再按需加规则）
#   - assets/（字体分片等不可变内容）：max-age=31536000, immutable

set -euo pipefail

BUCKET=""
ENDPOINT="oss-cn-guangzhou.aliyuncs.com"
GO=0
ALLOW_INDEX=0
OSSUTIL="${OSSUTIL:-$HOME/bin/ossutil}"
CONFIG_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bucket) BUCKET="$2"; shift 2 ;;
    --endpoint) ENDPOINT="$2"; shift 2 ;;
    --go) GO=1; shift ;;
    --allow-index) ALLOW_INDEX=1; shift ;;
    -c) CONFIG_ARGS+=(-c "$2"); shift 2 ;;
    *) echo "未知参数：$1" >&2; exit 2 ;;
  esac
done

[[ -n "$BUCKET" ]] || { echo "用法：deploy.sh --bucket wenfeng-org [--endpoint ...] [--go] [--allow-index] [-c 配置文件]" >&2; exit 2; }

cd "$(dirname "$0")"

echo "== 构建 dist/ =="
if [[ $ALLOW_INDEX -eq 1 ]]; then
  python3 build.py --allow-index
else
  python3 build.py
fi

OSS=( "$OSSUTIL" -e "$ENDPOINT" )
[[ ${#CONFIG_ARGS[@]} -gt 0 ]] && OSS=( "$OSSUTIL" "${CONFIG_ARGS[@]}" -e "$ENDPOINT" )

echo "== 目标 oss://$BUCKET （endpoint ${ENDPOINT}）=="
[[ $GO -eq 1 ]] || echo "== DRY-RUN 模式（--go 才真传）=="

run() {
  if [[ $GO -eq 1 ]]; then
    "${OSS[@]}" "$@"
  else
    echo "  [dry] ossutil -e $ENDPOINT $*"
  fi
}

# 1) 动态数据与路由壳：不缓存（每次构建内容即真值）
run cp -r -f --update \
  --exclude "*.woff2" --exclude "*.png" --exclude "*.webp" \
  --meta Cache-Control:no-cache \
  dist/ "oss://$BUCKET/"

# 2) 不可变资产（字体分片/图标/徽章图）：一年 immutable
run cp -r -f --update \
  --include "*.woff2" --include "*.png" --include "*.webp" \
  --meta "Cache-Control:max-age=31536000,immutable" \
  dist/assets/ "oss://$BUCKET/assets/"

# 3) 静态托管：index.html + 404.html（错误文档回退壳，SPA 站内 404 由前端渲染）
run website --method put --index-descript index.html --error-descript 404.html "oss://$BUCKET/"

echo "== 完成。校验： =="
echo "  curl -s https://wenfeng.org/ | head"
echo "  curl -s -o /dev/null -w '%{http_code}\n' https://wenfeng.org/source/Xwwk/"
echo "  curl -s -o /dev/null -w '%{http_code}\n' https://wenfeng.org/license/Xwwk/"
echo "  curl -s https://wenfeng.org/build-manifest.json | python3 -m json.tool | head -8"
