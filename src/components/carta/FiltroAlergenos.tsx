"use client";

import { useState } from "react";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { ALERGENOS, type AlergenoKey } from "@/lib/allergens";

/** Hoja para excluir alérgenos (los 14 del Reglamento UE 1169/2011). */
export function FiltroAlergenos({
  seleccion,
  onChange,
  onClose,
}: {
  seleccion: ReadonlySet<AlergenoKey>;
  onChange: (s: Set<AlergenoKey>) => void;
  onClose: () => void;
}) {
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  const [local, setLocal] = useState(() => new Set(seleccion));

  const toggle = (k: AlergenoKey) =>
    setLocal((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alergenos-titulo"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[88svh] w-full max-w-xl flex-col rounded-t-[2rem] bg-crema shadow-lift animate-sheet-up sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-carbon/10 p-6">
          <div>
            <h2 id="alergenos-titulo" className="text-2xl text-carbon">
              Ocultar platos con…
            </h2>
            <p className="mt-1 text-sm text-carbon-muted">Solo se muestran los platos con alérgenos confirmados que no contengan lo que marques.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-carbon/15">
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 overflow-y-auto p-6">
          {ALERGENOS.map((a) => {
            const activo = local.has(a.key);
            return (
              <button
                key={a.key}
                type="button"
                aria-pressed={activo}
                onClick={() => toggle(a.key)}
                className="flex min-h-12 items-center gap-2 rounded-2xl border border-carbon/15 bg-white px-3 text-left text-sm text-carbon transition-colors aria-pressed:border-terracota aria-pressed:bg-terracota aria-pressed:text-crema"
              >
                <AllergenIcon alergeno={a.key} className="h-5 w-5 shrink-0" />
                {a.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 border-t border-carbon/10 p-4 sm:p-6">
          <button type="button" onClick={() => setLocal(new Set())} className="btn-secondary flex-1">
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(local);
              onClose();
            }}
            className="btn-primary flex-1"
          >
            Aplicar{local.size > 0 ? ` (${local.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
