import { useEffect, useRef, useState } from 'react';
import { cfg } from '../engine/config';
import { setAngle } from '../engine/engine';

const PCX = 22,
  PCY = 22,
  PR = 17;

export function AnglePicker() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [rad, setRad] = useState<number>(cfg.angle);

  const ex = PCX + Math.cos(rad) * PR;
  const ey = PCY + Math.sin(rad) * PR;
  const deg = Math.round((((rad * 180) / Math.PI) % 360 + 360) % 360);

  useEffect(() => {
    setAngle(rad);
  }, [rad]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let picking = false;
    const angFromPtr = (clientX: number, clientY: number) => {
      const r = el.getBoundingClientRect();
      return Math.atan2(
        clientY - (r.top + r.height / 2),
        clientX - (r.left + r.width / 2),
      );
    };
    const onMouseDown = (e: MouseEvent) => {
      picking = true;
      setRad(angFromPtr(e.clientX, e.clientY));
    };
    const onMouseMove = (e: MouseEvent) => {
      if (picking) setRad(angFromPtr(e.clientX, e.clientY));
    };
    const onMouseUp = () => {
      picking = false;
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      picking = true;
      const t = e.touches[0];
      setRad(angFromPtr(t.clientX, t.clientY));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (picking) {
        const t = e.touches[0];
        setRad(angFromPtr(t.clientX, t.clientY));
      }
    };
    const onTouchEnd = () => {
      picking = false;
    };
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div className="flm-angle-row">
      <div className="flm-angle-header">
        <span className="flm-angle-label">Angle</span>
        <span className="flm-angle-value">{deg}°</span>
      </div>
      <div className="flm-angle-dial" ref={wrapRef}>
        <svg viewBox="0 0 44 44">
          <g className="flm-angle-ticks">
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (i * Math.PI * 2) / 12;
              const x1 = (22 + Math.cos(a) * 20).toFixed(2);
              const y1 = (22 + Math.sin(a) * 20).toFixed(2);
              const x2 = (22 + Math.cos(a) * 21.5).toFixed(2);
              const y2 = (22 + Math.sin(a) * 21.5).toFixed(2);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
          <circle
            cx="22"
            cy="22"
            r="17"
            fill="none"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="0.75"
          />
          <circle cx="22" cy="22" r="1.25" fill="rgba(0,0,0,0.45)" />
          <line
            x1="22"
            y1="22"
            x2={ex.toFixed(2)}
            y2={ey.toFixed(2)}
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="0.75"
            strokeLinecap="round"
          />
          <circle
            cx={ex.toFixed(2)}
            cy={ey.toFixed(2)}
            r="1.8"
            fill="rgba(0,0,0,0.55)"
          />
        </svg>
      </div>
    </div>
  );
}
