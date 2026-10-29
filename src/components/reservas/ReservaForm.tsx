"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFechaLarga, hoyEnMadrid } from "@/lib/format";
import { horasReservables, primerDiaReservable, type Cierre, type Semana } from "@/lib/horario";
import { solicitarReserva, type ReservaWeb } from "@/lib/reservas/actions";
import { SITE } from "@/lib/site";

const campo = "h-12 w-full rounded-2xl border border-carbon/15 bg-white px-4 text-base text-carbon focus:border-marino focus:outline-none";

/** La hora de comer si ese día se puede; si no, la primera libre. */
const horaPorDefecto = (horas: string[]) => (horas.includes("14:00") ? "14:00" : (horas[0] ?? ""));

/**
 * Reserva online (portado de ReservaForm de Palomita). La reserva queda
 * PENDIENTE: el local la confirma (o llama). Las horas salen del horario y los
 * cierres (mismas reglas que valida laofi_crear_reserva), así nadie elige una
 * hora que el servidor va a rechazar. «Reservar para hoy» fuera de horario
 * propone el siguiente día con huecos.
 */
export function ReservaForm({
  maxPersonas,
  eventos,
  espacioInicial,
  paraHoy,
  semana,
  cierres,
  ahora,
  privacidadHref,
}: {
  maxPersonas: number;
  eventos: { slug: string; titulo: string; fecha: string }[];
  espacioInicial: ReservaWeb["espacio"];
  paraHoy: boolean;
  semana: Semana;
  cierres: Cierre[];
  /** Hora de la petición (ISO), la misma en servidor y cliente para no desajustar la hidratación. */
  ahora: string;
  privacidadHref: string;
}) {
  const momento = useMemo(() => new Date(ahora), [ahora]);
  const [f, setF] = useState<ReservaWeb>(() => {
    const fecha = paraHoy ? (primerDiaReservable(semana, cierres, momento) ?? "") : "";
    return {
      nombre: "",
      telefono: "",
      email: "",
      personas: 2,
      fecha,
      hora: fecha ? horaPorDefecto(horasReservables(semana, cierres, fecha, momento)) : "14:00",
      espacio: espacioInicial,
      evento_slug: eventos[0]?.slug,
      notas: "",
      consiente_salud: false,
      web: "",
    };
  });
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<ReservaWeb>) => setF((x) => ({ ...x, ...p }));

  const horas = useMemo(() => (f.fecha ? horasReservables(semana, cierres, f.fecha, momento) : []), [semana, cierres, f.fecha, momento]);
  const diaCerrado = Boolean(f.fecha) && horas.length === 0;
  const avisoHoy = paraHoy && f.fecha && f.fecha !== hoyEnMadrid(momento);

  const elegirFecha = (fecha: string) => {
    const nuevas = fecha ? horasReservables(semana, cierres, fecha, momento) : [];
    set({ fecha, hora: nuevas.includes(f.hora) ? f.hora : horaPorDefecto(nuevas) });
  };

  if (estado === "ok") {
    return (
      <div role="status" className="border-l-2 border-ok bg-oliva-soft/60 p-8 text-ok">
        <Icon name="check" className="h-8 w-8" />
        <p className="mt-3 font-display text-3xl">¡Solicitud enviada!</p>
        <p className="mt-2 text-carbon">
          Reserva para {f.personas} el <span className="first-letter:uppercase">{formatearFechaLarga(f.fecha)}</span> a las {f.hora}. Te confirmamos por teléfono; si es para hoy y tienes prisa,
          llámanos al <a href={SITE.phone.href} className="font-semibold underline">{SITE.phone.display}</a>.
        </p>
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
        className="grid gap-4 bg-[#FFFDF8] p-6 ring-1 ring-tinta-line sm:grid-cols-2 sm:p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setEstado("enviando");
          setError(null);
          const r = await solicitarReserva({ ...f, evento_slug: f.espacio === "evento" ? f.evento_slug : undefined });
          if (!r.ok) {
            setEstado("idle");
            return setError(r.error);
          }
          setEstado("ok");
        }}
      >
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">¿Dónde?</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["mesa", "Mesa"],
                ["despacho", "El Despacho (reunión)"],
                ...(eventos.length ? [["evento", "Un evento"]] : []),
              ] as [ReservaWeb["espacio"], string][]
            ).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={f.espacio === k} onClick={() => set({ espacio: k })} className="min-h-11 rounded-full border border-carbon/15 px-4 text-sm font-semibold aria-pressed:border-marino aria-pressed:bg-[theme(colors.marino.DEFAULT)] aria-pressed:text-crema">
                {label}
              </button>
            ))}
          </div>
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
          <input
            type="date"
            required
            min={hoyEnMadrid(momento)}
            value={f.fecha}
            onChange={(e) => elegirFecha(e.target.value)}
            aria-describedby={diaCerrado || avisoHoy ? "reserva-dia-aviso" : undefined}
            aria-invalid={diaCerrado || undefined}
            className={campo}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Hora</span>
            <select required value={f.hora} onChange={(e) => set({ hora: e.target.value })} disabled={horas.length === 0} className={campo}>
              {horas.length === 0 ? <option value="">{f.fecha ? "Cerrado" : "Elige el día"}</option> : null}
              {horas.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Personas</span>
            <input type="number" required min={1} max={maxPersonas} value={f.personas} onChange={(e) => set({ personas: Number(e.target.value) })} className={campo} />
          </label>
        </div>
        {diaCerrado || avisoHoy ? (
          <p id="reserva-dia-aviso" className={`text-sm sm:col-span-2 ${diaCerrado ? "font-semibold text-terracota" : "text-carbon-muted"}`}>
            {diaCerrado
              ? "Ese día estamos cerrados. Elige otro día o llámanos."
              : `Hoy ya no quedan horas para reservar online: te proponemos el ${formatearFechaLarga(f.fecha)}. Para hoy, llámanos.`}
          </p>
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
        <p className="text-xs text-carbon-muted sm:col-span-2">Para grupos de más de {maxPersonas}, llámanos o pide presupuesto.</p>
        <p className="text-xs leading-relaxed text-carbon-muted sm:col-span-2">
          <strong className="font-semibold">Protección de datos.</strong> El responsable es el titular de {SITE.name}. Usamos tu nombre, tu teléfono y los
          datos de la reserva solo para gestionarla y avisarte de cambios (art. 6.1.b RGPD); no los cedemos ni los usamos para publicidad. Puedes acceder,
          rectificar o suprimir tus datos y reclamar ante la AEPD.{" "}
          <Link href={privacidadHref} className="underline">
            Más información en la política de privacidad
          </Link>
          .
        </p>
        <button type="submit" disabled={estado === "enviando" || diaCerrado} className="btn-primary sm:col-span-2">
          <Icon name="calendar" className="h-4 w-4" />
          {estado === "enviando" ? "Enviando…" : "Solicitar reserva"}
        </button>
      </form>
    </>
  );
}
