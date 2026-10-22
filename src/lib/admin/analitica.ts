// Analítica de ventas para el panel: estadística descriptiva, comparación entre
// periodos, previsión por día de la semana y análisis ABC (Pareto) de la carta.
// Funciones puras (sin red ni fechas implícitas) para poder probarlas.

export interface PuntoDia {
  fecha: string; // YYYY-MM-DD
  ventas: number; // céntimos
  pedidos: number;
}

export const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
export const nombreDia = (d: number): string => DIAS_SEMANA[d] ?? "";

/** Suma n días a una fecha YYYY-MM-DD (al mediodía UTC: sin saltos por horario de verano). */
export function sumarDias(f: string, n: number): string {
  const d = new Date(`${f}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / 86_400_000);
}

export function diaSemana(f: string): number {
  return new Date(`${f}T12:00:00Z`).getUTCDay();
}

/** Serie continua de desde a hasta (ambos incluidos), con ceros en los días sin ventas. */
export function serieDiaria(datos: { fecha: string; ventas_centimos: number; pedidos: number }[], desde: string, hasta: string): PuntoDia[] {
  const m = new Map(datos.map((d) => [d.fecha.slice(0, 10), d]));
  const out: PuntoDia[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    const d = m.get(f);
    out.push({ fecha: f, ventas: d?.ventas_centimos ?? 0, pedidos: d?.pedidos ?? 0 });
  }
  return out;
}

/** Variación relativa (0,12 = +12 %). null si no hay base con la que comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null;
  return (actual - anterior) / anterior;
}

export interface Estadisticas {
  n: number;
  media: number;
  mediana: number;
  desviacion: number;
  /** Coeficiente de variación: desviación / media. Cuanto más bajo, más estable. */
  cv: number;
  min: number;
  max: number;
}

export function estadisticas(valores: number[]): Estadisticas {
  const n = valores.length;
  if (!n) return { n: 0, media: 0, mediana: 0, desviacion: 0, cv: 0, min: 0, max: 0 };
  const orden = [...valores].sort((a, b) => a - b);
  const media = valores.reduce((a, b) => a + b, 0) / n;
  const en = (i: number) => orden[i] ?? 0;
  const mediana = n % 2 ? en((n - 1) / 2) : (en(n / 2 - 1) + en(n / 2)) / 2;
  const desviacion = n > 1 ? Math.sqrt(valores.reduce((a, v) => a + (v - media) ** 2, 0) / (n - 1)) : 0;
  return { n, media, mediana, desviacion, cv: media ? desviacion / media : 0, min: en(0), max: en(n - 1) };
}

/** Recta de mínimos cuadrados sobre la serie: pendiente por día y R². */
export function tendencia(valores: number[]): { pendiente: number; r2: number } {
  const n = valores.length;
  if (n < 3) return { pendiente: 0, r2: 0 };
  const mx = (n - 1) / 2;
  const my = valores.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  valores.forEach((y, x) => {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  });
  const pendiente = sxx ? sxy / sxx : 0;
  return { pendiente, r2: sxx && syy ? (sxy * sxy) / (sxx * syy) : 0 };
}

export interface Prevision {
  fecha: string;
  esperado: number;
  bajo: number;
  alto: number;
  /** Probabilidad de que el día haya ventas (días cerrados = 0). */
  abierto: number;
}

/**
 * Previsión por estacionalidad semanal: para cada día de la semana, media
 * ponderada de las mismas semanas del histórico (las recientes pesan más, factor
 * 0,8 por semana) y banda de ±1 desviación. Los días que el local suele cerrar
 * (sin ventas en la mayoría de semanas) quedan en 0.
 */
export function prever(historia: PuntoDia[], fechas: string[], decaimiento = 0.8): Prevision[] {
  const ultimo = historia.at(-1)?.fecha;
  const porDia = new Map<number, { v: number; w: number }[]>();
  for (const p of historia) {
    const semanas = ultimo ? Math.floor(diasEntre(p.fecha, ultimo) / 7) : 0;
    const lista = porDia.get(diaSemana(p.fecha)) ?? [];
    lista.push({ v: p.ventas, w: decaimiento ** semanas });
    porDia.set(diaSemana(p.fecha), lista);
  }
  return fechas.map((fecha) => {
    const lista = porDia.get(diaSemana(fecha)) ?? [];
    const abiertos = lista.filter((x) => x.v > 0);
    const abierto = lista.length ? abiertos.length / lista.length : 0;
    if (!abiertos.length || abierto < 0.5) return { fecha, esperado: 0, bajo: 0, alto: 0, abierto };
    const w = abiertos.reduce((a, x) => a + x.w, 0);
    const media = abiertos.reduce((a, x) => a + x.v * x.w, 0) / w;
    const desv = Math.sqrt(abiertos.reduce((a, x) => a + x.w * (x.v - media) ** 2, 0) / w);
    return { fecha, esperado: Math.round(media), bajo: Math.max(0, Math.round(media - desv)), alto: Math.round(media + desv), abierto };
  });
}

export interface ClaseABC {
  nombre: string;
  cantidad: number;
  importe: number;
  cuota: number;
  acumulado: number;
  clase: "A" | "B" | "C";
}

/** Análisis ABC: A hasta el 80 % de la facturación acumulada, B hasta el 95 %, C el resto. */
export function abc(productos: { nombre: string; cantidad: number; importe_centimos: number }[]): ClaseABC[] {
  const total = productos.reduce((a, p) => a + p.importe_centimos, 0);
  let acumulado = 0;
  return [...productos]
    .sort((a, b) => b.importe_centimos - a.importe_centimos)
    .map((p) => {
      const previo = acumulado;
      const cuota = total ? p.importe_centimos / total : 0;
      acumulado += cuota;
      return {
        nombre: p.nombre,
        cantidad: p.cantidad,
        importe: p.importe_centimos,
        cuota,
        acumulado,
        clase: previo < 0.8 ? "A" : previo < 0.95 ? "B" : "C",
      };
    });
}

/** Proyección de cierre de mes: lo vendido hasta ayer + lo hecho hoy + la previsión del resto. */
export function proyeccionMes(historia: PuntoDia[], hoy: string): { mes: string; llevado: number; previsto: number; total: number; diasRestantes: number } {
  const mes = hoy.slice(0, 7);
  const llevado = historia.filter((p) => p.fecha.startsWith(mes) && p.fecha <= hoy).reduce((a, p) => a + p.ventas, 0);
  const fin = sumarDias(`${sumarDias(`${mes}-28`, 4).slice(0, 7)}-01`, -1);
  const resto: string[] = [];
  for (let f = sumarDias(hoy, 1); f <= fin; f = sumarDias(f, 1)) resto.push(f);
  const previsto = prever(historia.filter((p) => p.fecha < hoy), resto).reduce((a, p) => a + p.esperado, 0);
  return { mes, llevado, previsto, total: llevado + previsto, diasRestantes: resto.length };
}

export const pct = (x: number, decimales = 0) => `${(x * 100).toLocaleString("es-ES", { maximumFractionDigits: decimales, minimumFractionDigits: decimales })} %`;
export const signoPct = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${pct(Math.abs(x))}`;
