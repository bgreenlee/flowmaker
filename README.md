# Flowmaker

A generative paint tool. Real-time WebGL stroke synthesis with tunable
brush, motion, and grain controls — used to generate brand assets for TK
and related Medium projects.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run lint
```

## Stack

- React 19 + Vite 8 + TypeScript
- WebGL 1 (vanilla, no Three.js)
- [@melloware/coloris](https://www.npmjs.com/package/@melloware/coloris) for color pickers

## Structure

```
src/
├── main.tsx                 # React root
├── App.tsx                  # Layout + Coloris init
├── App.css                  # Global styles
├── engine/                  # WebGL drawing engine (framework-agnostic)
│   ├── config.ts            # Config type + shared cfg singleton + swatch palette
│   └── engine.ts            # Shaders, draw loop, stroke pool, resize, export
└── components/              # React UI
    ├── Canvas.tsx           # Mounts canvas, calls engine.init()
    ├── Sidebar.tsx          # Composes all controls
    ├── Slider.tsx           # Reusable labeled range slider
    ├── ColorSwatches.tsx    # Ink + Paper Coloris swatches
    └── AnglePicker.tsx      # Custom SVG angle dial
```

The engine is intentionally kept outside React. Components mutate the
shared `cfg` object directly and call `drawFrame()` or `rebuildStrokes()`
imperatively — React owns the chrome, the engine owns the canvas.

## History

The original single-file vanilla HTML/JS prototype lives at the
`v1-vanilla` tag.
