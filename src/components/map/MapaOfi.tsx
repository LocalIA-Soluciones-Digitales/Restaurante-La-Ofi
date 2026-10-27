"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import { SITE } from "@/lib/site";

// Mapa propio con los colores de la web: OpenFreeMap (gratis, sin clave, datos de
// OpenStreetMap) con el estilo Positron repintado en papel, arena y madera, sin
// comercios ni iconos, y un marcador con el nombre de La Ofi.
const ESTILO = "https://tiles.openfreemap.org/styles/positron";

const C = {
  fondo: "#F1E8D8",
  zonaUrbana: "#EBE1CF",
  edificio: "#DFD0B6",
  verde: "#E1E2C8",
  agua: "#C8D2CF",
  calleBorde: "#D8C8AC",
  calle: "#FBF7EF",
  via: "#CDBFA8",
  texto: "#6B5B4A",
  halo: "#F1E8D8",
};

/** Repinta las capas de Positron con la paleta del local (por id de capa). */
function repintar(estilo: StyleSpecification): StyleSpecification {
  for (const capa of estilo.layers) {
    const id = capa.id;
    const p = (capa.paint ??= {}) as Record<string, unknown>;
    if (capa.type === "background") p["background-color"] = C.fondo;
    else if (capa.type === "fill") {
      if (id === "water") p["fill-color"] = C.agua;
      else if (id === "park" || id === "landcover_wood") p["fill-color"] = C.verde;
      else if (id === "building") {
        p["fill-color"] = C.edificio;
        p["fill-outline-color"] = C.calleBorde;
      } else if (id === "landuse_residential") p["fill-color"] = C.zonaUrbana;
      else p["fill-color"] = C.zonaUrbana;
    } else if (capa.type === "line") {
      if (id === "waterway") p["line-color"] = C.agua;
      else if (id.includes("casing")) p["line-color"] = C.calleBorde;
      else if (id.startsWith("railway")) p["line-color"] = C.via;
      else if (id.startsWith("boundary")) p["line-color"] = C.calleBorde;
      else if (id.startsWith("highway") || id.startsWith("road") || id.startsWith("tunnel") || id.startsWith("aeroway")) p["line-color"] = C.calle;
    } else if (capa.type === "symbol") {
      // Fuera escudos de carretera; el resto de rótulos en tinta cálida.
      if (id.includes("shield")) (capa.layout ??= {}).visibility = "none";
      p["text-color"] = C.texto;
      p["text-halo-color"] = C.halo;
    }
  }
  return estilo;
}

/** Marcador: píldora oscura con el nombre y un punto de brasa que late. */
function crearMarcador(): HTMLElement {
  const el = document.createElement("div");
  el.className = "flex flex-col items-center";
  el.innerHTML = `
    <span class="flex items-center gap-2 whitespace-nowrap bg-carbon px-3.5 py-2 text-crema shadow-[0_12px_30px_-10px_rgb(0_0_0/0.6)]">
      <span class="relative flex h-2 w-2"><span class="absolute inset-0 rounded-full bg-brasa opacity-70 motion-safe:animate-ping"></span><span class="relative h-2 w-2 rounded-full bg-brasa"></span></span>
      <span class="font-display text-[1.05rem] leading-none">La Ofi</span>
      <span class="border-l border-crema/25 pl-2 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-crema/70">Edificio 502</span>
    </span>
    <span class="h-0 w-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-carbon"></span>`;
  return el;
}

export function MapaOfi({ className = "", idFicha }: { className?: string; /** Ficha que flota sobre el mapa en escritorio: el punto se centra en el hueco que deja libre. */ idFicha?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const nodo = caja.current;
    if (!nodo) return;
    let mapa: MapLibreMap | null = null;
    let cancelado = false;

    // Se carga al acercarse a la pantalla: MapLibre y las teselas no pesan en la portada.
    const io = new IntersectionObserver(
      async ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        const [{ default: maplibregl }, estilo] = await Promise.all([
          import("maplibre-gl"),
          fetch(ESTILO).then((r) => r.json() as Promise<StyleSpecification>),
        ]);
        if (cancelado) return;
        const escritorio = window.matchMedia("(min-width: 1024px)").matches;
        mapa = new maplibregl.Map({
          container: nodo,
          style: repintar(estilo),
          center: [SITE.geo.lng, SITE.geo.lat],
          zoom: escritorio ? 11 : 10.4,
          minZoom: 8,
          maxZoom: 18,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          locale: {
            "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda para acercar el mapa",
            "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda para acercar el mapa",
            "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
            "NavigationControl.ZoomIn": "Acercar",
            "NavigationControl.ZoomOut": "Alejar",
          },
        });
        const ficha = idFicha ? document.getElementById(idFicha) : null;
        if (escritorio && ficha) {
          const izquierda = Math.max(0, ficha.getBoundingClientRect().right - nodo.getBoundingClientRect().left);
          mapa.setPadding({ left: izquierda, top: 0, right: 0, bottom: 0 });
        }
        mapa.touchZoomRotate.disableRotation();
        mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
        new maplibregl.Marker({ element: crearMarcador(), anchor: "bottom" }).setLngLat([SITE.geo.lng, SITE.geo.lat]).addTo(mapa);
        mapa.once("load", () => {
          // Créditos plegados en la "i" hasta que se pulsen.
          nodo.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
          setListo(true);
        });
      },
      { rootMargin: "400px" },
    );
    io.observe(nodo);

    return () => {
      cancelado = true;
      io.disconnect();
      mapa?.remove();
    };
  }, [idFicha]);

  return (
    <div className={`relative overflow-hidden bg-arena [&_.maplibregl-ctrl-attrib]:text-[0.65rem] ${className}`}>
      <div
        ref={caja}
        role="region"
        aria-label="Mapa con la ubicación de La Ofi en el Parque Tecnológico de Bizkaia"
        className={`absolute inset-0 transition-opacity duration-700 ${listo ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
