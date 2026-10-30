"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MiniaturaPlato } from "@/components/carta/MiniaturaPlato";
import { Photo } from "@/components/media/Photo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatCentimos, formatearFechaLarga, hoyEnMadrid } from "@/lib/format";
import { horasReservables, primerDiaReservable, type Cierre, type Semana } from "@/lib/horario";
import type { ImageKey } from "@/lib/images";
import { plazasDespacho, solicitarReserva, type ModoComida, type ReservaWeb } from "@/lib/reservas/actions";
import { SITE } from "@/lib/site";
import type { MenuDiaPlato } from "@/lib/restaurant/types";

const campo = "h-12 w-full rounded-2xl border border-carbon/15 bg-white px-4 text-base text-carbon focus:border-marino focus:outline-none";
/** Ficha elegible (día, hora, pestaña): marino cuando está marcada. */
const ficha =
  "rounded-2xl border border-carbon/12 bg-white text-carbon transition-colors hover:border-carbon/35 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:border-carbon/12 aria-pressed:border-marino aria-pressed:bg-marino aria-pressed:text-crema";

/** La hora de comer si ese día se puede; si no, la primera libre. */
const horaPorDefecto = (horas: string[]) => (horas.includes("14:00") ? "14:00" : (horas[0] ?? ""));
/** La hora del evento o, si cae fuera de las reservables, la última antes (o la primera). */
const horaDeEvento = (horas: string[], hora?: string | null) => {
  const h = hora?.slice(0, 5);
  if (!h) return horaPorDefecto(horas);
  return horas.includes(h) ? h : (horas.filter((x) => x <= h).at(-1) ?? horas[0] ?? "");
};

/** Días que se ven de un vistazo; el resto, con «Otra fecha». */
const DIAS_VISIBLES = 21;
const masDias = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
};
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-ES", { ...o, timeZone: "UTC" });
const DIA_SEMANA = fmt({ weekday: "short" });
const MES = fmt({ month: "short" });
const FECHA_CORTA = fmt({ weekday: "short", day: "numeric", month: "short" });
const comoFecha = (iso: string) => new Date(`${iso}T12:00:00Z`);

export interface CartaReserva {
  id: string;
  nombre: string;
  productos: { id: string; nombre: string; descripcion: string | null; precio_centimos: number; foto: string | null }[];
}

export interface MenuReserva {
  precio_centimos: number | null;
  platos: (MenuDiaPlato & { foto?: string | null })[];
}

type Espacio = ReservaWeb["espacio"];

interface Estado extends Omit<ReservaWeb, "comida"> {
  modo: ModoComida;
  /** id de plato → cantidad. */
  cantidades: Record<string, number>;
}

const GRUPOS_MENU: { tipo: MenuDiaPlato["tipo"]; label: string }[] = [
  { tipo: "plato", label: "Plato del día" },
  { tipo: "primero", label: "Primeros" },
  { tipo: "segundo", label: "Segundos" },
  { tipo: "postre", label: "Postres" },
];

/**
 * Reserva online. Tres caminos, como lo lleva Carlos:
 *  - Comedor: menú del día (solo hoy, de 8:00 a 16:00), carta o solo la mesa; si
 *    quieren, dicen ya qué van a comer.
 *  - El Despacho: por personas hasta su aforo (30) en cada turno; solo carta.
 *  - Un evento: no es mesa, es apuntarse. Día y hora son los del evento y solo se
 *    pregunta cuántos van: así Carlos sabe cuánta gente esperar.
 * Para llevar no es aquí: es «Pedir para recoger» (/pedir).
 * La reserva queda PENDIENTE: el local la confirma. Las horas salen del horario y
 * los cierres (mismas reglas que valida laofi_crear_reserva).
 */
export function ReservaForm({
  maxPersonas,
  aforoDespacho,
  menuFranja,
  menuHoy,
  carta,
  eventos,
  espacioInicial,
  eventoInicial,
  paraHoy,
  semana,
  cierres,
  ahora,
  privacidadHref,
}: {
  maxPersonas: number;
  aforoDespacho: number;
  menuFranja: { desde: string; hasta: string };
  /** El menú de hoy si ya está publicado y dentro de su franja (si no, null). */
  menuHoy: MenuReserva | null;
  carta: CartaReserva[];
  eventos: { slug: string; titulo: string; fecha: string; hora?: string | null; imagen?: string | null }[];
  espacioInicial: Espacio;
  eventoInicial?: string;
  paraHoy: boolean;
  semana: Semana;
  cierres: Cierre[];
  /** Hora de la petición (ISO), la misma en servidor y cliente para no desajustar la hidratación. */
  ahora: string;
  privacidadHref: string;
}) {
  const momento = useMemo(() => new Date(ahora), [ahora]);
  const hoy = hoyEnMadrid(momento);
  const hayMenu = Boolean(menuHoy && menuHoy.platos.length > 0);

  /** Horas posibles: las del horario y, con menú del día, solo las de su franja. */
  const horasDe = (x: Pick<Estado, "fecha" | "espacio" | "modo">) => {
    const base = x.fecha ? horasReservables(semana, cierres, x.fecha, momento) : [];
    return x.modo === "menu" ? base.filter((h) => h >= menuFranja.desde && h <= menuFranja.hasta) : base;
  };

  /** Mantiene el estado coherente: el menú es solo hoy, El Despacho no tiene menú, la hora existe. */
  const normalizar = (x: Estado): Estado => {
    const n = { ...x };
    const ev = n.espacio === "evento" ? eventos.find((e) => e.slug === n.evento_slug) : undefined;
    if (n.espacio === "evento") n.modo = "nada";
    if (ev) n.fecha = ev.fecha;
    if (n.espacio === "despacho" && n.modo === "menu") n.modo = "carta";
    if (n.modo === "menu" && (n.fecha !== hoy || !hayMenu)) n.modo = "nada";
    if (n.modo !== x.modo) n.cantidades = {};
    const horas = horasDe(n);
    if (ev) n.hora = horaDeEvento(horas, ev.hora);
    else if (!horas.includes(n.hora)) n.hora = horaPorDefecto(horas);
    return n;
  };

  const [f, setF] = useState<Estado>(() => {
    const espacio = espacioInicial;
    const fecha = paraHoy ? (primerDiaReservable(semana, cierres, momento) ?? "") : "";
    return normalizar({
      nombre: "",
      telefono: "",
      email: "",
      personas: 2,
      fecha,
      hora: "14:00",
      espacio,
      evento_slug: eventoInicial && eventos.some((e) => e.slug === eventoInicial) ? eventoInicial : eventos[0]?.slug,
      notas: "",
      consiente_salud: false,
      web: "",
      modo: "nada",
      cantidades: {},
    });
  });
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);
  const [plazas, setPlazas] = useState<{ fecha: string; comida: number; noche: number } | null>(null);
  const [seccion, setSeccion] = useState(carta[0]?.id ?? "");
  // Al cambiar de menú a carta (o a solo mesa) los platos elegidos ya no valen.
  const set = (p: Partial<Estado>) =>
    setF((x) => {
      const n = normalizar({ ...x, ...p });
      return n.modo !== x.modo ? { ...n, cantidades: {} } : n;
    });

  const horas = horasDe(f);
  const diaCerrado = Boolean(f.fecha) && horasReservables(semana, cierres, f.fecha, momento).length === 0;
  const avisoHoy = paraHoy && f.fecha && f.fecha !== hoy;
  const despacho = f.espacio === "despacho";
  const evento = f.espacio === "evento" ? eventos.find((e) => e.slug === f.evento_slug) : undefined;
  const dias = useMemo(
    () =>
      Array.from({ length: DIAS_VISIBLES }, (_, i) => {
        const iso = masDias(hoy, i);
        return { iso, abierto: horasReservables(semana, cierres, iso, momento).length > 0 };
      }),
    [hoy, semana, cierres, momento],
  );
  const fueraDeLaTira = Boolean(f.fecha) && !dias.some((d) => d.iso === f.fecha);

  // Plazas libres de El Despacho para el día elegido.
  useEffect(() => {
    if (!despacho || !f.fecha) return;
    let vivo = true;
    void plazasDespacho(f.fecha).then((p) => vivo && setPlazas(p ? { fecha: f.fecha, comida: p.comida, noche: p.noche } : null));
    return () => {
      vivo = false;
    };
  }, [despacho, f.fecha]);
  const noche = f.hora >= "17:00";
  const libres = despacho && plazas?.fecha === f.fecha ? (noche ? plazas.noche : plazas.comida) : null;
  const tope = Math.max(1, despacho ? Math.min(aforoDespacho, libres ?? aforoDespacho) : maxPersonas);
  const despachoLleno = libres !== null && libres <= 0;

  const elegidos = Object.values(f.cantidades).reduce((a, n) => a + n, 0);
  const cambiarCantidad = (id: string, n: number) =>
    setF((x) => ({ ...x, cantidades: { ...x.cantidades, [id]: Math.max(0, Math.min(50, n)) } }));

  const espacios: { k: Espacio; titulo: string; detalle: string; foto: ImageKey | string | null }[] = [
    { k: "mesa", titulo: "Comedor", detalle: "Menú del día o carta", foto: "comedorRatan" },
    { k: "despacho", titulo: "El Despacho", detalle: `Privado · hasta ${aforoDespacho} personas`, foto: "despacho" },
    ...(eventos.length
      ? [{ k: "evento" as const, titulo: "Ir a un evento", detalle: eventos.length === 1 ? eventos[0]!.titulo : `${eventos.length} próximos`, foto: eventos.find((e) => e.imagen)?.imagen ?? "terrazaNoche" }]
      : []),
  ];
  const lugar = evento?.titulo ?? espacios.find((e) => e.k === f.espacio)?.titulo ?? "";
  const gente = evento ? (f.personas === 1 ? "asistente" : "asistentes") : f.personas === 1 ? "persona" : "personas";
  const resumen = [
    lugar,
    f.fecha ? FECHA_CORTA.format(comoFecha(f.fecha)) : null,
    f.hora && horas.length ? f.hora : null,
    `${f.personas} ${gente}`,
    elegidos ? `${elegidos} ${elegidos === 1 ? "plato" : "platos"}` : null,
  ].filter(Boolean);

  if (estado === "ok") {
    return (
      <div role="status" className="overflow-hidden rounded-3xl bg-[#FFFDF8] shadow-card ring-1 ring-tinta-line">
        <div className="bg-oliva-soft/70 px-6 py-10 text-center sm:px-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-ok text-crema">
            <Icon name="check" className="h-8 w-8" />
          </span>
          <p className="mt-5 font-display text-4xl text-carbon">{evento ? "¡Te esperamos!" : "¡Solicitud enviada!"}</p>
          <p className="mx-auto mt-2 max-w-md text-carbon-muted">
            {evento
              ? "Gracias por avisar: así sabemos cuántos vamos a ser. Si al final no podéis venir, llámanos."
              : "Te llamamos para confirmarla. Si tienes prisa, llámanos tú."}
          </p>
        </div>
        <dl className="grid gap-px bg-tinta-line sm:grid-cols-2">
          {(
            [
              [evento ? "Evento" : "Dónde", lugar],
              ["Día", formatearFechaLarga(f.fecha)],
              ["Hora", evento?.hora ? evento.hora.slice(0, 5) : f.hora],
              [evento ? "Asistentes" : "Personas", String(f.personas)],
              ...(elegidos ? [["Comida", `${elegidos} ${elegidos === 1 ? "plato elegido" : "platos elegidos"}`]] : []),
              ["A nombre de", f.nombre],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className="bg-[#FFFDF8] px-6 py-4">
              <dt className="kicker text-carbon-muted">{k}</dt>
              <dd className="mt-1 text-lg text-carbon first-letter:uppercase">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <span className="text-sm text-carbon-muted">¿Algún cambio?</span>
          <a href={SITE.phone.href} className="btn-secondary">
            <Icon name="phone" className="h-4 w-4" />
            {SITE.phone.display}
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sin JavaScript el formulario no puede enviarse: se oculta y queda el teléfono. */}
      <noscript>
        <style>{"#form-reserva{display:none}"}</style>
        <p className="bg-[#FFFDF8] p-6 ring-1 ring-tinta-line">
          Para reservar online hace falta JavaScript. Llámanos al{" "}
          <a href={SITE.phone.href} className="font-semibold underline">
            {SITE.phone.display}
          </a>{" "}
          y te reservamos al momento.
        </p>
      </noscript>
      <form
        id="form-reserva"
        className="rounded-3xl bg-[#FFFDF8] shadow-card ring-1 ring-tinta-line"
        onSubmit={async (e) => {
          e.preventDefault();
          setEstado("enviando");
          setError(null);
          const { modo, cantidades, ...resto } = f;
          const r = await solicitarReserva({
            ...resto,
            evento_slug: f.espacio === "evento" ? f.evento_slug : undefined,
            comida: { modo, lineas: Object.entries(cantidades).map(([id, cantidad]) => ({ id, cantidad })) },
          });
          if (!r.ok) {
            setEstado("idle");
            return setError(r.error);
          }
          setEstado("ok");
        }}
      >
        {/* 1 · Dónde */}
        <Paso n={1} titulo="¿Dónde?">
          <div role="radiogroup" aria-label="Dónde" className={`grid gap-2.5 sm:gap-3 ${espacios.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {espacios.map((e) => {
              const marcado = f.espacio === e.k;
              return (
                <button
                  key={e.k}
                  type="button"
                  role="radio"
                  aria-checked={marcado}
                  onClick={() => set({ espacio: e.k })}
                  className={`group relative flex items-center overflow-hidden rounded-2xl bg-white text-left ring-1 transition-shadow sm:block ${marcado ? "shadow-lift ring-2 ring-marino" : "ring-carbon/12 hover:ring-carbon/30"}`}
                >
                  <span className="relative block h-20 w-28 shrink-0 overflow-hidden bg-papel-3 sm:aspect-[16/10] sm:h-auto sm:w-auto">
                    {e.foto && /^(\/|https?:)/.test(e.foto) ? (
                      <Image src={e.foto} alt="" fill sizes="(min-width: 640px) 240px, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : e.foto ? (
                      <Photo img={e.foto as ImageKey} sizes="(min-width: 640px) 240px, 50vw" decorative mobileBelow={0} imgClassName="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : null}
                    <span
                      className={`absolute left-2 top-2 grid h-7 w-7 sm:left-auto sm:right-2.5 sm:top-2.5 place-items-center rounded-full transition-all ${marcado ? "scale-100 bg-marino text-crema opacity-100" : "scale-75 bg-white/80 opacity-0"}`}
                    >
                      <Icon name="check" className="h-4 w-4" />
                    </span>
                  </span>
                  <span className="block min-w-0 px-4 py-3">
                    <span className="block font-display text-xl leading-tight text-carbon">{e.titulo}</span>
                    <span className="mt-0.5 block truncate text-sm text-carbon-muted">{e.detalle}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {f.espacio === "evento" && eventos.length > 1 ? (
            <label className="mt-4 grid gap-1 text-sm">
              <span className="font-semibold">Evento</span>
              <select value={f.evento_slug} onChange={(e) => set({ evento_slug: e.target.value })} className={campo}>
                {eventos.map((ev) => (
                  <option key={ev.slug} value={ev.slug}>
                    {ev.titulo} · {FECHA_CORTA.format(comoFecha(ev.fecha))}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </Paso>

        {/* 2 · Cuándo y cuántos */}
        <Paso n={2} titulo={evento ? "¿Cuántos vais a venir?" : "¿Cuándo y cuántos?"}>
          {evento ? (
            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-carbon/10">
                <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-noche">
                  {evento.imagen ? <Image src={evento.imagen} alt="" fill sizes="64px" className="object-cover" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-xl leading-tight text-carbon">{evento.titulo}</span>
                  <span className="mt-1 block text-sm text-carbon-muted first-letter:uppercase">
                    {formatearFechaLarga(evento.fecha)}
                    {evento.hora ? ` · ${evento.hora.slice(0, 5)}` : ""}
                  </span>
                </span>
              </div>
              <Contador valor={f.personas} tope={tope} onCambio={(n) => set({ personas: n })} etiqueta="Asistentes" nota={`Más de ${maxPersonas}, llámanos`} />
              <p className="text-sm text-carbon-muted sm:col-span-2">
                {horas.length === 0
                  ? "Para este evento, llámanos y te apuntamos."
                  : "No se paga nada: es para saber cuántos vamos a ser y prepararlo bien."}
              </p>
            </div>
          ) : (
            <>
            <p className="text-sm font-semibold text-carbon">Día</p>
            <div className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
              {dias.map((d, i) => (
                <button
                  key={d.iso}
                  type="button"
                  aria-pressed={f.fecha === d.iso}
                  aria-label={`${formatearFechaLarga(d.iso)}${d.abierto ? "" : ", cerrado"}`}
                  disabled={!d.abierto}
                  onClick={() => set({ fecha: d.iso })}
                  className={`${ficha} flex w-[4.25rem] shrink-0 snap-start flex-col items-center py-2.5`}
                >
                  <span className="text-[0.7rem] font-semibold uppercase tracking-wide opacity-70">{i === 0 ? "Hoy" : DIA_SEMANA.format(comoFecha(d.iso)).replace(".", "")}</span>
                  <span className="font-display text-2xl leading-tight tabular-nums">{Number(d.iso.slice(8))}</span>
                  <span className="text-[0.7rem] opacity-70">{d.abierto ? MES.format(comoFecha(d.iso)).replace(".", "") : "cerrado"}</span>
                </button>
              ))}
            </div>
            <label className="mt-2 flex flex-wrap items-center gap-3 text-sm text-carbon-muted">
              Otra fecha
              <input
                type="date"
                min={hoy}
                value={fueraDeLaTira ? f.fecha : ""}
                onChange={(e) => e.target.value && set({ fecha: e.target.value })}
                aria-describedby={diaCerrado || avisoHoy ? "reserva-dia-aviso" : undefined}
                aria-invalid={diaCerrado || undefined}
                className={`h-10 rounded-xl border px-3 text-carbon ${fueraDeLaTira ? "border-marino bg-marino/5" : "border-carbon/15 bg-white"}`}
              />
            </label>
            {diaCerrado || avisoHoy ? (
              <p id="reserva-dia-aviso" className={`mt-3 text-sm ${diaCerrado ? "font-semibold text-terracota" : "text-carbon-muted"}`}>
                {diaCerrado
                  ? "Ese día estamos cerrados. Elige otro día o llámanos."
                  : `Hoy ya no quedan horas para reservar online: te proponemos el ${formatearFechaLarga(f.fecha)}. Para hoy, llámanos.`}
              </p>
            ) : null}

            <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-sm font-semibold text-carbon">Hora</p>
                {horas.length === 0 ? (
                  <p className="mt-2 rounded-2xl border border-dashed border-carbon/20 px-4 py-3 text-sm text-carbon-muted">
                    {f.fecha ? "Ese día no quedan horas online." : "Elige primero el día."}
                  </p>
                ) : (
                  (
                    [
                      ["Mediodía", horas.filter((h) => h < "17:00")],
                      ["Noche", horas.filter((h) => h >= "17:00")],
                    ] as const
                  ).map(([turno, lista]) =>
                    lista.length ? (
                      <div key={turno} className="mt-2">
                        <p className="mb-1.5 flex items-center gap-1.5 text-xs text-carbon-muted">
                          <Icon name={turno === "Noche" ? "moon" : "sun"} className="h-3.5 w-3.5" />
                          {turno}
                        </p>
                        <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
                          {lista.map((h) => (
                            <button key={h} type="button" aria-pressed={f.hora === h} onClick={() => set({ hora: h })} className={`${ficha} min-h-10 text-sm font-semibold tabular-nums sm:px-3`}>
                              {h}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null,
                  )
                )}
              </div>
              <Contador
                valor={f.personas}
                tope={tope}
                onCambio={(n) => set({ personas: n })}
                etiqueta="Personas"
                nota={despacho ? `Hasta ${aforoDespacho} por turno` : `Más de ${maxPersonas}, llámanos`}
              />
            </div>

            {despacho && f.fecha && libres !== null ? (
              <div role="status" className={`mt-5 rounded-2xl px-4 py-3 ${despachoLleno || f.personas > libres ? "bg-terracota-soft text-terracota" : "bg-oliva-soft/70 text-carbon"}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">
                    {despachoLleno ? `El Despacho está completo ${noche ? "esa noche" : "a mediodía"}` : `Quedan ${libres} de ${aforoDespacho} plazas ${noche ? "esa noche" : "a mediodía"}`}
                  </span>
                  <Icon name="briefcase" className="h-4 w-4 shrink-0" />
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
                  <div className="h-full rounded-full bg-current" style={{ width: `${Math.max(0, Math.min(100, (libres / aforoDespacho) * 100))}%` }} />
                </div>
                {despachoLleno ? <p className="mt-2 text-sm">Prueba el comedor, otro turno u otro día.</p> : null}
              </div>
            ) : null}
            </>
          )}
        </Paso>

        {/* 3 · Comida */}
        {f.espacio !== "evento" ? (
          <Paso n={3} titulo="¿Qué vais a comer?" nota="Opcional">
            <div role="radiogroup" aria-label="Qué vais a comer" className={`grid gap-2 ${despacho ? "grid-cols-2" : "sm:grid-cols-3"}`}>
              <Opcion marcada={f.modo === "nada"} onClick={() => set({ modo: "nada" })} icono="utensils" titulo="Solo la mesa" detalle="Elegís al llegar" />
              {!despacho ? (
                <Opcion
                  marcada={f.modo === "menu"}
                  disabled={!hayMenu || f.fecha !== hoy}
                  onClick={() => set({ modo: "menu" })}
                  icono="bowl"
                  titulo={`Menú del día${menuHoy?.precio_centimos ? ` · ${formatCentimos(menuHoy.precio_centimos)}` : ""}`}
                  detalle={hayMenu ? (f.fecha === hoy ? `Hoy, hasta las ${menuFranja.hasta}` : "Solo para hoy") : `Se publica a las ${menuFranja.desde}`}
                />
              ) : null}
              <Opcion marcada={f.modo === "carta"} disabled={carta.length === 0} onClick={() => set({ modo: "carta" })} icono="receipt" titulo="Carta" detalle="Adelantad el pedido" />
            </div>

            {f.modo === "menu" && menuHoy ? (
              <div className="mt-5 grid gap-5">
                {GRUPOS_MENU.map((g) => {
                  const platos = menuHoy.platos.filter((p) => p.tipo === g.tipo);
                  return platos.length ? (
                    <div key={g.tipo}>
                      <p className="kicker text-oliva">{g.label}</p>
                      <ul className="mt-2 divide-y divide-tinta-line rounded-2xl bg-white ring-1 ring-carbon/10">
                        {platos.map((p) => (
                          <LineaPlato
                            key={p.id}
                            nombre={p.nombre}
                            detalle={p.descripcion}
                            foto={p.foto}
                            seccion={g.tipo === "postre" ? "Postres" : ""}
                            cantidad={f.cantidades[p.id] ?? 0}
                            onCambio={(n) => cambiarCantidad(p.id, n)}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })}
              </div>
            ) : null}

            {f.modo === "carta" ? (
              <div className="mt-5">
                <div aria-label="Secciones de la carta" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                  {carta.map((c) => {
                    const n = c.productos.reduce((a, p) => a + (f.cantidades[p.id] ?? 0), 0);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={seccion === c.id}
                        onClick={() => setSeccion(c.id)}
                        className={`${ficha} flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold`}
                      >
                        {c.nombre}
                        {n ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brasa px-1 text-xs text-crema">{n}</span> : null}
                      </button>
                    );
                  })}
                </div>
                {carta
                  .filter((c) => c.id === seccion)
                  .map((c) => (
                    <ul key={c.id} aria-label={c.nombre} className="mt-2 divide-y divide-tinta-line rounded-2xl bg-white ring-1 ring-carbon/10">
                      {c.productos.map((p) => (
                        <LineaPlato
                          key={p.id}
                          nombre={p.nombre}
                          detalle={p.descripcion}
                          precio={p.precio_centimos}
                          foto={p.foto}
                          seccion={c.nombre}
                          cantidad={f.cantidades[p.id] ?? 0}
                          onCambio={(n) => cambiarCantidad(p.id, n)}
                        />
                      ))}
                    </ul>
                  ))}
              </div>
            ) : null}
          </Paso>
        ) : null}

        {/* 4 · Tus datos */}
        <Paso n={f.espacio === "evento" ? 3 : 4} titulo="Tus datos">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Nombre</span>
              <input required autoComplete="name" value={f.nombre} onChange={(e) => set({ nombre: e.target.value.slice(0, 60) })} className={campo} />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Teléfono</span>
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                minLength={9}
                value={f.telefono}
                onChange={(e) => set({ telefono: e.target.value.replace(/[^0-9+ ]/g, "").slice(0, 16) })}
                className={campo}
              />
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              <span className="font-semibold">
                Notas <span className="font-normal text-carbon-muted">(alergias, trona, celebración…)</span>
              </span>
              <textarea value={f.notas} onChange={(e) => set({ notas: e.target.value.slice(0, 500) })} rows={2} className={`${campo} h-auto py-3`} />
            </label>
            {f.notas?.trim() ? (
              <label className="flex items-start gap-3 text-sm sm:col-span-2">
                <input type="checkbox" required checked={!!f.consiente_salud} onChange={(e) => set({ consiente_salud: e.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-[theme(colors.marino.DEFAULT)]" />
                <span>Consiento que se usen las alergias o datos de salud que indico en las notas solo para atender mi reserva. Se borran después del servicio.</span>
              </label>
            ) : null}
          </div>
          {/* Campo trampa anti-bots: oculto a personas y lectores de pantalla. */}
          <div aria-hidden="true" className="absolute -left-[9999px]">
            <label>
              Web
              <input tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set({ web: e.target.value })} />
            </label>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-carbon-muted">
            <strong className="font-semibold">Protección de datos.</strong> El responsable es el titular de {SITE.name}. Usamos tu nombre, tu teléfono y los
            datos de la reserva solo para gestionarla y avisarte de cambios (art. 6.1.b RGPD); no los cedemos ni los usamos para publicidad. Puedes acceder,
            rectificar o suprimir tus datos y reclamar ante la AEPD.{" "}
            <Link href={privacidadHref} className="underline">
              Más información en la política de privacidad
            </Link>
            .
          </p>
        </Paso>

        {/* Resumen y envío: siempre a mano al bajar. */}
        <div className="sticky bottom-0 z-10 rounded-b-3xl border-t border-tinta-line bg-[#FFFDF8]/95 px-5 py-4 backdrop-blur sm:px-8">
          {error ? (
            <p role="alert" className="mb-3 text-sm font-semibold text-terracota">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-carbon first-letter:uppercase" aria-live="polite">
              {resumen.join(" · ")}
            </p>
            <button
              type="submit"
              disabled={estado === "enviando" || diaCerrado || horas.length === 0 || despachoLleno}
              className="btn-primary w-full shrink-0 sm:w-auto"
            >
              <Icon name={evento ? "users" : "calendar"} className="h-4 w-4" />
              {estado === "enviando" ? "Enviando…" : evento ? "Apuntarme" : "Solicitar reserva"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function Paso({ n, titulo, nota, children }: { n: number; titulo: string; nota?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 border-b border-tinta-line px-5 py-7 last-of-type:border-b-0 sm:px-8">
      <legend className="float-left mb-5 flex w-full items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-carbon font-display text-base text-crema">{n}</span>
        <span className="font-display text-2xl text-carbon">{titulo}</span>
        {nota ? <span className="ml-auto text-xs text-carbon-muted">{nota}</span> : null}
      </legend>
      <div className="clear-left">{children}</div>
    </fieldset>
  );
}

function Opcion({ marcada, disabled, onClick, icono, titulo, detalle }: { marcada: boolean; disabled?: boolean; onClick: () => void; icono: IconName; titulo: string; detalle: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${marcada ? "bg-marino text-crema ring-marino" : "bg-white text-carbon ring-carbon/12 hover:ring-carbon/30"}`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${marcada ? "bg-white/15" : "bg-papel-2 text-brasa"}`}>
        <Icon name={icono} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug">{titulo}</span>
        <span className={`block text-xs ${marcada ? "text-crema/75" : "text-carbon-muted"}`}>{detalle}</span>
      </span>
    </button>
  );
}

function Contador({ valor, tope, onCambio, etiqueta, nota }: { valor: number; tope: number; onCambio: (n: number) => void; etiqueta: string; nota: string }) {
  return (
    <div>
      <p id="reserva-personas" className="text-sm font-semibold text-carbon">
        {etiqueta}
      </p>
      <div className="mt-2 inline-flex items-center gap-1 rounded-2xl border border-carbon/12 bg-white p-1">
        <BotonCantidad etiqueta="Una persona menos" icono="minus" disabled={valor <= 1} onClick={() => onCambio(valor - 1)} />
        <input
          type="number"
          required
          min={1}
          max={tope}
          value={valor}
          aria-labelledby="reserva-personas"
          onChange={(e) => onCambio(Number(e.target.value))}
          className="w-14 appearance-none bg-transparent text-center font-display text-3xl tabular-nums text-carbon focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <BotonCantidad etiqueta="Una persona más" icono="plus" disabled={valor >= tope} onClick={() => onCambio(valor + 1)} />
      </div>
      <p className="mt-1.5 text-xs text-carbon-muted">{nota}</p>
    </div>
  );
}

function BotonCantidad({ etiqueta, icono, disabled, onClick }: { etiqueta: string; icono: IconName; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={etiqueta} disabled={disabled} onClick={onClick} className="grid h-10 w-10 place-items-center rounded-xl text-carbon hover:bg-papel-2 disabled:opacity-30">
      <Icon name={icono} className="h-4 w-4" />
    </button>
  );
}

function LineaPlato({
  nombre,
  detalle,
  precio,
  foto,
  seccion,
  cantidad,
  onCambio,
}: {
  nombre: string;
  detalle?: string | null;
  precio?: number;
  foto?: string | null;
  seccion?: string;
  cantidad: number;
  onCambio: (n: number) => void;
}) {
  return (
    <li className={`flex items-center gap-3 p-3 transition-colors ${cantidad ? "bg-marino/[0.04]" : ""}`}>
      <MiniaturaPlato nombre={nombre} foto={foto} seccion={seccion} />
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-medium leading-snug text-carbon">{nombre}</span>
        {detalle ? <span className="line-clamp-2 block text-xs text-carbon-muted">{detalle}</span> : null}
        {precio !== undefined ? <span className="mt-0.5 block text-sm tabular-nums text-carbon">{formatCentimos(precio)}</span> : null}
      </span>
      {cantidad === 0 ? (
        <button
          type="button"
          onClick={() => onCambio(1)}
          aria-label={`Añadir ${nombre}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-carbon/15 text-carbon hover:border-marino hover:text-marino"
        >
          <Icon name="plus" className="h-4 w-4" />
        </button>
      ) : (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-marino p-1 text-crema">
          <button type="button" onClick={() => onCambio(cantidad - 1)} aria-label={`Uno menos de ${nombre}`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15">
            <Icon name="minus" className="h-4 w-4" />
          </button>
          <span aria-live="polite" className="w-5 text-center text-sm font-semibold tabular-nums">
            {cantidad}
          </span>
          <button type="button" onClick={() => onCambio(cantidad + 1)} aria-label={`Uno más de ${nombre}`} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/15">
            <Icon name="plus" className="h-4 w-4" />
          </button>
        </span>
      )}
    </li>
  );
}
