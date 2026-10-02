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

/**
 * Puestos (sillas) alrededor de una mesa, en las mismas unidades que `ancho` y
 * `fondo` (el plano 2D usa el viewBox y el 3D metros de escena). `rot` es el
 * ángulo en radianes hacia el que mira el respaldo (fuera de la mesa).
 */
export function puestosMesa(forma: MesaSalon["forma"], capacidad: number, ancho: number, fondo: number, separacion: number) {
  const n = Math.min(capacidad, 12);
  const out: { x: number; y: number; rot: number }[] = [];
  if (forma === "rectangular") {
    const arriba = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const lado = i < arriba ? -1 : 1;
      const k = i < arriba ? i : i - arriba;
      const total = i < arriba ? arriba : n - arriba;
      out.push({ x: -ancho / 2 + (ancho * (k + 0.5)) / total, y: lado * (fondo / 2 + separacion), rot: lado === -1 ? -Math.PI / 2 : Math.PI / 2 });
    }
    return out;
  }
  // Cuadrada: una silla en el centro de cada lado; redonda y taburetes, en círculo.
  const r = Math.max(ancho, fondo) / 2 + separacion;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    out.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, rot: a });
  }
  return out;
}

export function minutosDesde(iso: string | null, ahora = Date.now()): number | null {
  return iso ? Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000)) : null;
}
