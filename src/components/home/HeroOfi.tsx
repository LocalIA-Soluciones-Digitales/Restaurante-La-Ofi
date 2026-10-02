"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Photo } from "@/components/media/Photo";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import type { EstadoAhora as Estado, Semana } from "@/lib/horario";
import { MOMENTOS_HERO } from "@/lib/home-content";
import { IMAGES } from "@/lib/images";
import { franjaDelDia, type Franja } from "@/lib/media";

interface Props {
  franjaInicial: Franja;
  estadoInicial: Estado;
  semana: Semana;
  links: { carta: string; reservar: string; menu: string };
  labels: { verCarta: string; reservar: string };
}

/**
 * Hero de la home: la comida real manda. En móvil la foto del plato abre la
 * pantalla y debajo va la marca; en escritorio, composición editorial plato +
 * espacio. La foto depende de la hora en Madrid (y se puede cambiar), el resto
 * no cambia: La Ofi es la misma por la mañana que por la tarde.
 */
export function HeroOfi({ franjaInicial, estadoInicial, semana, links, labels }: Props) {
  const [franja, setFranja] = useState<Franja>(franjaInicial);
  // Capas montadas: solo la inicial al cargar (nada compite con el LCP). Las
  // demás se montan al apuntar o enfocar su botón, así la foto ya está bajando
  // cuando se pulsa y el cambio es un fundido, no un hueco.
  const [montadas, setMontadas] = useState<Franja[]>([franjaInicial]);
  const precargar = (f: Franja) => setMontadas((m) => (m.includes(f) ? m : [...m, f]));

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
  const credito = principal.kind === "tercero" ? ` · Foto: ${principal.credit}` : "";

  return (
    <section aria-labelledby="hero-title" className="relative bg-crema pt-16 lg:pt-[4.5rem]">
      <div className="lg:container-wide lg:grid lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-12 lg:items-center lg:gap-10 lg:py-8">
        {/* Fotos */}
        <div className="relative lg:order-2 lg:col-span-7 lg:h-full lg:min-h-[34rem]">
          <figure className="relative">
            <div className="relative aspect-[4/5] max-h-[64svh] w-full overflow-hidden bg-papel-3 sm:aspect-[16/11] sm:max-h-none lg:aspect-auto lg:h-[min(calc(100svh-8rem),52rem)] lg:rounded-sm">
              {MOMENTOS_HERO.filter((m) => montadas.includes(m.franja)).map((m) => {
                const activa = m.franja === franja;
                return (
                  <div
                    key={m.franja}
                    aria-hidden={!activa}
                    className={`absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none ${activa ? "z-10 opacity-100" : "z-0 opacity-0"}`}
                  >
                    <Photo
                      img={m.principal}
                      sizes="(min-width: 1024px) 58vw, 100vw"
                      priority={m.franja === franjaInicial}
                      decorative={!activa}
                      imgClassName="motion-safe:animate-kenburns"
                    />
                  </div>
                );
              })}
            </div>
            <figcaption className="container-wide flex items-baseline justify-between gap-4 pt-3 text-xs text-carbon-muted lg:px-0">
              <span>
                {actual.pie}
                {credito}
              </span>
            </figcaption>

            {/* Foto del espacio, solo en pantallas grandes: el sitio, junto al plato. */}
            <div className="absolute -left-6 bottom-[22%] z-20 hidden w-[30%] xl:block">
              <div className="relative aspect-[4/3] overflow-hidden border-[6px] border-crema bg-papel-3">
                {MOMENTOS_HERO.filter((m) => montadas.includes(m.franja)).map((m) => (
                  <div
                    key={m.franja}
                    className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${m.franja === franja ? "opacity-100" : "opacity-0"}`}
                  >
                    <Photo img={m.detalle} sizes="20vw" decorative mobileBelow={0} />
                  </div>
                ))}
              </div>
            </div>
          </figure>
        </div>

        {/* Texto */}
        <div className="container-wide pb-12 pt-6 lg:order-1 lg:col-span-5 lg:px-0 lg:pb-0 lg:pt-0">
          <h1 id="hero-title">
            <span className="kicker block text-brasa">
              La Ofi <span aria-hidden="true">·</span> Restaurante en Derio
            </span>
            <span className="mt-1 block text-sm text-carbon-muted">Parque Tecnológico de Bizkaia · Edificio 502</span>
            <span className="t-display mt-5 block text-carbon lg:mt-7">
              Desayunar. Comer. <em className="text-brasa">Quedarse un poco más.</em>
            </span>
          </h1>

          <p key={franja} className="lead mt-5 motion-safe:animate-fade-up">
            {actual.nota}
          </p>

          <EstadoAhora semana={semana} inicial={estadoInicial} className="mt-5 text-carbon" />

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={links.carta} className="btn-dark">
              {labels.verCarta}
            </Link>
            <Link href={links.reservar} className="btn-primary">
              {labels.reservar}
            </Link>
            <Link href={links.menu} className="link-arrow ml-1 min-h-11">
              Menú de hoy
            </Link>
          </div>

          <div role="group" aria-label="Un día en La Ofi: elige el momento" className="mt-10 flex items-center gap-6 border-t border-tinta-line pt-4">
            {MOMENTOS_HERO.map((m) => (
              <button
                key={m.franja}
                type="button"
                aria-pressed={franja === m.franja}
                onClick={() => elegir(m.franja)}
                onPointerEnter={() => precargar(m.franja)}
                onFocus={() => precargar(m.franja)}
                className="relative min-h-11 text-sm font-medium text-carbon-muted transition-colors hover:text-carbon aria-pressed:text-carbon after:absolute after:inset-x-0 after:-top-[17px] after:h-0.5 after:scale-x-0 after:bg-brasa after:transition-transform aria-pressed:after:scale-x-100"
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
