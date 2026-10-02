/* 谱系亲属角色对照：点中心字 → 标 祖/父/子/孙/旁系/混合。实验室页，不改现网。 */
(function () {
  const esc = WFProto.escapeHtml;
  const YONG = '永';
  const MIX_REL = { locale: true, collab: true, commissioned: true };
  const DEFAULT_GROUP = 'lxgw-wenkai';
  const stage = document.getElementById('stage');
  const famNav = document.getElementById('famNav');
  const famCap = document.getElementById('famCap');

  let curGroup = '';
  let focusId = '';

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
  function metaOf(font) {
    const parts = [];
    if (font.charCount) parts.push(WFProto.formatCount(font.charCount) + ' 字');
    if (font.releaseYear) parts.push(font.releaseYear);
    return parts.join(' · ');
  }

  function buildForest(members, all) {
    const byId = {};
    members.forEach(function (f) { byId[f.id] = f; });
    const children = {};
    const parentOf = {};
    let roots = [];
    members.forEach(function (f) {
      const rec = f.lineage || {};
      const up = rec.relation === 'original' ? '' : (rec.upstreamName || '');
      const parent = up ? WFChrome.findFontByName(all, up) : null;
      if (parent && byId[parent.id]) {
        (children[parent.id] = children[parent.id] || []).push(f);
        parentOf[f.id] = parent.id;
      } else if (parent && !byId[parent.id]) {
        roots.push(f);
      } else if (up) {
        const gid = 'ghost:' + up;
        let ghost = roots.filter(function (r) { return r.ghost && r.name === up; })[0];
        if (!ghost) {
          ghost = { ghost: true, id: gid, name: up, ghostChildren: [] };
          roots.push(ghost);
        }
        ghost.ghostChildren.push(f);
        parentOf[f.id] = gid;
        byId[gid] = ghost;
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
      parentOf[pair[1].id] = pair[0].id;
    });
    roots = roots.filter(function (r) { return r.ghost; }).concat(kept);
    function byYear(a, b) {
      return (a.releaseYear || 9999) - (b.releaseYear || 9999) || String(a.name).localeCompare(b.name, 'zh');
    }
    Object.keys(children).forEach(function (k) { children[k].sort(byYear); });
    roots.forEach(function (r) {
      if (r.ghost && r.ghostChildren) r.ghostChildren.sort(byYear);
    });
    roots.sort(byYear);
    return { roots: roots, children: children, parentOf: parentOf, byId: byId };
  }

  function kidsOf(node, forest) {
    return node.ghost ? (node.ghostChildren || []) : (forest.children[node.id] || []);
  }

  /* 相对中心字打角色 */
  function roleMap(focus, forest) {
    const roles = {}; /* id → { kin, mix } */
    if (!focus || focus.ghost) return roles;

    const ancestors = [];
    let cur = focus.id;
    const seen = {};
    while (forest.parentOf[cur] && !seen[cur]) {
      seen[cur] = true;
      const pid = forest.parentOf[cur];
      ancestors.push(pid);
      cur = pid;
    }

    ancestors.forEach(function (id, i) {
      roles[id] = roles[id] || { kin: '', mix: false };
      roles[id].kin = i === 0 ? '父' : '祖';
    });

    roles[focus.id] = { kin: '本字', mix: false };

    function markDesc(node, depth) {
      kidsOf(node, forest).forEach(function (k) {
        if (k.ghost) return;
        roles[k.id] = roles[k.id] || { kin: '', mix: false };
        if (k.id !== focus.id && roles[k.id].kin !== '本字') {
          roles[k.id].kin = depth === 1 ? '子' : '孙';
        }
        markDesc(k, depth + 1);
      });
    }
    markDesc(focus, 1);

    /* 旁系：其余在库成员 */
    Object.keys(forest.byId).forEach(function (id) {
      const n = forest.byId[id];
      if (n.ghost) {
        if (!roles[id]) roles[id] = { kin: '祖', mix: false };
        return;
      }
      if (!roles[id]) roles[id] = { kin: '旁系', mix: false };
    });

    /* 混合叠标 */
    Object.keys(forest.byId).forEach(function (id) {
      const n = forest.byId[id];
      if (n.ghost) return;
      const rel = n.lineage && n.lineage.relation;
      if (MIX_REL[rel]) {
        roles[id] = roles[id] || { kin: '旁系', mix: false };
        roles[id].mix = true;
      }
    });

    /* 直系路径 id 集合（含本字）供加粗轨 */
    const line = {};
    line[focus.id] = true;
    ancestors.forEach(function (id) { line[id] = true; });
    function markLineDown(node) {
      kidsOf(node, forest).forEach(function (k) {
        if (k.ghost) return;
        const r = roles[k.id];
        if (r && (r.kin === '子' || r.kin === '孙')) {
          line[k.id] = true;
          markLineDown(k);
        }
      });
    }
    markLineDown(focus);

    return { roles: roles, line: line, ancestors: ancestors };
  }

  function rolePills(r) {
    if (!r) return '';
    let html = '<span class="lk-roles">';
    if (r.kin === '本字') html += '<span class="lk-pill is-self">本字</span>';
    else if (r.kin === '祖') html += '<span class="lk-pill is-zu">祖</span>';
    else if (r.kin === '父') html += '<span class="lk-pill is-fu">父</span>';
    else if (r.kin === '子') html += '<span class="lk-pill is-zi">子</span>';
    else if (r.kin === '孙') html += '<span class="lk-pill is-sun">孙</span>';
    else if (r.kin === '旁系') html += '<span class="lk-pill is-pang">旁系</span>';
    if (r.mix) html += '<span class="lk-pill is-mix">混合</span>';
    html += '</span>';
    return html;
  }

  function hintText(focus, info, forest) {
    if (!focus) return '';
    const roles = info.roles;
    const fu = info.ancestors[0] ? forest.byId[info.ancestors[0]] : null;
    const zu = info.ancestors[1] ? forest.byId[info.ancestors[1]] : (info.ancestors[0] && forest.byId[info.ancestors[0]] && forest.byId[info.ancestors[0]].ghost ? forest.byId[info.ancestors[0]] : null);
    /* clearer: 祖 = ancestors[1+] or ghost parent of 父 */
    let zuName = '';
    if (info.ancestors.length >= 2) zuName = forest.byId[info.ancestors[info.ancestors.length - 1]].name;
    else if (fu && fu.ghost) zuName = fu.name;
    else if (info.ancestors.length === 1 && forest.byId[info.ancestors[0]] && forest.byId[info.ancestors[0]].ghost) {
      zuName = forest.byId[info.ancestors[0]].name;
    }

    const zi = [];
    const sun = [];
    const pang = [];
    Object.keys(roles).forEach(function (id) {
      const n = forest.byId[id];
      if (!n || n.ghost) return;
      if (roles[id].kin === '子') zi.push(n.name);
      if (roles[id].kin === '孙') sun.push(n.name);
      if (roles[id].kin === '旁系') pang.push(n.name);
    });

    const bits = [];
    bits.push('中心：<b>' + esc(focus.name) + '</b>');
    if (fu && !fu.ghost) bits.push('父：<b>' + esc(fu.name) + '</b>');
    else if (fu && fu.ghost) bits.push('父 / 祖（未收录）：<b>' + esc(fu.name) + '</b>');
    if (zuName && (!fu || fu.name !== zuName)) bits.push('祖：<b>' + esc(zuName) + '</b>');
    if (zi.length) bits.push('子：' + zi.map(esc).join('、'));
    if (sun.length) bits.push('孙：' + sun.map(esc).join('、'));
    if (pang.length) bits.push('旁系 ' + pang.length + ' 款');
    return bits.join(' · ');
  }

  function renderTree(forest, info) {
    const roles = info.roles;
    const line = info.line;

    function item(node, isLast) {
      const r = roles[node.id] || { kin: node.ghost ? '祖' : '旁系', mix: false };
      const onLine = !!line[node.id] || (node.ghost && info.ancestors.indexOf(node.id) !== -1);
      const cls = 'lk-node' +
        (node.ghost ? ' is-ghost' : '') +
        (r.kin === '本字' ? ' is-self' : '') +
        (r.kin === '旁系' ? ' is-pang' : '');
      const style = node.ghost ? '' : ' style="' + faceOf(node) + '"';
      let row;
      if (node.ghost) {
        row = '<div class="' + cls + '">' +
          '<span class="lk-yong" aria-hidden="true">·</span>' +
          rolePills(r) +
          '<span class="lk-name">' + esc(node.name) + '</span>' +
          '<span class="lk-meta">未收录原作</span></div>';
      } else {
        row = '<button type="button" class="' + cls + '" data-focus="' + esc(node.id) + '">' +
          '<span class="lk-yong"' + style + ' aria-hidden="true">' + YONG + '</span>' +
          rolePills(r) +
          '<span class="lk-name">' + esc(node.name) + '</span>' +
          '<span class="lk-meta">' + esc(metaOf(node)) + '</span></button>';
      }
      const kids = kidsOf(node, forest);
      let sub = '';
      if (kids.length) {
        sub = '<ul>' + kids.map(function (k, i) {
          return item(k, i === kids.length - 1);
        }).join('') + '</ul>';
      }
      return '<li class="' + (isLast ? 'lk-last' : '') + (onLine ? ' is-line' : '') + '">' + row + sub + '</li>';
    }

    const rows = forest.roots.map(function (r, i) {
      return item(r, i === forest.roots.length - 1);
    }).join('');
    return '<div class="lk-tree"><ul>' + rows + '</ul></div>';
  }

  function setGroup(g) {
    curGroup = g;
    focusId = '';
    const url = new URL(location.href);
    url.searchParams.set('group', g);
    url.searchParams.delete('focus');
    history.replaceState(null, '', url);
    renderFamNav();
    render();
  }

  function setFocus(id) {
    focusId = id;
    const url = new URL(location.href);
    url.searchParams.set('focus', id);
    history.replaceState(null, '', url);
    render();
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

  function render() {
    const all = WFProto.getCatalogList();
    const ld = WFProto.getLineageData();
    const groups = ld.groups || {};
    if (!curGroup || !groups[curGroup]) {
      stage.innerHTML = '<p class="empty">暂无谱系数据。</p>';
      return;
    }
    const members = all.filter(function (f) { return f.lineage && f.lineage.group === curGroup; });
    const forest = buildForest(members, all);
    const qf = qs('focus');
    if (!focusId && qf && forest.byId[qf] && !forest.byId[qf].ghost) focusId = qf;
    if (!focusId || !forest.byId[focusId] || forest.byId[focusId].ghost) {
      /* 默认：组内成员最多子嗣的根，否则第一款 */
      let best = members[0];
      let n = -1;
      forest.roots.forEach(function (r) {
        if (r.ghost) return;
        const s = kidsOf(r, forest).length;
        if (s > n) { n = s; best = r; }
      });
      focusId = best ? best.id : (members[0] && members[0].id);
    }
    const focus = forest.byId[focusId];
    const info = roleMap(focus, forest);
    const gd = groups[curGroup] || {};
    famCap.textContent = (gd.name || curGroup) + ' · ' + members.length + ' 款 · 点任一款切换中心';
    stage.innerHTML =
      '<p class="lk-hint">' + hintText(focus, info, forest) + '</p>' +
      renderTree(forest, info);
    stage.querySelectorAll('[data-focus]').forEach(function (btn) {
      btn.addEventListener('click', function () { setFocus(btn.getAttribute('data-focus')); });
    });
    document.title = (focus ? focus.name + ' · ' : '') + '亲属角色 · 文风字体';
  }

  WFProto.loadCatalog().then(function () {
    renderFamNav();
    render();
  });
})();
