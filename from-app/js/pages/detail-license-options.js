/* 授权收束 + 谱系四套对照。现页不动。 */
(function () {
  const esc = WFProto.escapeHtml;
  const REL = { original: '原作', locale: '地区版', fork: '派生', commissioned: '委托定制', collab: '合作' };
  const LIC_META = {
    a: ['甲 · 收束', '导语和可以 / 不可以留下。出处默认合上，里面不再重复条款，谱系不提制作方。'],
    b: ['乙 · 现页', '对照用。出处撑开，还可以 / 还不可以、制作方、版权都还在。'],
    c: ['丙 · 短句', '可以 / 不可以收成两行，不要网格。出处合上，只留核对。'],
    d: ['丁 · 一句', '只留导语和出处入口。条款进折里。']
  };
  const TREE_META = {
    a: ['甲 · 族谱', '上游在上，派生挂在下面。当前这款标出来。适合进同系页。'],
    b: ['乙 · Fork', 'GitHub 那句「派生自」。先认上游，再列同系。适合详情页。'],
    c: ['丙 · 祖先', '一行写清从哪来，同系用横滑样张。比族谱轻。'],
    d: ['丁 · 四卡', '现页同系：四张卡 + 两个全部链接。']
  };

  function lists(font) {
    const tier = WFChrome.licenseTier(font);
    const ev = WFChrome.licenseEvidence(font);
    const name = String(font.licenseName || ev.label || font.license || '');
    const ok = [], no = [];
    if (/OFL|Open Font|Apache|MIT|IPA/i.test(name + ' ' + (ev.spdx || ''))) {
      ok.push('网页、App、印刷、商业项目均可使用', '可嵌入网页并再分发（保留许可声明）', '可修改后以其他名称发布');
      no.push('不得单独售卖字体文件', '不得去除版权与许可声明');
    } else if (tier === '免费商用') {
      ok.push('可免费用于商业项目与网页嵌入', '可用于品牌、电商、海报、界面');
      no.push('不得修改字体文件后再分发', '不得单独售卖字体文件');
      if (!ev.verified) no.push('条款尚未核对原文，上线前请打开出处');
    } else {
      no.push('许可信息待核实');
    }
    (ev.restrictions || []).forEach(function (t) { if (no.indexOf(t) === -1) no.push(t); });
    return { ok: ok, no: no, notes: font.licenseNotes || '' };
  }
  function lead(font) {
    const t = WFChrome.licenseTier(font);
    if (t === '免费商用') return '可免费用于网页、App、印刷与商业项目。';
    if (t === '个人免费') return '个人非商业用途免费，商用需另行授权。';
    return '许可尚未核对，上线前请先联系权利人。';
  }
  function grid(lic, extra) {
    const ok = extra ? lic.ok : lic.ok.slice(0, 3);
    const no = extra ? lic.no : lic.no.slice(0, 3);
    return '<div class="license-grid">' +
      '<div><h3>可以</h3><ul class="ok">' + ok.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h3>不可以</h3><ul class="no">' + no.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></div>';
  }
  function head(font) {
    return '<div class="panel-head"><h2>授权</h2><div class="license-head">' +
      '<span class="tier">' + esc(WFChrome.licenseTier(font)) + '</span>' +
      (font.licenseName ? '<span class="name">' + esc(font.licenseName) + '</span>' : '') +
      '</div></div>';
  }
  function lineageSlim(font) {
    const L = font.lineage || {};
    const bits = [];
    if (L.relation) bits.push(REL[L.relation] || L.relation);
    if (L.upstreamName) bits.push('上游 ' + L.upstreamName);
    if (L.groupName) bits.push('同系 ' + L.groupName);
    if (!bits.length) return '';
    return '<div class="license-cite lineage"><p class="cite-meta">' + WFChrome.icon('history') +
      '<span>' + esc(bits.join(' · ')) + '</span></p></div>';
  }
  function fold(inner, open) {
    return '<details class="side-fold license-fold"' + (open ? ' open' : '') + '>' +
      '<summary>' + WFChrome.icon('chevron-down') + '出处与依据</summary>' + inner + '</details>';
  }
  function wrapLic(font, body) {
    return '<section class="panel" id="license">' + head(font) + '<div class="panel-pad">' + body + '</div></section>';
  }

  function licA(font) {
    const lic = lists(font);
    return wrapLic(font, '<p class="license-lead">' + esc(lead(font)) + '</p>' + grid(lic, false) +
      fold(WFChrome.licenseCiteHtml(font) + lineageSlim(font) +
        '<p class="license-foot"><a href="license.html">许可类型说明</a></p>', false));
  }
  function licB(font) {
    const lic = lists(font);
    const extra = (lic.ok.length > 3 || lic.no.length > 3)
      ? '<div class="license-grid">' +
        (lic.ok.length > 3 ? '<div><h3>还可以</h3><ul class="ok">' + lic.ok.slice(3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
        (lic.no.length > 3 ? '<div><h3>还不可以</h3><ul class="no">' + lic.no.slice(3).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
        '</div>' : '';
    return wrapLic(font, '<p class="license-lead">' + esc(lead(font)) + '</p>' + grid(lic, false) +
      fold(WFChrome.licenseCiteHtml(font) + WFChrome.lineageHtml(font) +
        (lic.notes ? '<p class="license-notes">' + esc(lic.notes) + '</p>' : '') + extra +
        '<p class="license-foot">' + (font.copyright ? esc(font.copyright) + '<br>' : '') +
        ' <a href="license.html">许可类型说明</a></p>', true));
  }
  function licC(font) {
    const lic = lists(font);
    return wrapLic(font, '<p class="license-lead">' + esc(lead(font)) + '</p>' +
      '<p class="lic-short"><b>可以</b> ' + esc(lic.ok.slice(0, 2).join(' · ')) +
      '<br><b>不可以</b> ' + esc(lic.no.slice(0, 2).join(' · ')) + '</p>' +
      fold(WFChrome.licenseCiteHtml(font) + '<p class="license-foot"><a href="license.html">许可类型说明</a></p>', false));
  }
  function licD(font) {
    return wrapLic(font, '<p class="license-lead">' + esc(lead(font)) + '</p>' +
      fold(WFChrome.licenseCiteHtml(font) + grid(lists(font), false) +
        '<p class="license-foot"><a href="license.html">许可类型说明</a></p>', false));
  }

  function kin(list, font) {
    const g = font.lineage && font.lineage.group;
    return g ? list.filter(function (f) { return f.lineage && f.lineage.group === g; }) : [];
  }
  function rel(f) { return REL[(f.lineage || {}).relation] || ''; }
  function href(f) { return 'font-detail.html?id=' + encodeURIComponent(f.id); }
  function face(f) {
    const w = WFSpecimen.firstWeight(f);
    WFProto.ensureFontCss(f.family, w);
    return 'font-family:' + esc(WFProto.cssFamilyStack(f.family)) + ';font-weight:' + w;
  }
  function row(f, on) {
    return '<a class="lin-row' + (on ? ' is-on' : '') + '" href="' + href(f) + '">' +
      '<span class="lin-name" style="' + face(f) + '">' + esc(f.name) + '</span>' +
      '<span class="lin-rel">' + esc(rel(f) || '同系') + (on ? ' · 当前' : '') + '</span></a>';
  }

  function treeA(font, list) {
    const all = kin(list, font);
    const up = (font.lineage && font.lineage.upstreamName) || '';
    let roots = up ? all.filter(function (f) { return f.name === up; }) : [];
    if (!roots.length) {
      roots = all.filter(function (f) { return (f.lineage || {}).relation === 'original'; });
      if (roots.length > 1) roots = roots.slice().sort(function (a, b) { return a.name.length - b.name.length; }).slice(0, 1);
    }
    if (!roots.length) roots = [font];
    const kids = all.filter(function (f) { return roots.indexOf(f) === -1 && f.id !== font.id; });
    if (roots[0].id !== font.id) kids.unshift(font);
    const show = roots;
    return '<section class="panel"><div class="panel-head"><h2>谱系</h2></div><div class="panel-pad">' +
      '<p class="license-lead">' + esc((font.lineage && font.lineage.groupName) || '同系') + ' · ' + all.length + ' 款</p>' +
      '<div class="lin-tree">' + show.map(function (r) {
        return row(r, r.id === font.id) +
          '<div class="lin-kids">' + kids.map(function (k) { return row(k, k.id === font.id); }).join('') + '</div>';
      }).join('') + '</div></div></section>';
  }
  function treeB(font, list) {
    const L = font.lineage || {};
    const others = kin(list, font).filter(function (f) { return f.id !== font.id; });
    const up = list.filter(function (f) { return f.name === L.upstreamName; })[0];
    return '<section class="panel"><div class="panel-head"><h2>谱系</h2></div><div class="panel-pad">' +
      '<p class="lin-forked">' + esc(REL[L.relation] || '同系') +
      (up || L.upstreamName ? '自 ' + (up ? '<a href="' + href(up) + '">' + esc(up.name) + '</a>' : esc(L.upstreamName)) : '') +
      '</p>' +
      (L.licenseFollows === 'inherit' ? '<p class="cite-warn">沿用上游许可。派生须改名并保留声明，不能拿自己当原作授权。</p>' : '') +
      (others.length ? '<h3 class="lin-h">同系 ' + (others.length + 1) + ' 款</h3><div class="lin-forks">' +
        others.map(function (f) { return row(f, false); }).join('') + '</div>' : '') +
      '</div></section>';
  }
  function treeC(font, list) {
    const L = font.lineage || {};
    const up = list.filter(function (f) { return f.name === L.upstreamName; })[0];
    const others = kin(list, font).filter(function (f) { return f.id !== font.id; }).slice(0, 6);
    return '<section class="panel"><div class="panel-head"><h2>谱系</h2></div><div class="panel-pad">' +
      '<p class="lin-anc">' +
        '<a class="is-on" href="' + href(font) + '" style="' + face(font) + '">' + esc(font.name) + '</a>' +
        (up || L.upstreamName ? '<span>←</span>' +
          (up ? '<a href="' + href(up) + '" style="' + face(up) + '">' + esc(up.name) + '</a>' : '<span>' + esc(L.upstreamName) + '</span>') : '') +
      '</p>' +
      '<p class="do-note">' + esc(REL[L.relation] || '同系') + (L.groupName ? ' · ' + esc(L.groupName) : '') + '</p>' +
      '<ul class="specimens is-grid lin-rail"></ul></div></section>';
  }
  function treeD(font, list) {
    const L = font.lineage || {};
    return '<section class="detail-related"><div class="section-head"><h2>' +
      (L.groupName ? '同系字体' : '相关字体') + '</h2>' +
      (L.group ? '<a class="more" href="fonts.html?lineage=' + encodeURIComponent(L.group) + '">' + esc(L.groupName || '同系') + ' →</a>' : '') +
      '</div><ul class="specimens is-grid"></ul></section>';
  }

  function parse() {
    const m = (location.hash || '#la-ta').replace('#', '').match(/^l([abcd])-t([abcd])$/);
    return { l: (m && m[1]) || 'a', t: (m && m[2]) || 'a' };
  }
  function paintMeta(el, pair) {
    el.innerHTML = '<b>' + pair[0] + '</b><span>' + pair[1] + '</span>';
  }
  function mark(part, id) {
    document.querySelectorAll('.do-switch [data-part="' + part + '"] a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('data-id') === id);
    });
  }

  WFProto.loadCatalog().then(function (list) {
    const licFont = list.filter(function (f) { return f.name === '阿里巴巴普惠体'; })[0] || list[0];
    const treeFont = list.filter(function (f) { return f.name === '萌神汉宋'; })[0] || list[0];
    document.getElementById('doBack').href = 'font-detail.html?id=' + encodeURIComponent(licFont.id);
    document.title = '授权与谱系 · 文风字体';
    WFSpecimen.sortedWeights(licFont).forEach(function (w) { WFProto.ensureFontCss(licFont.family, WFProto.weightToCss(w)); });
    kin(list, treeFont).concat([treeFont]).forEach(function (f) {
      WFProto.ensureFontCss(f.family, WFSpecimen.firstWeight(f));
    });

    const licPaint = { a: licA, b: licB, c: licC, d: licD };
    const treePaint = { a: treeA, b: treeB, c: treeC, d: treeD };
    const licRoot = document.querySelector('[data-mount-lic]');
    const treeRoot = document.querySelector('[data-mount-tree]');

    function draw() {
      const s = parse();
      paintMeta(document.querySelector('[data-lic-meta]'), LIC_META[s.l]);
      paintMeta(document.querySelector('[data-tree-meta]'), TREE_META[s.t]);
      mark('l', s.l);
      mark('t', s.t);
      licRoot.innerHTML = licPaint[s.l](licFont);
      treeRoot.innerHTML = treePaint[s.t](treeFont, list);
      const rail = treeRoot.querySelector('.lin-rail, .specimens');
      if (rail) {
        const rows = s.t === 'c'
          ? kin(list, treeFont).filter(function (f) { return f.id !== treeFont.id; }).slice(0, 6)
          : WFProto.relatedFonts(treeFont, 4);
        WFSpecimen.renderRows(rail, rows, { size: 40, noAction: s.t === 'c' });
      }
    }

    if (!location.hash) history.replaceState(null, '', '#la-ta');
    draw();
    window.addEventListener('hashchange', draw);
    document.querySelectorAll('.do-switch [data-part] a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const s = parse();
        const part = a.parentNode.getAttribute('data-part');
        s[part] = a.getAttribute('data-id');
        location.hash = 'l' + s.l + '-t' + s.t;
      });
    });
  });
})();
