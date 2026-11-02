// One module of Octet Draw (Apache-2.0, © 2026 Sam Ellis) and what it imports, as one script for the page, unchanged:
// TypeScript's transpileModule only takes the types (and the comments) out of each file, and the files are wrapped with a
// small require of their own. The result defines window.GLOBAL = { the exports named }.
// usage: node tools/bundle_octet.cjs OCTET_SRC_DIR ENTRY.ts[,ENTRY2.ts] GLOBAL export1,export2 "what it is" OUT.js
// e.g.   node tools/bundle_octet.cjs ../octet/src condensed.ts OctetCondensed condensedSmiles "condensed formula reader" names/octet-condensed.js
//        node tools/bundle_octet.cjs ../octet/src namer.ts,complexes.ts OctetNamer iupacName,iupacNameWhy,complexName "structure-to-name" names/octet-namer.js
const fs = require('fs'), path = require('path');
const ts = require(process.env.TS_PATH || 'typescript');
const [src, entry, glob, exps, what, out] = process.argv.slice(2);
const mods = new Map(), order = [];
function add(file) {
  file = path.resolve(file);
  if (mods.has(file)) return;
  mods.set(file, null);
  const text = fs.readFileSync(file, 'utf8');
  let js;
  if (file.endsWith('.json')) js = 'module.exports = ' + text + ';';
  else
    js = ts.transpileModule(text, {
      fileName: file,
      compilerOptions: { removeComments: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, verbatimModuleSyntax: false, rewriteRelativeImportExtensions: false }
    }).outputText;
  const deps = [];
  js = js.replace(/require\("(\.{1,2}\/[^"]+)"\)/g, (m, p) => {
    let f = path.resolve(path.dirname(file), p);
    if (!fs.existsSync(f)) for (const e of ['.ts', '.tsx', '.json']) if (fs.existsSync(f + e)) { f += e; break; }
    deps.push(f);
    return 'require(' + JSON.stringify(path.relative(src, f)) + ')';
  });
  mods.set(file, js);
  order.push(file);
  deps.forEach(add);
}
entry.split(',').forEach(e => add(path.join(src, e)));
let o = '/* Octet Draw (https://github.com/SamChemMan/Octet-Draw), Apache License 2.0, (c) 2026 Sam Ellis: its ' + what + '\n' +
  '   module, the files below with their types and comments taken out, otherwise unchanged. Modules: ' + order.map(f => path.relative(src, f)).join(', ') + ' */\n' +
  '(function () {\n  var defs = {}, cache = {};\n  function require(n) {\n    if (cache[n]) return cache[n].exports;\n    var m = (cache[n] = { exports: {} });\n    defs[n](m, m.exports, require);\n    return m.exports;\n  }\n';
for (const f of order) o += '  defs[' + JSON.stringify(path.relative(src, f)) + '] = function (module, exports, require) {\n' + mods.get(f) + '\n  };\n';
o += '  var n = Object.assign({}, ' + entry.split(',').map(e => 'require(' + JSON.stringify(e) + ')').join(', ') + ');\n  window.' + glob + ' = { ' + exps.split(',').map(e => e + ': n.' + e).join(', ') + ' };\n})();\n';
fs.writeFileSync(out, o);
console.log(out + ': ' + order.length + ' modules, ' + (o.length / 1e3).toFixed(0) + ' kB');
