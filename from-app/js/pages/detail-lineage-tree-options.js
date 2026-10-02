/* 谱系三套重做。不进正式站。 */
(function () {
  const esc = WFProto.escapeHtml;
  const SAMPLE = '春江花月夜';
  const FACES = { fork: '萌神汉宋', root: '思源宋体', ghost: '猫啃竹圆体' };
  const META = {
    a: ['甲 · 同文', '全家族排同一句。看的是字样差别，不是一份目录。当前这一行更大。'],
    b: ['乙 · 大幅', '来历做成标题字。上游很大，这款次之，其余铺成一排名字。'],
    c: ['丙 · 横滑', '上面只留上游和这款。同族收成一排可以横滑的字样卡。']
  };

  function byName(list, name) {
    return list.filter(function (f) { return f.name === name; })[0] || null;
  }
  function faceOf(f) {
    const w = WFSpecimen.firstWeight(f);
    WFProto.ensureFontCss(f.family, w);
    return 'font-family:' + esc(WFProto.cssFamilyStack(f.family)) + ';font-weight:' + w;
  }
  function go(f) { return 'font-detail.html?id=' + encodeURIComponent(f.id); }
  function rel(f) { return WFChrome.REL_LABEL[(f.lineage || {}).relation] || '同系'; }
  function packs(split) {
    const shown = {};
    if (split.root) shown[split.root.id] = true;
    split.rest.forEach(function (f) { shown[f.id] = true; });
    return split.all.filter(function (f) { return !shown[f.id]; });
  }
  function others(split, font) {
    return split.rest.filter(function (f) { return f.id !== font.id; });
  }
  function head() {
    return '<h2 class="ld-h">' + WFChrome.icon('branch') + '谱系</h2>';
  }
  function packNote(split) {
    const n = packs(split).length;
    if (!n || !split.L.group) return '';
    return '<p class="ld-packs">另有 ' + n + ' 个地区包，字样接近原作。<a href="' +
      WFChrome.href('fonts.html?lineage=' + encodeURIComponent(split.L.group)) + '">在字体库看</a></p>';
  }
  function sampleLink(f, cls) {
    return '<a class="' + cls + '" style="' + faceOf(f) + '" href="' + go(f) + '">' + SAMPLE + '</a>';
  }
  function nameLink(f, cls) {
    return '<a class="' + cls + '" style="' + faceOf(f) + '" href="' + go(f) + '">' + esc(f.name) + '</a>';
  }

  function sheet(font, split) {
    const lines = [];
    const isRoot = split.root && split.root.id === font.id;
    if (!isRoot) {
      if (split.root) {
        lines.push('<article class="ld-line"><span class="ld-rel">原作</span>' +
          sampleLink(split.root, 'ld-sample') + '<span class="ld-who">' + esc(split.root.name) + '</span></article>');
      } else if (split.up) {
        lines.push('<article class="ld-line"><span class="ld-rel">原作</span>' +
          '<p class="ld-miss-name">' + esc(split.up) + '</p><span class="ld-who">库里没有，没法排它的字样</span></article>');
      }
    }
    lines.push('<article class="ld-line is-now"><span class="ld-rel">' +
      esc(isRoot ? '原作 · 当前' : rel(font) + ' · 当前') + '</span>' +
      '<p class="ld-sample" style="' + faceOf(font) + '">' + SAMPLE + '</p>' +
      '<span class="ld-who">' + esc(font.name) + '</span></article>');
    others(split, font).forEach(function (f) {
      lines.push('<article class="ld-line"><span class="ld-rel">' + esc(rel(f)) + '</span>' +
        sampleLink(f, 'ld-sample') + '<span class="ld-who">' + esc(f.name) + '</span></article>');
    });
    return '<div class="ld">' + head() + '<div class="ld-sheet">' + lines.join('') + '</div>' + packNote(split) + '</div>';
  }

  function poster(font, split) {
    const isRoot = split.root && split.root.id === font.id;
    let story = '';
    if (isRoot) {
      story = '<p class="ld-kicker">原作 · 当前</p>' +
        '<p class="ld-display is-root" style="' + faceOf(font) + '">' + esc(font.name) + '</p>';
    } else if (split.root) {
      story = '<p class="ld-kicker">改自</p>' + nameLink(split.root, 'ld-display') +
        '<p class="ld-kicker">这款 · ' + esc(rel(font)) + '</p>' +
        '<p class="ld-display is-now" style="' + faceOf(font) + '">' + esc(font.name) + '</p>';
    } else {
      story = '<p class="ld-kicker">改自</p>' +
        '<p class="ld-display is-miss">' + esc(split.up || '原作') + ' · 库里没有</p>' +
        '<p class="ld-kicker">这款 · ' + esc(rel(font)) + '</p>' +
        '<p class="ld-display is-now" style="' + faceOf(font) + '">' + esc(font.name) + '</p>';
    }
    const cells = others(split, font).map(function (f) {
      return '<a class="ld-cell" href="' + go(f) + '"><b style="' + faceOf(f) + '">' + esc(f.name) + '</b>' +
        '<span class="ld-rel">' + esc(rel(f)) + '</span></a>';
    }).join('');
    return '<div class="ld ld-poster">' + head() + story +
      (cells ? '<div class="ld-grid">' + cells + '</div>' : '') + packNote(split) + '</div>';
  }

  function film(font, split) {
    const isRoot = split.root && split.root.id === font.id;
    let hero = '';
    if (isRoot) {
      hero = '<p class="ld-kicker">原作 · 当前</p>' +
        '<p class="ld-display" style="' + faceOf(font) + '">' + esc(font.name) + '</p>';
    } else if (split.root) {
      hero = '<div><p class="ld-kicker">原作</p>' + nameLink(split.root, 'ld-display') + '</div>' +
        '<div><p class="ld-kicker">这款 · ' + esc(rel(font)) + '</p>' +
        '<p class="ld-display" style="' + faceOf(font) + '">' + esc(font.name) + '</p></div>';
    } else {
      hero = '<div><p class="ld-kicker">原作 · 库里没有</p>' +
        '<p class="ld-display is-miss">' + esc(split.up || '原作') + '</p></div>' +
        '<div><p class="ld-kicker">这款 · ' + esc(rel(font)) + '</p>' +
        '<p class="ld-display" style="' + faceOf(font) + '">' + esc(font.name) + '</p></div>';
    }
    const cards = others(split, font).map(function (f) {
      return '<a class="ld-card" href="' + go(f) + '"><span class="ld-rel">' + esc(rel(f)) + '</span>' +
        '<i style="' + faceOf(f) + '">' + SAMPLE + '</i><span class="ld-who">' + esc(f.name) + '</span></a>';
    }).join('');
    return '<div class="ld">' + head() + '<div class="ld-hero">' + hero + '</div>' +
      (cards ? '<div class="ld-strip">' + cards + '</div>' : '') + packNote(split) + '</div>';
  }

  function parse() {
    const h = (location.hash || '#a-fork').replace('#', '').split('-');
    const v = h[0] === 'b' || h[0] === 'c' ? h[0] : 'a';
    return { v: v, f: FACES[h[1]] ? h[1] : 'fork' };
  }
  function render() {
    const list = WFProto.getCatalogList();
    const st = parse();
    const font = byName(list, FACES[st.f]) || list[0];
    const split = WFChrome.lineageSplit(font, list);
    const meta = META[st.v];
    document.querySelector('[data-lt-meta]').innerHTML =
      '<b>' + esc(font.name) + '</b><span>' + esc(meta[0]) + ' · ' + esc(meta[1]) + '</span>';
    const html = st.v === 'b' ? poster(font, split) : st.v === 'c' ? film(font, split) : sheet(font, split);
    document.querySelector('[data-mount-lt]').innerHTML = html;
    document.querySelectorAll('.seg-glyph a').forEach(function (a) {
      const part = a.parentNode.getAttribute('data-part');
      const on = part === 'v' ? a.getAttribute('data-id') === st.v : a.getAttribute('data-id') === st.f;
      a.classList.toggle('is-on', on);
      if (part === 'v') a.href = '#' + a.getAttribute('data-id') + '-' + st.f;
      else a.href = '#' + st.v + '-' + a.getAttribute('data-id');
    });
    const back = document.getElementById('doBack');
    if (back && font) back.href = 'font-detail.html?id=' + encodeURIComponent(font.id) + '#lineage';
  }

  WFProto.loadCatalog().then(function () {
    if (!location.hash || location.hash.charAt(1) === 'd') history.replaceState(null, '', '#a-fork');
    render();
    window.addEventListener('hashchange', render);
    document.querySelectorAll('.do-switch [data-part] a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const s = parse();
        s[a.parentNode.getAttribute('data-part')] = a.getAttribute('data-id');
        location.hash = s.v + '-' + s.f;
      });
    });
  });
})();
