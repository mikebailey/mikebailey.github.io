"""Generate the /card/ redesign studies: one standalone HTML per variant, a
greetings study, and an index that shows every variant at phone and desktop
width. Run from anywhere:

    python docs/card-page-designs/build_designs.py

Edit CONTENT, GREETINGS or VARIANTS and rerun; the chosen variant is later
copied into _pages/card.html by hand.
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent

# ---- shared content -------------------------------------------------------
CONTENT = {
    'name': 'Michael Bailey',
    'title': 'Senior Advisor, AI · J-PAL at MIT',
    'second': 'Co-founder, Social Capital Lab',
    'lede': 'I work on AI+social good and social capital research. '
            'Save my details or explore my research and projects.',
    'email': 'mbailey@povertyactionlab.org',
    'foot': 'The contact file includes my website, so you can find it later from your contacts too.',
    'primary': [('Save contact', '/files/michael-bailey.vcf', 'primary'),
                ('Explore my website ↗', '/', '')],
    'secondary': [('My Research', '/publications/'), ('J-PAL ↗', 'https://www.povertyactionlab.org/')],
}

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500'
         '&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">')

# Shared typography and layout, matched to the printed card (Newsreader + IBM Plex Sans).
BASE_CSS = '''
:root{color-scheme:light;--ink:#2b2a27;--muted:#6a675f;--paper:#fffaf3;--accent:#d9572a;--line:#e2d9cc;--panel:transparent}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--paper);color:var(--ink);font:16px/1.55 "IBM Plex Sans",system-ui,sans-serif}
.card{position:relative;width:min(100%,560px);padding:48px 28px 52px;background:var(--panel)}
.greet{font:italic 400 21px/1.2 Newsreader,Georgia,serif;color:var(--accent);margin:0 0 18px}
h1{font:400 clamp(44px,8vw,64px)/1 Newsreader,Georgia,serif;letter-spacing:-.03em;margin:0 0 14px}
.role{font-size:18px;margin:0 0 14px;line-height:1.4}.role span{display:block;color:var(--muted)}
.lede{color:var(--muted);margin:0 0 26px}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 12px}
.button{display:inline-flex;align-items:center;text-decoration:none;font-weight:600;border:1px solid var(--ink);border-radius:10px;padding:13px 18px;color:var(--ink);min-height:48px;background:transparent}
.button.primary{background:var(--ink);color:#fff;border-color:var(--ink)}
.secondary .button{font-weight:500;padding:9px 14px;min-height:40px;border-color:var(--line);font-size:15px}
a:focus-visible{outline:3px solid var(--accent);outline-offset:4px}
.email{margin:26px 0 0}.email a{color:var(--ink);text-underline-offset:3px}
.foot{border-top:1px solid var(--line);margin-top:26px;padding-top:16px;font-size:13px;color:var(--muted)}
'''

SPRIG = ('<svg class="sprig" viewBox="0 0 40 24" aria-hidden="true"><path d="M2 20c8-10 20-14 36-16" fill="none" stroke="currentColor" stroke-width="1.4"/>'
         '<path d="M12 14c-1-5 2-9 7-10-1 5-3 8-7 10zM22 9c0-5 4-8 9-8-1 5-4 8-9 8zM9 19c-4 1-7-1-8-5 4 0 7 2 8 5z" fill="currentColor"/></svg>')


def body(greet_html, extra_top='', extra_bottom=''):
    c = CONTENT
    prim = ''
    for t, h, k in c['primary']:
        dl = ' download="Michael-Bailey.vcf"' if h.endswith('.vcf') else ''
        prim += f'<a class="button {k}" href="{h}"{dl}>{t}</a>'
    sec = ''.join(f'<a class="button" href="{h}">{t}</a>' for t, h in c['secondary'])
    return f'''{extra_top}<main class="card">{greet_html}<h1>{c['name']}</h1>
<p class="role">{c['title']}<span>{c['second']}</span></p>
<p class="lede">{c['lede']}</p>
<div class="actions">{prim}</div>
<div class="actions secondary">{sec}</div>
<p class="email"><a href="mailto:{c['email']}">{c['email']}</a></p>
<p class="foot">{c['foot']}</p></main>{extra_bottom}'''


def page(title, css, inner, theme='#fffaf3'):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<meta name="theme-color" content="{theme}"><title>{title}</title>{FONTS}<style>{BASE_CSS}{css}</style></head><body>{inner}</body></html>')


# ---- variants -------------------------------------------------------------
# Each: slug, name, one-line note, pattern, extra CSS, greeting HTML, extra wrappers.
VARIANTS = [
    dict(slug='canopy', name='Canopy', note='Dashboard match: the approved poppies as a shallow band fading into cream, green accents.',
         theme='#f7f5ee',
         css='''
:root{--paper:#f7f5ee;--accent:#287468;--line:#dde3d6}
body::before{content:"";position:fixed;inset:0 0 auto 0;height:300px;background:url(patterns/poppies.webp) center top/640px repeat;
  -webkit-mask-image:linear-gradient(#000 35%,transparent);mask-image:linear-gradient(#000 35%,transparent);pointer-events:none}
.card{padding-top:230px;z-index:1}
.button{border-radius:999px}.button.primary{background:#287468;border-color:#287468}
.greet{color:#1f5a4a}
@media(max-width:480px){body::before{height:220px;background-size:520px}.card{padding-top:170px}}
''',
         greet='<p class="greet">Great to meet you!</p>'),

    dict(slug='cartouche', name='Cartouche', note='Full floral field, small-scale coral leaves; the greeting is the headline and the name follows.',
         theme='#f4efe6',
         css='''
:root{--paper:#f4efe6;--panel:#fffaf3;--accent:#c9563a;--line:#e6dccd}
body{background:#f4efe6 url(patterns/coral-leaves.webp) center/440px repeat;padding:28px 14px}
.card{border-radius:22px;padding:44px 36px 40px;box-shadow:0 24px 60px -20px #4a2c1a55,0 0 0 1px #fff8 inset}
.greet{font-size:clamp(36px,6.5vw,52px);line-height:1.05;color:var(--ink);margin:0 0 22px;letter-spacing:-.02em}
h1{font-size:clamp(30px,5vw,38px);font-weight:500;margin-bottom:8px}
.button{border-radius:12px}.button.primary{background:#c9563a;border-color:#c9563a}
@media(max-width:480px){.card{padding:36px 24px 32px}}
''',
         greet='<p class="greet">Great to meet you.</p>'),

    dict(slug='deep-garden', name='Deep garden', note='Woodland field in deep green, ivory panel with a double rule, coral buttons.',
         theme='#17352d',
         css='''
:root{--paper:#17352d;--panel:#f6f1e6;--accent:#c9563a;--line:#d9cfb8}
body{background:#17352d url(patterns/woodland.webp) center/560px repeat;padding:26px 14px}
.card{border:1px solid #cdbf9e;outline:1px solid #cdbf9e99;outline-offset:6px;padding:44px 36px 40px}
.greet{font:500 13px/1 "IBM Plex Sans",sans-serif;letter-spacing:.18em;text-transform:uppercase;display:flex;align-items:center;gap:10px;color:#2f5f52;margin-bottom:26px}
.sprig{width:30px;height:18px}
.button.primary{background:#c9563a;border-color:#c9563a}
@media(max-width:480px){.card{padding:34px 24px 30px}}
''',
         greet=f'<p class="greet">{SPRIG}Great to meet you</p>'),

    dict(slug='sprig', name='Sprig', note='Keeps today’s clean page; one cropped bloom in the corner, greeting in italic with an accent word.',
         theme='#fffaf3',
         css='''
.card{padding-top:150px;overflow:visible}
.card::before{content:"";position:absolute;right:-30px;top:-90px;width:340px;height:300px;background:url(patterns/poppies.webp) -140px -40px/760px no-repeat;
  -webkit-mask-image:radial-gradient(ellipse at 60% 40%,#000 24%,transparent 62%);mask-image:radial-gradient(ellipse at 60% 40%,#000 24%,transparent 62%);pointer-events:none}
.greet{color:var(--ink)}.greet em{color:var(--accent);font-style:italic}
@media(max-width:480px){.card{padding-top:130px}.card::before{width:260px;height:230px;right:-50px;top:-70px;background-size:560px}}
''',
         greet='<p class="greet">So glad we <em>met.</em></p>'),

    dict(slug='frame', name='Frame', note='Floral frame around a plain panel, songbirds in pale blue; the greeting is a sewn label on the edge.',
         theme='#e8eef0',
         css='''
:root{--paper:#e8eef0;--panel:#fffdf8;--accent:#2e6e8e;--line:#dfe3e0}
body{padding:22px 14px;background:#e8eef0}
.frame{width:min(100%,600px);padding:20px;background:url(patterns/songbirds.webp) center/400px repeat;border-radius:8px;box-shadow:0 18px 40px -22px #1a303a66}
.card{width:100%;padding:52px 34px 40px;border-radius:4px;box-shadow:0 0 0 1px #d8dcd8}
.greet{position:absolute;top:-15px;left:26px;margin:0;background:var(--panel);padding:3px 14px;border:1px solid #d8dcd8;border-radius:3px;font-size:19px;color:#2e6e8e}
.button.primary{background:#2e6e8e;border-color:#2e6e8e}
@media(max-width:480px){.frame{padding:14px}.card{padding:44px 22px 30px}}
''',
         greet='<p class="greet">Great to meet you!</p>',
         wrap=('<div class="frame">', '</div>')),

    dict(slug='bloom', name='Bloom', note='Golden and plum blooms as a header band; the panel rises into it. Bolder, phone-first.',
         theme='#fbf6e8',
         css='''
:root{--paper:#fbf6e8;--panel:#fffdf8;--accent:#4b2a5e;--line:#e9dfd0}
body{display:block;place-items:normal;background:#fbf6e8}
.band{height:38vh;min-height:230px;background:url(patterns/golden-plum.webp) center/520px repeat}
.card{margin:-90px auto 40px;border-radius:18px;padding:40px 32px 36px;box-shadow:0 20px 50px -24px #3a1f4a66}
.greet{font-size:28px;color:#4b2a5e;margin-bottom:14px}
.button{border-radius:999px}.button.primary{background:#4b2a5e;border-color:#4b2a5e}
@media(max-width:480px){.card{margin:-70px 14px 30px;padding:32px 22px 28px}}
''',
         greet='<p class="greet">Hello! Great to meet you.</p>',
         wrap=('<div class="band"></div>', '')),
]

# ---- greeting studies ------------------------------------------------------
GREETINGS = [
    ('Italic, no rule', '.g1 .greet{color:var(--accent)}', '<p class="greet">Great to meet you!</p>'),
    ('Small caps with a sprig', '.g2 .greet{font:500 13px/1 "IBM Plex Sans",sans-serif;letter-spacing:.18em;text-transform:uppercase;display:flex;align-items:center;gap:10px;color:var(--accent)}.g2 .sprig{width:30px;height:18px}',
     f'<p class="greet">{SPRIG}Great to meet you</p>'),
    ('Greeting as headline', '.g3 .greet{font-size:44px;line-height:1.05;color:var(--ink);letter-spacing:-.02em}.g3 h1{font-size:34px;font-weight:500}',
     '<p class="greet">Great to meet you.</p>'),
    ('Accent word', '.g4 .greet{color:var(--ink)}.g4 em{color:var(--accent)}', '<p class="greet">So glad we <em>met.</em></p>'),
    ('Sewn label', '.g5 .card{outline:1px solid var(--line);outline-offset:-1px;margin-top:14px}.g5 .greet{position:absolute;top:-15px;left:26px;margin:0;background:var(--paper);padding:3px 14px;border:1px solid var(--line);border-radius:3px;font-size:19px}',
     '<p class="greet">Great to meet you!</p>'),
    ('Marker highlight', '.g6 .greet{color:var(--ink);display:inline;background:linear-gradient(transparent 55%,#f7d9c9 55%,#f7d9c9 92%,transparent 92%);padding:0 4px}.g6 .greet-wrap{margin:0 0 18px}',
     '<div class="greet-wrap"><p class="greet">Great to meet you!</p></div>'),
    ('Past tense', '.g7 .greet{color:var(--accent)}', '<p class="greet">It was great to meet you.</p>'),
    ('Paths crossed', '.g8 .greet{color:var(--ink)}.g8 .greet small{display:block;font:400 15px/1.4 "IBM Plex Sans",sans-serif;color:var(--muted);margin-top:4px;font-style:normal}',
     '<p class="greet">Glad our paths crossed.<small>Michael, from the conversation just now</small></p>'),
]


# ---- the chosen direction: Deep garden outside, Frame inside ----------------
# One page per generated tile so the patterns can be compared in situ.
def garden_frame_css(pattern_url, bg, dark):
    ink_on_bg = '#f6f1e6' if dark else '#2b2a27'
    return f'''
:root{{--paper:{bg};--panel:#f8f4ea;--accent:#c9563a;--line:#d9cfb8}}
body{{background:{bg} url({pattern_url}) center/680px repeat;padding:30px 14px}}
.card{{border-radius:4px;border:1px solid #cdbf9e;outline:1px solid {'#cdbf9e99' if dark else '#cdbf9e'};outline-offset:6px;padding:52px 36px 40px;
  box-shadow:0 26px 60px -30px #00000088}}
.greet{{position:absolute;top:-15px;left:26px;margin:0;background:var(--panel);padding:3px 14px;border:1px solid #cdbf9e;border-radius:3px;font-size:19px;color:#2f5f52}}
.button.primary{{background:#c9563a;border-color:#c9563a}}
@media(max-width:480px){{.card{{padding:44px 24px 30px}}}}
'''


def build_garden_frames():
    import json
    manifest = json.loads((HERE / 'patterns' / 'generated' / 'manifest.json').read_text())
    pages = []
    for m in manifest:
        slug = f"garden-frame-{m['slug']}"
        css = garden_frame_css(f"patterns/generated/{m['slug']}.svg", m['bg'], m['dark'])
        html = page(f"Michael Bailey · Contact · {m['name']}", css, body('<p class="greet">Great to meet you!</p>'), m['bg'])
        (HERE / f'{slug}.html').write_text(html)
        pages.append((slug, m))
    # Gallery: tile swatch, then the composed page at phone and desktop width.
    rows = ''.join(f'''
<section><header><h2><a href="{slug}.html">{m['name']}</a></h2><p>{m['note']}</p></header>
<div class="frames"><div class="swatch" style="background-image:url(patterns/generated/{m['slug']}.svg)"></div>
<iframe src="{slug}.html" class="phone" title="{m['name']} phone" loading="lazy"></iframe>
<iframe src="{slug}.html" class="desk" title="{m['name']} desktop" loading="lazy"></iframe></div></section>''' for slug, m in pages)
    icss = '''
body{display:block;place-items:normal;padding:28px 24px 80px;background:#f3efe7}
h1{font-size:34px;margin-bottom:6px}.top p{color:var(--muted);margin:0 0 30px}.top a{color:var(--accent)}
section{margin:0 0 44px}header{display:flex;flex-wrap:wrap;align-items:baseline;gap:14px;margin-bottom:12px}
h2{font:500 24px/1.1 Newsreader,Georgia,serif;margin:0}h2 a{color:var(--ink);text-decoration:none}h2 a:hover{text-decoration:underline}
header p{margin:0;color:var(--muted)}
.frames{display:flex;gap:18px;align-items:flex-start;overflow-x:auto;padding-bottom:6px}
.swatch{width:420px;height:844px;flex-shrink:0;border-radius:14px;background-size:420px;border:1px solid #d9d1c4}
iframe{border:1px solid #d9d1c4;border-radius:14px;background:#fff;flex-shrink:0}
.phone{width:390px;height:844px}.desk{width:900px;height:844px}
'''
    top = '<div class="top"><h1>Generated florals on the chosen design</h1><p>Deep garden outside, Frame inside. Tiles drawn by <code>make_wallpaper.py</code>; the site would own them outright. <a href="index.html">Back to the six studies</a></p></div>'
    (HERE / 'patterns.html').write_text(page('Card page patterns', icss, top + rows))
    print(HERE / 'patterns.html')


def print_wall_css(url, mode, size, bg, dark):
    """Chosen design (Deep Garden outside, Frame inside) over a print wall.
    `mode` repeat = seamless tile at `size`; cover = one plate full bleed on <html>."""
    rule = '#cdbf9e99' if dark else '#cdbf9e'
    if mode == 'cover':
        bgcss = f"html{{min-height:100%;background:{bg} url({url}) center/cover no-repeat}}body{{background:transparent;padding:30px 14px}}"
    else:
        bgcss = f"body{{background:{bg} url({url}) center/{size} repeat;padding:30px 14px}}"
    return f'''
:root{{--paper:{bg};--panel:#f8f4ea;--accent:#c9563a;--line:#d9cfb8}}
{bgcss}
.card{{border-radius:4px;border:1px solid #cdbf9e;outline:1px solid {rule};outline-offset:6px;padding:52px 36px 40px;
  box-shadow:0 26px 60px -30px #00000099}}
.greet{{position:absolute;top:-15px;left:26px;margin:0;background:var(--panel);padding:3px 14px;border:1px solid #cdbf9e;border-radius:3px;font-size:19px;color:#2f5f52}}
.button.primary{{background:#c9563a;border-color:#c9563a}}
@media(max-width:480px){{.card{{padding:44px 24px 30px}}}}
'''


def build_print_walls():
    import json
    manifest = json.loads((HERE / 'prints' / 'walls' / 'manifest.json').read_text())
    rows = ''
    for m in manifest:
        slug = f"print-{m['slug']}"
        url = f"prints/walls/{m['slug']}.jpg"
        css = print_wall_css(url, m['mode'], m['css_size'], m['bg'], m['dark'])
        (HERE / f'{slug}.html').write_text(page(f"Michael Bailey · Contact · {m['name']}", css, body('<p class="greet">Great to meet you!</p>'), m['bg']))
        sw = f"background-image:url({url});background-size:{'cover' if m['mode']=='cover' else '420px'}"
        rows += f'''
<section><header><h2><a href="{slug}.html">{m['name']}</a></h2><p>{m['note']}</p></header>
<div class="frames"><div class="swatch" style="{sw}"></div>
<iframe src="{slug}.html" class="phone" title="{m['name']} phone" loading="lazy"></iframe>
<iframe src="{slug}.html" class="desk" title="{m['name']} desktop" loading="lazy"></iframe></div>
<p class="credit">{m['credits']} · {m['bytes']//1024} KB</p></section>'''
    icss = '''
body{display:block;place-items:normal;padding:28px 24px 80px;background:#f3efe7}
h1{font-size:34px;margin-bottom:6px}.top p{color:var(--muted);margin:0 0 30px}.top a{color:var(--accent)}
section{margin:0 0 44px}header{display:flex;flex-wrap:wrap;align-items:baseline;gap:14px;margin-bottom:12px}
h2{font:500 24px/1.1 Newsreader,Georgia,serif;margin:0}h2 a{color:var(--ink);text-decoration:none}h2 a:hover{text-decoration:underline}
header p{margin:0;color:var(--muted)}.credit{font-size:13px;color:var(--muted);margin:8px 0 0}
.frames{display:flex;gap:18px;align-items:flex-start;overflow-x:auto;padding-bottom:6px}
.swatch{width:420px;height:844px;flex-shrink:0;border-radius:14px;border:1px solid #d9d1c4;background-position:center}
iframe{border:1px solid #d9d1c4;border-radius:14px;background:#fff;flex-shrink:0}
.phone{width:390px;height:844px}.desk{width:900px;height:844px}
'''
    top = ('<div class="top"><h1>Vintage prints on the chosen design</h1><p>Plates from the Public Domain Image Archive, composed by '
           '<code>make_print_walls.py</code>: one tone treatment per wall, equal plate widths, staggered columns, seamless tile. '
           '<a href="patterns.html">Generated florals</a> · <a href="index.html">Six studies</a></p></div>')
    (HERE / 'prints.html').write_text(page('Card page print walls', icss, top + rows))
    print(HERE / 'prints.html')


def build():
    for v in VARIANTS:
        top, bottom = v.get('wrap', ('', ''))
        html = page(f"Michael Bailey · Contact · {v['name']}", v['css'], body(v['greet'], top, bottom), v['theme'])
        (HERE / f"{v['slug']}.html").write_text(html)

    # Greetings: every treatment on the same plain page so only the greeting differs.
    cards = ''.join(
        f'<section class="g{i+1}"><h2>{name}</h2>{body(greet)}</section>'
        for i, (name, _css, greet) in enumerate(GREETINGS))
    gcss = ''.join(c for _n, c, _g in GREETINGS) + '''
body{display:block;place-items:normal;padding:20px}
.studio{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:22px;max-width:1500px;margin:0 auto}
section{background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden}
section h2{font:500 12px/1 "IBM Plex Sans",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0;padding:12px 16px;border-bottom:1px solid var(--line);background:#faf6ee}
section .card{width:100%;padding:36px 26px 30px}
section .actions.secondary,section .foot,section .email{display:none}
'''
    (HERE / 'greetings.html').write_text(page('Card greetings', gcss, f'<div class="studio">{cards}</div>'))

    # Index: each variant at phone and desktop width, side by side.
    rows = ''.join(f'''
<section><header><h2><a href="{v['slug']}.html">{v['name']}</a></h2><p>{v['note']}</p></header>
<div class="frames"><iframe src="{v['slug']}.html" class="phone" title="{v['name']} phone" loading="lazy"></iframe>
<iframe src="{v['slug']}.html" class="desk" title="{v['name']} desktop" loading="lazy"></iframe></div></section>''' for v in VARIANTS)
    icss = '''
body{display:block;place-items:normal;padding:28px 24px 80px;background:#f3efe7}
h1{font-size:34px;margin-bottom:6px}.top p{color:var(--muted);margin:0 0 30px}.top a{color:var(--accent)}
section{margin:0 0 44px}header{display:flex;flex-wrap:wrap;align-items:baseline;gap:14px;margin-bottom:12px}
h2{font:500 24px/1.1 Newsreader,Georgia,serif;margin:0}h2 a{color:var(--ink);text-decoration:none}h2 a:hover{text-decoration:underline}
header p{margin:0;color:var(--muted)}
.frames{display:flex;gap:18px;align-items:flex-start;overflow-x:auto;padding-bottom:6px}
iframe{border:1px solid #d9d1c4;border-radius:14px;background:#fff;flex-shrink:0}
.phone{width:390px;height:844px}.desk{width:900px;height:844px}
'''
    index = f'''<div class="top"><h1>/card/ redesign studies</h1><p><a href="greetings.html">Greeting treatments</a> · click a name for the full page</p></div>{rows}'''
    (HERE / 'index.html').write_text(page('Card page designs', icss, index))
    print(HERE / 'index.html')
    build_garden_frames()
    build_print_walls()


if __name__ == '__main__':
    build()
