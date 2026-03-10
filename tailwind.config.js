/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        'doko-blue': {
          DEFAULT: '#1264ab',
          dark: '#0d4f8c',
          light: '#1a7acc',
          50: '#e8f2fb',
          100: '#c5ddf4',
          200: '#9ec7ec',
          900: '#0a3d6b',
        },
        'doko-green': {
          DEFAULT: '#00BF63',
          dark: '#009950',
          light: '#00d970',
          50: '#e0fff1',
          100: '#b3ffd9',
        },
      },
    },
  },
  plugins: [],
};
