"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";

interface Props {
  hoyHref: string;
  cartaHref: string;
  reservarHref: string;
  directionsHref: string;
  labels: { hoy: string; carta: string; reservar: string; llegar: string };
}

/**
 * Barra de acciones persistente en móvil, en el orden en que la usa quien trabaja
 * en el Parque: qué hay hoy, la carta, reservar y llegar. Pedir vive en el menú
 * y en la home; en el flujo de pedido la sustituye la barra de la cesta.
 */
export function BottomBar({ hoyHref, cartaHref, reservarHref, directionsHref, labels }: Props) {
  const pathname = usePathname();
  if (/\/(pedir|pedido)(\/|$)/.test(pathname)) return null;

  const item = (activo: boolean) =>
    `flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold tracking-wide transition-colors ${
      activo ? "text-brasa" : "text-carbon/75 hover:text-carbon"
    }`;
  const Item = ({ href, icon, label }: { href: string; icon: IconName; label: string }) => (
    <Link href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} className={item(pathname.startsWith(href))}>
      <Icon name={icon} className="h-5 w-5" />
      {label}
    </Link>
  );

  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-tinta-line bg-crema/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1 px-2 py-1">
        <Item href={hoyHref} icon="sun" label={labels.hoy} />
        <Item href={cartaHref} icon="utensils" label={labels.carta} />
        <Link
          href={reservarHref}
          className="mx-1 flex min-h-[3.25rem] flex-[1.25] flex-col items-center justify-center gap-0.5 rounded-md bg-brasa text-[0.7rem] font-semibold tracking-wide text-crema"
        >
          <Icon name="calendar" className="h-5 w-5" />
          {labels.reservar}
        </Link>
        <a href={directionsHref} target="_blank" rel="noopener noreferrer" className={item(false)}>
          <Icon name="pin" className="h-5 w-5" />
          {labels.llegar}
        </a>
      </div>
    </nav>
  );
}
