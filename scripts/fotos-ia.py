"""Fotos de La Ofi mejoradas con Gemini a partir de las fotos reales del local.

Entrada: carpeta con las imágenes que devuelve Gemini. Salida en public/images/ia/:
  <clave>.webp     máx. 2400 px de lado, WebP q84
  <clave>-m.webp   recorte vertical 4:5 para móvil (las horizontales)

Son las mismas escenas y platos de las fotos reales (ver IMAGES_SOURCES.md), con
más resolución, mejor luz y encuadre más abierto.
Uso: python scripts/fotos-ia.py <carpeta>   (requiere Pillow)
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageOps

OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "ia"

# clave -> (archivo de Gemini, foto real de partida, centro del recorte 4:5 o None si ya es vertical)
FOTOS: dict[str, tuple[str, str, tuple[float, float] | None]] = {
    "tostada-burrata": ("Gemini_Generated_Image_33oyey33oyey33oy.jfif", "01_tostada-burrata", None),
    "tostada-bonita": ("Gemini_Generated_Image_cl3nw7cl3nw7cl3n.jfif", "02_tostada-bonita", None),
    "pulpo": ("Gemini_Generated_Image_ca4cooca4cooca4c.jfif", "08_pulpo-brasa", None),
    "barra-neon": ("Gemini_Generated_Image_d76hdud76hdud76h.jfif", "11_rotulo-neon-cafeteras", (0.32, 0.5)),
    "terraza-noche": ("Gemini_Generated_Image_j9hlx7j9hlx7j9hl.jfif", "10_terraza-noche-fachada", (0.55, 0.55)),
    "salon": ("Gemini_Generated_Image_qnrng6qnrng6qnrn.jfif", "06_salon-celebracion-noche", (0.55, 0.45)),
    "comedor": ("Gemini_Generated_Image_yl0nnbyl0nnbyl0n.jfif", "07_comedor-ratan", (0.62, 0.5)),
    # Recreación (no retoque): la sala de las bombillas de cuerda de día, con la mesa puesta.
    "despacho": ("Gemini_Generated_Image_l56o17l56o17l56o.jfif", "06_salon-celebracion-noche", (0.5, 0.55)),
    "comedor-panoramica": ("Gemini_Generated_Image_94q70r94q70r94q7.jfif", "07_comedor-ratan", (0.5, 0.5)),
}


def recorte_45(im: Image.Image, centro: tuple[float, float]) -> Image.Image:
    w, h = im.size
    cw, ch = (round(h * 4 / 5), h) if w / h > 4 / 5 else (w, round(w * 5 / 4))
    x = min(max(centro[0] * w - cw / 2, 0), w - cw)
    y = min(max(centro[1] * h - ch / 2, 0), h - ch)
    m = im.crop((round(x), round(y), round(x) + cw, round(y) + ch))
    m.thumbnail((1200, 1500), Image.Resampling.LANCZOS)
    return m


def main() -> None:
    src = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for clave, (nombre, _origen, centro) in FOTOS.items():
        im = ImageOps.exif_transpose(Image.open(src / nombre)).convert("RGB")
        im.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
        im.save(OUT / f"{clave}.webp", "WEBP", quality=84, method=6)
        if centro:
            recorte_45(im, centro).save(OUT / f"{clave}-m.webp", "WEBP", quality=82, method=6)
        print(clave, im.size)


if __name__ == "__main__":
    main()
