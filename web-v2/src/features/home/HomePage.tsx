// ═══════════════════════════════════════════════════════════════════════════
// 首页
// ═══════════════════════════════════════════════════════════════════════════
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GlassCard, HeartIcon, StatCard } from '../../components/ui/GlassComponents';
import { useGameStore } from '../../stores/gameStore';

export default function HomePage() {
  const navigate = useNavigate();
  const { money, characters, inventory } = useGameStore();

  return (
    <div className="px-4 pb-24 pt-4">
      {/* 顶部欢迎语 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-1">恋爱至上主义区域</h1>
        <p className="text-gray-500">欢迎回来，小农场主 🌻</p>
      </motion.div>

      {/* 角色卡片 */}
      <GlassCard className="p-5 mb-4" hoverable>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-3xl">
            🌸
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800 mb-1">小樱</h2>
            <p className="text-sm text-gray-500 mb-2">正在农场等待你...</p>
            <div className="flex items-center gap-2">
              <HeartIcon size={16} animated />
              <span className="text-sm font-medium text-morandi-maillard-caramel">{characters[0]?.heartLevel ?? 0} 亲密度</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 统计数据 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard 
          label="金币" 
          value={money} 
          accentColor="#E9C46A"
          icon={<span className="text-xl">💰</span>}
        />
        <StatCard 
          label="背包物品" 
          value={inventory.reduce((sum, item) => sum + item.quantity, 0)} 
          accentColor="#95D5B2"
          icon={<span className="text-xl">🎒</span>}
        />
      </div>

      {/* 快捷入口 */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">快捷入口</h3>
        
        <GlassCard className="p-4" hoverable onClick={() => navigate('/game')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-morandi-grass to-morandi-grassDark flex items-center justify-center text-2xl">
              🌾
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">进入农场</h4>
              <p className="text-sm text-gray-500">种植作物，收获满满</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </GlassCard>

        <GlassCard className="p-4" hoverable onClick={() => navigate('/chat')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-morandi-pink to-morandi-pinkDark flex items-center justify-center text-2xl">
              💬
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">与角色聊天</h4>
              <p className="text-sm text-gray-500">增进感情，解锁故事</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </GlassCard>

        <GlassCard className="p-4" hoverable>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-morandi-maillard-caramel to-morandi-maillard-honey flex items-center justify-center text-2xl">
              🍳
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">烹饪料理</h4>
              <p className="text-sm text-gray-500">用作物制作美味佳肴</p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">即将上线</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
