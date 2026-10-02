import type { Metadata } from "next";
import { CartaGestion, type CategoriaBd, type ModificadorBd, type OpcionBd, type ProductoBd } from "@/components/admin/CartaGestion";
import { Aviso, Cabecera, primerError } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";

export const metadata: Metadata = { title: "Carta" };
export const dynamic = "force-dynamic";

export default async function CartaAdmin() {
  const [c, p, m, o] = await Promise.all([
    listar<CategoriaBd>("categorias"),
    listar<ProductoBd>("productos"),
    listar<ModificadorBd>("modificadores"),
    listar<OpcionBd>("modificador_opciones"),
  ]);
  if (!c.ok || !p.ok || !m.ok || !o.ok) return <Aviso>{primerError(c, p, m, o)}</Aviso>;
  return (
    <>
      <Cabecera titulo="Carta" texto="Platos, precios, alérgenos, fotos y disponibilidad. «Agotado» se refleja en la web y en los pedidos al instante." />
      <CartaGestion categorias={c.data} productos={p.data} modificadores={m.data} opciones={o.data} />
    </>
  );
}
