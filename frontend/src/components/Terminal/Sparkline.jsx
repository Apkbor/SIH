/**
 * Sparkline — tiny inline live line chart for sensor data
 * Used in sensor feed rows, building cards, and mini-charts
 */

import React, { useMemo } from 'react';

export default function Sparkline({ data = [], width = 80, height = 24, color = 'var(--term-green)', filled = false }) {
  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="var(--term-border)" strokeWidth="1" />
      </svg>
    );
  }

  const points = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = width / (data.length - 1);
    return data.map((v, i) => ({
      x: i * step,
      y: height - ((v - min) / range) * (height - 4) - 2,
    }));
  }, [data, width, height]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = filled ? `${linePath} L ${points[points.length - 1].x} ${height} L 0 ${height} Z` : null;

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {filled && areaPath && (
        <path d={areaPath} fill={color} opacity="0.1" />
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
