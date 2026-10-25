const TEXTO = "Del primer café de la mañana a la última copa del viernes. Un restaurante en el Parque Tecnológico, a un paseo de tu oficina.";
// A partir de esta palabra, en cursiva y color ratán (el giro de la frase).
const CORTE = "Un";

/**
 * Una sola frase que se ilumina palabra a palabra mientras la sección está
 * anclada en pantalla (CSS .reveal-text, scroll-driven). Sin soporte o con
 * "reducir movimiento" la frase se ve entera y la sección mide lo normal.
 */
export function Declaracion() {
  const palabras = TEXTO.split(" ");
  const corte = palabras.indexOf(CORTE);
  const n = palabras.length;
  return (
    <section aria-label="La Ofi" className="reveal-text bg-crema">
      <div className="reveal-text-sticky flex items-center py-28 sm:py-40">
        <div className="container-wide">
          <p className="mx-auto max-w-[17em] text-center font-display text-[clamp(1.9rem,1rem+3.6vw,4.4rem)] font-light leading-[1.12] tracking-[-0.02em] text-carbon">
            {palabras.map((p, i) => {
              // Cada palabra se enciende en su tramo del recorrido anclado (0–85 %).
              const a = ((i / n) * 85).toFixed(2);
              const b = (((i + 1) / n) * 85).toFixed(2);
              return (
                <span key={i}>
                  <span className={`rt-word ${i >= corte ? "italic text-madera" : ""}`} style={{ animationRange: `contain ${a}% contain ${b}%` }}>
                    {p}
                  </span>{" "}
                </span>
              );
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
