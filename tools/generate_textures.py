#!/usr/bin/env python3
"""Generates the game's texture assets into assets/textures/.

All textures are procedurally painted (tileable where it matters) so the game
ships with no third-party art. After writing the image files, the script also
bundles them into assets/textures/textures.js as data URIs so the game runs
straight from the file system (file://) in every browser without WebGL
cross-origin errors.

Usage:  python3 tools/generate_textures.py
"""
import base64
import io
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "textures")
RNG = np.random.default_rng(7)


def fractal_noise(size, beta=2.0, seed=None):
    """Tileable fractal noise in [0,1] using spectral synthesis."""
    rng = np.random.default_rng(seed) if seed is not None else RNG
    white = rng.standard_normal((size, size))
    f = np.fft.fft2(white)
    fx = np.fft.fftfreq(size)[:, None]
    fy = np.fft.fftfreq(size)[None, :]
    k = np.sqrt(fx * fx + fy * fy)
    k[0, 0] = 1.0
    f = f / (k ** (beta / 2.0))
    f[0, 0] = 0
    n = np.real(np.fft.ifft2(f))
    n -= n.min()
    n /= n.max()
    return n


def lerp_color(a, b, t):
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    return a + (b - a) * t[..., None]


def to_img(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def grass(size=512):
    n1 = fractal_noise(size, 2.2, 1)
    n2 = fractal_noise(size, 1.0, 2)
    base = lerp_color((58, 112, 34), (112, 158, 52), n1)
    base = base * (0.82 + 0.3 * n2[..., None])
    # blades: short bright strokes
    img = to_img(base)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(3)
    for _ in range(9000):
        x, y = rng.integers(0, size, 2)
        l = rng.integers(3, 8)
        c = tuple(int(v) for v in rng.choice([(130, 180, 60), (70, 125, 38), (150, 190, 80), (45, 95, 30)]))
        dx = rng.integers(-2, 3)
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                d.line([(x + ox, y + oy), (x + dx + ox, y - l + oy)], fill=c, width=1)
    return img.filter(ImageFilter.SMOOTH)


def sand(size=512):
    n1 = fractal_noise(size, 2.4, 4)
    n2 = RNG.random((size, size))
    base = lerp_color((214, 188, 140), (238, 218, 176), n1)
    base = base * (0.93 + 0.12 * n2[..., None])
    # ripples
    y = np.arange(size)[:, None]
    x = np.arange(size)[None, :]
    rip = np.sin((y + 18 * n1) / size * np.pi * 2 * 14)
    base = base * (1 + 0.04 * rip[..., None])
    return to_img(base)


def mud(size=512):
    n1 = fractal_noise(size, 2.0, 5)
    n2 = fractal_noise(size, 1.2, 6)
    base = lerp_color((140, 86, 52), (186, 124, 76), n1)
    base = base * (0.85 + 0.25 * n2[..., None])
    img = to_img(base)
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(8)
    for _ in range(700):
        x, y = rng.integers(0, size, 2)
        r = rng.integers(1, 4)
        g = int(rng.integers(150, 200))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(g, int(g * 0.72), int(g * 0.5)))
    return img


def stone_path(size=512):
    """Laterite / granite paving slabs in a running bond pattern."""
    n = fractal_noise(size, 2.0, 9)
    img = Image.new("RGB", (size, size), (110, 100, 90))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(10)
    rows = 4
    h = size // rows
    for r in range(rows):
        off = (r % 2) * (size // 6)
        cols = 3
        w = size // cols
        for c in range(-1, cols + 1):
            x0 = c * w + off
            tone = rng.integers(-18, 18)
            col = (196 + tone, 170 + tone, 138 + tone)
            d.rectangle([x0 + 4, r * h + 4, x0 + w - 4, r * h + h - 4], fill=col)
    arr = np.asarray(img).astype(np.float32)
    arr = arr * (0.78 + 0.35 * n[..., None])
    img = to_img(arr).filter(ImageFilter.GaussianBlur(0.8))
    return img


def laterite(size=512):
    """Red laterite stone block wall typical of Kerala."""
    n = fractal_noise(size, 1.6, 11)
    n2 = RNG.random((size, size))
    img = Image.new("RGB", (size, size), (80, 60, 50))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(12)
    rows = 8
    h = size // rows
    for r in range(rows):
        off = (r % 2) * (size // 8)
        w = size // 4
        for c in range(-1, 5):
            x0 = c * w + off
            t = rng.integers(-20, 20)
            d.rectangle([x0 + 3, r * h + 3, x0 + w - 3, r * h + h - 3], fill=(170 + t, 82 + t // 2, 52 + t // 3))
    arr = np.asarray(img).astype(np.float32)
    arr *= (0.75 + 0.35 * n[..., None]) * (0.9 + 0.2 * (n2[..., None] > 0.82))
    return to_img(arr).filter(ImageFilter.GaussianBlur(0.6))


def roof_tiles(size=512):
    """Kerala terracotta 'Mangalore' roof tiles."""
    n = fractal_noise(size, 2.0, 13)
    arr = np.zeros((size, size, 3), np.float32)
    y = np.arange(size)[:, None].repeat(size, 1).astype(np.float32)
    x = np.arange(size)[None, :].repeat(size, 0).astype(np.float32)
    rows = 8
    cols = 8
    rh = size / rows
    cw = size / cols
    row = np.floor(y / rh)
    fy = (y % rh) / rh
    xo = x + (row % 2) * cw * 0.5
    fx = (xo % cw) / cw
    curve = np.sin(fx * np.pi)  # rounded tile
    shade = 0.55 + 0.45 * curve
    shade *= 0.75 + 0.35 * fy  # lower edge brighter (overlap)
    edge = (fy > 0.92).astype(np.float32)
    shade *= 1 - 0.45 * edge
    base = lerp_color((150, 52, 30), (205, 92, 52), n)
    arr = base * shade[..., None]
    return to_img(arr)


def thatch(size=512):
    img = Image.new("RGB", (size, size), (150, 115, 60))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(14)
    for _ in range(14000):
        x = int(rng.integers(0, size))
        y = int(rng.integers(0, size))
        l = int(rng.integers(20, 60))
        t = int(rng.integers(-35, 35))
        col = (190 + t, 150 + t, 80 + t // 2)
        dx = int(rng.integers(-3, 4))
        for oy in (-size, 0, size):
            for ox in (-size, 0, size):
                d.line([(x + ox, y + oy), (x + dx + ox, y + l + oy)], fill=col, width=1)
    arr = np.asarray(img).astype(np.float32)
    rows = (np.sin(np.arange(size) / size * np.pi * 2 * 6) * 0.5 + 0.5)[:, None, None]
    arr *= 0.8 + 0.25 * rows
    return to_img(arr)


def wood(size=512):
    n = fractal_noise(size, 1.8, 15)
    y = np.arange(size)[:, None].repeat(size, 1).astype(np.float32)
    x = np.arange(size)[None, :].repeat(size, 0).astype(np.float32)
    planks = 4
    pw = size / planks
    p = np.floor(x / pw)
    grain = np.sin((x + n * 60) * 0.35 + p * 7) * 0.5 + 0.5
    grain2 = np.sin((x * 0.05 + n * 8 + y * 0.002) * 6) * 0.5 + 0.5
    base = lerp_color((96, 56, 28), (150, 96, 52), grain * 0.6 + grain2 * 0.4)
    shade = 0.85 + 0.25 * ((p * 37 % 5) / 5)
    gap = ((x % pw) < 3).astype(np.float32)
    base *= (shade * (1 - 0.6 * gap))[..., None]
    return to_img(base)


def plaster(size=512):
    n = fractal_noise(size, 2.2, 16)
    n2 = fractal_noise(size, 0.8, 17)
    base = lerp_color((226, 218, 200), (246, 242, 230), n)
    base *= (0.95 + 0.07 * n2[..., None])
    # damp stains at bottom
    y = np.linspace(0, 1, size)[:, None]
    stain = np.clip((y - 0.8) * 5, 0, 1) * (0.5 + 0.5 * n)
    base *= (1 - 0.18 * stain[..., None])
    return to_img(base)


def water_normal(size=512):
    h = fractal_noise(size, 2.6, 18) * 0.7 + fractal_noise(size, 1.6, 19) * 0.3
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 8
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 8
    nz = np.ones_like(h)
    l = np.sqrt(gx * gx + gy * gy + nz)
    nx, ny, nz = -gx / l, -gy / l, nz / l
    arr = np.stack([(nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255], -1)
    return to_img(arr)


def palm_frond(w=256, h=512):
    """Alpha-mapped coconut frond (rachis along the centre, leaflets either side)."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = w // 2
    rng = np.random.default_rng(20)
    n = 46
    for i in range(n):
        t = i / n
        y = int(h * 0.02 + t * h * 0.96)
        length = (w * 0.48) * np.sin(np.pi * (0.15 + 0.85 * t)) ** 0.7
        for side in (-1, 1):
            droop = int(length * 0.55)
            tip = (cx + side * length, y + droop)
            g = int(rng.integers(-18, 18))
            col = (62 + g, 128 + g, 36 + g // 2, 255)
            tip2 = (tip[0] - side * 4, tip[1] + 4)
            d.polygon([(cx, y - 4), (cx, y + 9), tip2, tip], fill=col)
            d.line([(cx, y + 2), tip], fill=(96 + g, 166 + g, 62, 255), width=2)
    d.line([(cx, 0), (cx, h)], fill=(150, 140, 70, 255), width=5)
    return img


def banana_leaf(w=256, h=512):
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = w // 2
    pts = []
    for i in range(41):
        t = i / 40
        pts.append((cx - (w * 0.47) * np.sin(np.pi * t) ** 0.6, t * h))
    for i in range(40, -1, -1):
        t = i / 40
        pts.append((cx + (w * 0.47) * np.sin(np.pi * t) ** 0.6, t * h))
    d.polygon(pts, fill=(78, 150, 44, 255))
    rng = np.random.default_rng(21)
    for i in range(70):
        y = i / 70 * h
        d.line([(cx, y), (cx - w * 0.47, y + 14)], fill=(96, 172, 58, 255), width=1)
        d.line([(cx, y), (cx + w * 0.47, y + 14)], fill=(66, 130, 38, 255), width=1)
    # tears
    for _ in range(6):
        y = rng.integers(40, h - 40)
        side = rng.choice([-1, 1])
        d.line([(cx + side * 12, y), (cx + side * w * 0.5, y + 22)], fill=(0, 0, 0, 0), width=3)
    d.line([(cx, 0), (cx, h)], fill=(190, 200, 120, 255), width=5)
    return img


def foliage(size=256):
    """Leaf clump alpha texture for mango / jackfruit / banyan canopy cards."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    rng = np.random.default_rng(22)
    for _ in range(260):
        r = rng.random() ** 0.5 * size * 0.42
        a = rng.random() * np.pi * 2
        x = size / 2 + np.cos(a) * r
        y = size / 2 + np.sin(a) * r
        ang = rng.random() * np.pi
        L = rng.integers(14, 26)
        W = L * 0.42
        g = int(rng.integers(-30, 30))
        col = (52 + g, 112 + g, 34 + g // 2, 255)
        pts = []
        for k in range(12):
            t = k / 11 * np.pi * 2
            px = np.cos(t) * L / 2
            py = np.sin(t) * W / 2
            pts.append((x + px * np.cos(ang) - py * np.sin(ang), y + px * np.sin(ang) + py * np.cos(ang)))
        d.polygon(pts, fill=col)
    return img


def cloud(size=256):
    n = fractal_noise(size, 2.0, 23)
    y = np.linspace(-1, 1, size)[:, None]
    x = np.linspace(-1, 1, size)[None, :]
    r = np.sqrt(x * x + (y * 1.6) ** 2)
    a = np.clip((1 - r) * 1.6, 0, 1) * np.clip(n * 1.8 - 0.25, 0, 1)
    a = np.clip(a * 1.4, 0, 1)
    shade = 225 + 30 * (1 - (y + 1) / 2)
    rgb = np.repeat(shade, size, 1)
    arr = np.dstack([rgb, rgb, rgb + 5, a * 255])
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def kasavu(w=256, h=64):
    """Golden 'kasavu' border band for saree / mundu."""
    img = Image.new("RGB", (w, h), (250, 246, 232))
    d = ImageDraw.Draw(img)
    d.rectangle([0, h - 18, w, h - 4], fill=(212, 164, 52))
    d.rectangle([0, h - 22, w, h - 20], fill=(212, 164, 52))
    return img


def palm_bark(size=256):
    """Ringed coconut trunk bark."""
    n = fractal_noise(size, 1.6, 25)
    y = np.arange(size)[:, None].astype(np.float32)
    rings = (np.sin(y / size * np.pi * 2 * 10 + n * 2.0) * 0.5 + 0.5) ** 3
    base = lerp_color((120, 102, 82), (82, 68, 54), rings)
    base *= (0.85 + 0.25 * n[..., None])
    return to_img(base)


def tea_rows(size=512):
    n = fractal_noise(size, 2.0, 24)
    y = np.arange(size)[:, None].astype(np.float32)
    rows = np.sin(y / size * np.pi * 2 * 10) * 0.5 + 0.5
    rows = np.repeat(rows, size, 1)
    base = lerp_color((40, 96, 36), (96, 162, 60), np.clip(rows * 0.75 + n * 0.4, 0, 1))
    return to_img(base)


def save(img, name, quality=86):
    path = os.path.join(OUT, name)
    if name.endswith(".jpg"):
        img.convert("RGB").save(path, quality=quality, optimize=True)
    else:
        img.save(path, optimize=True)
    return path


def main():
    os.makedirs(OUT, exist_ok=True)
    items = {
        "grass.jpg": grass(),
        "sand.jpg": sand(),
        "mud.jpg": mud(),
        "stone_path.jpg": stone_path(),
        "laterite.jpg": laterite(),
        "roof_tiles.jpg": roof_tiles(),
        "thatch.jpg": thatch(),
        "wood.jpg": wood(),
        "plaster.jpg": plaster(),
        "tea_rows.jpg": tea_rows(),
        "palm_bark.jpg": palm_bark(),
        "water_normal.jpg": water_normal(),
        "kasavu.jpg": kasavu(),
        "palm_frond.png": palm_frond(),
        "banana_leaf.png": banana_leaf(),
        "foliage.png": foliage(),
        "cloud.png": cloud(),
    }
    bundle = []
    for name, img in items.items():
        path = save(img, name)
        mime = "image/jpeg" if name.endswith(".jpg") else "image/png"
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        key = os.path.splitext(name)[0]
        bundle.append('  "%s": "data:%s;base64,%s"' % (key, mime, b64))
        print("wrote", name, os.path.getsize(path) // 1024, "KB")
    with open(os.path.join(OUT, "textures.js"), "w") as f:
        f.write("// AUTO-GENERATED by tools/generate_textures.py - do not edit by hand.\n")
        f.write("// Texture images embedded as data URIs so the game also runs from file://\n")
        f.write("window.KT = window.KT || {};\nKT.TEXTURE_DATA = {\n")
        f.write(",\n".join(bundle))
        f.write("\n};\n")
    print("wrote textures.js")


if __name__ == "__main__":
    main()
