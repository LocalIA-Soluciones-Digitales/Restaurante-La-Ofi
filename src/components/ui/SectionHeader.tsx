import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

export type Momento = "manana" | "mediodia" | "tarde" | "noche";

const MOMENTOS: Record<Momento, { label: string; icon: IconName }> = {
  manana: { label: "Mañana", icon: "sunrise" },
  mediodia: { label: "Mediodía", icon: "sun" },
  tarde: { label: "Tarde", icon: "sunset" },
  noche: { label: "Noche", icon: "moon" },
};

interface Props {
  id: string;
  title: ReactNode;
  eyebrow?: string;
  momento?: Momento;
  lead?: ReactNode;
  dark?: boolean;
  as?: "h1" | "h2";
  className?: string;
}

/** Cabecera de sección. El "momento" del día marca la narrativa mañana → noche. */
export function SectionHeader({ id, title, eyebrow, momento, lead, dark = false, as: Tag = "h2", className = "" }: Props) {
  const m = momento ? MOMENTOS[momento] : null;
  return (
    <header className={`max-w-2xl ${className}`}>
      {(m || eyebrow) && (
        <p className={`eyebrow flex items-center gap-2 ${dark ? "text-neon" : "text-terracota"}`}>
          {m ? <Icon name={m.icon} className="h-4 w-4" /> : null}
          {[m?.label, eyebrow].filter(Boolean).join(" · ")}
        </p>
      )}
      <Tag id={id} className={`mt-3 text-4xl leading-[1.05] sm:text-5xl ${dark ? "text-crema" : "text-carbon"}`}>
        {title}
      </Tag>
      {lead ? (
        <p className={`mt-4 text-lg leading-relaxed ${dark ? "text-crema/80" : "text-carbon-muted"}`}>{lead}</p>
      ) : null}
    </header>
  );
}
