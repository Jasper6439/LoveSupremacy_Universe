#!/bin/bash
# optimize_memory.sh - LoveSupremacy e2-micro 内存优化脚本
# 
# 功能：
# 1. 创建 2GB Swap 文件
# 2. 设置 swappiness = 60
# 3. 配置 systemd 服务内存控制
#
# 使用: sudo bash optimize_memory.sh

set -e

echo "=========================================="
echo "LoveSupremacy e2-micro 内存优化脚本"
echo "=========================================="

# 检查 root 权限
if [ "$EUID" -ne 0 ]; then
    echo "错误: 请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 创建并启用 2GB Swap 文件
echo ""
echo "[1/3] 检查 Swap 配置..."

if swapon --show | grep -q "/swapfile"; then
    echo "✅ 跳过: Swap 文件已存在"
    swapon --show
else
    echo "📦 创建 2GB Swap 文件..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # 永久启用
    if ! grep -q "/swapfile" /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    echo "✅ Swap 文件创建完成"
    swapon --show
fi

# 2. 设置 swappiness
echo ""
echo "[2/3] 设置 swappiness = 60..."

sysctl vm.swappiness=60 2>/dev/null || true

if ! grep -q "vm.swappiness" /etc/sysctl.conf; then
    echo "vm.swappiness=60" >> /etc/sysctl.conf
    echo "✅ 已添加到 /etc/sysctl.conf"
else
    echo "✅ swappiness 已配置"
fi

echo "当前 swappiness: $(cat /proc/sys/vm/swappiness)"

# 3. 配置 Systemd 服务内存控制
echo ""
echo "[3/3] 配置 systemd 服务内存限制..."

BOT_SERVICE="/etc/systemd/system/nxsiran-bot.service"
WEBHOOK_SERVICE="/etc/systemd/system/nxsiran-webhook.service"

configure_service_memory() {
    local service_file="$1"
    local service_name
    service_name=$(basename "$service_file" .service)
    
    if [ ! -f "$service_file" ]; then
        echo "⚠️ 跳过: $service_name 服务文件不存在"
        return
    fi
    
    # 检查是否已有 MemoryMin 配置
    if grep -q "MemoryMin" "$service_file"; then
        echo "✅ $service_name: 内存限制已配置"
        return
    fi
    
    # 在 [Service] 段落后添加内存限制
    sed -i '/^\[Service\]/a MemoryMin=100M\nMemoryLow=200M' "$service_file"
    systemctl daemon-reload
    echo "✅ $service_name: 已添加内存限制 (MemoryMin=100M, MemoryLow=200M)"
}

configure_service_memory "$BOT_SERVICE"
configure_service_memory "$WEBHOOK_SERVICE"

# 4. 清理不必要的服务（可选）
echo ""
echo "[附加] 检查可选优化..."

# 禁用不必要的服务（如果存在）
for svc in postgresql mysql apache2 nginx; do
    if systemctl list-unit-files 2>/dev/null | grep -q "^$svc.service"; then
        echo "⚠️ 发现 $svc，可能占用内存，考虑禁用"
    fi
done

# 显示内存状态
echo ""
echo "=========================================="
echo "内存优化完成！"
echo "=========================================="
echo ""
echo "当前内存状态:"
free -h
echo ""
echo "Swap 状态:"
swapon --show
echo ""
echo "服务状态:"
systemctl status nxsiran-bot --no-pager -l || true
echo ""
echo "建议: 重启服务以应用内存限制"
echo "  systemctl restart nxsiran-bot"
echo "  systemctl restart nxsiran-webhook"
