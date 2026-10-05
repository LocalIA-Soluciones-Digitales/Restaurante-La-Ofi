"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/admin/Modal";
import { Icon } from "@/components/ui/Icon";
import { ayudaDe } from "@/lib/admin/ayuda";

const CLAVE_VISTAS = "laofi:admin:ayuda-vista";

function leerVistas(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_VISTAS) ?? "[]") as string[];
  } catch {
    return [];
  }
}

const subtitulo = "mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-carbon-muted dark:text-crema/60";

/**
 * Botón «i» de la cabecera: explica la pantalla actual (qué es, cómo se usa,
 * trucos y leyenda de colores). Un punto marca las pantallas cuya ayuda aún no
 * se ha abierto en este dispositivo.
 */
export function AyudaSeccion({ pathname, titulo }: { pathname: string; titulo: string }) {
  const ayuda = ayudaDe(pathname);
  const [abierta, setAbierta] = useState(false);
  const [nueva, setNueva] = useState(false);

  useEffect(() => {
    setAbierta(false);
    setNueva(ayuda !== null && !leerVistas().includes(titulo));
  }, [pathname, titulo, ayuda]);

  if (!ayuda) return null;

  const abrir = () => {
    setAbierta(true);
    setNueva(false);
    try {
      localStorage.setItem(CLAVE_VISTAS, JSON.stringify([...new Set([...leerVistas(), titulo])]));
    } catch {
      // Sin almacenamiento: el punto vuelve a salir, sin más.
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title={`Ayuda: ${titulo}`}
        className="relative grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15"
      >
        <Icon name="info" className="h-5 w-5" />
        {nueva ? <span aria-hidden="true" className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-terracota ring-2 ring-crema dark:ring-noche" /> : null}
        <span className="sr-only">Ayuda de {titulo}</span>
      </button>
      {/* Portal: la cabecera tiene backdrop-blur, que haría que el modal fixed se colocara respecto a ella y no a la pantalla. */}
      {abierta
        ? createPortal(
            <Modal titulo={titulo} onClose={() => setAbierta(false)} ancho="max-w-xl">
              <p className="text-base leading-relaxed">{ayuda.resumen}</p>

              <h3 className={subtitulo}>Cómo se usa</h3>
              <ol className="mt-2 grid gap-2">
                {ayuda.pasos.map((p, i) => (
                  <li key={p} className="flex gap-3 text-sm leading-relaxed">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marino text-xs font-semibold text-crema dark:bg-neon dark:text-noche">{i + 1}</span>
                    <span className="pt-0.5">{p}</span>
                  </li>
                ))}
              </ol>

              {ayuda.leyenda ? (
                <>
                  <h3 className={subtitulo}>Colores</h3>
                  <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {ayuda.leyenda.map((l) => (
                      <li key={l.texto} className="flex items-center gap-2 text-sm">
                        <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded" style={{ background: l.color }} />
                        {l.texto}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {ayuda.consejos?.length ? (
                <div className="mt-5 rounded-2xl bg-arena p-4 dark:bg-noche-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Icon name="star" className="h-4 w-4 text-terracota" />
                    Trucos
                  </h3>
                  <ul className="mt-2 grid list-disc gap-1.5 pl-5 text-sm leading-relaxed">
                    {ayuda.consejos.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Modal>,
            document.body,
          )
        : null}
    </>
  );
}
