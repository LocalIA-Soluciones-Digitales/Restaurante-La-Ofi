import type { Metadata } from "next";
import { MenuDiaEditor } from "@/components/admin/MenuDiaEditor";
import { Cabecera } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Menú del día" };
export const dynamic = "force-dynamic";

export default function MenuDelDiaAdmin() {
  return (
    <>
      <Cabecera titulo="Menú del día" texto="Publícalo cada mañana desde el móvil: aparece en la web al momento con la hora de actualización." />
      <MenuDiaEditor />
    </>
  );
}
