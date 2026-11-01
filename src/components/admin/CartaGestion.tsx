"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { Aviso, aCentimos, aEuros, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { Icon } from "@/components/ui/Icon";
import { borrar, guardar } from "@/lib/admin/actions";
import cargadorImagen from "@/lib/image-loader";
import { ALERGENOS, type AlergenoKey } from "@/lib/allergens";
import { ETIQUETAS, MOMENTOS } from "@/lib/carta";
import { formatCentimos } from "@/lib/format";
import type { Etiqueta, MomentoCarta } from "@/lib/restaurant/types";

export interface CategoriaBd {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  tipo: "comida" | "bebida";
  orden: number;
  visible: boolean;
}

export interface ProductoBd {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string | null;
  precio_centimos: number | null;
  imagen_url: string | null;
  imagenes: string[];
  video_url: string | null;
  alergenos: string[];
  alergenos_confirmados: boolean;
  disponible: boolean;
  destacado: boolean;
  orden: number;
  ingredientes: string[];
  calorias: number | null;
  proteinas_g: number | null;
  carbohidratos_g: number | null;
  grasas_g: number | null;
  nutricion_fuente: "restaurante" | "ejemplo" | null;
  etiquetas: Etiqueta[];
  momento: MomentoCarta[];
  estacion: "cocina" | "barra";
  maridaje: string | null;
  iva_pct: number;
}

export interface ModificadorBd {
  id: string;
  producto_id: string;
  nombre: string;
  tipo: "unico" | "multiple";
  obligatorio: boolean;
  max_opciones: number | null;
  orden: number;
}

export interface OpcionBd {
  id: string;
  modificador_id: string;
  nombre: string;
  precio_extra_centimos: number;
  disponible: boolean;
  orden: number;
}

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

type FiltroEstado = "todos" | "disponibles" | "agotados" | "destacados" | "pendientes" | "con_foto" | "sin_foto";

const FILTROS: { key: FiltroEstado; label: string; pasa: (p: ProductoBd, foto: string | null) => boolean }[] = [
  { key: "todos", label: "Todos los estados", pasa: () => true },
  { key: "disponibles", label: "Disponibles", pasa: (p) => p.disponible },
  { key: "agotados", label: "Agotados", pasa: (p) => !p.disponible },
  { key: "destacados", label: "Recomendados", pasa: (p) => p.destacado },
  { key: "pendientes", label: "Alérgenos sin confirmar", pasa: (p) => !p.alergenos_confirmados },
  { key: "con_foto", label: "Con foto", pasa: (_, foto) => !!foto },
  { key: "sin_foto", label: "Sin foto", pasa: (_, foto) => !foto },
];

/** Desplegable de filtro: resaltado cuando filtra algo. */
const filtroSelect = (activo: boolean) =>
  `${input} cursor-pointer pr-8 text-sm font-semibold ${activo ? "!border-marino bg-marino/[0.06] text-marino dark:!border-neon dark:bg-neon/10 dark:text-neon" : ""}`;
const iconoBoton =
  "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-carbon-muted transition-colors hover:bg-arena hover:text-carbon disabled:opacity-30 disabled:hover:bg-transparent dark:text-crema/60 dark:hover:bg-noche-3 dark:hover:text-crema";
const etiqueta = "inline-flex items-center whitespace-nowrap gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

/** Interruptor grande (44 px de alto) para disponible/agotado y visible/oculta. */
function Interruptor({ activo, onCambiar, si, no, nombre }: { activo: boolean; onCambiar: () => void; si: string; no: string; nombre: string }) {
  return (
    <button type="button" role="switch" aria-checked={activo} aria-label={`${nombre}: ${activo ? si : no}`} onClick={onCambiar} className="group/sw inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2 text-sm font-semibold">
      <span className={`relative h-6 w-11 rounded-full transition-colors ${activo ? "bg-oliva dark:bg-neon" : "bg-terracota/80"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${activo ? "left-[1.375rem]" : "left-0.5"}`} />
      </span>
      <span className={`hidden w-20 text-left sm:inline ${activo ? "text-oliva dark:text-neon" : "text-terracota dark:text-terracota-soft"}`}>{activo ? si : no}</span>
    </button>
  );
}

/** La foto que enseña la web: la subida desde el panel o, si no hay, la del sitio (fotos reales o de la ficha). */
const fotoProducto = (p: ProductoBd, delSitio: Record<string, string>) => p.imagen_url || p.imagenes[0] || delSitio[p.id] || null;

function Miniatura({ p, foto, bebida }: { p: ProductoBd; foto: string | null; bebida: boolean }) {
  return (
    <span
      title={foto ? undefined : "Sin foto"}
      className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl sm:h-14 sm:w-14 ${foto ? "bg-arena shadow-sm ring-1 ring-carbon/10 dark:bg-noche-3 dark:ring-crema/10" : "border border-dashed border-carbon/20 text-carbon/30 dark:border-crema/20 dark:text-crema/30"} ${p.disponible ? "" : "opacity-50 grayscale"}`}
    >
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element -- miniatura del panel
        <img src={cargadorImagen({ src: foto, width: 96 })} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Icon name={bebida ? "wine" : "utensils"} className="h-5 w-5" />
      )}
    </span>
  );
}

/**
 * Carta (portado de CartaTabs/ProductosGestion/CategoriasGestion de Palomita):
 * categorías y productos con todo lo que muestra la carta interactiva. "Agotado"
 * es un toque y la web lo refleja al instante.
 */
export function CartaGestion(props: {
  categorias: CategoriaBd[];
  productos: ProductoBd[];
  modificadores: ModificadorBd[];
  opciones: OpcionBd[];
  /** Foto que pone la web a los platos sin foto propia (id de producto → URL). */
  fotosDelSitio: Record<string, string>;
}) {
  const [tab, setTab] = useState<"productos" | "categorias">("productos");
  const [categorias, setCategorias] = useState(props.categorias);
  const [productos, setProductos] = useState(props.productos);
  const [mods, setMods] = useState(props.modificadores);
  const [ops, setOps] = useState(props.opciones);
  const [filtroCat, setFiltroCat] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ProductoBd | "nuevo" | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  const ordenadas = useMemo(() => [...categorias].sort((a, b) => a.orden - b.orden), [categorias]);
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of productos) m.set(p.categoria_id, (m.get(p.categoria_id) ?? 0) + 1);
    return m;
  }, [productos]);
  const foto = (p: ProductoBd) => fotoProducto(p, props.fotosDelSitio);
  const cuenta = (k: FiltroEstado) => {
    const x = FILTROS.find((y) => y.key === k)!;
    return productos.filter((p) => x.pasa(p, foto(p))).length;
  };

  // Agrupada por categoría, en el orden de la carta.
  const grupos = useMemo(() => {
    const q = busca
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    const filtro = FILTROS.find((x) => x.key === estado)!;
    const pasa = (p: ProductoBd) =>
      (!filtroCat || p.categoria_id === filtroCat) &&
      filtro.pasa(p, fotoProducto(p, props.fotosDelSitio)) &&
      (!q || p.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q));
    return ordenadas
      .map((c) => ({ c, items: productos.filter((p) => p.categoria_id === c.id && pasa(p)).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es")) }))
      .filter((g) => g.items.length > 0);
  }, [productos, ordenadas, filtroCat, estado, busca, props.fotosDelSitio]);
  const total = grupos.reduce((n, g) => n + g.items.length, 0);
  const filtrando = !!filtroCat || estado !== "todos" || !!busca.trim();
  const limpiar = () => {
    setBusca("");
    setEstado("todos");
    setFiltroCat("");
  };

  const ok = (texto: string) => setAviso({ tono: "ok", texto });
  const ko = (texto: string) => setAviso({ tono: "error", texto });

  // Optimista: el cambio se ve al tocar y se deshace si el servidor falla.
  const toggle = async (p: ProductoBd, campo: "disponible" | "destacado") => {
    const valor = !p[campo];
    setProductos((l) => l.map((x) => (x.id === p.id ? { ...x, [campo]: valor } : x)));
    const r = await guardar<ProductoBd>("productos", { id: p.id, [campo]: valor });
    if (!r.ok) {
      setProductos((l) => l.map((x) => (x.id === p.id ? { ...x, [campo]: p[campo] } : x)));
      return ko(r.error);
    }
    setProductos((l) => l.map((x) => (x.id === p.id ? r.data : x)));
    ok(campo === "disponible" ? `${p.nombre}: ${valor ? "disponible" : "agotado"} (ya en la web).` : `${p.nombre}: ${valor ? "recomendado" : "ya no es recomendado"}.`);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex w-fit rounded-xl bg-arena p-1 dark:bg-noche-2">
          {(["productos", "categorias"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-colors aria-selected:bg-[theme(colors.marino.DEFAULT)] aria-selected:text-crema dark:aria-selected:bg-neon dark:aria-selected:text-noche">
              {t === "productos" ? "Productos" : "Categorías"}
              <span className="text-xs tabular-nums opacity-60">{t === "productos" ? productos.length : categorias.length}</span>
            </button>
          ))}
        </div>
        {tab === "productos" ? (
          <button type="button" onClick={() => setEditando("nuevo")} className={botonPrimario}>
            <Icon name="plus" className="h-4 w-4" />
            Nuevo producto
          </button>
        ) : null}
      </div>
      <AvisoFlotante aviso={aviso} onCerrar={() => setAviso(null)} />

      {tab === "productos" ? (
        <>
          <section className={`${card} grid gap-3 p-3 sm:p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-0 flex-1 basis-60">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
                <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar un plato o bebida…" className={`${input} pl-9`} aria-label="Buscar producto" />
              </label>
              <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} aria-label="Categoría" className={`${filtroSelect(!!filtroCat)} min-w-0 flex-1 basis-48 sm:max-w-64`}>
                <option value="">Todas las categorías ({productos.length})</option>
                {ordenadas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({porCategoria.get(c.id) ?? 0}){c.visible ? "" : " · oculta"}
                  </option>
                ))}
              </select>
              <select value={estado} onChange={(e) => setEstado(e.target.value as FiltroEstado)} aria-label="Estado" className={`${filtroSelect(estado !== "todos")} min-w-0 flex-1 basis-48 sm:max-w-64`}>
                {FILTROS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label} ({cuenta(x.key)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-h-6 flex-wrap items-center justify-between gap-2 px-1 text-sm text-carbon-muted dark:text-crema/60">
              <span>
                {filtrando ? (
                  <>
                    Mostrando <b className="text-carbon dark:text-crema">{total}</b> de {productos.length} productos
                  </>
                ) : (
                  <>
                    {productos.length} productos · {cuenta("agotados")} agotados · {cuenta("sin_foto")} sin foto
                  </>
                )}
              </span>
              {filtrando ? (
                <button type="button" onClick={limpiar} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-marino hover:bg-arena dark:text-neon dark:hover:bg-noche-3">
                  <Icon name="close" className="h-3.5 w-3.5" />
                  Quitar filtros
                </button>
              ) : null}
            </div>
          </section>

          {grupos.map(({ c, items }) => (
            <section key={c.id} className={`${card} overflow-hidden`}>
              <header className="flex items-center gap-2 border-b border-carbon/[0.06] bg-arena/40 px-4 py-2.5 dark:border-crema/10 dark:bg-noche-3/40">
                <Icon name={c.tipo === "bebida" ? "wine" : "utensils"} className="h-4 w-4 opacity-50" />
                <h2 className="font-display text-lg">{c.nombre}</h2>
                <span className="text-sm tabular-nums text-carbon-muted dark:text-crema/55">{items.length}</span>
                {!c.visible ? <span className={`${etiqueta} bg-carbon/10 dark:bg-crema/10`}>Oculta en la web</span> : null}
              </header>
              <ul className="divide-y divide-carbon/[0.06] dark:divide-crema/10">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-1 pr-2 transition-colors hover:bg-arena/40 dark:hover:bg-noche-3/40 sm:gap-2 sm:pr-3">
                    <button type="button" onClick={() => setEditando(p)} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 text-left sm:pl-4" aria-label={`Editar ${p.nombre}`}>
                      <Miniatura p={p} foto={foto(p)} bebida={c.tipo === "bebida"} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className={`min-w-0 truncate font-semibold ${p.disponible ? "" : "text-carbon-muted line-through decoration-terracota/60 dark:text-crema/50"}`}>{p.nombre}</span>
                          {!p.disponible ? <span className={`${etiqueta} shrink-0 bg-terracota-soft text-terracota`}>Agotado</span> : null}
                        </span>
                        <span className="block font-display tabular-nums sm:hidden">{p.precio_centimos !== null ? formatCentimos(p.precio_centimos) : "Precio en el local"}</span>
                        {p.descripcion ? <span className="hidden truncate sm:block text-sm text-carbon-muted dark:text-crema/60">{p.descripcion}</span> : null}
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className={`${etiqueta} ${p.estacion === "barra" ? "bg-neon/30 text-marino dark:bg-neon/15 dark:text-neon" : "bg-ratan/30 text-carbon dark:bg-ratan/20 dark:text-ratan"}`}>{p.estacion === "barra" ? "Barra" : "Cocina"}</span>
                          {p.alergenos_confirmados ? (
                            p.alergenos.length ? (
                              <span className="inline-flex items-center gap-0.5 opacity-80" title={`Alérgenos: ${p.alergenos.map((a) => ALERGENOS.find((x) => x.key === a)?.label ?? a).join(", ")}`}>
                                {p.alergenos.slice(0, 6).map((a) => (
                                  <AllergenIcon key={a} alergeno={a as AlergenoKey} />
                                ))}
                                {p.alergenos.length > 6 ? <span className="text-xs">+{p.alergenos.length - 6}</span> : null}
                              </span>
                            ) : (
                              <span className={`${etiqueta} bg-oliva-soft text-oliva`}>Sin alérgenos</span>
                            )
                          ) : (
                            <span className={`${etiqueta} bg-terracota-soft/70 text-terracota`}>
                              <Icon name="info" className="h-3 w-3" />
                              Alérgenos sin confirmar
                            </span>
                          )}
                        </span>
                      </span>
                      <span className={`hidden shrink-0 text-right font-display text-lg tabular-nums sm:block ${p.precio_centimos === null ? "text-sm text-carbon-muted dark:text-crema/55" : ""}`}>
                        {p.precio_centimos !== null ? formatCentimos(p.precio_centimos) : "En el local"}
                      </span>
                    </button>
                    <Interruptor activo={p.disponible} onCambiar={() => void toggle(p, "disponible")} si="Disponible" no="Agotado" nombre={p.nombre} />
                    <button type="button" aria-pressed={p.destacado} onClick={() => void toggle(p, "destacado")} title={p.destacado ? "Recomendado" : "Marcar como recomendado"} className={`${iconoBoton} aria-pressed:text-madera dark:aria-pressed:text-ratan`}>
                      <Icon name="star" className={`h-5 w-5 ${p.destacado ? "fill-ratan" : ""}`} />
                      <span className="sr-only">Recomendado</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {total === 0 ? (
            <div className={`${card} grid place-items-center gap-3 px-6 py-12 text-center`}>
              <Icon name="search" className="h-8 w-8 opacity-30" />
              <p className="text-sm text-carbon-muted dark:text-crema/60">Ningún producto coincide con la búsqueda.</p>
              <button type="button" onClick={limpiar} className={botonSecundario}>
                Ver toda la carta
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <Categorias
          categorias={ordenadas}
          porCategoria={porCategoria}
          setCategorias={setCategorias}
          verProductos={(id) => {
            setFiltroCat(id);
            setEstado("todos");
            setBusca("");
            setTab("productos");
          }}
          ok={ok}
          ko={ko}
        />
      )}

      {editando ? (
        <ProductoForm
          producto={editando === "nuevo" ? null : editando}
          categorias={ordenadas}
          mods={mods.filter((m) => editando !== "nuevo" && m.producto_id === editando.id)}
          ops={ops}
          setMods={setMods}
          setOps={setOps}
          onClose={() => setEditando(null)}
          onGuardado={(p) => {
            setProductos((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...l, p]));
            ok(`«${p.nombre}» guardado.`);
            setEditando(p);
          }}
          onBorrado={(id) => {
            setProductos((l) => l.filter((x) => x.id !== id));
            setEditando(null);
            ok("Producto borrado.");
          }}
        />
      ) : null}
    </div>
  );
}

const campoEnLinea =
  "w-full rounded-lg border border-transparent bg-transparent px-2 transition-colors hover:border-carbon/15 focus:border-marino focus:bg-white focus:outline-none dark:hover:border-crema/15 dark:focus:border-neon dark:focus:bg-noche-3";

function Categorias({
  categorias,
  porCategoria,
  setCategorias,
  verProductos,
  ok,
  ko,
}: {
  categorias: CategoriaBd[];
  porCategoria: Map<string, number>;
  setCategorias: (f: (l: CategoriaBd[]) => CategoriaBd[]) => void;
  verProductos: (id: string) => void;
  ok: (t: string) => void;
  ko: (t: string) => void;
}) {
  const [nueva, setNueva] = useState({ nombre: "", tipo: "comida" as CategoriaBd["tipo"] });
  const cambiar = async (c: CategoriaBd, patch: Partial<CategoriaBd>, texto?: string) => {
    setCategorias((l) => l.map((x) => (x.id === c.id ? { ...x, ...patch } : x)));
    const r = await guardar<CategoriaBd>("categorias", { id: c.id, ...patch });
    if (!r.ok) {
      setCategorias((l) => l.map((x) => (x.id === c.id ? c : x)));
      return ko(r.error);
    }
    setCategorias((l) => l.map((x) => (x.id === c.id ? r.data : x)));
    if (texto) ok(texto);
  };
  const mover = async (c: CategoriaBd, delta: -1 | 1) => {
    const i = categorias.findIndex((x) => x.id === c.id);
    const otra = categorias[i + delta];
    if (!otra) return;
    const [r1, r2] = await Promise.all([guardar<CategoriaBd>("categorias", { id: c.id, orden: otra.orden }), guardar<CategoriaBd>("categorias", { id: otra.id, orden: c.orden })]);
    if (!r1.ok || !r2.ok) return ko("No se pudo reordenar.");
    setCategorias((l) => l.map((x) => (x.id === c.id ? r1.data : x.id === otra.id ? r2.data : x)));
  };
  return (
    <section className={`${card} overflow-hidden`}>
      <p className="border-b border-carbon/[0.06] bg-arena/40 px-4 py-2.5 text-sm text-carbon-muted dark:border-crema/10 dark:bg-noche-3/40 dark:text-crema/60">
        Así se ordena la carta en la web. Toca un nombre o un texto para cambiarlo; se guarda solo al salir del campo.
      </p>
      <ol className="divide-y divide-carbon/[0.06] dark:divide-crema/10">
        {categorias.map((c, i) => {
          const n = porCategoria.get(c.id) ?? 0;
          return (
            <li key={c.id} className={`grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[auto_1fr_auto] sm:px-4 ${c.visible ? "" : "bg-carbon/[0.02] dark:bg-crema/[0.02]"}`}>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${c.tipo === "bebida" ? "bg-neon/25 text-marino dark:bg-neon/15 dark:text-neon" : "bg-ratan/25 text-madera dark:bg-ratan/15 dark:text-ratan"} ${c.visible ? "" : "opacity-40"}`}>
                <Icon name={c.tipo === "bebida" ? "wine" : "utensils"} className="h-5 w-5" />
              </span>
              <div className={`min-w-0 ${c.visible ? "" : "opacity-60"}`}>
                <input
                  key={`n-${c.nombre}`}
                  defaultValue={c.nombre}
                  aria-label={`Nombre de ${c.nombre}`}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v) e.target.value = c.nombre;
                    else if (v !== c.nombre) void cambiar(c, { nombre: v }, "Categoría guardada.");
                  }}
                  className={`${campoEnLinea} h-9 font-display text-lg`}
                />
                <input
                  key={`d-${c.descripcion}`}
                  defaultValue={c.descripcion ?? ""}
                  placeholder="Añadir texto bajo el título…"
                  aria-label={`Descripción de ${c.nombre}`}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  onBlur={(e) => {
                    const v = e.target.value.trim() || null;
                    if (v !== c.descripcion) void cambiar(c, { descripcion: v }, "Texto guardado.");
                  }}
                  className={`${campoEnLinea} h-8 text-sm text-carbon-muted placeholder:italic placeholder:opacity-60 dark:text-crema/60`}
                />
              </div>
              <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
                <button type="button" onClick={() => verProductos(c.id)} className="mr-auto inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-marino sm:mr-0 hover:bg-arena dark:text-neon dark:hover:bg-noche-3">
                  {n} {n === 1 ? "producto" : "productos"}
                  <Icon name="chevronRight" className="h-4 w-4" />
                </button>
                <select value={c.tipo} onChange={(e) => void cambiar(c, { tipo: e.target.value as CategoriaBd["tipo"] }, "Categoría guardada.")} aria-label={`Tipo de ${c.nombre}`} className="hidden h-11 rounded-xl border border-transparent bg-transparent px-2 text-sm hover:border-carbon/15 dark:hover:border-crema/15 sm:block">
                  <option value="comida">Comida</option>
                  <option value="bebida">Bebida</option>
                </select>
                <Interruptor activo={c.visible} onCambiar={() => void cambiar(c, { visible: !c.visible }, c.visible ? `«${c.nombre}» oculta en la web.` : `«${c.nombre}» visible en la web.`)} si="Visible" no="Oculta" nombre={c.nombre} />
                <span className="mx-1 hidden h-6 w-px bg-carbon/10 dark:bg-crema/10 sm:block" />
                <button type="button" disabled={i === 0} onClick={() => void mover(c, -1)} className={iconoBoton} title="Subir">
                  <Icon name="chevronUp" className="h-4 w-4" />
                  <span className="sr-only">Subir {c.nombre}</span>
                </button>
                <button type="button" disabled={i === categorias.length - 1} onClick={() => void mover(c, 1)} className={iconoBoton} title="Bajar">
                  <Icon name="chevronDown" className="h-4 w-4" />
                  <span className="sr-only">Bajar {c.nombre}</span>
                </button>
                <button
                  type="button"
                  disabled={n > 0}
                  title={n > 0 ? "Para borrarla, primero mueve o borra sus productos" : "Borrar categoría"}
                  onClick={async () => {
                    if (!window.confirm(`¿Borrar la categoría «${c.nombre}»?`)) return;
                    const r = await borrar("categorias", c.id);
                    if (!r.ok) return ko("No se puede borrar: tiene productos.");
                    setCategorias((l) => l.filter((x) => x.id !== c.id));
                    ok("Categoría borrada.");
                  }}
                  className={`${iconoBoton} hover:text-terracota dark:hover:text-terracota-soft`}
                >
                  <Icon name="trash" className="h-4 w-4" />
                  <span className="sr-only">Borrar {c.nombre}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <form
        className="flex flex-wrap items-center gap-2 border-t border-dashed border-carbon/15 bg-arena/30 p-3 dark:border-crema/15 dark:bg-noche-3/30 sm:px-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const nombre = nueva.nombre.trim();
          if (!nombre) return;
          const r = await guardar<CategoriaBd>("categorias", { nombre, slug: slugify(nombre), tipo: nueva.tipo, orden: Math.max(0, ...categorias.map((c) => c.orden)) + 1 });
          if (!r.ok) return ko(r.error);
          setCategorias((l) => [...l, r.data]);
          setNueva({ nombre: "", tipo: nueva.tipo });
          ok(`Categoría «${nombre}» creada al final de la carta.`);
        }}
      >
        <input required value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="Nueva categoría (p. ej. Vinos tintos)" aria-label="Nombre de la nueva categoría" className={`${input} min-w-0 !w-auto flex-1 basis-56`} />
        <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value as CategoriaBd["tipo"] })} aria-label="Tipo de la nueva categoría" className={`${input} !w-36`}>
          <option value="comida">Comida</option>
          <option value="bebida">Bebida</option>
        </select>
        <button type="submit" disabled={!nueva.nombre.trim()} className={botonPrimario}>
          <Icon name="plus" className="h-4 w-4" />
          Añadir categoría
        </button>
      </form>
    </section>
  );
}

function ProductoForm({
  producto,
  categorias,
  mods,
  ops,
  setMods,
  setOps,
  onClose,
  onGuardado,
  onBorrado,
}: {
  producto: ProductoBd | null;
  categorias: CategoriaBd[];
  mods: ModificadorBd[];
  ops: OpcionBd[];
  setMods: (f: (l: ModificadorBd[]) => ModificadorBd[]) => void;
  setOps: (f: (l: OpcionBd[]) => OpcionBd[]) => void;
  onClose: () => void;
  onGuardado: (p: ProductoBd) => void;
  onBorrado: (id: string) => void;
}) {
  const p = producto;
  const [f, setF] = useState({
    nombre: p?.nombre ?? "",
    categoria_id: p?.categoria_id ?? categorias[0]?.id ?? "",
    descripcion: p?.descripcion ?? "",
    precio: aEuros(p?.precio_centimos),
    iva_pct: p?.iva_pct ?? 10,
    estacion: p?.estacion ?? "cocina",
    momento: p?.momento ?? [],
    etiquetas: p?.etiquetas ?? [],
    alergenos: p?.alergenos ?? [],
    alergenos_confirmados: p?.alergenos_confirmados ?? false,
    ingredientes: (p?.ingredientes ?? []).join(", "),
    calorias: p?.calorias?.toString() ?? "",
    proteinas_g: p?.proteinas_g?.toString() ?? "",
    carbohidratos_g: p?.carbohidratos_g?.toString() ?? "",
    grasas_g: p?.grasas_g?.toString() ?? "",
    nutricion_fuente: p?.nutricion_fuente ?? "",
    imagen_url: p?.imagen_url ?? "",
    imagenes: (p?.imagenes ?? []).join("\n"),
    video_url: p?.video_url ?? "",
    maridaje: p?.maridaje ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const alternar = <T extends string>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const guardarProducto = async () => {
    setError(null);
    const nutricion = [f.calorias, f.proteinas_g, f.carbohidratos_g, f.grasas_g].some((x) => x.trim() !== "");
    if (nutricion && !f.nutricion_fuente) return setError("Indica de dónde salen los datos nutricionales (nunca inventados).");
    if (f.etiquetas.includes("sin_gluten") && (!f.alergenos_confirmados || f.alergenos.includes("gluten"))) {
      return setError("«Sin gluten» exige alérgenos confirmados y sin gluten.");
    }
    const r = await guardar<ProductoBd>("productos", {
      ...(p ? { id: p.id } : {}),
      nombre: f.nombre.trim(),
      categoria_id: f.categoria_id,
      descripcion: f.descripcion.trim() || null,
      precio_centimos: aCentimos(f.precio),
      iva_pct: f.iva_pct,
      estacion: f.estacion,
      momento: f.momento,
      etiquetas: f.etiquetas,
      alergenos: f.alergenos,
      alergenos_confirmados: f.alergenos_confirmados,
      ingredientes: f.ingredientes
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      calorias: num(f.calorias),
      proteinas_g: num(f.proteinas_g),
      carbohidratos_g: num(f.carbohidratos_g),
      grasas_g: num(f.grasas_g),
      nutricion_fuente: nutricion ? f.nutricion_fuente : null,
      imagen_url: f.imagen_url.trim() || null,
      imagenes: f.imagenes
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      video_url: f.video_url.trim() || null,
      maridaje: f.maridaje.trim() || null,
    });
    if (!r.ok) return setError(r.error);
    onGuardado(r.data);
  };

  return (
    <Modal titulo={p ? p.nombre : "Nuevo producto"} onClose={onClose} ancho="max-w-3xl">
      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-semibold">Nombre</span>
            <input value={f.nombre} onChange={(e) => set({ nombre: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Categoría</span>
            <select value={f.categoria_id} onChange={(e) => set({ categoria_id: e.target.value })} className={input}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Precio € (vacío = «precio en el local»)</span>
            <input value={f.precio} onChange={(e) => set({ precio: e.target.value })} inputMode="decimal" className={input} />
          </label>
          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-semibold">Descripción</span>
            <textarea value={f.descripcion} onChange={(e) => set({ descripcion: e.target.value })} rows={2} className={`${input} h-auto py-2`} />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Estación (comanda)</span>
            <select value={f.estacion} onChange={(e) => set({ estacion: e.target.value as "cocina" | "barra" })} className={input}>
              <option value="cocina">Cocina</option>
              <option value="barra">Barra</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">IVA</span>
            <select value={f.iva_pct} onChange={(e) => set({ iva_pct: Number(e.target.value) })} className={input}>
              <option value={10}>10 % (comida y bebida sin alcohol)</option>
              <option value={21}>21 % (bebidas alcohólicas)</option>
              <option value={4}>4 %</option>
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Momento del día (vacío = todo el día)</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {MOMENTOS.map((m) => (
              <button key={m.key} type="button" aria-pressed={f.momento.includes(m.key)} onClick={() => set({ momento: alternar(f.momento, m.key) })} className="min-h-10 rounded-full border border-carbon/15 px-3 text-sm aria-pressed:border-oliva aria-pressed:bg-oliva aria-pressed:text-crema dark:border-crema/15">
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold">Etiquetas</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(ETIQUETAS) as Etiqueta[]).map((e) => (
              <button key={e} type="button" aria-pressed={f.etiquetas.includes(e)} onClick={() => set({ etiquetas: alternar(f.etiquetas, e) })} className="min-h-10 rounded-full border border-carbon/15 px-3 text-sm aria-pressed:border-oliva aria-pressed:bg-oliva aria-pressed:text-crema dark:border-crema/15">
                {ETIQUETAS[e]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-carbon/10 p-4 dark:border-crema/10">
          <legend className="px-1 text-sm font-semibold">Alérgenos (Reglamento UE 1169/2011)</legend>
          <div className="flex flex-wrap gap-1.5">
            {ALERGENOS.map((a) => (
              <button key={a.key} type="button" aria-pressed={f.alergenos.includes(a.key)} onClick={() => set({ alergenos: alternar(f.alergenos, a.key) })} className="inline-flex min-h-10 items-center gap-1 rounded-full border border-carbon/15 px-3 text-sm aria-pressed:border-terracota aria-pressed:bg-terracota aria-pressed:text-crema dark:border-crema/15">
                <AllergenIcon alergeno={a.key} />
                {a.label}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={f.alergenos_confirmados} onChange={(e) => set({ alergenos_confirmados: e.target.checked })} className="mt-0.5 h-5 w-5" />
            <span>
              <b>Alérgenos confirmados por cocina.</b> Solo así la carta muestra el plato como apto al filtrar por alérgenos.
            </span>
          </label>
        </fieldset>

        <fieldset className="rounded-2xl border border-carbon/10 p-4 dark:border-crema/10">
          <legend className="px-1 text-sm font-semibold">Ingredientes y nutrición (opcional, nunca inventada)</legend>
          <input value={f.ingredientes} onChange={(e) => set({ ingredientes: e.target.value })} placeholder="Ingredientes separados por comas" className={input} />
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ["calorias", "kcal"],
                ["proteinas_g", "Proteínas g"],
                ["carbohidratos_g", "Hidratos g"],
                ["grasas_g", "Grasas g"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="grid gap-1 text-xs">
                {label}
                <input value={f[k]} onChange={(e) => set({ [k]: e.target.value })} inputMode="decimal" className={input} />
              </label>
            ))}
          </div>
          <select value={f.nutricion_fuente} onChange={(e) => set({ nutricion_fuente: e.target.value as typeof f.nutricion_fuente })} className={`${input} mt-2`} aria-label="Procedencia de los datos nutricionales">
            <option value="">Procedencia de los datos…</option>
            <option value="restaurante">Facilitados por el restaurante (receta/ficha técnica)</option>
            <option value="ejemplo">Ejemplo de demostración (se marca «ejemplo»)</option>
          </select>
        </fieldset>

        <fieldset className="grid gap-2 rounded-2xl border border-carbon/10 p-4 dark:border-crema/10">
          <legend className="px-1 text-sm font-semibold">Fotos, vídeo y maridaje</legend>
          <input value={f.imagen_url} onChange={(e) => set({ imagen_url: e.target.value })} placeholder="Foto principal (URL o /images/…)" className={input} />
          <textarea value={f.imagenes} onChange={(e) => set({ imagenes: e.target.value })} rows={2} placeholder="Más fotos: una URL por línea" className={`${input} h-auto py-2`} />
          <input value={f.video_url} onChange={(e) => set({ video_url: e.target.value })} placeholder="Vídeo corto real (https://… o /videos/…)" className={input} />
          <input value={f.maridaje} onChange={(e) => set({ maridaje: e.target.value })} placeholder="Maridaje sugerido (p. ej. txakoli Magalarte)" className={input} />
        </fieldset>

        {p ? <Modificadores productoId={p.id} mods={mods} ops={ops} setMods={setMods} setOps={setOps} /> : <p className="text-sm opacity-70">Guarda el producto para añadirle modificadores.</p>}

        {error ? <Aviso>{error}</Aviso> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void guardarProducto()} disabled={!f.nombre.trim() || !f.categoria_id} className={`${botonPrimario} flex-1`}>
            Guardar
          </button>
          {p ? (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`¿Borrar «${p.nombre}»? Si ya se ha pedido, mejor márcalo como agotado.`)) return;
                const r = await borrar("productos", p.id);
                if (!r.ok) return setError(r.error);
                onBorrado(p.id);
              }}
              className={botonPeligro}
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

function Modificadores({
  productoId,
  mods,
  ops,
  setMods,
  setOps,
}: {
  productoId: string;
  mods: ModificadorBd[];
  ops: OpcionBd[];
  setMods: (f: (l: ModificadorBd[]) => ModificadorBd[]) => void;
  setOps: (f: (l: OpcionBd[]) => OpcionBd[]) => void;
}) {
  const [nuevo, setNuevo] = useState({ nombre: "", tipo: "unico" as "unico" | "multiple", obligatorio: false });
  return (
    <fieldset className="rounded-2xl border border-carbon/10 p-4 dark:border-crema/10">
      <legend className="px-1 text-sm font-semibold">Modificadores (punto de la carne, sin cebolla, extras…)</legend>
      <ul className="grid gap-3">
        {mods.map((m) => (
          <li key={m.id} className="rounded-xl bg-arena p-3 dark:bg-noche-3">
            <div className="flex flex-wrap items-center gap-2">
              <b>{m.nombre}</b>
              <span className="text-xs opacity-70">
                {m.tipo === "unico" ? "una opción" : "varias opciones"}
                {m.obligatorio ? " · obligatorio" : ""}
              </span>
              <button
                type="button"
                onClick={async () => {
                  const r = await borrar("modificadores", m.id);
                  if (r.ok) setMods((l) => l.filter((x) => x.id !== m.id));
                }}
                className="ml-auto text-xs font-semibold text-terracota"
              >
                Quitar
              </button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {ops
                .filter((o) => o.modificador_id === m.id)
                .map((o) => (
                  <li key={o.id} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm dark:bg-noche-2">
                    {o.nombre}
                    {o.precio_extra_centimos ? ` +${formatCentimos(o.precio_extra_centimos)}` : ""}
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await borrar("modificador_opciones", o.id);
                        if (r.ok) setOps((l) => l.filter((x) => x.id !== o.id));
                      }}
                      aria-label={`Quitar ${o.nombre}`}
                      className="opacity-60 hover:opacity-100"
                    >
                      <Icon name="close" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
            </ul>
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const r = await guardar<OpcionBd>("modificador_opciones", {
                  modificador_id: m.id,
                  nombre: String(fd.get("nombre")),
                  precio_extra_centimos: aCentimos(String(fd.get("precio") ?? "")) ?? 0,
                  orden: ops.filter((o) => o.modificador_id === m.id).length + 1,
                });
                if (r.ok) {
                  setOps((l) => [...l, r.data]);
                  e.currentTarget.reset();
                }
              }}
            >
              <input name="nombre" required placeholder="Opción (p. ej. Al punto)" className={input} />
              <input name="precio" placeholder="+ €" inputMode="decimal" className={`${input} w-20`} />
              <button type="submit" className={botonSecundario}>
                <Icon name="plus" className="h-4 w-4" />
                <span className="sr-only">Añadir opción</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nuevo modificador (p. ej. Punto)" className={`${input} max-w-xs`} />
        <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value as "unico" | "multiple" })} className={`${input} w-40`}>
          <option value="unico">Una opción</option>
          <option value="multiple">Varias opciones</option>
        </select>
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={nuevo.obligatorio} onChange={(e) => setNuevo({ ...nuevo, obligatorio: e.target.checked })} className="h-5 w-5" />
          Obligatorio
        </label>
        <button
          type="button"
          disabled={!nuevo.nombre.trim()}
          onClick={async () => {
            const r = await guardar<ModificadorBd>("modificadores", { producto_id: productoId, ...nuevo, orden: mods.length + 1 });
            if (r.ok) {
              setMods((l) => [...l, r.data]);
              setNuevo({ nombre: "", tipo: "unico", obligatorio: false });
            }
          }}
          className={botonSecundario}
        >
          <Icon name="plus" className="h-4 w-4" />
          Añadir
        </button>
      </div>
    </fieldset>
  );
}
