(() => {
  'use strict'

  const ASSET = '../plate21/module/assets/img/'
  const STORE_KEY = 'plate21_h5_session_v1'
  const CARD_ORDER = ['s2-purpose', 's2-name', 's2-blend', 's2-pattern', 's3-hour', 's3-zodiac', 's3-water', 's4-timeline']
  const PHOTO_POINTS = [
    { key: 'dome', no: '01', title: '穹顶与飞檐', desc: '同时纳入西式穹顶与中式八角飞檐。', guide: `${ASSET}IMG-S2C1.jpg` },
    { key: 'beast', no: '02', title: '檐角立兽', desc: '拍清飞檐角部的小型立式装饰。', guide: `${ASSET}IMG-S2C2.jpg` },
    { key: 'lotus', no: '03', title: '莲座宝瓶', desc: '记录中式莲座与西洋宝瓶花苞的组合。', guide: `${ASSET}IMG-S2C3.jpg` },
    { key: 'swan', no: '04', title: '双天鹅蝙蝠纹', desc: '记录双天鹅与蝙蝠纹细节。', guide: `${ASSET}IMG-S2C4.jpg` }
  ]
  const DEMO_PHOTOS = PHOTO_POINTS.map((_, index) => `../test/fixtures/player-photo-0${index + 1}.svg`)
  const RETURNED_ZODIAC = ['鼠', '牛', '虎', '兔', '马', '猴', '猪']
  const TIMELINE = [
    { id: 'c2010', year: '2010', title: '雨果雕像落成', sub: '中法文化交流纪念' },
    { id: 'c1860', year: '1860', title: '英法联军火烧圆明园', sub: '一场劫火留下废墟' },
    { id: 'c1747', year: '1747', title: '西洋楼开始建造', sub: '营造由此开始' },
    { id: 'c1861', year: '1861', title: '雨果致巴特勒上尉的信', sub: '公开谴责这场掠夺' },
    { id: 'c1760', year: '1760', title: '早期核心景观基本形成', sub: '远瀛观等景观仍有增建' }
  ]
  const YEARS = ['1747', '1760', '1860', '1861', '2010']
  const PROLOGUE = [
    { text: '我在博物馆做了两年研究助理，日常都是在整理馆藏图像档案。一天下午，我在整理一批清代铜版画的数字化记录，翻到《西洋楼铜版图》二十幅的条目。' },
    { text: '《西洋楼铜版图》于乾隆四十六年至五十一年（1781–1786），由宫廷画家伊兰泰起稿、造办处刻印，贺清泰、潘廷璋等参与，记录了圆明园西洋楼建成时的全貌。' },
    { text: '但有一份民国年间的著录卡片，在“第二十图”后面用铅笔补了一行小字：' },
    { text: '闻有第二十一图，未见。', quote: true },
    { image: `${ASSET}IMG-P02.jpg`, caption: '民国著录卡片特写' },
    { text: '字迹潦草，像是随手记下的传闻。再往后查，零星还有几处类似的记载。没有一份能给出实证。传闻在学术档案的缝隙里反复出现，像一根刺，拔不掉，也按不平。' },
    { text: '我继续翻阅那份残缺的档案，在附件夹中，发现了一份尚未整理完成的考察资料。' },
    { text: '里面有一封信、一张手绘路线图、几张空白记录页，以及几件用于现场记录的工具。' },
    { text: '我把那只尚未拆封的信封拿在手里。封口已经有些发脆，接下来的答案，也许要从它开始。' }
  ]
  const FINALE_STORY = [
    '如果你看到这里，说明你已经走完了这条路。你一定很好奇，那幅传闻中的第二十一幅版画，究竟在哪里。',
    '其实，它从未被藏在某个地方。因为它从来不是一幅等待被发现的旧画。它是一幅等待被后来者完成的“新画”。',
    '西洋楼的二十幅版画，把西洋楼收得完完整整。可是，站在今天的遗址前，还有许多东西没有被画下来。',
    '那些断裂的石柱，那些被火焚烧后的痕迹，那些流散海外、等待归来的文物，还有无数后来的人，站在废墟前发出的叹息。',
    '所以，我留下了这个传闻。希望有一天，会有人因为这个问题，重新走进这片遗址，将那些未曾被记录的一一记下。',
    '每一个来到这里、认真看过它的人，都在画第21幅的第N个版本。',
    '它记录毁灭，也记录重生。记录失去，也记录被重新看见。'
  ]
  const HISTORY = {
    purpose: {
      title: '黄花阵 · 中秋灯会', source: '圆明园西洋楼景区史料', card: 's2-purpose',
      lines: ['每逢中秋之夜，皇帝坐阵中心凉亭。', '观宫女持灯竞走，最先到达中心者得皇帝赏赐。']
    },
    name: {
      title: '黄花阵 · 名字由来', source: '圆明园西洋楼景区史料', card: 's2-name',
      lines: ['由于宫女们手持黄色彩绸扎成的莲花灯，', '所以这个迷宫也得名「黄花阵」。']
    },
    blend: {
      title: '西学东渐后的皇家审美转译', source: '黄花阵中心亭四图考察记录', card: 's2-blend',
      lines: ['西洋楼黄花阵中心亭，西式穹顶与中式八角飞檐并存。', '檐角立兽、莲座宝瓶、双天鹅间暗藏的蝙蝠纹，是西方形制与中式吉祥寓意的叠加。']
    },
    pattern: {
      title: '黄花阵 · 万字回纹', source: '圆明园西洋楼景区史料', card: 's2-pattern',
      lines: ['迷宫墙体刻满万字回纹，寓意福寿绵长。']
    },
    hour: {
      title: '海晏堂 · 大水法营造史料', source: '《西洋楼铜版图·海晏堂》；圆明园水利史料', card: 's3-hour',
      lines: ['常规报时：每个时辰由对应兽首轮流喷水。', '子时鼠首，丑时牛首，以此类推。', '正午轮到马首喷水，此刻其余十一兽首一同喷水。']
    },
    zodiac: {
      title: '十二兽首 · 回归纪实', source: '国家文物局公开资料', card: 's3-zodiac',
      lines: ['截至目前，十二生肖兽首中共有 7 尊已回归祖国。', '分别是：牛、虎、猴、猪、鼠、兔、马。', '其余龙、蛇、羊、鸡、狗 5 尊至今下落不明。']
    },
    water: {
      title: '马首铜像 · 回归纪实', source: '圆明园管理处', card: 's3-water',
      lines: ['马首铜像曾流失海外，后由何鸿燊先生出资购回。', '2019年，他正式将其捐赠给国家文物局。', '2020年12月1日，马首正式划拨圆明园管理处收藏，成为第一件回归圆明园原址的兽首。']
    },
    timeline: {
      title: '时间轴 · 西洋楼二百七十年', source: '《西洋楼铜版图》；雨果《致巴特勒上尉的信》；圆明园管理处公开资料', card: 's4-timeline',
      lines: ['1747 西洋楼始建 → 1760 核心景观形成 → 1860 英法联军火烧圆明园 →', '1861 雨果致巴特勒上尉的信 → 2010 雨果雕像落成。']
    }
  }
  const ROUTE_META = {
    cover: ['PLATE XXI', '西洋楼铜版图'], prologue: ['P01 · PROLOGUE', '序章'], envelope: ['P01 · PHYSICAL PROP', '实体信封'],
    s1: ['S1-1 · DECODE', '信封上的半字'], transit12: ['ROUTE · 01', '前往黄花阵'],
    s2purpose: ['S2-1 · QUIZ', '黄花阵的用途'], s2name: ['S2-2 · TEXT ANSWER', '黄花阵名字由来'], s2photos: ['S2-3 · FIELD RECORD', '中西结合的观察'], s2record: ['S2-3 · RECORD CARD', '四图考察卡'], s2pattern: ['S2-4 · PATTERN', '墙体的花纹'], s2route: ['ROUTE · 02', '查看手绘路线图'], transit23: ['ROUTE · 02', '前往海晏堂'],
    s3comic1: ['S3-1 · HOUR', '十二时辰漫画'], s3comic2: ['S3-1 · HOUR', '十二时辰漫画'], s3wheel: ['S3-2 · PHYSICAL PROP', '七纹样转盘'], s3wheelHandoff: ['S3-2 · HANDOFF', '收好转盘'], s3water: ['S3-3 · PHYSICAL PROP', '实体水显纸'], s3waterHandoff: ['S3-3 · HANDOFF', '晾干水显纸'], transit34: ['ROUTE · 03', '寻找雨果雕像'],
    s4intro: ['S4-1 · ARCHIVE', '第四站 · 雨果雕像'], s4timeline: ['S4-1 · TIMELINE', '时间轴排序'], s4password: ['S4-2 · PASSWORD', '最后一道锁'],
    finale: ['FINALE · ACT I-III', '第二十一图'], finaleStory: ['FINALE · ACT IV', '尾声 · 第二十一图'], sign: ['FINALE · ACT V', '署名'], report: ['P15 · REPORT', '考察报告'], ending: ['P16 · ENDING', '考察完结'], handbook: ['P17 · HANDBOOK', '考察手册']
  }
  const FLOW_STOPS = [
    { name: '序章', sub: 'PROLOGUE', route: 'prologue', routes: ['cover', 'prologue', 'envelope', 's1', 'transit12'] },
    { name: '黄花阵', sub: 'STATION 02', route: 's2purpose', routes: ['s2purpose', 's2name', 's2photos', 's2record', 's2pattern', 's2route', 'transit23'] },
    { name: '海晏堂', sub: 'STATION 03', route: 's3comic1', routes: ['s3comic1', 's3comic2', 's3wheel', 's3wheelHandoff', 's3water', 's3waterHandoff', 'transit34'] },
    { name: '雨果雕像', sub: 'STATION 04', route: 's4intro', routes: ['s4intro', 's4timeline', 's4password'] },
    { name: '第二十一图', sub: 'FINALE', route: 'finale', routes: ['finale', 'finaleStory', 'sign', 'report', 'ending', 'handbook'] }
  ]
  const DIRECTORY = [
    ['cover', 'P00', '封面'], ['prologue', 'P01', '序章阅读'], ['envelope', 'P01-B', '实体信封'], ['s1', 'S1-1', '信封破译'],
    ['s2purpose', 'S2-1', '黄花阵用途'], ['s2name', 'S2-2', '名字由来'], ['s2photos', 'S2-3', '四图现场考察'], ['s2pattern', 'S2-4', '万字纹'],
    ['s3comic1', 'S3-1', '时辰漫画'], ['s3wheel', 'S3-2', '七纹样转盘'], ['s3water', 'S3-3', '水显纸'],
    ['s4intro', 'S4-0', '雨果雕像'], ['s4timeline', 'S4-1', '时间轴'], ['s4password', 'S4-2', '日期密码'],
    ['finale', 'P14', '反转揭示'], ['report', 'P15', '考察报告'], ['ending', 'P16', '结尾'], ['handbook', 'P17', '考察手册']
  ]

  const screen = document.querySelector('#screen')
  const modalRoot = document.querySelector('#modalRoot')
  const backButton = document.querySelector('#backButton')
  const routeKicker = document.querySelector('#routeKicker')
  const routeTitle = document.querySelector('#routeTitle')
  const photoInput = document.querySelector('#photoInput')
  const exportCanvas = document.querySelector('#exportCanvas')
  let pendingPhotoSlot = ''
  let toastTimer = null
  let activeModal = null

  function dateKey() {
    const d = new Date()
    return String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
  }

  function freshState() {
    return {
      version: 1,
      sessionDate: dateKey(),
      current: 'cover',
      history: [],
      puzzles: {},
      cards: {},
      stations: { s1: false, s2: false, s3: false, s4: false },
      photos: {},
      name: '',
      reportCollected: false,
      novelIndex: 0,
      envelopeOpened: false,
      selectedOption: '',
      selectedPattern: '',
      comicQ1: '',
      timelinePlaced: {},
      timelineSelected: '',
      feedback: '',
      attempts: {},
      finaleAct: 0,
      startedAt: Date.now()
    }
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null')
      if (saved && saved.version === 1 && saved.sessionDate) return Object.assign(freshState(), saved)
    } catch (error) {}
    return freshState()
  }

  let state = loadState()

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)) } catch (error) { toast('浏览器存储空间不足，照片可能无法跨刷新保存') }
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])
  }

  function formatDate(key = state.sessionDate) {
    return `${key.slice(0, 4)} 年 ${Number(key.slice(4, 6))} 月 ${Number(key.slice(6, 8))} 日`
  }

  function toast(message) {
    const node = document.querySelector('#toast')
    node.textContent = message
    node.classList.add('is-visible')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => node.classList.remove('is-visible'), 2300)
  }

  function attempts(id) {
    state.attempts[id] = (state.attempts[id] || 0) + 1
    return state.attempts[id]
  }

  function collectCard(id) {
    const position = CARD_ORDER.indexOf(id)
    if (position >= 0 && !state.cards[id]) state.cards[id] = state.sessionDate.charAt(position)
  }

  function completePuzzle(id, options = {}) {
    if (!state.puzzles[id]) state.puzzles[id] = { completedAt: Date.now(), attempts: state.attempts[id] || 1 }
    if (options.card) collectCard(id)
    if (options.station) state.stations[options.station] = true
    saveState()
  }

  function navigate(route, replace = false) {
    if (!ROUTE_META[route]) route = 'cover'
    if (!replace && state.current !== route) state.history.push(state.current)
    if (replace && state.history.length) state.history[state.history.length - 1] = state.current
    state.current = route
    state.feedback = ''
    saveState()
    render()
    requestAnimationFrame(() => { screen.scrollTop = 0 })
  }

  function goBack() {
    const previous = state.history.pop()
    if (previous && ROUTE_META[previous]) {
      state.current = previous
      saveState()
      render()
    } else if (state.current !== 'cover') {
      state.current = 'cover'
      saveState()
      render()
    }
  }

  function stageIndex(route = state.current) {
    const index = FLOW_STOPS.findIndex(stop => stop.routes.includes(route))
    return Math.max(0, index)
  }

  function renderRail() {
    const current = stageIndex()
    document.querySelector('#railProgress').style.height = `${current / (FLOW_STOPS.length - 1) * 100}%`
    document.querySelector('#railStops').innerHTML = FLOW_STOPS.map((stop, index) => `
      <button class="rail-stop ${index === current ? 'is-active' : ''} ${index < current ? 'is-done' : ''}" data-action="jump" data-route="${stop.route}">
        <b>${stop.name}</b><span>${stop.sub}</span>
      </button>`).join('')
  }

  function page(tag, title, lead, body, className = '') {
    return `<article class="screen-page ${className}"><span class="page-tag">${tag}</span><h1 class="screen-title">${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ''}${body}</article>`
  }

  function button(label, action, className = 'primary-button', attrs = '') {
    return `<button type="button" class="${className}" data-action="${action}" ${attrs}>${label}</button>`
  }

  function dateLedger() {
    return `<div class="date-ledger" aria-label="八张日期卡">${CARD_ORDER.map(id => `<span class="date-digit ${state.cards[id] ? '' : 'is-empty'}">${state.cards[id] || '·'}</span>`).join('')}</div>`
  }

  function renderCover() {
    const hasProgress = Object.keys(state.puzzles).length > 0 || state.current !== 'cover'
    return `<article class="screen-page cover-page">
      <div class="cover-hero">
        <img src="${ASSET}img-c01.jpg" alt="西洋楼铜版画主视觉">
        <img class="cover-postmark" src="${ASSET}stickers/st-postmark-01.png" alt="">
        <span class="date-stamp">乾隆<br>四十六年<br>1781</span>
      </div>
      <p class="hand-note">此图与皇家档案所藏第二十一图同源</p>
      <div class="cover-title"><strong>西洋楼铜版图</strong><span>第二十<br>一图</span></div>
      <div class="cover-entry archive-card">
        <div class="archive-tab">考察凭证 · 第貳拾壹號</div>
        ${hasProgress ? button('继 续 考 察', 'continue') + button('重新考察', 'ask-reset', 'secondary-button') : button('开 始 考 察', 'start')}
        ${button('考察手册', 'open-handbook', 'text-button')}
      </div>
    </article>`
  }

  function renderPrologue() {
    const index = Math.min(state.novelIndex, PROLOGUE.length - 1)
    const item = PROLOGUE[index]
    let content = ''
    if (item.image) content = `<img class="novel-image" src="${item.image}" alt="${esc(item.caption)}"><p class="novel-caption">${esc(item.caption)}</p>`
    else if (item.quote) content = `<blockquote class="novel-text novel-quote">${esc(item.text)}</blockquote>`
    else content = `<p class="novel-text">${esc(item.text)}</p>`
    return `<article class="screen-page novel-sheet"><span class="page-tag">P01 · 序章</span><div class="archive-rule"></div><span class="novel-index">ARCHIVE LEAF ${String(index + 1).padStart(2, '0')}</span>${content}
      <div class="novel-controls">
        <button type="button" data-action="novel-prev" ${index === 0 ? 'disabled' : ''}>上一页</button>
        <span class="novel-page-count">${index + 1} / ${PROLOGUE.length}</span>
        <button type="button" data-action="${index === PROLOGUE.length - 1 ? 'novel-finish' : 'novel-next'}">${index === PROLOGUE.length - 1 ? '取出实体信封' : '下一页'}</button>
      </div>
    </article>`
  }

  function renderEnvelope() {
    const opened = state.envelopeOpened || state.puzzles['prologue-envelope']
    const body = !opened ? `<div class="archive-card"><div class="archive-tab">线下道具 · 实体信封</div><h2 class="card-title">取出资料袋里的信封</h2><div class="step-list">
      ${step(1, '找到封口未启的实体信封。')}${step(2, '拆开信封，取出并读完里面的信。')}${step(3, '信和信封都要保留，后面的调查还会用到。')}</div>${button('我已拆开并读完', 'envelope-open')}</div>`
      : `<div class="archive-card"><div class="archive-tab">信中内容</div><p class="novel-quote">“如果你想知道第二十一幅铜版画的秘密，就去圆明园西洋楼遗址吧，里面也许会有你想要的答案。”</p><p class="card-copy">收好手绘路线图、空白记录页与现场记录工具。下一步仍要使用信封和信纸。</p>${button('前 往 西 洋 楼', 'go-s1')}</div>`
    return page('P01 · PHYSICAL PROP', '一封没有署名的信', '手机只记录操作进度，实体道具仍由你亲手拆阅。', body)
  }

  function step(no, copy) { return `<div class="step-row"><span class="step-no">${no}</span><span class="step-copy">${copy}</span></div>` }

  function renderS1() {
    const solved = !!state.puzzles['s1-decode']
    const body = `<div class="archive-card"><div class="archive-tab">线下道具 · 实体信封与信件</div><h2 class="card-title">观察封口与信纸背面的半字</h2><div class="step-list">${step(1, '找到信封封口处和信纸背面的残缺字形。')}${step(2, '按位置将对应的两半组合，还原三个完整汉字。')}${step(3, '把得到的地点填在下方，网页只核对结果。')}</div></div>
      ${solved ? `<div class="archive-card"><div class="archive-tab">线索成立</div><h2 class="card-title">第一站的去处很明确了：黄花阵</h2><p class="card-copy">把实体信封收好，前往黄花阵继续调查。</p>${button('前往黄花阵', 's1-next')}</div>` : `<div class="field-input"><label for="s1Answer">第一站地点</label><input id="s1Answer" maxlength="8" placeholder="请输入三个汉字"><div class="feedback">${esc(state.feedback)}</div>${button('核 对 地 点', 's1-submit')}${button('提示一：观察哪里', 's1-hint1', 'text-button')}</div>`}`
    return page('No.S1-1', '信封上的半字', '拿出刚才拆开的实体信封与其中的信，从它们上面找到第一站。', body)
  }

  function renderTransit(key) {
    const configs = {
      transit12: { tag: 'ROUTE 01', from: '西洋楼入口', to: '黄花阵', text: '信封指引的方向，正是前方那座迷宫。穿过断柱与荒草，往黄花阵去。', next: 's2purpose' },
      transit23: { tag: 'ROUTE 02', from: '黄花阵', to: '海晏堂 · 大水法', text: '万字纹寓意福寿绵长，并不暗示“水”。手绘路线图从黄花阵向东北标出了海晏堂·大水法。', next: 's3comic1' },
      transit34: { tag: 'ROUTE 03', from: '海晏堂 · 大水法', to: '雨果雕像', text: '水显纸已晾干收好。马首曾经流失海外；劫掠发生后的 1861 年，雨果写信公开谴责这场掠夺。循信去寻找他的雕像。', next: 's4intro' }
    }
    const c = configs[key]
    const body = `<div class="route-map"><img src="${ASSET}IMG-M01.jpg" alt="西洋楼路线图"><i class="route-path"></i><i class="route-point" style="left:15%;bottom:18%"><span>${c.from}</span></i><i class="route-point" style="right:14%;top:18%"><span>${c.to}</span></i></div><p class="hand-note">缓步徐行，按现场步道前往</p><div class="archive-card"><p class="card-copy">${c.text}</p>${button('继 续 前 往', 'transit-next', 'primary-button', `data-route="${c.next}"`)}</div>`
    return page(c.tag, `${c.from} → ${c.to}`, '', body)
  }

  function renderS2Purpose() {
    const solved = !!state.puzzles['s2-purpose']
    const options = [['A', '军事防御工事'], ['B', '皇家藏书楼'], ['C', '中秋皇家娱乐 · 迷宫灯会'], ['D', '皇子秘密议事厅']]
    const body = `<img class="hero-image" src="${ASSET}IMG-S2A.jpg" alt="黄花阵铜版画"><p class="hand-note">砖墙仅及肩，入阵便迷向，奇哉。</p><h2 class="card-title" style="margin-top:24px">这迷宫的修建目的是</h2>
      ${solved ? `<div class="archive-card"><p class="card-copy">答案已经收入考察记录：中秋皇家娱乐 · 迷宫灯会。</p>${button('继续追查名字由来', 's2purpose-next')}</div>` : `<div class="option-list">${options.map(([key, text]) => `<button class="option-button ${state.selectedOption === key ? 'is-selected' : ''}" data-action="select-purpose" data-value="${key}"><b>${key}</b><span>${text}</span></button>`).join('')}</div><div class="feedback">${esc(state.feedback)}</div>${button('确 认', 'confirm-purpose', 'primary-button', state.selectedOption ? '' : 'disabled')}`}`
    return page('No.S2-1', '黄花阵 · 中秋灯会', '皇家宫苑中竟有一座迷宫，砖墙不过肩高，却纵横曲折如阵。', body)
  }

  function renderS2Name() {
    const solved = !!state.puzzles['s2-name']
    const body = `<img class="hero-image" src="${ASSET}IMG-S2B.jpg" alt="手持莲花灯的宫女"><p class="novel-caption">参考图：手持莲花灯的宫女</p>
      ${solved ? `<div class="archive-card"><p class="card-copy">答案已经收入考察记录：黄色彩绸扎成的莲花灯。</p>${button('继续现场观察', 's2name-next')}</div>` : `<div class="field-input"><label for="s2NameAnswer">你觉得「黄花」二字从何而来？</label><textarea id="s2NameAnswer" placeholder="输入你的观察"></textarea><div class="feedback">${esc(state.feedback)}</div>${button('提 交', 's2name-submit')}</div>`}`
    return page('No.S2-2', '黄花阵名字由来', '修建迷宫是为了中秋娱乐，可是这又和“黄花”有什么关系？', body)
  }

  function renderPhotos() {
    const count = PHOTO_POINTS.filter(point => state.photos[point.key]).length
    const slots = PHOTO_POINTS.map(point => {
      const photo = state.photos[point.key]
      return `<article class="photo-slot"><div class="photo-stage" data-action="preview-photo" data-slot="${point.key}"><img class="${photo ? '' : 'is-guide'}" src="${photo || point.guide}" alt="${point.title}">${photo ? '' : '<span class="photo-guide-label">参考位置<br>尚未拍摄</span>'}</div><div class="photo-meta"><b>${point.no} · ${point.title}</b><span>${point.desc}</span></div><button class="mini-button" data-action="pick-photo" data-slot="${point.key}">${photo ? '重新选择照片' : '拍摄 / 选择照片'}</button></article>`
    }).join('')
    const body = `<p class="body-copy muted">参考图只帮助定位，考察卡、报告和手册始终使用你选择的现场照片。</p><div class="photo-grid">${slots}</div><div class="photo-progress"><div class="photo-progress__meta"><span>现场记录进度</span><b>${count} / 4</b></div><div class="photo-progress__track"><i style="width:${count / 4 * 100}%"></i></div></div>${button('填充 H5 演示照片', 'demo-photos', 'secondary-button')}${button('生成四图考察卡', 'photos-complete', 'primary-button', count === 4 ? '' : 'disabled')}`
    return page('No.S2-3', '中西结合的观察', '在中心亭找到四处细节，并用照片留下现场记录。', body)
  }

  function renderRecord() {
    const body = `<div class="archive-card"><div class="archive-tab">FIELD RECORD · S2-3</div><h2 class="card-title">西学东渐后的皇家审美转译</h2><div class="record-grid">${PHOTO_POINTS.map(point => `<div class="record-photo" data-action="preview-photo" data-slot="${point.key}"><img src="${state.photos[point.key] || point.guide}" alt="${point.title}"><span>${point.no} · ${point.title}</span></div>`).join('')}</div><p class="report-meta">考察日期 · ${formatDate()}</p>${button('查看考察结论', 'record-history')}</div>`
    return page('No.S2-3', '四图考察卡', '以下四张均来自本次 H5 流程选择的照片。', body)
  }

  function renderPattern() {
    const solved = !!state.puzzles['s2-pattern']
    const patterns = [
      ['wanzi', '万字回纹', '回转连绵，万字不断', 'IMG-P-WANZI.jpg'], ['lianhua', '莲花纹', '对称花瓣图案', 'IMG-S4B4.jpg'],
      ['juanco', '卷草饰', '卷曲枝条与花朵', 'IMG-S4B1.jpg'], ['haishui', '海水江岸纹', '波浪状水纹', 'IMG-S4B3.jpg']
    ]
    const body = `<div class="pattern-grid">${patterns.map(([key, name, desc, img]) => `<article class="pattern-card ${state.selectedPattern === key ? 'is-selected' : ''}" data-action="select-pattern" data-value="${key}"><img src="${ASSET}${img}" alt="${name}"><b>${name}</b><span>${desc}</span></article>`).join('')}</div><p class="hand-note">墙上的花纹，回转连绵，像是走不到头。</p><div class="feedback">${esc(state.feedback)}</div>${solved ? `<div class="archive-card"><p class="card-copy">回转不断的万字纹，寄托的是福寿绵长。纹样本身不指向下一站，真正的路线线索还在资料袋里。</p>${button('查看手绘路线图', 'pattern-next')}</div>` : button('确认选择', 'confirm-pattern', 'primary-button', state.selectedPattern ? '' : 'disabled')}`
    return page('No.S2-4', '墙体的花纹', '从黄花阵入口一路走来，你能认出墙体上反复出现的是哪一种吗？', body)
  }

  function renderS2Route() {
    const body = `<div class="archive-card"><div class="archive-tab">线下道具 · 手绘路线图</div><h2 class="card-title">展开资料袋里的路线图</h2><div class="step-list">${step(1, '找到“黄花阵”的标记。')}${step(2, '沿手绘箭头向东北查看。')}${step(3, '下一处被圈出的地点是“海晏堂·大水法”。')}</div><p class="card-copy">确认路线后，把地图折好收回资料袋，按现场步道前往下一站。</p>${button('我已确认路线，出发', 's2route-next')}</div>`
    return page('ROUTE CLUE · 02', '路线线索不在纹样里', '万字纹的寓意已经核对完毕，现在拿出真正负责指路的手绘地图。', body)
  }

  function comicCells() {
    return `<div class="comic-grid">${['子时 · 鼠首喷水', '丑时 · 牛首喷水', '午时将至 · ？', '十二首齐喷'].map(text => `<div class="comic-cell"><span>${text}</span></div>`).join('')}</div>`
  }

  function renderComic1() {
    const choices = ['鼠', '牛', '虎', '兔', '马', '鸡']
    return page('No.S3-1', '十二时辰漫画推理', '海晏堂阶前曾是一座以水报时的钟。', `${comicCells()}<h2 class="card-title" style="margin-top:24px">午时将至，哪尊兽首即将喷水？</h2><div class="chip-grid">${choices.map(value => `<button class="choice-chip" data-action="comic1-answer" data-value="${value}">${value}</button>`).join('')}</div><div class="feedback">${esc(state.feedback)}</div>`)
  }

  function renderComic2() {
    const choices = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时']
    return page('No.S3-1', '十二时辰漫画推理', '每个时辰两小时，正午为马首当值。', `${comicCells()}<h2 class="card-title" style="margin-top:24px">十二兽首齐喷，此时是什么时辰？</h2><div class="chip-grid">${choices.map(value => `<button class="choice-chip" data-action="comic2-answer" data-value="${value}">${value}</button>`).join('')}</div><div class="feedback">${esc(state.feedback)}</div>`)
  }

  function renderWheel() {
    const body = `<div class="archive-card"><div class="archive-tab">线下道具 · 实体七纹样转盘</div><h2 class="card-title">转动七纹样转盘</h2><div class="step-list">${step(1, '取出实体七纹样转盘，保持中心连接件平放。')}${step(2, '按照转盘自身图示对齐并转动纹样。')}${step(3, '依次记录出现的七个生肖。')}</div>${button('我已转出七个生肖', 'wheel-ready')}</div><div class="field-input"><label for="wheelAnswer">转盘显示的七个生肖</label><input id="wheelAnswer" value="${state.puzzles['s3-zodiac'] ? RETURNED_ZODIAC.join('、') : ''}" placeholder="输入七个生肖，用顿号分隔"><div class="feedback">${esc(state.feedback)}</div>${button('填入演示结果', 'wheel-demo', 'secondary-button')}${button('核 对 转 盘 结 果', 'wheel-submit')}</div>`
    return page('No.S3-2', '有哪些兽首归来了', '十二生肖兽首流离海外，其中七尊已经归来。请用资料袋里的实体转盘找出它们。', body)
  }

  function renderWheelHandoff() {
    const body = `<div class="archive-card"><div class="archive-tab">道具交接</div><h2 class="card-title">收好转盘，取出水显纸</h2><div class="step-list">${step(1, '将七纹样转盘转回平整位置，收回资料袋。')}${step(2, '取出实体水显纸，并准备少量清水和微湿工具。')}${step(3, '让纸张远离手机与其他纸质资料。')}</div>${button('水显纸已准备好', 'wheel-handoff-next')}</div>`
    return page('No.S3-2 · HANDOFF', '七尊兽首已经核对', '史料卡已收入考察手册，现在完成实体道具交接。', body)
  }

  function renderWater() {
    const body = `<div class="archive-card"><div class="archive-tab">线下道具 · 实体水显纸</div><h2 class="card-title">用少量清水显影</h2><p class="care-note">注意：只需湿润纸面，不要浸泡；远离手机和其他纸质资料。</p><div class="step-list">${step(1, '将水显纸平放在干燥、平整的表面。')}${step(2, '用微湿的工具缓慢涂过纸面。')}${step(3, '看清兽首名称后，把结果填入下方。')}</div>${button('图案已经完整显现', 'water-ready')}</div><div class="field-input"><label for="waterAnswer">水显纸上的答案</label><input id="waterAnswer" placeholder="请输入兽首名称"><div class="feedback">${esc(state.feedback)}</div>${button('核 对 纸 上 答 案', 'water-submit')}</div>`
    return page('No.S3-3', '让水显出答案', '真正的线索会在纸面遇水后出现，网页只负责核对结果。', body)
  }

  function renderWaterHandoff() {
    const body = `<div class="archive-card"><div class="archive-tab">道具收尾 · 下一条线索</div><h2 class="card-title">晾干水显纸，再收回资料袋</h2><p class="care-note">将纸张平放自然晾干，不要擦拭或折叠湿润区域；完全干燥后再收好。</p><div class="step-list">${step(1, '马首曾流失海外，后来终于回到圆明园。')}${step(2, '这场流失始于 1860 年的劫掠；次年，雨果写下公开谴责的信。')}${step(3, '下一站去寻找雨果雕像，继续核对这封信留下的时间线。')}</div>${button('水显纸已收好，寻找雨果', 'water-handoff-next')}</div>`
    return page('No.S3-3 · HANDOFF', '马首铜像 · 回归纪实', '实体操作已经完成，先妥善收好纸张，再继续行进。', body)
  }

  function renderS4Intro() {
    const paragraphs = ['两百多年前，也曾有人与我有同样的悲愤。', '他不是中国人，也没有亲眼见过圆明园的辉煌。', '当他得知这样一座凝聚人类文明成果的园林遭到破坏时，他写下了《致巴特勒上尉的信》，公开谴责这场掠夺。', '雨果雕像是一尊立于花岗岩底座上的青铜半身像。他的面容在树荫下沉静，目光投向远方的大水法残柱。']
    const body = `<div class="archive-card"><div class="archive-tab">ARCHIVE NOTE · 第四站</div>${paragraphs.map(text => `<p class="card-copy">${text}</p>`).join('')}<blockquote class="novel-quote" style="font-size:18px">2010年，这尊雕像落成，作为中法文化交流的纪念。</blockquote>${button('继续整理时间轴', 's4intro-next')}</div>`
    return page('No.S4-0', '第四站 · 雨果雕像', '一封写于劫火之后一年的信，把遗址与今天连接起来。', body)
  }

  function renderTimeline() {
    const remaining = TIMELINE.filter(card => !state.timelinePlaced[card.year])
    const body = `<p class="body-copy muted">拖拽版在网页中保留为更适合键鼠和触屏的“先点事件卡，再点年份”。</p><div class="timeline"><div class="timeline-slots">${YEARS.map(year => `<button class="timeline-slot ${state.timelinePlaced[year] ? 'is-filled' : ''}" data-action="timeline-slot" data-year="${year}"><b>${year}</b><span>${state.timelinePlaced[year] ? TIMELINE.find(card => card.id === state.timelinePlaced[year]).title : '点击归位'}</span></button>`).join('')}</div><div class="timeline-cards">${remaining.map(card => `<button class="timeline-card ${state.timelineSelected === card.id ? 'is-selected' : ''}" data-action="timeline-card" data-id="${card.id}"><b>${card.title}</b><span>${card.sub}</span></button>`).join('')}</div></div><div class="feedback ${Object.keys(state.timelinePlaced).length === 5 ? 'is-ok' : ''}">${esc(state.feedback || (state.timelineSelected ? '再点它对应的年份。' : '先选择一张事件卡。'))}</div>${button('自动排列演示', 'timeline-demo', 'secondary-button')}${Object.keys(state.timelinePlaced).length === 5 ? button('前往最后一道锁', 'timeline-next') : ''}`
    return page('No.S4-1', '时间轴排序', '把事件卡放回它发生的那一年。', body)
  }

  function renderPassword() {
    const correct = !!state.puzzles['s4-password']
    const body = correct ? `<div class="archive-card"><div class="archive-tab">LOCK OPEN</div><h2 class="card-title">日期密码成立</h2><p class="card-copy">八张史料卡共同指向这次考察的日期：${formatDate()}。最后一道锁已经打开。</p>${button('开启第二十一图', 'password-next')}</div>`
      : `${dateLedger()}<p class="hand-note">把八张史料卡角落的数字连起来看看……</p><div class="field-input"><label for="passwordAnswer">八位日期密码</label><input id="passwordAnswer" inputmode="numeric" maxlength="8" placeholder="· · · · · · · ·"><div class="feedback">${esc(state.feedback)}</div>${button('解 锁', 'password-submit')}${button('需要提示？', 'password-hint', 'text-button')}</div>`
    return page('No.S4-2', '请输入密码', '谜题都破译了，可第二十一幅版画呢？也许，最后还有一道锁。', body)
  }

  function renderFinale() {
    if (!state.finaleAct) {
      const lines = ['考察报告生成中……', '正在整合这一路的见闻……', '铭文 · 黄花阵 ✓', '兽首 · 海晏堂 ✓', '时间 · 雨果 ✓', '日期 · 本次考察 ✓', '报告格式识别中……']
      return `<article class="screen-page finale-stage"><span class="page-tag">FINALE · ACT II</span><div class="finale-terminal">${lines.map((line, index) => `<div class="terminal-line" style="animation-delay:${index * .16}s">${line}</div>`).join('')}</div>${button('让五层铜版画显现', 'finale-reveal')}</article>`
    }
    return `<article class="screen-page finale-stage"><span class="page-tag">FINALE · ACT III</span><div class="plate-reveal"><img src="${ASSET}IMG-F06.jpg" alt="西洋楼铜版图第二十一图"></div><p class="finale-caption">它不是等待被发现的旧画，而是等待后来者完成的新画。</p>${button('阅读第二十一图题跋', 'finale-story')}</article>`
  }

  function renderFinaleStory() {
    return page('FINALE · ACT IV', '尾声 · 第二十一图', '', `<div class="archive-card">${FINALE_STORY.map((text, index) => index === 1 ? `<blockquote class="novel-quote" style="font-size:18px">${text}</blockquote>` : `<p class="card-copy">${text}</p>`).join('')}${button('署 名', 'finale-sign')}</div>`)
  }

  function renderSign() {
    const body = `<div class="report-frame"><img src="${ASSET}IMG-F06.jpg" alt="第二十一图"><div class="report-inscription">前二十幅记录建成，此幅记录毁灭之后——被修复，被注视，被重新看见。</div><div class="report-signature">1747 —— 今日<br>${esc(state.name)}</div></div><div class="field-input"><label for="signName">绘制者</label><input id="signName" maxlength="12" value="${esc(state.name)}" placeholder="写下你的名字"><p class="report-meta">绘制时间 · ${formatDate()} · 第 — 版</p>${button('署 名 并 归 档', 'sign-submit')}</div>`
    return page('No.014 · ACT V', '为第二十一图落款', '每一个认真看过它的人，都在画第21幅的第N个版本。', body)
  }

  function renderReport() {
    const photoCount = PHOTO_POINTS.filter(point => state.photos[point.key]).length
    const body = `<div class="report-frame"><img src="${ASSET}IMG-F06.jpg" alt="第二十一图"><div class="report-inscription">前二十幅记录建成，此幅记录毁灭之后——被修复，被注视，被重新看见。</div><div class="report-signature">1747 —— 今日<br>${esc(state.name || '无名氏')}</div></div><p class="report-meta">绘制者 ${esc(state.name || '无名氏')} · ${formatDate()} · 第 — 版</p><div class="archive-card"><div class="archive-tab">FIELD RECORD · S2-3</div><h2 class="card-title">现场四图考察记录 · ${photoCount} / 4</h2><div class="record-grid">${PHOTO_POINTS.map(point => `<div class="record-photo" data-action="preview-photo" data-slot="${point.key}">${state.photos[point.key] ? `<img src="${state.photos[point.key]}" alt="${point.title}">` : '<div class="photo-stage"><span class="photo-guide-label">待补录</span></div>'}<span>${point.no} · ${point.title}</span></div>`).join('')}</div><p class="card-copy muted">本区只收录你在流程中选择的照片；参考图不会替代缺失记录。</p>${photoCount < 4 ? button('返回四图页面补录', 'repair-photos', 'secondary-button') : ''}</div>${button('保存报告图片', 'export-report')}${button(state.reportCollected ? '已收入考察手册' : '收入考察手册', 'collect-report', 'secondary-button', state.reportCollected ? 'disabled' : '')}${button('继续完成考察', 'report-next', 'secondary-button')}`
    return page('No.015', '西洋楼铜版图 · 第二十一图', '考察报告 · 浏览器完整复刻版', body)
  }

  function renderEnding() {
    const body = `<div class="report-frame"><img src="${ASSET}IMG-R01.jpg" alt="大水法夕照参考图"></div><p class="novel-caption">离场视频暂无正式素材，以已标注的 AI 遗址参考图作 poster</p><div class="archive-card"><p class="card-copy">你收好拓包与手账，把用过的道具一一归位，像做完一天田野工作的考察队员。</p><p class="card-copy">你穿过大水法的拱门，经过海晏堂的座基——十二兽首的位置上，回来了七尊，还差五尊。</p><p class="card-copy">走出遗址时，你回望了一眼。残垣无声。但今天，有人沿着它的纹路走了一遍，一笔一笔，把它记了下来。</p><p class="hand-note">归途记：图成，人散，园犹在。</p>${button('回看考察手册', 'open-handbook')}${button('返回封面', 'ending-home', 'secondary-button')}</div>`
    return page('No.016', '—— 第廿一图 · 完 ——', '', body)
  }

  function renderHandbook() {
    const stationNames = [['s1', '拆信封破译'], ['s2', '黄花阵考察'], ['s3', '兽首与水显'], ['s4', '时间轴与密码']]
    const historyMap = [['purpose', 's2-purpose'], ['name', 's2-name'], ['blend', 's2-blend'], ['pattern', 's2-pattern'], ['hour', 's3-hour'], ['zodiac', 's3-zodiac'], ['water', 's3-water'], ['timeline', 's4-timeline']]
    const photoCount = PHOTO_POINTS.filter(point => state.photos[point.key]).length
    const body = `<div class="archive-rule"></div><h2 class="card-title">第壹折 · 四份考察记录</h2><div class="handbook-slots">${stationNames.map(([key, name], index) => `<div class="handbook-slot"><small>REC.${String(index + 1).padStart(2, '0')}</small><b>${name}</b><i>${state.stations[key] ? '已录' : '待录'}</i></div>`).join('')}</div><div class="archive-rule"></div><h2 class="card-title">第贰折 · 四图考察卡</h2><div class="archive-card"><div class="record-grid">${PHOTO_POINTS.map(point => `<div class="record-photo" data-action="preview-photo" data-slot="${point.key}">${state.photos[point.key] ? `<img src="${state.photos[point.key]}" alt="${point.title}">` : '<div class="photo-stage"><span class="photo-guide-label">待补录</span></div>'}<span>${point.no} · ${point.title}</span></div>`).join('')}</div><p class="report-meta">现场照片 ${photoCount} / 4</p></div><div class="archive-rule"></div><h2 class="card-title">第叁折 · 已收集史料</h2><div class="history-list">${historyMap.map(([id, puzzle]) => `<button class="history-item" data-action="handbook-history" data-history="${id}" ${state.puzzles[puzzle] ? '' : 'disabled'}><b>${HISTORY[id].title}</b><span>〔${HISTORY[id].source}〕</span></button>`).join('')}</div><div class="archive-rule"></div><h2 class="card-title">第肆折 · 考察报告</h2>${state.puzzles['s4-password'] ? `<div class="report-frame" data-action="jump" data-route="report"><img src="${ASSET}IMG-F06.jpg" alt="考察报告缩略"><div class="report-signature">${esc(state.name)}</div></div>` : '<div class="archive-card"><p class="card-copy muted">考察报告 · 尚未生成</p></div>'}`
    return page('No.017', '考 察 手 册', '西洋楼铜版图 · 第二十一图', body)
  }

  const RENDERERS = {
    cover: renderCover, prologue: renderPrologue, envelope: renderEnvelope, s1: renderS1,
    transit12: () => renderTransit('transit12'), transit23: () => renderTransit('transit23'), transit34: () => renderTransit('transit34'),
    s2purpose: renderS2Purpose, s2name: renderS2Name, s2photos: renderPhotos, s2record: renderRecord, s2pattern: renderPattern, s2route: renderS2Route,
    s3comic1: renderComic1, s3comic2: renderComic2, s3wheel: renderWheel, s3wheelHandoff: renderWheelHandoff, s3water: renderWater, s3waterHandoff: renderWaterHandoff,
    s4intro: renderS4Intro, s4timeline: renderTimeline, s4password: renderPassword,
    finale: renderFinale, finaleStory: renderFinaleStory, sign: renderSign, report: renderReport, ending: renderEnding, handbook: renderHandbook
  }

  function render() {
    if (!RENDERERS[state.current]) state.current = 'cover'
    const meta = ROUTE_META[state.current]
    routeKicker.textContent = meta[0]
    routeTitle.textContent = meta[1]
    backButton.disabled = state.current === 'cover'
    screen.innerHTML = RENDERERS[state.current]()
    renderRail()
  }

  function openHistory(id, nextRoute = '', buttonText = '继 续') {
    const item = HISTORY[id]
    if (!item) return
    activeModal = { type: 'history', id, nextRoute }
    modalRoot.innerHTML = `<div class="history-overlay"><article class="modal-card"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><span class="modal-kicker">ARCHIVE NOTE · 史料收录</span><h2 class="modal-title">${item.title}</h2><div class="archive-rule"></div><div class="modal-lines">${item.lines.map(line => `<p>${line}</p>`).join('')}</div><p class="modal-source">〔来源〕${item.source}</p>${state.cards[item.card] ? `<span class="corner-number">${state.cards[item.card]}</span>` : ''}${nextRoute ? button(buttonText, 'history-next') : button('关闭', 'close-modal', 'secondary-button')}</article></div>`
  }

  function openDirectory() {
    activeModal = { type: 'directory' }
    modalRoot.innerHTML = `<div class="modal-overlay"><article class="modal-card"><button class="modal-close" data-action="close-modal" aria-label="关闭">×</button><span class="modal-kicker">WEB PREVIEW · 18 ROUTES</span><h2 class="modal-title">完整流程目录</h2><p class="card-copy">目录跳转仅用于预览页面；从封面开始游玩才能生成完整日期卡和报告数据。</p><div class="directory-grid">${DIRECTORY.map(([route, no, name]) => `<button class="directory-link" data-action="directory-jump" data-route="${route}"><small>${no}</small><b>${name}</b></button>`).join('')}</div></article></div>`
  }

  function askReset() {
    activeModal = { type: 'reset' }
    modalRoot.innerHTML = `<div class="modal-overlay"><article class="modal-card"><span class="modal-kicker">ARCHIVE RESET · 档案重建</span><h2 class="modal-title">确认重新考察？</h2><div class="archive-rule"></div><p class="card-copy">这会清除四站进度、八张日期卡、四张现场照片、署名与报告记录。此操作无法撤销。</p>${button('保留当前记录', 'close-modal', 'secondary-button')}${button('确认重新考察', 'confirm-reset')}</article></div>`
  }

  function closeModal() {
    activeModal = null
    modalRoot.innerHTML = ''
  }

  function previewPhoto(slot) {
    const src = state.photos[slot]
    if (!src) return toast('该位置还没有现场照片')
    activeModal = { type: 'photo' }
    modalRoot.innerHTML = `<div class="photo-overlay" data-action="close-modal"><img class="photo-preview" src="${src}" alt="现场照片预览"></div>`
  }

  function readInput(id) {
    const node = document.querySelector(`#${id}`)
    return node ? node.value.trim() : ''
  }

  function feedback(message, ok = false) {
    state.feedback = message
    saveState()
    render()
    const node = document.querySelector('.feedback')
    if (node && ok) node.classList.add('is-ok')
  }

  function parseZodiac(value) {
    const all = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
    return all.filter(name => value.includes(name))
  }

  async function compressImage(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const image = await loadImage(dataUrl)
    const max = 1000
    const scale = Math.min(1, max / Math.max(image.naturalWidth || max, image.naturalHeight || max))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round((image.naturalWidth || max) * scale))
    canvas.height = Math.max(1, Math.round((image.naturalHeight || max) * scale))
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', .82)
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = src
    })
  }

  async function exportReport() {
    toast('正在生成报告图片……')
    const canvas = exportCanvas
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f4eddc'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#46382a'
    ctx.lineWidth = 6
    ctx.strokeRect(38, 38, canvas.width - 76, canvas.height - 76)
    ctx.lineWidth = 2
    ctx.strokeRect(58, 58, canvas.width - 116, canvas.height - 116)
    ctx.fillStyle = '#2e1f0d'
    ctx.textAlign = 'center'
    ctx.font = '700 58px SimSun, serif'
    ctx.fillText('西洋楼铜版图·第二十一图', canvas.width / 2, 130)
    const main = await loadImage(`${ASSET}IMG-F06.jpg`)
    ctx.drawImage(main, 100, 205, 1200, 790)
    ctx.fillStyle = 'rgba(244,237,220,.92)'
    ctx.fillRect(155, 245, 1090, 105)
    ctx.strokeStyle = '#46382a'
    ctx.strokeRect(155, 245, 1090, 105)
    ctx.fillStyle = '#46382a'
    ctx.font = '31px KaiTi, serif'
    ctx.fillText('前二十幅记录建成，此幅记录毁灭之后——被修复，被注视，被重新看见。', canvas.width / 2, 310)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#a63a2e'
    ctx.font = '38px KaiTi, serif'
    ctx.fillText(state.name || '无名氏', 1200, 930)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#2e1f0d'
    ctx.font = '700 38px SimSun, serif'
    ctx.fillText('现场四图考察记录', 100, 1075)
    for (let index = 0; index < PHOTO_POINTS.length; index++) {
      const point = PHOTO_POINTS[index]
      const x = 100 + (index % 2) * 620
      const y = 1125 + Math.floor(index / 2) * 420
      ctx.fillStyle = '#ebe1cb'
      ctx.fillRect(x, y, 580, 330)
      if (state.photos[point.key]) {
        try { ctx.drawImage(await loadImage(state.photos[point.key]), x, y, 580, 330) } catch (error) {}
      } else {
        ctx.fillStyle = '#8a7a60'
        ctx.textAlign = 'center'
        ctx.font = '28px sans-serif'
        ctx.fillText('待补录', x + 290, y + 170)
      }
      ctx.strokeStyle = '#a98f5f'
      ctx.strokeRect(x, y, 580, 330)
      ctx.fillStyle = '#46382a'
      ctx.textAlign = 'left'
      ctx.font = '26px sans-serif'
      ctx.fillText(`${point.no}  ${point.title}`, x, y + 370)
    }
    ctx.fillStyle = '#8a7a60'
    ctx.textAlign = 'center'
    ctx.font = '26px sans-serif'
    ctx.fillText(`绘制时间：${formatDate()}    第 — 版`, canvas.width / 2, 2155)
    const link = document.createElement('a')
    link.download = `第二十一图-考察报告-${state.sessionDate}.jpg`
    link.href = canvas.toDataURL('image/jpeg', .92)
    link.click()
    toast('报告图片已生成')
  }

  document.addEventListener('click', async event => {
    const target = event.target.closest('[data-action]')
    if (!target || target.disabled) return
    const action = target.dataset.action
    if (action === 'back') return goBack()
    if (action === 'open-directory') return openDirectory()
    if (action === 'open-handbook') return navigate('handbook')
    if (action === 'ask-reset') return askReset()
    if (action === 'close-modal') return closeModal()
    if (action === 'confirm-reset') {
      state = freshState()
      localStorage.removeItem(STORE_KEY)
      saveState()
      closeModal()
      render()
      return toast('新的考察档案已建立')
    }
    if (action === 'directory-jump') { closeModal(); return navigate(target.dataset.route) }
    if (action === 'jump') return navigate(target.dataset.route)
    if (action === 'start') { state = freshState(); saveState(); return navigate('prologue') }
    if (action === 'continue') return navigate(state.history[state.history.length - 1] || Object.keys(state.puzzles).length ? inferResume() : 'prologue')
    if (action === 'novel-prev') { state.novelIndex = Math.max(0, state.novelIndex - 1); saveState(); return render() }
    if (action === 'novel-next') { state.novelIndex = Math.min(PROLOGUE.length - 1, state.novelIndex + 1); saveState(); return render() }
    if (action === 'novel-finish') return navigate('envelope')
    if (action === 'envelope-open') { state.envelopeOpened = true; attempts('prologue-envelope'); completePuzzle('prologue-envelope'); return render() }
    if (action === 'go-s1') return navigate('s1')
    if (action === 's1-hint1') return feedback('先对照信封封口和信纸背面的半字；把对应位置的两半字合拢。')
    if (action === 's1-submit') {
      const ok = readInput('s1Answer').replace(/\s/g, '').includes('黄花阵'); attempts('s1-decode')
      if (!ok) return feedback((state.attempts['s1-decode'] || 0) > 1 ? '把对应位置的上下半字拼成三个完整汉字。' : '答案没有对上，再检查一次实体信封。')
      completePuzzle('s1-decode'); return render()
    }
    if (action === 's1-next') { state.stations.s1 = true; saveState(); return navigate('transit12') }
    if (action === 'transit-next') return navigate(target.dataset.route)
    if (action === 'select-purpose') { state.selectedOption = target.dataset.value; state.feedback = ''; saveState(); return render() }
    if (action === 'confirm-purpose') {
      attempts('s2-purpose')
      if (state.selectedOption !== 'C') return feedback((state.attempts['s2-purpose'] || 0) >= 2 ? '排除提示：与战事无关，与藏书也无关。' : '答案没有对上，再想想中秋夜的皇家娱乐。')
      completePuzzle('s2-purpose', { card: true }); render(); return openHistory('purpose', 's2name')
    }
    if (action === 's2purpose-next') return navigate('s2name')
    if (action === 's2name-submit') {
      const answer = readInput('s2NameAnswer'); const ok = ['莲花灯', '莲花', '花灯', '荷花灯', '黄色彩绸', '彩绸', '绸花', '丝花'].some(word => answer.includes(word)); attempts('s2-name')
      if (!ok) return feedback((state.attempts['s2-name'] || 0) >= 3 ? '提示：用黄色彩绸扎成的莲花灯。' : '看看参考图，宫女手里举着什么？')
      completePuzzle('s2-name', { card: true }); render(); return openHistory('name', 's2photos')
    }
    if (action === 's2name-next') return navigate('s2photos')
    if (action === 'pick-photo') { pendingPhotoSlot = target.dataset.slot; photoInput.value = ''; photoInput.click(); return }
    if (action === 'preview-photo') return previewPhoto(target.dataset.slot)
    if (action === 'demo-photos') { PHOTO_POINTS.forEach((point, index) => { state.photos[point.key] = DEMO_PHOTOS[index] }); saveState(); render(); return toast('已填入明确标注的 H5 演示照片') }
    if (action === 'photos-complete') { attempts('s2-blend'); completePuzzle('s2-blend', { card: true }); return navigate('s2record') }
    if (action === 'record-history') return openHistory('blend', 's2pattern', '继续观察墙体纹样')
    if (action === 'select-pattern') { state.selectedPattern = target.dataset.value; state.feedback = ''; saveState(); return render() }
    if (action === 'confirm-pattern') {
      attempts('s2-pattern')
      if (state.selectedPattern !== 'wanzi') return feedback((state.attempts['s2-pattern'] || 0) >= 2 ? '提示：寻找回转连绵、万字不断的纹样。' : '再仔细看看墙体纹路。')
      completePuzzle('s2-pattern', { card: true }); render(); return openHistory('pattern', 's2route', '查看手绘路线图')
    }
    if (action === 'pattern-next') return navigate('s2route')
    if (action === 's2route-next') { state.stations.s2 = true; saveState(); return navigate('transit23') }
    if (action === 'comic1-answer') {
      attempts('s3-hour')
      if (target.dataset.value !== '马') return feedback((state.attempts['s3-hour'] || 0) >= 2 ? '提示：子鼠丑牛，各按时辰当值；正午轮到马。' : '再对照十二地支与生肖。')
      state.comicQ1 = '马'; saveState(); return navigate('s3comic2')
    }
    if (action === 'comic2-answer') {
      attempts('s3-hour')
      if (target.dataset.value !== '午时') return feedback('提示：正午对应马首当值的时辰。')
      completePuzzle('s3-hour', { card: true }); render(); return openHistory('hour', 's3wheel', '取出七纹样转盘')
    }
    if (action === 'wheel-ready') return toast('转盘操作完成后，在下方填写七个生肖')
    if (action === 'wheel-demo') { const input = document.querySelector('#wheelAnswer'); if (input) input.value = RETURNED_ZODIAC.join('、'); return }
    if (action === 'wheel-submit') {
      const chosen = parseZodiac(readInput('wheelAnswer')); const ok = chosen.length === RETURNED_ZODIAC.length && RETURNED_ZODIAC.every(name => chosen.includes(name)); attempts('s3-zodiac')
      if (!ok) return feedback(`目前识别到 ${chosen.length} 个生肖，结果还没有完全对应。请回到实体转盘重新核对。`)
      completePuzzle('s3-zodiac', { card: true }); render(); return openHistory('zodiac', 's3wheelHandoff', '收好转盘')
    }
    if (action === 'wheel-handoff-next') return navigate('s3water')
    if (action === 'water-ready') return toast('图案稳定后，在下方填写兽首名称')
    if (action === 'water-submit') {
      const ok = readInput('waterAnswer').replace(/\s/g, '').includes('马首'); attempts('s3-water')
      if (!ok) return feedback((state.attempts['s3-water'] || 0) > 1 ? '让纸面均匀显色，再观察兽首名称。' : '纸上显出的不是这个答案，请重新观察实体水显纸。')
      completePuzzle('s3-water', { card: true }); render(); return openHistory('water', 's3waterHandoff')
    }
    if (action === 'water-handoff-next') { state.stations.s3 = true; saveState(); return navigate('transit34') }
    if (action === 's4intro-next') return navigate('s4timeline')
    if (action === 'timeline-card') { state.timelineSelected = target.dataset.id; state.feedback = '再点它对应的年份。'; saveState(); return render() }
    if (action === 'timeline-slot') {
      if (!state.timelineSelected) return feedback('先选择一张事件卡。')
      const card = TIMELINE.find(item => item.id === state.timelineSelected)
      const year = target.dataset.year; attempts('s4-timeline')
      if (!card || card.year !== year) return feedback('年份没有对应，再核对事件发生的先后。')
      state.timelinePlaced[year] = card.id; state.timelineSelected = ''; state.feedback = Object.keys(state.timelinePlaced).length === 5 ? '五张事件卡已经全部归位。' : '归位正确，继续选择下一张。'; saveState(); return render()
    }
    if (action === 'timeline-demo') { TIMELINE.forEach(card => { state.timelinePlaced[card.year] = card.id }); state.timelineSelected = ''; state.feedback = '已完成 H5 排序演示。'; saveState(); return render() }
    if (action === 'timeline-next') { completePuzzle('s4-timeline', { card: true }); return openHistory('timeline', 's4password', '查看最后一道锁') }
    if (action === 'password-hint') return feedback('八张卡片按收集顺序组成 YYYYMMDD，也就是本次考察锁定日期。')
    if (action === 'password-submit') {
      const input = readInput('passwordAnswer').replace(/\D/g, '').slice(0, 8); attempts('s4-password')
      if (input.length < 8) return feedback('请输入 8 位数字。')
      if (input !== state.sessionDate) return feedback('不对。再想想那些卡片角落的数字。')
      completePuzzle('s4-password', { station: 's4' }); state.stations.s4 = true; saveState(); return render()
    }
    if (action === 'password-next') return navigate('finale')
    if (action === 'finale-reveal') { state.finaleAct = 1; saveState(); return render() }
    if (action === 'finale-story') return navigate('finaleStory')
    if (action === 'finale-sign') return navigate('sign')
    if (action === 'sign-submit') { state.name = readInput('signName') || '无名氏'; saveState(); return navigate('report') }
    if (action === 'repair-photos') return navigate('s2photos')
    if (action === 'export-report') { try { await exportReport() } catch (error) { toast('报告导出失败，请重试') } return }
    if (action === 'collect-report') { state.reportCollected = true; saveState(); render(); return toast('已收入考察手册') }
    if (action === 'report-next') return navigate('ending')
    if (action === 'ending-home') { state.current = 'cover'; state.history = []; saveState(); return render() }
    if (action === 'handbook-history') return openHistory(target.dataset.history)
    if (action === 'history-next') { const next = activeModal && activeModal.nextRoute; closeModal(); if (next) navigate(next); return }
  })

  photoInput.addEventListener('change', async () => {
    const file = photoInput.files && photoInput.files[0]
    if (!file || !pendingPhotoSlot) return
    try {
      toast('正在处理照片……')
      state.photos[pendingPhotoSlot] = await compressImage(file)
      saveState()
      render()
      toast('照片已记录')
    } catch (error) {
      toast('没有取得可用照片，请换一张重试')
    } finally {
      pendingPhotoSlot = ''
    }
  })

  function inferResume() {
    if (state.puzzles['s4-password']) return state.name ? 'report' : 'finale'
    if (state.puzzles['s4-timeline']) return 's4password'
    if (state.stations.s3) return 's4intro'
    if (state.puzzles['s3-water']) return 's3waterHandoff'
    if (state.puzzles['s3-zodiac']) return 's3wheelHandoff'
    if (state.puzzles['s3-hour']) return 's3wheel'
    if (state.stations.s2) return 's3comic1'
    if (state.puzzles['s2-pattern']) return 's2route'
    if (state.puzzles['s2-blend']) return 's2record'
    if (state.puzzles['s2-name']) return 's2photos'
    if (state.puzzles['s2-purpose']) return 's2name'
    if (state.puzzles['s1-decode']) return 'transit12'
    if (state.puzzles['prologue-envelope']) return 's1'
    return state.envelopeOpened ? 'envelope' : 'prologue'
  }

  render()
})()
