"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Photo } from "@/components/media/Photo";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import type { EstadoAhora as Estado, Semana } from "@/lib/horario";
import { MOMENTOS_HERO } from "@/lib/home-content";
import { creditoFoto, IMAGES } from "@/lib/images";
import { creditoVideo, franjaDelDia, type Franja } from "@/lib/media";

interface Props {
  franjaInicial: Franja;
  estadoInicial: Estado;
  semana: Semana;
  links: { carta: string; reservar: string; menu: string };
  labels: { verCarta: string; reservar: string };
}

/**
 * Hero de la home. Texto a la izquierda alineado con la rejilla; a la derecha, la
 * comida a sangre hasta el borde de la pantalla y a toda altura. Cada momento del
 * día tiene foto nítida (LCP) y un vídeo que aparece encima con un fundido cuando
 * arranca; con "reducir movimiento" o ahorro de datos se queda la foto.
 * En móvil la foto abre la pantalla y debajo va la marca.
 */
export function HeroOfi({ franjaInicial, estadoInicial, semana, links, labels }: Props) {
  const [franja, setFranja] = useState<Franja>(franjaInicial);
  // Solo la capa inicial al cargar (nada compite con el LCP); las demás se montan
  // al apuntar o enfocar su botón, para que el cambio sea un fundido.
  const [montadas, setMontadas] = useState<Franja[]>([franjaInicial]);
  const precargar = (f: Franja) => setMontadas((m) => (m.includes(f) ? m : [...m, f]));
  // Vídeo del hero solo en escritorio: en móvil la foto nítida carga antes y no gasta datos.
  const [conVideo, setConVideo] = useState(false);
  useEffect(() => setConVideo(window.matchMedia("(min-width: 1024px)").matches), []);

  useEffect(() => {
    const real = franjaDelDia();
    if (real !== franjaInicial) {
      setFranja(real);
      setMontadas((m) => (m.includes(real) ? m : [...m, real]));
    }
  }, [franjaInicial]);

  const elegir = (f: Franja) => {
    precargar(f);
    setFranja(f);
  };

  const actual = MOMENTOS_HERO.find((m) => m.franja === franja) ?? MOMENTOS_HERO[0]!;
  const principal = IMAGES[actual.principal];
  const credito = (actual.video && conVideo ? creditoVideo(actual.video) : null) ?? creditoFoto(principal);
  const pie = principal.kind === "ilustrativa" ? credito : [actual.pie, credito].filter(Boolean).join(" · ");
  const capas = MOMENTOS_HERO.filter((m) => montadas.includes(m.franja));

  return (
    <section aria-labelledby="hero-title" className="relative bg-crema">
      <div className="lg:grid lg:min-h-[100svh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* Comida a sangre */}
        <div className="relative pt-16 lg:order-2 lg:pt-[4.5rem]">
          <figure className="relative h-full">
            <div className="relative aspect-[4/5] max-h-[70svh] w-full overflow-hidden bg-carbon sm:aspect-[16/11] sm:max-h-none lg:aspect-auto lg:h-full lg:min-h-[38rem]">
              {capas.map((m) => {
                const activa = m.franja === franja;
                return (
                  <div
                    key={m.franja}
                    aria-hidden={!activa}
                    className={`absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none ${activa ? "z-10 opacity-100" : "z-0 opacity-0"}`}
                  >
                    <Photo
                      img={m.principal}
                      sizes="(min-width: 1024px) 54vw, 100vw"
                      priority={m.franja === franjaInicial}
                      decorative={!activa}
                      quality={80}
                    />
                    {/* El vídeo solo en la capa activa: un único vídeo descargándose. */}
                    {m.video && activa && conVideo ? (
                      <div className="absolute inset-0">
                        <AmbientVideo video={m.video} threshold={0.01} showPoster={false} afterLoadMs={1500} revealOnPlay />
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-carbon/45 to-transparent" />
              <figcaption className="absolute bottom-3 left-4 right-4 z-30 text-[0.7rem] text-crema/85 sm:left-6 lg:bottom-5 lg:left-8">
                {pie}
              </figcaption>
            </div>

            {/* El sitio, junto al plato: foto del espacio superpuesta en escritorio. */}
            <div className="absolute -left-14 bottom-14 z-30 hidden w-[30%] max-w-[18rem] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.55)] xl:block">
              <div className="relative aspect-[4/3] overflow-hidden border-[6px] border-crema bg-papel-3">
                {capas.map((m) => (
                  <div
                    key={m.franja}
                    className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${m.franja === franja ? "opacity-100" : "opacity-0"}`}
                  >
                    <Photo img={m.detalle} sizes="18rem" decorative mobileBelow={0} />
                  </div>
                ))}
              </div>
            </div>
          </figure>
        </div>

        {/* Texto, alineado con el contenedor de la web */}
        <div className="flex flex-col justify-center px-4 pb-12 pt-7 sm:px-6 lg:order-1 lg:py-16 lg:pl-[max(2.5rem,calc((100vw-90rem)/2+2.5rem))] lg:pr-14 lg:pt-[calc(4.5rem+3rem)] xl:pr-20">
          <h1 id="hero-title">
            <span className="kicker block text-brasa">
              La Ofi <span aria-hidden="true">·</span> Restaurante en Derio
            </span>
            <span className="mt-1.5 block text-sm text-carbon-muted">Parque Tecnológico de Bizkaia · Edificio 502</span>
            <span className="t-display mt-6 block text-carbon lg:mt-8">
              Desayunar. Comer. <em className="text-brasa">Quedarse un poco más.</em>
            </span>
          </h1>

          <p key={franja} className="lead mt-5 motion-safe:animate-fade-up">
            {actual.nota}
          </p>

          <EstadoAhora semana={semana} inicial={estadoInicial} className="mt-5 text-carbon" />

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href={links.reservar} className="btn-primary px-6">
              {labels.reservar}
            </Link>
            <Link href={links.carta} className="btn-dark px-6">
              {labels.verCarta}
            </Link>
            <Link href={links.menu} className="link-arrow ml-1">
              Menú de hoy
            </Link>
          </div>

          <div role="group" aria-label="Un día en La Ofi: elige el momento" className="mt-12 flex items-center gap-7 border-t border-tinta-line pt-4">
            {MOMENTOS_HERO.map((m) => (
              <button
                key={m.franja}
                type="button"
                aria-pressed={franja === m.franja}
                onClick={() => elegir(m.franja)}
                onPointerEnter={() => precargar(m.franja)}
                onFocus={() => precargar(m.franja)}
                className="relative min-h-11 text-sm font-medium text-carbon-muted transition-colors after:absolute after:inset-x-0 after:-top-[17px] after:h-0.5 after:scale-x-0 after:bg-brasa after:transition-transform hover:text-carbon aria-pressed:text-carbon aria-pressed:after:scale-x-100"
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
