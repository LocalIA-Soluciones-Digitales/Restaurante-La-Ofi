"use client";

import { useState } from "react";
import { Aviso, botonPrimario, card, input } from "@/components/admin/ui";
import { guardar } from "@/lib/admin/actions";
import { ROLES, type Rol } from "@/lib/admin/roles";
import { crearEmpleado } from "@/lib/admin/staff-actions";

export interface Empleado {
  user_id: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
}

const QUE_VE: Record<Rol, string> = {
  admin: "Todo, incluida configuración y equipo",
  encargado: "Servicio + carta, menú, eventos, ventas y caja",
  camarero: "Salón, TPV, cocina y reservas",
  cocina: "Solo la pantalla de cocina y barra",
};

/** Equipo (portado de CamarerosGestion de Palomita): cuentas con rol y alta/baja sin borrar historial. */
export function StaffPanel({ inicial }: { inicial: Empleado[] }) {
  const [equipo, setEquipo] = useState(inicial);
  const [f, setF] = useState({ email: "", nombre: "", rol: "camarero" as Rol, password: "" });
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
      <section className={`${card} p-5`}>
        <h2 className="font-display text-2xl">Equipo</h2>
        <ul className="mt-3 divide-y divide-carbon/10 dark:divide-crema/10">
          {equipo.length === 0 ? <li className="py-4 text-sm opacity-60">Solo la cuenta del propietario (rol admin).</li> : null}
          {equipo.map((e) => (
            <li key={e.user_id} className={`flex flex-wrap items-center gap-3 py-3 ${e.activo ? "" : "opacity-50"}`}>
              <span className="min-w-0 flex-1">
                <b>{e.nombre}</b>
                <span className="block text-xs opacity-70">{QUE_VE[e.rol]}</span>
              </span>
              <select
                value={e.rol}
                onChange={async (x) => {
                  const r = await guardar<Empleado>("staff", { user_id: e.user_id, rol: x.target.value });
                  if (r.ok) setEquipo((l) => l.map((y) => (y.user_id === e.user_id ? r.data : y)));
                  else setAviso({ tono: "error", texto: r.error });
                }}
                className={`${input} w-40`}
                aria-label={`Rol de ${e.nombre}`}
              >
                {(Object.keys(ROLES) as Rol[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLES[r]}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={e.activo}
                  onChange={async (x) => {
                    const r = await guardar<Empleado>("staff", { user_id: e.user_id, activo: x.target.checked });
                    if (r.ok) setEquipo((l) => l.map((y) => (y.user_id === e.user_id ? r.data : y)));
                  }}
                  className="h-5 w-5"
                />
                Activo
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs opacity-70">Desactivar una cuenta le quita el acceso al momento sin borrar su historial de ventas.</p>
      </section>

      <form
        className={`${card} grid h-fit gap-3 p-5`}
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await crearEmpleado(f);
          if (!r.ok) return setAviso({ tono: "error", texto: r.error });
          setEquipo((l) => [...l, { user_id: r.data.user_id, nombre: f.nombre, rol: f.rol, activo: true }]);
          setAviso({ tono: "ok", texto: `Cuenta de ${f.nombre} creada. Pásale su email y contraseña en persona.` });
          setF({ email: "", nombre: "", rol: "camarero", password: "" });
        }}
      >
        <h2 className="font-display text-2xl">Nueva cuenta</h2>
        <input required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Nombre" className={input} />
        <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Email" autoComplete="off" className={input} />
        <select value={f.rol} onChange={(e) => setF({ ...f, rol: e.target.value as Rol })} className={input} aria-label="Rol">
          {(Object.keys(ROLES) as Rol[]).map((r) => (
            <option key={r} value={r}>
              {ROLES[r]} — {QUE_VE[r]}
            </option>
          ))}
        </select>
        <input required minLength={10} type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="Contraseña (mín. 10)" autoComplete="new-password" className={input} />
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
        <button type="submit" className={botonPrimario}>
          Crear cuenta
        </button>
        <p className="text-xs opacity-70">Para la impresora automática, crea una cuenta con rol «Cocina» solo para el print-bridge.</p>
      </form>
    </div>
  );
}
