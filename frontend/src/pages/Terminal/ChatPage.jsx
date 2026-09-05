/**
 * ChatPage — Internal Communication Hub (Terminal Edition)
 *
 * Real-time messaging between station personnel and teams.
 * Multiple channels, Socket.io live messages, bot auto-replies in
 * Emergency and Engineering channels.
 *
 * Channels:
 *   - ops-bharati:  Base Station ↔ Bharati
 *   - ops-maitri:   Base Station ↔ Maitri
 *   - engineering:  Engineering Team
 *   - emergency:    Emergency Channel (with bot auto-reply)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import {
  getChatMessages,
  postChatMessage,
  getChatChannels,
} from '../../services/api';
import HudPanel from '../../components/Terminal/HudPanel';
import StatusPill from '../../components/Terminal/StatusPill';
import TerminalHeader from '../../components/Terminal/TerminalHeader';
import TerminalSidebar from '../../components/Terminal/TerminalSidebar';
import { safeDate } from '../../utils/format';

const CHAT_SENDER = 'OPERATOR'; // Current user identity
const PAGE_SIZE = 100;

const DEFAULT_CHANNELS = [
  { id: 'ops-bharati', label: 'Base ↔ Bharati', icon: '📡', desc: 'General ops with Bharati Station' },
  { id: 'ops-maitri', label: 'Base ↔ Maitri', icon: '📡', desc: 'General ops with Maitri Station' },
  { id: 'engineering', label: 'Engineering', icon: '⚙', desc: 'Engineering team channel — bot monitored' },
  { id: 'emergency', label: 'Emergency', icon: '🔴', desc: 'Emergency channel — auto-dispatch + bot reply' },
];

export default function ChatPage() {
  const navigate = useNavigate();
  const { selectedStation, setSelectedStation, messages: socketMessages, socket } = useApp();

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
              letterSpacing: '0.08em', color: 'var(--term-text-dimmer)',
            }}>REDIRECTING TO COMPARISON VIEW...</div>
          </div>
        </div>
      </div>
    );
  }

  const [activeChannel, setActiveChannel] = useState('ops-bharati');
  const [input, setInput] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [history, setHistory] = useState([]);
  const [channels, setChannels] = useState(DEFAULT_CHANNELS);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Load channels + initial history on mount / channel switch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ch, msgs] = await Promise.all([
          getChatChannels(),
          getChatMessages(activeChannel, PAGE_SIZE),
        ]);
        if (!cancelled) {
          if (ch?.length) setChannels(ch);
          setHistory(Array.isArray(msgs) ? msgs : []);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activeChannel]);

  // Subscribe to chat channel via socket
  useEffect(() => {
    if (!socket) return;
    socket.emit('chat:subscribe', { channel: activeChannel });
  }, [socket, activeChannel]);

  // Merge live socket messages with history
  const allMessages = useMemo(() => {
    const map = new Map();
    for (const m of history) map.set(m.id, m);
    for (const m of socketMessages) {
      if (m.channel === activeChannel) map.set(m.id, m);
    }
    return Array.from(map.values()).sort((a, b) =>
      safeDate(a.timestamp) - safeDate(b.timestamp)
    );
  }, [history, socketMessages, activeChannel]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [allMessages.length]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content) return;
    const sender = CHAT_SENDER;

    // Optimistic local add
    const optimistic = {
      id: `M-LOCAL-${Date.now()}`,
      channel: activeChannel,
      sender,
      content,
      msg_type: 'user',
      station_id: selectedStation,
      timestamp: new Date().toISOString(),
    };

    setHistory(prev => [...prev, optimistic]);
    setInput('');

    try {
      await postChatMessage(activeChannel, sender, content, 'user', selectedStation);
    } catch (err) {
      console.error('[CHAT] Send failed:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const channelUnread = (ch) => {
    // Simple unread estimate: count of socket messages in this channel
    // not yet seen (simplified for demo — just count recent)
    const recent = socketMessages.filter(m => m.channel === ch.id && m.sender !== CHAT_SENDER);
    return recent.length;
  };

  const handleChannelChange = (ch) => {
    setActiveChannel(ch.id);
    inputRef.current?.focus();
  };

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
          <div>
            <h1 style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--term-green)',
              margin: 0,
            }}>
              COMMS HUB
            </h1>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              letterSpacing: '0.06em',
              color: 'var(--term-text-dimmer)',
            }}>
              REAL-TIME INTERNAL COMMUNICATION · {allMessages.length} MESSAGES
            </span>
          </div>

          {/* Chat layout: channel list + message area */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: '6px',
            minHeight: '60vh',
          }}>
            {/* Channel sidebar */}
            <HudPanel title="Channels" icon="◫" padding="8px">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {channels.map(ch => {
                  const isActive = activeChannel === ch.id;
                  const unread = channelUnread(ch);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => handleChannelChange(ch)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 8px',
                        background: isActive ? 'var(--term-green-08)' : 'var(--term-bg-inset)',
                        border: `1px solid ${isActive ? 'var(--term-border-bright)' : 'var(--term-border-dim)'}`,
                        borderRadius: '2px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 180ms ease',
                      }}
                    >
                      <span style={{ fontSize: '12px', flexShrink: 0 }}>{ch.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          fontWeight: isActive ? 700 : 500,
                          letterSpacing: '0.06em',
                          color: isActive ? 'var(--term-green)' : 'var(--term-text-dim)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {ch.label}
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '8px',
                          color: 'var(--term-text-dimmer)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {ch.desc}
                        </div>
                      </div>
                      {unread > 0 && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '8px',
                          fontWeight: 700,
                          color: 'var(--term-amber)',
                          background: 'var(--term-amber-bg)',
                          border: '1px solid var(--term-amber-border)',
                          borderRadius: '2px',
                          padding: '1px 4px',
                          flexShrink: 0,
                        }}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active channel info */}
              <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--term-border-dim)' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '8px',
                  color: 'var(--term-text-dimmer)',
                  letterSpacing: '0.08em',
                  marginBottom: '4px',
                }}>
                  ACTIVE CHANNEL
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  color: 'var(--term-green)',
                  fontWeight: 600,
                }}>
                  {channels.find(c => c.id === activeChannel)?.label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '8px',
                  color: 'var(--term-text-dimmer)',
                  marginTop: '2px',
                }}>
                  Station: {selectedStation}
                </div>
              </div>
            </HudPanel>

            {/* Message area */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--term-bg-panel)',
              border: '1px solid var(--term-border)',
              borderRadius: '2px',
              overflow: 'hidden',
              minHeight: '50vh',
            }}>
              {/* Channel header */}
              <div style={{
                padding: '6px 10px',
                background: 'var(--term-bg-inset)',
                borderBottom: '1px solid var(--term-border-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '12px' }}>
                    {channels.find(c => c.id === activeChannel)?.icon}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: 'var(--term-green)',
                  }}>
                    {channels.find(c => c.id === activeChannel)?.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: 'var(--term-text-dimmer)',
                  }}>
                    · {allMessages.length} messages
                  </span>
                </div>
                {(activeChannel === 'emergency' || activeChannel === 'engineering') && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '8px',
                    color: 'var(--term-amber)',
                    letterSpacing: '0.06em',
                    animation: 'termPulse 1.5s ease-in-out infinite',
                  }}>
                    ● BOT MONITORING
                  </span>
                )}
              </div>

              {/* Message list */}
              <div
                ref={listRef}
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  minHeight: '300px',
                  maxHeight: '50vh',
                }}
              >
                {allMessages.length === 0 ? (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--term-text-dimmer)',
                    textAlign: 'center',
                    padding: '20px',
                    letterSpacing: '0.06em',
                  }}>
                    NO MESSAGES — START A CONVERSATION
                  </div>
                ) : (
                  allMessages.map(msg => {
                    const isSelf = msg.sender === CHAT_SENDER;
                    const isBot = msg.sender === 'NCPOR-Ops-Bot';
                    const isSystem = msg.msg_type === 'system';
                    const time = msg.timestamp ? safeDate(msg.timestamp) : new Date();
                    const ts = time.toISOString().slice(11, 19);

                    if (isSystem) {
                      return (
                        <div key={msg.id} style={{
                          textAlign: 'center',
                          padding: '4px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--term-text-dimmer)',
                          letterSpacing: '0.04em',
                        }}>
                          — {msg.content} —
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} style={{
                        display: 'flex',
                        gap: '6px',
                        padding: '4px 6px',
                        background: isSelf ? 'var(--term-green-08)' : isBot ? 'var(--term-amber-bg)' : 'transparent',
                        borderLeft: `2px solid ${isSelf ? 'var(--term-green-dark)' : isBot ? 'var(--term-amber)' : 'var(--term-border)'}`,
                        borderRadius: '0 2px 2px 0',
                        transition: 'background 180ms ease',
                      }}>
                        {/* Sender avatar / icon */}
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '2px',
                          background: isSelf ? 'var(--term-green-15)' : isBot ? 'var(--term-amber-bg)' : 'var(--term-bg-inset)',
                          border: `1px solid ${isSelf ? 'var(--term-green-dark)' : isBot ? 'var(--term-amber-border)' : 'var(--term-border)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '8px',
                          fontWeight: 700,
                          color: isSelf ? 'var(--term-green)' : isBot ? 'var(--term-amber)' : 'var(--term-text-dimmer)',
                          flexShrink: 0,
                        }}>
                          {isSelf ? 'ME' : isBot ? 'BOT' : msg.sender?.slice(0, 2).toUpperCase()}
                        </div>

                        {/* Message content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '9px',
                              fontWeight: 600,
                              letterSpacing: '0.06em',
                              color: isSelf ? 'var(--term-green)' : isBot ? 'var(--term-amber)' : 'var(--term-text-dim)',
                            }}>
                              {msg.sender}
                            </span>
                            {isBot && (
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '7px',
                                color: 'var(--term-amber)',
                                letterSpacing: '0.06em',
                                background: 'var(--term-amber-bg)',
                                border: '1px solid var(--term-amber-border)',
                                padding: '0 3px',
                                borderRadius: '1px',
                              }}>
                                AUTO
                              </span>
                            )}
                            <span style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '8px',
                              color: 'var(--term-text-dimmer)',
                            }}>
                              {ts}
                            </span>
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
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input area */}
              <div style={{
                padding: '8px',
                borderTop: '1px solid var(--term-border-dim)',
                display: 'flex',
                gap: '6px',
                flexShrink: 0,
                background: 'var(--term-bg-inset)',
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${channels.find(c => c.id === activeChannel)?.label}...`}
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
                  onClick={handleSend}
                  disabled={!input.trim()}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    padding: '6px 14px',
                    background: input.trim() ? 'var(--term-green-08)' : 'var(--term-bg)',
                    color: input.trim() ? 'var(--term-green)' : 'var(--term-text-dimmer)',
                    border: `1px solid ${input.trim() ? 'var(--term-border-bright)' : 'var(--term-border)'}`,
                    borderRadius: '2px',
                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  [SEND]
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
