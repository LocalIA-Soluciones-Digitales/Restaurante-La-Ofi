"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/layout/Logo";
import type { NavItem } from "@/components/layout/nav";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";

interface Props {
  homeHref: string;
  pedirHref: string;
  reservarHref: string;
  /** Todas las páginas (menú desplegable). */
  items: NavItem[];
  /** Casillas de la cabecera de escritorio. */
  primary: NavItem[];
  phoneHref: string;
  phoneDisplay: string;
  labels: { reservar: string; pedir: string; llamar: string; abrirMenu: string; cerrarMenu: string; comoLlegar: string };
  directionsHref: string;
}

/**
 * Cabecera en casillas separadas por filetes: menú y dirección a la izquierda,
 * logotipo centrado y, a la derecha, las dos páginas más buscadas y un bloque
 * sólido de "Reservar". Sobre el hero oscuro va transparente con texto claro.
 */
export function Header({ homeHref, pedirHref, reservarHref, items, primary, phoneHref, phoneDisplay, labels, directionsHref }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();
  // La home abre con hero oscuro: ya en el HTML del servidor la cabecera va en claro
  // (sin destello de texto oscuro sobre la foto); el efecto de abajo lo confirma.
  const [overHero, setOverHero] = useState(pathname === homeHref);
  const [open, setOpen] = useState(false);
  const lastY = useRef(0);

  // Fondo al despegarse del borde y se esconde al bajar leyendo; vuelve al subir.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 16);
      setHidden(y > 220 && y > lastY.current + 4 && !document.querySelector("[data-header-fixed]"));
      if (y < lastY.current - 4 || y <= 220) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sobre una cabecera de foto oscura (data-header="light") el texto va en claro.
  useEffect(() => {
    setOverHero(Boolean(document.querySelector('[data-header="light"]')));
  }, [pathname]);

  const light = overHero && !scrolled;

  const isActive = (itemHref: string) =>
    !itemHref.includes("#") && (itemHref === homeHref ? pathname === homeHref : pathname.startsWith(itemHref));

  const line = light ? "border-crema/20" : "border-tinta-line";
  const cell = `hidden h-full items-center border-l px-6 text-[0.72rem] font-semibold uppercase tracking-[0.2em] transition-colors lg:flex ${line} ${
    light ? "text-crema/90 hover:bg-crema/10 hover:text-crema" : "text-carbon/80 hover:bg-papel-2 hover:text-carbon"
  }`;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-[transform,background-color,border-color] duration-300 ease-out motion-reduce:transition-none ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled ? "bg-crema/95 backdrop-blur-md" : "bg-transparent"} ${line} ${light ? "text-crema" : "text-carbon"}`}
      >
        <div className="relative flex h-16 items-stretch lg:h-[4.5rem]">
          {/* Izquierda: menú + dirección y teléfono */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen(true)}
            className={`flex h-full items-center gap-3 border-r px-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] transition-colors sm:px-6 ${line} ${
              light ? "hover:bg-crema/10" : "hover:bg-papel-2"
            }`}
          >
            <Icon name="menu" className="h-5 w-5" />
            <span className="hidden sm:inline">Menú</span>
            <span className="sr-only">{labels.abrirMenu}</span>
          </button>
          <a
            href={directionsHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden flex-col justify-center border-r px-6 text-[0.78rem] leading-snug transition-colors xl:flex ${line} ${
              light ? "text-crema/85 hover:text-crema" : "text-carbon-muted hover:text-carbon"
            }`}
          >
            <span>Edificio 502 · Parque Tecnológico, Derio</span>
            <span className={light ? "text-crema/60" : "text-carbon-muted/80"}>{phoneDisplay}</span>
          </a>

          {/* Logotipo centrado */}
          <Link href={homeHref} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md">
            <Logo light={light} center />
          </Link>

          {/* Derecha: páginas clave + Reservar */}
          <nav aria-label="Principal" className="ml-auto flex h-full items-stretch">
            {primary.map((item) => (
              <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={`${cell} aria-[current=page]:underline aria-[current=page]:underline-offset-8`}>
                {item.label}
              </Link>
            ))}
            <a href={phoneHref} className={`grid h-full w-14 place-items-center border-l lg:hidden ${line}`}>
              <Icon name="phone" className="h-5 w-5" />
              <span className="sr-only">
                {labels.llamar} {phoneDisplay}
              </span>
            </a>
            <Link
              href={reservarHref}
              className={`hidden h-full items-center px-7 text-[0.72rem] font-semibold uppercase tracking-[0.2em] transition-colors sm:flex ${
                light ? "bg-crema text-carbon hover:bg-white" : "bg-carbon text-crema hover:bg-brasa"
              }`}
            >
              {labels.reservar}
            </Link>
          </nav>
        </div>
      </header>

      {open ? (
        <MenuPanel
          items={items}
          isActive={isActive}
          onClose={() => setOpen(false)}
          phoneHref={phoneHref}
          phoneDisplay={phoneDisplay}
          directionsHref={directionsHref}
          pedirHref={pedirHref}
          reservarHref={reservarHref}
          labels={labels}
        />
      ) : null}
    </>
  );
}

/** Menú a pantalla completa (móvil y escritorio): páginas en grande, acciones y, en escritorio, una foto del local. */
function MenuPanel({
  items,
  isActive,
  onClose,
  phoneHref,
  phoneDisplay,
  directionsHref,
  pedirHref,
  reservarHref,
  labels,
}: {
  items: NavItem[];
  isActive: (href: string) => boolean;
  onClose: () => void;
  phoneHref: string;
  phoneDisplay: string;
  directionsHref: string;
  pedirHref: string;
  reservarHref: string;
  labels: Props["labels"];
}) {
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  return (
    <div
      id="menu-movil"
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-crema motion-safe:animate-fade-up"
    >
      <div className="relative flex h-16 items-stretch border-b border-tinta-line lg:h-[4.5rem]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-full items-center gap-3 border-r border-tinta-line px-4 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-carbon hover:bg-papel-2 sm:px-6"
        >
          <Icon name="close" className="h-5 w-5" />
          <span className="hidden sm:inline">Cerrar</span>
          <span className="sr-only">{labels.cerrarMenu}</span>
        </button>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Logo center />
        </span>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Principal (menú)" className="flex-1 overflow-y-auto">
          <div className="container-wide max-w-3xl pb-28 pt-6 lg:mx-0 lg:px-16 lg:pt-12">
            <ul className="border-t border-tinta-line">
              {items.map((item, i) => (
                <li key={item.href} className="border-b border-tinta-line">
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="group flex min-h-14 items-baseline gap-5 py-3 text-carbon aria-[current=page]:text-brasa lg:py-4"
                  >
                    <span aria-hidden="true" className="w-6 text-xs tabular-nums text-carbon-muted">
                      0{i + 1}
                    </span>
                    <span className="flex-1 font-display text-[1.65rem] font-light leading-tight transition-colors group-hover:text-brasa lg:text-[2.1rem]">
                      {item.label}
                    </span>
                    <Icon name="arrow" className="h-5 w-5 self-center text-carbon/40 transition-transform group-hover:translate-x-1 group-hover:text-brasa" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:max-w-lg">
              <Link href={reservarHref} onClick={onClose} className="btn-dark">
                {labels.reservar}
              </Link>
              <Link href={pedirHref} onClick={onClose} className="btn-secondary">
                <Icon name="bag" className="h-4 w-4" />
                {labels.pedir}
              </Link>
              <a href={phoneHref} className="btn-secondary">
                <Icon name="phone" className="h-4 w-4" />
                {phoneDisplay}
              </a>
              <a href={directionsHref} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <Icon name="pin" className="h-4 w-4" />
                {labels.comoLlegar}
              </a>
              <Link
                href="/admin/login"
                prefetch={false}
                onClick={onClose}
                className="col-span-2 mt-2 inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-carbon-muted sm:justify-start"
              >
                <Icon name="lock" className="h-4 w-4" />
                Panel de gestión
              </Link>
            </div>
          </div>
        </nav>
        <div aria-hidden="true" className="relative hidden w-[42%] border-l border-tinta-line lg:block">
          <Photo img="comedorRatan" sizes="42vw" mobileBelow={0} decorative />
        </div>
      </div>
    </div>
  );
}
