/**
 * ForecastsPage — Predictive Insights (Terminal Edition)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { getForecast } from '../../services/api';
import HudPanel from '../../components/Terminal/HudPanel';
import StatusPill from '../../components/Terminal/StatusPill';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';

const STATION_NAMES = { BHARATI: 'Bharati', MAITRI: 'Maitri' };

export default function ForecastsPage() {
  const navigate = useNavigate();
  const { selectedStation, setSelectedStation } = useApp();

  // "BOTH" → redirect to compare view
  useEffect(() => {
    if (selectedStation === 'BOTH') navigate('/compare', { replace: true });
  }, [selectedStation, navigate]);

  if (selectedStation === 'BOTH') {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={setSelectedStation} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TerminalHeader blackout={false} connected={false} selectedStation={selectedStation} onStationChange={setSelectedStation} />
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

  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getForecast(selectedStation)
      .then(data => { setForecast(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [selectedStation]);

  const handleStationChange = (s) => setSelectedStation(s);

  if (error) {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />
        <div style={{ flex: 1 }}>
          <TerminalHeader blackout={false} connected={false} selectedStation={selectedStation} onStationChange={handleStationChange} />
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ color: 'var(--term-red)', fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '0.08em' }}>FORECAST COMPUTATION FAILED</div>
            <div style={{ color: 'var(--term-text-dim)', marginTop: '8px' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />
        <div style={{ flex: 1 }}>
          <TerminalHeader blackout={false} connected={false} selectedStation={selectedStation} onStationChange={handleStationChange} />
          <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
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
            }}>COMPUTING FORECASTS FROM TIME-SERIES DATA...</span>
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
              PREDICTIVE INSIGHTS — {STATION_NAMES[selectedStation]}
            </h1>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.06em',
              color: 'var(--term-text-dimmer)',
            }}>
              AI-POWERED FORECASTS FROM STORED TIME-SERIES DATA
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '6px',
          }}>
            {/* Energy Forecasts */}
            <HudPanel title="Energy Forecasts" icon="⚡">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {forecast?.energy?.map((f, i) => (
                  <div key={i} style={{
                    padding: '8px',
                    background: 'var(--term-bg-inset)',
                    border: '1px solid var(--term-border-dim)',
                    borderRadius: '2px',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--term-text)',
                      marginBottom: '4px',
                    }}>
                      {f.title}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--term-text-dim)',
                      lineHeight: 1.5,
                    }}>
                      {f.description}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: f.priority === 'critical' ? 'var(--term-red)' : f.priority === 'warning' ? 'var(--term-amber)' : 'var(--term-green)',
                      marginTop: '4px',
                    }}>
                      {f.value}
                    </div>
                  </div>
                ))}
                {(!forecast?.energy || forecast.energy.length === 0) && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--term-text-dimmer)',
                    textAlign: 'center',
                    padding: '8px',
                  }}>
                    INSUFFICIENT DATA FOR FORECAST — Collecting at least 10 readings
                  </div>
                )}
              </div>
            </HudPanel>

            {/* Logistics Forecasts */}
            <HudPanel title="Logistics Forecasts" icon="📦">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {forecast?.logistics?.map((f, i) => (
                  <div key={i} style={{
                    padding: '8px',
                    background: 'var(--term-bg-inset)',
                    border: '1px solid var(--term-border-dim)',
                    borderRadius: '2px',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--term-text)',
                      marginBottom: '4px',
                    }}>
                      {f.title}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--term-text-dim)',
                      lineHeight: 1.5,
                    }}>
                      {f.description}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: f.priority === 'critical' ? 'var(--term-red)' : f.priority === 'warning' ? 'var(--term-amber)' : 'var(--term-green)',
                      marginTop: '4px',
                    }}>
                      {f.value}
                    </div>
                  </div>
                ))}
                {(!forecast?.logistics || forecast.logistics.length === 0) && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--term-text-dimmer)',
                    textAlign: 'center',
                    padding: '8px',
                  }}>
                    AWAITING INVENTORY DATA
                  </div>
                )}
              </div>
            </HudPanel>

            {/* Environment Forecasts */}
            <HudPanel title="Environment Outlook" icon="❄">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {forecast?.environment?.map((f, i) => (
                  <div key={i} style={{
                    padding: '8px',
                    background: 'var(--term-bg-inset)',
                    border: '1px solid var(--term-border-dim)',
                    borderRadius: '2px',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--term-text)',
                      marginBottom: '4px',
                    }}>
                      {f.title}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--term-text-dim)',
                      lineHeight: 1.5,
                    }}>
                      {f.description}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: f.priority === 'critical' ? 'var(--term-red)' : f.priority === 'warning' ? 'var(--term-amber)' : 'var(--term-green)',
                      marginTop: '4px',
                    }}>
                      {f.value}
                    </div>
                  </div>
                ))}
                {(!forecast?.environment || forecast.environment.length === 0) && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--term-text-dimmer)',
                    textAlign: 'center',
                    padding: '8px',
                  }}>
                    AWAITING ENVIRONMENT DATA
                  </div>
                )}
              </div>
            </HudPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
