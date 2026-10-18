"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Píldora fija de "Reservar mesa" abajo a la derecha (solo escritorio: en móvil
 * ya está la barra inferior). Aparece al dejar atrás la primera pantalla y se
 * oculta al llegar al pie y en las páginas de reservar y pedir. Entra y sale por el mismo camino.
 */
export function ReservarFlotante({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Visible tras la primera pantalla; se retira al llegar al pie (mapa y contacto).
    const onScroll = () => {
      const y = window.scrollY;
      const fin = document.documentElement.scrollHeight - window.innerHeight - 900;
      setVisible(y > window.innerHeight * 0.9 && y < fin);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (/\/(reservar|pedir|pedido)(\/|$)/.test(pathname)) return null;

  return (
    <Link
      href={href}
      aria-hidden={!visible}
      tabIndex={visible ? undefined : -1}
      className={`group fixed bottom-6 right-6 z-30 hidden items-center gap-3 rounded-full bg-carbon py-3 pl-6 pr-3 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-crema shadow-lift transition-[transform,opacity,background-color] duration-300 ease-out-expo hover:bg-brasa lg:inline-flex ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0"
      }`}
    >
      {label}
      <span className="grid h-8 w-8 place-items-center rounded-full bg-crema text-carbon transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5">
        <Icon name="arrow" className="h-4 w-4" />
      </span>
    </Link>
  );
}
