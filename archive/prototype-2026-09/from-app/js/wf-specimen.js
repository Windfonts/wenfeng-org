/* 文风字体 v4 · 样张组件：控制条 + 样张行 + 字重逐行 + 字符表。依赖 wf-proto.js / wf-chrome.js */
(function () {
  const esc = function (s) { return WFProto.escapeHtml(s); };

  const PRESETS = [
    { id: 'line', label: '短句', text: '春风又绿江南岸' },
    { id: 'title', label: '标题', text: '字里行间' },
    { id: 'para', label: '段落', text: '天地玄黄，宇宙洪荒' },
    { id: 'brand', label: '品牌', text: '文派 Wenpai' },
    { id: 'poem', label: '诗句', text: '行到水穷处，坐看云起时' },
    { id: 'mix', label: '中英数', text: '汉字 Hànzì Aa 0123' }
  ];

  /* —— 字符表数据 ——
     千字文全文：简体版 1000 字（云/昆/发/洁/并/戚六处为简化字合并造成的重字，按原文存真）；
     繁体版按通行本还原（雲/崑、髮/發、潔/絜、并/並、慼/戚各归其位），1000 字无一重复。
     传统上它就是习字总集，这里当常用字盘点用。 */
  const QIANZIWEN = {
    hans: '天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏闰余成岁律吕调阳云腾致雨露结为霜金生丽水玉出昆冈剑号'+
      '巨阙珠称夜光果珍李柰菜重芥姜海咸河淡鳞潜羽翔龙师火帝鸟官人皇始制文字乃服衣裳推位让国有虞陶唐吊民伐罪'+
      '周发殷汤坐朝问道垂拱平章爱育黎首臣伏戎羌遐迩一体率宾归王鸣凤在竹白驹食场化被草木赖及万方盖此身发四大'+
      '五常恭惟鞠养岂敢毁伤女慕贞洁男效才良知过必改得能莫忘罔谈彼短靡恃己长信使可覆器欲难量墨悲丝染诗赞羔羊'+
      '景行维贤克念作圣德建名立形端表正空谷传声虚堂习听祸因恶积福缘善庆尺璧非宝寸阴是竞资父事君曰严与敬孝当'+
      '竭力忠则尽命临深履薄夙兴温凊似兰斯馨如松之盛川流不息渊澄取映容止若思言辞安定笃初诚美慎终宜令荣业所基'+
      '籍甚无竟学优登仕摄职从政存以甘棠去而益咏乐殊贵贱礼别尊卑上和下睦夫唱妇随外受傅训入奉母仪诸姑伯叔犹子'+
      '比儿孔怀兄弟同气连枝交友投分切磨箴规仁慈隐恻造次弗离节义廉退颠沛匪亏性静情逸心动神疲守真志满逐物意移'+
      '坚持雅操好爵自縻都邑华夏东西二京背邙面洛浮渭据泾宫殿盘郁楼观飞惊图写禽兽画彩仙灵丙舍旁启甲帐对楹肆筵'+
      '设席鼓瑟吹笙升阶纳陛弁转疑星右通广内左达承明既集坟典亦聚群英杜稿钟隶漆书壁经府罗将相路侠槐卿户封八县'+
      '家给千兵高冠陪辇驱毂振缨世禄侈富车驾肥轻策功茂实勒碑刻铭磻溪伊尹佐时阿衡奄宅曲阜微旦孰营桓公匡合济弱'+
      '扶倾绮回汉惠说感武丁俊乂密勿多士寔宁晋楚更霸赵魏困横假途灭虢践土会盟何遵约法韩弊烦刑起翦颇牧用军最精'+
      '宣威沙漠驰誉丹青九州禹迹百郡秦并岳宗泰岱禅主云亭雁门紫塞鸡田赤城昆池碣石钜野洞庭旷远绵邈岩岫杳冥治本'+
      '于农务兹稼穑俶载南亩我艺黍稷税熟贡新劝赏黜陟孟轲敦素史鱼秉直庶几中庸劳谦谨敕聆音察理鉴貌辨色贻厥嘉猷'+
      '勉其祗植省躬讥诫宠增抗极殆辱近耻林皋幸即两疏见机解组谁逼索居闲处沉默寂寥求古寻论散虑逍遥欣奏累遣戚谢'+
      '欢招渠荷的历园莽抽条枇杷晚翠梧桐蚤凋陈根委翳落叶飘摇游鹍独运凌摩绛霄耽读玩市寓目囊箱易輶攸畏属耳垣墙'+
      '具膳餐饭适口充肠饱饫烹宰饥厌糟糠亲戚故旧老少异粮妾御绩纺侍巾帷房纨扇圆洁银烛炜煌昼眠夕寐蓝笋象床弦歌'+
      '酒宴接杯举觞矫手顿足悦豫且康嫡后嗣续祭祀蒸尝稽颡再拜悚惧恐惶笺牒简要顾答审详骸垢想浴执热愿凉驴骡犊特'+
      '骇跃超骧诛斩贼盗捕获叛亡布射僚丸嵇琴阮啸恬笔伦纸钧巧任钓释纷利俗并皆佳妙毛施淑姿工颦妍笑年矢每催曦晖'+
      '朗曜璇玑悬斡晦魄环照指薪修祜永绥吉劭矩步引领俯仰廊庙束带矜庄徘徊瞻眺孤陋寡闻愚蒙等诮谓语助者焉哉乎也',
    hant: '天地玄黃宇宙洪荒日月盈昃辰宿列張寒來暑往秋收冬藏閏餘成歲律呂調陽雲騰致雨露結為霜金生麗水玉出崑岡劍號'+
      '巨闕珠稱夜光果珍李柰菜重芥薑海鹹河淡鱗潛羽翔龍師火帝鳥官人皇始制文字乃服衣裳推位讓國有虞陶唐弔民伐罪'+
      '周發殷湯坐朝問道垂拱平章愛育黎首臣伏戎羌遐邇一體率賓歸王鳴鳳在竹白駒食場化被草木賴及萬方蓋此身髮四大'+
      '五常恭惟鞠養豈敢毀傷女慕貞潔男效才良知過必改得能莫忘罔談彼短靡恃己長信使可覆器欲難量墨悲絲染詩讚羔羊'+
      '景行維賢克念作聖德建名立形端表正空谷傳聲虛堂習聽禍因惡積福緣善慶尺璧非寶寸陰是競資父事君曰嚴與敬孝當'+
      '竭力忠則盡命臨深履薄夙興溫凊似蘭斯馨如松之盛川流不息淵澄取映容止若思言辭安定篤初誠美慎終宜令榮業所基'+
      '籍甚無竟學優登仕攝職從政存以甘棠去而益詠樂殊貴賤禮別尊卑上和下睦夫唱婦隨外受傅訓入奉母儀諸姑伯叔猶子'+
      '比兒孔懷兄弟同氣連枝交友投分切磨箴規仁慈隱惻造次弗離節義廉退顛沛匪虧性靜情逸心動神疲守真志滿逐物意移'+
      '堅持雅操好爵自縻都邑華夏東西二京背邙面洛浮渭據涇宮殿盤鬱樓觀飛驚圖寫禽獸畫彩仙靈丙舍旁啟甲帳對楹肆筵'+
      '設席鼓瑟吹笙升階納陛弁轉疑星右通廣內左達承明既集墳典亦聚群英杜稿鍾隸漆書壁經府羅將相路俠槐卿戶封八縣'+
      '家給千兵高冠陪輦驅轂振纓世祿侈富車駕肥輕策功茂實勒碑刻銘磻溪伊尹佐時阿衡奄宅曲阜微旦孰營桓公匡合濟弱'+
      '扶傾綺回漢惠說感武丁俊乂密勿多士寔寧晉楚更霸趙魏困橫假途滅虢踐土會盟何遵約法韓弊煩刑起翦頗牧用軍最精'+
      '宣威沙漠馳譽丹青九州禹跡百郡秦并岳宗泰岱禪主云亭雁門紫塞雞田赤城昆池碣石鉅野洞庭曠遠綿邈巖岫杳冥治本'+
      '於農務茲稼穡俶載南畝我藝黍稷稅熟貢新勸賞黜陟孟軻敦素史魚秉直庶幾中庸勞謙謹敕聆音察理鑑貌辨色貽厥嘉猷'+
      '勉其祗植省躬譏誡寵增抗極殆辱近恥林皋幸即兩疏見機解組誰逼索居閒處沉默寂寥求古尋論散慮逍遙欣奏累遣慼謝'+
      '歡招渠荷的歷園莽抽條枇杷晚翠梧桐蚤凋陳根委翳落葉飄搖遊鵾獨運凌摩絳霄耽讀玩市寓目囊箱易輶攸畏屬耳垣牆'+
      '具膳餐飯適口充腸飽飫烹宰飢厭糟糠親戚故舊老少異糧妾御績紡侍巾帷房紈扇圓絜銀燭煒煌晝眠夕寐藍筍象床弦歌'+
      '酒宴接杯舉觴矯手頓足悅豫且康嫡后嗣續祭祀蒸嘗稽顙再拜悚懼恐惶箋牒簡要顧答審詳骸垢想浴執熱願涼驢騾犢特'+
      '駭躍超驤誅斬賊盜捕獲叛亡布射僚丸嵇琴阮嘯恬筆倫紙鈞巧任釣釋紛利俗並皆佳妙毛施淑姿工顰妍笑年矢每催曦暉'+
      '朗曜璇璣懸斡晦魄環照指薪修祜永綏吉劭矩步引領俯仰廊廟束帶矜莊徘徊瞻眺孤陋寡聞愚蒙等誚謂語助者焉哉乎也'
  };
  const QIANZIWEN_EXCERPT = 80;
  const COMMON_3500_EXCERPT = 120;
  let COMMON_3500 = null;
  let COMMON_3500_FAILED = false;
  let COMMON_3500_PROMISE = null;
  function loadCommon3500() {
    if (COMMON_3500) return Promise.resolve(COMMON_3500);
    if (COMMON_3500_PROMISE) return COMMON_3500_PROMISE;
    const url = (window.WFProto && WFProto.dataUrl)
      ? WFProto.dataUrl('common-chars-3500.json')
      : ((window.WFChrome && WFChrome.href) ? WFChrome.href('data/common-chars-3500.json') : 'data/common-chars-3500.json');
    COMMON_3500_PROMISE = fetch(url, { method: 'GET' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { COMMON_3500_FAILED = true; return ''; })
      .then(function (j) {
        COMMON_3500 = (j && typeof j.chars === 'string' && j.chars.length) ? j.chars : '';
        return COMMON_3500;
      })
      .catch(function () {
        COMMON_3500 = '';
        return COMMON_3500;
      });
    return COMMON_3500_PROMISE;
  }
  function coverAgainstRanges(ranges, text) {
    const marks = {};
    let hit = 0;
    let total = 0;
    const missSamples = [];
    if (!ranges || !text) return { hit: 0, total: 0, marks: marks, missSamples: missSamples, pct: 0 };
    const seen = {};
    for (let i = 0; i < text.length;) {
      const cp = text.codePointAt(i);
      const ch = String.fromCodePoint(cp);
      i += ch.length;
      if (seen[ch] || /\s/.test(ch)) continue;
      seen[ch] = true;
      total++;
      const ok = inRanges(ranges, cp);
      marks[ch] = ok;
      if (ok) hit++;
      else if (missSamples.length < 48) missSamples.push(ch);
    }
    return {
      hit: hit,
      total: total,
      marks: marks,
      missSamples: missSamples,
      pct: total ? Math.round((hit / total) * 1000) / 10 : 0
    };
  }
  /* 简/繁探测对：两岸写法不同的高频字，哪边覆盖率高就用哪边的千字文 */
  const SCRIPT_PROBES = ['国國', '这這', '们們', '东東', '马馬', '长長', '时時', '门門', '为為', '发發'];
  const GLYPH_BLOCKS = [
    { name: '基本拉丁', range: 'U+0020–007E',
      chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' },
    { name: '标点 · 符号 · 全角数字', range: 'U+3000–303F · FF00–FFEF',
      chars: '，。、；：？！“”‘’（）《》〈〉【】—…·¥%&@#*+-=/０１２３４５６７８９〇' }
  ];

  function brandLine(font) {
    return WFChrome.brandName(font) || (font.designerShort && font.designerShort !== '—' ? font.designerShort : '未署名');
  }

  function metaHtml(font) {
    // 卡片元信息：品牌 · 字重 · 许可芯片 · 浏览；开发模式追加 SPDX 与 family。
    const n = (font.weights && font.weights.length) || 1;
    const ev = WFChrome.licenseEvidence(font);
    const fam = String(font.family || '').replace(/^wenfeng-/, '');
    const mark = WFChrome.faceHtml(font, 16);
    const views = Number(font.viewCount) || 0;
    const viewBit = views > 0 ? '<span class="meta-views">' + WFProto.formatCount(views) + ' 浏览</span>' : '';
    const tier = WFChrome.licenseTier(font) || '';
    const lic = tier ? '<span class="lic-chip" data-tier="' + esc(tier) + '">' + esc(tier) + '</span>' : '';
    return '<span class="meta">' + mark + '<span class="meta-brand">' + esc(brandLine(font)) + '</span>' +
      '<span class="meta-sep">·</span><span class="meta-weights">' + n + ' 字重</span>' +
      (lic ? '<span class="meta-sep">·</span>' + lic : '') +
      (viewBit ? '<span class="meta-sep">·</span>' + viewBit : '') +
      '<span class="for-dev">' +
        (ev.spdx ? ' · ' + esc(ev.spdx) : '') +
        (fam ? ' · <span class="mono">' + esc(fam) + '</span>' : '') +
      '</span></span>';
  }

  function firstWeight(font) {
    const ws = (font.weights && font.weights.length) ? font.weights : ['Regular'];
    const prefer = ws.filter(function (w) {
      const k = String(w).toLowerCase().replace(/[\s-]+/g, '');
      return k === 'regular' || k === 'normal';
    })[0];
    if (prefer) return WFProto.weightToCss(prefer);
    const reg = ws.filter(function (w) { return WFProto.weightToCss(w) === '400'; })[0];
    return WFProto.weightToCss(reg || ws[0]);
  }

  function rowHtml(font, opts) {
    opts = opts || {};
    const sample = opts.sample != null ? opts.sample : (WFProto.sampleForFont ? WFProto.sampleForFont(font, WFProto.getSample()) : WFProto.getSample());
    const size = opts.size != null ? opts.size : WFProto.getSize();
    const stack = WFProto.cssFamilyStack(font.family);
    const detail = WFChrome.href(WFProto.detailHref(font));
    const w = firstWeight(font);
    return '<li class="specimen" data-font-id="' + esc(font.id) + '" data-family="' + esc(font.family || '') +
        '" data-weight="' + w + '">' +
      '<div class="head"><span class="name-line"><a class="name" href="' + detail + '">' +
        esc((opts.name != null ? opts.name : (font._listName || font.name))) + '</a>' +
        (WFProto.hasCjkFace && !WFProto.hasCjkFace(font) ? '<span class="specimen-nocjk">无汉字</span>' : '') +
        (opts.noAction ? '' : WFChrome.favHtml('font', font.id, font.name)) + '</span>' + metaHtml(font) +
        (opts.foot ? (function () { const foot = opts.foot(font); return foot ? '<span class="specimen-foot">' + foot + '</span>' : ''; })() : '') +
        '</div>' +
      (opts.noAction ? '' :
        '<button type="button" class="act" data-join="' + esc(font.id) + '" data-name="' + esc(font.name) + '">' + WFChrome.icon('plus') + '加入选字袋</button>') +
      '<a class="preview" href="' + detail + '" data-specimen style="font-family:' + esc(stack) +
        ';font-weight:' + w + ';font-size:' + size + 'px">' + esc(sample) + '</a>' +
    '</li>';
  }

  /* 样张行进视口再拉包；首屏相交的立刻开始，其余等滚动。 */
  let specimenCssIo = null;
  function scheduleSpecimenCss(el) {
    if (!el) return;
    const fam = el.getAttribute('data-family');
    if (!fam) return;
    const weight = el.getAttribute('data-weight') || '400';
    if (!('IntersectionObserver' in window)) {
      WFProto.ensureFontCss(fam, weight, 'preview-shop', (el.querySelector('[data-specimen]') || {}).textContent || (WFProto.getSample && WFProto.getSample()));
      return;
    }
    if (!specimenCssIo) {
      specimenCssIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          const node = en.target;
          specimenCssIo.unobserve(node);
          WFProto.ensureFontCss(node.getAttribute('data-family'), node.getAttribute('data-weight') || '400', 'preview-shop', (node.querySelector('[data-specimen]') || {}).textContent || (WFProto.getSample && WFProto.getSample()));
        });
      }, { rootMargin: '180px 0px', threshold: 0 });
    }
    specimenCssIo.observe(el);
  }

  function wireRow(li) {
    scheduleSpecimenCss(li);
    const btn = li.querySelector('[data-join]');
    if (btn && !btn._wfBound) {
      btn._wfBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        const picked = WFProto.hasPick(btn.getAttribute('data-join'));
        WFProto.togglePick(btn.getAttribute('data-join'), btn.getAttribute('data-name'));
        WFChrome.toast(picked ? '已从选字袋移除' : '已加入选字袋');
      });
    }
  }

  function syncActs() {
    document.querySelectorAll('.specimen .act[data-join]').forEach(function (b) {
      const on = WFProto.hasPick(b.getAttribute('data-join'));
      b.innerHTML = WFChrome.icon(on ? 'check' : 'plus') + (on ? '已在选字袋' : '加入选字袋');
      b.classList.toggle('is-picked', on);
    });
  }

  function appendRows(listEl, fonts, opts) {
    const wrap = document.createElement('div');
    wrap.innerHTML = fonts.map(function (f) { return rowHtml(f, opts); }).join('');
    Array.prototype.slice.call(wrap.children).forEach(function (li) {
      listEl.appendChild(li);
      wireRow(li);
    });
    syncActs();
  }

  function renderRows(listEl, fonts, opts) {
    listEl.innerHTML = '';
    appendRows(listEl, fonts, opts);
  }

  /** 控制条：文字 / 预设 / 字号 / 可选字重 / 可选视图切换 */
  function controlBar(el, opts) {
    opts = opts || {};
    const min = opts.min || 16;
    const max = opts.max || 160;
    el.classList.add('controlbar');
    el.innerHTML =
      '<div class="container controlbar-inner">' +
        '<input class="sample" type="text" id="specimenText" maxlength="120" placeholder="输入文字，所有字体即时预览" aria-label="预览文字" />' +
        '<div class="presets" role="group" aria-label="预设文案">' +
          PRESETS.map(function (p) { return '<button type="button" data-preset="' + p.id + '" aria-pressed="false">' + p.label + '</button>'; }).join('') +
        '</div>' +
        (opts.weights ? '<div class="weights" role="group" aria-label="字重" id="specimenWeights"></div>' : '') +
        '<div class="sizer"><input class="range" type="range" id="specimenSize" min="' + min + '" max="' + max + '" aria-label="字号" />' +
          '<span class="val" data-size-val></span></div>' +
        (opts.view ? '<div class="view" role="group" aria-label="视图"><button type="button" data-view="rows" class="is-on" aria-label="行视图" title="行视图">' + WFChrome.icon('rows') + '</button><button type="button" data-view="grid" aria-label="网格视图" title="网格视图">' + WFChrome.icon('grid') + '</button></div>' : '') +
      '</div>';

    const input = el.querySelector('#specimenText');
    function markPreset() {
      const t = input.value;
      el.querySelectorAll('[data-preset]').forEach(function (x) {
        const p = PRESETS.filter(function (y) { return y.id === x.getAttribute('data-preset'); })[0];
        const on = !!(p && p.text === t);
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }
    input.value = WFProto.getSample();
    markPreset();
    el.querySelectorAll('[data-preset]').forEach(function (b) {
      b.addEventListener('click', function () {
        const p = PRESETS.filter(function (x) { return x.id === b.getAttribute('data-preset'); })[0];
        input.value = p.text;
        WFProto.setSample(p.text);
        markPreset();
      });
    });
    input.addEventListener('input', function () {
      markPreset();
      WFProto.setSample(input.value);
    });
    if (opts.view) {
      el.querySelectorAll('[data-view]').forEach(function (b) {
        b.addEventListener('click', function () {
          el.querySelectorAll('[data-view]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
          if (opts.onView) opts.onView(b.getAttribute('data-view'));
        });
      });
    }
    return el;
  }

  function sortedWeights(font) {
    const ws = (font.weights && font.weights.length) ? font.weights.slice() : ['Regular'];
    return ws.sort(function (a, b) { return parseInt(WFProto.weightToCss(a), 10) - parseInt(WFProto.weightToCss(b), 10); });
  }

  function weightsSheetHtml(font, sample, current) {
    const stack = WFProto.cssFamilyStack(font.family);
    const cur = current != null ? String(WFProto.weightToCss(current)) : '';
    return sortedWeights(font).map(function (w) {
      const css = String(WFProto.weightToCss(w));
      /* 必须传字重名：同数字多名称（Text/Regular）时按名拉 CDN，不能只传 400 */
      WFProto.ensureFontCss(font.family, w, 'preview-shop', sample);
      const on = cur && css === cur;
      return '<button type="button" class="weight-row' + (on ? ' is-on' : '') + '" data-w="' + css + '" data-wn="' + esc(w) + '">' +
        '<span class="w">' + esc(w) + '<span class="for-dev"> · ' + css + '</span></span>' +
        '<span class="line" data-weight-line style="font-family:' + esc(stack) + ';font-weight:' + css + '">' + esc(sample) + '</span></button>';
    }).join('');
  }

  /* —— 字符表 v2：简/繁自适应 · 缺字标记 · 覆盖统计 ——
     缺字判定：不依赖 document.fonts.check（实测 Chromium 对已注册 family 恒真，不可用），
     改为拉取 CDN 的分包子 CSS，解析 unicode-range 清单——cn-font-split 按真实 cmap 逐字生成，
     等价于字体实际收录声明。
     统计口径：按唯一字计数（简体千字文有 6 处简化合并重字，994 个不同字；不能按字符串位置计）。 */

  const cssRangeCache = {};

  function uniqueHits(text, marks) {
    const seen = {};
    let hit = 0, total = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      if (ch in seen) continue;
      seen[ch] = true;
      total++;
      if (marks && marks[ch]) hit++;
    }
    return { hit: hit, total: total };
  }

  function parseUnicodeRanges(css) {
    const ranges = [];
    const re = /unicode-range:\s*([^;}]+)/gi;
    let m;
    while ((m = re.exec(css))) {
      m[1].split(',').forEach(function (tok) {
        const body = tok.trim().replace(/^u\+/i, '');
        if (!body) return;
        let lo, hi;
        if (body.indexOf('?') !== -1) {
          lo = parseInt(body.replace(/\?/g, '0'), 16);
          hi = parseInt(body.replace(/\?/g, 'f'), 16);
        } else if (body.indexOf('-') !== -1) {
          const p = body.split('-');
          lo = parseInt(p[0], 16);
          hi = parseInt(p[1], 16);
        } else {
          lo = hi = parseInt(body, 16);
        }
        if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) ranges.push([lo, hi]);
      });
    }
    ranges.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    return ranges;
  }

  function inRanges(ranges, cp) {
    let lo = 0, hi = ranges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = ranges[mid];
      if (cp < r[0]) hi = mid - 1;
      else if (cp > r[1]) lo = mid + 1;
      else return true;
    }
    return false;
  }

  /* 切片 CSS 的 unicode-range 会把「cmap 有、轮廓为空」的字算进去。
     这类字画出来是空的，而且挡住系统字体回退。用画布确认有没有墨。 */
  const inkCanvas = document.createElement('canvas');
  inkCanvas.width = 64;
  inkCanvas.height = 64;
  function glyphHasInk(ch, spec) {
    const ctx = inkCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = spec;
    ctx.fillStyle = '#000';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, 4, 52);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 16) return true;
    }
    return false;
  }

  function fetchCssRanges(family, weight) {
    const pathName = WFProto.weightName(family, weight || '400');
    const key = family + '|' + pathName;
    if (cssRangeCache[key]) return cssRangeCache[key];
    /* Cite-closed archive previews have no CDN/package coverage endpoint;
       keep the character table local and let canvas/font loading decide glyph ink. */
    if (WFProto.citeClosedFamily && WFProto.citeClosedFamily(family)) {
      cssRangeCache[key] = Promise.resolve(null);
      return cssRangeCache[key];
    }
    cssRangeCache[key] = fetch(WFProto.packageResultUrl(family, pathName, 'full'))
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then(parseUnicodeRanges)
      .catch(function () {
        return fetch(WFProto.cssApiUrl(family, pathName, 'full'))
          .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
          .then(parseUnicodeRanges);
      })
      .catch(function () {
        return fetch(WFProto.cssUrl(family, pathName))
          .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
          .then(parseUnicodeRanges);
      })
      .catch(function () { return null; });
    return cssRangeCache[key];
  }

  function mountGlyphTable(blocksEl, summaryEl, toolsEl, font, initialWeight) {
    const fam = String(font.family || '');
    const stack = WFProto.cssFamilyStack(fam);
    const EXTRA_TEXT = GLYPH_BLOCKS.map(function (b) { return b.chars; }).join('');
    const skipCov = WFChrome.skipGlyphCov(font);
    let weight = String(WFProto.weightToCss(initialWeight || firstWeight(font)));
    let covGen = 0;
    let pendingQuery = '';
    const st = {
      variant: 'hans', filter: 'all', ranges: null, charset: 'qz',
      marks: { hans: null, hant: null, c3500: null },
      hit: { hans: 0, hant: 0, c3500: 0 },
      total: { hans: 0, hant: 0, c3500: 0 },
      coverage: font.coverage || null, /* 目录静态下发：字体确定性产品，覆盖统计入库即算好 */
      hollow: {}
    };

    function qzw() {
      if (st.charset === 'c3500') return COMMON_3500 || '';
      return QIANZIWEN[st.variant];
    }
    function activeKey() { return st.charset === 'c3500' ? 'c3500' : st.variant; }

    function cellsHtml(text, marks) {
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text.charAt(i);
        out += marks && marks[ch] === false
          ? '<span class="is-miss" title="该字体未收录此字，格内为系统字形">' + esc(ch) + '</span>'
          : '<span>' + esc(ch) + '</span>';
      }
      return out;
    }

    /* 自由查字：搜索框跟在「字符表」标题旁；结果仍留在正文 */
    const queryHost = document.getElementById('glyphQuery');
    let queryEl = (queryHost && queryHost.querySelector('.glyph-query'))
      || (summaryEl && summaryEl.parentNode && summaryEl.parentNode.querySelector('.glyph-query'));
    if (!queryEl && summaryEl && summaryEl.parentNode && !skipCov) {
      queryEl = document.createElement('form');
      queryEl.className = 'glyph-query';
      queryEl.setAttribute('role', 'search');
      queryEl.innerHTML =
        '<label class="glyph-query-label" for="glyphQueryInput">查字</label>' +
        '<span class="glyph-query-field">' +
          '<input type="search" id="glyphQueryInput" class="glyph-query-input" name="q" ' +
            'placeholder="输入要核对的字符，例如：文风字体" autocomplete="off" enterkeyhint="search" />' +
          '<button type="submit" class="btn glyph-query-go">查询</button>' +
        '</span>' +
        (queryHost ? '' : '<p class="glyph-query-out" data-glyph-query-out hidden aria-live="polite"></p>');
      if (queryHost) {
        queryHost.appendChild(queryEl);
        const out = document.createElement('p');
        out.className = 'glyph-query-out';
        out.hidden = true;
        out.setAttribute('data-glyph-query-out', '');
        out.setAttribute('aria-live', 'polite');
        summaryEl.parentNode.insertBefore(out, summaryEl);
      } else {
        summaryEl.parentNode.insertBefore(queryEl, summaryEl);
      }
    }
    const queryOut = (queryEl && queryEl.querySelector('[data-glyph-query-out]'))
      || (summaryEl && summaryEl.parentNode && summaryEl.parentNode.querySelector('[data-glyph-query-out]'));
    const queryInput = queryEl ? queryEl.querySelector('.glyph-query-input') : null;

    function uniqueChars(text) {
      const out = [];
      const seen = {};
      const s = String(text || '');
      for (let i = 0; i < s.length;) {
        const cp = s.codePointAt(i);
        const ch = String.fromCodePoint(cp);
        i += ch.length;
        if (/\s/.test(ch)) continue;
        if (seen[ch]) continue;
        seen[ch] = true;
        out.push(ch);
      }
      return out;
    }

    function renderQuery(text) {
      if (!queryOut) return;
      const chars = uniqueChars(text);
      pendingQuery = chars.join('');
      if (!chars.length) {
        queryOut.hidden = true;
        queryOut.innerHTML = '';
        return;
      }
      if (skipCov) {
        queryOut.hidden = false;
        queryOut.innerHTML = '<span class="glyph-query-note">这款字不做覆盖核对。</span>';
        return;
      }
      if (!st.ranges) {
        queryOut.hidden = false;
        queryOut.innerHTML = '<span class="glyph-query-note">正在加载字集…</span>';
        return;
      }
      let hit = 0;
      let cells = '';
      chars.forEach(function (ch) {
        const ok = inRanges(st.ranges, ch.codePointAt(0)) && !st.hollow[ch];
        if (ok) hit++;
        cells += ok
          ? '<span class="is-hit" title="已收录">' + esc(ch) + '</span>'
          : '<span class="is-miss" title="未收录">' + esc(ch) + '</span>';
      });
      const miss = chars.length - hit;
      queryOut.hidden = false;
      queryOut.innerHTML =
        '<span class="glyph-query-stat"><b>' + hit + '</b> / ' + chars.length + ' 已收录' +
          (miss ? ' · 缺 ' + miss + ' 字' : ' · 全部收录') + '</span>' +
        '<span class="glyph-query-cells" style="font-family:' + esc(stack) + ';font-weight:' + weight + '">' + cells + '</span>';
    }

    if (queryEl && !queryEl._wfBound) {
      queryEl._wfBound = true;
      queryEl.addEventListener('submit', function (e) {
        e.preventDefault();
        renderQuery(queryInput ? queryInput.value : '');
      });
      if (queryInput) {
        queryInput.addEventListener('input', function () {
          if (!String(queryInput.value || '').trim()) {
            pendingQuery = '';
            if (queryOut) { queryOut.hidden = true; queryOut.innerHTML = ''; }
          }
        });
      }
    }

    function renderBlocks() {
      const key = activeKey();
      const marks = st.marks[key];
      const full = qzw();
      /* 满覆盖时没有可筛内容：收起筛选后，避免保留旧的「只看缺字」状态。 */
      if (marks && st.filter !== 'all' && st.hit[key] === st.total[key]) st.filter = 'all';
      /* 缺字视图必须扫全文——缺字常在节选之外，否则筛出来是空的 */
      const excerpt = st.charset === 'c3500' ? COMMON_3500_EXCERPT : QIANZIWEN_EXCERPT;
      const shown = st.filter === 'miss' ? full : full.slice(0, excerpt);
      const title = st.charset === 'c3500'
        ? '常用字 · 3500（GB2312 一级表）'
        : (st.variant === 'hant' ? '常用漢字 · 千字文（繁體）' : '常用汉字 · 千字文（简体）');
      let html =
        '<h3>' + title +
          '<span class="h3-r">' +
            (marks ? '<span class="cov">覆盖 ' + st.hit[key] + ' / ' + st.total[key] + '</span>' : '') +
            '<span class="mono for-dev">逐码点</span></span></h3>' +
        '<div class="glyphs" style="font-family:' + esc(stack) + ';font-weight:' + weight + '">' + cellsHtml(shown, marks) + '</div>';
      GLYPH_BLOCKS.forEach(function (b) {
        let n = null;
        var bTotal = b.chars.length;
        if (marks) {
          const bh = uniqueHits(b.chars, marks);
          n = bh.hit;
          bTotal = bh.total;
        }
        html += '<h3>' + esc(b.name) + '<span class="h3-r">' +
          (n != null ? '<span class="cov">覆盖 ' + n + ' / ' + bTotal + '</span>' : '') +
          '<span class="mono for-dev">' + esc(b.range) + '</span></span></h3>' +
          '<div class="glyphs" style="font-family:' + esc(stack) + ';font-weight:' + weight + '">' + cellsHtml(b.chars, marks) + '</div>';
      });
      blocksEl.innerHTML = html +
        (st.filter === 'miss' && marks && st.hit[st.variant] === st.total[st.variant] ? '<p class="glyph-legend">该字体没有缺字。</p>' : '');
      blocksEl.classList.toggle('only-hit', st.filter === 'hit');
      blocksEl.classList.toggle('only-miss', st.filter === 'miss');
    }

    function renderSummary(fail) {
      if (fail) {
        summaryEl.innerHTML = '<p class="glyph-sum-line is-quiet">' + esc(fail) + '</p>';
        return;
      }
      const key = activeKey();
      const marks = st.marks[key];
      if (!marks) {
        const bcov = st.coverage && st.coverage[st.charset === 'c3500' ? 'c3500' : st.variant];
        if (bcov && bcov.total) {
          const pct = Math.round(bcov.hit / bcov.total * 100);
          const label = st.charset === 'c3500' ? '常用字' : '常用字';
          summaryEl.innerHTML = '<p class="glyph-sum-line"><b>' + bcov.hit + '</b> / ' + bcov.total + ' ' + label +
            '已收录 · ' + (pct >= 95 && bcov.hit < bcov.total ? '缺 ' + (bcov.total - bcov.hit) + ' 字' : '覆盖 ' + pct + '%') +
            '</p><p class="glyph-legend is-quiet">逐字核对加载中…</p>';
          return;
        }
        summaryEl.innerHTML = '<p class="glyph-sum-line is-quiet">' +
          (st.charset === 'c3500' && COMMON_3500_FAILED
            ? '常用字表加载失败，请刷新重试。'
            : '正在核对这款字收录了哪些字…') + '</p>';
        return;
      }
      const total = st.total[key] || uniqueHits(qzw(), {}).total;
      const hit = st.hit[key];
      const miss = total - hit;
      /* 乙：满覆盖只保留轻提示；有缺字时才露出软文案 tabs。 */
      const fullyCovered = miss === 0;
      let suffix;
      if (fullyCovered) suffix = '<span class="glyph-summary-status">全部收录</span>';
      else suffix = '缺 <button type="button" class="chip-miss" data-filter="miss">' + miss + '</button> 字';
      const label = '常用字';
      const qzLink = st.charset === 'c3500'
        ? ''
        : '<button type="button" class="glyph-qz-link">通篇预览</button>';
      const filterCtl = (skipCov || fullyCovered) ? '' :
        '<span class="lab-text-tabs lab-text-tabs--bare lab-ttab glyph-filter-soft" role="group" aria-label="筛选">' +
          '<button type="button" data-f="all"' + (st.filter === 'all' ? ' class="is-on"' : '') + '>全部</button>' +
          '<button type="button" data-f="hit"' + (st.filter === 'hit' ? ' class="is-on"' : '') + '>已收录</button>' +
          '<button type="button" data-f="miss"' + (st.filter === 'miss' ? ' class="is-on"' : '') + '>缺字</button></span>';
      const summaryActions = (qzLink || filterCtl)
        ? '<span class="glyph-summary-actions">' +
            (qzLink ? qzLink : '') + filterCtl +
          '</span>'
        : '';
      summaryEl.innerHTML =
        '<p class="glyph-sum-line"><b>' + hit + '</b> / ' + total + ' ' + label + ' · ' + suffix +
          summaryActions + '</p>' +
        '<p class="glyph-legend">虚线框表示字体里没有这个字。' +
          (st.charset === 'c3500' ? '字表为 GB2312 一级按码位截取的 3500 字，逐 unicode-range 核对。' : '') +
        '</p>';
      bindSummaryActions();
    }

    function applyFilter(next) {
      if (!next) return;
      st.filter = next;
      renderBlocks();
      syncTools();
      if (st.filter === 'hit' || st.filter === 'miss') {
        blocksEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    function bindSummaryActions() {
      if (!summaryEl) return;
      summaryEl.querySelectorAll('[data-f]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          applyFilter(b.getAttribute('data-f'));
        });
      });
      summaryEl.querySelectorAll('.chip-miss').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          applyFilter('miss');
        });
      });
      summaryEl.querySelectorAll('.glyph-qz-link').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          openQianziwenStele(font, { weight: weight, variant: st.variant });
        });
      });
    }

    function syncTools() {
      toolsEl.querySelectorAll('[data-cs]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-cs') === st.charset);
      });
      toolsEl.querySelectorAll('[data-sc]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-sc') === st.variant);
      });
      summaryEl.querySelectorAll('[data-f]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-f') === st.filter);
      });
      const qzOnly = toolsEl.querySelector('[data-qz-only]');
      if (qzOnly) {
        const off = st.charset === 'c3500';
        qzOnly.hidden = false;
        qzOnly.querySelectorAll('button').forEach(function (b) {
          b.disabled = off;
          b.title = off ? '常用字表只有简体字形，无繁体对照' : '';
        });
        qzOnly.classList.toggle('is-off', off);
      }
    }

    function applyRanges(ranges) {
      st.ranges = ranges;
      st.hollow = {};
      let hansHits = 0, hantHits = 0;
      SCRIPT_PROBES.forEach(function (p) {
        if (inRanges(ranges, p.charCodeAt(0))) hansHits++;
        if (inRanges(ranges, p.charCodeAt(1))) hantHits++;
      });
      if (hantHits > hansHits) st.variant = 'hant';
      ['hans', 'hant'].forEach(function (v) {
        const marks = {};
        const all = QIANZIWEN[v] + EXTRA_TEXT;
        for (let i = 0; i < all.length; i++) {
          const ch = all.charAt(i);
          if (!(ch in marks)) {
            const cp = ch.codePointAt(0);
            marks[ch] = inRanges(ranges, cp);
          }
        }
        st.marks[v] = marks;
        const stats = uniqueHits(QIANZIWEN[v], marks);
        st.hit[v] = stats.hit;
        st.total[v] = stats.total;
      });
      function paintC3500(text) {
        if (!text) return;
        const cov = coverAgainstRanges(ranges, text);
        st.marks.c3500 = cov.marks;
        st.hit.c3500 = cov.hit;
        st.total.c3500 = cov.total;
      }
      if (COMMON_3500) paintC3500(COMMON_3500);
      else loadCommon3500().then(function (text) {
        if (!st.ranges) return;
        paintC3500(text);
        if (st.charset === 'c3500') { renderBlocks(); renderSummary(); syncTools(); }
      });
      renderBlocks();
      renderSummary();
      syncTools();
      if (pendingQuery) renderQuery(pendingQuery);
      verifyPainted();
    }

    function verifyPainted() {
      if (!document.fonts || !document.fonts.load) return;
      const gen = covGen;
      const family = '"' + fam.replace(/"/g, '') + '"';
      const spec = weight + ' 56px ' + family;
      const seen = {};
      const chars = [];
      ['hans', 'hant'].forEach(function (v) {
        const marks = st.marks[v];
        if (!marks) return;
        Object.keys(marks).forEach(function (ch) {
          if (!marks[ch] || seen[ch]) return;
          seen[ch] = true;
          chars.push(ch);
        });
      });
      if (!chars.length) return;
      document.fonts.load(spec, chars.join('')).then(function () {
        if (gen !== covGen) return;
        let changed = false;
        chars.forEach(function (ch) {
          if (glyphHasInk(ch, spec)) return;
          st.hollow[ch] = true;
          ['hans', 'hant'].forEach(function (v) {
            if (st.marks[v] && st.marks[v][ch]) {
              st.marks[v][ch] = false;
              changed = true;
            }
          });
        });
        if (!changed) return;
        ['hans', 'hant'].forEach(function (v) {
          const stats = uniqueHits(QIANZIWEN[v], st.marks[v]);
          st.hit[v] = stats.hit;
          st.total[v] = stats.total;
        });
        renderBlocks();
        renderSummary();
        syncTools();
        if (pendingQuery) renderQuery(pendingQuery);
      }).catch(function () {});
    }

    toolsEl.innerHTML =
      '<div class="seg-glyph" role="group" aria-label="字表">' +
        '<button type="button" data-cs="qz">千字文</button>' +
        '<button type="button" data-cs="c3500">常用</button></div>' +
      '<div class="seg-glyph" role="group" aria-label="写法" data-qz-only>' +
        '<button type="button" data-sc="hans">简</button>' +
        '<button type="button" data-sc="hant">繁</button></div>';
    toolsEl.addEventListener('click', function (e) {
      const btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      const cs = btn.getAttribute('data-cs');
      if (cs && cs !== st.charset) {
        st.charset = cs;
        st.filter = 'all';
        if (cs === 'c3500' && !COMMON_3500) {
          loadCommon3500().then(function () {
            if (st.ranges) applyRanges(st.ranges);
            else { renderBlocks(); renderSummary(); syncTools(); }
          });
        } else {
          renderBlocks(); renderSummary(); syncTools();
        }
        return;
      }
      const sc = btn.getAttribute('data-sc');
      if (sc && sc !== st.variant) {
        st.variant = sc;
        if (st.charset === 'c3500') st.charset = 'qz';
        renderBlocks(); renderSummary(); syncTools();
        return;
      }
    });
    /* Fallback delegation: direct binds in bindSummaryActions are primary */
    summaryEl.addEventListener('click', function (e) {
      const t = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement);
      if (!t || !t.closest) return;
      const filter = t.closest('[data-f]');
      if (filter && summaryEl.contains(filter)) {
        e.preventDefault();
        applyFilter(filter.getAttribute('data-f'));
        return;
      }
      const chip = t.closest('.chip-miss');
      if (chip && summaryEl.contains(chip)) {
        e.preventDefault();
        applyFilter('miss');
        return;
      }
      const qz = t.closest('.glyph-qz-link');
      if (qz && summaryEl.contains(qz)) {
        e.preventDefault();
        openQianziwenStele(font, { weight: weight, variant: st.variant });
      }
    });

    function paintFace() {
      blocksEl.querySelectorAll('.glyphs').forEach(function (el) {
        el.style.fontFamily = stack;
        el.style.fontWeight = weight;
      });
      if (queryOut) {
        const cells = queryOut.querySelector('.glyph-query-cells');
        if (cells) {
          cells.style.fontFamily = stack;
          cells.style.fontWeight = weight;
        }
      }
    }

    function loadCoverage() {
      if (skipCov) return;
      const gen = ++covGen;
      st.ranges = null;
      fetchCssRanges(fam, weight).then(function (ranges) {
        if (gen !== covGen) return;
        if (!ranges || !ranges.length) {
          renderSummary('暂时无法核对缺字，下面显示的是系统默认字形。');
          if (pendingQuery && queryOut) {
            queryOut.hidden = false;
            queryOut.innerHTML = '<span class="glyph-query-note">暂时无法核对这几个字。</span>';
          }
          return;
        }
        applyRanges(ranges);
      });
    }
    function setWeight(w) {
      const next = String(WFProto.weightToCss(w));
      if (!next || next === weight) { paintFace(); return; }
      weight = next;
      WFProto.ensureFontCss(fam, weight);
      paintFace();
      loadCoverage();
    }

    renderBlocks();
    renderSummary(skipCov ? '这款字不做常用字覆盖统计，下面只展示样例。' : null);
    syncTools();
    WFProto.ensureFontCss(fam, weight);
    loadCoverage();
    return { setWeight: setWeight, queryChars: renderQuery };
  }

  /* —— 千字文通篇 · 乙碑格（定稿）—— */
  let qzState = null;

  function openQianziwenStele(font, opts) {
    opts = opts || {};
    const fam = String(font.family || '');
    if (!fam) return;
    const stack = WFProto.cssFamilyStack(fam);
    let weight = String(WFProto.weightToCss(opts.weight || firstWeight(font)));
    let variant = opts.variant === 'hant' ? 'hant' : 'hans';
    if (WFChrome.skipGlyphCov && WFChrome.skipGlyphCov(font)) variant = 'hans';
    const text = QIANZIWEN[variant] || QIANZIWEN.hans;
    let marks = null;
    let stats = { hit: 0, total: 0 };
    let onlyMiss = false;
    let sizePx = 26;

    function ensureOverlay() {
      let el = document.getElementById('qzStele');
      if (el) return el;
      el = document.createElement('div');
      el.id = 'qzStele';
      el.className = 'qz-overlay';
      el.hidden = true;
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', '千字文通篇预览');
      document.body.appendChild(el);
      return el;
    }

    function charSpan(ch, i) {
      const miss = marks && marks[ch] === false;
      return '<span class="qz-ch' + (miss ? ' is-miss' : '') + '" data-i="' + i + '" data-ch="' + esc(ch) + '">' + esc(ch) + '</span>';
    }

    function covLabel() {
      if (!marks) return '覆盖核对中…';
      const pct = stats.total ? Math.round(1000 * stats.hit / stats.total) / 10 : 0;
      return '常用 <b>' + stats.hit + '</b> / ' + stats.total + ' · ' + pct + '%';
    }

    function gridHtml() {
      let out = '';
      for (let i = 0; i < text.length; i++) out += charSpan(text.charAt(i), i);
      return '<div class="qz-b-frame"><div class="qz-b-grid" style="font-family:' + esc(stack) +
        ';font-weight:' + weight + ';--qz-b-size:' + sizePx + 'px">' + out + '</div></div>';
    }

    function close() {
      const el = document.getElementById('qzStele');
      if (!el) return;
      el.hidden = true;
      el.innerHTML = '';
      document.documentElement.style.overflow = '';
      qzState = null;
    }

    function paint() {
      const el = ensureOverlay();
      const name = font.name || fam;
      el.hidden = false;
      el.innerHTML =
        '<div class="qz-bar">' +
          '<span class="who">' + esc(name) + ' · 千字文</span>' +
          '<span class="cov">' + covLabel() + '</span>' +
          '<div class="seg" role="group" aria-label="筛选">' +
            '<button type="button" data-filter="all"' + (!onlyMiss ? ' class="is-on"' : '') + '>全部</button>' +
            '<button type="button" data-filter="miss"' + (onlyMiss ? ' class="is-on"' : '') + '>只看缺字</button>' +
          '</div>' +
          '<label class="size">字号 <input type="range" min="14" max="40" value="' + sizePx + '" data-size /></label>' +
          '<span class="spacer"></span>' +
          '<button type="button" class="btn" data-close>关闭</button>' +
        '</div>' +
        '<div class="qz-body' + (onlyMiss ? ' only-miss' : '') + '">' + gridHtml() + '</div>';

      el.querySelector('[data-close]').addEventListener('click', close);
      el.querySelectorAll('[data-filter]').forEach(function (b) {
        b.addEventListener('click', function () {
          onlyMiss = b.getAttribute('data-filter') === 'miss';
          paint();
        });
      });
      const sizeEl = el.querySelector('[data-size]');
      if (sizeEl) {
        sizeEl.addEventListener('input', function () {
          sizePx = Number(sizeEl.value) || 26;
          const grid = el.querySelector('.qz-b-grid');
          if (grid) grid.style.setProperty('--qz-b-size', sizePx + 'px');
        });
      }
      document.documentElement.style.overflow = 'hidden';
      qzState = { close: close };
    }

    function buildMarks(ranges) {
      const out = {};
      const famSpec = '48px ' + stack;
      for (let i = 0; i < text.length; i++) {
        const ch = text.charAt(i);
        if (ch in out) continue;
        const cp = ch.codePointAt(0);
        let ok = !ranges || inRanges(ranges, cp);
        if (ok) ok = glyphHasInk(ch, famSpec);
        out[ch] = !!ok;
      }
      return out;
    }

    WFProto.ensureFontCss(fam, weight);
    paint();
    if (WFChrome.skipGlyphCov && WFChrome.skipGlyphCov(font)) {
      marks = {};
      for (let i = 0; i < text.length; i++) marks[text.charAt(i)] = true;
      stats = uniqueHits(text, marks);
      paint();
      return;
    }
    fetchCssRanges(fam, weight).then(function (ranges) {
      return (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        marks = buildMarks(ranges);
        stats = uniqueHits(text, marks);
        paint();
      });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && qzState && qzState.close) qzState.close();
  });

  document.addEventListener('wf:picks', syncActs);

  window.WFSpecimen = {
    PRESETS: PRESETS,
    GLYPH_BLOCKS: GLYPH_BLOCKS,
    rowHtml: rowHtml,
    renderRows: renderRows,
    appendRows: appendRows,
    scheduleSpecimenCss: scheduleSpecimenCss,
    syncActs: syncActs,
    controlBar: controlBar,
    firstWeight: firstWeight,
    sortedWeights: sortedWeights,
    weightsSheetHtml: weightsSheetHtml,
    mountGlyphTable: mountGlyphTable,
    openQianziwenStele: openQianziwenStele,
    QIANZIWEN: QIANZIWEN,
    brandLine: brandLine,
    fetchCssRanges: fetchCssRanges,
    inRanges: inRanges,
    loadCommon3500: loadCommon3500,
    coverAgainstRanges: coverAgainstRanges,
    coverCommon3500: function (family, weight) {
      return Promise.all([fetchCssRanges(family, weight), loadCommon3500()]).then(function (pair) {
        const ranges = pair[0];
        const text = pair[1];
        if (!ranges || !text) return null;
        return coverAgainstRanges(ranges, text);
      });
    },
    /** 相对探测文（默认简繁千字文）比较两款 unicode-range：仅对方有 = 可补全字 */
    coverageDiff: function (primaryFamily, otherFamily, weight, text) {
      const probe = text || (QIANZIWEN.hans + QIANZIWEN.hant);
      return Promise.all([
        fetchCssRanges(primaryFamily, weight),
        fetchCssRanges(otherFamily, weight)
      ]).then(function (pair) {
        const a = pair[0];
        const b = pair[1];
        if (!a || !b) return null;
        let both = 0, onlyOther = 0, onlyPrimary = 0, neither = 0;
        const fillSamples = [];
        const seen = {};
        for (let i = 0; i < probe.length;) {
          const cp = probe.codePointAt(i);
          const ch = String.fromCodePoint(cp);
          i += ch.length;
          if (seen[ch] || /\s/.test(ch)) continue;
          seen[ch] = true;
          const inA = inRanges(a, cp);
          const inB = inRanges(b, cp);
          if (inA && inB) both++;
          else if (!inA && inB) {
            onlyOther++;
            if (fillSamples.length < 32) fillSamples.push(ch);
          } else if (inA && !inB) onlyPrimary++;
          else neither++;
        }
        return {
          both: both,
          onlyOther: onlyOther,
          onlyPrimary: onlyPrimary,
          neither: neither,
          total: both + onlyOther + onlyPrimary + neither,
          fillSamples: fillSamples
        };
      });
    }
  };
})();
