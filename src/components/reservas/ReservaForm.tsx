"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFechaLarga, hoyEnMadrid } from "@/lib/format";
import { solicitarReserva, type ReservaWeb } from "@/lib/reservas/actions";
import { SITE } from "@/lib/site";

const campo = "h-12 w-full rounded-2xl border border-carbon/15 bg-white px-4 text-base text-carbon focus:border-marino focus:outline-none";

/**
 * Reserva online (portado de ReservaForm de Palomita). La reserva queda
 * PENDIENTE: el local la confirma (o llama). Sin datos inventados: el horario y
 * los límites los valida la base de datos.
 */
export function ReservaForm({
  maxPersonas,
  eventos,
  espacioInicial,
  paraHoy,
}: {
  maxPersonas: number;
  eventos: { slug: string; titulo: string; fecha: string }[];
  espacioInicial: ReservaWeb["espacio"];
  paraHoy: boolean;
}) {
  const [f, setF] = useState<ReservaWeb>({
    nombre: "",
    telefono: "",
    email: "",
    personas: 2,
    fecha: paraHoy ? hoyEnMadrid() : "",
    hora: "14:00",
    espacio: espacioInicial,
    evento_slug: eventos[0]?.slug,
    notas: "",
    web: "",
  });
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<ReservaWeb>) => setF((x) => ({ ...x, ...p }));

  if (estado === "ok") {
    return (
      <div role="status" className="rounded-[2rem] border border-oliva/30 bg-oliva-soft p-8 text-oliva">
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
    <form
      className="grid gap-4 rounded-[2rem] border border-carbon/10 bg-white p-6 shadow-card sm:grid-cols-2 sm:p-8"
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
        <input type="date" required min={hoyEnMadrid()} value={f.fecha} onChange={(e) => set({ fecha: e.target.value })} className={campo} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Hora</span>
          <input type="time" required step={900} value={f.hora} onChange={(e) => set({ hora: e.target.value })} className={campo} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Personas</span>
          <input type="number" required min={1} max={maxPersonas} value={f.personas} onChange={(e) => set({ personas: Number(e.target.value) })} className={campo} />
        </label>
      </div>
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Nombre</span>
        <input required autoComplete="name" value={f.nombre} onChange={(e) => set({ nombre: e.target.value.slice(0, 60) })} className={campo} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-semibold">Teléfono</span>
        <input required type="tel" inputMode="tel" autoComplete="tel" value={f.telefono} onChange={(e) => set({ telefono: e.target.value.replace(/[^0-9+ ]/g, "").slice(0, 16) })} className={campo} />
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">
        <span className="font-semibold">
          Notas <span className="font-normal text-carbon-muted">(alergias, trona, celebración…)</span>
        </span>
        <textarea value={f.notas} onChange={(e) => set({ notas: e.target.value.slice(0, 500) })} rows={2} className={`${campo} h-auto py-3`} />
      </label>
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
        Para grupos de más de {maxPersonas}, llámanos. Usamos tu nombre y teléfono solo para gestionar la reserva (ver privacidad).
      </p>
      <button type="submit" disabled={estado === "enviando"} className="btn-primary sm:col-span-2">
        <Icon name="calendar" className="h-4 w-4" />
        {estado === "enviando" ? "Enviando…" : "Solicitar reserva"}
      </button>
    </form>
  );
}
