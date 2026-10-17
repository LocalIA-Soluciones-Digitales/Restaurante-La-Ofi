import { Photo } from "@/components/media/Photo";

// Solo lo verificable: apertura 7:30 L–V y viernes hasta 00:00 (horario publicado),
// tostadas 9:00–11:30 (carta de La Ofi en Instagram), plato del día L–V y brasa
// (Deia, 09/2025), tardeo mensual y terraza cubierta (Deia / Instagram).
const HORAS: { hora: string; titulo: string; texto: string }[] = [
  { hora: "7:30", titulo: "El primer café", texto: "Café en barra antes de subir a la oficina." },
  { hora: "9:00", titulo: "Tostadas", texto: "Ocho tostadas de masa madre, hasta las 11:30." },
  { hora: "Mediodía", titulo: "Plato del día", texto: "Casero, a elegir, de lunes a viernes. Y brasa." },
  { hora: "Viernes", titulo: "La tarde se alarga", texto: "Terraza, un tardeo al mes y abierto hasta las 00:00." },
];

/**
 * Manifiesto de la marca: una frase en serifa sobre una foto vertical del local y,
 * debajo, el día en La Ofi contado con horas reales (texto, sin miniaturas).
 */
export function Manifiesto() {
  return (
    <section aria-labelledby="manifiesto-title" className="cv-auto section overflow-hidden bg-noche text-crema">
      <div className="container-wide">
        <p className="kicker text-center text-ratan">Un día en La Ofi</p>

        <figure className="relative mx-auto mt-8 aspect-[4/5] w-full max-w-[34rem] overflow-hidden bg-noche-3 sm:aspect-[3/4]">
          <Photo img="barraMesasAltas" sizes="(min-width: 640px) 34rem, 100vw" mobileBelow={9999} decorative />
          <span aria-hidden="true" className="absolute inset-0 bg-noche/55" />
          <blockquote className="absolute inset-0 grid place-items-center px-8 text-center sm:px-12">
            <p id="manifiesto-title" className="font-display text-[clamp(1.6rem,1.2rem+1.4vw,2.35rem)] font-light leading-[1.2] tracking-[0.005em]">
              «Durante el día, el restaurante del Parque. <em className="text-ratan">Cuando acaba la oficina, empieza La Ofi.</em>»
            </p>
          </blockquote>
        </figure>

        <ol className="mx-auto mt-16 grid max-w-5xl gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {HORAS.map((h) => (
            <li key={h.hora} className="border-t border-crema/20 pt-4">
              <p className="font-display text-3xl font-light tabular-nums text-crema">{h.hora}</p>
              <h3 className="kicker mt-3 text-ratan">{h.titulo}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-crema/70">{h.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
