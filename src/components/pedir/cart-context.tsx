"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { precioConModificadores, resumenModificadores, type SeleccionModificador } from "@/lib/carta";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";

// Cesta persistente (portada de cart-context de Palomita-Bar). Cada línea es un
// plato + una combinación concreta de modificadores y notas: dos entrecots con
// distinto punto son dos líneas. Se guarda en localStorage por contexto (mesa,
// recogida o grupo) y caduca a las 6 h para no reabrir precios viejos.

export interface CartLinea {
  key: string;
  productoId: string;
  nombre: string;
  precioUnitario: number;
  cantidad: number;
  seleccion: SeleccionModificador[];
  resumen: string;
  notas?: string;
  /** Comensales con los que se comparte (modo "cada uno lo suyo"). */
  compartidoCon: string[];
}

export interface CambioCarta {
  nombre: string;
  antes: number;
  /** null = ya no está disponible. */
  ahora: number | null;
}

interface CartValue {
  lineas: CartLinea[];
  hidratado: boolean;
  totalCentimos: number;
  totalItems: number;
  anadir: (item: CartaItem, o?: { seleccion?: SeleccionModificador[]; notas?: string; cantidad?: number }) => void;
  cambiarCantidad: (key: string, delta: number) => void;
  quitarUno: (productoId: string) => void;
  eliminar: (key: string) => void;
  setNotas: (key: string, notas: string) => void;
  toggleCompartir: (key: string, participanteId: string) => void;
  vaciar: () => void;
  /** Recalcula con la carta recién leída; devuelve qué ha cambiado (precios o agotados). */
  aplicarCarta: (secciones: CartaSeccion[]) => CambioCarta[];
}

const CartContext = createContext<CartValue | null>(null);
const PREFIJO = "laofi:cesta:";
const CADUCIDAD_MS = 6 * 60 * 60 * 1000;

function claveLinea(productoId: string, seleccion: SeleccionModificador[], notas?: string) {
  const sel = [...seleccion]
    .filter((s) => s.opcionIds.length > 0)
    .sort((a, b) => a.modificadorId.localeCompare(b.modificadorId))
    .map((s) => `${s.modificadorId}:${[...s.opcionIds].sort().join(".")}`)
    .join("|");
  return `${productoId}#${sel}#${(notas ?? "").trim().toLowerCase()}`;
}

function leer(contexto: string): CartLinea[] {
  try {
    const raw = window.localStorage.getItem(PREFIJO + contexto);
    if (!raw) return [];
    const data = JSON.parse(raw) as { guardado: number; lineas: CartLinea[] };
    if (!Array.isArray(data.lineas) || Date.now() - data.guardado > CADUCIDAD_MS) return [];
    return data.lineas;
  } catch {
    return [];
  }
}

function escribir(contexto: string, lineas: CartLinea[]) {
  try {
    if (lineas.length === 0) window.localStorage.removeItem(PREFIJO + contexto);
    else window.localStorage.setItem(PREFIJO + contexto, JSON.stringify({ guardado: Date.now(), lineas }));
  } catch {
    // Almacenamiento no disponible (modo privado, cuota llena…): la cesta sigue en memoria.
  }
}

export function CartProvider({ contexto, children }: { contexto: string; children: ReactNode }) {
  const [lineas, setLineas] = useState<CartLinea[]>([]);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setLineas(leer(contexto));
    setHidratado(true);
  }, [contexto]);

  useEffect(() => {
    if (hidratado) escribir(contexto, lineas);
  }, [contexto, lineas, hidratado]);

  const anadir = useCallback<CartValue["anadir"]>((item, o = {}) => {
    const seleccion = o.seleccion ?? [];
    const precio = precioConModificadores(item, seleccion);
    if (precio === null) return;
    const key = claveLinea(item.id, seleccion, o.notas);
    const cantidad = Math.max(1, o.cantidad ?? 1);
    setLineas((prev) => {
      const existe = prev.find((l) => l.key === key);
      if (existe) return prev.map((l) => (l.key === key ? { ...l, cantidad: Math.min(50, l.cantidad + cantidad) } : l));
      return [
        ...prev,
        {
          key,
          productoId: item.id,
          nombre: item.nombre,
          precioUnitario: precio,
          cantidad,
          seleccion,
          resumen: resumenModificadores(item, seleccion),
          notas: o.notas,
          compartidoCon: [],
        },
      ];
    });
  }, []);

  const cambiarCantidad = useCallback((key: string, delta: number) => {
    setLineas((prev) =>
      prev.flatMap((l) => {
        if (l.key !== key) return [l];
        const cantidad = Math.min(50, l.cantidad + delta);
        return cantidad > 0 ? [{ ...l, cantidad }] : [];
      }),
    );
  }, []);

  const quitarUno = useCallback(
    (productoId: string) => {
      const ultima = [...lineas].reverse().find((l) => l.productoId === productoId);
      if (ultima) cambiarCantidad(ultima.key, -1);
    },
    [lineas, cambiarCantidad],
  );

  const value = useMemo<CartValue>(
    () => ({
      lineas,
      hidratado,
      totalCentimos: lineas.reduce((a, l) => a + l.precioUnitario * l.cantidad, 0),
      totalItems: lineas.reduce((a, l) => a + l.cantidad, 0),
      anadir,
      cambiarCantidad,
      quitarUno,
      eliminar: (key) => setLineas((p) => p.filter((l) => l.key !== key)),
      setNotas: (key, notas) => setLineas((p) => p.map((l) => (l.key === key ? { ...l, notas: notas.slice(0, 140) || undefined } : l))),
      toggleCompartir: (key, participanteId) =>
        setLineas((p) =>
          p.map((l) =>
            l.key !== key
              ? l
              : {
                  ...l,
                  compartidoCon: l.compartidoCon.includes(participanteId)
                    ? l.compartidoCon.filter((x) => x !== participanteId)
                    : [...l.compartidoCon, participanteId],
                },
          ),
        ),
      vaciar: () => setLineas([]),
      aplicarCarta: (secciones) => {
        const items = new Map(secciones.flatMap((s) => s.items).map((i) => [i.id, i]));
        const cambios: CambioCarta[] = [];
        const nuevas = lineas.flatMap((l) => {
          const item = items.get(l.productoId);
          const ahora = item ? precioConModificadores(item, l.seleccion) : null;
          if (ahora === null) {
            cambios.push({ nombre: l.nombre, antes: l.precioUnitario, ahora: null });
            return [];
          }
          if (ahora !== l.precioUnitario) cambios.push({ nombre: l.nombre, antes: l.precioUnitario, ahora });
          return [{ ...l, precioUnitario: ahora }];
        });
        if (cambios.length > 0) setLineas(nuevas);
        return cambios;
      },
    }),
    [lineas, hidratado, anadir, cambiarCantidad, quitarUno],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart fuera de CartProvider");
  return ctx;
}
