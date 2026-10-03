/* 首页收尾对照：四套只切换显示，不改现首页。 */
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

  WFProto.loadCatalog().then(function (list) {
    const n = WFProto.formatCount(list.length);
    document.querySelectorAll('[data-lib-count]').forEach(function (el) {
      el.textContent = n + ' 款';
    });
    document.querySelectorAll('[data-num]').forEach(function (el) {
      el.textContent = n;
    });
  });
})();
