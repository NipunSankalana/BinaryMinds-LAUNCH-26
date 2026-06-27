/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          deep: '#05060b',
          card: 'rgba(10, 15, 30, 0.65)',
          panel: 'rgba(13, 20, 38, 0.8)',
        },
        cyber: {
          cyan: '#00f2fe',
          green: '#05ffb0',
          red: '#ff3366',
          purple: '#bd5eff',
          orange: '#f59e0b',
        }
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s infinite ease-in-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 12px rgba(0, 242, 254, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 242, 254, 0.45)' },
        }
      }
    },
  },
  plugins: [],
}
