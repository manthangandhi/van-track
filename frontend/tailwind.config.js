/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0f7f4',
          100: '#dceee6',
          200: '#b8ddd0',
          300: '#86c4ad',
          400: '#52a384',
          500: '#34856a',
          600: '#276b55',
          700: '#1f5645',
          800: '#1a4539',
          900: '#16392f',
          950: '#0b211b',
        },
        cream: '#faf8f5',
        earth: {
          DEFAULT: '#6b5b4f',
          light: '#9a8b7e',
        },
        canopy: '#2d6a4f',
        primary: '#276b55',
        secondary: '#b8860b',
        danger: '#c53030',
        warning: '#d97706',
        success: '#276b55',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(31, 86, 69, 0.1)',
        card: '0 1px 3px rgba(31, 86, 69, 0.06), 0 10px 28px -10px rgba(31, 86, 69, 0.14)',
        elevated: '0 24px 60px -16px rgba(11, 33, 27, 0.2)',
      },
      backgroundImage: {
        'forest-hero': 'linear-gradient(145deg, #0b211b 0%, #1f5645 45%, #34856a 100%)',
        'forest-glow': 'radial-gradient(ellipse 80% 60% at 20% 0%, rgba(82, 163, 132, 0.25), transparent 60%)',
        'page-texture':
          'radial-gradient(circle at 100% 0%, rgba(52, 133, 106, 0.06), transparent 40%), radial-gradient(circle at 0% 100%, rgba(184, 221, 208, 0.2), transparent 45%)',
      },
    },
  },
  plugins: [],
}