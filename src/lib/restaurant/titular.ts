import "server-only";
import { getTitular } from "@/lib/restaurant/queries";
import { TITULAR, type Titular } from "@/lib/site";

/**
 * Titular del negocio: lo guardado en /admin/configuracion (ajuste «fiscal») y,
 * campo a campo, lo fijado en site.ts si el panel aún no lo tiene. Así el
 * propietario completa el aviso legal sin un despliegue.
 */
export async function getTitularResuelto(): Promise<Titular> {
  const bd = await getTitular();
  return {
    razonSocial: bd?.razon_social ?? TITULAR.razonSocial,
    nif: bd?.nif ?? TITULAR.nif,
    domicilio: bd?.domicilio ?? TITULAR.domicilio,
    registro: bd?.registro ?? TITULAR.registro,
    email: bd?.email ?? TITULAR.email,
  };
}
