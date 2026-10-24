#!/usr/bin/env python3
"""Build the Claude-hosted version of the final table from stellarhaus_vercel/.

    python3 tools/build_claude_page.py OUT.html

Inlines the engine and bots, drops the P2P/relay/Supabase libraries (a Claude
page talks through its own shared store instead), strips the document wrapper
the platform adds itself, and swaps WSOP branding for neutral Main Event
branding, since a page published on Claude can't carry another organization's
marks.
"""
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / 'stellarhaus_vercel'

BRANDING = [
    ('<title>WSOP Final Table</title>', '<title>Main Event Final Table</title>'),
    ("'WSOP Final Table'", "'Main Event Final Table'"),
    ('<div class="kick">World Series of Poker</div>', '<div class="kick">Stellarhaus Invitational</div>'),
    ('<div class="brand"><div class="w">WSOP</div>', '<div class="brand"><div class="w">&#9824;</div>'),
    ('<div class="a">WORLD SERIES OF POKER</div><div class="b">WSOP</div><div class="c">2027 MAIN EVENT</div>',
     '<div class="a">STELLARHAUS INVITATIONAL</div><div class="b">2027</div><div class="c">MAIN EVENT · FINAL TABLE</div>'),
    ('2027 WORLD SERIES OF POKER · MAIN EVENT CHAMPION', '2027 MAIN EVENT CHAMPION'),
    ('2027 WSOP Main Event', '2027 Main Event'),
    ('WSOP 2027 Main Event', '2027 Main Event'),
    ('Following WSOP rules', 'Following tournament rules'),
    ('by the players or the WSOP.', 'by the players or any poker tour.'),
    ('as at the WSOP.', 'as at major tournaments.'),
    ('// WSOP: the big blind', '// Tournament rule: the big blind'),
    ('WSOP 2027 Final Table', '2027 Final Table'),
    ('wsop2027-final-table.txt', 'main-event-2027-final-table.txt'),
]


def build(out):
    html = (SRC / 'poker.html').read_text()
    for name in ('poker-engine.js', 'poker-bots.js'):
        tag = f'<script src="{name}"></script>'
        assert html.count(tag) == 1, name
        html = html.replace(tag, '<script>\n' + (SRC / name).read_text().replace('</script>', '<\\/script>') + '\n</script>')
    # Outside connections are blocked on Claude; the page uses its shared store.
    html = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/(peerjs|mqtt|@supabase)[^"]*"></script>\n?', '', html)
    # The platform wraps the page in its own doctype/head/body.
    html = re.sub(r'<!DOCTYPE html>\n?|<html[^>]*>\n?|</?head>\n?|</?body>\n?|</html>\n?', '', html)
    html = re.sub(r'<meta [^>]*>\n?', '', html)
    for old, new in BRANDING:
        html = html.replace(old, new)
    leftover = [m for m in re.findall(r'.{0,40}(?:WSOP|World Series|WORLD SERIES).{0,40}', html)
                if not re.search(r'window\.WSOP|root\.WSOP|WSOP_BOTS|wsop27|__wsop', m)]
    assert not leftover, leftover
    assert html.lstrip().startswith('<title>'), 'title must lead the page'
    Path(out).write_text(html)
    print(f'{out}: {len(html) // 1024} KB')


if __name__ == '__main__':
    build(sys.argv[1] if len(sys.argv) > 1 else 'final-table.html')
