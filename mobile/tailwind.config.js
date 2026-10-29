/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: { colors: { brand: { 50: '#eef2ff', 600: '#4f46e5', 700: '#4338ca' } } } },
  plugins: [],
};
