/**
 * LogLine — monospace timestamped log line, color-coded by severity
 */

import React from 'react';

export default function LogLine({ timestamp, message, severity = 'INFO' }) {
  const colors = {
    INFO: 'var(--term-text-dim)',
    WARN: 'var(--term-amber-dim)',
    ERROR: 'var(--term-red-dim)',
    DEBUG: 'var(--term-text-dimmer)',
  };

  const prefixes = {
    INFO: 'INF',
    WARN: 'WRN',
    ERROR: 'ERR',
    DEBUG: 'DBG',
  };

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      lineHeight: '16px',
      color: colors[severity] || colors.INFO,
      padding: '1px 0',
    }}>
      <span style={{ flexShrink: 0, opacity: 0.6, width: '70px' }}>
        {timestamp}
      </span>
      <span style={{
        flexShrink: 0,
        fontWeight: 600,
        opacity: 0.7,
        width: '28px',
      }}>
        [{prefixes[severity] || 'INF'}]
      </span>
      <span style={{ flex: 1, wordBreak: 'break-word' }}>
        {message}
      </span>
    </div>
  );
}
