"""Revelado de las fotos de La Ofi para la web.

Parte de los originales de public/images/** (sin tocarlos) y escribe versiones
editadas en public/images/ed/: balance de blancos, curvas, color, nitidez y un
reescalado moderado (Lanczos) para las que se muestran grandes. Además genera
recortes verticales 4:5 para móvil con el plato o el espacio centrado.

No inventa nada: no añade objetos, no cambia platos ni espacios. Solo revelado.

Uso: python scripts/editar-fotos.py   (requiere Pillow)
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parent.parent / "public" / "images"
OUT = ROOT / "ed"

# wb: intensidad del balance de blancos gris (0-1) · warm: desplazamiento cálido
# gamma < 1 levanta sombras · contrast / sat / bright: realce suave
# scale: reescalado Lanczos · crop: recorte base (x0, y0, x1, y1) del original
# m45: recorte 4:5 para móvil como (centro_x, centro_y) relativos al recorte base
FOTOS: dict[str, dict] = {
    "pintxos/tostada-burrata": dict(wb=0.15, warm=6, gamma=0.98, contrast=1.06, sat=1.08, bright=1.0, m45=(0.52, 0.5)),
    "pintxos/tostada-bonita": dict(wb=0.25, warm=10, gamma=0.96, contrast=1.1, sat=1.1, bright=1.02, crop=(110, 300, 1010, 1080), m45=(0.5, 0.55)),
    "pintxos/tostada-revuelta": dict(wb=0.2, warm=6, gamma=0.97, contrast=1.08, sat=1.06, bright=1.02, crop=(200, 260, 1080, 1080), m45=(0.55, 0.5), sharpen=90),
    "pintxos/tostada-salmon": dict(wb=0.3, warm=8, gamma=0.95, contrast=1.12, sat=1.1, bright=1.0, crop=(120, 20, 900, 960), m45=(0.5, 0.5)),
    "carta/pulpo-brasa-deia": dict(wb=0.1, warm=4, gamma=1.0, contrast=1.05, sat=1.06, bright=1.02, scale=1.6, m45=(0.48, 0.5)),
    "carta/carta-tostadas-desayuno": dict(wb=0.2, warm=6, gamma=1.0, contrast=1.04, sat=1.0, bright=1.0),
    "hero/comedor-ratan-avdg": dict(wb=0.2, warm=6, gamma=0.94, contrast=1.08, sat=1.06, bright=1.03, scale=1.6, m45=(0.6, 0.5)),
    "eventos/salon-celebracion-noche": dict(wb=0.55, warm=10, gamma=0.88, contrast=1.06, sat=0.95, bright=1.04, scale=1.3, m45=(0.55, 0.45)),
    "local/barra-deia": dict(wb=0.35, warm=8, gamma=0.92, contrast=1.06, sat=0.98, bright=1.04, scale=1.5, m45=(0.45, 0.5)),
    "local/rotulo-neon-rg": dict(wb=0.3, warm=6, gamma=0.95, contrast=1.06, sat=1.0, bright=1.02, scale=1.5, m45=(0.3, 0.5)),
    "local/terraza-noche-deia": dict(wb=0.2, warm=4, gamma=0.82, contrast=1.04, sat=1.0, bright=1.06, scale=1.5, m45=(0.55, 0.55)),
    "local/terraza-carpa-rg": dict(wb=0.15, warm=0, gamma=0.85, contrast=1.04, sat=1.0, bright=1.05, scale=1.5),
}


def balance_gris(im: Image.Image, fuerza: float) -> Image.Image:
    """Balance de blancos "gray world" parcial: corrige dominantes sin aplanar la luz."""
    if fuerza <= 0:
        return im
    r, g, b = ImageStat.Stat(im).mean
    gris = (r + g + b) / 3
    gan = [1 + fuerza * (gris / max(c, 1) - 1) for c in (r, g, b)]
    canales = [c.point(lambda v, k=k: min(255, int(v * k))) for c, k in zip(im.split(), gan)]
    return Image.merge("RGB", canales)


def calidez(im: Image.Image, grados: int) -> Image.Image:
    if grados == 0:
        return im
    r, g, b = im.split()
    r = r.point(lambda v: min(255, v + grados))
    b = b.point(lambda v: max(0, v - grados))
    return Image.merge("RGB", (r, g, b))


def curva_gamma(im: Image.Image, gamma: float) -> Image.Image:
    if gamma == 1:
        return im
    lut = [min(255, int(255 * (i / 255) ** gamma + 0.5)) for i in range(256)]
    return im.point(lut * 3)


def revelar(src: Path, p: dict) -> Image.Image:
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    if "crop" in p:
        im = im.crop(p["crop"])
    im = balance_gris(im, p["wb"])
    im = calidez(im, p["warm"])
    im = curva_gamma(im, p["gamma"])
    im = ImageEnhance.Contrast(im).enhance(p["contrast"])
    im = ImageEnhance.Color(im).enhance(p["sat"])
    im = ImageEnhance.Brightness(im).enhance(p["bright"])
    if p.get("scale", 1) != 1:
        w, h = im.size
        im = im.resize((round(w * p["scale"]), round(h * p["scale"])), Image.Resampling.LANCZOS)
    # Nitidez percibida: máscara de enfoque suave, con umbral para no realzar el ruido.
    im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=p.get("sharpen", 55), threshold=3))
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
    OUT.mkdir(exist_ok=True)
    for nombre, p in FOTOS.items():
        src = ROOT / f"{nombre}.webp"
        base = nombre.split("/")[-1]
        im = revelar(src, p)
        im.save(OUT / f"{base}.webp", "WEBP", quality=88, method=6)
        linea = f"{base}: {im.size[0]}x{im.size[1]}"
        if "m45" in p:
            m = recorte_45(im, p["m45"])
            m.save(OUT / f"{base}-m.webp", "WEBP", quality=86, method=6)
            linea += f" · móvil {m.size[0]}x{m.size[1]}"
        print(linea)


if __name__ == "__main__":
    main()
