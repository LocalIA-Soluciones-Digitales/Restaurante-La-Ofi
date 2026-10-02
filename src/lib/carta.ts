import { normalizarAlergenos, type AlergenoKey } from "@/lib/allergens";
import type {
  CartaItem,
  CartaProducto,
  CartaSeccion,
  Etiqueta,
  Fuente,
  MomentoCarta,
  Nutricion,
} from "@/lib/restaurant/types";

// Lógica pura de la carta interactiva (filtros, macros, precios con
// modificadores). Sin React: se prueba con Vitest (carta.test.ts).

/** Valores por defecto de un plato: lo que no se sabe queda vacío, nunca inventado. */
export function cartaItem(base: Pick<CartaItem, "id" | "nombre" | "fuente"> & Partial<CartaItem>): CartaItem {
  const imagenes = base.imagenes ?? (base.imagen ? [base.imagen] : []);
  return {
    descripcion: null,
    precioCentimos: null,
    video: null,
    alergenos: [],
    alergenosConfirmados: false,
    destacado: false,
    ingredientes: [],
    nutricion: null,
    etiquetas: [],
    momento: [],
    estacion: "cocina",
    maridaje: null,
    modificadores: [],
    ...base,
    imagen: base.imagen ?? imagenes[0] ?? null,
    imagenes,
  };
}

/** Fila de laofi_get_carta → vista. Compatible con la RPC antigua (sin campos extendidos). */
export function itemDesdeRpc(p: CartaProducto, fuente: Fuente = "supabase"): CartaItem {
  const urls = [...(p.imagen_url ? [p.imagen_url] : []), ...(p.imagenes ?? [])].filter((u, i, a) => a.indexOf(u) === i);
  const n = p.nutricion;
  const nutricion: Nutricion | null =
    n && (n.calorias !== null || n.proteinas_g !== null || n.carbohidratos_g !== null || n.grasas_g !== null)
      ? {
          calorias: n.calorias,
          proteinas: n.proteinas_g === null ? null : Number(n.proteinas_g),
          carbohidratos: n.carbohidratos_g === null ? null : Number(n.carbohidratos_g),
          grasas: n.grasas_g === null ? null : Number(n.grasas_g),
          fuente: n.fuente,
        }
      : null;
  return cartaItem({
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precioCentimos: p.precio_centimos,
    imagenes: urls.map((src) => ({ src, alt: p.nombre })),
    video: p.video_url ?? null,
    alergenos: p.alergenos,
    alergenosConfirmados: p.alergenos_confirmados ?? false,
    destacado: p.destacado,
    ingredientes: p.ingredientes ?? [],
    nutricion,
    etiquetas: p.etiquetas ?? [],
    momento: p.momento ?? [],
    estacion: p.estacion ?? "cocina",
    maridaje: p.maridaje ?? null,
    modificadores: p.modificadores ?? [],
    fuente,
  });
}

export const ETIQUETAS: Record<Etiqueta, string> = {
  casero: "Casero",
  temporada: "De temporada",
  brasa: "A la brasa",
  recomendado: "Recomendado",
  vegetariano: "Vegetariano",
  vegano: "Vegano",
  sin_gluten: "Sin gluten",
  para_picar: "Para picar",
  picante: "Picante",
  nuevo: "Nuevo",
};

// --- Filtros -------------------------------------------------------------------

export type FiltroRapido = "vegetariano" | "sin_gluten" | "para_picar" | "brasa";

export const FILTROS_RAPIDOS: { key: FiltroRapido; label: string }[] = [
  { key: "vegetariano", label: "Vegetariano" },
  { key: "sin_gluten", label: "Sin gluten" },
  { key: "para_picar", label: "Para picar" },
  { key: "brasa", label: "A la brasa" },
];

export const MOMENTOS: { key: MomentoCarta; label: string }[] = [
  { key: "desayuno", label: "Desayuno" },
  { key: "mediodia", label: "Mediodía" },
  { key: "tarde", label: "Tarde" },
];

export interface FiltrosCarta {
  texto: string;
  momento: MomentoCarta | null;
  rapidos: ReadonlySet<FiltroRapido>;
  sinAlergenos: ReadonlySet<AlergenoKey>;
}

export const SIN_FILTROS: FiltrosCarta = { texto: "", momento: null, rapidos: new Set(), sinAlergenos: new Set() };

function sinAcentos(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function tiene(item: CartaItem, e: Etiqueta) {
  return item.etiquetas.includes(e);
}

/** ¿Se puede afirmar que el plato no lleva gluten? Solo con alérgenos confirmados. */
export function esSinGluten(item: CartaItem): boolean {
  if (tiene(item, "sin_gluten")) return true;
  return item.alergenosConfirmados && !normalizarAlergenos(item.alergenos).includes("gluten");
}

export type MotivoOculto = "alergenos_sin_confirmar";

/**
 * Aplica los filtros. Devuelve también cuántos platos se han ocultado SOLO porque
 * sus alérgenos no están confirmados: excluir un alérgeno es una cuestión de
 * seguridad y un plato sin confirmar nunca se presenta como seguro.
 */
export function filtrarCarta(secciones: CartaSeccion[], f: FiltrosCarta): { secciones: CartaSeccion[]; ocultosSinConfirmar: number } {
  const q = sinAcentos(f.texto.trim());
  const excluye = f.sinAlergenos.size > 0;
  let ocultosSinConfirmar = 0;

  const resultado = secciones.map((s) => ({
    ...s,
    items: s.items.filter((item) => {
      if (q) {
        const texto = sinAcentos([item.nombre, item.descripcion ?? "", ...item.ingredientes].join(" "));
        if (!texto.includes(q)) return false;
      }
      if (f.momento && item.momento.length > 0 && !item.momento.includes(f.momento)) return false;
      for (const r of f.rapidos) {
        if (r === "vegetariano" && !(tiene(item, "vegetariano") || tiene(item, "vegano"))) return false;
        if (r === "sin_gluten" && !esSinGluten(item)) return false;
        if (r === "para_picar" && !tiene(item, "para_picar")) return false;
        if (r === "brasa" && !tiene(item, "brasa")) return false;
      }
      if (excluye) {
        if (!item.alergenosConfirmados) {
          ocultosSinConfirmar++;
          return false;
        }
        if (normalizarAlergenos(item.alergenos).some((k) => f.sinAlergenos.has(k))) return false;
      }
      return true;
    }),
  }));
  return { secciones: resultado, ocultosSinConfirmar };
}

export function hayFiltros(f: FiltrosCarta): boolean {
  return f.texto.trim() !== "" || f.momento !== null || f.rapidos.size > 0 || f.sinAlergenos.size > 0;
}

// --- Macros ----------------------------------------------------------------------

export interface MacroSegmento {
  key: "proteinas" | "carbohidratos" | "grasas";
  label: string;
  gramos: number;
  /** % de las kcal de macros (enteros que suman 100). */
  pct: number;
}

/** Reparto de kcal por macro (4/4/9 kcal por gramo), redondeo que suma 100. Vacío si falta algún dato. */
export function repartoMacros(n: Nutricion | null): MacroSegmento[] {
  if (!n || n.proteinas === null || n.carbohidratos === null || n.grasas === null) return [];
  const base = [
    { key: "proteinas" as const, label: "Proteínas", gramos: n.proteinas, kcal: n.proteinas * 4 },
    { key: "carbohidratos" as const, label: "Carbohidratos", gramos: n.carbohidratos, kcal: n.carbohidratos * 4 },
    { key: "grasas" as const, label: "Grasas", gramos: n.grasas, kcal: n.grasas * 9 },
  ];
  const total = base.reduce((a, b) => a + b.kcal, 0);
  if (total <= 0) return [];
  const exactos = base.map((b) => ({ ...b, exacto: (b.kcal / total) * 100 }));
  const enteros = exactos.map((b) => ({ ...b, pct: Math.floor(b.exacto) }));
  let resto = 100 - enteros.reduce((a, b) => a + b.pct, 0);
  [...enteros]
    .sort((a, b) => (b.exacto % 1) - (a.exacto % 1))
    .forEach((b) => {
      if (resto > 0) {
        b.pct += 1;
        resto -= 1;
      }
    });
  return enteros.map(({ key, label, gramos, pct }) => ({ key, label, gramos, pct }));
}

// --- Modificadores y precio de línea ---------------------------------------------

export interface SeleccionModificador {
  modificadorId: string;
  opcionIds: string[];
}

/** Errores de validación de la selección (obligatorios sin elegir, demasiadas opciones…). */
export function validarSeleccion(item: CartaItem, seleccion: SeleccionModificador[]): string[] {
  const errores: string[] = [];
  for (const m of item.modificadores) {
    const elegidas = seleccion.find((s) => s.modificadorId === m.id)?.opcionIds ?? [];
    if (m.obligatorio && elegidas.length === 0) errores.push(`Elige ${m.nombre.toLowerCase()}`);
    if (m.tipo === "unico" && elegidas.length > 1) errores.push(`Solo una opción en ${m.nombre.toLowerCase()}`);
    if (m.max_opciones && elegidas.length > m.max_opciones) errores.push(`Máximo ${m.max_opciones} en ${m.nombre.toLowerCase()}`);
  }
  return errores;
}

/** Precio unitario con suplementos. null si el plato no tiene precio publicado. */
export function precioConModificadores(item: CartaItem, seleccion: SeleccionModificador[]): number | null {
  if (item.precioCentimos === null) return null;
  let extra = 0;
  for (const s of seleccion) {
    const m = item.modificadores.find((x) => x.id === s.modificadorId);
    for (const id of s.opcionIds) extra += m?.opciones.find((o) => o.id === id)?.precio_extra_centimos ?? 0;
  }
  return item.precioCentimos + extra;
}

/** Texto corto para la comanda y el carrito: "Punto: al punto · Sin cebolla". */
export function resumenModificadores(item: CartaItem, seleccion: SeleccionModificador[]): string {
  return seleccion
    .map((s) => {
      const m = item.modificadores.find((x) => x.id === s.modificadorId);
      if (!m || s.opcionIds.length === 0) return null;
      const nombres = s.opcionIds.map((id) => m.opciones.find((o) => o.id === id)?.nombre).filter(Boolean);
      return `${m.nombre}: ${nombres.join(", ").toLowerCase()}`;
    })
    .filter(Boolean)
    .join(" · ");
}
