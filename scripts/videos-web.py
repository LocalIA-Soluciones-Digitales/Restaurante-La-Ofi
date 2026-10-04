"""Prepara para la web los vídeos generados con Gemini (Veo) a partir de fotos de La Ofi.

Entrada: carpeta con los .mp4 originales (1280x720, 10 s). Salida en public/videos/ia/:
  <clave>-720.mp4   H.264, sin audio, faststart
  <clave>-720.webm  VP9, sin audio
  <clave>-poster.webp  primer fotograma (lo que se ve hasta que arranca y con
                       "reducir movimiento")

Cámara lenta: se reproducen a VELOCIDAD (0,6x) con interpolación de movimiento
(minterpolate), que crea los fotogramas intermedios: sigue a 24 fps, sin tirones.

Bucle sin salto: "pingpong" (ida y vuelta, para travellings) o "fundido" (el final
funde con el principio). Se codifica desde un intermedio sin pérdidas para no
recomprimir dos veces. Uso: python scripts/videos-web.py <carpeta_originales> [clave ...]
(requiere ffmpeg; sin claves procesa todos)
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "videos" / "ia"

# clave -> (archivo original de Gemini, tipo de bucle)
VIDEOS: dict[str, tuple[str, str]] = {
    "burrata": ("gemini_generated_video_e7bfbdfc.mp4", "fundido"),
    "pulpo": ("gemini_generated_video_a8c278d1.mp4", "fundido"),
    "salon": ("gemini_generated_video_8e3d407e.mp4", "fundido"),
    "barra": ("gemini_generated_video_3667e91d.mp4", "fundido"),
    "comedor": ("gemini_generated_video_59f107d0.mp4", "pingpong"),
    "terraza": ("gemini_generated_video_5b5cfa7e.mp4", "fundido"),
    "parrilla": ("gemini_generated_video_d07aae74.mp4", "fundido"),
}

VELOCIDAD = 0.6  # 10 s originales -> ~16,7 s
FUNDIDO = 2.0  # segundos (ya en cámara lenta)


def ff(*args: str) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args], check=True)


def filtro(bucle: str, duracion: float) -> str:
    lento = (
        "scale=1280:720:flags=lanczos,"
        f"setpts=PTS/{VELOCIDAD},"
        "minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,"
        "format=yuv420p"
    )
    total = duracion / VELOCIDAD
    if bucle == "pingpong":
        # Ida (primera mitad) + vuelta: el final coincide con el principio.
        mitad = round(total / 2, 3)
        return f"[0:v]{lento},trim=0:{mitad},setpts=PTS-STARTPTS,split[a][b];[b]reverse,trim=start_frame=1[r];[a][r]concat=n=2:v=1,format=yuv420p[v]"
    if bucle == "fundido":
        # Empieza con la cola (últimos FUNDIDO s) fundiéndose en el principio: el vídeo
        # arranca y termina en el mismo instante del original, así el bucle no corta.
        t = round(total - FUNDIDO, 3)
        return (
            f"[0:v]{lento},split[a][b];"
            f"[a]trim=0:{t},setpts=PTS-STARTPTS[cuerpo];"
            f"[b]trim={t},setpts=PTS-STARTPTS[cola];"
            f"[cola][cuerpo]xfade=transition=fade:duration={FUNDIDO}:offset=0,format=yuv420p[v]"
        )
    return f"[0:v]{lento}[v]"


def duracion_de(path: Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(r.stdout.strip())


def main() -> None:
    src_dir = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp())
    claves = sys.argv[2:] or list(VIDEOS)
    for clave in claves:
        nombre, bucle = VIDEOS[clave]
        src = src_dir / nombre
        fc = filtro(bucle, duracion_de(src))
        master = tmp / f"{clave}.mkv"
        mp4, webm = OUT / f"{clave}-720.mp4", OUT / f"{clave}-720.webm"
        ff("-i", str(src), "-filter_complex", fc, "-map", "[v]", "-an", "-c:v", "libx264", "-qp", "0",
           "-preset", "ultrafast", str(master))
        ff("-i", str(master), "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(mp4))
        ff("-i", str(master), "-an", "-c:v", "libvpx-vp9", "-crf", "31", "-b:v", "0", "-row-mt", "1",
           "-deadline", "good", "-cpu-used", "1", "-pix_fmt", "yuv420p", str(webm))
        ff("-i", str(master), "-frames:v", "1", "-c:v", "libwebp", "-quality", "82", str(OUT / f"{clave}-poster.webp"))
        master.unlink()
        print(clave, bucle, f"mp4 {mp4.stat().st_size // 1024} KB", f"webm {webm.stat().st_size // 1024} KB", flush=True)


if __name__ == "__main__":
    main()
