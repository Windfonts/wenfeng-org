/* 底部浅字对照。四套只切换显示。 */
(function () {
  const blocks = document.querySelectorAll('.hc-block');
  const links = document.querySelectorAll('.hc-switch .seg-glyph a');

  function show(id) {
    let found = false;
    blocks.forEach(function (el) {
      const on = el.id === id;
      el.classList.toggle('is-on', on);
      if (on) found = true;
    });
    if (!found) return;
    links.forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  function fromHash() {
    const id = (location.hash || '#a').replace('#', '');
    show(document.getElementById(id) ? id : 'a');
  }

  window.addEventListener('hashchange', fromHash);
  fromHash();

  const family = 'wenfeng-albbpht';
  WFProto.ensureFontCss(family, '800').then(function () {
    const stack = WFProto.cssFamilyStack(family);
    document.querySelectorAll('.hm-bg').forEach(function (el) {
      el.style.fontFamily = stack;
      el.style.fontWeight = '800';
    });
  });

  WFProto.loadCatalog().then(function (list) {
    const n = WFProto.formatCount(list.length);
    document.querySelectorAll('[data-num]').forEach(function (el) {
      el.textContent = n;
    });
  });
})();
