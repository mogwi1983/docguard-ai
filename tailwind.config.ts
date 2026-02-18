import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#e8eaf0",
          100: "#c5cad8",
          200: "#9fa8bd",
          300: "#7986a2",
          400: "#5c6b8e",
          500: "#3f517a",
          600: "#394a72",
          700: "#314067",
          800: "#29375d",
          900: "#1b274a",
          950: "#0f1729",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
