"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { ESTADO, type EstadoReserva, type Reserva } from "@/components/admin/ReservasBoard";
import { Aviso, botonSecundario } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { rpcAdmin } from "@/lib/admin/actions";
import { formatearFechaLarga, hoyEnMadrid } from "@/lib/format";

const activa = (r: Reserva) => r.estado !== "CANCELADA" && r.estado !== "NO_SHOW";
/** Primero lo que hay que confirmar, luego los confirmados y al final los cancelados. */
const ORDEN: Record<EstadoReserva, number> = { PENDIENTE: 0, CONFIRMADA: 1, SENTADA: 2, NO_SHOW: 3, CANCELADA: 4 };

/**
 * Quién se ha apuntado a un evento, con su teléfono, para confirmarlos o
 * cancelarlos sin ir a buscar el día en Reservas. Avisa al padre con el recuento
 * nuevo para que la tarjeta del evento siga cuadrando.
 */
export function ApuntadosEvento({
  evento,
  onClose,
  onRecuento,
}: {
  evento: { id: string; titulo: string; fecha: string; aforo: number | null };
  onClose: () => void;
  onRecuento: (r: { personas: number; grupos: number } | null) => void;
}) {
  const [lista, setLista] = useState<Reserva[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);

  useEffect(() => {
    const hoy = hoyEnMadrid();
    void rpcAdmin<Reserva[]>("laofi_admin_reservas", { p_desde: evento.fecha < hoy ? evento.fecha : hoy, p_hasta: evento.fecha }).then((res) => {
      if (!res.ok) return setError(res.error);
      setLista(res.data.filter((r) => r.evento_id === evento.id));
    });
  }, [evento.id, evento.fecha]);

  const cambiar = async (r: Reserva, e: EstadoReserva) => {
    if (e === "CANCELADA" && !window.confirm(`¿Cancelar la plaza de ${r.nombre} (${r.personas} ${r.personas === 1 ? "persona" : "personas"})?`)) return;
    setCambiando(r.id);
    const res = await rpcAdmin<Reserva>("laofi_admin_reserva_estado", { p_id: r.id, p_estado: e });
    setCambiando(null);
    if (!res.ok) return setError(res.error);
    const nueva = (lista ?? []).map((x) => (x.id === r.id ? { ...x, ...res.data } : x));
    setLista(nueva);
    const activas = nueva.filter(activa);
    onRecuento(activas.length ? { personas: activas.reduce((a, x) => a + x.personas, 0), grupos: activas.length } : null);
  };

  const activas = (lista ?? []).filter(activa);
  const personas = activas.reduce((a, x) => a + x.personas, 0);
  const pendientes = activas.filter((r) => r.estado === "PENDIENTE").length;
  const ordenada = [...(lista ?? [])].sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || a.nombre.localeCompare(b.nombre, "es"));

  return (
    <Modal titulo={evento.titulo} onClose={onClose}>
      <div className="grid gap-4">
        <p className="-mt-1 text-sm opacity-70">
          Apuntados · <span className="inline-block first-letter:uppercase">{formatearFechaLarga(evento.fecha)}</span>
        </p>

        {lista ? (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-arena px-2 py-3 dark:bg-noche-3">
              <dt className="text-xs opacity-70">Personas</dt>
              <dd className="font-display text-2xl tabular-nums">
                {personas}
                {evento.aforo ? <span className="text-base opacity-60"> / {evento.aforo}</span> : null}
              </dd>
            </div>
            <div className="rounded-xl bg-arena px-2 py-3 dark:bg-noche-3">
              <dt className="text-xs opacity-70">Solicitudes</dt>
              <dd className="font-display text-2xl tabular-nums">{activas.length}</dd>
            </div>
            <div className={`rounded-xl px-2 py-3 ${pendientes ? "bg-ratan text-carbon" : "bg-arena dark:bg-noche-3"}`}>
              <dt className="text-xs opacity-70">Por confirmar</dt>
              <dd className="font-display text-2xl tabular-nums">{pendientes}</dd>
            </div>
          </dl>
        ) : null}

        {error ? <Aviso>{error}</Aviso> : null}
        {!lista && !error ? <p className="py-6 text-center opacity-60">Cargando…</p> : null}
        {lista && lista.length === 0 ? <p className="py-6 text-center opacity-60">Nadie apuntado todavía.</p> : null}

        {ordenada.length ? (
          <ul className="grid gap-2">
            {ordenada.map((r) => (
              <li key={r.id} className={`rounded-xl border border-carbon/[0.08] bg-white p-3 dark:border-crema/10 dark:bg-noche-3 ${activa(r) ? "" : "opacity-55"}`}>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-neon-soft font-display text-lg tabular-nums text-neon-deep dark:bg-neon/20 dark:text-neon" aria-label={`${r.personas} ${r.personas === 1 ? "persona" : "personas"}`}>
                    {r.personas}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.nombre}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO[r.estado].clase}`}>{ESTADO[r.estado].label}</span>
                    </p>
                    <p className="mt-0.5 break-words text-sm opacity-70">
                      {r.telefono}
                      {r.email ? ` · ${r.email}` : ""}
                      {r.origen !== "web" ? " · metida a mano" : ""}
                    </p>
                    {r.notas ? <p className="mt-1 text-sm italic opacity-80">«{r.notas}»</p> : null}
                  </div>
                  <a href={`tel:${r.telefono.replace(/\s/g, "")}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1 ring-carbon/10 dark:ring-crema/15" aria-label={`Llamar a ${r.nombre}`}>
                    <Icon name="phone" className="h-4 w-4" />
                  </a>
                </div>
                {activa(r) ? (
                  <div className="mt-3 flex gap-2">
                    {r.estado === "PENDIENTE" ? (
                      <button
                        type="button"
                        disabled={cambiando !== null}
                        onClick={() => void cambiar(r, "CONFIRMADA")}
                        className="min-h-10 flex-1 rounded-lg bg-marino px-3 text-sm font-semibold text-crema disabled:opacity-50 dark:bg-neon dark:text-noche"
                      >
                        {cambiando === r.id ? "…" : "Confirmar"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={cambiando !== null}
                      onClick={() => void cambiar(r, "CANCELADA")}
                      className="min-h-10 rounded-lg px-3 text-sm font-semibold text-terracota ring-1 ring-terracota/30 disabled:opacity-50"
                    >
                      Cancelar plaza
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <Link href="/admin/reservas" className={`${botonSecundario} justify-center`}>
          <Icon name="calendar" className="h-4 w-4" />
          Apuntar a alguien a mano (en Reservas)
        </Link>
      </div>
    </Modal>
  );
}
