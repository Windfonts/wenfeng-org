/* 千字文全屏预览对照。只服务 qianziwen-preview-options.html。 */
(function () {
  'use strict';

  const blocks = document.querySelectorAll('.hc-block');
  const links = document.querySelectorAll('.hc-switch .seg-glyph a');
  const overlay = document.getElementById('qzOverlay');
  const esc = function (s) { return WFProto.escapeHtml(s); };

  function show(id) {
    let found = false;
    blocks.forEach(function (el) {
      const on = el.id === id;
      el.classList.toggle('is-on', on);
      if (on) found = true;
    });
    if (!found) { show('a'); return; }
    links.forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
  }

  function fromHash() {
    const id = (location.hash || '#a').replace(/^#/, '') || 'a';
    show(document.getElementById(id) ? id : 'a');
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      const id = (a.getAttribute('href') || '').replace(/^#/, '');
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      show(id);
    });
  });
  window.addEventListener('hashchange', fromHash);
  fromHash();

  /* —— 覆盖：与字符表同口径（unicode-range + 墨迹） —— */
  const inkCanvas = document.createElement('canvas');
  inkCanvas.width = 64;
  inkCanvas.height = 64;

  function parseUnicodeRanges(css) {
    const ranges = [];
    const re = /unicode-range:\s*([^;}]+)/gi;
    let m;
    while ((m = re.exec(css))) {
      m[1].split(',').forEach(function (tok) {
        const body = tok.trim().replace(/^u\+/i, '');
        if (!body) return;
        let lo, hi;
        if (body.indexOf('?') !== -1) {
          lo = parseInt(body.replace(/\?/g, '0'), 16);
          hi = parseInt(body.replace(/\?/g, 'f'), 16);
        } else if (body.indexOf('-') !== -1) {
          const p = body.split('-');
          lo = parseInt(p[0], 16);
          hi = parseInt(p[1], 16);
        } else {
          lo = hi = parseInt(body, 16);
        }
        if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) ranges.push([lo, hi]);
      });
    }
    ranges.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return ranges;
  }

  function inRanges(ranges, cp) {
    let lo = 0, hi = ranges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = ranges[mid];
      if (cp < r[0]) hi = mid - 1;
      else if (cp > r[1]) lo = mid + 1;
      else return true;
    }
    return false;
  }

  function glyphHasInk(ch, spec) {
    const ctx = inkCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = spec;
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, 4, 52);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 16) return true;
    }
    return false;
  }

  function fetchCssRanges(family, weight) {
    const pathName = WFProto.weightName(family, weight || '400');
    return fetch(WFProto.packageResultUrl(family, pathName, 'full'))
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then(parseUnicodeRanges)
      .catch(function () {
        return fetch(WFProto.cssApiUrl(family, pathName, 'full'))
          .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
          .then(parseUnicodeRanges);
      })
      .catch(function () {
        return fetch(WFProto.cssUrl(family, pathName))
          .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
          .then(parseUnicodeRanges);
      })
      .catch(function () { return null; });
  }

  function uniqueHits(text, marks) {
    const seen = {};
    let hit = 0, total = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      if (ch in seen) continue;
      seen[ch] = true;
      total++;
      if (marks && marks[ch]) hit++;
    }
    return { hit: hit, total: total };
  }

  function pickVariant(font) {
    if (WFChrome.skipGlyphCov && WFChrome.skipGlyphCov(font)) return 'hans';
    return 'hans';
  }

  let font = null;
  let stack = '';
  let weight = '400';
  let text = '';
  let marks = null;
  let stats = { hit: 0, total: 0 };
  let onlyMiss = false;
  let kind = 'a';
  let sizePx = 26;

  function buildMarks(ranges) {
    const out = {};
    const famSpec = '48px ' + stack;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      if (ch in out) continue;
      const cp = ch.codePointAt(0);
      let ok = !ranges || inRanges(ranges, cp);
      if (ok) ok = glyphHasInk(ch, famSpec);
      out[ch] = !!ok;
    }
    return out;
  }

  function missList() {
    const list = [];
    const seen = {};
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      if (seen[ch]) continue;
      seen[ch] = true;
      if (marks && marks[ch] === false) list.push(ch);
    }
    return list;
  }

  function charSpan(ch, i) {
    const miss = marks && marks[ch] === false;
    return '<span class="qz-ch' + (miss ? ' is-miss' : '') + '" data-i="' + i + '" data-ch="' + esc(ch) + '">' + esc(ch) + '</span>';
  }

  function htmlA() {
    let out = '';
    for (let i = 0; i < text.length; i += 4) {
      const chunk = text.slice(i, i + 4);
      out += '<span class="qz-unit">';
      for (let j = 0; j < chunk.length; j++) out += charSpan(chunk.charAt(j), i + j);
      out += '</span>';
    }
    return '<div class="qz-a-sheet" style="font-family:' + esc(stack) + ';font-weight:' + weight + '">' + out + '</div>';
  }

  function htmlB() {
    let out = '';
    for (let i = 0; i < text.length; i++) out += charSpan(text.charAt(i), i);
    return '<div class="qz-b-frame"><div class="qz-b-grid" style="font-family:' + esc(stack) +
      ';font-weight:' + weight + ';--qz-b-size:' + sizePx + 'px">' + out + '</div></div>';
  }

  function htmlC() {
    let body = '';
    for (let i = 0; i < text.length; i++) body += charSpan(text.charAt(i), i);
    const miss = missList();
    const rail = '<aside class="qz-c-rail">' +
      '<h3>覆盖</h3>' +
      '<p class="stat"><b>' + stats.hit + '</b> / ' + stats.total +
      (stats.total ? ' · ' + Math.round(1000 * stats.hit / stats.total) / 10 + '%' : '') + '</p>' +
      '<h3>缺字 ' + miss.length + '</h3>' +
      (miss.length
        ? '<div class="qz-miss-list">' + miss.map(function (ch) {
            return '<button type="button" data-jump="' + esc(ch) + '" title="跳到此字">' + esc(ch) + '</button>';
          }).join('') + '</div>'
        : '<p class="empty">没有缺字。</p>') +
      '</aside>';
    return '<div class="qz-c-wrap">' +
      '<div class="qz-c-text" style="font-family:' + esc(stack) + ';font-weight:' + weight + '">' + body + '</div>' +
      rail + '</div>';
  }

  function htmlD() {
    let out = '';
    for (let i = 0; i < text.length; i++) out += charSpan(text.charAt(i), i);
    return '<div class="qz-d-sheet" style="font-family:' + esc(stack) + ';font-weight:' + weight +
      ';--qz-size:' + sizePx + 'px">' + out + '</div>';
  }

  function covLabel() {
    if (!marks) return '覆盖核对中…';
    const pct = stats.total ? Math.round(1000 * stats.hit / stats.total) / 10 : 0;
    return '常用 <b>' + stats.hit + '</b> / ' + stats.total + ' · ' + pct + '%';
  }

  function paintOverlay() {
    const name = (font && (font.name || font.family)) || '';
    const bodyHtml = kind === 'a' ? htmlA() : kind === 'b' ? htmlB() : kind === 'c' ? htmlC() : htmlD();
    const sizeCtl = (kind === 'd' || kind === 'b')
      ? '<label class="size">字号 <input type="range" min="' + (kind === 'b' ? '14' : '18') +
        '" max="' + (kind === 'b' ? '40' : '56') + '" value="' + sizePx + '" data-size /></label>'
      : '';
    const filterCtl = kind === 'd' ? '' :
      '<div class="seg" role="group" aria-label="筛选">' +
        '<button type="button" data-filter="all"' + (!onlyMiss ? ' class="is-on"' : '') + '>全部</button>' +
        '<button type="button" data-filter="miss"' + (onlyMiss ? ' class="is-on"' : '') + '>只看缺字</button>' +
      '</div>';
    overlay.setAttribute('data-kind', kind);
    overlay.hidden = false;
    overlay.innerHTML =
      '<div class="qz-bar">' +
        '<span class="who">' + esc(name) + ' · 千字文</span>' +
        '<span class="cov">' + covLabel() + '</span>' +
        filterCtl + sizeCtl +
        '<span class="spacer"></span>' +
        '<button type="button" class="btn" data-close>关闭</button>' +
      '</div>' +
      '<div class="qz-body' + (onlyMiss ? ' only-miss' : '') + '">' + bodyHtml + '</div>';

    overlay.querySelector('[data-close]').addEventListener('click', close);
    overlay.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', function () {
        onlyMiss = b.getAttribute('data-filter') === 'miss';
        paintOverlay();
      });
    });
    const sizeEl = overlay.querySelector('[data-size]');
    if (sizeEl) {
      sizeEl.addEventListener('input', function () {
        sizePx = Number(sizeEl.value) || (kind === 'b' ? 26 : 28);
        if (kind === 'b') {
          const grid = overlay.querySelector('.qz-b-grid');
          if (grid) grid.style.setProperty('--qz-b-size', sizePx + 'px');
        } else {
          const sheet = overlay.querySelector('.qz-d-sheet');
          if (sheet) sheet.style.setProperty('--qz-size', sizePx + 'px');
        }
      });
    }
    overlay.querySelectorAll('[data-jump]').forEach(function (b) {
      b.addEventListener('click', function () {
        const ch = b.getAttribute('data-jump');
        const body = overlay.querySelector('.qz-body');
        const target = body && body.querySelector('.qz-ch[data-ch="' + ch + '"]');
        if (!target) return;
        body.querySelectorAll('.is-flash').forEach(function (x) { x.classList.remove('is-flash'); });
        target.classList.add('is-flash');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    document.documentElement.style.overflow = 'hidden';
  }

  function close() {
    overlay.hidden = true;
    overlay.innerHTML = '';
    document.documentElement.style.overflow = '';
  }

  function open(k) {
    if (!font || !text) return;
    kind = k;
    onlyMiss = false;
    paintOverlay();
    if (marks) return;
    fetchCssRanges(font.family, weight).then(function (ranges) {
      return (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        marks = buildMarks(ranges);
        stats = uniqueHits(text, marks);
        if (!overlay.hidden && kind === k) paintOverlay();
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });

  document.querySelectorAll('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () { open(b.getAttribute('data-open')); });
  });

  WFProto.loadCatalog().then(function (list) {
    /* 选一款常见简体目录字；缺字多的显示字更能看出差异 */
    font = list.filter(function (f) { return f.family === 'wenfeng-albbpht'; })[0]
      || list.filter(function (f) { return /普惠|思源黑体|霞鹜/.test(f.name || ''); })[0]
      || list[0];
    if (!font) return;
    weight = String(WFProto.weightToCss(WFSpecimen.firstWeight(font)));
    stack = WFProto.cssFamilyStack(font.family);
    const variant = pickVariant(font);
    text = WFSpecimen.QIANZIWEN[variant] || WFSpecimen.QIANZIWEN.hans;
    WFProto.ensureFontCss(font.family, weight);
    document.querySelectorAll('[data-font-name]').forEach(function (el) {
      el.textContent = (font.name || font.family) + ' · 千字文';
    });
  });
})();
