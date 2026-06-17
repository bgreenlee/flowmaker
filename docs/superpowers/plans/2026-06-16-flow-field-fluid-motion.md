# Flow-Field Fluid Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an additive curl-noise flow field that bends the existing strokes into constantly-changing water/smoke-like motion, with `flow = 0` reproducing today's behavior exactly.

**Architecture:** A new pure `noise.ts` module provides 3D value noise and a divergence-free `curl2` velocity field. The engine keeps its existing straight-line conveyor and, per blob in `writeQuads`, displaces the blob's world position (and nudges its orientation) by the local curl vector. A module-level `flowTime` advances each frame so the field morphs over time. Three new sliders (`Flow`, `Flow Scale`, `Flow Drift`) live in the Motion folder; none trigger a stroke rebuild.

**Tech Stack:** TypeScript, WebGL 1 (vanilla), React 19, Vite 8, Vitest (added in Task 1).

## Global Constraints

- Use `any` instead of `interface{}` (Go rule — N/A here, no Go).
- Engine stays framework-agnostic: no React imports in `src/engine/`.
- `flow = 0` MUST yield output pixel-identical to the pre-feature engine, for any `flowScale` / `flowDrift` and any `turbulence`.
- `turbulence` config key and its Stroke-folder slider remain unchanged.
- Flow sliders must NOT call `rebuildStrokes()` (per-frame displacement only).
- `npm run build` (`tsc -b && vite build`) and `npm run lint` must pass after every task.

---

### Task 1: Add Vitest test runner

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Modify: `vite.config.ts`
- Modify: `tsconfig.app.json`
- Test: `src/engine/sanity.test.ts` (created, then deleted in Step 6)

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test` command (`vitest run`) usable by all later tasks.

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add the test script to `package.json`**

In the `"scripts"` block, add a `test` entry alongside the existing scripts:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Enable Vitest config in `vite.config.ts`**

Replace the whole file with (imports `defineConfig` from `vitest/config` so the `test` field type-checks):

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/flowmaker/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Exclude test files from the production type-check build**

In `tsconfig.app.json`, add an `exclude` key after the `include` line so `tsc -b` does not compile test files into the build:

```json
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
```

- [ ] **Step 5: Write a sanity test to prove the runner works**

Create `src/engine/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs the test runner', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run the test, confirm it passes, then delete the sanity file**

Run: `npm test`
Expected: PASS — 1 passed.

Then delete it:

```bash
rm src/engine/sanity.test.ts
```

- [ ] **Step 7: Verify build and lint still pass**

Run: `npm run build && npm run lint`
Expected: both succeed with no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.app.json
git commit -m "chore: add Vitest test runner"
```

---

### Task 2: `noise3` — 3D value noise

**Files:**
- Create: `src/engine/noise.ts`
- Test: `src/engine/noise.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export function noise3(x: number, y: number, z: number): number` — smooth (quintic-interpolated) hash-based 3D value noise. Deterministic; output in range `[0, 1)`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/noise.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { noise3 } from './noise';

describe('noise3', () => {
  it('is deterministic for the same inputs', () => {
    expect(noise3(1.23, 4.56, 7.89)).toBe(noise3(1.23, 4.56, 7.89));
  });

  it('stays within [0, 1)', () => {
    for (let i = 0; i < 500; i++) {
      const v = noise3(i * 0.37, -i * 1.13, i * 0.05);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is smooth: nearby samples are close', () => {
    let maxJump = 0;
    for (let i = 0; i < 200; i++) {
      const x = i * 0.011;
      const a = noise3(x, 3.3, 0.7);
      const b = noise3(x + 0.01, 3.3, 0.7);
      maxJump = Math.max(maxJump, Math.abs(a - b));
    }
    // A 0.01 step over unit-spaced lattice must not jump wildly.
    expect(maxJump).toBeLessThan(0.1);
  });

  it('actually varies across space (not constant)', () => {
    const vals = [noise3(0.5, 0.5, 0), noise3(5.5, 2.1, 0), noise3(11.2, 8.8, 0)];
    const allEqual = vals.every((v) => v === vals[0]);
    expect(allEqual).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./noise` / `noise3` is not a function.

- [ ] **Step 3: Implement `noise3`**

Create `src/engine/noise.ts`:

```ts
// ─── Smooth hash-based 3D value noise + divergence-free curl ──────────────────
// Pure, framework-agnostic. noise3 returns [0, 1); curl2 returns a 2D velocity
// vector that is the perpendicular gradient of noise3 (so it is divergence-free).

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Integer-lattice hash → [0, 1). Self-contained, no external seed state.
function lhash(ix: number, iy: number, iz: number): number {
  let h = Math.imul(ix | 0, 0x27d4eb2d);
  h = Math.imul(h ^ (iy | 0), 0x165667b1);
  h = Math.imul(h ^ (iz | 0), 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export function noise3(x: number, y: number, z: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const fx = x - x0;
  const fy = y - y0;
  const fz = z - z0;
  const ux = fade(fx);
  const uy = fade(fy);
  const uz = fade(fz);

  const c000 = lhash(x0, y0, z0);
  const c100 = lhash(x0 + 1, y0, z0);
  const c010 = lhash(x0, y0 + 1, z0);
  const c110 = lhash(x0 + 1, y0 + 1, z0);
  const c001 = lhash(x0, y0, z0 + 1);
  const c101 = lhash(x0 + 1, y0, z0 + 1);
  const c011 = lhash(x0, y0 + 1, z0 + 1);
  const c111 = lhash(x0 + 1, y0 + 1, z0 + 1);

  const x00 = lerp(c000, c100, ux);
  const x10 = lerp(c010, c110, ux);
  const x01 = lerp(c001, c101, ux);
  const x11 = lerp(c011, c111, ux);

  const y0i = lerp(x00, x10, uy);
  const y1i = lerp(x01, x11, uy);

  return lerp(y0i, y1i, uz);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all `noise3` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/noise.ts src/engine/noise.test.ts
git commit -m "feat: add 3D value noise (noise3)"
```

---

### Task 3: `curl2` — divergence-free velocity field

**Files:**
- Modify: `src/engine/noise.ts`
- Modify: `src/engine/noise.test.ts`

**Interfaces:**
- Consumes: `noise3` from Task 2.
- Produces:
  - `export const CURL_EPS = 1e-3` — the finite-difference epsilon used inside `curl2` (exported so tests can match it for exact divergence cancellation).
  - `export function curl2(x: number, y: number, t: number): [number, number]` — perpendicular gradient of `noise3(., ., t)`: `[∂ψ/∂y, −∂ψ/∂x]`. Divergence-free by construction.

- [ ] **Step 1: Write the failing tests**

Append to `src/engine/noise.test.ts`:

```ts
import { curl2, CURL_EPS } from './noise';

describe('curl2', () => {
  it('is deterministic', () => {
    expect(curl2(1.5, 2.5, 0.3)).toEqual(curl2(1.5, 2.5, 0.3));
  });

  it('produces non-trivial (non-zero) velocity somewhere', () => {
    let maxMag = 0;
    for (let i = 0; i < 200; i++) {
      const [vx, vy] = curl2(i * 0.13, i * 0.27, 0.1);
      maxMag = Math.max(maxMag, Math.hypot(vx, vy));
    }
    expect(maxMag).toBeGreaterThan(0.01);
  });

  it('is perpendicular to the noise gradient (it is a rotated gradient)', () => {
    const e = CURL_EPS;
    for (let i = 0; i < 100; i++) {
      const x = i * 0.21 + 0.05;
      const y = i * 0.17 + 0.05;
      const t = i * 0.03;
      const gx = (noise3(x + e, y, t) - noise3(x - e, y, t)) / (2 * e);
      const gy = (noise3(x, y + e, t) - noise3(x, y - e, t)) / (2 * e);
      const [vx, vy] = curl2(x, y, t);
      // curl = (gy, -gx) ⇒ dot with gradient (gx, gy) is exactly 0.
      expect(Math.abs(vx * gx + vy * gy)).toBeLessThan(1e-9);
    }
  });

  it('is divergence-free (∂vx/∂x + ∂vy/∂y ≈ 0)', () => {
    const h = CURL_EPS; // matched stencil ⇒ exact cancellation to float noise
    for (let i = 0; i < 100; i++) {
      const x = i * 0.31 + 0.07;
      const y = i * 0.23 + 0.07;
      const t = i * 0.05;
      const dvx_dx = (curl2(x + h, y, t)[0] - curl2(x - h, y, t)[0]) / (2 * h);
      const dvy_dy = (curl2(x, y + h, t)[1] - curl2(x, y - h, t)[1]) / (2 * h);
      expect(Math.abs(dvx_dx + dvy_dy)).toBeLessThan(1e-6);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — `curl2` / `CURL_EPS` not exported.

- [ ] **Step 3: Implement `curl2`**

Append to `src/engine/noise.ts`:

```ts
export const CURL_EPS = 1e-3;

export function curl2(x: number, y: number, t: number): [number, number] {
  const e = CURL_EPS;
  const dPsiDy = (noise3(x, y + e, t) - noise3(x, y - e, t)) / (2 * e);
  const dPsiDx = (noise3(x + e, y, t) - noise3(x - e, y, t)) / (2 * e);
  return [dPsiDy, -dPsiDx];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS — all `curl2` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/noise.ts src/engine/noise.test.ts
git commit -m "feat: add divergence-free curl2 velocity field"
```

---

### Task 4: Add flow config keys

**Files:**
- Modify: `src/engine/config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: three new `Config` fields read by the engine and UI — `flow: number`, `flowScale: number`, `flowDrift: number`.

- [ ] **Step 1: Add the fields to the `Config` interface**

In `src/engine/config.ts`, add three lines to the `Config` interface immediately after `turbulence: number;`:

```ts
  turbulence: number;
  flow: number;
  flowScale: number;
  flowDrift: number;
```

- [ ] **Step 2: Add the defaults to the `cfg` singleton**

In the `cfg` object, add three lines immediately after `turbulence: 3,`:

```ts
  turbulence: 3,
  flow: 4,
  flowScale: 5,
  flowDrift: 4,
```

- [ ] **Step 3: Verify the build type-checks**

Run: `npm run build`
Expected: PASS (no type errors; new fields are present on `cfg`).

- [ ] **Step 4: Commit**

```bash
git add src/engine/config.ts
git commit -m "feat: add flow/flowScale/flowDrift config keys"
```

---

### Task 5: Wire the flow field into the engine

**Files:**
- Modify: `src/engine/engine.ts`

**Interfaces:**
- Consumes: `curl2` from `./noise`; `cfg.flow`, `cfg.flowScale`, `cfg.flowDrift` from Task 4; existing module vars `blobR`, `halfLen`, `cfg.angle`.
- Produces: per-frame flow displacement. No new exported symbols. `flow = 0` leaves output identical to before.

- [ ] **Step 1: Import `curl2`**

At the top of `src/engine/engine.ts`, below the existing `import { cfg } from './config';`, add:

```ts
import { cfg } from './config';
import { curl2 } from './noise';
```

- [ ] **Step 2: Add module state for the flow field**

Find this block:

```ts
let flowAxisLen = 0,
  perpAxisLen = 0,
  flowPeriod = 0,
  flowMargin = 0,
  centerAlong = 0,
  centerPerp = 0;
```

Add a new declaration block right after it:

```ts
let flowStrength = 0,
  flowInvScale = 0,
  flowBend = 0,
  flowTime = 0;
```

- [ ] **Step 3: Reserve recycle margin for the maximum flow displacement**

In `computeFlowGeometry()`, replace this line:

```ts
  flowMargin = (halfLen + blobR) * 1.6;
```

with (reserve margin for full-strength flow so changing `flow` never causes edge popping, and no rebuild is needed):

```ts
  const maxFlowDisp = blobR * 4.0;
  flowMargin = (halfLen + blobR) * 1.6 + maxFlowDisp;
```

- [ ] **Step 4: Compute per-frame flow parameters in `drawFrame`**

In `drawFrame()`, find:

```ts
  const palette = computeTonePalette();
  let totalBlobs = 0;
```

Insert the flow-parameter computation immediately before `const palette`:

```ts
  const tflow = norm(cfg.flow, 0, 10);
  flowStrength = tflow * blobR * 4.0;
  flowInvScale = 1 / lerp(120, 1400, norm(cfg.flowScale, 1, 10));
  flowBend = tflow * 0.5;

  const palette = computeTonePalette();
  let totalBlobs = 0;
```

- [ ] **Step 5: Displace each blob by the curl vector in `writeQuads`**

In `Stroke.writeQuads`, find this block inside the `for (const b of this.blobs)` loop:

```ts
      const wx = scx + ca * b.along - sa * b.perp;
      const wy = scy + sa * b.along + ca * b.perp;
      const wa = cfg.angle + b.localAngleDelta;
      const a = alph * b.alphaFactor;
      const cw = Math.cos(wa),
        sw = Math.sin(wa);
```

Replace it with (note `wx`, `wy`, `wa` become `let`, and `cw`/`sw` are computed after displacement so the orientation nudge is included):

```ts
      let wx = scx + ca * b.along - sa * b.perp;
      let wy = scy + sa * b.along + ca * b.perp;
      let wa = cfg.angle + b.localAngleDelta;

      if (flowStrength > 0) {
        const [fvx, fvy] = curl2(wx * flowInvScale, wy * flowInvScale, flowTime);
        wx += fvx * flowStrength;
        wy += fvy * flowStrength;
        wa += Math.sin(Math.atan2(fvy, fvx) - cfg.angle) * flowBend;
      }

      const a = alph * b.alphaFactor;
      const cw = Math.cos(wa),
        sw = Math.sin(wa);
```

- [ ] **Step 6: Advance `flowTime` each frame in `tick`**

In `tick()`, find:

```ts
  const pxPerFrame = Math.pow(10, lerp(-0.52, 0.92, norm(cfg.speed, 1, 10)));
  for (const s of strokes) s.advance(pxPerFrame);
  drawFrame();
```

Replace with (advance the field; frozen automatically when paused since `tick` stops):

```ts
  const pxPerFrame = Math.pow(10, lerp(-0.52, 0.92, norm(cfg.speed, 1, 10)));
  for (const s of strokes) s.advance(pxPerFrame);
  flowTime += lerp(0.0008, 0.02, norm(cfg.flowDrift, 1, 10));
  drawFrame();
```

- [ ] **Step 7: Verify build and lint pass**

Run: `npm run build && npm run lint`
Expected: both succeed with no errors.

- [ ] **Step 8: Manual visual check**

Run: `npm run dev`, open http://localhost:5173.
Expected: strokes now swirl and meander (flow defaults to 4), and the motion visibly reshapes over time rather than sliding rigidly.

- [ ] **Step 9: Commit**

```bash
git add src/engine/engine.ts
git commit -m "feat: displace strokes by curl-noise flow field"
```

---

### Task 6: Add the Flow controls to the sidebar

**Files:**
- Modify: `src/components/FlowmakerControls.tsx`

**Interfaces:**
- Consumes: `cfg.flow`, `cfg.flowScale`, `cfg.flowDrift`; existing `useNumCfg` hook; `Slider`, `Folder` from `dialkit`.
- Produces: three sliders in the Motion folder. None pass `rebuild`, so dragging is smooth and never resets strokes.

- [ ] **Step 1: Add config hooks**

In `FlowmakerControls()`, find:

```ts
  const [speed, setSpeed] = useNumCfg('speed');
```

Add three lines immediately after it (no `rebuild` argument — per-frame displacement):

```ts
  const [speed, setSpeed] = useNumCfg('speed');
  const [flow, setFlow] = useNumCfg('flow');
  const [flowScale, setFlowScale] = useNumCfg('flowScale');
  const [flowDrift, setFlowDrift] = useNumCfg('flowDrift');
```

- [ ] **Step 2: Add the sliders to the Motion folder**

Find the Motion folder:

```tsx
      <Folder title="Motion" defaultOpen={false}>
        <Slider label="Speed" value={speed} onChange={setSpeed} min={1} max={10} step={1} />
      </Folder>
```

Replace it with (open by default now that it holds the flagship controls, and add the three sliders):

```tsx
      <Folder title="Motion" defaultOpen>
        <Slider label="Speed" value={speed} onChange={setSpeed} min={1} max={10} step={1} />
        <Slider label="Flow" value={flow} onChange={setFlow} min={0} max={10} step={1} />
        <Slider label="Flow Scale" value={flowScale} onChange={setFlowScale} min={1} max={10} step={1} />
        <Slider label="Flow Drift" value={flowDrift} onChange={setFlowDrift} min={1} max={10} step={1} />
      </Folder>
```

- [ ] **Step 3: Verify build and lint pass**

Run: `npm run build && npm run lint`
Expected: both succeed with no errors.

- [ ] **Step 4: Manual visual check**

Run: `npm run dev`.
Expected:
- The Motion folder is open and shows Speed, Flow, Flow Scale, Flow Drift.
- Dragging **Flow** to 0 reproduces the original straight directional flow (try with the animation playing); raising it increases swirl.
- **Flow Scale** moves from tight churn (low) to broad billows (high).
- **Flow Drift** changes how fast the field morphs.
- Dragging any of the three is smooth and does not reset/re-seed the strokes.

- [ ] **Step 5: Commit**

```bash
git add src/components/FlowmakerControls.tsx
git commit -m "feat: add Flow, Flow Scale, Flow Drift controls"
```

---

## Self-Review

**Spec coverage:**
- Curl-noise approach → Tasks 2–3. ✓
- `noise.ts` module (`noise3`, `curl2`) → Tasks 2–3. ✓
- Additive integration / per-blob displacement + orientation nudge → Task 5 (Steps 4–5). ✓
- `flowTime` advanced per frame, frozen when paused → Task 5 (Step 6); frozen because `tick` stops on pause. ✓
- Recycle margin reserves max flow displacement → Task 5 (Step 3). ✓
- `turbulence` unchanged; `computeBlobOffsets` untouched → not modified by any task. ✓
- Config keys with defaults (`flow: 4`, `flowScale: 5`, `flowDrift: 4`) → Task 4. ✓
- Three sliders in Motion folder, no rebuild → Task 6. ✓
- `flow = 0` reproduces today exactly → guaranteed by the `if (flowStrength > 0)` guard in Task 5 Step 5; verified in Task 6 Step 4.
- Noise unit tests (smooth, deterministic, divergence-free) → Tasks 2–3. ✓
- Test runner setup (spec assumed; project had none) → Task 1. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows full code. ✓

**Type consistency:** `noise3(x,y,z): number`, `curl2(x,y,t): [number,number]`, `CURL_EPS` used identically across Tasks 2/3/5 and tests. `flow`/`flowScale`/`flowDrift` keys named identically across Tasks 4/5/6. Module vars `flowStrength`/`flowInvScale`/`flowBend`/`flowTime` declared in Task 5 Step 2 and used in Steps 4–6. ✓

**Paused-preview note:** Non-rebuild sliders call `drawFrame()` when paused (existing `useNumCfg` behavior), so Flow sliders update a paused frame using the current frozen `flowTime`. ✓
