#!/usr/bin/env python3
"""wenfeng.org v2 静态站生成器。

  python3 site/build.py                 # 产出 site/dist/
  python3 site/serve.py --port 16031    # 预览（静态 + 原型 API）

视觉沿用已定稿的丁（home-v4）/乙′（source-v2b）/甲′（font-v1b）/戊′（license-v5b），
令牌是 fonts-front 的 tokens.css 原件。所有页面只用 site.css 里那一套共用件。
数据只读：../samples.json、../data/font/*.json、../data/licenses.json、../data/license-text/*.json。
"""

import html
import json
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
PROOF = "风急天高猿啸哀 渚清沙白鸟飞回"

ATTEST_SPDX = {"OFL-1.1", "MIT", "Apache-2.0", "IPA-1.0", "IPA", "CC0-1.0", "CC-BY-4.0",
               "CC-BY-SA-4.0", "GPL-2.0-with-font-exception",
               "GPL-2.0-or-later WITH Font-exception OR OFL-1.1", "MPlus-Bitmap-License"}

# 状态词：定稿词表（COPY-AUDIT 第三/四轮 + /how 甲′），说明取首页丁「目录状态」原句。
STATUS = OrderedDict([
    ("source", ("本站下载", "源文件在本站，进条目直接下载")),
    ("jump", ("官方下载", "本站不留文件，去作者或厂商的发布处")),
    ("ready", ("暂无下载", "许可已核实，源文件包还没上架")),
    ("pending", ("待核实", "许可原文还没有核对记录")),
    ("missing", ("未收录", "目录里还没有这款，可以报缺收录")),
])

NAV = [("/source/", "目录", ("source", "foundry")), ("/license/", "授权", ("license",)),
       ("/attest/", "核验", ("attest", "v", "attests")), ("/use/", "用法", ("use", "how")),
       ("/about/", "关于", ("about", "legal", "gap"))]
# D-05：lab 与活页现稿同这一套，给人对比。
NAV_LAB = NAV
FOOT_REST = [
    ("/slice/", "字体切片", "核验后领取", ""),
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
# cn.windfonts.com 有 web 包的字体名单（api/css 探测产物 data/webfonts.json；包上架后重跑探测刷新）
try:
    WEBFONTS = set(k.lower() for k in json.loads((ROOT / "data/webfonts.json").read_text("utf-8"))["fonts"].keys())
except Exception:
    WEBFONTS = set()


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
        sec.append(("领取切片包", "/slice/%s/" % f["norm"]))
    if st == "source" and arch:
        return "下载", "开源许可已核对原文，原件在本站。", ("下载原件", arch[0]["href"]), sec
    if st == "source" and up:
        return "去上游", "归档包稍后提供，现在到上游仓库取原件。", ("去上游仓库", up), sec
    if st == "source":
        return "等上架", "许可允许再分发，源文件包还没上架。", None, sec
    if st == "jump":
        say = "本站不留文件，去作者或厂商的发布处下载。"
        if is_gated(f):
            say = "免费商用但不允许再分发，本站不留文件。从官方取得原包后，可以核验领取切片包。"
        return "去官方", say, ("去官方下载", up or f.get("shop")), sec
    if st == "ready":
        return "等上架", "许可已核实，源文件包还没上架。", (("去上游仓库", up) if up else None), sec
    if st == "pending":
        return "待核实", "许可原文还没有核对记录，核对完成前不提供文件。", None, \
            [("报勘误", "/gap/?kind=errata&norm=" + f["norm"])] + sec
    return "去上游", "镜像还没收到这款。", (("去上游仓库", up) if up else ("去店面看", f.get("shop"))), sec


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


def link(label, href, cls="btn-text", ico=None):
    if not href:
        return ""
    ext = str(href).startswith("http")
    return '<a class="btn %s" href="%s"%s>%s%s</a>' % (
        cls, e(href), ' target="_blank" rel="noopener"' if ext else "", icon(ico) if ico else "", e(label))


def ink(label, href, ico=None):
    return link(label, href, "btn-ink", ico)


def crumb(*items, dev=""):
    parts = ['<a href="/">wenfeng.org</a>'] + [
        ('<a href="%s">%s</a>' % (e(h), e(t)) if h else e(t)) for h, t in items]
    return '<p class="crumb">%s%s</p>' % ('<span class="sep">/</span>'.join(parts),
                                          '<span class="for-dev"> · %s</span>' % e(dev) if dev else "")


def display(title, lead, crumbs=(), kicker="", mid=False):
    return ('%s<div class="display%s"><div>%s<h1>%s</h1></div><p class="lead">%s</p></div>'
            % (crumb(*crumbs) if crumbs else "", " is-mid" if mid else "",
               '<p class="label">%s</p>' % e(kicker) if kicker else "", e(title), lead))


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
    return ('<%s class="task%s"%s><span class="idx">%02d</span>%s<span class="body"><span class="t-t">%s</span>'
            '<span class="t-d">%s</span></span><span class="arrow">%s</span></%s>'
            % (tag, " is-ink" if inked else "", attr, i,
               '<span class="t-ico">%s</span>' % icon(ico) if ico else "<span></span>",
               e(title), desc, icon("arrow-right") if href else "", tag))


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


def status_words():
    return kv_rows([(STATUS[k][0], e(STATUS[k][1])) for k in STATUS], words=True)


def index_rows(fonts, go=None, href_of=None, rel_of=None, list_attrs=""):
    def row(f):
        st = status(f)
        hay = " ".join(filter(None, [f.get("name"), f.get("en"), f.get("norm"), f.get("foundry"),
                                     f.get("licenseName")] + (f.get("aliases") or []))).lower()
        rel = rel_of(f) if rel_of else STATUS[st][0]
        info_d = " · ".join(filter(None, [spdx_of(f) or f.get("licenseName") or "许可空",
                                          f.get("foundry") or "未标注", rel]))
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
                verb, inked, href = "去出处", False, "/source/%s/" % e(f["norm"])
            elif st == "missing":
                verb, inked, href = "报缺", False, "/gap/?norm=%s" % e(f["norm"])
            else:
                verb, inked, href = "看条目", False, "/source/%s/" % e(f["norm"])
        if href_of:
            href = href_of(f)
        face = f.get("family") or "" if f["norm"] in WEBFONTS else ""
        cls = "lrow t-%s" % e(f["norm"]) if face else "lrow"
        wname = "Regular" if "Regular" in (f.get("weights") or []) else ((f.get("weights") or ["Regular"])[0])
        attrs = ' data-face-norm="%s" data-face-family="%s" data-face-weight="%s"' % (e(f["norm"]), e(face), e(wname)) if face else ""
        return ('<li data-st="%s" data-hay="%s" data-letter="%s"><a class="%s" href="%s"%s>'
                '<span class="lnm">%s</span>'
                '<span class="lrel">%s</span>'
                '<span class="lmeta for-design">%s</span><span class="lmeta for-dev mono">%s</span>'
                '<span class="lgo%s">%s</span></a></li>'
                % (st, e(hay), e(letter_of(f)), cls, href, attrs, e(wf(f)), e(rel), e(info_d), info_v,
                   " is-ink" if inked else "", e(verb)))
    return ('<ul class="lin-list" data-list%s>%s</ul><p class="empty" data-empty hidden>没有匹配的字体。换个名字，或<a href="/gap/?kind=catalog">报缺收录</a>。</p><nav class="pager" data-pager hidden></nav>'
            % ((" " + list_attrs if list_attrs else ""), "".join(row(f) for f in fonts)))


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
            verb, href = "去出处", "/source/%s/" % e(f["norm"])
        elif st == "missing":
            verb, href = "报缺", "/gap/?norm=%s" % e(f["norm"])
        else:
            verb, href = "看条目", "/source/%s/" % e(f["norm"])
        face = f.get("family") or ""
        cls = "ls-name t-%s" % e(f["norm"]) if face else "ls-name"
        attrs = ' data-face-norm="%s" data-face-family="%s"' % (e(f["norm"]), e(face)) if face else ""
        items.append(
            '<li data-st="%s" data-hay="%s" data-letter="%s"><a class="%s" href="%s"%s>'
            '<span class="nm">%s</span><span class="go">%s</span></a></li>'
            % (st, e(hay), e(letter_of(f)), cls, href, attrs, e(wf(f)), e(verb))
        )
    return (
        '<ul class="ls-names" data-list data-page-size="%s">%s</ul>'
        '<p class="empty" data-empty hidden>没有匹配的字体。换个名字，或<a href="/gap/?kind=catalog">报缺收录</a>。</p>'
        '<nav class="pager" data-pager hidden></nav>'
        % (e(page_size), "".join(items))
    )


def filter_chips(fonts, with_count=False):
    counts = OrderedDict((k, 0) for k in STATUS)
    for f in fonts:
        counts[status(f)] += 1
    all_lab = "全部 · %d" % len(fonts) if with_count else "全部"
    return '<div class="chips"><button class="chip is-on" data-filter="all">%s</button>%s</div>' % (
        e(all_lab),
        "".join(
            '<button class="chip" data-filter="%s">%s%s</button>' % (
                k, e(STATUS[k][0]), (" · %d" % n) if with_count else ""
            ) for k, n in counts.items() if n
        ),
    )


# ---------- 外壳（= 定稿 chrome / footer） ----------



def _foot_marks():
    fc = (
        '<li><a href="https://feicode.com/Windfonts" target="_blank" rel="noopener"'
        ' title="feiCode 源码（即将离开文风）" aria-label="feiCode 源码">'
        '<img src="/assets/marks/feicode.svg" alt="" width="26" height="22">feiCode<span class="x">↗</span></a></li>'
    )
    gh = (
        '<li><a href="https://github.com/Windfonts" target="_blank" rel="noopener"'
        ' title="GitHub 镜像（即将离开文风）" aria-label="GitHub 镜像">'
        '<svg class="icon" aria-hidden="true"><use href="#i-github"></use></svg>GitHub<span class="x">↗</span></a></li>'
    )
    return '<ul class="foot-marks">%s%s</ul>' % (fc, gh)


def _foot_wm():
    return ('<a class="wordmark" href="/"><img class="wm-ico" src="/assets/icon.webp" alt="" width="24" height="24">'
            '<span class="wm-name">文风<span class="wm-alt">开源</span></span></a>')


def _foot_dev(dev):
    return '<span class="for-dev mono"> · %s</span>' % e(dev) if dev else ""


def _foot_bottom(dev=""):
    icp = ('<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener">'
           '粤ICP备2023091240号-3</a>')
    copy = ('<p>版权所有 · 文风 <span class="tm" aria-hidden="true">™</span>'
            ' · © 2026 文派（广州）科技有限公司 · %s%s</p>' % (icp, _foot_dev(dev)))
    links = ('<nav class="foot-bottom-links" aria-label="页脚条款">'
             '<a href="/about/">关于</a><a href="/use/">文档</a></nav>')
    return '<div class="site-foot-bottom">%s%s</div>' % (copy, links)


def foot_lab(kind, dev=""):
    """甲余项行（活页）/ 乙收束 / 丙办事横条。上下块都进 .container，底沿不拉满屏。"""
    bottom = _foot_bottom(dev)
    if kind == "a":
        rest = "".join(
            '<a href="%s"%s%s><span class="t">%s</span><span class="d">%s</span></a>' % (
                h,
                (' class="%s"' % c) if c else (' class="is-ext"' if h.startswith("http") else ""),
                (' target="_blank" rel="noopener" title="%s（即将离开文风）"' % e(t)) if h.startswith("http") else "",
                e(t),
                _fv(g, h.rstrip("/")) if not c else e(g),
            )
            for h, t, g, c in FOOT_REST
        )
        inner = (
            '<div class="site-foot-inner">'
            '<div class="site-foot-brand">%s%s</div>'
            '<nav class="foot-rest" aria-label="页脚">%s</nav></div>' % (_foot_wm(), _foot_marks(), rest)
        )
        cls = "site-foot is-foot-a"
    elif kind == "b":
        inner = (
            '<div class="site-foot-inner">'
            '<div class="site-foot-brand">%s</div></div>' % _foot_wm()
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
        bits.append('<link rel="stylesheet" href="/assets/pages/%s.css?v=%d">' % (n, v))
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


def _strip_hero(html):
    html = re.sub(r'<p class="\w+-crumb"[^>]*>.*?</p>\s*', "", html, count=1, flags=re.S)
    html = re.sub(r'<div class="\w+-display">.*?</div>\s*', "", html, count=1, flags=re.S)
    return html


def layout(section, title, body, dev="", extra_head="", body_class="", nav_items=None, wordmark_href="/", footer=None):
    items = NAV if nav_items is None else nav_items
    nav = "".join('<a href="%s"%s>%s</a>' % (h, ' class="is-active"' if section in keys else "", t)
                  for h, t, keys in items)
    wm = ('<a class="wordmark" href="%s"><img class="wm-ico" src="/assets/icon.webp" alt="" width="24" height="24">'
          '<span class="wm-name">文风<span class="wm-alt">开源</span></span></a>' % e(wordmark_href))
    b_cls = (' class="%s"' % e(body_class)) if body_class else ""
    if footer is None:
        footer = foot_site(dev)
    return """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>%s</title>
<script>try{if(localStorage.getItem('wf-theme')==='dark')document.documentElement.dataset.theme='dark';if(localStorage.getItem('wf-view')==='dev')document.documentElement.dataset.view='dev';if(localStorage.getItem('wf-scale')==='lg')document.documentElement.dataset.scale='lg'}catch(e){}</script>
<link rel="stylesheet" href="/assets/tokens.css"><link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/pages/chrome.css">%s
</head><body data-page="%s"%s>
%s
<header class="topbar"><div class="container topbar-inner">%s
<nav class="topnav" aria-label="主导航">%s</nav>
<div class="topbar-end">
<div class="seg view-switch" data-view-switch role="group" aria-label="视图">
<button type="button" data-mode="design" class="is-on">设计</button>
<button type="button" data-mode="dev">开发</button></div>
<a href="https://app.windfonts.com/" target="_blank" rel="noopener" title="店面（样张与选字）">店面</a>
<button type="button" class="icon-btn" data-scale-toggle aria-pressed="false" aria-label="放大"><svg class="icon" aria-hidden="true"><use href="#i-font-size"></use></svg></button>
<button type="button" class="icon-btn" data-theme-toggle aria-label="切换深浅"><svg class="icon ico-moon" aria-hidden="true"><use href="#i-moon"></use></svg><svg class="icon ico-sun" aria-hidden="true"><use href="#i-sun"></use></svg></button></div>
</div></header>
<main class="container page">%s</main>
%s
<script src="/assets/site.js" defer></script>
</body></html>""" % (e(("%s · 文风开源" % title) if title else "文风开源"), (("\n" + extra_head) if extra_head else ""), section, b_cls, SPRITE, wm, nav, body, footer)



# ---------- 页面 ----------

def _fv(d, v, cls=""):
    p = (cls + " ") if cls else ""
    return '<span class="%sfor-design">%s</span><span class="%sfor-dev mono">%s</span>' % (p, d, p, v)


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
        '<h1 class="lab-find-title">'
        '<span class="for-design lab-find-live" contenteditable="true" spellcheck="false" role="textbox" aria-label="可编辑的活样张" data-placeholder="写几个字试试" data-face-family="wenfeng-xxzt"><span class="lab-rot" data-rot><span class="is-on lab-find-em">开源</span><span class="lab-find-em">免费</span><span class="lab-find-em">手写</span><span class="lab-find-em">书法</span><span class="lab-find-em">精品</span></span>商用字体'
        '<span class="for-dev mono">/source</span></h1>'
        '<p class="d">%s</p></div>'
        '<div class="lab-find-act">'
        '<form class="search is-embed" action="/source/" method="get" role="search">'
        '<label class="sr-only" for="%s">搜索字体</label>'
        '<input id="%s" name="q" type="search" placeholder="中文名、英文名、厂商…" autocomplete="off">'
        '<button class="btn btn-ink" type="submit">%s搜索</button></form>'
        '<p class="lab-find-more">%s</p></div></div>'
        % (_fv("wenfeng.org", "wenfeng.org"),
           _fv("每款字体均已核对许可原文，无需登录即可下载。文风云<span class=\"reg\">®</span>另提供即用字库切片，支持自托管。", "offer · /source"),
           e(q_id), e(q_id), icon("search"),
           _fv('<a href="/source/">收录 %d 款</a> · <a href="/source/?st=source">本站可下载 %d 款 →</a>' % (n, n_src),
               "offer=source · fonts[]=%d" % n))
    )
    return (
        '<div class="lab-doors is-prime">'
        '%s'
        '<a class="lab-door is-side is-q1" href="/license/"><span class="lab-side-bg" aria-hidden="true">正版</span><span class="idx">01</span>'
        '<h2>%s</h2><p class="d">%s</p><span class="go">%s</span></a>'
        '<a class="lab-door is-side is-q2" href="/attest/"><span class="lab-side-bg" aria-hidden="true">免费</span><span class="idx">02</span>'
        '<h2>%s</h2><p class="d">%s</p><span class="go">%s</span></a>'
        '<a class="lab-door is-side is-q3" href="/gap/"><span class="lab-side-bg" aria-hidden="true">造字</span><span class="idx">03</span>'
        '<h2>%s</h2><p class="d">%s</p><span class="go">%s</span></a></div>'
        % (find,
           _fv("授权查询", "/license"), _fv("收录多款字体许可，开放公众查询。", "/license"),
           _fv("%d 份许可全文 →" % n_full, "textState=full"),
           _fv("获取证书", "/attest"), _fv("解决企业用字合规，在线申请证书。", "can_attest"),
           _fv("%d 款可出证 →" % n_att, "can_attest"),
           _fv("缺字勘误", "/gap"), _fv("开源字体及字型库，缺字错字报告。", "POST"),
           _fv("即将开放 →", "POST 未接"))
    )


def page_home(data, fonts):
    """首页活页：丙′（开源商用字体主门 + 三侧门）。"""
    body = '<article class="lab-home">%s</article>' % home_prime(fonts, "q")
    extra = '<link rel="stylesheet" href="/assets/lab-home.css">'
    return layout("home", "", body, "/", extra_head=extra, body_class="lab-home-page")


def _recent(fonts, st=None, n=8):
    pool = [f for f in fonts if st is None or status(f) == st]
    pool.sort(key=lambda f: f.get("verifiedAt") or "", reverse=True)
    return pool[:n]


def _frow(f):
    st = status(f)
    if st == "source":
        verb, inked, href = "下载", True, "/source/%s/" % f["norm"]
    elif st == "jump":
        verb, inked, href = "去出处", False, "/source/%s/" % f["norm"]
    elif st == "missing":
        verb, inked, href = "报缺", False, "/gap/?norm=%s" % f["norm"]
    else:
        verb, inked, href = "看条目", False, "/source/%s/" % f["norm"]
    face = f.get("family") or ""
    cls = "frow t-%s" % e(f["norm"]) if face else "frow"
    attrs = ' data-face-norm="%s" data-face-family="%s"' % (e(f["norm"]), e(face)) if face else ""
    info_d = " · ".join(filter(None, [spdx_of(f) or f.get("licenseName") or "许可空", f.get("foundry") or "未标注"]))
    info_v = "%s · offer=%s · textState=%s" % (e(f["norm"]), e(f.get("offer") or "jump"), e(lic(f).get("textState") or "—"))
    return ('<a class="%s" href="%s"%s>'
            '<span class="fnm">%s</span>'
            '<span class="finfo for-design">%s</span><span class="finfo for-dev mono">%s</span>'
            '<span class="fst">%s</span>'
            '<span class="fgo%s">%s →</span></a>'
            % (cls, e(href), attrs, e(wf(f)), e(info_d), info_v, e(STATUS[st][0]),
               " is-ink" if inked else "", e(verb)))


def _shelf_pane(key, rows):
    inner = "".join(_frow(f) for f in rows) or '<p class="empty">这一段暂时没有字体。</p>'
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
            verb = "下载" if st == "source" else "看条目"
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
    extra = '<link rel="stylesheet" href="/assets/lab-home.css">'
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
    extra = '<link rel="stylesheet" href="/assets/lab-home.css">'
    return layout(
        "home", "页脚稿%s" % self_name, body, path, extra_head=extra,
        body_class="lab-home-page lab-foot-page", footer=foot_lab(variant, path),
    )


def page_source(fonts):
    n = len(fonts)
    body = page_head(
        "字型目录",
        "我要的那一款在哪一行。能下载的进条目拿文件，不能的去出处或报缺。",
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
            index_rows(fonts),
            aside("状态", status_words(), "五个词全站同形。侧栏不是某一款的结论。"),
        )
    )
    return layout("source", "字型目录", body, "/source", extra_head=pages_css("source"), body_class="page-source")


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
            verb = "下载" if st == "source" else "看条目"
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


def primary_file(f):
    arch = file_of(f, "archive")
    if arch and arch.get("href") and not arch.get("staged"):
        return arch
    return first_file_href(f)


def primary_label(file):
    if not file:
        return "下载"
    k = file.get("kind")
    if k == "archive":
        return "下载"
    if k == "git":
        return "去出处"
    if k == "upstream":
        return "去出处"
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
        extra.append({"label": "去 GitHub 取" if "github.com" in mh else "去上游取", "href": up})
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
        return {"d": "指引 · 全文在上游", "v": "pointer"}
    return {"d": "空", "v": "∅"}


def font_archive_cell(f):
    archive = file_of(f, "archive")
    if archive and archive.get("staged"):
        return {"d": "稍后提供", "v": "staged · " + (archive.get("format") or "tar.gz")}
    if archive and archive.get("href"):
        return {"d": "可下载", "v": file_name_from_href(archive["href"]) or archive.get("format") or "file"}
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
    """主动作：标签与目录五态同词（下载 / 去出处 / 报缺）；许可全文作次按钮。"""
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
            "verb": "去出处",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · upstream",
            "note": "归档包稍后提供，现在到出处取原件。" if staged else base,
            "noteDev": ("files[archive].staged · upstream" if staged else "offer=source · upstream"),
            "strongHref": up,
            "strongLabel": "去出处",
        }
    if up and offer == "jump":
        return {
            "verb": "去出处",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · jump",
            "note": base,
            "noteDev": "offer=jump · upstream · not woff2",
            "strongHref": up,
            "strongLabel": "去出处",
        }
    if up:
        return {
            "verb": "去出处",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · upstream",
            "note": base,
            "noteDev": "offer=%s · upstream · textState=%s" % (offer, lic(f).get("textState") or "∅"),
            "strongHref": up,
            "strongLabel": "去出处",
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
            "verb": "报缺",
            "verbDev": "offer=pending",
            "kickerDev": "primary · pending",
            "note": base,
            "noteDev": "offer=pending · textState=%s · no upstream" % (lic(f).get("textState") or "∅"),
            "strongHref": "/gap/?norm=%s" % f["norm"],
            "strongLabel": "报缺",
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
        "verb": "报缺",
        "verbDev": "offer=missing",
        "kickerDev": "primary · missing",
        "note": base,
        "noteDev": "offer=missing · no upstream",
        "strongHref": "/gap/?norm=%s" % f["norm"],
        "strongLabel": "报缺",
    }


def font_secondary(f):
    l = lic(f)
    rows = []
    n = 2
    norm = f["norm"]
    if license_readable(f, None):
        d = "全文已归档，保留名以原文为准" if l.get("rfn") else "全文已归档"
        dv = "/license/%s%s" % (norm, " · textSha256" if l.get("textSha256") else "")
        rows.append({
            "n": n,
            "href": "/license/%s/" % norm,
            "t": "许可原文",
            "d": d,
            "dv": dv,
            "go": "阅读"
        })
    else:
        rows.append({
            "n": n,
            "href": "/license/%s/" % norm,
            "t": "许可原文",
            "d": "条款尚未核对",
            "dv": "textState=%s" % (l.get("textState") or "∅"),
            "go": "阅读"
        })
    n += 1
    rows.append({
        "n": n,
        "href": "/gap/?norm=%s" % norm,
        "t": "报缺字",
        "d": "缺字形、勘误，从这个入口报",
        "dv": "/gap",
        "go": "反馈"
    })
    n += 1
    slice_fl = file_of(f, "slice")
    slice_href = slice_fl["href"] if (slice_fl and slice_fl.get("href")) else ("/slice/%s/" % norm)
    slice_later = not (slice_fl and slice_fl.get("href"))
    rows.append({
        "n": n,
        "href": slice_href,
        "t": "切片",
        "d": "网页切片包稍后提供" if slice_later else "网页切片包",
        "dv": ("slice=%s" % (f.get("slice") or "planned")) if slice_later else "slice",
        "go": "工具"
    })
    n += 1
    if f.get("shop"):
        rows.append({
            "n": n,
            "href": f["shop"],
            "t": "店面",
            "d": "样张和选字在店面，不在这一站",
            "dv": "shop",
            "go": "离开"
        })
    return rows


def page_font(f):
    verb = font_verb(f)
    st = status(f)
    st_label = STATUS[st][0]
    note = (f.get("visitorNote") or "").strip() or verb["note"]
    archive = file_of(f, "archive")
    if archive and archive.get("staged") and "稍后" not in note:
        note = "归档包稍后提供。" + note
    spdx = spdx_of(f) or ""
    proto = spdx or f.get("licenseName") or "—"
    foundry = f.get("foundry") or "未标注"
    foundry_slug = f.get("foundrySlug")
    foundry_html = ('<a href="/foundry/%s/">%s</a>' % (e(foundry_slug), e(foundry))) if foundry_slug else e(foundry)
    text_cell = font_text_cell(f)
    arch_cell = font_archive_cell(f)
    mirror_state = (f.get("mirror") or {}).get("state") or ""
    up = upstream_href(f)
    face = f.get("family") or ""
    face_attrs = ""
    if face:
        face_attrs = ' data-face-norm="%s" data-face-family="%s"' % (e(f["norm"]), e(face))

    lic_href = "/license/%s/" % f["norm"]
    acts = []
    if verb.get("strongHref") and verb.get("strongLabel"):
        acts.append(ink(verb["strongLabel"], verb["strongHref"]))
    if license_readable(f, None) and verb.get("strongHref", "").rstrip("/") != lic_href.rstrip("/"):
        acts.append(link("读许可原文", lic_href, "btn-text"))
    if can_attest(f):
        acts.append(link("授权证明", "/attest/%s/" % f["norm"], "btn-text"))

    dossier = kv_rows([
        ("短码", e(f["norm"])),
        ("协议", e(proto)),
        ("厂商", foundry_html),
        ("原文", e(text_cell["d"])),
        ("归档", e(arch_cell["d"])),
        ("镜像", e(mirror_word(mirror_state) or "—")),
        ("上游", e(upstream_dossier(up))),
    ])

    sec = font_secondary(f)
    if verb.get("strongHref", "").rstrip("/") == lic_href.rstrip("/"):
        sec = [r for r in sec if r.get("href", "").rstrip("/") != lic_href.rstrip("/")]
    rows = "".join(
        '<a class="row-go" href="%s"%s><span class="idx">%02d</span><span class="body"><span class="t">%s</span>'
        '<span class="d for-design">%s</span><span class="d for-dev mono">%s</span></span><span class="go">%s</span></a>'
        % (
            e(r["href"]),
            ' target="_blank" rel="noopener"' if str(r["href"]).startswith("http") else "",
            i, e(r["t"]), e(r["d"]), e(r["dv"]), e(r["go"])
        ) for i, r in enumerate(sec, 2)
    )

    file_html = ""
    real = primary_file(f)
    if real and real.get("href") and real.get("kind") != "upstream" and not real.get("staged"):
        fname = file_name_from_href(real["href"]) or real.get("label") or "源文件"
        size_s = fmt_bytes(real.get("bytes") or real.get("size"))
        sha = real.get("sha256") or ""
        meta_dev = sha or real.get("format") or real.get("kind") or ""
        file_html = (
            '<div class="fn-file">'
            '<p class="fn-label">文件</p>'
            '<a class="fn-file-row" href="%s"%s>'
            '<span class="fn-file-name">%s</span>'
            '%s%s</a></div>'
            % (
                e(real["href"]),
                ' target="_blank" rel="noopener"' if str(real["href"]).startswith("http") else "",
                e(fname),
                ('<span class="fn-file-size for-design">%s</span>' % e(size_s)) if size_s else "",
                ('<span class="fn-file-sha for-dev mono">%s</span>' % e(meta_dev)) if meta_dev else "",
            )
        )

    lead = "%s。%s" % (e(st_label), e(note))
    body = page_head(
        wf(f),
        lead,
        crumbs=[("/source/", "目录"), (None, wf(f))],
        dev="/source/%s · offer=%s" % (f["norm"], f.get("offer") or "jump"),
        face_attrs=face_attrs,
        sub=f.get("en") or "",
    )
    body += '<p class="acts fn-acts">%s</p>' % "".join(acts)
    body += '<div class="fn-layout"><div class="fn-main">'
    if face:
        body += '<p class="fn-proof t-%s"%s data-face-full="1">%s</p>' % (e(f["norm"]), face_attrs, e(PROOF))
    else:
        body += '<p class="fn-proof t-%s" data-face-norm="%s" data-face-full="1">%s</p>' % (
            e(f["norm"]), e(f["norm"]), e(PROOF)
        )
    body += file_html
    body += '<div class="fn-more"><p class="fn-label">还能办的事</p>%s</div></div>' % rows
    body += aside("这一款", dossier) + '</div>'
    body += '<p class="fn-errata quiet"><a href="/gap/?norm=%s">信息有误？</a></p>' % e(f["norm"])
    return layout(
        "source", wf(f), body, "/source/%s" % f["norm"],
        extra_head=pages_css("source-norm"), body_class="page-font",
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
        return "指引 · 全文在上游"
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
            "note": "本站不代分发这款源文件。条款以厂商或上游发布件为准。",
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
        "state": "仅查询<br />全文在上游",
        "stateDev": "textState=" + (ts or "∅") + "<br />not archived",
        "line": "仅查询 · 全文在上游",
        "note": "本站还没有归档全文。先看出处，不要把名称当成许可结论。",
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
    return (
        '<div>'
        '<span class="k for-design">%s</span>'
        '<span class="k for-dev">%s</span>'
        '<span class="v for-design">%s</span>'
        '<span class="v for-dev mono">%s</span>'
        '</div>' % (e(kd), e(kv), e(vd), e(vv))
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
        '<p class="kicker for-design" data-lq-kicker-d></p>'
        '<p class="kicker for-dev mono" data-lq-kicker-v></p>'
        '<p class="state for-design">%s</p>'
        '<p class="state for-dev mono">%s</p>'
        '<p class="fname">%s</p>'
        '<p class="meta for-design">%s · %s · %s</p>'
        '<p class="meta for-dev mono">%s · spdx=%s · offer=%s</p>'
        '<p class="note for-design">%s</p>'
        '<p class="note for-dev mono">%s</p>'
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
        '<aside class="lq5b-dossier" aria-label="卷宗字段">'
        '<p class="label">卷宗</p>'
        '<div class="lq5b-kv">'
        + lq_kv_pair("短码", "norm", f["norm"], f["norm"])
        + lq_kv_pair("协议", "spdx", proto, spdx or "∅")
        + lq_kv_pair("厂商", "foundry", foundry, foundry_slug)
        + lq_kv_pair("原文", "textState", ts_word, ts_dev)
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
    go = "看条目 →"
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
        '<span class="meta for-design">%s · %s · %s</span>'
        '<span class="meta for-dev mono">%s · textState=%s · offer=%s</span>'
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
            return "去出处"
        if ts == "summary":
            return "有要点"
        return "待核实"

    def go(f):
        ts = str(lic(f).get("textState") or "")
        if ts == "full":
            return "读原文", True
        if ts == "pointer":
            return "去出处", False
        return "看条目", False

    stage = (
        '<div class="lic-stage">'
        '<h1 class="lic-giant xxzt">授权查询</h1>'
        '<p class="lic-lead for-design">查一款字有没有许可全文。有全文的进原文；没有的只标状态。不是法律意见。</p>'
        '<p class="lic-lead for-dev mono">/license · textState · full=%d</p>'
        '%s'
        '<p class="lic-foot for-design">全文 %d 份</p>'
        '<p class="lic-foot for-dev mono">textState=full · %d</p>'
        '</div>'
        % (n_full, search(action="/license/", live=True, ph="中文名、英文、短码…"), n_full, n_full)
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
    return layout(
        "license", "授权查询", body, "/license",
        extra_head=pages_css("license"),
        body_class="page-license",
    )


def license_tier(f):
    t = str(lic(f).get("textState") or "")
    if t == "full":
        return {"word": "许可原文", "note": ""}
    if t == "summary":
        return {"word": "许可要点", "note": "非全文，全文以厂商发布件为准。"}
    if t == "pointer":
        return {"word": "许可指引", "note": "全文在上游仓库，本站尚未归档文本。"}
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
    return _LICENSE_PACK_ALIAS.get(k, k)


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
        bits.append(
            '<span class="for-design">%s</span><span class="for-dev">%s</span>'
            % (e(source_lab or method), e(method or source_lab))
        )
    line = '<p class="licn-ev-line">%s</p>' % " · ".join(bits) if bits else ""

    hash_html = ""
    if sha:
        hash_html = (
            '<p class="licn-ev-hash">'
            '<span class="for-design">文本哈希 </span>'
            '<span class="for-dev">textSha256 </span>'
            '<span class="mono" data-lic-hash>%s</span>'
            '<button type="button" class="licn-copy" data-lic-copy="%s">复制</button>'
            "</p>" % (e(sha), e(sha))
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
                '<span class="for-design">%s</span><span class="for-dev">%s</span>'
                % (e(_EV_EVENT_ZH.get(ev, ev)), e(ev)),
            ]
            if h.get("note"):
                bits_h.append(e(h["note"]))
            if h.get("textSha256"):
                bits_h.append(
                    '<span class="for-dev mono">%s…</span>'
                    % e((h["textSha256"] or "")[:12])
                )
            items.append("<li>%s</li>" % " · ".join(bits_h))
        hist_html = (
            '<p class="licn-ev-h for-design">变更</p>'
            '<p class="licn-ev-h for-dev mono">evidence.history</p>'
            '<ol class="licn-timeline">%s</ol>' % "".join(items)
        )

    how = (
        '<p class="licn-how for-design">说明见 <a href="/how/">我们怎么核</a>。</p>'
        '<p class="licn-how for-dev mono"><a href="/how/">/how</a> · evidence method</p>'
    )
    return (
        '<section class="licn-evidence" aria-label="取证记录">'
        '<p class="label for-design">取证记录</p>'
        '<p class="label for-dev mono">evidence</p>'
        "%s%s%s%s</section>" % (line, hash_html, hist_html, how)
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
        acts.append(ink("出授权证明", "/attest/%s/" % norm))
    if kind == "vendor" and src:
        acts.append(ink("去厂商原文", src))
    acts.append(link("返回条目", "/source/%s/" % norm, "btn-text"))
    if kind != "open" and can_attest(f):
        acts.append(link("授权证明", "/attest/%s/" % norm, "btn-text"))
    if is_gated(f):
        acts.append(link("切片工具", "/slice/%s/" % norm, "btn-text"))

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
                    '<p class="licn-origin-rfn for-design">保留名：%s。'
                    "衍生字体不得沿用，除非权利人书面同意。</p>"
                    % e("、".join(names))
                )
            if lic_o.get("rfnNote"):
                rfn_bits.append(
                    '<p class="licn-origin-rfn is-note for-design">%s</p>'
                    % e(lic_o["rfnNote"])
                )
            # 版权原文默认折起，保留名始终外露
            more = ""
            if preamble:
                more = (
                    '<details class="licn-origin-more" open>'
                    '<summary><span class="for-design">版权原文</span>'
                    '<span class="for-dev mono">copyright block</span></summary>'
                    '<pre class="licn-pre is-en">%s</pre></details>'
                    % mark_license_text(preamble, names)
                )
            origin = (
                '<section class="licn-origin" aria-label="作者声明">'
                '<p class="licn-origin-h"><span class="for-design">作者声明</span>'
                '<span class="for-dev mono">copyright · rfn</span></p>'
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
                    '<p class="licn-cell-h"><span class="for-design">%s</span>'
                    '<span class="for-dev mono">%s</span></p>'
                    '<pre class="licn-pre is-en">%s</pre></div>'
                    '<div class="licn-cell">'
                    '<div data-lic-pane="zh">'
                    '<p class="licn-cell-h"><span class="for-design">%s</span>'
                    '<span class="for-dev mono">%s</span></p>'
                    '<div class="licn-pre is-zh">%s</div></div>'
                    '<div data-lic-pane="en" hidden>'
                    '<p class="licn-cell-h">'
                    '<span class="for-design">原版（同左）· %s</span>'
                    '<span class="for-dev mono">%s</span></p>'
                    '<pre class="licn-pre is-en">%s</pre></div>'
                    '</div></div>'
                    % (
                        e(en_h), e(en_h), en_body,
                        e(zh_h), e(en_h), zh_body,
                        e(en_h), e(en_h), en_body,
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
                '<span class="for-design">原文</span>'
                '<span class="for-dev mono">body</span></div>'
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
                '<p class="licn-vendor-lab for-design">归档原文</p>'
                '<p class="licn-vendor-lab for-dev mono">archived body</p>'
                '<pre class="licn-pre is-zh">%s</pre>' % mark_license_text(body_text, names)
            )
            if note:
                reader.append(
                    '<p class="licn-vendor-sum for-design"><span class="licn-vendor-lab">要点</span>%s</p>'
                    % e(note)
                )
        else:
            reader.append(
                '<p class="licn-vendor-note for-design">'
                "本站还没有可展示的授权原文归档。请先去出处查阅。"
                "</p>"
                '<p class="licn-vendor-note for-dev mono">no archived body · pointer only</p>'
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
                    % (e(lab), e(href), e(lab), ink("打开 PDF", href))
                )
            else:
                art_bits.append(
                    '<p class="licn-art">%s</p>' % ink(lab, href)
                )
        if art_bits:
            reader.append(
                '<p class="licn-vendor-lab for-design">原件</p>'
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
        sheet = (
            '<p class="quiet for-design">这一款许可尚未收入文本。'
            "%s或<a href=\"/gap/?norm=%s\">报缺</a>。</p>"
            % (
                ('可先<a href="%s" target="_blank" rel="noopener">去出处</a>，' % e(src)) if src else "",
                e(norm),
            )
        )
        lead = "%s。许可原文还没有核对记录。" % e(face)
        kick = "待归档"

    if kind == "open":
        # 商用结论留给条目页；许可页导语只说原文
        lead = "%s。以下为归档许可原文。" % e(face)

    body = page_head(
        title, lead,
        crumbs=[("/license/", "授权"), (None, face)],
        kicker=kick,
        dev="/license/%s · %s" % (norm, dev_state),
    )
    body += '<div class="licn">'
    body += meta
    body += '<p class="acts licn-acts">%s</p>' % "".join(acts)
    body += sheet
    body += evidence_block(f, lic_obj)
    body += "</div>"
    return layout(
        "license", "%s 授权" % face, body, "/license/%s" % norm,
        extra_head=pages_css("license-norm"), body_class="page-license-norm",
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
        href = "/slice/%s/" % f["norm"]
        action_text = "领取切片包"
    elif can_take(f):
        href = "/source/%s/" % f["norm"]
        action_text = "下载原件"
    else:
        href = "/source/%s/" % f["norm"]
        action_text = "查看条目"

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
    """厂商索引：行样式与目录同一套。"""
    n = sum(len(g["fonts"]) for g in groups)
    items = []
    for g in groups:
        items.append(
            '<li><a class="lrow" href="/foundry/%s/">'
            '<span class="lnm">%s</span>'
            '<span class="lrel">%d 款</span>'
            '<span class="lgo">看目录</span></a></li>'
            % (e(g["slug"]), e(g["name"]), len(g["fonts"]))
        )
    body = page_head(
        "厂商",
        "按出品方编目。点进去是该组织名下的款。",
        crumbs=[("/source/", "目录"), (None, "厂商")],
        dev="/foundry · foundrySlug · %d orgs · %d fonts" % (len(groups), n),
    )
    body += (
        '<p class="count">%d 家</p><ul class="lin-list">%s</ul>'
        % (len(groups), "".join(items))
        if items else
        '<p class="quiet">还没有按厂商归类的条目。</p>'
    )
    return layout(
        "foundry", "厂商", body, "/foundry",
        extra_head=pages_css("source", "foundry"),
        body_class="page-source page-foundry",
    )


def page_foundry(g):
    body = page_head(
        g["name"],
        "目录里归属「%s」的字体。能下载的进条目拿文件。" % e(g["name"]),
        crumbs=[("/foundry/", "厂商"), (None, g["name"])],
        dev="/foundry/%s · %d" % (g["slug"], len(g["fonts"])),
    )
    body += (
        '<div class="src-layout">'
        '<div class="src-main">'
        '<p class="count">%d 款</p>'
        '%s</div></div>'
        % (
            len(g["fonts"]),
            index_rows(g["fonts"]) if g["fonts"] else
            '<p class="quiet">没有这一类。换一个筛选，或<a href="/source/">回目录</a>。</p>',
        )
    )
    return layout(
        "foundry", g["name"], body, "/foundry/%s" % g["slug"],
        extra_head=pages_css("source", "foundry"),
        body_class="page-source page-foundry",
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
        '<p class="ph-lead for-design">标准开源协议的字体，由文派（广州）科技有限公司出具证明，'
        "记录授权链、协议和原文哈希。证明不是著作权人另行授权。</p>"
        '<p class="ph-lead for-dev mono">/attest · SPDX · ledger</p>'
        "</header>"
    )
    form = (
        '<form class="form at-form" action="/attest/go/" method="get" data-attest-form>'
        '<label>字体<select name="norm" required>%s</select></label>'
        '<div class="two">'
        '<label>持证单位（可选）'
        '<input name="holder" placeholder="只印在这一份副本上" autocomplete="organization">'
        '</label>'
        '<label>统一社会信用代码（可选）'
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
            ("谁签发", "文派（广州）科技有限公司。文派不是字体的著作权人"),
            ("给谁出", "OFL、MIT、Apache 等标准开源协议"),
            ("不出", "厂商自拟、还没核实、未收录的"),
            ("怎么核", "编号在台账查得到、内容一致才是真的"),
        ]),
        '<a href="/legal/#scope">出证范围</a>',
    )
    more = (
        '<section class="at-more" aria-label="核验还能办的事">'
        '<p class="label">核验还能办的事</p>%s</section>'
        % tasks([
            ("核对一份 JSON", "贴进证明文件，看内容有没有被改过", "/attest/verify/", "verified"),
            ("签发台账", "每份证明签发即登记", "/attest/ledger/", "history"),
            ("证书查验", "编号 + 持证单位两要素", "/v/", "search"),
            ("切片包", "不可再分发的字体，核验原包后领取", "/slice/", "scissors"),
        ])
    )
    body = (
        '%s<div class="at-desk"><div class="at-desk-main">%s</div>%s</div>%s'
        % (mast, form, bound, more)
    )
    return layout(
        "attest", "授权证明", body, "/attest",
        extra_head=pages_css("attest"),
        body_class="page-attest",
    )


def page_attest(f):
    """单款证书页：通栏标题；左徽章 / 右证面（按钮在证面顶栏）。证面不动。"""
    name = wf(f)
    mast = (
        '<header class="page-mast atn-mast">'
        '<p class="atn-back"><a href="/attest/">← 出证入口</a></p>'
        '<h1 class="xxzt">%s 授权证明</h1>'
        '<p class="ph-lead for-design">下载 PDF、打印，或挂徽章。证面可切极简。</p>'
        '<p class="ph-lead for-dev mono">/attest/%s · classic|minimal</p>'
        "</header>"
    ) % (e(name), e(f["norm"]))
    side = (
        '<aside class="atn-side no-print">'
        '<section class="atn-embed" data-share hidden>'
        '<p class="label">嵌入徽章</p>'
        '<p class="atn-embed-lead">三种样式；细条可选黑白。下载或复制嵌入代码。</p>'
        '<div class="atn-embed-controls">'
        '<div class="seg atn-badge-pick" data-badge-variants role="group" aria-label="徽章样式">'
        '<button type="button" class="is-on" data-badge-kind="plaque">牌匾</button>'
        '<button type="button" data-badge-kind="dark">深底</button>'
        '<button type="button" data-badge-kind="slim">细条</button>'
        "</div>"
        '<div class="seg atn-badge-tone" data-badge-tone hidden role="group" aria-label="细条黑白">'
        '<button type="button" class="is-on" data-badge-tone-v="slim-ink">黑</button>'
        '<button type="button" data-badge-tone-v="slim-paper">白</button>'
        "</div></div>"
        '<p class="atn-embed-badge"><img class="share-badge" data-badge-img src="" alt="授权证明徽章预览"></p>'
        '<pre class="code" data-embed></pre>'
        '<p class="acts">'
        '<button class="btn" type="button" data-copy>%s复制嵌入代码</button>'
        '<a class="btn" href="#" data-badge-dl download>下载 SVG</a>'
        "</p></section></aside>"
    ) % icon("copy")
    stage = (
        '<div class="atn-main">'
        '<div class="atn-panel">'
        '<div class="atn-toolbar no-print" data-cert-tools hidden>'
        '<div class="atn-tools-main">'
        '<button class="btn btn-ink" type="button" data-pdf>%s下载 PDF（A4）</button>'
        '<button class="btn" type="button" data-print>打印</button>'
        '<button class="btn" type="button" data-json>JSON</button>'
        '<p class="atn-tools-links">'
        '<a href="/license/%s/">许可原文</a>'
        '<a href="/attest/ledger/">台账</a>'
        "</p></div>"
        '<div class="seg atn-switch" data-cert-switcher role="group" aria-label="证面样式">'
        '<button type="button" class="is-on" data-cert-style="classic">经典</button>'
        '<button type="button" data-cert-style="minimal">极简</button>'
        "</div></div>"
        '<div class="cert-stage atn-stage" data-cert data-norm="%s"%s>'
        '<p class="quiet">正在生成证明…</p></div></div></div>'
    ) % (icon("download"), e(f["norm"]), e(f["norm"]),
         (' data-face-family="%s"' % e(f["family"])) if f.get("family") else "")
    extra = (
        pages_css("attest-norm") + "\n"
        '<link rel="stylesheet" href="/assets/shs/regular.css">\n'
        '<link rel="stylesheet" href="/assets/shs/bold.css">\n'
        '<link rel="stylesheet" href="/assets/shsans/bold.css">'
    )
    body = '%s<div class="atn-layout">%s%s</div>' % (mast, side, stage)
    return layout(
        "attest", "%s 授权证明" % f["name"], body, "attest",
        extra_head=extra,
        body_class="page-attest-norm",
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
    body += ('<div class="split at-tool"><div><form class="form" data-verify><label>证明 JSON<textarea name="json" rows="12" '
             'placeholder=\'{ "type": "wenfeng.attestation.v1", … }\'></textarea></label><p class="acts"><button class="btn btn-ink">核对</button></p></form>'
             '<div data-out></div></div>%s</div>' % aside("说明", kv_rows([
                 ("核对方式", "平台密钥校验 JSON 完整性"),
                 ("效力", "核对内容是否被改动；不构成司法意义上的电子签章"),
                 ("另见", '<a href="/attest/ledger/">签发台账</a>'),
             ])))
    return layout(
        "attest", "核对证明", body, "/attest/verify",
        extra_head=pages_css("attest"),
        body_class="page-attest page-attest-tool",
    )


def page_ledger():
    body = page_head(
        "台账",
        "每份证明签发即登记。编号查不到的，按伪造处理。",
        crumbs=[("/attest/", "核验"), (None, "台账")],
        kicker="核验",
        dev="/attest/ledger",
    )
    body += '<div class="at-tool" data-ledger><p class="quiet">正在读取台账…</p></div>'
    return layout(
        "attest", "签发台账", body, "/attest/ledger",
        extra_head=pages_css("attest"),
        body_class="page-attest page-attest-tool",
    )


def page_lookup():
    extra = ('<link rel="stylesheet" href="/assets/shs/regular.css">\n'
             '<link rel="stylesheet" href="/assets/shs/bold.css">\n'
             '<link rel="stylesheet" href="/assets/shsans/bold.css">')
    body = page_head(
        "查证",
        "输入证明编号和持证单位，两项一致即显示证书信息。",
        crumbs=[(None, "查证")],
        kicker="核验",
        dev="/v · serial + holder",
    )
    body += ('<div class="split at-tool"><div><form class="form" data-lookup><div class="two"><label>证明编号<input name="s" placeholder="WF-…" required></label>'
             '<label>持证单位<input name="holder" placeholder="与证明一致；通用记录填「通用核验记录」" required></label></div>'
             '<p class="acts"><button class="btn btn-ink">查验</button></p></form>'
             '<div data-out></div></div>%s</div>' % aside("说明", kv_rows([
                 ("两要素", "编号与持证单位须与证明完全一致"),
                 ("通用记录", "未填单位时，持证单位填「通用核验记录」"),
                 ("查不到", "编号不在台账，按伪造处理"),
             ])))
    return layout(
        "v", "查证", body, "/v",
        extra_head=extra + "\n" + pages_css("attest"),
        body_class="page-attest page-attest-tool",
    )


def slice_gate_of(f):
    if not f or not f.get("sliceGate") or not f.get("sliceGate", {}).get("enabled"):
        return None
    g = f["sliceGate"]
    return {
        "enabled": True,
        "accept": g.get("accept") or ["zip"],
        "minBytes": g.get("minBytes", 20480),
        "nameHints": g.get("nameHints") or [],
        "sha256": g.get("sha256"),
        "origin": g.get("origin")
    }


def page_slices(fonts):
    gated = [f for f in fonts if slice_gate_of(f)]
    planned = [f for f in fonts if f.get("slice") in ("planned", "ready")]

    planned_html = ""
    if planned:
        items = "".join(
            '<li><a class="tool-index-row" href="/source/%s/">'
            '<span class="tool-index-name">%s</span>'
            '<span class="tool-index-meta">%s</span>'
            '<span class="tool-index-go">看下载页</span>'
            '</a></li>'
            % (e(f["norm"]), e(wf(f)), e(f.get("foundry") or "未标注"))
            for f in planned
        )
        planned_html = (
            '<p class="count-line"><strong>%d</strong> 款开源字体，切片包稍后直接提供</p>'
            '<ul class="tool-index is-quiet">%s</ul>' % (len(planned), items)
        )

    gated_html = ""
    if gated:
        items = "".join(
            '<li><a class="tool-index-row" href="/slice/%s/">'
            '<span class="tool-index-name">%s</span>'
            '<span class="tool-index-meta">%s</span>'
            '<span class="tool-index-go">领取</span>'
            '</a></li>'
            % (e(f["norm"]), e(wf(f)), e(f.get("foundry") or "未标注"))
            for f in gated
        )
        gated_html = '<ul class="tool-index">%s</ul>' % items
    else:
        gated_html = '<p class="tool-note">目录里还没有需要核验原包的款。</p>'

    body = page_head(
        "切片",
        "不允许再分发的免费商用字体，本站不提供文件。放入官方 zip，核验通过后领取切片包。文件不离开本机。",
        crumbs=[(None, "切片")],
        kicker="工具",
        dev="/slice · local hash · no upload",
    )
    body += (
        '<div class="tool-page">'
        '<ol class="tool-how">'
        '<li><span>01</span><div><strong>原包</strong><p>尚未解压的官方 zip</p></div></li>'
        '<li><span>02</span><div><strong>核验</strong><p>浏览器里计算整包摘要</p></div></li>'
        '<li><span>03</span><div><strong>切片包</strong><p>woff2 与 CSS，供自托管</p></div></li>'
        '</ol>'
        '<p class="count-line"><strong>%d</strong> 款上传原包核验后领取</p>'
        '%s'
        '%s'
        '<p class="tool-aside">开源字体不必走核验，到<a href="/source/">目录</a>直接拿原件。</p>'
        '</div>'
        % (len(gated), gated_html, planned_html)
    )
    return layout("slice", "切片", body, "/slice", body_class="page-slices")


def page_slice(f, fonts=None):
    gate = slice_gate_of(f)
    shop_link = ""
    if f.get("shop"):
        is_http = f["shop"].startswith("http://") or f["shop"].startswith("https://")
        attrs = " target=\"_blank\" rel=\"noopener noreferrer\"" if is_http else ""
        shop_link = '<a href="%s"%s>去店面用</a>' % (e(f["shop"]), attrs)

    if gate:
        lead = "从%s取得的官方 zip，尚未解压。核验通过后领取切片包。" % e(f.get("foundry") or "厂商")
        origin_html = ""
        if gate.get("origin") and gate["origin"].get("href"):
            orig_href = gate["origin"]["href"]
            is_http = orig_href.startswith("http://") or orig_href.startswith("https://")
            attrs = " target=\"_blank\" rel=\"noopener noreferrer\"" if is_http else ""
            origin_html = '<p class="tool-origin">原包在<a href="%s"%s>%s</a>取。</p>' % (
                e(orig_href), attrs, e(gate["origin"].get("label") or "出处")
            )
        inner = (
            '<div data-slice-body>'
            '<div class="tool-board" aria-live="polite">'
            '<section class="tool-stage">'
            '<p class="tool-idx">01</p>'
            '<div class="tool-slot">'
            '<h2>原包</h2>'
            '<label class="tool-intake" data-slice-drop>'
            '<input class="sr-only" type="file" data-slice-input accept=".zip,application/zip">'
            '<span class="tool-intake-kicker">官方 zip</span>'
            '<span class="tool-intake-title">放入尚未解压的原包</span>'
            '<span class="tool-intake-meta">拖入此栏，或点这里选择</span>'
            '</label>'
            '%s'
            '</div>'
            '</section>'
            '<section class="tool-stage is-wait">'
            '<p class="tool-idx">02</p>'
            '<div class="tool-slot"><h2>核验</h2><p class="tool-note">放入原包后计算整包摘要。体积只作预检。</p></div>'
            '</section>'
            '<section class="tool-stage is-lock">'
            '<p class="tool-idx">03</p>'
            '<div class="tool-slot"><h2>切片包</h2><p class="tool-pack-name">文风切片包 · %s</p><p class="tool-note">核验通过后在此领取。</p></div>'
            '</section>'
            '</div>'
            '</div>'
            % (origin_html, e(f["name"]))
        )
        gate_attrs = (
            ' id="slice-gate"'
            ' data-norm="%s"'
            ' data-name="%s"'
            ' data-en="%s"'
            ' data-wf="%s"'
            ' data-foundry="%s"'
            ' data-min="%d"'
            ' data-accept="%s"'
            ' data-hints="%s"'
            ' data-sha256="%s"'
            % (
                e(f["norm"]), e(f["name"]), e(f.get("en") or ""),
                e(wf(f)), e(f.get("foundry") or ""),
                gate.get("minBytes", 20480),
                e(",".join(gate.get("accept", ["zip"]))),
                e(",".join(gate.get("nameHints", []))),
                e(gate.get("sha256") or "")
            )
        )
        if gate.get("origin"):
            gate_attrs += ' data-origin="%s" data-origin-label="%s"' % (
                e(gate["origin"].get("href") or ""), e(gate["origin"].get("label") or "")
            )
    else:
        lead = "这一款开源可再分发，不必核验。"
        gate_attrs = ""
        inner = (
            '<div class="tool-board">'
            '<section class="tool-stage is-lock">'
            '<p class="tool-idx">01</p>'
            '<div class="tool-slot"><h2>原包</h2><p class="tool-note">开源可再分发，不必放入原包。</p></div>'
            '</section>'
            '<section class="tool-stage is-lock">'
            '<p class="tool-idx">02</p>'
            '<div class="tool-slot"><h2>核验</h2><p class="tool-note">本站不核对此款原包。</p></div>'
            '</section>'
            '<section class="tool-stage">'
            '<p class="tool-idx">03</p>'
            '<div class="tool-slot">'
            '<h2>切片包</h2>'
            '<p class="tool-pack-name">原件可直接拿走</p>'
            '<p class="tool-note">切片包稍后由本站直接提供，不用走这道核验。</p>'
            '<p class="tool-actions"><a class="btn btn-ink btn-take" href="/source/%s/">去下载</a></p>'
            '</div>'
            '</section>'
            '</div>'
            % e(f["norm"])
        )

    meta_parts = [e(f["name"])]
    if f.get("en"):
        meta_parts.append(e(f["en"]))
    if f.get("foundry"):
        meta_parts.append(e(f["foundry"]))
    face_meta = " · ".join(meta_parts)

    gated_fonts = [x for x in (fonts or []) if slice_gate_of(x)]
    pick_html = ""
    if len(gated_fonts) >= 2:
        opts = "".join(
            '<option value="%s"%s>%s</option>' % (
                e(x["norm"]), " selected" if x["norm"] == f["norm"] else "", e(wf(x))
            ) for x in gated_fonts
        )
        pick_html = '<label class="tool-pick">核验对象<select data-slice-pick>%s</select></label>' % opts

    face_html = (
        '<div class="tool-face">'
        '<div>'
        '<p class="tool-face-name">%s</p>'
        '<p class="tool-face-meta">%s</p>'
        '</div>'
        '%s'
        '</div>'
        % (e(wf(f)), face_meta, pick_html)
    )

    foot_html = (
        '<p class="tool-legal">授权证明只记录收录与核验结果，不构成再分发授权，也不代表著作权人另行授权。</p>'
        '<p class="tool-links">'
        '<a href="/source/%s/">下载页</a>'
        '<a href="/license/%s">许可原文</a>'
        '%s'
        '<a href="/slice">工具首页</a>'
        '</p>'
        % (e(f["norm"]), e(f["norm"]), shop_link)
    )

    body = page_head(
        wf(f),
        lead,
        crumbs=[("/slice/", "切片"), (None, wf(f))],
        kicker="本地处理 · 文件不离开本机",
        dev="/slice/%s" % f["norm"],
        face_attrs=(' data-face-norm="%s" data-face-family="%s"' % (e(f["norm"]), e(f.get("family") or "")) if f.get("family") else ""),
    )
    body += (
        '<div class="tool-page"%s>'
        '%s'
        '%s'
        '%s'
        '</div>'
        % (gate_attrs, face_html, inner, foot_html)
    )
    return layout("slice", wf(f), body, "/slice/%s/" % f["norm"], body_class="page-slice")


def page_use():
    body = (
        '<section class="us-hero">'
        '<div class="container">'
        '<p class="us-crumb" aria-label="路径">'
        '<span class="for-design"><a href="/">首页</a><span class="sep">/</span>用法</span>'
        '<span class="for-dev mono">/use · us-v4b</span>'
        '</p>'
        '<div class="us-display">'
        '<h1 class="for-design">先问</h1>'
        '<h1 class="for-dev mono">ask first</h1>'
        '<p class="us-lead for-design">五个常见问题，各答各的：要文件、进主题、网页里用、注释能不能删、程序怎么查。</p>'
        '<p class="us-lead for-dev mono">question | answer<br />not 3 cols · not 4 steps · not /how</p>'
        '</div>'
        '<ol class="us4-asks">'
        '<li>'
        '<h2 class="for-design">要文件本身？</h2>'
        '<h2 class="for-dev mono">want the file?</h2>'
        '<div class="us4-a">'
        '<p class="us-prose for-design">拿原件。TTF / OTF / 上游仓库归档。给自建站、主题作者。许可允许时才再分发。</p>'
        '<p class="us-prose for-dev mono">ttf · otf · upstream archive<br />redistribute only if allowed</p>'
        '</div>'
        '</li>'
        '<li id="theme">'
        '<h2 class="for-design">要放进主题？</h2>'
        '<h2 class="for-dev mono">into a theme?</h2>'
        '<div class="us4-a">'
        '<p class="us-prose for-design">用切片包，给 WordPress 和静态站本地 @font-face。开源字体的切片包稍后提供。不允许再分发的免费商用字体：上传从厂商下载的原包 zip（不要解压），核验通过后领取。走<a href="/slice">切片工具</a>。</p>'
        '<p class="us-prose for-dev mono">local @font-face<br />oss slice later · no-redist zip → /slice</p>'
        '<p class="us-prose for-design">解压后整个文件夹放进主题（或 <code>wp-content/fonts</code>）。包内 <code>fonts.css</code> 已写好 <code>@font-face</code> 和必须保留的注释，整只引入，不要拆。</p>'
        '<p class="us-prose for-dev mono">whole folder · fonts.css intact · do not split</p>'
        '<pre class="us-code">// functions.php 里排队引入\n'
        'wp_enqueue_style(\n'
        "  'wenfeng-slice-xwwk',\n"
        "  get_theme_file_uri( '/fonts/wenfeng-slice-Xwwk/fonts.css' ),\n"
        '  array(),\n'
        '  null\n'
        ');\n\n'
        '/* 或在主题 style.css 顶部 */\n'
        '@import url( "./fonts/wenfeng-slice-Xwwk/fonts.css" );</pre>'
        '</div>'
        '</li>'
        '<li>'
        '<h2 class="for-design">只在网页里用？</h2>'
        '<h2 class="for-dev mono">cite, not save?</h2>'
        '<div class="us4-a">'
        '<p class="us-prose for-design">用 cn.windfonts.com 托管的 CSS 和字体分片。这不是本站下载，不要拿去二次托管。</p>'
        '<p class="us-prose for-dev mono">cn.windfonts.com<br />not a download · no rehost</p>'
        '<p class="us-prose for-design">不要把 <code>cn.windfonts.com</code> 的 woff2 拷走当源文件。托管分片不是原件，也不是切片包。</p>'
        '<p class="us-prose for-dev mono">do not copy hosted woff2 · not the source file</p>'
        '</div>'
        '</li>'
        '<li>'
        '<h2 class="for-design">这一行能删吗？</h2>'
        '<h2 class="for-dev mono">drop the comment?</h2>'
        '<div class="us4-a">'
        '<p class="us-prose for-design">不能。注释里的 <code>https://wenfeng.org/license</code> 要留着。不允许再分发的字体走<a href="/slice">切片工具</a>。</p>'
        '<p class="us-prose for-dev mono">keep license comment · no-redist → /slice</p>'
        '<p class="us-label for-design">嵌入代码里这一行不能改</p>'
        '<p class="us-label for-dev mono">comment · keep</p>'
        '<pre class="us-code">&lt;!-- 本页嵌入的字体由文风字体（Windfonts）提供，可自由使用；请保留本授权标注 https://wenfeng.org/license --&gt;</pre>'
        '</div>'
        '</li>'
        '<li id="api">'
        '<h2 class="for-design">用程序查？</h2>'
        '<h2 class="for-dev mono">query it?</h2>'
        '<div class="us4-a">'
        '<p class="us-prose for-design">查目录 API。免费和商业都可以查。商业字只出字段，<code>files</code> 为空。不是店面的 <code>/api/css</code>。<code>lineage</code> 字段为造字平台预留，现在恒为 <code>null</code>。</p>'
        '<p class="us-prose for-dev mono">commercial → fields only, files []<br />not shop /api/css · lineage = null</p>'
        '<ul class="us-api">'
        '<li><a href="/api/v1/fonts"><code>GET /api/v1/fonts</code><span>全部条目</span></a></li>'
        '<li><a href="/api/v1/fonts?offer=source"><code>GET /api/v1/fonts?offer=source</code><span>本站下载</span></a></li>'
        '<li><a href="/api/v1/fonts?q=%E9%9C%9E%E9%B9%AD"><code>GET /api/v1/fonts?q=霞鹜</code><span>按名搜</span></a></li>'
        '<li><a href="/api/v1/fonts/Xwwk"><code>GET /api/v1/fonts/Xwwk</code><span>一款 · 有 files</span></a></li>'
        '<li><a href="/api/v1/fonts/Albbpht"><code>GET /api/v1/fonts/Albbpht</code><span>files 为空</span></a></li>'
        '<li><a href="/api/v1/licenses/Xwwk"><code>GET /api/v1/licenses/Xwwk</code><span>许可原文</span></a></li>'
        '<li><a href="/api/v1/foundries"><code>GET /api/v1/foundries</code><span>厂商</span></a></li>'
        '<li><a href="/api/v1/certs"><code>GET /api/v1/certs</code><span>可核验目录</span></a></li>'
        '<li><a href="/api/v1/certs/Xwwk"><code>GET /api/v1/certs/Xwwk</code><span>一款核验 JSON</span></a></li>'
        '<li><span class="api-row"><code>POST /api/v1/certs/verify</code><span>核对本份签名</span></span></li>'
        '</ul>'
        '<pre class="us-code">GET /api/v1/fonts/{norm}\n'
        '{\n'
        '  "norm": "Xwwk",\n'
        '  "name": "霞鹜文楷",\n'
        '  "distribution": true,\n'
        '  "offer": "source",\n'
        '  "files": [ { "kind": "archive", "href": "…" } ]\n'
        '}</pre>'
        '</div>'
        '</li>'
        '</ol>'
        '<p class="us-acts">'
        '<a class="is-pill" href="/source"><span class="for-design">下源文件</span><span class="for-dev">/source</span></a>'
        '<a href="/slice"><span class="for-design">切片工具</span><span class="for-dev">/slice</span></a>'
        '<a href="/license"><span class="for-design">查授权</span><span class="for-dev">/license</span></a>'
        '</p>'
        '<p class="us-footnote for-design">怎么核在 <a href="/how">/how</a>。。</p>'
        '<p class="us-footnote for-dev mono">usePage · us-v4b · /use</p>'
        '</div>'
        '</section>'
    )
    body = page_head(
        "用法",
        "五个常见问题，各答各的：要文件、进主题、网页里用、注释能不能删、程序怎么查。",
        crumbs=[(None, "用法")],
        kicker="wenfeng.org",
        dev="/use",
    ) + _strip_hero(body)
    return layout("use", "用法", body, "/use", body_class="us us-v4b", extra_head=pages_css("prose"))


def page_how():
    body = (
        '<section class="hw-hero">'
        '<div class="container">'
        '<p class="hw-crumb" aria-label="路径">'
        '<span class="for-design"><a href="/">首页</a><span class="sep">/</span>收录与核验</span>'
        '<span class="for-dev mono">/how · hw-v1b</span>'
        '</p>'
        '<div class="hw-display">'
        '<h1 class="for-design">先过三条</h1>'
        '<h1 class="for-dev mono">3 gates</h1>'
        '<p class="hw-lead for-design">文风只做两件事：把源文件交给你，把许可说清楚。收进目录要先过这三条。</p>'
        '<p class="hw-lead for-dev mono">text · source · official<br />lexicon and method below</p>'
        '</div>'
        '<ol class="hw1-gates" id="how-criteria">'
        '<li class="hw1-gate">'
        '<p class="hw1-idx">01</p>'
        '<h2 class="for-design">许可文本</h2>'
        '<h2 class="for-dev mono">text</h2>'
        '<p class="for-design">许可文本拿得到。</p>'
        '<p class="for-dev mono">license text in hand</p>'
        '</li>'
        '<li class="hw1-gate">'
        '<p class="hw1-idx">02</p>'
        '<h2 class="for-design">来源可查</h2>'
        '<h2 class="for-dev mono">source</h2>'
        '<p class="for-design">来源能查到作者或厂商。</p>'
        '<p class="for-dev mono">author or foundry</p>'
        '</li>'
        '<li class="hw1-gate">'
        '<p class="hw1-idx">03</p>'
        '<h2 class="for-design">官方渠道</h2>'
        '<h2 class="for-dev mono">official</h2>'
        '<p class="for-design">文件取自官方渠道。</p>'
        '<p class="for-dev mono">official channel only</p>'
        '</li>'
        '</ol>'
        '<p class="hw1-refuse for-design">来路不明的打包文件不收。许可写不清楚的，先标「待核实」，不提供文件，核对完成再更新状态。</p>'
        '<p class="hw1-refuse for-dev mono">unknown packs out · unclear → 待核实, no file</p>'
        '<section class="hw1-lex" id="how-status" aria-label="状态词">'
        '<p class="hw-label for-design">状态词</p>'
        '<p class="hw-label for-dev mono">offer words</p>'
        '<div class="hw1-row">'
        '<b class="for-design">本站下载</b>'
        '<b class="for-dev mono">offer=source</b>'
        '<span class="for-design">文件在本站，可以直接下载。</span>'
        '<span class="for-dev mono">file on this site</span>'
        '</div>'
        '<div class="hw1-row">'
        '<b class="for-design">官方下载</b>'
        '<b class="for-dev mono">official</b>'
        '<span class="for-design">本站不存文件，请到厂商或上游官方渠道下载。</span>'
        '<span class="for-dev mono">no local file</span>'
        '</div>'
        '<div class="hw1-row">'
        '<b class="for-design">暂无下载</b>'
        '<b class="for-dev mono">offer=pending · textState=full</b>'
        '<span class="for-design">许可已核实，源文件包还没上架。</span>'
        '<span class="for-dev mono">no file yet</span>'
        '</div>'
        '<div class="hw1-row">'
        '<b class="for-design">待核实</b>'
        '<b class="for-dev mono">unverified</b>'
        '<span class="for-design">许可还没核对完，核对完成前不提供文件。</span>'
        '<span class="for-dev mono">no file until checked</span>'
        '</div>'
        '<div class="hw1-row">'
        '<b class="for-design">未收录</b>'
        '<b class="for-dev mono">unlisted</b>'
        '<span class="for-design">这款字体还没收进镜像，先去上游取。</span>'
        '<span class="for-dev mono">not in the mirror</span>'
        '</div>'
        '</section>'
        '<div class="hw1-pair">'
        '<section id="how-evidence">'
        '<h2 class="for-design">许可怎么取证</h2>'
        '<h2 class="for-dev mono">evidence</h2>'
        '<p class="for-design">以字体发布件内嵌的声明为准：安装包里的许可文件、官网许可页、上游仓库的 LICENSE，三者有其一才算拿到原文。</p>'
        '<p class="for-design">取证时记录来源、日期和文本哈希。哈希的作用是：原文以后被改动或换版时，能对出变化。</p>'
        '<p class="for-design">每款字体的取证记录，在它的许可原文页里可以查到。</p>'
        '<p class="for-dev mono">embedded notice · package / page / LICENSE<br />source + date + hash<br />record on the license page</p>'
        '</section>'
        '<section id="how-cert">'
        '<h2 class="for-design">证明怎么签</h2>'
        '<h2 class="for-dev mono">attest</h2>'
        '<p class="for-design">只给采用标准开源协议的字体出证，文派（广州）科技有限公司是出证责任主体。出证时申报用途（网页嵌入、印刷物料、软件内嵌、修改衍生、再分发），用途写入证明和台账，作为授权范围的确认记录。每份证明有唯一编号，签发即写入<a href="/attest/ledger">签发台账</a>。</p>'
        '<p class="for-design">核对收到的证明：编号在台账查得到、内容与台账一致，才是文风签发的。编号对不上，按伪造处理。</p>'
        '<p class="for-dev mono">SPDX only · 文派 is the subject<br />usage into cert + ledger · unique serial<br />serial miss → forged</p>'
        '</section>'
        '</div>'
        '<p class="hw-acts">'
        '<a class="is-pill" href="/source"><span class="for-design">看目录</span><span class="for-dev">/source</span></a>'
        '<a href="/attest"><span class="for-design">授权证明</span><span class="for-dev">/attest</span></a>'
        '<a href="/legal"><span class="for-design">法务说明</span><span class="for-dev">/legal</span></a>'
        '</p>'
        '<p class="hw-footnote for-design">状态词以这页为准，目录、条目、许可页同用这五个词。</p>'
        '<p class="hw-footnote for-dev mono">howPage · hw-v1b · /how</p>'
        '</div>'
        '</section>'
    )
    body = page_head(
        "怎么核",
        "文风只做两件事：把源文件交给你，把许可说清楚。收进目录要先过这三条。",
        crumbs=[(None, "怎么核")],
        kicker="wenfeng.org",
        dev="/how · text · source · official",
    ) + _strip_hero(body)
    return layout("how", "怎么核", body, "/how", body_class="hw hw-v1b", extra_head=pages_css("prose"))


def page_legal():
    body = (
        '<section class="lg-hero">'
        '<div class="container">'
        '<p class="lg-crumb" aria-label="路径">'
        '<span class="for-design"><a href="/">首页</a><span class="sep">/</span>法务</span>'
        '<span class="for-dev mono">/legal · lg-v4</span>'
        '</p>'
        '<div class="lg-display">'
        '<h1 class="for-design">按先后</h1>'
        '<h1 class="for-dev mono">order</h1>'
        '<p class="lg-lead for-design">操作说明，不是法律意见。权利以各字体许可原文为准。</p>'
        '<p class="lg-lead for-dev mono">operating note · not legal advice · five moments</p>'
        '</div>'
        '<div class="lg4-seq">'
        '<section class="lg4-when" id="m-open">'
        '<div class="lg4-when-head">'
        '<p class="lg4-k">01</p>'
        '<h2 class="for-design">打开这页</h2>'
        '<h2 class="for-dev mono">open</h2>'
        '</div>'
        '<div class="lg4-grid">'
        '<article id="legal-oss">'
        '<h3 class="for-design">这页是什么</h3>'
        '<h3 class="for-dev mono">page</h3>'
        '<p class="for-design">操作说明，不是法律意见。权利以各字体许可原文为准。不能替代律师审查具体项目。</p>'
        '<p class="for-dev mono">operating note · not a lawyer review</p>'
        '</article>'
        '<article>'
        '<h3 class="for-design">谁在按原文办事</h3>'
        '<h3 class="for-dev mono">stance</h3>'
        '<p class="for-design">文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。</p>'
        '<p class="for-dev mono">文派 stands on OSS · download / webfont / attest</p>'
        '</article>'
        '<article id="legal-what">'
        '<h3 class="for-design">证明是什么</h3>'
        '<h3 class="for-dev mono">what</h3>'
        '<p class="for-design">《文风字体授权证明》记录某日从某上游取得某款字、许可原文哈希、本站是否提供原件、可否按原文再分发。它填档案里「要一份盖章件」的缺口。不替代许可原文，不创设新的权利，不是著作权人的授权书，不等于软著登记或公证。没有把著作权转给持证人这种授权。</p>'
        '<p class="for-dev mono">chain + hash + original? + redist<br />attest ≠ new rights · no assignment · not 软著 · not notary</p>'
        '</article>'
        '</div>'
        '</section>'
        '<section class="lg4-when" id="m-text">'
        '<div class="lg4-when-head">'
        '<p class="lg4-k">02</p>'
        '<h2 class="for-design">对着原文</h2>'
        '<h2 class="for-dev mono">text</h2>'
        '</div>'
        '<div class="lg4-grid">'
        '<div class="lg4-span" id="legal-scope">'
        '<h3 class="for-design">先看协议是不是标准开源</h3>'
        '<h3 class="for-dev mono">spdx</h3>'
        '<ul class="lg4-pills for-design">'
        '<li>SIL Open Font License 1.1</li>'
        '<li>MIT</li>'
        '<li>Apache License 2.0</li>'
        '<li>IPA Font License</li>'
        '<li>CC0</li>'
        '<li>CC BY / CC BY-SA（不含 NC）</li>'
        '<li>M+</li>'
        '<li>带 Font Exception 的 GPL</li>'
        '</ul>'
        '<p class="for-design">上面这些才出证。文派科技作为责任主体，可为合法合规使用的个人及企业出具证明。CC 系出证时，证明内保留作者署名。</p>'
        '<p class="for-design">厂商自拟协议（如阿里巴巴普惠体授权协议）、仓耳字库免费开源字体授权声明、HarmonyOS / MiSans / OPPO 等厂商条款、只标「免费商用」而无正式协议文本的、许可还没核实的、未收录的：如有授权原文，只提供下载。不出具证明，也不代著作权人签署授权书。是否可商用，以厂商原文为准。常见条款是免费商用、禁止再分发字体文件。</p>'
        '<p class="for-dev mono">OFL-1.1 · MIT · Apache-2.0 · IPA · CC0 · CC-BY / CC-BY-SA no NC · M+ · GPL+FE<br />CC keeps attribution<br />custom / unverified / unlisted → text only, no attest, no grant</p>'
        '</div>'
        '<article id="legal-ofl">'
        '<h3 class="for-design">OFL 在本站怎么读</h3>'
        '<h3 class="for-dev mono">ofl</h3>'
        '<p class="for-design">可以用于网站、印刷、软件内嵌（看原文）。可以修改、再分发，不得单独出售字体本身。保留名未获作者书面允许，派生件不能用原名。切片包若只做技术子集、不改设计，仍标原名，包装可以写「文风切片包」。MIT 更宽。</p>'
        '<p class="for-dev mono">use / modify / redist · no selling the font alone · RFN · MIT wider</p>'
        '</article>'
        '<article id="legal-cn">'
        '<h3 class="for-design">国内把字库当什么</h3>'
        '<h3 class="for-dev mono">copyright</h3>'
        '<p class="for-design">字体作为计算机软件，一般按软件作品保护。单字图形是不是美术作品，法院判决并不统一，不要把「开源」理解成「字形不受保护」。开源许可是著作权人允许使用的书面条款。企业用 OFL / MIT，通常不必再向作者另签授权证明，但采购和验收仍常要归档材料。核验就是给这份材料。侵权投诉仍走著作权人。</p>'
        '<p class="for-dev mono">software work · glyph-as-art unsettled<br />archive paper ≠ extra grant · complaints to the rightsholder</p>'
        '</article>'
        '<article id="legal-soft">'
        '<h3 class="for-design">文件是软件复制品</h3>'
        '<h3 class="for-dev mono">software</h3>'
        '<p class="for-design">TTF / OTF / 源工程在国内常被当作软件复制品。许可允许复制、修改、再分发时，按原文做；禁止再分发时，把文件拷进客户交付包就可能越权。本核验不代替对交付包、安装包、App 内嵌的逐项审查。</p>'
        '<p class="for-dev mono">file as software copy · no per-package review</p>'
        '</article>'
        '</div>'
        '</section>'
        '<section class="lg4-when" id="m-lines">'
        '<div class="lg4-when-head">'
        '<p class="lg4-k">03</p>'
        '<h2 class="for-design">看证上三行</h2>'
        '<h2 class="for-dev mono">lines</h2>'
        '</div>'
        '<div class="lg4-grid">'
        '<article id="legal-issuer">'
        '<h3 class="for-design">谁签发，名字怎么写</h3>'
        '<h3 class="for-dev mono">issuer · name</h3>'
        '<p class="for-design">签发人是文派（广州）科技有限公司。证面品牌是文风，产品是 wenfeng.org。文派不是霞鹜、阿里巴巴、Adobe 等字体的著作权人。证明不是「文派授权你商用这款字」。</p>'
        '<p class="for-design">收录名写成「文风·」加原名，例如文风·霞鹜文楷。这是平台命名，不是派生作品，也不转移商标。文件内的版权声明、name 表、OFL 保留名仍用原名。本核验只针对未改名的收录原件或切片包。本证不写软著号。</p>'
        '<p class="for-dev mono">文派（广州）科技有限公司 · not the rightsholder<br />文风· is a catalog name · RFN stays · no 软著 number</p>'
        '</article>'
        '<article>'
        '<h3 class="for-design">三行结论</h3>'
        '<h3 class="for-dev mono">three lines</h3>'
        '<p class="for-design">网页嵌入、安装到操作系统、把字体文件再分发给客户，边界不同。证上分开写三行：网页嵌入、再分发原件、本平台是否提供原件。嵌入网页 CSS 与把原件放进安装程序，不是同一件事。</p>'
        '<p class="for-dev mono">embed / redist original / site offers the file<br />CSS embed ≠ installer</p>'
        '</article>'
        '<article id="legal-sign">'
        '<h3 class="for-design">签名验的是改没改过</h3>'
        '<h3 class="for-dev mono">sign</h3>'
        '<p class="for-design">平台密钥签名，贴到核对页即可验证内容是否被改过。不是可靠电子签名，也不是 CA 签发的数字证书。不要交给公证处当「已公证」。JSON 可以作辅助证据：某日平台对某哈希、某 SPDX 做过签名。印迹是视觉签章产品，与本证无关。</p>'
        '<p class="for-dev mono">platform key · not reliable e-sign · not CA<br />JSON is auxiliary · 印迹 unrelated</p>'
        '</article>'
        '</div>'
        '</section>'
        '<section class="lg4-when" id="m-file">'
        '<div class="lg4-when-head">'
        '<p class="lg4-k">04</p>'
        '<h2 class="for-design">放进档案</h2>'
        '<h2 class="for-dev mono">archive</h2>'
        '</div>'
        '<div class="lg4-grid">'
        '<div class="lg4-span" id="legal-buy">'
        '<h3 class="for-design">采购留下这四样</h3>'
        '<h3 class="for-dev mono">keep</h3>'
        '<ol class="lg4-steps for-design">'
        '<li>保存本核验 PDF / 打印件和 JSON。</li>'
        '<li>保存许可原文（本站 <a href="/license">/license/{短码}</a>）。</li>'
        '<li>若拿走了原件，保存当时的归档包和哈希，复核时要用。</li>'
        '<li>持证单位栏只表示这一份副本放在哪家单位的档案里，不等于被授权人。</li>'
        '</ol>'
        '<p class="for-dev mono">PDF + JSON · license text · hash if taken · holder ≠ licensee</p>'
        '</div>'
        '<div class="lg4-span" id="legal-redist">'
        '<h3 class="for-design">要带走文件的时候</h3>'
        '<h3 class="for-dev mono">redist</h3>'
        '<p class="for-design">许可允许再分发、本站也提供原件的（目录里标「本站下载」）：可以按原文带走原件。厂商不允许再分发的字体：本站不提供文件，也不出证。若你已从厂商取得原件，可在 <a href="/slice">/slice/{短码}/</a> 上传核验后领取自托管切片包。核验在浏览器内完成：体积只作预检，识别以整包摘要为准（生产对照本站收录的 SHA-256，厂商若公布 MD5 则并列）。本原型只模拟流程，不上传服务器，也不把原件再切一遍。</p>'
        '<p class="for-design">不要把 <code>cn.windfonts.com</code> 的 woff2 拷走当源文件。嵌入代码里的 <code>https://wenfeng.org/license</code> 不能改。OFL 禁止单独出售字体本身。厂商不允许再分发的字体，更不能卖文件。</p>'
        '<p class="for-dev mono">offer=source → original · else no file / no attest<br />/slice after you hold the file · SHA-256 · prototype does not upload<br />do not copy woff2 · do not edit the license URL · no selling the file</p>'
        '</div>'
        '</div>'
        '</section>'
        '<section class="lg4-when" id="m-mail">'
        '<div class="lg4-when-head">'
        '<p class="lg4-k">05</p>'
        '<h2 class="for-design">有异议再写信</h2>'
        '<h2 class="for-dev mono">mail</h2>'
        '</div>'
        '<div class="lg4-grid">'
        '<article id="legal-phish">'
        '<h3 class="for-design">还没核对的</h3>'
        '<h3 class="for-dev mono">unverified</h3>'
        '<p class="for-design">许可尚未核对、或源文件还没进镜像的款，不出核验。不要把店面能预览当成可以安装、可以再分发。钓鱼条款、个人免费、登录墙领取，一律按原文。拿不准就当不能带走。</p>'
        '<p class="for-dev mono">no attest · preview ≠ install · read the text</p>'
        '</article>'
        '<article id="legal-takedown">'
        '<h3 class="for-design">写给 license@wenfeng.org</h3>'
        '<h3 class="for-dev mono">takedown</h3>'
        '<p class="for-design">收录信息有误，或对某条目有权利主张，写信到 <a href="mailto:license@wenfeng.org">license@wenfeng.org</a>，说明是哪一条、问题在哪（权利人请附权利证明）。核实期间，该条目标为「待核实」，暂停出证，也不提供文件。确认有误就下架，变更记录留在目录状态里；文风下架以核验页和目录状态为准。被下架的一方有异议，同样来信说明；是否恢复，按最新核对结果处理。</p>'
        '<p class="for-dev mono">license@wenfeng.org · hold as 待核实 · catalog status is the record</p>'
        '</article>'
        '<article id="legal-name">'
        '<h3 class="for-design">另走的程序</h3>'
        '<h3 class="for-dev mono">later</h3>'
        '<p class="for-design">派生件若以后出现，必须另起新名，不能带保留名。需要公证或电子认证时，另走法定程序，不要拿这张证明去顶。</p>'
        '<p class="for-dev mono">future derivative needs a new name · notary is a separate process</p>'
        '</article>'
        '</div>'
        '</section>'
        '</div>'
        '<p class="lg-acts">'
        '<a class="is-pill" href="/attest"><span class="for-design">授权证明</span><span class="for-dev">/attest</span></a>'
        '<a href="/license"><span class="for-design">许可原文</span><span class="for-dev">/license</span></a>'
        '<a href="/how"><span class="for-design">我们怎么核</span><span class="for-dev">/how</span></a>'
        '</p>'
        '</div>'
        '</section>'
    )
    body = page_head(
        "法务",
        "出证边界、档案该留什么、证明验的是改没改过。栏位清晰，不是营销页。",
        crumbs=[(None, "法务")],
        kicker="wenfeng.org",
        dev="/legal · scope",
    ) + _strip_hero(body)
    return layout("legal", "法务", body, "/legal", body_class="lg lg-v4", extra_head=pages_css("prose"))


def page_about():
    body = (
        '<section class="ab-hero">'
        '<div class="container">'
        '<p class="ab-crumb" aria-label="路径">'
        '<span class="for-design"><a href="/">首页</a><span class="sep">/</span>关于</span>'
        '<span class="for-dev mono">/about · ab-v6b</span>'
        '</p>'
        '<div class="ab-display">'
        '<h1 class="for-design">从根往下</h1>'
        '<h1 class="for-dev mono">origin tree</h1>'
        '<p class="ab-lead for-design">wenfeng.org 下面挂四条路径：源文件、许可、缺字、证明。店面和造字在别的名字下。</p>'
        '<p class="ab-lead for-dev mono">/source · /license · /gap · /attest<br />other hosts are not children</p>'
        '</div>'
        '<p class="ab6-root">'
        '<span class="host">wenfeng.org</span>'
        '<span class="for-design">这一名下面</span>'
        '<span class="for-dev mono">children</span>'
        '</p>'
        '<ol class="ab6-tree">'
        '<li class="ab6-branch">'
        '<div class="ab6-line">'
        '<a class="path" href="/source">/source</a>'
        '<span class="name for-design">源文件</span>'
        '<span class="name for-dev mono">offer</span>'
        '<span class="act"><a class="is-pill" href="/source"><span class="for-design">看目录</span><span class="for-dev">GET</span></a></span>'
        '</div>'
        '<p class="gloss for-design">源文件本站下载。不允许再分发的，核验后领切片包。</p>'
        '<p class="gloss for-dev mono">offer · slice · no file sale · not a CDN</p>'
        '</li>'
        '<li class="ab6-branch">'
        '<div class="ab6-line">'
        '<a class="path" href="/license">/license</a>'
        '<span class="name for-design">许可</span>'
        '<span class="name for-dev mono">text</span>'
        '<span class="act"><a href="/license"><span class="for-design">查授权</span><span class="for-dev">GET</span></a></span>'
        '</div>'
        '<p class="gloss for-design">许可原文已收档。证明不替代原文，也不新设权利。</p>'
        '<p class="gloss for-dev mono">text · attest ≠ new rights</p>'
        '</li>'
        '<li class="ab6-branch">'
        '<div class="ab6-line">'
        '<a class="path" href="/gap">/gap</a>'
        '<span class="name for-design">缺字</span>'
        '<span class="name for-dev mono">gap</span>'
        '<span class="act"><a href="/gap"><span class="for-design">报缺字</span><span class="for-dev">GET</span></a></span>'
        '</div>'
        '<p class="gloss for-design">缺字形、缺收录、勘误在这里说。</p>'
        '<p class="gloss for-dev mono">/gap · submit unwired · editor not a child</p>'
        '</li>'
        '<li class="ab6-branch">'
        '<div class="ab6-line">'
        '<a class="path" href="/attest">/attest</a>'
        '<span class="name for-design">证明</span>'
        '<span class="name for-dev mono">attest</span>'
        '<span class="act"><a href="/attest"><span class="for-design">授权证明</span><span class="for-dev">GET</span></a></span>'
        '</div>'
        '<p class="gloss for-design">只给标准开源协议出证。厂商自拟、还没核实、未收录的，不出。</p>'
        '<p class="gloss for-dev mono">SPDX only · else no attest</p>'
        '</li>'
        '</ol>'
        '<p class="ab6-root is-other">'
        '<span class="host for-design">别的名字</span>'
        '<span class="host for-dev mono">not children</span>'
        '<span class="for-design">不挂在 wenfeng.org 下面</span>'
        '<span class="for-dev mono">other origins</span>'
        '</p>'
        '<ol class="ab6-tree is-other">'
        '<li class="ab6-branch">'
        '<div class="ab6-line">'
        '<a class="path" href="https://app.windfonts.com/">app.windfonts.com</a>'
        '<span class="name for-design">店面</span>'
        '<span class="name for-dev mono">shop</span>'
        '<span class="act"><a href="https://app.windfonts.com/"><span class="for-design">去店面</span><span class="for-dev">shop</span></a></span>'
        '</div>'
        '<p class="gloss for-design">样张、选字、店面用字、控制台和账号。</p>'
        '<p class="gloss for-dev mono">specimens · account · console</p>'
        '</li>'
        '<li class="ab6-branch">'
        '<div class="ab6-line">'
        '<span class="path is-quiet">尚无域名</span>'
        '<span class="name for-design">造字</span>'
        '<span class="name for-dev mono">editor</span>'
        '</div>'
        '<p class="gloss for-design">编辑器放在独立新域，不挂在本站。本站以后只做入口和收录。</p>'
        '<p class="gloss for-dev mono">other origin · no route · entry + catalog later</p>'
        '</li>'
        '</ol>'
        '<section class="ab6-note" aria-label="说明">'
        '<p class="label for-design">说明</p>'
        '<p class="label for-dev mono">note · under the tree</p>'
        '<p class="for-design">文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。文风字体提供的源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。</p>'
        '<p class="for-design">对于采用标准开源协议的字体，文派科技作为责任主体，可为合法合规使用的个人及企业出具《文风字体授权证明》，作为开源授权的证明材料。证明记录该字体在收录时的完整授权链、适用的开源协议、许可原文哈希，以及本站是否提供原件。证明不替代许可原文，也不为使用者创设新的权利。</p>'
        '<p class="for-design">其他品牌厂商自行发布的授权协议，本站只提供授权原文下载，文派科技不出具《文风字体授权证明》，也不代著作权人签署授权书。</p>'
        '<p class="for-design">wenfeng.org 只做授权核对与源文件分发。本站不出售字体文件，不出售授权，不代理厂商收费或维权，也不代表任何著作权人授权。只给采用标准开源协议的字体出证；厂商自拟条款、许可还没核实的、未收录的不出证。完整清单见<a href="/legal#legal-scope">法务说明</a>。收录与核验的方法写在<a href="/how">我们怎么核</a>。本站以前用 WordPress 做过，现已改为独立静态站点，与店面分开部署。</p>'
        '<p class="for-dev mono">oss · SPDX text · chain + hash + original?<br />attest ≠ new rights · custom terms → text only<br />no file sale · no license sale · no grant<br />SPDX only · custom / unverified / unlisted → no attest<br />/legal#legal-scope · /how · wordpress → static · split deploy</p>'
        '</section>'
        '<p class="ab-footnote for-design">wenfeng.org 之外的主机不在这页说明范围。</p>'
        '<p class="ab-footnote for-dev mono">aboutPage · ab-v6b · /about</p>'
        '</div>'
        '</section>'
    )
    body = page_head(
        "关于",
        "wenfeng.org 下面挂四条路径：源文件、许可、缺字、证明。店面和造字在别的名字下。",
        crumbs=[(None, "关于")],
        kicker="wenfeng.org",
        dev="/about",
    ) + _strip_hero(body)
    return layout("about", "关于", body, "/about", body_class="ab ab-v6b", extra_head=pages_css("prose"))


def page_gap():
    body = (
        '<section class="gp-hero">'
        '<div class="container">'
        '<p class="gp-crumb" aria-label="路径">'
        '<span class="for-design"><a href="/">首页</a> / 报缺字 · 样例未提交</span>'
        '<span class="for-dev mono">/gap · gp-v1b</span>'
        '</p>'
        '<div class="gp-display">'
        '<h1 class="for-design">报缺字</h1>'
        '<h1 class="for-dev mono">/gap</h1>'
        '<p class="gp-lead for-design">一条短笺。<br class="gp-br" />缺字形、缺收录、写错了，三件事里报一件。</p>'
        '<p class="gp-lead for-dev mono">kind=glyph|catalog|errata<br />POST 未接 · 无 coverage · 无账号 · sample glyph</p>'
        '</div>'
        '<section class="gp1-stage" aria-label="写一条短笺">'
        '<div class="gp1-letter">'
        '<p class="gp1-kicker for-design">短笺</p>'
        '<p class="gp1-kicker for-dev mono">one record</p>'
        '<div class="gp1-kinds" role="tablist" aria-label="这一条是哪一件事">'
        '<button type="button" role="tab" id="tab-glyph" data-kind="glyph" aria-controls="pane-glyph" aria-selected="true" class="is-on">缺字形</button>'
        '<button type="button" role="tab" id="tab-catalog" data-kind="catalog" aria-controls="pane-catalog" aria-selected="false">缺收录</button>'
        '<button type="button" role="tab" id="tab-errata" data-kind="errata" aria-controls="pane-errata" aria-selected="false">勘误</button>'
        '</div>'
        '<div class="gp1-fields" id="pane-glyph" role="tabpanel" aria-labelledby="tab-glyph" data-pane="glyph">'
        '<label class="gp-field">'
        '<span class="k for-design">哪一款</span><span class="k for-dev mono">norm</span>'
        '<input type="text" value="霞鹜文楷" />'
        '</label>'
        '<label class="gp-field is-char">'
        '<span class="k for-design">缺的字</span><span class="k for-dev mono">codepoint</span>'
        '<input type="text" value="龘" maxlength="8" />'
        '</label>'
        '<label class="gp-field">'
        '<span class="k for-design">在哪看到</span><span class="k for-dev mono">note</span>'
        '<textarea rows="2">版式样例。不是已提交的反馈，也不表示这一款真的缺这个字。</textarea>'
        '</label>'
        '<label class="gp-field">'
        '<span class="k for-design">怎么回</span><span class="k for-dev mono">contact?</span>'
        '<input type="text" placeholder="可选。不建账号" />'
        '</label>'
        '</div>'
        '<div class="gp1-fields" id="pane-catalog" role="tabpanel" aria-labelledby="tab-catalog" data-pane="catalog" hidden>'
        '<label class="gp-field">'
        '<span class="k for-design">字体名</span><span class="k for-dev mono">name</span>'
        '<input type="text" placeholder="目录里没有的名字" />'
        '</label>'
        '<label class="gp-field">'
        '<span class="k for-design">谁做的</span><span class="k for-dev mono">foundry</span>'
        '<input type="text" placeholder="作者或厂商" />'
        '</label>'
        '<label class="gp-field">'
        '<span class="k for-design">出处</span><span class="k for-dev mono">upstream</span>'
        '<input type="text" placeholder="仓库或发布页" />'
        '</label>'
        '<label class="gp-field">'
        '<span class="k for-design">怎么回</span><span class="k for-dev mono">contact?</span>'
        '<input type="text" placeholder="可选。不建账号" />'
        '</label>'
        '</div>'
        '<div class="gp1-fields" id="pane-errata" role="tabpanel" aria-labelledby="tab-errata" data-pane="errata" hidden>'
        '<label class="gp-field">'
        '<span class="k for-design">哪一款</span><span class="k for-dev mono">norm</span>'
        '<input type="text" placeholder="短码或中文名" />'
        '</label>'
        '<label class="gp-field">'
        '<span class="k for-design">错在哪</span><span class="k for-dev mono">field</span>'
        '<input type="text" placeholder="名字、许可或状态" />'
        '</label>'
        '<label class="gp-field">'
        '<span class="k for-design">应是</span><span class="k for-dev mono">correction</span>'
        '<textarea rows="2" placeholder="写出你看到的原文"></textarea>'
        '</label>'
        '<label class="gp-field">'
        '<span class="k for-design">怎么回</span><span class="k for-dev mono">contact?</span>'
        '<input type="text" placeholder="可选。不建账号" />'
        '</label>'
        '</div>'
        '<p class="gp1-acts">'
        '<button type="button" data-hold>提交</button>'
        '<a href="/source">先去目录核对</a>'
        '<a href="/license">许可原文</a>'
        '</p>'
        '<p class="gp1-quiet for-design" data-hold-note hidden>入口还没接上。这一下没有送出。</p>'
        '<p class="gp1-quiet for-dev mono">click → no request · POST not wired</p>'
        '</div>'
        '<aside class="gp1-dossier" aria-label="边界">'
        '<p class="label for-design">边界</p>'
        '<p class="label for-dev mono">bounds</p>'
        '<div class="gp1-kv">'
        '<div><span class="k for-design">覆盖率</span><span class="k for-dev">coverage</span><span class="v for-design">不统计。缺一个字就是缺一个字</span><span class="v for-dev mono">no rate</span></div>'
        '<div><span class="k for-design">账号</span><span class="k for-dev">auth</span><span class="v for-design">不建账号。联系方式可留可不留</span><span class="v for-dev mono">no account</span></div>'
        '<div><span class="k for-design">已收录</span><span class="k for-dev">/source</span><span class="v for-design">在目录里的，报缺字或勘误，不要再报缺收录</span><span class="v for-dev mono">in catalog → not this kind</span></div>'
        '<div><span class="k for-design">许可</span><span class="k for-dev">/license</span><span class="v for-design">写错了去勘误。原文仍以许可页为准</span><span class="v for-dev mono">textState · 不改原文</span></div>'
        '<div><span class="k for-design">入口</span><span class="k for-dev">POST</span><span class="v for-design">表单还没接上，这一下不会送出</span><span class="v for-dev mono">/gap · click → no request</span></div>'
        '</div>'
        '</aside>'
        '</section>'
        '<p class="gp-footnote for-design">样例里的字只是版式，不代表霞鹜文楷真的缺这个字。提交不会送出。。</p>'
        '<p class="gp-footnote for-dev mono">gapPage · gp-v1b · /gap · no POST</p>'
        '</div>'
        '</section>'
    )
    body = page_head(
        "缺字勘误",
        "缺字形、缺收录、写错了，三件事里报一件。提交仍不发送。造字平台不在本站，只留这一入口。",
        crumbs=[(None, "缺字")],
        kicker="侧门 03",
        dev="/gap · POST 未接",
    ) + _strip_hero(body)
    return layout("gap", "报缺字", body, "/gap", body_class="gp gp-v1b", extra_head=pages_css("prose"))


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
    data, fonts, licenses = load()
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(HERE / "assets", DIST / "assets", symlinks=True)
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
    write("/lab/source-a/", page_lab_source(fonts, "a"))
    write("/lab/source-b/", page_lab_source(fonts, "b"))
    write("/lab/source-c/", page_lab_source(fonts, "c"))
    write("/source/", page_source(fonts))
    write("/license/", page_licenses(fonts))
    for f in fonts:
        write("/source/%s/" % f["norm"], page_font(f))
        write("/license/%s/" % f["norm"], page_license(f, licenses))
        if can_attest(f):
            write("/attest/%s/" % f["norm"], page_attest(f))
        write("/slice/%s/" % f["norm"], page_slice(f, fonts))
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
    print(
        "built %d pages -> %s (license pdf %d)"
        % (sum(1 for _ in DIST.rglob("index.html")), DIST, n_lic_pdf)
    )


if __name__ == "__main__":
    main()
