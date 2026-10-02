"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/layout/Logo";
import type { NavItem } from "@/components/layout/nav";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";

interface Props {
  homeHref: string;
  pedirHref: string;
  reservarHref: string;
  /** Todas las páginas (menú móvil). */
  items: NavItem[];
  /** Selección corta para la barra de escritorio. */
  primary: NavItem[];
  phoneHref: string;
  phoneDisplay: string;
  labels: { reservar: string; pedir: string; llamar: string; abrirMenu: string; cerrarMenu: string; comoLlegar: string };
  directionsHref: string;
}

export function Header({ homeHref, pedirHref, reservarHref, items, primary, phoneHref, phoneDisplay, labels, directionsHref }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [overHero, setOverHero] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
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

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-[transform,background-color,box-shadow] duration-300 ease-out motion-reduce:transition-none ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled ? "bg-crema/95 shadow-[0_1px_0_rgb(43_39_34/0.1)] backdrop-blur-md" : "bg-transparent"} ${
          light ? "text-crema" : "text-carbon"
        }`}
      >
        <div className="container-wide flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
          <Link href={homeHref} className="shrink-0 rounded-md">
            <Logo light={light} />
          </Link>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-1 xl:gap-2">
              {primary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={`relative inline-flex min-h-11 items-center px-2.5 text-[0.92rem] font-medium transition-colors after:absolute after:inset-x-2.5 after:bottom-2 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100 ${
                      light ? "text-crema/90 hover:text-crema" : "text-carbon/80 hover:text-carbon aria-[current=page]:text-carbon"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={pedirHref}
              className={`hidden min-h-11 items-center gap-1.5 px-3 text-[0.92rem] font-medium transition-colors xl:inline-flex ${
                light ? "text-crema/90 hover:text-crema" : "text-carbon/80 hover:text-carbon"
              }`}
            >
              <Icon name="bag" className="h-4 w-4" />
              {labels.pedir}
            </Link>
            <Link href={reservarHref} className={`${light ? "btn-light" : "btn-primary"} hidden min-h-11 px-5 text-sm sm:inline-flex`}>
              {labels.reservar}
            </Link>
            <a
              href={phoneHref}
              className={`grid h-11 w-11 place-items-center rounded-md lg:hidden ${light ? "text-crema" : "text-carbon"}`}
            >
              <Icon name="phone" className="h-5 w-5" />
              <span className="sr-only">
                {labels.llamar} {phoneDisplay}
              </span>
            </a>
            <button
              type="button"
              className={`inline-flex h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold lg:hidden ${light ? "text-crema" : "text-carbon"}`}
              aria-expanded={open}
              aria-controls="menu-movil"
              onClick={() => setOpen(true)}
            >
              <Icon name="menu" />
              <span className="sr-only">{labels.abrirMenu}</span>
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <MobileMenu
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

function MobileMenu({
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
      className="fixed inset-0 z-50 flex flex-col bg-crema motion-safe:animate-fade-up lg:hidden"
    >
      <div className="container-wide flex h-16 items-center justify-between">
        <Logo />
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-md text-carbon">
          <Icon name="close" />
          <span className="sr-only">{labels.cerrarMenu}</span>
        </button>
      </div>
      <nav aria-label="Principal (móvil)" className="container-wide flex-1 overflow-y-auto pb-10 pt-2">
        <ul className="border-t border-tinta-line">
          {items.map((item) => (
            <li key={item.href} className="border-b border-tinta-line">
              <Link
                href={item.href}
                onClick={onClose}
                aria-current={isActive(item.href) ? "page" : undefined}
                className="flex min-h-14 items-center justify-between py-3 font-display text-[1.65rem] leading-tight text-carbon aria-[current=page]:text-brasa"
              >
                {item.label}
                <Icon name="arrow" className="h-5 w-5 text-carbon/40" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link href={reservarHref} onClick={onClose} className="btn-primary">
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
        </div>
      </nav>
    </div>
  );
}
