import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import DemoMode from '../components/DemoMode';

const STATIONS = [
  { id: 'BHARATI', name: 'Bharati', location: 'Dakshin Gangotri' },
  { id: 'MAITRI', name: 'Maitri', location: 'Schirmacher Oasis' },
];

export default function TopBar({ onToggleSidebar }) {
  const { selectedStation, setSelectedStation, connected, blackout } = useApp();
  const [now, setNow] = useState(new Date());
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const utcTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' });
  const localTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Kolkata' });
  const isDaytime = now.getUTCHours() >= 6 && now.getUTCHours() < 18;

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-6 z-20 flex-shrink-0"
        style={{
          background: 'rgba(255,255,255,0.62)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(0,200,117,0.18)',
          borderTop: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 8px 24px rgba(11,18,16,0.08)',
          minHeight: '64px',
        }}
      >
        {/* Left: Wordmark + Station Selector */}
        <div className="flex items-center gap-5">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 transition-colors"
            style={{ color: 'var(--ink-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--ink-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--ink-muted)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-display text-base font-semibold tracking-tight" style={{ color: 'var(--ink-primary)' }}>
              ANTARCTIGRID
            </span>
            <span style={{ color: 'var(--border-hairline)' }}>│</span>

            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              className="font-mono text-xs py-1.5 px-2.5 transition-all duration-180"
              style={{
                background: 'transparent',
                color: 'var(--ink-muted)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '2px',
                letterSpacing: '0.02em',
              }}
            >
              {STATIONS.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.location}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Mission Clock + Status Chips */}
        <div className="hidden lg:flex items-center gap-5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs" style={{ color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>
              {utcTime} <span style={{ opacity: 0.5 }}>UTC</span>
            </span>
            <span style={{ color: 'var(--border-hairline)' }}>·</span>
            <span className="font-mono text-xs" style={{ color: 'var(--ink-muted)', letterSpacing: '0.04em' }}>
              {localTime} <span style={{ opacity: 0.5 }}>LOCAL</span>
            </span>
            <span style={{ color: 'var(--border-hairline)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
              {isDaytime ? '☀' : '☾'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[10px] font-semibold px-2 py-1 chip-p0"
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '9999px',
                background: connected ? 'rgba(0,200,117,0.12)' : 'rgba(226,59,59,0.12)',
                color: connected ? 'var(--signal-green-deep)' : 'var(--status-danger)',
                border: connected ? '1px solid rgba(0,200,117,0.25)' : '1px solid rgba(226,59,59,0.25)',
              }}
            >
              {connected ? '● LINK' : '○ LINK'}
            </span>
            <span
              className="font-mono text-[10px] font-semibold px-2 py-1"
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                borderRadius: '9999px',
                background: 'rgba(0,200,117,0.12)',
                color: 'var(--signal-green-deep)',
                border: '1px solid rgba(0,200,117,0.25)',
              }}
            >
              ● SAT
            </span>
          </div>
        </div>

        {/* Right: Demo Button + About + Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="btn-secondary text-xs"
          >
            {showDemo ? 'Hide Demo' : 'Start Demo'}
          </button>

          <button
            onClick={() => navigate('/about')}
            className="btn-secondary text-xs"
          >
            About
          </button>

          <DemoMode onClose={() => setShowDemo(false)} />

          <div
            className="font-mono text-[10px] font-semibold px-2.5 py-1.5"
            style={{
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              borderRadius: '9999px',
              background: blackout ? 'rgba(226,59,59,0.12)' : 'rgba(0,200,117,0.12)',
              color: blackout ? 'var(--status-danger)' : 'var(--signal-green-deep)',
              border: blackout ? '1px solid rgba(226,59,59,0.25)' : '1px solid rgba(0,200,117,0.25)',
            }}
          >
            <span className={blackout ? 'pulse-dot inline-block w-1.5 h-1.5 rounded-full mr-1.5' : 'inline-block w-1.5 h-1.5 rounded-full mr-1.5'}
              style={{ background: blackout ? 'var(--status-danger)' : 'var(--signal-green-deep)' }}
            />
            {blackout ? 'BLACKOUT' : 'LIVE'}
          </div>
        </div>
      </header>
    </>
  );
}
