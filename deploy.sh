#!/bin/bash
#
# deploy.sh - NxSiran Bot 部署脚本
# ================================
# 一键部署 Systemd 服务
#
# 使用方法:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE_NAME="nx_siran"
PROJECT_DIR="/opt/LoveSupremacy-Telegram-Bot"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  NxSiran Bot 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用 sudo 运行${NC}"
    exit 1
fi

# 1. 复制 service 文件
echo -e "${YELLOW}[1/5] 复制 Systemd 服务文件...${NC}"
cp "${PROJECT_DIR}/nx_siran.service" /etc/systemd/system/
chmod 644 /etc/systemd/system/nx_siran.service
echo -e "${GREEN}  ✓ 已复制到 /etc/systemd/system/${NC}"

# 2. 配置 journal 限制（防止磁盘撑爆）
echo -e "${YELLOW}[2/5] 配置 Journal 日志限制...${NC}"
mkdir -p /etc/systemd/journald.conf.d/
cp "${PROJECT_DIR}/journald.conf" /etc/systemd/journald.conf.d/nx-siran.conf
chmod 644 /etc/systemd/journald.conf.d/nx-siran.conf
echo -e "${GREEN}  ✓ Journal 配置已更新${NC}"

# 3. 重载 Systemd
echo -e "${YELLOW}[3/5] 重载 Systemd...${NC}"
systemctl daemon-reload
echo -e "${GREEN}  ✓ daemon-reload 完成${NC}"

# 4. 设置开机自启
echo -e "${YELLOW}[4/5] 设置开机自启...${NC}"
systemctl enable ${SERVICE_NAME}.service
echo -e "${GREEN}  ✓ 开机自启已启用${NC}"

# 5. 启动服务
echo -e "${YELLOW}[5/5] 启动服务...${NC}"
systemctl restart ${SERVICE_NAME}.service
sleep 2

# 检查状态
if [ "$(systemctl is-active ${SERVICE_NAME}.service)" = "active" ]; then
    echo -e "${GREEN}  ✓ 服务启动成功${NC}"
else
    echo -e "${RED}  ✗ 服务启动失败${NC}"
    systemctl status ${SERVICE_NAME}.service --no-pager | head -20
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "服务状态:"
systemctl status ${SERVICE_NAME}.service --no-pager | head -12
echo ""
