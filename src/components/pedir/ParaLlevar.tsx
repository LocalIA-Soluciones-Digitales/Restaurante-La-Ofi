"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { MiniaturaPlato } from "@/components/carta/MiniaturaPlato";
import { Photo } from "@/components/media/Photo";
import { ActiveOrderBanner } from "@/components/pedir/ActiveOrderBanner";
import { useCart } from "@/components/pedir/cart-context";
import { Icon } from "@/components/ui/Icon";
import { normalizarNombre } from "@/lib/carta-fotos";
import { vibrar } from "@/lib/haptics";
import { formatCentimos } from "@/lib/format";
import { hayRecogida } from "@/lib/pedidos/franjas";
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

const hhmm = (v: string | undefined, porDefecto: string) => (v ?? porDefecto).slice(0, 5);

/** El menú del día con sus platos y precio: ¿se puede componer? */
export const menuListo = (menu: MenuParaLlevar | null): menu is MenuParaLlevar & { precio_centimos: number } =>
  Boolean(menu && menu.platos.length > 0 && menu.precio_centimos !== null);

/** Horario de los encargos de comida (de la config; por defecto, el de 05/11/2026). */
export function horarioEncargos(config: ConfigPedidos | null) {
  return {
    pedirDesde: hhmm(config?.pedir_desde, "09:00"),
    pedirHasta: hhmm(config?.pedir_hasta, "12:00"),
    recogerDesde: hhmm(config?.recogida_desde, "13:00"),
    recogerHasta: hhmm(config?.recogida_hasta, "15:00"),
  };
}

/** Por qué ahora no se puede encargar (o null si se puede). */
export function motivoSinEncargo(config: ConfigPedidos | null, ahora = new Date()): string | null {
  if (!config) return `Los encargos online aún no están activos: llámanos al ${SITE.phone.display}.`;
  if (hayRecogida(config)) return null;
  const { pedirDesde, pedirHasta } = horarioEncargos(config);
  const hora = HORA.format(ahora);
  if (hora < pedirDesde) return `Los encargos del menú se abren a las ${pedirDesde}. Vuelve entonces y elige tu menú.`;
  if (hora >= pedirHasta) return `Hoy ya no se aceptan encargos: el menú se encarga de ${pedirDesde} a ${pedirHasta}. Puedes venir a comer o llamarnos al ${SITE.phone.display}.`;
  return `Hoy ya no quedan horas de recogida libres. Llámanos al ${SITE.phone.display} y lo vemos.`;
}

/** En qué punto del día están los encargos, en una frase corta para la cabecera. */
function estadoEncargos(config: ConfigPedidos | null, ahora = new Date()): { abierto: boolean; texto: string } {
  const { pedirDesde, pedirHasta } = horarioEncargos(config);
  if (!config) return { abierto: false, texto: "De momento, encargos por teléfono" };
  const hora = HORA.format(ahora);
  if (hayRecogida(config)) {
    // Fuera de la franja de hoy aún puede haber horas de otros días.
    return { abierto: true, texto: hora >= pedirDesde && hora < pedirHasta ? `Encargos abiertos hasta las ${pedirHasta}` : "Encargos abiertos para los próximos días" };
  }
  if (hora < pedirDesde) return { abierto: false, texto: `Encargos desde las ${pedirDesde}` };
  return { abierto: false, texto: `Cerrado por hoy · encargos desde las ${pedirDesde}` };
}

/**
 * «Pedir para recoger» (desde el 05/11/2026): para llevar solo el menú del día de hoy.
 * Se encarga de 9:00 a 12:00 y se recoge ese mismo día de 13:00 a 15:00 (ajuste
 * «recogida»). Nada de la carta; el vino se encarga aparte, en /vinos/encargar.
 */
export function ParaLlevar({
  secciones,
  config,
  menu,
  vinosHref,
  onAbrirCesta,
}: {
  secciones: CartaSeccion[];
  config: ConfigPedidos | null;
  menu: MenuParaLlevar | null;
  /** Tienda de encargos de vino; sin ella no se anuncia. */
  vinosHref?: string;
  /** Abre la cesta para terminar el encargo. */
  onAbrirCesta?: () => void;
}) {
  const { pedirDesde, pedirHasta, recogerDesde, recogerHasta } = horarioEncargos(config);
  const sinEncargo = motivoSinEncargo(config);
  const estado = estadoEncargos(config);
  const fotoPorNombre = useFotosMenu(secciones);
  const pago = config?.pagos.online && config.pagos.en_local ? "online o al recoger" : config?.pagos.online ? "online, al encargar" : "al recoger, en barra";
  const antesDeCerrar = HORA.format(new Date()) < pedirHasta;

  const pasos: { titulo: string; detalle: string; hora?: string }[] = [
    { titulo: "Elige tu menú", detalle: "Un plato de cada grupo, desde el móvil", hora: `${pedirDesde}–${pedirHasta}` },
    { titulo: "Pon la hora de recogida", detalle: "Hoy mismo, a mediodía", hora: `${recogerDesde}–${recogerHasta}` },
    { titulo: "Recógelo en barra", detalle: `Te lo tenemos listo. Pago ${pago}` },
  ];

  return (
    <div className="pb-32">
      {/* Cabecera: foto de la barra a todo el ancho y por detrás del menú (como Vinos y
          Menú del día). A la izquierda, titular y estado; a la derecha, cómo funciona. */}
      <header data-header="light" className="relative isolate overflow-hidden bg-carbon text-crema">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Photo img="barra" sizes="100vw" priority decorative mobileBelow={640} imgClassName="motion-safe:animate-kenburns" />
          <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/80 to-carbon/45 lg:bg-gradient-to-r lg:from-carbon lg:via-carbon/85 lg:to-carbon/30" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-carbon/70 to-transparent" />
        </div>

        <div className="container-page grid gap-10 pb-12 pt-28 sm:pb-14 sm:pt-36 lg:grid-cols-12 lg:items-end lg:gap-12 lg:pb-20 lg:pt-44">
          <div className="lg:col-span-7">
            <p className="kicker flex items-center gap-3 text-crema/75">
              <span aria-hidden="true" className="h-px w-8 bg-brasa" />
              Para llevar · Menú del día
            </p>
            <h1 className="mt-5 text-balance font-display text-[clamp(2.9rem,8vw,5.75rem)] font-light leading-[0.92] tracking-[-0.025em]">
              El menú del día, <em className="font-normal italic text-brasa-soft">para llevar</em>
            </h1>
            <p className="mt-6 max-w-[34rem] text-base leading-relaxed text-crema/75 sm:text-lg">
              Encárgalo por la mañana y pásate a mediodía: te lo tenemos listo en barra, recién hecho y sin esperas.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {menuListo(menu) && estado.abierto ? (
                <a href="#menu" className="btn-primary px-6">
                  Elegir mi menú
                  <Icon name="arrow" className="h-4 w-4 rotate-90" />
                </a>
              ) : null}
              <span className="inline-flex min-h-12 items-center gap-2.5 rounded-md border border-crema/20 bg-crema/[0.06] px-4 text-sm font-medium text-crema/90 backdrop-blur-sm">
                <span aria-hidden="true" className="relative flex h-2 w-2">
                  {estado.abierto ? <span className="absolute inset-0 rounded-full bg-[#9FD37A] motion-safe:animate-ping" /> : null}
                  <span className={`relative h-2 w-2 rounded-full ${estado.abierto ? "bg-[#9FD37A]" : "bg-crema/45"}`} />
                </span>
                {estado.texto}
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-crema/15 bg-carbon/45 p-6 backdrop-blur-md sm:p-7">
              <p className="kicker text-crema/55">Cómo funciona</p>
              <ol className="mt-5 grid">
                {pasos.map((p, n) => (
                  <li key={p.titulo} className="relative grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-x-4 pb-6 last:pb-0">
                    {n < pasos.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-crema/15" /> : null}
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-crema/25 font-display text-sm tabular-nums">{n + 1}</span>
                    <span className="min-w-0 pt-1">
                      <span className="block font-semibold leading-tight">{p.titulo}</span>
                      <span className="mt-1 block text-sm leading-snug text-crema/60">{p.detalle}</span>
                    </span>
                    <span className="pt-1 font-display text-base tabular-nums text-brasa-soft">{p.hora ?? ""}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-6 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-crema/10 pt-5 text-sm text-crema/65">
                ¿Dudas o pedido grande?
                <a href={SITE.phone.href} className="inline-flex items-center gap-2 font-semibold text-crema underline decoration-crema/30 underline-offset-4 hover:decoration-crema">
                  <Icon name="phone" className="h-4 w-4" />
                  {SITE.phone.display}
                </a>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container-page">
        <div className="mt-6">
          <ActiveOrderBanner />
        </div>

        {menuListo(menu) ? (
          <section id="menu" aria-labelledby="menu-titulo" className="scroll-mt-28 pt-8 sm:pt-12">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-tinta-line pb-6">
              <div>
                <p className="kicker text-brasa">Menú del día · {formatCentimos(menu.precio_centimos)}</p>
                <h2 id="menu-titulo" className="t-h2 mt-3 text-carbon">
                  Compón tu menú
                </h2>
              </div>
              <p className="max-w-xs text-sm text-carbon-muted">Elige un plato de cada grupo. Puedes añadir varios menús, cada uno a tu gusto.</p>
            </div>
            {sinEncargo ? <AvisoEncargo>{sinEncargo}</AvisoEncargo> : null}
            <ComponerMenu menu={menu} puedeAnadir={!sinEncargo} fotoPorNombre={fotoPorNombre} onAbrirCesta={onAbrirCesta} />
          </section>
        ) : (
          <section className="mt-8 grid overflow-hidden rounded-3xl border border-tinta-line bg-[#FFFDF8] sm:mt-12 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <div className="p-7 sm:p-10 lg:p-12">
              <p className="kicker text-brasa">Menú del día</p>
              <h2 className="t-h3 mt-3 text-carbon sm:text-[2rem]">{antesDeCerrar ? "El menú de hoy aún no está publicado" : "Por hoy ya no hay menú para llevar"}</h2>
              <p className="mt-3 max-w-md leading-relaxed text-carbon-muted">
                {antesDeCerrar
                  ? "Lo publicamos cada día laborable por la mañana. En cuanto esté, podrás elegirlo aquí."
                  : "Lo publicamos cada día laborable por la mañana: vuelve el próximo y encárgalo a primera hora."}{" "}
                Para llevar solo preparamos el menú del día.
              </p>
              <dl className="mt-7 grid max-w-sm grid-cols-2 gap-px overflow-hidden rounded-xl border border-tinta-line bg-tinta-line text-sm">
                <div className="bg-[#FFFDF8] px-4 py-3">
                  <dt className="text-carbon-muted">Se encarga</dt>
                  <dd className="mt-0.5 font-display text-lg tabular-nums text-carbon">
                    {pedirDesde}–{pedirHasta}
                  </dd>
                </div>
                <div className="bg-[#FFFDF8] px-4 py-3">
                  <dt className="text-carbon-muted">Se recoge</dt>
                  <dd className="mt-0.5 font-display text-lg tabular-nums text-carbon">
                    {recogerDesde}–{recogerHasta}
                  </dd>
                </div>
              </dl>
              <a href={SITE.phone.href} className="btn-dark mt-7">
                <Icon name="phone" className="h-4 w-4" />
                Llamar al {SITE.phone.display}
              </a>
            </div>
            <div className="relative hidden min-h-72 md:block">
              <Photo img="brasaCarne" sizes="(min-width: 768px) 45vw, 100vw" decorative mobileBelow={0} />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-carbon/60 via-carbon/5 to-transparent" />
              <p className="absolute bottom-6 left-6 right-6 font-display text-xl leading-snug text-crema">Cocina de cada día, lista para llevar.</p>
            </div>
          </section>
        )}

        {vinosHref ? (
          <Link href={vinosHref} className="group mt-14 flex w-full items-center gap-5 rounded-3xl bg-[#2B1A20] p-6 text-left text-crema transition-colors hover:bg-[#341F27] sm:p-8">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-crema/20">
              <Icon name="wine" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl leading-tight">¿Una botella para casa?</span>
              <span className="mt-1 block text-sm text-crema/65">El vino se encarga aparte, en nuestra bodega para llevar.</span>
            </span>
            <Icon name="arrow" className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Los platos del menú del día con la foto del mismo plato en la carta, si la tiene. */
export function useFotosMenu(secciones: CartaSeccion[]) {
  return useMemo(
    () => new Map(secciones.flatMap((s) => s.items.filter((i) => i.imagen).map((i) => [normalizarNombre(i.nombre), i.imagen!.src] as const))),
    [secciones],
  );
}

export function AvisoEncargo({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mt-6 flex gap-2 rounded-2xl bg-arena p-4 text-sm text-carbon-muted">
      <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-marino" />
      {children}
    </p>
  );
}

/** El menú como se compone en barra: un plato de cada grupo y cuántos menús así. */
export function ComponerMenu({
  menu,
  puedeAnadir,
  fotoPorNombre,
  onAbrirCesta,
}: {
  menu: MenuParaLlevar;
  puedeAnadir: boolean;
  fotoPorNombre: Map<string, string>;
  onAbrirCesta?: () => void;
}) {
  const cart = useCart();
  const grupos = GRUPOS.map((g) => ({ ...g, platos: menu.platos.filter((p) => p.tipo === g.tipo).sort((a, b) => a.orden - b.orden) })).filter((g) => g.platos.length > 0);
  const [eleccion, setEleccion] = useState<Record<string, string>>(() =>
    Object.fromEntries(grupos.filter((g) => g.platos.length === 1).map((g) => [g.tipo, g.platos[0]!.id])),
  );
  const [cantidad, setCantidad] = useState(1);
  const [anadido, setAnadido] = useState(false);
  const completo = grupos.every((g) => eleccion[g.tipo]);
  const precio = menu.precio_centimos!;
  const menusEnCesta = cart.hidratado ? cart.lineas.filter((l) => l.menuPlatos).reduce((a, l) => a + l.cantidad, 0) : 0;

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
    <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="grid gap-10 lg:col-span-8">
        {grupos.map((g, n) => (
          <fieldset key={g.tipo}>
            <legend className="flex w-full items-baseline gap-3">
              <span className="font-display text-sm tabular-nums text-brasa">{String(n + 1).padStart(2, "0")}</span>
              <span className="font-display text-2xl text-carbon">{g.label}</span>
              <span className="ml-auto text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-carbon-muted">
                {g.platos.length > 1 ? `Elige uno · ${g.platos.length} opciones` : "Incluido"}
              </span>
            </legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {g.platos.map((p) => {
                const elegido = eleccion[g.tipo] === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={elegido}
                    onClick={() => setEleccion((e) => ({ ...e, [g.tipo]: p.id }))}
                    className={`group flex min-h-20 items-center gap-4 rounded-2xl border bg-[#FFFDF8] p-2.5 pr-4 text-left transition-[border-color,box-shadow] duration-200 ${
                      elegido ? "border-brasa shadow-[0_0_0_1px_#9A4527,0_12px_30px_-20px_rgb(43_39_34/0.5)]" : "border-carbon/10 hover:border-carbon/30"
                    }`}
                  >
                    <MiniaturaPlato nombre={p.nombre} foto={fotoPorNombre.get(normalizarNombre(p.nombre))} seccion={p.tipo} className="h-16 w-16" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug text-carbon">{p.nombre}</span>
                      {p.descripcion ? <span className="mt-0.5 block text-xs leading-snug text-carbon-muted">{p.descripcion}</span> : null}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors ${
                        elegido ? "border-brasa bg-brasa text-crema" : "border-carbon/25 text-transparent group-hover:border-carbon/50"
                      }`}
                    >
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <aside className="lg:col-span-4">
        <div className="rounded-3xl bg-carbon p-6 text-crema sm:p-7 lg:sticky lg:top-28">
          <div className="flex items-baseline justify-between gap-3">
            <p className="kicker text-crema/55">Tu menú</p>
            <p className="font-display text-3xl tabular-nums">{formatCentimos(precio)}</p>
          </div>
          {menu.incluye.length ? <p className="mt-1 text-right text-xs text-crema/55">Incluye {menu.incluye.join(", ").toLowerCase()}</p> : null}
          <ul className="mt-5 grid gap-3 border-t border-crema/10 pt-5 text-sm">
            {grupos.map((g) => {
              const plato = g.platos.find((p) => p.id === eleccion[g.tipo])?.nombre;
              return (
                <li key={g.tipo} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
                  <span className="text-crema/50">{g.label}</span>
                  <span className={plato ? "font-semibold" : "italic text-crema/40"}>{plato ?? "Sin elegir"}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-crema/10 pt-5">
            <span className="text-sm font-semibold">Menús así</span>
            <span className="flex items-center rounded-full border border-crema/20">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                disabled={cantidad <= 1}
                className="grid h-10 w-10 place-items-center disabled:opacity-35"
                aria-label="Un menú menos"
              >
                <Icon name="minus" className="h-4 w-4" />
              </button>
              <span aria-live="polite" className="w-7 text-center font-semibold tabular-nums">
                {cantidad}
              </span>
              <button type="button" onClick={() => setCantidad((c) => Math.min(30, c + 1))} className="grid h-10 w-10 place-items-center" aria-label="Un menú más">
                <Icon name="plus" className="h-4 w-4" />
              </button>
            </span>
          </div>
          <button type="button" onClick={anadir} disabled={!completo || !puedeAnadir} className="btn-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-45">
            <Icon name={anadido ? "check" : "bag"} className="h-4 w-4" />
            {anadido ? "Añadido a la cesta" : `Añadir · ${formatCentimos(precio * cantidad)}`}
          </button>
          <p role="status" className="mt-3 min-h-5 text-center text-xs text-crema/55">
            {!completo ? (menusEnCesta ? "¿Otro menú? Elige un plato de cada grupo." : "Elige un plato de cada grupo.") : "Puedes añadir otros menús con platos distintos."}
          </p>
          {/* Con algo en la cesta, el siguiente paso a la vista (no solo la cesta flotante). */}
          {menusEnCesta && onAbrirCesta ? (
            <button type="button" onClick={onAbrirCesta} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-crema px-5 text-sm font-semibold text-carbon transition-colors hover:bg-white">
              Ver cesta y encargar · {menusEnCesta} {menusEnCesta === 1 ? "menú" : "menús"}
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
