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
    <>
      <div className="row">
        <span className="lbl">Angle</span>
      </div>
      <div className="angle-row">
        <div id="angle-pick" ref={wrapRef}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle
              cx="22"
              cy="22"
              r="17"
              fill="none"
              stroke="#d0cbc3"
              strokeWidth="1.5"
            />
            <circle cx="22" cy="22" r="2" fill="#bfb9b1" />
            <line
              x1="22"
              y1="22"
              x2={ex.toFixed(2)}
              y2={ey.toFixed(2)}
              stroke="#888078"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx={ex.toFixed(2)} cy={ey.toFixed(2)} r="4" fill="#888078" />
          </svg>
        </div>
        <span className="vd-angle">{deg}°</span>
      </div>
    </>
  );
}
