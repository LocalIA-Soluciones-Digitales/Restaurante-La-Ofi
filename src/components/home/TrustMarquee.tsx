import { Marquee } from "@/components/motion/Marquee";
import { Icon } from "@/components/ui/Icon";
import { CONFIANZA } from "@/lib/home-content";

export function TrustMarquee() {
  return (
    <Marquee
      label="La Ofi en datos"
      className="border-y border-crema/10 bg-noche py-5 text-crema"
      items={CONFIANZA.map((c) => (
        <span key={c.texto} className="inline-flex items-center gap-3 whitespace-nowrap font-display text-xl sm:text-2xl">
          <Icon name={c.icon} className="h-5 w-5 text-neon" />
          {c.texto}
        </span>
      ))}
    />
  );
}
