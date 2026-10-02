// Exportación CSV (portado de Palomita): separador ";" y coma decimal, que es lo
// que abre bien Excel en castellano; BOM para que respete tildes y ñ.

export function aCsv(filas: Record<string, string | number | null | undefined>[]): string {
  if (filas.length === 0) return "";
  const columnas = Object.keys(filas[0]!);
  const celda = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "number" ? String(v).replace(".", ",") : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columnas.join(";"), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(";"))].join("\r\n");
}

export function descargarCsv(nombre: string, filas: Record<string, string | number | null | undefined>[]) {
  const blob = new Blob(["﻿", aCsv(filas)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
