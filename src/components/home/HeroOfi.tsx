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
 * Hero partido: la foto del momento del día a la izquierda y, a la derecha, un
 * panel oscuro con el titular grande (la última palabra calada) y una sola
 * acción principal. Al cargar, una cortina color brasa se retira y destapa la
 * foto, que se posa desde un ligero zoom; las líneas suben tras una máscara.
 * Con "reducir movimiento" todo aparece ya en su sitio.
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
    <section aria-labelledby="hero-title" data-header="light" className="relative isolate grid min-h-[100svh] bg-noche text-crema lg:grid-cols-12">
      {/* Foto: cortina de entrada + zoom ligado al scroll */}
      <div className="relative h-[56svh] overflow-hidden lg:col-span-7 lg:h-auto">
        <div className="hero-zoom absolute inset-0">
          <div key={actual.franja} aria-hidden="true" className="hero-img-in absolute inset-0">
            <Photo img={actual.principal} sizes="(min-width: 1024px) 58vw, 100vw" priority={actual.franja === franjaInicial} decorative quality={80} />
            {actual.video && conVideo ? (
              <div className="absolute inset-0">
                <AmbientVideo video={actual.video} threshold={0.01} showPoster={false} afterLoadMs={1500} revealOnPlay />
              </div>
            ) : null}
          </div>
        </div>
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-noche/60 to-transparent" />
        <span aria-hidden="true" className="hero-curtain absolute inset-0 bg-brasa" />
        {pie ? <p className="absolute bottom-4 left-4 right-4 text-[0.66rem] leading-snug text-crema/75 sm:left-6">{pie}</p> : null}
      </div>

      {/* Panel de texto */}
      <div className="hero-out relative flex flex-col justify-end px-5 pb-10 pt-10 sm:px-8 lg:col-span-5 lg:px-12 lg:pb-12 lg:pt-28 xl:px-16">
        <div>
          <p className="kicker intro-up text-ratan" style={d(0.55)}>
            Parque Tecnológico de Bizkaia
          </p>
          <h1 id="hero-title" className="mt-5 font-display text-[clamp(3.1rem,1.6rem+4.6vw,6rem)] font-light leading-[0.95] tracking-[-0.03em]">
            <span className="sr-only">La Ofi, restaurante en Derio: </span>
            <span className="line-mask" style={d(0.65)}>
              <span>Desayunar.</span>
            </span>
            <span className="line-mask" style={d(0.78)}>
              <span>Comer.</span>
            </span>
            <span className="line-mask" style={d(0.91)}>
              <span className="italic text-transparent [-webkit-text-stroke:1.2px_theme(colors.ratan)]">Quedarse.</span>
            </span>
          </h1>
          <p className="intro-up mt-6 max-w-[26rem] text-[1.02rem] leading-relaxed text-crema/75" style={d(1.1)}>
            Del primer café a la última copa, en el edificio 502 del Parque.
          </p>
          <div className="intro-up" style={d(1.2)}>
            <EstadoAhora
              semana={semana}
              inicial={estadoInicial}
              tone="light"
              className="mt-6 rounded-full border border-crema/20 bg-noche-3/60 px-3.5 py-1.5 text-crema"
            />
          </div>
          <div className="intro-up mt-9 flex flex-wrap items-center gap-x-7 gap-y-4" style={d(1.3)}>
            <Link href={links.reservar} className="group inline-flex min-h-14 items-center gap-3 bg-crema px-7 font-display text-lg text-carbon transition-colors duration-300 hover:bg-white">
              {labels.reservar}
              <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />
            </Link>
            <Link href={links.menu} className="link-arrow text-crema decoration-crema/40 hover:decoration-crema">
              Menú de hoy
            </Link>
            <Link href={links.carta} className="link-arrow text-crema decoration-crema/40 hover:decoration-crema">
              {labels.verCarta}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
