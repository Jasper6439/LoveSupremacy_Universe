"""
Bridge routes - Re-exports from vm_bridge.py and adds register_bridge_routes().
"""

from .vm_bridge import (
    bridge_vm_poll,
    bridge_vm_result,
    bridge_send_command,
    bridge_upload_file,
    bridge_pending_commands,
    bridge_uploaded_files,
)

__all__ = [
    "bridge_vm_poll",
    "bridge_vm_result",
    "bridge_send_command",
    "bridge_upload_file",
    "bridge_pending_commands",
    "bridge_uploaded_files",
    "register_bridge_routes",
]


def register_bridge_routes(app):
    """Register all bridge routes on the web application."""
    app.router.add_post('/bridge/poll', bridge_vm_poll)
    app.router.add_post('/bridge/result', bridge_vm_result)
    app.router.add_post('/bridge/send', bridge_send_command)
    app.router.add_post('/bridge/upload', bridge_upload_file)
    import logging
    logging.info("[Bridge] HTTP Bridge routes registered")
