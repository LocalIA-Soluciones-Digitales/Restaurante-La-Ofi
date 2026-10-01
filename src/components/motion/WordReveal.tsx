import type { CSSProperties, ElementType } from "react";
import { ReplayOnView } from "@/components/motion/ReplayOnView";

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
  replayOnView = false,
  nowrapLines = false,
}: {
  lines: string[];
  as?: ElementType;
  className?: string;
  delayMs?: number;
  wordClassName?: string;
  /** Para titulares bajo el pliegue: la animación se relanza al entrar en pantalla. */
  replayOnView?: boolean;
  /** Cada línea en una sola línea (saltos explícitos; evita el CLS al cambiar de fuente). */
  nowrapLines?: boolean;
}) {
  let i = 0;
  const content = (
    <Tag className={className}>
      <span className="sr-only">{lines.join(" ")}</span>
      {lines.map((line, li) => (
        <span key={li} aria-hidden="true" className={nowrapLines ? "block whitespace-nowrap" : "block"}>
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
  return replayOnView ? <ReplayOnView className="block">{content}</ReplayOnView> : content;
}
