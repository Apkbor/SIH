import { useEffect, useRef } from 'react';

export default function Gauge({ value, label, unit = '%', max = 100, color = '#00C875' }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const arc = svgRef.current.querySelector('.gauge-arc');
    if (!arc) return;

    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const offset = circumference - (pct / 100) * circumference;

    arc.style.strokeDasharray = `${circumference} ${circumference}`;
    arc.style.strokeDashoffset = offset;
    arc.style.transition = 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    arc.style.stroke = color;
  }, [value, max, color]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const initialOffset = circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 100, height: 100 }}>
        <svg ref={svgRef} viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="#D7E4DF"
            strokeWidth="6"
          />
          {/* Arc */}
          <circle
            className="gauge-arc"
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={initialOffset}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold leading-none" style={{ color: 'var(--ink-primary)' }}>
            {value.toFixed(1)}
          </span>
          <span className="font-mono text-[10px] leading-none mt-0.5" style={{ color: 'var(--ink-muted)' }}>
            {unit}
          </span>
        </div>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--ink-muted)', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  );
}
