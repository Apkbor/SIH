/**
 * TerminalHeader — persistent top status bar for the ops center
 * Upgraded: glow effects, Space Grotesk typography, ice-blue accent system,
 * subtle scan-line overlay, live feed transparency badge
 */

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'DASHBOARD' },
  { path: '/monitoring', label: 'MONITOR' },
  { path: '/alerts', label: 'ALERTS' },
  { path: '/forecasts', label: 'FORECASTS' },
  { path: '/simulator', label: 'SIMULATOR' },
  { path: '/compare', label: 'COMPARE' },
  { path: '/about', label: 'INFO' },
];

export default function TerminalHeader({ blackout, connected, uptime, selectedStation, onStationChange, showBoth = true }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const utc = time.toISOString().slice(11, 19);
  const dateStr = time.toISOString().slice(0, 10);
  const stationOptions = showBoth ? ['BHARATI', 'MAITRI', 'BOTH'] : ['BHARATI', 'MAITRI'];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'linear-gradient(180deg, rgba(8,18,34,0.99) 0%, rgba(5,12,22,0.97) 100%)',
      borderBottom: blackout ? '1px solid rgba(232,68,58,0.25)' : '1px solid rgba(79,209,232,0.12)',
      height: '46px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 14px',
      gap: '10px',
      overflow: 'hidden',
      transition: 'border-color 0.4s ease',
    }}>
      {/* Scan-line overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(79,209,232,0.012) 2px, rgba(79,209,232,0.012) 4px)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* ─── Logo / Wordmark ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1, flexShrink: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '3px',
          background: 'rgba(79,209,232,0.06)',
          border: '1px solid rgba(79,209,232,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', color: '#4FD1E8',
          boxShadow: '0 0 8px rgba(79,209,232,0.15)',
        }}>
          ⊕
        </div>
        <div>
          <div style={{
            fontFamily: '"Space Grotesk", var(--font-mono)',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: '#E8F4F8',
            textShadow: '0 0 10px rgba(79,209,232,0.2)',
            lineHeight: 1.1,
          }}>
            ANTARCTIGRID
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            letterSpacing: '0.12em',
            color: 'rgba(125,219,238,0.45)',
            marginTop: '1px',
          }}>
            NCPOR v2.0 // DIGITAL TWIN
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '22px', background: 'rgba(79,209,232,0.12)', flexShrink: 0, zIndex: 1 }} />

      {/* ─── Nav tabs ─── */}
      <nav style={{ display: 'flex', gap: '2px', zIndex: 1, overflowX: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 9px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9.5px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '0.08em',
              color: isActive ? '#4FD1E8' : 'rgba(125,219,238,0.4)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'color 150ms ease',
            })}
          >
            {({ isActive }) => (
              <>
                {item.label}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '4px',
                    right: '4px',
                    height: '2px',
                    background: '#4FD1E8',
                    boxShadow: '0 0 8px rgba(79,209,232,0.5), 0 0 2px rgba(79,209,232,0.8)',
                    borderRadius: '1px',
                  }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div style={{ width: '1px', height: '22px', background: 'rgba(79,209,232,0.12)', flexShrink: 0, zIndex: 1 }} />

      {/* ─── Station selector buttons ─── */}
      <div style={{ display: 'flex', gap: '3px', zIndex: 1, flexShrink: 0 }}>
        {stationOptions.map((s) => {
          const active = selectedStation === s;
          return (
            <button key={s} onClick={() => onStationChange?.(s)} style={{
              padding: '3px 9px',
              fontSize: '9px',
              letterSpacing: '0.08em',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              border: `1px solid ${active
                ? (blackout ? 'rgba(232,68,58,0.5)' : 'rgba(79,209,232,0.45)')
                : 'rgba(125,219,238,0.08)'}`,
              borderRadius: '2px',
              background: active
                ? (blackout ? 'rgba(232,68,58,0.1)' : 'rgba(79,209,232,0.08)')
                : 'transparent',
              color: active ? '#E8F4F8' : 'rgba(125,219,238,0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}>
              {s === 'BOTH' ? '⬦ BOTH' : s}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '22px', background: 'rgba(79,209,232,0.12)', flexShrink: 0, zIndex: 1 }} />

      {/* ─── Connection status ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1, flexShrink: 0 }}>
        {/* Link status dot */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.06em',
          color: connected ? 'rgba(61,220,151,0.7)' : 'rgba(232,68,58,0.7)',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: connected ? '#3DDC97' : '#E8443A',
            boxShadow: connected ? '0 0 6px rgba(61,220,151,0.6)' : '0 0 6px rgba(232,68,58,0.5)',
          }} />
          {connected ? 'LINK UP' : 'LINK DOWN'}
        </span>

        {/* Net security */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8.5px',
          letterSpacing: '0.08em',
          color: 'rgba(125,219,238,0.3)',
        }}>
          🔒 SECURE
        </span>

        {/* Uptime */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8.5px',
          letterSpacing: '0.06em',
          color: 'rgba(125,219,238,0.3)',
        }}>
          UP {uptime}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '22px', background: 'rgba(79,209,232,0.12)', flexShrink: 0, zIndex: 1 }} />

      {/* ─── Live Feed badge ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 9px',
        borderRadius: '2px',
        background: blackout
          ? 'linear-gradient(135deg, rgba(232,68,58,0.08), rgba(30,8,8,0.3))'
          : 'linear-gradient(135deg, rgba(79,209,232,0.06), rgba(5,14,26,0.8))',
        border: blackout
          ? '1px solid rgba(232,68,58,0.35)'
          : '1px solid rgba(79,209,232,0.2)',
        animation: !blackout ? 'borderGlow 3s ease-in-out infinite' : 'none',
        flexShrink: 0,
        zIndex: 1,
      }}>
        <span style={{
          display: 'inline-block',
          width: 6, height: 6, borderRadius: '50%',
          background: blackout ? '#E8443A' : '#3DDC97',
          boxShadow: blackout
            ? '0 0 8px rgba(232,68,58,0.7)'
            : '0 0 8px rgba(61,220,151,0.6)',
          animation: !blackout ? 'pulse 2s ease-in-out infinite' : 'none',
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8.5px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: blackout ? '#E8443A' : '#4FD1E8',
          textTransform: 'uppercase',
        }}>
          {blackout ? '⛔ BLACKOUT SIMULATED' : '🟢 LIVE — SIMULATED FEED'}
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: '1px', height: '22px', background: 'rgba(79,209,232,0.12)', flexShrink: 0, zIndex: 1 }} />

      {/* ─── UTC Clock ─── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        flexShrink: 0, lineHeight: 1.15, zIndex: 1,
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          color: blackout ? '#E8443A' : '#4FD1E8',
          textShadow: blackout ? '0 0 8px rgba(232,68,58,0.3)' : '0 0 8px rgba(79,209,232,0.25)',
        }}>
          {utc}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          letterSpacing: '0.08em',
          color: 'rgba(125,219,238,0.35)',
        }}>
          {dateStr} UTC
        </span>
      </div>
    </header>
  );
}
