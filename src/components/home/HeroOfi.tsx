"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Photo } from "@/components/media/Photo";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon, type IconName } from "@/components/ui/Icon";
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

// Datos verificados (los mismos de CONFIANZA en home-content, RESEARCH.md §5–7).
const PRUEBAS: { icon: IconName; fuerte: string; texto: string }[] = [
  { icon: "star", fuerte: "4,4", texto: "en Google" },
  { icon: "car", fuerte: "220", texto: "plazas de parking" },
  { icon: "sunset", fuerte: "Terraza", texto: "cubierta" },
  { icon: "accessible", fuerte: "Local", texto: "accesible" },
];

/**
 * Hero de la home a pantalla completa: la comida a sangre de borde a borde y el
 * texto encima, sobre un degradado que garantiza contraste (la cabecera pasa a
 * claro con data-header="light"). Cada momento del día tiene foto nítida (LCP) y
 * un vídeo que aparece encima con un fundido cuando arranca; con "reducir
 * movimiento" o ahorro de datos se queda la foto. En móvil, recorte vertical.
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
  const capas = MOMENTOS_HERO.filter((m) => montadas.includes(m.franja));

  return (
    <section aria-labelledby="hero-title" data-header="light" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-noche text-crema">
      {/* Comida a sangre */}
      <div className="absolute inset-0 -z-10">
        {capas.map((m) => {
          const activa = m.franja === franja;
          return (
            <div
              key={m.franja}
              aria-hidden="true"
              className={`absolute inset-0 transition-opacity duration-1000 ease-out motion-reduce:transition-none ${activa ? "z-10 opacity-100" : "z-0 opacity-0"}`}
            >
              <div className={`absolute inset-0 ${activa ? "motion-safe:animate-kenburns" : ""}`}>
                <Photo img={m.principal} sizes="100vw" priority={m.franja === franjaInicial} decorative quality={80} />
                {/* El vídeo solo en la capa activa: un único vídeo descargándose. */}
                {m.video && activa && conVideo ? (
                  <div className="absolute inset-0">
                    <AmbientVideo video={m.video} threshold={0.01} showPoster={false} afterLoadMs={1500} revealOnPlay />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        {/* Contraste: lectura a la izquierda y abajo, cabecera arriba; el plato respira a la derecha. */}
        <div aria-hidden="true" className="absolute inset-0 z-20 bg-gradient-to-t from-noche via-noche/70 to-noche/40 lg:bg-gradient-to-r lg:from-noche/90 lg:via-noche/50 lg:to-noche/0" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-20 hidden h-2/5 bg-gradient-to-t from-noche/85 to-transparent lg:block" />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-noche/60 to-transparent" />
      </div>

      <div className="container-wide flex flex-1 flex-col justify-end pb-6 pt-32 sm:pt-40 lg:pb-8">
        <div className="grid items-end gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7 xl:col-span-7">
            <h1 id="hero-title">
              <span className="kicker flex items-center gap-3 text-ratan">
                <span aria-hidden="true" className="h-px w-8 bg-ratan/70" />
                La Ofi <span aria-hidden="true">·</span> Restaurante en Derio
              </span>
              <span className="mt-2 block text-sm text-crema/75">Parque Tecnológico de Bizkaia · Edificio 502</span>
              <span className="mt-6 block font-display text-[clamp(2.7rem,1.3rem+4.6vw,6.25rem)] font-normal leading-[0.96] tracking-[-0.03em] text-crema lg:mt-8">
                Desayunar. Comer.
                <em className="block text-ratan">Quedarse un poco más.</em>
              </span>
            </h1>

            <p key={franja} className="mt-6 max-w-[34rem] text-[1.0625rem] leading-relaxed text-crema/85 motion-safe:animate-fade-up sm:text-lg">
              {actual.nota}
            </p>

            <EstadoAhora
              semana={semana}
              inicial={estadoInicial}
              tone="light"
              className="mt-6 rounded-full border border-crema/20 bg-noche/40 px-3.5 py-1.5 text-crema backdrop-blur-md"
            />

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={links.reservar} className="btn-primary px-7">
                {labels.reservar}
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <Link href={links.carta} className="btn-ghost-light px-6 backdrop-blur-sm">
                {labels.verCarta}
              </Link>
              <Link href={links.menu} className="link-arrow ml-1 text-crema decoration-crema/40 hover:decoration-crema">
                Menú de hoy
              </Link>
            </div>
          </div>

          {/* Un día en La Ofi: elegir el momento cambia la foto, el vídeo y la nota. */}
          <div role="group" aria-label="Un día en La Ofi: elige el momento" className="lg:col-span-4 lg:col-start-9 lg:rounded-lg lg:border lg:border-crema/10 lg:bg-noche/55 lg:p-5 lg:pb-2 lg:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] lg:backdrop-blur-xl">
            <p className="kicker hidden text-crema/60 lg:block">Un día en La Ofi</p>
            <div className="grid grid-cols-3 gap-2 lg:mt-3 lg:grid-cols-1 lg:gap-0 lg:border-t lg:border-crema/10">
              {MOMENTOS_HERO.map((m, i) => {
                const activo = franja === m.franja;
                return (
                  <button
                    key={m.franja}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => elegir(m.franja)}
                    onPointerEnter={() => precargar(m.franja)}
                    onFocus={() => precargar(m.franja)}
                    className={`group relative flex min-h-11 items-center gap-4 rounded-md border px-3 py-2.5 text-left transition-colors duration-300 lg:rounded-none lg:border-x-0 lg:border-t-0 lg:border-b-crema/10 lg:last:border-b-0 lg:px-0 lg:py-3.5 ${
                      activo ? "border-crema/40 bg-crema/10 lg:bg-transparent" : "border-crema/15 bg-noche/30 hover:border-crema/30 lg:bg-transparent"
                    }`}
                  >
                    {/* Indicador del activo en escritorio */}
                    <span
                      aria-hidden="true"
                      className={`absolute -bottom-px left-0 hidden h-0.5 bg-brasa transition-[width] duration-500 ease-out-expo lg:block ${activo ? "w-full" : "w-0"}`}
                    />
                    <span className="relative hidden h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-noche-3 lg:block">
                      <Photo img={m.principal} sizes="3.5rem" decorative mobileBelow={0} quality={60} />
                      <span aria-hidden="true" className={`absolute inset-0 bg-noche/45 transition-opacity duration-300 ${activo ? "opacity-0" : "opacity-100 group-hover:opacity-30"}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span aria-hidden="true" className="hidden text-[0.7rem] tabular-nums text-crema/50 lg:inline">
                          0{i + 1}
                        </span>
                        <span className={`font-display text-[1.05rem] leading-tight transition-colors sm:text-lg lg:text-xl ${activo ? "text-crema" : "text-crema/70 group-hover:text-crema"}`}>
                          {m.label}
                        </span>
                      </span>
                      <span className={`mt-0.5 hidden text-xs transition-colors sm:block ${activo ? "text-crema/80" : "text-crema/50"}`}>{m.sub}</span>
                    </span>
                    <Icon
                      name="arrow"
                      className={`hidden h-4 w-4 shrink-0 transition-[opacity,transform] duration-300 lg:block ${activo ? "translate-x-0 text-ratan opacity-100" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60"}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Franja inferior: datos de confianza y pie de la foto */}
        <div className="mt-10 flex flex-col gap-4 border-t border-crema/15 pt-5 lg:mt-14 lg:flex-row lg:items-center lg:justify-between">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:flex sm:flex-wrap sm:gap-x-8">
            {PRUEBAS.map((p) => (
              <li key={p.texto} className="flex items-center gap-2 text-sm text-crema/75">
                <Icon name={p.icon} className="h-4 w-4 shrink-0 text-ratan" />
                <span>
                  <strong className="font-semibold text-crema">{p.fuerte}</strong> {p.texto}
                </span>
              </li>
            ))}
          </ul>
          <p className="max-w-[34rem] text-[0.7rem] leading-snug text-crema/60 lg:text-right">
            {principal.kind === "ilustrativa" ? credito : [actual.pie, credito].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </section>
  );
}
