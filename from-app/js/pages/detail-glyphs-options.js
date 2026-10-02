/* 字符表 + 现网分析密度四套对照。只切 hash / is-on，不改现页。 */
(function () {
  function markSwitch() {
    const id = (location.hash || '#a').replace('#', '') || 'a';
    document.querySelectorAll('.do-block').forEach(function (el) {
      el.classList.toggle('is-on', el.id === id);
    });
    document.querySelectorAll('.do-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  if (!location.hash) history.replaceState(null, '', '#a');
  markSwitch();
  window.addEventListener('hashchange', markSwitch);
})();
