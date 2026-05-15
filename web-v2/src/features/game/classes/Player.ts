// ═══════════════════════════════════════════════════════════════════════════
// Player - 2.5D 等轴测角色类
// 支持键盘移动、点击移动、Y-Sorting 深度排序
// ═══════════════════════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { IsometricUtils } from '../utils/IsometricUtils';

export type PlayerState = 'idle' | 'walk' | 'interact';
export type PlayerDirection = 'up' | 'down' | 'left' | 'right';

export interface PlayerConfig {
  x: number;
  y: number;
  speed?: number;
  color?: number;
}

export class Player {
  private scene: Phaser.Scene;
  private sprite!: Phaser.GameObjects.Container;
  private shadow!: Phaser.GameObjects.Ellipse;
  private body!: Phaser.GameObjects.Ellipse;
  private head!: Phaser.GameObjects.Ellipse;
  
  // 状态
  private state: PlayerState = 'idle';
  private speed: number = 200;
  
  // 网格位置
  private gridX: number = 0;
  private gridY: number = 0;
  private targetGridX: number = 0;
  private targetGridY: number = 0;
  
  // 移动
  private isMoving: boolean = false;
  private moveTween: Phaser.Tweens.Tween | null = null;
  
  // 输入
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { [key: string]: Phaser.Input.Keyboard.Key };
  
  constructor(scene: Phaser.Scene, config: PlayerConfig) {
    this.scene = scene;
    this.speed = config.speed || 200;
    this.gridX = config.x;
    this.gridY = config.y;
    this.targetGridX = config.x;
    this.targetGridY = config.y;
    
    this.createSprite(config.color || 0xE07A5F);
    this.setupInput();
    this.updateDepth();
  }
  
  /**
   * 创建角色精灵（使用几何图形）
   */
  private createSprite(color: number): void {
    const pos = this.getWorldPosition();
    
    // 阴影（底部椭圆）
    this.shadow = this.scene.add.ellipse(0, 15, 24, 10, 0x000000, 0.2);
    
    // 身体（胶囊形）
    this.body = this.scene.add.ellipse(0, 0, 20, 28, color);
    this.body.setStrokeStyle(2, 0xFFFFFF, 0.3);
    
    // 头部（圆形）
    this.head = this.scene.add.ellipse(0, -18, 16, 16, 0xF5D6C6);
    this.head.setStrokeStyle(2, 0xE8C4C4, 0.5);
    
    // 眼睛（简单表示朝向）
    const leftEye = this.scene.add.ellipse(-4, -20, 3, 3, 0x333333);
    const rightEye = this.scene.add.ellipse(4, -20, 3, 3, 0x333333);
    
    // 容器组合
    this.sprite = this.scene.add.container(pos.x, pos.y, [
      this.shadow,
      this.body,
      this.head,
      leftEye,
      rightEye,
    ]);
    
    // 设置交互
    this.sprite.setSize(20, 40);
    this.sprite.setInteractive({ useHandCursor: true });
  }
  
  /**
   * 设置键盘输入
   */
  private setupInput(): void {
    // 方向键
    this.cursors = this.scene.input.keyboard!.createCursorKeys();
    
    // WASD
    this.wasd = {
      W: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }
  
  /**
   * 更新循环（每帧调用）
   */
  update(_delta: number): void {
    if (this.isMoving) {
      // 正在移动中，检查是否到达目标
      this.checkArrival();
    } else {
      // 检查键盘输入
      this.handleKeyboardInput();
    }
    
    // 更新深度排序（Y-Sorting）
    this.updateDepth();
    
    // 呼吸动画
    this.updateBreathingAnimation();
  }
  
  /**
   * 处理键盘输入
   */
  private handleKeyboardInput(): void {
    let dx = 0;
    let dy = 0;
    
    // 方向键或 WASD
    if (this.cursors.left?.isDown || this.wasd.A.isDown) dx = -1;
    if (this.cursors.right?.isDown || this.wasd.D.isDown) dx = 1;
    if (this.cursors.up?.isDown || this.wasd.W.isDown) dy = -1;
    if (this.cursors.down?.isDown || this.wasd.S.isDown) dy = 1;
    
    if (dx !== 0 || dy !== 0) {
      // 等轴测移动：将网格移动转换为等轴测方向
      // 上 = (-1, -1), 下 = (1, 1), 左 = (-1, 1), 右 = (1, -1)
      const isoDx = dx - dy;
      const isoDy = dx + dy;
      
      this.targetGridX = this.gridX + (isoDx > 0 ? 1 : isoDx < 0 ? -1 : 0);
      this.targetGridY = this.gridY + (isoDy > 0 ? 1 : isoDy < 0 ? -1 : 0);
      
      this.startMove();
    }
  }
  
  /**
   * 开始移动到目标位置
   */
  private startMove(): void {
    if (this.gridX === this.targetGridX && this.gridY === this.targetGridY) return;
    
    this.isMoving = true;
    this.state = 'walk';
    
    const startPos = this.getWorldPosition();
    const targetPos = IsometricUtils.gridToScreen(
      this.targetGridX,
      this.targetGridY,
      this.scene.cameras.main.width / 2,
      100
    );
    
    // 计算距离和时间
    const distance = Phaser.Math.Distance.Between(startPos.x, startPos.y, targetPos.x, targetPos.y);
    const duration = (distance / this.speed) * 1000;
    
    // 创建移动动画
    this.moveTween = this.scene.tweens.add({
      targets: this.sprite,
      x: targetPos.x,
      y: targetPos.y,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this.gridX = this.targetGridX;
        this.gridY = this.targetGridY;
        this.isMoving = false;
        this.state = 'idle';
      },
    });
    
    // 行走动画（上下弹跳）
    this.scene.tweens.add({
      targets: this.sprite,
      y: targetPos.y - 3,
      duration: duration / 4,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
    });
  }
  
  /**
   * 检查是否到达目标
   */
  private checkArrival(): void {
    // 由 tween onComplete 处理
  }
  
  /**
   * 移动到指定网格位置（点击移动）
   */
  moveTo(gridX: number, gridY: number): void {
    if (this.isMoving) {
      // 取消当前移动
      this.moveTween?.stop();
      this.isMoving = false;
    }
    
    this.targetGridX = gridX;
    this.targetGridY = gridY;
    this.startMove();
  }
  
  /**
   * 获取当前世界坐标
   */
  getWorldPosition(): { x: number; y: number } {
    return IsometricUtils.gridToScreen(
      this.gridX,
      this.gridY,
      this.scene.cameras.main.width / 2,
      100
    );
  }
  
  /**
   * 获取当前网格坐标
   */
  getGridPosition(): { x: number; y: number } {
    return { x: this.gridX, y: this.gridY };
  }
  
  /**
   * 更新深度排序（Y-Sorting）
   * 等轴测中，Y 值越大（越靠前），深度越高
   */
  private updateDepth(): void {
    const depth = IsometricUtils.calculateDepth(this.gridX, this.gridY, 10);
    this.sprite.setDepth(depth);
  }
  
  /**
   * 呼吸动画
   */
  private updateBreathingAnimation(): void {
    if (this.state === 'idle') {
      // 待机时的轻微缩放
      const scale = 1 + Math.sin(Date.now() / 500) * 0.02;
      this.body.setScale(scale, scale);
    }
  }
  
  /**
   * 设置交互回调
   */
  onInteract(callback: () => void): void {
    this.sprite.on('pointerdown', callback);
  }
  
  /**
   * 获取精灵容器（用于相机跟随）
   */
  getSprite(): Phaser.GameObjects.Container {
    return this.sprite;
  }
  
  /**
   * 销毁角色
   */
  destroy(): void {
    this.moveTween?.stop();
    this.sprite.destroy();
  }
}
