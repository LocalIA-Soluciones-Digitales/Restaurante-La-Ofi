import { Wordmark } from "@/components/ui/Wordmark";

/**
 * Pantalla de entrada (como Restaurant GEM): el rótulo "la ofi" se enciende trazo
 * a trazo sobre fondo noche y la cortina sube destapando el hero. Solo CSS (no
 * espera a JavaScript) y sin capturar clics. Una vez por sesión: el script en
 * línea la quita antes de pintar si ya se vio. Con "reducir movimiento", no sale.
 */
export function IntroOfi() {
  return (
    <>
      <div id="intro-ofi" aria-hidden="true" className="intro-ofi pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-noche">
        <div className="flex flex-col items-center">
          <Wordmark draw strokeWidth={3.6} className="w-[min(46vw,15rem)] text-[#f4f0ff] [filter:drop-shadow(0_0_6px_rgb(201_187_255/0.7))_drop-shadow(0_0_24px_rgb(142_124_240/0.45))]" />
          <span className="intro-ofi-sub kicker mt-6 text-crema/60">Restaurante · Derio</span>
        </div>
        {/* Designer credit, abajo y con el mismo fundido que el subtítulo. */}
        <div className="intro-ofi-sub absolute inset-x-0 bottom-8 text-center">
          <span className="block text-[10px] font-light tracking-wide text-white">Designed &amp; Developed by</span>
          <span className="mt-1 block text-[11px] font-medium tracking-wide text-white">
            Local<span className="font-bold text-ratan">IA</span>.
          </span>
        </div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html:
            "try{var e=document.getElementById('intro-ofi');if(sessionStorage.getItem('ofi-intro')){e&&e.remove()}else{sessionStorage.setItem('ofi-intro','1')}}catch(_){}",
        }}
      />
    </>
  );
}
