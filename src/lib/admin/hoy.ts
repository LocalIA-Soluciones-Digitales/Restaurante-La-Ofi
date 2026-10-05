import { colaCocina, estadoCaja, rpcAdmin, salon } from "@/lib/admin/actions";
import type { MesaSalon, PedidoKds, ReservaDia, SalonData } from "@/lib/admin/types";
import { hoyEnMadrid } from "@/lib/format";

// Datos de «Hoy» (los carga la página en el servidor y PanelHoy los refresca
// desde el navegador con las mismas Server Actions).

export interface CajaHoy {
  ventas_centimos: number;
  pedidos: number;
  pendiente_cobro_centimos: number;
}

export interface DatosHoy {
  mesas: MesaSalon[];
  cola: PedidoKds[];
  reservas: ReservaDia[];
  caja: CajaHoy | null;
}

export async function cargarHoy(sala: boolean, gestion: boolean): Promise<DatosHoy> {
  const hoy = hoyEnMadrid();
  const [s, cola, reservas, caja] = await Promise.all([
    sala ? salon<SalonData>() : null,
    colaCocina<PedidoKds>(),
    sala ? rpcAdmin<ReservaDia[]>("laofi_admin_reservas", { p_desde: hoy, p_hasta: hoy }) : null,
    gestion ? estadoCaja<CajaHoy>() : null,
  ]);
  return {
    mesas: s?.ok ? s.data.mesas : [],
    cola: cola.ok ? cola.data : [],
    reservas: reservas?.ok ? reservas.data : [],
    caja: caja?.ok ? caja.data : null,
  };
}
