import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { href, type Locale } from "@/lib/i18n";
import { creditoFoto, IMAGES, type ImageKey } from "@/lib/images";

interface Puerta {
  img: ImageKey;
  kicker: string;
  titulo: string;
  texto: string;
  cta: string;
  href: string;
}

/**
 * Dos puertas a pantalla completa, una junto a otra: empresas del Parque y
 * celebraciones. Cada mitad es un enlace entero; el detalle vive en su página.
 * En móvil van una sobre otra como un solo bloque (solo un filete entre ellas):
 * arriba se funden desde el crema de los platos y abajo al de "Cómo llegar".
 */
export function EmpresasHome({ locale }: { locale: Locale }) {
  const puertas: Puerta[] = [
    {
      img: "despacho",
      kicker: "Empresas del Parque",
      titulo: "El Despacho",
      texto: "Comidas de trabajo con reserva, pedidos de grupo y factura a nombre de tu empresa.",
      cta: "Comidas de empresa",
      href: href(locale, "/grupos#empresas"),
    },
    {
      img: "salonNoche",
      kicker: "Eventos",
      titulo: "Celebraciones",
      texto: "Comidas de empresa, bautizos, comuniones o postbodas, con menú concertado.",
      cta: "Eventos y celebraciones",
      href: href(locale, "/grupos#celebraciones"),
    },
  ];

  return (
    <section aria-label="Empresas y celebraciones" className="cv-auto grid bg-noche md:grid-cols-2">
      {puertas.map((p, i) => {
        const primera = i === 0;
        const ultima = i === puertas.length - 1;
        const credito = creditoFoto(IMAGES[p.img]);
        return (
          <Link
            key={p.href}
            href={p.href}
            className="group relative isolate flex min-h-[62svh] flex-col items-center justify-center overflow-hidden px-8 py-24 text-center text-crema md:min-h-[88svh]"
          >
            <div className="parallax absolute inset-0 -z-10 transition-transform duration-[1.6s] ease-out-expo group-hover:scale-[1.04]">
              <Photo img={p.img} sizes="(min-width: 768px) 50vw, 100vw" decorative />
            </div>
            <span aria-hidden="true" className="absolute inset-0 -z-10 bg-noche/50 transition-colors duration-500 group-hover:bg-noche/35" />
            <p className="kicker text-crema/80">{p.kicker}</p>
            <h2 className="mt-4 font-display text-[clamp(2.4rem,1.6rem+3vw,4.5rem)] font-light leading-none tracking-[-0.02em]">{p.titulo}</h2>
            <p className="mt-5 max-w-sm text-[0.98rem] leading-relaxed text-crema/80">{p.texto}</p>
            <span className="btn-line mt-8 text-crema group-hover:[&>span:last-child]:bg-crema group-hover:[&>span:last-child]:text-carbon">
              <span>{p.cta}</span>
              <span aria-hidden="true">→</span>
            </span>
            {credito ? <span className="absolute right-4 top-3 text-[0.64rem] text-crema/60">{credito}</span> : null}
            {/* Entrada desde el crema de la sección de arriba. En móvil solo la
                primera: la segunda empieza pegada a ella. */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-t from-noche/0 to-crema md:block md:h-40 ${primera ? "" : "hidden"}`}
            />
            {/* Fundido al color de "Cómo llegar", que entra justo debajo. En móvil
                solo la última: entre las dos no hay nada que fundir. */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-noche/0 to-papel-2 md:block md:h-40 ${ultima ? "" : "hidden"}`}
            />
            {ultima ? null : <span aria-hidden="true" className="absolute inset-x-8 bottom-0 h-px bg-crema/25 md:hidden" />}
          </Link>
        );
      })}
    </section>
  );
}
