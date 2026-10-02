/* 首页整页结构四套：共用当前字体与字林。 */
(function () {
  const esc = WFProto.escapeHtml;
  const FEATURED = ['阿里巴巴普惠体', '得意黑', '思源黑体', '站酷', '思源宋体', '霞鹙文楷', 'LXGW', '寒蝉', '钟齐'];

  function pickFeatured(list, n) {
    const out = [];
    FEATURED.forEach(function (key) {
      const f = list.filter(function (x) { return x.name.indexOf(key) !== -1 && out.indexOf(x) === -1; })[0];
      if (f) out.push(f);
    });
    list.filter(function (f) { return WFChrome.licenseTier(f) === '免费商用' && (f.weights || []).length >= 2; })
      .forEach(function (f) { if (out.length < n && out.indexOf(f) === -1) out.push(f); });
    return out.slice(0, n);
  }

  function statsHtml(list) {
    let free = 0, verified = 0;
    const brands = {};
    list.forEach(function (f) {
      if (WFChrome.licenseTier(f) === '免费商用') free++;
      if (f.licenseEvidence && f.licenseEvidence.verified) verified++;
      const slug = WFChrome.brandSlug(f);
      if (slug) brands[slug] = 1;
    });
    const rows = [
      [list.length, '在库字体', 'fonts.html'],
      [Object.keys(brands).length, '厂商与作者', 'foundry.html'],
      [free, '免费商用', 'fonts.html?license=' + encodeURIComponent('免费商用')],
      [verified, '许可已核对', 'license.html']
    ];
    return rows.map(function (r) {
      return '<a class="stat-cell" href="' + r[2] + '"><b>' + WFProto.formatCount(r[0]) + '</b><span>' + esc(r[1]) + '</span></a>';
    }).join('');
  }

  function forestGlyph() {
    const el = document.querySelector('[data-forest-glyph]');
    const t = el ? String(el.textContent || '').replace(/\s+/g, '') : '';
    return t || '风';
  }

  function forestHtml(font, featured, glyph) {
    const g = glyph || '风';
    const ordered = [font].concat(featured.filter(function (x) { return x.id !== font.id; }));
    return ordered.map(function (f) {
      const w = WFSpecimen.firstWeight(f);
      const stack = WFProto.cssFamilyStack(f.family);
      WFProto.ensureFontCss(f.family, w);
      if (f.id === font.id) {
        return '<div class="home-forest-cell is-on">' +
          '<p class="home-forest-glyph" data-forest-glyph contenteditable="true" spellcheck="false">' + esc(g) + '</p>' +
          '<i>' + esc(f.name) + '</i></div>';
      }
      return '<button type="button" class="home-forest-cell" data-forest="' + esc(f.id) + '" title="' + esc(f.name) +
        '" style="font-family:' + esc(stack) + ';font-weight:' + w + '">' +
        '<span class="home-forest-mark">' + esc(g) + '</span><i>' + esc(f.name) + '</i></button>';
    }).join('');
  }

  function markSwitch() {
    const id = (location.hash || '#a').replace('#', '') || 'a';
    document.querySelectorAll('.hl-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  WFProto.loadCatalog().then(function (list) {
    const featured = pickFeatured(list, 9);
    const stat = statsHtml(list);
    document.querySelectorAll('[data-stats]').forEach(function (el) { el.innerHTML = stat; });
    let idx = 0;

    function current() { return featured[idx % featured.length]; }

    function syncPick() {
      const f = current();
      const on = WFProto.hasPick(f.id);
      document.querySelectorAll('[data-pick]').forEach(function (b) {
        b.setAttribute('data-join', f.id);
        b.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + (on ? '已在选字袋' : '加入选字袋');
        b.classList.toggle('is-picked', on);
      });
    }

    function renderHints() {
      const f = current();
      const sample = forestGlyph();
      document.querySelectorAll('[data-rows]').forEach(function (el) {
        const near = featured.slice(0, 3);
        if (near.indexOf(f) === -1) near[0] = f;
        el.innerHTML = '<p class="hint">第二拍是库。点行可换成当前款。</p><ul class="specimens"></ul>';
        WFSpecimen.renderRows(el.querySelector('.specimens'), near, { size: 36, sample: sample });
        el.querySelectorAll('.specimen').forEach(function (li) {
          li.classList.toggle('is-now', li.getAttribute('data-font-id') === f.id);
        });
      });
    }

    function apply() {
      const f = current();
      const w = WFSpecimen.firstWeight(f);
      const stack = WFProto.cssFamilyStack(f.family);
      const detail = 'font-detail.html?id=' + encodeURIComponent(f.id);
      const glyph = forestGlyph();
      WFProto.ensureFontCss(f.family, w);
      document.querySelectorAll('[data-live]').forEach(function (el) {
        el.style.fontFamily = stack;
        el.style.fontWeight = w;
      });
      document.querySelectorAll('[data-name]').forEach(function (el) {
        el.textContent = f.name;
        el.href = detail;
      });
      document.querySelectorAll('a[data-detail]').forEach(function (el) { el.href = detail; });
      document.querySelectorAll('[data-forest]').forEach(function (el) {
        el.innerHTML = forestHtml(f, featured, glyph);
        const liveG = el.querySelector('[data-forest-glyph]');
        if (liveG) {
          liveG.style.fontFamily = stack;
          liveG.style.fontWeight = w;
        }
      });
      renderHints();
      syncPick();
    }

    apply();
    if (!location.hash) location.replace('#a');
    markSwitch();

    document.getElementById('liveNext').addEventListener('click', function () { idx += 1; apply(); });
    document.addEventListener('click', function (e) {
      const jump = e.target.closest ? e.target.closest('[data-forest]') : null;
      if (jump) {
        const i = featured.findIndex(function (f) { return f.id === jump.getAttribute('data-forest'); });
        if (i >= 0) { idx = i; apply(); }
        return;
      }
      const row = e.target.closest ? e.target.closest('.hl-lib .specimen') : null;
      if (row && !e.target.closest('.act, .name')) {
        e.preventDefault();
        const i = featured.findIndex(function (f) { return f.id === row.getAttribute('data-font-id'); });
        if (i >= 0) { idx = i; apply(); }
        return;
      }
      const b = e.target.closest ? e.target.closest('[data-pick]') : null;
      if (!b) return;
      const f = current();
      const on = WFProto.hasPick(f.id);
      WFProto.togglePick(f.id, f.name);
      WFChrome.toast(on ? '已从选字袋移除' : '已加入选字袋');
      syncPick();
    });
    document.addEventListener('input', function (e) {
      if (!e.target.closest || !e.target.closest('[data-forest-glyph]')) return;
      const g = forestGlyph();
      document.querySelectorAll('.home-forest-mark').forEach(function (el) { el.textContent = g; });
    });
    window.addEventListener('hashchange', markSwitch);
  });
})();
