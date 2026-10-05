import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { Icon } from "@/components/ui/Icon";
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
      {/* Salida a la web pública: sin esto, quien llega aquí por error no tiene por dónde volver. */}
      <Link
        href="/es"
        className="absolute left-4 top-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-crema/15 bg-crema/[0.06] px-4 text-sm font-semibold text-crema/85 backdrop-blur transition-colors hover:bg-crema/15 hover:text-crema sm:left-6 sm:top-6"
      >
        <Icon name="chevronLeft" className="h-4 w-4" />
        Volver a la web
      </Link>
      <div className="relative w-full max-w-sm">
        <p className="text-center font-display text-5xl neon-text">la ofi</p>
        <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-crema/60">Gestión</p>
        <LoginForm next={next ?? ""} />
        <p className="mt-6 text-center text-xs text-crema/55">
          Acceso solo para el equipo de La Ofi. ¿Vienes a comer?{" "}
          <Link href="/es/carta" className="font-semibold text-neon underline-offset-4 hover:underline">
            Ver la carta
          </Link>{" "}
          ·{" "}
          <Link href="/es/reservar" className="font-semibold text-neon underline-offset-4 hover:underline">
            Reservar
          </Link>
        </p>
      </div>
    </main>
  );
}
