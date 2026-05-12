# Webhook 自动部署配置指南

## 问题诊断

原 webhook 自动部署功能存在以下问题：

1. **Docker 容器内缺少 git** - Dockerfile 未安装 git
2. **.git 目录未挂载** - 容器内无法执行 git pull
3. **容器内无法重启 Docker** - 没有 Docker CLI 和 socket
4. **缺少错误反馈** - 部署失败时无通知

## 修复内容

### 1. Dockerfile 更新
- 添加 `git` 和 `curl` 安装

### 2. docker-compose.yml 更新
- 挂载 `.git` 目录（只读）
- 可选：挂载 Docker socket

### 3. bot.py webhook 逻辑重写
- 检测容器环境
- 使用 `git fetch + reset` 替代 `git pull`
- 添加 Telegram 通知
- 添加健康检查端点 `/webhook/health`

### 4. 宿主机自动重启监控
- `auto_restart_watcher.sh` - 监控重启请求
- `nxsiran-watcher.service` - systemd 服务

## 部署步骤

### 方案 A: 完整自动重启（推荐）

```bash
# 1. 进入项目目录
cd /opt/NxSiran-Telegram-Bot

# 2. 拉取最新代码
git pull origin master

# 3. 重新构建并启动容器
docker compose down
docker compose up -d --build

# 4. 安装自动重启监控服务
sudo cp nxsiran-watcher.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nxsiran-watcher
sudo systemctl start nxsiran-watcher

# 5. 检查服务状态
sudo systemctl status nxsiran-watcher
```

### 方案 B: 手动重启模式

如果不希望自动重启，可以：

1. 只执行步骤 1-3
2. webhook 更新代码后会发送 Telegram 通知
3. 手动执行 `docker compose restart`

## GitHub Webhook 配置

1. 进入 GitHub 仓库 Settings → Webhooks
2. 点击 "Add webhook"
3. 配置：
   - **Payload URL**: `http://your-server:8080/webhook/github`
   - **Content type**: `application/json`
   - **Secret**: 设置一个随机字符串（可选）
   - **Events**: 选择 "Just the push event"
4. 点击 "Add webhook"

### 环境变量配置

在 `.env` 文件中添加：

```env
# Webhook 密钥（与 GitHub 配置一致）
GITHUB_WEBHOOK_SECRET=your-secret-key-here
```

## 测试 Webhook

### 1. 健康检查

```bash
curl http://localhost:8080/webhook/health
```

预期响应：
```json
{
  "status": "ok",
  "endpoint": "/webhook/github",
  "method": "POST",
  "secret_configured": true
}
```

### 2. 模拟 GitHub Push

```bash
curl -X POST http://localhost:8080/webhook/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{
    "repository": {"full_name": "test/repo"},
    "ref": "refs/heads/master",
    "commits": [{"message": "test"}]
  }'
```

预期响应：
```json
{
  "status": "deploying",
  "repo": "test/repo",
  "commits": 1
}
```

## 故障排查

### Webhook 返回 404

1. 检查容器是否正常运行：
   ```bash
   docker ps | grep nxsiran
   ```

2. 检查端口是否正确映射：
   ```bash
   docker port nxsiran-bot
   ```

3. 检查日志：
   ```bash
   docker logs nxsiran-bot --tail 100
   ```

4. 确认路由已注册：
   ```bash
   curl http://localhost:8080/webhook/health
   ```

### Git 操作失败

1. 检查 .git 目录是否挂载：
   ```bash
   docker exec nxsiran-bot ls -la /app/.git
   ```

2. 检查 git 是否安装：
   ```bash
   docker exec nxsiran-bot git --version
   ```

### 容器无法自动重启

1. 检查监控服务状态：
   ```bash
   sudo systemctl status nxsiran-watcher
   ```

2. 检查服务日志：
   ```bash
   tail -f /opt/NxSiran/data/logs/restart_watcher.log
   ```

## 安全建议

1. **使用 HTTPS**：通过 Nginx 反向代理或 Cloudflare Tunnel
2. **设置 Webhook Secret**：防止恶意请求
3. **限制 IP**：只允许 GitHub IP 访问 webhook 端点
4. **定期更新**：保持依赖和系统更新
