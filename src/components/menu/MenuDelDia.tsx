import { AllergenList } from "@/components/menu/AllergenList";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { formatCentimos, formatearFechaLarga, formatearHoraActualizacion } from "@/lib/format";
import { SITE } from "@/lib/site";
import type { ContentState, MenuDiaPlato, MenuDiaView } from "@/lib/restaurant/types";

const GRUPOS = [
  { key: "platos", label: "A elegir" },
  { key: "primeros", label: "Primeros" },
  { key: "segundos", label: "Segundos" },
  { key: "postres", label: "Postres" },
] as const;

function Filete() {
  return (
    <div aria-hidden="true" className="mx-auto my-6 flex w-24 items-center gap-2 text-brasa/60">
      <span className="h-px flex-1 bg-current" />
      <span className="h-1 w-1 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-current" />
    </div>
  );
}

function Platos({ platos, detalle }: { platos: MenuDiaPlato[]; detalle: boolean }) {
  return (
    <ul className="mt-3 space-y-2.5">
      {platos.map((p) => (
        <li key={p.id}>
          <p className="font-display text-[1.35rem] leading-snug text-carbon sm:text-2xl">{p.nombre}</p>
          {detalle && p.descripcion ? <p className="mt-0.5 text-sm text-carbon-muted">{p.descripcion}</p> : null}
          {detalle ? (
            <div className="mt-1 flex justify-center">
              <AllergenList alergenos={p.alergenos} compact />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * El menú del día como se imprime y se pone en la mesa: centrado, tipográfico,
 * precio grande. Lo publica el encargado cada día desde /admin.
 */
export function MenuDelDia({
  state,
  detalle = false,
  headingLevel: Heading = "h3",
  live = false,
}: {
  state: ContentState<MenuDiaView>;
  detalle?: boolean;
  /** Muestra "Actualizado hoy a las 10:12" (solo con datos reales). */
  live?: boolean;
  /** h3 dentro de una sección con h2 (home); h2 directamente bajo el h1 de la página. */
  headingLevel?: "h2" | "h3";
}) {
  const hoja = "relative bg-[#FFFDF8] px-6 py-9 text-center shadow-[0_1px_0_rgb(43_39_34/0.06),0_30px_60px_-40px_rgb(43_39_34/0.45)] ring-1 ring-tinta-line sm:px-12 sm:py-12";

  if (state.status === "empty") {
    return (
      <article className={hoja}>
        <p className="kicker text-brasa">Menú del día</p>
        <Heading className="mt-3 font-display text-2xl text-carbon sm:text-3xl">Hoy todavía no está publicado</Heading>
        <Filete />
        <p className="mx-auto max-w-sm text-carbon-muted">
          Lo publicamos aquí cada día. Mientras tanto, llámanos y te contamos qué hay:
        </p>
        <a href={SITE.phone.href} className="btn-secondary mt-6">
          {SITE.phone.display}
        </a>
      </article>
    );
  }

  const menu = state.data;
  return (
    <article className={hoja}>
      <p className="kicker text-brasa">{menu.platos.length > 0 ? "Plato del día" : "Menú del día"}</p>
      <p className="mt-2 font-display text-2xl italic text-carbon first-letter:uppercase sm:text-[1.75rem]">
        {menu.fecha ? formatearFechaLarga(menu.fecha) : "De lunes a viernes"}
      </p>
      <div className="mt-3 flex min-h-6 justify-center">
        {live && state.status === "real" && menu.actualizadoEn ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-ok">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ok" />
            Actualizado {formatearHoraActualizacion(menu.actualizadoEn)}
          </span>
        ) : (
          <SourceBadge fuente={menu.fuente} />
        )}
      </div>

      <Filete />

      <div className={`grid gap-8 ${menu.platos.length > 0 ? "" : "md:grid-cols-3 md:gap-6"}`}>
        {GRUPOS.map((g) =>
          menu[g.key].length > 0 ? (
            <section key={g.key} aria-label={g.label}>
              <Heading className="kicker font-sans text-oliva">{g.label}</Heading>
              <Platos platos={menu[g.key]} detalle={detalle} />
            </section>
          ) : null,
        )}
      </div>

      <Filete />

      <p className="font-display text-5xl tabular-nums text-carbon">
        {menu.precioCentimos !== null ? formatCentimos(menu.precioCentimos) : <span className="text-xl text-carbon-muted">Precio en el local</span>}
      </p>
      {menu.incluye.length > 0 ? <p className="mt-2 text-sm font-medium text-carbon">Incluye {menu.incluye.join(", ").toLowerCase()}</p> : null}
      {menu.notas ? <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-carbon-muted">{menu.notas}</p> : null}
    </article>
  );
}
