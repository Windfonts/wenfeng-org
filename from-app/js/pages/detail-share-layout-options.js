/* 完成后的样张首屏：四种布局。不进正式站，不改现页缩放。 */
(function () {
  const esc = WFProto.escapeHtml;
  const FONT_ID = 'd95788bf-bd0b-448f-b4a1-5d23a19992d0';
  const SIZES = {
    narrow: { w: 1080, h: 1440, label: '窄幅' },
    og: { w: 1200, h: 630, label: '分享图' },
    banner: { w: 1600, h: 500, label: '横幅' }
  };
  const COPY = {
    a: ['甲 · 通栏', '和现在一样。卡按导出像素铺满版心，窄幅会把首屏拉高。'],
    b: ['乙 · 封顶', '最高 560。卡在灰墙里居中，灰墙仍是整页宽。'],
    c: ['丙 · 并排', '卡在左，字体名和按钮在右。名字不用等卡滚完。'],
    d: ['丁 · 小样', '卡缩成一张小图，标题贴在下面，字重马上出现。']
  };
  const HERO = '行到水穷处，坐看云起时';
  const SUB = '—— 某设计师';

  function parse() {
    const h = (location.hash || '#a-narrow').slice(1).split('-');
    const v = COPY[h[0]] ? h[0] : 'a';
    const f = SIZES[h[1]] ? h[1] : 'narrow';
    return { v: v, f: f };
  }

  function titleHtml(font) {
    const brand = WFChrome.brandName(font);
    const avatar = WFChrome.brandAvatar(font);
    const n = WFSpecimen.sortedWeights(font).length;
    const en = font.en && font.en !== font.name ? ' <small>' + esc(font.en) + '</small>' : '';
    return '<div class="detail-title">' +
      '<div>' +
        '<h1>' + esc(font.name) + en + '</h1>' +
        '<p class="dotlist">' +
          '<a class="foundry-inline" href="foundry.html?slug=' + encodeURIComponent(WFChrome.brandSlug(font)) + '">' +
            (avatar ? '<img src="' + esc(avatar) + '" alt="" />' : '') + esc(brand || '未署名') +
            (WFChrome.brandVerified(font) ? WFChrome.VERIFIED_SVG : '') + '</a>' +
          '<span>' + n + ' 字重</span>' +
          '<span>' + esc(WFChrome.licenseTier(font)) + '</span>' +
        '</p>' +
      '</div>' +
      '<div class="detail-actions">' +
        '<button type="button" class="btn ink-design">' + WFChrome.icon('plus') + '加入选字袋</button>' +
        '<button type="button" class="btn ink-dev">' + WFChrome.icon('code') + '获取代码</button>' +
      '</div>' +
    '</div>';
  }

  function cardHtml(font, face) {
    const bg = WFChrome.href('assets/wall/05.jpg');
    return '<div class="card-view is-framed" data-sl-view>' +
      '<div class="wall-stage" data-sl-stage data-card="og" data-template="poem" data-layout="center" data-slots="sub bg" data-has-sub data-has-bg style="--card-face:' + esc(face) + ';--card-paper:#f6f6f6;--scrim:42%;color:#111111;background:#f6f6f6">' +
        '<img class="card-bg" alt="" src="' + esc(bg) + '" />' +
        '<div class="card-scrim"></div>' +
        '<div class="card-body"><div class="wall" style="font-family:' + esc(face) + ';font-weight:400;font-size:72px;line-height:1.28;text-align:center">' + esc(HERO) + '</div></div>' +
        '<footer class="card-meta"><div class="card-lines">' +
          '<span class="card-sub" style="font-family:' + esc(face) + '">' + esc(SUB) + '</span>' +
          '<span class="card-credit"><span class="card-name">' + esc(font.name) + '</span>' +
          '<span class="card-brand">' + esc(WFChrome.brandName(font)) + '</span><span class="card-mark">文风</span></span>' +
        '</div></footer>' +
      '</div></div>';
  }

  function toolsHtml() {
    return '<div class="wall-tools">' +
      '<input class="range" type="range" min="24" max="240" value="72" aria-label="字号" tabindex="-1" />' +
      '<span class="val">72px</span>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn-text">' + WFChrome.icon('link') + '复制链接</button>' +
      '<button type="button" class="btn-text">' + WFChrome.icon('edit') + '编辑样张</button>' +
    '</div>';
  }

  function render() {
    const list = WFProto.getCatalogList();
    const font = list.filter(function (f) { return f.id === FONT_ID; })[0] || list[0];
    if (!font) return;
    const st = parse();
    const w0 = WFSpecimen.firstWeight(font);
    WFProto.ensureFontCss(font.family, w0);
    const face = WFProto.cssFamilyStack(font.family);
    const copy = COPY[st.v];
    const cat = font.category ? (WFChrome.catLabel(font.category) || font.category) : '';
    document.querySelector('[data-sl-meta]').innerHTML =
      '<b>' + esc(copy[0]) + '</b><span>' + esc(copy[1]) + '</span><span data-px></span>';
    const aside = st.v === 'c' ? titleHtml(font) : '';
    const below = st.v === 'c' ? '' :
      '<div class="container">' + titleHtml(font) + '</div>';
    const weights = WFSpecimen.sortedWeights(font).slice(0, 4).join(' · ');
    document.querySelector('[data-mount]').innerHTML =
      '<section class="glyph-wall sl-' + st.v + '">' +
        '<div class="container detail-crumb"><p class="crumb">' +
          '<a href="fonts.html">字体库</a>' +
          (cat ? '<span>/</span><a href="fonts.html?cat=' + encodeURIComponent(font.category) + '">' + esc(cat) + '</a>' : '') +
          '<span>/</span><span>' + esc(font.name) + '</span></p></div>' +
        '<div class="container glyph-wall-inner">' + cardHtml(font, face) + aside + toolsHtml() + '</div>' +
        below +
      '</section>' +
      '<div class="container sl-next"><div class="detail-body"><div class="detail-main">' +
        '<section class="panel"><div class="panel-head"><h2>' + WFChrome.icon('font') + '字重</h2></div>' +
        '<div class="panel-pad"><p class="sl-line" style="font-family:' + esc(face) + ';font-weight:' + w0 + '">' + esc(weights) + '</p></div>' +
      '</section></div></div></div>';
    document.querySelectorAll('.seg-glyph a').forEach(function (a) {
      const part = a.parentNode.getAttribute('data-part');
      const on = part === 'v' ? a.getAttribute('data-id') === st.v : a.getAttribute('data-id') === st.f;
      a.classList.toggle('is-on', on);
      a.href = part === 'v' ? '#' + a.getAttribute('data-id') + '-' + st.f : '#' + st.v + '-' + a.getAttribute('data-id');
    });
    const back = document.getElementById('doBack');
    if (back) back.href = 'font-detail.html?id=' + encodeURIComponent(font.id);
    place();
  }

  function place() {
    const view = document.querySelector('[data-sl-view]');
    const stage = document.querySelector('[data-sl-stage]');
    const inner = view && view.closest('.glyph-wall-inner');
    if (!view || !stage || !inner) return;
    const st = parse();
    const sz = SIZES[st.f];
    const cs = getComputedStyle(inner);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const maxW = inner.clientWidth - pad;
    if (maxW < 80) { requestAnimationFrame(place); return; }
    stage.setAttribute('data-card', st.f);
    stage.style.width = sz.w + 'px';
    stage.style.height = sz.h + 'px';
    let scale;
    let boxW;
    if (st.v === 'a') {
      scale = maxW / sz.w;
      boxW = maxW;
      view.style.width = '100%';
    } else if (st.v === 'b') {
      scale = Math.min(maxW / sz.w, 560 / sz.h);
      boxW = sz.w * scale;
      view.style.width = boxW + 'px';
    } else if (st.v === 'c') {
      const col = maxW < 760 ? maxW : Math.min(maxW * 0.58, 680);
      const cap = maxW < 760 ? 420 : 520;
      scale = Math.min(col / sz.w, cap / sz.h);
      boxW = sz.w * scale;
      view.style.width = boxW + 'px';
    } else {
      const col = Math.min(maxW * 0.46, 520);
      scale = Math.min(col / sz.w, 360 / sz.h);
      boxW = sz.w * scale;
      view.style.width = boxW + 'px';
    }
    const boxH = Math.max(1, Math.round(sz.h * scale));
    stage.style.setProperty('--card-scale', String(scale));
    view.style.height = boxH + 'px';
    const px = document.querySelector('[data-px]');
    if (px) px.textContent = '页上 ' + Math.round(boxW) + '×' + boxH + ' · 导出 ' + sz.w + '×' + sz.h;
  }

  WFProto.loadCatalog().then(function () {
    if (!location.hash) history.replaceState(null, '', '#a-narrow');
    render();
    window.addEventListener('hashchange', function () { render(); window.scrollTo(0, 0); });
    window.addEventListener('resize', place);
    document.querySelectorAll('.do-switch [data-part] a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const s = parse();
        s[a.parentNode.getAttribute('data-part')] = a.getAttribute('data-id');
        location.hash = s.v + '-' + s.f;
      });
    });
  });
})();
