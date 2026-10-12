import asyncio
import threading
import time
import pytest


def test_create_reply_and_check_message_status(client, auth_headers):
    # Create message
    msg_res = client.post(
        "/api/v1/messages",
        json={"content": "Should I reboot server now?"},
        headers=auth_headers,
    )
    msg_id = msg_res.json()["id"]

    # Reply to message
    reply_payload = {
        "content": "Yes, restart it.",
        "voice_transcribed": True,
        "sender_device": "iPhone 15 Pro",
    }
    reply_res = client.post(
        f"/api/v1/messages/{msg_id}/replies",
        json=reply_payload,
        headers=auth_headers,
    )
    assert reply_res.status_code == 201
    reply_data = reply_res.json()
    assert reply_data["content"] == "Yes, restart it."
    assert reply_data["message_id"] == msg_id
    assert reply_data["voice_transcribed"] is True

    # Verify original message status updated to 'replied'
    updated_msg = client.get(f"/api/v1/messages/{msg_id}", headers=auth_headers).json()
    assert updated_msg["status"] == "replied"
    assert len(updated_msg["replies"]) == 1
    assert updated_msg["replies"][0]["id"] == reply_data["id"]


def test_wait_for_reply_when_already_replied(client, auth_headers):
    msg_res = client.post(
        "/api/v1/messages", json={"content": "Quick question"}, headers=auth_headers
    )
    msg_id = msg_res.json()["id"]

    client.post(
        f"/api/v1/messages/{msg_id}/replies",
        json={"content": "Immediate answer"},
        headers=auth_headers,
    )

    # Calling wait should immediately return the reply
    wait_res = client.get(f"/api/v1/messages/{msg_id}/wait?timeout=2", headers=auth_headers)
    assert wait_res.status_code == 200
    assert wait_res.json()["content"] == "Immediate answer"


def test_wait_for_reply_times_out(client, auth_headers):
    msg_res = client.post(
        "/api/v1/messages", json={"content": "Will anyone reply?"}, headers=auth_headers
    )
    msg_id = msg_res.json()["id"]

    start = time.time()
    wait_res = client.get(f"/api/v1/messages/{msg_id}/wait?timeout=1", headers=auth_headers)
    elapsed = time.time() - start
    assert wait_res.status_code == 204
    assert elapsed >= 0.9


def test_wait_for_reply_woken_up_by_concurrent_reply(client, auth_headers):
    msg_res = client.post(
        "/api/v1/messages", json={"content": "Please approve PR #42"}, headers=auth_headers
    )
    msg_id = msg_res.json()["id"]

    def reply_after_delay():
        time.sleep(0.4)
        client.post(
            f"/api/v1/messages/{msg_id}/replies",
            json={"content": "Approved by voice"},
            headers=auth_headers,
        )

    t = threading.Thread(target=reply_after_delay)
    t.start()

    wait_res = client.get(f"/api/v1/messages/{msg_id}/wait?timeout=3", headers=auth_headers)
    t.join()

    assert wait_res.status_code == 200
    assert wait_res.json()["content"] == "Approved by voice"
