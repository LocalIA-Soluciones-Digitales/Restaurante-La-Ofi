/**
 * Trazo "la ofi" del rótulo de neón del local, sin nada alrededor. Lo usa el
 * logotipo y, a gran tamaño, el hero, el fondo de "El local" y el pie. Escala
 * con el ancho del contenedor (h-auto); el grosor se ajusta con `strokeWidth`.
 */
export function Wordmark({
  className = "",
  strokeWidth = 5,
  title,
}: {
  className?: string;
  strokeWidth?: number;
  /** Sin título es decorativo (aria-hidden). */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 119 46"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M5 4.5V40.5" />
      <circle cx="25" cy="29.5" r="11" />
      <path d="M36 18.5V40.5" />
      <circle cx="68" cy="29.5" r="11" />
      <path d="M91 40.5V14a9 9 0 0 1 9-9h2" />
      <path d="M84 19.5h15" />
      <path d="M112 19.5V40.5" />
      <circle cx="112" cy="8" r="3.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
