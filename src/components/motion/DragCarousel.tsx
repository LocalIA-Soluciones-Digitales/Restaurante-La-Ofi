"use client";

import { useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Carrusel horizontal con scroll-snap nativo (táctil y trackpad sin JS) y
 * arrastre con ratón en escritorio. Sin librerías. Botones anterior/siguiente
 * accesibles con teclado.
 */
export function DragCarousel({ children, label, dark = false }: { children: ReactNode; label: string; dark?: boolean }) {
  const ref = useRef<HTMLUListElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const justDragged = useRef(false);
  const [dragging, setDragging] = useState(false);

  const endDrag = () => {
    if (drag.current?.moved) {
      justDragged.current = true;
      window.setTimeout(() => (justDragged.current = false), 0);
    }
    drag.current = null;
    setDragging(false);
  };

  const step = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.querySelector("li");
    el.scrollBy({ left: dir * ((card?.clientWidth ?? 320) + 16), behavior: "smooth" });
  };

  const btn = `grid h-12 w-12 place-items-center rounded-full border transition-colors ${
    dark ? "border-crema/25 text-crema hover:bg-crema/10" : "border-carbon/20 text-carbon hover:bg-carbon/5"
  }`;

  return (
    <div className="relative">
      <ul
        ref={ref}
        aria-label={label}
        className={`no-scrollbar flex gap-4 overflow-x-auto px-4 pb-6 sm:px-6 lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))] ${
          dragging ? "cursor-grabbing select-none" : "snap-x snap-mandatory lg:cursor-grab"
        }`}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || !ref.current) return;
          drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !ref.current) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 6) {
            d.moved = true;
            setDragging(true);
          }
          if (d.moved) ref.current.scrollLeft = d.left - dx;
        }}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={(e) => {
          // Un arrastre no debe abrir el enlace de la tarjeta.
          if (justDragged.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {children}
      </ul>
      <div className="container-page mt-2 hidden justify-end gap-2 sm:flex">
        <button type="button" onClick={() => step(-1)} className={btn}>
          <Icon name="chevronLeft" />
          <span className="sr-only">Anterior</span>
        </button>
        <button type="button" onClick={() => step(1)} className={btn}>
          <Icon name="chevronRight" />
          <span className="sr-only">Siguiente</span>
        </button>
      </div>
    </div>
  );
}
