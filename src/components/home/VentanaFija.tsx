import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { href, type Locale } from "@/lib/i18n";

/**
 * Foto a pantalla completa que se queda fija mientras el texto pasa por encima
 * (como Restaurant GEM): la foto va en un contenedor `sticky` a toda altura y el
 * bloque de texto sube sobre ella. Sin JavaScript; con "reducir movimiento" es
 * igual (no hay animación, solo scroll normal).
 */
export function VentanaFija({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="ventana-title" className="relative bg-noche">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="fog-in absolute inset-0">
          <Photo img="barraMesasAltas" sizes="100vw" mobileBelow={768} decorative />
        </div>
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-noche/80 via-noche/35 to-noche/10" />
      </div>

      {/* El texto sube sobre la foto fija: empieza una pantalla más abajo. */}
      <div className="relative -mt-[100svh] flex min-h-[170svh] items-end pb-[18svh]">
        <div className="container-wide text-crema">
          <p className="kicker text-ratan">La barra</p>
          <h2 id="ventana-title" className="mt-5 max-w-[11em] font-display text-[clamp(2.4rem,1.2rem+4.4vw,5.6rem)] font-light leading-[1.02] tracking-[-0.025em]">
            Café a las 7:30. <em className="text-ratan">Copa el viernes.</em>
          </h2>
          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-crema/80">
            Mesas altas, bombillas colgadas de cuerda y el jardín vertical: el sitio para quedar antes, durante y después de la oficina.
          </p>
          <Link href={href(locale, "/espacios")} className="btn-line mt-9 text-crema">
            <span>Ver los espacios</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
