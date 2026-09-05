/**
 * Header component — station name, live badge, Antarctica context
 */
import { useParams } from 'react-router-dom';
import LiveBadge from './LiveBadge';

const STATION_INFO = {
  BHARATI: {
    name: 'Bharati',
    subtitle: 'Dakshin Gangotri, Antarctica',
    coords: '69°S, 76°E',
    icon: 'Snowflake',
  },
  MAITRI: {
    name: 'Maitri',
    subtitle: 'Schirmacher Oasis, Antarctica',
    coords: '70.76°S, 11.73°E',
    icon: 'Compass',
  },
  COMPARE: {
    name: 'Cross-Station Comparison',
    subtitle: 'Bharati & Maitri',
    coords: '—',
    icon: 'Satellite',
  },
};

export default function Header() {
  const { stationId } = useParams();
  const key = (stationId || 'BHARATI').toUpperCase();
  const info = STATION_INFO[key] || STATION_INFO.BHARATI;

  return (
    <header className="relative border-b border-ice-400/10 bg-ice-900/80 backdrop-blur-md z-10">
      {/* Aurora gradient accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-aurora-green/30 via-ice-400/30 to-aurora-purple/30" />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Left: Station identity */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-ice-400/10 border border-ice-400/20 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full bg-ice-400/30 animate-pulse-slow" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-bold tracking-wider text-ice-50">{info.name}</h1>
            <p className="text-xs text-ice-300">{info.subtitle} · {info.coords}</p>
          </div>
        </div>

        {/* Center: Divider or connection status */}
        <div className="hidden md:flex items-center gap-2 text-xs text-ice-400">
          <span>NCPOR</span>
          <span className="text-ice-600">│</span>
          <span>DIGITAL TWIN v1.0</span>
        </div>

        {/* Right: Live badge */}
        <LiveBadge />
      </div>
    </header>
  );
}
