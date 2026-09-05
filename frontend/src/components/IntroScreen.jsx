/**
 * Intro / Splash Screen
 * Light theme per AntarctiGrid spec — white surfaces, green accents.
 */

import { useState, useEffect } from 'react';

export default function IntroScreen({ onComplete }) {
  const [phase, setPhase] = useState('in');
  const [bootLines, setBootLines] = useState([]);

  useEffect(() => {
    // Boot sequence: typewriter-style status lines
    const lines = [
      { text: 'SATELLITE LINK... OK', delay: 200 },
      { text: 'EDGE NODE... OK', delay: 600 },
      { text: 'SENSOR MESH... 4/4 ONLINE', delay: 1000 },
    ];

    const timers = lines.map((line, i) =>
      setTimeout(() => {
        setBootLines(prev => [...prev, line.text]);
      }, line.delay)
    );

    const t1 = setTimeout(() => setPhase('hold'), 600);
    const t2 = setTimeout(() => {
      if (phase !== 'out') setPhase('out');
    }, 2800);
    const t3 = setTimeout(() => {
      onComplete?.();
    }, 3400);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const handleClick = () => {
    if (phase === 'out') return;
    setPhase('out');
    setTimeout(() => onComplete?.(), 500);
  };

  return (
    <div
      onClick={handleClick}
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      style={{
        background: '#F7FAF9',
        opacity: phase === 'in' ? 0 : phase === 'hold' ? 1 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: phase === 'out' ? 'none' : 'auto',
      }}
    >
      {/* Subtle grid background */}
      <div className="absolute inset-0" style={{ opacity: 0.3 }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#DCEAE4" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div
        className="relative z-10 text-center px-6"
        style={{
          transform: phase === 'in' ? 'translateY(8px)' : 'translateY(0)',
          opacity: phase === 'in' ? 0 : 1,
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Boot lines */}
        <div className="mb-8 space-y-1 text-left max-w-xs mx-auto">
          {bootLines.map((line, i) => (
            <div
              key={i}
              className="font-mono text-xs"
              style={{
                color: '#00874F',
                letterSpacing: '0.04em',
                animation: 'fadeIn 300ms ease-out',
              }}
            >
              <span style={{ color: '#00874F', marginRight: '8px' }}>✓</span>
              {line}
            </div>
          ))}
        </div>

        {/* Logo mark */}
        <div
          className="mx-auto mb-6 flex items-center justify-center"
          style={{
            width: 64, height: 64,
            background: 'rgba(0,200,117,0.08)',
            border: '1px solid rgba(0,200,117,0.25)',
            borderRadius: '2px',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00874F" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
        </div>

        {/* Title */}
        <h1
          className="mb-3 leading-tight"
          style={{
            fontFamily: '"Space Grotesk", monospace',
            fontSize: '32px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#0B1210',
            lineHeight: '38px',
          }}
        >
          ANTARCTIGRID
        </h1>

        {/* Tagline */}
        <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#5B6B65', lineHeight: '20px', fontFamily: '"Space Grotesk", monospace' }}>
          Mission Control — Indian Antarctic Research Stations
        </p>

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); handleClick(); }}
          className="font-mono text-sm font-semibold px-6 py-2.5 transition-all duration-180"
          style={{
            background: '#00C875',
            color: '#0B1210',
            border: 'none',
            borderRadius: '2px',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#00E68A';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#00C875';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Enter Command Center
        </button>

        {/* Hint */}
        <p className="font-mono text-xs mt-4" style={{ color: '#5B6B65', opacity: 0.6 }}>
          or wait a moment...
        </p>
      </div>
    </div>
  );
}
