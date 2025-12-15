/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'accent': '#007aff',
        'accent-hover': '#005ecb',
      },
      fontFamily: {
        sans: ['Manrope', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  // ADD THIS PLUGINS SECTION
  plugins: [
    require('@tailwindcss/typography'),
  ],
}