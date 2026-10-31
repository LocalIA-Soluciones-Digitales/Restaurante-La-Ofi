"use client";

import { useRef, useState } from "react";
import { ApuntadosEvento } from "@/components/admin/ApuntadosEvento";
import { Modal } from "@/components/admin/Modal";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { Aviso, aCentimos, aEuros, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { borrar, guardar } from "@/lib/admin/actions";
import { firmarSubidaEvento } from "@/lib/admin/eventos-actions";
import { formatCentimos, formatearFechaLarga } from "@/lib/format";
import type { EstadoEvento, MediaEvento, SubEvento } from "@/lib/restaurant/types";
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
  /** Sale como aviso emergente al entrar en la web. Solo uno a la vez. */
  aviso_web?: boolean;
  media?: MediaEvento[];
  /** Partes del día (actuación, DJ…), cada una con su hora y su cartel. */
  programa?: SubEvento[];
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

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());

/**
 * Eventos de todo el año (tardeos, partidos, celebraciones). Todos los publicados
 * salen en la agenda de /eventos; además, Carlos elige UNO para anunciarlo con el
 * aviso emergente al entrar en la web.
 */
/** Por evento: personas apuntadas y en cuántas solicitudes (sin las canceladas). */
export type Asistentes = Record<string, { personas: number; grupos: number }>;

export function EventosGestion({ inicial, asistentes: asistentesIniciales = {} }: { inicial: EventoBd[]; asistentes?: Asistentes }) {
  const [eventos, setEventos] = useState(inicial);
  const [asistentes, setAsistentes] = useState(asistentesIniciales);
  const [viendoApuntados, setViendoApuntados] = useState<EventoBd | null>(null);
  const [editando, setEditando] = useState<EventoBd | "nuevo" | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const [cambiando, setCambiando] = useState<string | null>(null);

  /** Deja anunciado solo `id` (o ninguno, con null): quita el aviso a los demás. */
  const anunciarSolo = async (id: string | null) => {
    for (const x of eventos.filter((x) => x.aviso_web && x.id !== id)) {
      const r = await guardar<EventoBd>("eventos", { id: x.id, aviso_web: false });
      if (!r.ok) return r;
    }
    if (id && !eventos.find((x) => x.id === id)?.aviso_web) {
      const r = await guardar<EventoBd>("eventos", { id, aviso_web: true });
      if (!r.ok) return r;
    }
    setEventos((l) => l.map((x) => ({ ...x, aviso_web: x.id === id })));
    return { ok: true as const };
  };

  const alternarAnuncio = async (e: EventoBd) => {
    setCambiando(e.id);
    const r = await anunciarSolo(e.aviso_web ? null : e.id);
    setCambiando(null);
    if (!r.ok) return setAviso({ tono: "error", texto: r.error });
    setAviso({
      tono: "ok",
      texto: e.aviso_web
        ? `«${e.titulo}» ya no sale al entrar en la web.`
        : `«${e.titulo}» saldrá en el aviso al entrar en la web${e.publicado ? "" : " cuando lo publiques"}.`,
    });
  };

  // Primero lo que viene (por fecha) y al final lo ya celebrado (lo más reciente antes).
  const hoyISO = hoy();
  const ordenados = [...eventos].sort((a, b) => {
    const pa = a.fecha < hoyISO;
    const pb = b.fecha < hoyISO;
    if (pa !== pb) return pa ? 1 : -1;
    return pa ? b.fecha.localeCompare(a.fecha) : a.fecha.localeCompare(b.fecha);
  });

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
        {eventos.length === 0 ? <li className="opacity-60">Todavía no hay eventos. Puedes meter ya los de todo el año y luego elegir cuál anunciar.</li> : null}
        {ordenados.map((e) => {
          const pasado = e.fecha < hoyISO;
          const portada = e.imagen_url || e.media?.find((m) => m.tipo === "imagen")?.url || e.programa?.find((p) => p.imagen)?.imagen;
          return (
            <li key={e.id} className={`${card} grid gap-3 p-3 ${pasado ? "opacity-60" : ""} ${e.aviso_web && !pasado ? "border-neon-deep ring-2 ring-neon-deep/30" : ""}`}>
              <div className="flex gap-3">
              <button type="button" onClick={() => setEditando(e)} className="flex min-w-0 flex-1 gap-3 text-left">
                <span className="h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-arena dark:bg-noche-3">
                  {portada ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel
                    <img src={portada} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl">{e.titulo}</span>
                    {!e.publicado ? <span className="rounded-full bg-ratan px-2 py-0.5 text-xs font-semibold text-carbon">Borrador</span> : null}
                    {pasado ? (
                      <span className="rounded-full bg-arena px-2 py-0.5 text-xs dark:bg-noche-3">Celebrado</span>
                    ) : e.estado !== "proximo" ? (
                      <span className="rounded-full bg-arena px-2 py-0.5 text-xs dark:bg-noche-3">{e.estado}</span>
                    ) : null}
                  </span>
                  <span className="text-sm opacity-70 first-letter:uppercase">
                    {formatearFechaLarga(e.fecha)}
                    {e.hora ? ` · ${e.hora.slice(0, 5)}` : ""}
                    {e.precio_centimos !== null ? ` · ${e.precio_centimos === 0 ? "entrada libre" : formatCentimos(e.precio_centimos)}` : ""}
                    {e.aforo ? ` · aforo ${e.aforo}` : ""}
                  </span>
                  {e.programa?.length ? (
                    <span className="truncate text-sm opacity-70">{e.programa.map((p) => `${p.hora ? `${p.hora.slice(0, 5)} ` : ""}${p.titulo}`).join(" · ")}</span>
                  ) : null}
                </span>
              </button>
              {!pasado ? (
                <button
                  type="button"
                  onClick={() => void alternarAnuncio(e)}
                  disabled={cambiando !== null}
                  aria-pressed={Boolean(e.aviso_web)}
                  title={e.aviso_web ? "Dejar de anunciarlo al entrar en la web" : "Anunciarlo al entrar en la web (quita el anuncio a los demás)"}
                  className={`flex w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-center text-xs font-semibold transition-colors ${
                    e.aviso_web ? "bg-neon-deep text-white" : "bg-arena hover:bg-arena-2 dark:bg-noche-3 dark:hover:bg-noche-2"
                  }`}
                >
                  <Icon name={e.aviso_web ? "star" : "bell"} className="h-5 w-5" />
                  {cambiando === e.id ? "…" : e.aviso_web ? "Anunciado" : "Anunciar"}
                </button>
              ) : null}
              </div>
              {!pasado && e.estado === "proximo" ? (
                // Toca para ver quién va, con su teléfono, y confirmarlos o cancelarlos.
                <button
                  type="button"
                  onClick={() => setViendoApuntados(e)}
                  className="flex min-h-11 items-center gap-2 rounded-xl bg-neon-soft px-3 text-left text-sm font-semibold text-neon-deep transition-colors hover:brightness-95 dark:bg-neon/15 dark:text-neon"
                >
                  <Icon name="users" className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {asistentes[e.id]?.grupos
                      ? `${asistentes[e.id]!.personas}${e.aforo ? ` de ${e.aforo}` : ""} apuntados · ${asistentes[e.id]!.grupos} ${asistentes[e.id]!.grupos === 1 ? "solicitud" : "solicitudes"}`
                      : "Nadie apuntado todavía"}
                  </span>
                  <span className="shrink-0 font-normal opacity-80">Ver lista</span>
                  <Icon name="chevronRight" className="h-4 w-4 shrink-0" />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {viendoApuntados ? (
        <ApuntadosEvento
          evento={viendoApuntados}
          onClose={() => setViendoApuntados(null)}
          onRecuento={(r) => setAsistentes((a) => ({ ...a, [viendoApuntados.id]: r ?? { personas: 0, grupos: 0 } }))}
        />
      ) : null}
      {editando ? (
        <EventoForm
          evento={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardado={async (ev) => {
            setEventos((l) => (l.some((x) => x.id === ev.id) ? l.map((x) => (x.id === ev.id ? ev : x)) : [ev, ...l]));
            setEditando(null);
            // Solo uno anunciado a la vez: al marcar este, se desmarcan los demás.
            if (ev.aviso_web) {
              const otros = eventos.filter((x) => x.aviso_web && x.id !== ev.id);
              for (const x of otros) await guardar<EventoBd>("eventos", { id: x.id, aviso_web: false });
              if (otros.length) setEventos((l) => l.map((x) => (x.id === ev.id ? x : { ...x, aviso_web: false })));
            }
            setAviso({
              tono: "ok",
              texto: ev.publicado
                ? `«${ev.titulo}» publicado en la agenda${ev.aviso_web ? " y anunciado al entrar en la web" : ""}.`
                : `«${ev.titulo}» guardado como borrador.`,
            });
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

/** Sube una foto o vídeo a Storage (subida firmada en el servidor) y devuelve su URL pública. */
async function subirArchivo(original: File): Promise<MediaEvento> {
  const sb = supabaseNavegador();
  if (!sb) throw new Error("las fotos y vídeos no están disponibles en este entorno.");
  const archivo = await prepararArchivo(original);
  const firma = await firmarSubidaEvento(archivo.type, archivo.size);
  if (!firma.ok) throw new Error(firma.error);
  const { error } = await sb.storage.from("laofi-eventos").uploadToSignedUrl(firma.data.ruta, firma.data.token, archivo, { contentType: archivo.type });
  if (error) {
    console.error("[eventos] subida", error);
    throw new Error(`no se ha podido subir (${error.message}).`);
  }
  return { tipo: archivo.type.startsWith("video/") ? "video" : "imagen", url: firma.data.url };
}

const SUB_VACIO: SubEvento = { hora: null, hora_fin: null, titulo: "", descripcion: null, imagen: null };

function EventoForm({
  evento,
  onClose,
  onGuardado,
  onBorrado,
}: {
  evento: EventoBd | null;
  onClose: () => void;
  onGuardado: (e: EventoBd) => void | Promise<void>;
  onBorrado: (id: string) => void;
}) {
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
    // Nuevo: sale en la agenda nada más guardarlo; el aviso emergente se elige aparte.
    publicado: e?.publicado ?? true,
    aviso_web: e?.aviso_web ?? false,
    media: e?.media ?? ([] as MediaEvento[]),
    programa: e?.programa ?? ([] as SubEvento[]),
  });
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const archivoRef = useRef<HTMLInputElement>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  /**
   * Sube cada archivo directo a Storage (subida firmada en el servidor) y lo añade a la galería.
   * Un archivo que falla no para a los demás, y los errores se juntan para verlos todos.
   */
  const setSub = (i: number, p: Partial<SubEvento>) => setF((x) => ({ ...x, programa: x.programa.map((s, j) => (j === i ? { ...s, ...p } : s)) }));
  const moverSub = (i: number, d: -1 | 1) =>
    setF((x) => {
      const l = [...x.programa];
      const j = i + d;
      if (j < 0 || j >= l.length) return x;
      [l[i], l[j]] = [l[j]!, l[i]!];
      return { ...x, programa: l };
    });
  const subirCartel = async (i: number, archivo: File) => {
    setError(null);
    setSubiendo("Subiendo cartel…");
    try {
      const m = await subirArchivo(archivo);
      if (m.tipo !== "imagen") throw new Error("el cartel tiene que ser una foto.");
      setSub(i, { imagen: m.url });
    } catch (err) {
      setError(`${archivo.name}: ${err instanceof Error ? err.message : "no se ha podido subir."}`);
    } finally {
      setSubiendo(null);
    }
  };

  const subir = async (archivos: File[]) => {
    setError(null);
    const errores: string[] = [];
    const sitio = 20 - f.media.length;
    if (archivos.length > sitio) errores.push(`Caben ${Math.max(sitio, 0)} archivos más (máximo 20 por evento).`);
    try {
      for (const [i, original] of archivos.slice(0, Math.max(sitio, 0)).entries()) {
        setSubiendo(archivos.length > 1 ? `Subiendo ${i + 1} de ${Math.min(archivos.length, sitio)}…` : "Subiendo…");
        try {
          const nuevo = await subirArchivo(original);
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
    if (f.programa.some((p) => !p.titulo.trim())) return setError("Cada parte del programa necesita un título (o quítala).");
    const programa = f.programa.map((p) => ({
      hora: p.hora || null,
      hora_fin: p.hora_fin || null,
      titulo: p.titulo.trim(),
      descripcion: p.descripcion?.trim() || null,
      imagen: p.imagen,
    }));
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
      programa,
      aviso_web: f.aviso_web,
      publicado: f.publicado,
    });
    if (!r.ok) return setError(r.error);
    await onGuardado(r.data);
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
        <div className="grid gap-2 text-sm sm:col-span-2">
          <span className="font-semibold">Programa del día (opcional)</span>
          <span className="-mt-1 opacity-70">
            Si el evento tiene varias partes, p. ej. actuación a las 13:00 y DJ de 17:00 a 23:30. Cada una puede llevar su cartel (se ve entero, también en vertical).
          </span>
          {f.programa.map((p, i) => (
            <div key={i} className="grid grid-cols-[4.5rem_1fr] gap-3 rounded-2xl border border-carbon/10 p-3 dark:border-crema/10">
              <div className="grid content-start gap-1">
                <label className="relative aspect-[4/5] cursor-pointer overflow-hidden rounded-xl bg-arena dark:bg-noche-3" title="Subir cartel">
                  {p.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel
                    <img src={p.imagen} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full place-content-center justify-items-center gap-1 text-center text-[0.65rem] leading-tight opacity-70">
                      <Icon name="plus" className="h-4 w-4" />
                      Cartel
                    </span>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={subiendo !== null}
                    onChange={(x) => {
                      const archivo = x.target.files?.[0];
                      x.target.value = "";
                      if (archivo) void subirCartel(i, archivo);
                    }}
                  />
                </label>
                {p.imagen ? (
                  <button type="button" onClick={() => setSub(i, { imagen: null })} className="text-xs underline opacity-70">
                    Quitar
                  </button>
                ) : null}
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs">
                    <span className="font-semibold">Desde</span>
                    <input type="time" value={p.hora?.slice(0, 5) ?? ""} onChange={(x) => setSub(i, { hora: x.target.value || null })} className={input} />
                  </label>
                  <label className="grid gap-1 text-xs">
                    <span className="font-semibold">Hasta (opcional)</span>
                    <input type="time" value={p.hora_fin?.slice(0, 5) ?? ""} onChange={(x) => setSub(i, { hora_fin: x.target.value || null })} className={input} />
                  </label>
                </div>
                <input
                  value={p.titulo}
                  onChange={(x) => setSub(i, { titulo: x.target.value })}
                  placeholder="Título (p. ej. La Mara en directo)"
                  aria-label="Título de la parte"
                  className={input}
                />
                <input
                  value={p.descripcion ?? ""}
                  onChange={(x) => setSub(i, { descripcion: x.target.value })}
                  placeholder="Detalle (opcional, p. ej. DJ de los 80 y 90)"
                  aria-label="Detalle de la parte"
                  className={input}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => moverSub(i, -1)} disabled={i === 0} aria-label="Subir" className={botonSecundario}>
                    <Icon name="chevronUp" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => moverSub(i, 1)} disabled={i === f.programa.length - 1} aria-label="Bajar" className={botonSecundario}>
                    <Icon name="chevronDown" className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => set({ programa: f.programa.filter((_, j) => j !== i) })} className={`${botonSecundario} ml-auto`}>
                    <Icon name="trash" className="h-4 w-4" />
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          ))}
          {f.programa.length < 12 ? (
            <button type="button" onClick={() => set({ programa: [...f.programa, { ...SUB_VACIO }] })} className={`${botonSecundario} justify-self-start`}>
              <Icon name="plus" className="h-4 w-4" />
              Añadir parte al programa
            </button>
          ) : null}
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
          Publicado en la agenda de eventos (si no, queda como borrador y no sale en la web)
        </label>
        <label className="flex items-start gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.aviso_web} onChange={(x) => set({ aviso_web: x.target.checked })} className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <span className="font-semibold">Anunciarlo al entrar en la web</span>
            <span className="block opacity-70">
              Sale un aviso con el cartel y el programa a quien entra en la web, hasta el día del evento (en cada visita, nada más entrar). Solo se anuncia uno: al marcar este, se
              quita a los demás.
            </span>
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
