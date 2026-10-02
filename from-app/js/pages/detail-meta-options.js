/* 详情标题 / 资料 / 预览四套对照。用真实字体和现页样式，不改现页。 */
(function () {
  const esc = WFProto.escapeHtml;
  const SAMPLE = '行到水穷处，坐看云起时';

  function crumb(font) {
    return '<p class="crumb"><a href="fonts.html">字体库</a><span>/</span>' +
      (font.category ? '<a href="fonts.html?cat=' + encodeURIComponent(font.category) + '">' + esc(font.category) + '</a><span>/</span>' : '') +
      '<span>' + esc(font.name) + '</span></p>';
  }

  function kvRows(font, weights, dropDup) {
    const maker = WFChrome.makerInfo(font);
    return [
      maker ? ['制作方', '<a href="foundry.html?slug=' + encodeURIComponent(maker.id) + '">' + esc(maker.name) + '</a>', true] : null,
      dropDup ? null : ['字重', String(weights.length)],
      dropDup ? null : ['字符数', font.charCount ? WFProto.formatCount(font.charCount) : ''],
      ['分类', font.category],
      ['语言', (font.languages || []).join(' · ')],
      ['发布', font.releaseYear ? String(font.releaseYear) : ''],
      ['浏览', font.viewCount ? WFProto.formatCount(font.viewCount) : ''],
      ['版本', font.version, false, true],
      ['字形数', font.glyphCount ? WFProto.formatCount(font.glyphCount) : '', false, true]
    ].filter(function (r) { return r && r[1]; });
  }

  function kvHtml(rows) {
    return '<dl class="kv">' + rows.map(function (r) {
      const html = !!r[2];
      return '<div' + (r[3] ? ' class="for-dev"' : '') + '><dt>' + esc(r[0]) + '</dt><dd' +
        (!html && /^[\d,.\s]+$/.test(r[1]) ? ' class="num"' : '') + '>' +
        (html ? r[1] : esc(r[1])) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function titleHtml(font, weights, slim) {
    const brand = WFChrome.brandName(font);
    const avatar = WFChrome.brandAvatar(font);
    let dots = '<a class="foundry-inline" href="foundry.html?slug=' + encodeURIComponent(WFChrome.brandSlug(font)) + '">' +
      (avatar ? '<img src="' + esc(avatar) + '" alt="" />' : '') + esc(brand || '未署名') +
      (WFChrome.brandVerified(font) ? WFChrome.VERIFIED_SVG : '') + '</a>';
    if (!slim) dots += '<span>' + weights.length + ' 字重</span>';
    dots += '<span>' + esc(WFChrome.licenseTier(font)) + '</span>';
    if (!slim && font.charCount) dots += '<span>' + WFProto.formatCount(font.charCount) + ' 字</span>';
    if (!slim && font.version) dots += '<span class="for-dev">v' + esc(String(font.version).replace(/^v/i, '')) + '</span>';
    return '<div class="detail-title">' +
      '<div class="detail-title-main">' +
        '<h1>' + esc(font.name) + (font.en ? ' <small>' + esc(font.en) + '</small>' : '') + '</h1>' +
        '<p class="dotlist">' + dots + '</p></div>' +
      '<div class="detail-actions">' +
        '<button type="button" class="btn ink-design" data-pick>' + WFChrome.icon('plus') + '加入选字袋</button>' +
        '<button type="button" class="btn btn-ink" data-use>' + WFChrome.icon('code') + '获取代码</button>' +
      '</div></div>';
  }

  function wallHtml(font, w0, href) {
    const stack = WFProto.cssFamilyStack(font.family);
    const weights = WFSpecimen.sortedWeights(font);
    return '<section class="glyph-wall for-design"><div class="container glyph-wall-inner">' +
      '<div class="wall" data-face contenteditable="true" spellcheck="false" data-placeholder="输入文字" style="font-family:' +
        esc(stack) + ';font-weight:' + w0 + '">' + esc(SAMPLE) + '</div>' +
      '<div class="wall-tools">' +
        '<input class="range" type="range" min="24" max="240" value="64" data-size aria-label="字号" />' +
        '<span class="val" data-size-val>64px</span>' +
        (weights.length > 1
          ? '<div class="weights" role="group" aria-label="字重">' + weights.map(function (w) {
              const c = WFProto.weightToCss(w);
              return '<button type="button" data-w="' + c + '"' + (c === w0 ? ' class="is-on"' : '') + '>' +
                esc(w) + '<span class="for-dev"> ' + c + '</span></button>';
            }).join('') + '</div>'
          : '') +
        '<span class="spacer"></span>' +
        '<a class="btn-text" href="' + esc(href) + '">' + WFChrome.icon('edit') + '编辑样张</a>' +
      '</div></div></section>';
  }

  function useHtml(font) {
    const fam = WFEmbed.familyName(font.family);
    return '<section class="panel for-dev" data-use-sec><div class="panel-head"><h2>使用</h2></div>' +
      '<div class="panel-pad"><p class="use-note">对照稿不装完整嵌入器。切到开发后从这里往下看。' +
        '<code>font-family</code> 以 <code>' + esc(fam) + '</code> 为准。</p></div></section>';
  }

  function previewHtml(font, w0) {
    const stack = WFProto.cssFamilyStack(font.family);
    return '<section class="panel for-dev" data-preview-sec><div class="panel-head"><h2>预览</h2>' +
      '<input class="input" data-preview-text value="' + esc(SAMPLE) + '" aria-label="预览文字" style="max-width:20rem" /></div>' +
      '<div class="panel-pad"><div class="big-preview" data-preview style="font-family:' +
        esc(stack) + ';font-weight:' + w0 + '">' + esc(SAMPLE) + '</div></div></section>';
  }

  function weightsHtml(font, w0) {
    const weights = WFSpecimen.sortedWeights(font);
    if (weights.length < 2) return '';
    return '<section class="panel"><div class="panel-head"><h2>字重</h2></div>' +
      '<div class="panel-pad weights-sheet">' + WFSpecimen.weightsSheetHtml(font, SAMPLE, w0) + '</div></section>';
  }

  function licenseHtml(font) {
    const tier = WFChrome.licenseTier(font);
    return '<section class="panel"><div class="panel-head"><h2>授权</h2>' +
      '<div class="license-head"><span class="tier">' + esc(tier) + '</span>' +
        (font.licenseName ? '<span class="name">' + esc(font.licenseName) + '</span>' : '') +
      '</div></div>' +
      '<div class="panel-pad">' +
        '<p class="license-lead">可免费用于网页、App、印刷与商业项目。</p>' +
        '<div class="license-grid">' +
          '<div><h3>可以</h3><ul class="ok"><li>商业项目与网页嵌入</li><li>品牌、电商、海报、界面</li></ul></div>' +
          '<div><h3>不可以</h3><ul class="no"><li>修改后再分发</li><li>单独售卖字体文件</li></ul></div>' +
        '</div></div></section>';
  }

  function brandDesc(font) {
    const entry = WFChrome.brandInfo(font) || {};
    return (entry.description ||
      ((font.brand && font.brand.description && !/出品的字体$/.test(font.brand.description)) ? font.brand.description : '')
    ).split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean)[0] || '';
  }

  function sideHtml(font, list, rows, merge) {
    const brand = WFChrome.brandName(font);
    const brandCount = list.filter(function (f) { return WFChrome.brandSlug(f) === WFChrome.brandSlug(font); }).length;
    const desc = brandDesc(font);
    const claim = WFChrome.brandVerified(font)
      ? '<p class="claim"><span class="badge-verified">' + WFChrome.VERIFIED_SVG + '</span> 已认领</p>'
      : '<p class="claim is-quiet">未认领 · <a href="' + (WFChrome.brandSlug(font) ? 'claim.html?slug=' + encodeURIComponent(WFChrome.brandSlug(font)) : 'claim.html') + '">认领</a></p>';
    const tags = '<div class="panel panel-pad"><h3>标签</h3><div class="chips">' +
      (font.tags || []).concat(font.useCases || []).slice(0, 8).map(function (t) {
        return '<a class="chip" href="fonts.html?tag=' + encodeURIComponent(t) + '">' + esc(t) + '</a>';
      }).join('') + '</div></div>';
    const meta = kvHtml(rows);
    const brandCard = '<div class="panel panel-pad side-brand">' +
      WFChrome.foundryHtml(font, { sub: '在库 ' + brandCount + ' 款' }) +
      (desc ? '<p class="brand-desc">' + esc(desc) + '</p>' : '') +
      claim +
      (merge ? '<div class="side-meta"><h3>资料</h3>' + meta + '</div>' : '') +
      '</div>';
    const infoCard = merge ? '' : '<div class="panel panel-pad"><h3>资料</h3>' + meta + '</div>';
    return '<aside class="detail-side" aria-label="字体资料">' + brandCard + infoCard + tags + '</aside>';
  }

  function paint(font, list, opt) {
    const weights = WFSpecimen.sortedWeights(font);
    const w0 = WFSpecimen.firstWeight(font);
    const href = 'font-detail.html?id=' + encodeURIComponent(font.id);
    const rows = kvRows(font, weights, opt.dropDup);
    return '<div class="container detail-crumb">' + crumb(font) + '</div>' +
      wallHtml(font, w0, href) +
      '<div class="container">' +
        titleHtml(font, weights, opt.slim) +
        '<div class="detail-body">' +
          '<div class="detail-main">' +
            useHtml(font) +
            (opt.preview ? previewHtml(font, w0) : '') +
            weightsHtml(font, w0) +
            licenseHtml(font) +
          '</div>' +
          sideHtml(font, list, rows, opt.merge) +
        '</div></div>';
  }

  function markSwitch() {
    const id = (location.hash || '#a').replace('#', '') || 'a';
    document.querySelectorAll('.do-block').forEach(function (el) { el.classList.toggle('is-on', el.id === id); });
    document.querySelectorAll('.do-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  WFProto.loadCatalog().then(function (list) {
    const font = list.filter(function (f) { return f.name === '阿里巴巴普惠体'; })[0] || list[0];
    WFSpecimen.sortedWeights(font).forEach(function (w) { WFProto.ensureFontCss(font.family, WFProto.weightToCss(w)); });
    document.getElementById('doBack').href = 'font-detail.html?id=' + encodeURIComponent(font.id);
    document.title = font.name + ' · 标题与资料 · 文风字体';

    const opts = {
      a: { slim: false, dropDup: true, merge: false, preview: false },
      b: { slim: true, dropDup: false, merge: false, preview: false },
      c: { slim: false, dropDup: true, merge: true, preview: false },
      d: { slim: false, dropDup: false, merge: false, preview: true }
    };
    Object.keys(opts).forEach(function (k) {
      document.querySelector('[data-mount="' + k + '"]').innerHTML = paint(font, list, opts[k]);
    });

    function syncPick() {
      const on = WFProto.hasPick(font.id);
      document.querySelectorAll('[data-pick]').forEach(function (b) {
        b.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + (on ? '已在选字袋' : '加入选字袋');
      });
    }
    syncPick();

    if (!location.hash) history.replaceState(null, '', '#a');
    markSwitch();
    window.addEventListener('hashchange', markSwitch);

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
        box.querySelectorAll('[data-face], [data-preview], [data-weight-line]').forEach(function (el) {
          el.style.fontWeight = css;
        });
        return;
      }
      const go = e.target.closest('[data-use]');
      if (go) {
        WFChrome.setView('dev');
        const box = go.closest('.do-block');
        const target = box && box.querySelector('[data-use-sec]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        const v = t.value || SAMPLE;
        box.querySelectorAll('[data-preview], [data-weight-line]').forEach(function (el) { el.textContent = v; });
      }
    });
  });
})();
