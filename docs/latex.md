# Reactio Draw figures in LaTeX

**Copy for LaTeX** (File → Copy to clipboard → Figure for LaTeX, the button after Pages, or Edit → Copy for LaTeX
in the Mac app) turns the drawing into a LaTeX figure whose compound numbers match the text. Ordinary Copy
(Ctrl+C) is not changed.

## What it makes

For a drawing saved as `scheme.reactio` it writes, next to it:

- `scheme.pdf`: the drawing, without the texts that carry `[[key]]` compound marks;
- `scheme.tex`: a `tikzpicture` that places that PDF and sets those texts over it, each mark as chemnum's
  `\cmpd{key}`. The numbers are then given by LaTeX, in the order the compounds are first mentioned, and are
  the same on the drawing and in the text.

`[[key]]` becomes `\cmpd{key}`, `[[key.sub]]` and `[[key.sub.letter]]` become `\cmpd{key.sub}` (3a, 3b…).
Marks chemnum has no form for (`[[key.sub.num]]`, `[[key.sub.dash]]`, the series `[[A:key]]`…) are written
as the numbers they get on this drawing. A drawing without marks gets a `.tex` that only includes the PDF.

The first line of `scheme.tex` names the drawing it was made from:

```latex
% editable-figure source: scheme.reactio
```

A file name with spaces or other characters LaTeX dislikes is written with `_` in their place
(`My scheme.reactio` → `My_scheme.pdf`, `My_scheme.tex`). A drawing not saved yet as a
.reactio file (and anything copied in the web version, which cannot write files) sends the files inside the
clipboard instead (below); the LaTeX editor then keeps the copy of the drawing it gets.

## Using it without a LaTeX editor that pastes figures

Put `scheme.pdf` and `scheme.tex` in a folder of the project (for example `figures/`) and include the `.tex`
with the `import` package, so the PDF is found next to it:

```latex
\usepackage{graphicx}
\usepackage{tikz}
\usepackage{chemnum}
\usepackage{import}
...
\begin{figure}
  \centering
  \import{figures/}{scheme.tex}
  \caption{...}
\end{figure}
```

Refer to the compounds in the text with the same keys: `\cmpd{ketone}`. This works with pdfLaTeX, LuaLaTeX
and XeLaTeX, and on Overleaf.

## The clipboard (editable-figure manifest, version 1)

The clipboard gets two kinds of data:

- `text/plain`: the line that includes the figure, `\import{figures/}{scheme.tex}`;
- `text/html`: an element whose `data-editable-figure` attribute holds a JSON manifest.

```json
{"version": 1,
 "name": "scheme",
 "source": {"path": "/Users/me/paper/scheme.reactio"},
 "outputs": [{"path": "/Users/me/paper/scheme.pdf"}, {"path": "/Users/me/paper/scheme.tex"}],
 "entry": "scheme.tex",
 "packages": ["graphicx", "tikz", "chemnum"]}
```

From the desktop apps the source and the outputs are paths of files on disk. From the web version, or for a
drawing not saved yet, each is `{"name": "scheme.pdf", "data": "<base64>"}` instead. `entry` is the file to include; `packages` are
the packages it needs.
