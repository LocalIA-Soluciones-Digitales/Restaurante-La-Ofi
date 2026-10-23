"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart } from "@/components/admin/BarChart";
import { BarrasPrevision, Cuotas, Hallazgo, Kpi, Progreso } from "@/components/admin/graficos";
import { Aviso, Cifra, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { rpcAdmin } from "@/lib/admin/actions";
import { abc, diaSemana, diasEntre, estadisticas, nombreDia, pct, prever, proyeccionMes, serieDiaria, signoPct, sumarDias, tendencia, variacion } from "@/lib/admin/analitica";
import { descargarCsv } from "@/lib/export-csv";
import { formatCentimos, formatearFechaCorta, hoyEnMadrid } from "@/lib/format";

export interface Ventas {
  resumen: {
    ventas_centimos: number;
    pedidos: number;
    ticket_medio_centimos: number;
    descuentos_centimos: number;
    invitaciones_centimos: number;
    cancelados: number;
    productos_vendidos: number;
  };
  por_dia: { fecha: string; ventas_centimos: number; pedidos: number }[];
  por_hora: { hora: number; ventas_centimos: number; pedidos: number }[];
  por_producto: { nombre: string; cantidad: number; importe_centimos: number }[];
  por_camarero: { nombre: string; pedidos: number; ventas_centimos: number }[];
  por_tipo: { tipo: string; pedidos: number; ventas_centimos: number }[];
  por_metodo: { metodo: string; importe_centimos: number }[];
}

/** Servicio de sala (laofi_admin_ocupacion): se mide cada vez que se libera una mesa. */
export interface Ocupacion {
  desde_medicion: string | null;
  resumen: { ocupaciones: number; comensales: number; minutos_medios: number; importe_medio_centimos: number };
  por_zona: { zona: string; mesas: number; ocupaciones: number; rotacion: number; minutos_medios: number; comensales: number; importe_medio_centimos: number }[];
}

const duracion = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`);

/** Semanas de histórico para la previsión (estacionalidad semanal). */
const SEMANAS_HISTORIA = 12;
const PRESETS = [
  { label: "Hoy", dias: 0 },
  { label: "7 días", dias: 6 },
  { label: "30 días", dias: 29 },
  { label: "90 días", dias: 89 },
] as const;
const TIPO: Record<string, string> = { MESA: "Mesa", RECOGIDA: "Para recoger", BARRA: "Barra" };
const METODO: Record<string, string> = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", STRIPE: "Online (Stripe)" };
const euros = (c: number) => (c / 100).toFixed(2);
const corta = (f: string) => {
  const d = formatearFechaCorta(f);
  return `${d.dia} ${d.mes}`;
};
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/**
 * Ventas e informes: indicadores con comparación frente al periodo anterior,
 * previsión de los próximos días y del cierre de mes (estacionalidad semanal de
 * las últimas 12 semanas), patrón por día de la semana y por hora, análisis ABC
 * de la carta, mezcla de canales y cobros, servicio de sala y conclusiones
 * automáticas. Exporta a CSV e imprime el informe en A4.
 */
export function VentasPanel() {
  const hoy = hoyEnMadrid();
  const [hasta, setHasta] = useState(hoy);
  const [desde, setDesde] = useState(sumarDias(hoy, -6));
  const [v, setV] = useState<Ventas | null>(null);
  const [ant, setAnt] = useState<Ventas | null>(null);
  const [hist, setHist] = useState<Ventas | null>(null);
  const [o, setO] = useState<Ocupacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const largo = diasEntre(desde, hasta) + 1;
  const antDesde = sumarDias(desde, -largo);
  const antHasta = sumarDias(desde, -1);
  const histDesde = sumarDias(hoy, -(SEMANAS_HISTORIA * 7 - 1));

  const cargar = useCallback(async () => {
    setCargando(true);
    const [r, a, h, oc] = await Promise.all([
      rpcAdmin<Ventas>("laofi_admin_ventas", { p_desde: desde, p_hasta: hasta }),
      rpcAdmin<Ventas>("laofi_admin_ventas", { p_desde: antDesde, p_hasta: antHasta }),
      rpcAdmin<Ventas>("laofi_admin_ventas", { p_desde: histDesde, p_hasta: hoy }),
      rpcAdmin<Ocupacion>("laofi_admin_ocupacion", { p_desde: desde, p_hasta: hasta }),
    ]);
    if (r.ok) {
      setV(r.data);
      setError(null);
    } else setError(r.error);
    setAnt(a.ok ? a.data : null);
    setHist(h.ok ? h.data : null);
    setO(oc.ok ? oc.data : null);
    setCargando(false);
  }, [desde, hasta, antDesde, antHasta, histDesde, hoy]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const a = useMemo(() => {
    if (!v) return null;
    const serie = serieDiaria(v.por_dia, desde, hasta);
    const serieAnt = ant ? serieDiaria(ant.por_dia, antDesde, antHasta) : [];
    const historia = hist ? serieDiaria(hist.por_dia, histDesde, hoy) : [];
    const pasado = historia.filter((p) => p.fecha < hoy);
    const abiertos = serie.filter((p) => p.ventas > 0);
    const est = estadisticas(abiertos.map((p) => p.ventas));
    const tend = tendencia(serie.map((p) => p.ventas));
    const mejor = abiertos.reduce<(typeof serie)[number] | null>((m, p) => (!m || p.ventas > m.ventas ? p : m), null);

    // Previsión: hoy (lo que falta) y los 7 días siguientes.
    const proximos = prever(pasado, Array.from({ length: 8 }, (_, i) => sumarDias(hoy, i)));
    const prevHoy = proximos[0] ?? { fecha: hoy, esperado: 0, bajo: 0, alto: 0, abierto: 0 };
    const semana = proximos.slice(1);
    const hechoHoy = historia.find((p) => p.fecha === hoy)?.ventas ?? 0;
    const mes = proyeccionMes(historia, hoy);
    const semanaTotal = semana.reduce((s, p) => s + p.esperado, 0);

    // Patrón semanal (media por día abierto, 12 semanas).
    const porDiaSemana = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const dias = pasado.filter((p) => diaSemana(p.fecha) === d);
      const conVenta = dias.filter((p) => p.ventas > 0);
      return {
        dia: d,
        media: conVenta.length ? conVenta.reduce((s, p) => s + p.ventas, 0) / conVenta.length : 0,
        pedidos: conVenta.length ? conVenta.reduce((s, p) => s + p.pedidos, 0) / conVenta.length : 0,
        abiertos: conVenta.length,
        total: dias.length,
      };
    });
    const mejorDiaSemana = porDiaSemana.reduce((m, d) => (d.media > m.media ? d : m));
    const peorDiaSemana = porDiaSemana.filter((d) => d.media > 0).reduce<(typeof porDiaSemana)[number] | null>((m, d) => (!m || d.media < m.media ? d : m), null);

    // Horas.
    const horas = Array.from({ length: 24 }, (_, h) => v.por_hora.find((x) => x.hora === h) ?? { hora: h, ventas_centimos: 0, pedidos: 0 });
    const conHoras = horas.filter((h) => h.pedidos > 0);
    const primera = conHoras[0]?.hora ?? 8;
    const ultima = conHoras.at(-1)?.hora ?? 22;
    const franja = horas.filter((h) => h.hora >= Math.min(primera, 8) && h.hora <= Math.max(ultima, 22));
    const punta = [...horas].sort((x, y) => y.ventas_centimos - x.ventas_centimos)[0] ?? { hora: 0, ventas_centimos: 0, pedidos: 0 };
    const top3 = [...horas].sort((x, y) => y.ventas_centimos - x.ventas_centimos).slice(0, 3);
    const cuotaTop3 = v.resumen.ventas_centimos ? top3.reduce((s, h) => s + h.ventas_centimos, 0) / v.resumen.ventas_centimos : 0;

    // Carta.
    const productos = abc(v.por_producto);
    const claseA = productos.filter((p) => p.clase === "A");

    const r = v.resumen;
    const ra = ant?.resumen;
    const unidadesPorPedido = r.pedidos ? r.productos_vendidos / r.pedidos : 0;
    const cancelacion = r.pedidos + r.cancelados ? r.cancelados / (r.pedidos + r.cancelados) : 0;
    const fugas = r.descuentos_centimos + r.invitaciones_centimos;

    return {
      serie,
      serieAnt,
      est,
      tend,
      mejor,
      prevHoy,
      hechoHoy,
      semana,
      semanaTotal,
      mes,
      porDiaSemana,
      mejorDiaSemana,
      peorDiaSemana,
      franja,
      punta,
      cuotaTop3,
      productos,
      claseA,
      unidadesPorPedido,
      cancelacion,
      fugas,
      hayHistoria: pasado.some((p) => p.ventas > 0),
      d: {
        ventas: ra ? variacion(r.ventas_centimos, ra.ventas_centimos) : null,
        pedidos: ra ? variacion(r.pedidos, ra.pedidos) : null,
        ticket: ra ? variacion(r.ticket_medio_centimos, ra.ticket_medio_centimos) : null,
        productos: ra ? variacion(r.productos_vendidos, ra.productos_vendidos) : null,
      },
    };
  }, [v, ant, hist, desde, hasta, antDesde, antHasta, histDesde, hoy]);

  const incluyeHoy = hasta === hoy;
  const nombreMes = MESES[Number(hoy.slice(5, 7)) - 1];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2 print:hidden">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            aria-pressed={hasta === hoy && desde === sumarDias(hoy, -p.dias)}
            onClick={() => {
              setHasta(hoy);
              setDesde(sumarDias(hoy, -p.dias));
            }}
            className={`${botonSecundario} aria-pressed:border-marino aria-pressed:bg-marino aria-pressed:text-crema dark:aria-pressed:border-neon dark:aria-pressed:bg-neon dark:aria-pressed:text-noche`}
          >
            {p.label}
          </button>
        ))}
        <label className="grid gap-1 text-xs">
          Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && setDesde(e.target.value)} className={`${input} w-40`} />
        </label>
        <label className="grid gap-1 text-xs">
          Hasta
          <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && setHasta(e.target.value)} className={`${input} w-40`} />
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!v}
            onClick={() =>
              v &&
              descargarCsv(
                `la-ofi-productos-${desde}_${hasta}.csv`,
                (a?.productos ?? []).map((p) => ({ producto: p.nombre, clase_abc: p.clase, unidades: p.cantidad, importe_eur: Number(euros(p.importe)), cuota_pct: Number((p.cuota * 100).toFixed(2)) })),
              )
            }
            className={botonSecundario}
          >
            <Icon name="download" className="h-4 w-4" />
            CSV productos
          </button>
          <button
            type="button"
            disabled={!a}
            onClick={() =>
              a &&
              descargarCsv(
                `la-ofi-ventas-dia-${desde}_${hasta}.csv`,
                a.serie.map((d) => ({ fecha: d.fecha, dia: nombreDia(diaSemana(d.fecha)), pedidos: d.pedidos, ventas_eur: Number(euros(d.ventas)) })),
              )
            }
            className={botonSecundario}
          >
            <Icon name="download" className="h-4 w-4" />
            CSV por día
          </button>
          <button type="button" onClick={() => window.print()} className={botonSecundario}>
            <Icon name="print" className="h-4 w-4" />
            Informe PDF
          </button>
        </div>
      </div>
      {error ? <Aviso>{error}</Aviso> : null}
      {!v && cargando ? <Esqueleto /> : null}

      {v && a ? (
        <div className={`grid gap-4 transition-opacity ${cargando ? "opacity-60" : ""}`}>
          <div className="hidden print:block">
            <p className="font-display text-3xl">Restaurante La Ofi · Informe de ventas</p>
            <p className="text-sm">
              Del {desde} al {hasta} · comparado con {antDesde} – {antHasta} · generado el {new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
            </p>
          </div>

          {/* Titular del periodo */}
          <section className="relative overflow-hidden rounded-[1.25rem] bg-marino p-6 text-crema shadow-card break-inside-avoid dark:bg-noche-3 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-neon/20 blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-crema/60">
                  {largo === 1 ? corta(desde) : `${corta(desde)} – ${corta(hasta)}`} · {largo} {largo === 1 ? "día" : "días"}
                </p>
                <p className="mt-2 font-display text-5xl tabular-nums tracking-tight sm:text-6xl">{formatCentimos(v.resumen.ventas_centimos)}</p>
                <p className="mt-2 max-w-xl text-base text-crema/80">
                  {a.d.ventas === null
                    ? `${v.resumen.pedidos} pedidos con un ticket medio de ${formatCentimos(v.resumen.ticket_medio_centimos)}.`
                    : a.d.ventas >= 0
                      ? `${signoPct(a.d.ventas)} que los ${largo} días anteriores (${formatCentimos(ant?.resumen.ventas_centimos ?? 0)}). ${a.d.ventas > 0.1 ? "Muy buen ritmo." : "Se mantiene el ritmo."}`
                      : `${signoPct(a.d.ventas)} frente a los ${largo} días anteriores (${formatCentimos(ant?.resumen.ventas_centimos ?? 0)}).`}
                </p>
              </div>
              {a.hayHistoria ? (
                <div className="grid gap-4 rounded-2xl bg-white/[0.07] p-5 backdrop-blur">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-crema/60">Previsión cierre de {nombreMes}</p>
                    <p className="mt-1 font-display text-3xl tabular-nums">{formatCentimos(a.mes.total)}</p>
                    <p className="text-sm text-crema/70">
                      Llevas {formatCentimos(a.mes.llevado)} · faltan {a.mes.diasRestantes} días
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-neon" style={{ width: `${a.mes.total ? Math.min(100, (a.mes.llevado / a.mes.total) * 100) : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-3 text-sm">
                    <span>
                      <span className="block text-xs text-crema/60">Próximos 7 días</span>
                      <b className="tabular-nums">{formatCentimos(a.semanaTotal)}</b>
                    </span>
                    {a.prevHoy.esperado ? (
                      <span>
                        <span className="block text-xs text-crema/60">Hoy, previsto</span>
                        <b className="tabular-nums">{formatCentimos(a.prevHoy.esperado)}</b>
                      </span>
                    ) : null}
                    {a.prevHoy.esperado ? (
                      <span>
                        <span className="block text-xs text-crema/60">Hoy, llevas</span>
                        <b className="tabular-nums">
                          {formatCentimos(a.hechoHoy)} · {pct(a.hechoHoy / a.prevHoy.esperado)}
                        </b>
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-white/[0.07] p-5 text-sm text-crema/75">
                  <p className="font-semibold text-crema">Previsiones en camino</p>
                  Con unas semanas de ventas registradas, aquí verás la previsión de los próximos días y del cierre de mes.
                </div>
              )}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Ventas" valor={formatCentimos(v.resumen.ventas_centimos)} icon="chart" delta={a.d.ventas} serie={largo > 1 ? a.serie.map((p) => p.ventas) : undefined} />
            <Kpi label="Pedidos" valor={v.resumen.pedidos.toLocaleString("es-ES")} icon="receipt" delta={a.d.pedidos} serie={largo > 1 ? a.serie.map((p) => p.pedidos) : undefined} />
            <Kpi label="Ticket medio" valor={formatCentimos(v.resumen.ticket_medio_centimos)} icon="cash" delta={a.d.ticket} nota={`${a.unidadesPorPedido.toLocaleString("es-ES", { maximumFractionDigits: 1 })} productos por pedido`} />
            <Kpi label="Productos vendidos" valor={v.resumen.productos_vendidos.toLocaleString("es-ES")} icon="utensils" delta={a.d.productos} nota={`${v.por_producto.length} referencias distintas`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Mini titulo="Media por día abierto" valor={formatCentimos(Math.round(a.est.media))} texto={`Mediana ${formatCentimos(Math.round(a.est.mediana))} · ${a.est.n} de ${largo} días con ventas`} />
            <Mini titulo="Mejor día" valor={a.mejor ? formatCentimos(a.mejor.ventas) : "—"} texto={a.mejor ? `${capital(nombreDia(diaSemana(a.mejor.fecha)))} ${corta(a.mejor.fecha)} · ${a.mejor.pedidos} pedidos` : "Sin ventas"} />
            <Mini
              titulo="Tendencia"
              valor={largo >= 3 && a.est.media ? `${a.tend.pendiente >= 0 ? "+" : "−"}${formatCentimos(Math.abs(Math.round(a.tend.pendiente * 7)))}/sem` : "—"}
              texto={largo >= 3 ? `Ajuste lineal sobre el periodo · fiabilidad ${pct(a.tend.r2)}` : "Elige al menos 3 días"}
            />
            <Mini
              titulo="Estabilidad"
              valor={a.est.n > 1 ? (a.est.cv < 0.25 ? "Alta" : a.est.cv < 0.5 ? "Media" : "Baja") : "—"}
              texto={a.est.n > 1 ? `Variación entre días ${pct(a.est.cv)} (desv. ${formatCentimos(Math.round(a.est.desviacion))})` : "Hacen falta 2 días con ventas"}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <section className={`${card} p-5 break-inside-avoid`}>
              <BarrasPrevision
                titulo={incluyeHoy && a.hayHistoria ? "Ventas por día y previsión de la próxima semana" : "Ventas por día"}
                media={a.est.n > 1 ? a.est.media : undefined}
                formato={formatCentimos}
                datos={[
                  ...a.serie.map((p, i) => ({
                    etiqueta: corta(p.fecha),
                    valor: p.ventas,
                    referencia: a.serieAnt[i]?.ventas || undefined,
                    detalle: `${capital(nombreDia(diaSemana(p.fecha)))} · ${p.pedidos} pedidos`,
                  })),
                  ...(incluyeHoy && a.hayHistoria && largo <= 60
                    ? a.semana.map((p) => ({ etiqueta: corta(p.fecha), valor: p.esperado, bajo: p.bajo, alto: p.alto, prevista: true, detalle: capital(nombreDia(diaSemana(p.fecha))) }))
                    : []),
                ]}
              />
              {a.serieAnt.some((p) => p.ventas) ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-carbon-muted dark:text-crema/60">
                  <span className="h-0 w-3 border-t-2 border-ratan" /> Marca dorada: mismo día del periodo anterior
                </p>
              ) : null}
            </section>

            <section className={`${card} p-5 break-inside-avoid`} aria-labelledby="claves-t">
              <h2 id="claves-t" className="font-display text-xl">
                Lo que dicen los datos
              </h2>
              <ul className="mt-4 grid gap-4">
                {a.d.ventas !== null ? (
                  <Hallazgo icon="chart" tono={a.d.ventas >= 0 ? "ok" : "aviso"} titulo={`Ventas ${a.d.ventas >= 0 ? "al alza" : "a la baja"}: ${signoPct(a.d.ventas)}`}>
                    {a.d.pedidos !== null && a.d.ticket !== null
                      ? Math.abs(a.d.pedidos) >= Math.abs(a.d.ticket)
                        ? `Lo explica sobre todo el número de pedidos (${signoPct(a.d.pedidos)}); el ticket medio varía ${signoPct(a.d.ticket)}.`
                        : `Lo explica sobre todo el ticket medio (${signoPct(a.d.ticket)}); los pedidos varían ${signoPct(a.d.pedidos)}.`
                      : null}
                  </Hallazgo>
                ) : null}
                {a.punta.ventas_centimos > 0 ? (
                  <Hallazgo icon="clock" titulo={`Hora punta: ${a.punta.hora}:00 – ${a.punta.hora + 1}:00`}>
                    Las 3 mejores horas concentran el {pct(a.cuotaTop3)} de la facturación: refuerza personal y cocina en esa franja.
                  </Hallazgo>
                ) : null}
                {a.claseA.length > 0 ? (
                  <Hallazgo icon="utensils" titulo={`${a.claseA.length} ${a.claseA.length === 1 ? "producto genera" : "productos generan"} el 80 % de lo vendido`}>
                    {a.claseA
                      .slice(0, 3)
                      .map((p) => p.nombre)
                      .join(", ")}
                    {a.claseA.length > 3 ? "…" : ""}. Que nunca falten en cámara.
                  </Hallazgo>
                ) : null}
                {a.hayHistoria && a.mejorDiaSemana.media > 0 ? (
                  <Hallazgo icon="calendar" titulo={`Los ${nombreDia(a.mejorDiaSemana.dia).replace(/([^s])$/, "$1s")} son tu mejor día`}>
                    Media de {formatCentimos(Math.round(a.mejorDiaSemana.media))} en las últimas {SEMANAS_HISTORIA} semanas
                    {a.peorDiaSemana && a.peorDiaSemana.dia !== a.mejorDiaSemana.dia ? `; el más flojo, ${nombreDia(a.peorDiaSemana.dia)} (${formatCentimos(Math.round(a.peorDiaSemana.media))}): buen día para una promoción.` : "."}
                  </Hallazgo>
                ) : null}
                {a.fugas > 0 || a.cancelacion > 0 ? (
                  <Hallazgo icon="tag" tono={a.cancelacion > 0.05 || a.fugas > v.resumen.ventas_centimos * 0.05 ? "aviso" : "neutro"} titulo={`Descuentos e invitaciones: ${formatCentimos(a.fugas)}`}>
                    {pct(v.resumen.ventas_centimos ? a.fugas / v.resumen.ventas_centimos : 0, 1)} de las ventas · {v.resumen.cancelados} {v.resumen.cancelados === 1 ? "pedido cancelado" : "pedidos cancelados"} ({pct(a.cancelacion, 1)}).
                  </Hallazgo>
                ) : (
                  <Hallazgo icon="check" tono="ok" titulo="Cero fugas">
                    Sin descuentos, invitaciones ni cancelaciones en el periodo.
                  </Hallazgo>
                )}
              </ul>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${card} p-5 break-inside-avoid`}>
              <BarChart
                titulo="Ventas por hora (todo el periodo)"
                datos={a.franja.map((h) => ({ etiqueta: `${h.hora}h`, valor: h.ventas_centimos, detalle: `${h.pedidos} pedidos${h.pedidos ? ` · ticket ${formatCentimos(Math.round(h.ventas_centimos / h.pedidos))}` : ""}` }))}
                formato={formatCentimos}
              />
            </section>
            <section className={`${card} p-5 break-inside-avoid`}>
              {a.hayHistoria ? (
                <BarrasPrevision
                  titulo={`Venta media por día de la semana (últimas ${SEMANAS_HISTORIA} semanas)`}
                  formato={formatCentimos}
                  datos={a.porDiaSemana.map((d) => ({
                    etiqueta: capital(nombreDia(d.dia)).slice(0, 3),
                    valor: Math.round(d.media),
                    detalle: d.abiertos ? `${d.pedidos.toLocaleString("es-ES", { maximumFractionDigits: 1 })} pedidos de media · abierto ${d.abiertos} de ${d.total}` : "Sin ventas (cerrado)",
                  }))}
                />
              ) : (
                <p className="text-sm text-carbon-muted dark:text-crema/60">El patrón por día de la semana aparece en cuanto haya historial de ventas.</p>
              )}
            </section>
          </div>

          {incluyeHoy && a.hayHistoria ? (
            <section className={`${card} p-5 break-inside-avoid`} aria-labelledby="prev-t">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="prev-t" className="font-display text-xl">
                  Previsión de la próxima semana
                </h2>
                <p className="text-xs text-carbon-muted dark:text-crema/60">Mismo día de la semana, últimas {SEMANAS_HISTORIA} semanas (las recientes pesan más) · rango ±1 desviación</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                {a.semana.map((p) => (
                  <div key={p.fecha} className="rounded-2xl bg-arena/60 p-3 dark:bg-noche-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-carbon-muted dark:text-crema/60">
                      {nombreDia(diaSemana(p.fecha)).slice(0, 3)} {corta(p.fecha)}
                    </p>
                    {p.esperado ? (
                      <>
                        <p className="mt-1 font-display text-xl tabular-nums">{formatCentimos(p.esperado)}</p>
                        <p className="text-xs tabular-nums text-carbon-muted dark:text-crema/55">
                          {formatCentimos(p.bajo)} – {formatCentimos(p.alto)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-carbon-muted dark:text-crema/55">Normalmente cerrado</p>
                    )}
                  </div>
                ))}
              </div>
              {a.prevHoy.esperado ? (
                <div className="mt-4 grid gap-1.5">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span>
                      <b>Hoy</b> llevas {formatCentimos(a.hechoHoy)} de {formatCentimos(a.prevHoy.esperado)} previstos
                    </span>
                    <span className="font-semibold tabular-nums">{pct(a.hechoHoy / a.prevHoy.esperado)}</span>
                  </div>
                  <Progreso valor={a.hechoHoy} objetivo={a.prevHoy.esperado} etiqueta="Ventas de hoy frente a lo previsto" />
                </div>
              ) : null}
            </section>
          ) : null}

          <section className={`${card} p-5 break-inside-avoid`} aria-labelledby="abc-t">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="abc-t" className="font-display text-xl">
                Rendimiento de la carta (análisis ABC)
              </h2>
              <div className="flex flex-wrap gap-2 text-xs">
                {(["A", "B", "C"] as const).map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5">
                    <ClaseBadge clase={c} />
                    {c === "A" ? "80 % de la facturación" : c === "B" ? "siguiente 15 %" : "último 5 %"} · {a.productos.filter((p) => p.clase === c).length}
                  </span>
                ))}
              </div>
            </div>
            {a.productos.length === 0 ? (
              <p className="mt-2 text-sm opacity-60">Sin ventas de productos en el periodo.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider opacity-60">
                      <th className="pb-2">#</th>
                      <th className="pb-2">Producto</th>
                      <th className="pb-2 text-right">Uds.</th>
                      <th className="pb-2 text-right">Importe</th>
                      <th className="w-1/4 pb-2 pl-4">Cuota</th>
                      <th className="pb-2 text-right">vs anterior</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-carbon/10 dark:divide-crema/10">
                    {a.productos.slice(0, 20).map((p, i) => {
                      const antes = ant?.por_producto.find((x) => x.nombre === p.nombre)?.importe_centimos ?? 0;
                      const dv = variacion(p.importe, antes);
                      return (
                        <tr key={p.nombre}>
                          <td className="py-2 tabular-nums opacity-60">{i + 1}</td>
                          <td className="py-2">
                            <span className="inline-flex items-center gap-2">
                              <ClaseBadge clase={p.clase} />
                              <span className="font-semibold">{p.nombre}</span>
                            </span>
                          </td>
                          <td className="py-2 text-right tabular-nums">{p.cantidad}</td>
                          <td className="py-2 text-right tabular-nums">{formatCentimos(p.importe)}</td>
                          <td className="py-2 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-carbon/[0.06] dark:bg-crema/10">
                                <div className="h-full rounded-full bg-marino dark:bg-neon" style={{ width: `${Math.max(2, p.cuota * 100 / Math.max(0.0001, a.productos[0]?.cuota ?? 0))}%` }} />
                              </div>
                              <span className="w-12 text-right text-xs tabular-nums">{pct(p.cuota, 1)}</span>
                            </div>
                          </td>
                          <td className={`py-2 text-right text-xs font-semibold tabular-nums ${dv === null ? "text-carbon-muted dark:text-crema/50" : dv >= 0 ? "text-oliva dark:text-oliva-soft" : "text-terracota dark:text-terracota-soft"}`}>
                            {dv === null ? (antes ? "—" : "nuevo") : `${dv >= 0 ? "↑" : "↓"} ${signoPct(dv)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-3">
            <section className={`${card} p-5 break-inside-avoid`}>
              <h2 className="font-display text-xl">Canal de venta</h2>
              <div className="mt-4">
                <Cuotas
                  formato={formatCentimos}
                  filas={v.por_tipo
                    .slice()
                    .sort((x, y) => y.ventas_centimos - x.ventas_centimos)
                    .map((t) => ({ etiqueta: TIPO[t.tipo] ?? t.tipo, valor: t.ventas_centimos, detalle: `${t.pedidos} pedidos · ticket ${formatCentimos(t.pedidos ? Math.round(t.ventas_centimos / t.pedidos) : 0)}` }))}
                />
              </div>
            </section>
            <section className={`${card} p-5 break-inside-avoid`}>
              <h2 className="font-display text-xl">Cómo pagan</h2>
              <div className="mt-4">
                <Cuotas
                  formato={formatCentimos}
                  filas={v.por_metodo
                    .slice()
                    .sort((x, y) => y.importe_centimos - x.importe_centimos)
                    .map((m) => ({ etiqueta: METODO[m.metodo] ?? m.metodo, valor: m.importe_centimos }))}
                />
              </div>
            </section>
            <section className={`${card} p-5 break-inside-avoid`}>
              <h2 className="font-display text-xl">Equipo</h2>
              <div className="mt-4">
                <Cuotas
                  formato={formatCentimos}
                  filas={v.por_camarero.map((c) => ({ etiqueta: c.nombre, valor: c.ventas_centimos, detalle: `${c.pedidos} pedidos · ticket ${formatCentimos(c.pedidos ? Math.round(c.ventas_centimos / c.pedidos) : 0)}` }))}
                />
              </div>
            </section>
          </div>

          {o ? (
            <section className={`${card} p-5 break-inside-avoid`} aria-labelledby="sala-t">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="sala-t" className="font-display text-xl">
                  Servicio de sala
                </h2>
                <p className="text-xs opacity-60">
                  {o.desde_medicion
                    ? `Se mide al liberar cada mesa, desde el ${new Date(o.desde_medicion).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" })}.`
                    : "Se empieza a medir cuando se libere la primera mesa desde el salón."}
                </p>
              </div>
              {o.resumen.ocupaciones === 0 ? (
                <p className="mt-2 text-sm opacity-60">Sin mesas liberadas en este periodo.</p>
              ) : (
                <>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Cifra label="Mesas servidas" valor={o.resumen.ocupaciones} icon="users" />
                    <Cifra label="Tiempo medio en mesa" valor={duracion(o.resumen.minutos_medios)} icon="clock" />
                    <Cifra label="Comensales" valor={o.resumen.comensales} icon="utensils" />
                    <Cifra label="Gasto por comensal" valor={formatCentimos(o.resumen.comensales ? Math.round((o.resumen.importe_medio_centimos * o.resumen.ocupaciones) / o.resumen.comensales) : 0)} icon="cash" />
                  </div>
                  <table className="mt-4 w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider opacity-60">
                        <th className="pb-2">Zona</th>
                        <th className="pb-2 text-right">Mesas</th>
                        <th className="pb-2 text-right">Servidas</th>
                        <th className="pb-2 text-right" title="Veces que se ocupa cada mesa al día, de media">
                          Rotación/día
                        </th>
                        <th className="pb-2 text-right">Tiempo medio</th>
                        <th className="pb-2 text-right">Importe medio</th>
                        <th className="pb-2 text-right" title="Importe medio por mesa dividido entre su tiempo medio de ocupación">
                          €/hora de mesa
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-carbon/10 dark:divide-crema/10">
                      {o.por_zona.map((z) => (
                        <tr key={z.zona}>
                          <td className="py-1.5 font-semibold">{z.zona}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.mesas}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones ? Number(z.rotacion).toLocaleString("es-ES", { maximumFractionDigits: 2 }) : "—"}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones ? duracion(z.minutos_medios) : "—"}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones ? formatCentimos(z.importe_medio_centimos) : "—"}</td>
                          <td className="py-1.5 text-right tabular-nums">{z.ocupaciones && z.minutos_medios ? formatCentimos(Math.round((z.importe_medio_centimos * 60) / z.minutos_medios)) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </section>
          ) : null}

          <section className={`${card} p-5 break-inside-avoid`}>
            <h2 className="font-display text-xl">Detalle por día</h2>
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider opacity-60">
                  <th className="pb-2">Día</th>
                  <th className="pb-2 text-right">Pedidos</th>
                  <th className="pb-2 text-right">Ventas</th>
                  <th className="pb-2 text-right">Ticket medio</th>
                  <th className="pb-2 text-right">vs media</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-carbon/10 dark:divide-crema/10">
                {a.serie.map((d) => (
                  <tr key={d.fecha}>
                    <td className="py-1.5">
                      {capital(nombreDia(diaSemana(d.fecha)))} {corta(d.fecha)}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">{d.pedidos}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatCentimos(d.ventas)}</td>
                    <td className="py-1.5 text-right tabular-nums">{d.pedidos ? formatCentimos(Math.round(d.ventas / d.pedidos)) : "—"}</td>
                    <td className="py-1.5 text-right tabular-nums">{d.ventas && a.est.media ? signoPct(d.ventas / a.est.media - 1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Mini({ titulo, valor, texto }: { titulo: string; valor: string; texto: string }) {
  return (
    <div className="rounded-[1.25rem] border border-carbon/[0.08] bg-arena/50 p-4 break-inside-avoid dark:border-crema/10 dark:bg-noche-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-carbon-muted dark:text-crema/60">{titulo}</p>
      <p className="mt-1 font-display text-2xl tabular-nums">{valor}</p>
      <p className="text-xs text-carbon-muted dark:text-crema/55">{texto}</p>
    </div>
  );
}

function ClaseBadge({ clase }: { clase: "A" | "B" | "C" }) {
  const c = clase === "A" ? "bg-marino text-crema dark:bg-neon dark:text-noche" : clase === "B" ? "bg-marino/15 text-marino dark:bg-neon/20 dark:text-neon" : "bg-carbon/[0.07] text-carbon-muted dark:bg-crema/10 dark:text-crema/60";
  return <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md text-[10px] font-bold ${c}`}>{clase}</span>;
}

function Esqueleto() {
  return (
    <div className="grid animate-pulse gap-4" aria-busy="true" aria-label="Cargando informe">
      <div className="h-48 rounded-[1.25rem] bg-carbon/[0.06] dark:bg-crema/10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-[1.25rem] bg-carbon/[0.06] dark:bg-crema/10" />
        ))}
      </div>
      <div className="h-72 rounded-[1.25rem] bg-carbon/[0.06] dark:bg-crema/10" />
    </div>
  );
}
