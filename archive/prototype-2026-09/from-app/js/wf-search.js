/* 顶栏搜索：输入出几条预测，字体名用本款字面。依赖 wf-proto / wf-chrome */
(function () {
  const N = 6;

  function esc(s) { return WFProto.escapeHtml(s); }
  function href(path) { return WFChrome.href(path); }

  function firstWeight(font) {
    const ws = (font.weights && font.weights.length) ? font.weights : ['Regular'];
    const hit = ws.filter(function (w) { return WFProto.weightToCss(w) === '400'; })[0];
    return WFProto.weightToCss(hit || ws[0]);
  }

  function faceStyle(font) {
    const w = firstWeight(font);
    WFProto.ensureFontCss(font.family, w, 'zh');
    return 'font-family:' + esc(WFProto.cssFamilyStack(font.family)) + ';font-weight:' + w;
  }

  function score(font, kw) {
    const name = String(font.name || '').toLowerCase();
    const en = String(font.en || '').toLowerCase();
    if (name === kw || en === kw) return 100;
    if (name.indexOf(kw) === 0 || en.indexOf(kw) === 0) return 80;
    if (name.indexOf(kw) !== -1 || en.indexOf(kw) !== -1) return 50;
    if (WFProto.matchFilter(font, '', kw, '')) return 20;
    return 0;
  }

  function hits(kw) {
    return WFProto.getCatalogList().map(function (f) { return { f: f, n: score(f, kw) }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n || String(a.f.name).localeCompare(String(b.f.name), 'zh'); })
      .slice(0, N)
      .map(function (x) { return x.f; });
  }

  function paint(pop, q) {
    const kw = (q || '').trim();
    if (!kw) { pop.hidden = true; pop.innerHTML = ''; return; }
    const list = hits(kw.toLowerCase());
    pop.innerHTML = list.length
      ? list.map(function (f) {
          return '<a class="search-hit" role="option" href="' + href(WFProto.detailHref(f)) + '">' +
            '<span class="search-face" style="' + faceStyle(f) + '">' + esc(f.name) + '</span>' +
            '<span class="search-meta">' + esc(WFChrome.brandName(f) || '') + '</span></a>';
        }).join('')
      : '<p class="search-empty">没有「' + esc(kw) + '」</p>';
    pop.hidden = false;
    setActive(pop, 0);
  }

  function options(pop) { return pop.querySelectorAll('[role="option"]'); }
  function setActive(pop, i) {
    const items = options(pop);
    if (!items.length) return;
    const n = (i + items.length) % items.length;
    items.forEach(function (el, idx) { el.classList.toggle('is-on', idx === n); });
    pop.setAttribute('data-i', String(n));
  }
  function activeHref(pop) {
    const items = options(pop);
    const el = items[parseInt(pop.getAttribute('data-i') || '0', 10)] || items[0];
    return el ? el.getAttribute('href') : '';
  }

  function bind(form) {
    const input = form.querySelector('input[type="search"]');
    if (!input || input._wfSuggest) return;
    input._wfSuggest = true;
    const pop = document.createElement('div');
    pop.className = 'search-pop';
    pop.hidden = true;
    pop.setAttribute('role', 'listbox');
    form.appendChild(pop);

    let timer = null;
    function run() {
      WFProto.loadCatalog().then(function () { paint(pop, input.value); });
    }
    function hide() { pop.hidden = true; }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
    input.addEventListener('focus', function () {
      if ((input.value || '').trim()) run();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !pop.hidden) { hide(); e.stopPropagation(); return; }
      if (pop.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(pop, parseInt(pop.getAttribute('data-i') || '0', 10) + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(pop, parseInt(pop.getAttribute('data-i') || '0', 10) - 1); }
      else if (e.key === 'Enter' && activeHref(pop)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        location.href = activeHref(pop);
      }
    }, true);
    document.addEventListener('pointerdown', function (e) {
      if (!form.contains(e.target)) hide();
    });
  }

  function mount() { document.querySelectorAll('.topsearch').forEach(bind); }
  window.WFSearch = { mount: mount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
