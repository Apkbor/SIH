/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ice: {
          bg: '#060E1A',
          panel: '#0A1628',
          elevated: '#0D1E32',
          inset: '#030A14',
          cyan: '#4FD1E8',
          glow: '#7DDBEE',
        },
        term: {
          bg: '#060E1A',
          panel: 'rgba(8,18,34,0.92)',
          elevated: '#0A1628',
          inset: '#030A14',
          green: '#3DDC97',
          'green-dim': '#2BB87F',
          'green-glow': '#4EECC8',
          'green-bright': '#5CFFC8',
          'green-50': 'rgba(61,220,151,0.12)',
          'green-30': 'rgba(61,220,151,0.07)',
          'green-15': 'rgba(61,220,151,0.04)',
          'green-08': 'rgba(61,220,151,0.02)',
          cyan: '#4FD1E8',
          'cyan-dim': 'rgba(79,209,232,0.55)',
          'cyan-bg': 'rgba(79,209,232,0.06)',
          amber: '#F5A623',
          'amber-dim': 'rgba(245,166,35,0.65)',
          'amber-bg': 'rgba(245,166,35,0.08)',
          'amber-border': 'rgba(245,166,35,0.25)',
          red: '#E8443A',
          'red-dim': 'rgba(232,68,58,0.65)',
          'red-bg': 'rgba(232,68,58,0.08)',
          'red-border': 'rgba(232,68,58,0.3)',
          text: '#E8F4F8',
          'text-dim': 'rgba(125,219,238,0.55)',
          'text-dimmer': 'rgba(125,219,238,0.3)',
          border: 'rgba(79,209,232,0.14)',
          'border-bright': 'rgba(79,209,232,0.35)',
          'border-dim': 'rgba(79,209,232,0.07)',
        },
      },
      fontSize: {
        'label': ['11px', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '500' }],
        'body': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'hero': ['36px', { lineHeight: '1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'critical': ['18px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '0.04em' }],
        'display': ['20px', { lineHeight: '1.2', fontWeight: '400', letterSpacing: '0.02em' }],
        'micro': ['10px', { lineHeight: '1.2', fontWeight: '300' }],
      },
      fontFamily: {
        'display': ['"Space Grotesk"', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'monospace'],
        'term': ['"JetBrains Mono"', 'monospace'],
      },
      spacing: {
        '4px': '4px',
        '8px': '8px',
        '12px': '12px',
        '16px': '16px',
        '24px': '24px',
        '32px': '32px',
      },
      borderRadius: {
        'term': '2px',
      },
      keyframes: {
        'term-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        'term-glow': {
          '0%, 100%': {
            'box-shadow': '0 0 4px rgba(79,209,232,0.2), 0 0 8px rgba(79,209,232,0.1)',
          },
          '50%': {
            'box-shadow': '0 0 8px rgba(79,209,232,0.4), 0 0 16px rgba(79,209,232,0.2)',
          },
        },
        'term-sweep': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'term-fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'term-slide-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'term-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(79,209,232,0.15)' },
          '50%': { borderColor: 'rgba(79,209,232,0.4)' },
        },
        'aurora': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'term-pulse': 'termPulse 1.5s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        'term-glow': 'termGlow 2s ease-in-out infinite',
        'term-sweep': 'termSweep 4s linear infinite',
        'term-fade-in': 'termFadeIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'term-slide-in': 'termSlideIn 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'term-blink': 'termBlink 1s step-end infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
        'aurora': 'aurora 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
