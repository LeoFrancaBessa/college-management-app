/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#f05ca3",
        "primary-50": "#fef1f7",
        "primary-100": "#fde6f0",
      },
    },
  },
  plugins: [],
};
