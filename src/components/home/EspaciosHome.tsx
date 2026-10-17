import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { Wordmark } from "@/components/ui/Wordmark";
import { href, type Locale } from "@/lib/i18n";
import { creditoFoto, IMAGES, type ImageKey } from "@/lib/images";

interface Espacio {
  img: ImageKey;
  nombre: string;
  texto: string;
  /** Posición en la rejilla asimétrica de escritorio y proporción de la foto. */
  grid: string;
  aspect: string;
  sizes: string;
}

// Fotos del fotógrafo (2026-10-17). Datos de aforo publicados (Deia 09/2025, AVDG 03/2025).
const ESPACIOS: Espacio[] = [
  {
    img: "comedorPanoramica",
    nombre: "El comedor",
    texto: "Lámparas de ratán, baldosa hexagonal y ventanales. Unos 70 comensales.",
    grid: "lg:col-span-7",
    aspect: "aspect-[4/3] lg:aspect-[6/5]",
    sizes: "(min-width: 1024px) 56vw, 100vw",
  },
  {
    img: "despacho",
    nombre: "El Despacho",
    texto: "Comedor privado para comidas de trabajo, con reserva previa.",
    grid: "lg:col-span-5 lg:mt-40",
    aspect: "aspect-[4/3]",
    sizes: "(min-width: 1024px) 40vw, 100vw",
  },
  {
    img: "barraMesasAltas",
    nombre: "La barra",
    texto: "Café, tostadas y pintxos desde primera hora.",
    grid: "lg:col-span-4 lg:col-start-2 lg:mt-20",
    aspect: "aspect-[4/5]",
    sizes: "(min-width: 1024px) 32vw, 100vw",
  },
  {
    img: "terraza",
    nombre: "La terraza",
    texto: "Cubierta, con césped y sofás. Hasta 220 personas sentadas.",
    grid: "lg:col-span-6 lg:col-start-7 lg:mt-24",
    aspect: "aspect-[4/3]",
    sizes: "(min-width: 1024px) 48vw, 100vw",
  },
];

/**
 * El local, en fotos: titular centrado en versalitas, el rótulo "la ofi" enorme y
 * tenue de fondo y una rejilla asimétrica (fotos de tamaños y alturas distintas),
 * no cuatro tarjetas iguales.
 */
export function EspaciosHome({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="espacios-title" className="cv-auto section relative overflow-hidden bg-crema">
      <div className="container-wide">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="espacios-title" className="t-caps text-carbon">
            Ratán, madera y luz natural. Un sitio para quedarse.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-[1.02rem] leading-relaxed text-carbon-muted">
            Desayunar en la barra, comer en el comedor, reunirse en El Despacho o alargar la tarde en la terraza: cuatro
            espacios dentro del mismo edificio del Parque.
          </p>
          <Link href={href(locale, "/espacios")} className="btn-line mt-8 text-carbon">
            <span>Ver los espacios</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="relative mt-16 lg:mt-24">
          <Wordmark
            strokeWidth={2.2}
            className="pointer-events-none absolute -top-10 left-1/2 hidden h-auto w-[115%] max-w-none -translate-x-1/2 text-carbon/[0.07] lg:block"
          />
          <div className="relative grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-y-0">
            {ESPACIOS.map((e) => {
              const credito = creditoFoto(IMAGES[e.img]);
              return (
                <figure key={e.img} className={e.grid}>
                  <div className={`reveal-photo photo-hover relative overflow-hidden bg-papel-3 ${e.aspect}`}>
                    <Photo img={e.img} sizes={e.sizes} mobileBelow={0} />
                  </div>
                  <figcaption className="mt-4 flex items-baseline justify-between gap-4 border-t border-tinta-line pt-3">
                    <span>
                      <span className="block font-display text-xl text-carbon">{e.nombre}</span>
                      <span className="mt-0.5 block text-sm text-carbon-muted">{e.texto}</span>
                    </span>
                    {credito ? <span className="hidden shrink-0 text-[0.66rem] text-carbon-muted sm:block">{credito}</span> : null}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
