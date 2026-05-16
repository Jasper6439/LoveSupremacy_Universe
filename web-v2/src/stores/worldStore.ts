// ═══════════════════════════════════════════════════════════════════════════
// 恋爱至上主义区域 v1.9.5 - 双域色彩反转 · 电影级视觉特效
// 剧本区（彩色/过度曝光）↔ 空白区（黑白/纸张质感）
// ═══════════════════════════════════════════════════════════════════════════
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── 类型定义 ─────────────────────────────────────────────────────────────
export type WorldState = 'SCRIPTED' | 'VOID';

export interface WorldStoreState {
  // 世界状态
  currentWorld: WorldState;
  awakeningLevel: number; // 0-100
  isTransitioning: boolean;

  // 操作
  shiftWorld: (target: WorldState) => void;
  setAwakeningLevel: (level: number) => void;
  boostAwakening: (amount: number) => void;

  // 内部引用（不持久化）
  _rafId: number | null;
  _glitchTimer: ReturnType<typeof setTimeout> | null;
  _lensFlareTimer: ReturnType<typeof setInterval> | null;
}

// ─── CSS 变量更新器（requestAnimationFrame 驱动） ────────────────────────
let pendingLevel: number | null = null;
let rafScheduled = false;

function scheduleCSSUpdate(level: number) {
  pendingLevel = level;
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(applyCSSUpdate);
  }
}

function applyCSSUpdate() {
  rafScheduled = false;
  if (pendingLevel === null) return;

  const level = pendingLevel;
  pendingLevel = null;
  const root = document.documentElement;

  // ── 剧本区滤镜参数 ──
  const grayscale = Math.min(level * 0.8, 80);   // 0 → 80%
  const sepia = Math.min(level * 0.5, 50);        // 0 → 50%
  const brightness = 1.1 - level * 0.002;         // 1.1 → 1.0
  const saturate = 1.2 - level * 0.004;           // 1.2 → 0.8
  const contrast = 0.9 + level * 0.001;           // 0.9 → 1.0

  root.style.setProperty('--script-grayscale', `${grayscale}%`);
  root.style.setProperty('--script-sepia', `${sepia}%`);
  root.style.setProperty('--script-brightness', `${brightness}`);
  root.style.setProperty('--script-saturate', `${saturate}`);
  root.style.setProperty('--script-contrast', `${contrast}`);

  // ── 空白区滤镜参数 ──
  const voidGrayscale = Math.max(0, 100 - level * 1.2); // 100% → 0%
  const voidColorOpacity = Math.min(1, level / 80);      // 0 → 1
  root.style.setProperty('--void-grayscale', `${voidGrayscale}%`);
  root.style.setProperty('--void-color-opacity', `${voidColorOpacity}`);

  // ── 觉醒度全局变量 ──
  root.style.setProperty('--awakening-level', `${level}`);
}

// ─── 镜头光晕漂移（随机更新 CSS 变量） ──────────────────────────────────
function startLensFlareDrift() {
  const root = document.documentElement;
  function drift() {
    const x = 30 + Math.random() * 40; // 30% ~ 70%
    const y = 15 + Math.random() * 50; // 15% ~ 65%
    root.style.setProperty('--lens-flare-x', `${x}%`);
    root.style.setProperty('--lens-flare-y', `${y}%`);
  }
  drift(); // 立即执行一次
  return setInterval(drift, 4000 + Math.random() * 3000); // 4~7秒随机间隔
}

// ─── RGB Split 故障效果触发器 ────────────────────────────────────────────
function startGlitchMonitor(onGlitch: () => void, _onStop: () => void): ReturnType<typeof setTimeout> | null {
  function scheduleNext(): ReturnType<typeof setTimeout> | null {
    if (!onGlitch) return null;
    // 随机间隔 3~12 秒
    const delay = 3000 + Math.random() * 9000;
    return setTimeout(() => {
      onGlitch();
      // 递归调度下一次
      scheduleNext();
    }, delay);
  }
  return scheduleNext();
}

// ─── Store ────────────────────────────────────────────────────────────────
export const useWorldStore = create<WorldStoreState>()(
  persist(
    (set, get) => ({
      currentWorld: 'SCRIPTED',
      awakeningLevel: 0,
      isTransitioning: false,
      _rafId: null,
      _glitchTimer: null,
      _lensFlareTimer: null,

      shiftWorld: (target) => {
        const { currentWorld, isTransitioning } = get();
        if (currentWorld === target || isTransitioning) return;

        const root = document.documentElement;
        set({ isTransitioning: true });

        // ── 添加转场 CSS 类 ──
        const transitionClass =
          target === 'VOID'
            ? 'transition-script-to-void'
            : 'transition-void-to-script';

        root.classList.add(transitionClass);

        // ── 800ms 后完成切换 ──
        setTimeout(() => {
          root.classList.remove(transitionClass);
          set({ currentWorld: target, isTransitioning: false });
        }, 800);
      },

      setAwakeningLevel: (level) => {
        const clamped = Math.max(0, Math.min(100, level));
        set({ awakeningLevel: clamped });

        // 通过 RAF 更新 CSS 变量（性能优化：防抖节流）
        scheduleCSSUpdate(clamped);

        // ── 觉醒度 > 80：启动故障监控 ──
        const { _glitchTimer } = get();
        if (clamped > 80 && !_glitchTimer) {
          const triggerGlitch = () => {
            if (get().currentWorld !== 'SCRIPTED') return;
            if (get().awakeningLevel <= 80) return;

            const root = document.documentElement;
            // 随机选择故障类型
            const glitchType = Math.random() > 0.5
              ? 'glitch-rgb-split'
              : 'glitch-offset';

            root.classList.add(glitchType);

            // 100ms 后移除
            setTimeout(() => {
              root.classList.remove(glitchType);
            }, 150);
          };

          const timerId = startGlitchMonitor(triggerGlitch, () => {});
          set({ _glitchTimer: timerId });
        } else if (clamped <= 80 && _glitchTimer) {
          clearTimeout(_glitchTimer);
          set({ _glitchTimer: null });
        }
      },

      boostAwakening: (amount) => {
        const current = get().awakeningLevel;
        get().setAwakeningLevel(Math.max(0, Math.min(100, current + amount)));
      },
    }),
    {
      name: 'lovesupremacy-world-storage',
      partialize: (state) => ({
        currentWorld: state.currentWorld,
        awakeningLevel: state.awakeningLevel,
      }),
      // ── 持久化恢复后：重新应用 CSS 变量 + 启动光晕漂移 ──
      onRehydrateStorage: () => {
        // 返回的函数在 rehydrate 完成后调用
        return (_state) => {
          // 等待 DOM 就绪后应用样式
          requestAnimationFrame(() => {
            applyCSSUpdate();

            // 启动镜头光晕漂移
            const currentState = useWorldStore.getState();
            if (!currentState._lensFlareTimer) {
              useWorldStore.setState({
                _lensFlareTimer: startLensFlareDrift(),
              });
            }

            // 如果觉醒度 > 80，重启故障监控
            if (currentState.awakeningLevel > 80 && !currentState._glitchTimer) {
              const triggerGlitch = () => {
                const s = useWorldStore.getState();
                if (s.currentWorld !== 'SCRIPTED') return;
                if (s.awakeningLevel <= 80) return;

                const root = document.documentElement;
                const glitchType = Math.random() > 0.5
                  ? 'glitch-rgb-split'
                  : 'glitch-offset';

                root.classList.add(glitchType);
                setTimeout(() => {
                  root.classList.remove(glitchType);
                }, 150);
              };

              useWorldStore.setState({
                _glitchTimer: startGlitchMonitor(triggerGlitch, () => {}),
              });
            }
          });
        };
      },
    }
  )
);

// ─── React Hook：世界初始化（在 App 根组件中调用一次） ────────────────────
export function useWorldInit() {
  const { awakeningLevel, _lensFlareTimer } = useWorldStore();

  // 首次挂载时启动光晕漂移
  if (typeof window !== 'undefined') {
    if (!_lensFlareTimer) {
      useWorldStore.setState({
        _lensFlareTimer: startLensFlareDrift(),
      });
    }

    // 初始化 CSS 变量
    scheduleCSSUpdate(awakeningLevel);
  }
}
