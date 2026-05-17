// ═══════════════════════════════════════════════════════════════════════════
// 首页 - 简洁欢迎页
// ═══════════════════════════════════════════════════════════════════════════
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="px-4 pb-24 pt-4">
      {/* 顶部欢迎语 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-800 mb-1">恋爱至上主义区域</h1>
        <p className="text-gray-500">欢迎回来</p>
      </motion.div>

      {/* 快捷入口 */}
      <div className="space-y-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/chat')}
          className="w-full p-4 glass-card rounded-ios-xl flex items-center gap-4"
        >
          <span className="text-3xl">💬</span>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-gray-800">开始聊天</h3>
            <p className="text-sm text-gray-500">探索内心世界</p>
          </div>
          <span className="text-gray-400">→</span>
        </motion.button>
      </div>
    </div>
  );
}
