"use client";

import { useState } from "react";
import type { CartaCartControls } from "@/components/carta/types";
import { Icon } from "@/components/ui/Icon";
import { vibrar } from "@/lib/haptics";
import type { CartaItem } from "@/lib/restaurant/types";

/**
 * "+ Añadir" con contador en línea. Un plato con modificadores obligatorios no se
 * añade directo: abre la ficha para elegir. Va por encima del enlace de la
 * tarjeta (z-10) para no abrir la ficha al pulsarlo.
 */
export function AnadirControl({
  item,
  cart,
  onRequiereFicha,
  compacto = false,
}: {
  item: CartaItem;
  cart: CartaCartControls;
  onRequiereFicha: () => void;
  compacto?: boolean;
}) {
  const [bump, setBump] = useState(0);
  const cantidad = cart.cantidad(item.id);
  const requiereFicha = item.modificadores.some((m) => m.obligatorio);

  const anadir = () => {
    if (requiereFicha) return onRequiereFicha();
    cart.anadir(item);
    vibrar(12);
    setBump((b) => b + 1);
  };

  if (cantidad > 0 && !requiereFicha) {
    return (
      <div className="relative z-10 flex items-center rounded-full bg-marino text-crema shadow-card">
        <button type="button" onClick={() => cart.quitarUno(item.id)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          <Icon name="minus" className="h-4 w-4" />
          <span className="sr-only">Quitar uno de {item.nombre}</span>
        </button>
        <span key={bump} aria-live="polite" className="min-w-6 text-center text-sm font-semibold tabular-nums motion-safe:animate-bump">
          {cantidad}
        </span>
        <button type="button" onClick={anadir} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
          <Icon name="plus" className="h-4 w-4" />
          <span className="sr-only">Añadir otro {item.nombre}</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={anadir}
      className={`relative z-10 inline-flex h-10 items-center gap-1.5 rounded-full bg-marino text-sm font-semibold text-crema shadow-card transition-[transform,background-color] hover:bg-marino-700 active:scale-95 ${
        compacto ? "w-10 justify-center" : "px-4"
      }`}
    >
      <Icon name="plus" className="h-4 w-4" />
      {compacto ? null : cantidad > 0 ? `${cantidad} · Añadir` : "Añadir"}
      {/* Compacto solo se ve el «+»: el lector de pantalla tiene que oír «Añadir», no solo el plato. */}
      <span className="sr-only">{compacto ? `Añadir ${item.nombre}` : ` ${item.nombre}`}</span>
    </button>
  );
}
