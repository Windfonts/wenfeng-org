/* 字体详情四套结构稿。用真实字体，不改现页。 */
(function () {
  const esc = WFProto.escapeHtml;
  const SAMPLE = '春风又绿江南岸';
  const POEM = '行到水穷处，坐看云起时';
  const GLYPHS = '天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏';

  function crumb(font) {
    return '<p class="do-crumb crumb"><a href="fonts.html">字体库</a><span>/</span>' +
      (font.category ? '<a href="fonts.html?cat=' + encodeURIComponent(font.category) + '">' + esc(font.category) + '</a><span>/</span>' : '') +
      '<span>' + esc(font.name) + '</span></p>';
  }
  function faceStyle(font, w) {
    return 'font-family:' + esc(WFProto.cssFamilyStack(font.family)) + ';font-weight:' + w;
  }
  function weightBtns(font, w0) {
    return WFSpecimen.sortedWeights(font).map(function (w) {
      const c = WFProto.weightToCss(w);
      return '<button type="button" data-w="' + c + '"' + (c === w0 ? ' class="is-on"' : '') + '>' + esc(w) + '</button>';
    }).join('');
  }
  function metaLine(font) {
    const n = WFSpecimen.sortedWeights(font).length;
    return '<p class="dotlist">' +
      '<a href="foundry.html?slug=' + encodeURIComponent(WFChrome.brandSlug(font)) + '">' + esc(WFChrome.brandName(font) || '未署名') + '</a>' +
      '<span>' + n + ' 字重</span>' +
      '<span>' + esc(WFChrome.licenseTier(font)) + '</span>' +
      (font.charCount ? '<span>' + WFProto.formatCount(font.charCount) + ' 字</span>' : '') +
      '</p>';
  }
  function title(font, w0) {
    return '<div class="do-title">' +
      '<div><h1>' + esc(font.name) + (font.en ? ' <small>' + esc(font.en) + '</small>' : '') + '</h1>' + metaLine(font) + '</div>' +
      '<div class="do-acts">' +
        '<button type="button" class="btn ink-design" data-pick>' + WFChrome.icon('plus') + '加入选字袋</button>' +
        '<button type="button" class="btn btn-ink" data-use>' + WFChrome.icon('code') + '获取代码</button>' +
      '</div></div>';
  }
  function wall(font, w0, editHref) {
    return '<section class="do-wall for-design">' +
      '<div class="do-face" data-face contenteditable="true" spellcheck="false" style="' + faceStyle(font, w0) + '">' + esc(SAMPLE) + '</div>' +
      '<div class="do-tools">' +
        '<input class="range" type="range" min="32" max="120" value="64" data-size aria-label="字号" />' +
        '<span class="val" data-size-val>64px</span>' +
        '<div class="weights">' + weightBtns(font, w0) + '</div>' +
        '<span class="spacer"></span>' +
        '<a class="btn-text" href="' + esc(editHref) + '">' + WFChrome.icon('edit') + '编辑样张</a>' +
      '</div></section>';
  }
  function weights(font) {
    return '<section><h2>字重 · ' + WFSpecimen.sortedWeights(font).length + '</h2>' +
      '<div class="weights-sheet">' + WFSpecimen.weightsSheetHtml(font, POEM) + '</div></section>';
  }
  function preview(font, w0) {
    return '<section class="for-dev"><h2>预览</h2>' +
      '<input class="input" data-preview-text value="' + esc(POEM) + '" aria-label="预览文字" />' +
      '<p class="do-preview" data-preview style="' + faceStyle(font, w0) + '">' + esc(POEM) + '</p></section>';
  }
  function embed(font, w0) {
    const fam = WFEmbed.familyName(font.family);
    const origin = WFProto.cdnOrigin();
    const url = WFProto.cssUrl(font.family, w0, '', origin);
    return '<section class="for-dev"><h2>使用</h2><div class="do-embed">' +
      '<div class="opts">' +
        '<div class="field"><label>子集</label><select class="select"><option>常用 3500</option><option>中文 7000</option><option>完整</option></select></div>' +
        '<div class="field"><label>字重</label><select class="select"><option>仅常规 / 首个字重</option><option>全部字重</option></select></div>' +
        '<div class="field"><label>font-display</label><select class="select"><option>默认（swap）</option></select></div>' +
      '</div>' +
      '<div class="tabs" role="tablist"><button type="button" class="is-on">link</button><button type="button">@import</button><button type="button">css</button><button type="button">npm</button></div>' +
      '<div class="code"><button type="button" class="copy" data-copy>' + WFChrome.icon('copy') + '复制</button>' +
      '<pre>' + esc('<!-- 此中文网页字体由文风字体（Windfonts）免费提供 -->\n<link rel="preconnect" href="' + origin + '" crossorigin>\n<link rel="stylesheet" href="' + url + '">') + '</pre></div>' +
      '<p class="do-note">font-family 以 <code>' + esc(fam) + '</code> 为准。体积为单字重估算。</p></div></section>';
  }
  function license(font) {
    const tier = WFChrome.licenseTier(font);
    return '<details class="side-fold"><summary>' + WFChrome.icon('chevron-down') + '授权 · ' + esc(tier) + '</summary>' +
      '<p class="license-lead" style="margin-top:var(--s-3)">可免费用于网页、App、印刷与商业项目。</p>' +
      '<div class="license-grid">' +
        '<div><h3>可以</h3><ul class="ok"><li>商业项目与网页嵌入</li><li>品牌、电商、海报、界面</li></ul></div>' +
        '<div><h3>不可以</h3><ul class="no"><li>修改后再分发</li><li>单独售卖字体文件</li></ul></div>' +
      '</div></details>';
  }
  function glyphs(font, w0) {
    const cells = GLYPHS.split('').map(function (ch) {
      return '<span style="' + faceStyle(font, w0) + '">' + esc(ch) + '</span>';
    }).join('');
    return '<details class="side-fold"><summary>' + WFChrome.icon('chevron-down') + '字符表 · 常用 994 / 994</summary>' +
      '<div class="do-glyphs" style="margin-top:var(--s-4)">' + cells + '</div>' +
      '<p class="do-note">示意前 24 字，不是全表。</p></details>';
  }
  function glyphsLive() {
    return '<section class="do-glyphs-sec">' +
      '<div class="do-glyph-head"><h2>字符表</h2><div class="glyph-tools" data-glyph-tools></div></div>' +
      '<div class="glyph-summary" data-glyph-summary></div>' +
      '<div class="glyph-blocks" data-glyph-blocks></div></section>';
  }
  function side(font, list) {
    const brand = WFChrome.brandSlug(font);
    const n = list.filter(function (f) { return WFChrome.brandSlug(f) === brand; }).length;
    const kv = [
      ['制作方', WFChrome.makerInfo(font) && WFChrome.makerInfo(font).name],
      ['字重', String(WFSpecimen.sortedWeights(font).length)],
      ['分类', font.category],
      ['发布', font.releaseYear ? String(font.releaseYear) : '']
    ].filter(function (r) { return r[1]; });
    return '<aside class="do-side" aria-label="资料">' +
      '<div class="do-card">' + WFChrome.foundryHtml(font, { sub: '在库 ' + n + ' 款' }) + '</div>' +
      '<details class="do-card side-fold"><summary>' + WFChrome.icon('chevron-down') + '资料</summary>' +
        '<dl class="kv">' + kv.map(function (r) {
          return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>';
        }).join('') + '</dl></details>' +
      '<div class="do-card"><h3>标签</h3><div class="chips">' +
        (font.tags || []).slice(0, 4).map(function (t) {
          return '<a class="chip" href="fonts.html?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
        }).join('') + '</div></div></aside>';
  }

  function htmlA(font, list, w0, href) {
    return crumb(font) + wall(font, w0, href) + title(font, w0) +
      '<div class="do-body"><div class="do-main">' + embed(font, w0) + preview(font, w0) + weights(font) +
      glyphsLive() + '<section>' + license(font) + '</section></div>' + side(font, list) + '</div>';
  }
  function htmlB(font, list, w0, href) {
    const brand = WFChrome.brandSlug(font);
    const n = list.filter(function (f) { return WFChrome.brandSlug(f) === brand; }).length;
    return crumb(font) + '<div class="do-split">' +
      '<div class="do-stage">' + wall(font, w0, href) +
        '<div class="for-design" style="margin-top:var(--s-6)">' + weights(font) + '</div>' +
        embed(font, w0) + preview(font, w0) +
      '</div>' +
      '<aside class="do-rail">' +
        '<div><h1>' + esc(font.name) + '</h1>' + metaLine(font) + '</div>' +
        '<div class="do-acts">' +
          '<button type="button" class="btn ink-design" data-pick>' + WFChrome.icon('plus') + '加入选字袋</button>' +
          '<button type="button" class="btn btn-ink" data-use>' + WFChrome.icon('code') + '获取代码</button>' +
        '</div>' +
        WFChrome.foundryHtml(font, { sub: '在库 ' + n + ' 款' }) +
        '<p class="do-rail do-lead" style="position:static">可免费用于网页、App、印刷与商业项目。</p>' +
        license(font) +
      '</aside></div>';
  }
  function htmlC(font, list, w0, href) {
    return crumb(font) + title(font, w0) +
      '<nav class="do-tabs" role="tablist">' +
        '<button type="button" class="for-design" data-pane="wall">样张</button>' +
        '<button type="button" class="for-dev" data-pane="use">使用</button>' +
        '<button type="button" data-pane="weights">字重</button>' +
        '<button type="button" data-pane="license">授权</button>' +
        '<button type="button" class="for-dev" data-pane="glyphs">字符</button>' +
      '</nav>' +
      '<div class="do-pane" data-pane-id="wall">' + wall(font, w0, href) + '</div>' +
      '<div class="do-pane" data-pane-id="use">' + embed(font, w0) + preview(font, w0) + '</div>' +
      '<div class="do-pane" data-pane-id="weights">' + weights(font) + '</div>' +
      '<div class="do-pane" data-pane-id="license">' + license(font).replace('<details', '<details open') + '</div>' +
      '<div class="do-pane" data-pane-id="glyphs">' + glyphs(font, w0).replace('<details', '<details open') + '</div>';
  }
  function htmlD(font, list, w0, href) {
    const brand = WFChrome.brandSlug(font);
    const n = list.filter(function (f) { return WFChrome.brandSlug(f) === brand; }).length;
    return '<section class="do-cover">' + crumb(font) +
      '<div class="do-name for-design" data-face contenteditable="true" spellcheck="false" style="' + faceStyle(font, w0) + '">' + esc(font.name) + '</div>' +
      '<div class="do-cover-dev for-dev"><h1>' + esc(font.name) + (font.en ? ' <small>' + esc(font.en) + '</small>' : '') + '</h1>' +
        '<button type="button" class="btn btn-ink" data-use>' + WFChrome.icon('code') + '获取代码</button>' + '</div>' +
      '<div class="do-cover-cap">' +
        '<a href="foundry.html?slug=' + encodeURIComponent(brand) + '">' + esc(WFChrome.brandName(font) || '') + '</a>' +
        '<span>' + WFSpecimen.sortedWeights(font).length + ' 字重 · ' + esc(WFChrome.licenseTier(font)) + '</span>' +
        '<span class="spacer"></span>' +
        '<div class="weights do-pills for-design">' + weightBtns(font, w0) + '</div>' +
        '<a class="btn-text for-design" href="' + esc(href) + '">' + WFChrome.icon('edit') + '编辑样张</a>' +
        '<button type="button" class="btn-text" data-use>' + WFChrome.icon('code') + '获取代码</button>' +
        '<button type="button" class="btn-text" data-pick data-short>' + WFChrome.icon('plus') + '选字袋</button>' +
      '</div></section>' +
      '<div class="do-pair">' +
        '<div class="for-design">' + weights(font) + '</div>' +
        '<div class="for-design"><h2>授权</h2>' + WFChrome.foundryHtml(font, { sub: '在库 ' + n + ' 款' }) +
          '<p class="do-lead" style="margin:var(--s-4) 0">' + '可免费用于网页、App、印刷与商业项目。' + '</p>' +
          license(font).replace('<details', '<details open') + '</div>' +
        '<div class="for-dev">' + embed(font, w0) + '</div>' +
        '<div class="for-dev">' + preview(font, w0) + '</div>' +
      '</div>';
  }

  function markSwitch() {
    const id = (location.hash || '#a').replace('#', '') || 'a';
    document.querySelectorAll('.do-block').forEach(function (el) { el.classList.toggle('is-on', el.id === id); });
    document.querySelectorAll('.do-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }
  function defaultPane() { return WFChrome.view() === 'dev' ? 'use' : 'wall'; }
  function showPane(root, id) {
    const next = id || defaultPane();
    root.querySelectorAll('[data-pane]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-pane') === next); });
    root.querySelectorAll('[data-pane-id]').forEach(function (p) { p.hidden = p.getAttribute('data-pane-id') !== next; });
  }

  WFProto.loadCatalog().then(function (list) {
    const font = list.filter(function (f) { return f.name === '阿里巴巴普惠体'; })[0] || list[0];
    const w0 = WFSpecimen.firstWeight(font);
    WFSpecimen.sortedWeights(font).forEach(function (w) { WFProto.ensureFontCss(font.family, WFProto.weightToCss(w)); });
    const href = 'font-detail.html?id=' + encodeURIComponent(font.id);
    document.getElementById('doBack').href = href;
    document.title = font.name + ' · 四套结构 · 文风字体';

    const paints = { a: htmlA, b: htmlB, c: htmlC, d: htmlD };
    Object.keys(paints).forEach(function (k) {
      document.querySelector('[data-mount="' + k + '"]').innerHTML = paints[k](font, list, w0, href);
    });
    const gTools = document.querySelector('#a [data-glyph-tools]');
    const gSum = document.querySelector('#a [data-glyph-summary]');
    const gBlocks = document.querySelector('#a [data-glyph-blocks]');
    if (gTools && gSum && gBlocks) WFSpecimen.mountGlyphTable(gBlocks, gSum, gTools, font);

    function syncPick() {
      const on = WFProto.hasPick(font.id);
      document.querySelectorAll('[data-pick]').forEach(function (b) {
        const short = b.hasAttribute('data-short');
        const label = on ? (short ? '已在袋中' : '已在选字袋') : (short ? '选字袋' : '加入选字袋');
        b.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + label;
      });
    }
    syncPick();

    const cRoot = document.getElementById('c');
    showPane(cRoot, defaultPane());

    if (!location.hash) history.replaceState(null, '', '#a');
    markSwitch();
    window.addEventListener('hashchange', markSwitch);
    document.addEventListener('wf:view', function () { showPane(cRoot, defaultPane()); });

    document.addEventListener('click', function (e) {
      const pick = e.target.closest('[data-pick]');
      if (pick) {
        const on = WFProto.hasPick(font.id);
        WFProto.togglePick(font.id, font.name);
        WFChrome.toast(on ? '已从选字袋移除' : '已加入选字袋');
        syncPick();
        return;
      }
      const w = e.target.closest('[data-w]');
      if (w) {
        const box = w.closest('.do-block');
        const css = w.getAttribute('data-w');
        box.querySelectorAll('[data-w]').forEach(function (x) { x.classList.toggle('is-on', x === w); });
        box.querySelectorAll('[data-face], [data-preview]').forEach(function (el) { el.style.fontWeight = css; });
        return;
      }
      const go = e.target.closest('[data-use]');
      if (go) {
        WFChrome.setView('dev');
        const box = go.closest('.do-block');
        if (box && box.querySelector('[data-pane="use"]')) showPane(box, 'use');
        const target = box && (box.querySelector('.do-embed') || box.querySelector('[data-pane-id="use"]'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const pane = e.target.closest('[data-pane]');
      if (pane) { showPane(cRoot, pane.getAttribute('data-pane')); return; }
      const copy = e.target.closest('[data-copy]');
      if (copy) {
        const pre = copy.parentNode.querySelector('pre');
        if (pre) WFChrome.copy(pre.textContent, '已复制代码');
      }
    });
    document.addEventListener('input', function (e) {
      const size = e.target.closest('[data-size]');
      if (size) {
        const box = size.closest('.do-block');
        const px = size.value + 'px';
        box.querySelectorAll('[data-size-val]').forEach(function (n) { n.textContent = px; });
        box.querySelectorAll('[data-face]').forEach(function (el) { el.style.fontSize = px; });
        return;
      }
      const t = e.target.closest('[data-preview-text]');
      if (t) {
        const box = t.closest('.do-block');
        box.querySelectorAll('[data-preview], [data-weight-line]').forEach(function (el) { el.textContent = t.value || SAMPLE; });
      }
    });
  });
})();
