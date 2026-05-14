// ═══════════════════════════════════════════════════════════════════════════
// 恋爱至上主义区域 v1.6.0 - 游戏状态管理（聚合入口）
// 漫画世界觉醒 RPG 架构
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── 类型 re-export（向后兼容）──────────────────────────────────────────────
export type {
  CropType,
  ItemType,
  GameMode,
  WorldZone,
  DialogueType,
  CropData,
  InventoryItem,
  PlayerData,
  CharacterData,
  DialogueEntry,
  WorldObject,
  CollapseEvent,
} from './types';

// ─── 常量 re-export（向后兼容）──────────────────────────────────────────────
export { CROP_CONFIG, MAP_AREAS, COLLAPSE_EVENTS } from './constants';

// ─── 辅助函数 re-export（向后兼容）──────────────────────────────────────────
export { getCropStageEmoji } from './farmStore';
export { isInArea } from './playerStore';
export { getNearbyCharacter, getAvailableDialogues } from './characterStore';

// ─── 子 Store 导入 ─────────────────────────────────────────────────────────
import { createFarmSlice } from './farmStore';
import { createCharacterSlice } from './characterStore';
import { createDialogueSlice } from './dialogueStore';
import { createPlayerSlice } from './playerStore';
import { createCollapseSlice } from './collapseStore';

import { DEFAULT_CHARACTERS, DEFAULT_WORLD_OBJECTS } from './constants';
import type { GameMode, WorldZone, InventoryItem } from './types';

// ─── 完整状态接口 ───────────────────────────────────────────────────────────
interface GameState {
  // 通用状态
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  worldZone: WorldZone;
  setWorldZone: (zone: WorldZone) => void;
  money: number;
  inventory: InventoryItem[];
  farmName: string;
  farmLevel: number;
  totalHarvested: number;
  gameDay: number;
  updateMoney: (amount: number) => void;

  // 农场 slice
  crops: Record<string, import('./types').CropData>;
  plantCrop: (x: number, y: number, type: import('./types').CropType) => boolean;
  harvestCrop: (x: number, y: number) => { type: import('./types').CropType; money: number; energyGain: number } | null;
  waterCrop: (x: number, y: number) => boolean;
  buySeed: (type: import('./types').CropType, quantity: number) => boolean;
  sellCrop: (type: import('./types').CropType, quantity: number) => boolean;
  tick: () => void;

  // 角色 slice
  characters: import('./types').CharacterData[];
  updateCharacters: () => void;
  giveGift: (charId: string, giftId: string) => boolean;

  // 对话 slice
  activeCharacterId: string | null;
  showDialogue: boolean;
  selectedDialogueType: import('./types').DialogueType | null;
  interactWithCharacter: (charId: string) => void;
  closeDialogue: () => void;
  selectDialogueOption: (type: import('./types').DialogueType) => void;

  // 玩家 slice
  player: import('./types').PlayerData;
  worldObjects: import('./types').WorldObject[];
  movePlayer: (dx: number, dy: number) => void;
  setPlayerPosition: (x: number, y: number) => void;

  // 崩坏 slice
  collapseEnergy: number;
  triggerCollapse: (eventType?: string) => { success: boolean; message: string };
  addCollapseEnergy: (amount: number) => void;
}

// ─── Zustand Store ──────────────────────────────────────────────────────────
export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // ─── 通用状态 ─────────────────────────────────────────────────────────
      gameMode: 'manage',
      setGameMode: (mode) => set({ gameMode: mode }),
      worldZone: 'script',
      setWorldZone: (zone) => set({ worldZone: zone }),
      money: 100,
      inventory: [
        { type: 'seed', id: 'tomato', quantity: 5 },
        { type: 'seed', id: 'carrot', quantity: 5 },
        { type: 'seed', id: 'corn', quantity: 3 },
      ],
      farmName: '校园花坛',
      farmLevel: 1,
      totalHarvested: 0,
      gameDay: 1,
      updateMoney: (amount) => set(state => ({ money: state.money + amount })),

      // ─── 农场 slice ───────────────────────────────────────────────────────
      ...createFarmSlice(
        (fn) => set(fn as (s: GameState) => Partial<GameState>),
        () => get() as unknown as ReturnType<typeof createFarmSlice> extends (set: any, get: () => infer R) => any ? R : never
      ),

      // ─── 角色 slice ───────────────────────────────────────────────────────
      ...createCharacterSlice(
        (fn) => set(fn as (s: GameState) => Partial<GameState>),
        () => get() as unknown as ReturnType<typeof createCharacterSlice> extends (set: any, get: () => infer R) => any ? R : never
      ),

      // ─── 对话 slice ───────────────────────────────────────────────────────
      ...createDialogueSlice(
        (fn) => set(fn as (s: GameState) => Partial<GameState>),
        () => get() as unknown as ReturnType<typeof createDialogueSlice> extends (set: any, get: () => infer R) => any ? R : never
      ),

      // ─── 玩家 slice ───────────────────────────────────────────────────────
      ...createPlayerSlice(
        (fn) => set(fn as (s: GameState) => Partial<GameState>),
        () => get() as unknown as ReturnType<typeof createPlayerSlice> extends (set: any, get: () => infer R) => any ? R : never
      ),

      // ─── 崩坏 slice ───────────────────────────────────────────────────────
      ...createCollapseSlice(
        (fn) => set(fn as (s: GameState) => Partial<GameState>),
        () => get() as unknown as ReturnType<typeof createCollapseSlice> extends (set: any, get: () => infer R) => any ? R : never
      ),

      // ─── 覆盖 slice 默认值（使用常量初始化）───────────────────────────────
      characters: DEFAULT_CHARACTERS,
      worldObjects: DEFAULT_WORLD_OBJECTS,
    }),
    { name: 'nxsiran-game-storage-v3' }
  )
);
