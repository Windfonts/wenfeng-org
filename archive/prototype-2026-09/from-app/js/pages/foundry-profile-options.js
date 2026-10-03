/* 厂商详情顶栏四套对照。只服务 foundry-profile-options.html。 */
(function () {
  const esc = WFProto.escapeHtml;
  const blocks = document.querySelectorAll('.hc-block');
  const links = document.querySelectorAll('.hc-switch .seg-glyph a');
  const demoSel = document.getElementById('fpoDemo');
  let catalog = [];
  let currentSlug = 'lxgw';

  function show(id) {
    let found = false;
    blocks.forEach(function (el) {
      const on = el.id === id;
      el.classList.toggle('is-on', on);
      if (on) found = true;
    });
    if (!found) {
      show('a');
      return;
    }
    links.forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
  }

  function fromHash() {
    const id = (location.hash || '#a').replace(/^#/, '') || 'a';
    show(document.getElementById(id) ? id : 'a');
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      const id = (a.getAttribute('href') || '').replace(/^#/, '');
      if (!id || !document.getElementById(id)) return;
      e.preventDefault();
      show(id);
    });
  });
  window.addEventListener('hashchange', fromHash);

  function stubFont(info) {
    return { ownerInfo: info, foundryInfo: info, makerInfo: info };
  }

  function groups(list) {
    const map = {};
    function ensure(info) {
      if (!info || !info.id) return null;
      if (!map[info.id]) {
        map[info.id] = {
          slug: info.id, name: info.name, info: info, font: stubFont(info),
          fonts: [], made: [], kind: info.kind || '', claimed: !!info.claimed
        };
      }
      return map[info.id];
    }
    list.forEach(function (f) {
      const owner = f.ownerInfo || f.foundryInfo;
      const maker = f.makerInfo;
      const og = ensure(owner);
      if (og && og.fonts.indexOf(f) === -1) {
        og.fonts.push(f);
        if (og.fonts.length === 1) og.font = f;
      }
      if (maker && maker.id && owner && maker.id !== owner.id) {
        const mg = ensure(maker);
        if (mg && mg.fonts.indexOf(f) === -1 && mg.made.indexOf(f) === -1) mg.made.push(f);
      }
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function ecosystem(list, slug) {
    const groups = {};
    const loose = [];
    list.forEach(function (f) {
      const L = f.lineage || {};
      if (L.relation !== 'fork') return;
      const up = L.upstreamOwnerInfo;
      if (!up || up.id !== slug) return;
      if (!L.group) {
        loose.push(f);
        return;
      }
      if (!groups[L.group]) {
        groups[L.group] = {
          group: L.group,
          groupName: L.groupName,
          upstreamName: L.upstreamName,
          n: 0
        };
      }
      groups[L.group].n++;
    });
    loose.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
    return {
      groups: Object.keys(groups).map(function (k) { return groups[k]; }),
      loose: loose,
      total: Object.keys(groups).reduce(function (n, k) { return n + groups[k].n; }, 0) + loose.length
    };
  }

  function avatarHtml(info, font) {
    const url = WFChrome.brandAvatar(font || stubFont(info), info);
    if (url) return '<img src="' + esc(url) + '" alt="" width="72" height="72" loading="lazy" />';
    const ch = (info.short || info.name || '?').charAt(0);
    return '<span class="mark" aria-hidden="true">' + esc(ch) + '</span>';
  }

  function heroSub(g) {
    const bits = [g.claimed ? '已认领' : '未认领'];
    if (g.fonts.length) bits.push('归属 ' + g.fonts.length + ' 款');
    if (g.made.length) bits.push('受托 ' + g.made.length + ' 款');
    if (!g.fonts.length && !g.made.length) bits.push('暂无在库字体');
    return bits.join(' · ');
  }

  function yearsOf(g) {
    const years = g.fonts.concat(g.made).map(function (x) { return x.releaseYear; }).filter(Boolean);
    return years.length ? String(Math.min.apply(null, years)) : '';
  }

  function siteOf(g) {
    return g.info.website || '';
  }

  function hostOf(site) {
    return site ? site.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
  }

  function claimText(g) {
    const who = g.kind === 'brand' ? '品牌方' : (g.kind === 'author' ? '作者' : (g.kind === 'project' ? '项目' : '厂商'));
    if (g.claimed) return who + '已认领此页。许可仍以每款字体的出处为准。';
    return '这是你的品牌？<a href="claim.html?slug=' + encodeURIComponent(g.slug) + '">认领此页</a>。通过后可改标志与介绍。';
  }

  function ecoHtml(eco) {
    if (!eco || !eco.total) return '';
    const links = eco.groups.map(function (row) {
      return '<a href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(row.group)) + '">' +
        esc(row.groupName || row.upstreamName || row.group) + ' ' + row.n + '</a>';
    }).concat(eco.loose.map(function (f) {
      return '<a href="' + WFChrome.href(WFProto.detailHref(f)) + '">' + esc(f.name) + '</a>';
    }));
    return '<div class="fpo-eco">' +
      '<span class="lab">' + WFChrome.icon('branch') + '同系派生</span>' +
      '站内另有 <strong>' + eco.total + '</strong> 款从本页开源谱系衍生，版权归创作者 · ' +
      links.join('<span class="sep">·</span>') +
      '</div>';
  }

  function idBlock(g) {
    const info = g.info;
    const kind = WFChrome.kindLabel(info) || '';
    const sub = [kind, heroSub(g)].filter(Boolean).join(' · ');
    const en = info.en && info.en !== g.name ? '<p class="en">' + esc(info.en) + '</p>' : '';
    return '<div class="fpo-id">' +
      avatarHtml(info, g.font) +
      '<div class="who">' +
        '<h1 class="name">' + esc(g.name) + WFChrome.favHtml('author', g.slug, g.name) + '</h1>' +
        en +
        '<p class="sub">' + esc(sub) + '</p>' +
      '</div></div>';
  }

  function sponsorBlock(g) {
    if (!window.WFSponsor || !WFSponsor.html) return '';
    return WFSponsor.html(g.info) || '';
  }

  function descOf(g) {
    const info = g.info;
    const sample = g.fonts[0] || g.made[0] || g.font;
    return info.description ||
      ((sample.brand && sample.brand.description && !/出品的字体$/.test(sample.brand.description))
        ? sample.brand.description : '');
  }

  function peekHtml(n) {
    return '<div class="fpo-peek" aria-hidden="true">' +
      '<div class="count-line">归属 <strong>' + n + '</strong> 款 · 在字体库筛选</div>' +
      '<div class="fpo-peek-rows">' +
        '<div class="fpo-peek-row"></div>' +
        '<div class="fpo-peek-row"></div>' +
        '<div class="fpo-peek-row"></div>' +
      '</div></div>';
  }

  function crumb(g) {
    return '<p class="fpo-crumb"><a href="foundry.html">厂商</a><span>/</span><span>' + esc(g.name) + '</span></p>';
  }

  function factsList(g, keys) {
    const site = siteOf(g);
    const year = yearsOf(g);
    const map = {
      kind: { k: '类型', v: WFChrome.kindLabel(g.info) || '' },
      owned: { k: '归属', v: g.fonts.length ? String(g.fonts.length) + ' 款' : '' },
      year: { k: '首发', v: year },
      site: {
        k: '官网',
        v: site
          ? '<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">' + esc(hostOf(site)) + '</a>'
          : '未收录官网',
        html: true
      }
    };
    const items = (keys || ['kind', 'owned', 'year', 'site']).map(function (key) {
      const row = map[key];
      if (!row || !row.v) return '';
      return '<li><span class="k">' + esc(row.k) + '</span>' +
        (row.html ? row.v : esc(row.v)) + '</li>';
    }).filter(Boolean).join('');
    return items ? '<ul class="fpo-facts">' + items + '</ul>' : '';
  }

  function renderA(g, eco) {
    const site = siteOf(g);
    const year = yearsOf(g);
    const kv = [
      year ? ['calendar', '首发', esc(year)] : null,
      site
        ? ['globe', '官网', '<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">' + esc(hostOf(site)) + '</a>']
        : ['globe', '官网', '未收录官网']
    ].filter(Boolean);
    return crumb(g) +
      '<header class="fpo-a-card">' +
        '<div class="fpo-a-main">' +
          idBlock(g) +
          '<div class="fpo-actions">' + sponsorBlock(g) + '</div>' +
        '</div>' +
        '<aside class="fpo-a-side">' +
          '<dl class="kv">' + kv.map(function (r) {
            return '<div><dt>' + WFChrome.icon(r[0]) + esc(r[1]) + '</dt><dd>' + r[2] + '</dd></div>';
          }).join('') + '</dl>' +
          '<p class="fpo-claim">' + claimText(g) + '</p>' +
        '</aside>' +
      '</header>' +
      (eco.total ? '<div class="fpo-a-band">' + ecoHtml(eco) + '</div>' : '') +
      peekHtml(g.fonts.length);
  }

  function renderB(g, eco) {
    return crumb(g) +
      '<header class="fpo-b">' +
        idBlock(g) +
        '<div class="fpo-b-meta">' +
          factsList(g, ['year', 'site']) +
          sponsorBlock(g) +
          '<p class="fpo-claim">' + claimText(g) + '</p>' +
        '</div>' +
        ecoHtml(eco) +
      '</header>' +
      peekHtml(g.fonts.length);
  }

  function renderC(g, eco) {
    const desc = descOf(g);
    return crumb(g) +
      '<header class="fpo-c">' +
        idBlock(g) +
        (desc ? '<p class="fpo-desc">' + esc(desc) + '</p>' : '') +
        factsList(g, ['kind', 'owned', 'year', 'site']) +
        '<div class="fpo-actions">' + sponsorBlock(g) + '</div>' +
        ecoHtml(eco) +
        '<p class="fpo-claim">' + claimText(g) + '</p>' +
      '</header>' +
      peekHtml(g.fonts.length);
  }

  function renderD(g, eco) {
    /* 贴近现页结构：灰卡双栏 + 卡内同系派生 */
    const site = siteOf(g);
    const year = yearsOf(g);
    const desc = descOf(g);
    const kv = [
      { icon: 'building', dt: '类型', dd: WFChrome.kindLabel(g.info) || '' },
      { icon: 'font', dt: '归属', dd: g.fonts.length ? String(g.fonts.length) : '' },
      { icon: 'calendar', dt: '首发', dd: year },
      {
        icon: 'globe', dt: '官网',
        dd: site
          ? '<a href="' + esc(site) + '" target="_blank" rel="noopener noreferrer">' + esc(hostOf(site)) + '</a>'
          : '未收录官网',
        html: true
      }
    ].filter(function (r) { return r.dd; });

    return crumb(g) +
      '<div class="fpo-d">' +
      '<header class="foundry-hero">' +
        '<div class="foundry-hero-main">' +
          '<div class="foundry-hero-id">' +
            WFChrome.foundryHtml(g.font, {
              info: g.info,
              sub: heroSub(g),
              fav: WFChrome.favHtml('author', g.slug, g.name)
            }) +
          '</div>' +
          (desc ? '<p class="desc">' + esc(desc) + '</p>' : '') +
          sponsorBlock(g) +
          (eco.total
            ? '<div class="foundry-origins foundry-eco">' +
                '<span class="foundry-origins-label">' + WFChrome.icon('branch') + '同系派生</span>' +
                '<span class="foundry-upstream-item">站内另有 <strong>' + eco.total +
                '</strong> 款从本页开源谱系衍生，版权归创作者 · ' +
                eco.groups.map(function (row) {
                  return '<a href="' + WFChrome.href('fonts.html?lineage=' + encodeURIComponent(row.group)) + '">' +
                    esc(row.groupName || row.upstreamName || row.group) + ' ' + row.n + '</a>';
                }).concat(eco.loose.map(function (f) {
                  return '<a href="' + WFChrome.href(WFProto.detailHref(f)) + '">' + esc(f.name) + '</a>';
                })).join(' · ') +
                '</span></div>'
            : '') +
        '</div>' +
        '<aside class="foundry-hero-side">' +
          '<dl class="kv">' + kv.map(function (r) {
            return '<div><dt>' + WFChrome.icon(r.icon) + esc(r.dt) + '</dt><dd>' +
              (r.html ? r.dd : esc(r.dd)) + '</dd></div>';
          }).join('') + '</dl>' +
          '<p class="claim">' + WFChrome.icon('idcard') + '<span>' + claimText(g) + '</span></p>' +
        '</aside>' +
      '</header></div>' +
      peekHtml(g.fonts.length);
  }

  function paint() {
    const gs = groups(catalog);
    const g = gs.find(function (x) { return x.slug === currentSlug; }) || gs[0];
    if (!g) return;
    const eco = ecosystem(catalog, g.slug);
    const map = { a: renderA, b: renderB, c: renderC, d: renderD };
    document.querySelectorAll('.fpo-stage').forEach(function (el) {
      const v = el.getAttribute('data-variant');
      el.innerHTML = '<div class="container">' + map[v](g, eco) + '</div>';
    });
    const back = document.querySelector('.hc-back');
    if (back) back.href = 'foundry.html?slug=' + encodeURIComponent(g.slug);
  }

  if (demoSel) {
    demoSel.addEventListener('change', function () {
      currentSlug = demoSel.value;
      paint();
    });
  }

  WFProto.loadCatalog().then(function (list) {
    catalog = list;
    fromHash();
    paint();
  });
})();
