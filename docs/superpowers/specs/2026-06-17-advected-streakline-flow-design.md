# Advected Streakline Flow — Design

**Date:** 2026-06-17
**Status:** Approved for planning

## Problem

The flow field added previously displaces each stroke as a **bounded offset**
from a fixed conveyor path. A bounded offset's velocity averages to zero — it
goes out and comes back — so the motion reads as swinging/oscillating about a
spot rather than flowing. Measurement confirmed the offset oscillation can
dominate the slow conveyor, and that shaping the noise (fBm, domain drift)
adds randomness but does not remove the swing, because the swing is intrinsic
to the offset model.

## Goal

Replace the offset model with **advection**: strokes are carried *along* the
velocity field and travel downstream like ink in water. Each stroke's body is a
**streakline** — it traces the path its head has travelled — so bodies bend
along streamlines. This makes the motion read as a flowing current with
natural, non-repetitive variation, instead of a pendulum swing.

This is a deliberate rearchitecture. The original rigid-conveyor motion model
is replaced; Flow=0 yields straight trails along the wind (close to the old
look, not byte-identical), and exact reproduction of the prior animation is
explicitly **not** a requirement.

## Motion model

A single velocity field drives all motion:

```
V(p, t) = windDir · windSpeed  +  curlFbm(p · invScale + drift, t, octaves, gain) · flowStrength
```

- `windDir` is the unit vector of `cfg.angle`; `windSpeed` derives from
  `cfg.speed`.
- The curl term is the existing magnitude-normalized fBm curl
  (`curlFbm`/`fbm3` in `noise.ts`), which is divergence-free and multi-scale.
- `invScale` from `cfg.flowScale`; `flowStrength` from `cfg.flow`; the fBm
  `octaves`/`gain` from `cfg.detail`; `drift` is the slow domain translation
  along the wind direction driven by `flowTime`.

Each stroke has a **head** position integrated every frame by explicit Euler:

```
head ← head + V(head, t) · dt
```

`flowTime` advances per frame (rate from `cfg.flowDrift`) so the field morphs
over time. At `cfg.flow = 0` the curl term vanishes and `V = windDir·windSpeed`,
so heads travel in straight lines along `cfg.angle` ⇒ straight trails.

## Stroke = a trail (streakline)

Each stroke keeps a fixed-size **ring buffer of recent head positions** (most
recent first). The body is rendered by walking back along the trail:

- Accumulate arc length between successive trail points until reaching the
  stroke's target **Length** (`cfg.length`).
- Place blobs spaced for overlap (spacing from `blobR`, as today ≈
  `blobR · 0.65`); blob long axis from **Smear** (`cfg.smear`), radius/softness
  from **Soft** (`cfg.soft`).
- Orient each blob along the **local trail tangent** (direction between adjacent
  trail samples). Orientation therefore comes from the path, not from a curl
  `atan2` — the teleport class of bug cannot recur.
- Apply an alpha **envelope** along the body fading both head and tail (reuse
  the current `sin(t·π)`-style envelope).
- **Turbulence** (`cfg.turbulence`) adds a smooth per-stroke perpendicular
  wiggle to each blob relative to the local tangent — the same sinusoid-with-
  random-phase shape the original used, now perpendicular to the trail instead
  of a straight axis. Static per stroke (no fast time variation), so no flicker.

Ring buffer size: enough to cover the maximum Length at the maximum advection
speed (frames = maxArcLength / minSpeedPerFrame, capped). Walking by arc length
makes the body length independent of frame rate and speed.

## Spawn / respawn

Fixed stroke count from **Frequency** (`cfg.frequency`), same mapping as today.

- **Init:** each stroke is placed at a random position within screen+margin and
  its trail is **pre-seeded by integrating the field backward** from the spawn
  point (`p ← p − V(p,t)·dt`, repeated to fill the buffer). The stroke is thus
  immediately full-length — no growing-in.
- **Respawn:** when a stroke's head leaves screen+margin, it respawns the same
  way at a new random position, with a brief alpha **fade-in** (~0.4s) to hide
  the appearance. This keeps on-screen density roughly constant for any
  wind/curl ratio (robust even when curl dominates and net drift is weak).

`margin` is sized so a full-length trail and its blob radius sit fully
off-screen when the head is at the boundary.

## Code structure

- **New `src/engine/flow.ts`** — pure, framework-agnostic, unit-tested:
  - `flowVelocity(x, y, t, p): [number, number]` — wind + curl composition,
    where `p` carries the derived params (windDir, windSpeed, invScale,
    flowStrength, drift, octaves, gain).
  - `seedTrail(headX, headY, t, p, steps, dt, out)` — fill a trail buffer by
    backward integration from a head position.
  - `walkTrail(trail, count, targetLength, spacing) → placements` — turn a trail
    into ordered blob placements (position + tangent + arc-length parameter for
    the envelope).
- **`engine.ts`** — replaces each stroke's scalar `progress` with head position
  + ring buffer; `advance()` integrates `flowVelocity`; `writeQuads` reads blob
  placements from `walkTrail`. Reuses blob-quad rendering, tone palette, and
  grain unchanged. Holds spawn/respawn + fade-in state.
- **Reused as-is:** `curlFbm`/`fbm3` and the **Detail** config key + slider.
- **Removed:** the bounded-offset displacement path in `writeQuads`; the
  `flowAngle` helper and its tests in `engine.test.ts` (orientation now comes
  from the trail tangent); the recycle-margin / `CURL_MAX_COMP` logic and the
  along-axis `progress`/`flowPeriod` conveyor geometry (replaced by advection +
  respawn).

## Controls (final mapping)

| Control | Meaning |
|---|---|
| Angle | wind direction |
| Speed | wind speed (advection rate) |
| Flow | curl strength |
| Flow Scale | curl spatial scale |
| Flow Drift | field morph rate over time |
| Detail | fBm octaves / gain |
| Length | trail arc length |
| Smear | blob long axis |
| Soft | blob size / softness |
| Turbulence | per-stroke perpendicular path wiggle |
| Intensity, Tone Variance, Edge Texture, Grain | unchanged |

Flow/Flow Scale/Flow Drift/Detail/Intensity/Speed stay non-rebuild (per-frame).
Length/Smear/Soft/Frequency/Turbulence/Seed rebuild the stroke pool (as today),
which re-seeds trails.

## Performance

The field is evaluated once per stroke head per frame (~90 evaluations at max
Frequency) instead of once per blob (~5400 today) — cheaper. Backward trail
seeding is a short burst (≈ buffer size evaluations) only on spawn/respawn,
which is infrequent. Comfortably within frame budget.

## Testing

`src/engine/flow.test.ts` (unit):
- `flowVelocity` is finite and bounded for a wide range of inputs; at
  `flowStrength = 0` it equals exactly `windDir · windSpeed`.
- `seedTrail` produces a trail whose total arc length ≥ the requested length,
  and whose points are contiguous (no large gaps).
- `walkTrail` yields blobs spaced within tolerance of the target spacing and
  whose cumulative arc length covers the target Length; with too-short a trail
  it returns what it can without error.
- **Body continuity (streakline regression):** consecutive blob placements from
  `walkTrail` are within ~one spacing of each other and their tangents change
  smoothly — the trail analogue of the orientation-teleport regression test.

Engine integration (GL, spawn/respawn timing, visual look) stays manual:
`npm run dev`, confirm strokes flow downstream and bend through swirls, Flow=0
gives straight trails, and respawns are not visible as pops.

## Out of scope

- GPU-side advection or compute. Integration stays CPU-side.
- Mouse/pointer interaction with the field.
- Variable stroke count over time (count stays fixed per Frequency).
- Preserving a "classic" rigid-conveyor mode (advection replaces it).
