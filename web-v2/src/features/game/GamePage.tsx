// ═══════════════════════════════════════════════════════════════════════════
// 农场游戏页面 v1.6.0 - 漫画世界觉醒 RPG
// 漫游模式（玩家视角）+ 管理模式（上帝视角）+ 剧本区/崩坏区切换
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassModal } from '../../components/ui/GlassComponents';
import { useGameStore } from '../../stores/gameStore';
import { CROP_CONFIG, COLLAPSE_EVENTS } from '../../stores/constants';
import { usePhaser } from './hooks/usePhaser';
import RoamMode from './RoamMode';
import type { CropType } from '../../stores/types';

export default function GamePage() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { } = usePhaser({  // TODO: 2.5D 版本 setTool/setSeed 待实现
    width: 400,
    height: 500,
    parent: gameContainerRef,
  });

  const {
    gameMode,
    setGameMode,
    worldZone,
    setWorldZone,
    money,
    inventory,
    collapseEnergy,
    characters,
    tick,
    triggerCollapse,
  } = useGameStore();

  const [selectedTool, setSelectedToolState] = useState<'plant' | 'water' | 'harvest'>('plant');
  const [selectedSeed, setSelectedSeedState] = useState<CropType>('tomato');
  const [showShop, setShowShop] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showCollapsePanel, setShowCollapsePanel] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [collapseResult, setCollapseResult] = useState<{ success: boolean; message: string } | null>(null);

  // 定时更新作物生长
  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  // TODO: 2.5D 版本 - 工具和种子同步暂时禁用
  // // 同步工具选择到 Phaser
  // useEffect(() => {
  //   setTool(selectedTool);
  // }, [selectedTool, setTool]);

  // // 同步种子选择到 Phaser
  // useEffect(() => {
  //   setSeed(selectedSeed);
  // }, [selectedSeed, setSeed]);

  // 显示通知
  const showNotif = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 1500);
  }, []);

  // 种子列表
  const seeds = inventory.filter(item => item.type === 'seed');
  const crops_ = inventory.filter(item => item.type === 'crop');

  // 触发崩坏事件
  const handleTriggerCollapse = (eventType?: string) => {
    const result = triggerCollapse(eventType);
    setCollapseResult(result);
    showNotif(result.message);
    setTimeout(() => setCollapseResult(null), 2000);
  };

  const isCollapse = worldZone === 'collapse';

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* 顶部栏 - 模式切换 + 状态 */}
      <div className="flex-shrink-0 glass-nav safe-area-top px-4 py-2 flex items-center justify-between z-20">
        {/* 左侧：模式切换 */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setGameMode(gameMode === 'manage' ? 'roam' : 'manage')}
            className={`px-3 py-2 rounded-ios-lg font-medium text-sm transition-all ${
              gameMode === 'roam'
                ? 'bg-brand-500 text-white'
                : 'bg-white/60 text-gray-700'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {gameMode === 'roam' ? '🌍 漫游' : '📊 管理'}
          </motion.button>

          {/* 剧本区/崩坏区切换 */}
          <motion.button
            onClick={() => setWorldZone(isCollapse ? 'script' : 'collapse')}
            className={`px-3 py-2 rounded-ios-lg font-medium text-sm transition-all ${
              isCollapse
                ? 'bg-purple-600 text-white animate-pulse'
                : 'bg-white/60 text-gray-700'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {isCollapse ? '🌀 崩坏区' : '📖 剧本区'}
          </motion.button>
        </div>

        {/* 右侧：状态显示 */}
        <div className="flex items-center gap-2">
          <GlassCard className="px-3 py-1.5 flex items-center gap-2">
            <span className="text-lg">💰</span>
            <span className="font-bold text-gray-800">{money}</span>
          </GlassCard>

          {/* 崩坏能量 */}
          <motion.button
            onClick={() => setShowCollapsePanel(true)}
            className={`px-3 py-1.5 rounded-ios-lg flex items-center gap-1.5 transition-all ${
              isCollapse
                ? 'bg-purple-500/20 border border-purple-400/30'
                : 'bg-indigo-50 border border-indigo-200'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-sm">⚡</span>
            <span className={`font-bold text-sm ${isCollapse ? 'text-purple-300' : 'text-indigo-700'}`}>
              {collapseEnergy}
            </span>
          </motion.button>
        </div>
      </div>

      {/* 主内容区 - 根据模式切换 */}
      <div className="flex-1 min-h-0 relative">
        {gameMode === 'roam' ? (
          <motion.div
            key="roam"
            className="absolute inset-0"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RoamMode />
          </motion.div>
        ) : (
          <motion.div
            key="manage"
            className="absolute inset-0"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div ref={gameContainerRef} className="absolute inset-0 w-full h-full" />
          </motion.div>
        )}
      </div>

      {/* 底部工具栏 - 仅管理模式显示 */}
      <AnimatePresence>
        {gameMode === 'manage' && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="flex-shrink-0 glass-nav safe-area-bottom px-3 py-2 z-10"
          >
            {/* 工具按钮行 */}
            <div className="flex gap-1.5">
              {[
                { id: 'plant', icon: '🌱', label: '种植' },
                { id: 'water', icon: '💧', label: '浇水' },
                { id: 'harvest', icon: '🌾', label: '收获' },
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setSelectedToolState(tool.id as typeof selectedTool)}
                  className={`flex-1 py-2 rounded-ios-md text-center transition-all ${
                    selectedTool === tool.id
                      ? 'bg-brand-500 text-white shadow-lg'
                      : 'bg-white/60 text-gray-700 hover:bg-white/80'
                  }`}
                >
                  <span className="text-lg">{tool.icon}</span>
                  <p className="text-xs mt-0.5">{tool.label}</p>
                </button>
              ))}

              <button
                onClick={() => setShowShop(true)}
                className="flex-1 py-2 rounded-ios-md bg-white/60 text-gray-700 hover:bg-white/80 transition-all"
              >
                <span className="text-lg">🛒</span>
                <p className="text-xs mt-0.5">商店</p>
              </button>

              <button
                onClick={() => setShowInventory(true)}
                className="flex-1 py-2 rounded-ios-md bg-white/60 text-gray-700 hover:bg-white/80 transition-all"
              >
                <span className="text-lg">🎒</span>
                <p className="text-xs mt-0.5">背包</p>
              </button>
            </div>

            {/* 种子选择栏 */}
            <AnimatePresence>
              {selectedTool === 'plant' && seeds.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="flex gap-2 overflow-x-auto pt-2 pb-1 scroll-touch">
                    {seeds.map(item => {
                      const config = CROP_CONFIG[item.id as CropType];
                      return (
                        <button
                          key={item.id}
                          onClick={() => setSelectedSeedState(item.id as CropType)}
                          className={`flex-shrink-0 p-2 rounded-ios-md min-w-[70px] text-center transition-all ${
                            selectedSeed === item.id
                              ? 'bg-morandi-maillard-caramel text-white shadow-lg'
                              : 'bg-white/60 hover:bg-white/80'
                          }`}
                        >
                          <span className="text-xl">{config.emoji}</span>
                          <p className="text-xs mt-0.5 text-inherit">{config.name}</p>
                          <p className="text-xs opacity-70">×{item.quantity}</p>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {selectedTool === 'plant' && seeds.length === 0 && (
              <div className="pt-2 pb-1 text-center">
                <button onClick={() => setShowShop(true)} className="text-sm text-brand-500 hover:text-brand-600">
                  没有种子了，去商店购买 →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 通知 */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 glass-modal px-6 py-3 z-50"
          >
            <p className={`text-center font-medium ${
              collapseResult?.success === false ? 'text-red-600' :
              collapseResult?.success === true ? 'text-purple-600' : 'text-gray-800'
            }`}>
              {notification}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 商店弹窗 */}
      <GlassModal isOpen={showShop} onClose={() => setShowShop(false)} title="商店" position="bottom">
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-500 mb-4">购买种子，经营校园花坛！</p>
          <p className="text-xs text-gray-400 mb-2">当前金币: 💰 {money}</p>
          {(Object.keys(CROP_CONFIG) as CropType[]).map(type => {
            const config = CROP_CONFIG[type];
            return (
              <GlassCard key={type} className="p-4" hoverable onClick={() => {
                if (useGameStore.getState().buySeed(type, 1)) {
                  showNotif(`购买了 ${config.name} 种子！`);
                } else {
                  showNotif('金币不足');
                }
              }}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{config.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800">{config.name} 种子</h4>
                    <p className="text-sm text-gray-500">生长时间: {config.growthTime}秒</p>
                    {isCollapse && (
                      <p className="text-xs text-purple-500 mt-0.5">崩坏效果: {config.collapseEffect}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-morandi-maillard-caramel">💰 {config.seedPrice}</p>
                    <p className="text-xs text-gray-400">售价 {config.sellPrice}</p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </GlassModal>

      {/* 背包弹窗 */}
      <GlassModal isOpen={showInventory} onClose={() => setShowInventory(false)} title="背包" position="bottom">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {seeds.length === 0 && crops_.length === 0 && (
            <p className="text-center text-gray-500 py-8">背包是空的，快去商店买些种子吧！</p>
          )}
          {seeds.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">种子</h4>
              <div className="grid grid-cols-3 gap-2">
                {seeds.map(item => {
                  const config = CROP_CONFIG[item.id as CropType];
                  return (
                    <GlassCard key={item.id} className="p-3 text-center">
                      <span className="text-2xl">{config.emoji}</span>
                      <p className="text-xs text-gray-600">{config.name}</p>
                      <p className="text-sm font-bold text-gray-800">×{item.quantity}</p>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          )}
          {crops_.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                作物 <span className="text-xs text-gray-400">(点击出售)</span>
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {crops_.map(item => {
                  const config = CROP_CONFIG[item.id as CropType];
                  return (
                    <GlassCard key={item.id} className="p-3 text-center" hoverable onClick={() => {
                      if (useGameStore.getState().sellCrop(item.id as CropType, 1)) {
                        showNotif(`出售 ${config.name}，获得 💰${config.sellPrice}`);
                      }
                    }}>
                      <span className="text-2xl">{config.emoji}</span>
                      <p className="text-xs text-gray-600">{config.name}</p>
                      <p className="text-sm font-bold text-morandi-maillard-caramel">×{item.quantity}</p>
                      <p className="text-xs text-gray-400">💰{config.sellPrice}</p>
                    </GlassCard>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </GlassModal>

      {/* 崩坏能量面板 */}
      <GlassModal isOpen={showCollapsePanel} onClose={() => setShowCollapsePanel(false)} title="⚡ 崩坏能量" position="bottom">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 能量条 */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">当前能量</span>
              <span className="text-lg font-bold text-purple-600">⚡ {collapseEnergy}</span>
            </div>
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, collapseEnergy)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">需要 ≥10 能量才能触发崩坏事件</p>
          </div>

          {/* 角色觉醒概览 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">角色觉醒状态</h4>
            <div className="space-y-2">
              {characters.map(char => (
                <div key={char.id} className="flex items-center gap-3 p-2 rounded-ios-lg bg-gray-50">
                  <span className="text-2xl">{char.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{char.fullName}</span>
                      <span className="text-xs text-pink-400">💗{char.heartLevel}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full transition-all"
                        style={{ width: `${char.awakening}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-purple-500 font-medium">✨{char.awakening}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 崩坏事件列表 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">崩坏事件</h4>
            <div className="space-y-2">
              {COLLAPSE_EVENTS.map(event => (
                <GlassCard
                  key={event.id}
                  className="p-3"
                  hoverable
                  onClick={() => {
                    handleTriggerCollapse(event.type);
                    setShowCollapsePanel(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {event.type === 'time_accel' ? '⏰' :
                       event.type === 'space_fold' ? '🌀' :
                       event.type === 'memory_surge' ? '💭' : '💜'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{event.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        奖励: {event.reward} | 风险: {Math.round(event.risk * 100)}%
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}
