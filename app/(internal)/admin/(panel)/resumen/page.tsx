import type { Metadata } from "next";
import { ResumenRecogidas } from "@/components/admin/ResumenRecogidas";
import { Cabecera } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Resumen" };
export const dynamic = "force-dynamic";

export default function ResumenPage() {
  return (
    <>
      <Cabecera
        titulo="Resumen"
        texto="Todo lo que se recoge en barra, día a día: platos del día para llevar y botellas de vino encargadas. Toca una tarjeta o un encargo para gestionarlo."
      />
      <ResumenRecogidas />
    </>
  );
}
