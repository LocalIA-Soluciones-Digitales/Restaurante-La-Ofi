/**
 * Logotipo "la ofi": trazado en SVG a partir del rótulo de neón del local (minúsculas, trazo
 * único redondeado). No existe logo vectorial oficial publicado (RESEARCH.md §8); sustituir
 * por el del propietario en cuanto lo facilite (CONTENT_NEEDED.md).
 */
export function Logo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span className={`inline-flex flex-col items-start leading-none ${className}`}>
      <svg
        viewBox="0 0 119 46"
        role="img"
        aria-label="la ofi"
        className={`h-[1.85rem] w-auto ${
          light
            ? "text-[#f4f0ff] [filter:drop-shadow(0_0_2px_rgb(201_187_255/0.9))_drop-shadow(0_0_8px_rgb(142_124_240/0.6))]"
            : "text-marino"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
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
      <span className={`mt-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.28em] ${light ? "text-crema/70" : "text-carbon-muted"}`}>
        Restaurante · Derio
      </span>
    </span>
  );
}
