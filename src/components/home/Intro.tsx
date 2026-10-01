import Image from "next/image";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IMAGES } from "@/lib/images";

// Solo datos verificados por ≥2 fuentes (RESEARCH.md §5). Los aforos exactos
// (comedor, terraza, parking) están pendientes de confirmar con el propietario.
const ESPACIOS: { icon: IconName; title: string; text: string }[] = [
  { icon: "coffee", title: "La barra", text: "Café, tostadas y pintxos desde el desayuno." },
  { icon: "utensils", title: "El comedor", text: "Plato del día y carta con producto de temporada." },
  { icon: "flame", title: "La brasa", text: "Pescado según mercado, carnes, pulpo, puerros y verduras a la parrilla." },
  { icon: "sunset", title: "La terraza cubierta", text: "Para el tardeo, el after-work y las celebraciones." },
];

export function Intro() {
  return (
    <section id="la-ofi" aria-labelledby="la-ofi-title" className="cv-auto bg-crema py-20 sm:py-28">
      <div className="container-page grid items-center gap-14 lg:grid-cols-2">
        <div className="reveal">
          <SectionHeader
            id="la-ofi-title"
            eyebrow="La Ofi"
            title={
              <>
                Tu otra oficina, <span className="italic text-terracota">pero con brasa</span>
              </>
            }
            lead="En pleno Parque Tecnológico, La Ofi es el sitio al que se baja a desayunar, se vuelve a comer y se queda uno a tomar algo. Cocina tradicional, producto de temporada de los caseríos de alrededor y ambiente informal."
          />
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {ESPACIOS.map((e) => (
              <li key={e.title} className="flex gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-arena text-marino">
                  <Icon name={e.icon} />
                </span>
                <div>
                  <h3 className="font-sans text-base font-semibold text-carbon">{e.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-carbon-muted">{e.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-oliva-soft px-4 py-2 text-sm font-medium text-oliva">
            <Icon name="check" className="h-4 w-4" />
            Aparcamiento y local accesible
          </p>
        </div>

        <div className="relative grid grid-cols-5 gap-4">
          <div className="reveal relative col-span-3 aspect-[4/5] overflow-hidden rounded-[2rem] shadow-card">
            <Image src={IMAGES.barra.src} alt={IMAGES.barra.alt} fill sizes="(min-width: 1024px) 30vw, 60vw" className="parallax-soft object-cover" />
          </div>
          <div className="col-span-2 flex flex-col gap-4 pt-12">
            <div className="reveal relative aspect-[3/4] overflow-hidden rounded-[1.5rem] shadow-card">
              <Image src={IMAGES.pulpoBrasa.src} alt={IMAGES.pulpoBrasa.alt} fill sizes="(min-width: 1024px) 20vw, 40vw" className="object-cover" />
            </div>
            <div className="reveal relative aspect-square overflow-hidden rounded-[1.5rem] shadow-card">
              <Image src={IMAGES.terrazaNoche.src} alt={IMAGES.terrazaNoche.alt} fill sizes="(min-width: 1024px) 20vw, 40vw" className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
