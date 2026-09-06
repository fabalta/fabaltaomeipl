(() => {
  "use strict";

  /*
   * LOVENODE BY FABALTA — V2
   * Liquid Glass dashboard / media utility overlay.
   *
   * V2 adds:
   * - Command palette (Ctrl/Cmd + K)
   * - Toast notifications
   * - Activity log + session timeline
   * - Diagnostics/error center
   * - Persistent settings
   * - Mini/pill mode
   * - Window dragging + edge snapping
   * - Glass/animation/theme controls
   * - Keyboard shortcuts
   * - Responsive UI
   * - Local connection/media diagnostics
   *
   * Privacy note:
   * This version intentionally does not intercept peer ICE candidates,
   * collect another user's IP address, or send network information to a webhook.
   */

  const CONFIG = {
    VERSION: "2.0.0",
    STORAGE_KEY: "lovenode-liquid-glass-v2",
    STYLES: {
      FONT_AWESOME:
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
      GOOGLE_FONTS:
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
    }
  };

  const defaults = {
    theme: "dark",
    blur: 24,
    opacity: 0.82,
    glow: 0.18,
    animation: 1,
    compact: false,
    reducedMotion: false,
    mini: false,
    width: 430,
    height: 0,
    position: null
  };

  const state = {
    settings: loadSettings(),
    overlay: null,
    window: null,
    content: null,
    activity: [],
    errors: [],
    sessionStarted: Date.now(),
    lastStatus: "Várakozás...",
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    mediaRecorder: null,
    recordedChunks: [],
    globalStream: null,
    isRecording: false,
    recordStarted: null,
    timer: null
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || "{}");
      return { ...defaults, ...saved };
    } catch {
      return { ...defaults };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.settings));
    } catch {}
  }

  const utils = {
    escape(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    },

    getVideos() {
      const videos = Array.from(document.querySelectorAll("video"));
      if (!videos.length) return { local: null, remote: null };
      if (videos.length === 1) return { local: null, remote: videos[0] };
      videos.sort((a, b) => (b.videoWidth || 0) - (a.videoWidth || 0));
      return { remote: videos[0], local: videos[1] };
    },

    formatDuration(ms) {
      const total = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      return h
        ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    },

    now() {
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    },

    motion(ms) {
      return state.settings.reducedMotion
        ? 0
        : Math.max(0, ms / Math.max(0.25, state.settings.animation));
    },

    videosSummary() {
      const vids = utils.getVideos();
      const items = [];
      if (vids.remote) {
        items.push({
          label: "Távoli média",
          value: `${vids.remote.videoWidth || "?"}×${vids.remote.videoHeight || "?"}`
        });
      }
      if (vids.local) {
        items.push({
          label: "Helyi média",
          value: `${vids.local.videoWidth || "?"}×${vids.local.videoHeight || "?"}`
        });
      }
      return items;
    }
  };

  function log(type, message, meta = "") {
    const item = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time: utils.now(),
      type,
      message,
      meta
    };
    state.activity.unshift(item);
    state.activity = state.activity.slice(0, 150);
    renderActivity();
    return item;
  }

  function reportError(message, error = null) {
    state.errors.unshift({
      time: utils.now(),
      message,
      detail: error?.message || String(error || "")
    });
    state.errors = state.errors.slice(0, 50);
    log("error", message, error?.message || "");
    toast(message, "error");
    renderDiagnostics();
  }

  function toast(message, kind = "info") {
    const host = document.querySelector("#ln-toasts");
    if (!host) return;

    const icon = {
      success: "fa-check",
      error: "fa-triangle-exclamation",
      warning: "fa-circle-exclamation",
      info: "fa-sparkles"
    }[kind] || "fa-sparkles";

    const item = document.createElement("div");
    item.className = `ln-toast ln-${kind}`;
    item.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${utils.escape(message)}</span>
    `;
    host.appendChild(item);

    setTimeout(() => {
      item.classList.add("ln-toast-out");
      setTimeout(() => item.remove(), utils.motion(240));
    }, 2600);
  }

  function setStatus(text, icon = "fa-circle-notch") {
    state.lastStatus = text;
    const el = document.querySelector("#ln-status-text");
    const ico = document.querySelector("#ln-status-icon");
    if (el) el.textContent = text;
    if (ico) ico.className = `fa-solid ${icon}`;
  }

  function injectStyles() {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const fa = document.createElement("link");
      fa.rel = "stylesheet";
      fa.href = CONFIG.STYLES.FONT_AWESOME;
      fa.crossOrigin = "anonymous";
      document.head.appendChild(fa);
    }

    if (!document.querySelector("#lovenode-v2-fonts")) {
      const font = document.createElement("link");
      font.id = "lovenode-v2-fonts";
      font.rel = "stylesheet";
      font.href = CONFIG.STYLES.GOOGLE_FONTS;
      document.head.appendChild(font);
    }

    const style = document.createElement("style");
    style.id = "lovenode-v2-style";
    style.textContent = `
      :root {
        --ln-blur: ${state.settings.blur}px;
        --ln-opacity: ${state.settings.opacity};
        --ln-glow: ${state.settings.glow};
        --ln-accent: #8b7cff;
        --ln-accent-2: #55d6ff;
        --ln-bg: rgba(13, 15, 22, var(--ln-opacity));
        --ln-panel: rgba(255,255,255,.055);
        --ln-border: rgba(255,255,255,.11);
        --ln-text: #f8fafc;
        --ln-muted: #94a3b8;
        --ln-good: #65e6a6;
        --ln-warn: #ffd166;
        --ln-danger: #ff6b81;
      }

      #lovenode-v2, #lovenode-v2 * {
        box-sizing: border-box;
      }

      #lovenode-v2 {
        position: fixed;
        z-index: 2147483646;
        width: min(${Math.max(360, state.settings.width)}px, calc(100vw - 24px));
        max-height: min(760px, calc(100vh - 24px));
        color: var(--ln-text);
        font-family: Inter, system-ui, sans-serif;
        user-select: none;
        filter: drop-shadow(0 25px 70px rgba(0,0,0,.45));
        transition:
          width ${utils.motion(260)}ms cubic-bezier(.2,.8,.2,1),
          opacity ${utils.motion(220)}ms ease,
          transform ${utils.motion(260)}ms cubic-bezier(.2,.8,.2,1);
      }

      #lovenode-v2.ln-centered {
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
      }

      #lovenode-v2.ln-positioned {
        transform: none;
      }

      #lovenode-v2.ln-hidden {
        display: none;
      }

      .ln-shell {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--ln-border);
        border-radius: 28px;
        background:
          radial-gradient(circle at 10% 0%, rgba(139,124,255,.15), transparent 38%),
          radial-gradient(circle at 100% 100%, rgba(85,214,255,.10), transparent 35%),
          var(--ln-bg);
        backdrop-filter: blur(var(--ln-blur)) saturate(165%);
        -webkit-backdrop-filter: blur(var(--ln-blur)) saturate(165%);
        box-shadow:
          0 25px 80px rgba(0,0,0,.38),
          inset 0 1px rgba(255,255,255,.13),
          0 0 45px rgba(139,124,255,var(--ln-glow));
      }

      .ln-reflection {
        position: absolute;
        inset: -50% -20%;
        pointer-events: none;
        background: linear-gradient(115deg,
          transparent 30%,
          rgba(255,255,255,.07) 42%,
          transparent 52%);
        transform: rotate(-8deg);
        animation: lnShine 9s linear infinite;
      }

      @keyframes lnShine {
        from { translate: -35% 0; }
        to { translate: 35% 0; }
      }

      .ln-top {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 15px 12px;
        border-bottom: 1px solid rgba(255,255,255,.07);
        cursor: grab;
      }

      .ln-top:active { cursor: grabbing; }

      .ln-logo {
        width: 38px;
        height: 38px;
        display: grid;
        place-items: center;
        border-radius: 13px;
        background: linear-gradient(145deg, rgba(139,124,255,.32), rgba(85,214,255,.12));
        border: 1px solid rgba(255,255,255,.13);
        box-shadow: inset 0 1px rgba(255,255,255,.15);
      }

      .ln-title-wrap { min-width: 0; flex: 1; }
      .ln-title {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: .45px;
      }
      .ln-subtitle {
        margin-top: 2px;
        color: var(--ln-muted);
        font-size: 10px;
      }

      .ln-top-actions {
        display: flex;
        gap: 5px;
      }

      .ln-icon-btn, .ln-action {
        border: 1px solid rgba(255,255,255,.09);
        color: #e8edf7;
        background: rgba(255,255,255,.055);
        cursor: pointer;
        transition: transform ${utils.motion(180)}ms ease, background ${utils.motion(180)}ms ease, border-color ${utils.motion(180)}ms ease;
      }

      .ln-icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 11px;
        display: grid;
        place-items: center;
      }

      .ln-icon-btn:hover, .ln-action:hover {
        transform: translateY(-1px);
        background: rgba(255,255,255,.10);
        border-color: rgba(255,255,255,.18);
      }

      .ln-body {
        position: relative;
        max-height: calc(100vh - 150px);
        overflow: auto;
        padding: 12px;
        scrollbar-width: thin;
      }

      .ln-status {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 13px;
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 18px;
        background: rgba(255,255,255,.045);
      }

      .ln-status-icon {
        width: 34px;
        height: 34px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: rgba(101,230,166,.10);
        color: var(--ln-good);
      }

      .ln-status-main { flex: 1; min-width: 0; }
      .ln-status-label { font-size: 11px; color: var(--ln-muted); }
      .ln-status-value { margin-top: 2px; font-size: 13px; font-weight: 700; }

      .ln-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap: 8px;
        margin-top: 8px;
      }

      .ln-card {
        min-width: 0;
        padding: 12px;
        border: 1px solid rgba(255,255,255,.075);
        border-radius: 18px;
        background: var(--ln-panel);
      }

      .ln-card-label {
        color: var(--ln-muted);
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .5px;
      }

      .ln-card-value {
        margin-top: 5px;
        font-size: 17px;
        font-weight: 800;
      }

      .ln-card small {
        display: block;
        margin-top: 3px;
        color: #718096;
        font-size: 9px;
      }

      .ln-section {
        margin-top: 12px;
      }

      .ln-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 3px 7px;
      }

      .ln-section-title {
        color: #dfe7f3;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .5px;
        text-transform: uppercase;
      }

      .ln-section-action {
        color: #9b91ff;
        background: none;
        border: 0;
        cursor: pointer;
        font-size: 10px;
      }

      .ln-actions-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 7px;
      }

      .ln-action {
        min-height: 48px;
        border-radius: 15px;
        padding: 7px;
        font: inherit;
        font-size: 10px;
        font-weight: 700;
      }

      .ln-action i {
        display: block;
        margin-bottom: 4px;
        color: #a79dff;
      }

      .ln-log {
        max-height: 170px;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .ln-log-row {
        display: grid;
        grid-template-columns: 52px 18px 1fr;
        gap: 6px;
        align-items: start;
        padding: 8px;
        border-radius: 12px;
        background: rgba(255,255,255,.035);
        font-size: 10px;
      }

      .ln-log-time { color: #64748b; }
      .ln-log-message { color: #d9e1ed; line-height: 1.35; }
      .ln-log-meta { color: #64748b; margin-top: 2px; font-size: 9px; }

      .ln-dot {
        width: 7px;
        height: 7px;
        margin-top: 4px;
        border-radius: 50%;
        background: #9b91ff;
        box-shadow: 0 0 12px rgba(155,145,255,.6);
      }
      .ln-dot.error { background: var(--ln-danger); }
      .ln-dot.warning { background: var(--ln-warn); }
      .ln-dot.success { background: var(--ln-good); }

      .ln-timeline {
        position: relative;
        padding-left: 17px;
      }
      .ln-timeline::before {
        content: "";
        position: absolute;
        left: 5px;
        top: 5px;
        bottom: 5px;
        width: 1px;
        background: rgba(255,255,255,.10);
      }
      .ln-time-item {
        position: relative;
        margin-bottom: 9px;
        font-size: 10px;
      }
      .ln-time-item::before {
        content: "";
        position: absolute;
        left: -15px;
        top: 4px;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #9b91ff;
        box-shadow: 0 0 10px rgba(155,145,255,.6);
      }

      .ln-empty {
        padding: 16px;
        text-align: center;
        color: #68768a;
        font-size: 10px;
        border: 1px dashed rgba(255,255,255,.09);
        border-radius: 14px;
      }

      #ln-toasts {
        position: fixed;
        z-index: 2147483647;
        right: 18px;
        bottom: 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }

      .ln-toast {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 210px;
        max-width: 330px;
        padding: 11px 13px;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 15px;
        color: #edf2f9;
        background: rgba(15,17,25,.82);
        backdrop-filter: blur(18px);
        box-shadow: 0 16px 40px rgba(0,0,0,.30);
        animation: lnToastIn .25s cubic-bezier(.2,.9,.2,1);
        font-size: 11px;
      }
      .ln-toast i { color: #a79dff; }
      .ln-success i { color: var(--ln-good); }
      .ln-error i { color: var(--ln-danger); }
      .ln-warning i { color: var(--ln-warn); }

      .ln-toast-out {
        opacity: 0;
        transform: translateY(8px) scale(.97);
        transition: all .22s ease;
      }

      @keyframes lnToastIn {
        from { opacity: 0; transform: translateY(10px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      #ln-palette-backdrop, #ln-settings-backdrop, #ln-diagnostics-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        background: rgba(0,0,0,.30);
        backdrop-filter: blur(4px);
        display: none;
      }

      .ln-modal {
        position: fixed;
        z-index: 2147483647;
        top: 50%;
        left: 50%;
        width: min(560px, calc(100vw - 24px));
        max-height: min(680px, calc(100vh - 24px));
        transform: translate(-50%, -50%) scale(.98);
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 25px;
        background: rgba(14,16,24,.88);
        backdrop-filter: blur(28px) saturate(160%);
        box-shadow: 0 35px 100px rgba(0,0,0,.5);
      }

      .ln-modal-head {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 13px;
        border-bottom: 1px solid rgba(255,255,255,.08);
      }

      .ln-search {
        flex: 1;
        border: 0;
        outline: 0;
        color: #fff;
        background: transparent;
        font: 600 14px Inter, sans-serif;
      }

      .ln-command-list {
        max-height: 510px;
        overflow: auto;
        padding: 8px;
      }

      .ln-command {
        display: flex;
        align-items: center;
        gap: 11px;
        width: 100%;
        padding: 11px;
        border: 0;
        border-radius: 13px;
        color: #e8edf7;
        background: transparent;
        text-align: left;
        cursor: pointer;
        font: 11px Inter, sans-serif;
      }
      .ln-command:hover, .ln-command.selected {
        background: rgba(139,124,255,.14);
      }
      .ln-command i { width: 18px; color: #a79dff; }
      .ln-command span { flex: 1; }
      .ln-command kbd {
        padding: 3px 6px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 6px;
        color: #728096;
        font-size: 9px;
      }

      .ln-settings {
        padding: 14px;
        overflow: auto;
        max-height: 590px;
      }

      .ln-setting {
        padding: 12px 0;
        border-bottom: 1px solid rgba(255,255,255,.06);
      }
      .ln-setting:last-child { border-bottom: 0; }
      .ln-setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .ln-setting-name { font-size: 11px; font-weight: 700; }
      .ln-setting-desc { margin-top: 3px; color: #6f7c90; font-size: 9px; }
      .ln-range { width: 150px; accent-color: #9b91ff; }
      .ln-select {
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 9px;
        padding: 7px;
        color: #fff;
        background: rgba(255,255,255,.06);
        outline: 0;
      }
      .ln-switch {
        position: relative;
        width: 42px;
        height: 24px;
        border: 0;
        border-radius: 20px;
        background: rgba(255,255,255,.12);
        cursor: pointer;
      }
      .ln-switch::after {
        content: "";
        position: absolute;
        top: 4px;
        left: 4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #fff;
        transition: .2s ease;
      }
      .ln-switch.on { background: #8175ff; }
      .ln-switch.on::after { left: 22px; }

      .ln-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 12px 11px;
        color: #59667a;
        font-size: 9px;
      }

      .ln-mini {
        width: 190px !important;
      }
      .ln-mini .ln-body,
      .ln-mini .ln-footer { display: none; }
      .ln-mini .ln-top { border-bottom: 0; }
      .ln-mini .ln-title-wrap { min-width: 0; }
      .ln-mini .ln-subtitle { display: none; }

      @media (max-width: 620px) {
        #lovenode-v2 {
          width: calc(100vw - 16px) !important;
          left: 8px !important;
          right: 8px;
          bottom: 8px;
        }
        #lovenode-v2.ln-positioned {
          left: 8px !important;
          top: auto !important;
          bottom: 8px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #lovenode-v2 *, #lovenode-v2 *::before, #lovenode-v2 *::after {
          animation-duration: .01ms !important;
          transition-duration: .01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getPositionedStyle() {
    const p = state.settings.position;
    if (!p) return {};
    return {
      left: `${Math.max(4, Math.min(window.innerWidth - 40, p.left))}px`,
      top: `${Math.max(4, Math.min(window.innerHeight - 40, p.top))}px`,
      bottom: "auto",
      transform: "none"
    };
  }

  function applyWindowSettings() {
    const root = document.querySelector("#lovenode-v2");
    if (!root) return;

    root.style.width = `${Math.max(360, Math.min(680, state.settings.width))}px`;
    root.classList.toggle("ln-mini", state.settings.mini);
    root.classList.toggle("ln-positioned", !!state.settings.position);
    root.classList.toggle("ln-centered", !state.settings.position);
    Object.assign(root.style, getPositionedStyle());

    document.documentElement.style.setProperty("--ln-blur", `${state.settings.blur}px`);
    document.documentElement.style.setProperty("--ln-opacity", state.settings.opacity);
    document.documentElement.style.setProperty("--ln-glow", state.settings.glow);

    const compact = state.settings.compact;
    root.style.setProperty("--ln-compact", compact ? "1" : "0");
    root.querySelector(".ln-body")?.classList.toggle("ln-compact-body", compact);
  }

  function createUI() {
    document.querySelector("#lovenode-v2")?.remove();
    document.querySelector("#ln-toasts")?.remove();

    const root = document.createElement("div");
    root.id = "lovenode-v2";

    root.innerHTML = `
      <div class="ln-shell">
        <div class="ln-reflection"></div>
        <div class="ln-top" id="ln-drag-handle">
          <div class="ln-logo"><i class="fa-solid fa-sparkles"></i></div>
          <div class="ln-title-wrap">
            <div class="ln-title">LOVENODE <span style="opacity:.5">V2</span></div>
            <div class="ln-subtitle">Liquid Glass Command Center</div>
          </div>
          <div class="ln-top-actions">
            <button class="ln-icon-btn" id="ln-mini-btn" title="Mini mód"><i class="fa-solid fa-minimize"></i></button>
            <button class="ln-icon-btn" id="ln-palette-btn" title="Command Palette"><i class="fa-solid fa-command"></i></button>
            <button class="ln-icon-btn" id="ln-settings-btn" title="Beállítások"><i class="fa-solid fa-sliders"></i></button>
          </div>
        </div>

        <div class="ln-body">
          <div class="ln-status">
            <div class="ln-status-icon"><i id="ln-status-icon" class="fa-solid fa-circle-notch fa-spin"></i></div>
            <div class="ln-status-main">
              <div class="ln-status-label">RENDSZERÁLLAPOT</div>
              <div class="ln-status-value" id="ln-status-text">Várakozás...</div>
            </div>
            <div style="font-size:10px;color:#718096" id="ln-session-time">00:00</div>
          </div>

          <div class="ln-grid" id="ln-stats"></div>

          <div class="ln-section">
            <div class="ln-section-head">
              <div class="ln-section-title">Gyors műveletek</div>
              <button class="ln-section-action" id="ln-shortcuts">⌘ K</button>
            </div>
            <div class="ln-actions-grid">
              <button class="ln-action" id="ln-refresh"><i class="fa-solid fa-rotate-right"></i>Frissítés</button>
              <button class="ln-action" id="ln-screenshot"><i class="fa-solid fa-camera"></i>Fotó</button>
              <button class="ln-action" id="ln-record"><i class="fa-solid fa-circle"></i>Felvétel</button>
              <button class="ln-action" id="ln-map"><i class="fa-solid fa-map"></i>Térkép</button>
              <button class="ln-action" id="ln-copy"><i class="fa-solid fa-copy"></i>Oldal URL</button>
              <button class="ln-action" id="ln-diagnostics"><i class="fa-solid fa-heart-pulse"></i>Diagnosztika</button>
            </div>
          </div>

          <div class="ln-section">
            <div class="ln-section-head">
              <div class="ln-section-title">Aktivitás</div>
              <button class="ln-section-action" id="ln-clear-log">Törlés</button>
            </div>
            <div class="ln-log" id="ln-log"></div>
          </div>

          <div class="ln-section">
            <div class="ln-section-head">
              <div class="ln-section-title">Session Timeline</div>
            </div>
            <div class="ln-timeline" id="ln-timeline"></div>
          </div>
        </div>

        <div class="ln-footer">
          <span>Fabalta • Lovenode ${CONFIG.VERSION}</span>
          <span id="ln-media-count">0 média</span>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const toastHost = document.createElement("div");
    toastHost.id = "ln-toasts";
    document.body.appendChild(toastHost);

    state.overlay = root;
    state.window = root.querySelector(".ln-shell");
    state.content = root.querySelector(".ln-body");

    bindUI();
    applyWindowSettings();
    refreshDashboard();

    log("system", "Lovenode V2 elindult", `v${CONFIG.VERSION}`);
    setStatus("Aktív", "fa-circle-check");
  }

  function bindUI() {
    document.querySelector("#ln-mini-btn").onclick = () => {
      state.settings.mini = !state.settings.mini;
      saveSettings();
      applyWindowSettings();
      toast(state.settings.mini ? "Mini mód bekapcsolva" : "Teljes mód bekapcsolva");
      log("ui", state.settings.mini ? "Mini mód" : "Teljes mód");
    };

    document.querySelector("#ln-palette-btn").onclick = openPalette;
    document.querySelector("#ln-shortcuts").onclick = openPalette;
    document.querySelector("#ln-settings-btn").onclick = openSettings;

    document.querySelector("#ln-refresh").onclick = () => {
      refreshDashboard();
      toast("Dashboard frissítve", "success");
      log("system", "Dashboard frissítve");
    };

    document.querySelector("#ln-screenshot").onclick = () => media.takeScreenshot();
    document.querySelector("#ln-record").onclick = e => media.toggleRecording(e.currentTarget);

    document.querySelector("#ln-map").onclick = () => {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.href)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      toast("Térkép megnyitva");
      log("action", "Térkép megnyitva");
    };

    document.querySelector("#ln-copy").onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        toast("Oldal URL kimásolva", "success");
        log("action", "Oldal URL kimásolva");
      } catch (e) {
        reportError("Másolás nem engedélyezett", e);
      }
    };

    document.querySelector("#ln-diagnostics").onclick = openDiagnostics;

    document.querySelector("#ln-clear-log").onclick = () => {
      state.activity = [];
      renderActivity();
      renderTimeline();
      toast("Aktivitás törölve");
    };

    const handle = document.querySelector("#ln-drag-handle");
    handle.addEventListener("pointerdown", startDrag);
    window.addEventListener("pointermove", dragMove);
    window.addEventListener("pointerup", endDrag);

    window.addEventListener("resize", () => {
      if (state.settings.position) {
        state.settings.position.left = Math.min(
          state.settings.position.left,
          Math.max(8, window.innerWidth - rootWidth())
        );
        state.settings.position.top = Math.min(
          state.settings.position.top,
          Math.max(8, window.innerHeight - 80)
        );
        saveSettings();
        applyWindowSettings();
      }
    });
  }

  function rootWidth() {
    return state.overlay?.getBoundingClientRect().width || 430;
  }

  function startDrag(e) {
    if (e.target.closest("button")) return;
    if (window.innerWidth < 620) return;

    const rect = state.overlay.getBoundingClientRect();
    state.isDragging = true;
    state.dragOffset.x = e.clientX - rect.left;
    state.dragOffset.y = e.clientY - rect.top;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function dragMove(e) {
    if (!state.isDragging || !state.overlay) return;

    const width = rootWidth();
    const height = state.overlay.getBoundingClientRect().height;
    let left = e.clientX - state.dragOffset.x;
    let top = e.clientY - state.dragOffset.y;

    const snap = 18;
    if (Math.abs(left) < snap) left = 8;
    if (Math.abs(window.innerWidth - (left + width)) < snap) left = window.innerWidth - width - 8;
    if (Math.abs(top) < snap) top = 8;
    if (Math.abs(window.innerHeight - (top + height)) < snap) top = window.innerHeight - height - 8;

    left = Math.max(4, Math.min(window.innerWidth - width - 4, left));
    top = Math.max(4, Math.min(window.innerHeight - height - 4, top));

    state.overlay.classList.remove("ln-centered");
    state.overlay.classList.add("ln-positioned");
    state.overlay.style.left = `${left}px`;
    state.overlay.style.top = `${top}px`;
    state.overlay.style.bottom = "auto";
    state.overlay.style.transform = "none";

    state.settings.position = { left, top };
  }

  function endDrag() {
    if (!state.isDragging) return;
    state.isDragging = false;
    saveSettings();
    log("ui", "Ablak pozíció mentve");
  }

  function refreshDashboard() {
    const videos = utils.getVideos();
    const count = document.querySelectorAll("video").length;

    const stats = [
      ["Média", count, `${videos.remote ? "Távoli stream OK" : "Nincs távoli stream"}`],
      ["Session", utils.formatDuration(Date.now() - state.sessionStarted), "aktuális idő"],
      ["Böngésző", navigator.userAgent.includes("Firefox") ? "Firefox" :
        navigator.userAgent.includes("Chrome") ? "Chrome" :
        navigator.userAgent.includes("Safari") ? "Safari" : "Web", "kliens"],
      ["Online", navigator.onLine ? "ONLINE" : "OFFLINE", "böngésző hálózat"]
    ];

    document.querySelector("#ln-stats").innerHTML = stats.map(([a,b,c]) => `
      <div class="ln-card">
        <div class="ln-card-label">${utils.escape(a)}</div>
        <div class="ln-card-value">${utils.escape(b)}</div>
        <small>${utils.escape(c)}</small>
      </div>
    `).join("");

    document.querySelector("#ln-media-count").textContent = `${count} média`;
    renderActivity();
    renderTimeline();
    renderDiagnostics();
  }

  function renderActivity() {
    const el = document.querySelector("#ln-log");
    if (!el) return;

    if (!state.activity.length) {
      el.innerHTML = `<div class="ln-empty">Még nincs aktivitás.</div>`;
      return;
    }

    el.innerHTML = state.activity.slice(0, 35).map(item => `
      <div class="ln-log-row">
        <span class="ln-log-time">${utils.escape(item.time)}</span>
        <span class="ln-dot ${item.type === "error" ? "error" : item.type === "success" ? "success" : item.type === "warning" ? "warning" : ""}"></span>
        <span class="ln-log-message">
          ${utils.escape(item.message)}
          ${item.meta ? `<span class="ln-log-meta">${utils.escape(item.meta)}</span>` : ""}
        </span>
      </div>
    `).join("");
  }

  function renderTimeline() {
    const el = document.querySelector("#ln-timeline");
    if (!el) return;

    const items = state.activity.slice(0, 12).reverse();
    if (!items.length) {
      el.innerHTML = `<div class="ln-empty">A session eseményei itt jelennek meg.</div>`;
      return;
    }

    el.innerHTML = items.map(item => `
      <div class="ln-time-item">
        <div style="color:#dbe4f0;font-weight:700">${utils.escape(item.message)}</div>
        <div style="color:#657287;margin-top:2px">${utils.escape(item.time)}${item.meta ? ` • ${utils.escape(item.meta)}` : ""}</div>
      </div>
    `).join("");
  }

  function diagnosticData() {
    const videos = utils.getVideos();
    return {
      online: navigator.onLine,
      secureContext: window.isSecureContext,
      visibility: document.visibilityState,
      videos: document.querySelectorAll("video").length,
      remoteReady: !!(videos.remote && videos.remote.readyState >= 2),
      localReady: !!(videos.local && videos.local.readyState >= 2),
      mediaDevices: !!navigator.mediaDevices,
      displayCapture: !!navigator.mediaDevices?.getDisplayMedia,
      mediaRecorder: typeof MediaRecorder !== "undefined",
      errors: state.errors.length,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      userAgent: navigator.userAgent
    };
  }

  function renderDiagnostics() {
    const el = document.querySelector("#ln-diagnostics-content");
    if (!el) return;

    const d = diagnosticData();
    const rows = [
      ["Böngésző hálózat", d.online ? "ONLINE" : "OFFLINE"],
      ["Secure Context", d.secureContext ? "OK" : "NEM"],
      ["Video elemek", d.videos],
      ["Távoli média", d.remoteReady ? "READY" : "NINCS"],
      ["Helyi média", d.localReady ? "READY" : "NINCS"],
      ["Screen Capture API", d.displayCapture ? "ELÉRHETŐ" : "NEM"],
      ["MediaRecorder", d.mediaRecorder ? "ELÉRHETŐ" : "NEM"],
      ["Hibák", d.errors],
      ["Viewport", d.viewport]
    ];

    el.innerHTML = rows.map(([a,b]) => `
      <div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:10px">
        <span style="color:#7f8da1">${utils.escape(a)}</span>
        <strong>${utils.escape(b)}</strong>
      </div>
    `).join("");
  }

  function createModal(id, title, icon) {
    document.querySelector(`#${id}-backdrop`)?.remove();
    document.querySelector(`#${id}`)?.remove();

    const backdrop = document.createElement("div");
    backdrop.id = `${id}-backdrop`;
    backdrop.onclick = e => {
      if (e.target === backdrop) closeModal(id);
    };

    const modal = document.createElement("div");
    modal.id = id;
    modal.className = "ln-modal";
    modal.innerHTML = `
      <div class="ln-modal-head">
        <i class="fa-solid ${icon}" style="color:#a79dff"></i>
        <strong style="font-size:12px">${utils.escape(title)}</strong>
        <button class="ln-icon-btn" data-close><i class="fa-solid fa-xmark"></i></button>
      </div>
    `;

    modal.querySelector("[data-close]").onclick = () => closeModal(id);
    document.body.append(backdrop, modal);
    backdrop.style.display = "block";
    return modal;
  }

  function closeModal(id) {
    document.querySelector(`#${id}-backdrop`)?.remove();
    document.querySelector(`#${id}`)?.remove();
  }

  const commands = [
    ["Screenshot készítése", "fa-camera", media.takeScreenshot, "⌘⇧S"],
    ["Felvétel indítása / leállítása", "fa-circle", () => media.toggleRecording(document.querySelector("#ln-record")), "⌘⇧R"],
    ["Dashboard frissítése", "fa-rotate-right", () => {
      refreshDashboard(); toast("Dashboard frissítve", "success"); log("action", "Dashboard frissítve");
    }, "R"],
    ["Beállítások", "fa-sliders", openSettings, "S"],
    ["Diagnosztika", "fa-heart-pulse", openDiagnostics, "D"],
    ["Mini mód váltása", "fa-minimize", () => document.querySelector("#ln-mini-btn").click(), "M"],
    ["Aktivitás törlése", "fa-trash", () => {
      state.activity = []; renderActivity(); renderTimeline(); toast("Aktivitás törölve");
    }, ""]
  ];

  function openPalette() {
    const modal = createModal("ln-palette", "Command Palette", "fa-command");
    const head = modal.querySelector(".ln-modal-head");
    const input = document.createElement("input");
    input.className = "ln-search";
    input.placeholder = "Parancs keresése…";
    head.insertBefore(input, head.querySelector("[data-close]"));

    const list = document.createElement("div");
    list.className = "ln-command-list";
    modal.appendChild(list);

    let selected = 0;

    function render(filter = "") {
      const filtered = commands.filter(([name]) => name.toLowerCase().includes(filter.toLowerCase()));
      list.innerHTML = filtered.length
        ? filtered.map(([name, icon, , shortcut], i) => `
            <button class="ln-command ${i === selected ? "selected" : ""}" data-i="${i}">
              <i class="fa-solid ${icon}"></i>
              <span>${utils.escape(name)}</span>
              ${shortcut ? `<kbd>${utils.escape(shortcut)}</kbd>` : ""}
            </button>
          `).join("")
        : `<div class="ln-empty">Nincs találat.</div>`;

      list.querySelectorAll(".ln-command").forEach(btn => {
        btn.onclick = () => {
          const item = filtered[Number(btn.dataset.i)];
          closeModal("ln-palette");
          item?.[2]?.();
        };
      });
    }

    input.oninput = () => {
      selected = 0;
      render(input.value);
    };

    input.onkeydown = e => {
      const filtered = commands.filter(([name]) => name.toLowerCase().includes(input.value.toLowerCase()));
      if (e.key === "ArrowDown") {
        e.preventDefault();
        selected = Math.min(selected + 1, Math.max(0, filtered.length - 1));
        render(input.value);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selected = Math.max(0, selected - 1);
        render(input.value);
      } else if (e.key === "Enter") {
        e.preventDefault();
        closeModal("ln-palette");
        filtered[selected]?.[2]?.();
      } else if (e.key === "Escape") {
        closeModal("ln-palette");
      }
    };

    render();
    setTimeout(() => input.focus(), 0);
  }

  function openSettings() {
    const modal = createModal("ln-settings", "Lovenode Beállítások", "fa-sliders");
    const body = document.createElement("div");
    body.className = "ln-settings";

    const settingRow = (name, desc, control) => `
      <div class="ln-setting">
        <div class="ln-setting-row">
          <div>
            <div class="ln-setting-name">${name}</div>
            <div class="ln-setting-desc">${desc}</div>
          </div>
          ${control}
        </div>
      </div>
    `;

    body.innerHTML =
      settingRow("Téma", "Megjelenési mód", `
        <select class="ln-select" id="set-theme">
          <option value="dark">Dark Glass</option>
          <option value="clear">Ultra Clear</option>
          <option value="frosted">Frosted</option>
        </select>
      `) +
      settingRow("Blur", "Háttér üveg elmosása", `<input id="set-blur" class="ln-range" type="range" min="8" max="50" value="${state.settings.blur}">`) +
      settingRow("Átlátszóság", "Glass háttér erőssége", `<input id="set-opacity" class="ln-range" type="range" min=".55" max=".97" step=".01" value="${state.settings.opacity}">`) +
      settingRow("Glow", "Accent fényerő", `<input id="set-glow" class="ln-range" type="range" min="0" max=".5" step=".01" value="${state.settings.glow}">`) +
      settingRow("Animáció", "Mozgás intenzitása", `<input id="set-animation" class="ln-range" type="range" min=".25" max="1.75" step=".05" value="${state.settings.animation}">`) +
      settingRow("Kompakt mód", "Kevesebb térköz a dashboardon", `<button class="ln-switch ${state.settings.compact ? "on" : ""}" id="set-compact"></button>`) +
      settingRow("Reduced Motion", "Animációk minimalizálása", `<button class="ln-switch ${state.settings.reducedMotion ? "on" : ""}" id="set-motion"></button>`);

    modal.appendChild(body);

    const theme = body.querySelector("#set-theme");
    theme.value = state.settings.theme;
    theme.onchange = () => {
      state.settings.theme = theme.value;
      saveSettings();
      applyTheme();
      toast("Téma frissítve", "success");
    };

    body.querySelector("#set-blur").oninput = e => {
      state.settings.blur = Number(e.target.value);
      saveSettings(); applyWindowSettings();
    };
    body.querySelector("#set-opacity").oninput = e => {
      state.settings.opacity = Number(e.target.value);
      saveSettings(); applyWindowSettings();
    };
    body.querySelector("#set-glow").oninput = e => {
      state.settings.glow = Number(e.target.value);
      saveSettings(); applyWindowSettings();
    };
    body.querySelector("#set-animation").oninput = e => {
      state.settings.animation = Number(e.target.value);
      saveSettings(); applyWindowSettings();
    };

    body.querySelector("#set-compact").onclick = e => {
      state.settings.compact = !state.settings.compact;
      e.currentTarget.classList.toggle("on", state.settings.compact);
      saveSettings(); applyWindowSettings();
    };

    body.querySelector("#set-motion").onclick = e => {
      state.settings.reducedMotion = !state.settings.reducedMotion;
      e.currentTarget.classList.toggle("on", state.settings.reducedMotion);
      saveSettings(); applyWindowSettings();
    };
  }

  function applyTheme() {
    const root = document.documentElement;
    if (state.settings.theme === "clear") {
      root.style.setProperty("--ln-opacity", ".66");
      root.style.setProperty("--ln-blur", "16px");
      root.style.setProperty("--ln-glow", ".25");
    } else if (state.settings.theme === "frosted") {
      root.style.setProperty("--ln-opacity", ".88");
      root.style.setProperty("--ln-blur", "38px");
      root.style.setProperty("--ln-glow", ".10");
    } else {
      applyWindowSettings();
    }
  }

  function openDiagnostics() {
    const modal = createModal("ln-diagnostics", "Diagnosztikai központ", "fa-heart-pulse");
    const body = document.createElement("div");
    body.className = "ln-settings";
    body.innerHTML = `
      <div id="ln-diagnostics-content"></div>
      <div style="margin-top:13px">
        <div class="ln-section-title" style="margin-bottom:8px">Hibák</div>
        <div id="ln-errors"></div>
      </div>
    `;
    modal.appendChild(body);

    renderDiagnostics();
    const errors = body.querySelector("#ln-errors");
    errors.innerHTML = state.errors.length
      ? state.errors.slice(0, 15).map(e => `
          <div style="padding:8px;border-radius:10px;background:rgba(255,107,129,.06);margin-bottom:5px;font-size:9px">
            <strong style="color:#ff9aaa">${utils.escape(e.time)}</strong>
            <div style="margin-top:3px">${utils.escape(e.message)}</div>
            ${e.detail ? `<div style="color:#6f7c90;margin-top:2px">${utils.escape(e.detail)}</div>` : ""}
          </div>
        `).join("")
      : `<div class="ln-empty">Nincs rögzített hiba 🎉</div>`;
  }

  const media = {
    async takeScreenshot() {
      const raw = utils.getVideos();
      const remote = raw.remote;
      const local = raw.local;

      if (!remote && !local) {
        toast("Nincs aktív video", "warning");
        log("warning", "Screenshot sikertelen", "Nincs video elem");
        return;
      }

      try {
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (remote && remote.readyState >= 2) {
          ctx.drawImage(remote, 0, 0, canvas.width, canvas.height);
        }

        if (local && local.readyState >= 2) {
          const w = 320, h = 240;
          ctx.drawImage(local, canvas.width - w - 20, canvas.height - h - 20, w, h);
          ctx.strokeStyle = "rgba(255,255,255,.45)";
          ctx.lineWidth = 2;
          ctx.strokeRect(canvas.width - w - 20, canvas.height - h - 20, w, h);
        }

        const link = document.createElement("a");
        link.download = `lovenode-foto-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        toast("Screenshot mentve", "success");
        log("media", "Screenshot készítve");
      } catch (e) {
        reportError("Screenshot sikertelen", e);
      }
    },

    async toggleRecording(btn) {
      if (state.isRecording) {
        state.mediaRecorder?.stop();
        state.globalStream?.getTracks().forEach(t => t.stop());
        return;
      }

      if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
        toast("A böngésző nem támogatja a felvételt", "warning");
        log("warning", "Felvétel nem érhető el");
        return;
      }

      try {
        state.globalStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: "browser",
            frameRate: { ideal: 30, max: 60 },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: true
        });

        let mimeType = "video/webm";
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
          mimeType = "video/webm;codecs=vp8,opus";
        }

        state.recordedChunks = [];
        state.mediaRecorder = new MediaRecorder(state.globalStream, {
          mimeType,
          videoBitsPerSecond: 3_000_000
        });

        state.mediaRecorder.ondataavailable = e => {
          if (e.data.size) state.recordedChunks.push(e.data);
        };

        state.mediaRecorder.onstop = () => {
          const blob = new Blob(state.recordedChunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `lovenode-felvetel-${Date.now()}.webm`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 500);

          state.recordedChunks = [];
          state.isRecording = false;
          state.recordStarted = null;
          state.globalStream = null;

          btn.innerHTML = `<i class="fa-solid fa-circle"></i>Felvétel`;
          btn.classList.remove("recording-active");
          toast("Felvétel mentve", "success");
          log("media", "Felvétel mentve");
        };

        state.globalStream.getVideoTracks()[0].addEventListener("ended", () => {
          if (state.isRecording) state.mediaRecorder.stop();
        });

        state.mediaRecorder.start(1000);
        state.isRecording = true;
        state.recordStarted = Date.now();
        btn.innerHTML = `<i class="fa-solid fa-square"></i>REC ${utils.formatDuration(0)}`;
        btn.classList.add("recording-active");
        toast("Felvétel elindult", "success");
        log("media", "Felvétel elindult");
      } catch (e) {
        reportError("Felvétel indítása sikertelen", e);
      }
    }
  };

  function updateRecordingButton() {
    const btn = document.querySelector("#ln-record");
    if (!btn || !state.isRecording) return;
    btn.innerHTML = `<i class="fa-solid fa-square"></i>REC ${utils.formatDuration(Date.now() - state.recordStarted)}`;
  }

  function installShortcuts() {
    window.addEventListener("keydown", e => {
      const key = e.key.toLowerCase();

      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        openPalette();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === "s") {
        e.preventDefault();
        media.takeScreenshot();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === "r") {
        e.preventDefault();
        media.toggleRecording(document.querySelector("#ln-record"));
        return;
      }

      if (e.key === "Escape") {
        ["ln-palette", "ln-settings", "ln-diagnostics"].forEach(closeModal);
      }
    });
  }

  function installObservers() {
    const observer = new MutationObserver(() => {
      if (!state.overlay || !document.body.contains(state.overlay)) {
        createUI();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("online", () => {
      setStatus("Online", "fa-wifi");
      toast("Hálózat: online", "success");
      log("connection", "Böngésző online");
    });

    window.addEventListener("offline", () => {
      setStatus("Offline", "fa-wifi");
      toast("Hálózat: offline", "warning");
      log("warning", "Böngésző offline");
    });

    document.addEventListener("visibilitychange", () => {
      log("system", document.visibilityState === "visible" ? "Lap aktív" : "Lap háttérben");
    });

    window.addEventListener("error", e => {
      if (e?.message) reportError("Oldalhiba észlelve", e.error || e.message);
    });
  }

  function init() {
    if (document.querySelector("#lovenode-v2")) {
      document.querySelector("#lovenode-v2")?.remove();
    }

    injectStyles();
    createUI();
    installShortcuts();
    installObservers();

    state.timer = setInterval(() => {
      const session = document.querySelector("#ln-session-time");
      if (session) session.textContent = utils.formatDuration(Date.now() - state.sessionStarted);
      updateRecordingButton();
      refreshDashboard();
    }, 1000);

    applyTheme();
    console.log(`[Lovenode V2] Loaded ${CONFIG.VERSION}`);
    toast("Lovenode V2 betöltve", "success");
  }

  init();
})();
