/* 开源谱系四套：发现 + 鼓励二创。现页不动。 */
(function () {
  const esc = WFProto.escapeHtml;
  const ROOT = { sans: "思源黑体", serif: "思源宋体" };
  const FACES = {
    fork: "萌神汉宋",
    root: "思源宋体",
    open: "抖音美好体",
    shut: "站酷酷黑"
  };
  const META = {
    a: ["甲 · 发现 + 出手", "白话。先说从哪来，再列改出来的字，最后请你上传。"],
    b: ["乙 · 邀请", "先说能不能二创。有人做了就当证明，没有就请你做第一款。"],
    c: ["丙 · 同支上 CDN", "文风自己的事：这几款都能嵌。选字袋、子集化、派生上架。"],
    d: ["丁 · 开源林", "思源当头，下面是还没有派生的 OFL。更像专页，不该全塞进详情。"]
  };

  function href(f) { return "font-detail.html?id=" + encodeURIComponent(f.id); }
  function face(f) {
    const w = WFSpecimen.firstWeight(f);
    WFProto.ensureFontCss(f.family, w);
    return "font-family:" + esc(WFProto.cssFamilyStack(f.family)) + ";font-weight:" + w;
  }
  function branch(f) {
    const g = (f.lineage || {}).group;
    if (g === "source-han-sans") return "sans";
    if (g === "source-han-serif") return "serif";
    return "";
  }
  function isRootName(name) { return name === "思源黑体" || name === "思源宋体"; }
  function isLocale(f) {
    if (isRootName(f.name)) return false;
    if ((f.lineage || {}).relation === "locale") return true;
    return /^(思源黑体|思源宋体|思源黑體|思源屏显臻宋)/.test(f.name);
  }
  function isForkPack(f, forks) {
    return forks.some(function (p) {
      return p.id !== f.id && f.name !== p.name && f.name.indexOf(p.name) === 0;
    });
  }
  function family(list, br) {
    const g = br === "sans" ? "source-han-sans" : "source-han-serif";
    return list.filter(function (f) { return (f.lineage || {}).group === g; });
  }
  function split(list, br) {
    const all = family(list, br);
    const rootName = ROOT[br];
    const root = all.filter(function (f) { return f.name === rootName; })[0] || null;
    const locales = all.filter(isLocale);
    const raw = all.filter(function (f) { return !isRootName(f.name) && !isLocale(f); });
    const forks = raw.filter(function (f) { return !isForkPack(f, raw); });
    return { br: br, root: root, rootName: rootName, locales: locales, forks: forks };
  }
  function treeOf(list, font) {
    const br = branch(font);
    return br ? split(list, br) : null;
  }
  function canDerive(font) { return WFProto.isOpenFont(font); }
  function upHref(font) { return "app/upload.html?upstream=" + encodeURIComponent(font.id); }
  function openHref() { return "fonts.html?open=1"; }

  function row(f, on, tag) {
    return '<a class="lin-row' + (on ? " is-on" : "") + '" href="' + href(f) + '">' +
      '<span class="lin-name" style="' + face(f) + '">' + esc(f.name) + "</span>" +
      '<span class="lin-rel">' + esc(tag || "") + (on ? (tag ? " · 当前" : "当前") : "") + "</span></a>";
  }
  function linkRoot(tree) {
    if (tree.root) return '<a href="' + href(tree.root) + '" style="' + face(tree.root) + '">' + esc(tree.root.name) + "</a>";
    return esc(tree.rootName);
  }
  function fromLine(font, tree) {
    if (isRootName(font.name)) return '<p class="lin-from"><strong>' + esc(font.name) + "</strong> · 原作 · 可二创</p>";
    if (isLocale(font)) return '<p class="lin-from">地区包装 · 属于 ' + linkRoot(tree) + "</p>";
    return '<p class="lin-from">派生自 ' + linkRoot(tree) + " · 可二创</p>";
  }
  function localeFold(locales, font) {
    if (!locales.length) return "";
    return '<details class="lin-fold"><summary>' + WFChrome.icon("chevron-down") + "地区包装 " + locales.length + " 款</summary>" +
      locales.map(function (f) { return row(f, f.id === font.id, "地区"); }).join("") + "</details>";
  }
  function acts(items) {
    return '<div class="lin-acts">' + items.join("") + "</div>";
  }
  function btn(href, label, ink) {
    return '<a class="btn' + (ink ? " ink-design" : "") + '" href="' + href + '">' + esc(label) + "</a>";
  }
  function orphans(list, n) {
    return list.filter(function (f) {
      return canDerive(f) && !(f.lineage && f.lineage.group);
    }).slice(0, n || 4);
  }
  function suggestOpen(list) {
    const names = { "思源宋体": 1, "思源黑体": 1, "萌神汉宋": 1 };
    const hit = list.filter(function (f) { return names[f.name]; });
    return hit.length ? hit : orphans(list, 3);
  }
  function wrap(title, body) {
    return '<section class="panel" id="lineage"><div class="panel-head"><h2>' + esc(title) + "</h2></div>" +
      '<div class="panel-pad">' + body + "</div></section>";
  }
  function registerBtn(font, tree) {
    const up = (tree && tree.root) || font;
    return btn(upHref(up), tree && tree.forks.length ? "登记派生" : "登记第一款派生", true);
  }
  function shutBody(list) {
    return '<p class="lin-empty"><strong>此字体不可二创、不可衍生。</strong>许可不允许修改后再分发。</p>' +
      '<h3 class="lin-h">想改字形、再分发，看这些开源款</h3>' +
      '<div class="lin-forks">' + suggestOpen(list).map(function (f) { return row(f, false, "可派生"); }).join("") + "</div>" +
      acts([btn(openHref(), "更多可派生开源字体", false)]);
  }
  function openEmpty(font) {
    return '<p class="lin-invite"><strong>许可允许二创。</strong>改名、保留声明后可以再分发，并上到文风 CDN。</p>' +
      '<p class="lin-empty">本站还没有登记派生。你可以做第一款。</p>' +
      acts([btn(upHref(font), "登记第一款派生", true), btn(openHref(), "看其他开源字体", false)]);
  }
  function gate(font, list, tree, inner) {
    if (tree) return inner;
    return wrap("谱系", canDerive(font) ? openEmpty(font) : shutBody(list));
  }

  function fromA(font, tree) {
    if (isRootName(font.name)) {
      return '<p class="lin-from">这是源头。别人可以改它，换个名字再发出去。</p>';
    }
    if (isLocale(font)) {
      return '<p class="lin-from">这是 ' + linkRoot(tree) + " 的简体 / 繁体。</p>";
    }
    return '<p class="lin-from">这款是从 ' + linkRoot(tree) + " 改出来的。</p>";
  }
  function foldA(locales, font) {
    if (!locales.length) return "";
    return '<details class="lin-fold"><summary>' + WFChrome.icon("chevron-down") +
      "同一款的简体 / 繁体，" + locales.length + " 个</summary>" +
      locales.map(function (f) { return row(f, f.id === font.id, ""); }).join("") + "</details>";
  }
  function shutA(list) {
    return '<p class="lin-empty"><strong>这款不许改，改完也不能发出去。</strong></p>' +
      '<h3 class="lin-h">想改字，用这些开源的</h3>' +
      '<div class="lin-forks">' + suggestOpen(list).map(function (f) { return row(f, false, ""); }).join("") + "</div>" +
      acts([btn(openHref(), "看更多开源字体", false)]);
  }
  function openA(font) {
    return '<p class="lin-invite">这款可以改。改完换个名字，原来的授权说明不要删。</p>' +
      '<p class="lin-empty">还没人把改好的字传到文风。你可以传第一个。</p>' +
      acts([btn(upHref(font), "上传改好的字", true), btn(openHref(), "看别的开源字体", false)]);
  }
  function verA(font, list) {
    const tree = treeOf(list, font);
    if (!tree) return wrap("从哪来", canDerive(font) ? openA(font) : shutA(list));
    const group = (font.lineage && font.lineage.group) || "";
    const up = tree.root || font;
    return wrap("从哪来",
      fromA(font, tree) +
      (tree.forks.length
        ? '<h3 class="lin-h">从同一款改出来的，还有这些</h3><div class="lin-forks">' +
          tree.forks.map(function (f) { return row(f, f.id === font.id, ""); }).join("") + "</div>"
        : '<p class="lin-empty">还没有人把改过的字传到文风。</p>') +
      foldA(tree.locales, font) +
      acts([
        btn(upHref(up), "上传你改的字", true),
        group ? btn("fonts.html?lineage=" + encodeURIComponent(group), "看这一家全部", false) : ""
      ])
    );
  }
  function verB(font, list) {
    const tree = treeOf(list, font);
    if (!tree) {
      if (canDerive(font)) {
        return wrap("谱系",
          '<p class="lin-invite"><strong>这款可以二创。</strong>还没有人把派生交进本站。</p>' +
          '<p class="lin-empty">须改名、保留许可声明。上架后和思源一样可嵌、可子集化。</p>' +
          acts([btn(upHref(font), "我来做第一款", true)])
        );
      }
      return wrap("谱系",
        '<p class="lin-invite"><strong>这款不可以二创。</strong></p>' + shutBody(list)
      );
    }
    return wrap("谱系",
      '<p class="lin-invite"><strong>这款可以二创。</strong>须改名并保留声明，不能拿派生当原作授权。</p>' +
      fromLine(font, tree) +
      (tree.forks.length
        ? '<h3 class="lin-h">已经有人做了</h3><div class="lin-forks">' +
          tree.forks.map(function (f) { return row(f, f.id === font.id, "派生"); }).join("") + "</div>"
        : '<p class="lin-empty">还没有人交进本站。</p>') +
      acts([registerBtn(font, tree), btn(href((tree.root || font)), "看上游", false)])
    );
  }
  function verC(font, list) {
    const tree = treeOf(list, font);
    if (!tree) return gate(font, list, tree);
    const pack = [tree.root].concat(tree.forks).filter(Boolean);
    return wrap("同支",
      '<p class="lin-from">这 ' + pack.length + " 款都在文风 CDN</p>" +
      '<p class="lin-cdn">嵌入、子集化、选字袋是同一套管。派生上架之后也是。</p>' +
      '<div class="lin-forks">' + pack.map(function (f) {
        return row(f, f.id === font.id, f.id === font.id ? "当前 · 可嵌入" : "可嵌入");
      }).join("") + "</div>" +
      acts([
        '<button type="button" class="btn ink-design" data-branch-bag>本支加入选字袋</button>',
        btn("app/subset.html?from=bag", "子集化工作台", false),
        registerBtn(font, tree)
      ])
    );
  }
  function verD(font, list) {
    const tree = treeOf(list, font);
    const chance = orphans(list, 4);
    function branchRow(br) {
      const t = split(list, br);
      const on = tree && tree.br === br;
      const root = t.root;
      const count = t.forks.length + " 派生";
      return '<a class="lin-branch' + (on ? " is-on" : " is-shut") + '" href="' + (root ? href(root) : openHref()) + '">' +
        '<span class="lin-name"' + (root ? ' style="' + face(root) + '"' : "") + ">" + esc(ROOT[br]) + "</span>" +
        '<span class="lin-rel">' + esc(count + (on ? " · 当前支" : "")) + "</span></a>";
    }
    const head = tree
      ? '<p class="lin-from">开源林 · 思源是中文开源里最长的一支</p>' +
        branchRow("sans") + branchRow("serif") +
        (tree.forks.length
          ? '<h3 class="lin-h">本支派生</h3><div class="lin-forks">' +
            tree.forks.map(function (f) { return row(f, f.id === font.id, "派生"); }).join("") + "</div>"
          : "")
      : (canDerive(font)
        ? '<p class="lin-invite"><strong>许可允许二创，还没有挂进任何一支。</strong></p>'
        : '<p class="lin-empty"><strong>此字体不可二创。</strong>下面是可以挂上去的开源机会。</p>');
    return wrap("开源林",
      head +
      (chance.length
        ? '<h3 class="lin-h">还没有派生的 OFL</h3><div class="lin-forks">' +
          chance.map(function (f) { return row(f, f.id === font.id, "机会"); }).join("") + "</div>"
        : "") +
      acts([btn(openHref(), "看开源林", true), btn(upHref((tree && tree.root) || font), "登记派生", false)])
    );
  }

  function parse() {
    const m = (location.hash || "#a-fork").replace("#", "").match(/^([abcd])-(fork|root|open|shut)$/);
    return { v: (m && m[1]) || "a", f: (m && m[2]) || "fork" };
  }
  function mark() {
    const s = parse();
    document.querySelectorAll(".do-switch [data-part]").forEach(function (nav) {
      const part = nav.getAttribute("data-part");
      nav.querySelectorAll("a").forEach(function (a) {
        a.classList.toggle("is-on", a.getAttribute("data-id") === s[part]);
      });
    });
  }

  WFProto.loadCatalog().then(function (list) {
    const faces = {};
    Object.keys(FACES).forEach(function (k) {
      faces[k] = list.filter(function (f) { return f.name === FACES[k]; })[0];
    });
    const first = faces.fork || list[0];
    document.getElementById("doBack").href = "font-detail.html?id=" + encodeURIComponent(first.id);
    list.filter(function (f) { return branch(f) || f === faces.open || f === faces.shut; }).forEach(function (f) {
      if (f) WFProto.ensureFontCss(f.family, WFSpecimen.firstWeight(f));
    });
    const paint = { a: verA, b: verB, c: verC, d: verD };
    const mount = document.querySelector("[data-mount-lin]");
    const meta = document.querySelector("[data-lin-meta]");

    function draw() {
      const s = parse();
      const font = faces[s.f] || first;
      const pair = META[s.v];
      meta.innerHTML = "<b>" + pair[0] + "</b><span>" + pair[1] + "　正看 " + esc(font.name) + "</span>";
      mark();
      mount.innerHTML = paint[s.v](font, list);
      const bag = mount.querySelector("[data-branch-bag]");
      if (bag) {
        bag.addEventListener("click", function () {
          const tree = treeOf(list, font);
          const pack = tree ? [tree.root].concat(tree.forks).filter(Boolean) : [font];
          pack.forEach(function (f) {
            if (!WFProto.hasPick(f.id)) WFProto.addPick(f.id, f.name);
          });
          WFChrome.toast("已加入选字袋 " + pack.length + " 款");
        });
      }
    }

    if (!location.hash) history.replaceState(null, "", "#a-fork");
    draw();
    window.addEventListener("hashchange", draw);
    document.querySelectorAll(".do-switch [data-part] a").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        const s = parse();
        s[a.parentNode.getAttribute("data-part")] = a.getAttribute("data-id");
        location.hash = s.v + "-" + s.f;
      });
    });
  });
})();
