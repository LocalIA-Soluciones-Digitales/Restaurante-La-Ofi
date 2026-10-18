"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Photo } from "@/components/media/Photo";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Wordmark";
import type { EstadoAhora as Estado, Semana } from "@/lib/horario";
import { MOMENTOS_HERO } from "@/lib/home-content";
import { creditoFoto, IMAGES } from "@/lib/images";
import { creditoVideo, franjaDelDia, type Franja } from "@/lib/media";

/** Retardo de entrada de cada pieza del hero (CSS .line-mask / .intro-up). */
const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

interface Props {
  franjaInicial: Franja;
  estadoInicial: Estado;
  semana: Semana;
  links: { carta: string; reservar: string; menu: string };
  labels: { verCarta: string; reservar: string };
}

/**
 * Hero de la home: una sola imagen a pantalla completa (la del momento del día),
 * muy poco texto, un único botón de reservar y el rótulo "la ofi" a todo el ancho
 * abajo. Nada de paneles ni datos encima de la foto: esos viven en la sección
 * siguiente. Foto nítida (LCP) y, en escritorio, vídeo encima con fundido; con
 * "reducir movimiento" o ahorro de datos se queda la foto.
 */
export function HeroOfi({ franjaInicial, estadoInicial, semana, links, labels }: Props) {
  const [franja, setFranja] = useState<Franja>(franjaInicial);
  // Vídeo solo en escritorio: en móvil la foto nítida carga antes y no gasta datos.
  const [conVideo, setConVideo] = useState(false);
  useEffect(() => setConVideo(window.matchMedia("(min-width: 1024px)").matches), []);
  // La página se cachea: la franja real es la del reloj del visitante.
  useEffect(() => setFranja(franjaDelDia()), []);

  const actual = MOMENTOS_HERO.find((m) => m.franja === franja) ?? MOMENTOS_HERO[0]!;
  const principal = IMAGES[actual.principal];
  const credito = (actual.video && conVideo ? creditoVideo(actual.video) : null) ?? creditoFoto(principal);
  const pie = principal.kind === "ilustrativa" ? credito : [actual.pie, credito].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="hero-title" data-header="light" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-noche text-crema">
      <div className="absolute inset-0 -z-10">
        {/* Dos capas: el acercamiento lento (Ken Burns) y el zoom ligado al scroll. */}
        <div className="hero-zoom absolute inset-0">
          <div key={actual.franja} aria-hidden="true" className="absolute inset-0 motion-safe:animate-kenburns">
            <Photo img={actual.principal} sizes="100vw" priority={actual.franja === franjaInicial} decorative quality={80} />
            {actual.video && conVideo ? (
              <div className="absolute inset-0">
                <AmbientVideo video={actual.video} threshold={0.01} showPoster={false} afterLoadMs={1500} revealOnPlay />
              </div>
            ) : null}
          </div>
        </div>
        {/* Contraste solo donde hay texto: arriba (cabecera) y abajo (rótulo). */}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-noche/60 to-transparent" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-noche via-noche/70 to-noche/20 lg:via-noche/55 lg:to-noche/25" />
      </div>

      <div className="container-wide flex flex-1 flex-col justify-end pb-5 pt-28">
        <div className="hero-out flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-[clamp(1.6rem,1.1rem+1.6vw,2.6rem)] font-light leading-[1.08] tracking-[-0.015em]">
              <span className="line-mask" style={d(0.15)}>
                <span>Desayunar. Comer.</span>
              </span>
              <span className="line-mask" style={d(0.3)}>
                <span>
                  <em className="text-ratan">Quedarse un poco más.</em>
                </span>
              </span>
            </p>
            <div className="intro-up" style={d(0.6)}>
              <EstadoAhora
                semana={semana}
                inicial={estadoInicial}
                tone="light"
                className="mt-5 rounded-full border border-crema/20 bg-noche/40 px-3.5 py-1.5 text-crema backdrop-blur-md"
              />
            </div>
          </div>
          <div className="intro-up flex flex-wrap items-center gap-x-7 gap-y-4" style={d(0.75)}>
            <Link
              href={links.reservar}
              className="group inline-flex min-h-14 items-center gap-3 border border-crema/70 px-7 font-display text-xl transition-colors duration-300 hover:bg-crema hover:text-carbon"
            >
              {labels.reservar}
              <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href={links.menu} className="link-arrow text-crema decoration-crema/40 hover:decoration-crema">
              Menú de hoy
            </Link>
            <Link href={links.carta} className="link-arrow text-crema decoration-crema/40 hover:decoration-crema">
              {labels.verCarta}
            </Link>
          </div>
        </div>

        {/* El rótulo de neón a todo el ancho (limitado por la altura de la pantalla). */}
        <h1 id="hero-title" className="mt-10 lg:mt-12">
          <span className="sr-only">La Ofi, restaurante en Derio (Parque Tecnológico de Bizkaia)</span>
          <Wordmark
            draw
            strokeWidth={3.4}
            className="h-auto w-[min(100%,108svh)] text-[#f4f0ff] [filter:drop-shadow(0_0_6px_rgb(201_187_255/0.55))_drop-shadow(0_0_28px_rgb(142_124_240/0.35))]"
          />
        </h1>

        <div style={d(1.4)} className="intro-up mt-6 flex flex-col gap-2 border-t border-crema/15 pt-4 text-[0.7rem] leading-snug text-crema/60 sm:flex-row sm:justify-between sm:gap-6">
          <p className="kicker text-[0.64rem] text-crema/70">Parque Tecnológico de Bizkaia · Edificio 502 · Derio</p>
          {pie ? <p className="sm:text-right">{pie}</p> : null}
        </div>
      </div>
    </section>
  );
}
