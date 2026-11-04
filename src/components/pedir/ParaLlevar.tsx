"use client";

import { type ReactNode, useMemo, useState } from "react";
import { AnadirControl } from "@/components/carta/AnadirControl";
import { MiniaturaPlato } from "@/components/carta/MiniaturaPlato";
import { ProductoDetalle } from "@/components/carta/ProductoDetalle";
import type { CartaCartControls } from "@/components/carta/types";
import { Photo } from "@/components/media/Photo";
import { ActiveOrderBanner } from "@/components/pedir/ActiveOrderBanner";
import { useCart } from "@/components/pedir/cart-context";
import { Icon, type IconName } from "@/components/ui/Icon";
import { normalizarNombre } from "@/lib/carta-fotos";
import { vibrar } from "@/lib/haptics";
import { formatCentimos } from "@/lib/format";
import { cuandoRecogida, franjasDisponibles } from "@/lib/pedidos/franjas";
import type { ConfigPedidos } from "@/lib/pedidos/types";
import type { CartaItem, CartaSeccion, MenuDiaPlato } from "@/lib/restaurant/types";
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

/** Secciones de vino (tintos, blancos, rosados, cavas, dulces): van en su pestaña, como carta de vinos. */
const esVino = (s: CartaSeccion) => /^(vinos?|cavas?)\b/.test(s.slug) || /\b(vinos?|cavas?|champagnes?)\b/i.test(s.nombre);

/** «Vinos tintos» → «Tintos»; «Cavas y champagnes» se queda igual. */
const nombreCorto = (nombre: string) => {
  const s = nombre.replace(/^vinos?\s+/i, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const PASOS: { icono: IconName; titulo: string; texto: string }[] = [
  { icono: "utensils", titulo: "Elige", texto: "Menú del día, carta o vino" },
  { icono: "clock", titulo: "Pon la hora", texto: "Cuando te venga bien pasar" },
  { icono: "bag", titulo: "Recoge en barra", texto: "Te lo tenemos preparado" },
];

type Vista = "menu" | "carta" | "vinos";

/**
 * «Pedir para recoger»: pedido para llevar, sin mesa. Cabecera con foto y lo
 * esencial (recogida, pago, teléfono) y tres pestañas: el menú del día (mientras
 * está publicado, de 8:00 a 16:00) se compone eligiendo un plato de cada grupo,
 * la carta va en lista compacta por secciones y los vinos en lista de texto, como
 * una carta de vinos, sin fotos. Todo acaba en la misma cesta y en un único pedido.
 */
export function ParaLlevar({ secciones, config, menu }: { secciones: CartaSeccion[]; config: ConfigPedidos | null; menu: MenuParaLlevar | null }) {
  const cart = useCart();
  const hayMenu = Boolean(menu && menu.platos.length > 0 && menu.precio_centimos !== null);
  const [vista, setVista] = useState<Vista>(hayMenu ? "menu" : "carta");
  const [detalle, setDetalle] = useState<{ seccion: CartaSeccion; index: number } | null>(null);
  const conItems = secciones.filter((s) => s.items.length > 0);
  const comida = conItems.filter((s) => !esVino(s));
  const vinos = conItems.filter(esVino);
  const nVinos = vinos.reduce((a, s) => a + s.items.length, 0);
  // Los platos del menú del día con la foto del mismo plato en la carta, si la tiene.
  const fotoPorNombre = useMemo(
    () => new Map(secciones.flatMap((s) => s.items.filter((i) => i.imagen).map((i) => [normalizarNombre(i.nombre), i.imagen!.src] as const))),
    [secciones],
  );

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
  // Hoy sin horas: la primera hora libre de los próximos días, para dejarlo encargado.
  const siguiente = primera ? null : franjasDisponibles(config).find((f) => f.libres > 0);
  const textoRecogida = !config
    ? "Los pedidos online aún no están activos: llámanos."
    : primera
      ? `Hoy, de ${primera} a ${ultima}`
      : siguiente
        ? `Hoy ya no quedan horas. Puedes dejarlo encargado para ${cuandoRecogida(siguiente.hora)} o más tarde.`
        : "Hoy ya no hay horas de recogida. Puedes preparar el pedido o llamarnos.";
  const pago = config?.pagos.online && config.pagos.en_local ? "Online o al recoger" : config?.pagos.online ? "Online" : "Al recoger, en barra";

  const pestanas: [Vista, string, string | null][] = [
    ["menu", "Menú del día", hayMenu ? formatCentimos(menu!.precio_centimos!) : null],
    ["carta", "Carta", null],
    ...(vinos.length ? ([["vinos", "Vinos", String(nVinos)]] as [Vista, string, string][]) : []),
  ];

  const irA = (v: Vista) => {
    setVista(v);
    document.getElementById("llevar-pestanas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const abrir = (seccion: CartaSeccion, index: number) => setDetalle({ seccion, index });

  return (
    <div className="pb-32">
      {/* Cabecera: foto de la barra, titular y lo que hay que saber antes de pedir. */}
      <header className="relative isolate -mx-4 mt-2 overflow-hidden bg-carbon text-crema sm:mx-0 sm:rounded-[2rem]">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Photo img="barra" sizes="(min-width: 1280px) 1200px, 100vw" priority decorative mobileBelow={640} imgClassName="motion-safe:animate-kenburns" />
          <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/75 to-carbon/25 lg:bg-gradient-to-r lg:from-carbon lg:via-carbon/80 lg:to-carbon/10" />
        </div>

        <div className="grid gap-8 px-5 pb-5 pt-10 sm:gap-10 sm:px-10 sm:pb-8 sm:pt-24 lg:grid-cols-12 lg:items-end lg:px-14 lg:pb-12 lg:pt-32">
          <div className="lg:col-span-7">
            <p className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-crema/80">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brasa" />
              Para llevar
            </p>
            <h1 className="mt-4 font-display text-[clamp(3rem,9vw,6rem)] font-light leading-[0.9] tracking-tight">
              Pide y <em className="font-normal italic">recoge</em>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-crema/80 sm:text-lg">
              El menú del día, la carta o una botella de vino. Dinos a qué hora pasas y te lo tenemos listo en barra.
            </p>
          </div>

          <dl className="grid gap-px overflow-hidden rounded-2xl border border-crema/15 bg-crema/10 text-sm backdrop-blur-md lg:col-span-5">
            <Dato icono="clock" titulo="Recogida">
              {textoRecogida}
            </Dato>
            <Dato icono="receipt" titulo="Pago">
              {pago}
            </Dato>
            <Dato icono="phone" titulo="¿Dudas o pedido grande?">
              <a href={SITE.phone.href} className="underline decoration-crema/40 underline-offset-4 hover:text-white">
                {SITE.phone.display}
              </a>
            </Dato>
          </dl>
        </div>

        <ol className="grid grid-cols-3 border-t border-crema/10 bg-carbon/60 backdrop-blur-md">
          {PASOS.map((p, n) => (
            <li key={p.titulo} className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-10 lg:px-14">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-crema/10 text-crema">
                <Icon name={p.icono} className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.8rem] font-semibold leading-tight sm:text-sm">
                  <span className="text-crema/50 tabular-nums">{n + 1}.</span> {p.titulo}
                </span>
                <span className="hidden text-xs text-crema/60 sm:block">{p.texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </header>

      <div className="mt-6">
        <ActiveOrderBanner />
      </div>

      {/* Pestañas: siempre a mano al bajar por la carta. */}
      <div id="llevar-pestanas" className="sticky top-16 z-20 -mx-4 scroll-mt-16 bg-crema/95 px-4 py-3 backdrop-blur sm:top-20 sm:scroll-mt-20">
        <div role="tablist" aria-label="Qué quieres pedir" className={`grid gap-1 rounded-full bg-papel-2 p-1 sm:inline-grid sm:w-auto ${pestanas.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {pestanas.map(([k, label, extra]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={vista === k}
              onClick={() => setVista(k)}
              className="min-h-11 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-carbon-muted transition-colors aria-selected:bg-carbon aria-selected:text-crema sm:px-6"
            >
              {label}
              {extra ? <span className="ml-1.5 hidden font-normal opacity-70 sm:inline">· {extra}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {vista === "menu" ? (
        hayMenu ? (
          <ComponerMenu menu={menu!} puedeAnadir={Boolean(config)} fotoPorNombre={fotoPorNombre} />
        ) : (
          <div className="mt-6 max-w-xl rounded-3xl border border-tinta-line bg-[#FFFDF8] p-8">
            <p className="kicker text-brasa">Menú del día</p>
            <p className="mt-3 font-display text-2xl text-carbon">Ahora mismo no está disponible</p>
            <p className="mt-2 text-carbon-muted">
              Lo publicamos cada día laborable a las 8:00 y se puede pedir para llevar hasta las {config?.menu_hasta ?? "16:00"}. Mientras tanto, tienes toda la carta.
            </p>
            <button type="button" onClick={() => irA("carta")} className="btn-secondary mt-6">
              Ver la carta
            </button>
          </div>
        )
      ) : vista === "carta" ? (
        <div className="mt-2">
          <IndiceSecciones secciones={comida} prefijo="llevar" />
          <div className="mt-6 grid gap-12">
            {comida.map((s) => (
              <section key={s.id} id={`llevar-${s.slug}`} aria-labelledby={`llevar-${s.slug}-t`} className="scroll-mt-40">
                <CabeceraSeccion id={`llevar-${s.slug}-t`} nombre={s.nombre} n={s.items.length} nota={s.nota} unidad="platos" />
                <ul className="divide-y divide-carbon/10">
                  {s.items.map((it, i) => (
                    <li key={it.id} className="flex items-center gap-4 py-4">
                      {/* Como en /carta: la foto del plato si la hay; si no, su tipo ilustrado. */}
                      <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => abrir(s, i)} className="shrink-0">
                        <MiniaturaPlato nombre={it.nombre} foto={it.imagen?.src} seccion={s.slug} className="h-16 w-16" />
                      </button>
                      <button type="button" onClick={() => abrir(s, i)} className="min-w-0 flex-1 text-left">
                        <span className="block font-display text-lg leading-snug text-carbon">{it.nombre}</span>
                        {it.descripcion ? <span className="mt-0.5 line-clamp-2 block text-sm text-carbon-muted">{it.descripcion}</span> : null}
                        <Precio item={it} />
                      </button>
                      {controles && controles.sePuedePedir(it) ? <AnadirControl item={it} cart={controles} onRequiereFicha={() => abrir(s, i)} compacto /> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {vinos.length ? (
            <button
              type="button"
              onClick={() => irA("vinos")}
              className="group mt-14 flex w-full items-center gap-4 rounded-3xl bg-[#2B1A20] p-6 text-left text-crema sm:p-8"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-crema/10">
                <Icon name="wine" className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-2xl leading-tight">¿Una botella para acompañar?</span>
                <span className="mt-1 block text-sm text-crema/70">{nVinos} vinos de nuestra bodega, al mismo pedido.</span>
              </span>
              <Icon name="arrow" className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </button>
          ) : null}
        </div>
      ) : (
        <CartaVinos secciones={vinos} controles={controles} onAbrir={abrir} />
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

function Dato({ icono, titulo, children }: { icono: IconName; titulo: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-carbon/30 px-5 py-3 sm:py-4">
      <Icon name={icono} className="mt-0.5 h-4 w-4 shrink-0 text-brasa" />
      <div className="min-w-0">
        <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-crema/60">{titulo}</dt>
        <dd className="mt-0.5 text-crema">{children}</dd>
      </div>
    </div>
  );
}

function IndiceSecciones({ secciones, prefijo, corto = false }: { secciones: CartaSeccion[]; prefijo: string; corto?: boolean }) {
  if (secciones.length < 2) return null;
  return (
    <nav aria-label="Secciones" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
      {secciones.map((s) => (
        <a
          key={s.id}
          href={`#${prefijo}-${s.slug}`}
          className="shrink-0 rounded-full border border-carbon/15 px-4 py-2 text-sm font-semibold text-carbon transition-colors hover:border-carbon/50"
        >
          {corto ? nombreCorto(s.nombre) : s.nombre}
        </a>
      ))}
    </nav>
  );
}

function CabeceraSeccion({ id, nombre, n, nota, unidad }: { id: string; nombre: string; n: number; nota?: string; unidad: string }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-b border-carbon/15 pb-2">
        <h2 id={id} className="font-display text-3xl text-carbon">
          {nombre}
        </h2>
        <span className="text-xs text-carbon-muted">
          {n} {unidad}
        </span>
      </div>
      {nota ? <p className="mt-2 text-sm text-carbon-muted">{nota}</p> : null}
    </>
  );
}

function Precio({ item }: { item: CartaItem }) {
  return (
    <span className="mt-1 block text-sm font-semibold tabular-nums text-carbon">
      {item.precioCentimos !== null ? formatCentimos(item.precioCentimos) : <span className="font-normal text-carbon-muted">Precio en el local</span>}
    </span>
  );
}

/**
 * Los vinos como en una carta de vinos: solo texto (nombre, bodega o D.O. y
 * precio), en dos columnas en escritorio. Sin fotos: con más de 70 referencias
 * la foto de cada botella hace la lista larga y repetitiva.
 */
function CartaVinos({
  secciones,
  controles,
  onAbrir,
}: {
  secciones: CartaSeccion[];
  controles: CartaCartControls | undefined;
  onAbrir: (s: CartaSeccion, i: number) => void;
}) {
  return (
    <div className="mt-2">
      <p className="max-w-2xl text-carbon-muted">
        Nuestra bodega para llevar a casa o a la oficina, al mismo pedido que la comida. Solo para mayores de 18 años.
      </p>
      <div className="mt-4">
        <IndiceSecciones secciones={secciones} prefijo="vinos" corto />
      </div>
      <div className="mt-6 grid gap-12">
        {secciones.map((s) => (
          <section key={s.id} id={`vinos-${s.slug}`} aria-labelledby={`vinos-${s.slug}-t`} className="scroll-mt-40">
            <CabeceraSeccion id={`vinos-${s.slug}-t`} nombre={s.nombre} n={s.items.length} nota={s.nota} unidad="vinos" />
            <ul className="grid lg:grid-cols-2 lg:gap-x-12">
              {s.items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-4 border-b border-carbon/10 py-3.5">
                  <button type="button" onClick={() => onAbrir(s, i)} className="min-w-0 flex-1 text-left">
                    <span className="flex items-baseline gap-3">
                      <span className="min-w-0 font-display text-[1.05rem] leading-snug text-carbon">{it.nombre}</span>
                      <span aria-hidden="true" className="min-w-4 flex-1 translate-y-[-0.2rem] border-b border-dotted border-carbon/25" />
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-carbon">
                        {it.precioCentimos !== null ? formatCentimos(it.precioCentimos) : "—"}
                      </span>
                    </span>
                    {it.descripcion ? <span className="mt-0.5 line-clamp-1 block text-xs text-carbon-muted">{it.descripcion}</span> : null}
                  </button>
                  {controles && controles.sePuedePedir(it) ? <AnadirControl item={it} cart={controles} onRequiereFicha={() => onAbrir(s, i)} compacto /> : null}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** El menú como se compone en barra: un plato de cada grupo y cuántos menús así. */
function ComponerMenu({ menu, puedeAnadir, fotoPorNombre }: { menu: MenuParaLlevar; puedeAnadir: boolean; fotoPorNombre: Map<string, string> }) {
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
                  className="flex min-h-14 items-center gap-3 rounded-2xl border border-carbon/15 bg-[#FFFDF8] py-2 pl-2 pr-4 text-left aria-pressed:border-carbon aria-pressed:bg-carbon aria-pressed:text-crema"
                >
                  <MiniaturaPlato nombre={p.nombre} foto={fotoPorNombre.get(normalizarNombre(p.nombre))} seccion={p.tipo} className="h-14 w-14" />
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
