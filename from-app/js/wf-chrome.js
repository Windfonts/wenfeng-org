/* 文风字体 v4 · 站点外壳：顶栏 / 页脚 / 提示条 / 登录态。依赖 wf-proto.js */
(function () {
  const USER_KEY = 'wf-app-user';

  function rootUrl() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || '';
      if (src.indexOf('wf-chrome.js') !== -1) return new URL('../', src).href;
    }
    return './';
  }
  const ROOT = rootUrl();
  function onAppHost() {
    const h = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
    return h === 'app.windfonts.com' || h === 'staging-app.windfonts.com';
  }
  /* 公网走 livePagePath（/fonts、/foundry/{slug}）；本机 16016 无重写，仍用 .html。
     控制台页里的相对 project.html 要留在 /app/，不能落到站点根 /project。
     站点页（login/index/fonts…）即使从 /app/ 点出去也不加 app/ 前缀。 */
  const SITE_HTML = /^(index|login|fonts|font-detail|foundry|docs|about|shopping-bag|bag|claim|features|lineage|faq|license|licenses|license-query|pricing|404|privacy|terms|disclaimer|trademark|upload-terms|yong-wall)\.html(\?|#|$)/i;
  function href(path) {
    path = String(path == null ? '' : path);
    const pathname = String((typeof location !== 'undefined' && location.pathname) || '');
    const rel = path.replace(/^\.\//, '');
    if (/^\/app(\/|$)/.test(pathname) &&
        /\.html(\?|#|$)/i.test(rel) &&
        !SITE_HTML.test(rel) &&
        !/^(https?:|\/\/|\/|#|app\/|\.\.\/)/i.test(path)) {
      path = 'app/' + rel;
    }
    if (onAppHost() && window.WFProto && typeof WFProto.livePagePath === 'function') {
      const live = WFProto.livePagePath(path);
      if (live === '/' || live === '') return ROOT;
      if (!live || live.charAt(0) === '#' || /^https?:/i.test(live) || live.indexOf('//') === 0) return live;
      return ROOT + String(live).replace(/^\//, '');
    }
    return ROOT + path;
  }
  function esc(s) { return WFProto.escapeHtml(s); }

  function user() {
    try {
      const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      if (!u || typeof u !== 'object') return null;
      if (!String(u.email || '').trim() && !String(u.name || '').trim()) return null;
      return u;
    } catch (e) { return null; }
  }
  /** 注册用户 / 管理员可进控制台；访客不显示入口。role 缺省视为已注册 user。
      生产 app 域只认 vault NextAuth 写下的壳（source=vault-nextauth），避免 login.html 本地冒充。 */
  function canAccessApp(u) {
    u = u || user();
    if (!u) return false;
    if (onAppHost() && String(u.source || '') !== 'vault-nextauth') return false;
    const role = String(u.role || 'user').toLowerCase();
    return role === 'user' || role === 'admin' || role === 'owner' || role === 'editor';
  }
  function login(profile) {
    const base = profile && typeof profile === 'object' ? profile : {};
    const next = {
      name: String(base.name || '').trim() || '文派设计',
      email: String(base.email || '').trim() || 'design@wenpai.org',
      role: String(base.role || 'user').toLowerCase()
    };
    if (next.role !== 'admin' && next.role !== 'owner' && next.role !== 'editor') next.role = 'user';
    if (base.source) next.source = String(base.source);
    if (base.id) next.id = String(base.id);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
  }
  function logout() {
    localStorage.removeItem(USER_KEY);
    if (window.WFAuth && WFAuth.signOut) {
      try { WFAuth.signOut(); } catch (e) { /* ignore */ }
    }
  }

  /* —— 主题：亮 / 暗，记在 localStorage，首屏在 <head> 之前由 applyTheme 同步 —— */
  const THEME_KEY = 'wf-theme';
  function theme() { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
  /* ?theme=dark|light 可直接指定并记住（分享 / 截图用） */
  (function () { const q = WFProto.getQuery('theme'); if (q === 'dark' || q === 'light') localStorage.setItem(THEME_KEY, q); })();
  function applyTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
  function toggleTheme() {
    const next = theme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
      const label = b.getAttribute('data-label') || '';
      b.innerHTML = themeIcon() + (label ? label : '');
      b.setAttribute('aria-label', next === 'dark' ? '切换到浅色' : '切换到深色');
    });
  }
  applyTheme(theme());

  /* 大字：整页 150%，和浏览器放大一档同一观感。记在本地。 */
  const SCALE_KEY = 'wf-scale';
  function largeType() { return localStorage.getItem(SCALE_KEY) === 'lg'; }
  function applyScale(on) {
    if (on) document.documentElement.setAttribute('data-scale', 'lg');
    else document.documentElement.removeAttribute('data-scale');
  }
  function syncScaleBtns() {
    const on = largeType();
    document.querySelectorAll('[data-scale-toggle]').forEach(function (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? '关闭大字' : '大字');
    });
  }
  function toggleScale() {
    const next = !largeType();
    if (next) localStorage.setItem(SCALE_KEY, 'lg');
    else localStorage.removeItem(SCALE_KEY);
    applyScale(next);
    syncScaleBtns();
  }
  applyScale(largeType());

  const VIEW_KEY = 'wf-view';
  function view() { return localStorage.getItem(VIEW_KEY) === 'dev' ? 'dev' : 'design'; }
  function applyView(v) { document.documentElement.setAttribute('data-view', v === 'dev' ? 'dev' : 'design'); }
  (function () {
    const q = WFProto.getQuery('view');
    if (q === 'dev' || q === 'design') localStorage.setItem(VIEW_KEY, q);
    applyView(view());
  })();
  function setView(v) {
    const next = v === 'dev' ? 'dev' : 'design';
    localStorage.setItem(VIEW_KEY, next);
    applyView(next);
    document.querySelectorAll('[data-view-switch] [data-mode]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-mode') === next);
    });
    document.dispatchEvent(new CustomEvent('wf:view', { detail: next }));
  }
  function viewSwitchHtml() {
    const cur = view();
    return '<div class="seg view-switch" data-view-switch role="group" aria-label="视图">' +
      '<button type="button" data-mode="design"' + (cur === 'design' ? ' class="is-on"' : '') + '>设计</button>' +
      '<button type="button" data-mode="dev"' + (cur === 'dev' ? ' class="is-on"' : '') + '>开发</button></div>';
  }
  function bindViewSwitch(root) {
    (root || document).querySelectorAll('[data-view-switch] [data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setView(b.getAttribute('data-mode')); });
    });
  }

  /* —— 图标：Remix Icon 线标（Apache-2.0），经墨图爱可 icons.motucloud.com/collection/ri 选取，打包在 assets/icons.svg。symbol id 是站内语义名。 —— */
  const ICON_VER = '20260929g1';
  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" aria-hidden="true" focusable="false"><use href="' + href('assets/icons.svg') + '?v=' + ICON_VER + '#i-' + name + '"/></svg>';
  }
  function themeIcon() { return icon(theme() === 'dark' ? 'sun' : 'moon'); }

  const NAV = [
    { id: 'fonts', label: '字体库', path: 'fonts.html' },
    { id: 'features', label: '特点', path: 'features.html' },
    { id: 'foundries', label: '厂商', path: 'foundry.html' },
    { id: 'pricing', label: '定价', path: 'pricing.html' },
    { id: 'docs', label: '文档', path: 'docs.html' }
  ];

  /* 定价：本地开发默认可见；正式站须 ?pricing=1 / ?dev=1 或 localStorage 显式打开 */
  function showPricing() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('dev') === '1') localStorage.setItem('wf-dev', '1');
      if (q.get('pricing') === '1') localStorage.setItem('wf-show-pricing', '1');
      if (q.get('dev') === '0') localStorage.removeItem('wf-dev');
      if (q.get('pricing') === '0') localStorage.removeItem('wf-show-pricing');
      if (localStorage.getItem('wf-show-pricing') === '1' || localStorage.getItem('wf-dev') === '1') return true;
    } catch (e) { /* ignore */ }
    const h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '0.0.0.0';
  }
  function navItems() {
    return NAV.filter(function (n) { return n.id !== 'pricing' || showPricing(); });
  }
  function applyPricingVisibility() {
    const on = showPricing();
    document.querySelectorAll('[data-pricing]').forEach(function (el) { el.hidden = !on; });
    if (document.body.classList.contains('page-pricing') && !on) {
      location.replace(href('index.html'));
    }
  }

  function renderTopbar(el) {
    const active = el.getAttribute('data-active') || '';
    const u = user();
    const inApp = canAccessApp(u);
    const nav = navItems();
    el.classList.add('topbar');
    if (el.hasAttribute('data-dark')) el.classList.add('is-dark');
    el.innerHTML =
      '<div class="container topbar-inner">' +
        '<a class="wordmark" href="' + href('index.html') + '">' +
          '<img src="' + href('assets/icon.webp') + '" alt="" width="22" height="22" />' +
          '<span>文风字体</span></a>' +
        '<nav class="topnav" aria-label="主导航">' +
          nav.map(function (n) {
            return '<a href="' + href(n.path) + '"' + (n.id === active ? ' class="is-active"' : '') + '>' + n.label + '</a>';
          }).join('') +
        '</nav>' +
        '<div class="topbar-end">' +
          '<form class="topsearch" action="' + href('fonts.html') + '" method="get" role="search">' +
            icon('search') +
            '<input type="search" name="keyword" id="navSearch" placeholder="搜索字体、厂商" aria-label="搜索字体" autocomplete="off" />' +
            '<button type="button" class="clear" id="navSearchClear" hidden aria-label="清除搜索">' + icon('close') + '</button>' +
          '</form>' +
          '<a href="' + href('shopping-bag.html') + '" aria-label="选字袋">' + icon('bag') + '<span class="sr-only">选字袋</span><span class="count" data-pick-count data-count="0">0</span></a>' +
          (inApp
            ? '<a href="' + href('app/index.html') + '">' + icon('dashboard') + '<span>控制台</span></a>'
            : '<a href="' + href('login.html') + '">' + icon('user') + '<span>登录</span></a>') +
          viewSwitchHtml() +
          '<button type="button" class="icon-btn" data-scale-toggle aria-pressed="' + (largeType() ? 'true' : 'false') + '" aria-label="' + (largeType() ? '关闭大字' : '大字') + '">' + icon('font-size') + '</button>' +
          '<button type="button" class="icon-btn" data-theme-toggle aria-label="' + (theme() === 'dark' ? '切换到浅色' : '切换到深色') + '">' + themeIcon() + '</button>' +
          '<button type="button" class="icon-btn menu-btn" id="navMenuBtn" aria-label="菜单" aria-expanded="false" aria-controls="navMenu">' + icon('menu') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="topmenu" id="navMenu" hidden>' +
        '<form class="topsearch" action="' + href('fonts.html') + '" method="get" role="search">' + icon('search') +
          '<input type="search" name="keyword" placeholder="搜索字体、厂商" aria-label="搜索字体" autocomplete="off" /></form>' +
        nav.map(function (n) {
          return '<a href="' + href(n.path) + '"' + (n.id === active ? ' class="is-active"' : '') + '>' + n.label + '</a>';
        }).join('') +
        (inApp
          ? '<a href="' + href('app/index.html') + '">' + icon('dashboard') + '控制台</a>'
          : '<a href="' + href('login.html') + '">' + icon('user') + '登录</a>') +
        viewSwitchHtml() +
      '</div>';
    const pickN = (WFProto.getPicks() || []).length;
    el.querySelectorAll('[data-pick-count]').forEach(function (c) {
      c.textContent = String(pickN);
      c.setAttribute('data-count', String(pickN));
    });
    el.querySelector('[data-theme-toggle]').addEventListener('click', toggleTheme);
    el.querySelector('[data-scale-toggle]').addEventListener('click', toggleScale);
    bindViewSwitch(el);
    const menuBtn = el.querySelector('#navMenuBtn');
    const menu = el.querySelector('#navMenu');
    menuBtn.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
  }

  function setMenu(open) {
    const menu = document.getElementById('navMenu');
    const menuBtn = document.getElementById('navMenuBtn');
    if (!menu || !menuBtn) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '关闭菜单' : '菜单');
    menuBtn.innerHTML = icon(open ? 'close' : 'menu');
  }

  /* 键盘：`/` 聚焦顶栏搜索，Esc 收起菜单 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      const menu = document.getElementById('navMenu');
      if (menu && !menu.hidden) { setMenu(false); e.preventDefault(); }
      return;
    }
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const s = document.getElementById('navSearch');
    if (s) { e.preventDefault(); s.focus(); s.select(); }
  });

  function ensureFooter() {
    let foot = document.getElementById('wfExtraFooter');
    if (!foot) return;
    if (!foot.children.length) WFProto.renderExtraFooter(foot);
    foot.classList.remove('is-dark');
  }

  let toastEl = null;
  let toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  }

  function copy(text, msg) {
    return WFProto.copyText(text).then(function () { toast(msg || '已复制'); });
  }

  /* —— 确认弹层：破坏性操作二次确认。返回 Promise<boolean> —— */
  function confirm(opts) {
    opts = typeof opts === 'string' ? { message: opts } : (opts || {});
    return new Promise(function (resolve) {
      const prev = document.getElementById('wfDialog');
      if (prev) prev.remove();
      const danger = opts.danger !== false && /移除|清空|删除|回滚|恢复|轮换/.test((opts.ok || '') + (opts.title || ''));
      const wrap = document.createElement('div');
      wrap.id = 'wfDialog';
      wrap.className = 'dialog-back';
      wrap.innerHTML =
        '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="wfDialogTitle" aria-describedby="wfDialogMsg">' +
          '<h3 id="wfDialogTitle">' + esc(opts.title || '确认') + '</h3>' +
          '<p id="wfDialogMsg">' + esc(opts.message || '确定继续？') + '</p>' +
          '<div class="dialog-acts">' +
            '<button type="button" class="btn" data-no>' + esc(opts.cancel || '取消') + '</button>' +
            '<button type="button" class="btn btn-ink" data-yes>' + esc(opts.ok || '确定') + '</button>' +
          '</div></div>';
      document.body.appendChild(wrap);
      const no = wrap.querySelector('[data-no]');
      const yes = wrap.querySelector('[data-yes]');
      const buttons = [no, yes];
      const prior = document.activeElement;
      document.body.style.overflow = 'hidden';
      const done = function (ok) {
        wrap.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        if (prior && prior.focus) prior.focus();
        resolve(ok);
      };
      const onKey = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); done(false); return; }
        if (e.key !== 'Tab') return;
        e.preventDefault();
        const i = buttons.indexOf(document.activeElement);
        const next = e.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i === buttons.length - 1 || i < 0 ? 0 : i + 1);
        buttons[next].focus();
      };
      no.addEventListener('click', function () { done(false); });
      yes.addEventListener('click', function () { done(true); });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) done(false); });
      document.addEventListener('keydown', onKey);
      (danger ? no : yes).focus();
    });
  }

  /* —— 输入弹层：替代原生 prompt()，与 confirm 同一套面板样式。返回 Promise<string|null>（取消为 null） —— */
  function promptInput(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const prev = document.getElementById('wfDialog');
      if (prev) prev.remove();
      const wrap = document.createElement('div');
      wrap.id = 'wfDialog';
      wrap.className = 'dialog-back';
      wrap.innerHTML =
        '<form class="dialog" role="dialog" aria-modal="true" aria-labelledby="wfDialogTitle">' +
          '<h3 id="wfDialogTitle">' + esc(opts.title || '输入') + '</h3>' +
          (opts.message ? '<p>' + esc(opts.message) + '</p>' : '') +
          '<div class="field" style="margin-top:var(--s-4)">' +
            '<label for="wfDialogInput">' + esc(opts.label || '') + '</label>' +
            '<input class="input" id="wfDialogInput" value="' + esc(opts.value || '') + '" placeholder="' + esc(opts.placeholder || '') + '" autocomplete="off" />' +
          '</div>' +
          '<div class="dialog-acts">' +
            '<button type="button" class="btn" data-no>' + esc(opts.cancel || '取消') + '</button>' +
            '<button type="submit" class="btn btn-ink">' + esc(opts.ok || '确定') + '</button>' +
          '</div></form>';
      document.body.appendChild(wrap);
      const form = wrap.querySelector('form');
      const input = wrap.querySelector('#wfDialogInput');
      const prior = document.activeElement;
      document.body.style.overflow = 'hidden';
      const done = function (val) {
        wrap.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKey);
        if (prior && prior.focus) prior.focus();
        resolve(val);
      };
      const onKey = function (e) {
        if (e.key === 'Escape') { e.preventDefault(); done(null); return; }
        if (e.key !== 'Tab') return;
        e.preventDefault();
        const btns = [input, wrap.querySelector('[data-no]'), form.querySelector('button[type="submit"]')];
        const i = btns.indexOf(document.activeElement);
        const next = e.shiftKey ? (i <= 0 ? btns.length - 1 : i - 1) : (i === btns.length - 1 || i < 0 ? 0 : i + 1);
        btns[next].focus();
      };
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const v = input.value.trim();
        done(v || null);
      });
      wrap.querySelector('[data-no]').addEventListener('click', function () { done(null); });
      wrap.addEventListener('click', function (e) { if (e.target === wrap) done(null); });
      document.addEventListener('keydown', onKey);
      input.focus();
      input.select();
    });
  }

  const VERIFIED_SVG = '<span class="badge-verified" title="厂商已认领">' + icon('verified') + '</span>';
  const SOURCE_KIND_LABEL = {
    standard: '标准开源文本',
    rights_holder: '权利人官网',
    github_license: '源仓库许可',
    platform: '素材站声明',
    author_note: '作者文字声明',
    unlabeled: '尚未核对原文'
  };
  const KIND_LABEL = { author: '作者', project: '项目', foundry: '字库', brand: '品牌方', platform: '素材平台' };

  /* 主归属是品牌方 ownerInfo；制作方不同时走 makerInfo */
  function brandInfo(font) { return (font && (font.ownerInfo || font.foundryInfo)) || null; }
  function makerInfo(font) {
    const m = font && font.makerInfo;
    const o = brandInfo(font);
    if (!m || !m.id || (o && m.id === o.id)) return null;
    return m;
  }
  function brandName(font) { const b = brandInfo(font); return b ? b.name : ''; }
  function brandEn(font) { const b = brandInfo(font); return (b && b.en) || ''; }
  function brandShort(font) { const b = brandInfo(font); return (b && (b.short || b.name)) || ''; }
  function brandSite(font) { const b = brandInfo(font); return (b && b.website) || (font && font.brand && font.brand.website) || ''; }
  function junkAvatar(url) {
    return /identicon|avatars\.githubusercontent\.com/i.test(url || '');
  }
  /** 个人作者 / 个人：缺本地图时用 Cravatar；组织（品牌/字库/平台/项目）用字标 */
  function isPersonalFoundry(info) {
    const k = (info && info.kind) || '';
    return k === 'author' || k === 'individual';
  }
  /* 轻量 MD5（与 wf-avatar 一致）；多数页未载 wf-avatar.js，个人 Cravatar 回退仍可用 */
  function avatarMd5(str) {
    if (window.WFAvatar && typeof WFAvatar.md5 === 'function') return WFAvatar.md5(str);
    const S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    const K = [];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    function hex(x) {
      let s = '';
      for (let i = 0; i < 4; i++) s += ('0' + ((x >>> (i * 8)) & 255).toString(16)).slice(-2);
      return s;
    }
    const bytes = new TextEncoder().encode(String(str));
    const n = bytes.length;
    const words = new Array((((n + 8) >> 6) + 1) * 16).fill(0);
    for (let i = 0; i < n; i++) words[i >> 2] |= bytes[i] << ((i % 4) * 8);
    words[n >> 2] |= 0x80 << ((n % 4) * 8);
    words[words.length - 2] = (n * 8) >>> 0;
    words[words.length - 1] = Math.floor(n / 536870912);
    let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
    for (let off = 0; off < words.length; off += 16) {
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) { f = (b & c) | (~b & d); g = i; }
        else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const s = S[(i >> 4) * 4 + (i % 4)];
        const t = (a + f + K[i] + words[off + g]) | 0;
        a = d; d = c; c = b;
        b = (b + ((t << s) | (t >>> (32 - s)))) | 0;
      }
      a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
    }
    return hex(a0) + hex(b0) + hex(c0) + hex(d0);
  }
  function cravatarHash(info, fallbackSlug) {
    const raw = (info && info.tips && info.tips.hash) || (info && info.cravatar) || '';
    if (/^[a-f0-9]{32}$/i.test(raw)) return String(raw).toLowerCase();
    const seed = String(fallbackSlug || (info && info.id) || '').trim().toLowerCase();
    if (!seed) return '';
    return avatarMd5(seed + '@authors.windfonts.local');
  }
  /**
   * @param {*} info
   * @param {number} [size]
   * @param {{ default?: string, fallbackSlug?: string }} [opts]
   *  default: Gravatar/Cravatar d=；个人缺档用 mp（默认头像），赞助核验仍用 404
   */
  function cravatarFromInfo(info, size, opts) {
    opts = opts || {};
    const hash = cravatarHash(info, opts.fallbackSlug);
    if (!hash) return '';
    const s = size || 240;
    const d = opts.default || '404';
    return 'https://cravatar.com/avatar/' + hash + '?s=' + s + '&d=' + encodeURIComponent(d);
  }
  /** 字标：中文取 short/name 最多两字，拉丁取首字母 */
  function avatarMark(infoOrName) {
    const raw = typeof infoOrName === 'string'
      ? infoOrName
      : ((infoOrName && (infoOrName.short || infoOrName.name)) || '?');
    const s = String(raw || '?').trim() || '?';
    const cjk = s.match(/[\u3400-\u9fff]{1,2}/);
    if (cjk) return cjk[0];
    const ch = s.charAt(0);
    return ch ? ch.toUpperCase() : '?';
  }
  /* 本地清单优先：按正在展示的厂商 id 取图，不看哪条目录碰巧写了 brand.avatarUrl */
  function resolveAvatar(url) {
    const u = String(url || '').trim();
    if (!u || junkAvatar(u)) return '';
    /* 禁止第三方未缓存 logo 热链作主路径；Cravatar 走 brandAvatar 显式回退 */
    if (/^https?:\/\//i.test(u)) return '';
    if (/^(data:|blob:)/i.test(u)) return u;
    return href(u.replace(/^\.\//, ''));
  }
  function brandAvatar(font, info) {
    const who = info || brandInfo(font);
    const id = (who && who.id) || (font && font.brand && font.brand.slug) || '';
    const fromMap = (WFProto.getAvatarUrl && WFProto.getAvatarUrl(id)) || '';
    if (fromMap) return resolveAvatar(fromMap);
    /* 个人：Cravatar（有 tips.hash 用真档，否则 slug 派生 + 默认头像 d=mp）；组织：空 → 字标 */
    if (isPersonalFoundry(who)) {
      return cravatarFromInfo(who, 240, { fallbackSlug: id, default: 'mp' });
    }
    if (id) return '';
    const brand = font && font.brand;
    const raw = (brand && (brand.logoUrl || brand.avatarUrl)) || (font && font.foundryAvatar) || '';
    return resolveAvatar(raw);
  }
  /** 同一厂商的多条目录记录（别名、合作署名）归到一个 id */
  function brandSlug(font) { const b = brandInfo(font); return b ? b.id : ''; }
  /** 厂商已认领（foundries.claimed），与许可核对无关 */
  function brandVerified(font) { const b = brandInfo(font); return !!(b && b.claimed); }
  function brandKind(font) { const b = brandInfo(font); return (b && b.kind) || ''; }

  /* 台湾系字体：不对简体千字文做收录盘点（HANDOFF §4 名单 + 名称特征） */
  const TW_GLYPH_FOUNDRY = ['ichiten', 'moe-tw', 'writes', 'newvalue', 'dynalab'];
  const TW_GLYPH_NAME = /(?:\bTW\b|繁体中文|繁體中文|PMingLiU|俐方体|MOESong|王[漢汉]宗|Cubic\s*11|教育部標準|辰宇|清松手写)/;
  function skipGlyphCov(font) {
    if (!font) return false;
    const ids = [font.ownerInfo, font.foundryInfo, font.makerInfo]
      .concat(font.collaboratorInfos || [])
      .filter(Boolean)
      .map(function (b) { return b.id; });
    if (ids.some(function (id) { return TW_GLYPH_FOUNDRY.indexOf(id) !== -1; })) return true;
    if (/CMEX/i.test(font.designer || '')) return true;
    const blob = (font.name || '') + ' ' + (font.en || '');
    return TW_GLYPH_NAME.test(blob);
  }
  function kindLabel(fontOrFoundry) {
    const fd = fontOrFoundry && fontOrFoundry.kind ? fontOrFoundry : brandInfo(fontOrFoundry);
    if (!fd || !fd.kind) return '';
    if (fd.kind === 'author' && fd.openSource) return '开源作者';
    if (fd.kind === 'author') return '作者';
    if (fd.kind === 'project' && fd.openSource) return '开源项目';
    if (fd.kind === 'project') return '项目';
    if (fd.kind === 'brand') return '品牌方';
    return KIND_LABEL[fd.kind] || '';
  }

  /* 认领能力按 kind 推导；真源 docs/CLAIM-SCOPES.md */
  function claimProfile(foundry) {
    const fd = foundry || {};
    const kind = fd.kind || '';
    const oss = !!fd.openSource;
    const title = kindLabel(fd) || '厂商';
    const base = {
      kind: kind,
      openSource: oss,
      title: title,
      canClaim: true,
      materials: ['品牌法定名称或已收录的厂商名', '官网地址', '官网域名下的联系邮箱'],
      allowedEdits: [],
      forbidden: ['改任何字的许可档位或「已核对」状态'],
      form: { license: true, proof: false, platformNote: false },
      claimLead: '',
      claimHint: '通过后可改本页资料；许可仍以每款字体出处为准。',
      closeHint: '合作入驻，认领你的厂商页。',
      closeLead: '准备法定名称、官网域名邮箱与授权原文。通过后可改本页标志与介绍；实际许可仍以每款字体出处为准。'
    };

    if (fd.unlisted || !kind) {
      return Object.assign(base, {
        canClaim: false,
        title: '未核对',
        materials: ['先到厂商索引确认是否已收录，或联系本站归并字典后再提交'],
        allowedEdits: [],
        forbidden: ['未入字典不可直接认领'],
        form: { license: false, proof: false, platformNote: false },
        claimLead: '此条目尚未入厂商字典。',
        claimHint: '请先归并字典后再认领。',
        closeHint: '合作入驻，认领你的厂商页。',
        closeLead: '未入字典的条目需先核对归并，再提交认领。'
      });
    }

    if (kind === 'brand') {
      return Object.assign(base, {
        materials: base.materials.concat(['授权原文链接（对照库内字体，不等于通过后可改许可）']),
        allowedEdits: ['本页标志', '介绍', '官网'],
        forbidden: base.forbidden.concat(['改制作方页', '改受托制作方的介绍']),
        claimLead: '认领后维护品牌方页资料。',
        claimHint: '通过后可改标志、介绍与官网。许可仍以每款字体出处为准；制作方页不在此认领范围。',
        closeHint: '合作入驻，认领你的品牌方页。',
        closeLead: '准备法定名称、官网域名邮箱与授权原文。通过后可改本页标志与介绍；实际许可仍以每款字体出处为准。'
      });
    }

    if (kind === 'foundry') {
      return Object.assign(base, {
        materials: base.materials.concat(['授权原文链接（对照库内字体，不等于通过后可改许可）']),
        allowedEdits: ['本页标志', '介绍', '官网'],
        forbidden: base.forbidden.concat(['把受托款说成自有版权', '改品牌方页或品牌方许可']),
        claimLead: '认领后维护字库页资料。',
        claimHint: '通过后可改标志、介绍与官网。受托制作列表的版权在品牌方，不能改成自有。',
        closeHint: '合作入驻，认领你的字库页。',
        closeLead: '准备法定名称、官网域名邮箱与授权原文。通过后可改本页标志与介绍；受托款版权仍归品牌方。'
      });
    }

    if (kind === 'author') {
      return Object.assign(base, {
        materials: base.materials.concat(['授权原文链接（对照库内字体，不等于通过后可改许可）']),
        allowedEdits: oss
          ? ['简介', '头像', '外链', '仓库链接']
          : ['简介', '头像', '外链'],
        forbidden: base.forbidden.concat(['把素材平台转载款认成「我的字」']),
        claimLead: oss ? '认领后维护开源作者页资料。' : '认领后维护作者页资料。',
        claimHint: oss
          ? '通过后可改简介、头像与外链。派生、源文件与缺字请到 wenfeng.org。'
          : '通过后可改简介、头像与外链。许可仍以每款字体出处为准。',
        closeHint: oss ? '认领你的开源作者页。' : '认领你的作者页。',
        closeLead: oss
          ? '准备名称、官网或主页邮箱。通过后可改简介与外链；造字与源文件在 wenfeng.org。'
          : '准备名称、官网或主页邮箱与授权原文。通过后可改简介与外链。'
      });
    }

    if (kind === 'project') {
      return Object.assign(base, {
        materials: base.materials.concat(['仓库或组织证明链接（维护者 / 组织页，必填）']),
        allowedEdits: ['项目说明', '仓库链接', '许可原文链（页资料）'],
        forbidden: base.forbidden.concat(['个人无证明认领整仓']),
        form: { license: false, proof: true, platformNote: false },
        claimLead: '开源项目须提供仓库或组织证明。',
        claimHint: '通过后可改项目说明与仓库链接。不能仅凭个人邮箱认领整仓；许可核对仍按每款字依据。',
        closeHint: '认领你的开源项目页。',
        closeLead: '准备组织邮箱与仓库 / 组织证明。通过后可改项目说明；实际许可仍以每款字体出处为准。'
      });
    }

    if (kind === 'platform') {
      return Object.assign(base, {
        materials: base.materials.concat(['平台关于页或更正说明（可选）']),
        allowedEdits: ['介绍', '官网', '标志'],
        forbidden: ['改许可档位', '点亮「已核对」', '改 sourceKind', '自证「可商用」'],
        form: { license: false, proof: false, platformNote: true },
        claimLead: '素材平台可认领页资料，不能改许可。',
        claimHint: '通过后可改介绍、官网与标志。许可档位与「已核对」永远不在认领范围内。',
        closeHint: '认领你的素材平台页。',
        closeLead: '准备平台名称、官网域名邮箱。通过后可改介绍与标志；不能改任何字的许可声明。'
      });
    }

    return Object.assign(base, {
      materials: base.materials.concat(['授权原文链接']),
      allowedEdits: ['本页标志', '介绍', '官网'],
      claimLead: '认领后维护本页资料。',
      claimHint: '通过后可改标志与介绍。许可仍以每款字体出处为准。'
    });
  }

  function licenseEvidence(font) {
    return (font && font.licenseEvidence) || { sourceKind: 'unlabeled', verified: false, sourceUrl: '', quote: '', restrictions: [] };
  }
  function sourceKindLabel(kind) { return SOURCE_KIND_LABEL[kind] || SOURCE_KIND_LABEL.unlabeled; }
  function licenseHost(url) {
    try { return new URL(url).host; } catch (e) { return String(url || '').replace(/^https?:\/\//, '').split('/')[0]; }
  }
  function licenseCiteHtml(font) {
    const ev = licenseEvidence(font);
    const site = brandSite(font);
    const links = [];
    if (ev.sourceUrl) {
      links.push('<a href="' + esc(ev.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + icon('external') +
        (ev.sourceKind === 'standard' ? '打开许可原文' : '打开出处') +
        (ev.sourceUrl ? ' · ' + esc(licenseHost(ev.sourceUrl)) : '') + '</a>');
    }
    if (site && (!ev.sourceUrl || licenseHost(site) !== licenseHost(ev.sourceUrl))) {
      const who = brandKind(font) === 'brand' ? '品牌方官网' : '厂商官网';
      links.push('<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + who + ' · ' + esc(licenseHost(site)) + '</a>');
    }
    return '<div class="license-cite">' +
      '<p class="cite-meta">' + icon('certificate') +
        '<span>' + esc(sourceKindLabel(ev.sourceKind)) + '</span>' +
        (ev.spdx ? '<span class="mono">' + esc(ev.spdx) + '</span>' : '') +
        (ev.verifiedAt ? '<span>' + esc(ev.verifiedAt) + ' 核对</span>' : '') +
        '<span>' + (ev.verified ? '已核对原文' : '尚未核对原文') + '</span></p>' +
      (ev.quote ? '<blockquote>' + esc(ev.quote) + '</blockquote>' : '') +
      (ev.sourceKind === 'platform' ? '<p class="cite-warn">这是素材站声明，不是厂商官网。商用前请到权利人页面核对。</p>' : '') +
      (ev.sourceKind === 'unlabeled' || ev.sourceKind === 'author_note'
        ? '<p class="cite-warn">目前没有可核验的原文链接。用之前请向权利人确认。</p>' : '') +
      '<p class="cite-links">' + (links.length ? links.join('') : '') +
        ' <span>条款以权利人为准。</span></p></div>';
  }

  const REL_LABEL = { original: '原作', locale: '地区版', fork: '派生', commissioned: '委托定制', collab: '合作' };
  const REL_ICON = { original: 'commit', locale: 'merge', fork: 'branch', collab: 'merge' };
  const FOLLOW_COPY = {
    inherit: '沿用上游许可，改完要换名并保留声明。',
    own: '以品牌方许可为准。',
    unknown: '同源关系已知，许可还没核对。'
  };

  function lineageHtml(font) {
    const L = font && font.lineage;
    const maker = makerInfo(font);
    const cols = (font && font.collaboratorInfos) || [];
    const has = L && (L.relation || L.group || L.upstreamName);
    if (!has && !maker && !cols.length) return '';
    const bits = [];
    if (L && L.relation) bits.push(REL_LABEL[L.relation] || L.relation);
    if (L && L.upstreamName) bits.push('上游 ' + L.upstreamName);
    if (L && L.groupName) bits.push('同系 ' + L.groupName);
    if (maker) bits.push(maker.name + ' 制作');
    if (cols.length) bits.push('联合作者 ' + cols.map(function (c) { return c.name; }).join('、'));
    const follow = (L && FOLLOW_COPY[L.licenseFollows]) || '';
    const colLinks = cols.map(function (c) {
      return '<a href="' + href('foundry.html?slug=' + encodeURIComponent(c.id)) + '">' +
        faceHtml(font, 16, c) + esc(c.name) + '</a>';
    }).join('');
    return '<div class="license-cite lineage">' +
      (bits.length ? '<p class="cite-meta">' + icon(REL_ICON[(L && L.relation)] || 'branch') + '<span>' + esc(bits.join(' · ')) + '</span></p>' : '') +
      (follow ? '<p class="cite-warn">' + esc(follow) + '</p>' : '') +
      '<p class="cite-links">' +
        (L && L.group
          ? '<a href="' + href('fonts.html?lineage=' + encodeURIComponent(L.group)) + '">' + icon('compare') + '查看同系字体</a>'
          : '') +
        colLinks +
      '</p>' +
    '</div>';
  }

  const UPSTREAM_FONT = {
    'IPA 明朝': 'IPAexMincho',
    'IPAex Mincho': 'IPAexMincho',
    'IPAex明朝': 'IPAexMincho',
    'IPA明朝': 'IPAexMincho',
    'IPAexGothic': 'IPAex Gothic',
    'IPAexゴシック': 'IPAex Gothic',
    'IPAex黑体': 'IPAex Gothic',
    'IPA Gothic': 'IPA 黑体',
    'IPAゴシック': 'IPA 黑体',
    'IPA黑体': 'IPA 黑体',
    'こころ明朝体': 'こころ明朝',
    'Kokoro Mincho': 'こころ明朝',
    'KokoroMinchoutai': 'こころ明朝',
    'IPAmjMincho': 'IPAmj明朝',
    'IPAmj Mincho': 'IPAmj明朝',
    'IPAmj明朝フォント': 'IPAmj明朝',
    '思源黑体': '思源黑体',
    '思源宋体': '思源宋体',
    '龙藏体': '龙藏体',
    '红道字体': 'Zen Kurenaido',
    'Ume Gothic': '梅黑体',
    '梅ゴシック': '梅黑体',
    'Yuji Syuku': '佑字肃',
    '佑字肅': '佑字肃',
    'Ume Mincho': '梅明朝',
    '梅明朝': '梅明朝',
    '香山毛笔字体': '衡山毛笔',
    'KouzanBrushFont': '衡山毛笔',
    'Y.OzFont': 'YozFont',
    'YOzFont': 'YozFont',
    'IBM Plex Sans SC': 'IBM Plex Sans SC 简体中文',
    'Droid Sans 后备体': 'Droid Sans Fallback',
    '光莹黑体': '未来荧黑',
    'KHドット道玄坂12': 'KH Dot 道玄坂 12',
    'KHドット道玄坂16': 'KH Dot 道玄坂 16',
    'KHドット八丁堀16': 'KH Dot 八丁堀 16',
    'KH Dot Hatchobori 16': 'KH Dot 八丁堀 16',
    'KH Dot Hatcyoubori 16': 'KH Dot 八丁堀 16',
    'KHドット秋葉原16': 'KH Dot 秋葉原 16',
    'KHドット人形町16': 'KH Dot 人形町 16',
    'KHドット兜町16': 'KH Dot 兜町 16',
    'k6x8ゴシック': 'k6x8 ゴシック',
    'Slide Font / 幻灯片字体': '演示春风楷',
    'Slide Font': '演示春风楷',
    '幻灯片字体': '演示春风楷',
    '演示字体': '演示春风楷',
    'Smart Font UI': '03スマートフォントUI',
    'SmartFontUI': '03スマートフォントUI',
    '03SmartFontUI': '03スマートフォントUI',
    'スマートフォントUI': '03スマートフォントUI',
    '03スマートフォント UI': '03スマートフォントUI',
    'Star Love': '天天宅在家',
    'StarLove': '天天宅在家',
    '宅在家系列': '天天宅在家'
  };
  /** 仍未入库的外源名：不造假字体行；可挂厂商页 / 原文。已入库源头走 UPSTREAM_FONT / fonts.json。 */
  const UPSTREAM_GHOST = {};
  function findFontByName(list, name) {
    if (!name || !list) return null;
    const hit = list.filter(function (f) { return f.name === name; })[0];
    if (hit) return hit;
    const alias = UPSTREAM_FONT[name];
    if (alias) {
      const mapped = list.filter(function (f) { return f.name === alias; })[0];
      if (mapped) return mapped;
    }
    return list.filter(function (f) {
      return f.name.indexOf(name) === 0 || name.indexOf(f.name) === 0;
    })[0] || null;
  }
  function lineageKin(list, font) {
    const g = font && font.lineage && font.lineage.group;
    if (!g || !list) return [];
    return list.filter(function (f) { return f.lineage && f.lineage.group === g; });
  }
  /** 以本款名为 upstreamName 的派生（跨 group 也算，源头缺 group 时仍能亮） */
  function lineageDownstream(list, font) {
    if (!list || !font || !font.name) return [];
    const name = font.name;
    return list.filter(function (f) {
      if (f.id === font.id) return false;
      const fu = (f.lineage || {}).upstreamName;
      if (!fu) return false;
      if (fu === name) return true;
      const mapped = UPSTREAM_FONT[fu];
      if (mapped && mapped === name) return true;
      const hit = findFontByName([font], fu);
      return !!(hit && hit.id === font.id);
    });
  }
  /** 沿 upstreamName 走到 relation=original。链是 [源头, …, 当前]，只含这一跳一跳的路径。 */
  function lineageChain(list, font) {
    const chain = [];
    const seen = {};
    let cur = font;
    let guard = 0;
    while (cur && !seen[cur.id] && guard < 8) {
      seen[cur.id] = true;
      guard += 1;
      chain.unshift(cur);
      const rec = cur.lineage || {};
      const up = rec.upstreamName || '';
      if (!up || up === cur.name || rec.relation === 'original') break;
      const parent = findFontByName(list, up);
      if (!parent || parent.id === cur.id) break;
      cur = parent;
    }
    return chain;
  }

  /** 谱系缺字补全源：按字集差集挑，优先直接下游（2026-09-27 Feng 拍板）。 */
  var LINEAGE_FALLBACK_DELTA_MIN = 50;
  var LINEAGE_FALLBACK_ROLE_RANK = {
    'direct-downstream': 0,
    'upstream': 1,
    sibling: 2
  };
  var LINEAGE_FALLBACK_ROLE_LABEL = {
    'direct-downstream': '直接下游',
    'upstream': '直接上游',
    sibling: '同谱系'
  };
  function coverageCount(f) {
    var c = Number(f && f.charCount) || 0;
    var g = Number(f && f.glyphCount) || 0;
    if (c > 1) return c;
    if (g > 1) return g;
    return null;
  }
  function lineageFallbackCiteOk(f) {
    if (!f) return false;
    if (!window.WFProto || typeof WFProto.citeAllowed !== 'function') return true;
    var r = WFProto.citeAllowed(f);
    return !!(r && r.ok);
  }
  function suggestLineageFallback(font, list) {
    if (!font || !list || !list.length) return null;
    if (!font.family) return null;
    if (!lineageFallbackCiteOk(font)) return null;
    var selfCount = coverageCount(font);
    if (selfCount == null) return null;

    var seen = {};
    seen[font.id] = true;
    var cands = [];

    function pushCand(f, role) {
      if (!f || !f.id || seen[f.id]) return;
      if (!f.family) return;
      if (f.id === font.id) return;
      if (!lineageFallbackCiteOk(f)) return;
      var candCount = coverageCount(f);
      if (candCount == null) return;
      var delta = candCount - selfCount;
      if (!(delta > LINEAGE_FALLBACK_DELTA_MIN)) return;
      seen[f.id] = true;
      cands.push({
        font: f,
        role: role,
        delta: delta,
        label: LINEAGE_FALLBACK_ROLE_LABEL[role] || role
      });
    }

    lineageDownstream(list, font).forEach(function (f) {
      pushCand(f, 'direct-downstream');
    });

    var upName = ((font.lineage || {}).upstreamName || '').trim();
    if (upName && upName !== font.name) {
      var up = findFontByName(list, upName);
      if (up && up.id !== font.id) pushCand(up, 'upstream');
    }

    var group = (font.lineage || {}).group;
    if (group) {
      lineageKin(list, font).forEach(function (f) {
        if (seen[f.id]) return;
        pushCand(f, 'sibling');
      });
    }

    if (!cands.length) return null;
    cands.sort(function (a, b) {
      var ra = LINEAGE_FALLBACK_ROLE_RANK[a.role];
      var rb = LINEAGE_FALLBACK_ROLE_RANK[b.role];
      if (ra == null) ra = 9;
      if (rb == null) rb = 9;
      if (ra !== rb) return ra - rb;
      return b.delta - a.delta;
    });
    return cands[0];
  }

  function lineageSplit(font, list) {
    const L = (font && font.lineage) || {};
    let up = L.upstreamName || '';
    if (font && up === font.name) up = '';
    const chain = lineageChain(list, font);
    const root = chain[0] || null;
    const via = chain.filter(function (f) {
      return f && root && font && f.id !== root.id && f.id !== font.id;
    });
    const onChain = {};
    chain.forEach(function (f) { if (f) onChain[f.id] = true; });
    const downs = lineageDownstream(list, font).filter(function (f) { return !onChain[f.id]; });
    const all = chain.concat(downs);
    const rest = all.filter(function (f) { return root && f.id !== root.id; });
    const buckets = { fork: [], locale: [], collab: [], commissioned: [], other: [] };
    downs.forEach(function (f) {
      const rel = (f.lineage || {}).relation;
      (buckets[rel] || buckets.other).push(f);
    });
    return {
      all: all, L: L, up: up, root: root, via: via, rest: rest,
      buckets: buckets, n: all.length || 1, downs: downs
    };
  }
  function lineageMeta(f) {
    const parts = [];
    if (f.charCount) parts.push('字符 ' + WFProto.formatCount(f.charCount));
    if (f.glyphCount) parts.push('字形 ' + WFProto.formatCount(f.glyphCount));
    if (f.weights && f.weights.length) parts.push(f.weights.length + ' 字重');
    if (f.releaseYear) parts.push(String(f.releaseYear));
    const lic = licenseTier(f);
    if (lic) parts.push(lic);
    return parts.length ? '<span class="lin-meta">' + esc(parts.join(' · ')) + '</span>' : '';
  }
  function lineageRow(f, on, faceOf) {
    const face = faceOf ? faceOf(f) : '';
    return '<a class="lin-row' + (on ? ' is-on' : '') + '" href="' + href(WFProto.detailHref(f)) + '">' +
      '<span class="lin-name"' + (face ? ' style="' + face + '"' : '') + '>' + esc(f.name) + '</span>' +
      lineageMeta(f) +
      (on ? '<span class="lin-rel">当前</span>' : '') + '</a>';
  }
  function lineageGhostRow(name, owner) {
    const ghost = UPSTREAM_GHOST[name] || null;
    let who = owner || null;
    if (!who && ghost && ghost.ownerId && WFProto.getFoundryById) {
      who = WFProto.getFoundryById(ghost.ownerId) || null;
    }
    const bits = [];
    if (who) {
      bits.push('<a href="' + href('foundry.html?slug=' + encodeURIComponent(who.id)) + '">' +
        esc(who.short || who.name) + '</a>');
    }
    if (ghost && ghost.site) {
      bits.push('<a href="' + esc(ghost.site) + '" target="_blank" rel="noopener">原文</a>');
    }
    if (!bits.length) {
      bits.push(ghost ? '<span>库外源头 · 尚未入库</span>' : '<span>库里未收录</span>');
    } else {
      bits.unshift('<span>库外源头</span>');
    }
    return '<span class="lin-row is-miss">' +
      '<span class="lin-name">' + esc(name) + '</span>' +
      '<span class="lin-rel">' + bits.join(' · ') + '</span></span>';
  }
  function lineageBlock(title, rows) {
    return rows.length ? '<p class="lin-h">' + esc(title) + '</p>' + rows.join('') : '';
  }
  /** 同一作者的成套派生先折起来。合上是名称加一行小字，点开仍是整行。 */
  function lineagePack(rows, faceOf, currentId) {
    const pack = [];
    const rest = [];
    rows.forEach(function (f) {
      if (f && f.name && f.name.indexOf('狮尾') === 0) pack.push(f);
      else rest.push(f);
    });
    const rowOf = function (f) { return lineageRow(f, f.id === currentId, faceOf); };
    if (pack.length < 4) return rows.map(rowOf);
    const prefer = ['狮尾圆体', '狮尾黑体', '狮尾尖刺黑体', '狮尾半月体', '狮尾宋体', '狮尾明体'];
    const picked = [];
    prefer.forEach(function (name) {
      if (picked.length >= 4) return;
      const hit = pack.filter(function (f) { return f.name === name; })[0];
      if (hit) picked.push(hit);
    });
    pack.forEach(function (f) {
      if (picked.length >= 4) return;
      if (!picked.some(function (p) { return p.id === f.id; })) picked.push(f);
    });
    const sub = picked.map(function (f) { return f.name.replace(/^狮尾/, ''); }).join('、') + '等 ' + pack.length + ' 款';
    const summary = '<span class="lin-row lin-pack-sum">' +
      '<span class="lin-pack-stack"><span class="lin-name">狮尾字体</span>' +
      '<span class="lin-meta lin-pack-sub">' + esc(sub) + '</span></span>' +
      '<span class="lin-pack-mark" aria-hidden="true"></span></span>';
    const fold = '<details class="lin-pack"><summary>' + summary + '</summary><div class="lin-pack-body">' +
      pack.map(rowOf).join('') + '</div></details>';
    return rest.map(rowOf).concat([fold]);
  }
  function lineageListHtml(font, split, faceOf) {
    const originRow = split.root
      ? lineageRow(split.root, split.root.id === font.id, faceOf)
      : (split.up ? lineageGhostRow(split.up, split.L && split.L.upstreamOwnerInfo) : '');
    const rowOf = function (f) { return lineageRow(f, f.id === font.id, faceOf); };
    return '<div class="lin-tree">' +
      lineageBlock('原作', originRow ? [originRow] : []) +
      lineageBlock('创作', (split.via || []).map(rowOf)) +
      lineageBlock('派生', lineagePack(split.buckets.fork, faceOf, font && font.id)) +
      lineageBlock('地区版', split.buckets.locale.map(rowOf)) +
      lineageBlock('合作', split.buckets.collab.map(rowOf)) +
      lineageBlock('委托定制', split.buckets.commissioned.map(rowOf)) +
      lineageBlock('同系', split.buckets.other.map(rowOf)) +
      '</div>';
  }
  /** 品牌/商用根（无开源上游）：详情谱系导语，不与开源师承源头混用 */
  function brandInviteWho(font) {
    const info = brandInfo(font);
    const brandName = (font && font.brand && font.brand.name) || '';
    if (!info) return brandName;
    let cur = info;
    let guard = 0;
    while (cur && cur.parentId && guard++ < 8) {
      const p = WFProto.getFoundryParent ? WFProto.getFoundryParent(cur) : null;
      if (!p || (p.kind !== 'brand' && p.kind !== 'platform' && p.kind !== 'author')) break;
      cur = p;
    }
    const kind = (cur && cur.kind) || (info && info.kind) || '';
    /* 方正代发/未入典品牌字：owner 可能是 foundry 或 unlisted，优先用 font.brand */
    if (brandName && kind !== 'brand' && kind !== 'platform' && kind !== 'author') {
      return brandName;
    }
    return (cur && cur.name) || info.name || brandName || '';
  }
  function brandLineageOrgHref(font) {
    if (!font) return '';
    const L = font.lineage || {};
    const brandRoots = { alibaba: 1, zcool: 1, qiantu: 1, maoken: 1, pangmen: 1 };
    const legacy = { 'alibaba-sans': 'alibaba' };
    let group = L.group || '';
    if (legacy[group]) group = legacy[group];
    if (!brandRoots[group]) {
      const oid = L.ownerId || (font.ownerInfo && font.ownerInfo.id) || '';
      let cur = oid && WFProto.getFoundryById ? WFProto.getFoundryById(oid) : null;
      let guard = 0;
      while (cur && cur.parentId && guard++ < 8) {
        const p = WFProto.getFoundryParent ? WFProto.getFoundryParent(cur) : null;
        if (!p) break;
        cur = p;
      }
      const top = (cur && cur.id) || oid;
      if (brandRoots[top]) group = top;
      else if (cur && (cur.kind === 'brand' || cur.kind === 'platform' || cur.kind === 'author')) group = top;
      else group = '';
    }
    if (!group) return '';
    if (WFProto.canShowOrgLineage && !WFProto.canShowOrgLineage(group)) return '';
    return href('lineage.html?group=' + encodeURIComponent(group) + '&view=org&mode=plex&focus=' +
      encodeURIComponent(font.id || ''));
  }
  function isCiteClosedFont(font) {
    const tags = (font && font.tags) || [];
    for (let i = 0; i < tags.length; i++) {
      if (String(tags[i]) === 'cite-closed') return true;
    }
    const ev = (font && font.licenseEvidence) || {};
    if (WFProto.forbidsFontRedistrib && WFProto.forbidsFontRedistrib(ev)) return true;
    return false;
  }
  function isBrandCommercialRoot(font) {
    if (!font) return false;
    const L = font.lineage || {};
    if (L.relation === 'fork' || L.relation === 'locale') return false;
    const commissioned = L.relation === 'commissioned' || L.relation === 'collab';
    if (L.upstreamName && !commissioned && L.licenseFollows !== 'own') return false;
    const info = brandInfo(font);
    const kind = (info && info.kind) || '';
    const tier = licenseTier(font);
    const ev = font.licenseEvidence || {};
    const forbids = WFProto.forbidsOpenDerive ? WFProto.forbidsOpenDerive(ev) : false;
    const citeClosed = isCiteClosedFont(font);
    const freeOk = tier === '免费商用' && !!(ev.verified || font.licenseVerified);
    /* font.brand / cite-closed：吉利×方正、摩登等未入典品牌根也走品牌导语 */
    const brandish = kind === 'brand' || kind === 'platform' || kind === 'author' ||
      commissioned || !!(font.brand && font.brand.name) || citeClosed;
    return brandish && (commissioned || forbids || freeOk || citeClosed || L.licenseFollows === 'own');
  }
  function brandLineageInviteHtml(font) {
    if (!isBrandCommercialRoot(font)) return '';
    const who = brandInviteWho(font) || '品牌方';
    return '<p class="lin-invite">此为「' + esc(who) +
      '」品牌商用授权字体。可按权利人条款免费商用。</p>';
  }
  function lineageInviteHtml(font, split) {
    if (!font) return '';
    const L = (font && font.lineage) || {};
    const open = WFProto.isOpenFont(font);
    /* 委托/合作或非开源：走品牌商用导语（可空）；开源师承导语只给可衍生开源字 */
    if (L.relation === 'commissioned' || L.relation === 'collab' || !open) {
      return brandLineageInviteHtml(font);
    }
    const chain = [];
    if (split && split.root) chain.push(split.root);
    if (split && split.via) split.via.forEach(function (f) { chain.push(f); });
    if (font && (!split || !split.root || font.id !== split.root.id)) chain.push(font);
    if (L.relation === 'fork' && chain.length >= 2) {
      const bits = [];
      for (let i = chain.length - 1; i >= 1; i--) {
        const parent = chain[i - 1];
        if (chain[i].id === font.id) {
          bits.push('此字体基于「' + esc(parent.name) + '」创作' + (i > 1 ? '，' : '。'));
        } else {
          bits.push(esc(chain[i].name) + '由「' + esc(parent.name) + '」派生。');
        }
      }
      bits.push('遵循原许可协议开源发布。');
      return '<p class="lin-invite">' + bits.join('') + '</p>';
    }
    /* 开源师承源头（思源等）；品牌组织顶卡文案在谱系页 seriesSub，不走这里 */
    if (L.relation === 'original' || !L.upstreamName) {
      return '<p class="lin-invite">此为开源字体谱系源头。许可允许修改后以其他名称再分发，须保留许可声明。</p>';
    }
    return '<p class="lin-invite">此字体允许衍生创作。修改后再分发须更名，并保留原授权声明。</p>';
  }
  function lineageTreeHtml(font, list, faceOf) {
    const split = lineageSplit(font, list);
    const invite = lineageInviteHtml(font, split);
    /* 只有自己当根不算树：要有真上游（名字/库外）、真下游，或链上还有父级 */
    const hasTree = !!(split.up || (split.downs && split.downs.length) || (split.all && split.all.length > 1));
    if (!hasTree && !invite) return '';
    const lead = hasTree
      ? '<p class="lin-lead">' + esc(split.L.groupName || split.up || (split.root && split.root.name) || '同系') +
          (!split.root && split.up ? ' · 原作不在库里' : '') + '</p>'
      : '';
    const listHtml = hasTree ? lineageListHtml(font, split, faceOf) : '';
    return invite + lead + listHtml;
  }

  function paintFav(btn) {
    const kind = btn.getAttribute('data-fav');
    const id = btn.getAttribute('data-id');
    const on = kind === 'author' ? WFProto.hasFavAuthor(id) : WFProto.hasFavFont(id);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? '取消收藏' : '收藏');
    btn.innerHTML = icon(on ? 'star-fill' : 'star');
  }
  function syncFavs() {
    document.querySelectorAll('[data-fav]').forEach(paintFav);
  }
  function favHtml(kind, id, name) {
    if (!id) return '';
    const on = kind === 'author' ? WFProto.hasFavAuthor(id) : WFProto.hasFavFont(id);
    return '<button type="button" class="fav' + (on ? ' is-on' : '') + '" data-fav="' + kind +
      '" data-id="' + esc(id) + '" data-name="' + esc(name || '') + '" aria-pressed="' +
      (on ? 'true' : 'false') + '" aria-label="' + (on ? '取消收藏' : '收藏') + '">' +
      icon(on ? 'star-fill' : 'star') + '</button>';
  }
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const kind = btn.getAttribute('data-fav');
    const id = btn.getAttribute('data-id');
    if (!id) return;
    const name = btn.getAttribute('data-name');
    const on = kind === 'author' ? WFProto.toggleFavAuthor(id, name) : WFProto.toggleFavFont(id, name);
    toast(on ? '已收藏' : '已取消收藏');
    syncFavs();
  });
  document.addEventListener('wf:favs', syncFavs);

  function foundryHtml(font, opts) {
    opts = opts || {};
    const info = opts.info || brandInfo(font);
    const name = (info && info.name) || brandName(font) || '未署名';
    const letter = avatarMark(info || name);
    const avatar = brandAvatar(font, info);
    const size = opts.small ? 24 : 40;
    const mark = avatar
      ? '<img src="' + esc(avatar) + '" alt="" width="' + size + '" height="' + size + '" loading="lazy" onerror="' + esc("this.replaceWith(Object.assign(document.createElement('span'),{className:'mark',textContent:" + JSON.stringify(letter) + "}))") + '" />'
      : '<span class="mark">' + esc(letter) + '</span>';
    const slug = (info && info.id) || brandSlug(font);
    const link = href('foundry.html?slug=' + encodeURIComponent(slug));
    const en = (info && info.en) || brandEn(font);
    const kind = kindLabel(info || font);
    const sub = [kind, opts.sub].filter(Boolean).join(' · ');
    const verified = !!(info && info.claimed);
    const enHtml = en && !opts.small && en !== name ? '<span class="en">' + esc(en) + '</span>' : '';
    const subHtml = sub ? '<span class="sub">' + esc(sub) + '</span>' : '';
    const cls = 'foundry' + (opts.small ? ' foundry-sm' : '') + (opts.cls ? ' ' + opts.cls : '');
    const badge = verified ? VERIFIED_SVG : '';
    if (opts.fav) {
      return '<div class="' + cls + '">' + mark +
        '<span><span class="name"><a href="' + link + '">' + esc(name) + '</a>' +
        badge + opts.fav + enHtml + '</span>' + subHtml + '</span></div>';
    }
    return '<a class="' + cls + '" href="' + link + '">' + mark +
      '<span><span class="name">' + esc(name) + badge + enHtml + '</span>' +
      subHtml + '</span></a>';
  }

  const CAT_LABEL = { '无衬线字体': '黑体', 'Mono': '等宽' };
  function catLabel(raw) { return CAT_LABEL[raw] || raw || ''; }

  function faceHtml(font, size, info) {
    const url = brandAvatar(font, info);
    if (!url) return '';
    const s = size || 16;
    const who = info || brandInfo(font);
    const letter = avatarMark(who);
    return '<img class="meta-face" src="' + esc(url) + '" alt="" width="' + s + '" height="' + s + '" loading="lazy" onerror="' + esc("this.replaceWith(Object.assign(document.createElement('span'),{className:'meta-face mark',textContent:" + JSON.stringify(letter) + "}))") + '" />';
  }

  /** 联合作者小条：头像 + 名，链到厂商页 */
  function partnerFaceHtml(info) {
    if (!info || !info.id) return '';
    const stub = { ownerInfo: info, foundryInfo: info, makerInfo: info };
    const avatar = brandAvatar(stub, info);
    const name = info.short || info.name || info.id;
    const letter = avatarMark(info);
    const mark = avatar
      ? '<img src="' + esc(avatar) + '" alt="" width="18" height="18" loading="lazy" onerror="' + esc("this.replaceWith(Object.assign(document.createElement('span'),{className:'mark',textContent:" + JSON.stringify(letter) + "}))") + '" />'
      : '<span class="mark">' + esc(letter) + '</span>';
    return '<a class="partner-face" href="' + href('foundry.html?slug=' + encodeURIComponent(info.id)) + '">' +
      mark + '<span>' + esc(info.name || name) + '</span></a>';
  }

  function licenseTier(font) {
    if (WFProto.licenseTier) return WFProto.licenseTier(font);
    const t = String((font && font.license) || '').trim();
    if (t === '免费商用' || t === '开源免费商用') return '免费商用';
    if (t === '联系授权' || t === '付费授权') return '需授权';
    if (t === '个人免费') return '个人免费';
    return '待核实';
  }

  function loadSearch() {
    if (window.WFSearch || document.querySelector('script[data-wf-search]')) {
      if (window.WFSearch) WFSearch.mount();
      return;
    }
    const s = document.createElement('script');
    s.src = href('js/wf-search.js?v=20260929g1');
    s.setAttribute('data-wf-search', '');
    s.onload = function () { if (window.WFSearch) WFSearch.mount(); };
    document.head.appendChild(s);
  }

  /* 外链确认。自家域名直接走；第三方先问，可在本会话记住该域名。 */
  const EXIT_OWN = ['windfonts.com', 'wenfeng.org', 'motucloud.com', 'weixiaoduo.com', 'feibisi.com', 'feicode.com', 'wenpai.org', 'wenpai.net'];
  const EXIT_KEY = 'wf-exit-skip:';
  let exitBound = false;
  function exitHost(name) {
    return String(name || '').replace(/^www\./i, '').replace(/\.$/, '').toLowerCase();
  }
  function exitOwn(host) {
    const h = exitHost(host);
    if (!h) return true;
    return EXIT_OWN.some(function (d) { return h === d || h.slice(-(d.length + 1)) === '.' + d; });
  }
  function exitExternalHost(href) {
    const raw = String(href || '').trim();
    if (!raw || raw.charAt(0) === '#' || raw.charAt(0) === '?' || raw.charAt(0) === '/') return '';
    if (/^(mailto:|tel:|javascript:|data:)/i.test(raw)) return '';
    let url;
    try { url = new URL(raw, window.location.href); } catch (e) { return ''; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    if (url.origin === window.location.origin || exitOwn(url.hostname)) return '';
    if (/\.(png|jpe?g|gif|webp|svg|zip|pdf)(\?.*)?$/i.test(url.pathname)) return '';
    return exitHost(url.hostname);
  }
  function exitRemembered(host) {
    try { return sessionStorage.getItem(EXIT_KEY + host) === '1'; } catch (e) { return false; }
  }
  function exitRemember(host) {
    try { sessionStorage.setItem(EXIT_KEY + host, '1'); } catch (e) { /* 隐私模式写不进就每次都问 */ }
  }
  function showExternalExit(link, host) {
    const prev = document.getElementById('wfDialog');
    if (prev) prev.remove();
    const wrap = document.createElement('div');
    wrap.id = 'wfDialog';
    wrap.className = 'dialog-back';
    wrap.innerHTML =
      '<div class="dialog dialog-exit" role="dialog" aria-modal="true" aria-labelledby="wfDialogTitle">' +
        '<h3 id="wfDialogTitle">即将离开文风</h3>' +
        '<p>你将打开第三方网站。该站内容由对方运营方负责。</p>' +
        '<p class="exit-host">' + esc(host) + '</p>' +
        '<p class="exit-url">' + esc(link.href) + '</p>' +
        '<label class="exit-remember"><input type="checkbox" data-remember /> <span>本会话内跳过该域名提示</span></label>' +
        '<div class="dialog-acts">' +
          '<button type="button" class="btn" data-no>留在本站</button>' +
          '<button type="button" class="btn btn-ink" data-yes>继续前往</button>' +
        '</div></div>';
    document.body.appendChild(wrap);
    const no = wrap.querySelector('[data-no]');
    const yes = wrap.querySelector('[data-yes]');
    const box = wrap.querySelector('[data-remember]');
    const buttons = [box, no, yes];
    document.body.style.overflow = 'hidden';
    const done = function (go) {
      wrap.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      if (go) {
        if (box.checked) exitRemember(host);
        window.open(link.href, '_blank', 'noopener,noreferrer');
      } else if (link.focus) {
        link.focus();
      }
    };
    const onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); done(false); return; }
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const i = buttons.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? buttons.length - 1 : i - 1) : (i === buttons.length - 1 || i < 0 ? 0 : i + 1);
      buttons[next].focus();
    };
    no.addEventListener('click', function () { done(false); });
    yes.addEventListener('click', function () { done(true); });
    wrap.addEventListener('click', function (e) { if (e.target === wrap) done(false); });
    document.addEventListener('keydown', onKey);
    no.focus();
  }
  function bindExternalExit() {
    if (exitBound) return;
    exitBound = true;
    document.addEventListener('click', function (e) {
      if (!(e.target instanceof Element) || document.getElementById('wfDialog')) return;
      const link = e.target.closest('a[href]');
      if (!link || e.defaultPrevented) return;
      if (link.closest('#wfDialog, .wf-exit-skip')) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (link.hasAttribute('download')) return;
      const host = exitExternalHost(link.getAttribute('href') || link.href);
      if (!host) return;
      link.setAttribute('target', '_blank');
      const rel = (link.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
      ['noopener', 'noreferrer'].forEach(function (bit) {
        if (!rel.some(function (x) { return x.toLowerCase() === bit; })) rel.push(bit);
      });
      link.setAttribute('rel', rel.join(' '));
      if (exitRemembered(host)) return;
      e.preventDefault();
      e.stopPropagation();
      showExternalExit(link, host);
    }, true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyPricingVisibility();
    bindExternalExit();
    document.querySelectorAll('[data-topbar]').forEach(renderTopbar);
    ensureFooter();
    const s = document.getElementById('navSearch');
    if (s) WFProto.bindNavSearch(s, document.getElementById('navSearchClear'));
    loadSearch();
  });

  function holdScroll(node, fn, lockY) {
    fn();
    if (lockY == null) return;
    function fix() { window.scrollTo(0, lockY); }
    fix(); requestAnimationFrame(fix); requestAnimationFrame(function () { requestAnimationFrame(fix); });
  }

  /* —— 谱系图模态：当前页 iframe 嵌入；点「全宽」才进 lineage 整页 —— */
  function lineageModalSrc(opts) {
    opts = opts || {};
    let src = '';
    if (opts.href) {
      try {
        const u = new URL(opts.href, location.href);
        u.searchParams.set('embed', '1');
        u.searchParams.delete('width');
        src = u.href;
      } catch (e) {
        src = String(opts.href || '');
        src += (src.indexOf('?') >= 0 ? '&' : '?') + 'embed=1';
      }
      return src;
    }
    const p = new URLSearchParams();
    if (opts.group) p.set('group', opts.group);
    if (opts.view) p.set('view', opts.view);
    if (opts.mode) p.set('mode', opts.mode);
    if (opts.focus) p.set('focus', opts.focus);
    p.set('embed', '1');
    return href('lineage.html?' + p.toString());
  }

  function openLineageModal(opts) {
    opts = opts || {};
    const prev = document.getElementById('wfLineageModal');
    if (prev) prev.remove();
    const src = lineageModalSrc(opts);
    if (!src) return;
    const wrap = document.createElement('div');
    wrap.id = 'wfLineageModal';
    wrap.className = 'dialog-back dialog-back-lineage';
    wrap.innerHTML =
      '<div class="dialog dialog-lineage" role="dialog" aria-modal="true" aria-labelledby="wfLineageModalTitle">' +
        '<div class="dialog-lineage-head">' +
          '<h3 id="wfLineageModalTitle">谱系图</h3>' +
          '<button type="button" class="icon-btn dialog-lineage-close" data-close aria-label="关闭">' + icon('close') + '</button>' +
        '</div>' +
        '<iframe class="dialog-lineage-frame" title="谱系图" src="' + esc(src) + '"></iframe>' +
      '</div>';
    document.body.appendChild(wrap);
    const dialog = wrap.querySelector('.dialog-lineage');
    const closeBtn = wrap.querySelector('[data-close]');
    const frame = wrap.querySelector('iframe');
    const prior = document.activeElement;
    document.body.style.overflow = 'hidden';
    let closed = false;
    const done = function () {
      if (closed) return;
      closed = true;
      wrap.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('message', onMsg);
      if (prior && prior.focus) prior.focus();
    };
    const onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); done(); return; }
      if (e.key !== 'Tab') return;
      /* 焦点在关闭钮与 iframe 之间轮转；iframe 内 Esc 由 embed 发 postMessage */
      const nodes = [closeBtn, frame];
      const i = nodes.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.shiftKey ? (i <= 0 ? nodes.length - 1 : i - 1) : (i === nodes.length - 1 || i < 0 ? 0 : i + 1);
      nodes[next].focus();
    };
    const onMsg = function (e) {
      if (!e || !e.data || e.data.type !== 'wf-lineage-embed-close') return;
      if (frame && e.source && e.source !== frame.contentWindow) return;
      done();
    };
    closeBtn.addEventListener('click', done);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) done(); });
    document.addEventListener('keydown', onKey);
    window.addEventListener('message', onMsg);
    closeBtn.focus();
  }

  document.addEventListener('click', function (e) {
    const a = e.target && e.target.closest ? e.target.closest('a[data-lineage-modal]') : null;
    if (!a) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    openLineageModal({ href: a.getAttribute('href') });
  });

  window.WFChrome = {
    ROOT: ROOT,
    href: href,
    user: user,
    canAccessApp: canAccessApp,
    login: login,
    logout: logout,
    toast: toast,
    copy: copy,
    confirm: confirm,
    promptInput: promptInput,
    icon: icon,
    theme: theme,
    toggleTheme: toggleTheme,
    view: view,
    setView: setView,
    brandInfo: brandInfo,
    makerInfo: makerInfo,
    brandName: brandName,
    brandEn: brandEn,
    brandShort: brandShort,
    brandSite: brandSite,
    brandAvatar: brandAvatar,
    isPersonalFoundry: isPersonalFoundry,
    avatarMark: avatarMark,
    faceHtml: faceHtml,
    partnerFaceHtml: partnerFaceHtml,
    catLabel: catLabel,
    brandSlug: brandSlug,
    brandVerified: brandVerified,
    brandKind: brandKind,
    skipGlyphCov: skipGlyphCov,
    kindLabel: kindLabel,
    claimProfile: claimProfile,
    foundryHtml: foundryHtml,
    favHtml: favHtml,
    syncFavs: syncFavs,
    licenseTier: licenseTier,
    licenseEvidence: licenseEvidence,
    sourceKindLabel: sourceKindLabel,
    licenseCiteHtml: licenseCiteHtml,
    lineageHtml: lineageHtml,
    lineageKin: lineageKin,
    lineageSplit: lineageSplit,
    lineageTreeHtml: lineageTreeHtml,
    lineageListHtml: lineageListHtml,
    findFontByName: findFontByName,
    suggestLineageFallback: suggestLineageFallback,
    REL_LABEL: REL_LABEL,
    showPricing: showPricing,
    VERIFIED_SVG: VERIFIED_SVG,
    holdScroll: holdScroll,
    openLineageModal: openLineageModal
  };
})();
