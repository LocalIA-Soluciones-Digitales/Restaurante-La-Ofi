"use client";

import { useEffect, useState } from "react";
import { horarioDeHoy, type Cierre, type Semana } from "@/lib/horario";

/**
 * "Hoy 07:30 – 17:00". Como EstadoAhora: el servidor pinta el valor del momento
 * de generación (ISR) y el navegador lo corrige al cargar, así el primer visitante
 * tras la medianoche no ve el horario de ayer.
 */
export function HorarioHoy({
  semana,
  cierres = [],
  inicial,
  prefijo = "Hoy ",
  sinDato = null,
  separador = false,
  className,
}: {
  semana: Semana;
  cierres?: Cierre[];
  inicial: string | null;
  prefijo?: string;
  /** Texto si hoy no hay horario fiable; null = no pintar nada. */
  sinDato?: string | null;
  /** Antepone un "·" (cuando va detrás de EstadoAhora en la misma línea). */
  separador?: boolean;
  className?: string;
}) {
  const [hoy, setHoy] = useState(inicial);

  useEffect(() => {
    const update = () => setHoy(horarioDeHoy(semana, new Date(), cierres));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [semana, cierres]);

  const texto = hoy ? `${prefijo}${hoy}` : sinDato;
  if (!texto) return null;
  return (
    <>
      {separador ? <span aria-hidden="true">·</span> : null}
      <span className={className}>{texto}</span>
    </>
  );
}
