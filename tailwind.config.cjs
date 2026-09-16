/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan: '#00F0FF',
          emerald: '#10B981',
          dark: '#0A0B0E',
          card: '#14161D',
          border: 'rgba(255, 255, 255, 0.08)',
        }
      }
    },
  },
  plugins: [],
};
