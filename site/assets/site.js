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
    opt = opt || {};
    if (!opt.cache) opt.cache = 'no-store';
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
     包目录 fonts-packages/{norm}/ 一律小写；过渡期仍会试 data-face-pack 原样。
     子集用 data-face-subset；族名改写成店面 data-face-family；样式只作用在名字（.lnm）。 */
  var ASSET_ORIGIN = (typeof window !== 'undefined' && window.WF_ASSET_ORIGIN)
    ? String(window.WF_ASSET_ORIGIN).replace(/\/$/, '')
    : '';
  function assetUrl(p) {
    if (!p) return p;
    if (ASSET_ORIGIN && p.charAt(0) === '/') return ASSET_ORIGIN + p;
    return p;
  }
  var FACE_CSS_TPL = 'https://cn.windfonts.com/api/css?family={F}&weight=400&subset=zh-common&version=zh-common';
  var MISS_KEY = 'wf-webfont-miss-v2';
  var FACE_PACK_BASE = 'https://cn.windfonts.com/fonts-packages/';
  var MISS_TTL = 24 * 3600 * 1000;
  var facesLoaded = {};
  var FACE_CONCURRENCY = 3;
  var faceQueue = [];
  var faceActive = 0;
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
    var n = String(pack || norm || '').toLowerCase();
    return n;
  }
  function packFolderTries(pack, norm, packAlt) {
    var low = packFolder(pack, norm);
    var tries = [];
    var seen = {};
    function add(x) {
      x = String(x || '').trim();
      if (!x || seen[x]) return;
      seen[x] = 1;
      tries.push(x);
    }
    add(low);
    add(packAlt);
    add(pack);
    return tries;
  }
  function faceSelector(norm) {
    var n = String(norm).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return '[data-face-norm="' + n + '"] .lnm,' +
      '[data-face-norm="' + n + '"] .nm,' +
      'h1.is-face[data-face-norm="' + n + '"],' +
      '[data-face-norm="' + n + '"].fn-proof,' +
      '[data-face-norm="' + n + '"] .cert-sample-text,' +
      '[data-face-norm="' + n + '"][data-face-slide]';
  }
  function applyFontFace(norm, family, useFull, wname, pack, subset, packAlt, onDone) {
    function settled() {
      if (onDone) {
        var cb = onDone;
        onDone = null;
        try { cb(); } catch (e) {}
      }
    }
    if (!norm) { settled(); return; }
    if (useFull && facesLoaded[norm] === 'full') { settled(); return; }
    if (!useFull && facesLoaded[norm]) { settled(); return; }
    if (!family && !useFull) { settled(); return; }
    facesLoaded[norm] = useFull ? 'full' : true;
    var famCss = shopFamily(family, norm);
    function applyClass() {
      var rule = faceSelector(norm) + '{font-family:' + shopStack(famCss) + ';font-weight:400;}';
      var st = document.querySelector('style[data-wf-face="' + norm + '"]');
      if (st) {
        st.textContent = rule;
        return;
      }
      st = document.createElement('style');
      st.setAttribute('data-wf-face', norm);
      st.textContent = rule;
      document.head.appendChild(st);
    }
    function siblingWeight(w) {
      var k = String(w || '').toLowerCase();
      if (k === 'normal') return 'Regular';
      if (k === 'regular') return 'Normal';
      return '';
    }
    function loadPack(done) {
      var folders = packFolderTries(pack, norm, packAlt);
      var seq = [];
      var seen = {};
      [wname || 'Regular', 'Regular', 'Normal', 'Light', 'Medium', 'Bold'].forEach(function (w) {
        if (w && !seen[w]) { seen[w] = 1; seq.push(w); }
      });
      var urls = [];
      folders.forEach(function (folder) {
        seq.forEach(function (w) {
          urls.push(FACE_PACK_BASE + encodeURIComponent(folder) + '/' + encodeURIComponent(w) + '/full/result.css');
        });
      });
      (function next(i) {
        if (i >= urls.length) { if (done) done(); return; }
        var url = urls[i];
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
          if (done) done();
        }).catch(function () { next(i + 1); });
      })(0);
    }
    if (useFull) {
      loadPack(function () {
        if (family) {
          var link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = FACE_CSS_TPL.replace('{F}', encodeURIComponent(family));
          link.onload = function () { applyClass(); settled(); };
          link.onerror = settled;
          document.head.appendChild(link);
        } else {
          settled();
        }
      });
      return;
    }
    var miss = {};
    try { miss = JSON.parse(localStorage.getItem(MISS_KEY) || '{}'); } catch (e) {}
    var missId = packFolder(pack, norm) + '|' + (subset || '') + '|' + (wname || 'Regular');
    if (miss[missId] && Date.now() - miss[missId] < MISS_TTL) { settled(); return; }
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
      settled();
    }
    var folders = packFolderTries(pack, norm, packAlt);
    var wn = wname || 'Regular';
    var sib = siblingWeight(wn);
    var tries = [];
    function addTry(folder, sub, w) {
      tries.push(FACE_PACK_BASE + encodeURIComponent(folder) + '/' + encodeURIComponent(w) + '/' + sub + '/result.css');
    }
    folders.forEach(function (folder) {
      if (subset === 'full') {
        addTry(folder, 'full', wn);
        if (sib) addTry(folder, 'full', sib);
        if (wn !== 'Regular') addTry(folder, 'full', 'Regular');
      } else {
        addTry(folder, 'zh-common', wn);
        if (sib) addTry(folder, 'zh-common', sib);
        addTry(folder, 'full', wn);
        if (sib) addTry(folder, 'full', sib);
        if (wn !== 'Regular') addTry(folder, 'full', 'Regular');
      }
    });
    if (family) tries.push(FACE_CSS_TPL.replace('{F}', encodeURIComponent(family)));
    (function next(i) {
      if (i >= tries.length) { markMiss(); settled(); return; }
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
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    var margin = 160;
    return r.bottom >= -margin && r.top <= (window.innerHeight || 800) + margin;
  }
  function pumpFaceQueue() {
    while (faceActive < FACE_CONCURRENCY && faceQueue.length) {
      var job = faceQueue.shift();
      if (!job || !job.el || job.el.getAttribute('data-face-queued') === 'done') continue;
      if (!faceShown(job.el)) {
        job.el.removeAttribute('data-face-queued');
        continue;
      }
      faceActive++;
      job.el.setAttribute('data-face-queued', 'done');
      applyFontFace(
        job.el.getAttribute('data-face-norm'),
        job.el.getAttribute('data-face-family'),
        job.el.getAttribute('data-face-full') === '1',
        job.el.getAttribute('data-face-weight'),
        job.el.getAttribute('data-face-pack'),
        job.el.getAttribute('data-face-subset'),
        job.el.getAttribute('data-face-pack-alt'),
        function () {
          faceActive = Math.max(0, faceActive - 1);
          pumpFaceQueue();
        }
      );
    }
  }
  function loadFaceEl(el) {
    if (!el || el.getAttribute('data-face-queued')) return;
    el.setAttribute('data-face-queued', '1');
    faceQueue.push({ el: el });
    pumpFaceQueue();
  }
  function loadVisibleFaces() {
    $$('[data-face-norm]').forEach(function (el) {
      if (faceShown(el)) loadFaceEl(el);
    });
  }
  function lazyPreviews() {
    var els = document.querySelectorAll('[data-face-norm]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      loadVisibleFaces();
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        loadFaceEl(e.target);
      });
    }, { rootMargin: '160px' });
    Array.prototype.forEach.call(els, function (el) {
      if (faceShown(el)) loadFaceEl(el);
      else io.observe(el);
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

  /* 证面简繁：固定文案双语；动态字段走字表 */
  var certScript = 'hans';
  var S2T = {
    '万':'萬','与':'與','专':'專','业':'業','东':'東','丝':'絲','两':'兩','严':'嚴','丧':'喪','个':'個',
    '丰':'豐','临':'臨','丽':'麗','义':'義','乌':'烏','乐':'樂','乔':'喬','习':'習','书':'書','买':'買',
    '乱':'亂','争':'爭','于':'於','亏':'虧','云':'雲','亚':'亞','产':'產','亩':'畝','亲':'親','亵':'褻',
    '亿':'億','仅':'僅','从':'從','仓':'倉','仪':'儀','们':'們','价':'價','众':'眾','优':'優','会':'會',
    '伛':'傴','伞':'傘','伟':'偉','传':'傳','伤':'傷','伦':'倫','伪':'偽','伫':'佇','体':'體','余':'餘',
    '佣':'傭','佥':'僉','侠':'俠','侣':'侶','侥':'僥','侦':'偵','侧':'側','侨':'僑','侩':'儈','侪':'儕',
    '侬':'儂','俣':'俁','俦':'儔','俨':'儼','俩':'倆','俪':'儷','俭':'儉','债':'債','倾':'傾','偬':'傯',
    '偻':'僂','偾':'僨','偿':'償','傥':'儻','傧':'儐','储':'儲','傩':'儺','儿':'兒','兑':'兌','兖':'兗',
    '党':'黨','兰':'蘭','关':'關','兴':'興','兹':'茲','养':'養','兽':'獸','冁':'囅','内':'內','冈':'岡',
    '册':'冊','写':'寫','军':'軍','农':'農','冯':'馮','决':'決','况':'況','冻':'凍','净':'淨','凄':'淒',
    '凉':'涼','减':'減','凑':'湊','凛':'凜','几':'幾','凤':'鳳','凫':'鳧','凭':'憑','凯':'凱','击':'擊',
    '凿':'鑿','刍':'芻','划':'劃','刘':'劉','则':'則','刚':'剛','创':'創','删':'刪','别':'別','刽':'劊',
    '刿':'劌','剀':'剴','剂':'劑','剐':'剮','剑':'劍','剥':'剝','剧':'劇','劝':'勸','办':'辦','务':'務',
    '劢':'勱','动':'動','励':'勵','劲':'勁','劳':'勞','势':'勢','勋':'勛','勚':'勩','匀':'勻','匦':'匭',
    '匮':'匱','区':'區','医':'醫','华':'華','协':'協','单':'單','卖':'賣','卢':'盧','卫':'衛','却':'卻',
    '厅':'廳','历':'歷','厉':'厲','压':'壓','厌':'厭','厍':'厙','厕':'廁','厢':'廂','厣':'厴','厦':'廈',
    '厨':'廚','厩':'廄','厮':'廝','县':'縣','叁':'叄','参':'參','双':'雙','发':'發','变':'變','叙':'敘',
    '叠':'疊','叶':'葉','号':'號','叹':'嘆','叽':'嘰','吁':'籲','后':'後','吓':'嚇','吕':'呂','吗':'嗎',
    '吣':'唚','吨':'噸','听':'聽','启':'啟','吴':'吳','呐':'吶','呒':'嘸','呓':'囈','呕':'嘔','呖':'嚦',
    '呗':'唄','员':'員','呙':'咼','呛':'嗆','呜':'嗚','咏':'詠','咙':'嚨','咛':'嚀','咝':'噝','咤':'吒',
    '咨':'諮','咸':'鹹','响':'響','哑':'啞','哒':'噠','哓':'嘵','哔':'嗶','哕':'噦','哗':'嘩','哙':'噲',
    '哜':'嚌','哝':'噥','哟':'喲','唛':'嘜','唝':'嗊','唠':'嘮','唡':'啢','唢':'嗩','唤':'喚','啧':'嘖',
    '啬':'嗇','啭':'囀','啮':'嚙','啴':'嘽','啸':'嘯','喷':'噴','喽':'嘍','喾':'嚳','嗫':'囁','嗬':'呵',
    '嗳':'噯','嘘':'噓','嘤':'嚶','嘱':'囑','噜':'嚕','嚣':'囂','团':'團','园':'園','囱':'囪','围':'圍',
    '囵':'圇','国':'國','图':'圖','圆':'圓','圣':'聖','圹':'壙','场':'場','坂':'阪','坏':'壞','块':'塊',
    '坚':'堅','坛':'壇','坜':'壢','坝':'壩','坞':'塢','坟':'墳','坠':'墜','垄':'壟','垅':'壟','垆':'壚',
    '垒':'壘','垦':'墾','垩':'堊','垫':'墊','垭':'埡','垲':'塏','垴':'堖','埘':'塒','埙':'塤','埚':'堝',
    '堑':'塹','堕':'墮','墙':'牆','壮':'壯','声':'聲','壳':'殼','壶':'壺','壸':'壼','处':'處','备':'備',
    '复':'復','头':'頭','夸':'誇','夹':'夾','夺':'奪','奁':'奩','奂':'奐','奋':'奮','奖':'獎','奥':'奧',
    '妆':'妝','妇':'婦','妈':'媽','妩':'嫵','妪':'嫗','妫':'媯','姗':'姍','姜':'薑','姝':'姝','姹':'奼',
    '娄':'婁','娅':'婭','娆':'嬈','娇':'嬌','娈':'孌','娱':'娛','娲':'媧','娴':'嫻','婳':'嫿','婴':'嬰',
    '婵':'嬋','婶':'嬸','媪':'媼','嫒':'嬡','嫔':'嬪','嫱':'嬙','嬷':'嬤','孙':'孫','学':'學','孪':'孿',
    '宁':'寧','宝':'寶','实':'實','宠':'寵','审':'審','宪':'憲','宫':'宮','宽':'寬','宾':'賓','寝':'寢',
    '对':'對','寻':'尋','导':'導','寿':'壽','将':'將','尔':'爾','尘':'塵','尝':'嘗','尧':'堯','尴':'尷',
    '尸':'屍','尽':'盡','层':'層','屃':'屓','屉':'屜','届':'屆','属':'屬','屡':'屢','屦':'屨','屿':'嶼',
    '岁':'歲','岂':'豈','岖':'嶇','岗':'崗','岘':'峴','岚':'嵐','岛':'島','岭':'嶺','岽':'崠','岿':'巋',
    '峄':'嶧','峡':'峽','峣':'嶢','峤':'嶠','峥':'崢','峦':'巒','崂':'嶗','崃':'崍','崄':'嶮','崭':'嶄',
    '嵘':'嶸','嵚':'嶔','嵛':'嵛','嵝':'嶁','巅':'巔','巩':'鞏','巯':'巰','币':'幣','帅':'帥','师':'師',
    '帏':'幃','帐':'帳','帘':'簾','帜':'幟','带':'帶','帧':'幀','帮':'幫','帱':'幬','帻':'幘','帼':'幗',
    '幂':'冪','幞':'襆','并':'並','广':'廣','庄':'莊','庆':'慶','庐':'廬','庑':'廡','库':'庫','应':'應',
    '庙':'廟','庞':'龐','废':'廢','庼':'廎','廪':'廩','开':'開','异':'異','弃':'棄','弑':'弒','张':'張',
    '弥':'彌','弪':'弳','弯':'彎','弹':'彈','强':'強','归':'歸','当':'當','录':'錄','彦':'彥','彻':'徹',
    '径':'徑','徕':'徠','忆':'憶','忏':'懺','忧':'憂','忾':'愾','怀':'懷','态':'態','怂':'慫','怃':'憮',
    '怄':'慪','怅':'悵','怆':'愴','怜':'憐','总':'總','怼':'懟','怿':'懌','恋':'戀','恒':'恆','恳':'懇',
    '恶':'惡','恸':'慟','恹':'懨','恺':'愷','恻':'惻','恼':'惱','恽':'惲','悦':'悅','悫':'愨','悬':'懸',
    '悭':'慳','悯':'憫','惊':'驚','惧':'懼','惨':'慘','惩':'懲','惫':'憊','惬':'愜','惭':'慚','惮':'憚',
    '惯':'慣','愠':'慍','愤':'憤','愦':'憒','愿':'願','慑':'懾','慭':'憖','懑':'懣','懒':'懶','懔':'懍',
    '戆':'戇','戋':'戔','戏':'戲','戗':'戧','战':'戰','戬':'戩','戯':'戱','户':'戶','扑':'撲','执':'執',
    '扩':'擴','扪':'捫','扫':'掃','扬':'揚','扰':'擾','抚':'撫','抛':'拋','抟':'摶','抠':'摳','抡':'掄',
    '抢':'搶','护':'護','报':'報','担':'擔','拟':'擬','拢':'攏','拣':'揀','拥':'擁','拦':'攔','拧':'擰',
    '拨':'撥','择':'擇','挂':'掛','挚':'摯','挛':'攣','挜':'掗','挝':'撾','挞':'撻','挟':'挾','挠':'撓',
    '挡':'擋','挢':'撟','挣':'掙','挤':'擠','挥':'揮','挦':'撏','捝':'挩','捞':'撈','损':'損','捡':'撿',
    '换':'換','捣':'搗','据':'據','掳':'擄','掴':'摑','掷':'擲','掸':'撣','掺':'摻','掼':'摜','揽':'攬',
    '揿':'撳','搀':'攙','搁':'擱','搂':'摟','搅':'攪','携':'攜','摄':'攝','摅':'攄','摆':'擺','摇':'搖',
    '摈':'擯','摊':'攤','撄':'攖','撑':'撐','撵':'攆','撷':'擷','撸':'擼','撺':'攛','擞':'擻','攒':'攢',
    '敌':'敵','敛':'斂','数':'數','斋':'齋','斓':'斕','斩':'斬','断':'斷','无':'無','旧':'舊','时':'時',
    '旷':'曠','旸':'暘','昙':'曇','昼':'晝','昽':'曨','显':'顯','晋':'晉','晒':'曬','晓':'曉','晔':'曄',
    '晕':'暈','晖':'暉','暂':'暫','暧':'曖','术':'術','机':'機','杀':'殺','杂':'雜','权':'權','杆':'桿',
    '条':'條','来':'來','杨':'楊','杩':'榪','杰':'傑','极':'極','构':'構','枞':'樅','枢':'樞','枣':'棗',
    '枥':'櫪','枧':'梘','枨':'棖','枪':'槍','枫':'楓','枭':'梟','柜':'櫃','柠':'檸','柽':'檉','栀':'梔',
    '栅':'柵','标':'標','栈':'棧','栉':'櫛','栊':'櫳','栋':'棟','栌':'櫨','栎':'櫟','栏':'欄','树':'樹',
    '栖':'棲','样':'樣','栾':'欒','桠':'椏','桡':'橈','桢':'楨','档':'檔','桤':'榿','桥':'橋','桦':'樺',
    '桧':'檜','桨':'槳','桩':'樁','梦':'夢','梼':'檮','梾':'棶','梿':'槤','检':'檢','棁':'梲','棂':'欞',
    '椁':'槨','椟':'櫝','椠':'槧','槚':'檟','榄':'欖','椭':'橢','榇':'櫬','榈':'櫚','榉':'櫸','槜':'檇',
    '槟':'檳','槠':'櫧','樯':'檣','樱':'櫻','橥':'櫫','橱':'櫥','橹':'櫓','橼':'櫞','枥':'櫪','欢':'歡',
    '欤':'歟','欧':'歐','歼':'殲','殁':'歿','殇':'殤','残':'殘','殒':'殞','殓':'殮','殚':'殫','殡':'殯',
    '殴':'毆','毁':'毀','毂':'轂','毕':'畢','毙':'斃','毡':'氈','毵':'毿','氇':'氌','气':'氣','氢':'氫',
    '氩':'氬','氲':'氳','汇':'匯','汉':'漢','汤':'湯','汹':'洶','沟':'溝','没':'沒','沣':'灃','沤':'漚',
    '沥':'瀝','沦':'淪','沧':'滄','沨':'渢','沩':'溈','沪':'滬','泞':'濘','泪':'淚','泶':'澩','泷':'瀧',
    '泸':'瀘','泺':'濼','泻':'瀉','泼':'潑','泽':'澤','泾':'涇','洁':'潔','洒':'灑','洼':'窪','浃':'浹',
    '浅':'淺','浆':'漿','浇':'澆','浈':'湞','浊':'濁','测':'測','浍':'澮','济':'濟','浏':'瀏','浐':'滻',
    '浑':'渾','浒':'滸','浓':'濃','浔':'潯','荩':'藎','荡':'蕩','荥':'滎','荥':'滎','浒':'滸','浔':'潯',
    '浍':'澮','涛':'濤','涝':'澇','涞':'淶','涟':'漣','涠':'潿','涡':'渦','涣':'渙','涤':'滌','润':'潤',
    '涧':'澗','涨':'漲','涩':'澀','淀':'澱','渊':'淵','渍':'漬','渎':'瀆','渐':'漸','渑':'澠','渔':'漁',
    '渖':'瀋','渗':'滲','温':'溫','湾':'灣','湿':'濕','溃':'潰','溅':'濺','溆':'漵','滗':'潷','滚':'滾',
    '滞':'滯','滟':'灧','滠':'灄','满':'滿','滢':'瀅','滤':'濾','滥':'濫','滦':'灤','滨':'濱','滩':'灘',
    '滪':'澦','漤':'濫','潆':'瀠','潇':'瀟','潋':'瀲','潍':'濰','潜':'潛','潴':'瀦','澜':'瀾','濑':'瀨',
    '濒':'瀕','灏':'灝','灭':'滅','灯':'燈','灵':'靈','灾':'災','灿':'燦','炀':'煬','炉':'爐','炖':'燉',
    '炜':'煒','炝':'熗','点':'點','炼':'煉','炽':'熾','烁':'爍','烂':'爛','烃':'烴','烛':'燭','烟':'煙',
    '烦':'煩','烧':'燒','烨':'燁','烩':'燴','烫':'燙','烬':'燼','热':'熱','焕':'煥','焖':'燜','焘':'燾',
    '煅':'煆','煳':'糊','煺':'褪','熘':'溜','爱':'愛','爷':'爺','牍':'牘','牦':'犛','牵':'牽','牺':'犧',
    '犊':'犢','状':'狀','犷':'獷','犸':'獁','犹':'猶','狈':'狽','狝':'獮','狞':'獰','独':'獨','狭':'狹',
    '狮':'獅','狯':'獪','狰':'猙','狱':'獄','狲':'猻','猃':'獫','猎':'獵','猕':'獼','猡':'玀','猪':'豬',
    '猫':'貓','猬':'蝟','献':'獻','獭':'獺','玑':'璣','玙':'璵','玚':'瑒','玛':'瑪','玮':'瑋','环':'環',
    '现':'現','玱':'瑲','玺':'璽','珐':'琺','珑':'瓏','珲':'琿','琏':'璉','琐':'瑣','琼':'瓊','瑶':'瑤',
    '瑷':'璦','璎':'瓔','瓒':'瓚','瓮':'甕','瓯':'甌','电':'電','画':'畫','畅':'暢','畴':'疇','疖':'癤',
    '疗':'療','疟':'瘧','疠':'癘','疡':'瘍','疬':'癧','疭':'瘲','疮':'瘡','疯':'瘋','疱':'皰','疴':'痾',
    '痈':'癰','痉':'痙','痒':'癢','痖':'瘂','痨':'癆','痪':'瘓','痫':'癇','瘅':'癉','瘆':'瘮','瘗':'瘞',
    '瘘':'瘺','瘪':'癟','瘫':'癱','瘾':'癮','瘿':'癭','癞':'癩','癣':'癬','癫':'癲','皑':'皚','皱':'皺',
    '皲':'皸','盏':'盞','盐':'鹽','监':'監','盖':'蓋','盗':'盜','盘':'盤','眍':'瞘','眦':'眥','眬':'矓',
    '睁':'睜','睐':'睞','睑':'瞼','瞒':'瞞','瞩':'矚','矫':'矯','矶':'磯','矾':'礬','矿':'礦','砀':'碭',
    '码':'碼','砖':'磚','砗':'硨','砚':'硯','砜':'碸','砺':'礪','砻':'礱','砾':'礫','础':'礎','硁':'硜',
    '硕':'碩','硖':'硤','硗':'磽','硙':'磑','确':'確','硷':'鹼','碍':'礙','碛':'磧','碜':'磣','碱':'鹼',
    '礼':'禮','祃':'禡','祎':'禕','祢':'禰','祯':'禎','祷':'禱','祸':'禍','禀':'稟','禄':'祿','禅':'禪',
    '离':'離','秃':'禿','秆':'稈','积':'積','称':'稱','秽':'穢','秾':'穠','稆':'穭','税':'稅','稣':'穌',
    '稳':'穩','穑':'穡','穷':'窮','窃':'竊','窍':'竅','窎':'窵','窑':'窯','窜':'竄','窝':'窩','窥':'窺',
    '窦':'竇','窭':'窶','竖':'豎','竞':'競','笃':'篤','笋':'筍','笔':'筆','笕':'筧','笺':'箋','笼':'籠',
    '笾':'籩','筑':'築','筚':'篳','筛':'篩','筜':'簹','筝':'箏','筹':'籌','筼':'篔','签':'簽','简':'簡',
    '箓':'籙','箦':'簀','箧':'篋','箨':'籜','箩':'籮','箪':'簞','箫':'簫','篑':'簣','篓':'簍','篮':'籃',
    '篱':'籬','篯':'籛','籁':'籟','籴':'糴','类':'類','籼':'秈','粜':'糶','粝':'糲','粤':'粵','粪':'糞',
    '粮':'糧','糁':'糝','糇':'餱','紧':'緊','絷':'縶','纟':'糹','纠':'糾','纡':'紆','红':'紅','纣':'紂',
    '纤':'纖','纥':'紇','约':'約','级':'級','纨':'紈','纩':'纊','纪':'紀','纫':'紉','纬':'緯','纭':'紜',
    '纮':'紘','纯':'純','纰':'紕','纱':'紗','纲':'綱','纳':'納','纴':'紝','纵':'縱','纶':'綸','纷':'紛',
    '纸':'紙','纹':'紋','纺':'紡','纻':'紵','纼':'紖','纽':'紐','纾':'紓','线':'線','绀':'紺','绁':'紲',
    '绂':'紱','练':'練','组':'組','绅':'紳','细':'細','织':'織','终':'終','绉':'縐','绊':'絆','绋':'紼',
    '绌':'絀','绍':'紹','绎':'繹','经':'經','绐':'紿','绑':'綁','绒':'絨','结':'結','绔':'絝','绕':'繞',
    '绖':'絰','绗':'絎','绘':'繪','给':'給','绚':'絢','绛':'絳','络':'絡','绝':'絕','绞':'絞','统':'統',
    '绠':'綆','绡':'綃','绢':'絹','绣':'繡','绤':'綌','绥':'綏','绦':'絛','继':'繼','绨':'綈','绩':'績',
    '绪':'緒','绫':'綾','续':'續','绮':'綺','绯':'緋','绰':'綽','绱':'緔','绲':'緄','绳':'繩','维':'維',
    '绵':'綿','绶':'綬','绷':'繃','绸':'綢','绹':'綯','绺':'綹','绻':'綣','综':'綜','绽':'綻','绾':'綰',
    '绿':'綠','缀':'綴','缁':'緇','缂':'緙','缃':'緗','缄':'緘','缅':'緬','缆':'纜','缇':'緹','缈':'緲',
    '缉':'緝','缊':'縕','缋':'繢','缌':'緦','缍':'綞','缎':'緞','缏':'緶','缑':'緱','缒':'縋','缓':'緩',
    '缔':'締','缕':'縷','编':'編','缗':'緡','缘':'緣','缙':'縉','缚':'縛','缛':'縟','缜':'縝','缝':'縫',
    '缞':'縗','缟':'縞','缠':'纏','缡':'縭','缢':'縊','缣':'縑','缤':'繽','缥':'縹','缦':'縵','缧':'縲',
    '缨':'纓','缩':'縮','缪':'繆','缫':'繅','缬':'纈','缭':'繚','缮':'繕','缯':'繒','缰':'韁','缱':'繾',
    '缲':'繰','缳':'繯','缴':'繳','缵':'纘','罂':'罌','网':'網','罗':'羅','罚':'罰','罢':'罷','罴':'羆',
    '羁':'羈','羟':'羥','羡':'羨','翘':'翹','翙':'翽','翚':'翬','耢':'耮','耧':'耬','耸':'聳','耻':'恥',
    '聂':'聶','聋':'聾','职':'職','聍':'聹','联':'聯','聩':'聵','聪':'聰','肃':'肅','肠':'腸','肤':'膚',
    '肷':'膁','肾':'腎','肿':'腫','胀':'脹','胁':'脅','胆':'膽','胜':'勝','胧':'朧','胨':'腖','胩':'胹',
    '胪':'臚','胫':'脛','胶':'膠','脉':'脈','脍':'膾','脏':'臟','脐':'臍','脑':'腦','脓':'膿','脔':'臠',
    '脚':'腳','脱':'脫','脶':'腡','脸':'臉','腊':'臘','腌':'醃','腘':'膕','腭':'齶','腻':'膩','腼':'靦',
    '腽':'膃','腾':'騰','膑':'臏','臜':'臢','舆':'輿','舣':'艤','舰':'艦','舱':'艙','舻':'艫','艰':'艱',
    '艳':'艷','艺':'藝','节':'節','芈':'羋','芗':'薌','芜':'蕪','芦':'蘆','苁':'蓯','苇':'葦','苈':'藶',
    '苋':'莧','苌':'萇','苍':'蒼','苎':'苧','苏':'蘇','苘':'檾','苹':'蘋','茎':'莖','茏':'蘢','茑':'蔦',
    '茔':'塋','茕':'煢','茧':'繭','荆':'荊','荐':'薦','荙':'薘','荚':'莢','荛':'蕘','荜':'蓽','荞':'蕎',
    '荟':'薈','荠':'薺','荡':'蕩','荣':'榮','荤':'葷','荥':'滎','荦':'犖','荧':'熒','荨':'蕁','荩':'藎',
    '荪':'蓀','荫':'蔭','荬':'蕒','荭':'葒','荮':'葤','药':'藥','莅':'蒞','莱':'萊','莲':'蓮','莳':'蒔',
    '莴':'萵','莶':'薟','获':'獲','莸':'蕕','莹':'瑩','莺':'鶯','莼':'蒓','萚':'蘀','萝':'蘿','萤':'螢',
    '营':'營','萦':'縈','萧':'蕭','萨':'薩','葱':'蔥','蒇':'蕆','蒉':'蕢','蒋':'蔣','蒌':'蔞','蓝':'藍',
    '蓟':'薊','蓠':'蘺','蓣':'蕷','蓥':'鎣','蓦':'驀','蔂':'虆','蔷':'薔','蔹':'蘞','蔺':'藺','蔼':'藹',
    '蕰':'薀','蕲':'蘄','蕴':'蘊','薮':'藪','藓':'蘚','蘖':'櫱','虏':'虜','虑':'慮','虚':'虛','虫':'蟲',
    '虬':'虯','虮':'蟣','虽':'雖','虾':'蝦','虿':'蠆','蚀':'蝕','蚁':'蟻','蚂':'螞','蚕':'蠶','蚝':'蠔',
    '蚬':'蜆','蛊':'蠱','蛎':'蠣','蛏':'蟶','蛮':'蠻','蛰':'蟄','蛱':'蛺','蛲':'蟯','蛳':'螄','蛴':'蠐',
    '蜕':'蛻','蜗':'蝸','蜡':'蠟','蝇':'蠅','蝈':'蟈','蝉':'蟬','蝎':'蠍','蝼':'螻','蝾':'蠑','螀':'螿',
    '螨':'蟎','蟏':'蠨','衅':'釁','衔':'銜','补':'補','衬':'襯','衮':'袞','袄':'襖','袅':'裊','袆':'褘',
    '袯':'襏','装':'裝','裆':'襠','裈':'褌','裢':'褳','裣':'襝','裤':'褲','裥':'襇','褛':'褸','褴':'襤',
    '襕':'襴','见':'見','观':'觀','觃':'覎','规':'規','觅':'覓','视':'視','觇':'覘','览':'覽','觉':'覺',
    '觊':'覬','觋':'覡','觌':'覿','觍':'覥','觎':'覦','觏':'覯','觐':'覲','觑':'覷','觞':'觴','触':'觸',
    '觯':'觶','讠':'訁','计':'計','订':'訂','讣':'訃','认':'認','讥':'譏','讦':'訐','讧':'訌','讨':'討',
    '让':'讓','讪':'訕','讫':'訖','训':'訓','议':'議','讯':'訊','记':'記','讲':'講','讳':'諱','讴':'謳',
    '讵':'詎','讶':'訝','讷':'訥','许':'許','讹':'訛','论':'論','讼':'訟','讽':'諷','设':'設','访':'訪',
    '诀':'訣','证':'證','诂':'詁','诃':'訶','评':'評','诅':'詛','识':'識','诈':'詐','诉':'訴','诊':'診',
    '诋':'詆','诌':'謅','词':'詞','诎':'詘','诏':'詔','诐':'詖','译':'譯','诒':'詒','诓':'誆','诔':'誄',
    '试':'試','诖':'詿','诗':'詩','诘':'詰','诙':'詼','诚':'誠','诛':'誅','诜':'詵','话':'話','诞':'誕',
    '诟':'詬','诠':'詮','诡':'詭','询':'詢','诣':'詣','诤':'諍','该':'該','详':'詳','诧':'詫','诨':'諢',
    '诩':'詡','诪':'譸','诫':'誡','诬':'誣','语':'語','诮':'誚','误':'誤','诰':'誥','诱':'誘','诲':'誨',
    '诳':'誑','说':'說','诵':'誦','诶':'誒','请':'請','诸':'諸','诹':'諏','诺':'諾','读':'讀','诼':'諑',
    '诽':'誹','课':'課','诿':'諉','谀':'諛','谁':'誰','谂':'諗','调':'調','谄':'諂','谅':'諒','谆':'諄',
    '谇':'誶','谈':'談','谊':'誼','谋':'謀','谌':'諶','谍':'諜','谎':'謊','谏':'諫','谐':'諧','谑':'謔',
    '谒':'謁','谓':'謂','谔':'諤','谕':'諭','谖':'諼','谗':'讒','谘':'諮','谙':'諳','谚':'諺','谛':'諦',
    '谜':'謎','谝':'諞','谞':'諝','谟':'謨','谠':'讜','谡':'謖','谢':'謝','谣':'謠','谤':'謗','谥':'謚',
    '谦':'謙','谧':'謐','谨':'謹','谩':'謾','谪':'謫','谫':'譾','谬':'謬','谭':'譚','谮':'譖','谯':'譙',
    '谰':'讕','谱':'譜','谲':'譎','谳':'讞','谴':'譴','谵':'譫','谶':'讖','谷':'穀','豮':'豶','贝':'貝',
    '贞':'貞','负':'負','贠':'貟','贡':'貢','财':'財','责':'責','贤':'賢','败':'敗','账':'賬','货':'貨',
    '质':'質','贩':'販','贪':'貪','贫':'貧','贬':'貶','购':'購','贮':'貯','贯':'貫','贰':'貳','贱':'賤',
    '贲':'賁','贳':'貰','贴':'貼','贵':'貴','贶':'貺','贷':'貸','贸':'貿','费':'費','贺':'賀','贻':'貽',
    '贼':'賊','贽':'贄','贾':'賈','贿':'賄','赀':'貲','赁':'賃','赂':'賂','赃':'贓','资':'資','赅':'賅',
    '赆':'贐','赇':'賕','赈':'賑','赉':'賚','赊':'賒','赋':'賦','赌':'賭','赍':'齎','赎':'贖','赏':'賞',
    '赐':'賜','赑':'贔','赒':'賙','赓':'賡','赔':'賠','赕':'賧','赖':'賴','赗':'賵','赘':'贅','赙':'賻',
    '赚':'賺','赛':'賽','赜':'賾','赝':'贗','赞':'贊','赟':'贇','赠':'贈','赡':'贍','赢':'贏','赣':'贛',
    '赪':'赬','赵':'趙','赶':'趕','趋':'趨','趱':'趲','趸':'躉','跃':'躍','跄':'蹌','跖':'蹠','跞':'躒',
    '践':'踐','跶':'躂','跷':'蹺','跸':'蹕','跹':'躚','跺':'跺','跻':'躋','踊':'踴','踌':'躊躇','踪':'蹤',
    '踬':'躓','踯':'躑','蹑':'躡','蹒':'蹣','蹰':'躕','蹿':'躥','躏':'躪','躜':'躦','躯':'軀','车':'車',
    '轧':'軋','轨':'軌','轩':'軒','轪':'軑','轫':'軔','转':'轉','轭':'軛','轮':'輪','软':'軟','轰':'轟',
    '轱':'軲','轲':'軻','轳':'轤','轴':'軸','轵':'軹','轶':'軼','轷':'軤','轸':'軫','轹':'轢','轺':'軺',
    '轻':'輕','轼':'軾','载':'載','轾':'輊','轿':'轎','辀':'輈','辁':'輇','辂':'輅','较':'較','辄':'輒',
    '辅':'輔','辆':'輛','辇':'輦','辈':'輩','辉':'輝','辊':'輥','辋':'輞','辌':'輬','辍':'輟','辎':'輜',
    '辏':'輳','辐':'輻','辑':'輯','辒':'轀','输':'輸','辔':'轡','辕':'轅','辖':'轄','辗':'輾','辘':'轆',
    '辙':'轍','辚':'轔','辞':'辭','辩':'辯','辫':'辮','边':'邊','辽':'遼','达':'達','迁':'遷','过':'過',
    '迈':'邁','运':'運','还':'還','这':'這','进':'進','远':'遠','违':'違','连':'連','迟':'遲','迩':'邇',
    '迳':'逕','迹':'跡','适':'適','选':'選','逊':'遜','递':'遞','逦':'邐','逻':'邏','遗':'遺','遥':'遙',
    '邓':'鄧','邝':'鄺','邬':'鄔','邮':'郵','邹':'鄒','邺':'鄴','邻':'鄰','郁':'鬱','郄':'郤','郏':'郟',
    '郐':'鄶','郑':'鄭','郓':'鄆','郦':'酈','郧':'鄖','郸':'鄲','酂':'酇','酝':'醞','酦':'醱','酱':'醬',
    '酽':'釅','酾':'釃','酿':'釀','释':'釋','里':'裡','钅':'釒','钆':'釓','钇':'釔','针':'針','钉':'釘',
    '钊':'釗','钋':'釙','钌':'釕','钍':'釷','钎':'釺','钏':'釧','钐':'釤','钑':'鈒','钒':'釩','钓':'釣',
    '钔':'鍆','钕':'釹','钖':'鍚','钗':'釵','钘':'鈃','钙':'鈣','钚':'鈈','钛':'鈦','钜':'鉅','钝':'鈍',
    '钞':'鈔','钟':'鐘','钠':'鈉','钡':'鋇','钢':'鋼','钣':'鈑','钤':'鈐','钥':'鑰','钦':'欽','钧':'鈞',
    '钨':'鎢','钩':'鉤','钪':'鈧','钫':'鈁','钬':'鈥','钭':'鈄','钮':'鈕','钯':'鈀','钰':'鈺','钲':'鉦',
    '钳':'鉗','钴':'鈷','钵':'缽','钶':'鈳','钷':'鉕','钸':'鈽','钹':'鈸','钺':'鉞','钻':'鑽','钼':'鉬',
    '钽':'鉭','钾':'鉀','钿':'鈿','铀':'鈾','铁':'鐵','铂':'鉑','铃':'鈴','铄':'鑠','铅':'鉛','铆':'鉚',
    '铇':'鉋','铈':'鈰','铉':'鉉','铊':'鉈','铋':'鉍','铌':'鈮','铍':'鈹','铎':'鐸','铏':'鉶','铐':'銬',
    '铑':'銠','铒':'鉺','铓':'鋩','铔':'錏','铕':'銪','铖':'鋮','铗':'鋏','铘':'鋣','铙':'鐃','铚':'銍',
    '铛':'鐺','铜':'銅','铝':'鋁','铞':'銱','铟':'銦','铠':'鎧','铡':'鍘','铢':'銖','铣':'銑','铤':'鋌',
    '铥':'銩','铦':'銛','铧':'鏵','铨':'銓','铩':'鎩','铪':'鉿','铫':'銚','铬':'鉻','铭':'銘','铮':'錚',
    '铯':'銫','铰':'鉸','铱':'銥','铲':'鏟','铳':'銃','铴':'鐋','铵':'銨','银':'銀','铷':'銣','铸':'鑄',
    '铹':'鐒','铺':'鋪','铻':'鋙','铼':'錸','铽':'鋱','链':'鏈','铿':'鏗','销':'銷','锁':'鎖','锂':'鋰',
    '锃':'鋥','锄':'鋤','锅':'鍋','锆':'鋯','锇':'鋨','锈':'銹','锉':'銼','锊':'鋝','锋':'鋒','锌':'鋅',
    '锍':'鋶','锎':'鐦','锏':'鐧','锐':'銳','锑':'銻','锒':'鋃','锓':'鋟','锔':'鋦','锕':'錒','锖':'錆',
    '锗':'鍺','锘':'鍩','错':'錯','锚':'錨','锛':'錛','锜':'錡','锝':'鍀','锞':'錁','锟':'錕','锠':'錩',
    '锡':'錫','锢':'錮','锣':'鑼','锤':'錘','锥':'錐','锦':'錦','锧':'鑕','锨':'杴','锩':'錈','锪':'鍃',
    '锫':'錇','锬':'錟','锭':'錠','键':'鍵','锯':'鋸','锰':'錳','锱':'錙','锲':'鍥','锳':'鍈','锴':'鍇',
    '锵':'鏘','锶':'鍶','锷':'鍔','锸':'鍤','锹':'鍬','锺':'鍾','锻':'鍛','锼':'鎪','锽':'鍠','锾':'鍰',
    '锿':'鎄','镀':'鍍','镁':'鎂','镂':'鏤','镃':'鎡','镄':'鐨','镅':'鎇','镆':'鏌','镇':'鎮','镈':'鎛',
    '镉':'鎘','镊':'鑷','镋':'鎲','镌':'鐫','镍':'鎳','镎':'鎿','镏':'鎦','镐':'鎬','镑':'鎊','镒':'鎰',
    '镓':'鎵','镔':'鑌','镕':'鎔','镖':'鏢','镗':'鏜','镘':'鏝','镙':'鏍','镚':'鏰','镛':'鏞','镜':'鏡',
    '镝':'鏑','镞':'鏃','镟':'鏇','镠':'鏐','镡':'鐔','镢':'鐝','镣':'鐐','镤':'鏷','镥':'鑥','镦':'鐓',
    '镧':'鑭','镨':'鐠','镩':'鑹','镪':'鏹','镫':'鐙','镬':'鑊','镭':'鐳','镮':'鐶','镯':'鐲','镰':'鐮',
    '镱':'鐿','镲':'鑔','镳':'鑣','镴':'鑞','镵':'鑱','镶':'鑲','长':'長','门':'門','闩':'閂','闪':'閃',
    '闫':'閆','闬':'閈','闭':'閉','问':'問','闯':'闖','闰':'閏','闱':'闈','闲':'閑','闳':'閎','间':'間',
    '闵':'閔','闶':'閌','闷':'悶','闸':'閘','闹':'鬧','闺':'閨','闻':'聞','闼':'闥','闽':'閩','闾':'閭',
    '闿':'闓','阀':'閥','阁':'閣','阂':'閡','阃':'閫','阄':'鬮','阅':'閱','阆':'閬','阇':'闍','阈':'閾',
    '阉':'閹','阊':'閶','阋':'鬩','阌':'閿','阍':'閽','阎':'閻','阏':'閼','阐':'闡','阑':'闌','阒':'闃',
    '阓':'闠','阔':'闊','阕':'闋','阖':'闔','阗':'闐','阘':'闒','阙':'闕','阚':'闞','阛':'闤','队':'隊',
    '阳':'陽','阴':'陰','阵':'陣','阶':'階','际':'際','陆':'陸','陇':'隴','陈':'陳','陉':'陘','陕':'陝',
    '陧':'隉','陨':'隕','险':'險','随':'隨','隐':'隱','隶':'隸','隽':'雋','难':'難','雏':'雛','雠':'讎',
    '雳':'靂','雾':'霧','霁':'霽','霉':'黴','霭':'靄','靓':'靚','静':'靜','靥':'靨','鞑':'韃','鞒':'鞽',
    '韦':'韋','韧':'韌','韨':'韍','韩':'韓','韪':'韙','韫':'韞','韬':'韜','韵':'韻','页':'頁','顶':'頂',
    '顷':'頃','顸':'頇','项':'項','顺':'順','须':'須','顼':'頊','顽':'頑','顾':'顧','顿':'頓','颀':'頎',
    '颁':'頒','颂':'頌','颃':'頏','预':'預','颅':'顱','领':'領','颇':'頗','颈':'頸','颉':'頡','颊':'頰',
    '颋':'頲','颌':'頜','颍':'潁','颎':'熲','颏':'頦','颐':'頤','频':'頻','颒':'頮','颓':'頹','颔':'頷',
    '颕':'頴','颖':'穎','颗':'顆','题':'題','颙':'顒','颚':'顎','颛':'顓','颜':'顏','额':'額','颞':'顳',
    '颟':'顢','颠':'顛','颡':'顙','颢':'顥','颤':'顫','颥':'顬','颦':'顰','颧':'顴','风':'風','飏':'颺',
    '飐':'颭','飑':'颮','飒':'颯','飓':'颶','飔':'颸','飕':'颼','飖':'颻','飗':'飀','飘':'飄','飙':'飆',
    '飚':'飈','飞':'飛','飨':'饗','餍':'饜','饣':'飠','饤':'飣','饥':'飢','饦':'飥','饧':'餳','饨':'飩',
    '饩':'餼','饪':'飪','饫':'飫','饬':'飭','饭':'飯','饮':'飲','饯':'餞','饰':'飾','饱':'飽','饲':'飼',
    '饳':'飿','饴':'飴','饵':'餌','饶':'饒','饷':'餉','饸':'餄','饹':'餎','饺':'餃','饻':'餏','饼':'餅',
    '饽':'餑','饾':'餖','饿':'餓','馀':'餘','馁':'餒','馂':'餕','馃':'餜','馄':'餛','馅':'餡','馆':'館',
    '馇':'餷','馈':'饋','馉':'餶','馊':'餿','馋':'饞','馌':'饁','馍':'饃','馎':'餺','馏':'餾','馐':'饈',
    '馑':'饉','馒':'饅','馓':'饊','馔':'饌','馕':'饢','马':'馬','驭':'馭','驮':'馱','驯':'馴','驰':'馳',
    '驱':'驅','驲':'馹','驳':'駁','驴':'驢','驵':'駔','驶':'駛','驷':'駟','驸':'駙','驹':'駒','驺':'騶',
    '驻':'駐','驼':'駝','驽':'駑','驾':'駕','驿':'驛','骀':'駘','骁':'驍','骂':'罵','骃':'駰','骄':'驕',
    '骅':'驊','骆':'駱','骇':'駭','骈':'駢','骉':'驫','骊':'驪','骋':'騁','验':'驗','骍':'騂','骎':'駸',
    '骏':'駿','骐':'騏','骑':'騎','骒':'騍','骓':'騅','骔':'騌','骕':'驌','骖':'驂','骗':'騙','骘':'騭',
    '骙':'騤','骚':'騷','骛':'騖','骜':'驁','骝':'騮','骞':'騫','骟':'騸','骠':'驃','骡':'騾','骢':'驄',
    '骣':'驏','骤':'驟','骥':'驥','骦':'驦','骧':'驤','髅':'髏','髋':'髖','髌':'髕','鬓':'鬢','鬶':'鬹',
    '鬷':'鬷','鬹':'鬹','鱼':'魚','鱽':'魛','鱾':'魢','鱿':'魷','鲀':'魨','鲁':'魯','鲂':'魴','鲃':'䰾',
    '鲄':'魺','鲅':'鮁','鲆':'鮃','鲇':'鯰','鲈':'鱸','鲉':'鮋','鲊':'鮓','鲋':'鮒','鲌':'鮊','鲍':'鮑',
    '鲎':'鱟','鲏':'鮍','鲐':'鮐','鲑':'鮭','鲒':'鮚','鲓':'鮳','鲔':'鮪','鲕':'鮞','鲖':'鮦','鲗':'鰂',
    '鲘':'鮜','鲙':'鱠','鲚':'鱭','鲛':'鮫','鲜':'鮮','鲝':'鮺','鲞':'鯗','鲟':'鱘','鲠':'鯁','鲡':'鱺',
    '鲢':'鰱','鲣':'鰹','鲤':'鯉','鲥':'鰣','鲦':'鰷','鲧':'鯀','鲨':'鯊','鲩':'鯇','鲪':'鮶','鲫':'鯽',
    '鲬':'鯒','鲭':'鯖','鲮':'鯪','鲯':'鯕','鲰':'鯫','鲱':'鯡','鲲':'鯤','鲳':'鯧','鲴':'鯝','鲵':'鯢',
    '鲶':'鯰','鲷':'鯛','鲸':'鯨','鲹':'鰺','鲺':'鯴','鲻':'鯔','鲼':'鱝','鲽':'鰈','鲾':'鰏','鲿':'鱨',
    '鳀':'鯷','鳁':'鰮','鳂':'鰃','鳃':'鰓','鳅':'鰍','鳆':'鰒','鳇':'鰉','鳈':'鰁','鳉':'鱂','鳊':'鯿',
    '鳋':'鰠','鳌':'鰲','鳍':'鰭','鳎':'鰨','鳏':'鰥','鳐':'鰩','鳑':'鰟','鳒':'鰜','鳓':'鰳','鳔':'鰾',
    '鳕':'鱈','鳖':'鱉','鳗':'鰻','鳘':'鰵','鳙':'鱅','鳚':'䲁','鳛':'鰼','鳜':'鱖','鳝':'鱔','鳞':'鱗',
    '鳟':'鱒','鳠':'鱯','鳡':'鱤','鳢':'鱧','鳣':'鱣','鸟':'鳥','鸠':'鳩','鸡':'雞','鸢':'鳶','鸣':'鳴',
    '鸤':'鳲','鸥':'鷗','鸦':'鴉','鸧':'鶬','鸨':'鴇','鸩':'鴆','鸪':'鴣','鸫':'鶇','鸬':'鸕','鸭':'鴨',
    '鸮':'鴞','鸯':'鴦','鸰':'鴒','鸱':'鴟','鸲':'鴝','鸳':'鴛','鸴':'鷽','鸵':'鴕','鸶':'鷥','鸷':'鷙',
    '鸸':'鴯','鸹':'鴰','鸺':'鵂','鸻':'鴴','鸼':'鵃','鸽':'鴿','鸾':'鸞','鸿':'鴻','鹀':'鵐','鹁':'鵓',
    '鹂':'鸝','鹃':'鵑','鹄':'鵠','鹅':'鵝','鹆':'鵒','鹇':'鷳','鹈':'鵜','鹉':'鵡','鹊':'鵲','鹋':'鶓',
    '鹌':'鵪','鹍':'鵾','鹎':'鵯','鹏':'鵬','鹐':'鵮','鹑':'鶉','鹒':'鶊','鹓':'鵷','鹔':'鷫','鹕':'鶘',
    '鹖':'鶡','鹗':'鶚','鹘':'鶻','鹙':'鶖','鹚':'鶿','鹛':'鶥','鹜':'鶩','鹝':'鷊','鹞':'鷂','鹟':'鶲',
    '鹠':'鶹','鹡':'鶺','鹢':'鷁','鹣':'鶼','鹤':'鶴','鹥':'鷖','鹦':'鸚','鹧':'鷓','鹨':'鷚','鹩':'鷯',
    '鹪':'鷦','鹫':'鷲','鹬':'鷸','鹭':'鷺','鹮':'䴉','鹯':'鸇','鹰':'鷹','鹱':'鸌','鹲':'鸏','鹳':'鸛',
    '鹴':'鸘','鹾':'鹺','麦':'麥','麸':'麩','黄':'黃','黉':'黌','黡':'黶','黩':'黷','黪':'黲','黾':'黽',
    '鼋':'黿','鼍':'鼉','鼗':'鞀','鼹':'鼴','齄':'齇','齐':'齊','齑':'齏','齿':'齒','龀':'齔','龁':'齕',
    '龂':'齗','龃':'齟','龄':'齡','龅':'齙','龆':'齠','龇':'齜','龈':'齦','龉':'齬','龊':'齪','龋':'齲',
    '龌':'齷','龙':'龍','龚':'龔','龛':'龕','龟':'龜','龠':'龠',
    '录':'錄','录':'錄','浆':'漿','浆':'漿','台':'臺','里':'裡','只':'隻','准':'準','冲':'衝','余':'餘',
    '系':'係','画':'畫','签':'簽','获':'獲','术':'術','制':'製','御':'禦','愿':'願','干':'幹','历':'歷',
    '发':'發','后':'後','面':'麵','曲':'麴','斗':'鬥','台':'臺'
  };
  function ct(hans, hant) {
    return certScript === 'hant' ? (hant || hans) : hans;
  }
  function cd(s) {
    if (s == null || s === '') return s == null ? '' : String(s);
    if (certScript !== 'hant') return String(s);
    return String(s).replace(/[\u4e00-\u9fff]/g, function (ch) {
      return S2T[ch] || ch;
    });
  }

  function certScope(cert) {
    var lic = cert.license || {};
    var c = cert.conclusions || {};
    var items = [
      { m: 'ok', t: ct('允许商业使用', '允許商業使用') },
      { m: 'ok', t: ct('允许网页、应用程序及文档嵌入', '允許網頁、應用程序及文檔嵌入') },
      { m: 'ok', t: ct('允许修改及二次创作', '允許修改及二次創作') },
      { m: c.redistributeFiles ? 'ok' : 'mid', t: c.redistributeFiles
        ? ct('允许再分发，须随附原始许可', '允許再分發，須隨附原始許可')
        : ct('再分发边界以原始许可为准', '再分發邊界以原始許可為準') },
      { m: c.platformOffersSource ? 'ok' : 'mid', t: c.platformOffersSource
        ? ct('原件由本平台提供', '原件由本平臺提供')
        : ct('原件由上游提供，本平台不予存留', '原件由上游提供，本平臺不予存留') }
    ];
    if (lic.spdx === 'OFL-1.1') {
      items.push({ m: 'no', t: ct('不得单独出售字体文件', '不得單獨出售字體文件') });
      items.push(lic.rfn
        ? { m: 'no', t: ct('修改版本不得使用保留字体名称', '修改版本不得使用保留字體名稱') }
        : { m: 'mid', t: ct('原始许可未设保留字体名称', '原始許可未設保留字體名稱') });
    } else {
      items.push({ m: 'mid', t: ct('副本须随附版权及许可声明', '副本須隨附版權及許可聲明') });
    }
    return items;
  }

  function renderClassicCert(cert) {
    var issuerHans = (cert.issuer && cert.issuer.legalName) || '文派（广州）科技有限公司';
    var issuer = cd(issuerHans);
    var licName = cd((cert.license && cert.license.name) || '');
    var origin = (cert.license && cert.license.origin) || null;
    var blankHolder = ct('未填写（通用核验记录）', '未填寫（通用核驗記錄）');
    var holderCell = cert.holder ? esc(cd(cert.holder)) : blankHolder;
    var infoCells = [
      [ct('收录名称（分发版）', '收錄名稱（分發版）'), esc(cd(cert.catalogName))],
      [ct('持证单位', '持證單位'), holderCell]
    ];
    if (cert.uscc) infoCells.push([ct('统一社会信用代码', '統一社會信用代碼'), esc(cert.uscc)]);
    if (cert.usage && cert.usage.length) {
      infoCells.push([ct('申报用途', '申報用途'), esc(cd(cert.usage.join('、')))]);
    }
    var infoHtml = infoCells.map(function (p) {
      return '<div class="cert-cell"><i>' + p[0] + '</i><b>' + p[1] + '</b></div>';
    }).join('');

    var chainNodes = [
      origin
        ? {
            icon: 'user',
            role: ct('原始授权方', '原始授權方'),
            name: cd(origin.rootAuthor) + '「' + cd(origin.rootWork) + '」',
            sub: ct('基于该原作衍生收录，许可允许修改后分发', '基於該原作衍生收錄，許可允許修改後分發')
          }
        : {
            icon: 'user',
            role: ct('原始授权方', '原始授權方'),
            name: cd(cert.foundry || cert.originalName || ''),
            sub: cert.originalEn || ct('原创设计', '原創設計')
          },
      { icon: 'book', role: ct('开源协议', '開源協議'), name: licName, sub: '' },
      {
        icon: 'shield',
        role: ct('平台收录分发', '平臺收錄分發'),
        name: '文风字体',
        sub: ct('出证责任主体', '出證責任主體'),
        solid: true
      },
      {
        icon: 'idcard',
        role: ct('持证单位', '持證單位'),
        name: cert.holder ? cd(cert.holder) : blankHolder,
        sub: ct('证明持有', '證明持有')
      }
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
      '<div class="chain-detail-row"><i>' + ct('原件处理', '原件處理') + '</i><b>' +
        ct('原样提供 未做修改', '原樣提供 未做修改') + '</b></div>' +
      '<div class="chain-detail-row is-link"><i>' + ct('完整档案', '完整檔案') + '</i><b class="is-mono">wenfeng.org' +
        esc((cert.license && cert.license.url) || '') +
      '</b><span class="chain-detail-note">' +
        ct('协议原文、哈希及收录版本在线可查', '協議原文、哈希及收錄版本在線可查') +
      '</span></div>';

    var scopeMark = { ok: 'check', no: 'close', mid: 'info' };
    var scopeHtml = certScope(cert).map(function (it) {
      return '<span class="cert-scope-item is-' + it.m + '"><i>' + ic(scopeMark[it.m]) + '</i>' + esc(it.t) + '</span>';
    }).join('');

    var prose = ct(
      '兹证明：下列字体经文风云平台按原始开源协议核验后收录分发，授权链完整可追溯。',
      '茲證明：下列字體經文風雲平臺按原始開源協議核驗後收錄分發，授權鏈完整可追溯。'
    );
    if (cert.holder) {
      prose += ct('持证单位', '持證單位') + '<b>' + esc(cd(cert.holder)) + '</b>' +
        ct('，在下列授权范围内使用。', '，在下列授權範圍內使用。');
    }
    prose += ct('有关信息列示如下：', '有關信息列示如下：');

    return '<div class="cert-fit"><article class="cert-sheet' + (cert.prototype ? ' is-proto' : '') + '" id="cert-sheet">' +
      '<span class="cert-frame" aria-hidden="true"></span>' +
      '<span class="cert-frame-inner" aria-hidden="true"></span>' +
      '<p class="cert-mark" aria-hidden="true">文风字体</p>' +
      '<div class="cert-inner">' +
        '<header class="cert-header">' +
          '<div class="cert-brand">' +
            '<img class="cert-logo" src="' + assetUrl('/assets/wf-icon.webp') + '" alt="" width="34" height="34">' +
            '<span class="cert-brand-text"><b>文风字体</b><i>WENPAI TECHNOLOGY · WINDFONTS</i></span>' +
          '</div>' +
          '<div class="cert-type"><b>' + ct('开源字体 · 合规可查', '開源字體 · 合規可查') +
            '</b><i>OPEN FONT COMPLIANCE</i></div>' +
        '</header>' +
        '<div class="cert-flexgap" aria-hidden="true"></div>' +
        '<div class="cert-title-row">' +
          '<h1 class="cert-title">' + ct('授权证明', '授權證明') + '</h1>' +
        '</div>' +
        '<div class="cert-no-strip">' +
          '<span><i>' + ct('证明编号', '證明編號') + '</i><b class="is-red">' + esc(cert.serial) + '</b></span>' +
          '<span><i>' + ct('在线查验', '在線查驗') + '</i><b>wenfeng.org/v</b></span>' +
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
          '<p class="cert-sample-text fn-proof t-' + esc(cert.norm) + '"' +
            (stage && stage.getAttribute('data-face-family')
              ? ' data-face-norm="' + esc(cert.norm) + '" data-face-family="' + esc(stage.getAttribute('data-face-family')) + '" data-face-full="1"'
              : '') +
          '>' + ct('两个黄鹂鸣翠柳，一行白鹭上青天', '兩個黃鸝鳴翠柳，一行白鷺上青天') + '</p>' +
        '</div>' +
        '<p class="cert-memo"><b>' + ct('声明', '聲明') + '</b>　' + ct(
          '文派（广州）科技有限公司系平台运营与分发主体，并非该字体原始著作权人。本证明不改变、不替代原始授权条款，亦非著作权人出具的授权书；字体的使用、修改及分发，以原始授权协议及著作权人声明为准。签发记录留存不少于六年。',
          '文派（廣州）科技有限公司係平臺運營與分發主體，並非該字體原始著作權人。本證明不改變、不替代原始授權條款，亦非著作權人出具的授權書；字體的使用、修改及分發，以原始授權協議及著作權人聲明為準。簽發記錄留存不少於六年。'
        ) + '</p>' +
        '<p class="cert-hereby">' + ct('特此证明', '特此證明') + '</p>' +
        '<div class="cert-sign">' +
          '<div class="cert-verify">' +
            '<span class="cert-qr-wrap is-wait">' +
              '<img class="cert-qr" width="67" height="67" decoding="async" alt="' +
                ct('在线查验二维码', '在線查驗二維碼') +
              '" src="/api/v1/certs/qr?s=' + encodeURIComponent(cert.serial) + '"' +
              ' onload="this.classList.add(\'is-ready\');this.parentNode.classList.remove(\'is-wait\')"' +
              ' onerror="this.parentNode.classList.remove(\'is-wait\');this.parentNode.classList.add(\'is-fail\')">' +
            '</span>' +
            '<div class="cert-verify-copy"><b>' + ct('电子核对', '電子核對') + '</b><p>' +
              ct('扫码进入在线查验', '掃碼進入在線查驗') + '<br>' +
              ct('凭证明编号核对真伪', '憑證明編號核對真偽') + '</p></div>' +
          '</div>' +
          '<div class="cert-sign-off">' + certChop(issuer) +
            '<p class="cert-sign-org">' + esc(issuer) + '</p>' +
            '<p class="cert-sign-date">' + esc(cnDate(cert.issuedAt)) + '</p>' +
          '</div>' +
        '</div>' +
        (cert.prototype
          ? '<p class="cert-proto">' + ct('电子样张　原型环境签发　不作为正式存档', '電子樣張　原型環境簽發　不作為正式存檔') + '</p>'
          : '') +
      '</div>' +
    '</article></div>';
  }

  function renderMinimalCert(c) {
    var L = c.license || {}, C = c.conclusions || {};
    var yn = function (b) {
      return b ? ct('可以', '可以') : ct('不可以', '不可以');
    };
    var row = function (k, v) { return v ? '<div><dt>' + esc(k) + '</dt><dd>' + v + '</dd></div>' : ''; };
    return '<div class="cert-fit"><article class="cert cert-minimal">' +
      '<header>' +
        '<p class="cm-kicker mono">WENFENG · ATTESTATION</p>' +
        '<h2>' + esc(cd(c.title)) + '</h2>' +
        '<p class="cm-meta mono">' + ct('编号', '編號') + ' ' + esc(c.serial) +
          (L.spdx ? ' <span class="cm-spdx">' + esc(L.spdx) + '</span>' : '') + '</p>' +
        (c.prototype
          ? '<p class="cm-proto">' + ct('原型样张，不作正式存档', '原型樣張，不作正式存檔') + '</p>'
          : '') +
      '</header>' +
      '<div class="cm-face">' +
        '<p class="fn">' + esc(cd(c.catalogName)) + '</p>' +
        '<p class="fe">' + esc(cd(c.originalName)) + (c.originalEn ? ' · ' + esc(c.originalEn) : '') + '</p>' +
      '</div>' +
      '<dl class="kv-rows">' +
        row(ct('持证单位', '持證單位'), esc(cd(c.holder))) +
        row(ct('信用代码', '信用代碼'), esc(c.uscc)) +
        row(ct('申报用途', '申報用途'), esc(cd((c.usage || []).join('、')))) +
        row(ct('许可协议', '許可協議'), esc(cd(L.name)) + (L.spdx ? '（<code>' + esc(L.spdx) + '</code>）' : '')) +
        row(ct('作者 / 厂商', '作者 / 廠商'), esc(cd(c.foundry))) +
        row(ct('保留名', '保留名'), esc(cd(L.rfn))) +
        row(ct('源流', '源流'), L.origin ? esc(cd(L.origin.note)) : '') +
        row(ct('上游', '上游'), esc(c.upstreamUrl)) +
        row(ct('原文哈希', '原文哈希'), '<code class="hash">' + esc(L.sha256) + '</code>') +
        row(ct('取证', '取證'), esc(cd((L.evidence || {}).source)) + ' · ' + esc((L.evidence || {}).fetchedAt)) +
      '</dl>' +
      '<div class="concl"><div>' + ct('网页嵌入', '網頁嵌入') + '<b>' + yn(C.embed) + '</b></div><div>' +
        ct('再分发原件', '再分發原件') + '<b>' + yn(C.redistributeFiles) + '</b></div><div>' +
        ct('本站提供原件', '本站提供原件') + '<b>' + (C.platformOffersSource ? ct('是', '是') : ct('否', '否')) +
        '</b></div></div>' +
      '<ul class="not">' + (c.not || []).map(function (t) { return '<li>' + esc(cd(t)) + '</li>'; }).join('') + '</ul>' +
      '<footer><div><p>' + ct('签发：', '簽發：') + esc(cd((c.issuer || {}).legalName)) + '</p><p>' +
        ct('日期：', '日期：') + esc(c.issuedAt) + '</p><p class="mono">' + ct('签名：', '簽名：') +
        esc((c.signature || {}).alg) + ' · ' + esc(((c.signature || {}).value || '').slice(0, 16)) + '…</p></div>' +
      '<span class="cert-qr-wrap is-wait">' +
        '<img class="cert-qr" width="67" height="67" decoding="async" src="/api/v1/certs/qr?s=' +
          encodeURIComponent(c.serial) + '" alt="' + ct('查验二维码', '查驗二維碼') + '"' +
        ' onload="this.classList.add(\'is-ready\');this.parentNode.classList.remove(\'is-wait\')"' +
        ' onerror="this.parentNode.classList.remove(\'is-wait\')">' +
      '</span></footer></article></div>';
  }

  function fitCertSheet() {
    var wrap = document.querySelector('.cert-fit');
    if (!wrap) return;
    var sheet = wrap.querySelector('.cert-sheet, .cert-minimal');
    if (!sheet) return;
    wrap.style.height = '';
    wrap.style.setProperty('--cert-scale', '1');
    var natural = sheet.offsetWidth || 794;
    var stageEl = wrap.parentElement;
    var avail = (stageEl && stageEl.clientWidth) || wrap.clientWidth || natural;
    var scale = Math.min(1, avail / natural);
    wrap.style.setProperty('--cert-scale', String(scale));
    wrap.style.height = Math.ceil(sheet.offsetHeight * scale) + 'px';
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
    try { certScript = localStorage.getItem('wf-cert-script') || 'hans'; } catch (e) {}
    if (qs.get('script') === 'hant' || qs.get('script') === 'zh-Hant') certScript = 'hant';
    if (qs.get('script') === 'hans' || qs.get('script') === 'zh-Hans') certScript = 'hans';

    function syncToolbarLabels() {
      $$('[data-cert-style]').forEach(function (b) {
        if (b.dataset.certStyle === 'classic') b.textContent = ct('经典', '經典');
        if (b.dataset.certStyle === 'minimal') b.textContent = ct('极简', '極簡');
        b.classList.toggle('is-on', b.dataset.certStyle === certStyle);
      });
      $$('[data-cert-script-v]').forEach(function (b) {
        b.classList.toggle('is-on', b.dataset.certScriptV === certScript);
      });
      var pdfBtn = $('[data-pdf]');
      if (pdfBtn) {
        var pdfIcon = pdfBtn.querySelector('.icon');
        pdfBtn.innerHTML = (pdfIcon ? pdfIcon.outerHTML : '') + '<span data-pdf-label>' + ct('下载 PDF（A4）', '下載 PDF（A4）') + '</span>';
      }
      var printBtn = $('[data-print]');
      if (printBtn) printBtn.textContent = ct('打印', '列印');
    }

    function updateCertView() {
      if (!activeCert) return;
      if (activeCert.error) {
        stage.innerHTML = result(
          false,
          ct('这一款还不能出证', '這一款還不能出證'),
          '<p>' + esc(cd(activeCert.reason || activeCert.error)) + '</p>'
        );
        syncToolbarLabels();
        return;
      }
      if (certStyle === 'minimal') {
        stage.innerHTML = renderMinimalCert(activeCert);
      } else {
        if (!document.getElementById('wf-shs-css')) {
          var shs = document.createElement('link');
          shs.id = 'wf-shs-css';
          shs.rel = 'stylesheet';
          shs.href = assetUrl('/assets/shs/regular.css');
          document.head.appendChild(shs);
          var shsb = document.createElement('link');
          shsb.id = 'wf-shs-css-b';
          shsb.rel = 'stylesheet';
          shsb.href = assetUrl('/assets/shs/bold.css');
          document.head.appendChild(shsb);
          var shei = document.createElement('link');
          shei.id = 'wf-shsans-css';
          shei.rel = 'stylesheet';
          shei.href = assetUrl('/assets/shsans/bold.css');
          document.head.appendChild(shei);
        }
        stage.innerHTML = renderClassicCert(activeCert);
      }
      if (activeCert.norm && stage) {
        var fam = stage.getAttribute('data-face-family') || '';
        if (fam) applyFontFace(activeCert.norm, fam, true);
      }
      syncToolbarLabels();
      requestAnimationFrame(function () {
        fitCertSheet();
        requestAnimationFrame(fitCertSheet);
      });
      try { localStorage.setItem('wf-cert-style', certStyle); } catch (e) {}
      try { localStorage.setItem('wf-cert-script', certScript); } catch (e) {}
    }

    var certFitTimer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(certFitTimer);
      certFitTimer = setTimeout(fitCertSheet, 80);
    });
    if (window.matchMedia) {
      try {
        matchMedia('print').addListener(function (mq) {
          if (!mq.matches) requestAnimationFrame(fitCertSheet);
        });
      } catch (e) {}
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
      var pdfBtn = $('[data-pdf]'); if (pdfBtn) {
        pdfBtn.title = ct('边缘暂无矢量 PDF：将打开系统打印，可另存为 PDF', '邊緣暫無矢量 PDF：將開啟系統列印，可另存為 PDF');
        pdfBtn.onclick = function () {
          var q = new URLSearchParams(p.toString());
          if (certStyle === 'minimal') q.set('style', 'minimal');
          var qsPdf = q.toString();
          var url = '/api/v1/certs/' + encodeURIComponent(norm) + '/pdf' + (qsPdf ? '?' + qsPdf : '');
          var label = pdfBtn.querySelector('[data-pdf-label]') || pdfBtn;
          var prev = label.textContent;
          pdfBtn.disabled = true;
          fetch(url, { cache: 'no-store' }).then(function (r) {
            var ctHdr = (r.headers.get('content-type') || '').toLowerCase();
            if (r.status === 501 || ctHdr.indexOf('application/json') !== -1) {
              /* 边缘第一期无矢量 PDF：走页内打印，浏览器可「另存为 PDF」 */
              print();
              return null;
            }
            if (!r.ok) throw new Error('pdf_' + r.status);
            return r.blob().then(function (blob) {
              if (!blob || blob.size < 64) throw new Error('pdf_empty');
              var a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = (activeCert && activeCert.serial ? activeCert.serial : norm) + '.pdf';
              a.click();
              setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
            });
          }).catch(function () {
            print();
          }).then(function () {
            pdfBtn.disabled = false;
            if (label && prev) label.textContent = prev;
          });
        };
      }
      var jsonBtn = $('[data-json]'); if (jsonBtn) jsonBtn.onclick = function () {
        var d = Object.assign({}, c); delete d._status;
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
        a.download = c.serial + '.json'; a.click();
      };
      $$('[data-cert-style]').forEach(function (b) {
        b.onclick = function () { certStyle = b.dataset.certStyle; updateCertView(); };
      });
      $$('[data-cert-script-v]').forEach(function (b) {
        b.onclick = function () {
          certScript = b.dataset.certScriptV === 'hant' ? 'hant' : 'hans';
          updateCertView();
        };
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
        return '<a href="https://wenfeng.org/v/?s=' + serial + '">\n  <img src="' + publicBadgeSrc(serial, v) + '"\n      alt="文风字体授权证明">\n</a>';
      }
      function refreshBadge() {
        var v = badgeVariant();
        var code = embedCode(c.serial, v);
        var embedEl = $('[data-embed]');
        if (embedEl) {
          embedEl.textContent = code;
          embedEl.classList.remove('is-wait');
        }
        var slot = $('[data-badge-slot]');
        var badgeImg = $('[data-badge-img]');
        if (badgeImg) {
          if (slot) {
            slot.classList.add('is-wait');
            slot.classList.remove('is-fail');
          }
          badgeImg.hidden = true;
          badgeImg.onload = function () {
            badgeImg.hidden = false;
            if (slot) {
              slot.classList.remove('is-wait');
              slot.classList.remove('is-fail');
            }
          };
          badgeImg.onerror = function () {
            badgeImg.hidden = true;
            if (slot) {
              slot.classList.remove('is-wait');
              slot.classList.add('is-fail');
            }
          };
          badgeImg.removeAttribute('src');
          badgeImg.src = apiBadgeSrc(c.serial, v);
        }
        var dl = $('[data-badge-dl]');
        if (dl) {
          dl.href = apiBadgeSrc(c.serial, v, true);
          dl.setAttribute('download', 'wenfeng-badge-' + String(c.serial).toLowerCase() + '-' + v + '.svg');
          dl.classList.remove('is-disabled');
          dl.removeAttribute('aria-disabled');
        }
        var copyBtn = $('[data-copy]');
        if (copyBtn) copyBtn.disabled = false;
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
      var embToggle = document.querySelector('.atn-embed-toggle');
      if (embToggle) embToggle.addEventListener('click', function () {
        setTimeout(function () {
          var d = document.querySelector('[data-share]');
          if (d && d.open) d.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 60);
      });
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
      lg.innerHTML = '<p class="empty">' + icon('certificate') + '<span>还没有签发记录。从字体页申领证明后会出现在这里。</span></p>';
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

  /* 玄宗体包：首页主门优先；其它页有 .xxzt 时 idle 再拉，不抢目录预览带宽 */
  (function loadXxzt() {
    var urgent = document.querySelector('.lab-doors.is-prime, [data-face-family="wenfeng-xxzt"]');
    var soft = document.querySelector('h1.xxzt, h2.xxzt, .xxzt');
    if (!urgent && !soft) return;
    function start() {
      var cssTries = [
        'https://cn.windfonts.com/fonts-packages/xxzt/Regular/full/result.css',
        'https://cn.windfonts.com/fonts-packages/Xxzt/Regular/full/result.css'
      ];
      function inject(css, url) {
        var base = url.replace(/result\.css$/, '');
        var st = document.createElement('style');
        st.textContent = css
          .replace(/url\("\.\//g, 'url("' + base)
          .replace(/url\('\.\//g, "url('" + base);
        document.head.appendChild(st);
      }
      (function next(i) {
        if (i >= cssTries.length) {
          applyFontFace('xxzt', 'wenfeng-xxzt', true, 'Regular', 'xxzt', 'full', 'Xxzt');
          return;
        }
        var url = cssTries[i];
        fetch(url).then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.text();
        }).then(function (css) {
          if (css.indexOf('@font-face') === -1) throw new Error('not css');
          inject(css, url);
        }).catch(function () { next(i + 1); });
      })(0);
    }
    if (urgent) {
      start();
    } else if ('requestIdleCallback' in window) {
      requestIdleCallback(start, { timeout: 2500 });
    } else {
      setTimeout(start, 800);
    }
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
        go.textContent = verb ? verb.textContent : '查看字型';
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
