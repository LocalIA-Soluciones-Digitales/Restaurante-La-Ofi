import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

interface Props {
  cartaHref: string;
  phoneHref: string;
  directionsHref: string;
  labels: { carta: string; reservar: string; comoLlegar: string };
}

/** Barra de acciones persistente en móvil: carta, reservar (llamada) y cómo llegar. */
export function BottomBar({ cartaHref, phoneHref, directionsHref, labels }: Props) {
  const item =
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.72rem] font-semibold transition-colors";
  return (
    <nav
      aria-label="Accesos rápidos"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-carbon/10 bg-crema pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-2 px-3 py-1.5">
        <Link href={cartaHref} className={`${item} rounded-2xl text-carbon hover:bg-carbon/5`}>
          <Icon name="utensils" />
          {labels.carta}
        </Link>
        <a href={phoneHref} className={`${item} rounded-2xl bg-marino text-crema shadow-card`}>
          <Icon name="phone" />
          {labels.reservar}
        </a>
        <a href={directionsHref} target="_blank" rel="noopener noreferrer" className={`${item} rounded-2xl text-carbon hover:bg-carbon/5`}>
          <Icon name="pin" />
          {labels.comoLlegar}
        </a>
      </div>
    </nav>
  );
}
