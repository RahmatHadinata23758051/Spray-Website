/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          subtle: 'var(--bg-subtle)',
          active: 'var(--bg-surface-active)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft)',
        },
        semantic: {
          success: 'var(--success)',
          'success-soft': 'var(--success-soft)',
          warning: 'var(--warning)',
          'warning-soft': 'var(--warning-soft)',
          danger: 'var(--danger)',
          'danger-soft': 'var(--danger-soft)',
          info: 'var(--info)',
          'info-soft': 'var(--info-soft)',
        },
        workbench: {
          DEFAULT: 'var(--workbench)',
          raised: 'var(--workbench-raised)',
          border: 'var(--workbench-border)',
          grid: 'var(--workbench-grid)',
          text: 'var(--workbench-text)',
          muted: 'var(--workbench-muted)',
        },
        overlay: {
          auto: 'var(--overlay-auto)',
          working: 'var(--overlay-working)',
          accepted: 'var(--overlay-accepted)',
          frontRef: 'var(--overlay-front-ref)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        input: '10px',
        panel: '12px',
        'panel-lg': '14px',
        sidebar: '24px',
      },
    },
  },
  plugins: [],
};
