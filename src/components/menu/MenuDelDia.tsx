import { AllergenList } from "@/components/menu/AllergenList";
import { EmptyState } from "@/components/ui/EmptyState";
import { SourceBadge } from "@/components/ui/SourceBadge";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import type { ContentState, MenuDiaPlato, MenuDiaView } from "@/lib/restaurant/types";

const GRUPOS = [
  { key: "platos", label: "A elegir" },
  { key: "primeros", label: "Primeros" },
  { key: "segundos", label: "Segundos" },
  { key: "postres", label: "Postres" },
] as const;

function Platos({ platos, detalle }: { platos: MenuDiaPlato[]; detalle: boolean }) {
  return (
    <ul className="mt-3 space-y-3">
      {platos.map((p) => (
        <li key={p.id}>
          <p className="font-display text-xl leading-snug text-carbon">{p.nombre}</p>
          {detalle && p.descripcion ? <p className="text-sm text-carbon-muted">{p.descripcion}</p> : null}
          {detalle ? <AllergenList alergenos={p.alergenos} compact /> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Menú del día reutilizable (home y /menu-del-dia). Pensado para que el
 * encargado lo publique cada mañana desde el futuro /admin
 * (restaurant.menus_dia + restaurant.menu_dia_platos).
 */
export function MenuDelDia({ state, detalle = false }: { state: ContentState<MenuDiaView>; detalle?: boolean }) {
  if (state.status === "empty") {
    return (
      <EmptyState title="El menú de hoy aún no está publicado" icon="clock">
        El encargado publica aquí el menú cada día. Mientras tanto, llámanos y te lo contamos.
      </EmptyState>
    );
  }

  const menu = state.data;
  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-carbon/10 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-carbon/15 bg-arena/60 px-6 py-5 sm:px-8">
        <div>
          <p className="eyebrow text-terracota">{menu.platos.length > 0 ? "Plato del día" : "Menú del día"}</p>
          <p className="mt-1 font-display text-2xl capitalize text-carbon">
            {menu.fecha ? formatearFechaLarga(menu.fecha) : "Entre semana"}
          </p>
        </div>
        <SourceBadge fuente={menu.fuente} />
      </div>

      <div className={`grid gap-8 px-6 py-7 sm:px-8 ${menu.platos.length > 0 ? "" : "md:grid-cols-3"}`}>
        {GRUPOS.map((g) =>
          menu[g.key].length > 0 ? (
            <section key={g.key} aria-label={g.label}>
              <h3 className="eyebrow text-oliva">{g.label}</h3>
              <Platos platos={menu[g.key]} detalle={detalle} />
            </section>
          ) : null,
        )}
      </div>

      <footer className="flex flex-wrap items-end justify-between gap-4 border-t border-dashed border-carbon/15 px-6 py-5 sm:px-8">
        <div className="text-sm text-carbon-muted">
          {menu.incluye.length > 0 ? <p>Incluye: {menu.incluye.join(" · ")}</p> : null}
          {menu.notas ? <p className="mt-1 max-w-xl">{menu.notas}</p> : null}
        </div>
        <p className="font-display text-4xl text-marino">
          {menu.precioCentimos !== null ? (
            formatCentimos(menu.precioCentimos)
          ) : (
            <span className="text-lg text-carbon-muted">Precio por confirmar</span>
          )}
        </p>
      </footer>
    </article>
  );
}
