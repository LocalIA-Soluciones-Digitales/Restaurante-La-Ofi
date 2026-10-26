const FILA_1 = ["Desayunar", "Comer", "Brasa", "Quedarse"];
const FILA_2 = ["La Ofi", "Parque Tecnológico", "Derio", "Desde las 7:30"];

/**
 * Dos filas de letras caladas a gran tamaño que se desplazan en sentidos
 * opuestos con el scroll (como Restaurant GEM). Recortadas por los lados a
 * propósito: es textura, no texto para leer (aria-hidden; lo dicen otras
 * secciones). Sin soporte de scroll-driven, se quedan quietas.
 */
export function LetrasScroll() {
  const fila = (palabras: string[]) => [...palabras, ...palabras, ...palabras];
  const clase =
    "flex w-max items-center gap-[0.4em] whitespace-nowrap font-display text-[clamp(3.4rem,1.6rem+7vw,9.5rem)] font-light leading-[1.1] text-transparent [-webkit-text-stroke:1.2px_rgb(210_174_120/0.8)]";
  return (
    <section aria-hidden="true" className="relative overflow-hidden bg-noche pb-48 pt-16 sm:pt-20">
      <p className={`drift-l ${clase}`}>
        {fila(FILA_1).map((p, i) => (
          <span key={i} className="flex items-center gap-[0.4em]">
            {p}
            <span className="inline-block h-[0.12em] w-[0.12em] rounded-full border border-ratan/80" />
          </span>
        ))}
      </p>
      <p className={`drift-r mt-2 italic ${clase}`}>
        {fila(FILA_2).map((p, i) => (
          <span key={i} className="flex items-center gap-[0.4em]">
            {p}
            <span className="inline-block h-[0.12em] w-[0.12em] rounded-full border border-ratan/80" />
          </span>
        ))}
      </p>
      {/* Niebla de la noche al crema de la sección siguiente (White Desert). */}
      <span className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-noche/0 via-crema/60 to-crema backdrop-blur-[2px]" />
    </section>
  );
}
