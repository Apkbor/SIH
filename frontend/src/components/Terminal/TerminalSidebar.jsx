/**
 * TerminalSidebar — left navigation rail
 */

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'DASHBOARD', short: 'DASH' },
  { path: '/monitoring', label: 'MONITORING', short: 'MON' },
  { path: '/alerts', label: 'ALERTS', short: 'ALT' },
  { path: '/notifications', label: 'DISPATCHES', short: 'NTFY' },
  { path: '/chat', label: 'CHAT', short: 'CHAT' },
  { path: '/base', label: 'BASE CMD', short: 'BASE', isHQ: true },
  { path: '/forecasts', label: 'FORECASTS', short: 'FCST' },
  { path: '/simulator', label: 'SIMULATOR', short: 'SIM' },
  { path: '/compare', label: 'COMPARE', short: 'CMP' },
  { path: '/about', label: 'ABOUT', short: 'INFO' },
];

export default function TerminalSidebar({ selectedStation, onStationChange }) {
  const location = useLocation();

  return (
    <aside style={{
      width: '180px',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      background: 'var(--term-bg)',
      borderRight: '1px solid var(--term-border)',
      overflow: 'hidden',
    }}>
      {/* Wordmark */}
      <div style={{
        padding: '10px 10px',
        borderBottom: '1px solid var(--term-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          border: '1px solid var(--term-green)',
          borderRadius: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'var(--term-green)',
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 0 4px rgba(0,255,65,0.2)',
        }}>
          ⊕
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: 'var(--term-green)',
            lineHeight: 1.2,
          }}>
            ANTARCTIGRID
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '8px',
            letterSpacing: '0.06em',
            color: 'var(--term-text-dimmer)',
            lineHeight: 1.2,
          }}>
            MISSION CTRL v2.0
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '6px 0', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && item.path !== '/base' && location.pathname.startsWith(item.path));
          const isHQ = item.isHQ;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive: active }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: isHQ ? '7px 10px' : '6px 10px',
                margin: '1px 4px',
                fontFamily: 'var(--font-mono)',
                fontSize: isHQ ? '10px' : '10px',
                fontWeight: isHQ ? 700 : 400,
                letterSpacing: '0.04em',
                textDecoration: 'none',
                borderRadius: '2px',
                color: active ? (isHQ ? 'var(--term-amber)' : 'var(--term-green)') : (isHQ ? 'rgba(251,191,36,0.65)' : 'var(--term-text-dim)'),
                background: active ? (isHQ ? 'var(--term-amber-bg)' : 'var(--term-green-08)') : 'transparent',
                borderLeft: active ? `2px solid ${isHQ ? 'var(--term-amber)' : 'var(--term-green)'}` : `2px solid transparent`,
                transition: 'all 180ms ease',
              })}
            >
              <span style={{
                fontSize: '9px',
                fontWeight: 600,
                opacity: 0.6,
                width: '24px',
                textAlign: 'right',
                color: isHQ ? 'var(--term-amber)' : undefined,
              }}>
                {isHQ ? '⬡' : item.short}
              </span>
              <span>{item.label}</span>
              {isHQ && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '7px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: 'var(--term-amber)',
                  background: 'rgba(251,191,36,0.1)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '2px',
                  padding: '1px 3px',
                  lineHeight: 1,
                }}>HQ</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Station selector + version */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--term-border)' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          letterSpacing: '0.08em',
          color: 'var(--term-text-dimmer)',
          marginBottom: '4px',
          textTransform: 'uppercase',
        }}>
          Active Station
        </div>
        <select
          value={selectedStation}
          onChange={(e) => onStationChange(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--term-bg-inset)',
            color: 'var(--term-green)',
            border: '1px solid var(--term-border)',
            borderRadius: '2px',
            padding: '3px 4px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="BHARATI">BHARATI</option>
          <option value="MAITRI">MAITRI</option>
        </select>
        <div style={{
          marginTop: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '8px',
          letterSpacing: '0.06em',
          color: 'var(--term-text-dimmer)',
          textAlign: 'center',
          lineHeight: 1.4,
        }}>
          SIH 2026 · PS 26060
        </div>
      </div>
    </aside>
  );
}
