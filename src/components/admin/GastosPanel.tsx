"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Etiqueta, FotoMarcada } from "@/components/admin/GastoMarcado";
import { Modal } from "@/components/admin/Modal";
import { Aviso, Campo, Cifra, aEuros, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { borrarGasto, editarProveedorGasto, guardarGasto, subirDocumentoGasto, verDocumentoGasto } from "@/lib/admin/gastos-actions";
import { descargarCsv } from "@/lib/export-csv";
import { formatCentimos } from "@/lib/format";
import type { DocumentoLeido, EstadoLectura } from "@/lib/gastos/documento";
import { calcularMarcas, type MarcasGasto, type TipoMarca } from "@/lib/gastos/marcas";
import { leerGasto, sumaLineas, type CategoriaGasto, type GastoLeido, type ProveedorMemoria, type TipoGasto } from "@/lib/gastos/ocr";

export interface Gasto {
  id: string;
  fecha: string;
  tipo: TipoGasto;
  proveedor_id: string | null;
  proveedor: string;
  cif: string | null;
  numero: string | null;
  categoria: CategoriaGasto;
  base_centimos: number | null;
  iva_centimos: number | null;
  total_centimos: number;
  iva: { tipo: number; base_centimos: number; cuota_centimos: number }[];
  lineas: { texto: string; cantidad: number | null; precio_centimos: number | null; importe_centimos: number | null }[];
  metodo_pago: "efectivo" | "tarjeta" | "transferencia" | "domiciliacion" | null;
  notas: string | null;
  documento_path: string | null;
}

export interface ProveedorGasto extends ProveedorMemoria {
  veces: number;
}

export const CATEGORIAS: Record<CategoriaGasto, string> = {
  comida: "Comida",
  bebida: "Bebida",
  limpieza: "Limpieza",
  suministros: "Luz, agua y teléfono",
  alquiler: "Alquiler",
  personal: "Personal",
  servicios: "Servicios y gestoría",
  mantenimiento: "Mantenimiento",
  impuestos: "Impuestos y tasas",
  otros: "Otros",
};
const TIPOS: Record<TipoGasto, string> = { albaran: "Albarán", factura: "Factura", ticket: "Ticket", otro: "Otro" };
const PAGOS = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia", domiciliacion: "Domiciliación" } as const;
const ESTADOS: Record<EstadoLectura, string> = {
  preparando: "Preparando el documento…",
  "cargando-lector": "Descargando el lector (solo la primera vez, unos 27 MB)…",
  leyendo: "Leyendo el documento…",
};

/** Euros (texto, admite signo para abonos) → céntimos. */
function centimos(texto: string): number | null {
  const limpio = texto.replace(/\s|€/g, "").replace(",", ".");
  if (!limpio || limpio === "-") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
const euros = (n: number | null | undefined) => (n == null ? "" : String(Math.round(n * 100) / 100).replace(".", ","));
const eurosC = (c: number | null | undefined) => (c == null ? "" : c < 0 ? `-${aEuros(-c)}` : aEuros(c));
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date());
const nombreDeMes = (fecha: string) =>
  new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, 1)));

interface Borrador {
  id?: string;
  fecha: string;
  tipo: TipoGasto;
  proveedor: string;
  cif: string;
  numero: string;
  categoria: CategoriaGasto;
  total: string;
  iva: { tipo: string; base: string; cuota: string }[];
  lineas: { texto: string; cantidad: string; precio: string; importe: string }[];
  metodo_pago: Gasto["metodo_pago"] | "";
  notas: string;
  documento_path: string | null;
  // Solo al escanear:
  jpeg?: Blob;
  leido?: GastoLeido;
  marcas?: MarcasGasto;
  ms?: number;
}

const vacio = (): Borrador => ({
  fecha: hoy(),
  tipo: "factura",
  proveedor: "",
  cif: "",
  numero: "",
  categoria: "otros",
  total: "",
  iva: [],
  lineas: [],
  metodo_pago: "",
  notas: "",
  documento_path: null,
});

const deGasto = (g: Gasto): Borrador => ({
  id: g.id,
  fecha: g.fecha,
  tipo: g.tipo,
  proveedor: g.proveedor,
  cif: g.cif ?? "",
  numero: g.numero ?? "",
  categoria: g.categoria,
  total: eurosC(g.total_centimos),
  iva: g.iva.map((i) => ({ tipo: String(i.tipo), base: eurosC(i.base_centimos), cuota: eurosC(i.cuota_centimos) })),
  lineas: g.lineas.map((l) => ({ texto: l.texto, cantidad: l.cantidad == null ? "" : String(l.cantidad).replace(".", ","), precio: eurosC(l.precio_centimos), importe: eurosC(l.importe_centimos) })),
  metodo_pago: g.metodo_pago ?? "",
  notas: g.notas ?? "",
  documento_path: g.documento_path,
});

const deLectura = (r: GastoLeido, doc: DocumentoLeido): Borrador => ({
  ...vacio(),
  fecha: r.fecha ?? hoy(),
  tipo: r.tipo,
  proveedor: r.proveedor ?? "",
  cif: r.cif ?? "",
  numero: r.numero ?? "",
  categoria: r.categoria ?? "otros",
  total: euros(r.total ?? (r.lineas.length ? sumaLineas(r.lineas) : null)),
  iva: r.iva.map((i) => ({ tipo: String(i.tipo), base: euros(i.base), cuota: euros(i.cuota) })),
  lineas: r.lineas.map((l) => ({ texto: l.texto, cantidad: l.cantidad == null ? "" : String(l.cantidad).replace(".", ","), precio: euros(l.precio), importe: euros(l.importe) })),
  metodo_pago: r.tipo === "ticket" ? "tarjeta" : "",
  jpeg: doc.jpeg,
  leido: r,
  marcas: calcularMarcas(doc.cajas, r, doc.ancho, doc.alto),
  ms: doc.ms,
});

export function GastosPanel({
  mes,
  gastos,
  proveedores,
  propios,
}: {
  mes: string; // YYYY-MM
  gastos: Gasto[];
  proveedores: ProveedorGasto[];
  propios: { nombres: string[]; cif: string | null };
}) {
  const router = useRouter();
  const [vista, setVista] = useState<"gastos" | "proveedores">("gastos");
  const [editando, setEditando] = useState<Borrador | null>(null);
  const [leyendo, setLeyendo] = useState<EstadoLectura | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const [filtro, setFiltro] = useState<CategoriaGasto | "">("");
  const fotoRef = useRef<HTMLInputElement>(null);
  const archivoRef = useRef<HTMLInputElement>(null);

  const total = gastos.reduce((t, g) => t + g.total_centimos, 0);
  const iva = gastos.reduce((t, g) => t + (g.iva_centimos ?? 0), 0);
  const porCategoria = useMemo(() => {
    const m = new Map<CategoriaGasto, number>();
    for (const g of gastos) m.set(g.categoria, (m.get(g.categoria) ?? 0) + g.total_centimos);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [gastos]);
  const lista = filtro ? gastos.filter((g) => g.categoria === filtro) : gastos;

  const [anio, numMes] = mes.split("-").map(Number) as [number, number];
  const nombreMes = nombreDeMes(mes);
  const irMes = (delta: number) => {
    const d = new Date(Date.UTC(anio, numMes - 1 + delta, 1));
    router.push(`/admin/gastos?mes=${d.toISOString().slice(0, 7)}`);
  };

  const escanear = async (file: File | undefined) => {
    if (!file) return;
    setAviso(null);
    setLeyendo("preparando");
    try {
      const { leerDocumento } = await import("@/lib/gastos/documento");
      const doc = await leerDocumento(file, setLeyendo);
      const r = leerGasto(doc.cajas, { memoria: proveedores, propios });
      setEditando(deLectura(r, doc));
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? `No se ha podido leer: ${e.message}` : "No se ha podido leer el documento." });
    } finally {
      setLeyendo(null);
      if (fotoRef.current) fotoRef.current.value = "";
      if (archivoRef.current) archivoRef.current.value = "";
    }
  };

  const exportar = () =>
    descargarCsv(
      `gastos-${mes}.csv`,
      gastos.map((g) => ({
        Fecha: g.fecha,
        Tipo: TIPOS[g.tipo],
        Proveedor: g.proveedor,
        CIF: g.cif,
        Número: g.numero,
        Categoría: CATEGORIAS[g.categoria],
        Base: g.base_centimos == null ? null : g.base_centimos / 100,
        IVA: g.iva_centimos == null ? null : g.iva_centimos / 100,
        Total: g.total_centimos / 100,
        "Forma de pago": g.metodo_pago ? PAGOS[g.metodo_pago] : null,
        Notas: g.notas,
      })),
    );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className={`${card} flex items-center gap-1 p-1`}>
          <button type="button" onClick={() => irMes(-1)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-arena dark:hover:bg-noche-3">
            <Icon name="chevronLeft" className="h-4 w-4" />
            <span className="sr-only">Mes anterior</span>
          </button>
          <span className="min-w-36 text-center font-semibold first-letter:uppercase">{nombreMes}</span>
          <button type="button" onClick={() => irMes(1)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-arena dark:hover:bg-noche-3">
            <Icon name="chevronRight" className="h-4 w-4" />
            <span className="sr-only">Mes siguiente</span>
          </button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <input ref={fotoRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => escanear(e.target.files?.[0])} />
          <input ref={archivoRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => escanear(e.target.files?.[0])} />
          <button type="button" disabled={!!leyendo} onClick={() => fotoRef.current?.click()} className={botonPrimario}>
            <Icon name="receipt" className="h-4 w-4" />
            Hacer foto
          </button>
          <button type="button" disabled={!!leyendo} onClick={() => archivoRef.current?.click()} className={botonSecundario}>
            <Icon name="download" className="h-4 w-4 rotate-180" />
            Subir foto o PDF
          </button>
          <button type="button" onClick={() => setEditando(vacio())} className={botonSecundario}>
            <Icon name="plus" className="h-4 w-4" />A mano
          </button>
          <button type="button" disabled={!gastos.length} onClick={exportar} className={botonSecundario}>
            <Icon name="download" className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {leyendo ? (
        <p role="status" className={`${card} flex items-center gap-3 p-4 text-sm font-semibold`}>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-marino border-t-transparent dark:border-neon dark:border-t-transparent" />
          {ESTADOS[leyendo]}
        </p>
      ) : null}
      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Cifra label="Gastos del mes" valor={formatCentimos(total)} icon="receipt" />
        <Cifra label="IVA soportado" valor={formatCentimos(iva)} icon="tag" />
        <Cifra label="Documentos" valor={gastos.length} icon="grid" />
      </div>

      {porCategoria.length ? (
        <section aria-label="Por categoría" className={`${card} p-5`}>
          <ul className="grid gap-2">
            {porCategoria.map(([c, v]) => (
              <li key={c}>
                <button type="button" onClick={() => setFiltro(filtro === c ? "" : c)} className={`grid w-full gap-1 rounded-lg p-1 text-left text-sm ${filtro === c ? "bg-arena dark:bg-noche-3" : ""}`}>
                  <span className="flex justify-between gap-2">
                    <span className="font-semibold">{CATEGORIAS[c]}</span>
                    <span className="tabular-nums">{formatCentimos(v)}</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-carbon/[0.06] dark:bg-crema/10">
                    <span className="block h-full rounded-full bg-marino dark:bg-neon" style={{ width: `${total > 0 ? Math.max(2, (v / total) * 100) : 0}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div role="tablist" className="flex gap-2">
        {(
          [
            ["gastos", `Gastos${filtro ? ` · ${CATEGORIAS[filtro]}` : ""}`],
            ["proveedores", `Proveedores aprendidos (${proveedores.length})`],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={vista === v} onClick={() => setVista(v)} className={vista === v ? botonPrimario : botonSecundario}>
            {label}
          </button>
        ))}
      </div>

      {vista === "gastos" ? (
        <ListaGastos gastos={lista} onEditar={(g) => setEditando(deGasto(g))} />
      ) : (
        <ListaProveedores proveedores={proveedores} onCambio={() => router.refresh()} />
      )}

      {editando ? (
        <EditorGasto
          inicial={editando}
          proveedores={proveedores}
          onClose={() => setEditando(null)}
          onGuardado={(texto, fecha) => {
            setEditando(null);
            // Un gasto de otro mes (la fecha es la del documento) no saldría
            // en el que se está viendo: se va a su mes.
            if (fecha && fecha.slice(0, 7) !== mes) {
              setAviso({ tono: "ok", texto: `${texto} Está en ${nombreDeMes(fecha)}, que es la fecha del documento.` });
              router.push(`/admin/gastos?mes=${fecha.slice(0, 7)}`);
            } else {
              setAviso({ tono: "ok", texto });
              router.refresh();
            }
          }}
        />
      ) : null}
    </div>
  );
}

function ListaGastos({ gastos, onEditar }: { gastos: Gasto[]; onEditar: (g: Gasto) => void }) {
  if (!gastos.length) {
    return (
      <p className={`${card} grid place-items-center gap-2 p-10 text-center text-sm opacity-70`}>
        <Icon name="receipt" className="h-6 w-6" />
        No hay gastos este mes. Haz una foto a un albarán, factura o ticket para empezar.
      </p>
    );
  }
  return (
    <ul className={`${card} divide-y divide-carbon/10 dark:divide-crema/10`}>
      {gastos.map((g) => (
        <li key={g.id}>
          <button type="button" onClick={() => onEditar(g)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-arena/60 dark:hover:bg-noche-3">
            <span className="w-14 shrink-0 text-xs tabular-nums text-carbon-muted dark:text-crema/60">
              {g.fecha.slice(8, 10)}/{g.fecha.slice(5, 7)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{g.proveedor}</span>
              <span className="block truncate text-xs text-carbon-muted dark:text-crema/60">
                {TIPOS[g.tipo]}
                {g.numero ? ` nº ${g.numero}` : ""} · {CATEGORIAS[g.categoria]}
                {g.metodo_pago ? ` · ${PAGOS[g.metodo_pago]}` : ""}
              </span>
            </span>
            {g.documento_path ? <Icon name="eye" className="h-4 w-4 shrink-0 opacity-50" /> : null}
            <span className={`shrink-0 font-display text-lg tabular-nums ${g.total_centimos < 0 ? "text-oliva" : ""}`}>{formatCentimos(g.total_centimos)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ListaProveedores({ proveedores, onCambio }: { proveedores: ProveedorGasto[]; onCambio: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const cambiar = async (id: string, p: Record<string, unknown>) => {
    setError(null);
    const r = await editarProveedorGasto(id, p);
    if (!r.ok) return setError(r.error);
    onCambio();
  };
  if (!proveedores.length) {
    return (
      <p className={`${card} p-6 text-sm opacity-70`}>
        Aún no hay proveedores. Cada gasto que guardas le enseña al lector el proveedor (por su CIF y por cómo sale escrito) y su categoría, y la
        próxima vez lo reconoce solo.
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-carbon-muted dark:text-crema/65">
        Lo que el lector ha aprendido de tus correcciones. Si reconoce mal a un proveedor, corrige aquí su categoría u olvida cómo lo leía.
      </p>
      {error ? <Aviso>{error}</Aviso> : null}
      <ul className={`${card} divide-y divide-carbon/10 dark:divide-crema/10`}>
        {proveedores.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.nombre}</p>
              <p className="text-xs text-carbon-muted dark:text-crema/60">
                {p.cif ?? "Sin CIF"} · {p.veces} {p.veces === 1 ? "documento" : "documentos"}
                {p.pistas.length ? ` · también lo reconoce como «${p.pistas.slice(-2).join("», «")}»` : ""}
              </p>
            </div>
            <select aria-label={`Categoría de ${p.nombre}`} value={p.categoria} onChange={(e) => cambiar(p.id, { categoria: e.target.value })} className={`${input} w-auto`}>
              {Object.entries(CATEGORIAS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            {p.pistas.length ? (
              <button type="button" onClick={() => cambiar(p.id, { olvidar_pistas: true })} className={botonSecundario}>
                Olvidar lecturas
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => confirm(`¿Olvidar a ${p.nombre}? Sus gastos se conservan.`) && cambiar(p.id, { borrar: true })}
              className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 text-terracota dark:border-crema/15"
            >
              <Icon name="trash" className="h-4 w-4" />
              <span className="sr-only">Olvidar proveedor</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorGasto({
  inicial,
  proveedores,
  onClose,
  onGuardado,
}: {
  inicial: Borrador;
  proveedores: ProveedorGasto[];
  onClose: () => void;
  onGuardado: (texto: string, fecha?: string) => void;
}) {
  const [b, setB] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [imagen, setImagen] = useState<string | null>(null);
  const [verTexto, setVerTexto] = useState(false);
  const set = (p: Partial<Borrador>) => setB((x) => ({ ...x, ...p }));
  // El punto de color junto a cada casilla, solo si ese dato está marcado en la foto.
  const marcados = useMemo(() => new Set(b.marcas?.m.map(([k]) => k)), [b.marcas]);
  const m = (k: TipoMarca) => (marcados.has(k) ? k : undefined);
  // Lo leído de un documento de otro mes no sale en el mes actual: se avisa.
  const fueraDeMes = !!b.leido && b.fecha.slice(0, 7) !== hoy().slice(0, 7);

  // Vista previa: la foto recién leída o, al editar, un enlace temporal.
  useEffect(() => {
    if (inicial.jpeg) {
      const url = URL.createObjectURL(inicial.jpeg);
      setImagen(url);
      return () => URL.revokeObjectURL(url);
    }
    if (inicial.documento_path) {
      let vivo = true;
      verDocumentoGasto(inicial.documento_path).then((r) => vivo && r.ok && setImagen(r.data));
      return () => {
        vivo = false;
      };
    }
  }, [inicial]);

  // Al elegir un proveedor conocido, su CIF y su categoría.
  const elegirProveedor = (nombre: string) => {
    const p = proveedores.find((x) => x.nombre === nombre);
    set(p ? { proveedor: nombre, cif: p.cif ?? b.cif, categoria: p.categoria } : { proveedor: nombre });
  };

  const sumaIva = b.iva.reduce((t, i) => ({ base: t.base + (centimos(i.base) ?? 0), cuota: t.cuota + (centimos(i.cuota) ?? 0) }), { base: 0, cuota: 0 });
  const totalC = centimos(b.total);
  const descuadre = b.iva.length && totalC != null && Math.abs(sumaIva.base + sumaIva.cuota - totalC) > 2;

  const guardar = async () => {
    setError(null);
    if (!b.proveedor.trim()) return setError("Falta el proveedor.");
    if (totalC == null) return setError("Falta el total.");
    setGuardando(true);
    let documento_path = b.documento_path;
    if (b.jpeg && !documento_path) {
      const form = new FormData();
      form.append("documento", b.jpeg, "documento.jpg");
      const s = await subirDocumentoGasto(form);
      if (!s.ok) {
        setGuardando(false);
        return setError(s.error);
      }
      documento_path = s.data;
      set({ documento_path });
    }
    const { texto, ...lectura } = b.leido ?? { texto: null };
    const r = await guardarGasto({
      id: b.id,
      fecha: b.fecha,
      tipo: b.tipo,
      proveedor: b.proveedor.trim(),
      cif: b.cif,
      numero: b.numero,
      categoria: b.categoria,
      total_centimos: totalC,
      base_centimos: b.iva.length ? sumaIva.base : null,
      iva_centimos: b.iva.length ? sumaIva.cuota : null,
      iva: b.iva
        .filter((i) => centimos(i.base) != null)
        .map((i) => ({ tipo: Number(i.tipo.replace(",", ".")) || 0, base_centimos: centimos(i.base), cuota_centimos: centimos(i.cuota) ?? 0 })),
      lineas: b.lineas
        .filter((l) => l.texto.trim() || centimos(l.importe) != null)
        .map((l) => ({
          texto: l.texto.trim(),
          cantidad: l.cantidad ? Number(l.cantidad.replace(",", ".")) || null : null,
          precio_centimos: centimos(l.precio),
          importe_centimos: centimos(l.importe),
        })),
      metodo_pago: b.metodo_pago || null,
      notas: b.notas,
      documento_path,
      proveedor_leido: b.leido?.proveedorLeido ?? null,
      ocr_texto: texto ? texto.join("\n") : null,
      ocr_lectura: b.leido ? { ...lectura, ms: b.ms, marcas: b.marcas ?? null } : null,
    });
    setGuardando(false);
    if (!r.ok) return setError(r.error);
    onGuardado(b.id ? "Gasto actualizado." : "Gasto guardado. El lector ya recuerda a este proveedor.", b.fecha);
  };

  const eliminar = async () => {
    if (!b.id || !confirm("¿Borrar este gasto y su documento?")) return;
    const r = await borrarGasto(b.id);
    if (!r.ok) return setError(r.error);
    onGuardado("Gasto borrado.");
  };

  const lineaCambia = (i: number, p: Partial<Borrador["lineas"][number]>) => set({ lineas: b.lineas.map((l, k) => (k === i ? { ...l, ...p } : l)) });
  const ivaCambia = (i: number, p: Partial<Borrador["iva"][number]>) => set({ iva: b.iva.map((l, k) => (k === i ? { ...l, ...p } : l)) });

  return (
    <Modal titulo={b.id ? "Editar gasto" : b.leido ? "Revisa lo leído" : "Nuevo gasto"} onClose={onClose} ancho={imagen ? "max-w-6xl" : "max-w-2xl"}>
      <div className={imagen ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : "grid gap-5"}>
        {imagen ? (
          <div className="lg:sticky lg:top-0 lg:max-h-[78svh] lg:overflow-auto">
            <FotoMarcada src={imagen} marcas={b.marcas ?? null} />
          </div>
        ) : null}
        <div className="grid content-start gap-4">
          {b.leido ? (
            <Aviso tono="info">
              Leído en el dispositivo{b.ms ? ` en ${(b.ms / 1000).toFixed(1)} s` : ""}. Los colores de la foto marcan de dónde sale cada dato: revísalos y lo que
              corrijas lo aprende para la próxima vez.
            </Aviso>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label={<Etiqueta tipo={m("proveedor")}>Proveedor</Etiqueta>}>
              <input list="gastos-proveedores" value={b.proveedor} onChange={(e) => elegirProveedor(e.target.value)} className={input} />
              <datalist id="gastos-proveedores">
                {proveedores.map((p) => (
                  <option key={p.id} value={p.nombre} />
                ))}
              </datalist>
            </Campo>
            <Campo label={<Etiqueta tipo={m("cif")}>CIF / NIF</Etiqueta>}>
              <input value={b.cif} onChange={(e) => set({ cif: e.target.value.toUpperCase() })} className={input} />
            </Campo>
            <Campo label="Tipo">
              <select value={b.tipo} onChange={(e) => set({ tipo: e.target.value as TipoGasto })} className={input}>
                {Object.entries(TIPOS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label={<Etiqueta tipo={m("numero")}>Número</Etiqueta>}>
              <input value={b.numero} onChange={(e) => set({ numero: e.target.value })} className={input} />
            </Campo>
            <Campo label={<Etiqueta tipo={m("fecha")}>Fecha</Etiqueta>} ayuda={fueraDeMes ? `Se apuntará en ${nombreDeMes(b.fecha)}. Cámbiala si el gasto es de otro día.` : undefined}>
              <input type="date" value={b.fecha} onChange={(e) => set({ fecha: e.target.value })} className={input} />
            </Campo>
            <Campo label="Categoría">
              <select value={b.categoria} onChange={(e) => set({ categoria: e.target.value as CategoriaGasto })} className={input}>
                {Object.entries(CATEGORIAS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label={<Etiqueta tipo={m("total")}>Total (€)</Etiqueta>} ayuda="Negativo si es un abono.">
              <input inputMode="decimal" value={b.total} onChange={(e) => set({ total: e.target.value })} className={`${input} font-semibold`} />
            </Campo>
            <Campo label="Forma de pago">
              <select value={b.metodo_pago ?? ""} onChange={(e) => set({ metodo_pago: e.target.value as Borrador["metodo_pago"] })} className={input}>
                <option value="">Sin indicar</option>
                {Object.entries(PAGOS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">
              <Etiqueta tipo={m("iva")}>Desglose de IVA</Etiqueta>
            </legend>
            {b.iva.map((i, k) => (
              <div key={k} className="grid grid-cols-[5rem_1fr_1fr_auto] items-center gap-2">
                <input aria-label="Tipo de IVA (%)" inputMode="decimal" value={i.tipo} onChange={(e) => ivaCambia(k, { tipo: e.target.value })} className={input} />
                <input aria-label="Base" placeholder="Base" inputMode="decimal" value={i.base} onChange={(e) => ivaCambia(k, { base: e.target.value })} className={input} />
                <input aria-label="Cuota" placeholder="Cuota" inputMode="decimal" value={i.cuota} onChange={(e) => ivaCambia(k, { cuota: e.target.value })} className={input} />
                <button type="button" onClick={() => set({ iva: b.iva.filter((_, x) => x !== k) })} className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15">
                  <Icon name="trash" className="h-4 w-4" />
                  <span className="sr-only">Quitar</span>
                </button>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => set({ iva: [...b.iva, { tipo: "10", base: "", cuota: "" }] })} className={botonSecundario}>
                <Icon name="plus" className="h-4 w-4" />
                Tipo de IVA
              </button>
              {descuadre ? <span className="text-sm font-semibold text-terracota">Base + IVA = {formatCentimos(sumaIva.base + sumaIva.cuota)}, no coincide con el total.</span> : null}
            </div>
          </fieldset>

          <details open={b.lineas.length > 0 && b.lineas.length <= 12} className="grid gap-2">
            <summary className="cursor-pointer text-sm font-semibold">Líneas ({b.lineas.length})</summary>
            <div className="mt-2 grid gap-2">
              {b.lineas.length && b.marcas ? (
                <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_5.5rem_2.25rem] gap-1.5 text-xs font-semibold text-carbon-muted dark:text-crema/60">
                  <Etiqueta tipo={m("producto")}>Concepto</Etiqueta>
                  <Etiqueta tipo={m("cantidad")}>Cant.</Etiqueta>
                  <Etiqueta tipo={m("precio")}>Precio</Etiqueta>
                  <Etiqueta tipo={m("importe")}>Importe</Etiqueta>
                </div>
              ) : null}
              {b.lineas.map((l, k) => (
                <div key={k} className="grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_5.5rem_auto] items-center gap-1.5">
                  <input aria-label="Concepto" value={l.texto} onChange={(e) => lineaCambia(k, { texto: e.target.value })} className={`${input} px-2 text-sm`} />
                  <input aria-label="Cantidad" inputMode="decimal" value={l.cantidad} onChange={(e) => lineaCambia(k, { cantidad: e.target.value })} className={`${input} px-2 text-sm`} />
                  <input aria-label="Precio" inputMode="decimal" value={l.precio} onChange={(e) => lineaCambia(k, { precio: e.target.value })} className={`${input} px-2 text-sm`} />
                  <input aria-label="Importe" inputMode="decimal" value={l.importe} onChange={(e) => lineaCambia(k, { importe: e.target.value })} className={`${input} px-2 text-sm`} />
                  <button type="button" onClick={() => set({ lineas: b.lineas.filter((_, x) => x !== k) })} className="grid h-11 w-9 place-items-center">
                    <Icon name="trash" className="h-4 w-4" />
                    <span className="sr-only">Quitar línea</span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => set({ lineas: [...b.lineas, { texto: "", cantidad: "", precio: "", importe: "" }] })} className={`${botonSecundario} justify-self-start`}>
                <Icon name="plus" className="h-4 w-4" />
                Línea
              </button>
            </div>
          </details>

          <Campo label="Notas">
            <textarea value={b.notas} onChange={(e) => set({ notas: e.target.value })} rows={2} className={`${input} h-auto py-2`} />
          </Campo>

          {b.leido?.texto.length ? (
            <div>
              <button type="button" onClick={() => setVerTexto(!verTexto)} className="text-xs font-semibold text-carbon-muted underline dark:text-crema/60">
                {verTexto ? "Ocultar" : "Ver"} el texto leído
              </button>
              {verTexto ? <pre className="mt-2 max-h-60 overflow-auto rounded-xl bg-arena p-3 text-xs dark:bg-noche-3">{b.leido.texto.join("\n")}</pre> : null}
            </div>
          ) : null}

          {error ? <Aviso>{error}</Aviso> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={guardando} onClick={guardar} className={botonPrimario}>
              <Icon name="check" className="h-4 w-4" />
              {guardando ? "Guardando…" : "Guardar gasto"}
            </button>
            <button type="button" onClick={onClose} className={botonSecundario}>
              Cancelar
            </button>
            {b.id ? (
              <button type="button" onClick={eliminar} className={`${botonPeligro} ml-auto`}>
                <Icon name="trash" className="h-4 w-4" />
                Borrar
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}
