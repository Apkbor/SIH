/**
 * SimulatorPage — What-If Simulator (Terminal Edition)
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { simulateGeneratorFailure, simulateFuelDisruption } from '../../services/api';
import HudPanel from '../../components/Terminal/HudPanel';
import StatusPill from '../../components/Terminal/StatusPill';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';

const STATION_NAMES = { BHARATI: 'Bharati', MAITRI: 'Maitri' };

const SCENARIOS = [
  { id: 'generator-failure', title: 'GENERATOR FAILURE', icon: '⚙', desc: 'Simulate primary generator failure — assess impact on buildings, battery backup, and critical operations.' },
  { id: 'fuel-disruption', title: 'FUEL DISRUPTION', icon: '⛽', desc: 'Simulate fuel supply interruption — calculate operational endurance at current consumption rates.' },
];

export default function SimulatorPage() {
  const navigate = useNavigate();
  const { selectedStation, setSelectedStation, send, blackout } = useApp();

  // "BOTH" → redirect to compare view
  useEffect(() => {
    if (selectedStation === 'BOTH') navigate('/compare', { replace: true });
  }, [selectedStation, navigate]);

  if (selectedStation === 'BOTH') {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={setSelectedStation} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TerminalHeader blackout={blackout} connected={false} selectedStation={selectedStation} onStationChange={setSelectedStation} />
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              letterSpacing: '0.08em', color: 'var(--term-text-dim)',
            }}>REDIRECTING TO COMPARISON VIEW...</div>
          </div>
        </div>
      </div>
    );
  }

  const [selectedScenario, setSelectedScenario] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [overrideCooldown, setOverrideCooldown] = useState(false);

  const handleStationChange = (s) => setSelectedStation(s);

  const handleRun = async () => {
    if (!selectedScenario) return;
    setLoading(true);
    setResult(null);
    try {
      let data;
      if (selectedScenario === 'generator-failure') {
        data = await simulateGeneratorFailure(selectedStation);
      } else {
        data = await simulateFuelDisruption(selectedStation);
      }
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleBackupOverride = () => {
    if (overrideCooldown) return;
    send('override:backupGenerator', { stationId: selectedStation });
    setOverrideCooldown(true);
    setTimeout(() => setOverrideCooldown(false), 10000);
  };

  return (
    <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
      <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TerminalHeader blackout={blackout} connected={true} selectedStation={selectedStation} onStationChange={handleStationChange} />

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
              WHAT-IF SIMULATOR
            </h1>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.06em',
              color: 'var(--term-text-dimmer)',
            }}>
              {STATION_NAMES[selectedStation]} — SCENARIO PROJECTION ENGINE [READ-ONLY]
            </span>
          </div>

          {/* Scenario selector */}
          <HudPanel title="Select Scenario" icon="▶">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '6px',
            }}>
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedScenario(s.id); setResult(null); }}
                  style={{
                    padding: '12px',
                    background: selectedScenario === s.id ? 'var(--term-green-08)' : 'var(--term-bg-inset)',
                    border: `1px solid ${selectedScenario === s.id ? 'var(--term-border-bright)' : 'var(--term-border)'}`,
                    borderRadius: '2px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 180ms ease',
                  }}
                >
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: selectedScenario === s.id ? 'var(--term-green)' : 'var(--term-text-dim)',
                    marginBottom: '4px',
                  }}>
                    {s.title}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--term-text-dimmer)',
                    lineHeight: 1.4,
                  }}>
                    {s.desc}
                  </div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
              <button
                onClick={handleRun}
                disabled={!selectedScenario || loading}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  padding: '6px 16px',
                  background: selectedScenario && !loading ? 'var(--term-green-08)' : 'var(--term-bg-inset)',
                  color: selectedScenario && !loading ? 'var(--term-green)' : 'var(--term-text-dimmer)',
                  border: `1px solid ${selectedScenario && !loading ? 'var(--term-border-bright)' : 'var(--term-border)'}`,
                  borderRadius: '2px',
                  cursor: selectedScenario && !loading ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? 'COMPUTING...' : '[ RUN SIMULATION ]'}
              </button>
              <button
                onClick={handleBackupOverride}
                disabled={overrideCooldown}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  padding: '6px 16px',
                  background: 'var(--term-amber-bg)',
                  color: overrideCooldown ? 'var(--term-text-dimmer)' : 'var(--term-amber)',
                  border: '1px solid var(--term-amber-border)',
                  borderRadius: '2px',
                  cursor: overrideCooldown ? 'not-allowed' : 'pointer',
                }}
              >
                {overrideCooldown ? 'COOLDOWN...' : '[ BACKUP GEN OVERRIDE ]'}
              </button>
            </div>
          </HudPanel>

          {/* Simulation result */}
          {result && (
            <HudPanel title="Simulation Results" icon="◈">
              {result.error ? (
                <div style={{ color: 'var(--term-red)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  ERROR: {result.error}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '6px',
                  }}>
                    {[
                      { label: 'BUILDINGS AFFECTED', value: `${result.buildingsAffected || 0}`, warn: (result.buildingsAffected || 0) > 0 },
                      { label: 'CRITICAL BUILDINGS', value: `${result.criticalBuildingsAffected || 0}`, warn: (result.criticalBuildingsAffected || 0) > 0 },
                      { label: 'BATTERY COVERAGE', value: `${result.batteryCoverageMinutes || 0} min`, warn: (result.batteryCoverageMinutes || 0) < 30 },
                      { label: 'BACKUP CAPACITY', value: `${(result.backupCanCover || 0)}%`, warn: (result.backupCanCover || 0) < 50 },
                    ].map(item => (
                      <div key={item.label} style={{
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
                        }}>
                          {item.label}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '18px',
                          fontWeight: 700,
                          color: item.warn ? 'var(--term-amber)' : 'var(--term-green)',
                          lineHeight: 1,
                        }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {result.affectedBuildings?.length > 0 && (
                    <div style={{
                      padding: '8px',
                      background: 'var(--term-bg-inset)',
                      border: '1px solid var(--term-red-border)',
                      borderRadius: '2px',
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'var(--term-red)',
                        letterSpacing: '0.06em',
                        marginBottom: '4px',
                      }}>
                        AFFECTED BUILDINGS
                      </div>
                      {result.affectedBuildings.map((b, i) => (
                        <div key={i} style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--term-text-dim)',
                        }}>
                          • {b.name || b.id} {b.powerLoss ? '[POWER LOSS]' : ''} {b.critical ? '[CRITICAL]' : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </HudPanel>
          )}
        </div>
      </div>
    </div>
  );
}
