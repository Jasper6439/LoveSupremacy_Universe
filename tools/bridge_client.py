#!/usr/bin/env python3
"""
Bridge 客户端 - VM 端
定期从 webhook_server 轮询命令并执行，回传结果。

用法:
  python3 bridge_client.py

环境变量:
  BRIDGE_URL   - webhook_server 地址 (默认: http://localhost:8082)
  BRIDGE_TOKEN - 认证 token (默认: nxsiran_bridge_2024)
  VM_ID        - VM 标识 (默认: default)
  POLL_INTERVAL - 轮询间隔秒数 (默认: 5)
"""

import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime

try:
    import requests
except ImportError:
    print("请安装 requests: pip install requests")
    sys.exit(1)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [BridgeClient] %(levelname)s: %(message)s'
)
logger = logging.getLogger(__name__)

BRIDGE_URL = os.environ.get('BRIDGE_URL', 'http://localhost:8082')
BRIDGE_TOKEN = os.environ.get('BRIDGE_TOKEN', 'nxsiran_bridge_2024')
VM_ID = os.environ.get('VM_ID', 'default')
POLL_INTERVAL = int(os.environ.get('POLL_INTERVAL', '5'))


def execute_command(cmd_data):
    """执行命令并回传结果"""
    cmd_id = cmd_data.get('id', 'unknown')
    command = cmd_data.get('command', '')

    logger.info(f"执行命令 [{cmd_id}]: {command}")

    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5分钟超时
        )

        stdout = result.stdout.strip()
        stderr = result.stderr.strip()
        returncode = result.returncode

        logger.info(f"命令完成 [{cmd_id}]: rc={returncode}")

        # 回传结果
        try:
            resp = requests.post(
                f"{BRIDGE_URL}/bridge/result",
                json={
                    'token': BRIDGE_TOKEN,
                    'id': cmd_id,
                    'command': command,
                    'returncode': returncode,
                    'stdout': stdout,
                    'stderr': stderr,
                },
                timeout=10
            )
            if resp.status_code == 200:
                logger.info(f"结果已回传 [{cmd_id}]")
            else:
                logger.warning(f"结果回传失败 [{cmd_id}]: {resp.status_code}")
        except Exception as e:
            logger.error(f"结果回传网络错误: {e}")

    except subprocess.TimeoutExpired:
        logger.error(f"命令超时 [{cmd_id}]: 300s")
        try:
            requests.post(f"{BRIDGE_URL}/bridge/result", json={
                'token': BRIDGE_TOKEN, 'id': cmd_id, 'command': command,
                'returncode': -1, 'stdout': '', 'stderr': '命令执行超时 (300s)'
            }, timeout=10)
        except Exception:
            pass
    except Exception as e:
        logger.error(f"命令执行异常 [{cmd_id}]: {e}")
        try:
            requests.post(f"{BRIDGE_URL}/bridge/result", json={
                'token': BRIDGE_TOKEN, 'id': cmd_id, 'command': command,
                'returncode': -1, 'stdout': '', 'stderr': str(e)
            }, timeout=10)
        except Exception:
            pass


def poll():
    """轮询获取命令"""
    try:
        resp = requests.post(
            f"{BRIDGE_URL}/bridge/poll",
            json={'vm_id': VM_ID, 'token': BRIDGE_TOKEN},
            timeout=10
        )

        if resp.status_code == 200:
            data = resp.json()
            commands = data.get('commands', [])
            if commands:
                logger.info(f"获取到 {len(commands)} 条命令")
                for cmd in commands:
                    execute_command(cmd)
            return True
        else:
            logger.warning(f"轮询失败: {resp.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        logger.debug("连接失败，等待重连...")
        return False
    except Exception as e:
        logger.error(f"轮询异常: {e}")
        return False


def main():
    logger.info(f"Bridge 客户端启动")
    logger.info(f"  VM_ID: {VM_ID}")
    logger.info(f"  URL: {BRIDGE_URL}")
    logger.info(f"  轮询间隔: {POLL_INTERVAL}s")

    # 首次连接测试
    try:
        resp = requests.get(f"{BRIDGE_URL}/health", timeout=5)
        logger.info(f"服务端连接成功: {resp.json().get('service', 'unknown')}")
    except Exception as e:
        logger.warning(f"服务端连接失败: {e}，将持续重试...")

    # 主循环
    while True:
        poll()
        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
