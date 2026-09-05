/**
 * StatusPill — small rounded badge: ONLINE, LIVE, NOMINAL, etc.
 * With subtly pulsing dot
 */

import React from 'react';

export default function StatusPill({ text = 'ONLINE', color = 'var(--term-green)', dim = false, pulse = true }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      fontWeight: 600,
      letterSpacing: '0.08em',
      color: dim ? 'var(--term-text-dimmer)' : color,
      textTransform: 'uppercase',
    }}>
      <span
        className={pulse ? 'pulse-dot' : ''}
        style={{
          display: 'inline-block',
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: dim ? 'var(--term-text-dimmer)' : color,
          boxShadow: `0 0 4px ${dim ? 'transparent' : color}`,
          flexShrink: 0,
        }}
      />
      {text}
    </span>
  );
}
