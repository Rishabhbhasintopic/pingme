# PINGME Security Architecture & Hardening

Security and privacy are fundamental requirements of PINGME. The system is designed to provide end-to-end authorization without exposing credentials or messages to unauthorized third parties.

---

## 1. Threat Model & Design Principles

| Threat | Mitigation |
| :--- | :--- |
| **Unauthorized Message Injection** | All message creation endpoints strictly require valid, unrevoked API tokens. |
| **Token Theft from Database Dump** | Tokens are stored exclusively as HMAC-SHA256 hashes. Plain tokens cannot be recovered from the database. |
| **Eavesdropping on Push Messages** | Web Push payloads are encrypted with RFC 8291 / ECDH P-256 before transit across Apple APNs. |
| **Credential Leakage in Logs** | Token strings and sensitive message headers are redacted from server and CLI logs. |
| **Replay Attacks** | Optional `idempotency_key` ensures retried network requests do not create duplicate messages. |
| **Unauthorized Web Push Registration** | Push subscription endpoints require authentication. |

---

## 2. API Token Lifecycle

### Token Structure
- Prefix: `pm_` for easy recognition and secret scanning allowlisting.
- Entropy: 32 bytes of cryptographically secure random bytes generated via `secrets.token_urlsafe(32)`.
- Example: `pm_8F9xQ2mKaPvL3...`

### Storage & Verification
1. When a token is created via `POST /api/v1/auth/tokens`, the plain token is returned **exactly once** to the client.
2. The server computes:
   $$\text{hash} = \text{HMAC-SHA256}(\text{SECRET\_KEY}, \text{plain\_token})$$
3. When verifying an incoming request, the server hashes the provided token and performs a constant-time comparison using `hmac.compare_digest`.
4. Token expiration (`expires_at`) and revocation (`is_revoked`) are validated on every protected API call.

---

## 3. Web Push Cryptographic Standards

PINGME implements the standard W3C Web Push protocols:
- **RFC 8291**: Message Encryption for Web Push (ECE with ECDH P-256 and HKDF-SHA256)
- **RFC 8292**: Voluntary Application Server Identification (VAPID)

The private key never leaves the server (`data/vapid_keys.json`). Only the public key is provided to the client browser for subscription creation.

---

## 4. Token Rotation & Incident Recovery

### Revoking a Compromised Token
1. From the PWA: Navigate to **Settings → Manage API Tokens** and tap the trash icon next to the compromised token.
2. From the CLI (or API):
   ```bash
   curl -X DELETE "https://pingme.yourdomain.com/api/v1/auth/tokens/<token_id>" \
     -H "Authorization: Bearer <valid_admin_token>"
   ```
3. The token is immediately rejected across all endpoints and active WebSocket connections.

### Regenerating Server Secrets
If `SECRET_KEY` is compromised:
1. Generate a new secret:
   ```bash
   openssl rand -hex 32
   ```
2. Update `.env` on your server.
3. Restart containers:
   ```bash
   docker compose -f deploy/docker-compose.yml restart backend
   ```
4. Re-issue API tokens for your devices.
