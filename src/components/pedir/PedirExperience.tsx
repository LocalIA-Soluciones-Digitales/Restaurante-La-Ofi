"use client";

import { useMemo, useState } from "react";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import type { CartaCartControls } from "@/components/carta/types";
import { ActiveOrderBanner } from "@/components/pedir/ActiveOrderBanner";
import { CartBar } from "@/components/pedir/CartBar";
import { CartDrawer, type PedirContexto } from "@/components/pedir/CartDrawer";
import { CartProvider, useCart } from "@/components/pedir/cart-context";
import { CuentaMesaDrawer } from "@/components/pedir/CuentaMesaDrawer";
import { CrearGrupo } from "@/components/pedir/CrearGrupo";
import { SessionNotifications } from "@/components/pedir/SessionNotifications";
import { TableEntry } from "@/components/pedir/TableEntry";
import { TableSessionProvider, useTableSession } from "@/components/pedir/table-session-context";
import { Icon } from "@/components/ui/Icon";
import { avisarMesa } from "@/lib/pedidos/actions";
import type { ConfigPedidos, GrupoPublico, MesaPublica } from "@/lib/pedidos/types";
import type { CartaSeccion } from "@/lib/restaurant/types";

const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

export type PedirModo =
  | { tipo: "mesa"; mesa: MesaPublica; token: string }
  | { tipo: "recogida" }
  | { tipo: "grupo"; grupo: GrupoPublico }
  | { tipo: "crear-grupo" };

/**
 * /pedir (portado de PedirExperience de Palomita-Bar): carta + cesta en una sola
 * pantalla. Tres entradas: QR de mesa (juntos / cada uno lo suyo), recogida por
 * franja horaria y pedido de grupo por enlace. Si los pedidos online no están
 * activos (config null), la carta se muestra en modo consulta.
 */
export function PedirExperience({ secciones, config, modo }: { secciones: CartaSeccion[]; config: ConfigPedidos | null; modo: PedirModo }) {
  const contexto = modo.tipo === "mesa" ? `mesa:${modo.token}` : modo.tipo === "grupo" ? `grupo:${modo.grupo.token}` : "recogida";
  const contenido = (
    <CartProvider contexto={contexto}>
      <Interior secciones={secciones} config={config} modo={modo} />
    </CartProvider>
  );
  return modo.tipo === "mesa" ? (
    <TableSessionProvider mesa={modo.mesa} token={modo.token}>
      {contenido}
    </TableSessionProvider>
  ) : (
    contenido
  );
}

function Interior({ secciones, config, modo }: { secciones: CartaSeccion[]; config: ConfigPedidos | null; modo: PedirModo }) {
  const cart = useCart();
  const mesa = useTableSession();
  const [cesta, setCesta] = useState(false);
  const [cuenta, setCuenta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // ¿Se puede pedir ahora en este modo?
  const motivoNoPedir = !config
    ? "Los pedidos online aún no están activos: puedes consultar la carta y pedir en barra."
    : modo.tipo === "recogida" && !config.recogida_activa
      ? "Hoy no hay franjas de recogida disponibles. Puedes consultar la carta y llamarnos."
      : modo.tipo === "grupo" && !modo.grupo.abierto
        ? "Este pedido de grupo ya está cerrado."
        : null;
  const listoParaPedir = !motivoNoPedir && (modo.tipo !== "mesa" || (mesa?.haySesion && (mesa.modo !== "SEPARADO" || mesa.participante)));

  const controles = useMemo<CartaCartControls | undefined>(
    () =>
      listoParaPedir
        ? {
            cantidad: (id) => cart.lineas.filter((l) => l.productoId === id).reduce((a, l) => a + l.cantidad, 0),
            anadir: (item, o) => cart.anadir(item, o),
            quitarUno: (id) => cart.quitarUno(id),
            sePuedePedir: (item) => item.fuente === "supabase" && item.precioCentimos !== null,
          }
        : undefined,
    [listoParaPedir, cart],
  );

  if (modo.tipo === "crear-grupo") {
    return <CrearGrupo config={config} />;
  }

  const contextoCesta: PedirContexto = modo.tipo === "mesa" ? { tipo: "mesa" } : modo.tipo === "grupo" ? { tipo: "grupo", grupo: modo.grupo } : { tipo: "recogida" };
  const entrada = modo.tipo === "mesa" ? <TableEntry /> : null;

  const llamar = async () => {
    if (modo.tipo !== "mesa") return;
    const r = await avisarMesa(modo.token, "CAMARERO");
    setAviso(r.ok ? "Avisado. Enseguida viene alguien a la mesa." : r.error);
    window.setTimeout(() => setAviso(null), 5000);
  };

  return (
    <div className="pb-32">
      {modo.tipo === "mesa" ? <SessionNotifications /> : null}

      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-terracota">
            {modo.tipo === "mesa" ? "Pedido en mesa" : modo.tipo === "grupo" ? "Pedido de grupo" : "Para recoger"}
          </p>
          <h1 className="mt-1 text-3xl text-carbon sm:text-4xl">
            {modo.tipo === "mesa"
              ? (modo.mesa.nombre ?? `Mesa ${modo.mesa.numero}`)
              : modo.tipo === "grupo"
                ? modo.grupo.nombre
                : "Pide y recoge en barra"}
          </h1>
          {modo.tipo === "grupo" ? (
            <p className="mt-1 text-sm text-carbon-muted">
              Organiza {modo.grupo.organizador} · recogida a las {HORA.format(new Date(modo.grupo.recogida_en))} · se cierra a las{" "}
              {HORA.format(new Date(modo.grupo.cierra_en))}
              {modo.grupo.pedidos.length > 0 ? ` · ya han pedido ${modo.grupo.pedidos.map((p) => p.nombre).join(", ")}` : ""}
            </p>
          ) : null}
        </div>
        {modo.tipo === "mesa" && mesa?.haySesion ? (
          <div className="flex gap-2">
            <button type="button" onClick={() => void llamar()} className="btn-secondary min-h-11 px-4 text-sm">
              <Icon name="bell" className="h-4 w-4" />
              Llamar al camarero
            </button>
            <button type="button" onClick={() => setCuenta(true)} className="btn-primary min-h-11 px-4 text-sm">
              <Icon name="receipt" className="h-4 w-4" />
              Cuenta
            </button>
          </div>
        ) : null}
      </div>

      {aviso ? (
        <p role="status" className="mb-4 rounded-2xl bg-oliva-soft p-4 text-sm font-semibold text-oliva">
          {aviso}
        </p>
      ) : null}

      <div className="mb-4 space-y-3">
        <ActiveOrderBanner />
        {motivoNoPedir ? (
          <p className="flex gap-2 rounded-2xl bg-arena p-4 text-sm text-carbon-muted">
            <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-marino" />
            {motivoNoPedir}
          </p>
        ) : null}
      </div>

      {entrada && modo.tipo === "mesa" && !listoParaPedir && !motivoNoPedir ? (
        <div className="py-6">{entrada}</div>
      ) : (
        <CartaInteractiva secciones={secciones} cart={controles} />
      )}

      {controles ? <CartBar onOpen={() => setCesta(true)} /> : null}
      {cesta && config ? <CartDrawer contexto={contextoCesta} config={config} onClose={() => setCesta(false)} /> : null}
      {cuenta ? <CuentaMesaDrawer pagoOnline={Boolean(config?.pagos.online)} onClose={() => setCuenta(false)} /> : null}
    </div>
  );
}
