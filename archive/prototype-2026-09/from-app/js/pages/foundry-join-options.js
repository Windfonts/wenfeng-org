/* 厂商 CTA 对照：四套只切换显示，不改正式 foundry.html。 */
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
          fonts: [], made: [], kind: info.kind || ''
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

  function cardSub(g) {
    const n = g.fonts.length;
    const m = g.made.length;
    if (!n && m) return '受托 ' + m + ' 款 · 无归属';
    if (n && m) return '归属 ' + n + ' 款 · 受托 ' + m + ' 款';
    return '归属 ' + n + ' 款';
  }

  function chipHtml(g) {
    const info = g.info || {};
    const name = info.name || g.name || '?';
    const avatar = WFChrome.brandAvatar
      ? WFChrome.brandAvatar(g.font, info)
      : '';
    const mark = avatar
      ? '<img src="' + WFProto.escapeHtml(avatar) + '" alt="" width="28" height="28" loading="lazy" />'
      : '<span class="mark">' + WFProto.escapeHtml(name.charAt(0)) + '</span>';
    return '<span class="fj-tide-chip">' + mark + WFProto.escapeHtml(name) + '</span>';
  }

  function fillTide(row, items) {
    if (!row) return;
    const html = items.map(chipHtml).join('');
    row.innerHTML = html + html;
  }

  WFProto.loadCatalog().then(function (list) {
    const gs = groups(list).sort(function (a, b) {
      return b.fonts.length - a.fonts.length || a.name.localeCompare(b.name, 'zh');
    });
    const listed = gs.filter(function (g) {
      if ((g.info && g.info.unlisted) || !g.kind) return false;
      if (!g.fonts.length && g.made.length) return false;
      return true;
    });

    document.querySelectorAll('[data-listed-n]').forEach(function (el) {
      el.textContent = String(listed.length);
    });

    const unlisted = gs.filter(function (g) {
      return (g.info && g.info.unlisted) || !g.kind;
    }).slice(0, 4);
    const pick = unlisted.length ? unlisted : gs.slice(-4);
    const stubHtml = pick.map(function (g) {
      return WFChrome.foundryHtml(g.font, { sub: cardSub(g) });
    }).join('');
    document.querySelectorAll('[data-stub]').forEach(function (el) {
      el.innerHTML = stubHtml;
    });

    const tidePool = (listed.length ? listed : gs).slice(0, 18);
    const half = Math.ceil(tidePool.length / 2) || 1;
    fillTide(document.getElementById('tideRowA'), tidePool.slice(0, half).concat(tidePool.slice(0, half)));
    fillTide(document.getElementById('tideRowB'), tidePool.slice(half).concat(tidePool.slice(0, Math.max(half, 1))));
  });
})();
