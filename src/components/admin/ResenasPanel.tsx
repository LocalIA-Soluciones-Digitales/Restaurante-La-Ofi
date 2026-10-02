"use client";

import { useState } from "react";
import { Aviso, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { guardar } from "@/lib/admin/actions";

export interface Resena {
  id: string;
  nombre: string;
  puntuacion: number;
  texto: string;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  respuesta: string | null;
  created_at: string;
}

/**
 * Reseñas (portado de ResenaForm/moderación de Palomita), APAGADAS por defecto.
 * Solo se publican las aprobadas y tal cual las escribió el cliente: nunca se
 * editan ni se inventan (RESEARCH.md §7).
 */
export function ResenasPanel({ activa: a0, inicial }: { activa: boolean; inicial: Resena[] }) {
  const [activa, setActiva] = useState(a0);
  const [resenas, setResenas] = useState(inicial);
  const [error, setError] = useState<string | null>(null);

  const cambiar = async (r: Resena, patch: Partial<Resena>) => {
    const x = await guardar<Resena>("resenas", { id: r.id, ...patch });
    if (!x.ok) return setError(x.error);
    setResenas((l) => l.map((y) => (y.id === r.id ? x.data : y)));
  };

  return (
    <div className="grid gap-4">
      <section className={`${card} p-5`}>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={activa}
            onChange={async (e) => {
              const r = await guardar("ajustes", { clave: "resenas", valor: { activa: e.target.checked } });
              if (r.ok) setActiva(e.target.checked);
              else setError(r.error);
            }}
            className="mt-1 h-5 w-5"
          />
          <span>
            <b>Opiniones en la web</b>
            <span className="block text-sm opacity-70">Los clientes pueden dejar su opinión; solo se publican las que apruebes, sin editar su texto.</span>
          </span>
        </label>
      </section>
      {error ? <Aviso>{error}</Aviso> : null}
      <ul className="grid gap-3">
        {resenas.length === 0 ? <li className="opacity-60">No hay opiniones.</li> : null}
        {resenas.map((r) => (
          <li key={r.id} className={`${card} grid gap-2 p-5`}>
            <p className="flex flex-wrap items-center gap-2">
              <b>{r.nombre}</b>
              <span aria-label={`${r.puntuacion} de 5`} className="text-ratan">
                {"★".repeat(r.puntuacion)}
                <span className="opacity-30">{"★".repeat(5 - r.puntuacion)}</span>
              </span>
              <span className="text-xs opacity-60">{new Date(r.created_at).toLocaleDateString("es-ES")}</span>
              <span className="ml-auto rounded-full bg-arena px-2 py-0.5 text-xs font-semibold dark:bg-noche-3">{r.estado.toLowerCase()}</span>
            </p>
            <p className="text-sm">{r.texto}</p>
            <input defaultValue={r.respuesta ?? ""} onBlur={(e) => e.target.value !== (r.respuesta ?? "") && void cambiar(r, { respuesta: e.target.value || null })} placeholder="Respuesta pública (opcional)" className={input} />
            <div className="flex gap-2">
              {r.estado !== "APROBADA" ? (
                <button type="button" onClick={() => void cambiar(r, { estado: "APROBADA" })} className={botonPrimario}>
                  <Icon name="check" className="h-4 w-4" />
                  Publicar
                </button>
              ) : null}
              {r.estado !== "RECHAZADA" ? (
                <button type="button" onClick={() => void cambiar(r, { estado: "RECHAZADA" })} className={botonSecundario}>
                  Ocultar
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
