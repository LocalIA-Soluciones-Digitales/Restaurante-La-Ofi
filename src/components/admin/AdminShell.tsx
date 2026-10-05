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
    <nav aria-label="Panel" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
      {GRUPOS.map((g) => {
        const items = secciones.filter((s) => s.grupo === g.key);
        if (items.length === 0) return null;
        return (
          <div key={g.key} className="mb-2.5 last:mb-0 alto:mb-5">
            <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-crema/40">{g.label}</p>
            <ul className="mt-1 grid gap-px">
              {items.map((s) => (
                <li key={s.href}>
                  <Link
                    href={s.href}
                    aria-current={activa(s.href) ? "page" : undefined}
                    className="flex min-h-[2.125rem] items-center gap-3 rounded-xl px-3 text-sm font-medium alto:min-h-11 text-crema/75 transition-colors hover:bg-crema/10 hover:text-crema aria-[current=page]:bg-neon aria-[current=page]:text-noche"
                  >
                    <Icon name={s.icon} className="h-[1.125rem] w-[1.125rem] shrink-0" />
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
        className={`fixed inset-y-0 left-0 z-40 flex h-dvh w-60 print:hidden flex-col bg-noche text-crema transition-transform duration-300 ease-drawer lg:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-5 alto:h-16">
          <Link href="/admin" className="font-display text-2xl neon-text">
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

      <div className="flex min-w-0 flex-1 flex-col lg:pl-60 print:pl-0">
        {/* En cocina la pantalla es siempre oscura (KDS): la cabecera la acompaña. */}
        <header
          data-theme={pathname.startsWith("/admin/cocina") ? "dark" : undefined}
          className="sticky top-0 z-20 flex h-16 print:hidden items-center gap-3 border-b border-carbon/10 bg-crema/90 px-4 backdrop-blur dark:border-crema/10 dark:bg-noche/90 dark:text-crema sm:px-6"
        >
          <button type="button" onClick={() => setAbierto(true)} className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 dark:border-crema/15 lg:hidden">
            <Icon name="menu" />
            <span className="sr-only">Abrir menú</span>
          </button>
          <p className="min-w-0 flex-1 truncate font-display text-xl">{pathname.startsWith("/admin/manual") ? "Manual" : (actual?.label ?? "Panel")}</p>
          <span className="hidden font-mono text-sm tabular-nums text-carbon-muted dark:text-crema/60 sm:inline">{hora}</span>
          <Link
            href="/admin/manual"
            title="Manual: cómo funciona un pedido"
            aria-current={pathname.startsWith("/admin/manual") ? "page" : undefined}
            className="grid h-11 w-11 place-items-center rounded-xl border border-carbon/15 aria-[current=page]:bg-neon aria-[current=page]:text-noche dark:border-crema/15"
          >
            <Icon name="info" className="h-5 w-5" />
            <span className="sr-only">Manual</span>
          </Link>
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
