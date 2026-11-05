"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Aviso, card } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { colaCocina, encargosVino, historialEncargosVino, historialPedidos, pedidosProximos } from "@/lib/admin/actions";
import type { EncargoVinoAdmin, PedidoKds } from "@/lib/admin/types";
import { formatCentimos } from "@/lib/format";
import { escucharLaofi } from "@/lib/supabase/browser";

// Resumen de lo que se recoge en barra: los platos del día para llevar (Pedidos) y las
// botellas de vino encargadas (Encargos de vino), por día y por hora. Solo consulta:
// cada cosa se acepta, prepara y cobra en su pantalla, a la que lleva cada fila.

const ZONA = "Europe/Madrid";
const DIA = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA });
const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: ZONA });
const SEMANA = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });
const DIA_MES = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const LARGO = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const diaDe = (iso: string | Date) => DIA.format(new Date(iso));
const sumarDias = (f: string, n: number) => new Date(Date.parse(`${f}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const lunesDe = (f: string) => sumarDias(f, -((new Date(`${f}T12:00:00Z`).getUTCDay() + 6) % 7));
const aFecha = (f: string) => new Date(`${f}T12:00:00Z`);
const limpio = (s: string) => s.replace(/\./g, "");

type Paso = "pendiente" | "curso" | "listo" | "entregado";

interface Recogida {
  id: string;
  tipo: "menu" | "vino";
  dia: string;
  /** «HH:MM» en Madrid; null en encargos de vino de antes, sin hora. */
  hora: string | null;
  numero: string;
  nombre: string;
  que: string;
  unidades: number;
  importe: number;
  paso: Paso;
  estado: string;
  pagado: boolean;
}

const PASO: Record<Paso, { punto: string; chip: string }> = {
  pendiente: { punto: "bg-terracota", chip: "bg-terracota/10 text-terracota dark:bg-terracota/25 dark:text-crema" },
  curso: { punto: "bg-ratan", chip: "bg-ratan/30 text-madera-oscura dark:bg-ratan/20 dark:text-ratan" },
  listo: { punto: "bg-oliva", chip: "bg-oliva/15 text-oliva dark:bg-oliva/25 dark:text-oliva-soft" },
  entregado: { punto: "bg-carbon/25 dark:bg-crema/30", chip: "bg-carbon/[0.06] text-carbon-muted dark:bg-crema/10 dark:text-crema/60" },
};

const TIPO = {
  menu: { label: "Platos del día", corto: "Plato", icon: "bag" as IconName, href: "/admin/pedidos", chip: "bg-arena-2 text-madera-oscura dark:bg-madera/25 dark:text-ratan" },
  vino: { label: "Botellas de vino", corto: "Vino", icon: "wine" as IconName, href: "/admin/encargos", chip: "bg-[#F1E1E6] text-[#6B2A3A] dark:bg-[#6B2A3A]/30 dark:text-[#F1C9D3]" },
};

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function dePedido(p: PedidoKds, hoy: string): Recogida | null {
  if (p.tipo !== "RECOGIDA" || p.estado === "CANCELLED") return null;
  const items = p.items.filter((i) => i.estado !== "CANCELLED");
  // Para llevar: «Plato del día» (desde el 05/11/2026) o «Menú del día» (antes); el plato
  // elegido va en sus opciones.
  const delDia = (i: (typeof items)[number]) => i.nombre === "Plato del día" || i.nombre === "Menú del día";
  const menus = items.filter(delDia).reduce((a, i) => a + i.cantidad, 0);
  const que = items.map((i) => {
    const elegido = i.modificadores.flatMap((m) => m.opciones.map((o) => o.nombre)).join(" · ");
    const nombre = delDia(i) && elegido ? elegido : i.nombre;
    return i.cantidad > 1 ? `${i.cantidad}× ${nombre}` : nombre;
  });
  const dia = diaDe(p.recogida_en ?? p.created_at);
  const futuro = dia > hoy;
  const paso: Paso = p.estado === "RECEIVED" ? "pendiente" : p.estado === "READY" ? "listo" : p.estado === "DELIVERED" ? "entregado" : "curso";
  const estado = { pendiente: futuro ? "Por confirmar" : "Por aceptar", curso: futuro ? "Confirmado" : "Preparando", listo: "Listo", entregado: "Entregado" }[paso];
  return {
    id: `p-${p.id}`,
    tipo: "menu",
    dia,
    hora: p.recogida_en ? HORA.format(new Date(p.recogida_en)) : null,
    numero: `#${p.numero_dia}`,
    nombre: p.nombre_cliente ?? "Sin nombre",
    que: que.join(", "),
    unidades: menus || items.reduce((a, i) => a + i.cantidad, 0),
    importe: p.total_centimos,
    paso,
    estado,
    pagado: p.payment_status === "PAID",
  };
}

function deEncargo(e: EncargoVinoAdmin, hoy: string): Recogida | null {
  if (e.estado === "CANCELADO") return null;
  // Los de antes no tienen hora: si siguen abiertos, cuentan hoy; si no, el día que se cerraron.
  const dia = e.recogida_en ? diaDe(e.recogida_en) : e.estado === "ENTREGADO" ? diaDe(e.updated_at) : hoy;
  const paso: Paso = e.estado === "PENDIENTE" ? "pendiente" : e.estado === "CONFIRMADO" ? "curso" : e.estado === "LISTO" ? "listo" : "entregado";
  return {
    id: `v-${e.id}`,
    tipo: "vino",
    dia,
    hora: e.recogida_en ? HORA.format(new Date(e.recogida_en)) : null,
    numero: `nº ${e.numero}`,
    nombre: e.nombre,
    que: e.lineas.map((l) => (l.cantidad > 1 ? `${l.cantidad}× ${l.nombre}` : l.nombre)).join(", "),
    unidades: e.botellas,
    importe: e.total_centimos,
    paso,
    estado: { pendiente: "Por confirmar", curso: "Confirmado", listo: "Listo", entregado: "Entregado" }[paso],
    pagado: e.estado === "ENTREGADO",
  };
}

export function ResumenRecogidas() {
  const [hoy, setHoy] = useState(() => diaDe(new Date()));
  const [fecha, setFecha] = useState(hoy);
  const lunes = lunesDe(fecha);
  const domingo = sumarDias(lunes, 6);
  const [todas, setTodas] = useState<Recogida[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const h = diaDe(new Date());
    setHoy(h);
    const [cola, cerrados, proximos, vino, histP, histV] = await Promise.all([
      colaCocina<PedidoKds>(),
      colaCocina<PedidoKds>(true),
      pedidosProximos<PedidoKds>(),
      encargosVino<EncargoVinoAdmin>(true),
      historialPedidos<PedidoKds>(lunes, domingo),
      historialEncargosVino<EncargoVinoAdmin>(lunes, domingo),
    ]);
    if (!cola.ok) return setError(cola.error);
    if (!vino.ok) return setError(vino.error);
    setError(null);
    const vistos = new Set<string>();
    const lista: Recogida[] = [];
    const meter = (r: Recogida | null) => {
      if (r && !vistos.has(r.id)) {
        vistos.add(r.id);
        lista.push(r);
      }
    };
    // Primero lo vivo (estado al día) y después el historial.
    for (const p of [...cola.data, ...(cerrados.ok ? cerrados.data : []), ...(proximos.ok ? proximos.data : []), ...(histP.ok ? histP.data : [])]) meter(dePedido(p, h));
    for (const e of [...vino.data, ...(histV.ok ? histV.data : [])]) meter(deEncargo(e, h));
    setTodas(lista);
  }, [lunes, domingo]);

  useEffect(() => {
    void cargar();
    const baja = escucharLaofi(["pedidos", "pedido_items", "encargos_vino"], () => void cargar());
    const t = window.setInterval(() => document.visibilityState === "visible" && void cargar(), 30_000);
    return () => {
      baja();
      window.clearInterval(t);
    };
  }, [cargar]);

  const porDia = useMemo(() => {
    const m = new Map<string, Recogida[]>();
    for (const r of todas ?? []) m.set(r.dia, [...(m.get(r.dia) ?? []), r]);
    for (const l of m.values()) l.sort((a, b) => (a.hora ?? "99").localeCompare(b.hora ?? "99") || a.tipo.localeCompare(b.tipo));
    return m;
  }, [todas]);

  const delDia = porDia.get(fecha) ?? [];
  const menus = delDia.filter((r) => r.tipo === "menu");
  const vinos = delDia.filter((r) => r.tipo === "vino");
  // Lo que espera respuesta, sea del día que sea (hoy o los próximos).
  const sinResponder = (todas ?? []).filter((r) => r.paso === "pendiente" && r.dia >= hoy);
  const sinResponderMenu = sinResponder.filter((r) => r.tipo === "menu").length;
  const sinResponderVino = sinResponder.filter((r) => r.tipo === "vino").length;

  const titulo = fecha === hoy ? "Hoy" : fecha === sumarDias(hoy, 1) ? "Mañana" : fecha === sumarDias(hoy, -1) ? "Ayer" : limpio(LARGO.format(aFecha(fecha)));

  return (
    <div className="grid gap-5">
      {sinResponder.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-terracota px-4 py-3 text-sm text-crema">
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="bell" className="h-4 w-4" />
            {plural(sinResponder.length, "encargo espera", "encargos esperan")} respuesta
          </span>
          <span className="flex flex-wrap gap-2 sm:ml-auto">
            {sinResponderMenu ? (
              <Link href="/admin/pedidos" className="rounded-full bg-crema/15 px-3 py-1 font-semibold hover:bg-crema/25">
                {sinResponderMenu} en Pedidos →
              </Link>
            ) : null}
            {sinResponderVino ? (
              <Link href="/admin/encargos" className="rounded-full bg-crema/15 px-3 py-1 font-semibold hover:bg-crema/25">
                {sinResponderVino} en Encargos de vino →
              </Link>
            ) : null}
          </span>
        </div>
      ) : null}

      {/* La semana de lunes a domingo, con lo que se recoge cada día. */}
      <div className={`${card} p-3 sm:p-4`}>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => setFecha(sumarDias(fecha, -7))} aria-label="Semana anterior" className="grid h-10 w-10 place-items-center rounded-full hover:bg-arena dark:hover:bg-noche-3">
            <Icon name="chevronLeft" className="h-4 w-4" />
          </button>
          <p className="text-sm">
            <span className="font-semibold">{lunes === lunesDe(hoy) ? "Esta semana" : lunes === lunesDe(sumarDias(hoy, 7)) ? "Semana que viene" : "Semana"}</span>{" "}
            <span className="text-carbon-muted dark:text-crema/60">
              {limpio(DIA_MES.format(aFecha(lunes)))} – {limpio(DIA_MES.format(aFecha(domingo)))}
            </span>
          </p>
          <button type="button" onClick={() => setFecha(sumarDias(fecha, 7))} aria-label="Semana siguiente" className="grid h-10 w-10 place-items-center rounded-full hover:bg-arena dark:hover:bg-noche-3">
            <Icon name="chevronRight" className="h-4 w-4" />
          </button>
        </div>
        <ol className="mt-2 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).map((f) => {
            const lista = porDia.get(f) ?? [];
            const elegido = f === fecha;
            const pendiente = lista.some((r) => r.paso === "pendiente");
            return (
              <li key={f}>
                <button
                  type="button"
                  onClick={() => setFecha(f)}
                  aria-pressed={elegido}
                  className={`flex w-full flex-col items-center rounded-xl px-1 py-2 transition-colors ${elegido ? "bg-marino text-crema dark:bg-neon dark:text-noche" : f < hoy ? "text-carbon-muted hover:bg-arena dark:text-crema/50 dark:hover:bg-noche-3" : "hover:bg-arena dark:hover:bg-noche-3"}`}
                >
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] opacity-70">{f === hoy ? "Hoy" : limpio(SEMANA.format(aFecha(f)))}</span>
                  <span className="font-display text-2xl tabular-nums leading-tight">{Number(f.slice(8))}</span>
                  <span className="flex h-4 items-center gap-1 text-[0.7rem] font-semibold tabular-nums">
                    {lista.length ? (
                      <>
                        {pendiente ? <span className={`h-1.5 w-1.5 rounded-full ${elegido ? "bg-crema dark:bg-noche" : "bg-terracota"}`} /> : null}
                        {lista.length}
                      </>
                    ) : (
                      <span className="opacity-40">–</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl first-letter:uppercase">{titulo}</h2>
        {fecha !== hoy ? (
          <button type="button" onClick={() => setFecha(hoy)} className="text-sm font-semibold underline underline-offset-4">
            Volver a hoy
          </button>
        ) : null}
      </div>

      {error ? <Aviso>{error}</Aviso> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Tarjeta tipo="menu" lista={menus} unidad={["plato", "platos"]} cargando={!todas} />
        <Tarjeta tipo="vino" lista={vinos} unidad={["botella", "botellas"]} cargando={!todas} />
      </div>

      <section aria-labelledby="agenda" className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-carbon/[0.07] px-4 py-3 dark:border-crema/10">
          <h3 id="agenda" className="font-semibold">
            Recogidas por hora
          </h3>
          <span className="text-sm tabular-nums text-carbon-muted dark:text-crema/60">
            {delDia.length ? `${plural(delDia.length, "encargo", "encargos")} · ${formatCentimos(delDia.reduce((a, r) => a + r.importe, 0))}` : ""}
          </span>
        </div>
        {!todas ? (
          <p className="px-4 py-10 text-center text-sm text-carbon-muted dark:text-crema/60">Cargando…</p>
        ) : delDia.length === 0 ? (
          <div className="grid place-items-center gap-2 px-4 py-12 text-center">
            <Icon name="calendar" className="h-6 w-6 text-carbon-muted dark:text-crema/50" />
            <p className="font-semibold">Nada para recoger {fecha === hoy ? "hoy" : "este día"}.</p>
          </div>
        ) : (
          <ul className="divide-y divide-carbon/[0.07] dark:divide-crema/10">
            {delDia.map((r) => (
              <li key={r.id}>
                <Fila r={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/** Una tarjeta por tipo: cuántos platos o botellas, en cuántos encargos, y en qué paso están. */
function Tarjeta({ tipo, lista, unidad, cargando }: { tipo: "menu" | "vino"; lista: Recogida[]; unidad: [string, string]; cargando: boolean }) {
  const t = TIPO[tipo];
  const unidades = lista.reduce((a, r) => a + r.unidades, 0);
  const importe = lista.reduce((a, r) => a + r.importe, 0);
  const cuenta = (p: Paso) => lista.filter((r) => r.paso === p).length;
  const pasos: { paso: Paso; label: string }[] = [
    { paso: "pendiente", label: tipo === "menu" ? "Sin aceptar" : "Sin confirmar" },
    { paso: "curso", label: tipo === "menu" ? "En marcha" : "Confirmados" },
    { paso: "listo", label: "Listos" },
    { paso: "entregado", label: "Entregados" },
  ];
  return (
    <Link href={t.href} className={`${card} group flex flex-col p-4 transition-shadow hover:shadow-lift sm:p-5`}>
      <span className="flex items-center gap-2.5">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${t.chip}`}>
          <Icon name={t.icon} className="h-4 w-4" />
        </span>
        <span className="font-semibold">{t.label} para recoger</span>
        <Icon name="arrow" className="ml-auto h-4 w-4 text-carbon-muted transition-transform group-hover:translate-x-0.5 dark:text-crema/60" />
      </span>
      <span className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-5xl tabular-nums leading-none">{cargando ? "–" : unidades}</span>
        <span className="text-carbon-muted dark:text-crema/65">{unidades === 1 ? unidad[0] : unidad[1]}</span>
      </span>
      <span className="mt-1.5 text-sm text-carbon-muted dark:text-crema/60">
        {lista.length ? `${plural(lista.length, "encargo", "encargos")} · ${formatCentimos(importe)}` : "Sin encargos este día"}
      </span>
      <span className="mt-4 grid grid-cols-2 gap-1.5 border-t border-carbon/[0.07] pt-3 sm:grid-cols-4 dark:border-crema/10">
        {pasos.map((p) => {
          const n = cuenta(p.paso);
          return (
            <span key={p.paso} className={`rounded-lg px-2 py-1.5 ${n && p.paso === "pendiente" ? "bg-terracota/10 dark:bg-terracota/20" : ""}`}>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${PASO[p.paso].punto}`} />
                <span className={`font-display text-lg tabular-nums leading-none ${n && p.paso === "pendiente" ? "text-terracota" : ""}`}>{n}</span>
              </span>
              <span className="mt-0.5 block truncate text-[0.7rem] text-carbon-muted dark:text-crema/60">{p.label}</span>
            </span>
          );
        })}
      </span>
    </Link>
  );
}

function Fila({ r }: { r: Recogida }) {
  const t = TIPO[r.tipo];
  return (
    <Link href={t.href} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-arena/50 dark:hover:bg-noche-3/50 sm:grid-cols-[4rem_minmax(0,1fr)_auto]">
      <span className={`font-display text-lg tabular-nums ${r.paso === "entregado" ? "text-carbon-muted dark:text-crema/50" : ""}`}>{r.hora ?? "—"}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span title={t.label} className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.7rem] font-semibold ${t.chip}`}>
            <Icon name={t.icon} className="h-3 w-3" />
            <span className="hidden sm:inline">{t.corto}</span>
          </span>
          <span className={`truncate font-semibold ${r.paso === "entregado" ? "text-carbon-muted dark:text-crema/55" : ""}`}>{r.nombre}</span>
          <span className="hidden shrink-0 text-xs text-carbon-muted sm:inline dark:text-crema/50">{r.numero}</span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-carbon-muted dark:text-crema/60">{r.que || "—"}</span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PASO[r.paso].chip}`}>{r.estado}</span>
        <span className="text-xs tabular-nums text-carbon-muted dark:text-crema/60">
          {formatCentimos(r.importe)}
          {r.pagado ? " · pagado" : ""}
        </span>
      </span>
    </Link>
  );
}
