"use client";

import type { ReactNode } from "react";
import { botonSecundario } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { SITE_URL } from "@/lib/env";
import { enlaceReserva, enlaceSms, enlaceWhatsApp, textoAviso, type AvisoReserva, type ReservaAvisable } from "@/lib/reservas/mensajes";
import { SITE } from "@/lib/site";

type ConTelefono = ReservaAvisable & { telefono: string; email?: string | null };

const texto = (tipo: AvisoReserva, r: ConTelefono) => textoAviso(tipo, r, enlaceReserva(SITE_URL, r.id), SITE.phone.display);

/** Qué mensaje toca según cómo está la reserva ahora mismo. */
export const avisoSegunEstado = (estado: string): AvisoReserva => (estado === "CANCELADA" || estado === "NO_SHOW" ? "cancelada" : estado === "PENDIENTE" ? "recibida" : "confirmada");

/** WhatsApp con el mensaje ya escrito: solo falta darle a enviar. */
export function BotonWhatsApp({ tipo, reserva, className = botonSecundario, children }: { tipo: AvisoReserva; reserva: ConTelefono; className?: string; children?: ReactNode }) {
  return (
    <a href={enlaceWhatsApp(reserva.telefono, texto(tipo, reserva))} target="_blank" rel="noopener noreferrer" className={className}>
      <Icon name="whatsapp" className="h-4 w-4" />
      {children ?? "WhatsApp"}
    </a>
  );
}

/**
 * Tras confirmar o cancelar: el cliente aún no lo sabe. Se queda abajo hasta que se
 * le avisa (WhatsApp o SMS con el texto escrito) o se cierra, porque ya se le ha llamado.
 */
export function AvisarCliente({ tipo, reserva, email, onCerrar }: { tipo: AvisoReserva; reserva: ConTelefono; email: boolean; onCerrar: () => void }) {
  const confirmada = tipo === "confirmada";
  return (
    <div role="status" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-carbon/10 motion-safe:animate-[intro-up_220ms_cubic-bezier(0.2,0.8,0.2,1)] dark:bg-noche-2 dark:ring-crema/15 sm:bottom-6">
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-crema ${confirmada ? "bg-ok" : "bg-terracota"}`}>
          <Icon name={confirmada ? "check" : "close"} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {reserva.nombre}: {confirmada ? "confirmada" : "cancelada"}
          </p>
          <p className="text-sm text-carbon-muted dark:text-crema/65">
            {email ? (
              <>
                Le llega un email a <span className="break-all">{reserva.email}</span>. Si no suele mirarlo, mándale también un WhatsApp.
              </>
            ) : (
              "Aún no lo sabe: avísale con un toque (el mensaje va ya escrito)."
            )}
          </p>
        </div>
        <button type="button" onClick={onCerrar} className="-m-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg hover:bg-arena dark:hover:bg-noche-3" aria-label="Cerrar">
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <a
          href={enlaceWhatsApp(reserva.telefono, texto(tipo, reserva))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => window.setTimeout(onCerrar, 300)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1F7A4D] px-4 text-sm font-semibold text-white hover:brightness-110"
        >
          <Icon name="whatsapp" className="h-4 w-4" />
          Avisar por WhatsApp
        </a>
        <a href={enlaceSms(reserva.telefono, texto(tipo, reserva))} onClick={() => window.setTimeout(onCerrar, 300)} className={botonSecundario}>
          SMS
        </a>
      </div>
    </div>
  );
}
