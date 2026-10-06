#!/usr/bin/env python3
"""Local preview of the complete wenfeng.org prototype.

  python3 preview.py --port 16030

Root routes are the full site (index.html + js/site.js).
/lab is the old A–F chooser. /a … /f keep those shells.
/font/{Norm} 301s to /source/{Norm}/.
/api/v1/* is generated from samples.json.
Production DNS is not touched.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import posixpath
import re
import subprocess
import sys
import tempfile
import threading
from datetime import datetime, timezone, timedelta
import qrcode
import qrcode.image.svg
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from html import escape as html_escape
from typing import Optional
from urllib.parse import parse_qs, quote, unquote, urlparse

ROOT = os.path.abspath(os.path.dirname(__file__))

LEDGER_LOCK = threading.Lock()
LEDGER_PATH = os.path.join(ROOT, "data", "attest-ledger.json")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PDF_EP = re.compile(r"^/api/v1/certs/([^/]+)/pdf$")

VARIANT = re.compile(r"^/([a-f])(?:/.*)?$")
FONT_VAR_REDIR = re.compile(r"^/([a-f])/font/([^/]+)/?$")
ARCHIVE_NOSLASH = re.compile(r"^/([a-f])/source/([^/]+)$")
FONT_ROOT_REDIR = re.compile(r"^/font/([^/]+)/?$")
SOURCE_NOSLASH = re.compile(r"^/source/([^/]+)$")
FOUNDRY_NOSLASH = re.compile(r"^/foundry/([^/]+)$")
SITE = re.compile(
    r"^/(source|license|foundry|use|about|how|attest|legal|slice|gap)(/[^/]+)?(/[^/]+)?/?$"
)
SLICE_NOSLASH = re.compile(r"^/slice/([^/]+)$")
API_FONTS = re.compile(r"^/api/v1/fonts(?:/([^/]+))?$")
API_LIC = re.compile(r"^/api/v1/licenses(?:/([^/]+))?$")
API_FOU = re.compile(r"^/api/v1/foundries(?:/([^/]+))?$")
API_CERT = re.compile(r"^/api/v1/certs(?:/([^/]+))?$")
ATTEST_NOSLASH = re.compile(r"^/attest/([^/]+)$")
API_QR = re.compile(r"^/api/v1/certs/qr$")
API_LOOKUP = re.compile(r"^/api/v1/certs/lookup$")
API_BADGE = re.compile(r"^/api/v1/certs/badge$")
TZ_CN = timezone(timedelta(hours=8))
USAGE_WORDS = {
    "web": "网页嵌入",
    "print": "印刷物料",
    "embed": "软件内嵌",
    "modify": "修改衍生",
    "redistribute": "再分发",
}
ISSUER = {
    "legalName": "文派（广州）科技有限公司",
    "brand": "文风",
    "product": "wenfeng.org",
}


def _badge_icon_b64():
    path = os.path.join(ROOT, "assets", "badge-mark.png")
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode("ascii")


BADGE_ICON_B64 = _badge_icon_b64()


def _badge_font_css():
    path = os.path.join(ROOT, "assets", "badge-font.css")
    with open(path, encoding="utf-8") as fh:
        return fh.read()


BADGE_FONT_CSS = _badge_font_css()

# 徽章：plaque 牌匾 · dark 深底 · slim-ink/slim-paper 细条黑白（slim=细条黑别名）
BADGE_VARIANTS = ("plaque", "dark", "slim", "slim-ink", "slim-paper")


def _badge_face_name(catalog: str) -> str:
    """徽章第二行用短名：去掉「文风·」前缀。"""
    name = (catalog or "").strip() or "文风字体"
    if name.startswith("文风·"):
        return name[3:]
    if name.startswith("文风"):
        return name[2:].lstrip("· ").lstrip() or name
    return name


def _badge_fit_text(text: str, size: float, max_w: float) -> str:
    """按估算宽度截断，避免长字体名撑破徽章。"""
    raw = text or ""
    if _badge_text_w(raw, size) <= max_w:
        return raw
    ell = "…"
    ell_w = _badge_text_w(ell, size)
    out = ""
    for ch in raw:
        if _badge_text_w(out + ch, size) + ell_w > max_w:
            return out + ell
        out += ch
    return out


def _badge_text_w(text: str, size: float) -> float:
    """粗估中英混排文本宽度（徽章排版用）。"""
    w = 0.0
    for ch in text or "":
        o = ord(ch)
        if o > 0x2E80 or ch in "·—…":
            w += size * 0.96
        else:
            w += size * 0.55
    return w


def _normalize_badge_variant(variant: str) -> str:
    v = (variant or "plaque").strip().lower()
    if v == "slim":
        return "slim-ink"
    if v in BADGE_VARIANTS and v != "slim":
        return v
    return "plaque"


def _badge_spdx_tag(spdx: Optional[str]) -> str:
    """徽章上的短协议标签（如 OFL-1.1）。"""
    return (spdx or "").strip()


def _render_badge_svg(
    catalog: str,
    variant: str = "plaque",
    spdx: Optional[str] = None,
) -> str:
    """按样式生成授权证明徽章 SVG。

    Args:
        catalog: 台账收录名（如「文风·霞鹜文楷」）。
        variant: plaque | dark | slim | slim-ink | slim-paper。
        spdx: 短协议标识（如 OFL-1.1），写入可见文案。

    Returns:
        SVG 字符串。细条含 logo 的左右分栏；牌匾/深底压矮比例。
    """
    v = _normalize_badge_variant(variant)
    full = catalog or "文风字体"
    face = _badge_face_name(full)
    tag = _badge_spdx_tag(spdx)
    label = html_escape(full)
    title = ("%s · %s" % (full, tag)) if tag else full
    title_esc = html_escape(title)
    ink, paper, gold = "#26200f", "#fcf9f1", "#d9c07a"
    head = "授权证明"
    aria = ("%s %s · %s" % (label, head, html_escape(tag))) if tag else ("%s %s" % (label, head))

    if v in ("slim-ink", "slim-paper"):
        # 细条：矮比例；左栏留 logo + 文案，右栏 SPDX；字名只进 title
        dark = v == "slim-ink"
        right_label = tag or "ATTEST"
        h = 28
        icon = 16
        icon_pad = 7.0
        gap = 9.0
        left_fs, right_fs = 11.0, 10.0
        tracking = 1.0
        left_end = 14.0
        right_pad = 14.0
        text_w = _badge_text_w(head, left_fs) + tracking * max(0, len(head) - 1) + 4
        left_w = int(icon_pad + icon + gap + text_w + left_end)
        right_w = int(max(72, right_pad * 2 + _badge_text_w(right_label, right_fs) + 6))
        w = left_w + right_w
        if dark:
            left_bg, left_fg = ink, paper
            right_bg, right_fg = "#3d3628", gold
        else:
            left_bg, left_fg = "#efece4", ink
            right_bg, right_fg = "#e0d9cc", "#5c4f3a"
        ty = h * 0.5 + left_fs * 0.34
        icon_y = (h - icon) / 2
        text_x = icon_pad + icon + gap
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            'width="%d" height="%d" viewBox="0 0 %d %d" role="img" aria-label="%s">'
            '<title>%s</title><style>%s</style>'
            '<defs><clipPath id="b"><rect width="%d" height="%d" rx="6"/></clipPath></defs>'
            '<g clip-path="url(#b)">'
            '<rect width="%d" height="%d" fill="%s"/>'
            '<rect x="%d" width="%d" height="%d" fill="%s"/>'
            '</g>'
            '<image x="%.1f" y="%.1f" width="%d" height="%d" '
            'xlink:href="data:image/png;base64,%s"/>'
            '<text x="%.1f" y="%.1f" text-anchor="start" '
            'font-family="wf-hckht, PingFang SC, sans-serif" font-size="%.0f" '
            'letter-spacing="%.1f" fill="%s">%s</text>'
            '<text x="%.1f" y="%.1f" text-anchor="start" '
            'font-family="ui-monospace, SFMono-Regular, Menlo, monospace" '
            'font-size="%.0f" fill="%s">%s</text></svg>'
        ) % (
            w, h, w, h, aria, title_esc, BADGE_FONT_CSS,
            w, h,
            w, h, left_bg,
            left_w, right_w, h, right_bg,
            icon_pad, icon_y, icon, icon, BADGE_ICON_B64,
            text_x, ty, left_fs, tracking, left_fg, head,
            left_w + right_pad, ty, right_fs, right_fg, html_escape(right_label),
        )

    # 牌匾 / 深底：压矮（约 52 高），按文案定宽
    h = 52
    icon = 24
    icon_x = 12.0
    text_x = 44.0
    pad_r = 14.0
    max_text = 120.0
    if tag:
        tag_bit = " · %s" % tag
        name = _badge_fit_text(face, 8.5, max(24, max_text - _badge_text_w(tag_bit, 8.5)))
        line2 = ("%s%s" % (name, tag_bit)) if name else tag
    else:
        line2 = _badge_fit_text(face, 8.5, max_text)
    line2_esc = html_escape(line2)
    title_w = _badge_text_w(head, 13) + 8
    sub_w = _badge_text_w(line2, 8.5)
    w = int(max(158, min(200, text_x + max(title_w, sub_w) + pad_r)))
    icon_y = (h - icon) / 2
    title_y, sub_y = 22.5, 40.0

    if v == "dark":
        return (
            '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
            'width="%d" height="%d" viewBox="0 0 %d %d" role="img" aria-label="%s">'
            '<title>%s</title><style>%s</style>'
            '<rect x="0.75" y="0.75" width="%d" height="%d" rx="8" fill="%s" stroke="#4a4334" stroke-width="1.4"/>'
            '<rect x="4.5" y="4.5" width="%d" height="%d" rx="5" fill="none" stroke="#3a3428" stroke-width="0.5"/>'
            '<image x="%.1f" y="%.1f" width="%d" height="%d" xlink:href="data:image/png;base64,%s"/>'
            '<text x="%.1f" y="%.1f" font-family="wf-hckht, PingFang SC, sans-serif" '
            'font-size="13" letter-spacing="2" fill="%s">%s</text>'
            '<text x="%.1f" y="%.1f" font-family="PingFang SC, Microsoft YaHei, sans-serif" '
            'font-size="8.5" fill="#c4b89a">%s</text></svg>'
        ) % (
            w, h, w, h, aria, title_esc, BADGE_FONT_CSS,
            w - 1.5, h - 1.5, ink, w - 9, h - 9,
            icon_x, icon_y, icon, icon, BADGE_ICON_B64,
            text_x, title_y, paper, head,
            text_x, sub_y, line2_esc,
        )

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        'width="%d" height="%d" viewBox="0 0 %d %d" role="img" aria-label="%s">'
        '<title>%s</title><style>%s</style>'
        '<rect x="0.75" y="0.75" width="%d" height="%d" rx="8" fill="%s" stroke="%s" stroke-width="1.4"/>'
        '<rect x="4.5" y="4.5" width="%d" height="%d" rx="5" fill="none" stroke="#ddd4c2" stroke-width="0.5"/>'
        '<image x="%.1f" y="%.1f" width="%d" height="%d" xlink:href="data:image/png;base64,%s"/>'
        '<text x="%.1f" y="%.1f" font-family="wf-hckht, PingFang SC, sans-serif" '
        'font-size="13" letter-spacing="2" fill="%s">%s</text>'
        '<text x="%.1f" y="%.1f" font-family="PingFang SC, Microsoft YaHei, sans-serif" '
        'font-size="8.5" fill="#6b5b45">%s</text></svg>'
    ) % (
        w, h, w, h, aria, title_esc, BADGE_FONT_CSS,
        w - 1.5, h - 1.5, paper, gold, w - 9, h - 9,
        icon_x, icon_y, icon, icon, BADGE_ICON_B64,
        text_x, title_y, ink, head,
        text_x, sub_y, line2_esc,
    )


def _load_samples():
    with open(os.path.join(ROOT, "data", "samples-full.json"), encoding="utf-8") as fh:
        return json.load(fh)


def _load_licenses():
    with open(os.path.join(ROOT, "data", "licenses.json"), encoding="utf-8") as fh:
        return json.load(fh)


def _hay(font):
    name = font.get("name") or ""
    parts = [
        "文风·%s" % name,
        name,
        font.get("en") or "",
        font.get("norm") or "",
        font.get("foundry") or "",
        font.get("licenseName") or "",
    ]
    parts.extend(font.get("aliases") or [])
    return " ".join(parts).lower()


def _public_font(font):
    out = dict(font)
    # 对外 norm 一律小写（与站内路由 / wenfeng-* 品牌名一致）
    out["norm"] = str(out.get("norm") or "").lower()
    shop = out.get("shop") or ""
    if "/fonts/" in shop:
        # 店面 URL 路径段也用小写（两侧都通；与对外 norm 一致）
        out["shop"] = re.sub(r"(/fonts/)([^/?#]+)", lambda m: m.group(1) + m.group(2).lower(), shop, count=1)
    out["catalogName"] = _catalog_name(font)
    out["originalName"] = font.get("name")
    out["canAttest"] = _can_attest(font)
    # 证据链字段（license.* / files[].sha256 / mirror.syncedAt / mirror.headSha）随 samples.json 原样透传；
    # lineage 为造字平台预留字段，恒透出（原型期恒为 null）。
    out.setdefault("license", None)
    out.setdefault("lineage", None)
    if out.get("distribution") is not True:
        out["files"] = []
    return out


def _filter_fonts(fonts, query):
    q = (query.get("q") or [""])[0].strip().lower()
    offer = (query.get("offer") or ["all"])[0]
    foundry = (query.get("foundry") or [""])[0]
    dist = (query.get("distribution") or [""])[0]
    out = []
    for font in fonts:
        if q and q not in _hay(font):
            continue
        if foundry and (font.get("foundrySlug") or "") != foundry:
            continue
        if offer and offer != "all":
            if offer == "slice":
                if font.get("slice") not in ("planned", "ready", "gated"):
                    continue
            elif (font.get("offer") or "jump") != offer:
                continue
        if dist == "true" and font.get("distribution") is not True:
            continue
        if dist == "false" and font.get("distribution") is not False:
            continue
        out.append(_public_font(font))
    return out


# 生产须收回 data/attest-hmac.json（原型期该密钥文件可被直接 GET，见 COPY-AUDIT 风险 7）并换非对称密钥（Ed25519）。
def _load_hmac():
    with open(os.path.join(ROOT, "data", "attest-hmac.json"), encoding="utf-8") as fh:
        return json.load(fh)


def _load_ledger():
    try:
        with open(LEDGER_PATH, encoding="utf-8") as fh:
            payload = json.load(fh)
        return payload.get("records") or []
    except (OSError, ValueError):
        return []


def _count_download(serial):
    """PDF 每下载一次，对应编号计数 +1（台账记录存在才计）。"""
    if not serial:
        return
    with LEDGER_LOCK:
        rows = _load_ledger()
        changed = False
        for r in rows:
            if r.get("serial") == serial:
                r["downloads"] = int(r.get("downloads") or 0) + 1
                changed = True
                break
        if changed:
            payload = {
                "generated": datetime.now(TZ_CN).strftime("%Y-%m-%d"),
                "records": rows,
            }
            with open(LEDGER_PATH, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, ensure_ascii=False, indent=2)


def _record_ledger(cert):
    """签发即落账；台账是公开数据，任何人可按编号核对。生产须防篡改（哈希链或只追加日志）。"""
    serial = cert.get("serial")
    if not serial:
        return
    with LEDGER_LOCK:
        rows = _load_ledger()
        if any(r.get("serial") == serial for r in rows):
            return
        rows.insert(
            0,
            {
                "serial": serial,
                "norm": cert.get("norm"),
                "catalogName": cert.get("catalogName"),
                "issuedAt": cert.get("issuedAt"),
                "holder": cert.get("holder"),
                "spdx": (cert.get("license") or {}).get("spdx"),
                "usage": cert.get("usage"),
                "uscc": cert.get("uscc"),
                "licenseHash": ((cert.get("license") or {}).get("sha256") or "")[:8].upper(),
            },
        )
        payload = {
            "generated": datetime.now(TZ_CN).strftime("%Y-%m-%d"),
            "records": rows,
        }
        with open(LEDGER_PATH, "w", encoding="utf-8") as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
            fh.write("\n")


def _catalog_name(font):
    return "文风·%s" % (font.get("name") or "")


ATTEST_SPDX = {
    "OFL-1.1", "MIT", "Apache-2.0", "IPA-1.0", "IPA",
    "CC0-1.0", "CC-BY-4.0", "CC-BY-SA-4.0",
    "GPL-2.0-with-font-exception", "GPL-2.0-or-later WITH Font-exception OR OFL-1.1",
    "MPlus-Bitmap-License",
}


def _can_attest(font):
    if (font.get("license") or {}).get("textState") != "full":
        return False
    return _resolve_spdx(font)[0] in ATTEST_SPDX


def _attest_block_reason(font):
    if (font.get("license") or {}).get("textState") != "full":
        return "许可原文尚未归档核验，暂不出证"
    if _resolve_spdx(font)[0] not in ATTEST_SPDX:
        return "非标准开源协议。本站只提供授权原文下载，文派科技不出具证书"
    return "不出核验"


def _spdx(license_name):
    """Standard open-source licenses only. Vendor-brand terms return None."""
    name = (license_name or "").strip()
    if not name or name == "待核实":
        return None
    lower = name.lower()
    if "open font license" in name or name.startswith("SIL") or lower.startswith("ofl"):
        return "OFL-1.1"
    if name.startswith("MIT") or lower in ("mit", "mit license", "x11", "0bsd"):
        return "MIT"
    if "apache" in lower:
        return "Apache-2.0"
    if name.startswith("IPA") or "ipa font" in lower:
        return "IPA"
    if "cc0" in lower or "creative commons zero" in lower:
        return "CC0-1.0"
    if (
        "cc by" in lower
        or "cc-by" in lower
        or "creative commons attribution" in lower
    ) and "nc" not in lower:
        return "CC-BY-SA-4.0" if "sa" in lower else "CC-BY-4.0"
    if lower.startswith("m+") or "m plus" in lower:
        return "M+"
    if "gpl" in lower and ("font exception" in lower or "font-exception" in lower):
        return "GPL-3.0-with-font-exception"
    return None


def _resolve_spdx(font):
    """SPDX 先读落库的 license.spdx（收录时核定，标 recorded），无值回退 _spdx 按名称判断（标 derived）。"""
    recorded = (font.get("license") or {}).get("spdx") or None
    if recorded:
        return recorded, "recorded"
    return _spdx(font.get("licenseName")), "derived"


def _conclusions(font):
    offer = font.get("offer") or "jump"
    dist = font.get("distribution") is True
    source = offer == "source"
    return {
        "embed": True,
        "redistributeFiles": bool(source and dist),
        "platformOffersSource": source,
    }


def _canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _sign_payload(payload):
    cfg = _load_hmac()
    secret = (cfg.get("secret") or "").encode("utf-8")
    body = dict(payload)
    body.pop("signature", None)
    digest = hmac.new(secret, _canonical(body).encode("utf-8"), hashlib.sha256).hexdigest()
    payload["signature"] = {
        "alg": cfg.get("alg") or "HMAC-SHA256",
        "kid": cfg.get("kid") or "wf-proto-1",
        "value": digest,
        "note": cfg.get("note"),
    }
    return payload


def _verify_payload(payload):
    if not isinstance(payload, dict):
        return False, "not_object"
    cfg = _load_hmac()
    got = (payload.get("signature") or {}).get("value")
    if not got:
        return False, "missing_signature"
    body = dict(payload)
    body.pop("signature", None)
    secret = (cfg.get("secret") or "").encode("utf-8")
    expect = hmac.new(secret, _canonical(body).encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expect, str(got)):
        return False, "mismatch"
    return True, "ok"


def _build_attestation(font, licenses, holder=None, issued_at=None, usage=None, uscc=None):
    if not _can_attest(font):
        return None
    lic = licenses.get(font.get("norm") or "") or {}
    license_name = lic.get("title") or font.get("licenseName") or ""
    spdx, spdx_source = _resolve_spdx(font)
    if not spdx:
        return None
    lic_meta = font.get("license") or {}
    recorded_text_sha = lic_meta.get("textSha256") or None
    body = lic.get("body") or ""
    license_hash = recorded_text_sha or (
        hashlib.sha256(body.encode("utf-8")).hexdigest() if body else None
    )
    text_sha_source = "recorded" if recorded_text_sha else "derived"
    files = font.get("files") or []
    archive = next((x for x in files if x.get("kind") == "archive" and x.get("href")), None)
    href = (archive or {}).get("href") or ""
    href_digest = hashlib.sha256(("href:" + href).encode("utf-8")).hexdigest() if href else None
    # 签发按日粒度：同申报（字体/持证单位/用途/信用代码）同日刷新幂等——
    # 编号、签名、台账记录均不变；生产改为签发一次持久化
    now = issued_at or datetime.now(TZ_CN).date().isoformat()
    holder_s = (holder or "").strip() or None
    uscc_s = (uscc or "").strip() or None
    usage_list = [USAGE_WORDS[u] for u in (usage or []) if u in USAGE_WORDS]
    conclusions = _conclusions(font)
    unsigned = {
        "type": "wenfeng.attestation.v1",
        "title": "文风字体授权证明",
        "catalogName": _catalog_name(font),
        "originalName": font.get("name"),
        "originalEn": font.get("en"),
        "norm": font.get("norm"),
        "foundry": font.get("foundry") or None,
        "usage": usage_list or None,
        "holder": holder_s,
        "uscc": uscc_s,
        "intakeCommit": (font.get("mirror") or {}).get("headSha"),
        "upstreamUrl": (font.get("mirror") or {}).get("upstream"),
        "mirrorUrl": (font.get("mirror") or {}).get("feicode"),
        "issuer": ISSUER,
        "license": {
            "spdx": spdx,
            "spdxSource": spdx_source,
            "name": license_name,
            "url": "/license/%s" % str(font.get("norm")).lower(),
            "textKind": lic.get("textKind"),
            "rfn": (font.get("license") or {}).get("rfn"),
            "origin": (font.get("license") or {}).get("origin"),
            "sha256": license_hash,
            "textSha256Source": text_sha_source,
            "evidence": lic.get("evidence"),
        },
        "conclusions": conclusions,
        "files": {
            "archiveHref": href or None,
            "hrefSha256": href_digest,
            "note": "原型用下载地址摘要，生产换成原件 sha256",
        },
        "not": [
            "本证明是开源许可的核验记录，授权以著作权人发布的许可原文为准。",
            "著作权归原作者或厂商。文派（广州）科技有限公司负责核对与出具本证明。",
            "「文风·」是本站收录名。字体文件内的 name 表、协议中的保留名，均沿用原名。",
            "使用范围以许可原文为准。核验按原文条款记录。",
        ],
        "issuedAt": now,
        "prototype": True,
    }
    seed = _canonical(unsigned)
    serial = "WF-%s-%s" % (
        now[:10].replace("-", ""),
        hashlib.sha256(seed.encode("utf-8")).hexdigest()[:10].upper(),
    )
    unsigned["serial"] = serial
    unsigned["verifyUrl"] = "/attest/%s/" % font.get("norm")
    unsigned["checkUrl"] = "/attest/verify"
    return _sign_payload(unsigned)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _send_json(self, payload, status=200):
        raw = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(raw)

    def _redirect(self, loc):
        self.send_response(301)
        self.send_header("Location", loc)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()

    def _maybe_special(self) -> bool:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path == "/favicon.ico":
            self.send_response(204)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return True
        m = API_QR.match(path)
        if m:
            query = parse_qs(parsed.query)
            serial = (query.get("s") or [""])[0].strip()
            target = "https://wenfeng.org/v" + ("?s=" + serial if serial else "")
            img = qrcode.make(target, image_factory=qrcode.image.svg.SvgPathImage)
            body = img.to_string()
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return True
        m = FONT_VAR_REDIR.match(path)
        if m:
            self._redirect("/%s/source/%s/" % (m.group(1), m.group(2)))
            return True
        m = ARCHIVE_NOSLASH.match(path)
        if m:
            self._redirect("/%s/source/%s/" % (m.group(1), m.group(2)))
            return True
        m = FONT_ROOT_REDIR.match(path)
        if m:
            self._redirect("/source/%s/" % m.group(1))
            return True
        m = SOURCE_NOSLASH.match(path)
        if m:
            self._redirect("/source/%s/" % m.group(1))
            return True
        m = FOUNDRY_NOSLASH.match(path)
        if m:
            self._redirect("/foundry/%s/" % m.group(1))
            return True
        m = ATTEST_NOSLASH.match(path)
        if m and m.group(1) != "verify":
            self._redirect("/attest/%s/" % m.group(1))
            return True
        m = SLICE_NOSLASH.match(path)
        if m:
            self._redirect("/source/%s/" % m.group(1))
            return True
        if path in ("/lab", "/lab/"):
            return False
        if path in ("/api/v1", "/api/v1/"):
            self._send_json(
                {
                    "comment": "wenfeng.org catalog API prototype. Commercial query-only: files stay empty when distribution is not true. Not /api/css.",
                    "endpoints": [
                        "GET /api/v1/fonts",
                        "GET /api/v1/fonts?q=&offer=&foundry=&distribution=",
                        "GET /api/v1/fonts/{norm}",
                        "GET /api/v1/licenses/{norm}",
                        "GET /api/v1/foundries",
                        "GET /api/v1/certs",
                        "GET /api/v1/certs/{norm}",
                        "GET /api/v1/certs/issued",
                        "POST /api/v1/certs/verify",
                    ],
                }
            )
            return True
        m = API_FONTS.match(path)
        if m:
            data = _load_samples()
            fonts = data.get("fonts") or []
            norm = m.group(1)
            if norm:
                hit = next((f for f in fonts if str(f.get("norm") or "").lower() == norm.lower()), None)
                if not hit:
                    self._send_json({"error": "not_found", "norm": str(norm).lower()}, 404)
                    return True
                self._send_json(_public_font(hit))
                return True
            query = parse_qs(parsed.query)
            self._send_json(
                {
                    "generated": data.get("generated"),
                    "coverage": data.get("coverage"),
                    "count": len(_filter_fonts(fonts, query)),
                    "fonts": _filter_fonts(fonts, query),
                }
            )
            return True
        m = API_LIC.match(path)
        if m:
            licenses = _load_licenses()
            norm = m.group(1)
            if not norm:
                self._send_json({"fonts": sorted(str(k).lower() for k in licenses.keys())})
                return True
            lic_key = next((k for k in licenses if str(k).lower() == norm.lower()), None)
            if not lic_key:
                self._send_json({"error": "not_found", "norm": norm.lower()}, 404)
                return True
            payload = dict(licenses[lic_key])
            payload["norm"] = norm.lower()
            payload["comment"] = _load_samples().get("comment")
            self._send_json(payload)
            return True
        m = API_FOU.match(path)
        if m:
            fonts = _load_samples().get("fonts") or []
            groups = {}
            for font in fonts:
                slug = font.get("foundrySlug") or "unknown"
                groups.setdefault(
                    slug,
                    {
                        "slug": slug,
                        "name": font.get("foundry") or "未标注",
                        "fonts": [],
                    },
                )
                groups[slug]["fonts"].append(str(font.get("norm") or "").lower())
            slug = m.group(1)
            if slug:
                if slug not in groups:
                    self._send_json({"error": "not_found", "slug": slug}, 404)
                    return True
                self._send_json(groups[slug])
                return True
            self._send_json({"foundries": list(groups.values())})
            return True
        if path in ("/api/v1/certs/verify", "/api/v1/certs/verify/"):
            self._send_json(
                {
                    "error": "method_not_allowed",
                    "hint": "POST JSON attestation to /api/v1/certs/verify",
                },
                405,
            )
            return True
        m = PDF_EP.match(path)
        if m:
            norm = unquote(m.group(1))
            query = parse_qs(parsed.query)
            forward = []
            for key in ("holder", "uscc", "usage", "style"):
                val = (query.get(key) or [""])[0]
                if val:
                    from urllib.parse import quote as _q
                    forward.append(key + "=" + _q(val))
            page_url = "http://127.0.0.1:%d/attest/%s/" % (
                self.server.server_address[1], quote(norm))
            if forward:
                page_url += "?" + "&".join(forward)
            if not os.path.exists(CHROME):
                self._send_json({"error": "chrome_missing", "path": CHROME}, 500)
                return True
            tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
            tmp.close()
            try:
                subprocess.run(
                    [CHROME, "--headless=new", "--disable-gpu",
                     "--print-to-pdf=" + tmp.name,
                     "--no-pdf-header-footer",
                     "--paper-width=8.2677", "--paper-height=11.6929",
                     "--virtual-time-budget=15000", page_url],
                    capture_output=True, timeout=90, check=True)
                data = open(tmp.name, "rb").read()
            except subprocess.TimeoutExpired:
                self._send_json({"error": "pdf_timeout"}, 504)
                return True
            finally:
                try:
                    os.unlink(tmp.name)
                except OSError:
                    pass
            cert = _build_attestation(
                next((f for f in _load_samples().get("fonts") or []
                      if str(f.get("norm") or "").lower() == str(norm).lower()), None),
                _load_licenses(),
                holder=(query.get("holder") or [""])[0],
                usage=[u for u in (query.get("usage") or [""])[0].split(",") if u],
                uscc=(query.get("uscc") or [""])[0],
            )
            _count_download((cert or {}).get("serial"))
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Disposition",
                             'attachment; filename="wenfeng-authorization-%s.pdf"' % norm)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
            return True
        m = API_BADGE.match(path)
        if m:
            query = parse_qs(parsed.query)
            serial = (query.get("s") or [""])[0].strip().upper()
            variant = _normalize_badge_variant((query.get("v") or ["plaque"])[0])
            want_dl = (query.get("download") or [""])[0] in ("1", "true", "yes")
            hit = next((r for r in _load_ledger() if r.get("serial") == serial), None)
            if not hit:
                self._send_json({"error": "not_found"}, 404)
                return True
            catalog = hit.get("catalogName") or ""
            spdx = hit.get("spdx") or ""
            body = _render_badge_svg(catalog, variant, spdx=spdx).encode("utf-8")
            fname = "wenfeng-badge-%s-%s.svg" % (serial.lower(), variant)
            self.send_response(200)
            self.send_header("Content-Type", "image/svg+xml; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            if want_dl:
                self.send_header(
                    "Content-Disposition",
                    'attachment; filename="%s"' % fname,
                )
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return True
        m = API_LOOKUP.match(path)
        if m:
            query = parse_qs(parsed.query)
            serial = (query.get("s") or [""])[0].strip().upper()
            holder = (query.get("holder") or [""])[0].strip()
            if not serial or not holder:
                self._send_json({"error": "need_serial_and_holder"}, 400)
                return True
            hit = None
            for r in _load_ledger():
                if r.get("serial") == serial:
                    hit = r
                    break
            if not hit:
                self._send_json({"error": "not_found"}, 404)
                return True
            want = (hit.get("holder") or "").strip()
            got = holder.strip()
            if want:
                if got != want:
                    self._send_json({"error": "holder_mismatch"}, 403)
                    return True
            elif got not in ("", "通用核验记录"):
                self._send_json({"error": "holder_mismatch"}, 403)
                return True
            self._send_json({
                "serial": hit.get("serial"),
                "norm": hit.get("norm"),
                "catalogName": hit.get("catalogName"),
                "holder": hit.get("holder"),
                "spdx": hit.get("spdx"),
                "usage": hit.get("usage"),
                "issuedAt": hit.get("issuedAt"),
                "downloads": int(hit.get("downloads") or 0),
                "href": "/attest/%s/" % hit.get("norm"),
            })
            return True
        if path in ("/api/v1/certs/issued", "/api/v1/certs/issued/"):
            rows = _load_ledger()
            self._send_json({"issuer": ISSUER, "count": len(rows), "records": rows})
            return True
        m = API_CERT.match(path)
        if m:
            data = _load_samples()
            licenses = _load_licenses()
            fonts = data.get("fonts") or []
            query = parse_qs(parsed.query)
            holder = (query.get("holder") or [""])[0]
            uscc = (query.get("uscc") or [""])[0]
            usage = [u for u in (query.get("usage") or [""])[0].split(",") if u]
            norm = m.group(1)
            if not norm:
                rows = []
                for font in fonts:
                    cert = _build_attestation(font, licenses, holder=None)
                    if not cert:
                        continue
                    rows.append(
                        {
                            "norm": cert["norm"],
                            "catalogName": cert["catalogName"],
                            "originalName": cert["originalName"],
                            "serial": cert["serial"],
                            "spdx": cert["license"]["spdx"],
                            "platformOffersSource": cert["conclusions"]["platformOffersSource"],
                            "redistributeFiles": cert["conclusions"]["redistributeFiles"],
                            "href": "/attest/%s/" % cert["norm"],
                        }
                    )
                self._send_json(
                    {
                        "issuer": ISSUER,
                        "naming": "文风·{原名}",
                        "policy": "standard-oss-only",
                        "count": len(rows),
                        "certs": rows,
                    }
                )
                return True
            hit = next((f for f in fonts if str(f.get("norm") or "").lower() == str(norm).lower()), None)
            if not hit:
                self._send_json({"error": "not_found", "norm": str(norm).lower()}, 404)
                return True
            cert = _build_attestation(hit, licenses, holder=holder, usage=usage, uscc=uscc)
            if not cert:
                self._send_json(
                    {
                        "error": "not_attestable",
                        "norm": norm,
                        "reason": _attest_block_reason(hit),
                    },
                    409,
                )
                return True
            _record_ledger(cert)
            self._send_json(cert)
            return True
        return False

    def do_POST(self):
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path not in ("/api/v1/certs/verify", "/api/v1/certs/verify/"):
            self.send_error(404)
            return
        try:
            length = int(self.headers.get("Content-Length") or "0")
        except ValueError:
            length = 0
        if length > 200000:
            self._send_json({"valid": False, "error": "too_large"}, 413)
            return
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send_json({"valid": False, "error": "invalid_json"}, 400)
            return
        ok, reason = _verify_payload(payload)
        self._send_json(
            {
                "valid": ok,
                "reason": reason,
                "serial": payload.get("serial") if isinstance(payload, dict) else None,
                "catalogName": payload.get("catalogName") if isinstance(payload, dict) else None,
                "issuer": ISSUER if ok else None,
            },
            200 if ok else 400,
        )

    def do_GET(self):
        if self._maybe_special():
            return
        return super().do_GET()

    def do_HEAD(self):
        if self._maybe_special():
            return
        return super().do_HEAD()

    def translate_path(self, path: str) -> str:
        path = path.split("?", 1)[0].split("#", 1)[0]
        rel = unquote(path)
        if not rel.startswith("/"):
            rel = "/" + rel
        mapped = rel
        if rel in ("/", "/index.html"):
            mapped = "/index.html"
        elif rel in ("/lab", "/lab/", "/lab.html"):
            mapped = "/lab.html"
        elif SITE.match(rel):
            mapped = "/index.html"
        else:
            m = VARIANT.match(rel)
            if m:
                mapped = "/%s.html" % m.group(1)
            else:
                # SPA 回退：无扩展名的未知路径交给前端路由渲染「没有这一页」；
                # 带扩展名的仍按静态资源 404，坏资源在控制台可见。
                last = rel.rstrip("/").rsplit("/", 1)[-1]
                if "." not in last:
                    mapped = "/index.html"
        mapped = posixpath.normpath(mapped)
        words = [w for w in mapped.split("/") if w and w not in (os.curdir, os.pardir)]
        out = ROOT
        for w in words:
            out = os.path.join(out, w)
        return out

    def end_headers(self):
        if self.path.split("?", 1)[0].endswith((".html", ".js", ".css", ".json", "/")):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=16030)
    ap.add_argument("--bind", default="127.0.0.1")
    args = ap.parse_args()
    httpd = ThreadingHTTPServer((args.bind, args.port), Handler)
    print("preview %s:%s root=%s" % (args.bind, args.port, ROOT), flush=True)
    httpd.serve_forever()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
