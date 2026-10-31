"use client";

import { useEffect, useState } from "react";
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

/**
 * «Plato único»: un plato a elegir entre varias opciones (lo habitual en La Ofi;
 * la web lo muestra como «Plato del día · A elegir»). «Primero y segundo»: menú
 * clásico, con los platos agrupados por tipo.
 */
type Modo = "unico" | "completo";

const GRUPOS: Record<Modo, { tipo: TipoPlato; label: string; ejemplo: string; anadir?: string }[]> = {
  unico: [{ tipo: "plato", label: "Opciones a elegir", ejemplo: "Secreto con patatas…", anadir: "Añadir otra opción" }],
  completo: [
    { tipo: "primero", label: "Primeros", ejemplo: "Lentejas estofadas…", anadir: "Añadir primero" },
    { tipo: "segundo", label: "Segundos", ejemplo: "Merluza a la plancha…", anadir: "Añadir segundo" },
    { tipo: "postre", label: "Postres", ejemplo: "Arroz con leche…", anadir: "Añadir postre" },
  ],
};

const modoDe = (platos: { tipo: TipoPlato }[]): Modo => (platos.some((p) => p.tipo !== "plato") ? "completo" : "unico");

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
  const [modo, setModo] = useState<Modo>("unico");
  const [platos, setPlatos] = useState<PlatoForm[]>([nuevo()]);
  const [existe, setExiste] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error" | "info"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Mientras se carga el menú del día elegido, el formulario está bloqueado: si
  // no, la carga podría pisar lo que ya se ha escrito.
  const [cargando, setCargando] = useState(true);
  // Plato recién añadido con Intro o «Añadir»: recibe el foco al pintarse.
  const [enfocar, setEnfocar] = useState<string | null>(null);

  const aplicar = (m: MenuBd | null, copia = false) => {
    if (!m) return false;
    setPrecio(aEuros(m.precio_centimos));
    setIncluye({ pan: m.pan_incluido, bebida: m.bebida_incluida, postre: m.postre_o_cafe });
    setNotas(m.notas ?? "");
    setDisponible(copia ? true : m.disponible);
    setPlatos(m.platos.length ? m.platos.map((p) => ({ key: crypto.randomUUID(), tipo: p.tipo, nombre: p.nombre, descripcion: p.descripcion ?? "", alergenos: p.alergenos })) : [nuevo()]);
    setModo(modoDe(m.platos));
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
        setModo("unico");
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

  const anadir = (tipo: TipoPlato) => {
    const p = nuevo(tipo);
    setPlatos((l) => [...l, p]);
    setEnfocar(p.key);
  };

  const quitar = (key: string) =>
    setPlatos((l) => {
      const resto = l.filter((x) => x.key !== key);
      return resto.length ? resto : [nuevo(modo === "unico" ? "plato" : "primero")];
    });

  // Al cambiar de tipo de menú se conservan los platos escritos: los «a elegir»
  // pasan a primeros y, al volver, todo pasa a ser una opción más.
  const cambiarModo = (m: Modo) => {
    if (m === modo) return;
    setModo(m);
    setPlatos((l) => l.map((p) => ({ ...p, tipo: m === "unico" ? "plato" : p.tipo === "plato" ? "primero" : p.tipo })));
  };

  // Menús antiguos con «a elegir» mezclado con primeros y segundos: se muestran aparte para no perderlos.
  const grupos =
    modo === "completo" && platos.some((p) => p.tipo === "plato")
      ? [{ tipo: "plato" as TipoPlato, label: "A elegir", ejemplo: "" }, ...GRUPOS.completo]
      : GRUPOS[modo];

  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div className={`${card} grid gap-4 p-5`}>
        {/* Día y precio en la misma fila, a la misma altura; la ayuda debajo, a todo el ancho. */}
        <div className="grid grid-cols-[minmax(0,1fr)_8rem] items-end gap-x-3 gap-y-1 text-sm">
          <label htmlFor="menu-fecha" className="font-semibold">
            Día
          </label>
          <label htmlFor="menu-precio" className="font-semibold">
            Precio €
          </label>
          <input id="menu-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={input} />
          <input
            id="menu-precio"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={`${input} text-right font-semibold tabular-nums`}
          />
          <p className="col-span-2 mt-1 text-xs opacity-70">
            Puedes dejarlo listo la víspera: en la web sale ese día de 8:00 a 16:00, y solo entonces se puede reservar con menú o pedirlo para recoger.
          </p>
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
        <div role="radiogroup" aria-label="Tipo de menú" className="grid grid-cols-2 gap-2">
          {(
            [
              ["unico", "Plato único", "Un plato a elegir entre varias opciones"],
              ["completo", "Primero y segundo", "Menú con primeros, segundos y postre"],
            ] as const
          ).map(([k, titulo, texto]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={modo === k}
              onClick={() => cambiarModo(k)}
              className="grid min-h-11 gap-0.5 rounded-xl border border-carbon/15 px-3 py-2 text-left aria-checked:border-oliva aria-checked:bg-oliva aria-checked:text-crema dark:border-crema/15"
            >
              <span className="font-semibold">{titulo}</span>
              <span className="text-xs opacity-80">{texto}</span>
            </button>
          ))}
        </div>
        {grupos.map((g) => {
          const lista = platos.filter((p) => p.tipo === g.tipo);
          return (
            <section key={g.tipo} aria-label={g.label} className="grid gap-2">
              <h3 className="text-sm font-semibold">{g.label}</h3>
              {lista.length ? (
                <ul className="grid gap-3">
                  {lista.map((p, i) => (
                    <li key={p.key} className="rounded-2xl bg-arena p-3 dark:bg-noche-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <input
                          ref={
                            p.key === enfocar
                              ? (el) => {
                                  if (el) {
                                    el.focus();
                                    setEnfocar(null);
                                  }
                                }
                              : undefined
                          }
                          value={p.nombre}
                          onChange={(e) => cambiar(p.key, { nombre: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              anadir(p.tipo);
                            }
                          }}
                          placeholder={i === 0 ? g.ejemplo : "Otra opción…"}
                          aria-label={`${g.label}: plato ${i + 1}`}
                          className={input}
                        />
                        <button type="button" onClick={() => quitar(p.key)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15">
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
              ) : null}
              {g.anadir ? (
                <button type="button" onClick={() => anadir(g.tipo)} className={botonSecundario}>
                  <Icon name="plus" className="h-4 w-4" />
                  {g.anadir}
                </button>
              ) : null}
            </section>
          );
        })}
        {modo === "unico" ? <p className="text-xs opacity-70">En la web sale como «Plato del día · A elegir». Pulsa Intro para añadir otra opción.</p> : null}
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas (p. ej. «De lunes a viernes, mediodía»)" className={input} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={disponible} onChange={(e) => setDisponible(e.target.checked)} className="h-5 w-5" />
          Mostrar en la web
        </label>
      </fieldset>

      {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
      {/* Fondo opaco bajo el botón fijo: desactivado (semitransparente) dejaba ver los campos de debajo. */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-crema from-60% to-transparent px-4 pb-4 pt-6 dark:from-noche sm:mx-0 sm:px-0">
        <button type="button" onClick={() => void publicar()} disabled={cargando || guardando || !platos.some((p) => p.nombre.trim())} className={`${botonPrimario} min-h-14 w-full text-base shadow-lift`}>
          <Icon name="check" className="h-5 w-5" />
          {guardando ? "Publicando…" : "Publicar menú"}
        </button>
      </div>
    </div>
  );
}
