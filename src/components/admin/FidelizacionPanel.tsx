"use client";

import { useState } from "react";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { borrar, guardar } from "@/lib/admin/actions";

export interface Regla {
  id: string;
  nombre: string;
  visitas_requeridas: number;
  ventana_dias: number | null;
  hora_desde: string | null;
  hora_hasta: string | null;
  premio: string;
  activa: boolean;
}

export interface Premio {
  id: string;
  comensal_id: string;
  regla_id: string;
  visitas: number;
  estado: "PENDIENTE" | "CANJEADO";
  fecha_otorgado: string;
}

export interface Comensal {
  id: string;
  nombre: string | null;
  telefono: string;
}

/**
 * Fidelización (portado de ReglasFidelizacionGestion + PremiosGestion de
 * Palomita), APAGADA por defecto: al activarla, las reservas guardan al cliente
 * por su teléfono y cada N visitas sentadas se le concede un premio.
 */
export function FidelizacionPanel({ activa: a0, reglas: r0, premios: p0, comensales }: { activa: boolean; reglas: Regla[]; premios: Premio[]; comensales: Comensal[] }) {
  const [activa, setActiva] = useState(a0);
  const [reglas, setReglas] = useState(r0);
  const [premios, setPremios] = useState(p0);
  const [nueva, setNueva] = useState({ nombre: "", visitas_requeridas: 5, ventana_dias: "", premio: "" });
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const comensal = (id: string) => comensales.find((c) => c.id === id);

  return (
    <div className="grid gap-4">
      <section className={`${card} p-5`}>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={activa}
            onChange={async (e) => {
              const r = await guardar("ajustes", { clave: "fidelizacion", valor: { activa: e.target.checked } });
              if (r.ok) setActiva(e.target.checked);
              else setAviso({ tono: "error", texto: r.error });
            }}
            className="mt-1 h-5 w-5"
          />
          <span>
            <b>Programa de fidelización activo</b>
            <span className="block text-sm opacity-70">
              Guarda nombre y teléfono de quien reserva. Antes de activarlo, la política de privacidad debe informar de este uso (aviso legal pendiente en CONTENT_NEEDED.md).
            </span>
          </span>
        </label>
      </section>
      <AvisoFlotante aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className={`${card} p-5`}>
        <h2 className="font-display text-2xl">Reglas</h2>
        <ul className="mt-3 grid gap-2">
          {reglas.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-arena p-3 dark:bg-noche-3">
              <span className="flex-1">
                <b>{r.nombre}</b> · cada {r.visitas_requeridas} visitas{r.ventana_dias ? ` en ${r.ventana_dias} días` : ""} → {r.premio}
              </span>
              <button
                type="button"
                aria-pressed={r.activa}
                onClick={async () => {
                  const x = await guardar<Regla>("reglas_promocion", { id: r.id, activa: !r.activa });
                  if (x.ok) setReglas((l) => l.map((y) => (y.id === r.id ? x.data : y)));
                }}
                className={botonSecundario}
              >
                {r.activa ? "Activa" : "Pausada"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("¿Borrar la regla?")) return;
                  const x = await borrar("reglas_promocion", r.id);
                  if (x.ok) setReglas((l) => l.filter((y) => y.id !== r.id));
                }}
                className={botonSecundario}
              >
                <Icon name="trash" className="h-4 w-4" />
                <span className="sr-only">Borrar regla</span>
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 grid gap-2 sm:grid-cols-[2fr_6rem_6rem_2fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await guardar<Regla>("reglas_promocion", { ...nueva, ventana_dias: nueva.ventana_dias ? Number(nueva.ventana_dias) : null });
            if (!r.ok) return setAviso({ tono: "error", texto: r.error });
            setReglas((l) => [...l, r.data]);
            setNueva({ nombre: "", visitas_requeridas: 5, ventana_dias: "", premio: "" });
          }}
        >
          <input required value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Nombre (p. ej. Menú del día)" className={input} />
          <input type="number" min={1} value={nueva.visitas_requeridas} onChange={(e) => setNueva({ ...nueva, visitas_requeridas: Number(e.target.value) })} aria-label="Visitas" className={input} />
          <input value={nueva.ventana_dias} onChange={(e) => setNueva({ ...nueva, ventana_dias: e.target.value.replace(/\D/g, "") })} placeholder="Días" aria-label="Ventana en días (opcional)" className={input} />
          <input required value={nueva.premio} onChange={(e) => setNueva({ ...nueva, premio: e.target.value })} placeholder="Premio (p. ej. café gratis)" className={input} />
          <button type="submit" className={botonPrimario}>
            Añadir
          </button>
        </form>
      </section>

      <section className={`${card} p-5`}>
        <h2 className="font-display text-2xl">Premios</h2>
        {premios.length === 0 ? <p className="mt-2 text-sm opacity-60">Sin premios todavía.</p> : null}
        <ul className="mt-3 grid gap-2">
          {premios.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-arena p-3 dark:bg-noche-3">
              <span className="flex-1">
                <b>{comensal(p.comensal_id)?.nombre ?? "Cliente"}</b> · {comensal(p.comensal_id)?.telefono} · {reglas.find((r) => r.id === p.regla_id)?.premio} ({p.visitas} visitas)
              </span>
              {p.estado === "PENDIENTE" ? (
                <button
                  type="button"
                  className={botonPrimario}
                  onClick={async () => {
                    const r = await guardar<Premio>("premios_otorgados", { id: p.id, estado: "CANJEADO", fecha_canjeado: new Date().toISOString() });
                    if (r.ok) setPremios((l) => l.map((x) => (x.id === p.id ? r.data : x)));
                  }}
                >
                  Canjear
                </button>
              ) : (
                <span className="text-sm opacity-60">Canjeado</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
