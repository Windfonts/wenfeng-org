/* 首页同分类三套对照。不进正式站。 */
(function () {
  const FEATURED = ['阿里巴巴普惠体', '得意黑', '思源黑体', '站酷', '思源宋体', '霞鹙文楷', 'LXGW', '寒蝉', '钟齐'];
  const RELATED_N = 4;
  const SCHEME = {
    a: { title: '甲 · 现页', hint: '现在首页：四行瘦条，同一句诗，40px。', grid: false, size: 40 },
    b: { title: '乙 · 自报名', hint: '两列。预览是字体自己的名字，64px。', grid: true, size: 64, named: true },
    c: { title: '丙 · 同字', hint: '两列。预览跟上字林同一个「风」，88px。', grid: true, size: 88, sample: '风' }
  };

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

  function catLabel(font) {
    return WFChrome.catLabel(font.category) || font.category || '同分类';
  }

  function relatedOf(list, featured, font) {
    if (!font.category) {
      return featured.filter(function (f) { return f.id !== font.id; }).concat(
        list.filter(function (f) { return f.id !== font.id && featured.indexOf(f) === -1; })
      ).slice(0, RELATED_N);
    }
    const same = list.filter(function (f) { return f.id !== font.id && f.category === font.category; });
    const rest = featured.filter(function (f) { return f.id !== font.id && same.indexOf(f) === -1; });
    return same.concat(rest).slice(0, RELATED_N);
  }

  function schemeId() {
    const id = (location.hash || '#a').slice(1);
    return SCHEME[id] ? id : 'a';
  }

  WFProto.loadCatalog().then(function (list) {
    const featured = pickFeatured(list, 9);
    let idx = 0;
    const listEl = document.getElementById('hrList');
    const titleEl = document.querySelector('[data-title]');
    const hintEl = document.querySelector('[data-hint]');
    const countEl = document.querySelector('[data-count]');
    const nameEl = document.querySelector('[data-name]');
    const nav = document.querySelector('.hr-switch .seg-glyph');

    function fill(fonts, spec) {
      listEl.innerHTML = '';
      if (spec.named) {
        fonts.forEach(function (f) { WFSpecimen.appendRows(listEl, [f], { size: spec.size, sample: f.name }); });
        return;
      }
      WFSpecimen.renderRows(listEl, fonts, { size: spec.size, sample: spec.sample });
    }

    function render() {
      const id = schemeId();
      const spec = SCHEME[id];
      const font = featured[idx % featured.length];
      const rows = relatedOf(list, featured, font);
      document.body.setAttribute('data-hr', id);
      nav.querySelectorAll('a').forEach(function (a) {
        a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
      });
      titleEl.textContent = spec.title;
      hintEl.textContent = spec.hint;
      nameEl.textContent = font.name;
      nameEl.href = 'font-detail.html?id=' + encodeURIComponent(font.id);
      countEl.textContent = catLabel(font) + ' · 抽出 ' + rows.length + ' 款';
      listEl.classList.toggle('is-grid', spec.grid);
      fill(rows, spec);
    }

    document.getElementById('liveNext').addEventListener('click', function () {
      idx += 1;
      render();
    });
    window.addEventListener('hashchange', render);
    render();
  });
})();
