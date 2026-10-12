# PINGME Troubleshooting Guide

Common issues, diagnostic procedures, and resolutions for PINGME.

---

## 1. iPhone Push Notifications Troubleshooting

### Symptom: Notifications do not appear when the iPhone is locked
1. **Verify Home Screen Installation**:
   - Check if you are running PINGME from the Home Screen icon rather than inside a Safari tab.
   - Run `pingme doctor` from the terminal: verify `Active Push Subscriptions >= 1`.
2. **Check iOS Notification Permissions**:
   - Open iOS **Settings → Notifications → PINGME**.
   - Ensure **Allow Notifications**, **Lock Screen**, **Notification Center**, and **Banners** are all enabled.
3. **Verify Focus Mode**:
   - If iOS **Do Not Disturb** or a **Focus Mode** is active, banners may be silenced unless PINGME is added to allowed apps.
4. **Resubscribe in PWA**:
   - In PINGME, navigate to **Settings**.
   - Tap **Disable** then **Enable** under Apple Web Push Notifications.
   - Tap **Send Test Push** to verify gateway delivery.

---

## 2. CLI Connectivity Troubleshooting

### Symptom: `Cannot connect to server at https://...`
1. **Check Server Status**:
   ```bash
   curl -I https://pingme.yourdomain.com/api/v1/health
   ```
   Should return `HTTP/2 200` with JSON `{ "status": "ok" }`.
2. **Inspect CLI Config**:
   ```bash
   pingme config show
   ```
   Ensure `Server URL` has no typos and uses `https://` in production.
3. **Firewall / Reverse Proxy**:
   - Verify ports `80` and `443` are open on your server firewall (`ufw allow 80/tcp`, `ufw allow 443/tcp`).

---

## 3. Database & Concurrency Issues

### Symptom: `sqlite3.OperationalError: database is locked`
- PINGME automatically configures SQLite in **WAL (Write-Ahead Logging)** mode with `busy_timeout=5000` to allow concurrent readers and writers.
- Ensure the SQLite database file and parent directory have read/write permissions for the container process:
  ```bash
  chmod 755 data
  chmod 644 data/pingme.db
  ```

---

## 4. Reverse Proxy & Cloudflare Considerations

### If using Cloudflare:
1. Under **SSL/TLS**, set mode to **Full (Strict)**.
2. Enable **WebSockets** under Network settings in the Cloudflare dashboard.
3. Note: Cloudflare does not alter Web Push traffic, but HTTPS must be strictly enforced.
