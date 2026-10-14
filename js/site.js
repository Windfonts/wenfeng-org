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
      if (!map[slug]) map[slug] = { slug: slug, name: f.foundry || '作者不详', fonts: [] };
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
    else if (parts[0] === 'gap') page = 'gap';
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
          '<a class="wordmark" href="/"><span class="mark" aria-hidden="true"></span><span>文风</span><span class="wm-sub">· 开源</span></a>' +
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
            '<a class="wordmark" href="/"><span class="mark" aria-hidden="true"></span><span>文风</span><span class="wm-sub">· 开源</span></a>' +
            '<p>源文件、许可原文、缺字反馈。开源字体直接下载，其余核验或去出处。不做样张墙，不当 CDN。</p>' +
          '</div>' +
          '<div class="site-foot-col">' +
            '<h2>办事</h2>' +
            '<a href="/license">查授权</a>' +
            '<a href="/source">下源文件</a>' +
            '<a href="/gap">报缺字</a>' +
            '<a href="/slice">切片</a>' +
          '</div>' +
          '<div class="site-foot-col">' +
            '<h2>核验</h2>' +
            '<a href="/attest">授权证明</a>' +
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
          '<p>文派（广州）科技有限公司 · 文风开源</p>' +
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

  function countTextFull(fonts) {
    return fonts.filter(function (f) {
      return (f.license || {}).textState === 'full';
    }).length;
  }

  // 镜像仓库数不在 samples.json；与 export-report coverage.source_mirrors 对齐（2026-10-01）
  var HOME_MIRROR_N = 132;

  function home(fonts) {
    var n = fonts.length;
    var nSource = countOffer(fonts, 'source');
    var nFull = countTextFull(fonts);
    var nMirror = HOME_MIRROR_N;
    var gen = '2026-10-01';
    return '' +
      '<section class="hv4-hero">' +
        '<div class="container">' +
          '<p class="hv4-crumb" aria-label="路径"><span class="for-design">wenfeng.org</span><span class="for-dev mono">wenfeng.org /</span></p>' +
          '<div class="hv4-display">' +
            '<h1>源文件</h1>' +
            '<p class="hv4-lead for-design">开源字体的源文件和许可原文。<br class="hv4-br" />能下载的直接下载，不允许再分发的核验后领取切片包。</p>' +
            '<p class="hv4-lead for-dev mono">/license · /source · /gap<br class="hv4-br" /> samples.json · offer · textState · GET /api/v1/fonts · /attest</p>' +
          '</div>' +
          '<div class="hv4-split">' +
            '<div class="hv4-tasks" role="list">' +
              '<a class="hv4-task is-ink" href="/license" role="listitem">' +
                '<span class="idx" aria-hidden="true">01</span>' +
                '<span class="t-ico" aria-hidden="true"><svg class="icon"><use href="/assets/icons.svg#i-shield"></use></svg></span>' +
                '<span class="body">' +
                  '<span class="t-t">查授权</span>' +
                  '<span class="t-d for-design">许可原文与三态结论</span>' +
                  '<span class="t-d for-dev mono">/license · textState</span>' +
                '</span>' +
                '<span class="arrow" aria-hidden="true"><svg class="icon"><use href="/assets/icons.svg#i-arrow-right"></use></svg></span>' +
              '</a>' +
              '<a class="hv4-task" href="/source" role="listitem">' +
                '<span class="idx" aria-hidden="true">02</span>' +
                '<span class="t-ico" aria-hidden="true"><svg class="icon"><use href="/assets/icons.svg#i-download"></use></svg></span>' +
                '<span class="body">' +
                  '<span class="t-t">下源文件</span>' +
                  '<span class="t-d for-design">本站下载或官方下载，逐款标注</span>' +
                  '<span class="t-d for-dev mono">/source · offer</span>' +
                '</span>' +
                '<span class="arrow" aria-hidden="true"><svg class="icon"><use href="/assets/icons.svg#i-arrow-right"></use></svg></span>' +
              '</a>' +
              '<a class="hv4-task" href="/gap" role="listitem">' +
                '<span class="idx" aria-hidden="true">03</span>' +
                '<span class="t-ico" aria-hidden="true"><svg class="icon"><use href="/assets/icons.svg#i-edit"></use></svg></span>' +
                '<span class="body">' +
                  '<span class="t-t">报缺字</span>' +
                  '<span class="t-d for-design">缺字形 / 缺收录 / 勘误</span>' +
                  '<span class="t-d for-dev mono">/gap · 提交未接</span>' +
                '</span>' +
                '<span class="arrow" aria-hidden="true"><svg class="icon"><use href="/assets/icons.svg#i-arrow-right"></use></svg></span>' +
              '</a>' +
            '</div>' +
            '<aside class="hv4-aside" aria-label="目录状态怎么看">' +
              '<div class="hv4-aside-block hv4-legend">' +
                '<p class="hv4-aside-label">目录状态</p>' +
                '<nav class="hv4-legend-rows" aria-label="按状态筛选目录">' +
                  '<a class="hv4-legend-row" href="/source?offer=source"><span class="l-t">本站下载</span><span class="l-d for-design">源文件在本站，进条目直接下载</span><span class="l-d for-dev mono">offer=source</span></a>' +
                  '<a class="hv4-legend-row" href="/source?offer=jump"><span class="l-t">官方下载</span><span class="l-d for-design">本站不留文件，去作者或厂商的发布处</span><span class="l-d for-dev mono">offer=jump</span></a>' +
                  '<a class="hv4-legend-row" href="/source?offer=pending"><span class="l-t">暂无下载</span><span class="l-d for-design">许可已核实，源文件包还没上架</span><span class="l-d for-dev mono">offer=pending · textState=full</span></a>' +
                  '<a class="hv4-legend-row" href="/source?offer=pending"><span class="l-t">待核实</span><span class="l-d for-design">许可原文还没有核对记录</span><span class="l-d for-dev mono">offer=pending · textState≠full</span></a>' +
                  '<a class="hv4-legend-row" href="/source?offer=missing"><span class="l-t">未收录</span><span class="l-d for-design">镜像还没收到这款，先去上游仓库或店面</span><span class="l-d for-dev mono">offer=missing</span></a>' +
                '</nav>' +
              '</div>' +
            '</aside>' +
            '<form class="hv4-search" action="/source" method="get" role="search">' +
              '<label class="sr-only" for="q">搜索字体</label>' +
              '<span class="hv4-search-kicker" aria-hidden="true">检索</span>' +
              '<input id="q" name="q" type="search" placeholder="中文名、英文、短码、厂商…" autocomplete="off" />' +
              '<button class="btn" type="submit">' +
                '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-search"></use></svg>' +
                '搜索' +
              '</button>' +
            '</form>' +
          '</div>' +
          '<div class="hv4-stats" aria-label="目录概况">' +
            '<div class="hv4-stat">' +
              '<b>' + n + '</b>' +
              '<span class="for-design">已收录</span>' +
              '<span class="for-dev mono">fonts[]</span>' +
            '</div>' +
            '<div class="hv4-stat">' +
              '<b>' + nSource + '</b>' +
              '<span class="for-design">本站下载</span>' +
              '<span class="for-dev mono">offer=source</span>' +
            '</div>' +
            '<div class="hv4-stat">' +
              '<b>' + nFull + '</b>' +
              '<span class="for-design">许可全文</span>' +
              '<span class="for-dev mono">textState=full</span>' +
            '</div>' +
            '<div class="hv4-stat">' +
              '<b>' + nMirror + '</b>' +
              '<span class="for-design">镜像仓库</span>' +
              '<span class="for-dev mono">mirror</span>' +
            '</div>' +
            '<p class="hv4-stats-cap for-design">目录数据 · ' + gen + ' 更新</p>' +
            '<p class="hv4-stats-cap for-dev mono">GET /api/v1/fonts · samples.json / export-report · ' + gen + ' · not live</p>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="hv4-about" id="about" aria-label="关于本站">' +
        '<div class="container hv4-about-grid">' +
          '<div class="hv4-about-title">' +
            '<p class="kicker for-design">关于本站</p>' +
            '<p class="kicker for-dev mono">route /</p>' +
            '<h2 class="for-design">查授权、下源文件、<br />报缺字。</h2>' +
            '<h2 class="for-dev mono">/license · /source<br />/gap · /attest</h2>' +
          '</div>' +
          '<div class="hv4-about-body">' +
            '<p class="for-design">文风收录开源字体的源文件和许可原文，授权结论逐款核对原文。缺字形、缺收录或发现勘误，到报缺字页写一条短笺。提交还没接上，这一下不会送出。</p>' +
            '<p class="for-dev mono">data-view · .for-design / .for-dev · chrome() · GET /api/v1/fonts · samples.json</p>' +
            '<p class="acts">' +
              '<a class="btn btn-ink" href="/license">' +
                '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-shield"></use></svg>' +
                '查授权' +
              '</a>' +
              '<a class="btn" href="/source">' +
                '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-download"></use></svg>' +
                '打开目录' +
              '</a>' +
              '<a class="btn" href="/how">怎么核</a>' +
            '</p>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function indexOfferKey(f) {
    var o = offerOf(f);
    if (o === 'pending') {
      return ((f.license || {}).textState === 'full') ? 'later' : 'check';
    }
    if (o === 'source' || o === 'jump' || o === 'missing') return o;
    return 'jump';
  }

  function matchIndex(f, offer) {
    if (!offer || offer === 'all') return true;
    if (offer === 'pending') return offerOf(f) === 'pending';
    if (offer === 'slice') return byOffer(f, 'slice');
    return indexOfferKey(f) === offer;
  }

  function licShort(f) {
    var lic = f.license || {};
    var spdx = lic.spdx || licenseSpdx(f.licenseName);
    if (spdx) return spdx;
    var n = f.licenseName || '';
    if (!n || n === '待核实') return '许可空';
    return n;
  }

  function indexAct(f) {
    var k = indexOfferKey(f);
    var href = '/source/' + esc(f.norm) + '/';
    if (k === 'source') return { href: href, label: '下载', ink: true };
    if (k === 'jump') return { href: href, label: '去出处', ink: false };
    if (k === 'missing') return { href: '/gap', label: '报缺', ink: false };
    return { href: href, label: '看条目', ink: false };
  }

  function indexPillHref(id, q) {
    var parts = [];
    if (id && id !== 'all') parts.push('offer=' + encodeURIComponent(id));
    if (q) parts.push('q=' + encodeURIComponent(q));
    return '/source' + (parts.length ? '?' + parts.join('&') : '');
  }

  function listPage(fonts, route) {
    var offer = route.offer || 'all';
    var list = fonts.filter(function (f) { return matchQ(f, route.q) && matchIndex(f, offer); });
    try {
      var coll = new Intl.Collator('zh-Hans-CN');
      list.sort(function (a, b) {
        return coll.compare(a.name || '', b.name || '') || coll.compare(a.norm || '', b.norm || '');
      });
    } catch (e) {}
    var pills = [
      { id: 'all', label: '全部' },
      { id: 'source', label: '本站下载' },
      { id: 'jump', label: '官方下载' },
      { id: 'later', label: '暂无下载' },
      { id: 'check', label: '待核实' },
      { id: 'missing', label: '未收录' }
    ];
    var pillHtml = pills.map(function (k) {
      var on = (offer === 'pending' && (k.id === 'later' || k.id === 'check')) || k.id === offer;
      return '<a href="' + indexPillHref(k.id, route.q) + '"' + (on ? ' class="is-on"' : '') + '>' + k.label + '</a>';
    }).join('');
    var rows = list.map(function (f) {
      var act = indexAct(f);
      var textState = (f.license || {}).textState || '—';
      var maker = f.foundry || '作者不详';
      return '<li class="sd2b-row">' +
        '<span class="norm">' + esc(f.norm) + '</span>' +
        '<a class="name" href="/source/' + esc(f.norm) + '/">' + esc(wfName(f)) + '</a>' +
        '<span class="meta for-design">' + esc(licShort(f)) + ' · ' + esc(maker) + ' · ' + esc(statusWord(f)) + '</span>' +
        '<span class="meta for-dev mono">' + esc(f.norm) + ' · offer=' + esc(offerOf(f)) + ' · textState=' + esc(textState) + '</span>' +
        '<a class="go' + (act.ink ? ' is-ink' : '') + '" href="' + act.href + '">' + esc(act.label) + '</a>' +
      '</li>';
    }).join('');
    var empty = list.length
      ? ''
      : '<p class="sd2b-empty">没有这个名字。换个短码，或看<a href="/source">全部目录</a>。</p>';
    var qNote = route.q ? ' · 「' + esc(route.q) + '」' : '';
    var footD = '按短码或名字找。授权结论在查授权页，这里只标状态。对照别名 <a href="/source-v2b.html">source-v2b</a>。';
    var footV = 'listPage · sd-v2b · /source' + (route.q ? ' · q=' + esc(route.q) : '') + (offer !== 'all' ? ' · offer=' + esc(offer) : '');
    return '<section class="sd-hero">' +
      '<div class="container">' +
        '<p class="sd-crumb" aria-label="路径">' +
          '<span class="for-design">wenfeng.org / 目录</span>' +
          '<span class="for-dev mono">wenfeng.org /source · sd-v2b</span>' +
        '</p>' +
        '<div class="sd-display">' +
          '<div>' +
            '<p class="sd-kicker for-design">源文件目录</p>' +
            '<p class="sd-kicker for-dev mono">ia · name index</p>' +
            '<h1 class="for-design">索引</h1>' +
            '<h1 class="for-dev mono">/source</h1>' +
          '</div>' +
          '<p class="sd-lead for-design">全部字体的名字索引，一行一款。<br class="sd-br" />按状态筛选，点动作进条目。</p>' +
          '<p class="sd-lead for-dev mono">norm · name · offer · action<br class="sd-br" /> aside = boundary</p>' +
        '</div>' +
        '<form class="sd-search" action="/source" method="get" role="search">' +
          '<span class="sd-search-kicker" aria-hidden="true">检索</span>' +
          '<label class="sr-only" for="q">搜索字体</label>' +
          '<input id="q" name="q" type="search" value="' + esc(route.q) + '" placeholder="中文名、英文、短码、厂商…" autocomplete="off" />' +
          (offer && offer !== 'all' ? '<input type="hidden" name="offer" value="' + esc(offer) + '">' : '') +
          '<button class="btn btn-ink" type="submit">' +
            '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-search"></use></svg>' +
            '搜索' +
          '</button>' +
        '</form>' +
        '<div class="sd2b-split">' +
          '<div>' +
            '<nav class="sd2b-pills" aria-label="按状态筛选">' + pillHtml + '</nav>' +
            '<p class="sd2b-count"><span>' + list.length + '</span> 款' + qNote + (offer !== 'all' || route.q ? ' · 全部 ' + fonts.length + ' 款' : '') + '</p>' +
            '<div class="sd2b-legend" aria-hidden="true">' +
              '<span>短码</span><span>名字</span>' +
              '<span class="for-design">信息</span><span class="for-dev">offer</span><span>动作</span>' +
            '</div>' +
            (rows ? '<ul class="sd2b-rows">' + rows + '</ul>' : '') +
            empty +
          '</div>' +
          '<aside class="sd2b-aside" aria-label="这一站管什么">' +
            '<p class="label for-design">这一站</p>' +
            '<p class="label for-dev mono">boundary</p>' +
            '<div class="sd2b-kv">' +
              '<div><span class="k for-design">源文件</span><span class="k for-dev">files</span><span class="v">本站有的直接下载，不允许再分发的不代发</span></div>' +
              '<div><span class="k for-design">许可</span><span class="k for-dev">/license</span><span class="v">结论在查授权页，这张表只标状态</span></div>' +
              '<div><span class="k for-design">缺字</span><span class="k for-dev">/gap</span><span class="v">缺字形、缺收录、勘误，都从这一个入口报</span></div>' +
              '<div><span class="k for-design">工具</span><span class="k for-dev">/slice</span><span class="v">切片包和核验，不做托管分发</span></div>' +
              '<div><span class="k for-design">不是</span><span class="k for-dev">not</span><span class="v">网页字体 CDN、样张墙、店面选字</span></div>' +
            '</div>' +
            '<p class="note for-design">筛选作用于整张目录。侧栏写的是这一站的边界，不是某一款的状态。</p>' +
            '<p class="note for-dev mono">offer · textState · samples.json</p>' +
          '</aside>' +
        '</div>' +
        '<p class="sd-footnote for-design">' + footD + '</p>' +
        '<p class="sd-footnote for-dev mono">' + footV + '</p>' +
      '</div>' +
    '</section>';
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
      links += '<a href="' + esc(f.shop) + '"' + hrefAttrs(f.shop) + '>去店面用</a>';
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

  function upstreamHref(f) {
    var file = fileOf(f, 'upstream');
    if (file && file.href) return file.href;
    var mirror = (f.mirror || {}).upstream;
    if (mirror) return mirror;
    var jump = originJumps(f)[0];
    return jump && jump.href ? jump.href : '';
  }

  function upstreamDossier(href) {
    if (!href) return '—';
    try {
      var u = new URL(href);
      var host = u.host.replace(/^www\./, '');
      var parts = u.pathname.split('/').filter(Boolean);
      if (host === 'github.com' && parts.length >= 2) return parts[0] + '/' + parts[1];
      if (parts.length) return host + '/' + parts[0];
      return host || href;
    } catch (e) { return href; }
  }

  function upstreamDev(href) {
    if (!href) return '∅';
    try {
      var u = new URL(href);
      var host = u.host.replace(/^www\./, '');
      var parts = u.pathname.split('/').filter(Boolean);
      if (host === 'github.com' && parts.length) return 'github.com/' + parts[0];
      return host || href;
    } catch (e) { return href; }
  }

  function fontTextCell(f) {
    var lic = f.license || {};
    var ts = String(lic.textState || '');
    var date = lic.verifiedAt || lic.fetchedAt || '';
    if (ts === 'full') {
      return {
        d: date ? ('已归档 · ' + date) : (canAttest(f) ? '已归档 · 可出证' : '已归档'),
        v: 'full' + (canAttest(f) ? ' · canAttest' : '')
      };
    }
    if (ts === 'summary') return { d: '摘要 · 非全文', v: 'summary' };
    if (ts === 'pointer') return { d: '指引 · 全文在上游', v: 'pointer' };
    return { d: '空', v: '∅' };
  }

  function fontArchiveCell(f) {
    var archive = fileOf(f, 'archive');
    if (archive && archive.staged) {
      return { d: '稍后提供', v: 'staged · ' + (archive.format || 'tar.gz') };
    }
    if (archive && archive.href) {
      return { d: '可下载', v: fileNameFromHref(archive.href) || archive.format || 'file' };
    }
    if (offerOf(f) === 'missing') return { d: '未收录', v: 'none' };
    return { d: '没有归档包', v: 'none' };
  }

  function fontVerb(f) {
    var archive = fileOf(f, 'archive');
    var staged = !!(archive && archive.staged);
    var real = primaryFile(f);
    var up = upstreamHref(f);
    var offer = offerOf(f);
    var readable = licenseReadable(f, {});
    if (canTake(f) && real && real.href && real.kind !== 'upstream' && !real.staged) {
      return {
        verb: real.kind === 'archive' ? '下载原件' : (real.label || '打开'),
        verbDev: fileNameFromHref(real.href) || real.format || real.kind,
        kickerDev: 'primary · file',
        note: '原件在本站，下载的是源文件，不是网页字体。',
        noteDev: 'files[' + (real.kind || 'file') + '] · not woff2',
        strongHref: real.href,
        strongLabel: primaryLabel(real)
      };
    }
    if (up && (staged || offer === 'source')) {
      return {
        verb: '去上游',
        verbDev: upstreamDev(up),
        kickerDev: 'primary · upstream',
        note: '归档包稍后提供，现在到上游仓库取原件。',
        noteDev: 'files[archive].staged · files[upstream] · not woff2',
        strongHref: up,
        strongLabel: '去上游仓库'
      };
    }
    if (up && offer === 'jump') {
      return {
        verb: '去出处',
        verbDev: upstreamDev(up),
        kickerDev: 'primary · jump',
        note: '原件不在本站，到出处取。',
        noteDev: 'offer=jump · upstream · not woff2',
        strongHref: up,
        strongLabel: '去出处'
      };
    }
    if (up) {
      return {
        verb: '去上游',
        verbDev: upstreamDev(up),
        kickerDev: 'primary · upstream',
        note: '这一款还没做成可以下载的原件。上游在，许可还没核对完。',
        noteDev: 'offer=' + offer + ' · upstream · textState=' + String((f.license || {}).textState || '∅'),
        strongHref: up,
        strongLabel: '去上游仓库'
      };
    }
    if (offer === 'pending') {
      return {
        verb: readable ? '读许可' : '待核实',
        verbDev: 'offer=pending',
        kickerDev: 'primary · pending',
        note: readable
          ? '源文件还没放在本站，也没有上游地址，先读已归档的许可。'
          : '许可和原件都还没核对。本站不下结论，也不提供下载。',
        noteDev: 'offer=pending · textState=' + String((f.license || {}).textState || '∅') + ' · no file',
        strongHref: readable ? ('/license/' + f.norm) : '/gap',
        strongLabel: readable ? '读许可原文' : '报缺字'
      };
    }
    return {
      verb: '未收录',
      verbDev: 'offer=missing',
      kickerDev: 'primary · missing',
      note: '这一款还没有源文件，也没有核对过的出处，可以先报缺字。',
      noteDev: 'offer=missing · no upstream',
      strongHref: '/gap',
      strongLabel: '报缺字'
    };
  }

  function fontSecondary(f) {
    var lic = f.license || {};
    var rows = [];
    var n = 2;
    if (licenseReadable(f, {})) {
      rows.push({
        n: n++,
        href: '/license/' + f.norm,
        t: '许可原文',
        d: lic.rfn ? '全文已归档，保留名以原文为准' : '全文已归档',
        dv: '/license/' + f.norm + (lic.textSha256 ? ' · textSha256' : ''),
        go: '阅读'
      });
    } else {
      rows.push({
        n: n++,
        href: '/license/' + f.norm,
        t: '许可原文',
        d: '条款尚未核对',
        dv: 'textState=' + String(lic.textState || '∅'),
        go: '阅读'
      });
    }
    rows.push({
      n: n++,
      href: '/gap',
      t: '报缺字',
      d: '缺字形、勘误，从这个入口报',
      dv: '/gap',
      go: '反馈'
    });
    var slice = fileOf(f, 'slice');
    var sliceHref = (slice && slice.href) ? slice.href : ('/slice/' + f.norm + '/');
    var sliceLater = !(slice && slice.href);
    rows.push({
      n: n++,
      href: sliceHref,
      t: '切片',
      d: sliceLater ? '网页切片包稍后提供' : '网页切片包',
      dv: sliceLater ? ('slice=' + (f.slice || 'planned')) : 'slice',
      go: '工具'
    });
    if (f.shop) {
      rows.push({
        n: n++,
        href: f.shop,
        t: '店面',
        d: '样张和选字在店面，不在这一站',
        dv: 'shop',
        go: '离开'
      });
    }
    return rows;
  }

  function renderFont(f, licText, fonts) {
    void fonts;
    var verb = fontVerb(f);
    var note = verb.note;
    var visitor = f.visitorNote && String(f.visitorNote).trim();
    if (visitor) {
      var archive = fileOf(f, 'archive');
      var staged = !!(archive && archive.staged);
      note = visitor;
      if (staged && note.indexOf('稍后') === -1 && note.indexOf('上游') === -1) {
        note = '归档包稍后提供。' + note;
      }
    }
    var spdx = attestSpdxOf(f) || '';
    var proto = spdx || f.licenseName || '—';
    var foundry = f.foundry || '作者不详';
    var textCell = fontTextCell(f);
    var archCell = fontArchiveCell(f);
    var mirrorState = (f.mirror || {}).state || '';
    var up = upstreamHref(f);
    var stagedFlag = !!(fileOf(f, 'archive') && fileOf(f, 'archive').staged);
    var metaDev = f.norm + ' · offer=' + offerOf(f) +
      (stagedFlag ? ' · archive.staged' : (' · textState=' + String((f.license || {}).textState || '∅')));
    var acts = [{ href: verb.strongHref, label: verb.strongLabel, strong: true }];
    if (licenseReadable(f, licText || {}) && verb.strongHref !== '/license/' + f.norm) {
      acts.push({ href: '/license/' + f.norm, label: '读许可原文', strong: false });
    }
    if (canAttest(f)) acts.push({ href: '/attest/' + f.norm + '/', label: '授权证明', strong: false });
    var actHtml = acts.map(function (a) {
      return '<a' + (a.strong ? ' class="is-strong"' : '') + ' href="' + esc(a.href) + '"' +
        hrefAttrs(a.href) + '>' + esc(a.label) + '</a>';
    }).join('');
    var rows = fontSecondary(f).map(function (r) {
      return '<a class="fd1-row" href="' + esc(r.href) + '"' + hrefAttrs(r.href) + '>' +
        '<span class="idx">' + idx2(r.n) + '</span>' +
        '<span class="t">' + esc(r.t) + '</span>' +
        '<span class="d for-design">' + esc(r.d) + '</span>' +
        '<span class="d for-dev mono">' + esc(r.dv) + '</span>' +
        '<span class="go">' + esc(r.go) + '</span>' +
      '</a>';
    }).join('');
    return '<section class="fd-hero">' +
      '<div class="container">' +
        '<p class="fd-crumb" aria-label="路径">' +
          '<span class="for-design"><a href="/source">目录</a> / ' + esc(wfName(f)) + '</span>' +
          '<span class="for-dev mono">/source/' + esc(f.norm) + ' · fd-v1b</span>' +
        '</p>' +
        '<section class="fd1-stage" aria-label="这一款现在能做的事">' +
          '<div class="fd1-verb">' +
            '<p class="kicker for-design">现在</p>' +
            '<p class="kicker for-dev mono">' + esc(verb.kickerDev) + '</p>' +
            '<h1 class="for-design">' + esc(verb.verb) + '</h1>' +
            '<h1 class="for-dev mono">' + esc(verb.verbDev) + '</h1>' +
            '<p class="fname">' + esc(wfName(f)) + '</p>' +
            '<p class="meta for-design">' + esc(proto) + ' · ' + esc(foundry) + ' · ' + esc(statusWord(f)) + '</p>' +
            '<p class="meta for-dev mono">' + esc(metaDev) + '</p>' +
            '<p class="note for-design">' + esc(note) + '</p>' +
            '<p class="note for-dev mono">' + esc(verb.noteDev) + '</p>' +
            '<p class="fd1-acts">' + actHtml + '</p>' +
          '</div>' +
          '<aside class="fd1-dossier" aria-label="卷宗">' +
            '<p class="label for-design">卷宗</p>' +
            '<p class="label for-dev mono">record</p>' +
            '<div class="fd1-kv">' +
              kvPair('短码', 'norm', f.norm, f.norm) +
              kvPair('协议', 'spdx', proto, spdx || '∅') +
              kvPair('厂商', 'foundry', foundry, f.foundrySlug || '—') +
              kvPair('原文', 'textState', textCell.d, textCell.v) +
              kvPair('归档', 'archive', archCell.d, archCell.v) +
              kvPair('镜像', 'mirror', mirrorWord(mirrorState) || '—', mirrorState || '∅') +
              kvPair('上游', 'upstream', upstreamDossier(up), up ? upstreamDossier(up) : '∅') +
            '</div>' +
          '</aside>' +
        '</section>' +
        '<p class="fd1-more-label for-design">还能办的事</p>' +
        '<p class="fd1-more-label for-dev mono">secondary</p>' +
        '<div class="fd1-rows">' + rows + '</div>' +
        '<p class="fd-footnote for-design">动作按这一款的收录状态生成。对照别名 <a href="/font-v1b.html">font-v1b</a>。</p>' +
        '<p class="fd-footnote for-dev mono">renderFont · fd-v1b · /source/' + esc(f.norm) + '</p>' +
      '</div>' +
    '</section>';
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

  function idx2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function licenseKind(f) {
    var lic = f.license || {};
    var ts = String(lic.textState || '');
    var name = f.licenseName || '';
    var spdx = attestSpdxOf(f);
    var open = ts === 'full' && ATTEST_SPDX.indexOf(spdx) !== -1 && f.distribution !== false;
    var unverified = !name || name === '待核实' || ts === 'missing' || ts === '';
    if (open) return 'open';
    if (unverified) return 'mute';
    return 'hold';
  }

  function licenseRank(fonts, q) {
    var qq = String(q || '').trim().toLowerCase();
    var list = fonts.filter(function (f) { return matchQ(f, qq); });
    function score(f) {
      var n = String(f.norm || '').toLowerCase();
      var name = String(f.name || '').toLowerCase();
      var wf = '文风·' + name;
      if (n === qq || name === qq || wf === qq) return 0;
      if (name.indexOf(qq) === 0 || n.indexOf(qq) === 0 || wf.indexOf(qq) === 0) return 1;
      return 2;
    }
    list.sort(function (a, b) {
      var d = score(a) - score(b);
      if (d) return d;
      return String(a.name || '').localeCompare(String(b.name || ''), 'zh');
    });
    return list;
  }

  function textStateWord(f) {
    var ts = String((f.license || {}).textState || '');
    if (ts === 'full') return canAttest(f) ? '已归档 · 可出证' : '已归档';
    if (ts === 'summary') return '摘要 · 非全文';
    if (ts === 'pointer') return '指引 · 全文在上游';
    return '空';
  }

  function rightsCells(f, kind) {
    if (kind === 'open') {
      return [
        ['商用', 'commercial', '允许', 'yes'],
        ['修改', 'modify', '允许', 'yes'],
        ['再分发', 'redistribute', '允许', 'yes']
      ];
    }
    if (kind === 'mute') {
      return [
        ['商用', 'commercial', '待核实', '—'],
        ['修改', 'modify', '待核实', '—'],
        ['再分发', 'redistribute', '待核实', '—']
      ];
    }
    if (f.distribution === false) {
      return [
        ['商用', 'commercial', '以原文为准', 'see text'],
        ['修改', 'modify', '以原文为准', 'see text'],
        ['再分发', 'redistribute', '本站不代分发', 'distribution=false']
      ];
    }
    return [
      ['商用', 'commercial', '以原文为准', 'see text'],
      ['修改', 'modify', '以原文为准', 'see text'],
      ['再分发', 'redistribute', '以原文为准', 'see text']
    ];
  }

  function verdictCopy(f, kind) {
    var ts = String((f.license || {}).textState || '');
    if (kind === 'open') {
      return {
        state: '可商用<br />可改<br />可分发',
        stateDev: 'commercial<br />modify<br />redistribute',
        line: '可商用 · 可改 · 可分发',
        note: canTake(f)
          ? '开源许可已核对原文。原件在目录直接下载，可出授权证明。'
          : '开源许可已核对原文。源文件还没放在本站，结论不受影响。',
        noteDev: (canTake(f) ? 'canTake' : ('offer=' + offerOf(f))) +
          (canAttest(f) ? ' · canAttest' : '') +
          ' · GET /api/v1/licenses/' + f.norm
      };
    }
    if (kind === 'mute') {
      return {
        state: '待核实',
        stateDev: 'textState=' + (ts || '∅'),
        line: '待核实',
        note: '许可原文还没有核对记录。本站不出结论，也不出证。',
        noteDev: 'no conclusion · no attest'
      };
    }
    if (f.distribution === false) {
      return {
        state: '仅查询<br />不可下载',
        stateDev: 'distribution=false<br />no file here',
        line: '仅查询 · 不可下载',
        note: '本站不代分发这款源文件。条款以厂商或上游发布件为准。',
        noteDev: 'offer=' + offerOf(f) + ' · textState=' + (ts || '∅')
      };
    }
    if (ts === 'full') {
      return {
        state: '原文已归档<br />非开源协议',
        stateDev: 'textState=full<br />spdx∉attest',
        line: '原文已归档 · 非开源协议',
        note: '全文在本站，但不是标准开源协议。以原文为准，不在出证范围内。',
        noteDev: 'license text on file · attest blocked'
      };
    }
    return {
      state: '仅查询<br />全文在上游',
      stateDev: 'textState=' + (ts || '∅') + '<br />not archived',
      line: '仅查询 · 全文在上游',
      note: '本站还没有归档全文。先看出处，不要把名称当成许可结论。',
      noteDev: 'pointer · upstream text'
    };
  }

  function stageActs(f, kind) {
    var acts = [];
    if (kind !== 'mute' && licenseReadable(f, {})) {
      acts.push({ href: '/license/' + f.norm, label: '打开许可原文', strong: true });
    }
    if (canTake(f)) {
      acts.push({ href: '/source/' + f.norm + '/', label: '下源文件', strong: !acts.length });
    }
    if (canAttest(f)) {
      acts.push({ href: '/attest/' + f.norm + '/', label: '授权证明', strong: false });
    }
    if (!canTake(f)) {
      acts.push({ href: '/source/' + f.norm + '/', label: '看目录条目', strong: !acts.length });
    }
    if (kind === 'mute') {
      acts.push({ href: '/gap', label: '报缺字', strong: !acts.length });
    }
    return acts;
  }

  function kvPair(kd, kv, vd, vv) {
    return '<div>' +
      '<span class="k for-design">' + esc(kd) + '</span>' +
      '<span class="k for-dev">' + esc(kv) + '</span>' +
      '<span class="v for-design">' + esc(vd) + '</span>' +
      '<span class="v for-dev mono">' + esc(vv) + '</span>' +
    '</div>';
  }

  function licenseStage(f) {
    var kind = licenseKind(f);
    var copy = verdictCopy(f, kind);
    var spdx = attestSpdxOf(f) || '';
    var foundry = f.foundry || '作者不详';
    var proto = spdx || f.licenseName || '—';
    var acts = stageActs(f, kind).map(function (a) {
      return '<a' + (a.strong ? ' class="is-strong"' : '') + ' href="' + esc(a.href) + '">' + esc(a.label) + '</a>';
    }).join('');
    var rights = rightsCells(f, kind).map(function (row) {
      return kvPair(row[0], row[1], row[2], row[3]);
    }).join('');
    var verdict = '<div class="lq5b-verdict">' +
      '<p class="kicker for-design" data-lq-kicker-d></p>' +
      '<p class="kicker for-dev mono" data-lq-kicker-v></p>' +
      '<p class="state for-design">' + copy.state + '</p>' +
      '<p class="state for-dev mono">' + copy.stateDev + '</p>' +
      '<p class="fname">' + esc(wfName(f)) + '</p>' +
      '<p class="meta for-design">' + esc(proto) + ' · ' + esc(foundry) + ' · ' + esc(statusWord(f)) + '</p>' +
      '<p class="meta for-dev mono">' + esc(f.norm) + ' · spdx=' + esc(spdx || '∅') + ' · offer=' + esc(offerOf(f)) + '</p>' +
      '<p class="note for-design">' + esc(copy.note) + '</p>' +
      '<p class="note for-dev mono">' + esc(copy.noteDev) + '</p>' +
      '<p class="acts">' + acts + '</p>' +
    '</div>';
    var dossier = '<aside class="lq5b-dossier" aria-label="卷宗字段">' +
      '<p class="label">卷宗</p>' +
      '<div class="lq5b-kv">' +
        kvPair('短码', 'norm', f.norm, f.norm) +
        kvPair('协议', 'spdx', proto, spdx || '∅') +
        kvPair('厂商', 'foundry', foundry, f.foundrySlug || '—') +
        kvPair('原文', 'textState', textStateWord(f), textStateWord(f) === '空' ? '∅' : String((f.license || {}).textState || '∅')) +
        kvPair('源文件', 'offer', statusWord(f), offerOf(f)) +
        rights +
      '</div>' +
    '</aside>';
    return { kind: kind, copy: copy, verdict: verdict, dossier: dossier };
  }

  function licenseFoil(f, n) {
    var kind = licenseKind(f);
    var copy = verdictCopy(f, kind);
    var spdx = attestSpdxOf(f) || '';
    var href = '/source/' + f.norm + '/';
    var go = '看条目 →';
    if (kind === 'mute') { href = '/gap'; go = '报缺字 →'; }
    else if (licenseReadable(f, {})) {
      href = '/license/' + f.norm;
      go = kind === 'open' ? '读原文 →' : '读要点 →';
    }
    return '<a class="lq5b-foil' + (kind === 'mute' ? ' is-mute' : '') + '" role="listitem" href="' + esc(href) + '">' +
      '<span class="idx" aria-hidden="true">' + idx2(n) + '</span>' +
      '<span class="state">' + esc(copy.line) + '</span>' +
      '<span class="body">' +
        '<span class="fname">' + esc(wfName(f)) + '</span>' +
        '<span class="meta for-design">' + esc(spdx || f.licenseName || '待核实') + ' · ' + esc(f.foundry || '作者不详') + ' · ' + esc(statusWord(f)) + '</span>' +
        '<span class="meta for-dev mono">' + esc(f.norm) + ' · textState=' + esc(String((f.license || {}).textState || '∅')) + ' · offer=' + esc(offerOf(f)) + '</span>' +
      '</span>' +
      '<span class="go" aria-hidden="true">' + esc(go) + '</span>' +
    '</a>';
  }

  function licenseDemo(fonts) {
    var primary = findFont(fonts, 'Xwwk');
    var foils = [findFont(fonts, 'Albbpht'), findFont(fonts, 'Higure')].filter(Boolean);
    if (!primary) {
      for (var i = 0; i < fonts.length; i++) {
        if (licenseKind(fonts[i]) === 'open') { primary = fonts[i]; break; }
      }
    }
    return { primary: primary, foils: foils, demo: true, more: 0 };
  }

  function licensesPage(fonts, route) {
    var q = String(route.q || '').trim();
    var pack;
    if (!q) pack = licenseDemo(fonts);
    else {
      var ranked = licenseRank(fonts, q);
      var shown = ranked.slice(1, 7);
      pack = {
        primary: ranked[0] || null,
        foils: shown,
        demo: false,
        more: Math.max(0, ranked.length - 1 - shown.length)
      };
    }
    var stage = '';
    if (!pack.primary) {
      stage = '<section class="lq5b-stage" aria-label="没有命中">' +
        '<div class="lq5b-verdict">' +
          '<p class="kicker for-design">没有命中</p>' +
          '<p class="kicker for-dev mono">q miss</p>' +
          '<p class="state">没有<br />这一款</p>' +
          '<p class="note for-design">换个名字，或去目录按状态看。</p>' +
          '<p class="note for-dev mono">matchQ miss · /source</p>' +
          '<p class="acts"><a class="is-strong" href="/source">打开目录</a><a href="/license">清空检索</a></p>' +
        '</div>' +
      '</section>';
    } else {
      var built = licenseStage(pack.primary);
      var kickerD = pack.demo ? '示范命中 · 01' : '主命中 · 01';
      var kickerV = pack.demo ? 'demo · not a query' : 'primary · q hit';
      built.verdict = built.verdict
        .replace('data-lq-kicker-d>', 'data-lq-kicker-d>' + kickerD)
        .replace('data-lq-kicker-v>', 'data-lq-kicker-v>' + kickerV);
      var foilLabelD = pack.demo ? '其他两种结论 · 示例' : (pack.foils.length ? '同一检索的其他命中' : '没有其他命中');
      var foilLabelV = pack.demo ? 'foils · other tiers' : 'foils · same query';
      if (pack.more) foilLabelD += ' · 还有 ' + pack.more + ' 款没列出';
      stage = '<section class="lq5b-stage" aria-label="主命中">' +
        built.verdict + built.dossier +
      '</section>' +
      '<p class="lq5b-foils-label for-design">' + esc(foilLabelD) + '</p>' +
      '<p class="lq5b-foils-label for-dev mono">' + esc(foilLabelV) + '</p>' +
      (pack.foils.length
        ? '<div class="lq5b-foils" role="list">' + pack.foils.map(function (f, i) { return licenseFoil(f, i + 2); }).join('') + '</div>'
        : '');
    }
    var footD = pack.demo
      ? '还没检索时，这里用三款字演示三种结论；检索后换成命中。结论按收录记录生成，不是法律意见。对照别名 <a href="/license-v5b.html">license-v5b</a>。'
      : ('结论按收录记录生成，不是法律意见。' + (q ? '检索「' + esc(q) + '」。' : ''));
    var footV = 'licensesPage · lq-v5b · /license' + (q ? ' · q=' + esc(q) : ' · demo');
    return '<section class="lq5b-hero">' +
      '<div class="container">' +
        '<p class="lq5b-crumb" aria-label="路径">' +
          '<span class="for-design">wenfeng.org / 授权</span>' +
          '<span class="for-dev mono">wenfeng.org /license</span>' +
        '</p>' +
        '<div class="lq5b-display">' +
          '<h1 class="for-design">查授权</h1>' +
          '<h1 class="for-dev mono">/license</h1>' +
          '<p class="lq5b-lead for-design">查一款字体的授权结论：<br class="lq5b-br" />能不能商用、能不能改、能不能再分发。</p>' +
          '<p class="lq5b-lead for-dev mono">q → verdict · license fields<br class="lq5b-br" /> spdx · textState · offer</p>' +
        '</div>' +
        '<form class="lq5b-search" action="/license" method="get" role="search">' +
          '<span class="lq5b-search-kicker" aria-hidden="true">检索</span>' +
          '<label class="sr-only" for="q">搜索字体</label>' +
          '<input id="q" name="q" type="search" value="' + esc(q) + '" placeholder="中文名、英文、短码、厂商…" autocomplete="off" />' +
          '<button class="btn btn-ink" type="submit">' +
            '<svg class="icon" aria-hidden="true"><use href="/assets/icons.svg#i-search"></use></svg>' +
            '搜索' +
          '</button>' +
        '</form>' +
        stage +
        '<p class="lq5b-footnote for-design">' + footD + '</p>' +
        '<p class="lq5b-footnote for-dev mono">' + footV + '</p>' +
      '</div>' +
    '</section>';
  }

  function licenseTier(f) {
    var t = f.license && f.license.textState ? String(f.license.textState) : '';
    if (t === 'full') return { word: '许可原文', note: '' };
    if (t === 'summary') return { word: '许可要点', note: '非全文，全文以厂商发布件为准。' };
    if (t === 'pointer') return { word: '许可指引', note: '全文在上游仓库，本站尚未归档文本。' };
    return null;
  }

  function licensePage(f, lic) {
    var title = lic.title || f.licenseName || '许可原文';
    var body = lic.body || '';
    var licO = f.license || {};
    var ev0 = (lic && lic.evidence) || {};
    var kind = String(lic.textKind || licO.textState || '');
    var orig = [];
    if (f.name) orig.push(esc(f.name));
    if (f.en) orig.push(esc(f.en));
    var sub = esc(wfName(f)) + ' · 原名 ' + (orig.length ? orig.join(' · ') : '—') +
      (f.foundry ? ' · ' + esc(f.foundry) : '');
    var tier = licenseTier(f);
    var flagWord = tier ? tier.word : '许可原文';
    var stateLine = '';
    if (kind === 'full') {
      stateLine = '已归档' + (licO.fetchedAt || ev0.fetchedAt ? ' · ' + esc(licO.fetchedAt || ev0.fetchedAt) + ' 取得' : '') + ' · 全文照录，未做删改。';
    } else if (tier && tier.note) {
      stateLine = esc(tier.note);
      if (tier.word === '许可指引' && licO.sourceUrl) {
        stateLine += '原文出处：<a href="' + esc(licO.sourceUrl) + '"' + hrefAttrs(licO.sourceUrl) + '>' +
          esc(hostOf(licO.sourceUrl) || '上游原文') + '</a>';
      }
    }
    var evRows = '';
    if (licO.sourceUrl || ev0.url) {
      var src = licO.sourceUrl || ev0.url;
      evRows += '<div><span class="k for-design">来源</span><span class="k for-dev mono">sourceUrl</span><span class="v"><a href="' + esc(src) + '"' + hrefAttrs(src) + '>' + esc(hostOf(src) || src) + '</a></span></div>';
    }
    if (licO.fetchedAt || ev0.fetchedAt) {
      evRows += '<div><span class="k for-design">取得</span><span class="k for-dev mono">fetchedAt</span><span class="v">' + esc(licO.fetchedAt || ev0.fetchedAt) + '</span></div>';
    }
    if (licO.textSha256) {
      evRows += '<div><span class="k for-design">文本哈希</span><span class="k for-dev mono">textSha256</span><span class="v mono">' + esc(licO.textSha256) + '</span></div>';
    }
    if (licO.spdx === 'OFL-1.1' && (licO.rfn || licO.rfnNote)) {
      evRows += '<div><span class="k for-design">保留名</span><span class="k for-dev mono">rfn</span><span class="v">' +
        (licO.rfn ? esc(licO.rfn) : '未声明保留名') +
        (licO.rfnNote ? '<span class="tool-quiet"> · ' + esc(licO.rfnNote) + '</span>' : '') + '</span></div>';
    }
    var ev = (evRows)
      ? '<section class="lp10-evidence" aria-label="取证记录">' +
          '<p class="label for-design">取证记录</p>' +
          '<p class="label for-dev mono">evidence</p>' +
          '<div class="lp10-kv">' + evRows + '</div>' +
          (licO.textSha256
            ? '<p class="lp10-note for-design">哈希对得上，原文就没被换过。</p>' +
              '<p class="lp10-note for-dev mono">hash diff = tamper check</p>'
            : '<p class="lp10-note for-design">文本哈希在归档文本时计算。</p>') +
        '</section>'
      : '';
    var acts = '<p class="lp10-acts">' +
      '<a class="is-strong" href="/source/' + esc(f.norm) + '/">返回条目</a>' +
      (canAttest(f) ? '<a href="/attest/' + esc(f.norm) + '/">授权证明</a>' : '') +
      (f.shop ? '<a href="' + esc(f.shop) + '"' + hrefAttrs(f.shop) + '>去店面用</a>' : '') +
    '</p>';
    return '<section class="lp10-hero">' +
      '<div class="container">' +
        '<p class="lp10-crumb" aria-label="路径">' +
          '<span class="for-design"><a href="/source">目录</a><span class="sep">/</span><a href="/source/' + esc(f.norm) + '/">' + esc(wfName(f)) + '</a><span class="sep">/</span>许可</span>' +
          '<span class="for-dev mono">/license/' + esc(f.norm) + ' · lp-v10</span>' +
        '</p>' +
        '<div class="lp10-head">' +
          '<p class="lp10-flag for-design">' + esc(flagWord) + '</p>' +
          '<p class="lp10-flag for-dev mono">textKind=' + esc(kind || '∅') + '</p>' +
          '<h1 class="for-design">' + esc(title) + '</h1>' +
          '<h1 class="for-dev mono">' + esc(licO.spdx || f.licenseName || '—') + '</h1>' +
          '<p class="lp10-sub">' + sub + '</p>' +
          (stateLine ? '<p class="lp10-state for-design">' + stateLine + '</p>' : '') +
          '<p class="lp10-state for-dev mono">textState=' + esc(String(licO.textState || '∅')) +
            (licO.textSha256 ? ' · textSha256=' + esc(String(licO.textSha256).slice(0, 8)) + '…' : '') + '</p>' +
        '</div>' +
        (body
          ? '<article class="lp10-sheet"><pre class="lp10-doc">' + esc(body) + '</pre></article>' + ev + acts
          : '<div class="page-state is-fill"><p class="kicker">许可</p><h1>还没有原文</h1><p class="lead">这一款许可尚未收入文本。</p></div>') +
        '<p class="lp10-footnote for-design">取证方法写在 <a href="/how">我们怎么核</a>。</p>' +
        '<p class="lp10-footnote for-dev mono">licensePage · lp-v10 · data/license-text/' + esc(f.norm) + '.json</p>' +
      '</div>' +
    '</section>';
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
      ? '<a href="' + esc(f.shop) + '"' + hrefAttrs(f.shop) + '>去店面用</a>'
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
              '<span class="tool-index-meta">' + esc(f.foundry || '作者不详') + '</span>' +
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
                '<span class="tool-index-meta">' + esc(f.foundry || '作者不详') + '</span>' +
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
    return (
      "<section class=\"us-hero\">\n" +
      "      <div class=\"container\">\n" +
      "        <p class=\"us-crumb\" aria-label=\"路径\">\n" +
      "          <span class=\"for-design\"><a href=\"/\">首页</a><span class=\"sep\">/</span>用法</span>\n" +
      "          <span class=\"for-dev mono\">/use · us-v4b</span>\n" +
      "        </p>\n" +
      "        <div class=\"us-display\">\n" +
      "          <h1 class=\"for-design\">先问</h1>\n" +
      "          <h1 class=\"for-dev mono\">ask first</h1>\n" +
      "          <p class=\"us-lead for-design\">五个常见问题，各答各的：要文件、进主题、网页里用、注释能不能删、程序怎么查。</p>\n" +
      "          <p class=\"us-lead for-dev mono\">question | answer<br />not 3 cols · not 4 steps · not /how</p>\n" +
      "        </div>\n" +
      "\n" +
      "        <ol class=\"us4-asks\">\n" +
      "          <li>\n" +
      "            <h2 class=\"for-design\">要文件本身？</h2>\n" +
      "            <h2 class=\"for-dev mono\">want the file?</h2>\n" +
      "            <div class=\"us4-a\">\n" +
      "              <p class=\"us-prose for-design\">拿原件。TTF / OTF / 上游仓库归档。给自建站、主题作者。许可允许时才再分发。</p>\n" +
      "              <p class=\"us-prose for-dev mono\">ttf · otf · upstream archive<br />redistribute only if allowed</p>\n" +
      "            </div>\n" +
      "          </li>\n" +
      "          <li id=\"theme\">\n" +
      "            <h2 class=\"for-design\">要放进主题？</h2>\n" +
      "            <h2 class=\"for-dev mono\">into a theme?</h2>\n" +
      "            <div class=\"us4-a\">\n" +
      "              <p class=\"us-prose for-design\">用切片包，给 WordPress 和静态站本地 @font-face。开源字体的切片包稍后提供。不允许再分发的免费商用字体：上传从厂商下载的原包 zip（不要解压），核验通过后领取。走<a href=\"/slice\">切片工具</a>。</p>\n" +
      "              <p class=\"us-prose for-dev mono\">local @font-face<br />oss slice later · no-redist zip → /slice</p>\n" +
      "              <p class=\"us-prose for-design\">解压后整个文件夹放进主题（或 <code>wp-content/fonts</code>）。包内 <code>fonts.css</code> 已写好 <code>@font-face</code> 和必须保留的注释，整只引入，不要拆。</p>\n" +
      "              <p class=\"us-prose for-dev mono\">whole folder · fonts.css intact · do not split</p>\n" +
      "              <pre class=\"us-code\">// functions.php 里排队引入\n" +
      "wp_enqueue_style(\n" +
      "  'wenfeng-xwwk',\n" +
      "  get_theme_file_uri( '/fonts/wenfeng-xwwk/fonts.css' ),\n" +
      "  array(),\n" +
      "  null\n" +
      ");\n" +
      "\n" +
      "/* 或在主题 style.css 顶部 */\n" +
      "@import url( \"./fonts/wenfeng-xwwk/fonts.css\" );</pre>\n" +
      "            </div>\n" +
      "          </li>\n" +
      "          <li>\n" +
      "            <h2 class=\"for-design\">只在网页里用？</h2>\n" +
      "            <h2 class=\"for-dev mono\">cite, not save?</h2>\n" +
      "            <div class=\"us4-a\">\n" +
      "              <p class=\"us-prose for-design\">用 cn.windfonts.com 托管的 CSS 和字体分片。这不是本站下载，不要拿去二次托管。</p>\n" +
      "              <p class=\"us-prose for-dev mono\">cn.windfonts.com<br />not a download · no rehost</p>\n" +
      "              <p class=\"us-prose for-design\">不要把 <code>cn.windfonts.com</code> 的 woff2 拷走当源文件。托管分片不是原件，也不是切片包。</p>\n" +
      "              <p class=\"us-prose for-dev mono\">do not copy hosted woff2 · not the source file</p>\n" +
      "            </div>\n" +
      "          </li>\n" +
      "          <li>\n" +
      "            <h2 class=\"for-design\">这一行能删吗？</h2>\n" +
      "            <h2 class=\"for-dev mono\">drop the comment?</h2>\n" +
      "            <div class=\"us4-a\">\n" +
      "              <p class=\"us-prose for-design\">不能。注释里的 <code>https://wenfeng.org/license</code> 要留着。不允许再分发的字体走<a href=\"/slice\">切片工具</a>。</p>\n" +
      "              <p class=\"us-prose for-dev mono\">keep license comment · no-redist → /slice</p>\n" +
      "              <p class=\"us-label for-design\">嵌入代码里这一行不能改</p>\n" +
      "              <p class=\"us-label for-dev mono\">comment · keep</p>\n" +
      "              <pre class=\"us-code\">&lt;!-- 本页嵌入的字体由文风字体（Windfonts）提供，可自由使用；请保留本授权标注 https://wenfeng.org/license --&gt;</pre>\n" +
      "            </div>\n" +
      "          </li>\n" +
      "          <li id=\"api\">\n" +
      "            <h2 class=\"for-design\">用程序查？</h2>\n" +
      "            <h2 class=\"for-dev mono\">query it?</h2>\n" +
      "            <div class=\"us4-a\">\n" +
      "              <p class=\"us-prose for-design\">查目录 API。免费和商业都可以查。商业字只出字段，<code>files</code> 为空。不是店面的 <code>/api/css</code>。<code>lineage</code> 字段为造字平台预留，现在恒为 <code>null</code>。</p>\n" +
      "              <p class=\"us-prose for-dev mono\">commercial → fields only, files []<br />not shop /api/css · lineage = null</p>\n" +
      "              <ul class=\"us-api\">\n" +
      "            <li><a href=\"/api/v1/fonts\"><code>GET /api/v1/fonts</code><span>全部条目</span></a></li>\n" +
      "            <li><a href=\"/api/v1/fonts?offer=source\"><code>GET /api/v1/fonts?offer=source</code><span>本站下载</span></a></li>\n" +
      "            <li><a href=\"/api/v1/fonts?q=%E9%9C%9E%E9%B9%AD\"><code>GET /api/v1/fonts?q=霞鹜</code><span>按名搜</span></a></li>\n" +
      "            <li><a href=\"/api/v1/fonts/xwwk\"><code>GET /api/v1/fonts/xwwk</code><span>一款 · 有 files</span></a></li>\n" +
      "            <li><a href=\"/api/v1/fonts/albbpht\"><code>GET /api/v1/fonts/albbpht</code><span>files 为空</span></a></li>\n" +
      "            <li><a href=\"/api/v1/licenses/xwwk\"><code>GET /api/v1/licenses/xwwk</code><span>许可原文</span></a></li>\n" +
      "            <li><a href=\"/api/v1/foundries\"><code>GET /api/v1/foundries</code><span>厂商</span></a></li>\n" +
      "            <li><a href=\"/api/v1/certs\"><code>GET /api/v1/certs</code><span>可核验目录</span></a></li>\n" +
      "            <li><a href=\"/api/v1/certs/xwwk\"><code>GET /api/v1/certs/xwwk</code><span>一款核验 JSON</span></a></li>\n" +
      "            <li><span class=\"api-row\"><code>POST /api/v1/certs/verify</code><span>核对本份签名</span></span></li>\n" +
      "          </ul>\n" +
      "          <pre class=\"us-code\">GET /api/v1/fonts/{norm}\n" +
      "{\n" +
      "  \"norm\": \"Xwwk\",\n" +
      "  \"name\": \"霞鹜文楷\",\n" +
      "  \"distribution\": true,\n" +
      "  \"offer\": \"source\",\n" +
      "  \"files\": [ { \"kind\": \"archive\", \"href\": \"…\" } ]\n" +
      "}</pre>\n" +
      "            </div>\n" +
      "          </li>\n" +
      "        </ol>\n" +
      "\n" +
      "        <p class=\"us-acts\">\n" +
      "          <a class=\"is-pill\" href=\"/source\"><span class=\"for-design\">下源文件</span><span class=\"for-dev\">/source</span></a>\n" +
      "          <a href=\"/slice\"><span class=\"for-design\">切片工具</span><span class=\"for-dev\">/slice</span></a>\n" +
      "          <a href=\"/license\"><span class=\"for-design\">查授权</span><span class=\"for-dev\">/license</span></a>\n" +
      "        </p>\n" +
      "        <p class=\"us-footnote for-design\">怎么核在 <a href=\"/how\">/how</a>。对照别名 <a href=\"/use-v4b.html\">use-v4b</a>。</p>\n" +
      "        <p class=\"us-footnote for-dev mono\">usePage · us-v4b · /use</p>\n" +
      "      </div>\n" +
      "    </section>\n"
    );
  }

  function aboutPage() {
    return '<section class="ab-hero">' +
      '<div class="container">' +
        '<p class="ab-crumb" aria-label="路径">' +
          '<span class="for-design"><a href="/">首页</a><span class="sep">/</span>关于</span>' +
          '<span class="for-dev mono">/about · ab-v6b</span>' +
        '</p>' +
        '<div class="ab-display">' +
          '<h1 class="for-design">从根往下</h1>' +
          '<h1 class="for-dev mono">origin tree</h1>' +
          '<p class="ab-lead for-design">wenfeng.org 下面挂四条路径：源文件、许可、缺字、证明。店面和造字在别的名字下。</p>' +
          '<p class="ab-lead for-dev mono">/source · /license · /gap · /attest<br />other hosts are not children</p>' +
        '</div>' +
        '<p class="ab6-root">' +
          '<span class="host">wenfeng.org</span>' +
          '<span class="for-design">这一名下面</span>' +
          '<span class="for-dev mono">children</span>' +
        '</p>' +
        '<ol class="ab6-tree">' +
          '<li class="ab6-branch">' +
            '<div class="ab6-line">' +
              '<a class="path" href="/source">/source</a>' +
              '<span class="name for-design">源文件</span>' +
              '<span class="name for-dev mono">offer</span>' +
              '<span class="act"><a class="is-pill" href="/source"><span class="for-design">看目录</span><span class="for-dev">GET</span></a></span>' +
            '</div>' +
            '<p class="gloss for-design">源文件本站下载。不允许再分发的，核验后领切片包。</p>' +
            '<p class="gloss for-dev mono">offer · slice · no file sale · not a CDN</p>' +
          '</li>' +
          '<li class="ab6-branch">' +
            '<div class="ab6-line">' +
              '<a class="path" href="/license">/license</a>' +
              '<span class="name for-design">许可</span>' +
              '<span class="name for-dev mono">text</span>' +
              '<span class="act"><a href="/license"><span class="for-design">查授权</span><span class="for-dev">GET</span></a></span>' +
            '</div>' +
            '<p class="gloss for-design">许可原文已收档。证明不替代原文，也不新设权利。</p>' +
            '<p class="gloss for-dev mono">text · attest ≠ new rights</p>' +
          '</li>' +
          '<li class="ab6-branch">' +
            '<div class="ab6-line">' +
              '<a class="path" href="/gap">/gap</a>' +
              '<span class="name for-design">缺字</span>' +
              '<span class="name for-dev mono">gap</span>' +
              '<span class="act"><a href="/gap"><span class="for-design">报缺字</span><span class="for-dev">GET</span></a></span>' +
            '</div>' +
            '<p class="gloss for-design">缺字形、缺收录、勘误在这里说。</p>' +
            '<p class="gloss for-dev mono">/gap · submit unwired · editor not a child</p>' +
          '</li>' +
          '<li class="ab6-branch">' +
            '<div class="ab6-line">' +
              '<a class="path" href="/attest">/attest</a>' +
              '<span class="name for-design">证明</span>' +
              '<span class="name for-dev mono">attest</span>' +
              '<span class="act"><a href="/attest"><span class="for-design">授权证明</span><span class="for-dev">GET</span></a></span>' +
            '</div>' +
            '<p class="gloss for-design">只给标准开源协议出证。厂商自拟、还没核实、未收录的，不出。</p>' +
            '<p class="gloss for-dev mono">SPDX only · else no attest</p>' +
          '</li>' +
        '</ol>' +
        '<p class="ab6-root is-other">' +
          '<span class="host for-design">别的名字</span>' +
          '<span class="host for-dev mono">not children</span>' +
          '<span class="for-design">不挂在 wenfeng.org 下面</span>' +
          '<span class="for-dev mono">other origins</span>' +
        '</p>' +
        '<ol class="ab6-tree is-other">' +
          '<li class="ab6-branch">' +
            '<div class="ab6-line">' +
              '<a class="path" href="https://app.windfonts.com/">app.windfonts.com</a>' +
              '<span class="name for-design">店面</span>' +
              '<span class="name for-dev mono">shop</span>' +
              '<span class="act"><a href="https://app.windfonts.com/"><span class="for-design">去店面</span><span class="for-dev">shop</span></a></span>' +
            '</div>' +
            '<p class="gloss for-design">样张、选字、店面用字、控制台和账号。</p>' +
            '<p class="gloss for-dev mono">specimens · account · console</p>' +
          '</li>' +
          '<li class="ab6-branch">' +
            '<div class="ab6-line">' +
              '<span class="path is-quiet">尚无域名</span>' +
              '<span class="name for-design">造字</span>' +
              '<span class="name for-dev mono">editor</span>' +
            '</div>' +
            '<p class="gloss for-design">编辑器放在独立新域，不挂在本站。本站以后只做入口和收录。</p>' +
            '<p class="gloss for-dev mono">other origin · no route · entry + catalog later</p>' +
          '</li>' +
        '</ol>' +
        '<section class="ab6-note" aria-label="说明">' +
          '<p class="label for-design">说明</p>' +
          '<p class="label for-dev mono">note · under the tree</p>' +
          '<p class="for-design">文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。文风字体提供的源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。</p>' +
          '<p class="for-design">对于采用标准开源协议的字体，文派科技作为责任主体，可为合法合规使用的个人及企业出具《文风字体授权证明》，作为开源授权的证明材料。证明记录该字体在收录时的完整授权链、适用的开源协议、许可原文哈希，以及本站是否提供原件。证明不替代许可原文，也不为使用者创设新的权利。</p>' +
          '<p class="for-design">其他品牌厂商自行发布的授权协议，本站只提供授权原文下载，文派科技不出具《文风字体授权证明》，也不代著作权人签署授权书。</p>' +
          '<p class="for-design">wenfeng.org 只做授权核对与源文件分发。本站不出售字体文件，不出售授权，不代理厂商收费或维权，也不代表任何著作权人授权。只给采用标准开源协议的字体出证；厂商自拟条款、许可还没核实的、未收录的不出证。完整清单见<a href="/legal#legal-scope">法务说明</a>。收录与核验的方法写在<a href="/how">我们怎么核</a>。本站以前用 WordPress 做过，现已改为独立静态站点，与店面分开部署。</p>' +
          '<p class="for-dev mono">oss · SPDX text · chain + hash + original?<br />attest ≠ new rights · custom terms → text only<br />no file sale · no license sale · no grant<br />SPDX only · custom / unverified / unlisted → no attest<br />/legal#legal-scope · /how · wordpress → static · split deploy</p>' +
        '</section>' +
        '<p class="ab-footnote for-design">对照别名 <a href="/about-v6b.html">about-v6b</a>。</p>' +
        '<p class="ab-footnote for-dev mono">aboutPage · ab-v6b · /about</p>' +
      '</div>' +
    '</section>';
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
    return '<section class="hw-hero">' +
      '<div class="container">' +
        '<p class="hw-crumb" aria-label="路径">' +
          '<span class="for-design"><a href="/">首页</a><span class="sep">/</span>收录与核验</span>' +
          '<span class="for-dev mono">/how · hw-v1b</span>' +
        '</p>' +
        '<div class="hw-display">' +
          '<h1 class="for-design">先过三条</h1>' +
          '<h1 class="for-dev mono">3 gates</h1>' +
          '<p class="hw-lead for-design">文风只做两件事：把源文件交给你，把许可说清楚。收进目录要先过这三条。</p>' +
          '<p class="hw-lead for-dev mono">text · source · official<br />lexicon and method below</p>' +
        '</div>' +
        '<ol class="hw1-gates" id="how-criteria">' +
          '<li class="hw1-gate">' +
            '<p class="hw1-idx">01</p>' +
            '<h2 class="for-design">许可文本</h2>' +
            '<h2 class="for-dev mono">text</h2>' +
            '<p class="for-design">许可文本拿得到。</p>' +
            '<p class="for-dev mono">license text in hand</p>' +
          '</li>' +
          '<li class="hw1-gate">' +
            '<p class="hw1-idx">02</p>' +
            '<h2 class="for-design">来源可查</h2>' +
            '<h2 class="for-dev mono">source</h2>' +
            '<p class="for-design">来源能查到作者或厂商。</p>' +
            '<p class="for-dev mono">author or foundry</p>' +
          '</li>' +
          '<li class="hw1-gate">' +
            '<p class="hw1-idx">03</p>' +
            '<h2 class="for-design">官方渠道</h2>' +
            '<h2 class="for-dev mono">official</h2>' +
            '<p class="for-design">文件取自官方渠道。</p>' +
            '<p class="for-dev mono">official channel only</p>' +
          '</li>' +
        '</ol>' +
        '<p class="hw1-refuse for-design">来路不明的打包文件不收。许可写不清楚的，先标「待核实」，不提供文件，核对完成再更新状态。</p>' +
        '<p class="hw1-refuse for-dev mono">unknown packs out · unclear → 待核实, no file</p>' +
        '<section class="hw1-lex" id="how-status" aria-label="状态词">' +
          '<p class="hw-label for-design">状态词</p>' +
          '<p class="hw-label for-dev mono">offer words</p>' +
          '<div class="hw1-row">' +
            '<b class="for-design">本站下载</b>' +
            '<b class="for-dev mono">offer=source</b>' +
            '<span class="for-design">文件在本站，可以直接下载。</span>' +
            '<span class="for-dev mono">file on this site</span>' +
          '</div>' +
          '<div class="hw1-row">' +
            '<b class="for-design">官方下载</b>' +
            '<b class="for-dev mono">official</b>' +
            '<span class="for-design">本站不存文件，请到厂商或上游官方渠道下载。</span>' +
            '<span class="for-dev mono">no local file</span>' +
          '</div>' +
          '<div class="hw1-row">' +
            '<b class="for-design">暂无下载</b>' +
            '<b class="for-dev mono">offer=pending · textState=full</b>' +
            '<span class="for-design">许可已核实，源文件包还没上架。</span>' +
            '<span class="for-dev mono">no file yet</span>' +
          '</div>' +
          '<div class="hw1-row">' +
            '<b class="for-design">待核实</b>' +
            '<b class="for-dev mono">unverified</b>' +
            '<span class="for-design">许可还没核对完，核对完成前不提供文件。</span>' +
            '<span class="for-dev mono">no file until checked</span>' +
          '</div>' +
          '<div class="hw1-row">' +
            '<b class="for-design">未收录</b>' +
            '<b class="for-dev mono">unlisted</b>' +
            '<span class="for-design">这款字体还没收进镜像，先去上游取。</span>' +
            '<span class="for-dev mono">not in the mirror</span>' +
          '</div>' +
        '</section>' +
        '<div class="hw1-pair">' +
          '<section id="how-evidence">' +
            '<h2 class="for-design">许可怎么取证</h2>' +
            '<h2 class="for-dev mono">evidence</h2>' +
            '<p class="for-design">以字体发布件内嵌的声明为准：安装包里的许可文件、官网许可页、上游仓库的 LICENSE，三者有其一才算拿到原文。</p>' +
            '<p class="for-design">取证时记录来源、日期和文本哈希。哈希的作用是：原文以后被改动或换版时，能对出变化。</p>' +
            '<p class="for-design">每款字体的取证记录，在它的许可原文页里可以查到。</p>' +
            '<p class="for-dev mono">embedded notice · package / page / LICENSE<br />source + date + hash<br />record on the license page</p>' +
          '</section>' +
          '<section id="how-cert">' +
            '<h2 class="for-design">证明怎么签</h2>' +
            '<h2 class="for-dev mono">attest</h2>' +
            '<p class="for-design">只给采用标准开源协议的字体出证，文派（广州）科技有限公司是出证责任主体。出证时申报用途（网页嵌入、印刷物料、软件内嵌、修改衍生、再分发），用途写入证明和台账，作为授权范围的确认记录。每份证明有唯一编号，签发即写入<a href="/attest/ledger">签发台账</a>。</p>' +
            '<p class="for-design">核对收到的证明：编号在台账查得到、内容与台账一致，才是文风签发的。编号对不上的，不是文风签发的证明。</p>' +
            '<p class="for-dev mono">SPDX only · 文派 is the subject<br />usage into cert + ledger · unique serial<br />serial miss → forged</p>' +
          '</section>' +
        '</div>' +
        '<p class="hw-acts">' +
          '<a class="is-pill" href="/source"><span class="for-design">看目录</span><span class="for-dev">/source</span></a>' +
          '<a href="/attest"><span class="for-design">授权证明</span><span class="for-dev">/attest</span></a>' +
          '<a href="/legal"><span class="for-design">法务说明</span><span class="for-dev">/legal</span></a>' +
        '</p>' +
        '<p class="hw-footnote for-design">对照别名 <a href="/how-v1b.html">how-v1b</a>。</p>' +
        '<p class="hw-footnote for-dev mono">howPage · hw-v1b · /how</p>' +
      '</div>' +
    '</section>';
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
      '<p class="tool-aside">台账里没有的编号，或编号对不上内容的，不是文风签发的证明，欢迎来信 <a href="mailto:license@wenfeng.org">license@wenfeng.org</a> 反映。</p>' +
    '</div>';
  }

  function legalPage() {
    return '<section class="lg-hero">' +
      '<div class="container">' +
        '<p class="lg-crumb" aria-label="路径">' +
          '<span class="for-design"><a href="/">首页</a><span class="sep">/</span>法务</span>' +
          '<span class="for-dev mono">/legal · lg-v4</span>' +
        '</p>' +
        '<div class="lg-display">' +
          '<h1 class="for-design">按先后</h1>' +
          '<h1 class="for-dev mono">order</h1>' +
          '<p class="lg-lead for-design">操作说明，不是法律意见。权利以各字体许可原文为准。</p>' +
          '<p class="lg-lead for-dev mono">operating note · not legal advice · five moments</p>' +
        '</div>' +
      '<div class="lg4-seq">' +
      '<section class="lg4-when" id="m-open">' +
      '<div class="lg4-when-head">' +
      '<p class="lg4-k">01</p>' +
      '<h2 class="for-design">打开这页</h2>' +
      '<h2 class="for-dev mono">open</h2>' +
      '</div>' +
      '<div class="lg4-grid">' +
      '<article id="legal-oss">' +
      '<h3 class="for-design">这页是什么</h3>' +
      '<h3 class="for-dev mono">page</h3>' +
      '<p class="for-design">操作说明，不是法律意见。权利以各字体许可原文为准。不能替代律师审查具体项目。</p>' +
      '<p class="for-dev mono">operating note · not a lawyer review</p>' +
      '</article>' +
      '<article>' +
      '<h3 class="for-design">谁在按原文办事</h3>' +
      '<h3 class="for-dev mono">stance</h3>' +
      '<p class="for-design">文派（广州）科技有限公司建立在开源技术之上。我们认可开源协议，并按协议原文履行义务。源文件下载、网页字体服务与授权证明服务，同样建立在开源协议之上。</p>' +
      '<p class="for-dev mono">文派 stands on OSS · download / webfont / attest</p>' +
      '</article>' +
      '<article id="legal-what">' +
      '<h3 class="for-design">证明是什么</h3>' +
      '<h3 class="for-dev mono">what</h3>' +
      '<p class="for-design">《文风字体授权证明》记录某日从某上游取得某款字、许可原文哈希、本站是否提供原件、可否按原文再分发。它用作企业采购、验收时的存档材料。不替代许可原文，不创设新的权利，不是著作权人的授权书，不等于软著登记或公证。没有把著作权转给持证人这种授权。</p>' +
      '<p class="for-dev mono">chain + hash + original? + redist<br />attest ≠ new rights · no assignment · not 软著 · not notary</p>' +
      '</article>' +
      '</div>' +
      '</section>' +
      '<section class="lg4-when" id="m-text">' +
      '<div class="lg4-when-head">' +
      '<p class="lg4-k">02</p>' +
      '<h2 class="for-design">对着原文</h2>' +
      '<h2 class="for-dev mono">text</h2>' +
      '</div>' +
      '<div class="lg4-grid">' +
      '<div class="lg4-span" id="legal-scope">' +
      '<h3 class="for-design">先看协议是不是标准开源</h3>' +
      '<h3 class="for-dev mono">spdx</h3>' +
      '<ul class="lg4-pills for-design">' +
      '<li>SIL Open Font License 1.1</li>' +
      '<li>MIT</li>' +
      '<li>Apache License 2.0</li>' +
      '<li>IPA Font License</li>' +
      '<li>CC0</li>' +
      '<li>CC BY / CC BY-SA（不含 NC）</li>' +
      '<li>M+</li>' +
      '<li>带 Font Exception 的 GPL</li>' +
      '</ul>' +
      '<p class="for-design">上面这些才出证。文派科技作为责任主体，可为合法合规使用的个人及企业出具证明。CC 系出证时，证明内保留作者署名。</p>' +
      '<p class="for-design">厂商自拟协议（如阿里巴巴普惠体授权协议）、仓耳字库免费开源字体授权声明、HarmonyOS / MiSans / OPPO 等厂商条款、只标「免费商用」而无正式协议文本的、许可还没核实的、未收录的：如有授权原文，只提供下载。不出具证明，也不代著作权人签署授权书。是否可商用，以厂商原文为准。常见条款是免费商用、禁止再分发字体文件。</p>' +
      '<p class="for-dev mono">OFL-1.1 · MIT · Apache-2.0 · IPA · CC0 · CC-BY / CC-BY-SA no NC · M+ · GPL+FE<br />CC keeps attribution<br />custom / unverified / unlisted → text only, no attest, no grant</p>' +
      '</div>' +
      '<article id="legal-ofl">' +
      '<h3 class="for-design">OFL 在本站怎么读</h3>' +
      '<h3 class="for-dev mono">ofl</h3>' +
      '<p class="for-design">可以用于网站、印刷、软件内嵌（看原文）。可以修改、再分发，不得单独出售字体本身。保留名未获作者书面允许，派生件不能用原名。切片包若只做技术子集、不改设计，仍标原名，包装可以写「文风切片包」。MIT 更宽。</p>' +
      '<p class="for-dev mono">use / modify / redist · no selling the font alone · RFN · MIT wider</p>' +
      '</article>' +
      '<article id="legal-cn">' +
      '<h3 class="for-design">国内把字库当什么</h3>' +
      '<h3 class="for-dev mono">copyright</h3>' +
      '<p class="for-design">字体作为计算机软件，一般按软件作品保护。单字图形是不是美术作品，法院判决并不统一，不要把「开源」理解成「字形不受保护」。开源许可是著作权人允许使用的书面条款。企业用 OFL / MIT，通常不必再向作者另签授权证明，但采购和验收仍常要归档材料。核验就是给这份材料。侵权投诉仍走著作权人。</p>' +
      '<p class="for-dev mono">software work · glyph-as-art unsettled<br />archive paper ≠ extra grant · complaints to the rightsholder</p>' +
      '</article>' +
      '<article id="legal-soft">' +
      '<h3 class="for-design">文件是软件复制品</h3>' +
      '<h3 class="for-dev mono">software</h3>' +
      '<p class="for-design">TTF / OTF / 源工程在国内常被当作软件复制品。许可允许复制、修改、再分发时，按原文做；禁止再分发时，把文件拷进客户交付包就可能越权。本核验不代替对交付包、安装包、App 内嵌的逐项审查。</p>' +
      '<p class="for-dev mono">file as software copy · no per-package review</p>' +
      '</article>' +
      '</div>' +
      '</section>' +
      '<section class="lg4-when" id="m-lines">' +
      '<div class="lg4-when-head">' +
      '<p class="lg4-k">03</p>' +
      '<h2 class="for-design">看证上三行</h2>' +
      '<h2 class="for-dev mono">lines</h2>' +
      '</div>' +
      '<div class="lg4-grid">' +
      '<article id="legal-issuer">' +
      '<h3 class="for-design">谁签发，名字怎么写</h3>' +
      '<h3 class="for-dev mono">issuer · name</h3>' +
      '<p class="for-design">签发人是文派（广州）科技有限公司。证面品牌是文风，产品是 wenfeng.org。文派不是霞鹜、阿里巴巴、Adobe 等字体的著作权人。证明不是「文派授权你商用这款字」。</p>' +
      '<p class="for-design">收录名写成「文风·」加原名，例如文风·霞鹜文楷。这是平台命名，不是派生作品，也不转移商标。文件内的版权声明、name 表、OFL 保留名仍用原名。本核验只针对未改名的收录原件或切片包。本证不写软著号。</p>' +
      '<p class="for-dev mono">文派（广州）科技有限公司 · not the rightsholder<br />文风· is a catalog name · RFN stays · no 软著 number</p>' +
      '</article>' +
      '<article>' +
      '<h3 class="for-design">三行结论</h3>' +
      '<h3 class="for-dev mono">three lines</h3>' +
      '<p class="for-design">网页嵌入、安装到操作系统、把字体文件再分发给客户，边界不同。证上分开写三行：网页嵌入、再分发原件、本平台是否提供原件。嵌入网页 CSS 与把原件放进安装程序，不是同一件事。</p>' +
      '<p class="for-dev mono">embed / redist original / site offers the file<br />CSS embed ≠ installer</p>' +
      '</article>' +
      '<article id="legal-sign">' +
      '<h3 class="for-design">签名验的是改没改过</h3>' +
      '<h3 class="for-dev mono">sign</h3>' +
      '<p class="for-design">平台密钥签名，贴到核对页即可验证内容是否被改过。不是可靠电子签名，也不是 CA 签发的数字证书。不要交给公证处当「已公证」。JSON 可以作辅助证据：某日平台对某哈希、某 SPDX 做过签名。</p>' +
      '<p class="for-dev mono">platform key · not reliable e-sign · not CA<br />JSON is auxiliary · 印迹 unrelated</p>' +
      '</article>' +
      '</div>' +
      '</section>' +
      '<section class="lg4-when" id="m-file">' +
      '<div class="lg4-when-head">' +
      '<p class="lg4-k">04</p>' +
      '<h2 class="for-design">放进档案</h2>' +
      '<h2 class="for-dev mono">archive</h2>' +
      '</div>' +
      '<div class="lg4-grid">' +
      '<div class="lg4-span" id="legal-buy">' +
      '<h3 class="for-design">采购留下这四样</h3>' +
      '<h3 class="for-dev mono">keep</h3>' +
      '<ol class="lg4-steps for-design">' +
      '<li>保存本核验 PDF / 打印件和 JSON。</li>' +
      '<li>保存许可原文（本站 <a href="/license">/license/{短码}</a>）。</li>' +
      '<li>若拿走了原件，保存当时的归档包和哈希，复核时要用。</li>' +
      '<li>持证单位栏只表示这一份副本放在哪家单位的档案里，不等于被授权人。</li>' +
      '</ol>' +
      '<p class="for-dev mono">PDF + JSON · license text · hash if taken · holder ≠ licensee</p>' +
      '</div>' +
      '<div class="lg4-span" id="legal-redist">' +
      '<h3 class="for-design">要带走文件的时候</h3>' +
      '<h3 class="for-dev mono">redist</h3>' +
      '<p class="for-design">许可允许再分发、本站也提供原件的（目录里标「本站下载」）：可以按原文带走原件。厂商不允许再分发的字体：本站不提供文件，也不出证。若你已从厂商取得原件，可在 <a href="/slice">/slice/{短码}/</a> 上传核验后领取自托管切片包。核验在浏览器内完成：体积只作预检，识别以整包摘要为准（生产对照本站收录的 SHA-256，厂商若公布 MD5 则并列）。本原型只模拟流程，不上传服务器，也不把原件再切一遍。</p>' +
      '<p class="for-design">不要把 <code>cn.windfonts.com</code> 的 woff2 拷走当源文件。嵌入代码里的 <code>https://wenfeng.org/license</code> 不能改。OFL 禁止单独出售字体本身。厂商不允许再分发的字体，更不能卖文件。</p>' +
      '<p class="for-dev mono">offer=source → original · else no file / no attest<br />/slice after you hold the file · SHA-256 · prototype does not upload<br />do not copy woff2 · do not edit the license URL · no selling the file</p>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<section class="lg4-when" id="m-mail">' +
      '<div class="lg4-when-head">' +
      '<p class="lg4-k">05</p>' +
      '<h2 class="for-design">有异议再写信</h2>' +
      '<h2 class="for-dev mono">mail</h2>' +
      '</div>' +
      '<div class="lg4-grid">' +
      '<article id="legal-phish">' +
      '<h3 class="for-design">还没核对的</h3>' +
      '<h3 class="for-dev mono">unverified</h3>' +
      '<p class="for-design">许可尚未核对、或源文件还没进镜像的款，不出核验。不要把店面能预览当成可以安装、可以再分发。钓鱼条款、个人免费、登录墙领取，一律按原文。拿不准就当不能带走。</p>' +
      '<p class="for-dev mono">no attest · preview ≠ install · read the text</p>' +
      '</article>' +
      '<article id="legal-takedown">' +
      '<h3 class="for-design">写给 license@wenfeng.org</h3>' +
      '<h3 class="for-dev mono">takedown</h3>' +
      '<p class="for-design">收录信息有误，或对某条目有权利主张，写信到 <a href="mailto:license@wenfeng.org">license@wenfeng.org</a>，说明是哪一条、问题在哪（权利人请附权利证明）。核实期间，该条目标为「待核实」，暂停出证，也不提供文件。确认有误就下架，变更记录留在目录状态里；文风下架以核验页和目录状态为准。被下架的一方有异议，同样来信说明；是否恢复，按最新核对结果处理。</p>' +
      '<p class="for-dev mono">license@wenfeng.org · hold as 待核实 · catalog status is the record</p>' +
      '</article>' +
      '<article id="legal-name">' +
      '<h3 class="for-design">另走的程序</h3>' +
      '<h3 class="for-dev mono">later</h3>' +
      '<p class="for-design">派生件若以后出现，必须另起新名，不能带保留名。需要公证或电子认证时，另走法定程序，不要拿这张证明去顶。</p>' +
      '<p class="for-dev mono">future derivative needs a new name · notary is a separate process</p>' +
      '</article>' +
      '</div>' +
      '</section>' +
      '</div>' +
        '<p class="lg-acts">' +
          '<a class="is-pill" href="/attest"><span class="for-design">授权证明</span><span class="for-dev">/attest</span></a>' +
          '<a href="/license"><span class="for-design">许可原文</span><span class="for-dev">/license</span></a>' +
          '<a href="/how"><span class="for-design">我们怎么核</span><span class="for-dev">/how</span></a>' +
        '</p>' +
      '</div>' +
    '</section>';
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

  function gapPage() {
    return '<section class="gp-hero">' +
      '<div class="container">' +
        '<p class="gp-crumb" aria-label="路径">' +
          '<span class="for-design"><a href="/">首页</a> / 报缺字 · 样例未提交</span>' +
          '<span class="for-dev mono">/gap · gp-v1b</span>' +
        '</p>' +
        '<div class="gp-display">' +
          '<h1 class="for-design">报缺字</h1>' +
          '<h1 class="for-dev mono">/gap</h1>' +
          '<p class="gp-lead for-design">一条短笺。<br class="gp-br" />缺字形、缺收录、写错了，三件事里报一件。</p>' +
          '<p class="gp-lead for-dev mono">kind=glyph|catalog|errata<br />POST 未接 · 无 coverage · 无账号 · sample glyph</p>' +
        '</div>' +
        '<section class="gp1-stage" aria-label="写一条短笺">' +
          '<div class="gp1-letter">' +
            '<p class="gp1-kicker for-design">短笺</p>' +
            '<p class="gp1-kicker for-dev mono">one record</p>' +
            '<div class="gp1-kinds" role="tablist" aria-label="这一条是哪一件事">' +
              '<button type="button" role="tab" id="tab-glyph" data-kind="glyph" aria-controls="pane-glyph" aria-selected="true" class="is-on">缺字形</button>' +
              '<button type="button" role="tab" id="tab-catalog" data-kind="catalog" aria-controls="pane-catalog" aria-selected="false">缺收录</button>' +
              '<button type="button" role="tab" id="tab-errata" data-kind="errata" aria-controls="pane-errata" aria-selected="false">勘误</button>' +
            '</div>' +
            '<div class="gp1-fields" id="pane-glyph" role="tabpanel" aria-labelledby="tab-glyph" data-pane="glyph">' +
              '<label class="gp-field">' +
                '<span class="k for-design">哪一款</span><span class="k for-dev mono">norm</span>' +
                '<input type="text" value="文风·霞鹜文楷" />' +
              '</label>' +
              '<label class="gp-field is-char">' +
                '<span class="k for-design">缺的字</span><span class="k for-dev mono">codepoint</span>' +
                '<input type="text" value="龘" maxlength="8" />' +
              '</label>' +
              '<label class="gp-field">' +
                '<span class="k for-design">在哪看到</span><span class="k for-dev mono">note</span>' +
                '<textarea rows="2">版式样例。不是已提交的反馈，也不表示这一款真的缺这个字。</textarea>' +
              '</label>' +
              '<label class="gp-field">' +
                '<span class="k for-design">怎么回</span><span class="k for-dev mono">contact?</span>' +
                '<input type="text" placeholder="可选。不建账号" />' +
              '</label>' +
            '</div>' +
            '<div class="gp1-fields" id="pane-catalog" role="tabpanel" aria-labelledby="tab-catalog" data-pane="catalog" hidden>' +
              '<label class="gp-field">' +
                '<span class="k for-design">字体名</span><span class="k for-dev mono">name</span>' +
                '<input type="text" placeholder="目录里没有的名字" />' +
              '</label>' +
              '<label class="gp-field">' +
                '<span class="k for-design">谁做的</span><span class="k for-dev mono">foundry</span>' +
                '<input type="text" placeholder="作者或厂商" />' +
              '</label>' +
              '<label class="gp-field">' +
                '<span class="k for-design">出处</span><span class="k for-dev mono">upstream</span>' +
                '<input type="text" placeholder="仓库或发布页" />' +
              '</label>' +
              '<label class="gp-field">' +
                '<span class="k for-design">怎么回</span><span class="k for-dev mono">contact?</span>' +
                '<input type="text" placeholder="可选。不建账号" />' +
              '</label>' +
            '</div>' +
            '<div class="gp1-fields" id="pane-errata" role="tabpanel" aria-labelledby="tab-errata" data-pane="errata" hidden>' +
              '<label class="gp-field">' +
                '<span class="k for-design">哪一款</span><span class="k for-dev mono">norm</span>' +
                '<input type="text" placeholder="短码或中文名" />' +
              '</label>' +
              '<label class="gp-field">' +
                '<span class="k for-design">错在哪</span><span class="k for-dev mono">field</span>' +
                '<input type="text" placeholder="名字、许可或状态" />' +
              '</label>' +
              '<label class="gp-field">' +
                '<span class="k for-design">应是</span><span class="k for-dev mono">correction</span>' +
                '<textarea rows="2" placeholder="写出你看到的原文"></textarea>' +
              '</label>' +
              '<label class="gp-field">' +
                '<span class="k for-design">怎么回</span><span class="k for-dev mono">contact?</span>' +
                '<input type="text" placeholder="可选。不建账号" />' +
              '</label>' +
            '</div>' +
            '<p class="gp1-acts">' +
              '<button type="button" data-hold>提交</button>' +
              '<a href="/source">先去目录核对</a>' +
              '<a href="/license">许可原文</a>' +
            '</p>' +
            '<p class="gp1-quiet for-design" data-hold-note hidden>入口还没接上。这一下没有送出。</p>' +
            '<p class="gp1-quiet for-dev mono">click → no request · POST not wired</p>' +
          '</div>' +
          '<aside class="gp1-dossier" aria-label="边界">' +
            '<p class="label for-design">边界</p>' +
            '<p class="label for-dev mono">bounds</p>' +
            '<div class="gp1-kv">' +
              '<div><span class="k for-design">覆盖率</span><span class="k for-dev">coverage</span><span class="v for-design">不统计。缺一个字就是缺一个字</span><span class="v for-dev mono">no rate</span></div>' +
              '<div><span class="k for-design">账号</span><span class="k for-dev">auth</span><span class="v for-design">不建账号。联系方式可留可不留</span><span class="v for-dev mono">no account</span></div>' +
              '<div><span class="k for-design">已收录</span><span class="k for-dev">/source</span><span class="v for-design">在目录里的，报缺字或勘误，不要再报缺收录</span><span class="v for-dev mono">in catalog → not this kind</span></div>' +
              '<div><span class="k for-design">许可</span><span class="k for-dev">/license</span><span class="v for-design">写错了去勘误。原文仍以许可页为准</span><span class="v for-dev mono">textState · 不改原文</span></div>' +
              '<div><span class="k for-design">入口</span><span class="k for-dev">POST</span><span class="v for-design">表单还没接上，这一下不会送出</span><span class="v for-dev mono">/gap · click → no request</span></div>' +
            '</div>' +
          '</aside>' +
        '</section>' +
        '<p class="gp-footnote for-design">样例里的字只是版式，不代表霞鹜文楷真的缺这个字。提交不会送出。对照别名 <a href="/gap-v1b.html">gap-v1b</a>。</p>' +
        '<p class="gp-footnote for-dev mono">gapPage · gp-v1b · /gap · no POST</p>' +
      '</div>' +
    '</section>';
  }

  function titles(route, extra) {
    var map = {
      home: '源文件',
      list: '目录',
      font: extra || '字体',
      licenses: '查授权',
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
      gap: '报缺字',
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
    var zipName = 'wenfeng-' + ctx.f.norm + '-proto.zip';
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
    var kindBtn = ev.target.closest('.gp1-kinds [data-kind]');
    if (kindBtn) {
      var kind = kindBtn.getAttribute('data-kind');
      document.querySelectorAll('.gp1-kinds [data-kind]').forEach(function (b) {
        var on = b === kindBtn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      document.querySelectorAll('[data-pane]').forEach(function (pane) {
        pane.hidden = pane.getAttribute('data-pane') !== kind;
      });
      return;
    }
    var hold = ev.target.closest('[data-hold]');
    if (hold) {
      var holdNote = document.querySelector('[data-hold-note]');
      if (holdNote) holdNote.hidden = false;
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
    if (route.page === 'home' && !document.getElementById('wf-home-v-css')) {
      var hvCss = document.createElement('link');
      hvCss.id = 'wf-home-v-css';
      hvCss.rel = 'stylesheet';
      hvCss.href = '/css/home-versions.css';
      document.head.appendChild(hvCss);
    }
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
      document.body.className = route.page === 'home' ? 'hv hv-v4' : (route.page === 'licenses' ? 'lq lq-v5b' : (route.page === 'list' ? 'sd sd-v2b' : (route.page === 'license' ? 'lp lp-v10' : (route.page === 'legal' ? 'lg lg-v4' : (route.page === 'font' ? 'fd fd-v1b' : (route.page === 'gap' ? 'gp gp-v1b' : (route.page === 'about' ? 'ab ab-v6b' : (route.page === 'how' ? 'hw hw-v1b' : (route.page === 'use' ? 'us us-v4b' : ('page-' + route.page))))))))));
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
    else if (route.page === 'gap') inner = gapPage();
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

  if ((location.pathname === '/' || location.pathname === '/index.html') && location.hash === '#gap') {
    location.replace('/gap');
  }

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
