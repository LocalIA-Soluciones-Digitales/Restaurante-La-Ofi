import { Wordmark } from "@/components/ui/Wordmark";

/**
 * Logotipo "la ofi": trazado en SVG a partir del rótulo de neón del local (minúsculas, trazo
 * único redondeado). No existe logo vectorial oficial publicado (RESEARCH.md §8); sustituir
 * por el del propietario en cuanto lo facilite (CONTENT_NEEDED.md).
 */
export function Logo({
  light = false,
  className = "",
  sub = true,
  center = false,
}: {
  light?: boolean;
  className?: string;
  sub?: boolean;
  /** Centrado (cabecera); a la izquierda en el pie y el menú. */
  center?: boolean;
}) {
  return (
    <span className={`inline-flex flex-col leading-none ${center ? "items-center" : "items-start"} ${className}`}>
      <Wordmark
        title="la ofi"
        className={`h-[1.7rem] w-auto ${
          light
            ? "text-[#f4f0ff] [filter:drop-shadow(0_0_2px_rgb(201_187_255/0.9))_drop-shadow(0_0_8px_rgb(142_124_240/0.6))]"
            : "text-marino"
        }`}
      />
      {sub ? (
        <span className={`mt-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.32em] ${light ? "text-crema/70" : "text-carbon-muted"}`}>
          Restaurante · Derio
        </span>
      ) : null}
    </span>
  );
}
