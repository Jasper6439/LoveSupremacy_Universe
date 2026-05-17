// ═══════════════════════════════════════════════════════════════════════════
// LoveSupremacy Universe - Global World State Store (Zustand v5)
// Meta Narrative Game: Dual-World State Management
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────

export type SceneId = 'home' | 'chat' | 'farm' | 'action';

export interface InventoryItem {
  item_type: string;
  item_id: string;
  quantity: number;
  quality: number;
}

export interface FarmPlot {
  plot_id: string;
  crop_type: string | null;
  planted_at: string | null;
  growth_stage: number;
  is_watered: boolean;
}

export interface WorldState {
  // Core world state
  isAwakened: boolean;
  awakeningLevel: number; // 0-100

  // Scene management
  currentScene: SceneId;

  // Player data
  inventory: InventoryItem[];
  farmPlots: FarmPlot[];

  // User info
  userId: string | null;
  username: string | null;

  // UI state
  isTransitioning: boolean;
}

export interface WorldActions {
  // World switching
  toggleWorld: () => void;
  setAwakened: (value: boolean) => void;
  setAwakeningLevel: (level: number) => void;

  // Scene management
  setScene: (scene: SceneId) => void;

  // Inventory
  addToInventory: (item: InventoryItem) => void;
  removeFromInventory: (itemType: string, itemId: string, quantity: number) => void;
  clearInventory: () => void;
  setInventory: (items: InventoryItem[]) => void;

  // Farm
  setFarmPlots: (plots: FarmPlot[]) => void;
  updateFarmPlot: (plotId: string, update: Partial<FarmPlot>) => void;

  // User
  setUserId: (id: string | null) => void;
  setUsername: (name: string | null) => void;

  // UI
  setTransitioning: (value: boolean) => void;

  // Bulk state sync from backend
  syncFromServer: (data: Partial<WorldState>) => void;
}

export type WorldStore = WorldState & WorldActions;

// ─── Initial State ────────────────────────────────────────────────────────

const initialState: WorldState = {
  isAwakened: false,
  awakeningLevel: 0,
  currentScene: 'home',
  inventory: [],
  farmPlots: [],
  userId: null,
  username: null,
  isTransitioning: false,
};

// ─── Store ────────────────────────────────────────────────────────────────

export const useWorldStore = create<WorldStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ── World switching ──────────────────────────────────────────────
      toggleWorld: () => {
        const current = get().isAwakened;
        set({ isTransitioning: true });
        // Transition duration handled by CSS (0.8s), clear flag after
        setTimeout(() => {
          set({ isAwakened: !current, isTransitioning: false });
        }, 800);
      },

      setAwakened: (value: boolean) => {
        set({ isTransitioning: true });
        setTimeout(() => {
          set({ isAwakened: value, isTransitioning: false });
        }, 800);
      },

      setAwakeningLevel: (level: number) => {
        set({ awakeningLevel: Math.max(0, Math.min(100, level)) });
      },

      // ── Scene management ─────────────────────────────────────────────
      setScene: (scene: SceneId) => {
        set({ currentScene: scene });
      },

      // ── Inventory ────────────────────────────────────────────────────
      addToInventory: (item: InventoryItem) => {
        const inventory = [...get().inventory];
        const existing = inventory.find(
          (i) => i.item_type === item.item_type && i.item_id === item.item_id
        );
        if (existing) {
          existing.quantity += item.quantity;
          // Keep the higher quality
          if (item.quality > existing.quality) {
            existing.quality = item.quality;
          }
        } else {
          inventory.push({ ...item });
        }
        set({ inventory });
      },

      removeFromInventory: (
        itemType: string,
        itemId: string,
        quantity: number
      ) => {
        const inventory = get().inventory
          .map((i) => {
            if (i.item_type === itemType && i.item_id === itemId) {
              const newQty = i.quantity - quantity;
              return newQty <= 0 ? null : { ...i, quantity: newQty };
            }
            return i;
          })
          .filter((i): i is InventoryItem => i !== null);
        set({ inventory });
      },

      clearInventory: () => {
        set({ inventory: [] });
      },

      setInventory: (items: InventoryItem[]) => {
        set({ inventory: items });
      },

      // ── Farm ─────────────────────────────────────────────────────────
      setFarmPlots: (plots: FarmPlot[]) => {
        set({ farmPlots: plots });
      },

      updateFarmPlot: (plotId: string, update: Partial<FarmPlot>) => {
        set({
          farmPlots: get().farmPlots.map((plot) =>
            plot.plot_id === plotId ? { ...plot, ...update } : plot
          ),
        });
      },

      // ── User ─────────────────────────────────────────────────────────
      setUserId: (id: string | null) => {
        set({ userId: id });
      },

      setUsername: (name: string | null) => {
        set({ username: name });
      },

      // ── UI ───────────────────────────────────────────────────────────
      setTransitioning: (value: boolean) => {
        set({ isTransitioning: value });
      },

      // ── Server sync ──────────────────────────────────────────────────
      syncFromServer: (data: Partial<WorldState>) => {
        set({
          ...(data.isAwakened !== undefined && { isAwakened: data.isAwakened }),
          ...(data.awakeningLevel !== undefined && {
            awakeningLevel: data.awakeningLevel,
          }),
          ...(data.inventory !== undefined && { inventory: data.inventory }),
          ...(data.farmPlots !== undefined && { farmPlots: data.farmPlots }),
          ...(data.userId !== undefined && { userId: data.userId }),
          ...(data.username !== undefined && { username: data.username }),
        });
      },
    }),
    {
      name: 'lovesupremacy-world-v2',
      partialize: (state) => ({
        isAwakened: state.isAwakened,
        awakeningLevel: state.awakeningLevel,
        currentScene: state.currentScene,
        inventory: state.inventory,
        farmPlots: state.farmPlots,
        userId: state.userId,
        username: state.username,
      }),
    }
  )
);
