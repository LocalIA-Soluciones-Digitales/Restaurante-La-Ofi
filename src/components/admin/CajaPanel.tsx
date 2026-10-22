"use client";

import { useEffect, useMemo, useState } from "react";
import { BarrasDivergentes, BarrasPrevision, Cuotas, Progreso } from "@/components/admin/graficos";
import { Aviso, aCentimos, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cerrarCaja, cierresCaja, estadoCaja, rpcAdmin } from "@/lib/admin/actions";
import { pct, prever, serieDiaria, sumarDias } from "@/lib/admin/analitica";
import { formatCentimos, hoyEnMadrid } from "@/lib/format";
import { imprimirHTML } from "@/lib/print/ticket";

export interface EstadoCaja {
  desde: string;
  efectivo_centimos: number;
  tarjeta_centimos: number;
  online_centimos: number;
  cobros: number;
  pedidos: number;
  ventas_centimos: number;
  descuentos_centimos: number;
  invitaciones_centimos: number;
  pendiente_cobro_centimos: number;
}

export interface Cierre {
  id: string;
  desde: string;
  cerrado_at: string;
  fondo_inicial_centimos: number;
  efectivo_esperado_centimos: number;
  efectivo_contado_centimos: number;
  tarjeta_centimos: number;
  online_centimos: number;
  descuadre_centimos: number;
  tickets: number;
  notas: string | null;
  cerrado_por_nombre: string | null;
}

const DENOMINACIONES = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
/** Un cierre "cuadra" si el descuadre no pasa de 1 €. */
const TOLERANCIA = 100;
const fecha = (iso: string) => new Date(iso).toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });
const corta = (iso: string) => new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" });
const horas = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, "0")} min` : `${Math.round(min)} min`);
/** Lo cobrado en el turno de un cierre (efectivo del turno, sin el fondo, + tarjeta + online). */
const cobradoCierre = (c: Cierre) => c.efectivo_esperado_centimos - c.fondo_inicial_centimos + c.tarjeta_centimos + c.online_centimos;

/**
 * Cierre de caja (arqueo): estado del turno en vivo (ritmo, previsión del día,
 * mezcla de cobros), pasos para cerrar, recuento por denominaciones, descuadre
 * con semáforo, historial con indicadores de fiabilidad (cierres que cuadran,
 * racha, descuadre acumulado) e impresión del arqueo en la térmica.
 */
export function CajaPanel({ inicial, historial: h0 }: { inicial: EstadoCaja; historial: Cierre[] }) {
  const [caja, setCaja] = useState(inicial);
  const [historial, setHistorial] = useState(h0);
  const [fondo, setFondo] = useState("");
  const [recuento, setRecuento] = useState<Record<number, string>>({});
  const [manual, setManual] = useState("");
  const [notas, setNotas] = useState("");
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [previstoHoy, setPrevistoHoy] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Previsión del día: mismo día de la semana de las últimas 8 semanas.
  useEffect(() => {
    const hoy = hoyEnMadrid();
    const desde = sumarDias(hoy, -56);
    void rpcAdmin<{ por_dia: { fecha: string; ventas_centimos: number; pedidos: number }[] }>("laofi_admin_ventas", { p_desde: desde, p_hasta: sumarDias(hoy, -1) }).then((r) => {
      if (!r.ok) return;
      const p = prever(serieDiaria(r.data.por_dia, desde, sumarDias(hoy, -1)), [hoy])[0];
      setPrevistoHoy(p?.esperado || null);
    });
  }, []);

  const porRecuento = DENOMINACIONES.reduce((a, d) => a + d * (Number(recuento[d]) || 0), 0);
  const billetes = DENOMINACIONES.filter((d) => d >= 500).reduce((a, d) => a + d * (Number(recuento[d]) || 0), 0);
  const contado = manual.trim() ? (aCentimos(manual) ?? 0) : porRecuento;
  const fondoC = aCentimos(fondo) ?? 0;
  const esperado = fondoC + caja.efectivo_centimos;
  const descuadre = contado - esperado;
  const hayRecuento = manual.trim() !== "" || porRecuento > 0;
  const cobrado = caja.efectivo_centimos + caja.tarjeta_centimos + caja.online_centimos;
  const minutos = Math.max(1, (ahora - new Date(caja.desde).getTime()) / 60_000);
  const porHora = cobrado || caja.ventas_centimos ? (caja.ventas_centimos / minutos) * 60 : 0;
  const ticket = caja.pedidos ? Math.round(caja.ventas_centimos / caja.pedidos) : 0;
  const estado = !hayRecuento ? "pendiente" : Math.abs(descuadre) <= TOLERANCIA ? (descuadre === 0 ? "exacto" : "tolerancia") : descuadre > 0 ? "sobra" : "falta";

  const imprimir = (c: Cierre) =>
    imprimirHTML(`<!doctype html><html><head><meta charset="utf-8"><style>
      @page { size: 80mm auto; margin: 0 } body { font-family: "Courier New", monospace; width: 80mm; padding: 8px 6px; font-size: 13px }
      h1 { font-size: 18px; text-align: center; margin: 0 0 4px } td { padding: 2px 0 } .r { text-align: right } table { width: 100% }
    </style></head><body>
      <h1>LA OFI · ARQUEO</h1><div>${fecha(c.desde)} → ${fecha(c.cerrado_at)}</div><hr/>
      <table>
        <tr><td>Fondo inicial</td><td class="r">${formatCentimos(c.fondo_inicial_centimos)}</td></tr>
        <tr><td>Efectivo esperado</td><td class="r">${formatCentimos(c.efectivo_esperado_centimos)}</td></tr>
        <tr><td>Efectivo contado</td><td class="r">${formatCentimos(c.efectivo_contado_centimos)}</td></tr>
        <tr><td><b>Descuadre</b></td><td class="r"><b>${formatCentimos(c.descuadre_centimos)}</b></td></tr>
        <tr><td>Tarjeta</td><td class="r">${formatCentimos(c.tarjeta_centimos)}</td></tr>
        <tr><td>Online</td><td class="r">${formatCentimos(c.online_centimos)}</td></tr>
        <tr><td><b>Total cobrado</b></td><td class="r"><b>${formatCentimos(cobradoCierre(c))}</b></td></tr>
        <tr><td>Cobros</td><td class="r">${c.tickets}</td></tr>
      </table><hr/>${c.notas ? `<div>Notas: ${c.notas.replace(/</g, "&lt;")}</div>` : ""}<div>Cerró: ${(c.cerrado_por_nombre ?? "-").replace(/</g, "&lt;")}</div>
    </body></html>`);

  const cerrar = async () => {
    const texto = descuadre === 0 ? "La caja cuadra al céntimo." : `Descuadre de ${descuadre > 0 ? "+" : ""}${formatCentimos(descuadre)}.`;
    if (!window.confirm(`¿Cerrar la caja? ${texto}${caja.pendiente_cobro_centimos > 0 ? `\nQuedan ${formatCentimos(caja.pendiente_cobro_centimos)} sin cobrar.` : ""}`)) return;
    const r = await cerrarCaja<Cierre>(fondoC, contado, notas);
    if (!r.ok) return setAviso({ tono: "error", texto: r.error });
    const [e, hh] = await Promise.all([estadoCaja<EstadoCaja>(), cierresCaja<Cierre>()]);
    if (e.ok) setCaja(e.data);
    if (hh.ok) setHistorial(hh.data);
    setRecuento({});
    setManual("");
    setNotas("");
    setFondo("");
    setAviso({ tono: "ok", texto: "Caja cerrada. Arqueo enviado a la impresora." });
    imprimir(hh.ok ? (hh.data[0] ?? r.data) : r.data);
  };

  const ultimo = historial[0];
  const ajustar = (d: number, n: number) => setRecuento((r) => ({ ...r, [d]: String(Math.max(0, (Number(r[d]) || 0) + n)) }));

  // Indicadores del historial (el más reciente primero).
  const h = useMemo(() => {
    const n = historial.length;
    const cuadran = historial.filter((c) => Math.abs(c.descuadre_centimos) <= TOLERANCIA).length;
    let racha = 0;
    for (const c of historial) {
      if (Math.abs(c.descuadre_centimos) > TOLERANCIA) break;
      racha++;
    }
    const neto = historial.reduce((a, c) => a + c.descuadre_centimos, 0);
    const absMedio = n ? historial.reduce((a, c) => a + Math.abs(c.descuadre_centimos), 0) / n : 0;
    const cobros = historial.map(cobradoCierre);
    const mediaCobro = n ? cobros.reduce((a, b) => a + b, 0) / n : 0;
    const totalCobros = cobros.reduce((a, b) => a + b, 0);
    const efectivo = historial.reduce((a, c) => a + c.efectivo_esperado_centimos - c.fondo_inicial_centimos, 0);
    const mejor = historial.reduce<Cierre | null>((m, c) => (!m || cobradoCierre(c) > cobradoCierre(m) ? c : m), null);
    return { n, cuadran, racha, neto, absMedio, mediaCobro, cuotaEfectivo: totalCobros ? efectivo / totalCobros : 0, mejor, cronologico: [...historial].reverse() };
  }, [historial]);

  const pasos: { hecho: boolean; texto: string; icon: IconName }[] = [
    { hecho: caja.pendiente_cobro_centimos === 0, texto: caja.pendiente_cobro_centimos === 0 ? "Todo cobrado" : `Cobrar ${formatCentimos(caja.pendiente_cobro_centimos)} pendientes`, icon: "cash" },
    { hecho: fondo.trim() !== "", texto: fondo.trim() ? `Fondo ${formatCentimos(fondoC)}` : "Indicar el fondo inicial", icon: "lock" },
    { hecho: hayRecuento, texto: hayRecuento ? `Contado ${formatCentimos(contado)}` : "Contar el efectivo", icon: "receipt" },
    { hecho: hayRecuento && Math.abs(descuadre) <= TOLERANCIA, texto: !hayRecuento ? "Revisar el descuadre" : Math.abs(descuadre) <= TOLERANCIA ? "Caja cuadrada" : "Revisar el descuadre", icon: "check" },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <div className="grid min-w-0 gap-4">
        {/* Turno en curso */}
        <section className="relative overflow-hidden rounded-[1.25rem] bg-marino p-6 text-crema shadow-card dark:bg-noche-3 sm:p-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-neon/20 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-crema/60">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 normal-case tracking-normal text-crema">
                <span className="h-2 w-2 animate-pulse rounded-full bg-neon" /> Turno abierto
              </span>
              desde {fecha(caja.desde)} · {horas(minutos)}
            </div>
            <div className="mt-4 grid gap-6 sm:grid-cols-[1.3fr_1fr]">
              <div>
                <p className="text-sm text-crema/70">Ventas del turno</p>
                <p className="font-display text-5xl tabular-nums tracking-tight sm:text-6xl">{formatCentimos(caja.ventas_centimos)}</p>
                {previstoHoy ? (
                  <div className="mt-3 max-w-sm">
                    <div className="flex justify-between text-sm text-crema/80">
                      <span>Previsión de hoy {formatCentimos(previstoHoy)}</span>
                      <b className="tabular-nums">{pct(caja.ventas_centimos / previstoHoy)}</b>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-neon transition-[width] duration-700" style={{ width: `${Math.min(100, (caja.ventas_centimos / previstoHoy) * 100)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-crema/60">
                      {caja.ventas_centimos >= previstoHoy ? "Ya has superado lo previsto para hoy." : `Faltan ${formatCentimos(previstoHoy - caja.ventas_centimos)} para el día previsto.`}
                    </p>
                  </div>
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Dato k="Pedidos" v={caja.pedidos.toLocaleString("es-ES")} />
                <Dato k="Ticket medio" v={formatCentimos(ticket)} />
                <Dato k="Ritmo" v={`${formatCentimos(Math.round(porHora))}/h`} />
                <Dato k="Cobros" v={caja.cobros.toLocaleString("es-ES")} />
              </dl>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className={`${card} p-5`}>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-xl">Cobrado</h2>
              <p className="font-display text-2xl tabular-nums">{formatCentimos(cobrado)}</p>
            </div>
            <div className="mt-3 grid gap-1">
              <div className="flex justify-between text-xs text-carbon-muted dark:text-crema/60">
                <span>{caja.ventas_centimos ? pct(Math.min(1, cobrado / caja.ventas_centimos)) : "0 %"} de lo vendido</span>
                <span>Pendiente {formatCentimos(caja.pendiente_cobro_centimos)}</span>
              </div>
              <Progreso valor={cobrado} objetivo={caja.ventas_centimos || 1} etiqueta="Cobrado frente a vendido" />
            </div>
            <div className="mt-5">
              <Cuotas
                formato={formatCentimos}
                filas={[
                  { etiqueta: "Efectivo", valor: caja.efectivo_centimos },
                  { etiqueta: "Tarjeta", valor: caja.tarjeta_centimos },
                  { etiqueta: "Online (Stripe)", valor: caja.online_centimos },
                ].filter((f) => f.valor > 0)}
              />
            </div>
            {caja.pendiente_cobro_centimos > 0 ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-terracota-soft px-3 py-2 text-sm font-semibold text-terracota dark:bg-terracota/25 dark:text-terracota-soft">
                <Icon name="info" className="h-4 w-4 shrink-0" />
                Hay {formatCentimos(caja.pendiente_cobro_centimos)} sin cobrar: revísalos antes de cerrar.
              </p>
            ) : null}
          </section>

          <section className={`${card} p-5`}>
            <h2 className="font-display text-xl">Resumen del turno</h2>
            <dl className="mt-3 grid gap-1 text-sm">
              {[
                ["Ventas (pedidos no cancelados)", caja.ventas_centimos],
                ["Cobrado en efectivo", caja.efectivo_centimos],
                ["Cobrado con tarjeta", caja.tarjeta_centimos],
                ["Cobrado online (Stripe)", caja.online_centimos],
                ["Pendiente de cobro", caja.pendiente_cobro_centimos],
                ["Descuentos", caja.descuentos_centimos],
                ["Invitaciones", caja.invitaciones_centimos],
              ].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-carbon/5 py-1.5 last:border-0 dark:border-crema/5">
                  <dt className="text-carbon-muted dark:text-crema/70">{k}</dt>
                  <dd className="font-semibold tabular-nums">{formatCentimos(val as number)}</dd>
                </div>
              ))}
            </dl>
            {caja.descuentos_centimos + caja.invitaciones_centimos > 0 && caja.ventas_centimos ? (
              <p className="mt-2 text-xs text-carbon-muted dark:text-crema/55">
                Descuentos e invitaciones suponen el {pct((caja.descuentos_centimos + caja.invitaciones_centimos) / caja.ventas_centimos, 1)} de las ventas.
              </p>
            ) : null}
          </section>
        </div>

        <section className={`${card} p-5`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl">Recuento de efectivo</h2>
            <p className="text-sm text-carbon-muted dark:text-crema/60">
              Billetes <b className="tabular-nums text-carbon dark:text-crema">{formatCentimos(billetes)}</b> · monedas <b className="tabular-nums text-carbon dark:text-crema">{formatCentimos(porRecuento - billetes)}</b>
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {DENOMINACIONES.map((d) => {
              const n = Number(recuento[d]) || 0;
              return (
                <div key={d} className={`rounded-2xl border p-2.5 transition-colors ${n ? "border-marino/30 bg-marino/[0.04] dark:border-neon/30 dark:bg-neon/[0.06]" : "border-carbon/10 dark:border-crema/10"}`}>
                  <label htmlFor={`den-${d}`} className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold">{d >= 500 ? `${d / 100} €` : formatCentimos(d)}</span>
                    <span className="text-carbon-muted dark:text-crema/55">{d >= 500 ? "billete" : "moneda"}</span>
                  </label>
                  <div className="mt-1.5 flex items-center gap-1">
                    <button type="button" onClick={() => ajustar(d, -1)} disabled={!n} aria-label={`Quitar uno de ${formatCentimos(d)}`} className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-carbon-muted hover:bg-arena disabled:opacity-30 dark:text-crema/70 dark:hover:bg-noche-3">
                      <Icon name="minus" className="h-4 w-4" />
                    </button>
                    <input id={`den-${d}`} value={recuento[d] ?? ""} onChange={(e) => setRecuento((r) => ({ ...r, [d]: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" placeholder="0" className={`${input} min-w-0 px-2 text-center tabular-nums`} />
                    <button type="button" onClick={() => ajustar(d, 1)} aria-label={`Añadir uno de ${formatCentimos(d)}`} className="grid h-11 w-9 shrink-0 place-items-center rounded-lg text-carbon-muted hover:bg-arena dark:text-crema/70 dark:hover:bg-noche-3">
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                  </div>
                  <p className={`mt-1 text-right text-xs tabular-nums ${n ? "font-semibold" : "text-carbon-muted/60 dark:text-crema/35"}`}>{formatCentimos(n * d)}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-carbon/10 pt-4 dark:border-crema/10">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">…o escribe el total contado</span>
              <input value={manual} onChange={(e) => setManual(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${input} max-w-40 text-right`} />
            </label>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-carbon-muted dark:text-crema/60">Total contado</p>
              <p className="font-display text-3xl tabular-nums">{formatCentimos(contado)}</p>
              {porRecuento > 0 ? (
                <button type="button" onClick={() => setRecuento({})} className="text-xs font-semibold text-carbon-muted underline underline-offset-2 dark:text-crema/60">
                  Vaciar recuento
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <aside className={`${card} h-fit p-5 xl:sticky xl:top-20`}>
        <h2 className="font-display text-xl">Cerrar el turno</h2>
        <ol className="mt-3 grid gap-2">
          {pasos.map((p, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${p.hecho ? "bg-oliva text-crema dark:bg-oliva-soft dark:text-noche" : "border border-carbon/20 text-carbon-muted dark:border-crema/25 dark:text-crema/60"}`}>
                {p.hecho ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className={p.hecho ? "" : "text-carbon-muted dark:text-crema/65"}>{p.texto}</span>
            </li>
          ))}
        </ol>

        <label className="mt-5 grid gap-1 text-sm">
          <span className="font-semibold">Fondo de caja al empezar €</span>
          <input value={fondo} onChange={(e) => setFondo(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${input} text-right`} />
          {ultimo && !fondo ? (
            <button type="button" onClick={() => setFondo((ultimo.fondo_inicial_centimos / 100).toFixed(2).replace(".", ","))} className="justify-self-start text-xs font-semibold text-marino underline underline-offset-2 dark:text-neon">
              Usar el del último cierre ({formatCentimos(ultimo.fondo_inicial_centimos)})
            </button>
          ) : null}
        </label>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt>Fondo inicial</dt>
            <dd className="tabular-nums">{formatCentimos(fondoC)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>+ Cobrado en efectivo</dt>
            <dd className="tabular-nums">{formatCentimos(caja.efectivo_centimos)}</dd>
          </div>
          <div className="flex justify-between border-t border-carbon/10 pt-2 font-semibold dark:border-crema/10">
            <dt>Efectivo esperado</dt>
            <dd className="tabular-nums">{formatCentimos(esperado)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Efectivo contado</dt>
            <dd className="tabular-nums">{formatCentimos(contado)}</dd>
          </div>
        </dl>

        <div
          className={`mt-4 rounded-2xl p-4 text-center ${
            estado === "pendiente"
              ? "bg-arena/70 dark:bg-noche-3"
              : estado === "exacto" || estado === "tolerancia"
                ? "bg-oliva-soft text-oliva dark:bg-oliva/25 dark:text-oliva-soft"
                : "bg-terracota-soft text-terracota dark:bg-terracota/25 dark:text-terracota-soft"
          }`}
          role="status"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
            {estado === "pendiente" ? "Descuadre" : estado === "exacto" ? "Cuadra al céntimo" : estado === "tolerancia" ? "Cuadra (±1 €)" : estado === "sobra" ? "Sobra dinero" : "Falta dinero"}
          </p>
          <p className="mt-1 font-display text-4xl tabular-nums">
            {estado === "pendiente" ? "—" : `${descuadre > 0 ? "+" : ""}${formatCentimos(descuadre)}`}
          </p>
          {estado === "pendiente" ? <p className="mt-1 text-xs text-carbon-muted dark:text-crema/60">Cuenta el efectivo para ver el resultado.</p> : null}
          {estado === "sobra" || estado === "falta" ? <p className="mt-1 text-xs">Revisa cobros con tarjeta marcados como efectivo y cambios mal dados.</p> : null}
        </div>

        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder={estado === "sobra" || estado === "falta" ? "Explica el descuadre (recomendado)" : "Notas del cierre"} className={`${input} mt-4`} />
        {aviso ? (
          <div className="mt-3">
            <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>
          </div>
        ) : null}
        <button type="button" onClick={() => void cerrar()} disabled={!hayRecuento} className={`${botonPrimario} mt-4 w-full min-h-14 text-base`}>
          <Icon name="lock" className="h-5 w-5" />
          Cerrar caja e imprimir arqueo
        </button>
      </aside>

      <section className={`${card} p-5 xl:col-span-2`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl">Historial de cierres</h2>
          {h.n ? <p className="text-xs text-carbon-muted dark:text-crema/60">Últimos {h.n} cierres · un cierre cuadra si el descuadre no pasa de ±1 €</p> : null}
        </div>
        {h.n === 0 ? (
          <p className="mt-2 text-sm opacity-60">Todavía no hay cierres. Tras el primero verás aquí la fiabilidad de la caja y su evolución.</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Indicador titulo="Cierres que cuadran" valor={pct(h.cuadran / h.n)} texto={`${h.cuadran} de ${h.n}`} tono={h.cuadran / h.n >= 0.9 ? "ok" : h.cuadran / h.n < 0.7 ? "aviso" : "neutro"} />
              <Indicador titulo="Racha actual" valor={`${h.racha} ${h.racha === 1 ? "cierre" : "cierres"}`} texto={h.racha ? "seguidos cuadrando" : "el último no cuadró"} tono={h.racha >= 5 ? "ok" : "neutro"} />
              <Indicador titulo="Descuadre acumulado" valor={`${h.neto > 0 ? "+" : ""}${formatCentimos(h.neto)}`} texto={`Medio por cierre ±${formatCentimos(Math.round(h.absMedio))}`} tono={Math.abs(h.neto) <= TOLERANCIA ? "ok" : h.neto < 0 ? "aviso" : "neutro"} />
              <Indicador titulo="Cobro medio por turno" valor={formatCentimos(Math.round(h.mediaCobro))} texto={h.mejor ? `Récord ${formatCentimos(cobradoCierre(h.mejor))} (${corta(h.mejor.cerrado_at)})` : ""} />
              <Indicador titulo="Pago en efectivo" valor={pct(h.cuotaEfectivo)} texto="del total cobrado" />
            </div>

            {h.n > 1 ? (
              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <BarrasPrevision
                  titulo="Cobrado por turno"
                  formato={formatCentimos}
                  media={h.mediaCobro}
                  alto={160}
                  datos={h.cronologico.map((c) => ({ etiqueta: corta(c.cerrado_at), valor: cobradoCierre(c), detalle: `${c.tickets} cobros · ${c.cerrado_por_nombre ?? "—"}` }))}
                />
                <BarrasDivergentes
                  titulo="Descuadre por cierre"
                  formato={formatCentimos}
                  datos={h.cronologico.map((c) => ({ etiqueta: fecha(c.cerrado_at), valor: c.descuadre_centimos, detalle: c.notas ?? undefined }))}
                />
              </div>
            ) : null}

            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider opacity-60">
                    <th className="pb-2">Cierre</th>
                    <th className="pb-2 text-right">Cobrado</th>
                    <th className="pb-2 text-right">Esperado</th>
                    <th className="pb-2 text-right">Contado</th>
                    <th className="pb-2 text-right">Descuadre</th>
                    <th className="pb-2 text-right">Tarjeta</th>
                    <th className="pb-2 text-right">Online</th>
                    <th className="pb-2 pl-4">Quién</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-carbon/10 dark:divide-crema/10">
                  {historial.map((c) => {
                    const ok = Math.abs(c.descuadre_centimos) <= TOLERANCIA;
                    return (
                      <tr key={c.id}>
                        <td className="py-2">
                          {fecha(c.cerrado_at)}
                          {c.notas ? <span className="block max-w-56 truncate text-xs text-carbon-muted dark:text-crema/55" title={c.notas}>{c.notas}</span> : null}
                        </td>
                        <td className="text-right font-semibold tabular-nums">{formatCentimos(cobradoCierre(c))}</td>
                        <td className="text-right tabular-nums">{formatCentimos(c.efectivo_esperado_centimos)}</td>
                        <td className="text-right tabular-nums">{formatCentimos(c.efectivo_contado_centimos)}</td>
                        <td className="text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${ok ? "bg-oliva-soft text-oliva dark:bg-oliva/25 dark:text-oliva-soft" : "bg-terracota-soft text-terracota dark:bg-terracota/25 dark:text-terracota-soft"}`}>
                            {ok ? "✓" : "!"} {c.descuadre_centimos > 0 ? "+" : ""}
                            {formatCentimos(c.descuadre_centimos)}
                          </span>
                        </td>
                        <td className="text-right tabular-nums">{formatCentimos(c.tarjeta_centimos)}</td>
                        <td className="text-right tabular-nums">{formatCentimos(c.online_centimos)}</td>
                        <td className="pl-4">{c.cerrado_por_nombre ?? "—"}</td>
                        <td className="text-right">
                          <button type="button" onClick={() => imprimir(c)} className={botonSecundario}>
                            <Icon name="print" className="h-4 w-4" />
                            <span className="sr-only">Imprimir arqueo</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] p-3">
      <dt className="text-xs text-crema/60">{k}</dt>
      <dd className="mt-0.5 font-display text-xl tabular-nums">{v}</dd>
    </div>
  );
}

function Indicador({ titulo, valor, texto, tono = "neutro" }: { titulo: string; valor: string; texto: string; tono?: "neutro" | "ok" | "aviso" }) {
  const borde = tono === "ok" ? "border-l-oliva dark:border-l-oliva-soft" : tono === "aviso" ? "border-l-terracota dark:border-l-terracota-soft" : "border-l-marino dark:border-l-neon";
  return (
    <div className={`rounded-2xl border-l-4 bg-arena/50 p-4 dark:bg-noche-3 ${borde}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-carbon-muted dark:text-crema/60">{titulo}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{valor}</p>
      <p className="text-xs text-carbon-muted dark:text-crema/55">{texto}</p>
    </div>
  );
}
