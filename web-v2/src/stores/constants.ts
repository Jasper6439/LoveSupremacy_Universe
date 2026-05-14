// ═══════════════════════════════════════════════════════════════════════════
// 恋爱至上主义区域 v1.6.0 - 常量配置
// 漫画世界觉醒 RPG 架构
// ═══════════════════════════════════════════════════════════════════════════
import type { CropType, CharacterData, WorldObject, CollapseEvent } from './types';

// ─── 作物配置（含双区效果）───────────────────────────────────────────────────
export const CROP_CONFIG: Record<CropType, {
  name: string;
  emoji: string;
  collapseEmoji: string;   // 崩坏区外观
  growthTime: number;
  seedPrice: number;
  sellPrice: number;
  color: string;
  collapseEffect: string;  // 崩坏区特殊效果
}> = {
  tomato: {
    name: '番茄', emoji: '🍅', collapseEmoji: '💗',
    growthTime: 30, seedPrice: 10, sellPrice: 25, color: '#E07A5F',
    collapseEffect: '送给角色+2好感',
  },
  carrot: {
    name: '胡萝卜', emoji: '🥕', collapseEmoji: '✨',
    growthTime: 20, seedPrice: 5, sellPrice: 15, color: '#F4A261',
    collapseEffect: '送给角色+2觉醒',
  },
  corn: {
    name: '玉米', emoji: '🌽', collapseEmoji: '🌈',
    growthTime: 40, seedPrice: 15, sellPrice: 40, color: '#E9C46A',
    collapseEffect: '可兑换特殊道具',
  },
  wheat: {
    name: '小麦', emoji: '🌾', collapseEmoji: '📖',
    growthTime: 25, seedPrice: 8, sellPrice: 20, color: '#F0E6D3',
    collapseEffect: '解锁角色回忆',
  },
  potato: {
    name: '土豆', emoji: '🥔', collapseEmoji: '⏰',
    growthTime: 35, seedPrice: 12, sellPrice: 30, color: '#DDB892',
    collapseEffect: '加速作物生长',
  },
  strawberry: {
    name: '草莓', emoji: '🍓', collapseEmoji: '🔮',
    growthTime: 50, seedPrice: 20, sellPrice: 50, color: '#FF6B6B',
    collapseEffect: '直接+5觉醒值',
  },
};

// ─── 校园地图区域 ───────────────────────────────────────────────────────────
export const MAP_AREAS = {
  // 北部：操场（车如云训练区）
  playground: { x: 150, y: 30, width: 500, height: 180, label: '操场', emoji: '🏃' },
  // 东部：天台（重要剧情地点）
  rooftop: { x: 650, y: 30, width: 200, height: 150, label: '天台', emoji: '🌃' },
  // 中部：教学楼走廊
  corridor: { x: 200, y: 220, width: 400, height: 100, label: '走廊', emoji: '🏫' },
  // 西部：图书馆（姜泰河常去）
  library: { x: 30, y: 220, width: 170, height: 150, label: '图书馆', emoji: '📚' },
  // 中南部：漫画社（李素妍大本营）
  comicClub: { x: 200, y: 330, width: 200, height: 130, label: '漫画社', emoji: '📖' },
  // 东南部：食堂
  cafeteria: { x: 400, y: 330, width: 200, height: 130, label: '食堂', emoji: '🍱' },
  // 西南部：小卖部（朴奶奶的安全区）
  shop: { x: 30, y: 380, width: 170, height: 120, label: '小卖部', emoji: '🏪' },
  // 南部：校门/回家路
  gate: { x: 300, y: 470, width: 300, height: 100, label: '校门', emoji: '🚪' },
  // 东部：农田（玩家种田区）
  farmArea: { x: 650, y: 200, width: 200, height: 250, label: '花坛', emoji: '🌻' },
};

// ─── 角色默认数据 ───────────────────────────────────────────────────────────
export const DEFAULT_CHARACTERS: CharacterData[] = [
  {
    id: 'cha_yewoon',
    name: '如云',
    emoji: '🏃',
    fullName: '车如云',
    title: '田径部王牌',
    x: 350, y: 100,
    heartLevel: 0, awakening: 0, destiny: 80,
    mood: 'neutral',
    dialogues: [
      { text: '...别打扰我。', type: 'script', heartGain: 0 },
      { text: '你总是出现在这里。', type: 'heart', heartGain: 1, awakeningGain: 1 },
      { text: '我不需要同情。', type: 'script', heartGain: 0 },
      { text: '今天的风...不错。', type: 'heart', heartGain: 2, awakeningGain: 2 },
      { text: '你到底是谁？为什么...你能看到我？', type: 'hidden', heartGain: 3, awakeningGain: 5, condition: '觉醒值>30' },
      { text: '我不想只是剧本里的角色。', type: 'hidden', heartGain: 5, awakeningGain: 10, condition: '觉醒值>60' },
    ],
    currentDialogueIndex: 0,
    wanderArea: { x: 150, y: 30, width: 500, height: 180 },
    lastWanderTime: Date.now(),
    likedGifts: ['tomato', 'strawberry'],
    dislikedGifts: ['corn'],
    schedule: {
      morning: { x: 300, y: 80, activity: '训练' },
      noon: { x: 450, y: 350, activity: '吃饭' },
      afternoon: { x: 250, y: 100, activity: '训练' },
      evening: { x: 700, y: 80, activity: '天台' },
      night: { x: 400, y: 500, activity: '便利店' },
    },
  },
  {
    id: 'kang_taeha',
    name: '泰河',
    emoji: '👔',
    fullName: '姜泰河',
    title: '学生会会长',
    x: 100, y: 280,
    heartLevel: 0, awakening: 0, destiny: 90,
    mood: 'happy',
    dialogues: [
      { text: '你好，有什么需要帮忙的吗？', type: 'script', heartGain: 0 },
      { text: '今天的会议真无聊...啊不，我是说很有意义。', type: 'heart', heartGain: 1, awakeningGain: 1 },
      { text: '作为学生会长，我必须...完美。', type: 'script', heartGain: 0 },
      { text: '只有在你面前，我不用假装微笑。', type: 'heart', heartGain: 2, awakeningGain: 2 },
      { text: '你觉得...我是真的在笑吗？', type: 'hidden', heartGain: 3, awakeningGain: 5, condition: '觉醒值>30' },
      { text: '我不想再做"完美"的傀儡了。', type: 'hidden', heartGain: 5, awakeningGain: 10, condition: '觉醒值>60' },
    ],
    currentDialogueIndex: 0,
    wanderArea: { x: 30, y: 220, width: 170, height: 150 },
    lastWanderTime: Date.now(),
    likedGifts: ['wheat', 'potato'],
    dislikedGifts: ['carrot'],
    schedule: {
      morning: { x: 80, y: 250, activity: '学生会' },
      noon: { x: 450, y: 350, activity: '食堂' },
      afternoon: { x: 100, y: 280, activity: '图书馆' },
      evening: { x: 80, y: 250, activity: '学生会' },
      night: { x: 400, y: 500, activity: '回家' },
    },
  },
  {
    id: 'lee_soyeon',
    name: '素妍',
    emoji: '📚',
    fullName: '李素妍',
    title: '漫画社成员',
    x: 280, y: 380,
    heartLevel: 0, awakening: 15, destiny: 50,
    mood: 'happy',
    dialogues: [
      { text: '你身上有"外面"的味道！', type: 'heart', heartGain: 1, awakeningGain: 2 },
      { text: '我昨晚又做了那个梦...关于画框外面的世界。', type: 'heart', heartGain: 1, awakeningGain: 3 },
      { text: '你也是从漫画外面来的吗？', type: 'hidden', heartGain: 2, awakeningGain: 5, condition: '觉醒值>20' },
      { text: '我发现了一些奇怪的东西...这个世界有边界。', type: 'hidden', heartGain: 3, awakeningGain: 5, condition: '觉醒值>40' },
      { text: '如果外面真的有世界...请告诉我。', type: 'hidden', heartGain: 5, awakeningGain: 10, condition: '觉醒值>60' },
    ],
    currentDialogueIndex: 0,
    wanderArea: { x: 200, y: 330, width: 200, height: 130 },
    lastWanderTime: Date.now(),
    likedGifts: ['corn', 'strawberry'],
    dislikedGifts: ['potato'],
    schedule: {
      morning: { x: 350, y: 300, activity: '教室' },
      noon: { x: 450, y: 350, activity: '食堂' },
      afternoon: { x: 280, y: 380, activity: '漫画社' },
      evening: { x: 300, y: 380, activity: '漫画社' },
      night: { x: 350, y: 500, activity: '宿舍' },
    },
  },
  {
    id: 'grandma_park',
    name: '朴奶奶',
    emoji: '👵',
    fullName: '朴奶奶',
    title: '小卖部老板',
    x: 100, y: 430,
    heartLevel: 0, awakening: 50, destiny: 20,
    mood: 'happy',
    dialogues: [
      { text: '新来的孩子，进来喝杯茶吧。', type: 'heart', heartGain: 1, awakeningGain: 1 },
      { text: '这些孩子...他们值得更好的命运。', type: 'heart', heartGain: 1, awakeningGain: 2 },
      { text: '我这里有一些特别的种子，要看看吗？', type: 'script', heartGain: 0 },
      { text: '很久以前，也有一个像你一样的人来到这里。', type: 'hidden', heartGain: 2, awakeningGain: 5, condition: '觉醒值>30' },
      { text: '我也是从"外面"来的。很久很久以前。', type: 'hidden', heartGain: 5, awakeningGain: 10, condition: '所有角色觉醒值>50' },
    ],
    currentDialogueIndex: 0,
    wanderArea: { x: 30, y: 380, width: 170, height: 120 },
    lastWanderTime: Date.now(),
    likedGifts: ['wheat', 'tomato'],
    dislikedGifts: [],
    schedule: {
      morning: { x: 100, y: 430, activity: '开店' },
      noon: { x: 100, y: 430, activity: '开店' },
      afternoon: { x: 100, y: 430, activity: '开店' },
      evening: { x: 100, y: 430, activity: '开店' },
      night: { x: 100, y: 430, activity: '关门' },
    },
  },
];

// ─── 校园世界物体 ───────────────────────────────────────────────────────────
export const DEFAULT_WORLD_OBJECTS: WorldObject[] = [
  // 教学楼装饰
  { id: 'desk1', type: 'desk', x: 250, y: 250, variant: 1 },
  { id: 'desk2', type: 'desk', x: 350, y: 250, variant: 1 },
  { id: 'bookshelf1', type: 'bookshelf', x: 60, y: 240, variant: 1 },
  { id: 'bookshelf2', type: 'bookshelf', x: 140, y: 240, variant: 2 },
  // 校园装饰
  { id: 'tree1', type: 'tree', x: 180, y: 50, variant: 1 },
  { id: 'tree2', type: 'tree', x: 600, y: 60, variant: 2 },
  { id: 'tree3', type: 'tree', x: 700, y: 450, variant: 1 },
  { id: 'flag1', type: 'flag', x: 400, y: 40, variant: 1 },
  // 休息区
  { id: 'bench1', type: 'bench', x: 500, y: 200, variant: 1 },
  { id: 'bench2', type: 'bench', x: 650, y: 160, variant: 1 },
  { id: 'lamp1', type: 'lamp', x: 300, y: 220, variant: 1 },
  { id: 'lamp2', type: 'lamp', x: 500, y: 330, variant: 1 },
  // 花坛（农田区附近）
  { id: 'flower1', type: 'flower', x: 630, y: 210, variant: 1 },
  { id: 'flower2', type: 'flower', x: 850, y: 220, variant: 2 },
  { id: 'flower3', type: 'flower', x: 640, y: 430, variant: 3 },
  // 围栏
  { id: 'fence1', type: 'fence', x: 640, y: 190, variant: 1 },
  { id: 'fence2', type: 'fence', x: 660, y: 190, variant: 1 },
];

// ─── 崩坏事件定义 ───────────────────────────────────────────────────────────
export const COLLAPSE_EVENTS: CollapseEvent[] = [
  { id: 'time_accel', type: 'time_accel', description: '时间加速——所有作物瞬间成熟！', risk: 0.2, reward: '作物瞬间成熟' },
  { id: 'space_fold', type: 'space_fold', description: '空间折叠——解锁隐藏种植格！', risk: 0.1, reward: '额外种植格' },
  { id: 'memory_surge', type: 'memory_surge', description: '记忆涌现——角色说出隐藏对话！', risk: 0.3, reward: '解锁角色秘密' },
  { id: 'emotion_resonance', type: 'emotion_resonance', description: '情感共鸣——大幅提升好感度！', risk: 0.15, reward: '好感度+5' },
];
