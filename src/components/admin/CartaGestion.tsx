"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/admin/Modal";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { Aviso, aCentimos, aEuros, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { Icon } from "@/components/ui/Icon";
import { borrar, guardar } from "@/lib/admin/actions";
import { ALERGENOS } from "@/lib/allergens";
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

/**
 * Carta (portado de CartaTabs/ProductosGestion/CategoriasGestion de Palomita):
 * categorías y productos con todo lo que muestra la carta interactiva. "Agotado"
 * es un toque y la web lo refleja al instante.
 */
export function CartaGestion(props: { categorias: CategoriaBd[]; productos: ProductoBd[]; modificadores: ModificadorBd[]; opciones: OpcionBd[] }) {
  const [tab, setTab] = useState<"productos" | "categorias">("productos");
  const [categorias, setCategorias] = useState(props.categorias);
  const [productos, setProductos] = useState(props.productos);
  const [mods, setMods] = useState(props.modificadores);
  const [ops, setOps] = useState(props.opciones);
  const [filtroCat, setFiltroCat] = useState("");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ProductoBd | "nuevo" | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return productos.filter((p) => (!filtroCat || p.categoria_id === filtroCat) && (!q || p.nombre.toLowerCase().includes(q)));
  }, [productos, filtroCat, busca]);

  const ok = (texto: string) => setAviso({ tono: "ok", texto });
  const ko = (texto: string) => setAviso({ tono: "error", texto });

  const toggle = async (p: ProductoBd, campo: "disponible" | "destacado") => {
    const r = await guardar<ProductoBd>("productos", { id: p.id, [campo]: !p[campo] });
    if (!r.ok) return ko(r.error);
    setProductos((l) => l.map((x) => (x.id === p.id ? r.data : x)));
    ok(campo === "disponible" ? `${p.nombre}: ${r.data.disponible ? "disponible" : "agotado"} (ya en la web).` : `${p.nombre} actualizado.`);
  };

  return (
    <div className="grid gap-4">
      <div role="tablist" className="flex w-fit rounded-xl bg-arena p-1 dark:bg-noche-2">
        {(["productos", "categorias"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className="min-h-11 rounded-lg px-5 text-sm font-semibold capitalize aria-selected:bg-marino aria-selected:text-crema dark:aria-selected:bg-neon dark:aria-selected:text-noche">
            {t === "productos" ? "Productos" : "Categorías"}
          </button>
        ))}
      </div>
      <AvisoFlotante aviso={aviso} onCerrar={() => setAviso(null)} />

      {tab === "productos" ? (
        <section className={`${card} p-4`}>
          <div className="flex flex-wrap gap-2">
            <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} className={`${input} max-w-xs`} aria-label="Categoría">
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className={`${input} max-w-xs`} aria-label="Buscar producto" />
            <button type="button" onClick={() => setEditando("nuevo")} className={`${botonPrimario} ml-auto`}>
              <Icon name="plus" className="h-4 w-4" />
              Nuevo producto
            </button>
          </div>
          <ul className="mt-4 divide-y divide-carbon/10 dark:divide-crema/10">
            {lista.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                <button type="button" onClick={() => setEditando(p)} className="min-w-0 flex-1 text-left">
                  <span className="block font-semibold">{p.nombre}</span>
                  <span className="text-sm opacity-70">
                    {categorias.find((c) => c.id === p.categoria_id)?.nombre} · {p.precio_centimos !== null ? formatCentimos(p.precio_centimos) : "precio en el local"} · {p.estacion}
                    {!p.alergenos_confirmados ? " · alérgenos sin confirmar" : ""}
                  </span>
                </button>
                <button type="button" aria-pressed={!p.disponible} onClick={() => void toggle(p, "disponible")} className={`min-h-11 rounded-xl px-4 text-sm font-semibold ${p.disponible ? "bg-oliva-soft text-oliva" : "bg-terracota text-crema"}`}>
                  {p.disponible ? "Disponible" : "Agotado"}
                </button>
                <button type="button" aria-pressed={p.destacado} onClick={() => void toggle(p, "destacado")} className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 aria-pressed:bg-ratan dark:border-crema/15">
                  <Icon name="star" className="h-4 w-4" />
                  <span className="sr-only">Recomendado</span>
                </button>
              </li>
            ))}
            {lista.length === 0 ? <li className="py-6 text-center text-sm opacity-60">Sin productos.</li> : null}
          </ul>
        </section>
      ) : (
        <Categorias categorias={categorias} setCategorias={setCategorias} ok={ok} ko={ko} />
      )}

      {editando ? (
        <ProductoForm
          producto={editando === "nuevo" ? null : editando}
          categorias={categorias}
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

function Categorias({
  categorias,
  setCategorias,
  ok,
  ko,
}: {
  categorias: CategoriaBd[];
  setCategorias: (f: (l: CategoriaBd[]) => CategoriaBd[]) => void;
  ok: (t: string) => void;
  ko: (t: string) => void;
}) {
  const [nueva, setNueva] = useState("");
  const mover = async (c: CategoriaBd, delta: -1 | 1) => {
    const orden = [...categorias].sort((a, b) => a.orden - b.orden);
    const i = orden.findIndex((x) => x.id === c.id);
    const otra = orden[i + delta];
    if (!otra) return;
    const [r1, r2] = await Promise.all([guardar<CategoriaBd>("categorias", { id: c.id, orden: otra.orden }), guardar<CategoriaBd>("categorias", { id: otra.id, orden: c.orden })]);
    if (!r1.ok || !r2.ok) return ko("No se pudo reordenar.");
    setCategorias((l) => l.map((x) => (x.id === c.id ? r1.data : x.id === otra.id ? r2.data : x)));
  };
  return (
    <section className={`${card} p-4`}>
      <ul className="divide-y divide-carbon/10 dark:divide-crema/10">
        {[...categorias]
          .sort((a, b) => a.orden - b.orden)
          .map((c) => (
            <li key={c.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_2fr_auto] sm:items-center">
              <input
                defaultValue={c.nombre}
                aria-label="Nombre"
                onBlur={async (e) => {
                  if (e.target.value === c.nombre) return;
                  const r = await guardar<CategoriaBd>("categorias", { id: c.id, nombre: e.target.value });
                  if (r.ok) ok("Categoría guardada.");
                  else ko(r.error);
                }}
                className={input}
              />
              <input
                defaultValue={c.descripcion ?? ""}
                placeholder="Texto bajo el título (opcional)"
                aria-label="Descripción"
                onBlur={async (e) => {
                  const r = await guardar<CategoriaBd>("categorias", { id: c.id, descripcion: e.target.value || null });
                  if (!r.ok) ko(r.error);
                }}
                className={input}
              />
              <div className="flex gap-1">
                <button type="button" onClick={() => void mover(c, -1)} className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15">
                  <Icon name="chevronUp" className="h-4 w-4" />
                  <span className="sr-only">Subir</span>
                </button>
                <button type="button" onClick={() => void mover(c, 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15">
                  <Icon name="chevronDown" className="h-4 w-4" />
                  <span className="sr-only">Bajar</span>
                </button>
                <button
                  type="button"
                  aria-pressed={!c.visible}
                  onClick={async () => {
                    const r = await guardar<CategoriaBd>("categorias", { id: c.id, visible: !c.visible });
                    if (r.ok) setCategorias((l) => l.map((x) => (x.id === c.id ? r.data : x)));
                  }}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 aria-pressed:opacity-40 dark:border-crema/15"
                >
                  <Icon name="eye" className="h-4 w-4" />
                  <span className="sr-only">{c.visible ? "Ocultar" : "Mostrar"}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm(`¿Borrar «${c.nombre}»? Solo se puede si no tiene productos.`)) return;
                    const r = await borrar("categorias", c.id);
                    if (!r.ok) return ko("No se puede borrar: tiene productos.");
                    setCategorias((l) => l.filter((x) => x.id !== c.id));
                  }}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 text-terracota dark:border-crema/15"
                >
                  <Icon name="trash" className="h-4 w-4" />
                  <span className="sr-only">Borrar</span>
                </button>
              </div>
            </li>
          ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await guardar<CategoriaBd>("categorias", { nombre: nueva, slug: slugify(nueva), orden: categorias.length + 1 });
          if (!r.ok) return ko(r.error);
          setCategorias((l) => [...l, r.data]);
          setNueva("");
          ok("Categoría creada.");
        }}
      >
        <input required value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva categoría" className={`${input} max-w-sm`} />
        <button type="submit" className={botonPrimario}>
          <Icon name="plus" className="h-4 w-4" />
          Añadir
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
