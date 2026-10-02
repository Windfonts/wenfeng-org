/* OSS 作者缺口清单页 · 读 docs/_oss-authors-github-audit.json */
(function () {
  /** 建议首批：独立字体都收。寒蝉 17；狮尾/Aqua 未收录全收（含 sans·leg，各为独立造型仓） */
  const BATCH = {
    /* Fontworks */
    'fontworks/Klee': 1,
    'fontworks/DotGothic16': 1,
    'fontworks/Reggae': 1,
    'fontworks/Train': 1,
    'fontworks/Rampart': 1,
    'fontworks/Stick': 1,
    /* 寒蝉 · 未收录全部 17 */
    'chilltype/ChillBitmap': 1,
    'chilltype/ChillRound': 1,
    'chilltype/ChillMovableType': 1,
    'chilltype/ChillJinshuSong': 1,
    'chilltype/Chillkai': 1,
    'chilltype/ChillDuanHeiSong': 1,
    'chilltype/ChillDIN-ChillDINGothic': 1,
    'chilltype/ChillRoundGothic': 1,
    'chilltype/ChillCalligraphy': 1,
    'chilltype/ChillTanHei': 1,
    'chilltype/ChillMatrixBlack': 1,
    'chilltype/ChillYunmoGothic': 1,
    'chilltype/ChillZhuoKai': 1,
    'chilltype/ChillPixels': 1,
    'chilltype/ChillMatrix': 1,
    'chilltype/ChillMoonmono': 1,
    'chilltype/ChillLine': 1,
    /* 霞鹜剩余 */
    'lxgw/LxgwSeal': 1,
    'lxgw/975Hei': 1,
    'lxgw/Pengli': 1,
    'lxgw/Fanmei': 1,
    'lxgw/LxgwPinyinFont': 1,
    'lxgw/BlackSugarPlumCandy': 1,
    /* 单点 */
    'atelier-anchor/luohei-variable': 1,
    'welai/glow-sans': 1,
    'adobe-fonts/source-han-mono': 1,
    'justfont/Elffont': 1,
    'google-fonts/zen-marugothic': 1,
    'google-fonts/mashanzheng': 1,
    'mplus/MPLUS_FONTS': 1
  };
  /** Aqua（阿杰）未收录：奈楷等 + 全部狮尾造型仓，运行时并入首批 */
  const AQUA_ALL = true;
  const DEFER = {
    'adobe-fonts/source-han-super-otc': '超级 OTC，不适合 CDN 嵌入'
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function keyOf(authorId, repo) {
    return authorId + '/' + repo;
  }

  function deferReason(authorId, repo, k) {
    if (DEFER[k]) return DEFER[k];
    return '';
  }

  function inBatch(authorId, repo, k) {
    if (BATCH[k]) return true;
    if (AQUA_ALL && authorId === 'aqua') return true;
    return false;
  }

  function rowFromMissing(a, m) {
    const k = keyOf(a.id, m.repo);
    return {
      authorId: a.id,
      authorName: a.name,
      repo: m.repo,
      label: m.label || m.repo,
      url: m.url || (a.github ? a.github + '/' + m.repo : ''),
      stars: Number(m.stars) || 0,
      batch: inBatch(a.id, m.repo, k),
      defer: deferReason(a.id, m.repo, k),
      key: k
    };
  }

  function avatarSrc(a) {
    if (a.hasLocalAvatar && a.localAvatar) return a.localAvatar;
    return a.avatarUrl || '';
  }

  function flatMissing(authors) {
    const rows = [];
    authors.forEach(function (a) {
      (a.missing || []).forEach(function (m) {
        rows.push(rowFromMissing(a, m));
      });
    });
    rows.sort(function (x, y) { return y.stars - x.stars; });
    return rows;
  }

  function batchCount(data) {
    return flatMissing(data.authors || []).filter(function (r) { return r.batch; }).length;
  }

  function renderStats(data) {
    const s = data.summary || {};
    const el = document.getElementById('stats');
    const cells = [
      [s.authorsChecked || 0, '审计厂商'],
      [s.withGithub || 0, '有 GitHub'],
      [s.avatarsFilled || 0, '新填头像'],
      [s.totalMissing || 0, '未收录仓'],
      [batchCount(data), '建议首批']
    ];
    el.innerHTML = cells.map(function (c) {
      return '<div class="oa-stat"><b>' + esc(c[0]) + '</b><span>' + esc(c[1]) + '</span></div>';
    }).join('');
  }

  function fillAuthorSelect(authors) {
    const sel = document.getElementById('author');
    authors.slice().sort(function (a, b) {
      return (b.missingCount || 0) - (a.missingCount || 0);
    }).forEach(function (a) {
      const o = document.createElement('option');
      o.value = a.id;
      o.textContent = a.name + ' · 缺 ' + (a.missingCount || 0);
      sel.appendChild(o);
    });
  }

  function tableRows(rows) {
    if (!rows.length) return '<p class="oa-empty">没有匹配项。</p>';
    return '<table class="oa-table"><thead><tr>' +
      '<th>星标</th><th>字体</th><th class="oa-hide-sm">厂商</th><th>标记</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        const tags = [];
        if (r.batch) tags.push('<span class="oa-tag is-batch">首批</span>');
        if (r.defer) tags.push('<span class="oa-tag is-defer" title="' + esc(r.defer) + '">暂缓</span>');
        return '<tr>' +
          '<td class="oa-stars">' + esc(r.stars) + '</td>' +
          '<td><a href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc(r.label) +
            '</a><div class="oa-hide-sm" style="font-size:var(--fs-12);color:var(--gray)">' + esc(r.repo) + '</div></td>' +
          '<td class="oa-hide-sm">' + esc(r.authorName) + '</td>' +
          '<td>' + (tags.join('') || '—') + '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table>';
  }

  function renderAuthors(authors, q) {
    const qq = (q || '').toLowerCase();
    const blocks = authors.filter(function (a) {
      if (!qq) return true;
      return (a.name + a.id + (a.githubLogin || '')).toLowerCase().indexOf(qq) >= 0;
    }).sort(function (a, b) {
      return (b.missingCount || 0) - (a.missingCount || 0);
    });
    if (!blocks.length) return '<p class="oa-empty">没有匹配厂商。</p>';
    return blocks.map(function (a) {
      const av = avatarSrc(a);
      const miss = (a.missing || []).slice().sort(function (x, y) {
        return (y.stars || 0) - (x.stars || 0);
      });
      const gh = a.github
        ? '<a href="' + esc(a.github) + '" target="_blank" rel="noopener">' + esc(a.githubLogin || a.github) + '</a>'
        : '无 GitHub';
      const note = a.note ? ' · ' + esc(a.note) : '';
      const filled = a.avatarFilled ? ' · 本轮新填头像' : (a.hasLocalAvatar ? ' · 本地头像' : '');
      return '<section class="oa-author-block">' +
        '<div class="oa-author-head">' +
          (av ? '<img src="' + esc(av) + '" alt="" />' : '<span class="oa-tag">无头像</span>') +
          '<div><h2>' + esc(a.name) + '</h2>' +
            '<p>' + gh + filled + note +
            ' · 目录 ' + esc(a.fontsInCatalog ? a.fontsInCatalog.length : 0) +
            ' · GH 字体仓 ' + esc((a.fontsOnGithub || []).length) +
            ' · 未收录 <strong>' + esc(a.missingCount || 0) + '</strong></p></div>' +
        '</div>' +
        (miss.length
          ? tableRows(miss.map(function (m) { return rowFromMissing(a, m); }))
          : '<p class="oa-empty">无未收录字体仓（或未解析到 GH）。</p>') +
        '</section>';
    }).join('');
  }

  function renderAvatars(authors) {
    return '<div class="oa-avatar-grid">' + authors.map(function (a) {
      const av = avatarSrc(a);
      let status = '无头像';
      if (a.avatarFilled) status = '本轮新填';
      else if (a.hasLocalAvatar) status = '本地 webp';
      else if (a.avatarUrl) status = 'GitHub（未写入）';
      else if (!a.github) status = '无 GitHub';
      return '<div class="oa-avatar-card">' +
        (av ? '<img src="' + esc(av) + '" alt="" />' : '<span class="oa-tag">—</span>') +
        '<strong>' + esc(a.name) + '</strong>' +
        '<span>' + esc(status) + '</span>' +
        (a.githubLogin ? '<span>@' + esc(a.githubLogin) + '</span>' : '') +
        '</div>';
    }).join('') + '</div>';
  }

  function paint(data) {
    const authors = data.authors || [];
    const view = document.getElementById('view').value;
    const authorId = document.getElementById('author').value;
    const minStars = Number(document.getElementById('stars').value) || 0;
    const q = (document.getElementById('q').value || '').trim().toLowerCase();
    const out = document.getElementById('out');
    const count = document.getElementById('count');

    if (view === 'avatars') {
      document.getElementById('stars').disabled = true;
      count.textContent = authors.length + ' 家厂商头像状态';
      out.innerHTML = renderAvatars(authors);
      return;
    }
    document.getElementById('stars').disabled = false;

    if (view === 'authors') {
      count.textContent = '按厂商展开未收录列表';
      out.innerHTML = renderAuthors(
        authorId ? authors.filter(function (a) { return a.id === authorId; }) : authors,
        q
      );
      return;
    }

    let rows = flatMissing(authors);
    if (view === 'batch') rows = rows.filter(function (r) { return r.batch; });
    if (authorId) rows = rows.filter(function (r) { return r.authorId === authorId; });
    if (minStars) rows = rows.filter(function (r) { return r.stars >= minStars; });
    if (q) {
      rows = rows.filter(function (r) {
        return (r.label + r.repo + r.authorName + r.authorId).toLowerCase().indexOf(q) >= 0;
      });
    }
    count.textContent = '显示 ' + rows.length + ' 条' +
      (view === 'batch' ? '（建议首批）' : '（未收录）') +
      (minStars ? ' · 星标 ≥ ' + minStars : '');
    out.innerHTML = tableRows(rows);
  }

  fetch('docs/_oss-authors-github-audit.json')
    .then(function (r) {
      if (!r.ok) throw new Error('load failed');
      return r.json();
    })
    .then(function (data) {
      renderStats(data);
      fillAuthorSelect(data.authors || []);
      ['view', 'author', 'stars', 'q'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', function () { paint(data); });
        document.getElementById(id).addEventListener('change', function () { paint(data); });
      });
      paint(data);
    })
    .catch(function () {
      document.getElementById('out').innerHTML =
        '<p class="oa-empty">读不到审计 JSON。确认本地有 docs/_oss-authors-github-audit.json。</p>';
    });
})();
