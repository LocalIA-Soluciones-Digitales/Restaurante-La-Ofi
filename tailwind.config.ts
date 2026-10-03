import type { Config } from "tailwindcss";

// Paleta derivada del propio local: crema/arena de las paredes, madera y ratán
// de mobiliario y lámparas, azul marino del frontal de la barra, oliva del
// jardín vertical y lavanda del rótulo de neón "la ofi" (solo de noche).
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  // Modo oscuro solo donde se pide (panel /admin y pantalla de cocina): la web
  // pública no lo usa. data-theme="dark" en cualquier ancestro.
  darkMode: ["selector", '[data-theme="dark"]'],
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
        neon: { DEFAULT: "#C9BBFF", soft: "#E4DCFF", deep: "#8E7CF0" },
        // Modo noche (tarde/eventos): azul de la barra casi negro + neón lavanda.
        noche: { DEFAULT: "#0B1424", 2: "#111E33", 3: "#1A2944" },
        // --- Tokens semánticos de la web pública (rediseño gastronómico) ---
        // Acento de conversión: el color de la brasa y de la baldosa terracota.
        // Contraste con crema 5,9:1 (AA para texto normal).
        brasa: { DEFAULT: "#9A4527", 700: "#7E3820", soft: "#F2DCCF" },
        // Texto principal y secundario sobre papel; "line" para filetes.
        tinta: { DEFAULT: "#221E1A", soft: "#5E554B", line: "rgb(43 39 34 / 0.14)" },
        papel: { DEFAULT: "#FAF5EC", 2: "#F3EBDD", 3: "#E9DCC6" },
        ok: "#4E6B3A",
        aviso: "#9A4527",
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
          "0%": { transform: "scale(1.0) translate3d(0,0,0)" },
          "100%": { transform: "scale(1.06) translate3d(-1%,-0.8%,0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        // Revelado de titulares por palabras (máscara + subida), estilo Amway.
        "word-up": {
          "0%": { transform: "translateY(105%) rotate(2deg)" },
          "100%": { transform: "translateY(0) rotate(0)" },
        },
        marquee: {
          "0%": { transform: "translate3d(0,0,0)" },
          "100%": { transform: "translate3d(-50%,0,0)" },
        },
        // Parpadeo sutil de tubo de neón: casi siempre encendido, dos micro-cortes.
        "neon-flicker": {
          "0%, 18%, 22%, 25%, 53%, 57%, 100%": { opacity: "1" },
          "20%, 24%, 55%": { opacity: "0.55" },
        },
        "neon-on": {
          "0%": { opacity: "0.15", filter: "blur(1px)" },
          "10%": { opacity: "0.9" },
          "14%": { opacity: "0.3" },
          "22%, 100%": { opacity: "1", filter: "blur(0)" },
        },
        "scroll-cue": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(8px)" },
        },
        "bump": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        kenburns: "kenburns 30s ease-out both",
        "fade-up": "fade-up 0.8s cubic-bezier(0.22,1,0.36,1) both",
        "word-up": "word-up 1.1s cubic-bezier(0.16,1,0.3,1) both",
        marquee: "marquee 38s linear infinite",
        "neon-flicker": "neon-flicker 7s linear infinite",
        "neon-on": "neon-on 1.6s ease-out both",
        "scroll-cue": "scroll-cue 1.8s ease-in-out infinite",
        bump: "bump 0.35s cubic-bezier(0.22,1,0.36,1)",
        "sheet-up": "sheet-up 0.42s cubic-bezier(0.32,0.72,0,1) both",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16,1,0.3,1)",
        drawer: "cubic-bezier(0.32,0.72,0,1)",
      },
    },
  },
  plugins: [],
};

export default config;
