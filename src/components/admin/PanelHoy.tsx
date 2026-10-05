"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { card } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { accionMesa, rpcAdmin } from "@/lib/admin/actions";
import { cargarHoy, type DatosHoy } from "@/lib/admin/hoy";
import { etiquetaPedido, type MesaSalon, type PedidoKds } from "@/lib/admin/types";
import { formatCentimos } from "@/lib/format";
import { sonarAviso } from "@/lib/notify-sound";
import type { EstadoPedido } from "@/lib/restaurant/types";

// Misma preferencia que el botón «Mis mesas» del salón (se guarda por dispositivo).
const CLAVE_MIS_MESAS = "laofi:admin:mis-mesas";
const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

const ESTADO: Record<EstadoPedido, { label: string; clase: string }> = {
  RECEIVED: { label: "Nuevo", clase: "bg-terracota text-crema" },
  ACCEPTED: { label: "Aceptado", clase: "bg-marino text-crema dark:bg-neon dark:text-noche" },
  PREPARING: { label: "Preparando", clase: "bg-ratan text-carbon" },
  READY: { label: "Listo", clase: "bg-oliva text-crema" },
  DELIVERED: { label: "Servido", clase: "bg-arena text-carbon" },
  CANCELLED: { label: "Cancelado", clase: "bg-arena text-carbon" },
};

const RANGO: Record<EstadoPedido, number> = { RECEIVED: 0, ACCEPTED: 1, PREPARING: 2, READY: 3, DELIVERED: 4, CANCELLED: 9 };

/** Como en el KDS: el pedido va al ritmo de su línea más atrasada (cocina y barra avanzan por separado). */
function estadoReal(p: PedidoKds): EstadoPedido {
  const activas = p.items.filter((i) => i.estado !== "CANCELLED");
  if (activas.length === 0) return p.estado;
  return activas.reduce<EstadoPedido>((min, i) => (RANGO[i.estado] < RANGO[min] ? i.estado : min), "DELIVERED");
}

const nombreMesa = (m: Pick<MesaSalon, "nombre" | "numero">) => m.nombre ?? `Mesa ${m.numero}`;
const minutos = (desde: string, ahora: number) => Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 60000));

/** "HH:MM" → minutos del día (para ordenar y quedarse con las próximas). */
const enMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/**
 * «Hoy»: el servicio de un vistazo y sin scroll en tablet/escritorio. Cifras
 * clicables arriba y tres columnas que se reparten la altura de la pantalla
 * (cada una con su propio scroll si se llena): qué hay que atender ya, qué está
 * saliendo de cocina y barra, y quién llega. Se refresca solo cada 10 s y suena
 * con avisos nuevos de mesa.
 */
export function PanelHoy({ inicial, yo, sala, gestion }: { inicial: DatosHoy; yo: string; sala: boolean; gestion: boolean }) {
  const [d, setD] = useState(inicial);
  const [ahora, setAhora] = useState(() => Date.now());
  const [soloMias, setSoloMias] = useState(false);
  const soloMiasRef = useRef(false);
  const avisosPrevios = useRef(new Set(inicial.mesas.filter((m) => m.aviso_camarero || m.pide_cuenta).map((m) => m.id)));

  useEffect(() => {
    try {
      const v = localStorage.getItem(CLAVE_MIS_MESAS) === "1";
      setSoloMias(v);
      soloMiasRef.current = v;
    } catch {
      // Sin almacenamiento local: se ve todo.
    }
  }, []);

  const refrescar = useCallback(async () => {
    const nuevo = await cargarHoy(sala, gestion);
    const avisos = nuevo.mesas.filter((m) => m.aviso_camarero || m.pide_cuenta);
    if (avisos.some((m) => !avisosPrevios.current.has(m.id) && (!soloMiasRef.current || m.camarero_id === yo))) sonarAviso("aviso");
    avisosPrevios.current = new Set(avisos.map((m) => m.id));
    setD(nuevo);
    setAhora(Date.now());
  }, [sala, gestion, yo]);

  useEffect(() => {
    const t = window.setInterval(() => void refrescar(), 10_000);
    return () => window.clearInterval(t);
  }, [refrescar]);

  const mia = (m: MesaSalon) => !soloMias || m.camarero_id === yo;
  const avisos = d.mesas.filter((m) => (m.aviso_camarero || m.pide_cuenta) && mia(m));
  const listos = d.mesas.filter((m) => (m.listos ?? 0) > 0 && mia(m));
  const limpiar = d.mesas.filter((m) => m.por_limpiar && !m.ocupada);
  // Cobradas del todo pero aún abiertas: liberar cuando se vayan (pasan a «Por limpiar»).
  const pagadas = d.mesas.filter((m) => m.ocupada && m.importe_centimos > 0 && m.pendiente_centimos === 0 && !m.pide_cuenta && mia(m));
  const ocupadas = d.mesas.filter((m) => m.ocupada);
  const comensales = ocupadas.reduce((s, m) => s + m.comensales, 0);
  const pendienteMesas = ocupadas.reduce((s, m) => s + m.pendiente_centimos, 0);
  const cola = d.cola.map((p) => ({ ...p, estado: estadoReal(p) })).sort((a, b) => RANGO[a.estado] - RANGO[b.estado] || a.created_at.localeCompare(b.created_at));
  const enCurso = cola.filter((p) => RANGO[p.estado] < RANGO.READY);
  const nuevos = cola.filter((p) => p.estado === "RECEIVED").length;

  const minAhora = enMinutos(HORA.format(ahora));
  const reservasActivas = d.reservas
    .filter((r) => r.estado === "PENDIENTE" || r.estado === "CONFIRMADA")
    .sort((a, b) => enMinutos(a.hora) - enMinutos(b.hora));
  const proximas = reservasActivas.filter((r) => enMinutos(r.hora) >= minAhora - 30);
  const personasReserva = reservasActivas.reduce((s, r) => s + r.personas, 0);

  const atender = async (m: MesaSalon) => {
    setD((x) => ({ ...x, mesas: x.mesas.map((y) => (y.id === m.id ? { ...y, aviso_camarero: false, pide_cuenta: false } : y)) }));
    await accionMesa(m.id, "atender");
    void refrescar();
  };

  const servir = async (m: MesaSalon) => {
    setD((x) => ({ ...x, mesas: x.mesas.map((y) => (y.id === m.id ? { ...y, listos: 0 } : y)) }));
    await rpcAdmin<number>("laofi_admin_servir_mesa", { p_mesa: m.id });
    void refrescar();
  };

  const liberar = async (m: MesaSalon) => {
    setD((x) => ({ ...x, mesas: x.mesas.map((y) => (y.id === m.id ? { ...y, ocupada: false, por_limpiar: true } : y)) }));
    await accionMesa(m.id, "liberar");
    void refrescar();
  };

  const pendientesAtencion = avisos.length + listos.length + pagadas.length + limpiar.length;

  return (
    // En lg ocupa el alto que deja el saludo (la página es una columna flex de alto fijo).
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <ul className={`grid shrink-0 gap-3 ${sala ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-5" : "grid-cols-2"}`}>
        <Kpi href="/admin/cocina" icon="flame" label="En cocina y barra" valor={enCurso.length} detalle={nuevos ? `${nuevos} sin aceptar` : "al día"} tono={nuevos ? "aviso" : "neutro"} />
        {sala ? (
          <>
            <Kpi href="/admin/salon" icon="users" label="Mesas ocupadas" valor={`${ocupadas.length}/${d.mesas.length}`} detalle={`${comensales} comensales`} />
            <Kpi href="/admin/salon" icon="bell" label="Atender ya" valor={pendientesAtencion} detalle={pendientesAtencion ? "avisos, platos y mesas" : "todo tranquilo"} tono={avisos.length ? "aviso" : "neutro"} />
            <Kpi href="/admin/reservas" icon="calendar" label="Reservas hoy" valor={reservasActivas.length} detalle={`${personasReserva} personas`} />
          </>
        ) : null}
        {d.caja ? (
          <Kpi href="/admin/caja" icon="chart" label="Ventas del turno" valor={formatCentimos(d.caja.ventas_centimos)} detalle={`${d.caja.pedidos} ${d.caja.pedidos === 1 ? "pedido" : "pedidos"} · ${formatCentimos(pendienteMesas)} en mesas`} tono="ok" />
        ) : null}
      </ul>

      <div className={`grid min-h-0 flex-1 gap-4 ${sala ? "lg:grid-cols-3" : ""}`}>
        {sala ? (
          <Columna titulo="Atender ya" icon="bell" contador={pendientesAtencion} href="/admin/salon" enlace="Salón">
            {soloMias ? <p className="mb-2 text-xs text-carbon-muted dark:text-crema/60">Solo tus mesas («Mis mesas» activo en el salón).</p> : null}
            {pendientesAtencion === 0 ? <Vacio icon="check">Nada pendiente. Las llamadas de mesa, la cuenta y los platos listos aparecerán aquí.</Vacio> : null}
            <ul className="flex flex-col gap-2">
              {avisos.map((m) => (
                <Fila key={`a${m.id}`} tono="aviso" icon={m.pide_cuenta ? "receipt" : "bell"} titulo={nombreMesa(m)} texto={m.pide_cuenta ? `Pide la cuenta · ${formatCentimos(m.pendiente_centimos)}` : "Llama al camarero"}>
                  {m.pide_cuenta ? (
                    <Link href={`/admin/salon?mesa=${m.id}`} className={accion}>
                      Cobrar
                    </Link>
                  ) : null}
                  <button type="button" className={accion} onClick={() => void atender(m)}>
                    Atendido
                  </button>
                </Fila>
              ))}
              {listos.map((m) => (
                <Fila key={`l${m.id}`} tono="ok" icon="check" titulo={nombreMesa(m)} texto={`${m.listos} ${m.listos === 1 ? "plato listo" : "platos listos"} para servir`}>
                  <button type="button" className={accion} onClick={() => void servir(m)}>
                    Servido
                  </button>
                </Fila>
              ))}
              {pagadas.map((m) => (
                <Fila key={`c${m.id}`} tono="neutro" icon="check" titulo={nombreMesa(m)} texto={`Pagada (${formatCentimos(m.importe_centimos)}) · libérala al irse`}>
                  <button type="button" className={accion} onClick={() => void liberar(m)}>
                    Liberar
                  </button>
                </Fila>
              ))}
              {limpiar.map((m) => (
                <Fila key={`p${m.id}`} tono="neutro" icon="refresh" titulo={nombreMesa(m)} texto="Por limpiar">
                  <button
                    type="button"
                    className={accion}
                    onClick={async () => {
                      setD((x) => ({ ...x, mesas: x.mesas.map((y) => (y.id === m.id ? { ...y, por_limpiar: false } : y)) }));
                      await accionMesa(m.id, "limpia");
                    }}
                  >
                    Limpia
                  </button>
                </Fila>
              ))}
            </ul>
          </Columna>
        ) : null}

        <Columna titulo="Pedidos en marcha" corto="Pedidos" icon="flame" contador={cola.length} href="/admin/cocina" enlace="Cocina">
          {cola.length === 0 ? <Vacio icon="utensils">Sin pedidos en cocina ni barra.</Vacio> : null}
          <ul className="flex flex-col gap-2">
            {cola.map((p) => {
              const min = minutos(p.created_at, ahora);
              const unidades = p.items.filter((i) => i.estado !== "CANCELLED").reduce((s, i) => s + i.cantidad, 0);
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-arena/60 px-3 py-2.5 dark:bg-noche-3">
                  <span className="font-mono text-sm font-semibold tabular-nums text-carbon-muted dark:text-crema/60">#{p.numero_dia}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{etiquetaPedido(p)}</span>
                    <span className="block truncate text-xs text-carbon-muted dark:text-crema/60">
                      {unidades} {unidades === 1 ? "artículo" : "artículos"} · {p.origen === "web" ? "QR / web" : "TPV"}
                    </span>
                  </span>
                  <span className={`font-mono text-xs tabular-nums ${min >= 20 ? "font-bold text-terracota" : "text-carbon-muted dark:text-crema/60"}`}>{min}′</span>
                  <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${ESTADO[p.estado].clase}`}>{ESTADO[p.estado].label}</span>
                </li>
              );
            })}
          </ul>
        </Columna>

        {sala ? (
          <Columna titulo="Próximas reservas" corto="Reservas" icon="calendar" contador={proximas.length} href="/admin/reservas" enlace="Reservas">
            {proximas.length === 0 ? <Vacio icon="calendar">No hay más reservas hoy.</Vacio> : null}
            <ul className="flex flex-col gap-2">
              {proximas.map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-arena/60 px-3 py-2.5 dark:bg-noche-3">
                  <span className="font-mono text-sm font-semibold tabular-nums">{r.hora.slice(0, 5)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.nombre}</span>
                    <span className="block truncate text-xs text-carbon-muted dark:text-crema/60">
                      {r.personas} pers. · {r.mesas.length ? r.mesas.map((m) => m.numero).join(", ") : "sin mesa asignada"}
                      {r.notas ? ` · ${r.notas}` : ""}
                    </span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${r.estado === "CONFIRMADA" ? "bg-oliva text-crema" : "bg-ratan text-carbon"}`}>
                    {r.estado === "CONFIRMADA" ? "Confirmada" : "Pendiente"}
                  </span>
                </li>
              ))}
            </ul>
          </Columna>
        ) : null}
      </div>
    </div>
  );
}

const accion =
  "inline-flex min-h-9 items-center rounded-xl border border-carbon/15 bg-white px-3 text-xs font-semibold hover:bg-arena dark:border-crema/15 dark:bg-noche-2 dark:hover:bg-noche";

function Kpi({ href, icon, label, valor, detalle, tono = "neutro" }: { href: string; icon: IconName; label: string; valor: ReactNode; detalle: string; tono?: "neutro" | "ok" | "aviso" }) {
  const color = tono === "ok" ? "text-oliva" : tono === "aviso" ? "text-terracota" : "text-marino dark:text-neon";
  return (
    <li>
      <Link href={href} className={`${card} block h-full px-4 py-3 transition-colors hover:border-marino dark:hover:border-neon`}>
        <span className="flex items-center gap-2 text-xs font-semibold text-carbon-muted dark:text-crema/65">
          <Icon name={icon} className={`h-4 w-4 ${color}`} />
          {label}
        </span>
        <span className={`mt-1 block truncate font-display text-2xl tabular-nums xl:text-3xl ${tono === "aviso" ? "text-terracota" : ""}`}>{valor}</span>
        <span className="block truncate text-xs text-carbon-muted dark:text-crema/60">{detalle}</span>
      </Link>
    </li>
  );
}

function Columna({ titulo, corto, icon, contador, href, enlace, children }: { titulo: string; corto?: string; icon: IconName; contador: number; href: string; enlace: string; children: ReactNode }) {
  return (
    <section className={`${card} flex min-h-0 flex-col p-4`} aria-label={titulo}>
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <Icon name={icon} className="h-5 w-5 text-marino dark:text-neon" />
        <h2 className="truncate font-display text-lg xl:text-xl">
          {corto ? (
            <>
              <span className="xl:hidden">{corto}</span>
              <span className="hidden xl:inline">{titulo}</span>
            </>
          ) : (
            titulo
          )}
        </h2>
        <span className="rounded-full bg-arena px-2 text-xs font-semibold tabular-nums dark:bg-noche-3">{contador}</span>
        <Link href={href} className="ml-auto flex shrink-0 items-center gap-1 text-xs font-semibold text-marino hover:underline dark:text-neon">
          <span className="hidden xl:inline">{enlace}</span>
          <span className="sr-only xl:hidden">{enlace}</span>
          <Icon name="chevronRight" className="h-4 w-4" />
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

function Fila({ tono, icon, titulo, texto, children }: { tono: "aviso" | "ok" | "neutro"; icon: IconName; titulo: string; texto: string; children: ReactNode }) {
  const fondo = tono === "aviso" ? "bg-terracota-soft/60" : tono === "ok" ? "bg-oliva-soft/70" : "bg-arena/60 dark:bg-noche-3";
  const color = tono === "aviso" ? "text-terracota" : tono === "ok" ? "text-oliva" : "text-carbon-muted dark:text-crema/60";
  return (
    <li className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${fondo}`}>
      <Icon name={icon} className={`h-5 w-5 shrink-0 ${color}`} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${tono === "neutro" ? "" : "text-carbon"}`}>{titulo}</span>
        <span className={`block truncate text-xs ${tono === "neutro" ? "text-carbon-muted dark:text-crema/60" : "text-carbon-muted"}`}>{texto}</span>
      </span>
      <span className="flex shrink-0 gap-1.5">{children}</span>
    </li>
  );
}

function Vacio({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-2xl border border-dashed border-carbon/15 px-3 py-4 text-sm text-carbon-muted dark:border-crema/15 dark:text-crema/60">
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}
