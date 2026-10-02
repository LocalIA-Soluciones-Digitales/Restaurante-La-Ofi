import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { inicioDe } from "@/lib/admin/roles";
import { obtenerSesionAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sesion = await obtenerSesionAdmin();
  if (sesion) redirect(inicioDe(sesion.rol));
  const { next } = await searchParams;
  return (
    <main className="grain relative grid min-h-screen place-items-center overflow-hidden bg-noche px-4 text-crema">
      <div aria-hidden="true" className="hex-pattern-night absolute inset-0" />
      <div className="relative w-full max-w-sm">
        <p className="text-center font-display text-5xl neon-text">la ofi</p>
        <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-crema/60">Gestión</p>
        <LoginForm next={next ?? ""} />
      </div>
    </main>
  );
}
