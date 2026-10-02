import type { MesaSalon, Zona } from "@/lib/admin/types";

// Geometría del plano: zonas y mesas en % de un lienzo 100×100. Las mesas sin
// posición se colocan en rejilla dentro de su zona hasta que alguien las arrastre.

export interface PosMesa {
  x: number;
  y: number;
}

export function posicionesPorDefecto(zonas: Zona[], mesas: MesaSalon[]): Map<string, PosMesa> {
  const out = new Map<string, PosMesa>();
  const porZona = new Map<string | null, MesaSalon[]>();
  for (const m of mesas) {
    if (m.pos_x !== null && m.pos_y !== null) out.set(m.id, { x: Number(m.pos_x), y: Number(m.pos_y) });
    else porZona.set(m.zona_id, [...(porZona.get(m.zona_id) ?? []), m]);
  }
  for (const [zonaId, lista] of porZona) {
    const z = zonas.find((x) => x.id === zonaId) ?? { x: 2, y: 2, ancho: 96, alto: 96 };
    const cols = Math.max(1, Math.ceil(Math.sqrt(lista.length * (Number(z.ancho) / Number(z.alto)))));
    const filas = Math.ceil(lista.length / cols);
    lista.forEach((m, i) => {
      const c = i % cols;
      const f = Math.floor(i / cols);
      out.set(m.id, {
        x: Number(z.x) + (Number(z.ancho) * (c + 0.5)) / cols,
        y: Number(z.y) + (Number(z.alto) * (f + 0.5)) / filas,
      });
    });
  }
  return out;
}

/** Tamaño de la mesa en el lienzo (en unidades del viewBox 1000×620) según forma y capacidad. */
export function tamanoMesa(m: Pick<MesaSalon, "forma" | "capacidad">): { w: number; h: number } {
  const base = 26 + Math.min(m.capacidad, 12) * 4;
  if (m.forma === "taburete") return { w: 26, h: 26 };
  if (m.forma === "rectangular") return { w: base * 1.7, h: base * 0.85 };
  return { w: base, h: base };
}

export function minutosDesde(iso: string | null, ahora = Date.now()): number | null {
  return iso ? Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000)) : null;
}
