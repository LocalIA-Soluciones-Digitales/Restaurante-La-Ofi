import type { Metadata } from "next";
import { CartaGestion, type CategoriaBd, type ModificadorBd, type OpcionBd, type ProductoBd } from "@/components/admin/CartaGestion";
import { Aviso, Cabecera, primerError } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";
import { fichaDe, fotoDeFicha } from "@/lib/carta-fichas";
import { fotoDePlato } from "@/lib/carta-fotos";

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
  // La foto que pone la web a los platos sin foto propia (la misma prioridad que
  // src/lib/restaurant/content.ts): así el panel enseña cuáles tienen foto.
  const slugs = new Map(c.data.map((x) => [x.id, x.slug]));
  const fotosDelSitio: Record<string, string> = {};
  for (const x of p.data) {
    const slug = slugs.get(x.categoria_id) ?? "";
    const ficha = fichaDe(slug, x.nombre);
    const foto = fotoDePlato(slug, x.nombre) ?? (ficha ? fotoDeFicha(ficha)?.src : null);
    if (foto) fotosDelSitio[x.id] = foto;
  }
  return (
    <>
      <Cabecera titulo="Carta" texto="Platos, precios, alérgenos, fotos y disponibilidad. «Agotado» se refleja en la web y en los pedidos al instante." />
      <CartaGestion categorias={c.data} productos={p.data} modificadores={m.data} opciones={o.data} fotosDelSitio={fotosDelSitio} />
    </>
  );
}
