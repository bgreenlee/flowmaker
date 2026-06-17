# Flow-Field Fluid Motion — Design

**Date:** 2026-06-16
**Status:** Approved for planning

## Problem

The current animation moves rigid stroke shapes in a straight line along a
fixed `cfg.angle` at constant speed. Each stroke's internal wiggle
(`computeBlobOffsets`) is computed once at construction with a frozen
`warpPhase`, so the shape never changes — the loop only does
`progress += pxPerFrame`. The result reads as a conveyor belt, not a fluid.

We want motion that looks like water or smoke: constantly changing, swirling,
organic — while keeping the existing directional flow available.

## Goal

Add an **additive flow-field mode** layered on top of the existing directional
conveyor. At zero strength the output is pixel-identical to today. Turning it up
bends strokes along an evolving, swirl-like flow field, spanning tight churning
turbulence through broad slow billows. The character (scale and morph speed) is
tunable.

## Approach: curl noise

Fluids read as "alive" because their motion is divergence-free — they swirl and
fold but never pile up or vanish. We fake this with **curl noise**: take a smooth
scalar noise field ψ(x, y, t) and use its perpendicular gradient as a velocity
field:

```
v = ( ∂ψ/∂y , −∂ψ/∂x )
```

This `v` is divergence-free by construction (it's the curl of a potential), so it
produces the swirling, eddying look of smoke/water with no sources or sinks.

Making ψ **3D**, with time as the third axis, means the whole field slowly morphs
over time — so the pattern is "constantly changing" rather than a fixed set of
eddies the strokes merely pass through.

## How it integrates (additive — Flow = 0 is identical to today)

Keep the existing conveyor: `tick()` still advances each stroke's `progress`
along `cfg.angle` at `Speed`. This remains the directional "current" base.

In `Stroke.writeQuads`, after computing each blob's world position
`(wx, wy)`, sample the flow field and displace the blob before writing it to the
vertex buffer:

```
v   = curl2(wx * invScale, wy * invScale, flowTime)
wx += v.x * flowStrength
wy += v.y * flowStrength
wa += angleTowardFlow(v) * flowStrength   // bend the blob into the current
```

Because the field is sampled **per blob along the stroke**, each stroke bends
along a curving streamline (the ink-in-water look). Because `flowTime` advances
every frame, the streamlines themselves drift and reshape over time.

At `flow = 0`, displacement is zero and `wa` is unchanged → pixel-identical to
current behavior.

## New module: `src/engine/noise.ts`

Framework-agnostic, pure, unit-testable.

- `noise3(x, y, z): number` — hash-based 3D value noise with smooth
  (smoothstep / quintic) interpolation between lattice points. Range ~[0, 1] or
  [-1, 1] (decide in implementation; document it). Deterministic given inputs.
- `curl2(x, y, t): [number, number]` — perpendicular gradient of `noise3(.,.,t)`
  computed via finite differences (small epsilon). Returns an approximately
  divergence-free 2D velocity vector.

The lattice hash should be self-contained (no external seed state) so the field
is stable across frames and only changes when `t` advances.

## Engine changes (`src/engine/engine.ts`)

- New module var `flowTime` (number), advanced in `tick()` by a `flowDrift`-
  derived rate. When paused, `flowTime` is frozen so the paused preview still
  shows the current displaced frame.
- `computeParams()` reads the three new config values and derives:
  - `flowStrength` — displacement amplitude in px, scaled by `blobR` so it tracks
    stroke size. Driven by `cfg.flow`.
  - `flowInvScale` — `1 / spatialScale`, where larger `cfg.flowScale` → larger
    spatial wavelength (broad billows), smaller → tight churn.
  - `flowDriftRate` — per-frame increment for `flowTime`, driven by
    `cfg.flowDrift`.
- `computeFlowGeometry()` folds the max possible flow displacement into
  `flowMargin` so displaced strokes still recycle fully off-screen and the
  seamless wrap is preserved.
- `writeQuads()` samples `curl2` per blob and applies displacement + blob
  rotation as above.
- The intrinsic per-stroke wiggle in `computeBlobOffsets` (currently driven by
  `cfg.turbulence`) is **baked in at a fixed modest level** equal to the current
  default (`turbulence = 3` → `turbAmt = 0.3`), so static stills still look
  organic at Flow = 0. `computeBlobOffsets` no longer reads `cfg.turbulence`.

## Config changes (`src/engine/config.ts`)

Repurpose the existing `turbulence` key as flow-field strength and rename the
control; add two new keys. Net UI change: +2 sliders.

- `flow: number` (0–10) — flow-field displacement strength. Replaces
  `turbulence`. Default `3`.
- `flowScale: number` (1–10) — spatial scale: tight churn → broad billows.
  Default `5`.
- `flowDrift: number` (1–10) — how fast the field morphs over time. Default `4`.

`turbulence` is removed from the `Config` interface and the `cfg` singleton.

## UI changes (`src/components/FlowmakerControls.tsx`)

- Remove the `Turbulence` slider from the **Stroke** folder.
- In the **Motion** folder, alongside `Speed`, add:
  - `Flow` (0–10)
  - `Flow Scale` (1–10)
  - `Flow Drift` (1–10)
- These three sliders use `useNumCfg(key)` **without** `rebuild` — displacement
  is computed per frame, so no `rebuildStrokes()` is needed. This keeps dragging
  smooth. As with other non-rebuild controls, `drawFrame()` is called when paused
  so the preview updates live.

## Edge cases

- **Paused preview:** `flowTime` frozen; dragging any Flow slider calls
  `drawFrame()` so the displaced frame updates without animating.
- **Seamless wrap:** max displacement folded into `flowMargin` (see above).
- **Performance:** worst case ≈ 90 strokes × 60 blobs = 5400 blobs/frame, each
  needing one `curl2` (≈4 `noise3` evals) → ~21k noise evals/frame. Comfortable
  for 60fps in JS. If profiling shows otherwise, fall back to sampling the field
  per-stroke-center plus a couple of points rather than per-blob.

## Testing

- `src/engine/noise.test.ts` (unit):
  - `noise3` is smooth: adjacent samples differ by less than a bound.
  - `noise3` is deterministic: same inputs → same output.
  - `curl2` is approximately divergence-free: `∂vx/∂x + ∂vy/∂y ≈ 0` sampled at
    several points via finite differences (within a tolerance).
- Engine visual behavior remains manual/visual verification (`npm run dev`), as
  it is today.

## Out of scope

- Full advection (integrating stroke centers along the field so they wander and
  respawn). We keep the directional conveyor; the field only displaces.
- GPU-side noise. Displacement stays CPU-side where stroke geometry is already
  computed.
- Mouse/pointer interaction with the field.
