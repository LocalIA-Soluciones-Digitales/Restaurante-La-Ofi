"use client";

import { type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react";
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

/** Minúsculas y sin tildes, para buscar «jamon» y encontrar «Jamón». */
const plano = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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

  const barra = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = useState("");
  const q = plano(texto.trim());
  const buscando = q.length >= 2;
  // Busca a la vez en la carta y en los vinos, por nombre y descripción.
  const resultados = useMemo(
    () =>
      !buscando
        ? []
        : [...comida, ...vinos]
            .map((s) => ({ s, items: s.items.map((it, i) => ({ it, i })).filter(({ it }) => plano(`${it.nombre} ${it.descripcion ?? ""} ${s.nombre}`).includes(q)) }))
            .filter((r) => r.items.length > 0),
    [buscando, q, comida, vinos],
  );

  const seccionesVista = buscando ? [] : vista === "carta" ? comida : vista === "vinos" ? vinos : [];
  const prefijo = vista === "vinos" ? "vinos" : "llevar";
  const activa = useSeccionActiva(
    seccionesVista.map((s) => `${prefijo}-${s.slug}`),
    barra,
  );

  /** Lleva a la sección y la deja justo debajo de la barra fija. */
  const irASeccion = (id: string, intentos = 3) => {
    const el = document.getElementById(id);
    if (!el) return;
    const tope = barra.current?.getBoundingClientRect().bottom ?? 0;
    const destino = Math.min(el.getBoundingClientRect().top + window.scrollY - tope - 12, document.documentElement.scrollHeight - window.innerHeight);
    if (Math.abs(destino - window.scrollY) < 4) return;
    window.scrollTo({ top: destino, behavior: "smooth" });
    // Las fotos que se cargan por el camino mueven la sección: al parar, se corrige.
    if (intentos > 1) {
      let hecho = false;
      const corregir = () => {
        if (hecho) return;
        hecho = true;
        window.removeEventListener("scrollend", corregir);
        irASeccion(id, intentos - 1);
      };
      window.addEventListener("scrollend", corregir, { once: true });
      window.setTimeout(corregir, 1200);
    }
  };

  const cambiarVista = (v: Vista) => {
    setVista(v);
    setTexto("");
  };

  const alPrincipio = (behavior: ScrollBehavior) => {
    const ancla = document.getElementById("llevar-ancla");
    // Solo si ya se ha bajado más allá: si la barra aún no está fija, no se mueve nada.
    if (ancla && ancla.getBoundingClientRect().top < 0) ancla.scrollIntoView({ behavior, block: "start" });
  };

  // Al empezar a buscar, los resultados se ven desde arriba (no a mitad de página).
  useEffect(() => {
    if (buscando) alPrincipio("auto");
  }, [buscando]);

  const irA = (v: Vista) => {
    cambiarVista(v);
    alPrincipio("smooth");
  };

  const abrir = (seccion: CartaSeccion, index: number) => setDetalle({ seccion, index });

  return (
    <div className="pb-32">
      {/* Cabecera: foto de la barra a todo el ancho y por detrás del menú (como Vinos y
          Menú del día), titular y lo que hay que saber antes de pedir. */}
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

        <div className="border-t border-crema/10 bg-carbon/60 backdrop-blur-md">
        <ol className="container-page grid grid-cols-3">
          {PASOS.map((p, n) => (
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

      {/* Dónde empieza la barra fija: para volver aquí al cambiar de pestaña o al buscar. */}
      <div id="llevar-ancla" aria-hidden="true" className="scroll-mt-16 sm:scroll-mt-20" />
      {/* Barra fija: pestañas, buscador y secciones, siempre a mano al bajar por la carta. */}
      <div ref={barra} id="llevar-pestanas" className="sticky top-16 z-20 -mx-4 scroll-mt-16 border-b border-carbon/10 bg-crema/95 px-4 py-3 backdrop-blur sm:top-20 sm:scroll-mt-20">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div role="tablist" aria-label="Qué quieres pedir" className={`grid gap-1 rounded-full bg-papel-2 p-1 sm:inline-grid sm:w-auto ${pestanas.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {pestanas.map(([k, label, extra]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={vista === k && !buscando}
                onClick={() => cambiarVista(k)}
                className="min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-carbon-muted transition-colors aria-selected:bg-carbon aria-selected:text-crema sm:px-6"
              >
                {label}
                {extra ? <span className="ml-1.5 hidden font-normal opacity-70 sm:inline">· {extra}</span> : null}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 gap-2 sm:justify-end">
            <label className="relative min-w-0 flex-1 sm:max-w-sm">
              <span className="sr-only">Buscar en la carta y los vinos</span>
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-muted" />
              <input
                type="text"
                inputMode="search"
                enterKeyHint="search"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setTexto("");
                }}
                placeholder="Buscar plato o vino"
                className="h-11 w-full rounded-full border border-carbon/15 bg-[#FFFDF8] pl-10 pr-10 text-base text-carbon placeholder:text-carbon-muted focus:border-carbon focus:outline-none sm:h-10 sm:text-sm"
              />
              {texto ? (
                <button
                  type="button"
                  onClick={() => setTexto("")}
                  aria-label="Borrar búsqueda"
                  className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-carbon-muted hover:bg-carbon/10"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            {/* En el móvil, las secciones en un desplegable junto al buscador. */}
            {seccionesVista.length > 1 ? (
              <label className="relative shrink-0 sm:hidden">
                <span className="sr-only">Ir a una sección</span>
                <select
                  value={activa ?? ""}
                  onChange={(e) => {
                    if (e.target.value) irASeccion(e.target.value);
                  }}
                  className="h-11 w-[9.5rem] appearance-none truncate rounded-full border border-carbon/15 bg-[#FFFDF8] pl-4 pr-9 text-sm font-semibold text-carbon focus:border-carbon focus:outline-none"
                >
                  <option value="" disabled>
                    Secciones
                  </option>
                  {seccionesVista.map((s) => (
                    <option key={s.id} value={`${prefijo}-${s.slug}`}>
                      {vista === "vinos" ? nombreCorto(s.nombre) : s.nombre}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-carbon-muted" />
              </label>
            ) : null}
          </div>
        </div>

        {/* En escritorio, las secciones en chips dentro de la barra; se marca en la que estás. */}
        <IndiceSecciones secciones={seccionesVista} prefijo={prefijo} corto={vista === "vinos"} activa={activa} onIr={irASeccion} />
      </div>

      {buscando ? (
        <Resultados texto={texto.trim()} resultados={resultados} controles={controles} onAbrir={abrir} onLimpiar={() => setTexto("")} />
      ) : vista === "menu" ? (
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
        <div className="mt-6">
          <div className="grid gap-12">
            {comida.map((s) => (
              <section key={s.id} id={`llevar-${s.slug}`} aria-labelledby={`llevar-${s.slug}-t`} className="scroll-mt-56">
                <CabeceraSeccion id={`llevar-${s.slug}-t`} nombre={s.nombre} n={s.items.length} nota={s.nota} unidad="platos" />
                <ul className="divide-y divide-carbon/10">
                  {s.items.map((it, i) => (
                    <FilaPlato key={it.id} item={it} seccion={s} onAbrir={() => abrir(s, i)} controles={controles} />
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

/**
 * La sección que se está viendo: la última cuyo título ya ha pasado por debajo de la
 * barra fija. Se recalcula al hacer scroll (con requestAnimationFrame, sin tirones).
 */
function useSeccionActiva(ids: string[], barra: RefObject<HTMLDivElement | null>): string | null {
  const [activa, setActiva] = useState<string | null>(null);
  const clave = ids.join("|");
  useEffect(() => {
    if (!ids.length) {
      setActiva(null);
      return;
    }
    let frame = 0;
    const medir = () => {
      frame = 0;
      const tope = (barra.current?.getBoundingClientRect().bottom ?? 0) + 24;
      let actual: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= tope) actual = id;
      }
      // Al final de la página la última sección no llega arriba: si se ve entera, es esa.
      const ultima = document.getElementById(ids[ids.length - 1]!);
      if (ultima && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160 && ultima.getBoundingClientRect().top < window.innerHeight) {
        actual = ultima.id;
      }
      setActiva(actual);
    };
    const alMover = () => {
      if (!frame) frame = window.requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => {
      window.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
      if (frame) window.cancelAnimationFrame(frame);
    };
    // `ids` cambia de referencia en cada render: se vigila por su contenido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, barra]);
  return activa;
}

function IndiceSecciones({
  secciones,
  prefijo,
  corto = false,
  activa,
  onIr,
}: {
  secciones: CartaSeccion[];
  prefijo: string;
  corto?: boolean;
  activa: string | null;
  onIr: (id: string) => void;
}) {
  const nav = useRef<HTMLElement>(null);
  // Que el chip de la sección activa se vea siempre (sin mover la página).
  useEffect(() => {
    const cont = nav.current;
    const chip = activa ? cont?.querySelector<HTMLElement>(`[data-id="${activa}"]`) : null;
    if (!cont || !chip) return;
    const izq = chip.offsetLeft - cont.offsetLeft;
    if (izq < cont.scrollLeft || izq + chip.offsetWidth > cont.scrollLeft + cont.clientWidth) {
      cont.scrollTo({ left: izq - 16, behavior: "smooth" });
    }
  }, [activa]);

  if (secciones.length < 2) return null;
  return (
    <nav ref={nav} aria-label="Secciones" className="-mx-4 mt-3 hidden gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:flex">
      {secciones.map((s) => {
        const id = `${prefijo}-${s.slug}`;
        const esta = activa === id;
        return (
          <a
            key={s.id}
            href={`#${id}`}
            data-id={id}
            aria-current={esta ? "location" : undefined}
            onClick={(e) => {
              e.preventDefault();
              onIr(id);
            }}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              esta ? "border-carbon bg-carbon text-crema" : "border-carbon/15 text-carbon hover:border-carbon/50"
            }`}
          >
            {corto ? nombreCorto(s.nombre) : s.nombre}
          </a>
        );
      })}
    </nav>
  );
}

function FilaPlato({ item, seccion, onAbrir, controles }: { item: CartaItem; seccion: CartaSeccion; onAbrir: () => void; controles: CartaCartControls | undefined }) {
  return (
    <li className="flex items-center gap-4 py-4">
      {/* Como en /carta: la foto del plato si la hay; si no, su tipo ilustrado. */}
      <button type="button" tabIndex={-1} aria-hidden="true" onClick={onAbrir} className="shrink-0">
        <MiniaturaPlato nombre={item.nombre} foto={item.imagen?.src} seccion={seccion.slug} className="h-16 w-16" />
      </button>
      <button type="button" onClick={onAbrir} className="min-w-0 flex-1 text-left">
        <span className="block font-display text-lg leading-snug text-carbon">{item.nombre}</span>
        {item.descripcion ? <span className="mt-0.5 line-clamp-2 block text-sm text-carbon-muted">{item.descripcion}</span> : null}
        <Precio item={item} />
      </button>
      {controles && controles.sePuedePedir(item) ? <AnadirControl item={item} cart={controles} onRequiereFicha={onAbrir} compacto /> : null}
    </li>
  );
}

/** Lo encontrado en la carta y en los vinos, agrupado por sección. */
function Resultados({
  texto,
  resultados,
  controles,
  onAbrir,
  onLimpiar,
}: {
  texto: string;
  resultados: { s: CartaSeccion; items: { it: CartaItem; i: number }[] }[];
  controles: CartaCartControls | undefined;
  onAbrir: (s: CartaSeccion, i: number) => void;
  onLimpiar: () => void;
}) {
  const n = resultados.reduce((a, r) => a + r.items.length, 0);
  return (
    <div className="mt-6">
      <p role="status" className="text-sm text-carbon-muted">
        {n ? (
          <>
            {n} {n === 1 ? "resultado" : "resultados"} para <b className="text-carbon">«{texto}»</b>
          </>
        ) : null}
      </p>
      {n === 0 ? (
        <div className="mt-2 grid place-items-center gap-3 rounded-3xl border border-tinta-line bg-[#FFFDF8] px-6 py-12 text-center">
          <Icon name="search" className="h-7 w-7 text-carbon-muted" />
          <p className="font-display text-2xl text-carbon">Nada con «{texto}»</p>
          <p className="max-w-sm text-sm text-carbon-muted">Prueba con otra palabra, o llámanos y te decimos si lo tenemos.</p>
          <button type="button" onClick={onLimpiar} className="btn-secondary mt-2">
            Ver toda la carta
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-10">
          {resultados.map(({ s, items }) => (
            <section key={s.id} aria-label={s.nombre}>
              <CabeceraSeccion id={`buscar-${s.slug}`} nombre={s.nombre} n={items.length} unidad={esVino(s) ? "vinos" : "platos"} />
              <ul className="divide-y divide-carbon/10">
                {items.map(({ it, i }) => (
                  <FilaPlato key={it.id} item={it} seccion={s} onAbrir={() => onAbrir(s, i)} controles={controles} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
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
          {n} {n === 1 ? unidad.replace(/s$/, "") : unidad}
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
      <div className="mt-8 grid gap-12">
        {secciones.map((s) => (
          <section key={s.id} id={`vinos-${s.slug}`} aria-labelledby={`vinos-${s.slug}-t`} className="scroll-mt-56">
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
