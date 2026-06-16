import { useState } from 'react';
import { cfg } from '../engine/config';
import { drawFrame, exportPng, togglePlay } from '../engine/engine';
import { AnglePicker } from './AnglePicker';
import { ColorSwatches } from './ColorSwatches';
import { Slider } from './Slider';

export function Sidebar() {
  const [playing, setPlaying] = useState<boolean>(cfg.playing);
  const [grain, setGrain] = useState<boolean>(cfg.grain);

  return (
    <div id="sidebar">
      <div className="section-label">Color</div>
      <ColorSwatches />

      <div className="section-label">Stroke</div>
      <Slider label="Frequency" cfgKey="frequency" min={1} max={10} mode="rebuild" />
      <Slider label="Intensity" cfgKey="intensity" min={1} max={10} />
      <Slider label="Length" cfgKey="length" min={1} max={10} mode="rebuild" />
      <Slider label="Smear" cfgKey="smear" min={1} max={10} mode="rebuild" />
      <Slider label="Softness" cfgKey="soft" min={1} max={10} mode="rebuild" />
      <Slider label="Tone Variance" cfgKey="toneVariance" min={1} max={10} />
      <Slider label="Edge Texture" cfgKey="edgeRough" min={0} max={10} />

      <div className="section-label">Direction</div>
      <AnglePicker />
      <Slider label="Turbulence" cfgKey="turbulence" min={0} max={10} mode="rebuild" />

      <div className="section-label">Motion</div>
      <Slider label="Speed" cfgKey="speed" min={1} max={10} />

      <div className="section-label">Random</div>
      <Slider label="Seed" cfgKey="seed" min={0} max={999} mode="rebuild" />

      <div className="section-label">Grain</div>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="lbl">Grain</span>
        <button
          className={'toggle-pill' + (grain ? ' on' : '')}
          onClick={() => {
            cfg.grain = !cfg.grain;
            setGrain(cfg.grain);
            if (!cfg.playing) drawFrame();
          }}
        >
          {grain ? 'On' : 'Off'}
        </button>
      </div>
      <Slider label="Amount" cfgKey="grainAmt" min={1} max={10} />
      <Slider label="Grain Speed" cfgKey="grainSpeed" min={1} max={10} />

      <div className="btn-row">
        <button
          className={'abtn' + (playing ? ' on' : '')}
          title="Play / Pause"
          onClick={() => setPlaying(togglePlay())}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button
          className="abtn"
          title="Save PNG"
          style={{ fontSize: 15 }}
          onClick={exportPng}
        >
          ↓
        </button>
      </div>
    </div>
  );
}
