import type { Metadata } from "next";
import { KitchenBoard } from "@/components/admin/KitchenBoard";
import { Aviso } from "@/components/admin/ui";
import { colaCocina } from "@/lib/admin/actions";
import type { PedidoKds } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Cocina y barra" };
export const dynamic = "force-dynamic";

export default async function CocinaPage() {
  const r = await colaCocina<PedidoKds>();
  if (!r.ok) return <Aviso>{r.error}</Aviso>;
  return <KitchenBoard inicial={r.data} />;
}
