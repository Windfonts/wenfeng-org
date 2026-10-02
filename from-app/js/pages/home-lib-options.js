/* 首页下半四套：共用当前款，各块自己的分类。 */
(function () {
  const esc = WFProto.escapeHtml;
  const FEATURED = ['阿里巴巴普惠体', '得意黑', '思源黑体', '站酷', '思源宋体', '霞鹙文楷', 'LXGW', '寒蝉', '钟齐'];
  const CAT_LABEL = { '无衬线字体': '黑体', 'Mono': '等宽' };
  const CAT_STYLE = {
    '无衬线字体': 'cat-sans', 衬线: 'cat-serif', 宋体: 'cat-serif', 手写体: 'cat-hand',
    书法: 'cat-callig', 隶书: 'cat-li', Mono: 'cat-mono', 圆体: 'cat-round', 其他: 'cat-deco'
  };
  const WEIGHTS = [
    { id: 'light', label: '细体' }, { id: 'regular', label: '常规' }, { id: 'medium', label: '中等' },
    { id: 'bold', label: '粗体' }, { id: 'heavy', label: '特粗' }
  ];
  const LANGS = ['简体中文', '繁体中文', '英语', '日文', '韩文'];
  const LICENSES = ['开源商用', '免费商用', '需授权', '个人免费', '待核实'];

  function pickFeatured(list, n) {
    const out = [];
    FEATURED.forEach(function (key) {
      const f = list.filter(function (x) { return x.name.indexOf(key) !== -1 && out.indexOf(x) === -1; })[0];
      if (f) out.push(f);
    });
    return out.slice(0, n);
  }
  function catLabel(v) { return CAT_LABEL[v] || v; }
  function catsOf(list) {
    const seen = {};
    return list.map(function (f) { return f.category; }).filter(function (c) {
      if (!c || seen[c]) return false;
      seen[c] = true;
      return true;
    });
  }
  function catCounts(list) {
    const n = {};
    list.forEach(function (f) { if (f.category) n[f.category] = (n[f.category] || 0) + 1; });
    return catsOf(list).map(function (v) { return { v: v, n: n[v] || 0 }; });
  }
  function pool(list, cat, font) {
    const rows = list.filter(function (f) { return !cat || f.category === cat; });
    if (font && (!cat || font.category === cat)) {
      return [font].concat(rows.filter(function (f) { return f.id !== font.id; }));
    }
    return rows;
  }
  function markRows(listEl, id) {
    listEl.querySelectorAll('.specimen').forEach(function (li) {
      li.classList.toggle('is-now', li.getAttribute('data-font-id') === id);
    });
  }
  function fillRows(listEl, fonts, currentId) {
    WFSpecimen.renderRows(listEl, fonts, { size: 40 });
    markRows(listEl, currentId);
  }
  function bits(font) {
    const n = (font.weights || []).length || 1;
    const parts = [WFChrome.licenseTier(font), n + ' 字重'];
    if (font.charCount) parts.push(WFProto.formatCount(font.charCount) + ' 字');
    return parts.join(' · ');
  }
  function slimSide(font, list, extra) {
    const brand = WFChrome.brandName(font);
    const n = list.filter(function (f) { return WFChrome.brandName(f) === brand; }).length;
    const detail = 'font-detail.html?id=' + encodeURIComponent(font.id);
    return '<div class="panel panel-pad hl-side-slim">' +
      WFChrome.foundryHtml(font, { small: true, sub: '在库 ' + n + ' 款' }) +
      '<p class="hl-side-bits">' + esc(bits(font)) + '</p>' +
      (extra || '') +
      '<div class="actions">' +
        '<button type="button" class="btn ink-design" data-pick>' + WFChrome.icon('plus') + '加入选字袋</button>' +
        '<a class="btn for-design" href="' + detail + '">' + WFChrome.icon('arrow-right') + '查看字体</a>' +
      '</div></div>';
  }
  function catRail(items, on, block) {
    const rows = items.map(function (it) {
      const active = on === it.v;
      return '<li' + (active ? ' class="is-on"' : '') + '><button type="button" class="' + (CAT_STYLE[it.v] || '') +
        '" data-block="' + block + '" data-cat="' + esc(it.v) + '"><span>' + esc(catLabel(it.v)) +
        '</span><span class="n">' + it.n + '</span></button></li>';
    }).join('');
    return '<div class="facet facet-cat"><h3>分类</h3><ul>' + rows + '</ul></div>';
  }
  function chips(title, key, values, block) {
    const row = values.map(function (v) {
      return '<button type="button" class="chip" tabindex="-1">' + esc(v) + '</button>';
    }).join('');
    return '<details class="hl-fold"><summary>' + esc(title) + '</summary><div class="chips">' + row + '</div></details>';
  }
  function chartsHtml(list) {
    const tiers = {};
    const brandCount = {};
    const brandName = {};
    const SCALE = [
      { label: '3 千字内', min: 0, max: 3000, n: 0 },
      { label: '3 千–7 千', min: 3000, max: 7000, n: 0 },
      { label: '7 千–1 万', min: 7000, max: 10000, n: 0 },
      { label: '1 万–2 万', min: 10000, max: 20000, n: 0 },
      { label: '2 万以上', min: 20000, max: Infinity, n: 0 }
    ];
    let known = 0;
    list.forEach(function (f) {
      const t = WFChrome.licenseTier(f);
      tiers[t] = (tiers[t] || 0) + 1;
      const slug = WFChrome.brandSlug(f);
      if (slug) {
        brandCount[slug] = (brandCount[slug] || 0) + 1;
        if (!brandName[slug]) brandName[slug] = WFChrome.brandName(f) || slug;
      }
      const cc = Number(f.charCount);
      if (cc > 0) {
        known++;
        for (let i = 0; i < SCALE.length; i++) {
          if (cc >= SCALE[i].min && cc < SCALE[i].max) { SCALE[i].n++; break; }
        }
      }
    });
    function rows(items) {
      const max = Math.max.apply(null, items.map(function (r) { return r.n; })) || 1;
      return items.map(function (r) {
        const w = Math.max(3, Math.round(r.n / max * 100));
        return '<div class="stat-row"><span class="lab">' + esc(r.label) + '</span>' +
          '<span class="track"><i style="width:' + w + '%"></i></span>' +
          '<span class="num">' + r.n + '</span></div>';
      }).join('');
    }
    function panel(title, body) {
      return '<div class="panel panel-pad stat-panel"><h3>' + esc(title) + '</h3>' + body + '</div>';
    }
    const tierItems = ['开源商用', '免费商用', '需授权', '个人免费', '待核实'].filter(function (t) { return tiers[t]; })
      .map(function (t) { return { label: t, n: tiers[t] }; });
    const top = Object.keys(brandCount).map(function (s) {
      return { label: brandName[s], n: brandCount[s] };
    }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
    return '<div class="section-head"><h2>库内结构</h2></div><div class="stats-grid">' +
      panel('按授权', rows(tierItems)) +
      panel('字体最多的厂商', rows(top)) +
      panel('字符规模', rows(SCALE.map(function (b) { return { label: b.label, n: b.n }; }))) +
      '</div>';
  }

  function currentHash() {
    return (location.hash || '#a').replace('#', '') || 'a';
  }
  function markSwitch() {
    const id = currentHash();
    document.querySelectorAll('.hl-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
    document.querySelectorAll('.hl-block').forEach(function (el) {
      el.classList.toggle('is-on', el.id === id);
    });
  }
  function goBlock() {
    markSwitch();
    window.scrollTo(0, 0);
  }

  WFProto.loadCatalog().then(function (list) {
    const featured = pickFeatured(list, 9);
    const counts = catCounts(list);
    let idx = 0;
    let current = featured[0];
    const filter = { a: '', b: '', d: '' };

    function syncPick() {
      const on = WFProto.hasPick(current.id);
      document.querySelectorAll('[data-pick]').forEach(function (b) {
        b.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + (on ? '已在选字袋' : '加入选字袋');
      });
    }
    function setNames() {
      const detail = 'font-detail.html?id=' + encodeURIComponent(current.id);
      document.querySelectorAll('[data-name]').forEach(function (el) {
        el.textContent = current.name;
        el.href = detail;
      });
    }
    function renderA() {
      const rows = pool(list, filter.a, current);
      document.getElementById('aRail').innerHTML = catRail(counts, filter.a, 'a');
      document.getElementById('aCount').innerHTML = '共 <strong>' + rows.length + '</strong> 款 · 示意前 8 款';
      fillRows(document.getElementById('aList'), rows.slice(0, 8), current.id);
      document.getElementById('aSide').innerHTML = slimSide(current, list);
    }
    function renderB() {
      const rows = pool(list, filter.b, current);
      document.getElementById('bCats').innerHTML = counts.map(function (it) {
        const on = filter.b === it.v;
        return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-block="b" data-cat="' +
          esc(it.v) + '">' + esc(catLabel(it.v)) + ' <span class="n">' + it.n + '</span></button>';
      }).join('');
      document.getElementById('bCount').innerHTML = '共 <strong>' + rows.length + '</strong> 款 · 示意前 8 款';
      fillRows(document.getElementById('bList'), rows.slice(0, 8), current.id);
    }
    function renderC() {
      const same = list.filter(function (f) { return f.id !== current.id && f.category === current.category; });
      const rest = featured.filter(function (f) { return f.id !== current.id && same.indexOf(f) === -1; });
      const rows = same.concat(rest).slice(0, 12);
      const w = WFSpecimen.firstWeight(current);
      const stack = WFProto.cssFamilyStack(current.family);
      const detail = 'font-detail.html?id=' + encodeURIComponent(current.id);
      WFProto.ensureFontCss(current.family, w);
      document.getElementById('cNow').innerHTML =
        '<p class="hl-now-glyph" style="font-family:' + esc(stack) + ';font-weight:' + w + '">风</p>' +
        '<div><h3><a href="' + detail + '">' + esc(current.name) + '</a></h3>' +
        '<div class="sub">' + WFChrome.foundryHtml(current, { small: true }) + '</div>' +
        '<p class="hl-side-bits">' + esc(bits(current)) + '</p></div>' +
        '<div class="acts">' +
          '<a class="btn btn-ink" href="' + detail + '">查看这款</a>' +
          '<button type="button" class="btn" data-pick>' + WFChrome.icon('plus') + '加入选字袋</button>' +
        '</div>';
      document.getElementById('cCount').textContent =
        (catLabel(current.category) || '同分类') + ' · 抽出 ' + rows.length + ' 款';
      fillRows(document.getElementById('cList'), rows, '');
      document.getElementById('cMore').innerHTML =
        '<a class="btn btn-lg" href="fonts.html">全部 ' + list.length + ' 款 →</a>';
    }
    function renderD() {
      const rows = pool(list, filter.d, current);
      document.getElementById('dRail').innerHTML =
        catRail(counts, filter.d, 'd') +
        chips('字重', 'weight', WEIGHTS.map(function (x) { return x.label; }), 'd') +
        chips('语言', 'lang', LANGS, 'd') +
        chips('许可', 'license', LICENSES, 'd');
      document.getElementById('dCount').innerHTML = '共 <strong>' + rows.length + '</strong> 款 · 示意前 8 款';
      fillRows(document.getElementById('dList'), rows.slice(0, 8), current.id);
      const kv = [
        ['字重', String((current.weights || []).length || 1)],
        ['字符数', current.charCount ? WFProto.formatCount(current.charCount) : ''],
        ['发布', current.releaseYear ? String(current.releaseYear) : '']
      ].filter(function (r) { return r[1]; });
      document.getElementById('dSide').innerHTML = slimSide(current, list,
        '<dl class="kv hl-kv">' + kv.map(function (r) {
          return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
        }).join('') + '</dl>');
    }

    function apply() {
      setNames();
      renderA();
      renderB();
      renderC();
      renderD();
      syncPick();
    }

    document.getElementById('dCharts').innerHTML = chartsHtml(list);
    apply();
    if (!location.hash) location.replace('#a');
    goBlock();

    document.getElementById('liveNext').addEventListener('click', function () {
      idx += 1;
      current = featured[idx % featured.length];
      apply();
    });
    document.addEventListener('click', function (e) {
      const cat = e.target.closest ? e.target.closest('[data-cat]') : null;
      if (cat) {
        const block = cat.getAttribute('data-block');
        const v = cat.getAttribute('data-cat');
        filter[block] = filter[block] === v ? '' : v;
        apply();
        return;
      }
      const pick = e.target.closest ? e.target.closest('[data-pick]') : null;
      if (pick) {
        const on = WFProto.hasPick(current.id);
        WFProto.togglePick(current.id, current.name);
        WFChrome.toast(on ? '已从选字袋移除' : '已加入选字袋');
        syncPick();
        return;
      }
      const row = e.target.closest ? e.target.closest('.specimen') : null;
      if (row && !e.target.closest('.act, .name, .preview')) {
        const f = list.filter(function (x) { return x.id === row.getAttribute('data-font-id'); })[0];
        if (f) { current = f; apply(); }
      }
    });
    window.addEventListener('hashchange', goBlock);
  });
})();
