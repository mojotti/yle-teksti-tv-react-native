#!/usr/bin/env python3
"""Generate the app icon for iOS and Android.

The icon is page 100 as people know it (blue header, cyan strip, black middle,
green index block, colour keys), drawn with Yle's own teletext glyphs and lit like a CRT:
phosphor glow on the text, slight colour fringing, scanlines and curved glass.

The glyph bitmaps in scripts/teletext-glyphs.json were taken from Yle's
rendered page images (18 x 18 px cells).

Android gets a two-layer adaptive icon: the colour bands in the back, the
glowing text, mark and glass highlight in front, so launchers can move them
apart. The themed (monochrome) layer is the "t" mark on its own.

Usage (from the repo root; needs numpy and Pillow):
    python3 -m pip install numpy pillow
    python3 scripts/generate-icons.py            # both platforms
    python3 scripts/generate-icons.py android    # or just one
    python3 scripts/generate-icons.py preview out/   # preview images only
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
with open(os.path.join(HERE, "teletext-glyphs.json")) as f:
    GLYPHS = {k: np.array([[c == "#" for c in row] for row in v]) for k, v in json.load(f).items()}

BLUE = (22, 42, 250)
CYAN = (40, 228, 255)
GREEN = (36, 236, 70)
WHITE = (250, 250, 250)
YELLOW = (255, 232, 36)
KEYS = ((255, 50, 60), (40, 235, 80), (255, 230, 40), (40, 228, 255))  # red, green, yellow, cyan

# The "t:" mark from Yle's section pages, in sixels (each 1.5 wide : 1 tall).
T_MARK = [
    ".##..",
    "#####",
    "#####",
    ".##..",
    ".##.#",
    ".##..",
    ".####",
    ".####",
]


# ---------------------------------------------------------------- the page

class Scene:
    """Shapes in window units (0..1 is the visible icon), on a back or front layer."""

    def __init__(self):
        self.items = []

    def rect(self, box, colour):
        self.items.append(dict(layer="back", box=box, mask=None, colour=colour, heat=0.0, glow=0.0))

    def bits(self, x, y, w, h, mask, colour, heat=0.0, glow=1.0):
        self.items.append(dict(layer="front", box=(x, y, x + w, y + h), mask=mask, colour=colour, heat=heat, glow=glow))

    def text(self, x, y, s, cw, colour, tall=1, glow=1.0):
        """Teletext text: square cells cw wide (tall=2 for double height)."""
        for i, c in enumerate(s):
            if c != " ":
                self.bits(x + i * cw, y, cw, cw * tall, GLYPHS[c], colour, glow=glow)
        return x + len(s) * cw


def page(layout, dark=False):
    """layout "ios" fills the square; "android" pulls the content in to fit the
    circular safe zone and centres it.

    Bands from the top: blue header, cyan strip, black sections, green index,
    and a black strip with the four colour keys.

    dark: the iOS dark-mode version. The bands sink to deep tints and the text
    in them takes the band colour, so only the lettering and keys are lit."""
    android = layout == "android"
    s = Scene()
    band_blue, band_cyan, band_green = (BLUE, CYAN, GREEN) if not dark else ((5, 9, 52), (3, 30, 40), (3, 34, 12))
    strip_text, index_text = (BLUE, BLUE) if not dark else (CYAN, GREEN)
    band_glow = 0 if not dark else 0.7
    if android:
        hb, cb, gb, ge = 0.33, 0.40, 0.69, 0.80
    else:
        hb, cb, gb, ge = 0.32, 0.39, 0.70, 0.865
    s.rect((-1, -1, 2, hb), band_blue)
    s.rect((-1, hb, 2, cb), band_cyan)
    s.rect((-1, gb, 2, ge), band_green)
    k = 0.80 if android else 1.0

    def left(chars, cw):
        return 0.5 - chars * cw / 2 if android else 0.07

    # Header: the mark and a double-height "Teksti-TV".
    mh = 0.235 * k
    mch = mh / 8
    mcw = mch * 1.5
    tw = 0.068 * k
    gap = 0.035 * k
    total = 5 * mcw + gap + 9 * tw
    hx = 0.5 - total / 2 if android else 0.07
    hy = (hb + 0.012) / 2 + (0.03 if android else 0)
    s.bits(hx, hy - mh / 2, 5 * mcw, mh, np.array([[c == "#" for c in r] for r in T_MARK]), WHITE, heat=0.6, glow=0.6)
    s.text(hx + 5 * mcw + gap, hy - tw, "Teksti-TV", tw, WHITE, tall=2, glow=0.5)
    # Cyan strip.
    sw = 0.058 * k
    s.text(left(13, sw), hb + (cb - hb - sw) / 2, "100 HAKEMISTO", sw, strip_text, glow=band_glow)
    # Sections, yellow numbers and white names.
    rw = 0.078 * k
    for j, (num, name) in enumerate((("101", "Uutiset"), ("201", "Urheilu"))):
        y = cb + (gb - cb) * (0.27 + 0.48 * j) - rw / 2
        x = s.text(left(11, rw), y, num + " ", rw, YELLOW)
        s.text(x, y, name, rw, WHITE)
    # Green index block in blue (green on dark).
    iw = 0.05 * k
    iy = gb + ((ge - gb) - iw * 2.15) / 2 - iw * 0.08
    for j, line in enumerate(("300 OHJELMAT  470", "160 TALOUS    575")):
        s.text(left(11, rw), iy + j * iw * 1.15, line, iw, index_text, glow=band_glow)
    # Colour keys. On Android the row sits higher and narrower to stay in the circle.
    if android:
        x0, x1, y0, y1 = 0.22, 0.78, 0.835, 0.878
    else:
        x0, x1, y0, y1 = 0.07, 0.93, 0.895, 0.955
    kg = 0.025 * k
    kw = (x1 - x0 - 3 * kg) / 4
    for i, c in enumerate(KEYS):
        s.bits(x0 + i * (kw + kg), y0, kw, y1 - y0, np.ones((1, 1), bool), c, glow=0.9)
    return s


# ---------------------------------------------------------------- rendering

def blur(a, sigma):
    """Gaussian blur through the FFT, zero-padded so glow doesn't wrap round."""
    if sigma < 0.3:
        return a
    flat = a.ndim == 2
    if flat:
        a = a[..., None]
    h, w = a.shape[:2]
    p = int(min(3 * sigma, max(h, w)))
    big = np.zeros((h + 2 * p, w + 2 * p, a.shape[2]))
    big[p:p + h, p:p + w] = a
    fy = np.fft.fftfreq(big.shape[0])[:, None]
    fx = np.fft.rfftfreq(big.shape[1])[None, :]
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (fx ** 2 + fy ** 2))
    out = np.stack([np.fft.irfft2(np.fft.rfft2(big[..., c]) * g, s=big.shape[:2]) for c in range(a.shape[2])], -1)
    out = out[p:p + h, p:p + w]
    return out[..., 0] if flat else out


def smooth(e0, e1, v):
    t = np.clip((v - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def down(a, ss):
    h, w = a.shape[0] // ss, a.shape[1] // ss
    return a.reshape(h, ss, w, ss, *a.shape[2:]).mean(axis=(1, 3))


def sample(img, sx, sy):
    """Bilinear lookup at fractional pixel positions."""
    h, w = img.shape[:2]
    sx = np.clip(sx, 0, w - 1.001)
    sy = np.clip(sy, 0, h - 1.001)
    x0, y0 = sx.astype(int), sy.astype(int)
    fx, fy = sx - x0, sy - y0
    if img.ndim == 3:
        fx, fy = fx[..., None], fy[..., None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy)
            + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy)


CURVE = 0.07     # how much the tube face bulges
FRINGE = 0.0016  # red/blue beam misalignment, in window units


def render(scene, px, view=(0.0, 1.0), ss=3):
    """Renders the window range `view` (same on both axes) into px x px.

    Returns (back, front, front_alpha) as float arrays: the opaque band layer,
    and the front layer's colour and coverage (text, mark, glow, glass)."""
    u0, u1 = view
    span = u1 - u0
    pw = px / span                      # pixels per window unit
    m = 0.25                            # drawn margin beyond the view, for the lens
    n_draw = int(round((span + 2 * m) * pw * ss))
    org = u0 - m

    def to_px(u):
        return (u - org) * pw * ss

    keys = ("back", "front", "heat", "alpha", "glow")
    canv = {k: Image.new("RGB" if k in ("back", "front", "glow") else "L", (n_draw, n_draw)) for k in keys}
    draw = {k: ImageDraw.Draw(v) for k, v in canv.items()}
    for it in scene.items:
        x0, y0, x1, y1 = (to_px(v) for v in it["box"])
        X0, Y0 = int(round(x0)), int(round(y0))
        W, H = max(1, int(round(x1)) - X0), max(1, int(round(y1)) - Y0)
        if it["layer"] == "back":
            draw["back"].rectangle((X0, Y0, X0 + W - 1, Y0 + H - 1), fill=it["colour"])
            continue
        mk = Image.fromarray((it["mask"] * 255).astype(np.uint8)).resize((W, H), Image.NEAREST)
        box = (X0, Y0, X0 + W, Y0 + H)
        canv["front"].paste(it["colour"], box, mk)
        canv["heat"].paste(int(255 * it["heat"]), box, mk)
        canv["alpha"].paste(255, box, mk)
        canv["glow"].paste(tuple(int(c * it["glow"]) for c in it["colour"]), box, mk)
    arr = {k: np.asarray(v, float) for k, v in canv.items()}
    arr["heat"] /= 255
    arr["alpha"] /= 255

    # Look through the bulging glass: window coords of each output (supersampled) pixel.
    n = px * ss
    g = (np.arange(n) + 0.5) / n * span + u0
    U, V = np.meshgrid(g, g)
    nx, ny = U * 2 - 1, V * 2 - 1
    f = 1 + CURVE * (np.minimum(nx * nx + ny * ny, 2.2) - 0.6)
    su, sv = (nx * f + 1) / 2, (ny * f + 1) / 2

    def look(a, du=0.0):
        return down(sample(a, to_px(su + du) - 0.5, to_px(sv) - 0.5), ss)

    back = look(arr["back"])
    heat = look(arr["heat"])
    alpha = look(arr["alpha"])
    glowsrc = look(arr["glow"])
    # Colour fringing: red lands a touch left, blue a touch right.
    front = np.stack([look(arr["front"][..., 0], -FRINGE), look(arr["front"][..., 1]),
                      look(arr["front"][..., 2], FRINGE)], -1)
    alpha = np.maximum(alpha, np.maximum(look(arr["alpha"], -FRINGE), look(arr["alpha"], FRINGE)) * 0.7)
    # The canvas is black outside the text, so sampled colour is premultiplied.
    front = np.clip(front / np.maximum(alpha, 1e-6)[..., None], 0, 255)

    wpx = pw                                   # visible window size in pixels
    V, U = (np.mgrid[0:px, 0:px] + 0.5) / px * span + u0
    nx, ny = U * 2 - 1, V * 2 - 1

    # Phosphor: the thick mark burns towards white in its middle.
    core = blur(alpha, wpx * 0.05) * heat
    front = front + (255 - front) * smooth(0.55, 0.95, core)[..., None] * 0.55
    # Scanlines (fewer on small icons so they never shimmer), aperture grille when big.
    lines = min(112, wpx / 4.5)
    amp = 0.20 * smooth(30, 90, lines)
    scan = 1 - amp * (np.cos(V * lines * 2 * np.pi) * 0.5 + 0.5) ** 2
    texture = scan[..., None]
    if wpx >= 512:
        col = np.arange(px)[None, :] // 2
        grille = np.stack([0.96 + 0.12 * ((col + c) % 3 == 0) for c in range(3)], -1)
        texture = texture * grille
    back = back * texture
    front = front * texture

    # Bloom from what should glow (text, mark), and a faint halo off the bands.
    glow = (blur(glowsrc, wpx * 0.004) * 0.55 + blur(glowsrc, wpx * 0.014) * 0.45
            + blur(glowsrc, wpx * 0.045) * 0.30 + blur(glowsrc, wpx * 0.12) * 0.18)
    back = back + blur(back, wpx * 0.02) * 0.10 + blur(back, wpx * 0.08) * 0.08

    # The tube's convex edges fall off into shadow.
    edge = (1 - 0.6 * smooth(0.25, 1.7, np.abs(nx) ** 5 + np.abs(ny) ** 5))[..., None]
    back, front, glow = back * edge, front * edge, glow * edge

    # Glass: a top reflection with a curved lower edge, and a faint diagonal sheen.
    lower = 0.43 - 0.12 * nx ** 2
    top = smooth(lower + 0.008, lower - 0.008, V) * np.clip(1 - V / 0.5, 0, 1) ** 1.5 * smooth(1.0, 0.86, np.abs(nx))
    d = U + V * 0.55
    sheen = smooth(0.70, 0.78, d) * smooth(0.98, 0.86, d)
    light = (0.07 * top + 0.035 * sheen) * 255

    # Front layer: solid where the text is, plus glow and glass as light.
    add = glow + light[..., None]
    add_a = np.clip(add.max(-1) / 255, 0, 1)
    fa = alpha + (1 - alpha) * add_a
    fc = (front * alpha[..., None] + add * (1 - alpha[..., None])) / np.maximum(fa, 1e-6)[..., None]
    return back, fc, fa


def tone(a):
    """Soft shoulder instead of hard clipping, plus a little grain."""
    a = a + np.random.default_rng(7).normal(0, 1.0, a.shape[:2] + (1,))
    a = np.where(a > 205, 205 + 50 * np.tanh((a - 205) / 50), a)
    return np.clip(a, 0, 255)


def flat(scene, px, view=(0.0, 1.0)):
    back, fc, fa = render(scene, px, view)
    return Image.fromarray(tone(back * (1 - fa[..., None]) + fc * fa[..., None]).astype(np.uint8))


def layers(scene, px, view):
    back, fc, fa = render(scene, px, view)
    bg = Image.fromarray(tone(back).astype(np.uint8))
    fg = np.concatenate([tone(fc), np.clip(fa * 255, 0, 255)[..., None]], -1)
    return bg, Image.fromarray(fg.astype(np.uint8))


def grayscale(img):
    """Luminance, stretched so the brightest lettering reaches white."""
    g = np.asarray(img.convert("L"), float)
    g = np.clip(g / max(1.0, np.percentile(g, 99.5)) * 255, 0, 255)
    return Image.fromarray(g.astype(np.uint8)).convert("RGB")


def masked(img, shape):
    size = img.size[0]
    m = Image.new("L", (size * 4, size * 4))
    d = ImageDraw.Draw(m)
    if shape == "circle":
        d.ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1), int(size * 4 * shape), fill=255)
    out = img.convert("RGBA")
    out.putalpha(m.resize((size, size), Image.LANCZOS))
    return out


# ---------------------------------------------------------------- outputs

def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text)


def save(img, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, optimize=True)


def ios():
    base = os.path.join(ROOT, "ios/TekstiTVReactNativeApp/Images.xcassets/AppIcon.appiconset")
    save(flat(page("ios"), 1024), os.path.join(base, "AppIcon-1024.png"))
    dark = flat(page("ios", dark=True), 1024)
    save(dark, os.path.join(base, "AppIcon-1024-dark.png"))
    # Tinted icons are coloured by iOS from luminance: light lettering on black works best.
    save(grayscale(dark), os.path.join(base, "AppIcon-1024-tinted.png"))
    contents = {
        "images": [
            {"filename": "AppIcon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"},
            {"appearances": [{"appearance": "luminosity", "value": "dark"}],
             "filename": "AppIcon-1024-dark.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"},
            {"appearances": [{"appearance": "luminosity", "value": "tinted"}],
             "filename": "AppIcon-1024-tinted.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"},
        ],
        "info": {"author": "xcode", "version": 1},
    }
    write(os.path.join(base, "Contents.json"), json.dumps(contents, indent=2) + "\n")


# An adaptive icon layer is 108 dp; launchers show the middle 72 dp.
ANDROID_VIEW = (-18 / 72, 1 + 18 / 72)
DENSITIES = (("mdpi", 1), ("hdpi", 1.5), ("xhdpi", 2), ("xxhdpi", 3), ("xxxhdpi", 4))


def monochrome_xml():
    """Themed-icon layer: the t mark, centred, in the 24-unit 108 dp viewport."""
    h = 0.46                     # of the visible window
    ch = h / 8
    cw = ch * 1.5
    x0, y0 = 0.5 - 2.5 * cw, 0.5 - h / 2

    def unit(u):
        return 4 + u * 16

    paths = []
    for j, row in enumerate(T_MARK):
        i = 0
        while i < len(row):
            if row[i] == "#":
                k = i
                while k < len(row) and row[k] == "#":
                    k += 1
                a, b = unit(x0 + i * cw), unit(x0 + k * cw)
                c, d = unit(y0 + j * ch), unit(y0 + (j + 1) * ch)
                paths.append("M%.3f,%.3fH%.3fV%.3fH%.3fZ" % (a, c, b, d, a))
                i = k
            else:
                i += 1
    return (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<!-- Generated by scripts/generate-icons.py -->\n"
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
        '    android:width="108dp" android:height="108dp"\n'
        '    android:viewportWidth="24" android:viewportHeight="24">\n'
        '    <path android:fillColor="#FFFFFFFF" android:pathData="%s"/>\n'
        "</vector>\n" % "".join(paths)
    )


def android():
    res = os.path.join(ROOT, "android/app/src/main/res")
    scene = page("android")
    for folder, scale in DENSITIES:
        bg, fg = layers(scene, int(108 * scale), ANDROID_VIEW)
        save(bg, os.path.join(res, "mipmap-" + folder, "ic_launcher_background.png"))
        save(fg, os.path.join(res, "mipmap-" + folder, "ic_launcher_foreground.png"))
    write(os.path.join(res, "drawable/ic_launcher_monochrome_layer.xml"), monochrome_xml())
    old = os.path.join(res, "drawable/ic_launcher_background_layer.xml")
    if os.path.exists(old):
        os.remove(old)
    adaptive = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@mipmap/ic_launcher_background"/>\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
        '    <monochrome android:drawable="@drawable/ic_launcher_monochrome_layer"/>\n'
        "</adaptive-icon>\n"
    )
    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        write(os.path.join(res, "mipmap-anydpi-v26", name), adaptive)
    # Legacy icons for Android < 8: the visible window, pre-shaped.
    for folder, px in (("ldpi", 36), ("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
        img = flat(scene, px)
        d = os.path.join(res, "mipmap-" + folder)
        save(masked(img, 0.16), os.path.join(d, "ic_launcher.png"))
        save(masked(img, "circle"), os.path.join(d, "ic_launcher_round.png"))
    save(flat(page("ios"), 512), os.path.join(res, "playstore-icon.png"))


def preview(out):
    os.makedirs(out, exist_ok=True)
    flat(page("ios"), 1024).save(os.path.join(out, "ios.png"))
    bg, fg = layers(page("android"), 432, ANDROID_VIEW)
    bg.save(os.path.join(out, "android-back.png"))
    fg.save(os.path.join(out, "android-front.png"))
    Image.alpha_composite(bg.convert("RGBA"), fg).save(os.path.join(out, "android-layer.png"))


if __name__ == "__main__":
    args = sys.argv[1:] or ["ios", "android"]
    if args[0] == "preview":
        preview(args[1] if len(args) > 1 else "icon-preview")
    else:
        if "ios" in args:
            ios()
        if "android" in args:
            android()
    print("done")
