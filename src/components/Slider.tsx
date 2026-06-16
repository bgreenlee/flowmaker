import { useState } from 'react';
import type { Config } from '../engine/config';
import { cfg } from '../engine/config';
import { drawFrame, rebuildStrokes } from '../engine/engine';

type NumericKey = {
  [K in keyof Config]: Config[K] extends number ? K : never;
}[keyof Config];

interface SliderProps {
  label: string;
  cfgKey: NumericKey;
  min: number;
  max: number;
  step?: number;
  mode?: 'rebuild' | 'live';
}

export function Slider({
  label,
  cfgKey,
  min,
  max,
  step = 1,
  mode = 'live',
}: SliderProps) {
  const [display, setDisplay] = useState<number>(cfg[cfgKey] as number);

  return (
    <>
      <div className="row">
        <span className="lbl">{label}</span>
        <span className="vdisp">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        defaultValue={cfg[cfgKey] as number}
        onInput={(e) => {
          const v = Number((e.target as HTMLInputElement).value);
          (cfg[cfgKey] as number) = v;
          setDisplay(v);
          if (mode === 'rebuild') rebuildStrokes();
          if (!cfg.playing) drawFrame();
        }}
      />
    </>
  );
}
