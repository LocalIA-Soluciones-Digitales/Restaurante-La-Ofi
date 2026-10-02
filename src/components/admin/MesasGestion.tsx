"use client";

import Link from "next/link";
import { useState } from "react";
import { Aviso, botonPeligro, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { Icon } from "@/components/ui/Icon";
import { accionMesa, borrar, guardar } from "@/lib/admin/actions";
import type { MesaSalon, Zona } from "@/lib/admin/types";

const TIPOS: Zona["tipo"][] = ["barra", "comedor", "despacho", "terraza", "otra"];
const FORMAS: MesaSalon["forma"][] = ["cuadrada", "redonda", "rectangular", "taburete"];

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
 * en el plano, mesas con capacidad y forma, QR por mesa (ver, descargar,
 * regenerar si un QR impreso se filtra) e impresión en lote.
 */
export function MesasGestion({ zonas: z0, mesas: m0, qrs }: { zonas: Zona[]; mesas: MesaSalon[]; qrs: Record<string, string> }) {
  const [zonas, setZonas] = useState(z0);
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

  return (
    <div className="grid gap-6">
      {error ? <Aviso>{error}</Aviso> : null}
      {ok ? <Aviso tono="ok">{ok}</Aviso> : null}

      <section className={`${card} p-5`} aria-labelledby="zonas-t">
        <h2 id="zonas-t" className="font-display text-2xl">
          Zonas
        </h2>
        <p className="text-sm opacity-70">Posición y tamaño en % del plano (0–100). Arrastra las mesas desde «Salón».</p>
        <ul className="mt-4 grid gap-3">
          {zonas.map((z) => (
            <li key={z.id} className="grid gap-2 rounded-2xl bg-arena p-3 dark:bg-noche-3 sm:grid-cols-[1.5fr_1fr_repeat(4,4.5rem)_auto] sm:items-end">
              <label className="grid gap-1 text-xs">
                Nombre
                <input defaultValue={z.nombre} onBlur={(e) => (z.nombre = e.target.value)} className={input} />
              </label>
              <label className="grid gap-1 text-xs">
                Tipo
                <select defaultValue={z.tipo} onChange={(e) => (z.tipo = e.target.value as Zona["tipo"])} className={input}>
                  {TIPOS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              {(["x", "y", "ancho", "alto"] as const).map((k) => (
                <label key={k} className="grid gap-1 text-xs">
                  {k}
                  <input type="number" min={0} max={100} defaultValue={Number(z[k])} onBlur={(e) => (z[k] = Number(e.target.value))} className={input} />
                </label>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  className={botonSecundario}
                  onClick={async () => {
                    const r = await guardar<Zona>("zonas", { id: z.id, nombre: z.nombre, tipo: z.tipo, x: z.x, y: z.y, ancho: z.ancho, alto: z.alto });
                    if (res(r, `Zona «${z.nombre}» guardada.`) && r.ok) setZonas((l) => l.map((x) => (x.id === z.id ? r.data : x)));
                  }}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className={botonPeligro}
                  onClick={async () => {
                    if (!window.confirm(`¿Borrar la zona «${z.nombre}»? Sus mesas quedan sin zona.`)) return;
                    if (res(await borrar("zonas", z.id), "Zona borrada.")) setZonas((l) => l.filter((x) => x.id !== z.id));
                  }}
                >
                  <Icon name="trash" className="h-4 w-4" />
                  <span className="sr-only">Borrar zona</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await guardar<Zona>("zonas", { nombre: nuevaZona.nombre, slug: slugify(nuevaZona.nombre), tipo: nuevaZona.tipo, orden: zonas.length + 1 });
            if (res(r, "Zona creada.") && r.ok) {
              setZonas((l) => [...l, r.data]);
              setNuevaZona({ nombre: "", tipo: "comedor" });
            }
          }}
        >
          <input required value={nuevaZona.nombre} onChange={(e) => setNuevaZona({ ...nuevaZona, nombre: e.target.value })} placeholder="Nueva zona (p. ej. Terraza)" className={`${input} max-w-xs`} />
          <select value={nuevaZona.tipo} onChange={(e) => setNuevaZona({ ...nuevaZona, tipo: e.target.value as Zona["tipo"] })} className={`${input} max-w-[10rem]`}>
            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button type="submit" className={botonPrimario}>
            <Icon name="plus" className="h-4 w-4" />
            Añadir zona
          </button>
        </form>
      </section>

      <section className={`${card} p-5`} aria-labelledby="mesas-t">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mesas-t" className="font-display text-2xl">
            Mesas
          </h2>
          <div className="flex flex-wrap gap-2">
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
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider opacity-60">
                <th className="py-2">Nº</th>
                <th>Nombre</th>
                <th>Zona</th>
                <th>Cap.</th>
                <th>Forma</th>
                <th>Activa</th>
                <th className="text-right">QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-carbon/10 dark:divide-crema/10">
              {mesas.map((m) => (
                <tr key={m.id}>
                  <td className="py-2 font-semibold">{m.numero}</td>
                  <td>
                    <input
                      defaultValue={m.nombre ?? ""}
                      placeholder="—"
                      onBlur={async (e) => {
                        if ((m.nombre ?? "") === e.target.value) return;
                        res(await guardar("mesas", { id: m.id, nombre: e.target.value || null }), `Mesa ${m.numero} guardada.`);
                      }}
                      className="h-10 w-full rounded-lg border border-transparent bg-transparent px-2 hover:border-carbon/15 dark:hover:border-crema/15"
                    />
                  </td>
                  <td>
                    <select
                      defaultValue={m.zona_id ?? ""}
                      onChange={async (e) => res(await guardar("mesas", { id: m.id, zona_id: e.target.value || null }), `Mesa ${m.numero} movida de zona.`)}
                      className="h-10 rounded-lg bg-transparent"
                    >
                      <option value="">—</option>
                      {zonas.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={40}
                      defaultValue={m.capacidad}
                      onBlur={async (e) => res(await guardar("mesas", { id: m.id, capacidad: Number(e.target.value) }), `Mesa ${m.numero} guardada.`)}
                      className="h-10 w-16 rounded-lg bg-transparent px-2"
                    />
                  </td>
                  <td>
                    <select defaultValue={m.forma} onChange={async (e) => res(await guardar("mesas", { id: m.id, forma: e.target.value }), `Mesa ${m.numero} guardada.`)} className="h-10 rounded-lg bg-transparent">
                      {FORMAS.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      defaultChecked={m.activa}
                      aria-label={`Mesa ${m.numero} activa`}
                      onChange={async (e) => res(await guardar("mesas", { id: m.id, activa: e.target.checked }), `Mesa ${m.numero} ${e.target.checked ? "activada" : "desactivada"}.`)}
                      className="h-5 w-5"
                    />
                  </td>
                  <td className="text-right">
                    <button type="button" onClick={() => setQr(m)} className={botonSecundario}>
                      <Icon name="qr" className="h-4 w-4" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await guardar<MesaSalon>("mesas", { ...nuevaMesa, zona_id: nuevaMesa.zona_id || null });
            if (res(r, `Mesa ${nuevaMesa.numero} creada. Recarga para ver su QR.`) && r.ok) {
              setMesas((l) => [...l, r.data]);
              setNuevaMesa({ ...nuevaMesa, numero: "" });
            }
          }}
        >
          <input required value={nuevaMesa.numero} onChange={(e) => setNuevaMesa({ ...nuevaMesa, numero: e.target.value })} placeholder="Número (p. ej. 12 o T3)" className={`${input} max-w-[10rem]`} />
          <select value={nuevaMesa.zona_id} onChange={(e) => setNuevaMesa({ ...nuevaMesa, zona_id: e.target.value })} className={`${input} max-w-[10rem]`}>
            <option value="">Sin zona</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nombre}
              </option>
            ))}
          </select>
          <input type="number" min={1} max={40} value={nuevaMesa.capacidad} onChange={(e) => setNuevaMesa({ ...nuevaMesa, capacidad: Number(e.target.value) })} className={`${input} w-20`} aria-label="Capacidad" />
          <select value={nuevaMesa.forma} onChange={(e) => setNuevaMesa({ ...nuevaMesa, forma: e.target.value as MesaSalon["forma"] })} className={`${input} max-w-[9rem]`} aria-label="Forma">
            {FORMAS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <button type="submit" className={botonPrimario}>
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
