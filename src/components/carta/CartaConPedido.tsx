"use client";

import { useMemo, useState } from "react";
import { CartaInteractiva } from "@/components/carta/CartaInteractiva";
import type { CartaCartControls } from "@/components/carta/types";
import { CartBar } from "@/components/pedir/CartBar";
import { CartDrawer } from "@/components/pedir/CartDrawer";
import { CartProvider, useCart } from "@/components/pedir/cart-context";
import type { ConfigPedidos } from "@/lib/pedidos/types";
import type { CartaSeccion } from "@/lib/restaurant/types";

/**
 * /carta con cesta: cada plato con precio se puede añadir y el pedido se cierra
 * para recoger en barra. Comparte la cesta "recogida" con /pedir (localStorage),
 * así que lo añadido aquí sigue ahí si el cliente entra por /pedir.
 */
export function CartaConPedido({ secciones, config }: { secciones: CartaSeccion[]; config: ConfigPedidos }) {
  return (
    <CartProvider contexto="recogida">
      <Interior secciones={secciones} config={config} />
    </CartProvider>
  );
}

function Interior({ secciones, config }: { secciones: CartaSeccion[]; config: ConfigPedidos }) {
  const cart = useCart();
  const [cesta, setCesta] = useState(false);

  const controles = useMemo<CartaCartControls>(
    () => ({
      cantidad: (id) => cart.lineas.filter((l) => l.productoId === id).reduce((a, l) => a + l.cantidad, 0),
      anadir: (item, o) => cart.anadir(item, o),
      quitarUno: (id) => cart.quitarUno(id),
      sePuedePedir: (item) => item.fuente === "supabase" && item.precioCentimos !== null,
    }),
    [cart],
  );

  return (
    <div className="pb-24">
      <CartaInteractiva secciones={secciones} cart={controles} layout="editorial" />
      <CartBar onOpen={() => setCesta(true)} etiqueta="Ver pedido para recoger" />
      {cesta ? <CartDrawer contexto={{ tipo: "recogida" }} config={config} onClose={() => setCesta(false)} /> : null}
    </div>
  );
}
