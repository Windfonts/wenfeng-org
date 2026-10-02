/* 现网对照密度 v2。只切 hash / 模拟一击加载，不改现页。 */
(function () {
  var VALID = { bad: 1, wu: 1, ji: 1 };

  function markSwitch() {
    var id = (location.hash || '#wu').replace('#', '') || 'wu';
    if (!VALID[id]) id = 'wu';
    document.querySelectorAll('.do-block').forEach(function (el) {
      el.classList.toggle('is-on', el.id === id);
    });
    document.querySelectorAll('.do-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
  }

  function bindTriggers() {
    document.querySelectorAll('[data-dgv2-variant]').forEach(function (panel) {
      var btn = panel.querySelector('[data-dgv2-trigger]');
      if (!btn) return;
      btn.addEventListener('click', function () {
        panel.setAttribute('data-state', 'loaded');
        btn.setAttribute('aria-pressed', 'true');
      });
    });
  }

  if (!location.hash || !VALID[location.hash.replace('#', '')]) {
    history.replaceState(null, '', '#wu');
  }
  markSwitch();
  bindTriggers();
  window.addEventListener('hashchange', markSwitch);
})();
