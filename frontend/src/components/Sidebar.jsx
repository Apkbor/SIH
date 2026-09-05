import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', short: 'HOME' },
  { path: '/monitoring', label: 'Monitoring', short: 'MON' },
  { path: '/alerts', label: 'Alerts', short: 'ALERTS' },
  { path: '/notifications', label: 'Notifications', short: 'DISPATCH' },
  { path: '/chat', label: 'Comms Hub', short: 'COMMS' },
  { path: '/forecasts', label: 'Forecasts', short: 'AI' },
  { path: '/simulator', label: 'Simulator', short: 'SIM' },
  { path: '/compare', label: 'Compare', short: 'CMP' },
  { path: '/about', label: 'About', short: 'INFO' },
];

export default function Sidebar({ currentPath }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="h-screen w-60 flex flex-col flex-shrink-0 glass-e1">
      {/* Logo / Wordmark */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'rgba(0,200,117,0.12)', border: '1px solid rgba(0,200,117,0.25)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00874F" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="2" x2="12" y2="6"/>
            <line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="2" y1="12" x2="6" y2="12"/>
            <line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
        </div>
        <div>
          <div className="font-display text-sm font-semibold leading-tight" style={{ color: 'var(--ink-primary)' }}>ANTARCTIGRID</div>
          <div className="font-mono text-[10px] leading-tight" style={{ color: 'var(--ink-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mission Control</div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all duration-180"
              style={{
                borderRadius: '2px',
                background: isActive ? 'rgba(0,200,117,0.08)' : 'transparent',
                color: isActive ? 'var(--signal-green-deep)' : 'var(--ink-muted)',
                border: isActive ? '1px solid rgba(0,200,117,0.2)' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(0,200,117,0.04)';
                  e.currentTarget.style.color = 'var(--ink-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--ink-muted)';
                }
              }}
            >
              <span className="font-mono text-[10px] font-semibold w-8" style={{ letterSpacing: '0.04em', opacity: isActive ? 1 : 0.5 }}>
                {item.short}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom: Version + connection */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-hairline)' }}>
        <div className="font-mono text-[10px] text-center" style={{ color: 'var(--ink-muted)', letterSpacing: '0.06em' }}>
          v1.0 · SIH 2026<br />
          <span style={{ color: 'var(--signal-green-deep)' }}>● SYSTEM ONLINE</span>
        </div>
      </div>
    </aside>
  );
}
