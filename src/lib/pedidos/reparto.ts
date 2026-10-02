/** Reparto de una línea entre quien la pide y con quien la comparte, al céntimo. */
export function repartirLinea(totalCentimos: number, participantes: string[]): { participante_id: string; importe_centimos: number }[] {
  const n = participantes.length;
  const base = Math.floor(totalCentimos / n);
  const resto = totalCentimos - base * n;
  return participantes.map((p, i) => ({ participante_id: p, importe_centimos: base + (i < resto ? 1 : 0) }));
}
