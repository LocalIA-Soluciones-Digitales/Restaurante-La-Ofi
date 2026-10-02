import "server-only";
import Stripe from "stripe";

/** Cliente de Stripe (solo servidor). null si no hay STRIPE_SECRET_KEY: pago online desactivado. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

/** Stripe limita cada valor de metadata a 500 caracteres: los ids se reparten en varias claves. */
export function idsEnMetadata(prefijo: string, ids: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  let trozo: string[] = [];
  let n = 0;
  for (const id of ids) {
    if ([...trozo, id].join(",").length > 490) {
      out[`${prefijo}${n++}`] = trozo.join(",");
      trozo = [];
    }
    trozo.push(id);
  }
  if (trozo.length) out[`${prefijo}${n}`] = trozo.join(",");
  return out;
}

export function idsDesdeMetadata(prefijo: string, metadata: Record<string, string> | null | undefined): string[] {
  return Object.entries(metadata ?? {})
    .filter(([k]) => k.startsWith(prefijo))
    .sort(([a], [b]) => Number(a.slice(prefijo.length)) - Number(b.slice(prefijo.length)))
    .flatMap(([, v]) => v.split(",").filter(Boolean));
}
