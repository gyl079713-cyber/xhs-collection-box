"""Render the simple blind-box mark to Chrome extension PNG sizes.

This uses only the Python standard library so the icon remains reproducible.
The polygons below correspond to icon.svg.
"""

from pathlib import Path
import struct
import zlib


ROOT = Path(__file__).parent
SIZES = (16, 32, 48, 128)
SAMPLES = 8

BACKGROUND = (195, 77, 105)
SPARKLE = (255, 247, 249)
WHITE = (255, 255, 255)
PINK = (255, 232, 238)

SHAPES = (
    (SPARKLE, [(67, 15), (70, 24), (79, 27), (70, 30),
               (67, 39), (64, 30), (55, 27), (64, 24)]),
    (WHITE, [(28, 65), (100, 65), (100, 96), (93, 104), (35, 104), (28, 96)]),
    (PINK, [(64, 65), (100, 65), (100, 96), (93, 104), (64, 104)]),
    (WHITE, [(26, 48), (94, 38), (102, 54), (34, 64)]),
)


def inside_polygon(x, y, points):
    inside = False
    j = len(points) - 1
    for i, (xi, yi) in enumerate(points):
        xj, yj = points[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def inside_background(x, y):
    radius = 29
    if not 0 <= x < 128 or not 0 <= y < 128:
        return False
    cx = radius if x < radius else 128 - radius if x > 128 - radius else x
    cy = radius if y < radius else 128 - radius if y > 128 - radius else y
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def color_at(x, y):
    if not inside_background(x, y):
        return None
    color = BACKGROUND
    for fill, points in SHAPES:
        if inside_polygon(x, y, points):
            color = fill
    return color


def chunk(kind, data):
    payload = kind + data
    return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload))


def render(size):
    rows = bytearray()
    for py in range(size):
        rows.append(0)  # PNG filter: None
        for px in range(size):
            red = green = blue = visible = 0
            for sy in range(SAMPLES):
                y = (py + (sy + 0.5) / SAMPLES) * 128 / size
                for sx in range(SAMPLES):
                    x = (px + (sx + 0.5) / SAMPLES) * 128 / size
                    color = color_at(x, y)
                    if color is None:
                        continue
                    visible += 1
                    red += color[0]
                    green += color[1]
                    blue += color[2]
            rows.extend((round(red / visible) if visible else 0,
                         round(green / visible) if visible else 0,
                         round(blue / visible) if visible else 0,
                         round(255 * visible / (SAMPLES * SAMPLES))))
    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
    png += chunk(b"IDAT", zlib.compress(bytes(rows), 9)) + chunk(b"IEND", b"")
    (ROOT / f"icon-{size}.png").write_bytes(png)


if __name__ == "__main__":
    for icon_size in SIZES:
        render(icon_size)
