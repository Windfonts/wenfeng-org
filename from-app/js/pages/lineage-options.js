/* 谱系悬停 / 选中的参考数据对照。不改现网。 */
(function () {
  const esc = WFProto.escapeHtml;

  function faceOf(f) {
    const w = WFSpecimen.firstWeight(f);
    WFProto.ensureFontCss(f.family, w);
    return 'font-family:' + esc(WFProto.cssFamilyStack(f.family)) + ';font-weight:' + w;
  }

  function bits(f) {
    const chars = f.charCount ? WFProto.formatCount(f.charCount) : '';
    const glyphs = f.glyphCount ? WFProto.formatCount(f.glyphCount) : '';
    const weights = (f.weights && f.weights.length) ? String(f.weights.length) : '';
    const year = f.releaseYear ? String(f.releaseYear) : '';
    const lic = WFChrome.licenseTier(f) || '';
    return { chars: chars, glyphs: glyphs, weights: weights, year: year, lic: lic };
  }

  function tail(f, on) {
    const b = bits(f);
    const n = b.chars ? b.chars + ' 字' : '字符未记';
    return on ? '当前 · ' + n : n;
  }

  function subLine(f) {
    const b = bits(f);
    const parts = [];
    if (b.chars) parts.push('字符 ' + b.chars);
    if (b.glyphs) parts.push('字形 ' + b.glyphs);
    if (b.weights) parts.push(b.weights + ' 字重');
    if (b.year) parts.push(b.year);
    if (b.lic) parts.push(b.lic);
    return parts.join(' · ');
  }

  function cells(f) {
    const b = bits(f);
    const items = [
      ['字符', b.chars || '—'],
      ['字形', b.glyphs || '—'],
      ['字重', b.weights || '—'],
      ['授权', b.lic || '—']
    ];
    return '<span class="lv-cells">' + items.map(function (pair) {
      return '<span><i>' + pair[0] + '</i><b>' + esc(pair[1]) + '</b></span>';
    }).join('') + '</span>';
  }

  function row(f, on, variant) {
    const face = faceOf(f);
    const extra = variant === 'c' ? cells(f) : '<span class="lv-sub">' + esc(subLine(f)) + '</span>';
    const end = variant === 'a'
      ? '<span class="lv-tail">' + esc(tail(f, on)) + '</span>'
      : (on ? '<span class="lin-rel">当前</span>' : '');
    return '<button type="button" class="lin-row' + (on ? ' is-on' : '') + '" data-row>' +
      '<span class="lv-main"><span class="lin-name" style="' + face + '">' + esc(f.name) + '</span>' +
      extra + '</span>' + end + '</button>';
  }

  function sample(font, list) {
    const split = WFChrome.lineageSplit(font, list);
    const rows = [];
    if (split.root) rows.push(split.root);
    split.buckets.fork.forEach(function (f) { rows.push(f); });
    split.buckets.locale.forEach(function (f) { rows.push(f); });
    const seen = {};
    return rows.filter(function (f) {
      if (seen[f.id]) return false;
      seen[f.id] = 1;
      return true;
    }).slice(0, 6);
  }

  function listHtml(rows, current, variant) {
    return '<div class="lin-tree">' + rows.map(function (f) {
      return row(f, f.id === current.id, variant);
    }).join('') + '</div>';
  }

  function col(rows, font, id, cap) {
    return '<section class="lv-col lv-' + id + '">' +
      '<p class="lv-cap"><b>' + cap.title + '</b><span>' + cap.note + '</span></p>' +
      '<div class="detail-main"><section class="panel"><div class="panel-head"><h2>' +
        WFChrome.icon('branch') + '谱系</h2></div><div class="panel-pad">' +
        listHtml(rows, font, id) +
      '</div></section></div></section>';
  }

  WFProto.loadCatalog().then(function (list) {
    const font = list.filter(function (f) { return f.name === '寒蝉宽黑体'; })[0];
    const rows = sample(font, list);
    const root = document.getElementById('grid');
    root.innerHTML = [
      col(rows, font, 'a', { title: '甲 · 行尾', note: '悬停和选中时，名字右边出字符数。选中仍是反白。' }),
      col(rows, font, 'b', { title: '乙 · 次行', note: '悬停和选中时，名字下面一行：字符、字形、字重、年份、授权。' }),
      col(rows, font, 'c', { title: '丙 · 四格', note: '悬停和选中时，展开字符、字形、字重、授权四格。' })
    ].join('');
    root.addEventListener('click', function (e) {
      const btn = e.target.closest('[data-row]');
      if (!btn) return;
      const colEl = btn.closest('.lv-col');
      colEl.querySelectorAll('[data-row]').forEach(function (row) {
        const on = row === btn;
        row.classList.toggle('is-on', on);
        const tailEl = row.querySelector('.lv-tail');
        if (!tailEl) return;
        const name = row.querySelector('.lin-name').textContent;
        const f = rows.filter(function (x) { return x.name === name; })[0];
        if (f) tailEl.textContent = tail(f, on);
      });
    });
  });
})();
