function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.keys(value).forEach((key) => deepFreeze(value[key]));
  return Object.freeze(value);
}

const SCREEN_IDS = deepFreeze(['PRO-01', 'HHZ-05', 'DSF-05', 'HUG-08']);

const SCREEN_OPTIONS = deepFreeze([
  { id: 'PRO-01', label: '序章', caption: '主题明场' },
  { id: 'HHZ-05', label: '黄花阵', caption: '灯火结果' },
  { id: 'DSF-05', label: '大水法', caption: '遗址比较' },
  { id: 'HUG-08', label: '终章', caption: '十二格暗场' }
]);

const PREVIEW_OPTIONS = deepFreeze({
  motion: [
    { value: 'normal', label: '正常动态' },
    { value: 'reduced', label: '减少动态' }
  ],
  network: [
    { value: 'normal', label: '正常网络' },
    { value: 'weak', label: '弱网替代' }
  ],
  reachability: [
    { value: 'reachable', label: '现场可达' },
    { value: 'unreachable', label: '点位不可达' }
  ]
});

const DEFAULT_PREVIEW = deepFreeze({
  screen: 'PRO-01',
  motion: 'normal',
  network: 'normal',
  reachability: 'reachable'
});

const VISUAL_TOKENS = deepFreeze([
  { id: 'paper', label: '旧纸明场', value: '#EEE5D3' },
  { id: 'ink', label: '档案深墨', value: '#1E2521' },
  { id: 'verdigris', label: '铜绿状态', value: '#426A63' },
  { id: 'cinnabar', label: '朱砂强调', value: '#964536' },
  { id: 'brass', label: '灯火黄铜', value: '#B08A4D' },
  { id: 'night', label: '终章暗场', value: '#121815' }
]);

const CONCEPT_ASSETS = deepFreeze({
  prologueRuin: {
    id: 'concept-prologue-ruin-v1',
    file: 'prologue-ruin-concept.svg',
    src: '../../assets/prologue-ruin-concept.svg',
    alt: '非事实遗址氛围构图，用于测试序章留白、残垣轮廓与标题关系',
    role: '序章遗址氛围构图',
    provenance: '内部概念绘制 · 非现场照片',
    replacementId: 'AST-PRO-01-HERO'
  },
  hhzPath: {
    id: 'concept-hhz-path-v1',
    file: 'hhz-path-concept.svg',
    src: '../../assets/hhz-path-concept.svg',
    alt: '非事实花园路径构图，用于测试入口、灯线与阵心之间的视觉关系',
    role: '黄花阵路径结果构图',
    provenance: '内部概念绘制 · 非审核路线',
    replacementId: 'AST-HHZ-05-PATH'
  },
  dsfRuin: {
    id: 'concept-dsf-ruin-v1',
    file: 'dsf-ruin-concept.svg',
    src: '../../assets/dsf-ruin-concept.svg',
    alt: '非事实遗址轮廓构图，用于测试大水法当前遗址一侧的版式',
    role: '大水法当前遗址版式',
    provenance: '内部概念绘制 · 非现场照片',
    replacementId: 'AST-DSF-05-RUIN'
  },
  dsfReconstruction: {
    id: 'concept-dsf-reconstruction-v1',
    file: 'dsf-reconstruction-concept.svg',
    src: '../../assets/dsf-reconstruction-concept.svg',
    alt: '非史实复原构图，用于测试大水法复原示意一侧的版式与标签边界',
    role: '大水法复原示意版式',
    provenance: '内部概念绘制 · 无复原依据',
    replacementId: 'AST-DSF-05-RECON'
  },
  hugoRadialBoard: {
    id: 'concept-hugo-radial-board-v1',
    file: 'hugo-radial-board-concept.svg',
    src: '../../assets/hugo-radial-board-concept.svg',
    alt: '非事实铜盘放射构图，用于测试十二个状态刻位和终章暗场层级',
    role: '终章十二刻位铜盘构图',
    provenance: '内部概念绘制 · 非文物图像',
    replacementId: 'AST-HUG-08-DIAL'
  }
});

const SCREENS_BY_ID = deepFreeze({
  'PRO-01': {
    id: 'PRO-01',
    sequence: '01 / 65',
    beatId: 'prologue.theme',
    chapter: '序章 · 路线主题',
    locationIndex: 0,
    progressLabel: '路线准备',
    kind: 'prologue',
    tone: 'paper',
    eyebrow: 'FIVE SITES / ONE FIELD ROUTE',
    title: '在残垣之间，寻找回来的路',
    summary: '这不是独立小游戏合集。每一段数字内容都从现场观察开始，再把发现带往下一处遗址。',
    knowledgeGoal: '明确这是以现场观察为核心的五地点路线。',
    nextScreen: 'PRO-02',
    primaryActionLabel: '打开数字路线包',
    sourceLabel: '现场主视觉待拍摄',
    resultState: '',
    assetLabel: '原型素材',
    materialNote: '残垣主视觉待现场拍摄；当前内部概念图只验证明场构图、标题层级与首要动作位置。',
    assets: [CONCEPT_ASSETS.prologueRuin]
  },
  'HHZ-05': {
    id: 'HHZ-05',
    sequence: '12 / 65',
    beatId: 'hhz.maze.result',
    chapter: '第一章 · 黄花阵',
    locationIndex: 1,
    progressLabel: '地点 1 / 5',
    kind: 'path-result',
    tone: 'lantern',
    eyebrow: 'PATH / CENTER / RESULT',
    title: '灯火抵达阵心',
    summary: '完成的路径不立即跳走。灯线沿现场关系抵达中心，让玩法结果成为可以被看见的发现。',
    knowledgeGoal: '理解入口、路径与阵心之间的空间关系。',
    nextScreen: 'HHZ-06',
    primaryActionLabel: '查看数字物件',
    sourceLabel: '黄花阵路径待审核',
    resultState: 'path-connected',
    assetLabel: '原型素材',
    materialNote: '路径、方亭与灯火均为非事实构图；正式版本必须依据审核现场图和路径遮罩制作。',
    assets: [CONCEPT_ASSETS.hhzPath]
  },
  'DSF-05': {
    id: 'DSF-05',
    sequence: '38 / 65',
    beatId: 'dsf.reconstruction.result',
    chapter: '第三章 · 大水法',
    locationIndex: 3,
    progressLabel: '地点 3 / 5',
    kind: 'reconstruction-result',
    tone: 'archive',
    eyebrow: 'RUIN / RECONSTRUCTION / COMPARE',
    title: '遗址与复原，保持两种身份',
    summary: '真实遗址保持事实标签，复原内容保持示意标签。结果停留在可比较状态，不把复原伪装成现场。',
    knowledgeGoal: '区分当前遗址与有依据的复原示意。',
    nextScreen: 'DSF-06',
    primaryActionLabel: '收入复原档案',
    sourceLabel: '遗址与复原来源待登记',
    resultState: 'reconstruction-revealed',
    assetLabel: '原型素材',
    materialNote: '当前两图均为内部概念版式；正式图像、共同视角、复原依据、来源与授权尚未进入原型。',
    assets: [CONCEPT_ASSETS.dsfRuin, CONCEPT_ASSETS.dsfReconstruction],
    comparePanels: [
      { id: 'ruin', label: '当前遗址占位', note: '待核验现场实拍', style: 'ruin', asset: CONCEPT_ASSETS.dsfRuin },
      { id: 'reconstruction', label: '复原示意占位', note: '待审核复原依据', style: 'reconstruction', asset: CONCEPT_ASSETS.dsfReconstruction }
    ]
  },
  'HUG-08': {
    id: 'HUG-08',
    sequence: '62 / 65',
    beatId: 'hugo.final-board.result',
    chapter: '第五章 · 终章',
    locationIndex: 5,
    progressLabel: '地点 5 / 5',
    kind: 'final-board',
    tone: 'night',
    eyebrow: 'RETURN / SEARCH / OPEN QUESTION',
    title: '完整与空缺，共同留在终局',
    summary: '终局不制造全数归位的庆祝。已知、追索和待核信息以同等克制的方式停留在十二格中。',
    knowledgeGoal: '理解状态板必须保留事实边界和仍待确认的信息。',
    nextScreen: 'HUG-09',
    primaryActionLabel: '阅读终章结语',
    sourceLabel: '状态集尚未审核',
    resultState: 'board-completed',
    assetLabel: '原型素材',
    materialNote: '十二刻位只用于测试放射版式和暗场层级；状态分布不是获批公开事实。',
    assets: [CONCEPT_ASSETS.hugoRadialBoard],
    boardSlots: [
      { index: '01', label: '版式 A', status: 'layout-a' },
      { index: '02', label: '版式 A', status: 'layout-a' },
      { index: '03', label: '版式 A', status: 'layout-a' },
      { index: '04', label: '版式 A', status: 'layout-a' },
      { index: '05', label: '版式 A', status: 'layout-a' },
      { index: '06', label: '版式 B', status: 'layout-b' },
      { index: '07', label: '版式 B', status: 'layout-b' },
      { index: '08', label: '版式 B', status: 'layout-b' },
      { index: '09', label: '待核', status: 'pending' },
      { index: '10', label: '待核', status: 'pending' },
      { index: '11', label: '待核', status: 'pending' },
      { index: '12', label: '待核', status: 'pending' }
    ]
  }
});

module.exports = {
  SCREEN_IDS,
  SCREEN_OPTIONS,
  PREVIEW_OPTIONS,
  DEFAULT_PREVIEW,
  VISUAL_TOKENS,
  CONCEPT_ASSETS,
  SCREENS_BY_ID
};
