/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#1e3a8a', // Deep corporate blue
          accent: '#2563eb',  // Vibrant blue
        }
      }
    },
  },
  plugins: [],
}
