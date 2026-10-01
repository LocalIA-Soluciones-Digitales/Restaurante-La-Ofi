import type { Config } from "tailwindcss";

// Paleta derivada del propio local: crema/arena de las paredes, madera y ratán
// de mobiliario y lámparas, azul marino del frontal de la barra, oliva del
// jardín vertical y lavanda del rótulo de neón "la ofi" (solo de noche).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        crema: "#FAF5EC",
        arena: { DEFAULT: "#F1E8D8", 2: "#E6D8BF" },
        madera: "#A9784A",
        ratan: "#D2AE78",
        marino: { DEFAULT: "#1E3557", 700: "#182C49", 900: "#111E33" },
        oliva: { DEFAULT: "#56653A", soft: "#E3E5CF" },
        terracota: { DEFAULT: "#96442B", soft: "#F2DCCF" },
        carbon: { DEFAULT: "#2B2722", muted: "#5E554B" },
        neon: "#C9BBFF",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 2px rgb(43 39 34 / 0.06), 0 8px 24px -12px rgb(43 39 34 / 0.18)",
        lift: "0 2px 4px rgb(43 39 34 / 0.08), 0 18px 40px -16px rgb(43 39 34 / 0.28)",
      },
      keyframes: {
        kenburns: {
          "0%": { transform: "scale(1.04) translate3d(0,0,0)" },
          "100%": { transform: "scale(1.14) translate3d(-2%,-1.5%,0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        kenburns: "kenburns 22s ease-out both",
        "fade-up": "fade-up 0.8s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
