"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { obtenerPedido } from "@/lib/pedidos/actions";
import { leerRecientes, olvidarReciente } from "@/lib/pedidos/recientes";
import type { EstadoPedido } from "@/lib/restaurant/types";

const ESTADO: Record<EstadoPedido, string> = {
  RECEIVED: "recibido",
  ACCEPTED: "aceptado",
  PREPARING: "en preparación",
  READY: "¡listo!",
  DELIVERED: "entregado",
  CANCELLED: "cancelado",
};

/** "Tu pedido #12 está en preparación" (portado de ActiveOrderBanner de Palomita). */
export function ActiveOrderBanner() {
  const [activo, setActivo] = useState<{ id: string; numero: number; estado: EstadoPedido } | null>(null);

  useEffect(() => {
    let vivo = true;
    const revisar = async () => {
      for (const p of leerRecientes()) {
        const r = await obtenerPedido(p.id);
        if (!vivo) return;
        if (r.ok && r.data && !["DELIVERED", "CANCELLED"].includes(r.data.estado)) {
          setActivo({ id: p.id, numero: r.data.numero_dia, estado: r.data.estado });
          return;
        }
        olvidarReciente(p.id);
      }
      setActivo(null);
    };
    void revisar();
    const t = window.setInterval(() => document.visibilityState === "visible" && void revisar(), 15000);
    return () => {
      vivo = false;
      window.clearInterval(t);
    };
  }, []);

  if (!activo) return null;
  const listo = activo.estado === "READY";
  return (
    <Link
      href={`/es/pedido/${activo.id}`}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-card transition-colors ${
        listo ? "bg-oliva text-crema" : "bg-noche text-crema hover:bg-noche-3"
      }`}
    >
      <Icon name={listo ? "bell" : "clock"} className={`h-5 w-5 ${listo ? "" : "text-neon"}`} />
      <span className="flex-1">
        Tu pedido #{activo.numero} está {ESTADO[activo.estado]}
      </span>
      <Icon name="arrow" className="h-4 w-4" />
    </Link>
  );
}
