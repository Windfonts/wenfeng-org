(function () {
  'use strict';

  var COMMENT = '<!-- 此中文网页字体由文风字体（Windfonts）免费提供，您可以自由引用，请务必保留此授权许可标注 https://wenfeng.org/license -->';
  var PROOF = '风急天高猿啸哀 渚清沙白鸟飞回';

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
    else if (rest[0] === 'font' && rest[1]) { page = 'font'; norm = rest[1]; }
    return { variant: variant, page: page, norm: norm };
  }

  function href(variant, path) { return '/' + variant + path; }

  function chrome(route) {
    var v = route.variant;
    var lab = { a: 'A · 自己带走', b: 'B · 从注释进来', c: 'C · 可带走 / 去出处' };
    return (
      '<div class="lab">' +
        '<span>原型 ' + esc(lab[v]) + ' · 样本 8 款</span>' +
        '<a href="/">对照</a>' +
        '<a href="/a/"' + (v === 'a' ? ' class="is-on"' : '') + '>A</a>' +
        '<a href="/b/"' + (v === 'b' ? ' class="is-on"' : '') + '>B</a>' +
        '<a href="/c/"' + (v === 'c' ? ' class="is-on"' : '') + '>C</a>' +
        '<span class="gap">非生产</span>' +
      '</div>' +
      '<header class="mast">' +
        '<a class="wordmark" href="' + href(v, '/') + '">文风</a>' +
        '<nav class="nav">' +
          '<a href="' + href(v, '/') + '"' + (route.page === 'home' ? ' class="is-on"' : '') + '>首页</a>' +
          '<a href="' + href(v, '/source') + '"' + (route.page === 'list' || route.page === 'font' ? ' class="is-on"' : '') + '>字体</a>' +
          '<a href="' + href(v, '/license') + '"' + (route.page === 'licenses' || route.page === 'license' ? ' class="is-on"' : '') + '>许可</a>' +
        '</nav>' +
      '</header>'
    );
  }

  function findFont(fonts, norm) {
    for (var i = 0; i < fonts.length; i++) if (fonts[i].norm === norm) return fonts[i];
    return null;
  }

  function issueClass(f) {
    var extra = 'issue';
    if (offerOf(f) === 'pending') extra += ' is-pending';
    else if (offerOf(f) !== 'source') extra += ' is-jump';
    return extra;
  }

  function issue(f, variant) {
    var act = (f.primary && f.primary.label) || statusWord(f);
    return '<a class="' + issueClass(f) + '" href="' + href(variant, '/source/' + f.norm + '/') + '">' +
      '<span class="nm t-' + esc(f.norm) + '">' + esc(f.name) + '</span>' +
      '<p class="meta">' + esc(f.licenseName) + ' · ' + esc(statusWord(f)) + '</p>' +
      '<span class="take">' + esc(act) + '</span>' +
      '</a>';
  }

  function issues(fonts, variant) {
    return '<div class="issues">' + fonts.map(function (f) { return issue(f, variant); }).join('') + '</div>';
  }

  function roll(fonts, variant, toLicense) {
    return '<ol class="roll">' + fonts.map(function (f) {
      var path = toLicense ? '/license/' + f.norm : '/source/' + f.norm + '/';
      var cls = 'nm t-' + esc(f.norm);
      if (offerOf(f) === 'pending') cls += ' is-pending';
      return '<li><a class="' + cls + '" href="' + href(variant, path) + '">' + esc(f.name) + '</a>' +
        '<div class="meta">' + esc(f.licenseName) + ' · ' + esc(statusWord(f)) + '</div></li>';
    }).join('') + '</ol>';
  }

  function buttons(f, variant) {
    var out = '';
    if (f.primary && f.primary.href) {
      out += '<a class="take" href="' + esc(f.primary.href) + '">' + esc(f.primary.label) + '</a>';
    }
    (f.also || []).forEach(function (x) {
      out += '<a href="' + esc(x.href) + '">' + esc(x.label) + '</a>';
    });
    out += '<a href="' + href(variant, '/license/' + f.norm) + '">条款</a>';
    return '<p class="acts">' + out + '</p>';
  }

  function homeA(fonts, variant) {
    return '<p class="issue-kicker">自己带走</p>' +
      '<p class="lede">开源的字，源文件从这里拿走。不能再分发的，去店面或厂商。网页里引用走店面；切片包稍后。</p>' +
      issues(fonts, variant);
  }

  function homeB(fonts, variant) {
    return '<p class="issue-kicker">网页源码里的这条注释</p>' +
      '<p class="lede">文风嵌入的 CSS 都带着下面这行。打开 https://wenfeng.org/license 就是本页。按字体名核条款，再决定拿走还是去出处。</p>' +
      '<pre class="quote">' + esc(COMMENT) + '</pre>' +
      roll(fonts, variant, true);
  }

  function canTake(f) {
    if (offerOf(f) === 'source') return true;
    return !!(f.primary && /源文件/.test(f.primary.label));
  }

  function splitWalls(fonts, variant) {
    var take = fonts.filter(canTake);
    var go = fonts.filter(function (f) { return !canTake(f); });
    return '<div class="split">' +
      '<section><h2>原文件可拿走</h2>' + issues(take, variant) + '</section>' +
      '<div class="split-rule" aria-hidden="true"></div>' +
      '<section><h2>本站不提供原文件</h2>' + issues(go, variant) + '</section>' +
      '</div>';
  }

  function homeC(fonts, variant) {
    return '<p class="issue-kicker">可带走 / 去出处</p>' +
      '<p class="lede">左边许可允许再分发（本站未收的，跳到上游）。右边禁止单独再分发、须注册、或尚未核实，只给跳转。</p>' +
      splitWalls(fonts, variant);
  }

  function renderFont(f, route, licenses) {
    var v = route.variant;
    var lic = licenses[f.norm] || {};
    if (v === 'b') {
      return '<p class="issue-kicker"><a href="' + href(v, '/license') + '">许可</a> / ' + esc(f.name) + '</p>' +
        '<div class="detail-head"><h1 class="t-' + esc(f.norm) + '">' + esc(f.name) + '</h1>' +
        '<p class="meta">' + esc(f.licenseName) + ' · ' + esc(statusWord(f)) + '</p></div>' +
        '<div class="doc">' + esc(lic.body || '无原文') + '</div>' +
        buttons(f, v);
    }
    return '<div class="detail-head">' +
      (f.foundry ? '<p class="foundry">' + esc(f.foundry) + '</p>' : '') +
      '<h1 class="t-' + esc(f.norm) + '">' + esc(f.name) + '</h1>' +
      '<p class="proof t-' + esc(f.norm) + '">' + PROOF + '</p>' +
      '<p class="meta" style="margin-top:0.85rem">' + esc(f.licenseName) + ' · ' + esc(statusWord(f)) + '</p>' +
      (f.visitorNote ? '<p class="lede" style="margin-bottom:0">' + esc(f.visitorNote) + '</p>' : '') +
      '</div>' + buttons(f, v) +
      (f.slice === 'planned' ? '<p class="note">开源切片稍后提供，本页先链源文件。</p>' : '') +
      '<div class="doc">' + esc(lic.body || '无原文') + '</div>';
  }

  function renderLicense(f, lic, route) {
    return '<p class="issue-kicker">/license/' + esc(f.norm) + '</p>' +
      '<div class="detail-head"><h1 class="t-' + esc(f.norm) + '">' + esc(f.name) + '</h1>' +
      '<p class="meta">' + esc(lic.title || f.licenseName) + '</p></div>' +
      '<div class="doc">' + esc(lic.body || '无原文') + '</div>' +
      buttons(f, route.variant);
  }

  function listPage(fonts, variant) {
    if (variant === 'c') return '<p class="issue-kicker">字体</p>' + splitWalls(fonts, variant);
    if (variant === 'b') return '<p class="issue-kicker">字体</p>' + roll(fonts, variant, false);
    return '<p class="issue-kicker">字体</p>' + issues(fonts, variant);
  }

  function mount(data, licenses) {
    var fonts = data.fonts || [];
    var route = parsePath();
    var app = document.getElementById('app');
    var v = route.variant;
    var inner = '';

    if (route.page === 'home') {
      inner = v === 'b' ? homeB(fonts, v) : v === 'c' ? homeC(fonts, v) : homeA(fonts, v);
    } else if (route.page === 'list') {
      inner = listPage(fonts, v);
    } else if (route.page === 'font') {
      var f = findFont(fonts, route.norm);
      inner = f ? renderFont(f, route, licenses) : '<h1>没有这一款</h1>';
    } else if (route.page === 'licenses') {
      inner = '<p class="issue-kicker">/license</p>' +
        '<p class="lede">嵌入代码里的地址不能改。下面按字体核对原文。</p>' +
        '<pre class="quote">' + esc(COMMENT) + '</pre>' +
        roll(fonts, v, true);
    } else if (route.page === 'license') {
      var fl = findFont(fonts, route.norm);
      inner = fl ? renderLicense(fl, licenses[fl.norm] || {}, route) : '<h1>没有原文</h1>';
    }

    app.innerHTML = chrome(route) + '<main class="wrap">' + inner + '</main>';
    var titles = {
      home: '文风',
      list: '字体',
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
    document.getElementById('app').innerHTML = '<p class="note" style="padding:2rem">样本加载失败：' + esc(err.message) + '</p>';
  });
})();
