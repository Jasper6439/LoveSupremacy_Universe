// ═══════════════════════════════════════════════════════════════════════════
// 玻璃拟态 UI 组件库
// iOS Design Language + Glassmorphism
// ═══════════════════════════════════════════════════════════════════════════
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  blur?: number;
  intensity?: 'light' | 'medium' | 'heavy';
}

export function GlassPanel({ children, className = '', blur = 12, intensity = 'medium' }: GlassPanelProps) {
  const bgOpacity = { light: 'bg-white/40', medium: 'bg-white/60', heavy: 'bg-white/80' }[intensity];
  const borderOpacity = { light: 'border-white/20', medium: 'border-white/30', heavy: 'border-white/50' }[intensity];

  return (
    <div className={`${bgOpacity} backdrop-blur-${blur} ${borderOpacity} rounded-ios-md border shadow-glass ${className}`} style={{ backdropFilter: `blur(${blur}px)` }}>
      {children}
    </div>
  );
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function GlassCard({ children, className = '', onClick, hoverable = false }: GlassCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`bg-white/50 backdrop-blur-md rounded-ios-md border border-white/20 shadow-card ${hoverable ? 'cursor-pointer hover:shadow-card-hover' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'maillard';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export function GlassButton({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }: GlassButtonProps) {
  const sizeClasses = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-base', lg: 'px-7 py-3.5 text-lg' };
  const variantClasses = {
    primary: 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-lg shadow-brand-500/25',
    secondary: 'bg-white/60 backdrop-blur-sm text-brand-500 border border-brand-200/50',
    maillard: 'bg-gradient-to-r from-morandi-maillard-caramel to-morandi-maillard-honey text-white shadow-lg shadow-morandi-maillard-caramel/25',
  };

  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={onClick} disabled={disabled} className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-ios-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${className}`}>
      {children}
    </motion.button>
  );
}

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  position?: 'center' | 'bottom';
}

export function GlassModal({ isOpen, onClose, title, children, position = 'center' }: GlassModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
          <motion.div
            initial={{ opacity: 0, y: position === 'bottom' ? '100%' : 0, scale: position === 'center' ? 0.9 : 1 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: position === 'bottom' ? '100%' : 0, scale: position === 'center' ? 0.9 : 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed z-50 ${position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-md' : 'bottom-0 left-0 right-0 rounded-t-ios-2xl'} bg-white/85 backdrop-blur-xl rounded-ios-xl border border-white/30 shadow-modal-heavy safe-area-bottom`}
          >
            {title && <div className="px-5 py-4 border-b border-gray-200/30"><h2 className="text-lg font-semibold text-gray-800">{title}</h2></div>}
            <div className="p-5 max-h-[70vh] overflow-y-auto scroll-touch">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface HeartIconProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function HeartIcon({ size = 24, animated = false, className = '' }: HeartIconProps) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 24 24" fill="#E07A5F" className={`${animated ? 'heart-beat' : ''} ${className}`} style={{ filter: 'drop-shadow(0 0 4px rgba(224, 122, 95, 0.4))' }}>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </motion.svg>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  accentColor?: string;
}

export function StatCard({ label, value, icon, accentColor = '#8A2BE2' }: StatCardProps) {
  return (
    <GlassCard className="p-4 flex items-center gap-3">
      {icon && <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}20` }}>{icon}</div>}
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </GlassCard>
  );
}
