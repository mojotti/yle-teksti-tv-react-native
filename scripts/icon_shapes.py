"""Tiny supersampled rasterizer for icon shapes on a 24-unit grid."""
import math, struct, zlib

def rrect(x, y, w, h, r, c): return ("rrect", x, y, w, h, r, c)
def circle(cx, cy, r, c): return ("circle", cx, cy, r, c)
def line(x1, y1, x2, y2, t, c): return ("line", x1, y1, x2, y2, t, c)
def vgrad(top, bottom): return ("vgrad", top, bottom)
def grrect(x, y, w, h, r, top, bottom): return ("grrect", x, y, w, h, r, (top, bottom))

def _inside(shape, x, y):
    k = shape[0]
    if k in ("rrect", "grrect"):
        _, sx, sy, w, h, r, _c = shape
        if x < sx or y < sy or x > sx + w or y > sy + h: return False
        cx = min(max(x, sx + r), sx + w - r); cy = min(max(y, sy + r), sy + h - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    if k == "circle":
        _, cx, cy, r, _c = shape
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    if k == "line":
        _, x1, y1, x2, y2, t, _c = shape
        dx, dy = x2 - x1, y2 - y1
        L2 = dx * dx + dy * dy
        u = max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / L2))
        px, py = x1 + u * dx, y1 + u * dy
        return (x - px) ** 2 + (y - py) ** 2 <= (t / 2) ** 2
    return False

def _bbox(shape):
    k = shape[0]
    if k in ("rrect", "grrect"): return shape[1], shape[2], shape[1] + shape[3], shape[2] + shape[4]
    if k == "circle": return shape[1] - shape[3], shape[2] - shape[3], shape[1] + shape[3], shape[2] + shape[3]
    if k == "line":
        t = shape[5] / 2
        return min(shape[1], shape[3]) - t, min(shape[2], shape[4]) - t, max(shape[1], shape[3]) + t, max(shape[2], shape[4]) + t

def render(shapes, size, ss=3, mask_circle=False):
    big = size * ss
    u = big / 24.0
    buf = [[(0, 0, 0)] * big for _ in range(big)]
    for s in shapes:
        if s[0] == "vgrad":
            t, b = s[1], s[2]
            for yy in range(big):
                f = yy / (big - 1)
                col = tuple(int(t[i] + (b[i] - t[i]) * f) for i in range(3))
                buf[yy] = [col] * big
            continue
        x0, y0, x1, y1 = _bbox(s)
        c = s[-1]
        grad = s[0] == "grrect"
        for yy in range(max(0, int(y0 * u)), min(big, int(y1 * u) + 2)):
            row = buf[yy]
            gy = (yy + 0.5) / u
            for xx in range(max(0, int(x0 * u)), min(big, int(x1 * u) + 2)):
                if _inside(s, (xx + 0.5) / u, gy):
                    if grad:
                        f = min(1, max(0, (gy - s[2]) / s[4]))
                        n = max(len(c[0]), len(c[1]))
                        a0 = c[0] + (255,) * (4 - len(c[0])); a1 = c[1] + (255,) * (4 - len(c[1]))
                        col = tuple(a0[i] + (a1[i] - a0[i]) * f for i in range(4))
                    else:
                        col = c if len(c) == 4 else c + (255,)
                    al = col[3] / 255
                    if al >= 1:
                        row[xx] = (int(col[0]), int(col[1]), int(col[2]))
                    else:
                        o = row[xx]
                        row[xx] = tuple(int(o[i] * (1 - al) + col[i] * al) for i in range(3))
    out = []
    n = ss * ss
    for y in range(size):
        line_ = []
        for x in range(size):
            r = g = b = 0; a = 0
            for dy in range(ss):
                row = buf[y * ss + dy]
                for dx in range(ss):
                    X = x * ss + dx; Y = y * ss + dy
                    if mask_circle and ((X + .5) / big - .5) ** 2 + ((Y + .5) / big - .5) ** 2 > .25:
                        continue
                    p = row[X]; r += p[0]; g += p[1]; b += p[2]; a += 1
            line_.append((r // a, g // a, b // a, 255 * a // n) if a else (0, 0, 0, 0))
        out.append(line_)
    return out

def write_png(path, img, alpha=True):
    h, w = len(img), len(img[0])
    raw = bytearray()
    for row in img:
        raw.append(0)
        for p in row: raw.extend(p if alpha else p[:3])
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6 if alpha else 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
    open(path, "wb").write(png)
