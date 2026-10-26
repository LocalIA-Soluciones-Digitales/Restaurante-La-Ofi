import type { ReactNode } from "react";
import { Photo } from "@/components/media/Photo";
import type { ImageKey } from "@/lib/images";

/**
 * Foto a pantalla completa que se queda fija mientras el texto pasa por encima
 * (como Restaurant GEM): la foto va en un contenedor `sticky` a toda altura y el
 * bloque de texto sube sobre ella. Sin JavaScript; con "reducir movimiento" es
 * igual (no hay animación, solo scroll normal).
 */
export function VentanaFija({
  id,
  img,
  kicker,
  title,
  lead,
  children,
}: {
  id: string;
  img: ImageKey;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Acciones bajo la entradilla. */
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="relative bg-noche">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="fog-in absolute inset-0">
          <Photo img={img} sizes="100vw" mobileBelow={768} decorative />
        </div>
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-noche/80 via-noche/35 to-noche/10" />
      </div>

      {/* El texto sube sobre la foto fija: empieza una pantalla más abajo. */}
      <div className="relative -mt-[100svh] flex min-h-[170svh] items-end pb-[18svh]">
        <div className="container-wide text-crema">
          <p className="kicker text-ratan">{kicker}</p>
          <h2 id={id} className="mt-5 max-w-[11em] font-display text-[clamp(2.4rem,1.2rem+4.4vw,5.6rem)] font-light leading-[1.02] tracking-[-0.025em]">
            {title}
          </h2>
          {lead ? <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-crema/80">{lead}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}
