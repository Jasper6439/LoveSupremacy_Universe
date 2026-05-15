// ═══════════════════════════════════════════════════════════════════════════
// Phaser 4 - PreloadScene
// 资源预加载场景
// ═══════════════════════════════════════════════════════════════════════════
import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // 创建加载进度条
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 进度条背景
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

    // 加载文字 - Phaser 4 语法
    const loadingText = this.add.text({
      x: width / 2,
      y: height / 2 - 50,
      text: '加载中...',
      style: {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }
    });
    loadingText.setOrigin(0.5);

    const percentText = this.add.text({
      x: width / 2,
      y: height / 2,
      text: '0%',
      style: {
        fontSize: '18px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }
    });
    percentText.setOrigin(0.5);

    const assetText = this.add.text({
      x: width / 2,
      y: height / 2 + 50,
      text: '',
      style: {
        fontSize: '14px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }
    });
    assetText.setOrigin(0.5);

    // 监听加载进度
    this.load.on('progress', (value: number) => {
      percentText.setText(`${Math.round(value * 100)}%`);
      progressBar.clear();
      progressBar.fillStyle(0xffffff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      assetText.setText(`加载: ${file.key}`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 加载游戏资源
    // ═══════════════════════════════════════════════════════════════════════

    // 地形纹理 - 使用程序化生成，不需要外部图片
    // 作物 emoji 直接使用 Unicode，不需要图片

    // 粒子纹理
    this.load.setBaseURL('');
  }

  create(): void {
    // 创建粒子纹理
    this.createParticleTexture();
    
    // 进入主游戏场景
    this.scene.start('GameScene');
  }

  private createParticleTexture(): void {
    // 创建星星粒子纹理
    const graphics = this.make.graphics({ x: 0, y: 0 });
    
    // 金色星星
    graphics.fillStyle(0xFFD700, 1);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('star', 16, 16);
    graphics.clear();

    // 心形粒子
    graphics.fillStyle(0xE07A5F, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.fillCircle(10, 6, 6);
    graphics.fillTriangle(3, 8, 13, 8, 8, 16);
    graphics.generateTexture('heart', 16, 16);
    graphics.clear();

    // 泥土飞溅
    graphics.fillStyle(0xDDB892, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('dirt', 8, 8);
    graphics.clear();

    // 水滴
    graphics.fillStyle(0x87CEEB, 0.8);
    graphics.fillCircle(6, 6, 5);
    graphics.generateTexture('water', 12, 12);
  }
}
