import type { ReactNode } from "react";
import { SectionHeader, type Momento } from "@/components/ui/SectionHeader";

/** Cabecera de páginas interiores (deja hueco a la cabecera fija). */
export function PageHero({
  id,
  title,
  eyebrow,
  lead,
  momento,
  children,
}: {
  id: string;
  title: ReactNode;
  eyebrow?: string;
  lead?: ReactNode;
  momento?: Momento;
  children?: ReactNode;
}) {
  return (
    <div className="hex-pattern border-b border-carbon/10 bg-arena/70 pb-12 pt-32 sm:pb-16 sm:pt-40">
      <div className="container-page">
        <SectionHeader id={id} as="h1" eyebrow={eyebrow} momento={momento} title={title} lead={lead} />
        {children}
      </div>
    </div>
  );
}
