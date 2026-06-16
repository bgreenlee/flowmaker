import { useEffect, useRef } from 'react';
import { cfg } from '../engine/config';
import { drawFrame } from '../engine/engine';

interface SwatchProps {
  label: string;
  cfgKey: 'ink' | 'paper';
}

function Swatch({ label, cfgKey }: SwatchProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onInput = () => {
      cfg[cfgKey] = el.value;
      if (!cfg.playing) drawFrame();
    };
    el.addEventListener('input', onInput);
    return () => el.removeEventListener('input', onInput);
  }, [cfgKey]);

  return (
    <div className="color-item">
      <span className="lbl">{label}</span>
      <input
        ref={ref}
        type="text"
        data-coloris=""
        defaultValue={cfg[cfgKey]}
      />
    </div>
  );
}

export function ColorSwatches() {
  return (
    <div className="color-row">
      <Swatch label="Ink" cfgKey="ink" />
      <Swatch label="Paper" cfgKey="paper" />
    </div>
  );
}
