"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { PlanoEsquema } from "@/components/espacios/PlanoEsquema";
import { Icon } from "@/components/ui/Icon";
import type { Zona } from "@/lib/admin/types";
import { MESAS_PROVISIONALES, ZONAS_PROVISIONALES } from "@/lib/espacios/plano-provisional";

// three.js (~600 KB) solo cuando el plano se acerca a la pantalla.
const Plano3D = dynamic(() => import("@/components/admin/salon/Plano3D"), { ssr: false, loading: () => null });

function soportaWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Plano 3D del local en la web pública (el mismo del panel, en modo público).
 * Estático con un encuadre que muestra todo el local (un giro automático saca
 * zonas de cuadro y distrae); no captura el ratón ni el dedo hasta pulsar
 * «Explorar en 3D», para no secuestrar el scroll. Sin WebGL, el esquema 2D.
 */
export function PlanoLocal3D({ destacar }: { destacar?: Zona["tipo"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cargar, setCargar] = useState(false);
  const [interactivo, setInteractivo] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !soportaWebGL()) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setCargar(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative aspect-[4/3] w-full overflow-hidden bg-noche md:aspect-[16/9]">
      {cargar ? (
        <>
          <div className={`absolute inset-0 ${interactivo ? "" : "pointer-events-none"}`}>
            <Plano3D
              zonas={ZONAS_PROVISIONALES}
              mesas={MESAS_PROVISIONALES}
              publico
              destacar={destacar}
              interactivo={interactivo}
              className="h-full w-full"
            />
          </div>
          <div className="absolute inset-x-2 top-2 flex flex-wrap items-center justify-between gap-2 sm:inset-x-3 sm:bottom-3 sm:top-auto">
            <button
              type="button"
              aria-pressed={interactivo}
              onClick={() => setInteractivo((v) => !v)}
              className="btn min-h-10 bg-crema/95 px-3 text-xs text-carbon hover:bg-white sm:px-4 sm:text-sm"
            >
              <Icon name={interactivo ? "close" : "move"} className="h-4 w-4" />
              {interactivo ? "Dejar de explorar" : "Explorar en 3D"}
            </button>
            {interactivo ? (
              <span className="hidden rounded-sm bg-carbon/70 px-2 py-1 text-[0.7rem] text-crema sm:inline">Arrastra para girar · pellizca o usa la rueda para acercar</span>
            ) : null}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-papel-2 p-6 sm:p-10">
          <PlanoEsquema />
        </div>
      )}
    </div>
  );
}
