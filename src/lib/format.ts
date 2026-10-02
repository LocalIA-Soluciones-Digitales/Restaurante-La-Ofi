export function formatCentimos(centimos: number): string {
  return `${(centimos / 100).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

/** Normaliza un teléfono español a 9 dígitos (quita espacios, guiones y prefijo +34/0034). */
export function normalizarTelefono(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length > 9 && digitos.startsWith("34") ? digitos.slice(digitos.length - 9) : digitos;
}

/** "946366479" → "946 36 64 79" (agrupación 3-2-2-2 habitual en España). */
export function formatearTelefono(digitos: string): string {
  if (digitos.length !== 9) return digitos;
  return `${digitos.slice(0, 3)} ${digitos.slice(3, 5)} ${digitos.slice(5, 7)} ${digitos.slice(7)}`;
}

const DIA_SEMANA = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Madrid",
});

const FECHA_CORTA = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});

/** "2026-10-01" → "jueves, 1 de octubre". La fecha se interpreta como día civil. */
export function formatearFechaLarga(fechaISO: string): string {
  return DIA_SEMANA.format(new Date(`${fechaISO}T12:00:00Z`));
}

export function formatearFechaCorta(fechaISO: string): { dia: string; mes: string } {
  const partes = FECHA_CORTA.formatToParts(new Date(`${fechaISO}T12:00:00Z`));
  return {
    dia: partes.find((p) => p.type === "day")?.value ?? "",
    mes: (partes.find((p) => p.type === "month")?.value ?? "").replace(".", ""),
  };
}

/** Fecha de hoy (YYYY-MM-DD) en horario peninsular, independiente del huso del servidor. */
export function hoyEnMadrid(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** "hoy a las 10:12" / "el 30 sept a las 18:40" para una marca de tiempo ISO. */
export function formatearHoraActualizacion(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  const hora = HORA.format(fecha);
  if (hoyEnMadrid(fecha) === hoyEnMadrid(ahora)) return `hoy a las ${hora}`;
  const { dia, mes } = formatearFechaCorta(hoyEnMadrid(fecha));
  return `el ${dia} ${mes} a las ${hora}`;
}
