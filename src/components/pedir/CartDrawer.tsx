"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart, type CambioCarta, type CartLinea } from "@/components/pedir/cart-context";
import { useTableSession } from "@/components/pedir/table-session-context";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { formatCentimos } from "@/lib/format";
import { vibrar } from "@/lib/haptics";
import { href } from "@/lib/i18n";
import { cartaActual, crearPedido, mesaPorNumero } from "@/lib/pedidos/actions";
import { guardarReciente } from "@/lib/pedidos/recientes";
import { repartirLinea } from "@/lib/pedidos/reparto";
import type { ConfigPedidos, GrupoPublico, PedidoInput } from "@/lib/pedidos/types";
import type { CartaSeccion } from "@/lib/restaurant/types";
import { SITE, TITULAR } from "@/lib/site";

export type PedirContexto = { tipo: "mesa" } | { tipo: "recogida" } | { tipo: "grupo"; grupo: GrupoPublico };

const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/**
 * Cesta y confirmación (portada de CartDrawer de Palomita-Bar). Antes de enviar
 * vuelve a leer la carta: si algo ha subido de precio o se ha agotado, lo enseña
 * y pide revisarlo (nunca se envía un importe caducado). El servidor vuelve a
 * comprobarlo todo (total_esperado_centimos → PRECIO_CAMBIADO).
 */
export function CartDrawer({
  contexto,
  config,
  secciones,
  onClose,
}: {
  contexto: PedirContexto;
  config: ConfigPedidos;
  /** Carta actual: de ahí sale la foto de cada línea (también en cestas guardadas). */
  secciones: CartaSeccion[];
  onClose: () => void;
}) {
  const fotos = useMemo(
    () => new Map(secciones.flatMap((s) => s.items).flatMap((i) => (i.imagen ? [[i.id, i.imagen.src] as const] : []))),
    [secciones],
  );
  const cart = useCart();
  const mesa = useTableSession();
  const router = useRouter();
  const ref = useDialogA11y<HTMLDivElement>(onClose);

  const separado = contexto.tipo === "mesa" && mesa?.modo === "SEPARADO";
  const otros = separado ? (mesa?.sesion?.participantes ?? []).filter((p) => p.id !== mesa?.participante?.id) : [];
  const puedeOnline = config.pagos.online && !separado;
  const puedeLocal = config.pagos.en_local || separado;

  const [pago, setPago] = useState<"ONLINE" | "LOCAL">(puedeLocal ? "LOCAL" : "ONLINE");
  // Con menú del día en la cesta, solo las horas hasta que termina el menú.
  const conMenu = cart.lineas.some((l) => l.menuPlatos);
  const franjas = conMenu && config.menu_hasta ? config.franjas.filter((f) => HORA.format(new Date(f.hora)) <= config.menu_hasta!) : config.franjas;
  const [franjaElegida, setFranja] = useState("");
  const franja = franjas.some((f) => f.hora === franjaElegida && f.libres > 0) ? franjaElegida : (franjas.find((f) => f.libres > 0)?.hora ?? "");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  // Factura a nombre de empresa: va en las notas del pedido (barra la ve en la comanda y en caja).
  const [factura, setFactura] = useState({ activa: false, razon: "", cif: "" });
  const notaFactura = factura.activa && factura.razon.trim() && factura.cif.trim() ? `FACTURA: ${factura.razon.trim().slice(0, 80)} · CIF ${factura.cif.trim().toUpperCase().slice(0, 12)}` : "";
  const notasPedido = [notaFactura, notas.trim()].filter(Boolean).join(" · ").slice(0, 300);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambios, setCambios] = useState<CambioCarta[] | null>(null);
  // Paso de revisión: antes de enviar se enseña un resumen de todo el pedido.
  const [revisando, setRevisando] = useState(false);
  // Sin QR (carta o /pedir): el cliente puede decir que está sentado y dar el número
  // de su mesa. Solo vale si sala ya la ha abierto (laofi_mesa_por_numero).
  // «Pedir para recoger» es para llevar: sin pedir a una mesa (Carlos no usa pedidos en mesa).
  const destino = "recogida" as "recogida" | "mesa";
  const [numeroMesa] = useState("");
  const [mesaDestino, setMesaDestino] = useState<{ token: string; etiqueta: string } | null>(null);
  const [comprobando, setComprobando] = useState(false);

  const enMesa = contexto.tipo === "recogida" && destino === "mesa";
  const recogida = contexto.tipo !== "mesa" && !enMesa;
  // Recogida sin franjas hoy (fuera de horario o desactivada): la cesta se guarda, pero no se envía.
  const sinRecogida = contexto.tipo === "recogida" && !config.recogida_activa;
  const faltaDato =
    (sinRecogida && !enMesa) ||
    cart.lineas.length === 0 ||
    (recogida && !nombre.trim()) ||
    (recogida && factura.activa && !notaFactura) ||
    (contexto.tipo === "recogida" && !enMesa && !franja) ||
    (enMesa && !numeroMesa.trim()) ||
    (separado && !mesa?.participante);

  const revisar = async () => {
    setError(null);
    if (enMesa) {
      setComprobando(true);
      try {
        const r = await mesaPorNumero(numeroMesa);
        const n = numeroMesa.trim().toUpperCase().replace(/^MESA\s*/, "");
        if (!r.ok) return setError(r.error);
        if (!r.data) return setError(`No encontramos la mesa «${n}». Comprueba el número en la mesa o pregunta al personal.`);
        if (r.data.estado === "cerrada") {
          return setError(
            `La mesa ${n} aún no está abierta. Pide a un camarero que la abra y vuelve a intentarlo${config.recogida_activa ? ", o elige «Para recoger»." : "."}`,
          );
        }
        setMesaDestino({ token: r.data.token, etiqueta: `Mesa ${n}` });
      } finally {
        setComprobando(false);
      }
    }
    setRevisando(true);
  };

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
          setRevisando(false);
          return;
        }
      }

      // 2) Pedido. El servidor recalcula y valida todo.
      const yo = mesa?.participante?.id;
      const pedido: PedidoInput = {
        tipo: contexto.tipo === "mesa" || enMesa ? "MESA" : "RECOGIDA",
        payment_method: pago,
        total_esperado_centimos: cart.totalCentimos,
        notas: notasPedido || undefined,
        items: cart.lineas.map((l) =>
          l.menuPlatos
            ? { menu_dia: true as const, platos: l.menuPlatos, cantidad: l.cantidad, notas: l.notas }
            : {
                producto_id: l.productoId,
                cantidad: l.cantidad,
                opciones: l.seleccion.flatMap((s) => s.opcionIds),
                notas: l.notas,
                ...(separado && yo ? { reparto: repartirLinea(l.precioUnitario * l.cantidad, [yo, ...l.compartidoCon]) } : {}),
              },
        ),
      };
      if (contexto.tipo === "mesa" && mesa) {
        pedido.mesa_token = mesa.token;
        if (mesa.sesion) pedido.sesion_id = mesa.sesion.id;
        if (yo) pedido.participante_id = yo;
      } else if (enMesa) {
        // Sin sesión de mesa: el pedido suma a la cuenta de la mesa, como una comanda del TPV.
        if (!mesaDestino) return;
        pedido.mesa_token = mesaDestino.token;
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
          setRevisando(false);
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
                  : enMesa
                    ? "En tu mesa"
                    : "Para recoger"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-carbon/15">
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
        </header>

        {revisando ? (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <ResumenPedido
              lineas={cart.lineas}
              fotos={fotos}
              datos={[
                enMesa && mesaDestino ? ["Mesa", `${mesaDestino.etiqueta} · te lo llevamos`] : null,
                contexto.tipo === "recogida" && !enMesa && franja ? ["Recogida", `Hoy a las ${HORA.format(new Date(franja))}`] : null,
                contexto.tipo === "grupo" ? ["Recogida", `Grupo «${contexto.grupo.nombre}» · ${HORA.format(new Date(contexto.grupo.recogida_en))}`] : null,
                contexto.tipo === "mesa" ? ["Mesa", `${mesa?.mesa.nombre ?? `Mesa ${mesa?.mesa.numero}`}${separado && mesa?.participante ? ` · ${mesa.participante.nombre}` : ""}`] : null,
                recogida ? ["Nombre", nombre.trim()] : null,
                recogida && telefono.trim() ? ["Teléfono", telefono.trim()] : null,
                notaFactura ? ["Factura", notaFactura.replace(/^FACTURA: /, "")] : null,
                notas.trim() ? ["Notas", notas.trim()] : null,
                separado
                  ? ["Pago", "Cada uno su parte, desde «Cuenta de la mesa»"]
                  : ["Pago", pago === "ONLINE" ? "Ahora, con tarjeta" : recogida ? "Al recoger, en barra" : "En el local"],
              ]}
            />
            {error ? (
              <p role="alert" className="text-sm font-semibold text-terracota">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
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
                    <Miniatura src={fotos.get(l.productoId)} className="h-16 w-16" />
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

          {sinRecogida && !enMesa && cart.lineas.length > 0 ? (
            <p className="flex gap-2 rounded-2xl bg-arena p-4 text-sm text-carbon-muted">
              <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-marino" />
              Ahora mismo no hay horas de recogida disponibles. Guardamos tu pedido en este dispositivo unas horas: vuelve en horario de
              recogida para enviarlo, o llámanos.
            </p>
          ) : null}

          {recogida && !sinRecogida && cart.lineas.length > 0 ? (
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
                    {franjas.map((f) => (
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
                  onChange={(e) => setNotas(e.target.value.slice(0, 200))}
                  rows={2}
                  className="rounded-2xl border border-carbon/15 bg-white px-4 py-3 text-base focus:border-marino focus:outline-none"
                />
              </label>

              {recogida ? (
                <div className="grid gap-2">
                  <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-carbon">
                    <input type="checkbox" checked={factura.activa} onChange={(e) => setFactura({ ...factura, activa: e.target.checked })} className="h-5 w-5 shrink-0 accent-[theme(colors.marino.DEFAULT)]" />
                    Necesito factura a nombre de mi empresa
                  </label>
                  {factura.activa ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_10rem]">
                      <input
                        aria-label="Razón social"
                        placeholder="Razón social"
                        autoComplete="organization"
                        required
                        value={factura.razon}
                        onChange={(e) => setFactura({ ...factura, razon: e.target.value.slice(0, 80) })}
                        className="h-12 rounded-2xl border border-carbon/15 bg-white px-4 text-base focus:border-marino focus:outline-none"
                      />
                      <input
                        aria-label="CIF"
                        placeholder="CIF"
                        required
                        value={factura.cif}
                        onChange={(e) => setFactura({ ...factura, cif: e.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 12) })}
                        className="h-12 rounded-2xl border border-carbon/15 bg-white px-4 text-base uppercase focus:border-marino focus:outline-none"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

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

        </div>
        )}

        <footer className="border-t border-carbon/10 px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-carbon-muted">
              Total <span className="text-xs">(IVA incluido)</span>
            </span>
            <span className="font-display text-3xl tabular-nums text-carbon">{formatCentimos(cart.totalCentimos)}</span>
          </div>
          {revisando ? (
            <>
            {/* Información previa a la compra (TRLGDCU arts. 60 y 97, LSSI art. 27). */}
            <p className="mb-3 text-xs leading-relaxed text-carbon-muted">
              Vende {(config.titular?.razonSocial ?? TITULAR.razonSocial) || SITE.name}
              {(config.titular?.nif ?? TITULAR.nif) ? ` (NIF ${config.titular?.nif ?? TITULAR.nif})` : ""}, {SITE.address.street}, {SITE.address.locality}. Al ser comida preparada para consumir en el
              momento, no hay derecho de desistimiento (art. 103.d TRLGDCU). Para cualquier problema con tu pedido, llámanos al {SITE.phone.display}.{" "}
              <Link href={href("es", "/aviso-legal")} className="underline">
                Aviso legal
              </Link>{" "}
              ·{" "}
              <Link href={href("es", "/privacidad")} className="underline">
                Privacidad
              </Link>
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => setRevisando(false)} disabled={enviando} className="btn-secondary">
                Modificar
              </button>
              <button type="button" onClick={() => void confirmar()} disabled={faltaDato || enviando} className="btn-primary w-full disabled:opacity-50">
                {enviando ? "Enviando…" : pago === "ONLINE" && !separado ? "Pagar y enviar pedido" : "Confirmar y enviar"}
              </button>
            </div>
            </>
          ) : (
            <>
              {!error && recogida && !sinRecogida && cart.lineas.length > 0 && !nombre.trim() ? (
                <p className="mb-2 text-center text-sm text-carbon-muted">Escribe tu nombre para continuar.</p>
              ) : null}
              {!error && enMesa && cart.lineas.length > 0 && !numeroMesa.trim() ? (
                <p className="mb-2 text-center text-sm text-carbon-muted">Escribe el número de tu mesa para continuar.</p>
              ) : null}
              {error ? (
                <p role="alert" className="mb-2 text-center text-sm font-semibold text-terracota">
                  {error}
                </p>
              ) : null}
              <button type="button" onClick={() => void revisar()} disabled={faltaDato || comprobando} className="btn-primary w-full disabled:opacity-50">
                {comprobando ? "Comprobando la mesa…" : "Revisar pedido"}
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

/** Foto pequeña del plato; sin foto, un hueco con el icono de la carta. */
function Miniatura({ src, className }: { src?: string; className: string }) {
  return src ? (
    <Image src={src} alt="" width={128} height={128} className={`${className} shrink-0 rounded-xl object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} grid shrink-0 place-items-center rounded-xl bg-arena text-carbon-muted`}>
      <Icon name="utensils" className="h-5 w-5" />
    </span>
  );
}

/** Resumen de solo lectura del pedido: lo que se va a enviar, tal cual. */
function ResumenPedido({ lineas, fotos, datos }: { lineas: CartLinea[]; fotos: Map<string, string>; datos: ([string, string] | null)[] }) {
  return (
    <section aria-labelledby="resumen-titulo" className="grid gap-5">
      <div>
        <h3 id="resumen-titulo" className="font-sans text-sm font-semibold uppercase tracking-eyebrow text-carbon">
          Revisa tu pedido
        </h3>
        <p className="mt-1 text-sm text-carbon-muted">Comprueba que todo está bien antes de enviarlo a cocina.</p>
      </div>
      <ul className="divide-y divide-carbon/10 rounded-2xl border border-carbon/10 bg-white px-4">
        {lineas.map((l) => (
          <li key={l.key} className="flex items-center gap-3 py-3">
            <Miniatura src={fotos.get(l.productoId)} className="h-12 w-12" />
            <span className="min-w-8 font-semibold tabular-nums text-marino">{l.cantidad} ×</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg leading-tight text-carbon">{l.nombre}</p>
              {l.resumen ? <p className="text-sm text-carbon-muted">{l.resumen}</p> : null}
              {l.notas ? <p className="text-sm italic text-carbon-muted">«{l.notas}»</p> : null}
            </div>
            <p className="font-semibold tabular-nums text-carbon">{formatCentimos(l.precioUnitario * l.cantidad)}</p>
          </li>
        ))}
      </ul>
      <dl className="grid gap-2 text-sm">
        {datos
          .filter((d): d is [string, string] => d !== null)
          .map(([k, v]) => (
            <div key={k} className="flex gap-4 border-b border-carbon/10 pb-2">
              <dt className="w-24 shrink-0 text-carbon-muted">{k}</dt>
              <dd className="min-w-0 flex-1 break-words font-semibold text-carbon">{v}</dd>
            </div>
          ))}
      </dl>
    </section>
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
  icon: IconName;
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
