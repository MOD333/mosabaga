/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF9F6',
        honey: {
          50: '#FEFBF3',
          100: '#FDF4E1',
          200: '#FAE7BE',
          300: '#F4D592',
          400: '#EDC167',
          500: '#E0A83C',
          600: '#C2882A',
          700: '#8F631F',
          800: '#5F4215',
        },
        sage: {
          50: '#F6F9F5',
          100: '#E9F1E6',
          200: '#D3E3CD',
          300: '#B2CBA9',
          400: '#8FAE85',
          500: '#71956A',
          600: '#577851',
          700: '#40593C',
          800: '#2C3F29',
        },
        coral: {
          50: '#FEF7F5',
          100: '#FBE9E4',
          200: '#F5D4CA',
          300: '#ECB2A2',
          400: '#DF917D',
          500: '#CE7059',
          600: '#AC5742',
          700: '#7E4030',
          800: '#552B20',
        },
        sky: {
          50: '#F5F9FB',
          100: '#E6EFF4',
          200: '#CCDFE9',
          300: '#A7C7D7',
          400: '#7FA9BF',
          500: '#5F8BA3',
          600: '#4A6E84',
          700: '#375266',
          800: '#243744',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Tajawal', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        soft: '0 2px 10px -3px rgba(120, 100, 70, 0.14)',
        'soft-md': '0 8px 26px -10px rgba(120, 100, 70, 0.20)',
        'soft-lg': '0 22px 50px -18px rgba(120, 100, 70, 0.26)',
        'soft-inner': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.85)',
        'press': 'inset 0 3px 10px -2px rgba(120, 100, 70, 0.22)',
      },
      keyframes: {
        'soft-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.035)', opacity: '0.94' },
        },
        'halo': {
          '0%': { transform: 'scale(0.94)', opacity: '0.5' },
          '70%': { transform: 'scale(1.22)', opacity: '0' },
          '100%': { transform: 'scale(1.28)', opacity: '0' },
        },
        'rise': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
      },
      animation: {
        'soft-pulse': 'soft-pulse 2.4s ease-in-out infinite',
        halo: 'halo 2s ease-out infinite',
        rise: 'rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        bob: 'bob 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
