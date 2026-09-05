/**
 * NotificationsPage — Authority Dispatch Log (Terminal Edition)
 *
 * Shows all P0 notification dispatches in real time.
 * Integrates with Feature 1: auto-dispatch on critical alerts.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { getNotifications } from '../../services/api';
import HudPanel from '../../components/Terminal/HudPanel';
import StatusPill from '../../components/Terminal/StatusPill';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';
import { safeDate } from '../../utils/format';

const STATION_NAMES = { BHARATI: 'Bharati', MAITRI: 'Maitri' };

const STATUS_CONFIG = {
  pending: { color: 'var(--term-amber)', label: 'PENDING', bg: 'var(--term-amber-bg)' },
  sent: { color: 'var(--term-cyan)', label: 'SENT', bg: 'var(--term-cyan-bg)' },
  delivered: { color: 'var(--term-green)', label: 'DELIVERED', bg: 'var(--term-green-08)' },
  failed: { color: 'var(--term-red)', label: 'FAILED', bg: 'var(--term-red-bg)' },
};

const CHANNEL_ICONS = { email: '📧', radio: '📻', sms: '📱' };

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { selectedStation, setSelectedStation, notifications: socketNotifications, socket } = useApp();

  useEffect(() => {
    if (selectedStation === 'BOTH') navigate('/compare', { replace: true });
  }, [selectedStation, navigate]);

  if (selectedStation === 'BOTH') {
    return (
      <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
        <TerminalSidebar selectedStation={selectedStation} onStationChange={setSelectedStation} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <TerminalHeader blackout={false} connected={true} selectedStation={selectedStation} onStationChange={setSelectedStation} />
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

  const [loaded, setLoaded] = useState(false);

  // Load existing notifications from DB on mount
  useEffect(() => {
    let cancelled = false;
    getNotifications(selectedStation, 100).then(existing => {
      if (cancelled) return;
      // We keep socketNotifications in sync — just mark loaded
      setLoaded(true);
    }).catch(() => {});
    setLoaded(true);
  }, [selectedStation]);

  const notifications = useMemo(() => {
    let filtered = socketNotifications.filter(n => {
      if (selectedStation && n.station_id !== selectedStation) return false;
      return true;
    });
    return filtered.sort((a, b) => safeDate(b.timestamp) - safeDate(a.timestamp));
  }, [socketNotifications, selectedStation]);

  const p0Count = notifications.filter(n => n.status === 'delivered').length;
  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const failedCount = notifications.filter(n => n.status === 'failed').length;

  return (
    <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
      <TerminalSidebar selectedStation={selectedStation} onStationChange={setSelectedStation} />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <TerminalHeader
          blackout={false}
          connected={true}
          selectedStation={selectedStation}
          onStationChange={setSelectedStation}
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
                AUTHORITY DISPATCH LOG
              </h1>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.06em',
                color: 'var(--term-text-dimmer)',
              }}>
                {notifications.length} DISPATCHES — {p0Count} DELIVERED · {pendingCount} PENDING · {failedCount} FAILED
              </span>
            </div>
            <StatusPill text="AUTO-DISPATCH ACTIVE" color="var(--term-green)" />
          </div>

          {/* Dispatch flow explanation */}
          <HudPanel title="How It Works" icon="⟳">
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--term-text-dim)',
              lineHeight: 1.6,
              letterSpacing: '0.02em',
            }}>
              <span style={{ color: 'var(--term-red)' }}>P0 CRITICAL ALERT</span>
              {' → '}
              <span style={{ color: 'var(--term-amber)' }}>CLASSIFY</span>
              {' → '}
              <span style={{ color: 'var(--term-cyan)' }}>LOOKUP AUTHORITY</span>
              {' → '}
              <span style={{ color: 'var(--term-green)' }}>DISPATCH</span>
              {' → '}
              <span style={{ color: 'var(--term-green)' }}>DELIVERED ✓</span>
              <br />
              Triggered automatically when P0 alerts fire. No manual intervention required.
            </div>
          </HudPanel>

          {/* Dispatch log */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {notifications.length === 0 ? (
              <HudPanel title="No Dispatches">
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--term-text-dimmer)',
                  textAlign: 'center',
                  padding: '12px',
                  letterSpacing: '0.06em',
                }}>
                  WAITING FOR P0 ALERTS TO TRIGGER DISPATCH...
                </div>
              </HudPanel>
            ) : (
              notifications.map(n => {
                const statusConf = STATUS_CONFIG[n.status] || STATUS_CONFIG.pending;
                const channelIcon = CHANNEL_ICONS[n.channel] || '📨';
                const isNew = Date.now() - safeDate(n.timestamp).getTime() < 30000;

                return (
                  <div
                    key={n.id}
                    style={{
                      background: 'var(--term-bg-panel)',
                      border: `1px solid ${isNew ? 'var(--term-red-border)' : 'var(--term-border)'}`,
                      padding: '10px 12px',
                      position: 'relative',
                      transition: 'border-color 300ms ease',
                      ...(isNew ? { animation: 'termFadeIn 500ms ease' } : {}),
                    }}
                  >
                    {/* Corner brackets */}
                    <div style={{
                      position: 'absolute', top: '-1px', left: '-1px',
                      width: '8px', height: '8px',
                      borderTop: '1px solid var(--term-red)',
                      borderLeft: '1px solid var(--term-red)',
                      opacity: 0.7,
                    }} />
                    <div style={{
                      position: 'absolute', bottom: '-1px', right: '-1px',
                      width: '8px', height: '8px',
                      borderBottom: '1px solid var(--term-red)',
                      borderRight: '1px solid var(--term-red)',
                      opacity: 0.7,
                    }} />

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Top row: status + channel + authority */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            padding: '1px 6px',
                            background: statusConf.bg,
                            color: statusConf.color,
                            border: `1px solid ${statusConf.color}`,
                            borderRadius: '2px',
                          }}>
                            {statusConf.label}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: 'var(--term-text-dimmer)',
                          }}>
                            {channelIcon} {n.channel?.toUpperCase()}
                          </span>
                          {isNew && (
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

                        {/* Subject line */}
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--term-text)',
                          marginBottom: '3px',
                        }}>
                          {n.subject || 'Notification'}
                        </div>

                        {/* Authority + Contact */}
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: 'var(--term-cyan-dim)',
                          marginBottom: '3px',
                        }}>
                          📨 <span style={{ color: 'var(--term-text-dim)' }}>{n.authority}</span>
                          <span style={{ margin: '0 6px', color: 'var(--term-border)' }}>|</span>
                          <span style={{ color: 'var(--term-text-dimmer)' }}>{n.contact}</span>
                        </div>

                        {/* Delivery detail */}
                        {n.delivery_detail && (
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: 'var(--term-text-dimmer)',
                            marginBottom: '3px',
                            fontStyle: 'italic',
                          }}>
                            {n.delivery_detail}
                          </div>
                        )}

                        {/* Occurrence / suppression info */}
                        {(n.occurrence_count > 1 || n.suppression_note) && (
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: 'var(--term-amber)',
                            marginBottom: '3px',
                            letterSpacing: '0.02em',
                          }}>
                            {n.occurrence_count > 1 && (
                              <span>⚠ {n.occurrence_count} occurrences · {n.notification_count || 1} SMS sent (duplicates suppressed)</span>
                            )}
                            {n.suppression_note && (
                              <span style={{ marginLeft: '6px' }}>· {n.suppression_note}</span>
                            )}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--term-text-dimmer)',
                          letterSpacing: '0.04em',
                        }}>
                          {safeDate(n.timestamp).toISOString().slice(0, 23).replace('T', ' ')} UTC
                          {' · '}
                          {STATION_NAMES[n.station_id] || n.station_id}
                          {' · '}
                          {n.category?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
