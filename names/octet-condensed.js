/* Octet Draw (https://github.com/SamChemMan/Octet-Draw), Apache License 2.0, (c) 2026 Sam Ellis: its condensed formula reader
   module, the files below with their types and comments taken out, otherwise unchanged. Modules: condensed.ts, labels.ts */
(function () {
  var defs = {}, cache = {};
  function require(n) {
    if (cache[n]) return cache[n].exports;
    var m = (cache[n] = { exports: {} });
    defs[n](m, m.exports, require);
    return m.exports;
  }
  defs["condensed.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.condensedSmiles = condensedSmiles;
const labels_ts_1 = require("labels.ts");
const VALENCE = {
    B: [3], C: [4], N: [3], O: [2], F: [1], Si: [4], P: [5, 3], S: [6, 4, 2], Cl: [1], Br: [1], I: [1], Se: [2], Ge: [4], Sn: [4],
    Li: [1], Na: [1], K: [1], Mg: [2], Zn: [2], Al: [3], Hg: [2],
};
const SPECIAL = { NO2: "[N+](=O)[O-]", N3: "N=[N+]=[N-]" };
const WRITTEN = [[/C6H5(?!\d)/g, "Ph"], [/C2H5(?!\d)/g, "Et"], [/C6H11(?!\d)/g, "Cy"]];
function condensedSmiles(text) {
    const s = text.trim();
    if (s.length > 100 || !/^[A-Za-z0-9()=≡-]+$/.test(s) || !/[A-Z]/.test(s))
        return undefined;
    let w = s;
    for (const [re, group] of WRITTEN)
        w = w.replace(re, group);
    const tokens = tokenise(w);
    if (!tokens || !/H|[a-z]/.test(w) || !tokens.some((t) => t.t !== "bond"))
        return undefined;
    const g = assemble(tokens, 0);
    return g && smilesOf(g);
}
function tokenise(text, depth = 0) {
    if (depth > 3)
        return undefined;
    const out = [];
    let i = 0, leadH = 0;
    const count = () => { const m = /^\d{1,2}/.exec(text.slice(i)); i += m?.[0].length ?? 0; return m ? Number(m[0]) : 1; };
    const push = (t, n) => { for (let k = 0; k < n; k++)
        out.push(k ? structuredClone(t) : t); };
    while (i < text.length) {
        const c = text[i];
        if (c === "(") {
            let d = 0, j = i;
            for (; j < text.length; j++) {
                if (text[j] === "(")
                    d++;
                else if (text[j] === ")" && !--d)
                    break;
            }
            if (j >= text.length)
                return undefined;
            const body = text.slice(i + 1, j);
            i = j + 1;
            const n = count();
            if (body.startsWith("=")) {
                const inner = tokenise(body.slice(1), depth + 1);
                if (!inner || inner.length !== 1 || inner[0].t !== "atom")
                    return undefined;
                for (let k = 0; k < n; k++)
                    out.push({ t: "branch" }, structuredClone(inner[0]));
                continue;
            }
            const inner = SPECIAL[body] ? [{ t: "group", smiles: SPECIAL[body] }] : tokenise(body, depth + 1);
            if (!inner?.length)
                return undefined;
            push({ t: "bracket", inner, text: body }, n);
            continue;
        }
        if (c === "-" || c === "=" || c === "≡") {
            out.push({ t: "bond", order: c === "-" ? 1 : c === "=" ? 2 : 3 });
            i++;
            continue;
        }
        const special = Object.keys(SPECIAL).find((k) => text.startsWith(k, i) && !/^[a-z0-9]/.test(text[i + k.length] ?? ""));
        if (special) {
            i += special.length;
            out.push({ t: "group", smiles: SPECIAL[special] });
            continue;
        }
        const [u] = (0, labels_ts_1.units)(text.slice(i).match(/^[a-z]?[A-Z][a-z]*\d*/)?.[0] ?? "");
        if (!u)
            return undefined;
        i += u.text.length + (u.count?.length ?? 0);
        const n = Number(u.count ?? 1);
        if (u.kind === "group") {
            if (u.text === "Ar" || !labels_ts_1.GROUPS[u.text])
                return undefined;
            push({ t: "group", smiles: labels_ts_1.GROUPS[u.text] }, n);
        }
        else if (u.kind === "element" && u.text === "H") {
            const last = out[out.length - 1];
            if (last?.t === "atom")
                last.h += n;
            else if (!out.some((t) => t.t !== "bond"))
                leadH += n;
            else
                return undefined;
        }
        else if (u.kind === "element" && labels_ts_1.ELEMENTS.has(u.text) && VALENCE[u.text]) {
            push({ t: "atom", el: u.text, h: leadH }, 1);
            leadH = 0;
            for (let k = 1; k < n; k++)
                out.push({ t: "atom", el: u.text, h: 0 });
        }
        else
            return undefined;
    }
    return leadH ? undefined : out;
}
function assemble(tokens, open) {
    let tries = 0;
    const start = { nodes: [], bonds: [], cur: -1, pending: [] };
    const copy = (st) => ({ nodes: st.nodes.map((n) => ({ ...n })), bonds: st.bonds.map((b) => ({ ...b })), cur: st.cur, pending: [...st.pending], next: st.next });
    const bond = (st, a, b, order, fixed) => {
        st.bonds.push({ a, b, order, fixed });
        st.nodes[a].deg += order;
        st.nodes[b].deg += order;
        return st.nodes[a].deg <= st.nodes[a].val && st.nodes[b].deg <= st.nodes[b].val;
    };
    const chain = (st, i) => {
        let ok = true;
        if (st.cur >= 0)
            ok = bond(st, st.cur, i, st.next ?? 1, st.next !== undefined);
        st.next = undefined;
        for (const p of st.pending)
            ok && (ok = bond(st, i, p, 1, true));
        st.pending = [];
        st.cur = i;
        return ok;
    };
    const substituent = (st, i) => (st.cur >= 0 && st.next === undefined ? bond(st, st.cur, i, 1, true) : (st.pending.push(i), true));
    function* readings(st, k) {
        if (++tries > 20000 || st.nodes.length > 100)
            return;
        if (k === tokens.length) {
            yield st;
            return;
        }
        const t = tokens[k];
        if (t.t === "bond") {
            if (st.cur < 0 || st.next !== undefined)
                return;
            const n = copy(st);
            n.next = t.order;
            yield* readings(n, k + 1);
        }
        else if (t.t === "branch") {
            const a = tokens[k + 1];
            if (st.cur < 0 || a?.t !== "atom")
                return;
            for (const val of VALENCE[a.el]) {
                if (val - a.h !== 2)
                    continue;
                const n = copy(st), i = n.nodes.push({ el: a.el, h: a.h, val: 2, deg: 0 }) - 1;
                if (bond(n, n.cur, i, 2, true))
                    yield* readings(n, k + 2);
            }
        }
        else if (t.t === "group") {
            const n = copy(st), i = n.nodes.push({ smiles: t.smiles, h: 0, val: 1, deg: 0 }) - 1;
            if (substituent(n, i))
                yield* readings(n, k + 1);
        }
        else if (t.t === "bracket") {
            const inner = assembleBracket(t.inner);
            if (!inner)
                return;
            const n = copy(st), base = n.nodes.length;
            n.nodes.push(...inner.state.nodes.map((x) => ({ ...x })));
            for (const b of inner.state.bonds)
                n.bonds.push({ ...b, a: b.a + base, b: b.b + base, fixed: true });
            const [first, last] = inner.ends.map((e) => e + base);
            if (inner.ends.length === 1 ? substituent(n, first) : chain(n, first) && ((n.cur = last), true))
                yield* readings(n, k + 1);
        }
        else {
            for (const val of VALENCE[t.el]) {
                const free = val - t.h;
                if (free < 0)
                    continue;
                if (free === 2 && st.cur >= 0 && st.next === undefined && /^(O|S|Se)$/.test(t.el)) {
                    const n = copy(st), i = n.nodes.push({ el: t.el, h: t.h, val: free, deg: 0 }) - 1;
                    if (bond(n, n.cur, i, 2, true))
                        yield* readings(n, k + 1);
                }
                const n = copy(st), i = n.nodes.push({ el: t.el, h: t.h, val: free, deg: 0 }) - 1;
                const ok = free === 1 && st.cur >= 0 && st.next === undefined ? substituent(n, i) : chain(n, i);
                if (ok)
                    yield* readings(n, k + 1);
            }
        }
    }
    for (const st of readings(start, 0)) {
        if (!open && st.cur < 0 && st.pending.length === 2) {
            bond(st, st.pending[0], st.pending[1], 1, true);
            st.pending = [];
        }
        if (st.pending.length || st.next !== undefined || !st.nodes.length)
            continue;
        if (open) {
            if (spare(st) === open)
                return st;
            continue;
        }
        for (const b of st.bonds) {
            if (b.fixed)
                continue;
            const add = Math.min(st.nodes[b.a].val - st.nodes[b.a].deg, st.nodes[b.b].val - st.nodes[b.b].deg, 3 - b.order);
            if (add > 0) {
                b.order += add;
                st.nodes[b.a].deg += add;
                st.nodes[b.b].deg += add;
            }
        }
        if (st.nodes.every((n) => n.deg === n.val))
            return st;
    }
    return undefined;
}
const spare = (st) => st.nodes.reduce((s, n) => s + n.val - n.deg, 0);
function assembleBracket(tokens) {
    if (tokens.length === 1 && tokens[0].t === "group")
        return { state: { nodes: [{ smiles: tokens[0].smiles, h: 0, val: 1, deg: 0 }], bonds: [], cur: 0, pending: [] }, ends: [0] };
    for (const open of [1, 2]) {
        const st = assemble(tokens, open);
        if (!st)
            continue;
        const ends = st.nodes.flatMap((n, i) => Array(n.val - n.deg).fill(i));
        return { state: st, ends: open === 1 ? ends : [ends[0], ends[1]] };
    }
    return undefined;
}
const FIRST_ATOM = /^(?:\[[^\]]+\]|Cl|Br|[BCNOPSFIbcnops])/;
function smilesOf(st) {
    if (st.nodes.every((n) => n.smiles)) {
        const [a, b] = st.nodes.map((n) => n.smiles), head = st.nodes.length === 2 ? FIRST_ATOM.exec(b)?.[0] : undefined;
        return head && `${head}(${a})${b.slice(head.length)}`;
    }
    const root = st.nodes.findIndex((n) => n.el);
    const near = st.nodes.map(() => []);
    for (const b of st.bonds) {
        near[b.a].push({ to: b.b, order: b.order });
        near[b.b].push({ to: b.a, order: b.order });
    }
    const seen = new Set();
    const write = (i) => {
        seen.add(i);
        const n = st.nodes[i];
        if (n.smiles)
            return n.smiles;
        const kids = near[i].filter((x) => !seen.has(x.to)).map((x) => { seen.add(x.to); return x; });
        const parts = kids.map((x) => `${["", "", "=", "#"][x.order]}${write(x.to)}`);
        return `[${n.el}${n.h ? `H${n.h > 1 ? n.h : ""}` : ""}]` + parts.map((p, k) => (k < parts.length - 1 ? `(${p})` : p)).join("");
    };
    const out = write(root);
    return seen.size === st.nodes.length ? out : undefined;
}

  };
  defs["labels.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isElement = exports.isGeneric = exports.GENERICS = exports.GROUPS = exports.ELEMENTS = void 0;
exports.units = units;
exports.anchorElement = anchorElement;
exports.writtenOxidation = writtenOxidation;
exports.labelSmiles = labelSmiles;
exports.formulaRuns = formulaRuns;
const SYMBOLS = ("H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr " +
    "Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt " +
    "Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og D T").split(" ");
exports.ELEMENTS = new Set(SYMBOLS);
exports.GROUPS = {
    Me: "C", Et: "CC", Pr: "CCC", iPr: "C(C)C", nPr: "CCC", Bu: "CCCC", nBu: "CCCC", iBu: "CC(C)C", sBu: "C(C)CC", tBu: "C(C)(C)C",
    Ph: "c1ccccc1", Bn: "Cc1ccccc1", Ar: "c1ccccc1", Ac: "C(C)=O", Bz: "C(=O)c1ccccc1", Piv: "C(=O)C(C)(C)C",
    Boc: "C(=O)OC(C)(C)C", Cbz: "C(=O)OCc1ccccc1", Fmoc: "C(=O)OCC1c2ccccc2-c2ccccc21", Alloc: "C(=O)OCC=C", Troc: "C(=O)OCC(Cl)(Cl)Cl",
    Ts: "S(=O)(=O)c1ccc(C)cc1", Ms: "S(C)(=O)=O", Tf: "S(=O)(=O)C(F)(F)F", Ns: "S(=O)(=O)c1ccc([N+](=O)[O-])cc1",
    TMS: "[Si](C)(C)C", TES: "[Si](CC)(CC)CC", TBS: "[Si](C)(C)C(C)(C)C", TBDMS: "[Si](C)(C)C(C)(C)C",
    TIPS: "[Si](C(C)C)(C(C)C)C(C)C", TBDPS: "[Si](c1ccccc1)(c1ccccc1)C(C)(C)C",
    PMB: "Cc1ccc(OC)cc1", PMP: "c1ccc(OC)cc1", MOM: "COC", THP: "C1CCCCO1", Tr: "C(c1ccccc1)(c1ccccc1)c1ccccc1",
    Cp: "C1C=CC=C1", Cy: "C1CCCCC1", Mes: "c1c(C)cc(C)cc1C", Tol: "c1ccc(C)cc1",
};
const GROUP_NAMES = Object.keys(exports.GROUPS).sort((a, b) => b.length - a.length);
exports.GENERICS = [
    ["A", "Any atom but H"], ["M", "Metal"], ["Q", "Any atom but C or H"], ["X", "Halogen"], ["R", "Any group"],
    ["AH", "Any atom or H"], ["MH", "Metal or H"], ["QH", "Any atom but C, or H"], ["XH", "Halogen or H"], ["G", "Any group"], ["GH", "Any group or H"],
    ["G*", "Any group, closes rings"], ["GH*", "Any group or H, closes rings"], ["ACY", "Acyclic"], ["ACH", "Acyclic or H"],
    ["ABC", "Carbacyclic"], ["ABH", "Carbacyclic or H"], ["AYL", "Alkynyl"], ["AYH", "Alkynyl or H"], ["ALK", "Alkyl"], ["ALH", "Alkyl or H"],
    ["AEL", "Alkenyl"], ["AEH", "Alkenyl or H"], ["AHC", "Hetero acyclic"], ["AHH", "Hetero acyclic or H"], ["AOX", "Alkoxy"], ["AOH", "Alkoxy or H"],
    ["CYC", "Cyclic"], ["CYH", "Cyclic or H"], ["CBC", "Carbocyclic"], ["CBH", "Carbocyclic or H"], ["ARY", "Aryl"], ["ARH", "Aryl or H"],
    ["CAL", "Cycloalkyl"], ["CAH", "Cycloalkyl or H"], ["CEL", "Cycloalkenyl"], ["CEH", "Cycloalkenyl or H"], ["CHC", "Heterocyclic"], ["CHH", "Heterocyclic or H"],
    ["HAR", "Heteroaryl"], ["HAH", "Heteroaryl or H"], ["CXX", "No carbon"], ["CXH", "No carbon or H"],
];
const GENERIC_NAMES = new Set([...exports.GENERICS.map(([g]) => g), "Y"]);
const isGeneric = (label) => GENERIC_NAMES.has(label) || /^R([1-9]\d?)?'{0,2}$/.test(label);
exports.isGeneric = isGeneric;
function units(label) {
    const out = [];
    let i = 0;
    const digits = () => { const m = /^\d+/.exec(label.slice(i)); if (m)
        i += m[0].length; return m?.[0]; };
    while (i < label.length) {
        const rest = label.slice(i);
        if (rest[0] === "(") {
            const close = rest.indexOf(")");
            const inner = close > 0 ? rest.slice(0, close + 1) : rest;
            i += inner.length;
            out.push({ text: inner, count: digits(), kind: "bracket" });
            continue;
        }
        const group = GROUP_NAMES.find((g) => rest.startsWith(g) && !/[a-z]/.test(rest[g.length] ?? ""));
        const two = rest.slice(0, 2), one = rest[0];
        const token = group ?? (exports.ELEMENTS.has(two) && /^[A-Z][a-z]$/.test(two) ? two : one);
        i += token.length;
        out.push({ text: token, count: digits(), kind: group ? "group" : exports.ELEMENTS.has(token) ? "element" : "other" });
    }
    return out;
}
function anchorElement(label) {
    const first = units(label)[0];
    return first?.kind === "element" ? first.text : undefined;
}
const isElement = (label) => exports.ELEMENTS.has(label);
exports.isElement = isElement;
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
function writtenOxidation(label) {
    const x = /^([A-Z][a-z]?)\((0|I{1,3}|IV|VI{0,3}|IX|X)\)$/.exec(label);
    return x && exports.ELEMENTS.has(x[1]) ? { el: x[1], ox: ROMAN.indexOf(x[2]) } : undefined;
}
const FORMULAS = {
    CN: "C#N", NC: "[N+]#[C-]", CHO: "C=O", CO2H: "C(=O)O", COOH: "C(=O)O", CO2: "C(=O)[O-]", NO2: "[N+](=O)[O-]", NO: "N=O",
    N3: "N=[N+]=[N-]", SO3H: "S(=O)(=O)O", SO2: "S(=O)=O", SO2Ph: "S(=O)(=O)c1ccccc1", COMe: "C(C)=O", COPh: "C(=O)c1ccccc1",
    CONH2: "C(N)=O", OCN: "OC#N", SCN: "SC#N", NCO: "N=C=O", NCS: "N=C=S",
};
function labelSmiles(label) {
    if (exports.GROUPS[label])
        return exports.GROUPS[label];
    if ((0, exports.isGeneric)(label))
        return undefined;
    const ox = writtenOxidation(label);
    if (ox)
        return `[${ox.el}]`;
    if (FORMULAS[label])
        return FORMULAS[label];
    let us = units(label);
    if (!us.length)
        return undefined;
    const back = [...us].reverse(), last = back[0];
    const reverse = back.map((u) => u.text + (u.count ?? "")).join("");
    if (FORMULAS[reverse])
        return FORMULAS[reverse];
    if (us.length > 1 && us[0].kind === "group" && last.kind === "element" && last.text !== "H" && !last.count)
        us = back;
    let smiles = "";
    const atom = (sym) => (["B", "C", "N", "O", "P", "S", "F", "Cl", "Br", "I"].includes(sym) ? sym : `[${sym}]`);
    for (const u of us) {
        const n = Number(u.count ?? 1);
        if (!(n >= 1 && n <= 99))
            return undefined;
        if (u.kind === "element") {
            if (u.text === "H")
                continue;
            smiles += smiles && n > 1 ? `(${atom(u.text)})`.repeat(n) : atom(u.text).repeat(n);
        }
        else if (u.kind === "group") {
            smiles += smiles ? `(${exports.GROUPS[u.text]})`.repeat(n) : exports.GROUPS[u.text] + `(${exports.GROUPS[u.text]})`.repeat(n - 1);
        }
        else if (u.kind === "bracket") {
            const inner = labelSmiles(u.text.slice(1, -1));
            if (!inner)
                return undefined;
            smiles += smiles ? `(${inner})`.repeat(n) : inner + `(${inner})`.repeat(n - 1);
        }
        else
            return undefined;
    }
    if (crowded(smiles))
        return undefined;
    return smiles.replace(/^C\(O\)\(O\)/, "C(=O)O").replace(/^COO/, "C(=O)O") || undefined;
}
function crowded(smiles) {
    const bad = (a) => !!a && (a.near > 8 || a.rings > 4 || (a.ring && a.near > 4));
    let atoms = 0, bracket = false;
    const chain = [undefined], ringy = [];
    for (const ch of smiles) {
        const last = chain[chain.length - 1];
        if (bracket) {
            bracket = ch !== "]";
            continue;
        }
        if (ch === "(") {
            if (last)
                last.near++;
            chain.push(undefined);
            ringy.push(false);
        }
        else if (ch === ")") {
            if (!ringy.length || bad(chain.pop()))
                return true;
            const at = chain[chain.length - 1];
            if (ringy.pop() && at)
                at.rings++;
            if (bad(at))
                return true;
        }
        else if (/\d/.test(ch)) {
            if (last) {
                last.near++;
                last.ring = true;
            }
            ringy.fill(true);
        }
        else if (ch === "[" || /[A-Zbcnops]/.test(ch)) {
            if (++atoms > 120)
                return true;
            if (last) {
                last.near++;
                if (bad(last))
                    return true;
            }
            chain[chain.length - 1] = { near: 1, rings: 0, ring: false };
            bracket = ch === "[";
        }
    }
    return chain.some(bad);
}
const COUNTED = new Set([...SYMBOLS, ...Object.keys(exports.GROUPS), "pin", "dba", "cod", "acac", "d"]);
const NOT_FORMULA = /^(B3LYP|B2PLYP|MP[2-4]|S[NE][12]|E[12]|E1cB)$/;
function formulaRuns(text) {
    const out = [];
    const push = (t, sub) => {
        if (!t)
            return;
        const last = out[out.length - 1];
        if (last && !!last.sub === !!sub)
            last.text += t;
        else
            out.push(sub ? { text: t, sub } : { text: t });
    };
    let at = 0;
    for (const m of text.matchAll(/\d+/g)) {
        const before = text.slice(0, m.index), word = /\S*$/.exec(before)[0] + /^\S*/.exec(text.slice(m.index))[0];
        const letters = /[A-Za-z]{1,5}$/.exec(before)?.[0] ?? "";
        const counted = !NOT_FORMULA.test(word) && /[A-Za-z]/.test(word)
            && (/[A-Za-z0-9][)\]]$/.test(before) || Array.from({ length: letters.length }, (_, k) => letters.slice(k)).some((s) => COUNTED.has(s)));
        if (!counted)
            continue;
        push(text.slice(at, m.index));
        push(m[0], true);
        at = m.index + m[0].length;
    }
    push(text.slice(at));
    return out;
}

  };
  var n = Object.assign({}, require("condensed.ts"));
  window.OctetCondensed = { condensedSmiles: n.condensedSmiles };
})();
