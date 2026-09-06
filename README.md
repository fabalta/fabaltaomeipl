# Lovenode — Liquid Glass V2

A **Lovenode by Fabalta** egy böngészőben futó Liquid Glass dashboard/utility overlay.  
A V2 a korábbi egyszerű panelt egy sokkal teljesebb, app-szerű vezérlőközponttá alakítja.

> **Version:** 2.0.0  
> **Author:** Fabalta

## ✨ What's new in V2

### Command Palette
Nyomd meg:

- `Ctrl + K` Windows/Linux alatt
- `Cmd + K` macOS alatt

A Command Palette-ből gyorsan elérheted a fő funkciókat.

### 🪟 Liquid Glass Window
- Draggable ablak
- Edge snapping
- Ablakpozíció mentése
- Mini/pill mód
- Responsive desktop/mobile layout
- Glass blur és opacity vezérlés
- Subtle reflections és glow
- Spring-like transitions

### 📊 Live Dashboard
A dashboard mutatja többek között:

- aktuális session idő
- video elemek száma
- média állapot
- böngésző típusa
- online/offline állapot
- viewport méret
- media API-k elérhetősége

### 📝 Activity Log
A rendszer eseményeket naplóz, például:

- dashboard refresh
- screenshot
- recording
- online/offline változás
- UI módváltás
- hibák és diagnosztikai események

A log a session alatt él, és törölhető a **Törlés** gombbal.

### 🕒 Session Timeline
A fontosabb események külön timeline nézetben is megjelennek.

### ⚠️ Diagnostics Center
A diagnosztikai panel ellenőrzi például:

- browser network state
- secure context
- video elemek
- media readiness
- Screen Capture API
- MediaRecorder
- hibák száma
- viewport

### 🔔 Toast Notifications
Az alap browser alert helyett modern Liquid Glass értesítések jelennek meg.

### ⚙️ Persistent Settings
A beállítások `localStorage` segítségével megmaradnak:

- theme
- blur
- opacity
- glow
- animation intensity
- compact mode
- reduced motion
- mini mode
- window position
- window width

### 🎨 Themes
Beépített módok:

- **Dark Glass**
- **Ultra Clear**
- **Frosted**

### ♿ Reduced Motion
A mozgások csökkenthetők a beállításokban.

---

## 🎥 Media

### Screenshot

A **Fotó** gomb az aktuális video elemekből készít PNG screenshotot.

### Screen Recording

A **Felvétel** a böngésző natív Screen Capture API-ját használja.  
A böngésző saját megosztási engedélye jelenik meg, és te választod ki, mit osztasz meg.

A felvétel WebM formátumban kerül mentésre.

---

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + K` | Command Palette |
| `Ctrl/Cmd + Shift + S` | Screenshot |
| `Ctrl/Cmd + Shift + R` | Recording |
| `Esc` | Modal bezárása |

---

## 🚀 Quick Start

A script futtatásához másold be a böngésző konzoljába:

```js
fetch('https://raw.githubusercontent.com/fabalta/fabaltaomeipl/main/script.js').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()}).then(eval).catch(console.error)
```

### GitHub

Repository:

https://github.com/fabalta/fabaltaomeipl

Raw script:

https://raw.githubusercontent.com/fabalta/fabaltaomeipl/main/script.js

---

## 📁 Repository structure

```text
fabaltaomeipl/
├── README.md
└── script.js
```

---

## 🔐 Privacy / security

A V2 **nem tartalmaz WebRTC ICE-candidate interceptiont**, és nem gyűjt vagy továbbít automatikusan más felhasználók IP/network adatait.

A diagnosztikai funkciók a böngésző és a jelenlegi oldal lokálisan elérhető állapotát használják.

A screen recording csak akkor indul, ha a böngésző natív megosztási engedélyével kiválasztod a rögzítendő tartalmat.

**Fontos:** ne tegyél API kulcsokat, webhook URL-eket vagy más titkos credentialt nyilvános client-side JavaScriptbe.

---

## 🧩 Browser compatibility

A legtöbb modern Chromium/Firefox/Safari böngészővel működhet.

Egyes funkciók böngészőfüggők:

- Screen Capture API
- MediaRecorder
- Clipboard API
- Backdrop filter
- modern CSS animations

Ha egy API nem támogatott, a dashboard ezt a Diagnostics Centerben jelzi.

---

## 🛠️ Updating

A GitHubból betöltött verzió mindig a repository `main/script.js` aktuális tartalmát tölti be.

Ha frissíted a GitHubon a `script.js` fájlt, ugyanaz a console loader használható.

---

## ⚠️ Troubleshooting

### A panel nem jelenik meg

Próbáld:

1. Frissíteni az oldalt.
2. Újra futtatni a console commandot.
3. Megnézni a browser console hibáit.

### A screenshot nem működik

Lehet, hogy nincs megfelelően betöltött `<video>` elem, vagy a böngésző biztonsági korlátozása megakadályozza a canvas használatát.

### A recording nem indul

Ellenőrizd:

- támogatja-e a böngésző a Screen Capture API-t
- engedélyezted-e a megosztást
- elérhető-e a `MediaRecorder`

A Diagnostics Center segít ezeket ellenőrizni.

---

## 📌 Design philosophy

A V2 célja, hogy a Lovenode ne egy egyszerű floating panelnek érződjön, hanem egy kis **desktop-style command centernek**:

> glass + motion + diagnostics + shortcuts + persistent settings

---

## License

A projekt licencelése nincs külön meghatározva. Ha mások számára publikálod vagy terjeszted, érdemes külön `LICENSE` fájlt hozzáadni.
