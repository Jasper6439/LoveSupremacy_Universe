// ═══════════════════════════════════════════════════════════════════════════
// MapLoader - Tiled 地图加载器
// 支持 .json 格式的 Tiled 地图文件
// ═══════════════════════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { IsometricUtils } from '../utils/IsometricUtils';

export interface TilemapData {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: TileLayer[];
}

export interface TileLayer {
  name: string;
  data: number[];
  visible: boolean;
  opacity: number;
}

export class MapLoader {
  private scene: Phaser.Scene;
  private tilemap: Phaser.Tilemaps.Tilemap | null = null;
  private layers: Map<string, Phaser.Tilemaps.TilemapLayer> = new Map();
  
  // 图层顺序（从底到顶）
  private readonly LAYER_ORDER = ['background', 'ground', 'buildings', 'foreground'];
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * 加载 Tiled JSON 地图文件
   * @param key 资源键名
   * @param path 地图文件路径
   */
  loadMap(key: string, path: string): void {
    this.scene.load.tilemapTiledJSON(key, path);
  }
  
  /**
   * 创建地图（在 preload 完成后调用）
   * @param key 资源键名
   * @param tilesetKey 图集资源键名
   * @param tilesetName Tiled 中定义的图集名称
   */
  createMap(key: string, tilesetKey: string, tilesetName: string): Phaser.Tilemaps.Tilemap | null {
    // 创建 tilemap
    this.tilemap = this.scene.make.tilemap({ key });
    
    // 添加图集
    const tileset = this.tilemap.addTilesetImage(tilesetName, tilesetKey);
    if (!tileset) {
      console.error(`[MapLoader] 无法加载图集: ${tilesetName}`);
      return null;
    }
    
    // 按顺序创建图层
    this.LAYER_ORDER.forEach((layerName, index) => {
      const layer = this.tilemap?.createLayer(layerName, tileset, 0, 0);
      if (layer) {
        // 设置图层深度
        layer.setDepth(index * 100);
        this.layers.set(layerName, layer);
        console.log(`[MapLoader] 创建图层: ${layerName}`);
      } else {
        console.warn(`[MapLoader] 图层不存在: ${layerName}`);
      }
    });
    
    return this.tilemap;
  }
  
  /**
   * 创建占位符地图（当没有外部地图文件时使用）
   * 生成一个简单的等轴测网格
   */
  createPlaceholderMap(gridWidth: number = 10, gridHeight: number = 10): void {
    const tileWidth = IsometricUtils.TILE_WIDTH;
    const tileHeight = IsometricUtils.TILE_HEIGHT;
    
    // 计算地图中心偏移
    const offsetX = this.scene.cameras.main.width / 2;
    const offsetY = 100;
    
    // 创建地面层（等轴测网格）
    const groundGraphics = this.scene.add.graphics();
    groundGraphics.setDepth(0);
    
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const pos = IsometricUtils.gridToScreen(x, y, offsetX, offsetY);
        this.drawIsometricTile(groundGraphics, pos.x, pos.y, tileWidth, tileHeight);
      }
    }
    
    console.log(`[MapLoader] 创建占位符地图: ${gridWidth}x${gridHeight}`);
  }
  
  /**
   * 绘制单个等轴测瓦片
   */
  private drawIsometricTile(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    // 等轴测菱形四个顶点
    const points = [
      { x: x, y: y - halfHeight },      // 上
      { x: x + halfWidth, y: y },       // 右
      { x: x, y: y + halfHeight },      // 下
      { x: x - halfWidth, y: y },       // 左
    ];
    
    // 填充颜色（草地）
    graphics.fillStyle(0x7CB342, 1);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.forEach(p => graphics.lineTo(p.x, p.y));
    graphics.closePath();
    graphics.fillPath();
    
    // 边框
    graphics.lineStyle(1, 0x558B2F, 0.5);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.forEach(p => graphics.lineTo(p.x, p.y));
    graphics.closePath();
    graphics.strokePath();
    
    // 顶部高光（模拟3D效果）
    graphics.fillStyle(0x9CCC65, 0.3);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    graphics.lineTo(points[1].x, points[1].y);
    graphics.lineTo(points[0].x + 2, points[0].y + 4);
    graphics.closePath();
    graphics.fillPath();
  }
  
  /**
   * 获取指定网格位置的世界坐标
   */
  getWorldPosition(gridX: number, gridY: number): { x: number; y: number } {
    const offsetX = this.scene.cameras.main.width / 2;
    const offsetY = 100;
    return IsometricUtils.gridToScreen(gridX, gridY, offsetX, offsetY);
  }
  
  /**
   * 检查网格位置是否可行走
   */
  isWalkable(gridX: number, gridY: number): boolean {
    // TODO: 从碰撞图层读取
    return gridX >= 0 && gridY >= 0;
  }
  
  /**
   * 清理地图资源
   */
  destroy(): void {
    this.layers.forEach(layer => layer.destroy());
    this.layers.clear();
    this.tilemap?.destroy();
    this.tilemap = null;
  }
}
