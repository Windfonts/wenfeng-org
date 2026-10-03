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
import sys
from collections import OrderedDict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
DIST = HERE / "dist"
sys.path.insert(0, str(ROOT))

COMMENT = ('<!-- 本页嵌入的字体由文风字体（Windfonts）提供，可自由使用；'
           '请保留本授权标注 https://wenfeng.org/license -->')

ATTEST_SPDX = {"OFL-1.1", "MIT", "Apache-2.0", "IPA-1.0", "IPA", "CC0-1.0", "CC-BY-4.0",
               "CC-BY-SA-4.0", "GPL-2.0-with-font-exception",
               "GPL-2.0-or-later WITH Font-exception OR OFL-1.1", "MPlus-Bitmap-License"}

# 状态词：定稿词表（COPY-AUDIT 第三/四轮 + /how 甲′），说明取首页丁「目录状态」原句。
STATUS = OrderedDict([
    ("source", ("本站下载", "源文件在本站，进条目直接下载")),
    ("jump", ("官方下载", "本站不留文件，去作者或厂商的发布处")),
    ("ready", ("暂无下载", "许可已核实，源文件包还没上架")),
    ("pending", ("待核实", "许可原文还没有核对记录")),
    ("missing", ("未收录", "镜像还没收到这款，先去上游仓库或店面")),
])

NAV = [("/", "源文件", ("home",)), ("/license/", "授权", ("license",)), ("/source/", "目录", ("source", "foundry")),
       ("/attest/", "核验", ("attest", "v", "slice")), ("/about/", "关于", ("about", "legal", "use", "how", "gap"))]
FOOT = [("办事", [("/license/", "查授权"), ("/source/", "下源文件"), ("/gap/", "报缺字"), ("/slice/", "切片")]),
        ("核验", [("/attest/", "授权证明"), ("/how/", "怎么核"), ("/v/", "查证"), ("/api/v1/certs", "证明 API")]),
        ("关于", [("/about/", "关于"), ("/legal/", "法务"), ("/use/", "用法"), ("/api/v1/fonts", "目录 API")])]

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
    fonts.sort(key=lambda f: (f.get("name") or "").encode("gbk", "ignore"))
    return data, fonts, licenses


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
    return "文风·" + (f.get("name") or "")


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
        info = " · ".join(filter(None, [spdx_of(f) or f.get("licenseName") or "许可空",
                                        f.get("foundry") or "未标注", STATUS[st][0]]))
        verb = go(f) if go else {"source": "下载", "jump": "去出处", "ready": "看条目",
                                 "pending": "看条目", "missing": "看条目"}[st]
        return ('<li data-st="%s" data-hay="%s"><a href="/source/%s/"><span class="norm">%s</span>'
                '<span class="nm">%s</span><span class="info">%s</span><span class="go">%s</span></a></li>'
                % (st, e(hay), e(f["norm"]), e(f["norm"]), e(wf(f)), e(info), e(verb)))
    return ('<div class="index-head"><span>短码</span><span>名字</span><span>信息</span><span>动作</span></div>'
            '<ul class="index" data-list>%s</ul><p class="empty" data-empty hidden>没有匹配的字体。换个名字，或<a href="/gap/?kind=catalog">报缺收录</a>。</p>'
            % "".join(row(f) for f in fonts))


def filter_chips(fonts):
    counts = OrderedDict((k, 0) for k in STATUS)
    for f in fonts:
        counts[status(f)] += 1
    return '<div class="chips"><button class="chip is-on" data-filter="all">全部</button>%s</div>' % "".join(
        '<button class="chip" data-filter="%s">%s</button>' % (k, STATUS[k][0]) for k, n in counts.items() if n)


# ---------- 外壳（= 定稿 chrome / footer） ----------

def layout(section, title, body, dev="", extra_head=""):
    nav = "".join('<a href="%s"%s>%s</a>' % (h, ' class="is-active"' if section in keys else "", t)
                  for h, t, keys in NAV)
    foot = "".join('<div class="site-foot-col"><h2>%s</h2>%s</div>' % (g, "".join(
        '<a href="%s">%s</a>' % l for l in links)) for g, links in FOOT)
    wm = '<a class="wordmark" href="/"><span class="mark" aria-hidden="true"></span><span>文风</span><span class="wm-sub">· 开源</span></a>'
    return """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>%s</title>
<script>try{if(localStorage.getItem('wf-theme')==='dark')document.documentElement.dataset.theme='dark';if(localStorage.getItem('wf-view')==='dev')document.documentElement.dataset.view='dev'}catch(e){}</script>
<link rel="stylesheet" href="/assets/tokens.css"><link rel="stylesheet" href="/assets/site.css">%s
</head><body data-page="%s">
%s
<header class="topbar"><div class="container topbar-inner">%s
<nav class="topnav" aria-label="主导航">%s</nav>
<div class="topbar-end"><div class="seg" data-view-switch role="group" aria-label="视图"><button type="button" data-mode="design" class="is-on">设计</button><button type="button" data-mode="dev">开发</button></div>
<a href="https://app.windfonts.com/" target="_blank" rel="noopener" title="店面（样张与选字）">店面</a>
<button type="button" class="icon-btn" data-theme-toggle aria-label="切换深浅"><svg class="icon ico-moon" aria-hidden="true"><use href="#i-moon"></use></svg><svg class="icon ico-sun" aria-hidden="true"><use href="#i-sun"></use></svg></button></div>
</div></header>
<main class="container page">%s</main>
<footer class="site-foot"><div class="container site-foot-inner"><div class="site-foot-brand">%s
<p>源文件、许可原文、缺字反馈。开源字体直接下载，其余核验或去出处。不做样张墙，不当 CDN。</p></div>%s</div>
<div class="site-foot-bottom"><p>文派（广州）科技有限公司 · 文风开源%s</p><a href="https://app.windfonts.com/" target="_blank" rel="noopener">店面</a></div></footer>
<script src="/assets/site.js" defer></script>
</body></html>""" % (e(("%s · 文风开源" % title) if title else "文风开源"), (("\n" + extra_head) if extra_head else ""), section, SPRITE, wm, nav, body, wm, foot,
                     '<span class="for-dev mono"> · %s</span>' % e(dev) if dev else "")


# ---------- 页面 ----------

def page_home(data, fonts):
    cov = data.get("coverage") or {}
    n_src = sum(1 for f in fonts if status(f) == "source")
    n_full = sum(1 for f in fonts if lic(f).get("textState") == "full")
    body = '<p class="crumb">wenfeng.org</p>'
    body += ('<div class="display"><h1>源文件</h1><p class="lead">开源字体的源文件和许可原文。能下载的直接下载，'
             '不允许再分发的核验后领取切片包。</p></div>')
    body += '<div class="split"><div>' + tasks([
        ("查授权", "许可原文与三结论", "/license/", "shield", True),
        ("下源文件", "本站下载或官方下载，逐款标注", "/source/", "download"),
        ("报缺字", "缺字形 / 缺收录 / 勘误", "/gap/", "edit"),
    ]) + '<div style="margin-top:var(--s-8)">%s</div></div>' % search()
    body += aside("目录状态", status_words()) + '</div>'
    body += ('<div class="stats"><div class="stat"><b>%d</b><span>已收录</span></div><div class="stat"><b>%d</b><span>本站下载</span></div>'
             '<div class="stat"><b>%d</b><span>许可全文</span></div><div class="stat"><b>%d</b><span>镜像仓库</span></div>'
             '<p class="stats-cap">目录数据 · %s 更新</p></div>'
             % (len(fonts), n_src, n_full, cov.get("source_mirrors", 0), e((data.get("generated") or "")[:10])))
    body += ('<section class="sec" style="margin-top:var(--s-12)"><div class="sec-grid"><div><p class="label">关于本站</p>'
             '<h2>查授权、下源文件、<br>报缺字。</h2></div><div class="prose"><p>文风收录开源字体的源文件和许可原文，'
             '授权结论逐款核对原文。标准开源协议的字体可以出具授权证明；不允许再分发的，从官方取得原包后核验领取切片包。</p>'
             '<p class="acts" style="margin-top:var(--s-6)">%s%s%s</p></div></div></section>'
             % (ink("查授权", "/license/", "shield"), link("打开目录", "/source/", "btn", "download"), link("怎么核", "/how/", "btn")))
    return layout("home", "", body, "home")


def page_source(fonts):
    body = display("索引", "全部字体的名字索引，一行一款。按状态筛选，点动作进条目。", [(None, "目录")], "源文件目录")
    body += '<div class="split is-wide"><div><div class="toolbar">%s%s</div><p class="count" data-count></p>%s</div>' % (
        search(live=True), filter_chips(fonts), index_rows(fonts))
    body += aside("这一站", kv_rows([("源文件", "本站有的直接下载，不允许再分发的不代发"), ("许可", "结论在查授权页，这张表只标状态"),
                                    ("缺字", "缺字形、缺收录、勘误，都从一个入口报"), ("工具", "切片包和核验，不做托管分发"),
                                    ("不是", "网页字体 CDN、样张墙、店面选字")]),
                  "厂商分组见<a href=\"/foundry/\">厂商</a>。") + '</div>'
    return layout("source", "目录", body, "/source")


def page_font(f):
    kicker, say, main, sec = plan(f)
    m = f.get("mirror") or {}
    arch = files(f, "archive")
    left = ('<div class="verdict"><p class="kicker">现在</p><h1>%s</h1><p class="name">%s</p><p class="meta">%s</p>'
            '%s<p class="say">%s</p><p class="acts">%s%s</p></div>'
            % (e(kicker), e(wf(f)), e(" · ".join(filter(None, [spdx_of(f) or f.get("licenseName"), f.get("foundry"), STATUS[status(f)][0]]))),
               '<p class="quiet" style="margin-top:var(--s-3)">%s</p>' % e(f["visitorNote"]) if f.get("visitorNote") else "",
               e(say), ink(main[0], main[1]) if main and main[1] else "", "".join(link(t, h) for t, h in sec)))
    up = upstream(f)
    dossier = kv_rows([
        ("短码", '<span class="mono">%s</span>' % e(f["norm"])), ("原名", e(" · ".join(filter(None, [f.get("name"), f.get("en") if f.get("en") != f.get("name") else ""])))),
        ("协议", e(spdx_of(f) or f.get("licenseName"))),
        ("厂商", '<a href="/foundry/%s/">%s</a>' % (e(f.get("foundrySlug")), e(f.get("foundry") or "未标注"))),
        ("原文", {"full": "已归档 · %s" % e(lic(f).get("fetchedAt") or ""), "pointer": "厂商协议，以官方为准", "missing": "尚未取得"}.get(lic(f).get("textState"), "—")),
        ("归档", ("稍后提供" if arch[0].get("staged") else "本站下载") if arch else "本站不留文件"),
        ("镜像", '<a href="%s" target="_blank" rel="noopener">本站已镜像</a>' % e(m["feicode"]) if m.get("feicode") else "未收录"),
        ("上游", '<a href="%s" target="_blank" rel="noopener">%s</a>' % (e(up), e(short_url(up))) if up else "未登记"),
        ("字重", e(" · ".join(f.get("weights") or []))),
    ])
    body = crumb(("/source/", "目录"), (None, wf(f)), dev="/source/%s/" % f["norm"])
    body += '<div class="split">%s%s</div>' % (left, aside("卷宗", dossier))
    more = [("许可原文", "全文已归档，保留名以原文为准" if lic(f).get("textState") == "full" else "原文以厂商发布为准", "/license/%s/" % f["norm"])]
    if can_attest(f):
        more.append(("授权证明", "标准开源协议，可生成证明用于采购和验收归档", "/attest/%s/" % f["norm"]))
    more.append(("切片", "上传官方原包核验后领取" if is_gated(f) else "网页切片包稍后提供", "/slice/%s/" % f["norm"] if is_gated(f) else "/slice/"))
    more.append(("报缺字", "缺字形、勘误，从这个入口报", "/gap/?norm=%s" % f["norm"]))
    more.append(("店面", "样张和选字在店面，不在这一站", f.get("shop")))
    if lic(f).get("rfnNote") or (lic(f).get("origin") or {}).get("note"):
        body += '<section class="sec"><div class="sec-grid"><div><p class="label">许可附注</p></div><div class="prose">%s%s</div></div></section>' % (
            '<p>%s</p>' % e(lic(f)["origin"]["note"]) if (lic(f).get("origin") or {}).get("note") else "",
            '<p>%s</p>' % e(lic(f)["rfnNote"]) if lic(f).get("rfnNote") else "")
    body += '<p class="label" style="margin-top:var(--s-10)">还能办的事</p>' + tasks(
        [(t, d, h) for t, d, h in more], compact=True, start=2)
    return layout("source", wf(f), body, "font")


def page_licenses(fonts):
    ex = {f["norm"]: f for f in fonts}
    hero = ex.get("Xwwk") or fonts[0]
    lines, say, _ = rights(hero)
    body = display("查授权", "查一款字体的授权结论：能不能商用、能不能改、能不能再分发。", [(None, "授权")])
    body += '<div style="margin-bottom:var(--s-10)">%s</div>' % search(live=True, ph="中文名、英文、短码、协议…")
    body += '<div data-hide-on-search><div class="split"><div class="verdict"><p class="kicker">示范命中 · 01</p><h1 class="is-stack">%s</h1>' \
            '<p class="name">%s</p><p class="meta">%s</p><p class="say">%s原件在目录直接下载，可出授权证明。</p><p class="acts">%s%s%s</p></div>' % (
                "<br>".join(lines), e(wf(hero)), e(" · ".join([spdx_of(hero), hero.get("foundry") or "", STATUS[status(hero)][0]])), e(say),
                ink("打开许可原文", "/license/%s/" % hero["norm"]), link("下源文件", "/source/%s/" % hero["norm"]), link("授权证明", "/attest/%s/" % hero["norm"]))
    body += aside("卷宗", kv_rows([("短码", e(hero["norm"])), ("协议", e(spdx_of(hero))), ("厂商", e(hero.get("foundry"))),
                                   ("原文", "已归档 · 可出证"), ("源文件", STATUS[status(hero)][0]), ("商用", "允许"), ("修改", "允许"), ("再分发", "允许")])) + '</div>'
    others = [(ex.get("Albbpht"), "仅查询 · 不可下载"), (ex.get("Qzkswjz"), "待核实")]
    body += '<p class="label">其他两种结论 · 示例</p>' + tasks(
        [(t, "%s · %s" % (e(wf(f)), e(f.get("licenseName"))), "/license/%s/" % f["norm"]) for f, t in others if f], compact=True, start=2)
    body += '</div><p class="label" style="margin-top:var(--s-12)">全部条目</p><p class="count" data-count></p>'
    body += index_rows(fonts, go=lambda f: {"open": "可商用", "vendor": "仅查询", "pending": "待核实"}[rights(f)[2]]).replace(
        'href="/source/', 'href="/license/')
    body += ('<section class="sec" style="margin-top:var(--s-12)"><div class="sec-grid"><div><p class="label">嵌入注释</p><h2>这一行要留着</h2></div>'
             '<div class="prose"><p>文风字体的嵌入代码里有这一行，指向本站许可页。保留它就是履行署名义务。</p><pre class="code">%s</pre></div></div></section>' % e(COMMENT))
    return layout("license", "查授权", body, "/license")


def page_license(f, licenses):
    norm = f["norm"]
    rec = licenses.get(norm) or {}
    p = ROOT / "data/license-text" / (norm + ".json")
    text = json.loads(p.read_text("utf-8")) if p.exists() else None
    ev = (text or rec).get("evidence") or {}
    lines, say, kind = rights(f)
    if text and text.get("body"):
        main = '<pre class="license-text">%s</pre>' % e(text["body"])
    elif kind == "vendor":
        main = '<div class="prose"><p>这是厂商自拟的协议（%s）。本站不转述条款，以厂商官网发布的原文为准。</p><p class="acts" style="margin-top:var(--s-5)">%s</p></div>' % (
            e(f.get("licenseName")), ink("去官方查看", upstream(f) or f.get("shop")))
    else:
        main = '<div class="prose"><p>这款字体的许可还没核对完。核对完成前，本站不提供文件，也不出证。</p><p class="acts" style="margin-top:var(--s-5)">%s</p></div>' % (
            link("报勘误", "/gap/?kind=errata&norm=" + norm, "btn"))
    body = crumb(("/license/", "授权"), (None, wf(f)), dev="/license/%s/" % norm)
    body += ('<div class="split"><div class="verdict"><p class="kicker">%s</p><h1 class="is-stack">%s</h1><p class="name">%s</p>'
             '<p class="say">%s</p><p class="acts">%s%s</p></div>%s</div>'
             % (e(rec.get("title") or f.get("licenseName")), "<br>".join(lines), e(wf(f)), e(say),
                ink("生成授权证明", "/attest/%s/" % norm) if can_attest(f) else "", link("看条目", "/source/%s/" % norm),
                aside("取证记录", kv_rows([("协议", e(spdx_of(f) or f.get("licenseName"))), ("来源", e(ev.get("source"))),
                                         ("日期", e(ev.get("fetchedAt") or lic(f).get("fetchedAt"))),
                                         ("上游", '<a href="%s" target="_blank" rel="noopener">%s</a>' % (e(lic(f)["sourceUrl"]), e(short_url(lic(f)["sourceUrl"]))) if lic(f).get("sourceUrl") else ""),
                                         ("保留名", e(lic(f).get("rfn"))),
                                         ("哈希", '<span class="hash">%s</span>' % e(lic(f).get("textSha256")) if lic(f).get("textSha256") else "")]),
                      "哈希用来对出原文以后的改动或换版。")))
    body += '<p class="label">许可原文</p>' + main
    return layout("license", "%s 授权" % f.get("name"), body, "license")


def foundries(fonts):
    g = OrderedDict()
    for f in fonts:
        s = f.get("foundrySlug") or "unknown"
        g.setdefault(s, {"slug": s, "name": f.get("foundry") or "未标注", "fonts": []})["fonts"].append(f)
    return sorted(g.values(), key=lambda x: -len(x["fonts"]))


def page_foundries(groups):
    rows = "".join('<li data-st="all" data-hay="%s"><a href="/foundry/%s/"><span class="nm">%s</span><span class="info">%s</span><span class="go">%d 款</span></a></li>'
                   % (e(g["name"].lower()), e(g["slug"]), e(g["name"]), e("、".join(f["name"] for f in g["fonts"][:4])), len(g["fonts"])) for g in groups)
    body = display("厂商", "按作者或厂商分组。", [("/source/", "目录"), (None, "厂商")], "源文件目录")
    body += '<div class="toolbar">%s</div><p class="count" data-count></p>' % search(live=True, ph="厂商名…")
    body += '<div class="index-head is-3"><span>厂商</span><span>代表字体</span><span>款数</span></div><ul class="index is-3" data-list>%s</ul>' % rows
    return layout("foundry", "厂商", body, "/foundry")


def page_foundry(g):
    body = display(g["name"], "%d 款字体。" % len(g["fonts"]), [("/source/", "目录"), ("/foundry/", "厂商"), (None, g["name"])], "厂商", mid=True)
    body += index_rows(g["fonts"])
    return layout("foundry", g["name"], body, "/foundry/" + g["slug"])


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
             '<button class="btn" data-print>打印</button><button class="btn" data-json>下载 JSON</button>%s</div>'
             '<div class="seg" data-cert-switcher><button type="button" class="is-on" data-cert-style="classic">经典证书（默认）</button>'
             '<button type="button" data-cert-style="minimal">极简备用</button></div></div>'
             % (icon("download"), link("许可原文", "/license/%s/" % f["norm"])))
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


def page_slices(fonts):
    gated = [f for f in fonts if is_gated(f)]
    body = display("切片", "woff2 与 CSS 打成包，放进主题本地加载。开源字体的切片包稍后提供。", [(None, "切片")], "工具")
    body += '<div class="split"><div>' + tasks([
        ("原包", "从厂商官网下载、尚未解压的 zip", None, "box"),
        ("核验", "浏览器里计算整包 SHA-256，文件不离开电脑", None, "verified"),
        ("切片包", "woff2 + fonts.css，含必须保留的注释", None, "scissors")]) + '</div>'
    body += aside("这个工具", kv_rows([("给谁", "不允许再分发的免费商用字体"), ("开源字", '不必核验，到<a href="/source/">目录</a>直接拿原件'),
                                    ("不做", "托管分发、代下原包")])) + '</div>'
    body += '<p class="label">需要核验原包 · %d 款</p><p class="count" data-count></p>' % len(gated)
    body += index_rows(gated, go=lambda f: "领取").replace('href="/source/', 'href="/slice/')
    return layout("slice", "切片", body, "/slice")


def page_slice(f):
    sha = (f.get("sliceGate") or {}).get("sha256") or ""
    body = crumb(("/slice/", "切片"), (None, wf(f)), dev="/slice/%s/" % f["norm"])
    body += ('<div class="split"><div class="verdict"><p class="kicker">领取切片包</p><h1>放原包</h1><p class="name">%s</p>'
             '<p class="say">放入从厂商官网下载、尚未解压的 zip。核验在浏览器里完成，文件不离开你的电脑。</p>'
             '<label class="drop" data-drop data-sha="%s"><input type="file" accept=".zip,application/zip" hidden><b>把 zip 拖到这里</b><span>或点击选择文件</span></label>'
             '<div data-out></div></div>%s</div>'
             % (e(wf(f)), e(sha), aside("卷宗", kv_rows([("协议", e(f.get("licenseName"))), ("厂商", e(f.get("foundry"))),
                                                      ("官方", link("去官方下载", upstream(f) or f.get("shop"))),
                                                      ("原包摘要", '<span class="hash">%s</span>' % e(sha) if sha else "尚未登记，暂时不能领取")]))))
    return layout("slice", "切片 · %s" % f["name"], body, "slice")


def page_use():
    body = display("先问", "五个常见问题，各答各的：要文件、进主题、网页里用、注释能不能删、程序怎么查。", [(None, "用法")], "用法")
    qa = [
        ("file", "要文件本身？", '<p>拿原件。TTF / OTF / 上游仓库归档，给自建站和主题作者。许可允许时才再分发。</p><p class="acts" style="margin-top:var(--s-4)">%s</p>' % link("下源文件", "/source/", "btn")),
        ("theme", "要放进主题？", '<p>用切片包，给 WordPress 和静态站本地 @font-face。不允许再分发的免费商用字体，上传从厂商下载的原包 zip（不要解压），核验通过后领取。</p>'
         '<p>解压后整个文件夹放进主题（或 <code>wp-content/fonts</code>）。包内 <code>fonts.css</code> 已写好 <code>@font-face</code> 和必须保留的注释，整只引入，不要拆。</p>'
         '<pre class="code">wp_enqueue_style(\n  \'wenfeng-slice-xwwk\',\n  get_theme_file_uri( \'/fonts/wenfeng-slice-Xwwk/fonts.css\' ),\n  array(),\n  null\n);</pre>'),
        ("web", "只在网页里用？", '<p>用 <code>cn.windfonts.com</code> 托管的 CSS 和字体分片，在店面拿代码。托管分片不是原件，也不是切片包，不要拷走二次托管。</p>'),
        ("comment", "这一行能删吗？", '<p>不能。注释里的 <code>https://wenfeng.org/license</code> 要留着。</p><pre class="code">%s</pre>' % e(COMMENT)),
        ("api", "用程序查？", '<p>查目录 API。不允许再分发的字只出字段，<code>files</code> 为空。不是店面的 <code>/api/css</code>。</p>' + kv_rows(
            [("GET", '<a href="%s"><code>%s</code></a>' % (u, u)) for u in ["/api/v1/fonts", "/api/v1/fonts?offer=source", "/api/v1/fonts/Xwwk",
                                                                           "/api/v1/licenses/Xwwk", "/api/v1/foundries", "/api/v1/certs"]] + [("POST", "<code>/api/v1/certs/verify</code>")])),
    ]
    body += "".join('<section class="sec" id="%s"><div class="sec-grid"><div><span class="idx">%02d</span><h2>%s</h2></div><div class="prose">%s</div></div></section>'
                    % (i, n + 1, t, c) for n, (i, t, c) in enumerate(qa))
    return layout("use", "用法", body, "/use")


def page_how():
    body = display("先过三条", "文风只做两件事：把源文件交给你，把许可说清楚。收进目录要先过这三条。", [(None, "收录与核验")], "怎么核")
    body += '<div class="split"><div>' + tasks([("许可文本", "许可文本拿得到", None, "book"), ("来源可查", "来源能查到作者或厂商", None, "building"),
                                                 ("官方渠道", "文件取自官方渠道", None, "verified")]) + \
            '<p class="quiet" style="margin-top:var(--s-5)">来路不明的打包文件不收。许可写不清楚的，先标「待核实」，不提供文件，核对完成再更新状态。</p></div>'
    body += aside("状态词", status_words()) + '</div>'
    body += ('<section class="sec" id="evidence"><div class="sec-grid"><div><span class="idx">01</span><h2>许可怎么取证</h2></div><div class="prose">'
             '<p>以字体发布件内嵌的声明为准：安装包里的许可文件、官网许可页、上游仓库的 LICENSE，三者有其一才算拿到原文。</p>'
             '<p>取证时记录来源、日期和文本哈希。原文以后被改动或换版时，能对出变化。每款的取证记录在它的许可原文页。</p></div></div></section>'
             '<section class="sec" id="cert"><div class="sec-grid"><div><span class="idx">02</span><h2>证明怎么签</h2></div><div class="prose">'
             '<p>只给采用标准开源协议的字体出证，文派（广州）科技有限公司是出证责任主体。出证时申报用途，用途写入证明和<a href="/attest/ledger/">签发台账</a>。</p>'
             '<p>核对收到的证明：编号在台账查得到、内容与台账一致，才是文风签发的。编号对不上，按伪造处理。</p></div></div></section>')
    return layout("how", "怎么核", body, "/how")


LEGAL = [
    ("open", "打开这页", [
        ("这页是什么", "操作说明，不是法律意见。权利以各字体许可原文为准。不能替代律师审查具体项目。"),
        ("谁在按原文办事", "文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。"),
        ("证明是什么", "《文风字体授权证明》记录某日从某上游取得某款字、许可原文哈希、本站是否提供原件、可否按原文再分发。不替代许可原文，不创设新的权利，不是著作权人的授权书，不等于软著登记或公证。")]),
    ("scope", "对着原文", [
        ("先看协议是不是标准开源", "SIL OFL 1.1、MIT、Apache 2.0、IPA、CC0、CC BY / BY-SA（不含 NC）、M+、带 Font Exception 的 GPL 才出证。CC 系出证时保留作者署名。厂商自拟协议、只标「免费商用」而无正式文本的、还没核实的、未收录的：有原文只提供原文，不出证，也不代著作权人签署授权书。"),
        ("OFL 在本站怎么读", "可以用于网站、印刷、软件内嵌；可以修改、再分发；不得单独出售字体本身。保留名未获作者书面允许，派生件不能用原名。切片包只做技术子集、不改设计，仍标原名。"),
        ("国内把字库当什么", "字体一般按计算机软件保护；单字图形是否构成美术作品，判决并不统一。TTF / OTF 常被当作软件复制品，禁止再分发时把文件拷进客户交付包就可能越权。")]),
    ("lines", "看证上三行", [
        ("谁签发，名字怎么写", "签发人是文派（广州）科技有限公司，证面品牌是文风。收录名写成「文风·」加原名，这是平台命名，不是派生作品；文件内的 name 表与保留名仍用原名。"),
        ("三行结论", "网页嵌入、再分发原件、本平台是否提供原件，分开写。嵌入网页 CSS 与把原件放进安装程序，不是同一件事。"),
        ("签名验的是改没改过", "平台密钥签名，贴到核对页即可验证内容是否被改过。不是可靠电子签名，也不是 CA 证书。")]),
    ("keep", "放进档案", [
        ("采购留下这四样", "证明 PDF 和 JSON；许可原文（本站 /license/{短码}/）；若拿走了原件，当时的归档包和哈希；持证单位栏只表示副本存档单位，不等于被授权人。"),
        ("要带走文件的时候", "目录标「本站下载」的，可以按原文带走原件。厂商不允许再分发的，本站不提供文件也不出证；已从厂商取得原件的，可在切片页核验后领取自托管切片包。")]),
    ("mail", "有异议再写信", [
        ("写给 license@wenfeng.org", '收录信息有误，或对某条目有权利主张，写信到 <a href="mailto:license@wenfeng.org">license@wenfeng.org</a>，说明是哪一条、问题在哪（权利人请附权利证明）。核实期间条目标为「待核实」，暂停出证和文件。'),
        ("另走的程序", "派生件以后出现，必须另起新名。需要公证或电子认证时，另走法定程序，不要拿这张证明去顶。")]),
]


def page_legal():
    body = display("按先后", "操作说明，不是法律意见。权利以各字体许可原文为准。", [(None, "法务")], "法务")
    for n, (sid, title, items) in enumerate(LEGAL):
        body += '<section class="sec" id="%s"><div class="sec-grid"><div><span class="idx">%02d</span><h2>%s</h2></div><div>%s</div></div></section>' % (
            sid, n + 1, e(title), kv_rows([(k, v) for k, v in items], words=True).replace("<dl", '<dl style="--kw:9em"'))
    body += '<p class="acts" style="margin-top:var(--s-8)">%s%s%s</p>' % (ink("授权证明", "/attest/"), link("许可原文", "/license/", "btn"), link("怎么核", "/how/", "btn"))
    return layout("legal", "法务", body, "/legal")


def page_about():
    body = display("从根往下", "wenfeng.org 下面挂四条路径：源文件、许可、缺字、证明。店面和造字在别的名字下。", [(None, "关于")], "关于")
    body += '<p class="label">wenfeng.org 这一名下面</p>' + tasks([
        ("源文件", "源文件本站下载。不允许再分发的，核验后领切片包", "/source/", "download"),
        ("许可", "许可原文已收档。证明不替代原文，也不新设权利", "/license/", "shield"),
        ("缺字", "缺字形、缺收录、勘误在这里说", "/gap/", "edit"),
        ("证明", "只给标准开源协议出证。厂商自拟、还没核实、未收录的，不出", "/attest/", "certificate")])
    body += '<p class="label" style="margin-top:var(--s-10)">不挂在 wenfeng.org 下面</p>' + tasks([
        ("店面 · app.windfonts.com", "样张、选字、店面用字、控制台和账号", "https://app.windfonts.com/", "globe"),
        ("造字", "编辑器放在独立新域，本站以后只做入口和收录", None, "palette")], start=5)
    body += ('<section class="sec" style="margin-top:var(--s-12)"><div class="sec-grid"><div><p class="label">说明</p><h2>按协议原文办事</h2></div><div class="prose">'
             '<p>文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。文风字体提供的源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。</p>'
             '<p>对于采用标准开源协议的字体，文派科技作为责任主体，可为合法合规使用的个人及企业出具《文风字体授权证明》。证明不替代许可原文，也不为使用者创设新的权利。</p>'
             '<p>其他品牌厂商自行发布的授权协议，本站只提供授权原文，不出具证明，也不代著作权人签署授权书。</p>'
             '<p>wenfeng.org 只做授权核对与源文件分发：不出售字体文件，不出售授权，不代理厂商收费或维权。出证范围见<a href="/legal/#scope">法务说明</a>，方法见<a href="/how/">我们怎么核</a>。</p></div></div></section>')
    return layout("about", "关于", body, "/about")


def page_gap():
    body = display("报缺字", "一条短笺。缺字形、缺收录、写错了，三件事里报一件。", [(None, "报缺字")], "缺字")
    form = ('<form class="form" data-gap><div class="chips" role="tablist"><button type="button" class="chip is-on" data-kind="glyph">缺字形</button>'
            '<button type="button" class="chip" data-kind="catalog">缺收录</button><button type="button" class="chip" data-kind="errata">勘误</button></div>'
            '<div class="form" data-pane="glyph"><label>哪一款<input name="font" placeholder="字体名或短码"></label><label>缺的字<input class="big-char" maxlength="8"></label>'
            '<label>在哪看到<textarea rows="2"></textarea></label></div>'
            '<div class="form" data-pane="catalog" hidden><label>字体名<input placeholder="目录里没有的名字"></label><label>谁做的<input placeholder="作者或厂商"></label><label>出处<input placeholder="仓库或发布页"></label></div>'
            '<div class="form" data-pane="errata" hidden><label>哪一款<input name="norm" placeholder="短码或中文名"></label><label>错在哪<input placeholder="名字、许可或状态"></label><label>应是<textarea rows="2" placeholder="写出你看到的原文"></textarea></label></div>'
            '<label>怎么回<input placeholder="可选。不建账号"></label><p class="acts"><button class="btn btn-ink">提交</button>%s</p>'
            '<p class="quiet" data-sent hidden>入口还没接上。这一下没有送出。</p></form>' % link("先去目录核对", "/source/"))
    body += '<div class="split"><div>%s</div>%s</div>' % (form, aside("边界", kv_rows([
        ("覆盖率", "不统计。缺一个字就是缺一个字"), ("账号", "不建账号。联系方式可留可不留"),
        ("已收录", "在目录里的，报缺字或勘误，不要再报缺收录"), ("许可", "写错了去勘误。原文仍以许可页为准"),
        ("入口", "表单还没接上，这一下不会送出")])))
    return layout("gap", "报缺字", body, "/gap")


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
    write("/source/", page_source(fonts))
    write("/license/", page_licenses(fonts))
    for f in fonts:
        write("/source/%s/" % f["norm"], page_font(f))
        write("/license/%s/" % f["norm"], page_license(f, licenses))
        if can_attest(f):
            write("/attest/%s/" % f["norm"], page_attest(f))
        if is_gated(f):
            write("/slice/%s/" % f["norm"], page_slice(f))
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
