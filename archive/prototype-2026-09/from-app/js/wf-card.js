/* 样张卡片：模板 = 版式 + 槽位。DOM 画布，导出按行盒画字、按 data-paint 画图。 */
(function () {
  const esc = function (s) { return WFProto.escapeHtml(s); };
  const SIZES = {
    narrow: { w: 1080, h: 1440, label: '窄幅' },
    og: { w: 1200, h: 630, label: '分享图' },
    x: { w: 1200, h: 675, label: 'X 卡片' },
    banner: { w: 1600, h: 500, label: '横幅' },
    square: { w: 1080, h: 1080, label: '方图' }
  };
  const TEMPLATES = [
    { id: 'poem', label: '诗签', hint: '居中短句，底部署名', frame: 'og', layout: 'center', slots: ['sub'], hero: '行到水穷处，坐看云起时', sub: '—— 王维', size: 72, leading: 1.28, tracking: 0.06, align: 'center', wrap: 1, fit: 0, invert: 0 },
    { id: 'hero', label: '巨字', hint: '一行撑满画心', frame: 'og', layout: 'fill', slots: [], size: 140, leading: 1.05, tracking: -0.02, align: 'left', wrap: 0, fit: 1, invert: 0 },
    { id: 'mast', label: '刊头', hint: '横幅，字左名右', frame: 'banner', layout: 'mast', slots: ['sub', 'bg'], sub: '', size: 88, leading: 1.08, tracking: -0.01, align: 'left', wrap: 0, fit: 1, invert: 0 },
    { id: 'card', label: '名刺', hint: '姓名 + 头像职务', frame: 'og', layout: 'card', slots: ['sub', 'avatar'], credit: 0, hero: '张三', sub: '设计师', size: 88, leading: 1.2, tracking: 0.02, align: 'left', wrap: 1, fit: 0, invert: 0, face: 112 },
    { id: 'quote', label: '引言', hint: '一段话，头像 + 作者', frame: 'og', layout: 'quote', slots: ['sub', 'avatar'], credit: 0, hero: '好的设计，是让人感觉不到设计。', sub: '—— 某设计师', size: 48, leading: 1.5, tracking: 0.02, align: 'left', wrap: 1, fit: 0, invert: 0, face: 56 },
    { id: 'poster', label: '海报', hint: '背景图铺满，反白压字', frame: 'og', layout: 'poster', slots: ['sub', 'bg'], hero: '让中文字体，在网页上流动。', sub: '', size: 72, leading: 1.15, tracking: 0, align: 'left', wrap: 1, fit: 0, invert: 1 },
    { id: 'ink', label: '墨底', hint: '反相居中', frame: 'og', layout: 'center', slots: ['sub'], hero: '行到水穷处，坐看云起时', sub: '—— 王维', size: 72, leading: 1.28, tracking: 0.04, align: 'center', wrap: 1, fit: 0, invert: 1 },
    { id: 'seal', label: '方印', hint: '方图，头像压在字下', frame: 'square', layout: 'seal', slots: ['sub', 'avatar'], credit: 0, hero: '文', sub: '', size: 160, leading: 1.05, tracking: 0.12, align: 'center', wrap: 0, fit: 0, invert: 0, face: 96 }
  ];
  const WALL_BGS = ['01', '02', '03', '04', '05', '06'].map(function (n) {
    return WFChrome.href('assets/wall/' + n + '.jpg');
  });

  function token(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }
  function faceName(family) { return WFEmbed.familyName(family); }
  function fileSlug(name) { return String(name || 'font').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').slice(0, 40); }
  function byId(id) { return TEMPLATES.filter(function (T) { return T.id === id; })[0] || TEMPLATES[0]; }
  function currentKind(stage) {
    const kind = stage && stage.getAttribute('data-card');
    return SIZES[kind] ? kind : '';
  }
  function currentTemplate(stage) { return byId(stage && stage.getAttribute('data-template')); }
  function viewOf(stage) { return (stage && stage.parentElement) || null; }

  function fit(stage, view) {
    view = view || viewOf(stage);
    const sz = SIZES[currentKind(stage)];
    const wall = view && view.closest && view.closest('.glyph-wall');
    if (!stage) return;
    if (!sz) {
      stage.style.width = ''; stage.style.height = '';
      stage.style.removeProperty('--card-scale');
      if (view) { view.style.height = ''; view.style.width = ''; view.classList.remove('is-framed'); }
      if (wall) wall.style.removeProperty('--studio-h');
      return;
    }
    stage.style.width = sz.w + 'px';
    stage.style.height = sz.h + 'px';
    const editing = !!(wall && wall.classList.contains('is-editing'));
    const pair = view && view.closest('.glyph-pair');
    var scale, boxH;
    if (editing) {
      if (view) view.style.width = '';
      const maxW = (view && view.clientWidth) || sz.w;
      const maxH = 480;
      scale = Math.min(1, maxW / sz.w, maxH / sz.h);
      stage.style.setProperty('--card-scale', String(scale));
      if (view) {
        view.classList.add('is-framed');
        view.style.height = '';
      }
      if (wall) wall.style.removeProperty('--studio-h');
      return;
    }
    if (pair) {
      const cs = getComputedStyle(pair);
      const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const host = pair.clientWidth - pad;
      if (host < 80) {
        if (!stage.dataset.fitWait) {
          stage.dataset.fitWait = '1';
          requestAnimationFrame(function () { delete stage.dataset.fitWait; fit(stage, view); });
        }
        return;
      }
      const stacked = window.matchMedia('(max-width: 800px)').matches;
      const col = stacked ? host : Math.min(host * 0.58, 680);
      const cap = stacked ? 420 : 520;
      scale = Math.min(col / sz.w, cap / sz.h);
      boxH = Math.max(1, Math.round(sz.h * scale));
      stage.style.setProperty('--card-scale', String(scale));
      view.classList.add('is-framed');
      view.style.width = (sz.w * scale) + 'px';
      view.style.height = boxH + 'px';
      if (wall) wall.style.removeProperty('--studio-h');
      return;
    }
    const maxW = (view && view.clientWidth) || sz.w;
    scale = maxW / sz.w;
    boxH = Math.max(1, Math.round(sz.h * scale));
    stage.style.setProperty('--card-scale', String(scale));
    if (!view) return;
    view.classList.add('is-framed');
    view.style.width = '';
    view.style.height = boxH + 'px';
    if (wall) wall.style.removeProperty('--studio-h');
  }

  function applyFrame(stage, kind) {
    if (!stage) return '';
    if (kind && SIZES[kind]) stage.setAttribute('data-card', kind);
    else { stage.removeAttribute('data-card'); kind = ''; }
    fit(stage);
    return kind;
  }

  function applyTemplate(stage, id) {
    const T = byId(id);
    if (!stage) return T;
    applyFrame(stage, T.frame);
    stage.setAttribute('data-template', T.id);
    stage.setAttribute('data-layout', T.layout);
    stage.setAttribute('data-slots', T.slots.join(' '));
    if (T.credit === 0) stage.setAttribute('data-credit', '0');
    else stage.removeAttribute('data-credit');
    return T;
  }

  function setGuide(stage, on) {
    const g = stage && stage.querySelector('[data-guide]');
    if (g) g.hidden = !on;
  }

  function fillMeta(stage, info) {
    info = info || {};
    const name = stage && stage.querySelector('[data-card-name]');
    const brand = stage && stage.querySelector('[data-card-brand]');
    if (name) name.textContent = info.name || '';
    if (brand) brand.textContent = info.brand || '';
  }

  function outputSize(stage) {
    const kind = currentKind(stage);
    if (kind) return { kind: kind, w: SIZES[kind].w, h: SIZES[kind].h, label: SIZES[kind].label };
    return { kind: 'view', w: Math.max(1, Math.round((stage.clientWidth || 800) * 2)), h: Math.max(1, Math.round((stage.clientHeight || 200) * 2)), label: '画面' };
  }

  function lineBoxes(node) {
    const raw = node.nodeValue || '';
    const lines = [];
    let i = 0;
    while (i < raw.length) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const top = range.getBoundingClientRect().top;
      let j = i + 1;
      while (j < raw.length) {
        range.setStart(node, j);
        range.setEnd(node, j + 1);
        if (Math.abs(range.getBoundingClientRect().top - top) > 0.5) break;
        j += 1;
      }
      range.setStart(node, i);
      range.setEnd(node, j);
      const r = range.getBoundingClientRect();
      if (r.width || r.height) lines.push({ text: raw.slice(i, j), x: r.left, y: r.top });
      i = j;
    }
    return lines;
  }

  function readyFace(family, weight) {
    if (!document.fonts) return Promise.resolve();
    const spec = String(weight || 400) + ' 64px "' + faceName(family) + '"';
    const load = document.fonts.load ? document.fonts.load(spec).catch(function () { return null; }) : Promise.resolve();
    return load.then(function () { return document.fonts.ready; });
  }

  function radiusOf(cs, w, h, k) {
    const raw = String(cs.borderRadius || '').split(' ')[0];
    const n = parseFloat(raw) || 0;
    const r = /%$/.test(raw) ? Math.min(w, h) * n / 100 : n * k;
    return Math.min(r, w / 2, h / 2);
  }
  function drawPaint(ctx, stage, sr, imgs, k) {
    const zoom = parseFloat(getComputedStyle(stage).getPropertyValue('--bg-zoom')) || 1;
    stage.querySelectorAll('[data-paint]').forEach(function (el) {
      if (el.closest('[data-guide]')) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const bg = el.classList.contains('card-bg');
      const x = bg ? 0 : r.left - sr.left, y = bg ? 0 : r.top - sr.top;
      const w = bg ? sr.width : r.width, h = bg ? sr.height : r.height;
      ctx.save();
      const rad = radiusOf(cs, w, h, k);
      if (rad > 0) {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, rad); else ctx.rect(x, y, w, h);
        ctx.clip();
      }
      ctx.globalAlpha = Number(cs.opacity) || 1;
      if (el.getAttribute('data-paint') === 'fill') {
        ctx.fillStyle = cs.backgroundColor;
        ctx.fillRect(x, y, w, h);
      } else {
        const im = imgs[el.currentSrc || el.src];
        if (im) {
          const p = String(cs.objectPosition || '50% 50%').trim().split(/\s+/);
          const ox = parseFloat(p[0]), oy = parseFloat(p[1] || p[0]);
          const s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * (bg ? zoom : 1);
          const sw = Math.min(im.naturalWidth, w / s), sh = Math.min(im.naturalHeight, h / s);
          ctx.drawImage(im, (im.naturalWidth - sw) * (isNaN(ox) ? 50 : ox) / 100, (im.naturalHeight - sh) * (isNaN(oy) ? 50 : oy) / 100, sw, sh, x, y, w, h);
        }
      }
      ctx.restore();
    });
  }

  function loadCors(src) {
    return new Promise(function (resolve) {
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  }
  function loadPaint(el) {
    const src = el.currentSrc || el.src;
    if (el.hasAttribute('data-preview-only')) return Promise.resolve(null);
    if (WFAvatar.isLocal(src) && el.complete && el.naturalWidth) return Promise.resolve(el);
    return loadCors(src);
  }
  function collectImages(stage) {
    const list = Array.prototype.slice.call(stage.querySelectorAll('img[data-paint]')).filter(function (el) {
      const r = el.getBoundingClientRect();
      return r.width && r.height && getComputedStyle(el).display !== 'none' && (el.currentSrc || el.src);
    });
    return Promise.all(list.map(loadPaint)).then(function (ims) {
      const imgs = {}; let skipped = 0;
      ims.forEach(function (im, i) {
        if (im) imgs[list[i].currentSrc || list[i].src] = im; else skipped += 1;
      });
      return { imgs: imgs, skipped: skipped };
    });
  }

  function snapshot(stage, imgs) {
    const guide = stage && stage.querySelector('[data-guide]');
    const shown = guide && !guide.hidden;
    if (guide) guide.hidden = true;
    try {
      const sr = stage.getBoundingClientRect();
      if (!sr.width || !sr.height) throw new Error('empty stage');
      const out = outputSize(stage);
      const canvas = document.createElement('canvas');
      canvas.width = out.w;
      canvas.height = out.h;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(out.w / sr.width, 0, 0, out.h / sr.height, 0, 0);
      const bg = getComputedStyle(stage).backgroundColor;
      ctx.fillStyle = (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') ? bg : token('--paper', '#ffffff');
      ctx.fillRect(0, 0, sr.width, sr.height);
      const k = sr.width / (stage.offsetWidth || sr.width);
      drawPaint(ctx, stage, sr, imgs || {}, k);
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!String(node.nodeValue || '').replace(/\s/g, '')) continue;
        const el = node.parentElement;
        if (!el || el.closest('[data-guide]')) continue;
        const hc = getComputedStyle(el);
        if (hc.display === 'none' || hc.visibility === 'hidden') continue;
        var anc = el.parentElement, skip = false;
        while (anc && anc !== stage) {
          var as = getComputedStyle(anc);
          if (as.display === 'none' || as.visibility === 'hidden') { skip = true; break; }
          anc = anc.parentElement;
        }
        if (skip) continue;
        ctx.fillStyle = hc.color;
        ctx.globalAlpha = Number(hc.opacity) || 1;
        ctx.font = hc.fontStyle + ' ' + hc.fontWeight + ' ' + (parseFloat(hc.fontSize) * k) + 'px ' + hc.fontFamily;
        if (ctx.letterSpacing !== undefined) ctx.letterSpacing = ((parseFloat(hc.letterSpacing) || 0) * k) + 'px';
        lineBoxes(node).forEach(function (ln) { ctx.fillText(ln.text, ln.x - sr.left, ln.y - sr.top); });
      }
      return canvas;
    } finally {
      if (guide && shown) guide.hidden = false;
    }
  }

  function download(canvas, filename) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) { reject(new Error('toBlob')); return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        resolve(blob);
      }, 'image/png');
    });
  }

  function copyCanvas(canvas) {
    return new Promise(function (resolve, reject) {
      if (!navigator.clipboard || !window.ClipboardItem) { reject(new Error('clipboard')); return; }
      canvas.toBlob(function (blob) {
        if (!blob) { reject(new Error('toBlob')); return; }
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () { resolve(blob); }).catch(reject);
      }, 'image/png');
    });
  }

  function exportStage(stage, opts) {
    opts = opts || {};
    return Promise.all([readyFace(opts.family, opts.weight), collectImages(stage)]).then(function (res) {
      return new Promise(function (resolve) { requestAnimationFrame(function () { resolve(res[1]); }); });
    }).then(function (pics) {
      const out = outputSize(stage);
      const canvas = snapshot(stage, pics.imgs);
      const name = '文风-' + fileSlug(opts.name) + '-' + (stage.getAttribute('data-template') || out.kind) + '.png';
      const pack = function (blob, copied) {
        return { blob: blob, kind: out.kind, label: out.label, w: canvas.width, h: canvas.height, bytes: blob.size, skipped: pics.skipped, copied: !!copied };
      };
      if (opts.copy) {
        return copyCanvas(canvas).then(function (blob) { return pack(blob, true); }).catch(function () {
          return download(canvas, name).then(function (blob) { return pack(blob, false); });
        });
      }
      return download(canvas, name).then(function (blob) { return pack(blob, false); });
    });
  }

  function templatesHtml() {
    return '<div class="tpl-grid" role="listbox" aria-label="预制模板">' + TEMPLATES.map(function (T) {
      const tag = (SIZES[T.frame] && SIZES[T.frame].label) || '';
      return '<button type="button" data-tpl="' + T.id + '" title="' + esc(T.hint) + '"><span class="tpl-thumb"><span class="tpl-mini" data-kind="' + T.id + '" data-frame="' + T.frame + '"></span>' + (tag ? '<span class="tpl-tag">' + esc(tag) + '</span>' : '') + '</span><span class="tpl-name">' + esc(T.label) + '</span></button>';
    }).join('') + '</div>';
  }

  function unframe(stage) {
    if (!stage) return;
    applyFrame(stage, '');
    ['data-layout', 'data-slots', 'data-credit', 'data-has-sub', 'data-has-avatar', 'data-has-bg'].forEach(function (a) {
      stage.removeAttribute(a);
    });
    stage.style.background = '';
    stage.style.color = '';
    ['--card-paper', '--avatar-size', '--bg-zoom', '--bg-x', '--bg-y', '--scrim'].forEach(function (n) { stage.style.removeProperty(n); });
  }

  function setSlot(stage, slot, value, done) {
    if (!stage) return;
    const el = stage.querySelector('[data-slot="' + slot + '"]');
    const flag = 'data-has-' + slot;
    if (!el) return;
    if (slot === 'sub') {
      el.textContent = value || '';
      if (value) stage.setAttribute(flag, ''); else stage.removeAttribute(flag);
      if (done) done(!!value);
      return;
    }
    stage.removeAttribute(flag);
    WFAvatar.revoke(el);
    if (!value) { el.removeAttribute('src'); if (done) done(false); return; }
    function bind(src, kind) {
      if (kind === 'blob' || kind === 'local') el.setAttribute('data-blob', src);
      if (kind === 'preview') el.setAttribute('data-preview-only', '');
      el.onload = function () { stage.setAttribute(flag, ''); if (done) done(true, kind); };
      el.onerror = function () { stage.removeAttribute(flag); if (done) done(false, 'error'); };
      el.src = src;
    }
    WFAvatar.adopt(value, bind);
  }

  function paintStudio(host, stage) {
    if (!host || !stage) return;
    const tpl = currentTemplate(stage).id;
    host.querySelectorAll('[data-tpl]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-tpl') === tpl); });
  }

  function watch(stage) {
    const view = viewOf(stage);
    if (!view || !window.ResizeObserver) return function () {};
    const ro = new ResizeObserver(function () { fit(stage, view); });
    ro.observe(view);
    return function () { ro.disconnect(); };
  }

  function readShare() {
    let q;
    try { q = new URLSearchParams(location.search); } catch (e) { return null; }
    const rec = {
      tpl: q.get('tpl') || '',
      frame: q.get('frame') || '',
      hero: q.get('t') || '',
      sub: q.get('s') || '',
      from: q.get('from') || ''
    };
    if (!rec.tpl && !rec.frame && !rec.hero && !rec.sub && rec.from !== 'bag') return null;
    if (rec.tpl && !byId(rec.tpl)) rec.tpl = 'poem';
    if (rec.frame && !SIZES[rec.frame]) rec.frame = '';
    return rec;
  }

  function qval(s) {
    return String(s).replace(/[&=#%?+]/g, function (ch) {
      return encodeURIComponent(ch);
    }).replace(/ /g, '%20');
  }
  function sharePath(fontId, rec, opts) {
    const T = byId((rec && rec.tpl) || 'poem');
    const parts = ['id=' + encodeURIComponent(fontId)];
    if (opts && opts.view) parts.push('view=' + opts.view);
    if (rec && rec.tpl) parts.push('tpl=' + rec.tpl);
    if (rec && rec.frame && SIZES[rec.frame] && rec.frame !== T.frame) parts.push('frame=' + rec.frame);
    const t = String((rec && rec.hero) || '').trim().slice(0, 80);
    const s = String((rec && rec.sub) || '').trim().slice(0, 80);
    if (t && t !== String(T.hero || '')) parts.push('t=' + qval(t));
    if (s !== String(T.sub || '')) parts.push('s=' + qval(s));
    return 'font-detail.html?' + parts.join('&');
  }

  function shareUrl(fontId, rec, opts) {
    const path = sharePath(fontId, rec, opts);
    const u = new URL(location.href);
    return u.origin + u.pathname.replace(/[^/]*$/, '') + path;
  }
  /** 爬虫可读的固定 OG 落地：vault /share/font/{id} → og:image=/api/og/font */
  function socialShareUrl(fontId, rec, opts) {
    const base = (window.WFProto && WFProto.CSS_API) || 'https://vault.windfonts.com';
    const q = [];
    if (opts && opts.view) q.push('view=' + encodeURIComponent(opts.view));
    if (rec && rec.tpl) q.push('tpl=' + encodeURIComponent(rec.tpl));
    const t = String((rec && rec.hero) || '').trim().slice(0, 80);
    const s = String((rec && rec.sub) || '').trim().slice(0, 80);
    if (t) q.push('t=' + qval(t));
    if (s) q.push('s=' + qval(s));
    return String(base).replace(/\/$/, '') + '/share/font/' + encodeURIComponent(fontId) +
      (q.length ? '?' + q.join('&') : '');
  }
  function ogImageUrl(fontId, rec) {
    const base = (window.WFProto && WFProto.CSS_API) || 'https://vault.windfonts.com';
    const q = new URLSearchParams();
    const title = String((rec && rec.hero) || '').trim() || String(fontId);
    q.set('title', title.slice(0, 48));
    q.set('name', String(fontId));
    if (rec && rec.sub) q.set('sub', String(rec.sub).slice(0, 60));
    return String(base).replace(/\/$/, '') + '/api/og/font?' + q.toString();
  }

  window.addEventListener('resize', function () {
    document.querySelectorAll('.glyph-pair .wall-stage[data-card]').forEach(function (stage) { fit(stage); });
  });

  window.WFCard = {
    SIZES: SIZES,
    TEMPLATES: TEMPLATES,
    WALL_BGS: WALL_BGS,
    applyFrame: applyFrame,
    applyTemplate: applyTemplate,
    setGuide: setGuide,
    fillMeta: fillMeta,
    currentKind: currentKind,
    currentTemplate: currentTemplate,
    fit: fit,
    watch: watch,
    snapshot: snapshot,
    outputSize: outputSize,
    exportStage: exportStage,
    templatesHtml: templatesHtml,
    unframe: unframe,
    setSlot: setSlot,
    paintStudio: paintStudio,
    readShare: readShare,
    sharePath: sharePath,
    shareUrl: shareUrl,
    socialShareUrl: socialShareUrl,
    ogImageUrl: ogImageUrl
  };
})();
