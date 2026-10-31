import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { LLEGA_PRONTO } from "@/lib/lanzamiento";

/**
 * «Muy pronto»: lo que aún no se puede hacer desde la web (reservar, pedir para
 * llevar…), dicho con claridad y con la alternativa a mano (`children`).
 */
export function Proximamente({ titulo, texto, primero, children }: { titulo: string; texto: string; primero?: (typeof LLEGA_PRONTO)[number]["titulo"]; children?: ReactNode }) {
  const items = primero ? [...LLEGA_PRONTO.filter((x) => x.titulo === primero), ...LLEGA_PRONTO.filter((x) => x.titulo !== primero)] : LLEGA_PRONTO;
  return (
    <section aria-labelledby="proximamente-title" className="relative overflow-hidden rounded-3xl bg-noche text-crema shadow-lift">
      {/* Halo de neón, como el rótulo del local de noche. */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-neon-deep/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-brasa/25 blur-3xl" />
      <div className="relative px-6 py-9 sm:px-10 sm:py-12">
        <p className="inline-flex items-center gap-2 rounded-full bg-neon/15 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-neon">
          <span className="h-1.5 w-1.5 rounded-full bg-neon motion-safe:animate-pulse" />
          Muy pronto
        </p>
        <h2 id="proximamente-title" className="mt-5 max-w-xl font-display text-[clamp(2rem,4.5vw,3.25rem)] font-light leading-[1.02] tracking-tight">
          {titulo}
        </h2>
        <p className="mt-4 max-w-lg text-crema/70">{texto}</p>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {items.map((x, i) => (
            <li key={x.titulo} className={`flex items-start gap-4 rounded-2xl p-4 ring-1 ${i === 0 && primero ? "bg-crema/[0.09] ring-neon/40" : "bg-crema/[0.04] ring-crema/10"}`}>
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-crema/10 text-neon">
                <Icon name={x.icono} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{x.titulo}</span>
                <span className="mt-0.5 block text-sm leading-snug text-crema/60">{x.texto}</span>
              </span>
            </li>
          ))}
        </ul>

        {children ? <div className="mt-8 border-t border-crema/10 pt-7">{children}</div> : null}
      </div>
    </section>
  );
}
