// ═══════════════════════════════════════════════════════════════════════════
// 布局组件库
// ═══════════════════════════════════════════════════════════════════════════
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useLocation, Link } from 'react-router-dom';

interface SafeAreaProps {
  children: ReactNode;
  className?: string;
  top?: boolean;
  bottom?: boolean;
}

export function SafeArea({ children, className = '', top = true, bottom = true }: SafeAreaProps) {
  return (
    <div className={`${top ? 'pt-[env(safe-area-inset-top)]' : ''} ${bottom ? 'pb-[env(safe-area-inset-bottom)]' : ''} ${className}`}>
      {children}
    </div>
  );
}

const tabs = [
  { path: '/', label: '首页', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { path: '/chat', label: '聊天', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> },
  { path: '/settings', label: '设置', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
];

export function TabBar() {
  const location = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30">
      <div className="glass-tabbar">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link key={tab.path} to={tab.path} className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors duration-200 ${isActive ? 'text-brand-500' : 'text-gray-400'}`}>
                <motion.div whileTap={{ scale: 0.9 }} className="flex flex-col items-center">
                  <div className="mb-0.5">{tab.icon}</div>
                  <span className="text-xs font-medium">{tab.label}</span>
                </motion.div>
                {isActive && <motion.div layoutId="tab-indicator" className="absolute bottom-1 w-8 h-1 bg-brand-500 rounded-full" transition={{ type: 'spring', damping: 25, stiffness: 300 }} />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return <div className={`min-h-screen bg-gradient-morandi safe-area-all ${className}`}>{children}</div>;
}

interface PageTransitionProps {
  children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}>
      {children}
    </motion.div>
  );
}

interface NavBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

export function NavBar({ title, showBack = false, onBack, right }: NavBarProps) {
  return (
    <div className="sticky top-0 z-20">
      <div className="glass-nav safe-area-top">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="w-10">{showBack && <button onClick={onBack} className="flex items-center text-brand-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>}</div>
          <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
          <div className="w-10 flex justify-end">{right}</div>
        </div>
      </div>
    </div>
  );
}
