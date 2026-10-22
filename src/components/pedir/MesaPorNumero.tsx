"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { mesaPorNumero } from "@/lib/pedidos/actions";

/**
 * Pedir en mesa sin QR (QR perdido, roto o mesa sin pegatina): el cliente escribe
 * su número y entra en la misma carta de mesa que con el QR. Solo funciona si la
 * mesa ya está abierta (sentada por sala o con alguien pidiendo): así nadie puede
 * pedir a una mesa vacía desde fuera. Si no lo está, o no sabe el número, se le
 * dice qué hacer: avisar al personal o pedir para recoger en barra.
 */
export function MesaPorNumero({ hayRecogida }: { hayRecogida: boolean }) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const ir = async (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(null);
    setBuscando(true);
    try {
      const r = await mesaPorNumero(numero);
      if (!r.ok) return setAviso(r.error);
      if (!r.data) return setAviso(`No encontramos la mesa «${numero.trim()}». Comprueba el número en la mesa o pregunta al personal.`);
      if (r.data.estado === "cerrada") {
        return setAviso(
          `La mesa ${numero.trim().toUpperCase()} aún no está abierta. Pide a un camarero que la abra y vuelve a intentarlo${hayRecogida ? ", o pide aquí abajo para recoger en barra." : "."}`,
        );
      }
      router.push(`/es/pedir?mesa=${r.data.token}`);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <section aria-labelledby="mesa-numero-titulo" className="rounded-[1.5rem] border border-carbon/10 bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-marino text-crema">
          <Icon name="utensils" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="mesa-numero-titulo" className="font-display text-xl text-carbon">
            ¿Ya estás sentado en una mesa?
          </h2>
          <p className="mt-1 text-sm text-carbon-muted">Escribe su número y pide sin levantarte. Lo verás en la mesa.</p>
        </div>
      </div>
      <form onSubmit={(e) => void ir(e)} className="mt-4 flex gap-2">
        <label htmlFor="mesa-numero" className="sr-only">
          Número de mesa
        </label>
        <input
          id="mesa-numero"
          value={numero}
          onChange={(e) => setNumero(e.target.value.slice(0, 20))}
          placeholder="Ej. 12 o T3"
          autoComplete="off"
          autoCapitalize="characters"
          className="h-12 min-w-0 flex-1 rounded-2xl border border-carbon/15 bg-white px-4 text-base focus:border-marino focus:outline-none"
        />
        <button type="submit" disabled={buscando || !numero.trim()} className="btn-primary shrink-0 disabled:opacity-50">
          {buscando ? "Buscando…" : "Ir a mi mesa"}
        </button>
      </form>
      {aviso ? (
        <p role="alert" className="mt-3 flex gap-2 rounded-2xl bg-arena p-3 text-sm text-carbon">
          <Icon name="info" className="mt-0.5 h-4 w-4 shrink-0 text-marino" />
          {aviso}
        </p>
      ) : (
        <p className="mt-3 text-xs text-carbon-muted">
          ¿No sabes tu número? Pregúntalo al personal{hayRecogida ? " o pide aquí abajo para recoger en barra con tu nombre" : ""}.
        </p>
      )}
    </section>
  );
}
