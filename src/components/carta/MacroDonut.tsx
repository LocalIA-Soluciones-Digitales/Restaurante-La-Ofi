import type { MacroSegmento } from "@/lib/carta";

export const MACRO_COLORES: Record<MacroSegmento["key"], string> = {
  proteinas: "#1E3557", // marino
  carbohidratos: "#D2AE78", // ratán
  grasas: "#96442B", // terracota
};

/** Donut del reparto de kcal por macronutriente (decorativo: la leyenda lleva los datos). */
export function MacroDonut({ segmentos, kcal }: { segmentos: MacroSegmento[]; kcal: number | null }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const hueco = 3;
  let acumulado = 0;
  return (
    <div className="relative h-28 w-28 shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full" aria-hidden="true">
        <g transform="rotate(-90 44 44)">
          <circle cx="44" cy="44" r={r} fill="none" strokeWidth="12" className="stroke-arena" />
          {segmentos.map((s) => {
            const largo = (s.pct / 100) * c;
            const visible = Math.max(largo - hueco, 0);
            const offset = -acumulado;
            acumulado += largo;
            return (
              <circle
                key={s.key}
                cx="44"
                cy="44"
                r={r}
                fill="none"
                stroke={MACRO_COLORES[s.key]}
                strokeWidth="12"
                strokeDasharray={`${visible} ${c - visible}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      </svg>
      {kcal !== null ? (
        <span aria-hidden="true" className="absolute inset-0 grid place-items-center text-center leading-none">
          <span>
            <span className="block font-display text-2xl text-carbon">{kcal}</span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-carbon-muted">kcal</span>
          </span>
        </span>
      ) : null}
    </div>
  );
}
