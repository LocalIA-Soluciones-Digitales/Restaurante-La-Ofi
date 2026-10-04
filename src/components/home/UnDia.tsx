import { Photo } from "@/components/media/Photo";
import { creditoFoto, IMAGES, type ImageKey } from "@/lib/images";

interface Paso {
  hora: string;
  titulo: string;
  texto: string;
  img: ImageKey;
}

// Solo lo verificable: apertura 7:30 L–V y viernes hasta 00:00 (horario publicado),
// tostadas 9:00–11:30 (carta de La Ofi en Instagram), plato del día L–V y brasa
// (Deia, 09/2025), tardeo mensual y terraza cubierta (Deia / Instagram).
const PASOS: Paso[] = [
  {
    hora: "7:30",
    titulo: "El primer café",
    texto: "Abrimos entre semana a las 7:30: café en barra antes de subir a la oficina.",
    img: "rotuloNeon",
  },
  {
    hora: "9:00",
    titulo: "Tostadas de masa madre",
    texto: "Ocho tostadas, de la clásica con tomate a la de burrata con melocotón, hasta las 11:30.",
    img: "tostadaBonita",
  },
  {
    hora: "Mediodía",
    titulo: "Plato del día y brasa",
    texto: "De lunes a viernes, plato del día casero a elegir. Y la parrilla: pescado según mercado, carne y verdura.",
    img: "comedorRatan",
  },
  {
    hora: "Viernes",
    titulo: "La tarde se alarga",
    texto: "Terraza cubierta, un tardeo al mes y, los viernes, abierto hasta medianoche.",
    img: "terrazaNoche",
  },
];

/** "Un día en La Ofi": el concepto de la marca contado con fotos reales y horas reales. */
export function UnDia() {
  return (
    <section aria-labelledby="dia-title" className="cv-auto section overflow-hidden bg-marino-900 text-crema">
      <div className="container-wide">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="kicker text-ratan">Un día en La Ofi</p>
            <h2 id="dia-title" className="t-h2 mt-3">
              Durante el día, el restaurante del Parque. <em className="text-ratan">Cuando acaba la oficina, empieza La Ofi.</em>
            </h2>
          </div>
          <p className="max-w-[26rem] text-[0.95rem] leading-relaxed text-crema/70 lg:col-span-4 lg:col-start-9 lg:pb-2">
            De lunes a viernes desde las 7:30, con cocina casera a mediodía. Los viernes, abierto hasta medianoche.
          </p>
        </div>

        <ol className="no-scrollbar -mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 xl:gap-8 lg:overflow-visible lg:px-0">
          {PASOS.map((p, i) => {
            const credito = creditoFoto(IMAGES[p.img]);
            return (
              <li key={p.hora} className="w-[74vw] max-w-[20rem] shrink-0 snap-start lg:w-auto lg:max-w-none">
                <div className="flex items-center gap-3 border-t border-crema/20 pt-4">
                  <span aria-hidden="true" className="text-xs tabular-nums text-crema/70">
                    0{i + 1}
                  </span>
                  <p className="font-display text-3xl tabular-nums text-crema">{p.hora}</p>
                </div>
                {/* Misma proporción en las cuatro y crédito dentro de la foto: fotos y
                    títulos quedan en la misma línea en toda la fila. */}
                <figure className="reveal-photo relative mt-5 aspect-[4/5] overflow-hidden bg-noche-3">
                  <Photo img={p.img} sizes="(min-width: 1024px) 22vw, 74vw" mobileBelow={0} />
                  {credito ? (
                    <>
                      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-noche/75 to-transparent" />
                      <figcaption className="absolute inset-x-3 bottom-2.5 text-[0.66rem] leading-snug text-crema/80">{credito}</figcaption>
                    </>
                  ) : null}
                </figure>
                <h3 className="t-h3 mt-6 text-crema">{p.titulo}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-crema/70">{p.texto}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
