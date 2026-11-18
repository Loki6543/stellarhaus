/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        zpele: {
          bg: "#0a0e1a",
          panel: "#131829",
          accent: "#5eead4",
          danger: "#f87171",
          good: "#4ade80",
          warn: "#fbbf24",
        },
      },
    },
  },
  plugins: [],
};
