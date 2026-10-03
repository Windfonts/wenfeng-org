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
    ("/api/v1/certs", "证明 API", "GET certs", "for-dev"),
    ("/api/v1/fonts", "目录 API", "GET fonts", "for-dev"),
]

e = lambda s: html.escape("" if s is None else str(s), quote=True)
SPRITE = re.sub(r"<\?xml[^>]*>\s*", "", (ROOT / "assets/icons.svg").read_text("utf-8"))


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


def search(action="/source/", ph="中文名、英文、短码、厂商…", live=False):
    if live:
        return ('<div class="search"><span class="k">检索</span><input type="search" data-search placeholder="%s" '
                'aria-label="检索"></div>' % e(ph))
    return ('<form class="search" action="%s" method="get"><span class="k">检索</span>'
            '<input name="q" type="search" placeholder="%s" aria-label="检索">'
            '<button class="btn btn-ink">%s搜索</button></form>' % (e(action), e(ph), icon("search")))


def status_words():
    return kv_rows([(STATUS[k][0], e(STATUS[k][1])) for k in STATUS], words=True)


def index_rows(fonts, go=None):
    def row(f):
        st = status(f)
        hay = " ".join(filter(None, [f.get("name"), f.get("en"), f.get("norm"), f.get("foundry"),
                                     f.get("licenseName")] + (f.get("aliases") or []))).lower()
        info_d = " · ".join(filter(None, [spdx_of(f) or f.get("licenseName") or "许可空",
                                          f.get("foundry") or "未标注", STATUS[st][0]]))
        info_v = "%s · offer=%s · textState=%s" % (e(f["norm"]), e(f.get("offer") or "jump"), e(lic(f).get("textState") or "—"))
        if go:
            verb = go(f)
            inked = False
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
        face = f.get("family") or ""
        cls = "lrow t-%s" % e(f["norm"]) if face else "lrow"
        attrs = ' data-face-norm="%s" data-face-family="%s"' % (e(f["norm"]), e(face)) if face else ""
        return ('<li data-st="%s" data-hay="%s"><a class="%s" href="%s"%s>'
                '<span class="lnm">%s</span>'
                '<span class="lrel">%s</span>'
                '<span class="lmeta for-design">%s</span><span class="lmeta for-dev mono">%s</span>'
                '<span class="lgo%s">%s</span></a></li>'
                % (st, e(hay), cls, href, attrs, e(wf(f)), e(STATUS[st][0]), e(info_d), info_v,
                   " is-ink" if inked else "", e(verb)))
    return ('<ul class="lin-list" data-list>%s</ul><p class="empty" data-empty hidden>没有匹配的字体。换个名字，或<a href="/gap/?kind=catalog">报缺收录</a>。</p><nav class="pager" data-pager hidden></nav>'
            % "".join(row(f) for f in fonts))


def filter_chips(fonts):
    counts = OrderedDict((k, 0) for k in STATUS)
    for f in fonts:
        counts[status(f)] += 1
    return '<div class="chips"><button class="chip is-on" data-filter="all">全部</button>%s</div>' % "".join(
        '<button class="chip" data-filter="%s">%s</button>' % (k, STATUS[k][0]) for k, n in counts.items() if n)


# ---------- 外壳（= 定稿 chrome / footer） ----------

def _foot_marks():
    gh = (
        '<li><a href="https://github.com/Windfonts" target="_blank" rel="noopener" class="is-gh"'
        ' title="GitHub（即将离开文风）" aria-label="GitHub">%s%s</a></li>'
        % (icon("github"), icon("external"))
    )
    fc = (
        '<li><a href="https://feicode.com/Windfonts" target="_blank" rel="noopener" class="is-fc"'
        ' title="FeiCode（即将离开文风）">'
        '<img src="/assets/marks/feicode.svg" alt="FeiCode" width="32" height="28">%s</a></li>'
        % icon("external")
    )
    return (
        '<p class="foot-src-k">%s</p><ul class="foot-marks">%s%s</ul>'
        % (_fv("源码与镜像", "origin · mirror"), gh, fc)
    )


def _foot_wm():
    return ('<a class="wordmark" href="/"><span class="mark" aria-hidden="true"></span>'
            '<span>文风</span><span class="wm-sub">· 开源</span></a>')


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
            '<a href="%s"%s><span class="t">%s</span><span class="d">%s</span></a>' % (
                h, (' class="%s"' % c if c else ""), e(t),
                _fv(g, h.rstrip("/")) if not c else e(g),
            )
            for h, t, g, c in FOOT_REST
        )
        inner = (
            '<div class="site-foot-inner">'
            '<div class="site-foot-brand">%s'
            '<p>开源字体直接下载，其余核验或去出处。不做样张墙。</p>%s</div>'
            '<nav class="foot-rest" aria-label="页脚">%s</nav></div>' % (_foot_wm(), _foot_marks(), rest)
        )
        cls = "site-foot is-foot-a"
    elif kind == "b":
        inner = (
            '<div class="site-foot-inner">'
            '<div class="site-foot-brand">%s'
            '<p>开源字体直接下载，其余核验或去出处。不做样张墙。</p></div></div>' % _foot_wm()
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


def layout(section, title, body, dev="", extra_head="", body_class="", nav_items=None, wordmark_href="/", footer=None):
    items = NAV if nav_items is None else nav_items
    nav = "".join('<a href="%s"%s>%s</a>' % (h, ' class="is-active"' if section in keys else "", t)
                  for h, t, keys in items)
    wm = ('<a class="wordmark" href="%s"><span class="mark" aria-hidden="true"></span>'
          '<span>文风</span><span class="wm-sub">· 开源</span></a>' % e(wordmark_href))
    b_cls = (' class="%s"' % e(body_class)) if body_class else ""
    if footer is None:
        footer = foot_site(dev)
    return """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>%s</title>
<script>try{if(localStorage.getItem('wf-theme')==='dark')document.documentElement.dataset.theme='dark';if(localStorage.getItem('wf-view')==='dev')document.documentElement.dataset.view='dev';if(localStorage.getItem('wf-scale')==='lg')document.documentElement.dataset.scale='lg'}catch(e){}</script>
<link rel="stylesheet" href="/assets/tokens.css"><link rel="stylesheet" href="/assets/site.css">%s
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
        '<span class="for-design lab-find-live" contenteditable="true" spellcheck="false" role="textbox" aria-label="可编辑的活样张" data-placeholder="写几个字试试" data-face-family="wenfeng-xxzt"><span class="lab-find-em">开源</span>商用字体</span>'
        '<span class="for-dev mono">/source</span></h1>'
        '<p class="d">%s</p></div>'
        '<div class="lab-find-act">'
        '<form class="search is-embed" action="/source/" method="get" role="search">'
        '<label class="sr-only" for="%s">搜索字体</label>'
        '<input id="%s" name="q" type="search" placeholder="中文名、英文、短码、厂商…" autocomplete="off">'
        '<button class="btn btn-ink" type="submit">%s搜索</button></form>'
        '<p class="lab-find-more">%s</p></div></div>'
        % (_fv("wenfeng.org", "wenfeng.org"),
           _fv("能下载的直接下载。<br>不能再分发的去出处或领切片包。", "offer · /source"),
           e(q_id), e(q_id), icon("search"),
           _fv('<a href="/source/?st=source">本站下载 %d 款</a> · <a href="/source/">全部 %d 款 →</a>' % (n_src, n),
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
           _fv("授权查询", "/license"), _fv("许可原文与结论。", "/license"),
           _fv("%d 份 →" % n_full, "textState=full"),
           _fv("获取证书", "/attest"), _fv("标准开源协议可出证。", "can_attest"),
           _fv("%d 款 →" % n_att, "can_attest"),
           _fv("缺字勘误", "/gap"), _fv("缺字形、缺收录、写错了。", "POST"),
           _fv("入口未接 →", "POST 未接"))
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
            '<input id="lab-q-a" name="q" type="search" placeholder="中文名、英文、短码、厂商…" autocomplete="off">'
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
            '<input id="lab-q-b" type="search" data-search placeholder="中文名、英文、短码、厂商…" autocomplete="off">'
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
    body = ('<p class="crumb"><span class="for-design">wenfeng.org / 目录</span><span class="for-dev mono">wenfeng.org /source · sd-v2b</span></p>'
            '<div class="display"><div>'
            '<p class="kicker for-design">源文件目录</p><p class="kicker for-dev mono">ia · name index</p>'
            '<h1 class="for-design">索引</h1><h1 class="for-dev mono">/source</h1></div>'
            '<p class="lead for-design">全部字体的名字索引，一行一款。<br>按状态筛选，点动作进条目。</p>'
            '<p class="lead for-dev mono">norm · name · offer · action<br>aside = boundary</p></div>')
    body += '<div class="split is-wide"><div><div class="toolbar">%s%s</div><p class="count" data-count></p>%s</div>' % (
        search(live=True), filter_chips(fonts), index_rows(fonts))
    body += aside("这一站", kv_rows([("源文件", "本站有的直接下载，不允许再分发的不代发"), ("许可", "结论在查授权页，这张表只标状态"),
                                    ("缺字", "缺字形、缺收录、勘误，都从一个入口报"), ("工具", "切片包和核验，不做托管分发"),
                                    ("不是", "网页字体 CDN、样张墙、店面选字")]),
                  "筛选作用于整张目录。侧栏写的是这一站的边界，不是某一款的状态。") + '</div>'
    return layout("source", "目录", body, "/source")


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
        return "拿走"
    k = file.get("kind")
    if k == "archive":
        return "下载原件"
    if k == "git":
        return "打开镜像仓库"
    if k == "upstream":
        return "去上游仓库"
    return file.get("label") or "打开"


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
    archive = file_of(f, "archive")
    staged = bool(archive and archive.get("staged"))
    real = primary_file(f)
    up = upstream_href(f)
    offer = f.get("offer") or "jump"
    readable = license_readable(f, lic_text)
    if can_take(f) and real and real.get("href") and real.get("kind") != "upstream" and not real.get("staged"):
        return {
            "verb": "下载原件" if real.get("kind") == "archive" else (real.get("label") or "打开"),
            "verbDev": file_name_from_href(real["href"]) or real.get("format") or real.get("kind"),
            "kickerDev": "primary · file",
            "note": "原件在本站，下载的是源文件，不是网页字体。",
            "noteDev": "files[%s] · not woff2" % (real.get("kind") or "file"),
            "strongHref": real["href"],
            "strongLabel": primary_label(real)
        }
    if up and (staged or offer == "source"):
        return {
            "verb": "去上游",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · upstream",
            "note": "归档包稍后提供，现在到上游仓库取原件。",
            "noteDev": "files[archive].staged · files[upstream] · not woff2",
            "strongHref": up,
            "strongLabel": "去上游仓库"
        }
    if up and offer == "jump":
        return {
            "verb": "去出处",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · jump",
            "note": "原件不在本站，到出处取。",
            "noteDev": "offer=jump · upstream · not woff2",
            "strongHref": up,
            "strongLabel": "去出处"
        }
    if up:
        return {
            "verb": "去上游",
            "verbDev": upstream_dev(up),
            "kickerDev": "primary · upstream",
            "note": "这一款还没做成可以下载的原件。上游在，许可还没核对完。",
            "noteDev": "offer=%s · upstream · textState=%s" % (offer, lic(f).get("textState") or "∅"),
            "strongHref": up,
            "strongLabel": "去上游仓库"
        }
    if offer == "pending":
        return {
            "verb": "读许可" if readable else "待核实",
            "verbDev": "offer=pending",
            "kickerDev": "primary · pending",
            "note": "源文件还没放在本站，也没有上游地址，先读已归档的许可。" if readable else "许可和原件都还没核对。本站不下结论，也不提供下载。",
            "noteDev": ("offer=pending · textState=%s · no file" % (lic(f).get("textState") or "∅")),
            "strongHref": ("/license/%s/" % f["norm"]) if readable else ("/gap/?norm=%s" % f["norm"]),
            "strongLabel": "读许可原文" if readable else "报缺字"
        }
    return {
        "verb": "未收录",
        "verbDev": "offer=missing",
        "kickerDev": "primary · missing",
        "note": "这一款还没有源文件，也没有核对过的出处，可以先报缺字。",
        "noteDev": "offer=missing · no upstream",
        "strongHref": "/gap/?norm=%s" % f["norm"],
        "strongLabel": "报缺字"
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
    note = verb["note"]
    visitor = (f.get("visitorNote") or "").strip()
    if visitor:
        archive = file_of(f, "archive")
        staged = bool(archive and archive.get("staged"))
        note = visitor
        if staged and "稍后" not in note and "上游" not in note:
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
    archive = file_of(f, "archive")
    staged_flag = bool(archive and archive.get("staged"))
    offer = f.get("offer") or "jump"
    meta_dev = "%s · offer=%s%s" % (
        f["norm"], offer,
        " · archive.staged" if staged_flag else (" · textState=%s" % (lic(f).get("textState") or "∅"))
    )

    acts = [{"href": verb["strongHref"], "label": verb["strongLabel"], "strong": True}]
    norm_lic_href = "/license/%s/" % f["norm"]
    if license_readable(f, None) and verb["strongHref"].rstrip("/") != norm_lic_href.rstrip("/"):
        acts.append({"href": norm_lic_href, "label": "读许可原文", "strong": False})
    if can_attest(f):
        acts.append({"href": "/attest/%s/" % f["norm"], "label": "授权证明", "strong": False})
    act_html = "".join(
        '<a%s href="%s"%s>%s</a>' % (
            ' class="is-strong"' if a["strong"] else "",
            e(a["href"]),
            ' target="_blank" rel="noopener noreferrer"' if str(a["href"]).startswith("http") else "",
            e(a["label"])
        ) for a in acts
    )

    def kv_line(kd, kv, vd, vv):
        return ('<div><span class="k for-design">%s</span><span class="k for-dev mono">%s</span>'
                '<span class="v for-design">%s</span><span class="v for-dev mono">%s</span></div>'
                % (e(kd), e(kv), vd if (isinstance(vd, str) and "<" in vd) else e(vd),
                   vv if (isinstance(vv, str) and "<" in vv) else e(vv)))

    dossier = (
        kv_line("短码", "norm", f["norm"], f["norm"]) +
        kv_line("协议", "spdx", proto, spdx or "∅") +
        kv_line("厂商", "foundry", foundry_html, foundry_slug or "—") +
        kv_line("原文", "textState", text_cell["d"], text_cell["v"]) +
        kv_line("归档", "archive", arch_cell["d"], arch_cell["v"]) +
        kv_line("镜像", "mirror", mirror_word(mirror_state) or "—", mirror_state or "∅") +
        kv_line("上游", "upstream", upstream_dossier(up), upstream_dossier(up) if up else "∅")
    )

    def idx2(n): return "%02d" % n
    rows_html = "".join(
        '<a class="fd1-row" href="%s"%s>'
        '<span class="idx">%s</span>'
        '<span class="t">%s</span>'
        '<span class="d for-design">%s</span>'
        '<span class="d for-dev mono">%s</span>'
        '<span class="go">%s</span>'
        '</a>' % (
            e(r["href"]),
            ' target="_blank" rel="noopener noreferrer"' if str(r["href"]).startswith("http") else "",
            idx2(r["n"]),
            e(r["t"]),
            e(r["d"]),
            e(r["dv"]),
            e(r["go"])
        ) for r in font_secondary(f)
    )

    body = (
        '<p class="fd-crumb" aria-label="路径">'
        '<span class="for-design"><a href="/source/">目录</a> / %s</span>'
        '<span class="for-dev mono">/source/%s · fd-v1b</span>'
        '</p>'
        '<section class="fd1-stage" aria-label="这一款现在能做的事">'
        '<div class="fd1-verb">'
        '<p class="kicker for-design">现在</p>'
        '<p class="kicker for-dev mono">%s</p>'
        '<h1 class="for-design">%s</h1>'
        '<h1 class="for-dev mono">%s</h1>'
        '<p class="fname">%s</p>'
        '<p class="meta for-design">%s · %s · %s</p>'
        '<p class="meta for-dev mono">%s</p>'
        '<p class="note for-design">%s</p>'
        '<p class="note for-dev mono">%s</p>'
        '<p class="fd1-acts">%s</p>'
        '</div>'
        '<aside class="fd1-dossier" aria-label="卷宗">'
        '<p class="label for-design">卷宗</p>'
        '<p class="label for-dev mono">record</p>'
        '<div class="fd1-kv">%s</div>'
        '</aside>'
        '</section>'
        '<p class="fd1-more-label for-design">还能办的事</p>'
        '<p class="fd1-more-label for-dev mono">secondary</p>'
        '<div class="fd1-rows">%s</div>'
        '<p class="fd-footnote for-design">动作按这一款的收录状态生成。</p>'
        '<p class="fd-footnote for-dev mono">renderFont · fd-v1b · /source/%s</p>'
        % (
            e(wf(f)), e(f["norm"]),
            e(verb["kickerDev"]),
            e(verb["verb"]),
            e(verb["verbDev"]),
            e(wf(f)),
            e(proto), e(foundry), e(status_word(f)),
            e(meta_dev),
            e(note),
            e(verb["noteDev"]),
            act_html,
            dossier,
            rows_html,
            e(f["norm"])
        )
    )
    return layout("source", wf(f), body, "/source/%s" % f["norm"], body_class="fd fd-v1b")



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
    pack = license_demo(fonts)
    built = license_stage(pack["primary"])
    kicker_d = "示范命中 · 01"
    kicker_v = "demo · not a query"
    verdict = built["verdict"].replace(
        "data-lq-kicker-d>", "data-lq-kicker-d>" + kicker_d
    ).replace(
        "data-lq-kicker-v>", "data-lq-kicker-v>" + kicker_v
    )
    foil_label_d = "其他两种结论 · 示例"
    foil_label_v = "foils · other tiers"
    stage = (
        '<section class="lq5b-stage" aria-label="主命中">'
        + verdict + built["dossier"] +
        '</section>'
        '<p class="lq5b-foils-label for-design">' + e(foil_label_d) + '</p>'
        '<p class="lq5b-foils-label for-dev mono">' + e(foil_label_v) + '</p>'
        + (
            '<div class="lq5b-foils" role="list">'
            + "".join(license_foil(f, i + 2) for i, f in enumerate(pack["foils"]))
            + '</div>' if pack["foils"] else ''
        )
    )
    foot_d = '还没检索时，这里用三款字演示三种结论；检索后换成命中。结论按收录记录生成，不是法律意见。。'
    foot_v = 'licensesPage · lq-v5b · /license · demo'

    body = (
        '<section class="lq5b-hero">'
        '<div class="container">'
        '<p class="lq5b-crumb" aria-label="路径">'
        '<span class="for-design">wenfeng.org / 授权</span>'
        '<span class="for-dev mono">wenfeng.org /license</span>'
        '</p>'
        '<div class="lq5b-display">'
        '<h1 class="for-design">查授权</h1>'
        '<h1 class="for-dev mono">/license</h1>'
        '<p class="lq5b-lead for-design">查一款字体的授权结论：<br class="lq5b-br" />能不能商用、能不能改、能不能再分发。</p>'
        '<p class="lq5b-lead for-dev mono">q → verdict · license fields<br class="lq5b-br" /> spdx · textState · offer</p>'
        '</div>'
        '<form class="lq5b-search" action="/license" method="get" role="search">'
        '<span class="lq5b-search-kicker" aria-hidden="true">检索</span>'
        '<label class="sr-only" for="q">搜索字体</label>'
        '<input id="q" name="q" type="search" value="" placeholder="中文名、英文、短码、厂商…" autocomplete="off" />'
        '<button class="btn btn-ink" type="submit">'
        '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-search"></use></svg>'
        '搜索'
        '</button>'
        '</form>'
        + stage +
        '<p class="lq5b-footnote for-design">' + foot_d + '</p>'
        '<p class="lq5b-footnote for-dev mono">' + foot_v + '</p>'
        '</div>'
        '</section>'
    )
    return layout("license", "查授权", body, "/license", body_class="lq lq-v5b")


def license_tier(f):
    t = str(lic(f).get("textState") or "")
    if t == "full":
        return {"word": "许可原文", "note": ""}
    if t == "summary":
        return {"word": "许可要点", "note": "非全文，全文以厂商发布件为准。"}
    if t == "pointer":
        return {"word": "许可指引", "note": "全文在上游仓库，本站尚未归档文本。"}
    return None


def page_license(f, licenses):
    norm = f["norm"]
    tp = _text_path(norm)
    text_data = json.loads(tp.read_text("utf-8")) if tp else None
    lic_meta = licenses.get(norm) or {}
    lic_obj = text_data or lic_meta or {}

    title = lic_obj.get("title") or f.get("licenseName") or "许可原文"
    body_text = lic_obj.get("body") or ""
    lic_o = lic(f)
    ev0 = (lic_obj.get("evidence") or {}) if isinstance(lic_obj, dict) else {}
    kind = str(lic_obj.get("textKind") or lic_o.get("textState") or "")

    orig = []
    if f.get("name"):
        orig.append(e(f["name"]))
    if f.get("en"):
        orig.append(e(f["en"]))
    orig_str = " · ".join(orig) if orig else "—"
    foundry_part = (" · " + e(f["foundry"])) if f.get("foundry") else ""
    sub = orig_str + foundry_part

    tier = license_tier(f)
    flag_word = tier["word"] if tier else "许可原文"

    state_line = ""
    fetched_date = lic_o.get("fetchedAt") or ev0.get("fetchedAt") or ""
    if kind == "full":
        fetch_str = (" · " + e(fetched_date) + " 取得") if fetched_date else ""
        state_line = "已归档" + fetch_str + " · 全文照录，未做删改。"
    elif tier and tier.get("note"):
        state_line = e(tier["note"])
        if tier["word"] == "许可指引" and lic_o.get("sourceUrl"):
            src_url = lic_o["sourceUrl"]
            host = ""
            try:
                from urllib.parse import urlparse
                host = urlparse(src_url).netloc
            except Exception:
                pass
            state_line += '原文出处：<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>' % (
                e(src_url), e(host or "上游原文")
            )

    sha = lic_o.get("textSha256") or ""
    sha_short = (sha[:8] + "…") if sha else ""
    dev_state = "textState=" + (str(lic_o.get("textState") or "∅")) + ((" · textSha256=" + sha_short) if sha else "")

    ev_rows = []
    src = lic_o.get("sourceUrl") or ev0.get("url")
    if src:
        host = ""
        try:
            from urllib.parse import urlparse
            host = urlparse(src).netloc
        except Exception:
            pass
        ev_rows.append(
            '<div><span class="k for-design">来源</span><span class="k for-dev mono">sourceUrl</span><span class="v"><a href="%s" target="_blank" rel="noopener noreferrer">%s</a></span></div>' % (
                e(src), e(host or src)
            )
        )
    if fetched_date:
        ev_rows.append(
            '<div><span class="k for-design">取得</span><span class="k for-dev mono">fetchedAt</span><span class="v">%s</span></div>' % e(fetched_date)
        )
    if sha:
        ev_rows.append(
            '<div><span class="k for-design">文本哈希</span><span class="k for-dev mono">textSha256</span><span class="v mono">%s</span></div>' % e(sha)
        )
    if lic_o.get("spdx") == "OFL-1.1" and (lic_o.get("rfn") or lic_o.get("rfnNote")):
        rfn_str = e(lic_o.get("rfn")) if lic_o.get("rfn") else "未声明保留名"
        rfn_note = ('<span class="tool-quiet"> · %s</span>' % e(lic_o["rfnNote"])) if lic_o.get("rfnNote") else ""
        ev_rows.append(
            '<div><span class="k for-design">保留名</span><span class="k for-dev mono">rfn</span><span class="v">%s%s</span></div>' % (
                rfn_str, rfn_note
            )
        )

    ev_html = ""
    if ev_rows:
        note_p = (
            '<p class="lp10-note for-design">哈希对得上，原文就没被换过。</p><p class="lp10-note for-dev mono">hash diff = tamper check</p>'
            if sha else '<p class="lp10-note for-design">文本哈希在归档文本时计算。</p>'
        )
        ev_html = (
            '<section class="lp10-evidence" aria-label="取证记录">'
            '<p class="label for-design">取证记录</p>'
            '<p class="label for-dev mono">evidence</p>'
            '<div class="lp10-kv">' + "".join(ev_rows) + '</div>'
            + note_p +
            '</section>'
        )

    acts = [
        '<a class="is-strong" href="/source/%s/">返回条目</a>' % e(f["norm"])
    ]
    if can_attest(f):
        acts.append('<a href="/attest/%s/">授权证明</a>' % e(f["norm"]))
    if f.get("shop"):
        acts.append('<a href="%s" target="_blank" rel="noopener noreferrer">去店面用</a>' % e(f["shop"]))
    acts_html = '<p class="lp10-acts">' + "".join(acts) + '</p>'

    body_part = (
        ('<article class="lp10-sheet"><pre class="lp10-doc">%s</pre></article>' % e(body_text)) + ev_html + acts_html
        if body_text else
        '<div class="page-state is-fill"><p class="kicker">许可</p><h1>还没有原文</h1><p class="lead">这一款许可尚未收入文本。</p></div>'
    )

    html = (
        '<section class="lp10-hero">'
        '<div class="container">'
        '<p class="lp10-crumb" aria-label="路径">'
        '<span class="for-design"><a href="/source/">目录</a><span class="sep">/</span><a href="/source/%s/">%s</a><span class="sep">/</span>许可</span>'
        '<span class="for-dev mono">/license/%s · lp-v10</span>'
        '</p>'
        '<div class="lp10-head">'
        '<p class="lp10-flag for-design">%s</p>'
        '<p class="lp10-flag for-dev mono">textKind=%s</p>'
        '<h1 class="for-design">%s</h1>'
        '<h1 class="for-dev mono">%s</h1>'
        '<p class="lp10-sub">%s</p>'
        '%s'
        '<p class="lp10-state for-dev mono">%s</p>'
        '</div>'
        '%s'
        '<p class="lp10-footnote for-design">取证方法写在 <a href="/how/">我们怎么核</a>。</p>'
        '<p class="lp10-footnote for-dev mono">licensePage · lp-v10 · data/license-text/%s.json</p>'
        '</div>'
        '</section>' % (
            e(f["norm"]), e(wf(f)),
            e(f["norm"]),
            e(flag_word),
            e(kind or "∅"),
            e(title),
            e(lic_o.get("spdx") or f.get("licenseName") or "—"),
            sub,
            ('<p class="lp10-state for-design">' + state_line + '</p>') if state_line else '',
            dev_state,
            body_part,
            e(f["norm"])
        )
    )
    return layout("license", "%s 授权" % wf(f), html, "/license/%s" % f["norm"], body_class="lp lp-v10")


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
    body = (
        '<div class="container page-pad">'
        '<div class="page-head is-compact">'
        '<p class="kicker">厂商</p>'
        '<h1>按组织分组</h1>'
        '<p class="lead">镜像按上游组织归类。目录里出现的厂商如下。</p>'
        '</div>'
        '<ul class="foundry-cards">%s</ul>'
        '</div>'
        % "".join(foundry_card(g) for g in groups)
    )
    return layout("foundry", "厂商", body, "/foundry", body_class="page-foundries")


def page_foundry(g):
    cards_html = (
        '<ul class="specimens">%s</ul>' % "".join(font_specimen_card(f) for f in g["fonts"])
        if g["fonts"] else
        '<div class="page-state"><p class="kicker">目录</p><h1>没有这一类</h1><p class="lead">换一个筛选，或搜名字。</p><p class="acts"><a class="btn btn-ink" href="/source/">全部目录</a></p></div>'
    )
    body = (
        '<div class="container page-pad">'
        '<div class="page-head is-compact">'
        '<p class="crumb"><a href="/foundry">厂商</a><span>/</span><span>%s</span></p>'
        '<p class="kicker">厂商</p>'
        '<h1>%s</h1>'
        '<p class="lead">这一页是目录里归属「%s」的字体。</p>'
        '</div>'
        '<p class="count-line"><strong>%d</strong> 款</p>'
        '%s'
        '</div>'
        % (e(g["name"]), e(g["name"]), e(g["name"]), len(g["fonts"]), cards_html)
    )
    return layout("foundry", g["name"], body, "/foundry/%s" % g["slug"], body_class="page-foundry")


def page_attest_index(fonts):
    ok = [f for f in fonts if can_attest(f)]
    opts = "".join('<option value="%s">%s · %s</option>' % (e(f["norm"]), e(wf(f)), e(spdx_of(f))) for f in ok)
    body = display("授权证明", "标准开源协议的字体，由文派（广州）科技有限公司出具证明，记录授权链、协议和原文哈希。证明不是著作权人另行授权。",
                   [(None, "核验")], "核验")
    form = ('<form class="form" action="/attest/go/" method="get" data-attest-form><label>字体<select name="norm" required>%s</select></label>'
            '<div class="two"><label>持证单位（可选）<input name="holder" placeholder="只印在这一份副本上" autocomplete="organization"></label>'
            '<label>统一社会信用代码（可选）<input name="uscc" placeholder="91440101MA…" autocomplete="off"></label></div>'
            '<fieldset><legend>用途</legend><div class="checks">'
            '<label><input type="checkbox" name="usage" value="web" checked>网页嵌入</label><label><input type="checkbox" name="usage" value="print">印刷物料</label>'
            '<label><input type="checkbox" name="usage" value="embed">软件内嵌</label><label><input type="checkbox" name="usage" value="modify">修改衍生</label>'
            '<label><input type="checkbox" name="usage" value="redistribute">再分发</label></div></fieldset>'
            '<p class="acts"><button class="btn btn-ink">%s生成授权证明</button></p></form>' % (opts, icon("certificate")))
    body += '<div class="split"><div>%s</div>%s</div>' % (form, aside("出证边界", kv_rows([
        ("谁签发", "文派（广州）科技有限公司。文派不是字体的著作权人"), ("给谁出", "OFL、MIT、Apache 等标准开源协议"),
        ("不出", "厂商自拟、还没核实、未收录的"), ("怎么核", "编号在台账查得到、内容一致才是真的")]), '<a href="/legal/#scope">出证范围</a>'))
    body += '<p class="label">核验还能办的事</p>' + tasks([
        ("核对一份 JSON", "贴进证明文件，看内容有没有被改过", "/attest/verify/", "verified"),
        ("签发台账", "每份证明签发即登记", "/attest/ledger/", "history"),
        ("证书查验", "编号 + 持证单位两要素", "/v/", "search"),
        ("切片包", "不可再分发的字体，核验原包后领取", "/slice/", "scissors")])
    body += '<p class="label" style="margin-top:var(--s-12)">可出证的字体 · %d 款</p><p class="count" data-count></p>' % len(ok)
    body += index_rows(ok, go=lambda f: "出证").replace('href="/source/', 'href="/attest/')
    return layout("attest", "授权证明", body, "/attest")


def page_attest(f):
    body = crumb(("/attest/", "核验"), (None, wf(f)), dev="/attest/%s/" % f["norm"])
    tools = ('<div class="acts no-print" data-cert-tools hidden style="margin-bottom:var(--s-8);justify-content:space-between;align-items:center">'
             '<div class="acts"><button class="btn btn-ink" data-pdf>%s下载 PDF（A4）</button>'
             '<button class="btn" data-print>打印</button><button class="btn" data-json>下载 JSON</button>%s%s</div>'
             '<div class="seg" data-cert-switcher><button type="button" class="is-on" data-cert-style="classic">经典证书（默认）</button>'
             '<button type="button" data-cert-style="minimal">极简备用</button></div></div>'
             % (icon("download"), link("许可原文", "/license/%s/" % f["norm"]), link("台账", "/attest/ledger/")))
    share = ('<section class="sec no-print" data-share hidden><div class="sec-grid"><div><p class="label">分享证书</p><h2>把授权证明挂到自己的网站</h2></div>'
             '<div class="prose"><p>贴一段代码，徽章由文风服务器按编号出图，站点改不了内容；访客点击直达在线查验。</p>'
             '<p><img class="share-badge" data-badge-img src="" alt="授权证明徽章预览" style="max-height:48px"></p>'
             '<pre class="code" data-embed></pre>'
             '<p class="acts"><button class="btn" data-copy>%s复制嵌入代码</button></p></div></div></section>'
             % icon("copy"))
    extra = ('<link rel="stylesheet" href="/assets/shs/regular.css">\n'
             '<link rel="stylesheet" href="/assets/shs/bold.css">\n'
             '<link rel="stylesheet" href="/assets/shsans/bold.css">')
    body += tools + ('<div class="cert-stage" data-cert data-norm="%s"><p class="quiet">正在生成证明…</p></div>' % e(f["norm"])) + share
    return layout("attest", "%s 授权证明" % f["name"], body, "attest", extra_head=extra)


def page_attest_go():
    return layout("attest", "生成授权证明", '<p class="quiet" data-attest-go>正在跳转…</p>')


def page_verify():
    body = display("核对", "把下载的证明 JSON 贴进来，核对编号和内容有没有被改过。", [("/attest/", "核验"), (None, "核对")], "核验", mid=True)
    body += ('<div class="split"><div><form class="form" data-verify><label>证明 JSON<textarea name="json" rows="12" '
             'placeholder=\'{ "type": "wenfeng.attestation.v1", … }\'></textarea></label><p class="acts"><button class="btn btn-ink">核对</button></p></form>'
             '<div data-out></div></div>%s</div>' % aside("说明", kv_rows([("签名", "平台密钥，验的是改没改过"), ("不是", "可靠电子签名或 CA 证书"), ("另见", '<a href="/attest/ledger/">签发台账</a>')])))
    return layout("attest", "核对证明", body, "/attest/verify")


def page_ledger():
    body = display("台账", "每份证明签发即登记。编号查不到的，按伪造处理。", [("/attest/", "核验"), (None, "台账")], "核验", mid=True)
    body += '<div data-ledger><p class="quiet">正在读取台账…</p></div>'
    return layout("attest", "签发台账", body, "/attest/ledger")


def page_lookup():
    extra = ('<link rel="stylesheet" href="/assets/shs/regular.css">\n'
             '<link rel="stylesheet" href="/assets/shs/bold.css">\n'
             '<link rel="stylesheet" href="/assets/shsans/bold.css">')
    body = display("查证", "输入证明编号和持证单位，两项一致即显示证书信息。", [(None, "查证")], "核验", mid=True)
    body += ('<div class="split"><div><form class="form" data-lookup><div class="two"><label>证明编号<input name="s" placeholder="WF-…" required></label>'
             '<label>持证单位<input name="holder" placeholder="与证明上一致" required></label></div><p class="acts"><button class="btn btn-ink">查验</button></p></form>'
             '<div data-out></div></div>%s</div>' % aside("说明", kv_rows([("两要素", "编号与单位须与证明完全一致"), ("查不到", "按伪造处理")])))
    return layout("v", "查证", body, "/v", extra_head=extra)


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

    body = (
        '<div class="container tool-page">'
        '<div class="tool-bar">'
        '<p class="kicker">切片工具</p>'
        '<p class="tool-bar-meta">本地处理 · 文件不离开本机</p>'
        '</div>'
        '<h1>领取切片包</h1>'
        '<p class="tool-lead">不允许再分发的免费商用字体，本站不提供文件。放入官方 zip，核验通过后领取切片包。</p>'
        '<ol class="tool-how">'
        '<li><span>01</span><div><strong>原包</strong><p>尚未解压的官方 zip</p></div></li>'
        '<li><span>02</span><div><strong>核验</strong><p>浏览器里计算整包摘要</p></div></li>'
        '<li><span>03</span><div><strong>切片包</strong><p>woff2 与 CSS，供自托管</p></div></li>'
        '</ol>'
        '<p class="count-line"><strong>%d</strong> 款上传原包核验后领取</p>'
        '%s'
        '%s'
        '<p class="tool-aside">开源字体不必走核验，到<a href="/source">目录</a>直接拿原件。</p>'
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

    body = (
        '<div class="container tool-page"%s>'
        '<div class="tool-bar">'
        '<p class="kicker">切片工具</p>'
        '<p class="tool-bar-meta">本地处理 · 文件不离开本机</p>'
        '</div>'
        '<h1>领取切片包</h1>'
        '<p class="tool-lead">%s</p>'
        '%s'
        '%s'
        '%s'
        '</div>'
        % (gate_attrs, lead, face_html, inner, foot_html)
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
    return layout("use", "用法", body, "/use", body_class="us us-v4b")


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
    return layout("how", "怎么核", body, "/how", body_class="hw hw-v1b")


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
    return layout("legal", "法务", body, "/legal", body_class="lg lg-v4")


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
    return layout("about", "关于", body, "/about", body_class="ab ab-v6b")


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
    return layout("gap", "报缺字", body, "/gap", body_class="gp gp-v1b")


def page_404():
    body = display("没有这一页", '回<a href="/source/">目录</a>搜名字，或从嵌入注释进入<a href="/license/">许可</a>。', kicker="404", mid=True)
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
    write("/", page_home(data, fonts))
    write("/lab/home-a/", page_lab_home(data, fonts, "a"))
    write("/lab/home-b/", page_lab_home(data, fonts, "b"))
    write("/lab/home-c/", page_lab_home(data, fonts, "c"))
    write("/lab/foot-a/", page_lab_foot(data, fonts, "a"))
    write("/lab/foot-b/", page_lab_foot(data, fonts, "b"))
    write("/lab/foot-c/", page_lab_foot(data, fonts, "c"))
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
    print("built %d pages -> %s" % (sum(1 for _ in DIST.rglob("index.html")), DIST))


if __name__ == "__main__":
    main()
