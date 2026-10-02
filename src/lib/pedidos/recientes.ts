// Pedidos hechos desde este dispositivo (para el aviso "Tu pedido #12 está en
// preparación" y volver a su seguimiento). Solo ids y número: nada personal.

export interface PedidoReciente {
  id: string;
  numero: number;
  creado: number;
}

const CLAVE = "laofi:pedidos";
const VIGENCIA_MS = 12 * 60 * 60 * 1000;

export function leerRecientes(): PedidoReciente[] {
  try {
    const lista = JSON.parse(window.localStorage.getItem(CLAVE) ?? "[]") as PedidoReciente[];
    return lista.filter((p) => Date.now() - p.creado < VIGENCIA_MS);
  } catch {
    return [];
  }
}

export function guardarReciente(p: Omit<PedidoReciente, "creado">) {
  try {
    const lista = [{ ...p, creado: Date.now() }, ...leerRecientes().filter((x) => x.id !== p.id)].slice(0, 8);
    window.localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    /* sin almacenamiento */
  }
}

export function olvidarReciente(id: string) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(leerRecientes().filter((x) => x.id !== id)));
  } catch {
    /* sin almacenamiento */
  }
}
