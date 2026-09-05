/**
 * ComparePage — Cross-Station Comparison (Terminal Edition)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { getComparison } from '../../services/api';
import HudPanel from '../../components/Terminal/HudPanel';
import StatusPill from '../../components/Terminal/StatusPill';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';

const STATION_NAMES = { BHARATI: 'Bharati', MAITRI: 'Maitri' };

function StationPanel({ data, stationKey }) {
  const energy = data?.energy;
  const environment = data?.environment;

  return (
    <HudPanel
      title={STATION_NAMES[stationKey]}
      icon="⊕"
      status={{
        text: data?.isStale ? 'NO DATA' : `${data?.alertCount || 0} ALERTS`,
        color: data?.isStale ? 'var(--term-amber)' : 'var(--term-text-dim)',
      }}
      glow={!data?.isStale}
    >
      {data?.isStale ? (
        <div style={{
          padding: '12px',
          background: 'var(--term-amber-bg)',
          border: '1px solid var(--term-amber-border)',
          borderRadius: '2px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--term-amber)',
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}>
          ⚠ LAST READING >20s AGO — DATA MAY BE STALE
        </div>
      ) : energy ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
          }}>
            <div style={{
              padding: '8px',
              background: 'var(--term-bg-inset)',
              border: '1px solid var(--term-border-dim)',
              borderRadius: '2px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.08em',
                color: 'var(--term-text-label)',
                marginBottom: '4px',
              }}>FUEL</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 700,
                color: energy.fuelPercent < 25 ? 'var(--term-red)' : energy.fuelPercent < 40 ? 'var(--term-amber)' : 'var(--term-green)',
              }}>
                {energy.fuelPercent.toFixed(1)}<span style={{ fontSize: '10px' }}>%</span>
              </div>
            </div>
            <div style={{
              padding: '8px',
              background: 'var(--term-bg-inset)',
              border: '1px solid var(--term-border-dim)',
              borderRadius: '2px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.08em',
                color: 'var(--term-text-label)',
                marginBottom: '4px',
              }}>BATTERY</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 700,
                color: energy.batteryPercent < 25 ? 'var(--term-red)' : 'var(--term-green)',
              }}>
                {energy.batteryPercent.toFixed(1)}<span style={{ fontSize: '10px' }}>%</span>
              </div>
            </div>
            <div style={{
              padding: '8px',
              background: 'var(--term-bg-inset)',
              border: '1px solid var(--term-border-dim)',
              borderRadius: '2px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.08em',
                color: 'var(--term-text-label)',
                marginBottom: '4px',
              }}>GEN LOAD</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 700,
                color: energy.generatorLoad > 80 ? 'var(--term-amber)' : 'var(--term-green)',
              }}>
                {energy.generatorLoad.toFixed(0)}<span style={{ fontSize: '10px' }}>%</span>
              </div>
            </div>
            <div style={{
              padding: '8px',
              background: 'var(--term-bg-inset)',
              border: '1px solid var(--term-border-dim)',
              borderRadius: '2px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.08em',
                color: 'var(--term-text-label)',
                marginBottom: '4px',
              }}>SOLAR</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--term-cyan)',
              }}>
                {energy.solarOutput.toFixed(1)}<span style={{ fontSize: '10px' }}>kW</span>
              </div>
            </div>
          </div>

          {environment && (
            <div style={{
              padding: '8px',
              background: 'var(--term-bg-inset)',
              border: '1px solid var(--term-cyan)',
              borderRadius: '2px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.08em',
                color: 'var(--term-cyan)',
                marginBottom: '4px',
              }}>ENVIRONMENT</div>
              <div style={{
                display: 'flex',
                gap: '12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}>
                <span style={{ color: 'var(--term-cyan)' }}>{environment.temperatureC?.toFixed(1)}°C</span>
                <span style={{ color: 'var(--term-green)' }}>{environment.windSpeedKmh?.toFixed(0)} km/h</span>
                <span style={{ color: 'var(--term-text-dim)' }}>{environment.humidityPercent?.toFixed(0)}% RH</span>
              </div>
            </div>
          )}

          {data?.forecast?.fuelMessage && (
            <div style={{
              padding: '6px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--term-text-dim)',
              borderTop: '1px solid var(--term-border-dim)',
            }}>
              {data.forecast.fuelMessage}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--term-text-dimmer)',
          textAlign: 'center',
          padding: '8px',
          letterSpacing: '0.06em',
        }}>
          AWAITING DATA
        </div>
      )}
    </HudPanel>
  );
}

export default function ComparePage() {
  const { selectedStation, setSelectedStation } = useApp();
  const [compareData, setCompareData] = useState(null);
  const [patterns, setPatterns] = useState([]);

  useEffect(() => {
    getComparison().then(setCompareData);
  }, []);

  useEffect(() => {
    if (!compareData?.BHARATI?.energy || !compareData?.MAITRI?.energy) return;
    const found = [];
    const b = compareData.BHARATI.energy;
    const m = compareData.MAITRI.energy;

    if (b.fuelPercent < 25 && m.fuelPercent < 25) {
      found.push({ severity: 'critical', message: 'Both stations have critically low fuel — coordinate emergency resupply' });
    }
    if (Math.abs(b.generatorLoad - m.generatorLoad) > 20) {
      const high = b.generatorLoad > m.generatorLoad ? 'Bharati' : 'Maitri';
      found.push({ severity: 'warning', message: `${high} has significantly higher generator load — verify load balancing` });
    }
    if (compareData.BHARATI.environment && compareData.MAITRI.environment) {
      const bTemp = compareData.BHARATI.environment.temperatureC;
      const mTemp = compareData.MAITRI.environment.temperatureC;
      if (Math.abs(bTemp - mTemp) > 10) {
        found.push({ severity: 'info', message: `Temp delta: Bharati ${bTemp.toFixed(1)}°C vs Maitri ${mTemp.toFixed(1)}°C` });
      }
    }
    setPatterns(found);
  }, [compareData]);

  const handleStationChange = (s) => setSelectedStation(s);

  if (!compareData) {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />
        <div style={{ flex: 1 }}>
          <TerminalHeader blackout={false} connected={false} selectedStation={selectedStation} onStationChange={handleStationChange} />
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{
              width: '28px', height: '28px',
              border: '2px solid var(--term-border)',
              borderTopColor: 'var(--term-green)',
              borderRadius: '50%',
              animation: 'termPulse 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: 'var(--term-text-dim)',
            }}>LOADING COMPARISON DATA...</span>
          </div>
        </div>
      </div>
    );
  }

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
              CROSS-STATION COMPARISON
            </h1>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.06em',
              color: 'var(--term-text-dimmer)',
            }}>
              BHARATI ↔ MAITRI — SIDE-BY-SIDE OPERATIONAL OVERVIEW
            </span>
          </div>

          {/* Station panels side by side */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '6px',
          }}>
            <StationPanel data={compareData.BHARATI} stationKey="BHARATI" />
            <StationPanel data={compareData.MAITRI} stationKey="MAITRI" />
          </div>

          {/* Pattern Detection */}
          {patterns.length > 0 ? (
            <HudPanel title="Pattern Detection" icon="◈">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {patterns.map((pattern, i) => (
                  <div key={i} style={{
                    padding: '8px',
                    background: pattern.severity === 'critical' ? 'var(--term-red-bg)' : pattern.severity === 'warning' ? 'var(--term-amber-bg)' : 'var(--term-green-08)',
                    border: `1px solid ${pattern.severity === 'critical' ? 'var(--term-red-border)' : pattern.severity === 'warning' ? 'var(--term-amber-border)' : 'var(--term-border)'}`,
                    borderRadius: '2px',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      color: pattern.severity === 'critical' ? 'var(--term-red)' : pattern.severity === 'warning' ? 'var(--term-amber)' : 'var(--term-green)',
                      marginBottom: '3px',
                      display: 'block',
                    }}>
                      [{pattern.severity.toUpperCase()}]
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--term-text)',
                    }}>
                      {pattern.message}
                    </span>
                  </div>
                ))}
              </div>
            </HudPanel>
          ) : (
            <HudPanel title="Pattern Detection">
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--term-text-dimmer)',
                textAlign: 'center',
                padding: '8px',
                letterSpacing: '0.06em',
              }}>
                NO CROSS-STATION PATTERNS DETECTED — STATIONS OPERATING INDEPENDENTLY
              </div>
            </HudPanel>
          )}

          {/* Quick Comparison Table */}
          <HudPanel title="Quick Comparison" icon="▦">
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
              }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--term-border)' }}>
                    {['METRIC', 'BHARATI', 'MAITRI'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left',
                        padding: '6px 8px',
                        color: 'var(--term-text-label)',
                        letterSpacing: '0.08em',
                        fontWeight: 600,
                        fontSize: '9px',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['FUEL LEVEL', `${compareData.BHARATI?.energy?.fuelPercent?.toFixed(1) || '—'}%`, `${compareData.MAITRI?.energy?.fuelPercent?.toFixed(1) || '—'}%`],
                    ['BATTERY', `${compareData.BHARATI?.energy?.batteryPercent?.toFixed(1) || '—'}%`, `${compareData.MAITRI?.energy?.batteryPercent?.toFixed(1) || '—'}%`],
                    ['GEN LOAD', `${compareData.BHARATI?.energy?.generatorLoad?.toFixed(0) || '—'}%`, `${compareData.MAITRI?.energy?.generatorLoad?.toFixed(0) || '—'}%`],
                    ['ALERTS', `${compareData.BHARATI?.alertCount || 0}`, `${compareData.MAITRI?.alertCount || 0}`],
                    ['CRITICAL', `${compareData.BHARATI?.criticalAlertCount || 0}`, `${compareData.MAITRI?.criticalAlertCount || 0}`],
                    ['LOW INV', `${compareData.BHARATI?.lowInventoryCount || 0}`, `${compareData.MAITRI?.lowInventoryCount || 0}`],
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--term-border-dim)' }}>
                      <td style={{ padding: '5px 8px', color: 'var(--term-text-label)', letterSpacing: '0.06em' }}>{row[0]}</td>
                      <td style={{
                        padding: '5px 8px',
                        fontWeight: 600,
                        color: row[0] === 'CRITICAL' && parseInt(row[1]) > 0 ? 'var(--term-red)' : 'var(--term-green)',
                      }}>{row[1]}</td>
                      <td style={{
                        padding: '5px 8px',
                        fontWeight: 600,
                        color: row[0] === 'CRITICAL' && parseInt(row[2]) > 0 ? 'var(--term-red)' : 'var(--term-green)',
                      }}>{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </HudPanel>
        </div>
      </div>
    </div>
  );
}
