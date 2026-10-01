import type { AlergenoKey } from "@/lib/allergens";

// Pictogramas propios y simples para los 14 alérgenos. Siempre se acompañan del
// nombre en texto: el icono nunca es la única forma de transmitir la información.
const GLYPHS: Record<AlergenoKey, string> = {
  gluten: "M12 21V9m0 3-3-2m3 2 3-2m-3 6-3-2m3 2 3-2M12 9c-1.5-1-2-3-2-5 1.5.5 2 1.5 2 2.5 0-1 .5-2 2-2.5 0 2-.5 4-2 5Z",
  crustaceos: "M6 14c0-4 3-8 8-8 2 0 4 1 4 3s-2 2-4 2c-2 0-3 1-3 3s1 3 3 3M6 14l-2 3m2-3 3 3m5-11 1-3m2 4 2-2",
  huevo: "M12 21c-4 0-6.5-2.8-6.5-6.6C5.5 9.6 8.5 3 12 3s6.5 6.6 6.5 11.4c0 3.8-2.5 6.6-6.5 6.6Z",
  pescado: "M3 12c3-4 7-6 11-6 3 0 5 3 7 6-2 3-4 6-7 6-4 0-8-2-11-6Zm0 0-1-3m1 3-1 3m14-4h.01",
  cacahuetes: "M9 4a4 4 0 0 1 4 5c-.5 1.5 1.5 2.5 3 3a4 4 0 1 1-5 5c.5-1.5-1.5-2.5-3-3a4 4 0 1 1 1-10Z",
  soja: "M5 19c1-6 5-11 14-14-1 8-6 13-14 14Zm4-4a1.5 1.5 0 1 0 0-.1Zm4-4a1.5 1.5 0 1 0 0-.1Z",
  lacteos: "M8 3h8M9 3v3l-3 4v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10l-3-4V3M6 13h12",
  frutos_cascara: "M5 10c0-3 3-5 7-5s7 2 7 5H5Zm1 0c0 6 3 10 6 10s6-4 6-10M12 5V3",
  apio: "M8 21c0-6-1-11-3-15m7 15V5m4 16c0-6 1-11 3-15M10 4l2-1 2 1",
  mostaza: "M9 3h6v3H9zM8 6h8l1 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9l1-3Zm2 7h4",
  sesamo: "M8 8c1-2 3-2 3 0s-2 3-3 1Zm5 1c1-2 3-2 3 0s-2 3-3 1Zm-6 6c1-2 3-2 3 0s-2 3-3 1Zm6 1c1-2 3-2 3 0s-2 3-3 1Z",
  sulfitos: "M8 3h8l-1 7a3 3 0 0 1-6 0L8 3Zm4 10v7m-4 0h8M9 7h6",
  altramuces: "M12 21V11m0 0c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Zm0-5V3",
  moluscos: "M4 14c0-5 3.5-9 8-9s8 4 8 9H4Zm0 0 2 4h12l2-4M12 5v9M8 6.5 9.5 14M16 6.5 14.5 14",
};

export function AllergenIcon({ alergeno, className = "h-4 w-4" }: { alergeno: AlergenoKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={GLYPHS[alergeno]} />
    </svg>
  );
}
