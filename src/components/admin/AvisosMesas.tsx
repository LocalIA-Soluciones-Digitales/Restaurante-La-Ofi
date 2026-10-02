"use client";

import { useEffect, useRef, useState } from "react";
import { botonSecundario } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { accionMesa, salon } from "@/lib/admin/actions";
import type { MesaSalon, SalonData } from "@/lib/admin/types";
import { sonarAviso } from "@/lib/notify-sound";

// Misma preferencia que el botón «Mis mesas» del salón (se guarda por dispositivo).
const CLAVE_MIS_MESAS = "laofi:admin:mis-mesas";

/**
 * Avisos de "llamar al camarero" y "pedir la cuenta" desde los QR, en vivo. Con
 * «Mis mesas» activo, solo los de las mesas asignadas a quien usa el dispositivo
 * (y solo esos suenan).
 */
export function AvisosMesas({ inicial, yo }: { inicial: MesaSalon[]; yo?: string }) {
  const [avisos, setAvisos] = useState(inicial);
  const [soloMias, setSoloMias] = useState(false);
  const soloMiasRef = useRef(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CLAVE_MIS_MESAS) === "1";
      setSoloMias(v);
      soloMiasRef.current = v;
    } catch {
      // Sin almacenamiento local: se ven todos.
    }
  }, []);

  const mia = (m: MesaSalon) => !soloMiasRef.current || !yo || m.camarero_id === yo;

  useEffect(() => {
    let previos = new Set(inicial.map((m) => m.id));
    const t = window.setInterval(async () => {
      const r = await salon<SalonData>();
      if (!r.ok) return;
      const ahora = r.data.mesas.filter((m) => m.aviso_camarero || m.pide_cuenta);
      if (ahora.some((m) => !previos.has(m.id) && mia(m))) sonarAviso("aviso");
      previos = new Set(ahora.map((m) => m.id));
      setAvisos(ahora);
    }, 8000);
    return () => window.clearInterval(t);
  }, [inicial]); // eslint-disable-line react-hooks/exhaustive-deps

  const visibles = avisos.filter((m) => !soloMias || !yo || m.camarero_id === yo);
  const ocultos = avisos.length - visibles.length;

  return (
    <>
      {visibles.length === 0 ? (
        <p className="mt-3 text-sm text-carbon-muted dark:text-crema/60">{soloMias ? "Sin avisos en tus mesas." : "Sin avisos pendientes."}</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-2xl bg-arena p-3 dark:bg-noche-3">
              <span className="flex items-center gap-2 font-semibold">
                <Icon name={m.pide_cuenta ? "receipt" : "bell"} className="h-5 w-5 text-terracota" />
                {m.nombre ?? `Mesa ${m.numero}`} · {m.pide_cuenta ? "pide la cuenta" : "llama al camarero"}
              </span>
              <button
                type="button"
                className={botonSecundario}
                onClick={async () => {
                  await accionMesa(m.id, "atender");
                  setAvisos((a) => a.filter((x) => x.id !== m.id));
                }}
              >
                Atendido
              </button>
            </li>
          ))}
        </ul>
      )}
      {soloMias && ocultos > 0 ? (
        <p className="mt-2 text-xs text-carbon-muted dark:text-crema/60">
          {ocultos} {ocultos === 1 ? "aviso más" : "avisos más"} en mesas de otros compañeros (desactiva «Mis mesas» en el salón para verlos).
        </p>
      ) : null}
    </>
  );
}
