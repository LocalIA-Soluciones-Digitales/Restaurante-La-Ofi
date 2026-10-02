"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import { vibrar } from "@/lib/haptics";
import { obtenerPedido } from "@/lib/pedidos/actions";
import type { PedidoPublico } from "@/lib/pedidos/types";
import type { EstadoPedido } from "@/lib/restaurant/types";

const PASOS: { estado: EstadoPedido; label: string; icon: IconName }[] = [
  { estado: "RECEIVED", label: "Recibido", icon: "check" },
  { estado: "ACCEPTED", label: "Aceptado", icon: "receipt" },
  { estado: "PREPARING", label: "En preparación", icon: "flame" },
  { estado: "READY", label: "¡Listo!", icon: "bell" },
];
const ORDEN: EstadoPedido[] = ["RECEIVED", "ACCEPTED", "PREPARING", "READY", "DELIVERED"];
const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/**
 * Estado del pedido en vivo (portado de PedidoStatus de Palomita-Bar). anon no
 * puede usar Realtime sobre laofi, así que se consulta cada 5 s hasta que el
 * pedido se entrega o se cancela. El pago online se da por bueno solo cuando el
 * webhook lo ha marcado (payment_status = PAID).
 */
export function PedidoStatus({ inicial, pago }: { inicial: PedidoPublico; pago: "ok" | "cancelado" | null }) {
  const [p, setP] = useState(inicial);
  const [reintentando, setReintentando] = useState(false);
  const previo = useRef(inicial.estado);

  useEffect(() => {
    if (p.estado === "DELIVERED" || p.estado === "CANCELLED") return;
    const t = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const r = await obtenerPedido(p.id);
      if (r.ok && r.data) setP(r.data);
    }, 5000);
    return () => window.clearInterval(t);
  }, [p.id, p.estado]);

  useEffect(() => {
    if (p.estado === "READY" && previo.current !== "READY") vibrar([30, 80, 30, 80, 30]);
    previo.current = p.estado;
  }, [p.estado]);

  const idx = ORDEN.indexOf(p.estado);
  const pendientePago = p.payment_method === "ONLINE" && p.payment_status !== "PAID";

  const reintentarPago = async () => {
    setReintentando(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pedidoId: p.id }) });
    const json = (await res.json().catch(() => ({}))) as { url?: string };
    setReintentando(false);
    if (json.url) window.location.href = json.url;
  };

  return (
    <article className="overflow-hidden rounded-[2rem] border border-carbon/10 bg-white shadow-lift">
      <header className={`px-6 py-8 text-crema sm:px-8 ${p.estado === "READY" ? "bg-oliva" : p.estado === "CANCELLED" ? "bg-carbon" : "bg-noche"}`}>
        <p className="eyebrow text-neon">
          {p.tipo === "MESA" ? (p.mesa?.nombre ?? `Mesa ${p.mesa?.numero}`) : p.grupo ? `Grupo «${p.grupo.nombre}»` : "Para recoger"}
        </p>
        <h1 className="mt-2 font-display text-5xl">Pedido #{p.numero_dia}</h1>
        <p aria-live="polite" className="mt-3 text-lg text-crema/85">
          {p.estado === "CANCELLED"
            ? "Este pedido se ha cancelado. Si tienes dudas, pregunta en barra."
            : p.estado === "DELIVERED"
              ? "Entregado. ¡Que aproveche!"
              : p.estado === "READY"
                ? p.tipo === "MESA"
                  ? "¡Listo! Te lo llevamos enseguida."
                  : "¡Listo! Pasa a recogerlo por la barra."
                : p.recogida_en
                  ? `Lo tendremos para las ${HORA.format(new Date(p.recogida_en))}.`
                  : "Estamos con ello."}
        </p>
      </header>

      {p.estado !== "CANCELLED" ? (
        <ol className="grid grid-cols-4 gap-1 px-4 py-6 sm:px-8" aria-label="Progreso del pedido">
          {PASOS.map((s) => {
            const hecho = idx >= ORDEN.indexOf(s.estado);
            const actual = ORDEN.indexOf(s.estado) === idx;
            return (
              <li key={s.estado} aria-current={actual ? "step" : undefined} className="flex flex-col items-center gap-2 text-center">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-500 ${
                    hecho ? "bg-marino text-crema" : "bg-arena text-carbon-muted"
                  } ${actual && p.estado !== "DELIVERED" ? "ring-4 ring-neon/50 motion-safe:animate-pulse" : ""}`}
                >
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span className={`text-xs font-semibold ${hecho ? "text-carbon" : "text-carbon-muted"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {pendientePago ? (
        <div className="mx-6 mb-6 rounded-2xl bg-terracota-soft/60 p-4 text-sm text-terracota sm:mx-8">
          {pago === "ok" ? (
            <p>Estamos confirmando tu pago con el banco… esta página se actualiza sola.</p>
          ) : (
            <>
              <p>{pago === "cancelado" ? "El pago no se ha completado." : "Pago pendiente."} El pedido no se prepara hasta que esté pagado.</p>
              <button type="button" onClick={() => void reintentarPago()} disabled={reintentando} className="btn-primary mt-3 min-h-11 text-sm">
                <Icon name="card" className="h-4 w-4" />
                Pagar ahora
              </button>
            </>
          )}
        </div>
      ) : p.payment_status === "PAID" ? (
        <p className="mx-6 mb-6 flex items-center gap-2 rounded-2xl bg-oliva-soft p-4 text-sm font-semibold text-oliva sm:mx-8">
          <Icon name="check" className="h-4 w-4" />
          Pagado
        </p>
      ) : null}

      <ul className="divide-y divide-carbon/10 border-t border-carbon/10 px-6 sm:px-8">
        {p.items.map((it, i) => (
          <li key={i} className="flex justify-between gap-4 py-3 text-sm">
            <span>
              <span className="font-semibold text-carbon">
                {it.cantidad} × {it.nombre}
              </span>
              {it.modificadores.length > 0 ? (
                <span className="block text-carbon-muted">
                  {it.modificadores.map((m) => `${m.modificador}: ${m.opciones.map((o) => o.nombre).join(", ").toLowerCase()}`).join(" · ")}
                </span>
              ) : null}
              {it.notas ? <span className="block italic text-carbon-muted">«{it.notas}»</span> : null}
            </span>
            <span className="tabular-nums text-carbon">{formatCentimos(it.cantidad * it.precio_unitario_centimos)}</span>
          </li>
        ))}
      </ul>
      <footer className="flex items-baseline justify-between border-t border-carbon/10 px-6 py-5 sm:px-8">
        <span className="text-carbon-muted">Total</span>
        <span className="font-display text-3xl tabular-nums text-carbon">{formatCentimos(p.total_centimos)}</span>
      </footer>
      <div className="flex flex-wrap gap-3 border-t border-carbon/10 px-6 py-5 sm:px-8">
        {p.tipo === "MESA" ? (
          <button type="button" onClick={() => window.history.back()} className="btn-secondary min-h-11 text-sm">
            <Icon name="chevronLeft" className="h-4 w-4" />
            Volver a la mesa
          </button>
        ) : (
          <Link href={p.grupo ? `/es/pedir?grupo=${p.grupo.token}` : "/es/pedir"} className="btn-secondary min-h-11 text-sm">
            <Icon name="plus" className="h-4 w-4" />
            Pedir algo más
          </Link>
        )}
      </div>
    </article>
  );
}
