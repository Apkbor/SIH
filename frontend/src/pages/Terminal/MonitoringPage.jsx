/**
 * MonitoringPage — Live Monitoring (Terminal Edition)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { getBuildings, getInventory, getReadings } from '../../services/api';
import HudPanel from '../../components/Terminal/HudPanel';
import RingGauge from '../../components/Terminal/RingGauge';
import Sparkline from '../../components/Terminal/Sparkline';
import StatusPill from '../../components/Terminal/StatusPill';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';

const STATION_NAMES = { BHARATI: 'Bharati', MAITRI: 'Maitri' };

function getReading(liveData, stationId, type) {
  return liveData?.[`${stationId}:${type}`] || null;
}

export default function MonitoringPage() {
  const navigate = useNavigate();
  const { selectedStation, setSelectedStation, liveData, blackout } = useApp();

  // "BOTH" → redirect to compare view
  useEffect(() => {
    if (selectedStation === 'BOTH') navigate('/compare', { replace: true });
  }, [selectedStation, navigate]);

  if (selectedStation === 'BOTH') {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={setSelectedStation} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TerminalHeader blackout={blackout} connected={false} selectedStation={selectedStation} onStationChange={setSelectedStation} showBoth={false} />
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

  const [buildings, setBuildings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      getBuildings(selectedStation).catch(() => []),
      getInventory(selectedStation).catch(() => []),
    ]).then(([b, i]) => { setBuildings(b); setInventory(i); });
  }, [selectedStation]);

  // Poll for history (sparkline data)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const [energy, env] = await Promise.all([
          getReadings(selectedStation, 'energy', 30).catch(() => []),
          getReadings(selectedStation, 'environment', 30).catch(() => []),
        ]);
        setHistory({
          fuel: energy.map(e => e.fuelPercent),
          battery: energy.map(e => e.batteryPercent),
          load: energy.map(e => e.generatorLoad),
          solar: energy.map(e => e.solarOutput),
          temp: env.map(e => e.temperatureC),
          wind: env.map(e => e.windSpeedKmh),
        });
      } catch (e) {
        // silent
      }
    };
    fetchHistory();
    const iv = setInterval(fetchHistory, 5000);
    return () => clearInterval(iv);
  }, [selectedStation]);

  const energy = getReading(liveData, selectedStation, 'energy');
  const env = getReading(liveData, selectedStation, 'environment');
  const infra = getReading(liveData, selectedStation, 'infrastructure');

  const handleStationChange = (s) => setSelectedStation(s);

  if (error && !energy) {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />
        <div style={{ flex: 1 }}>
          <TerminalHeader blackout={blackout} connected={false} selectedStation={selectedStation} onStationChange={handleStationChange} />
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ color: 'var(--term-red)', fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.08em' }}>
              ⚠ CONNECTION FAILURE
            </div>
            <div style={{ color: 'var(--term-text-dim)', fontFamily: 'var(--font-mono)', fontSize: '11px', marginTop: '8px' }}>
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
      <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TerminalHeader
          blackout={blackout}
          connected={!!energy}
          selectedStation={selectedStation}
          onStationChange={handleStationChange}
        />

        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Page title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--term-green)',
                margin: 0,
              }}>
                LIVE MONITORING — {STATION_NAMES[selectedStation]}
              </h1>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.06em',
                color: 'var(--term-text-dimmer)',
              }}>
                REAL-TIME SENSOR FEEDS FROM ALL STATION SYSTEMS
              </span>
            </div>
            {blackout && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--term-red-dim)',
                padding: '3px 8px',
                border: '1px solid var(--term-red-border)',
                background: 'var(--term-red-bg)',
                borderRadius: '2px',
                animation: 'termPulse 1s ease-in-out infinite',
              }}>
                ⚠ BLACKOUT — DATA QUEUED
              </span>
            )}
          </div>

          {!energy ? (
            <div style={{
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
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
                fontSize: '11px',
                letterSpacing: '0.08em',
                color: 'var(--term-text-dim)',
              }}>AWAITING SENSOR DATA...</span>
            </div>
          ) : (
            <>
              {/* Energy Gauges Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '6px',
              }}>
                <HudPanel title="Fuel Reserves" icon="⛽">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <RingGauge value={energy.fuelPercent} unit="%" warning={energy.fuelPercent < 30} critical={energy.fuelPercent < 15} />
                    {history.fuel && <Sparkline data={history.fuel} color="var(--term-green)" width={100} height={20} />}
                  </div>
                </HudPanel>
                <HudPanel title="Battery Banks" icon="🔋">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <RingGauge value={energy.batteryPercent} unit="%" warning={energy.batteryPercent < 30} critical={energy.batteryPercent < 15} />
                    {history.battery && <Sparkline data={history.battery} color="var(--term-cyan)" width={100} height={20} />}
                  </div>
                </HudPanel>
                <HudPanel title="Generator Load" icon="⚙">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '28px',
                      fontWeight: 700,
                      color: energy.generatorLoad > 80 ? 'var(--term-amber)' : 'var(--term-green)',
                      lineHeight: 1,
                    }}>
                      {energy.generatorLoad.toFixed(0)}<span style={{ fontSize: '12px', color: 'var(--term-text-dim)' }}>%</span>
                    </div>
                    {history.load && <Sparkline data={history.load} color="var(--term-amber)" width={100} height={20} />}
                  </div>
                </HudPanel>
                <HudPanel title="Solar Output" icon="☀">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '28px',
                      fontWeight: 700,
                      color: 'var(--term-green)',
                      lineHeight: 1,
                    }}>
                      {energy.solarOutput.toFixed(1)}<span style={{ fontSize: '12px', color: 'var(--term-text-dim)' }}>kW</span>
                    </div>
                    {history.solar && <Sparkline data={history.solar} color="var(--term-green)" width={100} height={20} />}
                  </div>
                </HudPanel>
                <HudPanel title="Gen Temp" icon="🌡">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '28px',
                      fontWeight: 700,
                      color: energy.generatorTempC > 100 ? 'var(--term-red)' : energy.generatorTempC > 90 ? 'var(--term-amber)' : 'var(--term-green)',
                      lineHeight: 1,
                    }}>
                      {energy.generatorTempC.toFixed(0)}<span style={{ fontSize: '12px', color: 'var(--term-text-dim)' }}>°C</span>
                    </div>
                    {history.temp && <Sparkline data={history.temp} color="var(--term-cyan)" width={100} height={20} />}
                  </div>
                </HudPanel>
              </div>

              {/* Environment + Wind */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
              }}>
                <HudPanel title="Temperature" icon="❄">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '32px',
                      fontWeight: 700,
                      color: 'var(--term-cyan)',
                      lineHeight: 1,
                    }}>
                      {env?.temperatureC?.toFixed(1)}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--term-text-dim)',
                    }}>°C</span>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <Sparkline data={history.temp || []} color="var(--term-cyan)" width={180} height={30} filled />
                  </div>
                  <div style={{
                    marginTop: '4px',
                    display: 'flex',
                    gap: '8px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    color: 'var(--term-text-dimmer)',
                    letterSpacing: '0.04em',
                  }}>
                    <span>WIND {env?.windSpeedKmh?.toFixed(0)}km/h</span>
                    <span>HUMIDITY {env?.humidityPercent?.toFixed(0)}%</span>
                  </div>
                </HudPanel>

                <HudPanel title="Wind Conditions" icon="💨">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '32px',
                      fontWeight: 700,
                      color: env?.windSpeedKmh > 80 ? 'var(--term-amber)' : 'var(--term-green)',
                      lineHeight: 1,
                    }}>
                      {env?.windSpeedKmh?.toFixed(0)}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--term-text-dim)',
                    }}>km/h</span>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <Sparkline data={history.wind || []} color="var(--term-green)" width={180} height={30} filled />
                  </div>
                  {env?.windSpeedKmh > 80 && (
                    <div style={{
                      marginTop: '4px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      letterSpacing: '0.06em',
                      color: 'var(--term-amber)',
                    }}>
                      ⚠ HIGH WIND — EXTREME CONDITIONS
                    </div>
                  )}
                </HudPanel>
              </div>

              {/* Building Status + Logistics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
              }}>
                <HudPanel title="Station Modules" icon="⬡">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {buildings.map(b => {
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
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: statusColor,
                              boxShadow: `0 0 3px ${statusColor}`,
                              display: 'inline-block',
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
                    })}
                  </div>
                </HudPanel>

                <HudPanel title="Inventory Reserves" icon="📦">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {inventory.map(item => {
                      const days = item.days_remaining;
                      const barColor = days < 10 ? 'var(--term-red)' : days < 25 ? 'var(--term-amber)' : 'var(--term-green)';
                      return (
                        <div key={item.id}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '2px',
                          }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '9px',
                              letterSpacing: '0.04em',
                              color: 'var(--term-text)',
                            }}>
                              {item.item.toUpperCase()}
                            </span>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: barColor,
                            }}>
                              {days.toFixed(0)}d
                            </span>
                          </div>
                          <div style={{
                            height: '3px',
                            background: 'var(--term-border)',
                            borderRadius: '1px',
                            overflow: 'hidden',
                          }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(100, (days / 60) * 100)}%`,
                              background: barColor,
                              boxShadow: `0 0 4px ${barColor}`,
                              transition: 'width 0.5s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </HudPanel>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
