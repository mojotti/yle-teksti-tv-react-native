#!/usr/bin/env python3
"""Generate the app icon for iOS and Android from one rectangle-based design.

The icon: a yellow "T" built from teletext mosaic blocks on teletext blue,
a cyan rule, and the four colour keys (red, green, yellow, cyan) on a black
strip, the same keys the app uses for page and subpage navigation.
Everything is drawn on a 24-unit grid.

Usage: python3 scripts/generate-icons.py   (run from the repo root)
"""
import json
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BLUE = (0x2F, 0x45, 0xFF)
CYAN = (0x39, 0xE3, 0xFF)
GREEN = (0x2F, 0xE0, 0x6A)
YELLOW = (0xFF, 0xE2, 0x3D)
WHITE = (0xFF, 0xFF, 0xFF)
BLACK = (0x00, 0x00, 0x00)

RED = (0xFF, 0x3B, 0x3B)

STRIP_TOP = 16.4


def _t_blocks(cell=2.7, gap=0.34, top=2.2):
    """The mosaic "T": 6 x 2 blocks across, a 2 x 3 stem."""
    out = []
    x0 = 12 - 3 * cell
    for r in range(2):
        for c in range(6):
            out.append((x0 + c * cell + gap / 2, top + r * cell + gap / 2, cell - gap, cell - gap, YELLOW))
    for r in range(3):
        for c in range(2):
            out.append((12 - cell + c * cell + gap / 2, top + (2 + r) * cell + gap / 2, cell - gap, cell - gap, YELLOW))
    return out


def _keys(y=18.7, h=2.0, x0=3.4, w=3.7, gap=0.8):
    return [(x0 + i * (w + gap), y, w, h, c) for i, c in enumerate((RED, GREEN, YELLOW, CYAN))]


# (x, y, w, h, colour), painted in order.
BANDS_IOS = [
    (0, 0, 24, 24, BLUE),
    (0, STRIP_TOP, 24, 24 - STRIP_TOP, BLACK),
    (0, STRIP_TOP, 24, 0.7, CYAN),
]
MARKS_IOS = _t_blocks() + _keys()

# Android adaptive icons: launchers show the middle two-thirds of the
# layers and mask it to a circle, squircle etc. Everything is scaled
# towards the centre so the marks stay inside the circle; the bands are
# then stretched back out to the edges.
ANDROID_SCALE = 0.62


def _scale_y(y):
    return 12 + (y - 12) * ANDROID_SCALE


def android_bands():
    out = []
    for x, y, w, h, c in BANDS_IOS:
        top, bottom = _scale_y(y), _scale_y(y + h)
        if y <= 0:
            top = 0
        if y + h >= 24:
            bottom = 24
        out.append((0, top, 24, bottom - top, c))
    return out


def android_marks():
    return [
        (12 + (x - 12) * ANDROID_SCALE, _scale_y(y), w * ANDROID_SCALE, h * ANDROID_SCALE, c)
        for x, y, w, h, c in MARKS_IOS
    ]


def rasterize(rects, size, ss=4, circle=False):
    """Paint rects into an RGBA image with ss x ss supersampling."""
    big = size * ss
    unit = big / 24.0
    buf = [[BLACK + (255,)] * big for _ in range(big)]
    for x, y, w, h, c in rects:
        x0, y0 = int(round(x * unit)), int(round(y * unit))
        x1, y1 = int(round((x + w) * unit)), int(round((y + h) * unit))
        row = c + (255,)
        for yy in range(max(0, y0), min(big, y1)):
            r = buf[yy]
            for xx in range(max(0, x0), min(big, x1)):
                r[xx] = row
    if circle:
        cx = cy = big / 2.0
        rad2 = (big / 2.0) ** 2
        for yy in range(big):
            for xx in range(big):
                if (xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 > rad2:
                    buf[yy][xx] = (0, 0, 0, 0)
    out = []
    n = ss * ss
    for y in range(size):
        line = []
        for x in range(size):
            acc = [0, 0, 0, 0]
            for dy in range(ss):
                r = buf[y * ss + dy]
                for dx in range(ss):
                    p = r[x * ss + dx]
                    a = p[3]
                    acc[0] += p[0] * a
                    acc[1] += p[1] * a
                    acc[2] += p[2] * a
                    acc[3] += a
            a = acc[3]
            if a == 0:
                line.append((0, 0, 0, 0))
            else:
                line.append((acc[0] // a, acc[1] // a, acc[2] // a, a // n))
        out.append(line)
    return out


def grayscale(img):
    return [[(int(0.3 * r + 0.59 * g + 0.11 * b),) * 3 + (a,) for r, g, b, a in row] for row in img]


def write_png(path, img, alpha=True):
    h, w = len(img), len(img[0])
    raw = bytearray()
    for row in img:
        raw.append(0)
        for p in row:
            raw.extend(p if alpha else p[:3])
    color_type = 6 if alpha else 2

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, color_type, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)


def hexc(c):
    return "#FF%02X%02X%02X" % c


def vector(rects, path, color_override=None):
    paths = "\n".join(
        '    <path android:fillColor="%s" android:pathData="M%.3f,%.3fh%.3fv%.3fh%.3fz"/>'
        % (color_override or hexc(c), x, y, w, h, -w)
        for x, y, w, h, c in rects
    )
    xml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<!-- Generated by scripts/generate-icons.py -->\n"
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
        '    android:width="108dp" android:height="108dp"\n'
        '    android:viewportWidth="24" android:viewportHeight="24">\n'
        + paths
        + "\n</vector>\n"
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(xml)


def ios():
    base = os.path.join(ROOT, "ios/TekstiTVReactNativeApp/Images.xcassets/AppIcon.appiconset")
    img = rasterize(BANDS_IOS + MARKS_IOS, 1024, ss=2)
    write_png(os.path.join(base, "AppIcon-1024.png"), img, alpha=False)
    write_png(os.path.join(base, "AppIcon-1024-tinted.png"), grayscale(img), alpha=False)
    contents = {
        "images": [
            {"filename": "AppIcon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"},
            {
                "appearances": [{"appearance": "luminosity", "value": "dark"}],
                "filename": "AppIcon-1024.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024",
            },
            {
                "appearances": [{"appearance": "luminosity", "value": "tinted"}],
                "filename": "AppIcon-1024-tinted.png",
                "idiom": "universal",
                "platform": "ios",
                "size": "1024x1024",
            },
        ],
        "info": {"author": "xcode", "version": 1},
    }
    with open(os.path.join(base, "Contents.json"), "w") as f:
        json.dump(contents, f, indent=2)
        f.write("\n")


def android():
    res = os.path.join(ROOT, "android/app/src/main/res")
    marks = android_marks()
    vector(android_bands(), os.path.join(res, "drawable/ic_launcher_background_layer.xml"))
    vector(marks, os.path.join(res, "drawable/ic_launcher_foreground_layer.xml"))
    vector(marks, os.path.join(res, "drawable/ic_launcher_monochrome_layer.xml"), color_override="#FFFFFFFF")
    adaptive = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@drawable/ic_launcher_background_layer"/>\n'
        '    <foreground android:drawable="@drawable/ic_launcher_foreground_layer"/>\n'
        '    <monochrome android:drawable="@drawable/ic_launcher_monochrome_layer"/>\n'
        "</adaptive-icon>\n"
    )
    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        with open(os.path.join(res, "mipmap-anydpi-v26", name), "w") as f:
            f.write(adaptive)
    # Legacy bitmaps for Android < 8: the visible middle of the adaptive
    # art (units 4..20) scaled up, so they match what launchers show.
    full = [
        ((x - 4) * 1.5, (y - 4) * 1.5, w * 1.5, h * 1.5, c)
        for x, y, w, h, c in android_bands() + marks
    ]
    for folder, px in (("ldpi", 36), ("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)):
        d = os.path.join(res, "mipmap-" + folder)
        write_png(os.path.join(d, "ic_launcher.png"), rasterize(full, px))
        write_png(os.path.join(d, "ic_launcher_round.png"), rasterize(full, px, circle=True))
    write_png(os.path.join(res, "playstore-icon.png"), rasterize(BANDS_IOS + MARKS_IOS, 512, ss=2), alpha=False)


if __name__ == "__main__":
    ios()
    android()
    print("icons written")
