/**
 * HudPanel — signature terminal panel with HUD corner brackets
 * Every panel in the app uses this wrapper for visual consistency
 */

import React from 'react';

export default function HudPanel({
  children,
  title,
  icon,
  status,
  className = '',
  style = {},
  glow = false,
  inset = false,
  padding = '12px',
  onClick,
}) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        position: 'relative',
        background: inset ? 'var(--term-bg-inset)' : 'var(--term-bg-panel)',
        border: `1px solid var(--term-border)`,
        padding: padding,
        cursor: onClick ? 'pointer' : 'default',
        ...(glow ? {
          boxShadow: '0 0 8px rgba(0,255,65,0.15), 0 0 2px rgba(0,255,65,0.1)',
        } : {}),
        transition: 'border-color 180ms ease, box-shadow 180ms ease',
        ...style,
      }}
    >
      {/* Corner brackets — top-left */}
      <div style={{
        position: 'absolute',
        top: '-1px',
        left: '-1px',
        width: '10px',
        height: '10px',
        borderTop: `2px solid var(--term-green)`,
        borderLeft: `2px solid var(--term-green)`,
        opacity: 0.7,
      }} />

      {/* Corner brackets — bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: '-1px',
        right: '-1px',
        width: '10px',
        height: '10px',
        borderBottom: `2px solid var(--term-green)`,
        borderRight: `2px solid var(--term-green)`,
        opacity: 0.7,
      }} />

      {/* Header */}
      {(title || icon || status) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: padding !== '12px' ? '8px' : '6px',
          paddingBottom: '6px',
          borderBottom: '1px solid var(--term-border-dim)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {icon && <span style={{ color: 'var(--term-cyan)', fontSize: '11px' }}>{icon}</span>}
            {title && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                color: 'var(--term-text-dim)',
                textTransform: 'uppercase',
              }}>
                {title}
              </span>
            )}
          </div>
          {status && <span style={{ fontSize: '9px', color: status.color || 'var(--term-text-dim)' }}>{status.text}</span>}
        </div>
      )}

      {children}
    </div>
  );
}
