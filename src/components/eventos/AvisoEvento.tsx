"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

/** Proporción de un cartel típico (2:3) mientras no se sabe la real. */
const PROPORCION_INICIAL = 2 / 3;

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
  const [actual, setActual] = useState(0);
  const [pausa, setPausa] = useState(false);
  // Proporción real (ancho/alto) de cada cartel, según se cargan: el hueco de la
  // imagen toma la del cartel que se ve, así un 2:3 y un 9:16 salen enteros y sin bandas.
  const [proporciones, setProporciones] = useState<Record<string, number>>({});
  const media = evento.media;
  const proporcion = proporciones[media[actual]?.url ?? ""] ?? PROPORCION_INICIAL;
  const ir = (i: number) => setActual((i + media.length) % media.length);
  const medir = (url: string, ancho: number, alto: number) => {
    if (ancho && alto) setProporciones((p) => (p[url] ? p : { ...p, [url]: ancho / alto }));
  };

  // Los carteles se turnan solos (como en la agenda); un vídeo se deja ver entero.
  const auto = media.length > 1 && !pausa && media[actual]?.tipo !== "video";
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => {
      if (!document.hidden) setActual((i) => (i + 1) % media.length);
    }, INTERVALO_CARTELES);
    return () => window.clearTimeout(id);
  }, [auto, actual, media.length]);

  const hora = evento.hora ?? evento.programa[0]?.hora ?? null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-carbon/55 backdrop-blur-sm motion-safe:animate-fade-in sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-evento-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ ["--r" as string]: proporcion }}
        className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl max-lg:overflow-y-auto max-lg:overscroll-contain bg-crema text-carbon shadow-[0_30px_90px_-20px_rgb(34_30_26/0.55)] max-sm:motion-safe:animate-sheet-up sm:max-w-lg sm:rounded-2xl sm:motion-safe:animate-fade-up lg:h-[min(88dvh,48rem)] lg:max-h-none lg:w-auto lg:max-w-[calc(100vw-3rem)] lg:flex-row lg:rounded-2xl lg:motion-safe:animate-fade-up"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="z-20 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-crema/90 max-lg:sticky max-lg:top-3 max-lg:-mb-[3.25rem] max-lg:mr-3 max-lg:mt-3 max-lg:self-end lg:absolute lg:right-3 lg:top-3 text-carbon shadow-card backdrop-blur transition-colors hover:bg-carbon hover:text-crema"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>

        {media.length > 0 ? (
          // Móvil: todo el ancho y el alto que pida el cartel (como mucho, media pantalla).
          // Escritorio: alto fijo y el ancho que pida el cartel, que así llena su hueco entero.
          <div
            className="group relative isolate h-[calc(min(100vw,32rem)/var(--r))] w-full shrink-0 overflow-hidden bg-carbon motion-safe:transition-[width,height] motion-safe:duration-500 motion-safe:ease-out-expo lg:h-full lg:w-[calc(min(88dvh,48rem)*var(--r))]"
            onMouseEnter={() => setPausa(true)}
            onMouseLeave={() => setPausa(false)}
            onTouchStart={() => setPausa(true)}
          >
            {media.map((m, i) => (
              <div
                key={m.url}
                aria-hidden={i !== actual}
                className={`absolute inset-0 transition-opacity duration-700 ease-out ${i === actual ? "opacity-100" : "opacity-0"}`}
              >
                {m.tipo === "video" ? (
                  <video
                    src={m.url}
                    muted
                    playsInline
                    loop
                    autoPlay
                    preload="metadata"
                    onLoadedMetadata={(e) => medir(m.url, e.currentTarget.videoWidth, e.currentTarget.videoHeight)}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <>
                    {/* Solo se ve en móvil si el cartel es más alto que el hueco: relleno del mismo cartel, difuminado. */}
                    {/* eslint-disable-next-line @next/next/no-img-element -- fondo difuminado del mismo cartel */}
                    <img src={m.url} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full scale-125 object-cover opacity-60 blur-2xl" />
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos subidas desde el panel (Storage) */}
                    <img
                      src={m.url}
                      alt={i === 0 ? evento.titulo : `${evento.titulo}, cartel ${i + 1}`}
                      loading={i === 0 ? "eager" : "lazy"}
                      onLoad={(e) => medir(m.url, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
                      ref={(el) => {
                        // Ya en caché: el onLoad pudo llegar antes de hidratar.
                        if (el?.complete) medir(m.url, el.naturalWidth, el.naturalHeight);
                      }}
                      className="h-full w-full object-contain"
                    />
                  </>
                )}
              </div>
            ))}
            {media.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => ir(actual - 1)}
                  aria-label="Cartel anterior"
                  className="absolute left-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-crema/90 text-carbon shadow-card transition hover:bg-carbon hover:text-crema lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                >
                  <Icon name="chevronLeft" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => ir(actual + 1)}
                  aria-label="Cartel siguiente"
                  className="absolute right-3 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-crema/90 text-carbon shadow-card transition hover:bg-carbon hover:text-crema lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                >
                  <Icon name="chevronRight" className="h-5 w-5" />
                </button>
                <div className="absolute inset-x-0 top-0 z-10 flex justify-start gap-1.5 bg-gradient-to-b from-carbon/45 to-transparent pb-8 pl-4 pt-[1.6rem] lg:bottom-0 lg:top-auto lg:justify-center lg:bg-gradient-to-t lg:pb-3 lg:pl-0 lg:pt-8">
                  {media.map((m, i) => (
                    <button
                      key={m.url}
                      type="button"
                      onClick={() => ir(i)}
                      aria-label={`Cartel ${i + 1} de ${media.length}`}
                      aria-current={i === actual}
                      className="relative h-1.5 w-1.5 overflow-hidden rounded-full bg-crema/50 aria-[current=true]:w-8 motion-safe:transition-all"
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

        {/* Texto con scroll propio y botones siempre a la vista abajo. */}
        <div className="flex shrink-0 flex-col lg:min-h-0 lg:w-[27rem] lg:flex-none">
          <div className="px-6 pb-6 pt-7 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-9 lg:pt-11 [&>*]:shrink-0">
            <p className="kicker flex items-center gap-2.5 text-brasa">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brasa" />
              {evento.tipo ?? "Evento"} · Próximamente en La Ofi
            </p>
            <h2 id="aviso-evento-titulo" className="t-h2 mt-4 pr-10 text-carbon">
              {evento.titulo}
            </h2>
            {evento.descripcion ? <p className="mt-4 text-[0.98rem] leading-relaxed text-carbon-muted">{evento.descripcion}</p> : null}

            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-tinta-line pt-5 text-[0.95rem]">
              <div className="col-span-2">
                <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">Cuándo</dt>
                <dd className="mt-1 font-semibold first-letter:uppercase">
                  {formatearFechaLarga(evento.fecha)}
                  {hora ? ` · ${hora.slice(0, 5)}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">Dónde</dt>
                <dd className="mt-1">La Ofi · Edificio 502</dd>
              </div>
              {evento.precioCentimos !== null ? (
                <div>
                  <dt className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">Entrada</dt>
                  <dd className="mt-1">{evento.precioCentimos === 0 ? "Libre" : formatCentimos(evento.precioCentimos)}</dd>
                </div>
              ) : null}
            </dl>

            {evento.programa.length > 0 ? (
              <div className="mt-6 border-t border-tinta-line pt-5">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted mb-4">Programa</p>
                <ProgramaEvento programa={evento.programa} compacto />
              </div>
            ) : null}

            <div className="mt-6">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted mb-2">Faltan</p>
              <Countdown fechaISO={evento.fecha} hora={hora} claro />
            </div>
          </div>

          <div className="grid shrink-0 gap-2.5 border-t border-tinta-line bg-papel-2/95 backdrop-blur max-lg:sticky max-lg:bottom-0 max-lg:z-10 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-9 lg:pb-6 lg:pt-4">
            <div className="grid grid-cols-2 gap-2.5">
              {evento.reservable ? (
                <Link href={reservarHref} onClick={onClose} className="btn-primary w-full px-3">
                  <Icon name="users" className="h-4 w-4" />
                  Apuntarme
                </Link>
              ) : null}
              <Link href={verHref} onClick={onClose} className={`btn-secondary w-full px-3 ${evento.reservable ? "" : "col-span-2"}`}>
                Ver el evento
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <Link href={agendaHref} onClick={onClose} className="justify-self-center text-sm text-carbon-muted underline decoration-carbon/25 underline-offset-4 hover:text-carbon">
              Ver toda la agenda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
