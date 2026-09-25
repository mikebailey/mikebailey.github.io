"""Compose wallpaper backgrounds for the card page from public-domain prints.

Sources are plates downloaded from pdimagearchive.org (Public Domain Review's
archive); prints/sources.json records id, artist, title, year and the archive's
rights label for each file. Two kinds of wall are built:

* masonry  – plates set in a staggered column grid on a paper ground, wrapped
             on a torus so the JPEG tiles seamlessly with `background-repeat`.
* hero     – one large plate washed toward the paper colour, used with
             `background-size: cover`.

Each wall applies ONE tone treatment to every plate so mixed sources read as a
single printed paper rather than a scrapbook.
"""
from __future__ import annotations
import json, random
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps, ImageDraw

HERE = Path(__file__).resolve().parent
SRC = HERE / 'prints' / 'src'
OUT = HERE / 'prints' / 'walls'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = {s['id'][:8]: s for s in json.loads((HERE / 'prints' / 'sources.json').read_text())}


def load(pid: str) -> Image.Image:
    f = next(SRC.glob(pid + '.*'))
    return Image.open(f).convert('RGB')


def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# ---- tone treatments -------------------------------------------------------
def duotone(im, dark, light, contrast=0.9):
    """Grayscale, then map black→dark and white→light. Gives one ink on one paper."""
    g = ImageOps.autocontrast(im.convert('L'), cutoff=1)
    g = ImageEnhance.Contrast(g).enhance(contrast)
    return ImageOps.colorize(g, hexrgb(dark), hexrgb(light))


def wash(im, paper, amount, sat=1.0, bright=1.0):
    """Blend toward the paper colour and optionally desaturate/dim: lowers contrast under the panel."""
    if sat != 1.0:
        im = ImageEnhance.Color(im).enhance(sat)
    if bright != 1.0:
        im = ImageEnhance.Brightness(im).enhance(bright)
    return Image.blend(im, Image.new('RGB', im.size, hexrgb(paper)), amount)


def trim_mount(im, thresh=110):
    """Crop a plate to its dark image area, dropping the light page mount around it."""
    g = im.convert('L').point(lambda v: 255 if v < thresh else 0)
    box = g.getbbox()
    return im.crop(box) if box else im


# ---- masonry ---------------------------------------------------------------
def masonry(plates, tone, ground, hairline, size=1800, ncols=3, gutter=22, seed=7):
    """Staggered columns of plates at equal width. Each column is scaled so its
    plates plus gutters sum exactly to the canvas height, then drawn with wrap so
    the tile is seamless. Small crops/pads absorb the rounding."""
    rng = random.Random(seed)
    W = H = size
    cw = (W - ncols * gutter) // ncols
    canvas = Image.new('RGB', (W, H), hexrgb(ground))
    deck = list(plates)
    rng.shuffle(deck)
    di = 0
    for ci in range(ncols):
        # take plates from the cycling deck until the column is nearly full, so the
        # fit-to-height scale stays within a few percent and crops are small
        ims, nat = [], []
        while sum(nat) + len(ims) * gutter < H * 0.96:
            im = tone(load(deck[di % len(deck)])); di += 1
            ims.append(im); nat.append(round(im.height * cw / im.width))
        s = (H - len(ims) * gutter) / sum(nat)
        heights = [round(h * s) for h in nat]
        heights[-1] += (H - len(ims) * gutter) - sum(heights)  # rounding
        x = gutter // 2 + ci * (cw + gutter)
        y = rng.randrange(H)  # stagger start so rows never line up
        for im, h in zip(ims, heights):
            im = im.resize((cw, round(im.height * cw / im.width)), Image.LANCZOS)
            if im.height >= h:  # crop margins evenly
                top = (im.height - h) // 2
                im = im.crop((0, top, cw, top + h))
            else:  # pad with the plate's own paper (edge colour)
                pad = Image.new('RGB', (cw, h), im.getpixel((2, 2)))
                pad.paste(im, (0, (h - im.height) // 2))
                im = pad
            ImageDraw.Draw(im).rectangle((0, 0, cw - 1, h - 1), outline=hexrgb(hairline))
            for dy in (0, -H, H):  # wrap vertically
                if -h < y + dy < H:
                    canvas.paste(im, (x, y + dy))
            y = (y + h + gutter) % H
    return canvas


def hero(pid, treat, width=1800, box=None):
    im = load(pid)
    if box:  # fractional (l, t, r, b) crop of the source, e.g. to drop a title and legend
        W, H = im.size
        im = im.crop((round(box[0] * W), round(box[1] * H), round(box[2] * W), round(box[3] * H)))
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    return treat(im)


# ---- the walls -------------------------------------------------------------
RADIOLARIA = ['fa6510fc', 'e8a07290', 'cc4c22dd', 'c97bfef2', 'c222d4f5', 'b46b8d91']
DROPS = ['d5d27d64', 'ced34e3b', '74a825c1', '6d289368']
DIATOMS = ['fba3cecc', 'f1b64913', 'eb92b429', 'e3eb0fb5']
HITCHCOCK = ['f240eeb4', 'ef504df0', 'e8366e50', 'e1d585e7', 'e01a0adb', 'dafb8b9a']
TROUVELOT = ['faed5931', 'e932689c', 'e08f7f90', 'd69f353c', 'cdcdb749', 'aefb5005']
BOOTH = ['booth-05', 'booth-06', 'booth-07', 'booth-09']
FISK = ['ce076845', 'c7b54440', 'b9e026ce', '8f3385a9', '7d27e183', '3b875be8']

WALLS = [
    dict(slug='study-wall', name='Study wall', mode='repeat', css_size='900px', bg='#e6dcc6', dark=False,
         note='Haeckel radiolaria, Catlow’s water drops and Schmidt’s diatoms as one sepia ink on kraft. Mixed sources, one tone.',
         plates=RADIOLARIA + DROPS + DIATOMS + ['a210a753'],
         make=lambda: masonry(RADIOLARIA + DROPS + DIATOMS + ['a210a753'],
                              lambda im: duotone(im, '#4a3a2a', '#efe6d3', 0.85), '#e6dcc6', '#b9a88a', ncols=3, gutter=22)),
    dict(slug='linen-charts', name='Linen charts', mode='repeat', css_size='1000px', bg='#cbbfa4', dark=False,
         note='Orra White Hitchcock’s 1828 geology classroom charts, natural colour, butted like a patchwork on linen.',
         plates=HITCHCOCK,
         make=lambda: masonry(HITCHCOCK, lambda im: wash(im, '#d9cdb4', .12, sat=.9), '#cbbfa4', '#9d8f74', ncols=2, gutter=16, seed=3)),
    dict(slug='observatory', name='Observatory', mode='repeat', css_size='900px', bg='#14161c', dark=True,
         note='Trouvelot’s 1882 astronomical pastels on near-black. The ivory panel and coral button pick up Mars.',
         plates=TROUVELOT,
         make=lambda: masonry(TROUVELOT, lambda im: wash(trim_mount(im), '#14161c', .1, sat=.95, bright=.92), '#14161c', '#3a3d47', ncols=3, gutter=18, seed=5)),
    dict(slug='meander', name='Meander', mode='repeat', css_size='1000px', bg='#e3ddcb', dark=False,
         note='Harold Fisk’s 1944 Mississippi meander maps in three columns. Already one palette, so only a light desaturation.',
         plates=FISK,
         make=lambda: masonry(FISK, lambda im: wash(im, '#ebe6d6', .08, sat=.82), '#e3ddcb', '#b3ac97', ncols=3, gutter=10, seed=11)),
    dict(slug='cartographer', name='Cartographer', mode='cover', css_size='cover', bg='#e9dfcb', dark=False,
         note='One plate, full bleed: the 1867 Sanborn map of Boston washed toward the paper so the panel stays legible.',
         plates=['c5bd1d91'],
         make=lambda: hero('c5bd1d91', lambda im: wash(im, '#efe7d6', .3, sat=.85, bright=1.03), 2000)),
    dict(slug='paradiso', name='Paradiso', mode='cover', css_size='cover', bg='#ece4d2', dark=False,
         note='Caetani’s 1855 diagram of Dante’s Paradise, full bleed; the card sits inside the rings.',
         plates=['1a20b8c8'],
         make=lambda: hero('1a20b8c8', lambda im: wash(im, '#efe8d8', .22, sat=.9), 1800)),
    dict(slug='booth', name='Booth', mode='cover', css_size='cover', bg='#ebe3d1', dark=False,
         note='Booth’s 1898–9 poverty map, sheet 7: Kensington through Belgravia to Pimlico, south of Hyde Park. Coloured streets edge to edge.',
         plates=['booth-07'],
         make=lambda: hero('booth-07', lambda im: wash(im, '#efe7d6', .22, sat=.9), 2400, box=(.10, .50, .80, .85))),
    dict(slug='booth-north', name='Booth north', mode='cover', css_size='cover', bg='#ebe3d1', dark=False,
         note='Same sheet, the band north of the park: Notting Hill, Bayswater, Paddington and Marylebone. More red and blue, less gold.',
         plates=['booth-07'],
         make=lambda: hero('booth-07', lambda im: wash(im, '#efe7d6', .22, sat=.9), 2400, box=(.06, .065, .74, .32))),
]


def credits(pids):
    seen = []
    for p in pids:
        s = SOURCES[p]
        key = (s['artist'], s['work'] or s['title'], s['year'])
        if key not in seen:
            seen.append(key)
    return '; '.join(f"{a}, {w} ({y})" for a, w, y in seen)


def build():
    manifest = []
    for w in WALLS:
        im = w['make']()
        out = OUT / f"{w['slug']}.jpg"
        im.save(out, 'JPEG', quality=70, optimize=True, progressive=True)
        manifest.append({k: w[k] for k in ('slug', 'name', 'note', 'mode', 'css_size', 'bg', 'dark')}
                        | {'credits': credits(w['plates']), 'bytes': out.stat().st_size, 'size': im.size})
        print(f"{w['slug']:14} {im.size} {out.stat().st_size // 1024} KB")
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    build()
