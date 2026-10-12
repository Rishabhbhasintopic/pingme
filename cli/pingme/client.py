import time
from typing import Any, Dict, List, Optional
import httpx


class PingmeError(Exception):
    pass


class PingmeClient:
    def __init__(self, server_url: str, token: str, timeout: float = 30.0):
        self.server_url = server_url.rstrip("/")
        self.token = token.strip() if token else ""
        self.timeout = timeout

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "User-Agent": "pingme-cli/1.0.0",
        }

    def _handle_error(self, response: httpx.Response):
        if response.status_code == 401:
            raise PingmeError("Authentication failed: Invalid or revoked API token. Run 'pingme auth login'.")
        if response.status_code == 404:
            raise PingmeError(f"Resource not found: {response.text}")
        if response.status_code == 422:
            raise PingmeError(f"Validation error: {response.text}")
        if response.status_code >= 400:
            raise PingmeError(f"Server error ({response.status_code}): {response.text}")

    def verify_auth(self) -> Dict[str, Any]:
        url = f"{self.server_url}/api/v1/auth/verify"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url, headers=self._headers())
                self._handle_error(res)
                return res.json()
        except httpx.ConnectError:
            raise PingmeError(f"Cannot connect to PINGME server at {self.server_url}. Is it running?")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error: {str(e)}")

    def get_health(self) -> Dict[str, Any]:
        url = f"{self.server_url}/api/v1/health"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url)
                self._handle_error(res)
                return res.json()
        except httpx.ConnectError:
            raise PingmeError(f"Cannot connect to server at {self.server_url}")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error: {str(e)}")

    def send_message(
        self,
        content: str,
        title: Optional[str] = None,
        priority: str = "normal",
        conversation_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        url = f"{self.server_url}/api/v1/messages"
        payload = {
            "content": content,
            "title": title,
            "priority": priority,
            "conversation_id": conversation_id,
            "idempotency_key": idempotency_key,
            "sender_device": "Terminal",
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload, headers=self._headers())
                self._handle_error(res)
                return res.json()
        except httpx.ConnectError:
            raise PingmeError(f"Cannot connect to server at {self.server_url}")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error: {str(e)}")

    def wait_for_reply(self, message_id: str, timeout: int = 60) -> Optional[Dict[str, Any]]:
        url = f"{self.server_url}/api/v1/messages/{message_id}/wait"
        params = {"timeout": timeout}
        # Set httpx timeout slightly higher than server wait timeout
        client_timeout = float(timeout + 5)
        try:
            with httpx.Client(timeout=client_timeout) as client:
                res = client.get(url, params=params, headers=self._headers())
                if res.status_code == 204:
                    return None
                self._handle_error(res)
                return res.json()
        except httpx.TimeoutException:
            return None
        except httpx.ConnectError:
            raise PingmeError(f"Connection lost to server at {self.server_url}")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error during wait: {str(e)}")

    def get_messages(self, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
        url = f"{self.server_url}/api/v1/messages"
        params = {"limit": limit, "offset": offset}
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url, params=params, headers=self._headers())
                self._handle_error(res)
                return res.json()
        except httpx.ConnectError:
            raise PingmeError(f"Cannot connect to server at {self.server_url}")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error: {str(e)}")

    def get_devices(self) -> List[Dict[str, Any]]:
        url = f"{self.server_url}/api/v1/devices"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url, headers=self._headers())
                self._handle_error(res)
                return res.json()
        except httpx.ConnectError:
            raise PingmeError(f"Cannot connect to server at {self.server_url}")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error: {str(e)}")

    def create_reply(self, message_id: str, content: str) -> Dict[str, Any]:
        url = f"{self.server_url}/api/v1/messages/{message_id}/replies"
        payload = {
            "content": content,
            "voice_transcribed": False,
            "sender_device": "Terminal",
        }
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.post(url, json=payload, headers=self._headers())
                self._handle_error(res)
                return res.json()
        except httpx.ConnectError:
            raise PingmeError(f"Cannot connect to server at {self.server_url}")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error: {str(e)}")

    def get_conversations(self) -> List[Dict[str, Any]]:
        url = f"{self.server_url}/api/v1/conversations"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url, headers=self._headers())
                self._handle_error(res)
                return res.json()
        except httpx.ConnectError:
            raise PingmeError(f"Cannot connect to server at {self.server_url}")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error: {str(e)}")

    def get_conversation_details(self, conversation_id: str) -> Dict[str, Any]:
        url = f"{self.server_url}/api/v1/conversations/{conversation_id}"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url, headers=self._headers())
                self._handle_error(res)
                return res.json()
        except httpx.ConnectError:
            raise PingmeError(f"Cannot connect to server at {self.server_url}")
        except httpx.RequestError as e:
            raise PingmeError(f"Network error: {str(e)}")
