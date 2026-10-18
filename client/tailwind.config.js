/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1EFFF', 100: '#E5DEFF', 200: '#D2C5FF', 300: '#B49AFF', 400: '#9471FF',
          500: '#7D52FA', 600: '#6D3FF0', 700: '#5830CE', 800: '#40239B', 900: '#321B79', 950: '#291465',
        },
        ink: '#172033',
        canvas: '#F8FAFC',
      },
      boxShadow: {
        card: '0 2px 12px rgba(16, 24, 40, 0.045)',
        soft: '0 10px 30px rgba(36, 23, 74, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { 'fade-up': 'fade-up 240ms ease-out both' },
    },
  },
  plugins: [],
};
