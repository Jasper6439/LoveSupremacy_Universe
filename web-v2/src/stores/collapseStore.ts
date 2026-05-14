// ═══════════════════════════════════════════════════════════════════════════
// 恋爱至上主义区域 v1.6.0 - 崩坏 Store Slice
// 崩坏系统：触发崩坏事件、崩坏能量管理
// ═══════════════════════════════════════════════════════════════════════════
import type { CropData, CharacterData } from './types';
import { COLLAPSE_EVENTS } from './constants';

// ─── 崩坏 Slice 状态 ───────────────────────────────────────────────────────
export interface CollapseSlice {
  collapseEnergy: number;

  // 崩坏操作
  triggerCollapse: (eventType?: string) => { success: boolean; message: string };
  addCollapseEnergy: (amount: number) => void;
}

// ─── 合并后的完整状态类型（供 slice 内部使用）──────────────────────────────
export interface FullGameState extends CollapseSlice {
  crops: Record<string, CropData>;
  characters: CharacterData[];
}

export const createCollapseSlice = (set: (fn: (s: FullGameState) => Partial<FullGameState>) => void, get: () => FullGameState): CollapseSlice => ({
  collapseEnergy: 0,

  triggerCollapse: (eventType) => {
    const state = get();
    if (state.collapseEnergy < 10) return { success: false, message: '崩坏能量不足（需要≥10）' };

    const event = eventType
      ? COLLAPSE_EVENTS.find(e => e.type === eventType)
      : COLLAPSE_EVENTS[Math.floor(Math.random() * COLLAPSE_EVENTS.length)];
    if (!event) return { success: false, message: '未知崩坏事件' };

    const roll = Math.random();
    if (roll < event.risk) {
      set(s => ({ collapseEnergy: Math.max(0, s.collapseEnergy - 10) }));
      return { success: false, message: `崩坏失控！${event.description} 但出了意外...` };
    }

    set(s => {
      const newState: Partial<FullGameState> = { collapseEnergy: Math.max(0, s.collapseEnergy - 10) };
      if (event.type === 'time_accel') {
        const newCrops = { ...s.crops };
        for (const key in newCrops) {
          newCrops[key] = { ...newCrops[key], plantedAt: newCrops[key].plantedAt - 99999 };
        }
        newState.crops = newCrops;
      }
      if (event.type === 'emotion_resonance') {
        newState.characters = s.characters.map(c => ({
          ...c,
          heartLevel: Math.min(10, c.heartLevel + 2),
        }));
      }
      return newState;
    });
    return { success: true, message: event.description };
  },

  addCollapseEnergy: (amount) => set(s => ({ collapseEnergy: Math.max(0, s.collapseEnergy + amount) })),
});
