/**
 * Live badge component — shows "🟢 LIVE — Simulated Feed" or "🔴 BLACKOUT SIMULATED"
 */
import { useApp } from '../contexts/AppContext';
import { useEffect, useState } from 'react';

export default function LiveBadge() {
  const { connected, blackout } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

  if (blackout) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-aurora-red/15 border border-aurora-red/40 animate-pulse">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aurora-red opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-aurora-red"></span>
        </span>
        <span className="font-mono text-xs text-aurora-red font-semibold tracking-wider">BLACKOUT SIMULATED</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-aurora-green/15 border border-aurora-green/30">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aurora-green opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-aurora-green"></span>
        </span>
        <span className="font-mono text-xs text-aurora-green font-semibold tracking-wider">LIVE — Simulated Feed</span>
      </div>
      <span className="font-mono text-xs text-ice-300 tabular-nums">{timeStr} IST</span>
    </div>
  );
}
