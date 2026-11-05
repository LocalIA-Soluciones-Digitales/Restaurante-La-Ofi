"use client";

import { type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { MiniaturaPlato } from "@/components/carta/MiniaturaPlato";
import { Photo } from "@/components/media/Photo";
import { ActiveOrderBanner } from "@/components/pedir/ActiveOrderBanner";
import { useCart } from "@/components/pedir/cart-context";
import { Icon, type IconName } from "@/components/ui/Icon";
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
}: {
  secciones: CartaSeccion[];
  config: ConfigPedidos | null;
  menu: MenuParaLlevar | null;
  /** Tienda de encargos de vino; sin ella no se anuncia. */
  vinosHref?: string;
}) {
  const { pedirDesde, pedirHasta, recogerDesde, recogerHasta } = horarioEncargos(config);
  const sinEncargo = motivoSinEncargo(config);
  const fotoPorNombre = useFotosMenu(secciones);
  const pago = config?.pagos.online && config.pagos.en_local ? "Online o al recoger" : config?.pagos.online ? "Online" : "Al recoger, en barra";

  const pasos: { icono: IconName; titulo: string; texto: string }[] = [
    { icono: "utensils", titulo: "Elige tu menú", texto: `De ${pedirDesde} a ${pedirHasta}` },
    { icono: "clock", titulo: "Pon la hora", texto: `Hoy, de ${recogerDesde} a ${recogerHasta}` },
    { icono: "bag", titulo: "Recoge en barra", texto: "Te lo tenemos preparado" },
  ];

  return (
    <div className="pb-32">
      {/* Cabecera: foto de la barra a todo el ancho y por detrás del menú (como Vinos y
          Menú del día), titular y lo que hay que saber antes de encargar. */}
      <header data-header="light" className="relative isolate overflow-hidden bg-carbon text-crema">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <Photo img="barra" sizes="100vw" priority decorative mobileBelow={640} imgClassName="motion-safe:animate-kenburns" />
          {/* Arriba oscuro para que el menú se lea; a la izquierda, para el titular. */}
          <div className="absolute inset-0 bg-gradient-to-t from-carbon via-carbon/75 to-carbon/40 lg:bg-gradient-to-r lg:from-carbon lg:via-carbon/80 lg:to-carbon/20" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-carbon/70 to-transparent" />
        </div>

        <div className="container-page grid gap-8 pb-8 pt-28 sm:gap-10 sm:pb-10 sm:pt-36 lg:grid-cols-12 lg:items-end lg:pb-14 lg:pt-44">
          <div className="lg:col-span-7">
            <p className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-crema/80">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brasa" />
              Para llevar
            </p>
            <h1 className="mt-4 font-display text-[clamp(3rem,9vw,6rem)] font-light leading-[0.9] tracking-tight">
              El menú, <em className="font-normal italic">para llevar</em>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-crema/80 sm:text-lg">
              Encarga el menú del día por la mañana y pasa a recogerlo a mediodía: te lo tenemos listo en barra.
            </p>
          </div>

          <dl className="grid gap-px overflow-hidden rounded-2xl border border-crema/15 bg-crema/10 text-sm backdrop-blur-md lg:col-span-5">
            <Dato icono="utensils" titulo="Encargos">
              Hoy, de {pedirDesde} a {pedirHasta}
            </Dato>
            <Dato icono="clock" titulo="Recogida">
              Hoy, de {recogerDesde} a {recogerHasta}
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

        <div className="border-t border-crema/10 bg-carbon/60 backdrop-blur-md">
          <ol className="container-page grid grid-cols-3">
            {pasos.map((p, n) => (
              <li key={p.titulo} className="flex flex-col items-center gap-2 px-1 py-4 text-center sm:flex-row sm:gap-3 sm:px-0 sm:py-5 sm:pr-2 sm:text-left">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-crema/10 text-crema">
                  <Icon name={p.icono} className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-balance text-[0.8rem] font-semibold leading-tight sm:text-sm">
                    <span className="text-crema/50 tabular-nums">{n + 1}.</span> {p.titulo}
                  </span>
                  <span className="hidden text-xs text-crema/60 sm:block">{p.texto}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <div className="container-page">
        <div className="mt-6">
          <ActiveOrderBanner />
        </div>

        {menuListo(menu) ? (
          <>
            {sinEncargo ? <AvisoEncargo>{sinEncargo}</AvisoEncargo> : null}
            <ComponerMenu menu={menu} puedeAnadir={!sinEncargo} fotoPorNombre={fotoPorNombre} />
          </>
        ) : (
          <div className="mt-6 max-w-xl rounded-3xl border border-tinta-line bg-[#FFFDF8] p-8">
            <p className="kicker text-brasa">Menú del día</p>
            <p className="mt-3 font-display text-2xl text-carbon">Ahora mismo no está disponible</p>
            <p className="mt-2 text-carbon-muted">
              Lo publicamos cada día laborable por la mañana. Se encarga de {pedirDesde} a {pedirHasta} y se recoge de {recogerDesde} a {recogerHasta}. Para llevar
              solo preparamos el menú del día.
            </p>
            <a href={SITE.phone.href} className="btn-secondary mt-6">
              <Icon name="phone" className="h-4 w-4" />
              {SITE.phone.display}
            </a>
          </div>
        )}

        {vinosHref ? (
          <Link href={vinosHref} className="group mt-14 flex w-full items-center gap-4 rounded-3xl bg-[#2B1A20] p-6 text-left text-crema sm:p-8">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-crema/10">
              <Icon name="wine" className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-2xl leading-tight">¿Una botella para casa?</span>
              <span className="mt-1 block text-sm text-crema/70">El vino se encarga aparte, en nuestra bodega para llevar.</span>
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

/** El menú como se compone en barra: un plato de cada grupo y cuántos menús así. */
export function ComponerMenu({ menu, puedeAnadir, fotoPorNombre }: { menu: MenuParaLlevar; puedeAnadir: boolean; fotoPorNombre: Map<string, string> }) {
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
