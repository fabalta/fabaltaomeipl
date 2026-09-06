# 🍎 Lovenode — Liquid Glass UI

A compact browser-side overlay for the Fabalta OmeTV project, redesigned with an **iOS 26-inspired Liquid Glass** aesthetic.

The project adds a floating glass-style control panel to the page while keeping the existing media controls and project actions available from one place.

> **Status:** Personal / experimental browser userscript-style project  
> **Author:** Fabalta

---

## ✨ Features

### 🫧 Liquid Glass interface
- iOS 26-inspired translucent glass surface
- Strong backdrop blur and saturation
- Layered highlights and soft borders
- Rounded, floating panel design
- Subtle entrance and interaction animations
- Responsive layout for smaller screens
- Reduced-motion support
- Draggable panel using the title area
- Touch/trackpad-friendly dragging

### 🎥 Media controls
- Screenshot capture of the available video elements
- Screen recording through the browser's `getDisplayMedia()` API
- Automatic WebM recording download
- Recording-state indicator with animated UI feedback

### 🧭 Project controls
The overlay currently provides controls for:
- Refreshing the displayed connection information
- Opening the available map location
- Copying the IPv4 value
- Copying the project's UDP-related command
- Sending project information through the configured Discord integration

### 🌐 Connection information
The current implementation can display connection-related information such as:
- IPv4 / IPv6
- City
- Region
- Network / ISP organization

The project uses WebRTC ICE information and external lookup services for this functionality.

---

## 🖥️ Requirements

A modern browser with support for:

- JavaScript
- WebRTC / `RTCPeerConnection`
- `navigator.mediaDevices`
- `MediaRecorder`
- Clipboard API
- `getDisplayMedia()`
- CSS `backdrop-filter`

Firefox, Chromium-based browsers, and other modern browsers may behave differently depending on their security and permission policies.

---

## 🚀 Quick Start

### Option 1 — GitHub console loader

Once `script.js` is uploaded to the `main` branch of your repository, the script can be loaded from the browser console with:

```js
fetch('https://raw.githubusercontent.com/fabalta/fabaltaomeipl/main/script.js')
  .then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  })
  .then(code => eval(code))
  .catch(console.error);
```

### One-line version

```js
fetch('https://raw.githubusercontent.com/fabalta/fabaltaomeipl/main/script.js').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()}).then(eval).catch(console.error)
```

### Usage

1. Open the supported page.
2. Open Developer Tools.
3. Open the **Console** tab.
4. Paste the loader command.
5. Press **Enter**.
6. The Lovenode Liquid Glass overlay should appear.

Your browser may display a DevTools self-XSS warning before allowing pasted code. This is a browser security feature.

---

## 📁 Repository Structure

```text
fabaltaomeipl/
├── README.md
└── script.js
```

### `script.js`

The main self-contained JavaScript file. It contains:

- Configuration
- Application state
- Media functionality
- Project actions
- WebRTC handling
- Liquid Glass CSS
- UI creation
- Dragging behavior
- Initialization

The current implementation is intentionally packaged as a single file so it can be loaded directly from GitHub.

---

## 🎨 UI Design

The interface is built without a separate HTML page.

The script dynamically creates:

```text
Lovenode
┌───────────────────────────────────┐
│        ◉ LOVENODE • FABALTA       │
│                                   │
│  Connection / location information│
│                                   │
│ [Refresh] [Map] [UDPmix] [IPv4]   │
│ [Photo]   [Record] [Discord]      │
│                                   │
│          Készítette: Fabalta      │
└───────────────────────────────────┘
```

The styling is injected at runtime, which means the repository only needs the JavaScript file.

---

## ⚙️ Configuration

The script has a configuration section near the beginning:

```js
const CONFIG = {
  API_KEY: "...",
  WEBHOOK_URL: "...",
  STYLES: {
    FONT_AWESOME: "...",
    GOOGLE_FONTS: "..."
  }
};
```

### Important: never publish private credentials

If `API_KEY` or `WEBHOOK_URL` contains a real secret, **do not commit that secret to a public GitHub repository**.

For a public repository, move secrets to a safer server-side setup or another mechanism that does not expose them to every person downloading the script.

If a real Discord webhook or API credential has already been published publicly, rotate/revoke it and replace it.

---

## 🔐 Privacy & Security

This project interacts with browser media and connection information, so users should understand what the script does before running it.

In particular:

- Browser permissions may be requested for screen capture.
- Media capture should only be used with appropriate consent.
- Connection information can be sensitive.
- External lookup services may receive connection-related information.
- The configured Discord integration can transmit project data externally.
- Anyone who can read a public `script.js` can inspect exactly what the script executes.

Only use the script where you have permission to do so and respect the privacy and platform rules applicable to your use case.

---

## 🛠️ Updating the Script

Because the console loader pulls:

```text
https://raw.githubusercontent.com/fabalta/fabaltaomeipl/main/script.js
```

you do **not** need to create a new loader command every time you update the JavaScript.

Simply:

1. Edit `script.js`.
2. Commit the change to `main`.
3. Refresh the target page.
4. Run the same loader command again.

The loader will fetch the current version from GitHub.

---

## 🧩 Dependencies

The UI uses external resources for:

- **Font Awesome** icons
- **Google Fonts / Inter**

These are loaded by the script at runtime.

The main UI itself does not require a separate HTML or CSS file.

---

## 🐛 Troubleshooting

### Overlay does not appear

Try:

```js
location.reload()
```

Then run the loader again.

Also check the Console for JavaScript errors.

### Buttons look different

Browser rendering, installed fonts, backdrop-filter support, and page styles can affect the appearance.

### Screenshot fails

The browser may prevent drawing a video element to a canvas because of media/CORS restrictions.

### Recording fails

Make sure screen sharing is allowed when the browser asks you to choose what to share.

### Clipboard buttons do nothing

The Clipboard API normally requires a secure/allowed browser context and user interaction.

---

## 📜 License

No license is currently specified for this repository.

Unless a license is added, assume that the source is **all rights reserved** and do not redistribute or modify it for public distribution without the author's permission.

---

## 👤 Credits

**Lovenode / Fabalta**

Liquid Glass UI redesign and project integration by **Fabalta**.

---

## ⭐ Project

GitHub repository:

https://github.com/fabalta/fabaltaomeipl

Main script:

https://github.com/fabalta/fabaltaomeipl/blob/main/script.js
