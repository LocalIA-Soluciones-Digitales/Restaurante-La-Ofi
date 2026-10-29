"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos, formatearFechaLarga, hoyEnMadrid } from "@/lib/format";
import { horasReservables, primerDiaReservable, type Cierre, type Semana } from "@/lib/horario";
import { plazasDespacho, solicitarReserva, type ModoComida, type ReservaWeb } from "@/lib/reservas/actions";
import { SITE } from "@/lib/site";
import type { MenuDiaPlato } from "@/lib/restaurant/types";

const campo = "h-12 w-full rounded-2xl border border-carbon/15 bg-white px-4 text-base text-carbon focus:border-marino focus:outline-none";
const pastilla =
  "min-h-11 rounded-full border border-carbon/15 px-4 text-sm font-semibold disabled:opacity-40 aria-pressed:border-marino aria-pressed:bg-[theme(colors.marino.DEFAULT)] aria-pressed:text-crema";

/** La hora de comer si ese día se puede; si no, la primera libre. */
const horaPorDefecto = (horas: string[]) => (horas.includes("14:00") ? "14:00" : (horas[0] ?? ""));

export interface CartaReserva {
  id: string;
  nombre: string;
  productos: { id: string; nombre: string; descripcion: string | null; precio_centimos: number }[];
}

export interface MenuReserva {
  precio_centimos: number | null;
  platos: MenuDiaPlato[];
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
 *  - Recoger menú del día: los platos de hoy para llevar.
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
  eventos: { slug: string; titulo: string; fecha: string }[];
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
    return x.espacio === "recogida" || x.modo === "menu" ? base.filter((h) => h >= menuFranja.desde && h <= menuFranja.hasta) : base;
  };

  /** Mantiene el estado coherente: la recogida es hoy y con menú, El Despacho no tiene menú, la hora existe. */
  const normalizar = (x: Estado): Estado => {
    const n = { ...x };
    if (n.espacio === "recogida") {
      n.fecha = hoy;
      n.modo = "menu";
    }
    if (n.espacio === "evento") n.modo = "nada";
    if (n.espacio === "despacho" && n.modo === "menu") n.modo = "carta";
    if (n.modo === "menu" && (n.fecha !== hoy || !hayMenu)) n.modo = "nada";
    if (n.modo !== x.modo) n.cantidades = {};
    const horas = horasDe(n);
    if (!horas.includes(n.hora)) n.hora = horaPorDefecto(horas);
    return n;
  };

  const [f, setF] = useState<Estado>(() => {
    const espacio = espacioInicial === "recogida" && !hayMenu ? "mesa" : espacioInicial;
    const fecha = paraHoy || espacio === "recogida" ? (primerDiaReservable(semana, cierres, momento) ?? "") : "";
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
  const set = (p: Partial<Estado>) => setF((x) => normalizar({ ...x, ...p }));

  const horas = horasDe(f);
  const diaCerrado = Boolean(f.fecha) && horasReservables(semana, cierres, f.fecha, momento).length === 0;
  const avisoHoy = paraHoy && f.fecha && f.fecha !== hoy;
  const despacho = f.espacio === "despacho";
  const recogida = f.espacio === "recogida";

  // Plazas libres de El Despacho para el día elegido.
  useEffect(() => {
    if (!despacho || !f.fecha) return;
    let vivo = true;
    void plazasDespacho(f.fecha).then((p) => vivo && setPlazas(p ? { fecha: f.fecha, comida: p.comida, noche: p.noche } : null));
    return () => {
      vivo = false;
    };
  }, [despacho, f.fecha]);
  const libres = despacho && plazas?.fecha === f.fecha ? (f.hora >= "17:00" ? plazas.noche : plazas.comida) : null;
  const tope = despacho ? Math.min(aforoDespacho, libres ?? aforoDespacho) : recogida ? 30 : maxPersonas;
  const despachoLleno = libres !== null && libres <= 0;

  const elegidos = Object.values(f.cantidades).reduce((a, n) => a + n, 0);
  const cambiarCantidad = (id: string, n: number) =>
    setF((x) => ({ ...x, cantidades: { ...x.cantidades, [id]: Math.max(0, Math.min(50, n)) } }));

  if (estado === "ok") {
    return (
      <div role="status" className="border-l-2 border-ok bg-oliva-soft/60 p-8 text-ok">
        <Icon name="check" className="h-8 w-8" />
        <p className="mt-3 font-display text-3xl">{recogida ? "¡Pedido enviado!" : "¡Solicitud enviada!"}</p>
        <p className="mt-2 text-carbon">
          {recogida ? (
            <>
              {f.personas} {f.personas === 1 ? "menú" : "menús"} para recoger hoy a las {f.hora}.
            </>
          ) : (
            <>
              Reserva para {f.personas} {despacho ? "en El Despacho " : ""}el <span className="first-letter:uppercase">{formatearFechaLarga(f.fecha)}</span> a las {f.hora}.
            </>
          )}{" "}
          Te confirmamos por teléfono; si tienes prisa, llámanos al{" "}
          <a href={SITE.phone.href} className="font-semibold underline">
            {SITE.phone.display}
          </a>
          .
        </p>
      </div>
    );
  }

  const espacios: [Espacio, string, boolean][] = [
    ["mesa", "Comedor", true],
    ["despacho", "El Despacho", true],
    ["recogida", "Recoger menú del día", hayMenu],
    ...(eventos.length ? ([["evento", "Un evento", true]] as [Espacio, string, boolean][]) : []),
  ];

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
        className="grid gap-4 bg-[#FFFDF8] p-6 ring-1 ring-tinta-line sm:grid-cols-2 sm:p-8"
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
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">¿Qué quieres?</legend>
          <div className="flex flex-wrap gap-2">
            {espacios
              .filter(([, , visible]) => visible)
              .map(([k, label]) => (
                <button key={k} type="button" aria-pressed={f.espacio === k} onClick={() => set({ espacio: k })} className={pastilla}>
                  {label}
                </button>
              ))}
          </div>
          <p className="mt-2 text-sm text-carbon-muted">
            {f.espacio === "mesa"
              ? "Menú del día o carta. Puedes decirnos ya qué vais a comer o elegirlo en la mesa."
              : despacho
                ? `Comedor privado para ${aforoDespacho} personas. Se reserva por personas y se come de carta.`
                : recogida
                  ? `Pide los platos del menú de hoy y pásate a recogerlos (de ${menuFranja.desde} a ${menuFranja.hasta}).`
                  : "Reserva tu sitio para el evento."}
          </p>
        </fieldset>
        {f.espacio === "evento" ? (
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-semibold">Evento</span>
            <select value={f.evento_slug} onChange={(e) => set({ evento_slug: e.target.value })} className={campo}>
              {eventos.map((ev) => (
                <option key={ev.slug} value={ev.slug}>
                  {ev.titulo} · {ev.fecha}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Día</span>
          {recogida ? (
            <span className={`${campo} flex items-center`}>Hoy</span>
          ) : (
            <input
              type="date"
              required
              min={hoy}
              value={f.fecha}
              onChange={(e) => set({ fecha: e.target.value })}
              aria-describedby={diaCerrado || avisoHoy ? "reserva-dia-aviso" : undefined}
              aria-invalid={diaCerrado || undefined}
              className={campo}
            />
          )}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{recogida ? "Recogida" : "Hora"}</span>
            <select required value={f.hora} onChange={(e) => set({ hora: e.target.value })} disabled={horas.length === 0} className={campo}>
              {horas.length === 0 ? <option value="">{f.fecha ? "Sin horas" : "Elige el día"}</option> : null}
              {horas.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">{recogida ? "Menús" : "Personas"}</span>
            <input
              type="number"
              required
              min={1}
              max={Math.max(tope, 1)}
              value={f.personas}
              onChange={(e) => set({ personas: Number(e.target.value) })}
              className={campo}
            />
          </label>
        </div>
        {diaCerrado || avisoHoy ? (
          <p id="reserva-dia-aviso" className={`text-sm sm:col-span-2 ${diaCerrado ? "font-semibold text-terracota" : "text-carbon-muted"}`}>
            {diaCerrado
              ? "Ese día estamos cerrados. Elige otro día o llámanos."
              : `Hoy ya no quedan horas para reservar online: te proponemos el ${formatearFechaLarga(f.fecha)}. Para hoy, llámanos.`}
          </p>
        ) : null}
        {despacho && f.fecha && libres !== null ? (
          <p className={`text-sm sm:col-span-2 ${despachoLleno || f.personas > libres ? "font-semibold text-terracota" : "text-carbon-muted"}`} role="status">
            {despachoLleno
              ? `El Despacho está completo ${f.hora >= "17:00" ? "esa noche" : "a mediodía"}. Prueba el comedor, otro turno u otro día.`
              : `En El Despacho quedan ${libres} de ${aforoDespacho} plazas ${f.hora >= "17:00" ? "esa noche" : "a mediodía"}.`}
          </p>
        ) : null}

        {f.espacio !== "evento" ? (
          <fieldset className="grid gap-3 sm:col-span-2">
            <legend className="mb-2 text-sm font-semibold">{recogida ? "¿Qué vas a recoger?" : "¿Qué vais a comer?"}</legend>
            {!recogida ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={f.modo === "nada"} onClick={() => set({ modo: "nada" })} className={pastilla}>
                  Solo reservar mesa
                </button>
                {!despacho ? (
                  <button type="button" aria-pressed={f.modo === "menu"} disabled={!hayMenu || f.fecha !== hoy} onClick={() => set({ modo: "menu" })} className={pastilla}>
                    Menú del día{menuHoy?.precio_centimos ? ` · ${formatCentimos(menuHoy.precio_centimos)}` : ""}
                  </button>
                ) : null}
                <button type="button" aria-pressed={f.modo === "carta"} disabled={carta.length === 0} onClick={() => set({ modo: "carta" })} className={pastilla}>
                  Carta
                </button>
              </div>
            ) : null}
            {!despacho && !recogida && (!hayMenu || f.fecha !== hoy) ? (
              <p className="text-xs text-carbon-muted">
                El menú del día se publica el mismo día a las {menuFranja.desde} y se sirve hasta las {menuFranja.hasta}
                {hayMenu ? ": elige hoy para pedirlo." : "."}
              </p>
            ) : null}
            {f.modo === "menu" && menuHoy ? (
              <div className="grid gap-4 rounded-2xl border border-carbon/10 bg-white p-4">
                {GRUPOS_MENU.map((g) => {
                  const platos = menuHoy.platos.filter((p) => p.tipo === g.tipo);
                  return platos.length ? (
                    <div key={g.tipo}>
                      <p className="kicker text-oliva">{g.label}</p>
                      <ul className="mt-2 grid gap-2">
                        {platos.map((p) => (
                          <LineaPlato key={p.id} nombre={p.nombre} detalle={p.descripcion} cantidad={f.cantidades[p.id] ?? 0} onCambio={(n) => cambiarCantidad(p.id, n)} />
                        ))}
                      </ul>
                    </div>
                  ) : null;
                })}
                <p className="text-xs text-carbon-muted">
                  {recogida ? "Elige cuántos de cada plato." : "Opcional: si no eliges nada, lo pedís en la mesa."}
                </p>
              </div>
            ) : null}
            {f.modo === "carta" ? (
              <div className="grid gap-2 rounded-2xl border border-carbon/10 bg-white p-2">
                {carta.map((c) => {
                  const enCategoria = c.productos.reduce((a, p) => a + (f.cantidades[p.id] ?? 0), 0);
                  return (
                    <details key={c.id} className="group rounded-xl px-2 open:bg-crema/50">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-semibold">
                        <span>
                          {c.nombre}
                          {enCategoria ? <span className="ml-2 rounded-full bg-marino px-2 py-0.5 text-xs text-crema">{enCategoria}</span> : null}
                        </span>
                        <Icon name="chevronRight" className="h-4 w-4 transition-transform group-open:rotate-90" />
                      </summary>
                      <ul className="grid gap-2 pb-3">
                        {c.productos.map((p) => (
                          <LineaPlato
                            key={p.id}
                            nombre={p.nombre}
                            detalle={[p.descripcion, formatCentimos(p.precio_centimos)].filter(Boolean).join(" · ")}
                            cantidad={f.cantidades[p.id] ?? 0}
                            onCambio={(n) => cambiarCantidad(p.id, n)}
                          />
                        ))}
                      </ul>
                    </details>
                  );
                })}
                <p className="px-2 pb-2 text-xs text-carbon-muted">Opcional: si no eliges nada, lo pedís en la mesa.</p>
              </div>
            ) : null}
            {elegidos > 0 ? <p className="text-sm text-carbon">{elegidos} {elegidos === 1 ? "plato elegido" : "platos elegidos"}.</p> : null}
          </fieldset>
        ) : null}

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
        {/* Campo trampa anti-bots: oculto a personas y lectores de pantalla. */}
        <div aria-hidden="true" className="absolute -left-[9999px]">
          <label>
            Web
            <input tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set({ web: e.target.value })} />
          </label>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-terracota sm:col-span-2">
            {error}
          </p>
        ) : null}
        <p className="text-xs text-carbon-muted sm:col-span-2">
          {despacho
            ? `El Despacho admite hasta ${aforoDespacho} personas por turno.`
            : recogida
              ? "Para más de 30 menús, llámanos."
              : `Para grupos de más de ${maxPersonas}, llámanos o pide presupuesto.`}
        </p>
        <p className="text-xs leading-relaxed text-carbon-muted sm:col-span-2">
          <strong className="font-semibold">Protección de datos.</strong> El responsable es el titular de {SITE.name}. Usamos tu nombre, tu teléfono y los
          datos de la reserva solo para gestionarla y avisarte de cambios (art. 6.1.b RGPD); no los cedemos ni los usamos para publicidad. Puedes acceder,
          rectificar o suprimir tus datos y reclamar ante la AEPD.{" "}
          <Link href={privacidadHref} className="underline">
            Más información en la política de privacidad
          </Link>
          .
        </p>
        <button
          type="submit"
          disabled={estado === "enviando" || diaCerrado || horas.length === 0 || despachoLleno || (recogida && elegidos === 0)}
          className="btn-primary sm:col-span-2"
        >
          <Icon name="calendar" className="h-4 w-4" />
          {estado === "enviando" ? "Enviando…" : recogida ? "Pedir para recoger" : "Solicitar reserva"}
        </button>
      </form>
    </>
  );
}

function LineaPlato({ nombre, detalle, cantidad, onCambio }: { nombre: string; detalle?: string | null; cantidad: number; onCambio: (n: number) => void }) {
  return (
    <li className="flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] text-carbon">{nombre}</span>
        {detalle ? <span className="block text-xs text-carbon-muted">{detalle}</span> : null}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onCambio(cantidad - 1)}
          disabled={cantidad === 0}
          aria-label={`Uno menos de ${nombre}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-carbon/15 text-lg disabled:opacity-30"
        >
          −
        </button>
        <span aria-live="polite" className="w-6 text-center font-semibold tabular-nums">
          {cantidad}
        </span>
        <button
          type="button"
          onClick={() => onCambio(cantidad + 1)}
          aria-label={`Uno más de ${nombre}`}
          className="grid h-9 w-9 place-items-center rounded-full border border-carbon/15 text-lg"
        >
          +
        </button>
      </span>
    </li>
  );
}
