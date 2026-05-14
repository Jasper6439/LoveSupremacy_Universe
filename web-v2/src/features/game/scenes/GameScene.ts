// ═══════════════════════════════════════════════════════════════════════════
// Phaser 3 - GameScene v1.6.0
// 农场主游戏场景 - 支持双区作物视觉差异化
// ═══════════════════════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { useGameStore, CROP_CONFIG, getCropStageEmoji, type CropType, type WorldZone } from '../../../stores/gameStore';

// 游戏配置常量
const GRID_SIZE = 6;
const GAP = 6;

interface CropData {
  id: string;
  type: CropType;
  plantedAt: number;
  growthStage: 0 | 1 | 2 | 3;
  waterLevel: number;
}

interface PlotInfo {
  bg: Phaser.GameObjects.Rectangle;
  gridX: number;
  gridY: number;
  cropText?: Phaser.GameObjects.Text;
  cropType?: CropType;
}

export class GameScene extends Phaser.Scene {
  private plots: PlotInfo[] = [];
  private selectedTool: 'plant' | 'water' | 'harvest' = 'plant';
  private selectedSeed: CropType = 'tomato';
  private tileSize = 64;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private unsubscribe!: () => void;
  private unsubscribeZone!: () => void;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // 动态计算 tile 尺寸
    const maxGridWidth = width * 0.9;
    const maxGridHeight = height * 0.85;
    this.tileSize = Math.max(
      Math.floor(Math.min(maxGridWidth / GRID_SIZE, maxGridHeight / GRID_SIZE) - GAP),
      24
    );

    // 计算网格居中偏移
    const gridWidth = GRID_SIZE * (this.tileSize + GAP) - GAP;
    const gridHeight = GRID_SIZE * (this.tileSize + GAP) - GAP;
    this.gridOffsetX = (width - gridWidth) / 2;
    this.gridOffsetY = (height - gridHeight) / 2;

    console.log('[GameScene] create:', { width, height, tileSize: this.tileSize });

    // 绘制背景（根据世界区）
    this.updateBackground();

    // 创建地块
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.createPlot(x, y);
      }
    }

    console.log('[GameScene] plots created:', this.plots.length);

    // 同步 Zustand 状态
    this.syncWithStore();

    // 监听作物状态变化
    this.unsubscribe = useGameStore.subscribe((state) => {
      this.updateCropsFromState(state.crops, state.worldZone);
    });

    // 监听世界区变化 - 使用全量 subscribe
    let lastZone = useGameStore.getState().worldZone;
    this.unsubscribeZone = useGameStore.subscribe((state) => {
      if (state.worldZone === lastZone) return;
      lastZone = state.worldZone;
      this.updateBackground();
      this.refreshAllCropVisuals(state.worldZone);
    });

    // 定时更新作物生长
    this.time.addEvent({
      delay: 1000,
      callback: () => {
        useGameStore.getState().tick();
      },
      loop: true,
    });

    // 处理窗口大小变化
    this.scale.on('resize', this.handleResize, this);
  }

  private updateBackground(): void {
    const zone = useGameStore.getState().worldZone;
    if (zone === 'collapse') {
      this.cameras.main.setBackgroundColor('#1E1B4B');
    } else {
      this.cameras.main.setBackgroundColor('#B8E0D2');
    }
  }

  private createPlot(gridX: number, gridY: number): void {
    const ts = this.tileSize;
    const px = this.gridOffsetX + gridX * (ts + GAP);
    const py = this.gridOffsetY + gridY * (ts + GAP);
    const zone = useGameStore.getState().worldZone;

    // 地块背景
    const bgColor = zone === 'collapse' ? 0x312E81 : 0xDDB892;
    const borderColor = zone === 'collapse' ? 0x6366F1 : 0xC9A67A;
    const bg = this.add.rectangle(px + ts / 2, py + ts / 2, ts, ts, bgColor);
    bg.setStrokeStyle(2, borderColor);
    bg.setInteractive({ useHandCursor: true });

    // 点击事件
    bg.on('pointerdown', () => {
      this.handlePlotClick(gridX, gridY);
    });

    // 悬停效果
    bg.on('pointerover', () => {
      bg.setFillStyle(zone === 'collapse' ? 0x4338CA : 0xE8D4B8);
    });
    bg.on('pointerout', () => {
      const plot = this.plots.find(p => p.gridX === gridX && p.gridY === gridY);
      bg.setFillStyle(plot?.cropText ? (zone === 'collapse' ? 0x4338CA : 0xC9A67A) : (zone === 'collapse' ? 0x312E81 : 0xDDB892));
    });

    this.plots.push({ bg, gridX, gridY });
  }

  private handlePlotClick(gridX: number, gridY: number): void {
    const store = useGameStore.getState();
    const plot = this.plots.find(p => p.gridX === gridX && p.gridY === gridY);
    if (!plot) return;

    switch (this.selectedTool) {
      case 'plant':
        if (store.plantCrop(gridX, gridY, this.selectedSeed)) {
          this.createCropSprite(plot, this.selectedSeed);
          this.showFloatingText(plot.bg.x, plot.bg.y - 30, '🌱', '#95D5B2');
        }
        break;

      case 'water':
        if (store.waterCrop(gridX, gridY)) {
          this.showFloatingText(plot.bg.x, plot.bg.y - 30, '💧', '#87CEEB');
        }
        break;

      case 'harvest':
        const harvested = store.harvestCrop(gridX, gridY);
        if (harvested) {
          this.removeCropSprite(plot);
          this.showFloatingText(plot.bg.x, plot.bg.y - 50, `+💰${harvested.money}`, '#C68E17');
        }
        break;
    }
  }

  private createCropSprite(plot: PlotInfo, type: CropType): void {
    const config = CROP_CONFIG[type];
    const zone = useGameStore.getState().worldZone;

    if (plot.cropText) {
      plot.cropText.destroy();
    }

    const emoji = zone === 'collapse' ? config.collapseEmoji : config.emoji;
    const cropText = this.add.text(plot.bg.x, plot.bg.y - 5, emoji, {
      fontSize: `${Math.floor(this.tileSize * 0.5)}px`,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: cropText,
      scale: { from: 0, to: 1 },
      duration: 400,
      ease: 'Back.out',
    });

    plot.cropText = cropText;
    plot.cropType = type;
    const bgColor = zone === 'collapse' ? 0x4338CA : 0xC9A67A;
    plot.bg.setFillStyle(bgColor);
  }

  private removeCropSprite(plot: PlotInfo): void {
    if (plot.cropText) {
      this.tweens.add({
        targets: plot.cropText,
        scale: 1.5,
        alpha: 0,
        y: plot.cropText.y - 30,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          plot.cropText?.destroy();
          plot.cropText = undefined;
          plot.cropType = undefined;
        },
      });
    }
    const zone = useGameStore.getState().worldZone;
    plot.bg.setFillStyle(zone === 'collapse' ? 0x312E81 : 0xDDB892);
  }

  private updateCropsFromState(crops: Record<string, CropData>, zone?: WorldZone): void {
    const currentZone = zone ?? useGameStore.getState().worldZone;

    for (const [key, cropData] of Object.entries(crops)) {
      const [gx, gy] = key.split(',').map(Number);
      const plot = this.plots.find(p => p.gridX === gx && p.gridY === gy);
      if (!plot) continue;

      if (plot.cropText && plot.cropType === cropData.type) {
        const newEmoji = getCropStageEmoji(cropData.type, cropData.growthStage, currentZone);
        if (plot.cropText.text !== newEmoji) {
          plot.cropText.setText(newEmoji);
          this.tweens.add({
            targets: plot.cropText,
            scale: { from: 0.5, to: 1 },
            duration: 300,
            ease: 'Back.out',
          });
        }
      } else if (!plot.cropText) {
        this.createCropSprite(plot, cropData.type);
      }
    }

    // 清理已收获的作物
    for (const plot of this.plots) {
      const key = `${plot.gridX},${plot.gridY}`;
      if (!crops[key] && plot.cropText) {
        this.removeCropSprite(plot);
      }
    }
  }

  // 世界区切换时刷新所有作物视觉
  private refreshAllCropVisuals(zone: WorldZone): void {
    const state = useGameStore.getState();

    // 更新所有地块背景色
    for (const plot of this.plots) {
      const key = `${plot.gridX},${plot.gridY}`;
      const hasCrop = !!state.crops[key];
      const bgColor = hasCrop
        ? (zone === 'collapse' ? 0x4338CA : 0xC9A67A)
        : (zone === 'collapse' ? 0x312E81 : 0xDDB892);
      plot.bg.setFillStyle(bgColor);
      plot.bg.setStrokeStyle(2, zone === 'collapse' ? 0x6366F1 : 0xC9A67A);
    }

    // 更新所有作物 emoji
    this.updateCropsFromState(state.crops, zone);
  }

  private syncWithStore(): void {
    const state = useGameStore.getState();
    this.updateCropsFromState(state.crops, state.worldZone);
  }

  // 浮动文字
  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const ft = this.add.text(x, y, text, {
      fontSize: '24px',
      color: color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: ft,
      y: ft.y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => ft.destroy(),
    });
  }

  // 工具选择
  public setTool(tool: 'plant' | 'water' | 'harvest'): void {
    this.selectedTool = tool;
  }

  public setSeed(seed: CropType): void {
    this.selectedSeed = seed;
  }

  // 窗口大小变化处理
  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    const maxGridWidth = width * 0.9;
    const maxGridHeight = height * 0.85;
    this.tileSize = Math.max(
      Math.floor(Math.min(maxGridWidth / GRID_SIZE, maxGridHeight / GRID_SIZE) - GAP),
      24
    );

    const gridWidth = GRID_SIZE * (this.tileSize + GAP) - GAP;
    const gridHeight = GRID_SIZE * (this.tileSize + GAP) - GAP;
    this.gridOffsetX = (width - gridWidth) / 2;
    this.gridOffsetY = (height - gridHeight) / 2;

    for (const plot of this.plots) {
      const ts = this.tileSize;
      const px = this.gridOffsetX + plot.gridX * (ts + GAP);
      const py = this.gridOffsetY + plot.gridY * (ts + GAP);
      plot.bg.setPosition(px + ts / 2, py + ts / 2);
      plot.bg.setSize(ts, ts);
      if (plot.cropText) {
        plot.cropText.setPosition(px + ts / 2, py + ts / 2 - 5);
        plot.cropText.setFontSize(`${Math.floor(ts * 0.5)}px`);
      }
    }
  }

  shutdown(): void {
    if (this.unsubscribe) this.unsubscribe();
    if (this.unsubscribeZone) this.unsubscribeZone();
    this.scale.off('resize', this.handleResize, this);
  }
}
