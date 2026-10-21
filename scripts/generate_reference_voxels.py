#!/usr/bin/env python3
"""Gera um atlas binário de amostras RGB/XY para reconstrução somente por cubos.

A imagem de referência é usada apenas durante esta etapa offline. O runtime não a
carrega nem a desenha: cada registro do atlas vira uma instância BoxGeometry.
"""
from pathlib import Path
from PIL import Image
import random
import struct

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "referencia-rosto-humanoide.png"
OUTPUT = ROOT / "public" / "assets" / "humanoid_face_88000.bin"
GRID = 384
COUNT = 88000
BACKGROUND = (2, 6, 23)
THRESHOLD = 30
SEED = 20261020


def main():
    image = Image.open(SOURCE).convert("RGB").resize((GRID, GRID), Image.Resampling.LANCZOS)
    pixels = image.load()
    candidates = []
    for y in range(GRID):
        for x in range(GRID):
            r, g, b = pixels[x, y]
            distance = max(abs(r - BACKGROUND[0]), abs(g - BACKGROUND[1]), abs(b - BACKGROUND[2]))
            if distance > THRESHOLD:
                candidates.append((x, y, r, g, b))
    if len(candidates) < COUNT:
        raise RuntimeError(f"A máscara produziu {len(candidates)} amostras; eram necessárias {COUNT}.")

    rng = random.Random(SEED)
    rng.shuffle(candidates)
    samples = candidates[:COUNT]
    rng.shuffle(samples)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("wb") as output:
        output.write(struct.pack("<4sHHI", b"GSF1", GRID, GRID, COUNT))
        for x, y, r, g, b in samples:
            output.write(struct.pack("<HHBBB", x, y, r, g, b))
    print(f"Fonte: {SOURCE.name} ({image.width}x{image.height})")
    print(f"Grade de amostragem: {GRID}x{GRID}; candidatos: {len(candidates)}")
    print(f"Cubos: {COUNT}; arquivo: {OUTPUT}; bytes: {OUTPUT.stat().st_size}")


if __name__ == "__main__":
    main()
