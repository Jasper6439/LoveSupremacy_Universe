import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// 404 页 — iOS 风格
// ─────────────────────────────────────────────────────────────────────────────

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div
      className="ios-page"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
      }}
    >
      <div className="ios-safe-top" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          textAlign: 'center',
        }}
      >
        {/* 图标 */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ fontSize: 64, lineHeight: 1 }}
        >
          🤷
        </motion.div>

        {/* 标题 */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: 'var(--realm-text)',
            margin: 0,
          }}
        >
          页面不见啦
        </h1>

        {/* 描述 */}
        <p
          style={{
            fontSize: 14,
            color: 'var(--ios-gray)',
            lineHeight: 1.6,
            maxWidth: 260,
            margin: 0,
          }}
        >
          这个页面可能在另一个世界线……
          <br />
          回到首页重新开始探索吧
        </p>

        {/* 按钮 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => navigate('/')}
          className="ios-btn ios-btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 28px',
            borderRadius: 24,
            marginTop: 8,
          }}
        >
          <ArrowLeft size={16} />
          回到首页
        </motion.button>

        {/* 装饰性文字 */}
        <p
          style={{
            fontSize: 11,
            color: 'var(--ios-gray)',
            opacity: 0.5,
            marginTop: 24,
          }}
        >
          Error 404 — 双界迷途
        </p>
      </motion.div>
    </div>
  )
}