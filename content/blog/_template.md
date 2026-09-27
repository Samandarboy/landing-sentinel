---
title: How a free pilot sets a liability cap to zero
description: A liability cap in one clause and a free pilot in another can quietly cancel each other out. Here is how to spot it, and how Sentinel proves it.
date: 2026-10-01
slug: free-pilot-liability-cap
author: Sentinel
draft: true
---
# This file is the template for a post

Copy it to a new file in this folder (the name does not start with "_"), fill in the front matter
above, delete `draft: true`, write the post in Markdown, then run:

    python tools/build_pages.py

That builds `/blog/<slug>/`, adds the post to `/blog/`, to `/blog/rss.xml` and to `/sitemap.xml`.
The heading at the top of the file (this line's "#") is dropped: the page takes its title from
`title` above. Use `##` and `###` for the sections of the post.

## Writing for search

- **title**: what someone would type, in about 60 characters. It becomes the page's `<title>`,
  its heading and its link preview.
- **description**: one or two sentences, about 155 characters. Search results show it under the title.
- **slug**: short, lower-case, words joined by hyphens. Changing it later breaks existing links.
- **date**: when it goes live (YYYY-MM-DD). Add `updated:` when you change a post materially.

## What Markdown works

Paragraphs, **bold**, *italic*, [links](/#how), lists, `code`, tables, block quotes and
fenced code blocks. Images: put them in `site/blog/media/` and write `![what it shows](/blog/media/name.png)`.
