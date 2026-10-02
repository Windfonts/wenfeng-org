/* 对照实验室索引 · data/lab-archive.json */
(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function paint(data) {
    const labels = data.statusLabels || {};
    const q = (document.getElementById('q').value || '').trim().toLowerCase();
    const st = document.getElementById('status').value;
    let total = 0;
    const byStatus = {};

    (data.groups || []).forEach(function (g) {
      (g.items || []).forEach(function (it) {
        total += 1;
        byStatus[it.status] = (byStatus[it.status] || 0) + 1;
      });
    });

    document.getElementById('stats').innerHTML =
      '<div class="lab-stat"><b>' + total + '</b><span>页</span></div>' +
      Object.keys(labels).map(function (k) {
        return '<div class="lab-stat"><b>' + (byStatus[k] || 0) + '</b><span>' + esc(labels[k]) + '</span></div>';
      }).join('');

    const out = document.getElementById('out');
    const blocks = (data.groups || []).map(function (g) {
      const items = (g.items || []).filter(function (it) {
        if (st && it.status !== st) return false;
        if (!q) return true;
        const hay = [it.href, it.title, it.note, it.status, (it.assets || []).join(' '), (it.docs || []).join(' ')].join(' ').toLowerCase();
        return hay.indexOf(q) >= 0;
      });
      if (!items.length) return '';
      return '<section class="lab-group"><h2>' + esc(g.title) + ' <span style="color:var(--gray);font-weight:400">· ' + items.length + '</span></h2>' +
        '<ul class="lab-list">' +
        items.map(function (it) {
          const tagClass = 'lab-tag is-' + esc(it.status);
          const note = it.note ? '<p class="lab-meta">' + esc(it.note) + '</p>' : '';
          const files = '<p class="lab-meta"><code>' + esc(it.href) + '</code>' +
            ((it.assets || []).length ? ' · ' + (it.assets || []).map(function (a) { return '<code>' + esc(a) + '</code>'; }).join(' ') : '') +
            '</p>';
          const docs = (it.docs || []).length
            ? '<p class="lab-meta">' + (it.docs || []).map(function (d) {
                return '<a href="' + esc(d) + '">' + esc(d.replace(/^docs\//, '')) + '</a>';
              }).join(' · ') + '</p>'
            : '';
          return '<li class="lab-item">' +
            '<div><a class="lab-title" href="' + esc(it.href) + '">' + esc(it.title) + '</a>' +
            note + files + docs + '</div>' +
            '<div class="lab-tags"><span class="' + tagClass + '">' + esc(labels[it.status] || it.status) + '</span></div>' +
            '</li>';
        }).join('') +
        '</ul></section>';
    }).filter(Boolean);

    out.innerHTML = blocks.length ? blocks.join('') : '<p class="lab-empty">没有匹配项。</p>';
  }

  fetch('data/lab-archive.json')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (data) {
      ['q', 'status'].forEach(function (id) {
        document.getElementById(id).addEventListener('input', function () { paint(data); });
        document.getElementById(id).addEventListener('change', function () { paint(data); });
      });
      paint(data);
    })
    .catch(function () {
      document.getElementById('out').innerHTML = '<p class="lab-empty">读不到 data/lab-archive.json。</p>';
    });
})();
