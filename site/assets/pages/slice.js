/* 切片工具：本机核验官方 zip，通过后领取样张包。兼管条目页代码复制与示例标签。 */
(function () {
  'use strict';

  document.addEventListener('click', function (ev) {
    var tab = ev.target.closest('[data-fn-tab]');
    if (tab) {
      var root = tab.closest('[data-fn-tabs]');
      var howto = tab.closest('.fn-take-howto') || (root && root.parentElement);
      if (!howto) return;
      ev.preventDefault();
      var id = tab.getAttribute('data-fn-tab');
      howto.querySelectorAll('[data-fn-tab]').forEach(function (b) {
        var on = b === tab;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      howto.querySelectorAll('[data-fn-panel]').forEach(function (p) {
        if (p.getAttribute('data-fn-panel') === id) p.removeAttribute('hidden');
        else p.setAttribute('hidden', '');
      });
      return;
    }
    var btn = ev.target.closest('[data-fn-copy]');
    if (!btn) return;
    var wrap = btn.closest('.code');
    var pre = wrap && wrap.querySelector('pre');
    if (!pre || !navigator.clipboard) return;
    ev.preventDefault();
    navigator.clipboard.writeText(pre.textContent || '').then(function () {
      var old = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = old; }, 1500);
    });
  });

  var el = document.getElementById('slice');
  if (!el) return;

  function icon(name) {
    return '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function hrefAttrs(href) {
    return /^https?:/i.test(href || '') ? ' target="_blank" rel="noopener noreferrer"' : '';
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
    if (u8[0] === 0x50 && u8[1] === 0x4b && (u8[2] === 0x03 || u8[2] === 0x05 || u8[2] === 0x07)) return 'zip';
    if (u8[0] === 0x77 && u8[1] === 0x4f && u8[2] === 0x46 && u8[3] === 0x32) return 'woff2';
    if (u8[0] === 0x77 && u8[1] === 0x4f && u8[2] === 0x46 && u8[3] === 0x46) return 'woff';
    if (u8[0] === 0x00 && u8[1] === 0x01 && u8[2] === 0x00 && u8[3] === 0x00) return 'ttf';
    if (u8[0] === 0x4f && u8[1] === 0x54 && u8[2] === 0x54 && u8[3] === 0x4f) return 'otf';
    if (u8[0] === 0x74 && u8[1] === 0x74 && u8[2] === 0x63 && u8[3] === 0x66) return 'ttc';
    return '';
  }
  function kindWord(kind) {
    if (kind === 'zip') return 'Zip 包';
    if (kind === 'otf') return 'OpenType';
    if (kind === 'ttf') return 'TrueType';
    if (kind === 'ttc') return '字体集合';
    if (kind === 'woff' || kind === 'woff2') return '网页字体';
    return kind || '未识别';
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

  function ctxOf() {
    return {
      mode: el.getAttribute('data-mode') || 'gate',
      f: {
        norm: el.getAttribute('data-norm') || '',
        name: el.getAttribute('data-name') || '',
        en: el.getAttribute('data-en') || '',
        foundry: el.getAttribute('data-foundry') || ''
      },
      gate: {
        accept: (el.getAttribute('data-accept') || 'zip').split(',').filter(Boolean),
        minBytes: parseInt(el.getAttribute('data-min') || '20480', 10) || 20480,
        nameHints: (el.getAttribute('data-hints') || '').split(',').filter(Boolean),
        sha256: el.getAttribute('data-sha256') || '',
        origin: el.getAttribute('data-origin')
          ? { href: el.getAttribute('data-origin'), label: el.getAttribute('data-origin-label') || '' }
          : null
      },
      comment: el.getAttribute('data-comment') || ''
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
      kindLabel: kindWord(kind)
    };
    if (!kind) {
      st.reason = '请放入尚未解压的官方 zip。';
      return { ok: false, st: st };
    }
    if (kind === 'woff' || kind === 'woff2') {
      st.reason = '这是网页字体。请放入厂商原包 zip。';
      return { ok: false, st: st };
    }
    if (gate.accept.indexOf(kind) === -1) {
      st.reason = (kind === 'otf' || kind === 'ttf' || kind === 'ttc')
        ? '这是单只字体。请放入尚未解压的官方 zip。'
        : '请放入尚未解压的官方 zip。';
      return { ok: false, st: st };
    }
    if (file.size < gate.minBytes) {
      st.reason = '体积还不到这一款原包的下限。换官方整包再试。';
      return { ok: false, st: st };
    }
    if (gate.nameHints.length && !hintHit(file.name, gate.nameHints)) {
      st.reason = '文件名对这一款还不吻合。请用官方包名。';
      return { ok: false, st: st };
    }
    return { ok: true, st: st };
  }

  function rows(st) {
    function row(k, v, cls) {
      return '<div class="tool-kv"><span class="tool-kv-k">' + k +
        '</span><span class="tool-kv-v' + (cls ? ' ' + cls : '') + '">' + v + '</span></div>';
    }
    var html = '';
    if (st.name) html += row('文件', esc(st.name));
    if (st.sizeWord) html += row('体积', esc(st.sizeWord));
    if (st.sha256) html += row('SHA-256', esc(st.sha256), 'is-hash');
    return html ? '<div class="tool-kvlist">' + html + '</div>' : '';
  }

  function appendDev(field) {
    return field ? '<span class="for-dev mono"> · ' + field + '</span>' : '';
  }

  function stage(n, title, inner, cls, field) {
    return '<section class="tool-stage' + (cls ? ' ' + cls : '') + '">' +
      '<p class="tool-idx">' + n + '</p>' +
      '<div class="tool-slot">' +
      '<h2>' + title + appendDev(field) + '</h2>' +
      inner + '</div></section>';
  }

  function intake(st, phase) {
    var file = '<input class="sr-only" type="file" data-slice-input accept=".zip,application/zip">';
    if (phase === 'idle') {
      return '<label class="tool-intake" data-slice-drop>' + file +
        '<span class="tool-intake-kicker">官方 zip' + appendDev('.zip') + '</span>' +
        '<span class="tool-intake-title">' + icon('upload') + '放入尚未解压的原包</span>' +
        '<span class="tool-intake-meta">拖入此栏，或点这里选择' + appendDev('local only') + '</span></label>';
    }
    return '<label class="tool-held" data-slice-drop>' + file +
      '<span class="tool-held-main"><span class="tool-held-name">' + esc(st.name || '原包') +
      '</span>' + (st.sizeWord ? '<span class="tool-held-meta">' + esc(st.sizeWord) + '</span>' : '') +
      '</span><span class="tool-held-act">更换</span></label>';
  }

  function packSlot(f, phase) {
    var packName = '文风切片包 · ' + esc(f.name);
    if (phase === 'ok' || phase === 'ready') {
      return '<p class="tool-pack-name">' + packName + appendDev('wenfeng') + '</p>' +
        '<p class="tool-note">woff2 与 CSS，供自托管。</p>' +
        '<p class="tool-actions">' +
        '<button type="button" class="btn btn-ink btn-take" data-slice-download>' +
        icon('download') + '下载切片包</button></p>';
    }
    if (phase === 'slice') {
      return '<p class="tool-pack-name">' + packName + '</p>' +
        '<p class="tool-note">正在装配即用字库。</p>' +
        '<div class="tool-slice-bar" aria-hidden="true"></div>';
    }
    return '<p class="tool-pack-name">' + packName + appendDev('wenfeng') + '</p>' +
      '<p class="tool-note">通过后在此领取。</p>';
  }

  function chromeOf() {
    return (el && el.getAttribute('data-chrome')) || 'board';
  }

  function quietOpen(f) {
    return '<div class="tool-quiet" aria-live="polite">' +
      '<p class="tool-actions">' +
      '<button type="button" class="btn btn-ink btn-take" data-slice-download>' +
      icon('download') + '下载切片包</button></p></div>';
  }

  function quietGate(f, phase, st, gate) {
    st = st || {};
    gate = gate || {};
    var origin = gate.origin && gate.origin.href ? gate.origin : null;
    if (phase === 'idle' || phase === 'work') {
      return '<div class="tool-quiet" aria-live="polite">' +
        intake(st, phase === 'work' ? 'held' : 'idle') +
        (phase === 'idle' && origin
          ? '<p class="tool-origin">原包在<a href="' + esc(origin.href) + '"' + hrefAttrs(origin.href) + '>' +
            esc(origin.label) + '</a>取。</p>'
          : '') +
        (phase === 'work' ? '<p class="tool-note">正在核验。</p>' : '') +
        '</div>';
    }
    if (phase === 'slice') {
      return '<div class="tool-quiet" aria-live="polite">' +
        intake(st, 'held') +
        '<p class="tool-note">核验通过，正在装配。</p>' +
        '<div class="tool-slice-bar" aria-hidden="true"></div></div>';
    }
    if (phase === 'ok') {
      return '<div class="tool-quiet" aria-live="polite">' +
        intake(st, 'held') +
        '<p class="tool-verdict">' + icon('verified') + '可领取</p>' +
        '<p class="tool-actions">' +
        '<button type="button" class="btn btn-ink btn-take" data-slice-download>' +
        icon('download') + '下载切片包</button></p></div>';
    }
    return '<div class="tool-quiet" aria-live="polite">' +
      intake(st, 'held') +
      '<p class="tool-verdict">' + icon('close') + esc(st.reason || '请换官方 zip 再试') + '</p>' +
      '<p class="tool-actions"><button type="button" class="btn" data-slice-reset>' +
      icon('refresh') + '重新核验</button></p></div>';
  }

  function board(f, phase, st, gate, mode) {
    st = st || {};
    gate = gate || {};
    mode = mode || 'gate';
    if (chromeOf() === 'quiet') {
      return mode === 'open' ? quietOpen(f) : quietGate(f, phase, st, gate);
    }
    if (mode === 'open') {
      return '<div class="tool-board" aria-live="polite">' +
        stage('01', '原包', '<p class="tool-note">开源切片，不必交原包。</p>', 'is-lock', 'zip') +
        stage('02', '状态', '<p class="tool-verdict">' + icon('verified') + '可领取</p>' +
          '<p class="tool-note">按许可原文直接下载即用字库。</p>', '', 'status') +
        stage('03', '切片包', packSlot(f, 'ready'), '', 'pack') +
        '</div>';
    }
    var checkSlot, checkCls = '';
    if (phase === 'idle') {
      checkCls = 'is-wait';
      checkSlot = '<p class="tool-note">放入原包后核验。这是免责步骤，文件留在这一页。' +
        appendDev('SHA-256') + '</p>';
    } else if (phase === 'work') {
      checkCls = 'is-work';
      checkSlot = '<p class="tool-note">正在核验原包。</p>';
    } else if (phase === 'slice') {
      checkCls = 'is-work';
      checkSlot = '<p class="tool-verdict">' + icon('verified') + '核验通过</p>' +
        '<p class="tool-note">正在装配即用字库。</p>' + rows(st);
    } else if (phase === 'ok') {
      checkSlot = '<p class="tool-verdict">' + icon('verified') + '核验通过</p>' +
        '<p class="tool-note">即用字库已就绪。</p>' + rows(st);
    } else {
      checkCls = 'is-bad';
      checkSlot = '<p class="tool-verdict">' + icon('close') + esc(st.reason || '请换官方 zip 再试') + '</p>' +
        rows(st) +
        '<p class="tool-actions"><button type="button" class="btn" data-slice-reset>' +
        icon('refresh') + '重新核验</button></p>';
    }
    var origin = gate.origin && gate.origin.href ? gate.origin : null;
    var inHtml = intake(st, phase === 'ok' || phase === 'slice' ? 'held' : phase) +
      (phase === 'idle' && origin
        ? '<p class="tool-origin">原包在<a href="' + esc(origin.href) + '"' + hrefAttrs(origin.href) + '>' +
          esc(origin.label) + '</a>取。' + appendDev('origin') + '</p>'
        : '');
    var outCls = (phase === 'ok') ? '' : (phase === 'slice' ? 'is-work' : 'is-lock');
    return '<div class="tool-board" aria-live="polite">' +
      stage('01', '原包', inHtml, '', 'zip') +
      stage('02', '核验', checkSlot, checkCls, 'hash') +
      stage('03', '切片包', packSlot(f, phase), outCls, 'pack') +
      '</div>';
  }


  function revealHowto() {
    var d = document.getElementById('howto');
    if (!d) return;
    try {
      d.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {
      d.scrollIntoView(true);
    }
  }

  function paint(html) {
    var body = document.querySelector('[data-slice-body]');
    if (body) body.innerHTML = html;
  }

  function runFile(file) {
    var ctx = ctxOf();
    if (!file) return;
    paint(board(ctx.f, 'work', { name: file.name, sizeWord: bytesWord(file.size) }, ctx.gate, ctx.mode));
    file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var judged = judgeSlice(file, bytes, ctx.gate);
      var st = judged.st;
      return sha256hex(buf).then(function (sha) {
        st.sha256 = sha;
        if (judged.ok && ctx.gate.sha256 && String(sha || '').toLowerCase() !== String(ctx.gate.sha256).toLowerCase()) {
          judged.ok = false;
          st.reason = '整包 SHA-256 与收录记录还对不上。请确认取自官方渠道。';
        }
        return judged;
      });
    }).then(function (judged) {
      el._sliceState = judged.st;
      if (!judged.ok) {
        el._sliceOk = false;
        paint(board(ctx.f, 'bad', judged.st, ctx.gate, ctx.mode));
        return;
      }
      paint(board(ctx.f, 'slice', judged.st, ctx.gate, ctx.mode));
      setTimeout(function () {
        el._sliceOk = true;
        paint(board(ctx.f, 'ok', judged.st, ctx.gate, ctx.mode));
        revealHowto();
      }, 1600);
    }).catch(function (err) {
      paint(board(ctxOf().f, 'bad', { reason: '文件读不出来：' + err.message, name: file.name }, ctxOf().gate, ctxOf().mode));
    });
  }

  function downloadProto(ctx, st, note) {
    var name = ctx.f.name || ctx.f.norm;
    var zipName = 'wenfeng-' + ctx.f.norm + '-proto.zip';
    var readme =
      '文风切片包 · ' + name + '\n' +
      '样张包。核验通过后领取，生产环境换成真实 woff2。\n\n' +
      '核验文件：' + (st.name || '') + '\n' +
      '体积：' + (st.sizeWord || '') + '\n' +
      'SHA-256：' + (st.sha256 || '') + '\n\n' +
      '解压到主题或 wp-content/fonts，引入 fonts.css。\n' +
      '保留注释里的 https://wenfeng.org/license\n';
    var css =
      '/* 文风切片包 · ' + name + '\n   ' + note + '\n*/\n' +
      '@font-face {\n' +
      '  font-family: "' + (ctx.f.en || name) + '";\n' +
      '  font-weight: 400;\n' +
      '  font-display: swap;\n' +
      '  src: url("./woff2/' + ctx.f.norm + '-Regular.woff2") format("woff2");\n' +
      '}\n';
    saveZip(zipName, [
      { name: 'README.txt', body: readme },
      { name: 'fonts.css', body: css },
      { name: 'woff2/README.txt', body: '生产环境在此放置切片 woff2。\n' }
    ]);
  }

  function saveZip(zipName, files) {
    var blob = new Blob([zipStore(files)], { type: 'application/zip' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function packRelWoff2(css) {
    var re = /url\(["']?(\.\/[^"'()\s]+\.woff2)["']?\)/g;
    var out = [];
    var m;
    while ((m = re.exec(css))) {
      if (out.indexOf(m[1]) === -1) out.push(m[1]);
    }
    return out;
  }

  function downloadPack() {
    var ctx = ctxOf();
    if (!el._sliceOk) return;
    var st = el._sliceState || {};
    var name = ctx.f.name || ctx.f.norm;
    var note = (ctx.comment || '').replace(/^<!--\s*|\s*-->$/g, '');
    var cssUrl = el.getAttribute('data-pack-css') || '';
    var btn = document.querySelector('[data-slice-download]');
    function busy(on) {
      if (!btn) return;
      btn.disabled = !!on;
      btn.setAttribute('aria-busy', on ? 'true' : 'false');
    }
    if (!cssUrl) {
      downloadProto(ctx, st, note);
      return;
    }
    busy(true);
    fetch(cssUrl).then(function (r) {
      if (!r.ok) throw new Error('css ' + r.status);
      return r.text();
    }).then(function (css) {
      var rels = packRelWoff2(css);
      if (!rels.length) throw new Error('no woff2');
      var fontsCss = '/* 文风切片包 · ' + name + '\n   ' + note + '\n*/\n' +
        css.replace(/url\(["']?\.\/([^"'()\s]+)["']?\)/g, 'url("./woff2/$1")');
      var readme =
        '文风切片包 · ' + name + '\n' +
        'woff2 与 CSS，供自托管。\n\n' +
        '核验文件：' + (st.name || '') + '\n' +
        '体积：' + (st.sizeWord || '') + '\n' +
        'SHA-256：' + (st.sha256 || '') + '\n\n' +
        '解压到主题或 wp-content/fonts，引入 fonts.css。\n' +
        '保留注释里的 https://wenfeng.org/license\n';
      return Promise.all(rels.map(function (rel) {
        var href = new URL(rel, cssUrl).href;
        return fetch(href).then(function (r) {
          if (!r.ok) throw new Error(rel + ' ' + r.status);
          return r.arrayBuffer();
        }).then(function (buf) {
          return { name: 'woff2/' + rel.replace(/^\.\//, ''), body: new Uint8Array(buf) };
        });
      })).then(function (bins) {
        saveZip('wenfeng-' + ctx.f.norm + '.zip', [
          { name: 'README.txt', body: readme },
          { name: 'fonts.css', body: fontsCss }
        ].concat(bins));
      });
    }).catch(function () {
      downloadProto(ctx, st, note);
    }).then(function () { busy(false); }, function () { busy(false); });
  }

  document.addEventListener('change', function (ev) {
    var input = ev.target.closest('[data-slice-input]');
    if (input && input.files && input.files[0]) runFile(input.files[0]);
  });
  document.addEventListener('click', function (ev) {
    if (ev.target.closest('[data-slice-download]')) {
      ev.preventDefault();
      downloadPack();
    }
    if (ev.target.closest('[data-slice-reset]')) {
      ev.preventDefault();
      el._sliceOk = false;
      el._sliceState = null;
      paint(board(ctxOf().f, 'idle', null, ctxOf().gate, ctxOf().mode));
    }
  });
  document.addEventListener('dragover', function (ev) {
    if (!ev.target.closest('[data-slice-drop]')) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'copy';
    ev.target.closest('[data-slice-drop]').classList.add('is-over');
  });
  document.addEventListener('dragleave', function (ev) {
    var z = ev.target.closest('[data-slice-drop]');
    if (z) z.classList.remove('is-over');
  });
  document.addEventListener('drop', function (ev) {
    var z = ev.target.closest('[data-slice-drop]');
    if (!z) return;
    ev.preventDefault();
    z.classList.remove('is-over');
    var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (file) runFile(file);
  });

  var boot = ctxOf();
  if (boot.mode === 'open') el._sliceOk = true;
  paint(board(boot.f, boot.mode === 'open' ? 'ready' : 'idle', null, boot.gate, boot.mode));
})();
