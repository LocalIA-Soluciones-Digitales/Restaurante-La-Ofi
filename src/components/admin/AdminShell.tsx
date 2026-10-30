"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AyudaSeccion } from "@/components/admin/AyudaSeccion";
import { Icon } from "@/components/ui/Icon";
import { salir } from "@/lib/admin/actions";
import { ROLES, SECCIONES, inicioDe, puedeVer, type Rol } from "@/lib/admin/roles";

const GRUPOS = [
  { key: "servicio", label: "Servicio" },
  { key: "gestion", label: "Gestión" },
  { key: "ajustes", label: "Ajustes" },
] as const;

/**
 * Armazón del panel (portado de AdminNav de Palomita): navegación según el rol,
 * pensada para tablet/TPV (botones grandes, barra lateral compacta), reloj,
 * tema oscuro y pantalla completa.
 */
export function AdminShell({ nombre, rol, local, children }: { nombre: string; rol: Rol; local: boolean; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Una sección que no es de su rol (escrita a mano o desde un enlace) lleva a su inicio.
  const permitida = puedeVer(rol, pathname);
  useEffect(() => {
    if (!permitida) router.replace(inicioDe(rol));
  }, [permitida, rol, router]);
  const [abierto, setAbierto] = useState(false);
  const [oscuro, setOscuro] = useState(false);
  const [hora, setHora] = useState("");

  useEffect(() => {
    setOscuro(document.documentElement.dataset.theme === "dark");
    const tick = () => setHora(new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }));
    tick();
    const t = window.setInterval(tick, 15_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => setAbierto(false), [pathname]);

  const cambiarTema = () => {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    if (nuevo) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      window.localStorage.setItem("laofi:admin:tema", nuevo ? "dark" : "light");
    } catch {
      /* sin almacenamiento */
    }
  };

  const pantallaCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const secciones = SECCIONES.filter((s) => s.roles.includes(rol));
  const activa = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const actual = [...secciones].reverse().find((s) => activa(s.href));
  // "Mi cuenta" no está en el menú (se entra desde el pie, junto a Salir).
  const titulo = actual?.label ?? (pathname.startsWith("/admin/cuenta") ? "Mi cuenta" : "Panel");

  const nav = (
    <nav aria-label="Panel" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
      {GRUPOS.map((g) => {
        const items = secciones.filter((s) => s.grupo === g.key);
        if (items.length === 0) return null;
        return (
          <div key={g.key} className="mb-2.5 last:mb-0 alto:mb-5">
            <p className="px-3 text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-crema/35">{g.label}</p>
            <ul className="mt-1 grid gap-px">
              {items.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={activa(s.href) ? "page" : undefined}
                    className="group relative flex min-h-[2.125rem] items-center gap-3 rounded-xl px-3 text-sm font-medium text-crema/65 transition-colors duration-150 hover:bg-crema/[0.06] hover:text-crema alto:min-h-11 aria-[current=page]:bg-crema/[0.09] aria-[current=page]:text-crema"
                  >
                    {/* Indicador de sección activa: barra de neón a la izquierda. */}
                    <span aria-hidden="true" className="absolute inset-y-2 left-0 w-[3px] scale-y-0 rounded-full bg-neon transition-transform duration-200 ease-out-expo group-aria-[current=page]:scale-y-100" />
                    <Icon name={s.icon} className="h-[1.125rem] w-[1.125rem] shrink-0 opacity-80 group-aria-[current=page]:text-neon group-aria-[current=page]:opacity-100" />
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* Barra lateral (fija en escritorio/tablet horizontal, cajón en móvil) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-60 print:hidden flex-col border-r border-crema/[0.06] bg-[#0a1220] text-crema [&_:focus-visible]:outline-neon transition-transform duration-300 ease-drawer lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-5 alto:h-16">
          <Link href={inicioDe(rol)} className="font-display text-2xl neon-text">
            la ofi
          </Link>
          {local ? (
            <span title="Backend LOCAL de pruebas: los datos se pierden al reiniciar" className="mr-auto rounded-md bg-terracota px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider">
              Local
            </span>
          ) : null}
          <button type="button" onClick={() => setAbierto(false)} className="grid h-10 w-10 place-items-center rounded-full lg:hidden">
            <Icon name="close" />
            <span className="sr-only">Cerrar menú</span>
          </button>
        </div>
        {nav}
        {/* Pie compacto: quién está dentro y salir, siempre visible sin scroll. */}
        <div className="shrink-0 border-t border-crema/10 px-3 py-2">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-crema/10 text-sm font-semibold uppercase">
              {nombre.trim().charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{nombre}</p>
              <p className="truncate text-xs text-crema/60">{ROLES[rol]}</p>
            </div>
            {rol === "admin" || rol === "encargado" ? (
              <Link
                href="/admin/cuenta"
                onClick={() => setAbierto(false)}
                title="Mi cuenta (cambiar contraseña)"
                className="grid h-10 w-10 place-items-center rounded-xl text-crema/75 hover:bg-crema/10 hover:text-crema"
              >
                <Icon name="lock" className="h-5 w-5" />
                <span className="sr-only">Mi cuenta</span>
              </Link>
            ) : null}
            <form action={salir}>
              <button type="submit" title="Salir" className="grid h-10 w-10 place-items-center rounded-xl text-crema/75 hover:bg-crema/10 hover:text-crema">
                <Icon name="logout" className="h-5 w-5" />
                <span className="sr-only">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </aside>
      {abierto ? <div className="fixed inset-0 z-30 bg-carbon/50 lg:hidden" onClick={() => setAbierto(false)} aria-hidden="true" /> : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-x-clip lg:pl-60 print:pl-0">
        {/* En cocina la pantalla es siempre oscura (KDS): la cabecera la acompaña. */}
        <header
          data-theme={pathname.startsWith("/admin/cocina") ? "dark" : undefined}
          className="sticky top-0 z-20 flex h-16 print:hidden items-center gap-3 border-b border-carbon/[0.08] bg-crema/80 px-4 backdrop-blur-md dark:border-crema/10 dark:bg-noche/85 dark:text-crema sm:px-6"
        >
          <button type="button" onClick={() => setAbierto(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15 lg:hidden">
            <Icon name="menu" />
            <span className="sr-only">Abrir menú</span>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {actual ? <Icon name={actual.icon} className="hidden h-5 w-5 shrink-0 text-carbon-muted dark:text-crema/50 sm:block" /> : null}
            <p className="truncate font-display text-xl">{titulo}</p>
          </div>
          {/* En directo: los datos de servicio se actualizan solos (Realtime + sondeo). */}
          <span className="hidden items-center gap-2 rounded-full border border-carbon/10 px-3 py-1.5 font-mono text-sm tabular-nums text-carbon-muted dark:border-crema/10 dark:text-crema/60 sm:inline-flex">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#1F9D74] opacity-60 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#1F9D74]" />
            </span>
            {hora}
          </span>
          <AyudaSeccion pathname={pathname} titulo={titulo} />
          <button type="button" onClick={cambiarTema} className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15" aria-pressed={oscuro}>
            <Icon name={oscuro ? "sun" : "moon"} className="h-5 w-5" />
            <span className="sr-only">Modo oscuro</span>
          </button>
          <button type="button" onClick={pantallaCompleta} className="hidden h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15 sm:grid">
            <Icon name="fullscreen" className="h-5 w-5" />
            <span className="sr-only">Pantalla completa</span>
          </button>
        </header>
        <main id="contenido" className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">
          {permitida ? children : null}
        </main>
      </div>
    </div>
  );
}
