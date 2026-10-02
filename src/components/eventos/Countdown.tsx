"use client";

import { useEffect, useState } from "react";

function partes(objetivo: number, ahora: number) {
  const ms = Math.max(0, objetivo - ahora);
  return {
    dias: Math.floor(ms / 86_400_000),
    horas: Math.floor((ms / 3_600_000) % 24),
    minutos: Math.floor((ms / 60_000) % 60),
    segundos: Math.floor((ms / 1000) % 60),
    terminado: ms === 0,
  };
}

/** Cuenta atrás hasta un evento (fecha + hora en horario de Madrid). Solo en cliente. */
export function Countdown({ fechaISO, hora }: { fechaISO: string; hora: string | null }) {
  const [ahora, setAhora] = useState<number | null>(null);

  useEffect(() => {
    setAhora(Date.now());
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Las fechas de eventos están en horario peninsular (CET/CEST). El offset se
  // resuelve con Intl para no depender del huso del navegador.
  const local = `${fechaISO}T${(hora ?? "00:00").slice(0, 5)}:00`;
  const offset = (() => {
    const d = new Date(`${local}Z`);
    const madrid = new Date(d.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
    const utc = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
    return madrid.getTime() - utc.getTime();
  })();
  const objetivo = new Date(`${local}Z`).getTime() - offset;

  if (ahora === null) return null;
  const p = partes(objetivo, ahora);
  if (p.terminado) return <p className="text-sm font-semibold text-neon">¡Es hoy!</p>;

  const celdas: [number, string][] = [
    [p.dias, "días"],
    [p.horas, "horas"],
    [p.minutos, "min"],
    [p.segundos, "seg"],
  ];
  return (
    <div role="timer" aria-label={`Faltan ${p.dias} días y ${p.horas} horas`} className="flex gap-2">
      {celdas.map(([n, label]) => (
        <div key={label} className="min-w-16 rounded-2xl border border-crema/15 bg-crema/5 px-3 py-2 text-center backdrop-blur">
          <span aria-hidden="true" className="block font-display text-3xl tabular-nums text-crema">
            {String(n).padStart(2, "0")}
          </span>
          <span aria-hidden="true" className="text-[0.65rem] font-semibold uppercase tracking-wider text-crema/60">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
