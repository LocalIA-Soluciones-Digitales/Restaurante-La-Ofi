"use client";

import { useMemo, useState } from "react";
import { AnadirControl } from "@/components/carta/AnadirControl";
import { ProductoDetalle } from "@/components/carta/ProductoDetalle";
import type { CartaCartControls } from "@/components/carta/types";
import { ActiveOrderBanner } from "@/components/pedir/ActiveOrderBanner";
import { useCart } from "@/components/pedir/cart-context";
import { Icon } from "@/components/ui/Icon";
import { vibrar } from "@/lib/haptics";
import { formatCentimos } from "@/lib/format";
import type { ConfigPedidos } from "@/lib/pedidos/types";
import type { CartaSeccion, MenuDiaPlato } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export interface MenuParaLlevar {
  precio_centimos: number | null;
  incluye: string[];
  platos: MenuDiaPlato[];
}

const GRUPOS: { tipo: MenuDiaPlato["tipo"]; label: string }[] = [
  { tipo: "plato", label: "Plato del día" },
  { tipo: "primero", label: "Primero" },
  { tipo: "segundo", label: "Segundo" },
  { tipo: "postre", label: "Postre" },
];

/**
 * «Pedir para recoger»: pedido para llevar, sin mesa. El menú del día (mientras
 * está publicado, de 8:00 a 16:00) se compone eligiendo un plato de cada grupo, y
 * la carta va en lista compacta por secciones. Todo acaba en la misma cesta y en
 * un único pedido (cocina, ticket y pago en el local u online).
 */
export function ParaLlevar({ secciones, config, menu }: { secciones: CartaSeccion[]; config: ConfigPedidos | null; menu: MenuParaLlevar | null }) {
  const cart = useCart();
  const hayMenu = Boolean(menu && menu.platos.length > 0 && menu.precio_centimos !== null);
  const [vista, setVista] = useState<"menu" | "carta">(hayMenu ? "menu" : "carta");
  const [detalle, setDetalle] = useState<{ seccion: CartaSeccion; index: number } | null>(null);
  const conItems = secciones.filter((s) => s.items.length > 0);

  const controles = useMemo<CartaCartControls | undefined>(
    () =>
      config
        ? {
            cantidad: (id) => cart.lineas.filter((l) => l.productoId === id).reduce((a, l) => a + l.cantidad, 0),
            anadir: (item, o) => cart.anadir(item, o),
            quitarUno: (id) => cart.quitarUno(id),
            sePuedePedir: (item) => item.fuente === "supabase" && item.precioCentimos !== null,
          }
        : undefined,
    [config, cart],
  );

  const franjas = config?.franjas ?? [];
  const primera = franjas[0] ? HORA.format(new Date(franjas[0].hora)) : null;
  const ultima = franjas.length ? HORA.format(new Date(franjas[franjas.length - 1]!.hora)) : null;

  return (
    <div className="pb-32">
      <header className="grid gap-6 border-b border-tinta-line pb-8 pt-4 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <p className="kicker text-brasa">Para llevar</p>
          <h1 className="mt-3 font-display text-[clamp(2.75rem,7vw,5rem)] font-light leading-[0.95] tracking-tight text-carbon">Pide y recoge</h1>
          <p className="lead mt-4 max-w-xl">
            El menú del día o lo que quieras de la carta. Dinos a qué hora pasas y te lo tenemos listo en barra.
          </p>
        </div>
        <dl className="grid gap-3 text-sm lg:col-span-5">
          <div className="flex items-start gap-3">
            <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-brasa" />
            <div>
              <dt className="font-semibold text-carbon">Recogida</dt>
              <dd className="text-carbon-muted">
                {!config ? "Los pedidos online aún no están activos: llámanos." : primera ? `Hoy, de ${primera} a ${ultima}` : "Hoy ya no hay horas de recogida. Puedes preparar el pedido o llamarnos."}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Icon name="receipt" className="mt-0.5 h-4 w-4 shrink-0 text-brasa" />
            <div>
              <dt className="font-semibold text-carbon">Pago</dt>
              <dd className="text-carbon-muted">
                {config?.pagos.online && config.pagos.en_local ? "Online o al recoger" : config?.pagos.online ? "Online" : "Al recoger, en barra"}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-brasa" />
            <div>
              <dt className="font-semibold text-carbon">¿Dudas o pedido grande?</dt>
              <dd>
                <a href={SITE.phone.href} className="text-carbon-muted underline decoration-carbon/30 underline-offset-4 hover:text-carbon">
                  {SITE.phone.display}
                </a>
              </dd>
            </div>
          </div>
        </dl>
      </header>

      <div className="mt-4">
        <ActiveOrderBanner />
      </div>

      <div role="tablist" aria-label="Qué quieres pedir" className="mt-8 grid grid-cols-2 gap-1 rounded-full bg-papel-2 p-1 sm:inline-grid sm:w-auto">
        {(
          [
            ["menu", "Menú del día", hayMenu ? formatCentimos(menu!.precio_centimos!) : null],
            ["carta", "Carta", null],
          ] as const
        ).map(([k, label, precio]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={vista === k}
            onClick={() => setVista(k)}
            className="min-h-11 whitespace-nowrap rounded-full px-5 text-sm font-semibold text-carbon-muted aria-selected:bg-carbon aria-selected:text-crema"
          >
            {label}
            {precio ? <span className="ml-1.5 hidden font-normal opacity-70 sm:inline">· {precio}</span> : null}
          </button>
        ))}
      </div>

      {vista === "menu" ? (
        hayMenu ? (
          <ComponerMenu menu={menu!} puedeAnadir={Boolean(config)} />
        ) : (
          <div className="mt-8 max-w-xl border border-tinta-line bg-[#FFFDF8] p-8">
            <p className="kicker text-brasa">Menú del día</p>
            <p className="mt-3 font-display text-2xl text-carbon">Ahora mismo no está disponible</p>
            <p className="mt-2 text-carbon-muted">
              Lo publicamos cada día laborable a las 8:00 y se puede pedir para llevar hasta las {config?.menu_hasta ?? "16:00"}. Mientras tanto, tienes toda la carta.
            </p>
            <button type="button" onClick={() => setVista("carta")} className="btn-secondary mt-6">
              Ver la carta
            </button>
          </div>
        )
      ) : (
        <div className="mt-8">
          <nav aria-label="Secciones de la carta" className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto bg-crema/95 px-4 py-3 backdrop-blur [scrollbar-width:none] sm:top-20">
            {conItems.map((s) => (
              <a key={s.id} href={`#llevar-${s.slug}`} className="shrink-0 rounded-full border border-carbon/15 px-4 py-2 text-sm font-semibold text-carbon hover:border-carbon/50">
                {s.nombre}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid gap-12">
            {conItems.map((s) => (
              <section key={s.id} id={`llevar-${s.slug}`} aria-labelledby={`llevar-${s.slug}-t`} className="scroll-mt-36">
                <div className="flex items-baseline justify-between gap-4 border-b border-carbon/15 pb-2">
                  <h2 id={`llevar-${s.slug}-t`} className="font-display text-3xl text-carbon">
                    {s.nombre}
                  </h2>
                  <span className="text-xs text-carbon-muted">{s.items.length} platos</span>
                </div>
                {s.nota ? <p className="mt-2 text-sm text-carbon-muted">{s.nota}</p> : null}
                <ul className="divide-y divide-carbon/10">
                  {s.items.map((it, i) => (
                    <li key={it.id} className="flex items-center gap-4 py-4">
                      <button type="button" onClick={() => setDetalle({ seccion: s, index: i })} className="min-w-0 flex-1 text-left">
                        <span className="block font-display text-lg leading-snug text-carbon">{it.nombre}</span>
                        {it.descripcion ? <span className="mt-0.5 line-clamp-2 block text-sm text-carbon-muted">{it.descripcion}</span> : null}
                        <span className="mt-1 block text-sm font-semibold tabular-nums text-carbon">
                          {it.precioCentimos !== null ? formatCentimos(it.precioCentimos) : <span className="font-normal text-carbon-muted">Precio en el local</span>}
                        </span>
                      </button>
                      {controles && controles.sePuedePedir(it) ? (
                        <AnadirControl item={it} cart={controles} onRequiereFicha={() => setDetalle({ seccion: s, index: i })} compacto />
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}

      {detalle ? (
        <ProductoDetalle
          items={detalle.seccion.items}
          index={Math.min(detalle.index, detalle.seccion.items.length - 1)}
          seccion={detalle.seccion.nombre}
          origen={null}
          cart={controles}
          onClose={() => setDetalle(null)}
          onNavigate={(index) => setDetalle((d) => (d ? { ...d, index } : d))}
        />
      ) : null}
    </div>
  );
}

/** El menú como se compone en barra: un plato de cada grupo y cuántos menús así. */
function ComponerMenu({ menu, puedeAnadir }: { menu: MenuParaLlevar; puedeAnadir: boolean }) {
  const cart = useCart();
  const grupos = GRUPOS.map((g) => ({ ...g, platos: menu.platos.filter((p) => p.tipo === g.tipo).sort((a, b) => a.orden - b.orden) })).filter((g) => g.platos.length > 0);
  const [eleccion, setEleccion] = useState<Record<string, string>>(() =>
    Object.fromEntries(grupos.filter((g) => g.platos.length === 1).map((g) => [g.tipo, g.platos[0]!.id])),
  );
  const [cantidad, setCantidad] = useState(1);
  const [anadido, setAnadido] = useState(false);
  const completo = grupos.every((g) => eleccion[g.tipo]);
  const precio = menu.precio_centimos!;

  const anadir = () => {
    const platos = grupos.map((g) => g.platos.find((p) => p.id === eleccion[g.tipo])!).map((p) => ({ id: p.id, nombre: p.nombre }));
    cart.anadirMenu(platos, precio, cantidad);
    vibrar(12);
    setAnadido(true);
    setCantidad(1);
    setEleccion(Object.fromEntries(grupos.filter((g) => g.platos.length === 1).map((g) => [g.tipo, g.platos[0]!.id])));
    window.setTimeout(() => setAnadido(false), 2500);
  };

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-12">
      <div className="grid gap-8 lg:col-span-8">
        {grupos.map((g, n) => (
          <fieldset key={g.tipo}>
            <legend className="flex items-baseline gap-3">
              <span className="font-display text-2xl tabular-nums text-brasa">{n + 1}</span>
              <span className="font-display text-2xl text-carbon">{g.label}</span>
              <span className="text-sm text-carbon-muted">{g.platos.length > 1 ? "elige uno" : ""}</span>
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {g.platos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={eleccion[g.tipo] === p.id}
                  onClick={() => setEleccion((e) => ({ ...e, [g.tipo]: p.id }))}
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-carbon/15 bg-[#FFFDF8] px-4 py-3 text-left aria-pressed:border-carbon aria-pressed:bg-carbon aria-pressed:text-crema"
                >
                  <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-current">
                    {eleccion[g.tipo] === p.id ? <span className="h-2.5 w-2.5 rounded-full bg-current" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold leading-snug">{p.nombre}</span>
                    {p.descripcion ? <span className="block text-xs opacity-70">{p.descripcion}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <aside className="lg:col-span-4">
        <div className="border border-tinta-line bg-[#FFFDF8] p-6 lg:sticky lg:top-28">
          <p className="kicker text-brasa">Tu menú</p>
          <p className="mt-2 font-display text-4xl tabular-nums text-carbon">{formatCentimos(precio)}</p>
          {menu.incluye.length ? <p className="mt-1 text-sm text-carbon-muted">Incluye {menu.incluye.join(", ").toLowerCase()}</p> : null}
          <ul className="mt-4 grid gap-1 text-sm">
            {grupos.map((g) => (
              <li key={g.tipo} className="flex gap-2">
                <span className="w-24 shrink-0 text-carbon-muted">{g.label}</span>
                <span className={eleccion[g.tipo] ? "font-semibold text-carbon" : "text-carbon-muted"}>{g.platos.find((p) => p.id === eleccion[g.tipo])?.nombre ?? "—"}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-carbon">Menús así</span>
            <span className="flex items-center rounded-full border border-carbon/15">
              <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="grid h-10 w-10 place-items-center" aria-label="Un menú menos">
                <Icon name="minus" className="h-4 w-4" />
              </button>
              <span aria-live="polite" className="w-6 text-center font-semibold tabular-nums">
                {cantidad}
              </span>
              <button type="button" onClick={() => setCantidad((c) => Math.min(30, c + 1))} className="grid h-10 w-10 place-items-center" aria-label="Un menú más">
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </span>
          </div>
          <button type="button" onClick={anadir} disabled={!completo || !puedeAnadir} className="btn-primary mt-5 w-full justify-center disabled:opacity-50">
            <Icon name={anadido ? "check" : "bag"} className="h-4 w-4" />
            {anadido ? "Añadido a la cesta" : `Añadir · ${formatCentimos(precio * cantidad)}`}
          </button>
          <p role="status" className="mt-2 min-h-5 text-xs text-carbon-muted">
            {!completo ? "Elige un plato de cada grupo." : "Puedes añadir otros menús con platos distintos."}
          </p>
        </div>
      </aside>
    </div>
  );
}
