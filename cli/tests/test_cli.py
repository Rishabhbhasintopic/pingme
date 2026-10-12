from unittest.mock import patch
import pytest
from click.testing import CliRunner

from pingme.cli import cli

runner = CliRunner()


def test_cli_help():
    result = runner.invoke(cli, ["--help"])
    assert result.exit_code == 0
    assert "Terminal to iPhone Voice Messaging System" in result.output


def test_cli_config_show():
    result = runner.invoke(cli, ["config", "show"])
    assert result.exit_code == 0
    assert "Server URL" in result.output


def test_cli_send_message_mocked():
    with patch("pingme.client.PingmeClient.send_message") as mock_send:
        mock_send.return_value = {
            "id": "msg-test-123",
            "content": "Backup complete",
            "status": "push_accepted",
        }
        result = runner.invoke(cli, ["Your server backup has completed"])
        assert result.exit_code == 0
        assert "msg-test-123" in result.output
        mock_send.assert_called_once()


def test_cli_send_with_title_and_priority():
    with patch("pingme.client.PingmeClient.send_message") as mock_send:
        mock_send.return_value = {
            "id": "msg-test-456",
            "content": "Disk 90%",
            "status": "push_accepted",
        }
        result = runner.invoke(
            cli,
            ["-t", "SERVER ALERT", "--priority", "high", "Disk usage 90%"],
        )
        assert result.exit_code == 0
        assert "msg-test-456" in result.output
        mock_send.assert_called_once()
        _, kwargs = mock_send.call_args
        assert kwargs["title"] == "SERVER ALERT"
        assert kwargs["priority"] == "high"


def test_cli_wait_for_reply_receives_reply():
    with patch("pingme.client.PingmeClient.send_message") as mock_send, patch(
        "pingme.client.PingmeClient.wait_for_reply"
    ) as mock_wait:
        mock_send.return_value = {
            "id": "msg-test-789",
            "status": "created",
        }
        mock_wait.return_value = {
            "id": "reply-1",
            "content": "Yes, restart it.",
            "voice_transcribed": True,
            "sender_device": "iPhone 15 Pro",
        }

        result = runner.invoke(cli, ["-w", "Should I restart the service?"])
        assert result.exit_code == 0
        assert "Yes, restart it." in result.output
        assert "Voice Dictated" in result.output


def test_cli_doctor_mocked():
    with patch("pingme.client.PingmeClient.get_health") as mock_health, patch(
        "pingme.client.PingmeClient.verify_auth"
    ) as mock_auth:
        mock_health.return_value = {
            "status": "ok",
            "database": "healthy",
            "vapid_configured": True,
            "active_subscriptions": 1,
            "registered_devices": 1,
        }
        mock_auth.return_value = {"name": "Admin", "prefix": "pm_init..."}

        result = runner.invoke(cli, ["doctor"])
        assert result.exit_code == 0
        assert "Diagnostics complete!" in result.output
