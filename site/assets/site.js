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
      return r.json().then(function (j) {
        if (!j || typeof j !== 'object' || Array.isArray(j)) {
          throw new Error('证明服务返回的不是一份记录。');
        }
        j._status = r.status;
        return j;
      });
    });
  }
  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }
  function result(ok, title, body) {
    return '<div class="result ' + (ok ? 'is-ok' : 'is-bad') + '"><h3>' +
      icon(ok ? 'verified' : 'close') + esc(title) + '</h3>' + (body || '') + '</div>';
  }

  /* 字体 WebFont：目录名字照 APP 谱系列表。
     包目录用 data-face-pack（OSS 原样大小写），子集用 data-face-subset，
     族名改写成店面 data-face-family，样式只作用在名字（.lnm），状态/去向仍是界面字。 */
  var FACE_CSS_TPL = 'https://cn.windfonts.com/api/css?family={F}&weight=400&subset=zh-common&version=zh-common';
  var MISS_KEY = 'wf-webfont-miss-v2';
  var FACE_PACK_BASE = 'https://cn.windfonts.com/fonts-packages/';
  var MISS_TTL = 24 * 3600 * 1000;
  var facesLoaded = {};
  function shopFamily(family, norm) {
    if (family) return String(family).replace(/["']/g, '');
    return 'wenfeng-' + String(norm || '').toLowerCase();
  }
  function shopStack(famCss) {
    var alt = famCss.indexOf('wenfeng-') === 0 ? famCss.replace(/^wenfeng-/, 'windfonts-') : '';
    var parts = ['"' + famCss + '"'];
    if (alt) parts.push('"' + alt + '"');
    parts.push('"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif');
    return parts.join(', ');
  }
  function packFolder(pack, norm) {
    if (pack) return pack;
    var n = String(norm || '');
    return n ? n.charAt(0).toUpperCase() + n.slice(1) : n;
  }
  function faceSelector(norm) {
    var n = String(norm).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return '[data-face-norm="' + n + '"] .lnm,' +
      '[data-face-norm="' + n + '"] .nm,' +
      'h1.is-face[data-face-norm="' + n + '"],' +
      '[data-face-norm="' + n + '"].fn-proof,' +
      '[data-face-norm="' + n + '"][data-face-slide]';
  }
  function applyFontFace(norm, family, useFull, wname, pack, subset) {
    if (!norm) return;
    if (useFull && facesLoaded[norm] === 'full') return;
    if (!useFull && facesLoaded[norm]) return;
    if (!family && !useFull) return;
    facesLoaded[norm] = useFull ? 'full' : true;
    var famCss = shopFamily(family, norm);
    function applyClass() {
      if (document.querySelector('style[data-wf-face="' + norm + '"]')) return;
      var st = document.createElement('style');
      st.setAttribute('data-wf-face', norm);
      st.textContent = faceSelector(norm) + '{font-family:' + shopStack(famCss) + ';font-weight:400;}';
      document.head.appendChild(st);
    }
    function siblingWeight(w) {
      var k = String(w || '').toLowerCase();
      if (k === 'normal') return 'Regular';
      if (k === 'regular') return 'Normal';
      return '';
    }
    function loadPack(done) {
      var folder = packFolder(pack, norm);
      var seq = [];
      var seen = {};
      [wname || 'Regular', 'Regular', 'Normal', 'Light', 'Medium', 'Bold'].forEach(function (w) {
        if (w && !seen[w]) { seen[w] = 1; seq.push(w); }
      });
      (function next(i) {
        if (i >= seq.length) { if (done) done(); return; }
        var url = FACE_PACK_BASE + encodeURIComponent(folder) + '/' + encodeURIComponent(seq[i]) + '/full/result.css';
        fetch(url).then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.text();
        }).then(function (css) {
          if (css.indexOf('@font-face') === -1) throw new Error('not css');
          var base = url.replace(/[^/]+$/, '');
          var st = document.createElement('style');
          st.textContent = css
            .replace(/font-family\s*:\s*[^;]+;/gi, 'font-family:"' + famCss + '";')
            .replace(/url\("\.\//g, 'url("' + base)
            .replace(/url\('\.\//g, "url('" + base);
          document.head.appendChild(st);
          applyClass();
        }).catch(function () { next(i + 1); });
      })(0);
    }
    if (useFull) {
      loadPack(function () {
        if (family) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = FACE_CSS_TPL.replace('{F}', encodeURIComponent(family));
          link.onload = applyClass;
          document.head.appendChild(link);
        }
      });
      return;
    }
    var miss = {};
    try { miss = JSON.parse(localStorage.getItem(MISS_KEY) || '{}'); } catch (e) {}
    var missId = packFolder(pack, norm) + '|' + (subset || '') + '|' + (wname || 'Regular');
    if (miss[missId] && Date.now() - miss[missId] < MISS_TTL) return;
    function markMiss() {
      try { miss[missId] = Date.now(); localStorage.setItem(MISS_KEY, JSON.stringify(miss)); } catch (e) {}
    }
    function injectCss(css, base) {
      var fixed = css
        .replace(/font-weight\s*:\s*[^;]+;/gi, 'font-weight:400;')
        .replace(/font-family\s*:\s*[^;]+;/gi, 'font-family:"' + famCss + '";')
        .replace(/url\("\.\//g, 'url("' + base)
        .replace(/url\('\.\//g, "url('" + base);
      var st = document.createElement('style');
      st.setAttribute('data-wf-family', famCss);
      st.setAttribute('data-wf-norm', norm);
      st.textContent = fixed;
      document.head.appendChild(st);
      applyClass();
      try {
        var nameEl = document.querySelector('[data-face-norm="' + norm + '"] .lnm, [data-face-norm="' + norm + '"]');
        var text = nameEl ? (nameEl.textContent || '').trim().slice(0, 24) : '';
        document.fonts.load('400 22px "' + famCss + '"', text).catch(function () {});
      } catch (e) {}
    }
    var folder = packFolder(pack, norm);
    var wn = wname || 'Regular';
    var sib = siblingWeight(wn);
    var tries = [];
    function addTry(sub, w) {
      tries.push(FACE_PACK_BASE + encodeURIComponent(folder) + '/' + encodeURIComponent(w) + '/' + sub + '/result.css');
    }
    if (subset === 'full') {
      addTry('full', wn);
      if (sib) addTry('full', sib);
      if (wn !== 'Regular') addTry('full', 'Regular');
    } else {
      addTry('zh-common', wn);
      if (sib) addTry('zh-common', sib);
      addTry('full', wn);
      if (sib) addTry('full', sib);
      if (wn !== 'Regular') addTry('full', 'Regular');
    }
    if (family) tries.push(FACE_CSS_TPL.replace('{F}', encodeURIComponent(family)));
    (function next(i) {
      if (i >= tries.length) { markMiss(); return; }
      fetch(tries[i]).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      }).then(function (css) {
        if (css.indexOf('@font-face') === -1) throw new Error('not css');
        try { delete miss[missId]; localStorage.setItem(MISS_KEY, JSON.stringify(miss)); } catch (e) {}
        injectCss(css, tries[i].replace(/[^/]+$/, ''));
      }).catch(function () { next(i + 1); });
    })(0);
  }
  function faceShown(el) {
    if (!el || el.hidden) return false;
    var li = el.closest('li');
    if (li && li.hidden) return false;
    return true;
  }
  function loadFaceEl(el) {
    applyFontFace(
      el.getAttribute('data-face-norm'),
      el.getAttribute('data-face-family'),
      el.getAttribute('data-face-full') === '1',
      el.getAttribute('data-face-weight'),
      el.getAttribute('data-face-pack'),
      el.getAttribute('data-face-subset')
    );
  }
  function loadVisibleFaces() {
    $$('[data-face-norm]').forEach(function (el) {
      if (faceShown(el)) loadFaceEl(el);
    });
  }
  function lazyPreviews() {
    var els = document.querySelectorAll('[data-face-norm]');
    if (!els.length) return;
    loadVisibleFaces();
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        loadFaceEl(e.target);
      });
    }, { rootMargin: '140px' });
    Array.prototype.forEach.call(els, function (el) {
      if (!faceShown(el)) io.observe(el);
    });
  }

  /* 深浅 / 设计·开发 / 放大（同店面：wf-theme / wf-view / wf-scale） */
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
  function largeType() {
    try { return localStorage.getItem('wf-scale') === 'lg'; } catch (e) { return false; }
  }
  function applyScale(on) {
    if (on) document.documentElement.dataset.scale = 'lg';
    else delete document.documentElement.dataset.scale;
    $$('[data-scale-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? '还原字号' : '放大');
    });
  }
  applyScale(largeType());
  $$('[data-scale-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = !largeType();
      try {
        if (next) localStorage.setItem('wf-scale', 'lg');
        else localStorage.removeItem('wf-scale');
      } catch (e) {}
      applyScale(next);
    });
  });

  /* 列表：搜索 + 状态筛选 + 分页。可在动态插入台账后再次调用。 */
  function bindFilterList(list) {
    if (!list || list.getAttribute('data-bound')) return;
    list.setAttribute('data-bound', '1');
    var root = list.parentNode || document;
    var rows = $$('li', list);
    var hideOn = $('[data-hide-on-search]');
    var showOn = $('[data-show-on-search]');
    var licLayout = $('[data-lic-layout]');
    var input = $('[data-search]');
    var count = $('[data-count]');
    var empty = $('[data-empty]', root);
    var pager = $('[data-pager]', root);
    var state = { q: qs.get('q') || '', st: qs.get('st') || 'all', letter: qs.get('letter') || 'all' };
    var PAGE = parseInt(list.getAttribute('data-page-size') || '20', 10) || 20;
    var page = parseInt(qs.get('page') || '1', 10) || 1;
    var letterBtns = $$('[data-letter-filter]');
    var letterMark = $('[data-letter-mark]');
    var unit = list.getAttribute('data-unit') || '款';
    function apply() {
      var q = String(state.q || '').trim().toLowerCase(), hits = [];
      var licIdle = !!(licLayout && !q);
      rows.forEach(function (r) {
        var hit = !licIdle
          && (!q || (r.dataset.hay || '').indexOf(q) !== -1)
          && (state.st === 'all' || r.dataset.st === state.st)
          && (state.letter === 'all' || r.dataset.letter === state.letter);
        r._hit = hit; if (hit) hits.push(r);
      });
      var pages = Math.max(1, Math.ceil(hits.length / PAGE));
      if (page > pages) page = pages; if (page < 1) page = 1;
      var start = (page - 1) * PAGE;
      rows.forEach(function (r) { r.hidden = !r._hit; });
      hits.forEach(function (r, i) { if (i < start || i >= start + PAGE) r.hidden = true; });
      if (count) {
        count.textContent = licIdle ? '' : ((q || state.st !== 'all' || state.letter !== 'all')
          ? hits.length + ' / ' + rows.length + ' ' + unit
          : rows.length + ' ' + unit);
      }
      if (empty) empty.hidden = licIdle || hits.length > 0;
      if (hideOn) hideOn.hidden = !!q;
      if (licLayout) licLayout.classList.toggle('is-hit', !!q);
      if (showOn) {
        if (licLayout) {
          showOn.hidden = false;
          showOn.setAttribute('aria-hidden', q ? 'false' : 'true');
          if ('inert' in showOn) showOn.inert = !q;
        } else {
          showOn.hidden = !q;
        }
      }
      $$('[data-filter]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.filter === state.st); });
      letterBtns.forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-letter-filter') === state.letter); });
      if (letterMark) letterMark.textContent = state.letter === 'all' ? '录' : state.letter;
      renderPager(pages);
      loadVisibleFaces();
      var u = new URL(location.href);
      state.q ? u.searchParams.set('q', state.q) : u.searchParams.delete('q');
      state.st !== 'all' ? u.searchParams.set('st', state.st) : u.searchParams.delete('st');
      state.letter !== 'all' ? u.searchParams.set('letter', state.letter) : u.searchParams.delete('letter');
      page > 1 ? u.searchParams.set('page', page) : u.searchParams.delete('page');
      history.replaceState(null, '', u);
    }
    function renderPager(pages) {
      if (!pager) return;
      if (pages <= 1) { pager.hidden = true; pager.innerHTML = ''; return; }
      pager.hidden = false;
      var win = [], i;
      for (i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || Math.abs(i - page) <= 2) win.push(i);
      }
      var html = '<button type="button" class="pg nav"' + (page <= 1 ? ' disabled' : '') + ' data-go="' + (page - 1) + '">上一页</button>';
      var prev = 0;
      win.forEach(function (i) {
        if (prev && i - prev > 1) html += '<span class="dots" aria-hidden="true">…</span>';
        html += '<button type="button" class="pg' + (i === page ? ' is-on' : '') + '" data-go="' + i + '"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>';
        prev = i;
      });
      html += '<button type="button" class="pg nav"' + (page >= pages ? ' disabled' : '') + ' data-go="' + (page + 1) + '">下一页</button>';
      html += '<span class="pg-info mono">' + page + ' / ' + pages + '</span>';
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
    if (input) {
      input.value = state.q;
      input.addEventListener('input', function () { state.q = input.value; page = 1; apply(); });
    }
    $$('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () { state.st = b.dataset.filter; page = 1; apply(); });
    });
    letterBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        state.letter = b.getAttribute('data-letter-filter') || 'all';
        page = 1;
        apply();
      });
    });
    var pick = list.getAttribute('data-pick');
    if (pick) {
      list.addEventListener('click', function (ev) {
        var a = ev.target.closest && ev.target.closest('a.lrow');
        if (!a) return;
        ev.preventDefault();
        var li = a.closest('li');
        var val = li && (li.getAttribute('data-norm') || '');
        if (!val) return;
        var hid = $('[name="' + pick + '"]');
        if (hid) hid.value = val;
        $$('.lrow.is-on', list).forEach(function (x) { x.classList.remove('is-on'); });
        a.classList.add('is-on');
        var hint = $('[data-attest-picked]');
        var nm = a.querySelector('.lnm');
        if (hint && nm) hint.textContent = '已选 ' + nm.textContent.trim();
      });
    }
    apply();
  }
  bindFilterList($('[data-list]'));

  /* 授权证明：办事台 + 字体预测提示 */
  var form = $('[data-attest-form]');
  if (form) {
    var qIn = $('[data-attest-q]', form);
    var hid = $('[data-attest-norm]', form);
    var hitsEl = $('[data-attest-hits]', form);
    var idxEl = $('[data-attest-index]', form);
    var catalog = [];
    try { catalog = JSON.parse(idxEl ? idxEl.textContent : '[]'); } catch (err) { catalog = []; }
    var active = -1;
    var shown = [];
    function closeHits() {
      if (hitsEl) { hitsEl.hidden = true; hitsEl.innerHTML = ''; }
      if (qIn) qIn.setAttribute('aria-expanded', 'false');
      active = -1;
      shown = [];
    }
    function pick(item) {
      if (!item || !qIn || !hid) return;
      hid.value = item.norm;
      qIn.value = item.name;
      closeHits();
    }
    function resolveQuery() {
      if (hid.value) return hid.value;
      var q = (qIn.value || '').trim().toLowerCase();
      if (!q) return '';
      var exact = catalog.filter(function (it) {
        return String(it.norm || '').toLowerCase() === q || String(it.name || '').toLowerCase() === q;
      });
      if (exact.length === 1) return exact[0].norm;
      var hits = catalog.filter(function (it) { return (it.hay || '').indexOf(q) !== -1; });
      return hits.length === 1 ? hits[0].norm : '';
    }
    function paint(hits) {
      shown = hits.slice(0, 6);
      active = shown.length ? 0 : -1;
      if (!shown.length) {
        hitsEl.hidden = false;
        hitsEl.innerHTML = '<li class="at-suggest-empty">' + icon('search') + '<span>没有可出证的匹配。换个名字试试。</span></li>';
        qIn.setAttribute('aria-expanded', 'true');
        return;
      }
      hitsEl.hidden = false;
      qIn.setAttribute('aria-expanded', 'true');
      hitsEl.innerHTML = shown.map(function (it, i) {
        return '<li><button type="button" role="option" data-i="' + i + '" class="' + (i === active ? 'is-on' : '') + '">' +
          '<span class="nm">' + esc(it.name) + '</span><span class="sp">' + esc(it.spdx) + '</span></button></li>';
      }).join('');
    }
    function mark() {
      $$('button', hitsEl).forEach(function (b, i) { b.classList.toggle('is-on', i === active); });
    }
    if (qIn && hitsEl) {
      qIn.addEventListener('input', function () {
        hid.value = '';
        var q = qIn.value.trim().toLowerCase();
        if (!q) { closeHits(); return; }
        paint(catalog.filter(function (it) { return (it.hay || '').indexOf(q) !== -1; }));
      });
      qIn.addEventListener('keydown', function (ev) {
        if (hitsEl.hidden) return;
        if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          if (!shown.length) return;
          active = (active + 1) % shown.length;
          mark();
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          if (!shown.length) return;
          active = (active - 1 + shown.length) % shown.length;
          mark();
        } else if (ev.key === 'Enter' && shown.length && active >= 0) {
          ev.preventDefault();
          pick(shown[active]);
        } else if (ev.key === 'Escape') {
          closeHits();
        }
      });
      hitsEl.addEventListener('mousedown', function (ev) {
        var b = ev.target.closest('button[data-i]');
        if (!b) return;
        ev.preventDefault();
        pick(shown[parseInt(b.getAttribute('data-i'), 10)]);
      });
      document.addEventListener('click', function (ev) {
        if (!form.contains(ev.target)) closeHits();
      });
    }
    form.addEventListener('submit', function (ev) {
      /* 旧版 <select> 表单没有 qIn/hid：放行原生 submit，别在这里空指针 */
      if (!qIn || !hid) return;
      ev.preventDefault();
      var fd = new FormData(form), p = new URLSearchParams();
      var norm = hid.value || resolveQuery();
      if (!norm) {
        if (qIn) qIn.focus();
        paint(catalog.filter(function (it) {
          var q = (qIn.value || '').trim().toLowerCase();
          return q && (it.hay || '').indexOf(q) !== -1;
        }));
        return;
      }
      hid.value = norm;
      ['holder', 'uscc'].forEach(function (k) { if (fd.get(k)) p.set(k, fd.get(k)); });
      var u = fd.getAll('usage'); if (u.length) p.set('usage', u.join(','));
      location.href = '/attest/' + encodeURIComponent(norm) + '/' + (p.toString() ? '?' + p : '');
    });
  }
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
    var holderCell = cert.holder ? esc(cert.holder) : '未填写（通用核验记录）';
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
        ? { icon: 'user', role: '原始授权方', name: origin.rootAuthor + '「' + origin.rootWork + '」', sub: '基于该原作衍生收录，许可允许修改后分发' }
        : { icon: 'user', role: '原始授权方', name: cert.foundry || cert.originalName || '', sub: cert.originalEn || '原创设计' },
      { icon: 'book', role: '开源协议', name: licName, sub: '' },
      { icon: 'shield', role: '平台收录分发', name: '文风字体', sub: '出证责任主体', solid: true },
      { icon: 'idcard', role: '持证单位', name: cert.holder || '未填写（通用核验记录）', sub: '证明持有' }
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
          '<p class="cert-sample-text t-' + esc(cert.norm) + '"' +
            (stage && stage.getAttribute('data-face-family')
              ? ' data-face-norm="' + esc(cert.norm) + '" data-face-family="' + esc(stage.getAttribute('data-face-family')) + '" data-face-full="1"'
              : '') +
          '>两个黄鹂鸣翠柳　一行白鹭上青天</p>' +
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
      '<header>' +
        '<p class="cm-kicker mono">WENFENG · ATTESTATION</p>' +
        '<h2>' + esc(c.title) + '</h2>' +
        '<p class="cm-meta mono">编号 ' + esc(c.serial) +
          (L.spdx ? ' <span class="cm-spdx">' + esc(L.spdx) + '</span>' : '') + '</p>' +
        (c.prototype ? '<p class="cm-proto">原型样张，不作正式存档</p>' : '') +
      '</header>' +
      '<div class="cm-face">' +
        '<p class="fn">' + esc(c.catalogName) + '</p>' +
        '<p class="fe">' + esc(c.originalName) + (c.originalEn ? ' · ' + esc(c.originalEn) : '') + '</p>' +
      '</div>' +
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
      '<footer><div><p>签发：' + esc((c.issuer || {}).legalName) + '</p><p>日期：' + esc(c.issuedAt) + '</p><p class="mono">签名：' + esc((c.signature || {}).alg) + ' · ' + esc(((c.signature || {}).value || '').slice(0, 16)) + '…</p></div>' +
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
      if (activeCert.norm && stage) {
        var fam = stage.getAttribute('data-face-family') || '';
        if (fam) applyFontFace(activeCert.norm, fam, true);
      }
      $$('[data-cert-style]').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.certStyle === certStyle);
      });
      try { localStorage.setItem('wf-cert-style', certStyle); } catch (e) {}
    }

    api('/api/v1/certs/' + encodeURIComponent(norm) + '?' + p).then(function (c) {
      activeCert = c;
      if (!c || c.error || !c.serial) {
        if (c && c.error) updateCertView();
        else stage.innerHTML = result(false, '这份证明没有编号', '<p>接口没有返回 serial，徽章先不生成。</p>');
        return;
      }
      updateCertView();
      var tools = $('[data-cert-tools]'); if (tools) tools.hidden = false;
      var printBtn = $('[data-print]'); if (printBtn) printBtn.onclick = function () { print(); };
      var pdfBtn = $('[data-pdf]'); if (pdfBtn) pdfBtn.onclick = function () {
        var q = new URLSearchParams(p.toString());
        if (certStyle === 'minimal') q.set('style', 'minimal');
        var qsPdf = q.toString();
        location.href = '/api/v1/certs/' + encodeURIComponent(norm) + '/pdf' + (qsPdf ? '?' + qsPdf : '');
      };
      var jsonBtn = $('[data-json]'); if (jsonBtn) jsonBtn.onclick = function () {
        var d = Object.assign({}, c); delete d._status;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
        a.download = c.serial + '.json'; a.click();
      };
      $$('[data-cert-style]').forEach(function (b) {
        b.onclick = function () { certStyle = b.dataset.certStyle; updateCertView(); };
      });
      var badgeKind = 'plaque';
      var slimTone = 'slim-ink';
      try {
        var savedV = localStorage.getItem('wf-badge-v');
        if (savedV === 'dark') badgeKind = 'dark';
        else if (savedV === 'slim' || savedV === 'slim-ink' || savedV === 'slim-paper') {
          badgeKind = 'slim';
          slimTone = savedV === 'slim-paper' ? 'slim-paper' : 'slim-ink';
        } else if (savedV === 'plaque') badgeKind = 'plaque';
      } catch (e) {}
      function badgeVariant() {
        return badgeKind === 'slim' ? slimTone : badgeKind;
      }
      function publicBadgeSrc(serial, v) {
        var src = 'https://wenfeng.org/badge/' + serial + '.svg';
        return v && v !== 'plaque' ? src + '?v=' + encodeURIComponent(v) : src;
      }
      function apiBadgeSrc(serial, v, download) {
        var src = '/api/v1/certs/badge?s=' + encodeURIComponent(serial) + '&v=' + encodeURIComponent(v || 'plaque');
        return download ? src + '&download=1' : src;
      }
      function embedCode(serial, v) {
        return '<a href="https://wenfeng.org/v/?s=' + serial + '"><img src="' + publicBadgeSrc(serial, v) + '" alt="文风字体授权证明"></a>';
      }
      function refreshBadge() {
        var v = badgeVariant();
        var code = embedCode(c.serial, v);
        var embedEl = $('[data-embed]'); if (embedEl) embedEl.textContent = code;
        var badgeImg = $('[data-badge-img]'); if (badgeImg) badgeImg.src = apiBadgeSrc(c.serial, v);
        var dl = $('[data-badge-dl]');
        if (dl) {
          dl.href = apiBadgeSrc(c.serial, v, true);
          dl.setAttribute('download', 'wenfeng-badge-' + String(c.serial).toLowerCase() + '-' + v + '.svg');
        }
        $$('[data-badge-kind]').forEach(function (b) {
          b.classList.toggle('is-on', b.dataset.badgeKind === badgeKind);
        });
        var tone = $('[data-badge-tone]');
        if (tone) tone.hidden = badgeKind !== 'slim';
        $$('[data-badge-tone-v]').forEach(function (b) {
          b.classList.toggle('is-on', b.dataset.badgeToneV === slimTone);
        });
        try { localStorage.setItem('wf-badge-v', v); } catch (e) {}
        return code;
      }
      var shareSec = $('[data-share]'); if (shareSec) shareSec.hidden = false;
      refreshBadge();
      $$('[data-badge-kind]').forEach(function (b) {
        b.onclick = function () { badgeKind = b.dataset.badgeKind; refreshBadge(); };
      });
      $$('[data-badge-tone-v]').forEach(function (b) {
        b.onclick = function () { slimTone = b.dataset.badgeToneV; refreshBadge(); };
      });
      var copyBtn = $('[data-copy]');
      if (copyBtn) copyBtn.onclick = function (ev) {
        navigator.clipboard.writeText(embedCode(c.serial, badgeVariant()));
        var t = copyBtn.querySelector('[data-copy-label]') || copyBtn;
        t.textContent = '已复制';
      };
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
    if (!rec.length) {
      lg.innerHTML = '<p class="quiet">签发后的记录会出现在这里。</p>';
      return;
    }
    lg.innerHTML = '<ul class="lin-list" data-list data-page-size="20" data-unit="份">' + rec.map(function (x) {
      var hay = esc((x.serial || '') + ' ' + (x.catalogName || '') + ' ' + ((x.usage || []).join(' '))).toLowerCase();
      return '<li data-hay="' + hay + '"><a class="lrow" href="/attest/' + esc(x.norm) + '/">' +
        '<span class="lnm">' + esc(x.catalogName) + '</span>' +
        '<span class="lrel">' + esc(x.serial) + '</span>' +
        '<span class="lgo">' + esc(x.issuedAt) + '</span></a></li>';
    }).join('') + '</ul><p class="empty" data-empty hidden>' + icon('search') + '<span>没有匹配的记录。</span></p><nav class="pager" data-pager hidden></nav>';
    bindFilterList(lg.querySelector('[data-list]'));
  }).catch(function (e) { lg.innerHTML = result(false, '台账暂不可用', '<p>' + esc(e.message) + '</p>'); });

  /* 查验 */
  var lk = $('[data-lookup]');
  if (lk) {
    if (qs.get('s')) lk.s.value = qs.get('s');
    if (qs.get('holder')) lk.holder.value = qs.get('holder');
    function runLookup() {
      var out = $('[data-out]');
      api('/api/v1/certs/lookup?s=' + encodeURIComponent(lk.s.value) + '&holder=' + encodeURIComponent(lk.holder.value)).then(function (r) {
        if (r.error) {
          out.innerHTML = result(false, r.error === 'holder_mismatch' ? '持证单位不一致' : '查不到这个编号',
            '<p>编号与单位须与证明上完全一致。通用记录填「通用核验记录」。查不到的，按伪造处理。</p>'); return;
        }
        var holder = r.holder ? esc(r.holder) : '通用核验记录';
        var cert = r.href ? '<p class="acts"><a class="btn btn-ink" href="' + esc(r.href) + '">' + icon('certificate') + '打开证明页</a></p>' : '';
        out.innerHTML = result(true, '证书有效', '<dl class="kv-rows"><div><dt>字体</dt><dd>' + esc(r.catalogName) + '</dd></div><div><dt>协议</dt><dd>' + esc(r.spdx) +
          '</dd></div><div><dt>持证单位</dt><dd>' + holder + '</dd></div><div><dt>签发日期</dt><dd>' + esc(r.issuedAt) + '</dd></div><div><dt>下载次数</dt><dd>' + esc(r.downloads) + '</dd></div></dl>' + cert);
      }).catch(function (e) { out.innerHTML = result(false, '查验服务暂不可用', '<p>' + esc(e.message) + '</p>'); });
    }
    lk.addEventListener('submit', function (ev) { ev.preventDefault(); runLookup(); });
    if (qs.get('s') && qs.get('holder')) runLookup();
  }

  /* 报缺字 */
  (function () {
    var kinds = document.querySelector('.gp1-kinds');
    if (!kinds) return;
    function showKind(kind) {
      var btn = kinds.querySelector('[data-kind="' + kind + '"]');
      if (!btn) return;
      kinds.querySelectorAll('[data-kind]').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('[data-pane]').forEach(function (pane) {
        pane.hidden = pane.getAttribute('data-pane') !== kind;
      });
    }
    if (qs.get('kind')) showKind(qs.get('kind'));
    var gapNorm = qs.get('norm');
    var gapName = qs.get('name') || gapNorm;
    if (gapName) {
      document.querySelectorAll('[data-gap-name]').forEach(function (inp) {
        if (!inp.value || inp.value === '霞鹜文楷') inp.value = gapName;
      });
      var ch = document.querySelector('[data-gap-char]');
      if (ch && ch.value === '龘') ch.value = '';
      if (gapNorm && !qs.get('kind')) showKind('errata');
    }
  })();
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

  /* 首页 lab 甲：一款字轮换 */
  var faceRoot = $('[data-home-face]');
  if (faceRoot) {
    var slides = $$('[data-face-slide]', faceRoot);
    var i = 0;
    function showFace(n) {
      if (!slides.length) return;
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.hidden = j !== i; });
      var on = slides[i];
      applyFontFace(on.getAttribute('data-face-norm'), on.getAttribute('data-face-family'));
    }
    var next = $('[data-face-next]', faceRoot);
    if (next) next.addEventListener('click', function () { showFace(i + 1); });
    showFace(0);
  }

  lazyPreviews();

  /* 玄宗体包：首页主门 + 全站 .xxzt 标题 */
  (function loadXxzt() {
    if (!document.querySelector('.lab-doors.is-prime, h1.xxzt, .xxzt')) return;
    var fullCss = 'https://cn.windfonts.com/fonts-packages/Xxzt/Regular/full/result.css';
    var started = false;
    function loadPack() {
      if (started) return;
      started = true;
      fetch(fullCss).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      }).then(function (css) {
        var base = fullCss.replace(/result\.css$/, '');
        var st = document.createElement('style');
        st.textContent = css
          .replace(/url\("\.\//g, 'url("' + base)
          .replace(/url\('\.\//g, "url('" + base);
        document.head.appendChild(st);
      }).catch(function () {
        applyFontFace('xxzt', 'wenfeng-xxzt');
      });
    }
    loadPack();
    var el = document.querySelector('.lab-find-live');
    if (!el) return;
    el.addEventListener('paste', function (ev) {
      ev.preventDefault();
      var t = (ev.clipboardData || window.clipboardData).getData('text/plain') || '';
      document.execCommand('insertText', false, t.replace(/\r/g, ''));
    });
  })();

  /* 目录稿丙：左行右预览 */
  (function srcPreview() {
    var pane = document.querySelector('[data-src-preview]');
    var list = document.querySelector('[data-list]');
    if (!pane || !list) return;
    var proof = pane.querySelector('[data-pv-proof]');
    var nameEl = pane.querySelector('[data-pv-name]');
    var stEl = pane.querySelector('[data-pv-st]');
    var go = pane.querySelector('[data-pv-go]');
    function show(a) {
      if (!a || !a.classList.contains('lrow')) return;
      var li = a.closest('li');
      var norm = a.getAttribute('data-face-norm') || '';
      var family = a.getAttribute('data-face-family') || '';
      var nm = a.querySelector('.lnm');
      var rel = a.querySelector('.lrel');
      var verb = a.querySelector('.lgo');
      if (nm) nameEl.textContent = nm.textContent;
      if (rel) stEl.textContent = rel.textContent;
      if (go) {
        go.href = a.getAttribute('href') || '#';
        go.textContent = verb ? verb.textContent : '看条目';
      }
      if (proof) {
        proof.className = 'ls-proof' + (norm ? ' t-' + norm : '');
        if (norm) {
          proof.setAttribute('data-face-norm', norm);
          proof.setAttribute('data-face-family', family);
          applyFontFace(norm, family);
        }
      }
      $$('.lrow.is-on', list).forEach(function (x) { x.classList.remove('is-on'); });
      a.classList.add('is-on');
    }
    list.addEventListener('mouseover', function (ev) {
      var a = ev.target.closest && ev.target.closest('a.lrow');
      if (a) show(a);
    });
    list.addEventListener('focusin', function (ev) {
      var a = ev.target.closest && ev.target.closest('a.lrow');
      if (a) show(a);
    });
    var first = list.querySelector('li:not([hidden]) a.lrow');
    if (first) show(first);
  })();

  /* 许可原文：原文 / 译文切换 */
  $$('[data-lic-lang-root]').forEach(function (root) {
    var switcher = $('[data-lic-lang-switch]', root);
    if (!switcher) return;
    function show(lang) {
      root.setAttribute('data-lang', lang);
      $$('[data-lic-lang]', switcher).forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-lic-lang') === lang);
      });
      $$('[data-lic-pane]', root).forEach(function (pane) {
        pane.hidden = pane.getAttribute('data-lic-pane') !== lang;
      });
    }
    $$('[data-lic-lang]', switcher).forEach(function (b) {
      b.addEventListener('click', function () { show(b.getAttribute('data-lic-lang')); });
    });
  });

  /* 许可原文：复制文本哈希 */
  $$('[data-lic-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var t = btn.getAttribute('data-lic-copy') || '';
      if (!t || !navigator.clipboard) return;
      navigator.clipboard.writeText(t).then(function () {
        var prev = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = prev; }, 1200);
      });
    });
  });
})();

/* 主门 h1 首词轮换（开源/免费/手写/书法/精品）。首词「开源」是站名立场，停留加倍 */
(function () {
  var rot = document.querySelector('[data-rot]');
  if (!rot) return;
  var spans = rot.children;
  if (spans.length < 2) return;
  var DWELL = [10400, 5200, 5200, 5200, 5200];
  var i = 0;
  (function next() {
    setTimeout(function () {
      spans[i].classList.remove('is-on');
      i = (i + 1) % spans.length;
      spans[i].classList.add('is-on');
      next();
    }, DWELL[i]);
  })();
})();

/* 移动端：主导航行滚过首屏后吸顶隐藏（顶部仍双行可直达），上滚回显 */
(function () {
  if (!window.matchMedia || !matchMedia('(max-width: 720px)').matches) return;
  var nav = document.querySelector('.topnav');
  var bar = document.querySelector('.topbar');
  if (!nav || !bar) return;
  var lastY = window.scrollY, hidden = false;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    var pastHero = y > window.innerHeight * 0.6;
    var want = pastHero && y > lastY;
    if (want !== hidden) {
      hidden = want;
      nav.style.transition = 'opacity .2s ease';
      nav.style.opacity = hidden ? '0' : '1';
      nav.style.pointerEvents = hidden ? 'none' : 'auto';
      bar.style.height = hidden ? '' : '';
    }
    lastY = y;
  }, { passive: true });
})();

/* 移动端菜单抽屉（照 fonts-front：钮切换、点链接收、Esc 收） */
(function () {
  var btn = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('topmenu');
  if (!btn || !menu) return;
  function setMenu(open) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? '关闭菜单' : '菜单');
  }
  btn.addEventListener('click', function () { setMenu(menu.hidden); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); e.preventDefault(); }
  });
})();
