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
  // Forma del primer cartel (ancho/alto): la tarjeta se corta a su medida.
  const [proporcion, setProporcion] = useState(2 / 3);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.includes(`/eventos/${evento.slug}`) || pathname.includes("/reservar")) return;
    try {
      if (sessionStorage.getItem(CLAVE) === evento.id) return;
    } catch {
      // Sin almacenamiento (navegación privada estricta): se enseña igual.
    }
    // Un instante tras pintar la página, para que se vea entrar y no tape la carga; mientras,
    // se precarga el cartel para abrir ya con su forma (sin saltos ni hueco vacío).
    const inicio = Date.now();
    let t: number | undefined;
    const abrir = () => {
      if (t === undefined) t = window.setTimeout(() => setAbierto(true), Math.max(0, 350 - (Date.now() - inicio)));
    };
    const primera = evento.media.find((m) => m.tipo === "imagen")?.url;
    if (primera) {
      const img = new window.Image();
      img.onload = () => {
        if (img.naturalHeight) setProporcion(img.naturalWidth / img.naturalHeight);
        abrir();
      };
      img.onerror = abrir;
      img.src = primera;
    } else abrir();
    const tope = window.setTimeout(abrir, 2500);
    return () => {
      window.clearTimeout(tope);
      if (t !== undefined) window.clearTimeout(t);
    };
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
  return <Dialogo evento={evento} proporcion={proporcion} verHref={verHref} reservarHref={reservarHref} agendaHref={agendaHref} onClose={cerrar} />;
}

/** Tras tocar o arrastrar los carteles, cuánto se espera antes de volver a turnarlos. */
const REANUDAR_MS = 8000;

function Dialogo({
  evento,
  proporcion,
  verHref,
  reservarHref,
  agendaHref,
  onClose,
}: {
  evento: AvisoEventoDatos;
  proporcion: number;
  verHref: string;
  reservarHref: string;
  agendaHref: string;
  onClose: () => void;
}) {
  // Entre una historia (9:16 aprox.) y un cuadrado: más ancho no cabe junto al texto.
  const forma = Math.min(1, Math.max(0.5, proporcion));
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  const pista = useRef<HTMLDivElement>(null);
  const [actual, setActual] = useState(0);
  const [encima, setEncima] = useState(false);
  const [tocadoHasta, setTocadoHasta] = useState(0);
  const media = evento.media;
  const varios = media.length > 1;

  // Carrusel con scroll-snap nativo: en el móvil se desliza con el dedo como
  // cualquier galería; las flechas, los puntos y el turno automático lo mueven igual.
  const ir = (i: number) => {
    const el = pista.current;
    if (!el) return;
    const destino = (i + media.length) % media.length;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: destino * el.clientWidth, behavior: suave ? "smooth" : "auto" });
  };
  const alDesplazar = () => {
    const el = pista.current;
    if (el && el.clientWidth) setActual(Math.round(el.scrollLeft / el.clientWidth));
  };
  const tocar = () => setTocadoHasta(Date.now() + REANUDAR_MS);

  // Se turnan solos; se paran con el ratón encima, un rato tras tocarlos y con un vídeo.
  const auto = varios && !encima && media[actual]?.tipo !== "video";
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const espera = Math.max(INTERVALO_CARTELES, tocadoHasta - Date.now());
    const id = window.setTimeout(() => {
      if (!document.hidden) ir(actual + 1);
    }, espera);
    return () => window.clearTimeout(id);
    // ir solo depende de la pista (ref) y del número de carteles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, actual, tocadoHasta]);

  const hora = evento.hora ?? evento.programa[0]?.hora ?? null;
  const cuando = `${formatearFechaLarga(evento.fecha)}${hora ? ` · ${hora.slice(0, 5)}` : ""}`;
  const precio = evento.precioCentimos === null ? null : evento.precioCentimos === 0 ? "Entrada libre" : formatCentimos(evento.precioCentimos);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-carbon/60 p-4 backdrop-blur-sm motion-safe:animate-fade-in sm:p-6"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-evento-titulo"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ ["--r" as string]: forma }}
        className="relative flex max-h-[min(88svh,46rem)] w-[clamp(19rem,calc(54svh*var(--r)),24rem)] max-w-full flex-col overflow-hidden rounded-3xl bg-crema text-carbon shadow-[0_30px_90px_-20px_rgb(34_30_26/0.6)] motion-safe:animate-fade-up lg:h-[min(86svh,44rem)] lg:max-h-none lg:w-auto lg:max-w-[calc(100vw-3rem)] lg:flex-row"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-carbon/55 text-crema backdrop-blur transition-colors hover:bg-carbon lg:bg-crema/90 lg:text-carbon lg:hover:bg-carbon lg:hover:text-crema"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>

        {media.length > 0 ? (
          // Hueco con la forma del cartel (móvil: a todo el ancho, hasta media pantalla; escritorio:
          // columna a todo el alto), así se ve entero y sin bandas a los lados.
          <div
            className="group relative w-full shrink-0 overflow-hidden bg-carbon [aspect-ratio:var(--r)] max-h-[54svh] lg:h-full lg:max-h-none lg:w-auto"
            onMouseEnter={() => setEncima(true)}
            onMouseLeave={() => setEncima(false)}
          >
            <div
              ref={pista}
              onScroll={alDesplazar}
              onTouchStart={tocar}
              onPointerDown={tocar}
              className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {media.map((m, i) => (
                // El cartel ocupa todo el hueco; si otro cartel del carrusel tiene otra forma, el
                // sobrante se rellena con él mismo muy difuminado, no con un margen.
                <div
                  key={m.url}
                  className="relative isolate flex h-full w-full shrink-0 snap-center items-center justify-center overflow-hidden"
                  aria-hidden={i !== actual}
                >
                  {m.tipo === "video" ? (
                    <video src={m.url} muted playsInline loop autoPlay preload="metadata" className="h-full w-full object-contain" />
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element -- fondo difuminado del mismo cartel */}
                      <img src={m.url} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full scale-150 object-cover blur-3xl brightness-[0.6] saturate-150" />
                      <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgb(0_0_0/0.5))]" />
                      {/* eslint-disable-next-line @next/next/no-img-element -- fotos subidas desde el panel (Storage) */}
                      <img
                        src={m.url}
                        alt={i === 0 ? evento.titulo : `${evento.titulo}, cartel ${i + 1}`}
                        loading={i === 0 ? "eager" : "lazy"}
                        draggable={false}
                        className="h-full w-full select-none object-contain motion-safe:animate-[cartel-in_0.9s_cubic-bezier(0.16,1,0.3,1)_both]"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>

            {varios ? (
              <>
                <button
                  type="button"
                  onClick={() => ir(actual - 1)}
                  aria-label="Cartel anterior"
                  className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-crema/90 text-carbon shadow-card transition hover:bg-carbon hover:text-crema lg:grid"
                >
                  <Icon name="chevronLeft" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => ir(actual + 1)}
                  aria-label="Cartel siguiente"
                  className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-crema/90 text-carbon shadow-card transition hover:bg-carbon hover:text-crema lg:grid"
                >
                  <Icon name="chevronRight" className="h-5 w-5" />
                </button>
                <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-carbon/55 px-2.5 py-1 text-xs font-semibold tabular-nums text-crema backdrop-blur">
                  {actual + 1} / {media.length}
                </span>
                {/* Puntos con barra de progreso del turno automático. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center gap-1.5 bg-gradient-to-t from-carbon/55 to-transparent pb-3 pt-8">
                  {media.map((m, i) => (
                    <button
                      key={m.url}
                      type="button"
                      onClick={() => ir(i)}
                      aria-label={`Cartel ${i + 1} de ${media.length}`}
                      aria-current={i === actual}
                      className="pointer-events-auto relative h-1.5 w-1.5 overflow-hidden rounded-full bg-crema/50 aria-[current=true]:w-8 motion-safe:transition-all"
                    >
                      {i === actual ? (
                        <span
                          key={`${actual}-${auto}-${tocadoHasta}`}
                          className={`absolute inset-y-0 left-0 bg-crema ${auto && tocadoHasta <= Date.now() ? "w-0 motion-safe:animate-[llenar_var(--t)_linear_forwards] motion-reduce:w-full" : "w-full"}`}
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
        <div className="flex min-h-0 flex-1 flex-col lg:w-[26rem] lg:flex-none">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-4 [scrollbar-width:none] lg:[scrollbar-width:thin] lg:px-10 lg:pb-8 lg:pt-12">
            <p className="kicker flex items-center gap-2 text-brasa">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-brasa" />
              {evento.tipo ?? "Evento"} · Próximamente
            </p>
            <h2 id="aviso-evento-titulo" className="mt-2 font-display text-[1.6rem] leading-tight lg:mt-4 lg:pr-8 lg:text-[2.4rem]">
              {evento.titulo}
            </h2>

            <ul className="mt-3 grid gap-1.5 text-[0.95rem] lg:mt-6 lg:gap-2.5">
              <li className="flex items-center gap-2.5">
                <Icon name="calendar" className="h-4 w-4 shrink-0 text-brasa" />
                <span className="font-semibold first-letter:uppercase">{cuando}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="pin" className="h-4 w-4 shrink-0 text-brasa" />
                La Ofi · Edificio 502
              </li>
              {precio ? (
                <li className="flex items-center gap-2.5">
                  <Icon name="tag" className="h-4 w-4 shrink-0 text-brasa" />
                  {precio}
                </li>
              ) : null}
            </ul>

            {/* Descripción, programa y cuenta atrás, solo en escritorio: en el móvil están en «Ver el evento». */}
            {evento.descripcion ? (
              <p className="mt-6 hidden text-[0.95rem] leading-relaxed text-carbon-muted lg:block">{evento.descripcion}</p>
            ) : null}

            {evento.programa.length > 0 ? (
              <div className="mt-6 hidden border-t border-tinta-line pt-5 lg:block">
                <p className="mb-4 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">Programa</p>
                <ProgramaEvento programa={evento.programa} compacto />
              </div>
            ) : null}
            <div className="mt-6 hidden border-t border-tinta-line pt-5 lg:block">
              <p className="mb-2 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">Faltan</p>
              <Countdown fechaISO={evento.fecha} hora={hora} claro />
            </div>
          </div>

          <div className="grid shrink-0 gap-2 border-t border-tinta-line bg-papel-2/60 px-5 pb-4 pt-3 lg:px-10 lg:pb-7 lg:pt-5">
            <div className="grid grid-cols-2 gap-2.5">
              {evento.reservable ? (
                <Link href={reservarHref} onClick={onClose} className="btn-primary w-full px-3">
                  <Icon name="users" className="h-4 w-4" />
                  Apuntarme
                </Link>
              ) : null}
              <Link href={verHref} onClick={onClose} className={`btn-secondary w-full px-3 ${evento.reservable ? "" : "col-span-2"}`}>
                <span className="whitespace-nowrap">Ver el evento</span>
                <Icon name="arrow" className="hidden h-4 w-4 sm:block" />
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
