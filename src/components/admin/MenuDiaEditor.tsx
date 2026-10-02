"use client";

import { useEffect, useRef, useState } from "react";
import { Aviso, aCentimos, aEuros, botonPrimario, botonSecundario, card, input } from "@/components/admin/ui";
import { AllergenIcon } from "@/components/menu/AllergenIcon";
import { Icon } from "@/components/ui/Icon";
import { guardarMenuDia, rpcAdmin } from "@/lib/admin/actions";
import { ALERGENOS, type AlergenoKey } from "@/lib/allergens";
import { formatearFechaLarga, hoyEnMadrid } from "@/lib/format";
import type { TipoPlato } from "@/lib/restaurant/types";

interface PlatoForm {
  key: string;
  tipo: TipoPlato;
  nombre: string;
  descripcion: string;
  alergenos: AlergenoKey[];
}

interface MenuBd {
  fecha: string;
  precio_centimos: number | null;
  bebida_incluida: boolean;
  pan_incluido: boolean;
  postre_o_cafe: boolean;
  notas: string | null;
  disponible: boolean;
  updated_at: string;
  platos: { tipo: TipoPlato; nombre: string; descripcion: string | null; alergenos: AlergenoKey[] }[];
}

const TIPOS: { key: TipoPlato; label: string }[] = [
  { key: "plato", label: "A elegir" },
  { key: "primero", label: "Primero" },
  { key: "segundo", label: "Segundo" },
  { key: "postre", label: "Postre" },
];

const nuevo = (tipo: TipoPlato = "plato"): PlatoForm => ({ key: crypto.randomUUID(), tipo, nombre: "", descripcion: "", alergenos: [] });

function diaAnterior(fecha: string, n = 1) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Menú del día "en 1 minuto desde el móvil": fecha, precio, qué incluye y platos.
 * Se guarda en una sola operación (laofi_admin_guardar_menu_dia) y la web se
 * actualiza al momento ("actualizado hoy a las…").
 */
export function MenuDiaEditor() {
  const [fecha, setFecha] = useState(hoyEnMadrid());
  const [precio, setPrecio] = useState("");
  const [incluye, setIncluye] = useState({ pan: true, bebida: true, postre: true });
  const [notas, setNotas] = useState("");
  const [disponible, setDisponible] = useState(true);
  const [platos, setPlatos] = useState<PlatoForm[]>([nuevo()]);
  const [existe, setExiste] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error" | "info"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Mientras se carga el menú del día elegido, el formulario está bloqueado: si
  // no, la carga podría pisar lo que ya se ha escrito.
  const [cargando, setCargando] = useState(true);
  const ultimoInput = useRef<HTMLInputElement>(null);

  const aplicar = (m: MenuBd | null, copia = false) => {
    if (!m) return false;
    setPrecio(aEuros(m.precio_centimos));
    setIncluye({ pan: m.pan_incluido, bebida: m.bebida_incluida, postre: m.postre_o_cafe });
    setNotas(m.notas ?? "");
    setDisponible(copia ? true : m.disponible);
    setPlatos(m.platos.length ? m.platos.map((p) => ({ key: crypto.randomUUID(), tipo: p.tipo, nombre: p.nombre, descripcion: p.descripcion ?? "", alergenos: p.alergenos })) : [nuevo()]);
    return true;
  };

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    void rpcAdmin<MenuBd | null>("laofi_admin_menu_dia", { p_fecha: fecha }).then((r) => {
      if (!vivo) return;
      setCargando(false);
      if (!r.ok) return setAviso({ tono: "error", texto: r.error });
      if (r.data) {
        aplicar(r.data);
        setExiste(r.data.updated_at);
      } else {
        setExiste(null);
        setPlatos([nuevo()]);
        setNotas("");
      }
    });
    return () => {
      vivo = false;
    };
  }, [fecha]);

  const copiarUltimo = async () => {
    for (let i = 1; i <= 14; i++) {
      const r = await rpcAdmin<MenuBd | null>("laofi_admin_menu_dia", { p_fecha: diaAnterior(fecha, i) });
      if (r.ok && aplicar(r.data, true)) {
        setAviso({ tono: "info", texto: `Copiado del ${formatearFechaLarga(diaAnterior(fecha, i))}. Revísalo y publica.` });
        return;
      }
    }
    setAviso({ tono: "error", texto: "No hay menús en las dos últimas semanas." });
  };

  const publicar = async () => {
    setGuardando(true);
    setAviso(null);
    const r = await guardarMenuDia<MenuBd>({
      fecha,
      precio_centimos: aCentimos(precio),
      pan_incluido: incluye.pan,
      bebida_incluida: incluye.bebida,
      postre_o_cafe: incluye.postre,
      notas,
      disponible,
      platos: platos.filter((p) => p.nombre.trim()).map(({ tipo, nombre, descripcion, alergenos }) => ({ tipo, nombre, descripcion, alergenos })),
    });
    setGuardando(false);
    if (!r.ok) return setAviso({ tono: "error", texto: r.error });
    setExiste(r.data.updated_at);
    setAviso({ tono: "ok", texto: disponible ? "Publicado: ya se ve en la web." : "Guardado como no disponible (no se muestra en la web)." });
  };

  const cambiar = (key: string, p: Partial<PlatoForm>) => setPlatos((l) => l.map((x) => (x.key === key ? { ...x, ...p } : x)));

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div className={`${card} grid gap-4 p-5`}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid flex-1 gap-1 text-sm">
            <span className="font-semibold">Día</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} />
          </label>
          <label className="grid w-32 gap-1 text-sm">
            <span className="font-semibold">Precio €</span>
            <input value={precio} onChange={(e) => setPrecio(e.target.value)} inputMode="decimal" placeholder="0,00" className={`${input} text-right text-lg`} />
          </label>
        </div>
        <p className="text-sm opacity-70">
          <span className="first-letter:uppercase">{formatearFechaLarga(fecha)}</span>
          {existe ? ` · ya publicado, última edición ${new Date(existe).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}` : " · sin menú todavía"}
        </p>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-2 text-sm font-semibold">Incluye</legend>
          {(
            [
              ["pan", "Pan"],
              ["bebida", "Bebida"],
              ["postre", "Postre o café"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={incluye[k]}
              onClick={() => setIncluye((i) => ({ ...i, [k]: !i[k] }))}
              className="min-h-11 rounded-xl border border-carbon/15 px-4 font-semibold aria-pressed:border-oliva aria-pressed:bg-oliva aria-pressed:text-crema dark:border-crema/15"
            >
              {label}
            </button>
          ))}
        </fieldset>
        <button type="button" onClick={() => void copiarUltimo()} className={botonSecundario}>
          <Icon name="refresh" className="h-4 w-4" />
          Copiar del último menú
        </button>
      </div>

      <fieldset disabled={cargando} aria-busy={cargando} className={`${card} grid gap-3 p-5 disabled:opacity-60`}>
        <h2 className="font-display text-2xl">Platos{cargando ? <span className="ml-2 text-sm font-normal opacity-60">cargando…</span> : null}</h2>
        <ul className="grid gap-3">
          {platos.map((p, i) => (
            <li key={p.key} className="rounded-2xl bg-arena p-3 dark:bg-noche-3">
              <div className="flex gap-2">
                <select value={p.tipo} onChange={(e) => cambiar(p.key, { tipo: e.target.value as TipoPlato })} className={`${input} w-32 shrink-0`} aria-label="Tipo">
                  {TIPOS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <input
                  ref={i === platos.length - 1 ? ultimoInput : undefined}
                  value={p.nombre}
                  onChange={(e) => cambiar(p.key, { nombre: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setPlatos((l) => [...l, nuevo(p.tipo)]);
                      window.setTimeout(() => ultimoInput.current?.focus(), 0);
                    }
                  }}
                  placeholder="Lentejas estofadas…"
                  aria-label={`Plato ${i + 1}`}
                  className={input}
                />
                <button type="button" onClick={() => setPlatos((l) => (l.length > 1 ? l.filter((x) => x.key !== p.key) : [nuevo()]))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15">
                  <Icon name="trash" className="h-4 w-4" />
                  <span className="sr-only">Quitar plato</span>
                </button>
              </div>
              <button type="button" onClick={() => setAbierto(abierto === p.key ? null : p.key)} className="mt-2 text-xs font-semibold opacity-70 underline-offset-4 hover:underline" aria-expanded={abierto === p.key}>
                {p.alergenos.length ? `Alérgenos: ${p.alergenos.length}` : "Añadir alérgenos y descripción"}
              </button>
              {abierto === p.key ? (
                <div className="mt-2 grid gap-2">
                  <input value={p.descripcion} onChange={(e) => cambiar(p.key, { descripcion: e.target.value })} placeholder="Descripción (opcional)" className={input} />
                  <div className="flex flex-wrap gap-1.5">
                    {ALERGENOS.map((a) => (
                      <button
                        key={a.key}
                        type="button"
                        aria-pressed={p.alergenos.includes(a.key)}
                        onClick={() => cambiar(p.key, { alergenos: p.alergenos.includes(a.key) ? p.alergenos.filter((x) => x !== a.key) : [...p.alergenos, a.key] })}
                        className="inline-flex min-h-9 items-center gap-1 rounded-full border border-carbon/15 px-2.5 text-xs aria-pressed:border-terracota aria-pressed:bg-terracota aria-pressed:text-crema dark:border-crema/15"
                      >
                        <AllergenIcon alergeno={a.key} className="h-3.5 w-3.5" />
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setPlatos((l) => [...l, nuevo(l[l.length - 1]?.tipo)])} className={botonSecundario}>
          <Icon name="plus" className="h-4 w-4" />
          Añadir plato
        </button>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (p. ej. «De lunes a viernes, mediodía»)" className={input} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} className="h-5 w-5" />
          Mostrar en la web
        </label>
      </fieldset>

      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      <button type="button" onClick={() => void publicar()} disabled={cargando || guardando || !platos.some((p) => p.nombre.trim())} className={`${botonPrimario} sticky bottom-4 min-h-14 text-base shadow-lift`}>
        <Icon name="check" className="h-5 w-5" />
        {guardando ? "Publicando…" : "Publicar menú"}
      </button>
    </div>
  );
}
