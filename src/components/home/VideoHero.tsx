"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { WordReveal } from "@/components/motion/WordReveal";
import { Icon } from "@/components/ui/Icon";
import { estadoAhora, type EstadoAhora, type Semana } from "@/lib/horario";
import { IMAGES } from "@/lib/images";
import { franjaDelDia, HERO_ESCENAS, type Franja } from "@/lib/media";

const ORDEN: { franja: Franja; label: string; icon: "sunrise" | "sun" | "moon" }[] = [
  { franja: "manana", label: "Mañana", icon: "sunrise" },
  { franja: "mediodia", label: "Mediodía", icon: "sun" },
  { franja: "noche", label: "Tarde-noche", icon: "moon" },
];

interface Props {
  franjaInicial: Franja;
  estadoInicial: EstadoAhora;
  semana: Semana;
  links: { carta: string; pedir: string; reservar: string };
  labels: { verCarta: string; pedir: string; reservar: string };
}

/**
 * Hero "Un día en La Ofi". La escena (vídeo real o, mientras no exista, foto real
 * con Ken Burns + ambiente generado) depende de la hora en Madrid. El servidor
 * pinta la franja del momento de generación (ISR); en cliente se corrige si la
 * página llegó cacheada de otra franja, y el visitante puede cambiarla.
 * El LCP es siempre la imagen (priority), nunca el vídeo.
 */
export function VideoHero({ franjaInicial, estadoInicial, semana, links, labels }: Props) {
  const [franja, setFranja] = useState<Franja>(franjaInicial);
  const [estado, setEstado] = useState<EstadoAhora>(estadoInicial);

  useEffect(() => {
    const real = franjaDelDia();
    if (real !== franjaInicial) setFranja(real);
    const update = () => setEstado(estadoAhora(semana));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [franjaInicial, semana]);

  const escena = HERO_ESCENAS[franja];
  const imagen = IMAGES[escena.imagen];
  const noche = escena.noche;

  return (
    <section
      aria-labelledby="hero-title"
      data-header="light"
      className={`grain relative isolate flex min-h-[100svh] items-end overflow-hidden ${noche ? "bg-noche" : "bg-carbon"} text-crema`}
    >
      {/* Fondo: cada escena es una capa permanente; solo cambia la opacidad. */}
      {ORDEN.map(({ franja: f }) => {
        const e = HERO_ESCENAS[f];
        const img = IMAGES[e.imagen];
        const activa = f === franja;
        // Solo la escena inicial entra en el HTML con prioridad; las demás se
        // montan cuando el visitante las elige.
        if (!activa && f !== franjaInicial) return null;
        return (
          <div
            key={f}
            aria-hidden={!activa}
            className={`absolute inset-0 -z-10 transition-opacity duration-1000 ease-out ${activa ? "opacity-100" : "opacity-0"}`}
          >
            {e.video ? (
              <AmbientVideo video={e.video} threshold={0.01} />
            ) : (
              <Image
                src={img.src}
                alt={activa ? img.alt : ""}
                fill
                priority={f === franjaInicial}
                sizes="100vw"
                className="animate-kenburns object-cover"
              />
            )}
            {e.ambiente && !e.video ? (
              <div className={`absolute inset-0 ${e.noche ? "opacity-45 mix-blend-screen" : "opacity-35 mix-blend-soft-light"}`}>
                <AmbientVideo video={e.ambiente} threshold={0.01} showPoster={false} afterLoadMs={1500} />
              </div>
            ) : null}
          </div>
        );
      })}
      <div
        aria-hidden="true"
        className={`absolute inset-0 -z-10 ${
          noche
            ? "bg-gradient-to-t from-noche via-noche/55 to-noche/25"
            : "bg-gradient-to-t from-carbon/90 via-carbon/35 to-carbon/10"
        }`}
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-carbon/50 via-transparent to-transparent" />

      <div className="container-page relative w-full pb-16 pt-36 sm:pb-20">
        <div className="flex flex-wrap items-center gap-3">
          <p className="eyebrow text-crema/80">{escena.eyebrow}</p>
          <span aria-hidden="true" className="h-px w-8 bg-crema/40" />
          <p className="eyebrow text-crema/80">Derio · Parque Tecnológico</p>
        </div>

        <h1 id="hero-title" className="mt-5" key={franja}>
          <WordReveal
            lines={escena.titulo}
            nowrapLines
            className="display-xl block"
            wordClassName={noche ? "neon-text" : ""}
            delayMs={150}
          />
        </h1>

        <p className="mt-6 max-w-lg text-lg leading-relaxed text-crema/85 animate-fade-up [animation-delay:600ms]">
          {escena.lead}
        </p>

        <p
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-crema/20 bg-carbon/30 px-4 py-2 text-sm font-medium backdrop-blur-md"
          aria-live="polite"
        >
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${
              estado.abierto === true ? "bg-[#7BE0A3] shadow-[0_0_10px_#7BE0A3]" : estado.abierto === false ? "bg-terracota-soft" : "bg-crema/50"
            }`}
          />
          {estado.texto}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={links.carta} className={noche ? "btn-neon" : "btn-light"}>
            {labels.verCarta}
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
          <Link href={links.pedir} className="btn-ghost-light">
            <Icon name="bag" className="h-4 w-4" />
            {labels.pedir}
          </Link>
          <Link href={links.reservar} className="btn-ghost-light">
            <Icon name="calendar" className="h-4 w-4" />
            {labels.reservar}
          </Link>
        </div>

        <div className="mt-12 flex flex-wrap items-end justify-between gap-6">
          <div role="group" aria-label="Un día en La Ofi: elige el momento" className="flex gap-1 rounded-full border border-crema/15 bg-carbon/30 p-1 backdrop-blur-md">
            {ORDEN.map((o) => (
              <button
                key={o.franja}
                type="button"
                aria-pressed={franja === o.franja}
                onClick={() => setFranja(o.franja)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium text-crema/75 transition-colors hover:text-crema aria-pressed:bg-crema aria-pressed:text-carbon"
              >
                <Icon name={o.icon} className="h-4 w-4" />
                {o.label}
              </button>
            ))}
          </div>
          <p className="hidden text-xs text-crema/60 sm:block">
            {imagen.kind === "tercero" ? `Foto: ${imagen.credit}` : null}
          </p>
        </div>
      </div>

      <div aria-hidden="true" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-crema/60 motion-safe:animate-scroll-cue lg:block">
        <Icon name="chevronDown" />
      </div>
    </section>
  );
}
