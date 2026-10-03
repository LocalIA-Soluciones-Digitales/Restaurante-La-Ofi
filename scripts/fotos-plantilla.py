"""Fotos de PLANTILLA (stock de Unsplash) mientras no haya fotos profesionales de La Ofi.

Descarga cada foto de Unsplash por su id (licencia Unsplash: uso comercial libre,
sin atribución obligatoria; se acredita igualmente en src/lib/images-plantilla.ts)
y escribe en public/images/plantilla/:
  <clave>.webp     máx. 2400 px de lado, WebP q82
  <clave>-m.webp   recorte vertical 4:5 para móvil (1080x1350 como máximo)

No son fotos del restaurante: la web las marca como "Imagen ilustrativa" y se
apagan con NEXT_PUBLIC_FOTOS_PLANTILLA=false (ver IMAGES_SOURCES.md).

Uso: python scripts/fotos-plantilla.py [--cache DIR]   (requiere Pillow)
"""

from __future__ import annotations

import io
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "plantilla"

# clave -> (id de Unsplash, centro del recorte móvil 4:5 relativo (x, y))
FOTOS: dict[str, tuple[str, tuple[float, float]]] = {
    "tabla-tostadas": ("2IxTgsgFi-s", (0.45, 0.5)),
    "huevos-revueltos": ("qla1_604R4c", (0.5, 0.45)),
    "pintxos-barra": ("MFgpVO9Odms", (0.4, 0.5)),
    "terraza-cena": ("L90oTq9DIK4", (0.5, 0.5)),
    "cafe-latte": ("HtH05rdNLGE", (0.5, 0.5)),
    "parrilla-pescado": ("3_M4NxDo89A", (0.5, 0.5)),
    "parrilla-carne": ("Xm8XD2b9AUs", (0.55, 0.5)),
}


def descargar(uid: str, cache: Path | None) -> Image.Image:
    if cache and (cache / f"{uid}.jpg").exists():
        return Image.open(cache / f"{uid}.jpg")
    url = f"https://unsplash.com/photos/{uid}/download?force=true&w=2400"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    if cache:
        (cache / f"{uid}.jpg").write_bytes(data)
    return Image.open(io.BytesIO(data))


def recorte_45(im: Image.Image, centro: tuple[float, float]) -> Image.Image:
    w, h = im.size
    cw, ch = (round(h * 4 / 5), h) if w / h > 4 / 5 else (w, round(w * 5 / 4))
    x = min(max(centro[0] * w - cw / 2, 0), w - cw)
    y = min(max(centro[1] * h - ch / 2, 0), h - ch)
    m = im.crop((round(x), round(y), round(x) + cw, round(y) + ch))
    m.thumbnail((1080, 1350), Image.Resampling.LANCZOS)
    return m


def main() -> None:
    cache = Path(sys.argv[sys.argv.index("--cache") + 1]) if "--cache" in sys.argv else None
    OUT.mkdir(parents=True, exist_ok=True)
    for clave, (uid, centro) in FOTOS.items():
        im = ImageOps.exif_transpose(descargar(uid, cache)).convert("RGB")
        im.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
        im.save(OUT / f"{clave}.webp", "WEBP", quality=82, method=6)
        recorte_45(im, centro).save(OUT / f"{clave}-m.webp", "WEBP", quality=80, method=6)
        print(clave, im.size)


if __name__ == "__main__":
    main()
