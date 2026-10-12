import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

CONFIG_DIR = Path(os.path.expanduser("~/.config/pingme"))
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULT_CONFIG: Dict[str, Any] = {
    "server_url": "http://pms.rishabhslab.in",
    "token": "pm_init_admin_token_please_change",
    "timeout": 60,
    "device_name": "Terminal CLI",
}


def load_config() -> Dict[str, Any]:
    """Load configuration from ~/.config/pingme/config.json or environment."""
    config = dict(DEFAULT_CONFIG)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                config.update(saved)
        except Exception:
            pass

    # Environment variables take precedence if set
    if os.getenv("PINGME_SERVER_URL"):
        config["server_url"] = os.getenv("PINGME_SERVER_URL")
    if os.getenv("PINGME_TOKEN"):
        config["token"] = os.getenv("PINGME_TOKEN")
    if os.getenv("PINGME_TIMEOUT"):
        try:
            config["timeout"] = int(os.getenv("PINGME_TIMEOUT"))
        except ValueError:
            pass

    return config


def save_config(config: Dict[str, Any]) -> None:
    """Save configuration to ~/.config/pingme/config.json with restrictive permissions."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    # 0600 permissions to protect API tokens
    try:
        os.chmod(CONFIG_FILE, 0o600)
    except Exception:
        pass


def mask_token(token: Optional[str]) -> str:
    """Mask token for secure terminal display."""
    if not token:
        return "<none>"
    if len(token) > 10:
        return f"{token[:6]}...{token[-4:]}"
    return "****"
