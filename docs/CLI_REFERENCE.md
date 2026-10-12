# PINGME Terminal CLI Reference

The `pingme` command-line utility connects your development machines, SSH sessions, cron jobs, and scripts to your iPhone.

---

## 1. Installation

Install the CLI into your user environment:

```bash
cd pingme
pip install -e cli
```

Verify installation:
```bash
pingme --help
```

---

## 2. Authentication & Configuration

### Interactive Login
Configure the server URL and your revocable API token:

```bash
pingme auth login
```
Prompts:
```text
Server URL [http://localhost:8000]: https://pingme.yourdomain.com
API Token (pm_...): ********************************
✓ Successfully authenticated as 'Work Laptop'
Configuration saved to ~/.config/pingme/config.json
```

### View Configuration
```bash
pingme config show
```

### Set Specific Values
```bash
pingme config set --server https://pingme.yourdomain.com --timeout 90
```

### Environment Variable Overrides
The CLI supports standard environment variables for CI/CD and automated runners:
- `PINGME_SERVER_URL`: Server endpoint
- `PINGME_TOKEN`: API token (`pm_...`)
- `PINGME_TIMEOUT`: Wait timeout in seconds

---

## 3. Command Reference

### Send a Simple Message
```bash
pingme "Your server backup has completed"
```
Output:
```text
✓ Message sent successfully (ID: 8930401b-349f-4a75-9285-dfe6d7a75c67, Status: created)
```

### Send a Titled Message
```bash
pingme -t "SERVER ALERT" "Disk usage has reached 90%"
```

### Send a High-Priority Message
```bash
pingme --priority high "Production database latency spike detected"
```
Valid priorities: `low`, `normal`, `high`.

### Wait for a Reply
```bash
pingme -w "Should I restart the production service?"
```
Interaction:
```text
✓ Message sent successfully (ID: 6052a548-e936-44e9-8a00-1cdba8e89746, Status: created)
Waiting for reply... (timeout: 60s, press Ctrl+C to cancel)

Reply from iPhone 15 Pro: Yes, restart it. 🎤 (Voice Dictated)
```

**Options for `-w`:**
- `--timeout <seconds>`: Override default timeout (default: 60s)
- Pressing `Ctrl+C` cleanly cancels the wait without error dumps (exit code 130).

### Stream Incoming Replies (Listen Mode)
```bash
pingme listen
```
Continuously streams new replies from your iPhone as they arrive in real-time.

### Interactive Terminal Chat
```bash
pingme chat
```
Starts an interactive two-way conversation session. Type a message, press Enter, and wait for your iPhone's reply. Type `exit` or press `Ctrl+C` to quit.

### Check System Status
```bash
pingme status
```
Displays server connectivity, SQLite database status, VAPID push setup, and registered mobile devices.

### View History
```bash
pingme history -n 20
```
Displays recent messages, priorities, delivery status, and responses in a formatted table.

### List Registered Devices
```bash
pingme devices
```
Lists registered iPhones and active push subscriptions.

### Run System Diagnostics (Doctor)
```bash
pingme doctor
```
Verifies local config, server reachability, API token validity, VAPID key status, and push delivery readiness.

---

## 4. Scripting & Automation Examples

### Example 1: Interactive Deployment Confirmation
```bash
#!/bin/bash
set -e

echo "Building release bundle..."
npm run build

echo "Requesting deployment approval on iPhone..."
REPLY=$(pingme -w "Approve release v2.4.0 deployment to production?" --timeout 120 | grep -i "Reply from")

if echo "$REPLY" | grep -iq "yes\|approve\|ok"; then
    echo "Approval received: $REPLY"
    echo "Deploying to production..."
    ./deploy.sh
else
    echo "Deployment aborted or rejected: $REPLY"
    exit 1
fi
```

### Example 2: Cron Job Alert
```bash
#!/bin/bash
# Backup script with PINGME notification
tar -czf /backups/site_$(date +%F).tar.gz /var/www/html

if [ $? -eq 0 ]; then
    pingme "Daily site backup completed successfully."
else
    pingme -t "BACKUP FAILURE" --priority high "Site backup failed with exit code $?"
fi
```
