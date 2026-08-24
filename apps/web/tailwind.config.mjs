/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6', // Accent
          600: '#0D9488',
          700: '#0F766E', // Secondary
          800: '#115E59',
          900: '#134E4A', // Primary
          950: '#042F2E',
        },
      },
      fontFamily: {
        sans: ['Noto Sans', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        bengali: ['Noto Sans Bengali', 'Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
