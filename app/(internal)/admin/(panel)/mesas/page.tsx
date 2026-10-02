import type { Metadata } from "next";
import { MesasGestion } from "@/components/admin/MesasGestion";
import { Aviso, Cabecera } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";
import { qrSvg, urlMesa } from "@/lib/admin/qr";
import type { MesaSalon, PersonaStaff, Zona } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Mesas y QR" };
export const dynamic = "force-dynamic";

export default async function MesasPage() {
  const [zonas, mesas, staff] = await Promise.all([listar<Zona>("zonas"), listar<MesaSalon>("mesas"), listar<PersonaStaff>("staff")]);
  if (!zonas.ok || !mesas.ok) return <Aviso>{!zonas.ok ? zonas.error : !mesas.ok ? mesas.error : ""}</Aviso>;
  const qrs = Object.fromEntries(await Promise.all(mesas.data.map(async (m) => [m.id, await qrSvg(urlMesa(m.token))] as const)));
  return (
    <>
      <Cabecera titulo="Mesas y QR" texto="Zonas y mesas del local, y los QR que llevan a cada mesa a pedir desde el móvil." />
      <MesasGestion zonas={zonas.data} mesas={mesas.data} qrs={qrs} staff={staff.ok ? staff.data : []} />
    </>
  );
}
