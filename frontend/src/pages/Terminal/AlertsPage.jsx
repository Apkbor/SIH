/**
 * AlertsPage — Alerts & Priority Sync (Terminal Edition)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { acknowledgeAlert, resolveAlert, getAlerts } from '../../services/api';
import HudPanel from '../../components/Terminal/HudPanel';
import StatusPill from '../../components/Terminal/StatusPill';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';

const PRIORITIES = ['ALL', 'P0', 'P1', 'P2'];
const STATUS_FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'unresolved', label: 'ACTIVE' },
  { key: 'acknowledged', label: 'ACKED' },
  { key: 'resolved', label: 'RESOLVED' },
];

export default function AlertsPage() {
  const navigate = useNavigate();
  const { selectedStation, setSelectedStation, alerts: socketAlerts, blackout, send, liveData, socket, notifications } = useApp();

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

  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('unresolved');
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // On mount, fetch existing alerts from DB so the page isn't empty
  useEffect(() => {
    let cancelled = false;
    getAlerts(selectedStation).then(existing => {
      if (cancelled || !existing?.length) return;
      // Merge into app context without duplicates
      socket?.emit('alerts:seed', existing);
    }).catch(() => {});
    setInitialLoadDone(true);
    return () => { cancelled = true; };
  }, [selectedStation]);

  const stationAlerts = useMemo(() => {
    let filtered = socketAlerts.filter(a => a.stationId === selectedStation);
    if (priorityFilter !== 'ALL') filtered = filtered.filter(a => a.priority === priorityFilter);
    if (statusFilter === 'unresolved') filtered = filtered.filter(a => !a.resolved);
    else if (statusFilter === 'acknowledged') filtered = filtered.filter(a => a.acknowledged && !a.resolved);
    else if (statusFilter === 'resolved') filtered = filtered.filter(a => a.resolved);
    return filtered.sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });
  }, [socketAlerts, selectedStation, priorityFilter, statusFilter]);

  const handleAcknowledge = async (alertId) => {
    await acknowledgeAlert(alertId);
  };

  const handleResolve = async (alertId) => {
    await resolveAlert(alertId);
  };

  const handleBlackoutToggle = () => {
    const newState = !blackout;
    send('blackout:toggle', { active: newState });
    if (!newState) send('blackout:end');
  };

  const drainProgress = liveData._drainProgress;

  const handleStationChange = (s) => setSelectedStation(s);

  const p0Count = stationAlerts.filter(a => a.priority === 'P0' && !a.resolved).length;
  const p1Count = stationAlerts.filter(a => a.priority === 'P1' && !a.resolved).length;
  const p2Count = stationAlerts.filter(a => a.priority === 'P2' && !a.resolved).length;

  // Resolve notification authorities for P0 alerts
  const p0Notified = useMemo(() => {
    const map = new Map();
    for (const n of notifications) {
      if (n.priority === 'P0' || !n.alert_id) continue;
      map.set(n.alert_id, n.authority);
    }
    return map;
  }, [notifications]);

  return (
    <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
      <TerminalSidebar selectedStation={selectedStation} onStationChange={handleStationChange} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TerminalHeader
          blackout={blackout}
          connected={true}
          selectedStation={selectedStation}
          onStationChange={handleStationChange}
        />

        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--term-green)',
                margin: 0,
              }}>
                ALERTS & PRIORITY SYNC
              </h1>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.06em',
                color: 'var(--term-text-dimmer)',
              }}>
                {stationAlerts.length} EVENTS — {p0Count} P0 CRITICAL · {p1Count} P1 WARN · {p2Count} P2 ROUTINE
              </span>
            </div>
            <button
              onClick={handleBlackoutToggle}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                padding: '5px 12px',
                background: blackout ? 'var(--term-red-bg)' : 'var(--term-green-08)',
                color: blackout ? 'var(--term-red)' : 'var(--term-green)',
                border: `1px solid ${blackout ? 'var(--term-red-border)' : 'var(--term-border-bright)'}`,
                borderRadius: '2px',
                cursor: 'pointer',
              }}
            >
              {blackout ? '[ END BLACKOUT ]' : '[ SIM BLACKOUT ]'}
            </button>
          </div>

          {/* Blackout drain visualization */}
          {blackout && (
            <HudPanel title="⚠ Blackout Queue Drain" icon="⟳">
              <div style={{ marginBottom: '6px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    letterSpacing: '0.06em',
                    color: 'var(--term-amber)',
                  }}>
                    PRIORITY QUEUE DRAINING...
                  </span>
                  {drainProgress && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      color: 'var(--term-amber)',
                    }}>
                      {drainProgress.processed}/{drainProgress.total}
                    </span>
                  )}
                </div>
                <div style={{
                  height: '4px',
                  background: 'var(--term-border)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: drainProgress ? `${(drainProgress.processed / drainProgress.total) * 100}%` : '0%',
                    background: 'var(--term-amber)',
                    boxShadow: '0 0 6px rgba(255,184,0,0.4)',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--term-text-dimmer)',
                letterSpacing: '0.04em',
              }}>
                P0 CRITICAL → P1 WARN → P2 ROUTINE — priority order maintained
              </div>
            </HudPanel>
          )}

          {/* Filters */}
          <HudPanel title="Filters">
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  color: 'var(--term-text-label)',
                }}>PRIORITY:</span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        padding: '3px 8px',
                        background: priorityFilter === p ? 'var(--term-green-15)' : 'var(--term-bg-inset)',
                        color: priorityFilter === p ? 'var(--term-green)' : 'var(--term-text-dimmer)',
                        border: `1px solid ${priorityFilter === p ? 'var(--term-border-bright)' : 'var(--term-border)'}`,
                        borderRadius: '2px',
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ width: '1px', height: '16px', background: 'var(--term-border)' }} />
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  color: 'var(--term-text-label)',
                }}>STATUS:</span>
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      padding: '3px 8px',
                      background: statusFilter === f.key ? 'var(--term-green-15)' : 'var(--term-bg-inset)',
                      color: statusFilter === f.key ? 'var(--term-green)' : 'var(--term-text-dimmer)',
                      border: `1px solid ${statusFilter === f.key ? 'var(--term-border-bright)' : 'var(--term-border)'}`,
                      borderRadius: '2px',
                      cursor: 'pointer',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </HudPanel>

          {/* Alerts feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stationAlerts.length === 0 ? (
              <HudPanel title="No Events">
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--term-text-dimmer)',
                  textAlign: 'center',
                  padding: '12px',
                  letterSpacing: '0.06em',
                }}>
                  ALL SYSTEMS NOMINAL — NO ACTIVE ALERTS
                </div>
              </HudPanel>
            ) : (
              stationAlerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    background: 'var(--term-bg-panel)',
                    border: `1px solid ${alert.priority === 'P0' ? 'var(--term-red-border)' : alert.priority === 'P1' ? 'var(--term-amber-border)' : 'var(--term-border)'}`,
                    padding: '10px 12px',
                    position: 'relative',
                    transition: 'border-color 180ms ease',
                  }}
                >
                  {/* Corner brackets */}
                  <div style={{
                    position: 'absolute', top: '-1px', left: '-1px',
                    width: '8px', height: '8px',
                    borderTop: `1px solid ${alert.priority === 'P0' ? 'var(--term-red)' : alert.priority === 'P1' ? 'var(--term-amber)' : 'var(--term-green)'}`,
                    borderLeft: `1px solid ${alert.priority === 'P0' ? 'var(--term-red)' : alert.priority === 'P1' ? 'var(--term-amber)' : 'var(--term-green)'}`,
                    opacity: 0.7,
                  }} />
                  <div style={{
                    position: 'absolute', bottom: '-1px', right: '-1px',
                    width: '8px', height: '8px',
                    borderBottom: `1px solid ${alert.priority === 'P0' ? 'var(--term-red)' : alert.priority === 'P1' ? 'var(--term-amber)' : 'var(--term-green)'}`,
                    borderRight: `1px solid ${alert.priority === 'P0' ? 'var(--term-red)' : alert.priority === 'P1' ? 'var(--term-amber)' : 'var(--term-green)'}`,
                    opacity: 0.7,
                  }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          padding: '1px 6px',
                          background: alert.priority === 'P0' ? 'var(--term-red-bg)' : alert.priority === 'P1' ? 'var(--term-amber-bg)' : 'var(--term-green-08)',
                          color: alert.priority === 'P0' ? 'var(--term-red)' : alert.priority === 'P1' ? 'var(--term-amber)' : 'var(--term-text-dimmer)',
                          border: `1px solid ${alert.priority === 'P0' ? 'var(--term-red-border)' : alert.priority === 'P1' ? 'var(--term-amber-border)' : 'var(--term-border)'}`,
                          borderRadius: '2px',
                        }}>
                          {alert.priority}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--term-text-dimmer)',
                          letterSpacing: '0.06em',
                        }}>
                          {alert.category?.toUpperCase()}
                        </span>

                        {/* Feature 1 — notification badge for all priorities */}
                        {(alert.priority === 'P0' || alert.priority === 'P1' || alert.priority === 'P2') && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            padding: '1px 6px',
                            background: alert.priority === 'P0' ? 'var(--term-red-bg)' : alert.priority === 'P1' ? 'var(--term-amber-bg)' : 'var(--term-cyan-bg)',
                            color: alert.priority === 'P0' ? 'var(--term-red)' : alert.priority === 'P1' ? 'var(--term-amber)' : 'var(--term-cyan)',
                            border: `1px solid ${alert.priority === 'P0' ? 'var(--term-red-border)' : alert.priority === 'P1' ? 'var(--term-amber-border)' : 'var(--term-cyan-dim)'}`,
                            borderRadius: '2px',
                          }}>
                            📱 SMS → {alert.priority === 'P0' ? 'Critical Response Team' : alert.priority === 'P1' ? 'Operations Team' : 'Routine Monitoring Team'}
                          </span>
                        )}
                        {!alert.acknowledged && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            color: 'var(--term-amber)',
                            letterSpacing: '0.06em',
                            animation: 'termPulse 1s ease-in-out infinite',
                          }}>
                            ● NEW
                          </span>
                        )}
                      </div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--term-text)',
                        marginBottom: '3px',
                      }}>
                        {alert.title}
                      </div>
                      {alert.description && (
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--term-text-dim)',
                          marginBottom: '4px',
                        }}>
                          {alert.description}
                        </div>
                      )}
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--term-text-dimmer)',
                        letterSpacing: '0.04em',
                      }}>
                        {new Date(alert.timestamp).toISOString().slice(11, 23)} UTC
                        {alert.value && <span> · VAL: {alert.value}</span>}
                        {alert.threshold && <span> · THR: {alert.threshold}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0, paddingTop: '4px' }}>
                      {!alert.acknowledged ? (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            padding: '4px 10px',
                            background: 'var(--term-green-08)',
                            color: 'var(--term-green)',
                            border: '1px solid var(--term-border)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                          }}
                        >
                          [ACK]
                        </button>
                      ) : (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--term-green)',
                          letterSpacing: '0.06em',
                        }}>✓ ACK</span>
                      )}
                      {!alert.resolved ? (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            padding: '4px 10px',
                            background: 'var(--term-green-08)',
                            color: 'var(--term-green)',
                            border: '1px solid var(--term-border)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                          }}
                        >
                          [RESOLVE]
                        </button>
                      ) : (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--term-green)',
                          letterSpacing: '0.06em',
                        }}>✓ RES</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
