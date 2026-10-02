"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";

/** Modal accesible del panel (hoja inferior en móvil). */
export function Modal({ titulo, onClose, children, ancho = "max-w-lg" }: { titulo: string; onClose: () => void; children: ReactNode; ancho?: string }) {
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`flex max-h-[94svh] w-full ${ancho} flex-col rounded-t-[1.75rem] bg-crema text-carbon shadow-lift animate-sheet-up dark:bg-noche-2 dark:text-crema sm:rounded-[1.75rem]`}>
        <div className="flex items-center justify-between gap-4 border-b border-carbon/10 px-5 py-4 dark:border-crema/10">
          <h2 className="font-display text-2xl">{titulo}</h2>
          <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full border border-carbon/15 dark:border-crema/15">
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
