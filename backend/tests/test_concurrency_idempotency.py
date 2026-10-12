import pytest


def test_idempotency_prevents_duplicate_messages(client, auth_headers):
    payload = {
        "content": "Deploy release v1.0.0",
        "idempotency_key": "idemp-key-xyz-12345",
    }
    res1 = client.post("/api/v1/messages", json=payload, headers=auth_headers)
    assert res1.status_code == 201
    msg1 = res1.json()

    # Retry submission with same idempotency key
    res2 = client.post("/api/v1/messages", json=payload, headers=auth_headers)
    assert res2.status_code in (200, 201)
    msg2 = res2.json()

    assert msg1["id"] == msg2["id"]

    # Verify total message count is 1, not 2
    list_res = client.get("/api/v1/messages", headers=auth_headers).json()
    assert list_res["total"] == 1


def test_multiple_messages_in_distinct_conversations(client, auth_headers):
    # Message A
    res_a = client.post(
        "/api/v1/messages",
        json={"content": "Topic A question", "conversation_id": "topic-a"},
        headers=auth_headers,
    ).json()
    # Message B
    res_b = client.post(
        "/api/v1/messages",
        json={"content": "Topic B question", "conversation_id": "topic-b"},
        headers=auth_headers,
    ).json()

    assert res_a["id"] != res_b["id"]
    assert res_a["conversation_id"] != res_b["conversation_id"]

    # Reply to B
    client.post(
        f"/api/v1/messages/{res_b['id']}/replies",
        json={"content": "Reply specifically for B"},
        headers=auth_headers,
    )

    # Check Message A has 0 replies
    msg_a = client.get(f"/api/v1/messages/{res_a['id']}", headers=auth_headers).json()
    assert len(msg_a["replies"]) == 0
    assert msg_a["status"] != "replied"

    # Check Message B has 1 reply
    msg_b = client.get(f"/api/v1/messages/{res_b['id']}", headers=auth_headers).json()
    assert len(msg_b["replies"]) == 1
    assert msg_b["replies"][0]["content"] == "Reply specifically for B"
    assert msg_b["status"] == "replied"
