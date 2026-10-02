/* 页脚四套对照。内容跟现站 EXTRA_LINKS / 自动年份走。 */
(function () {
  const esc = WFProto.escapeHtml;
  const ICP_HREF = 'https://beian.miit.gov.cn/';
  const ICP = '粤ICP备2023091240号-3';

  const NOTES = {
    a: '甲 · 一行。左版权右相关，贴着库内结构收。全站可共用。',
    b: '乙 · 两行。现结构收紧：相关在上，版权在下。',
    c: '丙 · 落款。左字标和一句话，右相关。版权落到字标下面。',
    d: '丁 · 字号。用「文风」两个字收口。相关和版权都弱下去。'
  };

  function currentHash() {
    return (location.hash || '#a').replace('#', '') || 'a';
  }
  function markSwitch() {
    const id = currentHash();
    document.querySelectorAll('.fo-switch .seg-glyph a').forEach(function (a) {
      a.classList.toggle('is-on', a.getAttribute('href') === '#' + id);
    });
    document.querySelectorAll('.fo-block').forEach(function (el) {
      el.classList.toggle('is-on', el.id === id);
    });
    const note = document.getElementById('foNote');
    if (note) note.textContent = NOTES[id] || NOTES.a;
  }
  function goBlock() {
    markSwitch();
    window.scrollTo(0, 0);
  }

  function linksHtml() {
    return WFProto.EXTRA_LINKS.map(function (l) {
      return '<a href="' + esc(l.path) + '" target="_blank" rel="noopener noreferrer">' + esc(l.label) + '</a>';
    }).join('');
  }
  function year() { return String(new Date().getFullYear()); }
  function copyHtml(full) {
    const icp = '<a href="' + ICP_HREF + '" target="_blank" rel="noopener noreferrer">' + ICP + '</a>';
    if (full) {
      return 'Copyright © ' + year() + ' Windfonts 文风字体, All Rights Reserved. 文派（广州）科技有限公司；版权所有 · ' + icp;
    }
    return '© ' + year() + ' 文风字体 · 文派（广州）科技有限公司 · ' + icp;
  }

  function fill() {
    const links = '<nav class="fo-links" aria-label="相关链接">' + linksHtml() + '</nav>';
    document.getElementById('footA').innerHTML =
      '<div class="fo-inner"><p class="fo-copy">' + copyHtml(false) + '</p>' + links + '</div>';
    document.getElementById('footB').innerHTML =
      '<div class="fo-inner">' + links + '<p class="fo-copy">' + copyHtml(true) + '</p></div>';
    document.getElementById('footC').innerHTML =
      '<div class="fo-inner">' +
        '<div><a class="wordmark" href="index.html">' +
          '<img src="assets/icon.webp" alt="" width="22" height="22" />' +
          '<span>文风字体</span></a>' +
          '<p class="fo-lead">中文 Webfonts 云服务</p>' +
          '<p class="fo-copy">' + copyHtml(false) + '</p></div>' +
        '<div><p class="fo-related">相关</p>' + links + '</div>' +
      '</div>';
    document.getElementById('footD').innerHTML =
      '<div class="fo-inner"><p class="fo-mark" aria-hidden="true">文风</p>' +
        '<div class="fo-bottom"><p class="fo-copy">' + copyHtml(false) + '</p>' + links + '</div></div>';
  }

  fill();
  if (!location.hash) location.replace('#a');
  goBlock();
  window.addEventListener('hashchange', goBlock);
})();
