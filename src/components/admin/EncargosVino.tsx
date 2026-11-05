"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HistorialDias, diaMadrid } from "@/components/admin/HistorialDias";
import { Modal } from "@/components/admin/Modal";
import { Campo, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { borrarEncargoVino, cobrarEncargoVino, editarEncargoVino, encargosVino, estadoEncargoVino, historialEncargosVino } from "@/lib/admin/actions";
import type { EncargoVinoAdmin } from "@/lib/admin/types";
import { SITE_URL } from "@/lib/env";
import { recogeHoy, recogidaCorta, recogidaEnFrase } from "@/lib/encargos/recogida";
import { formatCentimos } from "@/lib/format";
import { conCavaDeRegalo } from "@/lib/lanzamiento";
import { activarSonido, sonarAviso } from "@/lib/notify-sound";
import { enlaceSms, enlaceWhatsApp } from "@/lib/reservas/mensajes";
import { SITE } from "@/lib/site";

const FECHA = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** Tres pasos con su color, como en «Pedidos»: de lejos se ve en qué está cada encargo. */
const PASOS = {
  nuevos: { titulo: "Nuevos", corto: "Nuevo", banda: "bg-terracota", texto: "text-terracota", contador: "bg-terracota text-crema" },
  confirmados: { titulo: "Preparando", corto: "Preparando", banda: "bg-ratan", texto: "text-madera-oscura dark:text-ratan", contador: "bg-ratan text-noche" },
  listos: { titulo: "Listos", corto: "Listo para recoger", banda: "bg-oliva", texto: "text-oliva dark:text-oliva-soft", contador: "bg-oliva text-crema" },
} as const;

type Paso = keyof typeof PASOS;
type Vista = Paso | "todos" | "pedir" | "historial";

function pasoDe(e: EncargoVinoAdmin): Paso | null {
  if (e.estado === "PENDIENTE") return "nuevos";
  if (e.estado === "CONFIRMADO") return "confirmados";
  if (e.estado === "LISTO") return "listos";
  return null;
}

const pila = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? "";
const enlaceEncargo = (id: string) => `${SITE_URL}/es/encargo/${id}`;
const botellas = (n: number) => `${n} ${n === 1 ? "botella" : "botellas"}`;

type Aviso = "confirmado" | "listo" | "anulado";

/** Lo que se le dice al cliente: «confirmado», «está listo» (con el total a pagar) o «no podemos servirlo». */
function mensaje(tipo: Aviso, e: EncargoVinoAdmin): string {
  if (tipo === "confirmado") {
    return [
      `¡Hola, ${pila(e.nombre)}!`,
      `Te confirmamos tu encargo de vino nº ${e.numero} (${botellas(e.botellas)}) en La Ofi. ${e.recogida_en ? `Te lo dejamos preparado para ${recogidaEnFrase(e.recogida_en)}` : "Te avisamos cuando esté preparado"}: son ${formatCentimos(e.total_centimos)} y se paga al recoger.${conCavaDeRegalo(e.total_centimos) ? " ¡Y te llevas tu cava de regalo!" : ""}`,
      `Lo puedes ver aquí: ${enlaceEncargo(e.id)}`,
    ].join("\n\n");
  }
  if (tipo === "listo") {
    return [
      `¡Hola, ${pila(e.nombre)}!`,
      `Tu encargo de vino nº ${e.numero} (${botellas(e.botellas)}) ya está preparado en La Ofi. ${e.recogida_en ? `Te esperamos ${recogidaEnFrase(e.recogida_en)}` : "Pásate a recogerlo cuando quieras"}: son ${formatCentimos(e.total_centimos)} y se paga al recoger.${conCavaDeRegalo(e.total_centimos) ? " ¡Y te llevas tu cava de regalo!" : ""}`,
      `Lo puedes ver aquí: ${enlaceEncargo(e.id)}`,
    ].join("\n\n");
  }
  return [
    `¡Hola, ${pila(e.nombre)}!`,
    `Sentimos decirte que no podemos preparar tu encargo de vino nº ${e.numero}. Llámanos al ${SITE.phone.display} y te buscamos una alternativa.`,
  ].join("\n\n");
}

/** Lo que hay que tener (o pedir al proveedor): botellas de cada vino en los encargos sin preparar. */
function paraPedir(lista: EncargoVinoAdmin[]) {
  const m = new Map<string, { nombre: string; detalle: string | null; cantidad: number; encargos: number }>();
  for (const e of lista.filter((x) => x.estado === "PENDIENTE" || x.estado === "CONFIRMADO")) {
    for (const l of e.lineas) {
      const v = m.get(l.producto_id) ?? { nombre: l.nombre, detalle: l.detalle, cantidad: 0, encargos: 0 };
      v.cantidad += l.cantidad;
      v.encargos += 1;
      m.set(l.producto_id, v);
    }
  }
  return [...m.values()].sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
}

/**
 * «Encargos de vino»: lo que se encarga desde /vinos para llevar. Un botón por paso:
 * Confirmar → Está listo (y avisar por WhatsApp) → Entregado (se cobra en el TPV o en
 * caja, como cualquier venta). «Para pedir» suma las botellas de cada vino que faltan
 * por preparar. Se actualiza cada 20 s y suena al entrar uno.
 */
export function EncargosVino({ inicial }: { inicial: EncargoVinoAdmin[] }) {
  const [encargos, setEncargos] = useState(inicial);
  const [version, setVersion] = useState(0);
  const [editando, setEditando] = useState<EncargoVinoAdmin | null>(null);
  const [vista, setVista] = useState<Vista>("todos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sonido, setSonido] = useState(false);
  const [avisar, setAvisar] = useState<{ tipo: Aviso; e: EncargoVinoAdmin } | null>(null);
  const conocidos = useRef(new Set(inicial.map((e) => e.id)));

  const recargar = useCallback(async () => {
    const r = await encargosVino<EncargoVinoAdmin>();
    if (!r.ok) return setError(r.error);
    if (r.data.some((e) => !conocidos.current.has(e.id))) sonarAviso("nuevo");
    for (const e of r.data) conocidos.current.add(e.id);
    setError(null);
    setEncargos(r.data);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => void recargar(), 20_000);
    return () => window.clearInterval(t);
  }, [recargar]);

  const cuenta = useMemo(() => {
    const c: Record<Paso, number> = { nuevos: 0, confirmados: 0, listos: 0 };
    for (const e of encargos) {
      const p = pasoDe(e);
      if (p) c[p]++;
    }
    return c;
  }, [encargos]);
  const pedir = useMemo(() => paraPedir(encargos), [encargos]);

  const cambiar = async (e: EncargoVinoAdmin, estado: EncargoVinoAdmin["estado"]) => {
    if (estado === "CANCELADO" && !window.confirm(`¿Anular el encargo nº ${e.numero} de ${e.nombre}?`)) return;
    setOcupado(e.id);
    setError(null);
    const r = await estadoEncargoVino<EncargoVinoAdmin>(e.id, estado, e.estado);
    setOcupado(null);
    if (!r.ok) return setError(r.error);
    // Al avanzar (no al volver atrás) el cliente aún no lo sabe: email si lo dejó y WhatsApp a mano.
    if (estado === "CONFIRMADO" && e.estado === "PENDIENTE") setAvisar({ tipo: "confirmado", e: r.data });
    else if (estado === "LISTO" && e.estado !== "LISTO") setAvisar({ tipo: "listo", e: r.data });
    else if (estado === "CANCELADO") setAvisar({ tipo: "anulado", e: r.data });
    void recargar();
  };

  const cobrarYEntregar = async (e: EncargoVinoAdmin, metodo: "EFECTIVO" | "TARJETA") => {
    setOcupado(e.id);
    setError(null);
    const r = await cobrarEncargoVino<EncargoVinoAdmin>(e.id, metodo);
    setOcupado(null);
    if (r.ok) setAbierto(null);
    await recargar();
    if (!r.ok) setError(r.error);
  };

  const borrar = async (e: EncargoVinoAdmin) => {
    if (!window.confirm(`¿Eliminar para siempre el encargo nº ${e.numero} de ${e.nombre}? No se puede deshacer.`)) return;
    setOcupado(e.id);
    setError(null);
    const r = await borrarEncargoVino(e.id);
    setOcupado(null);
    if (!r.ok) return setError(r.error);
    setAbierto(null);
    setVersion((v) => v + 1);
    void recargar();
  };

  const fila = (e: EncargoVinoAdmin) => (
    <FilaEncargo
      e={e}
      abierto={abierto === e.id}
      onAbrir={() => setAbierto(abierto === e.id ? null : e.id)}
      ocupado={ocupado === e.id}
      onCambiar={(s) => void cambiar(e, s)}
      onCobrar={(m) => void cobrarYEntregar(e, m)}
      onEditar={() => setEditando(e)}
      onBorrar={() => void borrar(e)}
    />
  );

  // Por hora de recogida: arriba lo que pasan a buscar antes (los de antes, sin hora, al final).
  const visibles = (vista === "todos" ? encargos : encargos.filter((e) => pasoDe(e) === vista))
    .slice()
    .sort((a, b) => (a.recogida_en ?? "9999").localeCompare(b.recogida_en ?? "9999") || a.created_at.localeCompare(b.created_at));
  const pestanas: { k: Vista; titulo: string; n?: number; contador?: string }[] = [
    { k: "todos", titulo: "En curso", n: encargos.length, contador: "bg-carbon text-crema dark:bg-crema dark:text-noche" },
    ...(Object.keys(PASOS) as Paso[]).map((k) => ({ k, titulo: PASOS[k].titulo, n: cuenta[k], contador: PASOS[k].contador })),
    { k: "pedir", titulo: "Para pedir" },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Encargos" className="grid w-full grid-cols-5 gap-1 rounded-2xl bg-arena p-1 sm:flex sm:w-auto dark:bg-noche-2">
          {pestanas.map((p) => (
            <button
              key={p.k}
              type="button"
              role="tab"
              aria-selected={vista === p.k}
              onClick={() => setVista(p.k)}
              className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.7rem] font-semibold aria-selected:bg-white aria-selected:shadow-card sm:min-h-10 sm:flex-row sm:gap-2 sm:px-3 sm:text-sm dark:aria-selected:bg-noche-3"
            >
              {p.titulo}
              {p.n !== undefined ? (
                <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold tabular-nums ${p.n ? p.contador : "bg-carbon/10 text-carbon-muted dark:bg-crema/10 dark:text-crema/50"}`}>
                  {p.n}
                </span>
              ) : (
                <Icon name="receipt" className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setVista("historial")} aria-pressed={vista === "historial"} className={botonSecundario}>
          <Icon name="clock" className="h-4 w-4" />
          Historial
        </button>
        <button type="button" onClick={() => setSonido(activarSonido())} aria-pressed={sonido} className={`${sonido ? botonSecundario : botonPrimario} ml-auto`}>
          <Icon name="sound" className="h-4 w-4" />
          {sonido ? "Sonido activo" : "Activar sonido"}
        </button>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}

      {vista === "pedir" ? (
        <ParaPedir lineas={pedir} />
      ) : vista === "historial" ? (
        <HistorialDias
          cargar={historialEncargosVino<EncargoVinoAdmin>}
          dia={(e) => diaMadrid(e.updated_at)}
          csv={(e) => ({
            Día: diaMadrid(e.updated_at),
            Número: e.numero,
            Cliente: e.nombre,
            Teléfono: e.telefono,
            Email: e.email ?? "",
            Recogida: e.recogida_en ? recogidaCorta(e.recogida_en) : "",
            Estado: e.estado === "CANCELADO" ? "Anulado" : "Entregado",
            Cobro: e.cobrado_metodo === "EFECTIVO" ? "Efectivo" : e.cobrado_metodo === "TARJETA" ? "Tarjeta" : "",
            Vinos: e.lineas.map((l) => `${l.cantidad}× ${l.nombre}`).join(", "),
            Botellas: e.botellas,
            Total: (e.total_centimos / 100).toFixed(2).replace(".", ","),
          })}
          importe={(e) => e.total_centimos}
          anulado={(e) => e.estado === "CANCELADO"}
          clave={(e) => e.id}
          fila={fila}
          version={version}
          icono="wine"
          nombres={["encargo", "encargos"]}
          etiquetaHecho="Entregados"
        />
      ) : visibles.length === 0 ? (
        <p className={`${card} grid place-items-center gap-2 px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>
          <Icon name="wine" className="h-8 w-8 opacity-50" />
          {encargos.length ? "Ningún encargo en este paso." : "No hay encargos de vino ahora mismo."}
        </p>
      ) : (
        <ul className={`${card} divide-y divide-carbon/[0.07] overflow-hidden dark:divide-crema/10`}>
          {visibles.map((e) => (
            <li key={e.id}>{fila(e)}</li>
          ))}
        </ul>
      )}

      {editando ? (
        <EditarEncargo
          e={editando}
          onClose={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null);
            setVersion((v) => v + 1);
            void recargar();
          }}
        />
      ) : null}
      {avisar ? <AvisarEncargo tipo={avisar.tipo} e={avisar.e} onCerrar={() => setAvisar(null)} /> : null}
    </div>
  );
}

function FilaEncargo({
  e,
  abierto,
  onAbrir,
  ocupado,
  onCambiar,
  onCobrar,
  onEditar,
  onBorrar,
}: {
  e: EncargoVinoAdmin;
  abierto: boolean;
  onAbrir: () => void;
  ocupado: boolean;
  onCambiar: (estado: EncargoVinoAdmin["estado"]) => void;
  onCobrar: (metodo: "EFECTIVO" | "TARJETA") => void;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const paso = pasoDe(e);
  const s = paso ? PASOS[paso] : null;
  const boton = "min-h-9 shrink-0 rounded-lg px-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50";
  const lleno = `${boton} bg-marino text-crema dark:bg-neon dark:text-noche`;
  const resumen = e.lineas.map((l) => (l.cantidad > 1 ? `${l.cantidad}× ${l.nombre}` : l.nombre)).join(", ");
  const [cobrando, setCobrando] = useState(false);
  const cava = conCavaDeRegalo(e.total_centimos) && e.estado !== "CANCELADO";

  return (
    <div className="relative">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${s?.banda ?? "bg-carbon/20"}`} />
      <div className="flex items-center gap-2.5 py-2.5 pl-3.5 pr-2.5">
        <button type="button" onClick={onAbrir} aria-expanded={abierto} className="min-w-0 flex-1 text-left">
          {/* Arriba quién y cuánto (el nombre siempre a la vista); debajo cuándo pasa y si lleva cava. */}
          <span className="flex items-baseline gap-2">
            <span className="min-w-0 truncate font-semibold">{e.nombre}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-carbon-muted dark:text-crema/65">
              {botellas(e.botellas)} · {formatCentimos(e.total_centimos)}
            </span>
          </span>
          {e.recogida_en || cava ? (
            <span className="mt-1 flex flex-wrap items-center gap-1.5">
              {e.recogida_en ? (
                <span
                  title={`Pasa a recogerlo ${recogidaEnFrase(e.recogida_en)}`}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold tabular-nums ${
                    recogeHoy(e.recogida_en) && paso ? "bg-terracota text-crema" : "bg-carbon/10 text-carbon dark:bg-crema/10 dark:text-crema"
                  }`}
                >
                  <Icon name="clock" className="h-3 w-3" />
                  {recogidaCorta(e.recogida_en)}
                </span>
              ) : null}
              {cava ? (
                <span title="Lleva un cava de regalo (encargo de más de 50 €)" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E2B98A] px-2 py-0.5 text-[0.7rem] font-semibold text-carbon">
                  <Icon name="gift" className="h-3 w-3" />
                  Cava de regalo
                </span>
              ) : null}
            </span>
          ) : null}
          <span className="flex items-center gap-1.5 text-xs text-carbon-muted dark:text-crema/60">
            <span className={`shrink-0 font-semibold ${s?.texto ?? ""}`}>
              {s?.corto ?? (e.estado === "ENTREGADO" ? `Entregado${e.cobrado_metodo ? ` · ${e.cobrado_metodo === "EFECTIVO" ? "efectivo" : "tarjeta"}` : ""}` : "Anulado")}
            </span>
            <span className="truncate">· nº {e.numero} · {resumen}</span>
            {e.notas ? <Icon name="edit" className="h-3 w-3 shrink-0" /> : null}
          </span>
        </button>
        {paso === "nuevos" ? (
          <button type="button" disabled={ocupado} onClick={() => onCambiar("CONFIRMADO")} className={lleno}>
            Confirmar
          </button>
        ) : paso === "confirmados" ? (
          <button type="button" disabled={ocupado} onClick={() => onCambiar("LISTO")} className={`${boton} ring-1 ring-carbon/15 dark:ring-crema/20`}>
            Está listo
          </button>
        ) : paso === "listos" ? (
          <button type="button" disabled={ocupado} onClick={() => setCobrando(!cobrando)} aria-expanded={cobrando} className={lleno}>
            Cobrar
          </button>
        ) : null}
      </div>

      {cobrando && paso === "listos" ? (
        <div className="grid grid-cols-2 gap-2 px-3.5 pb-3 sm:flex sm:items-center">
          <span className="col-span-2 text-sm font-semibold sm:mr-auto">Cobrar {formatCentimos(e.total_centimos)} y entregar:</span>
          <button type="button" disabled={ocupado} onClick={() => onCobrar("EFECTIVO")} className={lleno}>
            Efectivo
          </button>
          <button type="button" disabled={ocupado} onClick={() => onCobrar("TARJETA")} className={lleno}>
            Tarjeta
          </button>
        </div>
      ) : null}

      {abierto ? (
        <div className="grid gap-2 border-t border-carbon/[0.07] bg-arena/40 px-3.5 py-3 text-sm dark:border-crema/10 dark:bg-noche-3/50">
          <ul className="grid gap-1">
            {e.lineas.map((l) => (
              <li key={l.producto_id} className="flex items-baseline gap-2">
                <span className="font-semibold tabular-nums">{l.cantidad}×</span>
                <span className="min-w-0 flex-1">
                  {l.nombre}
                  {l.detalle ? <span className="block text-xs text-carbon-muted dark:text-crema/60">{l.detalle}</span> : null}
                </span>
                <span className="tabular-nums text-carbon-muted dark:text-crema/60">{formatCentimos(l.cantidad * l.precio_centimos)}</span>
              </li>
            ))}
          </ul>
          {e.notas ? <p className="rounded-lg bg-ratan/20 px-2.5 py-1.5 font-semibold">{e.notas}</p> : null}
          <p className="flex items-center gap-2 font-semibold">
            <Icon name="clock" className="h-4 w-4 shrink-0" />
            {e.recogida_en ? `Pasa a recogerlo ${recogidaEnFrase(e.recogida_en)}` : "Sin día de recogida (encargo de antes)"}
          </p>
          <p className="text-xs text-carbon-muted dark:text-crema/60">
            Encargado el {FECHA.format(new Date(e.created_at))} · {e.telefono}
            {e.email ? ` · ${e.email}` : ""} · se paga al recoger
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a href={`tel:${e.telefono.replace(/\s/g, "")}`} className={`${botonSecundario} min-h-9 px-3`}>
              <Icon name="phone" className="h-4 w-4" />
              Llamar
            </a>
            {paso === "listos" ? (
              <a href={enlaceWhatsApp(e.telefono, mensaje("listo", e))} target="_blank" rel="noopener noreferrer" className={`${botonSecundario} min-h-9 px-3`}>
                <Icon name="whatsapp" className="h-4 w-4" />
                Avisar de nuevo
              </a>
            ) : null}
            {paso === "listos" ? (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => {
                  if (window.confirm("¿Entregarlo sin cobrar aquí? Úsalo solo si ya lo has cobrado en el TPV.")) onCambiar("ENTREGADO");
                }}
                className={`${botonSecundario} min-h-9 px-3`}
              >
                Entregar (cobrado en el TPV)
              </button>
            ) : null}
            {paso === "listos" || paso === "confirmados" ? (
              <button type="button" disabled={ocupado} onClick={() => onCambiar(paso === "listos" ? "CONFIRMADO" : "PENDIENTE")} className={`${botonSecundario} min-h-9 px-3`}>
                Volver atrás
              </button>
            ) : null}
            <button type="button" disabled={ocupado} onClick={onEditar} className={`${botonSecundario} ml-auto min-h-9 px-3`}>
              <Icon name="edit" className="h-4 w-4" />
              Editar
            </button>
            {paso ? (
              <button type="button" disabled={ocupado} onClick={() => onCambiar("CANCELADO")} className="min-h-9 rounded-lg px-3 text-sm font-semibold text-terracota ring-1 ring-carbon/10 dark:ring-crema/15">
                Anular encargo
              </button>
            ) : null}
            <button type="button" disabled={ocupado} onClick={onBorrar} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-terracota ring-1 ring-carbon/10 dark:ring-crema/15">
              <Icon name="trash" className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ParaPedir({ lineas }: { lineas: ReturnType<typeof paraPedir> }) {
  const total = lineas.reduce((a, l) => a + l.cantidad, 0);
  if (lineas.length === 0) {
    return (
      <p className={`${card} grid place-items-center gap-2 px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>
        <Icon name="receipt" className="h-8 w-8 opacity-50" />
        No hay encargos por preparar.
      </p>
    );
  }
  return (
    <div className={`${card} overflow-hidden`}>
      <p className="border-b border-carbon/[0.07] px-4 py-3 text-sm text-carbon-muted dark:border-crema/10 dark:text-crema/60">
        Las botellas de los encargos nuevos y en preparación ({botellas(total)}). Para saber qué sacar de la bodega o pedir al proveedor.
      </p>
      <ul className="divide-y divide-carbon/[0.07] dark:divide-crema/10">
        {lineas.map((l) => (
          <li key={l.nombre + l.detalle} className="flex items-baseline gap-3 px-4 py-2.5">
            <span className="w-10 shrink-0 font-display text-xl tabular-nums">{l.cantidad}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{l.nombre}</span>
              {l.detalle ? <span className="block text-xs text-carbon-muted dark:text-crema/60">{l.detalle}</span> : null}
            </span>
            <span className="shrink-0 text-xs text-carbon-muted dark:text-crema/60">
              {l.encargos} {l.encargos === 1 ? "encargo" : "encargos"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tras confirmarlo, marcarlo listo o anularlo: email si lo dejó y, si no, WhatsApp o SMS con el texto escrito. */
function AvisarEncargo({ tipo, e, onCerrar }: { tipo: Aviso; e: EncargoVinoAdmin; onCerrar: () => void }) {
  const texto = mensaje(tipo, e);
  const listo = tipo !== "anulado";
  return (
    <div role="status" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-carbon/10 motion-safe:animate-[intro-up_220ms_cubic-bezier(0.2,0.8,0.2,1)] dark:bg-noche-2 dark:ring-crema/15 sm:bottom-6">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-crema ${listo ? "bg-ok" : "bg-terracota"}`}>
          <Icon name={listo ? "check" : "close"} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {e.nombre}: {tipo === "confirmado" ? "encargo confirmado" : tipo === "listo" ? "encargo listo" : "encargo anulado"}
          </p>
          <p className="text-sm text-carbon-muted dark:text-crema/65">
            {e.email ? (
              <>
                Le llega un email a <span className="break-all">{e.email}</span>. Si no suele mirarlo, mándale también un WhatsApp.
              </>
            ) : (
              "No dejó email, así que aún no lo sabe: avísale con un toque (el mensaje va ya escrito)."
            )}
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="-m-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-arena dark:hover:bg-noche-3" aria-label="Cerrar">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <a
          href={enlaceWhatsApp(e.telefono, texto)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => window.setTimeout(onCerrar, 300)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1F7A4D] px-4 text-sm font-semibold text-white hover:brightness-110"
        >
          <Icon name="whatsapp" className="h-4 w-4" />
          Avisar por WhatsApp
        </a>
        <a href={enlaceSms(e.telefono, texto)} onClick={() => window.setTimeout(onCerrar, 300)} className={botonSecundario}>
          SMS
        </a>
      </div>
    </div>
  );
}

const ESTADOS: { v: EncargoVinoAdmin["estado"]; t: string }[] = [
  { v: "PENDIENTE", t: "Nuevo" },
  { v: "CONFIRMADO", t: "Preparando" },
  { v: "LISTO", t: "Listo para recoger" },
  { v: "ENTREGADO", t: "Entregado" },
  { v: "CANCELADO", t: "Anulado" },
];

/** Corregir un encargo: datos del cliente, notas, el paso y las botellas de cada vino (0 = quitarlo). */
function EditarEncargo({ e, onClose, onGuardado }: { e: EncargoVinoAdmin; onClose: () => void; onGuardado: () => void }) {
  const [nombre, setNombre] = useState(e.nombre);
  const [telefono, setTelefono] = useState(e.telefono);
  const [email, setEmail] = useState(e.email ?? "");
  const [notas, setNotas] = useState(e.notas ?? "");
  const [estado, setEstado] = useState(e.estado);
  const [cantidades, setCantidades] = useState<Record<string, number>>(() => Object.fromEntries(e.lineas.map((l) => [l.producto_id, l.cantidad])));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const total = e.lineas.reduce((a, l) => a + (cantidades[l.producto_id] ?? 0) * l.precio_centimos, 0);
  const poner = (id: string, n: number) => setCantidades((c) => ({ ...c, [id]: Math.max(0, Math.min(240, n)) }));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    const r = await editarEncargoVino<EncargoVinoAdmin>(e.id, {
      nombre,
      telefono,
      email,
      notas,
      estado,
      lineas: Object.entries(cantidades).map(([producto_id, cantidad]) => ({ producto_id, cantidad })),
    });
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    onGuardado();
  };

  return (
    <Modal titulo={`Encargo nº ${e.numero}`} onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          void guardar();
        }}
      >
        <Campo label="Nombre">
          <input className={input} value={nombre} onChange={(ev) => setNombre(ev.target.value)} maxLength={60} required />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Teléfono">
            <input className={input} type="tel" value={telefono} onChange={(ev) => setTelefono(ev.target.value)} required />
          </Campo>
          <Campo label="Email">
            <input className={input} type="email" value={email} onChange={(ev) => setEmail(ev.target.value)} />
          </Campo>
        </div>
        <Campo label="Paso">
          <select className={input} value={estado} onChange={(ev) => setEstado(ev.target.value as EncargoVinoAdmin["estado"])}>
            {ESTADOS.map((x) => (
              <option key={x.v} value={x.v}>
                {x.t}
              </option>
            ))}
          </select>
        </Campo>
        <div className="grid gap-2 text-sm">
          <span className="font-semibold">Vinos</span>
          <ul className="grid gap-2">
            {e.lineas.map((l) => {
              const n = cantidades[l.producto_id] ?? 0;
              return (
                <li key={l.producto_id} className={`flex items-center gap-3 rounded-xl bg-arena/60 px-3 py-2 dark:bg-noche-3/60 ${n === 0 ? "opacity-50" : ""}`}>
                  <span className="min-w-0 flex-1">
                    <span className={`font-semibold ${n === 0 ? "line-through" : ""}`}>{l.nombre}</span>
                    <span className="block text-xs text-carbon-muted dark:text-crema/60">{formatCentimos(l.precio_centimos)} / botella</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={() => poner(l.producto_id, n - 1)} className="grid h-9 w-9 place-items-center rounded-lg ring-1 ring-carbon/15 dark:ring-crema/20" aria-label={`Una botella menos de ${l.nombre}`}>
                      <Icon name="minus" className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold tabular-nums">{n}</span>
                    <button type="button" onClick={() => poner(l.producto_id, n + 1)} className="grid h-9 w-9 place-items-center rounded-lg ring-1 ring-carbon/15 dark:ring-crema/20" aria-label={`Una botella más de ${l.nombre}`}>
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-right font-semibold tabular-nums">Total {formatCentimos(total)}</p>
        </div>
        <Campo label="Notas">
          <textarea className={`${input} h-auto min-h-20 py-2`} value={notas} onChange={(ev) => setNotas(ev.target.value)} maxLength={300} />
        </Campo>
        {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={botonSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={guardando} className={botonPrimario}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
