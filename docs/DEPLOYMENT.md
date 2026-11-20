# Baseerah (بصيرة) — Commercial Kiosk Deployment Manual

This manual provides complete instructions for deploying Baseerah v1.0.0 on unattended commercial touch kiosks and tablets in mosques, Islamic centers, and public institutions.

---

## 1. Hardware Requirements

- **Device:** Android Tablet or Industrial Touch Panel (10.1" to 13.3" IPS screen).
- **Minimum Resolution:** 1280 × 800 (Recommended: 1920 × 1200).
- **Aspect Ratio:** 16:10 or 16:9 (Landscape or Portrait supported).
- **RAM & Storage:** 3 GB RAM, 16 GB internal flash.
- **Power:** Continuous AC wall power with surge protector.
- **Enclosure:** Metal or hardened acrylic kiosk enclosure with concealed home/power buttons.

---

## 2. Android Deployment via Fully Kiosk Browser

Fully Kiosk Browser is the industry standard kiosk launcher for commercial Android tablets.

### Installation & Setup:
1. Install **Fully Kiosk Browser & Launcher** from Google Play Store or APK.
2. In Fully Kiosk settings:
   - **Web Browsing:**
     - *Start URL:* `http://localhost:8080/index.html` (or hosted local IP / PWA URL).
     - *Enable JavaScript:* Yes.
     - *Enable DOM Storage:* Yes.
     - *Enable IndexedDB:* Yes.
     - *Ignore SSL Errors:* Off (or On for self-signed intranet).
   - **Kiosk Mode (Lockdown):**
     - *Enable Kiosk Mode:* Yes.
     - *Kiosk PIN:* Set secure 4-to-6 digit pin (do not share with public).
     - *Disable Status Bar:* Yes.
     - *Disable Navigation Bar:* Yes (hide back/home/recent buttons).
     - *Block Back Button:* Yes.
     - *Disable Power Button Menu:* Yes.
   - **Device Management:**
     - *Keep Screen On:* Yes.
     - *Screen Off Schedule:* Sleep between 10:30 PM and 4:30 AM (optional energy saver).
   - **Toolbars & Touch:**
     - *Enable Pull to Refresh:* **NO** (Disable).
     - *Enable Pinch to Zoom:* **NO** (Disable).
     - *Text Selection:* **NO** (Disable).
     - *Context Menu:* **NO** (Disable).

---

## 3. Chrome Kiosk Mode (Windows / Linux / Raspberry Pi)

For x86 kiosk units running Windows 10/11 IoT or Linux:

### Windows Launch Shortcut:
```bat
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --kiosk ^
  --incognito ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --disable-features=TranslateUI ^
  --no-first-run ^
  --fast ^
  --fast-start ^
  --check-for-update-interval=31536000 ^
  http://localhost:8080/index.html
```

---

## 4. Serving Locally (100% Offline)

Baseerah requires **no active internet connection** at runtime. Because modern browsers enforce CORS restrictions on ES modules when accessed via `file://`, serve Baseerah through a lightweight local HTTP server:

### Option A: Python Built-in Server
```bash
cd /path/to/baseerah
python -m http.server 8080 --bind 127.0.0.1
```

### Option B: Android Local Web Server App
Install **Simple HTTP Server** or **KSWEB** on Android to serve the `baseerah` folder on port 8080 automatically on device boot.

### Option C: PWA Offline Caching
Open the kiosk URL once online or on the local server; the Service Worker (`sw.js`) automatically caches the app shell, fonts, and data for permanent offline operation.

---

## 5. Mosque Respect Mode Setting

Mosques require silence during prayer times and recitation:
1. Baseerah ships with **Mosque Respect Mode (Global Mute) enabled by default**.
2. If audio recitation is ever desired during non-prayer hours:
   - Tap the brand logo 5 times rapidly.
   - Enter Admin PIN (`1234`).
   - Toggle Mosque Respect Mode off or adjust the idle timeout.
