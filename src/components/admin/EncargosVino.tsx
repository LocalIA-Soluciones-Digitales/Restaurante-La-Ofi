"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { botonPrimario, botonSecundario, card } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { encargosVino, estadoEncargoVino } from "@/lib/admin/actions";
import type { EncargoVinoAdmin } from "@/lib/admin/types";
import { SITE_URL } from "@/lib/env";
import { formatCentimos } from "@/lib/format";
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

/** Lo que se le dice al cliente: «está listo» (con el total a pagar) o «no podemos servirlo». */
function mensaje(tipo: "listo" | "anulado", e: EncargoVinoAdmin): string {
  if (tipo === "listo") {
    return [
      `¡Hola, ${pila(e.nombre)}!`,
      `Tu encargo de vino nº ${e.numero} (${botellas(e.botellas)}) ya está preparado en La Ofi. Pásate a recogerlo cuando quieras: son ${formatCentimos(e.total_centimos)} y se paga al recoger.`,
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
  const [historial, setHistorial] = useState<EncargoVinoAdmin[] | null>(null);
  const [vista, setVista] = useState<Vista>("todos");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sonido, setSonido] = useState(false);
  const [avisar, setAvisar] = useState<{ tipo: "listo" | "anulado"; e: EncargoVinoAdmin } | null>(null);
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

  useEffect(() => {
    if (vista !== "historial") return;
    void encargosVino<EncargoVinoAdmin>(true).then((r) => {
      if (!r.ok) return setError(r.error);
      setHistorial(r.data.filter((e) => e.estado === "ENTREGADO" || e.estado === "CANCELADO").reverse());
    });
  }, [vista]);

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
    const r = await estadoEncargoVino<EncargoVinoAdmin>(e.id, estado);
    setOcupado(null);
    if (!r.ok) return setError(r.error);
    if (estado === "LISTO") setAvisar({ tipo: "listo", e: r.data });
    else if (estado === "CANCELADO") setAvisar({ tipo: "anulado", e: r.data });
    void recargar();
  };

  const visibles = vista === "todos" ? encargos : vista === "historial" ? (historial ?? []) : encargos.filter((e) => pasoDe(e) === vista);
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
          Entregados
        </button>
        <button type="button" onClick={() => setSonido(activarSonido())} aria-pressed={sonido} className={`${sonido ? botonSecundario : botonPrimario} ml-auto`}>
          <Icon name="sound" className="h-4 w-4" />
          {sonido ? "Sonido activo" : "Activar sonido"}
        </button>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-terracota px-4 py-3 text-sm font-semibold text-crema">{error}</p> : null}

      {vista === "pedir" ? (
        <ParaPedir lineas={pedir} />
      ) : visibles.length === 0 ? (
        <p className={`${card} grid place-items-center gap-2 px-4 py-12 text-center text-carbon-muted dark:text-crema/60`}>
          <Icon name="wine" className="h-8 w-8 opacity-50" />
          {vista === "historial" ? (historial ? "Aún no hay encargos entregados." : "Cargando…") : encargos.length ? "Ningún encargo en este paso." : "No hay encargos de vino ahora mismo."}
        </p>
      ) : (
        <ul className={`${card} divide-y divide-carbon/[0.07] overflow-hidden dark:divide-crema/10`}>
          {visibles.map((e) => (
            <li key={e.id}>
              <FilaEncargo e={e} abierto={abierto === e.id} onAbrir={() => setAbierto(abierto === e.id ? null : e.id)} ocupado={ocupado === e.id} onCambiar={(s) => void cambiar(e, s)} />
            </li>
          ))}
        </ul>
      )}

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
}: {
  e: EncargoVinoAdmin;
  abierto: boolean;
  onAbrir: () => void;
  ocupado: boolean;
  onCambiar: (estado: EncargoVinoAdmin["estado"]) => void;
}) {
  const paso = pasoDe(e);
  const s = paso ? PASOS[paso] : null;
  const boton = "min-h-9 shrink-0 rounded-lg px-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-50";
  const lleno = `${boton} bg-marino text-crema dark:bg-neon dark:text-noche`;
  const resumen = e.lineas.map((l) => (l.cantidad > 1 ? `${l.cantidad}× ${l.nombre}` : l.nombre)).join(", ");

  return (
    <div className="relative">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${s?.banda ?? "bg-carbon/20"}`} />
      <div className="flex items-center gap-2.5 py-2.5 pl-3.5 pr-2.5">
        <button type="button" onClick={onAbrir} aria-expanded={abierto} className="min-w-0 flex-1 text-left">
          <span className="flex items-baseline gap-2">
            <span className="truncate font-semibold">{e.nombre}</span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-carbon-muted dark:text-crema/65">
              {botellas(e.botellas)} · {formatCentimos(e.total_centimos)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-xs text-carbon-muted dark:text-crema/60">
            <span className={`shrink-0 font-semibold ${s?.texto ?? ""}`}>{s?.corto ?? (e.estado === "ENTREGADO" ? "Entregado" : "Anulado")}</span>
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
          <button type="button" disabled={ocupado} onClick={() => onCambiar("ENTREGADO")} className={lleno}>
            Entregado
          </button>
        ) : null}
      </div>

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
            {paso === "listos" || paso === "confirmados" ? (
              <button type="button" disabled={ocupado} onClick={() => onCambiar(paso === "listos" ? "CONFIRMADO" : "PENDIENTE")} className={`${botonSecundario} min-h-9 px-3`}>
                Volver atrás
              </button>
            ) : null}
            {paso ? (
              <button type="button" disabled={ocupado} onClick={() => onCambiar("CANCELADO")} className="ml-auto min-h-9 rounded-lg px-3 text-sm font-semibold text-terracota ring-1 ring-carbon/10 dark:ring-crema/15">
                Anular encargo
              </button>
            ) : null}
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

/** Tras marcarlo listo (o anularlo): el cliente aún no lo sabe. WhatsApp o SMS con el texto escrito. */
function AvisarEncargo({ tipo, e, onCerrar }: { tipo: "listo" | "anulado"; e: EncargoVinoAdmin; onCerrar: () => void }) {
  const texto = mensaje(tipo, e);
  const listo = tipo === "listo";
  return (
    <div role="status" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-carbon/10 motion-safe:animate-[intro-up_220ms_cubic-bezier(0.2,0.8,0.2,1)] dark:bg-noche-2 dark:ring-crema/15 sm:bottom-6">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-crema ${listo ? "bg-ok" : "bg-terracota"}`}>
          <Icon name={listo ? "check" : "close"} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {e.nombre}: {listo ? "encargo listo" : "encargo anulado"}
          </p>
          <p className="text-sm text-carbon-muted dark:text-crema/65">Aún no lo sabe: avísale con un toque (el mensaje va ya escrito).</p>
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
