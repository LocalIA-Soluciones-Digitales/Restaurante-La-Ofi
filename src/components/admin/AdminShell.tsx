"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { salir } from "@/lib/admin/actions";
import { ROLES, SECCIONES, type Rol } from "@/lib/admin/roles";

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

  const nav = (
    <nav aria-label="Panel" className="flex-1 overflow-y-auto px-3 py-4">
      {GRUPOS.map((g) => {
        const items = secciones.filter((s) => s.grupo === g.key);
        if (items.length === 0) return null;
        return (
          <div key={g.key} className="mb-5">
            <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-crema/40">{g.label}</p>
            <ul className="mt-1.5 grid gap-0.5">
              {items.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={activa(s.href) ? "page" : undefined}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-crema/75 transition-colors hover:bg-crema/10 hover:text-crema aria-[current=page]:bg-neon aria-[current=page]:text-noche"
                  >
                    <Icon name={s.icon} className="h-5 w-5" />
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 print:hidden flex-col bg-noche text-crema transition-transform duration-300 ease-drawer lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/admin" className="font-display text-2xl neon-text">
            la ofi
          </Link>
          <button type="button" onClick={() => setAbierto(false)} className="grid h-10 w-10 place-items-center rounded-full lg:hidden">
            <Icon name="close" />
            <span className="sr-only">Cerrar menú</span>
          </button>
        </div>
        {nav}
        <div className="border-t border-crema/10 p-4">
          <p className="truncate text-sm font-semibold">{nombre}</p>
          <p className="text-xs text-crema/60">{ROLES[rol]}</p>
          {local ? <p className="mt-2 rounded-lg bg-terracota px-2 py-1 text-[0.7rem] font-semibold">Backend LOCAL de pruebas</p> : null}
          <form action={salir} className="mt-3">
            <button type="submit" className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm text-crema/75 hover:bg-crema/10 hover:text-crema">
              <Icon name="logout" className="h-4 w-4" />
              Salir
            </button>
          </form>
        </div>
      </aside>
      {abierto ? <div className="fixed inset-0 z-30 bg-carbon/50 lg:hidden" onClick={() => setAbierto(false)} aria-hidden="true" /> : null}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64 print:pl-0">
        <header className="sticky top-0 z-20 flex h-16 print:hidden items-center gap-3 border-b border-carbon/10 bg-crema/90 px-4 backdrop-blur dark:border-crema/10 dark:bg-noche/90 sm:px-6">
          <button type="button" onClick={() => setAbierto(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15 lg:hidden">
            <Icon name="menu" />
            <span className="sr-only">Abrir menú</span>
          </button>
          <p className="min-w-0 flex-1 truncate font-display text-xl">{actual?.label ?? "Panel"}</p>
          <span className="hidden font-mono text-sm tabular-nums text-carbon-muted dark:text-crema/60 sm:inline">{hora}</span>
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
          {children}
        </main>
      </div>
    </div>
  );
}
