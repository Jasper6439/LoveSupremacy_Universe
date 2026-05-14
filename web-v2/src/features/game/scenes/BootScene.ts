// ═══════════════════════════════════════════════════════════════════════════
// Phaser 3 - BootScene
// 游戏启动场景，初始化配置
// ═══════════════════════════════════════════════════════════════════════════
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 加载必要的初始资源
    // 这里可以加载加载界面的素材
  }

  create(): void {
    // 初始化游戏配置
    this.scale.refresh();
    
    // 进入预加载场景
    this.scene.start('PreloadScene');
  }
}
