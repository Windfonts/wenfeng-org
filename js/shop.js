(function () {
  'use strict';

  var COMMENT = '<!-- 此中文网页字体由文风字体（Windfonts）免费提供，您可以自由引用，请务必保留此授权许可标注 https://wenfeng.org/license -->';
  var PROOF = '风急天高猿啸哀 渚清沙白鸟飞回';
  var LAB = { d: 'D · 字体库', e: 'E · 一款字', f: 'F · 可带走 / 跳转' };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function offerOf(f) { return f.offer || 'jump'; }
  function statusWord(f) {
    if (offerOf(f) === 'source') return '可带走';
    if (offerOf(f) === 'pending') return '待核实';
    return '去出处';
  }
  function canTake(f) {
    return offerOf(f) === 'source';
  }
  function findFont(fonts, norm) {
    for (var i = 0; i < fonts.length; i++) if (fonts[i].norm === norm) return fonts[i];
    return null;
  }
  function href(v, path) { return '/' + v + path; }

  function parsePath() {
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var variant = document.body.getAttribute('data-variant');
    var rest = parts.slice(1);
    var page = 'home';
    var norm = '';
    if (rest[0] === 'source' && rest[1]) { page = 'font'; norm = rest[1]; }
    else if (rest[0] === 'source') page = 'list';
    else if (rest[0] === 'license' && rest[1]) { page = 'license'; norm = rest[1]; }
    else if (rest[0] === 'license') page = 'licenses';
    return { variant: variant, page: page, norm: norm };
  }

  function theme() {
    try { return localStorage.getItem('wf-theme') === 'dark' ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  }
  function applyTheme() {
    if (theme() === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
  function toggleTheme() {
    try { localStorage.setItem('wf-theme', theme() === 'dark' ? 'light' : 'dark'); } catch (e) {}
    applyTheme();
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) btn.setAttribute('aria-label', theme() === 'dark' ? '切换到浅色' : '切换到深色');
  }

  function chrome(route) {
    var v = route.variant;
    var licOn = route.page === 'licenses' || route.page === 'license';
    return (
      '<div class="lab">' +
        '<span>原型 ' + esc(LAB[v]) + ' · 店面设计语言 · 样本 8 款</span>' +
        '<a href="/">对照</a>' +
        '<a href="/d/"' + (v === 'd' ? ' class="is-on"' : '') + '>D</a>' +
        '<a href="/e/"' + (v === 'e' ? ' class="is-on"' : '') + '>E</a>' +
        '<a href="/f/"' + (v === 'f' ? ' class="is-on"' : '') + '>F</a>' +
        '<span class="dead">A B C 已否</span>' +
        '<span class="gap">非生产</span>' +
      '</div>' +
      '<header class="topbar">' +
        '<div class="container topbar-inner">' +
          '<a class="wordmark" href="' + href(v, '/') + '"><span class="mark">文</span><span>文风</span></a>' +
          '<nav class="topnav" aria-label="主导航">' +
            '<a href="' + href(v, '/') + '"' + (route.page === 'home' ? ' class="is-active"' : '') + '>源文件</a>' +
            '<a href="' + href(v, '/source') + '"' + (route.page === 'list' || route.page === 'font' ? ' class="is-active"' : '') + '>目录</a>' +
            '<a href="' + href(v, '/license') + '"' + (licOn ? ' class="is-active"' : '') + '>许可</a>' +
          '</nav>' +
          '<div class="topbar-end">' +
            '<a href="https://app.windfonts.com/">去店面</a>' +
            '<button type="button" class="icon-btn" data-theme-toggle aria-label="' + (theme() === 'dark' ? '切换到浅色' : '切换到深色') + '">◐</button>' +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  function footer(v) {
    return '<footer class="site-extra-footer"><div class="container extra-inner">' +
      '<p class="extra-copy">wenfeng.org 原型 · 源文件和下载 · 许可只是一小块</p>' +
      '<div class="extra-links">' +
        '<a href="' + href(v, '/license') + '">许可</a>' +
        '<a href="https://app.windfonts.com/">文风字体</a>' +
      '</div></div></footer>';
  }

  function buttons(f, v) {
    var out = '';
    if (f.primary && f.primary.href) {
      var ink = canTake(f) ? ' btn-ink' : '';
      out += '<a class="btn' + ink + '" href="' + esc(f.primary.href) + '">' + esc(f.primary.label) + '</a>';
    }
    (f.also || []).forEach(function (x) {
      out += '<a class="btn" href="' + esc(x.href) + '">' + esc(x.label) + '</a>';
    });
    out += '<a class="btn btn-text" href="' + href(v, '/license/' + f.norm) + '">条款</a>';
    return '<p class="acts">' + out + '</p>';
  }

  function card(f, v) {
    var act = (f.primary && f.primary.label) || statusWord(f);
    var ink = canTake(f) ? ' btn-ink' : '';
    return '<li class="specimen">' +
      '<div>' +
        '<a class="name t-' + esc(f.norm) + '" href="' + href(v, '/source/' + f.norm + '/') + '">' + esc(f.name) + '</a>' +
        '<p class="meta">' + esc(f.foundry || '—') + ' · ' + esc(f.licenseName) + ' · ' + esc(statusWord(f)) + '</p>' +
      '</div>' +
      '<a class="btn btn-sm take' + ink + '" href="' + href(v, '/source/' + f.norm + '/') + '">' + esc(act) + '</a>' +
    '</li>';
  }

  function cards(fonts, v) {
    return '<ul class="specimens">' + fonts.map(function (f) { return card(f, v); }).join('') + '</ul>';
  }

  function filterBar(current) {
    var keys = [
      { id: 'all', label: '全部' },
      { id: 'source', label: '可带走' },
      { id: 'jump', label: '去出处' },
      { id: 'pending', label: '待核实' }
    ];
    return '<div class="seg" role="tablist">' + keys.map(function (k) {
      return '<button type="button" data-filter="' + k.id + '"' + (k.id === current ? ' class="is-on"' : '') + '>' + k.label + '</button>';
    }).join('') + '</div>';
  }

  function filtered(fonts, key) {
    if (key === 'source') return fonts.filter(function (f) { return offerOf(f) === 'source'; });
    if (key === 'pending') return fonts.filter(function (f) { return offerOf(f) === 'pending'; });
    if (key === 'jump') return fonts.filter(function (f) { return offerOf(f) !== 'source' && offerOf(f) !== 'pending'; });
    return fonts;
  }

  function homeD(fonts, v, key) {
    var list = filtered(fonts, key || 'all');
    return '<div class="container">' +
      '<div class="page-head">' +
        '<p class="kicker">源文件和下载</p>' +
        '<h1>拿走原件或切片</h1>' +
        '<p class="lead">开源字体给 WordPress 和自建站自选带走。不能再分发的，去店面引用或去厂商。网页里用走 app.windfonts.com。</p>' +
      '</div>' +
      filterBar(key || 'all') +
      '<p class="kicker" style="margin-bottom:1rem">' + list.length + ' 款</p>' +
      cards(list, v) +
    '</div>';
  }

  function homeE(fonts, v) {
    var feat = fonts.filter(function (f) { return offerOf(f) === 'source'; })[0] || fonts[0];
    return '<div class="container">' +
      '<div class="hero">' +
        '<p class="kicker">源文件 · ' + esc(feat.foundry || '') + '</p>' +
        '<a class="live t-' + esc(feat.norm) + '" href="' + href(v, '/source/' + feat.norm + '/') + '">' + esc(feat.name) + '</a>' +
        '<p class="lead">' + esc(feat.visitorNote) + ' 条款在许可页。这个站是源文件和下载。</p>' +
        '<p class="acts">' +
          '<a class="btn btn-ink" href="' + esc(feat.primary.href) + '">' + esc(feat.primary.label) + '</a>' +
          '<a class="btn" href="' + href(v, '/source') + '">全部 8 款</a>' +
          '<a class="btn" href="' + esc(feat.shop) + '">在网页里用</a>' +
        '</p>' +
      '</div>' +
      '<p class="kicker">其余样本</p>' +
      cards(fonts.filter(function (f) { return f.norm !== feat.norm; }), v) +
    '</div>';
  }

  function homeF(fonts, v) {
    var take = fonts.filter(canTake);
    var go = fonts.filter(function (f) { return !canTake(f); });
    return '<div class="container">' +
      '<div class="page-head">' +
        '<p class="kicker">源文件和下载</p>' +
        '<h1>能拿走的，和只能跳转的</h1>' +
        '<p class="lead">左边许可允许再分发。右边禁止单独再分发、须注册、或尚未核实。</p>' +
      '</div>' +
      '<div class="split">' +
        '<section><h2>可带走 · ' + take.length + '</h2>' + cards(take, v) + '</section>' +
        '<section><h2>本站不提供原文件 · ' + go.length + '</h2>' + cards(go, v) + '</section>' +
      '</div>' +
    '</div>';
  }

  function renderFont(f, route, licenses) {
    var v = route.variant;
    var lic = licenses[f.norm] || {};
    return '<div class="container">' +
      '<div class="detail-title">' +
        '<p class="crumb"><a href="' + href(v, '/') + '">源文件</a><span>/</span><span>' + esc(f.name) + '</span></p>' +
        (f.foundry ? '<p class="kicker">' + esc(f.foundry) + '</p>' : '') +
        '<h1 class="t-' + esc(f.norm) + '">' + esc(f.name) + '</h1>' +
        '<p class="proof t-' + esc(f.norm) + '">' + PROOF + '</p>' +
        '<p class="meta">' + esc(f.licenseName) + ' · ' + esc(statusWord(f)) + '</p>' +
      '</div>' +
      '<div class="detail-grid">' +
        '<div class="panel">' +
          '<h2>' + (canTake(f) ? '拿走' : '去出处') + '</h2>' +
          '<p class="note">' + esc(f.visitorNote) + '</p>' +
          (f.slice === 'planned' ? '<p class="note" style="margin-top:0.75rem">开源切片稍后提供，本页先链源文件。</p>' : '') +
          buttons(f, v) +
        '</div>' +
        '<aside class="panel">' +
          '<h2>许可</h2>' +
          '<p class="note">' + esc(lic.title || f.licenseName) + '</p>' +
          '<a class="btn btn-text" href="' + href(v, '/license/' + f.norm) + '" style="margin-top:1rem">看原文</a>' +
        '</aside>' +
      '</div>' +
    '</div>';
  }

  function listPage(fonts, v) {
    return '<div class="container"><div class="page-head"><p class="kicker">目录</p><h1>8 款样本</h1></div>' + cards(fonts, v) + '</div>';
  }

  function licensesPage(fonts, v) {
    return '<div class="container">' +
      '<div class="page-head">' +
        '<p class="kicker">/license</p>' +
        '<h1>许可原文</h1>' +
        '<p class="lead">嵌入代码里的这个地址不能改。按字体核条款。这不是全站，源文件在「源文件」。</p>' +
      '</div>' +
      '<pre class="code">' + esc(COMMENT) + '</pre>' +
      cards(fonts, v) +
    '</div>';
  }

  function licensePage(f, lic, v) {
    return '<div class="container">' +
      '<div class="page-head">' +
        '<p class="crumb"><a href="' + href(v, '/license') + '">许可</a><span>/</span><span>' + esc(f.name) + '</span></p>' +
        '<h1 class="t-' + esc(f.norm) + '">' + esc(f.name) + '</h1>' +
        '<p class="lead">' + esc(lic.title || f.licenseName) + '</p>' +
      '</div>' +
      buttons(f, v) +
      '<pre class="doc">' + esc(lic.body || '无原文') + '</pre>' +
    '</div>';
  }

  function bind(app, fonts, v) {
    var filter = 'all';
    app.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-filter]');
      if (t) {
        filter = t.getAttribute('data-filter');
        var inner = homeD(fonts, v, filter);
        var main = app.querySelector('main');
        if (main) main.innerHTML = inner;
        return;
      }
      if (ev.target.closest('[data-theme-toggle]')) toggleTheme();
    });
  }

  function mount(data, licenses) {
    applyTheme();
    var fonts = data.fonts || [];
    var route = parsePath();
    var app = document.getElementById('app');
    var v = route.variant;
    var inner = '';
    if (route.page === 'home') {
      inner = v === 'e' ? homeE(fonts, v) : v === 'f' ? homeF(fonts, v) : homeD(fonts, v, 'all');
    } else if (route.page === 'list') {
      inner = listPage(fonts, v);
    } else if (route.page === 'font') {
      var f = findFont(fonts, route.norm);
      inner = f ? renderFont(f, route, licenses) : '<div class="container page-head"><h1>没有这一款</h1></div>';
    } else if (route.page === 'licenses') {
      inner = licensesPage(fonts, v);
    } else if (route.page === 'license') {
      var fl = findFont(fonts, route.norm);
      inner = fl ? licensePage(fl, licenses[fl.norm] || {}, v) : '<div class="container page-head"><h1>没有原文</h1></div>';
    }
    app.innerHTML = chrome(route) + '<main>' + inner + '</main>' + footer(v);
    bind(app, fonts, v);
    var titles = {
      home: '源文件',
      list: '目录',
      licenses: '许可',
      license: (route.norm || '') + ' 许可',
      font: route.norm || '字体'
    };
    document.title = (titles[route.page] || '文风') + ' · 原型 ' + v.toUpperCase();
  }

  Promise.all([
    fetch('/samples.json').then(function (r) { return r.json(); }),
    fetch('/data/licenses.json').then(function (r) { return r.json(); })
  ]).then(function (pair) {
    mount(pair[0], pair[1]);
  }).catch(function (err) {
    document.getElementById('app').innerHTML = '<p style="padding:2rem">样本加载失败：' + esc(err.message) + '</p>';
  });
})();
