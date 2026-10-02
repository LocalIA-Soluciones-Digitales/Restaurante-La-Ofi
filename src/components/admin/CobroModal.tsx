"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { Aviso, aCentimos, botonPrimario, botonSecundario, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { formatCentimos } from "@/lib/format";
import { repartirLinea } from "@/lib/pedidos/reparto";

/**
 * Cobro en TPV (efectivo o tarjeta). Permite dividir la cuenta en N partes
 * iguales (al céntimo) y cobrarlas una a una; en efectivo calcula el cambio.
 */
export function CobroModal({
  titulo,
  pendiente,
  onCobrar,
  onImprimir,
  onClose,
}: {
  titulo: string;
  pendiente: number;
  onCobrar: (metodo: "EFECTIVO" | "TARJETA", importe: number) => Promise<{ ok: boolean; error?: string; pendiente?: number }>;
  onImprimir?: () => void;
  onClose: () => void;
}) {
  const [resta, setResta] = useState(pendiente);
  const [partes, setPartes] = useState(1);
  const [pagadas, setPagadas] = useState(0);
  const [entregado, setEntregado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const quedan = Math.max(1, partes - pagadas);
  const importe = partes > 1 ? (repartirLinea(resta, Array.from({ length: quedan }, (_, i) => String(i)))[0]?.importe_centimos ?? resta) : resta;
  const entregadoC = aCentimos(entregado);
  const cambio = entregadoC !== null && entregadoC >= importe ? entregadoC - importe : null;

  const cobrar = async (metodo: "EFECTIVO" | "TARJETA") => {
    setEnviando(true);
    setError(null);
    const r = await onCobrar(metodo, importe);
    setEnviando(false);
    if (!r.ok) return setError(r.error ?? "No se ha podido cobrar.");
    const nuevo = r.pendiente ?? resta - importe;
    setResta(nuevo);
    setPagadas((n) => n + 1);
    setEntregado("");
    if (nuevo <= 0) onClose();
  };

  return (
    <Modal titulo={titulo} onClose={onClose}>
      <div className="grid gap-5">
        <div className="flex items-baseline justify-between">
          <span className="text-carbon-muted dark:text-crema/60">Pendiente</span>
          <span className="font-display text-4xl tabular-nums">{formatCentimos(resta)}</span>
        </div>

        <div>
          <p className="text-sm font-semibold">Dividir la cuenta</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={partes === n}
                disabled={pagadas > 0}
                onClick={() => setPartes(n)}
                className="min-h-11 min-w-11 rounded-xl border border-carbon/15 px-3 font-semibold aria-pressed:border-marino aria-pressed:bg-[theme(colors.marino.DEFAULT)] aria-pressed:text-crema disabled:opacity-40 dark:border-crema/15 dark:aria-pressed:bg-neon dark:aria-pressed:text-noche"
              >
                {n === 1 ? "Entera" : n}
              </button>
            ))}
          </div>
          {partes > 1 ? (
            <p className="mt-2 text-sm text-carbon-muted dark:text-crema/60">
              Parte {pagadas + 1} de {partes}: <b className="text-carbon dark:text-crema">{formatCentimos(importe)}</b>
            </p>
          ) : null}
        </div>

        <div>
          <label className="text-sm font-semibold" htmlFor="entregado">
            Entregado en efectivo
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input id="entregado" inputMode="decimal" value={entregado} onChange={(e) => setEntregado(e.target.value)} placeholder="0,00" className={`${input} max-w-32 text-right text-lg`} />
            {[5, 10, 20, 50].map((b) => (
              <button key={b} type="button" onClick={() => setEntregado(String(b))} className={botonSecundario}>
                {b} €
              </button>
            ))}
          </div>
          {cambio !== null ? (
            <p className="mt-2 text-lg font-semibold text-oliva">Cambio: {formatCentimos(cambio)}</p>
          ) : entregadoC !== null ? (
            <p className="mt-2 text-sm text-terracota">Falta {formatCentimos(importe - entregadoC)}</p>
          ) : null}
        </div>

        {error ? <Aviso>{error}</Aviso> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" disabled={enviando || resta <= 0} onClick={() => void cobrar("EFECTIVO")} className={`${botonPrimario} min-h-14 text-base`}>
            <Icon name="cash" className="h-5 w-5" />
            Efectivo · {formatCentimos(importe)}
          </button>
          <button type="button" disabled={enviando || resta <= 0} onClick={() => void cobrar("TARJETA")} className={`${botonPrimario} min-h-14 text-base`}>
            <Icon name="card" className="h-5 w-5" />
            Tarjeta · {formatCentimos(importe)}
          </button>
        </div>
        {onImprimir ? (
          <button type="button" onClick={onImprimir} className={botonSecundario}>
            <Icon name="print" className="h-4 w-4" />
            Imprimir cuenta
          </button>
        ) : null}
      </div>
    </Modal>
  );
}
