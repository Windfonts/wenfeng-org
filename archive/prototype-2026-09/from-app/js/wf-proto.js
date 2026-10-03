/* Shared specimen + pick bag + catalog (fonts-list.json thin) — v3.3 */
(function () {
  const KEY = 'wf-proto-picks';
  const FAV_KEY = 'wf-favs';
  const SAMPLE_KEY = 'wf-proto-sample.v3';
  const SIZE_KEY = 'wf-proto-size';
  const SPECIMEN_CFG_KEY = 'wf-proto-specimen-cfg.v1';
  const DEFAULT_SPECIMEN = {
    listDefault: '春风又绿江南岸',
    detailPreset: 'poem',
    size: 40,
    wallText: '天地玄黄 宇宙洪荒 日月盈昃 Aa 0123',
    presets: [
      { id: 'line', label: '短句', text: '春风又绿江南岸' },
      { id: 'title', label: '标题', text: '字里行间' },
      { id: 'para', label: '段落', text: '天地玄黄，宇宙洪荒' },
      { id: 'brand', label: '品牌', text: '文派 Wenpai' },
      { id: 'poem', label: '诗句', text: '行到水穷处，坐看云起时' },
      { id: 'mix', label: '中英数', text: '汉字 Hànzì Aa 0123' }
    ]
  };
  const PAGE_SIZE = 10;
  /* 预览真源：cn.windfonts.com/fonts-packages/{Normalized}/{Weight}/{full|zh-common}/result.css
     （与 app /api/css 同源拆包）。旧路径 /wenfeng/fonts/{slug}/{weight}/web/ 仅兜底。
     嵌入「动态」给 Google 风格查询参数：{cdn}/api/css?family=&weight=&version=。 */
  /* 域名口径：详见 docs/DOMAIN-ARCHITECTURE.md
     - app = fonts-front → OSS（纯前端）
     - vault = fonts-vault Next（字体后端）；api. = 平台网关预留，勿直绑 Next
     - cn/hk/en/jp = CDN only；嵌入写 CDN，回源 vault
     - 本地预览：127.0.0.1:16016 */
  const CDN = 'https://cn.windfonts.com';
  const SITE_ORIGIN = 'https://app.windfonts.com'; /* OSS 前端正式域 */
  const CSS_API = 'https://vault.windfonts.com'; /* Next 字体后端；过渡可临时改回 app */
  const ANALYSIS_META_VER = '20260927r15z1'; /* 边缘长缓存；升元数据时递增；与 analysisMetaUrl 对齐 */
  /** 生产禁止；仅 staging 构建可改 true */
  const ALLOW_DEMO = false;
  const CDN_KEY = 'wf-cdn';
  const STATS_KEY = 'wf-font-stats.v1';
  const VIEWED_KEY = 'wf-font-viewed';
  const CDN_HOSTS = [
    { id: 'cn', label: '中国', host: 'cn.windfonts.com', edge: 'cybercdn' },
    { id: 'hk', label: '香港', host: 'hk.windfonts.com', edge: 'cloudflare' },
    { id: 'en', label: '国际', host: 'en.windfonts.com', edge: 'cloudflare' },
    { id: 'jp', label: '日本', host: 'jp.windfonts.com', edge: 'cloudflare' }
  ];
  const CDN_LICENSE_NOTE = '<!-- 此中文网页字体由文风字体（Windfonts）免费提供，您可以自由引用，请务必保留此授权许可标注 https://wenfeng.org/license -->';
  const CSS_TO_NAME = { '100': 'thin', '200': 'extralight', '300': 'light', '350': 'demilight', '400': 'regular', '450': 'text', '500': 'medium', '600': 'semibold', '700': 'bold', '800': 'extrabold', '900': 'heavy', '950': 'black' };

  const EXTRA_LINKS = [
    { label: '关于', path: 'about.html' },
    { label: '文档', path: 'docs.html' }
  ];
  const ICP_HREF = 'https://beian.miit.gov.cn/';
  const ICP_NO = '粤ICP备2023091240号-3';
  function copyrightYear() {
    return String(new Date().getFullYear());
  }
  function copyrightLine() {
    return '版权所有 · 文风 ™ · © ' + copyrightYear() + ' 文派（广州）科技有限公司';
  }

  const WEIGHT_MAP = {
    thin: '100', extralight: '200', 'extra-light': '200', ultralight: '200', 'ultra-light': '200', light: '300',
    demilight: '350', 'demi-light': '350', book: '350',
    /* Adobe Source Han usWeightClass: Normal=350 (与 DemiLight 同档数值)、Regular=400。
       Text / Round 等非标准名用独立数值，避免多 @font-face 互相覆盖 */
    text: '450',
    round: '450',
    normal: '350',
    regular: '400', roman: '400',
    medium: '500',
    demi: '600', demibold: '600', 'demi-bold': '600', semibold: '600', 'semi-bold': '600',
    bold: '700',
    /* Ultra / ExtraBold → 800。Heavy → 900（对齐 Adobe usWeightClass / 普惠体 CDN）。
       Black → 950：与 Heavy 分档（普惠体等 ExtraBold+Heavy+Black 三包并存时避免 @font-face 互盖；
       同 Normal→350 分档思路）。勿与 ultralight 混淆。 */
    ultra: '800', extrabold: '800', 'extra-bold': '800', ultrabold: '800', 'ultra-bold': '800',
    heavy: '900',
    black: '950', ultrablack: '950', 'ultra-black': '950',
    italic: '400', oblique: '400',
    lightitalic: '300', mediumitalic: '500', extralightitalic: '200'
  };

  let catalog = [];
  let catalogPromise = null;
  const injectedCss = {};

  function dataUrl(file) {
    try {
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || '';
        if (src.indexOf('wf-proto.js') !== -1) {
          return new URL('../data/' + file, src).href;
        }
      }
    } catch (e) { /* ignore */ }
    const base = location.pathname.replace(/\/[^/]*$/, '/');
    if (base.indexOf('/admin') !== -1) return '../data/' + file;
    return 'data/' + file;
  }
  function catalogUrl() { return dataUrl('fonts-list.json?v=20260929list3'); }
  function analysisMetaUrl() {
    /* CyberCDN 按查询串分变体缓存：换数据必须换新版本值（旧变体会粘住陈旧内容），
       全新值首次回源即全量。20260925b 曾在重建中途被缓存成 1-2 字体的残缺变体。 */
    return CDN + '/fonts-packages/metadata/font-analysis.json?v=20260927r15z1'; /* 20260927r15z1: R15 EqHi/Chuanqu/Mizuki+Honglei×5 onto zoomla1 499 */
  }

  /* —— 厂商字典：data/foundries.json 是厂商名称的唯一真相来源（中文名 / 英文 / 简称 / 官网） —— */
  let foundries = [];
  let avatars = {};
  let licenseEvidenceData = { standards: {}, names: {} };
  let lineageData = { groups: {}, byName: {} };
  const foundryByAlias = {};
  const foundryByFont = {};
  function normKey(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function isUrlSlug(s) { return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(String(s || '')); }
  /* URL 路径段禁止中文。拉丁名压成 kebab；纯中文未入字典时用稳定短码，不进路径。 */
  function slugify(s) {
    const raw = String(s || '').trim();
    const ascii = raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (ascii) return ascii;
    let h = 2166136261;
    for (let i = 0; i < raw.length; i++) {
      h ^= raw.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return 'f' + (h >>> 0).toString(36);
  }
  function foundryUrlSlug(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (isUrlSlug(s)) return s;
    const hit = foundryByAlias[normKey(s)] || foundryByAlias[normKey(s.split(/[;；]/)[0])];
    if (hit && hit.id) return hit.id;
    return slugify(s);
  }

  function getAvatarUrl(id) {
    const u = (id && avatars[id]) || '';
    if (!u || /^https?:\/\//i.test(u)) return '';
    return u;
  }
  function indexFoundries(list) {
    foundries = list;
    list.forEach(function (fd) {
      if (!fd.avatarUrl && avatars[fd.id]) fd.avatarUrl = avatars[fd.id];
      foundryByAlias[normKey(fd.id)] = fd;
      (fd.aliases || []).forEach(function (a) { foundryByAlias[normKey(a)] = fd; });
      foundryByAlias[normKey(fd.name)] = fd;
      if (fd.en) foundryByAlias[normKey(fd.en)] = fd;
      (fd.fontNames || []).forEach(function (n) { foundryByFont[n] = fd; });
    });
  }
  /** 目录原始厂商字符串 → 字典条目；未收录的按原文生成临时条目 */
  function resolveFoundry(raw) {
    const brandRaw = (raw.brand && raw.brand.name) || raw.foundry || '';
    const hit = foundryByAlias[normKey(brandRaw)] || foundryByAlias[normKey(String(brandRaw).split(/[;；]/)[0])] || foundryByFont[raw.name];
    if (hit) return hit;
    const first = String(brandRaw).split(/[;；]/)[0].trim();
    if (!first) return null;
    return { id: slugify(first), name: first, en: /^[\x00-\x7f]+$/.test(first) ? first : '', short: first, website: (raw.brand && raw.brand.website) || '', aliases: [first], unlisted: true };
  }

  function normalizeFont(raw) {
    const weights = Array.isArray(raw.weights) && raw.weights.length ? raw.weights.slice() : ['Regular'];
    const tags = Array.isArray(raw.tags) ? raw.tags.slice() : [];
    const designerShort = raw.designerShort ||
      String(raw.designer || '').split(/[;；,，]/)[0].trim() || '—';
    return Object.assign({}, raw, {
      weights: weights,
      tags: tags,
      foundryInfo: resolveFoundry(raw),
      designerShort: designerShort,
      styles: weights.length,
      detail: detailHref(raw)
    });
  }

  /**
   * 目录数据：网络优先 + Cache API 弱网兜底（caches.open('wf-catalog-v1')）。
   * 缓存键 = 完整请求 URL（含 ?v=），升版本即换键、旧条目自然失效。
   * 在线成功时更新缓存；失败/超时再读缓存，不替用户吞掉版本变更。
   * 对外仍返回 Promise<catalog[]>，与改前一致。
   */
  const CATALOG_CACHE = 'wf-catalog-v1';
  const CATALOG_NET_MS = 4500;
  function openCatalogCache() {
    if (typeof caches === 'undefined' || !caches.open) return Promise.resolve(null);
    return caches.open(CATALOG_CACHE).catch(function () { return null; });
  }
  function fetchJsonCached(url, fallback) {
    const abs = (function () {
      try { return new URL(url, location.href).href; } catch (e) { return url; }
    })();
    let networkSettled = false;
    const network = fetch(abs).then(function (r) {
      networkSettled = true;
      if (!r.ok) throw new Error(abs + ' ' + r.status);
      const clone = r.clone();
      openCatalogCache().then(function (cache) {
        if (cache) cache.put(abs, clone).catch(function () { /* ignore */ });
      });
      return r.json();
    });
    const timed = new Promise(function (resolve, reject) {
      const t = setTimeout(function () {
        if (!networkSettled) reject(new Error('slow'));
      }, CATALOG_NET_MS);
      network.then(function (j) { clearTimeout(t); resolve(j); }, function (err) { clearTimeout(t); reject(err); });
    });
    return timed.catch(function () {
      return openCatalogCache().then(function (cache) {
        if (!cache) return network.catch(function () { return fallback; });
        return cache.match(abs).then(function (hit) {
          if (hit) {
            /* 慢网：先吐缓存，后台仍等网络写新缓存 */
            network.catch(function () { /* already falling back */ });
            return hit.json();
          }
          return network.catch(function () { return fallback; });
        });
      });
    });
  }
  function loadCatalog() {
    if (catalog.length) return Promise.resolve(catalog);
    if (catalogPromise) return catalogPromise;
    /* 热路径只拉瘦目录 fonts-list.json。详情再 enrichFontFromFull 按 slug 补肥字段。 */
    const fontsReq = fetchJsonCached(catalogUrl(), null).then(function (j) {
      if (Array.isArray(j)) return j;
      throw new Error('fonts-list.json invalid');
    });
    const foundriesReq = fetchJsonCached(dataUrl('foundries.json?v=20260929ka1'), { foundries: [] });
    const evidenceReq = fetchJsonCached(dataUrl('license-evidence.json?v=20260925b'), { standards: {}, names: {} });
    const lineageReq = fetchJsonCached(dataUrl('font-lineage.json?v=20260929ka1'), { groups: {}, byName: {} });
    const avatarsReq = fetchJsonCached(dataUrl('avatars.json?v=20260928av9'), {});
    catalogPromise = Promise.all([fontsReq, foundriesReq, evidenceReq, lineageReq, avatarsReq])
      .then(function (res) {
        avatars = (res[4] && typeof res[4] === 'object') ? res[4] : {};
        indexFoundries((res[1] && res[1].foundries) || []);
        licenseEvidenceData = res[2] || { standards: {}, names: {} };
        lineageData = res[3] || { groups: {}, byName: {} };
        catalog = (Array.isArray(res[0]) ? res[0] : []).map(function (raw) {
          const font = normalizeFont(raw);
          font.lineage = resolveLineage(font);
          font.ownerInfo = font.lineage.ownerInfo || font.foundryInfo;
          font.makerInfo = font.lineage.makerInfo || font.foundryInfo;
          font.collaboratorInfos = font.lineage.collaboratorInfos || [];
          font.licenseEvidence = resolveLicenseEvidence(font);
          return font;
        });
        return applyClaimStatusOverlay().then(function () { return catalog; });
      })
      .catch(function (err) {
        console.warn('[WFProto] catalog load failed', err);
        catalog = [];
        return catalog;
      });
    return catalogPromise;
  }

  const FAT_KEYS = ['description', 'descriptionBrief', 'copyright', 'licenseNotes', 'licenseFileUrl', 'licenseUrl', 'purchaseUrl', 'version'];
  function enrichFontFromFull(font) {
    if (!font) return Promise.resolve(font);
    if (font._fat) return Promise.resolve(font);
    const stem = String(font.normalized || '').trim() || familySlug(font.family);
    if (!stem) {
      font._fat = true;
      return Promise.resolve(font);
    }
    const url = dataUrl('fonts-by-slug/' + encodeURIComponent(stem) + '.json?v=20260929list3');
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    }).then(function (fat) {
      if (fat && typeof fat === 'object') {
        FAT_KEYS.forEach(function (k) {
          if (fat[k] != null && fat[k] !== '') font[k] = fat[k];
        });
      }
      font._fat = true;
      return font;
    }).catch(function () {
      font._fat = true;
      return font;
    });
  }

  /** vault 审核通过的 claimed 覆盖层（不改 foundries.json 也可立刻显示）。 */
  function applyClaimStatusOverlay() {
    const base = CSS_API || 'https://vault.windfonts.com';
    return fetch(base + '/api/foundries/claim-status')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (body) {
        const bySlug = (body && body.data && body.data.bySlug) || (body && body.bySlug) || {};
        const slugs = Object.keys(bySlug);
        if (!slugs.length) return;
        foundries.forEach(function (fd) {
          const st = bySlug[fd.id] || bySlug[String(fd.id || '').toLowerCase()];
          if (!st) return;
          if (st.claimed) fd.claimed = true;
          if (st.page && typeof st.page === 'object') {
            if (st.page.intro) fd.description = String(st.page.intro);
            if (st.page.site) fd.website = String(st.page.site);
            if (st.page.links) fd.links = String(st.page.links);
            if (st.page.repo) fd.repo = String(st.page.repo);
            fd.pagePublishedAt = st.page.publishedAt || '';
          }
        });
        catalog.forEach(function (font) {
          if (font.ownerInfo && bySlug[font.ownerInfo.id] && bySlug[font.ownerInfo.id].claimed) {
            font.ownerInfo.claimed = true;
          }
          if (font.foundryInfo && bySlug[font.foundryInfo.id] && bySlug[font.foundryInfo.id].claimed) {
            font.foundryInfo.claimed = true;
          }
        });
      })
      .catch(function () { /* vault 不可达时忽略 */ });
  }

  function loadPicks() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  let picksPushTimer = null;
  let picksSuppressPush = false;
  function schedulePicksPush(arr) {
    if (picksSuppressPush) return;
    if (!window.WFApi || typeof WFApi.putPicks !== 'function' || WFApi.isMock()) return;
    try {
      const s = window.WFApp && WFApp.state && WFApp.state();
      if (!s || !s.settings || !s.settings.apiKey) return;
    } catch (e) { return; }
    clearTimeout(picksPushTimer);
    picksPushTimer = setTimeout(function () {
      WFApi.putPicks(arr).catch(function () { /* 离线或未登录时忽略 */ });
    }, 450);
  }
  function savePicks(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
    updateBadges(arr.length);
    document.dispatchEvent(new CustomEvent('wf:picks', { detail: arr }));
    schedulePicksPush(arr);
  }
  /** 写本地但不推 vault（合并拉取后用）。 */
  function replacePicksLocal(arr) {
    picksSuppressPush = true;
    try {
      savePicks(arr || []);
    } finally {
      picksSuppressPush = false;
    }
  }
  /** 登录后：本地 ∪ vault，再写回两边。 */
  function syncPicksWithVault() {
    if (!window.WFApi || typeof WFApi.syncPicks !== 'function' || WFApi.isMock()) {
      return Promise.resolve(loadPicks());
    }
    return WFApi.syncPicks(loadPicks()).then(function (merged) {
      replacePicksLocal(merged || []);
      WFProto.syncJoinButtons();
      return merged || [];
    });
  }
  function loadFavs() {
    try {
      const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '{}');
      return {
        fonts: Array.isArray(raw.fonts) ? raw.fonts : [],
        authors: Array.isArray(raw.authors) ? raw.authors : []
      };
    } catch (e) { return { fonts: [], authors: [] }; }
  }
  let favsPushTimer = null;
  let favsSuppressPush = false;
  function scheduleFavsPush(data) {
    if (favsSuppressPush) return;
    if (!window.WFApi || typeof WFApi.putFavs !== 'function' || WFApi.isMock()) return;
    try {
      const s = window.WFApp && WFApp.state && WFApp.state();
      if (!s || !s.settings || !s.settings.apiKey) return;
    } catch (e) { return; }
    clearTimeout(favsPushTimer);
    favsPushTimer = setTimeout(function () {
      WFApi.putFavs(data).catch(function () { /* ignore */ });
    }, 450);
  }
  function saveFavs(data) {
    localStorage.setItem(FAV_KEY, JSON.stringify({ fonts: data.fonts, authors: data.authors }));
    document.dispatchEvent(new CustomEvent('wf:favs'));
    scheduleFavsPush(data);
  }
  function replaceFavsLocal(data) {
    favsSuppressPush = true;
    try {
      saveFavs(data || { fonts: [], authors: [] });
    } finally {
      favsSuppressPush = false;
    }
  }
  function syncFavsWithVault() {
    if (!window.WFApi || typeof WFApi.syncFavs !== 'function' || WFApi.isMock()) {
      return Promise.resolve(loadFavs());
    }
    return WFApi.syncFavs(loadFavs()).then(function (merged) {
      replaceFavsLocal(merged || { fonts: [], authors: [] });
      return merged || { fonts: [], authors: [] };
    });
  }
  function hasFav(list, id) {
    return !!list.find(function (x) { return x.id === id; });
  }
  function toggleFav(bucket, id, name) {
    const data = loadFavs();
    const list = data[bucket];
    const i = list.findIndex(function (x) { return x.id === id; });
    if (i >= 0) list.splice(i, 1);
    else list.push({ id: id, name: name || id });
    saveFavs(data);
    return i < 0;
  }

  function updateBadges(n) {
    document.querySelectorAll('[data-pick-count]').forEach(function (el) {
      el.textContent = String(n);
      el.setAttribute('data-count', String(n));
    });
  }

  function getById(id) {
    if (!id) return null;
    for (let i = 0; i < catalog.length; i++) {
      if (catalog[i].id === id) return catalog[i];
    }
    return null;
  }

  /** 详情 URL 路径段：只允许 [A-Za-z0-9_-]。中文名不进 /fonts/。 */
  function fontUrlSlug(raw) {
    const s = String(raw || '').trim().toLowerCase().replace(/^wenfeng-/, '').replace(/^windfonts-/, '');
    if (!s) return '';
    if (isUrlSlug(s)) return resolveFamilyAlias(s);
    return slugify(s);
  }
  /** 详情页 / 卡片公开 slug：优先 family 短码（wenfeng-albbpht → albbpht），
   *  不用 OSS normalized 文件名堆砌（SourceHanSansSCRegular）。旧 normalized 链仍可由 getBySlug 解析。 */
  function fontSlug(font) {
    if (!font) return '';
    const fromFamily = familySlug(font.family);
    if (fromFamily) return fontUrlSlug(fromFamily);
    return fontUrlSlug(font.normalized);
  }

  /* 去重弃用短码 → 保留短码（与 vault data/family-aliases.json 对齐） */
  /* 仅同产品别名；思源空壳/屏显错绑已撤；空壳目录已下架 */
  const FAMILY_ALIASES = {
    'hxbsbt': 'hxbsb', 'hzpyt': 'hzpy', 'kslmt': 'kslyt', 'myrbsxt': 'mysxt', 'qtqmt': 'qtxmt', 'cq': 'chuanqu',
    'huxiaobokuhei': 'zkkht', 'happyzcool2016': 'zkklt',
    'opposansb': 'opsa', 'light': 'systcnl', 'lmqylsrht': 'lmqylszrht',
    /* 2026-09-29 双登记：vault 长码 → 店面短码 */
    'hongleibanshu': 'hlbs', 'hongleixiaozhitiao': 'hlxzt', 'hongleibanshuformal': 'hlbszs',
    'hongleixingshu': 'hlxs', 'hongleizhuoshu': 'hlzs', 'mizukigothic': 'smht',
    'zoomlacusong': 'zlcs', 'zoomlamengyas': 'zlmeng', 'howlingeqhisans': 'eqhi',
    'mksjhtc': 'matc', 'xczzsch': 'xcws'
  };
  function resolveFamilyAlias(token) {
    let s = String(token || '').trim().toLowerCase().replace(/^wenfeng-/, '').replace(/^windfonts-/, '');
    if (FAMILY_ALIASES[s]) s = FAMILY_ALIASES[s];
    return s;
  }

  function getBySlug(slug) {
    const raw = String(slug || '').trim();
    let s = resolveFamilyAlias(raw);
    if (!s && !raw) return null;
    const key = String(s || raw).trim().toLowerCase();
    const rawKey = raw.toLowerCase();
    for (let i = 0; i < catalog.length; i++) {
      const f = catalog[i];
      if (String(f.normalized || '').toLowerCase() === key) return f;
      if (familySlug(f.family).toLowerCase() === key) return f;
      if (rawKey && String(f.name || '').trim().toLowerCase() === rawKey) return f;
      if (rawKey && String(f.en || '').trim().toLowerCase() === rawKey) return f;
    }
    return null;
  }

  /**
   * 生产域省略 .html；font-detail/foundry 查询串收敛为 /fonts/{slug}、/foundry/{slug}。
   * 本机 / staging-preview 仍由 WFChrome.href 跳过本函数（isDevPreviewHost）。
   */
  function livePagePath(path) {
    path = String(path == null ? '' : path).trim();
    if (!path || /^https?:/i.test(path) || path.charAt(0) === '#' || path.indexOf('//') === 0) return path;
    const qIdx = path.indexOf('?');
    const hashIdx = path.indexOf('#');
    let hash = '';
    if (hashIdx >= 0) { hash = path.slice(hashIdx); path = path.slice(0, hashIdx); }
    let qs = '';
    let base = path;
    if (qIdx >= 0 && (hashIdx < 0 || qIdx < hashIdx)) {
      /* re-parse without hash already stripped */
    }
    const qi = path.indexOf('?');
    if (qi >= 0) { qs = path.slice(qi + 1); base = path.slice(0, qi); }
    base = base.replace(/^\.\//, '').replace(/^\//, '');
    const params = {};
    if (qs) {
      qs.split('&').forEach(function (pair) {
        if (!pair) return;
        const eq = pair.indexOf('=');
        const k = decodeURIComponent(eq >= 0 ? pair.slice(0, eq) : pair);
        const v = decodeURIComponent(eq >= 0 ? pair.slice(eq + 1) : '');
        params[k] = v;
      });
    }
    const file = base.split('/').pop() || base;
    if (file === 'font-detail.html' || file === 'font-detail') {
      const slug = fontUrlSlug(params.slug || '');
      delete params.slug; delete params.id;
      const extra = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
      if (slug) return 'fonts/' + encodeURIComponent(slug) + (extra ? '?' + extra : '') + hash;
      if (params.id) {
        const rest = extra ? '&' + extra : '';
        return 'font-detail.html?id=' + encodeURIComponent(params.id) + rest + hash;
      }
      return 'fonts' + hash;
    }
    if (file === 'foundry.html' || file === 'foundry') {
      const slug = foundryUrlSlug(params.slug || '');
      delete params.slug;
      const extra = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
      if (slug) return 'foundry/' + encodeURIComponent(slug) + (extra ? '?' + extra : '') + hash;
      return 'foundry' + hash;
    }
    /* 站点根：index.html → / 。带目录的 app/index.html 仍是控制台。 */
    if (base.indexOf('/') < 0 && (file === 'index.html' || file === 'index')) {
      const extra = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
      return '/' + (extra ? '?' + extra : '') + hash;
    }
    if (/\.html$/i.test(file)) {
      const dir = base.indexOf('/') >= 0 ? base.slice(0, base.lastIndexOf('/') + 1) : '';
      const stem = file.replace(/\.html$/i, '');
      const extra = Object.keys(params).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
      }).join('&');
      return dir + stem + (extra ? '?' + extra : '') + hash;
    }
    return path.replace(/^\//, '') + hash;
  }

  /** 厂商页：生产 foundry/{slug}；本机 foundry.html?slug= */
  function foundryHref(slug, extra) {
    const host = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
    const onApp = host === 'app.windfonts.com' || host === 'staging-app.windfonts.com';
    const s = foundryUrlSlug(slug);
    if (onApp && !extra) {
      return s ? 'foundry/' + encodeURIComponent(s) : 'foundry';
    }
    const parts = [];
    if (s) parts.push('slug=' + encodeURIComponent(s));
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] == null || extra[k] === '') return;
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(extra[k]));
      });
    }
    if (onApp && parts.length) return '/foundry.html?' + parts.join('&');
    return 'foundry.html' + (parts.length ? '?' + parts.join('&') : '');
  }

    /** 正式站详情：app /fonts/{slug}（OSS 静态 + 边缘 rewrite → font-detail.html）。 */
  function publicDetailPath(font) {
    const slug = fontUrlSlug(fontSlug(font) || (font && font.normalized));
    if (!slug) return '/fonts';
    return '/fonts/' + encodeURIComponent(slug);
  }
  function publicDetailUrl(font) {
    return SITE_ORIGIN + publicDetailPath(font);
  }
  /** 站内详情链：在 app 主机上走 /fonts/{slug}；本地静态原型仍用 font-detail.html。 */
  function detailHref(font, extra) {
    const host = String((typeof location !== 'undefined' && location.hostname) || '').toLowerCase();
    const onApp = host === 'app.windfonts.com' || host === 'staging-app.windfonts.com';
    if (onApp && !extra) return publicDetailPath(font);
    const parts = [];
    const slug = fontSlug(font);
    if (slug) parts.push('slug=' + encodeURIComponent(slug));
    else if (font && font.id) parts.push('id=' + encodeURIComponent(font.id));
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        if (extra[k] == null || extra[k] === '') return;
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(extra[k]));
      });
    }
    if (onApp && parts.length) {
      /* app 上带额外 query 仍落到静态兼容页，避免丢 from= 等 */
      return '/font-detail.html?' + parts.join('&');
    }
    return 'font-detail.html?' + parts.join('&');
  }

  /* —— 公开统计：目录基数 + 本机增量（样张导出→下载；CSS 拉取→API）—— */
  function readLocalStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function writeLocalStats(map) {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(map)); } catch (e) { /* ignore */ }
  }
  function baseFontStats(font) {
    const views = Math.max(0, Number(font && font.viewCount) || 0);
    const downloads = font && font.downloadCount != null
      ? Math.max(0, Number(font.downloadCount) || 0)
      : Math.max(0, Math.round(views * 0.06));
    const api = font && font.apiCount != null
      ? Math.max(0, Number(font.apiCount) || 0)
      : Math.max(0, Math.round(views * 5.2));
    return { views: views, downloads: downloads, api: api };
  }
  function getFontStats(font) {
    if (font && font._liveStats) {
      return {
        views: Math.max(0, Number(font.viewCount) || 0),
        downloads: Math.max(0, Number(font.downloadCount) || 0),
        api: Math.max(0, Number(font.apiCount) || 0)
      };
    }
    const id = font && font.id;
    const base = baseFontStats(font || {});
    if (!id) return base;
    const local = readLocalStats()[id] || {};
    return {
      views: base.views + (Number(local.views) || 0),
      downloads: base.downloads + (Number(local.downloads) || 0),
      api: base.api + (Number(local.api) || 0)
    };
  }
  function bumpFontStat(fontId, key, n, opts) {
    const id = String(fontId || '');
    if (!id) return null;
    const field = key === 'downloads' || key === 'api' || key === 'views' ? key : '';
    if (!field) return null;
    const delta = Number(n);
    const add = Number.isFinite(delta) && delta !== 0 ? delta : 1;
    if (opts && opts.once && field === 'views') {
      try {
        const raw = sessionStorage.getItem(VIEWED_KEY) || '';
        const seen = raw ? raw.split('|') : [];
        if (seen.indexOf(id) !== -1) return getFontStats(getById(id) || { id: id });
        seen.push(id);
        sessionStorage.setItem(VIEWED_KEY, seen.slice(-80).join('|'));
      } catch (e) { /* ignore */ }
    }
    const map = readLocalStats();
    const row = map[id] || { views: 0, downloads: 0, api: 0 };
    row[field] = Math.max(0, (Number(row[field]) || 0) + add);
    map[id] = row;
    writeLocalStats(map);
    const font = getById(id) || { id: id };
    const next = getFontStats(font);
    try {
      document.dispatchEvent(new CustomEvent('wf:stats', { detail: { id: id, stats: next, key: field } }));
    } catch (e) { /* ignore */ }
    return next;
  }
  function paintFontStats(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-font-stats]').forEach(function (el) {
      const id = el.getAttribute('data-font-stats');
      const font = getById(id) || { id: id };
      const s = getFontStats(font);
      const set = function (k, n) {
        const node = el.querySelector('[data-stat="' + k + '"]');
        if (node) node.textContent = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      };
      set('views', s.views);
      set('downloads', s.downloads);
      set('api', s.api);
    });
  }

  function enrich(pick) {
    const meta = getById(pick.id) || {};
    return Object.assign({}, meta, pick, {
      name: pick.name || meta.name || pick.id,
      family: pick.family || meta.family || '',
      weights: pick.weights || meta.weights || ['Regular'],
      designer: pick.designer || meta.designerShort || meta.designer || '',
      designerShort: pick.designerShort || meta.designerShort || pick.designer || meta.designer || '—',
      styles: pick.styles || meta.styles || (pick.weights || meta.weights || []).length || 1,
      tags: pick.tags || meta.tags || [],
      category: pick.category || meta.category || '',
      detail: pick.detail || meta.detail || detailHref(Object.assign({}, meta, pick))
    });
  }

  function getQuery(name) {
    try {
      return new URLSearchParams(location.search).get(name) || '';
    } catch (e) { return ''; }
  }

  function pageHref(path) {
    if (/^https?:/i.test(path || '')) return path;
    if (window.WFChrome && WFChrome.href) return WFChrome.href(path);
    return path;
  }
  function setJoinLabel(btn, picked) {
    if (!btn) return;
    btn.classList.toggle('is-picked', picked);
    /* 样张行 / 详情 / 对比卡自己管文案和图标，这里只同步选中态 */
    if (btn.classList.contains('act') || btn.id === 'btnPick' || btn.id === 'nowPick') return;
    if (btn.hasAttribute('data-op-detail')) {
      btn.textContent = picked ? '从选字袋移除' : '加入选字袋';
      return;
    }
    btn.textContent = picked ? '从选字袋移除' : '加入选字袋';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function weightToCss(w) {
    if (w == null || w === '') return '400';
    const s = String(w).trim();
    if (/^\d{2,4}$/.test(s)) return s;
    const key = s.toLowerCase().replace(/\s+/g, '');
    return WEIGHT_MAP[key] || '400';
  }

  function cssFamilyStack(family, platform) {
    const f = family || '';
    const alt = f.indexOf('wenfeng-') === 0 ? f.replace(/^wenfeng-/, 'windfonts-') : '';
    const parts = [];
    if (f) parts.push("'" + f + "'");
    if (alt) parts.push("'" + alt + "'");
    const extra = {
      mac: ['"PingFang SC"', '"Hiragino Sans GB"', '"Heiti SC"', 'system-ui', 'sans-serif'],
      win: ['"Microsoft YaHei"', 'SimHei', '"Segoe UI"', 'sans-serif'],
      android: ['"Noto Sans CJK SC"', 'Roboto', 'sans-serif']
    };
    return parts.concat(extra[platform] || ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif']).join(', ');
  }

  /** 字体族 slug（CDN 路径段）：wenfeng-albbpht → albbpht */
  function familySlug(family) { return String(family || '').replace(/^wenfeng-/, ''); }

  /** 数值字重 → CDN 路径里的小写字重名。同数字多名称时优先 Regular / normal。 */
  function weightName(family, weight) {
    const s = String(weight == null ? '400' : weight).trim();
    if (!/^\d{2,4}$/.test(s)) return s.toLowerCase().replace(/[\s-]+/g, '');
    const font = catalog.filter(function (f) { return f.family === family; })[0];
    const names = (font && font.weights) || [];
    const hits = names.filter(function (n) { return weightToCss(n) === s; });
    if (hits.length > 1) {
      const prefer = hits.filter(function (n) {
        const k = String(n).toLowerCase().replace(/[\s-]+/g, '');
        return k === 'regular' || k === 'normal';
      })[0];
      if (prefer) return prefer.toLowerCase().replace(/[\s-]+/g, '');
    }
    const hit = hits[0];
    return (hit || CSS_TO_NAME[s] || 'regular').toLowerCase().replace(/[\s-]+/g, '');
  }

  /** 动态地址用的字重名：保留字库里的大小写，如 Regular、Heavy。 */
  function packageWeight(family, weight) {
    const s = String(weight == null ? '400' : weight).trim();
    const font = catalog.filter(function (f) { return f.family === family; })[0];
    const names = (font && font.weights) || [];
    if (!/^\d{2,4}$/.test(s)) {
      const key = s.toLowerCase().replace(/[\s-]+/g, '');
      const hit = names.filter(function (n) { return n.toLowerCase().replace(/[\s-]+/g, '') === key; })[0];
      return hit || s;
    }
    return names.filter(function (n) { return weightToCss(n) === s; })[0] || CSS_TO_NAME[s] || 'Regular';
  }

  function packageName(family) {
    const font = catalog.filter(function (f) { return f.family === family; })[0];
    if (font && font.normalized) return font.normalized;
    const slug = familySlug(family);
    return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '';
  }

  function packageSubset(version) {
    const v = String(version || 'full').toLowerCase();
    if (v === 'zh' || v === 'zh-common' || v === 'en') return v;
    if (v === 'preview-shop' || v === 'shop' || v === 'preview-card' || v === 'card' || v === 'preview-yong' || v === 'yong') {
      return v.indexOf('preview-') === 0 ? v : ('preview-' + v);
    }
    return 'full';
  }

  /** 动态引用：family 用 wenfeng-{slug}，weight 用小写字重名。
   *  公开域名只有 cn / hk / en。/api/css 以后由反代改写到上游；复制出去的地址现在就用当前节点。
   *  上游认 subset（或 lang），不认 version；version 仍附上，给仍按旧参数读的边缘。
   *  多款字体用 | 分隔或传入数组，如 wenfeng-albbpht|wenfeng-ibmps。 */
  function resolveCssFamilyName(token) {
    let t = String(token || '').trim();
    if (!t) return '';
    const aliased = resolveFamilyAlias(t);
    if (aliased && aliased !== t.replace(/^wenfeng-/i,'').replace(/^windfonts-/i,'').toLowerCase()) {
      t = 'wenfeng-' + aliased;
    }
    if (t.indexOf('wenfeng-') === 0) return t.toLowerCase();
    if (t.indexOf('windfonts-') === 0) return ('wenfeng-' + t.slice(10)).toLowerCase();
    const lower = t.toLowerCase();
    for (let i = 0; i < catalog.length; i++) {
      const f = catalog[i];
      if (familySlug(f.family).toLowerCase() === lower) return String(f.family || ('wenfeng-' + lower)).toLowerCase();
      if (String(f.normalized || '').toLowerCase() === lower) return String(f.family || ('wenfeng-' + lower)).toLowerCase();
      if (String(f.family || '').toLowerCase() === lower) return String(f.family).toLowerCase();
    }
    return 'wenfeng-' + lower;
  }
  function cssApiUrl(family, weight, version, origin, extra) {
    const parts = Array.isArray(family)
      ? family
      : String(family || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    const names = parts.map(resolveCssFamilyName).filter(Boolean).join('|');
    let famForWeight = parts[0] || '';
    if (famForWeight && famForWeight.indexOf('wenfeng-') !== 0) {
      const hit = getBySlug(famForWeight);
      famForWeight = hit ? hit.family : ('wenfeng-' + String(famForWeight).toLowerCase());
    }
    const w = String(packageWeight(famForWeight, weight || '400')).toLowerCase().replace(/[\s-]+/g, '');
    const subset = packageSubset(version);
    const params = [
      'family=' + encodeURIComponent(names),
      'weight=' + encodeURIComponent(w),
      'subset=' + encodeURIComponent(subset),
      'version=' + encodeURIComponent(subset)
    ];
    extra = extra || {};
    if (extra.fallback) {
      const fb = resolveCssFamilyName(extra.fallback);
      if (fb) {
        params.push('fallback=' + encodeURIComponent(fb));
        if (extra.fallbackWeight) {
          const fbw = String(extra.fallbackWeight).toLowerCase().replace(/[\s-]+/g, '');
          params.push('fallbackWeight=' + encodeURIComponent(fbw));
        }
      }
    }
    if (extra.localeFallback) {
      const lf = String(extra.localeFallback).toLowerCase();
      if (lf === 'auto' || lf === 'sc' || lf === 'tc') {
        params.push('localeFallback=' + encodeURIComponent(lf));
      }
    }
    return (origin || cdnOrigin()) + '/api/css?' + params.join('&');
  }

  /**
   * 账号级 cite-closed CSS（须 Bearer API Key）。
   * 主机用 CSS_API（vault），不走公开 CDN；不灌 fonts-packages。
   */
  function certCssApiUrl(family, weight, origin) {
    const name = resolveCssFamilyName(family);
    const w = String(weight || 'regular').toLowerCase().replace(/[\s_-]+/g, '');
    const base = String(origin || CSS_API || 'https://vault.windfonts.com').replace(/\/$/, '');
    return base + '/api/font-certs/css?family=' + encodeURIComponent(name) +
      '&weight=' + encodeURIComponent(w || 'regular');
  }

  function cdnHost() {
    let id = 'cn';
    try { id = localStorage.getItem(CDN_KEY) || 'cn'; } catch (e) {}
    return CDN_HOSTS.filter(function (h) { return h.id === id; })[0] || CDN_HOSTS[0];
  }
  function cdnOrigin() { return 'https://' + cdnHost().host; }
  function setCdn(id) {
    if (!CDN_HOSTS.filter(function (h) { return h.id === id; }).length) return;
    try { localStorage.setItem(CDN_KEY, id); } catch (e) {}
    document.dispatchEvent(new CustomEvent('wf:cdn', { detail: { id: id } }));
  }
  function cdnSwitchHtml() {
    const on = cdnHost().id;
    return '<div class="cdn-switch seg" role="group" aria-label="CDN 节点">' +
      CDN_HOSTS.map(function (h) {
        return '<button type="button" data-cdn="' + h.id + '"' + (h.id === on ? ' class="is-on"' : '') + '>' + h.label + '</button>';
      }).join('') + '</div>';
  }
  function syncCdnUi(root) {
    const host = cdnHost();
    const origin = 'https://' + host.host;
    const scope = root || document.body;
    if (!scope) return;
    scope.querySelectorAll('.cdn-switch [data-cdn]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-cdn') === host.id);
    });
    const re = /(?:https?:\/\/)?(?:cn|hk|en)\.windfonts\.com/g;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const parent = node.parentElement;
        if (!parent || parent.closest('script, style, noscript, .cdn-switch')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let node;
    while ((node = walker.nextNode())) {
      if (!re.test(node.nodeValue)) { re.lastIndex = 0; continue; }
      re.lastIndex = 0;
      node.nodeValue = node.nodeValue.replace(re, function (m) {
        return m.indexOf('http') === 0 ? origin : host.host;
      });
    }
  }
  function cssUrl(family, weight, version, origin) {
    const file = (version === 'zh' || version === 'zh-common') ? 'zh_index.css' : 'index.css';
    return (origin || CDN) + '/wenfeng/fonts/' + familySlug(family) + '/' + weightName(family, weight || '400') + '/web/' + file;
  }

  /** 现网拆包静态 CSS（CORS *）：fonts-packages/{Normalized}/{Weight}/{version}/result.css */
  function packageResultUrl(family, weight, version, origin) {
    const font = catalog.filter(function (f) { return f.family === family; })[0];
    const slug = familySlug(family);
    const norm = (font && font.normalized) || packageName(family) || slug;
    const w = packageWeight(family, weight || '400');
    const ver = packageSubset(version);
    let url = (origin || CDN) + '/fonts-packages/' + encodeURIComponent(norm) + '/' +
      encodeURIComponent(w) + '/' + encodeURIComponent(ver) + '/result.css';
    if (String(ver).indexOf('preview-') === 0) url += '?v=20260929shop2';
    return url;
  }

  function embedCssUrl(family, weight, version) {
    return cssApiUrl(family, weight, version || 'full');
  }

  /* Cite-closed 货架：CDN/api 无包时，用同源 assets/fonts/preview 试看面撑灰墙/字符表。
     不改 citeAllowed，不进 embed / fonts-packages。 */
  let previewFacesMap = null;
  let previewFacesPromise = null;
  function loadPreviewFaces() {
    if (previewFacesMap) return Promise.resolve(previewFacesMap);
    if (previewFacesPromise) return previewFacesPromise;
    previewFacesPromise = fetch(dataUrl('preview-faces.json?v=20260926b'))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        previewFacesMap = (j && j.faces && typeof j.faces === 'object') ? j.faces : {};
        return previewFacesMap;
      })
      .catch(function () {
        previewFacesMap = {};
        return previewFacesMap;
      });
    return previewFacesPromise;
  }
  function citeClosedFamily(family) {
    const font = catalog.filter(function (f) { return f.family === family; })[0];
    return !!(font && Array.isArray(font.tags) && font.tags.indexOf('cite-closed') !== -1);
  }
  function previewAssetHref(rel) {
    const path = String(rel || '').replace(/^\/+/, '');
    if (!path) return '';
    try {
      const scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || '';
        if (src.indexOf('wf-proto.js') !== -1) {
          return new URL('../' + path, src).href;
        }
      }
    } catch (e) { /* ignore */ }
    const base = location.pathname.replace(/\/[^/]*$/, '/');
    if (base.indexOf('/admin') !== -1) return '../' + path;
    return path;
  }
  function lookupPreviewFace(family, pathName) {
    const faces = previewFacesMap || {};
    const fam = String(family || '').toLowerCase();
    let entry = faces[fam] || faces[family] || null;
    if (!entry) {
      const font = catalog.filter(function (f) { return f.family === family; })[0];
      const norm = font && font.normalized;
      if (norm) {
        const mappedFam = 'wenfeng-' + String(norm).toLowerCase();
        entry = faces[mappedFam] || null;
        if (!entry) {
          /* byNormalized 可把 Shmgt → wenfeng-shmgt */
          /* 直接扫 faces 键匹配 normalized 小写 */
          const want = String(norm).toLowerCase();
          Object.keys(faces).forEach(function (k) {
            if (entry) return;
            if (k.replace(/^wenfeng-/, '').toLowerCase() === want) entry = faces[k];
          });
        }
      }
    }
    if (!entry || typeof entry !== 'object') return null;
    const wkey = String(pathName || 'regular').toLowerCase().replace(/[\s-]+/g, '');
    /* Preview face keys follow weightName (light/regular/bold); retain CSS aliases
       too so named and numeric callers both select the matching local face. */
    const cssAlias = { '100': 'thin', '200': 'extralight', '300': 'light', '350': 'demilight',
      '400': 'regular', '500': 'medium', '600': 'semibold', '700': 'bold', '800': 'extrabold', '900': 'black' };
    const hit = entry[wkey] || entry[cssAlias[wkey]] || entry.regular || entry['400'] || null;
    if (!hit || !hit.url) return null;
    return hit;
  }
  function injectPreviewFace(family, pathName, w) {
    return loadPreviewFaces().then(function () {
      const hit = lookupPreviewFace(family, pathName);
      if (!hit) return false;
      const href = previewAssetHref(hit.url);
      if (!href) return false;
      const famCss = String(family).replace(/["']/g, '');
      const fmt = String(hit.format || '').toLowerCase();
      const formatBit = fmt ? ' format("' + fmt + '")' : '';
      const cssW = String(hit.cssWeight || w || '400');
      /* 请求字重用调用方 w，使 Light/Bold 行也能挂上 Regular 试看面 */
      const faceW = String(w || cssW || '400');
      const style = document.createElement('style');
      style.setAttribute('data-wf-family', family);
      style.setAttribute('data-wf-weight', faceW);
      style.setAttribute('data-wf-weight-name', pathName);
      style.setAttribute('data-wf-preview-face', '1');
      style.textContent =
        '@font-face{font-family:"' + famCss + '";font-weight:' + faceW +
        ';font-style:normal;font-display:swap;src:url("' + href + '")' + formatBit + ';}';
      document.head.appendChild(style);
      return true;
    });
  }

  function cssRangeSet(css) {
    const set = {};
    let any = false;
    const re = /unicode-range:\s*([^;]+)/gi;
    let m;
    while ((m = re.exec(String(css || '')))) {
      any = true;
      String(m[1]).split(',').forEach(function (part) {
        part = String(part || '').trim().toUpperCase().replace(/^U\+/, '');
        if (!part) return;
        if (part.indexOf('-') >= 0) {
          const ab = part.split('-');
          const a = parseInt(ab[0], 16);
          const b = parseInt(ab[1], 16);
          if (!(a >= 0 && b >= a)) return;
          if (b - a > 400) { set._wide = 1; return; }
          for (let n = a; n <= b; n++) set[n] = 1;
        } else {
          const n = parseInt(part, 16);
          if (n >= 0) set[n] = 1;
        }
      });
    }
    if (!any) set._all = 1;
    return set;
  }
  function rangeSetCoversText(set, text) {
    const s = String(text || '');
    if (!s) return true;
    if (set && set._all) return true;
    if (set && set._wide) return true;
    let saw = false;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 128) continue;
      saw = true;
      if (!set || !set[c]) return false;
    }
    return saw;
  }
  const injectedCssText = {};
  var sampleFaceTimer = 0;
  function refreshFacesForSample(text) {
    if (sampleFaceTimer) clearTimeout(sampleFaceTimer);
    sampleFaceTimer = setTimeout(function () {
      sampleFaceTimer = 0;
      const t = text == null ? '' : String(text);
      document.querySelectorAll('[data-family]').forEach(function (el) {
        const fam = el.getAttribute('data-family');
        if (!fam) return;
        ensureFontCss(fam, el.getAttribute('data-weight') || '400', 'preview-shop', t);
      });
    }, 140);
  }


  /**
   * 注入字体 CSS。店面短样张走 preview-shop（CDN 预计算包），缺包再 zh / full。
   * 传入 text 时：preview-shop 的 unicode-range 盖不住样张（春/绿/岸、让/字/网页 等）就升级 zh，再不行 full。
   * 不请求已下线的 /wenfeng/fonts，也没有公开 text=。
   */
  function ensureFontCss(family, weight, version, text) {
    if (!family) return Promise.resolve();
    const ver = packageSubset(version);
    const pathName = weightName(family, weight);
    const w = weightToCss(weight || pathName || '400');
    const key = family + '|' + pathName + '|' + ver;
    const needText = text == null ? '' : String(text);
    if (injectedCss[key]) {
      return injectedCss[key].then(function () { return upgradeIfNeeded(); });
    }
    const famCss = String(family).replace(/["']/g, '');
    function noteApi() {
      const hit = catalog.filter(function (f) { return f.family === family; })[0];
      if (hit && hit.id) bumpFontStat(hit.id, 'api', 1);
    }
    function inject(css, base) {
      /* 包内 result.css 常把各档都写成 font-weight:400；若只在 font-family 后追加字重，
         后面残留的 font-weight:400 会盖掉 Demi/Ultra/Medium，样张看起来「字重没变化」。 */
      const fixed = css
        .replace(/src:\s*[^;]+;/gi, function (srcDecl) {
          const urls = srcDecl.match(/url\((?:\\?["']?)[^)]+\)(?:\s+format\((?:\\?["']?)[^)]+\))?/gi);
          if (!urls || !urls.length) return srcDecl;
          return 'src:' + urls.join(',') + ';';
        })
        .replace(/font-weight\s*:\s*[^;]+;/gi, '')
        .replace(/font-family\s*:\s*[^;]+;/gi, 'font-family:"' + famCss + '";font-weight:' + w + ';')
        .replace(/font-style\s*:\s*[^;]+;/gi, 'font-style:normal;')
        .replace(/url\("\.\//g, 'url("' + base)
        .replace(/url\('\.\//g, "url('" + base);
      const style = document.createElement('style');
      style.setAttribute('data-wf-family', family);
      style.setAttribute('data-wf-weight', w);
      style.setAttribute('data-wf-weight-name', pathName);
      style.setAttribute('data-wf-subset', ver);
      style.textContent = fixed;
      document.head.appendChild(style);
      injectedCssText[key] = css;
      noteApi();
    }
    function fetchCss(url) {
      return fetch(url).then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        return r.text().then(function (css) {
          return { css: css, base: url.replace(/[^/]+$/, '') };
        });
      });
    }
    function siblingWeightFolder(w) {
      const k = String(w || '').toLowerCase().replace(/[\s-]+/g, '');
      if (k === 'normal') return 'Regular';
      if (k === 'regular') return 'Normal';
      return '';
    }
    function fetchPkg(subset) {
      const pack = function (weightArg) {
        return fetchCss(packageResultUrl(family, weightArg, subset));
      };
      let chain = pack(pathName);
      const folder = packageWeight(family, pathName);
      const sib = siblingWeightFolder(folder) || siblingWeightFolder(pathName);
      if (sib) {
        chain = chain.catch(function () { return pack(sib); });
      }
      /* preview-* 只拉拆包；/api/css?subset=preview-shop 现网 400 且无 CORS */
      if (String(subset).indexOf('preview-') === 0) return chain;
      return chain.catch(function () {
        return fetchCss(cssApiUrl(family, pathName, subset));
      });
    }
    const remoteCss = function () {
      let chain = fetchPkg(ver);
      if (ver.indexOf('preview-') === 0) {
        chain = chain.catch(function () { return fetchPkg('zh'); }).catch(function () { return fetchPkg('full'); });
      } else if (ver !== 'full') {
        chain = chain.catch(function () { return fetchPkg('full'); });
      }
      return chain.then(function (res) {
        inject(res.css, res.base);
      }).catch(function () {
        return injectPreviewFace(family, pathName, w).then(function (ok) {
          if (ok) return;
          return new Promise(function (resolve) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssApiUrl(family, pathName, 'full');
            link.setAttribute('data-wf-family', family);
            link.setAttribute('data-wf-weight-name', pathName);
            link.onload = function () { noteApi(); resolve(); };
            link.onerror = function () { resolve(); };
            document.head.appendChild(link);
          });
        });
      });
    };
    function upgradeIfNeeded() {
      if (!needText) return;
      if (rangeSetCoversText(cssRangeSet(injectedCssText[key] || ''), needText)) return;
      if (String(ver).indexOf('preview-') === 0) return ensureFontCss(family, weight, 'zh', needText);
      if (ver === 'zh' || ver === 'zh-common' || ver === 'en') return ensureFontCss(family, weight, 'full', needText);
    }
    injectedCss[key] = citeClosedFamily(family)
      ? injectPreviewFace(family, pathName, w)
      : remoteCss();
    return injectedCss[key].then(function () { return upgradeIfNeeded(); });
  }

  /** 等 CSS 注入后再拉该段文字所需分片。cached 时几乎立刻 resolve。 */
  function readyFace(family, weight, text, version) {
    const w = weightToCss(weight || '400');
    const fam = String(family || '').replace(/["']/g, '');
    return ensureFontCss(family, weight, version).then(function () {
      if (!fam || !document.fonts || !document.fonts.load) return;
      return document.fonts.load(w + ' 80px "' + fam + '"', String(text || '')).catch(function () {
        return null;
      });
    });
  }

  /** 许可档位归并（对齐许可字典口径：免费商用单列，联系/付费并「需授权」，空=待核实） */
  function fallbackCopy(text) {
    return new Promise(function (resolve, reject) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error('copy failed'));
      } catch (e) {
        document.body.removeChild(ta);
        reject(e);
      }
    });
  }

  /* 开源商用 SPDX 白名单：命中即归「开源商用」（可修改、可再分发的开源许可证）。
     仓耳「免费开源字体授权声明」按 2026-09-25 口径也归开源商用。
     白名单宁缺勿滥：未命中的免费商用字体留在「免费商用」桶。 */
  const OSS_LICENSE_RE = /OFL|SIL Open Font License|\bMIT\b|MIT License|Apache|GPL|GNU General Public License|CC0|CC BY|CC-BY|0BSD|IPA Font License|GlyphWiki|开放政府数据|Ubuntu Font License|M\+ 位图许可|仓耳字库免费开源字体授权声明/i;

  function licenseTier(font) {
    const ln = String((font && font.licenseName) || '');
    if (OSS_LICENSE_RE.test(ln)) return '开源商用';
    const t = String((font && font.license) || '').trim();
    /* catalog license 字段「开源商用」：OFL 衍生等官方页未写 SPDX 名的开源商用字体 */
    if (t === '开源商用') return '开源商用';
    if (t === '免费商用' || t === '开源免费商用') return '免费商用';
    if (t === '联系授权' || t === '付费授权') return '需授权';
    if (t === '个人免费') return '个人免费';
    return '待核实';
  }

  function getFoundryById(id) {
    if (!id) return null;
    for (let i = 0; i < foundries.length; i++) {
      if (foundries[i].id === id) return foundries[i];
    }
    /* 别名 / 已合并短码（如 nanigashi → aqua） */
    return foundryByAlias[normKey(id)] || null;
  }

  /** 母公司条目；无 parentId 则 null */
  function getFoundryParent(fdOrId) {
    const fd = typeof fdOrId === 'string' ? getFoundryById(fdOrId) : fdOrId;
    if (!fd || !fd.parentId) return null;
    return getFoundryById(fd.parentId);
  }

  /** 直接子公司（一阶） */
  function getFoundryChildren(id) {
    if (!id) return [];
    return foundries.filter(function (fd) { return fd && fd.parentId === id; });
  }

  /** 自身 + 全部后代 id（深度优先） */
  function getFoundrySubtreeIds(id) {
    if (!id) return [];
    const out = [id];
    getFoundryChildren(id).forEach(function (ch) {
      getFoundrySubtreeIds(ch.id).forEach(function (x) {
        if (out.indexOf(x) === -1) out.push(x);
      });
    });
    return out;
  }


  /**
   * 统计厂商在库字体数（按主归属 ownerId）。
   * opts.includeDescendants !== false 时含子公司子树（getFoundryChildren 递归）。
   */
  function countFontsUnderFoundry(foundryId, opts) {
    opts = opts || {};
    if (!foundryId) return 0;
    const includeDescendants = opts.includeDescendants !== false;
    const ids = includeDescendants ? getFoundrySubtreeIds(foundryId) : [foundryId];
    const set = {};
    ids.forEach(function (id) { set[id] = true; });
    let n = 0;
    for (let i = 0; i < catalog.length; i++) {
      const f = catalog[i];
      const oid = (f.lineage && f.lineage.ownerId) ||
        (f.ownerInfo && f.ownerInfo.id) || '';
      if (oid && set[oid]) n++;
    }
    return n;
  }

  /** 组织图入口：子树内归属字体 ≥ 2 才展示 */
  function canShowOrgLineage(foundryId) {
    return countFontsUnderFoundry(foundryId, { includeDescendants: true }) >= 2;
  }

  /** 字体主归属或联合作者是否落在 foundryId 子树内 */
  function fontBelongsToFoundry(font, foundryId) {
    if (!font || !foundryId) return false;
    const ids = getFoundrySubtreeIds(foundryId);
    const owner = font.ownerInfo || font.foundryInfo;
    if (owner && owner.id && ids.indexOf(owner.id) !== -1) return true;
    const cols = font.collaboratorInfos || [];
    return cols.some(function (c) { return c && c.id && ids.indexOf(c.id) !== -1; });
  }

  function matchNamedRecord(map, name) {
    const keys = Object.keys(map || {}).sort(function (a, b) { return b.length - a.length; });
    for (let i = 0; i < keys.length; i++) {
      if (String(name || '').indexOf(keys[i]) !== -1) return map[keys[i]];
    }
    return null;
  }

  const LINEAGE_UPSTREAM = {
    'source-han-sans': 'adobe',
    'source-han-serif': 'adobe',
    'droid-sans': 'google-fonts',
    'ipa-mincho': 'ipa',
    'ipa-gothic': 'ipa',
    'lxgw-wenkai': 'fontworks',
    'longcang': 'zhongqi',
    'rocknroll': 'fontworks',
    'jf-open-hunyuan': 'justfont',
    'swei-spring': 'aqua',
    'swei-b2-sugar': 'aqua'
  };

  function resolveLineage(font) {
    const rec = matchNamedRecord((lineageData && lineageData.byName) || {}, font && font.name);
    const groups = (lineageData && lineageData.groups) || {};
    const fallback = font && font.foundryInfo;
    if (!rec) {
      return {
        group: '', groupName: '', relation: '', upstreamName: '', upstreamOwnerInfo: null,
        licenseFollows: 'unknown', ownerId: (fallback && fallback.id) || '',
        ownerInfo: fallback, makerInfo: fallback,
        collaboratorIds: [], relatedGroup: '', collaboratorInfos: []
      };
    }
    const group = rec.group ? groups[rec.group] : null;
    const owner = getFoundryById(rec.ownerId) || fallback;
    const maker = getFoundryById(rec.makerId) || owner || fallback;
    const upstreamOwnerId = rec.upstreamOwnerId || (rec.group && LINEAGE_UPSTREAM[rec.group]) || '';
    const upstreamOwner = upstreamOwnerId ? getFoundryById(upstreamOwnerId) : null;
    const collaboratorInfos = (Array.isArray(rec.collaboratorIds) ? rec.collaboratorIds : [])
      .map(function (id) { return getFoundryById(id); })
      .filter(function (fd) {
        return fd && fd.id && (!owner || fd.id !== owner.id) && (!maker || fd.id !== maker.id);
      });
    return {
      group: rec.group || '',
      groupName: (group && group.name) || '',
      relation: rec.relation || '',
      /* original 不继承 groups.upstreamName，避免源头指自己 */
      upstreamName: rec.upstreamName ||
        (rec.relation === 'original' ? '' : ((group && group.upstreamName) || '')) || '',
      upstreamOwnerInfo: upstreamOwner,
      licenseFollows: rec.licenseFollows || 'unknown',
      ownerId: (owner && owner.id) || rec.ownerId || '',
      ownerInfo: owner,
      makerInfo: maker,
      collaboratorIds: Array.isArray(rec.collaboratorIds) ? rec.collaboratorIds.slice() : [],
      relatedGroup: rec.relatedGroup || '',
      collaboratorInfos: collaboratorInfos
    };
  }

  /* 标准 SPDX 推断：精确版本优先（GPL-3 不许落到 2.0；GPL+字体例外单列，
     webfont 场景例外条款即上下游许可的关键差异） */
  function inferStandardKey(text) {
    const t = String(text || '');
    if (/with-font-exception|字体嵌入?例外/i.test(t)) return 'GPL-2.0-with-font-exception';
    if (/OFL|Open Font License/i.test(t)) return 'OFL-1.1';
    if (/Apache/i.test(t)) return 'Apache-2.0';
    if (/GPL-?3|GPL\s*v?3/i.test(t)) return 'GPL-3.0';
    if (/GPL|GNU General Public License/i.test(t)) return 'GPL-2.0';
    if (/CC-?BY-?SA/i.test(t)) return 'CC-BY-SA-4.0';
    if (/CC-?BY-?ND/i.test(t)) return 'CC-BY-ND-3.0';
    if (/CC0/i.test(t)) return 'CC0-1.0';
    if (/CC[- ]?BY/i.test(t)) return 'CC-BY-4.0';
    if (/M\+ 位图许可|M\+ OUTLINE/i.test(t)) return 'Mplus';
    if (/\b0BSD\b/i.test(t)) return '0BSD';
    if (/\bMIT\b|MIT License/i.test(t)) return 'MIT';
    if (/IPA/i.test(t)) return 'IPA-1.0';
    if (/GlyphWiki/i.test(t)) return 'GlyphWiki';
    if (/开放政府数据|政府资料开放/i.test(t)) return 'OGDL-1.0';
    return '';
  }

  function evidenceVerified(ev) {
    if (!ev || !ev.sourceUrl) return false;
    if (ev.sourceKind === 'platform' || ev.sourceKind === 'author_note' || ev.sourceKind === 'unlabeled') return false;
    return ev.sourceKind === 'standard' || ev.sourceKind === 'github_license' || ev.sourceKind === 'rights_holder';
  }

  function resolveLicenseEvidence(font) {
    const standards = (licenseEvidenceData && licenseEvidenceData.standards) || {};
    const names = (licenseEvidenceData && licenseEvidenceData.names) || {};
    const licName = String((font && font.licenseName) || '');
    const foundry = (font && font.foundryInfo) || {};
    let ev = {
      sourceKind: 'unlabeled',
      sourceUrl: (font && (font.licenseFileUrl || font.licenseUrl)) || '',
      quote: '',
      verifiedAt: '',
      restrictions: [],
      spdx: '',
      label: licName,
      verified: false
    };
    /* 顺序：先名称条目（补充引文/限制），后标准推断（身份字段以 licenseName 精确匹配为准——
       名称条目可能按同厂另一款写，如文泉驿条目按微米黑写了 Apache，不能盖掉正黑的 GPL+字体例外） */
    const stdKey = inferStandardKey(licName);
    const std = (stdKey && standards[stdKey]) || null;
    const keys = Object.keys(names).sort(function (a, b) { return b.length - a.length; });
    for (let i = 0; i < keys.length; i++) {
      if (String((font && font.name) || '').indexOf(keys[i]) === -1) continue;
      const n = names[keys[i]];
      ev = Object.assign({}, ev, n);
      if (n.spdx && standards[n.spdx]) {
        if (!n.quote) ev.quote = standards[n.spdx].quote;
        if (!n.restrictions) ev.restrictions = standards[n.spdx].restrictions.slice();
        if (!ev.label) ev.label = standards[n.spdx].label;
        if (!ev.spdx) ev.spdx = n.spdx;
      }
      break;
    }
    if (std) {
      const named = {
        quote: ev.quote,
        restrictions: ev.restrictions,
        verifiedAt: ev.verifiedAt
      };
      ev = Object.assign({}, ev, std, {
        label: licName || std.label,
        quote: named.quote || std.quote,
        restrictions: named.restrictions && named.restrictions.length ? named.restrictions : std.restrictions,
        verifiedAt: named.verifiedAt || std.verifiedAt || ''
      });
    }
    if (foundry.kind === 'platform' && ev.sourceKind !== 'standard' && ev.sourceKind !== 'github_license') {
      ev.sourceKind = 'platform';
      if (!ev.sourceUrl) ev.sourceUrl = foundry.website || '';
    } else if (ev.sourceKind === 'unlabeled' && /作者声明|免费可商用|免费商用授权/.test(licName)) {
      ev.sourceKind = 'author_note';
    }
    ev.verified = evidenceVerified(ev);
    return ev;
  }

  /** 权利人声明若写明禁止改字再分发（如阿里普惠体免费商用），不算开源可衍生。
   *  用具体短语，避免 OFL「不得单独售卖…」+「修改后再分发须遵守 OFL」跨句被
   *  宽松的「不得.*修改.*再分发」误伤。 */
  function forbidsOpenDerive(ev) {
    const blob = ((ev && ev.restrictions) || []).concat([(ev && ev.quote) || '']).join(' ');
    /* 覆盖：阿里「不得将修改后…再分发」、摩登「禁止修改字体或制作衍生版本」、OPPO「禁止修改字体」等 */
    return /不得将修改|禁止修改后|禁止修改字体|不可修改.*分发|不允许.*衍生|禁止.*衍生|制作衍生版本|改字.*不得|不得改字|禁止改字|不得再分发字体|禁止再分发字体|禁止把字体.*再分发|禁止将字库/.test(blob);
  }

  /** 明确禁止托管/CDN/再分发字体文件本身 → 非开源可衍生（吉利/摩登 cite-closed） */
  function forbidsFontRedistrib(ev) {
    const blob = ((ev && ev.restrictions) || []).concat([(ev && ev.quote) || '']).join(' ');
    return /禁止托管|不得\s*CDN|禁止\s*CDN|不得再分发字体|禁止再分发字体|不得提供(?:字体)?下载/.test(blob);
  }

  function isOpenFont(font) {
    const ev = (font && font.licenseEvidence) || {};
    const tags = (font && font.tags) || [];
    let citeClosed = false;
    for (let i = 0; i < tags.length; i++) {
      if (String(tags[i]) === 'cite-closed') { citeClosed = true; break; }
    }
    /* cite-closed 绝不是开源谱系源头 */
    if (citeClosed) return false;
    /* 明确开源 SPDX / licenseName 优先：不被 OFL 条款启发式误伤 */
    if (/OFL|Apache|MIT|IPA|CC0|CC-BY|0BSD/i.test(String(ev.spdx || ''))) return true;
    if (/OFL|Open Font|Apache|\bMIT\b|IPA|CC-?BY|CC0|0BSD|GPL/i.test(String((font && font.licenseName) || ''))) return true;
    /* 禁托管再分发 / 明确禁改字再分发：品牌免费商用等不算开源可衍生 */
    if (forbidsFontRedistrib(ev) || forbidsOpenDerive(ev)) return false;
    /* 证据链核对过的开源授权（标准文本/仓库 LICENSE/权利人开源声明，如仓耳）同属可衍生；
       免费商用但禁止改字再分发的品牌字（阿里等）不算开源，避免谱系导语误称「开源源头」 */
    if (!(ev.verified && ev.sourceUrl)) return false;
    return ev.sourceKind === 'standard' || ev.sourceKind === 'github_license' ||
      ev.sourceKind === 'rights_holder';
  }


  /**
   * 服务状态三档（货架能否托管，不是「核对没核对」 alone）：
   * 正常 / 受限 / 不可用。优先用现有 tags、licenseTier、licenseEvidence。
   * 免费商用 / 开源商用（OFL）→ 正常（待核对只作从句）；cite-closed / 个人免费 / 禁托管 → 受限。
   */
  function serviceStatus(font) {
    const tags = (font && font.tags) || [];
    const has = function (t) {
      for (let i = 0; i < tags.length; i++) {
        if (String(tags[i]) === t) return true;
      }
      return false;
    };
    const tier = licenseTier(font);
    const ev = (font && font.licenseEvidence) || {};
    const verified = !!(font && font.licenseVerified) || !!ev.verified;
    const blob = [
      (font && font.license) || '',
      (font && font.licenseName) || '',
      (font && font.licenseNotes) || ''
    ].join(' ');
    const restr = ((ev.restrictions) || []).concat([(ev.quote) || '']).join(' ');

    /* 不可用：产品下架 / 明确不得用 / 需授权（不适合免费货架） */
    if (has('retired-from-product') || has('hung')) {
      return { status: '不可用', reason: 'retired' };
    }
    if (/不适用|已撤销|\brevoked\b|不得使用/i.test(blob)) {
      return { status: '不可用', reason: 'forbidden' };
    }
    if (tier === '需授权') {
      return { status: '不可用', reason: 'need_auth' };
    }

    /* 受限：个人免费 / 待核实 / cite-closed·禁托管再分发。协议原文待核对不是降档。 */
    if (tier === '个人免费') {
      return { status: '受限', reason: 'personal' };
    }
    if (tier === '待核实') {
      return { status: '受限', reason: 'unverified_tier' };
    }
    /* 吉利/摩登等 cite-closed：用户须自证授权才能商用引用 → 受限 + 可上传证书 */
    if (has('cite-closed')) {
      return { status: '受限', reason: 'no_redistrib' };
    }
    /* 明确禁止托管/CDN/再分发字体文件本身（不是 OFL「勿单独售卖」、也不是品牌免费商用「不得改字再分发」） */
    if (/不得再分发字体|禁止再分发字体|不得提供(?:字体)?下载|禁止托管|不得.*CDN/i.test(restr)) {
      return { status: '受限', reason: 'no_redistrib' };
    }

    /* 免费商用 / 开源商用（OFL）：货架可托管 → 正常。
       licenseVerified 假 / 协议原文待核对只作句内从句，不得降为受限、不得推上传证书。 */
    if (tier === '开源商用' || tier === '免费商用') {
      return { status: '正常', reason: verified ? 'ok' : 'pending_proof' };
    }
    return { status: '受限', reason: 'unverified_tier' };
  }



  /**
   * 商业主体：货架运营/商业化主体，≠ 版权归属（rights_holder / 谁拥有字型）。
   * 关系档按「授权时长形态」（≠ 服务状态 正常/受限）：
   *   platform 官方 — 默认文派，或文派采买/买断（无期限）；UI 标签「官方」；
   *     默认文派时正文「…提供字体平台及技术支持。」。内部 key 仍为 platform。
   *   signed 签约 — 凡有时限的授权一律签约；可附 expiresAt →「授权至 YYYY-MM-DD」。
   *   partner 合作 — 字段/枚举保留供后续；本波不对期限授权自动落合作（期限=签约）。
   * 默认官方 + 文派（广州）科技有限公司。字段：
   *   font|product.commercialEntity = string | { name, status, expiresAt? }
   *   font|product.commercialEntityStatus = platform|signed|partner（亦认 官方/运营/平台/签约/合作）
   *   font|product.commercialEntityExpiresAt = YYYY-MM-DD（可选；官方/platform 档忽略）
   * 不必全库填；空则回落默认。仅有 expiresAt、未显式 status → 签约。
   * 合作方公司名不得套用默认文派「提供字体平台及技术支持」句。
   */
  var DEFAULT_COMMERCIAL_ENTITY = '文派（广州）科技有限公司';
  var COMMERCIAL_ENTITY_STATUS_LABEL = {
    platform: '官方',
    signed: '签约',
    partner: '合作'
  };
  function normalizeCommercialEntityStatus(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    if (s === 'platform' || s === '平台' || s === '运营' || s === '官方' || s === 'operate' || s === 'ops') return 'platform';
    if (s === 'signed' || s === '签约') return 'signed';
    if (s === 'partner' || s === '合作') return 'partner';
    return '';
  }
  function normalizeCommercialEntityExpiresAt(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    var m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
  }
  function commercialEntity(font, product) {
    function pick(src) {
      var name = '';
      var status = '';
      var expiresAt = '';
      if (!src) return { name: name, status: status, expiresAt: expiresAt };
      var ce = src.commercialEntity;
      if (typeof ce === 'string' && ce.trim()) {
        name = ce.trim();
      } else if (ce && typeof ce === 'object') {
        if (ce.name != null && ce.name !== '') name = String(ce.name).trim();
        status = normalizeCommercialEntityStatus(ce.status);
        expiresAt = normalizeCommercialEntityExpiresAt(ce.expiresAt);
      }
      if (!status) status = normalizeCommercialEntityStatus(src.commercialEntityStatus);
      if (!expiresAt) expiresAt = normalizeCommercialEntityExpiresAt(src.commercialEntityExpiresAt);
      return { name: name, status: status, expiresAt: expiresAt };
    }
    var a = pick(font);
    var b = pick(product);
    var name = a.name || b.name || DEFAULT_COMMERCIAL_ENTITY;
    var status = a.status || b.status || '';
    var expiresAt = a.expiresAt || b.expiresAt || '';
    /* 有时限且未显式档位 → 签约（本波不对期限授权自动落合作）。 */
    if (!status) status = expiresAt ? 'signed' : 'platform';
    /* 官方档（platform）：买断/默认文派，不挂到期日。 */
    if (status === 'platform') expiresAt = '';
    return {
      name: name,
      status: status,
      label: COMMERCIAL_ENTITY_STATUS_LABEL[status] || COMMERCIAL_ENTITY_STATUS_LABEL.platform,
      expiresAt: expiresAt
    };
  }
  function commercialEntityName(font, product) {
    return commercialEntity(font, product).name;
  }



  /* —— 证书开引用（lab）：本机 localStorage，按 user-or-anon × font 记权；不灌 CDN —— */
  const CERT_GRANTS_KEY = 'wf-cert-grants-v1';
  const CERT_ANON_KEY = 'wf-cert-anon-id';

  function certAnonId() {
    try {
      let id = localStorage.getItem(CERT_ANON_KEY);
      if (!id) {
        id = 'a' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        localStorage.setItem(CERT_ANON_KEY, id);
      }
      return id;
    } catch (e) {
      return 'anon-session';
    }
  }

  /** 当前浏览身份：已登录优先 email/id，否则 anon:{browserId} */
  function certSubjectKey() {
    try {
      const u = (window.WFChrome && WFChrome.user && WFChrome.user()) || null;
      if (u) {
        if (u.id) return 'user:' + String(u.id);
        if (u.email) return 'user:' + String(u.email).trim().toLowerCase();
      }
    } catch (e) { /* ignore */ }
    return 'anon:' + certAnonId();
  }

  function certFontKey(fontOrToken) {
    if (!fontOrToken) return '';
    if (typeof fontOrToken === 'string') {
      return resolveFamilyAlias(fontOrToken) || String(fontOrToken).trim().toLowerCase();
    }
    const slug = fontSlug(fontOrToken) || String(fontOrToken.normalized || '').toLowerCase();
    return resolveFamilyAlias(slug) || slug;
  }

  function readCertGrantsAll() {
    try {
      const raw = JSON.parse(localStorage.getItem(CERT_GRANTS_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (e) {
      return {};
    }
  }

  function writeCertGrantsAll(map) {
    try {
      localStorage.setItem(CERT_GRANTS_KEY, JSON.stringify(map || {}));
    } catch (e) { /* ignore */ }
  }

  function getCertGrant(fontOrToken, subjectOpt) {
    const fk = certFontKey(fontOrToken);
    if (!fk) return null;
    const subject = subjectOpt || certSubjectKey();
    const all = readCertGrantsAll();
    const bag = all[subject];
    if (!bag || typeof bag !== 'object') return null;
    const g = bag[fk];
    return g && typeof g === 'object' ? g : null;
  }

  function certStatusNorm(st) {
    st = String(st || '').toLowerCase();
    if (st === 'approved-lab') return 'approved';
    if (st === 'pending' || st === 'approved' || st === 'rejected') return st;
    return st || '';
  }

  /** 是否已审核通过（仅 approved / approved-lab 开引用）。 */
  function hasCertGrant(fontOrToken, subjectOpt) {
    const g = getCertGrant(fontOrToken, subjectOpt);
    if (!g) return false;
    return certStatusNorm(g.status) === 'approved';
  }

  function certGrantIsPending(fontOrToken, subjectOpt) {
    const g = getCertGrant(fontOrToken, subjectOpt);
    return !!(g && certStatusNorm(g.status) === 'pending');
  }

  function certGrantIsRejected(fontOrToken, subjectOpt) {
    const g = getCertGrant(fontOrToken, subjectOpt);
    return !!(g && certStatusNorm(g.status) === 'rejected');
  }

  /** 说人话状态标签。 */
  function certStatusLabel(st) {
    const n = certStatusNorm(st);
    if (n === 'pending') return '待审核';
    if (n === 'approved') return '已通过';
    if (n === 'rejected') return '已驳回';
    return st ? String(st) : '无记录';
  }

  /**
   * 详情 CTA：上传证书 / 审核中 / 查看证书 / 重新上传
   */
  function certCtaLabel(fontOrToken, subjectOpt) {
    const g = getCertGrant(fontOrToken, subjectOpt);
    if (!g) return '上传证书';
    const n = certStatusNorm(g.status);
    if (n === 'pending') return '审核中';
    if (n === 'approved') return '查看证书';
    if (n === 'rejected') return '重新上传';
    return '上传证书';
  }

  /** 当前身份下全部 grant（跨字体）。 */
  function listCertGrants(subjectOpt) {
    const subject = subjectOpt || certSubjectKey();
    const all = readCertGrantsAll();
    const bag = all[subject];
    if (!bag || typeof bag !== 'object') return [];
    return Object.keys(bag).map(function (k) {
      const g = bag[k];
      if (!g || typeof g !== 'object') return null;
      if (!g.fontKey) g.fontKey = k;
      return g;
    }).filter(Boolean).sort(function (a, b) {
      return String(b.at || '').localeCompare(String(a.at || ''));
    });
  }

  /**
   * 写入本机演示授权。正式环境应由 vault API 按 userId×fontId 存证审核。
   * status: pending | approved | approved-lab | rejected
   * @returns {object} grant
   */
  function setCertGrant(font, meta) {
    const fk = certFontKey(font);
    if (!fk) throw new Error('缺少字体标识');
    const subject = certSubjectKey();
    const all = readCertGrantsAll();
    if (!all[subject] || typeof all[subject] !== 'object') all[subject] = {};
    const prev = all[subject][fk] && typeof all[subject][fk] === 'object' ? all[subject][fk] : {};
    meta = meta || {};
    const status = meta.status != null ? String(meta.status) : (prev.status || 'pending');
    const grant = {
      status: status,
      fontKey: fk,
      family: (font && font.family ? String(font.family) : '') || prev.family || '',
      normalized: (font && font.normalized ? String(font.normalized) : '') || prev.normalized || fk,
      name: (font && font.name ? String(font.name) : '') || prev.name || fk,
      fileName: meta.fileName != null ? String(meta.fileName) : (prev.fileName || ''),
      fileSize: meta.fileSize != null ? Number(meta.fileSize) || 0 : (prev.fileSize || 0),
      mime: meta.mime != null ? String(meta.mime) : (prev.mime || ''),
      reason: meta.reason != null ? String(meta.reason) : (prev.reason || ''),
      reviewedAt: meta.reviewedAt != null ? String(meta.reviewedAt) : (prev.reviewedAt || ''),
      subject: subject,
      at: meta.at || prev.at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      labMock: meta.labMock != null ? !!meta.labMock : (meta.vaultId ? false : (prev.labMock !== false)),
      vaultId: meta.vaultId != null ? String(meta.vaultId) : (prev.vaultId || '')
    };
    all[subject][fk] = grant;
    writeCertGrantsAll(all);
    return grant;
  }

  /** lab 模拟审核：通过 / 驳回（写 status + reason）。 */
  function reviewCertGrant(fontOrToken, decision, reason) {
    const g = getCertGrant(fontOrToken);
    if (!g) throw new Error('没有待审记录');
    const font = (typeof fontOrToken === 'object' && fontOrToken) ||
      getBySlug(g.normalized || g.fontKey) ||
      { normalized: g.normalized || g.fontKey, name: g.name, family: g.family };
    const ok = String(decision || '').toLowerCase() === 'approved' ||
      String(decision || '').toLowerCase() === 'approve' ||
      decision === true;
    return setCertGrant(font, {
      status: ok ? 'approved' : 'rejected',
      reason: ok ? '' : String(reason || '证书未覆盖网页字体嵌入 / webfont 用途（lab 模拟驳回）'),
      reviewedAt: new Date().toISOString(),
      fileName: g.fileName,
      fileSize: g.fileSize,
      mime: g.mime,
      at: g.at
    });
  }

  function clearCertGrant(fontOrToken) {
    const fk = certFontKey(fontOrToken);
    if (!fk) return false;
    const subject = certSubjectKey();
    const all = readCertGrantsAll();
    if (!all[subject] || !all[subject][fk]) return false;
    delete all[subject][fk];
    writeCertGrantsAll(all);
    return true;
  }

  /**
   * CDN / embed 引用是否开放。与服务状态「仍可预览」可并存：
   * 禁止托管、不得 CDN、不得/禁止嵌入 → 引用关闭（对照货架：吉利/摩登）。
   * 本机证书 grant（lab）可按账号/匿名覆盖 cite-closed，不改全局 tag、不灌 fonts-packages。
   */
  function citeAllowed(font) {
    const ss = serviceStatus(font);
    if (ss.status === '不可用') return { ok: false, reason: ss.reason || 'unavailable' };
    if (hasCertGrant(font)) {
      const g = getCertGrant(font);
      const reason = g && g.labMock === false ? 'cert-grant' : 'cert-grant-lab';
      return { ok: true, reason: reason, grant: g };
    }
    const ev = (font && font.licenseEvidence) || {};
    const restr = ((ev.restrictions) || []).concat([(ev.quote) || ''], [(font && font.licenseNotes) || '']).join(' ');
    if (/禁止托管|不得\s*CDN|禁止\s*CDN|不得.*热链|不可引用|禁止引用|不得嵌入|禁止嵌入|不得.*嵌入网站/i.test(restr)) {
      return { ok: false, reason: 'no_embed' };
    }
    if ((font.tags || []).indexOf('cite-closed') !== -1) {
      return { ok: false, reason: 'cite-closed' };
    }
    if (ss.status === '受限' && ss.reason === 'no_redistrib') {
      return { ok: false, reason: 'no_redistrib' };
    }
    return { ok: true, reason: 'ok' };
  }

  /**
   * 把 vault /api/font-certs 列表合并进本机 grant（按 fontKey）。
   * live 成功后覆盖同 key 的 vault 记录；保留无 vaultId 的 lab mock。
   */
  function applyVaultFontCerts(certs) {
    const list = Array.isArray(certs) ? certs : [];
    const subject = certSubjectKey();
    const all = readCertGrantsAll();
    if (!all[subject] || typeof all[subject] !== 'object') all[subject] = {};
    const bag = all[subject];
    list.forEach(function (c) {
      if (!c || !c.fontKey) return;
      const fk = certFontKey(c.fontKey || c.normalized);
      if (!fk) return;
      const prev = bag[fk] && typeof bag[fk] === 'object' ? bag[fk] : {};
      bag[fk] = {
        status: c.status || 'pending',
        fontKey: fk,
        family: c.family || prev.family || '',
        normalized: c.normalized || prev.normalized || fk,
        name: c.name || prev.name || fk,
        fileName: c.fileName || prev.fileName || '',
        fileSize: c.fileSize || prev.fileSize || 0,
        mime: c.mime || prev.mime || '',
        reason: c.reason || prev.reason || '',
        reviewedAt: c.reviewedAt || prev.reviewedAt || '',
        subject: subject,
        at: c.submittedAt || prev.at || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        labMock: false,
        vaultId: c.id || prev.vaultId || ''
      };
    });
    writeCertGrantsAll(all);
    return list.length;
  }

  function syncVaultFontCerts() {
    if (!window.WFApi || !WFApi.listFontCerts) return Promise.resolve(0);
    return WFApi.listFontCerts().then(function (rows) {
      return applyVaultFontCerts(rows || []);
    }).catch(function () { return 0; });
  }

  function matchFilter(font, tag, keyword, license) {
    const tagQ = (tag || '').trim();
    const kw = (keyword || '').trim().toLowerCase();
    const licQ = (license || '').trim();
    let ok = true;
    if (ok && licQ && licenseTier(font) !== licQ) ok = false;
    if (tagQ) {
      const t = tagQ.toLowerCase();
      const tags = (font.tags || []).map(function (x) { return String(x).toLowerCase(); });
      const cat = String(font.category || '').toLowerCase();
      const name = String(font.name || '').toLowerCase();
      const en = String(font.en || '').toLowerCase();
      ok = tags.indexOf(t) !== -1 ||
        tags.some(function (x) { return x.indexOf(t) !== -1; }) ||
        cat.indexOf(t) !== -1 ||
        name.indexOf(t) !== -1 ||
        en.indexOf(t) !== -1;
    }
    if (ok && kw) {
      const hay = [
        font.name, font.en, font.family, font.normalized,
        font.designer, font.designerShort, font.category,
        font.foundry, font.brand && font.brand.name,
        font.foundryInfo && (font.foundryInfo.name + ' ' + (font.foundryInfo.en || '') + ' ' + (font.foundryInfo.short || '')),
        (font.collaboratorInfos || []).map(function (c) {
          return (c.name || '') + ' ' + (c.en || '') + ' ' + (c.short || '');
        }).join(' '),
        font.ownerInfo && (font.ownerInfo.name + ' ' + (font.ownerInfo.en || '') + ' ' + (font.ownerInfo.short || '')),
        font.makerInfo && (font.makerInfo.name + ' ' + (font.makerInfo.en || '') + ' ' + (font.makerInfo.short || '')),
        font.lineage && (font.lineage.groupName + ' ' + font.lineage.upstreamName),
        (font.tags || []).join(' '), font.description, font.license
      ].join(' ').toLowerCase();
      ok = hay.indexOf(kw) !== -1;
    }
    return ok;
  }

  function filterCatalog(opts) {
    const tag = (opts && opts.tag != null) ? opts.tag : getQuery('tag');
    const keyword = (opts && opts.keyword != null) ? opts.keyword : getQuery('keyword');
    const license = (opts && opts.license != null) ? opts.license : getQuery('license');
    return catalog.filter(function (f) { return matchFilter(f, tag, keyword, license); });
  }

  function inferLanguage(font) {
    const blob = ((font.name || '') + ' ' + (font.en || '') + ' ' + (font.description || '')).toLowerCase();
    if (/繁体|traditional|tc\b|hong.?kong|taiwan/.test(blob)) return '繁体中文';
    if (/日文|japanese|hiragana|katakana/.test(blob)) return '日文';
    if (/韩文|korean|hangul/.test(blob)) return '韩文';
    if (/english|latin|英文/.test(blob) && !/中文|cjk|汉字/.test(blob)) return '英文';
    return '简体中文';
  }
  /** 这款字是否有汉字面。latin 名 + 字数很少 + 语言空 = 没有（AAR/Thai/Viet）。 */
  function hasCjkFace(font) {
    if (!font) return true;
    const langs = font.languages || [];
    if (langs.length) {
      return langs.some(function (l) { return /中|日|韩|CJK|汉|Japanese|Korean|Chinese/i.test(String(l)); });
    }
    if ((Number(font.charCount) || 0) >= 1000) return true;
    if (/[\u3400-\u9fff]/.test(String(font.name || ''))) return true;
    if (/^[A-Za-z0-9][A-Za-z0-9 .+-]*$/.test(String(font.name || '').trim()) && (Number(font.charCount) || 0) < 200) return false;
    return inferLanguage(font) !== '英文';
  }
  var LATIN_SAMPLE = 'The quick brown fox 0123';
  function sampleForFont(font, userSample) {
    const v = userSample == null ? '' : String(userSample);
    if (!v) return '文';
    if (hasCjkFace(font)) return v;
    if (/[\u3400-\u9fff]/.test(v)) return LATIN_SAMPLE;
    return v;
  }

  function renderExtraFooter(target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.classList.add('site-extra-footer');
    el.classList.remove('is-dark');
    const icp = '<a href="' + ICP_HREF + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(ICP_NO) + '</a>';
    el.innerHTML =
      '<div class="container extra-inner">' +
        '<p class="extra-copy">' + copyrightLine() + ' · ' + icp + '</p>' +
        '<nav class="extra-links" aria-label="条款">' +
        EXTRA_LINKS.map(function (l) {
          const ext = l.external || /^https?:/.test(l.path);
          return '<a href="' + escapeHtml(pageHref(l.path)) + '"' +
            (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
            escapeHtml(l.label) + '</a>';
        }).join('') +
        '</nav>' +
      '</div>';
  }

  function injectFooterIfMissing() {
    const selectors = [
      'body.page-fonts', 'body.page-detail', 'body.page-bag',
      'body.page-embed', 'body.page-docs', 'body.page-home'
    ];
    let need = false;
    for (let i = 0; i < selectors.length; i++) {
      if (document.querySelector(selectors[i])) { need = true; break; }
    }
    if (!need) return;
    let foot = document.getElementById('wfExtraFooter') ||
      document.querySelector('.site-extra-footer') ||
      document.querySelector('.home-footer');
    if (!foot) {
      foot = document.createElement('footer');
      foot.id = 'wfExtraFooter';
      foot.className = 'site-extra-footer';
      document.body.appendChild(foot);
    }
    renderExtraFooter(foot);
  }

  function normalizePreset(p, i) {
    const id = String((p && p.id) || ('p' + i)).replace(/[^a-z0-9_-]/gi, '') || ('p' + i);
    return {
      id: id.slice(0, 24),
      label: String((p && p.label) || '预设').slice(0, 12),
      text: String((p && p.text) || '').slice(0, 120)
    };
  }
  function getSpecimenConfig() {
    const base = JSON.parse(JSON.stringify(DEFAULT_SPECIMEN));
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(SPECIMEN_CFG_KEY) || 'null'); } catch (e) { /* ignore */ }
    if (!raw || typeof raw !== 'object') return base;
    if (raw.listDefault) base.listDefault = String(raw.listDefault).slice(0, 120);
    if (raw.detailPreset) base.detailPreset = String(raw.detailPreset).slice(0, 24);
    if (raw.wallText) base.wallText = String(raw.wallText).slice(0, 200);
    const sz = parseInt(raw.size, 10);
    if (Number.isFinite(sz)) base.size = Math.max(16, Math.min(160, sz));
    if (Array.isArray(raw.presets) && raw.presets.length) {
      base.presets = raw.presets.map(normalizePreset).filter(function (p) { return p.text; }).slice(0, 10);
    }
    if (!base.presets.length) base.presets = JSON.parse(JSON.stringify(DEFAULT_SPECIMEN.presets));
    if (!base.presets.some(function (p) { return p.id === base.detailPreset; })) {
      base.detailPreset = (base.presets.filter(function (p) { return p.id === 'poem'; })[0] || base.presets[0]).id;
    }
    return base;
  }
  function applySpecimenSize(px) {
    document.querySelectorAll('[data-specimen]').forEach(function (n) {
      n.style.fontSize = px + 'px';
    });
    document.querySelectorAll('[data-size-val]').forEach(function (n) {
      n.textContent = px + 'px';
    });
  }
  function setSpecimenConfig(cfg) {
    const prev = getSpecimenConfig();
    const next = {
      listDefault: String((cfg && cfg.listDefault) || DEFAULT_SPECIMEN.listDefault).slice(0, 120),
      detailPreset: String((cfg && cfg.detailPreset) || DEFAULT_SPECIMEN.detailPreset).slice(0, 24),
      size: (function () {
        const n = parseInt(cfg && cfg.size, 10);
        return Number.isFinite(n) ? Math.max(16, Math.min(160, n)) : DEFAULT_SPECIMEN.size;
      })(),
      wallText: String((cfg && cfg.wallText) || DEFAULT_SPECIMEN.wallText).slice(0, 200),
      presets: (Array.isArray(cfg && cfg.presets) ? cfg.presets : DEFAULT_SPECIMEN.presets)
        .map(normalizePreset).filter(function (p) { return p.text; }).slice(0, 10)
    };
    if (!next.presets.length) next.presets = JSON.parse(JSON.stringify(DEFAULT_SPECIMEN.presets));
    if (!next.presets.some(function (p) { return p.id === next.detailPreset; })) {
      next.detailPreset = next.presets[0].id;
    }
    try {
      localStorage.setItem(SPECIMEN_CFG_KEY, JSON.stringify(next));
      if (localStorage.getItem(SAMPLE_KEY) === prev.listDefault) localStorage.removeItem(SAMPLE_KEY);
      if (String(localStorage.getItem(SIZE_KEY) || '') === String(prev.size)) localStorage.removeItem(SIZE_KEY);
    } catch (e) { /* ignore */ }
    document.dispatchEvent(new CustomEvent('wf:specimen', { detail: next }));
    return next;
  }

  window.WFProto = {
    PAGE_SIZE: PAGE_SIZE,
    EXTRA_LINKS: EXTRA_LINKS,
    copyrightLine: copyrightLine,
    SAFE_CODE: copyrightLine(),
    escapeHtml: escapeHtml,
    loadCatalog: loadCatalog,
    enrichFontFromFull: enrichFontFromFull,
    getCatalogList: function () { return catalog.slice(); },
    getFoundries: function () { return foundries.slice(); },
    getFoundryById: getFoundryById,
    getFoundryParent: getFoundryParent,
    getFoundryChildren: getFoundryChildren,
    getFoundrySubtreeIds: getFoundrySubtreeIds,
    fontBelongsToFoundry: fontBelongsToFoundry,
    countFontsUnderFoundry: countFontsUnderFoundry,
    canShowOrgLineage: canShowOrgLineage,
    getAvatarUrl: getAvatarUrl,
    licenseTier: licenseTier,
    resolveLicenseEvidence: resolveLicenseEvidence,
    resolveLineage: resolveLineage,
    getLineageData: function () { return lineageData; },
    isOpenFont: isOpenFont,
    forbidsOpenDerive: forbidsOpenDerive,
    forbidsFontRedistrib: forbidsFontRedistrib,
    serviceStatus: serviceStatus,
    commercialEntity: commercialEntity,
    commercialEntityName: commercialEntityName,
    citeAllowed: citeAllowed,
    citeClosedFamily: citeClosedFamily,
    certSubjectKey: certSubjectKey,
    certFontKey: certFontKey,
    getCertGrant: getCertGrant,
    hasCertGrant: hasCertGrant,
    certGrantIsPending: certGrantIsPending,
    certGrantIsRejected: certGrantIsRejected,
    certStatusNorm: certStatusNorm,
    certStatusLabel: certStatusLabel,
    certCtaLabel: certCtaLabel,
    listCertGrants: listCertGrants,
    setCertGrant: setCertGrant,
    reviewCertGrant: reviewCertGrant,
    clearCertGrant: clearCertGrant,
    applyVaultFontCerts: applyVaultFontCerts,
    syncVaultFontCerts: syncVaultFontCerts,
    slugify: slugify,
    getFont: function (id) { return getById(id); },
    getFontBySlug: getBySlug,
    fontSlug: fontSlug,
    resolveFamilyAlias: resolveFamilyAlias,
    detailHref: detailHref,
    livePagePath: livePagePath,
    foundryHref: foundryHref,
    foundryUrlSlug: foundryUrlSlug,
    fontUrlSlug: fontUrlSlug,
    isUrlSlug: isUrlSlug,
    publicDetailPath: publicDetailPath,
    publicDetailUrl: publicDetailUrl,
    getFontStats: getFontStats,
    bumpFontStat: bumpFontStat,
    paintFontStats: paintFontStats,
    getCatalog: function (id) {
      const f = getById(id);
      return f ? enrich({ id: id }) : null;
    },
    filterCatalog: filterCatalog,
    matchFilter: matchFilter,
    weightToCss: weightToCss,
    cssFamilyStack: cssFamilyStack,
    ensureFontCss: ensureFontCss,
    readyFace: readyFace,
    inferLanguage: inferLanguage,
    hasCjkFace: hasCjkFace,
    sampleForFont: sampleForFont,
    renderExtraFooter: renderExtraFooter,
    defaultSpecimen: function () { return JSON.parse(JSON.stringify(DEFAULT_SPECIMEN)); },
    getSpecimenConfig: getSpecimenConfig,
    setSpecimenConfig: setSpecimenConfig,
    resetSpecimenConfig: function () {
      try { localStorage.removeItem(SPECIMEN_CFG_KEY); } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent('wf:specimen', { detail: getSpecimenConfig() }));
    },
    getSample: function () {
      try {
        const v = localStorage.getItem(SAMPLE_KEY);
        if (v != null && v !== '') return v;
      } catch (e) { /* ignore */ }
      return getSpecimenConfig().listDefault;
    },
    setSample: function (v) {
      localStorage.setItem(SAMPLE_KEY, v);
      document.querySelectorAll('[data-specimen]').forEach(function (n) {
        const host = n.closest('[data-font-id]');
        const font = host ? getById(host.getAttribute('data-font-id')) : null;
        n.textContent = sampleForFont(font, v);
      });
      refreshFacesForSample(v);
    },
    getSize: function () {
      try {
        const raw = localStorage.getItem(SIZE_KEY);
        if (raw != null && raw !== '') {
          const s = parseInt(raw, 10);
          if (Number.isFinite(s)) return s;
        }
      } catch (e) { /* ignore */ }
      return getSpecimenConfig().size;
    },
    setSize: function (px) {
      localStorage.setItem(SIZE_KEY, String(px));
      applySpecimenSize(px);
    },
    getPicks: function () { return loadPicks().map(enrich); },
    picks: function () { return loadPicks().map(enrich); },
    hasPick: function (id) { return !!loadPicks().find(function (x) { return x.id === id; }); },
    addPick: function (id, name, extra) {
      const arr = loadPicks();
      if (!arr.find(function (x) { return x.id === id; })) {
        const meta = getById(id) || {};
        arr.push(Object.assign({
          id: id,
          name: name || meta.name || id,
          family: meta.family,
          designer: meta.designerShort || meta.designer,
          weights: meta.weights
        }, extra || {}));
        savePicks(arr);
      } else {
        updateBadges(arr.length);
      }
      WFProto.syncJoinButtons();
      return arr.length;
    },
    removePick: function (id) {
      const arr = loadPicks().filter(function (x) { return x.id !== id; });
      savePicks(arr);
      WFProto.syncJoinButtons();
      return arr.length;
    },
    clearPicks: function () {
      savePicks([]);
      WFProto.syncJoinButtons();
      return 0;
    },
    replacePicksLocal: replacePicksLocal,
    syncPicksWithVault: syncPicksWithVault,
    loadFavs: loadFavs,
    replaceFavsLocal: replaceFavsLocal,
    syncFavsWithVault: syncFavsWithVault,
    togglePick: function (id, name) {
      if (WFProto.hasPick(id)) return WFProto.removePick(id);
      return WFProto.addPick(id, name);
    },
    hasFavFont: function (id) { return hasFav(loadFavs().fonts, id); },
    hasFavAuthor: function (id) { return hasFav(loadFavs().authors, id); },
    toggleFavFont: function (id, name) { return toggleFav('fonts', id, name); },
    toggleFavAuthor: function (id, name) { return toggleFav('authors', id, name); },
    count: function () { return loadPicks().length; },
    syncJoinButtons: function () {
      document.querySelectorAll('[data-join]').forEach(function (btn) {
        const id = btn.getAttribute('data-join');
        setJoinLabel(btn, WFProto.hasPick(id));
      });
    },
    getQuery: getQuery,
    /** Legacy DOM filter — prefer ClientScrollList for fonts.html */
    applyListFilters: function (opts) {
      const tag = (opts && opts.tag != null) ? opts.tag : getQuery('tag');
      const keyword = ((opts && opts.keyword != null) ? opts.keyword : getQuery('keyword')).trim().toLowerCase();
      const rows = document.querySelectorAll('.font-row[data-font-id]');
      let shown = 0;
      rows.forEach(function (row) {
        const id = row.getAttribute('data-font-id');
        const meta = getById(id) || {};
        const fake = {
          id: id,
          name: row.getAttribute('data-name') || meta.name,
          tags: (row.getAttribute('data-tags') || (meta.tags || []).join(',')).split(/[,，]/),
          category: meta.category,
          en: meta.en,
          family: meta.family,
          designer: meta.designer,
          description: meta.description,
          license: meta.license
        };
        const ok = matchFilter(fake, tag, keyword);
        row.hidden = !ok;
        if (ok) shown += 1;
      });
      const countEl = document.getElementById('fontCount');
      if (countEl) countEl.textContent = String(shown);
      document.querySelectorAll('.vtag').forEach(function (a) {
        try {
          const u = new URL(a.href, location.href);
          const t = u.searchParams.get('tag') || '';
          a.classList.toggle('active', !!tag && t === tag);
        } catch (e) { /* ignore */ }
      });
      return shown;
    },
    bindNavSearch: function (input, clearBtn) {
      if (!input || input._wfBound) return;
      input._wfBound = true;
      const tag = getQuery('tag');
      const kw = getQuery('keyword');
      if (kw) input.value = kw;
      const go = function () {
        const v = (input.value || '').trim();
        const params = new URLSearchParams();
        if (v) params.set('keyword', v);
        if (tag) params.set('tag', tag);
        const cur = (window.WFFontsList && window.WFFontsList.getFilter) ? window.WFFontsList.getFilter() : {};
        if (cur.license) params.set('license', cur.license);
        const q = params.toString();
        if (document.body.classList.contains('page-fonts') && window.WFFontsList) {
          const url = location.pathname + (q ? '?' + q : '');
          history.replaceState(null, '', url);
          window.WFFontsList.refresh({ keyword: v, tag: tag });
        } else if (document.body.classList.contains('page-fonts')) {
          const url = location.pathname + (q ? '?' + q : '');
          history.replaceState(null, '', url);
          WFProto.applyListFilters({ keyword: v, tag: tag });
        } else {
          location.href = pageHref('fonts.html') + (q ? '?' + q : '');
        }
      };
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); go(); }
      });
      // 列表页：输入即搜（220ms 防抖），回车仍保留
      if (document.body.classList.contains('page-fonts')) {
        let debounce = null;
        input.addEventListener('input', function () {
          clearTimeout(debounce);
          debounce = setTimeout(go, 220);
        });
      }
      if (clearBtn) {
        const syncClear = function () {
          clearBtn.hidden = !(input.value || '').trim();
        };
        syncClear();
        input.addEventListener('input', syncClear);
        clearBtn.addEventListener('click', function () {
          input.value = '';
          syncClear();
          if (document.body.classList.contains('page-fonts') && window.WFFontsList) {
            const params = new URLSearchParams();
            if (tag) params.set('tag', tag);
            const q = params.toString();
            history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
            window.WFFontsList.refresh({ keyword: '', tag: tag });
          } else if (document.body.classList.contains('page-fonts')) {
            const params = new URLSearchParams();
            if (tag) params.set('tag', tag);
            const q = params.toString();
            history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
            WFProto.applyListFilters({ keyword: '', tag: tag });
          } else {
            location.href = 'fonts.html' + (tag ? '?tag=' + encodeURIComponent(tag) : '');
          }
        });
      }
    },
    CDN: CDN,
    SITE_ORIGIN: SITE_ORIGIN,
    CSS_API: CSS_API,
    API_MODE: 'mock', /* 本机默认；app/staging 由 wf-api 默认 live。override: localStorage['wf-api-mode'] */
    ANALYSIS_META_VER: ANALYSIS_META_VER,
    ALLOW_DEMO: ALLOW_DEMO,
    analysisMetaUrl: analysisMetaUrl,
    dataUrl: dataUrl,
    CDN_HOSTS: CDN_HOSTS,
    CDN_LICENSE_NOTE: CDN_LICENSE_NOTE,
    cdnHost: cdnHost,
    cdnOrigin: cdnOrigin,
    setCdn: setCdn,
    cdnSwitchHtml: cdnSwitchHtml,
    syncCdnUi: syncCdnUi,
    familySlug: familySlug,
    weightName: weightName,
    packageWeight: packageWeight,
    packageName: packageName,
    packageCssUrl: cssApiUrl,
    cssApiUrl: cssApiUrl,
    certCssApiUrl: certCssApiUrl,
    cssUrl: cssUrl,
    packageResultUrl: packageResultUrl,
    embedCssUrl: embedCssUrl,
    /** 项目对外地址：跟当前选的 CDN 节点走 */
    cdnOriginById: function (id) {
      const h = CDN_HOSTS.filter(function (x) { return x.id === id; })[0] || CDN_HOSTS[0];
      return 'https://' + h.host;
    },
    projectCssUrl: function (slug, file, origin) {
      return (origin || cdnOrigin()) + '/p/' + encodeURIComponent(slug || '') + '/' + (file || 'index.css');
    },
    CSS_VERSIONS: [
      { id: 'full', hint: '完整字符集（推荐）' },
      { id: 'zh', hint: '中文子集（zh_index.css）' }
    ],
    licenseCanDo: function (font) {
      const name = String((font && (font.licenseName || font.license)) || '');
      const tier = licenseTier(font);
      const ev = (font && font.licenseEvidence) || {};
      /* 证据链已核对（逐款原文 / 标准开源文本 / 仓库 LICENSE / 权利人条目）都不再走「还没核对」 */
      const checked = !!(font && font.licenseVerified) || !!ev.verified;
      if (/OFL|Open Font License/i.test(name)) {
        return '可免费用于网站与产品；保留许可声明；勿单独售卖字体文件。';
      }
      if (/Apache/i.test(name)) {
        return '可免费用于网站与产品；遵循 Apache-2.0 声明要求。';
      }
      if (tier === '需授权') return '需向权利方取得授权或购买后再用。';
      if (tier === '个人免费') return '个人可用，商用或改字要看原文。';
      if (tier === '免费商用' && checked) {
        return '可按声明免费用于商业项目；再分发或改字前请读原文。';
      }
      if (checked) {
        return '许可已核对，按条款使用即可。';
      }
      return '授权还没核对，用之前先看原文。';
    },
    relatedFonts: function (font, limit) {
      limit = limit || 6;
      if (!font) return [];
      const rest = catalog.filter(function (f) { return f.id !== font.id; });
      const group = font.lineage && font.lineage.group;
      const ownerId = font.ownerInfo && font.ownerInfo.id;
      const seen = {};
      function take(pred) {
        return rest.filter(function (f) {
          if (seen[f.id] || !pred(f)) return false;
          seen[f.id] = true;
          return true;
        });
      }
      const sameGroup = group ? take(function (f) { return f.lineage && f.lineage.group === group; }) : [];
      const sameOwner = ownerId ? take(function (f) { return f.ownerInfo && f.ownerInfo.id === ownerId; }) : [];
      const collabIds = (font.collaboratorInfos || []).map(function (c) { return c.id; });
      const sameCollab = collabIds.length ? take(function (f) {
        const ids = (f.collaboratorInfos || []).map(function (c) { return c.id; });
        if (f.ownerInfo && collabIds.indexOf(f.ownerInfo.id) !== -1) return true;
        return ids.some(function (id) { return collabIds.indexOf(id) !== -1 || id === ownerId; });
      }) : [];
      const cat = String(font.category || '').trim();
      const sameCat = cat ? take(function (f) { return String(f.category || '').trim() === cat; }) : [];
      return sameGroup.concat(sameOwner).concat(sameCollab).concat(sameCat).slice(0, limit);
    },
    formatCount: function (n) {
      const num = Number(n);
      if (!Number.isFinite(num) || num <= 0) return '—';
      return String(Math.round(num)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    copyText: function (text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).catch(function () {
          return fallbackCopy(text);
        });
      }
      return fallbackCopy(text);
    },
    /** ClientScrollViewList — infinite / load-more from fonts.json */
    mountFontsList: function (opts) {
      const listEl = document.getElementById((opts && opts.listId) || 'fontList');
      const countTotalEl = document.getElementById((opts && opts.countTotalId) || 'fontCountTotal');
      const countShownEl = document.getElementById((opts && opts.countShownId) || 'fontCountShown');
      const countLegacy = document.getElementById('fontCount');
      const loadMoreBtn = document.getElementById((opts && opts.loadMoreId) || 'loadMore');
      const sentinel = document.getElementById((opts && opts.sentinelId) || 'listSentinel');
      const pageSize = (opts && opts.pageSize) || PAGE_SIZE;
      let filtered = [];
      let shown = 0;
      let tag = getQuery('tag');
      let keyword = getQuery('keyword');
      let license = getQuery('license');

      function syncUrl() {
        const params = new URLSearchParams();
        if (keyword) params.set('keyword', keyword);
        if (tag) params.set('tag', tag);
        if (license) params.set('license', license);
        const q = params.toString();
        history.replaceState(null, '', location.pathname + (q ? '?' + q : ''));
      }

      function renderLicenseChips() {
        const box = document.getElementById('licenseChips');
        if (!box) return;
        const order = ['开源商用', '免费商用', '需授权', '个人免费', '待核实'];
        const counts = {};
        catalog.forEach(function (f) {
          const t = licenseTier(f);
          counts[t] = (counts[t] || 0) + 1;
        });
        const chips = [{ key: '', label: '全部', n: catalog.length }]
          .concat(order.filter(function (t) { return counts[t]; })
            .map(function (t) { return { key: t, label: t, n: counts[t] }; }));
        box.innerHTML = chips.map(function (c) {
          return '<button type="button" class="lic-chip' + (license === c.key ? ' is-active' : '') +
            '" data-lic="' + escapeHtml(c.key) + '">' + escapeHtml(c.label) +
            ' <span class="lic-n">' + c.n + '</span></button>';
        }).join('');
        box.querySelectorAll('[data-lic]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            license = btn.getAttribute('data-lic') || '';
            syncUrl();
            refresh();
          });
        });
      }

      function updateCount() {
        const total = filtered.length;
        const label = document.getElementById('fontsCountLabel');
        if (label) {
          label.innerHTML = '共找到 <strong id="fontCountTotal">' + total +
            '</strong> 个字体，已显示 <strong id="fontCountShown">' + shown + '</strong> 个';
        } else {
          if (countTotalEl) countTotalEl.textContent = String(total);
          if (countShownEl) countShownEl.textContent = String(shown);
        }
        const legacy = document.getElementById('fontCount');
        if (legacy) legacy.textContent = String(total);
        if (loadMoreBtn) {
          loadMoreBtn.hidden = shown >= total;
          loadMoreBtn.disabled = shown >= total;
        }
      }

      function highlightTags() {
        document.querySelectorAll('.vtag').forEach(function (a) {
          try {
            const u = new URL(a.href, location.href);
            const t = u.searchParams.get('tag') || '';
            a.classList.toggle('active', !!tag && t === tag);
          } catch (e) { /* ignore */ }
        });
      }

      function rowHtml(font) {
        const sample = WFProto.getSample();
        const size = WFProto.getSize();
        const author = font.designerShort || '—';
        const styles = font.styles || (font.weights && font.weights.length) || 1;
        const stack = cssFamilyStack(font.family);
        return (
          '<li class="font-row" data-font-id="' + escapeHtml(font.id) + '" data-name="' +
            escapeHtml(font.name) + '" data-tags="' + escapeHtml((font.tags || []).join(',')) +
            '" data-family="' + escapeHtml(font.family || '') + '">' +
            '<div class="font-row-head">' +
              '<span class="name">' + escapeHtml(font.name) + '</span>' +
              '<span class="author">作者 ' + escapeHtml(author) + '</span>' +
              '<span class="divider" aria-hidden="true"></span>' +
              '<span class="styles-count">可选样式 ' + styles + '</span>' +
              '<button type="button" class="btn-pill join-btn" data-join="' + escapeHtml(font.id) +
                '" data-name="' + escapeHtml(font.name) + '">加入选字袋</button>' +
            '</div>' +
            '<a class="font-row-preview" href="' + detailHref(font) +
              '" data-specimen style="font-family:' + escapeHtml(stack) + ';font-size:' + size + 'px">' +
              escapeHtml(sample) +
            '</a>' +
          '</li>'
        );
      }

      function wireRow(li) {
        const family = li.getAttribute('data-family');
        ensureFontCss(family, '400', 'preview-shop', (function(){ try { var v=localStorage.getItem(SAMPLE_KEY); if(v) return v; } catch(e) {} return DEFAULT_SPECIMEN.listDefault; })());
        const btn = li.querySelector('[data-join]');
        if (btn && !btn._wfBound) {
          btn._wfBound = true;
          btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            WFProto.togglePick(btn.getAttribute('data-join'), btn.getAttribute('data-name'));
          });
        }
      }

      function appendPage() {
        if (shown >= filtered.length) { updateCount(); return; }
        const next = filtered.slice(shown, shown + pageSize);
        const html = next.map(rowHtml).join('');
        const wrap = document.createElement('div');
        wrap.innerHTML = html;
        const nodes = Array.prototype.slice.call(wrap.children);
        nodes.forEach(function (li) {
          listEl.appendChild(li);
          wireRow(li);
        });
        shown += next.length;
        WFProto.syncJoinButtons();
        updateCount();
      }

      function resetAndRender() {
        filtered = filterCatalog({ tag: tag, keyword: keyword, license: license });
        shown = 0;
        listEl.innerHTML = '';
        highlightTags();
        if (!filtered.length) {
          listEl.innerHTML = '<li class="font-list-empty">没有匹配的字体。试试改关键词或清除筛选</li>';
          updateCount();
          return;
        }
        appendPage();
      }

      function refresh(next) {
        if (next) {
          if (next.tag != null) tag = next.tag;
          if (next.keyword != null) keyword = next.keyword;
          if (next.license != null) license = next.license;
        } else {
          tag = getQuery('tag');
          keyword = getQuery('keyword');
          license = getQuery('license');
        }
        resetAndRender();
        renderLicenseChips();
      }

      if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function () { appendPage(); });
      }
      if (sentinel && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting && shown < filtered.length && shown > 0) appendPage();
          });
        }, { rootMargin: '240px 0px' });
        io.observe(sentinel);
      }

      window.WFFontsList = {
        refresh: refresh,
        loadMore: appendPage,
        getFiltered: function () { return filtered.slice(); },
        getFilter: function () { return { tag: tag, keyword: keyword, license: license }; }
      };

      return loadCatalog().then(function () {
        refresh();
        return window.WFFontsList;
      });
    }
  };

  document.addEventListener('click', function (e) {
    const b = e.target.closest('.cdn-switch [data-cdn]');
    if (!b) return;
    e.preventDefault();
    setCdn(b.getAttribute('data-cdn'));
  });
  document.addEventListener('wf:cdn', function () { syncCdnUi(); });

  updateBadges(loadPicks().length);

  document.addEventListener('DOMContentLoaded', function () {
    updateBadges(loadPicks().length);
    injectFooterIfMissing();

    const sample = document.getElementById('specimenText');
    const size = document.getElementById('specimenSize');
    if (sample) {
      sample.value = WFProto.getSample();
      sample.addEventListener('input', function () { WFProto.setSample(sample.value); });
    }
    if (size) {
      size.value = String(WFProto.getSize());
      applySpecimenSize(WFProto.getSize());
      size.addEventListener('input', function () { WFProto.setSize(size.value); });
    } else if (document.querySelector('[data-specimen]')) {
      applySpecimenSize(WFProto.getSize());
    }

    document.querySelectorAll('[data-join]').forEach(function (btn) {
      if (btn._wfBound) return;
      btn._wfBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-join');
        const name = btn.getAttribute('data-name') || id;
        WFProto.togglePick(id, name);
      });
    });
    WFProto.syncJoinButtons();

    syncCdnUi();

    const navSearch = document.getElementById('navSearch');
    const navSearchClear = document.getElementById('navSearchClear');
    if (navSearch) WFProto.bindNavSearch(navSearch, navSearchClear);

    const tagBar = document.querySelector('.tag-bar');
    const floatBar = document.querySelector('.float-bar');
    if (tagBar && floatBar) {
      const io = new IntersectionObserver(
        function (entries) {
          const entry = entries[0];
          if (entry.isIntersecting) floatBar.classList.remove('is-visible');
          else floatBar.classList.add('is-visible');
        },
        { rootMargin: '-56px 0px 0px 0px', threshold: 0 }
      );
      io.observe(tagBar);
    }

    document.querySelectorAll('[data-bag-link]').forEach(function (el) {
      if (el.tagName === 'A') return;
      el.addEventListener('click', function () { location.href = 'shopping-bag.html'; });
    });

    // Warm catalog for detail/bag/embed/admin
    loadCatalog();
  });
})();
