"use client";

import { botonPrimario } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";

export function BotonImprimir({ texto = "Imprimir" }: { texto?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={botonPrimario}>
      <Icon name="print" className="h-4 w-4" />
      {texto}
    </button>
  );
}
