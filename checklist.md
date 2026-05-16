# v1.9.2 部署检查清单

> 执行前请仔细阅读每一步，确保备份完成后再进行更新。

---

## 1. 部署前备份

```bash
# 1.1 备份数据库
cp /opt/LoveSupremacy-Telegram-Bot/data/game.db /opt/LoveSupremacy-Telegram-Bot/data/game.db.backup.$(date +%Y%m%d%H%M%S)

# 1.2 备份配置文件
cp /opt/LoveSupremacy-Telegram-Bot/.env /opt/LoveSupremacy-Telegram-Bot/.env.backup.$(date +%Y%m%d%H%M%S)
cp /opt/LoveSupremacy-Telegram-Bot/data/config.json /opt/LoveSupremacy-Telegram-Bot/data/config.json.backup.$(date +%Y%m%d%H%M%S)

# 1.3 备份角色数据（如有自定义修改）
tar -czvf /opt/backup_characters_$(date +%Y%m%d%H%M%S).tar.gz -C /opt/LoveSupremacy-Telegram-Bot/characters .

# 1.4 确认备份完成
ls -la /opt/LoveSupremacy-Telegram-Bot/data/*.backup.*
```

---

## 2. 拉取最新代码

```bash
# 2.1 进入项目目录
cd /opt/LoveSupremacy-Telegram-Bot

# 2.2 检查当前版本
git log -1 --oneline

# 2.3 拉取最新代码
git fetch origin
git log HEAD..origin/master --oneline  # 查看待更新的提交

# 2.4 强制同步（会覆盖本地未提交的更改）
git reset --hard origin/master

# 2.5 确认更新后的版本
git log -1 --oneline
# 预期输出: c696d18 feat(v1.9.2): Project Unity 架构重构
```

---

## 3. 更新依赖

```bash
# 3.1 安装/更新 Python 依赖
pip install -r requirements.txt --break-system-packages

# 3.2 验证关键依赖
python3 -c "import fastapi; print(f'FastAPI: {fastapi.__version__}')"
python3 -c "import telegram; print(f'python-telegram-bot: {telegram.__version__}')"
```

---

## 4. 重启服务

```bash
# 4.1 停止服务
sudo systemctl stop nx_siran

# 4.2 检查进程是否已停止
ps aux | grep "main.py" | grep -v grep
# 如果仍有进程，手动终止: sudo pkill -f "main.py"

# 4.3 启动服务
sudo systemctl start nx_siran

# 4.4 检查服务状态
sudo systemctl status nx_siran --no-pager

# 4.5 查看启动日志
journalctl -u nx_siran -n 50 --no-pager
```

---

## 5. 验证部署

```bash
# 5.1 测试 Web 服务
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8080/

# 5.2 测试 API 文档
curl -s -o /dev/null -w "API Docs: %{http_code}\n" http://localhost:8080/api/docs

# 5.3 测试游戏 API
curl -s http://localhost:8080/api/game/farm | python3 -c "import sys,json; d=json.load(sys.stdin); print('Farm API:', 'OK' if d.get('success') else 'FAIL')"

# 5.4 检查外部访问（从外部网络）
curl -s -o /dev/null -w "External: %{http_code}\n" http://35.212.221.245:8080/
```

---

## 6. 回滚方案（如部署失败）

```bash
# 6.1 停止服务
sudo systemctl stop nx_siran

# 6.2 回滚代码到上一版本
cd /opt/LoveSupremacy-Telegram-Bot
git reset --hard 21a6e41  # v1.9.1 提交

# 6.3 恢复数据库
cp /opt/LoveSupremacy-Telegram-Bot/data/game.db.backup.* /opt/LoveSupremacy-Telegram-Bot/data/game.db

# 6.4 恢复配置
cp /opt/LoveSupremacy-Telegram-Bot/.env.backup.* /opt/LoveSupremacy-Telegram-Bot/.env

# 6.5 重启服务
sudo systemctl start nx_siran
```

---

## 7. 清理备份（部署成功后）

```bash
# 7.1 确认一切正常后，可删除旧备份
# 注意：建议保留最近 3 天的备份

# 列出所有备份
ls -la /opt/LoveSupremacy-Telegram-Bot/data/*.backup.*

# 删除超过 7 天的备份
find /opt/LoveSupremacy-Telegram-Bot/data -name "*.backup.*" -mtime +7 -delete
```

---

## 检查结果记录

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 数据库备份 | ☐ | |
| 配置文件备份 | ☐ | |
| 代码更新 | ☐ | |
| 依赖安装 | ☐ | |
| 服务重启 | ☐ | |
| Web 访问 | ☐ | |
| API 正常 | ☐ | |
| 外部访问 | ☐ | |

---

*生成时间: 2026-05-16*
*版本: v1.9.2*
