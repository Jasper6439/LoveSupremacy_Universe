// ═══════════════════════════════════════════════════════════════════════════
// 漫游模式 v1.6.0 - 漫画世界觉醒 RPG
// 校园地图 + 角色系统 + 剧本区/崩坏区切换
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';
import { MAP_AREAS } from '../../stores/constants';
import { getCropStageEmoji } from '../../stores/farmStore';
import { getNearbyCharacter, getAvailableDialogues } from '../../stores/characterStore';
import { isInArea } from '../../stores/playerStore';
import type { CharacterData, DialogueType } from '../../stores/types';

// 校园世界物体渲染
const WORLD_OBJECT_EMOJI: Record<string, string[]> = {
  tree: ['🌳', '🌲', '🎄'],
  bench: ['🪑'],
  lamp: ['🏮'],
  rock: ['🪨', '🗿'],
  mailbox: ['📮'],
  flower: ['🌸', '🌺', '🌻'],
  desk: ['🪑', '📚'],
  bookshelf: ['📚', '📖'],
  flag: ['🚩'],
  fence: ['🏗️'],
};

// 对话选项样式映射
const DIALOGUE_OPTION_STYLES: Record<DialogueType, { label: string; color: string; icon: string }> = {
  script: { label: '剧本', color: 'bg-gray-500/80 text-white', icon: '📜' },
  heart: { label: '真心', color: 'bg-pink-500/80 text-white', icon: '💗' },
  hidden: { label: '隐藏', color: 'bg-purple-600/80 text-white', icon: '✨' },
};

export default function RoamMode() {
  const {
    player,
    characters,
    worldObjects,
    crops,
    money,
    worldZone,
    collapseEnergy,
    movePlayer,
    interactWithCharacter,
    closeDialogue,
    showDialogue,
    activeCharacterId,
    harvestCrop,
    updateCharacters,
    tick,
    selectDialogueOption,
    selectedDialogueType,
  } = useGameStore();

  const [keys, setKeys] = useState({ up: false, down: false, left: false, right: false });
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; x: number; y: number; text: string; color?: string }[]>([]);
  const [currentArea, setCurrentArea] = useState<string>('');
  const [dialogueStep, setDialogueStep] = useState<'choose' | 'result'>('choose');
  const containerRef = useRef<HTMLDivElement>(null);
  const floatingIdRef = useRef(0);

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') setKeys(k => ({ ...k, up: true }));
      if (key === 's' || key === 'arrowdown') setKeys(k => ({ ...k, down: true }));
      if (key === 'a' || key === 'arrowleft') setKeys(k => ({ ...k, left: true }));
      if (key === 'd' || key === 'arrowright') setKeys(k => ({ ...k, right: true }));
      if (key === 'e') handleInteract();
      if (key === 'escape' && showDialogue) closeDialogue();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') setKeys(k => ({ ...k, up: false }));
      if (key === 's' || key === 'arrowdown') setKeys(k => ({ ...k, down: false }));
      if (key === 'a' || key === 'arrowleft') setKeys(k => ({ ...k, left: false }));
      if (key === 'd' || key === 'arrowright') setKeys(k => ({ ...k, right: false }));
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showDialogue, closeDialogue]);

  // 移动循环
  useEffect(() => {
    const interval = setInterval(() => {
      let dx = 0, dy = 0;
      if (keys.up) dy = -1;
      if (keys.down) dy = 1;
      if (keys.left) dx = -1;
      if (keys.right) dx = 1;
      if (dx !== 0 || dy !== 0) movePlayer(dx, dy);
    }, 16);
    return () => clearInterval(interval);
  }, [keys, movePlayer]);

  // 角色闲逛更新
  useEffect(() => {
    const interval = setInterval(updateCharacters, 1000);
    return () => clearInterval(interval);
  }, [updateCharacters]);

  // 作物生长
  useEffect(() => {
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // 检测当前区域
  useEffect(() => {
    for (const area of Object.values(MAP_AREAS)) {
      if (
        player.x >= area.x &&
        player.x <= area.x + area.width &&
        player.y >= area.y &&
        player.y <= area.y + area.height
      ) {
        setCurrentArea(area.label);
        return;
      }
    }
    setCurrentArea('');
  }, [player.x, player.y]);

  // 对话打开时重置步骤
  useEffect(() => {
    if (showDialogue) setDialogueStep('choose');
  }, [showDialogue]);

  // 互动处理
  const handleInteract = useCallback(() => {
    if (showDialogue) return;
    const nearbyChar = getNearbyCharacter(player, characters, 60);
    if (nearbyChar) {
      interactWithCharacter(nearbyChar.id);
      return;
    }
    // 农田区收获
    const farmArea = MAP_AREAS.farmArea;
    if (
      player.x >= farmArea.x &&
      player.x <= farmArea.x + farmArea.width &&
      player.y >= farmArea.y &&
      player.y <= farmArea.y + farmArea.height
    ) {
      const gridX = Math.floor((player.x - farmArea.x) / 50);
      const gridY = Math.floor((player.y - farmArea.y) / 50);
      if (gridX >= 0 && gridX < 6 && gridY >= 0 && gridY < 6) {
        const result = harvestCrop(gridX, gridY);
        if (result) {
          const id = floatingIdRef.current++;
          setFloatingTexts(prev => [...prev, { id, x: player.x, y: player.y - 20, text: `+💰${result.money}`, color: '#C68E17' }]);
          setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== id)), 1000);
        }
      }
    }
  }, [player, characters, showDialogue, interactWithCharacter, harvestCrop]);

  // 当前对话的角色
  const activeChar: CharacterData | undefined = activeCharacterId
    ? characters.find(c => c.id === activeCharacterId)
    : undefined;

  // 获取可用对话选项
  const availableDialogues = activeChar ? getAvailableDialogues(activeChar) : [];
  const currentDialogue = activeChar ? activeChar.dialogues[activeChar.currentDialogueIndex] : null;

  // 选择对话选项
  const handleSelectOption = (type: DialogueType) => {
    selectDialogueOption(type);
    setDialogueStep('result');
  };

  // 关闭对话
  const handleCloseDialogue = () => {
    closeDialogue();
    setDialogueStep('choose');
  };

  // 剧本区/崩坏区背景
  const isCollapse = worldZone === 'collapse';

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden transition-colors duration-700 ${
      isCollapse
        ? 'bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-900'
        : 'bg-gradient-to-b from-brand-200 to-brand-400'
    }`}>
      {/* 地图背景 */}
      <div className="absolute inset-0">
        {/* 区域纹理 */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: isCollapse
            ? 'radial-gradient(circle at 30% 40%, #7C3AED 0%, transparent 50%), radial-gradient(circle at 70% 60%, #4F46E5 0%, transparent 50%)'
            : 'radial-gradient(circle at 20% 30%, #95D5B2 0%, transparent 50%), radial-gradient(circle at 80% 70%, #B8E0D2 0%, transparent 50%)',
        }} />

        {/* 崩坏区特效 - 闪烁粒子 */}
        {isCollapse && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-purple-400"
                style={{ left: `${10 + i * 12}%`, top: `${5 + (i % 3) * 30}%` }}
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        )}

        {/* 区域标签 */}
        {Object.entries(MAP_AREAS).map(([key, area]) => (
          <div
            key={key}
            className={`absolute border-2 border-dashed rounded-lg flex items-center justify-center transition-colors duration-500 ${
              isCollapse ? 'border-purple-400/40' : 'border-white/30'
            }`}
            style={{
              left: area.x,
              top: area.y,
              width: area.width,
              height: area.height,
            }}
          >
            <span className={`text-sm font-medium ${isCollapse ? 'text-purple-300/60' : 'text-white/50'}`}>
              {area.emoji} {area.label}
            </span>
          </div>
        ))}

        {/* 农田区 - 显示作物（双区差异化） */}
        {(() => {
          const farmArea = MAP_AREAS.farmArea;
          const cellSize = 50;
          const plots = [];
          for (let y = 0; y < 6; y++) {
            for (let x = 0; x < 6; x++) {
              const plotKey = `${x},${y}`;
              const crop = crops[plotKey];
              plots.push(
                <div
                  key={plotKey}
                  className="absolute w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300"
                  style={{
                    left: farmArea.x + x * cellSize + 5,
                    top: farmArea.y + y * cellSize + 5,
                    backgroundColor: crop
                      ? (isCollapse ? '#4C1D9540' : '#DDB892')
                      : (isCollapse ? '#4C1D9520' : '#C9A67A50'),
                    border: `2px solid ${isCollapse ? '#7C3AED' : '#B8956A'}`,
                  }}
                >
                  {crop && (
                    <span className="text-2xl">
                      {getCropStageEmoji(crop.type, crop.growthStage, worldZone)}
                    </span>
                  )}
                </div>
              );
            }
          }
          return plots;
        })()}
      </div>

      {/* 世界物体 */}
      {worldObjects.map(obj => {
        const emojis = WORLD_OBJECT_EMOJI[obj.type] || ['❓'];
        const emoji = emojis[obj.variant % emojis.length];
        return (
          <motion.div
            key={obj.id}
            className="absolute text-3xl pointer-events-none"
            style={{ left: obj.x, top: obj.y }}
            animate={obj.type === 'tree' ? { rotate: [0, 2, -2, 0] } : undefined}
            transition={obj.type === 'tree' ? { duration: 4, repeat: Infinity, ease: 'easeInOut' } : undefined}
          >
            {emoji}
          </motion.div>
        );
      })}

      {/* 角色 */}
      {characters.map(char => (
        <motion.div
          key={char.id}
          className="absolute flex flex-col items-center"
          animate={{ x: char.x, y: char.y }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <span className="text-3xl">{char.emoji}</span>
          <span className={`text-xs px-1 rounded mt-1 whitespace-nowrap ${
            isCollapse ? 'text-purple-200 bg-purple-900/70' : 'text-white bg-black/50'
          }`}>
            {char.name}
          </span>
          {/* 觉醒指示器 */}
          {char.awakening > 0 && (
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: Math.min(5, Math.ceil(char.awakening / 20)) }).map((_, i) => (
                <span key={i} className="text-[8px]">✨</span>
              ))}
            </div>
          )}
        </motion.div>
      ))}

      {/* 玩家 */}
      <motion.div
        className="absolute flex flex-col items-center z-20"
        animate={{ x: player.x, y: player.y }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        <div className="relative">
          <span className="text-4xl">
            {player.direction === 'up' ? '🧑‍🎨' :
             player.direction === 'down' ? '🧑‍🎨' :
             player.direction === 'left' ? '🧑‍🎨' : '🧑‍🎨'}
          </span>
          {player.isMoving && (
            <motion.div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-1 bg-black/30 rounded-full"
              animate={{ scaleX: [1, 1.3, 1] }}
              transition={{ duration: 0.2, repeat: Infinity }}
            />
          )}
        </div>
      </motion.div>

      {/* 飘字效果 */}
      <AnimatePresence>
        {floatingTexts.map(ft => (
          <motion.div
            key={ft.id}
            className="absolute text-lg font-bold z-30"
            style={{ left: ft.x, top: ft.y, color: ft.color || '#FBBF24' }}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -40 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            {ft.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* HUD - 顶部 */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10">
        {/* 状态面板 */}
        <div className={`px-3 py-2 rounded-ios-lg flex items-center gap-3 pointer-events-auto ${
          isCollapse ? 'bg-purple-900/70 backdrop-blur-md' : 'glass-card'
        }`}>
          <span className="text-lg">💰 {money}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isCollapse ? 'bg-purple-500/50 text-purple-200' : 'bg-indigo-100 text-indigo-700'
          }`}>
            ⚡ {collapseEnergy}
          </span>
        </div>

        {/* 当前区域 + 世界区标签 */}
        <div className="flex flex-col items-end gap-1">
          {currentArea && (
            <div className={`px-3 py-2 rounded-ios-lg pointer-events-auto ${
              isCollapse ? 'bg-purple-900/70 backdrop-blur-md' : 'glass-card'
            }`}>
              <span className={`text-sm ${isCollapse ? 'text-purple-200' : 'text-gray-700'}`}>
                {currentArea}
              </span>
            </div>
          )}
          {/* 世界区标识 */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold pointer-events-auto ${
            isCollapse
              ? 'bg-purple-500/80 text-white animate-pulse'
              : 'bg-white/70 text-gray-600'
          }`}>
            {isCollapse ? '🌀 崩坏区' : '📖 剧本区'}
          </div>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none z-10">
        <div className={`px-3 py-2 rounded-ios-lg text-xs pointer-events-auto ${
          isCollapse ? 'bg-purple-900/70 backdrop-blur-md text-purple-200' : 'glass-card text-gray-600'
        }`}>
          <p>WASD/方向键 移动</p>
          <p>E 互动 | ESC 关闭</p>
        </div>

        {/* 附近角色提示 */}
        {(() => {
          const nearby = getNearbyCharacter(player, characters, 60);
          return nearby ? (
            <div className={`px-3 py-2 rounded-ios-lg text-sm pointer-events-auto ${
              isCollapse ? 'bg-purple-900/70 backdrop-blur-md text-purple-200' : 'glass-card'
            }`}>
              按 E 与 {nearby.emoji} {nearby.name} 对话
            </div>
          ) : null;
        })()}
      </div>

      {/* 对话框 */}
      <AnimatePresence>
        {showDialogue && activeChar && (
          <motion.div
            className="absolute inset-x-4 bottom-20 z-30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className={`p-4 rounded-ios-xl backdrop-blur-xl ${
              isCollapse
                ? 'bg-purple-900/90 border border-purple-500/30'
                : 'glass-modal'
            }`}>
              {/* 角色信息头 */}
              <div className="flex items-start gap-3 mb-3">
                <span className="text-4xl">{activeChar.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold ${isCollapse ? 'text-purple-100' : 'text-gray-800'}`}>
                      {activeChar.fullName}
                    </h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isCollapse ? 'bg-purple-700/50 text-purple-200' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {activeChar.title}
                    </span>
                  </div>
                  {/* 关系指标 */}
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-pink-400">
                      💗 {activeChar.heartLevel}/10
                    </span>
                    <span className="text-xs text-purple-400">
                      ✨ {activeChar.awakening}/100
                    </span>
                    <span className="text-xs text-gray-400">
                      📜 命运 {activeChar.destiny}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 对话内容 */}
              {dialogueStep === 'choose' ? (
                <>
                  <p className={`text-sm mb-3 ${isCollapse ? 'text-purple-200' : 'text-gray-500'}`}>
                    选择对话方式：
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* 剧本选项 */}
                    <button
                      onClick={() => handleSelectOption('script')}
                      className={`py-3 px-2 rounded-ios-lg text-center transition-all ${DIALOGUE_OPTION_STYLES.script.color} hover:scale-105 active:scale-95`}
                    >
                      <span className="text-lg">{DIALOGUE_OPTION_STYLES.script.icon}</span>
                      <p className="text-xs mt-1">{DIALOGUE_OPTION_STYLES.script.label}</p>
                    </button>
                    {/* 真心选项 */}
                    <button
                      onClick={() => handleSelectOption('heart')}
                      className={`py-3 px-2 rounded-ios-lg text-center transition-all ${DIALOGUE_OPTION_STYLES.heart.color} hover:scale-105 active:scale-95`}
                    >
                      <span className="text-lg">{DIALOGUE_OPTION_STYLES.heart.icon}</span>
                      <p className="text-xs mt-1">{DIALOGUE_OPTION_STYLES.heart.label}</p>
                    </button>
                    {/* 隐藏选项（仅当有隐藏对话时可用） */}
                    <button
                      onClick={() => handleSelectOption('hidden')}
                      disabled={!availableDialogues.some(d => d.type === 'hidden')}
                      className={`py-3 px-2 rounded-ios-lg text-center transition-all ${
                        availableDialogues.some(d => d.type === 'hidden')
                          ? `${DIALOGUE_OPTION_STYLES.hidden.color} hover:scale-105 active:scale-95`
                          : 'bg-gray-300/50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span className="text-lg">{DIALOGUE_OPTION_STYLES.hidden.icon}</span>
                      <p className="text-xs mt-1">{DIALOGUE_OPTION_STYLES.hidden.label}</p>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* 对话结果 */}
                  <div className={`p-3 rounded-ios-lg mb-3 ${
                    selectedDialogueType === 'hidden'
                      ? 'bg-purple-500/20 border border-purple-400/30'
                      : selectedDialogueType === 'heart'
                        ? 'bg-pink-500/20 border border-pink-400/30'
                        : 'bg-gray-500/10 border border-gray-400/20'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs">{DIALOGUE_OPTION_STYLES[selectedDialogueType || 'script'].icon}</span>
                      <span className={`text-xs font-medium ${
                        selectedDialogueType === 'hidden' ? 'text-purple-300' :
                        selectedDialogueType === 'heart' ? 'text-pink-300' : 'text-gray-400'
                      }`}>
                        {DIALOGUE_OPTION_STYLES[selectedDialogueType || 'script'].label}选项
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${isCollapse ? 'text-purple-100' : 'text-gray-700'}`}>
                      {currentDialogue?.text || '...'}
                    </p>
                  </div>

                  {/* 效果展示 */}
                  {(currentDialogue?.heartGain || currentDialogue?.awakeningGain) && (
                    <div className="flex gap-2 mb-3 text-xs">
                      {currentDialogue.heartGain && currentDialogue.heartGain > 0 && (
                        <span className="bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full">
                          💗 +{currentDialogue.heartGain}
                        </span>
                      )}
                      {currentDialogue.awakeningGain && currentDialogue.awakeningGain > 0 && (
                        <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                          ✨ +{currentDialogue.awakeningGain}
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleCloseDialogue}
                    className={`w-full py-2 rounded-ios-lg font-medium transition-all ${
                      isCollapse
                        ? 'bg-purple-600 text-white hover:bg-purple-500'
                        : 'bg-brand-500 text-white hover:bg-brand-600'
                    }`}
                  >
                    继续
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
