/**
 * RingGauge — circular radial gauge with thin green progress ring
 * Used for fuel, battery, water, food reserves
 */

import React, { useMemo } from 'react';

export default function RingGauge({ value, label, unit = '%', max = 100, warning = false, critical = false }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const offset = circumference - (pct / 100) * circumference;

  const color = critical ? 'var(--term-red)' : warning ? 'var(--term-amber)' : 'var(--term-green)';
  const glowColor = critical ? 'rgba(255,59,48,0.4)' : warning ? 'rgba(255,184,0,0.3)' : 'rgba(0,255,65,0.3)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative' }}>
      <div style={{
        position: 'relative',
        width: 70,
        height: 70,
        filter: `drop-shadow(0 0 6px ${glowColor})`,
      }}>
        <svg viewBox="0 0 70 70" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx="35" cy="35" r={radius}
            fill="none"
            stroke="var(--term-border)"
            strokeWidth="3"
          />
          {/* Arc */}
          <circle
            cx="35" cy="35" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        {/* Center value */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '18px',
            fontWeight: 700,
            color: color,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {value.toFixed(0)}
          </span>
          <span className="term-unit">
            {unit}
          </span>
        </div>
      </div>
      {label && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.1em',
          color: 'var(--term-text-label)',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
