/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C3BFA',
          hover: '#5B2BE0',
          light: '#F0EDFF',
          50: '#F0EDFF',
          100: '#E4DBFF',
          500: '#6C3BFA',
          600: '#5B2BE0',
          700: '#4A22C0'
        },
        appBg: '#F7F9FC',
        surface: '#FFFFFF',
        border: '#E6EBF2',
        textPrimary: '#172033',
        textSecondary: '#8493AA',
        success: {
          DEFAULT: '#16A37A',
          light: '#E6F6F0',
          bg: '#D1FAE5'
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          bg: '#FEF3C7'
        },
        error: {
          DEFAULT: '#E5484D',
          light: '#FEE2E2',
          bg: '#FEE2E2'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      fontSize: {
        'page-title': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'section-title': ['18px', { lineHeight: '28px', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'small': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'meta': ['12px', { lineHeight: '16px', fontWeight: '500' }]
      },
      borderRadius: {
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px'
      },
      boxShadow: {
        'card': '0 1px 3px rgba(16, 24, 40, 0.05), 0 1px 2px rgba(16, 24, 40, 0.05)',
        'card-hover': '0 4px 12px rgba(16, 24, 40, 0.08)',
        'modal': '0 20px 40px rgba(16, 24, 40, 0.12)'
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-in': 'slideIn 0.25s ease-out'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      }
    },
  },
  plugins: [],
}
