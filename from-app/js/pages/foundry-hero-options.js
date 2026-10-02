/* 厂商目录顶栏对照。只服务 foundry-hero-options.html。 */
(function () {
  const blocks = document.querySelectorAll('.hc-block');
  const links = document.querySelectorAll('.hc-switch .seg-glyph a');

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
  fromHash();

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
          fonts: [], made: [], kind: info.kind || '', openSource: !!info.openSource
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

  function bucketId(g) {
    if ((g.info && g.info.unlisted) || !g.kind) return 'unlisted';
    if (!g.fonts.length && g.made.length) return 'commissioned';
    if (g.kind === 'author' && g.openSource) return 'oss-author';
    return g.kind || 'unlisted';
  }

  function setText(sel, n) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.textContent = String(n);
    });
  }

  function kindButtons(buckets, withExtra) {
    const primary = [
      ['', '全部', null],
      ['foundry', '字库', buckets.foundry],
      ['brand', '品牌方', buckets.brand],
      ['author', '作者', buckets.author],
      ['oss-author', '开源作者', buckets['oss-author']],
      ['project', '开源项目', buckets.project],
      ['platform', '素材平台', buckets.platform]
    ];
    let html = primary.map(function (row, i) {
      const n = row[2] == null ? '' : '<span class="n">' + row[2] + '</span>';
      return '<button type="button"' + (i === 0 ? ' class="is-on"' : '') + ' disabled>' +
        row[1] + n + '</button>';
    }).join('');
    if (withExtra) {
      html += '<span class="foundry-kinds-gap" aria-hidden="true"></span>' +
        '<button type="button" disabled>仅受托制作<span class="n">' + buckets.commissioned + '</span></button>' +
        '<button type="button" disabled>未核对<span class="n">' + buckets.unlisted + '</span></button>';
    }
    return html;
  }

  function compactButtons(buckets) {
    const authorN = buckets.author + buckets['oss-author'];
    const otherN = buckets.commissioned + buckets.unlisted;
    const rows = [
      ['', '全部', null],
      ['foundry', '字库', buckets.foundry],
      ['brand', '品牌方', buckets.brand],
      ['author', '作者', authorN],
      ['project', '开源项目', buckets.project],
      ['platform', '素材', buckets.platform],
      ['other', '其他', otherN]
    ];
    return rows.map(function (row, i) {
      const n = row[2] == null ? '' : '<span class="n">' + row[2] + '</span>';
      return '<button type="button"' + (i === 0 ? ' class="is-on"' : '') + ' disabled>' +
        row[1] + n + '</button>';
    }).join('');
  }

  function jumpLinks(buckets) {
    const rows = [
      ['foundry', '字库'],
      ['brand', '品牌方'],
      ['author', '作者'],
      ['oss-author', '开源作者'],
      ['project', '开源项目'],
      ['platform', '素材平台']
    ];
    return rows.map(function (row) {
      return '<a href="#peek-c">' + row[1] + '<span class="n">' + buckets[row[0]] + '</span></a>';
    }).join('');
  }

  WFProto.loadCatalog().then(function (list) {
    const gs = groups(list);
    const buckets = {
      foundry: 0, brand: 0, author: 0, 'oss-author': 0, project: 0, platform: 0,
      commissioned: 0, unlisted: 0
    };
    let listed = 0;
    gs.forEach(function (g) {
      const id = bucketId(g);
      if (buckets[id] == null) buckets.unlisted++;
      else buckets[id]++;
      if (id !== 'unlisted' && id !== 'commissioned') listed++;
    });

    setText('[data-listed-n]', listed);
    setText('[data-n-foundry]', buckets.foundry);
    setText('[data-n-brand]', buckets.brand);

    document.querySelectorAll('[data-kind-btns]').forEach(function (el) {
      el.innerHTML = kindButtons(buckets, el.getAttribute('data-extra') === '1');
    });
    document.querySelectorAll('[data-kind-btns-compact]').forEach(function (el) {
      el.innerHTML = compactButtons(buckets);
    });
    document.querySelectorAll('[data-jump-links]').forEach(function (el) {
      el.innerHTML = jumpLinks(buckets);
    });

    const peek = gs
      .filter(function (g) { return bucketId(g) === 'foundry'; })
      .sort(function (a, b) {
        return b.fonts.length - a.fonts.length || a.name.localeCompare(b.name, 'zh');
      })
      .slice(0, 6);
    const cards = peek.map(function (g) {
      return WFChrome.foundryHtml(g.font, {
        sub: '字库 · 归属 ' + g.fonts.length + ' 款'
      });
    }).join('');
    document.querySelectorAll('[data-peek-cards]').forEach(function (el) {
      el.innerHTML = cards;
    });
  });
})();
