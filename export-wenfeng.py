#!/usr/bin/env python3
"""wenfeng.org 站点数据导出器（决策 3 数据源管线的本地部分）。

真源（全部只读）：
  fonts-front/data/fonts-by-slug/*.json      店面条目（基础字段）
  font-licenses/licenses/<norm>/LICENSE      授权原文字节（textSha256 真值）
  font-licenses/licenses/<norm>/license-info.json  结构化授权
  font-licenses/data/source-mirrors.json     镜像线状态
  fonts-front/data/font-lineage.json         谱系（byName 按字体中文名）
  font-foundries/foundries/<owner>/profile.json    出品方名录

输出（写入本目录）：
  samples.json                 全量目录（站点主数据）
  data/licenses.json           许可索引（无 body，控制首屏体积）
  data/license-text/<norm>.json 许可原文（licensePage 按需加载）
  data/export-report.json      本次导出对账

用法：
  python3 export-wenfeng.py [--dry-run] [--limit N]
"""

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

PROTOTYPE = Path(__file__).resolve().parent
HOME = Path.home()
DEFAULT_FONTS_FRONT = HOME / 'Projects' / 'fonts-front'
DEFAULT_FONT_LICENSES = HOME / 'Projects' / 'font-licenses'
DEFAULT_FONT_FOUNDRIES = HOME / 'Projects' / 'font-foundries'

# 原件归档地址前缀：M1 占位，桶目录定值后换（DEVELOPMENT-PREP §2 换值清单第 1 行）。
ARCHIVE_HREF_PREFIX = 'https://cn.windfonts.com/wenfeng-original/'
SHOP_HREF = 'https://app.windfonts.com/fonts/'

OFL_TEXT_STATES = ('full', 'pointer', 'missing')

# 许可文本类 URL 不算「官方下载」出处（那是协议文件不是取件地）
LICENSE_URL_RE = re.compile(r'/(OFL|OFLLICENSE|LICENSE|COPYING)[^/]*$|/licenses?/|\.txt$|\.pdf$', re.I)


def repo_like(u):
    return bool(u) and not LICENSE_URL_RE.search(u)

RFN_LINE = re.compile(r"with Reserved Font Names?\s+(.+?)\.(?:\s|$)")
RFN_NAMES = re.compile(r"'([^']+)'")


def load_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def git_add_dates(repo):
    """font-licenses 仓里每个 LICENSE 首次入库的日期（取证日期真值）。"""
    dates = {}
    try:
        out = subprocess.run(
            ['git', '-C', str(repo), 'log', '--format=%as', '--name-only',
             '--diff-filter=A', '--', 'licenses/'],
            capture_output=True, text=True, check=True,
        ).stdout
    except Exception:
        return dates
    cur = None
    for line in out.splitlines():
        line = line.strip()
        if not line:
            continue
        if re.fullmatch(r'\d{4}-\d{2}-\d{2}', line):
            cur = line
        elif line.startswith('licenses/') and line.endswith('/LICENSE'):
            norm = line.split('/')[1]
            if norm not in dates and cur:
                dates[norm] = cur
    return dates


def parse_rfn(text):
    m = RFN_LINE.search(text)
    if not m:
        return None
    names = RFN_NAMES.findall(m.group(1))
    return '、'.join(names) if names else None


def spdx_of(info, base):
    if info and info.get('spdx'):
        return info['spdx']
    name = (base.get('licenseName') or '').strip()
    lower = name.lower()
    if lower == 'ofl' or lower.startswith('ofl') or 'open font license' in lower or name.startswith('SIL'):
        return 'OFL-1.1'
    for token, spdx in (('apache', 'Apache-2.0'),
                        ('mit license', 'MIT'), ('gnu lesser', 'LGPL-2.1'),
                        ('gnu general', 'GPL-3.0'), ('cc by 4.0', 'CC-BY-4.0')):
        if token in lower:
            return spdx
    return None


def text_state(lic_path, info):
    if lic_path and lic_path.exists():
        return 'full'
    if info:
        return 'pointer'
    return 'missing'


def dist_of(info, base):
    if info and 'distribution' in info:
        return bool(info.get('distribution'))
    lic = base.get('license') or ''
    if lic in ('开源商用', '开源免费商用'):
        return True
    return lic == '免费商用'


def offer_of(mirror_state, info, upstream, has_text=False):
    if mirror_state == 'mirrored':
        return 'source'
    if (info or has_text) and upstream:
        return 'jump'
    if info or has_text:
        return 'pending'
    return 'missing'


def owner_names(foundries_root):
    names = {}
    if not foundries_root.is_dir():
        return names
    for d in foundries_root.iterdir():
        prof = d / 'profile.json'
        if not prof.exists():
            continue
        try:
            p = load_json(prof)
        except Exception:
            continue
        names[d.name] = p.get('name') or p.get('nameEn') or d.name
    return names


def build_origin(lin, owners):
    if not lin or lin.get('relation') != 'fork':
        return None
    work = lin.get('upstreamName') or ''
    owner_id = lin.get('upstreamOwnerId') or ''
    author = owners.get(owner_id, owner_id)
    if not work or not author:
        return None
    return {
        'rootAuthor': author,
        'rootWork': work,
        'note': '衍生字体，授权随上游沿袭。' if lin.get('licenseFollows') == 'inherit'
                else '衍生字体，授权见各自主页。',
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fonts-front', type=Path, default=DEFAULT_FONTS_FRONT)
    ap.add_argument('--font-licenses', type=Path, default=DEFAULT_FONT_LICENSES)
    ap.add_argument('--font-foundries', type=Path, default=DEFAULT_FONT_FOUNDRIES)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--limit', type=int, default=0)
    args = ap.parse_args()

    slug_dir = args.fonts_front / 'data' / 'fonts-by-slug'
    lic_dir = args.font_licenses / 'licenses'
    mirrors_raw = load_json(args.font_licenses / 'data' / 'source-mirrors.json')['fonts']
    mirrors = {m['norm']: m for m in mirrors_raw} if isinstance(mirrors_raw, list) else mirrors_raw
    lineage = load_json(args.fonts_front / 'data' / 'font-lineage.json')
    by_name = lineage.get('byName') or {}
    owners = owner_names(args.font_foundries)
    dict_by_fontname = {}
    try:
        for entry in load_json(args.fonts_front / 'data' / 'foundries.json').get('foundries') or []:
            for fn in entry.get('fontNames') or []:
                dict_by_fontname[fn] = (entry.get('id') or entry.get('slug') or 'unknown',
                                        entry.get('name') or entry.get('en') or fn)
    except Exception:
        pass
    fetched_dates = git_add_dates(args.font_licenses)
    overrides = {}
    ov_path = PROTOTYPE / 'data' / 'export-overrides.json'
    if ov_path.exists():
        overrides = (load_json(ov_path).get('fonts') or {})

    slug_files = sorted(slug_dir.glob('*.json'))
    if args.limit:
        slug_files = slug_files[:args.limit]

    fonts = []
    lic_index = {}
    lic_texts = 0
    counts = {'text_full': 0, 'text_pointer': 0, 'text_missing': 0, 'sha256': 0, 'rfn': 0,
              'offer_source': 0, 'offer_jump': 0, 'offer_pending': 0, 'offer_missing': 0,
              'origin': 0, 'mirror_norm_unmatched': 0}

    for sf in slug_files:
        norm = sf.stem
        base = load_json(sf)
        info_path = lic_dir / norm / 'license-info.json'
        lic_path = lic_dir / norm / 'LICENSE'
        info = load_json(info_path) if info_path.exists() else None
        info = info or (load_json(lic_path.parent / 'license-info.json')
                        if (lic_path.parent / 'license-info.json').exists() else None)

        mir = mirrors.get(norm) or {}
        raw_upstream = mir.get('upstream') or (info or {}).get('licenseUrl') or base.get('licenseUrl') or None
        upstream = raw_upstream if repo_like(raw_upstream) else None
        mirror_state = mir.get('mirror_state') or 'absent'

        state = text_state(lic_path, info)
        sha = None
        body = None
        fetched = fetched_dates.get(norm)
        if lic_path.exists():
            raw = lic_path.read_bytes()
            sha = hashlib.sha256(raw).hexdigest()
            counts['sha256'] += 1
            try:
                body = raw.decode('utf-8')
            except UnicodeDecodeError:
                body = raw.decode('utf-8', 'replace')
        spdx = spdx_of(info, base)
        rfn = parse_rfn(body) if (spdx == 'OFL-1.1' and body) else None
        if rfn:
            counts['rfn'] += 1

        lin = by_name.get(base.get('name') or '')
        origin = build_origin(lin, owners)
        if origin:
            counts['origin'] += 1

        offer = offer_of(mirror_state, info, upstream, has_text=bool(sha))
        counts['offer_' + offer] += 1
        counts['text_' + state] += 1

        files = []
        if offer == 'source':
            files.append({'kind': 'archive', 'label': '源文件归档', 'format': 'tar.gz',
                          'href': ARCHIVE_HREF_PREFIX + norm + '.tar.gz', 'sha256': None,
                          'staged': True})
        if upstream and upstream.startswith('http'):
            files.append({'kind': 'upstream',
                          'label': '上游 ' + re.sub(r'^www\\.', '', re.sub(r'^https?://', '', upstream)).split('/')[0],
                          'format': 'git', 'href': upstream, 'sha256': None})
        files.append({'kind': 'slice', 'label': '网页切片包（自托管）', 'format': 'zip',
                      'href': None, 'status': 'planned', 'sha256': None})

        ov = overrides.get(norm) or {}
        lic_block = {
            'spdx': spdx,
            'textState': state,
            'sourceUrl': raw_upstream,
            'fetchedAt': fetched,
            'textSha256': sha,
            'verifiedAt': (info or {}).get('verifiedAt'),
            'rfn': rfn,
        }
        if ov.get('rfnNote'):
            lic_block['rfnNote'] = ov['rfnNote']

        lin_owner = (lin or {}).get('ownerId') or (lin or {}).get('makerId') or ''
        brand_slug = (base.get('brand') or {}).get('slug')
        foundry_name = base.get('foundry') or ''
        if brand_slug:
            base_brand, base_foundry = brand_slug, foundry_name
        elif foundry_name:
            base_brand, base_foundry = foundry_name.lower(), foundry_name
        elif (base.get('name') or '') in dict_by_fontname:
            base_brand, base_foundry = dict_by_fontname[base['name']]
        elif lin_owner and lin_owner in owners:
            base_brand, base_foundry = lin_owner, owners[lin_owner]
        else:
            base_brand, base_foundry = 'unknown', ''

        css_family = base.get('family') or ''
        entry = {
            'norm': norm,
            'name': base.get('name') or norm,
            'en': base.get('en') or '',
            'aliases': ov.get('aliases') or [],
            'licenseName': base.get('licenseName') or (info or {}).get('type') or '授权待核',
            'license': lic_block,
            'foundry': base_foundry,
            'foundrySlug': base_brand,
            'offer': offer,
            'slice': 'planned',
            'distribution': dist_of(info, base),
            'shop': SHOP_HREF + norm,
            'weights': base.get('weights') or [],
            'mirror': {
                'state': mirror_state if mirror_state == 'mirrored' else ('absent' if mirror_state == 'skipped' else mirror_state),
                'feicode': mir.get('feicode_mirror'),
                'upstream': mir.get('upstream') or upstream,
                'syncedAt': None,
                'headSha': None,
            },
            'lineage': ov.get('lineage'),
            'files': files,
            'visitorNote': ov.get('visitorNote') or '',
            'family': css_family,
        }
        if origin or ov.get('origin'):
            entry['license']['origin'] = ov.get('origin') or origin
        fonts.append(entry)

        title = base.get('licenseName') or (info or {}).get('type') or '许可原文'
        lic_index[norm] = {
            'textKind': state if state in ('full', 'pointer') else 'missing',
            'title': title,
            'evidence': {
                'source': (info or {}).get('verifiedBy') or ('上游仓原文' if state == 'full' else '结构化记录'),
                'url': lic_block['sourceUrl'],
                'commit': None,
                'fetchedAt': fetched,
                'rule': None,
            },
        }
        if body:
            lic_texts += 1

    report = {
        'generated': None,
        'coverage': {
            'shop_fonts': len(slug_files),
            'source_mirrors': sum(1 for m in mirrors.values() if m.get('mirror_state') == 'mirrored'),
            'license_dirs': len([d for d in lic_dir.iterdir() if d.is_dir()]) if lic_dir.is_dir() else 0,
            'sample_fonts': len(fonts),
        },
        'counts': counts,
        'license_texts': lic_texts,
    }
    slug_norms = {f.stem for f in slug_files}
    counts['mirror_norm_unmatched'] = sorted(
        n for n, m in mirrors.items()
        if m.get('mirror_state') == 'mirrored' and n not in slug_norms)

    if args.dry_run:
        print(json.dumps(report, ensure_ascii=False, indent=1))
        print('DRY RUN，未写文件。', file=sys.stderr)
        return

    import datetime
    today = datetime.date.today().isoformat()
    envelope = {
        'generated': today,
        'purpose': 'wenfeng.org 全量目录（export-wenfeng.py 从真源导出）',
        'comment': '演示样本已退役；字段映射与真源见 DEVELOPMENT-PREP.md',
        'coverage': report['coverage'],
        'fonts': fonts,
    }
    SLIM_FIELDS = ('norm', 'name', 'en', 'aliases', 'licenseName', 'foundry', 'foundrySlug',
                   'offer', 'slice', 'distribution', 'shop', 'weights', 'family')
    slim_fonts = []
    for f in fonts:
        s = {k: f[k] for k in SLIM_FIELDS if f.get(k) not in (None, [], '')}
        s['license'] = {k: f['license'][k] for k in ('textState', 'spdx')
                        if f['license'].get(k) is not None}
        slim_fonts.append(s)
    slim = dict(envelope)
    slim['fonts'] = slim_fonts
    slim['comment'] = '瘦目录（首页/列表/卡片）；详情页按需取 data/font/<norm>.json'
    (PROTOTYPE / 'samples.json').write_text(
        json.dumps(slim, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    (PROTOTYPE / 'data' / 'samples-full.json').write_text(
        json.dumps(envelope, ensure_ascii=False, indent=1), encoding='utf-8')
    font_dir = PROTOTYPE / 'data' / 'font'
    font_dir.mkdir(parents=True, exist_ok=True)
    for old in font_dir.glob('*.json'):
        old.unlink()
    for f in fonts:
        (font_dir / (f['norm'] + '.json')).write_text(
            json.dumps(f, ensure_ascii=False, indent=1), encoding='utf-8')
    (PROTOTYPE / 'data' / 'licenses.json').write_text(
        json.dumps(lic_index, ensure_ascii=False, indent=1), encoding='utf-8')
    text_dir = PROTOTYPE / 'data' / 'license-text'
    text_dir.mkdir(parents=True, exist_ok=True)
    # 清掉旧的单体 body 文件以外的残留：只重写当前集合
    for old in text_dir.glob('*.json'):
        old.unlink()
    for sf in slug_files:
        norm = sf.stem
        lic_path = lic_dir / norm / 'LICENSE'
        if not lic_path.exists():
            continue
        raw = lic_path.read_bytes()
        base = load_json(sf)
        idx_entry = lic_index.get(norm) or {}
        payload = {
            'norm': norm,
            'title': idx_entry.get('title') or base.get('licenseName') or '许可原文',
            'body': raw.decode('utf-8', 'replace'),
            'textKind': idx_entry.get('textKind'),
            'evidence': idx_entry.get('evidence'),
        }
        (text_dir / (norm + '.json')).write_text(
            json.dumps(payload, ensure_ascii=False), encoding='utf-8')
    report['generated'] = today
    (PROTOTYPE / 'data' / 'export-report.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')

    size_samples = (PROTOTYPE / 'samples.json').stat().st_size
    size_index = (PROTOTYPE / 'data' / 'licenses.json').stat().st_size
    size_texts = sum(f.stat().st_size for f in text_dir.glob('*.json'))
    print(json.dumps(report, ensure_ascii=False, indent=1))
    print(f'samples.json {size_samples/1024:.0f}KB · licenses.json {size_index/1024:.0f}KB · license-text/ {size_texts/1024:.0f}KB ({lic_texts} 款)')


if __name__ == '__main__':
    main()
