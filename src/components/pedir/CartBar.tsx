"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/pedir/cart-context";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";

/**
 * Botón flotante de la cesta, abajo a la derecha: una cesta con el número de artículos.
 * Aparece al añadir el primero y «late» con cada artículo nuevo. `elevado` lo sube en
 * escritorio para no pisar la píldora de «Reservar» (ReservarFlotante).
 */
export function CartBar({ onOpen, etiqueta = "Ver pedido", elevado = false }: { onOpen: () => void; etiqueta?: string; elevado?: boolean }) {
  const { totalItems, totalCentimos, hidratado } = useCart();
  const [latido, setLatido] = useState(0);
  const prev = useRef(totalItems);

  useEffect(() => {
    if (totalItems > prev.current) setLatido((n) => n + 1);
    prev.current = totalItems;
  }, [totalItems]);

  if (!hidratado || totalItems === 0) return null;

  const articulos = `${totalItems} ${totalItems === 1 ? "artículo" : "artículos"}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${etiqueta}: ${articulos}, ${formatCentimos(totalCentimos)}`}
      className={`group fixed right-4 z-40 bottom-[calc(env(safe-area-inset-bottom)+1rem)] sm:right-6 sm:bottom-6 ${elevado ? "lg:bottom-24" : ""} motion-safe:animate-pop-in`}
    >
      <span
        key={latido}
        className="relative grid h-16 w-16 place-items-center rounded-full bg-marino text-crema shadow-[0_16px_36px_-10px_rgb(17_30_51/0.65)] ring-1 ring-white/10 transition-[transform,background-color] duration-200 ease-out group-hover:bg-marino-700 group-active:scale-95 motion-safe:animate-bump"
      >
        <Icon name="bag" className="h-7 w-7" />
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 grid h-7 min-w-7 place-items-center rounded-full bg-neon px-1.5 text-sm font-bold tabular-nums text-noche ring-[3px] ring-crema"
        >
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      </span>
    </button>
  );
}
