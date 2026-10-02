(function () {
  'use strict';

  var COMMENT = '<!-- 本页嵌入的字体由文风字体（Windfonts）提供，可自由使用；请保留本授权标注 https://wenfeng.org/license -->';
  var PROOF = '风急天高猿啸哀 渚清沙白鸟飞回';
  var PROOF_BR = '风急天高猿啸哀<br>渚清沙白鸟飞回';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function offerOf(f) { return f.offer || 'jump'; }
  function statusWord(f) {
    var o = offerOf(f);
    if (o === 'source') return '本站下载';
    if (o === 'pending') {
      return ((f.license || {}).textState === 'full') ? '暂无下载' : '待核实';
    }
    if (o === 'missing') return '未收录';
    return '官方下载';
  }
  function statusClass(f) {
    var o = offerOf(f);
    if (o === 'source') return 'is-source';
    if (o === 'pending') return 'is-pending';
    if (o === 'missing') return 'is-missing';
    return 'is-jump';
  }
  function canTake(f) { return offerOf(f) === 'source'; }
  function wfName(f) { return '文风·' + (f.name || ''); }
  function licenseSpdx(name) {
    var n = String(name || '').trim();
    var l = n.toLowerCase();
    if (!n || n === '待核实') return '';
    if (n.indexOf('Open Font License') !== -1 || n.indexOf('SIL') === 0 || l.indexOf('ofl') === 0) return 'OFL-1.1';
    if (n.indexOf('MIT') === 0 || l === 'mit' || l === 'mit license' || l === 'x11' || l === '0bsd') return 'MIT';
    if (l.indexOf('apache') !== -1) return 'Apache-2.0';
    if (n.indexOf('IPA') === 0 || l.indexOf('ipa font') !== -1) return 'IPA';
    if (l.indexOf('cc0') !== -1 || l.indexOf('creative commons zero') !== -1) return 'CC0-1.0';
    if ((l.indexOf('cc by') !== -1 || l.indexOf('cc-by') !== -1 || l.indexOf('creative commons attribution') !== -1) && l.indexOf('nc') === -1) {
      return l.indexOf('sa') !== -1 ? 'CC-BY-SA-4.0' : 'CC-BY-4.0';
    }
    if (l.indexOf('m+') === 0 || l.indexOf('m plus') !== -1) return 'M+';
    if (l.indexOf('gpl') !== -1 && (l.indexOf('font exception') !== -1 || l.indexOf('font-exception') !== -1)) {
      return 'GPL-3.0-with-font-exception';
    }
    return '';
  }
  var ATTEST_SPDX = ['OFL-1.1', 'MIT', 'Apache-2.0', 'IPA-1.0', 'IPA',
    'CC0-1.0', 'CC-BY-4.0', 'CC-BY-SA-4.0',
    'GPL-2.0-with-font-exception', 'GPL-2.0-or-later WITH Font-exception OR OFL-1.1',
    'MPlus-Bitmap-License'];
  function attestSpdxOf(f) {
    var lic = f.license || {};
    if (lic.spdx) return lic.spdx;
    return licenseSpdx(f.licenseName);
  }
  function canAttest(f) {
    if ((f.license || {}).textState !== 'full') return false;
    return ATTEST_SPDX.indexOf(attestSpdxOf(f)) !== -1;
  }
  function attestBlockReason(f) {
    if ((f.license || {}).textState !== 'full') return '许可原文尚未归档核验，暂不出证。';
    if (ATTEST_SPDX.indexOf(attestSpdxOf(f)) === -1) return '非标准开源协议。本站只提供授权原文下载，文派科技不出具《文风字体授权证明》，也不代著作权人签署授权书。';
    return '不出核验。';
  }
  function findFont(fonts, norm) {
    var n = String(norm || '').toLowerCase();
    for (var i = 0; i < fonts.length; i++) if (String(fonts[i].norm).toLowerCase() === n) return fonts[i];
    return null;
  }
  function hay(f) {
    return [wfName(f), f.name, f.en, f.norm, f.foundry, f.licenseName].concat(f.aliases || []).join(' ').toLowerCase();
  }
  function matchQ(f, q) {
    if (!q) return true;
    return hay(f).indexOf(q.trim().toLowerCase()) !== -1;
  }
  function sliceGateOf(f) {
    if (!f || !f.sliceGate || f.sliceGate.enabled === false) return null;
    if (!f.sliceGate.enabled) return null;
    var g = f.sliceGate;
    return {
      enabled: true,
      accept: g.accept || ['zip'],
      minBytes: g.minBytes || 20480,
      nameHints: g.nameHints || [],
      sha256: g.sha256 || null,
      origin: g.origin || null
    };
  }
  function hexOf(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16);
    return s;
  }
  function bytesWord(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) {
      var kb = n / 1024;
      return (kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)) + ' KB';
    }
    var mb = n / 1048576;
    return (mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)) + ' MB';
  }
  function sniffKind(u8) {
    if (!u8 || u8.length < 4) return '';
    if (u8[0] === 0x4f && u8[1] === 0x54 && u8[2] === 0x54 && u8[3] === 0x4f) return 'otf';
    if (u8[0] === 0x00 && u8[1] === 0x01 && u8[2] === 0x00 && u8[3] === 0x00) return 'ttf';
    if (u8[0] === 0x74 && u8[1] === 0x74 && u8[2] === 0x63 && u8[3] === 0x66) return 'ttc';
    if (u8[0] === 0x77 && u8[1] === 0x4f && u8[2] === 0x46 && u8[3] === 0x46) return 'woff';
    if (u8[0] === 0x77 && u8[1] === 0x4f && u8[2] === 0x46 && u8[3] === 0x32) return 'woff2';
    if (u8[0] === 0x50 && u8[1] === 0x4b && (u8[2] === 0x03 || u8[2] === 0x05 || u8[2] === 0x07)) return 'zip';
    return '';
  }
  function kindWord(kind) {
    if (kind === 'otf') return 'OpenType';
    if (kind === 'ttf') return 'TrueType';
    if (kind === 'ttc' || kind === 'otc') return '字体集合';
    if (kind === 'zip') return 'Zip 包';
    if (kind === 'woff' || kind === 'woff2') return '网页字体';
    return kind || '未知';
  }
  function md5hex(u8) {
    function add(x, y) { return (x + y) >>> 0; }
    function rol(n, c) { return (n << c) | (n >>> (32 - c)); }
    function cmn(q, a, b, x, s, t) { return add(rol(add(add(a, q), add(x, t)), s), b); }
    function ff(a, b, c, d, x, s, t) { return cmn((b & c) | ((~b) & d), a, b, x, s, t); }
    function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & (~d)), a, b, x, s, t); }
    function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
    function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | (~d)), a, b, x, s, t); }
    var len = u8.length;
    var nblk = ((len + 8) >> 6) + 1;
    var blks = new Uint32Array(nblk * 16);
    var i;
    for (i = 0; i < len; i++) blks[i >> 2] |= u8[i] << ((i % 4) * 8);
    blks[i >> 2] |= 0x80 << ((i % 4) * 8);
    blks[nblk * 16 - 2] = len * 8;
    var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (i = 0; i < blks.length; i += 16) {
      var oa = a, ob = b, oc = c, od = d;
      a = ff(a, b, c, d, blks[i], 7, -680876936); d = ff(d, a, b, c, blks[i + 1], 12, -389564586);
      c = ff(c, d, a, b, blks[i + 2], 17, 606105819); b = ff(b, c, d, a, blks[i + 3], 22, -1044525330);
      a = ff(a, b, c, d, blks[i + 4], 7, -176418897); d = ff(d, a, b, c, blks[i + 5], 12, 1200080426);
      c = ff(c, d, a, b, blks[i + 6], 17, -1473231341); b = ff(b, c, d, a, blks[i + 7], 22, -45705983);
      a = ff(a, b, c, d, blks[i + 8], 7, 1770035416); d = ff(d, a, b, c, blks[i + 9], 12, -1958414417);
      c = ff(c, d, a, b, blks[i + 10], 17, -42063); b = ff(b, c, d, a, blks[i + 11], 22, -1990404162);
      a = ff(a, b, c, d, blks[i + 12], 7, 1804603682); d = ff(d, a, b, c, blks[i + 13], 12, -40341101);
      c = ff(c, d, a, b, blks[i + 14], 17, -1502002290); b = ff(b, c, d, a, blks[i + 15], 22, 1236535329);
      a = gg(a, b, c, d, blks[i + 1], 5, -165796510); d = gg(d, a, b, c, blks[i + 6], 9, -1069501632);
      c = gg(c, d, a, b, blks[i + 11], 14, 643717713); b = gg(b, c, d, a, blks[i], 20, -373897302);
      a = gg(a, b, c, d, blks[i + 5], 5, -701558691); d = gg(d, a, b, c, blks[i + 10], 9, 38016083);
      c = gg(c, d, a, b, blks[i + 15], 14, -660478335); b = gg(b, c, d, a, blks[i + 4], 20, -405537848);
      a = gg(a, b, c, d, blks[i + 9], 5, 568446438); d = gg(d, a, b, c, blks[i + 14], 9, -1019803690);
      c = gg(c, d, a, b, blks[i + 3], 14, -187363961); b = gg(b, c, d, a, blks[i + 8], 20, 1163531501);
      a = gg(a, b, c, d, blks[i + 13], 5, -1444681467); d = gg(d, a, b, c, blks[i + 2], 9, -51403784);
      c = gg(c, d, a, b, blks[i + 7], 14, 1735328473); b = gg(b, c, d, a, blks[i + 12], 20, -1926607734);
      a = hh(a, b, c, d, blks[i + 5], 4, -378558); d = hh(d, a, b, c, blks[i + 8], 11, -2022574463);
      c = hh(c, d, a, b, blks[i + 11], 16, 1839030562); b = hh(b, c, d, a, blks[i + 14], 23, -35309556);
      a = hh(a, b, c, d, blks[i + 1], 4, -1530992060); d = hh(d, a, b, c, blks[i + 4], 11, 1272893353);
      c = hh(c, d, a, b, blks[i + 7], 16, -155497632); b = hh(b, c, d, a, blks[i + 10], 23, -1094730640);
      a = hh(a, b, c, d, blks[i + 13], 4, 681279174); d = hh(d, a, b, c, blks[i], 11, -358537222);
      c = hh(c, d, a, b, blks[i + 3], 16, -722521979); b = hh(b, c, d, a, blks[i + 6], 23, 76029189);
      a = hh(a, b, c, d, blks[i + 9], 4, -640364487); d = hh(d, a, b, c, blks[i + 12], 11, -421815835);
      c = hh(c, d, a, b, blks[i + 15], 16, 530742520); b = hh(b, c, d, a, blks[i + 2], 23, -995338651);
      a = ii(a, b, c, d, blks[i], 6, -198630844); d = ii(d, a, b, c, blks[i + 7], 10, 1126891415);
      c = ii(c, d, a, b, blks[i + 14], 15, -1416354905); b = ii(b, c, d, a, blks[i + 5], 21, -57434055);
      a = ii(a, b, c, d, blks[i + 12], 6, 1700485571); d = ii(d, a, b, c, blks[i + 3], 10, -1894986606);
      c = ii(c, d, a, b, blks[i + 10], 15, -1051523); b = ii(b, c, d, a, blks[i + 1], 21, -2054922799);
      a = ii(a, b, c, d, blks[i + 8], 6, 1873313359); d = ii(d, a, b, c, blks[i + 15], 10, -30611744);
      c = ii(c, d, a, b, blks[i + 6], 15, -1560198380); b = ii(b, c, d, a, blks[i + 13], 21, 1309151649);
      a = ii(a, b, c, d, blks[i + 4], 6, -145523070); d = ii(d, a, b, c, blks[i + 11], 10, -1120210379);
      c = ii(c, d, a, b, blks[i + 2], 15, 718787259); b = ii(b, c, d, a, blks[i + 9], 21, -343485551);
      a = add(a, oa); b = add(b, ob); c = add(c, oc); d = add(d, od);
    }
    function le(n) {
      return hexOf(new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]));
    }
    return le(a) + le(b) + le(c) + le(d);
  }
  function sha256hex(buf) {
    return crypto.subtle.digest('SHA-256', buf).then(function (d) {
      return hexOf(new Uint8Array(d));
    });
  }
  var CRC_TABLE;
  function crc32(u8) {
    if (!CRC_TABLE) {
      CRC_TABLE = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        CRC_TABLE[n] = c >>> 0;
      }
    }
    var crc = 0 ^ -1;
    for (var i = 0; i < u8.length; i++) crc = CRC_TABLE[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  }
  function u8str(s) { return new TextEncoder().encode(s); }
  function zipStore(files) {
    var local = [];
    var central = [];
    var offset = 0;
    var now = new Date();
    var dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
    var dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
    files.forEach(function (f) {
      var name = u8str(f.name);
      var data = typeof f.body === 'string' ? u8str(f.body) : f.body;
      var crc = crc32(data);
      var lh = new Uint8Array(30 + name.length);
      var dv = new DataView(lh.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0800, true);
      dv.setUint16(10, dosTime, true);
      dv.setUint16(12, dosDate, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true);
      dv.setUint32(22, data.length, true);
      dv.setUint16(26, name.length, true);
      lh.set(name, 30);
      local.push(lh, data);
      var ch = new Uint8Array(46 + name.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(12, dosTime, true);
      cv.setUint16(14, dosDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      ch.set(name, 46);
      central.push(ch);
      offset += lh.length + data.length;
    });
    var centralSize = 0;
    central.forEach(function (x) { centralSize += x.length; });
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    var parts = local.concat(central, [eocd]);
    var total = 0;
    parts.forEach(function (x) { total += x.length; });
    var out = new Uint8Array(total);
    var p = 0;
    parts.forEach(function (x) { out.set(x, p); p += x.length; });
    return out;
  }
  function byOffer(f, offer) {
    if (!offer || offer === 'all') return true;
    if (offer === 'slice') {
      return f.slice === 'planned' || f.slice === 'ready' || f.slice === 'gated' || !!sliceGateOf(f);
    }
    return offerOf(f) === offer;
  }
  function countOffer(fonts, offer) {
    return fonts.filter(function (f) { return byOffer(f, offer); }).length;
  }
  function foundriesOf(fonts) {
    var map = {};
    fonts.forEach(function (f) {
      var slug = f.foundrySlug || 'unknown';
      if (!map[slug]) map[slug] = { slug: slug, name: f.foundry || '未标注', fonts: [] };
      map[slug].fonts.push(f);
    });
    var groups = Object.keys(map).map(function (k) { return map[k]; });
    groups.sort(function (a, b) {
      var au = a.slug === 'unknown', bu = b.slug === 'unknown';
      if (au !== bu) return au ? 1 : -1;
      return b.fonts.length - a.fonts.length;
    });
    return groups;
  }
  function parsePath() {
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var q = new URLSearchParams(location.search);
    var page = 'home';
    var id = '';
    if (!parts.length) page = 'home';
    else if (parts[0] === 'source' && parts[1]) { page = 'font'; id = parts[1]; }
    else if (parts[0] === 'source') page = 'list';
    else if (parts[0] === 'license' && parts[1]) { page = 'license'; id = parts[1]; }
    else if (parts[0] === 'license') page = 'licenses';
    else if (parts[0] === 'foundry' && parts[1]) { page = 'foundry'; id = parts[1]; }
    else if (parts[0] === 'foundry') page = 'foundries';
    else if (parts[0] === 'use') page = 'use';
    else if (parts[0] === 'how') page = 'how';
    else if (parts[0] === 'about') page = 'about';
    else if (parts[0] === 'attest' && parts[1] === 'verify') page = 'attest-verify';
    else if (parts[0] === 'attest' && parts[1] === 'ledger') page = 'attest-ledger';
    else if (parts[0] === 'attest' && parts[1]) { page = 'attest'; id = parts[1]; }
    else if (parts[0] === 'attest') page = 'attests';
    else if (parts[0] === 'v') page = 'v';
    else if (parts[0] === 'legal') page = 'legal';
    else if (parts[0] === 'slice' && parts[1]) { page = 'slice'; id = parts[1]; }
    else if (parts[0] === 'slice') page = 'slices';
    else page = 'notfound';
    return {
      page: page,
      id: id,
      serial: parts[0] === 'attest' && parts[2] ? parts[2] : '',
      q: q.get('q') || '',
      offer: q.get('offer') || 'all',
      holder: q.get('holder') || '',
      usage: q.get('usage') || '',
      uscc: q.get('uscc') || ''
    };
  }
  function theme() {
    try { return localStorage.getItem('wf-theme') === 'dark' ? 'dark' : 'light'; }
    catch (e) { return 'light'; }
  }
  function applyTheme() {
    if (theme() === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
  function toggleTheme() {
    try { localStorage.setItem('wf-theme', theme() === 'dark' ? 'light' : 'dark'); } catch (e) {}
    applyTheme();
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', theme() === 'dark' ? '切换到浅色' : '切换到深色');
    });
  }

  function themeToggleHtml() {
    return '<button type="button" class="icon-btn" data-theme-toggle aria-label="' +
      (theme() === 'dark' ? '切换到浅色' : '切换到深色') + '">' +
      '<svg class="icon ico-moon" aria-hidden="true"><use href="#i-moon"></use></svg>' +
      '<svg class="icon ico-sun" aria-hidden="true"><use href="#i-sun"></use></svg>' +
      '</button>';
  }

  var VIEW_KEY = 'wf-view';
  function view() {
    try { return localStorage.getItem(VIEW_KEY) === 'dev' ? 'dev' : 'design'; }
    catch (e) { return 'design'; }
  }
  function applyView(v) {
    var next = (v == null ? view() : v) === 'dev' ? 'dev' : 'design';
    document.documentElement.setAttribute('data-view', next);
    document.querySelectorAll('[data-view-switch] [data-mode]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-mode') === next);
    });
  }
  function setView(v) {
    var next = v === 'dev' ? 'dev' : 'design';
    try { localStorage.setItem(VIEW_KEY, next); } catch (e) {}
    applyView(next);
    try { document.dispatchEvent(new CustomEvent('wf:view', { detail: next })); } catch (e) {}
  }
  function viewSwitchHtml() {
    var cur = view();
    return '<div class="seg view-switch" data-view-switch role="group" aria-label="视图">' +
      '<button type="button" data-mode="design"' + (cur === 'design' ? ' class="is-on"' : '') + '>设计</button>' +
      '<button type="button" data-mode="dev"' + (cur === 'dev' ? ' class="is-on"' : '') + '>开发</button></div>';
  }
  (function bootView() {
    try {
      var q = new URLSearchParams(location.search).get('view');
      if (q === 'dev' || q === 'design') localStorage.setItem(VIEW_KEY, q);
    } catch (e) {}
    applyView(view());
  })();

  function chrome(route) {
    var p = route.page;
    var srcOn = p === 'list' || p === 'font' || p === 'foundry' || p === 'foundries';
    var licOn = p === 'licenses' || p === 'license';
    var attOn = p === 'attests' || p === 'attest' || p === 'attest-verify';
    var aboutOn = p === 'about' || p === 'legal' || p === 'use' || p === 'how';
    return (
      '<header class="topbar">' +
        '<div class="container topbar-inner">' +
          '<a class="wordmark" href="/"><span class="mark" aria-hidden="true"></span><span>文风</span><span class="wm-sub">· 源文件</span></a>' +
          '<nav class="topnav" aria-label="主导航">' +
            '<a href="/"' + (p === 'home' ? ' class="is-active"' : '') + '>源文件</a>' +
            '<a href="/license"' + (licOn ? ' class="is-active"' : '') + '>授权</a>' +
            '<a href="/source"' + (srcOn ? ' class="is-active"' : '') + '>目录</a>' +
            '<a href="/attest"' + (attOn ? ' class="is-active"' : '') + '>核验</a>' +
            '<a href="/about"' + (aboutOn ? ' class="is-active"' : '') + '>关于</a>' +
          '</nav>' +
          '<div class="topbar-end">' +
            viewSwitchHtml() +
            '<a class="shop-link" href="https://app.windfonts.com/" title="店面（样张与选字）">店面</a>' +
            themeToggleHtml() +
          '</div>' +
        '</div>' +
      '</header>'
    );
  }

  function footer() {
    return (
      '<footer class="site-foot">' +
        '<div class="container site-foot-inner">' +
          '<div class="site-foot-brand">' +
            '<a class="wordmark" href="/"><span class="mark" aria-hidden="true"></span><span>文风</span><span class="wm-sub">· 源文件</span></a>' +
            '<p>源文件、授权原文、缺字反馈。开源可带走，其余核验或去出处。不做样张墙，不当 CDN。</p>' +
          '</div>' +
          '<div class="site-foot-col">' +
            '<h2>办事</h2>' +
            '<a href="/license">查授权</a>' +
            '<a href="/source">下源文件</a>' +
            '<a href="/slice">切片</a>' +
          '</div>' +
          '<div class="site-foot-col">' +
            '<h2>核验</h2>' +
            '<a href="/attest">获取证书</a>' +
            '<a href="/how">怎么核</a>' +
            '<a href="/v">查证</a>' +
            '<a href="/api/v1/certs">证明 API</a>' +
          '</div>' +
          '<div class="site-foot-col">' +
            '<h2>关于</h2>' +
            '<a href="/about">关于</a>' +
            '<a href="/legal">法务</a>' +
            '<a href="/use">用法</a>' +
            '<a href="/api/v1/fonts">目录 API</a>' +
          '</div>' +
        '</div>' +
        '<div class="container site-foot-bottom">' +
          '<p>文派（广州）科技有限公司 · 源文件站</p>' +
          '<p class="site-foot-alts"><a class="shop-link" href="https://app.windfonts.com/">店面</a></p>' +
        '</div>' +
      '</footer>'
    );
  }

  function searchForm(action, q, extra, cls, ph) {
    return '<form class="search' + (cls ? ' ' + cls : '') + '" action="' + esc(action) + '" method="get">' +
      (extra || '') +
      '<label class="sr-only" for="q">搜索</label>' +
      '<input id="q" name="q" type="search" value="' + esc(q) + '" placeholder="' + esc(ph || '搜中文名、英文、短码、厂商') + '" autocomplete="off">' +
      '<button class="btn btn-ink" type="submit">搜索</button>' +
    '</form>';
  }

  function cardAction(f, offer) {
    if (offer === 'slice' && sliceGateOf(f)) return '领取切片包';
    if (canTake(f)) return '下载原件';
    return '查看条目';
  }

  function cardHref(f, offer) {
    if (offer === 'slice' && sliceGateOf(f)) return '/slice/' + esc(f.norm) + '/';
    return '/source/' + esc(f.norm) + '/';
  }

  function card(f, offer) {
    var takeCls = canTake(f) ? ' act is-take' : ' act';
    var href = cardHref(f, offer);
    var st = { word: statusWord(f), cls: statusClass(f) };
    var chip = canTake(f) ? '' : '<span class="status ' + st.cls + '">' + esc(st.word) + '</span>';
    var metaBits = [];
    if (f.foundry) metaBits.push('<a href="/foundry/' + esc(f.foundrySlug) + '">' + esc(f.foundry) + '</a>');
    if (f.licenseName && f.licenseName !== st.word) metaBits.push('<span class="meta-lic">' + esc(f.licenseName) + '</span>');
    return '<li class="specimen">' +
      '<div class="head">' +
        '<a class="name" href="/source/' + esc(f.norm) + '/">' + esc(wfName(f)) + '</a>' +
        '<p class="meta">' +
          metaBits.join('<span class="meta-sep">·</span>') +
          chip +
        '</p>' +
      '</div>' +
      '<a class="' + takeCls.trim() + '" href="' + href + '">' + esc(cardAction(f, offer)) + '</a>' +
      '<a class="preview t-' + esc(f.norm) + '"' + faceAttrs(f) + ' href="/source/' + esc(f.norm) + '/">' + PROOF + '</a>' +
    '</li>';
  }

  function cards(fonts, grid, offer) {
    if (!fonts.length) {
      return '<div class="page-state">' +
        '<p class="kicker">目录</p>' +
        '<h1>没有这一类</h1>' +
        '<p class="lead">换一个筛选，或搜名字。</p>' +
        '<p class="acts"><a class="btn btn-ink" href="/source">全部目录</a></p>' +
      '</div>';
    }
    return '<ul class="specimens' + (grid ? ' is-grid' : '') + '">' +
      fonts.map(function (f) { return card(f, offer); }).join('') +
    '</ul>';
  }

  function pinyinInitial(name) {
    var s = String(name || '').trim();
    if (!s) return '#';
    var ch = s.charAt(0).toUpperCase();
    if (ch >= 'A' && ch <= 'Z') return ch;
    if (!/[\u4e00-\u9fff]/.test(s.charAt(0))) return '#';
    var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    try {
      var coll = new Intl.Collator('zh-Hans-CN');
      var lo = 0, hi = 25;
      while (lo < hi) {
        var mid = (lo + hi + 1) >> 1;
        if (coll.compare(s.charAt(0), letters.charAt(mid)) >= 0) lo = mid;
        else hi = mid - 1;
      }
      return letters.charAt(lo);
    } catch (e) { return '#'; }
  }

  function groupedCards(list, offer) {
    if (!list.length) return cards(list, false, offer);
    var map = {}, order = [];
    list.forEach(function (f) {
      var L = pinyinInitial(f.name);
      if (!map[L]) { map[L] = []; order.push(L); }
      map[L].push(f);
    });
    order.sort();
    var bar = '<nav class="letter-index" aria-label="字母锚点">' +
      order.map(function (L) { return '<a href="#L-' + L + '">' + L + '</a>'; }).join('') +
    '</nav>' +
    '<nav class="letter-rail" aria-label="字母锚点（随屏）">' +
      order.map(function (L) { return '<a href="#L-' + L + '">' + L + '</a>'; }).join('') +
    '</nav>';
    return bar + order.map(function (L) {
      return '<section class="letter-group" id="L-' + L + '">' +
        '<h3>' + L + '</h3>' + cards(map[L], false, offer) + '</section>';
    }).join('');
  }

  function filterBar(current, q) {
    var keys = [
      { id: 'all', label: '全部' },
      { id: 'source', label: '本站下载' },
      { id: 'slice', label: '切片包' },
      { id: 'jump', label: '官方下载' },
      { id: 'missing', label: '未收录' },
      { id: 'pending', label: '暂无下载' }
    ];
    var qs = q ? '&q=' + encodeURIComponent(q) : '';
    return '<div class="seg" role="tablist">' + keys.map(function (k) {
      var href = '/source?offer=' + k.id + qs;
      return '<a href="' + href + '"' + (k.id === current ? ' class="is-on"' : '') + '>' + k.label + '</a>';
    }).join('') + '</div>';
  }

  function homeStats(fonts) {
    return '<p class="home-stats" aria-label="收录数字">' +
      '<a href="/source?offer=source"><b>' + countOffer(fonts, 'source') + '</b> 款本站下载</a>' +
      '<a href="/source?offer=jump"><b>' + countOffer(fonts, 'jump') + '</b> 款官方下载</a>' +
      '<a href="/source?offer=missing"><b>' + countOffer(fonts, 'missing') + '</b> 款未收录</a>' +
      '<a href="/source?offer=pending"><b>' + countOffer(fonts, 'pending') + '</b> 款暂无下载</a>' +
    '</p>';
  }

  var SHOWCASE_PREF = ['Xwwk', 'Dyh', 'Arkp', 'Syhtcjk', 'Mkkzh', 'Xxzt', 'Zkxwt', 'Qhddl'];
  function showcaseOf(fonts) {
    var byNorm = {};
    fonts.forEach(function (f) { byNorm[String(f.norm).toLowerCase()] = f; });
    var picked = [];
    SHOWCASE_PREF.forEach(function (n) {
      var f = byNorm[n.toLowerCase()];
      if (f && f.family && picked.indexOf(f) === -1) picked.push(f);
    });
    fonts.forEach(function (f) {
      if (picked.length >= 6) return;
      if (f.family && f.offer !== 'missing' && picked.indexOf(f) === -1) picked.push(f);
    });
    return picked;
  }

  function home(fonts) {
    var take = fonts.filter(canTake);
    var show = showcaseOf(fonts);
    var face = show[0] || take[0] || fonts[0];
    var faceHref = face ? '/source/' + esc(face.norm) + '/' : '/source';
    var faceClass = face ? ' t-' + esc(face.norm) : '';
    var faceName = face ? esc(wfName(face)) : '目录';
    return '' +
      '<section class="home-hero">' +
        '<div class="container">' +
          '<div class="home-hero-top">' +
            '<p class="kicker">源文件和下载</p>' +
            '<p class="live-caption"><span class="live-using">' +
              (show.length > 1 ? '<button type="button" class="btn-text" data-face-next>换一款</button> · ' : '') +
              '<a class="now" href="' + faceHref + '">' + faceName + '</a></span></p>' +
          '</div>' +
          '<p class="live' + faceClass + '"' + faceAttrs(face) + ' data-hero-live>' + PROOF_BR + '</p>' +
          '<div class="home-hero-foot">' +
            '<p class="lead">开源字体可以直接下载。不允许再分发的，核验后领取切片包。</p>' +
            '<div class="home-cta acts">' +
              '<a class="btn btn-ink" data-hero-take href="' + faceHref + '">拿走' + faceName + '</a>' +
              '<a class="btn" href="/source">目录</a>' +
            '</div>' +
          '</div>' +
          searchForm('/source', '', '', 'search-hero') +
          homeStats(fonts) +
        '</div>' +
      '</section>' +
      '<section class="home-now">' +
        '<div class="container">' +
          '<div class="section-head">' +
            '<h2>本站下载</h2>' +
            '<a class="more" href="/source?offer=source">全部 ' + take.length + ' 款</a>' +
          '</div>' +
          cards(take.slice(0, 12), true) +
        '</div>' +
      '</section>' +
      '<section class="home-close" aria-label="自托管切片">' +
        '<p class="home-close-bg" aria-hidden="true">源</p>' +
        '<div class="container home-close-num">' +
          '<p class="home-close-figure"><b>' + fonts.length + '</b><span>款字体</span></p>' +
          '<div>' +
            '<h2>切片包：给 WordPress 自托管</h2>' +
            '<p class="lead">woff2 与 CSS 打成包，放进主题本地加载。开源字体的切片包稍后提供。</p>' +
            '<p class="acts">' +
              '<a class="btn btn-ink" href="/slice">切片工具</a>' +
              '<a class="btn" href="/use">怎么用</a>' +
            '</p>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function listPage(fonts, route) {
    var list = fonts.filter(function (f) { return matchQ(f, route.q) && byOffer(f, route.offer); });
    var hiddenOffer = route.offer && route.offer !== 'all'
      ? '<input type="hidden" name="offer" value="' + esc(route.offer) + '">'
      : '';
    var countNote = '';
    if (route.offer === 'slice') {
      var gated = list.filter(function (f) { return !!sliceGateOf(f); }).length;
      var planned = list.length - gated;
      var parts = [];
      if (gated) parts.push(gated + ' 款上传原包核验后领取');
      if (planned) parts.push(planned + ' 款切片包稍后提供');
      countNote = parts.length ? ' · ' + parts.join('，') : '';
    }
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">目录</p>' +
        '<h1>按名字拿走</h1>' +
      '</div>' +
      searchForm('/source', route.q, hiddenOffer) +
      filterBar(route.offer, route.q) +
      '<p class="count-line"><strong>' + list.length + '</strong> 款' +
        (route.q ? ' · 「' + esc(route.q) + '」' : '') +
        countNote +
      '</p>' +
      (route.q ? cards(list, false, route.offer) : groupedCards(list, route.offer)) +
    '</div>';
  }

  function fileOf(f, kind) {
    var files = f.files || [];
    for (var i = 0; i < files.length; i++) if (files[i].kind === kind) return files[i];
    return null;
  }
  function firstFileHref(f) {
    var files = f.files || [];
    for (var i = 0; i < files.length; i++) if (files[i].href && !files[i].staged) return files[i];
    return null;
  }
  function primaryFile(f) {
    var archive = fileOf(f, 'archive');
    if (archive && archive.href && !archive.staged) return archive;
    return firstFileHref(f);
  }
  function isHttp(href) {
    return /^https?:\/\//i.test(href || '');
  }
  function hostOf(href) {
    try { return new URL(href).host || ''; } catch (e) { return ''; }
  }
  function hrefAttrs(href) {
    return isHttp(href) ? ' target="_blank" rel="noopener noreferrer"' : '';
  }
  function fileNameFromHref(href) {
    if (!href) return '';
    var path = String(href).split('#')[0].split('?')[0];
    var parts = path.split('/').filter(Boolean);
    var last = parts[parts.length - 1] || '';
    try { last = decodeURIComponent(last); } catch (e) {}
    return last;
  }
  function formatWord(fmt, kind) {
    if (!fmt || fmt === 'git' || kind === 'git' || kind === 'upstream') return '';
    return fmt;
  }
  function primaryLabel(file) {
    if (!file) return '拿走';
    if (file.kind === 'archive') return '下载原件';
    if (file.kind === 'git') return '打开镜像仓库';
    if (file.kind === 'upstream') return '去上游仓库';
    return file.label || '打开';
  }
  function primaryMeta(file) {
    if (!file) return '';
    if (file.kind !== 'archive') {
      return (file.format && file.format !== 'git') ? file.format : '';
    }
    var name = fileNameFromHref(file.href);
    if (/^(master|main|HEAD|archive)\.(tar\.gz|tgz|zip|tar)$/i.test(name)) {
      return file.format || name.replace(/^[^.]+./, '');
    }
    return name || file.format || '';
  }
  function isShopJump(x, f) {
    if (!x) return false;
    if (f && x.href === f.shop) return true;
    return x.label === '在网页里用';
  }
  function extraJumps(f) {
    var m = f.mirror || {};
    var seen = {};
    (f.jump || []).forEach(function (x) { if (x.href) seen[x.href] = true; });
    var extra = [];
    if (m.upstream && !seen[m.upstream]) {
      var mh = hostOf(m.upstream) || '';
      extra.push({ label: mh.indexOf('github.com') !== -1 ? '去 GitHub 取' : '去上游取', href: m.upstream });
    }
    return extra;
  }
  function jumpList(f) {
    return extraJumps(f).concat(f.jump || []);
  }
  function originJumps(f) {
    return jumpList(f).filter(function (x) { return x && x.href && !isShopJump(x, f); });
  }
  function licTitleOf(f, lic) {
    return (lic && lic.title) || f.licenseName || '';
  }
  function licenseReadable(f, lic) {
    var t = licTitleOf(f, lic);
    return !!(t && t !== '待核实');
  }
  function packKicker(f) {
    var o = offerOf(f);
    if (o === 'source') return '源文件';
    if (o === 'missing') return '收录';
    if (o === 'pending') return '许可';
    return '出处';
  }
  function packPrimary(f) {
    if (canTake(f)) {
      var p = primaryFile(f);
      if (p && p.href) {
        return { href: p.href, label: primaryLabel(p), ink: true, meta: primaryMeta(p) };
      }
    }
    var first = originJumps(f)[0];
    if (first) {
      return { href: first.href, label: first.label, ink: true, meta: '' };
    }
    return null;
  }

  function packRows(f, lic) {
    var rows = [];
    var seen = {};
    function add(row) {
      var key = (row.href || '') + '|' + row.label;
      if (seen[key]) return;
      seen[key] = true;
      rows.push(row);
    }
    if (canTake(f)) {
      (f.files || []).forEach(function (file) {
        if (file.kind === 'slice') {
          add({
            label: '网页切片包',
            hint: 'WordPress 自托管',
            fmt: formatWord(file.format || 'zip', file.kind),
            href: file.href || '',
            later: !file.href,
            action: '下载'
          });
          return;
        }
        if (file.kind === 'archive' && file.staged) {
          add({
            label: '源文件归档',
            hint: '稍后提供',
            fmt: 'tar.gz',
            href: '',
            later: true,
            action: '下载'
          });
          return;
        }
        if (!file.href) return;
        add({
          label: file.label || file.kind,
          fmt: formatWord(file.format, file.kind),
          href: file.href,
          later: false,
          action: (file.kind === 'archive') ? '下载' : '打开'
        });
      });
      if ((f.slice === 'planned' || f.slice === 'ready') &&
          !(f.files || []).some(function (x) { return x.kind === 'slice'; })) {
        add({
          label: '网页切片包',
          hint: 'WordPress 自托管',
          fmt: 'zip',
          href: '',
          later: true,
          action: '下载'
        });
      }
    } else {
      var gate = sliceGateOf(f);
      if (gate) {
        add({
          label: '网页切片包',
          hint: '官方原包 zip',
          fmt: 'zip',
          href: '/slice/' + f.norm + '/',
          later: false,
          action: '打开工具'
        });
        if (gate.origin && gate.origin.href) {
          add({
            label: '去厂商官网取原包',
            hint: gate.origin.label || '',
            fmt: '',
            href: gate.origin.href,
            later: false,
            action: '打开'
          });
        }
      }
      originJumps(f).forEach(function (x) {
        add({ label: x.label, fmt: '', href: x.href, later: false, action: '打开' });
      });
      if (licenseReadable(f, lic)) {
        add({
          label: '许可原文',
          hint: licTitleOf(f, lic),
          fmt: '',
          href: '/license/' + String(f.norm).toLowerCase(),
          later: false,
          action: '阅读'
        });
      } else {
        add({
          label: '许可原文',
          hint: '条款尚未核对',
          fmt: '',
          href: '',
          later: true,
          action: '阅读'
        });
      }
    }
    return rows;
  }

  function hasLocalFile(f) {
    var files = f.files || [];
    for (var i = 0; i < files.length; i++) {
      if (files[i].href && files[i].kind !== 'upstream') return true;
    }
    return false;
  }

  function packOfferTitle(f) {
    var o = offerOf(f);
    if (o === 'source') return '拿走';
    if (o === 'missing') return '源文件尚未收入';
    if (o === 'pending') return '许可尚未核对';
    return '原件不在本站';
  }

  function mirrorWord(state) {
    if (state === 'mirrored') return '本站已镜像';
    if (state === 'skipped-too-heavy') return '体积过大，未镜像';
    if (state === 'absent') return '尚未镜像';
    if (state === 'collected-private') return '收录未公开';
    if (state === 'restricted-login') return '需登录领取';
    if (state === 'unverified') return '许可待核实';
    return '';
  }

  function packRowHtml(r) {
    var hint = r.hint ? '<small>' + esc(r.hint) + '</small>' : '';
    var fmt = r.fmt ? '<span class="pack-fmt">' + esc(r.fmt) + '</span>' : '';
    var inner = '<span class="pack-label">' + esc(r.label) + hint + '</span>' +
      '<span class="pack-aside">' + fmt;
    if (r.later) {
      return '<li class="pack-item is-later">' + inner +
        '<span class="pack-later">稍后提供</span></span></li>';
    }
    return '<li class="pack-item"><a class="pack-row" href="' + esc(r.href) + '"' +
      hrefAttrs(r.href) + '>' + inner +
      '<span class="pack-go">' + esc(r.action || '打开') + '</span></span></a></li>';
  }

  function packSec(f, lic) {
    var primary = packPrimary(f);
    var rows = packRows(f, lic);
    if (primary && primary.href) {
      rows = rows.filter(function (r) { return r.href !== primary.href; });
    }
    var rowHtml = rows.map(packRowHtml).join('');
    var primaryHtml = '';
    if (primary) {
      primaryHtml = '<p class="pack-primary">' +
        '<a class="btn btn-ink btn-take" href="' +
          esc(primary.href) + '"' + hrefAttrs(primary.href) + '>' + esc(primary.label) + '</a>' +
        (primary.meta ? '<span class="pack-primary-meta">' + esc(primary.meta) + '</span>' : '') +
      '</p>';
    }
    var title = licTitleOf(f, lic);
    var readable = licenseReadable(f, lic);
    var licInRows = !canTake(f);
    var licHtml = '';
    if (!licInRows) {
      licHtml = readable
        ? '<a href="/license/' + esc(f.norm) + '">' + esc(title) + '</a>'
        : '许可待核实';
    }
    var links = '';
    if (canAttest(f)) {
      links += '<a href="/attest/' + esc(f.norm) + '/">授权证明</a>';
    }
    if (f.shop && (!primary || primary.href !== f.shop)) {
      links += '<a href="' + esc(f.shop) + '"' + hrefAttrs(f.shop) + '>网页里用</a>';
    }
    var mirrorState = (f.mirror || {}).state;
    var offer = offerOf(f);
    var mirror = (offer === 'pending' || mirrorState === 'unverified' ||
      (offer === 'missing' && mirrorState === 'absent'))
      ? ''
      : mirrorWord(mirrorState);
    var stateLine = '';
    if (offer === 'pending' || offer === 'missing') {
      stateLine = '<p class="pack-correct">' +
        (offer === 'pending' ? '核实后状态会更新' : '收录后状态会更新') +
        '，见<a href="/legal#legal-phish">法务说明</a>。' +
        '发现许可信息有误？<a href="mailto:license@wenfeng.org">告诉我们</a></p>';
    }
    return '<section class="pack" aria-labelledby="pack-title">' +
      '<header class="pack-head">' +
        '<div>' +
          '<p class="pack-kicker">' + packKicker(f) + '</p>' +
          '<h2 id="pack-title">' + packOfferTitle(f) + '</h2>' +
        '</div>' +
        (mirror ? '<p class="pack-mirror">' + esc(mirror) + '</p>' : '') +
      '</header>' +
      (f.visitorNote ? '<p class="pack-note">' + esc(f.visitorNote) + '</p>' : '') +
      stateLine +
      primaryHtml +
      (rowHtml ? '<ul class="pack-files">' + rowHtml + '</ul>' : '') +
      ((licHtml || links)
        ? '<div class="pack-meta">' +
            (licHtml ? '<p class="pack-lic">' + licHtml + '</p>' : '') +
            (links ? '<p class="pack-meta-links">' + links + '</p>' : '') +
          '</div>'
        : '') +
    '</section>';
  }

  function lineageLine(f, fonts) {
    var lin = f.lineage;
    if (!lin || !lin.basedOn) return '';
    var parentNorm = String(lin.basedOn);
    if (parentNorm === f.norm) return '';
    var parent = fonts ? findFont(fonts, parentNorm) : null;
    var parentName = parent ? parent.name : parentNorm;
    return '<p class="font-lineage">基于 <a href="/source/' + esc(parentNorm) + '/">文风·' +
      esc(parentName) + '</a></p>';
  }

  function renderFont(f, licenses, fonts) {
    var lic = licenses[f.norm] || {};
    var foundry = f.foundry
      ? '<p class="font-by"><span class="font-by-k">厂商</span> ' +
        '<a href="/foundry/' + esc(f.foundrySlug) + '/">' + esc(f.foundry) + '</a></p>'
      : '';
    var weights = (f.weights && f.weights.length)
      ? '<p class="font-weights">' + esc(f.weights.join(' · ')) + '</p>'
      : '';
    var lineageHtml = lineageLine(f, fonts);
    return '<div class="container font-page">' +
      '<header class="font-head">' +
        '<p class="crumb"><a href="/source">目录</a><span>/</span><span>' +
          esc(wfName(f)) + '</span></p>' +
        '<p class="font-flag ' + statusClass(f) + '">' + esc(statusWord(f)) + '</p>' +
        '<h1>' + esc(wfName(f)) + '</h1>' +
        '<p class="font-aka">' + esc(f.name) +
          (f.en && f.en !== f.name ? '<span> · ' + esc(f.en) + '</span>' : '') + '</p>' +
        foundry +
        weights +
        lineageHtml +
        '<p class="font-proof t-' + esc(f.norm) + '"' + faceAttrs(f) + '>' + PROOF + '</p>' +
      '</header>' +
      packSec(f, lic) +
      fontSnapshot(f) +
    '</div>';
  }

  function commentPanel(hero) {
    return '<aside class="comment-panel' + (hero ? ' is-hero' : '') + '">' +
      '<p class="kicker">嵌入代码里这一行不能改</p>' +
      '<pre class="code">' + esc(COMMENT) + '</pre>' +
    '</aside>';
  }

  function licRow(f) {
    return '<li class="lic-row">' +
      '<a class="name" href="/license/' + esc(f.norm) + '">' + esc(wfName(f)) + '</a>' +
      '<span class="proto">' + esc(f.licenseName) + '</span>' +
      '<span class="status ' + statusClass(f) + '">' + esc(statusWord(f)) + '</span>' +
      '<a class="go" href="/license/' + esc(f.norm) + '">原文</a>' +
    '</li>';
  }

  function licensesPage(fonts, route) {
    var list = fonts.filter(function (f) { return matchQ(f, route.q); });
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">许可</p>' +
        '<h1>许可原文</h1>' +
        '<p class="lead">按字体列出授权原文。嵌入代码里的授权标注地址不能改动，源文件和下载在目录。</p>' +
      '</div>' +
      commentPanel(true) +
      searchForm('/license', route.q) +
      '<p class="count-line"><strong>' + list.length + '</strong> 款</p>' +
      (list.length
        ? '<ul class="lic-index">' + list.map(licRow).join('') + '</ul>'
        : '<div class="page-state"><p class="kicker">许可</p><h1>没有这一款</h1><p class="lead">换个名字搜。</p></div>') +
    '</div>';
  }

  function licenseTier(f) {
    var t = f.license && f.license.textState ? String(f.license.textState) : '';
    if (t === 'full') return { word: '许可原文', note: '' };
    if (t === 'summary') return { word: '许可要点', note: '非全文，全文以厂商发布件为准。' };
    if (t === 'pointer') return { word: '许可指引', note: '全文在上游仓库，本站尚未归档文本。' };
    return null;
  }

  function licensePage(f, lic) {
    var backLabel = canTake(f) ? '返回下载' : '返回这一款';
    var title = lic.title || f.licenseName || '许可原文';
    var body = lic.body || '';
    var aka = esc(wfName(f));
    var orig = [];
    if (f.name) orig.push(esc(f.name));
    if (f.en) orig.push(esc(f.en));
    if (orig.length) aka += '<span> · 原名 ' + orig.join(' · ') + '</span>';
    var links = '<a href="/source/' + esc(f.norm) + '/">' + backLabel + '</a>';
    if (canAttest(f)) {
      links += '<a href="/attest/' + esc(f.norm) + '/">授权证明</a>';
    }
    if (f.shop) {
      links += '<a href="' + esc(f.shop) + '"' + hrefAttrs(f.shop) + '>网页里用</a>';
    }
    var tier = licenseTier(f);
    var flagWord = tier ? tier.word : '许可原文';
    var stateNote = '';
    if (tier) {
      stateNote = '<p class="license-state-note">' + esc(tier.note);
      if (tier.word === '许可指引' && f.license && f.license.sourceUrl) {
        var src = f.license.sourceUrl;
        stateNote += '原文出处：<a href="' + esc(src) + '"' + hrefAttrs(src) + '>' +
          esc(hostOf(src) || '上游原文') + '</a>';
      }
      stateNote += '</p>';
    }
    return '<div class="container font-page">' +
      '<header class="font-head">' +
        '<p class="crumb"><a href="/source">目录</a><span>/</span>' +
          '<a href="/source/' + esc(f.norm) + '/">' + esc(wfName(f)) + '</a><span>/</span><span>许可</span></p>' +
        '<p class="font-flag">' + flagWord + '</p>' +
        '<h1>' + esc(title) + '</h1>' +
        '<p class="font-aka">' + aka + '</p>' +
        stateNote +
      '</header>' +
      (body
        ? '<article class="license-sheet"><pre class="doc">' + esc(body) + '</pre></article>'
        : '<div class="page-state is-fill"><p class="kicker">许可</p><h1>还没有原文</h1><p class="lead">这一款许可尚未收入文本。</p></div>') +
      licenseEvidence(f, lic) +
      '<div class="pack-meta is-after">' +
        '<p class="pack-lic">' + esc(wfName(f)) + '</p>' +
        '<p class="pack-meta-links">' + links + '</p>' +
      '</div>' +
    '</div>';
  }

  function sliceReceiptRows(st) {
    function row(k, v, cls) {
      return '<div class="tool-kv">' +
        '<span class="tool-kv-k">' + k + '</span>' +
        '<span class="tool-kv-v' + (cls ? ' ' + cls : '') + '">' + v + '</span>' +
      '</div>';
    }
    var html = '';
    if (st.name) html += row('文件', esc(st.name));
    if (st.kind && st.kind !== 'zip' && st.kindLabel) html += row('识别', esc(st.kindLabel));
    if (st.sizeWord) {
      html += row('体积', esc(st.sizeWord) +
        (st.sha256 ? '<span class="tool-quiet"> · 预检</span>' : ''));
    }
    if (st.sha256) html += row('SHA-256', esc(st.sha256), 'is-hash');
    if (st.md5) {
      html += row('MD5', esc(st.md5) + '<span class="tool-quiet"> · 厂商常用</span>', 'is-hash');
    }
    return html ? '<div class="tool-kvlist">' + html + '</div>' : '';
  }

  function sliceStage(n, title, inner, cls) {
    return '<section class="tool-stage' + (cls ? ' ' + cls : '') + '">' +
      '<p class="tool-idx">' + n + '</p>' +
      '<div class="tool-slot"><h2>' + title + '</h2>' + inner + '</div>' +
    '</section>';
  }

  function sliceIntake(st, phase) {
    var file =
      '<input class="sr-only" type="file" data-slice-input accept=".zip,application/zip">';
    if (phase === 'idle') {
      return '<label class="tool-intake" data-slice-drop>' + file +
        '<span class="tool-intake-kicker">官方 zip</span>' +
        '<span class="tool-intake-title">放入尚未解压的原包</span>' +
        '<span class="tool-intake-meta">拖入此栏，或点这里选择</span>' +
      '</label>';
    }
    return '<label class="tool-held" data-slice-drop>' + file +
      '<span class="tool-held-main">' +
        '<span class="tool-held-name">' + esc(st.name || '原包') + '</span>' +
        (st.sizeWord ? '<span class="tool-held-meta">' + esc(st.sizeWord) + '</span>' : '') +
      '</span>' +
      '<span class="tool-held-act">更换</span>' +
    '</label>';
  }

  function sliceBoard(f, phase, st, gate) {
    st = st || {};
    gate = gate || {};
    var checkSlot;
    var checkCls = '';
    if (phase === 'idle') {
      checkCls = 'is-wait';
      checkSlot = '<p class="tool-note">放入原包后计算整包摘要。体积只作预检。</p>';
    } else if (phase === 'work') {
      checkCls = 'is-work';
      checkSlot = '<p class="tool-note">正在计算摘要。文件留在这一页。</p>';
    } else if (phase === 'ok') {
      var byDigest = !!gate.sha256;
      checkSlot =
        '<p class="tool-verdict is-ok">核验通过<span class="tool-quiet"> · ' +
          (byDigest ? '摘要比对' : '名称指纹') + '</span></p>' +
        '<p class="tool-note">' +
          (byDigest
            ? '对照收录的整包 SHA-256。摘要一致表示与收录包一致，不构成新的授权。厂商若公布 MD5，并列备查。'
            : '收录 SHA-256 表就位前，按 zip 头、体积下限与官方包名核验。特征通过表示与收录特征一致，不等于对包内文件内容背书。') +
          '</p>' +
        sliceReceiptRows(st);
    } else {
      checkCls = 'is-bad';
      checkSlot =
        '<p class="tool-verdict is-bad">' + esc(st.reason || '未能核验') + '</p>' +
        sliceReceiptRows(st) +
        '<p class="tool-actions"><button type="button" class="btn" data-slice-reset>重新核验</button></p>';
    }

    var outSlot;
    var outCls = 'is-lock';
    var packName = '文风切片包 · ' + esc(f.name);
    if (phase === 'ok') {
      outCls = '';
      var path = '/slice/' + f.norm + '/';
      outSlot =
        '<p class="tool-pack-name">' + packName + '</p>' +
        '<p class="tool-note">woff2 与 CSS，供 WordPress 自托管。</p>' +
        '<p class="tool-actions">' +
          '<button type="button" class="btn btn-ink btn-take" data-slice-download>下载切片包</button>' +
          '<span class="pack-primary-meta">zip · 样张</span>' +
        '</p>' +
        '<p class="tool-addr"><span>wenfeng.org' + esc(path) + '</span>' +
          '<button type="button" class="btn-text" data-copy="' + esc(path) + '">复制地址</button></p>';
    } else {
      outSlot =
        '<p class="tool-pack-name">' + packName + '</p>' +
        '<p class="tool-note">核验通过后在此领取。</p>';
    }

    var origin = gate.origin && gate.origin.href ? gate.origin : null;
    var intake = sliceIntake(st, phase) +
      (phase === 'idle' && origin
        ? '<p class="tool-origin">原包在' +
          '<a href="' + esc(origin.href) + '"' + hrefAttrs(origin.href) + '>' +
          esc(origin.label) + '</a>取。</p>'
        : '');

    return '<div class="tool-board" aria-live="polite">' +
      sliceStage('01', '原包', intake) +
      sliceStage('02', '核验', checkSlot, checkCls) +
      sliceStage('03', '切片包', outSlot, outCls) +
    '</div>';
  }

  function slicePick(fonts, current) {
    var list = (fonts || []).filter(function (x) { return !!sliceGateOf(x); });
    if (list.length < 2) return '';
    return '<label class="tool-pick">核验对象' +
      '<select data-slice-pick>' +
        list.map(function (x) {
          return '<option value="' + esc(x.norm) + '"' +
            (x.norm === current ? ' selected' : '') + '>' + esc(wfName(x)) + '</option>';
        }).join('') +
      '</select></label>';
  }

  function sliceBar() {
    return '<div class="tool-bar">' +
      '<p class="kicker">切片工具</p>' +
      '<p class="tool-bar-meta">本地处理 · 文件不离开本机</p>' +
    '</div>';
  }

  function sliceFace(f, fonts) {
    return '<div class="tool-face">' +
      '<div>' +
        '<p class="tool-face-name">' + esc(wfName(f)) + '</p>' +
        '<p class="tool-face-meta">' +
          esc(f.name) + (f.en ? ' · ' + esc(f.en) : '') +
          (f.foundry ? ' · ' + esc(f.foundry) : '') +
        '</p>' +
      '</div>' +
      slicePick(fonts, f.norm) +
    '</div>';
  }

  function sliceFoot(f, extraLinks) {
    return '<p class="tool-legal">授权证明只记录收录与核验结果，不构成再分发授权，也不代表著作权人另行授权。</p>' +
      '<p class="tool-links">' +
        '<a href="/source/' + esc(f.norm) + '/">下载页</a>' +
        '<a href="/license/' + esc(f.norm) + '">许可原文</a>' +
        (extraLinks || '') +
        '<a href="/slice">工具首页</a>' +
      '</p>';
  }

  function sliceSkipBoard(f) {
    return '<div class="tool-board">' +
      sliceStage('01', '原包',
        '<p class="tool-note">开源可再分发，不必放入原包。</p>', 'is-lock') +
      sliceStage('02', '核验',
        '<p class="tool-note">本站不核对此款原包。</p>', 'is-lock') +
      sliceStage('03', '切片包',
        '<p class="tool-pack-name">原件可直接拿走</p>' +
        '<p class="tool-note">切片包稍后由本站直接提供，不用走这道核验。</p>' +
        '<p class="tool-actions"><a class="btn btn-ink btn-take" href="/source/' +
          esc(f.norm) + '/">去下载</a></p>') +
    '</div>';
  }

  function slicePage(f, fonts) {
    var gate = sliceGateOf(f);
    var shop = f.shop
      ? '<a href="' + esc(f.shop) + '"' + hrefAttrs(f.shop) + '>网页里用</a>'
      : '';
    var lead = gate
      ? '从' + esc(f.foundry || '厂商') +
        '取得的官方 zip，尚未解压。核验通过后领取切片包。'
      : '这一款开源可再分发，不必核验。';
    var inner = gate
      ? '<div data-slice-body>' + sliceBoard(f, 'idle', null, gate) + '</div>'
      : sliceSkipBoard(f);
    var open = '<div class="container tool-page"' +
      (gate
        ? ' id="slice-gate"' +
          ' data-norm="' + esc(f.norm) + '"' +
          ' data-name="' + esc(f.name) + '"' +
          ' data-en="' + esc(f.en || '') + '"' +
          ' data-wf="' + esc(wfName(f)) + '"' +
          ' data-foundry="' + esc(f.foundry || '') + '"' +
          ' data-min="' + gate.minBytes + '"' +
          ' data-accept="' + esc(gate.accept.join(',')) + '"' +
          ' data-hints="' + esc(gate.nameHints.join(',')) + '"' +
          ' data-sha256="' + esc(gate.sha256 || '') + '"' +
          (gate.origin
            ? ' data-origin="' + esc(gate.origin.href || '') + '"' +
              ' data-origin-label="' + esc(gate.origin.label || '') + '"'
            : '')
        : '') +
      '>';
    return open +
      sliceBar() +
      '<h1>领取切片包</h1>' +
      '<p class="tool-lead">' + lead + '</p>' +
      sliceFace(f, fonts) +
      inner +
      sliceFoot(f, shop) +
    '</div>';
  }

  function slicesPage(fonts) {
    var list = fonts.filter(function (f) { return !!sliceGateOf(f); });
    var planned = fonts.filter(function (f) { return f.slice === 'planned' || f.slice === 'ready'; });
    var plannedHtml = planned.length
      ? '<p class="count-line"><strong>' + planned.length + '</strong> 款开源字体，切片包稍后直接提供</p>' +
        '<ul class="tool-index is-quiet">' + planned.map(function (f) {
          return '<li>' +
            '<a class="tool-index-row" href="/source/' + esc(f.norm) + '/">' +
              '<span class="tool-index-name">' + esc(wfName(f)) + '</span>' +
              '<span class="tool-index-meta">' + esc(f.foundry || '未标注') + '</span>' +
              '<span class="tool-index-go">看下载页</span>' +
            '</a>' +
          '</li>';
        }).join('') + '</ul>'
      : '';
    return '<div class="container tool-page">' +
      sliceBar() +
      '<h1>领取切片包</h1>' +
      '<p class="tool-lead">不允许再分发的免费商用字体，本站不提供文件。放入官方 zip，核验通过后领取切片包。</p>' +
      '<ol class="tool-how">' +
        '<li><span>01</span><div><strong>原包</strong><p>尚未解压的官方 zip</p></div></li>' +
        '<li><span>02</span><div><strong>核验</strong><p>浏览器里计算整包摘要</p></div></li>' +
        '<li><span>03</span><div><strong>切片包</strong><p>woff2 与 CSS，供自托管</p></div></li>' +
      '</ol>' +
      '<p class="count-line"><strong>' + list.length + '</strong> 款上传原包核验后领取</p>' +
      (list.length
        ? '<ul class="tool-index">' + list.map(function (f) {
            return '<li>' +
              '<a class="tool-index-row" href="/slice/' + esc(f.norm) + '/">' +
                '<span class="tool-index-name">' + esc(wfName(f)) + '</span>' +
                '<span class="tool-index-meta">' + esc(f.foundry || '未标注') + '</span>' +
                '<span class="tool-index-go">领取</span>' +
              '</a>' +
            '</li>';
          }).join('') + '</ul>'
        : '<p class="tool-note">目录里还没有需要核验原包的款。</p>') +
      plannedHtml +
      '<p class="tool-aside">开源字体不必走核验，到<a href="/source">目录</a>直接拿原件。</p>' +
    '</div>';
  }

  function foundryCard(g) {
    var faces = g.fonts.slice(0, 3).map(function (f) {
      return '<a href="/source/' + esc(f.norm) + '/">' + esc(wfName(f)) + '</a>';
    }).join('<span class="meta-sep"> · </span>');
    if (g.fonts.length > 3) faces += '<span class="meta-sep"> · </span>另 ' + (g.fonts.length - 3) + ' 款';
    return '<li class="foundry-card">' +
      '<a class="name" href="/foundry/' + esc(g.slug) + '/">' + esc(g.name) + '</a>' +
      '<p class="count">' + g.fonts.length + ' 款</p>' +
      '<p class="faces">' + faces + '</p>' +
    '</li>';
  }

  function foundriesPage(groups) {
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">厂商</p>' +
        '<h1>按组织分组</h1>' +
        '<p class="lead">镜像按上游组织归类。目录里出现的厂商如下。</p>' +
      '</div>' +
      '<ul class="foundry-cards">' + groups.map(foundryCard).join('') + '</ul>' +
    '</div>';
  }

  function foundryPage(group) {
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="crumb"><a href="/foundry">厂商</a><span>/</span><span>' + esc(group.name) + '</span></p>' +
        '<p class="kicker">厂商</p>' +
        '<h1>' + esc(group.name) + '</h1>' +
        '<p class="lead">这一页是目录里归属「' + esc(group.name) + '」的字体。</p>' +
      '</div>' +
      '<p class="count-line"><strong>' + group.fonts.length + '</strong> 款</p>' +
      cards(group.fonts) +
    '</div>';
  }

  function usePage() {
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">用法</p>' +
        '<h1>三种拿走方式</h1>' +
        '<p class="lead">原件、切片、网页里用不是同一件事。</p>' +
      '</div>' +
      '<ul class="ways">' +
        '<li class="way">' +
          '<p class="idx">01</p>' +
          '<h2>原件</h2>' +
          '<p>TTF / OTF / 上游仓库归档。给自建站、主题作者。许可允许时才再分发。</p>' +
        '</li>' +
        '<li class="way">' +
          '<p class="idx">02</p>' +
          '<h2>切片包</h2>' +
          '<p>给 WordPress 和静态站本地 @font-face。开源字体的切片包稍后提供。不允许再分发的免费商用字体：上传从厂商下载的原包 zip（不要解压），核验通过后领取。</p>' +
        '</li>' +
        '<li class="way">' +
          '<p class="idx">03</p>' +
          '<h2>网页里用</h2>' +
          '<p>cn.windfonts.com 托管 CSS 和字体分片。不是本站下载，不要拿去二次托管。</p>' +
        '</li>' +
      '</ul>' +
      commentPanel(true) +
      '<p class="wp-note">不要把 <code>cn.windfonts.com</code> 的 woff2 拷走当源文件。注释里的 <code>https://wenfeng.org/license</code> 要留着。不允许再分发的字体走 <a href="/slice">切片工具</a>。</p>' +
      '<div class="section-head" id="theme"><h2>切片包进主题</h2></div>' +
      '<p class="wp-note">解压后整个文件夹放进主题（或 <code>wp-content/fonts</code>）。包内 <code>fonts.css</code> 已写好 <code>@font-face</code> 和必须保留的注释，整只引入，不要拆。</p>' +
      '<pre class="code api-sample">// functions.php 里排队引入\n' +
      'wp_enqueue_style(\n' +
      '  \'wenfeng-slice-xwwk\',\n' +
      '  get_theme_file_uri( \'/fonts/wenfeng-slice-Xwwk/fonts.css\' ),\n' +
      '  array(),\n' +
      '  null\n' +
      ');\n' +
      '\n' +
      '/* 或在主题 style.css 顶部 */\n' +
      '@import url( "./fonts/wenfeng-slice-Xwwk/fonts.css" );</pre>' +
      '<div class="section-head" id="api"><h2>目录 API</h2></div>' +
      '<p class="wp-note">免费和商业都可以查。商业字只出字段，<code>files</code> 为空。不是店面的 <code>/api/css</code>。<code>lineage</code> 字段为造字平台预留，现在恒为 <code>null</code>。</p>' +
      '<ul class="api-list">' +
        '<li><a href="/api/v1/fonts"><code>GET /api/v1/fonts</code><span>全部条目</span></a></li>' +
        '<li><a href="/api/v1/fonts?offer=source"><code>GET /api/v1/fonts?offer=source</code><span>本站下载</span></a></li>' +
        '<li><a href="/api/v1/fonts?q=' + encodeURIComponent('霞鹜') + '"><code>GET /api/v1/fonts?q=霞鹜</code><span>按名搜</span></a></li>' +
        '<li><a href="/api/v1/fonts/Xwwk"><code>GET /api/v1/fonts/Xwwk</code><span>一款 · 有 files</span></a></li>' +
        '<li><a href="/api/v1/fonts/Albbpht"><code>GET /api/v1/fonts/Albbpht</code><span>files 为空</span></a></li>' +
        '<li><a href="/api/v1/licenses/Xwwk"><code>GET /api/v1/licenses/Xwwk</code><span>许可原文</span></a></li>' +
        '<li><a href="/api/v1/foundries"><code>GET /api/v1/foundries</code><span>厂商</span></a></li>' +
        '<li><a href="/api/v1/certs"><code>GET /api/v1/certs</code><span>可核验目录</span></a></li>' +
        '<li><a href="/api/v1/certs/Xwwk"><code>GET /api/v1/certs/Xwwk</code><span>一款核验 JSON</span></a></li>' +
        '<li><span class="api-row"><code>POST /api/v1/certs/verify</code><span>核对本份签名</span></span></li>' +
      '</ul>' +
      '<pre class="code api-sample">GET /api/v1/fonts/{norm}\n{\n  "norm": "Xwwk",\n  "name": "霞鹜文楷",\n  "distribution": true,\n  "offer": "source",\n  "files": [ { "kind": "archive", "href": "…" } ]\n}</pre>' +
    '</div>';
  }

  function aboutPage() {
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">关于</p>' +
        '<h1>文风的仓库，不是店面</h1>' +
        '<p class="lead">wenfeng.org 提供源文件和下载。开源原件和开源切片可自选带走。授权原文也要收，只是一小块。</p>' +
      '</div>' +
      '<ul class="ways">' +
        '<li class="way">' +
          '<p class="idx">店面</p>' +
          '<h2>app.windfonts.com</h2>' +
          '<p>网页里用、控制台、账号。</p>' +
          '<p class="way-go"><a href="https://app.windfonts.com/">去店面</a></p>' +
        '</li>' +
        '<li class="way">' +
          '<p class="idx">仓库</p>' +
          '<h2>wenfeng.org</h2>' +
          '<p>源文件和下载、许可原文、授权证明，以后有目录 API。</p>' +
          '<p class="way-go"><a href="/source">看目录</a></p>' +
        '</li>' +
        '<li class="way">' +
          '<p class="idx">造字</p>' +
          '<h2>造字平台</h2>' +
          '<p>编辑器放在独立新域，不挂在本站。本站以后只做入口和收录。</p>' +
        '</li>' +
      '</ul>' +
      '<div class="legal-block" id="about-oss">' +
        '<h2>开源立场</h2>' +
        '<p>文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。文风字体提供的源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。</p>' +
        '<p>对于采用标准开源协议的字体，文派科技作为责任主体，可为合法合规使用的个人及企业出具《文风字体授权证明》，作为开源授权的证明材料。证明记录该字体在收录时的完整授权链、适用的开源协议、许可原文哈希，以及本站是否提供原件。证明不替代许可原文，也不为使用者创设新的权利。</p>' +
        '<p>其他品牌厂商自行发布的授权协议，本站只提供授权原文下载，文派科技不出具《文风字体授权证明》，也不代著作权人签署授权书。</p>' +
      '</div>' +
      '<div class="legal-block" id="about-neutral">' +
        '<h2>不卖字，不代言</h2>' +
        '<p>wenfeng.org 只做授权核对与源文件分发。本站不出售字体文件，不出售授权，不代理厂商收费或维权，也不代表任何著作权人授权。</p>' +
      '</div>' +
      '<div class="legal-block" id="about-scope">' +
        '<h2>出证范围</h2>' +
        '<p>只给采用标准开源协议的字体出证；厂商自拟条款、许可未核实、未收录的不出证。完整清单见<a href="/legal#legal-scope">法务说明</a>。</p>' +
      '</div>' +
      '<p class="quiet-note">收录与核验的方法写在<a href="/how">我们怎么核</a>。wenfeng.org 以前用 WordPress 做过，现已改为独立静态站点，与店面分开部署。</p>' +
      '<p class="acts page-acts">' +
        '<a class="btn btn-ink" href="/source">看目录</a>' +
        '<a class="btn" href="/attest">授权证明</a>' +
        '<a class="btn" href="/legal">法务说明</a>' +
      '</p>' +
    '</div>';
  }

  var CN_DIGITS = '〇一二三四五六七八九';
  function cnYear(y) {
    return String(y).split('').map(function (c) { return CN_DIGITS[c] || c; }).join('');
  }
  function cnMD(n) {
    n = parseInt(n, 10);
    if (!n) return '〇';
    if (n <= 10) return n === 10 ? '十' : CN_DIGITS[n];
    if (n < 20) return '十' + CN_DIGITS[n - 10];
    return CN_DIGITS[Math.floor(n / 10)] + '十' + (n % 10 ? CN_DIGITS[n % 10] : '');
  }
  function cnDate(iso) {
    var p = String(iso || '').slice(0, 10).split('-');
    if (p.length < 3) return '';
    return cnYear(p[0]) + '年' + cnMD(p[1]) + '月' + cnMD(p[2]) + '日';
  }
  function yn(v) { return v ? '<span class="yn is-yes">可以</span>' : '<span class="yn is-no">不可以</span>'; }

  function certRow(th, td, extra) {
    return '<tr><th>' + esc(th) + '</th><td' + (extra || '') + '>' + td + '</td></tr>';
  }

  function certChop(issuer) {
    return '<svg class="cert-chop" viewBox="0 0 200 200" aria-hidden="true">' +
      '<circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" stroke-width="4.5"/>' +
      '<circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<defs><path id="chop-top" d="M100,100 m-70,0 a70,70 0 1,1 140,0 a70,70 0 1,1 -140,0"/></defs>' +
      '<text class="chop-ring" fill="currentColor">' +
        '<textPath href="#chop-top" xlink:href="#chop-top" startOffset="25%" text-anchor="middle">' +
          esc(issuer || '文派（广州）科技有限公司') +
        '</textPath>' +
      '</text>' +
      '<polygon fill="currentColor" points="100,70 106.8,90.7 128.5,90.7 110.9,103.6 117.6,124.3 100,111.5 82.4,124.3 89.1,103.6 71.5,90.7 93.2,90.7"/>' +
    '</svg>';
  }

  function certScope(cert) {
    var lic = cert.license || {};
    var c = cert.conclusions || {};
    var items = [
      { m: 'ok', t: '允许商业使用' },
      { m: 'ok', t: '允许网页、应用程序及文档嵌入' },
      { m: 'ok', t: '允许修改及二次创作' },
      { m: c.redistributeFiles ? 'ok' : 'mid', t: c.redistributeFiles ? '允许再分发，须随附原始许可' : '再分发边界以原始许可为准' },
      { m: c.platformOffersSource ? 'ok' : 'mid', t: c.platformOffersSource ? '原件由本平台提供' : '原件由上游提供，本平台不予存留' }
    ];
    if (lic.spdx === 'OFL-1.1') {
      items.push({ m: 'no', t: '不得单独出售字体文件' });
      items.push(lic.rfn
        ? { m: 'no', t: '修改版本不得使用保留字体名称' }
        : { m: 'mid', t: '原始许可未设保留字体名称' });
    } else {
      items.push({ m: 'mid', t: '副本须随附版权及许可声明' });
    }
    return items;
  }

  function certSheet(cert) {
    var issuer = (cert.issuer && cert.issuer.legalName) || '文派（广州）科技有限公司';
    var licName = (cert.license && cert.license.name) || '';
    var origin = (cert.license && cert.license.origin) || null;
    var offers = cert.conclusions && cert.conclusions.platformOffersSource;
    var upstream = cert.upstreamUrl || ((cert.license && cert.license.evidence && cert.license.evidence.url) || '');

    var holderCell = cert.holder ? esc(cert.holder) : '通用核验记录';
    var infoCells = [
      ['收录名称（分发版）', esc(cert.catalogName)],
      ['持证单位', holderCell]
    ];
    if (cert.uscc) infoCells.push(['统一社会信用代码', esc(cert.uscc)]);
    if (cert.usage && cert.usage.length) infoCells.push(['申报用途', esc(cert.usage.join('、'))]);
    var infoHtml = infoCells.map(function (p) {
      return '<div class="cert-cell"><i>' + p[0] + '</i><b>' + p[1] + '</b></div>';
    }).join('');

    var chainNodes = [
      origin
        ? { icon: 'user', role: '原始授权方', name: origin.rootAuthor + '「' + origin.rootWork + '」',
            sub: '衍生收录，授权沿袭' }
        : { icon: 'user', role: '原始授权方', name: cert.foundry || cert.originalName || '', sub: cert.originalEn || '原创设计' },
      { icon: 'book', role: '开源协议', name: licName, sub: '' },
      { icon: 'shield', role: '平台收录分发', name: '文风字体', sub: '出证责任主体', solid: true },
      { icon: 'idcard', role: '持证单位', name: cert.holder || '通用核验记录', sub: '证明持有' }
    ];
    var chainFlow = chainNodes.map(function (n, i) {
      var node = '<div class="chain-node">' +
        '<span class="chain-icon' + (n.solid ? ' is-solid' : '') + '">' + ic(n.icon) + '</span>' +
        '<p class="chain-role">' + esc(n.role) + '</p>' +
        '<p class="chain-name">' + esc(n.name) + '</p>' +
        '<p class="chain-sub">' + esc(n.sub || '') + '</p>' +
      '</div>';
      return (i ? '<div class="chain-arrow" aria-hidden="true">' + ic('arrow-right') + '</div>' : '') + node;
    }).join('');
    var chainDetailHtml =
      '<div class="chain-detail-row"><i>原件处理</i><b>原样提供 未做修改</b></div>' +

      '<div class="chain-detail-row is-link"><i>完整档案</i><b class="is-mono">wenfeng.org' +
        esc((cert.license && cert.license.url) || '') +
        '</b><span class="chain-detail-note">协议原文、哈希及收录版本在线可查</span></div>';

    var scopeMark = { ok: 'check', no: 'close', mid: 'info' };
    var scopeHtml = certScope(cert).map(function (it) {
      return '<span class="cert-scope-item is-' + it.m + '"><i>' + ic(scopeMark[it.m]) + '</i>' + esc(it.t) + '</span>';
    }).join('');

    var prose = '兹证明：下列字体经文风云平台按原始开源协议核验后收录分发，授权链完整可追溯。';
    if (cert.holder) {
      prose += '持证单位<b>' + esc(cert.holder) + '</b>，在下列授权范围内使用。';
    }
    prose += '有关信息列示如下：';

    return '<article class="cert-sheet' + (cert.prototype ? ' is-proto' : '') + '" id="cert-sheet">' +
      '<span class="cert-frame" aria-hidden="true"></span>' +
      '<span class="cert-frame-inner" aria-hidden="true"></span>' +
      '<p class="cert-mark" aria-hidden="true">文风字体</p>' +
      '<div class="cert-inner">' +
        '<header class="cert-header">' +
          '<div class="cert-brand">' +
            '<img class="cert-logo" src="/assets/wf-icon.webp" alt="" width="34" height="34">' +
            '<span class="cert-brand-text"><b>文风字体</b><i>WENPAI TECHNOLOGY · WINDFONTS</i></span>' +
          '</div>' +
          '<div class="cert-type"><b>开源字体 · 合规可查</b><i>OPEN FONT COMPLIANCE</i></div>' +
        '</header>' +
        '<div class="cert-flexgap" aria-hidden="true"></div>' +
        '<div class="cert-title-row">' +
          '<h1 class="cert-title">授权证明</h1>' +
        '</div>' +
        '<div class="cert-no-strip">' +
          '<span><i>证明编号</i><b class="is-red">' + esc(cert.serial) + '</b></span>' +
          '<span><i>在线查验</i><b>wenfeng.org/v</b></span>' +
        '</div>' +
        '<p class="cert-prose">' + prose + '</p>' +
        '<div class="cert-info">' + infoHtml + '</div>' +
        '<div class="cert-chain">' +
          '<div class="chain-flow">' + chainFlow + '</div>' +
          '<div class="chain-detail">' + chainDetailHtml + '</div>' +
        '</div>' +
        '<div class="cert-scope">' +
          '<div class="cert-scope-grid">' + scopeHtml + '</div>' +
        '</div>' +
        '<div class="cert-sample">' +
          '<p class="cert-sample-text t-' + esc(cert.norm) + '">风急天高猿啸哀　渚清沙白鸟飞回</p>' +
        '</div>' +
        '<p class="cert-memo"><b>声明</b>　文派（广州）科技有限公司系平台运营与分发主体，并非该字体原始著作权人。本证明不改变、不替代原始授权条款，亦非著作权人出具的授权书；字体的使用、修改及分发，以原始授权协议及著作权人声明为准。签发记录留存不少于六年。</p>' +
        '<p class="cert-hereby">特此证明</p>' +
        '<div class="cert-sign">' +
          '<div class="cert-verify">' +
            '<img class="cert-qr" alt="在线查验二维码" src="/api/v1/certs/qr?s=' + encodeURIComponent(cert.serial) + '">' +
            '<div class="cert-verify-copy"><b>电子核对</b><p>扫码进入在线查验<br>凭证明编号核对真伪</p></div>' +
          '</div>' +
          '<div class="cert-sign-off">' + certChop(issuer) +
            '<p class="cert-sign-org">' + esc(issuer) + '</p>' +
            '<p class="cert-sign-date">' + esc(cnDate(cert.issuedAt)) + '</p>' +
          '</div>' +
        '</div>' +
        (cert.prototype ? '<p class="cert-proto">电子样张　原型环境签发　不作为正式存档</p>' : '') +
      '</div>' +
    '</article>';
  }

  function lookupPage() {
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">查证</p>' +
        '<h1>证书在线查验</h1>' +
        '<p class="lead">输入证明编号和持证单位名称，两项一致即显示对应证书、生成日期与下载次数。</p>' +
      '</div>' +
      '<form class="gen-form no-print" data-cert-lookup>' +
        '<p class="kicker">两要素查验</p>' +
        '<label>证明编号<input name="s" type="text" placeholder="WF-…" autocomplete="off"></label>' +
        '<label>持证单位<input name="holder" type="text" placeholder="单位名称，需与证明一致" autocomplete="organization"></label>' +
        '<p class="acts"><button class="btn btn-ink" type="submit">查验</button></p>' +
      '</form>' +
      '<div id="lookup-result" hidden></div>' +
    '</div>';
  }

  function attestIndex(list, fonts) {
    var options = (list.certs || []).map(function (c) {
      return '<option value="' + esc(c.norm) + '">' + esc(c.catalogName) + '</option>';
    }).join('');
    var rows = (list.certs || []).map(function (c) {
      return '<li class="lic-row">' +
        '<a class="name" href="' + esc(c.href) + '">' + esc(c.catalogName) + '</a>' +
        '<span class="proto">' + esc(c.spdx) + '</span>' +
        '<span class="status ' + (c.platformOffersSource ? 'is-source' : 'is-jump') + '">' +
          (c.redistributeFiles ? '本站下载' : '官方下载') + '</span>' +
        '<a class="go" href="' + esc(c.href) + '">证明</a>' +
      '</li>';
    }).join('');
    var skippedVendor = fonts.filter(function (f) {
      var o = offerOf(f);
      return o !== 'pending' && o !== 'missing' && !canAttest(f);
    }).map(function (f) {
      return '<a href="/source/' + esc(f.norm) + '/">' + esc(wfName(f)) + '</a>';
    }).join('、');
    var skippedOpen = fonts.filter(function (f) {
      var o = offerOf(f);
      return o === 'pending' || o === 'missing';
    }).map(function (f) {
      return '<a href="/source/' + esc(f.norm) + '/">' + esc(wfName(f)) + '</a>';
    }).join('、');
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">核验</p>' +
        '<h1>文风字体授权证明</h1>' +
        '<p class="lead">标准开源协议的字体，由文派（广州）科技有限公司作为责任主体出具授权证明，证实持有人处于有效的开源授权链条内；证明不是著作权人另行授权。立场与出证范围见关于和法务说明。</p>' +
      '</div>' +
      '<ul class="ways">' +
        '<li class="way"><p class="idx">主体</p><h2>文派科技签发</h2><p>文派（广州）科技有限公司作为责任主体出具开源授权证明。证面品牌是文风。文派不是字体著作权人。</p></li>' +
        '<li class="way"><p class="idx">范围</p><h2>只出标准开源</h2><p>OFL、MIT、Apache 等标准开源协议可出证。厂商自拟协议只提供原文下载。</p></li>' +
        '<li class="way"><p class="idx">核对</p><h2>编号 + JSON</h2><p>每份证明有唯一编号，附可核对的电子签名。把 JSON 贴到核对页即可核对。</p></li>' +
      '</ul>' +
      '<form class="gen-form no-print" data-attest-gen>' +
        '<p class="kicker">生成器</p>' +
        '<label>字体<select name="norm">' + options + '</select></label>' +
        '<label>持证单位（可选）<input name="holder" type="text" placeholder="单位名称，只印在这一份副本上" autocomplete="organization"></label>' +
        '<label>统一社会信用代码（可选）<input name="uscc" type="text" placeholder="91440101MA…" autocomplete="off"></label>' +
        '<fieldset class="usage-check">' +
          '<legend>用途确认</legend>' +
          '<div class="opts">' +
            '<label><input type="checkbox" name="usage" value="web" checked>网页嵌入</label>' +
            '<label><input type="checkbox" name="usage" value="print">印刷物料</label>' +
            '<label><input type="checkbox" name="usage" value="embed">软件内嵌</label>' +
            '<label><input type="checkbox" name="usage" value="modify">修改衍生</label>' +
            '<label><input type="checkbox" name="usage" value="redistribute">再分发</label>' +
          '</div>' +
        '</fieldset>' +
        '<p class="acts">' +
          '<button class="btn btn-ink" type="submit">生成授权证明</button>' +
          '<a class="btn" href="/attest/verify">核对一份 JSON</a>' +
          '<a class="btn" href="/attest/ledger">签发台账</a>' +
          '<a class="btn" href="/legal">法务说明</a>' +
        '</p>' +
      '</form>' +
      '<p class="count-line"><strong>' + (list.certs || []).length + '</strong> 款可核验' +
        (skippedVendor ? ' · 厂商协议只提供原文：' + skippedVendor : '') +
        (skippedOpen ? ' · 待核实/未收录：' + skippedOpen : '') + '</p>' +
      '<ul class="lic-index">' + rows + '</ul>' +
    '</div>';
  }

  function attestPage(cert, route) {
    if (!cert || cert.error) {
      return '<div class="container"><div class="page-state is-fill">' +
        '<p class="kicker">核验</p>' +
        '<h1>这一款还不能出证</h1>' +
        '<p class="lead">' + esc((cert && cert.reason) || '这一款不在标准开源出证范围内。') + '</p>' +
        '<p class="acts"><a class="btn btn-ink" href="/attest">可核验目录</a><a class="btn" href="/legal">法务说明</a></p>' +
      '</div></div>';
    }
    return '<div class="cert-wrap">' +
      '<div class="cert-toolbar no-print">' +
        '<p class="crumb"><a href="/attest">核验</a><span>/</span><span>' + esc(cert.catalogName) + '</span></p>' +
        '<div class="detail-cta">' +
          '<button type="button" class="btn btn-ink" data-download-pdf data-norm="' + esc(cert.norm) + '" data-holder="' + esc(cert.holder || '') + '" data-uscc="' + esc(cert.uscc || '') + '" data-usage="' + esc((cert.usage || []).join(',')) + '">下载 PDF（A4）</button>' +
          '<button type="button" class="btn" data-print-cert>打印</button>' +
          '<button type="button" class="btn" data-download-cert data-norm="' + esc(cert.norm) + '" data-holder="' + esc(cert.holder || '') + '">下载 JSON</button>' +
          '<a class="btn btn-text" href="/license/' + esc(cert.norm) + '">许可原文</a>' +
          '<a class="btn btn-text" href="/attest/ledger">台账</a>' +
        '</div>' +
      '</div>' +
      '<div class="cert-stage">' + certSheet(cert) + '</div>' +
      '<section class="cert-share no-print container">' +
        '<p class="kicker">分享证书</p>' +
        '<h2>把授权证明挂到自己的网站</h2>' +
        '<p class="share-lead">贴一段代码，徽章由文风服务器按编号出图，站点改不了内容；访客点击直达在线查验。</p>' +
        '<img class="share-badge" src="/api/v1/certs/badge?s=' + encodeURIComponent(cert.serial) + '" alt="授权证明徽章预览">' +
        '<pre class="code">' + esc('<a href="https://wenfeng.org/v?s=' + cert.serial + '"><img src="https://wenfeng.org/badge/' + cert.serial + '.svg" alt="文风字体授权证明"></a>') + '</pre>' +
        '<p class="acts"><button type="button" class="btn" data-copy="' + esc('<a href="https://wenfeng.org/v?s=' + cert.serial + '"><img src="https://wenfeng.org/badge/' + cert.serial + '.svg" alt="文风字体授权证明"></a>') + '">复制嵌入代码</button></p>' +
      '</section>' +
    '</div>';
  }

  function attestVerifyPage() {
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">核验</p>' +
        '<h1>核对电子证明</h1>' +
        '<p class="lead">把下载的 JSON 贴进来，核对编号和内容是否被改过。</p>' +
      '</div>' +
      '<form class="verify-form" data-attest-verify>' +
        '<label class="sr-only" for="attest-json">证明 JSON</label>' +
        '<textarea id="attest-json" name="json" rows="14" placeholder="{ &quot;type&quot;: &quot;wenfeng.attestation.v1&quot;, … }"></textarea>' +
        '<button class="btn btn-ink" type="submit">核对</button>' +
      '</form>' +
      '<div id="verify-out" class="verify-out" hidden></div>' +
      '<p class="tool-aside">也可以在<a href="/attest/ledger">签发台账</a>按编号查。</p>' +
    '</div>';
  }

  function howPage() {
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">收录与核验</p>' +
        '<h1>我们怎么核</h1>' +
        '<p class="lead">文风只做两件事：把源文件交给你，把许可说清楚。这一页写明收录标准和核验方法。</p>' +
      '</div>' +
      '<div class="legal-block" id="how-criteria">' +
        '<h2>收录标准</h2>' +
        '<p>收进目录的字体要满足三条：许可文本拿得到；来源能查到作者或厂商；文件取自官方渠道。</p>' +
        '<p>来路不明的打包文件不收。许可写不清楚的，先标「待核实」，不提供文件，核对完成再更新状态。</p>' +
      '</div>' +
      '<div class="legal-block" id="how-status">' +
        '<h2>状态词的含义</h2>' +
        '<ul class="kv-words">' +
          '<li><b>本站下载</b><span>文件在本站，可以直接下载。</span></li>' +
          '<li><b>官方下载</b><span>本站不存文件，请到厂商或上游官方渠道下载。</span></li>' +
          '<li><b>未收录</b><span>这款字体还没收进镜像，先去上游取。</span></li>' +
          '<li><b>待核实</b><span>许可还没核对完，核对完成前不提供文件。</span></li>' +
        '</ul>' +
      '</div>' +
      '<div class="legal-block" id="how-evidence">' +
        '<h2>许可怎么取证</h2>' +
        '<p>以字体发布件内嵌的声明为准：安装包里的许可文件、官网许可页、上游仓库的 LICENSE，三者有其一才算拿到原文。</p>' +
        '<p>取证时记录来源、日期和文本哈希。哈希的作用是：原文以后被改动或换版时，能对出变化。</p>' +
        '<p>每款字体的取证记录，在它的许可原文页里可以查到。</p>' +
      '</div>' +
      '<div class="legal-block" id="how-cert">' +
        '<h2>证明怎么签</h2>' +
        '<p>只给采用标准开源协议的字体出证，文派（广州）科技有限公司是出证责任主体。出证时申报用途（网页嵌入、印刷物料、软件内嵌、修改衍生、再分发），用途写入证明和台账，作为授权范围的确认记录。每份证明有唯一编号，签发即写入<a href="/attest/ledger">签发台账</a>。</p>' +
        '<p>核对收到的证明：编号在台账查得到、内容与台账一致，才是文风签发的。编号对不上，按伪造处理。</p>' +
      '</div>' +
      '<p class="acts page-acts">' +
        '<a class="btn btn-ink" href="/source">看目录</a>' +
        '<a class="btn" href="/attest">授权证明</a>' +
        '<a class="btn" href="/legal">法务说明</a>' +
      '</p>' +
    '</div>';
  }

  // 字体 CSS 走公共 CDN cn（app.windfonts.com 是 OSS 壳站不做公共热链）。
  // 单台边缘故障时 <link> 失败 → 保留本地近似字体兜底（css/shop.css .t-* 旧规则）。
  var FACE_CSS_TPL = 'https://cn.windfonts.com/api/css?family={F}&weight=400&subset=zh-common&version=zh-common';
  var facesLoaded = {};
  function applyFontFace(norm, family) {
    if (!norm || !family || facesLoaded[norm]) return;
    facesLoaded[norm] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FACE_CSS_TPL.replace('{F}', encodeURIComponent(family));
    link.onload = function () {
      var st = document.createElement('style');
      st.textContent = '.t-' + norm + '{font-family:"WF-' + norm + '", var(--font-ui);}';
      document.head.appendChild(st);
    };
    document.head.appendChild(link);
  }
  function faceAttrs(f) {
    return f && f.family
      ? ' data-face-norm="' + esc(f.norm) + '" data-face-family="' + esc(f.family) + '"'
      : '';
  }
  function lazyPreviews() {
    var els = document.querySelectorAll('[data-face-norm]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(els, function (el) {
        applyFontFace(el.getAttribute('data-face-norm'), el.getAttribute('data-face-family'));
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        applyFontFace(e.target.getAttribute('data-face-norm'), e.target.getAttribute('data-face-family'));
      });
    }, { rootMargin: '140px' });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  function fontFull(norm, fonts) {
    var f = findFont(fonts, norm);
    if (!f) return Promise.resolve(null);
    if (f._full) return Promise.resolve(f);
    if (!fontFull._cache) fontFull._cache = {};
    var c = fontFull._cache;
    if (c[f.norm]) return c[f.norm];
    c[f.norm] = fetch('/data/font/' + encodeURIComponent(f.norm) + '.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (full) {
        if (full) {
          for (var k in full) if (k !== '_full') f[k] = full[k];
          f._full = true;
        }
        return f;
      })
      .catch(function () { return f; });
    return c[f.norm];
  }

  function ic(name, cls) {
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function kvRow(k, v, cls) {
    return '<div class="tool-kv">' +
      '<span class="tool-kv-k">' + k + '</span>' +
      '<span class="tool-kv-v' + (cls ? ' ' + cls : '') + '">' + v + '</span>' +
    '</div>';
  }

  function licenseEvidence(f, lic) {
    var fl = f.license || {};
    var ev = (lic && lic.evidence) || {};
    var words = { full: '全文已归档', summary: '要点摘录', pointer: '上游指引', missing: '未取得' };
    var state = words[fl.textState || (lic && lic.textKind) || ''] || '未取得';
    var src = fl.sourceUrl || ev.url || '';
    var srcHtml = src
      ? '<a href="' + esc(src) + '"' + hrefAttrs(src) + '>' + esc(fileNameFromHref(src) || src) + '</a>'
      : '来源记录待补';
    var date = fl.fetchedAt || ev.fetchedAt || '';
    return '<section class="pack is-evidence">' +
      '<header class="pack-head"><div>' +
        '<p class="pack-kicker">取证记录</p>' +
        '<h2>这条许可是怎么核的</h2>' +
      '</div></header>' +
      '<div class="tool-kvlist">' +
        kvRow('文本状态', esc(state)) +
        ((fl.spdx === 'OFL-1.1')
          ? kvRow('保留名', fl.rfn
              ? esc(fl.rfn) + (fl.rfnNote ? '<span class="tool-quiet"> · ' + esc(fl.rfnNote) + '</span>' : '')
              : '未声明保留名')
          : '') +
        (src ? kvRow('来源', srcHtml) : '') +
        (date ? kvRow('取证日期', esc(date)) : '') +
        kvRow('文本哈希', fl.textSha256
          ? '<span class="is-hash">' + esc(fl.textSha256) + '</span>'
          : '归档文本时计算') +
      '</div>' +
      '<p class="tool-note">取证方法见<a href="/how">我们怎么核</a>。哈希对得上，原文就没被换过。</p>' +
    '</section>';
  }

  function fontSnapshot(f) {
    var m = f.mirror || {};
    if (m.state !== 'mirrored') return '';
    var arch0 = fileOf(f, 'archive') || {};
    if (!m.syncedAt && !m.headSha && !arch0.sha256) return '';
    var arch = fileOf(f, 'archive') || {};
    return '<section class="pack is-snapshot">' +
      '<header class="pack-head"><div>' +
        '<p class="pack-kicker">收录记录</p>' +
        '<h2>这份文件怎么溯源</h2>' +
      '</div></header>' +
      '<div class="tool-kvlist">' +
        (m.syncedAt ? kvRow('最近同步', esc(m.syncedAt)) : '') +
        (m.headSha ? kvRow('收录版本（上游 commit）', '<span class="is-hash">' + esc(m.headSha) + '</span>') : '') +
        kvRow('归档包哈希', arch.sha256
          ? '<span class="is-hash">' + esc(arch.sha256) + '</span>'
          : '收录时随包固化') +
      '</div>' +
      '<p class="tool-note">哈希在收录时对原包计算，之后每次下载都可以对。上次同步之后上游有更新，会在这里反映。</p>' +
    '</section>';
  }

  function ledgerView(data, route) {
    var records = data.records || [];
    var q = route.q || '';
    var list = records.filter(function (r) {
      if (!q) return true;
      var hay = [r.serial, r.catalogName, r.norm, r.holder].join(' ').toLowerCase();
      return hay.indexOf(q.toLowerCase()) !== -1;
    });
    var rows;
    if (!records.length) {
      rows = '<p class="tool-note">还没有签发记录。生成一份授权证明后，这里就会出现台账。</p>';
    } else if (!list.length) {
      rows = '<p class="tool-note">没有匹配「' + esc(q) + '」的记录。</p>';
    } else {
      rows = '<p class="count-line"><strong>' + list.length + '</strong> 条</p>' +
        '<ul class="lic-index">' + list.map(function (r) {
          var d = String(r.issuedAt || '').slice(0, 10);
          return '<li class="lic-row">' +
            '<span class="name">' + esc(r.serial) + '</span>' +
            '<span class="proto">' + esc(r.catalogName || r.norm || '') +
              (r.holder ? ' · 存档 ' + esc(r.holder) : '') + '</span>' +
            '<span class="status is-source">' + esc(d) + '</span>' +
            '<a class="go" href="/attest/' + esc(r.norm) + '/">核对</a>' +
          '</li>';
        }).join('') + '</ul>';
    }
    return '<div class="container page-pad">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">核验</p>' +
        '<h1>签发台账</h1>' +
        '<p class="lead">文风签发的每一份授权证明都记录在这里。编号在台账查得到、内容对得上，才是我们签发的。</p>' +
      '</div>' +
      searchForm('/attest/ledger', q, '', '', '搜编号或持证单位') +
      rows +
      '<p class="tool-aside">台账里没有的编号，或编号对不上内容的，按伪造处理，欢迎来信 <a href="mailto:license@wenfeng.org">license@wenfeng.org</a> 反映。</p>' +
    '</div>';
  }

  function legalPage() {
    return '<div class="container page-pad legal-page">' +
      '<div class="page-head is-compact">' +
        '<p class="kicker">法务</p>' +
        '<h1>核验、许可与法务说明</h1>' +
        '<p class="lead">这页是操作说明，不是法律意见。权利以各字体许可原文为准。</p>' +
      '</div>' +
      '<nav class="legal-toc" aria-label="本页目录">' +
        '<a href="#legal-oss">开源立场</a>' +
        '<a href="#legal-scope">出证范围</a>' +
        '<a href="#legal-what">核验是什么</a>' +
        '<a href="#legal-issuer">签发主体</a>' +
        '<a href="#legal-name">文风·命名</a>' +
        '<a href="#legal-cn">著作权法</a>' +
        '<a href="#legal-soft">软件保护条例</a>' +
        '<a href="#legal-ofl">OFL 要点</a>' +
        '<a href="#legal-sign">电子签名</a>' +
        '<a href="#legal-buy">企业采购</a>' +
        '<a href="#legal-redist">再分发</a>' +
        '<a href="#legal-phish">待核实</a>' +
        '<a href="#legal-takedown">下架与异议</a>' +
        '<a href="#legal-misread">常见误读</a>' +
      '</nav>' +
      '<div class="legal-block" id="legal-oss">' +
        '<h2>开源立场</h2>' +
        '<p>文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。文风字体提供的源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。</p>' +
        '<p>对于采用标准开源协议的字体，文派科技作为责任主体，可为合法合规使用的个人及企业出具《文风字体授权证明》，作为开源授权的证明材料。证明记录该字体在收录时的完整授权链、适用的开源协议、许可原文哈希，以及本站是否提供原件。证明不替代许可原文，也不为使用者创设新的权利。</p>' +
        '<p>其他品牌厂商自行发布的授权协议，本站只提供授权原文下载，文派科技不出具《文风字体授权证明》，也不代著作权人签署授权书。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-scope">' +
        '<h2>出证范围</h2>' +
        '<p>可出证的标准开源协议：SIL Open Font License 1.1、MIT、Apache License 2.0、IPA Font License、CC0、CC BY / CC BY-SA（不含 NC）、M+，以及带 Font Exception 的 GPL。CC 系授权的字体出证时，证明内保留作者署名，满足署名条款。</p>' +
        '<p>不出证：厂商自拟的授权协议（如阿里巴巴普惠体授权协议）、仓耳字库免费开源字体授权声明、HarmonyOS / MiSans / OPPO 等厂商条款、只标「免费商用」而无正式协议文本的字体、许可未核实的、未收录的。这类字如有授权原文，只提供下载。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-what">' +
        '<h2>核验是什么</h2>' +
        '<p>文风授权证明是文派科技提供的开源授权证明服务。它记录：某日从某上游取得某款字、许可原文哈希、本站是否提供原件、可否按原文再分发。它填的是企业档案里「要一份盖章件」的缺口。</p>' +
        '<p>它<strong>不是</strong>著作权人出具的授权书，<strong>不</strong>创造新的使用权，<strong>不</strong>等于软著登记或公证。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-issuer">' +
        '<h2>签发主体</h2>' +
        '<p>签发人：<strong>文派（广州）科技有限公司</strong>。证面品牌：<strong>文风</strong>。产品：wenfeng.org。</p>' +
        '<p>文派科技是文风的运营主体和出证责任主体，不是霞鹜、阿里巴巴、Adobe 等字体的著作权人。授权证明记录的是开源协议在收录时的状态，不是「文派授权你商用这款字」。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-name">' +
        '<h2>文风·命名</h2>' +
        '<p>本站收录名、核验主名写成「文风·」加原名，例如文风·霞鹜文楷。这是平台命名，不是把字体改成文风的作品。</p>' +
        '<p>字体文件内的版权声明、name 表、OFL 保留名（Reserved Font Name）仍用原名。派生件若以后出现，必须另起新名，不能带保留名。本核验只针对未改名的收录原件或切片包。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-cn">' +
        '<h2>国内法务通常问的</h2>' +
        '<p>《著作权法》：字体作为计算机软件，一般按软件作品保护。单字图形是不是美术作品，法院判决并不统一，采购时不要把「开源」理解成「字形不受保护」。</p>' +
        '<p>开源许可是著作权人允许他人使用的书面条款。企业使用 OFL / MIT 字体，通常不必再向作者另签一份「授权证明」，但采购、审计、客户验收仍常要归档材料。核验就是给这份材料。</p>' +
        '<p>网页嵌入、安装到操作系统、把字体文件再分发给客户，三种行为边界不同。本证用三行结论分开写：网页嵌入、再分发原件、本平台是否提供原件。</p>' +
        '<p>侵权投诉仍走著作权人。本页不是法律意见，不能替代律师审查具体项目。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-soft">' +
        '<h2>《计算机软件保护条例》</h2>' +
        '<p>字库文件（TTF / OTF / 源工程）在国内常被当作软件复制品。许可允许复制、修改、再分发时，按原文做；许可禁止再分发时，把文件拷进客户交付包就可能越权。</p>' +
        '<p>本核验只记录平台读到的条款结论，不代替对交付包、安装包、App 内嵌的逐项审查。嵌入网页 CSS 与把原件放进安装程序，不是同一件事。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-ofl">' +
        '<h2>OFL 1.1 在本站怎么读</h2>' +
        '<p>可以用于网站、印刷、软件内嵌（看原文）。可以修改、再分发（不得单独出售字体本身）。保留名：未获作者书面允许，派生件不能用原名。本站切片包若只做技术子集、不改设计，仍标原名，包装可以写「文风切片包」。</p>' +
        '<p>MIT 更宽。阿里巴巴普惠体、仓耳、HarmonyOS、MiSans、OPPO 等厂商协议：本站只提供授权原文下载，<strong>不出具《文风字体授权证明》</strong>。常见条款是免费商用、禁止再分发字体文件；是否可商用，以厂商原文为准。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-sign">' +
        '<h2>《电子签名法》和本证</h2>' +
        '<p>授权证明由平台密钥签名，贴到核对页即可验证内容是否被改过。它不是可靠电子签名，也不是 CA 签发的数字证书，只是平台的核验记录。</p>' +
        '<p>不要把它交给公证处当「已公证」。需要公证或电子认证时，另走法定程序。核验 JSON 可以作辅助证据：证明某日平台对某哈希、某 SPDX 做过签名。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-buy">' +
        '<h2>企业采购归档建议</h2>' +
        '<ol>' +
          '<li>保存本核验 PDF / 打印件和 JSON。</li>' +
          '<li>保存许可原文（本站 /license/{短码}）。</li>' +
          '<li>若拿走了原件，保存当时的归档包和哈希，复核时要用。</li>' +
          '<li>持证单位栏只表示这一份副本放在哪家单位的档案里，不等于被授权人。</li>' +
        '</ol>' +
      '</div>' +
      '<div class="legal-block" id="legal-redist">' +
        '<h2>再分发</h2>' +
        '<p>许可允许再分发、本站也提供原件的（目录里标「本站下载」）：可以按原文带走原件。厂商不允许再分发的字体：本站不提供文件，也不出证。若你已从厂商取得原件，可在 <a href="/slice">/slice/{短码}/</a> 上传核验后领取自托管切片包。核验在浏览器内完成：体积只作预检，识别以整包摘要为准（生产对照本站收录的 SHA-256，厂商若公布 MD5 则并列）。本原型只模拟流程，不上传服务器，也不把原件再切一遍。</p>' +
        '<p>不要把 <code>cn.windfonts.com</code> 的 woff2 拷走当源文件。嵌入代码里的 <code>https://wenfeng.org/license</code> 不能改。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-phish">' +
        '<h2>待核实与未收录</h2>' +
        '<p>许可尚未核对、或源文件还没进镜像的款，<strong>不出核验</strong>。不要把店面能预览当成可以安装、可以再分发。</p>' +
        '<p>钓鱼条款、个人免费、登录墙领取，一律按原文。拿不准就当不能带走。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-takedown">' +
        '<h2>下架与异议</h2>' +
        '<p>收录信息有误，或对某条目有权利主张，写信到 <a href="mailto:license@wenfeng.org">license@wenfeng.org</a>，说明是哪一条、问题在哪（权利人请附权利证明）。</p>' +
        '<p>核实期间，该条目标为「待核实」，暂停出证，也不提供文件。</p>' +
        '<p>确认有误就下架，变更记录留在目录状态里；文风下架以核验页和目录状态为准。</p>' +
        '<p>被下架的一方有异议，同样来信说明；是否恢复，按最新核对结果处理。</p>' +
      '</div>' +
      '<div class="legal-block" id="legal-misread">' +
        '<h2>常见误读</h2>' +
        '<ul>' +
          '<li>「文派把著作权转给你」：没有这种授权。文派出具的是开源授权证明，标题是《文风字体授权证明》。权利仍以许可原文为准。</li>' +
          '<li>「厂商协议也能盖文派的章」：不能。标准开源协议才出证；厂商自拟协议只提供原文下载。</li>' +
          '<li>「被授权人」：持证单位只表示这份副本放在哪家单位档案里。</li>' +
          '<li>「软著号 / 商标转让」：本证不写。文风· 是收录名，不是把原字体改成文风的作品，也不转移商标。</li>' +
          '<li>「盖了章就能卖字体文件」：OFL 禁止单独出售字体本身；厂商不允许再分发的字体更不能卖文件。</li>' +
          '<li>「印迹印章」：视觉签章产品与本证无关，不要混用。</li>' +
        '</ul>' +
      '</div>' +
      '<p class="acts page-acts">' +
        '<a class="btn btn-ink" href="/attest">生成核验</a>' +
        '<a class="btn" href="/license">许可原文</a>' +
      '</p>' +
    '</div>';
  }

  function apiJson(url) {
    return fetch(url).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (!r.ok || ct.indexOf('json') === -1) {
        var e = new Error('服务未开放（' + r.status + '）');
        e.serviceDown = true;
        throw e;
      }
      return r.json();
    });
  }

  function serviceDown() {
    return '<div class="container"><div class="page-state is-fill">' +
      '<p class="kicker">核验</p>' +
      '<h1>证明服务未随本部署开放</h1>' +
      '<p class="lead">授权证明的签发与查验由独立服务承担，这个部署没有带它。目录、许可原文与取证记录不受影响。</p>' +
      '<p class="acts"><a class="btn btn-ink" href="/source">目录</a><a class="btn" href="/legal">法务说明</a></p>' +
    '</div></div>';
  }

  function notFound(msg) {
    return '<div class="container"><div class="page-state is-fill">' +
      '<p class="kicker">没有这一页</p>' +
      '<h1>' + esc(msg || '没有这一款') + '</h1>' +
      '<p class="lead">回目录搜名字，或从嵌入注释进入许可。</p>' +
      '<p class="acts"><a class="btn btn-ink" href="/source">目录</a><a class="btn" href="/license">许可</a></p>' +
    '</div></div>';
  }

  function titles(route, extra) {
    var map = {
      home: '源文件',
      list: '目录',
      font: extra || '字体',
      licenses: '许可',
      license: (extra || '') + ' 许可',
      foundries: '厂商',
      foundry: extra || '厂商',
      use: '用法',
      how: '我们怎么核',
      about: '关于',
      attests: '核验',
      attest: extra || '核验',
      'attest-verify': '核对证明',
      'v': '在线查验',
      'attest-ledger': '签发台账',
      legal: '法务',
      slices: '切片',
      slice: extra || '切片',
      notfound: '没有这一页'
    };
    document.title = (map[route.page] || '文风') + ' · wenfeng.org';
  }

  function sliceCtx(el) {
    if (!el) return null;
    return {
      f: {
        norm: el.getAttribute('data-norm') || '',
        name: el.getAttribute('data-name') || '',
        en: el.getAttribute('data-en') || '',
        foundry: el.getAttribute('data-foundry') || ''
      },
      gate: {
        accept: (el.getAttribute('data-accept') || '').split(',').filter(Boolean),
        minBytes: parseInt(el.getAttribute('data-min') || '20480', 10) || 20480,
        nameHints: (el.getAttribute('data-hints') || '').split(',').filter(Boolean),
        sha256: el.getAttribute('data-sha256') || null,
        origin: el.getAttribute('data-origin')
          ? { href: el.getAttribute('data-origin'), label: el.getAttribute('data-origin-label') || '' }
          : null
      }
    };
  }

  function hintHit(name, hints) {
    var n = String(name || '').toLowerCase();
    for (var i = 0; i < hints.length; i++) {
      if (hints[i] && n.indexOf(String(hints[i]).toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function judgeSlice(file, bytes, gate) {
    var kind = sniffKind(bytes);
    var st = {
      name: file.name,
      size: file.size,
      sizeWord: bytesWord(file.size),
      kind: kind,
      kindLabel: kindWord(kind) || '无法识别'
    };
    if (!kind) {
      st.reason = '无法识别为官方 zip。';
      return { ok: false, st: st };
    }
    if (kind === 'woff' || kind === 'woff2') {
      st.reason = '这是网页字体，不是厂商原包。';
      return { ok: false, st: st };
    }
    if (gate.accept.indexOf(kind) === -1) {
      st.reason = (kind === 'otf' || kind === 'ttf' || kind === 'ttc' || kind === 'otc')
        ? '这是单只字体。请放入尚未解压的官方 zip。'
        : '请放入尚未解压的官方 zip。';
      return { ok: false, st: st };
    }
    if (file.size < gate.minBytes) {
      st.reason = '体积过小，更像预览子集。';
      return { ok: false, st: st };
    }
    if (!hintHit(file.name, gate.nameHints)) {
      st.reason = '文件名对不上这一款。请用官方包名。';
      return { ok: false, st: st };
    }
    return { ok: true, st: st };
  }

  function fillSliceBody(html) {
    var body = document.querySelector('[data-slice-body]');
    if (body) body.innerHTML = html;
  }

  function runSliceFile(file) {
    var el = document.getElementById('slice-gate');
    var ctx = sliceCtx(el);
    if (!ctx || !file) return;
    fillSliceBody(sliceBoard(ctx.f, 'work', { name: file.name, sizeWord: bytesWord(file.size) }, ctx.gate));
    file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var judged = judgeSlice(file, bytes, ctx.gate);
      var st = judged.st;
      return sha256hex(buf).then(function (sha) {
        st.sha256 = sha;
        st.md5 = md5hex(bytes);
        if (judged.ok && ctx.gate.sha256 && sha.toLowerCase() !== String(ctx.gate.sha256).toLowerCase()) {
          judged.ok = false;
          st.reason = '整包 SHA-256 与收录记录对不上。请确认取自官方渠道。';
        }
        return judged;
      });
    }).then(function (judged) {
      var st = judged.st;
      el._sliceState = st;
      el._sliceOk = judged.ok;
      fillSliceBody(sliceBoard(ctx.f, judged.ok ? 'ok' : 'bad', st, ctx.gate));
    }).catch(function (err) {
      fillSliceBody(sliceBoard(ctx.f, 'bad', { reason: '读文件失败：' + err.message, name: file.name }, ctx.gate));
    });
  }

  function downloadSlicePack() {
    var el = document.getElementById('slice-gate');
    var ctx = sliceCtx(el);
    if (!ctx || !el._sliceOk) return;
    var st = el._sliceState || {};
    var name = ctx.f.name || ctx.f.norm;
    var zipName = 'wenfeng-slice-' + ctx.f.norm + '-proto.zip';
    var readme =
      '文风切片包 · ' + name + '\n' +
      '样张包，非正式切片。没有把原件再切一遍。\n\n' +
      '核验文件：' + (st.name || '') + '\n' +
      '体积：' + (st.sizeWord || '') + '（预检）\n' +
      'MD5：' + (st.md5 || '') + '\n' +
      'SHA-256：' + (st.sha256 || '') + '\n\n' +
      '生产环境用 SHA-256 对照本站收录；厂商若公布 MD5 则并列。\n' +
      '本站不提供原件。文派不另授权利。\n\n' +
      '使用：解压到主题或 wp-content/fonts，引入 fonts.css。\n' +
      '保留注释里的 https://wenfeng.org/license\n' +
      '不要把 cn.windfonts.com 的 woff2 当源文件。\n';
    var css =
      '/* 文风切片包 · ' + name + '\n' +
      '   样张：无真实 woff2。生产环境此处为子集文件。\n' +
      '   ' + COMMENT.replace(/^<!--\s*|\s*-->$/g, '') + '\n' +
      '*/\n' +
      '@font-face {\n' +
      '  font-family: "' + (ctx.f.en || name) + '";\n' +
      '  font-weight: 400;\n' +
      '  font-display: swap;\n' +
      '  src: url("./woff2/' + ctx.f.norm + '-Regular.woff2") format("woff2");\n' +
      '}\n';
    var blob = new Blob([zipStore([
      { name: 'README.txt', body: readme },
      { name: 'fonts.css', body: css },
      { name: 'COMMENT.txt', body: COMMENT + '\n' },
      { name: 'woff2/README.txt', body: '生产环境在此放置切片 woff2。本样张包不含真实字形。\n' }
    ])], { type: 'application/zip' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  var EXIT_ALLOW = ['windfonts.com', 'wenfeng.org', 'motucloud.com', 'weixiaoduo.com',
    'feibisi.com', 'feicode.com', 'wenpai.org', 'wenpai.net'];
  function hostAllowed(host) {
    host = String(host || '').toLowerCase();
    for (var i = 0; i < EXIT_ALLOW.length; i++) {
      var d = EXIT_ALLOW[i];
      if (host === d || host.slice(-(d.length + 1)) === '.' + d) return true;
    }
    return false;
  }
  function exitSkipActive(host) {
    try { return sessionStorage.getItem('wf-exit-skip:' + host) === '1'; }
    catch (e) { return false; }
  }
  function closeExitLayer() {
    var layer = document.getElementById('wf-exit-layer');
    if (layer) layer.remove();
  }
  function showExitConfirm(host, url) {
    closeExitLayer();
    var layer = document.createElement('div');
    layer.id = 'wf-exit-layer';
    layer.className = 'exit-layer';
    layer.innerHTML =
      '<div class="exit-panel" role="dialog" aria-modal="true" aria-label="即将离开文风">' +
        '<p class="exit-kicker">即将离开文风</p>' +
        '<p class="exit-host">你将访问第三方网站「' + esc(host) + '」。</p>' +
        '<p class="exit-url">' + esc(url) + '</p>' +
        '<label class="exit-skip"><input type="checkbox" id="wf-exit-skip-check">' +
          '本会话内不再询问「' + esc(host) + '」</label>' +
        '<p class="exit-acts">' +
          '<button type="button" class="btn" data-exit-stay>留在本站</button>' +
          '<button type="button" class="btn btn-ink" data-exit-go>继续前往</button>' +
        '</p>' +
      '</div>';
    document.body.appendChild(layer);
    layer.addEventListener('click', function (ev) {
      if (ev.target === layer || ev.target.closest('[data-exit-stay]')) {
        closeExitLayer();
        return;
      }
      if (ev.target.closest('[data-exit-go]')) {
        var box = document.getElementById('wf-exit-skip-check');
        if (box && box.checked) {
          try { sessionStorage.setItem('wf-exit-skip:' + host, '1'); } catch (e) {}
        }
        closeExitLayer();
        window.open(url, '_blank', 'noopener');
      }
    });
  }
  function guardExits() {
    if (document._wfExitBound) return;
    document._wfExitBound = true;
    document.addEventListener('click', function (ev) {
      if (ev.defaultPrevented || ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      if (!ev.target || !ev.target.closest) return;
      var a = ev.target.closest('a[href]');
      if (!a || a.hasAttribute('download')) return;
      var href = a.getAttribute('href') || '';
      if (!/^https?:\/\//i.test(href)) return;
      var u;
      try { u = new URL(href, location.href); } catch (e) { return; }
      if (u.host === location.host) return;
      if (hostAllowed(u.hostname)) return;
      if (exitSkipActive(u.hostname)) return;
      ev.preventDefault();
      showExitConfirm(u.hostname, u.href);
    }, true);
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closeExitLayer();
    });
  }

  function handleClick(ev) {
    var modeBtn = ev.target.closest('[data-view-switch] [data-mode]');
    if (modeBtn) {
      setView(modeBtn.getAttribute('data-mode'));
      return;
    }
    if (ev.target.closest('[data-theme-toggle]')) toggleTheme();
    if (ev.target.closest('[data-print-cert]')) {
      ev.preventDefault();
      window.print();
      return;
    }
    var dpdf = ev.target.closest('[data-download-pdf]');
    if (dpdf) {
      ev.preventDefault();
      var qs = [];
      if (dpdf.getAttribute('data-holder')) qs.push('holder=' + encodeURIComponent(dpdf.getAttribute('data-holder')));
      if (dpdf.getAttribute('data-uscc')) qs.push('uscc=' + encodeURIComponent(dpdf.getAttribute('data-uscc')));
      if (dpdf.getAttribute('data-usage')) qs.push('usage=' + encodeURIComponent(dpdf.getAttribute('data-usage')));
      window.location.href = '/api/v1/certs/' + encodeURIComponent(dpdf.getAttribute('data-norm')) +
        '/pdf' + (qs.length ? '?' + qs.join('&') : '');
      return;
    }
    var dl = ev.target.closest('[data-download-cert]');
    if (dl) {
      ev.preventDefault();
      var norm = dl.getAttribute('data-norm') || '';
      var holder = dl.getAttribute('data-holder') || '';
      var url = '/api/v1/certs/' + encodeURIComponent(norm);
      if (holder) url += '?holder=' + encodeURIComponent(holder);
      fetch(url).then(function (r) { return r.json(); }).then(function (cert) {
        var blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (cert.norm || norm || 'font') + '-wenfeng-attest.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
      });
    }
    var copyBtn = ev.target.closest('[data-copy]');
    if (copyBtn) {
      ev.preventDefault();
      var text = copyBtn.getAttribute('data-copy') || '';
      var done = function () {
        copyBtn.textContent = '已复制';
        setTimeout(function () { copyBtn.textContent = '复制地址'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          window.prompt('复制地址', text);
        });
      } else window.prompt('复制地址', text);
      return;
    }
    if (ev.target.closest('[data-slice-download]')) {
      ev.preventDefault();
      downloadSlicePack();
      return;
    }
    if (ev.target.closest('[data-slice-reset]')) {
      ev.preventDefault();
      var gateEl = document.getElementById('slice-gate');
      var ctx = sliceCtx(gateEl);
      if (!ctx) return;
      gateEl._sliceOk = false;
      gateEl._sliceState = null;
      fillSliceBody(sliceBoard(ctx.f, 'idle', null, ctx.gate));
    }
  }

  function handleSubmit(ev) {
    var lk = ev.target.closest('[data-cert-lookup]');
    if (lk) {
      ev.preventDefault();
      var lfd = new FormData(lk);
      var ls = String(lfd.get('s') || '').trim();
      var lholder = String(lfd.get('holder') || '').trim();
      var box = document.getElementById('lookup-result');
      if (!box) return;
      if (!ls || !lholder) {
        box.hidden = false;
        box.innerHTML = '<p class="count-line">证明编号和持证单位名称都要填。</p>';
        return;
      }
      fetch('/api/v1/certs/lookup?s=' + encodeURIComponent(ls) + '&holder=' + encodeURIComponent(lholder))
        .then(function (r) {
          return r.json().then(function (j) { return { status: r.status, j: j }; });
        })
        .then(function (res) {
          box.hidden = false;
          if (res.status === 200) {
            var j = res.j;
            var usage = (j.usage && j.usage.length) ? j.usage.join('、') : '未申报';
            box.innerHTML =
              '<div class="lookup-card">' +
                '<p class="kicker">查验通过</p>' +
                '<h2>' + esc(j.catalogName) + '</h2>' +
                '<dl class="lookup-facts">' +
                  '<div><dt>证明编号</dt><dd>' + esc(j.serial) + '</dd></div>' +
                  '<div><dt>持证单位</dt><dd>' + esc(j.holder) + '</dd></div>' +
                  '<div><dt>生成日期</dt><dd>' + esc(String(j.issuedAt || '').slice(0, 10)) + '</dd></div>' +
                  '<div><dt>累计下载</dt><dd>' + parseInt(j.downloads || 0, 10) + ' 次</dd></div>' +
                  '<div><dt>许可协议</dt><dd>' + esc(j.spdx || '') + '</dd></div>' +
                  '<div><dt>申报用途</dt><dd>' + esc(usage) + '</dd></div>' +
                '</dl>' +
                '<p class="acts"><a class="btn btn-ink" href="' + esc(j.href) + '?holder=' + encodeURIComponent(j.holder || '') + '">查看证书</a></p>' +
              '</div>';
          } else if (res.j && res.j.error === 'holder_mismatch') {
            box.innerHTML = '<p class="count-line">持证单位名称与编号不符，两项须与证明一致。</p>';
          } else {
            box.innerHTML = '<p class="count-line">没有这一份证明。核对编号后重试，或从证明原件上抄录编号。</p>';
          }
        })
        .catch(function (err) {
          box.hidden = false;
          box.innerHTML = '<p class="count-line">查验读不出来：' + esc(err.message) + '</p>';
        });
      return;
    }
    var gen = ev.target.closest('[data-attest-gen]');
    if (gen) {
      ev.preventDefault();
      var fd = new FormData(gen);
      var norm = String(fd.get('norm') || '');
      var holder = String(fd.get('holder') || '').trim();
      var uscc = String(fd.get('uscc') || '').trim();
      var usage = Array.prototype.map.call(
        gen.querySelectorAll('input[name="usage"]:checked'),
        function (i) { return i.value; }
      );
      if (!norm) return;
      var params = [];
      if (holder) params.push('holder=' + encodeURIComponent(holder));
      if (uscc) params.push('uscc=' + encodeURIComponent(uscc));
      if (usage.length) params.push('usage=' + encodeURIComponent(usage.join(',')));
      location.href = '/attest/' + encodeURIComponent(norm) + '/' +
        (params.length ? '?' + params.join('&') : '');
      return;
    }
    var vf = ev.target.closest('[data-attest-verify]');
    if (!vf) return;
    ev.preventDefault();
    var ta = vf.querySelector('textarea');
    var out = document.getElementById('verify-out');
    var raw = (ta && ta.value || '').trim();
    function show(ok, title, body) {
      if (!out) return;
      out.hidden = false;
      out.className = 'verify-out ' + (ok ? 'is-ok' : 'is-bad');
      out.innerHTML = '<p class="kicker">' + (ok ? '核对通过' : '核对失败') + '</p>' +
        '<h2>' + esc(title) + '</h2>' +
        (body ? '<p>' + body + '</p>' : '');
    }
    var payload;
    try { payload = JSON.parse(raw); }
    catch (err) {
      show(false, 'JSON 读不出来', esc(err.message));
      return;
    }
    fetch('/api/v1/certs/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res.valid) {
        show(true, res.catalogName || '核验记录',
          '编号 ' + esc(res.serial || '') +
          ' · 签发 ' + esc((res.issuer && res.issuer.legalName) || ''));
      } else {
        show(false, res.reason || res.error || '无效', '签名对不上或正文被改过。');
      }
    }).catch(function (err) {
      show(false, '接口失败', esc(err.message));
    });
  }

  function mount(data, licenses) {
    applyTheme();
    applyView(view());
    var fonts = data.fonts || [];
    var route = parsePath();
    if (route.page === 'attest' || route.page === 'attests' || route.page === 'attest-ledger') {
      if (!document.getElementById('wf-shs-css')) {
        var shs = document.createElement('link');
        shs.id = 'wf-shs-css';
        shs.rel = 'stylesheet';
        shs.href = '/assets/shs/regular.css';
        document.head.appendChild(shs);
        var shsb = document.createElement('link');
        shsb.id = 'wf-shs-css-b';
        shsb.rel = 'stylesheet';
        shsb.href = '/assets/shs/bold.css';
        document.head.appendChild(shsb);
        var shei = document.createElement('link');
        shei.id = 'wf-shsans-css';
        shei.rel = 'stylesheet';
        shei.href = '/assets/shsans/bold.css';
        document.head.appendChild(shei);
      }
    }
    var app = document.getElementById('app');

    function extraTitle(innerExtra) {
      var extra = innerExtra || '';
      if (!extra && (route.page === 'font' || route.page === 'license' || route.page === 'slice')) {
        var fx = findFont(fonts, route.id);
        extra = fx ? wfName(fx) : '';
      } else if (!extra && route.page === 'foundry') {
        var gs = foundriesOf(fonts);
        for (var j = 0; j < gs.length; j++) if (gs[j].slug === route.id) extra = gs[j].name;
      }
      titles(route, extra);
    }

    function paint(inner, extra) {
      document.body.className = 'page-' + route.page;
      document.body.setAttribute('data-site', 'org');
      app.innerHTML = chrome(route) + '<main>' + inner + '</main>' + footer();
      lazyPreviews();
      if (!app._wfBound) {
        app._wfBound = true;
        app.addEventListener('click', handleClick);
        app.addEventListener('submit', handleSubmit);
        app.addEventListener('change', function (ev) {
          var pick = ev.target.closest('[data-slice-pick]');
          if (pick && pick.value) {
            location.href = '/slice/' + encodeURIComponent(pick.value) + '/';
            return;
          }
          var input = ev.target.closest('[data-slice-input]');
          if (!input || !input.files || !input.files[0]) return;
          runSliceFile(input.files[0]);
        });
        app.addEventListener('dragover', function (ev) {
          if (!ev.target.closest('[data-slice-drop]')) return;
          ev.preventDefault();
          ev.dataTransfer.dropEffect = 'copy';
          ev.target.closest('[data-slice-drop]').classList.add('is-over');
        });
        app.addEventListener('dragleave', function (ev) {
          var z = ev.target.closest('[data-slice-drop]');
          if (z) z.classList.remove('is-over');
        });
        app.addEventListener('drop', function (ev) {
          var z = ev.target.closest('[data-slice-drop]');
          if (!z) return;
          ev.preventDefault();
          z.classList.remove('is-over');
          var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
          if (file) runSliceFile(file);
        });
      }
      extraTitle(extra);
    }

    var inner = '';
    if (route.page === 'home') inner = home(fonts);
    else if (route.page === 'list') inner = listPage(fonts, route);
    else if (route.page === 'font') {
      var f = findFont(fonts, route.id);
      if (f) inner = renderFont(f, f._licText || {}, fonts);
      else { inner = notFound('没有这一款'); route.page = 'notfound'; }
    } else if (route.page === 'licenses') inner = licensesPage(fonts, route);
    else if (route.page === 'license') {
      var fl = findFont(fonts, route.id);
      if (fl) inner = licensePage(fl, fl._licText || {});
      else { inner = notFound('没有原文'); route.page = 'notfound'; }
    } else if (route.page === 'slices') inner = slicesPage(fonts);
    else if (route.page === 'slice') {
      var sf = findFont(fonts, route.id);
      if (sf) inner = slicePage(sf, fonts);
      else { inner = notFound('没有这一款'); route.page = 'notfound'; }
    } else if (route.page === 'foundries') inner = foundriesPage(foundriesOf(fonts));
    else if (route.page === 'foundry') {
      var groups = foundriesOf(fonts);
      var g = null;
      for (var i = 0; i < groups.length; i++) if (groups[i].slug === route.id) g = groups[i];
      if (g) inner = foundryPage(g);
      else { inner = notFound('没有这个厂商'); route.page = 'notfound'; }
    } else if (route.page === 'use') inner = usePage();
    else if (route.page === 'about') inner = aboutPage();
    else if (route.page === 'how') inner = howPage();
    else if (route.page === 'legal') inner = legalPage();
    else if (route.page === 'attest-verify') inner = attestVerifyPage();
    else if (route.page === 'v') inner = lookupPage();
    else if (route.page === 'attest-ledger') {
      paint('<div class="container"><div class="page-state is-fill"><p class="kicker">核验</p><h1>正在读台账</h1></div></div>');
      apiJson('/api/v1/certs/issued').then(function (data) {
        paint(ledgerView(data, route));
      }).catch(function (err) {
        paint(err && err.serviceDown ? serviceDown() : notFound('台账读不出来：' + err.message));
      });
      return;
    } else if (route.page === 'attests') {
      paint('<div class="container"><div class="page-state is-fill"><p class="kicker">核验</p><h1>正在列出可核验的字</h1></div></div>');
      apiJson('/api/v1/certs').then(function (list) {
        paint(attestIndex(list, fonts));
      }).catch(function (err) {
        paint(err && err.serviceDown ? serviceDown() : notFound('核验目录读不出来：' + err.message));
      });
      return;
    } else if (route.page === 'attest') {
      var af = findFont(fonts, route.id);
      if (!af) {
        inner = notFound('没有这一款');
        route.page = 'notfound';
        paint(inner);
        return;
      }
      if (!canAttest(af)) {
        paint(attestPage({
          error: 'not_attestable',
          reason: attestBlockReason(af)
        }, route), '');
        return;
      }
      paint('<div class="container"><div class="page-state is-fill"><p class="kicker">核验</p><h1>正在出证</h1></div></div>');
      var certUrl = '/api/v1/certs/' + encodeURIComponent(route.id);
      var certParams = [];
      if (route.holder) certParams.push('holder=' + encodeURIComponent(route.holder));
      if (route.usage) certParams.push('usage=' + encodeURIComponent(route.usage));
      if (route.uscc) certParams.push('uscc=' + encodeURIComponent(route.uscc));
      if (certParams.length) certUrl += '?' + certParams.join('&');
      apiJson(certUrl).then(function (cert) {
        paint(attestPage(cert, route), cert.catalogName || '');
      }).catch(function (err) {
        paint(err && err.serviceDown ? serviceDown() : notFound('核验读不出来：' + err.message));
      });
      return;
    } else {
      inner = notFound('没有这一页');
      route.page = 'notfound';
    }

    paint(inner);
  }

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest('[data-face-next]');
    if (!btn) return;
    ev.preventDefault();
    var fontsAll = window.__wfFonts || [];
    var show = showcaseOf(fontsAll);
    if (show.length < 2) return;
    var live = document.querySelector('[data-hero-live]');
    if (!live) return;
    var cur = live.getAttribute('data-face-norm');
    var idx = 0;
    for (var i = 0; i < show.length; i++) if (show[i].norm === cur) idx = i;
    var next = show[(idx + 1) % show.length];
    live.className = 'live t-' + next.norm;
    live.setAttribute('data-face-norm', next.norm);
    live.setAttribute('data-face-family', next.family || '');
    applyFontFace(next.norm, next.family);
    var nameA = document.querySelector('.live-caption .now');
    if (nameA) { nameA.textContent = wfName(next); nameA.setAttribute('href', '/source/' + next.norm + '/'); }
    var takeBtn = document.querySelector('[data-hero-take]');
    if (takeBtn) { takeBtn.setAttribute('href', '/source/' + next.norm + '/'); takeBtn.textContent = '拿走' + wfName(next); }
  });

  guardExits();

  Promise.all([
    fetch('/samples.json').then(function (r) { return r.json(); }),
    fetch('/assets/icons.svg').then(function (r) { return r.text(); }).catch(function () { return ''; })
  ]).then(function (pair) {
    var data = pair[0];
    window.__wfFonts = data.fonts || [];
    if (pair[1]) {
      var holder = document.createElement('div');
      holder.setAttribute('aria-hidden', 'true');
      holder.style.display = 'none';
      holder.innerHTML = pair[1];
      document.body.insertBefore(holder, document.body.firstChild);
    }
    var finish = function () { mount(data, {}); };
    // 详情/许可/切片页按需补全量与许可正文，其余页只吃瘦目录
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var page0 = parts[0] || 'home';
    if (parts[1] && (page0 === 'source' || page0 === 'license' || page0 === 'slice')) {
      fontFull(parts[1], data.fonts || []).then(function (f) {
        if (page0 !== 'license' || !f) { finish(); return; }
        fetch('/data/license-text/' + encodeURIComponent(f.norm) + '.json')
          .then(function (r) { return r.ok ? r.json() : null; })
          .catch(function () { return null; })
          .then(function (t) {
            if (t) f._licText = t;
            finish();
          });
      });
      return;
    }
    finish();
  }).catch(function (err) {
    document.getElementById('app').innerHTML = '<p style="padding:2rem">数据加载失败：' + esc(err.message) + '</p>';
  });
})();
