// ═══════════════════════════════════════════════════════════════════════════
// 恋爱至上主义区域 v1.6.0 - 玩家/世界 Store Slice
// 玩家移动、位置设置、区域检测
// ═══════════════════════════════════════════════════════════════════════════
import type { PlayerData, WorldObject } from './types';

// ─── 玩家 Slice 状态 ───────────────────────────────────────────────────────
export interface PlayerSlice {
  player: PlayerData;
  worldObjects: WorldObject[];

  // 玩家操作
  movePlayer: (dx: number, dy: number) => void;
  setPlayerPosition: (x: number, y: number) => void;
}

// ─── 辅助函数 ───────────────────────────────────────────────────────────────
export function isInArea(
  player: PlayerData,
  area: { x: number; y: number; width: number; height: number }
): boolean {
  return player.x >= area.x && player.x <= area.x + area.width && player.y >= area.y && player.y <= area.y + area.height;
}

// ─── Player Slice Creator ───────────────────────────────────────────────────
export interface PlayerFullState extends PlayerSlice {}

export const createPlayerSlice = (
  set: (fn: (s: PlayerFullState) => Partial<PlayerFullState>) => void,
  _get: () => PlayerFullState
): PlayerSlice => ({
  player: { x: 400, y: 300, direction: 'down', speed: 4, isMoving: false },
  worldObjects: [],

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
});
