import type { SubEvento } from "@/lib/restaurant/types";

export const horario = (p: Pick<SubEvento, "hora" | "hora_fin">) =>
  p.hora ? (p.hora_fin ? `${p.hora.slice(0, 5)} – ${p.hora_fin.slice(0, 5)}` : p.hora.slice(0, 5)) : "";

/** Programa del día en línea de tiempo: hora a la izquierda, cada parte con su punto. */
export function ProgramaEvento({ programa, oscuro = false, compacto = false }: { programa: SubEvento[]; oscuro?: boolean; compacto?: boolean }) {
  if (programa.length === 0) return null;
  const linea = oscuro ? "border-crema/15" : "border-tinta-line";
  return (
    <ol className={`relative border-l ${linea} ${compacto ? "space-y-3" : "space-y-6"}`}>
      {programa.map((p, i) => (
        <li key={`${p.titulo}-${i}`} className="relative pl-5">
          <span
            aria-hidden="true"
            className={`absolute -left-[5px] top-[0.45rem] h-[9px] w-[9px] rounded-full ring-4 ${oscuro ? "bg-neon ring-noche" : "bg-brasa ring-crema"}`}
          />
          <p className={`flex flex-wrap items-baseline gap-x-3 ${compacto ? "" : "gap-y-1"}`}>
            {p.hora ? (
              <span className={`text-sm font-semibold tabular-nums ${oscuro ? "text-neon" : "text-brasa"}`}>{horario(p)}</span>
            ) : null}
            <span className={`font-display ${compacto ? "text-lg" : "text-xl sm:text-2xl"} leading-snug ${oscuro ? "text-crema" : "text-carbon"}`}>{p.titulo}</span>
          </p>
          {p.descripcion && !compacto ? <p className={`mt-1 text-[0.95rem] leading-relaxed ${oscuro ? "text-crema/70" : "text-carbon-muted"}`}>{p.descripcion}</p> : null}
        </li>
      ))}
    </ol>
  );
}
