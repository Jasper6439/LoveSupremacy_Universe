import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Heart,
  Sparkles,
  MessageCircle,
  Sprout,
  ChevronRight,
  Moon,
  Sun,
  LogIn,
} from 'lucide-react'
import { useGameStore, useFarmStore } from '../stores'
import { useNavigate } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────────────────
// Widget 定义
// ─────────────────────────────────────────────────────────────────────────────

interface WidgetProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
}

function Widget({ children, className = '', style, onClick }: WidgetProps) {
  return (
    <motion.div
      className={`ios-widget-glass ${className}`}
      style={style}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 首页
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const worldMode = useGameStore((s) => s.worldMode)
  const awakeningLevel = useGameStore((s) => s.awakeningLevel)
  const toggleWorldMode = useGameStore((s) => s.toggleWorldMode)
  const farmPlots = useFarmStore((s) => s.plots)
  const navigate = useNavigate()

  const [isGuest] = useState(() => !localStorage.getItem('ls_token'))

  const matureCount = farmPlots.filter((p) => p.cropId && p.stage === 3).length
  const plantedCount = farmPlots.filter((p) => p.cropId !== null).length

  return (
    <div className="ios-page">
      {/* ── Large Title ──────────────────────────────────────────────── */}
      <div className="ios-safe-top" />
      <h1 className="ios-nav-large-title" style={{ color: 'var(--realm-text)' }}>
        恋爱至上主义
      </h1>
      <p style={{ padding: '0 16px', fontSize: 14, color: 'var(--ios-gray)', marginBottom: 12 }}>
        {isGuest ? '探索恋爱至上主义的世界' : '欢迎回来，继续你的故事'}
      </p>

      {/* ── Widget 网格 ──────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: '0 16px 16px',
        }}
      >
        {/* 觉醒状态 Widget */}
        <Widget style={{ gridColumn: '1 / -1' }}>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} style={{ color: worldMode === 'broken' ? 'var(--ios-gray)' : 'var(--realm-accent)' }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--realm-text)' }}>觉醒进度</span>
              </div>
              <span style={{ fontSize: 13, color: 'var(--ios-gray)' }}>
                {awakeningLevel} / 100
              </span>
            </div>
            <div
              className="awakening-bar"
              style={{ width: '100%', height: 6, marginBottom: 8 }}
            >
              <div
                className="awakening-fill"
                style={{ width: `${Math.min(100, (awakeningLevel / 100) * 100)}%` }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--ios-gray)' }}>
                {awakeningLevel >= 100 ? '✨ 觉醒圆满 — 双界穿梭已解锁' : '💫 探索故事以提升觉醒值'}
              </span>
              <span style={{
                padding: '4px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                background: worldMode === 'script'
                  ? 'color-mix(in srgb, var(--realm-accent) 15%, transparent)'
                  : 'color-mix(in srgb, var(--ios-gray) 12%, transparent)',
                color: worldMode === 'script' ? 'var(--realm-accent)' : 'var(--ios-gray)',
              }}>
                {worldMode === 'script' ? '剧本区' : '崩坏区'}
              </span>
            </div>
          </div>
        </Widget>

        {/* 最近聊天 Widget */}
        <Widget onClick={() => isGuest ? navigate('/login') : window.location.href = '/game'}>
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <MessageCircle size={16} style={{ color: 'var(--ios-blue)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--realm-text)' }}>剧本区</span>
            </div>
            <div
              className="ios-avatar"
              style={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, var(--realm-accent), var(--realm-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                marginBottom: 8,
              }}
            >
              ☁️
            </div>
            <p style={{ fontSize: 13, color: 'var(--ios-gray)', lineHeight: 1.4 }}>
              {isGuest ? '登录后与车如云相遇' : '车如云在等你'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
              {isGuest ? (
                <>
                  <LogIn size={12} style={{ color: 'var(--ios-blue)' }} />
                  <span style={{ fontSize: 12, color: 'var(--ios-blue)' }}>登录</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: 'var(--ios-blue)' }}>继续聊天</span>
                  <ChevronRight size={12} style={{ color: 'var(--ios-blue)' }} />
                </>
              )}
            </div>
          </div>
        </Widget>

        {/* 农场摘要 Widget */}
        <Widget onClick={() => window.location.href = '/farm'}>
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Sprout size={16} style={{ color: 'var(--ios-green)' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--realm-text)' }}>农场</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--realm-text)', marginBottom: 4 }}>
              {plantedCount}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ios-gray)' }}>
              {matureCount > 0
                ? `🌾 ${matureCount} 个地块已成熟待收获`
                : '🌱 耕作等待你的照料'}
            </p>
          </div>
        </Widget>

        {/* 双界之隙 — 切换世界按钮 */}
        <Widget style={{ gridColumn: '1 / -1' }}>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Heart size={16} style={{ color: 'var(--realm-accent)' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--realm-text)' }}>双界之隙</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { mode: 'script' as const, label: '剧本模式', desc: '唯美恋爱物语', icon: Sun, active: worldMode === 'script' },
                { mode: 'broken' as const, label: '崩坏模式', desc: '觉醒反抗之路', icon: Moon, active: worldMode === 'broken' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <motion.button
                    key={item.mode}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { if (!item.active) toggleWorldMode() }}
                    style={{
                      flex: 1,
                      padding: '16px 12px',
                      borderRadius: 12,
                      background: item.active
                        ? 'color-mix(in srgb, var(--realm-accent) 14%, var(--ios-bg))'
                        : 'var(--ios-bg-secondary)',
                      border: item.active ? '1px solid var(--realm-accent)' : '0.5px solid var(--ios-separator)',
                      cursor: item.active ? 'default' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      opacity: item.active ? 1 : 0.7,
                    }}
                  >
                    <Icon
                      size={28}
                      style={{ color: item.active ? 'var(--realm-accent)' : 'var(--ios-gray)' }}
                      fill={item.active ? 'var(--realm-accent)' : 'none'}
                      fillOpacity={0.15}
                    />
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--realm-text)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--ios-gray)' }}>{item.desc}</div>
                    {item.active && (
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 8,
                        background: 'color-mix(in srgb, var(--realm-accent) 20%, transparent)',
                        color: 'var(--realm-accent)', fontWeight: 600,
                      }}>当前</span>
                    )}
                  </motion.button>
                )
              })}
            </div>
          </div>
        </Widget>
      </div>
    </div>
  )
}