# Lovenode Liquid Glass UI

A polished Liquid Glass-style UI rework for the Lovenode browser script.

## Install / use

1. Create a GitHub repository and upload `script.js` and this `README.md`.
2. Replace `YOUR_USERNAME` and `YOUR_REPO` in the loader below.
3. Open the target page in your browser, open DevTools → Console, and paste the loader.

### One-line console loader

```js
fetch('https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/script.js').then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text()}).then(eval).catch(console.error)
```

## Updating

Replace `script.js` in the repository whenever you publish a new version. The console loader always fetches the current `main` branch version.

## Notes

- The repository is intended to distribute the UI script as a single JavaScript file.
- Only run console code you trust and have reviewed.
- This package preserves the existing script behavior while reworking the presentation into a Liquid Glass-inspired interface.
