"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SITE_URL } from "@/lib/env";
import { formatearFechaLarga } from "@/lib/format";
import { cancelarReserva, obtenerReserva, type ReservaPublica } from "@/lib/reservas/actions";
import { enlaceReserva } from "@/lib/reservas/mensajes";
import { SITE } from "@/lib/site";

const LUGAR: Record<ReservaPublica["espacio"], string> = {
  mesa: "Comedor",
  despacho: "El Despacho",
  evento: "Evento",
  presupuesto: "Comida de grupo",
  recogida: "Para recoger",
};

const PASOS: { label: string; icon: IconName }[] = [
  { label: "Recibida", icon: "check" },
  { label: "Confirmada", icon: "calendar" },
];

/** Google Calendar con la reserva ya rellena (hora de Madrid). */
function enlaceCalendario(r: ReservaPublica): string {
  const inicio = `${r.fecha.replace(/-/g, "")}T${r.hora.replace(":", "")}00`;
  const fin = new Date(`${r.fecha}T${r.hora}:00Z`);
  fin.setUTCMinutes(fin.getUTCMinutes() + 90);
  const hasta = fin.toISOString().slice(0, 16).replace(/[-:]/g, "") + "00";
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: r.evento ? `${r.evento.titulo} · La Ofi` : "Reserva en La Ofi",
    dates: `${inicio}/${hasta}`,
    ctz: "Europe/Madrid",
    location: `${SITE.name}, ${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.locality}`,
    details: `${r.personas} ${r.personas === 1 ? "persona" : "personas"} · ${enlaceReserva(SITE_URL, r.id)}`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/**
 * Cómo va la reserva: por confirmar, confirmada o cancelada. El local la confirma desde
 * el panel; mientras está por confirmar, se consulta cada 20 s (anon no tiene Realtime).
 */
export function ReservaSeguimiento({ inicial }: { inicial: ReservaPublica }) {
  const [r, setR] = useState(inicial);
  const [cancelando, setCancelando] = useState<"no" | "preguntar" | "enviando">("no");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (r.estado !== "PENDIENTE") return;
    const t = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const x = await obtenerReserva(r.id);
      if (x.ok && x.data) setR(x.data);
    }, 20_000);
    return () => window.clearInterval(t);
  }, [r.id, r.estado]);

  const cancelar = async () => {
    setCancelando("enviando");
    setError(null);
    const x = await cancelarReserva(r.id);
    setCancelando("no");
    if (!x.ok) return setError(x.error);
    setR(x.data);
  };

  const recogida = r.espacio === "recogida";
  const anulada = r.estado === "CANCELADA" || r.estado === "NO_SHOW";
  const confirmada = r.estado === "CONFIRMADA" || r.estado === "SENTADA";
  const mensaje = anulada
    ? "Esta reserva está cancelada. Si quieres otro día u otra hora, llámanos o vuelve a reservar."
    : r.estado === "SENTADA"
      ? "¡Gracias por venir! Esperamos que lo disfrutarais."
      : confirmada
        ? recogida
          ? "Confirmado: lo tendremos listo a tu hora."
          : "Confirmada. ¡Te esperamos!"
        : "Hemos recibido tu solicitud. Te avisamos por WhatsApp en cuanto la confirmemos (esta página también se actualiza sola).";

  const datos: [string, string][] = [
    ["Día", formatearFechaLarga(r.fecha)],
    [recogida ? "Recoges a las" : "Hora", r.hora],
    [recogida ? "Menús" : r.espacio === "evento" ? "Asistentes" : "Personas", String(r.personas)],
    ["A nombre de", r.nombre],
  ];

  return (
    <article className="overflow-hidden rounded-[2rem] border border-carbon/10 bg-white shadow-lift">
      <header className={`px-6 py-8 text-crema sm:px-8 ${anulada ? "bg-carbon" : confirmada ? "bg-oliva" : "bg-noche"}`}>
        <p className="eyebrow text-neon">{r.evento?.titulo ?? LUGAR[r.espacio]}</p>
        <h1 className="mt-2 font-display text-5xl">{recogida ? "Tu pedido" : "Tu reserva"}</h1>
        <p aria-live="polite" className="mt-3 text-lg text-crema/85">
          {mensaje}
        </p>
      </header>

      {!anulada ? (
        <ol className="grid grid-cols-2 gap-1 px-4 py-6 sm:px-8" aria-label="Estado de la reserva">
          {PASOS.map((s, i) => {
            const hecho = i === 0 || confirmada;
            const actual = i === (confirmada ? 1 : 0);
            return (
              <li key={s.label} aria-current={actual ? "step" : undefined} className="flex flex-col items-center gap-2 text-center">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-500 ${hecho ? "bg-marino text-crema" : "bg-arena text-carbon-muted"} ${
                    actual && !confirmada ? "ring-4 ring-neon/50 motion-safe:animate-pulse" : ""
                  }`}
                >
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span className={`text-xs font-semibold ${hecho ? "text-carbon" : "text-carbon-muted"}`}>{i === 1 && !confirmada ? "Por confirmar" : s.label}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <dl className="grid gap-px border-t border-carbon/10 bg-carbon/10 sm:grid-cols-2">
        {datos.map(([k, v]) => (
          <div key={k} className="bg-white px-6 py-4 sm:px-8">
            <dt className="kicker text-carbon-muted">{k}</dt>
            <dd className="mt-1 text-lg text-carbon first-letter:uppercase">{v}</dd>
          </div>
        ))}
      </dl>

      {r.comida?.lineas.length ? (
        <ul className="divide-y divide-carbon/10 border-t border-carbon/10 px-6 sm:px-8">
          {r.comida.lineas.map((l, i) => (
            <li key={i} className="py-3 text-sm font-semibold text-carbon">
              {l.cantidad} × {l.nombre}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-carbon/10 px-6 py-5 sm:px-8">
        {confirmada && r.estado !== "SENTADA" && !recogida ? (
          <a href={enlaceCalendario(r)} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 text-sm">
            <Icon name="calendar" className="h-4 w-4" />
            Añadir al calendario
          </a>
        ) : null}
        {!anulada && r.estado !== "SENTADA" ? (
          <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 text-sm">
            <Icon name="pin" className="h-4 w-4" />
            Cómo llegar
          </a>
        ) : null}
        {anulada ? (
          <Link href="/es/reservar" className="btn-primary min-h-11 text-sm">
            <Icon name="calendar" className="h-4 w-4" />
            Reservar otro día
          </Link>
        ) : null}
        <a href={SITE.phone.href} className="btn-secondary min-h-11 text-sm">
          <Icon name="phone" className="h-4 w-4" />
          {SITE.phone.display}
        </a>
      </div>

      {r.cancelable ? (
        <div className="border-t border-carbon/10 px-6 py-5 sm:px-8">
          {cancelando === "no" ? (
            <button type="button" onClick={() => setCancelando("preguntar")} className="text-sm font-semibold text-terracota underline underline-offset-4">
              No podemos ir: cancelar la reserva
            </button>
          ) : (
            <div className="rounded-2xl bg-terracota-soft/60 p-4">
              <p className="text-sm text-carbon">¿Seguro? La mesa quedará libre para otros.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void cancelar()} disabled={cancelando === "enviando"} className="btn-primary min-h-11 bg-terracota text-sm">
                  {cancelando === "enviando" ? "Cancelando…" : "Sí, cancelar"}
                </button>
                <button type="button" onClick={() => setCancelando("no")} className="btn-secondary min-h-11 text-sm">
                  No, la mantengo
                </button>
              </div>
            </div>
          )}
          {error ? <p className="mt-3 text-sm text-terracota">{error}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
