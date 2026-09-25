"""Generate seamless floral tiles as SVG, drawn from scratch so the site owns
them outright (no stock, no licence). Each style is a palette plus a mix of
hand-coded motifs (poppy, daisy, bell, bud, leaf, sprig, fern, berries)
scattered with a seeded random so a rerun reproduces the same tile.

    python docs/card-page-designs/make_patterns.py

Writes patterns/generated/<slug>.svg and a manifest used by build_designs.py.
"""
import json, math, random
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / 'patterns' / 'generated'
TILE = 600  # user units; CSS background-size sets the on-screen scale


# ---- motifs: each returns SVG for a motif centred at (0,0), pointing up ----
def leaf(L, w, fill, vein=None, opacity=1):
    s = (f'<path d="M0 0 C{w:.1f} {-L*0.3:.1f} {w:.1f} {-L*0.72:.1f} 0 {-L:.1f} '
         f'C{-w:.1f} {-L*0.72:.1f} {-w:.1f} {-L*0.3:.1f} 0 0Z" fill="{fill}" opacity="{opacity}"/>')
    if vein:
        s += f'<path d="M0 {-L*0.08:.1f} L0 {-L*0.9:.1f}" stroke="{vein}" stroke-width="{max(0.8, w*0.08):.1f}" fill="none" opacity=".7"/>'
    return s


def sprig(L, pal, rng, leaves=5, leaf_l=None, curve=None):
    """A curved stem with alternating leaves, tip leaf on top."""
    curve = rng.uniform(-L * .35, L * .35) if curve is None else curve
    leaf_l = leaf_l or L * .28
    s = f'<path d="M0 0 Q{curve:.1f} {-L/2:.1f} 0 {-L:.1f}" stroke="{pal["stem"]}" stroke-width="{L*0.018:.1f}" fill="none" stroke-linecap="round"/>'
    for i in range(leaves):
        t = (i + 1) / (leaves + 1)
        # point on the quadratic Bezier at parameter t
        x = 2 * (1 - t) * t * curve
        y = -L * t
        side = 1 if i % 2 == 0 else -1
        ang = side * rng.uniform(40, 65)
        s += (f'<g transform="translate({x:.1f} {y:.1f}) rotate({ang:.0f})">'
              f'{leaf(leaf_l * rng.uniform(.8, 1.1), leaf_l * .34, pal["leaf"], pal.get("vein"))}</g>')
    s += f'<g transform="translate(0 {-L:.1f})">{leaf(leaf_l * .9, leaf_l * .3, pal["leaf"], pal.get("vein"))}</g>'
    return s


def fern(L, pal, rng, pairs=7):
    s = f'<path d="M0 0 L0 {-L:.1f}" stroke="{pal["stem"]}" stroke-width="{L*0.016:.1f}" fill="none" stroke-linecap="round"/>'
    for i in range(pairs):
        t = (i + 0.5) / pairs
        y = -L * t
        ll = L * .22 * (1 - t * .75)
        for side in (1, -1):
            s += f'<g transform="translate(0 {y:.1f}) rotate({side*58:.0f})">{leaf(ll, ll*.3, pal["leaf2"], None, .95)}</g>'
    return s


def daisy(r, pal, rng, petals=None):
    petals = petals or rng.choice([8, 10, 12])
    s = ''
    for i in range(petals):
        a = 360 / petals * i + rng.uniform(-3, 3)
        s += (f'<ellipse cx="0" cy="{-r*0.6:.1f}" rx="{r*0.22:.1f}" ry="{r*0.42:.1f}" fill="{pal["petal2"]}" '
              f'transform="rotate({a:.1f})"/>')
    s += f'<circle r="{r*0.26:.1f}" fill="{pal["center"]}"/>'
    s += f'<circle r="{r*0.12:.1f}" fill="{pal["center2"]}" opacity=".8"/>'
    return s


def poppy(r, pal, rng):
    n = rng.choice([4, 5, 5, 6])
    s = ''
    for i in range(n):
        a = 360 / n * i + rng.uniform(-8, 8)
        rr = r * rng.uniform(.85, 1.05)
        # a broad, slightly ruffled petal
        s += (f'<path d="M0 0 C{rr*.55:.1f} {-rr*.15:.1f} {rr*.75:.1f} {-rr*.65:.1f} {rr*.28:.1f} {-rr:.1f} '
              f'C{rr*.1:.1f} {-rr*1.08:.1f} {-rr*.1:.1f} {-rr*1.08:.1f} {-rr*.28:.1f} {-rr:.1f} '
              f'C{-rr*.75:.1f} {-rr*.65:.1f} {-rr*.55:.1f} {-rr*.15:.1f} 0 0Z" fill="{pal["petal"]}" '
              f'transform="rotate({a:.1f})" opacity=".96"/>')
    s += f'<circle r="{r*0.2:.1f}" fill="{pal["center"]}"/>'
    for i in range(7):
        a = math.radians(360 / 7 * i)
        s += f'<circle cx="{math.cos(a)*r*.3:.1f}" cy="{math.sin(a)*r*.3:.1f}" r="{r*0.045:.1f}" fill="{pal["center2"]}"/>'
    return s


def five_petal(r, pal, rng, colour=None):
    colour = colour or pal['petal3']
    s = ''
    for i in range(5):
        s += f'<circle cx="0" cy="{-r*.55:.1f}" r="{r*.42:.1f}" fill="{colour}" transform="rotate({72*i})"/>'
    s += f'<circle r="{r*.2:.1f}" fill="{pal["center"]}"/>'
    return s


def bell(r, pal, rng):
    """Bell flower hanging from a short stem, three bells."""
    s = f'<path d="M0 0 Q{r*.4:.1f} {-r*1.2:.1f} 0 {-r*2.6:.1f}" stroke="{pal["stem"]}" stroke-width="{r*.08:.1f}" fill="none"/>'
    for k, (dx, dy, sc) in enumerate([(-r * .55, -r * .9, .8), (r * .6, -r * 1.5, .85), (0, -r * 2.2, .7)]):
        rr = r * sc
        s += (f'<g transform="translate({dx:.1f} {dy:.1f})"><path d="M{-rr*.5:.1f} 0 C{-rr*.6:.1f} {-rr*.8:.1f} {rr*.6:.1f} {-rr*.8:.1f} {rr*.5:.1f} 0 '
              f'L{rr*.62:.1f} {rr*.12:.1f} L{rr*.2:.1f} {rr*.02:.1f} L0 {rr*.16:.1f} L{-rr*.2:.1f} {rr*.02:.1f} L{-rr*.62:.1f} {rr*.12:.1f}Z" fill="{pal["petal3"]}"/></g>')
    return s


def bud(r, pal, rng):
    s = f'<path d="M0 0 L0 {-r*1.6:.1f}" stroke="{pal["stem"]}" stroke-width="{r*.1:.1f}" fill="none"/>'
    s += f'<g transform="translate(0 {-r*.3:.1f}) rotate(50)">{leaf(r*.9, r*.3, pal["leaf"])}</g>'
    s += f'<g transform="translate(0 {-r*.7:.1f}) rotate(-50)">{leaf(r*.8, r*.28, pal["leaf"])}</g>'
    s += f'<ellipse cx="0" cy="{-r*1.8:.1f}" rx="{r*.42:.1f}" ry="{r*.6:.1f}" fill="{pal["petal"]}"/>'
    return s


def berries(r, pal, rng):
    s = f'<path d="M0 0 Q{r*.3:.1f} {-r:.1f} 0 {-r*1.7:.1f}" stroke="{pal["stem"]}" stroke-width="{r*.07:.1f}" fill="none"/>'
    for i in range(rng.choice([4, 5, 6])):
        a = rng.uniform(0, 2 * math.pi); d = rng.uniform(.2, .8) * r
        s += f'<circle cx="{math.cos(a)*d:.1f}" cy="{-r*1.7 + math.sin(a)*d:.1f}" r="{r*.19:.1f}" fill="{pal["berry"]}"/>'
    return s


def dots(pal, rng, n):
    return ''.join(f'<circle cx="{rng.uniform(0, TILE):.1f}" cy="{rng.uniform(0, TILE):.1f}" r="{rng.uniform(1.2, 2.6):.1f}" '
                   f'fill="{pal["dot"]}" opacity=".7"/>' for _ in range(n))


# ---- styles ----------------------------------------------------------------
# density: target motif count; mix: weights per motif; scale: base size.
STYLES = {
    'deep-woodland': dict(
        name='Deep woodland', note='Dark green ground, sage leaves and ferns, cream and coral blooms with gold centres. The direct stand-in for the stock woodland.',
        pal=dict(bg='#17352d', stem='#6f9a7c', leaf='#4f8465', leaf2='#7fae8c', vein='#a6c9ad', petal='#e9c4a6', petal2='#f2e8d3', petal3='#d9714f',
                 center='#e0b24a', center2='#17352d', berry='#c9563a', dot='#e0b24a'),
        mix=dict(sprig=6, fern=3, poppy=3, daisy=3, five=2, bell=1, bud=2, berries=2), density=52, scale=1.0, dots=40),
    'midnight-garden': dict(
        name='Midnight garden', note='Ink-blue ground with coral poppies, peach daisies and teal leaves. Bolder flowers, fewer stems.',
        pal=dict(bg='#1c2a44', stem='#5f8a8e', leaf='#3f7d7f', leaf2='#7fb0a8', vein='#a9d3cb', petal='#e2704f', petal2='#f3c9a8', petal3='#e9a36c',
                 center='#f2d38a', center2='#1c2a44', berry='#f0a35e', dot='#f2d38a'),
        mix=dict(sprig=4, fern=2, poppy=5, daisy=3, five=2, bell=1, bud=1, berries=2), density=44, scale=1.15, dots=30),
    'forest-floor': dict(
        name='Forest floor', note='Near-black green, small white and blue flowers, lots of fine foliage. Quietest of the dark set.',
        pal=dict(bg='#122a24', stem='#5d8a6f', leaf='#3e6d54', leaf2='#5f9476', vein='#8fb79c', petal='#f4efe2', petal2='#f4efe2', petal3='#8fb3d9',
                 center='#e7c46a', center2='#122a24', berry='#e7c46a', dot='#8fb3d9'),
        mix=dict(sprig=7, fern=5, poppy=1, daisy=4, five=3, bell=2, bud=2, berries=3), density=64, scale=0.8, dots=60),
    'poppy-meadow': dict(
        name='Poppy meadow', note='Cream ground, orange poppies, blue cornflowers and grass-green stems. Matches the printed card’s orange.',
        pal=dict(bg='#fbf7ee', stem='#5f8a4a', leaf='#6f9a56', leaf2='#8fb26f', vein='#c8d9b4', petal='#d9572a', petal2='#f2e0c8', petal3='#5c7fb8',
                 center='#2b2a27', center2='#e0b24a', berry='#2b2a27', dot='#d9572a'),
        mix=dict(sprig=5, fern=2, poppy=5, daisy=2, five=3, bell=1, bud=2, berries=1), density=48, scale=1.0, dots=20),
    'herbarium': dict(
        name='Herbarium', note='Ivory ground, sparse pressed-plant sprigs and ferns in two greens, no flowers. Reads as texture rather than pattern.',
        pal=dict(bg='#f6f1e6', stem='#5a7a5a', leaf='#7d9a76', leaf2='#a9bd9c', vein='#e7eede', petal='#c9a36c', petal2='#e2d3b8', petal3='#c9a36c',
                 center='#7d6a4a', center2='#f6f1e6', berry='#7d6a4a', dot='#a9bd9c'),
        mix=dict(sprig=8, fern=6, poppy=0, daisy=0, five=0, bell=0, bud=2, berries=2), density=40, scale=1.05, dots=0, ground=8),
    'sage-and-plum': dict(
        name='Sage and plum', note='Soft sage ground, plum and blush flowers, olive leaves. A lighter dark-panel alternative.',
        pal=dict(bg='#c9d3c0', stem='#5e6f4e', leaf='#6f8259', leaf2='#8c9f74', vein='#c4d2ad', petal='#6b3b5c', petal2='#f0d6d2', petal3='#a86a87',
                 center='#e8c56d', center2='#6b3b5c', berry='#6b3b5c', dot='#6b3b5c'),
        mix=dict(sprig=5, fern=2, poppy=4, daisy=3, five=3, bell=2, bud=2, berries=2), density=50, scale=1.0, dots=25),
}


def scatter(rng, n, min_d):
    """Poisson-ish scatter: rejection sampling on a torus so wrapped copies keep their spacing."""
    pts = []
    tries = 0
    while len(pts) < n and tries < n * 400:
        tries += 1
        x, y = rng.uniform(0, TILE), rng.uniform(0, TILE)
        ok = True
        for px, py in pts:
            dx = min(abs(px - x), TILE - abs(px - x)); dy = min(abs(py - y), TILE - abs(py - y))
            if dx * dx + dy * dy < min_d * min_d:
                ok = False; break
        if ok:
            pts.append((x, y))
    return pts


def blend(a, b, t):
    """Mix two hex colours: t=0 gives a, t=1 gives b."""
    ca = [int(a[i:i+2], 16) for i in (1, 3, 5)]; cb = [int(b[i:i+2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02x}' for x, y in zip(ca, cb))


def place(body, m, x, y, rot, reach):
    """Emit a motif and whichever wrapped copies could touch the tile edge."""
    xs = [0] + ([-TILE] if x + reach > TILE else []) + ([TILE] if x - reach < 0 else [])
    ys = [0] + ([-TILE] if y + reach > TILE else []) + ([TILE] if y - reach < 0 else [])
    for ox in xs:
        for oy in ys:
            body.append(f'<g transform="translate({x+ox:.1f} {y+oy:.1f}) rotate({rot:.1f})">{m}</g>')


def build_tile(slug, st, seed=7):
    rng = random.Random(f'{slug}-{seed}')
    pal, sc = st['pal'], st['scale']
    names = [k for k, w in st['mix'].items() for _ in range(w)]
    body = [f'<rect width="{TILE}" height="{TILE}" fill="{pal["bg"]}"/>']
    # Ground layer: large, faint foliage in a tint of the background gives depth.
    ghost = dict(pal, stem=blend(pal['bg'], pal['stem'], .45), leaf=blend(pal['bg'], pal['leaf'], .38),
                 leaf2=blend(pal['bg'], pal['leaf2'], .38), vein=None)
    for (x, y) in scatter(rng, st.get('ground', 12), 120):
        L = rng.uniform(170, 260) * sc
        m = fern(L, ghost, rng, pairs=9) if rng.random() < .4 else sprig(L, ghost, rng, leaves=7, leaf_l=L * .26)
        place(body, m, x, y, rng.uniform(-180, 180), L)
    body.append(dots(pal, rng, st['dots']))
    pts = scatter(rng, st['density'], 58 * sc)
    for (x, y) in pts:
        kind = rng.choice(names)
        rot = rng.uniform(-180, 180) if kind in ('sprig', 'fern') else rng.uniform(-35, 35)
        j = rng.uniform(.7, 1.5) * sc
        if kind == 'sprig': L = rng.uniform(95, 140) * j; m = sprig(L, pal, rng, leaves=rng.choice([4, 5, 6])); reach = L
        elif kind == 'fern': L = rng.uniform(90, 130) * j; m = fern(L, pal, rng, pairs=rng.choice([6, 7, 8])); reach = L
        elif kind == 'poppy': r = rng.uniform(22, 30) * j; m = poppy(r, pal, rng); reach = r * 1.2
        elif kind == 'daisy': r = rng.uniform(20, 26) * j; m = daisy(r, pal, rng); reach = r
        elif kind == 'five': r = rng.uniform(11, 16) * j; m = five_petal(r, pal, rng); reach = r
        elif kind == 'bell': r = rng.uniform(12, 15) * j; m = bell(r, pal, rng); reach = r * 3
        elif kind == 'bud': r = rng.uniform(13, 17) * j; m = bud(r, pal, rng); reach = r * 2.5
        else: r = rng.uniform(16, 20) * j; m = berries(r, pal, rng); reach = r * 2.5
        place(body, m, x, y, rot, reach)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {TILE} {TILE}" width="{TILE}" height="{TILE}">'
           + ''.join(body) + '</svg>')
    (OUT / f'{slug}.svg').write_text(svg)
    return len(svg)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = []
    for slug, st in STYLES.items():
        size = build_tile(slug, st)
        manifest.append(dict(slug=slug, name=st['name'], note=st['note'], bg=st['pal']['bg'], dark=st['pal']['bg'] < '#8', bytes=size))
        print(f'{slug:18s} {size/1024:6.1f} KB')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))


if __name__ == '__main__':
    main()
