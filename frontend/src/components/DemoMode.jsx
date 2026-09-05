/**
 * Guided Demo Mode — scripted walkthrough for hackathon presentations
 * Runs a sequence of actions with on-screen captions
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { apiPost } from '../services/api';

const STEPS = [
  {
    id: 'intro',
    caption: 'Welcome to the Antarctic Digital Twin — AI-powered command center for Bharati & Maitri stations.',
    duration: 4000,
  },
  {
    id: 'live-data',
    caption: 'Live sensor feeds streaming in real-time: energy, environment, infrastructure, and logistics.',
    duration: 4000,
  },
  {
    id: 'inject-anomaly',
    caption: 'Injecting a generator overheating anomaly — watch the alerts system trigger automatically.',
    action: async (send) => {
      send('simulator:inject-anomaly', { stationId: 'BHARATI', type: 'generator_overheat' });
    },
    duration: 5000,
  },
  {
    id: 'blackout',
    caption: 'Simulating satellite blackout — data keeps collecting locally but cannot reach NCPOR headquarters.',
    action: async (send) => {
      send('blackout:toggle', { active: true });
    },
    duration: 5000,
  },
  {
    id: 'recover',
    caption: 'Link restored! Priority queue draining — P0 critical alerts flush first, then P1, then P2.',
    action: async (send) => {
      send('blackout:toggle', { active: false });
      send('blackout:end');
    },
    duration: 6000,
  },
  {
    id: 'forecast',
    caption: 'AI forecasts computed from time-series data — fuel depletion, generator maintenance, logistics.',
    duration: 4000,
  },
  {
    id: 'whatif',
    caption: 'Running what-if simulation: generator failure scenario — projecting impact on buildings and backup systems.',
    action: async () => {
      // Pre-load simulation data
      await apiPost('/api/simulate/generator-failure', { stationId: 'BHARATI' });
    },
    duration: 5000,
  },
  {
    id: 'done',
    caption: 'Demo complete — the platform provides real-time monitoring, predictive analytics, and resilient communication for polar research operations.',
    duration: 4000,
  },
];

export default function DemoMode({ onClose }) {
  const { send } = useApp();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const start = useCallback(() => {
    setActive(true);
    setStepIndex(0);
  }, []);

  // Auto-advance steps
  useEffect(() => {
    if (!active || paused) return;
    if (stepIndex >= STEPS.length) {
      setTimeout(() => { setActive(false); onClose?.(); }, 2000);
      return;
    }

    const step = STEPS[stepIndex];
    const timer = setTimeout(() => {
      step.action?.(send);
      setStepIndex(i => i + 1);
    }, step.duration);

    return () => clearTimeout(timer);
  }, [active, stepIndex, paused, send, onClose]);

  if (!active) {
    return (
      <button onClick={start} className="btn-aurora flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Start Demo Walkthrough
      </button>
    );
  }

  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)];
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4">
      <div className="glass-panel-dark p-4 border-ice-400/30 shadow-2xl">
        {/* Progress bar */}
        <div className="h-1 bg-ice-700/50 rounded-full mb-3 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-ice-400 to-aurora-green transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Caption */}
        <p className="text-sm text-ice-100 mb-3 font-mono leading-relaxed">
          {step.caption}
        </p>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-ice-500 font-mono">
            Step {Math.min(stepIndex + 1, STEPS.length)} / {STEPS.length}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPaused(!paused)}
              className="text-xs px-3 py-1.5 rounded-lg bg-ice-400/10 text-ice-300 hover:bg-ice-400/20 transition-colors font-mono">
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button onClick={() => { setActive(false); onClose?.(); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-aurora-red/10 text-aurora-red hover:bg-aurora-red/20 transition-colors font-mono">
              ✕ Exit Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
