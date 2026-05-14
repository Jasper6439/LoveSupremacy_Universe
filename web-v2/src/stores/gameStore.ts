// ═══════════════════════════════════════════════════════════════════════════
// 恋爱至上主义区域 v1.6.0 - 游戏状态管理
// 漫画世界觉醒 RPG 架构
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── 基础类型 ───────────────────────────────────────────────────────────────
export type CropType = 'tomato' | 'carrot' | 'corn' | 'wheat' | 'potato' | 'strawberry';
export type ItemType = 'seed' | 'crop' | 'tool' | 'gift';
export type GameMode = 'manage' | 'roam';
export type WorldZone = 'script' | 'collapse'; // 剧本区 / 崩坏区
export type DialogueType = 'script' | 'heart' | 'hidden'; // 剧本选项 / 真心选项 / 隐藏选项

// ─── 作物数据 ───────────────────────────────────────────────────────────────
export interface CropData {
  id: string;
  type: CropType;
  plantedAt: number;
  growthStage: 0 | 1 | 2 | 3;
  waterLevel: number;
}

// ─── 背包物品 ───────────────────────────────────────────────────────────────
export interface InventoryItem {
  type: ItemType;
  id: string;
  quantity: number;
}

// ─── 玩家数据（漫游模式）───────────────────────────────────────────────────
export interface PlayerData {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
  speed: number;
  isMoving: boolean;
}

// ─── 角色数据（GDD 定义）───────────────────────────────────────────────────
export interface CharacterData {
  id: string;
  name: string;
  emoji: string;
  fullName: string;       // 全名
  title: string;          // 头衔/身份
  x: number;
  y: number;
  // 关系系统
  heartLevel: number;     // 心级 0-10
  awakening: number;      // 觉醒值 0-100
  destiny: number;        // 命运力 0-100（剧本控制强度）
  // 对话
  dialogues: DialogueEntry[];
  currentDialogueIndex: number;
  // 行为
  mood: 'happy' | 'neutral' | 'sad' | 'awakening';
  wanderArea: { x: number; y: number; width: number; height: number };
  wanderTarget?: { x: number; y: number };
  lastWanderTime: number;
  // 日程
  schedule: Record<string, { x: number; y: number; activity: string }>;
  // 喜好
  likedGifts: string[];
  dislikedGifts: string[];
}

export interface DialogueEntry {
  text: string;
  type: DialogueType;
  awakeningGain?: number;  // 觉醒值变化
  heartGain?: number;      // 心级变化
  condition?: string;      // 触发条件描述
}

// ─── 世界物体 ───────────────────────────────────────────────────────────────
export interface WorldObject {
  id: string;
  type: 'tree' | 'bench' | 'lamp' | 'rock' | 'mailbox' | 'flower' | 'desk' | 'bookshelf' | 'flag' | 'fence';
  x: number;
  y: number;
  variant: number;
}

// ─── 崩坏事件 ───────────────────────────────────────────────────────────────
export interface CollapseEvent {
  id: string;
  type: 'time_accel' | 'space_fold' | 'memory_surge' | 'emotion_resonance';
  description: string;
  risk: number;           // 风险概率 0-1
  reward: string;         // 奖励描述
}

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
const DEFAULT_CHARACTERS: CharacterData[] = [
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
const DEFAULT_WORLD_OBJECTS: WorldObject[] = [
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

// ─── 状态接口 ───────────────────────────────────────────────────────────────
interface GameState {
  // 模式
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  worldZone: WorldZone;
  setWorldZone: (zone: WorldZone) => void;

  // 基础数据
  money: number;
  crops: Record<string, CropData>;
  inventory: InventoryItem[];
  farmName: string;
  farmLevel: number;
  totalHarvested: number;
  gameDay: number;

  // 新系统
  collapseEnergy: number;       // 崩坏能量
  characters: CharacterData[];  // 角色列表（替代 npcs）
  activeCharacterId: string | null;
  showDialogue: boolean;
  selectedDialogueType: DialogueType | null;

  // 漫游模式数据
  player: PlayerData;
  worldObjects: WorldObject[];

  // 农田操作
  plantCrop: (x: number, y: number, type: CropType) => boolean;
  harvestCrop: (x: number, y: number) => { type: CropType; money: number } | null;
  waterCrop: (x: number, y: number) => boolean;
  buySeed: (type: CropType, quantity: number) => boolean;
  sellCrop: (type: CropType, quantity: number) => boolean;

  // 玩家操作
  movePlayer: (dx: number, dy: number) => void;
  setPlayerPosition: (x: number, y: number) => void;
  interactWithCharacter: (charId: string) => void;
  closeDialogue: () => void;
  selectDialogueOption: (type: DialogueType) => void;

  // 角色操作
  updateCharacters: () => void;
  giveGift: (charId: string, giftId: string) => boolean;

  // 崩坏操作
  triggerCollapse: (eventType?: string) => { success: boolean; message: string };
  addCollapseEnergy: (amount: number) => void;

  // 通用
  updateMoney: (amount: number) => void;
  tick: () => void;
}

// ─── Zustand Store ──────────────────────────────────────────────────────────
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // 模式
      gameMode: 'manage',
      setGameMode: (mode) => set({ gameMode: mode }),
      worldZone: 'script',
      setWorldZone: (zone) => set({ worldZone: zone }),

      // 基础数据
      money: 100,
      crops: {},
      inventory: [
        { type: 'seed', id: 'tomato', quantity: 5 },
        { type: 'seed', id: 'carrot', quantity: 5 },
        { type: 'seed', id: 'corn', quantity: 3 },
      ],
      farmName: '校园花坛',
      farmLevel: 1,
      totalHarvested: 0,
      gameDay: 1,

      // 新系统
      collapseEnergy: 0,
      characters: DEFAULT_CHARACTERS,
      activeCharacterId: null,
      showDialogue: false,
      selectedDialogueType: null,

      // 漫游模式数据
      player: { x: 400, y: 300, direction: 'down', speed: 4, isMoving: false },
      worldObjects: DEFAULT_WORLD_OBJECTS,

      // ─── 农田操作 ─────────────────────────────────────────────────────────
      plantCrop: (x, y, type) => {
        const key = `${x},${y}`;
        const state = get();
        const seedItem = state.inventory.find(item => item.type === 'seed' && item.id === type);
        if (!seedItem || seedItem.quantity < 1) return false;
        if (state.crops[key]) return false;
        set(state => ({
          crops: {
            ...state.crops,
            [key]: { id: `${type}_${Date.now()}`, type, plantedAt: Date.now(), growthStage: 0, waterLevel: 0 },
          },
          inventory: state.inventory.map(item =>
            item.type === 'seed' && item.id === type ? { ...item, quantity: item.quantity - 1 } : item
          ),
        }));
        return true;
      },

      harvestCrop: (x, y) => {
        const key = `${x},${y}`;
        const state = get();
        const crop = state.crops[key];
        if (!crop || crop.growthStage < 3) return null;
        const config = CROP_CONFIG[crop.type];
        const earnedMoney = config.sellPrice;
        // 崩坏区收获额外获得崩坏能量
        const energyGain = state.worldZone === 'collapse' ? 3 : 0;
        set(state => {
          const newCrops = { ...state.crops };
          delete newCrops[key];
          return {
            crops: newCrops,
            money: state.money + earnedMoney,
            totalHarvested: state.totalHarvested + 1,
            collapseEnergy: state.collapseEnergy + energyGain,
          };
        });
        return { type: crop.type, money: earnedMoney };
      },

      waterCrop: (x, y) => {
        const key = `${x},${y}`;
        const state = get();
        const crop = state.crops[key];
        if (!crop || crop.waterLevel >= 3) return false;
        set(state => ({
          crops: { ...state.crops, [key]: { ...crop, waterLevel: crop.waterLevel + 1 } },
        }));
        return true;
      },

      buySeed: (type, quantity) => {
        const state = get();
        const config = CROP_CONFIG[type];
        const totalPrice = config.seedPrice * quantity;
        if (state.money < totalPrice) return false;
        set(state => {
          const existingSeed = state.inventory.find(item => item.type === 'seed' && item.id === type);
          return {
            money: state.money - totalPrice,
            inventory: existingSeed
              ? state.inventory.map(item => item.type === 'seed' && item.id === type ? { ...item, quantity: item.quantity + quantity } : item)
              : [...state.inventory, { type: 'seed', id: type, quantity }],
          };
        });
        return true;
      },

      sellCrop: (type, quantity) => {
        const state = get();
        const config = CROP_CONFIG[type];
        const totalPrice = config.sellPrice * quantity;
        const cropItem = state.inventory.find(item => item.type === 'crop' && item.id === type);
        if (!cropItem || cropItem.quantity < quantity) return false;
        set(state => ({
          money: state.money + totalPrice,
          inventory: state.inventory.map(item => item.type === 'crop' && item.id === type ? { ...item, quantity: item.quantity - quantity } : item).filter(item => item.quantity > 0),
        }));
        return true;
      },

      // ─── 玩家操作 ───────────────────────────────────────────────────────────
      movePlayer: (dx, dy) => {
        set(state => {
          const newX = Math.max(20, Math.min(880, state.player.x + dx * state.player.speed));
          const newY = Math.max(20, Math.min(580, state.player.y + dy * state.player.speed));
          let direction: PlayerData['direction'] = state.player.direction;
          if (dy < 0) direction = 'up';
          else if (dy > 0) direction = 'down';
          else if (dx < 0) direction = 'left';
          else if (dx > 0) direction = 'right';
          return { player: { ...state.player, x: newX, y: newY, direction, isMoving: dx !== 0 || dy !== 0 } };
        });
      },

      setPlayerPosition: (x, y) => set(state => ({ player: { ...state.player, x, y } })),

      interactWithCharacter: (charId) => {
        const state = get();
        const char = state.characters.find(c => c.id === charId);
        if (!char) return;
        set({ activeCharacterId: charId, showDialogue: true });
      },

      closeDialogue: () => set({ showDialogue: false, activeCharacterId: null, selectedDialogueType: null }),

      selectDialogueOption: (type) => {
        const state = get();
        const charId = state.activeCharacterId;
        if (!charId) return;
        const char = state.characters.find(c => c.id === charId);
        if (!char) return;

        // 找到当前对话中匹配类型的选项
        const dialogue = char.dialogues[char.currentDialogueIndex];
        if (!dialogue) return;

        // 应用效果
        const heartGain = type === 'heart' || type === 'hidden' ? (dialogue.heartGain || 0) : 0;
        const awakeningGain = type === 'heart' || type === 'hidden' ? (dialogue.awakeningGain || 0) : 0;

        set(state => ({
          selectedDialogueType: type,
          characters: state.characters.map(c =>
            c.id === charId
              ? {
                  ...c,
                  heartLevel: Math.min(10, c.heartLevel + heartGain),
                  awakening: Math.min(100, c.awakening + awakeningGain),
                  destiny: Math.max(0, c.destiny - (awakeningGain > 0 ? Math.floor(awakeningGain / 2) : 0)),
                  currentDialogueIndex: (c.currentDialogueIndex + 1) % c.dialogues.length,
                  mood: awakeningGain > 5 ? 'awakening' : c.mood,
                }
              : c
          ),
          collapseEnergy: state.collapseEnergy + (awakeningGain > 0 ? Math.floor(awakeningGain / 3) : 0),
        }));
      },

      // ─── 角色更新 ────────────────────────────────────────────────────────────
      updateCharacters: () => {
        const now = Date.now();
        set(state => ({
          characters: state.characters.map(char => {
            if (now - char.lastWanderTime < 5000) return char;
            const area = char.wanderArea;
            const newX = Math.max(area.x, Math.min(area.x + area.width, char.x + (Math.random() - 0.5) * 80));
            const newY = Math.max(area.y, Math.min(area.y + area.height, char.y + (Math.random() - 0.5) * 60));
            return { ...char, x: newX, y: newY, lastWanderTime: now };
          }),
        }));
      },

      giveGift: (charId, giftId) => {
        const state = get();
        const char = state.characters.find(c => c.id === charId);
        if (!char) return false;
        const giftItem = state.inventory.find(item => item.id === giftId && (item.type === 'crop' || item.type === 'gift'));
        if (!giftItem || giftItem.quantity < 1) return false;

        const isLiked = char.likedGifts.includes(giftId);
        const isDisliked = char.dislikedGifts.includes(giftId);
        const heartChange = isLiked ? 3 : isDisliked ? -2 : 1;
        const awakeningChange = isLiked ? 2 : 0;

        set(state => ({
          inventory: state.inventory.map(item =>
            item.id === giftId && (item.type === 'crop' || item.type === 'gift')
              ? { ...item, quantity: item.quantity - 1 }
              : item
          ).filter(item => item.quantity > 0),
          characters: state.characters.map(c =>
            c.id === charId
              ? { ...c, heartLevel: Math.max(0, Math.min(10, c.heartLevel + heartChange)), awakening: Math.min(100, c.awakening + awakeningChange) }
              : c
          ),
        }));
        return true;
      },

      // ─── 崩坏操作 ────────────────────────────────────────────────────────────
      triggerCollapse: (eventType) => {
        const state = get();
        if (state.collapseEnergy < 10) return { success: false, message: '崩坏能量不足（需要≥10）' };

        const event = eventType
          ? COLLAPSE_EVENTS.find(e => e.type === eventType)
          : COLLAPSE_EVENTS[Math.floor(Math.random() * COLLAPSE_EVENTS.length)];
        if (!event) return { success: false, message: '未知崩坏事件' };

        const roll = Math.random();
        if (roll < event.risk) {
          // 风险触发
          set(state => ({ collapseEnergy: Math.max(0, state.collapseEnergy - 10) }));
          return { success: false, message: `崩坏失控！${event.description} 但出了意外...` };
        }

        // 成功
        set(state => {
          const newState: Partial<GameState> = { collapseEnergy: Math.max(0, state.collapseEnergy - 10) };
          // 应用效果
          if (event.type === 'time_accel') {
            const newCrops = { ...state.crops };
            for (const key in newCrops) {
              newCrops[key] = { ...newCrops[key], plantedAt: newCrops[key].plantedAt - 99999 };
            }
            newState.crops = newCrops;
          }
          if (event.type === 'emotion_resonance') {
            newState.characters = state.characters.map(c => ({
              ...c,
              heartLevel: Math.min(10, c.heartLevel + 2),
            }));
          }
          return newState;
        });
        return { success: true, message: event.description };
      },

      addCollapseEnergy: (amount) => set(state => ({ collapseEnergy: Math.max(0, state.collapseEnergy + amount) })),

      // ─── 通用 ───────────────────────────────────────────────────────────────
      updateMoney: (amount) => set(state => ({ money: state.money + amount })),

      tick: () => {
        const now = Date.now();
        set(state => {
          const newCrops = { ...state.crops };
          let hasChanges = false;
          for (const key in newCrops) {
            const crop = newCrops[key];
            const config = CROP_CONFIG[crop.type];
            const elapsed = (now - crop.plantedAt) / 1000;
            let newStage: 0 | 1 | 2 | 3 = 0;
            const progress = elapsed / config.growthTime;
            if (progress >= 1) newStage = 3;
            else if (progress >= 0.6) newStage = 2;
            else if (progress >= 0.2) newStage = 1;
            if (newStage !== crop.growthStage) {
              newCrops[key] = { ...crop, growthStage: newStage };
              hasChanges = true;
            }
          }
          return hasChanges ? { crops: newCrops } : state;
        });
      },
    }),
    { name: 'nxsiran-game-storage-v3' }
  )
);

// ─── 辅助函数 ───────────────────────────────────────────────────────────────
export function getCropStageEmoji(type: CropType, stage: number, zone?: WorldZone): string {
  if (stage === 0) return '🌱';
  if (stage === 1) return '🌿';
  if (stage === 2) return zone === 'collapse' ? '🌀' : '🌾';
  return zone === 'collapse' ? CROP_CONFIG[type].collapseEmoji : CROP_CONFIG[type].emoji;
}

export function isInArea(player: PlayerData, area: { x: number; y: number; width: number; height: number }): boolean {
  return player.x >= area.x && player.x <= area.x + area.width && player.y >= area.y && player.y <= area.y + area.height;
}

export function getNearbyCharacter(player: PlayerData, characters: CharacterData[], distance = 50): CharacterData | null {
  for (const char of characters) {
    const dx = Math.abs(player.x - char.x);
    const dy = Math.abs(player.y - char.y);
    if (dx < distance && dy < distance) return char;
  }
  return null;
}

// 获取角色当前可用对话
export function getAvailableDialogues(char: CharacterData): DialogueEntry[] {
  return char.dialogues.filter(d => {
    if (!d.condition) return true;
    if (d.condition.includes('觉醒值>30') && char.awakening <= 30) return false;
    if (d.condition.includes('觉醒值>40') && char.awakening <= 40) return false;
    if (d.condition.includes('觉醒值>60') && char.awakening <= 60) return false;
    if (d.condition.includes('所有角色觉醒值>50')) return true; // 简化处理
    return true;
  });
}
