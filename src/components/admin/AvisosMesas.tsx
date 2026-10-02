"use client";

import { useEffect, useState } from "react";
import { botonSecundario } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { accionMesa, salon } from "@/lib/admin/actions";
import type { MesaSalon, SalonData } from "@/lib/admin/types";
import { sonarAviso } from "@/lib/notify-sound";

/** Avisos de "llamar al camarero" y "pedir la cuenta" desde los QR, en vivo. */
export function AvisosMesas({ inicial }: { inicial: MesaSalon[] }) {
  const [avisos, setAvisos] = useState(inicial);

  useEffect(() => {
    let previos = new Set(inicial.map((m) => m.id));
    const t = window.setInterval(async () => {
      const r = await salon<SalonData>();
      if (!r.ok) return;
      const ahora = r.data.mesas.filter((m) => m.aviso_camarero || m.pide_cuenta);
      if (ahora.some((m) => !previos.has(m.id))) sonarAviso("aviso");
      previos = new Set(ahora.map((m) => m.id));
      setAvisos(ahora);
    }, 8000);
    return () => window.clearInterval(t);
  }, [inicial]);

  if (avisos.length === 0) return <p className="mt-3 text-sm text-carbon-muted dark:text-crema/60">Sin avisos pendientes.</p>;

  return (
    <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {avisos.map((m) => (
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
  );
}
