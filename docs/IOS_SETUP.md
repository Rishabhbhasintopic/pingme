# iOS iPhone Setup & Web Push Guide

PINGME is engineered specifically as an installable **Progressive Web App (PWA)** for iOS Safari. This architecture avoids Apple's 7-day free developer certificate signing expiration and does not require the Apple App Store.

---

## 1. Apple iOS Web Push Requirements

Starting in **iOS 16.4 and iPadOS 16.4**, Apple enabled the standard W3C Push API and Badging API for web applications under the following strict conditions:

1. **HTTPS is Mandatory**: Web Push and Service Workers will not function over insecure HTTP (except `localhost`).
2. **Home Screen Installation is Mandatory**: Notifications **cannot** be delivered to normal Safari browser tabs while closed. The user **must** add the web app to the iOS Home Screen.
3. **Explicit User Interaction**: Notification permissions can only be requested following an explicit user gesture (e.g., tapping the "Enable" button in Settings).
4. **Valid VAPID Keypair**: The server must sign push requests using an Elliptic Curve P-256 VAPID keypair adhering to RFC 8291 and RFC 8292.

---

## 2. Step-by-Step iPhone Installation Walkthrough

### Step 1: Open in Safari
Open your server's HTTPS URL in Safari on your iPhone:
`https://pingme.yourdomain.com`

> [!IMPORTANT]
> You must use **Safari**. Chrome, Firefox, and Brave on iOS do not currently support adding PWAs with Web Push entitlements.

### Step 2: Add to Home Screen
1. Tap the **Share** button in the bottom Safari toolbar (the square icon with an arrow pointing upward).
2. Scroll down the action sheet and select **Add to Home Screen**.
3. Confirm the name **PINGME** and tap **Add** in the top-right corner.

### Step 3: Launch Installed App
1. Locate the **PINGME** icon on your iPhone Home Screen.
2. Tap the icon to launch it as a standalone full-screen application (notice the absence of Safari URL bars).

### Step 4: Enable Notifications
1. Go to the **Settings** tab (gear icon in the bottom navigation).
2. Under **Apple Web Push Notifications**, tap the **Enable** button.
3. iOS will present the native system prompt:
   > **"PINGME" Would Like to Send You Notifications**
4. Tap **Allow**.

### Step 5: Verify Push Delivery
1. Tap the **Send Test Push** button in Settings.
2. If the PWA is active, a notification banner appears.
3. Lock your iPhone or swipe up to the Home Screen.
4. From your terminal, run:
   ```bash
   pingme "Test notification to iPhone"
   ```
5. Your iPhone screen lights up with the PINGME push notification banner!

---

## 3. iOS Voice & Speech Capabilities & Limitations

Voice is a central design pillar of PINGME. However, Apple iOS imposes strict background execution constraints that every engineer and user should understand:

### Spoken Messages (Text-to-Speech)
- **When PINGME is Open**: Incoming messages automatically read aloud when "Auto-Read Incoming Messages" is enabled in the Voice tab.
- **When iPhone is Locked or Web App is Closed**:
  - iOS restricts background JavaScript execution and disables `SpeechSynthesis` audio while the device is locked.
  - **The Legitimate UX Workflow**:
    1. iOS delivers the push notification with sound/vibration to your Lock Screen.
    2. Tapping the notification immediately wakes and opens PINGME directly to the conversation.
    3. PINGME instantly reads the incoming message aloud.
    4. You can tap the "Listen" button at any time to replay the message.

### Voice Dictation (Speech-to-Text)
- Tap the **Microphone** button inside the reply composer or the Voice tab.
- Speak naturally: iOS converts your speech to text in real-time.
- The transcript is displayed in the composer for review and editing.
- Tap **Send** to transmit the reply back to the terminal.
- Your terminal CLI prints the reply with a `🎤 (Voice Dictated)` indicator.

---

## 4. Troubleshooting iOS Notifications

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| "Add to Home Screen" missing | Opened in embedded in-app browser or Chrome | Open URL directly in native Safari |
| "Web Push not supported" error | Running in Safari browser tab instead of installed Home Screen icon | Launch PINGME from the Home Screen icon |
| Push notifications not appearing on Lock Screen | Focus mode (Do Not Disturb) or notification settings disabled | Check iOS Settings → Notifications → PINGME |
| Push accepted by server but not arriving | Expired subscription or domain mismatch | In PINGME Settings, tap Disable then Enable to renew subscription |
