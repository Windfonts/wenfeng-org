/* 收藏按钮对照。不写入真正的收藏。 */
(function () {
  const esc = WFProto.escapeHtml;

  function star(kind, on) {
    const pressed = on ? ' is-on' : '';
    if (kind === 'chip') {
      return '<button type="button" class="fav' + pressed + '" data-kind="icon" aria-label="收藏">' +
        WFChrome.icon(on ? 'star-fill' : 'star') + '</button>';
    }
    if (kind === 'inline') {
      return '<button type="button" class="fv-inline' + pressed + '" data-kind="icon" aria-label="收藏">' +
        WFChrome.icon(on ? 'star-fill' : 'star') + '</button>';
    }
    if (kind === 'pill') {
      return '<button type="button" class="act fv-pill' + pressed + '" data-kind="pill">' +
        WFChrome.icon('star') + '收藏</button>';
    }
    return '<button type="button" class="fv-text" data-kind="text">收藏</button>';
  }

  function row(font, variant) {
    const name = font.name;
    const meta = esc(WFChrome.brandName(font) || '未署名') + ' · ' +
      ((font.weights && font.weights.length) || 1) + ' 字重 · ' + esc(WFChrome.licenseTier(font));
    const nameHtml = variant === 'b'
      ? '<span class="fv-name"><a class="name">' + esc(name) + '</a>' + star('inline') + '</span>'
      : '<a class="name">' + esc(name) + '</a>';
    const metaHtml = variant === 'd'
      ? '<span class="meta">' + meta + ' · ' + star('text') + '</span>'
      : '<span class="meta">' + meta + '</span>';
    let acts = '<button type="button" class="act">' + WFChrome.icon('plus') + '加入选字袋</button>';
    if (variant === 'a') acts = '<div class="specimen-acts">' + star('chip') + acts + '</div>';
    else if (variant === 'c') acts = '<div class="specimen-acts">' + star('pill') + acts + '</div>';
    return '<ul class="specimens"><li class="specimen">' +
      '<div class="head">' + nameHtml + metaHtml + '</div>' +
      acts +
      '<a class="preview">行到水穷处，坐看云起时</a>' +
    '</li></ul>';
  }

  function title(font, variant) {
    const h1 = variant === 'b'
      ? '<h1><span>' + esc(font.name) + '</span>' + star('inline') +
        (font.en ? '<small>' + esc(font.en) + '</small>' : '') + '</h1>'
      : '<h1>' + esc(font.name) + (font.en ? ' <small>' + esc(font.en) + '</small>' : '') + '</h1>';
    const bits = esc(WFChrome.brandName(font)) + ' · ' +
      ((font.weights && font.weights.length) || 1) + ' 字重 · ' + esc(WFChrome.licenseTier(font));
    const sub = variant === 'd'
      ? '<p class="dotlist">' + bits + ' · ' + star('text') + '</p>'
      : '<p class="dotlist">' + bits + '</p>';
    let actions = '<button type="button" class="btn ink-design">' + WFChrome.icon('plus') + '加入选字袋</button>' +
      '<button type="button" class="btn">' + WFChrome.icon('code') + '获取代码</button>';
    if (variant === 'a') actions = star('chip') + actions;
    else if (variant === 'c') {
      actions = '<button type="button" class="btn fv-pill" data-kind="pill">' + WFChrome.icon('star') + '收藏</button>' + actions;
    }
    return '<div class="detail-title"><div class="detail-title-main">' + h1 + sub + '</div>' +
      '<div class="detail-actions">' + actions + '</div></div>';
  }

  function side(font, variant) {
    const slug = WFChrome.brandSlug(font);
    const name = WFChrome.brandName(font);
    let who = WFChrome.foundryHtml(font, { sub: '在库 5 款' });
    if (variant === 'a') who = '<div class="who-row">' + who + star('chip') + '</div>';
    else if (variant === 'b') who = '<div class="who-row">' + who + star('inline') + '</div>';
    const extra = variant === 'c'
      ? '<p class="claim is-quiet">' + star('pill') + '</p>'
      : (variant === 'd' ? '<p class="claim is-quiet">' + star('text') + '</p>' : '');
    return '<aside class="detail-side"><div class="panel panel-pad side-brand">' +
      who + extra +
      '<p class="claim is-quiet">' + WFChrome.icon('verified') + '未认领 · <a href="claim.html?slug=' +
        encodeURIComponent(slug) + '">认领</a></p>' +
      '<p class="brand-desc">' + esc(name) + '。侧栏只示意收藏的位置。</p>' +
    '</div></aside>';
  }

  function col(font, id, cap) {
    return '<section class="fv-col fv-' + id + '">' +
      '<p class="fv-cap"><b>' + cap.title + '</b><span>' + cap.note + '</span></p>' +
      '<p class="fv-label">字库</p>' + row(font, id) +
      '<p class="fv-label">详情</p>' + title(font, id) +
      '<p class="fv-label">作者</p>' + side(font, id) +
    '</section>';
  }

  function paint(btn, on) {
    const kind = btn.getAttribute('data-kind');
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (kind === 'icon') btn.innerHTML = WFChrome.icon(on ? 'star-fill' : 'star');
    else if (kind === 'pill') {
      btn.classList.toggle('is-picked', on);
      btn.innerHTML = WFChrome.icon(on ? 'star-fill' : 'star') + (on ? '已收藏' : '收藏');
    } else btn.textContent = on ? '已收藏' : '收藏';
  }

  WFProto.loadCatalog().then(function (list) {
    const font = list.filter(function (f) { return f.name === '阿里巴巴普惠体'; })[0] || list[0];
    document.getElementById('grid').innerHTML = [
      col(font, 'a', { title: '甲 · 现状', note: '灰圆钮或一颗空心星，和胶囊挤在一起。' }),
      col(font, 'b', { title: '乙 · 跟名字', note: '星贴在名字后面。动作区只留选字袋。' }),
      col(font, 'c', { title: '丙 · 同款胶囊', note: '收藏和加入选字袋同一款按钮。' }),
      col(font, 'd', { title: '丁 · 只留小字', note: '写在资料那一行，不再单独做按钮。' })
    ].join('');
    document.getElementById('grid').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-kind]');
      if (!btn) return;
      e.preventDefault();
      paint(btn, !btn.classList.contains('is-on'));
    });
  });
})();
