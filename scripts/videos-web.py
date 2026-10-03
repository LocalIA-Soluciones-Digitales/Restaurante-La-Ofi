"""Prepara para la web los vídeos generados con Gemini (Veo) a partir de fotos de La Ofi.

Entrada: carpeta con los .mp4 originales (1280x720, 10 s). Salida en public/videos/ia/:
  <clave>-720.mp4   H.264, sin audio, faststart
  <clave>-720.webm  VP9, sin audio
  <clave>-poster.webp  primer fotograma (lo que se ve hasta que arranca y con
                       "reducir movimiento")

Bucle sin salto: los que no empiezan y acaban en el mismo plano se cierran con
"pingpong" (ida y vuelta, para travellings) o "fundido" (el final funde con el
principio). Uso: python scripts/videos-web.py <carpeta_originales>   (requiere ffmpeg)
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "videos" / "ia"

# clave -> (archivo original de Gemini, tipo de bucle)
VIDEOS: dict[str, tuple[str, str]] = {
    "burrata": ("gemini_generated_video_e7bfbdfc.mp4", "directo"),
    "pulpo": ("gemini_generated_video_a8c278d1.mp4", "directo"),
    "salon": ("gemini_generated_video_8e3d407e.mp4", "directo"),
    "barra": ("gemini_generated_video_3667e91d.mp4", "directo"),
    "comedor": ("gemini_generated_video_59f107d0.mp4", "pingpong"),
    "terraza": ("gemini_generated_video_5b5cfa7e.mp4", "fundido"),
    "parrilla": ("gemini_generated_video_d07aae74.mp4", "fundido"),
}

FUNDIDO = 1.2  # segundos


def ff(*args: str) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def filtro(bucle: str, duracion: float) -> str:
    base = "fps=24,scale=1280:720:flags=lanczos,format=yuv420p"
    if bucle == "pingpong":
        # Ida (primeros 5 s) + vuelta: el final coincide con el principio; 10 s en total.
        return f"[0:v]{base},trim=0:5,setpts=PTS-STARTPTS,split[a][b];[b]reverse,trim=start_frame=1[r];[a][r]concat=n=2:v=1,format=yuv420p[v]"
    if bucle == "fundido":
        # Empieza con la cola (últimos FUNDIDO s) fundiéndose en el principio: el vídeo
        # arranca y termina en el mismo instante del original, así el bucle no corta.
        t = round(duracion - FUNDIDO, 3)
        return (
            f"[0:v]{base},split[a][b];"
            f"[a]trim=0:{t},setpts=PTS-STARTPTS[cuerpo];"
            f"[b]trim={t},setpts=PTS-STARTPTS[cola];"
            f"[cola][cuerpo]xfade=transition=fade:duration={FUNDIDO}:offset=0,format=yuv420p[v]"
        )
    return f"[0:v]{base}[v]"


def duracion_de(path: Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(r.stdout.strip())


def main() -> None:
    src_dir = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    for clave, (nombre, bucle) in VIDEOS.items():
        src = src_dir / nombre
        fc = filtro(bucle, duracion_de(src))
        mp4, webm = OUT / f"{clave}-720.mp4", OUT / f"{clave}-720.webm"
        ff("-i", str(src), "-filter_complex", fc, "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "slow",
           "-crf", "26", "-profile:v", "high", "-movflags", "+faststart", str(mp4))
        ff("-i", str(mp4), "-an", "-c:v", "libvpx-vp9", "-crf", "36", "-b:v", "0", "-row-mt", "1",
           "-deadline", "good", "-cpu-used", "2", str(webm))
        ff("-i", str(mp4), "-frames:v", "1", "-c:v", "libwebp", "-quality", "82", str(OUT / f"{clave}-poster.webp"))
        print(clave, bucle, f"mp4 {mp4.stat().st_size // 1024} KB", f"webm {webm.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
