// ═══════════════════════════════════════════════════════════════════════════
// GameScene - 2.5D 等轴测 RPG 游戏场景
// 支持 Tiled 地图、Y-Sorting、点击移动
// ═══════════════════════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { MapLoader } from '../classes/MapLoader';
import { Player } from '../classes/Player';
import { IsometricUtils } from '../utils/IsometricUtils';

export class GameScene extends Phaser.Scene {
  // 核心组件
  private mapLoader!: MapLoader;
  private player!: Player;
  
  // 相机
  private mainCamera!: Phaser.Cameras.Scene2D.Camera;
  
  // 交互
  private clickMarker!: Phaser.GameObjects.Graphics;
  
  constructor() {
    super({ key: 'GameScene' });
  }
  
  create(): void {
    console.log('[GameScene] create: 2.5D Isometric RPG');
    
    // 初始化地图加载器
    this.mapLoader = new MapLoader(this);
    
    // 创建占位符地图（10x10 等轴测网格）
    this.mapLoader.createPlaceholderMap(10, 10);
    
    // 创建玩家角色（初始位置在地图中心）
    this.player = new Player(this, {
      x: 5,
      y: 5,
      speed: 200,
      color: 0xE07A5F, // 珊瑚色
    });
    
    // 设置相机
    this.setupCamera();
    
    // 设置点击交互
    this.setupClickInteraction();
    
    // 创建点击标记
    this.createClickMarker();
    
    console.log('[GameScene] 2.5D 等轴测世界初始化完成');
  }
  
  /**
   * 设置相机
   */
  private setupCamera(): void {
    this.mainCamera = this.cameras.main;
    
    // 设置背景色
    this.renderer.backgroundColor = Phaser.Display.Color.HexStringToColor('#87CEEB').color;
    
    // 相机跟随玩家
    this.mainCamera.startFollow(this.player.getSprite(), true, 0.1, 0.1);
    
    // 设置相机边界（根据地图大小）
    const mapWidth = 10 * IsometricUtils.TILE_WIDTH * 2;
    const mapHeight = 10 * IsometricUtils.TILE_HEIGHT * 2;
    this.mainCamera.setBounds(-mapWidth, -mapHeight, mapWidth * 2, mapHeight * 2);
    
    // 设置缩放
    this.mainCamera.setZoom(1);
  }
  
  /**
   * 设置点击交互
   */
  private setupClickInteraction(): void {
    // 监听鼠标点击
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 将屏幕坐标转换为世界坐标
      const worldPoint = this.mainCamera.getWorldPoint(pointer.x, pointer.y);
      
      // 将世界坐标转换为网格坐标
      const gridPos = IsometricUtils.screenToGrid(
        worldPoint.x,
        worldPoint.y,
        this.cameras.main.width / 2,
        100
      );
      
      // 检查网格范围
      if (gridPos.x >= 0 && gridPos.x < 10 && gridPos.y >= 0 && gridPos.y < 10) {
        console.log(`[GameScene] 点击移动: (${gridPos.x}, ${gridPos.y})`);
        
        // 显示点击标记
        this.showClickMarker(gridPos.x, gridPos.y);
        
        // 移动玩家
        this.player.moveTo(gridPos.x, gridPos.y);
      }
    });
  }
  
  /**
   * 创建点击标记
   */
  private createClickMarker(): void {
    this.clickMarker = this.add.graphics();
    this.clickMarker.setDepth(1000);
  }
  
  /**
   * 显示点击位置标记
   */
  private showClickMarker(gridX: number, gridY: number): void {
    const pos = IsometricUtils.gridToScreen(
      gridX,
      gridY,
      this.cameras.main.width / 2,
      100
    );
    
    this.clickMarker.clear();
    
    // 绘制菱形标记
    const size = 20;
    this.clickMarker.lineStyle(2, 0xFFD700, 1);
    this.clickMarker.beginPath();
    this.clickMarker.moveTo(pos.x, pos.y - size);
    this.clickMarker.lineTo(pos.x + size, pos.y);
    this.clickMarker.lineTo(pos.x, pos.y + size);
    this.clickMarker.lineTo(pos.x - size, pos.y);
    this.clickMarker.closePath();
    this.clickMarker.strokePath();
    
    // 闪烁动画
    this.tweens.add({
      targets: this.clickMarker,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.clickMarker.clear();
      },
    });
  }
  
  /**
   * 更新循环
   */
  update(time: number, delta: number): void {
    // 更新玩家
    this.player.update(delta);
  }
  
  // ═══════════════════════════════════════════════════════════════════════
  // 公共 API（供外部调用）
  // ═══════════════════════════════════════════════════════════════════════
  
  /**
   * 获取玩家当前位置
   */
  getPlayerPosition(): { x: number; y: number } {
    return this.player.getGridPosition();
  }
  
  /**
   * 移动玩家到指定位置
   */
  movePlayerTo(gridX: number, gridY: number): void {
    this.player.moveTo(gridX, gridY);
  }
}
