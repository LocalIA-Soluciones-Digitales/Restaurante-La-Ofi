/**
 * Logotipo tipográfico PROVISIONAL inspirado en el rótulo de neón "la ofi" del
 * local (minúsculas). Sustituir por el logo oficial en cuanto el propietario lo
 * facilite (CONTENT_NEEDED.md).
 */
export function Logo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span className={`inline-flex flex-col leading-none ${className}`}>
      <span className={`font-display text-[1.85rem] font-semibold lowercase tracking-tight ${light ? "text-crema" : "text-marino"}`}>
        la ofi
      </span>
      <span className={`mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.28em] ${light ? "text-crema/70" : "text-carbon-muted"}`}>
        Restaurante · Derio
      </span>
    </span>
  );
}
