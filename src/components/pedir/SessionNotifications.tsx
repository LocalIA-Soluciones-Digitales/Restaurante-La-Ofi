"use client";

import { useEffect, useRef, useState } from "react";
import { useTableSession } from "@/components/pedir/table-session-context";
import { Icon } from "@/components/ui/Icon";
import { vibrar } from "@/lib/haptics";

/**
 * Avisos en vivo de la mesa (Palomita §16.5): "Ana ha compartido contigo: Nachos"
 * cuando aparece una parte nueva para ti que no viene de tu propio pedido.
 */
export function SessionNotifications() {
  const s = useTableSession();
  const vistos = useRef<Set<string> | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const yo = s?.participante?.id;
    const sesion = s?.sesion;
    if (!yo || !sesion) return;
    const nombres = new Map(sesion.participantes.map((p) => [p.id, p.nombre]));
    const nuevos: string[] = [];
    const ids = new Set<string>();
    for (const p of sesion.pedidos) {
      for (const it of p.items) {
        for (const r of it.repartos) {
          ids.add(r.id);
          if (vistos.current && !vistos.current.has(r.id) && r.participante_id === yo && p.participante_id && p.participante_id !== yo) {
            nuevos.push(`${nombres.get(p.participante_id) ?? "Alguien"} ha compartido contigo: ${it.nombre}`);
          }
        }
      }
    }
    // La primera carga solo memoriza lo que ya había.
    vistos.current = ids;
    if (nuevos.length > 0) {
      setAviso(nuevos.join(" · "));
      vibrar([15, 60, 15]);
    }
  }, [s?.sesion, s?.participante?.id]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 6000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
      {aviso ? (
        <p className="pointer-events-auto flex items-center gap-2 rounded-full bg-noche px-5 py-3 text-sm text-crema shadow-lift animate-fade-up">
          <Icon name="users" className="h-4 w-4 text-neon" />
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
