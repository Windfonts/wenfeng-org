/* 赞助作者对照。现网用同一套 WFSponsor。 */
(function () {
  const esc = WFProto.escapeHtml;

  function hero(font, extra) {
    const info = font.ownerInfo || font.foundryInfo;
    return '<div class="foundry-hero sp-hero">' +
      '<div class="foundry-hero-main">' +
        WFChrome.foundryHtml(font, { sub: '未认领 · 归属 6 款' }) +
        '<p class="desc">' + esc((info && info.description) ||
          '开源中文字体作者。本页只演示赞助入口，字体列表是示意。') + '</p>' +
        extra +
      '</div>' +
      '<div>' +
        '<dl class="kv">' +
          '<div><dt>' + WFChrome.icon('building') + '类型</dt><dd>开源作者</dd></div>' +
          '<div><dt>' + WFChrome.icon('font') + '归属</dt><dd>6</dd></div>' +
          '<div><dt>' + WFChrome.icon('globe') + '官网</dt><dd>github.com/lxgw</dd></div>' +
        '</dl>' +
        '<p class="claim" style="margin-top:var(--s-5)">' + WFChrome.icon('idcard') +
          '<span>这是你的品牌？<a href="claim.html?slug=lxgw">认领此页</a>。</span></p>' +
      '</div></div>' +
      '<p class="sp-fake-list">下面原本是归属字体列表，对照里略去。</p>';
  }

  function mountAuthor(el, font, tips) {
    const info = Object.assign({}, font.ownerInfo || font.foundryInfo || {}, {
      kind: 'author', openSource: true, tips: tips
    });
    el.innerHTML = hero(font, WFSponsor.html(info, { open: true, demo: true }));
    WFSponsor.bind(el);
  }

  function mountSide(el, font, tips) {
    const info = Object.assign({}, font.ownerInfo || font.foundryInfo || {}, {
      kind: 'author', openSource: true, tips: tips
    });
    el.innerHTML =
      '<div class="sp-detail">' +
        '<p class="sp-detail-main">行到水穷处，<br>坐看云起时</p>' +
        '<aside class="detail-side">' +
          '<div class="panel panel-pad side-brand">' +
            WFChrome.foundryHtml(font, { sub: '在库 6 款' }) +
            '<p class="brand-desc">开源中文字体作者。侧栏同一颗按钮，有几码出几码。</p>' +
            '<p class="claim is-quiet">' + WFChrome.icon('verified') + '未认领 · <a href="claim.html?slug=lxgw">认领</a></p>' +
            WFSponsor.html(info, { open: true, demo: true }) +
            '<div class="side-meta"><h3>' + WFChrome.icon('info') + '资料</h3>' +
              '<dl class="kv"><div><dt>授权</dt><dd>免费商用</dd></div>' +
              '<div><dt>字重</dt><dd>1</dd></div></dl></div>' +
          '</div></aside></div>';
    WFSponsor.bind(el);
  }

  function markNav() {
    const id = (location.hash || '#a').slice(1);
    document.querySelectorAll('.sp-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  WFProto.loadCatalog().then(function (list) {
    const font = list.filter(function (f) { return WFChrome.brandSlug(f) === 'lxgw'; })[0] || list[0];
    mountAuthor(document.querySelector('[data-mount="a"]'), font, { alipay: true, wechat: true });
    mountAuthor(document.querySelector('[data-mount="b"]'), font, { wechat: true });
    mountSide(document.querySelector('[data-mount="c"]'), font, { alipay: true, wechat: true });
    mountSide(document.querySelector('[data-mount="d"]'), font, { alipay: true });
    markNav();
    window.addEventListener('hashchange', markNav);
  });
})();
