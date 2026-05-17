// ═══════════════════════════════════════════════════════════════════════════
// LoveSupremacy Universe - Main Game Container
// Dual-world layout wrapper with transition animations
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { useWorldStore } from '../../stores/worldStore';

export default function GameContainer() {
  const isAwakened = useWorldStore((s) => s.isAwakened);
  const isTransitioning = useWorldStore((s) => s.isTransitioning);
  const toggleWorld = useWorldStore((s) => s.toggleWorld);
  const awakeningLevel = useWorldStore((s) => s.awakeningLevel);

  const containerRef = useRef<HTMLDivElement>(null);
  const prevAwakenedRef = useRef(isAwakened);

  // Handle transition animation class
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wasAwakened = prevAwakenedRef.current;
    prevAwakenedRef.current = isAwakened;

    // Only animate when the world actually changes
    if (wasAwakened !== isAwakened) {
      // Remove any existing transition classes
      container.classList.remove('transition-tear', 'transition-develop');

      // Force reflow to restart animation
      void container.offsetWidth;

      if (isAwakened) {
        // Scripted -> Void: screen tear
        container.classList.add('transition-tear');
      } else {
        // Void -> Scripted: photo develop
        container.classList.add('transition-develop');
      }

      // Clean up transition class after animation completes
      const timer = requestAnimationFrame(() => {
        setTimeout(() => {
          container.classList.remove('transition-tear', 'transition-develop');
        }, 800);
      });

      return () => cancelAnimationFrame(timer);
    }
  }, [isAwakened]);

  const handleToggle = useCallback(() => {
    if (!isTransitioning) {
      toggleWorld();
    }
  }, [isTransitioning, toggleWorld]);

  const worldClass = isAwakened ? 'void-world' : 'scripted-world';

  return (
    <div
      ref={containerRef}
      className={`world-container ${worldClass} min-h-screen relative`}
    >
      {/* Awakening level bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div
          className="awakening-bar"
          style={{ width: `${awakeningLevel}%` }}
        />
      </div>

      {/* Awaken / Sleep toggle button */}
      <button
        className="world-toggle-btn"
        onClick={handleToggle}
        disabled={isTransitioning}
        aria-label={isAwakened ? 'Return to Scripted World' : 'Awaken to Void World'}
        title={isAwakened ? 'Sleep (return to Scripted)' : 'Awaken (enter Void)'}
      >
        {isAwakened ? (
          // Moon icon for "sleep" - return to scripted
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          // Eye icon for "awaken" - enter void
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>

      {/* Page content */}
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
