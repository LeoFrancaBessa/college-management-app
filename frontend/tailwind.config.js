/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#fb93d7",
        "primary-50": "#fff0f8",
        "primary-100": "#ffe4f2",
      },
    },
  },
  plugins: [],
};
