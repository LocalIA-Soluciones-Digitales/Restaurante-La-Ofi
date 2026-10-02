"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/pedir/cart-context";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";

/** Barra flotante de la cesta (portada de CartBar de Palomita): aparece al añadir y "late" con cada cambio. */
export function CartBar({ onOpen, etiqueta = "Ver pedido" }: { onOpen: () => void; etiqueta?: string }) {
  const { totalItems, totalCentimos, hidratado } = useCart();
  const [latido, setLatido] = useState(0);
  const prev = useRef(totalItems);

  useEffect(() => {
    if (totalItems > prev.current) setLatido((n) => n + 1);
    prev.current = totalItems;
  }, [totalItems]);

  if (!hidratado || totalItems === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6">
      <button
        type="button"
        onClick={onOpen}
        className="pointer-events-auto mx-auto flex w-full max-w-xl items-center gap-3 rounded-full bg-marino py-2 pl-2 pr-5 text-crema shadow-[0_18px_40px_-12px_rgb(17_30_51/0.6)] animate-sheet-up hover:bg-marino-700"
      >
        <span key={latido} className="grid h-11 w-11 place-items-center rounded-full bg-neon text-noche motion-safe:animate-bump">
          <span className="font-semibold tabular-nums">{totalItems}</span>
        </span>
        <span className="flex-1 text-left font-semibold">{etiqueta}</span>
        <span className="font-display text-xl tabular-nums">{formatCentimos(totalCentimos)}</span>
        <Icon name="chevronUp" className="h-5 w-5" />
      </button>
    </div>
  );
}
