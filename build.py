#!/usr/bin/env python3
"""wenfeng.org 静态构建器（决策 1 方案 A 的构建侧）。

产出 dist/：可直接上传 OSS 静态托管的完整站点。

  python3 build.py [--allow-index]

产物内容：
  index.html / 404.html / css / js / assets / samples.json / data（许可索引+原文）
  逐路由壳（每个可寻址路由一份 index.html 副本，SPA 按 pathname 渲染）
  robots.txt（默认全站拒收；--allow-index 时放行并生成 sitemap.xml）
  build-manifest.json（构建对账：git 版本、条目数、文件清单哈希）

不带出仓的东西：attest-hmac.json（原型密钥）、attest-ledger.json（台账，M2 服务持有）、
export-report.json / export-overrides.json（内部对账）。证书 API（/api/v1/certs/*）不在静态包内，
attest / v 页面在 M2 服务就位前提交表单会得到「接口失败」提示，属预期。
"""

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'dist'

# 静态包需要预铺壳的路由：内容路由 + 工具路由（证书路由壳也在，页面自行降级）。
TOP_ROUTES = ['', 'source', 'license', 'foundry', 'use', 'how', 'about',
              'attest', 'attest/verify', 'attest/ledger', 'v', 'legal', 'slice']

COPY_DIRS = ['css', 'js', 'assets']
COPY_DATA = []

EXCLUDE_FROM_DIST = {'attest-hmac.json', 'attest-ledger.json',
                     'export-report.json', 'export-overrides.json',
                     'samples-full.json', 'licenses.json'}


def git_rev():
    try:
        return subprocess.run(['git', '-C', str(ROOT), 'rev-parse', '--short', 'HEAD'],
                              capture_output=True, text=True, check=True).stdout.strip()
    except Exception:
        return None


def sha256_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()


def build(allow_index):
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    shell_src = (ROOT / 'index.html').read_text(encoding='utf-8')
    if allow_index:
        shell_src = shell_src.replace('name="robots" content="noindex,nofollow"',
                                      'name="robots" content="index,follow"')

    # 1) 基础拷贝
    for d in COPY_DIRS:
        shutil.copytree(ROOT / d, DIST / d)
    (DIST / 'data').mkdir()
    for name in COPY_DATA:
        shutil.copy2(ROOT / 'data' / name, DIST / 'data' / name)
    if (ROOT / 'data' / 'license-text').is_dir():
        shutil.copytree(ROOT / 'data' / 'license-text', DIST / 'data' / 'license-text')
    if (ROOT / 'data' / 'font').is_dir():
        shutil.copytree(ROOT / 'data' / 'font', DIST / 'data' / 'font')
    shutil.copy2(ROOT / 'samples.json', DIST / 'samples.json')

    # 2) 路由壳
    samples = json.loads((ROOT / 'samples.json').read_text(encoding='utf-8'))
    fonts = samples.get('fonts') or []
    foundry_slugs = sorted({f.get('foundrySlug') or 'unknown' for f in fonts})
    routes = list(TOP_ROUTES)
    routes += ['foundry/' + s for s in foundry_slugs]
    for f in fonts:
        norm = f['norm']
        routes += ['source/' + norm, 'license/' + norm, 'slice/' + norm, 'attest/' + norm]
    for r in routes:
        d = DIST / r if r else DIST
        d.mkdir(parents=True, exist_ok=True)
        (d / 'index.html').write_text(shell_src, encoding='utf-8')
    (DIST / '404.html').write_text(shell_src, encoding='utf-8')

    # 3) robots / sitemap
    site = 'https://wenfeng.org'
    if allow_index:
        (DIST / 'robots.txt').write_text(
            f'User-agent: *\nAllow: /\n\nSitemap: {site}/sitemap.xml\n', encoding='utf-8')
        urls = [site + '/'] + [site + '/' + r + '/' for r in routes if r]
        today = time.strftime('%Y-%m-%d')
        sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' \
                  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + \
                  ''.join(f'<url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + \
                  '</urlset>\n'
        (DIST / 'sitemap.xml').write_text(sitemap, encoding='utf-8')
    else:
        (DIST / 'robots.txt').write_text('User-agent: *\nDisallow: /\n', encoding='utf-8')

    # 4) 构建清单
    inventory = {}
    for p in sorted(DIST.rglob('*')):
        if p.is_file():
            inventory[str(p.relative_to(DIST))] = sha256_file(p)
    manifest = {
        'builtAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'git': git_rev(),
        'allowIndex': allow_index,
        'fonts': len(fonts),
        'routes': len(routes) + 1,
        'files': len(inventory),
        'bytes': sum((DIST / k).stat().st_size for k in inventory),
        'licenseTexts': len(list((DIST / 'data' / 'license-text').glob('*.json'))),
        'excluded': sorted(EXCLUDE_FROM_DIST),
        'inventorySha256': inventory,
    }
    (DIST / 'build-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1), encoding='utf-8')

    print(f"dist/ 构建完成：{manifest['fonts']} 款 · {manifest['routes']} 条路由 · "
          f"{manifest['files']} 个文件 · {manifest['bytes'] / 1024 / 1024:.1f}MB · "
          f"索引 {'开' if allow_index else '关（noindex）'}")
    return manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--allow-index', action='store_true',
                    help='放行搜索引擎（默认全站 noindex，防半成品被收录）')
    args = ap.parse_args()
    if not (ROOT / 'samples.json').exists():
        print('缺少 samples.json，先跑 export-wenfeng.py。', file=sys.stderr)
        sys.exit(1)
    build(args.allow_index)


if __name__ == '__main__':
    main()
