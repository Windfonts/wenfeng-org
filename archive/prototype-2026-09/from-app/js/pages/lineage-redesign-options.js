/* 谱系三套重设对照。真数据走 WFProto；现网 lineage.html 不改。 */
(function () {
  const esc = WFProto.escapeHtml;
  const YONG = '永';
  const REL_ICON = { locale: 'merge', collab: 'compare' };
  const REL_TEXT = { locale: '地区版', collab: '合作' };
  const FLAT_LIMIT = 12;
  const DEFAULT_GROUP = 'lxgw-wenkai';

  let curGroup = '';
  const mounts = {
    a: document.querySelector('[data-mount="a"]'),
    b: document.querySelector('[data-mount="b"]'),
    c: document.querySelector('[data-mount="c"]')
  };
  const famNav = document.getElementById('famNav');

  function qs(name) {
    return new URLSearchParams(location.search).get(name) || '';
  }
  function weightOf(font) {
    const ws = (font.weights && font.weights.length) ? font.weights : ['Regular'];
    const reg = ws.filter(function (w) { return /regular|normal/i.test(String(w)); })[0];
    return WFProto.weightToCss(reg || ws[0]);
  }
  function faceOf(font) {
    const w = weightOf(font);
    WFProto.ensureFontCss(font.family, w);
    return 'font-family:' + WFProto.cssFamilyStack(font.family) + ';font-weight:' + w;
  }
  function relMark(font) {
    const rel = font.lineage && font.lineage.relation;
    if (!rel || !REL_ICON[rel] || !REL_TEXT[rel]) return '';
    return WFChrome.icon(REL_ICON[rel]);
  }
  function metaOf(font) {
    const parts = [];
    if (font.charCount) parts.push('<b>' + WFProto.formatCount(font.charCount) + '</b> 字');
    if (font.releaseYear) parts.push(font.releaseYear);
    return parts.join(' · ');
  }
  function nodeInner(font, opts) {
    const style = font.ghost ? '' : ' style="' + faceOf(font) + '"';
    const yong = (opts && opts.noYong) ? '' :
      '<span class="lro-yong"' + style + ' aria-hidden="true">' + (font.ghost ? '·' : YONG) + '</span>';
    return yong +
      '<span class="lro-name">' + relMark(font) + esc(font.name) + '</span>' +
      ((opts && opts.hideMeta) ? '' : '<span class="lro-meta-n">' + (font.ghost ? '未收录原作' : metaOf(font)) + '</span>');
  }
  function nodeRow(font, opts) {
    const cls = 'lro-node' + (font.ghost ? ' is-ghost' : '') + (opts && opts.root ? ' is-root' : '');
    return font.ghost
      ? '<div class="' + cls + '">' + nodeInner(font, opts) + '</div>'
      : '<a class="' + cls + '" href="' + WFChrome.href(WFProto.detailHref(font)) + '">' + nodeInner(font, opts) + '</a>';
  }
  function foldBtn(label) {
    return '<button type="button" class="lro-fold" data-fold>' + WFChrome.icon('chevron-down') + esc(label) + '</button>';
  }

  function buildForest(members, all) {
    const byId = {};
    members.forEach(function (f) { byId[f.id] = f; });
    const children = {};
    let roots = [];
    members.forEach(function (f) {
      const rec = f.lineage || {};
      const up = rec.relation === 'original' ? '' : (rec.upstreamName || '');
      const parent = up ? WFChrome.findFontByName(all, up) : null;
      if (parent && byId[parent.id]) {
        (children[parent.id] = children[parent.id] || []).push(f);
      } else if (parent && !byId[parent.id]) {
        roots.push(f);
      } else if (up) {
        roots.push({ ghost: true, name: up, ghostChildren: [f] });
      } else {
        roots.push(f);
      }
    });
    const mains = roots.filter(function (r) { return !r.ghost; })
      .sort(function (a, b) { return String(a.name).length - String(b.name).length; });
    const kept = [];
    const variants = [];
    mains.forEach(function (r) {
      const host = kept.filter(function (m) {
        return String(r.name).length > String(m.name).length && String(r.name).indexOf(m.name) === 0;
      })[0];
      if (host) variants.push([host, r]);
      else kept.push(r);
    });
    variants.forEach(function (pair) {
      (children[pair[0].id] = children[pair[0].id] || []).push(pair[1]);
    });
    roots = roots.filter(function (r) { return r.ghost; }).concat(kept);
    function byYear(a, b) {
      return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh');
    }
    Object.keys(children).forEach(function (k) { children[k].sort(byYear); });
    roots.sort(byYear);
    return { roots: roots, children: children };
  }

  function depthMap(members, forest) {
    const d = {};
    function walk(node, depth) {
      const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
      (kids || []).forEach(function (k) { d[k.id] = depth + 1; walk(k, depth + 1); });
    }
    forest.roots.forEach(function (r) { if (!r.ghost) d[r.id] = 0; walk(r, r.ghost ? -1 : 0); });
    return d;
  }

  function subtreeSize(node, forest) {
    const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
    return 1 + kids.reduce(function (s, k) { return s + subtreeSize(k, forest); }, 0);
  }

  function mainRootId(forest) {
    let best = null; let n = -1;
    forest.roots.forEach(function (r) {
      if (r.ghost) return;
      const s = subtreeSize(r, forest);
      if (s > n) { n = s; best = r; }
    });
    return best ? best.id : '';
  }

  function genLabel(g) {
    if (g === 0) return '源 头';
    return '第 ' + '一二三四五六七八九'[Math.min(g - 1, 8)] + ' 代';
  }

  /* —— 甲：真树导轨 —— */
  function renderA(members, forest) {
    const allowFold = members.length > FLAT_LIMIT + 4;
    function renderKids(kids, depth, lastIsLast) {
      return kids.map(function (k, i) {
        return item(k, depth, i === kids.length - 1 && lastIsLast);
      }).join('');
    }
    function sublist(node, depth) {
      const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
      if (!kids.length) return '';
      if (allowFold && depth >= 1) {
        return foldBtn('展开 ' + kids.length + ' 款') +
          '<ul hidden>' + renderKids(kids, depth + 1, true) + '</ul>';
      }
      const shown = allowFold ? kids.slice(0, FLAT_LIMIT) : kids;
      const rest = allowFold ? kids.slice(FLAT_LIMIT) : [];
      return '<ul>' + renderKids(shown, depth + 1, rest.length === 0) +
        (rest.length
          ? '<li class="is-last">' + foldBtn('展开其余 ' + rest.length + ' 款') +
            '<ul hidden>' + renderKids(rest, depth + 1, true) + '</ul></li>'
          : '') + '</ul>';
    }
    function item(node, depth, isLast) {
      return '<li' + (isLast ? ' class="is-last"' : '') + '>' +
        nodeRow(node, { root: node._root }) + sublist(node, depth) + '</li>';
    }
    const rows = forest.roots.map(function (r, i) {
      r._root = !r.ghost;
      return item(r, 0, i === forest.roots.length - 1);
    }).join('');
    return '<p class="lro-cap">甲 · 真树 · 末子截断竖轨</p><div class="lro-a"><ul>' + rows + '</ul></div>';
  }

  /* —— 乙：根卡 + 支线 —— */
  function renderB(members, forest) {
    const d = depthMap(members, forest);
    const mid = mainRootId(forest);
    let html = '';

    forest.roots.forEach(function (r) {
      if (r.ghost) {
        html += '<div class="lro-b-root is-ghost">' + nodeRow(r, { root: true }) + '</div>';
        (r.ghostChildren || []).forEach(function (k) {
          html += renderBKids(k, forest, allowDeep(members));
        });
        return;
      }
      html += '<div class="lro-b-root">' + nodeRow(r, { root: true }) + '</div>';
      html += renderBKids(r, forest, allowDeep(members));
    });

    /* 按代平铺补充：深度≥1 且未在树里强调的宽族一级子 */
    const maxD = Math.max.apply(null, [0].concat(members.map(function (f) { return d[f.id] || 0; })));
    if (members.length > 20 && maxD >= 1) {
      for (let g = 1; g <= Math.min(maxD, 3); g++) {
        const band = members.filter(function (f) { return (d[f.id] || 0) === g; });
        if (!band.length) continue;
        /* 乙版树已画过；这里只在宽族时给一级子做芯片条作为第二读法 */
        if (g !== 1) continue;
        html += '<p class="lro-b-gen">' + esc(genLabel(g)) + ' · 平铺扫一眼</p>';
        html += '<ul class="lro-b-flat">' + band.slice(0, 16).map(function (f) {
          return '<li><a class="lro-chip" href="' + WFChrome.href(WFProto.detailHref(f)) + '">' +
            '<span class="lro-yong" style="' + faceOf(f) + '" aria-hidden="true">' + YONG + '</span>' +
            '<span class="lro-name">' + esc(f.name) + '</span></a></li>';
        }).join('') +
          (band.length > 16 ? '<li><span class="lro-meta-n">另 ' + (band.length - 16) + ' 款见树</span></li>' : '') +
          '</ul>';
      }
    }

    void mid;
    return html || '<p class="lro-empty">暂无成员。</p>';
  }

  function allowDeep(members) {
    return members.length <= FLAT_LIMIT + 4;
  }

  function renderBKids(parent, forest, deep) {
    const kids = forest.children[parent.id] || [];
    if (!kids.length) return '';
    const d0 = 1;
    let html = '<p class="lro-b-gen">' + esc(genLabel(d0)) + '</p><div class="lro-b-branch"><ul>';
    kids.forEach(function (k, i) {
      const isLast = i === kids.length - 1;
      html += '<li' + (isLast ? ' class="is-last"' : '') + '>' + nodeRow(k);
      const grand = forest.children[k.id] || [];
      if (grand.length) {
        if (!deep && grand.length) {
          html += foldBtn('展开 ' + grand.length + ' 款') +
            '<ul hidden>' + grand.map(function (g, j) {
              return '<li' + (j === grand.length - 1 ? ' class="is-last"' : '') + '>' + nodeRow(g) + '</li>';
            }).join('') + '</ul>';
        } else {
          html += '<ul>' + grand.map(function (g, j) {
            return '<li' + (j === grand.length - 1 ? ' class="is-last"' : '') + '>' + nodeRow(g) + '</li>';
          }).join('') + '</ul>';
        }
      }
      html += '</li>';
    });
    html += '</ul></div>';
    return html;
  }

  /* —— 丙：墙 + 旁谱 —— */
  function renderC(members, forest) {
    const d = depthMap(members, forest);
    const mid = mainRootId(forest);
    const rail = renderSlimRail(forest);
    const maxD = Math.max.apply(null, [0].concat(members.map(function (f) { return d[f.id] || 0; })));
    let wall = '';
    for (let g = 0; g <= maxD; g++) {
      const band = members.filter(function (f) { return (d[f.id] || 0) === g; })
        .sort(function (a, b) {
          const ra = a.id === mid ? -1 : 0; const rb = b.id === mid ? -1 : 0;
          if (ra !== rb) return ra - rb;
          return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh');
        });
      if (!band.length) continue;
      const years = band.map(function (f) { return f.releaseYear; }).filter(Boolean).sort();
      const yr = years.length
        ? (years[0] !== years[years.length - 1] ? years[0] + ' – ' + years[years.length - 1] : String(years[0]))
        : '年份未记';
      wall += '<div class="lro-band"><p class="lro-band-cap"><span class="yr">' + esc(yr) + '</span>' +
        '<span class="t">' + esc(genLabel(g)) + '</span></p><div class="lro-wall">' +
        band.map(function (f) {
          return '<a class="lro-cell' + (f.id === mid ? ' is-root' : '') + '" href="' + WFChrome.href(WFProto.detailHref(f)) + '">' +
            '<span class="lro-yong" style="' + faceOf(f) + '" aria-hidden="true">' + YONG + '</span>' +
            '<span class="lro-name">' + esc(f.name) + '</span>' +
            '<span class="lro-meta-n">' + metaOf(f) + '</span></a>';
        }).join('') + '</div></div>';
    }
    return '<div class="lro-c"><aside class="lro-c-rail">' + rail + '</aside><div class="lro-c-main">' + wall + '</div></div>';
  }

  function renderSlimRail(forest) {
    function walk(node, isLast) {
      const kids = node.ghost ? node.ghostChildren : (forest.children[node.id] || []);
      const cls = 'lro-slim' + (node.ghost ? ' is-ghost' : '') + (node._root ? ' is-root' : '');
      const label = node.ghost
        ? '<span class="' + cls + '">' + esc(node.name) + '</span>'
        : '<a class="' + cls + '" href="' + WFChrome.href(WFProto.detailHref(node)) + '">' + esc(node.name) + '</a>';
      let html = '<li' + (isLast ? ' class="is-last"' : '') + '>' + label;
      if (kids.length) {
        const shown = kids.length > 10 ? kids.slice(0, 10) : kids;
        html += '<ul>' + shown.map(function (k, i) {
          return walk(k, i === shown.length - 1 && kids.length <= 10);
        }).join('') +
          (kids.length > 10 ? '<li class="is-last"><span class="lro-slim is-ghost">…另 ' + (kids.length - 10) + ' 款</span></li>' : '') +
          '</ul>';
      }
      html += '</li>';
      return html;
    }
    const rows = forest.roots.map(function (r, i) {
      r._root = !r.ghost;
      return walk(r, i === forest.roots.length - 1);
    }).join('');
    return '<p class="lro-cap">旁谱</p><ul>' + rows + '</ul>';
  }

  function wireFolds(root) {
    root.querySelectorAll('.lro-fold').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const ul = btn.nextElementSibling;
        if (!ul) return;
        const open = ul.hasAttribute('hidden');
        if (open) ul.removeAttribute('hidden'); else ul.setAttribute('hidden', '');
        const m = btn.textContent.match(/\d+/);
        btn.innerHTML = WFChrome.icon('chevron-down') + esc(open ? '收起' : '展开' + (m ? ' ' + m[0] + ' 款' : ''));
      });
    });
  }

  function setGroup(g) {
    curGroup = g;
    const url = new URL(location.href);
    url.searchParams.set('group', g);
    history.replaceState(null, '', url);
    renderFamNav();
    renderAll();
  }

  function renderFamNav() {
    const all = WFProto.getCatalogList();
    const ld = WFProto.getLineageData();
    const counts = {};
    all.forEach(function (f) {
      const g = (f.lineage && f.lineage.group) || '';
      if (g) counts[g] = (counts[g] || 0) + 1;
    });
    const keys = Object.keys(ld.groups || {}).filter(function (g) { return counts[g]; })
      .sort(function (a, b) { return counts[b] - counts[a]; });
    if (!curGroup || !counts[curGroup]) {
      const q = qs('group');
      curGroup = (q && counts[q]) ? q : (counts[DEFAULT_GROUP] ? DEFAULT_GROUP : keys[0]);
    }
    famNav.innerHTML = keys.map(function (g) {
      const gd = ld.groups[g] || {};
      const short = String(gd.name || g).split(' / ')[0];
      return '<button type="button" class="chip' + (g === curGroup ? ' is-on' : '') + '" data-group="' + esc(g) + '">' +
        esc(short) + '<span class="n">' + counts[g] + '</span></button>';
    }).join('');
    famNav.querySelectorAll('.chip').forEach(function (btn) {
      btn.addEventListener('click', function () { setGroup(btn.getAttribute('data-group')); });
    });
  }

  function renderAll() {
    const all = WFProto.getCatalogList();
    const ld = WFProto.getLineageData();
    const groups = ld.groups || {};
    if (!curGroup || !groups[curGroup]) {
      Object.keys(mounts).forEach(function (k) {
        mounts[k].innerHTML = '<p class="lro-empty">暂无谱系数据。</p>';
      });
      return;
    }
    const members = all.filter(function (f) { return f.lineage && f.lineage.group === curGroup; });
    const forest = buildForest(members, all);
    mounts.a.innerHTML = renderA(members, forest);
    mounts.b.innerHTML = renderB(members, forest);
    mounts.c.innerHTML = renderC(members, forest);
    wireFolds(mounts.a);
    wireFolds(mounts.b);
    document.title = (String(groups[curGroup].name || curGroup).split(' / ')[0]) + ' · 谱系三套 · 文风字体';
  }

  WFProto.loadCatalog().then(function () {
    renderFamNav();
    renderAll();
  });
})();
