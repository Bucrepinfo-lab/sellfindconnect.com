#!/usr/bin/env python3
"""Draw the swappable Sell Find Connect placeholder icon set.

Theme green field, lime monogram. Replace the art, then run this script again
or drop real files at the same paths.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps" / "web" / "public" / "icons"

GREEN = (0x1D, 0x4F, 0x45)
LIME = (0xC8, 0xF0, 0x4D)

# 5x7 glyphs. 1 = ink.
GLYPHS = {
    "S": [
        "01110",
        "10001",
        "10000",
        "01110",
        "00001",
        "10001",
        "01110",
    ],
    "F": [
        "11111",
        "10000",
        "10000",
        "11110",
        "10000",
        "10000",
        "10000",
    ],
    "C": [
        "01111",
        "10000",
        "10000",
        "10000",
        "10000",
        "10000",
        "01111",
    ],
}


def png(width: int, height: int, pixels: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + pixels[y * width * 3 : (y + 1) * width * 3] for y in range(height))
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


def draw(size: int, maskable: bool) -> bytes:
    pixels = bytearray(size * size * 3)
    # Maskable icons must fill the whole bitmap. The launcher icon uses the
    # same field so the placeholder stays one color until real art replaces it.
    del maskable
    for i in range(0, len(pixels), 3):
        pixels[i : i + 3] = GREEN
    text = "SFC"
    glyph_w, glyph_h = 5, 7
    gap = 1
    scale = max(1, size // 14)
    block_w = (glyph_w * len(text) + gap * (len(text) - 1)) * scale
    block_h = glyph_h * scale
    origin_x = (size - block_w) // 2
    origin_y = (size - block_h) // 2
    for index, char in enumerate(text):
        glyph = GLYPHS[char]
        gx = origin_x + index * (glyph_w + gap) * scale
        for row, bits in enumerate(glyph):
            for col, bit in enumerate(bits):
                if bit != "1":
                    continue
                for dy in range(scale):
                    for dx in range(scale):
                        px = gx + col * scale + dx
                        py = origin_y + row * scale + dy
                        if 0 <= px < size and 0 <= py < size:
                            j = (py * size + px) * 3
                            pixels[j : j + 3] = LIME
    return png(size, size, bytes(pixels))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "icon-192.png": draw(192, False),
        "icon-512.png": draw(512, False),
        "icon-maskable-512.png": draw(512, True),
        "apple-touch-icon.png": draw(180, False),
        "favicon-32.png": draw(32, False),
    }
    for name, data in files.items():
        path = OUT / name
        path.write_bytes(data)
        print(f"wrote {path.relative_to(ROOT)} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
