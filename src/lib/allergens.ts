// Los 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011, anexo II).
// En base de datos se guardan como text[] en restaurant.productos.alergenos con
// nombres en castellano (mismo formato que ya usa el schema compartido:
// "gluten", "crustáceos", "frutos de cáscara"…). Aquí se normalizan a una clave.

export const ALERGENOS = [
  { key: "gluten", label: "Gluten", detail: "Cereales con gluten (trigo, centeno, cebada, avena…)" },
  { key: "crustaceos", label: "Crustáceos", detail: "Crustáceos y productos a base de crustáceos" },
  { key: "huevo", label: "Huevo", detail: "Huevos y productos a base de huevo" },
  { key: "pescado", label: "Pescado", detail: "Pescado y productos a base de pescado" },
  { key: "cacahuetes", label: "Cacahuetes", detail: "Cacahuetes y productos a base de cacahuetes" },
  { key: "soja", label: "Soja", detail: "Soja y productos a base de soja" },
  { key: "lacteos", label: "Lácteos", detail: "Leche y sus derivados (incluida la lactosa)" },
  { key: "frutos_cascara", label: "Frutos de cáscara", detail: "Almendras, avellanas, nueces, anacardos, pistachos…" },
  { key: "apio", label: "Apio", detail: "Apio y productos derivados" },
  { key: "mostaza", label: "Mostaza", detail: "Mostaza y productos derivados" },
  { key: "sesamo", label: "Sésamo", detail: "Granos de sésamo y productos a base de sésamo" },
  { key: "sulfitos", label: "Sulfitos", detail: "Dióxido de azufre y sulfitos (> 10 mg/kg o 10 mg/l)" },
  { key: "altramuces", label: "Altramuces", detail: "Altramuces y productos a base de altramuces" },
  { key: "moluscos", label: "Moluscos", detail: "Moluscos y productos a base de moluscos" },
] as const;

export type AlergenoKey = (typeof ALERGENOS)[number]["key"];
export type Alergeno = (typeof ALERGENOS)[number];

const SINONIMOS: Record<string, AlergenoKey> = {
  gluten: "gluten",
  cereales: "gluten",
  crustaceos: "crustaceos",
  crustaceo: "crustaceos",
  huevo: "huevo",
  huevos: "huevo",
  pescado: "pescado",
  cacahuete: "cacahuetes",
  cacahuetes: "cacahuetes",
  soja: "soja",
  lacteos: "lacteos",
  lacteo: "lacteos",
  leche: "lacteos",
  lactosa: "lacteos",
  "frutos de cascara": "frutos_cascara",
  "frutos secos": "frutos_cascara",
  frutos_cascara: "frutos_cascara",
  apio: "apio",
  mostaza: "mostaza",
  sesamo: "sesamo",
  sulfitos: "sulfitos",
  "dioxido de azufre y sulfitos": "sulfitos",
  altramuces: "altramuces",
  altramuz: "altramuces",
  moluscos: "moluscos",
  molusco: "moluscos",
};

function sinAcentos(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizarAlergeno(valor: string): AlergenoKey | null {
  return SINONIMOS[sinAcentos(valor)] ?? null;
}

export function getAlergeno(key: AlergenoKey): Alergeno {
  return ALERGENOS.find((a) => a.key === key)!;
}

/** Convierte el text[] de base de datos en claves únicas y ordenadas según el anexo II. */
export function normalizarAlergenos(valores: readonly string[]): AlergenoKey[] {
  const claves = new Set(valores.map(normalizarAlergeno).filter((k): k is AlergenoKey => k !== null));
  return ALERGENOS.map((a) => a.key).filter((k) => claves.has(k));
}
