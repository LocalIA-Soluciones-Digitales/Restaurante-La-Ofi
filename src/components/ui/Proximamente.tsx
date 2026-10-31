import type { ReactNode } from "react";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import type { ImageKey } from "@/lib/images";
import { LLEGA_PRONTO } from "@/lib/lanzamiento";

/**
 * «Muy pronto»: lo que aún no se puede hacer desde la web (reservar, pedir para
 * llevar…), dicho con claridad y con la alternativa a mano (`children`). Mismo
 * papel, filetes y acento brasa que el formulario de reserva.
 */
export function Proximamente({
  titulo,
  texto,
  foto,
  primero,
  children,
}: {
  titulo: string;
  texto: string;
  foto: ImageKey;
  primero?: (typeof LLEGA_PRONTO)[number]["titulo"];
  children?: ReactNode;
}) {
  const items = primero ? [...LLEGA_PRONTO.filter((x) => x.titulo === primero), ...LLEGA_PRONTO.filter((x) => x.titulo !== primero)] : LLEGA_PRONTO;
  return (
    <section aria-labelledby="proximamente-title" className="overflow-hidden rounded-3xl bg-[#FFFDF8] shadow-card ring-1 ring-tinta-line">
      <div className="relative aspect-[16/7] overflow-hidden bg-papel-3">
        <Photo img={foto} sizes="(min-width: 1024px) 60vw, 100vw" decorative mobileBelow={0} />
        <p className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-[#FFFDF8]/95 px-3.5 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-brasa shadow-card sm:left-8 sm:top-7">
          <span className="h-1.5 w-1.5 rounded-full bg-brasa" />
          Muy pronto
        </p>
      </div>
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <h2 id="proximamente-title" className="max-w-xl font-display text-[clamp(2rem,4vw,3rem)] leading-[1.04] text-carbon">
          {titulo}
        </h2>
        <p className="mt-4 max-w-lg text-carbon-muted">{texto}</p>

        <ul className="mt-8 divide-y divide-tinta-line border-y border-tinta-line">
          {items.map((x, i) => {
            const destacado = i === 0 && Boolean(primero);
            return (
              <li key={x.titulo} className="flex items-center gap-4 py-4">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${destacado ? "bg-brasa text-crema" : "bg-papel-2 text-brasa"}`}>
                  <Icon name={x.icono} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl leading-tight text-carbon">{x.titulo}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-carbon-muted">{x.texto}</span>
                </span>
                <span
                  className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] sm:inline ${destacado ? "bg-brasa-soft text-brasa" : "border border-carbon/15 text-carbon-muted"}`}
                >
                  Pronto
                </span>
              </li>
            );
          })}
        </ul>

        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
