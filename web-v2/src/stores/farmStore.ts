// ═══════════════════════════════════════════════════════════════════════════
// 恋爱至上主义区域 v1.6.0 - 农场 Store Slice
// 农田操作：种植、收获、浇水、买卖、作物生长
// ═══════════════════════════════════════════════════════════════════════════
import type { CropType, CropData, WorldZone, InventoryItem } from './types';
import { CROP_CONFIG } from './constants';

// ─── 农场 Slice 状态 ───────────────────────────────────────────────────────
export interface FarmSlice {
  crops: Record<string, CropData>;

  // 农田操作
  plantCrop: (x: number, y: number, type: CropType) => boolean;
  harvestCrop: (x: number, y: number) => { type: CropType; money: number; energyGain: number } | null;
  waterCrop: (x: number, y: number) => boolean;
  buySeed: (type: CropType, quantity: number) => boolean;
  sellCrop: (type: CropType, quantity: number) => boolean;
  tick: () => void;
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────
export function getCropStageEmoji(type: CropType, stage: number, zone?: WorldZone): string {
  if (stage === 0) return '🌱';
  if (stage === 1) return '🌿';
  if (stage === 2) return zone === 'collapse' ? '🌀' : '🌾';
  return zone === 'collapse' ? CROP_CONFIG[type].collapseEmoji : CROP_CONFIG[type].emoji;
}

// ─── 合并后的完整状态类型（供 slice 内部使用）──────────────────────────────
export interface FarmFullState extends FarmSlice {
  inventory: InventoryItem[];
  money: number;
  worldZone: WorldZone;
  collapseEnergy: number;
  totalHarvested: number;
}

export const createFarmSlice = (
  set: (fn: (s: FarmFullState) => Partial<FarmFullState>) => void,
  get: () => FarmFullState
): FarmSlice => ({
  crops: {},

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
    return { type: crop.type, money: earnedMoney, energyGain };
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
});
