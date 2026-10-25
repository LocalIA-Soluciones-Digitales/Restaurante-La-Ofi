"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Photo } from "@/components/media/Photo";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import type { EstadoAhora as Estado, Semana } from "@/lib/horario";
import { MOMENTOS_HERO } from "@/lib/home-content";
import { creditoFoto, IMAGES } from "@/lib/images";
import { creditoVideo, franjaDelDia, type Franja } from "@/lib/media";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

interface Props {
  franjaInicial: Franja;
  estadoInicial: Estado;
  semana: Semana;
  links: { carta: string; reservar: string; menu: string };
  labels: { verCarta: string; reservar: string };
}

/** Palabra cuyas letras suben una a una tras una máscara (CSS .char-up). */
function Letras({ texto, desde, className = "" }: { texto: string; desde: number; className?: string }) {
  return (
    <span aria-hidden="true" className={`block overflow-hidden pb-[0.06em] ${className}`}>
      {[...texto].map((c, i) => (
        <span key={i} className="char-up inline-block" style={d(desde + i * 0.035)}>
          {c}
        </span>
      ))}
    </span>
  );
}

/**
 * Hero a pantalla completa con el vídeo del momento del día y el titular
 * centrado, letra a letra. Al hacer scroll el vídeo se recoge en una tarjeta con
 * esquinas redondeadas (clip-path ligado al scroll) y el texto se retira.
 */
export function HeroOfi({ franjaInicial, estadoInicial, semana, links, labels }: Props) {
  const [franja, setFranja] = useState<Franja>(franjaInicial);
  const [conVideo, setConVideo] = useState(false);
  useEffect(() => setConVideo(window.matchMedia("(min-width: 1024px)").matches), []);
  useEffect(() => setFranja(franjaDelDia()), []);

  const actual = MOMENTOS_HERO.find((m) => m.franja === franja) ?? MOMENTOS_HERO[0]!;
  const principal = IMAGES[actual.principal];
  const credito = (actual.video && conVideo ? creditoVideo(actual.video) : null) ?? creditoFoto(principal);
  const pie = principal.kind === "ilustrativa" ? credito : [actual.pie, credito].filter(Boolean).join(" · ");

  return (
    <section aria-labelledby="hero-title" data-header="light" className="relative isolate min-h-[100svh] bg-crema">
      <div className="hero-frame absolute inset-0 overflow-hidden bg-noche">
        <div className="hero-zoom absolute inset-0">
          <div key={actual.franja} aria-hidden="true" className="hero-img-in absolute inset-0">
            <Photo img={actual.principal} sizes="100vw" priority={actual.franja === franjaInicial} decorative quality={80} />
            {actual.video && conVideo ? (
              <div className="absolute inset-0">
                <AmbientVideo video={actual.video} threshold={0.01} showPoster={false} afterLoadMs={1200} revealOnPlay />
              </div>
            ) : null}
          </div>
        </div>
        <span aria-hidden="true" className="absolute inset-0 bg-noche/45" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-noche/80 to-transparent" />
      </div>

      <div className="hero-out relative flex min-h-[100svh] flex-col items-center justify-center px-5 pb-28 pt-28 text-center text-crema">
        <p className="kicker intro-up text-ratan" style={d(1.5)}>
          Parque Tecnológico de Bizkaia · Derio
        </p>
        <h1 id="hero-title" className="mt-6 font-display text-[clamp(3.2rem,1.4rem+7vw,8.5rem)] font-light leading-[0.92] tracking-[-0.035em]">
          <span className="sr-only">La Ofi, restaurante en Derio. Desayunar, comer, quedarse.</span>
          <Letras texto="Desayunar." desde={1.55} />
          <Letras texto="Comer." desde={1.85} />
          <Letras texto="Quedarse." desde={2.05} className="italic text-ratan" />
        </h1>
        <div className="intro-up mt-10 flex flex-col items-center gap-5" style={d(2.5)}>
          <EstadoAhora semana={semana} inicial={estadoInicial} tone="light" className="rounded-full border border-crema/25 bg-noche/40 px-3.5 py-1.5 text-crema backdrop-blur-md" />
          <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
            <Link href={links.reservar} className="group inline-flex min-h-14 items-center gap-3 rounded-full bg-crema px-8 font-display text-lg text-carbon transition-[background-color,transform] duration-300 ease-out-expo hover:bg-white active:scale-[0.98]">
              {labels.reservar}
              <span className="grid h-8 w-8 place-items-center rounded-full bg-carbon text-crema transition-transform duration-300 ease-out-expo group-hover:translate-x-1">
                <Icon name="arrow" className="h-4 w-4" />
              </span>
            </Link>
            <Link href={links.menu} className="link-arrow text-crema decoration-crema/40 hover:decoration-crema">
              Menú de hoy
            </Link>
            <Link href={links.carta} className="link-arrow text-crema decoration-crema/40 hover:decoration-crema">
              {labels.verCarta}
            </Link>
          </div>
        </div>

        <div className="absolute inset-x-5 bottom-6 flex items-end justify-between gap-6 text-left sm:inset-x-8">
          <span aria-hidden="true" className="intro-up hidden items-center gap-3 text-[0.68rem] uppercase tracking-[0.2em] text-crema/70 sm:flex" style={d(2.8)}>
            <span className="relative block h-10 w-px overflow-hidden bg-crema/25">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-crema scroll-line" />
            </span>
            Desliza
          </span>
          {pie ? <p className="max-w-[26rem] text-right text-[0.66rem] leading-snug text-crema/65">{pie}</p> : null}
        </div>
      </div>
    </section>
  );
}
