// ═══════════════════════════════════════════════════════════════════════════
// usePhaser - React Hook for Phaser 3 Integration
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useCallback } from 'react';
import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { GameScene } from '../scenes/GameScene';

interface UsePhaserOptions {
  width?: number;
  height?: number;
  parent: React.RefObject<HTMLDivElement | null>;
}

export function usePhaser({ width = 400, height = 600, parent }: UsePhaserOptions) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

  useEffect(() => {
    if (!parent.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: parent.current,
      width: parent.current.clientWidth || 400,
      height: parent.current.clientHeight || 600,
      backgroundColor: '#87CEEB',
      scene: [BootScene, PreloadScene, GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      render: {
        pixelArt: false,
        antialias: true,
      },
    };

    gameRef.current = new Phaser.Game(config);

    // 获取 GameScene 引用
    const checkScene = setInterval(() => {
      const scene = gameRef.current?.scene.getScene('GameScene') as GameScene;
      if (scene) {
        sceneRef.current = scene;
        clearInterval(checkScene);
      }
    }, 100);

    return () => {
      clearInterval(checkScene);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, [width, height, parent]);

  const setTool = useCallback((tool: 'plant' | 'water' | 'harvest') => {
    sceneRef.current?.setTool(tool);
  }, []);

  const setSeed = useCallback((seed: 'tomato' | 'carrot' | 'corn' | 'wheat' | 'potato' | 'strawberry') => {
    sceneRef.current?.setSeed(seed);
  }, []);

  return {
    gameRef,
    sceneRef,
    setTool,
    setSeed,
  };
}
