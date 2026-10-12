import pytest
from backend.tests.conftest import TEST_ADMIN_TOKEN, TEST_EXPIRED_TOKEN, TEST_REVOKED_TOKEN


def test_unauthorized_request_returns_401(client):
    response = client.get("/api/v1/messages")
    assert response.status_code == 401
    assert "Missing authentication token" in response.json()["detail"]


def test_invalid_token_returns_401(client):
    response = client.get("/api/v1/messages", headers={"Authorization": "Bearer pm_invalid_token_xyz"})
    assert response.status_code == 401
    assert "Invalid or revoked API token" in response.json()["detail"]


def test_revoked_token_returns_401(client):
    response = client.get("/api/v1/messages", headers={"Authorization": f"Bearer {TEST_REVOKED_TOKEN}"})
    assert response.status_code == 401
    assert "Invalid or revoked API token" in response.json()["detail"]


def test_expired_token_returns_401(client):
    response = client.get("/api/v1/messages", headers={"Authorization": f"Bearer {TEST_EXPIRED_TOKEN}"})
    assert response.status_code == 401
    assert "token has expired" in response.json()["detail"].lower()


def test_authorized_via_bearer_header(client, auth_headers):
    response = client.get("/api/v1/messages", headers=auth_headers)
    assert response.status_code == 200
    assert "items" in response.json()


def test_authorized_via_x_api_key_header(client, api_key_headers):
    response = client.get("/api/v1/messages", headers=api_key_headers)
    assert response.status_code == 200
    assert "items" in response.json()


def test_create_and_revoke_token_flow(client, auth_headers):
    # Create new token
    create_res = client.post(
        "/api/v1/auth/tokens",
        json={"name": "Temporary Test Token", "expires_in_days": 7},
        headers=auth_headers,
    )
    assert create_res.status_code == 201
    token_data = create_res.json()
    new_token = token_data["plain_token"]
    token_id = token_data["id"]
    assert new_token.startswith("pm_")

    # Use the new token
    use_res = client.get("/api/v1/auth/verify", headers={"Authorization": f"Bearer {new_token}"})
    assert use_res.status_code == 200
    assert use_res.json()["name"] == "Temporary Test Token"

    # List tokens - hashes must be redacted / not returned
    list_res = client.get("/api/v1/auth/tokens", headers=auth_headers)
    assert list_res.status_code == 200
    tokens = list_res.json()
    assert any(t["id"] == token_id for t in tokens)
    for t in tokens:
        assert "token_hash" not in t

    # Revoke the token
    del_res = client.delete(f"/api/v1/auth/tokens/{token_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Using the revoked token now returns 401
    revoked_res = client.get("/api/v1/auth/verify", headers={"Authorization": f"Bearer {new_token}"})
    assert revoked_res.status_code == 401
