/**
 * Cinta de una sola línea que se desplaza con el scroll (drift-l, como las letras
 * de arriba) y separa dos bandas de foto: palabras en tinta alternando con
 * cursivas en madera. Es textura y anticipo de lo que viene (aria-hidden).
 * Sin soporte de scroll-driven, se queda quieta.
 */
export function CintaScroll({ palabras }: { palabras: string[] }) {
  const fila = [...palabras, ...palabras, ...palabras];
  return (
    <div aria-hidden="true" className="overflow-hidden bg-crema py-14 sm:py-20">
      <p className="drift-l flex w-max items-center gap-[0.5em] whitespace-nowrap font-display text-[clamp(2.6rem,1.4rem+5vw,6.5rem)] font-light leading-none tracking-[-0.02em] text-carbon">
        {fila.map((p, i) => (
          <span key={i} className="flex items-center gap-[0.5em]">
            <span className={i % 2 === 1 ? "italic text-madera" : undefined}>{p}</span>
            <span className="inline-block h-[0.14em] w-[0.14em] rotate-45 bg-brasa/70" />
          </span>
        ))}
      </p>
    </div>
  );
}
