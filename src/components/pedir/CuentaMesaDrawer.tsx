"use client";

import { useMemo, useState } from "react";
import { useTableSession } from "@/components/pedir/table-session-context";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { formatCentimos } from "@/lib/format";
import { asumirReparto, avisarMesa } from "@/lib/pedidos/actions";

interface Parte {
  repartoId: string;
  plato: string;
  importe: number;
  pagado: boolean;
  de: string;
}

/**
 * Cuenta de la mesa (portada de CuentaMesaDrawer de Palomita §16.5). Juntos: lo
 * pedido y el total. Cada uno lo suyo: lo que debe, ha pagado y le queda a cada
 * comensal; pagar mi parte online, asumir la de otro o pedir la cuenta.
 */
export function CuentaMesaDrawer({ pagoOnline, onClose }: { pagoOnline: boolean; onClose: () => void }) {
  const s = useTableSession();
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const partes = useMemo(() => {
    const m = new Map<string, Parte[]>();
    for (const p of s?.sesion?.pedidos ?? []) {
      if (p.estado === "CANCELLED") continue;
      for (const it of p.items) {
        for (const r of it.repartos) {
          const lista = m.get(r.participante_id) ?? [];
          lista.push({ repartoId: r.id, plato: it.nombre, importe: r.importe_centimos, pagado: r.pagado, de: r.participante_id });
          m.set(r.participante_id, lista);
        }
      }
    }
    return m;
  }, [s?.sesion]);

  if (!s?.sesion) return null;
  const { sesion, participante } = s;
  const separado = sesion.modo === "SEPARADO";
  const pedidos = sesion.pedidos.filter((p) => p.estado !== "CANCELLED");
  const total = pedidos.reduce((a, p) => a + p.total_centimos, 0);
  const pagado = pedidos.filter((p) => p.payment_status === "PAID").reduce((a, p) => a + p.total_centimos, 0);
  const mias = participante ? (partes.get(participante.id) ?? []) : [];
  const pendienteMio = mias.filter((x) => !x.pagado).reduce((a, x) => a + x.importe, 0);

  const pedirCuenta = async () => {
    const r = await avisarMesa(s.token, "CUENTA");
    setAviso(r.ok ? "Hemos avisado al personal: enseguida os traen la cuenta." : r.error);
  };

  const pagarMiParte = async () => {
    if (!participante) return;
    setCargando(true);
    const res = await fetch("/api/stripe/checkout-participante", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participanteId: participante.id, volverA: `/es/pedir?mesa=${s.token}` }),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    setCargando(false);
    if (json.url) window.location.href = json.url;
    else setAviso(json.error ?? "No se ha podido iniciar el pago.");
  };

  const asumir = async (repartoId: string) => {
    if (!participante) return;
    const r = await asumirReparto(repartoId, participante.id);
    if (!r.ok) setAviso(r.error);
    await s.refrescar();
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cuenta-titulo"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92svh] w-full max-w-xl flex-col rounded-t-[2rem] bg-crema shadow-lift animate-sheet-up sm:rounded-[2rem]">
        <header className="flex items-center justify-between border-b border-carbon/10 px-6 py-5">
          <div>
            <h2 id="cuenta-titulo" className="text-3xl text-carbon">
              Cuenta de la mesa
            </h2>
            <p className="text-sm text-carbon-muted">
              {sesion.mesa.nombre ?? `Mesa ${sesion.mesa.numero}`} · {separado ? "cada uno lo suyo" : "todos juntos"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-carbon/15">
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {pedidos.length === 0 ? <p className="py-8 text-center text-carbon-muted">Todavía no hay nada pedido en esta mesa.</p> : null}

          {!separado && pedidos.length > 0 ? (
            <ul className="divide-y divide-carbon/10">
              {pedidos.flatMap((p) =>
                p.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-3 py-2 text-sm">
                    <span>
                      {it.cantidad} × {it.nombre}
                    </span>
                    <span className="tabular-nums">{formatCentimos(it.cantidad * it.precio_unitario_centimos)}</span>
                  </li>
                )),
              )}
            </ul>
          ) : null}

          {separado
            ? sesion.participantes.map((p) => {
                const lista = partes.get(p.id) ?? [];
                const debe = lista.reduce((a, x) => a + x.importe, 0);
                const pag = lista.filter((x) => x.pagado).reduce((a, x) => a + x.importe, 0);
                const soyYo = p.id === participante?.id;
                return (
                  <section key={p.id} className={`rounded-2xl border p-4 ${soyYo ? "border-marino/40 bg-white" : "border-carbon/10 bg-white/60"}`}>
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-xl text-carbon">
                        {p.nombre}
                        {soyYo ? <span className="ml-2 text-sm font-sans text-carbon-muted">(tú)</span> : null}
                      </h3>
                      <p className="text-sm tabular-nums text-carbon-muted">
                        Debe {formatCentimos(debe)} · Pagado {formatCentimos(pag)}
                      </p>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm">
                      {lista.map((x) => (
                        <li key={x.repartoId} className="flex items-center justify-between gap-3">
                          <span className={x.pagado ? "text-carbon-muted line-through" : ""}>{x.plato}</span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">{formatCentimos(x.importe)}</span>
                            {!soyYo && !x.pagado && participante ? (
                              <button type="button" onClick={() => void asumir(x.repartoId)} className="text-xs font-semibold text-terracota underline-offset-4 hover:underline">
                                Lo pago yo
                              </button>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })
            : null}

          {aviso ? (
            <p role="status" className="rounded-2xl bg-oliva-soft p-4 text-sm text-oliva">
              {aviso}
            </p>
          ) : null}
        </div>

        <footer className="space-y-3 border-t border-carbon/10 px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="flex items-baseline justify-between">
            <span className="text-carbon-muted">{separado ? "Tu parte pendiente" : "Total de la mesa"}</span>
            <span className="font-display text-3xl tabular-nums text-carbon">
              {formatCentimos(separado ? pendienteMio : total - pagado)}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {separado && pagoOnline && pendienteMio > 0 ? (
              <button type="button" onClick={() => void pagarMiParte()} disabled={cargando} className="btn-primary">
                <Icon name="card" className="h-4 w-4" />
                Pagar mi parte
              </button>
            ) : null}
            <button type="button" onClick={() => void pedirCuenta()} className="btn-secondary">
              <Icon name="receipt" className="h-4 w-4" />
              Pedir la cuenta
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
