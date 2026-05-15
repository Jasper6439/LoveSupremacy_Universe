// ═══════════════════════════════════════════════════════════════════════════
// IsometricUtils - 2.5D 等轴测坐标转换工具
// ═══════════════════════════════════════════════════════════════════════════

export class IsometricUtils {
  // 瓦片尺寸配置
  static TILE_WIDTH = 64;   // 等轴测瓦片宽度
  static TILE_HEIGHT = 32;  // 等轴测瓦片高度（半高）
  
  /**
   * 将网格坐标 (gridX, gridY) 转换为屏幕坐标 (screenX, screenY)
   * 等轴测投影公式
   */
  static gridToScreen(gridX: number, gridY: number, offsetX: number = 0, offsetY: number = 0): { x: number; y: number } {
    const x = (gridX - gridY) * (this.TILE_WIDTH / 2) + offsetX;
    const y = (gridX + gridY) * (this.TILE_HEIGHT / 2) + offsetY;
    return { x, y };
  }
  
  /**
   * 将屏幕坐标 (screenX, screenY) 转换为网格坐标 (gridX, gridY)
   * 用于点击移动
   */
  static screenToGrid(screenX: number, screenY: number, offsetX: number = 0, offsetY: number = 0): { x: number; y: number } {
    const x = screenX - offsetX;
    const y = screenY - offsetY;
    
    const gridX = Math.floor((x / (this.TILE_WIDTH / 2) + y / (this.TILE_HEIGHT / 2)) / 2);
    const gridY = Math.floor((y / (this.TILE_HEIGHT / 2) - x / (this.TILE_WIDTH / 2)) / 2);
    
    return { x: gridX, y: gridY };
  }
  
  /**
   * 计算深度排序值（Y-Sorting）
   * 等轴测中，Y 值越大（越靠前），深度越高
   */
  static calculateDepth(gridX: number, gridY: number, layer: number = 0): number {
    // 基础深度 + 网格位置 + 图层偏移
    return 1000 + (gridX + gridY) * 10 + layer;
  }
}
