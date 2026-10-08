#!/usr/bin/env python3
"""wenfeng.org v2 静态站生成器。

  python3 site/build.py                 # 产出 site/dist/
  python3 site/serve.py --port 16031    # 预览（静态 + 原型 API）

视觉沿用已定稿的丁（home-v4）/乙′（source-v2b）/甲′（font-v1b）/戊′（license-v5b），
令牌是 fonts-front 的 tokens.css 原件。所有页面只用 site.css 里那一套共用件。
数据只读：../samples.json、../data/font/*.json、../data/licenses.json、../data/license-text/*.json。
"""

import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
from collections import OrderedDict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DIST = HERE / "dist"
sys.path.insert(0, str(ROOT))

COMMENT = ('<!-- 本页嵌入的字体由文风字体（Windfonts）提供，可自由使用；'
           '请保留本授权标注 https://wenfeng.org/license -->')
PROOF = "行到水穷处，坐看云起时"

ATTEST_SPDX = {"OFL-1.1", "MIT", "Apache-2.0", "IPA-1.0", "IPA", "CC0-1.0", "CC-BY-4.0",
               "CC-BY-SA-4.0", "GPL-2.0-with-font-exception",
               "GPL-2.0-or-later WITH Font-exception OR OFL-1.1", "MPlus-Bitmap-License"}

# 状态词：定稿词表（COPY-AUDIT 第三/四轮 + /how 甲′），说明取首页丁「目录状态」原句。
STATUS = OrderedDict([
    ("source", ("本站下载", "源文件在本站，进条目直接下载")),
    ("jump", ("官方下载", "原件请到作者或厂商的发布处；切片包在本页领取。")),
    ("ready", ("暂无下载", "许可已核实，源文件包还没上架")),
    ("pending", ("待核实", "许可原文还没有核对记录")),
    ("missing", ("未收录", "还没收进目录。许可已核对的，原文可直接查阅；想让它上架，报缺收录。")),
])
CHIP_ICO = {
    "all": "list",
    "source": "download",
    "jump": "external",
    "ready": "time",
    "pending": "question",
    "missing": "plus",
}
VERB_ICO = {
    "下载": "download",
    "获取字型": "external",
    "报缺收录": "plus",
    "读许可": "book",
    "读许可原文": "book",
    "授权证明": "certificate",
    "出授权证明": "certificate",
    "去厂商原文": "external",
    "打开 PDF": "download",
    "切片工具": "scissors",
}

NAV = [("/source/", "目录", ("source", "foundry")), ("/license/", "授权", ("license",)),
       ("/attest/", "核验", ("attest", "v", "attests")), ("/use/", "用法", ("use", "how")),
       ("/about/", "关于", ("about", "legal", "gap"))]
# D-05：lab 与活页现稿同这一套，给人对比。
NAV_LAB = NAV
FOOT_REST = [
    ("/source/", "存档目录", "源文件索引", ""),
    ("/v/", "如何查询", "证书编号", ""),
    ("/legal/", "法律声明", "操作说明", ""),
    ("https://icons.motucloud.com/", "字体图标", "墨图爱可", ""),
    ("https://app.windfonts.com/", "网页字体", "样张与选字", ""),
    ("/api/v1/certs", "证明 API", "GET certs", "for-dev"),
    ("/api/v1/fonts", "目录 API", "GET fonts", "for-dev"),
]

e = lambda s: html.escape("" if s is None else str(s), quote=True)
SPRITE = re.sub(r"<\?xml[^>]*>\s*", "", (ROOT / "assets/icons.svg").read_text("utf-8"))
# HTML stays on wenfeng.org (CF). Chrome CSS/JS/woff2/images go to already-filed
# cn.windfonts.com (oss://wenfeng-fonts Guangzhou). Empty origin = same-host preview.
# License PDFs stay on the HTML origin. Do not put org HTML in wenfeng-web-hz.
ASSET_ORIGIN = os.environ.get("WF_ASSET_ORIGIN", "https://cn.windfonts.com").rstrip("/")
import seo  # site/seo.py; sys.path[0] is this directory when run as site/build.py


def asset(path):
    """Prefix UI chrome. /assets/licenses/ stays on the page origin."""
    if not path.startswith("/"):
        path = "/" + path
    if path.startswith("/assets/licenses/") or not ASSET_ORIGIN:
        return path
    return ASSET_ORIGIN + path

# cn.windfonts.com 有 web 包的字体名单（api/css 探测产物 data/webfonts.json；包上架后重跑探测刷新）
try:
    _wf_doc = json.loads((ROOT / "data/webfonts.json").read_text("utf-8"))
    _wf_map = _wf_doc.get("fonts") or {}
    WEBFONT_SUBSET = {k.lower(): v for k, v in _wf_map.items()}
    # Preferred pack path is lowercase; CANON = historical mixed-case for JS fallback until OSS delete.
    WEBFONT_CANON = {k.lower(): k for k in _wf_map}
    for k, v in (_wf_doc.get("canon") or {}).items():
        WEBFONT_CANON[str(k).lower()] = v
    WEBFONTS = set(WEBFONT_SUBSET)
except Exception:
    WEBFONT_SUBSET = {}
    WEBFONT_CANON = {}
    WEBFONTS = set()
# 2026-10-04 对 cn.windfonts.com 的索引探测。只有 200 的才写进来。键按文件名原样。
try:
    OSS_PACKS = json.loads((ROOT / "data/oss-packs.json").read_text("utf-8")).get("fonts") or {}
except Exception:
    OSS_PACKS = {}
OSS_PACKS_LOWER = {str(k).lower(): v for k, v in OSS_PACKS.items()}
# 2026-10-07 短码：新 norm → 旧 CamelCase 小写（font-licenses 目录仍是旧名）
try:
    _NORM_OLD = {
        str(m.get("new") or "").lower(): str(m.get("old") or "").lower()
        for m in (json.loads((ROOT / "data/norm-history.json").read_text("utf-8")).get("maps") or [])
        if m.get("new") and m.get("old") and str(m["new"]).lower() != str(m["old"]).lower()
    }
except Exception:
    _NORM_OLD = {}


# ---------- 数据 ----------

def load():
    data = json.loads((ROOT / "samples.json").read_text("utf-8"))
    licenses = json.loads((ROOT / "data/licenses.json").read_text("utf-8"))
    fonts = []
    for slim in data["fonts"]:
        p = ROOT / "data/font" / (slim["norm"] + ".json")
        full = json.loads(p.read_text("utf-8")) if p.exists() else {}
        f = dict(slim)
        f.update(full)
        f["license"] = dict(slim.get("license") or {}, **(full.get("license") or {}))
        fonts.append(f)
    try:
        order = json.loads(subprocess.check_output([
            "node", "-e",
            "const fs=require('fs');"
            "const d=JSON.parse(fs.readFileSync('" + str(ROOT / "samples.json") + "','utf8'));"
            "const c=new Intl.Collator('zh-Hans-CN');"
            "d.fonts.sort((a,b)=>c.compare(a.name||'',b.name||'')||c.compare(a.norm||'',b.norm||''));"
            "console.log(JSON.stringify(d.fonts.map(f=>f.norm)));"
        ]))
        order_map = {norm: i for i, norm in enumerate(order)}
        fonts.sort(key=lambda f: order_map.get(f["norm"], 99999))
    except Exception:
        fonts.sort(key=lambda f: (f.get("name") or "").encode("gbk", "ignore"))
    # 对外一律小写：显示、链接、属性、路由全走小写 norm（文件名查找走 _text_path）
    for f in fonts:
        f["norm"] = str(f.get("norm") or "").lower()
        shop = f.get("shop") or ""
        if "/fonts/" in shop:
            f["shop"] = re.sub(
                r"(/fonts/)([^/?#]+)",
                lambda m: m.group(1) + m.group(2).lower(),
                shop,
                count=1,
            )
    licenses = {str(k).lower(): v for k, v in licenses.items()}
    return data, fonts, licenses


_TEXT_MAP = None


def _text_path(norm):
    global _TEXT_MAP
    if _TEXT_MAP is None:
        d = ROOT / "data/license-text"
        _TEXT_MAP = {p.stem.lower(): p for p in d.glob("*.json")} if d.is_dir() else {}
    return _TEXT_MAP.get(str(norm).lower())


def status(f):
    o = f.get("offer") or "jump"
    if o == "pending":
        return "ready" if lic(f).get("textState") == "full" else "pending"
    return o if o in STATUS else "jump"


def lic(f):
    return f.get("license") or {}


def spdx_of(f):
    if lic(f).get("spdx"):
        return lic(f)["spdx"]
    try:
        import preview
        return preview._spdx(f.get("licenseName")) or ""
    except Exception:
        return ""


def can_attest(f):
    return lic(f).get("textState") == "full" and spdx_of(f) in ATTEST_SPDX


def files(f, kind):
    return [x for x in f.get("files") or [] if x.get("kind") == kind]


def upstream(f):
    up = files(f, "upstream")
    return (up[0]["href"] if up else None) or (f.get("mirror") or {}).get("upstream") or lic(f).get("sourceUrl")


def is_gated(f):
    return f.get("distribution") is False


def wf(f):
    # 「文风·」前缀只在证书证面（preview._catalog_name）；页面显示一律原名
    return f.get("name") or ""


def short_url(u):
    return re.sub(r"^https?://(www\.)?(github\.com/)?", "", u or "").rstrip("/")


def plan(f):
    """一款字的主句：(kicker 大字, 一句话, 主按钮(文案, href), 次链接[])。归档 staged 不做下载。"""
    st = status(f)
    arch = [x for x in files(f, "archive") if x.get("href") and not x.get("staged")]
    up = upstream(f)
    sec = [("读许可原文", "/license/%s/" % f["norm"])]
    if can_attest(f):
        sec.append(("授权证明", "/attest/%s/" % f["norm"]))
    if is_gated(f):
        sec.append(("领取切片包", "/source/%s/#slice" % f["norm"]))
    if st == "source" and arch:
        return "下载", "开源许可已核对原文，原件在本站。", ("下载原件", arch[0]["href"]), sec
    if st == "source" and up:
        return "去官方仓库", "归档包稍后提供，现在到官方仓库取原件。", ("去官方仓库", up), sec
    if st == "source":
        return "等上架", "许可允许再分发，源文件包还没上架。", None, sec
    if st == "jump":
        say = "原件请到作者或厂商的发布处；切片包在本页领取。"
        if is_gated(f):
            say = "免费商用但不允许再分发字体文件。从官方取得原包后，可核验领取切片包。"
        return "去官方", say, ("去官方下载", up or f.get("shop")), sec
    if st == "ready":
        return "等上架", "许可已核实，源文件包还没上架。", (("去官方仓库", up) if up else None), sec
    if st == "pending":
        return "待核实", "许可原文还没有核对记录，核对完成前不提供文件。", None, \
            [("报勘误", "/gap/?kind=errata&norm=" + f["norm"])] + sec
    return "去官方仓库", "镜像还没收到这款。", (("去官方仓库", up) if up else ("去在线选字", f.get("shop"))), sec


def rights(f):
    """许可三结论（戊′ 示范命中）：返回 (大字行, 一句话, 档名)。"""
    st, ts = status(f), lic(f).get("textState")
    if ts == "full" and spdx_of(f) in ATTEST_SPDX:
        return ["可商用", "可改", "可分发"], "开源许可已核对原文。", "open"
    if is_gated(f) or ts == "pointer":
        return ["仅查询", "不可下载"], "厂商自拟协议，以厂商原文为准；常见条款是免费商用、不允许再分发。", "vendor"
    return ["待核实"], "许可原文还没有核对记录，结论暂不给出。", "pending"


# ---------- 共用件 ----------

def icon(name):
    return '<svg class="icon" aria-hidden="true"><use href="#i-%s"></use></svg>' % name


def empty_html(inner, hidden=False, ico="search"):
    hid = " data-empty hidden" if hidden else ""
    return '<p class="empty"%s>%s<span>%s</span></p>' % (hid, icon(ico), inner)


def link(label, href, cls="btn-text", ico=None):
    if not href:
        return ""
    ext = str(href).startswith("http")
    return '<a class="btn %s" href="%s"%s>%s%s</a>' % (
        cls, e(href), ' target="_blank" rel="noopener"' if ext else "", icon(ico) if ico else "", e(label))


def ink(label, href, ico=None):
    return link(label, href, "btn-ink", ico)


def soft_btn(label, href, ico=None):
    """次级钮：有按钮形，不抢墨。"""
    if not href:
        return ""
    ext = str(href).startswith("http")
    return '<a class="btn" href="%s"%s>%s%s</a>' % (
        e(href), ' target="_blank" rel="noopener"' if ext else "",
        icon(ico) if ico else "", e(label),
    )


def crumb(*items, dev=""):
    parts = ['<a href="/">wenfeng.org</a>'] + [
        ('<a href="%s">%s</a>' % (e(h), e(t)) if h else e(t)) for h, t in items]
    return '<p class="crumb">%s%s</p>' % ('<span class="sep">/</span>'.join(parts),
                                          '<span class="for-dev"> · %s</span>' % e(dev) if dev else "")


def display(title, lead, crumbs=(), kicker="", mid=False):
    return ('%s<div class="display%s"><div>%s<h1>%s</h1></div><p class="lead">%s</p></div>'
            % (crumb(*crumbs) if crumbs else "", " is-mid" if mid else "",
               '<p class="label">%s</p>' % e(kicker) if kicker else "", e(title), lead))



def font_dossier_html(f, up_cell, text_cell, arch_cell, mirror_state):
    """侧栏「这一款」：编号作档案号，字段上标签下值。"""
    rows = [
        ("许可原文", e(text_cell["d"])),
        ("归档", e(arch_cell["d"])),
        ("镜像", e(mirror_word(mirror_state) or "—")),
        ("出处", up_cell),
    ]
    body = "".join(
        '<div><dt>%s</dt><dd>%s</dd></div>' % (e(k), v)
        for k, v in rows if v not in (None, "")
    )
    return (
        '<p class="fn-dossier-id mono">%s</p>'
        '<dl class="fn-dossier">%s</dl>'
        % (e(f["norm"]), body)
    )


def kv_rows(rows, words=False):
    return '<dl class="kv-rows%s">%s</dl>' % (" is-words" if words else "", "".join(
        '<div><dt>%s</dt><dd>%s</dd></div>' % (e(k), v) for k, v in rows if v not in (None, "")))


def aside(label, body, note=""):
    return '<aside class="aside"><p class="aside-label">%s</p>%s%s</aside>' % (
        e(label), body, '<p class="note">%s</p>' % note if note else "")


def task(i, title, desc, href=None, ico=None, inked=False):
    tag = "a" if href else "div"
    attr = ' href="%s"' % e(href) if href else ""
    if href and str(href).startswith("http"):
        attr += ' target="_blank" rel="noopener"'
    t = e(title)
    d = e(desc) if desc else desc
    return ('<%s class="task%s"%s><span class="idx">%02d</span>%s<span class="body"><span class="t-t">%s</span>'
            '<span class="t-d">%s</span></span><span class="arrow">%s</span></%s>'
            % (tag, " is-ink" if inked else "", attr, i,
               '<span class="t-ico">%s</span>' % icon(ico) if ico else "<span></span>",
               t, d, icon("arrow-right") if href else "", tag))


def tasks(items, compact=False, start=1):
    return '<div class="tasks%s">%s</div>' % (" is-compact" if compact else "", "".join(
        task(start + i, *it) for i, it in enumerate(items)))


def search(action="/source/", ph="中文名、英文名、厂商…", live=False):
    if live:
        return ('<div class="search is-bare is-live"><label class="sr-only" for="q-live">搜索字体</label>'
                '<input id="q-live" type="search" data-search placeholder="%s" aria-label="搜索字体" autocomplete="off"></div>' % e(ph))
    return ('<form class="search is-bare" action="%s" method="get" role="search">'
            '<label class="sr-only" for="q">搜索字体</label>'
            '<input id="q" name="q" type="search" placeholder="%s" aria-label="搜索字体" autocomplete="off">'
            '<button class="btn btn-ink" type="submit">%s搜索</button></form>' % (e(action), e(ph), icon("search")))



def face_attrs_of(f, weight=True, require_pack=True):
    """目录/条目用的网页包属性。pack 用小写 slug；subset 用探测结果。"""
    face = f.get("family") or ""
    norm_key = str(f.get("norm") or "").lower()
    if require_pack and norm_key not in WEBFONTS:
        face = ""
    if not face:
        return ""
    pack = norm_key
    canon = WEBFONT_CANON.get(norm_key) or ""
    subset = WEBFONT_SUBSET.get(norm_key) or ""
    weights = f.get("weights") or ["Regular"]
    wname = "Regular" if "Regular" in weights else weights[0]
    parts = [
        ' data-face-norm="%s"' % e(f["norm"]),
        ' data-face-family="%s"' % e(face),
        ' data-face-pack="%s"' % e(pack),
    ]
    if canon and canon != pack:
        parts.append(' data-face-pack-alt="%s"' % e(canon))
    if weight:
        parts.append(' data-face-weight="%s"' % e(wname))
    if subset:
        parts.append(' data-face-subset="%s"' % e(subset))
    return "".join(parts)


def status_words():
    return kv_rows([(STATUS[k][0], e(STATUS[k][1])) for k in STATUS], words=True)


def index_rows(fonts, go=None, href_of=None, rel_of=None, list_attrs=""):
    def row(f):
        st = status(f)
        hay = " ".join(filter(None, [f.get("name"), f.get("en"), f.get("norm"), f.get("foundry"),
                                     f.get("licenseName")] + (f.get("aliases") or []))).lower()
        rel = rel_of(f) if rel_of else STATUS[st][0]
        info_d = " · ".join(filter(None, [spdx_of(f) or f.get("licenseName") or "许可空",
                                          f.get("foundry") or "未标注"]))
        info_v = "%s · offer=%s · textState=%s" % (e(f["norm"]), e(f.get("offer") or "jump"), e(lic(f).get("textState") or "—"))
        if go:
            got = go(f)
            if isinstance(got, tuple):
                verb, inked = got[0], bool(got[1]) if len(got) > 1 else False
            else:
                verb, inked = got, (got == "读原文")
            href = "/source/%s/" % e(f["norm"])
        else:
            if st == "source":
                verb, inked, href = "下载", True, "/source/%s/" % e(f["norm"])
            elif st == "jump":
                verb, inked, href = "获取字型", False, "/source/%s/" % e(f["norm"])
            elif st == "missing":
                verb, inked, href = "报缺收录", False, "/gap/?norm=%s" % e(f["norm"])
            else:
                verb, inked, href = "查看字型", False, "/source/%s/" % e(f["norm"])
        if href_of:
            href = href_of(f)
        attrs = face_attrs_of(f)
        face = bool(attrs)
        cls = "lrow t-%s" % e(f["norm"]) if face else "lrow"
        return ('<li data-st="%s" data-hay="%s" data-letter="%s"><a class="%s" href="%s"%s>'
                '<span class="lnm">%s</span>'
                '<span class="lrel">%s</span>'
                '<span class="lmeta for-design">%s</span><span class="lmeta for-dev mono">%s</span>'
                '<span class="lgo%s">%s</span></a></li>'
                % (st, e(hay), e(letter_of(f)), cls, href, attrs, e(wf(f)), e(rel), e(info_d), info_v,
                   " is-ink" if inked else "", e(verb)))
    return ('<ul class="lin-list" data-list%s>%s</ul>%s<nav class="pager" data-pager hidden></nav>'
            % ((" " + list_attrs if list_attrs else ""), "".join(row(f) for f in fonts),
               empty_html('没有匹配的字体。换个名字，或<a href="/gap/?kind=catalog">报缺收录</a>。', hidden=True)))


def letter_of(f):
    ch = (wf(f) or "?")[:1]
    if "\u4e00" <= ch <= "\u9fff":
        return ch
    if ch.isascii() and ch.isalpha():
        return ch.upper()
    return "#"


def lab_rows(fonts, page_size="12"):
    items = []
    for f in fonts:
        st = status(f)
        hay = " ".join(filter(None, [f.get("name"), f.get("en"), f.get("norm"), f.get("foundry"),
                                     f.get("licenseName")] + (f.get("aliases") or []))).lower()
        if st == "source":
            verb, href = "下载", "/source/%s/" % e(f["norm"])
        elif st == "jump":
            verb, href = "获取字型", "/source/%s/" % e(f["norm"])
        elif st == "missing":
            verb, href = "报缺收录", "/gap/?norm=%s" % e(f["norm"])
        else:
            verb, href = "查看字型", "/source/%s/" % e(f["norm"])
        face = f.get("family") or ""
        cls = "ls-name t-%s" % e(f["norm"]) if face else "ls-name"
        attrs = ' data-face-norm="%s" data-face-family="%s"' % (e(f["norm"]), e(face)) if face else ""
        items.append(
            '<li data-st="%s" data-hay="%s" data-letter="%s"><a class="%s" href="%s"%s>'
            '<span class="nm">%s</span><span class="go">%s</span></a></li>'
            % (st, e(hay), e(letter_of(f)), cls, href, attrs, e(wf(f)), e(verb))
        )
    return (
        '<ul class="ls-names" data-list data-page-size="%s">%s</ul>%s'
        '<nav class="pager" data-pager hidden></nav>'
        % (e(page_size), "".join(items),
           empty_html('没有匹配的字体。换个名字，或<a href="/gap/?kind=catalog">报缺收录</a>。', hidden=True))
    )


def filter_chips(fonts, with_count=False):
    counts = OrderedDict((k, 0) for k in STATUS)
    for f in fonts:
        counts[status(f)] += 1
    all_lab = "全部 · %d" % len(fonts) if with_count else "全部"
    return '<div class="chips"><button class="chip is-on" data-filter="all">%s%s</button>%s</div>' % (
        icon(CHIP_ICO["all"]), e(all_lab),
        "".join(
            '<button class="chip" data-filter="%s">%s%s%s</button>' % (
                k, icon(CHIP_ICO.get(k, "list")), e(STATUS[k][0]), (" · %d" % n) if with_count else ""
            ) for k, n in counts.items() if n
        ),
    )


# ---------- 外壳（= 定稿 chrome / footer） ----------



def _foot_marks():
    fc = (
        '<li><a href="https://feicode.com/Windfonts" target="_blank" rel="noopener"'
        ' title="feiCode 源码（即将离开文风）" aria-label="feiCode 源码">'
        '<img src="%s" alt="" width="26" height="22">feiCode<span class="x">↗</span></a></li>'
        % asset("/assets/marks/feicode.svg")
    )
    gh = (
        '<li><a href="https://github.com/Windfonts" target="_blank" rel="noopener"'
        ' title="GitHub 镜像（即将离开文风）" aria-label="GitHub 镜像">'
        '<svg class="icon" aria-hidden="true"><use href="#i-github"></use></svg>GitHub<span class="x">↗</span></a></li>'
    )
    return '<ul class="foot-marks">%s%s</ul>' % (fc, gh)


def _foot_wm():
    return ('<a class="wordmark" href="/"><img class="wm-ico" src="%s" alt="" width="24" height="24">'
            '<span class="wm-name">文风<span class="wm-alt">开源</span></span></a>'
            % asset("/assets/icon.webp"))


def _foot_dev(dev):
    return '<span class="for-dev mono"> · %s</span>' % e(dev) if dev else ""


def _foot_bottom(dev=""):
    icp = ('<span class="icp"> · <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">'
           '粤ICP备2023091240号-3</a></span>')
    copy = ('<p>版权所有 · 文风 <span class="tm" aria-hidden="true">™</span>'
            ' · © 2026 文派（广州）科技有限公司%s%s</p>' % (icp, _foot_dev(dev)))
    links = ('<nav class="foot-bottom-links" aria-label="页脚条款">'
             '<a href="/about/">关于</a><a href="/use/">文档</a></nav>')
    return '<div class="site-foot-bottom">%s%s</div>' % (copy, links)


def _foot_rest_nav():
    rest = "".join(
        '<a href="%s"%s%s><span class="t">%s</span><span class="d">%s</span></a>' % (
            h,
            (' class="%s"' % c) if c else (' class="is-ext"' if h.startswith("http") else ""),
            (' target="_blank" rel="noopener" title="%s（即将离开文风）"' % e(t)) if h.startswith("http") else "",
            e(t),
            _how_dual(g, h.rstrip("/")) if not c else e(g),
        )
        for h, t, g, c in FOOT_REST
    )
    return '<nav class="foot-rest" aria-label="页脚">%s</nav>' % rest


def _foot_brand(kind="stack"):
    tag = '<p class="foot-tagline">文派文风，开源字体，持续更新、许可清晰。</p>'
    if kind == "row":
        return (
            '<div class="site-foot-brand is-row">%s'
            '<div class="foot-brand-copy">%s%s</div></div>'
            % (_foot_wm(), tag, _foot_marks())
        )
    if kind == "line":
        return (
            '<div class="site-foot-brand is-line">'
            '<div class="foot-brand-head">%s%s</div>%s</div>'
            % (_foot_wm(), tag, _foot_marks())
        )
    return '<div class="site-foot-brand">%s%s%s</div>' % (_foot_wm(), tag, _foot_marks())


def foot_lab(kind, dev=""):
    """甲余项行（活页）/ 乙收束 / 丙办事横条。上下块都进 .container，底沿不拉满屏。"""
    bottom = _foot_bottom(dev)
    if kind == "a":
        inner = (
            '<div class="site-foot-inner">%s%s</div>'
            % (_foot_brand("line"), _foot_rest_nav())
        )
        cls = "site-foot is-foot-a"
    elif kind == "b":
        inner = (
            '<div class="site-foot-inner">'
            '<div class="site-foot-brand">%s'
            '<p class="foot-tagline">文派文风，开源字体，持续更新、许可清晰。</p></div></div>' % _foot_wm()
        )
        cls = "site-foot is-foot-b"
    else:
        jobs = "".join(
            '<a href="%s"><span class="idx">%s</span>%s</a>' % (h, i, t)
            for i, h, t in (
                ("01", "/license/", "授权查询"),
                ("02", "/source/", "字体下载"),
                ("03", "/attest/", "获取证书"),
                ("04", "/gap/", "缺字勘误"),
                ("05", "/slice/", "切片"),
            )
        )
        inner = '<nav class="foot-jobs" aria-label="办事">%s</nav>' % jobs
        cls = "site-foot is-foot-c"
    return '<footer class="%s"><div class="container">%s%s</div></footer>' % (cls, inner, bottom)


def foot_site(dev=""):
    """活页页脚：甲。"""
    return foot_lab("a", dev)


def pages_css(*names):
    # 带 mtime 防预览缓存旧样式
    bits = []
    for n in names:
        p = HERE / "assets" / "pages" / ("%s.css" % n)
        v = int(p.stat().st_mtime) if p.is_file() else 0
        bits.append('<link rel="stylesheet" href="%s?v=%d">' % (asset("/assets/pages/%s.css" % n), v))
    return "\n".join(bits)


def pages_js(*names):
    bits = []
    for n in names:
        p = HERE / "assets" / "pages" / ("%s.js" % n)
        v = int(p.stat().st_mtime) if p.is_file() else 0
        bits.append('<script src="%s?v=%d" defer></script>' % (asset("/assets/pages/%s.js" % n), v))
    return "\n".join(bits)


def page_head(title, lead, crumbs=(), kicker="", dev="", face_attrs="", sub=""):
    cr = crumb(*crumbs, dev=dev) if crumbs or dev else ""
    kick = ('<p class="ph-kicker">%s</p>' % e(kicker)) if kicker else ""
    cls = "xxzt"
    attrs = face_attrs or ""
    if attrs:
        cls = "is-face"
        m = re.search(r'data-face-norm="([^"]+)"', attrs)
        if m:
            cls += " t-" + m.group(1)
        attrs = re.sub(r'\s*class="[^"]*"', "", attrs)
    h1 = '<h1 class="%s"%s>%s</h1>' % (cls, attrs, title if (isinstance(title, str) and "<" in title) else e(title))
    sub_h = ('<p class="ph-sub mono">%s</p>' % e(sub)) if sub else ""
    lead_d = '<p class="ph-lead for-design">%s</p>' % lead
    lead_v = ('<p class="ph-lead for-dev mono">%s</p>' % e(dev)) if dev else ""
    return '%s<header class="page-mast">%s%s%s%s%s</header>' % (cr, kick, h1, sub_h, lead_d, lead_v)


def layout(section, title, body, dev="", extra_head="", body_class="", nav_items=None, wordmark_href="/", footer=None, desc="", jsonld=None, index=None, canonical=""):
    items = NAV if nav_items is None else nav_items
    nav = "".join('<a href="%s"%s>%s</a>' % (h, ' class="is-active"' if section in keys else "", t)
                  for h, t, keys in items)
    wm = ('<a class="wordmark" href="%s"><img class="wm-ico" src="%s" alt="" width="24" height="24">'
          '<span class="wm-name">文风<span class="wm-alt">开源</span></span></a>'
          % (e(wordmark_href), asset("/assets/icon.webp")))
    b_cls = (' class="%s"' % e(body_class)) if body_class else ""
    if footer is None:
        footer = foot_site(dev)
    full_title = ("%s · 文风开源" % title) if title else "文风开源"
    canon = canonical or seo.infer_canonical(dev, section)
    robots = seo.robots_content(index=index, dev=dev, title=title, canonical=canon)
    seo_head = seo.meta_tags(full_title, desc=desc, canonical=canon, robots=robots, jsonld=jsonld)
    return """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>%s</title>
<link rel="icon" type="image/webp" href="/favicon.webp">
<link rel="icon" href="/favicon.ico">
%s<script>try{if(localStorage.getItem('wf-theme')==='dark')document.documentElement.dataset.theme='dark';if(localStorage.getItem('wf-view')==='dev')document.documentElement.dataset.view='dev';if(localStorage.getItem('wf-scale')==='lg')document.documentElement.dataset.scale='lg'}catch(e){}</script>
<link rel="stylesheet" href="%s?v=%d"><link rel="stylesheet" href="%s?v=%d">
<link rel="stylesheet" href="%s?v=%d">
<script>window.WF_ASSET_ORIGIN=%s;</script>%s
</head><body data-page="%s"%s>
%s
<header class="topbar"><div class="container topbar-inner">%s
<nav class="topnav" aria-label="主导航">%s</nav>
<div class="topbar-end">
<div class="seg view-switch" data-view-switch role="group" aria-label="视图">
<button type="button" data-mode="design" class="is-on">设计</button>
<button type="button" data-mode="dev">开发</button></div>
<a href="https://app.windfonts.com/" target="_blank" rel="noopener" title="在线选字（样张与选字）">在线选字</a>
<button type="button" class="icon-btn" data-scale-toggle aria-pressed="false" aria-label="放大"><svg class="icon" aria-hidden="true"><use href="#i-font-size"></use></svg></button>
<button type="button" class="icon-btn" data-theme-toggle aria-label="切换深浅"><svg class="icon ico-moon" aria-hidden="true"><use href="#i-moon"></use></svg><svg class="icon ico-sun" aria-hidden="true"><use href="#i-sun"></use></svg></button>
<button type="button" class="icon-btn menu-btn" data-menu-toggle aria-expanded="false" aria-controls="topmenu" aria-label="菜单"><svg class="icon ico-menu" aria-hidden="true"><use href="#i-menu"></use></svg><svg class="icon ico-close" aria-hidden="true"><use href="#i-close"></use></svg></button></div>
<nav class="topmenu" id="topmenu" hidden aria-label="移动端菜单">
<form class="topmenu-search" action="/source/" method="get" role="search"><svg class="icon" aria-hidden="true"><use href="#i-search"></use></svg><input type="search" name="q" placeholder="搜索字体、厂商" aria-label="搜索字体" autocomplete="off"></form>
<div class="topmenu-links">%s</div>
<div class="seg view-switch" data-view-switch role="group" aria-label="视图"><button type="button" data-mode="design" class="is-on">设计</button><button type="button" data-mode="dev">开发</button></div></nav>
</div></header>
<main class="container page">%s</main>
%s
<script src="%s?v=%d" defer></script>
</body></html>""" % (
        e(full_title),
        seo_head,
        asset("/assets/tokens.css"),
        int((HERE / "assets" / "tokens.css").stat().st_mtime),
        asset("/assets/site.css"),
        int((HERE / "assets" / "site.css").stat().st_mtime),
        asset("/assets/pages/chrome.css"),
        int((HERE / "assets" / "pages" / "chrome.css").stat().st_mtime),
        json.dumps(ASSET_ORIGIN, ensure_ascii=False),
        (("\n" + extra_head) if extra_head else ""),
        section, b_cls, SPRITE, wm, nav, nav, body, footer,
        asset("/assets/site.js"),
        int((HERE / "assets" / "site.js").stat().st_mtime),
    )



def _fv(d, v, cls=""):
    p = (cls + " ") if cls else ""
    return '<span class="%sfor-design">%s</span><span class="%sfor-dev mono">%s</span>' % (p, d, p, v)


def _how_dual(design, dev):
    """人话常显；开发视图追加字段。design 可含已安全的 HTML。"""
    return '%s<span class="for-dev mono"> · %s</span>' % (design, e(dev))


def home_prime(fonts, q_id):
    """丙′ 主门 + 三侧门。活页与 /lab/home-c/ 共用。"""
    n = len(fonts)
    n_src = sum(1 for f in fonts if status(f) == "source")
    n_full = sum(1 for f in fonts if lic(f).get("textState") == "full")
    n_att = sum(1 for f in fonts if can_attest(f))
    find = (
        '<div class="lab-door is-find">'
        '<div class="lab-find-copy">'
        '<p class="lab-find-kicker">%s</p>'
        '<h1 class="lab-find-title">开源商用字体<span class="for-dev mono">/source</span></h1>'
        '<p class="for-design lab-find-live" contenteditable="true" spellcheck="false" role="textbox" aria-label="可编辑的活样张" data-placeholder="写几个字试试" data-face-family="wenfeng-xxzt"><span class="lab-rot" data-rot><span class="is-on lab-find-em">开源</span><span class="lab-find-em">免费</span><span class="lab-find-em">文派</span><span class="lab-find-em">精品</span></span>商用字体</p>'
        '<p class="d">%s</p></div>'
        '<div class="lab-find-act">'
        '<form class="search is-embed" action="/source/" method="get" role="search">'
        '<label class="sr-only" for="%s">搜索字体</label>'
        '<input id="%s" name="q" type="search" placeholder="中文名、英文名、厂商…" autocomplete="off">'
        '<button class="btn btn-ink" type="submit">%s搜索</button></form>'
        '<p class="lab-find-more">%s</p></div></div>'
        % ("wenfeng.org",
           _how_dual("自由使用，无需登录，即可下载。文风云<span class=\"reg\">®</span>另提供即用字库切片，支持自托管。", "offer · /source"),
           e(q_id), e(q_id), icon("search"),
           _how_dual('<a href="/source/">收录 %d 款</a> · <a href="/source/?st=source">本站可下载 %d 款 →</a>' % (n, n_src),
                     "offer=source · fonts[]=%d" % n))
    )
    return (
        '<div class="lab-doors is-prime">'
        '%s'
        '<a class="lab-door is-side is-q1" href="/license/"><span class="lab-side-bg" aria-hidden="true">正版</span><span class="idx">01</span>'
        '<h2 class="xxzt">%s</h2><p class="d">%s</p><span class="go">%s</span></a>'
        '<a class="lab-door is-side is-q2" href="/attest/"><span class="lab-side-bg" aria-hidden="true">免费</span><span class="idx">02</span>'
        '<h2 class="xxzt">%s</h2><p class="d">%s</p><span class="go">%s</span></a>'
        '<a class="lab-door is-side is-q3" href="/gap/"><span class="lab-side-bg" aria-hidden="true">造字</span><span class="idx">03</span>'
        '<h2 class="xxzt">%s</h2><p class="d">%s</p><span class="go">%s</span></a></div>'
        % (find,
           _how_dual("授权查询", "/license"), _how_dual("收录多款字体，开放公众查询。", "/license"),
           _how_dual("%d 份许可全文 →" % n_full, "textState=full"),
           _how_dual("获取证书", "/attest"), _how_dual("企业用字合规，在线申请证书。", "can_attest"),
           _how_dual("%d 款可出证 →" % n_att, "can_attest"),
           _how_dual("缺字勘误", "/gap"), _how_dual("开源字型库，缺、错字报告。", "POST"),
           _how_dual("即将开放 →", "POST 未接"))
    )


def page_home(data, fonts):
    """首页活页：丙′（开源商用字体主门 + 三侧门）。"""
    body = '<article class="lab-home">%s</article>' % home_prime(fonts, "q")
    extra = '<link rel="stylesheet" href="%s">' % asset("/assets/lab-home.css")
    return layout("home", "开源商用字体", body, "/", extra_head=extra, body_class="lab-home-page",
        desc='开源字体源文件目录：许可逐款核对，本站可下载，商用证明在线申领。',
        canonical="/",
        jsonld=seo.graph(seo.organization(), seo.website(with_search=True)))


def _recent(fonts, st=None, n=8):
    pool = [f for f in fonts if st is None or status(f) == st]
    pool.sort(key=lambda f: f.get("verifiedAt") or "", reverse=True)
    return pool[:n]


def _frow(f):
    st = status(f)
    if st == "source":
        verb, inked, href = "下载", True, "/source/%s/" % f["norm"]
    elif st == "jump":
        verb, inked, href = "获取字型", False, "/source/%s/" % f["norm"]
    elif st == "missing":
        verb, inked, href = "报缺收录", False, "/gap/?norm=%s" % f["norm"]
    else:
        verb, inked, href = "查看字型", False, "/source/%s/" % f["norm"]
    face = f.get("family") or ""
    cls = "frow t-%s" % e(f["norm"]) if face else "frow"
    attrs = ' data-face-norm="%s" data-face-family="%s"' % (e(f["norm"]), e(face)) if face else ""
    info_d = " · ".join(filter(None, [spdx_of(f) or f.get("licenseName") or "许可空", f.get("foundry") or "未标注"]))
    info_v = "offer=%s · textState=%s" % (e(f.get("offer") or "jump"), e(lic(f).get("textState") or "—"))
    return ('<a class="%s" href="%s"%s>'
            '<span class="fnm">%s</span>'
            '<span class="finfo">%s<span class="for-dev mono"> · %s</span></span>'
            '<span class="fst">%s</span>'
            '<span class="fgo%s">%s →</span></a>'
            % (cls, e(href), attrs, e(wf(f)), e(info_d), info_v, e(STATUS[st][0]),
               " is-ink" if inked else "", e(verb)))


def _shelf_pane(key, rows):
    inner = "".join(_frow(f) for f in rows) or empty_html("这一段暂时没有字体。")
    hidden = " hidden" if key != "source" else ""
    return '<div class="fshelf"%s data-shelf-pane="%s">%s</div>' % (hidden, e(key), inner)


def _face_fonts(fonts):
    prefer = ["xwwk", "syhtsc", "systsc", "sourcehansanscnregular", "xwwktc", "xwwkgb"]
    by_norm = {f["norm"]: f for f in fonts}
    out = []
    seen = set()
    for n in prefer:
        f = by_norm.get(n)
        if f and f.get("family") and status(f) == "source":
            out.append(f)
            seen.add(n)
    for f in _recent(fonts, "source", n=16):
        if f["norm"] in seen or not f.get("family"):
            continue
        out.append(f)
        seen.add(f["norm"])
        if len(out) >= 6:
            break
    return out


def page_lab_home(data, fonts, variant):
    """首页对照稿。甲一字 / 乙索引 / 丙′。丙′ 已接活页 /。"""
    n = len(fonts)
    gen = e((data.get("generated") or "")[:10])
    path = "/lab/home-%s/" % variant
    names = (("a", "甲"), ("b", "乙"), ("c", "丙"))
    self_name = dict(names)[variant]

    def fv(d, v, cls=""):
        p = (cls + " ") if cls else ""
        return '<span class="%sfor-design">%s</span><span class="%sfor-dev mono">%s</span>' % (p, d, p, v)

    others = "".join(
        ' · <a href="/lab/home-%s/">看%s</a>' % (k, lab)
        for k, lab in names if k != variant
    )
    flag = (
        '<p class="lab-flag">%s%s · '
        '<span class="seg" data-view-switch>'
        '<button type="button" data-mode="design">设计</button>'
        '<button type="button" data-mode="dev">开发</button></span> · 不是活页</p>'
        % (fv("稿%s%s" % (self_name, "′" if variant == "c" else ""), path), others)
    )
    if variant == "a":
        slides = []
        for i, f in enumerate(_face_fonts(fonts)):
            st = status(f)
            verb = "下载" if st == "source" else "查看字型"
            hidden = "" if i == 0 else " hidden"
            slides.append(
                '<div class="lab-face-slide"%s data-face-slide data-face-norm="%s" data-face-family="%s">'
                '<p class="lab-proof t-%s">%s</p>'
                '<div class="lab-cap">'
                '<span class="st">%s</span>'
                '<a class="btn btn-ink" href="/source/%s/">%s</a></div></div>'
                % (hidden, e(f["norm"]), e(f["family"]), e(f["norm"]), e(wf(f)),
                   fv(e(STATUS[st][0]), "offer=" + st),
                   e(f["norm"]), e(verb))
            )
        inner = (
            '<div class="lab-face" data-home-face>%s'
            '<div class="lab-cap"><button type="button" class="btn-text" data-face-next>换一款</button></div>'
            '<form class="search is-embed" action="/source/" method="get" role="search">'
            '<label class="sr-only" for="lab-q-a">搜索字体</label>'
            '<input id="lab-q-a" name="q" type="search" placeholder="中文名、英文名、厂商…" autocomplete="off">'
            '<button class="btn btn-ink" type="submit">%s搜索</button></form></div>'
            % ("".join(slides), icon("search"))
        )
    elif variant == "b":
        inner = (
            '<div class="lab-idx">'
            '<p class="lab-idx-line">%s</p>'
            '<div class="toolbar">'
            '<div class="search is-embed is-live">'
            '<label class="sr-only" for="lab-q-b">搜索字体</label>'
            '<input id="lab-q-b" type="search" data-search placeholder="中文名、英文名、厂商…" autocomplete="off">'
            '</div>%s</div>'
            '<p class="count" data-count>%s</p>%s</div>'
            % (fv("开源字体的源文件和许可原文。能下载的直接下载。", "/source"),
               filter_chips(fonts),
               fv("%d 款" % n, "fonts[]=%d" % n), index_rows(fonts))
        )
    else:
        inner = home_prime(fonts, "lab-q-c")
    body = '<article class="lab-home">%s%s</article>' % (flag, inner)
    extra = '<link rel="stylesheet" href="%s">' % asset("/assets/lab-home.css")
    return layout("home", "首页稿%s" % self_name, body, path, extra_head=extra, body_class="lab-home-page",
                  nav_items=NAV_LAB, wordmark_href=path)


def page_lab_foot(data, fonts, variant):
    """页脚对照稿。首页骨架同活页，只换脚。"""
    path = "/lab/foot-%s/" % variant
    names = (("a", "甲"), ("b", "乙"), ("c", "丙"))
    self_name = dict(names)[variant]
    others = "".join(
        ' · <a href="/lab/foot-%s/">看%s</a>' % (k, lab)
        for k, lab in names if k != variant
    )
    flag = (
        '<p class="lab-flag">%s%s · <a href="/">活页已接甲</a> · '
        '<span class="seg" data-view-switch>'
        '<button type="button" data-mode="design">设计</button>'
        '<button type="button" data-mode="dev">开发</button></span> · 不是活页</p>'
        % (_fv("页脚稿%s" % self_name, path), others)
    )
    body = '<article class="lab-home">%s%s</article>' % (flag, home_prime(fonts, "lab-fq-%s" % variant))
    extra = '<link rel="stylesheet" href="%s">' % asset("/assets/lab-home.css")
    return layout(
        "home", "页脚稿%s" % self_name, body, path, extra_head=extra,
        body_class="lab-home-page lab-foot-page", footer=foot_lab(variant, path),
    )


def page_lab_foot_left(data, fonts, variant):
    """页脚左侧对照。甲横排 / 乙同行。活页仍是直叠。"""
    path = "/lab/foot-left-%s/" % variant
    names = (("a", "甲"), ("b", "乙"))
    self_name = dict(names)[variant]
    others = "".join(
        ' · <a href="/lab/foot-left-%s/">看%s</a>' % (k, lab)
        for k, lab in names if k != variant
    )
    flag = (
        '<p class="lab-flag">左侧稿%s<span class="for-dev mono"> · %s</span>%s · '
        '<a href="/">活页直叠</a></p>'
        % (self_name, path, others)
    )
    left = "row" if variant == "a" else "line"
    inner = (
        '<div class="site-foot-inner">%s%s</div>'
        % (_foot_brand(left), _foot_rest_nav())
    )
    footer = (
        '<footer class="site-foot is-foot-a">'
        '<div class="container">%s%s</div></footer>'
        % (inner, _foot_bottom(path))
    )
    body = '<article class="lab-home">%s%s</article>' % (flag, home_prime(fonts, "lab-fl-%s" % variant))
    extra = '<link rel="stylesheet" href="%s">' % asset("/assets/lab-home.css")
    return layout(
        "home", "页脚左侧%s" % self_name, body, path, extra_head=extra,
        body_class="lab-home-page lab-foot-page", footer=footer,
    )


def page_source(fonts):
    n = len(fonts)
    body = page_head(
        "字型目录",
        "全部免费及开源商用字体。可自选下载 TTF / OTF 原件或即用字库切片包。",
        crumbs=[(None, "字型目录")],
        dev="/source · offer · fonts[]=%d" % n,
    )
    body += (
        '<div class="src-layout">'
        '<div class="src-main">'
        '<div class="src-band">%s%s<p class="count" data-count></p></div>'
        '%s</div>'
        '%s</div>'
        % (
            search(live=True),
            filter_chips(fonts, with_count=True),
            index_rows(fonts, list_attrs='data-page-size="20"'),
            aside("状态", status_words(), "五个词全站同形。侧栏不是某一款的结论。"),
        )
    )
    src_desc = '全部免费及开源商用字体。可自选下载 TTF / OTF 原件或即用字库切片包。'
    return layout("source", "字型目录", body, "/source", extra_head=pages_css("source"), body_class="page-source", desc=src_desc,
        jsonld=seo.graph(seo.collection_page("字型目录", "/source/", src_desc),
                         seo.breadcrumb([("/", "首页"), (None, "字型目录")])))


def page_lab_source(fonts, variant):
    """目录对照稿。甲五态门 / 乙字谱 / 丙一字台。活页 /source/ 不动。"""
    n = len(fonts)
    path = "/lab/source-%s/" % variant
    names = (("a", "甲"), ("b", "乙"), ("c", "丙"))
    self_name = dict(names)[variant]
    others = "".join(
        ' · <a href="/lab/source-%s/">看%s</a>' % (k, lab)
        for k, lab in names if k != variant
    )
    flag = (
        '<p class="lab-flag">稿%s<span class="for-dev mono"> · %s</span>%s · '
        '<a href="/source/">活页未改</a></p>'
        % (self_name, path, others)
    )
    counts = OrderedDict((k, 0) for k in STATUS)
    for f in fonts:
        counts[status(f)] += 1
    marks = {"source": "拿", "jump": "官", "ready": "无", "pending": "核", "missing": "缺"}

    if variant == "a":
        doors = []
        for i, k in enumerate(STATUS, 1):
            doors.append(
                '<button type="button" class="ls-door" data-filter="%s">'
                '<span class="ls-bg xxzt" aria-hidden="true">%s</span>'
                '<span class="idx">%02d</span><h2 class="xxzt">%s</h2>'
                '<span class="go">%d 款</span></button>'
                % (k, marks[k], i, e(STATUS[k][0]), counts[k])
            )
        inner = (
            '<div class="ls-stage is-doors">'
            '<div class="ls-find">'
            '<p class="ls-k">wenfeng.org</p>'
            '<h1 class="xxzt">目录</h1>'
            '<p class="d for-design">先定状态，再搜名字。点右边一门，左边只留那一类。</p>'
            '<p class="d for-dev mono">data-filter · offer</p>'
            '%s'
            '<p class="count" data-count></p>'
            '<p><button type="button" class="btn-text is-on" data-filter="all">看全部</button></p>'
            '%s'
            '</div>'
            '<div class="ls-sides">%s</div></div>'
            % (search(live=True), lab_rows(fonts, "8"), "".join(doors))
        )
    elif variant == "b":
        letters = OrderedDict()
        for f in fonts:
            letters[letter_of(f)] = letters.get(letter_of(f), 0) + 1
        top = sorted(letters.items(), key=lambda kv: (-kv[1], kv[0]))[:14]
        rail = ['<button type="button" class="ls-let is-on" data-letter-filter="all">全部</button>']
        rail += [
            '<button type="button" class="ls-let xxzt" data-letter-filter="%s">%s</button>' % (e(ch), e(ch))
            for ch, _c in top
        ]
        inner = (
            '<div class="ls-stage is-spine">'
            '<p class="ls-mark xxzt" data-letter-mark aria-hidden="true">录</p>'
            '<div class="ls-spine-copy">'
            '<p class="ls-k">wenfeng.org</p>'
            '<h1 class="xxzt">字谱</h1>'
            '<p class="d for-design">按首字翻。左边是谱，右边是这一笔下的款。</p>'
            '%s'
            '<div class="ls-lets" role="tablist" aria-label="首字">%s</div>'
            '<p class="count" data-count></p>'
            '</div>'
            '<div class="ls-spine-list">%s</div>'
            '</div>'
            % (search(live=True), "".join(rail), lab_rows(fonts, "18"))
        )
    else:
        slides = []
        pool = [f for f in _face_fonts(fonts) if f.get("family")]
        pool = [f for f in pool if f.get("norm") != "xwwk"] + [f for f in pool if f.get("norm") == "xwwk"]
        if len(pool) < 4:
            pool = [f for f in fonts if f.get("family") and status(f) == "source"][:8]
        for i, f in enumerate(pool[:8]):
            st = status(f)
            verb = "下载" if st == "source" else "查看字型"
            hidden = "" if i == 0 else " hidden"
            slides.append(
                '<div class="ls-slide"%s data-face-slide data-face-norm="%s" data-face-family="%s">'
                '<p class="ls-k">%s</p>'
                '<p class="ls-giant t-%s">%s</p>'
                '<p class="ls-one-act"><a class="btn btn-ink" href="/source/%s/">%s</a>'
                '<button type="button" class="btn-text" data-face-next>换一款</button></p></div>'
                % (hidden, e(f["norm"]), e(f["family"]),
                   e(STATUS[st][0]), e(f["norm"]), e(wf(f)),
                   e(f["norm"]), e(verb))
            )
        inner = (
            '<div class="ls-stage is-one" data-home-face>'
            '%s'
            '<form class="search is-embed" action="/source/" method="get" role="search">'
            '<label class="sr-only" for="lab-q-one">搜索字体</label>'
            '<input id="lab-q-one" name="q" type="search" placeholder="中文名、英文名、厂商…" autocomplete="off">'
            '<button class="btn btn-ink" type="submit">%s搜索</button></form>'
            '<p class="ls-one-foot for-design">这一屏只放一款。要名单，搜了进活页目录。</p>'
            '</div>'
            % ("".join(slides), icon("search"))
        )
    extra = pages_css("lab-source")
    return layout(
        "source", "目录稿%s" % self_name, flag + inner, path,
        extra_head=extra, body_class="ls-lab ls-%s" % variant,
    )


def file_of(f, kind):
    for fl in f.get("files") or []:
        if fl.get("kind") == kind:
            return fl
    return None


def first_file_href(f):
    for fl in f.get("files") or []:
        if fl.get("href") and not fl.get("staged"):
            return fl
    return None


def github_archive_zip(href):
    if not href:
        return None
    from urllib.parse import urlparse
    try:
        u = urlparse(href)
    except Exception:
        return None
    host = re.sub(r"^www\.", "", u.netloc or "")
    parts = [p for p in (u.path or "").split("/") if p]
    if host != "github.com" or len(parts) < 2:
        return None
    owner, repo = parts[0], parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    return "https://github.com/%s/%s/archive/HEAD.zip" % (owner, repo)


def github_repo_name(href):
    """从 GitHub 地址或 archive/HEAD.zip 取出仓库名。"""
    if not href:
        return ""
    from urllib.parse import urlparse
    try:
        u = urlparse(href)
    except Exception:
        return ""
    host = re.sub(r"^www\.", "", u.netloc or "")
    parts = [p for p in (u.path or "").split("/") if p]
    if host != "github.com" or len(parts) < 2:
        return ""
    repo = parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    return repo


def primary_file(f):
    arch = file_of(f, "archive")
    if arch and arch.get("href") and not arch.get("staged"):
        return arch
    first = first_file_href(f)
    if first and first.get("kind") not in ("upstream", "git"):
        return first
    if can_take(f):
        up = upstream_href(f)
        z = github_archive_zip(up)
        if z:
            repo = github_repo_name(up) or github_repo_name(z) or (f.get("norm") or "source")
            return {
                "kind": "archive",
                "label": "%s.zip" % repo,
                "format": "zip",
                "href": z,
                "via": "github",
            }
    return None


def archive_display_name(file, f=None):
    """给人看的包名。GitHub HEAD.zip 回退显示仓库名，不露裸 HEAD.zip。"""
    if not file:
        return "源文件"
    href = file.get("href") or ""
    via = file.get("via") or ""
    if via == "github" or "/archive/HEAD.zip" in href:
        repo = github_repo_name(href)
        if not repo and f:
            repo = github_repo_name(upstream_href(f))
        if repo:
            return "%s.zip" % repo
        if f and f.get("en"):
            return "%s.zip" % re.sub(r"\s+", "", f["en"])
        if f and f.get("norm"):
            return "%s.zip" % f["norm"]
    label = (file.get("label") or "").strip()
    name = file_name_from_href(href)
    if name and name != "HEAD.zip":
        return name
    if label and "源文件" not in label:
        return label
    if label:
        return label
    return name or "源文件"


def primary_label(file):
    if not file:
        return "下载"
    k = file.get("kind")
    if k == "archive":
        return "下载"
    if k == "git":
        return "获取字型"
    if k == "upstream":
        return "获取字型"
    return file.get("label") or "下载"


def fmt_bytes(n):
    try:
        n = int(n)
    except (TypeError, ValueError):
        return ""
    if n < 1024:
        return "%d B" % n
    if n < 1024 * 1024:
        return "%.1f KB" % (n / 1024.0)
    return "%.1f MB" % (n / (1024.0 * 1024.0))


def file_name_from_href(href):
    if not href:
        return ""
    from urllib.parse import unquote
    path = str(href).split("#")[0].split("?")[0]
    parts = [p for p in path.split("/") if p]
    last = parts[-1] if parts else ""
    try:
        return unquote(last)
    except Exception:
        return last


def is_shop_jump(x, f):
    if not x:
        return False
    if f and x.get("href") == f.get("shop"):
        return True
    return x.get("label") == "在网页里用"


def origin_jumps(f):
    m = f.get("mirror") or {}
    seen = set(x.get("href") for x in f.get("jump") or [] if x.get("href"))
    extra = []
    up = m.get("upstream")
    if up and up not in seen:
        from urllib.parse import urlparse
        mh = urlparse(up).netloc or ""
        extra.append({"label": "去 GitHub 取" if "github.com" in mh else "去官方取", "href": up})
    jumps = extra + (f.get("jump") or [])
    return [x for x in jumps if x and x.get("href") and not is_shop_jump(x, f)]


def upstream_href(f):
    fl = file_of(f, "upstream")
    if fl and fl.get("href"):
        return fl["href"]
    mirror_up = (f.get("mirror") or {}).get("upstream")
    if mirror_up:
        return mirror_up
    oj = origin_jumps(f)
    return oj[0]["href"] if (oj and oj[0].get("href")) else ""


def upstream_dossier(href):
    if not href:
        return "—"
    from urllib.parse import urlparse
    try:
        u = urlparse(href)
        host = re.sub(r"^www\.", "", u.netloc or "")
        parts = [p for p in (u.path or "").split("/") if p]
        if host == "github.com" and len(parts) >= 2:
            return parts[0] + "/" + parts[1]
        if parts:
            return host + "/" + parts[0]
        return host or href
    except Exception:
        return href


def upstream_dev(href):
    if not href:
        return "∅"
    from urllib.parse import urlparse
    try:
        u = urlparse(href)
        host = re.sub(r"^www\.", "", u.netloc or "")
        parts = [p for p in (u.path or "").split("/") if p]
        if host == "github.com" and parts:
            return "github.com/" + parts[0]
        return host or href
    except Exception:
        return href


def lic_title_of(f, lic_text=None):
    return (lic_text and lic_text.get("title")) or f.get("licenseName") or ""


def license_readable(f, lic_text=None):
    t = lic_title_of(f, lic_text)
    return bool(t and t != "待核实")


def font_text_cell(f):
    l = lic(f)
    ts = str(l.get("textState") or "")
    date = l.get("verifiedAt") or l.get("fetchedAt") or ""
    if ts == "full":
        att = can_attest(f)
        return {
            "d": ("已归档 · " + date) if date else ("已归档 · 可出证" if att else "已归档"),
            "v": "full · canAttest" if att else "full"
        }
    if ts == "summary":
        return {"d": "摘要 · 非全文", "v": "summary"}
    if ts == "pointer":
        return {"d": "指引 · 全文见出处", "v": "pointer"}
    return {"d": "空", "v": "∅"}


def font_archive_cell(f):
    archive = file_of(f, "archive")
    if archive and archive.get("href") and not archive.get("staged"):
        return {"d": "可下载", "v": archive_display_name(archive, f)}
    # 本站 tar 未就绪，但 GitHub HEAD.zip 可下
    if can_take(f) and github_archive_zip(upstream_href(f)):
        repo = github_repo_name(upstream_href(f)) or "repo"
        return {"d": "GitHub 源码包", "v": "github · %s.zip" % repo}
    if archive and archive.get("staged"):
        return {"d": "稍后提供", "v": "staged · " + (archive.get("format") or "tar.gz")}
    if (f.get("offer") or "jump") == "missing":
        return {"d": "未收录", "v": "none"}
    return {"d": "没有归档包", "v": "none"}


def mirror_word(state):
    return {
        "mirrored": "本站已镜像",
        "skipped-too-heavy": "体积过大，未镜像",
        "absent": "尚未镜像",
        "collected-private": "收录未公开",
        "restricted-login": "需登录领取",
        "unverified": "许可待核实"
    }.get(state, "")


def status_word(f):
    o = f.get("offer") or "jump"
    if o == "source":
        return "本站下载"
    if o == "pending":
        return "暂无下载" if lic(f).get("textState") == "full" else "待核实"
    if o == "missing":
        return "未收录"
    return "官方下载"


def status_class(f):
    o = f.get("offer") or "jump"
    if o == "source":
        return "is-source"
    if o == "pending":
        return "is-pending"
    if o == "missing":
        return "is-missing"
    return "is-jump"


def can_take(f):
    return (f.get("offer") or "jump") == "source"


def font_verb(f, lic_text=None):
    """主动作：标签与目录五态同词（下载 / 获取字型 / 报缺收录）；许可全文作次按钮。"""
    archive = file_of(f, "archive")
    staged = bool(archive and archive.get("staged"))
    real = primary_file(f)
    up = upstream_href(f)
    offer = f.get("offer") or "jump"
    st = status(f)
    readable = license_readable(f, lic_text)
    base = STATUS[st][1]
    if can_take(f) and real and real.get("href") and real.get("kind") != "upstream" and not real.get("staged"):
        return {
            "verb": "下载",
            "verbDev": file_name_from_href(real["href"]) or real.get("format") or real.get("kind"),
            "kickerDev": "primary · file",
            "note": base,
            "noteDev": "files[%s] · not woff2" % (real.get("kind") or "file"),
            "strongHref": real["href"],
            "strongLabel": "下载",
        }
    if up and (staged or offer == "source"):
        return {
            "verb": "获取字型",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · upstream",
            "note": "归档包稍后提供，现在到出处取原件。" if staged else base,
            "noteDev": ("files[archive].staged · upstream" if staged else "offer=source · upstream"),
            "strongHref": up,
            "strongLabel": "获取字型",
        }
    if up and offer == "jump":
        return {
            "verb": "获取字型",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · jump",
            "note": base,
            "noteDev": "offer=jump · upstream · not woff2",
            "strongHref": up,
            "strongLabel": "获取字型",
        }
    if up:
        return {
            "verb": "获取字型",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · upstream",
            "note": base,
            "noteDev": "offer=%s · upstream · textState=%s" % (offer, lic(f).get("textState") or "∅"),
            "strongHref": up,
            "strongLabel": "获取字型",
        }
    if is_gated(f):
        og = origin_for_gate(f)
        href = up or ((og or {}).get("href") or "")
        if href:
            return {
                "verb": "获取字型",
                "verbDev": upstream_dev(href),
                "kickerDev": "primary · gated-origin",
                "note": base,
                "noteDev": "distribution=false · origin",
                "strongHref": href,
                "strongLabel": "获取字型",
            }
    if st in ("ready", "pending") or offer == "pending":
        if readable:
            return {
                "verb": "读许可",
                "verbDev": "offer=pending",
                "kickerDev": "primary · pending",
                "note": base,
                "noteDev": "offer=pending · textState=%s · no file" % (lic(f).get("textState") or "∅"),
                "strongHref": "/license/%s/" % f["norm"],
                "strongLabel": "读许可原文",
            }
        return {
            "verb": "报缺收录",
            "verbDev": "offer=pending",
            "kickerDev": "primary · pending",
            "note": base,
            "noteDev": "offer=pending · textState=%s · no upstream" % (lic(f).get("textState") or "∅"),
            "strongHref": "/gap/?norm=%s" % f["norm"],
            "strongLabel": "报缺收录",
        }
    if readable and st == "source":
        return {
            "verb": "读许可",
            "verbDev": "offer=source · no file",
            "kickerDev": "primary · pending-file",
            "note": "许可允许再分发，源文件包还没上架。",
            "noteDev": "offer=source · no archive · no upstream",
            "strongHref": "/license/%s/" % f["norm"],
            "strongLabel": "读许可原文",
        }
    return {
        "verb": "报缺收录",
        "verbDev": "offer=missing",
        "kickerDev": "primary · missing",
        "note": base,
        "noteDev": "offer=missing · no upstream",
        "strongHref": "/gap/?norm=%s" % f["norm"],
        "strongLabel": "报缺收录",
    }


def oss_pack(f):
    return OSS_PACKS_LOWER.get(str(f.get("norm") or "").lower()) or {}


def oss_webfont_css(f):
    """条目页不公开禁再分发款的 CSS 直链。领取走本页即用字库。"""
    if f.get("distribution") is False:
        return None
    return webfont_css_url(f)


def webfont_css_url(f):
    """OSS 即用字库 result.css。路径 fonts-packages/{norm小写}/{Weight}/{subset}/。"""
    norm_key = str(f.get("norm") or "").lower()
    subset = WEBFONT_SUBSET.get(norm_key) or "zh-common"
    weights = f.get("weights") or ["Regular"]
    weight = "Regular" if "Regular" in weights else (weights[0] if weights else "Regular")
    css_items = oss_pack(f).get("sliceCss") or []
    want = "zh-common" if subset == "zh-common" else ("full" if subset == "full" else "")

    def match(it, w, sub):
        path = it.get("css") or ""
        if w and not path.startswith(w + "/"):
            return False
        if sub and ("/%s/" % sub) not in ("/" + path):
            return False
        return bool(it.get("url"))

    def lower_css_url(url):
        """Rewrite fonts-packages/{AnyCase}/… → lowercase pack segment."""
        if not url or "/fonts-packages/" not in url:
            return url
        pre, rest = url.split("/fonts-packages/", 1)
        parts = rest.split("/", 1)
        if not parts[0]:
            return url
        pack = parts[0].lower()
        tail = parts[1] if len(parts) > 1 else ""
        return "%s/fonts-packages/%s%s" % (pre, pack, ("/" + tail) if tail else "")

    for it in css_items:
        if match(it, weight, want):
            return lower_css_url(it["url"])
    for it in css_items:
        if match(it, weight, ""):
            return lower_css_url(it["url"])
    if css_items and css_items[0].get("url"):
        return lower_css_url(css_items[0]["url"])
    return "https://cn.windfonts.com/fonts-packages/%s/%s/%s/result.css" % (
        norm_key, weight, subset)


def font_more(f, verb):
    """还能办的事：不重复主按钮。只放探测到的地址。"""
    items = []
    norm = f["norm"]
    primary = (verb.get("strongHref") or "").rstrip("/")

    def add(title, desc, href):
        if not href or href.rstrip("/") == primary:
            return
        items.append((title, desc, href))

    if f.get("shop"):
        add("在线选字", "店面样张和选字。", f["shop"])
    add("报缺字", "缺字形、缺收录或勘误，都从一个入口报。", "/gap/?norm=%s" % norm)
    if not items:
        return ""
    return (
        '<div class="fn-more">'
        '<p class="fn-label">还能办的事</p>%s</div>'
        % tasks(items, compact=True)
    )



def font_page_note(f, verb):
    """档案页导语第二句：优先 visitorNote，再按五态补全。"""
    custom = (f.get("visitorNote") or "").strip()
    if custom:
        return custom
    st = status(f)
    if st == "source":
        return "原件与切片包可直接领取。"
    if st == "jump":
        if is_gated(f):
            return (
                "免费商用但不允许再分发字体文件。"
                "从官方取得原包后，可核验领取切片包。"
            )
        return "原件请到作者或厂商的发布处；切片包在本页领取。"
    return verb["note"]


def font_take_howto_html(f, *, gate_pending=False):
    """怎么用：授权标注常显；引入示例用标签页，每页完整可复制代码。"""
    norm = f["norm"]
    pack = "wenfeng-%s" % norm
    family = f.get("family") or ("wenfeng-%s" % norm)
    path = "./fonts/%s/fonts.css" % pack
    wp_path = "/fonts/%s/fonts.css" % pack
    css_comment = (
        "/* 本页嵌入的字体由文风字体（Windfonts）提供，可自由使用；"
        "请保留本授权标注 https://wenfeng.org/license */"
    )
    samples = [
        (
            "HTML",
            '<link rel="stylesheet" href="%s">' % path,
        ),
        (
            "CSS",
            "%s\n"
            '@import url("%s");\n\n'
            "body {\n"
            "  font-family: %s, system-ui, sans-serif;\n"
            "}"
            % (css_comment, path, family),
        ),
        (
            "WordPress",
            "// functions.php：整夹放进主题 fonts/%s/ 后排队引入\n"
            "// 授权标注已写在 fonts.css，勿删\n"
            "wp_enqueue_style(\n"
            "  '%s',\n"
            "  get_theme_file_uri( '%s' ),\n"
            "  array(),\n"
            "  null\n"
            ");"
            % (pack, pack, wp_path),
        ),
    ]

    def code_block(body):
        # 结构对齐 APP：.code + 右上角 .copy + pre
        return (
            '<div class="code">'
            '<button type="button" class="copy" data-fn-copy>复制</button>'
            '<pre>%s</pre></div>'
            % e(body)
        )

    tabs = []
    panels = []
    for i, (label, body) in enumerate(samples):
        on = " is-on" if i == 0 else ""
        hid = "" if i == 0 else " hidden"
        tabs.append(
            '<button type="button"%s data-fn-tab="%s" role="tab"'
            ' aria-selected="%s">%s</button>'
            % (
                ' class="is-on"' if i == 0 else "",
                e(label),
                "true" if i == 0 else "false",
                e(label),
            )
        )
        panels.append(
            '<div class="fn-take-panel" data-fn-panel="%s" role="tabpanel"%s>%s</div>'
            % (e(label), hid, code_block(body))
        )

    gate_lead = (
        '<p class="fn-take-note is-gate-lead">核验通过后，包内用法如下。</p>'
        if gate_pending
        else ""
    )
    return (
        '<div class="fn-take-howto" id="howto">'
        '<p class="fn-label">怎么用</p>'
        '%s'
        '<p class="fn-take-note">解压后<strong>整夹保留</strong>，引入包内 <code>fonts.css</code>。'
        '目录名带 <code>wenfeng-</code> 前缀，勿改。静态站、任意前端都能用；'
        '不要拆文件，也不要删注释。</p>'
        '<p class="fn-take-label">授权标注 · 须保留</p>'
        '%s'
        '<p class="fn-take-label">引入示例</p>'
        '<div class="seg fn-take-tabs" data-fn-tabs role="tablist" aria-label="引入示例">%s</div>'
        '%s'
        '<p class="fn-take-more"><a href="/use/">用法全文</a></p>'
        '</div>'
        % (
            gate_lead,
            code_block(COMMENT),
            "".join(tabs),
            "".join(panels),
        )
    )


def font_take_missing_html(f):
    """未收录：不展示切片与怎么用，只说明去向。"""
    norm = e(f["norm"])
    return (
        '<div class="fn-take is-empty" id="take">'
        '<p class="fn-label">领取</p>'
        '<p class="fn-take-note">这款还没收进目录，暂无原件与切片包。'
        '许可已核对的，可在顶栏读许可原文；'
        '<a href="/gap/?norm=%s">报缺收录</a>。</p>'
        '</div>'
        % norm
    )


def font_take_html(f):
    """原件 + 切片包：两行同构；切片墨钮、原件次级钮。"""
    if status(f) == "missing":
        return font_take_missing_html(f)
    gated = is_gated(f)
    archive = file_of(f, "archive")
    up = upstream_href(f)
    staged = bool(archive and archive.get("staged"))
    rows = []

    real = primary_file(f)
    if real and real.get("href") and real.get("kind") != "upstream" and not real.get("staged"):
        fname = archive_display_name(real, f)
        size_s = fmt_bytes(real.get("bytes") or real.get("size"))
        bits = [fname]
        via_gh = real.get("via") == "github" or "/archive/HEAD.zip" in (real.get("href") or "")
        if via_gh:
            bits.append("GitHub 源码仓")
        if size_s:
            bits.append(size_s)
        rows.append(
            '<div class="fn-take-row">'
            '<span class="fn-take-kind">原件</span>'
            '<span class="fn-take-info mono">%s</span>'
            '%s</div>'
            % (
                e(" · ".join(bits)),
                soft_btn("下载", real["href"], VERB_ICO.get("下载") or "download"),
            )
        )
        if via_gh:
            rows.append(
                '<p class="fn-take-orig-note">上游仓库打包下载，内含完整源文件；'
                '不是单个精修 TTF / OTF。本站 OSS 包就绪后会换正式直链。</p>'
            )
    elif not gated:
        tip = "正在上架到本站 OSS，就绪后本页直下。"
        if staged:
            tip = "OSS 原件包整理中，就绪后本页直下。"
        go = ""
        if up:
            go = ' <a class="fn-file-go" href="%s" target="_blank" rel="noopener">获取字型</a>' % e(up)
        rows.append(
            '<div class="fn-take-row is-wait">'
            '<span class="fn-take-kind">原件</span>'
            '<span class="fn-take-info is-mute">%s%s</span></div>'
            % (e(tip), go)
        )

    slice_bare = slice_desk_html(f, bare=True, chrome="quiet")
    if gated:
        # 闸控：交包台吃满主栏，不套开源双行骨架
        return (
            '<div class="fn-take is-gate" id="take">'
            '<p class="fn-label">领取切片包</p>'
            '<p class="fn-take-hint">交官方尚未解压的 zip，核验后领取。原件不离开本机。</p>'
            '<div class="fn-slice-block">%s</div>%s</div>'
            % (slice_bare, font_take_howto_html(f, gate_pending=True))
        )

    rows.append(
        '<div class="fn-take-row is-slice">'
        '<span class="fn-take-kind">切片包</span>'
        '<span class="fn-take-info">woff2 · CSS</span>'
        '<div class="fn-slice-inline">%s</div></div>'
        % slice_bare
    )
    return (
        '<div class="fn-take" id="take">'
        '<p class="fn-label">领取</p>'
        '<div class="fn-take-list">%s</div>%s</div>'
        % ("".join(rows), font_take_howto_html(f))
    )


def font_quiet_more(f):
    """还能办的事：安静文字链，不抢领取。"""
    bits = []
    if f.get("shop"):
        bits.append('<a href="%s">在线选字</a>' % e(f["shop"]))
    bits.append('<a href="/gap/?norm=%s">报缺字</a>' % e(f["norm"]))
    bits.append(
        '<a href="/gap/?norm=%s&name=%s">信息有误？</a>'
        % (e(f["norm"]), e(wf(f)))
    )
    return '<p class="fn-quiet-more">%s</p>' % " · ".join(bits)


def page_font(f):
    """档案页：甲 · 并路领取。顶栏许可/证明；样字；同构领取双行；侧栏。"""
    verb = font_verb(f)
    st = status(f)
    st_label = STATUS[st][0]
    note = font_page_note(f, verb)
    archive = file_of(f, "archive")
    up = upstream_href(f)
    if (
        archive and archive.get("staged")
        and "稍后" not in note
        and not github_archive_zip(up)
        and not (primary_file(f) or {}).get("href")
        and not (f.get("visitorNote") or "").strip()
    ):
        note = "原件正在上架到本站 OSS。" + note
    spdx = spdx_of(f) or ""
    proto = spdx or f.get("licenseName") or "—"
    foundry = f.get("foundry") or "未标注"
    foundry_slug = f.get("foundrySlug")
    foundry_html = (
        ('<a href="/foundry/%s/">%s</a>' % (e(foundry_slug), e(foundry)))
        if foundry_slug else e(foundry)
    )
    text_cell = font_text_cell(f)
    arch_cell = font_archive_cell(f)
    mirror_state = (f.get("mirror") or {}).get("state") or ""
    face = f.get("family") or ""
    face_attrs = face_attrs_of(f, require_pack=False)

    lic_href = "/license/%s/" % f["norm"]
    acts = []
    if license_readable(f, None):
        acts.append(link("读许可原文", lic_href, ico=VERB_ICO["读许可原文"]))
    if can_attest(f):
        acts.append(link("授权证明", "/attest/%s/" % f["norm"], ico=VERB_ICO["授权证明"]))

    up_label = upstream_dossier(up) if up else "—"
    up_cell = (
        ('<a href="%s" target="_blank" rel="noopener">%s</a>' % (e(up), e(up_label)))
        if up else e(up_label)
    )
    dossier = font_dossier_html(f, up_cell, text_cell, arch_cell, mirror_state)

    evidence = " · ".join(
        x for x in (
            (f.get("en") or "").strip(),
            proto if proto != "—" else "",
            foundry if foundry != "未标注" else "",
        ) if x
    ) or (f.get("en") or "")

    lead = "%s。%s" % (e(st_label), e(note))
    body = page_head(
        wf(f),
        lead,
        crumbs=[("/source/", "目录"), (None, wf(f))],
        dev="/source/%s · offer=%s" % (f["norm"], f.get("offer") or "jump"),
        face_attrs=face_attrs,
        sub=evidence,
    )
    if acts:
        body += '<p class="acts fn-acts">%s</p>' % "".join(acts)
    body += '<div class="fn-layout"><div class="fn-main">'
    if face:
        body += '<p class="fn-proof t-%s"%s data-face-full="1">%s</p>' % (
            e(f["norm"]), face_attrs, e(PROOF),
        )
    else:
        body += '<p class="fn-proof t-%s" data-face-norm="%s" data-face-full="1">%s</p>' % (
            e(f["norm"]), e(f["norm"]), e(PROOF),
        )
    body += font_take_html(f)
    body += font_quiet_more(f) + '</div>'
    body += aside("这一款", dossier) + '</div>'
    font_desc = "%s（%s）。%s。许可 %s，厂商 %s。源文件与许可原文在文风开源，本站不二次授权。" % (
        wf(f), f["norm"], st_label, proto, foundry)
    return layout(
        "source", wf(f), body, "/source/%s" % f["norm"],
        extra_head=pages_css("source-norm", "slice") + "\n" + pages_js("slice"),
        body_class="page-font",
        desc=font_desc,
        jsonld=seo.graph(
            seo.creative_work(
                wf(f), "/source/%s/" % f["norm"],
                description=font_desc,
                license_url="/license/%s/" % f["norm"],
                identifier=f["norm"],
                alternate=(f.get("en") or ""),
                holder="" if foundry == "未标注" else foundry,
            ),
            seo.breadcrumb([("/", "首页"), ("/source/", "目录"), (None, wf(f))]),
        ),
    )



def _font_by_norm(fonts, norm):
    want = str(norm or "").lower()
    for f in fonts:
        if f["norm"] == want:
            return f
    return fonts[0]


def _lab_font_bits(f):
    """对照稿共用件。领取与安静链跟活页同一套。"""
    verb = font_verb(f)
    st = status(f)
    st_label = STATUS[st][0]
    note = font_page_note(f, verb)
    archive = file_of(f, "archive")
    up = upstream_href(f)
    if (
        archive and archive.get("staged")
        and "稍后" not in note
        and not github_archive_zip(up)
        and not (primary_file(f) or {}).get("href")
        and not (f.get("visitorNote") or "").strip()
    ):
        note = "原件正在上架到本站 OSS。" + note
    spdx = spdx_of(f) or ""
    proto = spdx or f.get("licenseName") or "—"
    foundry = f.get("foundry") or "未标注"
    foundry_slug = f.get("foundrySlug")
    foundry_html = (
        ('<a href="/foundry/%s/">%s</a>' % (e(foundry_slug), e(foundry)))
        if foundry_slug else e(foundry)
    )
    text_cell = font_text_cell(f)
    arch_cell = font_archive_cell(f)
    mirror_state = (f.get("mirror") or {}).get("state") or ""
    face_attrs = face_attrs_of(f, require_pack=False)
    lic_href = "/license/%s/" % f["norm"]

    acts_doc = []
    if license_readable(f, None):
        acts_doc.append(link("读许可原文", lic_href, ico=VERB_ICO["读许可原文"]))
    if can_attest(f):
        acts_doc.append(link("授权证明", "/attest/%s/" % f["norm"], ico=VERB_ICO["授权证明"]))

    up_label = upstream_dossier(up) if up else "—"
    up_cell = (
        ('<a href="%s" target="_blank" rel="noopener">%s</a>' % (e(up), e(up_label)))
        if up else e(up_label)
    )
    dossier = font_dossier_html(f, up_cell, text_cell, arch_cell, mirror_state)

    evidence = " · ".join(
        x for x in (
            (f.get("en") or "").strip(),
            proto if proto != "—" else "",
            foundry if foundry != "未标注" else "",
        ) if x
    ) or (f.get("en") or "")
    lead = "%s。%s" % (e(st_label), e(note))
    proof = '<p class="fn-proof t-%s"%s data-face-full="1">%s</p>' % (
        e(f["norm"]), face_attrs, e(PROOF),
    )
    return {
        "lead": lead,
        "evidence": evidence,
        "acts_doc": "".join(acts_doc),
        "dossier": dossier,
        "take": font_take_html(f),
        "proof": proof,
        "face_attrs": face_attrs,
        "more_quiet": font_quiet_more(f),
        "name": wf(f),
        "norm": f["norm"],
        "st_label": st_label,
        "proto": proto,
    }


def page_lab_font(fonts, variant, demo="xwwk"):
    """条目对照：甲=活页同构；乙样字在下；丙通栏。"""
    f = _font_by_norm(fonts, demo)
    b = _lab_font_bits(f)
    names = (("a", "甲"), ("b", "乙"), ("c", "丙"))
    self_name = dict(names)[variant]
    others = "".join(
        ' · <a href="/lab/font-%s/%s">看%s</a>' % (k, "" if demo == "xwwk" else "albbpht/", lab)
        for k, lab in names if k != variant
    )
    if demo == "xwwk":
        path = "/lab/font-%s/" % variant
        demos = (
            '<span class="lf-demo is-on">开源款</span>'
            ' · <a href="/lab/font-%s/albbpht/">禁再分发</a>' % variant
        )
    else:
        path = "/lab/font-%s/albbpht/" % variant
        demos = (
            '<a href="/lab/font-%s/">开源款</a>'
            ' · <span class="lf-demo is-on">禁再分发</span>' % variant
        )
    blurb = {
        "a": "并路 · 领取同构双行（与活页一致）",
        "b": "样字在上 · 领取在下（旧序对照）",
        "c": "疏朗通栏 · 无侧栏",
    }[variant]
    flag = (
        '<p class="lab-flag">稿%s · %s<span class="for-dev mono"> · %s</span>%s · '
        '<a href="/source/%s/">活页</a> · %s</p>'
        % (self_name, blurb, path, others, e(f["norm"]), demos)
    )

    head = page_head(
        b["name"],
        b["lead"],
        crumbs=[("/source/", "目录"), (None, b["name"])],
        dev="/lab/font-%s · %s" % (variant, f["norm"]),
        face_attrs=b["face_attrs"],
        sub=b["evidence"],
    )

    if variant == "a":
        inner = (
            '%s'
            '<p class="acts fn-acts">%s</p>'
            '<div class="fn-layout"><div class="fn-main">'
            '%s%s%s</div>%s</div>'
            % (
                head, b["acts_doc"],
                b["proof"], b["take"], b["more_quiet"],
                aside("这一款", b["dossier"]),
            )
        )
    elif variant == "b":
        inner = (
            '%s'
            '<p class="acts fn-acts">%s</p>'
            '<div class="fn-layout"><div class="fn-main">'
            '%s%s%s</div>%s</div>'
            % (
                head, b["acts_doc"],
                b["proof"], b["take"], b["more_quiet"],
                aside("这一款", b["dossier"]),
            )
        )
    else:
        meta = '<div class="lf-meta">%s</div>' % b["dossier"]
        inner = (
            '%s'
            '<p class="acts fn-acts">%s</p>'
            '<div class="fn-main is-solo">'
            '%s%s%s%s</div>'
            % (
                head, b["acts_doc"],
                meta, b["proof"], b["take"], b["more_quiet"],
            )
        )

    body = flag + '<div class="lf-lab is-%s">%s</div>' % (variant, inner)
    return layout(
        "source", "%s · 稿%s" % (b["name"], self_name), body, path,
        extra_head=(
            pages_css("source-norm", "lab-font", "slice")
            + "\n" + pages_js("slice")
        ),
        body_class="page-font lab-font-page lab-font-%s" % variant,
    )


def offer_of(f):
    return f.get("offer") or "jump"


def license_kind(f):
    l = lic(f)
    ts = str(l.get("textState") or "")
    name = f.get("licenseName") or ""
    spdx = spdx_of(f)
    open_lic = ts == "full" and spdx in ATTEST_SPDX and f.get("distribution") is not False
    unverified = not name or name == "待核实" or ts == "missing" or ts == ""
    if open_lic:
        return "open"
    if unverified:
        return "mute"
    return "hold"


def text_state_word(f):
    ts = str(lic(f).get("textState") or "")
    if ts == "full":
        return "已归档 · 可出证" if can_attest(f) else "已归档"
    if ts == "summary":
        return "摘要 · 非全文"
    if ts == "pointer":
        return "指引 · 全文见出处"
    return "空"


def rights_cells(f, kind):
    if kind == "open":
        return [
            ("商用", "commercial", "允许", "yes"),
            ("修改", "modify", "允许", "yes"),
            ("再分发", "redistribute", "允许", "yes")
        ]
    if kind == "mute":
        return [
            ("商用", "commercial", "待核实", "—"),
            ("修改", "modify", "待核实", "—"),
            ("再分发", "redistribute", "待核实", "—")
        ]
    if f.get("distribution") is False:
        return [
            ("商用", "commercial", "以原文为准", "see text"),
            ("修改", "modify", "以原文为准", "see text"),
            ("再分发", "redistribute", "本站不代分发", "distribution=false")
        ]
    return [
        ("商用", "commercial", "以原文为准", "see text"),
        ("修改", "modify", "以原文为准", "see text"),
        ("再分发", "redistribute", "以原文为准", "see text")
    ]


def verdict_copy(f, kind):
    ts = str(lic(f).get("textState") or "")
    if kind == "open":
        return {
            "state": "可商用<br />可改<br />可分发",
            "stateDev": "commercial<br />modify<br />redistribute",
            "line": "可商用 · 可改 · 可分发",
            "note": "开源许可已核对原文。原件在目录直接下载，可出授权证明。" if can_take(f) else "开源许可已核对原文。源文件还没放在本站，结论不受影响。",
            "noteDev": ("canTake" if can_take(f) else ("offer=" + offer_of(f))) +
                       (" · canAttest" if can_attest(f) else "") +
                       (" · GET /api/v1/licenses/" + f["norm"])
        }
    if kind == "mute":
        return {
            "state": "待核实",
            "stateDev": "textState=" + (ts or "∅"),
            "line": "待核实",
            "note": "许可原文还没有核对记录。本站不出结论，也不出证。",
            "noteDev": "no conclusion · no attest"
        }
    if f.get("distribution") is False:
        return {
            "state": "仅查询<br />不可下载",
            "stateDev": "distribution=false<br />no file here",
            "line": "仅查询 · 不可下载",
            "note": "本站不代分发这款源文件。条款以厂商或官方发布件为准。",
            "noteDev": "offer=" + offer_of(f) + " · textState=" + (ts or "∅")
        }
    if ts == "full":
        return {
            "state": "原文已归档<br />非开源协议",
            "stateDev": "textState=full<br />spdx∉attest",
            "line": "原文已归档 · 非开源协议",
            "note": "全文在本站，但不是标准开源协议。以原文为准，不在出证范围内。",
            "noteDev": "license text on file · attest blocked"
        }
    return {
        "state": "仅查询<br />全文见官方渠道",
        "stateDev": "textState=" + (ts or "∅") + "<br />not archived",
        "line": "仅查询 · 全文见官方渠道",
        "note": "本站还没有归档全文。先获取字型，不要把名称当成许可结论。",
        "noteDev": "pointer · upstream text"
    }


def stage_acts(f, kind):
    acts = []
    if kind != "mute" and license_readable(f, None):
        acts.append({"href": "/license/%s/" % f["norm"], "label": "打开许可原文", "strong": True})
    if can_take(f):
        acts.append({"href": "/source/%s/" % f["norm"], "label": "下源文件", "strong": not acts})
    if can_attest(f):
        acts.append({"href": "/attest/%s/" % f["norm"], "label": "授权证明", "strong": False})
    if not can_take(f):
        acts.append({"href": "/source/%s/" % f["norm"], "label": "看目录条目", "strong": not acts})
    if kind == "mute":
        acts.append({"href": "/gap/", "label": "报缺字", "strong": not acts})
    return acts


def lq_kv_pair(kd, kv, vd, vv):
    v_dev = (
        '<span class="for-dev mono"> · %s</span>' % e(vv)
        if vv not in (None, "", vd) else ""
    )
    return (
        '<div>'
        '<span class="k">%s<span class="for-dev mono"> · %s</span></span>'
        '<span class="v">%s%s</span>'
        '</div>' % (e(kd), e(kv), e(vd), v_dev)
    )


def license_stage(f):
    kind = license_kind(f)
    copy = verdict_copy(f, kind)
    spdx = spdx_of(f) or ""
    foundry = f.get("foundry") or "未标注"
    foundry_slug = f.get("foundrySlug") or "—"
    proto = spdx or f.get("licenseName") or "—"
    acts = "".join(
        '<a%s href="%s">%s</a>' % (
            ' class="is-strong"' if a["strong"] else "",
            e(a["href"]),
            e(a["label"])
        ) for a in stage_acts(f, kind)
    )
    rights_html = "".join(
        lq_kv_pair(row[0], row[1], row[2], row[3]) for row in rights_cells(f, kind)
    )
    verdict = (
        '<div class="lq5b-verdict">'
        '<p class="kicker"><span data-lq-kicker-d></span>'
        '<span class="for-dev mono" data-lq-kicker-v></span></p>'
        '<p class="state">%s<span class="for-dev mono"> · %s</span></p>'
        '<p class="fname">%s</p>'
        '<p class="meta">%s · %s · %s'
        '<span class="for-dev mono"> · %s · spdx=%s · offer=%s</span></p>'
        '<p class="note">%s<span class="for-dev mono"> · %s</span></p>'
        '<p class="acts">%s</p>'
        '</div>' % (
            copy["state"],
            copy["stateDev"],
            e(wf(f)),
            e(proto), e(foundry), e(status_word(f)),
            e(f["norm"]), e(spdx or "∅"), e(offer_of(f)),
            e(copy["note"]),
            e(copy["noteDev"]),
            acts
        )
    )
    ts_word = text_state_word(f)
    ts_dev = "∅" if ts_word == "空" else str(lic(f).get("textState") or "∅")
    dossier = (
        '<aside class="lq5b-dossier" aria-label="侧栏字段">'
        '<p class="label">这一款</p>'
        '<div class="lq5b-kv">'
        + lq_kv_pair("目录编号", "norm", f["norm"], f["norm"])
        + lq_kv_pair("协议", "spdx", proto, spdx or "∅")
        + lq_kv_pair("厂商", "foundry", foundry, foundry_slug)
        + lq_kv_pair("许可原文", "textState", ts_word, ts_dev)
        + lq_kv_pair("源文件", "offer", status_word(f), offer_of(f))
        + rights_html
        + '</div>'
        '</aside>'
    )
    return {"kind": kind, "copy": copy, "verdict": verdict, "dossier": dossier}


def license_foil(f, n):
    kind = license_kind(f)
    copy = verdict_copy(f, kind)
    spdx = spdx_of(f) or ""
    href = "/source/%s/" % f["norm"]
    go = "查看字型 →"
    if kind == "mute":
        href = "/gap/"
        go = "报缺字 →"
    elif license_readable(f, None):
        href = "/license/%s/" % f["norm"]
        go = "读原文 →" if kind == "open" else "读要点 →"

    return (
        '<a class="lq5b-foil%s" role="listitem" href="%s">'
        '<span class="idx" aria-hidden="true">%02d</span>'
        '<span class="state">%s</span>'
        '<span class="body">'
        '<span class="fname">%s</span>'
        '<span class="meta">%s · %s · %s'
        '<span class="for-dev mono"> · %s · textState=%s · offer=%s</span></span>'
        '</span>'
        '<span class="go" aria-hidden="true">%s</span>'
        '</a>' % (
            " is-mute" if kind == "mute" else "",
            e(href),
            n,
            e(copy["line"]),
            e(wf(f)),
            e(spdx or f.get("licenseName") or "待核实"), e(f.get("foundry") or "未标注"), e(status_word(f)),
            e(f["norm"]), e(str(lic(f).get("textState") or "∅")), e(offer_of(f)),
            e(go)
        )
    )


def license_demo(fonts):
    by_norm = {str(f.get("norm") or "").lower(): f for f in fonts}
    primary = by_norm.get("xwwk")
    foils = [by_norm.get("albbpht"), by_norm.get("higure")]
    foils = [f for f in foils if f]
    if not primary:
        for f in fonts:
            if license_kind(f) == "open":
                primary = f
                break
    return {"primary": primary, "foils": foils, "demo": True, "more": 0}


def page_licenses(fonts):
    """授权查询：巨字即题；无右侧栏；检索后结果落在检索下方。"""
    n_full = sum(1 for f in fonts if lic(f).get("textState") == "full")

    def lic_rel(f):
        ts = str(lic(f).get("textState") or "")
        if ts == "full":
            return "有全文"
        if ts == "pointer":
            return "获取字型"
        if ts == "summary":
            return "有要点"
        return "待核实"

    def go(f):
        ts = str(lic(f).get("textState") or "")
        if ts == "full":
            return "读原文", True
        if ts == "pointer":
            return "获取字型", False
        return "查看字型", False

    stage = (
        '<div class="lic-stage">'
        '<h1 class="lic-giant xxzt">授权查询</h1>'
        '<p class="lic-lead">字体许可数据集，现已开放公众查询。'
        '<span class="for-dev mono"> · /license · textState · full=%d</span></p>'
        '%s'
        '<p class="lic-foot">全文 %d 份'
        '<span class="for-dev mono"> · textState=full · %d</span></p>'
        '</div>'
        % (n_full, search(action="/license/", live=True, ph="中文名、英文、目录编号…"), n_full, n_full)
    )
    results = (
        '<div class="lic-hits-wrap" data-show-on-search aria-hidden="true">'
        '<div class="lic-hits">'
        '<p class="count" data-count></p>'
        '%s'
        '</div></div>'
        % index_rows(
            fonts, go=go, rel_of=lic_rel,
            href_of=lambda f: "/license/%s/" % e(f["norm"]),
            list_attrs='data-page-size="12"',
        )
    )
    body = '<div class="lic-page" data-lic-layout>%s%s</div>' % (stage, results)
    lic_desc = "字体许可数据集，现已开放公众查询。"
    return layout(
        "license", "授权查询", body, "/license",
        extra_head=pages_css("license"),
        body_class="page-license",
        desc=lic_desc,
        jsonld=seo.graph(seo.collection_page("授权查询", "/license/", lic_desc),
                         seo.breadcrumb([("/", "首页"), (None, "授权查询")])),
    )


def license_tier(f):
    t = str(lic(f).get("textState") or "")
    if t == "full":
        return {"word": "许可原文", "note": ""}
    if t == "summary":
        return {"word": "许可要点", "note": "非全文，全文以厂商发布件为准。"}
    if t == "pointer":
        return {"word": "许可指引", "note": "全文见官方仓库，本站尚未归档文本。"}
    return None


_OFL_ZH = None


def ofl_zh_shared():
    """站内共享 OFL-1.1 简体译文（仅供阅读）。"""
    global _OFL_ZH
    if _OFL_ZH is None:
        p = ROOT / "data/license-text/_shared/ofl-1.1-zh.json"
        _OFL_ZH = json.loads(p.read_text("utf-8")) if p.exists() else {}
    return _OFL_ZH


def rfn_names(f):
    raw = (lic(f).get("rfn") or "").strip()
    if not raw:
        return []
    parts = re.split(r"[、,，;/｜|]+", raw)
    return [p.strip().strip("'\"") for p in parts if p.strip()]


def mark_license_text(text, names):
    """转义正文并为 RFN / 保留名术语加 mark（先长后短，避免嵌套）。"""
    if not text:
        return ""
    out = e(text)
    held = []

    def hold(html):
        held.append(html)
        return "\x00%d\x00" % (len(held) - 1)

    terms = [
        "Reserved Font Names", "Reserved Font Name(s)", "Reserved Font Name",
        "保留字型名称", "保留字体名称",
    ]
    for term in terms:
        esc = e(term)
        if esc in out:
            out = out.replace(esc, hold('<mark class="lic-mark lic-mark-term">%s</mark>' % esc))
    for name in sorted(names, key=len, reverse=True):
        if len(name) < 2:
            continue
        esc = e(name)
        if esc in out:
            out = out.replace(esc, hold('<mark class="lic-mark">%s</mark>' % esc))
    for i, html in enumerate(held):
        out = out.replace("\x00%d\x00" % i, html)
    return out


def split_ofl_body(body):
    """拆开作者声明（含 RFN）与标准 OFL 正文。返回 (preamble, ofl_en)。"""
    text = body or ""
    markers = [
        "-----------------------------------------------------------\nSIL OPEN FONT LICENSE",
        "-----------------------------------------------------------\r\nSIL OPEN FONT LICENSE",
        "SIL OPEN FONT LICENSE Version 1.1",
        "SIL OPEN FONT LICENSE Version 1.0",
    ]
    idx = -1
    for m in markers:
        i = text.find(m)
        if i >= 0 and (idx < 0 or i < idx):
            idx = i
    if idx <= 0:
        return "", text
    return text[:idx].rstrip(), text[idx:].lstrip()


# OFL 段落对齐：左英文标题 ↔ 右中文标题
_OFL_PAIR = (
    ("PREAMBLE", "序言"),
    ("DEFINITIONS", "定义"),
    ("PERMISSION & CONDITIONS", "许可与条件"),
    ("TERMINATION", "终止授权"),
    ("DISCLAIMER", "免责声明"),
)


def _cut_by_headers(text, headers):
    """按标题切开正文，返回 {header: section_text含标题}。"""
    text = (text or "").replace("\r\n", "\n")
    hits = []
    for h in headers:
        i = text.find(h)
        if i >= 0:
            # 标题须在行首或全文开头
            if i == 0 or text[i - 1] == "\n":
                hits.append((i, h))
    hits.sort()
    out = {}
    for n, (i, h) in enumerate(hits):
        end = hits[n + 1][0] if n + 1 < len(hits) else len(text)
        out[h] = text[i:end].strip()
    return out


def _strip_header(section, header):
    """去掉段首标题行，正文留给栏头展示。"""
    t = (section or "").strip()
    if not t:
        return ""
    lines = t.split("\n")
    if lines and lines[0].strip() == header:
        return "\n".join(lines[1:]).lstrip()
    return t


def ofl_aligned_pairs(ofl_en, body_zh):
    """返回 [(en_label, en_text, zh_label, zh_text), ...]，段落一一对应。"""
    en_map = _cut_by_headers(ofl_en, [h for h, _ in _OFL_PAIR])
    zh_map = _cut_by_headers(body_zh, [z for _, z in _OFL_PAIR])
    pairs = []
    for en_h, zh_h in _OFL_PAIR:
        en_t = _strip_header(en_map.get(en_h) or "", en_h)
        zh_t = _strip_header(zh_map.get(zh_h) or "", zh_h)
        if en_t or zh_t:
            pairs.append((en_h, en_t, zh_h, zh_t))
    return pairs


def license_kind_of(f, lic_obj):
    """A 开源全文 / B 厂商协议 / C 空档。"""
    lic_o = lic(f)
    ts = str(lic_o.get("textState") or lic_obj.get("textKind") or "")
    body = (lic_obj.get("body") or "").strip()
    spdx = spdx_of(f)
    if ts == "full" and body and spdx in ATTEST_SPDX:
        return "open"
    if ts == "pointer" or is_gated(f) or (ts == "full" and spdx not in ATTEST_SPDX):
        return "vendor"
    if body and ts == "full":
        return "open"
    return "empty"


# font-licenses 仓；部分家族共用一份声明（仓耳）
_FONT_LIC_ROOTS = (
    ROOT.parent / "font-licenses" / "licenses",
    Path.home() / "Projects" / "font-licenses" / "licenses",
)
_LICENSE_PACK_ALIAS = {
    "cezkzdbs": "cexwz",
    "cesyt": "cexwz",
}
# CDN 上已核到的 OSS 原件（font-licenses README 2026-09-24）
_OSS_LICENSE_HREF = {
    "opsa": (
        "https://cn.windfonts.com/wenfeng/fonts/opsa/license.0%20License%20Notice",
        "text",
        "OSS 归档原件",
    ),
    "dlzht": (
        "https://cn.windfonts.com/wenfeng/fonts/dlzht/license.pdf",
        "pdf",
        "OSS 归档 PDF",
    ),
}


def font_licenses_root():
    for p in _FONT_LIC_ROOTS:
        if p.is_dir():
            return p
    return None


def _norm_key(norm):
    return (norm or "").strip().lower()


def license_pack_name(norm):
    """font-licenses 目录名（小写）；仓耳等共用包走别名。"""
    k = _norm_key(norm)
    k = _NORM_OLD.get(k, k)
    return _LICENSE_PACK_ALIAS.get(k, k)


def slug_aliases(f):
    """旧 CamelCase / ASCII 别名，给 /source/{old}/ 等再写一页。中文别名不算路径。"""
    out = []
    seen = {str(f.get("norm") or "").lower()}
    for a in f.get("aliases") or []:
        s = str(a).strip()
        if not s or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", s):
            continue
        k = s.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(k)
    return out


def license_pack_dir(norm):
    root = font_licenses_root()
    if not root:
        return None
    pack = license_pack_name(norm)
    d = root / pack
    return d if d.is_dir() else None


def load_archived_license_body(norm, current=""):
    """license-text 无 body 时，回退读 font-licenses 仓 LICENSE。"""
    if (current or "").strip():
        return current
    d = license_pack_dir(norm)
    if not d:
        return ""
    lic_path = d / "LICENSE"
    if not lic_path.is_file():
        return ""
    return lic_path.read_text("utf-8", errors="replace").strip()


def merge_license_artifacts(norm, arts):
    """合并 JSON artifacts、本地 PDF、已知 OSS 链接。"""
    out = []
    seen = set()

    def add(item):
        href = (item.get("href") or "").strip()
        if not href or href in seen:
            return
        seen.add(href)
        out.append(item)

    for a in arts or []:
        if isinstance(a, dict):
            add(a)
    key = _norm_key(norm)
    # 构建期拷到 /assets/licenses/{norm}/license.pdf（沿用条目 norm 大小写）
    local_pdf = "/assets/licenses/%s/license.pdf" % norm
    pack = license_pack_dir(norm)
    if pack and (pack / "license.pdf").is_file():
        add({"kind": "pdf", "href": local_pdf, "label": "归档 PDF 原件"})
    oss = _OSS_LICENSE_HREF.get(key)
    if oss:
        href, kind, lab = oss
        add({"kind": kind, "href": href, "label": lab})
    return out


def copy_license_files(fonts):
    """把 font-licenses 里的 PDF 拷进 dist，供许可页展示。

    共用包（如仓耳 cexwz）会同时拷到各引用 norm 目录。
    """
    root = font_licenses_root()
    if not root:
        return 0
    # pack_name -> {page_norm, ...}  page_norm 保持条目原有大小写
    needed = {}
    for f in fonts:
        norm = f["norm"]
        pack_name = license_pack_name(norm)
        pdf = root / pack_name / "license.pdf"
        if not pdf.is_file():
            continue
        needed.setdefault(pack_name, set()).add(norm)
    n = 0
    for pack_name, norms in needed.items():
        pdf = root / pack_name / "license.pdf"
        for norm in norms:
            dest_dir = DIST / "assets" / "licenses" / norm
            dest_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(pdf, dest_dir / "license.pdf")
            n += 1
    return n


_EV_EVENT_ZH = {
    "archive": "归档",
    "reverify": "复核",
    "source_moved": "出处变更",
    "hash_changed": "哈希变更",
}


def evidence_block(f, lic_obj):
    """文末证据层：来源 · 日期 · 方式；哈希；多条才列快照。不含保留名。"""
    lic_o = lic(f)
    ev0 = lic_obj.get("evidence") if isinstance(lic_obj.get("evidence"), dict) else {}
    src = lic_o.get("sourceUrl") or ev0.get("url") or ""
    fetched = lic_o.get("fetchedAt") or ev0.get("fetchedAt") or ""
    sha = lic_o.get("textSha256") or ev0.get("textSha256") or ""
    method = (ev0.get("method") or "").strip()
    source_lab = (ev0.get("source") or "").strip()

    if not (src or fetched or sha or method or source_lab):
        return ""

    bits = []
    if src:
        host = ""
        try:
            from urllib.parse import urlparse
            host = urlparse(src).netloc
        except Exception:
            pass
        bits.append(
            '<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>'
            % (e(src), e(host or src))
        )
    if fetched:
        bits.append(e(fetched))
    if source_lab or method:
        # 数据文件里 evidence.source 存的是内部词「上游仓原文」，渲染层统一映射
        lab = {"上游仓原文": "官方仓原文", "上游原文": "官方仓原文", "上游仓/官方原文": "官方仓/官方原文"}.get(source_lab, source_lab)
        bits.append(_how_dual(lab or method, method or source_lab))
    line = '<p class="licn-ev-line">%s</p>' % " · ".join(bits) if bits else ""

    hash_html = ""
    if sha:
        hash_html = (
            '<p class="licn-ev-hash">'
            '%s '
            '<span class="mono" data-lic-hash>%s</span>'
            '<button type="button" class="licn-copy" data-lic-copy="%s">复制</button>'
            "</p>" % (_how_dual("文本哈希", "textSha256"), e(sha), e(sha))
        )

    hist = list(ev0.get("history") or [])
    hist_html = ""
    # 仅一条且与当前快照同日时不重复列；多条才展开
    if len(hist) > 1:
        items = []
        for h in hist:
            ev = h.get("event") or "archive"
            bits_h = [
                e(h.get("at") or "—"),
                _how_dual(_EV_EVENT_ZH.get(ev, ev), ev),
            ]
            if h.get("note"):
                note = {"上游仓原文": "官方仓原文"}.get(h["note"], h["note"])
                bits_h.append(e(note))
            if h.get("textSha256"):
                bits_h.append(
                    '<span class="for-dev mono">%s…</span>'
                    % e((h["textSha256"] or "")[:12])
                )
            items.append("<li>%s</li>" % " · ".join(bits_h))
        hist_html = (
            '<p class="licn-ev-h">%s</p>'
            '<ol class="licn-timeline">%s</ol>'
            % (_how_dual("变更", "evidence.history"), "".join(items))
        )

    how = '<p class="licn-how">说明见<a href="/how/">我们怎么核验</a>。</p>'
    return (
        '<section class="licn-evidence" aria-label="取证记录">'
        '<p class="label">%s</p>'
        "%s%s%s%s</section>" % (_how_dual("取证记录", "evidence"), line, hash_html, hist_html, how)
    )


def page_license(f, licenses):
    """许可原文：A 开源双栏 / B 厂商阅读器 / C 空档。"""
    norm = f["norm"]
    tp = _text_path(norm)
    text_data = json.loads(tp.read_text("utf-8")) if tp else None
    lic_meta = licenses.get(norm) or {}
    lic_obj = dict(lic_meta or {})
    if text_data:
        lic_obj.update(text_data)

    title = lic_obj.get("title") or f.get("licenseName") or "许可原文"
    body_text = load_archived_license_body(norm, lic_obj.get("body") or "")
    body_zh = (lic_obj.get("bodyZh") or "").strip()
    lic_o = lic(f)
    # 回填 body 后再判型（有归档正文即可展示；厂商款仍走 vendor）
    if body_text and not (lic_obj.get("body") or "").strip():
        lic_obj = dict(lic_obj)
        lic_obj["body"] = body_text
    kind = license_kind_of(f, lic_obj)
    names = rfn_names(f)
    words, rights_note, _rk = rights(f)
    spdx = spdx_of(f) or f.get("licenseName") or "—"

    if (not body_zh and spdx == "OFL-1.1" and kind == "open") or lic_obj.get("translationRef") == "ofl-1.1-zh":
        shared = ofl_zh_shared()
        if not body_zh:
            body_zh = (shared.get("bodyZh") or "").strip()

    face = wf(f) or f.get("en") or norm
    sha = lic_o.get("textSha256") or (lic_obj.get("evidence") or {}).get("textSha256") or ""
    dev_state = "kind=%s · textState=%s%s" % (
        kind, lic_o.get("textState") or "∅",
        (" · sha=" + sha[:8] + "…") if sha else "",
    )

    src = lic_o.get("sourceUrl") or (lic_obj.get("evidence") or {}).get("url") or ""
    acts = []
    if kind == "open" and can_attest(f):
        acts.append(ink("出授权证明", "/attest/%s/" % norm, VERB_ICO["出授权证明"]))
    if kind == "vendor" and src:
        acts.append(ink("去厂商原文", src, VERB_ICO["去厂商原文"]))
    acts.append(link("返回条目", "/source/%s/" % norm))
    if kind != "open" and can_attest(f):
        acts.append(link("授权证明", "/attest/%s/" % norm, ico=VERB_ICO["授权证明"]))
    if is_gated(f):
        acts.append(link("即用字库", "/source/%s/#slice" % norm, ico=VERB_ICO["切片工具"]))

    meta_bits = [("<span>%s</span>" % e(w)) for w in words]
    meta_bits.append("<span>%s</span>" % e(spdx))
    # 开源双栏：保留名放作者声明通栏，不在结论行重复长名单
    if names and kind != "open":
        meta_bits.append('<span class="is-rfn">保留名 %s</span>' % e("、".join(names)))
    elif names and kind == "open":
        meta_bits.append("<span>有保留名</span>")
    meta = '<p class="licn-meta">%s</p>' % "".join(meta_bits)

    if kind == "open":
        # 作者声明通栏；OFL 五段才左右对齐。右栏「译文 | 原版」
        preamble, ofl_en = split_ofl_body(body_text)
        pairs = ofl_aligned_pairs(ofl_en, body_zh) if (body_zh or ofl_en) else []

        origin = ""
        if preamble or names or lic_o.get("rfnNote"):
            rfn_bits = []
            if names:
                rfn_bits.append(
                    '<p class="licn-origin-rfn">保留名：%s。'
                    "衍生字体不得沿用，除非权利人书面同意。</p>"
                    % e("、".join(names))
                )
            if lic_o.get("rfnNote"):
                rfn_bits.append(
                    '<p class="licn-origin-rfn is-note">%s</p>'
                    % e(lic_o["rfnNote"])
                )
            # 版权原文默认折起，保留名始终外露
            more = ""
            if preamble:
                more = (
                    '<details class="licn-origin-more" open>'
                    '<summary>版权原文</summary>'
                    '<pre class="licn-pre is-en">%s</pre></details>'
                    % mark_license_text(preamble, names)
                )
            origin = (
                '<section class="licn-origin" aria-label="作者声明">'
                '<p class="licn-origin-h">作者声明</p>'
                '%s%s</section>'
                % ("".join(rfn_bits), more)
            )

        rows = []
        if pairs:
            for en_h, en_t, zh_h, zh_t in pairs:
                en_body = mark_license_text(en_t, names) if en_t else '<p class="quiet">—</p>'
                zh_body = mark_license_text(zh_t, names) if zh_t else '<p class="quiet">译文待归档。</p>'
                rows.append(
                    '<div class="licn-pair">'
                    '<div class="licn-cell">'
                    '<p class="licn-cell-h">%s</p>'
                    '<pre class="licn-pre is-en">%s</pre></div>'
                    '<div class="licn-cell">'
                    '<div data-lic-pane="zh">'
                    '<p class="licn-cell-h">%s</p>'
                    '<div class="licn-pre is-zh">%s</div></div>'
                    '<div data-lic-pane="en" hidden>'
                    '<p class="licn-cell-h">原版（无独立译文，同原文）· %s</p>'
                    '<pre class="licn-pre is-en">%s</pre></div>'
                    '</div></div>'
                    % (
                        e(en_h), en_body,
                        e(zh_h), zh_body,
                        e(en_h), en_body,
                    )
                )
        elif body_text:
            rows.append(
                '<div class="licn-pair">'
                '<div class="licn-cell"><pre class="licn-pre is-en">%s</pre></div>'
                '<div class="licn-cell">'
                '<div data-lic-pane="zh">%s</div>'
                '<div data-lic-pane="en" hidden><pre class="licn-pre is-en">%s</pre></div>'
                '</div></div>'
                % (
                    mark_license_text(body_text if not preamble else ofl_en or body_text, names),
                    ('<div class="licn-pre is-zh">%s</div>' % mark_license_text(body_zh, names))
                    if body_zh else '<p class="quiet">译文待归档。</p>',
                    mark_license_text(body_text if not preamble else ofl_en or body_text, names),
                )
            )
        elif not origin:
            rows.append('<p class="quiet">原文未归档。</p>')

        right_toggle = (
            '<div class="seg licn-right-seg" data-lic-lang-switch role="group" aria-label="译文或原版">'
            '<button type="button" data-lic-lang="zh" class="is-on">译文</button>'
            '<button type="button" data-lic-lang="en">原版</button>'
            '</div>'
            if (body_zh or pairs) else ""
        )
        dual = ""
        if rows:
            dual = (
                '<div class="licn-dual" data-lic-lang-root data-lang="zh">'
                '<div class="licn-dual-head">'
                '<div class="licn-dual-h">'
                '<div class="licn-dual-lab">'
                '原文</div>'
                '<div class="licn-dual-right">%s</div></div>'
                '</div>%s</div>'
                % (right_toggle, "".join(rows))
            )
        sheet = origin + dual
        kick = "许可原文"
    elif kind == "vendor":
        arts = merge_license_artifacts(norm, lic_obj.get("artifacts") or [])
        reader = []
        note = (f.get("visitorNote") or "").strip()
        if body_text:
            reader.append(
                '<p class="licn-vendor-lab">归档原文</p>'
                '<pre class="licn-pre is-zh">%s</pre>' % mark_license_text(body_text, names)
            )
            if note:
                reader.append(
                    '<p class="licn-vendor-sum for-design"><span class="licn-vendor-lab">要点</span>%s</p>'
                    % e(note)
                )
        else:
            reader.append(
                '<p class="licn-vendor-note">'
                "本站还没有可展示的授权原文归档。请先获取字型查阅。"
                "</p>"
            )
            if note:
                reader.append(
                    '<p class="licn-vendor-sum for-design"><span class="licn-vendor-lab">本站摘记</span>%s</p>'
                    % e(note)
                )
        if src and not any((a.get("href") == src) for a in arts):
            arts.append({"kind": "html", "href": src, "label": "去厂商出处"})
        art_bits = []
        for a in arts:
            href = a.get("href") or ""
            lab = a.get("label") or a.get("kind") or "附件"
            k = a.get("kind") or "text"
            if not href:
                continue
            if k == "image":
                art_bits.append(
                    '<figure class="licn-art"><img src="%s" alt="%s"><figcaption>%s</figcaption></figure>'
                    % (e(href), e(lab), e(lab))
                )
            elif k == "pdf":
                art_bits.append(
                    '<figure class="licn-art is-pdf">'
                    '<figcaption>%s</figcaption>'
                    '<iframe class="licn-pdf" src="%s" title="%s"></iframe>'
                    '<p>%s</p></figure>'
                    % (e(lab), e(href), e(lab), ink("打开 PDF", href, VERB_ICO["打开 PDF"]))
                )
            else:
                art_bits.append(
                    '<p class="licn-art">%s</p>' % ink(lab, href)
                )
        if art_bits:
            reader.append(
                '<p class="licn-vendor-lab">原件</p>'
                '<div class="licn-arts">%s</div>' % "".join(art_bits)
            )
        sheet = '<div class="licn-reader">%s</div>' % "".join(reader)
        lead = (
            "%s。以下为归档的厂商授权原文。" % e(face)
            if body_text else
            "%s。厂商协议以出处原文为准。" % e(face)
        )
        kick = "厂商协议"
    else:
        ts_empty = lic_o.get("textState") or "∅"
        sheet = (
            '<p class="quiet">这一款许可尚未收入文本。'
            "%s或<a href=\"/gap/?norm=%s\">报缺收录</a>。"
            '<span class="for-dev mono"> · textState=%s</span></p>'
            % (
                ('可先<a href="%s" target="_blank" rel="noopener">获取字型</a>，' % e(src)) if src else "",
                e(norm),
                e(ts_empty),
            )
        )
        lead = "%s。许可原文还没有核对记录。" % e(face)
        kick = "待归档"

    if kind == "open":
        # 商用结论留给条目页；许可页导语只说原文
        lead = "%s。以下为归档许可原文。" % e(face)

    body = page_head(
        face, lead,
        crumbs=[("/license/", "授权"), (None, face)],
        kicker=kick,
        dev="/license/%s · %s" % (norm, dev_state),
        sub=title if title and title != face else "",
    )
    body += '<div class="licn">'
    body += meta
    body += '<p class="acts licn-acts">%s</p>' % "".join(acts)
    body += sheet
    body += evidence_block(f, lic_obj)
    body += "</div>"
    licn_desc = "%s 的许可原文（%s）。本站不二次授权，以本页归档文本为准。" % (face, spdx)
    return layout(
        "license", "%s 授权" % face, body, "/license/%s" % norm,
        extra_head=pages_css("license-norm"), body_class="page-license-norm",
        desc=licn_desc,
        jsonld=seo.graph(
            seo.creative_work(face, "/license/%s/" % norm, description=licn_desc,
                              license_url="/license/%s/" % norm, identifier=norm,
                              alternate=(f.get("en") or "")),
            seo.breadcrumb([("/", "首页"), ("/license/", "授权"), (None, face)]),
        ),
    )


def foundries(fonts):
    groups_map = OrderedDict()
    for f in fonts:
        s = f.get("foundrySlug") or "unknown"
        if s not in groups_map:
            groups_map[s] = {"slug": s, "name": f.get("foundry") or "未标注", "fonts": []}
        groups_map[s]["fonts"].append(f)
    groups = list(groups_map.values())
    groups.sort(key=lambda g: (1 if g["slug"] == "unknown" else 0, -len(g["fonts"])))
    return groups


def foundry_card(g):
    top3 = g["fonts"][:3]
    faces_list = ['<a href="/source/%s/">%s</a>' % (e(f["norm"]), e(wf(f))) for f in top3]
    faces = '<span class="meta-sep"> · </span>'.join(faces_list)
    if len(g["fonts"]) > 3:
        faces += '<span class="meta-sep"> · </span>另 %d 款' % (len(g["fonts"]) - 3)
    return (
        '<li class="foundry-card">'
        '<a class="name" href="/foundry/%s/">%s</a>'
        '<p class="count">%d 款</p>'
        '<p class="faces">%s</p>'
        '</li>'
        % (e(g["slug"]), e(g["name"]), len(g["fonts"]), faces)
    )


def font_specimen_card(f, offer=None):
    take_cls = " act is-take" if can_take(f) else " act"
    if offer == "slice" and slice_gate_of(f):
        href = "/source/%s/#slice" % f["norm"]
        action_text = "领取切片包"
    elif can_take(f):
        href = "/source/%s/" % f["norm"]
        action_text = "下载原件"
    else:
        href = "/source/%s/" % f["norm"]
        action_text = "查看字型"

    st_word = status_word(f)
    st_cls = status_class(f)
    chip = "" if can_take(f) else ('<span class="status %s">%s</span>' % (st_cls, e(st_word)))

    meta_bits = []
    if f.get("foundry"):
        meta_bits.append('<a href="/foundry/%s/">%s</a>' % (e(f.get("foundrySlug") or "unknown"), e(f["foundry"])))
    if f.get("licenseName") and f["licenseName"] != st_word:
        meta_bits.append('<span class="meta-lic">%s</span>' % e(f["licenseName"]))

    meta_html = '<span class="meta-sep">·</span>'.join(meta_bits)
    if chip:
        meta_html = (meta_html + " " if meta_html else "") + chip

    return (
        '<li class="specimen">'
        '<div class="head">'
        '<a class="name" href="/source/%s/">%s</a>'
        '<p class="meta">%s</p>'
        '</div>'
        '<a class="%s" href="%s">%s</a>'
        '<a class="preview t-%s" href="/source/%s/">%s</a>'
        '</li>'
        % (
            e(f["norm"]), e(wf(f)),
            meta_html,
            take_cls.strip(), e(href), e(action_text),
            e(f["norm"]), e(f["norm"]), PROOF
        )
    )


def page_foundries(groups):
    """厂商索引：行样式与目录同一套；可搜厂商名。"""
    n = sum(len(g["fonts"]) for g in groups)
    items = []
    for g in groups:
        hay = " ".join(filter(None, [g.get("name"), g.get("slug")])).lower()
        items.append(
            '<li data-hay="%s"><a class="lrow" href="/foundry/%s/">'
            '<span class="lnm">%s</span>'
            '<span class="lrel">%d 款</span>'
            '<span class="lgo">看目录</span></a></li>'
            % (e(hay), e(g["slug"]), e(g["name"]), len(g["fonts"]))
        )
    body = page_head(
        "厂商",
        "按出品方编目。点进去是该组织名下的款。",
        crumbs=[("/source/", "目录"), (None, "厂商")],
        dev="/foundry · foundrySlug · %d orgs · %d fonts" % (len(groups), n),
    )
    body += (
        '<div class="src-layout">'
        '<div class="src-main">'
        '<div class="src-band">'
        '%s'
        '<p class="count" data-count>%d 家</p>'
        '</div>'
        '%s'
        '</div></div>'
        % (
            search(action="/foundry/", ph="厂商名、目录编号…", live=True),
            len(groups),
            (
                '<ul class="lin-list" data-list data-page-size="24" data-unit="家">%s</ul>'
                '%s'
                '<nav class="pager" data-pager hidden></nav>'
                % ("".join(items),
                   empty_html('没有匹配的厂商。换个名字，或<a href="/gap/?kind=catalog">报缺收录</a>。', hidden=True))
            ) if items else
            '<p class="quiet">还没有按厂商归类的条目。</p>',
        )
    )
    fd_desc = "按厂商浏览开源字体目录。"
    return layout(
        "foundry", "厂商", body, "/foundry",
        extra_head=pages_css("source", "foundry"),
        body_class="page-source page-foundry page-foundries",
        desc=fd_desc,
        jsonld=seo.graph(seo.collection_page("厂商", "/foundry/", fd_desc),
                         seo.breadcrumb([("/", "首页"), (None, "厂商")])),
    )


def page_foundry(g):
    body = page_head(
        g["name"],
        "目录里归属「%s」的字体。能下载的直接下载。" % e(g["name"]),
        crumbs=[("/foundry/", "厂商"), (None, g["name"])],
        dev="/foundry/%s · %d" % (g["slug"], len(g["fonts"])),
    )
    body += (
        '<div class="src-layout">'
        '<div class="src-main">'
        '<div class="src-band">'
        '%s'
        '<p class="count" data-count>%d 款</p>'
        '</div>'
        '%s</div></div>'
        % (
            search(action="/foundry/%s/" % g["slug"], ph="中文名、英文、目录编号…", live=True),
            len(g["fonts"]),
            index_rows(g["fonts"], list_attrs='data-page-size="20"') if g["fonts"] else
            '<p class="quiet">没有这一类。换一个筛选，或<a href="/source/">回目录</a>。</p>',
        )
    )
    g_desc = "%s 出品的开源与免费商用字体，文风开源目录收录。" % g["name"]
    return layout(
        "foundry", g["name"], body, "/foundry/%s" % g["slug"],
        extra_head=pages_css("source", "foundry"),
        body_class="page-source page-foundry",
        desc=g_desc,
        jsonld=seo.graph(
            seo.collection_page(g["name"], "/foundry/%s/" % g["slug"], g_desc),
            seo.breadcrumb([("/", "首页"), ("/foundry/", "厂商"), (None, g["name"])]),
        ),
    )


def page_attest_index(fonts):
    """出证入口：办事台（表单 + 边界）；第二屏仅四项办事。无下挂可出证列表。"""
    ok = [f for f in fonts if can_attest(f)]
    opts = "".join(
        '<option value="%s">%s · %s</option>' % (e(f["norm"]), e(wf(f)), e(spdx_of(f)))
        for f in ok
    )
    # 不用 page_head：它在有 dev 时会挂 crumb；本页只要 kicker + 玄宗题 + 导语
    mast = (
        '<header class="page-mast">'
        '<p class="ph-kicker">核验</p>'
        '<h1 class="xxzt">授权证明</h1>'
        '<p class="ph-lead for-design">采用标准开源协议的字体，由文派（广州）科技有限公司出具商用证明（合规使用凭证，非授权书），'
        "并完整记录授权链、协议和原文哈希。</p>"
        '<p class="ph-lead for-dev mono">/attest · SPDX · ledger</p>'
        "</header>"
    )
    form = (
        '<form class="form at-form" action="/attest/go/" method="get" data-attest-form>'
        '<label><span>字体</span>'
        '<select name="norm" required>%s</select></label>'
        '<div class="two">'
        '<label><span>持证单位（可选）</span>'
        '<input name="holder" placeholder="只印在这一份副本上" autocomplete="organization">'
        '</label>'
        '<label><span>统一社会信用代码（可选）</span>'
        '<input name="uscc" placeholder="91440101MA…" autocomplete="off">'
        '</label></div>'
        '<fieldset><legend>用途</legend><div class="checks">'
        '<label><input type="checkbox" name="usage" value="web" checked>网页嵌入</label>'
        '<label><input type="checkbox" name="usage" value="print">印刷物料</label>'
        '<label><input type="checkbox" name="usage" value="embed">软件内嵌</label>'
        '<label><input type="checkbox" name="usage" value="modify">修改衍生</label>'
        '<label><input type="checkbox" name="usage" value="redistribute">再分发</label>'
        '</div></fieldset>'
        '<p class="acts"><button class="btn btn-ink" type="submit">%s生成授权证明</button></p>'
        '</form>'
    ) % (opts, icon("certificate"))
    bound = aside(
        "出证边界",
        kv_rows([
            ("签发方", _how_dual("文派（广州）科技有限公司，逐款核对许可原文后出具", "issuer · not rightsholder")),
            ("适用范围", _how_dual("OFL、MIT、Apache 等标准开源协议的字体，商用凭证", "SPDX only")),
            ("不予出证", _how_dual("厂商自拟协议、尚未核实、未收录的字体", "custom / unverified / unlisted")),
            ("如何核验", _how_dual("每份证明有唯一编号，在核验页输入即可比对原文", "serial ∈ ledger")),
        ], words=True),
        '<a href="/legal/#legal-scope">出证范围</a><p class="aside-note">出证服务完全免费。企业如有严苛的字体备案要求，文派科技可另行提供专项《服务合约》商业合同。</p>',
    ).replace('<aside class="aside">', '<aside class="aside" id="attest-bound">', 1)
    more = (
        '<nav class="at-more" aria-label="核验还能办的事">'
        '<p class="label">核验还能办的事</p>'
        '<div class="at-more-grid">%s</div></nav>'
        % "".join(
            '<a href="%s"><span class="t">%s%s</span><span class="d">%s</span></a>'
            % (h, icon(ico), e(t), e(g))
            for h, ico, t, g in (
                ("/attest/verify/", "verified", "核对一份 JSON", "粘贴到核验页，比对内容是否被改动"),
                ("/attest/ledger/", "history", "证明记录", "每份证明签发即登记"),
                ("/v/", "search", "证书查验", "编号与持证单位两项信息"),
                ("/source/", "scissors", "即用字库", "进目录对应条目领取"),
            )
        )
    )
    body = (
        '%s<div class="at-desk"><div class="at-desk-main">%s%s</div>%s</div>'
        % (mast, form, more, bound)
    )
    at_desc = "标准开源协议字体的商用证明在线申领，完整记录授权链、协议和原文哈希。"
    return layout(
        "attest", "授权证明", body, "/attest",
        extra_head=pages_css("attest"),
        body_class="page-attest",
        desc=at_desc,
        jsonld=seo.graph(seo.collection_page("授权证明", "/attest/", at_desc),
                         seo.breadcrumb([("/", "首页"), (None, "授权证明")])),
    )


def page_attest(f):
    """单款证书页：通栏标题；左徽章 / 右证面（按钮在证面顶栏）。证面不动。"""
    name = wf(f)
    mast = (
        '<header class="page-mast atn-mast">'
        '<p class="atn-back"><a href="/attest/">← 出证入口</a></p>'
        '<h1 class="xxzt">%s 授权证明</h1>'
        '<p class="ph-lead">这款字体的商用合规凭证：许可授权链、开源协议与原文哈希，一页看全。可打印存档（浏览器另存为 PDF），证面可切极简。</p>'
        '<p class="ph-lead for-dev mono">/attest/%s · classic|minimal</p>'
        "</header>"
    ) % (e(name), e(f["norm"]))
    side = (
        '<aside class="atn-side no-print">'
        '<section class="atn-note">'
        '<p class="label">说明</p>'
        '<p class="atn-note-p">这份证明记录许可核验结果：授权来源、开源协议与原文存档。它并非著作权人出具；使用边界仍以许可原文为准。</p>'
        '<p class="atn-note-p">归档请用「下载 PDF」另存；编号可在查验页核对。</p>'
        '</section>'
        '<section class="atn-links">'
        '<p class="label">相关链接</p>'
        '<a class="btn atn-link-btn" href="/license/%s/">许可原文</a>'
        '<a class="btn atn-link-btn" href="/attest/ledger/">证明记录</a>'
        '</section>'
        '<section class="atn-embed" data-share>'
        '<p class="label">嵌入徽章</p>'
        '<p class="atn-embed-lead">可选嵌入网站，对外标明本项目字体已完成合规核验；点击回到本页。</p>'
        '<div class="atn-embed-controls">'
        '<div class="seg atn-badge-pick" data-badge-variants role="group" aria-label="徽章样式">'
        '<button type="button" class="is-on" data-badge-kind="plaque">卡片式</button>'
        '<button type="button" data-badge-kind="dark">深色底</button>'
        '<button type="button" data-badge-kind="slim">横条</button>'
        "</div>"
        '<div class="seg atn-badge-tone" data-badge-tone hidden role="group" aria-label="横条黑白">'
        '<button type="button" class="is-on" data-badge-tone-v="slim-ink">黑</button>'
        '<button type="button" data-badge-tone-v="slim-paper">白</button>'
        "</div></div>"
        '<p class="atn-embed-badge is-wait" data-badge-slot>'
        '<span class="atn-embed-ph" aria-hidden="true">徽章预览</span>'
        '<img class="share-badge" data-badge-img alt="授权证明徽章预览" hidden>'
        '</p>'
        '<pre class="code is-wait" data-embed>正在生成嵌入代码…</pre>'
        '<p class="acts">'
        '<button class="btn" type="button" data-copy disabled>%s<span data-copy-label>复制嵌入代码</span></button>'
        '<a class="btn is-disabled" href="#" data-badge-dl aria-disabled="true">%s下载 SVG</a>'
        "</p></section></aside>"
    ) % (e(f["norm"]), icon("copy"), icon("download"))
    stage = (
        '<div class="atn-main">'
        '<div class="atn-panel">'
        '<div class="atn-toolbar no-print" data-cert-tools hidden>'
        '<div class="atn-tools-main">'
        '<button class="btn btn-ink" type="button" data-pdf>%s下载 PDF（A4）</button>'
        '<button class="btn" type="button" data-print>打印</button>'
        '<button class="btn" type="button" data-json>%sJSON</button>'
        "</div>"
        '<div class="atn-tools-end">'
        '<div class="seg atn-switch" data-cert-switcher role="group" aria-label="证面样式">'
        '<button type="button" class="is-on" data-cert-style="classic">经典</button>'
        '<button type="button" data-cert-style="minimal">极简</button>'
        "</div>"
        '<div class="seg atn-script" data-cert-script role="group" aria-label="简繁">'
        '<button type="button" class="is-on" data-cert-script-v="hans">简</button>'
        '<button type="button" data-cert-script-v="hant">繁</button>'
        "</div></div></div>"
        '<div class="cert-stage atn-stage" data-cert data-norm="%s"%s>'
        '<div class="atn-stage-wait" role="status">'
        '<p class="quiet">正在生成证明…</p>'
        '<div class="atn-stage-skel" aria-hidden="true"></div>'
        '</div></div></div></div>'
    ) % (
        icon("download"), icon("code"), e(f["norm"]),
        (' data-face-family="%s"' % e(f["family"])) if f.get("family") else "",
    )
    extra = pages_css("attest-norm")
    spdx_w = spdx_of(f) or "未记录"
    sha_w = lic(f).get("textSha256") or "未记录"
    facts = (
        '<section class="atn-facts" aria-label="核验事实">'
        "<p>字体 <strong>%s</strong>（%s）。SPDX %s。许可原文 SHA-256：%s。</p>"
        '<p>本页证明记录核验结果，不是著作权人出具的授权书。使用边界以<a href="/license/%s/">许可原文</a>为准。</p>'
        "</section>"
    ) % (e(name), e(f["norm"]), e(spdx_w), e(sha_w), e(f["norm"]))
    body = "%s%s<div class=\"atn-layout\">%s%s</div>" % (mast, facts, side, stage)
    atn_desc = "%s 授权证明。SPDX %s。记录核验结果，不是著作权人授权书。" % (name, spdx_w)
    return layout(
        "attest", "%s 授权证明" % name, body, "/attest/%s" % f["norm"],
        extra_head=extra,
        body_class="page-attest-norm",
        desc=atn_desc,
        jsonld=seo.graph(
            seo.creative_work(name + " 授权证明", "/attest/%s/" % f["norm"],
                              description=atn_desc, license_url="/license/%s/" % f["norm"],
                              identifier=f["norm"]),
            seo.breadcrumb([("/", "首页"), ("/attest/", "核验"), (None, name)]),
        ),
    )
def page_attest_go():
    return layout("attest", "生成授权证明", page_head("正在跳转", "按所选字体打开证书页。", kicker="核验", dev="/attest/go") + '<p class="quiet" data-attest-go>正在跳转…</p>')


def page_verify():
    body = page_head(
        "核对",
        "把下载的证明 JSON 贴进来，核对编号和内容有没有被改过。",
        crumbs=[("/attest/", "核验"), (None, "核对")],
        kicker="核验",
        dev="/attest/verify",
    )
    body += (
        '<div class="split at-tool"><div>'
        '<form class="form" data-verify>'
        '<label><span>证明 JSON</span>'
        '<textarea name="json" rows="12" '
        'placeholder=\'{ "type": "wenfeng.attestation.v1", … }\'></textarea></label>'
        '<p class="acts"><button class="btn btn-ink">%s核对</button></p></form>'
        '<div data-out></div></div>%s</div>'
        % (
            icon("verified"),
            aside(
            "说明",
            kv_rows([
                ("核对方式", _how_dual("平台密钥校验 JSON 完整性", "platform key")),
                ("效力", _how_dual("核对内容是否被改动；不构成司法意义上的电子签章", "not e-sign")),
                ("另见", '<a href="/attest/ledger/">证明记录</a>'),
            ], words=True),
            ),
        )
    )
    return layout(
        "attest", "核对证明", body, "/attest/verify",
        extra_head=pages_css("attest"),
        body_class="page-attest page-attest-tool",
    )


def page_ledger():
    body = page_head(
        "证明记录",
        "每份证明签发即登记。编号查不到的，按伪造处理。",
        crumbs=[("/attest/", "核验"), (None, "证明记录")],
        kicker="核验",
        dev="/attest/ledger",
    )
    body += (
        '<div class="at-tool" data-ledger>'
        '<div class="atn-stage-wait" data-ledger-wait role="status">'
        '<p class="quiet">正在读取证明记录…</p>'
        '<div class="ledger-skel" aria-hidden="true">'
        '<i></i><i></i><i></i><i></i><i></i>'
        '</div></div>'
        '<span class="for-dev mono"> · GET ledger</span></div>'
    )
    return layout(
        "attest", "证明记录", body, "/attest/ledger",
        extra_head=pages_css("attest"),
        body_class="page-attest page-attest-tool",
    )


def page_lookup():
    body = page_head(
        "查证",
        "输入证明编号和持证单位，两项一致即显示证书信息。",
        crumbs=[(None, "查证")],
        kicker="核验",
        dev="/v · serial + holder",
    )
    body += (
        '<div class="split at-tool"><div>'
        '<form class="form" data-lookup><div class="two">'
        '<label><span>证明编号</span>'
        '<input name="s" placeholder="WF-…" required></label>'
        '<label><span>持证单位</span>'
        '<input name="holder" placeholder="与证明一致；通用记录填「通用核验记录」" required>'
        '</label></div>'
        '<p class="acts"><button class="btn btn-ink">%s查验</button></p></form>'
        '<div data-out></div></div>%s</div>'
        % (
            icon("search"),
            aside(
            "说明",
            kv_rows([
                ("两项信息", _how_dual("编号与持证单位须与证明完全一致", "serial + holder")),
                ("通用记录", _how_dual("未填单位时，持证单位填「通用核验记录」", "holder = 通用核验记录")),
                ("查不到", _how_dual("编号在证明记录里查不到，按伪造处理", "miss → forged")),
            ], words=True),
            ),
        )
    )
    return layout(
        "v", "查证", body, "/v",
        extra_head=pages_css("attest"),
        body_class="page-attest page-attest-tool",
        desc='输入证书编号，核对授权证明的内容与签名。',
    )


def origin_for_gate(f):
    cands = []
    for u in (upstream(f), lic(f).get("sourceUrl")):
        if not u or not str(u).startswith("http"):
            continue
        u = str(u)
        if "openfontlicense.org" in u:
            continue
        m = re.match(r"https://raw\.githubusercontent\.com/([^/]+)/([^/]+)/", u)
        if m:
            u = "https://github.com/%s/%s" % (m.group(1), m.group(2))
        if u not in cands:
            cands.append(u)
    if not cands:
        return None
    return {"href": cands[0], "label": f.get("foundry") or "出处"}


def slice_hints(f):
    hints = []
    extra = tuple(f.get("aliases") or ())
    for x in (f.get("name"), f.get("en"), f.get("norm")) + extra:
        if x and x not in hints:
            hints.append(x)
    blob = " ".join([f.get("name") or "", f.get("en") or "", f.get("foundry") or ""])
    if re.search(r"阿里|Alibaba|PuHui|普惠", blob, re.I):
        for x in ("Alibaba", "PuHui", "普惠"):
            if x not in hints:
                hints.append(x)
    return hints


def slice_gate_of(f):
    if not f:
        return None
    g = f.get("sliceGate")
    if g and g.get("enabled"):
        return {
            "enabled": True,
            "accept": g.get("accept") or ["zip"],
            "minBytes": g.get("minBytes", 20480),
            "nameHints": g.get("nameHints") or slice_hints(f),
            "sha256": g.get("sha256"),
            "origin": g.get("origin") or origin_for_gate(f),
        }
    if is_gated(f):
        return {
            "enabled": True,
            "accept": ["zip"],
            "minBytes": 20480,
            "nameHints": slice_hints(f),
            "sha256": None,
            "origin": origin_for_gate(f),
        }
    return None


def slice_desk_html(f, bare=False, chrome="quiet"):
    """条目页领取。quiet=一颗按钮或交包后领；board=旧三步台（仅对照/旧链）。"""
    gated = is_gated(f)
    mode = "gate" if gated else "open"
    gate = slice_gate_of(f) or {
        "accept": ["zip"],
        "minBytes": 20480,
        "nameHints": slice_hints(f),
        "sha256": None,
        "origin": origin_for_gate(f),
    }
    pack_css = webfont_css_url(f)
    if gated:
        lead = "交官方尚未解压的 zip，核验后领取。原件不离开本机。"
        legal = (
            "交原包是免责核验。随后领取已上架的即用字库，"
            "不把原件再切一遍，也不构成再分发授权。"
        )
    else:
        lead = "woff2 与 CSS，供自托管。"
        legal = (
            "解压后引入 fonts.css，注释里的 "
            "https://wenfeng.org/license 要留着。"
        )
    attrs = (
        ' id="slice"'
        ' data-chrome="%s"'
        ' data-mode="%s"'
        ' data-norm="%s"'
        ' data-name="%s"'
        ' data-en="%s"'
        ' data-wf="%s"'
        ' data-foundry="%s"'
        ' data-min="%d"'
        ' data-accept="%s"'
        ' data-hints="%s"'
        ' data-sha256="%s"'
        ' data-pack-css="%s"'
        ' data-comment="%s"'
        % (
            chrome,
            mode,
            e(f["norm"]), e(f["name"]), e(f.get("en") or ""),
            e(wf(f)), e(f.get("foundry") or ""),
            gate.get("minBytes", 20480),
            e(",".join(gate.get("accept") or ["zip"])),
            e(",".join(gate.get("nameHints") or [])),
            e(gate.get("sha256") or ""),
            e(pack_css or ""),
            e(COMMENT),
        )
    )
    origin = gate.get("origin") or {}
    if origin.get("href"):
        attrs += ' data-origin="%s" data-origin-label="%s"' % (
            e(origin.get("href") or ""), e(origin.get("label") or ""),
        )
    if bare:
        return (
            '<section class="fn-slice is-bare"%s>'
            '<div data-slice-body></div>'
            '</section>'
            % attrs
        )
    if chrome == "quiet":
        return (
            '<section class="fn-slice is-quiet"%s>'
            '<p class="fn-label">即用字库</p>'
            '<p class="fn-slice-lead">%s</p>'
            '<div data-slice-body></div>'
            '<p class="tool-legal">%s</p>'
            '</section>'
            % (attrs, e(lead), e(legal))
        )
    return (
        '<section class="fn-slice"%s>'
        '<p class="fn-label">即用字库</p>'
        '<p class="fn-slice-lead">%s</p>'
        '<div data-slice-body></div>'
        '<p class="tool-legal">%s</p>'
        '</section>'
        % (attrs, e(lead), e(legal))
    )


def page_redirect(to):
    return seo.redirect_page(to)


def page_slices(fonts=None):
    return page_redirect("/source/")


def page_slice(f, fonts=None):
    return seo.redirect_page("/source/%s/" % f["norm"], wf(f))

_READ_DESC = {
    "how": "收录门槛、许可留证、原件与切片规则、授权证明签发，以及目录五态含义。",
    "legal": "文风开源的法律声明：出证范围、许可解读、异议与下架流程。",
}


def _how_status_sidebar():
    """怎么核侧栏：五态人话与 STATUS / offer 字段一致。"""
    missing = (
        "还没收进目录。许可已核对的，原文可直接查阅；"
        '想让它上架，可到<a href="/gap/">报缺</a>。'
    )
    pending = "许可原文还没有核对记录，核对完成前不提供文件、不出证明。"
    return aside(
        "五态",
        kv_rows([
            ("本站下载", _how_dual(STATUS["source"][1], "status=source · offer=source")),
            ("官方下载", _how_dual(STATUS["jump"][1], "status=jump · offer=jump")),
            ("暂无下载", _how_dual(STATUS["ready"][1], "status=ready · offer=pending · textState=full")),
            ("待核实", _how_dual(pending, "status=pending · offer=pending · textState≠full")),
            ("未收录", _how_dual(missing, "status=missing · offer=missing")),
        ], words=True),
    ).replace('<aside class="aside">', '<aside class="aside" id="how-status">', 1)

def _read_layout(section, title, body, path, jsonld=None):
    return layout(
        section, title, body, path,
        body_class="page-read page-%s" % section,
        extra_head=pages_css("read"),
        desc=_READ_DESC.get(section, ""),
        jsonld=jsonld,
    )


def page_use():
    paths = (
        '<div class="gate-paths" aria-label="三条去向">'
        '<div class="gate-path" id="path-file">'
        '<span class="gate-n">01</span>'
        '<span class="gate-path-name xxzt">原件</span>'
        '<span class="gate-path-line">字体、字型原始的 TTF / OTF 或官方归档。'
        '<span class="for-dev mono"> · /source</span></span>'
        '<a class="gate-go" href="/source/">目录 →</a>'
        '</div>'
        '<div class="gate-path" id="path-slice">'
        '<span class="gate-n">02</span>'
        '<span class="gate-path-name xxzt">切片</span>'
        '<span class="gate-path-line">woff2 与 CSS 格式，给 WordPress、CMS、静态站自托管。'
        '<span class="for-dev mono"> · /source/{norm}</span></span>'
        '<a class="gate-go" href="/source/">目录 →</a>'
        '</div>'
        '<div class="gate-path" id="path-web">'
        '<span class="gate-n">03</span>'
        '<span class="gate-path-name xxzt">网页</span>'
        '<span class="gate-path-line">直接引用 '
        '<code>cn.windfonts.com</code> 托管的 CSS 与子集化分片。'
        '<span class="for-dev mono"> · hosted CSS</span></span>'
        '<a class="gate-go" href="https://app.windfonts.com/" target="_blank" '
        'rel="noopener">在线选字 ↗</a>'
        '</div>'
        '</div>'
    )
    bands = (
        '<section class="gate-band" id="comment">'
        '<h2>须保留的注释</h2>'
        '<div class="gate-band-body">'
        '<p>嵌入代码里 <code>https://wenfeng.org/license</code> 这一行要留着。</p>'
        '<pre class="gate-code">__COMMENT__</pre>'
        '</div></section>'
        '<section class="gate-band" id="enqueue">'
        '<h2>切片进主题</h2>'
        '<div class="gate-band-body">'
        '<p>解压后整夹引进 <code>fonts.css</code>，不要拆。'
        '目录名保留 <code>wenfeng-</code> 前缀。</p>'
        '<pre class="gate-code">// functions.php\n'
        'wp_enqueue_style(\n'
        "  'wenfeng-xwwk',\n"
        "  get_theme_file_uri( '/fonts/wenfeng-xwwk/fonts.css' ),\n"
        '  array(),\n'
        '  null\n'
        ');\n\n'
        '@import url( "./fonts/wenfeng-xwwk/fonts.css" );</pre>'
        '<p class="quiet">按款示例见目录条目页「怎么用」。</p>'
        '</div></section>'
        '<section class="gate-band" id="api">'
        '<h2>目录 API</h2>'
        '<div class="gate-band-body">'
        '<p>查目录用下列接口。不是在线选字的 <code>/api/css</code>。'
        '商业字只出字段，<code>files</code> 为空。<code>lineage</code> 恒为 '
        '<code>null</code>。</p>'
        '<ul class="gate-api">'
        '<li><a href="/api/v1/fonts"><code>GET /api/v1/fonts</code><span>全部条目</span></a></li>'
        '<li><a href="/api/v1/fonts?offer=source"><code>GET /api/v1/fonts?offer=source</code><span>本站下载</span></a></li>'
        '<li><a href="/api/v1/fonts?q=%E9%9C%9E%E9%B9%AD"><code>GET /api/v1/fonts?q=霞鹜</code><span>按名搜</span></a></li>'
        '<li><a href="/api/v1/fonts/xwwk"><code>GET /api/v1/fonts/xwwk</code><span>一款 · 有 files</span></a></li>'
        '<li><a href="/api/v1/fonts/albbpht"><code>GET /api/v1/fonts/albbpht</code><span>files 为空</span></a></li>'
        '<li><a href="/api/v1/licenses/xwwk"><code>GET /api/v1/licenses/xwwk</code><span>许可原文</span></a></li>'
        '<li><a href="/api/v1/foundries"><code>GET /api/v1/foundries</code><span>厂商</span></a></li>'
        '<li><a href="/api/v1/certs"><code>GET /api/v1/certs</code><span>可核验目录</span></a></li>'
        '<li><a href="/api/v1/certs/xwwk"><code>GET /api/v1/certs/xwwk</code><span>一款核验 JSON</span></a></li>'
        '<li><span class="api-row"><code>POST /api/v1/certs/verify</code><span>核对本份签名</span></span></li>'
        '</ul>'
        '<pre class="gate-code gate-sample">GET /api/v1/fonts/{norm}\n'
        '{\n'
        '  "norm": "xwwk",\n'
        '  "name": "霞鹜文楷",\n'
        '  "distribution": true,\n'
        '  "offer": "source",\n'
        '  "files": [ { "kind": "archive", "href": "…" } ],\n'
        '  "lineage": null\n'
        '}</pre>'
        '<p class="gate-acts">'
        '<a href="/source/">目录</a>'
        '<a href="/license/">许可</a>'
        '</p>'
        '</div></section>'
        '<p class="gate-foot-note">核验方法见<a href="/how/">我们怎么核验</a>。</p>'
    )
    body = page_head(
        "用法",
        "文风字体提供多种用法和在线资源工具。",
        crumbs=[(None, "用法")],
        dev="/use",
    ) + paths + bands.replace("__COMMENT__", e(COMMENT))
    use_desc = "目录下载原件或切片包；网页引用 cn.windfonts.com 托管 CSS。"
    return layout(
        "use", "用法", body, "/use",
        extra_head=pages_css("gate"),
        body_class="page-gate page-use",
        desc=use_desc,
        jsonld=seo.graph(
            seo.howto("用法", "/use/", ["下载原件", "领取切片包", "网页引用托管 CSS"], use_desc),
            seo.breadcrumb([("/", "首页"), (None, "用法")]),
        ),
    )


def page_how():
    main = (
        '<ol class="read-asks" id="how-criteria">'
        '<li>'
        '<p class="read-idx">01</p>'
        '<div>'
        '<h2>许可原文</h2>'
        '<p class="read-p">能取得完整许可文本：发布包内的许可文件、官网许可页、官方仓库的 LICENSE，至少其一。仅有厂商指引、尚无全文的，先不给出下载结论。</p>'
        '</div>'
        '</li>'
        '<li>'
        '<p class="read-idx">02</p>'
        '<div>'
        '<h2>著作权人可对应</h2>'
        '<p class="read-p">条目能对应到著作权人或发布厂商，不是出处不明的转载包。</p>'
        '</div>'
        '</li>'
        '<li>'
        '<p class="read-idx">03</p>'
        '<div>'
        '<h2>官方渠道取件</h2>'
        '<p class="read-p">字体文件从作者或厂商公布的渠道取得；来路不明的打包文件不收。</p>'
        '</div>'
        '</li>'
        '</ol>'
        '<p class="read-p">三道门槛有一项过不去，就不收录。许可还在核对中的，目录标「待核实」，核对完成前不提供文件、不出证明。'
        '收录信息有误或权利异议，致信 <a href="mailto:license@wenfeng.org">license@wenfeng.org</a>；缺收录、勘误走<a href="/gap/">报缺</a>。</p>'
        '<section class="read-moment" id="how-evidence">'
        '<p class="read-idx">04</p>'
        '<h2>许可怎么留证</h2>'
        '<article class="read-art">'
        '<p class="read-p">以发布件里的声明为准，来源类型与收录门槛相同：包内许可、官网页、仓库 LICENSE。</p>'
        '<p class="read-p">存档时记下来源链接、存档日期和许可原文哈希（SHA-256）。原文换版或改字时，可与目录条目、授权证明对照。</p>'
        '<p class="read-p">每款字的许可原文与哈希，在对应的<a href="/license/">许可原文页</a>可查（路径形如 <code>/license/{目录编号}/</code>）。</p>'
        '</article>'
        '</section>'
        '<section class="read-moment" id="how-file">'
        '<p class="read-idx">05</p>'
        '<h2>原件与切片</h2>'
        '<article class="read-art">'
        '<p class="read-p">档案页第一屏写清这一款现在能不能拿、怎么拿：状态词与侧栏「五态」同义，并给出处或本站领取入口。</p>'
        '<p class="read-p">许可允许再分发、且本站托管归档包的，记录 SHA-256 供对照。不能再分发的字体，本站不存原件、不出证明；'
        '你已从官方取得原包时，在档案页用浏览器内核验（以 SHA-256 为准，文件不上传服务器）后可领取自托管切片包。'
        '边界细则见<a href="/legal/#legal-redist">法律声明</a>。</p>'
        '</article>'
        '</section>'
        '<section class="read-moment" id="how-cert">'
        '<p class="read-idx">06</p>'
        '<h2>证明怎么签</h2>'
        '<article class="read-art">'
        '<p class="read-p">仅对采用标准开源协议的字体出证，协议范围见<a href="/legal/#legal-scope">法律声明</a>。'
        '文派（广州）科技有限公司为出证责任主体，可为合法合规使用的个人及企业出具《文风字体授权证明》。'
        '证明是许可原文之外的合规使用凭证，不是著作权人的授权书（见<a href="/legal/#legal-what">法律声明</a>）。'
        '申领时填写用途（网页嵌入、印刷物料、软件内嵌、修改衍生、再分发），用途写入证明与<a href="/attest/ledger/">证明记录</a>；'
        '每份有唯一编号，签发即登记。</p>'
        '<p class="read-p">验收：到<a href="/v/">证书查验</a>或证明记录核对编号，内容须与记录一致，方为文风签发；对不上，按伪造处理。</p>'
        '</article>'
        '</section>'
        '<p class="read-acts">'
        '<a href="/source/">目录</a>'
        '<a href="/license/">许可原文</a>'
        '<a href="/attest/">授权证明</a>'
        '<a href="/legal/">法律声明</a>'
        '</p>'
        '<p class="read-foot">五态：本站下载、官方下载、暂无下载、待核实、未收录。与目录筛选、档案页状态词一致；开发视图追加 offer、textState 等字段。</p>'
    )
    body = page_head(
        "我们怎么核验",
        "这页说明收录门槛、许可留证、原件与切片、授权证明怎么签。目录与档案页的状态词，以本页为准。",
        crumbs=[(None, "我们怎么核验")],
        dev="/how",
    ) + '<div class="read-desk"><div class="read-main">%s</div>%s</div>' % (main, _how_status_sidebar())
    return _read_layout("how", "我们怎么核验", body, "/how", jsonld=seo.graph(
        seo.howto("我们怎么核验", "/how/",
                  ["核对许可原文", "对应著作权人", "从官方渠道取件", "许可留证", "原件与切片", "签发证明"],
                  _READ_DESC["how"]),
        seo.breadcrumb([("/", "首页"), (None, "我们怎么核验")]),
    ))


def page_legal():
    seq = '<section class="read-moment" id="m-open"><p class="read-idx">01</p><h2>打开这页</h2><article class="read-art" id="legal-oss"><h3>这页是什么</h3><p>操作说明，不是法律意见。权利以各字体许可原文为准。不能替代律师审查具体项目。</p></article><article class="read-art"><h3>谁在按原文办事</h3><p>文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。</p></article><article class="read-art" id="legal-what"><h3>证明是什么</h3><p>《文风字体授权证明》记录某日从官方渠道取得某款字、许可原文哈希、本站是否提供原件、可否按原文再分发。它用于满足档案里「要一份盖章件」的要求，是许可原文之外的合规使用凭证，不是著作权人的授权书，也不替代软著登记或公证。</p></article></section><section class="read-moment" id="m-text"><p class="read-idx">02</p><h2>对着原文</h2><article class="read-art" id="legal-scope"><h3>先看协议是不是标准开源</h3><ul class="read-pills"><li>SIL Open Font License 1.1</li><li>MIT</li><li>Apache License 2.0</li><li>IPA Font License</li><li>CC0</li><li>CC BY / CC BY-SA（不含 NC）</li><li>M+</li><li>带 Font Exception 的 GPL</li></ul><p>只有上面这些协议才出具证明。文派科技作为责任主体，可为合法合规使用的个人及企业出具证明。CC BY / CC BY-SA 出证时，证明内保留作者署名。</p><p>厂商自拟协议（如阿里巴巴普惠体授权协议）、仓耳字库免费开源字体授权声明、HarmonyOS / MiSans / OPPO 等厂商条款、只标「免费商用」而无正式协议文本的、许可还没核实的、未收录的：如有授权原文，只提供下载。不出具证明，也不代著作权人签署授权书。是否可商用，以厂商原文为准。常见条款是免费商用、禁止再分发字体文件。</p></article><article class="read-art" id="legal-ofl"><h3>OFL 在本站怎么读</h3><p>可以用于网站、印刷、软件内嵌（看原文）。可以修改、再分发，不得单独出售字体本身。保留名（Reserved Font Name）未获作者书面允许，派生版本不能用原名。切片包若只做技术子集、不改设计，仍标原名，包装可以写「文风切片包」。MIT 协议更宽松。</p></article><article class="read-art" id="legal-cn"><h3>国内把字库当什么</h3><p>字体作为计算机软件，一般按软件作品保护。单字图形是不是美术作品，法院判决并不统一，不要把「开源」理解成「字形不受保护」。开源许可是著作权人允许使用的书面条款。企业用 OFL / MIT，通常不必再向作者另签授权证明，但采购和验收仍常要归档材料。核验就是出具这份归档材料。侵权投诉仍应联系著作权人处理。</p></article><article class="read-art" id="legal-soft"><h3>文件是软件复制品</h3><p>TTF / OTF / 源工程在国内常被当作软件复制品。许可允许复制、修改、再分发时，按原文做；禁止再分发时，把文件拷进客户交付包就可能越权。本核验不代替对交付包、安装包、App 内嵌的逐项审查。</p></article></section><section class="read-moment" id="m-lines"><p class="read-idx">03</p><h2>看证上三行</h2><article class="read-art" id="legal-issuer"><h3>谁签发，名字怎么写</h3><p>签发人是文派（广州）科技有限公司。证明上的品牌名是文风，产品是 wenfeng.org。文派不是霞鹜、阿里巴巴、Adobe 等字体的著作权人。证明不是「文派授权你商用这款字」。</p><p>收录名写成「文风·」加原名，例如文风·霞鹜文楷。这是平台命名，不是派生作品，也不转移商标。文件内的版权声明、字体名称信息（name 表）、OFL 保留名仍用原名。本核验只针对未改名的收录原件或切片包。本证不写软著号。</p></article><article class="read-art"><h3>三行结论</h3><p>网页嵌入、安装到操作系统、把字体文件再分发给客户，边界不同。证上分开写三行：网页嵌入、再分发原件、本平台是否提供原件。嵌入网页 CSS 与把原件放进安装程序，不是同一件事。</p></article><article class="read-art" id="legal-sign"><h3>签名验的是改没改过</h3><p>平台密钥签名，贴到核对页即可验证内容是否被改过。它不是可靠电子签名或证书机构（CA）签发的数字证书，不能当「已公证」提交。随证明附带的 JSON 核验文件可以作辅助证据：某日平台对某哈希、某 SPDX 做过签名。印迹是视觉签章产品，与本证无关。</p></article></section><section class="read-moment" id="m-file"><p class="read-idx">04</p><h2>放进档案</h2><article class="read-art" id="legal-buy"><h3>采购留下这四样</h3><ol class="read-steps"><li>保存本核验 PDF / 打印件和 JSON。</li><li>保存许可原文（本站 <a href="/license">/license/{目录编号}</a>）。</li><li>若拿走了原件，保存当时的归档包和哈希，复核时要用。</li><li>持证单位栏只表示这一份副本放在哪家单位的档案里，不等于被授权人。</li></ol></article><article class="read-art" id="legal-redist"><h3>要带走文件的时候</h3><p>许可允许再分发、本站也提供原件的（目录里标「本站下载」）：可以按原文带走原件。厂商不允许再分发的字体：本站不提供文件，也不出证。若你已从厂商取得原件，可在 <a href="/slice">/slice/{目录编号}/</a> 上传核验后领取自托管切片包。核验在浏览器内完成：体积只作预检，识别以整包文件的哈希值（SHA-256）为准（生产对照本站收录的 SHA-256，厂商若公布 MD5 则并列）。切片核验在你的浏览器内完成：文件不上传服务器。</p><p>不要把 <code>cn.windfonts.com</code> 的 woff2 拷走当源文件。嵌入代码里的 <code>https://wenfeng.org/license</code> 不能改。OFL 禁止单独出售字体本身。厂商不允许再分发的字体，更不能卖文件。</p></article></section><section class="read-moment" id="m-mail"><p class="read-idx">05</p><h2>有异议再写信</h2><article class="read-art" id="legal-phish"><h3>还没核对的</h3><p>许可尚未核对、或源文件还没进镜像的款，不出核验。不要把在线选字能预览当成可以安装、可以再分发。仅限个人免费使用、需登录领取或含诱导性条款的许可，一律按原文判断。拿不准就当不能带走。</p></article><article class="read-art" id="legal-takedown"><h3>写给 license@wenfeng.org</h3><p>收录信息有误，或对某条目有权利主张，写信到 <a href="mailto:license@wenfeng.org">license@wenfeng.org</a>，说明是哪一条、问题在哪（权利人请附权利证明）。核实期间，该条目标为「待核实」，暂停出证，也不提供文件。确认有误就下架，变更记录留在目录状态里；在文风侧是否已下架，以核验页和目录状态为准。被下架的一方有异议，同样来信说明；是否恢复，按最新核对结果处理。</p></article><article class="read-art" id="legal-name"><h3>另走的程序</h3><p>派生件若以后出现，必须另起新名，不能带保留名。需要公证或电子认证时，另走法定程序，不要以这张证明替代。</p></article></section>'
    acts = '<p class="read-acts"><a href="/attest">授权证明</a><a href="/license">许可原文</a><a href="/how">我们怎么核验</a></p>'
    side = aside(
        "出证边界",
        kv_rows([
            ("出证", _how_dual("只给标准开源协议", "SPDX only")),
            ("不出", _how_dual("厂商自拟、待核实、未收录", "custom / unverified / unlisted")),
            ("原文", '<a href="/license/">许可原文</a>'),
            ("名单", '<a href="#legal-scope">协议范围</a>'),
            ("异议", '<a href="mailto:license@wenfeng.org">license@wenfeng.org</a>'),
        ], words=True),
    ).replace('<aside class="aside">', '<aside class="aside" id="legal-bound">', 1)
    body = page_head(
        "法律声明",
        "操作说明，不是法律意见。权利以各字体许可原文为准。",
        crumbs=[(None, "法律声明")],
        dev="/legal",
    ) + '<div class="read-desk"><div class="read-main">%s</div>%s</div>' % (seq + acts, side)
    return _read_layout("legal", "法律声明", body, "/legal", jsonld=seo.graph(
        seo.howto("法律声明", "/legal/",
                  ["打开这页", "对着原文", "看证上三行", "放进档案", "有异议再写信"],
                  _READ_DESC["legal"]),
        seo.breadcrumb([("/", "首页"), (None, "法律声明")]),
    ))



def _about_copy():
    """关于页已拍板文案（路径/站外/边界）。结构变，句子不动。"""
    lead = "文派旗下开源商用字体服务平台"
    paths = [
        ("01", "源文件", "原件与切片包，在目录按条目领取。",
         "/source/", "目录 →", "/source"),
        ("02", "许可", "许可原文存档，逐款可查。",
         "/license/", "许可 →", "/license"),
        ("03", "缺字", "缺字形、缺收录或勘误，从此处报。",
         "/gap/", "报缺 →", "/gap"),
        ("04", "证明", "标准开源协议字体，可申领授权证明。",
         "/attest/", "证明 →", "/attest"),
    ]
    else_items = [
        ("应用", "app.windfonts.com",
         "样张与网页字体。",
         "https://app.windfonts.com/", "↗", "shop", True),
        ("造字", "zaozi.wenfeng.org",
         "在线造字平台。",
         "https://zaozi.wenfeng.org/", "↗", "zaozi", True),
        ("图标", "icons.motucloud.com",
         '墨图<span class="reg">®</span>字体图标库。',
         "https://icons.motucloud.com/", "↗", "icons", True),
        ("头像", "cravatar.com",
         "互联网公认头像。",
         "https://cravatar.com/", "↗", "cravatar", True),
    ]
    stance = [
        "文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。"
        "文风字体提供的源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。",
        "从业十余载，我们经历中国互联网与各行业规则的变化，依许可与合规要求做字体收录与交付。"
        "文派生态由此展开：源站在 wenfeng.org，在线服务在 Windfonts.com。",
        "对于采用标准开源协议的字体，文派科技作为责任主体，可为合法合规使用的个人及企业出具《文风字体授权证明》，作为开源授权的证明材料。"
        "证明记录该字体在收录时的完整授权链、适用的开源协议、许可原文哈希，以及本站是否提供原件。证明与许可原文并行使用：原文定权利，证明作凭证。",
        "其他品牌厂商自行发布的授权协议，本站提供授权原文下载；该类字体的商用授权由各厂商决定，证明业务不涉及。"
        '本站服务范围、免责与责任边界，以<a href="/legal/#legal-scope">法律声明</a>为准；'
        "涉及出证范围、第三方内容与链接关系，请查阅该页完整条文。"
        "字体收录、许可核对与条目结论，按固定流程执行；依据与说明见"
        '<a href="/how/">我们怎么核验</a>。',
        '本站为非盈利公开资源站，基础设施由文风云<span class="reg">®</span>提供。',
    ]
    foot = "以上相关站点由文派生态体系独立运营。"
    return lead, paths, else_items, stance, foot


def _about_stance_html(stance):
    return "".join("<p>%s</p>" % p for p in stance)


def page_about():
    """关于：导语 + 项目说明 + 相关链接。"""
    lead, _paths, else_items, stance, foot = _about_copy()
    else_rows = []
    for name, host, line, href, go, dev, linked in else_items:
        line_vis = line if "<" in line else e(line)
        line_html = (
            '%s<span class="for-dev mono"> · %s · %s</span>'
            % (line_vis, e(host), e(dev))
        )
        if linked:
            else_rows.append(
                '<a class="gate-path" href="%s" target="_blank" rel="noopener">'
                '<span class="gate-path-name xxzt">%s</span>'
                '<span class="gate-path-line">%s</span>'
                '<span class="gate-go">%s</span></a>'
                % (e(href), e(name), line_html, e(go))
            )
        else:
            else_rows.append(
                '<div class="gate-path">'
                '<span class="gate-path-name xxzt">%s</span>'
                '<span class="gate-path-line">%s</span>'
                '<span class="gate-go is-quiet">%s</span></div>'
                % (e(name), line_html, e(go))
            )
    body = (
        page_head("关于", lead, crumbs=[(None, "关于")], dev="/about")
        + '<section class="about-stance" aria-label="项目说明">'
        '<p class="about-mark">项目说明</p>'
        '<div class="about-stance-body">%s</div></section>' % _about_stance_html(stance)
        + '<section class="about-else" aria-label="相关站点">'
        '<p class="about-mark">相关站点</p>'
        '<div class="gate-paths is-else">%s</div></section>' % "".join(else_rows)
        + '<p class="gate-foot-note">%s</p>' % e(foot)
    )
    return layout(
        "about", "关于", body, "/about",
        extra_head=pages_css("gate"),
        body_class="page-gate page-about",
        desc="文派旗下开源商用字体服务平台。源文件、许可原文与授权证明在本站；网页嵌入在 app.windfonts.com。",
        jsonld=seo.graph(seo.organization(), seo.website(with_search=True),
                         seo.breadcrumb([("/", "首页"), (None, "关于")])),
    )


def page_lab_about(variant):
    """关于对照稿。甲乙丙已否；丁展签 / 戊书目 / 己题词。活页 /about/ 不动。"""
    lead, paths, else_items, stance, foot = _about_copy()
    path = "/lab/about-%s/" % variant
    names = (("a", "甲"), ("b", "乙"), ("c", "丙"), ("d", "丁"), ("e", "戊"), ("f", "己"))
    round_keys = ("d", "e", "f") if variant in ("d", "e", "f") else ("a", "b", "c")
    self_name = dict(names)[variant]
    others = "".join(
        ' · <a href="/lab/about-%s/">看%s</a>' % (k, lab)
        for k, lab in names if k != variant and k in round_keys
    )
    flag = (
        '<p class="lab-flag">稿%s<span class="for-dev mono"> · %s</span>%s · '
        '<a href="/about/">活页未改</a></p>'
        % (self_name, path, others)
    )
    head = page_head("关于", lead, crumbs=[(None, "关于")], dev=path)
    stance_body = _about_stance_html(stance)

    if variant == "a":
        # 甲：域名树——本名四枝 + 别名两枝，边界附在树下
        branches = []
        for n, name, line, href, go, dev in paths:
            branches.append(
                '<li class="ab-tree-branch">'
                '<div class="ab-tree-line">'
                '<a class="ab-tree-path mono" href="%s">%s</a>'
                '<span class="ab-tree-name xxzt">%s</span>'
                '<a class="ab-tree-act" href="%s">%s</a></div>'
                '<p class="ab-tree-gloss">%s<span class="for-dev mono"> · %s</span></p></li>'
                % (e(href), e(dev), e(name), e(href), e(go), e(line), e(dev))
            )
        else_branches = []
        for name, host, line, href, go, dev, linked in else_items:
            act = (
                '<a class="ab-tree-act" href="%s" target="_blank" rel="noopener">%s</a>' % (e(href), e(go))
                if linked else
                '<span class="ab-tree-act is-quiet">%s</span>' % e(go)
            )
            path_el = (
                '<a class="ab-tree-path mono" href="%s" target="_blank" rel="noopener">%s</a>' % (e(href), e(host))
                if linked else
                '<span class="ab-tree-path mono is-quiet">%s</span>' % e(host)
            )
            else_branches.append(
                '<li class="ab-tree-branch">'
                '<div class="ab-tree-line">%s'
                '<span class="ab-tree-name xxzt">%s</span>%s</div>'
                '<p class="ab-tree-gloss">%s<span class="for-dev mono"> · %s</span></p></li>'
                % (path_el, e(name), act, e(line), e(dev))
            )
        inner = (
            '<div class="ab-lab is-tree">'
            '<p class="ab-tree-root"><span class="host mono">wenfeng.org</span>'
            '<span class="for-design"> 这一名下面</span>'
            '<span class="for-dev mono"> · children</span></p>'
            '<ol class="ab-tree">%s</ol>'
            '<p class="ab-tree-root is-other"><span class="for-design">别的名字</span>'
            '<span class="for-dev mono">not children</span>'
            '<span class="for-design"> · 不挂在 wenfeng.org 下面</span></p>'
            '<ol class="ab-tree is-other">%s</ol>'
            '<section class="ab-lab-stance" aria-label="边界">'
            '<p class="about-mark">边界</p>'
            '<div class="about-stance-body">%s</div></section>'
            '<p class="gate-foot-note">%s</p></div>'
            % ("".join(branches), "".join(else_branches), stance_body, e(foot))
        )
    elif variant == "b":
        # 乙：左办事四条，右边界常显；站外压成底条
        left = []
        for n, name, line, href, go, dev in paths:
            left.append(
                '<a class="ab-rail-item" href="%s">'
                '<span class="gate-n">%s</span>'
                '<span class="ab-rail-name xxzt">%s</span>'
                '<span class="ab-rail-line">%s'
                '<span class="for-dev mono"> · %s</span></span>'
                '<span class="gate-go">%s</span></a>'
                % (e(href), e(n), e(name), e(line), e(dev), e(go))
            )
        else_bits = []
        for name, host, line, href, go, dev, linked in else_items:
            body = (
                '<span class="ab-else-name xxzt">%s</span>'
                '<span class="about-else-host">%s</span>'
                '<span class="ab-else-line">%s</span>'
                % (e(name), e(host), e(line))
            )
            if linked:
                else_bits.append(
                    '<a class="ab-else-chip" href="%s" target="_blank" rel="noopener">%s'
                    '<span class="gate-go">%s</span></a>' % (e(href), body, e(go))
                )
            else:
                else_bits.append(
                    '<div class="ab-else-chip">%s<span class="gate-go is-quiet">%s</span></div>'
                    % (body, e(go))
                )
        inner = (
            '<div class="ab-lab is-split">'
            '<div class="ab-split">'
            '<nav class="ab-rail" aria-label="本站四条路径">%s</nav>'
            '<aside class="ab-side" aria-label="边界">'
            '<p class="about-mark">边界</p>'
            '<div class="about-stance-body">%s</div></aside></div>'
            '<section class="ab-else-bar" aria-label="不在本站">'
            '<p class="about-mark">相关站点</p>'
            '<div class="ab-else-row">%s</div></section>'
            '<p class="gate-foot-note">%s</p></div>'
            % ("".join(left), stance_body, "".join(else_bits), e(foot))
        )
    elif variant == "c":
        # 丙：四格展厅，站外一行，边界阅读宽
        tiles = []
        for n, name, line, href, go, dev in paths:
            tiles.append(
                '<a class="ab-tile" href="%s">'
                '<span class="gate-n">%s</span>'
                '<span class="ab-tile-name xxzt">%s</span>'
                '<span class="ab-tile-line">%s'
                '<span class="for-dev mono"> · %s</span></span>'
                '<span class="gate-go">%s</span></a>'
                % (e(href), e(n), e(name), e(line), e(dev), e(go))
            )
        else_tiles = []
        for name, host, line, href, go, dev, linked in else_items:
            bit = (
                '<span class="ab-tile-name xxzt">%s</span>'
                '<span class="about-else-host">%s</span>'
                '<span class="ab-tile-line">%s</span>'
                % (e(name), e(host), e(line))
            )
            if linked:
                else_tiles.append(
                    '<a class="ab-tile is-else" href="%s" target="_blank" rel="noopener">%s'
                    '<span class="gate-go">%s</span></a>' % (e(href), bit, e(go))
                )
            else:
                else_tiles.append(
                    '<div class="ab-tile is-else">%s<span class="gate-go is-quiet">%s</span></div>'
                    % (bit, e(go))
                )
        inner = (
            '<div class="ab-lab is-grid">'
            '<div class="ab-grid" aria-label="本站四条路径">%s</div>'
            '<section class="ab-else-grid" aria-label="不在本站">'
            '<p class="about-mark">相关站点</p>'
            '<div class="ab-grid is-else">%s</div></section>'
            '<section class="ab-lab-stance" aria-label="边界">'
            '<p class="about-mark">边界</p>'
            '<div class="about-stance-body">%s</div></section>'
            '<p class="gate-foot-note">%s</p></div>'
            % ("".join(tiles), "".join(else_tiles), stance_body, e(foot))
        )

    elif variant == "d":
        # 丁：展签。大字是展品，说明是签。无框无线。
        signs = []
        for n, name, line, href, go, dev in paths:
            signs.append(
                '<a class="ab-sign" href="%s">'
                '<span class="ab-sign-n">%s</span>'
                '<span class="ab-sign-name xxzt">%s</span>'
                '<span class="ab-sign-line">%s<span class="for-dev mono"> · %s</span></span>'
                '<span class="gate-go">%s</span></a>'
                % (e(href), e(n), e(name), e(line), e(dev), e(go))
            )
        quiet = []
        for name, host, line, href, go, dev, linked in else_items:
            inner_q = (
                '<span class="ab-quiet-name xxzt">%s</span>'
                '<span class="about-else-host">%s</span>'
                '<span class="ab-quiet-line">%s</span>'
                % (e(name), e(host), e(line))
            )
            if linked:
                quiet.append(
                    '<a class="ab-quiet" href="%s" target="_blank" rel="noopener">%s'
                    '<span class="gate-go">%s</span></a>' % (e(href), inner_q, e(go))
                )
            else:
                quiet.append(
                    '<div class="ab-quiet">%s<span class="gate-go is-quiet">%s</span></div>'
                    % (inner_q, e(go))
                )
        inner = (
            '<div class="ab-lab is-sign">'
            '<div class="ab-signs" aria-label="本站四条路径">%s</div>'
            '<section class="ab-quiet-row" aria-label="不在本站">'
            '<p class="about-mark">这些不在本站</p>%s</section>'
            '<section class="ab-lab-stance" aria-label="边界">'
            '<p class="about-mark">边界</p>'
            '<div class="about-stance-body">%s</div></section>'
            '<p class="gate-foot-note">%s</p></div>'
            % ("".join(signs), "".join(quiet), stance_body, e(foot))
        )
    elif variant == "e":
        # 戊：书目。左书名右提要，一对一行。
        rows = []
        for n, name, line, href, go, dev in paths:
            rows.append(
                '<a class="ab-folio" href="%s">'
                '<span class="ab-folio-n">%s</span>'
                '<span class="ab-folio-name xxzt">%s</span>'
                '<span class="ab-folio-copy">'
                '<span class="ab-folio-line">%s<span class="for-dev mono"> · %s</span></span>'
                '<span class="gate-go">%s</span></span></a>'
                % (e(href), e(n), e(name), e(line), e(dev), e(go))
            )
        else_rows = []
        for name, host, line, href, go, dev, linked in else_items:
            copy = (
                '<span class="ab-folio-name xxzt">%s</span>'
                '<span class="ab-folio-copy">'
                '<span class="about-else-host">%s</span>'
                '<span class="ab-folio-line">%s</span></span>'
                % (e(name), e(host), e(line))
            )
            if linked:
                else_rows.append(
                    '<a class="ab-folio is-else" href="%s" target="_blank" rel="noopener">%s'
                    '<span class="gate-go">%s</span></a>' % (e(href), copy, e(go))
                )
            else:
                else_rows.append(
                    '<div class="ab-folio is-else">%s<span class="gate-go is-quiet">%s</span></div>'
                    % (copy, e(go))
                )
        inner = (
            '<div class="ab-lab is-folio">'
            '<div class="ab-folios" aria-label="本站四条路径">%s</div>'
            '<section class="ab-folios is-else" aria-label="不在本站">'
            '<p class="about-mark">这些不在本站</p>%s</section>'
            '<section class="ab-lab-stance" aria-label="边界">'
            '<p class="about-mark">边界</p>'
            '<div class="about-stance-body">%s</div></section>'
            '<p class="gate-foot-note">%s</p></div>'
            % ("".join(rows), "".join(else_rows), stance_body, e(foot))
        )
    else:
        # 己：题词。四字横陈，说明垂下。像版权页。
        phrase = "".join(
            '<a class="ab-word xxzt" href="%s">%s</a>' % (e(href), e(name))
            for _n, name, _line, href, _go, _dev in paths
        )
        notes = []
        for n, name, line, href, go, dev in paths:
            notes.append(
                '<a class="ab-note" href="%s">'
                '<span class="ab-note-k">%s · %s</span>'
                '<span class="ab-note-line">%s<span class="for-dev mono"> · %s</span></span>'
                '<span class="gate-go">%s</span></a>'
                % (e(href), e(n), e(name), e(line), e(dev), e(go))
            )
        else_notes = []
        for name, host, line, href, go, dev, linked in else_items:
            bit = (
                '<span class="ab-note-k">%s · %s</span>'
                '<span class="ab-note-line">%s</span>'
                % (e(name), e(host), e(line))
            )
            if linked:
                else_notes.append(
                    '<a class="ab-note" href="%s" target="_blank" rel="noopener">%s'
                    '<span class="gate-go">%s</span></a>' % (e(href), bit, e(go))
                )
            else:
                else_notes.append(
                    '<div class="ab-note">%s<span class="gate-go is-quiet">%s</span></div>'
                    % (bit, e(go))
                )
        inner = (
            '<div class="ab-lab is-colo">'
            '<p class="ab-phrase" aria-label="本站四条路径">%s</p>'
            '<div class="ab-notes">%s</div>'
            '<section class="ab-colo-else" aria-label="不在本站">'
            '<p class="about-mark">相关站点</p>'
            '<div class="ab-notes is-else">%s</div></section>'
            '<section class="ab-lab-stance" aria-label="边界">'
            '<p class="about-mark">边界</p>'
            '<div class="about-stance-body">%s</div></section>'
            '<p class="gate-foot-note">%s</p></div>'
            % (phrase, "".join(notes), "".join(else_notes), stance_body, e(foot))
        )

    body = flag + head + inner
    return layout(
        "about", "关于稿%s" % self_name, body, path,
        extra_head=pages_css("gate", "lab-about"),
        body_class="page-gate page-about lab-about-page lab-about-%s" % variant,
        nav_items=NAV_LAB, wordmark_href=path,
    )


def _gap_k(zh, field):
    return '<span class="k">%s<span class="for-dev mono"> · %s</span></span>' % (e(zh), e(field))


def page_gap():
    form = (
        '<section class="gp1-stage" aria-label="写一条短笺">'
        '<div class="gp1-letter">'
        '<p class="gp1-kicker">短笺</p>'
        '<div class="gp1-kinds" role="tablist" aria-label="这一条是哪一件事">'
        '<button type="button" role="tab" id="tab-glyph" data-kind="glyph" aria-controls="pane-glyph" aria-selected="true" class="is-on">缺字形</button>'
        '<button type="button" role="tab" id="tab-catalog" data-kind="catalog" aria-controls="pane-catalog" aria-selected="false">缺收录</button>'
        '<button type="button" role="tab" id="tab-errata" data-kind="errata" aria-controls="pane-errata" aria-selected="false">勘误</button>'
        '</div>'
        '<div class="gp1-fields" id="pane-glyph" role="tabpanel" aria-labelledby="tab-glyph" data-pane="glyph">'
        '<label class="gp-field">'
        '%s'
        '<input type="text" value="霞鹜文楷" data-gap-name>'
        '</label>'
        '<label class="gp-field is-char">'
        '%s'
        '<input type="text" value="龘" maxlength="8" data-gap-char>'
        '</label>'
        '<label class="gp-field">'
        '%s'
        '<textarea rows="2">版式样例。不是已提交的反馈，也不表示这一款真的缺这个字。</textarea>'
        '</label>'
        '<label class="gp-field">'
        '%s'
        '<input type="text" placeholder="可选。不建账号">'
        '</label>'
        '</div>'
        '<div class="gp1-fields" id="pane-catalog" role="tabpanel" aria-labelledby="tab-catalog" data-pane="catalog" hidden>'
        '<label class="gp-field">'
        '%s'
        '<input type="text" placeholder="目录里没有的名字">'
        '</label>'
        '<label class="gp-field">'
        '%s'
        '<input type="text" placeholder="作者或厂商">'
        '</label>'
        '<label class="gp-field">'
        '%s'
        '<input type="text" placeholder="仓库或发布页">'
        '</label>'
        '<label class="gp-field">'
        '%s'
        '<input type="text" placeholder="可选。不建账号">'
        '</label>'
        '</div>'
        '<div class="gp1-fields" id="pane-errata" role="tabpanel" aria-labelledby="tab-errata" data-pane="errata" hidden>'
        '<label class="gp-field">'
        '%s'
        '<input type="text" placeholder="目录编号或中文名" data-gap-name>'
        '</label>'
        '<label class="gp-field">'
        '%s'
        '<input type="text" placeholder="名字、许可或状态">'
        '</label>'
        '<label class="gp-field">'
        '%s'
        '<textarea rows="2" placeholder="写出你看到的原文"></textarea>'
        '</label>'
        '<label class="gp-field">'
        '%s'
        '<input type="text" placeholder="可选。不建账号">'
        '</label>'
        '</div>'
        '<p class="gp1-acts">'
        '<button type="button" data-hold>提交</button>'
        '<a href="/source/">先去目录核对</a>'
        '<a href="/license/">许可原文</a>'
        '</p>'
        '<p class="gp1-quiet" data-hold-note hidden>入口还没接上。这一下没有送出。'
        '<span class="for-dev mono"> · POST 未接</span></p>'
        '</div>'
        '<aside class="gp1-dossier" aria-label="边界">'
        '<p class="label">边界</p>'
        '<div class="gp1-kv">'
        '<div>%s<span class="v">不统计。缺一个字就是缺一个字</span></div>'
        '<div>%s<span class="v">不建账号。联系方式可留可不留</span></div>'
        '<div>%s<span class="v">在目录里的，报缺字或勘误，不要再报缺收录</span></div>'
        '<div>%s<span class="v">写错了去勘误。原文仍以许可页为准</span></div>'
        '<div>%s<span class="v">表单还没接上，这一下不会送出</span></div>'
        '</div>'
        '</aside>'
        '</section>'
        '<p class="gp-footnote">样例里的字只是版式，不代表霞鹜文楷真的缺这个字。提交不会送出。'
        '<span class="for-dev mono"> · /gap · POST not wired</span></p>'
        % (
            _gap_k("哪一款", "norm"),
            _gap_k("缺的字", "codepoint"),
            _gap_k("在哪看到", "note"),
            _gap_k("怎么联系你", "contact?"),
            _gap_k("字体名", "name"),
            _gap_k("谁做的", "foundry"),
            _gap_k("出处", "upstream"),
            _gap_k("怎么联系你", "contact?"),
            _gap_k("哪一款", "norm"),
            _gap_k("错在哪", "field"),
            _gap_k("应是", "correction"),
            _gap_k("怎么联系你", "contact?"),
            _gap_k("覆盖率", "coverage"),
            _gap_k("账号", "auth"),
            _gap_k("已收录", "/source"),
            _gap_k("许可", "/license"),
            _gap_k("入口", "POST"),
        )
    )
    body = page_head(
        "缺字勘误",
        "缺字形、缺收录、写错了，三件事里报一件。提交仍不发送。造字平台不在本站，只留这一入口。",
        crumbs=[(None, "缺字")],
        kicker="03",
        dev="/gap · POST 未接",
    ) + form
    return layout("gap", "缺字勘误", body, "/gap", body_class="page-gap",
        desc='缺字形、缺收录或勘误，都从一个入口报。提交入口尚未接通。')
def page_404():
    body = page_head(
        "没有这一页",
        '回<a href="/source/">目录</a>搜名字，或从嵌入注释进入<a href="/license/">许可</a>。',
        kicker="404",
        dev="404",
    )
    return layout("", "没有这一页", body)


# ---------- 输出 ----------

def write(rel, text):
    p = DIST / rel.strip("/") if rel.endswith(".html") else DIST / rel.strip("/") / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, "utf-8")


def main():
    ap = argparse.ArgumentParser(description="wenfeng.org v2 site builder")
    ap.add_argument("--allow-index", action="store_true", help="public index,follow and robots Allow")
    args = ap.parse_args()
    seo.ALLOW_INDEX = bool(args.allow_index)
    data, fonts, licenses = load()
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(HERE / "assets", DIST / "assets", symlinks=True)
    # 标签图标在 HTML 源站根路径（浏览器默认要 /favicon.ico）。反色自 app，不是页眉方标。
    for name in ("favicon.ico", "favicon.webp"):
        src = HERE / "assets" / name
        if src.exists():
            shutil.copy2(src, DIST / name)
    # 软链接思源宋体与思源黑体（~75MB，避免重复拷贝）
    for name in ("shs", "shsans"):
        target = DIST / "assets" / name
        src = ROOT / "assets" / name
        if not target.exists() and src.exists():
            target.symlink_to(src)
    n_lic_pdf = copy_license_files(fonts)
    write("/", page_home(data, fonts))
    write("/lab/home-a/", page_lab_home(data, fonts, "a"))
    write("/lab/home-b/", page_lab_home(data, fonts, "b"))
    write("/lab/home-c/", page_lab_home(data, fonts, "c"))
    write("/lab/foot-a/", page_lab_foot(data, fonts, "a"))
    write("/lab/foot-b/", page_lab_foot(data, fonts, "b"))
    write("/lab/foot-c/", page_lab_foot(data, fonts, "c"))
    write("/lab/foot-left-a/", page_lab_foot_left(data, fonts, "a"))
    write("/lab/foot-left-b/", page_lab_foot_left(data, fonts, "b"))
    write("/lab/source-a/", page_lab_source(fonts, "a"))
    write("/lab/source-b/", page_lab_source(fonts, "b"))
    write("/lab/source-c/", page_lab_source(fonts, "c"))
    write("/lab/about-a/", page_lab_about("a"))
    write("/lab/about-b/", page_lab_about("b"))
    write("/lab/about-c/", page_lab_about("c"))
    write("/lab/about-d/", page_lab_about("d"))
    write("/lab/about-e/", page_lab_about("e"))
    write("/lab/about-f/", page_lab_about("f"))
    for v in ("a", "b", "c"):
        write("/lab/font-%s/" % v, page_lab_font(fonts, v, "xwwk"))
        write("/lab/font-%s/albbpht/" % v, page_lab_font(fonts, v, "albbpht"))
    write("/source/", page_source(fonts))
    write("/license/", page_licenses(fonts))
    for f in fonts:
        write("/source/%s/" % f["norm"], page_font(f))
        write("/license/%s/" % f["norm"], page_license(f, licenses))
        if can_attest(f):
            write("/attest/%s/" % f["norm"], page_attest(f))
        write("/slice/%s/" % f["norm"], page_slice(f, fonts))
    taken = {f["norm"] for f in fonts}
    n_alias = 0
    for f in fonts:
        for s in slug_aliases(f):
            if s in taken:
                continue
            taken.add(s)
            write("/source/%s/" % s, seo.alias_stub("/source/%s/" % f["norm"], wf(f)))
            write("/license/%s/" % s, seo.alias_stub("/license/%s/" % f["norm"], wf(f)))
            if can_attest(f):
                write("/attest/%s/" % s, seo.alias_stub("/attest/%s/" % f["norm"], wf(f)))
            write("/slice/%s/" % s, seo.alias_stub("/source/%s/" % f["norm"], wf(f)))
            n_alias += 1
    groups = foundries(fonts)
    write("/foundry/", page_foundries(groups))
    for g in groups:
        write("/foundry/%s/" % g["slug"], page_foundry(g))
    for path, fn in [("/attest/", lambda: page_attest_index(fonts)), ("/attest/go/", page_attest_go),
                     ("/attest/verify/", page_verify), ("/attest/ledger/", page_ledger), ("/v/", page_lookup),
                     ("/slice/", lambda: page_slices(fonts)), ("/use/", page_use), ("/how/", page_how),
                     ("/legal/", page_legal), ("/about/", page_about), ("/gap/", page_gap)]:
        write(path, fn())
    write("404.html", page_404())
    sitemap = [
        "/", "/source/", "/license/", "/foundry/", "/attest/",
        "/use/", "/how/", "/legal/", "/about/", "/gap/",
        "/v/", "/attest/verify/", "/attest/ledger/",
    ]
    for f in fonts:
        sitemap.append("/source/%s/" % f["norm"])
        sitemap.append("/license/%s/" % f["norm"])
        if can_attest(f):
            sitemap.append("/attest/%s/" % f["norm"])
    for g in groups:
        sitemap.append("/foundry/%s/" % g["slug"])
    seo.write_discovery(DIST, sitemap)
    print(
        "built %d pages -> %s (license pdf %d, alias slugs %d, index=%s)"
        % (sum(1 for _ in DIST.rglob("index.html")), DIST, n_lic_pdf, n_alias,
           "allow" if seo.ALLOW_INDEX else "noindex")
    )


if __name__ == "__main__":
    main()
