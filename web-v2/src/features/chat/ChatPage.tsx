// ═══════════════════════════════════════════════════════════════════════════
// 聊天页面 - 接入真实 AI 后端
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/gameStore';

// ─── 后端 API 地址 ───────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || '';

interface Message {
  id: string;
  type: 'sent' | 'received';
  content: string;
  time: string;
  selfie?: string; // AI 自拍图片 (base64)
}

// ─── API 调用 ─────────────────────────────────────────────────────────────
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function sendChatMessage(message: string): Promise<{ response: string; selfie?: string } | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) {
      console.warn('[Chat] API error:', res.status);
      return null;
    }

    const data = await res.json();
    if (data.error) {
      console.warn('[Chat] API error:', data.error);
      return null;
    }

    return {
      response: data.response || data.reply || '',
      selfie: data.selfie || undefined,
    };
  } catch (e) {
    console.warn('[Chat] Network error:', e);
    return null;
  }
}

async function loadChatHistory(limit = 30): Promise<Message[]> {
  const token = getAuthToken();
  if (!token) return [];

  try {
    const res = await fetch(`${API_BASE}/api/messages/history?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.messages || !Array.isArray(data.messages)) return [];

    return data.messages.map((msg: { role: string; content: string; timestamp?: string }, i: number) => ({
      id: `hist_${i}_${Date.now()}`,
      type: msg.role === 'user' ? 'sent' as const : 'received' as const,
      content: msg.content,
      time: msg.timestamp
        ? new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : '',
    }));
  } catch (e) {
    console.warn('[Chat] Failed to load history:', e);
    return [];
  }
}

// ─── 组件 ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { characters } = useGameStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const abortRef = useRef(false);

  // 检查登录状态 & 加载历史
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsLoggedIn(true);
      loadChatHistory(30).then(hist => {
        if (hist.length > 0) {
          setMessages(hist);
        } else {
          // 没有历史记录时显示欢迎消息
          setMessages([{
            id: 'welcome',
            type: 'received',
            content: '你好呀！我是小樱 🌸 有什么想跟我聊的吗？',
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          }]);
        }
        setIsLoadingHistory(false);
      });
    } else {
      setIsLoadingHistory(false);
      setMessages([{
        id: 'welcome',
        type: 'received',
        content: '你好呀！我是小樱 🌸\n\n请先在设置中登录账号，这样我才能记住你哦～',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputValue.trim()) return;

    const text = inputValue.trim();
    const sentMsg: Message = {
      id: `sent_${Date.now()}`,
      type: 'sent',
      content: text,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, sentMsg]);
    setInputValue('');

    if (!isLoggedIn) {
      // 未登录时使用本地 mock 回复
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: `mock_${Date.now()}`,
          type: 'received',
          content: '请先登录账号，这样我才能更好地和你聊天哦～ 💕',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }]);
      }, 1000);
      return;
    }

    // 已登录：调用真实 API
    setIsTyping(true);
    abortRef.current = false;

    try {
      const result = await sendChatMessage(text);

      if (abortRef.current) return;
      setIsTyping(false);

      if (result && result.response) {
        const replyMsg: Message = {
          id: `reply_${Date.now()}`,
          type: 'received',
          content: result.response,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
          selfie: result.selfie,
        };
        setMessages(prev => [...prev, replyMsg]);
        // 对话增加好感（使用第一个角色的心级）
      } else {
        // API 调用失败，使用 fallback
        setMessages(prev => [...prev, {
          id: `fallback_${Date.now()}`,
          type: 'received',
          content: '嗯...我好像有点走神了，能再说一遍吗？🤔',
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }]);
      }
    } catch {
      setIsTyping(false);
    }
  }, [inputValue, isLoggedIn]);

  return (
    <div className="flex flex-col h-screen">
      {/* 聊天头部 */}
      <div className="glass-nav safe-area-top px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-xl">
            🌸
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-800">小樱</h2>
            <p className="text-xs text-gray-500">
              {isLoadingHistory ? '加载中...' : isLoggedIn ? '在线' : '未登录'}
            </p>
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center gap-1 px-2 py-1 bg-morandi-maillard-love/10 rounded-full"
          >
            <span className="text-morandi-maillard-love">❤️</span>
            <span className="text-xs font-medium text-morandi-maillard-caramel">{characters[0]?.heartLevel ?? 0}</span>
          </motion.div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto scroll-touch px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] ${msg.type === 'sent' ? 'order-2' : 'order-1'}`}>
              <div className={msg.type === 'sent' ? 'bubble-sent' : 'bubble-received'}>
                <p className="px-4 py-2 whitespace-pre-wrap">{msg.content}</p>
              </div>
              {/* AI 自拍图片 */}
              {msg.selfie && (
                <div className="mt-2 rounded-ios-md overflow-hidden max-w-[200px]">
                  <img src={`data:image/jpeg;base64,${msg.selfie}`} alt="自拍" className="w-full" />
                </div>
              )}
              <p className={`text-xs text-gray-400 mt-1 ${msg.type === 'sent' ? 'text-right' : 'text-left'}`}>
                {msg.time}
              </p>
            </div>
          </motion.div>
        ))}

        {/* 正在输入 */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex justify-start"
            >
              <div className="bubble-received px-4 py-3">
                <div className="flex gap-1">
                  <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                  <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                  <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="glass-nav safe-area-bottom px-4 py-3">
        <div className="flex items-end gap-3">
          <button className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-xl">
            😊
          </button>
          <div className="flex-1">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isLoggedIn ? '输入消息...' : '请先登录账号'}
              rows={1}
              className="w-full px-4 py-3 bg-white/50 rounded-ios-lg border border-gray-200/50 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/50"
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-white disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
