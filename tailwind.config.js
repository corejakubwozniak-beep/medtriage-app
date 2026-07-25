/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        sage: {
          50: '#f4f8f6',
          100: '#e6efe9',
          200: '#cde3d4',
          300: '#a6cbb3',
          400: '#79ab8c',
          500: '#578d70',
          600: '#427358',
          700: '#365c48',
          800: '#2d4a3b',
          900: '#263e33',
        },
        teal: {
          50: '#effcfb',
          100: '#c8f7f4',
          200: '#90eee8',
          300: '#54ddda',
          400: '#25c2c4',
          500: '#14a3a8',
          600: '#0f8289',
          700: '#11686f',
          800: '#135359',
          900: '#14464b',
        },
        sand: {
          50: '#faf8f3',
          100: '#f3eee1',
          200: '#e7dcc2',
          300: '#d8c59b',
          400: '#c9ae74',
          500: '#bd9a5a',
        },
        ink: {
          50: '#f7f8f8',
          100: '#eef0f1',
          200: '#dcdfe1',
          300: '#bfc5c9',
          400: '#94a0a6',
          500: '#6f7d85',
          600: '#56636b',
          700: '#465150',
          800: '#3b4347',
          900: '#1f2629',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(31,38,41,0.04), 0 8px 24px rgba(31,38,41,0.06)',
        card: '0 1px 3px rgba(31,38,41,0.05), 0 12px 40px rgba(31,38,41,0.08)',
        glow: '0 0 0 4px rgba(121,171,140,0.18)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
