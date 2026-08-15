/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        paper: "var(--color-background)",
        ink: "var(--color-foreground)",
      },
      fontFamily: {
        display: ["var(--font-gulfs)", "Georgia", "serif"],
        ui: ["var(--font-montserrat)", "Arial", "sans-serif"],
      },
    },
  },
};
