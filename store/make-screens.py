#!/usr/bin/env python3
"""Builds the store screenshots and the Play feature graphic.

Raw screenshots go in store/raw/<platform>/ (1-page.png, 2-keypad.png ...);
the finished images are written to store/out/<platform>/.

Usage (from the repo root; needs Pillow and numpy):
    python3 store/make-screens.py
"""
import json
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
INTER = os.path.join(HERE, "fonts", "Inter.ttf")
with open(os.path.join(ROOT, "scripts", "teletext-glyphs.json")) as f:
    GLYPHS = {k: np.array([[c == "#" for c in row] for row in v]) for k, v in json.load(f).items()}

BG = (6, 7, 12)
BLUE = (22, 42, 250)
GREEN = (36, 236, 70)
YELLOW = (255, 232, 36)
KEYS = ((255, 50, 60), (40, 235, 80), (255, 230, 40), (40, 228, 255))

# (raw file, page badge, headline, subline[, phone scale]). Headlines break
# where "\n" is. The scale shrinks the phone so more of the screen shows.
SLIDES = [
    ("1-page", "200", "Tuttu Teksti-TV.\nUusi ilme.", "Uutiset, tulokset ja sää – nopeasti ja ilman mainoksia."),
    ("2-keypad", "235", "Sivulle kolmella\nnapautuksella", "Iso numeronäppäimistö ja suosikit aina käden ulottuvilla."),
    ("3-keys", "400", "Värinäppäimet kuin\nkaukosäätimessä", "Selaa sivuja ja alasivuja napauttamalla tai pyyhkäisemällä.", 0.80),
    ("4-feed", "228", "Kaikki suosikit\nyhdellä silmäyksellä", "Tulokset, sää ja uutiset allekkain samassa näkymässä."),
    ("5-widget", "200", "Teksti-TV\nkotinäytölle", "Widget näyttää valitsemasi sivun ilman sovelluksen avaamista."),
    ("6-themes", "575", "Juuri sinun\nnäköisesi", "Kaksi teemaa, taustan hehku ja neljä sivukokoa."),
]

# Output sizes per store. App Store 6.9" iPhone and 13" iPad; Play phone.
TARGETS = {
    "android": dict(size=(1080, 1920), raw="android", phone=0.80, top=0.255, corner=0.115),
    "iphone": dict(size=(1320, 2868), raw="ios", phone=0.80, top=0.235, corner=0.155),
    "ipad": dict(size=(2064, 2752), raw="ipad", phone=0.74, top=0.235, corner=0.045),
}


def font(size, weight):
    f = ImageFont.truetype(INTER, int(size))
    try:
        f.set_variation_by_axes([min(32, max(14, size / 3)), weight])
    except Exception:
        pass
    return f


def glow_background(w, h):
    """Near-black with the app's ambient glow: blue from the top, green from the bottom."""
    y, x = np.mgrid[0:h, 0:w] / max(w, h)
    img = np.zeros((h, w, 3)) + np.array(BG, float)
    for (cx, cy, r, col, k) in ((0.15 * w / max(w, h), -0.05, 0.75, BLUE, 0.55),
                                (0.95 * w / max(w, h), 0.20, 0.45, (40, 228, 255), 0.18),
                                (0.30 * w / max(w, h), h / max(w, h) + 0.05, 0.70, GREEN, 0.30)):
        d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / r
        img += np.array(col, float) * k * np.clip(1 - d, 0, 1)[..., None] ** 2.2
    # Faint scanlines.
    lines = (np.arange(h) // 3) % 2 == 0
    img *= np.where(lines, 1.0, 0.94)[:, None, None]
    img += np.random.default_rng(1).normal(0, 1.4, (h, w, 1))
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def teletext(draw_img, text, x, y, cell, colour, tall=1):
    """Draws text with Yle's teletext glyphs, cells `cell` px wide."""
    for i, c in enumerate(text):
        if c == " ":
            continue
        m = Image.fromarray((GLYPHS[c] * 255).astype(np.uint8)).resize((int(cell), int(cell * tall)), Image.NEAREST)
        draw_img.paste(colour, (int(x + i * cell), int(y)), m)
    return x + len(text) * cell


def badge(img, page, x, y, h):
    """A little teletext header chip: black, blue strip, yellow page number."""
    cell = h * 0.62
    w = cell * (len(page) + 2.2)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((x, y, x + w, y + h), h * 0.22, fill=(0, 0, 0))
    d.rectangle((x + h * 0.18, y + h * 0.78, x + w - h * 0.18, y + h * 0.84), fill=BLUE)
    teletext(img, "P" + page, x + cell * 0.55, y + (h - cell) / 2 - h * 0.06, cell, YELLOW)
    return x + w


def wrap(text, f, width):
    """Breaks text into lines no wider than width."""
    lines, cur = [], ""
    for word in text.split():
        trial = (cur + " " + word).strip()
        if f.getlength(trial) <= width or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    return lines + [cur]


def key_bar(img, x, y, w, h):
    d = ImageDraw.Draw(img)
    gap = h * 0.9
    kw = (w - 3 * gap) / 4
    for i, c in enumerate(KEYS):
        d.rounded_rectangle((x + i * (kw + gap), y, x + i * (kw + gap) + kw, y + h), h / 2, fill=c)


def clean_android(shot):
    """Paints out the stray settings icon the emulator leaves in the status bar."""
    s = shot.copy()
    w = s.size[0]
    if w == 1080:
        col = s.getpixel((260, 30))
        ImageDraw.Draw(s).rectangle((125, 5, 190, 60), fill=col)
    return s


def phone(shot, width, corner, bezel_frac=0.022):
    """The screenshot in a slim dark frame with a soft rim light."""
    sw = int(width * (1 - 2 * bezel_frac))
    sh = int(shot.size[1] * sw / shot.size[0])
    b = int(width * bezel_frac)
    W, H = sw + 2 * b, sh + 2 * b
    out = Image.new("RGBA", (W, H))
    d = ImageDraw.Draw(out)
    R = int(W * corner)
    d.rounded_rectangle((0, 0, W - 1, H - 1), R, fill=(28, 30, 38, 255))
    d.rounded_rectangle((1, 1, W - 2, H - 2), R, outline=(90, 94, 110, 255), width=max(2, b // 6))
    scr = shot.convert("RGB").resize((sw, sh), Image.LANCZOS)
    m = Image.new("L", (sw, sh))
    ImageDraw.Draw(m).rounded_rectangle((0, 0, sw - 1, sh - 1), max(1, R - b), fill=255)
    out.paste(scr, (b, b), m)
    return out


def slide(target, raw, page, headline, sub, scale=1.0):
    t = TARGETS[target]
    W, H = t["size"]
    img = glow_background(W, H).convert("RGBA")
    margin = W * 0.085
    # Badge, headline, subline.
    bh = W * 0.052
    y = H * 0.045
    badge(img, page, margin, y, bh)
    key_bar(img, W - margin - W * 0.22, y + bh * 0.36, W * 0.22, bh * 0.28)
    y += bh * 1.75
    hs = W * (0.082 if target != "ipad" else 0.062)
    d = ImageDraw.Draw(img)
    hf = font(hs, 800)
    for line in headline.split("\n"):
        d.text((margin, y), line, font=hf, fill=(255, 255, 255))
        y += hs * 1.12
    ss = W * (0.038 if target != "ipad" else 0.027)
    sf = font(ss, 500)
    y += hs * 0.18
    for line in wrap(sub, sf, W - 2 * margin):
        d.text((margin, y), line, font=sf, fill=(178, 190, 220))
        y += ss * 1.3
    # Phone, running off the bottom edge.
    pw = int(W * t["phone"] * scale)
    ph = phone(raw, pw, t["corner"])
    px = (W - pw) // 2
    py = int(y + W * 0.07)
    # Glow behind the phone from its own screen colours, like the app's ambient glow.
    halo = Image.new("RGBA", (W, H))
    halo.paste(ph.resize((ph.size[0], ph.size[1])), (px, py), ph)
    halo = halo.filter(ImageFilter.GaussianBlur(W * 0.06))
    a = np.asarray(halo).astype(float)
    a[..., 3] *= 0.55
    img = Image.alpha_composite(img, Image.fromarray(a.astype(np.uint8)))
    shadow = Image.new("RGBA", (W, H))
    ImageDraw.Draw(shadow).rounded_rectangle((px, py + W * 0.01, px + pw, py + ph.size[1]), int(pw * t["corner"]), fill=(0, 0, 0, 170))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(W * 0.02)))
    img.alpha_composite(ph, (px, py)) if py + ph.size[1] <= H else img.paste(ph, (px, py), ph)
    return img.convert("RGB")


def feature_graphic(icon, shot):
    """Play feature graphic, 1024 x 500."""
    W, H = 1024, 500
    img = glow_background(W, H).convert("RGBA")
    ic = icon.convert("RGB").resize((150, 150), Image.LANCZOS)
    m = Image.new("L", (600, 600))
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 599, 599), 135, fill=255)
    img.paste(ic, (64, 84), m.resize((150, 150), Image.LANCZOS))
    d = ImageDraw.Draw(img)
    d.text((64, 262), "Teksti-TV", font=font(78, 800), fill=(255, 255, 255))
    d.text((66, 356), "Uutiset, tulokset ja sää – nopeasti.", font=font(28, 500), fill=(178, 190, 220))
    key_bar(img, 66, 418, 300, 12)
    ph = phone(shot, 330, 0.115)
    img.paste(ph, (W - 330 - 70, 40), ph)
    return img.convert("RGB")


def main():
    for target, t in TARGETS.items():
        src = os.path.join(HERE, "raw", t["raw"])
        if not os.path.isdir(src):
            continue
        out = os.path.join(HERE, "out", target)
        os.makedirs(out, exist_ok=True)
        for name, page, headline, sub, *rest in SLIDES:
            p = os.path.join(src, name + ".png")
            if not os.path.exists(p):
                continue
            raw = Image.open(p).convert("RGB")
            if t["raw"] == "android":
                raw = clean_android(raw)
            slide(target, raw, page, headline, sub, *rest).save(os.path.join(out, name + ".png"), optimize=True)
            print("wrote", target, name)
    shot = os.path.join(HERE, "raw", "android", "1-page.png")
    if os.path.exists(shot):
        icon = Image.open(os.path.join(ROOT, "android/app/src/main/res/playstore-icon.png"))
        os.makedirs(os.path.join(HERE, "out", "android"), exist_ok=True)
        feature_graphic(icon, clean_android(Image.open(shot))).save(
            os.path.join(HERE, "out", "android", "feature-graphic.png"), optimize=True)
        print("wrote feature graphic")


if __name__ == "__main__":
    main()
