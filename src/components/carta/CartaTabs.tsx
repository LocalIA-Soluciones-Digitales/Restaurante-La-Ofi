import Link from "next/link";
import { href, type Locale } from "@/lib/i18n";

/**
 * Pestañas compartidas por /menu-del-dia y /carta: dos páginas (cada una con su
 * URL para Google y para compartir) que se leen como una sola sección "Carta y menú".
 */
export function CartaTabs({ locale, actual }: { locale: Locale; actual: "menu" | "carta" }) {
  const tabs = [
    { key: "menu", href: href(locale, "/menu-del-dia"), label: "Menú del día", nota: "Lun–Vie" },
    { key: "carta", href: href(locale, "/carta"), label: "Carta", nota: "Todos los días" },
  ] as const;

  return (
    <nav aria-label="Carta y menú" className="inline-flex rounded-full border border-tinta-line bg-crema p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === actual ? "page" : undefined}
          className="flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium text-carbon-muted transition-colors hover:text-carbon aria-[current=page]:bg-carbon aria-[current=page]:text-crema sm:px-5"
        >
          {t.label}
          <span className="hidden text-[0.7rem] font-normal opacity-70 sm:inline">{t.nota}</span>
        </Link>
      ))}
    </nav>
  );
}
