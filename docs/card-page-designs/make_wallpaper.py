"""Second generation of the card-page florals: botanical wallpaper rather than
scattered clip-art. Large palm fronds, banana and monstera leaves, ferns and a
few layered blooms, drawn as SVG with tonal gradients, veins, three depth
layers and a paper grain, in the spirit of hand-painted jungle papers.

    python docs/card-page-designs/make_wallpaper.py

Writes patterns/generated/<slug>.svg and manifest.json for build_designs.py.
"""
import json, math, random
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'patterns' / 'generated'
TILE = 900


def blend(a, b, t):
    ca = [int(a[i:i+2], 16) for i in (1, 3, 5)]; cb = [int(b[i:i+2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(ca, cb))


def qbez(p0, c, p1, t):
    return ((1-t)**2*p0[0] + 2*(1-t)*t*c[0] + t*t*p1[0], (1-t)**2*p0[1] + 2*(1-t)*t*c[1] + t*t*p1[1])


def qtan(p0, c, p1, t):
    return (2*(1-t)*(c[0]-p0[0]) + 2*t*(p1[0]-c[0]), 2*(1-t)*(c[1]-p0[1]) + 2*t*(p1[1]-c[1]))


# ---- motifs. Each takes a `tone` dict: fill (gradient url), edge, vein. ----
def leaflet(l, w, tone, curve=0.0, sw=0.7):
    """Narrow tapering leaflet with a light edge line."""
    return (f'<path d="M0 0 Q{w+curve:.1f} {-l*.45:.1f} {curve*1.4:.1f} {-l:.1f} Q{-w+curve:.1f} {-l*.45:.1f} 0 0Z" '
            f'fill="{tone["fill"]}" stroke="{tone["edge"]}" stroke-width="{sw}"/>')


def palm_frond(L, tone, rng):
    """Feather palm: a curving rachis with long leaflets that shorten toward the tip."""
    c = (rng.uniform(-L*.4, L*.4), -L*.5); p0 = (0, 0); p1 = (rng.uniform(-L*.15, L*.15), -L)
    n = rng.randint(18, 26)
    s = ''
    for i in range(n):
        t = (i + .5) / n
        x, y = qbez(p0, c, p1, t); tx, ty = qtan(p0, c, p1, t)
        base = math.degrees(math.atan2(tx, -ty))  # rachis direction, 0 = up
        prof = math.sin(math.pi * min(1, t * 1.15)) ** .6
        l = L * (.28 + .22 * prof) * (1 - .55 * max(0, t - .7) / .3)
        for side in (1, -1):
            ang = base + side * (52 + 25 * t) + rng.uniform(-4, 4)
            s += f'<g transform="translate({x:.1f} {y:.1f}) rotate({ang:.1f})">{leaflet(l, l*.09, tone, curve=side*l*.08)}</g>'
    s += f'<path d="M0 0 Q{c[0]:.1f} {c[1]:.1f} {p1[0]:.1f} {p1[1]:.1f}" stroke="{tone["vein"]}" stroke-width="{L*.012:.1f}" fill="none" stroke-linecap="round"/>'
    return s


def banana_leaf(L, tone, rng):
    """Broad pointed leaf with a midrib and many parallel side veins, a couple of tears."""
    W = L * rng.uniform(.30, .38)
    bulge = rng.uniform(.35, .5)
    d = (f'M0 0 C{W:.1f} {-L*bulge*.6:.1f} {W*1.05:.1f} {-L*.7:.1f} 0 {-L:.1f} '
         f'C{-W*1.05:.1f} {-L*.7:.1f} {-W:.1f} {-L*bulge*.6:.1f} 0 0Z')
    s = f'<path d="{d}" fill="{tone["fill"]}" stroke="{tone["edge"]}" stroke-width=".8"/>'
    veins = ''
    for i in range(1, 15):
        t = i / 15
        y = -L * t
        # half-width of the leaf at this height (approximate from the bulge)
        hw = W * math.sin(math.pi * t ** .85) * 1.02
        for side in (1, -1):
            veins += f'M0 {y:.1f} Q{side*hw*.5:.1f} {y - L*.045:.1f} {side*hw:.1f} {y - L*.06:.1f} '
    s += f'<path d="{veins}" stroke="{tone["vein"]}" stroke-width=".9" fill="none" opacity=".8"/>'
    s += f'<path d="M0 0 L0 {-L*.97:.1f}" stroke="{tone["vein"]}" stroke-width="{L*.014:.1f}" fill="none"/>'
    return s


def fan_palm(L, tone, rng):
    """Fan palm: narrow folded segments radiating from one point, on a short stem."""
    n = rng.randint(13, 17); spread = rng.uniform(150, 185)
    s = f'<path d="M0 0 L0 {L*.25:.1f}" stroke="{tone["vein"]}" stroke-width="{L*.02:.1f}" fill="none"/>'
    for i in range(n):
        a = -spread / 2 + spread * i / (n - 1) + rng.uniform(-2, 2)
        l = L * (.72 + .28 * math.cos(math.radians(a)))  # centre segments longest
        s += (f'<g transform="rotate({a:.1f})">{leaflet(l, l*.075, tone, sw=.6)}'
              f'<path d="M0 0 L0 {-l*.92:.1f}" stroke="{tone["vein"]}" stroke-width=".7" opacity=".6"/></g>')
    return s


def split_leaf(L, tone, rng):
    """Philodendron: deep finger lobes either side of a midrib, fused along a central band."""
    n = rng.randint(6, 8)
    s = f'<path d="M{-L*.05:.1f} 0 L{-L*.04:.1f} {-L*.95:.1f} L{L*.04:.1f} {-L*.95:.1f} L{L*.05:.1f} 0Z" fill="{tone["fill"]}"/>'
    for i in range(n):
        t = (i + .5) / n
        y = -L * .06 - L * .86 * t
        l = L * .34 * math.sin(math.pi * (.15 + .85 * t)) ** .6 * (1.2 - .4 * t)
        for side in (1, -1):
            ang = side * (68 - 30 * t)
            s += f'<g transform="translate(0 {y:.1f}) rotate({ang:.1f})">{leaflet(l, l*.16, tone, curve=side*l*.05)}</g>'
    s += f'<g transform="translate(0 {-L*.9:.1f})">{leaflet(L*.14, L*.03, tone)}</g>'
    s += f'<path d="M0 0 L0 {-L*.92:.1f}" stroke="{tone["vein"]}" stroke-width="{L*.012:.1f}" fill="none"/>'
    return s


def vine(L, tone, rng):
    """Climbing vine: a long S-curve with alternating heart-shaped leaves shrinking to the tip."""
    c1 = (rng.uniform(-L*.3, L*.3), -L*.33); c2 = (-c1[0], -L*.66); p1 = (rng.uniform(-L*.1, L*.1), -L)
    s = f'<path d="M0 0 C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p1[0]:.1f} {p1[1]:.1f}" stroke="{tone["vein"]}" stroke-width="{L*.009:.1f}" fill="none"/>'
    n = rng.randint(7, 10)
    for i in range(n):
        t = (i + .5) / n
        # cubic Bezier point
        u = 1 - t
        x = 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t**3*p1[0]
        y = 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t**3*p1[1]
        side = 1 if i % 2 else -1
        hl = L * .16 * (1.1 - .6 * t)
        heart = (f'<path d="M0 0 C{hl*.9:.1f} {-hl*.1:.1f} {hl*.95:.1f} {-hl*.75:.1f} {hl*.3:.1f} {-hl*.85:.1f} '
                 f'Q0 {-hl*.9:.1f} 0 {-hl*.7:.1f} Q0 {-hl*.9:.1f} {-hl*.3:.1f} {-hl*.85:.1f} '
                 f'C{-hl*.95:.1f} {-hl*.75:.1f} {-hl*.9:.1f} {-hl*.1:.1f} 0 0Z" fill="{tone["fill"]}" stroke="{tone["edge"]}" stroke-width=".7"/>'
                 f'<path d="M0 0 L0 {-hl*.7:.1f}" stroke="{tone["vein"]}" stroke-width=".8" opacity=".7"/>')
        s += f'<g transform="translate({x:.1f} {y:.1f}) rotate({side*rng.uniform(55, 80):.1f})">{heart}</g>'
    return s


def fern(L, tone, rng):
    """Fern frond with serrated pinnae."""
    c = (rng.uniform(-L*.3, L*.3), -L*.5); p0 = (0, 0); p1 = (rng.uniform(-L*.1, L*.1), -L)
    n = rng.randint(14, 18)
    s = ''
    for i in range(n):
        t = (i + .5) / n
        x, y = qbez(p0, c, p1, t); tx, ty = qtan(p0, c, p1, t)
        base = math.degrees(math.atan2(tx, -ty))
        l = L * .22 * math.sin(math.pi * min(1, t * 1.1)) ** .5 * (1 - .5 * max(0, t - .75) / .25)
        for side in (1, -1):
            w = l * .18
            teeth = ''.join(f'L{w*(1 - k/9)*(1 if k % 2 else .75):.1f} {-l*k/9:.1f} ' for k in range(1, 9))
            teeth_l = ''.join(f'L{-w*(1 - k/9)*(1 if k % 2 else .75):.1f} {-l*k/9:.1f} ' for k in range(8, 0, -1))
            d = f'M0 0 {teeth}L0 {-l:.1f} {teeth_l}Z'
            s += (f'<g transform="translate({x:.1f} {y:.1f}) rotate({base + side*62:.1f})">'
                  f'<path d="{d}" fill="{tone["fill"]}" stroke="{tone["edge"]}" stroke-width=".5"/></g>')
    s += f'<path d="M0 0 Q{c[0]:.1f} {c[1]:.1f} {p1[0]:.1f} {p1[1]:.1f}" stroke="{tone["vein"]}" stroke-width="{L*.01:.1f}" fill="none"/>'
    return s


def bloom(r, ftone, rng):
    """Layered peony-like flower: three rings of pointed petals, shaded base to tip."""
    s = ''
    for ring, (n, rr, op) in enumerate([(9, 1.0, .95), (8, .74, 1), (6, .5, 1), (5, .28, 1)]):
        off = rng.uniform(0, 360)
        for i in range(n):
            a = off + 360 / n * i + rng.uniform(-6, 6)
            pr = r * rr
            s += (f'<path d="M0 0 C{pr*.55:.1f} {-pr*.2:.1f} {pr*.6:.1f} {-pr*.8:.1f} 0 {-pr:.1f} '
                  f'C{-pr*.6:.1f} {-pr*.8:.1f} {-pr*.55:.1f} {-pr*.2:.1f} 0 0Z" fill="{ftone["fill"][min(ring, len(ftone["fill"]) - 1)]}" '
                  f'stroke="{ftone["edge"]}" stroke-width=".7" opacity="{op}" transform="rotate({a:.1f})"/>')
    for i in range(9):
        a = math.radians(40 * i); dd = r * .12
        s += f'<circle cx="{math.cos(a)*dd:.1f}" cy="{math.sin(a)*dd:.1f}" r="{r*.03:.1f}" fill="{ftone["center"]}"/>'
    return s


# ---- palettes ---------------------------------------------------------------
# Leaf tones are (dark, light) pairs used as gradient stops; three per palette
# so neighbouring leaves differ. bg is the ground; flowers are muted.
STYLES = {
    'emerald-jungle': dict(
        name='Emerald jungle', note='Deep green ground, layered palm and banana leaves in four greens, a few blush blooms. Evolves option 1.',
        bg='#1b3a2f', leaves=[('#24493a', '#4f7d63'), ('#2f5d47', '#6f9a7c'), ('#3e6f55', '#8fb391')], edge='#a9c9ae', vein='#1b3a2f',
        flowers=[('#c98a7a', '#e8c3b4', '#f4e2d6')], fedge='#8d5a4e', fcenter='#e0b24a', mix=dict(palm=4, banana=3, fan=3, split=3, vine=3, fern=2), blooms=3),
    'midnight-palms': dict(
        name='Midnight palms', note='Near-black green, tonal palms and ferns with pale sage edges, sparse white blossoms. Evolves option 3.',
        bg='#10231d', leaves=[('#15302a', '#2f5346'), ('#1c3a31', '#3f6b57'), ('#24473a', '#5a8a70')], edge='#7fa38c', vein='#0c1a15',
        flowers=[('#c9c2a8', '#e8e3d2', '#f6f2e6')], fedge='#7d8a70', fcenter='#d9b95a', mix=dict(palm=5, banana=2, fan=3, split=2, vine=2, fern=4), blooms=2),
    'sage-verdure': dict(
        name='Sage verdure', note='Tonal mid-sage ground with lighter and darker sage leaves, no flowers. Classic tone-on-tone paper.',
        bg='#8fa08a', leaves=[('#6e836c', '#9db197'), ('#7b907a', '#b3c4ab'), ('#5f7461', '#8ea38a')], edge='#e2ead9', vein='#55695a',
        flowers=[], fedge='#000', fcenter='#000', mix=dict(palm=4, banana=3, fan=3, split=3, vine=3, fern=2), blooms=0),
    'ink-botanical': dict(
        name='Ink botanical', note='Single-colour engraved look: dark teal ground, leaves in one ink drawn only by their edges and veins.',
        bg='#173c3f', leaves=[('#173c3f', '#1d474a'), ('#173c3f', '#1a4245'), ('#1a4447', '#22525a')], edge='#9fc7c2', vein='#5f8f8c',
        flowers=[('#173c3f', '#1d474a', '#22525a')], fedge='#9fc7c2', fcenter='#9fc7c2', mix=dict(palm=4, banana=3, fan=3, split=3, vine=4, fern=3), blooms=2),
    'terracotta-grove': dict(
        name='Terracotta grove', note='Warm ochre-terracotta ground with olive and bottle-green leaves, cream blooms. The Sicilian villa version.',
        bg='#b8664a', leaves=[('#3f5a3a', '#6b8253'), ('#4d6b44', '#86a066'), ('#2f4a34', '#5a7a52')], edge='#d8d3a6', vein='#2a3d2a',
        flowers=[('#d9c39a', '#eddcbf', '#f7efdf')], fedge='#8a6a3a', fcenter='#6b3f2a', mix=dict(palm=4, banana=4, fan=3, split=2, vine=3, fern=2), blooms=3),
}


def scatter(rng, n, min_d):
    pts, tries = [], 0
    while len(pts) < n and tries < n * 500:
        tries += 1
        x, y = rng.uniform(0, TILE), rng.uniform(0, TILE)
        if all(min(abs(px-x), TILE-abs(px-x))**2 + min(abs(py-y), TILE-abs(py-y))**2 >= min_d*min_d for px, py in pts):
            pts.append((x, y))
    return pts


def place(body, m, x, y, rot, reach, opacity=1):
    xs = [0] + ([-TILE] if x + reach > TILE else []) + ([TILE] if x - reach < 0 else [])
    ys = [0] + ([-TILE] if y + reach > TILE else []) + ([TILE] if y - reach < 0 else [])
    for ox in xs:
        for oy in ys:
            body.append(f'<g transform="translate({x+ox:.1f} {y+oy:.1f}) rotate({rot:.1f})" opacity="{opacity}">{m}</g>')


def build(slug, st, seed=3):
    rng = random.Random(f'{slug}-{seed}')
    defs = []
    # Gradients per leaf tone and per depth layer (back layers are pulled toward the ground colour).
    tones = {}
    for layer, fade in (('back', .55), ('mid', .18), ('front', 0)):
        for i, (dark, light) in enumerate(st['leaves']):
            gid = f'g-{layer}-{i}'
            d, l = blend(dark, st['bg'], fade), blend(light, st['bg'], fade)
            defs.append(f'<linearGradient id="{gid}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="{d}"/><stop offset="1" stop-color="{l}"/></linearGradient>')
            tones.setdefault(layer, []).append(dict(fill=f'url(#{gid})', edge=blend(st['edge'], st['bg'], fade + .1), vein=blend(st['vein'], st['bg'], fade * .5)))
    ftones = [dict(fill=list(f), edge=st['fedge'], center=st['fcenter']) for f in st['flowers']]
    defs.append('<filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/>'
                '<feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .18 0"/></filter>')
    body = [f'<rect width="{TILE}" height="{TILE}" fill="{st["bg"]}"/>']
    names = [k for k, w in st['mix'].items() for _ in range(w)]

    def motif(kind, L, tone):
        if kind == 'palm': return palm_frond(L, tone, rng), L
        if kind == 'banana': return banana_leaf(L, tone, rng), L
        if kind == 'fan': return fan_palm(L * .75, tone, rng), L * .8
        if kind == 'split': return split_leaf(L, tone, rng), L
        if kind == 'vine': return vine(L * 1.15, tone, rng), L * 1.2
        return fern(L, tone, rng), L

    # Three depth layers: big faint leaves behind, the main foliage, a few crisp leaves in front.
    for layer, count, size, min_d, op in (('back', 9, (380, 520), 190, .85), ('mid', 13, (260, 400), 130, 1), ('front', 7, (190, 290), 190, 1)):
        for (x, y) in scatter(rng, count, min_d):
            kind = rng.choice(names); tone = rng.choice(tones[layer])
            m, reach = motif(kind, rng.uniform(*size), tone)
            place(body, m, x, y, rng.uniform(-180, 180), reach, op)
    for (x, y) in scatter(rng, st['blooms'], 300):
        if ftones:
            r = rng.uniform(48, 64)
            place(body, bloom(r, rng.choice(ftones), rng), x, y, rng.uniform(-30, 30), r * 1.1)
    body.append(f'<rect width="{TILE}" height="{TILE}" filter="url(#grain)"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {TILE} {TILE}" width="{TILE}" height="{TILE}">'
           f'<defs>{"".join(defs)}</defs>{"".join(body)}</svg>')
    (OUT / f'{slug}.svg').write_text(svg)
    return len(svg)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for slug, st in STYLES.items():
        size = build(slug, st)
        manifest.append(dict(slug=slug, name=st['name'], note=st['note'], bg=st['bg'], dark=st['bg'] < '#9', bytes=size))
        print(f'{slug:18s} {size/1024:6.1f} KB')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))


if __name__ == '__main__':
    main()
