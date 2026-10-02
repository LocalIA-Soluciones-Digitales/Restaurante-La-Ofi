"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { Aviso, aCentimos, aEuros, botonPeligro, botonPrimario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { borrar, guardar } from "@/lib/admin/actions";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import type { EstadoEvento } from "@/lib/restaurant/types";

export interface EventoBd {
  id: string;
  slug: string;
  titulo: string;
  tipo: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  fecha: string;
  hora: string | null;
  precio_centimos: number | null;
  aforo: number | null;
  estado: EstadoEvento;
  enlace_reserva: string | null;
  publicado: boolean;
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const TIPOS = ["Tardeo", "Partido", "Música en directo", "Celebración", "Empresa", "Otro"];

/** Eventos (tardeos, partidos, celebraciones): borradores, aforo, precio e imagen. */
export function EventosGestion({ inicial }: { inicial: EventoBd[] }) {
  const [eventos, setEventos] = useState(inicial);
  const [editando, setEditando] = useState<EventoBd | "nuevo" | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditando("nuevo")} className={botonPrimario}>
          <Icon name="plus" className="h-4 w-4" />
          Nuevo evento
        </button>
      </div>
      <AvisoFlotante aviso={aviso} onCerrar={() => setAviso(null)} />
      <ul className="grid gap-3 md:grid-cols-2">
        {eventos.length === 0 ? <li className="opacity-60">Todavía no hay eventos.</li> : null}
        {eventos.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => setEditando(e)} className={`${card} flex w-full flex-col gap-1 p-4 text-left hover:border-marino dark:hover:border-neon`}>
              <span className="flex items-center gap-2">
                <span className="font-display text-xl">{e.titulo}</span>
                {!e.publicado ? <span className="rounded-full bg-ratan px-2 py-0.5 text-xs font-semibold text-carbon">Borrador</span> : null}
                {e.estado !== "proximo" ? <span className="rounded-full bg-arena px-2 py-0.5 text-xs dark:bg-noche-3">{e.estado}</span> : null}
              </span>
              <span className="text-sm opacity-70 first-letter:uppercase">
                {formatearFechaLarga(e.fecha)}
                {e.hora ? ` · ${e.hora.slice(0, 5)}` : ""}
                {e.precio_centimos !== null ? ` · ${e.precio_centimos === 0 ? "entrada libre" : formatCentimos(e.precio_centimos)}` : ""}
                {e.aforo ? ` · aforo ${e.aforo}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {editando ? (
        <EventoForm
          evento={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardado={(ev) => {
            setEventos((l) => (l.some((x) => x.id === ev.id) ? l.map((x) => (x.id === ev.id ? ev : x)) : [ev, ...l]));
            setEditando(null);
            setAviso({ tono: "ok", texto: ev.publicado ? `«${ev.titulo}» publicado.` : `«${ev.titulo}» guardado como borrador.` });
          }}
          onBorrado={(id) => {
            setEventos((l) => l.filter((x) => x.id !== id));
            setEditando(null);
            setAviso({ tono: "ok", texto: "Evento borrado." });
          }}
        />
      ) : null}
    </div>
  );
}

function EventoForm({ evento, onClose, onGuardado, onBorrado }: { evento: EventoBd | null; onClose: () => void; onGuardado: (e: EventoBd) => void; onBorrado: (id: string) => void }) {
  const e = evento;
  const [f, setF] = useState({
    titulo: e?.titulo ?? "",
    tipo: e?.tipo ?? "Tardeo",
    descripcion: e?.descripcion ?? "",
    fecha: e?.fecha ?? "",
    hora: e?.hora?.slice(0, 5) ?? "",
    precio: aEuros(e?.precio_centimos),
    aforo: e?.aforo?.toString() ?? "",
    estado: e?.estado ?? ("proximo" as EstadoEvento),
    enlace_reserva: e?.enlace_reserva ?? "",
    imagen_url: e?.imagen_url ?? "",
    publicado: e?.publicado ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const enviar = async () => {
    setError(null);
    if (f.enlace_reserva && !f.enlace_reserva.startsWith("https://")) return setError("El enlace de reserva debe empezar por https://");
    const r = await guardar<EventoBd>("eventos", {
      ...(e ? { id: e.id } : { slug: `${slugify(f.titulo)}-${f.fecha}` }),
      titulo: f.titulo.trim(),
      tipo: f.tipo,
      descripcion: f.descripcion.trim() || null,
      fecha: f.fecha,
      hora: f.hora || null,
      precio_centimos: aCentimos(f.precio),
      aforo: f.aforo ? Number(f.aforo) : null,
      estado: f.estado,
      enlace_reserva: f.enlace_reserva.trim() || null,
      imagen_url: f.imagen_url.trim() || null,
      publicado: f.publicado,
    });
    if (!r.ok) return setError(r.error);
    onGuardado(r.data);
  };

  return (
    <Modal titulo={e ? e.titulo : "Nuevo evento"} onClose={onClose} ancho="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">Título</span>
          <input value={f.titulo} onChange={(x) => set({ titulo: x.target.value })} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Tipo</span>
          <select value={f.tipo} onChange={(x) => set({ tipo: x.target.value })} className={input}>
            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Estado</span>
          <select value={f.estado} onChange={(x) => set({ estado: x.target.value as EstadoEvento })} className={input}>
            <option value="proximo">Próximo</option>
            <option value="agotado">Agotado</option>
            <option value="cancelado">Cancelado</option>
            <option value="finalizado">Finalizado</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Fecha</span>
          <input type="date" value={f.fecha} onChange={(x) => set({ fecha: x.target.value })} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Hora</span>
          <input type="time" value={f.hora} onChange={(x) => set({ hora: x.target.value })} className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Precio € (0 = entrada libre, vacío = sin precio)</span>
          <input value={f.precio} onChange={(x) => set({ precio: x.target.value })} inputMode="decimal" className={input} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Aforo</span>
          <input value={f.aforo} onChange={(x) => set({ aforo: x.target.value.replace(/\D/g, "") })} inputMode="numeric" className={input} />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">Descripción</span>
          <textarea value={f.descripcion} onChange={(x) => set({ descripcion: x.target.value })} rows={3} className={`${input} h-auto py-2`} />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">Imagen (URL o /images/…; solo fotos reales del local o del evento)</span>
          <input value={f.imagen_url} onChange={(x) => set({ imagen_url: x.target.value })} className={input} />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">Enlace de reserva (opcional, https://)</span>
          <input value={f.enlace_reserva} onChange={(x) => set({ enlace_reserva: x.target.value })} className={input} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
          <input type="checkbox" checked={f.publicado} onChange={(x) => set({ publicado: x.target.checked })} className="h-5 w-5" />
          Publicado (si no, queda como borrador y no sale en la web)
        </label>
        {error ? (
          <div className="sm:col-span-2">
            <Aviso>{error}</Aviso>
          </div>
        ) : null}
        <div className="flex gap-2 sm:col-span-2">
          <button type="button" onClick={() => void enviar()} disabled={!f.titulo.trim() || !f.fecha} className={`${botonPrimario} flex-1`}>
            Guardar
          </button>
          {e ? (
            <button
              type="button"
              className={botonPeligro}
              onClick={async () => {
                if (!window.confirm(`¿Borrar «${e.titulo}»?`)) return;
                const r = await borrar("eventos", e.id);
                if (!r.ok) return setError(r.error);
                onBorrado(e.id);
              }}
            >
              <Icon name="trash" className="h-4 w-4" />
              Borrar
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
