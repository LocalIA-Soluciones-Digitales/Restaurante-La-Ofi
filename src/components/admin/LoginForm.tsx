"use client";

import { useActionState } from "react";
import { entrar } from "@/lib/admin/actions";

export function LoginForm({ next }: { next: string }) {
  const [estado, accion, pendiente] = useActionState(entrar, undefined);
  return (
    <form action={accion} className="mt-10 grid gap-4 rounded-[2rem] border border-crema/10 bg-crema/[0.06] p-6 backdrop-blur">
      <input type="hidden" name="next" value={next} />
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="h-12 rounded-2xl border border-crema/15 bg-noche-2 px-4 text-base text-crema focus:border-neon focus:outline-none"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold">Contraseña</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-12 rounded-2xl border border-crema/15 bg-noche-2 px-4 text-base text-crema focus:border-neon focus:outline-none"
        />
      </label>
      {estado?.error ? (
        <p role="alert" className="text-sm font-semibold text-terracota-soft">
          {estado.error}
        </p>
      ) : null}
      <button type="submit" disabled={pendiente} className="btn-neon mt-2 disabled:opacity-60">
        {pendiente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
