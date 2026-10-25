import { redirect } from "next/navigation";

/** Ventas e informes vive ahora en Contabilidad; se mantiene la ruta para enlaces y marcadores antiguos. */
export default function VentasAdmin() {
  redirect("/admin/contabilidad?vista=ventas");
}
