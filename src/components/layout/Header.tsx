"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/layout/Logo";
import type { NavItem } from "@/components/layout/nav";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";

interface Props {
  homeHref: string;
  pedirHref: string;
  reservarHref: string;
  items: NavItem[];
  phoneHref: string;
  phoneDisplay: string;
  labels: { reservar: string; pedir: string; llamar: string; abrirMenu: string; cerrarMenu: string; comoLlegar: string };
  directionsHref: string;
}

export function Header({ homeHref, pedirHref, reservarHref, items, phoneHref, phoneDisplay, labels, directionsHref }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sobre una cabecera de foto/vídeo oscura (data-header="light") el texto va en claro.
  useEffect(() => {
    setOverHero(Boolean(document.querySelector('[data-header="light"]')));
  }, [pathname]);

  const light = overHero && !scrolled;

  const isActive = (itemHref: string) =>
    !itemHref.includes("#") && (itemHref === homeHref ? pathname === homeHref : pathname.startsWith(itemHref));

  return (
    <>
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled ? "bg-crema/90 shadow-[0_1px_0_rgb(43_39_34/0.08)] backdrop-blur-md" : "bg-transparent"
      } ${light ? "text-crema" : "text-carbon"}`}
    >
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
        <Link href={homeHref} className="rounded-lg">
          <Logo light={light} />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {items.slice(1).map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    light ? "text-crema hover:bg-crema/10 aria-[current=page]:text-neon" : "text-carbon hover:bg-carbon/5 aria-[current=page]:text-terracota"
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
            className={`btn hidden min-h-11 border px-4 text-sm sm:inline-flex ${light ? "border-crema/30 text-crema hover:bg-crema/10" : "border-carbon/15 text-carbon hover:bg-white"}`}
          >
            <Icon name="bag" className="h-4 w-4" />
            {labels.pedir}
          </Link>
          <Link href={reservarHref} className={`${light ? "btn-light" : "btn-primary"} hidden min-h-11 px-5 text-sm sm:inline-flex`}>
            <Icon name="calendar" className="h-4 w-4" />
            {labels.reservar}
          </Link>
          <button
            type="button"
            className={`grid h-11 w-11 place-items-center rounded-full border lg:hidden ${
              light ? "border-crema/30 bg-carbon/20 text-crema backdrop-blur" : "border-carbon/15 bg-crema/80 text-carbon"
            }`}
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
      className="fixed inset-0 z-50 flex flex-col bg-crema animate-fade-up lg:hidden"
    >
      <div className="container-page flex h-[4.5rem] items-center justify-between">
        <Logo />
        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-full border border-carbon/15 text-carbon"
        >
          <Icon name="close" />
          <span className="sr-only">{labels.cerrarMenu}</span>
        </button>
      </div>
      <nav aria-label="Principal (móvil)" className="container-page flex-1 overflow-y-auto pb-8 pt-4">
        <ul className="divide-y divide-carbon/10 border-y border-carbon/10">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                aria-current={isActive(item.href) ? "page" : undefined}
                className="flex items-center justify-between py-4 font-display text-3xl text-carbon aria-[current=page]:text-terracota"
              >
                {item.label}
                <Icon name="arrow" className="h-5 w-5 text-carbon-muted" />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Link href={reservarHref} onClick={onClose} className="btn-primary w-full">
              <Icon name="calendar" className="h-4 w-4" />
              {labels.reservar}
            </Link>
            <Link href={pedirHref} onClick={onClose} className="btn-secondary w-full">
              <Icon name="bag" className="h-4 w-4" />
              {labels.pedir}
            </Link>
          </div>
          <a href={phoneHref} className="btn-secondary w-full">
            <Icon name="phone" className="h-4 w-4" />
            {labels.llamar} · {phoneDisplay}
          </a>
          <a href={directionsHref} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full">
            <Icon name="pin" className="h-4 w-4" />
            {labels.comoLlegar}
          </a>
        </div>
      </nav>
    </div>
  );
}
