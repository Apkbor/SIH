/**
 * DashboardOverview — Mission Control Home Screen (Terminal Edition)
 * Dense multi-panel grid with HUD corner brackets throughout
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { getBuildings, getInventory, getReadings } from '../../services/api';
import HudPanel from '../../components/Terminal/HudPanel';
import RingGauge from '../../components/Terminal/RingGauge';
import Sparkline from '../../components/Terminal/Sparkline';
import StatusPill from '../../components/Terminal/StatusPill';
import LogLine from '../../components/Terminal/LogLine';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';

const STATION_NAMES = { BHARATI: 'Bharati', MAITRI: 'Maitri' };

function getReading(liveData, stationId, type) {
  return liveData?.[`${stationId}:${type}`] || null;
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const {
    selectedStation, setSelectedStation,
    liveData, alerts, blackout, connected,
    send, connectionStatus, notifications,
  } = useApp();

  // ─── Local state (must come before any early return) ───
  const [latest, setLatest] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [error, setError] = useState(null);
  const [overrideCooldown, setOverrideCooldown] = useState(false);
  const [logs, setLogs] = useState([]);
  const [simResult, setSimResult] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const logIdRef = useRef(0);

  // "BOTH" redirect — compare page handles cross-station views
  useEffect(() => {
    if (selectedStation === 'BOTH') navigate('/compare', { replace: true });
  }, [selectedStation, navigate]);

  if (selectedStation === 'BOTH') {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={setSelectedStation} />
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <TerminalHeader
            blackout={blackout}
            connected={connected}
            selectedStation={selectedStation}
            onStationChange={setSelectedStation}
          />
          <div style={{
            padding: '40px', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}>
            <div style={{
              width: '28px', height: '28px',
              border: '2px solid var(--term-border)',
              borderTopColor: 'var(--term-green)',
              borderRadius: '50%',
              animation: 'termPulse 0.8s linear infinite',
            }} />
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px', letterSpacing: '0.08em',
              color: 'var(--term-text-dim)',
            }}>REDIRECTING TO COMPARISON VIEW...</span>
          </div>
        </div>
      </div>
    );
  }

  const energy = getReading(liveData, selectedStation, 'energy');
  const env = getReading(liveData, selectedStation, 'environment');
  const infra = getReading(liveData, selectedStation, 'infrastructure');

  const handleStationChange = (s) => {
    setSelectedStation(s);
    setSimResult(null);
  };

  // Initial data load
  useEffect(() => {
    setError(null);
    fetch(`/api/stations/${selectedStation}/latest`)
      .then(r => { if (!r.ok) throw new Error('Backend unreachable'); return r.json(); })
      .then(setLatest)
      .catch(err => setError(err.message));
  }, [selectedStation]);

  useEffect(() => {
    Promise.all([
      getBuildings(selectedStation).catch(() => []),
      getInventory(selectedStation).catch(() => []),
    ]).then(([b, i]) => { setBuildings(b); setInventory(i); });
  }, [selectedStation]);

  // Simulated system log — derive from live data changes
  const prevEnergyRef = useRef(null);
  useEffect(() => {
    if (!energy) return;
    const prev = prevEnergyRef.current;
    prevEnergyRef.current = energy;
    if (!prev) return;

    const ts = new Date().toISOString().slice(11, 23);
    const entries = [];

    const fuelDelta = prev.fuelPercent - energy.fuelPercent;
    if (Math.abs(fuelDelta) > 0.1) {
      entries.push({
        id: ++logIdRef.current,
        ts,
        msg: `FUEL ${fuelDelta > 0 ? 'CONSUMED' : 'RESTORED'}: ${prev.fuelPercent.toFixed(1)}% → ${energy.fuelPercent.toFixed(1)}%`,
        severity: fuelDelta > 1 ? 'WARN' : 'INFO',
      });
    }

    const battDelta = energy.batteryPercent - prev.batteryPercent;
    if (Math.abs(battDelta) > 0.1) {
      entries.push({
        id: ++logIdRef.current,
        ts,
        msg: `BATTERY ${battDelta > 0 ? 'CHARGED' : 'DRAINED'}: ${prev.batteryPercent.toFixed(1)}% → ${energy.batteryPercent.toFixed(1)}%`,
        severity: battDelta < -1 ? 'WARN' : 'INFO',
      });
    }

    if (energy.generatorTempC > 100) {
      entries.push({
        id: ++logIdRef.current,
        ts,
        msg: `GEN TEMP CRITICAL: ${energy.generatorTempC.toFixed(1)}°C — maintenance required`,
        severity: 'ERROR',
      });
    }

    const criticalAlerts = alerts.filter(a => a.stationId === selectedStation && a.priority === 'P0' && !a.resolved);
    if (criticalAlerts.length > 0 && Math.random() > 0.7) {
      entries.push({
        id: ++logIdRef.current,
        ts,
        msg: `P0 ALERT ACTIVE: ${criticalAlerts[0]?.title || 'System fault detected'}`,
        severity: 'ERROR',
      });
    }

    if (entries.length > 0) {
      setLogs(prev => [...entries, ...prev].slice(0, 60));
    }
  }, [energy, alerts, selectedStation]);

  // Alerts
  const activeAlerts = useMemo(() => {
    return alerts.filter(a => a.stationId === selectedStation && !a.resolved);
  }, [alerts, selectedStation]);

  const criticalAlerts = activeAlerts.filter(a => a.priority === 'P0');
  const warningAlerts = activeAlerts.filter(a => a.priority === 'P1');

  const healthScore = useMemo(() => {
    if (!energy) return null;
    const avg = (energy.fuelPercent + energy.batteryPercent + (100 - energy.generatorLoad)) / 3;
    if (avg > 70) return { label: 'NOMINAL', color: 'var(--term-green)', pct: avg };
    if (avg > 40) return { label: 'DEGRADED', color: 'var(--term-amber)', pct: avg };
    return { label: 'CRITICAL', color: 'var(--term-red)', pct: avg };
  }, [energy]);

  // Live sparkline data
  const sparklineData = useMemo(() => {
    const history = liveData[`${selectedStation}:energy_history`];
    return history || [];
  }, [liveData, selectedStation]);

  // What-if simulation
  const runScenario = async () => {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/simulate/generator-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: selectedStation }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err) {
      setSimResult({ error: err.message });
    } finally {
      setSimLoading(false);
    }
  };

  const handleBackupOverride = () => {
    if (overrideCooldown) return;
    send('override:backupGenerator', { stationId: selectedStation });
    setOverrideCooldown(true);
    setTimeout(() => setOverrideCooldown(false), 10000);
  };

  // ——— Render ———

  if (error && !energy) {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)' }}>
        <TerminalHeader
          blackout={blackout}
          connected={connected}
          selectedStation={selectedStation}
          onStationChange={handleStationChange}
        />
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            color: 'var(--term-red)',
            letterSpacing: '0.08em',
            marginBottom: '12px',
          }}>
            ⚠ CONNECTION FAILURE
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--term-text-dim)',
            marginBottom: '16px',
          }}>
            {error} — Backend unreachable
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'var(--term-green-50)',
              border: '1px solid var(--term-border-bright)',
              color: 'var(--term-green)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              padding: '6px 14px',
              cursor: 'pointer',
              borderRadius: '2px',
            }}
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  if (!energy) {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)' }}>
        <TerminalHeader
          blackout={blackout}
          connected={connected}
          selectedStation={selectedStation}
          onStationChange={handleStationChange}
        />
        <div style={{
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            border: '2px solid var(--term-border)',
            borderTopColor: 'var(--term-green)',
            borderRadius: '50%',
            animation: 'termPulse 0.8s linear infinite',
          }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: 'var(--term-text-dim)',
          }}>
            AWAITING SENSOR DATA...
          </span>
        </div>
      </div>
    );
  }

  const fuelWarning = energy.fuelPercent < 30;
  const fuelCritical = energy.fuelPercent < 15;
  const battWarning = energy.batteryPercent < 30;
  const battCritical = energy.batteryPercent < 15;

  return (
    <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
      <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <TerminalHeader
          blackout={blackout}
          connected={connected}
          selectedStation={selectedStation}
          onStationChange={handleStationChange}
        />

        {/* Main content */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Station title + status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '18px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--term-green)',
                margin: 0,
              }}>
                {STATION_NAMES[selectedStation]} — COMMAND OVERVIEW
              </h1>
              <StatusPill text="NOMINAL" color="var(--term-green)" />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.06em',
                color: 'var(--term-text-dimmer)',
              }}>
                INDIA · ANTARCTICA · {energy.timestamp ? new Date(energy.timestamp).toISOString().slice(0,10) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => navigate('/monitoring')}
                style={navBtnStyle}
              >
                MONITOR
              </button>
              <button
                onClick={() => navigate('/alerts')}
                style={navBtnStyle}
              >
                ALERTS ({activeAlerts.length})
              </button>
              <button
                onClick={() => navigate('/forecasts')}
                style={navBtnStyle}
              >
                FORECASTS
              </button>
            </div>
          </div>

          {/* === TOP ROW: Key Metrics === */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '6px',
          }}>
            <HudPanel title="Fuel Reserves" icon="⛽">
              <RingGauge value={energy.fuelPercent} unit="%" warning={fuelWarning} critical={fuelCritical} />
            </HudPanel>
            <HudPanel title="Battery Banks" icon="🔋">
              <RingGauge value={energy.batteryPercent} unit="%" warning={battWarning} critical={battCritical} />
            </HudPanel>
            <HudPanel title="Generator Load" icon="⚙">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '36px',
                  fontWeight: 700,
                  color: energy.generatorLoad > 80 ? 'var(--term-amber)' : 'var(--term-green)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {energy.generatorLoad.toFixed(0)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'var(--term-text-dim)',
                }}>PERCENT</span>
              </div>
            </HudPanel>
            <HudPanel title="Solar Output" icon="☀">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '36px',
                  fontWeight: 700,
                  color: energy.solarOutput > 1 ? 'var(--term-green)' : 'var(--term-text-dim)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {energy.solarOutput.toFixed(1)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'var(--term-text-dim)',
                }}>kW</span>
              </div>
            </HudPanel>
            <HudPanel title="Gen Temperature" icon="🌡">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '36px',
                  fontWeight: 700,
                  color: energy.generatorTempC > 100 ? 'var(--term-red)' : energy.generatorTempC > 90 ? 'var(--term-amber)' : 'var(--term-green)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {energy.generatorTempC.toFixed(0)}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'var(--term-text-dim)',
                }}>°C</span>
              </div>
            </HudPanel>
            <HudPanel title="Health Score" icon="◆">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '20px',
                  fontWeight: 700,
                  color: healthScore?.color || 'var(--term-green)',
                  lineHeight: 1,
                }}>
                  {healthScore?.label || '—'}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'var(--term-text-dim)',
                }}>
                  {healthScore?.pct ? `${healthScore.pct.toFixed(0)}% OPS` : '—'}
                </span>
              </div>
            </HudPanel>
          </div>

          {/* === MIDDLE ROW: Environment + Alerts + Log === */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
          }}>
            {/* Environment */}
            <HudPanel title="Environment Sensors" icon="❄">
              {env ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'TEMP', value: env.temperatureC?.toFixed(1) || '—', unit: '°C', warn: env.temperatureC < -40 },
                    { label: 'WIND', value: env.windSpeedKmh?.toFixed(0) || '—', unit: 'km/h', warn: env.windSpeedKmh > 80 },
                    { label: 'HUMIDITY', value: env.humidityPercent?.toFixed(0) || '—', unit: '%' },
                  ].map(s => (
                    <div key={s.label} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '3px 0',
                      borderBottom: '1px solid var(--term-border-dim)',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 500,
                        letterSpacing: '0.08em',
                        color: 'var(--term-text-dim)',
                      }}>
                        {s.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {s.warn && <span style={{ color: 'var(--term-amber)', fontSize: '8px' }}>⚠</span>}
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: s.warn ? 'var(--term-amber)' : 'var(--term-green)',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {s.value}
                        </span>
                        <span className="term-unit">
                          {s.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                  {env.temperatureC && (
                    <div style={{ marginTop: '2px' }}>
                      <Sparkline data={[env.temperatureC - 2, env.temperatureC - 1, env.temperatureC]} color="var(--term-cyan)" width={140} height={20} />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--term-text-dimmer)', fontSize: '10px', textAlign: 'center', padding: '8px' }}>
                  AWAITING DATA
                </div>
              )}
            </HudPanel>

            {/* Active Alerts */}
            <HudPanel title="Active Alerts" icon="⚠" status={{ text: `${activeAlerts.length} ACTIVE`, color: criticalAlerts.length > 0 ? 'var(--term-red)' : 'var(--term-text-dim)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '160px', overflowY: 'auto' }}>
                {activeAlerts.length === 0 ? (
                  <div style={{ color: 'var(--term-text-dimmer)', fontSize: '10px', textAlign: 'center', padding: '8px' }}>
                    NO ACTIVE ALERTS
                  </div>
                ) : (
                  activeAlerts.slice(0, 12).map(alert => (
                    <div key={alert.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 6px',
                      background: alert.priority === 'P0' ? 'var(--term-red-bg)' : alert.priority === 'P1' ? 'var(--term-amber-bg)' : 'transparent',
                      border: `1px solid ${alert.priority === 'P0' ? 'var(--term-red-border)' : alert.priority === 'P1' ? 'var(--term-amber-border)' : 'var(--term-border-dim)'}`,
                      borderRadius: '2px',
                      cursor: 'pointer',
                    }} onClick={() => navigate('/alerts')}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: alert.priority === 'P0' ? 'var(--term-red)' : alert.priority === 'P1' ? 'var(--term-amber)' : 'var(--term-text-dimmer)',
                        width: '22px',
                        flexShrink: 0,
                      }}>
                        {alert.priority}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--term-text-dim)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {alert.title}
                      </span>
                      {!alert.acknowledged && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '8px',
                          color: 'var(--term-amber)',
                          letterSpacing: '0.04em',
                        }}>NEW</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </HudPanel>

            {/* System Log */}
            <HudPanel title="System Log" icon="⟩">
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1px',
                maxHeight: '160px',
                overflowY: 'auto',
                background: 'var(--term-bg-inset)',
                padding: '6px',
                border: '1px solid var(--term-border-dim)',
                borderRadius: '2px',
              }}>
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--term-text-dimmer)', fontSize: '9px', textAlign: 'center', padding: '8px' }}>
                    LISTENING FOR EVENTS...
                  </div>
                ) : (
                  logs.map(log => (
                    <LogLine key={log.id} timestamp={log.ts} message={log.msg} severity={log.severity} />
                  ))
                )}
              </div>
            </HudPanel>
          </div>

          {/* === BOTTOM ROW: Modules + Logistics + Quick Actions === */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '6px',
          }}>
            {/* Station Modules */}
            <HudPanel title="Station Modules" icon="⬡">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {buildings.length === 0 ? (
                  <div style={{ color: 'var(--term-text-dimmer)', fontSize: '10px', textAlign: 'center', padding: '8px' }}>
                    LOADING MODULES...
                  </div>
                ) : (
                  buildings.map(b => {
                    const bData = infra?.[b.id] || {};
                    const isOnline = bData.powerOn !== false;
                    const isHeating = bData.heatingOn !== false;
                    const statusColor = isOnline ? 'var(--term-green)' : 'var(--term-red)';
                    const statusText = isOnline ? 'ONLINE' : 'OFFLINE';

                    return (
                      <div key={b.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 6px',
                        borderBottom: '1px solid var(--term-border-dim)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            display: 'inline-block',
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: statusColor,
                            boxShadow: `0 0 3px ${statusColor}`,
                          }} />
                          <div>
                            <div style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: 600,
                              color: 'var(--term-text)',
                              letterSpacing: '0.04em',
                            }}>
                              {b.name.toUpperCase()}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '8px',
                              color: 'var(--term-text-dimmer)',
                              letterSpacing: '0.06em',
                            }}>
                              {b.id} · {b.type}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: isHeating ? 'var(--term-green)' : 'var(--term-text-dimmer)',
                            padding: '1px 4px',
                            border: `1px solid ${isHeating ? 'var(--term-border)' : 'var(--term-border-dim)'}`,
                            borderRadius: '2px',
                          }}>
                            {isHeating ? 'HEAT' : 'NOH'}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: statusColor,
                            padding: '1px 4px',
                            border: `1px solid ${isOnline ? 'var(--term-border)' : 'var(--term-red-border)'}`,
                            borderRadius: '2px',
                          }}>
                            {statusText}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </HudPanel>

            {/* Logistics / Inventory */}
            <HudPanel title="Reserves" icon="📦">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {inventory.length === 0 ? (
                  <div style={{ color: 'var(--term-text-dimmer)', fontSize: '10px', textAlign: 'center', padding: '8px' }}>
                    LOADING INVENTORY...
                  </div>
                ) : (
                  inventory.slice(0, 6).map(item => (
                    <div key={item.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          letterSpacing: '0.04em',
                          color: 'var(--term-text)',
                          marginBottom: '2px',
                        }}>
                          {item.item.toUpperCase()}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '8px',
                          color: 'var(--term-text-dimmer)',
                        }}>
                          {item.days_remaining?.toFixed(0) || '—'} days · {item.current_qty} {item.unit}
                        </div>
                        <div style={{
                          height: '3px',
                          background: 'var(--term-border)',
                          marginTop: '2px',
                          borderRadius: '1px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (item.days_remaining / Math.max(item.daily_rate * 60, 1)) * 100)}%`,
                            background: item.days_remaining < 10 ? 'var(--term-red)' : item.days_remaining < 25 ? 'var(--term-amber)' : 'var(--term-green)',
                            boxShadow: `0 0 4px ${item.days_remaining < 10 ? 'var(--term-red)' : item.days_remaining < 25 ? 'var(--term-amber)' : 'var(--term-green)'}`,
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </HudPanel>

            {/* Quick Actions + What-if */}
            <HudPanel title="Quick Actions" icon="◆">
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4px',
              }}>
                <button onClick={runScenario} disabled={simLoading} style={quickActionBtnStyle}>
                  <div style={{ fontSize: '14px', marginBottom: '2px' }}>🔬</div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    letterSpacing: '0.06em',
                  }}>
                    {simLoading ? 'RUNNING...' : 'FAIL SCENARIO'}
                  </span>
                </button>

                <button onClick={handleBackupOverride} disabled={overrideCooldown} style={quickActionBtnStyle}>
                  <div style={{ fontSize: '14px', marginBottom: '2px' }}>⚡</div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    letterSpacing: '0.06em',
                    color: overrideCooldown ? 'var(--term-text-dimmer)' : undefined,
                  }}>
                    {overrideCooldown ? 'COOLDOWN' : 'BACKUP GEN'}
                  </span>
                </button>

                <button onClick={() => navigate('/alerts')} style={quickActionBtnStyle}>
                  <div style={{ fontSize: '14px', marginBottom: '2px' }}>⚠</div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    letterSpacing: '0.06em',
                  }}>VIEW ALERTS</span>
                </button>

                <button onClick={() => navigate('/forecasts')} style={quickActionBtnStyle}>
                  <div style={{ fontSize: '14px', marginBottom: '2px' }}>🔮</div>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    letterSpacing: '0.06em',
                  }}>FORECASTS</span>
                </button>
              </div>

              {/* What-if result */}
              {simResult && (
                <div style={{
                  marginTop: '8px',
                  padding: '8px',
                  background: 'var(--term-bg-inset)',
                  border: '1px solid var(--term-border)',
                  borderRadius: '2px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--term-text-dim)',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}>
                  {simResult.error ? (
                    <span style={{ color: 'var(--term-red)' }}>{simResult.error}</span>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: 'var(--term-amber)', letterSpacing: '0.06em' }}>FAILURE IMPACT</span>
                      <span>{simResult.buildingsAffected || 0} buildings affected</span>
                      <span>{simResult.criticalBuildingsAffected || 0} critical</span>
                      <span>Battery: {simResult.batteryCoverageMinutes || 0} min</span>
                    </div>
                  )}
                </div>
              )}

              {/* Feature 1: Recent dispatches summary */}
              {notifications.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    letterSpacing: '0.08em',
                    color: 'var(--term-text-dimmer)',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}>
                    Recent Authority Dispatches
                  </div>
                  {notifications.slice(0, 3).map(n => (
                    <div key={n.id} style={{
                      padding: '4px 6px',
                      background: 'var(--term-bg-inset)',
                      border: '1px solid var(--term-border-dim)',
                      borderRadius: '2px',
                      marginBottom: '2px',
                      fontSize: '9px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--term-text-dim)',
                    }}>
                      <span style={{ color: n.status === 'delivered' ? 'var(--term-green)' : 'var(--term-amber)' }}>
                        {n.status?.toUpperCase()}
                      </span>
                      {' → '}
                      <span style={{ color: 'var(--term-text)' }}>{n.authority?.split('—')[0]?.trim()}</span>
                      {' · '}
                      <span style={{ fontSize: '8px' }}>{n.subject?.split('—')[0]?.trim().slice(0, 30)}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/notifications')}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      letterSpacing: '0.06em',
                      color: 'var(--term-cyan-dim)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 0',
                      textTransform: 'uppercase',
                    }}
                  >
                    VIEW FULL DISPATCH LOG →
                  </button>
                </div>
              )}
            </HudPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: 'var(--term-green-08)',
  border: '1px solid var(--term-border)',
  color: 'var(--term-text-dim)',
  fontFamily: 'var(--font-mono)',
  fontSize: '10px',
  letterSpacing: '0.06em',
  padding: '4px 10px',
  cursor: 'pointer',
  borderRadius: '2px',
  textTransform: 'uppercase',
};

const quickActionBtnStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  padding: '8px 4px',
  background: 'var(--term-bg-inset)',
  border: '1px solid var(--term-border)',
  color: 'var(--term-text-dim)',
  cursor: 'pointer',
  borderRadius: '2px',
  fontFamily: 'var(--font-mono)',
  fontSize: '8px',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  transition: 'all 180ms ease',
};
