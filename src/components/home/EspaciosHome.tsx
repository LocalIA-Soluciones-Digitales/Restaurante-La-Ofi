import Link from "next/link";
import { SceneMedia } from "@/components/media/SceneMedia";
import { Icon } from "@/components/ui/Icon";
import { href, type Locale } from "@/lib/i18n";
import { creditoFoto, IMAGES, type ImageKey } from "@/lib/images";
import { creditoVideo, VIDEOS, type VideoAsset } from "@/lib/media";

function Pie({ img, video, children }: { img: ImageKey; video?: VideoAsset | null; children: React.ReactNode }) {
  const credito = (video ? creditoVideo(video) : null) ?? creditoFoto(IMAGES[img]);
  return (
    <figcaption className="mt-3">
      {children}
      {credito ? <span className="mt-1 block text-[0.68rem] text-carbon-muted">{credito}</span> : null}
    </figcaption>
  );
}

/** El local, en fotos: comedor, barra y terraza. Que se vea dónde te vas a sentar. */
export function EspaciosHome({ locale }: { locale: Locale }) {
  return (
    <section aria-labelledby="espacios-title" className="cv-auto section bg-crema">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="kicker text-brasa">El local</p>
            <h2 id="espacios-title" className="t-h2 mt-3 max-w-[20ch] text-carbon">
              Ratán, madera y luz natural
            </h2>
          </div>
          <Link href={href(locale, "/espacios")} className="link-arrow">
            Ver los espacios
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-x-6 gap-y-10 lg:grid-cols-12">
          <figure className="lg:col-span-8">
            <div className="reveal-photo photo-hover relative aspect-[4/5] overflow-hidden bg-papel-3 sm:aspect-[16/10]">
              <SceneMedia img="comedorRatan" video={VIDEOS.comedor} sizes="(min-width: 1024px) 64vw, 100vw" />
            </div>
            <Pie img="comedorRatan" video={VIDEOS.comedor}>
              <span className="font-display text-xl text-carbon">El comedor</span>
              <span className="block text-sm text-carbon-muted">Lámparas de ratán, baldosa hexagonal y ventanales. Unos 70 comensales.</span>
            </Pie>
          </figure>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            <figure>
              <div className="reveal-photo photo-hover relative aspect-[4/3] overflow-hidden bg-papel-3">
                <SceneMedia img="barra" video={VIDEOS.barra} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" mobileBelow={0} />
              </div>
              <Pie img="barra" video={VIDEOS.barra}>
                <span className="font-display text-xl text-carbon">La barra</span>
                <span className="block text-sm text-carbon-muted">Café, tostadas y pintxos desde primera hora.</span>
              </Pie>
            </figure>
            <figure>
              <div className="reveal-photo photo-hover relative aspect-[4/3] overflow-hidden bg-papel-3">
                <SceneMedia img="terrazaNoche" video={VIDEOS.terraza} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" mobileBelow={0} />
              </div>
              <Pie img="terrazaNoche" video={VIDEOS.terraza}>
                <span className="font-display text-xl text-carbon">La terraza</span>
                <span className="block text-sm text-carbon-muted">Cubierta, con césped y sofás. Hasta 220 personas sentadas.</span>
              </Pie>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
