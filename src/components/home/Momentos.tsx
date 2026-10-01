import Image from "next/image";
import Link from "next/link";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES, type ImageKey } from "@/lib/images";

interface Momento {
  title: string;
  text: string;
  path: string;
  image: ImageKey | null;
  momento: string;
}

const MOMENTOS: Momento[] = [
  { title: "Desayunar", text: "Café y tostadas de pan de masa madre.", path: "/carta#desayunos", image: "tostadaRevuelta", momento: "Mañana" },
  { title: "Pintxos", text: "La barra llena desde primera hora.", path: "/carta", image: "barra", momento: "Mañana" },
  { title: "Tortillas", text: "El pintxo que nunca falla.", path: "/carta", image: null, momento: "Mañana" },
  { title: "Menú del día", text: "El menú de hoy, actualizado cada día.", path: "/menu-del-dia", image: "comedorRatan", momento: "Mediodía" },
  { title: "Comer", text: "Carta, brasa y producto de temporada.", path: "/carta", image: "pulpoBrasa", momento: "Mediodía" },
  { title: "Tomar algo", text: "Terraza cubierta para alargar la tarde.", path: "/#ubicacion", image: "terrazaNoche", momento: "Tarde" },
  { title: "Eventos", text: "Tardeos, partidos y celebraciones.", path: "/eventos", image: "salonNoche", momento: "Noche" },
];

export function Momentos({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="momentos-title" className="cv-auto bg-arena py-20 sm:py-28">
      <div className="container-page">
        <SectionHeader
          id="momentos-title"
          eyebrow="Para cada momento"
          title="Del primer café a la última ronda"
          lead="Hay días de café rápido, de menú con los compañeros y de quedarse en la terraza. En La Ofi caben todos."
          className="reveal"
        />
      </div>

      <ul className="container-page mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin] lg:grid lg:grid-cols-4 lg:overflow-visible">
        {MOMENTOS.map((m, i) => (
          <li key={m.title} className={`reveal w-[72%] shrink-0 snap-start sm:w-[42%] lg:w-auto ${i === 0 ? "lg:col-span-2" : ""}`}>
            <Link
              href={href(locale, m.path.startsWith("/#") ? m.path.slice(1) : m.path)}
              className="group relative flex h-full min-h-[22rem] flex-col justify-end overflow-hidden rounded-[1.75rem] bg-carbon text-crema shadow-card"
            >
              <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
                {m.image ? (
                  <Image
                    src={IMAGES[m.image].src}
                    alt=""
                    fill
                    sizes={i === 0 ? "(min-width: 1024px) 50vw, 72vw" : "(min-width: 1024px) 25vw, 72vw"}
                    className="object-cover"
                  />
                ) : (
                  <BrandPlaceholder label={m.title} icon="egg" iconOnly className="pb-24" />
                )}
              </div>
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-carbon/85 via-carbon/25 to-transparent" />
              <div className="relative p-6">
                <p className="eyebrow text-ratan">{m.momento}</p>
                <h3 className="mt-2 text-3xl text-crema">{m.title}</h3>
                <p className="mt-1 text-sm text-crema/85">{m.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-crema">
                  Ver más
                  <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
