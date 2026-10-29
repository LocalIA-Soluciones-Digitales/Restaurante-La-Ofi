"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import type { MediaEvento } from "@/lib/restaurant/types";

export interface AvisoEventoDatos {
  id: string;
  slug: string;
  titulo: string;
  tipo: string | null;
  descripcion: string | null;
  fecha: string;
  hora: string | null;
  precioCentimos: number | null;
  /** Se puede reservar desde la web (estado «próximo»). */
  reservable: boolean;
  media: MediaEvento[];
}

const CLAVE = "laofi-aviso-evento";

/**
 * Aviso emergente con el próximo evento (tardeo, partido…) que Carlos marca en
 * /admin/eventos como «Anunciarlo al entrar en la web». Sale una vez por visitante
 * y evento, a los pocos segundos de entrar, y nunca en la propia ficha del evento.
 */
export function AvisoEvento({ evento, verHref, reservarHref }: { evento: AvisoEventoDatos; verHref: string; reservarHref: string }) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.includes(`/eventos/${evento.slug}`) || pathname.includes("/reservar")) return;
    try {
      if (localStorage.getItem(CLAVE) === evento.id) return;
    } catch {
      // Sin almacenamiento (navegación privada estricta): se enseña igual.
    }
    const t = window.setTimeout(() => setAbierto(true), 1500);
    return () => window.clearTimeout(t);
    // Solo al entrar: cambiar de página no lo vuelve a abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!abierto) return null;
  const cerrar = () => {
    setAbierto(false);
    try {
      localStorage.setItem(CLAVE, evento.id);
    } catch {
      // Sin almacenamiento: volverá a salir en la próxima visita.
    }
  };
  return <Dialogo evento={evento} verHref={verHref} reservarHref={reservarHref} onClose={cerrar} />;
}

function Dialogo({ evento, verHref, reservarHref, onClose }: { evento: AvisoEventoDatos; verHref: string; reservarHref: string; onClose: () => void }) {
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  const carrusel = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const media = evento.media;

  const ir = (i: number) => {
    const el = carrusel.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-carbon/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-evento-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-crema text-carbon shadow-2xl motion-safe:animate-fade-up sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-carbon/60 text-crema backdrop-blur hover:bg-carbon"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>

        {media.length > 0 ? (
          <div className="relative shrink-0 bg-carbon">
            <div
              ref={carrusel}
              onScroll={(e) => setActual(Math.round(e.currentTarget.scrollLeft / Math.max(e.currentTarget.clientWidth, 1)))}
              className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {media.map((m, i) =>
                m.tipo === "video" ? (
                  <video key={m.url} src={m.url} muted playsInline loop autoPlay={i === 0} preload="metadata" className="h-full w-full shrink-0 snap-center object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- fotos subidas desde el panel (Storage)
                  <img key={m.url} src={m.url} alt={i === 0 ? evento.titulo : ""} loading={i === 0 ? "eager" : "lazy"} className="h-full w-full shrink-0 snap-center object-cover" />
                ),
              )}
            </div>
            {media.length > 1 ? (
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {media.map((m, i) => (
                  <button
                    key={m.url}
                    type="button"
                    onClick={() => ir(i)}
                    aria-label={`Foto ${i + 1} de ${media.length}`}
                    aria-current={i === actual}
                    className="h-2 w-2 rounded-full bg-crema/50 aria-[current=true]:w-5 aria-[current=true]:bg-crema motion-safe:transition-all"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-y-auto p-6 sm:p-8">
          <p className="kicker text-brasa">{evento.tipo ?? "Evento"} en La Ofi</p>
          <h2 id="aviso-evento-titulo" className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
            {evento.titulo}
          </h2>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.95rem] font-semibold">
            <span className="inline-flex items-center gap-2 first-letter:uppercase">
              <Icon name="calendar" className="h-4 w-4 text-brasa" />
              {formatearFechaLarga(evento.fecha)}
              {evento.hora ? ` · ${evento.hora.slice(0, 5)}` : ""}
            </span>
            {evento.precioCentimos !== null ? <span>{evento.precioCentimos === 0 ? "Entrada libre" : formatCentimos(evento.precioCentimos)}</span> : null}
          </p>
          {evento.descripcion ? <p className="mt-3 line-clamp-4 text-carbon-muted">{evento.descripcion}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {evento.reservable ? (
              <Link href={reservarHref} onClick={onClose} className="btn-primary">
                <Icon name="calendar" className="h-4 w-4" />
                Reservar
              </Link>
            ) : null}
            <Link href={verHref} onClick={onClose} className="btn-secondary">
              Ver el evento
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
