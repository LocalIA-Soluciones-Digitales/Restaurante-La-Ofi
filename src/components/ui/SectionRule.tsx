import type { ReactNode } from "react";

/**
 * Cabecera de sección editorial: filete grueso arriba, titular a la izquierda y
 * una etiqueta o enlace pequeño a la derecha (como una revista impresa). Al
 * entrar en pantalla el filete se dibuja de izquierda a derecha y el titular
 * sube (CSS .rule-line / .title-in, ligados al scroll).
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
    <div className={className}>
      <span aria-hidden="true" className={`rule-line block h-[3px] ${dark ? "bg-crema" : "bg-carbon"}`} />
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3 pt-5">
        <Tag id={id} className={`title-in t-h2 max-w-[24ch] ${dark ? "text-crema" : "text-carbon"}`}>
          {title}
        </Tag>
        {aside ? <div className={`kicker flex items-center gap-6 ${dark ? "text-crema/70" : "text-carbon-muted"}`}>{aside}</div> : null}
      </div>
    </div>
  );
}
