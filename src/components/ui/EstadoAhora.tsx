"use client";

import { useEffect, useState } from "react";
import { estadoAhora, type EstadoAhora as Estado, type Semana } from "@/lib/horario";

/**
 * "Abierto ahora · cierra a las 17:00". El servidor pinta el estado del momento
 * de generación (ISR) y el navegador lo corrige al cargar y cada minuto.
 */
export function EstadoAhora({ semana, inicial, className = "", tone = "dark" }: { semana: Semana; inicial: Estado; className?: string; tone?: "dark" | "light" }) {
  const [estado, setEstado] = useState(inicial);

  useEffect(() => {
    const update = () => setEstado(estadoAhora(semana));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [semana]);

  const punto = estado.abierto === true ? "bg-ok" : estado.abierto === false ? "bg-brasa" : tone === "light" ? "bg-crema/50" : "bg-carbon/40";
  return (
    <p className={`inline-flex items-center gap-2 text-sm font-medium ${className}`} aria-live="polite">
      <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
        {estado.abierto === true ? <span className="absolute inset-0 rounded-full bg-ok opacity-60 motion-safe:animate-ping" /> : null}
        <span className={`relative h-2.5 w-2.5 rounded-full ${punto}`} />
      </span>
      {estado.texto}
    </p>
  );
}
