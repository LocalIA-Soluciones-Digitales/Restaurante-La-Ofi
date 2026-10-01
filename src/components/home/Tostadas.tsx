import Image from "next/image";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { IMAGES, type ImageKey } from "@/lib/images";
import { SITE } from "@/lib/site";

const TOSTADAS: { key: ImageKey; nombre: string; detalle: string }[] = [
  { key: "tostadaBurrata", nombre: "Burrata", detalle: "Melocotón a la plancha y jamón ibérico" },
  { key: "tostadaSalmon", nombre: "Salmón", detalle: "Queso crema y sésamo" },
  { key: "tostadaRevuelta", nombre: "Revuelta", detalle: "Huevo revuelto, cottage e ibérico" },
  { key: "tostadaBonita", nombre: "Bonita", detalle: "Tortilla francesa de bonito y aguacate" },
];

export function Tostadas() {
  return (
    <section aria-labelledby="tostadas-title" className="cv-auto overflow-hidden bg-oliva-soft py-20 sm:py-28">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            id="tostadas-title"
            momento="manana"
            eyebrow="Barra"
            title={
              <>
                7 días, <span className="italic text-terracota">8 tostadas</span>
              </>
            }
            lead="Pan de masa madre, buen producto y una tostada nueva cada día en nuestro Instagram. Y en la barra, pintxos y tortilla desde primera hora."
            className="reveal"
          />
          <a href={SITE.instagram.url} target="_blank" rel="noopener noreferrer" className="btn-secondary reveal self-start md:self-auto">
            <Icon name="instagram" className="h-4 w-4" />
            Síguenos en {SITE.instagram.handle}
          </a>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {TOSTADAS.map((t, i) => (
            <li key={t.key} className={`reveal group ${i % 2 === 1 ? "lg:translate-y-10" : ""}`}>
              <figure className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-arena shadow-card">
                <Image
                  src={IMAGES[t.key].src}
                  alt={IMAGES[t.key].alt}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <figcaption className="absolute inset-x-2 bottom-2 rounded-2xl bg-crema px-3 py-2 sm:inset-x-3 sm:bottom-3">
                  <span className="block font-display text-lg leading-tight text-carbon">{t.nombre}</span>
                  <span className="hidden text-xs text-carbon-muted sm:block">{t.detalle}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:mt-24">
          <div className="reveal relative aspect-[16/10] overflow-hidden rounded-[1.75rem] shadow-card">
            <BrandPlaceholder label="Tortilla de La Ofi" icon="egg" />
          </div>
          <div className="reveal relative aspect-[16/10] overflow-hidden rounded-[1.75rem] shadow-card">
            <BrandPlaceholder label="Pintxos de la barra" icon="utensils" />
          </div>
        </div>
      </div>
    </section>
  );
}
