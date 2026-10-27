# Embedding Reactio Draw in a web page

Any site — an electronic lab notebook, a course page, a database search form — can show Reactio Draw
in an `<iframe>` and talk to it from its own JavaScript. The page sends commands and gets the answers back
by `postMessage`. These are the same commands as the desktop apps' local API (`Local API.txt`).

## 1. Put the editor on the page

```html
<iframe id="rd" src="https://paivel.github.io/reactio-draw/web/index.html?embed"
        style="width:100%;height:640px;border:0"></iframe>
```

`?embed` gives the editor without its title bar and document tabs. It always starts with a blank sheet,
and the embedding site never sees the drawings the visitor saved while using Reactio Draw directly.

To make sure only your site can send commands, name it:
`index.html?embed&origin=https://my-eln.example.org`. Several sites are separated by commas.
Without `origin`, the editor answers whichever page embeds it, and nothing else.

To only show a structure, add `readonly`: `index.html?embed&readonly`. The toolbars and panels are hidden;
the visitor can move and zoom the drawing and copy it, but not change it. The `readOnly` command switches this on and off.

You can also host the editor yourself: copy the `web/` folder (the page and its NMR tables file) to your server and point the `src` at that copy. NMR prediction asks the visitor once before it downloads the tables.

## 2. Send commands

Send `{reactio: 1, id, op, args}` to the iframe; the answer comes back as `{reactio: 1, id, ok, result}`,
or `{reactio: 1, id, ok: false, error}`. The editor also sends events on its own:
`{reactio: 1, event: "ready", ops: [...]}` when it has loaded,
`{reactio: 1, event: "change"}` each time the drawing changes, and
`{reactio: 1, event: "selection"}` each time the selection changes (ask `selection` for what is selected).

```html
<script>
const frame = document.getElementById('rd');
const EDITOR = 'https://paivel.github.io';          // the origin of the iframe's src
let next = 0; const waiting = {};

window.addEventListener('message', e => {
  if (e.source !== frame.contentWindow || !e.data || e.data.reactio !== 1) return;
  const d = e.data;
  if (d.event === 'ready')  console.log('Reactio Draw is ready');
  if (d.event === 'change') console.log('the drawing changed');
  if (d.id && waiting[d.id]) { waiting[d.id](d); delete waiting[d.id]; }
});

/* rd('op', {args}) returns a Promise with the result */
function rd(op, args) {
  return new Promise((resolve, reject) => {
    const id = ++next;
    waiting[id] = d => d.ok ? resolve(d.result) : reject(new Error(d.error));
    frame.contentWindow.postMessage({ reactio: 1, id, op, args }, EDITOR);
  });
}
</script>
```

## 3. Commands

| Command | Arguments | Result |
| --- | --- | --- |
| `set` | `{text, format}` | replaces the whole drawing; `format` (smiles, mol, sdf, rxn, cdxml, json) is found from the text when left out |
| `addSmiles` | `{smiles, x, y}` | draws the structure (R/S from `@`/`@@` become wedges; a CXSMILES part such as `\|&1:1\|` sets stereo groups) |
| `import` | `{format: "smiles"\|"mol"\|"rxn"\|"sdf"\|"cdxml"\|"cif"\|"xyz", text}` | adds the structures from the text (`cif`: crystal structures, a test version; `xyz`: 3D coordinates) |
| `export` | `{format: "smiles"\|"mol"\|"sdf"\|"rxn"\|"cdxml"\|"xyz"\|"svg"\|"json"}` | the drawing in that format (`xyz`: every structure in 3D with hydrogens) |
| `image` | `{text, format, output: "svg"\|"png", scale}` | a picture of any structure or reaction, without touching the sheet (PNG as base64) |
| `picture` | `{scale}` | the sheet as a PNG (base64) |
| `readOnly` | `{on: true\|false}` | view only, or editable again |
| `selection` | — | what is selected: structure indices, counts, SMILES |
| `select` | `{index}`, `{indices: [...]}`, `{all: true}` or — | selects structures, everything, or nothing |
| `atoms` | `{index}` | the atoms of a structure, numbered from 1 |
| `highlight` | `{index, atoms: [n...], color}` or `{index, clear: true}` | colours atoms and the bonds between them (whole structure without `atoms`; no `index`: every structure) |
| `check` | — | valence errors, unreadable labels and structure checks (overlapping or stray atoms, wedges not at stereocentres or contradicting, odd bond lengths, straight double bonds), per structure, each with a level `err`, `warn` or `hint`; `ok` ignores hints |
| `saved`, `markSaved` | — | whether there are unsaved changes; mark the drawing as saved |
| `zoom` | `{value}` (1 = 100 %) or `{fit: true}` | zoom, or fit the drawing in the window |
| `list` | — | every structure: canonical SMILES, formula, MW, exact mass, role |
| `properties` | `{index}` | one structure in detail (isotope pattern, elemental analysis) |
| `calc` | `{smiles}` | formula, MW, exact mass, [M+H]+ of a SMILES, without drawing it |
| `scheme` | — | the reaction: reactants, products, reaction SMILES |
| `table` | — | the reagent table (equivalents, masses, volumes, yield) |
| `setAmount` | `{formula\|name\|id, field, value}` | fills a cell of the reagent table |
| `clean` | `{what: "reaction"}`, `{flat: true}` or — | Clean Up Reaction, Clean Up 2D (flat), or Clean Up Structure |
| `setRole`, `setStyle`, `addReaction`, `addText`, `delete`, `undo`, `redo`, `clear` | | editing |
| `nmr` | `{nucleus: "1H"\|"13C"\|"19F"\|"31P", index}` | predicted shifts |
| `inchi` | `{index}` or `{smiles}` | InChI and InChIKey |
| `smilesFromName` | `{name}` | SMILES from a common or systematic name (systematic: desktop apps only) |
| `addName` | `{name, x, y}` | draws the structure for a name |
| `name` | `{index}` or `{smiles}` | IUPAC name, with `checkedByOpsin` (desktop apps only) |
| `addChart` | `{slices: [{label, value, color, showPercent}], x, y, size, hole, start, counterclockwise, labels, gaps, legend, percentages, decimals, textSize}` | draws a product-ratio chart |
| `addRadar` | `{axes: [{label, value}], x, y, size, min, max, step, shape, zones, color, fill, textSize}` | draws a sensitivity screen |
| `prefixStyle` | `{mode: "plain"\|"italic"\|"sup"}` | how t, i, s, n of tBu, iPr… are written |
| `help` | — | the list of commands |
| `version` | — | `{name, version}` of this Reactio Draw |

SMILES in the answers are canonical: the same structure gives the same SMILES however it was drawn,
and they carry the drawn stereochemistry. Names: the built-in list of about 600 common names and abbreviations (THF, DIPEA, AIBN, aspirin…)
works everywhere, in a web page too. Other systematic names need the desktop apps: `addName` and
`smilesFromName` read them with OPSIN, and `name` (structure → IUPAC name) uses openclatura; in a web
page these two answer with an error for anything outside the list.

## 4. Examples

Show a structure from your database, let the user edit it, and read it back as a molfile:

```js
await rd('set', { text: 'CC(=O)Oc1ccccc1C(=O)O' });   // or a molfile from your database
// ... the user edits ...
const { mol } = await rd('export', { format: 'mol' });
```

A search form that takes whatever the user draws:

```js
document.getElementById('search').onclick = async () => {
  const { smiles } = await rd('export', { format: 'smiles' });
  location.href = '/search?q=' + encodeURIComponent(smiles);
};
```

Keep a hidden form field in step with the drawing:

```js
window.addEventListener('message', async e => {
  if (e.source === frame.contentWindow && e.data && e.data.event === 'change')
    document.getElementById('structure').value = (await rd('export', { format: 'smiles' })).smiles;
});
```

A picture for a list of results, without disturbing what is drawn:

```js
const { svg } = await rd('image', { text: molfileFromDatabase });
```

Show a hit with the matched atoms in colour, read-only:

```js
await rd('set', { text: hitMolfile });
await rd('highlight', { index: 0, atoms: [1, 2, 3, 7], color: '#ffcc00' });
await rd('readOnly', { on: true });
```

Warn before leaving with unsaved work, and after storing it:

```js
if (!(await rd('saved')).saved) { /* ask */ }
await rd('markSaved');
```

A working page with all of this is in `examples/embed.html`.
