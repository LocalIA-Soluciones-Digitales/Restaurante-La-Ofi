import type { Metadata } from "next";
import { VentasPanel } from "@/components/admin/VentasPanel";
import { Cabecera } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Ventas e informes" };
export const dynamic = "force-dynamic";

export default function VentasAdmin() {
  return (
    <>
      <Cabecera titulo="Ventas e informes" texto="Qué se vende, cuándo y quién lo vende. Exporta a CSV o imprime el informe en PDF." />
      <VentasPanel />
    </>
  );
}
