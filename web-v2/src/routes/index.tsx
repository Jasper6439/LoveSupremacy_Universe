// ═══════════════════════════════════════════════════════════════════════════
// 路由配置
// ═══════════════════════════════════════════════════════════════════════════
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { TabBar } from '../components/layout/Layout';
import { PageContainer, PageTransition } from '../components/layout/Layout';

// 页面组件
import HomePage from '../features/home/HomePage';
import GamePage from '../features/game/GamePage';
import ChatPage from '../features/chat/ChatPage';
import SettingsPage from '../features/settings/SettingsPage';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <PageContainer>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
            <Route path="/game" element={<PageTransition><GamePage /></PageTransition>} />
            <Route path="/chat" element={<PageTransition><ChatPage /></PageTransition>} />
            <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
          </Routes>
        </AnimatePresence>
        <TabBar />
      </PageContainer>
    </BrowserRouter>
  );
}
