/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jg-navy': '#0D1B4B',
        'jg-gold': '#B8922A',
        'jg-gold-soft': '#d4a94e',
        'jg-gold-faint': '#f5edd8',
        'jg-off-white': '#f9f7f4',
        'jg-ink': '#1c1c2e',
        'jg-muted': '#7a7a8c',
      }
    },
  },
  plugins: [],
}