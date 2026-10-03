/* 文风字体 v4 · 嵌入代码生成 + 体积估算。依赖 wf-proto.js */
(function () {
  const esc = WFProto.escapeHtml;
  function apiOrigin() { return WFProto.cdnOrigin(); }
  const BYTES_PER_GLYPH = 290; /* woff2 中文字形均值（估算） */
  const OVERHEAD = 2048;

  /* 公开预制四档（与 /api/css?subset= 对齐）；更细的自选字走控制台项目 */
  const VERSIONS = [
    { id: 'zh-common', label: '常用', hint: '常用字 · 品牌短文案首选', glyphs: function (f) { return Math.min(f.glyphCount || 3500, 3500); } },
    { id: 'zh', label: '中文', hint: '中文正文向子集', glyphs: function (f) { return Math.min(f.glyphCount || 7000, 7000); } },
    { id: 'en', label: '西文', hint: '拉丁字母与常用标点', glyphs: function () { return 230; } },
    { id: 'full', label: '完整', hint: '尽量全量字形', glyphs: function (f) { return f.glyphCount || f.charCount || 8000; } }
  ];
  const DEFAULT_VERSION = 'zh-common';

  function estimateBytes(glyphs) { return Math.max(OVERHEAD, Math.round(glyphs * BYTES_PER_GLYPH + OVERHEAD)); }
  function fmtBytes(b) {
    if (b >= 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
    if (b >= 1024) return Math.round(b / 1024) + ' KB';
    return b + ' B';
  }
  function versionSize(font, versionId) {
    const v = VERSIONS.filter(function (x) { return x.id === versionId; })[0] || VERSIONS[0];
    return estimateBytes(v.glyphs(font));
  }

  function itemsNeedCert(items) {
    return (items || []).some(function (it) { return !!(it && it.certGrant); });
  }

  function fileUrl(it, weight, structure, origin) {
    if (it && it.certGrant && WFProto.certCssApiUrl) {
      /* 账号级：忽略 CDN / 静态拆包；主机固定 vault CSS_API */
      return WFProto.certCssApiUrl(it.family, weight);
    }
    const version = it.version && it.version !== 'full' ? it.version : 'full';
    const host = origin || WFProto.cdnOrigin();
    if (structure === 'static') {
      /* 静态路径无法做缺口裁切；有 fallback 时仍只出主款，避免误导双链 */
      return WFProto.cssUrl(it.family, weight, version === 'zh-common' ? 'zh' : version, host);
    }
    return WFProto.cssApiUrl(it.family, weight, version, host, {
      fallback: it.fallbackFamily || '',
      fallbackWeight: it.fallbackWeight || '',
      localeFallback: it.localeFallback || ''
    });
  }

  /** 嵌入体积预算：有包体清单用 CSS 档字节，否则启发式 */
  function budgetEstimate(items, resolveFont) {
    resolveFont = resolveFont || function () { return null; };
    let primary = 0;
    let ceiling = 0;
    let mode = 'solo';
    let peerName = '';
    let fromManifest = false;
    (items || []).forEach(function (it) {
      const font = resolveFont(it.family) || { glyphCount: it.glyphCount || 8000 };
      const n = (it.weights && it.weights.length) || 1;
      const subset = it.version || DEFAULT_VERSION;
      let base = null;
      if (window.WFLive && WFLive.packageCssBytes) {
        const b = WFLive.packageCssBytes(font, subset);
        if (b != null) { base = b * n; fromManifest = true; }
      }
      if (base == null) base = versionSize(font, subset) * n;
      primary += base;
      const peerFam = it.fallbackFamily || it.localePeer || '';
      if (peerFam || it.localeFallback) {
        mode = 'clipped';
        const peer = resolveFont(peerFam) || font;
        peerName = (peer && peer.name) || peerFam || '补全款';
        let peerBytes = null;
        if (window.WFLive && WFLive.packageCssBytes) peerBytes = WFLive.packageCssBytes(peer, subset);
        ceiling += base + (peerBytes != null ? peerBytes * n : versionSize(peer, subset) * n);
      } else {
        ceiling += base;
      }
    });
    return {
      mode: mode,
      primary: primary,
      ceiling: ceiling,
      peerName: peerName,
      fromManifest: fromManifest,
      primaryLabel: fmtBytes(primary),
      ceilingLabel: fmtBytes(ceiling)
    };
  }

  function budgetHtml(est) {
    if (!est) return '';
    if (est.mode === 'clipped') {
      return (
        '<div class="use-budget" id="useBudget">' +
          '<span class="use-budget-main">预估 ≈ <b>' + esc(est.primaryLabel) + '</b>（主款）</span>' +
          '<span class="use-budget-extra">补全上限 + 同档「' +
          esc(est.peerName) +
          '」≈ ' +
          esc(est.ceilingLabel) +
          '（含主款）</span>' +
        '</div>'
      );
    }
    return (
      '<div class="use-budget" id="useBudget">' +
        '<span class="use-budget-main">预估 ≈ <b>' + esc(est.primaryLabel) + '</b>（当前档）</span>' +
      '</div>'
    );
  }


  /** items: [{ family, weights: ['400','700'], version }] */
  function urls(items, structure, origin) {
    const out = [];
    items.forEach(function (it) {
      (it.weights || ['400']).forEach(function (w) {
        out.push(fileUrl(it, w, structure, origin));
      });
    });
    return out;
  }

  function withQuery(url, key, value) {
    if (!value) return url;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
  }

  function weightToken(family, weight) {
    return WFProto.weightName(family, weight);
  }

  /** 公开嵌入锁定 wenfeng-。opts.alias 只给付费 / 授权项目改名前缀。 */
  function familyName(family, opts) {
    opts = opts || {};
    if (opts.alias) return String(opts.alias);
    const raw = String(family || '').split('|')[0].trim();
    if (raw.indexOf('wenfeng-') === 0) return raw;
    if (raw.indexOf('windfonts-') === 0) return 'wenfeng-' + raw.slice(10);
    return raw ? 'wenfeng-' + raw.replace(/^wenfeng-/, '') : '';
  }

  function familyNames(family, opts) {
    return String(family || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (tok) { return familyName(tok, opts); }).filter(Boolean);
  }

  /**
   * 补全用字重对齐：按 CSS font-weight 数字精确匹配另一款的字重名。
   * 对不齐则 ok=false（拒用该补全），并带上最近一档供提示。
   */
  function alignWeight(primaryFont, otherFont, weightToken) {
    const want = parseInt(WFProto.weightToCss(weightToken || '400'), 10) || 400;
    const names = (otherFont && otherFont.weights && otherFont.weights.length)
      ? otherFont.weights
      : ['Regular'];
    let best = null;
    let bestDist = Infinity;
    for (let i = 0; i < names.length; i++) {
      const n = names[i];
      const css = parseInt(WFProto.weightToCss(n), 10) || 400;
      const d = Math.abs(css - want);
      if (d < bestDist) {
        bestDist = d;
        best = { name: n, css: css };
      }
    }
    if (!best) {
      return { ok: false, reason: '补全款无可用字重', want: want };
    }
    if (bestDist === 0) {
      return { ok: true, exact: true, weightName: best.name, css: best.css, want: want };
    }
    return {
      ok: false,
      exact: false,
      reason: '补全款无 ' + want + ' 字重（最近 ' + best.css + ' · ' + best.name + '）',
      nearest: best,
      want: want
    };
  }

  function cssStack(family, opts) {
    const names = familyNames(family, opts);
    const lines = [];
    names.forEach(function (wen) {
      lines.push('"' + wen + '"');
      lines.push('"' + wen.replace(/^wenfeng-/, 'windfonts-') + '"');
    });
    lines.push('"PingFang SC"', '"Microsoft YaHei"', 'sans-serif');
    return lines.map(function (line, i) {
      return (i === 0 ? '' : '    ') + line + (i < lines.length - 1 ? ',' : '');
    }).join('\n');
  }

  function certAuthNote(list) {
    const vault = (WFProto.CSS_API || 'https://vault.windfonts.com').replace(/\/$/, '');
    const sample = (list && list[0]) || (vault + '/api/font-certs/css');
    return '/* 账号级证书 CSS · 须 Authorization: Bearer <API Key> · 勿把 Key 写进 URL */\n' +
      '/* 浏览器裸 <link> 带不了头；生产请加入项目发布 /p/{slug}/index.css（B2） */\n' +
      '/* 调试：curl -H "Authorization: Bearer $WINDFONTS_KEY" "' + sample + '" */\n';
  }

  function code(kind, items, opts) {
    opts = opts || {};
    const structure = opts.structure === 'static' ? 'static' : 'dynamic';
    const list = urls(items, structure, opts.origin);
    const display = opts.display || '';
    const certMode = itemsNeedCert(items);
    if (kind === 'link') {
      if (certMode) {
        return certAuthNote(list) +
          list.map(function (u) {
            return '<!-- 不可直接用；改走服务端代理或项目 /p/ -->\n' +
              '<!-- <link rel="stylesheet" href="' + u + '"> -->';
          }).join('\n');
      }
      return WFProto.CDN_LICENSE_NOTE + '\n<link rel="preconnect" href="' + apiOrigin() + '" crossorigin>\n' +
        (opts.preload ? list.map(function (u) { return '<link rel="preload" as="style" href="' + u + '">'; }).join('\n') + '\n' : '') +
        list.map(function (u) { return '<link rel="stylesheet" href="' + u + '">'; }).join('\n');
    }
    if (kind === 'import') {
      if (certMode) {
        return certAuthNote(list) +
          list.map(function (u) { return "/* @import url('" + u + "'); */"; }).join('\n');
      }
      return list.map(function (u) { return "@import url('" + u + "');"; }).join('\n');
    }
    if (kind === 'css') {
      function stackFor(it) {
        const peer = it.fallbackFamily || it.localePeer || '';
        const fam = peer ? String(it.family) + '|' + String(peer) : it.family;
        return cssStack(fam, opts);
      }
      if (items.length > 1 && !items.some(function (it) { return it.fallbackFamily || it.localePeer; })) {
        const merged = items.map(function (it) { return it.family; }).filter(Boolean).join('|');
        const w0 = ((items[0] && items[0].weights) || ['400'])[0];
        return '.your-selector {\n  font-family: ' + cssStack(merged, opts) + ';\n  font-weight: ' +
          w0 + ';\n  font-display: ' + (display || 'swap') + ';\n}';
      }
      return items.map(function (it) {
        return '.your-selector {\n  font-family: ' + stackFor(it) + ';\n  font-weight: ' +
          ((it.weights || ['400'])[0]) + ';\n  font-display: ' + (display || 'swap') + ';\n}';
      }).join('\n\n');
    }
    if (kind === 'project') {
      const slug = opts.slug || '';
      const file = opts.file || 'index.css';
      const url = withQuery(WFProto.projectCssUrl(slug, file, opts.origin), 'display', display);
      const host = opts.origin || apiOrigin();
      return WFProto.CDN_LICENSE_NOTE + '\n<link rel="preconnect" href="' + host + '" crossorigin>\n' +
        (opts.preload ? '<link rel="preload" as="style" href="' + url + '">\n' : '') +
        '<link rel="stylesheet" href="' + url + '">';
    }
    if (kind === 'npm') {
      if (certMode) {
        return certAuthNote(list) +
          '/* npm loader 暂不支持账号证书 CSS；请用项目发布或服务端带 Key 拉取 */\n' +
          list.map(function (u) { return '// ' + u; }).join('\n');
      }
      const rows = [];
      items.forEach(function (it) {
        const ver = it.version && it.version !== 'full' ? it.version : '';
        const fams = it.fallbackFamily || it.localePeer
          ? [it.family, it.fallbackFamily || it.localePeer]
          : [it.family];
        fams.forEach(function (raw, idx) {
          const wen = familyName(raw, opts);
          const wTok = idx === 1 && it.fallbackWeight ? it.fallbackWeight : ((it.weights || ['400'])[0]);
          const weights = "'" + weightToken(wen, wTok) + "'";
          rows.push("  { family: '" + wen + "', weights: [" + weights + ']' +
            (ver ? ", version: '" + ver + "'" : '') + ' }');
        });
      });
      return 'npm install @windfonts/loader\n\n' +
        "import { loadFonts } from '@windfonts/loader';\n\n" +
        'loadFonts([\n' + rows.join(',\n') +
        '\n], { display: \'' + (opts.display || 'swap') + '\' });';
    }
    return '';
  }

  function highlight(kind, src) {
    const e = esc(src);
    const held = [];
    function hold(html) {
      held.push(html);
      return '\0' + (held.length - 1) + '\0';
    }
    function restore(s) {
      return s.replace(/\0(\d+)\0/g, function (_, i) { return held[Number(i)]; });
    }
    function strings(s) {
      return s.replace(/(&quot;[\s\S]*?&quot;|'[^']*')/g, function (m) {
        return hold('<span class="k-s">' + m + '</span>');
      });
    }
    if (kind === 'link' || kind === 'project') {
      return restore(strings(e
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, function (m) { return hold('<span class="k-c">' + m + '</span>'); })
        .replace(/(&lt;\/?)([a-zA-Z][\w:-]*)/g, function (_, a, b) { return a + hold('<span class="k">' + b + '</span>'); })
        .replace(/\s([a-zA-Z_:][\w:.-]*)=/g, function (_, a) { return ' ' + hold('<span class="k-a">' + a + '</span>') + '='; })));
    }
    if (kind === 'import') {
      return restore(strings(e.replace(/(@import)/g, function (m) { return hold('<span class="k">' + m + '</span>'); })));
    }
    if (kind === 'css') {
      return restore(strings(e.replace(/(font-family|font-weight|font-display)/g, function (m) {
        return hold('<span class="k">' + m + '</span>');
      })));
    }
    if (kind === 'npm') {
      return restore(strings(e.replace(/\b(npm|install|import|from|loadFonts)\b/g, function (m) {
        return hold('<span class="k">' + m + '</span>');
      })));
    }
    return e;
  }

  const KINDS = [
    { id: 'link', label: 'link' },
    { id: 'import', label: '@import' },
    { id: 'css', label: 'css' },
    { id: 'npm', label: 'npm' }
  ];

  /** 渲染 tabs + code 块，返回 { setItems, setOpts } */
  function mount(el, items, opts) {
    opts = opts || {};
    let kind = opts.kind || 'link';
    let cur = items;
    let curOpts = opts;
    const certMount = itemsNeedCert(items);
    el.innerHTML =
      '<div class="use-bar">' +
        (certMount ? '' : (opts.cdn ? WFProto.cdnSwitchHtml() : '')) +
        (certMount
          ? '<p class="use-cert-note muted t-13" style="margin:0">账号证书 CSS · vault <code>/api/font-certs/css</code> · 须 API Key</p>'
          : ('<div class="seg" role="group" aria-label="地址结构">' +
          '<button type="button" data-struct="dynamic"' + (curOpts.structure === 'static' ? '' : ' class="is-on"') + '>动态</button>' +
          '<button type="button" data-struct="static"' + (curOpts.structure === 'static' ? ' class="is-on"' : '') + '>静态</button>' +
        '</div>')) +
        '<div class="tabs" role="tablist">' + KINDS.map(function (k) {
          return '<button type="button" role="tab" data-kind="' + k.id + '"' + (k.id === kind ? ' class="is-on"' : '') + '>' + k.label + '</button>';
        }).join('') + '</div>' +
      '</div>' +
      (certMount
        ? '<p class="use-cite-meta muted t-13" data-cert-actions style="margin-top:var(--s-3)">' +
          '<button type="button" class="btn-text" data-cert-preview>用本账号 Key 预览</button>' +
          ' · 生产请加入项目发布 <code>/p/</code>（下一批）</p>'
        : '') +
      '<div class="use-code-stack">' +
        '<div class="code"><button type="button" class="copy">' + WFChrome.icon('copy') + '复制</button><pre></pre></div>' +
        '<div class="use-budget-host" data-budget><div data-budget-content></div></div>' +
      '</div>';
    const pre = el.querySelector('pre');
    const budgetHost = el.querySelector('[data-budget]');
    const budgetContent = el.querySelector('[data-budget-content]');
    function paintBudget() {
      if (!budgetHost || !budgetContent) return;
      if (curOpts.budget === false) {
        budgetContent.innerHTML = '';
        return;
      }
      const resolve = curOpts.resolveFont || function (fam) {
        return (window.WFProto && WFProto.getFontBySlug)
          ? WFProto.getFontBySlug(String(fam || '').replace(/^wenfeng-/, ''))
          : null;
      };
      budgetContent.innerHTML = budgetHtml(budgetEstimate(cur, resolve));
    }
    function paint() {
      if (!pre.isConnected) return;
      pre.innerHTML = highlight(kind, code(kind, cur, curOpts));
      paintBudget();
      if (window.WFLive && WFLive.loadPackageSizes) {
        WFLive.loadPackageSizes().then(function () { paintBudget(); });
      }
    }
    document.addEventListener('wf:cdn', paint);
    el.querySelectorAll('[data-struct]').forEach(function (b) {
      b.addEventListener('click', function () {
        curOpts.structure = b.getAttribute('data-struct');
        el.querySelectorAll('[data-struct]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        paint();
        if (typeof curOpts.onChange === 'function') curOpts.onChange({ structure: curOpts.structure });
      });
    });
    el.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        kind = b.getAttribute('data-kind');
        el.querySelectorAll('[data-kind]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        paint();
      });
    });
    el.querySelector('.copy').addEventListener('click', function () { WFChrome.copy(pre.textContent, '已复制代码'); });
    const prevBtn = el.querySelector('[data-cert-preview]');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (!window.WFApi || typeof WFApi.fetchFontCertCss !== 'function') {
          WFChrome.toast('需要登录并持有 API Key');
          return;
        }
        const it0 = cur[0] || {};
        const fam = it0.family;
        const wTok = ((it0.weights || ['regular'])[0]);
        const wName = WFProto.weightName ? WFProto.weightName(fam, wTok) : wTok;
        prevBtn.disabled = true;
        const go = (window.WFApp && WFApp.ensureVaultApiKey)
          ? WFApp.ensureVaultApiKey()
          : Promise.resolve();
        go.then(function () {
          return WFApi.fetchFontCertCss(fam, wName);
        }).then(function (css) {
          let tag = document.getElementById('wf-cert-css-preview');
          if (!tag) {
            tag = document.createElement('style');
            tag.id = 'wf-cert-css-preview';
            document.head.appendChild(tag);
          }
          tag.textContent = css || '';
          WFChrome.toast('已注入账号证书 CSS（本页预览）');
        }).catch(function (err) {
          WFChrome.toast((err && err.message) || '预览失败');
        }).then(function () { prevBtn.disabled = false; });
      });
    }
    paint();
    return {
      setItems: function (items2) { cur = items2; paint(); },
      setOpts: function (o) { curOpts = Object.assign({}, curOpts, o); paint(); },
      getCode: function () { return code(kind, cur, curOpts); }
    };
  }

  window.WFEmbed = {
    API: WFProto.CDN,
    VERSIONS: VERSIONS,
    DEFAULT_VERSION: DEFAULT_VERSION,
    KINDS: KINDS,
    estimateBytes: estimateBytes,
    fmtBytes: fmtBytes,
    versionSize: versionSize,
    budgetEstimate: budgetEstimate,
    budgetHtml: budgetHtml,
    urls: urls,
    code: code,
    mount: mount,
    familyName: familyName,
    familyNames: familyNames,
    alignWeight: alignWeight
  };
})();
