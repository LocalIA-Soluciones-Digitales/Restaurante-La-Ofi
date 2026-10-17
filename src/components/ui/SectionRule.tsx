import type { ReactNode } from "react";

/**
 * Cabecera de sección editorial: filete grueso arriba, titular a la izquierda y
 * una etiqueta o enlace pequeño a la derecha (como una revista impresa). Sustituye
 * al kicker de color + titular apilados.
 */
export function SectionRule({
  id,
  title,
  aside,
  dark = false,
  as: Tag = "h2",
  className = "",
}: {
  id: string;
  title: ReactNode;
  aside?: ReactNode;
  dark?: boolean;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 border-t-[3px] pt-5 ${
        dark ? "border-crema" : "border-carbon"
      } ${className}`}
    >
      <Tag id={id} className={`t-h2 max-w-[24ch] ${dark ? "text-crema" : "text-carbon"}`}>
        {title}
      </Tag>
      {aside ? <div className={`kicker flex items-center gap-6 ${dark ? "text-crema/70" : "text-carbon-muted"}`}>{aside}</div> : null}
    </div>
  );
}
