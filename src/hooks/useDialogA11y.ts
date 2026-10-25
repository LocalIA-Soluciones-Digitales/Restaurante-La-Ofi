"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Última forma de interactuar (teclado o puntero). El foco que el diálogo mueve
// por código solo muestra el anillo si se está usando el teclado: abrir o cerrar
// con el ratón no deja un recuadro sobre "Cerrar" ni sobre el botón que lo abrió.
let conTeclado = false;
if (typeof document !== "undefined") {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key === "Enter" || e.key === " " || e.key === "Escape") conTeclado = true;
  }, true);
  document.addEventListener("pointerdown", () => {
    conTeclado = false;
  }, true);
}

// `focusVisible` (Chrome 122+, Firefox 104+, Safari 18.4+): sin soporte se ignora.
const enfocar = (el: HTMLElement | null | undefined) => el?.focus({ focusVisible: conTeclado } as FocusOptions);

/**
 * Comportamiento estándar de diálogo accesible (copiado de Palomita-Bar,
 * candidato a paquete compartido de LocalIA): cierra con Escape, bloquea el
 * scroll del fondo, mueve el foco dentro al abrir, lo atrapa con Tab y lo
 * devuelve a quien lo abrió al cerrar (con anillo visible solo si se usa el teclado).
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const containerRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    enfocar(first ?? container);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusables.length === 0) return;

      const firstEl = focusables[0]!;
      const lastEl = focusables[focusables.length - 1]!;

      if (event.shiftKey && document.activeElement === firstEl) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      enfocar(previouslyFocused);
    };
  }, []);

  return containerRef;
}
