import type { CSSProperties } from "react";

/**
 * Trazo "la ofi" del rótulo de neón del local, sin nada alrededor. Lo usa el
 * logotipo y, a gran tamaño, el hero, el fondo de "El local" y el pie. Escala
 * con el ancho del contenedor (h-auto); el grosor se ajusta con `strokeWidth`.
 * Con `draw` cada trazo se "enciende" en orden, como un tubo de neón (CSS
 * .wm-draw en globals.css; con "reducir movimiento" aparece entero).
 */
export function Wordmark({
  className = "",
  strokeWidth = 5,
  title,
  draw = false,
}: {
  className?: string;
  strokeWidth?: number;
  /** Sin título es decorativo (aria-hidden). */
  title?: string;
  draw?: boolean;
}) {
  // pathLength=1 normaliza cada trazo: el CSS anima stroke-dashoffset de 1 a 0.
  const s = (i: number) =>
    draw ? { className: "wm-stroke", pathLength: 1, style: { "--i": i } as CSSProperties } : {};
  return (
    <svg
      viewBox="0 0 119 46"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`${draw ? "wm-draw" : ""} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M5 4.5V40.5" {...s(0)} />
      <circle cx="25" cy="29.5" r="11" {...s(1)} />
      <path d="M36 18.5V40.5" {...s(2)} />
      <circle cx="68" cy="29.5" r="11" {...s(3)} />
      <path d="M91 40.5V14a9 9 0 0 1 9-9h2" {...s(4)} />
      <path d="M84 19.5h15" {...s(5)} />
      <path d="M112 19.5V40.5" {...s(6)} />
      <circle cx="112" cy="8" r="3.2" fill="currentColor" stroke="none" className={draw ? "wm-dot" : undefined} />
    </svg>
  );
}
