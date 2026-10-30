"""Keep the two things that are derived from the pages in step with them.

1. The FAQPage JSON-LD in site/v2/index.html's head is rebuilt from the FAQ cards in
   its body, so the structured data can never say something the page does not.
   (v3's FAQ is written by hand in both places: edit its JSON-LD with its answers.)
2. site/index.html (the page served at the root) is a copy of site/v3/index.html
   that search engines may index. /v3/ itself stays noindex, so search sees one address.

Run it after every edit to site/v3/index.html or site/v2/index.html:

    python tools/sync_page.py          # rewrite both
    python tools/sync_page.py --check  # exit 1 if either is out of date
"""
import html
import io
import json
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
SRC = SITE / "v2" / "index.html"
HOME = SITE / "v3" / "index.html"
ROOT = SITE / "index.html"
NOINDEX = '<meta name="robots" content="noindex">'
INDEX = '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'

CARD = re.compile(r'<article class="qa">.*?<h3>(.*?)</h3>\s*<p>(.*?)</p>\s*</article>', re.S)
FAQ_LD = re.compile(r'(\{"@type":"FAQPage","mainEntity":)\[.*?\](\})(?=\s*\]\}\s*</script>)', re.S)


def text(fragment: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", fragment)).strip()


def with_faq(page: str) -> str:
    cards = CARD.findall(page)
    if not cards:
        raise SystemExit("no FAQ cards found in " + str(SRC))
    entries = [
        {"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": text(a)}}
        for q, a in cards
    ]
    body = ",\n  ".join(json.dumps(e, ensure_ascii=False, separators=(",", ":")) for e in entries)
    out, n = FAQ_LD.subn(lambda m: m.group(1) + "[\n  " + body + "\n ]" + m.group(2), page)
    if n != 1:
        raise SystemExit("FAQPage block not found in the JSON-LD")
    return out


def as_root(page: str) -> str:
    if NOINDEX not in page:
        raise SystemExit("no noindex line in " + str(HOME))
    return page.replace(NOINDEX, INDEX)


def main() -> int:
    check = "--check" in sys.argv
    page = io.open(SRC, encoding="utf-8").read()
    synced = with_faq(page)
    root = as_root(io.open(HOME, encoding="utf-8").read())
    stale = []
    if synced != page:
        stale.append(SRC)
    if not ROOT.exists() or io.open(ROOT, encoding="utf-8").read() != root:
        stale.append(ROOT)
    if check:
        for p in stale:
            print("out of date:", p)
        return 1 if stale else 0
    io.open(SRC, "w", encoding="utf-8", newline="\n").write(synced)
    io.open(ROOT, "w", encoding="utf-8", newline="\n").write(root)
    json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', synced, re.S).group(1))
    print("synced:", len(CARD.findall(synced)), "FAQ entries;", ROOT.name, "rebuilt")
    return 0


if __name__ == "__main__":
    sys.exit(main())
