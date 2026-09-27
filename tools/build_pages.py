"""Build the site's text pages from Markdown: the legal pages, the Security page and the blog.

Sources live in Landing/content/ (outside the web root):

    content/legal/privacy-policy.md    -> site/legal/privacy-policy/index.html
    content/legal/terms-of-service.md  -> site/legal/terms-of-service/index.html
    content/security.md                -> site/security/index.html
    content/blog/<name>.md             -> site/blog/<slug>/index.html   (one per post)
                                          site/blog/index.html          (the list, newest first)
                                          site/blog/rss.xml             (the feed)
    and every page above               -> site/sitemap.xml              (after the home page's own entry)

Each source starts with a front-matter block:

    ---
    title: A title of up to ~60 characters
    description: One or two sentences for search results and link previews (~155 characters).
    date: 2026-10-01          # blog posts: the publication date
    updated: 2026-10-03       # optional: the last material change (defaults to date)
    slug: my-post             # blog posts, optional: the URL name (defaults to the file name)
    draft: true               # blog posts, optional: kept out of every output
    ---

A blog file whose name starts with "_" (like content/blog/_template.md) is never published.

The page chrome (the dock, the phone menu, the footer) is lifted from site/v2/index.html, so the
text pages always carry the same nav and footer as the home page; its "#section" links are
pointed at the home page ("/#section").

Run it after every edit to a source, or to site/v2/index.html's nav or footer:

    python tools/build_pages.py          # write everything
    python tools/build_pages.py --check  # exit 1 if any output is out of date
"""
import datetime as dt
import html
import io
import json
import re
import sys
from email.utils import format_datetime
from pathlib import Path

import markdown

LANDING = Path(__file__).resolve().parent.parent
SITE = LANDING / "site"
CONTENT = LANDING / "content"
HOME = SITE / "v2" / "index.html"
BASE = "https://sentinel-lai.com"
ASSET_V = "20260927"

LEGAL = [
    # (source, output directory, eyebrow)
    ("legal/privacy-policy.md", "legal/privacy-policy", "Legal"),
    ("legal/terms-of-service.md", "legal/terms-of-service", "Legal"),
    ("security.md", "security", "Trust"),
]


# ---------------------------------------------------------------- sources

def read_source(path: Path):
    text = io.open(path, encoding="utf-8").read().replace("\r\n", "\n")
    meta = {}
    if text.startswith("---\n"):
        end = text.index("\n---\n", 4)
        for line in text[4:end].split("\n"):
            line = line.split(" #", 1)[0].rstrip()
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
        text = text[end + 5:]
    for key in ("title", "description"):
        if not meta.get(key):
            raise SystemExit(f"{path}: front matter needs a {key}")
    return meta, text


def day(value: str, path: Path) -> dt.date:
    try:
        return dt.date.fromisoformat(value)
    except (TypeError, ValueError):
        raise SystemExit(f"{path}: dates are written YYYY-MM-DD, got {value!r}")


def long_date(d: dt.date) -> str:
    return f"{d.day} {d.strftime('%B')} {d.year}"


def render(text: str):
    md = markdown.Markdown(
        extensions=["tables", "toc", "nl2br", "sane_lists", "attr_list", "fenced_code"],
        extension_configs={"toc": {"toc_depth": "2-2"}},
    )
    body = md.convert(text)
    toc = [(t["id"], t["name"]) for t in md.toc_tokens if t["level"] == 2]
    for t in md.toc_tokens:  # h1 at the top: its children are the h2s
        toc += [(c["id"], c["name"]) for c in t.get("children", []) if c["level"] == 2]
    # the lettered and numbered sub-items of a clause, "(a) ...", "(iv) ...", sit indented under it
    body = re.sub(r"<p>(\((?:[a-z]{1,2}|[ivx]+|\d+)\) )", r'<p class="li">\1', body)
    # a bare address becomes a contact link (contact.js shows it with a Copy button, so it works without a mail app)
    body = re.sub(r"(?<![\w.@/:\"])([\w.+-]+@[\w-]+(?:\.[\w-]+)+)(?![\w@])(?![^<]*</a>)",
                  r'<a href="mailto:\1" data-contact>\1</a>', body)
    # tables scroll sideways on a phone instead of widening the page
    body = body.replace("<table>", '<div class="table-wrap"><table>').replace("</table>", "</table></div>")
    return body, toc


# ---------------------------------------------------------------- chrome

def chrome():
    page = io.open(HOME, encoding="utf-8").read()
    def cut(start, end_tag):
        i = page.index(start)
        j = page.index(end_tag, i) + len(end_tag)
        return page[i:j]
    dock = cut('<header class="dock"', "</header>")
    menu = cut('<div class="mobile-menu"', "</div>")
    footer = cut('<footer class="footer">', "</footer>")
    def home_links(block):
        block = block.replace('href="#top"', 'href="/"')
        return re.sub(r'href="#', 'href="/#', block)
    footer = footer.replace(" data-stagger", "")
    return home_links(dock), home_links(menu), home_links(footer)


MARK = ('<svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" '
        'd="M45.99 10.61L0.76 91.88L35.45 71.76ZM50 0L55.82 72.89L50 100L44.18 72.89ZM54.01 10.61L64.55 71.76L99.24 91.88Z"/></svg>')


def page(*, url, title, description, body, og_type="website", ld=None, extra_head=""):
    dock, menu, footer = chrome()
    esc = html.escape
    full = f"{title} — Sentinel"
    ld_block = ""
    if ld:
        ld_block = '<script type="application/ld+json">\n' + json.dumps(ld, ensure_ascii=False, separators=(",", ":")) + "\n</script>\n"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(full)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{BASE}{url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#08090a">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Sentinel">
<meta property="og:locale" content="en_GB">
<meta property="og:url" content="{BASE}{url}">
<meta property="og:title" content="{esc(full)}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:image" content="{BASE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(full)}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{BASE}/og.png">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icons/icon-180.png">
<link rel="alternate" type="application/rss+xml" title="Sentinel blog" href="/blog/rss.xml">
{extra_head}{ld_block}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/v2/v2.css?v={ASSET_V}">
<link rel="stylesheet" href="/v2/pages.css?v={ASSET_V}">
</head>
<body class="textpage">
<!-- built by tools/build_pages.py from Landing/content: edit the source, not this file -->

{dock}

{menu}

<main id="top">
{body}
</main>

{footer}

<script src="/v2/dock.js?v={ASSET_V}"></script>
<script src="/v2/contact.js?v={ASSET_V}"></script>
</body>
</html>
"""


# ---------------------------------------------------------------- pages

def legal_pages():
    out = {}
    entries = []
    for src, where, eyebrow in LEGAL:
        path = CONTENT / src
        meta, text = read_source(path)
        updated = day(meta.get("updated"), path)
        body, toc = render(text)
        # everything above the first rule is the document's own heading block (name, company, dates)
        head, _, rest = body.partition("<hr />")
        if not rest:
            head, rest = "", body
        head = re.sub(r"<h1[^>]*>.*?</h1>\s*", "", head, flags=re.S)
        toc_html = "".join(f'<li><a href="#{i}">{n}</a></li>' for i, n in toc)
        url = f"/{where}/"
        doc = f"""  <article class="doc">
    <div class="container">
      <header class="doc-head">
        <div class="eyebrow">{eyebrow}</div>
        <h1 class="h1">{html.escape(meta['title'])}</h1>
        <div class="doc-meta">{head.strip()}</div>
      </header>
      <div class="doc-grid">
        <nav class="doc-toc" aria-label="On this page"><div class="eyebrow">On this page</div><ol>{toc_html}</ol></nav>
        <div class="prose">
{rest.strip()}
        </div>
      </div>
    </div>
  </article>"""
        ld = {"@context": "https://schema.org", "@type": "WebPage", "name": meta["title"], "url": BASE + url,
              "description": meta["description"], "dateModified": updated.isoformat(),
              "publisher": {"@type": "Organization", "name": "Sentinel", "url": BASE + "/"}}
        out[SITE / where / "index.html"] = page(url=url, title=meta["title"], description=meta["description"], body=doc, ld=ld)
        entries.append((url, updated, "yearly", "0.3"))
    return out, entries


def blog_posts():
    posts = []
    folder = CONTENT / "blog"
    for path in sorted(folder.glob("*.md")) if folder.exists() else []:
        if path.name.startswith("_") or path.name.lower() == "readme.md":
            continue
        meta, text = read_source(path)
        if meta.get("draft", "").lower() in ("true", "yes"):
            continue
        slug = meta.get("slug") or path.stem
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
            raise SystemExit(f"{path}: the slug {slug!r} must be lower-case words joined by hyphens")
        date = day(meta.get("date"), path)
        updated = day(meta.get("updated") or meta["date"], path)
        body, _ = render(text)
        body = re.sub(r"<h1[^>]*>.*?</h1>\s*", "", body, count=1, flags=re.S)  # the title is set by the template
        posts.append({"slug": slug, "title": meta["title"], "description": meta["description"],
                      "date": date, "updated": updated, "author": meta.get("author", "Sentinel"), "body": body})
    slugs = [p["slug"] for p in posts]
    dup = {s for s in slugs if slugs.count(s) > 1}
    if dup:
        raise SystemExit("two blog posts share a slug: " + ", ".join(sorted(dup)))
    posts.sort(key=lambda p: (p["date"], p["slug"]), reverse=True)
    return posts


def blog_pages(posts):
    out = {}
    entries = []
    esc = html.escape
    for p in posts:
        url = f"/blog/{p['slug']}/"
        body = f"""  <article class="doc post">
    <div class="container">
      <header class="doc-head post-head">
        <a class="link-arrow back" href="/blog/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>All posts</a>
        <h1 class="h1">{esc(p['title'])}</h1>
        <p class="post-lede">{esc(p['description'])}</p>
        <div class="post-meta"><time datetime="{p['date'].isoformat()}">{long_date(p['date'])}</time><span>{esc(p['author'])}</span></div>
      </header>
      <div class="prose post-body">
{p['body']}
      </div>
      <aside class="post-cta">
        <div class="eyebrow">Sentinel</div>
        <p>Sentinel finds how your contract breaks, and proves it, clause by clause.</p>
        <a class="btn" href="/#demo">Book a demo</a>
      </aside>
    </div>
  </article>"""
        ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"],
              "description": p["description"], "url": BASE + url, "mainEntityOfPage": BASE + url,
              "datePublished": p["date"].isoformat(), "dateModified": p["updated"].isoformat(),
              "author": {"@type": "Organization", "name": p["author"]} if p["author"] == "Sentinel" else {"@type": "Person", "name": p["author"]},
              "publisher": {"@type": "Organization", "name": "Sentinel", "logo": {"@type": "ImageObject", "url": BASE + "/icons/logo-512.png"}},
              "image": BASE + "/og.png"}
        extra = (f'<meta property="article:published_time" content="{p["date"].isoformat()}">\n'
                 f'<meta property="article:modified_time" content="{p["updated"].isoformat()}">\n')
        out[SITE / "blog" / p["slug"] / "index.html"] = page(url=url, title=p["title"], description=p["description"],
                                                             body=body, og_type="article", ld=ld, extra_head=extra)
        entries.append((url, p["updated"], "monthly", "0.6"))

    if posts:
        items = "\n".join(
            f"""          <li><a class="post-card" href="/blog/{p['slug']}/">
            <time datetime="{p['date'].isoformat()}">{long_date(p['date'])}</time>
            <h2>{esc(p['title'])}</h2>
            <p>{esc(p['description'])}</p>
            <span class="link-arrow">Read <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
          </a></li>""" for p in posts)
        listing = f'        <ol class="post-list">\n{items}\n        </ol>'
    else:
        listing = """        <div class="blog-empty">
          <div class="blog-empty-mark" aria-hidden="true">""" + MARK + """</div>
          <h2>The first posts are on the way.</h2>
          <p>Notes on how contracts break, how we prove it, and what we learn from the agreements we read. Until then, the fastest way to see Sentinel is to watch it work on one of yours.</p>
          <div class="blog-empty-ctas"><a class="btn" href="/#demo">Book a demo</a><a class="link-arrow" href="/blog/rss.xml">Follow the feed <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>
        </div>"""
    body = f"""  <section class="doc blog">
    <div class="container">
      <header class="doc-head">
        <div class="eyebrow">Blog</div>
        <h1 class="h1">Notes from Sentinel.</h1>
        <p class="post-lede">How contracts break, and how to prove it.</p>
      </header>
{listing}
    </div>
  </section>"""
    ld = {"@context": "https://schema.org", "@type": "Blog", "name": "Sentinel blog", "url": BASE + "/blog/",
          "publisher": {"@type": "Organization", "name": "Sentinel", "url": BASE + "/"},
          "blogPost": [{"@type": "BlogPosting", "headline": p["title"], "url": f"{BASE}/blog/{p['slug']}/",
                        "datePublished": p["date"].isoformat()} for p in posts]}
    out[SITE / "blog" / "index.html"] = page(url="/blog/", title="Blog", body=body, ld=ld,
                                             description="Notes from Sentinel on adversarial contract review: how contracts break, and how to prove it, clause by clause.")
    newest = max((p["updated"] for p in posts), default=None)
    entries.insert(0, ("/blog/", newest, "weekly", "0.7"))
    out[SITE / "blog" / "rss.xml"] = rss(posts)
    return out, entries


def rss(posts):
    esc = html.escape
    def when(d):
        return format_datetime(dt.datetime(d.year, d.month, d.day, 9, 0, tzinfo=dt.timezone.utc))
    items = "".join(f"""
    <item>
      <title>{esc(p['title'])}</title>
      <link>{BASE}/blog/{p['slug']}/</link>
      <guid isPermaLink="true">{BASE}/blog/{p['slug']}/</guid>
      <pubDate>{when(p['date'])}</pubDate>
      <description>{esc(p['description'])}</description>
    </item>""" for p in posts)
    last = f"\n    <lastBuildDate>{when(posts[0]['date'])}</lastBuildDate>" if posts else ""
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Sentinel blog</title>
    <link>{BASE}/blog/</link>
    <description>Notes from Sentinel on adversarial contract review: how contracts break, and how to prove it.</description>
    <language>en-gb</language>{last}
    <atom:link href="{BASE}/blog/rss.xml" rel="self" type="application/rss+xml"/>{items}
  </channel>
</rss>
"""


def sitemap(entries):
    path = SITE / "sitemap.xml"
    text = io.open(path, encoding="utf-8").read()
    home = re.search(r"  <url>\s*<loc>" + re.escape(BASE) + r"/</loc>.*?</url>\n", text, re.S)
    if not home:
        raise SystemExit("sitemap.xml: the home page's <url> entry is missing")
    rows = []
    for url, lastmod, freq, prio in entries:
        mod = f"\n    <lastmod>{lastmod.isoformat()}</lastmod>" if lastmod else ""
        rows.append(f"  <url>\n    <loc>{BASE}{url}</loc>{mod}\n    <changefreq>{freq}</changefreq>\n    <priority>{prio}</priority>\n  </url>\n")
    head = text[:text.index("<urlset")]
    open_tag = re.search(r"<urlset[^>]*>\n", text).group(0)
    return head + open_tag + home.group(0) + "".join(rows) + "</urlset>\n"


def main() -> int:
    check = "--check" in sys.argv
    outputs, entries = legal_pages()
    posts = blog_posts()
    blog_out, blog_entries = blog_pages(posts)
    outputs.update(blog_out)
    outputs[SITE / "sitemap.xml"] = sitemap(entries + blog_entries)
    # a post whose source was removed (or renamed) leaves no page behind
    live = {SITE / "blog" / p["slug"] for p in posts}
    orphans = [d for d in (SITE / "blog").glob("*/") if d.is_dir() and d not in live and d.name != "media"] if (SITE / "blog").exists() else []
    stale = [p for p, s in outputs.items() if not p.exists() or io.open(p, encoding="utf-8").read() != s]
    if check:
        for p in stale:
            print("stale:", p.relative_to(LANDING))
        for d in orphans:
            print("orphan (no source):", d.relative_to(LANDING))
        return 1 if stale or orphans else 0
    for p in stale:
        p.parent.mkdir(parents=True, exist_ok=True)
        io.open(p, "w", encoding="utf-8", newline="\n").write(outputs[p])
    for d in orphans:
        for f in d.glob("*"):
            f.unlink()
        d.rmdir()
    print(f"built: {len(outputs)} files ({len(stale)} changed), {len(posts)} blog post(s), {len(orphans)} orphan(s) removed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
