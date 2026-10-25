import { redirect } from "next/navigation";

/** Gastos vive ahora en Contabilidad; se mantiene la ruta para enlaces y marcadores antiguos. */
export default async function GastosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  redirect(`/admin/contabilidad?vista=gastos${mes ? `&mes=${encodeURIComponent(mes)}` : ""}`);
}
