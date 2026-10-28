"use client";

import { useActionState } from "react";
import { Aviso, Campo, botonPrimario, card, input } from "@/components/admin/ui";
import { cambiarContrasena } from "@/lib/admin/actions";

export function CambiarContrasenaForm({ email }: { email: string }) {
  const [estado, accion, pendiente] = useActionState(cambiarContrasena, undefined);
  return (
    // key: tras un cambio correcto el formulario se vacía.
    <form key={estado?.ok ? "hecho" : "form"} action={accion} className={`${card} grid max-w-md gap-4 p-6`}>
      {/* Para que el gestor de contraseñas del navegador asocie la nueva a esta cuenta. */}
      <input type="hidden" name="email" autoComplete="username" value={email} readOnly />
      <Campo label="Contraseña actual">
        <input name="actual" type="password" autoComplete="current-password" required className={input} />
      </Campo>
      <Campo label="Nueva contraseña" ayuda="Mínimo 8 caracteres.">
        <input name="nueva" type="password" autoComplete="new-password" minLength={8} required className={input} />
      </Campo>
      <Campo label="Repite la nueva contraseña">
        <input name="repetida" type="password" autoComplete="new-password" minLength={8} required className={input} />
      </Campo>
      {estado ? <Aviso tono={estado.ok ? "ok" : "error"}>{estado.mensaje}</Aviso> : null}
      <button type="submit" disabled={pendiente} className={`${botonPrimario} justify-self-start`}>
        {pendiente ? "Cambiando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
