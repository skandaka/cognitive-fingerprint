/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        neuro: {
          background: '#0B1221',
          surface: '#142033',
          accent: '#3BAFDA',
          accent2: '#7D5DF6',
          positive: '#3DDC97',
          warning: '#FFC857',
          riskLow: '#3DDC97',
          riskMid: '#FFC857',
            riskHigh: '#FF6B6B'
        }
      }
    }
  },
  plugins: []
};
