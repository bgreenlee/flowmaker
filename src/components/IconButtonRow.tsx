import { useState } from 'react';
import { cfg } from '../engine/config';
import { exportImage, togglePlay } from '../engine/engine';

export function IconButtonRow() {
  const [playing, setPlaying] = useState<boolean>(cfg.playing);

  return (
    <div className="flm-action-row">
      <button
        className={'flm-icon-btn' + (playing ? ' is-active' : '')}
        title={playing ? 'Pause' : 'Play'}
        onClick={() => setPlaying(togglePlay())}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
            <rect x="8" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 2.5 L11.5 7 L4 11.5 Z" fill="currentColor" />
          </svg>
        )}
      </button>
      <button
        className="flm-icon-btn flm-download-btn"
        title="Download"
        onClick={exportImage}
        aria-label="Download"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 2 L7 9 M4 6.5 L7 9.5 L10 6.5 M2.5 11.5 L11.5 11.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
        <span>Download</span>
      </button>
    </div>
  );
}
