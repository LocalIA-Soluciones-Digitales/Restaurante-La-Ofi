import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

// Piezas comunes del panel: tarjetas, cifras, modal accesible, campos y botones
// táctiles (mínimo 44 px), con variantes de modo oscuro.

export const card = "rounded-[1.25rem] border border-carbon/[0.08] bg-white shadow-card dark:border-crema/10 dark:bg-noche-2";
export const input =
  "h-11 w-full rounded-xl border border-carbon/15 bg-white px-3 text-base text-carbon focus:border-marino focus:outline-none dark:border-crema/15 dark:bg-noche-3 dark:text-crema dark:focus:border-neon";
export const boton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[background-color,transform] active:scale-[0.97] disabled:opacity-50";
export const botonPrimario = `${boton} bg-marino text-crema hover:bg-marino-700 dark:bg-neon dark:text-noche dark:hover:bg-neon-soft`;
export const botonSecundario = `${boton} border border-carbon/15 bg-white text-carbon hover:bg-arena dark:border-crema/15 dark:bg-noche-3 dark:text-crema dark:hover:bg-noche-2`;
export const botonPeligro = `${boton} bg-terracota text-crema hover:brightness-110`;

export function Cabecera({ titulo, texto, children }: { titulo: string; texto?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl">{titulo}</h1>
        {texto ? <p className="mt-1 max-w-2xl text-sm text-carbon-muted dark:text-crema/65">{texto}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

export function Cifra({ label, valor, icon, tono = "neutro" }: { label: string; valor: ReactNode; icon: IconName; tono?: "neutro" | "ok" | "aviso" }) {
  const color =
    tono === "ok"
      ? "bg-oliva-soft text-oliva dark:bg-oliva/25 dark:text-oliva-soft"
      : tono === "aviso"
        ? "bg-terracota-soft text-terracota dark:bg-terracota/25 dark:text-terracota-soft"
        : "bg-marino/[0.08] text-marino dark:bg-neon/15 dark:text-neon";
  return (
    <div className={`${card} p-5 transition-shadow hover:shadow-lift`}>
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-carbon-muted dark:text-crema/65">
        {label}
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${color}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl tabular-nums tracking-tight">{valor}</p>
    </div>
  );
}

export function Campo({ label, children, ayuda }: { label: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-semibold">{label}</span>
      {children}
      {ayuda ? <span className="text-xs text-carbon-muted dark:text-crema/55">{ayuda}</span> : null}
    </label>
  );
}

export function Aviso({ children, tono = "error" }: { children: ReactNode; tono?: "error" | "ok" | "info" }) {
  const c =
    tono === "ok"
      ? "bg-oliva-soft text-oliva"
      : tono === "info"
        ? "bg-arena text-carbon dark:bg-noche-3 dark:text-crema"
        : "bg-terracota-soft text-terracota";
  return (
    <p role={tono === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm font-semibold ${c}`}>
      {children}
    </p>
  );
}

/** Euros (texto) ↔ céntimos. Acepta "12,5", "12.50", "12". */
export function aCentimos(texto: string): number | null {
  const limpio = texto.replace(/\s|€/g, "").replace(",", ".");
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

export function aEuros(centimos: number | null | undefined): string {
  return centimos === null || centimos === undefined ? "" : (centimos / 100).toFixed(2).replace(".", ",");
}

/** Primer error de varias acciones del panel (para páginas que cargan varias cosas a la vez). */
export function primerError(...resultados: ({ ok: true } | { ok: false; error: string })[]): string | null {
  for (const r of resultados) if (!r.ok) return r.error;
  return null;
}
