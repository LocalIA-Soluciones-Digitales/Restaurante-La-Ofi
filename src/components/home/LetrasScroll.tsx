// Lo que se hace en La Ofi, en el orden del día (todo publicado: carta, horario,
// tardeo mensual, El Despacho y celebraciones).
const FILA_1 = ["Café", "Tostadas", "Menú del día", "Pintxos", "Copas"];
const FILA_2 = ["Comidas de empresa", "Reuniones", "Tardeos", "Celebraciones"];

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
    <section aria-hidden="true" className="relative overflow-hidden bg-noche py-16 sm:py-24">
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
      {/* Funde la noche con el tono de la banda del menú del día, que va debajo. */}
      <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-noche/0 to-carbon sm:h-24" />
    </section>
  );
}
