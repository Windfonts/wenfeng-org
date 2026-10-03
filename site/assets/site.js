/* wenfeng.org v2 — 渐进增强。页面不依赖本脚本也能读；脚本只管筛选、表单和证明。 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var qs = new URLSearchParams(location.search);
  function api(url, opt) {
    return fetch(url, opt).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (ct.indexOf('json') === -1) throw new Error('证明服务没有随这个部署开放。');
      return r.json().then(function (j) { j._status = r.status; return j; });
    });
  }
  function result(ok, title, body) {
    return '<div class="result ' + (ok ? 'is-ok' : 'is-bad') + '"><h3>' + esc(title) + '</h3>' + (body || '') + '</div>';
  }

  /* 字体 WebFont 动态加载与懒加载（同 16030） */
  var FACE_CSS_TPL = 'https://cn.windfonts.com/api/css?family={F}&weight=400&subset=zh-common&version=zh-common';
  var facesLoaded = {};
  function applyFontFace(norm, family) {
    if (!norm || !family || facesLoaded[norm]) return;
    facesLoaded[norm] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FACE_CSS_TPL.replace('{F}', encodeURIComponent(family));
    link.onload = function () {
      var st = document.createElement('style');
      st.textContent = '.t-' + norm + '{font-family:"WF-' + norm + '", var(--font-ui);}';
      document.head.appendChild(st);
    };
    document.head.appendChild(link);
  }
  function lazyPreviews() {
    var els = document.querySelectorAll('[data-face-norm]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (el) {
        applyFontFace(el.getAttribute('data-face-norm'), el.getAttribute('data-face-family'));
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        applyFontFace(e.target.getAttribute('data-face-norm'), e.target.getAttribute('data-face-family'));
      });
    }, { rootMargin: '140px' });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  /* 深浅 / 设计·开发（同 fonts-front：localStorage wf-theme / wf-view） */
  $$('[data-theme-toggle]').forEach(function (b) { b.addEventListener('click', function () {
    var d = document.documentElement.dataset.theme === 'dark';
    if (d) delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = 'dark';
    try { localStorage.setItem('wf-theme', d ? 'light' : 'dark'); } catch (e) {}
  }); });
  function setView(v) {
    document.documentElement.dataset.view = v;
    $$('[data-view-switch] [data-mode]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.mode === v); });
    try { localStorage.setItem('wf-view', v); } catch (e) {}
  }
  if (qs.get('view')) setView(qs.get('view') === 'dev' ? 'dev' : 'design');
  else setView(document.documentElement.dataset.view === 'dev' ? 'dev' : 'design');
  $$('[data-view-switch] [data-mode]').forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.mode); }); });

  /* 列表：搜索 + 状态筛选 */
  var list = $('[data-list]');
  if (list) {
    var rows = $$('li', list), hideOn = $('[data-hide-on-search]'), input = $('[data-search]'), count = $('[data-count]'), empty = $('[data-empty]'), pager = $('[data-pager]');
    var state = { q: qs.get('q') || '', st: qs.get('st') || 'all' };
    var PAGE = 20, page = parseInt(qs.get('page') || '1', 10) || 1;
    function apply() {
      var q = state.q.trim().toLowerCase(), hits = [];
      rows.forEach(function (r) {
        var hit = (!q || r.dataset.hay.indexOf(q) !== -1) && (state.st === 'all' || r.dataset.st === state.st);
        r._hit = hit; if (hit) hits.push(r);
      });
      var pages = Math.max(1, Math.ceil(hits.length / PAGE));
      if (page > pages) page = pages; if (page < 1) page = 1;
      var start = (page - 1) * PAGE;
      rows.forEach(function (r) { r.hidden = !r._hit; });
      hits.forEach(function (r, i) { if (i < start || i >= start + PAGE) r.hidden = true; });
      if (count) count.textContent = (q || state.st !== 'all') ? hits.length + ' / ' + rows.length + ' 款' : rows.length + ' 款';
      if (empty) empty.hidden = hits.length > 0;
      if (hideOn) hideOn.hidden = !!q;
      $$('[data-filter]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.filter === state.st); });
      renderPager(pages);
      var u = new URL(location.href);
      state.q ? u.searchParams.set('q', state.q) : u.searchParams.delete('q');
      state.st !== 'all' ? u.searchParams.set('st', state.st) : u.searchParams.delete('st');
      page > 1 ? u.searchParams.set('page', page) : u.searchParams.delete('page');
      history.replaceState(null, '', u);
    }
    function renderPager(pages) {
      if (!pager) return;
      if (pages <= 1) { pager.hidden = true; pager.innerHTML = ''; return; }
      pager.hidden = false;
      var html = '<button type="button" class="pg"' + (page <= 1 ? ' disabled' : '') + ' data-go="' + (page - 1) + '">上一页</button>';
      for (var i = 1; i <= pages; i++) {
        html += '<button type="button" class="pg' + (i === page ? ' is-on' : '') + '" data-go="' + i + '"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>';
      }
      html += '<button type="button" class="pg"' + (page >= pages ? ' disabled' : '') + ' data-go="' + (page + 1) + '">下一页</button>';
      pager.innerHTML = html;
      pager.querySelectorAll('[data-go]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          var g = parseInt(b.dataset.go, 10);
          if (!g || g === page) return;
          page = g; apply();
          var y = list.getBoundingClientRect().top + window.scrollY - 96;
          window.scrollTo({ top: y, behavior: 'smooth' });
        });
      });
    }
    if (input) { input.value = state.q; input.addEventListener('input', function () { state.q = input.value; page = 1; apply(); }); }
    $$('[data-filter]').forEach(function (b) { b.addEventListener('click', function () { state.st = b.dataset.filter; page = 1; apply(); }); });
    apply();
  }

  /* 授权证明：表单跳转 */
  var form = $('[data-attest-form]');
  if (form) form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var fd = new FormData(form), p = new URLSearchParams();
    ['holder', 'uscc'].forEach(function (k) { if (fd.get(k)) p.set(k, fd.get(k)); });
    var u = fd.getAll('usage'); if (u.length) p.set('usage', u.join(','));
    location.href = '/attest/' + encodeURIComponent(fd.get('norm')) + '/' + (p.toString() ? '?' + p : '');
  });
  if ($('[data-attest-go]')) location.replace('/attest/' + encodeURIComponent(qs.get('norm') || '') + '/?' + qs);

  /* 授权证明：16030 经典正式证面（默认）+ 16031 极简备用版式 */
  var CN_DIGITS = '〇一二三四五六七八九';
  function cnYear(y) {
    return String(y).split('').map(function (c) { return CN_DIGITS[c] || c; }).join('');
  }
  function cnMD(n) {
    n = parseInt(n, 10);
    if (!n) return '〇';
    if (n <= 10) return n === 10 ? '十' : CN_DIGITS[n];
    if (n < 20) return '十' + CN_DIGITS[n - 10];
    return CN_DIGITS[Math.floor(n / 10)] + '十' + (n % 10 ? CN_DIGITS[n % 10] : '');
  }
  function cnDate(iso) {
    var p = String(iso || '').slice(0, 10).split('-');
    if (p.length < 3) return '';
    return cnYear(p[0]) + '年' + cnMD(p[1]) + '月' + cnMD(p[2]) + '日';
  }
  function ic(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }
  function certChop(issuer) {
    return '<svg class="cert-chop" viewBox="0 0 200 200" aria-hidden="true">' +
      '<circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" stroke-width="4.5"/>' +
      '<circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<defs><path id="chop-top" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"/></defs>' +
      '<text class="chop-ring" fill="currentColor">' +
        '<textPath href="#chop-top" xlink:href="#chop-top" startOffset="25%" text-anchor="middle">' +
          esc(issuer || '文派（广州）科技有限公司') +
        '</textPath>' +
      '</text>' +
      '<polygon fill="currentColor" points="100,70 106.8,90.7 128.5,90.7 110.9,103.6 117.6,124.3 100,111.5 82.4,124.3 89.1,103.6 71.5,90.7 93.2,90.7"/>' +
    '</svg>';
  }
  function certScope(cert) {
    var lic = cert.license || {};
    var c = cert.conclusions || {};
    var items = [
      { m: 'ok', t: '允许商业使用' },
      { m: 'ok', t: '允许网页、应用程序及文档嵌入' },
      { m: 'ok', t: '允许修改及二次创作' },
      { m: c.redistributeFiles ? 'ok' : 'mid', t: c.redistributeFiles ? '允许再分发，须随附原始许可' : '再分发边界以原始许可为准' },
      { m: c.platformOffersSource ? 'ok' : 'mid', t: c.platformOffersSource ? '原件由本平台提供' : '原件由上游提供，本平台不予存留' }
    ];
    if (lic.spdx === 'OFL-1.1') {
      items.push({ m: 'no', t: '不得单独出售字体文件' });
      items.push(lic.rfn
        ? { m: 'no', t: '修改版本不得使用保留字体名称' }
        : { m: 'mid', t: '原始许可未设保留字体名称' });
    } else {
      items.push({ m: 'mid', t: '副本须随附版权及许可声明' });
    }
    return items;
  }

  function renderClassicCert(cert) {
    var issuer = (cert.issuer && cert.issuer.legalName) || '文派（广州）科技有限公司';
    var licName = (cert.license && cert.license.name) || '';
    var origin = (cert.license && cert.license.origin) || null;
    var holderCell = cert.holder ? esc(cert.holder) : '通用核验记录';
    var infoCells = [
      ['收录名称（分发版）', esc(cert.catalogName)],
      ['持证单位', holderCell]
    ];
    if (cert.uscc) infoCells.push(['统一社会信用代码', esc(cert.uscc)]);
    if (cert.usage && cert.usage.length) infoCells.push(['申报用途', esc(cert.usage.join('、'))]);
    var infoHtml = infoCells.map(function (p) {
      return '<div class="cert-cell"><i>' + p[0] + '</i><b>' + p[1] + '</b></div>';
    }).join('');

    var chainNodes = [
      origin
        ? { icon: 'user', role: '原始授权方', name: origin.rootAuthor + '「' + origin.rootWork + '」', sub: '衍生收录，授权沿袭' }
        : { icon: 'user', role: '原始授权方', name: cert.foundry || cert.originalName || '', sub: cert.originalEn || '原创设计' },
      { icon: 'book', role: '开源协议', name: licName, sub: '' },
      { icon: 'shield', role: '平台收录分发', name: '文风字体', sub: '出证责任主体', solid: true },
      { icon: 'idcard', role: '持证单位', name: cert.holder || '通用核验记录', sub: '证明持有' }
    ];
    var chainFlow = chainNodes.map(function (n, i) {
      var node = '<div class="chain-node">' +
        '<span class="chain-icon' + (n.solid ? ' is-solid' : '') + '">' + ic(n.icon) + '</span>' +
        '<p class="chain-role">' + esc(n.role) + '</p>' +
        '<p class="chain-name">' + esc(n.name) + '</p>' +
        '<p class="chain-sub">' + esc(n.sub || '') + '</p>' +
      '</div>';
      return (i ? '<div class="chain-arrow" aria-hidden="true">' + ic('arrow-right') + '</div>' : '') + node;
    }).join('');
    var chainDetailHtml =
      '<div class="chain-detail-row"><i>原件处理</i><b>原样提供 未做修改</b></div>' +
      '<div class="chain-detail-row is-link"><i>完整档案</i><b class="is-mono">wenfeng.org' +
        esc((cert.license && cert.license.url) || '') +
      '</b><span class="chain-detail-note">协议原文、哈希及收录版本在线可查</span></div>';

    var scopeMark = { ok: 'check', no: 'close', mid: 'info' };
    var scopeHtml = certScope(cert).map(function (it) {
      return '<span class="cert-scope-item is-' + it.m + '"><i>' + ic(scopeMark[it.m]) + '</i>' + esc(it.t) + '</span>';
    }).join('');

    var prose = '兹证明：下列字体经文风云平台按原始开源协议核验后收录分发，授权链完整可追溯。';
    if (cert.holder) {
      prose += '持证单位<b>' + esc(cert.holder) + '</b>，在下列授权范围内使用。';
    }
    prose += '有关信息列示如下：';

    return '<article class="cert-sheet' + (cert.prototype ? ' is-proto' : '') + '" id="cert-sheet">' +
      '<span class="cert-frame" aria-hidden="true"></span>' +
      '<span class="cert-frame-inner" aria-hidden="true"></span>' +
      '<p class="cert-mark" aria-hidden="true">文风字体</p>' +
      '<div class="cert-inner">' +
        '<header class="cert-header">' +
          '<div class="cert-brand">' +
            '<img class="cert-logo" src="/assets/wf-icon.webp" alt="" width="34" height="34">' +
            '<span class="cert-brand-text"><b>文风字体</b><i>WENPAI TECHNOLOGY · WINDFONTS</i></span>' +
          '</div>' +
          '<div class="cert-type"><b>开源字体 · 合规可查</b><i>OPEN FONT COMPLIANCE</i></div>' +
        '</header>' +
        '<div class="cert-flexgap" aria-hidden="true"></div>' +
        '<div class="cert-title-row">' +
          '<h1 class="cert-title">授权证明</h1>' +
        '</div>' +
        '<div class="cert-no-strip">' +
          '<span><i>证明编号</i><b class="is-red">' + esc(cert.serial) + '</b></span>' +
          '<span><i>在线查验</i><b>wenfeng.org/v</b></span>' +
        '</div>' +
        '<p class="cert-prose">' + prose + '</p>' +
        '<div class="cert-info">' + infoHtml + '</div>' +
        '<div class="cert-chain">' +
          '<div class="chain-flow">' + chainFlow + '</div>' +
          '<div class="chain-detail">' + chainDetailHtml + '</div>' +
        '</div>' +
        '<div class="cert-scope">' +
          '<div class="cert-scope-grid">' + scopeHtml + '</div>' +
        '</div>' +
        '<div class="cert-sample">' +
          '<p class="cert-sample-text t-' + esc(cert.norm) + '">风急天高猿啸哀　渚清沙白鸟飞回</p>' +
        '</div>' +
        '<p class="cert-memo"><b>声明</b>　文派（广州）科技有限公司系平台运营与分发主体，并非该字体原始著作权人。本证明不改变、不替代原始授权条款，亦非著作权人出具的授权书；字体的使用、修改及分发，以原始授权协议及著作权人声明为准。签发记录留存不少于六年。</p>' +
        '<p class="cert-hereby">特此证明</p>' +
        '<div class="cert-sign">' +
          '<div class="cert-verify">' +
            '<img class="cert-qr" alt="在线查验二维码" src="/api/v1/certs/qr?s=' + encodeURIComponent(cert.serial) + '">' +
            '<div class="cert-verify-copy"><b>电子核对</b><p>扫码进入在线查验<br>凭证明编号核对真伪</p></div>' +
          '</div>' +
          '<div class="cert-sign-off">' + certChop(issuer) +
            '<p class="cert-sign-org">' + esc(issuer) + '</p>' +
            '<p class="cert-sign-date">' + esc(cnDate(cert.issuedAt)) + '</p>' +
          '</div>' +
        '</div>' +
        (cert.prototype ? '<p class="cert-proto">电子样张　原型环境签发　不作为正式存档</p>' : '') +
      '</div>' +
    '</article>';
  }

  function renderMinimalCert(c) {
    var L = c.license || {}, C = c.conclusions || {}, yn = function (b) { return b ? '可以' : '不可以'; };
    var row = function (k, v) { return v ? '<div><dt>' + esc(k) + '</dt><dd>' + v + '</dd></div>' : ''; };
    return '<article class="cert cert-minimal">' +
      '<header><p class="mono">WENFENG · ATTESTATION</p><h2>' + esc(c.title) + '</h2><p class="mono">编号 ' + esc(c.serial) + '</p>' +
      (c.prototype ? '<span class="proto">原型样张，不作正式存档</span>' : '') + '</header>' +
      '<p class="fn">' + esc(c.catalogName) + '</p><p class="fe">' + esc(c.originalName) + (c.originalEn ? ' · ' + esc(c.originalEn) : '') + '</p>' +
      '<dl class="kv-rows">' +
        row('持证单位', esc(c.holder)) + row('信用代码', esc(c.uscc)) +
        row('申报用途', esc((c.usage || []).join('、'))) +
        row('许可协议', esc(L.name) + (L.spdx ? '（<code>' + esc(L.spdx) + '</code>）' : '')) +
        row('作者 / 厂商', esc(c.foundry)) + row('保留名', esc(L.rfn)) +
        row('源流', L.origin ? esc(L.origin.note) : '') +
        row('上游', esc(c.upstreamUrl)) + row('原文哈希', '<code class="hash">' + esc(L.sha256) + '</code>') +
        row('取证', esc((L.evidence || {}).source) + ' · ' + esc((L.evidence || {}).fetchedAt)) +
      '</dl>' +
      '<div class="concl"><div>网页嵌入<b>' + yn(C.embed) + '</b></div><div>再分发原件<b>' + yn(C.redistributeFiles) + '</b></div><div>本站提供原件<b>' + (C.platformOffersSource ? '是' : '否') + '</b></div></div>' +
      '<ul class="not">' + (c.not || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      '<footer><div>签发：' + esc((c.issuer || {}).legalName) + '<br>日期：' + esc(c.issuedAt) + '<br>签名：' + esc((c.signature || {}).alg) + ' · ' + esc(((c.signature || {}).value || '').slice(0, 16)) + '…</div>' +
      '<img src="/api/v1/certs/qr?s=' + encodeURIComponent(c.serial) + '" alt="查验二维码"></footer></article>';
  }

  /* 授权证明：渲染证面与版式切换 */
  var stage = $('[data-cert]');
  if (stage) {
    var norm = stage.dataset.norm, p = new URLSearchParams();
    ['holder', 'uscc', 'usage'].forEach(function (k) { if (qs.get(k)) p.set(k, qs.get(k)); });
    var activeCert = null;
    var certStyle = 'classic';
    try { certStyle = localStorage.getItem('wf-cert-style') || 'classic'; } catch (e) {}
    if (qs.get('style')) certStyle = qs.get('style') === 'minimal' ? 'minimal' : 'classic';

    function updateCertView() {
      if (!activeCert) return;
      if (activeCert.error) {
        stage.innerHTML = result(false, '这一款还不能出证', '<p>' + esc(activeCert.reason || activeCert.error) + '</p>');
        return;
      }
      if (certStyle === 'minimal') {
        stage.innerHTML = renderMinimalCert(activeCert);
      } else {
        if (!document.getElementById('wf-shs-css')) {
          var shs = document.createElement('link');
          shs.id = 'wf-shs-css';
          shs.rel = 'stylesheet';
          shs.href = '/assets/shs/regular.css';
          document.head.appendChild(shs);
          var shsb = document.createElement('link');
          shsb.id = 'wf-shs-css-b';
          shsb.rel = 'stylesheet';
          shsb.href = '/assets/shs/bold.css';
          document.head.appendChild(shsb);
          var shei = document.createElement('link');
          shei.id = 'wf-shsans-css';
          shei.rel = 'stylesheet';
          shei.href = '/assets/shsans/bold.css';
          document.head.appendChild(shei);
        }
        stage.innerHTML = renderClassicCert(activeCert);
      }
      if (activeCert.norm) {
        var fam = activeCert.originalName || (activeCert.catalogName ? activeCert.catalogName.replace(/^文风[·\s]*/, '') : '');
        applyFontFace(activeCert.norm, fam);
      }
      $$('[data-cert-style]').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.certStyle === certStyle);
      });
      try { localStorage.setItem('wf-cert-style', certStyle); } catch (e) {}
    }

    api('/api/v1/certs/' + encodeURIComponent(norm) + '?' + p).then(function (c) {
      activeCert = c;
      updateCertView();
      var tools = $('[data-cert-tools]'); if (tools) tools.hidden = false;
      var printBtn = $('[data-print]'); if (printBtn) printBtn.onclick = function () { print(); };
      var pdfBtn = $('[data-pdf]'); if (pdfBtn) pdfBtn.onclick = function () { location.href = '/api/v1/certs/' + encodeURIComponent(norm) + '/pdf?' + p; };
      var jsonBtn = $('[data-json]'); if (jsonBtn) jsonBtn.onclick = function () {
        var d = Object.assign({}, c); delete d._status;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
        a.download = c.serial + '.json'; a.click();
      };
      $$('[data-cert-style]').forEach(function (b) {
        b.onclick = function () { certStyle = b.dataset.certStyle; updateCertView(); };
      });
      var code = '<a href="https://wenfeng.org/v/?s=' + c.serial + '"><img src="https://wenfeng.org/badge/' + c.serial + '.svg" alt="文风字体授权证明"></a>';
      var embedEl = $('[data-embed]'); if (embedEl) embedEl.textContent = code;
      var badgeImg = $('[data-badge-img]'); if (badgeImg) badgeImg.src = '/api/v1/certs/badge?s=' + encodeURIComponent(c.serial);
      var shareSec = $('[data-share]'); if (shareSec) shareSec.hidden = false;
      var copyBtn = $('[data-copy]'); if (copyBtn) copyBtn.onclick = function (ev) { navigator.clipboard.writeText(code); ev.target.textContent = '已复制'; };
    }).catch(function (err) { stage.innerHTML = result(false, '证明服务暂不可用', '<p>' + esc(err.message) + '</p>'); });
  }

  /* 核对 JSON */
  var vf = $('[data-verify]');
  if (vf) vf.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var out = $('[data-out]'), raw = vf.json.value.trim();
    try { JSON.parse(raw); } catch (e) { out.innerHTML = result(false, '不是有效的 JSON', '<p>请贴入完整的证明文件内容。</p>'); return; }
    api('/api/v1/certs/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw }).then(function (r) {
      out.innerHTML = r.valid
        ? result(true, '签名一致', '<p>' + esc(r.catalogName) + ' · ' + esc(r.serial) + '，内容未被改动。</p>')
        : result(false, '签名不一致', '<p>' + esc(r.reason || r.error || '内容被改过，或不是文风签发的。') + '</p>');
    }).catch(function (e) { out.innerHTML = result(false, '核对服务暂不可用', '<p>' + esc(e.message) + '</p>'); });
  });

  /* 台账 */
  var lg = $('[data-ledger]');
  if (lg) api('/api/v1/certs/issued').then(function (r) {
    var rec = (r.records || []).slice().reverse();
    lg.innerHTML = '<p class="count">' + rec.length + ' 份</p><ul class="index is-3">' + rec.map(function (x) {
      return '<li><a href="/attest/' + esc(x.norm) + '/"><span class="nm mono">' + esc(x.serial) + '</span><span class="info">' + esc(x.catalogName) + ' · ' + esc((x.usage || []).join('、')) +
        '</span><span class="go">' + esc(x.issuedAt) + '</span></a></li>';
    }).join('') + '</ul>';
  }).catch(function (e) { lg.innerHTML = result(false, '台账暂不可用', '<p>' + esc(e.message) + '</p>'); });

  /* 查验 */
  var lk = $('[data-lookup]');
  if (lk) {
    if (qs.get('s')) lk.s.value = qs.get('s');
    lk.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var out = $('[data-out]');
      api('/api/v1/certs/lookup?s=' + encodeURIComponent(lk.s.value) + '&holder=' + encodeURIComponent(lk.holder.value)).then(function (r) {
        if (r.error) {
          out.innerHTML = result(false, r.error === 'holder_mismatch' ? '持证单位不一致' : '查不到这个编号',
            '<p>编号与单位须与证明上完全一致。查不到的，按伪造处理。</p>'); return;
        }
        out.innerHTML = result(true, '证书有效', '<dl class="kv-rows"><div><dt>字体</dt><dd>' + esc(r.catalogName) + '</dd></div><div><dt>协议</dt><dd>' + esc(r.spdx) +
          '</dd></div><div><dt>持证单位</dt><dd>' + esc(r.holder) + '</dd></div><div><dt>签发日期</dt><dd>' + esc(r.issuedAt) + '</dd></div><div><dt>下载次数</dt><dd>' + esc(r.downloads) + '</dd></div></dl>');
      }).catch(function (e) { out.innerHTML = result(false, '查验服务暂不可用', '<p>' + esc(e.message) + '</p>'); });
    });
  }

  /* 切片包：本地核验原包 */
  var drop = $('[data-drop]');
  if (drop) {
    var file = $('input', drop), out = $('[data-out]');
    function check(f) {
      if (!f) return;
      out.innerHTML = result(true, '正在计算摘要…', '<p>' + esc(f.name) + '</p>');
      f.arrayBuffer().then(function (buf) {
        var u8 = new Uint8Array(buf);
        if (!(u8[0] === 0x50 && u8[1] === 0x4b)) { out.innerHTML = result(false, '不是 zip 原包', '<p>请放入从厂商下载、尚未解压的 zip。</p>'); return; }
        return crypto.subtle.digest('SHA-256', buf).then(function (h) {
          var hex = Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
          var want = drop.dataset.sha;
          if (!want) out.innerHTML = result(false, '这款的原包摘要尚未登记', '<p>暂时不能领取。你的文件摘要：</p><code class="hash">' + hex + '</code>');
          else if (hex === want) out.innerHTML = result(true, '核验通过', '<p>原型阶段，切片包生成尚未接入。</p>');
          else out.innerHTML = result(false, '摘要不一致', '<p>这不是收录时的官方原包，或文件已被改动。</p><code class="hash">' + hex + '</code>');
        });
      });
    }
    file.addEventListener('change', function () { check(file.files[0]); });
    ['dragover', 'dragenter'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function () { drop.classList.remove('is-over'); }); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); check(e.dataTransfer.files[0]); });
  }

  /* 报缺字 */
  document.addEventListener('click', function (ev) {
    var kindBtn = ev.target.closest('.gp1-kinds [data-kind]');
    if (kindBtn) {
      var kind = kindBtn.getAttribute('data-kind');
      document.querySelectorAll('.gp1-kinds [data-kind]').forEach(function (b) {
        var on = b === kindBtn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('[data-pane]').forEach(function (pane) {
        pane.hidden = pane.getAttribute('data-pane') !== kind;
      });
      return;
    }
    var hold = ev.target.closest('[data-hold]');
    if (hold) {
      var holdNote = document.querySelector('[data-hold-note]');
      if (holdNote) holdNote.hidden = false;
      return;
    }
  });

  lazyPreviews();
})();
