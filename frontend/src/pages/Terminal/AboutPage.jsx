/**
 * AboutPage — System Info (Terminal Edition)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';
import HudPanel from '../../components/Terminal/HudPanel';

export default function AboutPage() {
  const { selectedStation, setSelectedStation } = useApp();
  const handleStationChange = (s) => setSelectedStation(s);

  return (
    <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
      <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TerminalHeader blackout={false} connected={true} selectedStation={selectedStation} onStationChange={handleStationChange} />

        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--term-green)',
              margin: 0,
            }}>
              SYSTEM INFORMATION
            </h1>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.06em',
              color: 'var(--term-text-dimmer)',
            }}>
              PROBLEM STATEMENT 26060 — SIH 2026
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '6px',
          }}>
            <HudPanel title="The Problem" icon="◈">
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--term-text)',
                lineHeight: 1.6,
              }}>
                India operates two permanent Antarctic research stations — Bharati and Maitri — through NCPOR. These stations face extreme environmental conditions, limited satellite connectivity, and complex interdependencies between power, heating, logistics, and infrastructure systems.
              </div>
            </HudPanel>

            <HudPanel title="Our Solution" icon="◆">
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--term-text)',
                lineHeight: 1.6,
              }}>
                A full-stack digital twin platform with real-time sensor simulation, priority-based alert classification, blackout-resistant data queuing, lightweight predictive analytics, and what-if scenario simulation — all running locally.
              </div>
            </HudPanel>

            <HudPanel title="Technology Stack" icon="⟩">
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--term-text-dim)',
                lineHeight: 1.8,
              }}>
                <div>• React + Vite + TailwindCSS</div>
                <div>• Node.js + Express</div>
                <div>• SQLite (sql.js)</div>
                <div>• Socket.io (real-time)</div>
                <div>• Vanilla JS gauges & charts</div>
                <div>• No cloud dependencies</div>
              </div>
            </HudPanel>

            <HudPanel title="Key Features" icon="★">
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--term-text-dim)',
                lineHeight: 1.8,
              }}>
                <div>• [01] Sensor Simulation Engine</div>
                <div>• [02] Real-time Dashboard</div>
                <div>• [03] P0/P1/P2 Alert Classification</div>
                <div>• [04] Blackout Priority Sync</div>
                <div>• [05] Predictive Analytics</div>
                <div>• [06] What-If Simulator</div>
                <div>• [07] Cross-Station Compare</div>
              </div>
            </HudPanel>
          </div>

          <HudPanel title="System Specs" icon="▣">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
            }}>
              {[
                ['VERSION', 'v2.0.0'],
                ['PLATFORM', 'LOCAL'],
                ['BACKEND', 'NODE.JS + EXPRESS'],
                ['DATABASE', 'SQLITE'],
                ['PROTOCOL', 'SOCKET.IO'],
                ['SIM RATE', '5s / TICK'],
                ['STATIONS', 'BHARATI + MAITRI'],
                ['LATENCY', '<50ms'],
                ['DEPLOY', 'npm run dev'],
              ].map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px 6px',
                  borderBottom: '1px solid var(--term-border-dim)',
                }}>
                  <span style={{ color: 'var(--term-text-label)', letterSpacing: '0.06em' }}>{k}</span>
                  <span style={{ color: 'var(--term-green)' }}>{v}</span>
                </div>
              ))}
            </div>
          </HudPanel>
        </div>
      </div>
    </div>
  );
}
