# Reactio Draw figures in LaTeX

**Copy for LaTeX** (File → Copy to clipboard → Figure for LaTeX, the button after Pages, or Edit → Copy for LaTeX
in the Mac app) turns the drawing into a LaTeX figure whose compound numbers match the text. Ordinary Copy
(Ctrl+C) is not changed.

Pasted into [Lattice](https://github.com/leo1oel/lattice), the figure brings its files: they are
copied into `figures/`, the `\input` line goes in, and the preamble lines it needs are added.

In any other LaTeX editor the paste gives only the `figure` block with `\input`. Copy the `.tex` and `.pdf` written beside
the saved drawing into the project's `figures/` folder, and add `graphicx`, `tikz` and `chemnum` to the preamble, with
the `\rcmpd` block from [LaTeX marks](latex-marks.md#using-marks-outside-lattice) if the figure has marks. An unsaved drawing writes no files, so save it first.

The clipboard format is open and described in Lattice's
[`docs/editable-figures.md`](https://github.com/leo1oel/lattice/blob/main/docs/editable-figures.md), for other editors to support.

## What it makes

For a drawing saved as `scheme.reactio` it writes, next to it:

- `scheme.pdf`: the drawing, without the texts that carry `[[key]]` compound marks;
- `scheme.tex`: a `tikzpicture` that places that PDF and sets those texts over it, each mark as
  `\rcmpd{key}` (numbered by chemnum). The numbers are then given by LaTeX, in the order the compounds are first mentioned, and are
  the same on the drawing and in the text.

Each mark becomes `\rcmpd{…}` with the mark's own text: `[[amine.a.num]]` is `\rcmpd{amine.a.num}`, `[[A:cat]]` is
`\rcmpd{A:cat}`. The text writes the same, in any order. The definition of `\rcmpd` is a short block for the preamble, carried by
the manifest in `preamble`; a LaTeX editor adds it once. The number style and chapters of a LaTeX document are
set with `\setchemnum` in its preamble (`[[#format …]]` and `[[#start …]]` apply to Word). A drawing without marks gets a `.tex` that only includes the PDF.

The first line of `scheme.tex` names the drawing it was made from:

```latex
% editable-figure source: scheme.reactio
```

A file name with spaces or other characters LaTeX dislikes is written with `_` in their place
(`My scheme.reactio` → `My_scheme.pdf`, `My_scheme.tex`). A drawing not saved yet as a
.reactio file (and anything copied in the web version, which cannot write files) sends the files inside the
clipboard instead (below); the LaTeX editor then keeps the copy of the drawing it gets.

Every kind of mark, with what to write and what gets printed: [latex-marks.md](latex-marks.md).

## Using it without a LaTeX editor that pastes figures

Put `scheme.pdf` and `scheme.tex` in a folder of the project (for example `figures/`), name that folder in
`\graphicspath` so the PDF is found, and include the `.tex`:

```latex
\usepackage{graphicx}
\usepackage{tikz}
\usepackage{chemnum}
\graphicspath{{figures/}}
...
\begin{figure}
  \centering
  \input{figures/scheme}
  \caption{...}
\end{figure}
```

Refer to the compounds in the text with the same marks: `\rcmpd{ketone}`. This works with pdfLaTeX, LuaLaTeX
and XeLaTeX, and on Overleaf.

## The clipboard (editable-figure manifest, version 1)

The clipboard gets two kinds of data:

- `text/plain`: a `figure` that includes it with `\input{figures/scheme}`, with an empty `\caption{}` and `\label{fig:}` to fill in;
- `text/html`: an element whose `data-editable-figure` attribute holds a JSON manifest.

```json
{"version": 1,
 "name": "scheme",
 "source": {"name": "scheme.reactio", "data": "<base64>"},
 "outputs": [{"name": "scheme.pdf", "data": "<base64>"}, {"name": "scheme.tex", "data": "<base64>"}],
 "entry": "scheme.tex",
 "packages": ["graphicx", "tikz", "chemnum"]}
```

The files always travel inside the manifest, as base64, never as paths on disk.
`entry` is the file to include; `packages` are
the packages it needs. `preamble`, when present, lists whole lines the entry needs before `\begin{document}`.
