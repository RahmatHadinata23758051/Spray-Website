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
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        tool: 'var(--bg-tool)',
        navigation: 'var(--bg-navigation)',
        'nav-text': 'var(--text-navigation)',
        'nav-muted': 'var(--text-navigation-muted)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
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
        },
        camera: {
          side: '#1D8FFF',
          front: '#0D747A',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '20px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};
