import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cancha: {
          900: "#0b1a10",   // page background
          800: "#0f2416",   // cards / surface
          700: "#152d1e",   // elevated / hover
          600: "#265c3a",   // borders / outline
        },
        lima:     "#c6ff3a",
        limaSoft: "#b0e82e",
        crema:    "#e8f0eb",   // texto principal (claro sobre oscuro)
        carbon:   "#060e09",   // texto sobre bg-lima
        bosque:   "#0b1a10",   // alias para nav
        wc26: {
          red:   "#E61D25",
          blue:  "#4F8EFF",
          green: "#3CAC3B",
          gold:  "#C9A84C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body:    ["var(--font-body)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        carta:       "0 1px 3px rgba(0,0,0,0.08), 0 4px 16px -4px rgba(0,0,0,0.10)",
        "card-hover": "0 8px 30px -8px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
