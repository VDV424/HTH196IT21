/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hospital: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#0284c7',
          600: '#0369a1',
          900: '#0c2e4e',
        },
        priority: {
          stable: '#10b981',
          watch: '#f59e0b',
          review: '#f97316',
          high: '#ef4444',
          immediate: '#dc2626',
        }
      }
    },
  },
  plugins: [],
}
