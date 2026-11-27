# Baseerah Android APK Guide (Trusted Web Activity — TWA)

This guide documents how to package, sign, and distribute Baseerah as a standalone Android APK using **Trusted Web Activity (TWA)** for direct APK sharing and sideloading on mosque kiosks and tablets (no Google Play Store required).

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 Android Tablet / Kiosk                      │
├─────────────────────────────────────────────────────────────┤
│  Baseerah APK (Native TWA Shell)                            │
│  - Package ID: com.acmeone.baseerah                         │
│  - Custom Tabs Client & Digital Asset Links Verification     │
├─────────────────────────────────────────────────────────────┤
│  Chromium Runtime (System WebView / Chrome)                 │
│  - Fullscreen Standalone View (Zero Browser URL Bar)        │
│  - Service Worker (`sw.js`) with Cache Storage              │
├─────────────────────────────────────────────────────────────┤
│  Baseerah Web Application                                   │
│  - HTML5, CSS Tokens, ES Modules, IndexedDB / LocalStorage  │
│  - 100% Offline Cache: 114 Surahs, Namaz, Audio, Tajweed    │
└─────────────────────────────────────────────────────────────┘
```

A **Trusted Web Activity (TWA)** wraps the production Progressive Web App (PWA) in a lightweight Android APK.
- **Direct Sideloading**: Can be installed directly from a `.apk` file (via USB drive, download link, or MDM).
- **Zero Browser Chrome**: When Digital Asset Links are verified, Android hides the browser address bar, running Baseerah as an immersive native app.
- **Over-The-Air (OTA) Updates**: Normal web and content updates are delivered instantly via the Service Worker—no APK rebuild or re-installation needed.

---

## 2. Step 1: Generating the APK on PWABuilder.com

1. **Verify Web Deployment**:
   Ensure your latest changes are deployed on HTTPS (e.g., Netlify). PWABuilder requires an active HTTPS endpoint to validate the manifest and service worker.

2. **Open PWABuilder**:
   Navigate to [https://www.pwabuilder.com](https://www.pwabuilder.com) in your browser.

3. **Analyze the PWA**:
   - Enter your deployed URL (e.g. `https://baseerah.netlify.app/`).
   - Click **Start**.
   - PWABuilder inspects the site and should show high scores:
     - **Manifest**: Detected (`manifest.json` with `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#0E5A47"`, `lang: "ur"`, `dir: "rtl"`).
     - **Icons**: 192x192 PNG, 512x512 PNG, and 512x512 Maskable PNG with safe-zone padding.
     - **Service Worker**: Registered (`sw.js` with offline caching).
     - **Security**: 100% HTTPS.

4. **Configure Android Package**:
   - Click **Package for Stores**.
   - Under **Android**, click **Generate Package**.
   - In the package configuration form, set:
     - **Package ID**: `com.acmeone.baseerah`
     - **App Name**: `Baseerah — بصيرة`
     - **Short Name**: `Baseerah`
     - **Version Name**: `1.0.0` (must match `package.json`)
     - **Version Code**: `1` (positive integer, increment on every APK build)
     - **Host**: Your domain hostname (e.g., `baseerah.netlify.app`)
     - **Start URL**: `/`
     - **Display Mode**: `Standalone`
     - **Status Bar / Nav Bar Color**: `#0E5A47`
     - **Splash Screen Color**: `#0E5A47`
     - **Maskable Icon**: Selected (`icons/icon-512-maskable.png`)
     - **Signing Option**:
       - *Option A (First time)*: Select **Generate a new key**. PWABuilder will generate a keystore file and provide it in the download package.
       - *Option B (Existing key)*: Upload your existing `signing.keystore` / `baseerah.keystore`.

5. **Download the Package**:
   - Click **Download Package**.
   - Extract the downloaded `.zip` file on your computer. Inside you will find:
     - The signed release APK (e.g., `app-release-signed.apk` or `Baseerah.apk`).
     - The signing keystore file (e.g., `signing.keystore`).
     - A text file containing signing credentials and SHA-256 fingerprint.

---

## 3. Step 2: Digital Asset Links (assetlinks.json)

Android uses **Digital Asset Links** to verify that the APK package (`com.acmeone.baseerah`) is genuinely authorized by the web domain (`baseerah.netlify.app`). Once verified, Android removes the browser URL bar completely.

### A. Extracting the Signing Key SHA-256 Fingerprint

You can obtain the SHA-256 fingerprint using any of the following methods:

#### Method 1: From PWABuilder Download
The downloaded zip file often includes an `assetlinks.json` or `readme.txt` with the exact SHA-256 certificate fingerprint already formatted.

#### Method 2: Using Java `keytool` (from JDK)
Run the following in your terminal pointing to the keystore file:
```bash
keytool -list -v -keystore signing.keystore -alias android
```
*(Enter your keystore password when prompted)*

Look for the line:
```
Certificate fingerprints:
     SHA256: 14:6D:E9:78:2A:44:80:C3:59:B2:7D:66:81:4A:9C:5F:62:3A:D8:E1:90:5B:74:9A:8C:33:F1:40:99:4A:21:B3
```

#### Method 3: Directly from the Signed APK using `apksigner`
```bash
apksigner verify --print-certs Baseerah.apk
```
Look for:
```
Signer #1 certificate SHA-256 digest: 146de9782a4480c359b27d66814a9c5f623ad8e1905b749a8c33f140994a21b3
```
*(Format it with colons: `14:6D:E9:...`)*

---

### B. Updating `/.well-known/assetlinks.json`

Open `/.well-known/assetlinks.json` in the Baseerah repository and replace `"REPLACE_WITH_SIGNING_KEY_SHA256"` with your actual fingerprint:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.acmeone.baseerah",
      "sha256_cert_fingerprints": [
        "14:6D:E9:78:2A:44:80:C3:59:B2:7D:66:81:4A:9C:5F:62:3A:D8:E1:90:5B:74:9A:8C:33:F1:40:99:4A:21:B3"
      ]
    }
  }
]
```

Commit and push this change to `main`. Netlify will immediately publish it with:
- `Content-Type: application/json; charset=utf-8`
- `Cache-Control: public, max-age=300`

### C. Verifying AssetLinks Deployment
Test that the endpoint is reachable and returning JSON:
```bash
curl -I https://baseerah.netlify.app/.well-known/assetlinks.json
```
Output must contain:
```http
HTTP/2 200
content-type: application/json; charset=utf-8
cache-control: public, max-age=300
```

---

## 4. Step 3: Backing Up the Signing Key

> [!CAUTION]
> **CRITICAL**: The keystore file is your app's permanent cryptographic identity. If you lose this key, you will **never** be able to update an installed APK without uninstalling it first (which deletes all bookmarks, offline audio, and kiosk settings on user tablets).

1. **What to Back Up**:
   - The `.keystore` / `.jks` file (e.g. `signing.keystore` or `baseerah.keystore`).
   - The Keystore Password.
   - The Key Alias (e.g. `android` or `baseerah-key`).
   - The Key Password.
2. **Where to Store**:
   - Store the keystore and passwords in an encrypted password manager (1Password, Bitwarden, KeePass) or secure offline storage.
   - **NEVER** commit keystore files or passwords to the public Git repository.

---

## 5. Step 4: Version Bumping for Future APK Rebuilds

Android OS requires the internal `versionCode` to be **strictly increasing** for an APK to install over an existing installation.

When you need to rebuild the APK:

1. **Update `package.json`**:
   Increment the semantic version:
   ```json
   "version": "1.0.1"
   ```
2. **In PWABuilder (or Android Build Config)**:
   - Increment `versionCode`: e.g. `1` &rarr; `2`.
   - Update `versionName`: e.g. `"1.0.0"` &rarr; `"1.0.1"`.
   - **Crucial**: Sign the new APK using the **exact same signing keystore** from Step 3.
3. **Distribution**:
   The resulting APK can now be copied to the tablet and installed directly over the previous version without losing user data or settings.

---

## 6. Step 5: Why Normal Content Updates Need NO APK Rebuild

Because Baseerah runs inside a **Trusted Web Activity (TWA)**:

- The APK is simply a thin native shell that hosts the modern Chromium engine pointed at your web origin.
- **All web content, JavaScript, CSS tokens, Quran text, translations, word-by-word dictionaries, and Namaz guides reside in the web app and service worker cache.**
- Whenever you push updates to `main`:
  1. Netlify builds and deploys the new assets.
  2. The Service Worker (`sw.js`) automatically detects the update via cache versioning (`baseerah-v{version}-{hash}`).
  3. The next time a kiosk or tablet user opens Baseerah, the Service Worker claims the client and loads the latest code.
  4. Users experience instant zero-friction updates without manual APK downloads.

**You only need to rebuild the APK if:**
- You change native Android app permissions.
- You change the Android launcher icon or package name (`com.acmeone.baseerah`).
- You change the host domain or deep linking schemes.

---

## 7. Installing and Testing on Android Devices

1. **Direct Sideloading**:
   - Copy `Baseerah.apk` to an Android tablet via USB-C flash drive, Google Drive, or local HTTP server.
   - Tap the APK file in the Files app.
   - When prompted with *"For your security, your phone is not allowed to install unknown apps from this source"*, tap **Settings** and toggle **Allow from this source**.
   - Tap **Install**.

2. **First Launch (Online)**:
   - Ensure the tablet has Wi-Fi enabled on first open.
   - Launch **Baseerah** from the app drawer.
   - The TWA opens in fullscreen, verifies Digital Asset Links (hiding the URL bar), registers the Service Worker, and precaches all assets for offline operation.

3. **Verifying Offline Operation**:
   - Turn on **Airplane Mode** (disable Wi-Fi and Cellular).
   - Close Baseerah completely (swipe away from Recent Apps).
   - Tap **Baseerah** icon to launch.
   - **Verified Behavior**: The app opens instantly offline, loads the home screen, allows browsing Surahs, and runs all interactive features without network connection.
