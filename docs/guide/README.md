# Source of "Reactio Draw - Getting started.pdf"

`guide.html` is the master of the guide. The PDF in `docs/` and `guide.docx`
here are built from it; do not edit them by hand.

| File | What it is |
| --- | --- |
| `guide.html` | the whole guide: text, tables, code and the place and size of every picture; the styles are at the top of the file |
| `img/` | the pictures: `btn-<name>` are the toolbar buttons shown in the text, `pNN-M` the screenshots and drawings (NN is the page they were on when the source was made, M their order on that page) |
| `build.sh` | builds `docs/Reactio Draw - Getting started.pdf` (Chromium, through Playwright) and `guide.docx` (LibreOffice) |
| `guide.docx` | a Word version for those who prefer Word; made by `build.sh`, not edited |

## Build

```sh
docs/guide/build.sh          # the PDF and guide.docx
docs/guide/build.sh --pdf    # the PDF only
```

It needs Node with the `playwright` package and its Chromium (`require('playwright')`
must work), LibreOffice (`soffice`) for the .docx, and the fonts Liberation Sans,
DejaVu Sans Mono, DejaVu Sans, Inter and Noto Color Emoji (the symbols ⌘ ⌥ ⌃ ⋮ ⌨
come from the last three). With another font the lines and pages break elsewhere.
`GUIDE_PDF=/some/where.pdf docs/guide/build.sh --pdf` writes the PDF somewhere else,
for example to compare it with the one in `docs/`.

The page is A4 with 2 cm margins and the page number at the bottom
("Reactio Draw — Getting started · N"); both are set in `build.sh`. The margins are
given in whole pixels (75–78 px) because Chromium rounds them anyway; the right one
is 2 px wider so that the lines break where they did in the earlier LibreOffice PDF.
`build.sh` also keeps a paragraph of three lines or fewer on one page.

## Editing

Write plain HTML, one block per line, as the file already is:

- `<h1>` a chapter (`class="new-page"` starts it on a new page), `<h2>` a section,
  `<h3>` a subsection; `<b>` for bold, `<code>` for code in the text, `<pre>` for a
  code block; `<ul><li>` for a list (`<ul class="dash">` inside an item for a list
  with dashes).
- Symbols and sub/superscripts are typed as Unicode characters (→ ≤ ° ± η ′ ₂ ⁺ ¹H),
  not as `<sub>`/`<sup>`.
- A picture in the text: `<img src="img/btn-x.jpg" alt="…" style="width:21.75pt;">`
  followed by `&nbsp; ` and the text. A picture on its own: `<p class="pic"><img …></p>`;
  `class="pic inset"` indents it a little, `class="pic keep"` keeps it on the page of the
  caption under it. Give the width in pt; the height follows from the picture.
- Space above a paragraph is 6 pt; `gap-0`, `gap-2`, `gap-3`, `gap-4`, `gap-8`, `gap-10`
  set another (in pt).
- Tables: `<table class="grid">` with a `<colgroup>` of column widths in pt and the
  header row in `<thead>` (it is repeated on the next page). A cell that holds only
  code is `<td class="code">`.
- New screenshots of Reactio Draw: take them from the page with Playwright at
  `deviceScaleFactor: 2` and give them about half their pixel width in pt.

After an edit, build and look at the pages that changed:

```sh
pdftoppm -r 60 -png "docs/Reactio Draw - Getting started.pdf" /tmp/guide
pdftotext "docs/Reactio Draw - Getting started.pdf" - | less
```

## Where it came from

The guide used to exist only as a PDF made with LibreOffice Writer 24.2. In 1.14 it
was recreated from that PDF: the text, bold and code runs, headings, lists and tables
from its tagged structure, the pictures with their original pixels, and the look
measured from the pages. The first PDF built from this source matches the old one
word for word.
