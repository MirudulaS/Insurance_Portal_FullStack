/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F4E5F',
          dark: '#173C49',
          light: '#2A6478',
        },
        secondary: '#4F7C82',
        accent: '#7BA7A7',
        background: '#F5F7F8',
        surface: '#FFFFFF',
        ink: '#1F2933',
        muted: '#667085',
        border: '#D9E2E7',
        success: '#2E7D32',
        warning: '#B7791F',
        error: '#C62828',
        info: '#1565C0',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Lexend"', '"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,73,95,0.06), 0 1px 8px rgba(31,73,95,0.05)',
        pop: '0 8px 24px rgba(31,73,95,0.14)',
      },
      borderRadius: {
        card: '10px',
      },
    },
  },
  plugins: [],
}
