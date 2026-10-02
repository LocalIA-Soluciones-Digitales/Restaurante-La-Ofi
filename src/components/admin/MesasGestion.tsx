"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Aviso, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { accionMesa, borrar, guardar } from "@/lib/admin/actions";
import type { MesaSalon, PersonaStaff, Zona } from "@/lib/admin/types";

const TIPOS: Zona["tipo"][] = ["barra", "comedor", "despacho", "terraza", "otra"];
const FORMAS: MesaSalon["forma"][] = ["cuadrada", "redonda", "rectangular", "taburete"];
const GEOMETRIA = ["x", "y", "ancho", "alto"] as const;

/** Color por tipo de zona (los de la paleta del local), para el plano y las cabeceras. */
const COLOR: Record<Zona["tipo"], string> = {
  barra: "#1E3557",
  comedor: "#B07A45",
  despacho: "#8E7CF0",
  terraza: "#56653A",
  otra: "#96442B",
};
const SIN_ZONA = "#8A8A8A";

const porNumero = (a: MesaSalon, b: MesaSalon) => a.numero.localeCompare(b.numero, "es", { numeric: true, sensitivity: "base" });
const mismaZona = (a: Zona, b: Zona) => a.nombre === b.nombre && a.tipo === b.tipo && GEOMETRIA.every((k) => Number(a[k]) === Number(b[k]));

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Editor del salón (portado de MesasGestion de Palomita): zonas con su rectángulo
 * en el plano (bloqueadas hasta pulsar «Desbloquear»), mesas agrupadas por zona
 * con capacidad y forma, QR por mesa (ver, descargar, regenerar si un QR impreso
 * se filtra) e impresión en lote.
 */
export function MesasGestion({ zonas: z0, mesas: m0, qrs, staff = [] }: { zonas: Zona[]; mesas: MesaSalon[]; qrs: Record<string, string>; staff?: PersonaStaff[] }) {
  const equipo = staff.filter((p) => p.activo);
  /** Asignar camarero/a (zona o mesa): «Mis mesas» en el salón y sus avisos en «Hoy». */
  // Función (no componente) para que el select no se vuelva a montar al guardar.
  const selectorCamarero = ({ valor, vacio, onCambio, etiqueta, className = "h-10 rounded-lg bg-transparent" }: { valor: string | null | undefined; vacio: string; onCambio: (id: string | null) => void; etiqueta: string; className?: string }) => (
    <select aria-label={etiqueta} defaultValue={valor ?? ""} onChange={(e) => onCambio(e.target.value || null)} className={className}>
      <option value="">{vacio}</option>
      {equipo.map((p) => (
        <option key={p.user_id} value={p.user_id}>
          {p.nombre}
        </option>
      ))}
    </select>
  );
  const ordenarZonas = (l: Zona[]) => [...l].sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"));
  const [zonas, setZonas] = useState(() => ordenarZonas(z0));
  // Copia de lo guardado: para marcar cambios sin guardar y descartarlos al bloquear.
  const [guardadas, setGuardadas] = useState(() => ordenarZonas(z0));
  const [editable, setEditable] = useState(false);
  const [mesas, setMesas] = useState(m0);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [nuevaZona, setNuevaZona] = useState({ nombre: "", tipo: "comedor" as Zona["tipo"] });
  const [nuevaMesa, setNuevaMesa] = useState({ numero: "", capacidad: 4, forma: "cuadrada" as MesaSalon["forma"], zona_id: z0[0]?.id ?? "" });
  const [qr, setQr] = useState<MesaSalon | null>(null);

  const res = (r: { ok: boolean; error?: string }, okMsg: string) => {
    if (!r.ok) {
      setError(r.error ?? "Error");
      setOk(null);
      return false;
    }
    setError(null);
    setOk(okMsg);
    return true;
  };

  const sinGuardar = (z: Zona) => {
    const g = guardadas.find((x) => x.id === z.id);
    return !!g && !mismaZona(g, z);
  };
  const pendientes = zonas.filter(sinGuardar);
  const cambiarZona = (id: string, cambios: Partial<Zona>) => setZonas((l) => l.map((z) => (z.id === id ? { ...z, ...cambios } : z)));
  const bloquear = () => {
    if (pendientes.length && !window.confirm(`Hay ${pendientes.length} zona(s) con cambios sin guardar. ¿Descartarlos y bloquear?`)) return;
    setZonas(guardadas);
    setEditable(false);
  };

  const guardarMesa = async (m: MesaSalon, cambios: Partial<MesaSalon>, msg: string) => {
    if (res(await guardar("mesas", { id: m.id, ...cambios }), msg)) setMesas((l) => l.map((x) => (x.id === m.id ? { ...x, ...cambios } : x)));
  };

  const grupos = [
    ...zonas.map((z) => ({ id: z.id, nombre: z.nombre, color: COLOR[z.tipo], mesas: mesas.filter((m) => m.zona_id === z.id).sort(porNumero) })),
    { id: "", nombre: "Sin zona", color: SIN_ZONA, mesas: mesas.filter((m) => !m.zona_id || !zonas.some((z) => z.id === m.zona_id)).sort(porNumero) },
  ].filter((g) => g.id || g.mesas.length);
  const plazas = (l: MesaSalon[]) => l.filter((m) => m.activa).reduce((s, m) => s + m.capacidad, 0);
  // Columnas de la fila de mesa en escritorio (en móvil cada mesa es una tarjeta).
  const columnas = { "--cols": `3.25rem minmax(7rem,1.4fr) minmax(7rem,1fr) 4.5rem minmax(7rem,1fr)${equipo.length ? " minmax(8rem,1fr)" : ""} 4.5rem auto` } as CSSProperties;
  const etiquetaMovil = "text-[0.7rem] font-semibold uppercase tracking-wider text-carbon-muted dark:text-crema/55 md:sr-only";
  const campoMesa = "h-10 w-full rounded-lg border border-carbon/10 bg-white px-2 dark:border-crema/10 dark:bg-noche-3 md:border-transparent md:bg-transparent md:hover:border-carbon/15 md:dark:bg-transparent md:dark:hover:border-crema/15";

  return (
    <div className="grid gap-6">
      {error ? <Aviso>{error}</Aviso> : null}
      {ok ? <Aviso tono="ok">{ok}</Aviso> : null}

      <section className={`${card} p-4 sm:p-5`} aria-labelledby="zonas-t">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="zonas-t" className="font-display text-2xl">
              Zonas
            </h2>
            <p className="text-sm opacity-70">{editable ? "Edición abierta: los cambios se ven en el plano al momento; guarda cada zona." : "Bloqueadas para no moverlas sin querer. Pulsa la zona para ir a sus mesas."}</p>
          </div>
          {editable ? (
            <button type="button" onClick={bloquear} className={botonPrimario}>
              <Icon name="lock" className="h-4 w-4" />
              Bloquear
            </button>
          ) : (
            <button type="button" onClick={() => setEditable(true)} className={botonSecundario}>
              <Icon name="edit" className="h-4 w-4" />
              Desbloquear para editar
            </button>
          )}
        </div>

        {/* Plano en miniatura: cada zona con su rectángulo (posición y tamaño en % del plano). */}
        <div className={`relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-2xl border bg-arena/60 dark:bg-noche-3 sm:aspect-[16/7] ${editable ? "border-dashed border-marino/40 dark:border-neon/40" : "border-carbon/10 dark:border-crema/10"}`}>
          {zonas.map((z) => {
            const deZona = mesas.filter((m) => m.zona_id === z.id);
            return (
              <a
                key={z.id}
                href={editable ? `#zona-editar-${z.id}` : `#zona-${z.id}`}
                className="absolute flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border-2 p-1 text-center transition-[left,top,width,height] duration-200 hover:brightness-110"
                style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.ancho}%`, height: `${z.alto}%`, borderColor: COLOR[z.tipo], backgroundColor: `${COLOR[z.tipo]}2e` }}
              >
                <span className="max-w-full truncate text-xs font-bold sm:text-sm">{z.nombre}</span>
                <span className="max-w-full truncate text-[0.65rem] opacity-75 sm:text-xs">
                  {deZona.length} mesas · {plazas(deZona)} pl.
                </span>
              </a>
            );
          })}
          {!zonas.length ? <p className="grid h-full place-items-center text-sm opacity-60">Aún no hay zonas.</p> : null}
        </div>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {zonas.map((z) => {
            const deZona = mesas.filter((m) => m.zona_id === z.id);
            const sucio = sinGuardar(z);
            return (
              <li
                key={z.id}
                id={`zona-editar-${z.id}`}
                className={`scroll-mt-24 rounded-2xl border border-l-[6px] bg-arena/50 p-3 dark:bg-noche-3 ${sucio ? "border-terracota/60" : "border-carbon/10 dark:border-crema/10"}`}
                style={{ borderLeftColor: COLOR[z.tipo] }}
              >
                {editable ? (
                  <div className="grid gap-2">
                    <div className="grid grid-cols-[1fr_8rem] gap-2">
                      <label className="grid gap-1 text-xs font-semibold">
                        Nombre
                        <input value={z.nombre} onChange={(e) => cambiarZona(z.id, { nombre: e.target.value })} className={input} />
                      </label>
                      <label className="grid gap-1 text-xs font-semibold">
                        Tipo
                        <select value={z.tipo} onChange={(e) => cambiarZona(z.id, { tipo: e.target.value as Zona["tipo"] })} className={input}>
                          {TIPOS.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {GEOMETRIA.map((k) => (
                        <label key={k} className="grid gap-1 text-xs font-semibold">
                          {k} %
                          <input type="number" inputMode="numeric" min={0} max={100} value={Number(z[k])} onChange={(e) => cambiarZona(z.id, { [k]: Number(e.target.value) })} className={`${input} px-2`} />
                        </label>
                      ))}
                    </div>
                    {equipo.length ? (
                      <label className="grid gap-1 text-xs font-semibold">
                        Camarero/a
                        {selectorCamarero({
                          etiqueta: `Camarero de ${z.nombre}`,
                          valor: z.camarero_id,
                          vacio: "Sin asignar",
                          className: input,
                          onCambio: async (id) => res(await guardar("zonas", { id: z.id, camarero_id: id }), `Zona «${z.nombre}»: camarero/a guardado.`),
                        })}
                      </label>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!sucio}
                        className={`${botonPrimario} flex-1`}
                        onClick={async () => {
                          const r = await guardar<Zona>("zonas", { id: z.id, nombre: z.nombre, tipo: z.tipo, x: z.x, y: z.y, ancho: z.ancho, alto: z.alto });
                          if (res(r, `Zona «${z.nombre}» guardada.`) && r.ok) {
                            setZonas((l) => l.map((x) => (x.id === z.id ? r.data : x)));
                            setGuardadas((l) => l.map((x) => (x.id === z.id ? r.data : x)));
                          }
                        }}
                      >
                        <Icon name="check" className="h-4 w-4" />
                        {sucio ? "Guardar cambios" : "Guardada"}
                      </button>
                      <button
                        type="button"
                        className={botonPeligro}
                        onClick={async () => {
                          if (!window.confirm(`¿Borrar la zona «${z.nombre}»? Sus mesas quedan sin zona.`)) return;
                          if (res(await borrar("zonas", z.id), "Zona borrada.")) {
                            setZonas((l) => l.filter((x) => x.id !== z.id));
                            setGuardadas((l) => l.filter((x) => x.id !== z.id));
                          }
                        }}
                      >
                        <Icon name="trash" className="h-4 w-4" />
                        <span className="sr-only">Borrar zona {z.nombre}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <a href={`#zona-${z.id}`} className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{z.nombre}</span>
                      <span className="text-xs capitalize opacity-65">{z.tipo}</span>
                    </span>
                    <span className="shrink-0 text-right text-sm tabular-nums">
                      <span className="block font-semibold">{deZona.length} mesas</span>
                      <span className="text-xs opacity-65">{plazas(deZona)} plazas</span>
                    </span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        {editable ? (
          <form
            className="mt-4 grid gap-2 rounded-2xl border border-dashed border-carbon/20 p-3 dark:border-crema/20 sm:flex sm:flex-wrap sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await guardar<Zona>("zonas", { nombre: nuevaZona.nombre, slug: slugify(nuevaZona.nombre), tipo: nuevaZona.tipo, orden: zonas.length + 1 });
              if (res(r, "Zona creada.") && r.ok) {
                setZonas((l) => [...l, r.data]);
                setGuardadas((l) => [...l, r.data]);
                setNuevaZona({ nombre: "", tipo: "comedor" });
              }
            }}
          >
            <input required value={nuevaZona.nombre} onChange={(e) => setNuevaZona({ ...nuevaZona, nombre: e.target.value })} placeholder="Nueva zona (p. ej. Terraza)" aria-label="Nombre de la nueva zona" className={`${input} sm:max-w-xs`} />
            <select value={nuevaZona.tipo} onChange={(e) => setNuevaZona({ ...nuevaZona, tipo: e.target.value as Zona["tipo"] })} aria-label="Tipo de la nueva zona" className={`${input} sm:max-w-[10rem]`}>
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button type="submit" className={botonPrimario}>
              <Icon name="plus" className="h-4 w-4" />
              Añadir zona
            </button>
          </form>
        ) : null}
      </section>

      <section className={`${card} p-4 sm:p-5`} aria-labelledby="mesas-t">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="mesas-t" className="font-display text-2xl">
              Mesas
            </h2>
            <p className="text-sm tabular-nums opacity-70">
              {mesas.filter((m) => m.activa).length} activas de {mesas.length} · {plazas(mesas)} plazas
            </p>
          </div>
          <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <Link href="/admin/mesas/qr?plantilla=metacrilato" className={botonSecundario}>
              <Icon name="print" className="h-4 w-4" />
              QR para metacrilato (A6)
            </Link>
            <Link href="/admin/mesas/qr?plantilla=pegatina" className={botonSecundario}>
              <Icon name="print" className="h-4 w-4" />
              QR en pegatina (7 cm)
            </Link>
          </div>
        </div>

        {/* Saltos rápidos a cada zona (sobre todo en móvil). */}
        <nav aria-label="Ir a la zona" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {grupos.map((g) => (
            <a key={g.id || "sin"} href={`#zona-${g.id || "sin"}`} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-carbon/15 px-3 text-sm font-semibold hover:bg-arena dark:border-crema/15 dark:hover:bg-noche-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
              {g.nombre}
              <span className="tabular-nums opacity-60">{g.mesas.length}</span>
            </a>
          ))}
        </nav>

        <div className="mt-4 grid gap-6">
          {grupos.map((g) => (
            <section key={g.id || "sin"} id={`zona-${g.id || "sin"}`} aria-label={`Mesas de ${g.nombre}`} className="scroll-mt-24">
              <header className="flex items-center justify-between gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: `${g.color}1f` }}>
                <h3 className="flex items-center gap-2 font-display text-xl">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.nombre}
                </h3>
                <span className="text-sm tabular-nums opacity-75">
                  {g.mesas.length} mesas · {plazas(g.mesas)} plazas
                </span>
              </header>

              {g.mesas.length ? (
                <>
                  <div className="hidden px-2 pb-1 pt-3 text-xs uppercase tracking-wider opacity-55 md:grid md:gap-3 md:[grid-template-columns:var(--cols)]" style={columnas} aria-hidden>
                    <span>Nº</span>
                    <span>Nombre</span>
                    <span>Zona</span>
                    <span>Cap.</span>
                    <span>Forma</span>
                    {equipo.length ? <span>Camarero/a</span> : null}
                    <span>Activa</span>
                    <span className="text-right">QR</span>
                  </div>
                  <ul className="mt-2 grid gap-2 md:mt-0 md:gap-0 md:divide-y md:divide-carbon/10 md:dark:divide-crema/10">
                    {g.mesas.map((m) => (
                      <li
                        key={m.id}
                        className={`grid gap-3 rounded-2xl border border-carbon/10 p-3 dark:border-crema/10 md:items-center md:rounded-none md:border-0 md:px-2 md:py-1.5 md:[grid-template-columns:var(--cols)] ${m.activa ? "" : "opacity-55"}`}
                        style={columnas}
                      >
                        <div className="flex items-center gap-3 md:contents">
                          <span className="grid h-11 min-w-11 place-items-center rounded-xl px-2 font-display text-lg font-semibold tabular-nums text-crema md:h-9 md:min-w-9 md:text-base" style={{ backgroundColor: g.color }}>
                            {m.numero}
                          </span>
                          <label className="grid flex-1 gap-1">
                            <span className={etiquetaMovil}>Nombre</span>
                            <input
                              defaultValue={m.nombre ?? ""}
                              placeholder="Sin nombre"
                              onBlur={async (e) => {
                                if ((m.nombre ?? "") === e.target.value) return;
                                await guardarMesa(m, { nombre: e.target.value || null }, `Mesa ${m.numero} guardada.`);
                              }}
                              className={campoMesa}
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:contents">
                          <label className={`grid gap-1 ${equipo.length ? "" : "max-md:col-span-2"}`}>
                            <span className={etiquetaMovil}>Zona</span>
                            <select defaultValue={m.zona_id ?? ""} onChange={async (e) => guardarMesa(m, { zona_id: e.target.value || null }, `Mesa ${m.numero} movida de zona.`)} className={campoMesa}>
                              <option value="">Sin zona</option>
                              {zonas.map((z) => (
                                <option key={z.id} value={z.id}>
                                  {z.nombre}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-1">
                            <span className={etiquetaMovil}>Capacidad</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={40}
                              defaultValue={m.capacidad}
                              onBlur={async (e) => {
                                if (Number(e.target.value) === m.capacidad) return;
                                await guardarMesa(m, { capacidad: Number(e.target.value) }, `Mesa ${m.numero} guardada.`);
                              }}
                              className={`${campoMesa} tabular-nums`}
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className={etiquetaMovil}>Forma</span>
                            <select defaultValue={m.forma} onChange={async (e) => guardarMesa(m, { forma: e.target.value as MesaSalon["forma"] }, `Mesa ${m.numero} guardada.`)} className={`${campoMesa} capitalize`}>
                              {FORMAS.map((f) => (
                                <option key={f}>{f}</option>
                              ))}
                            </select>
                          </label>
                          {equipo.length ? (
                            <label className="grid gap-1">
                              <span className={etiquetaMovil}>Camarero/a</span>
                              {selectorCamarero({
                                etiqueta: `Camarero de la mesa ${m.numero}`,
                                valor: m.camarero_id,
                                vacio: "El de su zona",
                                className: campoMesa,
                                onCambio: async (id) => res(await guardar("mesas", { id: m.id, camarero_id: id }), `Mesa ${m.numero}: camarero/a guardado.`),
                              })}
                            </label>
                          ) : null}
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-carbon/10 pt-3 dark:border-crema/10 md:contents">
                          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold">
                            <input
                              type="checkbox"
                              defaultChecked={m.activa}
                              aria-label={`Mesa ${m.numero} activa`}
                              onChange={async (e) => guardarMesa(m, { activa: e.target.checked }, `Mesa ${m.numero} ${e.target.checked ? "activada" : "desactivada"}.`)}
                              className="h-5 w-5 accent-marino dark:accent-neon"
                            />
                            <span className="md:sr-only">Activa</span>
                          </label>
                          <button type="button" onClick={() => setQr(m)} className={`${botonSecundario} md:justify-self-end`}>
                            <Icon name="qr" className="h-4 w-4" />
                            Ver QR
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="px-3 py-4 text-sm opacity-60">Sin mesas en esta zona.</p>
              )}
            </section>
          ))}
        </div>

        <form
          className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-dashed border-carbon/20 p-3 dark:border-crema/20 sm:flex sm:flex-wrap sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await guardar<MesaSalon>("mesas", { ...nuevaMesa, zona_id: nuevaMesa.zona_id || null });
            if (res(r, `Mesa ${nuevaMesa.numero} creada. Recarga para ver su QR.`) && r.ok) {
              setMesas((l) => [...l, r.data]);
              setNuevaMesa({ ...nuevaMesa, numero: "" });
            }
          }}
        >
          <input required value={nuevaMesa.numero} onChange={(e) => setNuevaMesa({ ...nuevaMesa, numero: e.target.value })} placeholder="Número (p. ej. 12 o T3)" aria-label="Número de la nueva mesa" className={`${input} col-span-2 sm:max-w-[12rem]`} />
          <select value={nuevaMesa.zona_id} onChange={(e) => setNuevaMesa({ ...nuevaMesa, zona_id: e.target.value })} aria-label="Zona" className={`${input} col-span-2 sm:max-w-[10rem]`}>
            <option value="">Sin zona</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}
              </option>
            ))}
          </select>
          <input type="number" inputMode="numeric" min={1} max={40} value={nuevaMesa.capacidad} onChange={(e) => setNuevaMesa({ ...nuevaMesa, capacidad: Number(e.target.value) })} className={`${input} sm:w-20`} aria-label="Capacidad" />
          <select value={nuevaMesa.forma} onChange={(e) => setNuevaMesa({ ...nuevaMesa, forma: e.target.value as MesaSalon["forma"] })} className={`${input} sm:max-w-[9rem]`} aria-label="Forma">
            {FORMAS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <button type="submit" className={`${botonPrimario} col-span-2`}>
            <Icon name="plus" className="h-4 w-4" />
            Añadir mesa
          </button>
        </form>
      </section>

      {qr ? (
        <div role="dialog" aria-modal="true" aria-label={`QR de la mesa ${qr.numero}`} className="fixed inset-0 z-50 grid place-items-center bg-carbon/60 p-4" onClick={(e) => e.target === e.currentTarget && setQr(null)}>
          <div className="w-full max-w-sm rounded-[1.75rem] bg-crema p-6 text-center text-carbon">
            <p className="font-display text-3xl">Mesa {qr.numero}</p>
            {qrs[qr.id] ? <div className="mx-auto mt-4 w-56" dangerouslySetInnerHTML={{ __html: qrs[qr.id]! }} /> : <p className="mt-4 text-sm">Recarga la página para generar el QR.</p>}
            <div className="mt-5 grid gap-2">
              {qrs[qr.id] ? (
                <a
                  download={`la-ofi-mesa-${qr.numero}.svg`}
                  href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrs[qr.id]!)}`}
                  className={botonPrimario}
                >
                  <Icon name="download" className="h-4 w-4" />
                  Descargar SVG
                </a>
              ) : null}
              <button
                type="button"
                className={botonPeligro}
                onClick={async () => {
                  if (!window.confirm("El QR impreso de esta mesa dejará de funcionar. ¿Regenerar?")) return;
                  if (res(await accionMesa(qr.id, "regenerar_qr"), `QR de la mesa ${qr.numero} regenerado: recarga e imprímelo de nuevo.`)) setQr(null);
                }}
              >
                <Icon name="refresh" className="h-4 w-4" />
                Regenerar (si se ha filtrado)
              </button>
              <button type="button" className={botonSecundario} onClick={() => setQr(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
