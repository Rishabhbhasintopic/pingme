import pytest


def test_vapid_public_key_endpoint(client):
    res = client.get("/api/v1/push/vapid-public-key")
    assert res.status_code == 200
    data = res.json()
    assert "public_key" in data
    assert len(data["public_key"]) > 30


def test_device_registration_and_listing(client, auth_headers):
    payload = {
        "id": "device-iphone-test-1",
        "name": "Rishabh iPhone 15",
        "platform": "iOS",
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    }
    reg_res = client.post("/api/v1/devices/register", json=payload, headers=auth_headers)
    assert reg_res.status_code == 200
    assert reg_res.json()["name"] == "Rishabh iPhone 15"

    list_res = client.get("/api/v1/devices", headers=auth_headers)
    assert list_res.status_code == 200
    devices = list_res.json()
    assert any(d["id"] == "device-iphone-test-1" for d in devices)


def test_push_subscribe_and_unsubscribe(client, auth_headers):
    # Register device
    client.post(
        "/api/v1/devices/register",
        json={"id": "device-push-1", "name": "Test Phone", "platform": "iOS"},
        headers=auth_headers,
    )

    # Subscribe
    sub_payload = {
        "device_id": "device-push-1",
        "endpoint": "https://push.apple.com/sub/fake-unique-endpoint-1",
        "keys": {
            "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DQA",
            "auth": "tBHItJI5svbpez7KI4CCXg",
        },
    }
    sub_res = client.post("/api/v1/push/subscribe", json=sub_payload, headers=auth_headers)
    assert sub_res.status_code == 201
    assert sub_res.json()["is_active"] is True

    # Unsubscribe
    unsub_res = client.request(
        "DELETE",
        "/api/v1/push/subscribe",
        json={"endpoint": "https://push.apple.com/sub/fake-unique-endpoint-1"},
        headers=auth_headers,
    )
    assert unsub_res.status_code == 204


def test_expired_subscription_handling_on_message(client, auth_headers):
    # Register expired subscription endpoint
    client.post(
        "/api/v1/push/subscribe",
        json={
            "device_id": "device-expired-test",
            "endpoint": "https://push.apple.com/sub/expired-endpoint-test",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DQA",
                "auth": "tBHItJI5svbpez7KI4CCXg",
            },
        },
        headers=auth_headers,
    )

    # Post message which triggers push
    msg_res = client.post(
        "/api/v1/messages",
        json={"content": "Testing expired handling"},
        headers=auth_headers,
    )
    assert msg_res.status_code == 201
