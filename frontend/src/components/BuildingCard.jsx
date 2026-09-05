import { useMemo } from 'react';

export default function BuildingCard({ building, latest }) {
  const hasPower = latest?.powerOn;
  const hasHeating = latest?.heatingOn;
  const temp = latest?.temperatureC;

  const status = useMemo(() => {
    if (!hasPower) return 'CRITICAL';
    if (!hasHeating && temp < -20) return 'CAUTION';
    return 'OK';
  }, [hasPower, hasHeating, temp]);

  const statusConfig = {
    OK: { dot: '#00874F', label: 'OK', bg: 'rgba(0,135,79,0.06)', border: 'rgba(0,135,79,0.15)' },
    CAUTION: { dot: '#D9A400', label: 'CAUTION', bg: 'rgba(217,164,0,0.06)', border: 'rgba(217,164,0,0.15)' },
    CRITICAL: { dot: '#E23B3B', label: 'DANGER', bg: 'rgba(226,59,59,0.06)', border: 'rgba(226,59,59,0.15)' },
  };

  const cfg = statusConfig[status] || statusConfig.OK;

  return (
    <div
      className="panel-reveal"
      style={{
        background: 'var(--glass-bg-2)',
        backdropFilter: 'blur(var(--glass-blur-2))',
        WebkitBackdropFilter: 'blur(var(--glass-blur-2))',
        border: `1px solid ${cfg.border}`,
        borderTop: `1px solid var(--glass-highlight)`,
        boxShadow: 'var(--elevation-shadow-1)',
        borderRadius: '2px',
        padding: '12px',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)', letterSpacing: '0.08em' }}>
            {building.type}
          </div>
          <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--ink-primary)', fontFamily: '"Space Grotesk", monospace' }}>
            {building.name}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
          <span className="font-mono text-[10px] font-semibold uppercase" style={{ color: cfg.dot, letterSpacing: '0.08em' }}>
            {cfg.label}
          </span>
        </div>
      </div>

      <div className="flex gap-3 mt-2 text-xs">
        <span className="flex items-center gap-1" style={{ color: hasPower ? 'var(--signal-green-deep)' : 'var(--status-danger)', fontFamily: '"Space Grotesk", monospace' }}>
          {hasPower ? '⚡ Power' : '⚡ No Power'}
        </span>
        <span className="flex items-center gap-1" style={{ color: hasHeating ? 'var(--signal-green-deep)' : 'var(--ink-muted)', fontFamily: '"Space Grotesk", monospace' }}>
          {hasHeating ? '🔥 Heat' : '❄ No Heat'}
        </span>
      </div>

      {temp !== undefined && (
        <div className="font-mono text-xs mt-1.5" style={{ color: 'var(--ink-muted)' }}>
          {temp.toFixed(1)}°C
        </div>
      )}

      {building.critical && (
        <span
          className="inline-block mt-2 font-mono text-[10px] font-semibold uppercase"
          style={{
            letterSpacing: '0.08em',
            padding: '2px 6px',
            borderRadius: '9999px',
            background: 'rgba(226,59,59,0.1)',
            color: 'var(--status-danger)',
            border: '1px solid rgba(226,59,59,0.2)',
          }}
        >
          CRITICAL
        </span>
      )}
    </div>
  );
}
