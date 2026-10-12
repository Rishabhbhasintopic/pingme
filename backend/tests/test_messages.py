import pytest


def test_create_simple_message(client, auth_headers):
    payload = {"content": "Your server backup has completed"}
    response = client.post("/api/v1/messages", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["content"] == "Your server backup has completed"
    assert data["priority"] == "normal"
    assert data["status"] in ("created", "push_accepted", "queued")
    assert data["sender"] == "cli"
    assert data["id"] is not None
    assert data["conversation_id"] is not None


def test_create_titled_high_priority_message(client, auth_headers):
    payload = {
        "title": "SERVER ALERT",
        "content": "Disk usage has reached 90%",
        "priority": "high",
    }
    response = client.post("/api/v1/messages", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "SERVER ALERT"
    assert data["priority"] == "high"


def test_message_validation_rejects_empty_content(client, auth_headers):
    response = client.post("/api/v1/messages", json={"content": ""}, headers=auth_headers)
    assert response.status_code == 422


def test_message_validation_rejects_invalid_priority(client, auth_headers):
    response = client.post(
        "/api/v1/messages",
        json={"content": "Valid text", "priority": "urgent_max"},
        headers=auth_headers,
    )
    assert response.status_code == 422


def test_message_pagination(client, auth_headers):
    for i in range(15):
        client.post("/api/v1/messages", json={"content": f"Message {i}"}, headers=auth_headers)

    # Page 1
    p1 = client.get("/api/v1/messages?limit=5&offset=0", headers=auth_headers).json()
    assert len(p1["items"]) == 5
    assert p1["total"] == 15
    assert p1["limit"] == 5
    assert p1["offset"] == 0

    # Page 2
    p2 = client.get("/api/v1/messages?limit=5&offset=5", headers=auth_headers).json()
    assert len(p2["items"]) == 5
    # IDs should not overlap
    p1_ids = {m["id"] for m in p1["items"]}
    p2_ids = {m["id"] for m in p2["items"]}
    assert len(p1_ids.intersection(p2_ids)) == 0


def test_mark_message_read(client, auth_headers):
    msg_res = client.post(
        "/api/v1/messages", json={"content": "Check this out"}, headers=auth_headers
    )
    msg_id = msg_res.json()["id"]

    read_res = client.patch(f"/api/v1/messages/{msg_id}/read", headers=auth_headers)
    assert read_res.status_code == 200
    assert read_res.json()["read_at"] is not None
    assert read_res.json()["status"] == "read"
