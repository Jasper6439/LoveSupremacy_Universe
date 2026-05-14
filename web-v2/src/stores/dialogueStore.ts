// ═══════════════════════════════════════════════════════════════════════════
// 恋爱至上主义区域 v1.6.0 - 对话 Store Slice
// 对话系统：互动、关闭、选择对话选项
// ═══════════════════════════════════════════════════════════════════════════
import type { DialogueType, CharacterData } from './types';

// ─── 对话 Slice 状态 ───────────────────────────────────────────────────────
export interface DialogueSlice {
  activeCharacterId: string | null;
  showDialogue: boolean;
  selectedDialogueType: DialogueType | null;

  // 对话操作
  interactWithCharacter: (charId: string) => void;
  closeDialogue: () => void;
  selectDialogueOption: (type: DialogueType) => void;
}

// ─── 合并后的完整状态类型（供 slice 内部使用）──────────────────────────────
export interface DialogueFullState extends DialogueSlice {
  characters: CharacterData[];
  collapseEnergy: number;
}

export const createDialogueSlice = (
  set: (fn: (s: DialogueFullState) => Partial<DialogueFullState>) => void,
  get: () => DialogueFullState
): DialogueSlice => ({
  activeCharacterId: null,
  showDialogue: false,
  selectedDialogueType: null,

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
});
