"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { INTERVALO_CARTELES } from "@/components/eventos/CartelesRotativos";
import { Countdown } from "@/components/eventos/Countdown";
import { ProgramaEvento } from "@/components/eventos/ProgramaEvento";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import type { MediaEvento, SubEvento } from "@/lib/restaurant/types";

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
  /** Portada, carteles del programa y galería, sin repetir (se turnan solos). */
  media: MediaEvento[];
  programa: SubEvento[];
}

const CLAVE = "laofi-aviso-evento";

/**
 * Aviso emergente con el evento que Carlos elige en /admin/eventos («Anunciar al
 * entrar en la web»). Sale nada más entrar en la web, en cada visita (una vez por
 * sesión del navegador: navegar por la web no lo vuelve a abrir), y nunca en la
 * propia ficha del evento ni al reservar.
 */
export function AvisoEvento({
  evento,
  verHref,
  reservarHref,
  agendaHref,
}: {
  evento: AvisoEventoDatos;
  verHref: string;
  reservarHref: string;
  agendaHref: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.includes(`/eventos/${evento.slug}`) || pathname.includes("/reservar")) return;
    try {
      if (sessionStorage.getItem(CLAVE) === evento.id) return;
    } catch {
      // Sin almacenamiento (navegación privada estricta): se enseña igual.
    }
    // Un instante tras pintar la página, para que se vea entrar y no tape la carga.
    const t = window.setTimeout(() => setAbierto(true), 350);
    return () => window.clearTimeout(t);
    // Solo al entrar: cambiar de página no lo vuelve a abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!abierto) return null;
  const cerrar = () => {
    setAbierto(false);
    try {
      sessionStorage.setItem(CLAVE, evento.id);
    } catch {
      // Sin almacenamiento: volverá a salir al recargar.
    }
  };
  return <Dialogo evento={evento} verHref={verHref} reservarHref={reservarHref} agendaHref={agendaHref} onClose={cerrar} />;
}

function Dialogo({
  evento,
  verHref,
  reservarHref,
  agendaHref,
  onClose,
}: {
  evento: AvisoEventoDatos;
  verHref: string;
  reservarHref: string;
  agendaHref: string;
  onClose: () => void;
}) {
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  const carrusel = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);
  const media = evento.media;

  const ir = (i: number) => {
    const el = carrusel.current;
    if (!el) return;
    const destino = (i + media.length) % media.length;
    el.scrollTo({ left: destino * el.clientWidth, behavior: "smooth" });
  };

  // Los carteles se turnan solos (como en la agenda); un vídeo se deja ver entero.
  const auto = media.length > 1 && !pausa && media[actual]?.tipo !== "video";
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => {
      if (!document.hidden) ir(actual + 1);
    }, INTERVALO_CARTELES);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `ir` solo lee la ref del carrusel
  }, [auto, actual]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-noche/70 backdrop-blur-md motion-safe:animate-fade-in sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-evento-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-noche text-crema shadow-[0_40px_120px_-20px_rgb(0_0_0/0.7)] ring-1 ring-crema/10 max-sm:motion-safe:animate-sheet-up sm:max-h-[88dvh] sm:rounded-[1.75rem] sm:motion-safe:animate-fade-up ${
          media.length > 0 ? "sm:max-w-5xl sm:flex-row" : "sm:max-w-xl"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-noche/70 text-crema ring-1 ring-crema/20 backdrop-blur transition-colors hover:bg-crema hover:text-noche"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
        {/* Asa del panel en móvil. */}
        <span aria-hidden="true" className="absolute left-1/2 top-2 z-20 h-1 w-10 -translate-x-1/2 rounded-full bg-crema/40 sm:hidden" />

        {media.length > 0 ? (
          <div
            className="group relative h-[46dvh] shrink-0 bg-black sm:h-auto sm:w-[52%] sm:min-h-[min(34rem,88dvh)]"
            onMouseEnter={() => setPausa(true)}
            onMouseLeave={() => setPausa(false)}
            onTouchStart={() => setPausa(true)}
          >
            <div
              ref={carrusel}
              onScroll={(e) => setActual(Math.round(e.currentTarget.scrollLeft / Math.max(e.currentTarget.clientWidth, 1)))}
              className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {media.map((m, i) => (
                <div key={m.url} className="relative isolate h-full w-full shrink-0 snap-center overflow-hidden">
                  {m.tipo === "video" ? (
                    <video src={m.url} muted playsInline loop autoPlay={i === 0} preload="metadata" className="h-full w-full object-contain" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- fondo difuminado del mismo cartel */}
                      <img src={m.url} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-50 blur-2xl saturate-150" />
                      {/* eslint-disable-next-line @next/next/no-img-element -- fotos subidas desde el panel (Storage) */}
                      <img
                        src={m.url}
                        alt={i === 0 ? evento.titulo : `${evento.titulo}, imagen ${i + 1}`}
                        loading={i === 0 ? "eager" : "lazy"}
                        className="h-full w-full object-contain drop-shadow-[0_18px_40px_rgb(0_0_0/0.5)]"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => ir(actual - 1)}
                  aria-label="Imagen anterior"
                  className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-noche/60 text-crema ring-1 ring-crema/20 backdrop-blur transition hover:bg-crema hover:text-noche sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Icon name="chevronLeft" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => ir(actual + 1)}
                  aria-label="Imagen siguiente"
                  className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-noche/60 text-crema ring-1 ring-crema/20 backdrop-blur transition hover:bg-crema hover:text-noche sm:grid sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  <Icon name="chevronRight" className="h-5 w-5" />
                </button>
                <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                  {media.map((m, i) => (
                    <button
                      key={m.url}
                      type="button"
                      onClick={() => ir(i)}
                      aria-label={`Imagen ${i + 1} de ${media.length}`}
                      aria-current={i === actual}
                      className="relative h-1.5 w-1.5 overflow-hidden rounded-full bg-crema/45 aria-[current=true]:w-7 motion-safe:transition-all"
                    >
                      {i === actual ? (
                        <span
                          key={`${actual}-${auto}`}
                          className={`absolute inset-y-0 left-0 bg-crema ${auto ? "w-0 motion-safe:animate-[llenar_var(--t)_linear_forwards] motion-reduce:w-full" : "w-full"}`}
                          style={{ ["--t" as string]: `${INTERVALO_CARTELES}ms` }}
                        />
                      ) : null}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-10">
          <p className="flex items-center gap-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-neon">
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-neon opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-neon" />
            </span>
            {evento.tipo ?? "Evento"} en La Ofi
          </p>
          <h2 id="aviso-evento-titulo" className="mt-4 font-display text-[2.1rem] leading-[1.05] tracking-[-0.02em] text-balance sm:text-5xl">
            {evento.titulo}
          </h2>

          <dl className="mt-6 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-[0.95rem]">
            <dt className="text-crema/50">
              <Icon name="calendar" className="h-4 w-4" />
              <span className="sr-only">Fecha</span>
            </dt>
            <dd className="font-semibold first-letter:uppercase">
              {formatearFechaLarga(evento.fecha)}
              {evento.hora ? ` · ${evento.hora.slice(0, 5)}` : ""}
            </dd>
            <dt className="text-crema/50">
              <Icon name="pin" className="h-4 w-4" />
              <span className="sr-only">Lugar</span>
            </dt>
            <dd>La Ofi · Edificio 502, Parque Tecnológico</dd>
            {evento.precioCentimos !== null ? (
              <>
                <dt className="text-crema/50">
                  <Icon name="tag" className="h-4 w-4" />
                  <span className="sr-only">Precio</span>
                </dt>
                <dd>{evento.precioCentimos === 0 ? "Entrada libre" : formatCentimos(evento.precioCentimos)}</dd>
              </>
            ) : null}
          </dl>

          <div className="mt-6">
            <Countdown fechaISO={evento.fecha} hora={evento.hora ?? evento.programa[0]?.hora ?? null} compacto />
          </div>

          {evento.programa.length > 0 ? (
            <div className="mt-7">
              <p className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-crema/50">Programa</p>
              <ProgramaEvento programa={evento.programa} oscuro compacto />
            </div>
          ) : evento.descripcion ? (
            <p className="mt-6 line-clamp-4 leading-relaxed text-crema/70">{evento.descripcion}</p>
          ) : null}

          <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row sm:flex-wrap">
            {evento.reservable ? (
              <Link href={reservarHref} onClick={onClose} className="btn bg-neon text-noche hover:bg-neon-soft">
                <Icon name="calendar" className="h-4 w-4" />
                Reservar mesa
              </Link>
            ) : null}
            <Link href={verHref} onClick={onClose} className="btn-ghost-light">
              Ver el evento
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <Link href={agendaHref} onClick={onClose} className="mt-4 self-center text-sm text-crema/60 underline decoration-crema/25 underline-offset-4 hover:text-crema sm:self-start">
            Ver toda la agenda
          </Link>
        </div>
      </div>
    </div>
  );
}
