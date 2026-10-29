"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Logo } from "@/components/layout/Logo";
import type { NavItem } from "@/components/layout/nav";
import { Photo } from "@/components/media/Photo";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { ImageKey } from "@/lib/images";

// Foto del panel del menú para cada página, en el orden de mainNav (inicio, carta y
// menú, pedir, espacios, grupos y eventos, galería, contacto).
const MENU_FOTOS: ImageKey[] = ["comedorPanoramica", "comedorRatan", "barra", "barraMesasAltas", "despacho", "rotuloAguila", "terrazaCarpa"];

interface Props {
  homeHref: string;
  reservarHref: string;
  /** Todas las páginas (menú desplegable). */
  items: NavItem[];
  /** Casillas de la cabecera de escritorio. */
  primary: NavItem[];
  phoneHref: string;
  phoneDisplay: string;
  labels: { reservar: string; llamar: string; abrirMenu: string; cerrarMenu: string };
}

/**
 * Cabecera limpia, sin casillas: menú y las páginas más buscadas a la izquierda,
 * logotipo centrado y, a la derecha, teléfono y "Reservar" en píldora. Sobre una
 * foto oscura va transparente con texto claro; al bajar, crema translúcida con
 * un filete fino debajo.
 */
export function Header({ homeHref, reservarHref, items, primary, phoneHref, phoneDisplay, labels }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const pathname = usePathname();
  // Texto claro solo sobre una cabecera de foto oscura (data-header="light"); la
  // home ya abre sobre crema, así que se parte de la versión oscura en todas.
  const [overHero, setOverHero] = useState(false);
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
  const isActiveItem = (item: NavItem) => (item.match ?? [item.href]).some(isActive);

  const muted = light ? "text-crema/80 hover:text-crema" : "text-carbon/70 hover:text-carbon";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-[transform,background-color,border-color,color] duration-300 ease-out motion-reduce:transition-none ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        } ${scrolled ? "border-tinta-line bg-crema/90 backdrop-blur-md backdrop-saturate-150" : "border-transparent bg-transparent"} ${light ? "text-crema" : "text-carbon"}`}
      >
        <div className="container-wide relative flex h-16 items-center gap-8 lg:h-[4.5rem]">
          {/* Izquierda: menú y, en escritorio, las páginas que más se buscan */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="menu-movil"
            onClick={() => setOpen(true)}
            className="-ml-2 flex h-11 min-w-11 items-center justify-center gap-2.5 rounded-full px-2 text-[0.8rem] font-semibold tracking-[0.04em] transition-opacity hover:opacity-70"
          >
            <Icon name="menu" className="h-5 w-5" />
            <span className="hidden sm:inline">Menú</span>
            <span className="sr-only">{labels.abrirMenu}</span>
          </button>
          <nav aria-label="Principal" className="hidden items-center gap-7 lg:flex">
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActiveItem(item) ? "page" : undefined}
                className={`relative py-2 text-[0.85rem] font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100 ${muted} aria-[current=page]:text-current`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Logotipo centrado */}
          <Link href={homeHref} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md">
            <Logo light={light} center />
          </Link>

          {/* Derecha: teléfono y Reservar */}
          <div className="ml-auto flex items-center gap-2 sm:gap-5">
            <a href={phoneHref} className={`hidden items-center gap-2 text-[0.85rem] font-medium tabular-nums transition-colors xl:flex ${muted}`}>
              <Icon name="phone" className="h-4 w-4" />
              {phoneDisplay}
            </a>
            <a href={phoneHref} className="grid h-11 w-11 place-items-center rounded-full transition-opacity hover:opacity-70 sm:hidden">
              <Icon name="phone" className="h-5 w-5" />
              <span className="sr-only">
                {labels.llamar} {phoneDisplay}
              </span>
            </a>
            <Link
              href={reservarHref}
              className={`hidden h-11 items-center rounded-full px-6 text-[0.8rem] font-semibold tracking-[0.04em] transition-colors sm:inline-flex ${
                light ? "bg-crema text-carbon hover:bg-white" : "bg-carbon text-crema hover:bg-brasa"
              }`}
            >
              {labels.reservar}
            </Link>
          </div>
        </div>
      </header>

      {open ? (
        <MenuPanel items={items} isActive={isActiveItem} onClose={() => setOpen(false)} labels={labels} />
      ) : null}
    </>
  );
}

/** Menú a pantalla completa (móvil y escritorio): páginas en grande y, en escritorio, una foto del local. */
function MenuPanel({
  items,
  isActive,
  onClose,
  labels,
}: {
  items: NavItem[];
  isActive: (item: NavItem) => boolean;
  onClose: () => void;
  labels: Props["labels"];
}) {
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  const [foto, setFoto] = useState(0);
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
                <li key={item.href} className="intro-up border-b border-tinta-line" style={{ "--d": `${0.06 + i * 0.04}s` } as CSSProperties}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    onPointerEnter={() => setFoto(i)}
                    onFocus={() => setFoto(i)}
                    aria-current={isActive(item) ? "page" : undefined}
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
            {/* Reservar, llamar y llegar ya están en la cabecera y en Contacto: aquí solo las
                páginas. El panel de gestión se abre en /admin (el personal lo tiene guardado). */}
          </div>
        </nav>
        <div aria-hidden="true" className="relative hidden w-[42%] border-l border-tinta-line lg:block">
          {MENU_FOTOS.map((img, i) => (
            <div key={img} className={`absolute inset-0 transition-opacity duration-500 ease-out ${i === foto ? "opacity-100" : "opacity-0"}`}>
              <Photo img={img} sizes="42vw" mobileBelow={0} decorative />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
