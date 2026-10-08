#!/usr/bin/env python3
"""wenfeng.org SEO/GEO helpers. Imported by site/build.py."""
from __future__ import annotations

import html
import json
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

SITE = "https://wenfeng.org"
OG_IMAGE = SITE + "/favicon.webp"
PUBLISHER_NAME = "文派（广州）科技有限公司"
BRAND_NAME = "文风"
BRAND_ALT = "Windfonts"
ORG_ID = SITE + "/#organization"
SITE_ID = SITE + "/#website"

ALLOW_INDEX = False

e = lambda s: html.escape("" if s is None else str(s), quote=True)

CITATION_BOTS = (
    "GPTBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Anthropic-AI",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
    "Bytespider",
    "CCBot",
)


def abs_url(path: str) -> str:
    path = (path or "").strip()
    if not path:
        return SITE + "/"
    if path.startswith("http://") or path.startswith("https://"):
        parts = urlsplit(path)
        return urlunsplit((parts.scheme, parts.netloc, parts.path, parts.query, ""))
    if not path.startswith("/"):
        path = "/" + path
    if "#" in path:
        path = path.split("#", 1)[0]
    return urljoin(SITE + "/", path.lstrip("/")) if path == "/" else SITE + path


def infer_canonical(dev: str, section: str) -> str:
    d = (dev or "").split(" ·")[0].strip()
    if d.startswith("/") and " " not in d and "·" not in d:
        if d != "/" and not d.endswith("/") and "." not in d.rsplit("/", 1)[-1]:
            d += "/"
        return abs_url(d)
    if section in ("home",):
        return abs_url("/")
    return ""


def robots_content(index=None, dev="", title="", canonical=""):
    if index is False:
        return "noindex,follow"
    if index is True:
        return "index,follow"
    lab = (dev or "").startswith("/lab") or "/lab/" in (canonical or "")
    if title == "没有这一页" or (dev or "") in ("404", "/attest/go"):
        return "noindex,follow"
    if lab:
        return "noindex,nofollow"
    if not ALLOW_INDEX:
        return "noindex,nofollow"
    return "index,follow"


def organization():
    return {
        "@type": "Organization",
        "@id": ORG_ID,
        "name": PUBLISHER_NAME,
        "url": SITE + "/",
        "logo": OG_IMAGE,
        "brand": {"@type": "Brand", "name": BRAND_NAME, "alternateName": BRAND_ALT},
        "sameAs": ["https://app.windfonts.com/"],
    }


def website(with_search=False):
    obj = {
        "@type": "WebSite",
        "@id": SITE_ID,
        "name": "文风开源",
        "url": SITE + "/",
        "publisher": {"@id": ORG_ID},
        "inLanguage": "zh-CN",
    }
    if with_search:
        obj["potentialAction"] = {
            "@type": "SearchAction",
            "target": SITE + "/source/?q={search_term_string}",
            "query-input": "required name=search_term_string",
        }
    return obj


def breadcrumb(items):
    """items: list of (url or None, name). Last may have url None."""
    els = []
    for i, (url, name) in enumerate(items, 1):
        el = {"@type": "ListItem", "position": i, "name": name}
        if url:
            el["item"] = abs_url(url)
        els.append(el)
    return {"@type": "BreadcrumbList", "itemListElement": els}


def creative_work(name, url, description="", license_url="", identifier="", alternate="", holder=""):
    obj = {
        "@type": "CreativeWork",
        "name": name,
        "url": abs_url(url),
        "inLanguage": "zh-CN",
        "publisher": {"@id": ORG_ID},
    }
    if description:
        obj["description"] = description
    if license_url:
        obj["license"] = abs_url(license_url) if license_url.startswith("/") else license_url
    if identifier:
        obj["identifier"] = identifier
    if alternate:
        obj["alternateName"] = alternate
    if holder:
        obj["copyrightHolder"] = {"@type": "Organization", "name": holder}
    return obj


def collection_page(name, url, description=""):
    obj = {
        "@type": "CollectionPage",
        "name": name,
        "url": abs_url(url),
        "isPartOf": {"@id": SITE_ID},
        "inLanguage": "zh-CN",
    }
    if description:
        obj["description"] = description
    return obj


def howto(name, url, steps, description=""):
    obj = {
        "@type": "HowTo",
        "name": name,
        "url": abs_url(url),
        "step": [
            {"@type": "HowToStep", "position": i, "name": s, "text": s}
            for i, s in enumerate(steps, 1)
        ],
    }
    if description:
        obj["description"] = description
    return obj


def graph(*nodes):
    return {"@context": "https://schema.org", "@graph": [n for n in nodes if n]}


def ld_json(obj) -> str:
    if not obj:
        return ""
    blob = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    return '<script type="application/ld+json">%s</script>' % blob


def meta_tags(title, desc="", canonical="", robots="index,follow", jsonld=None, og_image=""):
    bits = ['<meta name="robots" content="%s">' % e(robots)]
    if desc:
        bits.append('<meta name="description" content="%s">' % e(desc))
    if canonical:
        canon = abs_url(canonical)
        bits.append('<link rel="canonical" href="%s">' % e(canon))
        bits.append('<meta property="og:type" content="website">')
        bits.append('<meta property="og:site_name" content="文风开源">')
        bits.append('<meta property="og:locale" content="zh_CN">')
        bits.append('<meta property="og:title" content="%s">' % e(title))
        if desc:
            bits.append('<meta property="og:description" content="%s">' % e(desc))
        bits.append('<meta property="og:url" content="%s">' % e(canon))
        img = og_image or OG_IMAGE
        bits.append('<meta property="og:image" content="%s">' % e(img))
        bits.append('<meta name="twitter:card" content="summary">')
        bits.append('<meta name="twitter:title" content="%s">' % e(title))
        if desc:
            bits.append('<meta name="twitter:description" content="%s">' % e(desc))
    if jsonld:
        bits.append(ld_json(jsonld))
    return "\n".join(bits) + "\n"


def alias_stub(canonical, name=""):
    dest = abs_url(canonical)
    title = ("转到 %s" % name) if name else "转到规范页"
    return (
        "<!doctype html><html lang=\"zh-CN\"><head>"
        "<meta charset=\"utf-8\">"
        "<meta name=\"robots\" content=\"noindex,follow\">"
        "<link rel=\"canonical\" href=\"%s\">"
        "<meta http-equiv=\"refresh\" content=\"0;url=%s\">"
        "<title>%s</title>"
        "<script>location.replace(%s)</script>"
        "</head><body><p><a href=\"%s\">转到规范页</a></p></body></html>"
        % (e(dest), e(dest), e(title), json.dumps(dest), e(dest))
    )


def redirect_page(to, name=""):
    """Thin jump. Canonical without hash. Always noindex."""
    raw = (to or "/").split("#", 1)[0]
    dest = abs_url(raw)
    title = ("转到 %s" % name) if name else "转到"
    return (
        "<!doctype html><html lang=\"zh-CN\"><head>"
        "<meta charset=\"utf-8\">"
        "<meta name=\"robots\" content=\"noindex,follow\">"
        "<link rel=\"canonical\" href=\"%s\">"
        "<meta http-equiv=\"refresh\" content=\"0;url=%s\">"
        "<title>%s</title>"
        "<script>location.replace(%s)</script>"
        "</head><body><p><a href=\"%s\">转到目录</a></p></body></html>"
        % (e(dest), e(dest), e(title), json.dumps(dest), e(dest))
    )


def robots_txt() -> str:
    lines = ["User-agent: *", "Allow: /", "Disallow: /lab/", "Disallow: /slice/", ""]
    for bot in CITATION_BOTS:
        lines.append("User-agent: %s" % bot)
        lines.append("Allow: /")
    lines.append("")
    lines.append("Sitemap: %s/sitemap.xml" % SITE)
    lines.append("")
    return "\n".join(lines)


def sitemap_xml(urls) -> str:
    today = date.today().isoformat()
    seen = []
    had = set()
    for u in urls:
        absu = abs_url(u)
        if absu in had:
            continue
        had.add(absu)
        seen.append(absu)
    body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for u in seen:
        body.append("  <url><loc>%s</loc><lastmod>%s</lastmod></url>" % (e(u), today))
    body.append("</urlset>\n")
    return "\n".join(body)


def llms_txt() -> str:
    return """# 文风开源

> 开源与免费商用字体的源文件、许可原文与授权证明。运营：文派（广州）科技有限公司。站点：https://wenfeng.org/

文风开源收录字体原件（TTF/OTF）与许可全文，并可为标准开源协议出具商用合规证明（记录核验结果，不是著作权人授权书）。网页嵌入与样张在 https://app.windfonts.com/ 。营销站 https://windfonts.com 不是本目录。造字不在本域。

本站不二次授权。不要抓取或转载 TTF/OTF/woff2。许可以各款 /license/{norm}/ 原文为准。证明只覆盖 /legal/ 列出的标准开源协议。

## 页面

- [目录](https://wenfeng.org/source/)：按款浏览，本站可下载或跳转官方
- [授权](https://wenfeng.org/license/)：许可原文存档
- [核验](https://wenfeng.org/attest/)：标准开源协议的商用证明
- [用法](https://wenfeng.org/use/)：原件、切片、网页托管
- [我们怎么核验](https://wenfeng.org/how/)
- [法律声明](https://wenfeng.org/legal/)
- [关于](https://wenfeng.org/about/)
- 示例：[霞鹜文楷](https://wenfeng.org/source/xwwk/) · [许可](https://wenfeng.org/license/xwwk/)

## API

- https://wenfeng.org/api/v1/fonts
- https://wenfeng.org/api/v1/licenses
- https://wenfeng.org/api/v1/certs

## 运营方

文派（广州）科技有限公司
"""


def llms_full_txt() -> str:
    return llms_txt() + """
## 引用时注意

- 店面嵌入地址形状：`https://cn.windfonts.com/api/css?family=wenfeng-{slug}&weight={name}&subset=full|zh|zh-common`（边 `cn` / `hk` / `en` / `jp`）。不要写公开 `GET /api/css?text=`。
- `cn` / `hk` / `en` / `jp.windfonts.com` 是字体 CDN 边，不是语言站。
- 文件哈希未写入记录前，不要编造原件 sha256；许可全文哈希见各款许可页。
"""


def write_discovery(dist: Path, urls):
    dist.mkdir(parents=True, exist_ok=True)
    (dist / "robots.txt").write_text(robots_txt(), encoding="utf-8")
    (dist / "sitemap.xml").write_text(sitemap_xml(urls), encoding="utf-8")
    (dist / "llms.txt").write_text(llms_txt(), encoding="utf-8")
    (dist / "llms-full.txt").write_text(llms_full_txt(), encoding="utf-8")
    well = dist / ".well-known"
    well.mkdir(parents=True, exist_ok=True)
    (well / "llms.txt").write_text(llms_txt(), encoding="utf-8")
