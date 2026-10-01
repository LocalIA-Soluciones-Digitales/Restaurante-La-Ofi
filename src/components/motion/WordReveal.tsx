import type { CSSProperties, ElementType } from "react";

/**
 * Titular con revelado por palabras (cada palabra sube desde una máscara), el
 * efecto de los heros de Amway pero en CSS puro: cero JS, funciona en el primer
 * render y con "reducir movimiento" se muestra directamente (globals.css).
 * `lines`: cada elemento es una línea; las palabras se separan por espacios.
 */
export function WordReveal({
  lines,
  as: Tag = "span",
  className = "",
  delayMs = 0,
  wordClassName = "",
}: {
  lines: string[];
  as?: ElementType;
  className?: string;
  delayMs?: number;
  wordClassName?: string;
}) {
  let i = 0;
  return (
    <Tag className={className}>
      <span className="sr-only">{lines.join(" ")}</span>
      {lines.map((line, li) => (
        <span key={li} aria-hidden="true" className="block">
          {line.split(" ").map((word, wi, arr) => {
            const style = { "--i": i++, "--d": `${delayMs}ms` } as CSSProperties;
            return (
              <span key={wi}>
                <span className="word-mask">
                  <span style={style} className={wordClassName}>
                    {word}
                  </span>
                </span>
                {wi < arr.length - 1 ? " " : null}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
