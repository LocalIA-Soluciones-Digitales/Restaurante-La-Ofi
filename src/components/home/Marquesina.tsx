const FILA_1 = ["Desayunar", "Comer", "Brasa", "Quedarse un poco más"];
const FILA_2 = ["Parque Tecnológico", "Derio", "Desde las 7:30", "la ofi"];

/**
 * Dos filas de texto grande que se desplazan en sentidos opuestos mientras la
 * sección cruza la pantalla (CSS .drift-l / .drift-r, ligadas al scroll: si no
 * bajas, no se mueven). Una calada y otra en cursiva. Decorativa: el mismo texto
 * ya está en la página.
 */
export function Marquesina() {
  const repetir = (palabras: string[]) => [...palabras, ...palabras, ...palabras];
  return (
    <section aria-hidden="true" className="overflow-hidden bg-crema py-16 sm:py-24">
      <p className="drift-l flex w-max items-center gap-8 whitespace-nowrap font-display text-[clamp(3rem,1.8rem+6vw,8.5rem)] font-light leading-none text-transparent [-webkit-text-stroke:1px_rgb(43_39_34/0.4)]">
        {repetir(FILA_1).map((p, i) => (
          <span key={i} className="flex items-center gap-8">
            {p}
            <span className="inline-block h-3 w-3 rounded-full bg-brasa sm:h-4 sm:w-4" />
          </span>
        ))}
      </p>
      <p className="drift-r mt-2 flex w-max items-center gap-8 whitespace-nowrap font-display text-[clamp(3rem,1.8rem+6vw,8.5rem)] font-light italic leading-none text-carbon sm:mt-4">
        {repetir(FILA_2).map((p, i) => (
          <span key={i} className="flex items-center gap-8">
            {p}
            <span className="font-sans text-[0.35em] not-italic text-brasa">✦</span>
          </span>
        ))}
      </p>
    </section>
  );
}
