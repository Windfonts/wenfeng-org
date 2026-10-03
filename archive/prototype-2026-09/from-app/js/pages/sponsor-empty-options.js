/* 赞助空态对照。四块侧栏，现网不走这里。 */
(function () {
  const esc = WFProto.escapeHtml;
  const HOST = 'https://cravatar.com/';

  function meta(font) {
    const rows = [
      { icon: 'classify', dt: '分类', dd: WFChrome.catLabel(font.category) || font.category },
      { icon: 'translate', dt: '语言', dd: (font.languages || []).map(function (l) { return l === '英语' ? '英文' : l; }).join(' · ') },
      { icon: 'calendar', dt: '发布', dd: font.releaseYear ? String(font.releaseYear) : '' },
      { icon: 'eye', dt: '浏览', dd: font.viewCount ? WFProto.formatCount(font.viewCount) : '' }
    ].filter(function (r) { return r.dd; });
    return '<div class="side-meta"><h3>' + WFChrome.icon('info') + '资料</h3><dl class="kv">' +
      rows.map(function (r) {
        return '<div><dt>' + WFChrome.icon(r.icon) + esc(r.dt) + '</dt><dd' +
          (/^[\d,.\s]+$/.test(r.dd) ? ' class="num"' : '') + '>' + esc(r.dd) + '</dd></div>';
      }).join('') + '</dl></div>';
  }

  function card(font, variant, cap) {
    const info = font.ownerInfo || font.foundryInfo || {};
    const slug = info.id || 'chilltype';
    const n = font._brandCount || '';
    const desc = font.description || '';
    const sponsor = variant === 'c' ? '' : WFSponsor.html(Object.assign({}, info, {
      kind: 'author', openSource: true, tips: { alipay: true, wechat: true }
    }), { open: true });
    const line = variant === 'c'
      ? '<p class="se-line">请<a href="' + HOST + '" target="_blank" rel="noopener noreferrer">前往上传</a>，或<a href="claim.html?slug=' +
        encodeURIComponent(slug) + '">认领主页</a>后修改。</p>'
      : '';
    return '<section class="se-slot se-' + variant + '">' +
      '<p class="se-cap"><b>' + cap.title + '</b><span>' + cap.note + '</span></p>' +
      '<aside class="detail-side"><div class="panel panel-pad side-brand">' +
        WFChrome.foundryHtml(font, { sub: '在库 ' + n + ' 款' }) +
        (desc
          ? '<details class="side-fold"><summary>' + WFChrome.icon('chevron-down') + '简介</summary><p class="desc">' + esc(desc) + '</p></details>'
          : '') +
        '<p class="claim is-quiet">' + WFChrome.icon('verified') + '未认领 · <a href="claim.html?slug=' +
          encodeURIComponent(slug) + '">认领</a></p>' +
        line +
        sponsor +
        meta(font) +
      '</div></aside></section>';
  }

  WFProto.loadCatalog().then(function (list) {
    const font = list.filter(function (f) { return WFChrome.brandSlug(f) === 'chilltype'; })[0] || list[0];
    font._brandCount = list.filter(function (f) { return WFChrome.brandSlug(f) === WFChrome.brandSlug(font); }).length;
    const root = document.getElementById('grid');
    root.innerHTML = [
      card(font, 'a', { title: '甲 · 现状', note: '灰框加礼物。现在线上就是这样。' }),
      card(font, 'b', { title: '乙 · 只留一句', note: '按钮还在。灰框拿掉，下面只留小字。' }),
      card(font, 'c', { title: '丙 · 并进认领', note: '不设按钮。这句话接在「未认领」下面。' }),
      card(font, 'd', { title: '丁 · 白底说明', note: '还是按钮。文案写进一块白底，不再是方洞。' })
    ].join('');
    WFSponsor.bind(root);
  });
})();
