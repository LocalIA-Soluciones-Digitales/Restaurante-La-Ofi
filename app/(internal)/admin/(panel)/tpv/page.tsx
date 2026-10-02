import type { Metadata } from "next";
import { BarraPOS } from "@/components/admin/tpv/BarraPOS";
import { Aviso } from "@/components/admin/ui";
import { listar, salon } from "@/lib/admin/actions";
import { obtenerSesionAdmin } from "@/lib/admin/session";
import type { SalonData } from "@/lib/admin/types";
import type { DatosFiscales } from "@/lib/print/ticket";
import { getCartaContent } from "@/lib/restaurant/content";

export const metadata: Metadata = { title: "TPV" };
export const dynamic = "force-dynamic";

export default async function TpvPage({ searchParams }: { searchParams: Promise<{ mesa?: string }> }) {
  const { mesa } = await searchParams;
  const sesion = (await obtenerSesionAdmin())!;
  const [carta, s, ajustes] = await Promise.all([getCartaContent(), salon<SalonData>(), listar<{ valor: DatosFiscales }>("ajustes", { clave: "fiscal" })]);
  if (carta.status !== "real") return <Aviso>La carta no está disponible en la base de datos: el TPV necesita la carta real de Supabase.</Aviso>;
  if (!s.ok || !s.data) return <Aviso>{s.ok ? "Sin acceso al salón." : s.error}</Aviso>;
  return (
    <BarraPOS
      carta={carta.data}
      mesas={s.data.mesas.filter((m) => !m.bloqueada)}
      mesaInicial={mesa && s.data.mesas.some((m) => m.id === mesa) ? mesa : null}
      rol={sesion.rol}
      fiscal={ajustes.ok ? (ajustes.data[0]?.valor ?? {}) : {}}
    />
  );
}
