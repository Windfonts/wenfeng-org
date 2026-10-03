/* 对照版：看字，拿走代码。不改现站页面。 */
(function () {
  const esc = WFProto.escapeHtml;
  const page = document.body.getAttribute('data-v5');
  const root = document.getElementById('v5');
  const SAMPLE_KEY = 'v5-sample';

  function h(path) { return WFChrome.href(path); }
  function byName(list, name) {
    return list.filter(function (f) { return f.name === name; })[0] || null;
  }
  function weightOf(font) {
    return WFSpecimen.firstWeight(font);
  }
  function faceOf(font, w) {
    const weight = w || weightOf(font);
    WFProto.ensureFontCss(font.family, weight);
    return 'font-family:' + esc(WFProto.cssFamilyStack(font.family)) + ';font-weight:' + WFProto.weightToCss(weight);
  }
  function author(font) {
    const name = WFChrome.brandName(font);
    const slug = WFChrome.brandSlug(font);
    if (!name) return '还没写作者';
    if (!slug) return esc(name);
    return '<a href="' + h('v5-foundry.html?slug=' + encodeURIComponent(slug)) + '">' + esc(name) + '</a>';
  }
  function useLine(font) {
    const tier = WFChrome.licenseTier(font);
    if (WFProto.isOpenFont(font)) return '可以免费用，也可以改。改完换个名字，授权说明留着。';
    if (tier === '免费商用') return '可以免费用。不能改完再发出去。';
    if (tier === '个人免费') return '自己用免费。商用要另外授权。';
    if (tier === '需授权') return '公开使用要先拿到授权。';
    return '许可还没核对。上线前先问权利人。';
  }
  function fromLine(font) {
    const L = font.lineage || {};
    if (L.relation === 'fork' && L.upstreamName) return '这款是从' + L.upstreamName + '改出来的。';
    if (WFProto.isOpenFont(font) && L.relation === 'original') return '这是源头。别人可以改它，换个名字再发出去。';
    if (WFProto.isOpenFont(font)) return '这款可以改。改完换个名字，原来的授权说明不要删。';
    return '';
  }
  function familyLine(font) {
    const fam = WFEmbed.familyName(font.family);
    return 'font-family: "' + fam + '", "PingFang SC", "Microsoft YaHei", sans-serif;';
  }
  function snippet(font) {
    const w = String(WFProto.weightToCss(weightOf(font)));
    const link = WFEmbed.code('link', [{ family: font.family, weights: [w] }]);
    return link + '\n\n' + familyLine(font);
  }
  function sample() {
    try { return sessionStorage.getItem(SAMPLE_KEY) || '风'; } catch (e) { return '风'; }
  }
  function setSample(t) {
    try { sessionStorage.setItem(SAMPLE_KEY, t); } catch (e) { /* ignore */ }
  }
  function detailHref(font) { return h('v5-detail.html?id=' + encodeURIComponent(font.id)); }

  function picks(list) {
    const names = ['阿里巴巴普惠体', '思源黑体', '思源宋体', '站酷快乐体', '得意黑', '霞鹜文楷', '萌神汉宋', '站酷酷黑'];
    const hit = names.map(function (n) { return byName(list, n); }).filter(Boolean);
    return hit.length >= 4 ? hit : list.slice(0, 8);
  }

  function renderHome(list) {
    let current = byName(list, '阿里巴巴普惠体') || list[0];
    root.replaceChildren();
    const box = document.createElement('div');
    box.className = 'v5-wrap';
    root.appendChild(box);

    function draw() {
      const chosen = picks(list);
      box.innerHTML =
        '<section class="v5-hero">' +
          '<h1 id="v5Live" contenteditable="true" spellcheck="false" data-placeholder="写几个字试试">让中文字体，<br>在网页上流动。</h1>' +
          '<div class="v5-hero-foot"><p class="v5-who">这行字用的是 ' + author(current) + '</p>' +
            '<div class="v5-family"><code>' + esc(familyLine(current)) + '</code>' +
            '<button type="button" class="btn" id="v5Copy">复制代码</button></div></div>' +
          '<p class="v5-who" style="margin-top:1rem"><a href="' + detailHref(current) + '">看这款的授权和用法</a></p>' +
        '</section>' +
        '<div class="v5-picks">' + chosen.map(function (f) {
          const on = f.id === current.id;
          return '<button type="button" class="v5-pick' + (on ? ' is-on' : '') + '" data-id="' + esc(f.id) + '">' +
            '<span class="face" style="' + faceOf(f) + '">风</span><span class="nm">' + esc(f.name) + '</span></button>';
        }).join('') + '</div>';
      const live = document.getElementById('v5Live');
      live.style.cssText = faceOf(current);
      document.getElementById('v5Copy').addEventListener('click', function () {
        WFChrome.copy(snippet(current), '已复制');
      });
      box.querySelectorAll('.v5-pick').forEach(function (btn) {
        btn.addEventListener('click', function () {
          current = list.filter(function (f) { return f.id === btn.getAttribute('data-id'); })[0] || current;
          draw();
        });
      });
    }
    draw();
  }

  function pass(font, state) {
    if (state.q) {
      const blob = [font.name, font.en, WFChrome.brandName(font)].join(' ').toLowerCase();
      if (blob.indexOf(state.q) === -1) return false;
    }
    if (state.use === 'free' && WFChrome.licenseTier(font) !== '免费商用') return false;
    if (state.use === 'open' && !WFProto.isOpenFont(font)) return false;
    if (state.cat === 'hei' && !/无衬线|黑体/.test(font.category || '')) return false;
    if (state.cat === 'song' && !/衬线|宋体/.test(font.category || '') ) return false;
    return true;
  }

  function renderFonts(list) {
    const params = new URLSearchParams(location.search);
    const state = { q: (params.get('q') || '').trim().toLowerCase(), use: params.get('use') || '', cat: params.get('cat') || '', n: 24 };
    const barInput = document.querySelector('.v5-search input');
    if (barInput && params.get('q')) barInput.value = params.get('q');

    function draw() {
      const shown = list.filter(function (f) { return pass(f, state); });
      const slice = shown.slice(0, state.n);
      const text = sample();
      const chips = [
        ['', '', '全部'],
        ['use', 'free', '能商用'],
        ['use', 'open', '能改'],
        ['cat', 'hei', '黑体'],
        ['cat', 'song', '宋体']
      ];
      root.innerHTML =
        '<div class="v5-wrap"><div class="v5-tools">' +
          '<input class="v5-sample" id="v5Sample" value="' + esc(text) + '" aria-label="预览文字" />' +
          '<div class="v5-chips">' + chips.map(function (c) {
            const on = c[0] === '' ? (!state.use && !state.cat) : state[c[0]] === c[1];
            return '<button type="button" data-k="' + c[0] + '" data-v="' + c[1] + '"' + (on ? ' class="is-on"' : '') + '>' + c[2] + '</button>';
          }).join('') + '</div>' +
          '<span class="v5-count">' + shown.length + ' 款</span></div>' +
          '<div class="v5-wall">' + slice.map(function (f) {
            return '<a class="v5-card" href="' + detailHref(f) + '"><span class="face" style="' + faceOf(f) + '">' + esc(text) + '</span>' +
              '<span class="meta">' + esc(f.name) + ' · ' + esc(WFChrome.brandName(f) || '未署名') + '</span></a>';
          }).join('') + '</div>' +
          (shown.length > slice.length ? '<div class="v5-more"><button type="button" class="btn" id="v5More">再看 24 款</button></div>' : '') +
        '</div>';
      document.getElementById('v5Sample').addEventListener('input', function (e) {
        setSample(e.target.value || '风');
        root.querySelectorAll('.v5-card .face').forEach(function (el) { el.textContent = e.target.value || '风'; });
      });
      root.querySelectorAll('.v5-chips button').forEach(function (b) {
        b.addEventListener('click', function () {
          const k = b.getAttribute('data-k');
          if (!k) { state.use = ''; state.cat = ''; }
          else state[k] = state[k] === b.getAttribute('data-v') ? '' : b.getAttribute('data-v');
          state.n = 24;
          const q = new URLSearchParams();
          if (state.q) q.set('q', state.q);
          if (state.use) q.set('use', state.use);
          if (state.cat) q.set('cat', state.cat);
          history.replaceState(null, '', 'v5-fonts.html' + (q.toString() ? '?' + q : ''));
          draw();
        });
      });
      const more = document.getElementById('v5More');
      if (more) more.addEventListener('click', function () { state.n += 24; draw(); });
    }
    draw();
  }

  function renderDetail(list) {
    const id = WFProto.getQuery('id');
    let font = list.filter(function (f) { return f.id === id; })[0] || byName(list, '阿里巴巴普惠体') || list[0];
    let w = weightOf(font);
    const weights = WFSpecimen.sortedWeights(font);

    const back = document.querySelector('.v5-back');
    if (back) back.href = h('font-detail.html?id=' + encodeURIComponent(font.id));

    function draw() {
      const open = WFProto.isOpenFont(font);
      const from = fromLine(font);
      const L = font.lineage || {};
      root.innerHTML =
        '<div class="v5-wrap"><section class="v5-stage">' +
          '<p class="sample" id="v5Sample" contenteditable="true" spellcheck="false" data-placeholder="写几个字" style="' + faceOf(font, w) + '">' + esc(font.name) + '</p>' +
          '<div class="v5-title"><h1>' + esc(font.name) + (font.en ? '<small>' + esc(font.en) + '</small>' : '') + '</h1></div>' +
          '<p class="v5-facts">' + author(font) + ' · ' + esc(useLine(font)) + '</p>' +
          (weights.length > 1 ? '<div class="v5-weights">' + weights.map(function (x) {
            const on = String(WFProto.weightToCss(x)) === String(WFProto.weightToCss(w));
            return '<button type="button" data-w="' + esc(x) + '"' + (on ? ' class="is-on"' : '') + '>' + esc(x) + '</button>';
          }).join('') + '</div>' : '') +
          '<div class="v5-acts"><button type="button" class="btn btn-ink" id="v5Copy">复制代码</button>' +
            '<a class="btn" href="' + h('font-detail.html?id=' + encodeURIComponent(font.id)) + '">现站这款</a></div>' +
        '</section>' +
        '<section class="v5-code" id="code"><div class="row"><h2>拿到这款字</h2></div><pre id="v5Pre"></pre></section>' +
        (from ? '<section class="v5-from"><p>' + esc(from) + '</p>' +
          (open ? '<p><a class="btn" href="' + h('app/upload.html?upstream=' + encodeURIComponent(font.id)) + '">上传改好的字</a></p>' : '') +
          (L.group ? '<p class="v5-side-link"><a href="' + h('fonts.html?lineage=' + encodeURIComponent(L.group)) + '">看这一家</a></p>' : '') +
        '</section>' : '') +
        '</div>';
      document.getElementById('v5Pre').textContent = snippet(font);
      document.getElementById('v5Copy').addEventListener('click', function () {
        WFChrome.copy(snippet(font), '已复制');
      });
      root.querySelectorAll('.v5-weights button').forEach(function (b) {
        b.addEventListener('click', function () { w = b.getAttribute('data-w'); draw(); });
      });
    }
    draw();
  }

  function bucket(info) {
    const k = (info && info.kind) || '';
    if (k === 'foundry') return '字库';
    if (k === 'brand') return '品牌';
    if (k === 'author') return '作者';
    if (k === 'project') return '开源项目';
    if (k === 'platform') return '素材平台';
    return '其他';
  }
  function groups(list) {
    const map = {};
    list.forEach(function (f) {
      const info = f.ownerInfo || f.foundryInfo;
      if (!info || !info.id) return;
      if (!map[info.id]) map[info.id] = { info: info, font: f, fonts: [], bucket: bucket(info) };
      map[info.id].fonts.push(f);
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }
  function mark(info, font) {
    const url = WFChrome.brandAvatar(font, info);
    const letter = esc((info.short || info.name || '?').charAt(0));
    if (!url) return '<span class="mark">' + letter + '</span>';
    return '<img src="' + esc(url) + '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'mark\',textContent:' + JSON.stringify((info.short || info.name || '?').charAt(0)) + '}))">';
  }

  function renderFoundry(list) {
    const slug = WFProto.getQuery('slug');
    const gs = groups(list);
    if (!slug) {
      const order = ['字库', '品牌', '作者', '开源项目', '素材平台', '其他'];
      root.innerHTML = '<div class="v5-wrap"><div class="v5-groups">' + order.map(function (name) {
        const rows = gs.filter(function (g) { return g.bucket === name && g.fonts.length; })
          .sort(function (a, b) { return b.fonts.length - a.fonts.length; });
        if (!rows.length) return '';
        return '<section><h2>' + name + ' · ' + rows.length + '</h2><div class="v5-index">' + rows.map(function (g) {
          return '<a class="v5-fd" href="' + h('v5-foundry.html?slug=' + encodeURIComponent(g.info.id)) + '">' +
            mark(g.info, g.font) + '<span><b>' + esc(g.info.name) + '</b><span class="sub">' + g.fonts.length + ' 款</span></span></a>';
        }).join('') + '</div></section>';
      }).join('') + '</div></div>';
      return;
    }
    const g = gs.filter(function (x) { return x.info.id === slug; })[0];
    if (!g) { root.innerHTML = '<div class="v5-wrap"><p>没有这家。<a href="v5-foundry.html">回厂商</a></p></div>'; return; }
    const origins = {};
    g.fonts.forEach(function (f) {
      const L = f.lineage || {};
      if (L.relation === 'fork' && L.upstreamName) origins[L.upstreamName] = (origins[L.upstreamName] || 0) + 1;
    });
    const originText = Object.keys(origins).map(function (n) { return n + ' ' + origins[n] + ' 款'; }).join('，');
    const text = sample();
    root.innerHTML =
      '<div class="v5-wrap"><div class="v5-fd-hero">' + mark(g.info, g.font) +
        '<div><h1>' + esc(g.info.name) + '</h1><p>' + esc(WFChrome.kindLabel(g.info) || g.bucket) + ' · ' + g.fonts.length + ' 款</p></div></div>' +
        (originText ? '<p class="v5-origin">改自 ' + esc(originText) + '</p>' : '') +
        '<div class="v5-wall">' + g.fonts.map(function (f) {
          return '<a class="v5-card" href="' + detailHref(f) + '"><span class="face" style="' + faceOf(f) + '">' + esc(text) + '</span>' +
            '<span class="meta">' + esc(f.name) + '</span></a>';
        }).join('') + '</div></div>';
  }

  WFProto.loadCatalog().then(function (list) {
    if (!list.length) { root.textContent = '目录是空的。'; return; }
    if (page === 'home') renderHome(list);
    else if (page === 'fonts') renderFonts(list);
    else if (page === 'detail') renderDetail(list);
    else if (page === 'foundry') renderFoundry(list);
  }).catch(function () { root.textContent = '目录没有加载出来。'; });
})();
