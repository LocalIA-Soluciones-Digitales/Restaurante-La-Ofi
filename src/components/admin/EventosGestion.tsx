"use client";

import { useRef, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { Aviso, aCentimos, aEuros, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { borrar, guardar } from "@/lib/admin/actions";
import { firmarSubidaEvento } from "@/lib/admin/eventos-actions";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import type { EstadoEvento, MediaEvento } from "@/lib/restaurant/types";
import { supabaseNavegador } from "@/lib/supabase/browser";

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
  /** Sale como aviso emergente al entrar en la web (por defecto, sí). */
  aviso_web?: boolean;
  media?: MediaEvento[];
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Lado largo máximo de las fotos: de sobra para el aviso y la ficha, y una foto de móvil baja de ~8 MB a ~500 KB. */
const LADO_MAX = 2000;

/**
 * Reduce y pasa a JPEG las fotos antes de subirlas (las del móvil pesan 5-12 MB y
 * algunas llegan en HEIC, que Storage no admite). Los GIF y los vídeos van tal cual.
 * Si el navegador no sabe abrir la foto (HEIC fuera de Safari), lanza un error claro.
 */
async function prepararArchivo(archivo: File): Promise<File> {
  if (archivo.type.startsWith("video/") || archivo.type === "image/gif") return archivo;
  const heic = /heic|heif/i.test(archivo.type) || /\.(heic|heif)$/i.test(archivo.name);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    if (heic) throw new Error("es una foto HEIC del iPhone y este navegador no la abre. Súbela desde el iPhone o expórtala como JPG.");
    if (["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) return archivo;
    throw new Error("no es una foto ni un vídeo que se pueda subir (JPG, PNG, WebP, GIF, MP4, WebM o MOV).");
  }
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
  // Una foto pequeña que ya es JPEG/WebP no se toca.
  if (escala === 1 && ["image/jpeg", "image/webp"].includes(archivo.type) && archivo.size < 1_500_000) {
    bitmap.close();
    return archivo;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // los PNG transparentes, sobre blanco
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) return archivo;
  return new File([blob], archivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

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
    aviso_web: e?.aviso_web ?? true,
    media: e?.media ?? ([] as MediaEvento[]),
  });
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  /**
   * Sube cada archivo directo a Storage (subida firmada en el servidor) y lo añade a la galería.
   * Un archivo que falla no para a los demás, y los errores se juntan para verlos todos.
   */
  const subir = async (archivos: File[]) => {
    const sb = supabaseNavegador();
    if (!sb) return setError("Las fotos y vídeos no están disponibles en este entorno.");
    setError(null);
    const errores: string[] = [];
    const sitio = 20 - f.media.length;
    if (archivos.length > sitio) errores.push(`Caben ${Math.max(sitio, 0)} archivos más (máximo 20 por evento).`);
    try {
      for (const [i, original] of archivos.slice(0, Math.max(sitio, 0)).entries()) {
        setSubiendo(archivos.length > 1 ? `Subiendo ${i + 1} de ${Math.min(archivos.length, sitio)}…` : "Subiendo…");
        try {
          const archivo = await prepararArchivo(original);
          const firma = await firmarSubidaEvento(archivo.type, archivo.size);
          if (!firma.ok) throw new Error(firma.error);
          const { error: errSubida } = await sb.storage.from("laofi-eventos").uploadToSignedUrl(firma.data.ruta, firma.data.token, archivo, { contentType: archivo.type });
          if (errSubida) {
            console.error("[eventos] subida", errSubida);
            throw new Error(`no se ha podido subir (${errSubida.message}).`);
          }
          const nuevo: MediaEvento = { tipo: archivo.type.startsWith("video/") ? "video" : "imagen", url: firma.data.url };
          setF((x) => ({ ...x, media: [...x.media, nuevo] }));
        } catch (err) {
          errores.push(`${original.name}: ${err instanceof Error ? err.message : "no se ha podido subir."}`);
        }
      }
    } finally {
      setSubiendo(null);
      if (errores.length) setError(errores.join(" · "));
    }
  };

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
      media: f.media,
      aviso_web: f.aviso_web,
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
        <div className="grid gap-2 text-sm sm:col-span-2">
          <span className="font-semibold">Fotos y vídeos (solo reales del local o del evento; hasta 50 MB cada uno)</span>
          {f.media.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {f.media.map((m) => (
                <li key={m.url} className="relative aspect-square overflow-hidden rounded-xl bg-arena dark:bg-noche-3">
                  {m.tipo === "video" ? (
                    <video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel
                    <img src={m.url} alt="" className="h-full w-full object-cover" />
                  )}
                  {m.tipo === "video" ? (
                    <span className="absolute bottom-1 left-1 rounded-full bg-carbon/70 p-1 text-crema">
                      <Icon name="play" className="h-3 w-3" />
                    </span>
                  ) : null}
                  {!f.imagen_url.trim() && m.url === f.media.find((x) => x.tipo === "imagen")?.url ? (
                    <span className="absolute left-1 top-1 rounded-full bg-ratan px-2 py-0.5 text-xs font-semibold text-carbon">Portada</span>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Quitar"
                    onClick={() => set({ media: f.media.filter((x) => x.url !== m.url) })}
                    className="absolute right-1 top-1 rounded-full bg-carbon/70 p-1 text-crema hover:bg-terracota"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            ref={archivoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            multiple
            hidden
            onChange={(x) => {
              const archivos = Array.from(x.target.files ?? []);
              x.target.value = "";
              if (archivos.length) void subir(archivos);
            }}
          />
          <button type="button" onClick={() => archivoRef.current?.click()} disabled={subiendo !== null} className={`${botonSecundario} justify-self-start`}>
            <Icon name="plus" className="h-4 w-4" />
            {subiendo ?? "Añadir fotos o vídeos"}
          </button>
        </div>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">Portada (opcional: URL o /images/…; vacía = la primera foto subida)</span>
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
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.aviso_web} onChange={(x) => set({ aviso_web: x.target.checked })} className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <span className="font-semibold">Anunciarlo al entrar en la web</span>
            <span className="block opacity-70">Sale un aviso con las fotos a quien entra en la web, hasta el día del evento (una vez por visitante).</span>
          </span>
        </label>
        {error ? (
          <div className="sm:col-span-2">
            <Aviso>{error}</Aviso>
          </div>
        ) : null}
        <div className="flex gap-2 sm:col-span-2">
          <button type="button" onClick={() => void enviar()} disabled={!f.titulo.trim() || !f.fecha || subiendo !== null} className={`${botonPrimario} flex-1`}>
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
