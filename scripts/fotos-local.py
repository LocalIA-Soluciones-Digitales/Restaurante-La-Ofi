"""Fotos profesionales del local entregadas por el restaurante (Carlos, encargado, 2026-10-17).

Vienen ya reveladas por el fotógrafo: aquí NO se toca el color. Solo:
  - recorte (quitar bordes desenfocados o sobrantes),
  - difuminado de datos personales (matrícula de la furgoneta),
  - enfoque suave para compensar la compresión de WhatsApp,
  - WebP para la web + recorte 4:5 para móvil.

Las fotos llegaron por WhatsApp a 1600 px de ancho: si se consiguen los originales
del fotógrafo, volver a ejecutar con esa carpeta (mismos nombres de archivo).

Uso: python scripts/fotos-local.py <carpeta_originales>   (requiere Pillow)
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "local" / "pro"

# clave -> archivo original. crop: (x0, y0, x1, y1) · blur: zonas a difuminar ·
# m45: centro (x, y) relativo del recorte 4:5 para móvil.
FOTOS: dict[str, dict] = {
    "comedor": dict(src="WhatsApp Image 2026-10-17 at 14.28.31.jpeg", m45=(0.56, 0.5)),
    "lounge-vinoteca": dict(src="WhatsApp Image 2026-10-17 at 14.27.58.jpeg", m45=(0.55, 0.5)),
    "despacho": dict(src="WhatsApp Image 2026-10-17 at 14.21.22.jpeg", m45=(0.5, 0.5)),
    "despacho-rotulo": dict(src="WhatsApp Image 2026-10-17 at 14.29.42.jpeg", crop=(0, 0, 1320, 1066)),
    "barra-neon": dict(src="WhatsApp Image 2026-10-17 at 14.29.06.jpeg", m45=(0.52, 0.5)),
    "barra-mesas-altas": dict(src="WhatsApp Image 2026-10-17 at 14.29.31.jpeg", m45=(0.45, 0.5)),
    "terraza": dict(src="WhatsApp Image 2026-10-17 at 14.28.48.jpeg", m45=(0.5, 0.5)),
    "fachada-carpa": dict(src="WhatsApp Image 2026-10-17 at 14.20.55.jpeg", m45=(0.55, 0.45)),
    "rotulo-aguila": dict(src="WhatsApp Image 2026-10-17 at 14.22.49.jpeg"),
    "furgoneta": dict(src="WhatsApp Image 2026-10-17 at 14.29.17.jpeg", blur=[(1180, 618, 1232, 650)]),
}


def difuminar(im: Image.Image, cajas: list[tuple[int, int, int, int]]) -> Image.Image:
    for caja in cajas:
        zona = im.crop(caja)
        im.paste(zona.filter(ImageFilter.GaussianBlur(9)), caja[:2])
    return im


def recorte_45(im: Image.Image, centro: tuple[float, float]) -> Image.Image:
    w, h = im.size
    if w / h > 4 / 5:
        cw, ch = round(h * 4 / 5), h
    else:
        cw, ch = w, round(w * 5 / 4)
    cx = min(max(centro[0] * w - cw / 2, 0), w - cw)
    cy = min(max(centro[1] * h - ch / 2, 0), h - ch)
    return im.crop((round(cx), round(cy), round(cx) + cw, round(cy) + ch))


def main() -> None:
    src_dir = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for clave, p in FOTOS.items():
        im = ImageOps.exif_transpose(Image.open(src_dir / p["src"])).convert("RGB")
        if "crop" in p:
            im = im.crop(p["crop"])
        if "blur" in p:
            im = difuminar(im, p["blur"])
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=3))
        im.save(OUT / f"{clave}.webp", "WEBP", quality=88, method=6)
        linea = f"{clave}: {im.size[0]}x{im.size[1]}"
        if "m45" in p:
            m = recorte_45(im, p["m45"])
            m.save(OUT / f"{clave}-m.webp", "WEBP", quality=86, method=6)
            linea += f" · móvil {m.size[0]}x{m.size[1]}"
        print(linea)


if __name__ == "__main__":
    main()
