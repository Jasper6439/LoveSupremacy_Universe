#!/bin/bash
# ============================================================
# 宿主机自动重启监控脚本
# 监听容器内的重启请求文件，自动重启 Docker 容器
# 
# 使用方法:
# 1. 将此脚本放在项目目录
# 2. 添加执行权限: chmod +x auto_restart_watcher.sh
# 3. 在后台运行: nohup ./auto_restart_watcher.sh &
# 或创建 systemd 服务
# ============================================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$PROJECT_DIR/data"
RESTART_FLAG="$DATA_DIR/.needs_restart"
LOG_FILE="$DATA_DIR/logs/restart_watcher.log"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== 自动重启监控启动 ==="
log "项目目录: $PROJECT_DIR"
log "监控文件: $RESTART_FLAG"

# 主循环
while true; do
    if [ -f "$RESTART_FLAG" ]; then
        log "检测到重启请求文件，开始重启容器..."
        
        # 读取请求时间
        REQUEST_TIME=$(cat "$RESTART_FLAG")
        log "请求时间: $REQUEST_TIME"
        
        # 删除标记文件
        rm -f "$RESTART_FLAG"
        
        # 执行重启
        cd "$PROJECT_DIR"
        log "执行: docker compose restart"
        docker compose restart 2>&1 | tee -a "$LOG_FILE"
        
        if [ $? -eq 0 ]; then
            log "✅ 容器重启成功"
        else
            log "❌ 容器重启失败"
        fi
    fi
    
    # 每5秒检查一次
    sleep 5
done
