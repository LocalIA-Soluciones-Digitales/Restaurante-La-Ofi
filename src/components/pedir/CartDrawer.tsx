"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart, type CambioCarta } from "@/components/pedir/cart-context";
import { useTableSession } from "@/components/pedir/table-session-context";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { formatCentimos } from "@/lib/format";
import { vibrar } from "@/lib/haptics";
import { cartaActual, crearPedido } from "@/lib/pedidos/actions";
import { guardarReciente } from "@/lib/pedidos/recientes";
import { repartirLinea } from "@/lib/pedidos/reparto";
import type { ConfigPedidos, GrupoPublico, PedidoInput } from "@/lib/pedidos/types";

export type PedirContexto = { tipo: "mesa" } | { tipo: "recogida" } | { tipo: "grupo"; grupo: GrupoPublico };

const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/**
 * Cesta y confirmación (portada de CartDrawer de Palomita-Bar). Antes de enviar
 * vuelve a leer la carta: si algo ha subido de precio o se ha agotado, lo enseña
 * y pide revisarlo (nunca se envía un importe caducado). El servidor vuelve a
 * comprobarlo todo (total_esperado_centimos → PRECIO_CAMBIADO).
 */
export function CartDrawer({ contexto, config, onClose }: { contexto: PedirContexto; config: ConfigPedidos; onClose: () => void }) {
  const cart = useCart();
  const mesa = useTableSession();
  const router = useRouter();
  const ref = useDialogA11y<HTMLDivElement>(onClose);

  const separado = contexto.tipo === "mesa" && mesa?.modo === "SEPARADO";
  const otros = separado ? (mesa?.sesion?.participantes ?? []).filter((p) => p.id !== mesa?.participante?.id) : [];
  const puedeOnline = config.pagos.online && !separado;
  const puedeLocal = config.pagos.en_local || separado;

  const [pago, setPago] = useState<"ONLINE" | "LOCAL">(puedeLocal ? "LOCAL" : "ONLINE");
  const [franja, setFranja] = useState(config.franjas.find((f) => f.libres > 0)?.hora ?? "");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambios, setCambios] = useState<CambioCarta[] | null>(null);

  const recogida = contexto.tipo !== "mesa";
  const faltaDato =
    cart.lineas.length === 0 ||
    (recogida && !nombre.trim()) ||
    (contexto.tipo === "recogida" && !franja) ||
    (separado && !mesa?.participante);

  const confirmar = async () => {
    setError(null);
    setEnviando(true);
    try {
      // 1) Precios y disponibilidad recién leídos.
      const fresca = await cartaActual();
      if (fresca) {
        const c = cart.aplicarCarta(fresca);
        if (c.length > 0) {
          setCambios(c);
          return;
        }
      }

      // 2) Pedido. El servidor recalcula y valida todo.
      const yo = mesa?.participante?.id;
      const pedido: PedidoInput = {
        tipo: contexto.tipo === "mesa" ? "MESA" : "RECOGIDA",
        payment_method: pago,
        total_esperado_centimos: cart.totalCentimos,
        notas: notas.trim() || undefined,
        items: cart.lineas.map((l) => ({
          producto_id: l.productoId,
          cantidad: l.cantidad,
          opciones: l.seleccion.flatMap((s) => s.opcionIds),
          notas: l.notas,
          ...(separado && yo ? { reparto: repartirLinea(l.precioUnitario * l.cantidad, [yo, ...l.compartidoCon]) } : {}),
        })),
      };
      if (contexto.tipo === "mesa" && mesa) {
        pedido.mesa_token = mesa.token;
        if (mesa.sesion) pedido.sesion_id = mesa.sesion.id;
        if (yo) pedido.participante_id = yo;
      } else {
        pedido.nombre = nombre.trim();
        pedido.telefono = telefono.trim() || undefined;
        if (contexto.tipo === "grupo") pedido.grupo_token = contexto.grupo.token;
        else pedido.recogida_en = franja;
      }

      const r = await crearPedido(pedido);
      if (!r.ok) {
        if (r.codigo === "PRECIO_CAMBIADO" || r.codigo === "AGOTADO") {
          const otra = await cartaActual();
          if (otra) setCambios(cart.aplicarCarta(otra));
        }
        setError(r.error);
        return;
      }

      guardarReciente({ id: r.data.id, numero: r.data.numero_dia });
      cart.vaciar();
      vibrar([20, 40, 20]);

      // 3) Pago online: a Stripe. La confirmación llegará por el webhook.
      if (pago === "ONLINE") {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pedidoId: r.data.id }),
        });
        const json = (await res.json().catch(() => ({}))) as { url?: string };
        if (json.url) {
          window.location.href = json.url;
          return;
        }
      }
      if (contexto.tipo === "mesa") {
        await mesa?.refrescar();
        onClose();
        router.push(`/es/pedido/${r.data.id}?volver=mesa`);
      } else {
        router.push(`/es/pedido/${r.data.id}`);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cesta-titulo"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[94svh] w-full max-w-xl flex-col rounded-t-[2rem] bg-crema shadow-lift animate-sheet-up sm:rounded-[2rem]">
        <header className="flex items-center justify-between gap-4 border-b border-carbon/10 px-6 py-5">
          <div>
            <h2 id="cesta-titulo" className="text-3xl text-carbon">
              Tu pedido
            </h2>
            <p className="text-sm text-carbon-muted">
              {contexto.tipo === "mesa"
                ? `${mesa?.mesa.nombre ?? `Mesa ${mesa?.mesa.numero}`}${separado && mesa?.participante ? ` · ${mesa.participante.nombre}` : ""}`
                : contexto.tipo === "grupo"
                  ? `Grupo «${contexto.grupo.nombre}» · recogida ${HORA.format(new Date(contexto.grupo.recogida_en))}`
                  : "Para recoger"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-carbon/15">
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {cambios && cambios.length > 0 ? (
            <div role="alert" className="rounded-2xl border border-terracota/30 bg-terracota-soft/60 p-4 text-sm text-terracota">
              <p className="font-semibold">La carta ha cambiado desde que añadiste estos platos:</p>
              <ul className="mt-2 space-y-1">
                {cambios.map((c, i) => (
                  <li key={i}>
                    {c.nombre}:{" "}
                    {c.ahora === null ? "ya no está disponible (lo hemos quitado)" : `${formatCentimos(c.antes)} → ${formatCentimos(c.ahora)}`}
                  </li>
                ))}
              </ul>
              <p className="mt-2">Revisa el pedido y confirma de nuevo.</p>
            </div>
          ) : null}

          {cart.lineas.length === 0 ? (
            <p className="py-10 text-center text-carbon-muted">Tu cesta está vacía.</p>
          ) : (
            <ul className="divide-y divide-carbon/10">
              {cart.lineas.map((l) => (
                <li key={l.key} className="py-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg leading-tight text-carbon">{l.nombre}</p>
                      {l.resumen ? <p className="text-sm text-carbon-muted">{l.resumen}</p> : null}
                      {l.notas ? <p className="text-sm italic text-carbon-muted">«{l.notas}»</p> : null}
                    </div>
                    <p className="font-semibold tabular-nums text-marino">{formatCentimos(l.precioUnitario * l.cantidad)}</p>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center rounded-full border border-carbon/15 bg-white">
                      <button type="button" onClick={() => cart.cambiarCantidad(l.key, -1)} className="grid h-10 w-10 place-items-center">
                        <Icon name={l.cantidad === 1 ? "trash" : "minus"} className="h-4 w-4" />
                        <span className="sr-only">{l.cantidad === 1 ? `Quitar ${l.nombre}` : `Uno menos de ${l.nombre}`}</span>
                      </button>
                      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">{l.cantidad}</span>
                      <button type="button" onClick={() => cart.cambiarCantidad(l.key, 1)} className="grid h-10 w-10 place-items-center">
                        <Icon name="plus" className="h-4 w-4" />
                        <span className="sr-only">Uno más de {l.nombre}</span>
                      </button>
                    </div>
                    <span className="text-xs text-carbon-muted">{formatCentimos(l.precioUnitario)} / ud.</span>
                  </div>
                  {separado && otros.length > 0 ? (
                    <fieldset className="mt-3">
                      <legend className="text-xs font-semibold uppercase tracking-wider text-carbon-muted">Compartir con</legend>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {otros.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            aria-pressed={l.compartidoCon.includes(p.id)}
                            onClick={() => cart.toggleCompartir(l.key, p.id)}
                            className="min-h-9 rounded-full border border-carbon/15 bg-white px-3 text-sm aria-pressed:border-oliva aria-pressed:bg-oliva aria-pressed:text-crema"
                          >
                            {p.nombre}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {recogida && cart.lineas.length > 0 ? (
            <fieldset className="grid gap-3">
              <legend className="mb-2 font-sans text-sm font-semibold uppercase tracking-eyebrow text-carbon">Recogida</legend>
              {contexto.tipo === "recogida" ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold text-carbon">Hora de recogida</span>
                  <select
                    value={franja}
                    onChange={(e) => setFranja(e.target.value)}
                    className="h-12 rounded-2xl border border-carbon/15 bg-white px-4 text-base focus:border-marino focus:outline-none"
                  >
                    {config.franjas.map((f) => (
                      <option key={f.hora} value={f.hora} disabled={f.libres === 0}>
                        {HORA.format(new Date(f.hora))}
                        {f.libres === 0 ? " · completa" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-carbon">Tu nombre</span>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value.slice(0, 60))}
                  autoComplete="name"
                  required
                  className="h-12 rounded-2xl border border-carbon/15 bg-white px-4 text-base focus:border-marino focus:outline-none"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-carbon">
                  Teléfono <span className="font-normal text-carbon-muted">(opcional, por si hay que avisarte)</span>
                </span>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value.replace(/[^0-9+ ]/g, "").slice(0, 16))}
                  inputMode="tel"
                  autoComplete="tel"
                  className="h-12 rounded-2xl border border-carbon/15 bg-white px-4 text-base focus:border-marino focus:outline-none"
                />
              </label>
            </fieldset>
          ) : null}

          {cart.lineas.length > 0 ? (
            <>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-carbon">Notas para el pedido</span>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value.slice(0, 300))}
                  rows={2}
                  className="rounded-2xl border border-carbon/15 bg-white px-4 py-3 text-base focus:border-marino focus:outline-none"
                />
              </label>

              {separado ? (
                <p className="rounded-2xl bg-arena p-4 text-sm text-carbon-muted">
                  Cada uno paga su parte al final desde «Cuenta de la mesa»: online o en barra.
                </p>
              ) : (
                <fieldset>
                  <legend className="mb-2 font-sans text-sm font-semibold uppercase tracking-eyebrow text-carbon">Pago</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {puedeOnline ? (
                      <PagoOpcion activo={pago === "ONLINE"} onClick={() => setPago("ONLINE")} icon="card" titulo="Pagar ahora" texto="Con tarjeta, de forma segura con Stripe." />
                    ) : null}
                    {puedeLocal ? (
                      <PagoOpcion
                        activo={pago === "LOCAL"}
                        onClick={() => setPago("LOCAL")}
                        icon="cash"
                        titulo={recogida ? "Pagar al recoger" : "Pagar en el local"}
                        texto={recogida ? "En barra, al recoger el pedido." : "Al terminar, en mesa o en barra."}
                      />
                    ) : null}
                  </div>
                </fieldset>
              )}
            </>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm font-semibold text-terracota">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-carbon/10 px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-carbon-muted">Total</span>
            <span className="font-display text-3xl tabular-nums text-carbon">{formatCentimos(cart.totalCentimos)}</span>
          </div>
          <button type="button" onClick={() => void confirmar()} disabled={faltaDato || enviando} className="btn-primary w-full disabled:opacity-50">
            {enviando ? "Enviando…" : pago === "ONLINE" && !separado ? "Pagar y enviar pedido" : "Enviar pedido"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function PagoOpcion({
  activo,
  onClick,
  icon,
  titulo,
  texto,
}: {
  activo: boolean;
  onClick: () => void;
  icon: "card" | "cash";
  titulo: string;
  texto: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className="flex items-start gap-3 rounded-2xl border border-carbon/15 bg-white p-4 text-left transition-colors aria-pressed:border-marino aria-pressed:ring-2 aria-pressed:ring-marino/30"
    >
      <Icon name={icon} className="mt-0.5 h-5 w-5 text-marino" />
      <span>
        <span className="block font-semibold text-carbon">{titulo}</span>
        <span className="text-sm text-carbon-muted">{texto}</span>
      </span>
    </button>
  );
}
