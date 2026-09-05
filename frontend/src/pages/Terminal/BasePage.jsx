/**
 * BasePage — NCPOR BASE COMMAND CENTER (HQ View)
 *
 * Three-column command center simulating what headquarters staff in Goa see.
 * The "receiving end" of the whole system — watching both Antarctic stations.
 *
 * Layout:
 *   LEFT  — Station Status Strip (Bharati + Maitri cards)
 *   CENTER — Unified Comms Hub (merged message feed from both stations)
 *   RIGHT  — Alert/Dispatch Feed (alerts + SMS dispatch log merged)
 *
 * Top bar: HQ framing label + Quick Actions (Broadcast, Status Update, Acknowledge)
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  getAllChatMessages,
  postChatMessage,
  broadcastChatMessage,
  getAlerts,
  acknowledgeAlert,
  resolveAlert,
  getNotifications,
} from '../../services/api';
import StatusPill from '../../components/Terminal/StatusPill';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import HudPanel from '../../components/Terminal/HudPanel';

const STATION_NAMES = { BHARATI: 'Bharati', MAITRI: 'Maitri' };
const STATION_COLORS = {
  BHARATI: { bg: 'rgba(79,209,232,0.08)', border: 'rgba(79,209,232,0.35)', accent: '#4FD1E8', dim: 'rgba(79,209,232,0.5)', bgStrong: 'rgba(79,209,232,0.12)' },
  MAITRI: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.35)', accent: '#FBBF24', dim: 'rgba(251,191,36,0.5)', bgStrong: 'rgba(251,191,36,0.12)' },
};
const CHANNEL_MAP = {
  'ops-bharati': 'BHARATI',
  'ops-maitri': 'MAITRI',
  'engineering': null,
  'emergency': null,
};
const CHAT_SENDER = 'HQ';

const PAGE_SIZE = 300;

export default function BasePage() {
  const {
    selectedStation: appStation, setSelectedStation,
    socket, connected, liveData, alerts: socketAlerts,
    notifications: socketNotifications, blackout,
    send,
  } = useApp();

  // ─── Station filter (BOTH | BHARATI | MAITRI) ───
  const [stationFilter, setStationFilter] = useState('BOTH');

  // ─── Comms state ───
  const [allMessages, setAllMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [loadedMessages, setLoadedMessages] = useState(false);
  const [activeChannels, setActiveChannels] = useState(new Set(['ops-bharati', 'ops-maitri', 'engineering', 'emergency']));
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const [newMsgIds, setNewMsgIds] = useState(new Set());

  // ─── Alerts + Notifications state ───
  const [allAlerts, setAllAlerts] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [loadedAlerts, setLoadedAlerts] = useState(false);

  // ─── Station telemetry (from liveData) ───
  const bharatiEnergy = liveData?.['BHARATI:energy'] || null;
  const maitriEnergy = liveData?.['MAITRI:energy'] || null;
  const bharatiEnv = liveData?.['BHARATI:environment'] || null;
  const maitriEnv = liveData?.['MAITRI:environment'] || null;

  // ─── Subscribe to ALL chat channels ───
  useEffect(() => {
    if (!socket) return;
    const channels = ['ops-bharati', 'ops-maitri', 'engineering', 'emergency'];
    channels.forEach(ch => socket.emit('chat:subscribe', { channel: ch }));
  }, [socket]);

  // ─── Load initial messages from DB ───
  useEffect(() => {
    let cancelled = false;
    getAllChatMessages(PAGE_SIZE).then(msgs => {
      if (!cancelled) {
        setAllMessages(Array.isArray(msgs) ? msgs : []);
        setLoadedMessages(true);
      }
    }).catch(() => {
      if (!cancelled) setLoadedMessages(true);
    });
    return () => { cancelled = true; };
  }, []);

  // ─── Load alerts from DB ───
  useEffect(() => {
    let cancelled = false;
    getAlerts().then(serverAlerts => {
      if (!cancelled) {
        setAllAlerts(Array.isArray(serverAlerts) ? serverAlerts : []);
        setLoadedAlerts(true);
      }
    }).catch(() => {
      if (!cancelled) setLoadedAlerts(true);
    });
    return () => { cancelled = true; };
  }, []);

  // ─── Listen for live chat messages (bidirectional) ───
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      setAllMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Flash new message
      setNewMsgIds(prev => new Set([...prev, msg.id]));
      setTimeout(() => {
        setNewMsgIds(prev => {
          const next = new Set(prev);
          next.delete(msg.id);
          return next;
        });
      }, 2000);
    };
    socket.on('message:new', handler);
    return () => socket.off('message:new', handler);
  }, [socket]);

  // ─── Listen for live alerts ───
  useEffect(() => {
    if (!socket) return;
    const onAlert = (alert) => {
      setAllAlerts(prev => [alert, ...prev].slice(0, 200));
    };
    const onAlertUpdated = (alert) => {
      setAllAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
    };
    socket.on('alert', onAlert);
    socket.on('alert:updated', onAlertUpdated);
    return () => {
      socket.off('alert', onAlert);
      socket.off('alert:updated', onAlertUpdated);
    };
  }, [socket]);

  // ─── Listen for live notifications ───
  useEffect(() => {
    if (!socket) return;
    const handler = (notification) => {
      setAllNotifications(prev => [notification, ...prev].slice(0, 200));
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  // Seed initial socket alerts/notifications on connect
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      socket.emit('alerts:seed', allAlerts);
    };
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [socket, allAlerts]);

  // ─── Auto-scroll ───
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  // ─── Derived: filtered messages ───
  const filteredMessages = useMemo(() => {
    let msgs = allMessages.filter(m => activeChannels.has(m.channel));
    if (stationFilter !== 'BOTH') {
      const channelForStation = stationFilter === 'BHARATI' ? 'ops-bharati' : 'ops-maitri';
      msgs = msgs.filter(m => {
        if (CHANNEL_MAP[m.channel] === stationFilter) return true;
        if (m.station_id === stationFilter) return true;
        if (m.channel === channelForStation && m.sender === 'HQ') return true;
        return false;
      });
    }
    return msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [allMessages, stationFilter, activeChannels]);

  // ─── Derived: filtered alerts ───
  const filteredAlerts = useMemo(() => {
    let list = [...allAlerts];
    if (stationFilter !== 'BOTH') {
      list = list.filter(a => a.stationId === stationFilter);
    }
    return list.sort((a, b) => {
      const order = { P0: 0, P1: 1, P2: 2 };
      return (order[a.priority] || 2) - (order[b.priority] || 2);
    });
  }, [allAlerts, stationFilter]);

  // ─── Derived: filtered notifications ───
  const filteredNotifications = useMemo(() => {
    let list = [...allNotifications];
    if (stationFilter !== 'BOTH') {
      list = list.filter(n => n.station_id === stationFilter);
    }
    return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [allNotifications, stationFilter]);

  // ─── Derived: station status cards ───
  const stationStatus = useMemo(() => {
    const getStationEnergy = (stationId) => liveData?.[`${stationId}:energy`];
    const getStationAlerts = (stationId) => allAlerts.filter(a => a.stationId === stationId && !a.resolved);
    const getStationMessages = (stationId) => {
      const ch = stationId === 'BHARATI' ? 'ops-bharati' : 'ops-maitri';
      return allMessages.filter(m => m.channel === ch && m.sender !== 'HQ');
    };
    const getLastMessageTime = (stationId) => {
      const ch = stationId === 'BHARATI' ? 'ops-bharati' : 'ops-maitri';
      const msgs = allMessages.filter(m => m.channel === ch && m.sender !== 'HQ');
      if (!msgs.length) return null;
      return msgs[msgs.length - 1].timestamp;
    };

    const stations = {};
    for (const sid of ['BHARATI', 'MAITRI']) {
      const e = getStationEnergy(sid);
      const unc = getStationAlerts(sid);
      const msgs = getStationMessages(sid);
      const lastMsg = getLastMessageTime(sid);

      stations[sid] = {
        id: sid,
        name: STATION_NAMES[sid],
        colors: STATION_COLORS[sid],
        linkUp: connected,
        fuelPct: e ? Math.round(e.fuelPercent) : null,
        batteryPct: e ? Math.round(e.batteryPercent) : null,
        activeAlertCount: unc.filter(a => !a.resolved).length,
        criticalAlertCount: unc.filter(a => !a.resolved && a.priority === 'P0').length,
        lastMessage: lastMsg ? new Date(lastMsg) : null,
        unreadCount: msgs.length,
        tempC: liveData?.[`${sid}:environment`]?.temperatureC,
        windKmh: liveData?.[`${sid}:environment`]?.windSpeedKmh,
      };
    }
    return stations;
  }, [liveData, allAlerts, allMessages, connected]);

  // ─── Send message ───
  const handleSend = useCallback(async (targetChannel) => {
    if (!inputText.trim()) return;
    const content = inputText.trim();

    const optimistic = {
      id: `M-BASE-${Date.now()}`,
      channel: targetChannel,
      sender: 'HQ',
      content,
      msg_type: 'user',
      station_id: CHANNEL_MAP[targetChannel] || 'HQ',
      timestamp: new Date().toISOString(),
    };

    setAllMessages(prev => [...prev, optimistic]);
    setInputText('');
    setReplyTarget(null);

    try {
      await postChatMessage(targetChannel, 'HQ', content, 'user', CHANNEL_MAP[targetChannel]);
    } catch (err) {
      console.error('[BASE] Send failed:', err);
    }
  }, [inputText]);

  // ─── Broadcast to all stations ───
  const handleBroadcast = useCallback(async () => {
    const content = prompt === null ? '' : prompt; // will use modal
  }, []);

  // ─── Quick Actions ───
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [statusTarget, setStatusTarget] = useState('BHARATI');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusText, setStatusText] = useState('Please provide a status update for your station. Report current fuel levels, battery status, generator condition, and any active alerts.');

  const handleBroadcastSend = async () => {
    if (!broadcastText.trim()) return;
    try {
      await broadcastChatMessage('HQ', broadcastText.trim(), 'user', 'BASE');
      setShowBroadcastModal(false);
      setBroadcastText('');
    } catch (err) {
      console.error('[BASE] Broadcast failed:', err);
    }
  };

  const handleStatusRequest = async () => {
    if (!statusText.trim()) return;
    const ch = statusTarget === 'BHARATI' ? 'ops-bharati' : 'ops-maitri';
    try {
      await postChatMessage(ch, 'HQ', `[STATUS REQUEST] ${statusText.trim()}`, 'user', statusTarget);
      setShowStatusModal(false);
      setStatusText('Please provide a status update for your station. Report current fuel levels, battery status, generator condition, and any active alerts.');
    } catch (err) {
      console.error('[BASE] Status request failed:', err);
    }
  };

  const handleAcknowledgeEmergency = async (msgId) => {
    const msg = allMessages.find(m => m.id === msgId);
    if (!msg || msg.channel !== 'emergency') return;
    try {
      // Post acknowledgement reply
      await postChatMessage('emergency', 'HQ', 'HQ ACKNOWLEDGED. Response team notified. Stand by for coordination.', 'user', 'BASE');
      // Also acknowledge the related alert if any
      const relatedAlert = allAlerts.find(a => !a.acknowledged && a.stationId && msg.content?.includes(STATION_NAMES[a.stationId]));
      if (relatedAlert) {
        await acknowledgeAlert(relatedAlert.id);
      }
    } catch (err) {
      console.error('[BASE] Acknowledge failed:', err);
    }
  };

  // ─── Determine target channel for composer ───
  const getComposerChannel = () => {
    if (replyTarget?.channel) return replyTarget.channel;
    if (stationFilter === 'BHARATI') return 'ops-bharati';
    if (stationFilter === 'MAITRI') return 'ops-maitri';
    return 'ops-bharati'; // default when BOTH
  };

  // ─── Format timestamp ───
  const fmtTime = (ts) => {
    if (!ts) return '--:--:--';
    const d = new Date(ts);
    return d.toISOString().slice(11, 19);
  };
  const fmtRelative = (ts) => {
    if (!ts) return 'never';
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toISOString().slice(5, 10);
  };

  // ─── Determine station for a message ───
  const getMessageStation = (msg) => {
    const mapped = CHANNEL_MAP[msg.channel];
    if (mapped) return mapped;
    if (msg.station_id) return msg.station_id;
    return null;
  };

  const composerChannel = getComposerChannel();

  return (
    <div style={{ background: 'var(--term-bg)', minHeight: '100vh', color: 'var(--term-text)', display: 'flex' }}>
      <TerminalSidebar selectedStation={appStation} onStationChange={setSelectedStation} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TerminalHeader
          blackout={blackout}
          connected={connected}
          selectedStation={appStation}
          onStationChange={setSelectedStation}
          showBoth={false}
        />

        {/* ─── HQ FRAMING BAR ─── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '8px 12px',
          background: 'linear-gradient(90deg, rgba(251,191,36,0.04), rgba(79,209,232,0.04))',
          borderBottom: '1px solid var(--term-border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--term-amber)',
              textTransform: 'uppercase',
            }}>
              🛰️ NCPOR HEADQUARTERS — GOA, INDIA
            </div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '8px',
              letterSpacing: '0.08em',
              color: 'var(--term-text-dimmer)',
            }}>
              BASE COMMAND CENTER · DUAL-STATION COMMAND VIEW
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Station filter */}
            {['BOTH', 'BHARATI', 'MAITRI'].map(s => {
              const active = stationFilter === s;
              const color = s === 'BOTH' ? 'var(--term-green)' : s === 'BHARATI' ? 'var(--term-cyan)' : 'var(--term-amber)';
              return (
                <button key={s} onClick={() => setStationFilter(s)} style={{
                  padding: '3px 8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '8px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  border: `1px solid ${active ? color : 'var(--term-border-dim)'}`,
                  borderRadius: '2px',
                  background: active ? `${color}15` : 'transparent',
                  color: active ? color : 'var(--term-text-dimmer)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}>
                  {s === 'BOTH' ? '⬦ ALL' : s}
                </button>
              );
            })}

            <span style={{ width: '1px', height: '16px', background: 'var(--term-border-dim)', margin: '0 2px' }} />

            {/* Quick Actions */}
            <button onClick={() => setShowBroadcastModal(true)} style={{
              padding: '3px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '8px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              border: '1px solid var(--term-green)',
              borderRadius: '2px',
              background: 'var(--term-green-08)',
              color: 'var(--term-green)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}>
              ⚡ BROADCAST ALL
            </button>
            <button onClick={() => setShowStatusModal(true)} style={{
              padding: '3px 8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '8px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              border: '1px solid var(--term-cyan)',
              borderRadius: '2px',
              background: 'var(--term-cyan-bg)',
              color: 'var(--term-cyan)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
            }}>
              📋 REQ STATUS
            </button>
          </div>
        </div>

        {/* ─── THREE-COLUMN MAIN AREA ─── */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '240px 1fr 300px',
          gap: '1px',
          background: 'var(--term-border)',
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* ════════════════ LEFT: STATION STATUS STRIP ════════════════ */}
          <div style={{
            background: 'var(--term-bg)',
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {(['BHARATI', 'MAITRI']).map(sid => {
              const st = stationStatus[sid];
              const isFiltered = stationFilter === 'BOTH' || stationFilter === sid;
              const colors = STATION_COLORS[sid];

              return (
                <div
                  key={sid}
                  onClick={() => setStationFilter(isFiltered && stationFilter === sid ? 'BOTH' : sid)}
                  style={{
                    background: isFiltered ? colors.bgStrong : colors.bg,
                    border: `1px solid ${isFiltered ? colors.border : 'var(--term-border)'}`,
                    borderRadius: '2px',
                    padding: '10px',
                    cursor: 'pointer',
                    transition: 'all 180ms ease',
                    opacity: isFiltered ? 1 : 0.6,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Station name */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: colors.accent,
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: colors.accent,
                      boxShadow: `0 0 6px ${colors.accent}`,
                      animation: 'pulse 2s ease-in-out infinite',
                    }} />
                    {st.name}
                  </div>

                  {/* Link status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginBottom: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    letterSpacing: '0.06em',
                    color: st.linkUp ? 'var(--term-green)' : 'var(--term-red)',
                  }}>
                    <span style={{
                      width: '4px', height: '4px', borderRadius: '50%',
                      background: st.linkUp ? 'var(--term-green)' : 'var(--term-red)',
                      boxShadow: st.linkUp ? '0 0 4px var(--term-green)' : '0 0 4px var(--term-red)',
                    }} />
                    {st.linkUp ? 'LINK UP' : 'LINK DOWN'}
                  </div>

                  {/* Fuel / Battery */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '7px',
                        letterSpacing: '0.08em',
                        color: 'var(--term-text-dimmer)',
                        marginBottom: '1px',
                      }}>FUEL</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: st.fuelPct !== null && st.fuelPct < 15 ? '14px' : '12px',
                        fontWeight: st.fuelPct !== null && st.fuelPct < 15 ? 700 : 500,
                        color: st.fuelPct !== null && st.fuelPct < 15 ? 'var(--term-red)' : 'var(--term-text)',
                      }}>
                        {st.fuelPct !== null ? `${st.fuelPct}%` : '--'}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '7px',
                        letterSpacing: '0.08em',
                        color: 'var(--term-text-dimmer)',
                        marginBottom: '1px',
                      }}>BATTERY</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: st.batteryPct !== null && st.batteryPct < 20 ? 'var(--term-red)' : 'var(--term-text)',
                      }}>
                        {st.batteryPct !== null ? `${st.batteryPct}%` : '--'}
                      </div>
                    </div>
                  </div>

                  {/* Progress bars for fuel/battery */}
                  {st.fuelPct !== null && (
                    <div style={{ marginBottom: '4px' }}>
                      <div style={{
                        height: '3px',
                        background: 'var(--term-bg-inset)',
                        borderRadius: '1px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(100, st.fuelPct)}%`,
                          background: st.fuelPct < 15 ? 'var(--term-red)' : st.fuelPct < 30 ? 'var(--term-amber)' : colors.accent,
                          borderRadius: '1px',
                          transition: 'width 300ms ease',
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Active alerts */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      letterSpacing: '0.06em',
                      color: 'var(--term-text-dimmer)',
                    }}>ALERTS</span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {st.criticalAlertCount > 0 && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          fontWeight: 700,
                          color: 'var(--term-red)',
                          background: 'var(--term-red-bg)',
                          border: '1px solid var(--term-red-border)',
                          borderRadius: '2px',
                          padding: '0 4px',
                        }}>
                          {st.criticalAlertCount} P0
                        </span>
                      )}
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: st.activeAlertCount > 0 ? 'var(--term-amber)' : 'var(--term-green)',
                      }}>
                        {st.activeAlertCount} active
                      </span>
                    </div>
                  </div>

                  {/* Environment */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '4px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: 'var(--term-text-dimmer)',
                  }}>
                    {st.tempC !== undefined && <span>{st.tempC}°C</span>}
                    {st.windKmh !== undefined && <span>{st.windKmh}km/h WIND</span>}
                  </div>

                  {/* Last message */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: 'var(--term-text-dimmer)',
                    borderTop: '1px solid var(--term-border-dim)',
                    paddingTop: '4px',
                    marginTop: '2px',
                  }}>
                    LAST MSG: {st.lastMessage ? fmtRelative(st.lastMessage) : 'none'}
                  </div>
                </div>
              );
            })}

            {/* Mini map visual */}
            <div style={{
              marginTop: '4px',
              padding: '10px',
              background: 'var(--term-bg-panel)',
              border: '1px solid var(--term-border)',
              borderRadius: '2px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                letterSpacing: '0.08em',
                color: 'var(--term-text-dimmer)',
                marginBottom: '8px',
                textAlign: 'center',
              }}>ANTARCTICA — STATION MAP</div>
              {/* Simplified SVG map */}
              <svg viewBox="0 0 200 120" style={{ width: '100%', height: 'auto' }}>
                {/* Grid lines */}
                {[0,1,2,3,4].map(i => (
                  <line key={`h${i}`} x1="0" y1={i * 30} x2="200" y2={i * 30} stroke="var(--term-border-dim)" strokeWidth="0.5" />
                ))}
                {[0,1,2,3,4,5].map(i => (
                  <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="120" stroke="var(--term-border-dim)" strokeWidth="0.5" />
                ))}
                {/* Antarctica outline (simplified) */}
                <path d="M 60 15 Q 100 5 140 15 Q 160 30 170 50 Q 165 75 140 90 Q 100 100 60 90 Q 30 70 35 45 Q 40 25 60 15 Z"
                  fill="rgba(79,209,232,0.03)" stroke="var(--term-border)" strokeWidth="0.75" />
                {/* Connecting line from Goa (top center) to stations */}
                <line x1="100" y1="0" x2="100" y2="25" stroke="var(--term-green)" strokeWidth="0.5" strokeDasharray="3,2" opacity="0.4" />
                {/* Goa label */}
                <circle cx="100" cy="4" r="2.5" fill="var(--term-green)" opacity="0.6" />
                <text x="100" y="1" textAnchor="middle" fill="var(--term-green)" fontSize="5" fontFamily="monospace" opacity="0.7">GOA</text>
                {/* Bharati */}
                <circle cx="85" cy="42" r="4" fill="rgba(79,209,232,0.2)" stroke="#4FD1E8" strokeWidth="1" />
                <text x="85" y="52" textAnchor="middle" fill="#4FD1E8" fontSize="5.5" fontFamily="monospace" fontWeight="bold">Bharati</text>
                {/* Maitri */}
                <circle cx="130" cy="58" r="4" fill="rgba(251,191,36,0.2)" stroke="#FBBF24" strokeWidth="1" />
                <text x="130" y="68" textAnchor="middle" fill="#FBBF24" fontSize="5.5" fontFamily="monospace" fontWeight="bold">Maitri</text>
                {/* Connection line between stations */}
                <line x1="85" y1="42" x2="130" y2="58" stroke="var(--term-green)" strokeWidth="0.5" strokeDasharray="2,2" opacity="0.3" />
              </svg>
            </div>
          </div>

          {/* ════════════════ CENTER: UNIFIED COMMS HUB ════════════════ */}
          <div style={{
            background: 'var(--term-bg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Channel filter tabs */}
            <div style={{
              display: 'flex',
              gap: '1px',
              padding: '4px 8px',
              background: 'var(--term-bg-inset)',
              borderBottom: '1px solid var(--term-border)',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}>
              {[
                { id: 'ops-bharati', label: 'Base↔Bharati', color: 'var(--term-cyan)', sid: 'BHARATI' },
                { id: 'ops-maitri', label: 'Base↔Maitri', color: 'var(--term-amber)', sid: 'MAITRI' },
                { id: 'engineering', label: 'Engineering', color: 'var(--term-green)' },
                { id: 'emergency', label: '🔴 EMERGENCY', color: 'var(--term-red)' },
              ].map(ch => {
                const isActive = activeChannels.has(ch.id);
                const stationFilteredOut = ch.sid && stationFilter !== 'BOTH' && stationFilter !== ch.sid;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannels(prev => {
                        const next = new Set(prev);
                        if (next.has(ch.id)) {
                          if (next.size > 1) next.delete(ch.id);
                        } else {
                          next.add(ch.id);
                        }
                        return next;
                      });
                      setReplyTarget(null);
                    }}
                    style={{
                      padding: '3px 8px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      border: `1px solid ${isActive ? ch.color : 'var(--term-border-dim)'}`,
                      borderRadius: '2px',
                      background: isActive ? `${ch.color}12` : 'transparent',
                      color: isActive ? ch.color : 'var(--term-text-dimmer)',
                      cursor: 'pointer',
                      opacity: stationFilteredOut ? 0.4 : 1,
                      transition: 'all 150ms ease',
                    }}
                  >
                    {ch.label}
                  </button>
                );
              })}
            </div>

            {/* Message feed */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px',
              background: 'var(--term-bg-panel)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
            }}>
              {filteredMessages.length === 0 ? (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--term-text-dimmer)',
                  textAlign: 'center',
                  padding: '40px 20px',
                  letterSpacing: '0.06em',
                }}>
                  — AWAITING TRANSMISSIONS FROM BOTH STATIONS —
                </div>
              ) : (
                filteredMessages.map(msg => {
                  const isSelf = msg.sender === 'HQ';
                  const isBot = msg.sender === 'NCPOR-Ops-Bot';
                  const isSystem = msg.msg_type === 'system';
                  const isEmergency = msg.channel === 'emergency';
                  const msgStation = getMessageStation(msg);
                  const stationColor = msgStation ? STATION_COLORS[msgStation] : null;
                  const isNew = newMsgIds.has(msg.id);

                  if (isSystem) {
                    return (
                      <div key={msg.id} style={{
                        textAlign: 'center',
                        padding: '4px 8px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        color: 'var(--term-amber)',
                        letterSpacing: '0.04em',
                        background: 'var(--term-amber-bg)',
                        borderLeft: '2px solid var(--term-amber)',
                        borderRadius: '0 2px 2px 0',
                      }}>
                        — {msg.content} —
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        gap: '6px',
                        padding: '5px 8px',
                        background: isSelf ? 'var(--term-green-08)' : isEmergency ? 'rgba(232,68,58,0.04)' : isNew ? 'rgba(79,209,232,0.04)' : 'transparent',
                        borderLeft: `2px solid ${
                          isSelf ? 'var(--term-green)' :
                          isEmergency ? 'var(--term-red)' :
                          isBot ? 'var(--term-amber)' :
                          stationColor ? stationColor.accent : 'var(--term-border)'
                        }`,
                        borderRadius: '0 2px 2px 0',
                        borderTop: isEmergency && isNew ? '1px solid var(--term-red-border)' : '1px solid transparent',
                        transition: 'all 180ms ease',
                        ...(isNew ? { animation: 'termFadeIn 400ms ease' } : {}),
                        ...(isEmergency ? {
                          boxShadow: isNew ? '0 0 12px rgba(232,68,58,0.15)' : '0 0 4px rgba(232,68,58,0.05)',
                        } : {}),
                      }}
                    >
                      {/* Station tag / Sender icon */}
                      <div style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '2px',
                        background: isSelf ? 'var(--term-green-15)' : isEmergency ? 'var(--term-red-bg)' : stationColor ? stationColor.bgStrong : 'var(--term-bg-inset)',
                        border: `1px solid ${
                          isSelf ? 'var(--term-green-dark)' :
                          isEmergency ? 'var(--term-red-border)' :
                          stationColor ? stationColor.border : 'var(--term-border)'
                        }`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '8px',
                        fontWeight: 700,
                        color: isSelf ? 'var(--term-green)' : isEmergency ? 'var(--term-red)' : stationColor ? stationColor.accent : 'var(--term-text-dimmer)',
                        flexShrink: 0,
                      }}>
                        {isSelf ? 'HQ' : isBot ? 'BOT' : msgStation ? msgStation?.slice(0, 2) : '??'}
                      </div>

                      {/* Message body */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px', flexWrap: 'wrap' }}>
                          {/* Station color tag */}
                          {msgStation && (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '7px',
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              color: stationColor.accent,
                              background: stationColor.bg,
                              border: `1px solid ${stationColor.border}`,
                              borderRadius: '1px',
                              padding: '0 3px',
                            }}>
                              {msgStation}
                            </span>
                          )}
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            color: isSelf ? 'var(--term-green)' : isEmergency ? 'var(--term-red)' : 'var(--term-text-dim)',
                          }}>
                            {msg.sender}
                          </span>
                          {isBot && (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '7px',
                              color: 'var(--term-amber)',
                              background: 'var(--term-amber-bg)',
                              border: '1px solid var(--term-amber-border)',
                              padding: '0 3px',
                              borderRadius: '1px',
                            }}>AUTO</span>
                          )}
                          {isEmergency && (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '7px',
                              fontWeight: 700,
                              color: 'var(--term-red)',
                              letterSpacing: '0.08em',
                              animation: 'termPulse 1s ease-in-out infinite',
                            }}>⚠ EMERGENCY</span>
                          )}
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            color: 'var(--term-text-dimmer)',
                          }}>
                            {fmtTime(msg.timestamp)}
                          </span>
                          {msg.channel && (
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '7px',
                              color: 'var(--term-text-dimmer)',
                              opacity: 0.6,
                            }}>
                              #{msg.channel}
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'var(--term-text)',
                          wordBreak: 'break-word',
                          lineHeight: 1.4,
                        }}>
                          {msg.content}
                        </div>
                        {!isSelf && !isSystem && (
                          <button
                            onClick={() => {
                              setReplyTarget(msg);
                              setInputText(`@${msg.sender}: `);
                              inputRef.current?.focus();
                            }}
                            style={{
                              marginTop: '3px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '8px',
                              color: 'var(--term-cyan-dim)',
                              background: 'transparent',
                              border: '1px solid var(--term-border-dim)',
                              borderRadius: '1px',
                              padding: '1px 6px',
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                            }}
                          >
                            REPLY
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div style={{
              padding: '8px',
              borderTop: '1px solid var(--term-border)',
              display: 'flex',
              gap: '6px',
              flexShrink: 0,
              background: 'var(--term-bg-inset)',
            }}>
              {replyTarget && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '8px',
                  color: 'var(--term-cyan)',
                  alignSelf: 'center',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.04em',
                }}>
                  →{replyTarget.sender}:
                </span>
              )}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '8px',
                color: 'var(--term-text-dimmer)',
                alignSelf: 'center',
                whiteSpace: 'nowrap',
                letterSpacing: '0.04em',
              }}>
                {composerChannel?.replace('ops-', '→').toUpperCase()}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(composerChannel);
                  }
                  if (e.key === 'Escape') {
                    setReplyTarget(null);
                    setInputText('');
                  }
                }}
                placeholder={`HQ → ${composerChannel?.replace('ops-', '')}...`}
                style={{
                  flex: 1,
                  background: 'var(--term-bg)',
                  color: 'var(--term-text)',
                  border: '1px solid var(--term-border)',
                  borderRadius: '2px',
                  padding: '6px 10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.02em',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => handleSend(composerChannel)}
                disabled={!inputText.trim()}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  padding: '6px 14px',
                  background: inputText.trim() ? 'var(--term-green-08)' : 'var(--term-bg)',
                  color: inputText.trim() ? 'var(--term-green)' : 'var(--term-text-dimmer)',
                  border: `1px solid ${inputText.trim() ? 'var(--term-border-bright)' : 'var(--term-border)'}`,
                  borderRadius: '2px',
                  cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease',
                }}
              >
                [SEND]
              </button>
              {replyTarget && (
                <button onClick={() => { setReplyTarget(null); setInputText(''); }} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  padding: '4px 8px',
                  background: 'transparent',
                  color: 'var(--term-text-dimmer)',
                  border: '1px solid var(--term-border)',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}>✕</button>
              )}
            </div>
          </div>

          {/* ════════════════ RIGHT: ALERT / DISPATCH FEED ════════════════ */}
          <div style={{
            background: 'var(--term-bg)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
          }}>
            {/* Alerts section header */}
            <div style={{
              padding: '6px 8px',
              background: 'var(--term-bg-inset)',
              borderBottom: '1px solid var(--term-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'var(--term-text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 5,
            }}>
              <span>INCOMING ALERTS</span>
              <span style={{ color: 'var(--term-text-dimmer)', fontSize: '8px' }}>
                {filteredAlerts.filter(a => !a.resolved).length} ACTIVE
              </span>
            </div>

            {/* Alert list */}
            <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filteredAlerts.length === 0 && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--term-text-dimmer)',
                  textAlign: 'center',
                  padding: '12px 4px',
                  letterSpacing: '0.04em',
                }}>
                  No alerts
                </div>
              )}
              {filteredAlerts.slice(0, 30).map(alert => {
                const pColors = {
                  P0: { color: 'var(--term-red)', bg: 'var(--term-red-bg)', border: 'var(--term-red-border)' },
                  P1: { color: 'var(--term-amber)', bg: 'var(--term-amber-bg)', border: 'var(--term-amber-border)' },
                  P2: { color: 'var(--term-text-dim)', bg: 'var(--term-bg-inset)', border: 'var(--term-border)' },
                };
                const pc = pColors[alert.priority] || pColors.P2;
                const isNewAlert = Date.now() - new Date(alert.timestamp).getTime() < 10000;

                return (
                  <div
                    key={alert.id}
                    style={{
                      background: isNewAlert ? 'var(--term-bg-panel)' : 'transparent',
                      border: `1px solid ${isNewAlert ? 'var(--term-red-border)' : 'var(--term-border)'}`,
                      borderRadius: '1px',
                      padding: '5px 6px',
                      transition: 'all 180ms ease',
                      ...(isNewAlert ? { animation: 'termFadeIn 500ms ease' } : {}),
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '7px',
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        padding: '0 3px',
                        background: pc.bg,
                        color: pc.color,
                        border: `1px solid ${pc.border}`,
                        borderRadius: '1px',
                      }}>
                        {alert.priority}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '8px',
                        color: STATION_COLORS[alert.stationId]?.accent || 'var(--term-text-dimmer)',
                      }}>
                        {STATION_NAMES[alert.stationId] || alert.stationId}
                      </span>
                      {isNewAlert && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '7px',
                          color: 'var(--term-red)',
                          animation: 'termPulse 1s ease-in-out infinite',
                        }}>NEW</span>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      fontWeight: 600,
                      color: 'var(--term-text)',
                      marginBottom: '1px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {alert.title}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      color: 'var(--term-text-dimmer)',
                    }}>
                      {fmtTime(alert.timestamp)}
                      {!alert.acknowledged && !alert.resolved && (
                        <button
                          onClick={() => handleAcknowledgeEmergency(
                            allMessages.find(m => m.station_id === alert.stationId && m.channel === 'emergency' && new Date(m.timestamp) > new Date(alert.timestamp) - 10000)?.id
                          )}
                          style={{
                            marginLeft: '6px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '7px',
                            fontWeight: 700,
                            color: 'var(--term-red)',
                            background: 'var(--term-red-bg)',
                            border: '1px solid var(--term-red-border)',
                            borderRadius: '1px',
                            padding: '1px 4px',
                            cursor: 'pointer',
                            letterSpacing: '0.06em',
                          }}
                        >
                          ACK
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dispatch log section header */}
            <div style={{
              padding: '6px 8px',
              background: 'var(--term-bg-inset)',
              borderTop: '1px solid var(--term-border)',
              borderBottom: '1px solid var(--term-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'var(--term-text-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              zIndex: 5,
            }}>
              <span>📨 SMS DISPATCH LOG</span>
              <span style={{ color: 'var(--term-text-dimmer)', fontSize: '8px' }}>
                {filteredNotifications.length}
              </span>
            </div>

            {/* Dispatch log */}
            <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              {filteredNotifications.length === 0 && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--term-text-dimmer)',
                  textAlign: 'center',
                  padding: '12px 4px',
                  letterSpacing: '0.04em',
                }}>
                  No dispatches yet
                </div>
              )}
              {filteredNotifications.slice(0, 40).map(n => {
                const statusColors = {
                  pending: 'var(--term-amber)',
                  sent: 'var(--term-cyan)',
                  delivered: 'var(--term-green)',
                  failed: 'var(--term-red)',
                };
                const channelIcons = { email: '📧', radio: '📻', sms: '📱' };

                return (
                  <div key={n.id} style={{
                    background: 'var(--term-bg-panel)',
                    border: '1px solid var(--term-border)',
                    borderRadius: '1px',
                    padding: '4px 6px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '7px',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        color: statusColors[n.status] || 'var(--term-text-dimmer)',
                      }}>
                        {n.status?.toUpperCase()}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '8px',
                        color: 'var(--term-text-dimmer)',
                      }}>
                        {channelIcons[n.channel] || '📨'} {n.channel}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '7px',
                        color: STATION_COLORS[n.station_id]?.dim || 'var(--term-text-dimmer)',
                        marginLeft: 'auto',
                      }}>
                        {STATION_NAMES[n.station_id] || n.station_id}
                      </span>
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '8px',
                      color: 'var(--term-text-dim)',
                      fontWeight: 600,
                      marginBottom: '1px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {n.subject || 'Notification'}
                    </div>
                    {n.authority && (
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '7px',
                        color: 'var(--term-text-dimmer)',
                      }}>
                        {n.authority} · {n.contact}
                      </div>
                    )}
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '7px',
                      color: 'var(--term-text-dimmer)',
                      opacity: 0.7,
                    }}>
                      {fmtTime(n.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BROADCAST MODAL ─── */}
      {showBroadcastModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBroadcastModal(false); }}
        >
          <div style={{
            background: 'var(--term-bg-panel)',
            border: '1px solid var(--term-green)',
            borderRadius: '2px',
            padding: '20px',
            width: '480px',
            maxWidth: '90vw',
            boxShadow: '0 0 20px rgba(0,255,65,0.1)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--term-green)',
              marginBottom: '12px',
            }}>
              ⚡ BROADCAST TO ALL STATIONS
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--term-text-dimmer)',
              marginBottom: '10px',
            }}>
              This message will be sent to both Bharati and Maitri comms channels simultaneously.
            </div>
            <textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Type your broadcast message..."
              autoFocus
              rows={4}
              style={{
                width: '100%',
                background: 'var(--term-bg)',
                color: 'var(--term-text)',
                border: '1px solid var(--term-border)',
                borderRadius: '2px',
                padding: '8px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.02em',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBroadcastModal(false)} style={{
                padding: '6px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                background: 'transparent',
                color: 'var(--term-text-dimmer)',
                border: '1px solid var(--term-border)',
                borderRadius: '2px',
                cursor: 'pointer',
              }}>CANCEL</button>
              <button onClick={handleBroadcastSend} disabled={!broadcastText.trim()} style={{
                padding: '6px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                background: broadcastText.trim() ? 'var(--term-green-08)' : 'var(--term-bg)',
                color: broadcastText.trim() ? 'var(--term-green)' : 'var(--term-text-dimmer)',
                border: `1px solid ${broadcastText.trim() ? 'var(--term-border-bright)' : 'var(--term-border)'}`,
                borderRadius: '2px',
                cursor: broadcastText.trim() ? 'pointer' : 'not-allowed',
              }}>[SEND BROADCAST]</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── STATUS REQUEST MODAL ─── */}
      {showStatusModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowStatusModal(false); }}
        >
          <div style={{
            background: 'var(--term-bg-panel)',
            border: '1px solid var(--term-cyan)',
            borderRadius: '2px',
            padding: '20px',
            width: '480px',
            maxWidth: '90vw',
            boxShadow: '0 0 20px rgba(79,209,232,0.1)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--term-cyan)',
              marginBottom: '12px',
            }}>
              📋 REQUEST STATUS UPDATE
            </div>

            {/* Target station selector */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                letterSpacing: '0.06em',
                color: 'var(--term-text-dimmer)',
                marginBottom: '4px',
              }}>TARGET STATION</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['BHARATI', 'MAITRI'].map(s => {
                  const active = statusTarget === s;
                  const c = s === 'BHARATI' ? 'var(--term-cyan)' : 'var(--term-amber)';
                  return (
                    <button key={s} onClick={() => setStatusTarget(s)} style={{
                      padding: '4px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      border: `1px solid ${active ? c : 'var(--term-border)'}`,
                      borderRadius: '2px',
                      background: active ? `${c}15` : 'transparent',
                      color: active ? c : 'var(--term-text-dimmer)',
                      cursor: 'pointer',
                    }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              rows={4}
              autoFocus
              style={{
                width: '100%',
                background: 'var(--term-bg)',
                color: 'var(--term-text)',
                border: '1px solid var(--term-border)',
                borderRadius: '2px',
                padding: '8px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.02em',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowStatusModal(false)} style={{
                padding: '6px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                background: 'transparent',
                color: 'var(--term-text-dimmer)',
                border: '1px solid var(--term-border)',
                borderRadius: '2px',
                cursor: 'pointer',
              }}>CANCEL</button>
              <button onClick={handleStatusRequest} disabled={!statusText.trim()} style={{
                padding: '6px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                background: statusText.trim() ? 'var(--term-cyan-bg)' : 'var(--term-bg)',
                color: statusText.trim() ? 'var(--term-cyan)' : 'var(--term-text-dimmer)',
                border: `1px solid ${statusText.trim() ? 'var(--term-cyan)' : 'var(--term-border)'}`,
                borderRadius: '2px',
                cursor: statusText.trim() ? 'pointer' : 'not-allowed',
              }}>[SEND REQUEST]</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
