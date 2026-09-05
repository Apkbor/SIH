import { useState, useEffect } from 'react';
import { getReadings } from '../services/api';

function EnergyChart({ stationId }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    getReadings(stationId, 'energy', 50).then(d => setData(d));
    const iv = setInterval(() => {
      getReadings(stationId, 'energy', 50).then(d => setData(d));
    }, 10000);
    return () => clearInterval(iv);
  }, [stationId]);

  if (data.length === 0) {
    return <div className="text-center text-ice-500 py-8 text-xs">Loading chart data...</div>;
  }

  const w = Math.max(600, data.length * 12);
  const chartData = data.map((d, i) => ({
    x: i * 12,
    fuel: d.fuelPercent,
    battery: d.batteryPercent,
    load: d.generatorLoad,
  }));

  const line = (key) => chartData.map((d, i) => `${d.x},${200 - (d[key] / 100) * 180}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} 200`} className="w-full" style={{ minHeight: '200px' }}>
        {[0, 25, 50, 75, 100].map(v => (
          <line key={v} x1="0" y1={200 - (v / 100) * 180} x2={w} y2={200 - (v / 100) * 180} stroke="rgba(79,209,232,0.05)" />
        ))}
        <polyline points={line('fuel')} fill="none" stroke="#4FD1E8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <polyline points={line('battery')} fill="none" stroke="#3DDC97" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <polyline points={line('load')} fill="none" stroke="#F5A623" strokeWidth="1.5" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" />
        <text x="0" y="15" fill="#4FD1E8" fontSize="10" fontFamily="monospace">Fuel %</text>
        <text x="60" y="15" fill="#3DDC97" fontSize="10" fontFamily="monospace">Battery %</text>
        <text x="140" y="15" fill="#F5A623" fontSize="10" fontFamily="monospace">Load %</text>
      </svg>
    </div>
  );
}

export default EnergyChart;
