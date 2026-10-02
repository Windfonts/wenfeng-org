(function () {
  var root = document.documentElement;
  var themeBtn = document.querySelector('[data-theme-toggle]');
  function paintTheme() {
    var dark = root.getAttribute('data-theme') === 'dark';
    if (themeBtn) themeBtn.setAttribute('aria-label', dark ? '切换到浅色' : '切换到深色');
  }
  paintTheme();
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      if (dark) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('wf-theme', dark ? 'light' : 'dark'); } catch (e) {}
      paintTheme();
    });
  }
  var menuBtn = document.querySelector('[data-menu]');
  var menu = document.querySelector('.topmenu');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      var open = menu.hasAttribute('hidden');
      if (open) menu.removeAttribute('hidden');
      else menu.setAttribute('hidden', '');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var heroFaces = [
    { norm: 'Xwwk', name: '文风·霞鹜文楷' },
    { norm: 'Syhtsc', name: '文风·思源黑体' },
    { norm: 'Systsc', name: '文风·思源宋体' },
    { norm: 'Arkp', name: '文风·方舟像素' },
    { norm: 'Xwxzsplus', name: '文风·霞鹜新致宋 Plus' },
    { norm: 'XiaolaiSC', name: '文风·小赖字体 SC' },
    { norm: 'Yozai', name: '文风·悠哉字体' },
    { norm: 'Jnmy', name: '文风·荆南麦圆' }
  ];
  var nextBtn = document.querySelector('[data-face-next]');
  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      var live = document.querySelector('[data-hero-live]');
      if (!live) return;
      var cur = live.getAttribute('data-face-norm');
      var idx = 0;
      for (var i = 0; i < heroFaces.length; i++) if (heroFaces[i].norm === cur) idx = i;
      var next = heroFaces[(idx + 1) % heroFaces.length];
      live.className = 'live t-' + next.norm;
      live.setAttribute('data-face-norm', next.norm);
      var nameA = document.querySelector('.live-caption .now');
      if (nameA) {
        nameA.textContent = next.name;
        nameA.setAttribute('href', '/source/' + next.norm + '/');
      }
      var takeBtn = document.querySelector('[data-hero-take]');
      if (takeBtn) {
        takeBtn.setAttribute('href', '/source/' + next.norm + '/');
        takeBtn.textContent = '拿走' + next.name;
      }
      var attestBtn = document.querySelector('[data-hero-attest]');
      if (attestBtn) attestBtn.setAttribute('href', '/attest/' + next.norm + '/');
    });
  }
})();
