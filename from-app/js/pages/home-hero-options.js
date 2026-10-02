/* 首页 Hero 第二轮：E 大海报 / F 字林 / G 单字。共用当前字体。 */
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

  function stats(list) {
    let free = 0, verified = 0;
    const brands = {};
    list.forEach(function (f) {
      if (WFChrome.licenseTier(f) === '免费商用') free++;
      if (f.licenseEvidence && f.licenseEvidence.verified) verified++;
      const slug = WFChrome.brandSlug(f);
      if (slug) brands[slug] = 1;
    });
    return [
      [list.length, '款', 'fonts.html'],
      [Object.keys(brands).length, '家', 'foundry.html'],
      [free, '免费', 'fonts.html?license=' + encodeURIComponent('免费商用')],
      [verified, '已核对', 'license.html']
    ];
  }

  function whisperHtml(items) {
    return items.map(function (r, i) {
      return (i ? '<span>·</span>' : '') +
        '<a href="' + r[2] + '">' + WFProto.formatCount(r[0]) + ' ' + esc(r[1]) + '</a>';
    }).join('');
  }

  function textOf(sel) {
    const el = document.querySelector(sel);
    return el ? String(el.textContent || '').replace(/\s+/g, '') : '';
  }

  function markSwitch() {
    const id = (location.hash || '#e').replace('#', '') || 'e';
    document.querySelectorAll('.ho-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  WFProto.loadCatalog().then(function (list) {
    const featured = pickFeatured(list, 9);
    const whisper = whisperHtml(stats(list));
    document.querySelectorAll('[data-whisper]').forEach(function (el) { el.innerHTML = whisper; });
    let idx = 0;

    function current() { return featured[idx % featured.length]; }

    function jump(id) {
      const i = featured.findIndex(function (f) { return f.id === id; });
      if (i < 0) return;
      idx = i;
      apply();
    }

    function syncPick() {
      const f = current();
      const on = WFProto.hasPick(f.id);
      document.querySelectorAll('[data-pick]').forEach(function (b) {
        b.setAttribute('data-join', f.id);
        b.textContent = on ? '已在选字袋' : '加入选字袋';
        b.classList.toggle('is-picked', on);
      });
    }

    function factsHtml(font) {
      const brand = WFChrome.brandName(font);
      const weights = WFSpecimen.sortedWeights(font);
      const bits = [
        brand,
        weights.length + ' 字重',
        font.charCount ? WFProto.formatCount(font.charCount) + ' 字' : '',
        WFChrome.licenseTier(font)
      ].filter(Boolean);
      return esc(bits.join(' · '));
    }

    function chorusHtml(font, glyph) {
      const g = glyph || '风';
      const ordered = [font].concat(featured.filter(function (x) { return x.id !== font.id; }));
      return ordered.map(function (f) {
        const w = WFSpecimen.firstWeight(f);
        const stack = WFProto.cssFamilyStack(f.family);
        WFProto.ensureFontCss(f.family, w);
        const on = f.id === font.id;
        if (on) {
          return '<div class="ho-cell is-on">' +
            '<p class="ho-glyph" data-live data-live-f contenteditable="true" spellcheck="false" data-placeholder="风">' + esc(g) + '</p>' +
            '<i>' + esc(f.name) + '</i></div>';
        }
        return '<button type="button" class="ho-cell" data-jump="' + esc(f.id) + '" title="' + esc(f.name) +
          '" style="font-family:' + esc(stack) + ';font-weight:' + w + '">' +
          '<span class="mark">' + esc(g) + '</span><i>' + esc(f.name) + '</i></button>';
      }).join('');
    }

    function renderHints() {
      const samples = {
        e: textOf('[data-live-e]') || '春风',
        f: textOf('[data-live-f]') || '风',
        g: textOf('[data-live-g]') || '永'
      };
      const f = current();
      document.querySelectorAll('[data-rows]').forEach(function (el) {
        const key = el.getAttribute('data-rows');
        const near = featured.slice(0, 3);
        if (near.indexOf(f) === -1) near[0] = f;
        el.innerHTML = '<p class="hint">库还在下面。点行可换成当前款。</p><ul class="specimens"></ul>';
        WFSpecimen.renderRows(el.querySelector('.specimens'), near, { size: 40, sample: samples[key] });
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
      WFProto.ensureFontCss(f.family, w);
      document.querySelectorAll('[data-live-e], [data-live-g]').forEach(function (el) {
        el.style.fontFamily = stack;
        el.style.fontWeight = w;
      });
      document.querySelectorAll('[data-name]').forEach(function (el) {
        el.textContent = f.name;
        el.href = detail;
      });
      document.querySelectorAll('a[data-detail]').forEach(function (el) { el.href = detail; });
      document.querySelectorAll('[data-g-facts]').forEach(function (el) { el.innerHTML = factsHtml(f); });
      const glyph = textOf('[data-live-f]') || '风';
      document.querySelectorAll('[data-chorus]').forEach(function (el) { el.innerHTML = chorusHtml(f, glyph); });
      const liveF = document.querySelector('[data-live-f]');
      if (liveF) {
        liveF.style.fontFamily = stack;
        liveF.style.fontWeight = w;
      }
      renderHints();
      syncPick();
    }

    apply();
    if (!location.hash) location.replace('#e');
    markSwitch();

    const size = document.querySelector('[data-size-e]');
    const sizeVal = document.querySelector('[data-size-e-val]');
    const stageE = document.querySelector('.ho-e');
    if (size && stageE) {
      stageE.style.setProperty('--e-size', size.value + 'px');
      size.addEventListener('input', function () {
        stageE.style.setProperty('--e-size', size.value + 'px');
        if (sizeVal) sizeVal.textContent = size.value;
      });
    }

    document.getElementById('liveNext').addEventListener('click', function () { idx += 1; apply(); });
    document.addEventListener('click', function (e) {
      const jumpBtn = e.target.closest ? e.target.closest('[data-jump]') : null;
      if (jumpBtn) {
        jump(jumpBtn.getAttribute('data-jump'));
        return;
      }
      const row = e.target.closest ? e.target.closest('.ho-libhint .specimen') : null;
      if (row && !e.target.closest('.act, .name')) {
        e.preventDefault();
        jump(row.getAttribute('data-font-id'));
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
      if (!e.target.closest) return;
      if (e.target.closest('[data-live-e], [data-live-g]')) renderHints();
      if (e.target.closest('[data-live-f]')) apply();
    });
    window.addEventListener('hashchange', markSwitch);
  });
})();
