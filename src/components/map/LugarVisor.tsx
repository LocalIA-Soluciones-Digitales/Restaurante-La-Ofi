"use client";

import { useState } from "react";
import { MapEmbed } from "@/components/map/MapEmbed";
import { Photo } from "@/components/media/Photo";
import { IMAGES } from "@/lib/images";

type Vista = "local" | "mapa";

/**
 * Un solo marco grande con dos vistas: la fachada con la carpa (para reconocerlo
 * al llegar) y el mapa interactivo. El conmutador flota sobre el marco y su
 * indicador se desliza entre las dos opciones. Cada vista se carga al abrirla.
 */
export function LugarVisor({ embedUrl, inicial = "local", priority = false }: { embedUrl: string; inicial?: Vista; priority?: boolean }) {
  const [vista, setVista] = useState<Vista>(inicial);
  // Cada vista se monta la primera vez que se abre (ni iframe ni foto ocultos de más).
  const [mapaCargado, setMapaCargado] = useState(inicial === "mapa");
  const [fotoCargada, setFotoCargada] = useState(inicial === "local");
  const elegir = (v: Vista) => {
    setVista(v);
    if (v === "mapa") setMapaCargado(true);
    else setFotoCargada(true);
  };

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-arena sm:aspect-[16/11] lg:aspect-auto lg:h-full lg:min-h-[36rem]">
      <div className={`absolute inset-0 transition-opacity duration-500 ease-out ${vista === "local" ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={vista !== "local"}>
        {fotoCargada ? (
          <div className="parallax absolute inset-0">
            <Photo img="terrazaCarpa" sizes="(min-width: 1024px) 55vw, 100vw" mobileBelow={640} priority={priority && inicial === "local"} />
          </div>
        ) : null}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-noche/60 to-transparent" />
        <p className="absolute bottom-5 left-5 font-display text-2xl text-crema">La carpa del edificio 502</p>
      </div>

      <div className={`absolute inset-0 transition-opacity duration-500 ease-out ${vista === "mapa" ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={vista !== "mapa"}>
        {mapaCargado ? (
          <div className="absolute inset-0 [&>div]:!aspect-auto [&>div]:h-full [&>div]:!min-h-0 [&>div]:rounded-none [&>div]:ring-0">
            <MapEmbed image={IMAGES.mapa.src} alt={IMAGES.mapa.alt} embedUrl={embedUrl} priority={priority} />
          </div>
        ) : null}
      </div>

      <div role="tablist" aria-label="Vista" className="absolute right-4 top-4 grid grid-cols-2 rounded-full bg-crema/90 p-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em] shadow-card backdrop-blur-md">
        <span
          aria-hidden="true"
          className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-carbon transition-transform duration-300 ease-out-expo ${vista === "mapa" ? "translate-x-full" : "translate-x-0"}`}
        />
        {(["local", "mapa"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={vista === v}
            onClick={() => elegir(v)}
            className={`relative min-h-10 rounded-full px-5 transition-colors duration-300 ${vista === v ? "text-crema" : "text-carbon/70 hover:text-carbon"}`}
          >
            {v === "local" ? "El local" : "Mapa"}
          </button>
        ))}
      </div>
    </div>
  );
}
