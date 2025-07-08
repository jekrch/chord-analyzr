/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // ✅ Correctly scans all relevant files in src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}