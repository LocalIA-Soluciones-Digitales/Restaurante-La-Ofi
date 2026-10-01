import type { ReactNode } from "react";

/**
 * Marquesina infinita en CSS (se pausa al pasar el ratón y se detiene con
 * "reducir movimiento"). El contenido se duplica para el bucle; la copia es
 * aria-hidden para que los lectores de pantalla lo lean una sola vez.
 */
export function Marquee({ items, className = "", label }: { items: ReactNode[]; className?: string; label: string }) {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-10 pr-10 sm:gap-14 sm:pr-14">
      {items.map((item, i) => (
        <li key={i} className="flex shrink-0 items-center gap-10 sm:gap-14">
          {item}
          <span aria-hidden="true" className="text-neon-deep">
            ✦
          </span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`marquee relative flex overflow-hidden ${className}`} role="region" aria-label={label}>
      <div className="marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
