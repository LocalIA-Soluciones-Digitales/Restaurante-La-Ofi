"use client";

import { useEffect, useRef } from "react";
import { Aviso } from "@/components/admin/ui";

/**
 * Aviso de "guardado" / error fijo abajo de la pantalla: en páginas largas el
 * botón de guardar queda lejos de la cabecera y un aviso arriba no se ve. Los de
 * éxito se cierran solos; los errores se quedan hasta cerrarlos.
 */
export function AvisoFlotante({ aviso, onCerrar }: { aviso: { tono: "ok" | "error" | "info"; texto: string } | null; onCerrar: () => void }) {
  // El temporizador depende solo del aviso: escribir en el formulario no lo reinicia.
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;
  useEffect(() => {
    if (!aviso || aviso.tono === "error") return;
    const t = window.setTimeout(() => cerrar.current(), 4000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  if (!aviso) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-md items-start gap-2 rounded-xl shadow-lift">
      <div className="flex-1">
        <Aviso tono={aviso.tono}>{aviso.texto}</Aviso>
      </div>
      <button type="button" onClick={onCerrar} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-lg font-bold text-carbon dark:bg-noche-3 dark:text-crema" aria-label="Cerrar aviso">
        ×
      </button>
    </div>
  );
}
