/* Octet Draw (https://github.com/SamChemMan/Octet-Draw), Apache License 2.0, (c) 2026 Sam Ellis: its structure-to-name
   module, the files below with their types and comments taken out, otherwise unchanged. Modules: namer.ts, fusion.ts, vonbaeyer.ts, metals.ts, namer-maingroup.ts, namer-multiplicative.ts, namer-hetero.ts, complexes.ts, naming.ts, render.ts, labels.ts, query.ts, rings.ts, richtext.ts, common.ts, cip.ts, mass.ts, isotopes.ts, axial.ts */
(function () {
  var defs = {}, cache = {};
  function require(n) {
    if (cache[n]) return cache[n].exports;
    var m = (cache[n] = { exports: {} });
    defs[n](m, m.exports, require);
    return m.exports;
  }
  defs["namer.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CARBON_GROUP = exports.SENIORITY = exports.HALO = exports.MULT_COMPLEX = exports.MULT = exports.joinPrefixes = exports.Namer = void 0;
exports.iupacName = iupacName;
exports.iupacLocants = iupacLocants;
exports.iupacNameWhy = iupacNameWhy;
exports.enclose = enclose;
exports.substituted = substituted;
exports.assemblePrefixes = assemblePrefixes;
exports.alphaKey = alphaKey;
exports.alkylWords = alkylWords;
exports.times = times;
exports.chainStem = chainStem;
exports.citedLabels = citedLabels;
const fusion_ts_1 = require("fusion.ts");
const vonbaeyer_ts_1 = require("vonbaeyer.ts");
const metals_ts_1 = require("metals.ts");
const namer_maingroup_ts_1 = require("namer-maingroup.ts");
const namer_multiplicative_ts_1 = require("namer-multiplicative.ts");
const namer_hetero_ts_1 = require("namer-hetero.ts");
function numeral(n) {
    if (n < 10)
        return ["", "mono", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa", "nona"][n];
    const u = n % 10, t = Math.floor(n / 10) % 10, h = Math.floor(n / 100) % 10;
    const unit = u === 1 ? (t === 1 ? "un" : "hen") : u === 2 ? "do" : ["", "", "", "tri", "tetra", "penta", "hexa", "hepta", "octa", "nona"][u];
    const ten = t === 2 ? (/[aeiou]$/.test(unit) ? "cosa" : "icosa") : ["", "deca", "", "triaconta", "tetraconta", "pentaconta", "hexaconta", "heptaconta", "octaconta", "nonaconta"][t];
    return unit + ten + ["", "hecta", "dicta", "tricta", "tetracta", "pentacta", "hexacta", "heptacta", "octacta", "nonacta"][h];
}
const STEMS = Array.from({ length: 1000 }, (_, n) => (n < 5 ? ["", "meth", "eth", "prop", "but"][n] : numeral(n).replace(/a$/, "")));
const MULT = Array.from({ length: 1000 }, (_, n) => (n < 2 ? "" : numeral(n)));
exports.MULT = MULT;
const MULT_COMPLEX = Array.from({ length: 1000 }, (_, n) => (n < 2 ? "" : n === 2 ? "bis" : n === 3 ? "tris" : `${numeral(n)}kis`));
exports.MULT_COMPLEX = MULT_COMPLEX;
const HALO = { F: "fluoro", Cl: "chloro", Br: "bromo", I: "iodo" };
exports.HALO = HALO;
const VOWEL = /^[aeiouy]/;
const ANION_KINDS = ["ide", "carboxylate", "peroxoate", "sulfonateion", "sulfinate", "olate", "aminide"];
const SENIORITY = [...ANION_KINDS, "aminium", "ylium", "iminium", "diazonium", "acid", "peroxy", "imidic", "carbonic", "sulfonic", "selenonic", "seleninic", "telluronic", "tellurinic", "anhydride", "peroxide", "ester", "peroxyester", "imidate", "carbamate", "sulfonate", "halide", "imidoylhalide", "carbonylhalide", "sulfonylhalide", "amide", "amidine", "urea", "guanidine", "sulfonamide", "hydrazide", "nitrile", "aldehyde", "ketone", "alcohol", "thiol", "selenol", "tellurol", "amine", "imine"];
exports.SENIORITY = SENIORITY;
const CARBON_GROUP = new Set(["acid", "peroxy", "imidic", "anhydride", "ester", "peroxyester", "imidate", "halide", "imidoylhalide", "amide", "amidine", "hydrazide", "nitrile", "aldehyde", "carboxylate", "peroxoate"]);
exports.CARBON_GROUP = CARBON_GROUP;
const HALIDE = { F: "fluoride", Cl: "chloride", Br: "bromide", I: "iodide" };
const CATIONS = { Li: ["lithium", 1], Na: ["sodium", 1], K: ["potassium", 1], Rb: ["rubidium", 1], Cs: ["caesium", 1], Ag: ["silver", 1],
    Mg: ["magnesium", 2], Ca: ["calcium", 2], Sr: ["strontium", 2], Ba: ["barium", 2], Zn: ["zinc", 2], ...metals_ts_1.MORE_CATIONS };
const ANIONS = {
    "F-1": "fluoride", "Cl-1": "chloride", "Br-1": "bromide", "I-1": "iodide", "H-1": "hydride", "HO-1": "hydroxide", "O-2": "oxide", "S-2": "sulfide",
    "CO3-2": "carbonate", "CHO3-1": "hydrogencarbonate", "O4S-2": "sulfate", "HO4S-1": "hydrogensulfate", "O3S-2": "sulfite", "HO3S-1": "hydrogensulfite",
    "O3S2-2": "thiosulfate", "NO3-1": "nitrate", "NO2-1": "nitrite", "O4P-3": "phosphate", "HO4P-2": "hydrogenphosphate", "H2O4P-1": "dihydrogenphosphate",
    "N3-1": "azide", "CN-1": "cyanide", "CNS-1": "thiocyanate", "ClO4-1": "perchlorate", "ClO-1": "hypochlorite", "IO4-1": "periodate",
    "MnO4-1": "permanganate", "BF4-1": "tetrafluoroborate", "F6P-1": "hexafluorophosphate", "BH4-1": "tetrahydroborate",
    "AlH4-1": "tetrahydroaluminate", ...metals_ts_1.METAL_ANIONS,
};
const RINGS = {
    "6a:": { name: "benzene", stem: "phenyl", aromatic: true },
    "6a:N1": { name: "pyridine", stem: "pyridin", aromatic: true },
    "6a:N1,N2": { name: "pyridazine", stem: "pyridazin", aromatic: true },
    "6a:N1,N3": { name: "pyrimidine", stem: "pyrimidin", aromatic: true },
    "6a:N1,N4": { name: "pyrazine", stem: "pyrazin", aromatic: true },
    "6a:N1,N3,N5": { name: "1,3,5-triazine", stem: "1,3,5-triazin", aromatic: true },
    "5a:O1": { name: "furan", stem: "furan", aromatic: true },
    "5a:S1": { name: "thiophene", stem: "thiophen", aromatic: true },
    "5a:N1": { name: "pyrrole", stem: "pyrrol", aromatic: true, hydrogen: "1H-" },
    "5a:N1,N3": { name: "imidazole", stem: "imidazol", aromatic: true, hydrogen: "1H-" },
    "5a:N1,N2": { name: "pyrazole", stem: "pyrazol", aromatic: true, hydrogen: "1H-" },
    "5a:O1,N3": { name: "1,3-oxazole", stem: "1,3-oxazol", aromatic: true },
    "5a:S1,N3": { name: "1,3-thiazole", stem: "1,3-thiazol", aromatic: true },
    "5a:O1,N2": { name: "1,2-oxazole", stem: "1,2-oxazol", aromatic: true },
    "5a:S1,N2": { name: "1,2-thiazole", stem: "1,2-thiazol", aromatic: true },
    "6s:N1": { name: "piperidine", stem: "piperidin", aromatic: false },
    "6s:O1": { name: "oxane", stem: "oxan", aromatic: false },
    "6s:S1": { name: "thiane", stem: "thian", aromatic: false },
    "6s:N1,N4": { name: "piperazine", stem: "piperazin", aromatic: false },
    "6s:O1,N4": { name: "morpholine", stem: "morpholin", aromatic: false },
    "6s:O1,O4": { name: "1,4-dioxane", stem: "1,4-dioxan", aromatic: false },
    "6s:O1,O3": { name: "1,3-dioxane", stem: "1,3-dioxan", aromatic: false },
    "5s:N1": { name: "pyrrolidine", stem: "pyrrolidin", aromatic: false },
    "5s:O1": { name: "oxolane", stem: "oxolan", aromatic: false },
    "5s:S1": { name: "thiolane", stem: "thiolan", aromatic: false },
    "5s:O1,O3": { name: "1,3-dioxolane", stem: "1,3-dioxolan", aromatic: false },
    "4s:O1": { name: "oxetane", stem: "oxetan", aromatic: false },
    "4s:N1": { name: "azetidine", stem: "azetidin", aromatic: false },
    "3s:O1": { name: "oxirane", stem: "oxiran", aromatic: false },
    "3s:N1": { name: "aziridine", stem: "aziridin", aromatic: false },
};
const ION_RINGS = { "6a:O1": { name: "pyrylium", stem: "", aromatic: true }, "6a:S1": { name: "thiopyrylium", stem: "", aromatic: true },
    "6a:Se1": { name: "selenopyrylium", stem: "", aromatic: true }, "6a:Te1": { name: "telluropyrylium", stem: "", aromatic: true } };
const HETERO_ORDER = ["O", "S", "N"];
const BRIDGE_ORDER = [...HETERO_ORDER, "P", "As"];
const HW = { F: "fluora", Cl: "chlora", Br: "broma", I: "ioda", O: "oxa", S: "thia", Se: "selena", Te: "tellura", N: "aza", P: "phospha", As: "arsa", Sb: "stiba", Bi: "bisma", Si: "sila", Ge: "germa", Sn: "stanna", Pb: "plumba", B: "bora", Al: "aluma", Ga: "galla", In: "indiga", Tl: "thalla", Hg: "mercura" };
const HW_ORDER = Object.keys(HW);
const DIVALENT = new Set(["O", "S", "Se", "Te", "Hg"]);
const LAMBDA = new Set(["S", "Se", "Te", "P", "As", "Sb", "Bi"]);
const SIX_A = new Set(["O", "S", "Se", "Te", "Bi", "Hg"]), SIX_B = new Set(["N", "Si", "Ge", "Sn", "Pb"]);
const SATURATED = { "5:N1,N2": "pyrazolidine", "5:N1,N3": "imidazolidine", "5:N1": "pyrrolidine", "6:N1": "piperidine", "6:N1,N4": "piperazine", "6:O1,N4": "morpholine" };
const MANCUDE = {
    "5:N1": "pyrrole", "5:N1,N2": "pyrazole", "5:N1,N3": "imidazole", "5:O1": "furan", "5:S1": "thiophene", "6:N1": "pyridine",
    "6:N1,N2": "pyridazine", "6:N1,N3": "pyrimidine", "6:N1,N4": "pyrazine", "6:O1": "pyran", "6:S1": "thiopyran",
    "5:Se1": "selenophene", "5:Te1": "tellurophene",
};
function hwName(els, saturated, lam = []) {
    const join = (a, b) => (/a$/.test(a) && /^[aeiou]/.test(b) ? a.slice(0, -1) : a) + b;
    const present = HW_ORDER.filter((e) => els.includes(e)), size = els.length, hasN = present.includes("N"), last = present[present.length - 1];
    const locs = present.flatMap((e) => els.flatMap((x, k) => (x === e ? [k + 1] : [])));
    const stem = present.reduce((t, e) => { const n = els.filter((x) => x === e).length; return join(t, MULT[n].replace(/a$/, /^a/.test(HW[e]) ? "" : "a") + HW[e]); }, "");
    const ends = size === 3 ? (hasN ? ["irine", "iridine"] : ["irene", "irane"]) : size === 4 ? ["ete", hasN ? "etidine" : "etane"]
        : size === 5 ? ["ole", hasN ? "olidine" : "olane"] : size === 6 ? (SIX_A.has(last) ? ["ine", "ane"] : SIX_B.has(last) ? ["ine", "inane"] : ["inine", "inane"])
            : [["epine", "epane"], ["ocine", "ocane"], ["onine", "onane"], ["ecine", "ecane"]][size - 7];
    const bare = locs.length === 1 || (present.length === 1 && locs.length >= size - 1);
    const cited = bare ? locs.filter((l) => lam[l - 1]) : locs;
    return (cited.length ? `${cited.map((l) => `${l}${lam[l - 1] ?? ""}`).join(",")}-` : "") + join(stem, ends[saturated ? 1 : 0]);
}
function subsets(l, k) {
    if (!k)
        return [[]];
    return l.flatMap((a, i) => subsets(l.slice(i + 1), k - 1).map((s) => [a, ...s]));
}
const SKELETONS = {
    naphthalene: "1-2 2-3 3-4 4-4a 4a-5 5-6 6-7 7-8 8-8a 8a-1 4a-8a",
    indene: "1-2 2-3 3-3a 3a-4 4-5 5-6 6-7 7-7a 7a-1 3a-7a",
    anthracene: "1-2 2-3 3-4 4-4a 4a-10 10-10a 10a-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 8a-10a",
    phenazine: "1-2 2-3 3-4 4-4a 4a-5 5-5a 5a-6 6-7 7-8 8-9 9-9a 9a-10 10-10a 10a-1 4a-10a 5a-9a",
    phenanthrene: "1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-6 6-7 7-8 8-8a 8a-9 9-10 10-10a 10a-1 4a-10a 4b-8a",
    fluorene: "1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 4b-8a",
    purine: "1-2 2-3 3-4 4-5 5-6 6-1 5-7 7-8 8-9 9-4",
};
const FUSED_NAMES = [
    ["naphthalene", "naphthalene", ""], ["naphthalene", "quinoline", "N1"], ["naphthalene", "isoquinoline", "N2"],
    ["naphthalene", "quinazoline", "N1 N3"], ["naphthalene", "quinoxaline", "N1 N4"], ["naphthalene", "cinnoline", "N1 N2"],
    ["naphthalene", "phthalazine", "N2 N3"], ["naphthalene", "1,5-naphthyridine", "N1 N5"], ["naphthalene", "1,6-naphthyridine", "N1 N6"],
    ["naphthalene", "1,7-naphthyridine", "N1 N7"], ["naphthalene", "1,8-naphthyridine", "N1 N8"], ["naphthalene", "2,6-naphthyridine", "N2 N6"],
    ["naphthalene", "2,7-naphthyridine", "N2 N7"], ["naphthalene", "pteridine", "N1 N3 N5 N8"],
    ["naphthalene", "1-benzopyran", "O1"], ["naphthalene", "2-benzopyran", "O2"],
    ["indene", "indene", ""], ["indene", "indole", "N1"], ["indene", "isoindole", "N2"], ["indene", "1-benzofuran", "O1"],
    ["indene", "2-benzofuran", "O2"], ["indene", "1-benzothiophene", "S1"], ["indene", "2-benzothiophene", "S2"],
    ["indene", "indazole", "N1 N2"], ["indene", "benzimidazole", "N1 N3"], ["indene", "1,3-benzoxazole", "O1 N3"],
    ["indene", "1,3-benzothiazole", "S1 N3"], ["indene", "1,2-benzoxazole", "O1 N2"], ["indene", "1,2-benzothiazole", "S1 N2"],
    ["anthracene", "anthracene", ""], ["anthracene", "acridine", "N10"], ["phenazine", "phenazine", "N5 N10"],
    ["anthracene", "xanthene", "O10"], ["anthracene", "thioxanthene", "S10"], ["phenazine", "phenoxazine", "O5 N10"],
    ["phenazine", "phenothiazine", "S5 N10"],
    ["phenanthrene", "phenanthrene", ""], ["fluorene", "fluorene", ""], ["fluorene", "carbazole", "N9"],
    ["purine", "purine", "N1 N3 N7 N9"],
    ["indene", "1-benzoselenophene", "Se1"], ["indene", "2-benzoselenophene", "Se2"], ["indene", "1-benzotellurophene", "Te1"],
    ["indene", "1,3-benzoselenazole", "Se1 N3"], ["indene", "1,2-benzoselenazole", "Se1 N2"], ["indene", "2,1,3-benzoselenadiazole", "N1 Se2 N3"],
    ["indene", "1,3,2-benzodioxaborole", "O1 B2 O3"], ["indene", "2,1-benzoxaborole", "B1 O2"],
];
const PI_ATOMS = new Set(["C", "N", "P", "As", "Sb", "Si", "Ge", "Sn", "B"]);
const locOrder = (a, b) => parseInt(a) - parseInt(b) || (a < b ? -1 : a > b ? 1 : 0);
const FUSED = FUSED_NAMES.map(([skeleton, name, hetero]) => skeletonTemplate(SKELETONS[skeleton], name, hetero));
const ADAMANTANE = { ...skeletonTemplate("1-2 2-3 3-4 4-5 5-6 6-7 7-8 8-1 1-9 9-5 3-10 10-7", "adamantane", ""), el: Array(10).fill("*") };
function skeletonTemplate(skeleton, name, hetero) {
    const pairs = skeleton.split(" ").map((b) => b.split("-"));
    const labels = [...new Set(pairs.flat())].sort(locOrder);
    const el = labels.map(() => "C");
    for (const h of hetero.split(" ").filter(Boolean)) {
        const e = h.match(/^[A-Z][a-z]?/)[0];
        el[labels.indexOf(h.slice(e.length))] = e;
    }
    const adj = labels.map(() => []);
    for (const [a, b] of pairs) {
        adj[labels.indexOf(a)].push(labels.indexOf(b));
        adj[labels.indexOf(b)].push(labels.indexOf(a));
    }
    const order = [0];
    for (let k = 0; k < order.length; k++)
        for (const j of adj[order[k]])
            if (!order.includes(j))
                order.push(j);
    const cn = el.filter((e) => PI_ATOMS.has(e)).length;
    return { name, labels, el, adj, order, bonds: pairs.length, formula: [...el].sort().join(""), odd: cn % 2 === 1 };
}
const REPLACE = Object.entries(HW);
const HYDRO = [...MULT, "undeca", "dodeca", "trideca", "tetradeca"];
const RETAINED = {
    "benzene:acid": "benzoic acid", "benzene:ester": "benzoate", "benzene:amide": "benzamide", "benzene:nitrile": "benzonitrile",
    "benzene:aldehyde": "benzaldehyde", "benzene:alcohol": "phenol", "benzene:amine": "aniline",
    "C2:acid": "acetic acid", "C2:ester": "acetate", "C2:amide": "acetamide", "C2:nitrile": "acetonitrile", "C2:aldehyde": "acetaldehyde",
    "C1:acid": "formic acid", "C1:ester": "formate", "C1:amide": "formamide", "C1:aldehyde": "formaldehyde",
    "benzene:anhydride": "benzoic acid", "C2:anhydride": "acetic acid", "C1:anhydride": "formic acid",
    "benzene:halide": "benzoyl", "C2:halide": "acetyl", "C1:halide": "formyl",
    "benzene:hydrazide": "benzohydrazide", "C2:hydrazide": "acetohydrazide", "C1:hydrazide": "formohydrazide",
    "benzene:carboxylate": "benzoate", "C2:carboxylate": "acetate", "C1:carboxylate": "formate", "benzene:olate": "phenolate", "benzene:aminide": "anilinide",
};
const MAIN = {
    Si: { hydride: "silane", yl: "silyl", valence: 4 }, Ge: { hydride: "germane", yl: "germyl", valence: 4 },
    Sn: { hydride: "stannane", yl: "stannyl", valence: 4 }, Pb: { hydride: "plumbane", yl: "plumbyl", valence: 4 },
    B: { hydride: "borane", yl: "boranyl", valence: 3 }, Al: { hydride: "alumane", yl: "alumanyl", valence: 3 },
    Ga: { hydride: "gallane", yl: "gallanyl", valence: 3 }, In: { hydride: "indigane", yl: "indiganyl", valence: 3 },
    Tl: { hydride: "thallane", yl: "thallanyl", valence: 3 }, As: { hydride: "arsane", yl: "arsanyl", valence: 3 },
    Sb: { hydride: "stibane", yl: "stibanyl", valence: 3 }, Bi: { hydride: "bismuthane", yl: "bismuthanyl", valence: 3 },
    Se: { hydride: "selane", yl: "selanyl", valence: 2 }, Te: { hydride: "tellane", yl: "tellanyl", valence: 2 },
    Hg: { hydride: "mercury", yl: "mercurio", valence: 2 },
};
const RING_BEARERS = new Set(["N", "P", "As", "Sb", "B", "Si", "Ge", "Sn"]);
const CHALCOGEN = new Set(["Se", "Te"]), CHALCOGENS = new Set(["O", "S", "Se", "Te"]);
const bonding = (el, q) => { const v = MAIN[el].valence; return v === 3 && !["As", "Sb", "Bi"].includes(el) ? v - q : v === 4 ? v - Math.abs(q) : v + q; };
const CATENATE = new Set(["Si", "Ge", "Sn", "Pb", "B"]);
const PARENT_ORDER = ["Hg", "N", "P", "As", "Sb", "Bi", "Si", "Ge", "Sn", "Pb", "B", "Al", "Ga", "In", "Tl", "O", "S", "Se", "Te"];
class Namer {
    constructor(g, opaque = new Map()) {
        this.bond = new Map();
        this.rings = [];
        this.fused = [];
        this.fusedCache = new Map();
        this.cipBond = new Map();
        this.group = [];
        this.bearer = new Map();
        this.esterO = new Map();
        this.sulfur = new Set();
        this.anhydrideO = new Map();
        this.phosphorus = new Set();
        this.main = new Set();
        this.pseudo = new Set();
        this.prefixOnly = new Map();
        this.diimine = new Set();
        this.nO = new Set();
        this.hzN = new Set();
        this.peroxO = new Set();
        this.het = new Map();
        this.ions = new Set();
        this.ionBonds = new Set();
        this.onium = [];
        this.azanide = [];
        this.key = (a, b) => (a < b ? `${a} ${b}` : `${b} ${a}`);
        this.ord = (a, b) => this.bond.get(this.key(a, b)) ?? 0;
        this.carbons = (i, not = []) => this.adj[i].filter((j) => this.el[j] === "C" && !not.includes(j));
        this.ringAmino = (n, j) => this.el[j] === "N" && this.inRing[j] && !this.q[j] && this.ord(n, j) === 1 && this.el[n] === "N" && !this.inRing[n];
        this.nitrosoAtom = (x) => this.el[x] === "N" && !this.q[x] && this.adj[x].length === 2 && this.adj[x].some((j) => this.el[j] === "O" && this.ord(x, j) === 2 && this.adj[j].length === 1 && !this.q[j]);
        this.ringNO = (o) => this.adj[o].some((j) => this.el[j] === "N" && this.inRing[j] && !this.q[j] && this.ord(o, j) === 1);
        this.classBond = (a, b) => this.nO.has(a) || this.nO.has(b) || ((this.ringAmino(a, b) || this.ringAmino(b, a)) && [a, b].some((x) => this.group[x] === "amide" || this.group[x] === "urea" || this.group[x] === "carbamate" || this.group[x] === "peroxide")) || (this.group[a] === "hydrazide" && this.group[b] === "hydrazide" && this.el[a] === "N" && this.el[b] === "N") || (this.hzN.has(a) && this.hzN.has(b)) || (this.peroxO.has(a) && this.peroxO.has(b)) || (this.pseudo.has(a) && this.pseudo.has(b))
            || [a, b].some((o) => this.el[o] === "O" && (this.group[o] === "ester" || this.group[o] === "carbamate") && this.ringNO(o));
        this.ringN = (c) => (this.inRing[c] ? [] : this.adj[c].filter((j) => RING_BEARERS.has(this.el[j]) && this.inRing[j] && this.ord(c, j) === 1 && !this.q[j]));
        this.isNitrileC = (c) => this.adj[c].some((j) => this.el[j] === "N" && this.ord(c, j) === 3);
        this.nitroBond = (a, b) => this.nitroAtom(a) || this.nitroAtom(b);
        this.ionSkip = (kind) => (kind && SENIORITY.indexOf(kind) <= SENIORITY.indexOf("diazonium") ? new Set([...this.bearer.keys()].filter((g) => this.group[g] === "acid" || (this.group[g] === "carboxylate" && kind !== "carboxylate" && this.el[g] === "C"))) : undefined);
        this.ionN = (kind, g) => (kind === "aminide" || kind === "iminium" ? g : undefined);
        this.adjacentIn = (cycle, a, b) => Math.abs(cycle.indexOf(a) - cycle.indexOf(b)) % (cycle.length - 2) === 1 || Math.abs(cycle.indexOf(a) - cycle.indexOf(b)) === 1;
        this.groupHetero = (c) => this.adj[c].filter((j) => j !== this.carbonylO[c] && this.el[j] !== "C" && !this.nitroAtom(j) && !this.nitrosoAtom(j));
        this.amideN = (c) => this.groupHetero(c).find((j) => !this.inRing[j] && this.ord(c, j) === 1 && !this.bearer.get(c)?.includes(j));
        this.isOH = (j) => this.el[j] === "O" && this.h[j] === 1 && this.adj[j].length === 1 && !this.q[j];
        this.isOxo = (i, j) => this.el[j] === "O" && this.ord(i, j) === 2 && this.adj[j].length === 1 && !this.h[j] && !this.q[j];
        this.mainIon = (i) => ((this.el[i] === "B" && this.q[i] === -1) || ((this.el[i] === "As" || this.el[i] === "Sb") && this.q[i] === 1)) && !this.inRing[i] && this.q.filter(Boolean).length === 1;
        this.silylEster = (o) => this.adj[o].some((j) => MAIN[this.el[j]]?.valence === 4 && this.el[j] !== "Hg" && !this.inRing[j]);
        this.opaque = opaque;
        this.n = g.atoms.length;
        this.el = g.atoms.map((a) => a.el);
        this.h = g.atoms.map((a) => a.h);
        this.q = g.atoms.map((a) => a.charge);
        this.adj = g.atoms.map(() => []);
        for (const b of g.bonds) {
            this.adj[b.a].push(b.b);
            this.adj[b.b].push(b.a);
            this.bond.set(this.key(b.a, b.b), b.order);
            if (b.cip)
                this.cipBond.set(this.key(b.a, b.b), b.cip);
        }
        this.cip = g.atoms.map((a) => a.cip);
        this.iso = g.atoms.map((a) => a.iso);
        this.hx = g.atoms.map((a) => a.hx ?? []);
        this.isotopic = g.atoms.some((a) => a.iso || a.hx?.length);
        this.inRing = this.findRings();
        this.ringOf = Array(this.n).fill(-1);
        this.rings.forEach((r, k) => r.forEach((i) => (this.ringOf[i] = k)));
        const oh = (i) => this.adj[i].some((o) => this.el[o] === "O" && this.h[o] === 1 && this.adj[o].length === 1 && this.ord(i, o) === 1 && !this.q[o]);
        this.carbonylO = Array.from({ length: this.n }, (_, i) => this.el[i] === "C" ? this.adj[i].find((o) => (this.el[o] === "O" || this.el[o] === "S" || ((this.el[o] === "Se" || this.el[o] === "Te") && this.adj[i].length === 3 && oh(i) && !this.h[o])) && this.ord(i, o) === 2 && this.adj[o].length === 1 && !this.q[o]) ?? -1 : -1);
    }
    findRings() {
        const ringBond = (a, b) => {
            const seen = new Set([a]), stack = [a];
            while (stack.length) {
                const i = stack.pop();
                for (const j of this.adj[i]) {
                    if ((i === a && j === b) || seen.has(j))
                        continue;
                    if (j === b)
                        return true;
                    seen.add(j);
                    stack.push(j);
                }
            }
            return false;
        };
        const inRing = Array(this.n).fill(false), edges = [];
        for (const [k] of this.bond) {
            const [a, b] = k.split(" ").map(Number);
            if (ringBond(a, b)) {
                inRing[a] = inRing[b] = true;
                edges.push([a, b]);
            }
        }
        const seen = new Set();
        for (let s = 0; s < this.n; s++) {
            if (!inRing[s] || seen.has(s))
                continue;
            const atoms = [], stack = [s];
            seen.add(s);
            while (stack.length) {
                const i = stack.pop();
                atoms.push(i);
                for (const [a, b] of edges) {
                    const j = a === i ? b : b === i ? a : -1;
                    if (j >= 0 && !seen.has(j)) {
                        seen.add(j);
                        stack.push(j);
                    }
                }
            }
            const count = edges.filter(([a]) => atoms.includes(a)).length;
            this.fused.push(count !== atoms.length);
            if (count !== atoms.length) {
                this.rings.push(atoms);
                continue;
            }
            const cycle = [atoms[0]];
            while (cycle.length < atoms.length) {
                const last = cycle[cycle.length - 1], prev = cycle[cycle.length - 2];
                const next = edges.map(([a, b]) => (a === last ? b : b === last ? a : -1)).find((j) => j >= 0 && j !== prev && !cycle.includes(j));
                if (next === undefined)
                    throw new Error("ring walk");
                cycle.push(next);
            }
            this.rings.push(cycle);
        }
        return inRing;
    }
    perceive() {
        var _a;
        const { el, h, q, adj } = this;
        this.perceiveIons();
        for (let i = 0; i < this.n; i++) {
            if (!["C", "N", "O", "S", "P", "F", "Cl", "Br", "I"].includes(el[i]) && !MAIN[el[i]])
                throw new Error(`element ${el[i]}`);
            if (this.mainIon(i))
                continue;
            if (q[i] && !this.nitroAtom(i) && !this.cationN(i) && !this.diazoAtom(i) && !this.azidoAtom(i) && !(0, namer_hetero_ts_1.heteroCharged)(this, i) && !this.ions.has(i))
                throw new Error("charge");
        }
        for (let c = 0; c < this.n; c++)
            if (el[c] === "C")
                this.pseudoGroup(c);
        this.perceiveMain();
        (0, namer_hetero_ts_1.perceiveIodanes)(this);
        for (let c = 0; c < this.n; c++) {
            if (el[c] !== "C" || this.pseudo.has(c) || this.het.has(c) || this.group[c] || this.ions.has(c))
                continue;
            const o = this.carbonylO[c], cs = [...this.carbons(c), ...this.ringN(c)];
            const others = adj[c].filter((j) => j !== o && !cs.includes(j));
            const nitrileN = adj[c].find((j) => el[j] === "N" && this.ord(c, j) === 3 && adj[j].length === 1);
            if (nitrileN !== undefined) {
                const y = others.find((j) => j !== nitrileN);
                if (!cs.length && others.length === 2 && !this.inRing[c] && this.ord(c, y) === 1 && !this.q[y] && ((HALO[el[y]] && adj[y].length === 1) || (el[y] === "O" && this.h[y] === 1 && adj[y].length === 1)
                    || (el[y] === "N" && !this.inRing[y] && adj[y].every((j) => j === c || (el[j] === "C" && !this.isNitrileC(j)))) || this.azidoAtom(y))) {
                    this.mark(c, "nitrile", []);
                    this.group[nitrileN] = "nitrile";
                    (_a = this.group)[y] ?? (_a[y] = "nitrile");
                    continue;
                }
                if (!cs.length && others.length === 2 && el[others.find((j) => j !== nitrileN)] === "P")
                    continue;
                if (this.inRing[c] || cs.length > 1 || others.filter((j) => !CATENATE.has(el[j])).length !== 1 || others.length + cs.length > 2)
                    throw new Error("nitrile");
                this.mark(c, "nitrile", cs);
                this.group[nitrileN] = "nitrile";
                continue;
            }
            const n = this.imineN(c);
            if (n !== undefined) {
                const rest = others.filter((j) => j !== n);
                if (rest.length && o < 0 && !this.inRing[c]) {
                    this.amidineGroup(c, n, cs, rest);
                    continue;
                }
                if (o >= 0 || rest.some((j) => !this.inRing[c] || this.ringOf[j] !== this.ringOf[c]))
                    throw new Error("imine");
                this.mark(c, "imine", cs);
                this.group[n] = "imine";
                continue;
            }
            if (o < 0)
                continue;
            this.group[o] = "ketone";
            if (this.inRing[c]) {
                if (!adj[c].every((j) => j === o || this.ringOf[j] === this.ringOf[c]))
                    throw new Error("carbonyl");
                this.mark(c, "ketone", cs);
                continue;
            }
            if (others.length === 0) {
                if (cs.length === 2)
                    this.mark(c, "ketone", cs);
                else if (!this.inRing[c] && h[c] >= 1)
                    this.mark(c, "aldehyde", cs);
                else if (cs.length === 1 && this.ord(c, cs[0]) === 2)
                    this.mark(c, "ketone", cs);
                else
                    throw new Error("carbonyl");
                continue;
            }
            if (this.acylBridge(c, cs, others))
                continue;
            const hz = others.length === 2 && !cs.length ? this.hydrazineN(c) : [];
            const dz = hz.length === 2 ? hz.filter((n) => adj[n].some((j) => el[j] === "N" && this.ord(n, j) === 2)) : [];
            if (hz.length === 1 || (dz.length === 1 && this.hydrazideN(c, hz.find((n) => n !== dz[0])) !== undefined)) {
                const n = dz[0] ?? hz[0];
                this.hydrazineGroup(c, n, others.find((j) => j !== n));
                continue;
            }
            if (dz.length === 2) {
                this.mark(c, "ketone", []);
                continue;
            }
            if (hz.length === 2) {
                if (this.n !== 6 || hz.some((n) => adj[n].length !== 2 || adj[adj[n].find((j) => el[j] === "N")].length !== 1 || adj[n].some((j) => this.ord(n, j) !== 1)))
                    throw new Error("carbonic acid derivative");
                this.whole = "carbonic dihydrazide";
                for (const a of [c, o, ...hz, ...hz.map((n) => adj[n].find((j) => el[j] === "N"))])
                    this.pseudo.add(a);
                continue;
            }
            const nitro = others.length === 2 && !cs.length && others.some((j) => el[j] === "O") ? others.find((j) => this.nitroAtom(j) || this.nitrosoAtom(j)) : undefined;
            if (others.length === 2 && !cs.length && nitro === undefined) {
                this.carbonicGroup(c, others);
                continue;
            }
            const xs = others.filter((j) => j !== nitro);
            if (this.inRing[c] || xs.length !== 1 || cs.length > 1)
                throw new Error("carbonyl");
            const x = xs[0];
            if ((HALO[el[x]] && adj[x].length === 1) || this.prefixOnly.has(x)) {
                this.mark(c, "halide", cs);
                this.group[x] = "halide";
                continue;
            }
            const y = el[x] === "O" && adj[x].length === 2 ? adj[x].find((j) => j !== c) : -1;
            if (y >= 0 && el[y] === "C" && this.carbonylO[y] >= 0 && !this.inRing[y]) {
                this.mark(c, "anhydride", cs);
                this.group[x] = "anhydride";
                this.anhydrideO.set(c, x);
                continue;
            }
            const sulfonyl = el[x] === "S" && !q[x] && !this.inRing[x] && adj[x].length === 4 && adj[x].filter((j) => this.isOxo(x, j)).length === 2;
            const diazenyl = el[x] === "N" && !q[x] && !this.inRing[x] && adj[x].length === 2 && adj[x].some((j) => el[j] === "N" && this.ord(x, j) === 2 && !q[j] && !this.inRing[j]);
            if ((this.nitroAtom(x) || sulfonyl || diazenyl || this.nitrosoAtom(x)) && cs.length === 1) {
                this.mark(c, "ketone", cs);
                continue;
            }
            const peroxo = el[x] === "O" && el[o] === "O" && adj[x].length === 2 ? adj[x].find((j) => j !== c && el[j] === "O" && q[j] <= 0 && !this.inRing[j]) : undefined;
            if (peroxo !== undefined) {
                this.peroxyGroup(c, cs, x, peroxo);
                continue;
            }
            const r = adj[x].find((j) => j !== c);
            if ((el[x] === "O" || el[x] === "S") && h[x] === 1 && adj[x].length === 1) {
                this.mark(c, "acid", cs);
                this.group[x] = "acid";
            }
            else if ((el[x] === "O" && adj[x].length === 2 && ((this.carbonylO[r] < 0 && (el[r] === "C" || this.silylEster(x))) || this.ringNO(x)))
                || (el[x] === "S" && adj[x].length === 2 && this.carbonylO[r] < 0 && el[r] === "C")) {
                this.mark(c, "ester", cs);
                this.esterO.set(c, x);
                this.group[x] = "ester";
            }
            else if (el[x] === "N" && this.ord(c, x) === 1 && !this.inRing[x] && adj[x].every((j) => j === c || CATENATE.has(el[j]) || (el[j] === "C" && !this.isNitrileC(j)) || this.nOxy(x, j) || (0, namer_hetero_ts_1.amideHetero)(this, j) || this.ringAmino(x, j))) {
                this.mark(c, "amide", cs);
                this.group[x] = "amide";
                for (const j of adj[x])
                    if (this.nOxy(x, j))
                        this.nO.add(j);
            }
            else if (this.hydrazideN(c, x) !== undefined) {
                this.mark(c, "hydrazide", cs);
                this.group[x] = this.group[this.hydrazideN(c, x)] = "hydrazide";
            }
            else if (!(el[x] === "O" && this.main.has(x)))
                throw new Error("carbonyl group");
        }
        (0, namer_hetero_ts_1.perceiveHetero)(this);
        for (let i = 0; i < this.n; i++) {
            if (el[i] !== "S" || this.inRing[i] || this.het.has(i) || this.group[i] || this.sulfur.has(i))
                continue;
            const os = adj[i].filter((j) => el[j] === "O" && this.ord(i, j) === 2 && adj[j].length === 1 && !q[j]);
            if (!os.length)
                continue;
            const im = os.length === 1 ? adj[i].filter((j) => el[j] === "N" && this.ord(i, j) === 2 && !this.inRing[j] && !q[j] && adj[j].length === 1 && h[j] === 1) : [];
            const cs = this.carbons(i), rest = adj[i].filter((j) => !os.includes(j) && !cs.includes(j) && !im.includes(j));
            if (adj[i].some((j) => this.ord(i, j) === 2 && !os.includes(j) && !im.includes(j)) || cs.some((j) => (this.carbonylO[j] >= 0 && this.group[j] !== "ketone") || this.isNitrileC(j)))
                throw new Error("sulfur");
            if (os.length + im.length === 2 && cs.length === 1 && rest.length === 1 && el[rest[0]] === "O" && h[rest[0]] === 1 && adj[rest[0]].length === 1)
                this.mark(i, "sulfonic", cs);
            else if (os.length === 2 && cs.length === 1 && rest.length === 1 && HALO[el[rest[0]]] && adj[rest[0]].length === 1)
                this.mark(i, "sulfonylhalide", cs);
            else if (!(os.length + im.length <= 2 && cs.length === 2 && !rest.length))
                throw new Error("sulfur");
            if (this.cip[i] && !(os.length === 1 && !im.length && cs.length === 2))
                throw new Error("sulfur stereo");
            this.sulfur.add(i);
            for (const j of [...os, ...im, ...rest])
                this.sulfur.add(j);
        }
        for (let i = 0; i < this.n; i++) {
            if (el[i] !== "P" || this.het.has(i) || this.ions.has(i))
                continue;
            if (this.inRing[i] && !q[i] && !this.cip[i] && adj[i].reduce((t, j) => t + this.ord(i, j), 0) + h[i] === (this.lambda(i) ? 5 : 3) && adj[i].every((j) => this.ringOf[j] === this.ringOf[i] || this.ringOxide(j) || (el[j] === "C" && this.ord(i, j) === 1) || this.isOH(j))) {
                for (const o of adj[i].filter((j) => this.isOH(j))) {
                    this.het.set(o, "ON");
                    this.mark(o, "alcohol", [i]);
                }
                continue;
            }
            const os = adj[i].filter((j) => el[j] === "O" && this.ord(i, j) === 2 && adj[j].length === 1 && !q[j]), rest = adj[i].filter((j) => !os.includes(j));
            if (this.inRing[i] || q[i] || os.length > 1 || rest.length + h[i] !== 3 || rest.some((j) => el[j] !== "C" || this.ord(i, j) !== 1 || this.carbonylO[j] >= 0) || this.cip[i])
                throw new Error("phosphorus");
            this.phosphorus.add(i);
            for (const j of os)
                this.phosphorus.add(j);
        }
        for (let i = 0; i < this.n; i++)
            if (this.ringOxide(i) && this.lambda(this.adj[i][0]))
                this.mark(i, "ketone", [this.adj[i][0]]);
        for (let i = 0; i < this.n; i++) {
            if (this.group[i] || this.sulfur.has(i) || this.phosphorus.has(i) || this.pseudo.has(i) || this.het.has(i) || this.ions.has(i) || el[i] === "C" || this.inRing[i])
                continue;
            if (this.main.has(i))
                continue;
            const cs = this.carbons(i);
            if (HALO[el[i]]) {
                if (adj[i].length !== 1 || cs.length !== 1)
                    throw new Error("halogen");
                continue;
            }
            if (el[i] === "O" && adj[i].some((j) => this.group[j] === "imine") && adj[i].length - cs.length === 1 && adj[i].length <= 2)
                continue;
            if (this.nO.has(i) || this.hzN.has(i) || this.peroxO.has(i))
                continue;
            if (el[i] === "O") {
                if (adj[i].length === 1 && h[i] === 1 && cs.length === 1)
                    this.mark(i, "alcohol", cs);
                else if (!(adj[i].length === 2 && cs.length === 2) && !this.nitroAtom(i))
                    throw new Error("oxygen");
            }
            else if (el[i] === "S") {
                if (adj[i].length === 1 && h[i] === 1 && cs.length === 1)
                    this.mark(i, "thiol", cs);
                else if (!(adj[i].length === 2 && cs.length === 2))
                    throw new Error("sulfur");
            }
            else if (el[i] === "N") {
                if (this.nitroAtom(i) || this.diazoAtom(i) || this.azidoAtom(i))
                    continue;
                if (this.cationN(i)) {
                    if (!cs.length || cs.some((j) => this.carbonylO[j] >= 0 || this.isNitrileC(j)))
                        throw new Error("cation");
                    this.mark(i, "aminium", cs);
                    continue;
                }
                if ((0, namer_hetero_ts_1.heteroAmine)(this, i))
                    continue;
                if (cs.length !== adj[i].length || adj[i].some((j) => this.ord(i, j) !== 1) || cs.some((j) => this.carbonylO[j] >= 0 || this.isNitrileC(j)))
                    throw new Error("nitrogen");
                this.mark(i, "amine", cs);
            }
        }
        for (const [k, o] of this.bond) {
            const [a, b] = k.split(" ").map(Number);
            if ((this.inRing[a] && this.ringOf[a] === this.ringOf[b]) || (this.sulfur.has(a) && this.sulfur.has(b)) || (0, namer_hetero_ts_1.heteroBond)(this, a, b) || this.ionBonds.has(k))
                continue;
            if (this.main.has(a) || this.main.has(b))
                continue;
            const oxime = (x, y) => this.group[x] === "imine" && el[x] === "N" && el[y] === "O" && o === 1;
            const oxide = this.phosphorus.has(a) && this.phosphorus.has(b);
            const n2 = (this.diazoAtom(a) && this.diazoAtom(b)) || (this.azidoAtom(a) && this.azidoAtom(b));
            if (el[a] !== "C" && el[b] !== "C" && !this.nitroBond(a, b) && !oxime(a, b) && !oxime(b, a) && !oxide && !n2 && !this.classBond(a, b) && this.group[a] !== "ketone" && this.group[b] !== "ketone")
                throw new Error(`hetero bond ${el[a]}${o}${el[b]}`);
        }
    }
    ringOxide(o) {
        if ((this.el[o] !== "O" && this.el[o] !== "S") || this.q[o] || this.h[o] || this.adj[o].length !== 1)
            return false;
        const a = this.adj[o][0];
        if (this.el[o] === "S" && !["P", "As", "Sb", "Bi"].includes(this.el[a]))
            return false;
        return this.ord(a, o) === 2 && this.inRing[a] && (LAMBDA.has(this.el[a]) || !!HALO[this.el[a]]) && !this.q[a];
    }
    lambda(a) {
        if (HALO[this.el[a]])
            return this.inRing[a] && !this.q[a] ? `λ${"⁰¹²³⁴⁵⁶⁷"[this.adj[a].reduce((t, j) => t + this.ord(a, j), 0) + this.h[a]] ?? ""}` : "";
        const k = this.inRing[a] ? this.adj[a].filter((j) => this.ringOxide(j)).length : 0;
        return !k ? "" : DIVALENT.has(this.el[a]) ? (k === 1 ? "λ⁴" : k === 2 ? "λ⁶" : "") : k === 1 ? "λ⁵" : "";
    }
    mark(i, kind, on) { this.group[i] = kind; this.bearer.set(i, on); }
    carbonicGroup(c, ls) {
        var _a;
        const { el, adj } = this;
        const peroxy = new Map();
        const type = ls.map((x) => {
            if (HALO[el[x]] && adj[x].length === 1)
                return "X";
            if (CHALCOGENS.has(el[x]) && adj[x].length === 1 && this.h[x] === 1 && !this.q[x])
                return "OH";
            const r = adj[x].find((j) => j !== c);
            if (el[x] === "O" && adj[x].length === 2 && (el[r] === "C" || this.ringNO(x)))
                return el[r] !== "C" || this.carbonylO[r] < 0 ? "OR" : this.inRing[r] ? "" : "OCO";
            if (CHALCOGENS.has(el[x]) && el[x] !== "O" && adj[x].length === 2 && !this.q[x] && !this.inRing[x] && el[r] === "C" && this.carbonylO[r] < 0 && !this.isNitrileC(r))
                return "OR";
            if (el[x] === "O" && adj[x].length === 2 && el[r] === "O" && !this.inRing[r] && !this.q[r]) {
                const s = adj[r].find((j) => j !== x);
                if (s === undefined ? this.h[r] !== 1 : adj[r].length !== 2 || el[s] !== "C" || this.carbonylO[s] < 0 || this.carbons(s).length > 0 || this.inRing[s])
                    return "";
                peroxy.set(x, r);
                return s === undefined ? "OH" : "OCO";
            }
            if (el[x] === "N" && this.ord(c, x) === 1 && !this.q[x] && adj[x].every((j) => j === c || (el[j] === "C" && !this.isNitrileC(j)) || this.nOxy(x, j) || (0, namer_hetero_ts_1.amideHetero)(this, j) || this.ringAmino(x, j)))
                return "N";
            return "";
        });
        if (type.includes("") || ls.some((x) => this.prefixOnly.has(x)))
            throw new Error("carbonic acid derivative");
        const kind = type.includes("OH") ? "carbonic" : type.includes("OR") || type.includes("OCO") ? "carbamate" : type.includes("X") ? "carbonylhalide" : "urea";
        this.mark(c, kind, []);
        ls.forEach((x, k) => { this.group[x] = kind; if (type[k] === "OR" && !this.esterO.has(c))
            this.esterO.set(c, x); });
        for (const [x, r] of peroxy) {
            this.peroxO.add(x);
            this.peroxO.add(r);
            (_a = this.group)[r] ?? (_a[r] = kind);
        }
        for (const x of ls)
            if (el[x] === "N")
                for (const j of adj[x])
                    if (this.nOxy(x, j))
                        this.nO.add(j);
    }
    acylBridge(c, cs, others) {
        var _a;
        const { el, adj } = this;
        const s = (x) => el[x] === "S" && !this.inRing[x] && !this.q[x] && adj[x].length === 2 && adj[x].every((j) => this.ord(x, j) === 1);
        const acyl = (r) => el[r] === "C" && r !== c && this.carbonylO[r] >= 0 && !this.inRing[r];
        for (const x of others) {
            if (!s(x) || cs.length + others.length > 2)
                continue;
            const r = adj[x].find((j) => j !== c), path = acyl(r) ? [x] : s(r) && acyl(adj[r].find((j) => j !== x)) ? [x, r] : undefined;
            if (!path)
                continue;
            this.mark(c, "peroxide", cs);
            for (const j of [...others, ...path])
                (_a = this.group)[j] ?? (_a[j] = "peroxide");
            for (const j of path)
                this.peroxO.add(j);
            return true;
        }
        return false;
    }
    nOxy(n, o) {
        return this.el[o] === "O" && this.ord(n, o) === 1 && !this.q[o] && !this.inRing[o]
            && (this.adj[o].length === 1 ? this.h[o] === 1 : this.adj[o].length === 2 && this.adj[o].every((j) => j === n || (this.el[j] === "C" && this.carbonylO[j] < 0)));
    }
    hydrazideN(c, x) {
        const { el, adj } = this;
        if (el[x] !== "N" || this.ord(c, x) !== 1 || this.inRing[x] || this.q[x])
            return undefined;
        const ys = adj[x].filter((j) => j !== c && el[j] !== "C"), y = ys[0];
        if (ys.length !== 1 || el[y] !== "N" || this.ord(x, y) !== 1 || this.inRing[y] || this.q[y])
            return undefined;
        const carbon = (n, not) => adj[n].every((j) => j === not || (el[j] === "C" && !this.isNitrileC(j)));
        return carbon(x, y) && carbon(y, x) ? y : undefined;
    }
    hydrazineN(c) {
        const { el, adj } = this;
        const ok = (n) => el[n] === "N" && !this.inRing[n] && !this.q[n];
        return adj[c].filter((n) => {
            if (!ok(n) || this.ord(c, n) !== 1)
                return false;
            const ms = adj[n].filter((j) => el[j] !== "C"), m = ms[0];
            return ms.length === 1 && ok(m) && adj[m].every((j) => j === n || (el[j] === "C" && !this.isNitrileC(j))) && adj[n].every((j) => j === m || (el[j] === "C" && !this.isNitrileC(j)));
        });
    }
    hydrazineGroup(c, n, x, imine) {
        const { el, adj } = this;
        const r = adj[x].find((j) => j !== c);
        const oxo = HALO[el[x]] && adj[x].length === 1 ? "halide" : el[x] === "O" && adj[x].length === 1 && this.h[x] === 1 ? "acid"
            : el[x] === "O" && adj[x].length === 2 && ((el[r] === "C" && this.carbonylO[r] < 0) || this.ringNO(x)) ? "ester"
                : el[x] === "N" && this.ord(c, x) === 1 && !this.inRing[x] && !this.q[x] && adj[x].every((j) => j === c || (el[j] === "C" && !this.isNitrileC(j)) || this.nOxy(x, j)) ? "amide"
                    : this.hydrazideN(c, x) !== undefined && imine === undefined ? "hydrazide" : undefined;
        const kind = imine === undefined ? oxo : { halide: "imidoylhalide", acid: "imidic", ester: "imidate", amide: "amidine" }[oxo ?? ""];
        if (!kind)
            throw new Error("carbonic acid derivative");
        this.mark(c, kind, [n]);
        this.group[x] = kind;
        if (kind === "hydrazide")
            this.group[this.hydrazideN(c, x)] = kind;
        if (imine !== undefined)
            this.group[imine] = "imine";
        if (kind === "ester" || kind === "imidate")
            this.esterO.set(c, x);
        for (const j of adj[x])
            if ((kind === "amide" || kind === "amidine") && this.nOxy(x, j))
                this.nO.add(j);
        this.hzN.add(n);
        this.hzN.add(adj[n].find((j) => el[j] === "N"));
    }
    peroxyGroup(c, cs, x, y) {
        const r = this.adj[y].find((j) => j !== x);
        const kind = r === undefined ? (this.h[y] === 1 ? "peroxy" : this.q[y] === -1 ? "peroxoate" : undefined) : this.el[r] !== "C" ? undefined
            : this.carbonylO[r] < 0 ? "peroxyester" : this.inRing[r] ? undefined : "peroxide";
        if (!kind || this.inRing[x] || this.adj[y].length > 2)
            throw new Error("carbonyl group");
        this.mark(c, kind, cs);
        this.group[x] = this.group[y] = kind;
        this.peroxO.add(x);
        this.peroxO.add(y);
        if (kind === "peroxyester")
            this.esterO.set(c, y);
    }
    peroxideName() {
        const cs = [...this.bearer.keys()].filter((g) => this.group[g] === "peroxide");
        if (cs.length !== 2)
            throw new Error("peroxide");
        const x = this.groupHetero(cs[0]).find((j) => this.peroxO.has(j));
        const word = this.el[x] === "O" ? "peroxide" : this.adj[x].some((j) => this.peroxO.has(j)) ? "disulfide" : "sulfide";
        const acyls = cs.map((c) => this.acylName(c, this.groupHetero(c).find((j) => this.peroxO.has(j))));
        if (acyls[0].text === acyls[1].text)
            return `${times(2, acyls[0])} ${word}`;
        return `${acyls.map((a) => enclose(a)).sort((a, b) => alphaKey(a).localeCompare(alphaKey(b))).join(" ")} ${word}`;
    }
    pseudoGroup(c) {
        const { el, adj } = this;
        if (this.inRing[c] || this.q[c] || adj[c].length !== 2)
            return false;
        for (const [n, x] of [adj[c], [...adj[c]].reverse()]) {
            const stem = { O: "", S: "thio", Se: "seleno", Te: "telluro" }[el[x]];
            if (el[n] !== "N" || stem === undefined || this.q[n] || this.q[x] || this.inRing[n] || this.inRing[x])
                continue;
            const iso = this.ord(c, n) === 2 && this.ord(c, x) === 2 && adj[x].length === 1;
            const cyan = this.ord(c, n) === 3 && this.ord(c, x) === 1 && adj[n].length === 1;
            if (!iso && !cyan)
                continue;
            const at = iso ? n : x, word = `${iso ? "iso" : ""}${stem}cyan`;
            if (adj[at].length === 1 && this.h[at] === 1)
                this.whole = `${word}ic acid`;
            else if (adj[at].length !== 2 || this.h[at] || this.ord(at, adj[at].find((j) => j !== c)) !== 1)
                continue;
            else
                this.prefixOnly.set(at, `${word}ato`);
            for (const a of [c, n, x])
                this.pseudo.add(a);
            return true;
        }
        return false;
    }
    amidineGroup(c, n, cs, rest) {
        const { el, adj } = this;
        const plain = (x) => el[x] === "N" && this.ord(c, x) === 1 && !this.inRing[x] && !this.q[x] && adj[x].every((j) => j === c || el[j] === "C" || this.nOxy(x, j));
        for (const x of rest)
            if (plain(x))
                for (const j of adj[x])
                    if (this.nOxy(x, j))
                        this.nO.add(j);
        const m = rest[0];
        if (!cs.length && rest.length === 1 && el[m] === "N" && this.ord(c, m) === 2 && !this.inRing[m] && !this.q[m] && adj[m].length + this.h[m] === 2
            && adj[m].every((j) => j === c || (el[j] === "C" && this.carbonylO[j] < 0 && !this.isNitrileC(j)))) {
            this.mark(c, "imine", []);
            this.group[n] = this.group[m] = "imine";
            this.diimine.add(c);
            return;
        }
        const hz = !cs.length && rest.length === 2 ? this.hydrazineN(c) : [];
        if (hz.length === 1) {
            this.hydrazineGroup(c, hz[0], rest.find((j) => j !== hz[0]), n);
            return;
        }
        if (!cs.length && rest.length === 2 && !rest.every(plain)) {
            this.carbonicGroup(c, rest);
            this.group[n] = "imine";
            return;
        }
        const x = rest[0], r = adj[x].find((j) => j !== c);
        const one = plain(x) ? "amidine" : el[x] === "O" && adj[x].length === 1 && this.h[x] === 1 ? "imidic"
            : el[x] === "O" && adj[x].length === 2 && ((el[r] === "C" && this.carbonylO[r] < 0) || this.ringNO(x)) ? "imidate" : HALO[el[x]] && adj[x].length === 1 ? "imidoylhalide" : undefined;
        const kind = cs.length <= 1 && rest.length === 1 ? one : !cs.length && rest.length === 2 ? "guanidine" : undefined;
        if (!kind)
            throw new Error("imine");
        this.mark(c, kind, cs);
        this.group[n] = "imine";
        for (const y of rest)
            this.group[y] = kind;
        if (kind === "imidate")
            this.esterO.set(c, x);
    }
    nitroAtom(i) {
        if (this.el[i] !== "N" && this.el[i] !== "O")
            return false;
        const n = this.el[i] === "N" ? i : this.adj[i].find((j) => this.el[j] === "N");
        if (n === undefined || this.el[n] !== "N" || this.q[n] !== 1)
            return false;
        const os = this.adj[n].filter((j) => this.el[j] === "O");
        return os.length === 2 && os.some((o) => this.ord(n, o) === 2 && !this.q[o]) && os.some((o) => this.ord(n, o) === 1 && this.q[o] === -1)
            && this.adj[n].length === 3 && this.adj[n].some((j) => this.el[j] === "C" || (this.el[j] === "N" && !this.q[j]));
    }
    n2End(mid) {
        if (this.el[mid] !== "N" || this.q[mid] !== 1 || this.h[mid] || this.adj[mid].length !== 2)
            return undefined;
        const end = this.adj[mid].find((j) => this.el[j] === "N" && this.q[j] === -1 && !this.h[j] && this.adj[j].length === 1 && this.ord(mid, j) === 2);
        if (end === undefined)
            return undefined;
        const x = this.adj[mid].find((j) => j !== end);
        return this.ord(mid, x) === 2 ? x : undefined;
    }
    diazoAtom(i) {
        if (this.el[i] !== "N")
            return false;
        const mid = this.q[i] === 1 ? i : this.adj[i].find((j) => this.q[j] === 1);
        const c = mid === undefined ? undefined : this.n2End(mid);
        return c !== undefined && this.el[c] === "C" && !this.inRing[c];
    }
    azidoAtom(i) {
        if (this.el[i] !== "N")
            return false;
        const mids = this.q[i] === 1 ? [i] : this.adj[i].filter((j) => this.el[j] === "N" && this.q[j] === 1);
        for (const mid of mids) {
            const n = this.n2End(mid);
            if (n === undefined || this.el[n] !== "N" || this.q[n] || this.h[n] || this.adj[n].length !== 2)
                continue;
            const c = this.adj[n].find((j) => j !== mid);
            if ((this.el[c] === "C" || CATENATE.has(this.el[c])) && this.ord(n, c) === 1)
                return true;
        }
        return false;
    }
    cationN(i) {
        if (this.el[i] !== "N" || this.q[i] !== 1 || this.nitroAtom(i) || (0, namer_hetero_ts_1.nOxideN)(this, i))
            return false;
        const valence = this.adj[i].reduce((t, j) => t + this.ord(i, j), 0) + this.h[i];
        return valence === 4 && (this.inRing[i] ? this.adj[i].every((j) => this.ord(i, j) === 1 || this.ringOf[j] === this.ringOf[i]) : this.adj[i].every((j) => this.ord(i, j) === 1));
    }
    imineN(c) {
        const n = this.adj[c].find((j) => this.el[j] === "N" && this.ord(c, j) === 2);
        if (n === undefined || this.inRing[n] || this.q[n])
            return undefined;
        const rest = this.adj[n].filter((j) => j !== c);
        if (rest.length + this.h[n] !== 1)
            return undefined;
        const x = rest[0];
        if (x === undefined)
            return n;
        if (this.ord(n, x) !== 1)
            return undefined;
        if (this.el[x] === "C" && this.carbonylO[x] < 0)
            return n;
        if (this.el[x] === "O" && !this.q[x] && this.adj[x].length + this.h[x] === 2 && this.adj[x].every((j) => j === n || (this.el[j] === "C" && this.carbonylO[j] < 0)))
            return n;
        if (this.el[x] === "N" && this.inRing[x] && !this.q[x])
            return n;
        if (this.el[x] === "S" && !this.inRing[x] && !this.q[x] && this.adj[x].filter((o) => this.isOxo(x, o)).length === 2 && !this.inRing[c]
            && this.adj[c].some((j) => j !== n && this.el[j] === "N" && this.ord(c, j) === 1 && !this.inRing[j]))
            return n;
        return undefined;
    }
    perceiveIons() {
        const { el, h, q, adj } = this;
        const valence = (i) => adj[i].reduce((t, j) => t + this.ord(i, j), 0) + h[i];
        const single = (i) => adj[i].every((j) => this.ord(i, j) === 1);
        const plainC = (c) => el[c] === "C" && !q[c] && this.carbonylO[c] < 0 && !this.isNitrileC(c);
        const oMinus = (o) => el[o] === "O" && q[o] === -1 && !h[o] && adj[o].length === 1 && single(o);
        const terminalO = (x, o) => el[o] === "O" && !q[o] && adj[o].length === 1 && this.ord(x, o) === 2;
        const ion = (i, kind, on) => { this.ions.add(i); if (kind)
            this.mark(i, kind, on); };
        for (let i = 0; i < this.n; i++) {
            const x = adj[i][0];
            if (oMinus(i) && el[x] === "O" && !this.inRing[x] && adj[x].some((c) => c !== i && el[c] === "C" && this.carbonylO[c] >= 0 && el[this.carbonylO[c]] === "O"))
                ion(i);
        }
        for (let i = 0; i < this.n; i++) {
            if (!q[i] || this.nitroAtom(i) || this.diazoAtom(i) || this.azidoAtom(i) || this.ions.has(i))
                continue;
            const e = el[i], cs = this.carbons(i);
            if (oMinus(i)) {
                const x = adj[i][0];
                if (el[x] === "C" && !q[x] && this.carbonylO[x] >= 0 && !this.inRing[x] && this.carbons(x).length <= 1 && adj[x].length === this.carbons(x).length + 2) {
                    ion(i);
                    this.group[i] = "carboxylate";
                    this.mark(x, "carboxylate", this.carbons(x));
                    this.group[this.carbonylO[x]] = "ketone";
                }
                else if (plainC(x))
                    ion(i, "olate", [x]);
                else if ((el[x] === "S" || CHALCOGEN.has(el[x])) && !q[x] && !this.inRing[x] && (adj[x].length === 4 || adj[x].length === 3) && !this.group[x]) {
                    const os = adj[x].filter((o) => terminalO(x, o)), c = adj[x].filter(plainC);
                    if (os.length === adj[x].length - 2 && c.length === 1) {
                        ion(i);
                        this.mark(x, os.length === 2 ? "sulfonateion" : "sulfinate", c);
                        if (el[x] === "S")
                            for (const j of [x, i, ...os])
                                this.sulfur.add(j);
                    }
                }
                if (!this.ions.has(i) && (el[x] === "S" || el[x] === "P" || el[x] === "C") && !q[x] && !this.inRing[x] && !this.esterIon) {
                    const of = (f) => adj[x].filter((o) => o !== i && f(o));
                    const os = of((o) => terminalO(x, o)), minus = [i, ...of(oMinus)], ohs = of((o) => el[o] === "O" && !q[o] && h[o] === 1 && adj[o].length === 1);
                    const ors = of((o) => el[o] === "O" && !q[o] && !h[o] && adj[o].length === 2 && this.ord(x, o) === 1 && plainC(adj[o].find((j) => j !== x)));
                    const word = el[x] === "S" ? os.length === 2 && minus.length === 1 && !ohs.length && ors.length === 1 && "sulfate"
                        : el[x] === "P" ? os.length === 1 && ors.length && adj[x].length === 4 && "phosphate" : os.length === 1 && minus.length === 1 && ors.length === 1 && !ohs.length && "carbonate";
                    if (!word || adj[x].length !== os.length + minus.length + ohs.length + ors.length)
                        continue;
                    for (const j of [x, ...minus])
                        ion(j);
                    this.esterIon = { x, word, ors, ohs: ohs.length };
                    const set = el[x] === "S" ? this.sulfur : el[x] === "P" ? this.phosphorus : this.ions;
                    for (const j of [x, ...os, ...minus, ...ohs, ...ors])
                        set.add(j);
                    for (const o of os)
                        this.group[o] = "ketone";
                }
            }
            else if (e === "N" && q[i] === -1 && valence(i) === 2 && single(i)) {
                if (this.inRing[i]) {
                    if (!h[i] && adj[i].length === 2)
                        ion(i, "ide", [i]);
                }
                else if (cs.length && cs.length === adj[i].length && cs.every(plainC))
                    ion(i, "aminide", cs);
                else {
                    const alkoxy = (c) => adj[c].filter((o) => el[o] === "O" && !q[o] && adj[o].length === 2 && this.ord(c, o) === 1 && plainC(adj[o].find((k) => k !== c)));
                    const acyl = (c) => el[c] === "C" && !q[c] && !this.inRing[c] && this.carbonylO[c] >= 0 && this.carbons(c).length + alkoxy(c).length <= 1 && adj[c].length === this.carbons(c).length + alkoxy(c).length + 2;
                    const sulfonyl = (s) => el[s] === "S" && !q[s] && !this.inRing[s] && adj[s].length === 4 && adj[s].filter((o) => terminalO(s, o)).length === 2 && adj[s].filter(plainC).length === 1;
                    const cyano = (c) => el[c] === "C" && !q[c] && adj[c].length === 2 && adj[c].some((n) => el[n] === "N" && !q[n] && adj[n].length === 1 && this.ord(c, n) === 3);
                    if (!adj[i].every((j) => plainC(j) || acyl(j) || sulfonyl(j) || cyano(j) || el[j] === "Si"))
                        continue;
                    ion(i);
                    this.azanide.push(i);
                    for (const j of adj[i]) {
                        if (cyano(j)) {
                            this.group[j] = "nitrile";
                            this.group[adj[j].find((n) => n !== i)] = "nitrile";
                        }
                        if (acyl(j)) {
                            this.ions.add(j);
                            this.group[this.carbonylO[j]] = "ketone";
                        }
                        if (sulfonyl(j)) {
                            for (const k of [j, ...adj[j].filter((o) => terminalO(j, o))])
                                this.sulfur.add(k);
                            this.ionBonds.add(this.key(i, j));
                        }
                    }
                }
            }
            else if (e === "C" && Math.abs(q[i]) === 1 && valence(i) === 3 && this.carbonylO[i] < 0 && !this.isNitrileC(i))
                ion(i, q[i] < 0 ? "ide" : "ylium", [i]);
            else if (q[i] === -1 && valence(i) === { P: 2, As: 2, Sb: 2, Si: 3, Ge: 3, Sn: 3 }[e]) {
                if (this.inRing[i])
                    ion(i, "ide", [i]);
                else if (adj[i].every((j) => plainC(j) && this.ord(i, j) === 1)) {
                    ion(i);
                    this.azanide.push(i);
                }
            }
            else if (e === "N" && q[i] === 1 && !this.cationN(i) && !this.inRing[i] && !h[i] && adj[i].length === 2) {
                const n2 = adj[i].find((j) => el[j] === "N" && !q[j] && !h[j] && adj[j].length === 1 && this.ord(i, j) === 3), c = adj[i].find(plainC);
                if (n2 === undefined || c === undefined || this.ord(i, c) !== 1)
                    continue;
                ion(i, "diazonium", [c]);
                this.group[n2] = "diazonium";
                this.ionBonds.add(this.key(i, n2));
            }
            else if (e === "N" && q[i] === 1 && !this.inRing[i] && valence(i) === 4) {
                const c = adj[i].find((j) => this.ord(i, j) === 2);
                if (c === undefined || el[c] !== "C" || q[c] || this.carbonylO[c] >= 0 || adj[i].some((j) => j !== c && (!(plainC(j) || oMinus(j)) || this.ord(i, j) !== 1)))
                    continue;
                ion(i, "iminium", [c]);
            }
            else if (q[i] === 1 && !this.inRing[i] && (e === "S" || e === "P" || e === "O" || HALO[e]) && single(i) && valence(i) === (e === "P" ? 4 : HALO[e] ? 2 : 3) && cs.length && cs.length === adj[i].length && cs.every((c) => plainC(c) || (q[c] === -1 && valence(c) === 3))) {
                ion(i);
                this.onium.push(i);
            }
            else if (q[i] === 1 && e === "S" && !this.inRing[i] && adj[i].length === 4 && cs.length === 3 && adj[i].some((o) => terminalO(i, o)) && cs.every((c) => plainC(c) || (q[c] === -1 && valence(c) === 3))) {
                ion(i);
                this.onium.push(i);
                for (const j of [i, ...adj[i].filter((o) => terminalO(i, o))])
                    this.sulfur.add(j);
            }
            else if (q[i] === 1 && (e === "O" || e === "S" || CHALCOGEN.has(e)) && this.inRing[i] && adj[i].length === 2 && !h[i] && adj[i].filter((j) => this.ord(i, j) === 2).length === 1)
                ion(i);
        }
        for (let i = 0; i < this.n; i++) {
            const x = adj[i][0];
            if (!oMinus(i) || this.ions.has(i) || this.nitroAtom(i) || !(this.cationN(x) || this.onium.includes(x) || this.group[x] === "iminium"))
                continue;
            ion(i);
            this.ionBonds.add(this.key(i, x));
        }
    }
    ionParent(kind) {
        const anion = ANION_KINDS.includes(kind);
        if (this.esterIon) {
            const { x, word, ors, ohs } = this.esterIon;
            if (anion || this.azanide.length)
                throw new Error("several anions");
            const alkyls = ors.map((o) => this.substituent(this.adj[o].find((j) => j !== x), o).text).sort((a, b) => alphaKey(a).localeCompare(alphaKey(b)));
            const words = [...new Set(alkyls)].map((t) => { const k = alkyls.filter((a) => a === t).length; return k < 2 ? t : `${MULT[k]}${t}`; });
            return [...words, ...(ohs ? [`${ohs > 1 ? MULT[ohs] : ""}hydrogen`] : []), word].join(" ");
        }
        if (this.azanide.length) {
            if (anion || this.azanide.length > 1)
                throw new Error("several anions");
            return this.centre(this.azanide[0]);
        }
        if (anion)
            return undefined;
        if (this.onium.length)
            return this.oniumName();
        const rings = new Set([...Array(this.n).keys()].filter((i) => this.inRing[i] && this.q[i] === 1 && (this.cationN(i) || this.ions.has(i))).map((i) => this.ringOf[i]));
        if (!rings.size || !kind || SENIORITY.indexOf(kind) <= SENIORITY.indexOf("diazonium"))
            return undefined;
        return this.parentName(undefined, undefined, new Set([...rings].flatMap((k) => this.rings[k])))?.text;
    }
    radicals() {
        for (let i = 0; i < this.n; i++) {
            if (this.opaque.has(i))
                continue;
            const e = this.el[i], q = this.q[i], low = e === "C" ? 4 - Math.abs(q) : e === "N" || e === "P" ? 3 + q : e === "O" || e === "S" ? 2 + q : HALO[e] ? 1 + q : undefined;
            if (low !== undefined && this.adj[i].reduce((t, j) => t + this.ord(i, j), 0) + this.h[i] < low)
                throw new Error("radical");
        }
    }
    ionPrefix(x, from) {
        const g = this.group[x], el = this.el[x];
        if ((this.ions.has(x) || this.het.get(x) === "NO-") && el === "O" && this.q[x] === -1 && this.adj[x].length === 1)
            return { text: "oxido", compound: false };
        if (g === "carboxylate")
            return { text: "carboxylato", compound: false };
        if (g === "sulfonateion" || g === "sulfinate")
            return { text: (0, namer_maingroup_ts_1.chalcogenStem)(el) + (g === "sulfinate" ? "inato" : "onato"), compound: false };
        const oxide = !this.inRing[x] && (0, namer_hetero_ts_1.nOxideN)(this, x) && this.adj[x].every((j) => this.ord(x, j) === 1);
        if (g === "aminium" || this.onium.includes(x) || oxide)
            return { text: `${this.centre(x, from)}yl`, compound: this.adj[x].length > 1 };
        if ((g && ANION_KINDS.includes(g)) || g === "ylium" || g === "iminium" || g === "diazonium" || (this.ions.has(x) && this.inRing[x]))
            throw new Error(`${g ?? "ion"} as a prefix`);
        return undefined;
    }
    oniumName() {
        if (this.onium.length !== 1)
            throw new Error("several onium ions");
        return this.centre(this.onium[0]);
    }
    centre(x, from = -1) {
        const el = this.el[x], oxo = this.adj[x].filter((j) => this.ord(x, j) === 2 && this.el[j] === "O");
        const subs = [...this.adj[x].filter((j) => j !== from && !oxo.includes(j)).map((j) => this.substituent(j, x)), ...oxo.map(() => ({ text: "oxo", compound: false }))];
        const word = this.q[x] < 0 ? { N: "azanide", P: "phosphanide", As: "arsanide", Sb: "stibanide", Si: "silanide", Ge: "germanide", Sn: "stannanide" }[el] : oxo.length ? "-λ4-sulfanium" : { N: "azanium", S: "sulfanium", P: "phosphanium", O: "oxidanium", I: "iodanium", Br: "bromanium", Cl: "chloranium", F: "fluoranium" }[el];
        if (!word)
            throw new Error("charge");
        return substituted(subs) + word;
    }
    ringInfo(cycle) {
        const k = this.ringOf[cycle[0]];
        if (this.fused[k]) {
            let f;
            try {
                f = this.fusedInfo(k);
            }
            catch (e) {
                const b = this.bridgedInfo(k);
                if (!b)
                    throw e;
                return { numberings: b.nums, aromatic: false, bridged: b };
            }
            return { numberings: f.nums, aromatic: true, fused: f };
        }
        const size = cycle.length, ringBonds = cycle.map((a, k) => this.ord(a, cycle[(k + 1) % size]));
        const doubles = cycle.map((a) => cycle.some((b) => b !== a && this.ord(a, b) === 2 && this.adjacentIn(cycle, a, b)));
        const hetero = cycle.filter((a) => this.el[a] !== "C");
        const allNumberings = [];
        for (let s = 0; s < size; s++)
            for (const dir of [1, -1])
                allNumberings.push(cycle.map((_, k) => cycle[(s + dir * k + size * 2) % size]));
        const aromatic6 = size === 6 && doubles.every(Boolean);
        const aromatic5 = size === 5 && ringBonds.filter((o) => o === 2).length === 2 && cycle.filter((_, k) => !doubles[k]).every((a) => this.el[a] !== "C");
        const aromatic = aromatic6 || aromatic5;
        if (ringBonds.some((o) => o === 3) && hetero.length)
            throw new Error("ring triple bond");
        if (!hetero.length && !aromatic6)
            return { numberings: allNumberings, aromatic: false };
        if ((!aromatic && ringBonds.some((o) => o === 2)) || hetero.some((a) => MAIN[this.el[a]] && !(aromatic6 && this.q[a] === 1)) || cycle.some((a) => this.lambda(a)))
            return this.monoInfo(cycle);
        const heteroLocants = (num) => num.map((a, k) => (this.el[a] !== "C" ? k + 1 : 0)).filter(Boolean);
        let best = allNumberings;
        best = this.lowest(best, heteroLocants);
        for (const e of HETERO_ORDER)
            best = this.lowest(best, (num) => num.map((a, k) => (this.el[a] === e ? k + 1 : 0)).filter(Boolean));
        if (aromatic5)
            best = this.lowest(best, (num) => num.map((a, k) => (this.el[a] !== "C" && !doubles[cycle.indexOf(a)] ? k + 1 : 0)).filter(Boolean));
        const sig = best[0].map((a, k) => (this.el[a] !== "C" ? `${this.el[a]}${k + 1}` : "")).filter(Boolean).sort((x, y) => HETERO_ORDER.indexOf(x[0]) - HETERO_ORDER.indexOf(y[0]) || parseInt(x.slice(1)) - parseInt(y.slice(1)));
        const ring = RINGS[`${size}${aromatic ? "a" : "s"}:${sig.join(",")}`] ?? ION_RINGS[`${size}${aromatic ? "a" : "s"}:${sig.join(",")}`];
        if (!ring)
            return this.monoInfo(cycle);
        return { ring, numberings: best, aromatic };
    }
    monoInfo(cycle) {
        const size = cycle.length, el = (a) => this.el[a], set = new Set(cycle);
        if (cycle.some((a) => !HW[el(a)] && el(a) !== "C") || size < 3)
            throw new Error("unknown ring");
        let nums = [];
        for (let s = 0; s < size; s++)
            for (const dir of [1, -1])
                nums.push(cycle.map((_, k) => cycle[(s + dir * k + size * 2) % size]));
        const at = (e) => (num) => num.flatMap((a, k) => ((e ? el(a) === e : el(a) !== "C") ? [k + 1] : []));
        if (size <= 10)
            nums = nums.filter((num) => el(num[0]) === HW_ORDER.find((e) => cycle.some((a) => el(a) === e)));
        nums = this.lowest(nums, at());
        for (const e of HW_ORDER)
            nums = this.lowest(nums, at(e));
        nums = this.lowest(nums, (num) => num.flatMap((a, k) => (this.lambda(a) ? [k + 1] : [])));
        const els = nums[0].map(el), ring = (a) => this.adj[a].filter((j) => set.has(j)), lam = nums[0].map((a) => this.lambda(a));
        const retained = (n) => n && (lam.some(Boolean) ? `${lam.flatMap((l, k) => (l ? [`${k + 1}${l}`] : [])).join(",")}-${n}` : n);
        const bonds = cycle.map((a, k) => [a, cycle[(k + 1) % size]]);
        if (bonds.some(([a, b]) => this.ord(a, b) === 3))
            throw new Error("ring triple bond");
        const doubles = (a) => ring(a).filter((j) => this.ord(a, j) === 2).length;
        for (const a of cycle) {
            if (!doubles(a))
                continue;
            if (DIVALENT.has(el(a)) || HALO[el(a)])
                throw new Error("ring heteroatom double bond");
            if (doubles(a) > 1 || this.adj[a].some((j) => !set.has(j) && this.ord(a, j) > 1))
                throw new Error("ring bonds");
        }
        if (size > 10 && cycle.some((a) => el(a) !== "C" && !REPLACE.some(([e]) => e === el(a))))
            throw new Error("unknown ring");
        if (size > 10)
            return { numberings: nums, aromatic: false, bridged: { prefix: "cyclo", nums, bonds } };
        const key = `${size}:${HW_ORDER.flatMap((e) => els.flatMap((x, k) => (x === e ? [`${e}${k + 1}`] : []))).join(",")}`;
        if (bonds.every(([a, b]) => this.ord(a, b) === 1)) {
            const name = retained(SATURATED[key]) || hwName(els, true, lam);
            return { ring: { name, stem: name.replace(/e$/, ""), aromatic: false }, numberings: nums, aromatic: false };
        }
        const cn = cycle.filter((a) => !DIVALENT.has(el(a)) && !HALO[el(a)]), d = cn.filter((a) => !doubles(a));
        let indicated = 0;
        if (cn.length === size)
            indicated = size % 2;
        else
            for (let k = 0, s = cycle.findIndex((a) => !cn.includes(a)), run = 0; k <= size; k++) {
                const a = cycle[(s + k) % size];
                if (cn.includes(a) && k < size)
                    run++;
                else {
                    indicated += run % 2;
                    run = 0;
                }
            }
        const name = retained(MANCUDE[key]) || hwName(els, false, lam);
        const tpl = { name, labels: cycle.map((_, k) => String(k + 1)), el: els, adj: [], order: [], bonds: size, formula: "", odd: indicated > 0 };
        return { numberings: nums, aromatic: true, fused: { tpl, nums, cn, d, ring, mono: indicated } };
    }
    monoSaturation(f, num, ketones) {
        const byLoc = (l) => [...l].sort((a, b) => num.indexOf(a) - num.indexOf(b));
        const d = byLoc(f.d), rest = (sat) => f.cn.filter((a) => !sat.includes(a));
        let best;
        for (const xs of subsets(d, f.mono)) {
            if (!pairable(rest(xs), f.ring))
                continue;
            const free = d.filter((a) => !xs.includes(a) && !ketones.includes(a));
            for (let m = 0; m <= free.length && (!best || m < best.ys.length); m++) {
                const ys = subsets(free, m).find((y) => pairable(rest([...xs, ...ketones, ...y]), f.ring));
                if (ys) {
                    best = { xs, ys };
                    break;
                }
            }
            if (best && !best.ys.length)
                break;
        }
        if (!best)
            throw new Error("indicated hydrogen");
        const { xs, ys } = best, sat = [...xs, ...ketones, ...ys];
        return { x: xs[0], xs, y: ys[0], ys, yOn: byLoc(ketones.filter((a) => !xs.includes(a) && f.cn.includes(a))).pop(), hydro: d.filter((a) => !sat.includes(a)) };
    }
    assemblyComponent(r) {
        const info = this.ringInfo(r);
        if (info.fused)
            return !info.fused.tpl.odd && !info.fused.d.length ? info.fused.tpl.name : undefined;
        return info.ring?.aromatic && !info.ring.hydrogen ? info.ring.name : undefined;
    }
    assemblyInfo(asm) {
        const [ra, rb] = asm.rings, [ja, jb] = asm.junction, ia = this.ringInfo(ra), ib = this.ringInfo(rb);
        let nums = [];
        for (const [x, y] of [[ia, ib], [ib, ia]])
            for (const n1 of x.numberings)
                for (const n2 of y.numberings)
                    nums.push(n1.flatMap((a, k) => [a, n2[k]]));
        nums = this.lowest(nums, (num) => [num.indexOf(ja) + 1, num.indexOf(jb) + 1]);
        const name = this.assemblyComponent(ra);
        const stem = name === "benzene" ? "biphenyl" : /^\d/.test(name) ? `bi(${name})` : `bi${name}`;
        return { numberings: nums, aromatic: true, assembly: { stem, labels: ia.fused ? ia.fused.tpl.labels : ra.map((_, k) => String(k + 1)), junction: asm.junction } };
    }
    fusedInfo(k) {
        const cached = this.fusedCache.get(k);
        if (cached)
            return cached;
        const atoms = this.rings[k], sys = new Set(atoms);
        const ringAdj = new Map(atoms.map((a) => [a, this.adj[a].filter((j) => sys.has(j))]));
        const ring = (a) => ringAdj.get(a);
        const cn = [], d = [], dehydro = [];
        for (const a of atoms) {
            const doubles = ring(a).filter((j) => this.ord(a, j) > 1).length, triple = ring(a).find((j) => this.ord(a, j) === 3);
            if (doubles > 1 || (triple !== undefined && (this.el[a] !== "C" || this.el[triple] !== "C")))
                throw new Error("ring bonds");
            if (triple !== undefined && a < triple)
                dehydro.push([a, triple]);
            const ylidene = (j) => this.el[a] === "C" && !doubles && this.ord(a, j) === 2 && (this.el[j] === "C" || this.el[j] === "N");
            if (this.adj[a].some((j) => !sys.has(j) && this.ord(a, j) > 1 && j !== this.carbonylO[a] && !ylidene(j) && !(this.ringOxide(j) && this.lambda(a)) && !(0, namer_maingroup_ts_1.chalcogenOne)(this, j)))
                throw new Error("exocyclic double bond");
            if (PI_ATOMS.has(this.el[a]) || (this.q[a] > 0 && DIVALENT.has(this.el[a]))) {
                cn.push(a);
                if (!doubles)
                    d.push(a);
            }
            else if (doubles)
                throw new Error("ring heteroatom double bond");
        }
        const bonds = atoms.reduce((t, a) => t + ring(a).length, 0) / 2, formula = atoms.map((a) => this.el[a]).sort().join("");
        for (const tpl of FUSED) {
            if (tpl.el.length !== atoms.length || tpl.bonds !== bonds || tpl.formula !== formula)
                continue;
            const nums = this.match(tpl, atoms, ring);
            if (!nums.length)
                continue;
            const f = { tpl, nums, cn, d, ring, dehydro };
            this.fusedCache.set(k, f);
            return f;
        }
        const p = (0, fusion_ts_1.fusedParent)(atoms, (a) => this.el[a], ring, this.ord);
        const own = (a) => ring(a).filter((b) => !p.fixed?.includes(b)).length;
        const sp2 = (a) => (this.el[a] === "C" || ring(a).length < 3 || ring(a).some((b) => this.ord(a, b) === 2)) && !p.fixed?.includes(a) && own(a) < 4;
        const tpl = { name: p.name, labels: p.labels, el: [], adj: [], order: [], bonds, formula, odd: cn.filter(sp2).length % 2 === 1, uncited: p.uncited, hydrogens: p.hydrogens, bridges: p.bridges };
        if (dehydro.some((b) => b.some((a) => !sp2(a))))
            throw new Error("ring bonds");
        const f = { tpl, nums: p.nums, cn: cn.filter(sp2), d: d.filter(sp2), ring, dehydro };
        this.fusedCache.set(k, f);
        return f;
    }
    bridgedInfo(k) {
        const atoms = this.rings[k], sys = new Set(atoms), ring = (a) => this.adj[a].filter((j) => sys.has(j));
        const bonds = atoms.flatMap((a) => ring(a).filter((b) => a < b).map((b) => [a, b]));
        const unsaturated = bonds.some(([a, b]) => this.ord(a, b) > 1);
        if (atoms.length === 10 && bonds.length === 12 && !unsaturated && atoms.every((a) => ["C", "N", "O", "S", "P", "As"].includes(this.el[a]) && (this.el[a] === "C" || !this.q[a]))) {
            let nums = this.match(ADAMANTANE, atoms, ring);
            nums = this.lowest(nums, (num) => num.map((a, i) => (this.el[a] !== "C" ? i + 1 : 0)).filter(Boolean));
            for (const e of BRIDGE_ORDER)
                nums = this.lowest(nums, (num) => num.map((a, i) => (this.el[a] === e ? i + 1 : 0)).filter(Boolean));
            if (nums.length)
                return { prefix: "", nums, bonds, retained: "adamantane" };
        }
        if (atoms.some((a) => !["C", "N", "O", "S", "Se", "Si", "Ge", "Sn", "B", "P", "As"].includes(this.el[a]) || (this.el[a] !== "C" && this.q[a] && !this.cationN(a))))
            return undefined;
        if (atoms.some((a) => ring(a).filter((j) => this.ord(a, j) > 1).length > 1))
            return undefined;
        if (bonds.length > atoms.length + 1) {
            let { prefix, nums } = (0, vonbaeyer_ts_1.vonBaeyer)(atoms, ring);
            nums = this.lowest(nums, (num) => num.map((a, i) => (this.el[a] !== "C" ? i + 1 : 0)).filter(Boolean));
            for (const e of BRIDGE_ORDER)
                nums = this.lowest(nums, (num) => num.map((a, i) => (this.el[a] === e ? i + 1 : 0)).filter(Boolean));
            const cubane = prefix === "pentacyclo[4.2.0.0²,⁵.0³,⁸.0⁴,⁷]" && !unsaturated && atoms.every((a) => this.el[a] === "C");
            return { prefix, nums, bonds, ...(cubane ? { retained: "cubane" } : {}) };
        }
        const walk = (from, start, end) => {
            const path = [];
            for (let prev = from, at = start; at !== end;) {
                path.push(at);
                const next = ring(at).find((j) => j !== prev);
                prev = at;
                at = next;
            }
            return path;
        };
        const heads = atoms.filter((a) => ring(a).length === 3), spiro = atoms.filter((a) => ring(a).length === 4);
        let nums = [], prefix;
        if (heads.length === 2 && !spiro.length) {
            const [h1, h2] = heads, bridges = ring(h1).map((x) => (x === h2 ? [] : walk(h1, x, h2)));
            const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].filter((o) => bridges[o[0]].length >= bridges[o[1]].length && bridges[o[1]].length >= bridges[o[2]].length);
            const [x, y, z] = orders[0].map((i) => bridges[i].length);
            if (!z && y >= 3 && bonds.filter(([a, b]) => this.ord(a, b) === 2).length > 1)
                return undefined;
            prefix = `bicyclo[${x}.${y}.${z}]`;
            for (const [m, from1] of [[h1, true], [h2, false]])
                for (const [a, b, c] of orders) {
                    const fwd = (p) => (from1 ? p : [...p].reverse());
                    nums.push([m, ...fwd(bridges[a]), from1 ? h2 : h1, ...[...fwd(bridges[b])].reverse(), ...fwd(bridges[c])]);
                }
        }
        else if (spiro.length === 1 && !heads.length) {
            const s = spiro[0], loops = [];
            for (const x of ring(s))
                if (!loops.some((l) => l.includes(x)))
                    loops.push(walk(s, x, s));
            if (loops.length !== 2)
                return undefined;
            loops.sort((a, b) => a.length - b.length);
            prefix = `spiro[${loops[0].length}.${loops[1].length}]`;
            const firsts = loops[0].length === loops[1].length ? [0, 1] : [0];
            for (const f of firsts)
                for (const r1 of [loops[f], [...loops[f]].reverse()])
                    for (const r2 of [loops[1 - f], [...loops[1 - f]].reverse()])
                        nums.push([...r1, s, ...r2]);
        }
        else
            return undefined;
        nums = this.lowest(nums, (num) => num.map((a, i) => (this.el[a] !== "C" ? i + 1 : 0)).filter(Boolean));
        for (const e of BRIDGE_ORDER)
            nums = this.lowest(nums, (num) => num.map((a, i) => (this.el[a] === e ? i + 1 : 0)).filter(Boolean));
        return { prefix, nums, bonds };
    }
    match(tpl, atoms, ring) {
        const out = [], map = tpl.el.map(() => -1), used = new Set();
        let steps = 0;
        const place = (k) => {
            if (++steps > 20000)
                throw new Error("ring match");
            if (k === tpl.order.length) {
                out.push([...map]);
                return;
            }
            const p = tpl.order[k], placed = tpl.adj[p].filter((q) => map[q] >= 0);
            for (const a of placed.length ? ring(map[placed[0]]) : atoms) {
                if (used.has(a) || (this.el[a] !== tpl.el[p] && tpl.el[p] !== "*") || ring(a).length !== tpl.adj[p].length || !placed.every((q) => this.ord(map[q], a)))
                    continue;
                map[p] = a;
                used.add(a);
                place(k + 1);
                map[p] = -1;
                used.delete(a);
            }
        };
        place(0);
        return out;
    }
    saturation(f, num, ketones) {
        const byLoc = (l) => [...l].sort((a, b) => num.indexOf(a) - num.indexOf(b));
        ketones = ketones.filter((a) => f.cn.includes(a));
        const sets = (l, m) => (!m ? [[]] : l.flatMap((a, i) => sets(l.slice(i + 1), m - 1).map((r) => [a, ...r])));
        let indicated = f.tpl.hydrogens ?? (f.cn.length % 2 ? 1 : !pairable(f.cn, f.ring) ? 2 : 0);
        if (indicated === 1 && f.cn.length <= 30 && !f.cn.some((a) => pairable(f.cn.filter((b) => b !== a), f.ring)))
            indicated = 3;
        const lone = ketones.length % 2 ? byLoc(ketones) : [];
        const pool = [...lone, ...byLoc(f.d.filter((a) => !lone.includes(a)))];
        for (const xs of sets(pool, indicated)) {
            const left = ketones.filter((a) => !xs.includes(a)), free = byLoc(f.d.filter((a) => !xs.includes(a) && !ketones.includes(a)));
            for (let m = left.length % 2; m <= Math.min(left.length, 3); m += 2)
                for (const ys of sets(free, m)) {
                    const sat = new Set([...ketones, ...xs, ...ys]);
                    if (!pairable(f.cn.filter((a) => !sat.has(a)), f.ring))
                        continue;
                    const hydro = byLoc(f.d.filter((a) => !sat.has(a)));
                    if (hydro.length % 2)
                        continue;
                    return { x: xs[0], xs, y: ys[0], ys, yOn: ys.length === 1 ? left[0] : undefined, hydro };
                }
        }
        throw new Error("indicated hydrogen");
    }
    lowest(nums, f) {
        let best = [], bestL;
        for (const num of nums) {
            const l = f(num).sort((a, b) => a - b), c = bestL ? compare(l, bestL) : -1;
            if (c < 0) {
                best = [num];
                bestL = l;
            }
            else if (c === 0)
                best.push(num);
        }
        return best;
    }
    nameParent(p, opts) {
        const { atoms } = p, inParent = new Set(atoms), kind = opts.kind;
        const skip = opts.skip ?? new Set();
        const info = p.hetero ? { numberings: [atoms, [...atoms].reverse()], aromatic: false }
            : p.assembly ? this.assemblyInfo(p.assembly) : p.ring ? this.ringInfo(atoms) : undefined;
        const numberings = p.ring ? info.numberings : [atoms, [...atoms].reverse()];
        const sites = [];
        const used = new Set();
        if (kind) {
            for (const [g, on] of this.bearer) {
                if (this.group[g] !== kind || skip.has(g))
                    continue;
                if (CARBON_GROUP.has(kind)) {
                    if (inParent.has(g) && !p.ring && !p.attached)
                        sites.push({ atom: g, group: g });
                    else if ((p.ring || p.attached) && on.some((a) => inParent.has(a))) {
                        sites.push({ atom: on.find((a) => inParent.has(a)), group: g });
                        used.add(g);
                    }
                }
                else if (kind === "ketone" && (this.el[g] === "O" || this.el[g] === "S")) {
                    if (inParent.has(on[0])) {
                        sites.push({ atom: on[0], group: g });
                        used.add(g);
                    }
                }
                else if (kind === "ketone" || kind === "imine") {
                    if (inParent.has(g)) {
                        sites.push({ atom: g, group: g });
                        used.add(kind === "ketone" ? this.carbonylO[g] : this.imineN(g));
                    }
                }
                else {
                    const a = on.find((x) => inParent.has(x));
                    if (a !== undefined) {
                        sites.push({ atom: a, group: g });
                        used.add(g);
                    }
                }
            }
        }
        if (atoms.some((a) => (this.group[a] === "ide" || this.group[a] === "ylium") && !sites.some((s) => s.group === a)))
            throw new Error("ion as a prefix");
        if (info?.ring && Object.values(ION_RINGS).includes(info.ring) && ((kind && !(kind === "ide" && sites.every((s) => inParent.has(s.atom)))) || opts.attach || !atoms.some((a) => this.q[a] === 1)))
            throw new Error("ring cation");
        const thio = (0, namer_maingroup_ts_1.chalcogenIonSuffix)(this, kind, sites) ?? (0, namer_hetero_ts_1.variantSuffix)(this, kind, sites, used, p.ring);
        const oxides = (0, namer_hetero_ts_1.nOxides)(this, atoms, sites, kind, used, !opts.attach && !opts.sulfo);
        const prefixes = [];
        for (const a of atoms) {
            for (const x of this.adj[a]) {
                if (inParent.has(x) || used.has(x) || (opts.attach && x === opts.attach[1] && a === opts.attach[0]) || (opts.mult && x === opts.mult[1] && a === opts.mult[0]))
                    continue;
                if (kind === "ketone" && sites.some((s) => s.atom === a) && x === this.carbonylO[a])
                    continue;
                if (CARBON_GROUP.has(kind) && !p.ring && sites.some((s) => s.group === a) && (x === this.carbonylO[a] || this.groupHetero(a).includes(x)))
                    continue;
                if (x === this.carbonylO[a] && !p.ring && opts.acyl && a === atoms[0])
                    continue;
                if (x === this.carbonylO[a] || (this.ord(a, x) === 2 && this.el[x] === "O")) {
                    prefixes.push({ atom: a, name: { text: this.el[x] === "S" ? "sulfanylidene" : "oxo", compound: false } });
                    continue;
                }
                if (this.ord(a, x) === 2 && this.group[x] === "imine") {
                    prefixes.push({ atom: a, name: this.iminoPrefix(x, a) });
                    continue;
                }
                prefixes.push({ atom: a, name: this.substituent(x, a) });
            }
        }
        const prime = new Set();
        for (const s of sites) {
            const nAtom = kind === "amide" || kind === "amidine" || kind === "hydrazide" ? this.amideN(s.group) : kind === "amine" || kind === "aminium" ? s.group : kind === "imine" || kind === "imidic" || kind === "imidate" || kind === "imidoylhalide" ? this.imineN(s.group) : (0, namer_hetero_ts_1.sulfonamideN)(this, kind, s.group) ?? this.ionN(kind, s.group);
            const second = kind === "amidine" ? this.imineN(s.group) : kind === "hydrazide" ? this.hydrazideN(s.group, nAtom) : undefined;
            for (const a of second !== undefined ? [nAtom, second] : nAtom === undefined ? [] : [nAtom])
                for (const x of this.adj[a])
                    if (x !== s.group && !inParent.has(x) && x !== s.atom && x !== second && x !== nAtom && !used.has(x) && !(opts.mult && a === opts.mult[0] && x === opts.mult[1])) {
                        prefixes.push({ atom: s.atom, name: this.substituent(x, a), n: true });
                        if (a !== nAtom)
                            prime.add(prefixes[prefixes.length - 1]);
                    }
        }
        if (prime.size && sites.length > 1)
            throw new Error("several amidines");
        const manyN = sites.length > 1 && prefixes.some((x) => x.n), counted = prefixes.filter((x) => !x.n || manyN);
        const fused = info?.fused, assembly = info?.assembly, saturation = new Map();
        const sat = (num) => {
            let v = saturation.get(num);
            if (!v)
                saturation.set(num, (v = (fused.mono === undefined ? this.saturation : this.monoSaturation).call(this, fused, num, kind === "ketone" || kind === "imine" ? sites.map((x) => x.atom) : [])));
            return v;
        };
        const bridged = info?.bridged;
        const multiple = (num, o) => bridged ? bridged.bonds.flatMap(([a, b]) => {
            const ord = this.ord(a, b), x = loc(num, a), y = loc(num, b);
            return ord > 1 && (o === undefined || ord === o) ? [Math.abs(x - y) === 1 ? Math.min(x, y) : 1000 + Math.min(x, y)] : [];
        }).sort((a, b) => a - b) : num.flatMap((a, k) => {
            const b = num[(k + 1) % num.length];
            if (k === num.length - 1 && !p.ring)
                return [];
            if ((p.ring && info.aromatic) || p.hetero)
                return [];
            const ord = this.ord(a, b);
            return ord > 1 && (o === undefined || ord === o) ? [k + 1] : [];
        });
        const loc = (num, a) => num.indexOf(a) + 1;
        const label = (num, a) => {
            const k = num.indexOf(a);
            if (fused?.tpl.uncited?.includes(k))
                throw new Error("interior locant");
            return assembly ? assembly.labels[k >> 1] + (k & 1 ? "'" : "") : fused ? fused.tpl.labels[k] : String(k + 1);
        };
        const one = (a) => (a === undefined ? [] : [a]), xs = (s) => s.xs ?? one(s.x), ys = (s) => s.ys ?? one(s.y);
        let nums = numberings;
        const lam = fused && fused.mono === undefined ? atoms.filter((a) => this.lambda(a)) : [];
        if (lam.length)
            nums = this.lowest(nums, (num) => lam.map((a) => loc(num, a)));
        if (fused)
            nums = this.lowest(nums, (num) => xs(sat(num)).map((a) => loc(num, a)));
        if (opts.attach)
            nums = this.lowest(nums, (num) => [loc(num, opts.attach[0])]);
        if (opts.acyl && !p.ring)
            nums = nums.filter((num) => num[0] === atoms[0]);
        nums = this.lowest(nums, (num) => sites.map((s) => loc(num, s.atom)));
        const bySites = nums;
        if (p.ring)
            nums = this.lowest(nums, (num) => atoms.filter((a) => this.q[a] === 1 && (this.cationN(a) || this.ions.has(a))).map((a) => loc(num, a)));
        if (opts.mult) {
            const at = inParent.has(opts.mult[0]) ? opts.mult[0] : sites.find((s) => s.group === opts.mult[0])?.atom ?? opts.mult[0];
            nums = this.lowest(nums, (num) => [loc(num, at)]);
        }
        if (fused) {
            nums = this.lowest(nums, (num) => ys(sat(num)).map((a) => loc(num, a)));
            nums = this.lowest(nums, (num) => [...sat(num).hydro, ...(fused.dehydro?.flat() ?? [])].map((a) => loc(num, a)));
        }
        nums = this.lowest(nums, (num) => multiple(num));
        nums = this.lowest(nums, (num) => multiple(num, 2));
        nums = this.lowest(nums, (num) => counted.map((x) => loc(num, x.atom)));
        const alpha = [...new Set(counted.map((x) => x.name.text))].sort((a, b) => alphaKey(a).localeCompare(alphaKey(b)));
        for (const t of alpha)
            nums = this.lowest(nums, (num) => counted.filter((x) => x.name.text === t).map((x) => loc(num, x.atom)));
        if (opts.tiebreak)
            nums = opts.tiebreak(nums);
        const num = nums[0];
        const size = atoms.length;
        const retainedKey = info?.ring ? `${info.ring.name}:${kind}` : !p.ring && !p.attached ? `C${size}:${kind}` : "";
        let retained = kind && !opts.attach && !thio && RETAINED[retainedKey];
        if (retained && !p.ring && (multiple(num).length || sites.length !== 1))
            retained = undefined;
        if (retained && info?.ring && sites.length !== 1)
            retained = undefined;
        const added = fused ? sat(num) : undefined;
        const sitesLoc = sites.map((s) => s.atom).sort((a, b) => loc(num, a) - loc(num, b))
            .map((a, i, all) => label(num, a) + (added && ys(added).length && (added.yOn === a || (added.yOn === undefined && i === all.length - 1)) ? `(${ys(added).map((y) => `${label(num, y)}H`).join(",")})` : ""));
        const plain = !fused && !assembly && !bridged && !p.attached, cPrefixes = prefixes.filter((x) => !x.n);
        const nH = cPrefixes.length < prefixes.length || sites.some((s) => [s.group, ...this.adj[s.group]].some((x) => !inParent.has(x) && this.el[x] === "N" && this.h[x] > 0));
        const hAt = (a) => this.h[a] > 0 && !(kind === "aldehyde" && sites.some((s) => s.group === a));
        const places = atoms.filter((a) => hAt(a) || cPrefixes.some((x) => x.atom === a));
        const orbit = (ns, a) => new Set(ns.filter((n) => atoms.every((b) => {
            const f = n[num.indexOf(b)];
            return this.el[f] === this.el[b] && (!!info?.aromatic || this.adj[b].every((c) => !inParent.has(c) || this.ord(b, c) === this.ord(f, n[num.indexOf(c)])));
        })).map((n) => n[num.indexOf(a)]));
        const subs = [...cPrefixes.map((x) => x.atom), ...sites.map((s) => s.atom), ...(opts.sulfo ? [opts.attach[0]] : [])];
        const hydride = plain && (!opts.attach || !!opts.sulfo) && subs.length === 1 && atoms.filter((a) => hAt(a) || subs.includes(a)).every((a) => orbit(numberings, subs[0]).has(a));
        const stereoOn = atoms.some((a) => this.cip[a] === "R" || this.cip[a] === "S" || this.adj[a].some((b) => /^[EZ]$/.test(this.cipBond.get(this.key(a, b)) ?? "")));
        const compound = plain && !nH && cPrefixes.length > 0 && ((places.length === 1 && (size === 2 || !multiple(num).length)) ||
            (cPrefixes.length === 1 && !p.ring && !stereoOn && ["acid", "nitrile", "aldehyde", "halide", "carboxylate"].includes(kind) && places.every((a) => orbit(bySites, cPrefixes[0].atom).has(a))));
        const full = plain && !nH && cPrefixes.length > 0 && !atoms.some(hAt) && cPrefixes.every((x) => x.name.text === cPrefixes[0].name.text);
        const free = (!p.ring && size === 1) || (!opts.mult && (hydride || compound));
        const prefixText = assemblePrefixes(prefixes.map((x) => ({ loc: x.n ? (manyN ? `N${label(num, x.atom)}` : prime.has(x) ? "N'" : "N") : label(num, x.atom), name: x.name })), free || full)
            + (!this.isotopic ? "" : (0, namer_maingroup_ts_1.isotopeText)(this, atoms, [...used, ...(kind && CARBON_GROUP.has(kind) ? sites.flatMap((s) => [s.group, ...this.groupHetero(s.group), this.carbonylO[s.group]]) : [])]
                .filter((a, k, all) => a >= 0 && !inParent.has(a) && all.indexOf(a) === k), (a) => label(num, a)));
        let parent;
        if (p.hetero)
            parent = p.hetero;
        else if (retained)
            parent = retained;
        else if (fused) {
            const { hydro } = sat(num), x = xs(sat(num));
            const h = !hydro.length ? "" : `${hydro.length === fused.cn.length && !fused.tpl.bridges ? "" : hydro.map((a) => label(num, a)).join(",") + "-"}${HYDRO[hydro.length]}hydro`;
            const dh = fused.dehydro?.flat().map((a) => label(num, a)).sort(locOrder) ?? [];
            const core = (x.length ? `${x.map((a) => `${label(num, a)}H`).join(",")}-` : "") + lambdaName(fused.tpl.name, lam.map((a) => `${label(num, a)}${this.lambda(a)}`));
            parent = joinPrefixes(dh.length ? `${dh.join(",")}-${MULT[dh.length]}dehydro` : "", joinPrefixes(h, fused.tpl.bridges ? joinPrefixes(fused.tpl.bridges, core) : core));
        }
        else if (assembly) {
            const junction = [...assembly.junction].sort((a, b) => loc(num, a) - loc(num, b)).map((a) => label(num, a)).join(",");
            parent = kind || opts.attach ? `[${junction}-${assembly.stem}]` : `${junction}-${assembly.stem}`;
        }
        else if (p.ring && info.ring)
            parent = (info.ring.hydrogen && (!opts.attach || opts.sulfo || opts.acyl) ? info.ring.hydrogen : "") + info.ring.name;
        else if (bridged) {
            const closure = (l) => l.map((x) => (x > 999 ? `${x - 1000}(${size})` : String(x))).sort((a, b) => parseInt(a) - parseInt(b));
            if (multiple(num).some((l) => l > 999) && bridged.prefix !== "cyclo")
                throw new Error("bridgehead double bond");
            const replaced = [...REPLACE, ["N+", "azonia"]].map(([e, word]) => {
                const at = atoms.filter((a) => (e === "N+" ? this.el[a] === "N" && this.q[a] === 1 : this.el[a] === e && !this.q[a])).map((a) => loc(num, a)).sort((a, b) => a - b).map((l) => `${l}${this.lambda(num[l - 1])}`);
                return at.length ? `${at.join(",")}-${MULT[at.length]}${word}` : "";
            }).filter(Boolean).join("-");
            parent = (replaced ? `${replaced}${/^\d/.test(bridged.prefix) ? "-" : ""}` : "") + (bridged.retained ?? bridged.prefix + chainStem(size, closure(multiple(num, 2)), closure(multiple(num, 3)), true));
        }
        else
            parent = (p.ring ? "cyclo" : "") + chainStem(size, multiple(num, 2), multiple(num, 3), p.ring);
        if ((p.ring ? !info?.ring && !fused && !bridged && !assembly : size === 3) && multiple(num).length === 1 && !prefixes.length && !sites.length && !opts.attach)
            parent = parent.replace(/-1-(ene|yne)$/, "$1");
        const ium = p.ring && !bridged ? atoms.filter((a) => this.cationN(a) || (fused && this.ions.has(a) && this.q[a] === 1)) : [];
        if (ium.length) {
            if ((kind && !ANION_KINDS.includes(kind)) || opts.acyl || opts.sulfo || retained)
                throw new Error("ring cation");
            parent = `${(opts.attach && info?.ring?.hydrogen) || ""}${parent.replace(/e$/, "")}-${ium.map((a) => label(num, a)).sort(locOrder).join(",")}-${MULT[ium.length]}ium`;
        }
        let text;
        const locantFree = p.ring && !fused && !assembly && !bridged && (!info?.ring || info.ring.name === "benzene") && prefixes.every((x) => x.n) && !multiple(num).length && !opts.mult;
        if (opts.sulfo)
            text = joinPrefixes(prefixText, withSuffix(parent, undefined, [label(num, opts.attach[0])], p.ring, locantFree, free, opts.sulfo));
        else if (opts.attach)
            text = joinPrefixes(prefixText, ium.length ? `${parent}-${label(num, opts.attach[0])}-yl` : this.substituentForm(parent, info, label(num, opts.attach[0]), p.ring, size, !!opts.acyl, multiple(num).length > 0));
        else if (retained)
            text = prefixText + retained;
        else if (kind === "ylium") {
            if (sites.length !== 1)
                throw new Error("several ylium centres");
            const yl = this.substituentForm(parent, info, sitesLoc[0], p.ring, size, false, multiple(num).length > 0);
            text = joinPrefixes(prefixText, (yl === "phenyl" ? (prefixes.length ? `benzen-${sitesLoc[0]}-yl` : "benzenyl") : yl) + "ium");
        }
        else
            text = joinPrefixes(prefixText, withSuffix(parent, kind, sitesLoc, p.ring || !!p.attached, locantFree, !p.attached && free, thio));
        if (p.attached && size === 1)
            text = text.replace(/methane-1(,1)+-/, "methane");
        text += (0, namer_hetero_ts_1.oxideText)(this, oxides, (a) => label(num, a));
        const benzyl = !!opts.attach && /^phenylmethyl(idene|idyne)?$/.test(text);
        if (benzyl)
            text = text.replace("phenylmethyl", "benzyl");
        const stereo = [];
        for (const a of atoms)
            if (this.cip[a] === "R" || this.cip[a] === "S")
                stereo.push({ at: loc(num, a), text: `${label(num, a)}${this.cip[a]}` });
        if (kind === "imine")
            for (const st of sites) {
                const c = this.cipBond.get(this.key(st.atom, this.imineN(st.atom)));
                if (c === "E" || c === "Z")
                    stereo.push({ at: loc(num, st.atom), text: `${label(num, st.atom)}${c}` });
            }
        if (kind && ["amidine", "imidic", "imidate", "imidoylhalide"].includes(kind) && !p.ring && !p.attached)
            for (const st of sites) {
                const c = this.cipBond.get(this.key(st.group, this.imineN(st.group)));
                if (c === "E" || c === "Z")
                    stereo.push({ at: loc(num, st.atom), text: `${label(num, st.atom)}${c}` });
            }
        for (const a of new Set(prefixes.filter((x) => !x.n).map((x) => x.atom)))
            for (const y of this.adj[a]) {
                const free = opts.attach && a === opts.attach[0] && y === opts.attach[1];
                const c = !inParent.has(y) && !free && this.el[y] === "C" && this.ord(a, y) === 2 ? this.cipBond.get(this.key(a, y)) : undefined;
                if (c === "E" || c === "Z")
                    stereo.push({ at: loc(num, a), text: `${label(num, a)}${c}` });
            }
        if (fused || assembly) {
            if (atoms.some((a) => this.adj[a].some((b) => inParent.has(b) && /^[EZ]$/.test(this.cipBond.get(this.key(a, b)) ?? ""))))
                throw new Error("ring E/Z");
        }
        else if (p.hetero) {
            const e = this.cipBond.get(this.key(atoms[0], atoms[1]));
            if (e === "E" || e === "Z")
                stereo.push({ at: 0, text: e });
        }
        else
            for (let k = 0; k + 1 < num.length + (p.ring ? 1 : 0); k++) {
                const c = this.cipBond.get(this.key(num[k], num[(k + 1) % num.length]));
                if (c === "E" || c === "Z")
                    stereo.push({ at: k + 1, text: `${k + 1}${c}` });
            }
        stereo.push(...(0, namer_hetero_ts_1.suffixStereo)(this, sites, stereo.length));
        if (stereo.length)
            text = `(${stereo.sort((x, y) => x.at - y.at).map((x) => x.text).join(",")})-${text}`;
        return { text, compound: (prefixes.length > 0 && !benzyl) || stereo.length > 0 || /[\d,]/.test(text) || namer_maingroup_ts_1.NUCLIDE.test(text), score: [], label: (a) => label(num, a), prefixes: prefixes.length };
    }
    substituentForm(parent, info, at, ring, size, acyl, unsaturated) {
        if (info?.fused)
            return acyl ? `${parent}-${at}-carbonyl` : `${parent.replace(/e(\]?)$/, "$1")}-${at}-yl`;
        if (acyl) {
            if (ring)
                return parent === "benzene" ? "benzoyl" : `${parent}-${at}-carbonyl`;
            if (size === 2 && parent === "ethane")
                return "acetyl";
            if (size === 1)
                return "carbonyl";
            return parent.replace(/e$/, "") + "oyl";
        }
        if (info?.ring) {
            if (info.ring.name === "benzene")
                return "phenyl";
            const h = info.ring.hydrogen ? info.ring.hydrogen : "";
            return `${h}${info.ring.stem}-${at}-yl`;
        }
        if (ring)
            return at === "1" && !unsaturated && !info?.bridged ? parent.replace(/ane$/, "yl") : `${parent.replace(/e$/, "")}-${at}-yl`;
        if (!unsaturated && at === "1")
            return parent.replace(/ane$/, "yl");
        if (size === 2 && at === "1")
            return parent.replace(/e$/, "yl");
        return `${parent.replace(/e$/, "")}-${at}-yl`.replace(/an-(\d+)-yl$/, "an-$1-yl");
    }
    substituent(x, from) {
        const opaque = this.opaque.get(x);
        if (opaque)
            return opaque;
        const tagged = (0, namer_maingroup_ts_1.isotopePrefix)(this, x, from);
        if (tagged)
            return tagged;
        const only = this.ord(x, from) === 1 ? this.prefixOnly.get(x) : undefined;
        if (only)
            return { text: only, compound: false };
        const imidoyl = this.ord(x, from) === 1 ? this.imidoylPrefix(x, from) : undefined;
        if (imidoyl)
            return imidoyl;
        const het = (0, namer_hetero_ts_1.heteroPrefix)(this, x, from);
        if (het)
            return het;
        const el = this.el[x];
        if (el === "N" && this.diazoAtom(x) && this.ord(x, from) === 2)
            return { text: "diazo", compound: false };
        if ((0, namer_maingroup_ts_1.chalcogenOne)(this, x))
            return { text: el === "Se" ? "selanylidene" : "tellanylidene", compound: false };
        if (el === "C" && this.ord(x, from) === 2) {
            if (this.group[x] || this.carbonylO[x] >= 0)
                throw new Error("ylidene");
            return this.ylidene(x, from);
        }
        if (this.ord(x, from) !== 1)
            throw new Error("ylidene");
        if (this.inRing[x])
            return this.nameParent({ atoms: this.rings[this.ringOf[x]], ring: true }, { attach: [x, from] });
        const ion = this.ionPrefix(x, from);
        if (ion)
            return ion;
        if (MAIN[el])
            return this.mainPrefix(x, from);
        const g = this.group[x];
        if (g === "sulfonylhalide" || g === "aminium" || this.peroxO.has(x))
            throw new Error(`${g} as a prefix`);
        if (el === "C" && this.carbonylO[x] >= 0 && this.groupHetero(x).includes(from) && !this.inRing[from])
            return this.acylName(x, from);
        if (el === "P") {
            const subs = this.adj[x].filter((j) => j !== from && this.el[j] === "C").map((j) => this.substituent(j, x)), oxide = this.adj[x].some((j) => this.el[j] === "O");
            return { text: `${substituted(subs)}${oxide ? "phosphoryl" : "phosphanyl"}`, compound: subs.length > 0 };
        }
        if (this.sulfur.has(x)) {
            const imino = this.adj[x].some((j) => this.el[j] === "N" && this.ord(x, j) === 2);
            if (g === "sulfonic" && imino)
                throw new Error("sulfonimidic acid as a prefix");
            if (g === "sulfonic")
                return { text: "sulfo", compound: false };
            const r = this.adj[x].find((j) => j !== from && this.el[j] === "C");
            const sulfo = imino ? "sulfonimidoyl" : this.adj[x].filter((j) => this.el[j] === "O").length === 2 ? "sulfonyl" : "sulfinyl";
            const p = this.inRing[r] ? { atoms: this.rings[this.ringOf[r]], ring: true } : { atoms: this.bestChain(r, x), ring: false };
            return { text: this.nameParent(p, { attach: [r, x], sulfo }).text, compound: true };
        }
        if (HALO[el])
            return { text: HALO[el], compound: false };
        if (el === "N" && this.nitroAtom(x))
            return { text: "nitro", compound: false };
        if (el === "N" && this.azidoAtom(x))
            return { text: "azido", compound: false };
        if (el === "O") {
            if (this.adj[x].length === 1) {
                if (this.h[x] === 1)
                    return { text: "hydroxy", compound: false };
                throw new Error("oxygen substituent");
            }
            const r = this.adj[x].find((j) => j !== from);
            if (this.carbonylO[r] >= 0) {
                const acyl = this.acylName(r, x);
                return { text: `${enclose(acyl)}oxy`, compound: true };
            }
            const alkyl = this.substituent(r, x);
            const simple = { methyl: "methoxy", ethyl: "ethoxy", propyl: "propoxy", butyl: "butoxy", phenyl: "phenoxy", "tert-butyl": "tert-butoxy", benzyl: "benzyloxy" };
            if (simple[alkyl.text])
                return { text: simple[alkyl.text], compound: simple[alkyl.text] === "benzyloxy" };
            if (/(?<!cyclo)(meth|eth|prop|but|phen)yl$/.test(alkyl.text))
                return { text: alkyl.text.replace(/yl$/, "oxy"), compound: true };
            return { text: `${enclose(alkyl)}oxy`, compound: true };
        }
        if (el === "S") {
            if (this.adj[x].length === 1 && this.h[x] === 1)
                return { text: "sulfanyl", compound: false };
            const r = this.adj[x].find((j) => j !== from);
            if (this.carbonylO[r] >= 0)
                return { text: `${enclose(this.acylName(r, x))}sulfanyl`, compound: true };
            return { text: `${enclose(this.substituent(r, x))}sulfanyl`, compound: true };
        }
        if (el === "N") {
            const others = this.adj[x].filter((j) => j !== from);
            const acyl = others.filter((j) => this.carbonylO[j] >= 0);
            const m = this.group[x] === "hydrazide" ? others.find((j) => this.el[j] === "N" && this.group[j] === "hydrazide") : undefined;
            if (m !== undefined)
                return (0, namer_hetero_ts_1.hydrazinyl)(this, x, from, m, "yl");
            if (acyl.length === 1 && others.length === 1) {
                const an = this.acylName(acyl[0], x), a = an.text;
                const retained = { acetyl: "acetamido", benzoyl: "benzamido", formyl: "formamido" };
                const carbonic = !this.carbons(acyl[0]).length && !this.ringN(acyl[0]).length;
                return { text: retained[a] ?? `${enclose(carbonic ? an : { text: a, compound: true })}amino`, compound: !retained[a] };
            }
            const subs = others.map((j) => (this.carbonylO[j] >= 0 ? this.acylName(j, x) : this.substituent(j, x)));
            if (!subs.length)
                return { text: "amino", compound: false };
            if (subs.length === 1)
                return { text: subs[0].text === "phenyl" ? "anilino" : `${enclose(subs[0])}amino`, compound: subs[0].text !== "phenyl" };
            return { text: `${substituted(subs)}amino`, compound: true };
        }
        if (el !== "C")
            throw new Error("substituent");
        const kind = this.group[x];
        const thio = (0, namer_hetero_ts_1.thioPrefix)(this, x, kind);
        if (thio)
            return thio;
        if (kind === "acid")
            return { text: "carboxy", compound: false };
        if (kind === "aldehyde")
            return { text: "formyl", compound: false };
        if (kind === "nitrile")
            return { text: "cyano", compound: false };
        if (kind === "hydrazide") {
            const n = this.groupHetero(x).find((j) => this.group[j] === "hydrazide"), m = this.hydrazideN(x, n);
            if (this.adj[n].length !== 2 || m === undefined || this.adj[m].length !== 1)
                throw new Error("hydrazide as a prefix");
            return { text: "hydrazinecarbonyl", compound: true };
        }
        if (kind === "amide") {
            const nAtom = this.amideN(x), subs = this.adj[nAtom].filter((j) => j !== x).map((j) => this.substituent(j, nAtom));
            if (!subs.length)
                return { text: "carbamoyl", compound: false };
            const inner = subs.length === 2 && subs[0].text === subs[1].text ? `di${enclose(subs[0])}` : subs.map(enclose).join("");
            return { text: `${inner}carbamoyl`, compound: true };
        }
        if (kind === "ester") {
            const o = this.esterO.get(x), r = this.adj[o].find((j) => j !== x);
            const alkoxy = this.substituent(o, x);
            void r;
            return { text: `${enclose(alkoxy)}carbonyl`, compound: true };
        }
        if (this.carbonylO[x] >= 0)
            return this.acylName(x, from);
        const methyls = this.carbons(x, [from]).filter((j) => this.h[j] === 3 && this.adj[j].length === 1);
        if (methyls.length === 3 && this.adj[x].length === 4)
            return { text: "tert-butyl", compound: false };
        const chain = this.bestChain(x, from);
        return this.nameParent({ atoms: chain, ring: false }, { attach: [x, from] });
    }
    imidoylPrefix(x, from) {
        const plain = (c) => this.adj[c].every((j) => j === x || j === from || (this.el[j] === "N" && this.adj[j].length === 1));
        if (this.el[x] === "C" && (this.group[x] === "amidine" || this.group[x] === "guanidine") && plain(x))
            return { text: "carbamimidoyl", compound: false };
        if (this.el[x] !== "N" || this.adj[x].length !== 2)
            return undefined;
        const c = this.adj[x].find((j) => j !== from);
        if (this.diimine.has(c)) {
            const e = enclose(this.iminoPrefix(this.adj[c].find((j) => j !== x), c));
            return { text: `${enclose({ text: `${e}methylidene`, compound: true })}amino`, compound: true };
        }
        if (this.group[c] !== "guanidine")
            return undefined;
        if (this.ord(x, c) === 1)
            return plain(c) ? { text: "carbamimidamido", compound: false } : undefined;
        const subs = this.adj[c].filter((j) => j !== x).map((j) => this.substituent(j, c));
        return { text: `${enclose({ text: `${substituted(subs)}methylidene`, compound: true })}amino`, compound: true };
    }
    ylidene(x, from) {
        const p = this.inRing[x] ? { atoms: this.rings[this.ringOf[x]], ring: true } : { atoms: this.bestChain(x, from), ring: false };
        const n = this.nameParent(p, { attach: [x, from] });
        if (!n.text.endsWith("yl"))
            throw new Error("ylidene");
        return { text: `${n.text}idene`, compound: n.compound };
    }
    iminoPrefix(n, c) {
        const x = this.adj[n].find((j) => j !== c);
        return x === undefined ? { text: "imino", compound: false } : { text: `${enclose(this.substituent(x, n))}imino`, compound: true };
    }
    acylName(c, from) {
        const rN = this.ringN(c), y = this.groupHetero(c).find((j) => j !== from && !rN.includes(j) && this.ord(c, j) === 1);
        if (y !== undefined) {
            const thio = (0, namer_hetero_ts_1.thioDouble)(this, c), carbonyl = thio ? "carbonothioyl" : "carbonyl";
            if (HALO[this.el[y]] || this.prefixOnly.has(y))
                return { text: `${HALO[this.el[y]] ?? this.prefixOnly.get(y)}${carbonyl}`, compound: true };
            if (this.el[y] === "O" && this.adj[y].length === 1)
                return thio ? { text: "hydroxycarbonothioyl", compound: true } : { text: "carboxy", compound: false };
            if (this.el[y] === "O")
                return { text: `${enclose(this.substituent(y, c))}${carbonyl}`, compound: true };
            if (this.el[y] !== "N")
                throw new Error("acyl");
            const subs = this.adj[y].filter((j) => j !== c).map((j) => this.substituent(j, y));
            return { text: `${substituted(subs)}${thio ? "carbamothioyl" : "carbamoyl"}`, compound: subs.length > 0 };
        }
        const r = [...this.carbons(c, [from]), ...rN.filter((j) => j !== from)];
        if (!r.length)
            return (0, namer_hetero_ts_1.thioAcyl)(this, c, { text: "formyl", compound: false });
        if (this.inRing[r[0]]) {
            const cycle = this.rings[this.ringOf[r[0]]];
            return (0, namer_hetero_ts_1.thioAcyl)(this, c, this.nameParent({ atoms: cycle, ring: true }, { attach: [r[0], c], acyl: true }));
        }
        const chain = this.bestChain(c, from, true);
        return (0, namer_hetero_ts_1.thioAcyl)(this, c, this.nameParent({ atoms: chain, ring: false }, { attach: [c, from], acyl: true }));
    }
    paths(start, from, fromStart, nitrile = false, avoid) {
        const ok = (j) => this.el[j] === "C" && !this.inRing[j] && j !== from && (nitrile || !this.isNitrileC(j)) && !avoid?.has(j) && !this.opaque.has(j) && !this.het.has(j);
        const walk = (a, seen) => {
            const next = this.adj[a].filter((j) => ok(j) && !seen.has(j) && (j === start || this.carbonylO[j] < 0 || true));
            const ends = next.flatMap((j) => walk(j, new Set([...seen, j])).map((p) => [j, ...p]));
            return ends.length ? ends : [[]];
        };
        const arms = walk(start, new Set([start]));
        if (!arms.some((a) => !a.length))
            arms.push([]);
        if (fromStart)
            return arms.map((p) => [start, ...p]);
        const out = [];
        for (const a of arms)
            for (const b of arms) {
                if (a.length && b.length && a[0] === b[0])
                    continue;
                out.push([...[...a].reverse(), start, ...b]);
            }
        return out;
    }
    bestChain(x, from, fromStart = false) {
        const multiple = (p, o) => p.slice(1).filter((a, k) => { const b = this.ord(p[k], a); return b > 1 && (o === undefined || b === o); }).length;
        const fv = (p) => Math.min(p.indexOf(x) + 1, p.length - p.indexOf(x));
        const subs = (p) => p.reduce((s, a) => s + this.adj[a].filter((j) => !p.includes(j) && j !== from).length, 0);
        const score = (p) => [-p.length, -multiple(p), -multiple(p, 2), fv(p), -subs(p)];
        const acids = new Set([...this.bearer.keys()].filter((g) => this.el[g] === "C" && (this.group[g] === "acid" || this.group[g] === "peroxy" || this.group[g] === "carboxylate") && g !== x));
        return this.paths(x, from, fromStart, false, acids).sort((a, b) => compare(score(a), score(b)))[0];
    }
    perceiveMain() {
        const { el, h, adj } = this;
        for (let i = 0; i < this.n; i++) {
            const m = MAIN[el[i]];
            if (!m || this.pseudo.has(i))
                continue;
            const chalcogen = CHALCOGEN.has(el[i]), oxo = adj[i].filter((j) => this.isOxo(i, j));
            const valence = adj[i].reduce((t, j) => t + this.ord(i, j), 0) + h[i];
            const ok = !oxo.length ? valence === bonding(el[i], this.q[i]) : (!this.inRing[i] || !!this.lambda(i)) && !this.q[i]
                && ((["As", "Sb", "Bi"].includes(el[i]) && oxo.length === 1 && (valence === 5 || (valence === 3 && !this.inRing[i]))) || (chalcogen && valence === 2 + 2 * oxo.length));
            if (!ok || (this.q[i] && !this.mainIon(i) && !this.ions.has(i)))
                throw new Error(`${el[i]} bonds`);
            this.main.add(i);
            for (const j of adj[i]) {
                if (oxo.includes(j)) {
                    this.main.add(j);
                    continue;
                }
                if (this.inRing[i] && this.ringOf[j] === this.ringOf[i])
                    continue;
                if (this.ord(i, j) !== 1 && !(0, namer_maingroup_ts_1.chalcogenOne)(this, i) && this.carbonylO[j] !== i)
                    throw new Error(`${el[i]} bonds`);
                if (this.ions.has(j) || this.prefixOnly.has(j))
                    continue;
                if (el[j] === "C" || (CATENATE.has(el[i]) && CATENATE.has(el[j])) || (chalcogen && el[j] === el[i]))
                    continue;
                if (el[j] === "N" && (this.inRing[j] || (CATENATE.has(el[i]) && this.azidoAtom(j))))
                    continue;
                if (el[j] === "N" && CATENATE.has(el[i]) && adj[j].some((k) => this.carbonylO[k] >= 0))
                    continue;
                if (el[j] === "N" && CATENATE.has(el[i]) && !this.q[j] && adj[j].every((k) => this.ord(j, k) === 1 && (CATENATE.has(el[k]) || (el[k] === "C" && this.carbonylO[k] < 0 && !this.isNitrileC(k))))) {
                    this.mark(j, "amine", adj[j].filter((k) => el[k] === "C"));
                    continue;
                }
                const bridge = (k) => k === i || el[k] === "C" || (MAIN[el[k]] && !CHALCOGEN.has(el[k])) || (el[k] === "S" && adj[k].filter((o) => this.isOxo(k, o)).length === 2)
                    || (el[k] === "P" && !this.inRing[k] && !this.q[k]);
                const twoBonds = (k) => !this.q[k] && !h[k] && !this.inRing[k] && adj[k].length === 2 && adj[k].every(bridge);
                if ((HALO[el[j]] && adj[j].length === 1) || (el[j] === "O" && (this.isOH(j) || twoBonds(j))) || (el[j] === "S" && !chalcogen && twoBonds(j))) {
                    this.main.add(j);
                    continue;
                }
                throw new Error(`${el[i]} bonds`);
            }
            const cs = adj[i].filter((j) => el[j] === "C" && this.carbonylO[j] < 0 && !this.isNitrileC(j)), te = el[i] === "Te";
            if (!chalcogen || this.inRing[i] || cs.length !== 1)
                continue;
            if (h[i] === 1 && adj[i].length === 1)
                this.mark(i, te ? "tellurol" : "selenol", cs);
            else if (oxo.length && adj[i].length === oxo.length + 2 && adj[i].some((j) => this.isOH(j)))
                this.mark(i, oxo.length === 2 ? (te ? "telluronic" : "selenonic") : te ? "tellurinic" : "seleninic", cs);
        }
    }
    mainPrefix(x, from) {
        const el = this.el[x], m = MAIN[el], others = this.adj[x].filter((j) => j !== from);
        const oxo = others.filter((j) => this.isOxo(x, j)), oh = others.filter((j) => this.isOH(j));
        if (this.q[x])
            throw new Error("charge");
        if (CHALCOGEN.has(el)) {
            const acid = this.group[x];
            if (acid && /^(selen|tellur)/.test(acid) && acid.endsWith("ic"))
                return { text: acid.replace(/(on|in)ic$/, "$1o"), compound: false };
            if (!others.length)
                return { text: m.yl, compound: false };
            const r = others.find((j) => !oxo.includes(j));
            if (oxo.length) {
                if (others.length !== oxo.length + 1 || this.el[r] !== "C")
                    throw new Error(`${el} acid`);
                const own = (el === "Se" ? "selen" : "tellur") + (oxo.length === 2 ? "onyl" : "inyl");
                const p = this.inRing[r] ? { atoms: this.rings[this.ringOf[r]], ring: true } : { atoms: this.bestChain(r, x), ring: false };
                return { text: this.nameParent(p, { attach: [r, x], sulfo: own }).text, compound: true };
            }
            const r2 = this.adj[r].find((j) => j !== x);
            if (this.el[r] === el && !this.inRing[r] && this.adj[r].length === 2 && this.el[r2] !== el)
                return { text: `${enclose(this.substituent(r2, r))}di${m.yl}`, compound: true };
            return { text: `${enclose(this.substituent(r, x))}${m.yl}`, compound: true };
        }
        if (el === "B" && oh.length === 2 && others.length === 2)
            return { text: "borono", compound: false };
        if ((el === "As" || el === "Sb") && oxo.length === 1 && oh.length === 2 && others.length === 3)
            return { text: el === "As" ? "arsono" : "stibono", compound: false };
        if (oxo.length && others.length !== 1)
            throw new Error(`${el} oxide as a prefix`);
        const subs = others.map((j) => (oxo.includes(j) ? { text: "oxo", compound: false } : this.substituent(j, x)));
        return { text: substituted(subs) + m.yl, compound: subs.length > 0 };
    }
    mainParent(i) {
        const el = this.el[i], m = MAIN[el], oxo = this.adj[i].filter((j) => this.isOxo(i, j)), oh = this.adj[i].filter((j) => this.isOH(j));
        const named = (js) => js.map((j) => this.substituent(j, i));
        if (this.q[i])
            return { cls: -1, text: () => substituted(named(this.adj[i])) + (el === "B" ? "boranuide" : m.hydride.replace(/ane$/, "anium")) };
        if (CHALCOGEN.has(el))
            return { cls: 0, text: () => `${el === "Se" ? "selen" : "tellur"}${oxo.length === 2 ? "ic" : "ous"} acid` };
        const ors = this.adj[i].filter((j) => this.el[j] === "O" && this.adj[j].length === 2 && this.adj[j].some((k) => k !== i && this.el[k] === "C" && this.carbonylO[k] < 0));
        if (el === "B" && ors.length && this.adj[i].every((j) => ors.includes(j) || this.el[j] === "C")) {
            const alkyls = () => alkylWords(ors.map((o) => this.substituent(this.adj[o].find((k) => k !== i), o)));
            return { cls: 0.5, text: () => `${alkyls()} ${substituted(named(this.adj[i].filter((j) => !ors.includes(j))))}${["", "borinate", "boronate", "borate"][ors.length]}` };
        }
        const cn = this.adj[i].filter((j) => this.group[j] === "nitrile");
        if (cn.length === 1 && [...this.bearer.keys()].every((g) => this.group[g] !== "nitrile" || g === cn[0])) {
            return { cls: 0.8, text: () => substituted(named(this.adj[i].filter((j) => j !== cn[0]))) + `${m.hydride}carbonitrile` };
        }
        const amines = this.adj[i].filter((j) => this.group[j] === "amine" && !this.inRing[j]);
        if (amines.length === 1 && !oh.length && [...this.bearer.keys()].every((g) => this.group[g] !== "amine" || g === amines[0])) {
            const n = amines[0];
            return { cls: 1.5, text: () => {
                    const ns = this.adj[n].filter((j) => j !== i).map((j) => ({ loc: "N", name: this.substituent(j, n) }));
                    const subs = this.adj[i].filter((j) => j !== n).map((j) => ({ loc: "1", name: this.substituent(j, i) }));
                    return (ns.length ? assemblePrefixes([...ns, ...subs], false) : substituted(subs.map((s) => s.name))) + `${m.hydride.replace(/e$/, "")}amine`;
                } };
        }
        let word = m.hydride, cls = 2, used = oh;
        const three = oxo.length === 1 && this.adj[i].reduce((t, j) => t + this.ord(i, j), 0) + this.h[i] === 3;
        if (three)
            return { cls, text: () => substituted([...named(this.adj[i].filter((j) => !oxo.includes(j))), { text: "oxo", compound: false }]) + word };
        if (el === "B" && oh.length)
            [word, cls] = [["", "borinic acid", "boronic acid", "boric acid"][oh.length], 0];
        else if (el === "Bi" && oxo.length && !oh.length)
            [word, cls] = [`${m.hydride} oxide`, 2];
        else if ((el === "As" || el === "Sb") && oxo.length) {
            [word, cls] = oh.length ? [`${el === "As" ? "ars" : "stib"}${["", "inic", "onic", "oric"][oh.length]} acid`, 0] : [`${m.hydride} oxide`, 2];
        }
        else if ((el === "As" || el === "Sb") && oh.length)
            [word, cls] = [`${el === "As" ? "ars" : "stib"}${["", "inous", "onous", "orous"][oh.length]} acid`, 0];
        else if (m.valence === 4 && el !== "Hg" && oh.length)
            [word, cls] = [`${m.hydride.replace(/e$/, "")}${oh.length > 1 ? `e${MULT[oh.length].replace(/a$/, "")}` : ""}ol`, 1];
        else
            used = [];
        return { cls, text: () => substituted(named(this.adj[i].filter((j) => !oxo.includes(j) && !used.includes(j)))) + word };
    }
    mainName(kind) {
        const k = kind ? SENIORITY.indexOf(kind) : SENIORITY.length;
        const rank = (e) => (PARENT_ORDER.includes(e) ? PARENT_ORDER.indexOf(e) : PARENT_ORDER.length);
        const gate = { [-1]: true, 0: k >= SENIORITY.indexOf("anhydride"), 0.5: k > SENIORITY.indexOf("ester"), 1: k > SENIORITY.indexOf("alcohol"), 0.8: k >= SENIORITY.indexOf("nitrile"), 1.5: k >= SENIORITY.indexOf("amine"), 2: !kind };
        const oxoacid = (i) => this.adj[i].filter((j) => this.isOH(j)).length === 2 && this.adj[i].length > 2 && this.adj[i].every((j) => this.isOH(j) || this.isOxo(i, j));
        const fit = [...this.main].filter((i) => MAIN[this.el[i]] && !this.inRing[i] && (!CHALCOGEN.has(this.el[i]) || oxoacid(i)))
            .map((i) => ({ i, ...this.mainParent(i) })).filter((c) => gate[c.cls]);
        if (!fit.length)
            return undefined;
        fit.sort((a, b) => a.cls - b.cls || rank(this.el[a.i]) - rank(this.el[b.i]));
        const best = fit[0];
        if (best.cls === 2 && (this.phosphorus.size || [...this.het.values()].some((r) => r === "S" || r === "P") || Math.min(...this.rings.flat().map((a) => rank(this.el[a]))) <= rank(this.el[best.i])))
            return undefined;
        if (best.cls >= 1) {
            const chain = this.mainChain(best.i);
            if (chain)
                return chain;
        }
        const names = fit.filter((c) => c.cls === best.cls && this.el[c.i] === this.el[best.i]).map((c) => c.text());
        return names.sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
    }
    mainChain(c) {
        const { el, adj } = this, E = el[c];
        if (MAIN[E].valence !== 4 || E === "Hg")
            return undefined;
        const isE = (a) => el[a] === E && !this.inRing[a];
        const viaO = (a) => adj[a].filter((o) => el[o] === "O" && !this.inRing[o] && adj[o].length === 2 && adj[o].every((k) => k === a || isE(k)));
        const oxy = viaO(c).length > 0;
        if (oxy === adj[c].some(isE))
            return undefined;
        const step = (a) => (oxy ? viaO(a).map((o) => [o, adj[o].find((k) => k !== a)]) : adj[a].filter(isE).map((b) => [b]));
        const walk = (a, seen) => {
            const arms = step(a).filter((s) => !seen.has(s[s.length - 1])).flatMap((s) => walk(s[s.length - 1], new Set([...seen, ...s])).map((p) => [...s, ...p]));
            return arms.length ? arms : [[]];
        };
        const comp = new Set([c]);
        for (const a of comp)
            for (const s of step(a))
                comp.add(s[s.length - 1]);
        const paths = [...comp].filter((a) => step(a).length === 1).flatMap((a) => walk(a, new Set([a])).map((p) => [a, ...p]));
        const longest = Math.max(...paths.map((p) => p.length)), names = [];
        for (const path of paths.filter((p) => p.length === longest)) {
            const inChain = new Set(path), es = path.filter((a) => el[a] === E), ohs = [], pre = [];
            if (es.length > 10)
                throw new Error("chain too long");
            for (const a of es)
                for (const x of adj[a])
                    if (!inChain.has(x)) {
                        if (this.isOH(x))
                            ohs.push(a);
                        else
                            pre.push({ atom: a, name: this.substituent(x, a) });
                    }
            const loc = (num, a) => num.indexOf(a) + 1;
            let nums = this.lowest([path, [...path].reverse()], (num) => ohs.map((a) => loc(num, a)));
            nums = this.lowest(nums, (num) => pre.map((p) => loc(num, p.atom)));
            for (const t of [...new Set(pre.map((p) => p.name.text))].sort((a, b) => alphaKey(a).localeCompare(alphaKey(b))))
                nums = this.lowest(nums, (num) => pre.filter((p) => p.name.text === t).map((p) => loc(num, p.atom)));
            const num = nums[0], stem = MULT[es.length] + (oxy ? MAIN[E].hydride.replace(/ane$/, "oxane") : MAIN[E].hydride);
            const full = !ohs.length && es.every((a) => !this.h[a]) && new Set(pre.map((p) => p.name.text)).size === 1;
            const prefixText = assemblePrefixes(pre.map((p) => ({ loc: String(loc(num, p.atom)), name: p.name })), full);
            names.push(joinPrefixes(prefixText, ohs.length ? withSuffix(stem, "alcohol", ohs.map((a) => loc(num, a)).sort((a, b) => a - b).map(String), false, false, false) : stem));
        }
        return names.sort((a, b) => compare(locantsOf(a), locantsOf(b)) || a.length - b.length || a.localeCompare(b))[0];
    }
    name() {
        this.perceive();
        this.radicals();
        if (this.adj.some((a, i) => a.length === 0 && this.el[i] !== "C") || this.n === 0)
            return undefined;
        const kind = SENIORITY.find((k) => this.group.includes(k) && [...this.bearer.keys()].some((g) => this.group[g] === k));
        (0, namer_maingroup_ts_1.checkChalcogenOnes)(this, kind, SENIORITY);
        const seAcids = this.carbonylO.flatMap((d, c) => (d >= 0 && (this.el[d] === "Se" || this.el[d] === "Te") ? [c] : []));
        if (seAcids.length) {
            const acids = [...this.bearer.keys()].filter((g) => this.group[g] === "acid");
            if (kind !== "acid" || seAcids.some((c) => !acids.includes(c)) || new Set(acids.map((c) => this.el[this.carbonylO[c]])).size !== 1)
                throw new Error("seleno acid");
        }
        let text = this.ionParent(kind) ?? this.mainName(kind) ?? (0, namer_hetero_ts_1.heteroParentName)(this, kind);
        if (text) { }
        else if (kind === "ester" || kind === "imidate" || kind === "peroxyester")
            text = this.esterName(kind);
        else if (kind === "peroxide")
            text = this.peroxideName();
        else if (kind === "sulfonate")
            text = (0, namer_hetero_ts_1.sulfonateName)(this);
        else if (kind === "anhydride")
            text = this.anhydrideName();
        else if (this.whole && this.pseudo.size === this.n)
            text = this.whole;
        else if (kind === "urea" || kind === "carbamate" || kind === "carbonic" || kind === "carbonylhalide" || kind === "guanidine" || (kind === "imine" && this.diimine.size)
            || (kind === "nitrile" && [...this.bearer].every(([g, on]) => this.group[g] !== "nitrile" || (!on.length && this.groupHetero(g).length === 2))))
            text = this.carbonicName(kind);
        else if (!kind && this.phosphorus.size)
            text = this.phosphaneName();
        else {
            const multiplied = (0, namer_multiplicative_ts_1.multiplicativeName)(this, kind, this.ionSkip(kind)), parent = multiplied ? undefined : this.parentName(kind, this.ionSkip(kind));
            text = multiplied ?? parent?.text;
            if (parent?.parent && parent.label) {
                this.locants = new Map();
                for (const a of parent.parent.atoms)
                    try {
                        this.locants.set(a, parent.label(a));
                    }
                    catch { }
            }
            if (text && (kind === "halide" || kind === "sulfonylhalide" || kind === "imidoylhalide")) {
                const xs = [...Array(this.n).keys()].filter((x) => (HALO[this.el[x]] || this.prefixOnly.has(x)) && this.adj[x].some((j) => this.group[j] === kind));
                const word = (x) => HALIDE[this.el[x]] ?? this.prefixOnly.get(x).replace(/o$/, "e");
                if (new Set(xs.map(word)).size !== 1)
                    throw new Error("mixed halides");
                text += ` ${MULT[xs.length]}${word(xs[0])}`;
            }
        }
        text = text?.replace(/\b(di|tri|tetra)azaniumyl/g, (_, m) => `${MULT_COMPLEX[MULT.indexOf(m)]}(azaniumyl)`);
        const cited = citedLabels(text ?? "");
        const labelled = this.cip.filter(Boolean).length + [...this.cipBond.values()].filter(Boolean).length;
        if (text && cited !== labelled)
            throw new Error("stereo not cited");
        return text;
    }
    parentName(kind, skip = new Set(), within) {
        const carbons = [...Array(this.n).keys()].filter((i) => this.el[i] === "C" && !this.inRing[i] && (!within || within.has(i)) && !skip.has(i) && !this.pseudo.has(i) && !this.opaque.has(i) && !this.het.has(i) && (kind === "nitrile" || !this.isNitrileC(i)));
        const chains = [];
        for (const a of carbons)
            for (const p of this.paths(a, -1, true, kind === "nitrile"))
                if (p.every((i) => !skip.has(i) && (!within || within.has(i))))
                    chains.push(p);
        const count = (atoms, ring) => {
            if (!kind)
                return 0;
            let c = 0;
            for (const [g, on] of this.bearer) {
                if (this.group[g] !== kind || skip.has(g))
                    continue;
                if (CARBON_GROUP.has(kind))
                    c += (!ring && atoms.includes(g)) || (ring && on.some((a) => atoms.includes(a))) ? 1 : 0;
                else if (kind === "ketone" || kind === "imine")
                    c += atoms.includes(this.el[g] === "O" || this.el[g] === "S" ? on[0] : g) ? 1 : 0;
                else
                    c += on.some((a) => atoms.includes(a)) ? 1 : 0;
            }
            return c;
        };
        const cands = [
            ...this.rings.filter((r) => !within || r.every((a) => within.has(a))).map((r) => ({ atoms: r, ring: true, groups: count(r, true) })),
            ...chains.map((c) => ({ atoms: c, ring: false, groups: count(c, false) })),
        ];
        const own = new Set([...this.bearer.keys()].filter((g) => kind && CARBON_GROUP.has(kind) && this.group[g] === kind && !skip.has(g)));
        if (own.size > 2)
            for (const a of carbons)
                if (!own.has(a))
                    for (const p of this.paths(a, -1, true, false, own)) {
                        const groups = count(p, true);
                        if (groups > 2 && p.every((i) => !skip.has(i) && (!within || within.has(i))))
                            cands.push({ atoms: p, ring: false, attached: true, groups });
                    }
        for (const a of this.hzN)
            for (const b of this.adj[a])
                if (a < b && this.hzN.has(b) && (!within || (within.has(a) && within.has(b))))
                    cands.push({ atoms: [a, b], ring: true, groups: count([a, b], true), hetero: this.ord(a, b) === 2 ? "diazene" : "hydrazine" });
        for (const [k, o] of this.bond) {
            const [a, b] = k.split(" ").map(Number), ra = this.rings[this.ringOf[a]], rb = this.rings[this.ringOf[b]];
            if (o !== 1 || !this.inRing[a] || !this.inRing[b] || ra === rb || (within && ![...ra, ...rb].every((x) => within.has(x))))
                continue;
            const name = this.assemblyComponent(ra);
            if (!name || name !== this.assemblyComponent(rb))
                continue;
            const atoms = [...ra, ...rb];
            cands.push({ atoms, ring: true, groups: count(atoms, true), assembly: { rings: [ra, rb], junction: [a, b] } });
        }
        if (!cands.length)
            return undefined;
        const multiple = (c, o) => c.ring ? 0 : c.atoms.slice(1).filter((a, k) => { const b = this.ord(c.atoms[k], a); return b > 1 && (o === undefined || b === o); }).length;
        const ringRank = (c) => {
            const hetero = c.atoms.filter((a) => this.el[a] !== "C"), set = new Set(c.atoms);
            const has = (e) => hetero.some((a) => this.el[a] === e);
            const bonds = c.atoms.reduce((t, a) => t + this.adj[a].filter((j) => set.has(j)).length, 0) / 2;
            return [has("N") ? 0 : has("O") ? 1 : has("S") ? 2 : hetero.length ? 3 : 4, c.atoms.length - 1 - bonds, -c.atoms.length, -hetero.length];
        };
        const subs = (c) => c.atoms.reduce((s, a) => s + this.adj[a].filter((j) => !c.atoms.includes(j)).length, 0);
        const score = (c) => [-c.groups, c.ring ? 0 : 1, ...(c.ring ? [...ringRank({ atoms: c.assembly?.rings[0] ?? c.atoms }), c.assembly ? -2 : -1] : [-c.atoms.length, -multiple(c), -multiple(c, 2), 0, 0]), -subs(c)];
        const scores = new Map(cands.map((c) => [c, score(c)]));
        cands.sort((a, b) => compare(scores.get(a), scores.get(b)));
        const best = cands.filter((c) => compare(scores.get(c), scores.get(cands[0])) === 0);
        const names = best.map((c) => ({ c, n: this.nameParent(c, { kind: c.groups ? kind : undefined, skip }) }));
        names.sort((a, b) => compare(locantsOf(a.n.text), locantsOf(b.n.text)) || a.n.text.localeCompare(b.n.text));
        return { text: names[0].n.text, compound: true, parent: names[0].c, label: names[0].n.label };
    }
    side(c, o) {
        const side = new Set([c]), stack = [c];
        while (stack.length) {
            const i = stack.pop();
            for (const j of this.adj[i])
                if (j !== o && !side.has(j)) {
                    side.add(j);
                    stack.push(j);
                }
        }
        return side;
    }
    phosphaneName() {
        const names = [...this.phosphorus].filter((i) => this.el[i] === "P").map((p) => {
            const subs = this.adj[p].filter((j) => this.el[j] === "C").map((j) => this.substituent(j, p));
            return `${substituted(subs)}phosphane${this.adj[p].some((j) => this.el[j] === "O") ? " oxide" : ""}`;
        });
        return names.sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
    }
    esterName(kind) {
        const esters = [...this.esterO.keys()].filter((c) => this.group[c] === kind);
        if (esters.length !== 1)
            return this.severalEsters(esters, kind);
        const c = esters[0], o = this.esterO.get(c), r = this.adj[o].find((j) => j !== c && !this.peroxO.has(j));
        const alkyl = this.substituent(r, o);
        const acid = this.parentName(kind, new Set(), this.side(c, o));
        if (!acid)
            return undefined;
        const acidText = acid.text.replace(/oic acid$/, "oate").replace(/carboxylic acid$/, "carboxylate").replace(/ic acid$/, "ate");
        const v = (0, namer_hetero_ts_1.groupVariant)(this, c);
        return `${v === "S" || v === "O" ? `${v}-${enclose(alkyl)}` : alkyl.text} ${acidText}`;
    }
    severalEsters(esters, kind = "ester") {
        const polyol = this.polyolEster(esters) ?? (0, namer_multiplicative_ts_1.multiplicativeEster)(this, kind, esters);
        if (polyol)
            return polyol;
        const p = this.parentName(kind)?.parent;
        if (!p)
            throw new Error("several esters");
        const site = (c) => (p.ring || p.attached ? this.bearer.get(c).find((a) => p.atoms.includes(a)) : p.atoms.includes(c) ? c : undefined);
        const groups = new Map();
        for (const c of esters) {
            const at = site(c);
            if (at === undefined)
                continue;
            const o = this.esterO.get(c), r = this.adj[o].find((j) => j !== c && !this.peroxO.has(j));
            if (p.atoms.some((a) => this.side(r, o).has(a)))
                throw new Error("cyclic ester");
            const name = this.substituent(r, o), g = groups.get(name.text) ?? { name, sites: [] };
            g.sites.push(at);
            groups.set(name.text, g);
        }
        const sorted = [...groups.values()].sort((a, b) => alphaKey(a.name.text).localeCompare(alphaKey(b.name.text)));
        const tiebreak = (nums) => sorted.reduce((best, g) => this.lowest(best, (num) => g.sites.map((a) => num.indexOf(a) + 1)), nums);
        const acid = this.nameParent(p, { kind, tiebreak });
        const alkyls = sorted.map((g) => (sorted.length > 1 ? `${g.sites.map(acid.label).sort(locOrder).join(",")}-` : "")
            + (sorted.length > 1 && g.sites.length === 1 && (g.name.compound || /^[\d(]/.test(g.name.text)) ? enclose(g.name) : times(g.sites.length, g.name)));
        return `${alkyls.join(" ")} ${acid.text}`;
    }
    polyolEster(esters) {
        const os = esters.map((c) => this.esterO.get(c)), yl = this.polyolYl(os, esters);
        if (!yl)
            return undefined;
        const acids = esters.map((c) => {
            const p = this.part(c, new Set(esters.map((d) => this.key(d, this.esterO.get(d)))));
            if (esters.some((d) => d !== c && p.has(d)))
                return undefined;
            return new Namer(this.piece([...p], [], [c])).name()?.replace(/oic acid$/, "oate").replace(/carboxylic acid$/, "carboxylate").replace(/ic acid$/, "ate");
        });
        if (!acids[0]?.endsWith("ate") || acids.some((a) => a !== acids[0]))
            return undefined;
        return `${yl} ${times(esters.length, { text: acids[0], compound: /[\d([ -]/.test(acids[0]) })}`;
    }
    part(s, cut) {
        const seen = new Set([s]), stack = [s];
        while (stack.length) {
            const i = stack.pop();
            for (const j of this.adj[i])
                if (!seen.has(j) && !cut.has(this.key(i, j))) {
                    seen.add(j);
                    stack.push(j);
                }
        }
        return seen;
    }
    polyolYl(os, centres) {
        const alcohol = this.part(os[0], new Set(os.map((o, k) => this.key(o, centres[k]))));
        if (!os.every((o) => alcohol.has(o)) || centres.some((c) => alcohol.has(c)) || [...alcohol].some((a) => this.el[a] === "O" && !os.includes(a) && this.h[a]))
            return undefined;
        const polyol = new Namer(this.piece([...alcohol], os)).name(), m = polyol?.match(/(di|tri|tetra|penta|hexa)ol$/);
        return polyol && m && MULT.indexOf(m[1]) === os.length ? (0, namer_multiplicative_ts_1.phenylene)(polyol.replace(/ol$/, "yl")) : polyol ? (0, namer_multiplicative_ts_1.polyolDiyl)(this, alcohol, os) : undefined;
    }
    piece(atoms, addH, addOH = []) {
        const index = new Map(atoms.map((a, k) => [a, k]));
        const g = { atoms: atoms.map((a) => ({ el: this.el[a], charge: this.q[a], h: this.h[a] + (addH.includes(a) ? 1 : 0), ...(this.cip[a] ? { cip: this.cip[a] } : {}) })), bonds: [] };
        for (const [k, order] of this.bond) {
            const [a, b] = k.split(" ").map(Number), cip = this.cipBond.get(k);
            if (index.has(a) && index.has(b))
                g.bonds.push({ a: index.get(a), b: index.get(b), order: order, ...(cip ? { cip } : {}) });
        }
        for (const c of addOH) {
            g.atoms.push({ el: "O", charge: 0, h: 1 });
            g.bonds.push({ a: index.get(c), b: g.atoms.length - 1, order: 1 });
        }
        return g;
    }
    anhydrideName() {
        if (this.anhydrideO.size !== 2 || new Set(this.anhydrideO.values()).size !== 1 || [...this.anhydrideO.keys()].some((c) => (0, namer_hetero_ts_1.thioDouble)(this, c)))
            throw new Error("anhydride");
        const acids = [...this.anhydrideO.keys()].map((c) => {
            const acid = this.parentName("anhydride", new Set(), this.side(c, this.anhydrideO.get(c)))?.text;
            if (!acid?.endsWith(" acid"))
                throw new Error("anhydride");
            return acid.slice(0, -5);
        });
        if (acids[0] === acids[1])
            return `${acids[0]} anhydride`;
        return `${acids.sort((a, b) => alphaKey(a).localeCompare(alphaKey(b))).join(" ")} anhydride`;
    }
    carbonicName(kind) {
        const cs = [...this.bearer.keys()].filter((g) => this.group[g] === kind);
        if (cs.length === 1)
            return this.carbonicOne(cs[0], kind);
        const multiplied = kind === "urea" ? (0, namer_multiplicative_ts_1.multiplicativeUrea)(this, cs) : undefined;
        if (multiplied)
            return multiplied;
        const di = this.dicarbonate(cs) ?? (kind === "carbamate" && cs.every((c) => this.esterO.has(c)) ? this.polyolEster(cs) : undefined);
        if (di)
            return di;
        let why;
        const names = cs.flatMap((c) => { try {
            return [this.carbonicOne(c, kind)];
        }
        catch (e) {
            why ?? (why = e);
            return [];
        } });
        if (!names.length)
            throw why;
        return names.sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
    }
    dicarbonate(cs) {
        if (cs.length !== 2 || cs.some((c) => (0, namer_hetero_ts_1.thioDouble)(this, c)))
            return undefined;
        const [l1, l2] = cs.map((c) => this.groupHetero(c)), o = l1.find((x) => l2.includes(x));
        const oo = o === undefined ? l1.find((x) => this.peroxO.has(x) && l2.some((y) => this.ord(x, y) === 1)) : undefined;
        if (o === undefined && oo === undefined)
            return undefined;
        const word = o === undefined ? "peroxydicarbon" : "dicarbon";
        const ends = [l1.find((x) => x !== (o ?? oo)), l2.find((x) => x !== o && (oo === undefined || this.ord(oo, x) !== 1))];
        if (ends.some((x) => this.el[x] !== "O" || this.peroxO.has(x)))
            return undefined;
        if (ends.every((x) => this.adj[x].length === 1))
            return `${word}ic acid`;
        if (ends.some((x) => this.adj[x].length === 1))
            return undefined;
        const alkyls = ends.map((x, k) => this.substituent(this.adj[x].find((j) => j !== cs[k]), x));
        if (alkyls[0].text === alkyls[1].text)
            return `${times(2, alkyls[0])} ${word}ate`;
        return `${alkyls.map((a) => a.text).sort((a, b) => alphaKey(a).localeCompare(alphaKey(b))).join(" ")} ${word}ate`;
    }
    thioCarbonic(c, kind, text, n, imidic, chal, xs) {
        const d = this.carbonylO[c], others = [...(d >= 0 ? [d] : []), ...chal].map((x) => this.el[x]).filter((e) => e !== "O");
        if (new Set(others).size !== 1)
            throw new Error("thio");
        const stem = (n ? "carbam" : xs.length && chal.length ? `carbono${xs[0].slice(0, -1)}` : "carbon") + (imidic ? "imid" : "") + "o" + MULT[others.length] + { S: "thio", Se: "seleno", Te: "telluro" }[others[0]];
        if (kind === "carbonylhalide")
            return `${text}${stem}yl ${xs.length === 2 && xs[0] === xs[1] ? `di${xs[0]}` : xs.join(" ")}`;
        const esters = chal.filter((x) => this.adj[x].length === 2), acids = chal.filter((x) => this.adj[x].length === 1);
        const at = (l) => new Set([...(d >= 0 ? [d] : []), ...l].map((x) => this.el[x]));
        const mixed = at(chal).size > 1;
        if (!esters.length || (acids.length && at(acids).size > 1)) {
            if (mixed)
                throw new Error("thio acid");
            return `${text}${stem}ic acid`;
        }
        const named = esters.map((x) => ({ at: this.el[x], name: this.substituent(this.adj[x].find((j) => j !== c), x) }));
        const alkyl = named.length === 2 && named[0].name.text === named[1].name.text ? `${mixed ? `${named.map((x) => x.at).sort().join(",")}-` : ""}${times(2, named[0].name)}`
            : named.sort((a, b) => alphaKey(a.name.text).localeCompare(alphaKey(b.name.text))).map((x) => (mixed ? `${x.at}-${enclose(x.name)}` : x.name.text)).join(" ");
        return `${alkyl}${acids.length ? " hydrogen" : ""} ${text}${stem}ate`;
    }
    carbonicOne(c, kind) {
        if (kind === "imine" && !this.diimine.has(c))
            throw new Error("imine");
        const imidic = this.carbonylO[c] < 0 && kind !== "imine" && kind !== "nitrile";
        const imino = imidic ? this.imineN(c) : undefined, last = imino === undefined ? [] : [imino];
        const ns = this.groupHetero(c).filter((j) => this.el[j] === "N" && j !== imino && !this.azidoAtom(j) && (kind === "imine" || this.ord(c, j) === 1));
        const prefixes = [...ns, ...last].flatMap((n) => this.adj[n].filter((j) => j !== c).map((j) => ({ n, name: this.substituent(j, n) })));
        let nums = ns.length === 2 ? [[...ns, ...last], [ns[1], ns[0], ...last]] : [[...ns, ...last]];
        nums = this.lowest(nums, (num) => prefixes.map((x) => num.indexOf(x.n) + 1));
        for (const t of [...new Set(prefixes.map((x) => x.name.text))].sort((a, b) => alphaKey(a).localeCompare(alphaKey(b))))
            nums = this.lowest(nums, (num) => prefixes.filter((x) => x.name.text === t).map((x) => num.indexOf(x.n) + 1));
        const same = prefixes.every((x) => x.name.text === prefixes[0]?.name.text);
        const free = kind === "urea" && !imidic && ns.length === 2 && (prefixes.length === 1 || (prefixes.length === 4 && same));
        const text = free ? substituted(prefixes.map((x) => x.name)) : assemblePrefixes(prefixes.map((x) => ({ loc: ["N", "N'", "N''"][nums[0].indexOf(x.n)], name: x.name })), false);
        const thio = (0, namer_hetero_ts_1.thioDouble)(this, c);
        const ez = kind === "guanidine" ? this.cipBond.get(this.key(c, imino)) : undefined;
        if (kind === "guanidine" || (kind === "urea" && !imidic))
            return `${ez === "E" || ez === "Z" ? `(${ez})-` : ""}${text}${thio ? "thio" : ""}${kind}`;
        if (kind === "urea")
            throw new Error("imine");
        if (kind === "imine")
            return `${text}methanediimine`;
        const ls = this.groupHetero(c), oh = ls.some((x) => this.el[x] === "O" && this.adj[x].length === 1);
        const alkyls = ls.filter((x) => this.el[x] === "O" && this.adj[x].length === 2 && !this.peroxO.has(x)).map((o) => this.substituent(this.adj[o].find((j) => j !== c), o));
        const xs = ls.filter((x) => HALO[this.el[x]]).map((x) => HALIDE[this.el[x]]).sort();
        if (kind === "nitrile")
            return ns.length ? `${text}cyanamide` : xs.length ? `carbononitridic ${xs[0]}` : ls.some((j) => this.azidoAtom(j)) ? "carbononitridic azide" : "cyanic acid";
        if (ls.some((x) => this.peroxO.has(x))) {
            if (kind !== "carbonic" || imidic || thio || ns.length || ls.some((x) => this.el[x] !== "O" || (!this.peroxO.has(x) && this.adj[x].length !== 1)))
                throw new Error("peroxy");
            return "carbonoperoxoic acid";
        }
        const chal = ls.filter((x) => CHALCOGENS.has(this.el[x]) && this.ord(c, x) === 1);
        if (thio || chal.some((x) => this.el[x] !== "O"))
            return this.thioCarbonic(c, kind, text, ns.length > 0, imidic, chal, xs);
        const oxo = () => {
            if (ns.length)
                return kind === "carbonic" ? `${text}carbamic acid` : kind === "carbonylhalide" ? `${text}carbamoyl ${xs[0]}` : `${alkyls[0].text} ${text}carbamate`;
            if (xs.length)
                return oh ? `carbono${xs[0].slice(0, -1)}ic acid` : alkyls.length ? `${alkyls[0].text} carbono${xs[0].slice(0, -1)}ate` : xs[0] === xs[1] ? `${text}carbonyl di${xs[0]}` : `${text}carbonyl ${xs.join(" ")}`;
            if (oh)
                return alkyls.length ? `${alkyls[0].text} hydrogen carbonate` : "carbonic acid";
            if (alkyls[0].text === alkyls[1].text)
                return `${times(2, alkyls[0])} ${text}carbonate`;
            return `${alkyls.map((a) => a.text).sort((a, b) => alphaKey(a).localeCompare(alphaKey(b))).join(" ")} ${text}carbonate`;
        };
        const word = oxo();
        if (text && !word.includes(text))
            throw new Error("imidic acid derivative");
        if (!imidic)
            return word;
        return word.replace(/carbamic acid$/, "carbamimidic acid").replace(/carbamate$/, "carbamimidate").replace(/carbamoyl /, "carbamimidoyl ")
            .replace(/carbonyl /, "carbonimidoyl ").replace(/(carbono\w+)ic acid$/, "$1imidic acid").replace(/(carbono\w+id)ate$/, "$1imidate")
            .replace(/carbonate$/, "carbonimidate").replace(/carbonic acid$/, "carbonimidic acid");
    }
}
exports.Namer = Namer;
function pairable(atoms, bonded) {
    const free = new Set(atoms);
    let steps = 0;
    const pair = () => {
        if (++steps > 20000)
            throw new Error("pairing");
        const a = free.values().next().value;
        if (a === undefined)
            return true;
        free.delete(a);
        for (const b of bonded(a)) {
            if (!free.has(b))
                continue;
            free.delete(b);
            if (pair())
                return true;
            free.add(b);
        }
        free.add(a);
        return false;
    };
    return pair();
}
function compare(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] === undefined)
            return -1;
        if (b[i] === undefined)
            return 1;
        if (a[i] !== b[i])
            return a[i] - b[i];
    }
    return 0;
}
const locantsOf = (name) => (name.match(/\d+/g) ?? []).map(Number);
function citedLabels(text) {
    const times = [1];
    let n = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ")" || ch === "]" || ch === "}") {
            times.pop();
            continue;
        }
        if (ch !== "(" && ch !== "[" && ch !== "{")
            continue;
        const m = text.slice(0, i).match(/(bis|tris|tetrakis|pentakis|hexakis|heptakis|octakis)$/), here = times[times.length - 1];
        const d = ch === "(" ? text.slice(i).match(/^\(([^()]*)\)-/) : null;
        if (d)
            n += here * d[1].split(",").filter((t) => /^(\d+[a-z]?'*)?[RSEZ]$/.test(t)).length;
        times.push(here * (m ? MULT_COMPLEX.indexOf(m[1]) : 1));
    }
    return n;
}
function alphaKey(t) {
    let k = t.replace(/\([^()]*\)/g, (d) => (namer_maingroup_ts_1.NUCLIDE.test(d) ? "" : d)).replace(/^[([{]*\[[\d',]+\](?=[a-z])/, "").replace(/[()[\]{}]/g, "");
    for (const lead = /^(tert|sec|N\d*'*|\d+[a-z]?'*(λ[¹²³⁴⁵⁶])?[RSEZH]?|[RSEZ])(,(N\d*'*|\d+[a-z]?'*(λ[¹²³⁴⁵⁶])?[RSEZH]?|[RSEZ]))*-/; lead.test(k);)
        k = k.replace(lead, "");
    return k;
}
function substituted(subs) {
    const groups = new Map();
    for (const s of subs)
        groups.set(s.text, { name: s, n: (groups.get(s.text)?.n ?? 0) + 1 });
    const sorted = [...groups.values()].sort((a, b) => alphaKey(a.name.text).localeCompare(alphaKey(b.name.text)));
    const parts = sorted.map((g) => (g.n > 1 ? times(g.n, g.name) : enclose(g.name)));
    return parts.map((t, k) => (k === 0 || /^[([{]/.test(t) ? t : enclose({ text: t, compound: true }))).join("");
}
function alkylWords(names) {
    const groups = new Map();
    for (const s of names)
        groups.set(s.text, { name: s, n: (groups.get(s.text)?.n ?? 0) + 1 });
    return [...groups.values()].sort((a, b) => alphaKey(a.name.text).localeCompare(alphaKey(b.name.text)))
        .map((g) => times(g.n, g.name)).join(" ");
}
function times(k, n) {
    if (k < 2)
        return n.text;
    return n.compound ? MULT_COMPLEX[k] + enclose(n) : MULT[k] + (/^(tert|sec)-/.test(n.text) ? "-" : "") + n.text;
}
const OPEN = "([{", CLOSE = ")]}";
function enclose(n) {
    if (!n.compound)
        return n.text;
    const t = n.text
        .replace(/\[(?:[\d',:]+(?:-[a-z]{1,4})?|[a-z]{1,4}(?:,[a-z]{1,4})*|[\d',:-]+[a-z]{1,4}(?:[,:][\d',-]*[a-z]{1,4})*)\]/g, "")
        .replace(/(?<=cyclo|spiro)\[[\d.,⁰¹²³⁴⁵⁶⁷⁸⁹]+\]/g, "")
        .replace(/\[(\d[\d',:]*-(?:bi|ter|quater)[^[\]]*)\]/g, "$1")
        .replace(/(?<=\d[a-z]?'*)\(\d+[a-z]?'*H(?:,\d+[a-z]?'*H)*\)/g, "");
    let depth = 0, level = 0;
    for (const ch of t)
        if (OPEN.includes(ch))
            level = Math.max(level, ++depth);
        else if (CLOSE.includes(ch))
            depth--;
    while (t[0] === OPEN[level % 3] || t[t.length - 1] === CLOSE[level % 3])
        level++;
    return OPEN[level % 3] + n.text + CLOSE[level % 3];
}
function assemblePrefixes(list, noLocants) {
    const groups = new Map();
    for (const p of list) {
        const g = groups.get(p.name.text) ?? { name: p.name, locs: [] };
        g.locs.push(p.loc);
        groups.set(p.name.text, g);
    }
    const sorted = [...groups.values()].sort((a, b) => alphaKey(a.name.text).localeCompare(alphaKey(b.name.text)));
    const parts = sorted.map((g) => {
        const isN = (l) => l[0] === "N", nKey = (l) => "0" + l.slice(1);
        const locs = g.locs.sort((a, b) => (isN(a) !== isN(b) ? (isN(a) ? -1 : 1) : isN(a) ? locOrder(nKey(a), nKey(b)) : locOrder(a, b)));
        const m = g.locs.length, multiplied = m > 1 ? times(m, g.name) : enclose(g.name);
        return noLocants && !locs.some(isN) ? multiplied : `${locs.join(",")}-${multiplied}`;
    });
    const bare = (t) => !/^N/.test(t);
    return parts.map((t, k) => (!k || /^[([{]/.test(t) ? t : noLocants && bare(t) && bare(parts[k - 1]) ? enclose({ text: t, compound: true }) : `-${t}`)).join("");
}
function lambdaName(name, lams) {
    if (!lams.length)
        return name;
    const m = name.match(/^(\d+[a-z]?(?:,\d+[a-z]?)*)-(?=[a-z])/);
    if (!m)
        return `${lams.join(",")}-${name}`;
    const locs = m[1].split(","), bare = (l) => l.replace(/λ.*/, "");
    if (!lams.every((l) => locs.includes(bare(l))))
        throw new Error("λ locant");
    return locs.map((l) => lams.find((x) => bare(x) === l) ?? l).join(",") + name.slice(m[1].length);
}
const joinPrefixes = (prefixes, rest) => (prefixes && /^\d/.test(rest) ? `${prefixes}-${rest}` : prefixes + rest);
exports.joinPrefixes = joinPrefixes;
function chainStem(size, enes, ynes, ring) {
    const stem = STEMS[size];
    if (!stem)
        throw new Error("chain too long");
    if (!enes.length && !ynes.length)
        return stem + "ane";
    const multi = enes.length > 1 || ynes.length > 1;
    let t = stem + (multi ? "a" : "");
    const show = !(size === 2 && !ring) || multi;
    if (enes.length)
        t += (show ? `-${enes.join(",")}-` : "") + MULT[enes.length] + (ynes.length ? "en" : "ene");
    if (ynes.length)
        t += (show ? `-${ynes.join(",")}-` : "") + MULT[ynes.length] + "yne";
    return t;
}
function withSuffix(parent, kind, locs, ring, locantFree, one, own) {
    if (!kind && !own)
        return parent;
    const m = locs.length;
    const base = {
        acid: ["oic acid", "carboxylic acid"], anhydride: ["oic acid", "carboxylic acid"], halide: ["oyl", "carbonyl"],
        sulfonic: ["sulfonic acid", "sulfonic acid"], selenonic: ["selenonic acid", "selenonic acid"], seleninic: ["seleninic acid", "seleninic acid"],
        telluronic: ["telluronic acid", "telluronic acid"], tellurinic: ["tellurinic acid", "tellurinic acid"], sulfonylhalide: ["sulfonyl", "sulfonyl"], urea: ["", ""], carbamate: ["", ""], ester: ["oate", "carboxylate"], amide: ["amide", "carboxamide"], nitrile: ["nitrile", "carbonitrile"],
        sulfonate: ["sulfonate", "sulfonate"], sulfonamide: ["sulfonamide", "sulfonamide"],
        aldehyde: ["al", "carbaldehyde"], ketone: ["one", "one"], alcohol: ["ol", "ol"], thiol: ["thiol", "thiol"], selenol: ["selenol", "selenol"], tellurol: ["tellurol", "tellurol"], amine: ["amine", "amine"],
        aminium: ["aminium", "aminium"], imine: ["imine", "imine"], carbonic: ["", ""], carbonylhalide: ["", ""],
        amidine: ["imidamide", "carboximidamide"], guanidine: ["", ""], hydrazide: ["hydrazide", "carbohydrazide"],
        imidic: ["imidic acid", "carboximidic acid"], imidate: ["imidate", "carboximidate"], imidoylhalide: ["imidoyl", "carboximidoyl"],
        peroxy: ["peroxoic acid", "carboperoxoic acid"], peroxyester: ["peroxoate", "carboperoxoate"], peroxide: ["", ""],
        carboxylate: ["oate", "carboxylate"], sulfonateion: ["sulfonate", "sulfonate"], sulfinate: ["sulfinate", "sulfinate"], olate: ["olate", "olate"], aminide: ["aminide", "aminide"], ide: ["ide", "ide"],
        ylium: ["ylium", "ylium"], iminium: ["iminium", "iminium"], diazonium: ["diazonium", "diazonium"], peroxoate: ["peroxoate", "carboperoxoate"],
    };
    let s = own ?? base[kind][ring ? 1 : 0];
    const terminal = !ring && !!kind && CARBON_GROUP.has(kind);
    if (m > 1)
        s = MULT[m] + (s.startsWith("oic") ? "oic acid" : s);
    if (terminal && kind === "nitrile" && m === 1 && !one)
        s = "nitrile";
    const word = m > 1 && terminal && kind === "acid" ? `${MULT[m]}oic acid` : s;
    const elide = VOWEL.test(word) ? parent.replace(/e(\]?)$/, "$1") : parent;
    if (terminal || (locantFree && m === 1 && ring) || (one && m === 1))
        return (VOWEL.test(word) ? elide : parent) + word;
    return `${VOWEL.test(word) ? elide : parent}-${locs.join(",")}-${word}`;
}
function saltName(g, parts) {
    const lone = (p, el, h) => p.length === 1 && g.atoms[p[0]].el === el && g.atoms[p[0]].h === h && !g.atoms[p[0]].charge;
    const adducts = ["Cl", "Br", "I", "F", "O"].map((el) => [el, parts.filter((p) => lone(p, el, el === "O" ? 2 : 1)).length]).filter(([, k]) => k);
    const rest = parts.filter((p) => !["Cl", "Br", "I", "F", "O"].some((el) => lone(p, el, el === "O" ? 2 : 1)));
    if (adducts.length && rest.length) {
        if (adducts.some(([, k]) => k >= MULT.length))
            return undefined;
        const main = nameOf(partOf(g, rest.flat()));
        return main && [main, ...adducts.map(([el, k]) => el === "O" ? `${k === 1 ? "mono" : MULT[k]}hydrate` : `${MULT[k]}hydro${HALIDE[el]}`)].join(" ");
    }
    const charge = (p) => p.reduce((t, i) => t + g.atoms[i].charge, 0);
    const cations = parts.filter((p) => charge(p) > 0), anions = parts.filter((p) => charge(p) < 0);
    if (!cations.length || !anions.length || cations.length + anions.length !== parts.length || parts.reduce((t, p) => t + charge(p), 0) !== 0)
        return undefined;
    const cationNames = cations.map((p) => cationName(g, p)), anionNames = anions.map((p) => anionOf(g, p));
    if (cationNames.includes(undefined) || anionNames.includes(undefined))
        return undefined;
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    if (new Set(cationNames).size === 1 && new Set(anionNames).size === 1 && gcd(cations.length, anions.length) > 1)
        return undefined;
    const metals = cations.map((p) => (p.length === 1 ? g.atoms[p[0]].el : ""));
    const stockName = cationNames.some((n) => /\([IVX]+\)$/.test(n));
    for (const n of anionNames) {
        if (n === "nitride" && !metals.every((e) => /^(Li|Na|K|Be|Mg|Ca|Sr)$/.test(e)))
            return undefined;
        if (n === "amide" && !metals.every((e) => /^(Li|Na|K|Rb|Cs|Fr|Be|Mg|Ca|Sr|Ba|Ra)$/.test(e)))
            return undefined;
        if (/^(sulfide|selenide|telluride)$/.test(n) && (stockName || !metals.every((e) => CATIONS[e] || metal(e))))
            return undefined;
        if (n === "oxide" && !cations.every((p) => CATIONS[metals[cations.indexOf(p)]] || ((0, metals_ts_1.isMetal)(metals[cations.indexOf(p)]) && g.atoms[p[0]].charge >= 3)))
            return undefined;
        if ((n === "hydride" || n === "cyanide") && (stockName || metals.some((e) => e === "Ag" || e === "Al")))
            return undefined;
    }
    const bare = stockName || anionNames.includes("nitride"), spaced = anionNames.some((n) => n.includes(" "));
    const oxo = new Set([...Object.values(ANIONS), ...Object.values(LINKED), ...Object.values(PEROXY)].filter((n) => /(ate|ite)$/.test(n) && n !== "thiocyanate"));
    const simple = new Set([...Object.values(ANIONS).filter((n) => !oxo.has(n)), ...Object.values(CATIONS).map((c) => c[0]), "ammonium", "acetate", "formate", "benzoate", "phenolate"]);
    const plain = (n) => simple.has(n) && !/^(di|tri|tetra|penta|hexa|hydrogen)/.test(n);
    const multiplied = (k, name, anion) => (k < 2 || bare || (anion && spaced) ? name : plain(name) ? MULT[k] + name : `${MULT_COMPLEX[k]}(${name})`);
    const list = (names, anion) => [...new Set(names)].sort((a, b) => alphaKey(a).localeCompare(alphaKey(b))).map((n) => multiplied(names.filter((x) => x === n).length, n, anion)).join(" ");
    return `${list(cationNames, false)} ${list(anionNames, true)}`;
}
function partOf(g, part) {
    const index = new Map(part.map((i, k) => [i, k]));
    return { atoms: part.map((i) => ({ ...g.atoms[i] })), bonds: g.bonds.filter((b) => index.has(b.a)).map((b) => ({ ...b, a: index.get(b.a), b: index.get(b.b) })) };
}
function cationName(g, part) {
    const a = g.atoms[part[0]];
    if (part.length === 1 && CATIONS[a.el])
        return CATIONS[a.el][1] === a.charge && !a.h ? CATIONS[a.el][0] : undefined;
    if (part.length === 1 && metal(a.el) && !a.h)
        return ROMAN[a.charge] ? `${metals_ts_1.ELEMENTS.get(a.el)}(${ROMAN[a.charge]})` : undefined;
    if (part.length === 1 && a.el === "N" && a.h === 4 && a.charge === 1)
        return "ammonium";
    return speciesName(partOf(g, part)) ?? new Namer(partOf(g, part)).name();
}
function ionFormula(g, part) {
    const count = new Map();
    for (const i of part) {
        const a = g.atoms[i];
        count.set(a.el, (count.get(a.el) ?? 0) + 1);
        if (a.h)
            count.set("H", (count.get("H") ?? 0) + a.h);
    }
    const els = [...count.keys()].sort((x, y) => (count.has("C") ? (x === "C" ? -1 : y === "C" ? 1 : x === "H" ? -1 : y === "H" ? 1 : 0) : 0) || (x < y ? -1 : x > y ? 1 : 0));
    return els.map((e) => e + (count.get(e) > 1 ? count.get(e) : "")).join("") + part.reduce((t, i) => t + g.atoms[i].charge, 0);
}
function anionOf(g, p) {
    const part = partOf(g, p), iso = part.atoms.some((a) => a.iso || a.hx?.length);
    const simple = (iso ? undefined : anionByFormula(part, ionFormula(g, p))) ?? speciesName(part);
    if (simple)
        return simple;
    try {
        return new Namer(part).name();
    }
    catch (e) {
        let old;
        try {
            old = anionName(g, p);
        }
        catch {
            old = undefined;
        }
        if (old)
            return old;
        throw e;
    }
}
function anionName(g, part) {
    const { atoms, bonds } = partOf(g, part);
    const nbrs = (k) => bonds.flatMap((b) => (b.a === k ? [b] : b.b === k ? [{ ...b, b: b.a }] : []));
    const acidO = (k) => {
        const n = nbrs(k);
        if (atoms[k].el !== "O" || n.length !== 1 || n[0].order !== 1)
            return false;
        const owner = n[0].b, doubles = nbrs(owner).filter((b) => b.order === 2 && atoms[b.b].el === "O").length;
        return (atoms[owner].el === "C" && doubles === 1) || (atoms[owner].el === "S" && doubles === 2);
    };
    let ions = 0, olates = 0;
    for (let k = 0; k < atoms.length; k++) {
        const n = nbrs(k);
        if (acidO(k)) {
            if (atoms[k].charge !== -1)
                return undefined;
            ions++;
        }
        else if (atoms[k].el === "O" && atoms[k].charge === -1 && n.length === 1 && n[0].order === 1 && atoms[n[0].b].el === "C")
            olates++;
        else
            continue;
        atoms[k] = { ...atoms[k], charge: 0, h: 1 };
    }
    if (ions && olates)
        return undefined;
    const name = new Namer({ atoms, bonds }).name();
    if (!ions && !olates && name?.endsWith("boranuide"))
        return name;
    if (olates) {
        const m = name?.match(/(di|tri|tetra)?ol$/);
        return m && (m[1] ? MULT.indexOf(m[1]) : 1) === olates ? `${name}ate` : undefined;
    }
    const mult = name?.match(/(di|tri|tetra)(oic|carboxylic|sulfonic) acid$/)?.[1];
    if (!name?.endsWith("ic acid") || (mult ? MULT.indexOf(mult) : 1) !== ions)
        return undefined;
    return name.replace(/ic acid$/, "ate");
}
const METAL_API = {
    name: (g, opaque) => new Namer(g, opaque).name(),
    prefix: (g, x, from) => { const n = new Namer(g); n.perceive(); return n.substituent(x, from); },
    groups: (g) => {
        const n = new Namer(g);
        n.perceive();
        const kind = SENIORITY.find((k) => [...n.bearer.keys()].some((a) => n.group[a] === k));
        return { kind, sites: [...n.bearer].filter(([a]) => n.group[a] === kind).map(([atom, on]) => ({ atom, on })) };
    },
    anion: anionOf, salt: saltName, cation: (el) => CATIONS[el], assemblePrefixes, alphaKey, enclose,
};
const HYDRIDES = {
    B3: "borane", Al3: "alumane", Ga3: "gallane", In3: "indigane", Tl3: "thallane", Si4: "silane", Ge4: "germane", Sn4: "stannane",
    Pb4: "plumbane", N3: "ammonia", P3: "phosphane", As3: "arsane", Sb3: "stibane", Bi3: "bismuthane", O2: "water", S2: "hydrogen sulfide",
    Se2: "hydrogen selenide", Te2: "hydrogen telluride", Po2: "polane", F1: "hydrogen fluoride", Cl1: "hydrogen chloride",
    Br1: "hydrogen bromide", I1: "hydrogen iodide", At1: "astatane", P5: "λ5-phosphane",
};
Object.assign(ANIONS, {
    "N-3": "nitride", "O2-2": "dioxidanediide", "HO2-1": "hydroperoxide", "HS-1": "sulfanide", "Se-2": "selenide",
    "Te-2": "telluride", "ClO3-1": "chlorate", "ClO2-1": "chlorite", "BrO-1": "hypobromite", "BrO2-1": "bromite", "BrO3-1": "bromate",
    "BrO4-1": "perbromate", "IO-1": "hypoiodite", "IO2-1": "iodite", "IO3-1": "iodate", "O3P-3": "phosphite", "H2O2P-1": "phosphinate",
    "O7P2-4": "diphosphate", "O10P3-5": "triphosphate", "O7S2-2": "disulfate", "O8S2-2": "peroxydisulfate", "O4Se-2": "selenate", "O3Se-2": "selenite",
    "AsF6-1": "hexafluoroarsenate", "F6Sb-1": "hexafluoroantimonate", "AlCl4-1": "tetrachloroaluminate",
    "I3-1": "triiodide", "Br3-1": "tribromide", "H2NO3S-1": "sulfamate", "IO6-5": "orthoperiodate",
    "O5S2-2": "disulfite", "O5P2-4": "diphosphite", "O13P4-6": "tetraphosphate", "O16P5-7": "pentaphosphate", "ClCrO3-1": "chlorochromate",
    "FO-1": "hypofluorite",
});
const BRIDGED = new Set(["O7P2-4", "O10P3-5", "O13P4-6", "O16P5-7", "O7S2-2", "O8S2-2", "Cr2O7-2", "O5S2-2", "O5P2-4"]);
const PEROXY = { "O5S-2": "peroxymonosulfate", "HO5S-1": "hydrogen peroxymonosulfate" };
const LINKED = { "O4S2-2": "dithionite", "O5S2-2": "metabisulfite", "O6S2-2": "dithionate", "O6P2-4": "hypodiphosphate", "O4P2-4": "hypodiphosphite" };
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
const metal = (el) => metals_ts_1.ELEMENTS.has(el) && !/^(H|He|B|C|N|O|F|Ne|Si|P|S|Cl|Ar|As|Se|Br|Kr|Te|I|Xe|At|Rn)$/.test(el);
function shapes(g) {
    const label = (i) => { const a = g.atoms[i]; return `${a.el}${a.h ? `H${a.h > 1 ? a.h : ""}` : ""}${(a.charge > 0 ? "+" : "-").repeat(Math.abs(a.charge))}`; };
    if (g.bonds.length !== g.atoms.length - 1)
        return [];
    return g.atoms.flatMap((_, c) => {
        const bonds = g.bonds.filter((b) => b.a === c || b.b === c);
        return bonds.length === g.atoms.length - 1 ? [`${label(c)}(${bonds.map((b) => "-=#"[b.order - 1] + label(b.a === c ? b.b : b.a)).sort().join(",")})`] : [];
    });
}
function anionByFormula(g, formula) {
    if (g.atoms.length === 1)
        return ANIONS[formula];
    const el = (i) => g.atoms[i].el, o = (k) => g.bonds.filter((b) => (el(b.a) === "O" ? 1 : 0) + (el(b.b) === "O" ? 1 : 0) === k).length;
    if (g.bonds.length !== g.atoms.length - 1)
        return undefined;
    if (LINKED[formula] && o(0) === 1 && o(2) === 0)
        return LINKED[formula];
    if (PEROXY[formula]) {
        const oo = g.bonds.find((b) => el(b.a) === "O" && el(b.b) === "O"), end = oo && [oo.a, oo.b].find((i) => g.bonds.filter((b) => b.a === i || b.b === i).length === 1);
        return !o(0) && o(2) === 1 && end !== undefined && (g.atoms[end].h === 1 || g.atoms[end].charge === -1) ? PEROXY[formula] : undefined;
    }
    if (BRIDGED.has(formula))
        return !o(0) && o(2) === (formula === "O8S2-2" ? 1 : 0) ? ANIONS[formula] : undefined;
    return ANIONS[formula] && shapes(g).some((s) => s[0] !== "O" || g.atoms.every((a) => a.el === "O")) ? ANIONS[formula] : undefined;
}
function speciesName(g) {
    if (g.atoms.some((a) => a.iso || a.hx?.length))
        return (0, namer_maingroup_ts_1.isotopeSpecies)(g, speciesName);
    const known = (0, namer_maingroup_ts_1.inorganicSpecies)(g);
    if (known)
        return known;
    const f = ionFormula(g, g.atoms.map((_, i) => i));
    const inorganic = f.includes("-") ? anionByFormula(g, f) : undefined;
    if (inorganic)
        return inorganic;
    if (g.atoms.length !== 1)
        return undefined;
    const a = g.atoms[0];
    if (!a.charge)
        return a.h ? HYDRIDES[`${a.el}${a.h}`] : a.el === "H" ? undefined : metals_ts_1.ELEMENTS.get(a.el);
    return a.charge > 0 && !a.h && a.el !== "H" && metals_ts_1.ELEMENTS.has(a.el) ? `${metals_ts_1.ELEMENTS.get(a.el)}(${a.charge}+)` : undefined;
}
function otherKekule(g) {
    const order = new Map(g.bonds.map((b) => [b.a < b.b ? `${b.a} ${b.b}` : `${b.b} ${b.a}`, b.order]));
    const ord = (a, b) => order.get(a < b ? `${a} ${b}` : `${b} ${a}`) ?? 0;
    const adj = g.atoms.map(() => []);
    for (const b of g.bonds) {
        adj[b.a].push(b.b);
        adj[b.b].push(b.a);
    }
    const flip = new Set();
    const walk = (path) => {
        if (path.length === 6) {
            if (ord(path[5], path[0]) === 1)
                path.forEach((a, i) => { const b = path[(i + 1) % 6]; flip.add(a < b ? `${a} ${b}` : `${b} ${a}`); });
            return;
        }
        const last = path[path.length - 1];
        for (const n of adj[last])
            if (!path.includes(n) && ord(last, n) === (path.length % 2 ? 2 : 1))
                walk([...path, n]);
    };
    for (let a = 0; a < g.atoms.length; a++)
        walk([a]);
    if (!flip.size)
        return undefined;
    return { atoms: g.atoms, bonds: g.bonds.map((b) => (flip.has(b.a < b.b ? `${b.a} ${b.b}` : `${b.b} ${b.a}`) ? { ...b, order: (3 - b.order) } : b)) };
}
function iupacName(g) {
    return iupacNameWhy(g).name;
}
function iupacLocants(g) {
    try {
        const { g: folded, index } = foldIndexed(g);
        if (fragments(folded).length !== 1)
            return undefined;
        const n = new Namer((0, namer_maingroup_ts_1.chargeSeparated)(folded));
        if (!n.name() || !n.locants)
            return undefined;
        return g.atoms.map((_, i) => (index[i] === undefined ? undefined : n.locants.get(index[i])));
    }
    catch {
        return undefined;
    }
}
function foldHydrogens(g) {
    return foldIndexed(g).g;
}
function foldIndexed(g) {
    const bonds = (i) => g.bonds.filter((b) => b.a === i || b.b === i);
    const other = (i) => { const b = bonds(i)[0]; return b.a === i ? b.b : b.a; };
    const drop = g.atoms.map((a, i) => a.el === "H" && !a.charge && !a.h && bonds(i).length === 1 && bonds(i)[0].order === 1 && g.atoms[other(i)].el !== "H");
    if (!drop.some(Boolean))
        return { g, index: g.atoms.map((_, i) => i) };
    const index = [], atoms = [];
    g.atoms.forEach((a, i) => { if (!drop[i]) {
        index[i] = atoms.length;
        atoms.push({ ...a });
    } });
    g.atoms.forEach((a, i) => {
        if (!drop[i])
            return;
        const to = atoms[index[other(i)]];
        to.h++;
        if (a.iso)
            to.hx = [...(to.hx ?? []), a.iso];
    });
    return { g: { atoms, bonds: g.bonds.filter((b) => !drop[b.a] && !drop[b.b]).map((b) => ({ ...b, a: index[b.a], b: index[b.b] })) }, index };
}
function iupacNameWhy(g) {
    try {
        if (!g.atoms.length)
            return { why: "empty" };
        const folded = (0, namer_maingroup_ts_1.chargeSeparated)(foldHydrogens(g)), name = nameOf(folded);
        if (name && (0, namer_maingroup_ts_1.citedNuclides)(name) !== folded.atoms.reduce((t, a) => t + (a.iso ? 1 : 0) + (a.hx?.length ?? 0), 0))
            return { why: "isotope" };
        return name ? { name } : { why: fragments(folded).length === 1 ? "no name" : "salt" };
    }
    catch (e) {
        return { why: e instanceof Error ? e.message : String(e) };
    }
}
function nOxideName(g) {
    const charged = g.atoms.flatMap((a, i) => (a.charge ? [i] : []));
    if (charged.length !== 2 || g.atoms.filter((a) => a.el === "N").length !== 1)
        return undefined;
    const o = charged.find((i) => g.atoms[i].el === "O" && g.atoms[i].charge === -1 && !g.atoms[i].h), n = charged.find((i) => g.atoms[i].el === "N" && g.atoms[i].charge === 1);
    const bond = g.bonds.find((b) => (b.a === o && b.b === n) || (b.a === n && b.b === o));
    if (o === undefined || n === undefined || !bond || bond.order !== 1 || g.bonds.filter((b) => b.a === o || b.b === o).length !== 1)
        return undefined;
    if (!g.bonds.some((b) => (b.a === n || b.b === n) && b.order > 1 && g.atoms[b.a === n ? b.b : b.a].el === "C") || new Namer(g).inRing[n])
        return undefined;
    const keep = g.atoms.map((_, i) => i).filter((i) => i !== o), index = new Map(keep.map((i, k) => [i, k]));
    const neutral = { atoms: keep.map((i) => ({ ...g.atoms[i], charge: 0 })), bonds: g.bonds.filter((b) => b !== bond).map((b) => ({ ...b, a: index.get(b.a), b: index.get(b.b) })) };
    try {
        const name = new Namer(neutral).name();
        return name && `${name} N-oxide`;
    }
    catch {
        return undefined;
    }
}
function fragments(g) {
    const adj = g.atoms.map(() => []);
    for (const b of g.bonds) {
        adj[b.a].push(b.b);
        adj[b.b].push(b.a);
    }
    const parts = [], seen = new Set();
    for (let s = 0; s < g.atoms.length; s++) {
        if (seen.has(s))
            continue;
        const part = [s], stack = [s];
        seen.add(s);
        while (stack.length) {
            const i = stack.pop();
            for (const j of adj[i])
                if (!seen.has(j)) {
                    seen.add(j);
                    part.push(j);
                    stack.push(j);
                }
        }
        parts.push(part);
    }
    return parts;
}
function nameOf(g) {
    const parts = fragments(g);
    const named = (h) => (0, metals_ts_1.metalName)(h, parts, METAL_API) ?? (parts.length === 1 ? speciesName(h) ?? nOxideName(h) ?? new Namer(h).name() : saltName(h, parts));
    try {
        return named(g);
    }
    catch (e) {
        const other = e instanceof Error && e.message === "bridgehead double bond" && parts.length === 1 ? otherKekule(g) : undefined;
        if (!other)
            throw e;
        return named(other);
    }
}

  };
  defs["fusion.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ringSystem = ringSystem;
exports.numberSystem = numberSystem;
exports.fusionName = fusionName;
exports.fusedParent = fusedParent;
const key = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
function smallestRings(n, adj) {
    const index = new Map();
    let edges = 0;
    for (let a = 0; a < n; a++)
        for (const b of adj[a])
            if (a < b)
                index.set(key(a, b), edges++);
    const need = edges - n + 1, seen = new Set(), found = [];
    for (const [k] of index) {
        const u = Math.floor(k / 65536), v = k % 65536, prev = Array(n).fill(-1), queue = [u];
        prev[u] = u;
        for (let i = 0; i < queue.length && prev[v] < 0; i++) {
            const x = queue[i];
            for (const y of adj[x])
                if (prev[y] < 0 && !(x === u && y === v)) {
                    prev[y] = x;
                    queue.push(y);
                }
        }
        if (prev[v] < 0)
            continue;
        const atoms = [v];
        while (atoms[atoms.length - 1] !== u)
            atoms.push(prev[atoms[atoms.length - 1]]);
        let bits = 0n;
        atoms.forEach((a, i) => (bits |= 1n << BigInt(index.get(key(a, atoms[(i + 1) % atoms.length])))));
        if (!seen.has(bits)) {
            seen.add(bits);
            found.push({ atoms, bits });
        }
    }
    found.sort((x, y) => x.atoms.length - y.atoms.length);
    const basis = [], rings = [];
    for (const c of found) {
        let b = c.bits;
        for (const r of basis)
            if ((b ^ r) < b)
                b ^= r;
        if (!b)
            continue;
        basis.push(b);
        basis.sort((x, y) => (x > y ? -1 : x < y ? 1 : 0));
        rings.push(c.atoms);
    }
    if (rings.length !== need)
        throw new Error("ring perception");
    return rings;
}
function ringSystem(el, adj) {
    const n = el.length;
    if (adj.some((a) => a.length < 2 || a.length > 4))
        throw new Error("not ortho-fused");
    const rings = smallestRings(n, adj);
    if (rings.length < 2)
        throw new Error("not ortho-fused");
    const ringsOf = new Map();
    rings.forEach((r, i) => r.forEach((a, k) => { const e = key(a, r[(k + 1) % r.length]); ringsOf.set(e, [...(ringsOf.get(e) ?? []), i]); }));
    const pairs = new Set();
    for (const [, rs] of ringsOf) {
        if (rs.length > 2)
            throw new Error("not ortho-fused");
        if (rs.length === 2) {
            const p = key(rs[0], rs[1]);
            if (pairs.has(p))
                throw new Error("not ortho-fused");
            pairs.add(p);
        }
    }
    const done = rings.map((_, i) => i === 0), queue = [0];
    while (queue.length) {
        const r = rings[queue.shift()];
        r.forEach((a, k) => {
            const b = r[(k + 1) % r.length];
            for (const s of ringsOf.get(key(a, b))) {
                const S = rings[s], forward = S[(S.indexOf(a) + 1) % S.length] === b;
                if (S === r)
                    continue;
                if (!done[s]) {
                    if (forward)
                        S.reverse();
                    done[s] = true;
                    queue.push(s);
                }
                else if (forward)
                    throw new Error("not ortho-fused");
            }
        });
    }
    const across = rings.map((r, i) => r.map((a, k) => ringsOf.get(key(a, r[(k + 1) % r.length])).find((s) => s !== i) ?? -1));
    const next = Array(n).fill(-1);
    rings.forEach((r, i) => r.forEach((a, k) => { if (across[i][k] < 0) {
        if (next[a] >= 0)
            throw new Error("not ortho-fused");
        next[a] = r[(k + 1) % r.length];
    } }));
    const start = next.findIndex((x) => x >= 0);
    let len = 0;
    for (let a = start;;) {
        a = next[a];
        len++;
        if (a === start)
            break;
        if (a < 0 || len > n)
            throw new Error("not ortho-fused");
    }
    if (len !== next.filter((x) => x >= 0).length)
        throw new Error("not ortho-fused");
    for (let a = 0; a < n; a++) {
        if (adj[a].length < 4)
            continue;
        const at = [...rings.keys()].filter((r) => rings[r].includes(a));
        if (at.some((r, i) => at.slice(i + 1).some((t) => !across[r].includes(t) && rings[r].length === 6 && rings[t].length === 6)))
            throw new Error("fused ring shape");
    }
    return { n, el, adj, rings, across, next };
}
const STEP = { 0: [2, 0], 60: [1, 1], 90: [0, 1], 120: [-1, 1], 180: [-2, 0], 240: [-1, -1], 270: [0, -1], 300: [1, -1] };
const SEVEN = [
    [0, 60, 120, 180, null, 270, null], [0, null, 90, 120, 240, 270, null], [0, null, 90, null, 180, 240, 300],
    [0, 60, null, 120, null, 240, 300], [0, 60, 120, null, 240, null, 300],
];
function shapes(size, fused) {
    let list;
    if (size === 6)
        list = [[0, 60, 120, 180, 240, 300]];
    else if (size === 5)
        list = [1, 2, 3, 4].map((e) => [0, 1, 2, 3, 4].map((k) => (k < e ? 60 * k : k === e ? null : 60 * (k + 1))));
    else if (size === 7)
        list = SEVEN;
    else if (size === 4)
        list = [[0, 90, 180, 270]];
    else if (size === 3)
        list = [[0, 120, 240]];
    else if (size === 8)
        list = [[0, 60, 90, 120, 180, 240, 270, 300]];
    else if (size >= 9 && fused.filter(Boolean).length <= 2) {
        const angle = { 0: 0, 1: 60, 2: 90, 3: 120, 4: 180, [-3]: 240, [-2]: 270, [-1]: 300 }, half = Math.floor(size / 2);
        const dir = (d) => (d === 1 ? -3 : d === size - 1 ? 3 : size % 2 === 0 ? (Math.abs(d - half) > 2 ? -2 * Math.sign(d - half) : d - half)
            : d === half || d === half + 1 ? 0 : d < half ? -2 : 2);
        list = [Array.from({ length: size }, (_, d) => (d ? (angle[dir(d)] + 180) % 360 : 0))];
    }
    else
        throw new Error("fused ring size");
    list = list.filter((s) => s.every((o, k) => o !== null || !fused[k]));
    const seen = new Set();
    return list.filter((s) => { const t = s.map((o, k) => (fused[k] ? o : "")).join(); return !seen.has(t) && !!seen.add(t); });
}
const snap = (a) => (a % 60 === 30 && a % 180 !== 90 ? (a % 180 < 90 ? a + 30 : a - 30) : a) % 360;
function drawings(sys) {
    const { rings, across } = sys, R = rings.length;
    const fusedCount = across.map((a) => a.filter((s) => s >= 0).length), least = Math.min(...fusedCount);
    const root = [...rings.keys()].filter((r) => fusedCount[r] === least).sort((a, b) => Number(rings[b].length === 6) - Number(rings[a].length === 6))[0];
    const rr = rings[root], free = rr.map((_, k) => across[root][k] < 0);
    const ref = [...rr.keys()].find((k) => free[k] && free[(k + 1) % rr.length] && free[(k + rr.length - 1) % rr.length]) ?? free.indexOf(true);
    const parent = Array(R).fill(-1), via = Array(R).fill(-1), entry = Array(R).fill(-1), order = [root];
    entry[root] = ref;
    const visit = (r) => {
        rings[r].forEach((_, k) => {
            const s = across[r][k];
            if (s < 0 || order.includes(s))
                return;
            const a = rings[r][k], S = rings[s];
            parent[s] = r;
            via[s] = k;
            entry[s] = (S.indexOf(a) + S.length - 1) % S.length;
            order.push(s);
            visit(s);
        });
    };
    visit(root);
    const options = order.map((r) => {
        const n = rings[r].length, e = entry[r];
        return shapes(n, rings[r].map((_, j) => across[r][(e + j) % n] >= 0));
    });
    if (options.some((o) => !o.length))
        throw new Error("fused ring shape");
    if (options.reduce((t, o) => t * o.length, 1) > 4096)
        throw new Error("fused ring shape");
    const out = [];
    const choice = order.map(() => 0);
    for (;;) {
        const dir = rings.map((r) => r.map(() => null));
        order.forEach((r, i) => {
            const n = rings[r].length, e = entry[r], shape = options[i][choice[i]];
            const f = r === root ? 180 : (dir[parent[r]][via[r]] + 180) % 360;
            shape.forEach((o, j) => { if (o !== null && across[r][(e + j) % n] >= 0)
                dir[r][(e + j) % n] = snap((f + o) % 360); });
        });
        const agree = rings.every((r, i) => r.every((a, k) => {
            const s = across[i][k];
            if (s < 0)
                return true;
            const S = rings[s], ks = (S.indexOf(a) + S.length - 1) % S.length;
            return (dir[i][k] + 180) % 360 === dir[s][ks];
        }));
        if (agree)
            out.push({ dir, parent, via, order });
        let i = 0;
        while (i < choice.length && ++choice[i] === options[i].length)
            choice[i++] = 0;
        if (i === choice.length)
            break;
    }
    if (!out.length)
        throw new Error("fused ring shape");
    return out;
}
const SENIOR = ["Hg", "Tl", "In", "Ga", "Al", "B", "Pb", "Sn", "Ge", "Si", "Bi", "Sb", "As", "P", "N", "Te", "Se", "S", "O", "I", "Br", "Cl", "F"];
const senior = (e) => SENIOR.indexOf(e) + 1;
function numberSystem(sys) {
    const { n, el, adj, rings, across, next } = sys;
    const prev = Array(n).fill(-1);
    next.forEach((b, a) => { if (b >= 0)
        prev[b] = a; });
    const fusion = (a) => adj[a].length >= 3;
    const inside = (path) => {
        const rest = [...Array(n).keys()].filter((a) => !path.includes(a)), out = [], at = (a) => path.indexOf(a);
        const score = (a) => 1000 * Math.max(...adj[a].map((b) => out.indexOf(b) + 1)) + Math.max(...adj[a].map(at));
        while (out.length < rest.length)
            out.push(rest.filter((a) => !out.includes(a)).sort((a, b) => score(b) - score(a))[0]);
        return out;
    };
    const picks = [];
    const all = drawings(sys);
    let longest = 0;
    const turns = all.map(() => new Set());
    all.forEach((d, i) => d.dir.forEach((ds, r) => ds.forEach((a, k) => {
        if (a === null)
            return;
        let len = 1;
        for (let s = across[r][k]; s >= 0; len++) {
            const j = d.dir[s].indexOf(a);
            s = j < 0 ? -1 : across[s][j];
            if (len > rings.length)
                throw new Error("fused ring shape");
        }
        if (len > longest) {
            longest = len;
            turns.forEach((t) => t.clear());
        }
        if (len === longest)
            turns[i].add(a % 180);
    })));
    let row = 0;
    all.forEach((d, i) => {
        for (const turn of turns[i]) {
            const pos = rings.map(() => [0, 0]);
            for (const r of d.order.slice(1)) {
                const step = STEP[snap((d.dir[d.parent[r]][d.via[r]] - turn + 360) % 360)];
                pos[r] = [pos[d.parent[r]][0] + step[0], pos[d.parent[r]][1] + step[1]];
            }
            const at = new Set(pos.map((p) => `${p[0]} ${p[1]}`));
            if (at.size !== rings.length)
                continue;
            for (const p of pos) {
                if (at.has(`${p[0] - 2} ${p[1]}`))
                    continue;
                let len = 1;
                while (at.has(`${p[0] + 2 * len} ${p[1]}`))
                    len++;
                if (len < row)
                    continue;
                if (len > row) {
                    row = len;
                    picks.length = 0;
                }
                const cx = p[0] + len - 1, cy = p[1];
                for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
                    let ur = 0, ll = 0, up = 0;
                    for (const [x0, y0] of pos) {
                        const x = sx * (x0 - cx), y = sy * (y0 - cy);
                        const share = (fx, fy) => (x === 0 ? 0.5 : x * fx > 0 ? 1 : 0) * (y === 0 ? 0.5 : y * fy > 0 ? 1 : 0);
                        ur += share(1, 1);
                        ll += share(-1, -1);
                        up += share(1, 1) + share(-1, 1);
                    }
                    picks.push({ pick: { pos: pos.map(([x, y]) => [sx * x, sy * y]), mirror: sx * sy < 0 }, q: [-ur, ll, -up] });
                }
            }
        }
    });
    if (!picks.length)
        throw new Error("fused ring orientation");
    const best = picks.reduce((m, p) => (cmp(p.q, m) < 0 ? p.q : m), picks[0].q);
    const paths = [], walkedOf = new Map();
    for (const { pick, q } of picks) {
        if (cmp(q, best))
            continue;
        const { pos, mirror } = pick;
        let top = [...rings.keys()].sort((a, b) => pos[b][1] - pos[a][1] || pos[b][0] - pos[a][0])[0];
        const visited = new Set([top]);
        while (rings[top].every(fusion)) {
            const nb = across[top].filter((s) => s >= 0 && !visited.has(s)).sort((a, b) => pos[b][0] - pos[a][0] || pos[b][1] - pos[a][1]);
            if (!nb.length)
                throw new Error("fused ring numbering");
            top = nb[0];
            visited.add(top);
        }
        const ks = [...rings[top].keys()].filter((k) => across[top][k] >= 0);
        const k = ks.sort((a, b) => pos[across[top][b]][1] - pos[across[top][a]][1] || pos[across[top][a]][0] - pos[across[top][b]][0])[0];
        const r = rings[top], v = mirror ? r[(k + 1) % r.length] : r[k];
        if (next[v] < 0)
            throw new Error("fused ring numbering");
        const cw = (q, a) => { const R = rings[q], i = R.indexOf(a); return R[(i + (mirror ? 1 : R.length - 1)) % R.length]; };
        const over = (q, a, b) => { const R = rings[q], i = R.indexOf(a); return across[q][R[(i + 1) % R.length] === b ? i : R.indexOf(b)]; };
        const path = [];
        let ring = top, a = v;
        for (let guard = 0; guard < 4 * n; guard++) {
            const b = cw(ring, a), s = over(ring, a, b);
            if (s >= 0) {
                ring = s;
                continue;
            }
            if (path.includes(b))
                break;
            path.push(b);
            a = b;
        }
        if (!path.includes(v))
            throw new Error("fused ring numbering");
        const full = [...path, ...inside(path)];
        walkedOf.set(full, path.length);
        paths.push(full);
    }
    const numbered = (p) => p.filter((a) => el[a] !== "C" || !fusion(a));
    const order = (x, y) => {
        const nx = numbered(x), ny = numbered(y);
        for (let i = 0; i < nx.length; i++)
            if ((el[nx[i]] !== "C") !== (el[ny[i]] !== "C"))
                return el[nx[i]] !== "C" ? -1 : 1;
        for (let i = 0; i < nx.length; i++)
            if (el[nx[i]] !== el[ny[i]])
                return senior(el[ny[i]]) - senior(el[nx[i]]);
        for (let i = 0; i < x.length; i++) {
            const fx = el[x[i]] === "C" && fusion(x[i]), fy = el[y[i]] === "C" && fusion(y[i]);
            if (fx !== fy)
                return fx ? -1 : 1;
        }
        for (let i = 0; i < x.length; i++)
            if (fusion(x[i]) !== fusion(y[i]))
                return fusion(x[i]) ? -1 : 1;
        return 0;
    };
    paths.sort(order);
    const chosen = paths.filter((p) => order(p, paths[0]) === 0);
    const hetero = (p) => numbered(p).map((a, i) => (el[a] !== "C" ? i : -1)).filter((i) => i >= 0);
    const byElement = (p) => SENIOR.slice().reverse().flatMap((e) => numbered(p).map((a, i) => (el[a] === e ? i : -1)).filter((i) => i >= 0).concat([-1]));
    if (paths.some((p) => !cmp(hetero(p), hetero(chosen[0])) && cmp(byElement(p), byElement(chosen[0])) < 0))
        throw new Error("fused ring numbering");
    const like = (x, y) => x.every((a, i) => el[a] === el[y[i]] && adj[a].every((b) => adj[y[i]].includes(y[x.indexOf(b)])));
    if (chosen.some((p) => !like(chosen[0], p)))
        throw new Error("fused ring numbering");
    const seen = new Set();
    const walked = walkedOf.get(chosen[0]), interior = chosen[0].slice(walked);
    if (chosen.some((p) => walkedOf.get(p) !== walked))
        throw new Error("fused ring numbering");
    return chosen.filter((p) => !seen.has(p.join()) && !!seen.add(p.join())).map((path) => ({ path, labels: labelsOf(path, el, fusion), interior, row: longest }));
}
function labelsOf(path, el, fusion) {
    let num = 0, letter = 0;
    return path.map((a) => (el[a] !== "C" || !fusion(a) ? ((letter = 0), String(++num)) : `${num}${String.fromCharCode(97 + letter++)}`));
}
function cmp(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] === undefined)
            return -1;
        if (b[i] === undefined)
            return 1;
        if (a[i] !== b[i])
            return a[i] - b[i];
    }
    return 0;
}
function skeleton(smiles) {
    const el = [], adj = [], open = new Map(), stack = [];
    let prev = -1;
    for (const c of smiles) {
        if (c === "(")
            stack.push(prev);
        else if (c === ")")
            prev = stack.pop();
        else if (/[0-9]/.test(c)) {
            const o = open.get(c);
            if (o === undefined)
                open.set(c, prev);
            else {
                adj[o].push(prev);
                adj[prev].push(o);
                open.delete(c);
            }
        }
        else if (/[A-Za-z]/.test(c)) {
            const a = el.push(c.toUpperCase()) - 1;
            adj.push([]);
            if (prev >= 0) {
                adj[a].push(prev);
                adj[prev].push(a);
            }
            prev = a;
        }
    }
    return { el, adj };
}
const ANTHRACENE = "1-2 2-3 3-4 4-4a 4a-10 10-10a 10a-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 8a-10a";
const RETAINED = [
    ["naphthalene", "naphtho", "C1=CC=CC2=CC=CC=C12"], ["quinoline", "quino", "N1=CC=CC2=CC=CC=C12"], ["isoquinoline", "isoquino", "C1=NC=CC2=CC=CC=C12"],
    ["quinazoline", "quinazolino", "N1=CN=CC2=CC=CC=C12"], ["quinoxaline", "quinoxalino", "N1=CC=NC2=CC=CC=C12"], ["cinnoline", "cinnolino", "N1=NC=CC2=CC=CC=C12"],
    ["phthalazine", "phthalazino", "C1=NN=CC2=CC=CC=C12"], ["1,5-naphthyridine", "[1,5]naphthyridino", "N1=CC=CC2=NC=CC=C12"],
    ["1,6-naphthyridine", "[1,6]naphthyridino", "N1=CC=CC2=CN=CC=C12"], ["1,7-naphthyridine", "[1,7]naphthyridino", "N1=CC=CC2=CC=NC=C12"],
    ["1,8-naphthyridine", "[1,8]naphthyridino", "N1=CC=CC2=CC=CN=C12"], ["2,6-naphthyridine", "[2,6]naphthyridino", "C1=NC=CC2=CN=CC=C12"],
    ["2,7-naphthyridine", "[2,7]naphthyridino", "C1=NC=CC2=CC=NC=C12"], ["pteridine", "pteridino", "N1=CN=CC2=NC=CN=C12"],
    ["quinolizine", "quinolizino", "C1=CCN2C=CC=CC2=C1"], ["indene", "indeno", "C1=CC2=CC=CC=C2C1"], ["indole", "indolo", "N1C=CC2=CC=CC=C12"],
    ["isoindole", "isoindolo", "C1NC=C2C=CC=CC12"], ["indazole", "indazolo", "N1N=CC2=CC=CC=C12"], ["indolizine", "indolizino", "C1=CN2C=CC=CC2=C1"],
    ["pyrrolizine", "pyrrolizino", "C1C=CN2C=CC=C12"], ["azulene", "azuleno", "C1=CC=C2C=CC=CC=C12"], ["pentalene", "pentaleno", "C1=CC=C2C=CC=C12"],
    ["heptalene", "heptaleno", "C1=CC=CC=C2C=CC=CC=C12"], ["biphenylene", "biphenyleno", "C1=CC=CC=2C3=CC=CC=C3C12"],
    ["as-indacene", "as-indaceno", "C1=CC=C2C=CC3=CC=CC3=C12"], ["s-indacene", "s-indaceno", "C1=CC=C2C=C3C=CC=C3C=C12"],
    ["acenaphthylene", "acenaphtho", "C1=CC2=CC=CC3=CC=CC1=C23"], ["fluorene", "fluoreno", "C1=CC=CC=2C3=CC=CC=C3CC12"],
    ["phenalene", "phenaleno", "C1C=CC2=CC=CC3=CC=CC1=C23"], ["perimidine", "perimido", "N1C=NC2=CC=CC3=CC=CC1=C23"],
    ["phenanthridine", "phenanthridino", "C1=CC=CC2=NC=C3C=CC=CC3=C12"],
    ["phenazine", "phenazino", "C1=CC=CC2=NC3=CC=CC=C3N=C12"], ["phenoxazine", "phenoxazino", "C1=CC=CC=2OC3=CC=CC=C3NC12"],
    ["phenothiazine", "phenothiazino", "C1=CC=CC=2SC3=CC=CC=C3NC12"], ["phenoxathiine", "phenoxathiino", "C1=CC=CC=2OC3=CC=CC=C3SC12"],
    ["thianthrene", "thianthreno", "C1=CC=CC=2SC3=CC=CC=C3SC12"], ["fluoranthene", "fluorantheno", "C1=CC=C2C=CC=C3C4=CC=CC=C4C1=C23"],
    ["acephenanthrylene", "acephenanthryleno", "C1=CC=C2C=CC3=CC4=CC=CC=C4C1=C23"], ["aceanthrylene", "aceanthryleno", "C1=CC2=CC=CC3=CC4=CC=CC=C4C1=C23"],
    ["triphenylene", "triphenyleno", "C1=CC=CC=2C3=CC=CC=C3C3=CC=CC=C3C12"],
    ["chrysene", "chryseno", "C1=CC=CC=2C3=CC=C4C=CC=CC4=C3C=CC12"], ["tetracene", "tetraceno", "C1=CC=CC2=CC3=CC4=CC=CC=C4C=C3C=C12"],
    ["tetraphene", "tetrapheno", "C1=CC=CC2=CC=C3C=C4C=CC=CC4=CC3=C12"], ["picene", "piceno", "C1=CC=CC2=CC=C3C4=CC=C5C=CC=CC5=C4C=CC3=C21"],
    ["pentaphene", "pentapheno", "C1=CC=CC2=CC3=CC=C4C=C5C=CC=CC5=CC4=C3C=C12"],
    ["pentacene", "pentaceno", "C1=CC=CC2=CC3=CC4=CC5=CC=CC=C5C=C4C=C3C=C12"], ["hexaphene", "hexapheno", "C1=CC=CC2=CC3=CC=C4C=C5C=C6C=CC=CC6=CC5=CC4=C3C=C12"],
    ["hexacene", "hexaceno", "C1=CC=CC2=CC3=CC4=CC5=CC6=CC=CC=C6C=C5C=C4C=C3C=C12"],
    ["trinaphthylene", "trinaphthyleno", "C1=CC=CC2=CC=3C4=CC5=CC=CC=C5C=C4C4=CC5=CC=CC=C5C=C4C3C=C12"],
    ["heptaphene", "heptapheno", "C1=CC=CC2=CC3=CC4=CC=C5C=C6C=C7C=CC=CC7=CC6=CC5=C4C=C3C=C12"], ["heptacene", "heptaceno", "C1=CC=CC2=CC3=CC4=CC5=CC6=CC7=CC=CC=C7C=C6C=C5C=C4C=C3C=C12"],
    ["tetraphenylene", "tetraphenyleno", "C1=CC=CC=2C3=CC=CC=C3C3=CC=CC=C3C3=CC=CC=C3C12"],
    ["pyrene", "pyreno", "1-2 2-3 3-3a 3a-4 4-5 5-5a 5a-6 6-7 7-8 8-8a 8a-9 9-10 10-10a 1-10a 10a-10b 3a-10b 10b-10c 5a-10c 8a-10c", ""],
    ["perylene", "peryleno", "1-2 2-3 3-3a 3a-4 4-5 5-6 6-6a 6a-6b 6b-7 7-8 8-9 9-9a 9a-10 10-11 11-12 12-12a 12a-12b 1-12b 3a-12c 6a-12c 12b-12c 6b-12d 9a-12d 12a-12d", ""],
    ["coronene", "coroneno", "1-2 2-2a 2a-3 3-4 4-4a 4a-5 5-6 6-6a 6a-7 7-8 8-8a 8a-9 9-10 10-10a 10a-11 11-12 12-12a 1-12a 2a-12b 12b-12c 4a-12c 12c-12d 6a-12d 12d-12e 8a-12e 12e-12f 10a-12f 12f-12g 12a-12g 12b-12g", ""],
    ["ovalene", "ovaleno", "1-2 2-2a 2a-3 3-4 4-4a 4a-5 5-6 6-6a 6a-7 7-7a 7a-8 8-9 9-9a 9a-10 10-11 11-11a 11a-12 12-13 13-13a 13a-14 14-14a 1-14a 14a-14b 14b-14c 2a-14c 14c-14d 4a-14d 14d-14e 6a-14e 14e-14f 14f-14g 7a-14g 14g-14h 9a-14h 14h-14i 11a-14i 14i-14j 13a-14j 14j-14k 14b-14k 14f-14k", ""],
    ["pyranthrene", "pyranthreno", "1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-5a 5a-6 6-7 7-7a 7a-8 8-8a 8a-9 9-10 10-11 11-12 12-12a 8a-12a 12a-12b 12b-13 13-13a 13a-14 14-15 15-15a 15a-16 16-16a 1-16a 4a-16a 4b-15b 15a-15b 15b-15c 13a-15c 15c-15d 5a-15d 15d-15e 7a-15e 12b-15e", ""],
    ["rubicene", "rubiceno", "1-2 2-3 3-3a 3a-3b 3b-4 4-5 5-6 6-7 7-7a 3b-7a 7a-7b 7b-7c 7c-8 8-9 9-10 10-10a 10a-10b 10b-11 11-12 12-13 13-14 14-14a 10b-14a 14a-14b 14b-14c 1-14c 3a-14d 7b-14d 14c-14d 7c-14e 10a-14e 14b-14e", ""],
    ["anthracene", "anthra", ANTHRACENE, ""], ["acridine", "acridino", ANTHRACENE, "N10"], ["xanthene", "xantheno", ANTHRACENE, "O10"],
    ["thioxanthene", "thioxantheno", ANTHRACENE, "S10"],
    ["phenanthrene", "phenanthro", "1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-6 6-7 7-8 8-8a 8a-9 9-10 10-10a 10a-1 4a-10a 4b-8a", ""],
    ["carbazole", "carbazolo", "1-2 2-3 3-4 4-4a 4a-4b 4b-5 5-6 6-7 7-8 8-8a 8a-9 9-9a 9a-1 4a-9a 4b-8a", "N9"],
    ["purine", "purino", "1-2 2-3 3-4 4-5 5-6 6-1 5-7 7-8 8-9 9-4", "N1 N3 N7 N9"],
    ...["1,7", "1,8", "1,9", "1,10", "2,7", "2,8", "2,9", "3,7", "3,8", "4,7"].map((l) => [`${l}-phenanthroline`, `[${l}]phenanthrolino`, "1-2 2-3 3-4 4-4a 4a-5 5-6 6-6a 6a-7 7-8 8-9 9-10 10-10a 10a-10b 10b-1 4a-10b 6a-10a", l.split(",").map((x) => `N${x}`).join(" ")]),
    ["pleiadene", "pleiadeno", "1-2 2-3 3-3a 3a-4 4-5 5-6 6-6a 6a-7 7-7a 7a-8 8-9 9-10 10-11 11-11a 11a-12 12-12a 12a-1 7a-11a 3a-12b 6a-12b 12a-12b", ""],
    ["cyclopenta[a]phenanthrene", "", "1-2 2-3 3-4 4-5 5-6 6-7 7-8 8-14 14-15 15-16 16-17 17-13 13-12 12-11 11-9 9-10 10-1 5-10 8-9 13-14", ""],
];
const locOrder = (a, b) => parseInt(a) - parseInt(b) || (a < b ? -1 : a > b ? 1 : 0);
const locValue = (l) => parseInt(l) + (/[a-z]$/.test(l) ? (l.charCodeAt(l.length - 1) - 96) / 100 : 0);
let templates;
function retained() {
    if (templates)
        return templates;
    templates = RETAINED.map(([name, prefix, s, hetero]) => {
        let el, adj, labels, peri;
        if (hetero === undefined) {
            const g = skeleton(s), num = numberSystem(ringSystem(g.el, g.adj))[0], at = new Map(num.path.map((a, i) => [a, i]));
            el = num.path.map((a) => g.el[a]);
            adj = num.path.map((a) => g.adj[a].map((b) => at.get(b)));
            labels = num.labels;
            peri = num.path.slice(0, num.path.length - num.interior.length).map((_, i) => i);
        }
        else {
            const pairs = s.split(" ").map((b) => b.split("-"));
            labels = [...new Set(pairs.flat())].sort(locOrder);
            el = labels.map(() => "C");
            for (const h of hetero.split(" ").filter(Boolean))
                el[labels.indexOf(h.slice(1))] = h[0];
            adj = labels.map(() => []);
            for (const [a, b] of pairs) {
                adj[labels.indexOf(a)].push(labels.indexOf(b));
                adj[labels.indexOf(b)].push(labels.indexOf(a));
            }
            const sys = ringSystem(el, adj);
            const step = sys.next[1] === 0 ? (a) => sys.next.indexOf(a) : (a) => sys.next[a];
            peri = [0];
            while (peri.length < sys.next.filter((x) => x >= 0).length)
                peri.push(step(peri[peri.length - 1]));
        }
        const sys = ringSystem(el, adj);
        let row = 0;
        try {
            row = numberSystem(sys)[0].row;
        }
        catch { }
        return { name, prefix, el, adj, labels, peri, rings: sys.rings.length, sizes: sys.rings.map((r) => r.length).sort((a, b) => b - a), row, given: hetero !== undefined };
    });
    return templates;
}
const HW_ORDER = ["F", "Cl", "Br", "I", "O", "S", "Se", "Te", "N", "P", "As", "Sb", "Bi", "Si", "Ge", "Sn", "Pb", "B", "Hg"];
const HW_PREFIX = { F: "fluora", Cl: "chlora", Br: "broma", I: "ioda", O: "oxa", S: "thia", Se: "selena", Te: "tellura", N: "aza", P: "phospha", As: "arsa", Sb: "stiba",
    Bi: "bisma", Si: "sila", Ge: "germa", Sn: "stanna", Pb: "plumba", B: "bora", Hg: "mercura" };
const MULT = ["", "", "di", "tri", "tetra", "penta"];
const BIGMULT = ["", "", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa", "nona", "deca"];
const BIG = ["", "", "", "", "", "", "", "", "", "non", "dec", "undec", "dodec", "tridec", "tetradec", "pentadec", "hexadec", "heptadec", "octadec",
    "nonadec", "icos", "henicos", "docos", "tricos", "tetracos"];
const MONO = {
    "6:": ["benzene", "benzo"], "6:N1": ["pyridine", "pyrido"], "6:N1,N2": ["pyridazine", "pyridazino"], "6:N1,N3": ["pyrimidine", "pyrimido"],
    "6:N1,N4": ["pyrazine", "pyrazino"], "6:O1": ["pyran", "pyrano"], "6:S1": ["thiopyran", "thiopyrano"], "6:Se1": ["selenopyran", "selenopyrano"], "6:Te1": ["telluropyran", "telluropyrano"],
    "5:Se1": ["selenophene", "selenopheno"], "5:Te1": ["tellurophene", "telluropheno"], "5:N1": ["pyrrole", "pyrrolo"],
    "5:N1,N2": ["pyrazole", "pyrazolo"], "5:N1,N3": ["imidazole", "imidazo"], "5:O1": ["furan", "furo"], "5:S1": ["thiophene", "thieno"],
    "5:": ["", "cyclopenta"], "4:": ["", "cyclobuta"], "3:": ["", "cyclopropa"], "7:": ["[7]annulene", "cyclohepta"], "8:": ["[8]annulene", "cycloocta"],
};
function monocycle(els) {
    const n = els.length;
    let nums = [];
    for (let s = 0; s < n; s++)
        for (const d of [1, -1])
            nums.push(els.map((_, k) => (s + d * k + 2 * n) % n));
    const lowest = (f) => {
        let best;
        for (const num of nums) {
            const l = f(num);
            if (!best || cmp(l, best) < 0)
                best = l;
        }
        nums = nums.filter((num) => !cmp(f(num), best));
    };
    const top = HW_ORDER.find((e) => els.includes(e));
    if (top)
        nums = nums.filter((num) => els[num[0]] === top);
    lowest((num) => num.map((a, k) => (els[a] !== "C" ? k + 1 : 0)).filter(Boolean));
    for (const e of HW_ORDER)
        lowest((num) => num.map((a, k) => (els[a] === e ? k + 1 : 0)).filter(Boolean));
    const hetero = nums[0].flatMap((a, k) => (els[a] !== "C" ? [[els[a], k + 1]] : []))
        .sort((x, y) => HW_ORDER.indexOf(x[0]) - HW_ORDER.indexOf(y[0]) || x[1] - y[1]);
    if (hetero.some(([e]) => !HW_PREFIX[e]))
        return undefined;
    const known = MONO[`${n}:${hetero.map(([e, k]) => e + k).join(",")}`];
    if (known)
        return { name: known[0], prefix: known[1], stem: known[0], nums };
    const six = ["B", "P", "As", "Sb", "F", "Cl", "Br", "I"].includes(hetero[hetero.length - 1]?.[0]) ? "inine" : "ine";
    const stems = ["", "", "", hetero.some(([e]) => e === "N") ? "irine" : "irene", "ete", "ole", six, "epine", "ocine", "onine", "ecine"];
    if (!hetero.length)
        return BIG[n] ? { name: `[${n}]annulene`, prefix: `cyclo${BIG[n]}a`, stem: `[${n}]annulene`, nums } : undefined;
    if (!stems[n]) {
        if (!BIG[n])
            return undefined;
        const locs = `[${hetero.map(([, k]) => k).join(",")}]`;
        const stem = HW_ORDER.filter((e) => hetero.some(([x]) => x === e)).map((e) => BIGMULT[hetero.filter(([x]) => x === e).length] + HW_PREFIX[e]).join("") + `cyclo${BIG[n]}ine`;
        return { name: locs + stem, prefix: locs + stem.replace(/e$/, "o"), stem, nums };
    }
    const unique = hetero.length >= n - 1 && new Set(hetero.map(([e]) => e)).size === 1;
    const locs = hetero.length > 1 && !unique ? `[${hetero.map(([, k]) => k).join(",")}]` : "";
    const stem = (HW_ORDER.filter((e) => hetero.some(([x]) => x === e)).map((e) => MULT[hetero.filter(([x]) => x === e).length] + HW_PREFIX[e]).join("") + stems[n]).replace(/a(?=[aeiou])/g, "");
    return { name: locs + stem, prefix: locs + stem.replace(/e$/, "o"), stem, nums };
}
const FR23A = ["F", "Cl", "Br", "I", "O", "S", "Se", "Te", "P", "As", "Sb", "Bi", "Si", "Ge", "Sn", "Pb", "B", "Hg"];
const FR23F = ["F", "Cl", "Br", "I", "O", "S", "Se", "Te", "N", "P", "As", "Sb", "Bi", "Si", "Ge", "Sn", "Pb", "B", "Hg"];
function seniority(el, labels, sizes, fusion, row = sizes.length > 1 ? 2 : 1) {
    const hetero = el.map((e, i) => (e !== "C" ? i : -1)).filter((i) => i >= 0), has = (e) => hetero.some((i) => el[i] === e);
    const first = has("N") ? 0 : FR23A.findIndex(has) + 1 || 99;
    const locs = (f) => el.map((_, i) => i).filter(f).map((i) => locValue(labels[i])).sort((a, b) => a - b);
    return [first, -sizes.length, ...sizes.map((s) => -s), -hetero.length, -new Set(hetero.map((i) => el[i])).size, ...FR23F.map((e) => -hetero.filter((i) => el[i] === e).length), -row,
        ...locs((i) => el[i] !== "C"), ...FR23F.flatMap((e) => locs((i) => el[i] === e)), ...locs((i) => el[i] === "C" && fusion[i])];
}
function isomorphisms(tel, tadj, atoms, el, nb) {
    const order = [0];
    for (let k = 0; k < order.length; k++)
        for (const j of tadj[order[k]])
            if (!order.includes(j))
                order.push(j);
    const out = [], map = tel.map(() => -1), used = new Set();
    let steps = 0;
    const place = (k) => {
        if (++steps > 50000)
            throw new Error("ring match");
        if (k === order.length) {
            out.push([...map]);
            return;
        }
        const p = order[k], placed = tadj[p].filter((q) => map[q] >= 0);
        for (const a of placed.length ? nb(map[placed[0]]) : atoms) {
            if (used.has(a) || el(a) !== tel[p] || nb(a).length !== tadj[p].length || !placed.every((q) => nb(map[q]).includes(a)))
                continue;
            map[p] = a;
            used.add(a);
            place(k + 1);
            map[p] = -1;
            used.delete(a);
        }
    };
    place(0);
    return out;
}
function components(sys) {
    const { rings, across, el, adj } = sys;
    const monos = rings.map((r, i) => {
        const m = monocycle(r.map((a) => el[a]));
        if (!m)
            return undefined;
        const nums = m.nums.map((num) => num.map((k) => r[k])), labels = r.map((_, k) => String(k + 1));
        return { name: m.name, prefix: m.prefix, rings: [i], nums, labels, peri: labels.map((_, k) => k), carbo: !r.some((a) => el[a] !== "C"),
            key: seniority(nums[0].map((a) => el[a]), labels, [r.length], labels.map(() => false)) };
    });
    const polys = [], sets = new Map();
    const grow = (set) => {
        const k = [...set].sort((a, b) => a - b).join();
        if (sets.has(k) || set.length > 10)
            return;
        sets.set(k, set);
        for (const r of set)
            for (const s of across[r])
                if (s >= 0 && !set.includes(s))
                    grow([...set, s]);
    };
    rings.forEach((_, r) => grow([r]));
    for (const set of sets.values()) {
        if (set.length < 2)
            continue;
        const atoms = [...new Set(set.flatMap((r) => rings[r]))], inSet = new Set(atoms);
        const bonds = new Set(set.flatMap((r) => rings[r].map((a, k) => key(a, rings[r][(k + 1) % rings[r].length]))));
        const nb = (a) => adj[a].filter((b) => inSet.has(b) && bonds.has(key(a, b)));
        for (const t of retained()) {
            if (t.rings !== set.length || t.el.length !== atoms.length)
                continue;
            const nums = isomorphisms(t.el, t.adj, atoms, (a) => el[a], nb);
            if (nums.length && t.prefix)
                polys.push({ name: t.name, prefix: t.prefix, rings: set, nums, labels: t.labels, peri: t.peri, carbo: false, key: seniority(t.el, t.labels, t.sizes, t.adj.map((x) => x.length === 3), t.row) });
        }
    }
    const unit = (set) => {
        if (set.length !== 2 || polys.some((p) => p.rings.length === 2 && set.every((r) => p.rings.includes(r))))
            return undefined;
        const [b, h] = monos[set[0]]?.name === "benzene" ? set : [set[1], set[0]];
        const ring = rings[h], m = monocycle(ring.map((a) => el[a]));
        if (monos[b]?.name !== "benzene" || !m || !ring.some((a) => el[a] !== "C") || ring.length < 5 || !across[b].includes(h))
            return undefined;
        const atoms = [...new Set([...rings[b], ...ring])], at = new Map(atoms.map((a, i) => [a, i]));
        const local = ringSystem(atoms.map((a) => el[a]), atoms.map((a) => adj[a].filter((x) => at.has(x)).map((x) => at.get(x))));
        const num = numberSystem(local), nums = num.map((x) => x.path.map((i) => atoms[i])), labels = num[0].labels;
        const hetero = nums[0].flatMap((a, i) => (el[a] !== "C" ? [[el[a], labels[i]]] : []))
            .sort((x, y) => HW_ORDER.indexOf(x[0]) - HW_ORDER.indexOf(y[0]) || locOrder(x[1], y[1]));
        const locs = m.name === "imidazole" ? "" : `[${hetero.map((x) => x[1]).join(",")}]`;
        const benz = /^[aeiou]/.test(m.stem) ? "benz" : "benzo";
        return { name: locs + benz + m.stem, prefix: locs + benz + m.prefix.replace(/^\[[^\]]*\]/, ""), rings: set, nums, labels, peri: labels.map((_, i) => i), carbo: false,
            key: seniority(nums[0].map((a) => el[a]), labels, [ring.length, 6].sort((x, y) => y - x), nums[0].map((a) => local.adj[at.get(a)].length === 3)) };
    };
    return { monos, polys, unit };
}
function fusionName(sys, num) {
    const { rings, across, el } = sys;
    const { monos, polys, unit } = components(sys);
    if (rings.length === 2) {
        const u = unit([0, 1]);
        if (u) {
            const hetero = num.path.flatMap((a, i) => (el[a] !== "C" ? [[el[a], num.labels[i]]] : []))
                .sort((x, y) => HW_ORDER.indexOf(x[0]) - HW_ORDER.indexOf(y[0]) || locOrder(x[1], y[1]));
            const stem = u.name.replace(/^\[[^\]]*\]/, "");
            return stem === "benzimidazole" ? stem : `${hetero.map((x) => x[1]).join(",")}-${stem}`;
        }
    }
    const all = [...monos.filter((c) => !!c), ...polys];
    if (!all.length)
        throw new Error("fused ring component");
    const senior = all.reduce((m, c) => (cmp(c.key, m.key) < 0 ? c : m));
    const bases = all.filter((c) => !cmp(c.key, senior.key));
    if (new Set(bases.map((c) => c.name)).size > 1 || !senior.name)
        throw new Error("fused ring base component");
    const fusedTo = (x, y) => x.rings.some((r) => across[r].some((s) => y.rings.includes(s)));
    const multi = multiParent(sys, bases, all, fusedTo);
    if (multi)
        return multi;
    let best;
    for (const b of bases) {
        const rest = rings.map((_, r) => r).filter((r) => !b.rings.includes(r));
        for (const cover of covers(rest, all.filter((c) => c.prefix && c.rings.every((r) => rest.includes(r))))) {
            const tree = treeOf(b, cover, fusedTo);
            if (!tree)
                continue;
            const nodes = flat(tree), first = tree.kids.map((k) => k.c.key).sort(cmp);
            const rank = [Math.max(...nodes.map((x) => x.order)), -tree.kids.length, ...first.flatMap((k) => [...k, 999])];
            const final = benzoUnits(tree, unit, fusedTo);
            if (!final)
                continue;
            const named = describe(sys, final);
            if (!named)
                continue;
            const key = [...rank, -1e6, ...named.key];
            if (!best || cmp(key, best.rank) < 0)
                best = { rank: key, name: named.name };
        }
    }
    if (!best)
        throw new Error("fused ring components");
    return best.name;
}
function covers(rings, comps) {
    const out = [];
    const go = (left, chosen) => {
        if (out.length > 200)
            return;
        if (!left.length) {
            out.push(chosen);
            return;
        }
        for (const c of comps)
            if (c.rings.includes(left[0]) && c.rings.every((r) => left.includes(r)))
                go(left.filter((r) => !c.rings.includes(r)), [...chosen, c]);
    };
    go(rings, []);
    return out;
}
function treeOf(base, comps, fusedTo) {
    const all = [base, ...comps];
    let edges = 0;
    for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++)
            if (fusedTo(all[i], all[j]))
                edges++;
    if (edges !== all.length - 1)
        return undefined;
    const root = { c: base, kids: [], order: 0 }, placed = new Set([base]), queue = [root];
    while (queue.length) {
        const n = queue.shift();
        for (const c of comps)
            if (!placed.has(c) && fusedTo(n.c, c)) {
                const k = { c, kids: [], order: n.order + 1 };
                n.kids.push(k);
                placed.add(c);
                queue.push(k);
            }
    }
    return placed.size === all.length ? root : undefined;
}
const flat = (n) => [n, ...n.kids.flatMap(flat)];
function benzoUnits(tree, unit, fusedTo) {
    const comps = flat(tree).map((n) => n.c), parentOf = new Map();
    for (const n of flat(tree))
        for (const k of n.kids)
            parentOf.set(k.c, n.c);
    const hetero1 = (c) => !!c && c.rings.length === 1 && !c.carbo;
    let changed = false;
    for (const bz of comps.filter((c) => c.name === "benzene")) {
        const p = parentOf.get(bz), siblings = comps.filter((c) => c !== bz && c.name === "benzene" && parentOf.get(c) === p);
        if (siblings.length)
            continue;
        const kids = comps.filter((c) => parentOf.get(c) === bz && hetero1(c));
        const partner = hetero1(p) ? p : kids.length === 1 ? kids[0] : undefined;
        const u = partner && unit([partner.rings[0], bz.rings[0]]);
        if (!u || !comps.includes(partner))
            continue;
        comps.splice(comps.indexOf(bz), 1, u);
        comps.splice(comps.indexOf(partner), 1);
        changed = true;
    }
    if (!changed)
        return tree;
    const base = comps.reduce((m, c) => (cmp(c.key, m.key) < 0 ? c : m));
    if (comps.some((c) => c !== base && !cmp(c.key, base.key) && c.name !== base.name))
        return undefined;
    return treeOf(base, comps.filter((c) => c !== base), fusedTo);
}
const letter = (i) => String.fromCharCode(97 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : "");
const values = (l) => l.map(locValue);
const primes = (l, k) => l.map((x) => x + "'".repeat(k));
const contactOf = (sys, x, y) => x.rings.flatMap((r) => sys.rings[r].flatMap((a, k) => (y.rings.includes(sys.across[r][k]) ? [[a, sys.rings[r][(k + 1) % sys.rings[r].length]]] : [])));
function run(c, m, bonds) {
    const at = c.peri.map((i) => m[i]), P = at.length;
    const sides = bonds.map(([a, b]) => at.findIndex((x, i) => (x === a && at[(i + 1) % P] === b) || (x === b && at[(i + 1) % P] === a)));
    if (sides.some((s) => s < 0))
        return undefined;
    const start = sides.find((s) => !sides.includes((s + P - 1) % P));
    if (start === undefined)
        return undefined;
    const r = sides.map((_, i) => (start + i) % P);
    if (r.some((s) => !sides.includes(s)))
        return undefined;
    return { sides: r, atoms: [...r.map((s) => at[s]), at[(r[r.length - 1] + 1) % P]] };
}
function locsOf(c, m, atoms) {
    const idx = atoms.map((a) => m.indexOf(a));
    return idx.some((i) => i < 0) ? undefined : idx.filter((i, k) => k === 0 || k === idx.length - 1 || !/[a-z]$/.test(c.labels[i])).map((i) => c.labels[i]);
}
function multiParent(sys, bases, all, fusedTo) {
    if (bases.length < 2)
        return undefined;
    for (const mid of all) {
        if (!mid.prefix || mid.name === bases[0].name)
            continue;
        const parents = bases.filter((b) => !b.rings.some((r) => mid.rings.includes(r)) && fusedTo(b, mid));
        if (parents.length < 2 || parents.some((p, i) => parents.some((q, j) => i !== j && (p.rings.some((r) => q.rings.includes(r)) || fusedTo(p, q)))))
            continue;
        if (mid.rings.length + parents.reduce((t, p) => t + p.rings.length, 0) !== sys.rings.length)
            continue;
        let best;
        for (const m of mid.nums) {
            const parts = [];
            for (const p of parents) {
                let pick;
                for (const pm of p.nums) {
                    const r = run(p, pm, contactOf(sys, p, mid));
                    const locs = r && r.sides.length === 1 ? locsOf(mid, m, r.atoms) : undefined;
                    if (locs && (!pick || r.sides[0] < pick.letter || (r.sides[0] === pick.letter && cmp(values(locs), values(pick.locs)) < 0)))
                        pick = { letter: r.sides[0], locs };
                }
                if (!pick)
                    return undefined;
                parts.push(pick);
            }
            parts.sort((x, y) => cmp(values(x.locs).sort((a, b) => a - b), values(y.locs).sort((a, b) => a - b)));
            const key = [...parts.map((x) => x.letter).sort((a, b) => a - b), -1, ...parts.map((x) => x.letter), -1, ...parts.flatMap((x) => values(x.locs))];
            if (best && cmp(key, best.key) >= 0)
                continue;
            const base = bases[0].name, mult = /^\[\d+\]annulene|^[a-z]/.test(base) ? MULT[parts.length] : ["", "", "bis", "tris", "tetrakis"][parts.length];
            best = { key, name: `${mid.prefix}[${parts.map((x, i) => x.locs.join(",") + (bases[0].carbo ? "" : `-${letter(x.letter)}${"'".repeat(i)}`)).join(":")}]${mult}${inFusion(base)}` };
        }
        if (best)
            return best.name;
    }
    return undefined;
}
function describe(sys, root) {
    const contact = (x, y) => contactOf(sys, x, y);
    const branch = (n, atoms, cite) => {
        let best;
        for (const m of n.c.nums) {
            const own = n.c.carbo && !n.kids.length && n.order > 1 ? [] : locsOf(n.c, m, atoms);
            if (!own)
                return undefined;
            const kids = twigs(n, m);
            if (!kids)
                continue;
            const desc = n.order === 1 ? (own.length && !(n.c.carbo && !n.kids.length) ? `[${own.join(",")}-${cite}]` : `[${cite}]`)
                : n.c.carbo && !n.kids.length ? `[${cite}]` : `[${primes(own, n.order - 1).join(",")}:${cite}]`;
            const key = [[], [], []];
            key[n.order === 1 ? 0 : 2].push(...values(own).sort((a, b) => a - b), ...values(own));
            kids.key.forEach((l, i) => key[i].push(...l));
            const t = { text: kids.text + n.c.prefix + desc, key };
            if (!best || cmp(t.key.flat(), best.key.flat()) < 0)
                best = t;
        }
        return best;
    };
    const twigs = (n, m) => {
        const parts = [], lower = [];
        for (const k of n.kids) {
            const r = run(n.c, m, contact(n.c, k.c));
            if (!r)
                return undefined;
            let atoms = r.atoms, mine = locsOf(n.c, m, atoms);
            if (cmp(values([...mine].reverse()), values(mine)) < 0) {
                atoms = [...atoms].reverse();
                mine = [...mine].reverse();
            }
            const t = branch(k, atoms, primes(mine, n.order - 1).join(","));
            if (!t)
                return undefined;
            lower.push(...values(mine));
            parts.push(t);
        }
        if (new Set(n.kids.map((k) => k.c.prefix)).size < n.kids.length)
            return undefined;
        parts.sort((x, y) => alpha(x.text).localeCompare(alpha(y.text)) || x.text.localeCompare(y.text));
        const key = [[], [...lower].sort((a, b) => a - b).concat(lower), []];
        for (const p of parts)
            p.key.forEach((l, i) => key[i].push(...l));
        return { text: parts.map((p) => p.text).join(""), key };
    };
    const alpha = (t) => t.replace(/\[[^\]]*\]/g, "").replace(/^\(|\)/g, "").replace(/^(as|s)-/, "");
    const base = root.c;
    let best;
    for (const m of base.nums) {
        const firsts = [];
        for (const n of root.kids) {
            const r = run(base, m, contact(n.c, base));
            if (!r)
                return undefined;
            const letters = r.sides.map(letter).join("");
            const t = branch(n, r.atoms, letters);
            if (!t)
                return undefined;
            firsts.push({ n, letters, sides: r.sides, t, locs: [] });
        }
        firsts.sort((x, y) => alpha(x.t.text).localeCompare(alpha(y.t.text)) || cmp(x.sides, y.sides));
        const key = [...firsts.flatMap((f) => f.sides).sort((a, b) => a - b), -1, ...firsts.flatMap((f) => f.sides), -1,
            ...[0, 1, 2].flatMap((i) => [...firsts.flatMap((f) => f.t.key[i]), -1])];
        if (best && cmp(key, best.key) >= 0)
            continue;
        const bare = base.carbo && base.rings.length === 1 && firsts.length === 1 && !firsts[0].n.kids.length;
        let text = "";
        for (let i = 0; i < firsts.length;) {
            const f = firsts[i], group = firsts.filter((g) => !g.n.kids.length && !f.n.kids.length && g.n.c.prefix === f.n.c.prefix);
            if (group.length < 2) {
                text += bare ? f.n.c.prefix : f.t.text;
                i++;
                continue;
            }
            const list = group.map((g, k) => g.t.text.slice(g.n.c.prefix.length + 1, -1).replace(/^([^-]*)-/, (_, l) => primes(l.split(","), k).join(",") + "-"));
            const mult = /^(\[|di|tri)/.test(f.n.c.prefix) ? ["", "", "bis", "tris", "tetrakis"][group.length] : MULT[group.length];
            text += `${/s$/.test(mult) && !f.n.c.prefix.startsWith("[") ? `${mult}(${f.n.c.prefix})` : mult + f.n.c.prefix}[${list.join(group.some((g) => /-/.test(g.t.text)) ? ":" : ",")}]`;
            i += group.length;
        }
        best = { key, name: text + inFusion(base.name) };
    }
    return best;
}
const inFusion = (name) => name.replace(/^([\d,]+)-/, "[$1]");
const WHOLE = [
    ["porphyrin", "1-2 2-3 3-4 4-21 21-1 4-5 5-6 6-7 7-8 8-9 9-22 22-6 9-10 10-11 11-12 12-13 13-14 14-23 23-11 14-15 15-16 16-17 17-18 18-19 19-24 24-16 19-20 20-1", "N21 N22 N23 N24"],
    ["corrin", "1-2 2-3 3-4 4-21 21-1 4-5 5-6 6-7 7-8 8-9 9-22 22-6 9-10 10-11 11-12 12-13 13-14 14-23 23-11 14-15 15-16 16-17 17-18 18-19 19-24 24-16 19-1", "N21 N22 N23 N24", "1 2 3 7 8 12 13 17 18 19 24"],
    ["corrole", "1-2 2-3 3-4 4-21 21-1 4-5 5-6 6-7 7-8 8-9 9-22 22-6 9-10 10-11 11-12 12-13 13-14 14-23 23-11 14-15 15-16 16-17 17-18 18-19 19-24 24-16 19-1", "N21 N22 N23 N24", undefined, 3],
    ["phthalocyanine", "1-2 2-3 3-4 4-4a 4a-28a 28a-1 28-28a 4a-5 5-29 29-28 5-6 6-7 7-7a 7a-8 8-9 9-10 10-11 11-11a 11a-7a 11a-12 12-32 32-7 12-13 13-14 14-14a 14a-15 15-16 16-17 17-18 18-18a 18a-14a 18a-19 19-31 31-14 19-20 20-21 21-21a 21a-22 22-23 23-24 24-25 25-25a 25a-21a 25a-26 26-30 30-21 26-27 27-28",
        "N6 N13 N20 N27 N29 N30 N31 N32"],
];
function fusedParent(atoms, el, ring, order) {
    const at = new Map(atoms.map((a, i) => [a, i]));
    const lel = atoms.map(el), ladj = atoms.map((a) => ring(a).map((b) => at.get(b)));
    let p;
    try {
        p = whole(lel, ladj, order && ((a, b) => order(atoms[a], atoms[b]))) ?? ortho(lel, ladj);
    }
    catch (e) {
        if (!(e instanceof Error) || e.message !== "not ortho-fused" || !order)
            throw e;
        const ord = (a, b) => order(atoms[a], atoms[b]);
        p = ladj.some((x) => x.length === 4) ? (() => { try {
            return spiroParent(lel, ladj, ord);
        }
        catch (f) {
            if (f.message === "not ortho-fused")
                return bridgedFused(lel, ladj, ord);
            throw f;
        } })() : bridgedFused(lel, ladj, ord);
    }
    return { ...p, nums: p.nums.map((n) => n.map((i) => atoms[i])), fixed: p.fixed?.map((i) => atoms[i]) };
}
function whole(lel, ladj, order) {
    for (const [name, bonds, hetero, saturated, hydrogens = 2] of WHOLE) {
        const pairs = bonds.split(" ").map((b) => b.split("-")), labels = [...new Set(pairs.flat())].sort(locOrder);
        if (labels.length !== lel.length || (saturated && !order))
            continue;
        const tel = labels.map((l) => hetero.split(" ").find((h) => h.slice(1) === l)?.[0] ?? "C"), tadj = labels.map(() => []);
        for (const [a, b] of pairs) {
            tadj[labels.indexOf(a)].push(labels.indexOf(b));
            tadj[labels.indexOf(b)].push(labels.indexOf(a));
        }
        let nums = isomorphisms(tel, tadj, lel.map((_, i) => i), (i) => lel[i], (i) => ladj[i]);
        if (!saturated) {
            if (nums.length)
                return { name, labels, nums, uncited: [], hydrogens };
            continue;
        }
        const at = saturated.split(" ").map((l) => labels.indexOf(l)), fixed = (num) => at.map((k) => num[k]).sort((x, y) => x - y);
        nums = nums.filter((num) => at.every((k) => ladj[num[k]].every((b) => order(num[k], b) === 1)));
        if (!nums.length)
            continue;
        if (nums.some((num) => fixed(num).join() !== fixed(nums[0]).join()))
            throw new Error("corrin numbering");
        return { name, labels, nums, uncited: [], fixed: fixed(nums[0]) };
    }
    return undefined;
}
function ortho(lel, ladj) {
    const sys = ringSystem(lel, ladj);
    if (sys.rings.filter((r) => r.length >= 5).length < 2)
        throw new Error("small fused rings");
    const inner = (labels, n) => (n > 1 ? labels.map((_, i) => i).slice(labels.length - n) : []);
    for (const t of retained()) {
        if (t.el.length !== lel.length || t.rings !== sys.rings.length)
            continue;
        const nums = isomorphisms(t.el, t.adj, lel.map((_, i) => i), (i) => lel[i], (i) => ladj[i]);
        if (nums.length)
            return { name: t.name, labels: t.labels, nums, uncited: t.given ? [] : inner(t.labels, t.labels.length - t.peri.length) };
    }
    const num = numberSystem(sys);
    return { name: fusionName(sys, num[0]), labels: num[0].labels, nums: num.map((n) => n.path), uncited: inner(num[0].labels, num[0].interior.length) };
}
const BRIDGES = {
    "C=C": "etheno", "C=CC": "prop[1]eno", "C=CCC": "but[1]eno", "CC=CC": "but[2]eno", "C=CC=C": "buta[1,3]dieno",
    O: "epoxy", OO: "epidioxy", S: "epithio", SS: "epidithio", N: "epimino", "N=N": "diazeno",
    OC: "(epoxymethano)", NCC: "(epiminoethano)", CCNC: "(ethanoiminomethano)", CNCC: "[2]azabutano",
};
const ALKANO = ["", "methano", "ethano", "propano", "butano", "pentano", "hexano"];
function bridgedFused(el, adj, order) {
    const n = el.length, deg = adj.map((a) => a.length);
    const chains = [], seen = new Set();
    for (let u = 0; u < n; u++)
        if (deg[u] > 2)
            for (const first of adj[u]) {
                if (deg[first] !== 2)
                    continue;
                const inner = [];
                let prev = u, cur = first;
                while (deg[cur] === 2 && inner.length <= n) {
                    inner.push(cur);
                    const next = adj[cur].find((x) => x !== prev);
                    prev = cur;
                    cur = next;
                }
                const k = [...inner].sort((a, b) => a - b).join();
                if (cur === u || seen.has(k))
                    continue;
                seen.add(k);
                chains.push({ ends: [u, cur], inner });
            }
    if (chains.length > 24)
        throw new Error("bridged fused ring");
    let best;
    const subsets = (from, m) => (!m ? [[]] : chains.slice(from).flatMap((_, i) => subsets(from + i + 1, m - 1).map((r) => [from + i, ...r])));
    for (let m = 1; m <= 3 && !best; m++)
        for (const set of subsets(0, m)) {
            const gone = new Set(set.flatMap((c) => chains[c].inner)), keep = [...Array(n).keys()].filter((a) => !gone.has(a));
            const at = new Map(keep.map((a, i) => [a, i]));
            const fel = keep.map((a) => el[a]), fadj = keep.map((a) => adj[a].filter((b) => at.has(b)).map((b) => at.get(b)));
            if (fadj.some((x) => x.length < 2))
                continue;
            let f;
            try {
                f = whole(fel, fadj) ?? ortho(fel, fadj);
            }
            catch {
                continue;
            }
            const bridges = [];
            for (const c of set.map((i) => chains[i])) {
                const [u, v] = c.ends, path = [u, ...c.inner, v];
                if (order(u, c.inner[0]) !== 1 || order(c.inner[c.inner.length - 1], v) !== 1) {
                    bridges.length = 0;
                    break;
                }
                const text = (p) => p.slice(1, -1).map((a, i) => (i && order(p[i], a) === 2 ? "=" : "") + el[a]).join("");
                const named = (t) => BRIDGES[t] ?? (/^C+$/.test(t) ? ALKANO[t.length] : undefined);
                const fwd = named(text(path)), back = named(text([...path].reverse())), sym = text(path) === text([...path].reverse());
                if (fwd)
                    bridges.push({ name: fwd, first: u, second: v, atoms: c.inner, sym });
                else if (back)
                    bridges.push({ name: back, first: v, second: u, atoms: [...c.inner].reverse(), sym });
                else {
                    bridges.length = 0;
                    break;
                }
            }
            if (!bridges.length || bridges.some((b) => f.nums.some((num) => [b.first, b.second].some((a) => f.uncited.includes(num.indexOf(at.get(a)))))))
                continue;
            const value = (num, a) => locValue(f.labels[num.indexOf(at.get(a))]);
            const heads = (num) => bridges.flatMap((b) => [value(num, b.first), value(num, b.second)]).sort((x, y) => x - y);
            const low = f.nums.reduce((m, num) => (cmp(heads(num), m) < 0 ? heads(num) : m), heads(f.nums[0]));
            const nums = f.nums.filter((num) => !cmp(heads(num), low));
            const sizes = ringSystem(fel, fadj).rings.map((r) => r.length).sort((x, y) => y - x);
            const keyOf = seniority(f.nums[0].map((i) => fel[i]), f.labels, sizes, f.nums[0].map((i) => fadj[i].length === 3));
            const score = [-keep.length, keep.filter((a) => el[a] !== "C").length, ...keyOf, bridges.filter((b) => /^\(/.test(b.name)).length, ...low];
            if (best && cmp(score, best.score) >= 0)
                continue;
            const top = Math.max(...f.labels.filter((l) => /^\d+$/.test(l)).map(Number));
            const all = nums.map((num) => {
                const lab = (a) => f.labels[num.indexOf(at.get(a))];
                const flip = (b) => ({ ...b, first: b.second, second: b.first, atoms: [...b.atoms].reverse() });
                const alpha = (t) => t.replace(/[()[\]\d,]/g, "");
                const cited = bridges.map((b) => (!b.sym || locValue(lab(b.first)) <= locValue(lab(b.second)) ? b : flip(b)))
                    .sort((x, y) => alpha(x.name).localeCompare(alpha(y.name)) || locValue(lab(x.first)) - locValue(lab(y.first)));
                const high = (b) => Math.max(parseInt(lab(b.first)), parseInt(lab(b.second)));
                let next = top;
                const extra = [], labels = [];
                for (const b of [...cited].sort((x, y) => high(y) - high(x))) {
                    for (const a of parseInt(lab(b.first)) <= parseInt(lab(b.second)) ? [...b.atoms].reverse() : b.atoms) {
                        extra.push(a);
                        labels.push(String(++next));
                    }
                }
                const groups = new Map();
                for (const b of cited)
                    groups.set(b.name, [...(groups.get(b.name) ?? []), `${lab(b.first)},${lab(b.second)}`]);
                const text = [...groups].map(([name, locs]) => `${locs.join(":")}-${locs.length > 1 ? (/^[([]/.test(name) ? ["", "", "bis", "tris"][locs.length] : MULT[locs.length]) : ""}${name}`).join("-");
                return { order: [...num.map((i) => keep[i]), ...extra], labels: [...f.labels, ...labels], text, key: cited.flatMap((b) => [locValue(lab(b.first)), locValue(lab(b.second))]) };
            });
            const lowest = all.reduce((m, x) => (cmp(x.key, m) < 0 ? x.key : m), all[0].key), full = all.filter((x) => !cmp(x.key, lowest));
            if (full.some((x) => x.text !== full[0].text))
                continue;
            best = { score, parent: { name: f.name, labels: full[0].labels, nums: full.map((x) => x.order), uncited: f.uncited, hydrogens: f.hydrogens, bridges: full[0].text, fixed: [...gone] } };
        }
    if (!best)
        throw new Error("not ortho-fused");
    return best.parent;
}
const ALKANE = ["", "", "", "prop", "but", "pent", "hex", "hept", "oct", "non", "dec", "undec", "dodec"];
const SATURATED = { "5:N1": "pyrrolidine", "5:N1,N2": "pyrazolidine", "5:N1,N3": "imidazolidine", "6:N1": "piperidine",
    "6:N1,N4": "piperazine", "6:O1,N4": "morpholine" };
function saturatedRing(els) {
    const n = els.length;
    if (!els.some((e) => e !== "C")) {
        const nums = [];
        for (let s = 0; s < n; s++)
            for (const d of [1, -1])
                nums.push(els.map((_, k) => (s + d * k + 2 * n) % n));
        return ALKANE[n] ? { name: `cyclo${ALKANE[n]}ane`, nums } : undefined;
    }
    const m = monocycle(els);
    if (!m)
        return undefined;
    const hetero = m.nums[0].flatMap((a, k) => (els[a] !== "C" ? [[els[a], k + 1]] : []))
        .sort((x, y) => HW_ORDER.indexOf(x[0]) - HW_ORDER.indexOf(y[0]) || x[1] - y[1]);
    const known = SATURATED[`${n}:${hetero.map(([e, k]) => e + k).join(",")}`];
    if (known)
        return { name: known, nums: m.nums };
    const N = hetero.some(([e]) => e === "N");
    const six = ["O", "S", "Se", "Te", "Bi", "Hg"].includes(hetero[hetero.length - 1][0]) ? "ane" : "inane";
    const stems = ["", "", "", N ? "iridine" : "irane", N ? "etidine" : "etane", N ? "olidine" : "olane", six, "epane", "ocane", "onane", "ecane"];
    if (!stems[n])
        return undefined;
    const stem = (HW_ORDER.filter((e) => hetero.some(([x]) => x === e)).map((e) => MULT[hetero.filter(([x]) => x === e).length] + HW_PREFIX[e]).join("") + stems[n]).replace(/a(?=[aeiou])/g, "");
    const unique = hetero.length >= n - 1 && new Set(hetero.map(([e]) => e)).size === 1;
    return { name: (hetero.length > 1 && !unique ? `${hetero.map(([, k]) => k).join(",")}-` : "") + stem, nums: m.nums };
}
function spiroParent(el, adj, order) {
    const n = el.length;
    const parts = (s) => {
        const out = [];
        for (const start of adj[s]) {
            if (out.some((c) => c.includes(start)))
                continue;
            const c = [start];
            for (let i = 0; i < c.length; i++)
                for (const b of adj[c[i]])
                    if (b !== s && !c.includes(b))
                        c.push(b);
            out.push(c);
        }
        return out;
    };
    const spiro = [...Array(n).keys()].filter((a) => adj[a].length === 4 && parts(a).length === 2);
    if (spiro.length !== 1)
        throw new Error("not ortho-fused");
    const s = spiro[0];
    const comps = parts(s).map((c) => {
        const atoms = [s, ...c], at = new Map(atoms.map((a, i) => [a, i]));
        const cel = atoms.map((a) => el[a]), cadj = atoms.map((a) => adj[a].filter((b) => at.has(b)).map((b) => at.get(b)));
        const bonds = cadj.reduce((t, x) => t + x.length, 0) / 2;
        let name, labels, nums, uncited = [], mono = false;
        if (bonds === atoms.length) {
            const cycle = [0];
            while (cycle.length < atoms.length)
                cycle.push(cadj[cycle[cycle.length - 1]].find((b) => !cycle.includes(b)));
            const double = (x, y) => order(atoms[x], atoms[y]) === 2;
            labels = cycle.map((_, i) => String(i + 1));
            mono = true;
            if (cycle.some((a, i) => double(a, cycle[(i + 1) % cycle.length]))) {
                if (cel.some((e) => e !== "C") || !ALKANE[cycle.length])
                    throw new Error("spiro ring double bond");
                const k = cycle.length, runs = [cycle, [cycle[0], ...cycle.slice(1).reverse()]];
                const enes = (r) => r.flatMap((a, i) => (double(a, r[(i + 1) % k]) ? [i + 1] : []));
                const lowest = runs.reduce((m, r) => (cmp(enes(r), m) < 0 ? enes(r) : m), enes(runs[0]));
                nums = runs.filter((r) => !cmp(enes(r), lowest)).map((r) => r.map((a) => atoms[a]));
                name = `cyclo${ALKANE[k]}${lowest.length > 1 ? "a" : ""}-${lowest.join(",")}-${MULT[lowest.length]}ene`;
            }
            else {
                const r = saturatedRing(cycle.map((a) => cel[a]));
                if (!r)
                    throw new Error("spiro component");
                name = r.name;
                nums = r.nums.map((num) => num.map((k) => atoms[cycle[k]]));
            }
        }
        else {
            const f = whole(cel, cadj) ?? ortho(cel, cadj);
            name = f.name;
            labels = f.labels;
            nums = f.nums.map((num) => num.map((i) => atoms[i]));
            uncited = f.uncited.map((i) => f.labels[i]);
        }
        const low = Math.min(...nums.map((num) => num.indexOf(s)));
        return { name, labels, nums: nums.filter((num) => num.indexOf(s) === low), uncited, mono, atoms };
    });
    if (comps.every((c) => c.mono))
        throw new Error("not ortho-fused");
    const alpha = (t) => t.replace(/^[\d,]+-|\[[^\]]*\]/g, "").replace(/^\d+[a-z]?H-/, "");
    comps.sort((x, y) => alpha(x.name).localeCompare(alpha(y.name)) || x.name.localeCompare(y.name));
    const [A, B] = comps, same = A.name === B.name, spot = (c) => c.labels[c.nums[0].indexOf(s)];
    const name = same ? `${spot(A)},${spot(A)}'-spirobi[${A.name}]` : `spiro[${A.name}-${spot(A)},${spot(B)}'-${B.name}]`;
    const value = (l) => [locValue(l), (l.match(/'/g) ?? []).length];
    const all = [];
    for (const [P, Q] of same ? [[A, B], [B, A]] : [[A, B]])
        for (const mp of P.nums)
            for (const mq of Q.nums) {
                const entries = [...mp.map((a, i) => [a, P.labels[i]]), ...mq.flatMap((a, i) => (a === s ? [] : [[a, Q.labels[i] + "'"]]))];
                entries.sort((x, y) => cmp(value(x[1]), value(y[1])));
                all.push({ atoms: entries.map((e) => e[0]), labels: entries.map((e) => e[1]) });
            }
    const labels = all[0].labels;
    if (all.some((x) => x.labels.join() !== labels.join()))
        throw new Error("spiro numbering");
    const uncited = labels.map((l, i) => (A.uncited.includes(l) || B.uncited.map((u) => u + "'").includes(l) ? i : -1)).filter((i) => i >= 0);
    return { name, labels, nums: all.map((x) => x.atoms), uncited, fixed: [s, ...comps.filter((c) => c.mono).flatMap((c) => c.atoms)] };
}

  };
  defs["vonbaeyer.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vonBaeyer = vonBaeyer;
const SUP = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (n) => [...String(n)].map((d) => SUP[Number(d)]).join("");
const MULT = ["", "", "bi", "tri", "tetra", "penta", "hexa", "hepta", "octa", "nona", "deca", "undeca", "dodeca"];
function cmp(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++)
        if (a[i] !== b[i])
            return a[i] - b[i];
    return a.length - b.length;
}
function vonBaeyer(atoms, ring) {
    const n = atoms.length, at = new Map(atoms.map((a, i) => [a, i]));
    const adj = atoms.map((a) => ring(a).map((b) => at.get(b)));
    const edges = [], index = new Map();
    const key = (i, j) => (i < j ? i * 4096 + j : j * 4096 + i);
    for (let i = 0; i < n; i++)
        for (const j of adj[i])
            if (i < j) {
                index.set(key(i, j), edges.length);
                edges.push([i, j]);
            }
    const rings = edges.length - n + 1;
    if (rings < 3 || rings >= MULT.length || n > 60)
        throw new Error("von Baeyer size");
    const parent = Array(n).fill(-1), depth = Array(n).fill(-1), queue = [0];
    depth[0] = 0;
    for (let k = 0; k < queue.length; k++)
        for (const j of adj[queue[k]])
            if (depth[j] < 0) {
                depth[j] = depth[queue[k]] + 1;
                parent[j] = queue[k];
                queue.push(j);
            }
    if (queue.length !== n)
        throw new Error("von Baeyer size");
    const basis = [];
    edges.forEach(([i, j], e) => {
        if (parent[i] === j || parent[j] === i)
            return;
        let m = 1n << BigInt(e), a = i, b = j;
        while (a !== b) {
            if (depth[a] < depth[b])
                [a, b] = [b, a];
            m ^= 1n << BigInt(index.get(key(a, parent[a])));
            a = parent[a];
        }
        basis.push(m);
    });
    let longest = [], best = 0;
    for (let s = 1, m = 0n; s < 1 << rings; s++) {
        m ^= basis[Math.log2(s & -s)];
        const es = edges.filter((_, e) => (m >> BigInt(e)) & 1n);
        if (es.length < best)
            continue;
        const nb = new Map();
        for (const [i, j] of es) {
            nb.set(i, [...(nb.get(i) ?? []), j]);
            nb.set(j, [...(nb.get(j) ?? []), i]);
        }
        if ([...nb.values()].some((l) => l.length !== 2))
            continue;
        const cycle = [es[0][0]];
        for (let prev = -1, cur = es[0][0];;) {
            const next = nb.get(cur).find((x) => x !== prev);
            if (next === cycle[0])
                break;
            cycle.push(next);
            prev = cur;
            cur = next;
        }
        if (cycle.length !== es.length)
            continue;
        if (es.length > best) {
            best = es.length;
            longest = [];
        }
        longest.push(cycle);
    }
    let picks = [], score = [-1, -1];
    let steps = 0;
    for (const cycle of longest) {
        const pos = new Map(cycle.map((a, k) => [a, k])), L = cycle.length;
        const inCycle = (i, j) => pos.has(i) && pos.has(j) && ((pos.get(i) - pos.get(j) + L) % L === 1 || (pos.get(j) - pos.get(i) + L) % L === 1);
        const walk = (path) => {
            if (++steps > 100000)
                throw new Error("von Baeyer size");
            const last = path[path.length - 1];
            for (const y of adj[last]) {
                if (path.includes(y) && y !== path[0])
                    continue;
                if (path.length === 1 && inCycle(last, y))
                    continue;
                if (pos.has(y)) {
                    if (y === path[0] || (path.length === 1 && y < last))
                        continue;
                    const p = [...path, y], arc = (pos.get(y) - pos.get(path[0]) + L) % L - 1, s = [p.length - 2, Math.min(arc, L - 2 - arc)];
                    const c = cmp(s, score);
                    if (c > 0) {
                        score = s;
                        picks = [];
                    }
                    if (c >= 0)
                        picks.push({ cycle, path: p });
                }
                else
                    walk([...path, y]);
            }
        };
        for (const u of cycle)
            walk([u]);
    }
    const cands = [];
    for (const { cycle, path } of picks) {
        const L = cycle.length, [u, v] = [path[0], path[path.length - 1]], inner = path.slice(1, -1);
        const built = new Set([...cycle, ...inner]), used = new Set();
        for (let k = 0; k < L; k++)
            used.add(key(cycle[k], cycle[(k + 1) % L]));
        for (let k = 1; k < path.length; k++)
            used.add(key(path[k - 1], path[k]));
        const bridges = [];
        for (const [i, j] of edges)
            if (!used.has(key(i, j)) && built.has(i) && built.has(j))
                bridges.push({ ends: [i, j], inner: [] });
        const seen = new Set();
        for (let s = 0; s < n; s++) {
            if (built.has(s) || seen.has(s))
                continue;
            if (adj[s].length !== 2)
                throw new Error("von Baeyer dependent bridge");
            const chain = [s];
            seen.add(s);
            const ends = [];
            for (const dir of adj[s]) {
                const part = [];
                let prev = s, cur = dir;
                while (!built.has(cur)) {
                    if (adj[cur].length !== 2 || seen.has(cur))
                        throw new Error("von Baeyer dependent bridge");
                    seen.add(cur);
                    part.push(cur);
                    const next = adj[cur].find((x) => x !== prev);
                    prev = cur;
                    cur = next;
                }
                ends.push(cur);
                if (ends.length === 1)
                    chain.unshift(...part.reverse());
                else
                    chain.push(...part);
            }
            if (ends[0] === ends[1])
                throw new Error("von Baeyer spiro");
            bridges.push({ ends: [ends[0], ends[1]], inner: chain });
        }
        if (bridges.length !== rings - 2)
            throw new Error("von Baeyer bridges");
        const arcs = (h) => {
            const k = cycle.indexOf(h), fwd = [], back = [];
            for (let i = 1; cycle[(k + i) % L] !== (h === u ? v : u); i++)
                fwd.push(cycle[(k + i) % L]);
            for (let i = 1; cycle[(k - i + L) % L] !== (h === u ? v : u); i++)
                back.push(cycle[(k - i + L) % L]);
            return [fwd, back];
        };
        for (const h1 of [u, v]) {
            const h2 = h1 === u ? v : u, [p, q] = arcs(h1), bridge = h1 === u ? inner : [...inner].reverse();
            for (const [long, short] of [[p, q], [q, p]]) {
                if (long.length < short.length)
                    continue;
                const order = [h1, ...long, h2, ...[...short].reverse(), ...bridge];
                const loc = (a) => order.indexOf(a) + 1;
                const sec = bridges.map((b) => {
                    const [x, y] = b.ends.map(loc), [lo, hi] = x < y ? [x, y] : [y, x];
                    return { lo, hi, len: b.inner.length, atoms: x < y ? [...b.inner].reverse() : b.inner };
                });
                const numbered = [...sec].sort((a, b) => b.hi - a.hi || b.lo - a.lo || b.len - a.len);
                const cited = [...sec].sort((a, b) => b.len - a.len || a.lo - b.lo || a.hi - b.hi);
                cands.push({
                    order: [...order, ...numbered.flatMap((b) => b.atoms)],
                    sups: sec.flatMap((b) => [b.lo, b.hi]).sort((a, b) => a - b),
                    cited: cited.flatMap((b) => [b.lo, b.hi]),
                    prefix: `${MULT[rings]}cyclo[${long.length}.${short.length}.${bridge.length}${cited.map((b) => `.${b.len}${sup(b.lo)},${sup(b.hi)}`).join("")}]`,
                });
            }
        }
    }
    const low = cands.reduce((m, c) => (cmp(c.sups, m.sups) < 0 || (!cmp(c.sups, m.sups) && cmp(c.cited, m.cited) < 0) ? c : m), cands[0]);
    const chosen = cands.filter((c) => !cmp(c.sups, low.sups) && !cmp(c.cited, low.cited));
    if (chosen.some((c) => c.prefix !== low.prefix))
        throw new Error("von Baeyer numbering");
    return { prefix: low.prefix, nums: chosen.map((c) => c.order.map((i) => atoms[i])) };
}

  };
  defs["metals.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMetal = exports.OCENES = exports.METAL_ANIONS = exports.MORE_CATIONS = exports.ELEMENTS = void 0;
exports.sandwichIons = sandwichIons;
exports.metalName = metalName;
exports.ELEMENTS = new Map(("H hydrogen He helium Li lithium Be beryllium B boron C carbon N nitrogen O oxygen F fluorine Ne neon Na sodium " +
    "Mg magnesium Al aluminium Si silicon P phosphorus S sulfur Cl chlorine Ar argon K potassium Ca calcium Sc scandium Ti titanium " +
    "V vanadium Cr chromium Mn manganese Fe iron Co cobalt Ni nickel Cu copper Zn zinc Ga gallium Ge germanium As arsenic Se selenium " +
    "Br bromine Kr krypton Rb rubidium Sr strontium Y yttrium Zr zirconium Nb niobium Mo molybdenum Tc technetium Ru ruthenium " +
    "Rh rhodium Pd palladium Ag silver Cd cadmium In indium Sn tin Sb antimony Te tellurium I iodine Xe xenon Cs caesium Ba barium " +
    "La lanthanum Ce cerium Pr praseodymium Nd neodymium Pm promethium Sm samarium Eu europium Gd gadolinium Tb terbium " +
    "Dy dysprosium Ho holmium Er erbium Tm thulium Yb ytterbium Lu lutetium Hf hafnium Ta tantalum W tungsten Re rhenium Os osmium " +
    "Ir iridium Pt platinum Au gold Hg mercury Tl thallium Pb lead Bi bismuth Po polonium At astatine Rn radon Fr francium Ra radium " +
    "Ac actinium Th thorium Pa protactinium U uranium Np neptunium Pu plutonium Am americium Cm curium Bk berkelium Cf californium " +
    "Es einsteinium Fm fermium Md mendelevium No nobelium Lr lawrencium Rf rutherfordium Db dubnium Sg seaborgium Bh bohrium " +
    "Hs hassium Mt meitnerium Ds darmstadtium Rg roentgenium Cn copernicium Nh nihonium Fl flerovium Mc moscovium Lv livermorium " +
    "Ts tennessine Og oganesson").split(" ").flatMap((w, k, a) => (k % 2 ? [] : [[w, a[k + 1]]])));
const METALS = new Set(("Li Na K Rb Cs Fr Be Mg Ca Sr Ba Ra Sc Ti V Cr Mn Fe Co Ni Cu Zn Y Zr Nb Mo Tc Ru Rh Pd Ag Cd Hf Ta W Re Os Ir Pt Au " +
    "Rf Db Sg Bh Hs Mt Ds Rg Cn La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr").split(" "));
exports.MORE_CATIONS = {
    Fr: ["francium", 1], Be: ["beryllium", 2], Ra: ["radium", 2], Cd: ["cadmium", 2], Al: ["aluminium", 3], Sc: ["scandium", 3], Y: ["yttrium", 3], La: ["lanthanum", 3],
};
exports.METAL_ANIONS = {
    "H2N-1": "amide", "CrO4-2": "chromate", "Cr2O7-2": "dichromate", "MnO4-2": "manganate", "O4Tc-1": "pertechnetate", "O4Re-1": "perrhenate",
};
exports.OCENES = {
    V: "vanadocene", Cr: "chromocene", Fe: "ferrocene", Co: "cobaltocene", Ni: "nickelocene", Ru: "ruthenocene", Os: "osmocene",
    Rh: "rhodocene", Ti: "titanocene", Zr: "zirconocene", Mo: "molybdocene", Nb: "niobocene",
};
const ACIDS = {
    "Cr1:4:2": "chromic acid", "Cr2:7:2": "dichromic acid", "Mn1:4:2": "manganic acid", "Mn1:4:1": "permanganic acid",
    "Tc1:4:2": "technetic acid", "Tc1:4:1": "pertechnetic acid", "Re1:4:2": "rhenic acid", "Re1:4:1": "perrhenic acid",
};
const HALO = { F: "fluoro", Cl: "chloro", Br: "bromo", I: "iodo" };
const MULT = ["", "", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa"];
const MULT_COMPLEX = ["", "", "bis", "tris", "tetrakis", "pentakis", "hexakis", "heptakis", "octakis"];
const VALENCE = { C: [4], N: [3], O: [2], S: [2, 4, 6], P: [3, 5], F: [1], Cl: [1], Br: [1], I: [1] };
const isMetal = (el) => METALS.has(el);
exports.isMetal = isMetal;
function sandwichIons(m) {
    const centres = m.atoms.flatMap((a, i) => (a.centre ? [i] : []));
    if (!centres.length)
        return undefined;
    const nbrs = (i) => m.bonds.flatMap((b) => (b.atoms[0] === i ? [b.atoms[1]] : b.atoms[1] === i ? [b.atoms[0]] : []));
    const bond = (a, b) => m.bonds.find((x) => (x.atoms[0] === a && x.atoms[1] === b) || (x.atoms[0] === b && x.atoms[1] === a));
    const metals = new Map();
    for (const c of centres) {
        const ns = nbrs(c), metal = ns[0];
        if (m.atoms[c].centre.variable || ns.length !== 1 || !exports.OCENES[m.atoms[metal].label] || m.atoms[metal].text)
            return undefined;
        metals.set(metal, [...(metals.get(metal) ?? []), c]);
    }
    const atoms = m.atoms.map((a) => ({ ...a })), types = new Map();
    for (const [metal, cs] of metals) {
        if (cs.length !== 2 || nbrs(metal).length !== 2 || m.atoms[metal].charge)
            return undefined;
        atoms[metal].charge = 2;
        for (const c of cs) {
            const ring = m.atoms[c].centre.atoms, cycle = [ring[0]];
            if (ring.length !== 5 || ring.some((i) => m.atoms[i]?.label !== "C" || m.atoms[i].charge || m.atoms[i].text))
                return undefined;
            while (cycle.length < 5) {
                const next = nbrs(cycle[cycle.length - 1]).find((j) => ring.includes(j) && !cycle.includes(j));
                if (next === undefined)
                    return undefined;
                cycle.push(next);
            }
            const bonds = cycle.map((a, k) => bond(a, cycle[(k + 1) % 5]));
            if (bonds.some((b) => !b || ![1, 2, 4].includes(b.type)))
                return undefined;
            let start = 0;
            if (bonds.some((b) => b.type !== 4)) {
                start = cycle.findIndex((_, k) => bonds[k].type === 1 && bonds[(k + 4) % 5].type === 1);
                if (start < 0 || bonds.filter((b) => b.type === 2).length !== 2)
                    return undefined;
            }
            atoms[cycle[start]].charge = -1;
            for (let k = 0; k < 5; k++)
                types.set(bonds[(start + k) % 5], k === 1 || k === 3 ? 2 : 1);
        }
    }
    const keep = atoms.map((a) => !a.centre), at = [];
    let n = 0;
    keep.forEach((k, i) => { if (k)
        at[i] = n++; });
    return {
        atoms: atoms.filter((_, i) => keep[i]),
        bonds: m.bonds.filter((b) => keep[b.atoms[0]] && keep[b.atoms[1]]).map((b) => (types.has(b)
            ? { atoms: [at[b.atoms[0]], at[b.atoms[1]]], type: types.get(b) }
            : { ...b, atoms: [at[b.atoms[0]], at[b.atoms[1]]] })),
    };
}
function metalName(g, parts, api) {
    if (!g.atoms.some((a) => (0, exports.isMetal)(a.el)) || g.atoms.length === 1 || (parts.length > 1 && parts.some((p) => p.length === 1 && !g.atoms[p[0]].charge)))
        return undefined;
    const s = new Shape(g);
    const text = metallocene(s, api) ?? (parts.length > 1 ? salt(g, parts, api) : molecule(s, api));
    if (text === undefined)
        return undefined;
    const cited = [...text.matchAll(/\(([^()]*)\)-/g)].flatMap((m) => m[1].split(",")).filter((t) => /^\d+[a-z]?'*[RSEZ]$/.test(t)).length;
    if (cited !== g.atoms.filter((a) => a.cip).length + g.bonds.filter((b) => b.cip).length)
        throw new Error("stereo not cited");
    return text;
}
class Shape {
    constructor(g) {
        this.bond = new Map();
        this.ord = (a, b) => this.bond.get(key(a, b)) ?? 0;
        this.valence = (i) => this.adj[i].reduce((t, j) => t + this.ord(i, j), 0) + this.g.atoms[i].h;
        this.g = g;
        this.adj = g.atoms.map(() => []);
        for (const b of g.bonds) {
            this.adj[b.a].push(b.b);
            this.adj[b.b].push(b.a);
            this.bond.set(key(b.a, b.b), b.order);
        }
    }
    reach(start, blocked) {
        const seen = new Set([start]), stack = [start];
        while (stack.length) {
            const i = stack.pop();
            for (const j of this.adj[i])
                if (!seen.has(j) && !blocked.has(j)) {
                    seen.add(j);
                    stack.push(j);
                }
        }
        return [...seen];
    }
    build(keep, extra = []) {
        const at = new Map(keep.map((i, k) => [i, k]));
        const atoms = keep.map((i) => ({ ...this.g.atoms[i] }));
        const bonds = this.g.bonds.filter((b) => at.has(b.a) && at.has(b.b)).map((b) => ({ ...b, a: at.get(b.a), b: at.get(b.b) }));
        const ids = extra.map((e) => { atoms.push({ el: e.el, charge: 0, h: e.h }); bonds.push({ a: atoms.length - 1, b: at.get(e.to), order: 1 }); return atoms.length - 1; });
        return { g: { atoms, bonds }, at, extra: ids };
    }
    inRing(i) {
        return this.adj[i].some((j, k) => this.adj[i].slice(k + 1).some((l) => this.reach(j, new Set([i])).includes(l)));
    }
}
const key = (a, b) => (a < b ? `${a} ${b}` : `${b} ${a}`);
const compare = (a, b) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] === undefined)
            return -1;
        if (b[i] === undefined)
            return 1;
        if (a[i] !== b[i])
            return a[i] - b[i];
    }
    return 0;
};
const locantsOf = (name) => (name.match(/\d+/g) ?? []).map(Number);
const first = (names) => names.sort((a, b) => compare(locantsOf(a), locantsOf(b)) || a.localeCompare(b))[0];
const SUFFIX = {
    acid: "carboxylic acid", aldehyde: "carbaldehyde", nitrile: "carbonitrile", amide: "carboxamide", sulfonic: "sulfonic acid",
    alcohol: "ol", thiol: "thiol", amine: "amine", ester: "carboxylate", halide: "carbonyl", sulfonylhalide: "sulfonyl",
};
const HALIDE = { F: "fluoride", Cl: "chloride", Br: "bromide", I: "iodide" };
function metallocene(s, api) {
    const { g, adj } = s;
    const ms = g.atoms.flatMap((a, i) => (exports.OCENES[a.el] && !adj[i].length ? [i] : []));
    if (ms.length !== 1)
        return undefined;
    const m = ms[0];
    if (g.atoms[m].charge !== 2 || g.atoms[m].h)
        return undefined;
    const rings = ringsOf(s);
    if (rings.length !== 2)
        return undefined;
    const unit = new Set([m, ...rings.flat()]);
    if (g.atoms.reduce((t, a, i) => t + (unit.has(i) ? 0 : a.charge), 0))
        return undefined;
    const subs = rings.flat().flatMap((r) => adj[r].filter((x) => !unit.has(x)).map((x) => ({ r, x, atoms: s.reach(x, unit) })));
    for (const sub of subs)
        if (sub.atoms.some((i) => adj[i].some((j) => unit.has(j) && (i !== sub.x || j !== sub.r))))
            throw new Error("ansa-metallocene");
    if (subs.reduce((t, sub) => t + sub.atoms.length, 0) + unit.size !== g.atoms.length)
        return undefined;
    if (subs.some((sub) => sub.atoms.some((i) => (0, exports.isMetal)(g.atoms[i].el))))
        throw new Error("several metals");
    const stem = exports.OCENES[g.atoms[m].el];
    const ide = rings.filter((r) => r.filter((a) => g.atoms[a].charge === -1).length === 2).length;
    if (ide)
        return ide === 1 && !subs.length ? `${stem.slice(0, -1)}ide` : undefined;
    if (!subs.length)
        return stem;
    const p0 = s.build(subs.flatMap((sub) => sub.atoms), subs.map((sub) => ({ el: "C", h: 3, to: sub.x })));
    const groups = api.groups(p0.g), kind = groups.kind;
    const back = new Map([...p0.at].map(([i, k]) => [k, i]));
    const prefixOf = subs.map((sub, k) => () => api.prefix(p0.g, p0.at.get(sub.x), p0.extra[k]));
    const onRing = subs.map((sub, k) => !!kind && !!SUFFIX[kind] && groups.sites.some((x) => back.get(x.atom) === sub.x && x.on.includes(p0.extra[k])));
    if (kind === "anhydride" && subs.some((sub) => groups.sites.some((x) => back.get(x.atom) === sub.x)))
        throw new Error("anhydride on a metallocene");
    const onM = onRing.filter(Boolean).length;
    const inSub = subs.map((sub) => groups.sites.filter((x) => sub.atoms.includes(back.get(x.atom))).length);
    const most = Math.max(...inSub);
    let parents = [];
    if (kind) {
        if (!onM || onM < most)
            parents = subs.map((_, k) => k).filter((k) => inSub[k] === most);
    }
    else {
        const has = (k, f) => subs[k].atoms.some(f);
        parents = subs.map((_, k) => k).filter((k) => has(k, (i) => g.atoms[i].el === "P"));
        if (!parents.length)
            parents = subs.map((_, k) => k).filter((k) => has(k, (i) => g.atoms[i].el !== "C" && s.inRing(i)));
        if (parents.length > 1 && !subs.some((_, k) => has(k, (i) => g.atoms[i].el === "P")))
            throw new Error("metallocene and heterocycles");
        if (!parents.length && subs.some((sub) => sub.atoms.some((i) => g.atoms[i].el === "C" && adj[i].filter((j) => sub.atoms.includes(j) && s.inRing(j)).length > 2)))
            throw new Error("metallocene and ring system");
    }
    const numberings = (fixed) => {
        const out = [];
        for (const [a, b] of [[0, 1], [1, 0]]) {
            if (fixed !== undefined && !rings[a].includes(fixed))
                continue;
            for (const na of turns(rings[a])) {
                if (fixed !== undefined && na[0] !== fixed)
                    continue;
                for (const nb of turns(rings[b])) {
                    const map = new Map();
                    na.forEach((at, k) => map.set(at, { v: 2 * (k + 1), label: String(k + 1) }));
                    nb.forEach((at, k) => map.set(at, { v: 2 * (k + 1) + 1, label: `${k + 1}'` }));
                    out.push(map);
                }
            }
        }
        return out;
    };
    const best = (nums, sites, prefixes) => {
        const order = [...new Set(prefixes.map((p) => p.name.text))].sort((a, b) => api.alphaKey(a).localeCompare(api.alphaKey(b)));
        const score = (n) => [sites, prefixes.map((p) => p.r), ...order.map((t) => prefixes.filter((p) => p.name.text === t).map((p) => p.r))]
            .map((l) => l.map((r) => n.get(r).v).sort((a, b) => a - b));
        const ranked = nums.map((n) => ({ n, sc: score(n) }));
        ranked.sort((x, y) => { for (let i = 0; i < x.sc.length; i++) {
            const c = compare(x.sc[i], y.sc[i]);
            if (c)
                return c;
        } return 0; });
        return ranked[0].n;
    };
    if (!parents.length) {
        const sites = subs.filter((_, k) => onRing[k]);
        const prefixes = subs.flatMap((sub, k) => (onRing[k] ? [] : [{ r: sub.r, name: prefixOf[k]() }]));
        const n = best(numberings(), sites.map((x) => x.r), prefixes);
        const nPrefixes = sites.flatMap((x) => {
            const nAtom = kind === "amine" ? x.x : kind === "amide" ? adj[x.x].find((j) => g.atoms[j].el === "N") : undefined;
            const loc = sites.length > 1 ? `N${n.get(x.r).label}` : "N";
            return nAtom === undefined ? [] : adj[nAtom].filter((y) => y !== x.r && y !== x.x).map((y) => ({ loc, name: api.prefix(p0.g, p0.at.get(y), p0.at.get(nAtom)) }));
        });
        const none = sites.length + prefixes.length === 1;
        const prefixText = api.assemblePrefixes([...prefixes.map((p) => ({ loc: n.get(p.r).label, name: p.name })), ...nPrefixes], none);
        if (!sites.length)
            return prefixText + stem;
        const locs = sites.map((x) => n.get(x.r)).sort((a, b) => a.v - b.v).map((x) => x.label);
        let word = SUFFIX[kind];
        if (sites.length > 1)
            word = MULT[sites.length] + word;
        const parent = /^[aeiouy]/.test(word) ? stem.slice(0, -1) : stem;
        const text = prefixText + (none ? parent + word : `${parent}-${locs.join(",")}-${word}`);
        if (kind === "halide" || kind === "sulfonylhalide") {
            const xs = new Set(sites.map((x) => g.atoms[adj[x.x].find((j) => HALIDE[g.atoms[j].el])].el));
            if (xs.size !== 1)
                throw new Error("mixed halides");
            return `${text} ${MULT[sites.length]}${HALIDE[[...xs][0]]}`;
        }
        if (kind !== "ester")
            return text;
        if (sites.length !== 1)
            throw new Error("several esters");
        const c = sites[0].x, o = adj[c].find((j) => g.atoms[j].el === "O" && s.ord(c, j) === 1), alkyl = adj[o].find((j) => j !== c);
        return `${api.prefix(p0.g, p0.at.get(alkyl), p0.at.get(o)).text} ${text}`;
    }
    const yl = stem.slice(0, -1) + "yl";
    return first(parents.map((k) => {
        const others = subs.flatMap((sub, j) => (j === k ? [] : [{ r: sub.r, name: prefixOf[j]() }]));
        const n = best(numberings(subs[k].r), [], others);
        const text = api.assemblePrefixes(others.map((p) => ({ loc: n.get(p.r).label, name: p.name })), false) + yl;
        const p1 = s.build(subs[k].atoms, [{ el: "C", h: 0, to: subs[k].x }]);
        const name = api.name(p1.g, new Map([[p1.extra[0], { text, compound: others.length > 0 }]]));
        if (!name)
            throw new Error("metallocene");
        return name;
    }));
}
function turns(ring) {
    const out = [];
    for (let s = 0; s < ring.length; s++)
        for (const d of [1, -1])
            out.push(ring.map((_, k) => ring[(s + d * k + ring.length * 2) % ring.length]));
    return out;
}
function ringsOf(s) {
    const size = 5;
    const { g, adj } = s, found = new Map();
    const carbon = (i) => g.atoms[i].el === "C" && (g.atoms[i].charge === 0 || g.atoms[i].charge === -1);
    for (let start = 0; start < g.atoms.length; start++) {
        if (g.atoms[start].el !== "C" || g.atoms[start].charge !== -1)
            continue;
        const walk = (path) => {
            const last = path[path.length - 1];
            if (path.length === size) {
                if (adj[last].includes(start))
                    found.set([...path].sort((a, b) => a - b).join(" "), [...path]);
                return;
            }
            for (const j of adj[last])
                if (carbon(j) && !path.includes(j))
                    walk([...path, j]);
        };
        walk([start]);
    }
    return [...found.values()].filter((ring) => {
        const bonds = ring.map((a, k) => s.ord(a, ring[(k + 1) % size]));
        if (bonds.filter((o) => o === 2).length !== 2 || bonds.some((o) => o > 2))
            return false;
        if (![1, 2].includes(ring.filter((a) => g.atoms[a].charge === -1).length))
            return false;
        return ring.every((a) => {
            const out = adj[a].filter((j) => !ring.includes(j));
            return out.length <= 1 && out.every((j) => s.ord(a, j) === 1) && s.valence(a) === (g.atoms[a].charge ? 3 : 4);
        });
    });
}
function salt(g, parts, api) {
    const charge = (p) => p.reduce((t, i) => t + g.atoms[i].charge, 0);
    const cations = parts.filter((p) => charge(p) > 0), anions = parts.filter((p) => charge(p) < 0);
    if (!cations.length || !anions.length || cations.length + anions.length !== parts.length || parts.reduce((t, p) => t + charge(p), 0))
        return undefined;
    if (cations.every((p) => p.length === 1 && !g.atoms[p[0]].h))
        return api.salt(g, parts);
    const s = new Shape(g);
    const cationName = (p) => {
        const q = charge(p), ms = p.filter((i) => (0, exports.isMetal)(g.atoms[i].el));
        if (ms.length !== 1 || g.atoms[ms[0]].charge !== q)
            return undefined;
        const part = s.build(p);
        return `${additive(new Shape(part.g), part.at.get(ms[0]), api)}(${q}+)`;
    };
    const names = cations.map(cationName), anionNames = anions.map((p) => api.anion(g, p));
    const same = (l) => !!l[0] && l.every((n) => n === l[0]);
    return same(names) && same(anionNames) ? `${names[0]} ${anionNames[0]}` : undefined;
}
function molecule(s, api) {
    const { g, adj } = s, metals = g.atoms.flatMap((a, i) => ((0, exports.isMetal)(a.el) ? [i] : []));
    const q = g.atoms.reduce((t, a) => t + a.charge, 0);
    if (metals.length === 1 && q > 0 && g.atoms[metals[0]].charge === q)
        return additive(s, metals[0], api) + `(${q}+)`;
    if (metals.some((m) => g.atoms[m].charge) || q)
        throw new Error("charged metal compound");
    const acid = oxoacid(s, metals);
    if (acid)
        return acid;
    const ionic = new Set(metals.filter((m) => !g.atoms[m].h && adj[m].length && adj[m].every((x) => s.ord(m, x) === 1 && ["F", "Cl", "Br", "I", "O", "N", "S"].includes(g.atoms[x].el)
        && !dative(s, x) && adj[x].filter((j) => (0, exports.isMetal)(g.atoms[j].el)).length === 1)));
    if (ionic.size) {
        const atoms = g.atoms.map((a) => ({ ...a })), bonds = g.bonds.filter((b) => !ionic.has(b.a) && !ionic.has(b.b));
        for (const b of g.bonds)
            if (!bonds.includes(b)) {
                const [m, x] = ionic.has(b.a) ? [b.a, b.b] : [b.b, b.a];
                atoms[m].charge++;
                atoms[x].charge--;
            }
        const ions = { atoms, bonds }, t = new Shape(ions), seen = new Set(), parts = [];
        for (let i = 0; i < atoms.length; i++)
            if (!seen.has(i)) {
                const p = t.reach(i, new Set());
                p.forEach((j) => seen.add(j));
                parts.push(p);
            }
        let name;
        try {
            name = salt(ions, parts, api);
        }
        catch {
            name = undefined;
        }
        if (name)
            return name;
    }
    if (metals.length > 1)
        throw new Error("several metal atoms");
    return additive(s, metals[0], api);
}
function dative(s, x) {
    const v = VALENCE[s.g.atoms[x].el];
    return !!v && !v.includes(s.valence(x));
}
function oxoacid(s, metals) {
    const { g, adj } = s, el = g.atoms[metals[0]].el;
    if (metals.some((m) => g.atoms[m].el !== el || g.atoms[m].h) || g.atoms.some((a, i) => !metals.includes(i) && a.el !== "O"))
        return undefined;
    const os = g.atoms.flatMap((a, i) => (a.el === "O" ? [i] : []));
    if (!os.every((o) => adj[o].every((j) => metals.includes(j)) && adj[o].length + g.atoms[o].h <= 2 && (g.atoms[o].h === 0 || adj[o].length === 1)))
        return undefined;
    return ACIDS[`${el}${metals.length}:${os.length}:${os.reduce((t, o) => t + g.atoms[o].h, 0)}`];
}
function additive(s, m, api) {
    const { g, adj } = s, ligands = [];
    for (let k = 0; k < g.atoms[m].h; k++)
        ligands.push({ text: "hydrido", compound: false });
    for (const x of adj[m]) {
        const atoms = s.reach(x, new Set([m])), a = g.atoms[x], o = s.ord(m, x);
        if (atoms.some((j) => j !== x && adj[m].includes(j)))
            throw new Error("chelate ring");
        if (o === 2 && a.el === "O" && adj[x].length === 1) {
            ligands.push({ text: "oxo", compound: false });
            continue;
        }
        const y = adj[x].find((j) => j !== m);
        if (o === 2 && a.el === "C" && !a.h && adj[x].length === 2 && g.atoms[y].el === "O" && s.ord(x, y) === 2 && adj[y].length === 1) {
            ligands.push({ text: "carbonyl", compound: false });
            continue;
        }
        if (o !== 1)
            throw new Error("metal multiple bond");
        if (HALO[a.el]) {
            if (adj[x].length !== 1)
                throw new Error("bridging halogen");
            ligands.push({ text: HALO[a.el], compound: false });
            continue;
        }
        if (dative(s, x))
            throw new Error("dative bond");
        const p = s.build(atoms, [{ el: "C", h: 3, to: x }]);
        ligands.push(api.prefix(p.g, p.at.get(x), p.extra[0]));
    }
    if (!ligands.length)
        throw new Error("metal");
    const counted = new Map();
    for (const l of ligands)
        counted.set(l.text, { name: l, n: (counted.get(l.text)?.n ?? 0) + 1 });
    const sorted = [...counted.values()].sort((a, b) => api.alphaKey(a.name.text).localeCompare(api.alphaKey(b.name.text)));
    const parts = sorted.map(({ name, n }, k) => {
        const t = n > 1 ? (name.compound ? MULT_COMPLEX[n] + api.enclose(name) : MULT[n] + name.text) : api.enclose(name);
        return k === 0 || /^[([{]|^(bis|tris|tetrakis|pentakis|hexakis|heptakis|octakis)[([{]/.test(t) ? t : api.enclose({ text: t, compound: true });
    });
    return parts.join("") + exports.ELEMENTS.get(g.atoms[m].el);
}

  };
  defs["namer-maingroup.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chalcogenStem = exports.NUCLIDE = void 0;
exports.azoxy = azoxy;
exports.azoxyName = azoxyName;
exports.azoxyPrefix = azoxyPrefix;
exports.inorganicSpecies = inorganicSpecies;
exports.chargeSeparated = chargeSeparated;
exports.isotopeText = isotopeText;
exports.isotopePrefix = isotopePrefix;
exports.isotopeSpecies = isotopeSpecies;
exports.citedNuclides = citedNuclides;
exports.chalcogenOne = chalcogenOne;
exports.checkChalcogenOnes = checkChalcogenOnes;
exports.chalcogenIonSuffix = chalcogenIonSuffix;
const namer_ts_1 = require("namer.ts");
function azoxy(n, i) {
    const at = (p) => {
        if (n.el[p] !== "N" || n.q[p] !== 1 || n.inRing[p] || n.adj[p].length + n.h[p] !== 3)
            return undefined;
        const o = n.adj[p].find((j) => n.el[j] === "O" && n.q[j] === -1 && n.adj[j].length === 1 && !n.h[j] && n.ord(p, j) === 1);
        const m = n.adj[p].find((j) => n.el[j] === "N" && n.ord(p, j) === 2 && !n.q[j] && !n.inRing[j] && n.adj[j].length + n.h[j] === 2);
        const carbon = (x, j) => n.el[j] === "C" && n.ord(x, j) === 1 && n.carbonylO[j] < 0 && !n.isNitrileC(j) && !n.q[j];
        if (o === undefined || m === undefined || !n.adj[p].every((j) => j === o || j === m || carbon(p, j)) || !n.adj[m].every((j) => j === p || carbon(m, j)))
            return undefined;
        return { p, m, o };
    };
    if (n.el[i] === "O")
        return n.adj[i].length === 1 ? at(n.adj[i][0]) : undefined;
    return n.el[i] !== "N" ? undefined : at(i) ?? (n.q[i] ? undefined : n.adj[i].map(at).find(Boolean));
}
const ez = (n, z) => { const e = n.cipBond.get(n.key(z.p, z.m)); return e === "E" || e === "Z" ? `(${e})-` : ""; };
function azoxyName(n) {
    const zs = [...n.het].filter(([a, r]) => r === "azoxy" && n.q[a] === 1).map(([a]) => azoxy(n, a));
    if (zs.length !== 1)
        throw new Error("azoxy");
    const z = zs[0], subs = (x) => n.adj[x].filter((j) => j !== z.p && j !== z.m && j !== z.o).map((j) => n.substituent(j, x));
    const options = [[z.p, z.m], [z.m, z.p]].map(([a, b]) => ({ list: [...subs(a).map((name) => ({ loc: "1", name })), ...subs(b).map((name) => ({ loc: "2", name }))], ox: a === z.p ? 1 : 2 }));
    const key = (o) => [...o.list.map((x) => x.loc).sort(), "|", ...[...o.list].sort((x, y) => (0, namer_ts_1.alphaKey)(x.name.text).localeCompare((0, namer_ts_1.alphaKey)(y.name.text))).map((x) => x.loc), "|", o.ox].join("");
    const best = options.sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0))[0];
    return `${ez(n, z)}${(0, namer_ts_1.assemblePrefixes)(best.list, false)}diazene ${best.ox}-oxide`;
}
function azoxyPrefix(n, x) {
    const z = azoxy(n, x), y = x === z.p ? z.m : z.p;
    const list = [...n.adj[y].filter((j) => j !== x && j !== z.o).map((j) => ({ loc: "2", name: n.substituent(j, y) })), { loc: x === z.p ? "1" : "2", name: { text: "oxido", compound: false } }];
    return { text: `${ez(n, z)}${(0, namer_ts_1.assemblePrefixes)(list, false)}diazen-${x === z.p ? 1 : 2}-ium-1-yl`, compound: true };
}
const SPECIES = [
    ["[H][H]", "dihydrogen"], ["N#N", "dinitrogen"], ["O=O", "dioxygen"], ["FF", "difluorine"],
    ["ClCl", "dichlorine"], ["BrBr", "dibromine"], ["II", "diiodine"], ["O=[O+][O-]", "ozone"],
    ["OO", "hydrogen peroxide"], ["N#[N+][O-]", "nitrous oxide"], ["[N-]=[N+]=O", "nitrous oxide"], ["N=[N+]=[N-]", "hydrogen azide"],
    ["O=C=O", "carbon dioxide"], ["S=C=S", "carbon disulfide"], ["O=S=O", "sulfur dioxide"], ["O=S(=O)=O", "sulfur trioxide"],
    ["O[N+](=O)[O-]", "nitric acid"], ["ON(=O)=O", "nitric acid"], ["ON=O", "nitrous acid"], ["O=[N+]=O", "nitronium"],
    ["N#[O+]", "nitrosonium"], ["[NH4+]", "ammonium"], ["[OH3+]", "oxidanium"], ["[PH4+]", "phosphanium"],
    ["[SH3+]", "sulfanium"], ["[NH2+]", "aminylium"], ["[OH+]", "hydroxylium"], ["[NH2-]", "azanide"],
    ["[H-]", "hydride"], ["F[H-]F", "bifluoride"], ["OF", "hypofluorous acid"], ["OI(=O)(=O)=O", "periodic acid"],
    ["OI(O)(O)(O)(O)=O", "orthoperiodic acid"], ["OCl", "hypochlorous acid"], ["OCl=O", "chlorous acid"], ["OCl(=O)=O", "chloric acid"],
    ["OCl(=O)(=O)=O", "perchloric acid"], ["OBr", "hypobromous acid"], ["OBr=O", "bromous acid"], ["OBr(=O)=O", "bromic acid"],
    ["OBr(=O)(=O)=O", "perbromic acid"], ["OI", "hypoiodous acid"], ["OI=O", "iodous acid"], ["OI(=O)=O", "iodic acid"],
    ["O[PH](=O)O", "phosphonic acid"], ["O[PH2]=O", "phosphinic acid"], ["ClP(Cl)(Cl)(Cl)Cl", "phosphorus pentachloride"], ["FS(F)(F)(F)(F)F", "sulfur hexafluoride"],
    ["ClN=O", "nitrosyl chloride"], ["ClC(Cl)=S", "carbonothioyl dichloride"], ["O=C=S", "carbonyl sulfide"], ["[C-]#[O+]", "carbon monoxide"],
    ["NC(=O)[O-]", "carbamate"], ["[O--]", "oxidanediide"], ["[S--]", "sulfanediide"], ["[Se--]", "selanediide"],
    ["[Te--]", "tellanediide"], ["[N---]", "azanetriide"], ["[O-][O-]", "dioxidanediide"],
    ["SS", "disulfane"], ["OF=O", "fluorous acid"], ["OF(=O)=O", "fluoric acid"], ["OF(=O)(=O)=O", "perfluoric acid"],
    ["NN=O", "nitrous amide"], ["NSO", "sulfenamic acid"], ["OP(=O)=O", "phosphenic acid"], ["NS(=O)O", "amidosulfurous acid"], ["OP(=O)(O)P(=O)(O)O", "hypodiphosphoric acid"], ["N=O", "azanone"],
    ["NF", "fluoramine"], ["NCl", "chloramine"], ["NBr", "bromamine"], ["FNF", "difluoramine"], ["ClNCl", "dichloramine"], ["BrNBr", "dibromamine"],
    ["FN(F)F", "nitrogen trifluoride"], ["ClN(Cl)Cl", "nitrogen trichloride"], ["OSO", "sulfoxylic acid"], ["OOS(=O)(=O)O", "peroxomonosulfuric acid"],
    ["OS(=O)(=O)S(=O)(=O)O", "dithionic acid"], ["OS(=O)(=O)SS(=O)(=O)O", "trithionic acid"], ["OS(=O)(=O)SSS(=O)(=O)O", "tetrathionic acid"], ["OS(=O)(=O)SSSS(=O)(=O)O", "pentathionic acid"],
    ["OS(=O)(=O)OS(=O)(=O)O", "disulfuric acid"], ["OS(=O)(=O)OS(=O)(=O)OS(=O)(=O)O", "trisulfuric acid"], ["FP(F)(F)(F)F", "phosphorus pentafluoride"],
    ["O[Se](=O)(=O)O[Se](=O)(=O)O", "diselenic acid"], ["O[Se](=O)(=O)O[Se](=O)(=O)O[Se](=O)(=O)O", "triselenic acid"], ["O[Se](=O)O[Se](=O)O", "diselenous acid"],
    ["O[Te](=O)(=O)O[Te](=O)(=O)O", "ditelluric acid"], ["O[Se](=O)(=O)[Se](=O)(=O)O", "hypodiselenic acid"], ["O[Te](=O)(=O)[Te](=O)(=O)O", "hypoditelluric acid"],
    ["O[Te](O)(O)(O)(O)O", "orthotelluric acid"], ["[O-][Te](=O)(=O)[O-]", "tellurate"], ["[O-][Te](=O)[O-]", "tellurite"], ["[Se]=[Se]", "diselene"],
    ["O[As](=O)=O", "arsenenic acid"], ["O[As](=O)(O)[As](=O)(O)O", "hypodiarsoric acid"], ["O[Sb](=O)(O)[Sb](=O)(O)O", "hypodistiboric acid"],
    ["O[PH](=O)O[PH](=O)O", "diphosphonic acid"], ["O[PH](=O)OP(=O)(O)O[PH](=O)O", "triphosphonic acid"], ["O[PH](=O)[PH](=O)O", "hypodiphosphonic acid"],
    ["O[PH](=O)OP(=O)(O)O", "isohypophosphoric acid"], ["[O-][PH](=O)OP(=O)([O-])[O-]", "isohypophosphate"],
    ["[NH2+](O)[O-]", "azinic acid"], ["[NH+](O)(O)[O-]", "azonic acid"], ["[N+](O)(O)(O)[O-]", "azoric acid"], ["[N+]([O-])([O-])([O-])[O-]", "orthonitrate"],
    ["[NH3+][O-]", "ammonia oxide"], ["[NH+]([O-])=O", "nitryl hydride"], ["N[N+](=O)[O-]", "nitramide"],
    ["[O-]F=O", "fluorite"], ["[O-]F(=O)=O", "fluorate"], ["[O-]F(=O)(=O)=O", "perfluorate"], ["[O-][Si]([O-])([O-])[O-]", "orthosilicate"],
    ["O[Xe](=O)(=O)(O)(O)O", "perxenic acid"], ["[O-][Xe](=O)(=O)([O-])([O-])[O-]", "perxenate"],
    ["[PH2-]", "phosphanide"], ["[AsH2-]", "arsanide"], ["[SbH2-]", "stibanide"], ["[SiH3-]", "silanide"], ["[GeH3-]", "germanide"], ["[SnH3-]", "stannanide"],
    ["[GaH4-]", "tetrahydrogallate"], ["[AsH5]", "λ⁵-arsane"], ["[SbH5]", "λ⁵-stibane"], ["[BH]=[BH]", "diborene"], ["[B]#[B]", "diboryne"],
    ["[SH2]=N", "λ⁴-sulfanimine"], ["[SeH2]=N", "λ⁴-selanimine"], ["[TeH2]=N", "λ⁴-tellanimine"],
    ["[SH2](=O)=N", "imino-λ⁶-sulfanone"], ["[SeH2](=O)=N", "imino-λ⁶-selanone"], ["[TeH2](=O)=N", "imino-λ⁶-tellanone"],
    ["[O-]OC(=O)[O-]", "peroxocarbonate"], ["[O-]C(=O)OOC(=O)[O-]", "peroxodicarbonate"], ["OSC#N", "hydroxysulfanecarbonitrile"], ["[O-]SC#N", "(cyanosulfanyl)oxidanide"],
    ["N#CN=[N+]=[N-]", "carbononitridic azide"], ["[NH+]#[C-]", "hydrogen isocyanide"], ["O[N+]#[C-]", "isocyanooxidane"], ["N[O-]", "aminooxidanide"],
];
function signature({ el, h, q, bonds }) {
    return el.map((e, i) => `${e}${h[i]}${q[i] || ""}[${bonds.filter((b) => b[0] === i || b[1] === i).map((b) => `${b[2]}${el[b[0] === i ? b[1] : b[0]]}`).sort().join(",")}]`).sort().join(" ");
}
function parse(s) {
    const shape = { el: [], h: [], q: [], bonds: [] }, stack = [], usual = { B: 3, C: 4, N: 3, O: 2, P: 3, S: 2, F: 1, Cl: 1, Br: 1, I: 1 };
    let prev = -1, order = 1;
    for (const t of s.match(/\[[^\]]+\]|Cl|Br|[BCNOPSFI]|[=#()]/g) ?? []) {
        if (t === "=" || t === "#") {
            order = t === "=" ? 2 : 3;
            continue;
        }
        if (t === "(") {
            stack.push(prev);
            continue;
        }
        if (t === ")") {
            prev = stack.pop();
            continue;
        }
        const m = /^\[([A-Z][a-z]?)(?:H(\d?))?([+-]*)\]$/.exec(t);
        shape.el.push(m ? m[1] : t);
        shape.q.push(m ? (m[3].includes("+") ? 1 : -1) * m[3].length : 0);
        shape.h.push(m ? (m[2] !== undefined ? Number(m[2] || 1) : 0) : -1);
        if (prev >= 0)
            shape.bonds.push([prev, shape.el.length - 1, order]);
        prev = shape.el.length - 1;
        order = 1;
    }
    shape.h = shape.h.map((h, i) => (h >= 0 ? h : Math.max(0, usual[shape.el[i]] - shape.bonds.reduce((t, b) => t + (b[0] === i || b[1] === i ? b[2] : 0), 0))));
    return shape;
}
let species;
const shapeOf = (g) => ({ el: g.atoms.map((a) => a.el), h: g.atoms.map((a) => a.h), q: g.atoms.map((a) => a.charge), bonds: g.bonds.map((b) => [b.a, b.b, b.order]) });
function inorganicSpecies(g) {
    if (g.atoms.length > 16 || g.bonds.length !== g.atoms.length - 1)
        return undefined;
    species ?? (species = new Map(SPECIES.map(([s, name]) => [signature(parse(s)), name])));
    const known = species.get(signature(shapeOf(g)));
    if (known)
        return known;
    const nbrs = (i) => g.bonds.flatMap((b) => (b.a === i ? [b.b] : b.b === i ? [b.a] : []));
    const halo = (i) => /^(F|Cl|Br|I)$/.test(g.atoms[i].el) && !g.atoms[i].charge && !g.atoms[i].h && nbrs(i).length === 1;
    const oxo = (c, i) => g.atoms[i].el === "O" && !g.atoms[i].charge && !g.atoms[i].h && g.bonds.some((b) => ((b.a === c && b.b === i) || (b.b === c && b.a === i)) && b.order === 2);
    const HALO = { F: "fluor", Cl: "chlor", Br: "brom", I: "iod" }, HALIDE = { F: "fluoride", Cl: "chloride", Br: "bromide", I: "iodide" };
    for (let c = 0; c < g.atoms.length; c++) {
        const a = g.atoms[c], ns = nbrs(c);
        if (ns.length !== g.atoms.length - 1)
            continue;
        const xs = ns.filter(halo), os = ns.filter((i) => oxo(c, i)), x = g.atoms[xs[0]]?.el;
        if (/^(B|Al|Ga)$/.test(a.el) && a.charge === -1 && !a.h && xs.length === 4 && xs.every((i) => g.atoms[i].el === x))
            return `tetra${HALO[x]}o${{ B: "bor", Al: "alumin", Ga: "gall" }[a.el]}ate`;
        if ((a.el === "Se" || a.el === "Te") && !a.charge && !a.h && xs.length === 2 && xs.length + os.length === ns.length && (os.length === 1 || os.length === 2) && g.atoms[xs[1]].el === x)
            return `${a.el === "Se" ? "selen" : "tellur"}${os.length === 1 ? "inyl" : "onyl"} di${HALIDE[x]}`;
    }
    return lambdaChain(g, nbrs);
}
function lambdaChain(g, nbrs) {
    const el = g.atoms[0].el, n = g.atoms.length, stem = { P: "phosph", As: "ars", Sb: "stib" }[el];
    if (!stem || n < 2 || n > 9 || g.atoms.some((a) => a.el !== el || a.charge))
        return undefined;
    const ends = g.atoms.flatMap((_, i) => (nbrs(i).length === 1 ? [i] : []));
    if (ends.length !== 2 || g.atoms.some((_, i) => nbrs(i).length > 2))
        return undefined;
    const order = (a, b) => g.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))?.order ?? 0;
    const path = [ends[0]];
    while (path.length < n)
        path.push(nbrs(path[path.length - 1]).find((j) => !path.includes(j)));
    const valence = (i) => nbrs(i).reduce((t, j) => t + order(i, j), 0) + g.atoms[i].h;
    if (path.some((i) => valence(i) !== 3 && valence(i) !== 5))
        return undefined;
    const multiple = (p, o) => p.slice(1).flatMap((a, k) => (order(p[k], a) === o || (!o && order(p[k], a) > 1) ? [k + 1] : []));
    const key = (p) => [...multiple(p, 0), 0, ...p.flatMap((a, k) => (valence(a) === 5 ? [k + 1] : []))];
    const back = [...path].reverse(), kp = key(path), kb = key(back), d = kp.findIndex((v, k) => v !== kb[k]);
    const p = d >= 0 && kb[d] < kp[d] ? back : path;
    const lam = p.flatMap((a, k) => (valence(a) === 5 ? [`${k + 1}λ⁵`] : [])).join(",");
    const enes = multiple(p, 2), ynes = multiple(p, 3), cite = n > 2;
    const mult = ["", "", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa", "nona"];
    let t = mult[n] + stem + (enes.length > 1 || ynes.length > 1 ? "a" : "");
    if (!enes.length && !ynes.length)
        t += "ane";
    if (enes.length)
        t += (cite ? `-${enes.join(",")}-` : "") + (enes.length > 1 ? mult[enes.length] : "") + (ynes.length ? "en" : "ene");
    if (ynes.length)
        t += (cite ? `-${ynes.join(",")}-` : "") + (ynes.length > 1 ? mult[ynes.length] : "") + "yne";
    return lam ? `${lam}-${t}` : t;
}
function chargeSeparated(g) {
    let out;
    for (let i = 0; i < g.atoms.length; i++) {
        const a = g.atoms[i], bonds = g.bonds.filter((b) => b.a === i || b.b === i);
        if (a.el !== "N" || a.charge || bonds.reduce((t, b) => t + b.order, 0) + a.h !== 5)
            continue;
        const k = bonds.findIndex((b) => { const o = g.atoms[b.a === i ? b.b : b.a]; return b.order === 2 && o.el === "O" && !o.charge && !o.h && g.bonds.filter((x) => x.a === (b.a === i ? b.b : b.a) || x.b === (b.a === i ? b.b : b.a)).length === 1; });
        if (k < 0)
            continue;
        out ?? (out = { atoms: g.atoms.map((x) => ({ ...x })), bonds: g.bonds.map((x) => ({ ...x })) });
        const b = out.bonds[g.bonds.indexOf(bonds[k])], o = b.a === i ? b.b : b.a;
        b.order = 1;
        out.atoms[i].charge = 1;
        out.atoms[o].charge = -1;
    }
    return out ?? g;
}
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹", SUB = "₀₁₂₃₄₅₆₇₈₉";
const sup = (k) => String(k).replace(/\d/g, (d) => SUP[Number(d)]);
const sub = (k) => String(k).replace(/\d/g, (d) => SUB[Number(d)]);
const isotopic = (n, a) => !!n.iso[a] || n.hx[a].length > 0;
const nuclide = (el, mass, k) => `${sup(mass)}${el}${el === "H" || k > 1 ? sub(k) : ""}`;
exports.NUCLIDE = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+[A-Z]/;
function isotopeText(n, skeleton, suffix, loc) {
    const part = [...skeleton, ...suffix];
    if (!part.some((a) => isotopic(n, a)))
        return "";
    const letters = suffix.filter((a) => isotopic(n, a)).map((a) => n.el[a]);
    if (new Set(letters).size !== letters.length || letters.some((e) => !/^[NOS]$/.test(e)))
        throw new Error("isotope");
    const groups = new Map();
    const add = (el, mass, a) => {
        const key = `${el} ${String(mass).padStart(3, "0")}`, g = groups.get(key) ?? { el, mass, locs: [], onSkeleton: true };
        g.locs.push(skeleton.includes(a) ? loc(a) : n.el[a]);
        g.onSkeleton && (g.onSkeleton = skeleton.includes(a));
        groups.set(key, g);
    };
    for (const a of part) {
        if (n.iso[a])
            add(n.el[a], n.iso[a], a);
        for (const m of n.hx[a])
            add("H", m, a);
    }
    const hSkeleton = skeleton.reduce((t, a) => t + n.h[a], 0), hAll = part.reduce((t, a) => t + n.h[a], 0), hNuclides = [...groups.values()].filter((g) => g.el === "H").length;
    const omit = [...groups.values()].every((g) => {
        if (g.el !== "H") {
            const all = part.filter((a) => n.el[a] === g.el).length;
            return all === 1 || g.locs.length === all;
        }
        if (hNuclides > 1)
            return false;
        if (g.locs.length === hAll && hSkeleton > 0)
            return true;
        return g.onSkeleton && (g.locs.length === hSkeleton || skeleton.filter((a) => n.h[a] > 0).length === 1);
    });
    const order = (x, y) => (/^\d/.test(x) !== /^\d/.test(y) ? (/^\d/.test(x) ? -1 : 1) : parseInt(x) - parseInt(y) || (x < y ? -1 : x > y ? 1 : 0));
    return `(${[...groups.keys()].sort().map((k) => groups.get(k)).map((g) => `${omit ? "" : `${g.locs.sort(order).join(",")}-`}${nuclide(g.el, g.mass, g.locs.length)}`).join(",")})`;
}
function isotopePrefix(n, x, from) {
    if (!n.isotopic || !isotopic(n, x) || n.el[x] === "C" || n.adj[x].length !== 1 || n.inRing[x])
        return undefined;
    const text = isotopeText(n, [x], [], () => n.el[x]), keep = [n.iso[x], n.hx[x]];
    n.iso[x] = undefined;
    n.hx[x] = [];
    try {
        return { text: text + n.substituent(x, from).text, compound: true };
    }
    finally {
        [n.iso[x], n.hx[x]] = keep;
    }
}
function isotopeSpecies(g, name) {
    const base = name({ atoms: g.atoms.map(({ iso: _i, hx: _h, ...a }) => a), bonds: g.bonds });
    if (!base)
        return undefined;
    const counts = new Map();
    for (const a of g.atoms)
        for (const [el, mass] of [...(a.iso ? [[a.el, a.iso]] : []), ...(a.hx ?? []).map((m) => ["H", m])]) {
            const key = `${el} ${String(mass).padStart(3, "0")}`, c = counts.get(key) ?? { el, mass, k: 0 };
            c.k++;
            counts.set(key, c);
        }
    const hAtoms = g.atoms.filter((a) => a.h > 0).length, hAll = g.atoms.reduce((t, a) => t + a.h, 0), hKinds = [...counts.values()].filter((c) => c.el === "H").length;
    const plain = [...counts.values()].every((c) => (c.el === "H" ? hKinds === 1 && (hAtoms === 1 || c.k === hAll) : [1, c.k].includes(g.atoms.filter((a) => a.el === c.el).length)));
    return plain ? `(${[...counts.keys()].sort().map((k) => counts.get(k)).map((c) => `${nuclide(c.el, c.mass, c.k)}`).join(",")})${base}` : undefined;
}
function citedNuclides(text) {
    const times = [1];
    let k = 0;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ")" || ch === "]" || ch === "}") {
            times.pop();
            continue;
        }
        if (ch !== "(" && ch !== "[" && ch !== "{")
            continue;
        const m = text.slice(0, i).match(/(bis|tris|tetrakis|pentakis|hexakis|heptakis|octakis)$/), here = times[times.length - 1];
        const d = ch === "(" ? text.slice(i).match(/^\(([^()]*)\)/) : null;
        if (d && exports.NUCLIDE.test(d[1]))
            for (const x of d[1].matchAll(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+[A-Z][a-z]?([₀-₉]*)/g))
                k += here * (x[1] ? Number([...x[1]].map((c) => SUB.indexOf(c)).join("")) : 1);
        times.push(here * (m ? ["", "", "bis", "tris", "tetrakis", "pentakis", "hexakis", "heptakis", "octakis"].indexOf(m[1]) : 1));
    }
    return k;
}
function chalcogenOne(n, x) {
    if ((n.el[x] !== "Se" && n.el[x] !== "Te") || n.adj[x].length !== 1 || n.h[x] || n.q[x])
        return false;
    const c = n.adj[x][0];
    return n.el[c] === "C" && n.ord(x, c) === 2 && (n.inRing[c] || n.adj[c].every((j) => j === x || n.el[j] === "C"));
}
function checkChalcogenOnes(n, kind, seniority) {
    if ((!kind || seniority.indexOf(kind) > seniority.indexOf("ketone")) && n.el.some((_, i) => chalcogenOne(n, i)))
        throw new Error("selone");
}
const chalcogenStem = (el) => ({ S: "sulf", Se: "selen", Te: "tellur" }[el] ?? "sulf");
exports.chalcogenStem = chalcogenStem;
function chalcogenIonSuffix(n, kind, sites) {
    if ((kind !== "sulfonateion" && kind !== "sulfinate") || !sites.length)
        return undefined;
    const els = new Set(sites.map((s) => n.el[s.group]));
    if (els.has("S")) {
        if (els.size > 1)
            throw new Error("mixed chalcogen acids");
        return undefined;
    }
    if (els.size > 1)
        throw new Error("mixed chalcogen acids");
    return `${(0, exports.chalcogenStem)([...els][0])}${kind === "sulfinate" ? "inate" : "onate"}`;
}

  };
  defs["namer-multiplicative.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phenylene = void 0;
exports.substitutively = substitutively;
exports.multiplicativeName = multiplicativeName;
exports.multiplicativeUrea = multiplicativeUrea;
exports.multiplicativeEster = multiplicativeEster;
exports.polyolDiyl = polyolDiyl;
const namer_ts_1 = require("namer.ts");
const namer_hetero_ts_1 = require("namer-hetero.ts");
const SIMPLE_HET = new Set(["oxy", "sulfanediyl", "sulfinyl", "sulfonyl", "selanediyl", "tellanediyl", "disulfanediyl", "trisulfanediyl", "diselanediyl", "peroxy", "azanediyl", "nitrilo", "methylene", "carbonyl", "carbonothioyl", "methanetriyl", "methanetetrayl", "silanediyl"]);
const compare = (a, b) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] === undefined)
            return -1;
        if (b[i] === undefined)
            return 1;
        if (a[i] !== b[i])
            return a[i] - b[i];
    }
    return 0;
};
const locantsOf = (name) => (name.match(/\d+/g) ?? []).map(Number);
let on = true;
function substitutively(f) {
    const was = on;
    on = false;
    try {
        return f();
    }
    finally {
        on = was;
    }
}
function multiplicativeName(n, kind, skip = new Set()) {
    if (!on)
        return undefined;
    try {
        return named(n, kind, skip);
    }
    catch {
        return undefined;
    }
}
function look(n, atoms) {
    const set = new Set(atoms);
    return atoms.map((a) => `${n.el[a]}${n.q[a]}${n.h[a]}${n.cip[a] ?? ""}(${n.adj[a].map((j) => (set.has(j) ? `${n.el[j]}${n.inRing[a] && n.inRing[j] ? "" : n.ord(a, j)}` : `x${n.el[j]}${n.ord(a, j)}`)).sort().join(",")})`).sort().join(" ");
}
function named(n, kind, skip) {
    if (n.isotopic || n.opaque.size || n.hzN.size)
        return undefined;
    const principal = [...n.bearer].filter(([g]) => n.group[g] === kind && !skip.has(g));
    if (kind ? principal.length < 2 : n.rings.length < 2)
        return undefined;
    const sig = (atoms) => look(n, atoms);
    const count = (atoms, ring) => {
        let c = 0;
        for (const [g, on] of principal) {
            if (namer_ts_1.CARBON_GROUP.has(kind))
                c += (!ring && atoms.includes(g)) || (ring && on.some((a) => atoms.includes(a))) ? 1 : 0;
            else if (kind === "ketone" || kind === "imine")
                c += atoms.includes(n.el[g] === "O" ? on[0] : g) ? 1 : 0;
            else
                c += on.some((a) => atoms.includes(a)) ? 1 : 0;
        }
        return c;
    };
    const outside = (atoms) => atoms.reduce((s, a) => s + n.adj[a].filter((j) => !atoms.includes(j)).length, 0);
    const cands = n.rings.map((r) => ({ atoms: r, ring: true, groups: kind ? count(r, true) : 0, subs: outside(r) }));
    for (const a of n.rings.keys())
        for (const x of n.rings[a])
            for (const y of n.adj[x]) {
                if (!n.inRing[y] || n.ringOf[y] <= a || n.ord(x, y) !== 1)
                    continue;
                const ra = n.rings[a], rb = n.rings[n.ringOf[y]], name = n.assemblyComponent(ra);
                if (!name || name !== n.assemblyComponent(rb))
                    continue;
                const atoms = [...ra, ...rb];
                cands.push({ atoms, ring: true, groups: kind ? count(atoms, true) : 0, subs: outside(atoms), assembly: { rings: [ra, rb], junction: [x, y] } });
            }
    if (kind) {
        const carbons = [...Array(n.n).keys()].filter((i) => n.el[i] === "C" && !n.inRing[i] && !skip.has(i) && !n.pseudo.has(i) && !n.het.has(i) && (kind === "nitrile" || !n.isNitrileC(i)));
        const seen = new Set();
        for (const a of carbons)
            for (const p of n.paths(a, -1, true, kind === "nitrile")) {
                const key = [...p].sort((x, y) => x - y).join(" ");
                if (seen.has(key) || p.some((i) => skip.has(i)))
                    continue;
                seen.add(key);
                const groups = count(p, false);
                if (groups)
                    cands.push({ atoms: p, ring: false, groups, subs: outside(p) });
            }
        if (namer_ts_1.CARBON_GROUP.has(kind) && principal.length > 2) {
            const own = new Set(principal.map(([g]) => g));
            for (const a of carbons)
                if (!own.has(a))
                    for (const p of n.paths(a, -1, true, false, own))
                        if (count(p, true) > 2)
                            return undefined;
        }
    }
    const multiple = (c, o) => c.ring ? 0 : c.atoms.slice(1).filter((a, k) => { const b = n.ord(c.atoms[k], a); return b > 1 && (o === undefined || b === o); }).length;
    const ringRank = (atoms) => {
        const hetero = atoms.filter((a) => n.el[a] !== "C"), set = new Set(atoms), has = (e) => hetero.some((a) => n.el[a] === e);
        const bonds = atoms.reduce((t, a) => t + n.adj[a].filter((j) => set.has(j)).length, 0) / 2;
        return [has("N") ? 0 : has("O") ? 1 : has("S") ? 2 : hetero.length ? 3 : 4, atoms.length - 1 - bonds, -atoms.length, -hetero.length];
    };
    const score = (c) => [-c.groups, c.ring ? 0 : 1, ...(c.ring ? [...ringRank(c.assembly?.rings[0] ?? c.atoms), c.assembly ? -2 : -1] : [-c.atoms.length, -multiple(c), -multiple(c, 2), 0, 0])];
    const scores = new Map(cands.map((c) => [c, score(c)]));
    const best = cands.reduce((b, c) => (compare(scores.get(c), scores.get(b)) < 0 ? c : b));
    if (kind && !best.groups)
        return undefined;
    const top = cands.filter((c) => compare(scores.get(c), scores.get(best)) === 0);
    if (top.length < 2)
        return undefined;
    if (top.some((c) => c.ring && !c.assembly && c.atoms.some((a) => n.adj[a].some((j) => n.inRing[j] && n.ringOf[j] !== n.ringOf[a] && top.some((d) => d.ring && d.atoms.includes(j))))))
        return undefined;
    const bySig = new Map();
    for (const c of top)
        bySig.set(sig(c.atoms), [...(bySig.get(sig(c.atoms)) ?? []), c]);
    const families = [];
    let steps = 0;
    for (const group of bySig.values()) {
        if (group.length < 2)
            continue;
        group.sort((a, b) => b.subs - a.subs);
        const pick = (i, chosen, used) => {
            if (++steps > 4000)
                throw new Error("multiplicative search");
            if (i === group.length) {
                if (chosen.length >= 2)
                    families.push([...chosen]);
                return;
            }
            const c = group[i];
            if (c.atoms.every((a) => !used.has(a)))
                pick(i + 1, [...chosen, c], new Set([...used, ...c.atoms]));
            pick(i + 1, chosen, used);
        };
        pick(0, [], new Set());
    }
    families.sort((a, b) => b.length - a.length || b.reduce((t, c) => t + c.subs, 0) - a.reduce((t, c) => t + c.subs, 0));
    let found = [], tried = 0;
    for (const f of families) {
        if (found.length && f.length < found[0].size)
            break;
        if (++tried > 24)
            break;
        const text = attempt(n, kind, skip, f, principal.length);
        if (text)
            found.push({ text, size: f.length, subs: f.reduce((t, c) => t + c.subs, 0) });
    }
    found = found.filter((x) => x.subs === Math.max(...found.map((y) => y.subs)));
    found.sort((a, b) => compare(locantsOf(a.text), locantsOf(b.text)) || a.text.localeCompare(b.text));
    return found[0]?.text;
}
function attempt(n, kind, skip, units, groups) {
    if (units.reduce((t, u) => t + u.groups, 0) !== groups)
        return undefined;
    const unitOf = new Map();
    units.forEach((u, k) => u.atoms.forEach((a) => unitOf.set(a, k)));
    if (kind === "amide")
        for (const [g, on] of n.bearer) {
            const k = n.group[g] === kind ? units.findIndex((u) => u.atoms.includes(g) || on.some((a) => u.atoms.includes(a))) : -1;
            if (k >= 0 && units[k].groups === 1)
                for (const a of [g, n.carbonylO[g], n.amideN(g)])
                    if (a !== undefined && a >= 0)
                        unitOf.set(a, k);
        }
    if (kind === "amine")
        for (const [g, on] of n.bearer) {
            const k = n.group[g] === kind ? units.findIndex((u) => on.some((a) => u.atoms.includes(a))) : -1;
            if (k >= 0 && !unitOf.has(g))
                unitOf.set(g, k);
        }
    const part = new Map(), parts = [];
    for (let s = 0; s < n.n; s++) {
        if (unitOf.has(s) || part.has(s))
            continue;
        const p = { atoms: [s], units: new Set() }, stack = [s];
        part.set(s, parts.length);
        while (stack.length) {
            const i = stack.pop();
            for (const j of n.adj[i]) {
                if (unitOf.has(j))
                    p.units.add(unitOf.get(j));
                else if (!part.has(j)) {
                    part.set(j, parts.length);
                    p.atoms.push(j);
                    stack.push(j);
                }
            }
        }
        parts.push(p);
    }
    const linkers = parts.filter((p) => p.units.size > 1);
    if (linkers.length !== 1 || linkers[0].units.size !== units.length)
        return undefined;
    const L = new Set(linkers[0].atoms);
    const attach = [];
    for (const [a, k] of unitOf)
        for (const j of n.adj[a]) {
            if (unitOf.has(j) && unitOf.get(j) !== k)
                return undefined;
            if (L.has(j)) {
                if (attach[k] || n.ord(a, j) !== 1)
                    return undefined;
                attach[k] = [a, j];
            }
        }
    if (units.some((_, k) => !attach[k]))
        return undefined;
    for (const a of L)
        if ((kind && n.group[a] === kind) || skip.has(a))
            return undefined;
    const centre = linkerName(n, L, unitOf);
    if (!centre || centre.units.length !== units.length)
        return undefined;
    const unitNames = centre.units.map((k) => {
        const u = units[k], nm = n.nameParent({ atoms: u.atoms, ring: u.ring, ...(u.assembly ? { assembly: u.assembly } : {}) }, { kind: u.groups ? kind : undefined, skip, mult: attach[k] });
        const a = attach[k][0], amineN = kind === "amine" && !u.atoms.includes(a);
        return { ...nm, at: u.atoms.includes(a) ? nm.label(a) : amineN && u.groups > 1 ? `N${nm.label(n.adj[a].find((j) => u.atoms.includes(j)))}` : "N" };
    });
    const front = [], bare = [];
    for (const u of unitNames) {
        const m = u.text.match(/^\(([^()]*)\)-(.*)$/);
        bare.push(m ? m[2] : u.text);
        front.push(m ? m[1].split(",") : []);
    }
    if (new Set(bare).size !== 1 || new Set(unitNames.map((u) => u.at)).size !== 1 || new Set(front.map((f) => f.join(","))).size !== 1)
        return undefined;
    if (front[0].some((d) => !/^\d+[a-z]?[RSEZ]$/.test(d)) || unitNames[0].text.includes(" oxide"))
        return undefined;
    const span = units[0].assembly ? 2 : 1, primed = (loc, k) => loc + "'".repeat(k * span);
    if (units[0].assembly && front.some((f) => f.length))
        return undefined;
    const descriptors = front.flatMap((f, k) => f.map((d) => { const [, loc, x] = d.match(/^(\d+[a-z]?)([RSEZ])$/); return { loc, k, text: `${primed(loc, k)}${x}` }; }))
        .sort((a, b) => parseInt(a.loc) - parseInt(b.loc) || a.loc.localeCompare(b.loc) || a.k - b.k).map((d) => d.text);
    const unit = bare[0], k = units.length, mono = !units[0].ring && units[0].atoms.length === 1 && !unitNames[0].prefixes && unitNames[0].at !== "N";
    const multiplied = unitNames[0].prefixes ? namer_ts_1.MULT_COMPLEX[k] + (0, namer_ts_1.enclose)({ text: unit, compound: true }) : /[\d(]/.test(unit) ? namer_ts_1.MULT[k] + (0, namer_ts_1.enclose)({ text: unit, compound: true }) : namer_ts_1.MULT[k] + unit;
    const linker = centre.compound ? (0, namer_ts_1.enclose)({ text: centre.text, compound: true }) : centre.text;
    const locs = mono ? "" : `${unitNames.map((u, i) => primed(u.at, i)).join(",")}-`;
    const text = `${descriptors.length ? `(${descriptors.join(",")})-` : ""}${locs}${linker}${multiplied}`;
    const labelled = n.cip.filter(Boolean).length + [...n.cipBond.values()].filter(Boolean).length;
    return (0, namer_ts_1.citedLabels)(text) === labelled ? text : undefined;
}
function linkerName(n, L, unitOf) {
    if ([...L].some((a) => n.q[a] || n.opaque.has(a)))
        return undefined;
    const chainC = (a) => n.el[a] === "C" && !n.inRing[a] && !n.isNitrileC(a) && (!n.group[a] || n.group[a] === "ketone" || n.group[a] === "imine") && !n.het.has(a) && !n.pseudo.has(a);
    const compOf = new Map(), comps = [];
    for (const a of L) {
        if (compOf.has(a))
            continue;
        let atoms = [a];
        if (n.inRing[a])
            atoms = n.rings[n.ringOf[a]];
        else {
            const join = chainC(a) ? (_, j) => chainC(j)
                : ["O", "S", "Se"].includes(n.el[a]) ? (i, j) => n.el[j] === n.el[a] && !n.inRing[j] && n.ord(i, j) === 1
                    : n.el[a] === "N" ? (i, j) => n.el[j] === "N" && !n.inRing[j] && n.ord(i, j) === 2 : () => false;
            const seen = new Set([a]);
            for (let k = 0; k < atoms.length; k++)
                for (const j of n.adj[atoms[k]])
                    if (L.has(j) && !seen.has(j) && join(atoms[k], j)) {
                        seen.add(j);
                        atoms.push(j);
                    }
        }
        if (atoms.some((x) => !L.has(x) || compOf.has(x)))
            return undefined;
        atoms.forEach((x) => compOf.set(x, comps.length));
        comps.push({ atoms, type: n.inRing[a] ? "ring" : chainC(a) ? "chain" : "het" });
    }
    const nb = comps.map(() => new Set());
    for (const a of L)
        for (const j of n.adj[a]) {
            if (L.has(j) && compOf.get(j) !== compOf.get(a))
                nb[compOf.get(a)].add(compOf.get(j));
            if (unitOf.has(j))
                nb[compOf.get(a)].add(-1 - unitOf.get(j));
        }
    const live = new Set(comps.map((_, c) => c));
    for (let changed = true; changed;) {
        changed = false;
        for (const c of live) {
            const around = [...nb[c]].filter((d) => d < 0 || live.has(d));
            if (around.length < 2 && !around.some((d) => d < 0)) {
                live.delete(c);
                changed = true;
            }
        }
    }
    const edges = [...live].reduce((t, c) => t + [...nb[c]].filter((d) => d < 0 || live.has(d)).length, 0);
    if (edges !== 2 * (live.size - 1) + new Set(unitOf.values()).size)
        return undefined;
    const valences = (c) => comps[c].atoms.flatMap((a) => n.adj[a].filter((j) => unitOf.has(j) || (L.has(j) && compOf.get(j) !== c && live.has(compOf.get(j)))).map((j) => ({ at: a, to: j, order: n.ord(a, j) })));
    const into = (v) => (unitOf.has(v.to) ? -1 - unitOf.get(v.to) : compOf.get(v.to));
    const branch = (c, from) => {
        const vs = valences(c), back = from && vs.find((v) => v.at === from.to && v.to === from.at);
        const out = vs.filter((v) => v !== back);
        const comp = nameComp(n, comps[c], back, out, !from);
        if (!comp)
            return undefined;
        const kids = comp.order.map((v) => { const d = into(v); return d < 0 ? { text: "", units: [-1 - d], unit: true } : branch(d, v); });
        if (kids.some((k) => !k) || (kids.some((k) => k.unit) && !kids.every((k) => k.unit)))
            return undefined;
        const texts = new Set(kids.map((k) => k.text));
        if (texts.size !== 1)
            return undefined;
        const t = kids[0].text, m = kids.length;
        const more = kids[0].unit ? "" : m === 1 ? t : t === "nitrilo" ? namer_ts_1.MULT[m] + t : kids[0].plain && /\d/.test(t) ? `${namer_ts_1.MULT[m]}(${t})` : namer_ts_1.MULT_COMPLEX[m] + (0, namer_ts_1.enclose)({ text: t, compound: true });
        const ez = from && n.ord(from.at, from.to) === 2 ? n.cipBond.get(n.key(from.at, from.to)) : undefined;
        const own = more && !comp.plain ? (0, namer_ts_1.enclose)({ text: comp.text, compound: true }) : comp.text;
        return { text: `${ez ? `(${ez})-` : ""}${own}${more}`, units: kids.flatMap((k) => k.units), plain: !ez && !!comp.plain && !!kids[0].unit };
    };
    for (const c of live) {
        if (valences(c).some((v) => v.order !== 1))
            continue;
        let b;
        try {
            b = branch(c);
        }
        catch {
            b = undefined;
        }
        if (b)
            return { text: b.text, units: b.units, compound: !SIMPLE_HET.has(b.text) || live.size > 1 };
    }
    return undefined;
}
function multiplicativeUrea(n, cs) {
    if (!on || cs.length < 2 || cs.length > 4)
        return undefined;
    try {
        return ureaUnits(n, cs);
    }
    catch {
        return undefined;
    }
}
function ureaUnits(n, cs) {
    if (n.isotopic || n.opaque.size || n.cip.some(Boolean) || [...n.cipBond.values()].some(Boolean))
        return undefined;
    const unitOf = new Map(), ns = [];
    for (const [k, c] of cs.entries()) {
        const o = n.carbonylO[c], nn = n.adj[c].filter((j) => n.el[j] === "N" && n.ord(c, j) === 1);
        if (o < 0 || nn.length !== 2 || n.adj[c].length !== 3)
            return undefined;
        for (const a of [c, o, ...nn]) {
            if (unitOf.has(a))
                return undefined;
            unitOf.set(a, k);
        }
        ns.push(nn);
    }
    const part = new Map(), parts = [];
    for (let s = 0; s < n.n; s++) {
        if (unitOf.has(s) || part.has(s))
            continue;
        const p = { atoms: [s], units: new Set() }, stack = [s];
        part.set(s, parts.length);
        while (stack.length) {
            const i = stack.pop();
            for (const j of n.adj[i]) {
                if (unitOf.has(j))
                    p.units.add(unitOf.get(j));
                else if (!part.has(j)) {
                    part.set(j, parts.length);
                    p.atoms.push(j);
                    stack.push(j);
                }
            }
        }
        parts.push(p);
    }
    const linkers = parts.filter((p) => p.units.size > 1);
    if (linkers.length !== 1 || linkers[0].units.size !== cs.length)
        return undefined;
    const L = new Set(linkers[0].atoms), attach = [];
    for (const [a, k] of unitOf)
        for (const j of n.adj[a]) {
            if (unitOf.has(j) && unitOf.get(j) !== k)
                return undefined;
            if (L.has(j)) {
                if (attach[k] || n.el[a] !== "N" || n.ord(a, j) !== 1)
                    return undefined;
                attach[k] = [a, j];
            }
        }
    if (cs.some((_, k) => !attach[k]))
        return undefined;
    const centre = linkerName(n, L, unitOf);
    if (!centre || centre.units.length !== cs.length)
        return undefined;
    const units = cs.map((c, k) => {
        const [at, to] = attach[k], other = ns[k].find((x) => x !== at);
        const prefixes = [at, other].flatMap((x, j) => n.adj[x].filter((y) => y !== c && !(x === at && y === to)).map((y) => ({ loc: j ? "N'" : "N", name: n.substituent(y, x) })));
        return { text: (0, namer_ts_1.assemblePrefixes)(prefixes, false) + (n.el[n.carbonylO[c]] === "O" ? "urea" : "?"), prefixed: prefixes.length > 0 };
    });
    if (new Set(units.map((u) => u.text)).size !== 1 || units[0].text.endsWith("?"))
        return undefined;
    const k = cs.length, unit = units[0].text;
    const multiplied = units[0].prefixed ? namer_ts_1.MULT_COMPLEX[k] + (0, namer_ts_1.enclose)({ text: unit, compound: true }) : namer_ts_1.MULT[k] + unit;
    const locs = centre.units.map((_, i) => `N${"''".repeat(i)}`).join(",");
    return `${locs}-${centre.compound ? (0, namer_ts_1.enclose)({ text: centre.text, compound: true }) : centre.text}${multiplied}`;
}
function multiplicativeEster(n, kind, esters) {
    if (kind !== "ester" || !on)
        return undefined;
    try {
        if (esters.some((c) => (0, namer_hetero_ts_1.groupVariant)(n, c)))
            return undefined;
        const alkyls = esters.map((c) => { const o = n.esterO.get(c); return n.substituent(n.adj[o].find((j) => j !== c && !n.peroxO.has(j)), o); });
        if (new Set(alkyls.map((a) => a.text)).size !== 1)
            return undefined;
        const acid = named(n, kind, new Set());
        return acid && `${(0, namer_ts_1.times)(esters.length, alkyls[0])} ${acid}`;
    }
    catch {
        return undefined;
    }
}
const phenylene = (yl) => !on ? yl : yl.replace(/^(.*?)benzene-(\d,\d)-diyl$/, (_, pre, locs) => (0, namer_ts_1.joinPrefixes)(pre.replace(/-$/, ""), `${locs}-phenylene`));
exports.phenylene = phenylene;
function polyolDiyl(n, alcohol, os) {
    if (!on)
        return undefined;
    try {
        const L = new Set([...alcohol].filter((a) => !os.includes(a)));
        if (os.some((o) => n.adj[o].filter((j) => L.has(j)).length !== 1))
            return undefined;
        const g = linkerName(n, L, new Map(os.map((o, k) => [o, k])));
        if (!g || g.units.length !== os.length)
            return undefined;
        const labelled = [...L].filter((a) => n.cip[a]).length + [...n.cipBond].filter(([key, v]) => v && key.split(" ").every((x) => L.has(Number(x)))).length;
        return (0, namer_ts_1.citedLabels)(g.text) === labelled ? g.text : undefined;
    }
    catch {
        return undefined;
    }
}
function nameComp(n, c, back, out, central) {
    const all = back ? [back, ...out] : out, partner = (a, x) => all.some((v) => v.at === a && v.to === x);
    if (out.length < 1 || all.length < 2)
        return undefined;
    const named = c.type === "het" ? hetName(n, c, back, out, partner) : c.type === "chain" ? chainName(n, c, back, out, central, partner) : ringName(n, c, back, out, central, partner);
    return named && { ...named, plain: named.plain ?? (SIMPLE_HET.has(named.text) || named.text === "azanylylidene" || named.text === "methanylylidene") };
}
const subsOf = (n, atoms, partner, skipAtoms = new Set()) => atoms.flatMap((a) => n.adj[a].filter((x) => !atoms.includes(x) && !partner(a, x) && !skipAtoms.has(x)).map((x) => ({ a, x })));
const prefixOf = (n, a, x) => {
    if (n.ord(a, x) === 2 && n.adj[x].length === 1 && !n.q[x] && (n.el[x] === "O" || n.el[x] === "S"))
        return { text: n.el[x] === "O" ? "oxo" : "sulfanylidene", compound: false };
    if (n.ord(a, x) === 2 && n.el[x] === "N" && n.group[x] === "imine")
        return n.iminoPrefix(x, a);
    return n.substituent(x, a);
};
function hetName(n, c, back, out, partner) {
    const all = back ? [back, ...out] : out, [a] = c.atoms, el = n.el[a], orders = all.map((v) => v.order);
    if (c.atoms.some((x) => n.q[x] || n.cip[x]))
        return undefined;
    const subs = subsOf(n, c.atoms, partner);
    const single = orders.every((o) => o === 1);
    if (c.atoms.length > 1) {
        if (all.length !== 2 || !single || subs.length)
            return undefined;
        if (el === "N") {
            const ez = n.cipBond.get(n.key(c.atoms[0], c.atoms[1]));
            return c.atoms.length === 2 && all[0].at !== all[1].at ? { text: `${ez ? `(${ez})-` : ""}diazene-1,2-diyl`, order: out } : undefined;
        }
        if (all[0].at === all[1].at)
            return undefined;
        const word = el === "O" ? (c.atoms.length === 2 ? "peroxy" : undefined) : `${namer_ts_1.MULT[c.atoms.length]}${el === "S" ? "sulfane" : "selane"}diyl`;
        return word ? { text: word, order: out } : undefined;
    }
    if (el === "O" && all.length === 2 && single && !subs.length && !n.h[a])
        return { text: "oxy", order: out };
    if ((el === "Se" || el === "Te") && all.length === 2 && single && !subs.length && !n.h[a])
        return { text: el === "Se" ? "selanediyl" : "tellanediyl", order: out };
    if (el === "S" && all.length === 2 && single && !n.h[a]) {
        const oxo = subs.filter(({ x }) => n.el[x] === "O" && n.ord(a, x) === 2 && n.adj[x].length === 1);
        if (oxo.length !== subs.length)
            return undefined;
        return { text: ["sulfanediyl", "sulfinyl", "sulfonyl"][oxo.length], order: out };
    }
    if (el === "N" && !n.inRing[a]) {
        if (all.length === 3 && single && !subs.length)
            return { text: "nitrilo", order: out };
        if (all.length === 2 && back?.order === 1 && out[0].order === 2 && !subs.length && !n.h[a])
            return { text: "azanylylidene", order: out };
        if (all.length === 2 && single && subs.every(({ a: y, x }) => n.ord(y, x) === 1)) {
            const names = subs.map(({ a: y, x }) => n.substituent(x, y));
            return { text: `${(0, namer_ts_1.substituted)(names)}azanediyl`, order: out };
        }
        return undefined;
    }
    if (el === "Si" && all.length === 2 && single && subs.every(({ a: y, x }) => n.ord(y, x) === 1))
        return { text: `${(0, namer_ts_1.substituted)(subs.map(({ a: y, x }) => n.substituent(x, y)))}silanediyl`, order: out };
    return undefined;
}
function chainName(n, c, back, out, central, partner) {
    const all = back ? [back, ...out] : out, carbons = c.atoms, inComp = new Set(carbons);
    if (carbons.length === 1) {
        const [a] = carbons, subs = subsOf(n, carbons, partner);
        if (n.cip[a])
            return undefined;
        if (all.length === 2 && back?.order === 2 && out[0].order === 1 && !subs.length && n.h[a] === 1)
            return { text: "methanylylidene", order: out };
        if (all.some((v) => v.order !== 1))
            return undefined;
        const oxo = subs.filter(({ x }) => n.ord(a, x) === 2);
        if (oxo.length)
            return all.length === 2 && subs.length === 1 && n.adj[oxo[0].x].length === 1 && ["O", "S"].includes(n.el[oxo[0].x]) ? { text: n.el[oxo[0].x] === "O" ? "carbonyl" : "carbonothioyl", order: out } : undefined;
        const word = ["", "", "methylene", "methanetriyl", "methanetetrayl"][all.length];
        return word ? { text: (0, namer_ts_1.substituted)(subs.map(({ a: y, x }) => n.substituent(x, y))) + word, order: out } : undefined;
    }
    if (all.some((v) => v.order !== 1))
        return undefined;
    const need = new Set(all.map((v) => v.at)), paths = [];
    const walk = (p) => {
        if ([...need].every((a) => p.includes(a)))
            paths.push(p);
        for (const j of n.adj[p[p.length - 1]])
            if (inComp.has(j) && !p.includes(j))
                walk([...p, j]);
    };
    if (carbons.length > 30)
        return undefined;
    for (const s of carbons)
        walk([s]);
    if (!paths.length)
        return undefined;
    const mult = (p, o) => p.slice(1).filter((a, k) => { const b = n.ord(p[k], a); return b > 1 && (o === undefined || b === o); }).length;
    const rank = (p) => [-p.length, -mult(p), -mult(p, 2)];
    const bestRank = paths.map(rank).reduce((b, r) => (compare(r, b) < 0 ? r : b));
    let nums = paths.filter((p) => compare(rank(p), bestRank) === 0);
    const loc = (num, a) => num.indexOf(a) + 1;
    const prefixes = (num) => subsOf(n, num, partner, new Set());
    const multiples = (num, o) => num.slice(0, -1).flatMap((a, k) => { const b = n.ord(a, num[k + 1]); return b > 1 && (o === undefined || b === o) ? [k + 1] : []; });
    nums = n.lowest(nums, (num) => all.map((v) => loc(num, v.at)));
    if (!central)
        nums = n.lowest(nums, (num) => out.map((v) => loc(num, v.at)));
    nums = n.lowest(nums, (num) => multiples(num));
    nums = n.lowest(nums, (num) => multiples(num, 2));
    nums = n.lowest(nums, (num) => prefixes(num).map(({ a }) => loc(num, a)));
    const named = new Map();
    const nameOf = (a, x) => { if (!named.has(x))
        named.set(x, prefixOf(n, a, x)); return named.get(x); };
    const alpha = [...new Set(prefixes(nums[0]).map(({ a, x }) => nameOf(a, x).text))].sort((p, q) => (0, namer_ts_1.alphaKey)(p).localeCompare((0, namer_ts_1.alphaKey)(q)));
    for (const t of alpha)
        nums = n.lowest(nums, (num) => prefixes(num).filter(({ a, x }) => nameOf(a, x).text === t).map(({ a }) => loc(num, a)));
    const num = nums[0], size = num.length;
    if (num.some((a) => n.adj[a].some((x) => !num.includes(x) && n.ord(a, x) === 2 && n.cipBond.get(n.key(a, x)))))
        return undefined;
    const pre = prefixes(num), ends = [num[0], num[size - 1]];
    const acyl = all.length === 2 && ends.every((e) => n.carbonylO[e] >= 0 && n.el[n.carbonylO[e]] === "O" && all.some((v) => v.at === e)) && all[0].at !== all[1].at;
    const list = pre.filter(({ a, x }) => !(acyl && ends.includes(a) && x === n.carbonylO[a])).map(({ a, x }) => ({ loc: String(loc(num, a)), name: nameOf(a, x) }));
    const prefixText = (0, namer_ts_1.assemblePrefixes)(list, false);
    const stem = (0, namer_ts_1.chainStem)(size, multiples(num, 2), multiples(num, 3), false);
    const stereo = [...num.flatMap((a) => (n.cip[a] === "R" || n.cip[a] === "S" ? [`${loc(num, a)}${n.cip[a]}`] : [])),
        ...num.slice(0, -1).flatMap((a, k) => { const e = n.cipBond.get(n.key(a, num[k + 1])); return e === "E" || e === "Z" ? [`${k + 1}${e}`] : []; })];
    if (num.some((a) => n.cip[a] && n.cip[a] !== "R" && n.cip[a] !== "S"))
        return undefined;
    const order = [...out].sort((x, y) => loc(num, x.at) - loc(num, y.at));
    const locs = [...(back ? [loc(num, back.at)] : []), ...order.map((v) => loc(num, v.at))];
    if (central)
        locs.sort((x, y) => x - y);
    const body = acyl ? `${stem}dioyl` : `${stem}-${locs.join(",")}-${namer_ts_1.MULT[all.length]}yl`;
    return { text: (stereo.length ? `(${stereo.join(",")})-` : "") + (0, namer_ts_1.joinPrefixes)(prefixText, body), order, plain: !list.length && !stereo.length };
}
function ringName(n, c, back, out, central, partner) {
    const all = back ? [back, ...out] : out, atoms = c.atoms;
    if (all.some((v) => v.order !== 1) || atoms.some((a) => n.q[a] || n.lambda(a)))
        return undefined;
    const info = n.ringInfo(atoms);
    if (info.bridged || info.assembly)
        return undefined;
    let name, labels;
    if (info.fused) {
        const f = info.fused;
        if (f.mono !== undefined || f.tpl.odd || f.d.length || f.tpl.uncited?.length || f.tpl.bridges || f.tpl.hydrogens)
            return undefined;
        name = f.tpl.name;
        labels = f.tpl.labels;
    }
    else if (info.ring)
        name = (info.ring.hydrogen ?? "") + info.ring.name;
    else {
        if (atoms.some((a, k) => n.ord(a, atoms[(k + 1) % atoms.length]) !== 1))
            return undefined;
        name = `cyclo${(0, namer_ts_1.chainStem)(atoms.length, [], [], true)}`;
    }
    if (atoms.some((a) => n.adj[a].some((b) => atoms.includes(b) && n.cipBond.get(n.key(a, b)))))
        return undefined;
    const loc = (num, a) => num.indexOf(a) + 1, label = (num, a) => (labels ? labels[num.indexOf(a)] : String(loc(num, a)));
    const pre = subsOf(n, atoms, partner);
    let nums = info.numberings;
    nums = n.lowest(nums, (num) => all.map((v) => loc(num, v.at)));
    if (!central)
        nums = n.lowest(nums, (num) => out.map((v) => loc(num, v.at)));
    nums = n.lowest(nums, (num) => pre.map(({ a }) => loc(num, a)));
    const named = pre.map(({ a, x }) => ({ a, name: prefixOf(n, a, x) }));
    for (const t of [...new Set(named.map((p) => p.name.text))].sort((p, q) => (0, namer_ts_1.alphaKey)(p).localeCompare((0, namer_ts_1.alphaKey)(q))))
        nums = n.lowest(nums, (num) => named.filter((p) => p.name.text === t).map(({ a }) => loc(num, a)));
    const num = nums[0];
    if (atoms.some((a) => n.cip[a] && n.cip[a] !== "R" && n.cip[a] !== "S"))
        return undefined;
    const stereo = atoms.filter((a) => n.cip[a]).sort((a, b) => loc(num, a) - loc(num, b)).map((a) => `${label(num, a)}${n.cip[a]}`);
    const order = [...out].sort((x, y) => loc(num, x.at) - loc(num, y.at));
    const ls = [...(back ? [back] : []), ...order];
    if (central)
        ls.sort((x, y) => loc(num, x.at) - loc(num, y.at));
    const locs = ls.map((v) => label(num, v.at)).join(",");
    const prefixText = (0, namer_ts_1.assemblePrefixes)(named.map((p) => ({ loc: label(num, p.a), name: p.name })), false);
    const body = name === "benzene" && all.length === 2 ? `${locs}-phenylene` : `${name}-${locs}-${namer_ts_1.MULT[all.length]}yl`;
    return { text: (stereo.length ? `(${stereo.join(",")})-` : "") + (0, namer_ts_1.joinPrefixes)(prefixText, body), order, plain: !named.length && !stereo.length };
}

  };
  defs["namer-hetero.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nOxideN = exports.thioDouble = void 0;
exports.groupVariant = groupVariant;
exports.variantSuffix = variantSuffix;
exports.thioAcyl = thioAcyl;
exports.thioPrefix = thioPrefix;
exports.perceiveIodanes = perceiveIodanes;
exports.amideHetero = amideHetero;
exports.perceiveHetero = perceiveHetero;
exports.heteroAmine = heteroAmine;
exports.heteroBond = heteroBond;
exports.suffixStereo = suffixStereo;
exports.sulfonamideN = sulfonamideN;
exports.sulfonateName = sulfonateName;
exports.nOxides = nOxides;
exports.oxideText = oxideText;
exports.heteroCharged = heteroCharged;
exports.heteroPrefix = heteroPrefix;
exports.hydrazinyl = hydrazinyl;
exports.ylidene = ylidene;
exports.heteroParentName = heteroParentName;
const namer_ts_1 = require("namer.ts");
const namer_maingroup_ts_1 = require("namer-maingroup.ts");
function groupVariant(n, c) {
    if (n.el[c] === "S" && n.group[c] === "ketone" && n.adj[c].length === 1)
        return "=S";
    if (n.el[c] === "S")
        return n.group[c] && VARIANT_SUFFIX[n.group[c]] ? (oxo(n, c).length === 1 ? (n.adj[c].some((j) => n.el[j] === "N" && n.ord(c, j) === 2) ? "S=N" : "S=O") : "") + (n.adj[c].some((j) => n.het.get(j) === "SSR") ? "S" : "") : "";
    if (n.el[c] === "O")
        return n.group[c] === "alcohol" && n.adj[c].some((j) => n.el[j] === "O") ? "OO" : "";
    const d = n.carbonylO[c];
    if (d < 0)
        return "";
    const x = n.esterO.get(c) ?? n.adj[c].find((j) => j !== d && n.group[j] === "acid" && n.el[j] !== "C");
    if (x !== undefined && n.el[x] === "O" && n.adj[x].some((j) => j !== c && n.el[j] === "O"))
        return n.el[d] === "O" ? "" : "?";
    const dbl = n.el[d] === "S" || n.el[d] === "Se" || n.el[d] === "Te", single = x !== undefined && n.el[x] === "S";
    return dbl && single ? "SS" : dbl && x !== undefined ? "O" : single ? "S" : dbl ? "=S" : "";
}
const thioDouble = (n, c) => n.carbonylO[c] >= 0 && n.el[n.carbonylO[c]] === "S";
exports.thioDouble = thioDouble;
const VARIANT_SUFFIX = {
    acid: { S: ["thioic S-acid", "carbothioic S-acid"], O: ["thioic O-acid", "carbothioic O-acid"], SS: ["dithioic acid", "carbodithioic acid"] },
    ester: { S: ["thioate", "carbothioate"], O: ["thioate", "carbothioate"], SS: ["dithioate", "carbodithioate"] },
    amide: { "=S": ["thioamide", "carbothioamide"] }, aldehyde: { "=S": ["thial", "carbothialdehyde"] },
    ketone: { "=S": ["thione", "thione"] }, halide: { "=S": ["thioyl", "carbothioyl"] }, alcohol: { OO: ["peroxol", "peroxol"] },
    sulfonic: { "S=O": ["sulfinic acid", "sulfinic acid"], "S=N": ["sulfonimidic acid", "sulfonimidic acid"] }, sulfonate: { "S=O": ["sulfinate", "sulfinate"], S: ["sulfonothioate", "sulfonothioate"], "S=OS": ["sulfinothioate", "sulfinothioate"] },
    sulfonamide: { "S=O": ["sulfinamide", "sulfinamide"] }, sulfonylhalide: { "S=O": ["sulfinyl", "sulfinyl"] },
};
function variantSuffix(n, kind, sites, used, ring) {
    if (!kind || !sites.length)
        return undefined;
    const v = sites.map((s) => groupVariant(n, s.group));
    if (v.every((x) => !x))
        return undefined;
    if (v.some((x) => !x)) {
        for (const s of sites.filter((_, k) => v[k])) {
            used.delete(s.group);
            used.delete(n.carbonylO[s.group]);
        }
        const keep = sites.filter((_, k) => !v[k]);
        sites.length = 0;
        sites.push(...keep);
        return undefined;
    }
    const t = VARIANT_SUFFIX[kind]?.[v[0]];
    if (!t || v.some((x) => x !== v[0]) || (sites.length > 1 && (kind === "acid" || kind === "ester")))
        throw new Error("thio");
    const x = n.el[n.carbonylO[sites[0].group]];
    if (x === "Se" || x === "Te") {
        if (kind !== "acid" || v[0] !== "O" || sites.some((s) => n.el[n.carbonylO[s.group]] !== x))
            throw new Error("seleno");
        return t[ring ? 1 : 0].replace("thio", x === "Se" ? "seleno" : "telluro");
    }
    return t[ring ? 1 : 0];
}
function thioAcyl(n, c, name) {
    if (!(0, exports.thioDouble)(n, c))
        return name;
    const t = name.text;
    const text = /formyl$/.test(t) ? t.replace(/formyl$/, "methanethioyl") : /acetyl$/.test(t) ? t.replace(/acetyl$/, "ethanethioyl")
        : /benzoyl$/.test(t) ? t.replace(/benzoyl$/, t === "benzoyl" ? "benzenecarbothioyl" : "benzene-1-carbothioyl") : /carbonyl$/.test(t) ? t.replace(/carbonyl$/, "carbothioyl")
            : /oyl$/.test(t) ? t.replace(/oyl$/, "ethioyl") : undefined;
    if (!text)
        throw new Error("thio");
    return { text, compound: name.compound || text !== t };
}
function thioPrefix(n, x, kind) {
    const v = groupVariant(n, x);
    if (!v)
        return undefined;
    if (kind === "acid")
        return { text: v === "S" ? "sulfanylcarbonyl" : v === "O" ? "hydroxycarbonothioyl" : "sulfanylcarbonothioyl", compound: true };
    if (kind === "aldehyde")
        return { text: "methanethioyl", compound: false };
    if (kind === "amide") {
        const nAtom = n.amideN(x), subs = n.adj[nAtom].filter((j) => j !== x).map((j) => n.substituent(j, nAtom));
        if (!subs.length)
            return { text: "carbamothioyl", compound: false };
        const inner = subs.length === 2 && subs[0].text === subs[1].text ? `di${(0, namer_ts_1.enclose)(subs[0])}` : subs.map(namer_ts_1.enclose).join("");
        return { text: `${inner}carbamothioyl`, compound: true };
    }
    if (kind === "ester") {
        const alkoxy = n.substituent(n.esterO.get(x), x), carbonyl = n.el[n.carbonylO[x]] === "S" ? "carbonothioyl" : "carbonyl";
        return { text: `${(0, namer_ts_1.enclose)(alkoxy)}${carbonyl}`.replace(/^\(([a-z-]+oxy)\)(carbon[a-z]+)$/, "$1$2"), compound: true };
    }
    if (kind !== "ketone")
        throw new Error("thio");
    return undefined;
}
function perceiveIodanes(n) {
    for (let c = 0; c < n.n; c++)
        if (n.el[c] === "I" && !n.inRing[c] && !n.q[c] && n.adj[c].length >= 2)
            iodane(n, c);
    for (let x = 0; x < n.n; x++) {
        if (!namer_ts_1.HALO[n.el[x]] || !n.inRing[x] || n.q[x])
            continue;
        for (const o of n.adj[x]) {
            if (n.el[o] !== "O" || n.inRing[o] || n.q[o] || n.ord(x, o) !== 1)
                continue;
            const r = n.adj[o].find((j) => j !== x), acyl = r !== undefined && n.carbonylO[r] >= 0;
            if (r === undefined ? n.h[o] !== 1 : n.adj[o].length !== 2 || n.el[r] !== "C" || n.isNitrileC(r) || n.inRing[r] || (acyl && n.adj[r].some((j) => j !== o && j !== n.carbonylO[r] && n.el[j] !== "C")))
                continue;
            for (const k of acyl ? [o, r, n.carbonylO[r]] : [o])
                n.het.set(k, "XO");
            if (r === undefined)
                n.mark(o, "alcohol", [x]);
        }
    }
}
function iodane(n, x) {
    const cs = n.adj[x].filter((j) => n.el[j] === "C" && n.ord(x, j) === 1), dbl = oxo(n, x), lig = n.adj[x].filter((j) => !cs.includes(j) && !dbl.includes(j));
    if (cs.length !== 1)
        return;
    const acyl = [];
    const okLig = (j) => {
        if (n.ord(x, j) !== 1 || n.q[j] || n.inRing[j])
            return false;
        if (namer_ts_1.HALO[n.el[j]])
            return n.adj[j].length === 1;
        if (n.el[j] !== "O")
            return false;
        if (n.adj[j].length === 1)
            return n.h[j] === 1;
        const r = n.adj[j].find((k) => k !== x);
        if (n.adj[j].length !== 2 || n.el[r] !== "C" || n.inRing[r])
            return false;
        if (n.carbonylO[r] >= 0) {
            const others = n.adj[r].filter((k) => k !== j && k !== n.carbonylO[r]);
            if (others.length > 1 || others.some((k) => n.el[k] !== "C"))
                return false;
            acyl.push(r, n.carbonylO[r]);
        }
        return true;
    };
    if (!((dbl.length && !lig.length && dbl.length <= 2) || (!dbl.length && lig.length === 2 && lig.every(okLig))))
        return;
    for (const k of [x, ...dbl, ...lig, ...acyl])
        n.het.set(k, "I3");
}
const plainC = (n, j) => n.el[j] === "C" && n.carbonylO[j] < 0 && !n.isNitrileC(j);
const single = (n, i) => n.adj[i].every((j) => n.ord(i, j) === 1);
const free = (n, i) => !n.inRing[i] && !n.q[i] && !n.group[i] && !n.het.has(i) && !n.cip[i];
const oxyOnN = (n, o, on) => n.el[o] === "O" && free(n, o) && single(n, o) && n.adj[o].length + n.h[o] === 2 && n.adj[o].every((j) => j === on || plainC(n, j));
function amideHetero(n, j) {
    if (namer_ts_1.HALO[n.el[j]] && n.adj[j].length === 1) {
        n.het.set(j, "NX");
        return true;
    }
    return n.el[j] === "S" && !n.inRing[j] && !n.q[j] && oxo(n, j).length === 2 && n.adj[j].length === 4 && n.adj[j].filter((k) => n.el[k] === "C").length === 1;
}
function perceiveHetero(n) {
    const { el, adj, h } = n;
    perceiveSulfur(n);
    perceiveCentres(n);
    for (let i = 0; i < n.n; i++) {
        const z = el[i] === "O" ? (0, namer_maingroup_ts_1.azoxy)(n, i) : undefined;
        if (z)
            for (const a of [z.p, z.m, z.o])
                n.het.set(a, "azoxy");
    }
    for (let i = 0; i < n.n; i++) {
        if (nOxideO(n, i)) {
            n.het.set(i, "NO-");
            continue;
        }
        if (namer_ts_1.HALO[el[i]] && adj[i].length === 1 && el[adj[i][0]] === "N" && !n.q[i] && n.ord(i, adj[i][0]) === 1) {
            n.het.set(i, "NX");
            continue;
        }
        if (!free(n, i))
            continue;
        if (el[i] === "S" && single(n, i) && adj[i].length + h[i] === 2 && adj[i].some((j) => el[j] === "S")) {
            const chain = sulfurChain(n, i);
            if (chain && chain.length <= 6)
                for (const s of chain)
                    n.het.set(s, "SS");
            continue;
        }
        if (el[i] === "O" && single(n, i) && adj[i].length + h[i] === 2) {
            const o = adj[i].find((j) => el[j] === "O");
            if (o === undefined || !free(n, o) || !single(n, o) || adj[o].length + h[o] !== 2)
                continue;
            const ends = [...adj[i], ...adj[o]].filter((j) => j !== i && j !== o);
            if (!ends.every((j) => plainC(n, j)))
                continue;
            n.het.set(i, "OO");
            n.het.set(o, "OO");
            const [inner, cs] = h[o] === 1 ? [i, adj[i].filter((j) => j !== o)] : h[i] === 1 ? [o, adj[o].filter((j) => j !== i)] : [-1, []];
            if (inner >= 0)
                n.mark(inner, "alcohol", cs);
            continue;
        }
        if (el[i] !== "N")
            continue;
        const ns = adj[i].filter((j) => el[j] === "N"), os = adj[i].filter((j) => el[j] === "O");
        const oxo = os.find((o) => n.ord(i, o) === 2 && adj[o].length === 1 && !n.q[o]);
        if (oxo !== undefined) {
            const r = adj[i].filter((j) => j !== oxo);
            if (r.length === 1 && !h[i] && n.ord(i, r[0]) === 1 && (plainC(n, r[0]) || el[r[0]] === "N" || n.group[r[0]] === "ketone")) {
                n.het.set(i, "N=O");
                n.het.set(oxo, "N=O");
            }
            continue;
        }
        if (ns.length === 1 && !os.length) {
            const m = ns[0];
            if (!free(n, m) || n.ord(i, m) === 3)
                continue;
            const others = [...adj[i], ...adj[m]].filter((j) => j !== i && j !== m);
            if (n.ord(i, m) === 2) {
                if (adj[i].length + h[i] === 2 && adj[m].length + h[m] === 2 && others.every((j) => (plainC(n, j) || n.group[j] === "ketone") && n.ord(i, j) + n.ord(m, j) === 1)) {
                    n.het.set(i, "N=N");
                    n.het.set(m, "N=N");
                }
                const y = adj[m].find((j) => j !== i);
                if (y !== undefined && el[y] === "N" && free(n, y) && single(n, y) && adj[y].length + h[y] === 3 && adj[y].every((j) => j === m || plainC(n, j))
                    && adj[i].length + h[i] === 2 && adj[m].length === 2 && adj[i].every((j) => j === m || plainC(n, j)))
                    for (const k of [i, m, y])
                        n.het.set(k, "N3");
                continue;
            }
            const c = adj[i].find((j) => n.ord(i, j) === 2);
            if (c !== undefined) {
                if (el[c] === "C" && n.carbonylO[c] < 0 && !n.isNitrileC(c) && adj[i].length === 2 && !h[i] && single(n, m) && adj[m].length + h[m] === 3 && adj[m].every((j) => j === i || plainC(n, j))) {
                    n.het.set(i, "hz");
                    n.het.set(m, "hz");
                }
                continue;
            }
            if (n.adj[m].some((j) => n.ord(m, j) === 2))
                continue;
            if (single(n, i) && single(n, m) && adj[i].length + h[i] === 3 && adj[m].length + h[m] === 3 && others.every((j) => plainC(n, j))) {
                n.het.set(i, "NN");
                n.het.set(m, "NN");
            }
            continue;
        }
        const nitrosoN = (j) => el[j] === "N" && !n.q[j] && adj[j].length === 2 && adj[j].some((o) => el[o] === "O" && n.ord(j, o) === 2 && adj[o].length === 1);
        if ((os.length === 1 || os.length === 2) && ns.every(nitrosoN) && single(n, i) && adj[i].length + h[i] === 3 && os.every((o) => oxyOnN(n, o, i)) && adj[i].every((j) => os.includes(j) || plainC(n, j) || nitrosoN(j))) {
            n.het.set(i, "NO");
            for (const o of os)
                n.het.set(o, "NO");
        }
    }
    for (let i = 0; i < n.n; i++) {
        if (el[i] !== "S" || n.inRing[i] || n.q[i] || h[i] || adj[i].length !== 2 || !single(n, i) || n.het.has(i) || n.group[i] || n.sulfur.has(i))
            continue;
        const c = adj[i].find((j) => el[j] === "C"), x = adj[i].find((j) => j !== c);
        if (c === undefined || x === undefined || (!plainC(n, c) && !n.inRing[c]))
            continue;
        if (namer_ts_1.HALO[el[x]] && adj[x].length === 1 && !n.het.has(x)) {
            n.het.set(i, "S-");
            n.het.set(x, "S-");
        }
        else if (el[x] === "O" && !n.inRing[x] && (adj[x].length === 1 ? h[x] === 1 : adj[x].length === 2 && plainC(n, adj[x].find((j) => j !== i))) && !n.het.has(x) && !n.group[x]) {
            n.het.set(i, "S-");
            n.het.set(x, "S-");
        }
        else if (el[x] === "N" && !n.q[x] && (n.inRing[x] || (single(n, x) && adj[x].every((j) => j === i || plainC(n, j)))) && !n.het.has(x))
            n.het.set(i, "SN-");
    }
    for (let i = 0; i < n.n; i++) {
        if (el[i] !== "N" || !n.inRing[i] || n.q[i])
            continue;
        for (const o of adj[i])
            if (!n.inRing[o] && oxyOnN(n, o, i)) {
                n.het.set(o, "ON");
                if (h[o] === 1)
                    n.mark(o, "alcohol", [i]);
            }
    }
}
function sulfurChain(n, s) {
    const chain = [s], stack = [s];
    while (stack.length) {
        const i = stack.pop();
        for (const j of n.adj[i]) {
            if (n.el[j] !== "S" || chain.includes(j))
                continue;
            if (!free(n, j) || !single(n, j) || n.adj[j].length + n.h[j] !== 2)
                return undefined;
            chain.push(j);
            stack.push(j);
        }
    }
    const ends = chain.flatMap((i) => n.adj[i].filter((j) => n.el[j] !== "S"));
    return ends.every((j) => plainC(n, j)) ? chain : undefined;
}
function heteroAmine(n, i) {
    if ((n.q[i] && !(0, exports.nOxideN)(n, i)) || !single(n, i))
        return false;
    const on = n.adj[i].filter((j) => plainC(n, j) || (n.el[j] === "N" && n.inRing[j] && !n.q[j]));
    const rest = n.adj[i].filter((j) => !on.includes(j));
    if (!on.length || (!rest.length && on.every((j) => n.el[j] === "C")) || !rest.every((j) => n.het.get(j) === "NX" || n.het.get(j) === "N=O" || n.het.get(j) === "SN-" || nOxideO(n, j) || n.nitroAtom(j)))
        return false;
    n.mark(i, "amine", on);
    return true;
}
function heteroBond(n, a, b) {
    if (n.het.has(a) || n.het.has(b) || nOxideO(n, a) || nOxideO(n, b))
        return true;
    if ((n.group[a] === "imine" && n.inRing[b]) || (n.group[b] === "imine" && n.inRing[a]))
        return true;
    return (n.group[a] === "amine" && !!n.bearer.get(a)?.includes(b)) || (n.group[b] === "amine" && !!n.bearer.get(b)?.includes(a));
}
const oxo = (n, x) => n.adj[x].filter((j) => n.el[j] === "O" && n.ord(x, j) === 2 && n.adj[j].length === 1 && !n.q[j]);
const thioxo = (n, x) => n.adj[x].filter((j) => n.el[j] === "S" && n.ord(x, j) === 2 && n.adj[j].length === 1 && !n.q[j]);
function ligand(n, x, j) {
    if (n.ord(x, j) !== 1 || n.q[j])
        return undefined;
    if (namer_ts_1.HALO[n.el[j]])
        return n.adj[j].length === 1 ? "X" : undefined;
    if (n.el[j] === "C")
        return n.el[x] === "P" && cyanide(n, j) ? "X" : undefined;
    if (n.el[j] === "O" && !n.inRing[j]) {
        if (n.adj[j].length === 1)
            return n.h[j] === 1 ? "OH" : undefined;
        const k = n.adj[j].find((y) => y !== x);
        if (n.adj[j].length === 2 && (plainC(n, k) || (["Si", "Ge", "Sn"].includes(n.el[k]) && !n.inRing[k] && !n.q[k])))
            return "OR";
        if (n.adj[j].length === 2 && ((n.el[k] === "S" && oxo(n, k).length === 2) || n.el[k] === "P") && !n.inRing[k] && !n.q[k])
            return "bridge";
        return undefined;
    }
    if (n.el[j] === "S" && !n.inRing[j] && n.adj[j].length === 2 && plainC(n, n.adj[j].find((y) => y !== x)))
        return "SR";
    if (n.el[j] !== "N")
        return undefined;
    if (n.inRing[j])
        return "Nring";
    if (azideN(n, j) === x)
        return "N3";
    if (n.adj[j].length === 2 && !n.h[j]) {
        const c = n.adj[j].find((y) => y !== x);
        if (n.el[c] === "C" && n.ord(j, c) === 2 && n.carbonylO[c] < 0 && !n.isNitrileC(c) && n.el[x] === "S")
            return "N";
    }
    return single(n, j) && n.adj[j].length + n.h[j] === 3 && n.adj[j].every((y) => y === x || plainC(n, y) || (n.el[y] === "S" && !n.inRing[y] && oxo(n, y).length === 2) || nitrosoOrAmino(n, y, j) || (namer_ts_1.HALO[n.el[y]] && n.adj[y].length === 1) || (n.el[y] === "C" && (n.group[y] === "amide" || n.group[y] === "urea" || n.group[y] === "carbamate"))) ? "N" : undefined;
}
function nitrosoOrAmino(n, y, j) {
    if (n.el[y] !== "N" || n.inRing[y] || n.q[y] || n.ord(y, j) !== 1)
        return false;
    const rest = n.adj[y].filter((k) => k !== j);
    if (rest.length === 1 && n.el[rest[0]] === "O" && n.ord(y, rest[0]) === 2 && n.adj[rest[0]].length === 1)
        return true;
    if (single(n, y) && n.adj[y].length + n.h[y] === 3 && rest.every((k) => plainC(n, k)))
        return true;
    return rest.length === 1 && !n.h[y] && n.el[rest[0]] === "C" && n.ord(y, rest[0]) === 2 && n.carbonylO[rest[0]] < 0;
}
function azideN(n, i) {
    if (n.el[i] !== "N" || n.q[i] || n.adj[i].length !== 2)
        return undefined;
    const mid = n.adj[i].find((j) => n.el[j] === "N" && n.q[j] === 1 && n.ord(i, j) === 2);
    if (mid === undefined || n.adj[mid].length !== 2)
        return undefined;
    const end = n.adj[mid].find((j) => j !== i);
    if (n.el[end] !== "N" || n.q[end] !== -1 || n.adj[end].length !== 1 || n.ord(mid, end) !== 2)
        return undefined;
    const x = n.adj[i].find((j) => j !== mid);
    return n.ord(i, x) === 1 ? x : undefined;
}
function azideAtoms(n, i) {
    const mid = n.adj[i].find((j) => n.q[j] === 1);
    return [i, mid, n.adj[mid].find((j) => j !== i)];
}
function perceiveSulfur(n) {
    for (let s = 0; s < n.n; s++) {
        if (n.el[s] !== "S" || n.inRing[s] || n.q[s] || n.h[s])
            continue;
        const os = oxo(n, s), rest = n.adj[s].filter((j) => !os.includes(j));
        if (!os.length || os.length > 2 || rest.length !== 2)
            continue;
        const cs = rest.filter((j) => n.el[j] === "C"), lig = rest.filter((j) => n.el[j] !== "C"), types = lig.map((j) => ligand(n, s, j));
        if (cs.length === 2 || cs.some((j) => !plainC(n, j)) || types.some((t) => !t || (t === "SR" && cs.length !== 1)) || (n.cip[s] && !(os.length === 1 && cs.length)))
            continue;
        if (cs.length === 1 && os.length === 2 && (types[0] === "OH" || types[0] === "X"))
            continue;
        const ring = lig.filter((_, k) => types[k] === "Nring");
        const on = cs.length ? cs : ring.length === 1 && types.length === 2 ? ring : [];
        const t = on.length && !cs.length ? types[1 - types.indexOf("Nring")] : on.length ? types[0] : undefined;
        n.het.set(s, "S");
        n.sulfur.add(s);
        for (const o of os)
            n.sulfur.add(o);
        lig.forEach((j, k) => {
            if (types[k] === "OH" || types[k] === "X")
                n.sulfur.add(j);
            else if (types[k] === "OR" || types[k] === "N" || types[k] === "bridge" || types[k] === "SR")
                n.het.set(j, `S${types[k]}`);
            if (types[k] === "N3")
                for (const a of azideAtoms(n, j))
                    n.het.set(a, "SN3");
            if (types[k] === "N")
                for (const y of n.adj[j])
                    if (y !== s && n.el[y] === "N" && !n.het.has(y))
                        claimNN(n, y);
        });
        if (!on.length || (t === "Nring" && cs.length))
            continue;
        const kind = t === "OH" ? "sulfonic" : t === "X" || t === "N3" ? "sulfonylhalide" : t === "OR" || t === "SR" ? "sulfonate" : t === "N" ? "sulfonamide" : t === "bridge" ? "anhydride" : undefined;
        if (kind)
            n.mark(s, kind, on);
    }
}
function claimNN(n, y) {
    const o = n.adj[y].find((k) => n.el[k] === "O" && n.ord(y, k) === 2);
    n.het.set(y, o === undefined ? "NN'" : "N=O");
    if (o !== undefined)
        n.het.set(o, "N=O");
}
function suffixStereo(n, sites, others) {
    const s = sites.filter((x) => n.el[x.group] === "S" && (n.cip[x.group] === "R" || n.cip[x.group] === "S"));
    if (s.length && (others || s.length > 1 || s.some((x) => n.adj[x.group].some((j) => n.el[j] === "O" && n.ord(x.group, j) === 1 && n.h[j]))))
        throw new Error("sulfur stereo");
    return s.map((x) => ({ at: 0, text: n.cip[x.group] }));
}
function sulfonamideN(n, kind, s) {
    return kind === "sulfonamide" ? n.adj[s].find((j) => n.het.get(j) === "SN") : undefined;
}
function sulfonateName(n) {
    const all = [...n.bearer.keys()].filter((g) => n.group[g] === "sulfonate"), esterO = (g) => n.adj[g].find((j) => n.het.get(j) === "SOR");
    if (all.length > 1 && all.every((g) => esterO(g) !== undefined)) {
        const acids = all.map((g) => n.parentName("sulfonate", new Set(), n.side(g, esterO(g)))?.text);
        const side = [...n.side(all[0], esterO(all[0]))], plain = side.every((a) => a === all[0] || n.el[a] === "C" || oxo(n, all[0]).includes(a));
        const poly = acids.every((a) => a && a === acids[0]) ? polyEster(n, all.map((g) => esterO(g)), all, acids[0], plain) : undefined;
        if (poly)
            return poly;
    }
    const s = all[0];
    const o = n.adj[s].find((j) => n.het.get(j) === "SOR" || n.het.get(j) === "SSR"), r = n.adj[o].find((j) => j !== s);
    const acid = n.parentName("sulfonate", new Set(), n.side(s, o)), alkyl = n.substituent(r, o);
    return acid && `${n.el[o] === "S" ? `S-${(0, namer_ts_1.enclose)(alkyl)}` : alkyl.text} ${acid.text}`;
}
function polyEster(n, os, centres, acid, plain) {
    const yl = n.polyolYl(os, centres);
    return yl && `${yl} ${(0, namer_ts_1.times)(os.length, { text: acid, compound: !plain || /[\d([ -]/.test(acid) })}`;
}
function sulfurPrefix(n, x, from) {
    if (!n.het.has(x) && n.group[x] !== "sulfonylhalide" && !n.cip[x])
        return undefined;
    const os = oxo(n, x), others = n.adj[x].filter((j) => j !== from && !os.includes(j)), word = os.length === 2 ? "sulfonyl" : "sulfinyl";
    const stereo = (t) => (n.cip[x] === "R" || n.cip[x] === "S" ? { text: `(${n.cip[x]})-${t.text}`, compound: true } : t);
    if (others.length !== 1)
        throw new Error("sulfur");
    const j = others[0];
    if (n.el[j] === "C") {
        const p = n.inRing[j] ? { atoms: n.rings[n.ringOf[j]], ring: true } : { atoms: n.bestChain(j, x), ring: false };
        return stereo({ text: n.nameParent(p, { attach: [j, x], sulfo: word }).text, compound: true });
    }
    const t = ligand(n, x, j);
    if (t === "OH")
        return { text: os.length === 2 ? "sulfo" : "sulfino", compound: false };
    if (t === "X")
        return { text: `${namer_ts_1.HALO[n.el[j]]}${word}`, compound: true };
    if (t === "N3")
        return { text: `azido${word}`, compound: true };
    if (t === "SR")
        return { text: `${(0, namer_ts_1.enclose)(n.substituent(j, x))}${word}`, compound: true };
    if (t === "OR")
        return { text: `${(0, namer_ts_1.enclose)(n.substituent(j, x))}${word}`.replace(/^\(([a-z-]+oxy)\)(sulf[a-z]+)$/, "$1$2"), compound: true };
    if (t === "N") {
        const subs = n.adj[j].filter((y) => y !== x).map((y) => n.substituent(y, j)), amoyl = os.length === 2 ? "sulfamoyl" : "sulfinamoyl";
        return { text: `${(0, namer_ts_1.substituted)(subs)}${amoyl}`, compound: subs.length > 0 };
    }
    if (t === "Nring")
        return { text: `${(0, namer_ts_1.enclose)(n.substituent(j, x))}${word}`, compound: true };
    throw new Error("sulfur");
}
function perceiveCentres(n) {
    for (let p = 0; p < n.n; p++) {
        if (n.inRing[p] || n.cip[p] || n.het.has(p))
            continue;
        if (n.el[p] === "P" && !n.q[p] && !n.h[p] && n.adj[p].length === 4) {
            const dbl = n.adj[p].filter((j) => n.ord(p, j) === 2);
            if (dbl.length === 1 && n.el[dbl[0]] === "C" && n.carbonylO[dbl[0]] < 0 && n.adj[p].every((j) => n.el[j] === "C" && (j === dbl[0] || plainC(n, j)))) {
                n.het.set(p, "P=C");
                continue;
            }
        }
        if (n.el[p] === "N") {
            nitrate(n, p);
            continue;
        }
        if (namer_ts_1.HALO[n.el[p]]) {
            hypohalite(n, p);
            continue;
        }
        if (n.el[p] !== "P" || n.q[p])
            continue;
        const os = [...oxo(n, p), ...thioxo(n, p)], rest = n.adj[p].filter((j) => !os.includes(j));
        if (os.length > 1 || rest.some((j) => n.ord(p, j) !== 1) || os.length + rest.length + n.h[p] !== (os.length ? 4 : 3))
            continue;
        const lig = rest.filter((j) => n.el[j] !== "C" || cyanide(n, j)), types = lig.map((j) => ligand(n, p, j));
        if (rest.some((j) => n.el[j] === "C" && !plainC(n, j) && !cyanide(n, j)) || types.some((t) => !t))
            continue;
        if (!lig.length) {
            if (os.length === 1 && n.el[os[0]] === "S" && !n.h[p]) {
                n.het.set(p, "PS3");
                n.het.set(os[0], "P-");
            }
            continue;
        }
        n.het.set(p, "P");
        for (const o of os)
            n.het.set(o, "P-");
        lig.forEach((j, k) => {
            if (types[k] === "N3")
                for (const a of azideAtoms(n, j))
                    n.het.set(a, "P-");
            else if (types[k] !== "Nring" && !n.het.has(j))
                n.het.set(j, "P-");
            if (types[k] === "N")
                for (const y of n.adj[j])
                    if (y !== p && n.el[y] === "N" && !n.het.has(y))
                        claimNN(n, y);
            if (cyanide(n, j))
                for (const y of n.adj[j])
                    if (y !== p)
                        n.het.set(y, "P-");
        });
    }
}
const cyanide = (n, c) => n.el[c] === "C" && !n.inRing[c] && !n.q[c] && n.adj[c].length === 2
    && n.adj[c].some((j) => n.el[j] === "N" && n.ord(c, j) === 3 && n.adj[j].length === 1 && !n.q[j]);
function hypohalite(n, x) {
    const o = n.adj[x][0];
    if (n.adj[x].length !== 1 || n.q[x] || n.el[o] !== "O" || n.inRing[o] || n.q[o] || n.adj[o].length !== 2 || n.het.has(o) || n.group[o] || !plainC(n, n.adj[o].find((j) => j !== x)))
        return;
    n.het.set(x, "OX");
    n.het.set(o, "OX");
}
function nitrate(n, x) {
    const os = n.adj[x].filter((j) => n.el[j] === "O" && !n.inRing[j]);
    if (os.length !== n.adj[x].length || n.h[x])
        return;
    const dbl = os.filter((o) => n.ord(x, o) === 2 && n.adj[o].length === 1 && !n.q[o]), minus = os.filter((o) => n.ord(x, o) === 1 && n.adj[o].length === 1 && n.q[o] === -1);
    const ester = os.filter((o) => n.ord(x, o) === 1 && !n.q[o] && n.adj[o].length === 2 && plainC(n, n.adj[o].find((j) => j !== x)));
    const role = n.q[x] === 1 && os.length === 3 && dbl.length === 1 && minus.length === 1 && ester.length === 1 ? "NO3" : !n.q[x] && os.length === 2 && dbl.length === 1 && ester.length === 1 ? "NO2" : undefined;
    if (!role || ester.some((o) => n.het.has(o) || n.group[o]))
        return;
    for (const a of [x, ...os])
        n.het.set(a, role);
}
const nOxideO = (n, o) => {
    if (n.el[o] !== "O" || n.q[o] !== -1 || n.adj[o].length !== 1)
        return false;
    const x = n.adj[o][0];
    return n.el[x] === "N" && n.q[x] === 1 && n.adj[x].filter((j) => n.el[j] === "O").length === 1 && n.adj[x].reduce((t, j) => t + n.ord(x, j), 0) + n.h[x] === 4
        && (n.inRing[x] || n.adj[x].every((j) => n.ord(x, j) === 1));
};
const nOxideN = (n, x) => n.el[x] === "N" && n.adj[x].some((o) => nOxideO(n, o));
exports.nOxideN = nOxideN;
function nOxides(n, atoms, sites, kind, used, whole) {
    const ring = atoms.filter((a) => (0, exports.nOxideN)(n, a)), amine = kind === "amine" ? sites.map((s) => s.group).filter((g) => (0, exports.nOxideN)(n, g)) : [];
    if (!ring.length && !amine.length)
        return [];
    if (!whole || (kind && !["acid", "sulfonic", "ester", "amide", "sulfonamide", "nitrile", "aldehyde", "ketone", "alcohol", "thiol", "amine"].includes(kind)) || (ring.length && amine.length) || amine.length > 1)
        throw new Error("oxide");
    for (const x of [...ring, ...amine])
        for (const o of n.adj[x])
            if (nOxideO(n, o))
                used.add(o);
    return [...ring, ...amine];
}
function oxideText(n, oxides, label) {
    if (!oxides.length)
        return "";
    if (!n.inRing[oxides[0]])
        return " N-oxide";
    return ` ${oxides.map(label).sort((a, b) => parseInt(a) - parseInt(b)).join(",")}-${oxides.length > 1 ? namer_ts_1.MULT[oxides.length] : ""}oxide`;
}
function heteroCharged(n, i) {
    const { el, q, adj } = n;
    if ((0, namer_maingroup_ts_1.azoxy)(n, i))
        return true;
    if (el[i] === "N" && q[i]) {
        const mid = q[i] === 1 ? i : adj[i][0], first = adj[mid]?.find((j) => j !== i && !q[j]) ?? (q[i] === 1 ? adj[i].find((j) => !q[j]) : undefined);
        const on = first === undefined ? undefined : azideN(n, first);
        if (on !== undefined && (el[on] === "S" || el[on] === "P"))
            return true;
    }
    if (nOxideO(n, i) || (el[i] === "N" && q[i] === 1 && adj[i].some((o) => nOxideO(n, o))))
        return true;
    if (el[i] === "P" && q[i] === 1)
        return !n.inRing[i] && adj[i].length + n.h[i] === 4 && adj[i].every((j) => el[j] === "C" && n.ord(i, j) === 1);
    const x = el[i] === "N" ? i : el[i] === "O" && q[i] === -1 && adj[i].length === 1 ? adj[i][0] : -1;
    if (x < 0 || el[x] !== "N" || q[x] !== 1 || n.inRing[x] || adj[x].length !== 3 || !adj[x].every((j) => el[j] === "O"))
        return false;
    const os = adj[x];
    return os.filter((o) => q[o] === -1 && adj[o].length === 1).length === 1 && os.filter((o) => n.ord(x, o) === 2 && !q[o]).length === 1
        && os.some((o) => !q[o] && n.ord(x, o) === 1 && adj[o].length === 2);
}
const centreOf = (n, x) => {
    const os = n.el[x] === "P" ? [...oxo(n, x), ...thioxo(n, x)] : oxo(n, x), rest = n.adj[x].filter((j) => !os.includes(j));
    const cn = (j) => n.el[x] === "P" && cyanide(n, j), lig = rest.filter((j) => n.el[j] !== "C" || cn(j));
    return { at: x, os, cs: rest.filter((j) => n.el[j] === "C" && !cn(j)), lig, types: lig.map((j) => ligand(n, x, j) ?? "?") };
};
function centreClass(n, x) {
    const role = n.het.get(x);
    if (role === "NO3" || role === "NO2" || role === "OX")
        return "ester";
    const c = centreOf(n, x);
    if (c.types.includes("bridge")) {
        const chain = phosphateChain(n, x);
        return !chain ? undefined : chain.oh ? "acid" : "ester";
    }
    if (c.types.some((t) => t === "Nring" || t === "?"))
        return undefined;
    if (c.types.includes("SR") || c.os.some((o) => n.el[o] === "S"))
        return c.types.every((t) => t === "OR" || t === "SR") ? "ester" : undefined;
    return c.types.includes("OH") ? "acid" : c.types.includes("OR") ? "ester" : c.types.includes("X") || c.types.includes("N3") ? "halide" : c.types.includes("N") ? "amide" : undefined;
}
const OUTRANKED_BY = { acid: "tellurinic", ester: "sulfonate", halide: "sulfonylhalide", amide: "sulfonamide" };
const HALIDE_STEM = { F: "fluorid", Cl: "chlorid", Br: "bromid", I: "iodid", C: "cyanid" };
function esterPart(n, c) {
    const ors = c.lig.filter((_, k) => c.types[k] === "OR"), oh = c.types.filter((t) => t === "OH").length;
    const names = ors.map((o) => n.substituent(n.adj[o].find((j) => j !== c.at), o));
    return `${(0, namer_ts_1.alkylWords)(names)} ${oh ? `${namer_ts_1.MULT[oh]}hydrogen ` : ""}`;
}
function halideOf(n, c) {
    const els = new Set(c.lig.filter((_, k) => c.types[k] === "X").map((j) => n.el[j]));
    if (els.size !== 1)
        throw new Error("mixed halides");
    return [...els][0];
}
function amideSubs(n, c) {
    const ns = c.lig.filter((_, k) => c.types[k] === "N").map((j) => ({ j, subs: n.adj[j].filter((y) => y !== c.at).map((y) => n.substituent(y, j)) }));
    ns.sort((a, b) => b.subs.length - a.subs.length || a.subs.map((x) => x.text).join().localeCompare(b.subs.map((x) => x.text).join()));
    return ns.flatMap((a, k) => a.subs.map((name) => ({ loc: `N${"'".repeat(k)}`, name })));
}
function phosphorusName(n, c) {
    const nR = c.cs.length + n.h[c.at], five = c.os.length === 1, rs = c.cs.map((j) => n.substituent(j, c.at));
    if (nR > 2)
        throw new Error("phosphorus");
    const base = ["phosphor", "phosphon", "phosphin"][nR], count = (t) => c.types.filter((x) => x === t).length;
    if (count("SR") || c.os.some((o) => n.el[o] === "S"))
        return thiophosphateName(n, c, base, (0, namer_ts_1.substituted)(rs));
    const o = count("OH") + count("OR"), x = count("X"), nn = count("N");
    if (count("N3")) {
        if (x || nn || count("N3") > 1 || !five)
            throw new Error("phosphorus");
        const stem = `${base}${nR ? "o" : ""}azid`;
        return count("OR") ? `${esterPart(n, c)}${(0, namer_ts_1.substituted)(rs)}${stem}ate` : `${(0, namer_ts_1.substituted)(rs)}${stem}ic acid`;
    }
    if (x && !o && !nn) {
        const hal = halideOf(n, c), word = { F: "fluoride", Cl: "chloride", Br: "bromide", I: "iodide", C: "cyanide" }[hal];
        if (!five)
            return `${(0, namer_ts_1.substituted)([...c.lig.map((j) => ({ text: namer_ts_1.HALO[n.el[j]] ?? "cyano", compound: false })), ...rs])}phosphane`;
        return nR ? `${(0, namer_ts_1.substituted)(rs)}${base}ic ${namer_ts_1.MULT[x]}${word}` : `phosphoryl ${namer_ts_1.MULT[x]}${word}`;
    }
    if (nn === 1 && x === 1 && five && nR === 0 && o === count("OR")) {
        const stem = `phosphoramido${HALIDE_STEM[halideOf(n, c)]}`, list = amideSubs(n, c);
        return o ? `${esterPart(n, c)}${letterPrefixes(list)}${stem}ate` : `${letterPrefixes(list)}${stem}ic acid`;
    }
    if (nn && !x) {
        const list = [...rs.map((name) => ({ loc: "P", name })), ...amideSubs(n, c)];
        if (!o)
            return `${letterPrefixes(list)}${base}${five ? "ic" : "ous"} ${namer_ts_1.MULT[nn]}amide`;
        if (!five || nR > 1)
            throw new Error("phosphorus");
        const stem = `${base}${nR ? "" : "o"}${nn > 1 ? `${namer_ts_1.MULT[nn]}amid` : "amid"}`.replace(/^phosphoroamid/, "phosphoramid");
        return count("OR") ? `${esterPart(n, c)}${letterPrefixes(list)}${stem}ate` : `${letterPrefixes(list)}${stem}ic acid`;
    }
    if (nn)
        throw new Error("phosphorus");
    const r = (0, namer_ts_1.substituted)(rs);
    if (x) {
        if (!five)
            throw new Error("phosphorus");
        const stem = `${base}o${x > 1 ? namer_ts_1.MULT[x] : ""}${HALIDE_STEM[halideOf(n, c)]}`;
        return count("OR") ? `${esterPart(n, c)}${r}${stem}ate` : `${r}${stem}ic acid`;
    }
    return count("OR") ? `${esterPart(n, c)}${r}${base.replace(/or$/, "")}${five ? "ate" : "ite"}` : `${r}${base}${five ? "ic" : "ous"} acid`;
}
function phosphateChain(n, x) {
    const ok = (p) => n.het.get(p) === "P" && oxo(n, p).length === 1 && !n.h[p] && centreOf(n, p).cs.length === 0 && centreOf(n, p).types.every((t) => t === "OH" || t === "OR" || t === "bridge");
    const next = (p, not) => centreOf(n, p).lig.filter((o) => ligand(n, p, o) === "bridge").map((o) => n.adj[o].find((j) => j !== p)).filter((q) => q !== not);
    if (!ok(x))
        return undefined;
    let end = x, prev = -1;
    for (let steps = 0; steps < 8; steps++) {
        const q = next(end, prev);
        if (!q.length)
            break;
        if (q.length > 1)
            return undefined;
        prev = end;
        end = q[0];
    }
    if (!ok(end))
        return undefined;
    const ps = [end];
    for (let q = next(end, -1); q.length && ps.length < 8; q = next(ps[ps.length - 1], ps[ps.length - 2] ?? -1)) {
        if (q.length > 1 || !ok(q[0]))
            return undefined;
        ps.push(q[0]);
    }
    if (ps.length < 2)
        return undefined;
    return { ps, oh: ps.reduce((t, p) => t + centreOf(n, p).types.filter((t2) => t2 === "OH").length, 0) };
}
function phosphateChainName(n, chain) {
    const k = chain.ps.length, ors = chain.ps.flatMap((p) => centreOf(n, p).lig.filter((o) => ligand(n, p, o) === "OR").map((o) => ({ p, o })));
    if (!ors.length)
        return `${namer_ts_1.MULT[k]}phosphoric acid`;
    if (ors.length > 1 && chain.oh)
        throw new Error("phosphate esters");
    if (ors.length === 1 && chain.oh && ors[0].p !== chain.ps[0] && ors[0].p !== chain.ps[k - 1])
        throw new Error("phosphate esters");
    const names = ors.map(({ p, o }) => n.substituent(n.adj[o].find((j) => j !== p), o));
    return `${(0, namer_ts_1.alkylWords)(names)} ${chain.oh ? `${namer_ts_1.MULT[chain.oh]}hydrogen ` : ""}${namer_ts_1.MULT[k]}phosphate`;
}
function thiophosphateName(n, c, base, r) {
    const groups = new Map();
    c.lig.forEach((j, k) => {
        const name = n.substituent(n.adj[j].find((y) => y !== c.at), j), g = groups.get(name.text) ?? { name, locs: [] };
        g.locs.push(c.types[k] === "SR" ? "S" : "O");
        groups.set(name.text, g);
    });
    const ss = c.types.filter((t) => t === "SR").length + c.os.filter((o) => n.el[o] === "S").length;
    const esters = [...groups.values()].sort((a, b) => (0, namer_ts_1.alphaKey)(a.name.text).localeCompare((0, namer_ts_1.alphaKey)(b.name.text))).map((g) => {
        const m = g.locs.length, word = m > 1 ? (g.name.compound ? `${namer_ts_1.MULT_COMPLEX[m]}${(0, namer_ts_1.enclose)(g.name)}` : namer_ts_1.MULT[m] + g.name.text) : (0, namer_ts_1.enclose)(g.name);
        return `${g.locs.sort().join(",")}-${word}`;
    }).join(" ");
    return `${esters} ${r}${base}o${ss > 1 ? namer_ts_1.MULT[ss] : ""}thioate`;
}
function sulfuricName(n, c) {
    const six = c.os.length === 2, count = (t) => c.types.filter((x) => x === t).length;
    const o = count("OH") + count("OR"), x = count("X"), nn = count("N");
    const word = (hal) => ({ F: "fluoride", Cl: "chloride", Br: "bromide", I: "iodide" })[hal];
    if (x === 2)
        return `${six ? "sulfuryl" : "sulfurous"} di${word(halideOf(n, c))}`;
    if (!six) {
        if (o === 2)
            return count("OR") ? `${esterPart(n, c)}sulfite`.replace(/ $/, "") : "sulfurous acid";
        if (nn === 2)
            return `${letterPrefixes(amideSubs(n, c))}sulfurous diamide`;
        throw new Error("sulfur");
    }
    if (nn === 2)
        return `${letterPrefixes(amideSubs(n, c))}sulfuric diamide`;
    if (nn === 1) {
        const subs = (0, namer_ts_1.substituted)(amideSubs(n, c).map((a) => a.name));
        if (x)
            return `${subs}sulfamoyl ${word(halideOf(n, c))}`;
        return count("OR") ? `${esterPart(n, c)}${subs}sulfamate` : `${subs}sulfamic acid`;
    }
    if (x)
        return count("OR") ? `${esterPart(n, c)}sulfuro${HALIDE_STEM[halideOf(n, c)]}ate` : `sulfuro${HALIDE_STEM[halideOf(n, c)]}ic acid`;
    return count("OR") ? `${esterPart(n, c)}sulfate`.replace(/ $/, "") : "sulfuric acid";
}
function sulfonicAnhydrideName(n) {
    const ss = [...n.bearer.keys()].filter((g) => n.group[g] === "anhydride");
    if (ss.length !== 2 || ss.some((g) => n.el[g] !== "S"))
        return undefined;
    const o = n.adj[ss[0]].find((j) => n.het.get(j) === "Sbridge" && n.adj[j].includes(ss[1]));
    if (o === undefined)
        throw new Error("anhydride");
    const acids = ss.map((g) => {
        n.group[g] = "sulfonic";
        try {
            return n.parentName("sulfonic", new Set(), n.side(g, o))?.text.replace(/ acid$/, "");
        }
        finally {
            n.group[g] = "anhydride";
        }
    });
    if (acids.some((a) => !a))
        throw new Error("anhydride");
    return acids[0] === acids[1] ? `${acids[0]} anhydride` : `${acids.sort((a, b) => (0, namer_ts_1.alphaKey)(a).localeCompare((0, namer_ts_1.alphaKey)(b))).join(" ")} anhydride`;
}
function centreName(n, kind) {
    const centres = [...n.het].filter(([x, r]) => (r === "S" && !n.group[x]) || r === "P" || ((r === "NO3" || r === "NO2") && n.el[x] === "N") || (r === "OX" && n.el[x] !== "O")).map(([x]) => x);
    const order = ["acid", "ester", "halide", "amide"];
    const ranked = centres.map((x) => ({ x, cls: centreClass(n, x) })).filter((c) => c.cls).sort((a, b) => order.indexOf(a.cls) - order.indexOf(b.cls));
    const best = ranked[0];
    if (!best)
        return undefined;
    if (kind && namer_ts_1.SENIORITY.indexOf(kind) <= namer_ts_1.SENIORITY.indexOf(OUTRANKED_BY[best.cls]))
        return undefined;
    if (kind === "aminium")
        return undefined;
    const x = best.x, role = n.het.get(x);
    if (role === "OX") {
        const o = n.adj[x][0];
        return `${n.substituent(n.adj[o].find((j) => j !== x), o).text} hypo${{ F: "fluor", Cl: "chlor", Br: "brom", I: "iod" }[n.el[x]]}ite`;
    }
    if (n.el[x] === "P" && centreOf(n, x).types.includes("bridge"))
        return phosphateChainName(n, phosphateChain(n, x));
    if (role === "NO3" || role === "NO2") {
        const ns = [...n.het].filter(([y, r]) => r === role && n.el[y] === "N").map(([y]) => y), esterO = (y) => n.adj[y].find((j) => n.adj[j].length === 2);
        const poly = ns.length > 1 ? polyEster(n, ns.map(esterO), ns, role === "NO3" ? "nitrate" : "nitrite", true) : undefined;
        if (poly)
            return poly;
        const o = n.adj[x].find((j) => n.adj[j].length === 2);
        return `${n.substituent(n.adj[o].find((j) => j !== x), o).text} ${role === "NO3" ? "nitrate" : "nitrite"}`;
    }
    const c = centreOf(n, x);
    try {
        return n.el[x] === "P" ? phosphorusName(n, c) : sulfuricName(n, c);
    }
    catch {
        return undefined;
    }
}
function centrePrefix(n, x, from) {
    const role = n.het.get(x);
    if (role === "NO3" || role === "NO2")
        return n.el[x] === "N" ? { text: role === "NO3" ? "nitro" : "nitroso", compound: false } : undefined;
    if (role === "P=C") {
        const subs = n.adj[x].filter((j) => j !== from).map((j) => (n.ord(x, j) === 2 ? ylidene(n, j, x) : n.substituent(j, x)));
        return { text: `${(0, namer_ts_1.substituted)(subs)}-λ5-phosphanyl${n.ord(x, from) === 2 ? "idene" : ""}`, compound: true };
    }
    if (role !== "P" && role !== "PS3")
        return undefined;
    if (n.h[x])
        throw new Error("phosphorus");
    const os = [...oxo(n, x), ...thioxo(n, x)], subs = n.adj[x].filter((j) => j !== from && !os.includes(j)).map((j) => n.substituent(j, x));
    const word = !os.length ? "phosphanyl" : n.el[os[0]] === "S" ? "phosphorothioyl" : "phosphoryl";
    if (word === "phosphoryl" && subs.length === 2 && subs.every((s) => s.text === "hydroxy"))
        return { text: "phosphono", compound: false };
    return { text: `${(0, namer_ts_1.substituted)(subs)}${word}`, compound: true };
}
function heteroPrefix(n, x, from) {
    const role = n.het.get(x), el = n.el[x];
    if (el === "C" && n.el[from] === "N" && n.ord(x, from) === 2 && n.carbonylO[x] < 0)
        return ylidene(n, x, from);
    if (el === "S" && n.sulfur.has(x) && oxo(n, x).length)
        return sulfurPrefix(n, x, from);
    if (el === "P" || (el === "N" && role?.startsWith("NO"))) {
        const c = centrePrefix(n, x, from);
        if (c)
            return c;
    }
    const o = el === "O" && !n.inRing[x] ? n.adj[x].find((j) => j !== from && n.el[j] === "O" && !n.inRing[j]) : undefined;
    if (o !== undefined) {
        const r = n.adj[o].find((j) => j !== x);
        if (r === undefined)
            return { text: "hydroperoxy", compound: false };
        const s = n.substituent(r, o);
        return { text: `${s.text === "tert-butyl" ? s.text : (0, namer_ts_1.enclose)(s)}peroxy`, compound: true };
    }
    if (el === "N" && (!role || role === "NN'") && !n.inRing[x] && !n.q[x] && !n.h[x] && n.adj[x].length === 2 && n.ord(x, from) === 1) {
        const c = n.adj[x].find((j) => j !== from);
        if (n.el[c] === "C" && n.ord(x, c) === 2 && n.carbonylO[c] < 0)
            return { text: `${(0, namer_ts_1.enclose)(ylidene(n, c, x))}amino`, compound: true };
    }
    if (!role)
        return undefined;
    if (role === "N3" && el === "N")
        return triazenyl(n, x);
    if (role === "I3" && el === "I") {
        const dbl = oxo(n, x);
        if (dbl.length)
            return { text: dbl.length === 1 ? "iodosyl" : "iodyl", compound: false };
        return { text: `${(0, namer_ts_1.substituted)(n.adj[x].filter((j) => j !== from).map((j) => n.substituent(j, x)))}-λ3-iodanyl`, compound: true };
    }
    if (role === "SS") {
        let k = 1, at = x, prev = from;
        for (;;) {
            const next = n.adj[at].find((j) => j !== prev && n.el[j] === "S");
            if (next === undefined)
                break;
            prev = at;
            at = next;
            k++;
        }
        const r = n.adj[at].find((j) => j !== prev);
        const word = `${namer_ts_1.MULT[k]}sulfanyl`;
        return r === undefined ? { text: word, compound: false } : { text: `${(0, namer_ts_1.enclose)(n.substituent(r, at))}${word}`, compound: true };
    }
    if (role === "N=O")
        return el === "N" ? { text: "nitroso", compound: false } : undefined;
    if (role === "azoxy" && el === "N")
        return (0, namer_maingroup_ts_1.azoxyPrefix)(n, x);
    if (role === "N=N") {
        const m = n.adj[x].find((j) => n.het.get(j) === "N=N"), r = n.adj[m].find((j) => j !== x);
        const ez = n.cipBond.get(n.key(x, m));
        const text = r === undefined ? "diazenyl" : `${(0, namer_ts_1.enclose)(n.substituent(r, m))}diazenyl`;
        return ez === "E" || ez === "Z" ? { text: `(${ez})-${text}`, compound: true } : { text, compound: r !== undefined };
    }
    if (role === "NN")
        return hydrazinyl(n, x, from, n.adj[x].find((j) => n.het.get(j) === "NN"), "yl");
    if (role === "hz") {
        const m = n.adj[x].find((j) => n.het.get(j) === "hz");
        if (n.ord(x, from) === 2) {
            const t = hydrazinyl(n, x, from, m, "ylidene"), ez = n.cipBond.get(n.key(x, from));
            return ez === "E" || ez === "Z" ? { text: `(${ez})-${t.text}`, compound: true } : t;
        }
        return hydrazinyl(n, x, from, m, "yl");
    }
    return undefined;
}
function hydrazinyl(n, x, from, m, end) {
    const list = [
        ...n.adj[x].filter((j) => j !== from && j !== m).map((j) => ({ loc: "1", name: hydrazineSub(n, j, x) })),
        ...n.adj[m].filter((j) => j !== x).map((j) => ({ loc: "2", name: hydrazineSub(n, j, m) })),
    ];
    return { text: `${(0, namer_ts_1.assemblePrefixes)(list, false)}hydrazin${end}`, compound: list.length > 0 };
}
function triazene(n, x) {
    const m = n.adj[x].find((j) => n.het.get(j) === "N3"), y = n.adj[m].find((j) => j !== x);
    const ns = n.ord(x, m) === 2 ? [x, m, y] : [y, m, x], ez = n.cipBond.get(n.key(ns[0], ns[1]));
    return { ns, ez: ez === "E" || ez === "Z" ? `(1${ez})-` : "" };
}
function triazenyl(n, x) {
    const { ns, ez } = triazene(n, x);
    if (ns[0] !== x)
        throw new Error("triazene");
    const list = n.adj[ns[2]].filter((j) => j !== ns[1]).map((j) => ({ loc: "3", name: n.substituent(j, ns[2]) }));
    return { text: `${ez}${(0, namer_ts_1.assemblePrefixes)(list, false)}triaz-1-en-1-yl`, compound: true };
}
function triazeneName(n, x) {
    const { ns, ez } = triazene(n, x);
    const list = [...n.adj[ns[0]].filter((j) => j !== ns[1]).map((j) => ({ loc: "1", name: n.substituent(j, ns[0]) })), ...n.adj[ns[2]].filter((j) => j !== ns[1]).map((j) => ({ loc: "3", name: n.substituent(j, ns[2]) }))];
    return `${ez}${(0, namer_ts_1.assemblePrefixes)(list, false)}triaz-1-ene`;
}
function hydrazineSub(n, j, on) {
    return n.ord(j, on) === 2 ? ylidene(n, j, on) : n.substituent(j, on);
}
function ylidene(n, c, from) {
    const named = n.ylidene(c, from), ez = n.cipBond.get(n.key(c, from));
    return ez === "E" || ez === "Z" ? { text: `(${ez})-${named.text}`, compound: true } : named;
}
function heteroParentName(n, kind) {
    if (kind === "anhydride")
        return sulfonicAnhydrideName(n);
    if (kind === "sulfonylhalide") {
        const s = [...n.bearer.keys()].find((g) => n.group[g] === "sulfonylhalide" && n.adj[g].some((j) => n.het.get(j) === "SN3"));
        if (s !== undefined) {
            const t = n.parentName("sulfonylhalide", new Set())?.text;
            return t && `${t} azide`;
        }
    }
    const centre = centreName(n, kind);
    if (centre || kind)
        return centre;
    const roles = [...n.het.values()];
    if (roles.includes("azoxy"))
        return (0, namer_maingroup_ts_1.azoxyName)(n);
    const ylides = [...n.het].filter(([, r]) => r === "P=C").map(([x]) => x), sulfides = [...n.het].filter(([, r]) => r === "PS3").map(([x]) => x);
    if (sulfides.length === 1 && !ylides.length) {
        const x = sulfides[0];
        return `${(0, namer_ts_1.substituted)(n.adj[x].filter((j) => n.el[j] === "C").map((j) => n.substituent(j, x)))}phosphane sulfide`;
    }
    const triazenes = [...n.het].filter(([x, r]) => r === "N3" && n.adj[x].some((j) => n.het.get(j) === "N3" && n.ord(x, j) === 2) && n.adj[x].filter((j) => n.het.get(j) === "N3").length === 1).map(([x]) => x);
    if (triazenes.length === 1 && !ylides.length)
        return triazeneName(n, triazenes[0]);
    if (ylides.length === 1) {
        const x = ylides[0];
        return `${(0, namer_ts_1.substituted)(n.adj[x].map((j) => (n.ord(x, j) === 2 ? ylidene(n, j, x) : n.substituent(j, x))))}-λ5-phosphane`;
    }
    const count = (r) => roles.filter((x) => x === r).length;
    const pair = (r) => { const a = [...n.het].find(([, v]) => v === r)[0]; return [a, n.adj[a].find((j) => n.het.get(j) === r)]; };
    if (count("NN") === 2 && !count("hz") && !count("N=N")) {
        const [a, b] = pair("NN");
        return hydrazineName(n, a, b);
    }
    if (count("hz") === 2 && !count("NN") && !count("N=N")) {
        const [a, b] = pair("hz");
        return hydrazineName(n, a, b);
    }
    if (count("N=N") === 2 && !count("NN") && !count("hz")) {
        const [a, b] = pair("N=N");
        const subs = [a, b].flatMap((x) => n.adj[x].filter((j) => n.het.get(j) !== "N=N").map((j) => n.substituent(j, x)));
        const ez = n.cipBond.get(n.key(a, b));
        return `${ez === "E" || ez === "Z" ? `(${ez})-` : ""}${(0, namer_ts_1.substituted)(subs)}diazene`;
    }
    if (count("NO") === 2 && !count("NN") && !count("hz") && !count("N=N")) {
        const [a, b] = pair("NO"), [nn, o] = n.el[a] === "N" ? [a, b] : [b, a];
        const list = [...n.adj[nn].filter((j) => j !== o).map((j) => ({ loc: "N", name: n.substituent(j, nn) })), ...n.adj[o].filter((j) => j !== nn).map((j) => ({ loc: "O", name: n.substituent(j, o) }))];
        return `${letterPrefixes(list)}hydroxylamine`;
    }
    return undefined;
}
function hydrazineName(n, a, b) {
    const subs = (x, y) => n.adj[x].filter((j) => j !== y).map((j) => hydrazineSub(n, j, x));
    const sa = subs(a, b), sb = subs(b, a);
    const list = (first, second) => [...first.map((name) => ({ loc: "1", name })), ...second.map((name) => ({ loc: "2", name }))];
    const options = [list(sa, sb), list(sb, sa)];
    const key = (l) => [...l.map((x) => x.loc).sort().join(","), "|", ...l.slice().sort((x, y) => (0, namer_ts_1.alphaKey)(x.name.text).localeCompare((0, namer_ts_1.alphaKey)(y.name.text))).map((x) => x.loc)].join("");
    options.sort((x, y) => (key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0));
    const best = options[0];
    return `${(0, namer_ts_1.assemblePrefixes)(best, best.length === 1)}hydrazine`;
}
function letterPrefixes(list) {
    const groups = new Map();
    for (const p of list) {
        const g = groups.get(p.name.text) ?? { name: p.name, locs: [] };
        g.locs.push(p.loc);
        groups.set(p.name.text, g);
    }
    return [...groups.values()].sort((x, y) => (0, namer_ts_1.alphaKey)(x.name.text).localeCompare((0, namer_ts_1.alphaKey)(y.name.text))).map((g) => {
        const m = g.locs.length, word = m > 1 ? (g.name.compound ? `${["", "", "bis", "tris"][m]}${(0, namer_ts_1.enclose)(g.name)}` : namer_ts_1.MULT[m] + g.name.text) : (0, namer_ts_1.enclose)(g.name);
        return `${g.locs.sort().join(",")}-${word}`;
    }).join("-");
}

  };
  defs["complexes.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complexName = complexName;
exports.complexNameReads = complexNameReads;
const naming_ts_1 = require("naming.ts");
const namer_ts_1 = require("namer.ts");
const metals_ts_1 = require("metals.ts");
const namer_multiplicative_ts_1 = require("namer-multiplicative.ts");
const cip_ts_1 = require("cip.ts");
const MOST_ATOMS = 600, MOST_METALS = 6, MOST_DEPTH = 24, MOST_NAME = 3000;
const MULT = ["", "", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa", "nona", "deca", "undeca", "dodeca"];
const MULTK = ["", "", "bis", "tris", "tetrakis", "pentakis", "hexakis", "heptakis", "octakis", "nonakis", "decakis", "undecakis", "dodecakis"];
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const ATE = {
    Fe: "ferrate", Cu: "cuprate", Ag: "argentate", Au: "aurate", Pb: "plumbate", Sn: "stannate", Hg: "mercurate", Mo: "molybdate",
    W: "tungstate", Mn: "manganate", Sb: "antimonate", B: "borate", Si: "silicate", P: "phosphate", As: "arsenate",
};
const ateOf = (el) => ATE[el] ?? metals_ts_1.ELEMENTS.get(el).replace(/(ium|um|ese)$/, "") + "ate";
const GROUP = { B: 3, Al: 3, Ga: 3, In: 3, Si: 4, Ge: 4, Sn: 4, Pb: 4, P: 5, As: 5, Sb: 5 }, MAIN = new Set(Object.keys(GROUP));
const NAMES = new Map();
for (const [el, name] of metals_ts_1.ELEMENTS)
    if ((0, metals_ts_1.isMetal)(el) || MAIN.has(el)) {
        NAMES.set(name, { el, ate: false });
        NAMES.set(ateOf(el), { el, ate: true });
    }
const MARK = {
    H: [3, 4], B: [9, 12], C: [13, 14], N: [15, 13], O: [18, 17], F: [18, 17], Si: [29, 30], P: [32, 33], S: [34, 33],
    Cl: [37, 36], As: [74, 73], Se: [77, 78], Br: [81, 82], Sb: [123, 125], Te: [125, 123], I: [129, 131],
};
const DONORS = new Set(["N", "P", "As", "Sb", "O", "S", "Se", "Te", "F", "Cl", "Br", "I"]);
const NORMAL = {
    H: { 0: [1], [-1]: [0], 1: [0] }, B: { 0: [3], [-1]: [4] }, C: { 0: [4], [-1]: [3], 1: [3] }, Si: { 0: [4] },
    N: { 0: [3], 1: [4], [-1]: [2], [-2]: [1], [-3]: [0] }, P: { 0: [3, 5], 1: [4], [-1]: [2], [-2]: [1], [-3]: [0] },
    As: { 0: [3, 5], 1: [4], [-1]: [2] }, Sb: { 0: [3, 5], 1: [4], [-1]: [2] },
    O: { 0: [2], 1: [3], [-1]: [1], [-2]: [0] }, S: { 0: [2, 4, 6], 1: [3], [-1]: [1], [-2]: [0] },
    Se: { 0: [2, 4, 6], 1: [3], [-1]: [1], [-2]: [0] }, Te: { 0: [2, 4, 6], 1: [3], [-1]: [1], [-2]: [0] },
    F: { 0: [1], [-1]: [0] }, Cl: { 0: [1], [-1]: [0] }, Br: { 0: [1], [-1]: [0] }, I: { 0: [1], [-1]: [0] },
};
const LEX = {
    F: { form: "fluorido", charge: -1, ox: true }, Cl: { form: "chlorido", charge: -1, ox: true }, Br: { form: "bromido", charge: -1, ox: true },
    I: { form: "iodido", charge: -1, ox: true }, H: { form: "hydrido", charge: -1, ox: true }, O: { form: "oxido", charge: -2, ox: true },
    S: { form: "sulfido", charge: -2, ox: true }, N: { form: "nitrido", charge: -3, ox: true }, OH: { form: "hydroxido", charge: -1, ox: true },
    OH2: { form: "aqua", charge: 0, ox: true }, NH3: { form: "ammine", charge: 0, ox: true }, NH2: { form: "azanido", charge: -1, ox: true },
    CO: { form: "carbonyl", charge: 0, ox: false }, CN: { form: "cyanido", charge: -1, ox: true }, NO: { form: "nitrosyl", charge: 0, ox: false },
    N3: { form: "azido", charge: -1, ox: true },
};
const LEX_FORMS = new Map(Object.entries(LEX).map(([k, v]) => [v.form, k]));
const key = (a, b) => (a < b ? `${a} ${b}` : `${b} ${a}`);
function shapeOf(g) {
    const adj = g.atoms.map(() => []), ord = new Map();
    for (const b of g.bonds) {
        adj[b.a].push(b.b);
        adj[b.b].push(b.a);
        ord.set(key(b.a, b.b), b.order);
    }
    return { g, adj, ord };
}
const valence = (s, i) => s.adj[i].reduce((t, j) => t + s.ord.get(key(i, j)), 0) + s.g.atoms[i].h;
const parts = (n, adj, keep) => {
    const seen = new Set(), out = [];
    for (let s = 0; s < n; s++) {
        if (seen.has(s) || !keep(s))
            continue;
        const part = [s];
        seen.add(s);
        for (let k = 0; k < part.length; k++)
            for (const j of adj[part[k]])
                if (!seen.has(j) && keep(j)) {
                    seen.add(j);
                    part.push(j);
                }
        out.push(part.sort((a, b) => a - b));
    }
    return out;
};
function linked(adj, u, v, keep) {
    const seen = new Set([u]), stack = [u];
    while (stack.length) {
        const i = stack.pop();
        for (const j of adj[i]) {
            if ((i === u && j === v) || seen.has(j) || !keep(j))
                continue;
            if (j === v)
                return true;
            seen.add(j);
            stack.push(j);
        }
    }
    return false;
}
function smallRing(adj, u, v, keep) {
    const far = new Map([[u, 0]]);
    for (let front = [u], d = 1; d < 7 && front.length; d++) {
        const next = [];
        for (const i of front)
            for (const j of adj[i]) {
                if ((i === u && j === v) || far.has(j) || !keep(j))
                    continue;
                if (j === v)
                    return true;
                far.set(j, d);
                next.push(j);
            }
        front = next;
    }
    return false;
}
function centresOf(s, atoms) {
    const { g, adj, ord } = s, metals = atoms.filter((i) => (0, metals_ts_1.isMetal)(g.atoms[i].el));
    if (metals.length)
        return metals;
    const inside = new Set(atoms), found = atoms.filter((x) => {
        if (!MAIN.has(g.atoms[x].el) || adj[x].some((j) => ord.get(key(x, j)) !== 1 || !(DONORS.has(g.atoms[j].el) || g.atoms[j].el === "H")))
            return false;
        const piece = new Map();
        parts(g.atoms.length, adj, (i) => inside.has(i) && i !== x).forEach((p, k) => p.forEach((i) => piece.set(i, k)));
        return new Set(adj[x].map((j) => piece.get(j))).size < adj[x].length;
    });
    return found.length === 1 ? found : [];
}
function entityOf(s, atoms) {
    const { g, adj, ord } = s, inside = new Set(atoms);
    const metals = centresOf(s, atoms);
    if (!metals.length || metals.length > MOST_METALS)
        return undefined;
    const metal = new Set(metals), mm = [];
    for (const m of metals)
        for (const j of adj[m])
            if (metal.has(j) && m < j)
                mm.push([m, j]);
    const ligands = [];
    for (const part of parts(g.atoms.length, adj, (i) => inside.has(i) && !metal.has(i))) {
        const bonds = part.flatMap((i) => adj[i].filter((j) => metal.has(j)).map((m) => ({ metal: m, atom: i, order: ord.get(key(i, m)) })));
        if (!bonds.length)
            return undefined;
        const lig = { atoms: part, q: new Map(), bonds, charge: 0 };
        const donors = [...new Set(bonds.map((b) => b.atom))];
        if (donors.some((d) => adj[d].some((j) => donors.includes(j)))) {
            const runs = parts(g.atoms.length, adj, (i) => donors.includes(i));
            if (runs.some((r) => r.length < 2) || bonds.length !== donors.length || new Set(bonds.map((b) => b.metal)).size !== 1 || bonds.some((b) => b.order !== 1) || donors.length > 8)
                return undefined;
            Object.assign(lig, { eta: donors.length, charge: part.reduce((t, i) => t + g.atoms[i].charge, 0) });
            ligands.push(lig);
            continue;
        }
        const lex = lexOf(s, part, donors);
        if (lex) {
            Object.assign(lig, { lex, charge: LEX[lex].charge });
            ligands.push(lig);
            continue;
        }
        if (donors.some((d) => g.atoms[d].el === "C")) {
            if (donors.length !== 1 || bonds.length !== 1 || bonds[0].order > 3)
                return undefined;
            Object.assign(lig, { carbon: true });
            ligands.push(lig);
            continue;
        }
        for (const d of donors) {
            const a = g.atoms[d], k = bonds.filter((b) => b.atom === d).reduce((t, b) => t + b.order, 0), left = valence(s, d) - k, states = NORMAL[a.el];
            const fits = states ? Object.entries(states).filter(([q, vs]) => vs.includes(left) && a.charge - Number(q) >= 0 && a.charge - Number(q) <= k).map(([q]) => Number(q)) : [];
            if (fits.length !== 1)
                return undefined;
            if (fits[0] !== a.charge)
                lig.q.set(d, fits[0]);
        }
        lig.charge = part.reduce((t, i) => t + (lig.q.get(i) ?? g.atoms[i].charge), 0);
        const own = new Set(part), chelated = new Set(), fixed = new Set(), mine = (i) => own.has(i), all = (i) => inside.has(i);
        for (const u of part)
            for (const v of adj[u]) {
                if (u > v || !own.has(v) || smallRing(adj, u, v, mine))
                    continue;
                const ring = smallRing(adj, u, v, all), cyclic = linked(adj, u, v, mine);
                if (ring && cyclic)
                    fixed.add(key(u, v));
                if (ord.get(key(u, v)) === 2 && (ring || (!cyclic && linked(adj, u, v, all))))
                    chelated.add(key(u, v));
            }
        if (chelated.size)
            lig.chelated = chelated;
        if (fixed.size)
            lig.fixed = fixed;
        ligands.push(lig);
    }
    const hydrides = metals.reduce((t, m) => t + g.atoms[m].h, 0), charge = atoms.reduce((t, i) => t + g.atoms[i].charge, 0);
    if (!ligands.length && !hydrides)
        return undefined;
    const top = GROUP[g.atoms[metals[0]].el], ox = charge + hydrides - ligands.reduce((t, l) => t + l.charge, 0);
    if (top && (ox <= 0 || ox > top || (top - ox) % 2))
        return undefined;
    return { metals, ligands, hydrides, mm, charge, atoms };
}
function lexOf(s, part, donors) {
    const { g, adj, ord } = s, a = (i) => g.atoms[i];
    if (part.length === 1) {
        const i = part[0], k = adj[i].reduce((t, j) => t + (part.includes(j) ? 0 : ord.get(key(i, j))), 0), left = valence(s, i) - k;
        const states = NORMAL[a(i).el], fits = states ? Object.entries(states).filter(([q, vs]) => vs.includes(left) && a(i).charge - Number(q) >= 0 && a(i).charge - Number(q) <= k) : [];
        if (fits.length !== 1)
            return undefined;
        const h = a(i).h, id = `${a(i).el}${h ? `H${h > 1 ? h : ""}` : ""}`;
        return LEX[id]?.charge === Number(fits[0][0]) && !["CO", "CN", "NO", "N3"].includes(id) ? id : undefined;
    }
    if (part.some((i) => a(i).h || part.length > 3))
        return undefined;
    const els = part.map((i) => a(i).el).sort().join("");
    const d = donors.length === 1 ? donors[0] : -1, other = part.find((i) => i !== d);
    if (part.length === 2 && d >= 0 && other !== undefined && ord.get(key(d, other)) >= 2) {
        if (els === "CO" && a(d).el === "C" && a(d).charge + a(other).charge === 0)
            return "CO";
        if (els === "CN" && a(d).el === "C" && ord.get(key(d, other)) === 3 && a(d).charge + a(other).charge === 0)
            return "CN";
        if (els === "NO" && a(d).el === "N" && a(d).charge + a(other).charge === 0)
            return "NO";
    }
    if (els === "NNN" && d >= 0 && adj[d].filter((j) => part.includes(j)).length === 1 && part.reduce((t, i) => t + a(i).charge, 0) === 0)
        return "N3";
    return undefined;
}
function ligandMol(m, g, lig, marks = new Map(), silane = false) {
    const at = new Map(lig.atoms.map((i, k) => [i, k]));
    const atoms = lig.atoms.map((i) => ({
        label: m.atoms[i].label, location: m.atoms[i].location, implicitHCount: g.atoms[i].h,
        ...((lig.q.get(i) ?? g.atoms[i].charge) ? { charge: lig.q.get(i) ?? g.atoms[i].charge } : {}), ...(marks.has(i) ? { isotope: marks.get(i) } : {}),
    }));
    const bonds = m.bonds.filter((b) => at.has(b.atoms[0]) && at.has(b.atoms[1])).map((b) => {
        const either = lig.chelated?.has(key(b.atoms[0], b.atoms[1])), stereo = either ? 3 : b.stereo;
        return { type: b.type, atoms: [at.get(b.atoms[0]), at.get(b.atoms[1])], ...(stereo ? { stereo } : {}), ...(either ? { display: "either" } : b.display ? { display: b.display } : {}) };
    });
    if (silane) {
        const b = lig.bonds[0];
        atoms.push({ label: "Si", location: m.atoms[b.metal].location, implicitHCount: 4 - b.order });
        bonds.push({ type: b.order, atoms: [at.get(b.atom), atoms.length - 1] });
    }
    return { atoms, bonds };
}
const flat = (inchi) => inchi?.split("/").filter((l, k) => k < 2 || !/^[btms]/.test(l)).join("/");
function fixedInchi(free, lig, api) {
    const text = api.aux?.(free), lines = text?.split("\n"), n = lines && /\/N:([\d,]+)(?:\/|$)/.exec(lines[1] ?? "");
    if (!lines || !n || !lines[0].startsWith("InChI="))
        return undefined;
    const at = new Map(n[1].split(",").map((x, k) => [lig.atoms[Number(x) - 1], k + 1])), pairs = new Set();
    for (const b of lig.fixed) {
        const [x, y] = b.split(" ").map((i) => at.get(Number(i)));
        if (!x || !y)
            return undefined;
        pairs.add(`${Math.max(x, y)}-${Math.min(x, y)}`);
    }
    return { inchi: unfixed(lines[0], pairs), pairs };
}
function unfixed(inchi, pairs) {
    if (!inchi || !pairs)
        return inchi;
    return inchi.split("/").flatMap((l, k) => {
        if (k < 2 || l[0] !== "b")
            return [l];
        const kept = l.slice(1).split(",").filter((x) => { const y = /^(\d+-\d+)([-+?])$/.exec(x); return !y || (y[2] !== "?" && !pairs.has(y[1])); });
        return kept.length ? [`b${kept.join(",")}`] : [];
    }).join("/");
}
const asGraph = (b) => ({ atoms: b.el.map((el, i) => ({ el, charge: b.q[i], h: b.h[i] })), bonds: b.bonds.map(([a, c, o]) => ({ a, b: c, order: o })) });
const builtMol = (b, marks) => ({
    atoms: b.el.map((el, i) => ({ label: el, location: [0, 0, 0], implicitHCount: b.h[i], ...(b.q[i] ? { charge: b.q[i] } : {}), ...(marks.get(i) ?? b.iso[i] ? { isotope: marks.get(i) ?? b.iso[i] } : {}) })),
    bonds: b.bonds.map(([a, c, o]) => ({ type: o, atoms: [a, c] })),
});
const opsinOf = (name, api) => (name.length <= 1000 && !/\s/.test(name) ? built(api.atoms(name)) : undefined);
function built(json) {
    if (!json || json.length > 2000000)
        return undefined;
    let raw;
    try {
        raw = JSON.parse(json);
    }
    catch {
        return undefined;
    }
    if (typeof raw?.smiles !== "string" || !Array.isArray(raw.atoms) || !Array.isArray(raw.bonds) || raw.atoms.length > 4 * MOST_ATOMS)
        return undefined;
    const n = raw.atoms.length, nbr = raw.atoms.map(() => []);
    for (const [a, b] of raw.bonds) {
        if (!(a >= 0 && a < n && b >= 0 && b < n))
            return undefined;
        nbr[a].push(b);
        nbr[b].push(a);
    }
    const folded = raw.atoms.map(([el, q, iso], i) => el === "H" && !q && !iso && nbr[i].length === 1 && raw.atoms[nbr[i][0]][0] !== "H");
    const index = [], out = { smiles: raw.smiles, el: [], q: [], iso: [], h: [], locs: [], adj: [], bonds: [] };
    raw.atoms.forEach(([el, q, iso, locs], i) => {
        if (folded[i])
            return;
        index[i] = out.el.length;
        out.el.push(el);
        out.q.push(q);
        out.iso.push(iso);
        out.h.push(0);
        out.locs.push(locs ? locs.split(" ") : []);
        out.adj.push([]);
    });
    raw.atoms.forEach((_, i) => { if (folded[i])
        out.h[index[nbr[i][0]]]++; });
    for (const [a, b, o] of raw.bonds) {
        if (folded[a] || folded[b])
            continue;
        out.adj[index[a]].push(index[b]);
        out.adj[index[b]].push(index[a]);
        out.bonds.push([index[a], index[b], o]);
    }
    return out;
}
function maps(b, g, atoms, limit = 24) {
    const inside = new Set(atoms), nb = (i) => g.bonds.flatMap((x) => (x.a === i ? [x.b] : x.b === i ? [x.a] : [])).filter((j) => inside.has(j));
    const plainH = (i) => g.atoms[i].el === "H" && !g.atoms[i].charge && nb(i).length === 1 && g.atoms[nb(i)[0]].el !== "H";
    const heavy = atoms.filter((i) => !plainH(i)), at = new Map(heavy.map((i, k) => [i, k])), n = heavy.length;
    if (n !== b.el.length)
        return [];
    const h = heavy.map((i) => g.atoms[i].h + nb(i).filter(plainH).length), adj = heavy.map((i) => nb(i).filter((j) => at.has(j)).map((j) => at.get(j)));
    const names = new Map(), colour = (s) => { if (!names.has(s))
        names.set(s, names.size); return names.get(s); };
    let ca = b.el.map((el, i) => colour(`${el} ${b.q[i]} ${b.h[i]} ${b.adj[i].length}`));
    let cb = heavy.map((i, k) => colour(`${g.atoms[i].el} ${g.atoms[i].charge} ${h[k]} ${adj[k].length}`));
    for (let round = 0; round < n; round++) {
        names.clear();
        const na = ca.map((c, i) => colour(`${c}|${b.adj[i].map((j) => ca[j]).sort((x, y) => x - y).join(",")}`));
        const nb = cb.map((c, k) => colour(`${c}|${adj[k].map((j) => cb[j]).sort((x, y) => x - y).join(",")}`));
        const same = new Set([...na, ...nb]).size === new Set([...ca, ...cb]).size;
        ca = na;
        cb = nb;
        if (same)
            break;
    }
    if ([...ca].sort((x, y) => x - y).join() !== [...cb].sort((x, y) => x - y).join())
        return [];
    const order = [], seen = new Set();
    for (let s = 0; s < n; s++) {
        if (seen.has(s))
            continue;
        seen.add(s);
        order.push(s);
        for (let k = order.length - 1; k < order.length; k++)
            for (const j of b.adj[order[k]])
                if (!seen.has(j)) {
                    seen.add(j);
                    order.push(j);
                }
    }
    const out = [], to = Array(n).fill(-1), used = Array(n).fill(false);
    let steps = 0;
    const go = (k) => {
        if (out.length >= limit || ++steps > 200000)
            return;
        if (k === n) {
            out.push(to.map((t) => heavy[t]));
            return;
        }
        const i = order[k];
        for (let t = 0; t < n; t++) {
            if (used[t] || cb[t] !== ca[i])
                continue;
            if (b.adj[i].some((j) => to[j] >= 0 && !adj[t].includes(to[j])))
                continue;
            to[i] = t;
            used[t] = true;
            go(k + 1);
            to[i] = -1;
            used[t] = false;
        }
    };
    go(0);
    return out;
}
const enclose = (t) => (0, namer_ts_1.enclose)({ text: t, compound: true });
const locKey = (l) => { const m = /^(\d+)([a-z]?)('*)$/.exec(l); return Number(m[1]) * 1000 + (m[2] ? m[2].charCodeAt(0) - 96 : 0) * 10 + m[3].length; };
const primes = (k) => "'".repeat(k);
const locScore = (l) => (/^\d/.test(l) ? locKey(l) : 1e6 + l.length);
function nameLigand(m, g, lig, api) {
    if (lig.lex)
        return { form: LEX[lig.lex].form, key: `lex ${lig.lex}`, flat: `lex ${lig.lex}`, charge: LEX[lig.lex].charge };
    if (lig.carbon) {
        const b = lig.bonds[0], probe = ligandMol(m, g, lig, new Map(), true), want = api.inchi(probe);
        const graph = (0, naming_ts_1.graphOf)(probe, api.cip?.(probe));
        if (!graph || !want)
            return undefined;
        const si = graph.atoms.length - 1, d = lig.atoms.indexOf(b.atom);
        graph.atoms[si] = { el: "C", charge: 0, h: 0 };
        let text;
        try {
            const f = fold(graph), n = new namer_ts_1.Namer(f.g);
            n.perceive();
            text = n.substituent(f.index[d], f.index[si]).text;
        }
        catch {
            return undefined;
        }
        if (!/(yl|ylidene|ylidyne)$/.test(text) || /\s/.test(text) || order(text) !== b.order)
            return undefined;
        const back = opsinOf(`(${text})silane`, api)?.smiles;
        if (!back || api.inchi(back) !== want)
            return undefined;
        return { form: text, key: want, flat: flat(want), charge: 0, carbon: b.order };
    }
    const free = ligandMol(m, g, lig), fx = lig.fixed && fixedInchi(free, lig, api), want = lig.fixed ? fx?.inchi : api.inchi(free);
    const cip = api.cip?.(free), at = (k) => key(lig.atoms[free.bonds[k].atoms[0]], lig.atoms[free.bonds[k].atoms[1]]);
    const graph = want && (0, naming_ts_1.graphOf)(free, cip && lig.fixed ? { ...cip, bonds: cip.bonds.map((l, k) => (lig.fixed.has(at(k)) ? undefined : l)) } : cip);
    if (!graph)
        return undefined;
    const reads = (n) => { const back = n ? opsinOf(n, api)?.smiles : undefined; return !!back && unfixed(api.inchi(back), fx?.pairs) === want; };
    const own = (!lig.charge ? assemblyName(graph) : multiplicativeName(graph, reads)) ?? undefined;
    let name = own && reads(own) ? own : (0, namer_multiplicative_ts_1.substitutively)(() => (0, namer_ts_1.iupacNameWhy)(graph).name);
    if (!name || (name !== own && !reads(name)))
        return undefined;
    const book = name.replace(/-?(\d+H(?:,\d+H)*)-(porphyrin|phthalocyanine|corrole)-([\d,]+)-((?:di|tri)ide)$/, (all, h, parent, at, ide) => (h.replace(/H/g, "") === at ? `${parent}-${at}-${ide}` : all));
    if (book !== name && reads(book))
        name = book;
    const form = lig.charge < 0 ? (/(ate|ide|ite)[)\]}]*$/.test(name) ? name.replace(/e([)\]}]*)$/, "o$1") : undefined) : name;
    return form ? { form, key: want, flat: flat(want), charge: lig.charge, ...(fx ? { pairs: fx.pairs } : {}) } : undefined;
}
function multiplicativeName(g0, reads) {
    const { g } = fold(g0), n = g.atoms.length;
    if (n > 200 || g.atoms.some((a) => a.cip) || g.bonds.some((b) => b.cip))
        return undefined;
    const { adj, ord } = shapeOf(g);
    for (const start of g.atoms.keys()) {
        if (g.atoms[start].el !== "C")
            continue;
        const walk = (path) => {
            if (path.length === 6)
                return adj[path[5]].includes(start) ? path : undefined;
            for (const j of adj[path[path.length - 1]])
                if (!path.includes(j) && g.atoms[j].el === "C" && !g.atoms[j].charge && j > start) {
                    const r = walk([...path, j]);
                    if (r)
                        return r;
                }
            return undefined;
        };
        const ring = walk([start]);
        if (!ring || ring.map((a, k) => ord.get(key(a, ring[(k + 1) % 6]))).filter((o) => o === 2).length !== 3)
            continue;
        const hangs = ring.flatMap((a, k) => adj[a].filter((j) => !ring.includes(j)).map((r) => ({ k, root: r })));
        if (hangs.length !== 2 || hangs.some((x) => ord.get(key(ring[x.k], x.root)) !== 1))
            continue;
        const units = hangs.map((x) => parts(n, adj, (i) => !ring.includes(i)).find((p) => p.includes(x.root)));
        if (units[0] === units[1] || units[0].length + units[1].length + 6 !== n)
            continue;
        const names = units.map((u, k) => {
            const at = new Map(u.map((i, j) => [i, j]));
            const h = { atoms: u.map((i) => ({ ...g.atoms[i], ...(i === hangs[k].root ? { h: g.atoms[i].h + 1 } : {}) })), bonds: g.bonds.filter((b) => at.has(b.a) && at.has(b.b)).map((b) => ({ ...b, a: at.get(b.a), b: at.get(b.b) })) };
            return (0, namer_ts_1.iupacNameWhy)(h).name;
        });
        if (!names[0] || names[0] !== names[1] || !/ate$/.test(names[0]) || /\s/.test(names[0]))
            return undefined;
        const d = Math.min((hangs[1].k - hangs[0].k + 6) % 6, (hangs[0].k - hangs[1].k + 6) % 6), linker = `1,${d + 1}-phenylene`;
        const unit = /^[a-z]+$/.test(names[0]) ? `di${names[0]}` : `bis${enclose(names[0])}`;
        for (let loc = 1; loc <= 12; loc++) {
            const name = `${loc},${loc}'-(${linker})${unit}`;
            if (reads(name))
                return name;
        }
        return undefined;
    }
    return undefined;
}
const ASSEMBLY = ["", "", "bi", "ter", "quater", "quinque", "sexi"];
function assemblyName(g0) {
    const { g } = fold(g0), n = g.atoms.length;
    if (n > 200 || g.atoms.some((a) => a.cip) || g.bonds.some((b) => b.cip))
        return undefined;
    const s = shapeOf(g), { adj, ord } = s, el = (i) => g.atoms[i].el;
    const rings = [];
    for (const nAtom of g.atoms.keys()) {
        if (el(nAtom) !== "N" || g.atoms[nAtom].charge || adj[nAtom].length !== 2)
            continue;
        const walk = (path) => {
            const last = path[path.length - 1];
            if (path.length === 6)
                return adj[last].includes(nAtom) ? path : undefined;
            for (const j of adj[last])
                if (!path.includes(j) && el(j) === "C" && !g.atoms[j].charge) {
                    const r = walk([...path, j]);
                    if (r)
                        return r;
                }
            return undefined;
        };
        const ring = walk([nAtom]);
        if (!ring)
            continue;
        const orders = ring.map((a, k) => ord.get(key(a, ring[(k + 1) % 6])));
        if (orders.filter((o) => o === 2).length === 3 && orders.every((o, k) => o !== orders[(k + 1) % 6]))
            rings.push(ring);
    }
    const ringOf = new Map(rings.flatMap((r, k) => r.map((a) => [a, k])));
    const links = rings.map(() => []);
    for (const b of g.bonds) {
        const [ra, rb] = [ringOf.get(b.a), ringOf.get(b.b)];
        if (ra !== undefined && rb !== undefined && ra !== rb) {
            if (b.order !== 1)
                return undefined;
            links[ra].push({ to: rb, a: b.a, b: b.b });
            links[rb].push({ to: ra, a: b.b, b: b.a });
        }
    }
    const used = rings.map((_, k) => k).filter((k) => links[k].length);
    if (used.length < 3 || used.length >= ASSEMBLY.length || used.some((k) => links[k].length > 2) || new Set(used.flatMap((k) => links[k].map((l) => `${Math.min(k, l.to)} ${Math.max(k, l.to)}`))).size !== used.length - 1)
        return undefined;
    const ends = used.filter((k) => links[k].length === 1);
    if (ends.length !== 2)
        return undefined;
    const chain = [ends[0]];
    while (chain.length < used.length)
        chain.push(links[chain[chain.length - 1]].find((l) => !chain.includes(l.to)).to);
    const inside = new Set(chain.flatMap((k) => rings[k]));
    const subs = [];
    for (const a of inside)
        for (const r of adj[a]) {
            if (inside.has(r))
                continue;
            const atoms = parts(n, adj, (i) => !inside.has(i)).find((p) => p.includes(r));
            if (atoms.some((i) => i !== r && adj[i].some((j) => inside.has(j))))
                return undefined;
            subs.push({ at: a, root: r, atoms });
        }
    if (inside.size + subs.reduce((t, x) => t + x.atoms.length, 0) !== n)
        return undefined;
    let names;
    try {
        names = subs.map((x) => { const piece = shapeSub(g, x.atoms, x.root), nm = new namer_ts_1.Namer(piece.g); nm.perceive(); return nm.substituent(piece.root, piece.place); });
    }
    catch {
        return undefined;
    }
    const cited = [...new Set(names.map((x) => x.text))].sort((a, b) => (0, namer_ts_1.alphaKey)(a).localeCompare((0, namer_ts_1.alphaKey)(b)));
    let best;
    for (const order of [chain, [...chain].reverse()]) {
        for (let dirs = 0; dirs < 1 << order.length; dirs++) {
            const loc = new Map();
            order.forEach((k, r) => { const ring = rings[k], d = (dirs >> r) & 1; ring.forEach((_, p) => loc.set(ring[d ? (6 - p) % 6 : p], `${p + 1}${primes(r)}`)); });
            const junctions = order.slice(1).flatMap((k, r) => { const l = links[order[r]].find((x) => x.to === k); return [loc.get(l.a), loc.get(l.b)]; });
            const at = (keep) => subs.flatMap((x, i) => (keep(i) ? [locKey(loc.get(x.at))] : [])).sort((p, q) => p - q);
            const score = [junctions.map(locKey), at(() => true), ...cited.map((t) => at((i) => names[i].text === t))];
            if (!best || score.reduce((d, l, k) => d || compare(l, best.score[k]), 0) < 0)
                best = { score, loc, order };
        }
    }
    if (!best)
        return undefined;
    const { loc, order } = best, prefixes = (0, namer_ts_1.assemblePrefixes)(subs.map((x, i) => ({ loc: loc.get(x.at), name: names[i] })), false);
    const junctions = order.slice(1).map((k, r) => { const l = links[order[r]].find((x) => x.to === k); return `${loc.get(l.a)},${loc.get(l.b)}`; }).join(":");
    return (0, namer_ts_1.joinPrefixes)(prefixes, `${junctions}-${ASSEMBLY[order.length]}pyridine`);
}
function shapeSub(g, atoms, root) {
    const at = new Map(atoms.map((i, k) => [i, k]));
    const out = { atoms: atoms.map((i) => ({ ...g.atoms[i] })), bonds: g.bonds.filter((b) => at.has(b.a) && at.has(b.b)).map((b) => ({ ...b, a: at.get(b.a), b: at.get(b.b) })) };
    out.atoms.push({ el: "C", charge: 0, h: 0 });
    out.bonds.push({ a: at.get(root), b: out.atoms.length - 1, order: 1 });
    return { g: out, root: at.get(root), place: out.atoms.length - 1 };
}
const order = (prefix) => (prefix.endsWith("ylidyne") ? 3 : prefix.endsWith("ylidene") ? 2 : 1);
function fold(g) {
    const deg = g.atoms.map(() => 0);
    for (const b of g.bonds) {
        deg[b.a]++;
        deg[b.b]++;
    }
    const drop = g.atoms.map((a, i) => a.el === "H" && !a.charge && !a.h && deg[i] === 1 && g.bonds.some((b) => (b.a === i && g.atoms[b.b].el !== "H") || (b.b === i && g.atoms[b.a].el !== "H")));
    const index = [], atoms = [];
    g.atoms.forEach((a, i) => { if (!drop[i]) {
        index[i] = atoms.length;
        atoms.push({ ...a });
    } });
    for (const b of g.bonds) {
        if (drop[b.a])
            atoms[index[b.b]].h++;
        else if (drop[b.b])
            atoms[index[b.a]].h++;
    }
    return { g: { atoms, bonds: g.bonds.filter((b) => !drop[b.a] && !drop[b.b]).map((b) => ({ ...b, a: index[b.a], b: index[b.b] })) }, index };
}
function etaForm(c, k) {
    const form = c.named[k].form, n = c.e.ligands[k].eta;
    for (const p of starts(form)) {
        const part = form.slice(p);
        if (etaPart(c, k, part))
            return p === 0 ? `η${n}-${form}` : `${form.slice(0, p)}${form[p - 1] === "-" ? "" : "-"}η${n}-${part}`;
    }
    const stereo = STEREO_PREFIX.exec(form)?.[0] ?? "";
    if (etaWhole(c, k))
        return `${stereo}η${n}-${form.slice(stereo.length)}`;
    return etaLocants(c, k);
}
const STEREO_PREFIX = /^\((?:\d*[EZRS])(?:,\d*[EZRS])*\)-/;
function etaWhole(c, k) {
    const { g, e } = c, lig = e.ligands[k], own = new Set(lig.atoms), donors = new Set(lig.bonds.map((b) => b.atom));
    const unsaturated = lig.atoms.filter((i) => g.atoms[i].charge || g.bonds.some((b) => b.order > 1 && (b.a === i || b.b === i) && own.has(b.a) && own.has(b.b)));
    if (unsaturated.length !== donors.size || unsaturated.some((i) => !donors.has(i)))
        return false;
    const adj = g.atoms.map(() => []);
    for (const b of g.bonds) {
        adj[b.a].push(b.b);
        adj[b.b].push(b.a);
    }
    return parts(g.atoms.length, adj, (i) => donors.has(i)).length === 1;
}
function etaLocants(c, k) {
    const { m, g, e, api } = c, lig = e.ligands[k], named = c.named[k], donors = [...new Set(lig.bonds.map((b) => b.atom))];
    const b = opsinOf(nameOfForm(named.form, named.charge), api), drawn = markedInchi(m, g, lig, [donors], api);
    if (!b || !drawn)
        return undefined;
    const options = new Map();
    for (const map of maps(b, free(g, lig), lig.atoms)) {
        const back = new Map(map.map((d, i) => [d, i])), locs = donors.map((d) => (back.has(d) ? b.locs[back.get(d)].find((l) => /^\d+[a-z]?'*$/.test(l)) : undefined));
        if (locs.some((l) => !l))
            continue;
        const sorted = locs.sort((x, y) => locKey(x) - locKey(y));
        options.set(sorted.join(","), sorted.map(locKey));
    }
    for (const [text] of [...options].sort((x, y) => compare(x[1], y[1])).slice(0, 3)) {
        const locs = text.split(","), cited = etaCited(b, locs);
        if (cited && readKappa(`${named.form}-${kappaText(cited, [...new Set(cited.map((x) => x.el))].sort())}`, named.charge, (el) => MARK[el]?.[0], api) === drawn)
            return `(${etaRange(b, locs)}-η)-${named.form}`;
    }
    return undefined;
}
function etaCited(b, locs) {
    const out = [];
    for (const l of locs) {
        const at = b.locs.flatMap((ls, i) => (ls.includes(l) ? [i] : []));
        if (at.length !== 1)
            return undefined;
        out.push({ el: b.el[at[0]], loc: l });
    }
    return out;
}
function etaRange(b, locs) {
    const at = (l) => b.locs.findIndex((ls) => ls.includes(l)), out = [];
    for (const l of locs) {
        const run = out[out.length - 1], last = run?.[run.length - 1];
        if (last && /^\d+$/.test(l) && /^\d+$/.test(last) && Number(l) === Number(last) + 1 && b.adj[at(last)].includes(at(l)))
            run.push(l);
        else
            out.push([l]);
    }
    return out.map((r) => (r.length > 2 ? `${r[0]}–${r[r.length - 1]}` : r.join(","))).join(",");
}
function etaLocs(t) {
    const out = [];
    for (const x of t.split(",")) {
        const r = /^(\d+)–(\d+)$/.exec(x);
        if (r) {
            const [a, z] = [Number(r[1]), Number(r[2])];
            if (z - a < 2 || z - a > 12)
                return undefined;
            for (let n = a; n <= z; n++)
                out.push(String(n));
        }
        else if (/^\d+[a-z]?'*$/.test(x))
            out.push(x);
        else
            return undefined;
    }
    return out.length >= 2 && out.length <= 8 && new Set(out).size === out.length ? out : undefined;
}
function etaPart(c, k, part) {
    const { g, e, api } = c, lig = e.ligands[k], donors = [...new Set(lig.bonds.map((b) => b.atom))];
    const b = opsinOf(nameOfForm(part, /(ato|ido|ito)[)\]}]*$/.test(part) ? -1 : 0), api);
    if (!b || !lig.eta || donors.length !== lig.eta)
        return false;
    const heavy = b.el.flatMap((el, i) => (el === "H" ? [] : [i]));
    if (heavy.length !== donors.length)
        return false;
    const nb = (i) => g.bonds.flatMap((x) => (x.a === i ? [x.b] : x.b === i ? [x.a] : [])).filter((j) => donors.includes(j));
    const to = new Map(), used = new Set();
    const go = (t) => {
        if (t === heavy.length)
            return true;
        const i = heavy[t];
        for (const d of donors) {
            if (used.has(d) || g.atoms[d].el !== b.el[i] || nb(d).length !== b.adj[i].filter((j) => b.el[j] !== "H").length)
                continue;
            if (b.adj[i].some((j) => to.has(j) && !nb(d).includes(to.get(j))))
                continue;
            to.set(i, d);
            used.add(d);
            if (go(t + 1))
                return true;
            to.delete(i);
            used.delete(d);
        }
        return false;
    };
    return go(0);
}
const donorGroups = (lig, metals) => metals.map((x) => [...new Set(lig.bonds.filter((b) => b.metal === x).map((b) => b.atom))]);
function needsKappa(g, lig) {
    if (lig.lex || lig.carbon || lig.eta)
        return false;
    const donors = [...new Set(lig.bonds.map((b) => b.atom))], potential = lig.atoms.filter((i) => DONORS.has(g.atoms[i].el));
    if (donors.length === 1 && potential.length === 1)
        return false;
    return !(donors.length === 1 && potential.length === 2 && carboxylate(g, lig, potential));
}
function carboxylate(g, lig, os) {
    if (os.some((o) => g.atoms[o].el !== "O"))
        return false;
    const nb = (i) => g.bonds.filter((b) => (b.a === i || b.b === i) && lig.atoms.includes(b.a) && lig.atoms.includes(b.b)).map((b) => (b.a === i ? b.b : b.a));
    const c = nb(os[0]);
    return c.length === 1 && nb(os[1]).length === 1 && c[0] === nb(os[1])[0] && g.atoms[c[0]].el === "C" && nb(c[0]).length === 3;
}
function kappaParts(m, g, lig, named, metals, api, located = false) {
    const groups = donorGroups(lig, metals), els = [...new Set(groups.flat().map((d) => g.atoms[d].el))].sort();
    if (groups.flat().some((d) => !MARK[g.atoms[d].el]))
        return undefined;
    const k = `${named.key}|${located}|${markedInchi(m, g, lig, groups, api)}`, kept = kappaMemo.get(k);
    if (kept)
        return kept;
    const numbers = numbered(m, g, lig, named, groups, els, api);
    const portion = numbers ? undefined : (located ? undefined : portioned(m, g, lig, named, groups, els, api)) ?? unitKappa(m, g, lig, named, groups, els, api, located);
    const primes = numbers || portion ? undefined : primed(m, g, lig, groups, els, api);
    const found = numbers ? { parts: numbers } : portion ? { parts: [portion.kappa], form: portion.form } : primes ? { parts: primes } : undefined;
    if (found) {
        if (kappaMemo.size > 400)
            kappaMemo.clear();
        kappaMemo.set(k, found);
    }
    return found;
}
const kappaMemo = new Map();
const kappaText = (cited, els) => els.filter((el) => cited.some((c) => c.el === el)).map((el) => {
    const ls = cited.filter((c) => c.el === el).map((c) => c.loc);
    return `κ${ls.length > 1 ? ls.length : ""}${ls.map((l) => `${el}${l}`).join(",")}`;
}).join(",");
function numbered(m, g, lig, named, groups, els, api) {
    const b = opsinOf(nameOfForm(named.form, named.charge), api);
    if (!b)
        return undefined;
    const locOf = (i, el) => b.locs[i].find((l) => /^\d+[a-z]?'*$/.test(l))
        ?? b.locs[i].find((l) => l.startsWith(el) && /^'*$/.test(l.slice(el.length)) && b.locs.filter((x) => x.includes(l)).length === 1)?.slice(el.length);
    const options = new Map();
    for (const map of maps(b, free(g, lig), lig.atoms)) {
        const back = new Map(map.map((d, i) => [d, i]));
        const cited = groups.map((ds) => ds.map((d) => ({ el: g.atoms[d].el, loc: back.has(d) ? locOf(back.get(d), g.atoms[d].el) : undefined })));
        if (cited.flat().some((c) => c.loc === undefined))
            continue;
        cited.forEach((cs) => cs.sort((x, y) => locScore(x.loc) - locScore(y.loc)));
        const parts = cited.map((cs) => kappaText(cs, els));
        options.set(parts.join(":"), { parts, score: cited.flatMap((cs) => cs.map((c) => locScore(c.loc))) });
    }
    const drawn = markedInchi(m, g, lig, groups, api);
    for (const o of [...options.values()].sort((x, y) => compare(x.score, y.score)).slice(0, 3)) {
        const text = `${named.form}-${o.parts.map((p, j) => (p ? p.replace(/(^|,)κ/g, `$1${j + 1}κ`) : "")).filter(Boolean).join(":")}`;
        if (drawn && readKappa(text, named.charge, (el, _, y) => MARK[el]?.[y.metal - 1], api) === drawn)
            return o.parts;
    }
    return undefined;
}
function portioned(m, g, lig, named, groups, els, api) {
    if (groups.length !== 1)
        return undefined;
    const donors = groups[0], name = named.form, nodes = nodesOf(name, free(g, lig), lig.atoms, api), b0 = opsinOf(nameOfForm(name, named.charge), api);
    if (!nodes || !b0)
        return undefined;
    const heavy = (xs) => xs.filter((i) => g.atoms[i].el !== "H");
    const own = (k, side) => side.filter((i) => !nodes.some((x) => x.parent === k && x.copies.some((y) => y.side.includes(i))));
    const rootOwn = heavy(lig.atoms).filter((i) => !nodes.some((x) => x.parent < 0 && x.copies.some((y) => y.side.includes(i))));
    const cite = (ds, ownAtoms, b, map) => {
        const back = new Map(map.map((d, i) => [d, i])), cited = [];
        for (const d of ds) {
            const el = g.atoms[d].el, same = heavy(ownAtoms).filter((i) => g.atoms[i].el === el);
            const loc = b.locs[back.get(d)]?.find((l) => /^\d+[a-z]?'*$/.test(l));
            if (loc)
                cited.push({ el, loc });
            else if (ds.filter((x) => g.atoms[x].el === el).length === 1 && (same.length === 1 || alike(m, g, lig, same, api)))
                cited.push({ el, loc: "" });
            else
                return undefined;
        }
        cited.sort((x, y) => (x.el === y.el ? (x.loc && y.loc ? locKey(x.loc) - locKey(y.loc) : 0) : x.el < y.el ? -1 : 1));
        return { text: kappaText(cited, els), score: cited.map((x) => (x.loc ? locKey(x.loc) : 0)) };
    };
    const best = (ds, ownAtoms, b, ms) => {
        let out;
        for (const map of ms) {
            const c = cite(ds, ownAtoms, b, map);
            if (c && (!out || compare(c.score, out.score) < 0))
                out = c;
        }
        return out?.text;
    };
    const inserts = [];
    let left = new Set(donors);
    for (const [k, x] of nodes.entries()) {
        const texts = x.copies.map((y) => {
            const mine = own(k, y.side), ds = donors.filter((d) => mine.includes(d));
            ds.forEach((d) => left.delete(d));
            return ds.length ? best(ds, mine, x.b, y.maps) : "";
        });
        if (texts.some((t) => t === undefined) || new Set(texts).size > 1)
            return undefined;
        if (texts[0])
            inserts.push({ at: x.end, text: `-${texts[0]}` });
    }
    const rootDonors = [...left];
    if (rootDonors.some((d) => !rootOwn.includes(d)) || !inserts.length)
        return undefined;
    const kappa = rootDonors.length ? best(rootDonors, rootOwn, b0, maps(b0, free(g, lig), lig.atoms)) : "";
    if (kappa === undefined)
        return undefined;
    const form = inserts.sort((p, q) => q.at - p.at).reduce((s, x) => s.slice(0, x.at) + x.text + s.slice(x.at), name);
    const drawn = markedInchi(m, g, lig, groups, api);
    return drawn && readKappa(`${form}${kappa ? `-${kappa}` : ""}`, named.charge, (el) => MARK[el]?.[0], api) === drawn ? { form, kappa } : undefined;
}
function unitKappa(m, g, lig, named, groups, els, api, located = false) {
    const x = /^(.*\))(bis|di)([([{]?)(.*?)([)\]}]?)$/.exec(named.form), units = 2;
    if (!x || (x[3] && closing(named.form, x[1].length + x[2].length) !== named.form.length - 1))
        return undefined;
    const counts = groups.map((ds) => els.map((el) => ds.filter((d) => g.atoms[d].el === el).length / units));
    if (counts.flat().some((c) => !Number.isInteger(c)))
        return undefined;
    const drawn = markedInchi(m, g, lig, groups, api);
    for (const reverse of [false, true]) {
        const next = new Map(), order = reverse ? [...groups.keys()].reverse() : [...groups.keys()], text = [];
        for (const j of order)
            text[j] = kappaText(els.flatMap((el, e) => Array.from({ length: counts[j][e] }, () => { const k = next.get(el) ?? 0; next.set(el, k + 1); return { el, loc: primes(k) }; })), els);
        if (located)
            text.forEach((t, j) => { if (t)
                text[j] = t.replace(/(^|,)κ/g, `$1${j + 1}κ`); });
        const kappa = text.filter(Boolean).join(":");
        if (!kappa)
            return undefined;
        const form = x[3] ? `${x[1]}${x[2]}${x[3]}${x[4]}-${kappa}${x[5]}` : `${x[1]}bis(${x[4]}-${kappa})`;
        if (drawn && readKappa(form, named.charge, (el, j, y) => MARK[el]?.[y.metal !== undefined ? y.metal - 1 : j], api) === drawn)
            return { form, kappa: "" };
        if (groups.length < 2)
            break;
    }
    return undefined;
}
function nodesOf(name, g, atoms, api) {
    const inside = new Set(atoms), nb = atoms.map(() => []), at = new Map(atoms.map((i, k) => [i, k]));
    for (const x of g.bonds)
        if (inside.has(x.a) && inside.has(x.b)) {
            nb[at.get(x.a)].push(x.b);
            nb[at.get(x.b)].push(x.a);
        }
    const adj = (i) => nb[at.get(i)];
    const heavyCount = (xs) => xs.filter((i) => g.atoms[i].el !== "H" || g.atoms[i].charge || adj(i).length !== 1).length;
    const sides = [], adjAll = g.atoms.map((_, i) => (inside.has(i) ? adj(i) : []));
    for (const x of g.bonds) {
        if (x.order !== 1 || !inside.has(x.a) || !inside.has(x.b) || g.atoms[x.a].el === "H" || g.atoms[x.b].el === "H")
            continue;
        if (linked(adjAll, x.a, x.b, (i) => inside.has(i)))
            continue;
        for (const [u, v] of [[x.a, x.b], [x.b, x.a]]) {
            const side = [v], seen = new Set(side);
            for (let k = 0; k < side.length; k++)
                for (const j of adj(side[k]))
                    if (j !== u && !seen.has(j)) {
                        seen.add(j);
                        side.push(j);
                    }
            sides.push({ from: u, side, heavy: heavyCount(side) });
        }
    }
    const out = [], used = new Set();
    for (let i = 0; i < name.length; i++) {
        if (!"([{".includes(name[i]))
            continue;
        if (out.length >= 40)
            return undefined;
        const end = closing(name, i), content = end > 0 ? name.slice(i + 1, end) : "";
        if (!/[a-z]{2}/.test(content))
            continue;
        const b = opsinOf(`(${content})silane`, api), si = b ? b.el.lastIndexOf("Si") : -1;
        if (!b || si < 0)
            continue;
        const count = (/(bis|tris|tetrakis|pentakis|hexakis|di|tri|tetra|penta|hexa)$/.exec(name.slice(0, i))?.[1] ?? "");
        const n = count ? Math.max(MULT.indexOf(count), MULTK.indexOf(count)) : 1;
        let parent = out.length - 1;
        while (parent >= 0 && !(out[parent].start < i && out[parent].end > end))
            parent--;
        const within = (side) => parent < 0 || out[parent].copies.some((y) => side.every((s) => y.side.includes(s)));
        const copies = [];
        for (const s of sides) {
            if (copies.length === n || used.has(`${s.from} ${s.side[0]}`) || s.heavy !== b.el.length - 1 || !within(s.side))
                continue;
            const gSi = { atoms: g.atoms.map((a, j) => (j === s.from ? { el: "Si", charge: 0, h: 3 } : a)), bonds: g.bonds };
            const ms = maps(b, gSi, [...s.side, s.from]).filter((map) => map[si] === s.from);
            if (ms.length)
                copies.push({ side: s.side, maps: ms });
        }
        if (copies.length !== n)
            return undefined;
        copies.forEach((y) => used.add(`${sides.find((s) => s.side === y.side).from} ${y.side[0]}`));
        out.push({ start: i, end, parent, b, copies });
    }
    return out;
}
const free = (g, lig) => (lig.q.size ? { atoms: g.atoms.map((a, i) => (lig.q.has(i) ? { ...a, charge: lig.q.get(i) } : a)), bonds: g.bonds } : g);
const markedInchi = (m, g, lig, groups, api) => groups.flat().some((d) => !MARK[g.atoms[d].el]) ? undefined : flat(api.inchi(ligandMol(m, g, lig, new Map(groups.flatMap((ds, k) => ds.map((d) => [d, MARK[g.atoms[d].el][k]]))))));
const compare = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d)
        return d;
} return 0; };
const ITEM = "[A-Z][a-z]?(?:\\d+[a-z]?)?'*", SEG = `\\d?κ\\d*${ITEM}(?:,${ITEM})*`;
const KAPPA_RE = new RegExp(`-(${SEG}(?:[,:]${SEG})*)(?=[)\\]}]|$)`, "g");
function kappaTerms(text) {
    let plain = "", last = 0;
    const terms = [];
    for (const x of text.matchAll(KAPPA_RE)) {
        const groups = parseKappa(x[1]);
        if (!groups)
            return undefined;
        plain += text.slice(last, x.index);
        terms.push({ at: plain.length, groups });
        last = x.index + x[0].length;
    }
    return { plain: plain + text.slice(last), terms };
}
function readKappa(text, charge, mass, api) {
    const parsed = kappaTerms(text);
    if (!parsed || !parsed.terms.length || parsed.terms.length > 12)
        return undefined;
    const plain = nameOfForm(parsed.plain, charge), depth = [];
    for (let i = 0, d = 0; i < plain.length; i++) {
        if (")]}".includes(plain[i]))
            d--;
        depth.push(d);
        if ("([{".includes(plain[i]))
            d++;
    }
    const insert = (s, p, desc) => { const after = s.slice(p); return `${s.slice(0, p)}(${desc})${/^[\d([{]/.test(after) ? "-" : ""}${after}`; };
    const placed = [];
    for (const term of parsed.terms) {
        const end = term.at, root = end === plain.length;
        let start = 0;
        if (!root) {
            for (start = end - 1; start >= 0 && !(depth[start] === depth[end] && "([{".includes(plain[start])); start--)
                ;
            start++;
        }
        if (!root && (start <= 0 || !")]}".includes(plain[end])))
            return undefined;
        const part = plain.slice(start, end), by = new Map(), cited = term.groups.flatMap((x) => x.atoms);
        const single = (a) => !a.loc && cited.filter((b) => b.el === a.el).length === 1;
        for (const [k, g] of term.groups.entries())
            for (const a of g.atoms) {
                const m = mass(a.el, k, g);
                if (!m)
                    return undefined;
                by.set(`${m}${a.el}`, [...(by.get(`${m}${a.el}`) ?? []), /^\d/.test(a.loc) ? a.loc : single(a) ? "" : `${a.el}${a.loc}`]);
            }
        const unlocanted = cited.filter(single).map((a) => a.el);
        if (unlocanted.length) {
            const b = opsinOf(plain, api), whole = b && asGraph(b), all = b ? b.el.map((_, i) => i) : [];
            const nodes = whole && nodesOf(plain, whole, all, api), node = nodes?.findIndex((x) => x.start === start - 1);
            if (!b || !nodes || (!root && node < 0))
                return undefined;
            const sides = root ? [all] : nodes[node].copies.map((y) => y.side);
            for (const side of sides) {
                const own = side.filter((i) => !nodes.some((x) => (root ? x.parent < 0 : x.parent === node) && x.copies.some((y) => y.side.includes(i))));
                for (const el of unlocanted) {
                    const same = own.filter((i) => b.el[i] === el);
                    if (!same.length || (same.length > 1 && new Set(same.map((i) => flat(api.inchi(builtMol(b, new Map([[i, MARK[el]?.[0] ?? 0]])))))).size !== 1))
                        return undefined;
                }
            }
        }
        const desc = [...by].map(([k, locs]) => (locs[0] ? `${locs.join(",")}-` : "") + `${k}${locs.length > 1 ? locs.length : ""}`).join(",");
        const p = starts(part).slice(0, 12).map((q) => q + start).find((q) => !!api.read(insert(plain, q, desc)));
        if (p === undefined)
            return undefined;
        placed.push({ p, desc });
    }
    const probe = placed.sort((a, b) => b.p - a.p).reduce((s, x) => insert(s, x.p, x.desc), plain), smiles = api.read(probe);
    return smiles ? flat(api.inchi(smiles)) : undefined;
}
function starts(name) {
    const out = [], depth = [];
    for (let i = 0, d = 0; i < name.length; i++) {
        depth.push(d);
        if ("([{".includes(name[i]))
            d++;
        else if (")]}".includes(name[i]))
            d--;
    }
    for (let p = name.length - 1; p >= 0; p--) {
        if (depth[p] || ")]}".includes(name[p]))
            continue;
        if (p === 0 || ")]}".includes(name[p - 1]) || (name[p - 1] === "-" && /[a-z)\]}]-$/.test(name.slice(0, p))) || (/[a-z]/.test(name[p]) && /(yl|ylidene|oxy|oxo|halo|chloro|bromo|iodo|fluoro|nitro|amino|imino|cyano|hydroxy|oxido|ato|ido)$/.test(name.slice(0, p))))
            out.push(p);
    }
    return out;
}
function primed(m, g, lig, groups, els, api) {
    if (!primedOk(m, g, lig, groups, api))
        return undefined;
    const seen = new Map();
    return groups.map((ds) => kappaText(els.flatMap((el) => ds.filter((d) => g.atoms[d].el === el).map(() => {
        const k = seen.get(el) ?? 0;
        seen.set(el, k + 1);
        return { el, loc: primes(k) };
    })), els));
}
function primedOk(m, g, lig, groups, api) {
    const donors = groups.flat();
    if (donors.length !== new Set(donors).size)
        return false;
    for (const el of new Set(donors.map((d) => g.atoms[d].el))) {
        const all = lig.atoms.filter((i) => g.atoms[i].el === el), ds = donors.filter((d) => g.atoms[d].el === el);
        if (ds.length !== all.length && (ds.length !== 1 || !alike(m, g, lig, all, api)))
            return false;
    }
    return groups.filter((ds) => ds.length).length < 2 || splits(m, g, lig, groups, api);
}
function alike(m, g, lig, atoms, api) {
    if (atoms.length > 16 || atoms.some((i) => !MARK[g.atoms[i].el]))
        return false;
    const keys = new Set(atoms.map((i) => flat(api.inchi(ligandMol(m, g, lig, new Map([[i, MARK[g.atoms[i].el][0]]]))))));
    return keys.size === 1 && !keys.has(undefined);
}
function splits(m, g, lig, groups, api) {
    const label = (gs) => flat(api.inchi(ligandMol(m, g, lig, new Map(gs.flatMap((ds, k) => ds.map((d) => [d, MARK[g.atoms[d].el]?.[k] ?? 0]))))));
    const want = label(groups);
    if (!want || groups.flat().some((d) => !MARK[g.atoms[d].el]))
        return false;
    for (let a = 0; a < groups.length; a++)
        for (let b = a + 1; b < groups.length; b++)
            for (const x of groups[a])
                for (const y of groups[b]) {
                    if (g.atoms[x].el !== g.atoms[y].el)
                        continue;
                    if (label(groups.map((ds, k) => ds.map((d) => (k === a && d === x ? y : k === b && d === y ? x : d)))) !== want)
                        return false;
                }
    return true;
}
const nameOfForm = (form, charge) => (charge < 0 ? form.replace(/(at|id|it)o([)\]}]*)$/, "$1e$2") : form);
const termText = (t) => {
    if (t.simple)
        return `${t.count > 1 ? MULT[t.count] : ""}${t.form}`;
    if (t.lex && !t.kappa)
        return t.mu ? `${t.count > 1 ? `${MULT[t.count]}-` : ""}μ-${t.form}-` : `${t.count > 1 ? MULT[t.count] : ""}${t.form}`;
    return `${t.count > 1 ? MULTK[t.count] : ""}${enclose(`${t.mu ? "μ-" : ""}${t.form}${t.kappa ? `-${t.kappa}` : ""}`)}`;
};
const MULT_START = new RegExp(`^(?:${[...MULT.slice(2), ...MULTK.slice(2)].join("|")})`);
const simpleName = (form) => /^[a-z]+(?:ato|ido|ito)$/.test(form) && !MULT_START.test(form) && !LEX_FORMS.has(form) && starts(form).length === 1;
const simpleTerm = (lig, form, kappa) => !lig.lex && !lig.carbon && lig.charge < 0 && !kappa && simpleName(form);
function termsOf(list) {
    const out = new Map();
    for (const t of list) {
        const k = `${t.form}|${t.mu}|${t.kappa}`;
        out.set(k, { ...t, count: (out.get(k)?.count ?? 0) + 1 });
    }
    return [...out.values()].sort((a, b) => (0, namer_ts_1.alphaKey)(a.sort ?? a.form).localeCompare((0, namer_ts_1.alphaKey)(b.sort ?? b.form)) || Number(b.mu) - Number(a.mu) || a.kappa.localeCompare(b.kappa));
}
const chargeText = (q) => `(${Math.abs(q)}${q > 0 ? "+" : "-"})`;
const oxText = (ox) => `(${ox < 0 ? "-" : ""}${ROMAN[Math.abs(ox)]})`;
function oxidation(e) {
    if (e.charge || e.metals.length !== 1 || e.ligands.some((l) => l.carbon || l.eta || (l.lex && !LEX[l.lex].ox)))
        return undefined;
    const ox = e.hydrides - e.ligands.reduce((t, l) => t + l.charge, 0);
    return Math.abs(ox) < ROMAN.length ? ox : undefined;
}
const fixes = (g, e) => e.atoms.some((i) => g.atoms[i].charge) || e.ligands.some((l) => l.charge) || e.hydrides > 0;
function suffix(g, e) {
    if (e.charge)
        return chargeText(e.charge);
    const ox = fixes(g, e) ? oxidation(e) : undefined;
    if (e.written !== undefined)
        return ox === undefined || ox === e.written ? oxText(e.written) : undefined;
    return ox !== undefined ? oxText(ox) : "";
}
function mononuclear(c) {
    const { m, g, e, named, api } = c, x = e.metals[0], el = g.atoms[x].el, list = [];
    for (const [k, lig] of e.ligands.entries()) {
        const kp = needsKappa(g, lig) ? kappaParts(m, g, lig, named[k], [x], api) : { parts: [""] };
        if (!kp)
            return undefined;
        const eta = lig.eta ? etaForm(c, k) : undefined;
        if (lig.eta && !eta)
            return undefined;
        const form = eta ?? kp.form ?? named[k].form, kappa = kp.parts[0] ?? "";
        list.push({ form, sort: named[k].form, lex: !!lig.lex, simple: !kp.form && simpleTerm(lig, form, kappa), mu: false, kappa });
    }
    for (let h = 0; h < e.hydrides; h++)
        list.push({ form: LEX.H.form, lex: true, mu: false, kappa: "" });
    const tail = suffix(g, e);
    return tail === undefined ? undefined : configuration(c) + termsOf(list).map(termText).join("") + (e.charge < 0 ? ateOf(el) : metals_ts_1.ELEMENTS.get(el)) + tail;
}
function ligandSig(c, k, order) {
    const lig = c.e.ligands[k], groups = donorGroups(lig, order);
    if (lig.lex)
        return `lex ${lig.lex}|${groups.map((ds) => ds.length).join(",")}`;
    if (groups.flat().some((d) => !MARK[c.g.atoms[d].el]))
        return undefined;
    const marks = new Map(groups.flatMap((ds, j) => ds.map((d) => [d, MARK[c.g.atoms[d].el][j]])));
    const inchi = flat(c.api.inchi(ligandMol(c.m, c.g, lig, marks, !!lig.carbon)));
    return inchi && `${c.named[k].key}|${inchi}`;
}
const bridging = (lig) => new Set(lig.bonds.map((x) => x.metal)).size > 1;
function firstMetal(c) {
    const { g, e, named } = c, [a, b] = e.metals;
    const cn = (x) => e.ligands.reduce((t, l) => t + l.bonds.filter((y) => y.metal === x).length, 0) + g.atoms[x].h;
    if (cn(a) !== cn(b))
        return cn(a) > cn(b) ? a : b;
    const keys = (x) => e.ligands.flatMap((l, k) => l.bonds.filter((y) => y.metal === x).map(() => (0, namer_ts_1.alphaKey)(named[k].form))).sort();
    const ka = keys(a), kb = keys(b), d = ka.findIndex((s, i) => s !== kb[i]);
    return d < 0 ? undefined : ka[d].localeCompare(kb[d]) < 0 ? a : b;
}
function alikeMetals(c) {
    const [a, b] = c.e.metals, ab = c.e.ligands.map((_, k) => ligandSig(c, k, [a, b])), ba = c.e.ligands.map((_, k) => ligandSig(c, k, [b, a]));
    if ([...ab, ...ba].some((s) => !s))
        return undefined;
    return [...ab].sort().join("\n") === [...ba].sort().join("\n") && c.g.atoms[a].h === c.g.atoms[b].h;
}
function dinuclear(c) {
    const { m, g, e, named, api } = c, [a, b] = e.metals, el = g.atoms[a].el;
    if (g.atoms[b].el !== el || e.mm.length > 1)
        return undefined;
    const symmetric = alikeMetals(c);
    if (symmetric === undefined)
        return undefined;
    const metal = e.charge < 0 ? ateOf(el) : metals_ts_1.ELEMENTS.get(el), tail = (e.mm.length ? `(${el}—${el})` : "") + (e.charge ? chargeText(e.charge) : "");
    const list = [], unit = [];
    if (symmetric) {
        for (const [k, lig] of e.ligands.entries()) {
            const mu = bridging(lig);
            if (!mu && lig.bonds[0].metal !== a)
                continue;
            const kp = needsKappa(g, lig) ? kappaParts(m, g, lig, named[k], mu ? [a, b] : [a], api) : { parts: [] };
            const eta = lig.eta ? etaForm(c, k) : undefined;
            if (!kp || (lig.eta && !eta))
                return undefined;
            const form = eta ?? kp.form ?? named[k].form, kappa = kp.parts.filter(Boolean).join(":");
            (mu ? list : unit).push({ form, sort: named[k].form, lex: !!lig.lex, simple: !mu && !kp.form && simpleTerm(lig, form, kappa), mu, kappa });
        }
        for (let h = 0; h < g.atoms[a].h; h++)
            unit.push({ form: LEX.H.form, lex: true, mu: false, kappa: "" });
        return termsOf(list).map(termText).join("") + (unit.length ? `bis${enclose(termsOf(unit).map(termText).join("") + metal)}` : `di${metal}`) + tail;
    }
    const first = firstMetal(c);
    if (first === undefined || e.ligands.some((l) => l.eta))
        return undefined;
    const order = first === a ? [a, b] : [b, a];
    for (const [k, lig] of e.ligands.entries()) {
        const mu = bridging(lig), groups = donorGroups(lig, order);
        if (mu && !needsKappa(g, lig) && groups[0].length === 1 && groups[0][0] === groups[1][0]) {
            list.push({ form: named[k].form, lex: !!lig.lex, mu, kappa: "" });
            continue;
        }
        const kp = needsKappa(g, lig) ? kappaParts(m, g, lig, named[k], order, api, true) : undefined;
        if (kp?.form) {
            list.push({ form: kp.form, sort: named[k].form, lex: false, mu, kappa: "" });
            continue;
        }
        const parts = kp ? kp.parts : needsKappa(g, lig) ? undefined : groups.map((ds) => (ds.length === 1 ? `κ${g.atoms[ds[0]].el}` : ds.length ? undefined : ""));
        if (!parts || parts.some((p) => p === undefined))
            return undefined;
        list.push({ form: named[k].form, lex: !!lig.lex, mu, kappa: parts.map((p, j) => (p ? p.replace(/(^|,)κ/g, `$1${j + 1}κ`) : "")).filter(Boolean).join(mu ? ":" : ",") });
    }
    for (const [j, x] of order.entries())
        for (let h = 0; h < g.atoms[x].h; h++)
            list.push({ form: LEX.H.form, lex: true, mu: false, kappa: `${j + 1}κH` });
    return termsOf(list).map(termText).join("") + `di${metal}` + tail;
}
const SQUARE = new Set(["Ni", "Pd", "Pt", "Rh", "Ir", "Au"]);
function sitesOf(c, x) {
    const { m, e } = c, sites = [], at = (i) => m.atoms[i].location;
    let deep = m.atoms.some((a) => Math.abs(a.location[2] ?? 0) > 1e-6);
    for (const [k, lig] of e.ligands.entries())
        for (const b of lig.bonds) {
            if (b.metal !== x)
                continue;
            const bond = m.bonds.find((y) => y.atoms.includes(x) && y.atoms.includes(b.atom));
            if (!bond)
                return undefined;
            const dx = at(b.atom)[0] - at(x)[0], dy = at(b.atom)[1] - at(x)[1], len = Math.hypot(dx, dy);
            if (len < 1e-6)
                return undefined;
            const from = bond.atoms[0] === x ? 1 : -1;
            const wedge = bond.stereo === 1 || bond.display === "hollow" ? from : bond.stereo === 6 ? -from : bond.display === "hashed" || bond.display === "dashed" ? -1 : bond.display === "bold" ? 1 : 0;
            if (wedge)
                deep = true;
            const dz = (at(b.atom)[2] ?? 0) - (at(x)[2] ?? 0) || wedge * 0.8 * len, n = Math.hypot(dx, dy, dz);
            sites.push({ d: b.atom, lig: k, v: [dx / n, dy / n, dz / n] });
        }
    return { sites, deep };
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
function transPairs(sites, opposite, other) {
    const most = sites.map((s, i) => { let best = -1; sites.forEach((t, j) => { if (j !== i && (best < 0 || dot(s.v, t.v) < dot(s.v, sites[best].v)))
        best = j; }); return best; });
    if (most.some((j, i) => most[j] !== i || dot(sites[i].v, sites[j].v) > opposite))
        return undefined;
    for (let i = 0; i < sites.length; i++)
        for (let j = i + 1; j < sites.length; j++)
            if (most[i] !== j && !other(dot(sites[i].v, sites[j].v)))
                return undefined;
    return most;
}
function fivefold(sites) {
    const cos = (i, j) => dot(sites[i].v, sites[j].v), trans = sites.map(() => -1);
    for (let i = 0; i < 5; i++)
        for (let j = i + 1; j < 5; j++)
            if (cos(i, j) < -0.9) {
                if (trans[i] >= 0 || trans[j] >= 0)
                    return undefined;
                trans[i] = j;
                trans[j] = i;
            }
    const right = (i, j) => Math.abs(cos(i, j)) < 0.42, all = [0, 1, 2, 3, 4];
    const pairs = all.filter((i) => trans[i] > i), lone = all.filter((i) => trans[i] < 0);
    if (pairs.length === 1)
        return lone.every((i) => right(i, pairs[0]) && right(i, trans[pairs[0]])) ? { shape: "TBPY-5", trans } : undefined;
    if (pairs.length === 2) {
        const base = [pairs[0], trans[pairs[0]], pairs[1], trans[pairs[1]]];
        return base.every((i) => right(i, lone[0])) && [0, 1].every((u) => [2, 3].every((w) => right(base[u], base[w]))) ? { shape: "SPY-5", trans } : undefined;
    }
    return undefined;
}
function polyhedron(c) {
    const { g, e } = c;
    if (e.metals.length !== 1 || e.hydrides || e.ligands.some((l) => l.eta || (l.carbon && l.bonds.length !== 1)))
        return undefined;
    const x = e.metals[0], s = sitesOf(c, x);
    if (!s || new Set(s.sites.map((t) => t.d)).size !== s.sites.length)
        return undefined;
    if (s.sites.length === 4 && !s.deep && SQUARE.has(g.atoms[x].el)) {
        const trans = transPairs(s.sites, -0.9, (cos) => Math.abs(cos) < 0.42);
        return trans && { shape: "SP-4", sites: s.sites, trans };
    }
    if (s.sites.length === 4 && s.deep && s.sites.every((a, i) => s.sites.every((b, j) => i === j || dot(a.v, b.v) > -0.8)))
        return { shape: "T-4", sites: s.sites, trans: [-1, -1, -1, -1] };
    if (s.sites.length === 5 && s.deep) {
        const f = fivefold(s.sites);
        return f && { ...f, sites: s.sites };
    }
    if (s.sites.length === 6 && s.deep) {
        const trans = transPairs(s.sites, -0.5, (cos) => cos > -0.45);
        return trans && { shape: "OC-6", sites: s.sites, trans };
    }
    return undefined;
}
const ZOF = new Map([...metals_ts_1.ELEMENTS.keys()].map((el, i) => [el, i + 1])), Z = (el) => ZOF.get(el) ?? 0;
function donorRank(c, d, x) {
    const { g } = c, near = Array(g.atoms[d].h).fill(1);
    for (const b of g.bonds) {
        const j = b.a === d ? b.b : b.b === d ? b.a : -1;
        if (j < 0 || j === x)
            continue;
        for (let k = 0; k < b.order; k++)
            near.push(Z(g.atoms[j].el));
    }
    return [Z(g.atoms[d].el), ...near.sort((p, q) => q - p)];
}
function skewLines(c, p) {
    if (p.shape !== "OC-6")
        return undefined;
    const ligs = [...new Set(p.sites.map((s) => s.lig))], at = (k) => p.sites.flatMap((s, i) => (s.lig === k ? [i] : []));
    if (ligs.length !== 3 || ligs.some((k) => at(k).length !== 2 || p.trans[at(k)[0]] === at(k)[1]))
        return undefined;
    if (ligs.some((k) => !alike(c.m, c.g, c.e.ligands[k], at(k).map((i) => p.sites[i].d), c.api)))
        return undefined;
    const hands = new Set();
    for (let u = 0; u < 3; u++)
        for (let w = u + 1; w < 3; w++) {
            const [a1, a2] = at(ligs[u]).map((i) => p.sites[i].v), [b1, b2] = at(ligs[w]).map((i) => p.sites[i].v);
            const a = minus(a2, a1), b = minus(b2, b1), turn = dot(a, b) * dot(cross(a, b), minus(b1, a1));
            if (Math.abs(turn) < 1e-3)
                return undefined;
            hands.add(Math.sign(turn));
        }
    return hands.size === 1 ? (hands.has(-1) ? "Δ-" : "Λ-") : undefined;
}
function configuration(c) {
    const p = polyhedron(c);
    if (!p)
        return "";
    const helix = skewLines(c, p);
    if (helix)
        return helix;
    const { e } = c, x = e.metals[0], { sites, trans } = p;
    const kind = sites.map((s) => `${c.named[s.lig].key}|${c.g.atoms[s.d].el}`), kinds = [...new Set(kind)];
    if (kinds.length < 2)
        return "";
    const mono = (i) => new Set(e.ligands[sites[i].lig].bonds.map((b) => b.atom)).size === 1 && e.ligands[sites[i].lig].bonds.length === 1;
    const count = (k) => kind.filter((y) => y === k).length;
    const of = (k) => sites.flatMap((_, i) => (kind[i] === k ? [i] : []));
    if (kinds.length === 2 && (p.shape === "SP-4" || p.shape === "OC-6")) {
        const [a, b] = kinds.map(of).sort((u, v) => u.length - v.length);
        if (p.shape === "SP-4" && a.length === 2 && [...a, ...b].every(mono))
            return trans[a[0]] === a[1] ? "trans-" : "cis-";
        if (p.shape === "OC-6" && a.length === 2 && a.every(mono))
            return trans[a[0]] === a[1] ? "trans-" : "cis-";
        if (p.shape === "OC-6" && a.length === 3 && [...a, ...b].every(mono))
            return a.some((i) => a.includes(trans[i])) ? "mer-" : "fac-";
        if (a.length === 1)
            return "";
    }
    if (p.shape === "SP-4" && kinds.some((k) => count(k) === 3))
        return "";
    if (p.shape === "OC-6" && kinds.some((k) => count(k) === 5))
        return "";
    if (!sites.every((_, i) => mono(i)))
        return "";
    const ranks = kinds.map((k) => donorRank(c, sites[of(k)[0]].d, x)), key = (r) => r.join(",");
    if (new Set(ranks.map(key)).size !== kinds.length)
        return "";
    const order = [...ranks].sort((r, s) => { for (let i = 0; i < Math.max(r.length, s.length); i++) {
        const d = (s[i] ?? 0) - (r[i] ?? 0);
        if (d)
            return d;
    } return 0; }).map(key);
    const pri = sites.map((_, i) => order.indexOf(key(ranks[kinds.indexOf(kind[i])])) + 1);
    if (p.shape === "T-4") {
        if (kinds.length !== 4)
            return "";
        const hand = (0, cip_ts_1.handOf)(c.m, x, [1, 2, 3, 4].map((n) => sites[pri.indexOf(n)].d));
        return hand ? `(T-4-${hand})-` : "";
    }
    if (p.shape === "TBPY-5") {
        const axis = sites.map((_, i) => i).filter((i) => trans[i] >= 0).map((i) => pri[i]).sort((u, v) => u - v);
        return `(TBPY-5-${axis.join("")})-`;
    }
    if (p.shape === "SPY-5") {
        const apex = trans.indexOf(-1), base = sites.map((_, i) => i).filter((i) => i !== apex), top = Math.min(...base.map((i) => pri[i]));
        return `(SPY-5-${pri[apex]}${Math.max(...base.filter((i) => pri[i] === top).map((i) => pri[trans[i]]))})-`;
    }
    const firsts = sites.flatMap((_, i) => (pri[i] === 1 ? [i] : [])), first = Math.max(...firsts.map((i) => pri[trans[i]]));
    if (p.shape === "SP-4")
        return `(SP-4-${first})-`;
    const second = Math.max(...firsts.filter((i) => pri[trans[i]] === first).map((ax) => {
        const plane = sites.map((_, i) => i).filter((i) => i !== ax && i !== trans[ax]), top = Math.min(...plane.map((i) => pri[i]));
        return Math.max(...plane.filter((i) => pri[i] === top).map((i) => pri[trans[i]]));
    }));
    return `(OC-6-${first}${second})-`;
}
const ONE = { Li: 1, Na: 1, K: 1, Rb: 1, Cs: 1, Be: 2, Mg: 2, Ca: 2, Sr: 2, Ba: 2 };
const metalIon = (el, charge) => `[${el}${charge > 0 ? "+" : "-"}${Math.abs(charge)}]`;
function ionOf(m, g, part, api) {
    const charge = part.reduce((t, i) => t + g.atoms[i].charge, 0), a = g.atoms[part[0]];
    if (!charge)
        return undefined;
    if (part.length === 1 && (0, metals_ts_1.isMetal)(a.el) && !a.h) {
        const name = ONE[a.el] === charge ? metals_ts_1.ELEMENTS.get(a.el) : charge > 0 ? `${metals_ts_1.ELEMENTS.get(a.el)}(${charge}+)` : undefined, key = api.inchi(metalIon(a.el, charge));
        return name && key ? { name, charge, key } : undefined;
    }
    const lm = ligandMol(m, g, { atoms: part, q: new Map(), bonds: [], charge }), key = api.inchi(lm), graph = key ? (0, naming_ts_1.graphOf)(lm, api.cip?.(lm)) : undefined;
    const name = graph ? (0, namer_ts_1.iupacNameWhy)(graph).name : undefined;
    if (!name || !key || /\s/.test(name))
        return undefined;
    const back = api.read(name);
    return back && api.inchi(back) === key ? { name, charge, key } : undefined;
}
function readIon(word, api) {
    const x = /^([a-z]+)(?:\((\d)\+\))?$/.exec(word), metal = x && NAMES.get(x[1]);
    if (metal && !metal.ate) {
        const charge = x[2] ? Number(x[2]) : ONE[metal.el];
        return charge ? { key: api.inchi(metalIon(metal.el, charge)), charge } : undefined;
    }
    const back = api.read(word);
    return back ? { key: api.inchi(back), charge: smilesCharge(back) } : undefined;
}
const smilesCharge = (s) => [...s.matchAll(/\[[^\]]*?([+-])(\d*)\]/g)].reduce((t, x) => t + (x[1] === "+" ? 1 : -1) * Number(x[2] || 1), 0);
const MULTS = MULT.slice(2).join("|"), FORMS = [...LEX_FORMS.keys()].sort((a, b) => b.length - a.length).join("|");
const MU_RE = new RegExp(`^(?:(${MULTS})-)?μ-(${FORMS})-`), LEX_RE = new RegExp(`^(${MULTS})?(${FORMS})`), ENC_RE = new RegExp(`^(${MULTK.slice(2).join("|")})?(?=[([{])`);
const METAL_NAMES = [...NAMES.keys()].sort((a, b) => b.length - a.length);
function closing(s, i) {
    const open = "([{", close = ")]}", stack = [];
    for (let k = i; k < s.length; k++) {
        const o = open.indexOf(s[k]), c = close.indexOf(s[k]);
        if (o >= 0) {
            stack.push(o);
            if (stack.length > MOST_DEPTH)
                return -1;
        }
        else if (c >= 0) {
            if (stack.pop() !== c)
                return -1;
            if (!stack.length)
                return k;
        }
    }
    return -1;
}
function parseEntity(w, depth = 0, budget = { calls: 0 }) {
    if (++budget.calls > 400 || w.length > MOST_NAME)
        return undefined;
    const central = parseCentral(w, depth);
    if (central)
        return { terms: [], central };
    const then = (t, n) => { const r = parseEntity(w.slice(n), depth, budget); return r && { terms: [t, ...r.terms], central: r.central }; };
    let x;
    if ((x = MU_RE.exec(w)))
        return then({ count: x[1] ? MULT.indexOf(x[1]) : 1, mu: true, lex: LEX_FORMS.get(x[2]) }, x[0].length);
    if ((x = LEX_RE.exec(w))) {
        const r = then({ count: x[1] ? MULT.indexOf(x[1]) : 1, mu: false, lex: LEX_FORMS.get(x[2]) }, x[0].length);
        if (r)
            return r;
    }
    if ((x = ENC_RE.exec(w))) {
        const start = x[0].length, end = closing(w, start);
        if (end < 0)
            return undefined;
        const inner = w.slice(start + 1, end), mu = inner.startsWith("μ-");
        return then({ count: x[1] ? MULTK.indexOf(x[1]) : 1, mu, inner: mu ? inner.slice(2) : inner }, end + 1);
    }
    const mult = new RegExp(`^(${MULTS})?`).exec(w), from = mult[0].length;
    for (const end of w.slice(from).matchAll(/(?:ato|ido|ito)/g)) {
        const to = from + end.index + end[0].length, word = w.slice(from, to);
        if (!/^[a-z]+$/.test(word) || !simpleName(word))
            continue;
        const r = then({ count: mult[1] ? MULT.indexOf(mult[1]) : 1, mu: false, inner: word }, to);
        if (r)
            return r;
    }
    return undefined;
}
function parseCentral(s, depth) {
    let p = 0, n = 1, el, ate = false, unit;
    if (/^bis[([{]/.test(s)) {
        const end = closing(s, 3), inner = end > 0 && depth < 1 ? parseEntity(s.slice(4, end), depth + 1) : undefined;
        if (!inner || inner.central.n !== 1 || inner.central.suffix || inner.central.mm || inner.central.unit)
            return undefined;
        ({ el, ate } = inner.central);
        unit = inner.terms;
        n = 2;
        p = end + 1;
    }
    else {
        for (const [k, start] of [[2, 2], [1, 0]]) {
            if (start && !s.startsWith("di"))
                continue;
            const name = METAL_NAMES.find((x) => s.startsWith(x, start));
            if (name) {
                ({ el, ate } = NAMES.get(name));
                n = k;
                p = start + name.length;
                break;
            }
        }
        if (!el)
            return undefined;
    }
    let rest = s.slice(p), mm;
    const bond = /^\(([A-Z][a-z]?)—([A-Z][a-z]?)\)/.exec(rest);
    if (bond) {
        mm = [bond[1], bond[2]];
        rest = rest.slice(bond[0].length);
    }
    const suffix = /^\(([^()]*)\)$/.exec(rest);
    if (rest && !suffix)
        return undefined;
    return { el, n, ate, ...(mm ? { mm } : {}), ...(suffix ? { suffix: suffix[1] } : {}), ...(unit ? { unit } : {}) };
}
function parseKappa(t) {
    if (t.length > 400)
        return undefined;
    const out = [];
    for (const group of t.split(":")) {
        const atoms = [], metals = new Set();
        for (const seg of group.split(/,(?=\d?κ)/)) {
            const x = /^(\d)?κ(\d*)(.+)$/.exec(seg), items = x?.[3].split(",").map((it) => /^([A-Z][a-z]?)(\d+[a-z]?'*|'*)$/.exec(it));
            if (!x || !items || items.some((it) => !it) || items.length !== (x[2] ? Number(x[2]) : 1))
                return undefined;
            metals.add(x[1] ?? "");
            atoms.push(...items.map((it) => ({ el: it[1], loc: it[2] })));
        }
        if (metals.size !== 1)
            return undefined;
        const metal = [...metals][0];
        out.push({ ...(metal ? { metal: Number(metal) } : {}), atoms });
    }
    return out;
}
function claimOf(t, c, at) {
    const { g, e, api } = c;
    if (t.lex) {
        const lex = t.lex;
        if (lex === "H")
            return t.mu || at === undefined ? undefined : { count: t.count, type: "lex H", charge: -1, carbon: false, lex, hydride: at, test: () => false };
        return { count: t.count, type: `lex ${lex}`, charge: LEX[lex].charge, carbon: false, lex, test: (k, order) => {
                const lig = e.ligands[k], groups = donorGroups(lig, order).map((ds) => ds.length);
                return lig.lex === lex && (t.mu ? groups.every((n) => n === 1) && order.length === 2 : at !== undefined && groups.every((n, j) => n === (j === at ? 1 : 0)));
            } };
    }
    const etaLoc = /^\(([^()]+)-η\)-(.+)$/.exec(t.inner);
    if (etaLoc)
        return etaClaim(t, c, at, etaLoc[1], etaLoc[2]);
    const etaAt = /(?:^|-)η(\d)-/.exec(t.inner), etaN = etaAt ? Number(etaAt[1]) : 0, etaPartName = etaAt ? t.inner.slice(etaAt.index + etaAt[0].length) : "";
    if (etaAt && /η/.test(etaPartName))
        return undefined;
    const front = etaAt ? t.inner.slice(0, etaAt.index) : "", whole = !!etaAt && (!front || STEREO_PREFIX.test(`${front}-`));
    const inner = etaAt ? front + (front && whole ? "-" : "") + etaPartName : t.inner, kt = kappaTerms(inner);
    if (!kt || (etaAt && kt.terms.length))
        return undefined;
    const form = kt.plain, rootTerm = kt.terms.find((x) => x.at === form.length), parts = kt.terms.filter((x) => x !== rootTerm);
    const kappa = rootTerm?.groups;
    if (LEX_FORMS.has(form)) {
        if (parts.length)
            return undefined;
        const lex = LEX_FORMS.get(form);
        if (!kappa || kappa.some((x) => x.metal === undefined || x.atoms.length !== 1))
            return undefined;
        if (lex === "H")
            return kappa.length === 1 && kappa[0].atoms[0].el === "H" && !t.mu ? { count: t.count, type: "lex H", charge: -1, carbon: false, lex, hydride: kappa[0].metal - 1, test: () => false } : undefined;
        return { count: t.count, type: `lex ${lex}`, charge: LEX[lex].charge, carbon: false, lex, test: (k, order) => {
                const lig = e.ligands[k], groups = donorGroups(lig, order);
                return lig.lex === lex && groups.every((ds, j) => ds.length === kappa.filter((x) => x.metal === j + 1).length && ds.every((d) => g.atoms[d].el === kappa[0].atoms[0].el));
            } };
    }
    const carbon = /(yl|ylidene|ylidyne)$/.test(form);
    const read = opsinOf(carbon ? `(${form})silane` : nameOfForm(form, /(ato|ido|ito)[)\]}]*$/.test(form) ? -1 : 0), api)?.smiles;
    const type = read && api.inchi(read);
    if (!read || !type)
        return undefined;
    const charge = carbon ? undefined : smilesCharge(read);
    const drawn = (k, order) => {
        const lig = e.ligands[k], groups = donorGroups(lig, order);
        if (groups.flat().some((d) => !MARK[g.atoms[d].el]))
            return undefined;
        return flat(api.inchi(ligandMol(c.m, g, lig, new Map(groups.flatMap((ds, j) => ds.map((d) => [d, MARK[g.atoms[d].el][j]]))), !!lig.carbon)));
    };
    const base = (k) => c.named[k].key === unfixed(type, c.named[k].pairs) && !!e.ligands[k].carbon === carbon && !e.ligands[k].lex
        && (e.ligands[k].eta ?? 0) === etaN && (!etaN || etaPart(c, k, etaPartName) || (whole && etaWhole(c, k) && etaForm(c, k) === t.inner));
    const metalOf = (x, j) => (x.metal !== undefined ? x.metal - 1 : t.mu ? j : at);
    if (carbon) {
        if (parts.length || (kappa && (kappa.length !== 1 || kappa[0].atoms.length !== 1 || kappa[0].atoms[0].el !== "C" || kappa[0].atoms[0].loc)))
            return undefined;
        const j = kappa ? metalOf(kappa[0], 0) : at;
        return { count: t.count, type, carbon, test: (k, order) => {
                const lig = e.ligands[k];
                return base(k) && j !== undefined && !t.mu && donorGroups(lig, order).every((ds, i) => ds.length === (i === j ? 1 : 0));
            } };
    }
    if (!kt.terms.length) {
        return { count: t.count, type, charge, carbon, test: (k, order) => {
                const lig = e.ligands[k];
                return base(k) && at !== undefined && !t.mu && !needsKappa(g, lig) && donorGroups(lig, order).every((ds, i) => (i === at) === ds.length > 0);
            } };
    }
    const metals = kt.terms.map((x) => x.groups.map((y, j) => metalOf(y, j)));
    if (metals.flat().some((j) => j === undefined) || metals.some((js) => new Set(js).size !== js.length) || t.mu !== new Set(metals.flat()).size > 1)
        return undefined;
    const cited = kt.terms.flatMap((x) => x.groups.flatMap((y) => y.atoms));
    if (parts.length || cited.some((x) => /^\d/.test(x.loc))) {
        const sig = readKappa(inner, charge, (el, j, y) => { const x = metalOf(y, j); return x === undefined ? undefined : MARK[el]?.[x]; }, api);
        return sig ? { count: t.count, type, charge, carbon, test: (k, order) => base(k) && drawn(k, order) === sig } : undefined;
    }
    const groups = kappa.map((x, j) => ({ j: metalOf(x, j), atoms: x.atoms }));
    if (cited.some((x) => /\d/.test(x.loc)))
        return undefined;
    const next = new Map();
    let counting = true;
    for (const a of cited) {
        if (a.loc.length !== (next.get(a.el) ?? 0))
            counting = false;
        next.set(a.el, a.loc.length + 1);
    }
    let sig = null;
    const probe = () => (sig === null ? (sig = readKappa(inner, charge, (el, j, y) => { const x = metalOf(y, j); return x === undefined ? undefined : MARK[el]?.[x]; }, api)) : sig);
    return { count: t.count, type, charge, carbon, test: (k, order) => {
            const lig = e.ligands[k], ds = donorGroups(lig, order);
            if (!base(k) || !ds.every((d, i) => d.length === groups.filter((x) => x.j === i).reduce((n, x) => n + x.atoms.length, 0)))
                return false;
            if (!groups.every((x) => [...new Set(x.atoms.map((a) => a.el))].every((el) => ds[x.j].filter((d) => g.atoms[d].el === el).length === x.atoms.filter((a) => a.el === el).length)))
                return false;
            return (counting && primedOk(c.m, g, lig, ds, api)) || (!!probe() && drawn(k, order) === probe());
        } };
}
function etaClaim(t, c, at, text, form) {
    const { g, e, api } = c, locs = etaLocs(text);
    if (!locs || /[ηκ]/.test(form) || t.mu || at === undefined)
        return undefined;
    const b = opsinOf(nameOfForm(form, /(ato|ido|ito)[)\]}]*$/.test(form) ? -1 : 0), api), type = b && api.inchi(b.smiles), cited = b && etaCited(b, locs);
    if (!b || !type || !cited || etaRange(b, locs) !== text)
        return undefined;
    const charge = smilesCharge(b.smiles), sig = readKappa(`${form}-${kappaText(cited, [...new Set(cited.map((x) => x.el))].sort())}`, charge, (el) => MARK[el]?.[at], api);
    return sig ? { count: t.count, type, charge, carbon: false, test: (k, order) => {
            const lig = e.ligands[k], groups = donorGroups(lig, order);
            if (c.named[k].key !== unfixed(type, c.named[k].pairs) || lig.eta !== locs.length || groups.some((ds, i) => (i === at) !== ds.length > 0) || etaForm(c, k) !== t.inner)
                return false;
            return flat(api.inchi(ligandMol(c.m, g, lig, new Map(groups.flatMap((ds, j) => ds.map((d) => [d, MARK[g.atoms[d].el][j]])))))) === sig;
        } } : undefined;
}
function topWords(name) {
    const out = [""];
    let depth = 0;
    for (const ch of name) {
        if ("([{".includes(ch))
            depth++;
        else if (")]}".includes(ch))
            depth--;
        if (ch === " " && !depth)
            out.push("");
        else
            out[out.length - 1] += ch;
    }
    return out;
}
function verify(name, c, ions) {
    const { g, e, api } = c, words = topWords(name);
    const at = ions.length && e.charge < 0 ? 1 : 0;
    if (isPoly(c)) {
        if (words.length !== (ions.length ? 2 : 1))
            return false;
        if (ions.length) {
            const ion = readIon(words[1 - at], api);
            if (!ion?.key || ion.key !== ions[0].key || ion.charge * ions.length !== -e.charge)
                return false;
        }
        return verifyPoly(words[at], c);
    }
    const config = /^(?:cis-|trans-|fac-|mer-|Δ-|Λ-|\((?:SP-4-\d|OC-6-\d\d|T-4-[RS]|TBPY-5-\d\d|SPY-5-\d\d)\)-)/.exec(words[at] ?? "")?.[0] ?? "";
    if (config !== configuration(c))
        return false;
    const parsed = parseEntity(words[at].slice(config.length));
    if (!parsed || words.length !== (ions.length ? 2 : 1))
        return false;
    if (ions.length) {
        const ion = readIon(words[1 - at], api);
        if (!ion?.key || ion.key !== ions[0].key || ion.charge * ions.length !== -e.charge)
            return false;
    }
    const { terms, central } = parsed, el = g.atoms[e.metals[0]].el;
    if (central.el !== el || central.n !== e.metals.length || central.ate !== e.charge < 0)
        return false;
    if (!!central.mm !== (e.mm.length === 1) || (central.mm && (central.mm[0] !== el || central.mm[1] !== el)))
        return false;
    if (central.unit && terms.some((t) => !t.mu))
        return false;
    const first = e.metals.length === 2 && !alikeMetals(c) ? firstMetal(c) : undefined;
    if (e.metals.length === 2 && alikeMetals(c) === false && first === undefined)
        return false;
    const orders = e.metals.length === 1 ? [e.metals] : first !== undefined ? [[first, e.metals.find((x) => x !== first)]] : [e.metals, [e.metals[1], e.metals[0]]];
    const single = e.metals.length === 1 ? 0 : undefined;
    const top = terms.map((t) => claimOf(t, c, single)), units = (central.unit ?? []).flatMap((t) => [claimOf(t, c, 0), claimOf(t, c, 1)]);
    const claims = [...top, ...units];
    if (claims.some((x) => !x))
        return false;
    const fits = orders.some((order) => {
        const used = new Set(), hydrides = order.map((x) => g.atoms[x].h);
        for (const cl of claims) {
            if (cl.hydride !== undefined) {
                hydrides[cl.hydride] -= cl.count;
                continue;
            }
            for (let n = 0; n < cl.count; n++) {
                const k = e.ligands.findIndex((_, i) => !used.has(i) && cl.test(i, order));
                if (k < 0)
                    return false;
                used.add(k);
            }
        }
        return used.size === e.ligands.length && hydrides.every((h) => !h);
    });
    if (!fits)
        return false;
    const suffix = central.suffix;
    if (suffix === undefined)
        return e.charge === 0;
    const q = /^(\d+)([+-])$/.exec(suffix);
    if (q)
        return Number(q[1]) * (q[2] === "+" ? 1 : -1) === e.charge && e.charge !== 0;
    const ox = /^(-?)([IVX]+|0)$/.exec(suffix);
    if (!ox || e.charge || e.metals.length !== 1)
        return false;
    const value = (ox[1] ? -1 : 1) * ROMAN.indexOf(ox[2]);
    const counted = !claims.some((x) => x.carbon || x.charge === undefined || (x.lex && !LEX[x.lex].ox));
    const balances = counted && value + claims.reduce((t, x) => t + x.count * x.charge, 0) === 0;
    if (e.written !== undefined)
        return value === e.written && (!fixes(g, e) || !counted || balances);
    return fixes(g, e) && balances;
}
const SEQUENCE = "F Cl Br I At O S Se Te Po N P As Sb Bi H C Si Ge Sn Pb B Al Ga In Tl Zn Cd Hg Cu Ag Au Ni Pd Pt Co Rh Ir Fe Ru Os Mn Tc Re Cr Mo W V Nb Ta Ti Zr Hf Sc Y La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Ac Th Pa U Np Pu Be Mg Ca Sr Ba Ra Li Na K Rb Cs Fr He Ne Ar Kr Xe Rn".split(" ");
const later = (el) => SEQUENCE.indexOf(el);
function unitOf(n, mm, metals) {
    const deg = metals.map((x) => mm.filter((b) => b.includes(x)).length);
    if (n === 3 && mm.length === 3)
        return "triangulo";
    if (n === 4 && mm.length === 6)
        return "tetrahedro";
    if (n === 4 && mm.length === 4 && deg.every((d) => d === 2))
        return "quadro";
    if (n === 6 && mm.length === 12 && deg.every((d) => d === 4))
        return "octahedro";
    return "";
}
const MU_SIMPLE = (n) => (n > 2 ? `μ${n}` : "μ");
function polyTerms(c, order, kappas) {
    const { g, e, named } = c, loc = new Map(order.map((x, j) => [x, j + 1])), terms = [];
    const lexTerminal = new Map(), lexBridge = new Map();
    const enclosed = new Map();
    for (const [k, lig] of e.ligands.entries()) {
        const ms = [...new Set(lig.bonds.map((b) => b.metal))];
        if (lig.lex) {
            if (lig.bonds.length !== ms.length)
                return undefined;
            const el = g.atoms[lig.bonds[0].atom].el;
            if (ms.length === 1) {
                const t = lexTerminal.get(lig.lex) ?? { el, at: [] };
                t.at.push(loc.get(ms[0]));
                lexTerminal.set(lig.lex, t);
                continue;
            }
            const key = `${lig.lex} ${ms.length}`, t = lexBridge.get(key) ?? { el, mu: ms.length, sets: [] };
            t.sets.push(ms.map((x) => loc.get(x)).sort((p, q) => p - q).join(":"));
            lexBridge.set(key, t);
            continue;
        }
        if (ms.length !== 1 || lig.carbon || !kappas.has(k))
            return undefined;
        const j = loc.get(ms[0]), kappa = kappas.get(k).replace(/(^|,)κ/g, `$1${j}κ`), text = `${named[k].form}-${kappa}`;
        const t = enclosed.get(text) ?? { sort: named[k].form, count: 0 };
        t.count++;
        enclosed.set(text, t);
    }
    for (const x of order)
        if (g.atoms[x].h) {
            const t = lexTerminal.get("H") ?? { el: "H", at: [] };
            for (let h = 0; h < g.atoms[x].h; h++)
                t.at.push(loc.get(x));
            lexTerminal.set("H", t);
        }
    const kappaOf = (counts, el, sep) => [...counts].sort(([a], [b]) => compare(a.split(":").map(Number), b.split(":").map(Number))).map(([at, n]) => `${at}κ${n > 1 ? n : ""}${el}`).join(sep);
    const tally = (xs, per = 1) => { const m = new Map(); for (const x of xs)
        m.set(x, (m.get(x) ?? 0) + per); return m; };
    for (const [lex, t] of lexTerminal) {
        const n = t.at.length, form = LEX[lex].form;
        if (n > 12)
            return undefined;
        terms.push({ sort: form, mu: 0, text: `${MULT[n]}${form}-${kappaOf(tally(t.at.map(String)), t.el, ",")}`, hyphen: true });
    }
    for (const [key, t] of lexBridge) {
        const form = LEX[key.split(" ")[0]].form, n = t.sets.length;
        if (n > 12)
            return undefined;
        const kappa = order.length > 2 ? `-${kappaOf(tally(t.sets, t.mu), t.el, ";")}` : "";
        terms.push({ sort: form, mu: t.mu, text: `${n > 1 ? `${MULT[n]}-` : ""}${MU_SIMPLE(t.mu)}-${form}${kappa}`, hyphen: true });
    }
    for (const [text, t] of enclosed) {
        if (t.count > 12)
            return undefined;
        terms.push({ sort: t.sort, mu: 0, text: `${t.count > 1 ? MULTK[t.count] : ""}${enclose(text)}`, hyphen: false });
    }
    return terms.sort((a, b) => (0, namer_ts_1.alphaKey)(a.sort).localeCompare((0, namer_ts_1.alphaKey)(b.sort)) || b.mu - a.mu || a.text.localeCompare(b.text));
}
function polyText(c, order, kappas) {
    const { g, e } = c, terms = polyTerms(c, order, kappas);
    if (!terms)
        return undefined;
    let text = "";
    for (const t of terms)
        text += (text && !text.endsWith("-") && t.mu ? "-" : "") + t.text + (t.hyphen ? "-" : "");
    const unit = unitOf(order.length, e.mm, order);
    if (unit)
        text += (text && !text.endsWith("-") ? "-" : "") + `${unit}-`;
    const els = order.map((x) => g.atoms[x].el), runs = [];
    for (const el of els) {
        if (runs.length && runs[runs.length - 1][0] === el)
            runs[runs.length - 1][1]++;
        else
            runs.push([el, 1]);
    }
    if (e.charge < 0 && runs.length > 1)
        return undefined;
    text += runs.map(([el, n]) => `${n > 1 ? MULT[n] : ""}${e.charge < 0 ? ateOf(el) : metals_ts_1.ELEMENTS.get(el)}`).join("");
    return text + mmText(c, order, !!unit) + (e.charge ? chargeText(e.charge) : "");
}
function mmText(c, order, unit) {
    const { g, e } = c, loc = new Map(order.map((x, j) => [x, j + 1])), el = (x) => g.atoms[x].el;
    const bonds = e.mm.map(([a, b]) => (loc.get(a) < loc.get(b) ? [a, b] : [b, a])).sort((p, q) => compare(p.map((x) => loc.get(x)), q.map((x) => loc.get(x))));
    const pairs = new Map();
    for (const b of bonds) {
        const k = `${el(b[0])}—${el(b[1])}`;
        pairs.set(k, [...(pairs.get(k) ?? []), b]);
    }
    let out = "";
    for (const [k, bs] of pairs) {
        const [a, b] = k.split("—"), na = order.filter((x) => el(x) === a).length, nb = order.filter((x) => el(x) === b).length;
        const all = a === b ? (na * (na - 1)) / 2 : na * nb;
        if (unit || bs.length === all)
            out += `(${bs.length > 1 ? `${bs.length} ` : ""}${k})`;
        else
            out += bs.map(([x, y]) => `(${el(x)}${na > 1 ? loc.get(x) : ""}—${el(y)}${nb > 1 ? loc.get(y) : ""})`).join("");
    }
    return out;
}
function numberings(c, kappas) {
    const { g, e } = c;
    const cn = (x) => e.ligands.reduce((t, l) => t + l.bonds.filter((b) => b.metal === x).length, 0) + g.atoms[x].h;
    const sorted = [...e.metals].sort((x, y) => later(g.atoms[y].el) - later(g.atoms[x].el) || cn(y) - cn(x));
    const classes = [];
    for (const x of sorted) {
        const last = classes[classes.length - 1];
        if (last && g.atoms[last[0]].el === g.atoms[x].el && cn(last[0]) === cn(x))
            last.push(x);
        else
            classes.push([x]);
    }
    let all = [[]];
    for (const cl of classes) {
        const perms = permutations(cl);
        all = all.flatMap((p) => perms.map((q) => [...p, ...q]));
        if (all.length > 720)
            return [];
    }
    const unit = unitOf(e.metals.length, e.mm, e.metals), bonded = (x, y) => e.mm.some((b) => b.includes(x) && b.includes(y));
    const round = (o, ring) => ring.every((x, k) => bonded(o[x], o[ring[(k + 1) % ring.length]]));
    if (unit === "quadro")
        all = all.filter((o) => round(o, [0, 1, 2, 3]));
    if (unit === "octahedro")
        all = all.filter((o) => !bonded(o[0], o[5]) && round(o, [1, 2, 3, 4]));
    if (!all.length)
        return [];
    const terms = polyTerms(c, sorted, kappas);
    if (!terms)
        return [];
    const score = (order) => {
        const loc = new Map(order.map((x, j) => [x, j])), out = [];
        for (const t of terms) {
            const counts = order.map(() => 0);
            for (const lig of e.ligands) {
                const form = lig.lex ? LEX[lig.lex].form : c.named[e.ligands.indexOf(lig)].form, mu = new Set(lig.bonds.map((b) => b.metal)).size;
                if (form !== t.sort || (mu > 1 ? mu : 0) !== t.mu)
                    continue;
                for (const b of lig.bonds)
                    counts[loc.get(b.metal)]++;
            }
            if (t.sort === LEX.H.form && !t.mu)
                order.forEach((x, j) => (counts[j] += g.atoms[x].h));
            out.push(...counts.map((n) => -n));
        }
        for (const x of order)
            out.push(...e.mm.filter((b) => b.includes(x)).map((b) => loc.get(b[0] === x ? b[1] : b[0])).sort((p, q) => p - q), 99);
        return out;
    };
    const scored = all.map((o) => ({ o, s: score(o) })), best = scored.reduce((m, x) => (compare(x.s, m) < 0 ? x.s : m), scored[0].s);
    return scored.filter((x) => compare(x.s, best) === 0).map((x) => x.o);
}
function permutations(xs) {
    if (xs.length <= 1)
        return [xs];
    return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}
function polyKappas(c) {
    const { m, g, e, named, api } = c, out = new Map();
    for (const [k, lig] of e.ligands.entries()) {
        if (lig.lex)
            continue;
        const ms = [...new Set(lig.bonds.map((b) => b.metal))];
        if (ms.length !== 1 || lig.carbon || lig.eta)
            return undefined;
        if (!needsKappa(g, lig)) {
            out.set(k, `κ${g.atoms[lig.bonds[0].atom].el}`);
            continue;
        }
        const kp = kappaParts(m, g, lig, named[k], ms, api);
        if (!kp || kp.form || !kp.parts[0])
            return undefined;
        out.set(k, kp.parts[0]);
    }
    return out;
}
const isPoly = (c) => c.e.metals.length > 2 || (c.e.metals.length === 2 && c.g.atoms[c.e.metals[0]].el !== c.g.atoms[c.e.metals[1]].el);
function polynuclear(c) {
    if (c.e.metals.length > 6)
        return undefined;
    const kappas = polyKappas(c);
    if (!kappas)
        return undefined;
    const names = numberings(c, kappas).map((o) => polyText(c, o, kappas));
    if (!names.length || names.some((n) => !n))
        return undefined;
    const nums = (n) => [...n.matchAll(/\d+/g)].map((x) => Number(x[0]));
    return names.reduce((best, n) => (compare(nums(n), nums(best)) < 0 ? n : best));
}
const KGROUP = "\\d(?::\\d)*κ\\d*[A-Z][a-z]?";
const POLY_MU = new RegExp(`^(?:(${MULTS})-)?μ(\\d?)-(${FORMS})(?:-(${KGROUP}(?:;${KGROUP})*))?(?:-|(?=\\(|$))`);
const POLY_LEX = new RegExp(`^(${MULTS})?(${FORMS})-(\\dκ\\d*[A-Z][a-z]?(?:,\\dκ\\d*[A-Z][a-z]?)*)-`);
function verifyPoly(word, c) {
    const { g, e } = c, kappas = polyKappas(c);
    if (!kappas || word.length > MOST_NAME)
        return false;
    const claims = [];
    let w = word, x;
    for (let guard = 0; guard < 40; guard++) {
        if ((x = POLY_MU.exec(w))) {
            const n = x[1] ? MULT.indexOf(x[1]) : 1, mu = x[2] ? Number(x[2]) : 2, groups = new Map();
            for (const k of (x[4] ?? "").split(";").filter(Boolean)) {
                const y = /^([\d:]+)κ(\d*)([A-Z][a-z]?)$/.exec(k);
                groups.set(y[1], Number(y[2] || 1));
                if (y[1].split(":").length !== mu)
                    return false;
            }
            if (!x[4] && e.metals.length !== 2)
                return false;
            claims.push({ lex: LEX_FORMS.get(x[3]), mu, groups: x[4] ? groups : new Map([["1:2", 2 * n]]), el: x[4] ? /[A-Z][a-z]?$/.exec(x[4])[0] : undefined });
            w = w.slice(x[0].length);
            continue;
        }
        if ((x = POLY_LEX.exec(w))) {
            const groups = new Map();
            for (const k of x[3].split(",")) {
                const y = /^(\d)κ(\d*)([A-Z][a-z]?)$/.exec(k);
                groups.set(y[1], Number(y[2] || 1));
            }
            const els = new Set(x[3].split(",").map((k) => /[A-Z][a-z]?$/.exec(k)[0]));
            if (els.size !== 1 || [...groups.values()].reduce((t, v) => t + v, 0) !== (x[1] ? MULT.indexOf(x[1]) : 1))
                return false;
            claims.push({ lex: LEX_FORMS.get(x[2]), mu: 0, groups, el: [...els][0] });
            w = w.slice(x[0].length);
            continue;
        }
        const enc = ENC_RE.exec(w);
        if (enc && "([{".includes(w[enc[0].length] ?? "")) {
            const start = enc[0].length, end = closing(w, start);
            if (end < 0)
                return false;
            const inner = w.slice(start + 1, end), locs = [...inner.matchAll(/(?:^|[,:-])(\d)κ/g)].map((y) => Number(y[1]));
            if (!locs.length || new Set(locs).size !== 1 || /(?:^|[,:-])κ/.test(inner))
                return false;
            claims.push({ mu: 0, groups: new Map(), enclosed: { count: enc[1] ? MULTK.indexOf(enc[1]) : 1, inner: inner.replace(/(^|[,:-])\dκ/g, "$1κ"), at: locs[0] } });
            w = w.slice(end + 1);
            if (w.startsWith("-"))
                w = w.slice(1);
            continue;
        }
        break;
    }
    const unit = /^(triangulo|quadro|tetrahedro|octahedro)-/.exec(w)?.[1] ?? "";
    w = w.slice(unit ? unit.length + 1 : 0);
    const cited = [];
    let ate = false;
    for (let guard = 0; guard < 12 && w && !w.startsWith("("); guard++) {
        const mult = new RegExp(`^(${MULTS})?`).exec(w), name = METAL_NAMES.find((y) => w.startsWith(y, mult[0].length));
        if (!name)
            return false;
        const it = NAMES.get(name);
        ate || (ate = it.ate);
        for (let k = 0; k < (mult[1] ? MULT.indexOf(mult[1]) : 1); k++)
            cited.push(it.el);
        w = w.slice(mult[0].length + name.length);
    }
    const charge = /\((\d+)([+-])\)$/.exec(w), q = charge ? Number(charge[1]) * (charge[2] === "+" ? 1 : -1) : 0;
    if (q !== e.charge || ate !== e.charge < 0)
        return false;
    const mmPart = charge ? w.slice(0, -charge[0].length) : w;
    if (cited.length !== e.metals.length)
        return false;
    return numberings(c, kappas).some((order) => {
        if (order.some((x, j) => g.atoms[x].el !== cited[j]))
            return false;
        if (unitOf(order.length, e.mm, order) !== unit || mmText(c, order, !!unit) !== mmPart)
            return false;
        const loc = new Map(order.map((y, j) => [y, j + 1])), used = new Set();
        const hydrides = order.map((y) => g.atoms[y].h);
        for (const cl of claims) {
            if (cl.enclosed) {
                const metal = order[cl.enclosed.at - 1], claim = metal === undefined ? undefined : claimOf({ count: cl.enclosed.count, mu: false, inner: cl.enclosed.inner }, c, 0);
                if (!claim)
                    return false;
                for (let n = 0; n < cl.enclosed.count; n++) {
                    const k = e.ligands.findIndex((lig, i) => !used.has(i) && !lig.lex && lig.bonds.every((b) => b.metal === metal) && claim.test(i, [metal]));
                    if (k < 0)
                        return false;
                    used.add(k);
                }
                continue;
            }
            for (const [set, n] of cl.groups) {
                const ms = set.split(":").map((y) => order[Number(y) - 1]);
                if (ms.some((y) => y === undefined))
                    return false;
                if (cl.lex === "H" && !cl.mu) {
                    if (ms.length !== 1 || cl.el !== "H")
                        return false;
                    for (let k = 0; k < n; k++) {
                        const i = e.ligands.findIndex((lig, i) => !used.has(i) && lig.lex === "H" && lig.bonds.length === 1 && lig.bonds[0].metal === ms[0]);
                        if (i >= 0)
                            used.add(i);
                        else
                            hydrides[loc.get(ms[0]) - 1]--;
                    }
                    continue;
                }
                if (n % ms.length)
                    return false;
                for (let k = 0; k < n / ms.length; k++) {
                    const i = e.ligands.findIndex((lig, i) => !used.has(i) && lig.lex === cl.lex && lig.bonds.length === ms.length && ms.every((y) => lig.bonds.some((b) => b.metal === y)) && (!cl.el || lig.bonds.every((b) => g.atoms[b.atom].el === cl.el)));
                    if (i < 0)
                        return false;
                    used.add(i);
                }
            }
        }
        return used.size === e.ligands.length && hydrides.every((h) => h === 0);
    });
}
const memo = new Map();
function ligandName(m, g, lig, api) {
    if (lig.lex || lig.fixed)
        return nameLigand(m, g, lig, api);
    const k = `${lig.carbon ? lig.bonds[0].order : 0} ${api.inchi(ligandMol(m, g, lig, new Map(), !!lig.carbon))}`, kept = memo.get(k);
    if (kept)
        return kept;
    const found = nameLigand(m, g, lig, api);
    if (found) {
        if (memo.size > 400)
            memo.clear();
        memo.set(k, found);
    }
    return found;
}
function complexName(m, api) {
    try {
        const d = drawing(m, keep(api));
        if (!d)
            return undefined;
        const { c, ions } = d, e = c.e;
        const text = e.metals.length === 1 ? mononuclear(c) : isPoly(c) ? polynuclear(c) : dinuclear(c), ion = ions[0];
        if (!text || text.length > MOST_NAME)
            return undefined;
        const name = !ion ? text : e.charge > 0 ? `${text} ${ion.name}` : `${ion.name} ${text}`;
        return verify(name, c, ions) ? name : undefined;
    }
    catch {
        return undefined;
    }
}
function complexNameReads(name, m, api) {
    try {
        const d = drawing(m, keep(api));
        return !!d && name.length <= MOST_NAME && verify(name, d.c, d.ions);
    }
    catch {
        return false;
    }
}
function drawing(m, api) {
    if (m.atoms.length > MOST_ATOMS)
        return undefined;
    const g = (0, naming_ts_1.graphOf)(m);
    if (!g || !g.atoms.some((a) => (0, metals_ts_1.isMetal)(a.el) || MAIN.has(a.el)))
        return undefined;
    const s = shapeOf(g), frags = parts(g.atoms.length, s.adj, () => true);
    let cx = frags.filter((p) => p.length > 1 && p.some((i) => (0, metals_ts_1.isMetal)(g.atoms[i].el)));
    if (!cx.length)
        cx = frags.filter((p) => p.length > 1 && centresOf(s, p).length);
    if (cx.length !== 1)
        return undefined;
    const e = entityOf(s, cx[0]);
    if (!e)
        return undefined;
    const named = e.ligands.map((lig) => ligandName(m, g, lig, api));
    if (named.some((x) => !x))
        return undefined;
    const ions = frags.filter((p) => p !== cx[0]).map((p) => ionOf(m, g, p, api));
    if (ions.some((x) => !x) || new Set(ions.map((x) => x.key)).size > 1)
        return undefined;
    if (ions.length && (Math.sign(ions[0].charge) !== -Math.sign(e.charge) || ions[0].charge * ions.length !== -e.charge))
        return undefined;
    if (e.metals.length === 1 && m.atoms[e.metals[0]].ox !== undefined)
        e.written = m.atoms[e.metals[0]].ox;
    return { c: { m, g, e, named: named, api }, ions: ions };
}
function stereoable(m) {
    if (m.bonds.some((b) => (b.stereo && b.stereo !== 3) || ["hashed", "dashed", "bold", "hollow"].includes(b.display ?? "")))
        return true;
    const adj = m.atoms.map(() => []);
    for (const b of m.bonds) {
        adj[b.atoms[0]].push(b.atoms[1]);
        adj[b.atoms[1]].push(b.atoms[0]);
    }
    return m.bonds.some((b) => b.type === 2 && b.stereo !== 3 && !smallRing(adj, b.atoms[0], b.atoms[1], () => true));
}
function keep(api) {
    const read = new Map(), atoms = new Map(), inchi = new Map();
    let readings = 0, inchis = 0;
    const once = (map, k, f) => {
        if (!map.has(k))
            map.set(k, (map === inchi ? ++inchis > 600 : ++readings > 150) ? undefined : f());
        return map.get(k);
    };
    return {
        read: (n) => once(read, n, () => api.read(n)),
        atoms: (n) => once(atoms, n, () => api.atoms(n)),
        inchi: (s) => once(inchi, typeof s === "string" ? s : JSON.stringify(s), () => api.inchi(s)),
        ...(api.aux ? { aux: (m) => once(inchi, `aux ${JSON.stringify(m)}`, () => api.aux(m)) } : {}),
        ...(api.cip ? { cip: (m) => (stereoable(m) ? api.cip(m) : undefined) } : {}),
    };
}

  };
  defs["naming.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setComplexNamer = exports.setNamer = exports.withAbbreviation = void 0;
exports.graphOf = graphOf;
exports.checkedName = checkedName;
exports.macrocycle = macrocycle;
exports.withoutRingEZ = withoutRingEZ;
const render_ts_1 = require("render.ts");
const common_ts_1 = require("common.ts");
const withAbbreviation = (name, abbreviation) => abbreviation && (0, common_ts_1.commonKey)(abbreviation) !== (0, common_ts_1.commonKey)(name) ? `${name} (${abbreviation})` : name;
exports.withAbbreviation = withAbbreviation;
function graphOf(m, cip, isotopes = false) {
    const iso = (a) => a.isotope ?? (a.label === "D" ? 2 : a.label === "T" ? 3 : undefined);
    if (m.bonds.some((b) => b.type < 1 || b.type > 3) || m.atoms.some((a) => a.text || a.radical || (!isotopes && iso(a))))
        return undefined;
    const used = m.atoms.map(() => 0);
    for (const b of m.bonds)
        for (const i of b.atoms)
            used[i] += b.type;
    return {
        atoms: m.atoms.map((a, i) => ({ el: iso(a) && (a.label === "D" || a.label === "T") ? "H" : a.label, charge: a.charge ?? 0,
            h: a.implicitHCount ?? (0, render_ts_1.hydrogens)(a.label, a.charge ?? 0, used[i]), ...(cip?.atoms[i] ? { cip: cip.atoms[i] } : {}), ...(iso(a) ? { iso: iso(a) } : {}) })),
        bonds: m.bonds.map((b, k) => ({ a: b.atoms[0], b: b.atoms[1], order: b.type, ...(cip?.bonds[k] ? { cip: cip.bonds[k] } : {}) })),
    };
}
let namer;
const setNamer = (n) => { namer = n; };
exports.setNamer = setNamer;
let complexNamer;
const setComplexNamer = (n) => { complexNamer = n; };
exports.setComplexNamer = setComplexNamer;
function checkedName(drawn, expanded, read, inchi, cip, known) {
    const raw = inchi(drawn);
    if (!raw)
        return undefined;
    const ring = macrocycle(expanded), inward = !!ring?.inward, key = (s) => (inward ? withoutRingEZ(s) : s), want = key(raw);
    let labels = cip?.(expanded);
    if (inward && labels)
        labels = { atoms: labels.atoms, bonds: labels.bonds.map((c, k) => (ring.bonds.has(k) ? undefined : c)) };
    const g = namer && graphOf(expanded, labels, true);
    const reads = (name) => { const smiles = name && read(name); return !!smiles && key(inchi(smiles)) === want; };
    const name = g && namer(g);
    if (name && reads(name))
        return name;
    const other = known?.(raw);
    return other && reads(other) ? other : complexNamer?.(expanded);
}
function joined(adj, u, v, most) {
    const seen = new Set([u]);
    for (let front = [u], d = 1; d <= most && front.length; d++) {
        const next = [];
        for (const i of front)
            for (const j of adj[i]) {
                if ((i === u && j === v) || seen.has(j))
                    continue;
                if (j === v)
                    return true;
                seen.add(j);
                next.push(j);
            }
        front = next;
    }
    return false;
}
function ringBonds(n, edges) {
    const adj = Array.from({ length: n }, () => []);
    for (const [a, b] of edges) {
        adj[a].push(b);
        adj[b].push(a);
    }
    const small = new Set(), bonds = new Set(), inSmall = edges.map(([a, b]) => joined(adj, a, b, 6));
    edges.forEach(([a, b], k) => { if (inSmall[k]) {
        small.add(a);
        small.add(b);
    } });
    edges.forEach(([a, b], k) => { if (!inSmall[k] && (small.has(a) || small.has(b)) && joined(adj, a, b, n))
        bonds.add(k); });
    return { bonds, small, adj };
}
function macrocycle(m) {
    if (m.atoms.length > 1000)
        return undefined;
    const edges = m.bonds.map((b) => b.atoms), { bonds, small, adj } = ringBonds(m.atoms.length, edges);
    if (!bonds.size)
        return undefined;
    const ends = new Set([...bonds].flatMap((k) => edges[k]));
    const nOf = new Map();
    for (const a of ends) {
        if (!small.has(a))
            continue;
        const found = [];
        for (const x of adj[a])
            for (const b of adj[x]) {
                if (b === a || !ends.has(b) || ends.has(x))
                    continue;
                if (adj[a].some((p) => p !== x && !ends.has(p) && adj[b].some((q) => q !== x && q !== p && !ends.has(q) && adj[p].includes(q))))
                    found.push(x);
            }
        if (found.length !== 1 || m.atoms[found[0]].label !== "N")
            return { bonds, inward: false };
        nOf.set(a, found[0]);
    }
    const at = (i) => m.atoms[i].location;
    const side = (a, b, p) => (at(b)[0] - at(a)[0]) * (at(p)[1] - at(a)[1]) - (at(b)[1] - at(a)[1]) * (at(p)[0] - at(a)[0]);
    const inward = [...bonds].every((k) => edges[k].every((e) => {
        if (!nOf.has(e))
            return true;
        const o = edges[k][0] === e ? edges[k][1] : edges[k][0], x = nOf.get(e);
        const beyond = nOf.get(o) ?? [...bonds].flatMap((j) => (j !== k && edges[j].includes(o) ? edges[j].filter((y) => y !== o) : []));
        if (Array.isArray(beyond) && beyond.length !== 1)
            return false;
        const w = Array.isArray(beyond) ? beyond[0] : beyond, d = (at(o)[0] - at(e)[0]) ** 2 + (at(o)[1] - at(e)[1]) ** 2;
        const sx = side(e, o, x), sw = side(e, o, w);
        return d > 0 && Math.abs(sx) > 0.01 * d && Math.abs(sw) > 0.01 * d && Math.sign(sx) === Math.sign(sw);
    }));
    return { bonds, inward };
}
function withoutRingEZ(inchi) {
    if (!inchi || inchi.length > 20000)
        return inchi;
    const layers = inchi.split("/"), c = layers.find((l, k) => k > 1 && l[0] === "c");
    if (!c || layers[1].includes(".") || /[;*]/.test(c))
        return inchi;
    const edges = [], stack = [];
    let prev, n = 0;
    for (const t of c.slice(1).match(/\d+|[-(),]/g) ?? []) {
        if (t === "(") {
            if (prev === undefined)
                return inchi;
            stack.push(prev);
        }
        else if (t === ")") {
            prev = stack.pop();
            if (prev === undefined)
                return inchi;
        }
        else if (t === ",") {
            prev = stack[stack.length - 1];
            if (prev === undefined)
                return inchi;
        }
        else if (t !== "-") {
            const a = Number(t) - 1;
            if (prev !== undefined)
                edges.push([prev, a]);
            prev = a;
            n = Math.max(n, a + 1);
        }
    }
    if (n > 1000)
        return inchi;
    const { bonds } = ringBonds(n, edges), drop = new Set([...bonds].map((k) => `${Math.max(...edges[k]) + 1}-${Math.min(...edges[k]) + 1}`));
    return layers.flatMap((l, k) => {
        if (k < 2 || l[0] !== "b")
            return [l];
        const kept = l.slice(1).split(",").filter((x) => !drop.has(x.replace(/[-+?]$/, "")));
        return kept.length ? [`b${kept.join(",")}`] : [];
    }).join("/");
}

  };
  defs["render.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tableRow = exports.TABLE_ROW = exports.TABLE_PAD = exports.TLC_FRONT = exports.TLC_ORIGIN = exports.DESCENT = exports.ASCENT = exports.LINE = exports.GAP_ARROW_PT = exports.GAP_PT = exports.isNumber = exports.CAPTION_PT = exports.NONMETAL = exports.H_FIRST = exports.scaleOf = exports.labelTurn = exports.HIGHLIGHT = exports.SHAPE_KINDS = exports.turnedWith = exports.turnPoint = exports.turns = exports.isBracket = exports.SHADE = exports.linesOf = exports.TABLE_LINES = exports.sweepOf = exports.sweepBend = exports.SWEEPS = exports.marked = exports.takesHeads = exports.isLine = exports.straightArrow = exports.curved = exports.LINE_KINDS = exports.ARROW_KINDS = exports.isOrbital = exports.ALL_ARROW_KINDS = exports.sizeOf = exports.sizedHead = exports.headSize = exports.headOfLength = exports.ARC_HEAD = exports.BLOCK_SIZES = exports.ARROW_SIZES = exports.PHASES = exports.ORBITAL_SHAPES = exports.orderOf = exports.QUADRUPLE = exports.HBOND = exports.AROMATIC = void 0;
exports.shadeAt = void 0;
exports.placedAt = placedAt;
exports.headsOf = headsOf;
exports.shapeCorners = shapeCorners;
exports.shapeBounds = shapeBounds;
exports.inShape = inShape;
exports.inDrawn = inDrawn;
exports.settleShape = settleShape;
exports.ringCircleRadius = ringCircleRadius;
exports.ligandEllipse = ligandEllipse;
exports.circledRings = circledRings;
exports.hydrogens = hydrogens;
exports.lonePairs = lonePairs;
exports.signSpot = signSpot;
exports.signBonds = signBonds;
exports.render = render;
exports.renderParts = renderParts;
exports.lineOffsets = lineOffsets;
exports.turnPx = turnPx;
exports.placeCaptions = placeCaptions;
exports.fitArrows = fitArrows;
exports.bendPoint = bendPoint;
exports.arrowPath = arrowPath;
exports.arrowShapes = arrowShapes;
exports.headBarb = headBarb;
exports.blockOutline = blockOutline;
exports.shapePaths = shapePaths;
exports.markAt = markAt;
exports.polymerLabelsAt = polymerLabelsAt;
exports.shapeInk = shapeInk;
exports.dashes = dashes;
exports.waveAlong = waveAlong;
exports.orbitalPaths = orbitalPaths;
exports.tlcLayout = tlcLayout;
exports.spotPath = spotPath;
exports.tableLayout = tableLayout;
exports.curvePath = curvePath;
exports.ellipsePoints = ellipsePoints;
exports.ellipseArrow = ellipseArrow;
exports.curveBox = curveBox;
exports.depthRange = depthRange;
exports.crossingBonds = crossingBonds;
const labels_ts_1 = require("labels.ts");
const query_ts_1 = require("query.ts");
const rings_ts_1 = require("rings.ts");
const richtext_ts_1 = require("richtext.ts");
exports.AROMATIC = 4, exports.HBOND = 10, exports.QUADRUPLE = 14;
const orderOf = (type) => (type === exports.AROMATIC ? 1.5 : type === exports.HBOND ? 0 : type === exports.QUADRUPLE ? 4 : type === 2 || type === 3 ? type : 1);
exports.orderOf = orderOf;
function placedAt(c, arrows) {
    const a = c.placed && c.on && arrows?.find((x) => x.id === c.on.arrow), p = c.placed;
    if (!a || !p || Math.abs(a.to[0] - a.from[0] - p.arrow[0]) > 2e-3 || Math.abs(a.to[1] - a.from[1] - p.arrow[1]) > 2e-3)
        return undefined;
    return [(a.from[0] + a.to[0]) / 2 + p.at[0], (a.from[1] + a.to[1]) / 2 + p.at[1]];
}
exports.ORBITAL_SHAPES = ["s", "oval", "lobe", "hybrid", "p", "d", "dz2"];
exports.PHASES = ["plain", "shaded", "filled", "phased"];
exports.ARROW_SIZES = { large: 22.5, medium: 15, small: 10 };
exports.BLOCK_SIZES = { large: 12, medium: 6, small: 6 };
exports.ARC_HEAD = 8;
const headOfLength = (length, flat = false) => ({ length, centre: flat ? length : length * 0.875, width: length / 4 });
exports.headOfLength = headOfLength;
const headSize = (a) => a.headSize ?? (0, exports.sizedHead)(a, a.kind === "block" ? "large" : "small");
exports.headSize = headSize;
const sizedHead = (a, size) => (0, exports.headOfLength)((a.kind === "block" ? exports.BLOCK_SIZES[size] : size === "small" && (0, exports.curved)(a) ? exports.ARC_HEAD : exports.ARROW_SIZES[size]) * (a.style === "bold" ? 2 : 1), a.kind === "block");
exports.sizedHead = sizedHead;
const sizeOf = (a) => {
    const h = (0, exports.headSize)(a);
    return ["large", "medium", "small"].find((k) => { const o = (0, exports.sizedHead)(a, k); return Math.abs(o.length - h.length) < 0.01 && Math.abs(o.centre - h.centre) < 0.01 && Math.abs(o.width - h.width) < 0.01; });
};
exports.sizeOf = sizeOf;
exports.ALL_ARROW_KINDS = ["reaction", "equilibrium", "resonance", "retro", "nogo", "hash", "dipole", "block", "curved", "fishhook", "double", "line", "arc", "orbital", "cut", "curve"];
const isOrbital = (a) => a.kind === "orbital";
exports.isOrbital = isOrbital;
exports.ARROW_KINDS = ["reaction", "equilibrium", "resonance", "retro", "nogo", "hash", "dipole", "block", "curved", "fishhook", "double"];
exports.LINE_KINDS = ["line", "arc"];
const curved = (a) => a.kind === "curved" || a.kind === "fishhook" || a.kind === "double" || a.kind === "arc";
exports.curved = curved;
const straightArrow = (a) => !(0, exports.curved)(a) && a.kind !== "line" && a.kind !== "orbital" && a.kind !== "cut" && a.kind !== "curve";
exports.straightArrow = straightArrow;
const isLine = (a) => a.kind === "line" || a.kind === "arc" || a.kind === "curve";
exports.isLine = isLine;
const takesHeads = (a) => !["equilibrium", "retro", "nogo", "hash", "dipole", "block", "orbital", "cut"].includes(a.kind);
exports.takesHeads = takesHeads;
const marked = (a) => a.kind === "nogo" || a.kind === "hash" || a.kind === "dipole";
exports.marked = marked;
function headsOf(a) {
    const own = {
        reaction: ["none", "full"], curved: ["none", "full"], double: ["full", "full"], resonance: ["full", "full"], nogo: ["none", "full"], hash: ["none", "full"], dipole: ["none", "full"], block: ["none", "full"],
        fishhook: ["none", (a.bend ?? 0) >= 0 ? "left" : "right"],
    };
    const [start, end] = own[a.kind] ?? ["none", "none"];
    return { start: a.start ?? start, end: a.end ?? end };
}
exports.SWEEPS = [90, 120, 180, 270];
const sweepBend = (degrees) => Math.tan((degrees * Math.PI) / 720) / 2;
exports.sweepBend = sweepBend;
const sweepOf = (bend) => (4 * Math.atan(2 * Math.abs(bend)) * 180) / Math.PI;
exports.sweepOf = sweepOf;
exports.TABLE_LINES = {
    journal: ["top", "header", "bottom"], grid: ["top", "bottom", "left", "right", "header", "rows", "cols"], box: ["top", "bottom", "left", "right"], none: [],
};
const linesOf = (t) => t?.lines ?? (t?.grid ? exports.TABLE_LINES.grid : exports.TABLE_LINES.journal);
exports.linesOf = linesOf;
exports.SHADE = { depth: 0.12, blur: 0, opacity: 0.35 };
const isBracket = (sh) => sh.kind === "brackets" || sh.kind === "parens" || sh.kind === "braces";
exports.isBracket = isBracket;
const turns = (sh) => sh.kind !== "tlc" && sh.kind !== "table" && sh.kind !== "picture";
exports.turns = turns;
const turnPoint = (q, c, degrees) => {
    const r = (degrees * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r), dx = q[0] - c[0], dy = q[1] - c[1];
    return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
};
exports.turnPoint = turnPoint;
const middleOf = (sh) => [(sh.from[0] + sh.to[0]) / 2, (sh.from[1] + sh.to[1]) / 2];
const turnedWith = (sh, q) => (sh.angle && (0, exports.turns)(sh) ? (0, exports.turnPoint)(q, middleOf(sh), sh.angle) : q);
exports.turnedWith = turnedWith;
function shapeCorners(sh) {
    const c = middleOf(sh), t = (q) => (sh.angle ? (0, exports.turnPoint)(q, c, sh.angle) : q);
    return { from: t(sh.from), to: t(sh.to), c1: t([sh.from[0], sh.to[1]]), c2: t([sh.to[0], sh.from[1]]) };
}
function shapeBounds(sh) {
    const ps = Object.values(shapeCorners(sh)), xs = ps.map((q) => q[0]), ys = ps.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}
function inShape(sh, p) {
    const q = sh.angle ? (0, exports.turnPoint)(p, middleOf(sh), -sh.angle) : p;
    return q[0] >= Math.min(sh.from[0], sh.to[0]) && q[0] <= Math.max(sh.from[0], sh.to[0]) && q[1] >= Math.min(sh.from[1], sh.to[1]) && q[1] <= Math.max(sh.from[1], sh.to[1]);
}
function inDrawn(sh, p) {
    if (!inShape(sh, p) || sh.kind !== "oval")
        return inShape(sh, p);
    const c = middleOf(sh), q = sh.angle ? (0, exports.turnPoint)(p, c, -sh.angle) : p, rx = Math.abs(sh.to[0] - sh.from[0]) / 2, ry = Math.abs(sh.to[1] - sh.from[1]) / 2;
    return ((q[0] - c[0]) / rx) ** 2 + ((q[1] - c[1]) / ry) ** 2 <= 1;
}
function settleShape(sh) {
    const { angle: _, ...rest } = sh;
    if (!(0, exports.turns)(sh))
        return rest;
    const near = (a, b) => Math.abs(a - b) < 1e-6, c = middleOf(sh);
    const half = (s) => ({ ...s, from: s.to, to: s.from, ...(s.side ? { side: s.side === "left" ? "right" : "left" } : {}) });
    const quarter = (s, sign) => {
        const d = [s.from[0] - c[0], s.from[1] - c[1]], r = [-sign * d[1], sign * d[0]];
        return { ...s, from: [c[0] + r[0], c[1] + r[1]], to: [c[0] - r[0], c[1] - r[1]] };
    };
    let a = (((((sh.angle ?? 0) + 180) % 360) + 360) % 360) - 180, out = rest;
    if (a > 90 + 1e-6) {
        out = half(out);
        a -= 180;
    }
    else if (a <= -90 + 1e-6) {
        out = half(out);
        a += 180;
    }
    if (near(a, 0))
        return out;
    if (!(0, exports.isBracket)(sh) && near(Math.abs(a), 90))
        return quarter(out, Math.sign(a));
    return { ...out, angle: Math.round(a * 1e6) / 1e6 };
}
exports.SHAPE_KINDS = ["box", "rounded", "oval", "highlight", "brackets", "parens", "braces", "tlc", "table", "picture"];
exports.HIGHLIGHT = "#DCE4F6";
const labelTurn = (l) => (l.angle && l.pivot ? `rotate(${-l.angle} ${l.pivot[0]} ${l.pivot[1]})` : undefined);
exports.labelTurn = labelTurn;
const scaleOf = (x) => x.scale ?? 1;
exports.scaleOf = scaleOf;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]);
const unit = (a) => mul(a, 1 / len(a));
const perp = (a) => [-a[1], a[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (len(a) * len(b)))));
const SUB = 0.75, DROP = 0.212, RISE = 0.33;
const TIP = 0.0165;
const MAX_TRIM = 0.67;
exports.H_FIRST = new Set(['O', 'F', 'S', 'Cl', 'Se', 'Br', 'Te', 'I']);
exports.NONMETAL = new Set(["H", "D", "T", "He", "B", "C", "N", "O", "F", "Ne", "Si", "P", "S", "Cl", "Ar", "Ge", "As", "Se", "Br", "Kr", "Sb", "Te", "I", "Xe", "At", "Rn", "*", "R"]);
const VALENCE = { C: 4, Si: 4, N: 3, P: 3, As: 3, B: 3, Al: 3, O: 2, S: 2, Se: 2, Te: 2, F: 1, Cl: 1, Br: 1, I: 1 };
function ringCircleRadius(n, L, spacing) {
    const k = n === 4 ? 1.6 : n === 5 ? 1.5 : n >= 7 ? 1.2 : 4 / 3;
    return L * (1 / (2 * Math.tan(Math.PI / n)) - spacing * k);
}
function ligandEllipse(ring, c, from, spacing) {
    const along = from && len(sub(c, from)) > 1e-9 ? unit(sub(c, from)) : [0, 1], across = perp(along), n = ring.length;
    const reach = (d) => Math.max(...ring.map((q) => Math.abs(dot(sub(q, c), d)))), f = ringCircleRadius(n, 1, spacing) * 2 * Math.sin(Math.PI / n);
    return { across, along, ra: reach(across) * f, rb: reach(along) * f };
}
function circledRings(mol) {
    if (!mol.atoms.some((a) => a.circle))
        return [];
    const used = mol.atoms.map(() => 0);
    for (const b of mol.bonds)
        for (const i of b.atoms)
            used[i] += (0, exports.orderOf)(b.type);
    const g = { atoms: mol.atoms.map((a, i) => ({ el: a.text ? "X" : a.label, charge: a.charge ?? 0, h: a.implicitHCount ?? hydrogens(a.label, a.charge ?? 0, used[i]) })), bonds: mol.bonds.filter((b) => b.type !== exports.HBOND).map((b) => ({ a: b.atoms[0], b: b.atoms[1], order: Math.min(3, Math.max(1, b.type)) })) };
    const aromatic = (0, rings_ts_1.aromaticAtoms)(g);
    return (0, rings_ts_1.rings)(g).filter((r) => r.length >= 5 && r.length <= 8 && r.every((i) => mol.atoms[i].circle && aromatic[i]));
}
function hydrogens(label, charge, used, radical = 0) {
    const v = VALENCE[label];
    if (v === undefined)
        return 0;
    const target = v === 4 ? v - Math.abs(charge) : label === 'B' || label === 'Al' ? v - charge : v + charge;
    return Math.max(0, Math.round(target - used - radical));
}
const SHELL = { H: 1, B: 3, Al: 3, C: 4, Si: 4, N: 5, P: 5, As: 5, O: 6, S: 6, Se: 6, Te: 6, F: 7, Cl: 7, Br: 7, I: 7 };
function lonePairs(label, charge, used, h, radical = 0) {
    const e = SHELL[label];
    return e === undefined ? 0 : Math.max(0, Math.floor((e - used - h - charge - radical) / 2));
}
const meet = (p, r, q, s) => {
    const d = cross(r, s);
    return Math.abs(d) < 1e-9 ? null : add(p, mul(r, cross(sub(q, p), s) / d));
};
function crosses(b, p, q) {
    let t0 = 0, t1 = 1;
    for (const [e, f] of [[p[0] - q[0], p[0] - b[0]], [q[0] - p[0], b[2] - p[0]], [p[1] - q[1], p[1] - b[1]], [q[1] - p[1], b[3] - p[1]]]) {
        if (Math.abs(e) < 1e-12) {
            if (f < 0)
                return false;
            continue;
        }
        if (e < 0)
            t0 = Math.max(t0, f / e);
        else
            t1 = Math.min(t1, f / e);
        if (t0 > t1)
            return false;
    }
    return true;
}
function signSpot(X, bonds, rings, left, right, raised, w, ink, rtl, label, size) {
    const [x0, y0, x1, y1] = outlineBox(ink), first = rtl ? left - w : right, second = rtl ? right : left - w;
    const cutBy = (pts, d, u, lines, m, o = [0, 0]) => {
        let cut = 0;
        for (const q of pts) {
            const r = sub(add(q, o), X), a = dot(r, u), c = cross(u, r);
            for (const off of lines) {
                const e = Math.abs(c - off);
                if (e < m) {
                    const s = Math.sqrt(m * m - e * e);
                    if (a - s < d)
                        cut = Math.max(cut, a + s);
                }
            }
        }
        return cut;
    };
    const ways = bonds.map(({ to, lines, m }) => {
        const d = len(sub(to, X)), u = d > 1e-9 ? mul(sub(to, X), 1 / d) : [1, 0];
        return { d, u, lines, m, cut: cutBy(label, d, u, lines, m) };
    });
    const inRing = (v) => rings.some(([p, q]) => { const a = ways[p].u, b = ways[q].u, s = cross(a, b); return s * cross(a, v) > 0 && s * cross(v, b) > 0; });
    const mid = [(x0 + x1) / 2, (y0 + y1) / 2], stops = (o) => ways.some(({ d, u, lines, m, cut }) => cutBy(ink, d, u, lines, m, o) > cut + 1e-9);
    const clear = (o) => { const v = sub(add(o, mid), X); return !inRing(v) && !stops(o) && ways.every(({ u }) => angle(v, u) >= Math.PI / 6); };
    let at = [[first, raised], [second, raised]].find(clear);
    if (!at) {
        const TAU = 2 * Math.PI, taken = bonds.map(({ to }) => Math.atan2(to[1] - X[1], to[0] - X[0]));
        for (const q of label)
            if (len(sub(q, X)) > 0.62 * size)
                taken.push(Math.atan2(q[1] - X[1], q[0] - X[0]));
        const sorted = taken.map((t) => ((t % TAU) + TAU) % TAU).sort((p, q) => p - q);
        const fromUpRight = (t) => Math.abs(Math.atan2(Math.sin(t + Math.PI / 4), Math.cos(t + Math.PI / 4)));
        let t = -Math.PI / 4, most = -Infinity;
        sorted.forEach((s, k) => {
            const span = (k + 1 < sorted.length ? sorted[k + 1] : sorted[0] + TAU) - s, mid = s + span / 2, score = span - (inRing([Math.cos(mid), Math.sin(mid)]) ? 10 : 0);
            if (score > most + 1e-6 || (score > most - 1e-6 && fromUpRight(mid) < fromUpRight(t))) {
                most = score;
                t = mid;
            }
        });
        const d = [Math.cos(t), Math.sin(t)], g = 0.14 * size;
        const fits = (o) => label.every((q) => q[0] <= o[0] + x0 - g || q[0] >= o[0] + x1 + g || q[1] <= o[1] + y0 - g || q[1] >= o[1] + y1 + g) && !stops(o);
        for (let r = 0; r <= 4 * size && !at; r += 0.02 * size) {
            const o = sub(add(X, mul(d, r)), mid);
            if (fits(o))
                at = o;
        }
        at ?? (at = sub(add(X, mul(d, 4 * size)), mid));
    }
    return { at, after: at[0] === right && at[1] === raised };
}
function signBonds(i, nbrs, covalent, bondOf, labelled, at, z) {
    const rings = [], sp = z.spacing;
    const bonds = nbrs[i].map((j, k) => {
        const bd = bondOf(i, j), two = bd.type === 2 || bd.type === exports.AROMATIC, ring = ringsThrough(i, j, covalent);
        for (const r of ring) {
            const q = nbrs[i].indexOf(r[1]);
            if (q > k)
                rings.push([k, q]);
        }
        const lines = bd.type === exports.QUADRUPLE ? [-1.5, -0.5, 0.5, 1.5].map((f) => f * sp) : two && labelled(j) && !bd.position && !ring.length ? [-sp / 2, sp / 2] : two || bd.type === 3 ? [-sp, 0, sp] : [0];
        return { to: at(j), lines, m: z.margin + (bd.stereo || bd.display ? z.wide : z.hw) };
    });
    return { bonds, rings };
}
function ringsThrough(a, b, nbrs) {
    const out = [];
    const walk = (path) => {
        const at = path[path.length - 1];
        if (path.length > 8)
            return;
        for (const n of nbrs[at]) {
            if (n === b)
                out.push([...path, b]);
            else if (!path.includes(n))
                walk([...path, n]);
        }
    };
    for (const n of nbrs[a])
        if (n !== b)
            walk([a, n]);
    return out;
}
const outlineBoxes = new WeakMap();
function outlineBox(pts) {
    let b = outlineBoxes.get(pts);
    if (!b) {
        b = [Infinity, Infinity, -Infinity, -Infinity];
        for (const [x, y] of pts) {
            if (x < b[0])
                b[0] = x;
            if (y < b[1])
                b[1] = y;
            if (x > b[2])
                b[2] = x;
            if (y > b[3])
                b[3] = y;
        }
        outlineBoxes.set(pts, b);
    }
    return b;
}
const outlineCells = new WeakMap();
function cellsOf(pts) {
    let cells = outlineCells.get(pts);
    if (!cells) {
        const by = new Map();
        for (const q of pts) {
            const k = `${Math.floor(q[0] / 2)} ${Math.floor(q[1] / 2)}`;
            let list = by.get(k);
            if (!list)
                by.set(k, (list = []));
            list.push(q);
        }
        cells = [...by.values()].map((list) => {
            const b = outlineBox(list), c = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
            return { c, r: Math.max(...list.map((q) => len(sub(q, c)))), pts: list };
        });
        outlineCells.set(pts, cells);
    }
    return cells;
}
const pieceBox = ({ pts, x, y, f }) => { const b = outlineBox(pts); return [x + b[0] * f, y + b[1] * f, x + b[2] * f, y + b[3] * f]; };
const mirrors = new WeakMap();
function mirrored(pts, width) {
    let m = mirrors.get(pts);
    if (!m)
        mirrors.set(pts, (m = pts.map(([x, y]) => [width - x, y])));
    return m;
}
function boxSpan(o, u, b, m) {
    let lo = Infinity, hi = -Infinity;
    const slab = (p, d, a, c) => {
        if (Math.abs(d) < 1e-12)
            return p >= a && p <= c ? [-Infinity, Infinity] : [Infinity, -Infinity];
        const t0 = (a - p) / d, t1 = (c - p) / d;
        return t0 < t1 ? [t0, t1] : [t1, t0];
    };
    for (const [x0, x1, y0, y1] of [[b[0] - m, b[2] + m, b[1], b[3]], [b[0], b[2], b[1] - m, b[3] + m]]) {
        const [a0, a1] = slab(o[0], u[0], x0, x1), [c0, c1] = slab(o[1], u[1], y0, y1), t0 = Math.max(a0, c0), t1 = Math.min(a1, c1);
        if (t0 <= t1) {
            lo = Math.min(lo, t0);
            hi = Math.max(hi, t1);
        }
    }
    for (const c of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) {
        const w0 = o[0] - c[0], w1 = o[1] - c[1], h = w0 * u[0] + w1 * u[1], disc = h * h - (w0 * w0 + w1 * w1 - m * m);
        if (disc >= 0) {
            lo = Math.min(lo, -h - Math.sqrt(disc));
            hi = Math.max(hi, -h + Math.sqrt(disc));
        }
    }
    return lo <= hi ? [lo, hi] : undefined;
}
const placedPoints = (shape) => shape.flatMap(({ pts, x, y, f }) => pts.map(([px, py]) => [x + px * f, y + py * f]));
function render(mol, s, measure, scale, zRange) {
    const raw = mol.bonds.map((b) => len(sub(mol.atoms[b.atoms[0]].location, mol.atoms[b.atoms[1]].location)));
    const median = [...raw].sort((x, y) => x - y)[Math.floor(raw.length / 2)] || 1;
    const k = scale ?? s.bond / median;
    const pts = mol.atoms.map((a) => [a.location[0] * k, -a.location[1] * k]);
    const endOn = new Map();
    for (const b of mol.bonds) {
        const [p, q] = b.atoms.map((i) => mol.atoms[i].location), flat = Math.hypot(p[0] - q[0], p[1] - q[1]), deep = Math.abs((p[2] ?? 0) - (q[2] ?? 0));
        if (deep > 0.3 && flat < 0.1 * Math.hypot(flat, deep))
            endOn.set(b, (p[2] ?? 0) < (q[2] ?? 0) ? b.atoms[0] : b.atoms[1]);
    }
    const nbrs = mol.atoms.map(() => []);
    mol.bonds.forEach((b) => { if (!mol.atoms[b.atoms[0]].hidden && !mol.atoms[b.atoms[1]].hidden && !endOn.has(b)) {
        nbrs[b.atoms[0]].push(b.atoms[1]);
        nbrs[b.atoms[1]].push(b.atoms[0]);
    } });
    const bondAt = new Map();
    const key = (i, j) => (i < j ? `${i} ${j}` : `${j} ${i}`);
    mol.bonds.forEach((b) => bondAt.set(key(b.atoms[0], b.atoms[1]), b));
    const covalent = mol.bonds.some((b) => b.type === exports.HBOND) ? nbrs.map((ns, i) => ns.filter((j) => bondAt.get(key(i, j)).type !== exports.HBOND)) : nbrs;
    const zs = new Map();
    const zOf = (f) => {
        let z = zs.get(f);
        if (!z)
            zs.set(f, (z = { L: s.bond * f, hw: (s.line / 2) * f, wide: s.bold * 0.75 * f, tip: TIP * s.bond * f, bold: s.bold * f, spacing: s.spacing * f, hash: s.hash * f, margin: s.margin * f, size: s.size * f }));
        return z;
    };
    const atomZ = mol.atoms.map((a) => zOf((0, exports.scaleOf)(a)));
    const deg = (i) => nbrs[i].length;
    const dir = (i, j) => unit(sub(pts[j], pts[i]));
    const labelled = mol.atoms.map((a, i) => (a.centre ? !deg(i) : !a.attach && !a.bead && !a.hidden && (a.label !== 'C' || !deg(i) || !!a.text || !!a.isotope || !!a.shown || (deg(i) === 1 ? !!s.terminal : !!s.carbons))));
    const newman = new Map();
    for (const back of endOn.values())
        if (!labelled[back])
            newman.set(back, 0.4 * zOf((0, exports.scaleOf)(mol.atoms[back])).L);
    const labels = [], labelAtom = new Map();
    const marks = mol.atoms.map(() => []);
    const sign = (c) => `${Math.abs(c) > 1 ? Math.abs(c) : ''}${c > 0 ? '+' : '–'}`;
    const pointR = (0.75 * s.size + 2 * s.line) / 2;
    const pointOutline = (st) => st === "diamond"
        ? [[pointR, 0], [0, pointR], [-pointR, 0], [0, -pointR]]
        : Array.from({ length: 10 }, (_, k) => { const t = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 0.45 * pointR : pointR; return [r * Math.cos(t), r * Math.sin(t)]; });
    const ratio = mol.atoms.map((a) => (a.size && s.labelPt ? a.size / s.labelPt : 1) * (0, exports.scaleOf)(a));
    const grown = (m, r) => (r === 1 ? m : { width: m.width * r, ascent: m.ascent * r, outline: m.outline.map(([px, py]) => [px * r, py * r]) });
    const runsAt = mol.atoms.map(() => []), capAt = mol.atoms.map(() => 0);
    const meets = mol.atoms.map(() => undefined);
    const clips = mol.atoms.map(() => ({ boxes: [], pieces: [] }));
    const shapes = mol.atoms.map((a, i) => {
        const R = newman.get(i);
        if (R) {
            const { margin, hw } = atomZ[i], r = Math.max(0.05 * R, R - margin - hw);
            clips[i].pieces = [{ pts: Array.from({ length: 48 }, (_, j) => [r * Math.cos((2 * Math.PI * j) / 48), r * Math.sin((2 * Math.PI * j) / 48)]), x: pts[i][0], y: pts[i][1], f: 1 }];
            return clips[i].pieces;
        }
        if (a.attach === "diamond" || a.attach === "star") {
            const f = (0, exports.scaleOf)(a), inset = Math.max(0.2, 1 - s.margin / pointR), edge = pointOutline(a.attach).map((q) => mul(q, f));
            clips[i].pieces = [{ pts: edge.flatMap((q, k) => { const r = edge[(k + 1) % edge.length]; return Array.from({ length: 6 }, (_, j) => mul(add(q, mul(sub(r, q), j / 6)), inset)); }), x: pts[i][0], y: pts[i][1], f: 1 }];
            return clips[i].pieces;
        }
        const face = a.font || a.bold || a.italic ? { font: a.font, bold: a.bold, italic: a.italic } : undefined;
        const r = ratio[i], S = s.size * r;
        const M = !face && r === 1 ? measure : (t) => grown(measure(t, face), r);
        if (!labelled[i]) {
            if (a.charge && !a.circled) {
                const t = sign(a.charge), m = M(t), dirs = nbrs[i].map((j) => dir(i, j));
                const gap = (c) => Math.min(...dirs.map((b) => angle(b, c)));
                const d = [[1, -1], [-1, -1], [1, 1], [-1, 1], [0, -1], [1, 0], [0, 1], [-1, 0]].map(unit).reduce((best, c) => (gap(c) > gap(best) + 0.01 ? c : best));
                const c = add(pts[i], mul(d, 0.6 * S));
                labels.push({ text: t, x: c[0] - (m.width * SUB) / 2, y: c[1] + (m.ascent * SUB) / 2, size: S * SUB, colour: a.colour });
                labelAtom.set(labels[labels.length - 1], i);
                marks[i] = m.outline.map(([px, py]) => [c[0] - (m.width * SUB) / 2 + px * SUB, c[1] + (m.ascent * SUB) / 2 + py * SUB]);
            }
            return [];
        }
        const look = { ...(a.font ? { font: a.font } : {}), ...(a.bold ? { bold: true } : {}), ...(a.italic ? { italic: true } : {}), ...(a.underline ? { underline: true } : {}) };
        const shape = [];
        capAt[i] = M('H').ascent;
        const styled = a.text && a.runs && (0, richtext_ts_1.plainOf)(a.runs) === a.text ? a.runs.flatMap((x) => x.text.split("").map(() => x)) : undefined;
        const stylePieces = (text, at) => {
            if (!styled || at === undefined)
                return [{ text, look, m: M(text) }];
            const out = [];
            for (let k = 0; k < text.length; k++) {
                const st = styled[at + k], last = out[out.length - 1];
                if (last && k && styled[at + k - 1] === st) {
                    last.text += text[k];
                    continue;
                }
                out.push({ text: text[k], look: { ...look, ...(st?.bold ? { bold: true } : {}), ...(st?.italic ? { italic: true } : {}), ...(st?.underline ? { underline: true } : {}) } });
            }
            return out.map((p) => {
                const fc = p.look.font || p.look.bold || p.look.italic ? { font: p.look.font, bold: p.look.bold, italic: p.look.italic } : undefined;
                return { ...p, m: !fc && r === 1 ? measure(p.text) : grown(measure(p.text, fc), r) };
            });
        };
        const Mx = (text, at) => {
            const ps = stylePieces(text, at);
            if (ps.length === 1)
                return ps[0].m;
            let x = 0;
            const outline = [];
            for (const p of ps) {
                for (const [px, py] of p.m.outline)
                    outline.push([x + px, py]);
                x += p.m.width;
            }
            return { width: x, ascent: Math.max(...ps.map((p) => p.m.ascent)), outline };
        };
        const run = (text, x, y, f = 1, line = 0, at) => {
            let px = x;
            for (const p of stylePieces(text, at)) {
                labels.push({ text: p.text, x: px, y, size: S * f, colour: a.colour, ...p.look });
                labelAtom.set(labels[labels.length - 1], i);
                px += p.m.width * f;
            }
            const m = Mx(text, at);
            if (!m.outline.length)
                return undefined;
            const r = { line, text, width: m.width, p: { pts: m.outline, x, y, f } };
            shape.push(r.p);
            runsAt[i].push(r);
            return r;
        };
        const charged = (left, right, base, rtl) => {
            if (!a.charge || a.circled)
                return;
            const t = sign(a.charge), m = M(t), ink = m.outline.length ? m.outline.map(([px, py]) => [px * SUB, py * SUB]) : [[0, -m.ascent * SUB], [m.width * SUB, 0]];
            const { bonds, rings } = signBonds(i, nbrs, covalent, (p, q) => bondAt.get(key(p, q)), (j) => labelled[j], (j) => pts[j], atomZ[i]);
            const { at } = signSpot(pts[i], bonds, rings, left, right, base - RISE * S, m.width * SUB, ink, rtl, placedPoints(shape), S);
            run(t, at[0], at[1], SUB, -1);
        };
        const inkOf = (t) => { const o = M(t).outline; if (!o.length)
            return [0, 0]; const b = outlineBox(o); return [b[0], b[2]]; };
        const near = (ch) => M(ch).width / 2 - inkOf(ch)[0];
        const [x, y] = pts[i];
        const v = nbrs[i].reduce((acc, j) => add(acc, dir(i, j)), [0, 0]);
        const steep = len(v) > 1e-6 && Math.abs(v[1]) > Math.abs(v[0]) * Math.tan((70 * Math.PI) / 180);
        const align = a.align, rtl = align ? align === "right" : deg(i) > 0 && !steep && v[0] > 1e-6;
        if (a.centre) {
            const m = M('*');
            meets[i] = run('*', x - m.width / 2, y + m.ascent / 2);
            return shape;
        }
        const ql = (0, query_ts_1.queryLabel)(a.text);
        if (a.text && (ql === 'list' || ql === 'alt' || ql === 'link')) {
            const range = ql === 'link' ? /\d{1,2}-\d{1,2}$/.exec(a.text)[0] : '', pieces = [];
            for (const t of a.text.slice(0, a.text.length - range.length).match(/\d+|\D+/g) ?? [])
                pieces.push({ t, f: /^\d/.test(t) && /[A-Za-z)]$/.test(pieces[pieces.length - 1]?.t ?? '') ? SUB : 1 });
            if (range)
                pieces.push({ t: range, f: SUB });
            const width = pieces.reduce((n, p) => n + M(p.t).width * p.f, 0), first = M(a.text[0]), base = y + first.ascent / 2;
            let px = 0, right = -Infinity;
            for (const p of pieces) {
                right = Math.max(right, px + inkOf(p.t)[1] * p.f);
                px += M(p.t).width * p.f;
            }
            const cx = rtl ? x + near(a.text[0]) - right : x - first.width / 2;
            px = cx;
            for (const p of pieces) {
                run(p.t, px, p.f === 1 ? base : base + DROP * S, p.f);
                px += M(p.t).width * p.f;
            }
            charged(cx, cx + width, base, rtl);
            return shape;
        }
        if (a.text?.includes("\n")) {
            const rows = a.text.split("\n"), k0 = align === "above" ? rows.length - 1 : 0, own = rows[k0] || "H", us = rows.map((t) => (0, labels_ts_1.units)(t));
            const at = new Map();
            let place = 0;
            us.forEach((line) => { for (const u of line) {
                at.set(u, place);
                place += u.text.length + (u.count?.length ?? 0);
            } place++; });
            const wide = (u) => Mx(u.text, at.get(u)).width + (u.count ? Mx(u.count, at.get(u) + u.text.length).width * SUB : 0);
            const widths = us.map((line) => line.reduce((w, u) => w + wide(u), 0)), tail = us[k0][us[k0].length - 1];
            const just = align === "centre" || align === "above" || align === "below" ? "centre" : align === "right" || (!align && rtl) ? "right" : "left";
            const o = rows.slice(0, k0).reduce((n, t) => n + t.length + 1, 0), last = o + own.length - 1;
            const first = Mx(own[0], o), base = y + first.ascent / 2, start = x - first.width / 2, end = x + (tail?.count ? Mx(tail.count.slice(-1), last).width * SUB : Mx(own[own.length - 1], last).width) / 2;
            const from = (j) => (just === "centre" ? x - widths[j] / 2 : just === "right" ? end - widths[j] : start);
            us.forEach((line, j) => {
                let ux = from(j);
                const uy = base + (j - k0) * exports.LINE * S, n = j === k0 ? 0 : j + 1;
                for (const u of line) {
                    run(u.text, ux, uy, 1, n, at.get(u));
                    if (u.count)
                        run(u.count, ux + Mx(u.text, at.get(u)).width, uy + DROP * S, SUB, n, at.get(u) + u.text.length);
                    ux += wide(u);
                }
            });
            charged(from(k0), from(k0) + widths[k0], base, just === "right");
            return shape;
        }
        if (a.text) {
            const us = (0, labels_ts_1.units)(a.text), at = new Map();
            us.reduce((n, u) => { at.set(u, n); return n + u.text.length + (u.count?.length ?? 0); }, 0);
            const W = (u) => Mx(u.text, at.get(u)).width, count = (u) => at.get(u) + u.text.length;
            const width = (u) => W(u) + (u.count ? Mx(u.count, count(u)).width * SUB : 0);
            const first = Mx(us[0].text[0], 0), base = y + first.ascent / 2, same = !us[0].count && [...us[0].text].length === 1;
            if (align === "above" || align === "below") {
                const pitch = 1.1 * M('H').ascent * (align === "above" ? -1 : 1);
                us.forEach((u, k) => {
                    const ux = k ? x - width(u) / 2 : x - first.width / 2, uy = base + k * pitch;
                    const r = run(u.text, ux, uy, 1, k, at.get(u));
                    if (!k && same)
                        meets[i] = r;
                    if (u.count)
                        run(u.count, ux + W(u), uy + DROP * S, SUB, k, count(u));
                });
                charged(x - first.width / 2, x - first.width / 2 + width(us[0]), base, false);
                return shape;
            }
            const order = rtl ? [...us].reverse() : us, total = us.reduce((w, u) => w + width(u), 0);
            let ux = 0, right = -Infinity;
            for (const u of order) {
                right = Math.max(right, ux + inkOf(u.text)[1], u.count ? ux + W(u) + inkOf(u.count)[1] * SUB : -Infinity);
                ux += width(u);
            }
            let cx = align === "centre" ? x - total / 2 : !rtl ? x - first.width / 2 : same ? x + first.width / 2 - total : x + near(us[0].text[0]) - right;
            const start = cx;
            for (const u of order) {
                const r = run(u.text, cx, base, 1, 0, at.get(u));
                if (u === us[0] && same)
                    meets[i] = r;
                if (u.count)
                    run(u.count, cx + W(u), base + DROP * S, SUB, 0, count(u));
                cx += width(u);
            }
            charged(start, cx, base, rtl);
            return shape;
        }
        const first = M(a.label[0]), charge = a.charge ?? 0, lw = M(a.label).width;
        const used = nbrs[i].reduce((n, j) => n + (0, exports.orderOf)(bondAt.get(key(i, j)).type), 0);
        const h = s.hideH ? 0 : a.implicitHCount ?? hydrogens(a.label, charge, used, a.radical === 3 ? 2 : a.radical);
        const count = h > 1 ? String(h) : '';
        const hW = M('H').width, cW = count ? M(count).width * SUB : 0;
        const iso = a.isotope ? String(a.isotope) : '', isoW = iso ? M(iso).width * SUB : 0;
        const back = rtl || (!align && !deg(i) && !!h && exports.H_FIRST.has(a.label)), same = [...a.label].length === 1;
        const ox = align === "centre" ? x - (lw + (h ? hW + cW : 0)) / 2 : back && !same ? x + near(a.label[0]) - inkOf(a.label)[1] : x - first.width / 2, base = y + first.ascent / 2;
        const el = run(a.label, ox, base);
        if (same)
            meets[i] = el;
        if (iso)
            run(iso, ox - isoW, base - RISE * S, SUB, -1);
        const hs = (hx, hy, line = 0) => { run('H', hx, hy, 1, line); if (count)
            run(count, hx + hW, hy + DROP * S, SUB, line); };
        let end = ox + lw;
        const pitch = 1.1 * M('H').ascent;
        if (h && align) {
            if (align === "right")
                hs(ox - isoW - hW - cW, base);
            else if (align === "above" || align === "below")
                hs(x - hW / 2, base + (align === "above" ? -pitch : pitch), 1);
            else {
                hs(end, base);
                end += hW + cW;
            }
        }
        else if (h) {
            if (back)
                hs(ox - isoW - hW - cW, base);
            else if (!steep || deg(i) < 2) {
                hs(end, base);
                end += hW + cW;
            }
            else
                hs(x - hW / 2, base + (v[1] > 0 ? -pitch : pitch), 1);
        }
        charged(ox - isoW - (h && (align ? align === "right" : back) ? hW + cW : 0), end, base, rtl);
        return shape;
    });
    const turned = mol.atoms.map((a, i) => {
        const runs = runsAt[i];
        if (!a.labelAngle || !runs.length)
            return false;
        const line = runs.filter((r) => r.line <= 0), x = pts[i][0], start = Math.min(...line.map((r) => r.p.x)), end = Math.max(...line.map((r) => r.p.x + r.width * r.p.f));
        const pivot = [a.align === "centre" ? x : x - start <= end - x ? start : end, runs.find((r) => r.line === 0 && r.p.f === 1)?.p.y ?? runs[0].p.y];
        for (const { p } of runs)
            Object.assign(p, { pts: p.pts.map(([px, py]) => turnPx([p.x + px * p.f, p.y + py * p.f], pivot, a.labelAngle)), x: 0, y: 0, f: 1 });
        for (const l of labels)
            if (labelAtom.get(l) === i)
                Object.assign(l, { angle: a.labelAngle, pivot });
        return true;
    });
    runsAt.forEach((runs, i) => {
        if (turned[i])
            return void clips[i].pieces.push(...runs.map((r) => r.p));
        const at = meets[i], lines = new Map();
        for (const r of runs) {
            if (at || r.p.f !== 1)
                clips[i].pieces.push(r.p);
            if (!at && r.line >= 0)
                lines.set(r.line, [...(lines.get(r.line) ?? []), r]);
        }
        if (at)
            clips[i].pieces.push({ ...at.p, pts: mirrored(at.p.pts, at.width) });
        for (const line of lines.values()) {
            const all = line.map((r) => pieceBox(r.p)), tall = line.filter((r) => r.p.f === 1).map((r) => pieceBox(r.p)), base = line.find((r) => r.p.f === 1)?.p.y ?? all[0][3];
            clips[i].boxes.push([Math.min(...all.map((b) => b[0])), Math.min(base - capAt[i], ...tall.map((b) => b[1])), Math.max(...all.map((b) => b[2])), Math.max(base, ...tall.map((b) => b[3]))]);
        }
    });
    const symbols = mol.atoms.map(() => []);
    const electrons = [], beads = [];
    const TAU = 2 * Math.PI, turn = (x) => ((x % TAU) + TAU) % TAU;
    const wound = (poly) => (poly.reduce((sum, q, j) => sum + cross(q, poly[(j + 1) % poly.length]), 0) > 0 ? poly.reverse() : poly);
    const disc = (c, r) => wound(Array.from({ length: 20 }, (_, j) => add(c, [r * Math.cos((TAU * j) / 20), r * Math.sin((TAU * j) / 20)])));
    mol.atoms.forEach((a, i) => {
        if (a.hidden)
            return;
        const kinds = [];
        if (a.circled && a.charge)
            kinds.push('charge');
        if (a.partial)
            kinds.push('partial');
        const indicator = (0, query_ts_1.atomIndicator)(a.query);
        if (indicator)
            kinds.push('query');
        for (let r = 0; r < Math.min(2, a.radical === 3 ? 0 : a.radical ?? 0); r++)
            kinds.push('radical');
        if (a.radical === 3)
            kinds.push('pair');
        for (let r = 0; r < Math.min(4, a.pairs ?? 0); r++)
            kinds.push('pair');
        if (!kinds.length)
            return;
        const X = pts[i], z = s.size * ratio[i], hw = atomZ[i].hw, shape = placedPoints(shapes[i]);
        const taken = nbrs[i].map((j) => { const d = dir(i, j); return Math.atan2(d[1], d[0]); });
        for (const q of [...shape, ...marks[i]])
            if (len(sub(q, X)) > 0.62 * z)
                taken.push(Math.atan2(q[1] - X[1], q[0] - X[0]));
        const clearOf = (t, need) => taken.every((b) => Math.abs(Math.atan2(Math.sin(t - b), Math.cos(t - b))) >= need);
        const at = new Map();
        const keys = kinds.map((kind, k) => (kind === 'charge' || kind === 'partial' ? kind : `${kind}${kinds.slice(0, k).filter((x) => x === kind).length}`));
        keys.forEach((key, k) => { const deg = a.angles?.[key]; if (deg !== undefined) {
            at.set(k, (-deg * Math.PI) / 180);
            taken.push((-deg * Math.PI) / 180);
        } });
        const UP_RIGHT = -Math.PI / 4;
        if (!at.has(0) && (kinds[0] === 'charge' || kinds[0] === 'partial' || kinds[0] === 'query') && clearOf(UP_RIGHT, Math.PI / 5)) {
            at.set(0, UP_RIGHT);
            taken.push(UP_RIGHT);
        }
        const rest = kinds.map((_, k) => k).filter((k) => !at.has(k));
        const sorted = taken.map(turn).sort((x, y) => x - y);
        const gaps = sorted.length
            ? sorted.map((t, j) => ({ start: t, size: j + 1 < sorted.length ? sorted[j + 1] - t : sorted[0] + TAU - t, n: 0 }))
            : [{ start: -Math.PI / 2 - Math.PI / Math.max(1, rest.length), size: TAU, n: 0 }];
        for (const _ of rest)
            gaps.reduce((best, g) => (g.size / (g.n + 1) > best.size / (best.n + 1) + 1e-6 ? g : best)).n++;
        let next = 0;
        for (const g of gaps.sort((x, y) => x.start - y.start))
            for (let j = 0; j < g.n; j++)
                at.set(rest[next++], g.start + (g.size * (j + 1)) / (g.n + 1));
        kinds.forEach((kind, k) => {
            const t = at.get(k), d = [Math.cos(t), Math.sin(t)], n = perp(d);
            const R = kind === 'charge' ? 0.34 * z : kind === 'radical' ? 0.1 * z : kind === 'pair' ? 0.09 * z : 0;
            const text = kind === 'partial' ? (a.partial === '+' ? 'δ+' : 'δ–') : kind === 'query' ? indicator : '', ink = text ? grown(measure(text), ratio[i]) : undefined;
            const parts = kind === 'pair' ? [[0.19 * z, R], [-0.19 * z, R]] : ink ? [[0, (Math.max(ink.width, ink.ascent) * SUB) / 2]] : [[0, R]];
            const gap = 0.14 * z;
            const fits = (r) => parts.every(([o, pr]) => { const c = add(add(X, mul(d, r)), mul(n, o)); return shape.every((q) => len(sub(q, c)) >= pr + gap); });
            const corridor = Math.max(...parts.map(([o, pr]) => Math.abs(o) + pr)) + gap;
            let lo = shape.length ? Math.max(0, ...shape.filter((q) => Math.abs(cross(sub(q, X), d)) < corridor).map((q) => dot(sub(q, X), d))) : 0.3 * z + Math.max(...parts.map((x) => x[1]));
            let hi = lo + 3 * z;
            if (!fits(lo)) {
                for (let j = 0; j < 24; j++) {
                    const mid = (lo + hi) / 2;
                    if (fits(mid))
                        hi = mid;
                    else
                        lo = mid;
                }
                lo = hi;
            }
            const c = add(X, mul(d, lo));
            if (kind === 'pair' && a.bars) {
                const e = 0.19 * z + R;
                symbols[i].push(wound([add(add(c, mul(n, -e)), mul(d, -hw)), add(add(c, mul(n, e)), mul(d, -hw)), add(add(c, mul(n, e)), mul(d, hw)), add(add(c, mul(n, -e)), mul(d, hw))]));
                electrons.push({ atom: i, at: c, key: keys[k] });
            }
            else if (kind === 'radical' || kind === 'pair') {
                for (const [o, pr] of parts)
                    symbols[i].push(disc(add(c, mul(n, o)), pr));
                electrons.push({ atom: i, at: c, key: keys[k] });
            }
            else
                electrons.push({ atom: i, at: c, key: keys[k] });
            if (kind === 'charge') {
                for (let j = 0; j < 40; j++) {
                    const a0 = (TAU * j) / 40, a1 = (TAU * (j + 1)) / 40, ro = R + hw, ri = R - hw;
                    symbols[i].push(wound([add(c, [ri * Math.cos(a0), ri * Math.sin(a0)]), add(c, [ro * Math.cos(a0), ro * Math.sin(a0)]), add(c, [ro * Math.cos(a1), ro * Math.sin(a1)]), add(c, [ri * Math.cos(a1), ri * Math.sin(a1)])]));
                }
                const q = Math.abs(a.charge ?? 0);
                if (q > 1) {
                    const sign = `${q}${a.charge > 0 ? '+' : '−'}`, m = grown(measure(sign), ratio[i]), size = Math.min(SUB, (1.35 * R) / m.width, (1.1 * R) / m.ascent);
                    const x = c[0] - (m.width * size) / 2, y = c[1] + (m.ascent * size) / 2;
                    labels.push({ text: sign, x, y, size: z * size, colour: a.colour });
                    labelAtom.set(labels[labels.length - 1], i);
                }
                else {
                    const arm = 0.58 * R, bar = (u) => symbols[i].push(wound([add(c, add(mul(u, -arm), mul(perp(u), -hw))), add(c, add(mul(u, -arm), mul(perp(u), hw))), add(c, add(mul(u, arm), mul(perp(u), hw))), add(c, add(mul(u, arm), mul(perp(u), -hw)))]));
                    bar([1, 0]);
                    if ((a.charge ?? 0) > 0)
                        bar([0, 1]);
                }
            }
            if (ink) {
                const x = c[0] - (ink.width * SUB) / 2, y = c[1] + (ink.ascent * SUB) / 2;
                labels.push({ text, x, y, size: z * SUB, colour: a.colour });
                labelAtom.set(labels[labels.length - 1], i);
                for (const [px, py] of ink.outline)
                    marks[i].push([x + px * SUB, y + py * SUB]);
            }
        });
    });
    mol.atoms.forEach((a, i) => {
        if (!a.hmark && !a.attach && !a.bead)
            return;
        const X = pts[i], dirs = nbrs[i].map((j) => dir(i, j)), { L, hw } = atomZ[i];
        if (a.hmark === 'dot')
            symbols[i].push(disc(X, 0.09 * L));
        if (a.hmark === 'dash') {
            const angles = dirs.map((d) => Math.atan2(d[1], d[0])).sort((x, y) => x - y);
            let best = -Math.PI / 2;
            if (angles.length) {
                const gaps = angles.map((t, j) => ({ t, size: (j + 1 < angles.length ? angles[j + 1] : angles[0] + 2 * Math.PI) - t }));
                const g = gaps.reduce((p, q) => (q.size > p.size ? q : p));
                best = g.t + g.size / 2;
            }
            const u = [Math.cos(best), Math.sin(best)], n = perp(u);
            for (let k = 1; k <= 3; k++) {
                const c = add(X, mul(u, 0.1 * L * k)), half = 0.04 * L + 0.025 * L * k;
                symbols[i].push(wound([add(add(c, mul(n, -half)), mul(u, -hw)), add(add(c, mul(n, half)), mul(u, -hw)), add(add(c, mul(n, half)), mul(u, hw)), add(add(c, mul(n, -half)), mul(u, hw))]));
            }
        }
        if (a.attach === "diamond" || a.attach === "star") {
            const edge = pointOutline(a.attach).map((q) => add(X, mul(q, (0, exports.scaleOf)(a)))), w = 0.375 * s.line * (0, exports.scaleOf)(a);
            edge.forEach((q, k) => { const r = edge[(k + 1) % edge.length], u = unit(sub(r, q)), n = perp(u); symbols[i].push(wound([add(add(q, mul(n, -w)), mul(u, -w)), add(add(q, mul(n, w)), mul(u, -w)), add(add(r, mul(n, w)), mul(u, w)), add(add(r, mul(n, -w)), mul(u, w))])); });
        }
        else if (a.attach) {
            const u = dirs[0] ?? [1, 0], n = perp(u), wave = waveAlong([add(X, mul(n, -0.3 * L)), add(X, mul(n, 0.3 * L))], 0.05 * L, 0.15 * L);
            for (let k = 0; k + 1 < wave.length; k++) {
                const p = wave[k], q = wave[k + 1], v = unit(sub(q, p)), m = perp(v);
                symbols[i].push(wound([add(p, mul(m, -hw)), add(p, mul(m, hw)), add(q, mul(m, hw)), add(q, mul(m, -hw))]));
            }
        }
        if (a.bead) {
            beads.push({ at: X, r: 0.3 * L });
            for (const q of [add(X, [-0.3 * L, -0.3 * L]), add(X, [0.3 * L, 0.3 * L])])
                marks[i].push(q);
        }
    });
    for (const [i, R] of newman) {
        const X = pts[i], hw = atomZ[i].hw, at = (r, j) => add(X, [r * Math.cos((2 * Math.PI * j) / 48), r * Math.sin((2 * Math.PI * j) / 48)]);
        for (let j = 0; j < 48; j++)
            symbols[i].push(wound([at(R - hw, j), at(R + hw, j), at(R + hw, j + 1.02), at(R - hw, j + 1.02)]));
    }
    const plans = mol.bonds.map((bond) => {
        const [a, b] = bond.atoms, p = pts[a], q = pts[b];
        const length = len(sub(q, p)), u = unit(sub(q, p)), n = perp(u);
        const z0 = zOf(((0, exports.scaleOf)(mol.atoms[a]) + (0, exports.scaleOf)(mol.atoms[b])) / 2), z = bond.spacing === undefined ? z0 : { ...z0, spacing: (bond.spacing / 100) * z0.L }, { L, hw } = z;
        const plan = { a, b, u, n, length, kind: 'line', lines: [], cut: [0, 0], z, ...(mol.atoms[a].hidden || mol.atoms[b].hidden ? { hidden: true } : {}) };
        if (endOn.has(bond))
            return { ...plan, u: [1, 0], n: [0, 1], hidden: true };
        const side = (j) => Math.sign(dot(sub(pts[j], p), n));
        const near = (x, y, sd) => nbrs[x].filter((j) => j !== y && side(j) === sd).map((j) => angle(sub(pts[y], pts[x]), sub(pts[j], pts[x]))).sort((m, l) => m - l);
        const single = bond.type === 1 || bond.type === 4;
        if (single && (bond.stereo === 1 || bond.stereo === 6)) {
            plan.kind = bond.stereo === 1 ? 'wedge' : 'hash';
            return plan;
        }
        if (single && bond.display) {
            if (bond.display === 'bold')
                plan.half = z.bold / 2;
            else if (bond.display === 'dative')
                plan.head = true;
            else
                plan.kind = bond.display === 'dashed' ? 'dash' : bond.display === 'hashed' ? 'hashbar' : bond.display === 'hollow' ? 'hollow' : 'wavy';
            return plan;
        }
        if (bond.type === exports.HBOND) {
            plan.kind = 'dot';
            return plan;
        }
        if (bond.type === 3) {
            plan.lines = [z.spacing, -z.spacing].map((o) => ({ o, t0: 0, t1: 0 }));
            return plan;
        }
        if (bond.type === exports.QUADRUPLE) {
            plan.kind = 'none';
            plan.lines = [1.5, 0.5, -0.5, -1.5].map((k) => ({ o: k * z.spacing, t0: 0, t1: 0 }));
            return plan;
        }
        if (bond.type !== 2)
            return plan;
        const bold = bond.display === "bold", extra = bold ? z.bold / 2 - hw : 0, spacing = z.spacing + extra;
        if (bond.display === "either") {
            plan.kind = 'none';
            plan.cross = true;
            return plan;
        }
        let sd = 0, ring;
        const rings = ringsThrough(a, b, covalent);
        if (bond.position)
            sd = bond.position === "centre" ? 0 : bond.position === "left" ? -1 : 1;
        else if (rings.length) {
            const doubles = (r) => r.reduce((c, at, i) => c + (i && bondAt.get(key(r[i - 1], at))?.type === 2 ? 1 : 0), 0);
            ring = rings.sort((x, y) => doubles(y) - doubles(x) || Number(y.length === 6) - Number(x.length === 6) || x.length - y.length)[0];
            const centre = mul(ring.reduce((c, i) => add(c, pts[i]), [0, 0]), 1 / ring.length);
            sd = Math.sign(dot(sub(centre, p), n));
        }
        else if (deg(a) === 1 || deg(b) === 1) {
            const inner = deg(a) === 1 ? b : a, outer = inner === a ? b : a;
            if (deg(inner) === 2 && !labelled[inner])
                sd = side(nbrs[inner].find((j) => j !== outer));
        }
        else {
            const linear = (x, y) => deg(x) === 2 && nbrs[x].every((j) => bondAt.get(key(x, j)).type === 2) &&
                angle(sub(pts[y], pts[x]), sub(pts[nbrs[x].find((j) => j !== y)], pts[x])) > (161.8 * Math.PI) / 180;
            if (!(labelled[a] && labelled[b]) && !linear(a, b) && !linear(b, a)) {
                const others = [...nbrs[a].filter((j) => j !== b), ...nbrs[b].filter((j) => j !== a)];
                sd = Math.sign(others.reduce((c, j) => c + side(j), 0)) || side(nbrs[a].find((j) => j !== b));
            }
        }
        plan.side = sd;
        if (!sd) {
            plan.kind = 'none';
            const h = spacing / 2;
            const reach = (x, y, o) => {
                const phi = labelled[x] ? undefined : near(x, y, Math.sign(o))[0];
                return phi === undefined || Math.sin(phi) < 0.05 ? 0 : h / Math.tan(phi);
            };
            plan.lines = [h, -h].map((o, k) => ({ o, t0: reach(a, b, o), t1: reach(b, a, o), ...(bold && !k ? { half: z.bold / 2 } : {}), ...((bond.display === "dashed" && k) || bond.display === "aromatic" ? { dashed: true } : {}) }));
            return plan;
        }
        const trim = (x, y, ringNbr) => {
            if (labelled[x])
                return 0;
            const theta = ringNbr !== undefined ? angle(sub(pts[y], pts[x]), sub(pts[ringNbr], pts[x])) : near(x, y, sd)[0];
            if (theta === undefined)
                return 0;
            const t = spacing / Math.tan(theta / 2);
            return t > MAX_TRIM * L ? 0 : t;
        };
        if (bold)
            plan.half = z.bold / 2;
        if (bond.display === "aromatic")
            plan.kind = 'dash';
        plan.lines = [{ o: sd * spacing, t0: trim(a, b, ring?.[1]), t1: trim(b, a, ring?.[ring.length - 2]), ...(bond.display === "dashed" || bond.display === "aromatic" ? { dashed: true } : {}) }];
        return plan;
    });
    const circled = circledRings(mol);
    for (const r of circled)
        r.forEach((x, k) => {
            const y = r[(k + 1) % r.length], pl = plans[mol.bonds.findIndex((b) => (b.atoms[0] === x && b.atoms[1] === y) || (b.atoms[0] === y && b.atoms[1] === x))];
            if (pl && mol.bonds[mol.bonds.indexOf(mol.bonds.find((b) => (b.atoms[0] === x && b.atoms[1] === y) || (b.atoms[0] === y && b.atoms[1] === x)))].type === 2) {
                pl.lines = [];
                pl.kind = 'line';
                delete pl.half;
            }
        });
    const WAVE = 0.08;
    const half = (pl) => pl.half ?? (pl.kind === 'hashbar' ? pl.z.bold / 2 : pl.kind === 'wavy' ? WAVE * pl.z.L + pl.z.hw : pl.z.hw);
    const widths = (pl, x) => pl.kind === 'wedge' || pl.kind === 'hash' || pl.kind === 'hollow' ? (x === pl.a ? [pl.z.tip, pl.z.wide] : [pl.z.wide, pl.z.tip]) : [half(pl), half(pl)];
    const cutAt = (pl, end, margin) => {
        const x = end ? pl.b : pl.a, { boxes, pieces } = clips[x];
        if (!boxes.length && !pieces.length)
            return 0;
        const u = end ? mul(pl.u, -1) : pl.u, w = widths(pl, x)[0], m = margin + w;
        const offsets = [...(pl.kind === 'none' ? [] : [0]), ...pl.lines.map((l) => l.o)];
        let cut = 0;
        for (const b of boxes)
            for (const o of offsets) {
                const span = boxSpan(add(pts[x], mul(pl.n, o)), u, b, m);
                if (span && span[0] < pl.length)
                    cut = Math.max(cut, span[1]);
            }
        const [X0, X1] = pts[x], [u0, u1] = u, [n0, n1] = pl.n;
        for (const { pts: outline, x: px0, y: py0, f } of pieces) {
            for (const cell of cellsOf(outline)) {
                const c0 = px0 + cell.c[0] * f - X0, c1 = py0 + cell.c[1] * f - X1, r = cell.r * f + 1e-9;
                const ca = c0 * u0 + c1 * u1, cc = c0 * n0 + c1 * n1;
                if (ca + r + m <= cut || offsets.every((o) => Math.abs(cc - o) >= m + r))
                    continue;
                for (const [px, py] of cell.pts) {
                    const r0 = px0 + px * f - X0, r1 = py0 + py * f - X1, a = r0 * u0 + r1 * u1, c = r0 * n0 + r1 * n1;
                    for (const o of offsets) {
                        const d = c - o;
                        if (Math.abs(d) >= m)
                            continue;
                        const reach = Math.sqrt(m * m - d * d);
                        if (a - reach < pl.length)
                            cut = Math.max(cut, a + reach);
                    }
                }
            }
        }
        return cut;
    };
    const inkPoints = (x) => [...placedPoints(clips[x].pieces), ...clips[x].boxes.flatMap((b) => {
            const n = Math.max(2, Math.ceil(Math.max(b[2] - b[0], b[3] - b[1]))), out = [];
            for (let k = 0; k <= n; k++) {
                const f = k / n, x0 = b[0] + (b[2] - b[0]) * f, y0 = b[1] + (b[3] - b[1]) * f;
                out.push([x0, b[1]], [x0, b[3]], [b[0], y0], [b[2], y0]);
            }
            return out;
        })];
    const flare = (pl, end, cut, margin, w0, k, T) => {
        const x = end ? pl.b : pl.a, X = pts[x], u = end ? mul(pl.u, -1) : pl.u, ink = inkPoints(x), s = margin * Math.sqrt(1 + k * k);
        for (let pass = 0, moved = true; moved && pass < 8; pass++) {
            moved = false;
            for (const q of ink) {
                const r = sub(q, X), t = dot(r, u) - cut, g = (Math.abs(cross(u, r)) - w0 - s) / k;
                if (t > 0 && t <= T && t > g) {
                    cut += t - Math.max(g, 0);
                    moved = true;
                }
            }
        }
        return cut;
    };
    const cutsOf = (pl, margin) => {
        const { L, tip, wide, hw, margin: full } = pl.z, cut = [cutAt(pl, 0, margin), cutAt(pl, 1, pl.head ? full : margin)];
        if (!labelled[pl.a] || !labelled[pl.b])
            return cut;
        for (let k = 0; k < 3 && (pl.kind === 'wedge' || pl.kind === 'hash' || pl.kind === 'hollow'); k++) {
            const D = pl.length - cut[0] - cut[1];
            if (D <= 0)
                break;
            const w0 = pl.kind === 'hollow' ? hw : tip, slope = (wide - w0) / D;
            cut[0] = flare(pl, 0, cut[0], margin, pl.kind === 'hash' ? w0 + slope * hw : w0, slope, D);
        }
        if (pl.head)
            cut[1] = flare(pl, 1, cut[1], full, hw, 0.4, Math.min(0.3 * L, (pl.length - cut[0] - cut[1]) / 2));
        return cut;
    };
    for (const pl of plans) {
        let cut = cutsOf(pl, pl.z.margin);
        const shows = (c) => pl.length - c[0] - c[1] >= pl.length / 3;
        if (labelled[pl.a] && labelled[pl.b] && !shows(cut)) {
            let lo = 0.3 * pl.z.margin, hi = pl.z.margin;
            if (shows(cutsOf(pl, lo)))
                for (let k = 0; k < 20; k++) {
                    const mid = (lo + hi) / 2;
                    if (shows(cutsOf(pl, mid)))
                        lo = mid;
                    else
                        hi = mid;
                }
            cut = cutsOf(pl, lo);
        }
        pl.cut = cut;
        if (cut[0] + cut[1] >= pl.length)
            pl.hidden = true;
    }
    const drawnEnd = (pl, x) => (x === pl.a ? add(pts[pl.a], mul(pl.u, pl.cut[0])) : add(pts[pl.b], mul(pl.u, -pl.cut[1])));
    const ends = new Map();
    const atAtom = mol.atoms.map(() => []);
    plans.forEach((pl, i) => { atAtom[pl.a].push({ pl, i }); if (pl.b !== pl.a)
        atAtom[pl.b].push({ pl, i }); });
    mol.atoms.forEach((_, x) => {
        if (labelled[x] || shapes[x].length)
            return;
        const X = pts[x];
        const members = atAtom[x]
            .filter(({ pl }) => !pl.hidden && (pl.kind === 'line' || pl.kind === 'wedge'))
            .map(({ pl, i }) => {
            const f = drawnEnd(pl, x === pl.a ? pl.b : pl.a), u = unit(sub(f, X)), [w0, w1] = widths(pl, x);
            return { i, u, n: perp(u), w0, w1, f, ang: Math.atan2(u[1], u[0]) };
        })
            .sort((m, l) => m.ang - l.ang);
        const miter = (m, l) => {
            const pm = add(X, mul(m.n, m.w0)), pl = add(X, mul(l.n, -l.w0));
            const c = meet(pm, sub(add(m.f, mul(m.n, m.w1)), pm), pl, sub(add(l.f, mul(l.n, -l.w1)), pl));
            return c && len(sub(c, X)) < 6 * Math.max(m.w0, l.w0, atomZ[x].hw) ? [c, c] : [pm, pl];
        };
        members.forEach((m, j) => {
            if (members.length === 1) {
                ends.set(`${m.i} ${x}`, [add(X, mul(m.n, -m.w0)), add(X, mul(m.n, m.w0))]);
                return;
            }
            const prev = members[(j + members.length - 1) % members.length], next = members[(j + 1) % members.length];
            ends.set(`${m.i} ${x}`, [miter(prev, m)[1], X, miter(m, next)[0]]);
        });
    });
    const endOf = (pl, i, x) => {
        const fan = ends.get(`${i} ${x}`);
        if (fan)
            return fan;
        const n = x === pl.a ? pl.n : mul(pl.n, -1), c = drawnEnd(pl, x), w = widths(pl, x)[0];
        return [add(c, mul(n, -w)), add(c, mul(n, w))];
    };
    const polygons = [];
    const bar = (S, E, n, w) => polygons.push([add(S, mul(n, -w)), add(S, mul(n, w)), add(E, mul(n, w)), add(E, mul(n, -w))]);
    const drawPlan = (pl, i) => {
        if (pl.hidden)
            return;
        const { L, hw, wide, tip } = pl.z, hash = pl.z.hash;
        if (pl.kind === 'line' || pl.kind === 'wedge')
            polygons.push([...endOf(pl, i, pl.a), ...endOf(pl, i, pl.b)]);
        const S = drawnEnd(pl, pl.a), D = pl.length - pl.cut[0] - pl.cut[1];
        if (pl.kind === 'dash') {
            const count = Math.max(1, Math.round(D / hash)), dash = Math.min(D, hash * 0.55), step = count > 1 ? (D - dash) / (count - 1) : 0;
            for (let k = 0; k < count; k++)
                bar(add(S, mul(pl.u, k * step)), add(S, mul(pl.u, k * step + dash)), pl.n, hw);
        }
        if (pl.kind === 'dot') {
            const count = Math.max(1, Math.round(D / (hash / 2)));
            for (let k = 0; k <= count; k++)
                polygons.push(disc(add(S, mul(pl.u, (D * k) / count)), hw));
        }
        if (pl.kind === 'hashbar') {
            const marks = Math.max(1, Math.round(D / hash));
            for (let j = 0; j <= marks; j++) {
                const c = add(S, mul(pl.u, hw + ((D - 2 * hw) * j) / marks));
                bar(add(c, mul(pl.u, -hw)), add(c, mul(pl.u, hw)), pl.n, pl.z.bold / 2);
            }
        }
        if (pl.kind === 'wavy') {
            const waves = Math.max(1, Math.round(D / (0.25 * L))), k = (2 * Math.PI * waves) / D, steps = waves * 16;
            const left = [], right = [];
            for (let j = 0; j <= steps; j++) {
                const t = (D * j) / steps, c = add(add(S, mul(pl.u, t)), mul(pl.n, WAVE * L * Math.sin(k * t)));
                const normal = perp(unit(add(pl.u, mul(pl.n, WAVE * L * k * Math.cos(k * t)))));
                left.push(add(c, mul(normal, hw)));
                right.push(add(c, mul(normal, -hw)));
            }
            polygons.push([right[0], ...left, ...right.slice(1).reverse()]);
        }
        if (pl.kind === 'hollow') {
            const E = drawnEnd(pl, pl.b), left = add(E, mul(pl.n, wide - hw)), right = add(E, mul(pl.n, -(wide - hw)));
            for (const corner of [left, right]) {
                const u = unit(sub(corner, S));
                bar(S, corner, perp(u), hw);
            }
            bar(add(right, mul(pl.n, -hw)), add(left, mul(pl.n, hw)), mul(pl.u, -1), hw);
        }
        if (pl.head) {
            const E = drawnEnd(pl, pl.b), h = Math.min(0.3 * L, D / 2), base = add(E, mul(pl.u, -h)), w = 0.4 * h;
            polygons.push([add(base, mul(pl.n, -w)), add(base, mul(pl.n, w)), E]);
        }
        if (pl.kind === 'hash') {
            const start = drawnEnd(pl, pl.a), D = pl.length - pl.cut[0] - pl.cut[1], marks = Math.max(1, Math.round(D / hash)), pitch = D / marks;
            for (let j = 1; j <= marks; j++) {
                const t = j * pitch - hw, c = add(start, mul(pl.u, t));
                bar(add(c, mul(pl.u, -hw)), add(c, mul(pl.u, hw)), pl.n, tip + ((wide - tip) * t) / D);
            }
        }
        if (pl.cross) {
            const h = pl.z.spacing / 2, A = drawnEnd(pl, pl.a), B = drawnEnd(pl, pl.b);
            for (const sgn of [1, -1]) {
                const p0 = add(A, mul(pl.n, sgn * h)), p1 = add(B, mul(pl.n, -sgn * h));
                bar(p0, p1, perp(unit(sub(p1, p0))), hw);
            }
        }
        for (const { o, t0, t1, half: w, dashed } of pl.lines) {
            const from = labelled[pl.a] ? pl.cut[0] : t0, to = pl.length - (labelled[pl.b] ? pl.cut[1] : t1);
            if (to - from < 0.1)
                continue;
            if (dashed) {
                const D = to - from, count = Math.max(1, Math.round(D / hash)), dash = Math.min(D, hash * 0.55), step = count > 1 ? (D - dash) / (count - 1) : 0;
                for (let k = 0; k < count; k++)
                    bar(add(add(pts[pl.a], mul(pl.u, from + k * step)), mul(pl.n, o)), add(add(pts[pl.a], mul(pl.u, from + k * step + dash)), mul(pl.n, o)), pl.n, w ?? hw);
                continue;
            }
            bar(add(add(pts[pl.a], mul(pl.u, from)), mul(pl.n, o)), add(add(pts[pl.a], mul(pl.u, to)), mul(pl.n, o)), pl.n, w ?? hw);
        }
    };
    const ink = pts.map(([x, y]) => [x, y, x, y]);
    const grow = (i, [x, y]) => { const b = ink[i]; b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); };
    const range = zRange === undefined ? depthRange(mol) : zRange;
    const fade = (...atoms) => (range && atoms.some((x) => mol.atoms[x].shade) ? (0, exports.shadeAt)(atoms.reduce((t, x) => t + (mol.atoms[x].location[2] ?? 0), 0) / atoms.length, range) : 1);
    const margin = (pl) => (pl.z.margin * 1.6) / 1.69;
    const across = (pl) => {
        const offs = [...(pl.kind === 'none' ? [] : [0]), ...pl.lines.map((l) => l.o)], lo = Math.min(...offs), hi = Math.max(...offs);
        const bold = Math.max(pl.kind === 'line' ? pl.half ?? 0 : 0, ...pl.lines.map((l) => l.half ?? 0));
        if (offs.length > 1) {
            const h = (hi - lo) / 2 + (bold > pl.z.hw ? bold : 0);
            return { o: (lo + hi) / 2, ha: h, hb: h };
        }
        if (pl.kind === 'wedge' || pl.kind === 'hash' || pl.kind === 'hollow')
            return { o: 0, ha: pl.z.hw, hb: pl.z.wide };
        const h = pl.kind === 'line' && pl.half ? pl.half : pl.z.hw;
        return { o: 0, ha: h, hb: h };
    };
    const cutter = (pl, m) => {
        const { o, ha, hb } = across(pl), A = add(add(pts[pl.a], mul(pl.n, o)), mul(pl.u, -m)), B = add(add(pts[pl.b], mul(pl.n, o)), mul(pl.u, m));
        return [add(A, mul(pl.n, -ha - m)), add(B, mul(pl.n, -hb - m)), add(B, mul(pl.n, hb + m)), add(A, mul(pl.n, ha + m))];
    };
    const fronts = plans.map(() => []), mid = (k) => mol.bonds[k].atoms.reduce((t, x) => t + (mol.atoms[x].location[2] ?? 0), 0) / 2;
    const axis = new Set([...endOn.keys()].map((b) => key(b.atoms[0], b.atoms[1])));
    for (const [r, f] of crossingBonds(mol.bonds, (i) => pts[i], s.bond, s)) {
        const R = plans[r], F = plans[f];
        if (R.hidden || F.hidden || (axis.size && mol.bonds[r].atoms.some((x) => mol.bonds[f].atoms.some((y) => axis.has(key(x, y))))))
            continue;
        if (mid(r) - mid(f) > 1e-6)
            fronts[f].push(r);
        else
            fronts[r].push(f);
    }
    const cutFronts = (i, from) => {
        for (const f of fronts[i])
            polygons.push(...polygons.splice(from).flatMap((poly) => without(poly, cutter(plans[f], margin(plans[i])))));
    };
    const colours = [], alphas = [];
    plans.forEach((pl, i) => {
        const before = polygons.length, alpha = fade(pl.a, pl.b);
        drawPlan(pl, i);
        cutFronts(i, before);
        for (const poly of polygons.slice(before)) {
            colours.push(mol.bonds[i].colour);
            alphas.push(alpha);
            for (const q of poly) {
                grow(pl.a, q);
                grow(pl.b, q);
            }
        }
    });
    for (const r of circled) {
        const c = mul(r.reduce((m, i) => add(m, pts[i]), [0, 0]), 1 / r.length);
        const edge = Math.min(...r.map((x, k) => len(sub(pts[r[(k + 1) % r.length]], pts[x]))));
        const radius = ringCircleRadius(r.length, edge, s.spacing / s.bond), steps = 72, before = polygons.length;
        for (let k = 0; k < steps; k++) {
            const a0 = (2 * Math.PI * k) / steps, a1 = (2 * Math.PI * (k + 1.05)) / steps, S = add(c, [Math.cos(a0) * radius, Math.sin(a0) * radius]), E = add(c, [Math.cos(a1) * radius, Math.sin(a1) * radius]);
            bar(S, E, perp(unit(sub(E, S))), atomZ[r[0]].hw);
        }
        for (const poly of polygons.slice(before)) {
            colours.push(mol.atoms[r[0]].colour);
            alphas.push(fade(...r));
            for (const q of poly)
                grow(r[0], q);
        }
    }
    mol.atoms.forEach((a, i) => {
        const r = a.centre && !a.centre.variable ? a.centre.atoms : [];
        if (r.length < 3 || !r.every((x) => r.filter((y) => bondAt.get(key(x, y))?.type === 4).length === 2))
            return;
        const c = pts[i], { across, along, ra, rb } = ligandEllipse(r.map((x) => pts[x]), c, nbrs[i].length ? pts[nbrs[i][0]] : undefined, s.spacing / s.bond);
        const at = (t) => add(c, add(mul(across, Math.cos(t) * ra), mul(along, Math.sin(t) * rb))), steps = 72, before = polygons.length;
        for (let k = 0; k < steps; k++) {
            const S = at((2 * Math.PI * k) / steps), E = at((2 * Math.PI * (k + 1.05)) / steps);
            bar(S, E, perp(unit(sub(E, S))), atomZ[r[0]].hw);
        }
        for (const poly of polygons.slice(before)) {
            colours.push(mol.atoms[r[0]].colour);
            alphas.push(fade(...r));
            for (const q of poly)
                grow(r[0], q);
        }
    });
    const outlines = [], told = [];
    mol.bonds.forEach((bond, k) => {
        const text = (0, query_ts_1.bondIndicator)(bond);
        if (!text)
            return;
        if (!outlines.length)
            outlines.push(...shapes.map(placedPoints));
        const pl = plans[k], z = pl.z, m = grown(measure(text), z.size / s.size), mid = mul(add(pts[pl.a], pts[pl.b]), 0.5), w = m.width * SUB, h = m.ascent * SUB;
        const at = (sd, more, along = 0) => { const d = mul(pl.n, sd); return add(add(mid, mul(pl.u, along * z.L)), mul(d, z.spacing + 0.5 * (Math.abs(d[0]) * w + Math.abs(d[1]) * h) + (0.1 + more) * z.L)); };
        const room = (c) => Math.min(Infinity, ...pts.filter((_, j) => j !== pl.a && j !== pl.b).map((q) => len(sub(q, c))));
        const ring = ringsThrough(pl.a, pl.b, nbrs).sort((p, q) => p.length - q.length)[0];
        const inward = ring && Math.sign(dot(sub(mul(ring.reduce((t, j) => add(t, pts[j]), [0, 0]), 1 / ring.length), pts[pl.a]), pl.n));
        const first = inward || (room(at(1, 0)) >= room(at(-1, 0)) ? 1 : -1);
        const covers = (c) => {
            const gx = w / 2 + 0.08 * z.L, gy = h / 2 + 0.08 * z.L, inside = (q) => Math.abs(q[0] - c[0]) < gx && Math.abs(q[1] - c[1]) < gy;
            let n = told.filter((b) => b[0] < c[0] + gx && b[2] > c[0] - gx && b[1] < c[1] + gy && b[3] > c[1] - gy).length;
            for (const list of [...outlines, ...marks])
                for (const q of list)
                    if (inside(q))
                        n++;
            pts.forEach((q, j) => { if (j !== pl.a && j !== pl.b && !labelled[j] && inside(q))
                n++; });
            plans.forEach((o) => { if (o !== pl)
                for (const t of [0.25, 0.5, 0.75])
                    if (inside(add(pts[o.a], mul(sub(pts[o.b], pts[o.a]), t))))
                        n++; });
            return n;
        };
        let c = at(first, 0), least = covers(c);
        for (const more of [0, 0.4, 0.8])
            for (const sd of [first, -first])
                for (const along of [0, -0.3, 0.3]) {
                    if (!least)
                        break;
                    const q = at(sd, more, along), n = covers(q);
                    if (n < least) {
                        c = q;
                        least = n;
                    }
                }
        const x = c[0] - w / 2, y = c[1] + h / 2;
        labels.push({ text, x, y, size: z.size * SUB, colour: bond.colour });
        told.push([x, y - h, x + w, y]);
        marks[pl.a].push([x, y - h], [x + w, y]);
    });
    const labelBoxes = shapes.map((shape) => shape.map(pieceBox));
    labelBoxes.forEach((bs, i) => bs.forEach(([a, b, c, d]) => { grow(i, [a, b]); grow(i, [c, d]); }));
    marks.forEach((mark, i) => mark.forEach((q) => grow(i, q)));
    symbols.forEach((polys, i) => polys.forEach((poly) => { polygons.push(poly); colours.push(mol.atoms[i].colour); alphas.push(fade(i)); poly.forEach((q) => grow(i, q)); }));
    for (const l of labels) {
        const i = labelAtom.get(l);
        const alpha = i === undefined ? 1 : fade(i);
        if (alpha < 1)
            l.alpha = alpha;
    }
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    const take = (x, y) => { if (x < x0)
        x0 = x; if (y < y0)
        y0 = y; if (x > x1)
        x1 = x; if (y > y1)
        y1 = y; };
    pts.forEach(([x, y], i) => { if (!mol.atoms[i].hidden)
        take(x, y); });
    for (const poly of polygons)
        for (const [x, y] of poly)
            take(x, y);
    const pad = s.bond / 2;
    const label = labelBoxes.map((bs) => {
        if (!bs.length)
            return undefined;
        const b = [Infinity, Infinity, -Infinity, -Infinity];
        for (const [a, c, d, e] of bs) {
            if (a < b[0])
                b[0] = a;
            if (c < b[1])
                b[1] = c;
            if (d > b[2])
                b[2] = d;
            if (e > b[3])
                b[3] = e;
        }
        take(b[0], b[1]);
        take(b[2], b[3]);
        return b;
    });
    const maps = [];
    mol.atoms.forEach((a, i) => {
        if (!a.map || a.hidden)
            return;
        const X = pts[i], z = s.size * ratio[i], { hw, spacing } = atomZ[i], gap = 0.2 * z, text = String(a.map);
        const m = grown(measure(text, a.font || a.bold || a.italic ? { font: a.font, bold: a.bold, italic: a.italic } : undefined), ratio[i]);
        const w = m.width * SUB, h = m.ascent * SUB;
        const boxes = [...labelBoxes[i], ...[marks[i], ...symbols[i]].filter((q) => q.length).map(outlineBox)];
        const bonds = nbrs[i].map((j) => { const b = bondAt.get(key(i, j)); return { q: pts[j], t: hw + (b.type === 1 && !b.stereo && !b.display ? 0 : spacing) }; });
        const clear = (c) => {
            const b = [c[0] - w / 2 - gap, c[1] - h / 2 - gap, c[0] + w / 2 + gap, c[1] + h / 2 + gap];
            return boxes.every((o) => o[0] >= b[2] || o[2] <= b[0] || o[1] >= b[3] || o[3] <= b[1]) && bonds.every(({ q, t }) => !crosses([b[0] - t, b[1] - t, b[2] + t, b[3] + t], X, q));
        };
        let at;
        const lb = label[i], reads = lb ? lb[2] - X[0] - (X[0] - lb[0]) : 0;
        if (lb && Math.abs(reads) > 0.1 * z) {
            const c = [reads > 0 ? lb[2] + gap + w / 2 + 0.01 : lb[0] - gap - w / 2 - 0.01, X[1]];
            if (clear(c))
                at = c;
        }
        if (!at) {
            const sides = nbrs[i].map((j) => ({ j, t: Math.atan2(pts[j][1] - X[1], pts[j][0] - X[0]), rings: ringsThrough(i, j, covalent) })).sort((p, q) => p.t - q.t);
            let d = [0, 1], best = -Infinity;
            sides.forEach((p, k) => {
                const q = sides[(k + 1) % sides.length], size = sides.length === 1 ? TAU : turn(q.t - p.t) || TAU, mid = p.t + size / 2;
                const score = size - (p.rings.some((r) => r[1] === q.j) ? 10 : 0) + 0.01 * Math.sin(mid);
                if (score > best) {
                    best = score;
                    d = [Math.cos(mid), Math.sin(mid)];
                }
            });
            for (let r = 0; r <= 5 * z && !at; r += 0.02 * z)
                if (clear(add(X, mul(d, r))))
                    at = add(X, mul(d, r));
            at ?? (at = add(X, mul(d, 5 * z)));
        }
        maps.push({ atom: i, text, at, size: z * SUB, h });
        for (const q of [[at[0] - w / 2, at[1] - h / 2], [at[0] + w / 2, at[1] + h / 2]]) {
            grow(i, q);
            take(q[0], q[1]);
        }
    });
    const labelAt = labels.map((l) => pts[labelAtom.get(l) ?? -1] ?? [l.x, l.y]);
    return { polygons, colours, alphas, labels, box: [x0 - pad, y0 - pad, x1 + pad, y1 + pad], ink, label, scale: k, electrons, beads, labelAt, maps, sides: plans.map((pl) => pl.side ?? 0) };
}
function renderParts(mol, s, measure, scale, cache, still = true) {
    const root = mol.atoms.map((_, i) => i);
    const find = (i) => { while (root[i] !== i)
        i = root[i] = root[root[i]]; return i; };
    const join = (i, j) => { const p = find(i), q = find(j); if (p !== q)
        root[Math.max(p, q)] = Math.min(p, q); };
    for (const b of mol.bonds)
        join(b.atoms[0], b.atoms[1]);
    mol.atoms.forEach((a, i) => { for (const j of a.centre?.atoms ?? [])
        if (j < mol.atoms.length)
            join(i, j); });
    for (const [r, f] of crossingBonds(mol.bonds, (i) => mol.atoms[i].location, 1, s, 1 / s.bond))
        join(mol.bonds[r].atoms[0], mol.bonds[f].atoms[0]);
    const range = depthRange(mol), sameRange = (p) => (p.range ?? null) === range || (!!p.range && !!range && p.range[0] === range[0] && p.range[1] === range[1]);
    const groups = new Map();
    mol.atoms.forEach((_, i) => { const r = find(i); let g = groups.get(r); if (!g)
        groups.set(r, (g = { ids: [], bonds: [] })); g.ids.push(i); });
    for (const b of mol.bonds)
        groups.get(find(b.atoms[0])).bonds.push(b);
    const out = { box: [Infinity, Infinity, -Infinity, -Infinity], ink: [], label: [], scale, electrons: [], beads: [], maps: [], parts: [] }, last = new Map();
    for (const { ids, bonds } of groups.values()) {
        const atoms = ids.map((i) => mol.atoms[i]);
        const shaded = atoms.some((x) => x.shade), same = (p) => !!p && (!shaded || sameRange(p)) && p.atoms.length === atoms.length && p.bonds.length === bonds.length && p.bonds.every((b, k) => b === bonds[k]);
        let part = cache.parts.get(atoms[0]);
        if (!same(part) || part.atoms.some((a, k) => a !== atoms[k])) {
            const was = cache.last.get(ids[0]), at = !still && same(was) ? shiftOf(was.drawn, atoms, scale) ?? turnOf(was.drawn, atoms, scale) : undefined;
            part = at && was ? { atoms, bonds, drawn: was.drawn, drawing: was.drawing, at: at.at, k: at.k, turn: at.turn ?? 0, range } : undefined;
        }
        if (part && still && (part.k !== 1 || part.turn))
            part = undefined;
        if (part && still && (part.at[0] || part.at[1]))
            part = { atoms, bonds, drawn: atoms, drawing: shifted(part.drawing, part.at), at: [0, 0], k: 1, turn: 0, range };
        if (!part) {
            const local = new Map(ids.map((i, k) => [i, k]));
            const drawing = render({ atoms: atoms.map((a) => (a.centre ? { ...a, centre: { ...a.centre, atoms: a.centre.atoms.flatMap((j) => (local.has(j) ? [local.get(j)] : [])) } } : a)), bonds: bonds.map((b) => ({ ...b, atoms: [local.get(b.atoms[0]), local.get(b.atoms[1])] })) }, s, measure, scale, range);
            part = { atoms, bonds, drawn: atoms, drawing, at: [0, 0], k: 1, turn: 0, range };
        }
        cache.parts.set(atoms[0], part);
        last.set(ids[0], part);
        const d = part.drawing, [ax, ay] = part.at, f = part.k, turn = part.turn, moved = !!(ax || ay) || f !== 1 || !!turn;
        const cs = Math.cos((turn * Math.PI) / 180) * f, sn = Math.sin((turn * Math.PI) / 180) * f;
        const to = (q) => (turn ? [q[0] * cs - q[1] * sn + ax, q[0] * sn + q[1] * cs + ay] : [q[0] * f + ax, q[1] * f + ay]);
        const move = (b) => {
            if (!moved)
                return b;
            if (!turn)
                return [b[0] * f + ax, b[1] * f + ay, b[2] * f + ax, b[3] * f + ay];
            const qs = [to([b[0], b[1]]), to([b[2], b[1]]), to([b[2], b[3]]), to([b[0], b[3]])];
            return [Math.min(...qs.map((q) => q[0])), Math.min(...qs.map((q) => q[1])), Math.max(...qs.map((q) => q[0])), Math.max(...qs.map((q) => q[1]))];
        };
        out.parts.push({ ids, drawing: d, at: part.at, k: f, turn });
        for (const x of d.beads)
            out.beads.push(moved ? { at: to(x.at), r: x.r * f } : x);
        for (const e of d.electrons)
            out.electrons.push({ ...e, atom: ids[e.atom], at: moved ? to(e.at) : e.at });
        for (const n of d.maps)
            out.maps.push({ ...n, atom: ids[n.atom], ...(moved ? { at: to(n.at), size: n.size * f, h: n.h * f } : {}) });
        ids.forEach((i, k) => { out.ink[i] = move(d.ink[k]); const l = d.label[k]; out.label[i] = l && move(l); });
        const b = out.box, db = move(d.box);
        b[0] = Math.min(b[0], db[0]);
        b[1] = Math.min(b[1], db[1]);
        b[2] = Math.max(b[2], db[2]);
        b[3] = Math.max(b[3], db[3]);
    }
    cache.last = last;
    return out;
}
function shifted(d, [x, y]) {
    const box = (b) => [b[0] + x, b[1] + y, b[2] + x, b[3] + y];
    return {
        ...d, box: box(d.box), ink: d.ink.map(box), label: d.label.map((b) => b && box(b)),
        polygons: d.polygons.map((poly) => poly.map(([px, py]) => [px + x, py + y])),
        labels: d.labels.map((l) => ({ ...l, x: l.x + x, y: l.y + y, ...(l.pivot ? { pivot: [l.pivot[0] + x, l.pivot[1] + y] } : {}) })),
        electrons: d.electrons.map((e) => ({ ...e, at: [e.at[0] + x, e.at[1] + y] })),
        maps: d.maps.map((n) => ({ ...n, at: [n.at[0] + x, n.at[1] + y] })),
        beads: d.beads.map((b) => ({ ...b, at: [b.at[0] + x, b.at[1] + y] })),
        labelAt: d.labelAt.map(([px, py]) => [px + x, py + y]),
    };
}
function shiftOf(drawn, atoms, px) {
    const k = (0, exports.scaleOf)(atoms[0]) / (0, exports.scaleOf)(drawn[0]), near = k === 1 ? 1e-9 : 1e-4;
    const dx = atoms[0].location[0] - drawn[0].location[0] * k, dy = atoms[0].location[1] - drawn[0].location[1] * k;
    for (let j = 0; j < atoms.length; j++) {
        const a = atoms[j], b = drawn[j], off = (n, m, d) => Math.abs(n - m * k - d) > near * (1 + Math.abs(m * k));
        if (off(a.location[0], b.location[0], dx) || off(a.location[1], b.location[1], dy) || off(a.location[2] ?? 0, b.location[2] ?? 0, 0) || off((0, exports.scaleOf)(a), (0, exports.scaleOf)(b), 0) || !alike(a, b))
            return undefined;
    }
    return { at: [dx * px, -dy * px], k };
}
const rest = (x) => Object.keys(x).filter((key) => key !== "location" && key !== "scale");
const alike = (a, b) => { const ka = rest(a), kb = rest(b); return ka.length === kb.length && ka.every((key) => a[key] === b[key]); };
function turnOf(drawn, atoms, px) {
    const o = drawn[0].location, n = atoms[0].location;
    let far = 0, reach = 0;
    for (let j = 1; j < drawn.length; j++) {
        const r = Math.hypot(drawn[j].location[0] - o[0], drawn[j].location[1] - o[1]);
        if (r > reach) {
            reach = r;
            far = j;
        }
    }
    if (reach < 1e-6)
        return undefined;
    const phi = Math.atan2(atoms[far].location[1] - n[1], atoms[far].location[0] - n[0]) - Math.atan2(drawn[far].location[1] - o[1], drawn[far].location[0] - o[0]);
    const c = Math.cos(phi), s = Math.sin(phi), near = 1e-6 * (1 + reach);
    for (let j = 0; j < atoms.length; j++) {
        const a = atoms[j].location, b = drawn[j].location, dx = b[0] - o[0], dy = b[1] - o[1];
        if (Math.abs(a[0] - n[0] - dx * c + dy * s) > near || Math.abs(a[1] - n[1] - dx * s - dy * c) > near || (a[2] ?? 0) !== (b[2] ?? 0) || (0, exports.scaleOf)(atoms[j]) !== (0, exports.scaleOf)(drawn[j]) || !alike(atoms[j], drawn[j]))
            return undefined;
    }
    const t = [n[0] - (o[0] * c - o[1] * s), n[1] - (o[0] * s + o[1] * c)];
    return { at: [t[0] * px, -t[1] * px], k: 1, turn: (-phi * 180) / Math.PI };
}
exports.CAPTION_PT = 10;
const isNumber = (c) => !!c.bold && /^\d+[a-z]?$/.test(c.text);
exports.isNumber = isNumber;
exports.GAP_PT = 15, exports.GAP_ARROW_PT = 3, exports.LINE = 1.2, exports.ASCENT = 0.905, exports.DESCENT = 0.212;
function lineOffsets(c, size, pt, ink) {
    const runLines = c.runs ? (0, richtext_ts_1.lines)(c.runs) : undefined, count = c.text.split("\n").length;
    const tallest = (j) => Math.max(size, ...(runLines?.[j] ?? []).map((r) => (r.size ? r.size * pt : size) * (r.script ? 0.75 : 1)));
    const all = Math.max(...Array.from({ length: count }, (_, j) => tallest(j)));
    const out = [0];
    for (let j = 1; j < count; j++) {
        const below = ink?.(j - 1)?.[1] ?? exports.DESCENT * tallest(j - 1), above = ink?.(j)?.[0] ?? exports.ASCENT * tallest(j);
        out.push(out[j - 1] + (typeof c.lineHeight === "number" ? c.lineHeight * pt : c.lineHeight === "variable" ? below + above : exports.LINE * all));
    }
    return out;
}
function turnPx(q, pivot, degrees) {
    const r = (degrees * Math.PI) / 180, dx = q[0] - pivot[0], dy = q[1] - pivot[1];
    return [pivot[0] + dx * Math.cos(r) + dy * Math.sin(r), pivot[1] - dx * Math.sin(r) + dy * Math.cos(r)];
}
function placeCaptions(mol, d, width, arrows = mol.arrows ?? [], pt = 4 / 3, defaultSize = exports.CAPTION_PT, fixed = new Map(), measure, extent) {
    const k = d.scale, below = new Map();
    const beside = new Map();
    const order = (c) => ((0, exports.isNumber)(c) ? 0 : 1);
    const sorted = [...(mol.captions ?? [])].sort((a, b) => order(a) - order(b) || a.id - b.id), done = new Map();
    for (const c of sorted)
        if (placedAt(c, mol.arrows))
            done.set(c.id, place(c));
    for (const c of sorted)
        if (!done.has(c.id))
            done.set(c.id, place(c));
    return sorted.flatMap((c) => done.get(c.id));
    function place(given) {
        const wrapped = given.width && measure ? (0, richtext_ts_1.wrap)((0, richtext_ts_1.runsOf)(given), given.width * k, (t, s) => measure(t, given, s)) : undefined;
        const c = wrapped?.soft.length ? { ...given, text: (0, richtext_ts_1.plainOf)(wrapped.runs), ...(given.runs ? { runs: wrapped.runs } : {}) } : given;
        const softLines = new Set((wrapped?.soft ?? []).map((p) => c.text.slice(0, p).split("\n").length - 1));
        const size = (c.size ?? defaultSize) * pt, lines = c.text.split("\n"), align = c.align ?? "centre";
        const inkLines = c.lineHeight === "variable" && extent ? (c.runs ? (0, richtext_ts_1.lines)(c.runs) : lines.map((text) => [{ text }])) : undefined;
        const ink = inkLines && ((j) => {
            const parts = (inkLines[j] ?? []).filter((r) => r.text.trim());
            if (!parts.length)
                return undefined;
            return parts.reduce(([up, down], r) => {
                const [a, b] = extent(r.text, c, (0, richtext_ts_1.styleOf)(r)), shift = (r.script === "sub" ? 0.212 : r.script === "super" ? -0.33 : 0) * size;
                return [Math.max(up, a - shift), Math.max(down, b + shift)];
            }, [0, 0]);
        });
        const offs = lineOffsets(c, size, pt, ink);
        const anchor = align === "left" || align === "justify" ? "start" : align === "right" ? "end" : "middle";
        let x, y, anchorOverride;
        const arrow = c.on && arrows.find((a) => a.id === c.on.arrow), hand = placedAt(c, mol.arrows);
        if (c.on && !arrow)
            return [];
        const pinned = fixed.get(c.id);
        if (c.cycle && c.cycle.side !== "node" && !pinned)
            return [];
        if (pinned) {
            [x, y, anchorOverride] = [pinned.x, pinned.y - offs[offs.length - 1] * (pinned.anchor === "middle" ? 0.5 : 0), pinned.anchor];
        }
        else if (arrow && hand) {
            [x, y] = [hand[0] * k, -hand[1] * k];
        }
        else if (arrow) {
            const [s, t] = [[arrow.from[0] * k, -arrow.from[1] * k], [arrow.to[0] * k, -arrow.to[1] * k]];
            const mid = [(s[0] + t[0]) / 2, (s[1] + t[1]) / 2], len = Math.hypot(t[0] - s[0], t[1] - s[1]) || 1, u = [(t[0] - s[0]) / len, (t[1] - s[1]) / len];
            const key = `${arrow.id} ${c.on.side}`, used = beside.get(key) ?? 0, gap = exports.GAP_ARROW_PT * (0, exports.scaleOf)(arrow) * pt + used;
            const block = offs[offs.length - 1];
            beside.set(key, used + block + (exports.LINE + 0.2) * size);
            if (Math.abs(u[0]) >= 0.5) {
                x = mid[0];
                y = c.on.side === "above" ? mid[1] - gap - exports.DESCENT * size - block : mid[1] + gap + exports.ASCENT * size;
                anchorOverride = "middle";
            }
            else {
                x = c.on.side === "above" ? mid[0] - gap : mid[0] + gap;
                y = mid[1] + (exports.ASCENT * size - block) / 2 - (exports.DESCENT * size) / 2;
                anchorOverride = c.on.side === "above" ? "end" : "start";
            }
        }
        else if (c.under) {
            const atoms = c.under.filter((i) => d.ink[i]);
            if (!atoms.length)
                return [];
            const b = [Math.min(...atoms.map((i) => d.ink[i][0])), Math.min(...atoms.map((i) => d.ink[i][1])), Math.max(...atoms.map((i) => d.ink[i][2])), Math.max(...atoms.map((i) => d.ink[i][3]))];
            const key = [...c.under].sort((p, q) => p - q).join(" ");
            const f = atoms.reduce((sum, i) => sum + (0, exports.scaleOf)(mol.atoms[i] ?? {}), 0) / atoms.length;
            x = align === "left" || align === "justify" ? b[0] : align === "right" ? b[2] : (b[0] + b[2]) / 2;
            y = below.get(key) ?? b[3] + exports.GAP_PT * f * pt;
            below.set(key, y + offs[offs.length - 1] + exports.LINE * size);
        }
        else
            [x, y] = [c.x * k, -c.y * k];
        const at = anchorOverride ?? anchor;
        const widths = lines.map((t, j) => width(t, c, j)), full = align === "justify" && softLines.size ? c.width * k : 0, w = Math.max(full, ...widths);
        const runLines = c.runs ? (0, richtext_ts_1.lines)(c.runs) : undefined;
        const left = at === "start" ? x : at === "end" ? x - w : x - w / 2;
        const spacing = (j) => { const gaps = lines[j].split(" ").length - 1; return full && softLines.has(j) && gaps ? { spacing: (full - widths[j]) / gaps } : {}; };
        const frame = [left, y - exports.ASCENT * size, left + w, y + offs[offs.length - 1] + exports.DESCENT * size];
        if (arrow && hand) {
            const s = [arrow.from[0] * k, -arrow.from[1] * k], t = [arrow.to[0] * k, -arrow.to[1] * k], mid = [(s[0] + t[0]) / 2, (s[1] + t[1]) / 2], above = c.on.side === "above";
            const reach = Math.abs(t[0] - s[0]) >= 0.5 * Math.hypot(t[0] - s[0], t[1] - s[1]) ? (above ? mid[1] - frame[1] : frame[3] - mid[1]) : above ? mid[0] - frame[0] : frame[2] - mid[0];
            const key = `${arrow.id} ${c.on.side}`;
            beside.set(key, Math.max(beside.get(key) ?? 0, reach + 0.2 * size - exports.GAP_ARROW_PT * (0, exports.scaleOf)(arrow) * pt));
        }
        const turned = c.angle ? [[frame[0], frame[1]], [frame[2], frame[1]], [frame[2], frame[3]], [frame[0], frame[3]]].map((q) => turnPx(q, [x, y], c.angle)) : undefined;
        return [{
                id: c.id, size, bold: c.bold, italic: c.italic, underline: c.underline, colour: c.colour, anchor: at, font: c.font, ...(c.order ? { order: c.order } : {}),
                lines: lines.map((text, j) => ({ text, x, y: y + offs[j], ...(runLines ? { runs: runLines[j] ?? [] } : {}), ...spacing(j) })),
                box: turned ? [Math.min(...turned.map((q) => q[0])), Math.min(...turned.map((q) => q[1])), Math.max(...turned.map((q) => q[0])), Math.max(...turned.map((q) => q[1]))] : frame,
                ...(turned ? { angle: c.angle, pivot: [x, y], frame } : {}),
            }];
    }
}
const ARROW_MARGIN_PT = 6;
function fitArrows(mol, scale, width, pt = 4 / 3) {
    return (mol.arrows ?? []).map((a) => {
        if ((0, exports.curved)(a))
            return a;
        const widest = Math.max(0, ...(mol.captions ?? []).filter((c) => c.on?.arrow === a.id && !placedAt(c, mol.arrows)).map(width));
        const need = (widest + 2 * ARROW_MARGIN_PT * (0, exports.scaleOf)(a) * pt) / scale, len = Math.hypot(a.to[0] - a.from[0], a.to[1] - a.from[1]);
        if (!widest || len >= need || !len)
            return a;
        const grow = (need - len) / 2 / len, d = [(a.to[0] - a.from[0]) * grow, (a.to[1] - a.from[1]) * grow];
        return { ...a, from: [a.from[0] - d[0], a.from[1] - d[1]], to: [a.to[0] + d[0], a.to[1] + d[1]] };
    });
}
function bendPoint(a) {
    const len = Math.hypot(a.to[0] - a.from[0], a.to[1] - a.from[1]), b = a.bend ?? 0;
    const n = [-(a.to[1] - a.from[1]) / (len || 1), (a.to[0] - a.from[0]) / (len || 1)];
    return [(a.from[0] + a.to[0]) / 2 + n[0] * b * len, (a.from[1] + a.to[1]) / 2 + n[1] * b * len];
}
function arrowPath(a, k) {
    if ((a.kind === "curve" || a.kind === "cut") && a.curve)
        return curvePath(a.curve, k);
    const S = [a.from[0] * k, -a.from[1] * k], T = [a.to[0] * k, -a.to[1] * k];
    if (!a.bend || (!(0, exports.curved)(a) && !a.point))
        return [S, T];
    const m = bendPoint(a), M = [m[0] * k, -m[1] * k];
    const d = 2 * (S[0] * (M[1] - T[1]) + M[0] * (T[1] - S[1]) + T[0] * (S[1] - M[1]));
    if (Math.abs(d) < 1e-9)
        return [S, T];
    const sq = (q) => q[0] * q[0] + q[1] * q[1];
    const O = [
        (sq(S) * (M[1] - T[1]) + sq(M) * (T[1] - S[1]) + sq(T) * (S[1] - M[1])) / d,
        (sq(S) * (T[0] - M[0]) + sq(M) * (S[0] - T[0]) + sq(T) * (M[0] - S[0])) / d,
    ];
    const r = Math.hypot(S[0] - O[0], S[1] - O[1]), angle = (q) => Math.atan2(q[1] - O[1], q[0] - O[0]);
    const turn = (x) => ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const a0 = angle(S);
    let sweep = turn(angle(T) - a0);
    if (turn(angle(M) - a0) > sweep)
        sweep -= 2 * Math.PI;
    const n = Math.max(8, Math.ceil(Math.abs(sweep) / (Math.PI / 48)));
    return Array.from({ length: n + 1 }, (_, i) => (i === 0 ? S : i === n ? T : [O[0] + r * Math.cos(a0 + (sweep * i) / n), O[1] + r * Math.sin(a0 + (sweep * i) / n)]));
}
const headFit = (a, s, k) => (a.bend || a.kind === "curve" ? 1 : Math.min(1, (2 * Math.hypot(a.to[0] - a.from[0], a.to[1] - a.from[1]) * k) / 3 / ((0, exports.headSize)(a).length * s.line || 1)));
function arrowShapes(a, s, k) {
    const f = (0, exports.scaleOf)(a);
    if (f !== 1)
        s = { ...s, line: s.line * f, bold: s.bold * f, bond: s.bond * f };
    const size = (0, exports.headSize)(a), fit = headFit(a, s, k);
    const hw = s.line / 2, H = size.length * s.line * fit, C = size.centre * s.line * fit, W = size.width * s.line * fit;
    const out = [];
    const bar = (p, q, w = hw) => { const u = unit(sub(q, p)), n = perp(u); out.push([add(p, mul(n, w)), add(q, mul(n, w)), add(q, mul(n, -w)), add(p, mul(n, -w))]); };
    const cut = (pts, trim) => {
        const path = [...pts];
        for (let left = trim; left > 0 && path.length > 1;) {
            const [p, q] = [path[path.length - 2], path[path.length - 1]], d = len(sub(q, p));
            if (d > left) {
                path[path.length - 1] = add(q, mul(unit(sub(p, q)), left));
                break;
            }
            left -= d;
            path.pop();
        }
        return path;
    };
    const line = (pts, trim) => {
        const path = cut(pts, trim);
        if (a.style === "doubled") {
            const g = 0.05 * s.bond;
            for (const side of [-1, 1]) {
                const o = offsetPath(path, side * g);
                for (let i = 0; i + 1 < o.length; i++)
                    if (len(sub(o[i + 1], o[i])) > 1e-9)
                        bar(o[i], o[i + 1]);
            }
            return;
        }
        if (a.style === "dashed" || a.kind === "cut")
            return dashes(path, 0.15 * s.bond, 0.1 * s.bond).forEach(([p, q]) => bar(p, q));
        if (a.style === "wavy") {
            const wave = waveAlong(path, 0.06 * s.bond, 0.2 * s.bond);
            for (let i = 0; i + 1 < wave.length; i++)
                bar(wave[i], wave[i + 1]);
            return;
        }
        for (let i = 0; i + 1 < path.length; i++)
            if (len(sub(path[i + 1], path[i])) > 1e-9)
                bar(path[i], path[i + 1], a.style === "bold" ? s.bold / 2 : hw);
    };
    const shape = a.head ?? "solid";
    const head = (pts, half) => {
        const T = pts[pts.length - 1], back = cut(pts, H).pop(), u = unit(sub(T, back)), n = perp(u);
        const base = add(T, mul(u, -H)), notch = add(T, mul(u, -C));
        const barbs = half ? [half === "left" ? -1 : 1] : [1, -1];
        if (shape === "angled") {
            for (const side of barbs)
                bar(T, add(base, mul(n, side * W)));
            return;
        }
        if (shape === "hollow") {
            for (const side of barbs) {
                bar(T, add(base, mul(n, side * W)));
                bar(add(base, mul(n, side * W)), half ? base : base);
            }
            if (!half)
                bar(add(base, mul(n, W)), add(base, mul(n, -W)));
            return;
        }
        if (!half)
            out.push([T, add(base, mul(n, -W)), notch, add(base, mul(n, W))]);
        else if (half === "left")
            out.push([T, add(base, mul(n, -W)), add(notch, mul(n, -hw))]);
        else
            out.push([T, add(notch, mul(n, hw)), add(base, mul(n, W))]);
    };
    const takes = (h) => (h === "none" ? 0 : shape === "angled" ? hw : shape === "hollow" ? H : h === "full" ? C : 0);
    const path = arrowPath(a, k), [S, T] = [path[0], path[path.length - 1]];
    const u = len(sub(T, S)) > 1e-9 ? unit(sub(T, S)) : [1, 0], n = perp(u);
    if ((0, exports.takesHeads)(a) || (0, exports.marked)(a)) {
        const { start, end } = headsOf(a), reversed = [...path].reverse();
        line(cut(cut(path, takes(end)).reverse(), takes(start)).reverse(), 0);
        if (end !== "none")
            head(path, end === "full" ? undefined : end);
        if (start !== "none")
            head(reversed, start === "full" ? undefined : start);
        const m = a.bend ? path[Math.floor(path.length / 2)] : mul(add(S, T), 0.5), d = 2 * W, at = (p, x, y) => add(add(p, mul(u, x * d)), mul(n, y * d));
        if (a.kind === "nogo") {
            bar(at(m, 1, 1), at(m, -1, -1));
            bar(at(m, -1, 1), at(m, 1, -1));
        }
        if (a.kind === "hash") {
            bar(at(m, 1, -1), at(m, 0, 1));
            bar(at(m, 0, -1), at(m, -1, 1));
        }
        if (a.kind === "dipole") {
            const b = add(S, mul(u, C));
            bar(add(b, mul(n, -W)), add(b, mul(n, W)));
        }
        return out;
    }
    switch (a.kind) {
        case "cut":
            line(path, 0);
            break;
        case "equilibrium": {
            const g = 0.11 * s.bond, along = (q) => q.slice(1).reduce((sum, p, i) => sum + len(sub(p, q[i])), 0), whole = along(path), r = a.ratio ?? 1;
            const ahead = r < 1 ? whole * r : whole, back = r > 1 ? (a.bend ? whole / r : C + (whole - C) / r) : whole;
            const middle = (q, f) => { const t = ((1 - f) / 2) * along(q); return cut(cut(q, t).reverse(), t).reverse(); };
            const top = middle(offsetPath(path, -g), ahead / (whole || 1)), bottom = middle(offsetPath(path, g), back / (whole || 1)).reverse();
            line(top, 0);
            head(top, "left");
            line(bottom, 0);
            head(bottom, "left");
            break;
        }
        case "block": {
            const o = blockOutline({ ...a, scale: undefined }, s, k);
            o.forEach((p, i) => { const q = o[(i + 1) % o.length], e = unit(sub(q, p)); bar(add(p, mul(e, -hw)), add(q, mul(e, hw))); });
            break;
        }
        case "retro": {
            const g = 0.09 * s.bond, tip = add(T, mul(u, -2 * g)), back = add(T, mul(u, -(H + 2 * g)));
            for (const side of [-1, 1]) {
                bar(add(S, mul(n, side * g)), add(tip, mul(n, side * g)));
                bar(T, add(back, mul(n, side * (W + 2 * g))));
            }
            break;
        }
    }
    return out;
}
function headBarb(a, s, k) {
    if ((0, exports.scaleOf)(a) !== 1)
        s = { ...s, line: s.line * (0, exports.scaleOf)(a) };
    const end = headsOf(a).end, S = [a.from[0] * k, -a.from[1] * k], T = [a.to[0] * k, -a.to[1] * k];
    if (a.bend || end === "none" || !((0, exports.takesHeads)(a) || (0, exports.marked)(a)) || a.kind === "curve" || len(sub(T, S)) < 1e-9)
        return undefined;
    const u = unit(sub(T, S)), size = (0, exports.headSize)(a), f = headFit(a, s, k);
    return add(add(T, mul(u, -size.length * s.line * f)), mul(perp(u), (end === "left" ? -1 : 1) * size.width * s.line * f));
}
function blockOutline(a, s, k) {
    if ((0, exports.scaleOf)(a) !== 1)
        s = { ...s, line: s.line * (0, exports.scaleOf)(a) };
    const S = [a.from[0] * k, -a.from[1] * k], T = [a.to[0] * k, -a.to[1] * k];
    if (len(sub(T, S)) < 1e-9)
        return [];
    const u = unit(sub(T, S)), n = perp(u), size = (0, exports.headSize)(a), fit = headFit(a, s, k);
    const H = size.length * s.line * fit, C = size.centre * s.line * fit, o = ((a.shaft ?? size.length) * s.line) / 2;
    const t = C > 0 ? Math.min(1, Math.max(0, 1 - o / C)) : 1, back = H - t * (H - C);
    const at = (along, across) => add(add(T, mul(u, -along)), mul(n, across));
    return [add(S, mul(n, o)), at(back, o), at(H, C), T, at(H, -C), at(back, -o), add(S, mul(n, -o))];
}
function offsetPath(path, d) {
    return path.map((p, i) => {
        const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)], t = sub(b, a);
        return len(t) < 1e-9 ? p : add(p, mul(perp(unit(t)), d));
    });
}
function shapePaths(sh, k, bond = k) {
    const upright = uprightPaths(sh, k, bond * (0, exports.scaleOf)(sh));
    if (!sh.angle || !(0, exports.turns)(sh))
        return upright;
    const r = (sh.angle * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r), c = middleOf(sh), cx = c[0] * k, cy = -c[1] * k;
    return upright.map((path) => path.map(([x, y]) => [cx + (x - cx) * cs + (y - cy) * sn, cy - (x - cx) * sn + (y - cy) * cs]));
}
function uprightPaths(sh, k, bond) {
    const x0 = Math.min(sh.from[0], sh.to[0]) * k, x1 = Math.max(sh.from[0], sh.to[0]) * k;
    const y0 = -Math.max(sh.from[1], sh.to[1]) * k, y1 = -Math.min(sh.from[1], sh.to[1]) * k;
    const w = x1 - x0, h = y1 - y0, arc = (c, r, a0, a1, n = 12) => Array.from({ length: n + 1 }, (_, i) => [c[0] + r[0] * Math.cos(a0 + ((a1 - a0) * i) / n), c[1] + r[1] * Math.sin(a0 + ((a1 - a0) * i) / n)]);
    switch (sh.kind) {
        case "oval": return [arc([(x0 + x1) / 2, (y0 + y1) / 2], [w / 2, h / 2], 0, 2 * Math.PI, 72)];
        case "rounded": {
            const r = Math.min((sh.radius ?? 0.3) * bond, w / 2, h / 2);
            return [[...arc([x1 - r, y0 + r], [r, r], -Math.PI / 2, 0), ...arc([x1 - r, y1 - r], [r, r], 0, Math.PI / 2), ...arc([x0 + r, y1 - r], [r, r], Math.PI / 2, Math.PI), ...arc([x0 + r, y0 + r], [r, r], Math.PI, 1.5 * Math.PI), [x1 - r, y0]]];
        }
        case "brackets": {
            const t = Math.min(0.25 * bond, w / 3);
            return sides(sh, [[x0 + t, y0], [x0, y0], [x0, y1], [x0 + t, y1]], [[x1 - t, y0], [x1, y0], [x1, y1], [x1 - t, y1]]);
        }
        case "parens": {
            const t = Math.min(0.25 * bond, w / 3), R = (t * t + (h / 2) ** 2) / (2 * t), half = Math.asin(Math.min(1, h / 2 / R));
            return sides(sh, arc([x0 + R, (y0 + y1) / 2], [R, R], Math.PI - half, Math.PI + half, 32), arc([x1 - R, (y0 + y1) / 2], [R, R], half, -half, 32));
        }
        case "braces": {
            const t = Math.min(0.25 * bond, w / 3), c = Math.min(t / 2, h / 4), m = (y0 + y1) / 2;
            const q = (a, ctl, b) => Array.from({ length: 9 }, (_, i) => { const u = i / 8, v = 1 - u; return [v * v * a[0] + 2 * v * u * ctl[0] + u * u * b[0], v * v * a[1] + 2 * v * u * ctl[1] + u * u * b[1]]; });
            const brace = (x, s) => [
                ...q([x + s * t, y0], [x + (s * t) / 2, y0], [x + (s * t) / 2, y0 + c]), ...q([x + (s * t) / 2, m - c], [x + (s * t) / 2, m], [x, m]),
                ...q([x, m], [x + (s * t) / 2, m], [x + (s * t) / 2, m + c]), ...q([x + (s * t) / 2, y1 - c], [x + (s * t) / 2, y1], [x + s * t, y1]),
            ];
            return sides(sh, brace(x0, 1), brace(x1, -1));
        }
        default: return [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]];
    }
}
const sides = (sh, left, right) => (sh.side === "left" ? [left] : sh.side === "right" ? [right] : [left, right]);
function markAt(sh, k) {
    const x0 = Math.min(sh.from[0], sh.to[0]), x1 = Math.max(sh.from[0], sh.to[0]), y0 = Math.max(sh.from[1], sh.to[1]), f = (0, exports.scaleOf)(sh);
    const at = (x, y) => (sh.angle ? (0, exports.turnPoint)([x, y], middleOf(sh), sh.angle) : [x, y]);
    const [x, y] = sh.side === "left" ? at(x0 - 0.08 * f, y0 - 0.1 * f) : at(x1 + 0.08 * f, y0 - 0.1 * f);
    return { x: x * k, y: -y * k, anchor: sh.side === "left" ? "end" : "start" };
}
function polymerLabelsAt(sh, k) {
    const x1 = Math.max(sh.from[0], sh.to[0]), y0 = Math.min(sh.from[1], sh.to[1]), y1 = Math.max(sh.from[1], sh.to[1]);
    const at = (x, y) => { const [px, py] = sh.angle ? (0, exports.turnPoint)([x, y], middleOf(sh), sh.angle) : [x, y]; return { x: px * k, y: -py * k }; };
    return { label: at(x1 + 0.08, y0 + 0.05), tags: at(x1 + 0.08, y1 - (sh.mark ? 0.45 : 0.1)) };
}
function shapeInk(sh, s, k) {
    if (sh.kind === "highlight" || sh.kind === "picture")
        return [];
    const f = (0, exports.scaleOf)(sh), hw = ((sh.boldLine ? s.bold : s.line) / 2) * f, out = [], dash = 0.2 * s.bond * f;
    const bar = (p, q) => { const d = len(sub(q, p)); if (d < 1e-9)
        return; const n = perp(unit(sub(q, p))); out.push([add(p, mul(n, -hw)), add(p, mul(n, hw)), add(q, mul(n, hw)), add(q, mul(n, -hw))]); };
    for (const path of shapePaths(sh, k, s.bond)) {
        if (!sh.dashed) {
            for (let i = 0; i + 1 < path.length; i++) {
                if (len(sub(path[i + 1], path[i])) < 1e-9)
                    continue;
                const u = unit(sub(path[i + 1], path[i]));
                bar(add(path[i], mul(u, -hw)), add(path[i + 1], mul(u, hw)));
            }
            continue;
        }
        let on = true, left = dash;
        for (let i = 0; i + 1 < path.length; i++) {
            let p = path[i];
            const q = path[i + 1];
            while (len(sub(q, p)) > 1e-9) {
                const step = Math.min(left, len(sub(q, p))), r = add(p, mul(unit(sub(q, p)), step));
                if (on)
                    bar(p, r);
                p = r;
                left -= step;
                if (left <= 1e-9) {
                    on = !on;
                    left = dash;
                }
            }
        }
    }
    return out;
}
function dashes(path, on, off) {
    const out = [];
    let drawing = true, left = on, start = path[0];
    for (let i = 0; i + 1 < path.length; i++) {
        let p = path[i];
        const q = path[i + 1];
        while (len(sub(q, p)) > 1e-9) {
            const step = Math.min(left, len(sub(q, p))), r = add(p, mul(unit(sub(q, p)), step));
            p = r;
            left -= step;
            if (left <= 1e-9) {
                if (drawing && start)
                    out.push([start, r]);
                drawing = !drawing;
                left = drawing ? on : off;
                start = drawing ? r : undefined;
            }
        }
    }
    if (drawing && start && len(sub(path[path.length - 1], start)) > 1e-9)
        out.push([start, path[path.length - 1]]);
    return out;
}
function waveAlong(path, amplitude, wavelength) {
    const out = [];
    let travelled = 0;
    for (let i = 0; i + 1 < path.length; i++) {
        const p = path[i], q = path[i + 1], d = len(sub(q, p));
        if (d < 1e-9)
            continue;
        const u = unit(sub(q, p)), n = perp(u), steps = Math.max(1, Math.ceil(d / (wavelength / 12)));
        for (let j = 0; j <= steps; j++) {
            const t = (d * j) / steps, along = travelled + t;
            out.push(add(add(p, mul(u, t)), mul(n, amplitude * Math.sin((2 * Math.PI * along) / wavelength))));
        }
        travelled += d;
    }
    return out;
}
function orbitalPaths(a, k) {
    const C = [a.from[0] * k, -a.from[1] * k], T = [a.to[0] * k, -a.to[1] * k], L = len(sub(T, C));
    if (L < 1e-6 || !a.orbital)
        return [];
    const u = unit(sub(T, C)), n = perp(u), axis = Math.atan2(u[1], u[0]);
    const at = (t, r) => add(C, [r * Math.cos(t), r * Math.sin(t)]);
    const lobe = (dir, length, narrow = 1) => Array.from({ length: 49 }, (_, i) => { const f = -Math.PI / 2 / narrow + (Math.PI / narrow) * (i / 48); return at(dir + f, length * Math.cos(f * narrow) ** 2); });
    const ellipse = (a1, b1) => Array.from({ length: 64 }, (_, i) => { const t = (2 * Math.PI * i) / 64; return add(add(C, mul(u, a1 * Math.cos(t))), mul(n, b1 * Math.sin(t))); });
    switch (a.orbital.shape) {
        case "s": return [{ path: ellipse(L, L), second: false }];
        case "oval": return [{ path: ellipse(L, 0.42 * L), second: false }];
        case "lobe": return [{ path: lobe(axis, L), second: false }];
        case "hybrid": return [{ path: lobe(axis, L), second: false }, { path: lobe(axis + Math.PI, 0.38 * L), second: true }];
        case "p": return [{ path: lobe(axis, L), second: false }, { path: lobe(axis + Math.PI, L), second: true }];
        case "d": return [0, 1, 2, 3].map((q) => ({ path: lobe(axis + Math.PI / 4 + (q * Math.PI) / 2, L, 2), second: q % 2 === 1 }));
        case "dz2": {
            const ring = ellipse(0.24 * L, 0.62 * L), hole = ellipse(0.1 * L, 0.32 * L).reverse();
            return [{ path: [...ring, ring[0], ...hole, hole[0]], second: true }, { path: lobe(axis, L), second: false }, { path: lobe(axis + Math.PI, L), second: false }];
        }
    }
}
exports.TLC_ORIGIN = 0.12, exports.TLC_FRONT = 0.1;
function tlcLayout(sh) {
    const x0 = Math.min(sh.from[0], sh.to[0]), x1 = Math.max(sh.from[0], sh.to[0]), y0 = Math.min(sh.from[1], sh.to[1]), y1 = Math.max(sh.from[1], sh.to[1]);
    const lanes = Math.max(1, sh.tlc?.lanes ?? 1), origin = y0 + (y1 - y0) * (sh.tlc?.origin ?? exports.TLC_ORIGIN), front = y1 - (y1 - y0) * (sh.tlc?.front ?? exports.TLC_FRONT);
    const lane = (k) => x0 + ((x1 - x0) * (k + 0.5)) / lanes;
    const width = (x1 - x0) / lanes;
    const f = (0, exports.scaleOf)(sh), size = (x) => ({ rx: (x.w ?? Math.min((0.3 * width) / f, 0.34)) * f, ry: (x.h ?? 0.15) * f });
    return { x0, x1, y0, y1, origin, front, lanes, width, lane, size, f, at: (rf) => origin + (front - origin) * rf };
}
function spotPath(t, x, grow = 0) {
    const cx = t.lane(x.lane), cy = t.at(x.rf), size = t.size(x), [rx, ry] = [size.rx + grow, size.ry + grow], tail = (x.tail ?? 0) * t.f, n = 32, out = [];
    for (let i = 0; i <= n; i++) {
        const a = (Math.PI * 2 * i) / n, sin = Math.sin(a);
        const down = sin < 0 ? tail * -sin : 0, narrow = sin < 0 && tail ? 1 - 0.35 * Math.min(1, tail / (ry * 4)) * -sin : 1;
        out.push([cx + rx * Math.cos(a) * narrow, cy + ry * sin - down]);
    }
    return out;
}
exports.TABLE_PAD = 0.35, exports.TABLE_ROW = 0.8;
const tableRow = (sh, caption = 10) => exports.TABLE_ROW * (0, exports.scaleOf)(sh) * Math.max(1, (sh.size ?? caption) / caption);
exports.tableRow = tableRow;
function tableLayout(sh, measure = () => 0, caption) {
    const x0 = Math.min(sh.from[0], sh.to[0]), y1 = Math.max(sh.from[1], sh.to[1]);
    const cells = sh.table?.cells.length ? sh.table.cells : [[""]];
    const rows = cells.length, cols = Math.max(...cells.map((r) => r.length)), f = (0, exports.scaleOf)(sh);
    const natural = Array.from({ length: cols }, (_, c) => Math.max(f, ...cells.map((r) => (r[c] ? (measure(r[c]) + 2 * exports.TABLE_PAD) * f : 0))));
    const spare = Math.max(0, Math.abs(sh.to[0] - sh.from[0]) - natural.reduce((a, b) => a + b, 0)) / cols;
    const widths = natural.map((w, c) => Math.max(w, sh.table?.widths?.[c] ?? w + spare)), edges = [x0];
    for (const w of widths)
        edges.push(edges[edges.length - 1] + w);
    const h = Math.max((0, exports.tableRow)(sh, caption), Math.abs(sh.to[1] - sh.from[1]) / rows);
    const heights = Array.from({ length: rows }, (_, r) => sh.table?.heights?.[r] ?? h), tops = [y1];
    for (const v of heights)
        tops.push(tops[tops.length - 1] - v);
    return { x0, x1: edges[cols], y0: tops[rows], y1, rows, cols, h, widths, heights, natural, f, col: (c) => edges[c], row: (r) => tops[r] };
}
function curvePath(c, k) {
    const pts = c.points, out = [], px = (q) => [q[0] * k, -q[1] * k];
    if (!pts.length)
        return out;
    out.push(px(pts[0].at));
    const segments = c.closed && pts.length > 2 ? pts.length : pts.length - 1;
    for (let i = 0; i < segments; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length], p0 = px(a.at), p1 = px(a.c2 ?? a.at), p2 = px(b.c1 ?? b.at), p3 = px(b.at);
        if (!a.c2 && !b.c1) {
            out.push(p3);
            continue;
        }
        for (let j = 1; j <= 24; j++) {
            const t = j / 24, u = 1 - t;
            out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
        }
    }
    return out;
}
function ellipsePoints(c, a, b, t0, t1) {
    const n = Math.max(1, Math.ceil(Math.abs(t1 - t0) / (Math.PI / 2) - 1e-9)), dt = (t1 - t0) / n, k = (4 / 3) * Math.tan(dt / 4);
    const at = (t) => [c[0] + Math.cos(t) * a[0] + Math.sin(t) * b[0], c[1] + Math.cos(t) * a[1] + Math.sin(t) * b[1]];
    const along = (t) => [-Math.sin(t) * a[0] + Math.cos(t) * b[0], -Math.sin(t) * a[1] + Math.cos(t) * b[1]];
    return Array.from({ length: n + 1 }, (_, i) => {
        const t = t0 + i * dt, p = at(t), d = along(t);
        return { at: p, ...(i > 0 ? { c1: [p[0] - k * d[0], p[1] - k * d[1]] } : {}), ...(i < n ? { c2: [p[0] + k * d[0], p[1] + k * d[1]] } : {}) };
    });
}
function ellipseArrow(from, to, clockwise) {
    const d = [to[0] - from[0], to[1] - from[1]], s = clockwise ? -1 : 1, q = 1 / 1.16;
    const a = [-q * (d[0] + s * 0.4 * d[1]), -q * (d[1] - s * 0.4 * d[0])], b = [-s * 0.4 * a[1], s * 0.4 * a[0]];
    const points = ellipsePoints([from[0] - a[0], from[1] - a[1]], a, b, 0, (3 * Math.PI) / 2);
    return { kind: "curve", from, to, curve: { points }, end: "full", headSize: (0, exports.headOfLength)(exports.ARC_HEAD) };
}
function curveBox(c) {
    const qs = c.points.flatMap((p) => [p.at, ...(p.c1 ? [p.c1] : []), ...(p.c2 ? [p.c2] : [])]);
    return [[Math.min(...qs.map((q) => q[0])), Math.max(...qs.map((q) => q[1]))], [Math.max(...qs.map((q) => q[0])), Math.min(...qs.map((q) => q[1]))]];
}
function depthRange(m) {
    let lo = Infinity, hi = -Infinity;
    for (const a of m.atoms) {
        const z = a.location[2] ?? 0;
        if (z < lo)
            lo = z;
        if (z > hi)
            hi = z;
    }
    return hi - lo > 5 / 14.4 ? [lo, hi] : null;
}
const shadeAt = (z, [lo, hi]) => Math.trunc(100 * (1 - (0.75 * (hi - Math.min(hi, Math.max(lo, z)))) / (hi - lo)) + 1e-9) / 100;
exports.shadeAt = shadeAt;
function crossingBonds(bonds, at, cell, s, unit = 1) {
    const widths = s ? bonds.map((b) => crossWidth(b, s) * unit) : [], m = s ? ((s.margin * 1.6) / 1.69) * unit : 0, near = s ? m + 2 * Math.max(0, ...widths) : 0;
    const grid = new Map(), out = [], seen = new Set();
    const c = (v) => Math.max(-1e6, Math.min(1e6, Math.floor(v / cell)));
    bonds.forEach((b, k) => {
        const p = at(b.atoms[0]), q = at(b.atoms[1]), x0 = c(Math.min(p[0], q[0]) - near), x1 = c(Math.max(p[0], q[0]) + near), y0 = c(Math.min(p[1], q[1]) - near), y1 = c(Math.max(p[1], q[1]) + near);
        if ((x1 - x0 + 1) * (y1 - y0 + 1) > 4096)
            return;
        for (let x = x0; x <= x1; x++)
            for (let y = y0; y <= y1; y++) {
                const key = x * 4194304 + y, list = grid.get(key);
                if (list)
                    list.push(k);
                else
                    grid.set(key, [k]);
            }
    });
    let tests = 0;
    for (const list of grid.values())
        for (let i = 0; i < list.length; i++)
            for (let j = i + 1; j < list.length; j++) {
                if (++tests > 2e6)
                    return out;
                const r = Math.min(list[i], list[j]), f = Math.max(list[i], list[j]), key = r * bonds.length + f;
                if (seen.has(key))
                    continue;
                seen.add(key);
                const a = bonds[r].atoms, b = bonds[f].atoms;
                if (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1])
                    continue;
                if (meets(at(a[0]), at(a[1]), at(b[0]), at(b[1]), s ? m + widths[r] + widths[f] : 0))
                    out.push([r, f]);
            }
    return out;
}
function crossWidth(b, s) {
    if (b.type === exports.QUADRUPLE)
        return 3 * s.spacing;
    if (b.type === 3)
        return 2 * s.spacing;
    if (b.type === 2 || b.type === exports.AROMATIC)
        return s.spacing + (b.display === "bold" ? s.bold : 0);
    if (b.stereo === 1 || b.stereo === 6 || b.display === "hollow")
        return 1.5 * s.bold;
    return b.display === "bold" ? s.bold : s.line;
}
function meets(p1, p2, q1, q2, near) {
    if (crossing(p1, p2, q1, q2))
        return true;
    if (!near || Math.abs(cross(sub(p2, p1), sub(q2, q1))) < (near * near) / 2)
        return false;
    const off = (p, a, b) => { const d = sub(b, a), l = dot(d, d), t = l ? Math.max(0, Math.min(1, dot(sub(p, a), d) / l)) : 0; return len(sub(add(a, mul(d, t)), p)); };
    return off(p1, q1, q2) < near || off(p2, q1, q2) < near || off(q1, p1, p2) < near || off(q2, p1, p2) < near;
}
function without(poly, cut) {
    const out = [], c = mul(cut.reduce((t, q) => add(t, q), [0, 0]), 1 / cut.length);
    let rest = poly;
    for (let k = 0; k < cut.length && rest.length; k++) {
        const a = cut[k], b = cut[(k + 1) % cut.length], e = sub(b, a);
        if (len(e) < 1e-9)
            continue;
        let n = unit(perp(e));
        if (dot(sub(c, a), n) > 0)
            n = mul(n, -1);
        const outside = clipSide(rest, a, n, 0);
        if (outside.length)
            out.push(outside);
        rest = clipSide(rest, a, mul(n, -1), 0);
    }
    return out;
}
function clipSide(poly, o, n, d) {
    const out = [], f = (q) => dot(sub(q, o), n) - d;
    poly.forEach((q, k) => {
        const r = poly[(k + 1) % poly.length], fq = f(q), fr = f(r);
        if (fq >= 0)
            out.push(q);
        if ((fq >= 0) !== (fr >= 0))
            out.push(add(q, mul(sub(r, q), fq / (fq - fr))));
    });
    return out.length >= 3 ? out : [];
}
function crossing(p1, p2, q1, q2) {
    const r = sub(p2, p1), s = sub(q2, q1), d = cross(r, s);
    if (Math.abs(d) < 1e-9)
        return undefined;
    const t = cross(sub(q1, p1), s) / d, u = cross(sub(q1, p1), r) / d;
    return t > 0.02 && t < 0.98 && u > 0.02 && u < 0.98 ? [t, u] : undefined;
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
  defs["query.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rNumber = exports.polymerTags = exports.USAGE_KINDS = exports.USAGES = exports.QUERY_VALUES = exports.anyQuery = exports.isGeneric = exports.GENERICS = void 0;
exports.elementList = elementList;
exports.altGroup = altGroup;
exports.linkNode = linkNode;
exports.queryLabel = queryLabel;
exports.atomIndicator = atomIndicator;
exports.bondIndicator = bondIndicator;
exports.hasQuery = hasQuery;
exports.readAtomQuery = readAtomQuery;
exports.readBondQuery = readBondQuery;
exports.readPolymer = readPolymer;
exports.readRgroup = readRgroup;
exports.polymerLabel = polymerLabel;
exports.repeatCount = repeatCount;
exports.enclosed = enclosed;
exports.polymerBrackets = polymerBrackets;
exports.rgroupMembers = rgroupMembers;
exports.attachmentCentre = attachmentCentre;
exports.placeAttachments = placeAttachments;
exports.massText = massText;
exports.nextRGroup = nextRGroup;
exports.addAttachment = addAttachment;
exports.genericSites = genericSites;
exports.stepSubstituents = stepSubstituents;
const labels_ts_1 = require("labels.ts");
const render_ts_1 = require("render.ts");
var labels_ts_2 = require("labels.ts");
Object.defineProperty(exports, "GENERICS", { enumerable: true, get: function () { return labels_ts_2.GENERICS; } });
Object.defineProperty(exports, "isGeneric", { enumerable: true, get: function () { return labels_ts_2.isGeneric; } });
const symbol = (s) => labels_ts_1.ELEMENTS.has(s) || s === "T";
function listOf(text) {
    const m = /^\[?\s*(NOT\s+|-\s*)?([^[\]]*?)\s*\]?$/.exec(text.trim());
    if (!m || !m[2].includes(",") && !m[1])
        return undefined;
    const items = m[2].split(",").map((s) => s.trim());
    return items.every(Boolean) ? { not: !!m[1], items } : undefined;
}
function elementList(text) {
    const l = listOf(text);
    return l && l.items.every(symbol) && (l.not || l.items.length > 1) ? { not: l.not, elements: l.items } : undefined;
}
function altGroup(text) {
    const l = listOf(text);
    return l && !l.not && l.items.length > 1 && !l.items.every(symbol) && l.items.every((s) => s.length <= 20 && /^[\w()*'+-]+$/.test(s)) ? l.items : undefined;
}
function linkNode(text) {
    const m = /^[[({]?(.+?)[\])}]?(\d{1,2})-(\d{1,2})$/.exec(text.trim());
    if (!m)
        return undefined;
    const el = /^([A-Z][a-z]?)(H(\d?))?$/.exec(m[1]), low = Number(m[2]), high = Number(m[3]);
    if (!(low >= 1 && high >= low))
        return undefined;
    if (el && labels_ts_1.ELEMENTS.has(el[1]))
        return { element: el[1], h: el[2] ? Number(el[3] || 1) : 0, low, high };
    return (0, labels_ts_1.isGeneric)(m[1]) ? { element: "C", h: 0, generic: m[1], low, high } : undefined;
}
function queryLabel(text) {
    if (!text)
        return undefined;
    return (0, labels_ts_1.isGeneric)(text) ? "generic" : elementList(text) ? "list" : linkNode(text) ? "link" : altGroup(text) ? "alt" : undefined;
}
function atomIndicator(q) {
    if (!q)
        return "";
    const s = q.subst ? `${{ free: "*", upto: "U", exactly: "X" }[q.subst.kind]}${q.subst.n}` : "";
    return s + (q.noH ? "H" : "") + (q.rings ? "R" : "") + (q.unsat ? "S" : "") + (q.change ? "C" : "") + (q.stereo ? "T" : "") + (q.translation ? "L" : "");
}
function bondIndicator(b) {
    return [b.query && { any: "Any", sd: "S/D", sa: "S/A", da: "D/A" }[b.query], b.topology && { ring: "Rng", chain: "Chn", either: "R/C" }[b.topology], b.rxn && "Rxn"].filter(Boolean).join(" ");
}
const anyQuery = (q) => !!q && Object.keys(q).length > 0;
exports.anyQuery = anyQuery;
function hasQuery(m) {
    return m.atoms.some((a) => (0, exports.anyQuery)(a.query) || !!a.centre || !!queryLabel(a.text)) || m.bonds.some((b) => b.query || b.topology || b.rxn)
        || !!m.shapes?.some((sh) => sh.rgroup || sh.polymer);
}
exports.QUERY_VALUES = {
    subst: ["free", "upto", "exactly"], rings: ["none", "drawn", "simple", "fusion", "spiro"], unsat: ["absent", "present"], stereo: ["inversion", "retention"],
    translation: ["broad", "narrow", "any"], abundance: ["any", "natural", "enriched", "deficient", "nonnatural"],
    query: ["any", "sd", "sa", "da"], topology: ["ring", "chain", "either"], rxn: ["centre", "makebreak", "change", "makechange", "not", "nochange", "unmapped"],
};
const oneOf = (list, v) => list.includes(v);
function readAtomQuery(v) {
    if (!v || typeof v !== "object" || Array.isArray(v))
        return undefined;
    const o = v, s = o.subst, q = {};
    if (s && oneOf(exports.QUERY_VALUES.subst, s.kind) && Number.isInteger(s.n) && s.n >= 0 && s.n <= 15)
        q.subst = { kind: s.kind, n: s.n };
    if (o.noH === true)
        q.noH = true;
    if (oneOf(exports.QUERY_VALUES.rings, o.rings))
        q.rings = o.rings;
    if (oneOf(exports.QUERY_VALUES.unsat, o.unsat))
        q.unsat = o.unsat;
    if (o.change === true)
        q.change = true;
    if (oneOf(exports.QUERY_VALUES.stereo, o.stereo))
        q.stereo = o.stereo;
    if (oneOf(exports.QUERY_VALUES.translation, o.translation))
        q.translation = o.translation;
    if (oneOf(exports.QUERY_VALUES.abundance, o.abundance))
        q.abundance = o.abundance;
    if (o.valence === true)
        q.valence = true;
    return Object.keys(q).length ? q : undefined;
}
function readBondQuery(o) {
    return { ...(oneOf(exports.QUERY_VALUES.query, o.query) ? { query: o.query } : {}), ...(oneOf(exports.QUERY_VALUES.topology, o.topology) ? { topology: o.topology } : {}), ...(oneOf(exports.QUERY_VALUES.rxn, o.rxn) ? { rxn: o.rxn } : {}) };
}
function readPolymer(v) {
    const o = v;
    if (!o || typeof o !== "object" || !oneOf(exports.USAGE_KINDS, o.usage))
        return undefined;
    const p = { usage: o.usage };
    if (typeof o.label === "string" && o.label.length <= 20 && !/[\u0000-\u001f<>]/.test(o.label))
        p.label = o.label;
    if (Number.isInteger(o.order) && o.order >= 0 && o.order <= 999)
        p.order = o.order;
    if (o.pattern === "hh" || o.pattern === "eu")
        p.pattern = o.pattern;
    if (o.flip === "noflip" || o.flip === "flip")
        p.flip = o.flip;
    if (typeof o.mw === "number" && Number.isFinite(o.mw) && o.mw > 0 && o.mw < 1e9)
        p.mw = o.mw;
    return p;
}
function readRgroup(v) {
    const o = v;
    if (!o || typeof o !== "object" || typeof o.name !== "string" || !(0, exports.rNumber)(o.name))
        return undefined;
    return { name: o.name, ...(typeof o.occur === "string" && /^[\d\s,<>=-]{1,20}$/.test(o.occur) ? { occur: o.occur.trim() } : {}), ...(o.restH === true ? { restH: true } : {}),
        ...(typeof o.then === "string" && (0, exports.rNumber)(o.then) ? { then: o.then } : {}) };
}
exports.USAGES = {
    sru: { name: "SRU (n)", cdxml: "SRU", mdl: "SRU", label: "n" },
    param: { name: "Parameterizable (#/#-#/MW)", cdxml: "MultipleGroup", mdl: "SRU", label: "n" },
    mult: { name: "Multiple group (#)", cdxml: "MultipleGroup", mdl: "MUL", label: "2" },
    mon: { name: "Monomer (mon)", cdxml: "Monomer", mdl: "MON", label: "mon" },
    mer: { name: "Mer (mer)", cdxml: "Mer", mdl: "MER", label: "mer" },
    co: { name: "Copolymer (co)", cdxml: "Copolymer", mdl: "COP", label: "co" },
    alt: { name: "Copolymer, alternating (alt)", cdxml: "CopolymerAlternating", mdl: "COP", sub: "ALT", label: "alt" },
    ran: { name: "Copolymer, random (ran)", cdxml: "CopolymerRandom", mdl: "COP", sub: "RAN", label: "ran" },
    blk: { name: "Copolymer, block (blk)", cdxml: "CopolymerBlock", mdl: "COP", sub: "BLO", label: "blk" },
    xl: { name: "Crosslink (xl)", cdxml: "Crosslink", mdl: "CRO", label: "xl" },
    grf: { name: "Graft (grf)", cdxml: "Graft", mdl: "GRA", label: "grf" },
    mod: { name: "Modification (mod)", cdxml: "Modification", mdl: "MOD", label: "mod" },
    c: { name: "Component (c)", cdxml: "Component", mdl: "COM", label: "c" },
    mix: { name: "Mixture, unordered (mix)", cdxml: "MixtureUnordered", mdl: "MIX", label: "mix" },
    f: { name: "Mixture, ordered (f)", cdxml: "MixtureOrdered", mdl: "FOR", label: "f" },
    anyp: { name: "Anypolymer (anyp)", cdxml: "Anypolymer", mdl: "ANY", label: "anyp" },
    gen: { name: "Generic", cdxml: "Generic", mdl: "GEN", label: "" },
};
exports.USAGE_KINDS = Object.keys(exports.USAGES);
function polymerLabel(p) {
    if (p.usage === "c")
        return `c${p.order ?? ""}`;
    if (p.usage === "sru" || p.usage === "mult" || p.usage === "param")
        return p.label ?? exports.USAGES[p.usage].label;
    return exports.USAGES[p.usage].label;
}
const polymerTags = (p) => [p.pattern ?? "", p.flip === "flip" ? "flip" : "", p.usage === "param" && p.mw ? `Mw ${p.mw}` : ""].filter(Boolean).join(" ");
exports.polymerTags = polymerTags;
function repeatCount(p, unitWeight) {
    if (p.usage === "param" && p.mw && unitWeight)
        return p.mw / unitWeight;
    if (p.usage !== "mult" && p.usage !== "param")
        return undefined;
    const m = /^\s*(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*$/.exec(p.label ?? (p.usage === "mult" ? "2" : ""));
    return m ? (m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1])) : undefined;
}
function enclosed(m, sh) {
    const inside = new Set(), near = m.atoms.map(() => []);
    m.atoms.forEach((a, i) => { if ((0, render_ts_1.inShape)(sh, [a.location[0], a.location[1]]))
        inside.add(i); });
    m.bonds.forEach((b, k) => { near[b.atoms[0]].push(k); near[b.atoms[1]].push(k); });
    const mid = [(sh.from[0] + sh.to[0]) / 2, (sh.from[1] + sh.to[1]) / 2];
    const up = (i) => { const q = m.atoms[i].location; return sh.angle ? (0, render_ts_1.turnPoint)([q[0], q[1]], mid, -sh.angle) : [q[0], q[1]]; };
    const y0 = Math.min(sh.from[1], sh.to[1]), y1 = Math.max(sh.from[1], sh.to[1]);
    const crosses = (b) => {
        const [p, q] = [up(b.atoms[0]), up(b.atoms[1])];
        return [sh.from[0], sh.to[0]].some((x) => (p[0] - x) * (q[0] - x) < 0 && Math.abs(p[1] + ((x - p[0]) / (q[0] - p[0])) * (q[1] - p[1]) - (y0 + y1) / 2) <= (y1 - y0) / 2);
    };
    const stack = [...inside];
    while (stack.length) {
        const i = stack.pop();
        for (const k of near[i]) {
            const b = m.bonds[k], j = b.atoms[0] === i ? b.atoms[1] : b.atoms[0];
            if (!inside.has(j) && !crosses(b)) {
                inside.add(j);
                stack.push(j);
            }
        }
    }
    return { atoms: [...inside].sort((p, q) => p - q), crossing: m.bonds.flatMap((b, k) => (inside.has(b.atoms[0]) !== inside.has(b.atoms[1]) ? [k] : [])) };
}
function polymerBrackets(m) {
    return (m.shapes ?? []).flatMap((sh) => {
        if (!sh.polymer || !(0, render_ts_1.isBracket)(sh) || sh.side)
            return [];
        const e = enclosed(m, sh);
        return e.atoms.length ? [{ sh, ...e }] : [];
    });
}
function rgroupMembers(m, frags) {
    return (m.shapes ?? []).filter((sh) => sh.rgroup).map((sh) => ({ sh, members: frags.filter((f) => f.every((i) => (0, render_ts_1.inShape)(sh, [m.atoms[i].location[0], m.atoms[i].location[1]]))) }));
}
const rNumber = (text) => { const m = /^R([1-9]\d?)$/.exec(text ?? ""); return m ? Number(m[1]) : undefined; };
exports.rNumber = rNumber;
function attachmentCentre(m, a) {
    const at = (a.centre?.atoms ?? []).filter((i) => m.atoms[i]);
    if (!at.length)
        return undefined;
    return [at.reduce((s, i) => s + m.atoms[i].location[0], 0) / at.length, at.reduce((s, i) => s + m.atoms[i].location[1], 0) / at.length];
}
function placeAttachments(m) {
    if (!m.atoms.some((a) => a.centre))
        return m;
    let changed = false;
    const atoms = m.atoms.map((a) => {
        const c = a.centre && attachmentCentre(m, a);
        if (!c || (Math.abs(c[0] - a.location[0]) < 1e-9 && Math.abs(c[1] - a.location[1]) < 1e-9))
            return a;
        changed = true;
        return { ...a, location: [c[0], c[1], a.location[2] ?? 0] };
    });
    return changed ? { ...m, atoms } : m;
}
function massText(v, key, places) {
    const r = v.repeat;
    if (!r)
        return v[key].toFixed(places);
    return `${r.ends ? `${r.ends[key].toFixed(places)} + ` : ""}(${r[key].toFixed(places)})${r.label}`;
}
function nextRGroup(m) {
    const defined = new Set((m.shapes ?? []).flatMap((sh) => (sh.rgroup ? [(0, exports.rNumber)(sh.rgroup.name)] : [])));
    const used = m.atoms.flatMap((a) => ((0, exports.rNumber)(a.text) && !defined.has((0, exports.rNumber)(a.text)) ? [(0, exports.rNumber)(a.text)] : [])).sort((p, q) => p - q);
    if (used.length)
        return `R${used[0]}`;
    let n = 1;
    while (defined.has(n))
        n++;
    return `R${n}`;
}
function addAttachment(m, atoms, variable) {
    const at = [...new Set(atoms)].filter((i) => m.atoms[i] && !m.atoms[i].centre && !m.atoms[i].attach);
    const c = [at.reduce((s, i) => s + m.atoms[i].location[0], 0) / at.length, at.reduce((s, i) => s + m.atoms[i].location[1], 0) / at.length, 0];
    return [{ ...m, atoms: [...m.atoms, { label: "C", location: c, centre: { atoms: at, ...(variable ? { variable: true } : {}) } }] }, m.atoms.length];
}
function genericSites(m, atoms) {
    const defined = new Set((m.shapes ?? []).flatMap((sh) => (sh.rgroup ? [sh.rgroup.name] : [])));
    for (const i of atoms) {
        const a = m.atoms[i];
        if (a && ((a.text && defined.has(a.text)) || altGroup(a.text ?? "") || elementList(a.text ?? "")?.not === false || a.centre?.variable))
            return true;
    }
    return false;
}
function stepSubstituents(m, i, kind) {
    const a = m.atoms[i], s = a?.query?.subst;
    if (!a)
        return m;
    let next;
    if (kind === "lower")
        next = s && s.n > 0 ? { kind: s.kind, n: s.n - 1 } : undefined;
    else
        next = s?.kind === kind ? { kind, n: Math.min(kind === "free" ? 9 : 15, s.n + 1) } : { kind, n: 1 };
    const query = { ...a.query, subst: next };
    if (!next)
        delete query.subst;
    return { ...m, atoms: m.atoms.map((x, k) => (k === i ? { ...x, query: Object.keys(query).length ? query : undefined } : x)) };
}

  };
  defs["rings.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rings = rings;
exports.aromaticAtoms = aromaticAtoms;
exports.kekulise = kekulise;
const neighbours = (g) => {
    const adj = g.atoms.map(() => []);
    g.bonds.forEach((b, k) => { adj[b.a].push({ to: b.b, k }); adj[b.b].push({ to: b.a, k }); });
    return adj;
};
function rings(g) {
    const adj = neighbours(g), out = new Map();
    g.bonds.forEach((b, k) => {
        const back = new Map([[b.a, -1]]), queue = [b.a];
        for (let q = 0; q < queue.length && !back.has(b.b); q++)
            for (const e of adj[queue[q]])
                if (e.k !== k && !back.has(e.to)) {
                    back.set(e.to, queue[q]);
                    queue.push(e.to);
                }
        if (!back.has(b.b))
            return;
        const ring = [];
        for (let v = b.b; v !== -1; v = back.get(v))
            ring.push(v);
        if (ring.length <= 20)
            out.set([...ring].sort((x, y) => x - y).join(","), ring);
    });
    return [...out.values()];
}
function aromaticAtoms(g) {
    const adj = neighbours(g), found = rings(g).filter((r) => r.length >= 3 && r.length <= 8), aromatic = g.atoms.map(() => false);
    const ringBond = new Set(found.flatMap((r) => r.map((v, i) => g.bonds.findIndex((b) => (b.a === v && b.b === r[(i + 1) % r.length]) || (b.b === v && b.a === r[(i + 1) % r.length])))));
    const electrons = (v, inRing) => {
        const a = g.atoms[v], double = adj[v].find((e) => g.bonds[e.k].order === 2);
        if (adj[v].some((e) => g.bonds[e.k].order === 3) || adj[v].filter((e) => g.bonds[e.k].order === 2).length > 1)
            return undefined;
        if (double) {
            if (inRing.has(double.to))
                return 1;
            if (aromatic[double.to] && ringBond.has(double.k))
                return 1;
            return ["O", "N", "S"].includes(g.atoms[double.to].el) && ["C", "N", "S", "P"].includes(a.el) ? 0 : undefined;
        }
        if (a.el === "C")
            return a.charge < 0 ? 2 : a.charge > 0 ? 0 : undefined;
        if (a.el === "B")
            return 0;
        if (["N", "P"].includes(a.el))
            return a.charge === 0 && adj[v].length + a.h === 3 ? 2 : undefined;
        if (["O", "S", "Se", "Te"].includes(a.el))
            return a.charge === 0 && adj[v].length + a.h === 2 ? 2 : undefined;
        return undefined;
    };
    const huckel = (atoms) => {
        const inRing = new Set(atoms);
        let total = 0;
        for (const v of atoms) {
            const e = electrons(v, inRing);
            if (e === undefined)
                return false;
            total += e;
        }
        return total % 4 === 2;
    };
    const fused = found.flatMap((r, i) => found.slice(i + 1).filter((s) => s.filter((v) => r.includes(v)).length >= 2).map((s) => [...new Set([...r, ...s])]));
    for (let changed = true; changed;) {
        changed = false;
        for (const r of [...found, ...fused]) {
            if (r.every((v) => aromatic[v]) || !huckel(r))
                continue;
            r.forEach((v) => { aromatic[v] = true; });
            changed = true;
        }
    }
    return aromatic;
}
function kekulise(edges, order) {
    const can = new Set(order), at = new Map();
    edges.forEach(([a, b], k) => { for (const v of [a, b])
        at.set(v, [...(at.get(v) ?? []), k]); });
    const used = new Set(), pick = edges.map(() => false), perfect = Math.floor(order.length / 2);
    let best = [...pick], bestN = -1, n = 0, steps = 0;
    const go = (i) => {
        if (bestN === perfect || ++steps > 50000)
            return;
        if (i === order.length) {
            if (n > bestN) {
                bestN = n;
                best = [...pick];
            }
            return;
        }
        const v = order[i];
        if (!used.has(v))
            for (const k of at.get(v) ?? []) {
                const w = edges[k][0] === v ? edges[k][1] : edges[k][0];
                if (used.has(w) || !can.has(w))
                    continue;
                used.add(v);
                used.add(w);
                pick[k] = true;
                n++;
                go(i + 1);
                used.delete(v);
                used.delete(w);
                pick[k] = false;
                n--;
            }
        go(i + 1);
    };
    go(0);
    return best;
}

  };
  defs["richtext.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.without = exports.whole = exports.styled = exports.runsOf = exports.plainOf = exports.styleOf = exports.sameStyle = void 0;
exports.normalise = normalise;
exports.styleRange = styleRange;
exports.common = common;
exports.shareColour = shareColour;
exports.trimLines = trimLines;
exports.labelStyle = labelStyle;
exports.edited = edited;
exports.lines = lines;
exports.wrap = wrap;
const KEYS = ["bold", "italic", "underline", "script", "font", "size", "colour"];
const sameStyle = (a, b) => KEYS.every((k) => a[k] === b[k]);
exports.sameStyle = sameStyle;
const styleOf = (r) => Object.fromEntries(KEYS.filter((k) => r[k] !== undefined).map((k) => [k, r[k]]));
exports.styleOf = styleOf;
const plainOf = (runs) => runs.map((r) => r.text).join("");
exports.plainOf = plainOf;
const runsOf = (c) => (c.runs?.length ? c.runs : [{ text: c.text }]);
exports.runsOf = runsOf;
const styled = (runs) => runs.some((r) => KEYS.some((k) => r[k] !== undefined));
exports.styled = styled;
function normalise(runs) {
    const out = [];
    for (const r of runs) {
        if (!r.text)
            continue;
        const last = out[out.length - 1];
        if (last && (0, exports.sameStyle)(last, r))
            out[out.length - 1] = { ...last, text: last.text + r.text };
        else
            out.push({ ...r });
    }
    return out.length ? out : [{ text: "", ...(0, exports.styleOf)(runs[0] ?? { text: "" }) }];
}
function styleRange(runs, start, end, patch) {
    const out = [];
    let at = 0;
    for (const r of runs) {
        const a = at, b = at + r.text.length;
        at = b;
        if (b <= start || a >= end) {
            out.push(r);
            continue;
        }
        const s = Math.max(start, a) - a, e = Math.min(end, b) - a;
        if (s > 0)
            out.push({ ...r, text: r.text.slice(0, s) });
        out.push({ ...clean(patch((0, exports.styleOf)(r))), text: r.text.slice(s, e) });
        if (e < r.text.length)
            out.push({ ...r, text: r.text.slice(e) });
    }
    return normalise(out);
}
const clean = (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined && v !== false));
function common(runs, start, end) {
    const picked = [];
    let at = 0;
    for (const r of runs) {
        const a = at, b = at + r.text.length;
        at = b;
        if (start === end ? a < start && start <= b : b > start && a < end)
            picked.push((0, exports.styleOf)(r));
    }
    if (!picked.length)
        return runs.length ? (0, exports.styleOf)(runs[0]) : {};
    return Object.fromEntries(KEYS.filter((k) => picked.every((s) => s[k] === picked[0][k]) && picked[0][k] !== undefined).map((k) => [k, picked[0][k]]));
}
const whole = (c) => (c.runs?.length ? { ...c, ...common(c.runs, 0, c.text.length) } : c);
exports.whole = whole;
const without = (runs, keys) => normalise(runs.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k)))));
exports.without = without;
function shareColour(runs, own, ink) {
    const all = (runs ?? []).filter((r) => r.text).map((r) => r.colour ?? own ?? ink);
    if (!runs || !all.length || all.some((c) => c.toLowerCase() !== all[0].toLowerCase()))
        return { colour: own, runs };
    const rest = (0, exports.without)(runs, ["colour"]);
    return { colour: all[0].toLowerCase() === ink.toLowerCase() ? undefined : all[0], runs: (0, exports.styled)(rest) ? rest : undefined };
}
function trimLines(runs) {
    const chars = runs.flatMap((r) => r.text.split("").map((ch) => ({ ...(0, exports.styleOf)(r), text: ch }))), out = [];
    let line = [];
    const end = () => {
        let a = 0, b = line.length;
        while (a < b && /\s/.test(line[a].text))
            a++;
        while (b > a && /\s/.test(line[b - 1].text))
            b--;
        if (a < b)
            out.push(...(out.length ? [{ text: "\n" }] : []), ...line.slice(a, b));
        line = [];
    };
    for (const c of chars) {
        if (c.text === "\n")
            end();
        else
            line.push(c);
    }
    end();
    return normalise(out);
}
function labelStyle(runs) {
    const only = normalise(runs.map((r) => ({ text: r.text, ...(r.bold ? { bold: true } : {}), ...(r.italic ? { italic: true } : {}), ...(r.underline ? { underline: true } : {}) })));
    const all = common(only, 0, (0, exports.plainOf)(only).length), rest = (0, exports.without)(only, Object.keys(all));
    return { ...all, ...((0, exports.styled)(rest) ? { runs: rest } : {}) };
}
function edited(runs, next, pending) {
    const old = (0, exports.plainOf)(runs);
    let p = 0;
    while (p < old.length && p < next.length && old[p] === next[p])
        p++;
    let s = 0;
    while (s < old.length - p && s < next.length - p && old[old.length - 1 - s] === next[next.length - 1 - s])
        s++;
    const inserted = next.slice(p, next.length - s), style = pending ?? common(runs, p, p);
    const keep = (from, to) => {
        const out = [];
        let at = 0;
        for (const r of runs) {
            const a = at, b = at + r.text.length;
            at = b;
            const x = Math.max(from, a), y = Math.min(to, b);
            if (y > x)
                out.push({ ...r, text: r.text.slice(x - a, y - a) });
        }
        return out;
    };
    return normalise([...keep(0, p), ...(inserted ? [{ ...style, text: inserted }] : []), ...keep(old.length - s, old.length)]);
}
function lines(runs) {
    const out = [[]];
    for (const r of runs) {
        r.text.split("\n").forEach((part, i) => {
            if (i)
                out.push([]);
            if (part)
                out[out.length - 1].push({ ...r, text: part });
        });
    }
    return out;
}
function wrap(runs, max, width) {
    const text = (0, exports.plainOf)(runs), soft = [];
    const measure = (a, b) => {
        let w = 0, at = 0;
        for (const r of runs) {
            const s = Math.max(a, at), e = Math.min(b, at + r.text.length);
            if (e > s)
                w += width(r.text.slice(s - at, e - at), (0, exports.styleOf)(r));
            at += r.text.length;
        }
        return w;
    };
    let start = 0;
    for (const line of text.split("\n")) {
        const end = start + line.length;
        let from = start;
        while (measure(from, end) > max) {
            let brk = -1;
            for (let i = from + 1; i < end; i++) {
                if (text[i] !== " ")
                    continue;
                if (measure(from, i) <= max || brk < 0)
                    brk = i;
                if (measure(from, i) > max)
                    break;
            }
            if (brk < 0)
                break;
            soft.push(brk);
            from = brk + 1;
        }
        start = end + 1;
    }
    if (!soft.length)
        return { runs, soft };
    const breaks = new Set(soft);
    let at = 0;
    return { runs: runs.map((r) => { const t = r.text.split("").map((ch, k) => (breaks.has(at + k) ? "\n" : ch)).join(""); at += r.text.length; return { ...r, text: t }; }), soft };
}

  };
  defs["common.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonKey = exports.COMMON = void 0;
exports.citable = citable;
const labels_ts_1 = require("labels.ts");
const DRUG_NAMES = {
    aspirin: "2-acetyloxybenzoic acid", acetaminophen: "N-(4-hydroxyphenyl)acetamide", naproxen: "(2S)-2-(6-methoxynaphthalen-2-yl)propanoic acid",
    diclofenac: "2-[2-(2,6-dichloroanilino)phenyl]acetic acid",
    testosterone: "(8R,9S,10R,13S,14S,17S)-17-hydroxy-10,13-dimethyl-1,2,6,7,8,9,11,12,14,15,16,17-dodecahydrocyclopenta[a]phenanthren-3-one",
    estradiol: "(8R,9S,13S,14S,17S)-13-methyl-6,7,8,9,11,12,14,15,16,17-decahydrocyclopenta[a]phenanthrene-3,17-diol",
    serotonin: "3-(2-aminoethyl)-1H-indol-5-ol", epinephrine: "4-[(1R)-1-hydroxy-2-(methylamino)ethyl]benzene-1,2-diol",
    melatonin: "N-[2-(5-methoxy-1H-indol-3-yl)ethyl]acetamide", capsaicin: "(6E)-N-[(4-hydroxy-3-methoxyphenyl)methyl]-8-methylnon-6-enamide",
    quinine: "(R)-(6-methoxyquinolin-4-yl)[(2S,4S,5R)-5-ethenyl-1-azabicyclo[2.2.2]octan-2-yl]methanol",
    cocaine: "methyl (1R,2R,3S,5S)-3-(benzoyloxy)-8-methyl-8-azabicyclo[3.2.1]octane-2-carboxylate",
    lidocaine: "2-(diethylamino)-N-(2,6-dimethylphenyl)acetamide", benzocaine: "ethyl 4-aminobenzoate", warfarin: "4-hydroxy-3-(3-oxo-1-phenylbutyl)-2H-chromen-2-one",
    metformin: "smiles:CN(C)C(=N)NC(N)=N", sildenafil: "smiles:CCCC1=NN(C)C2=C1N=C(NC2=O)C1=CC(=CC=C1OCC)S(=O)(=O)N1CCN(C)CC1",
    atorvastatin: "(3R,5R)-7-[2-(4-fluorophenyl)-3-phenyl-4-(phenylcarbamoyl)-5-(propan-2-yl)-1H-pyrrol-1-yl]-3,5-dihydroxyheptanoic acid",
    omeprazole: "6-methoxy-2-[(4-methoxy-3,5-dimethylpyridin-2-yl)methanesulfinyl]-1H-benzimidazole",
    fluoxetine: "N-methyl-3-phenyl-3-[4-(trifluoromethyl)phenoxy]propan-1-amine", diazepam: "7-chloro-1-methyl-5-phenyl-1,3-dihydro-2H-1,4-benzodiazepin-2-one",
    thalidomide: "2-(2,6-dioxopiperidin-3-yl)isoindole-1,3-dione", sucrose: "beta-D-fructofuranosyl alpha-D-glucopyranoside",
    limonene: "1-methyl-4-(prop-1-en-2-yl)cyclohex-1-ene", carvone: "2-methyl-5-(prop-1-en-2-yl)cyclohex-2-en-1-one",
    "penicillin G": "(2S,5R,6R)-3,3-dimethyl-7-oxo-6-[(2-phenylacetyl)amino]-4-thia-1-azabicyclo[3.2.0]heptane-2-carboxylic acid",
    amoxicillin: "(2S,5R,6R)-6-[[(2R)-2-amino-2-(4-hydroxyphenyl)acetyl]amino]-3,3-dimethyl-7-oxo-4-thia-1-azabicyclo[3.2.0]heptane-2-carboxylic acid",
};
exports.COMMON = {
    THF: "oxolane", "2-MeTHF": "2-methyloxolane", DCM: "dichloromethane", CH2Cl2: "dichloromethane", CHCl3: "trichloromethane",
    DCE: "1,2-dichloroethane", DMF: "N,N-dimethylformamide", DMAc: "N,N-dimethylacetamide", DMSO: "dimethyl sulfoxide",
    MeCN: "acetonitrile", ACN: "acetonitrile", EtOAc: "ethyl acetate", Et2O: "ethoxyethane", MTBE: "2-methoxy-2-methylpropane",
    MeOH: "methanol", EtOH: "ethanol", iPrOH: "propan-2-ol", IPA: "propan-2-ol", nBuOH: "butan-1-ol", tBuOH: "2-methylpropan-2-ol",
    TFE: "2,2,2-trifluoroethanol", HFIP: "1,1,1,3,3,3-hexafluoropropan-2-ol", DME: "1,2-dimethoxyethane", NMP: "1-methylpyrrolidin-2-one",
    HMPA: "N,N,N',N',N'',N''-hexamethylphosphoric triamide", AcOH: "acetic acid", HOAc: "acetic acid", PhMe: "toluene",
    DMAP: "N,N-dimethylpyridin-4-amine", DBU: "2,3,4,6,7,8,9,10-octahydropyrimido[1,2-a]azepine",
    DBN: "2,3,4,6,7,8-hexahydropyrrolo[1,2-a]pyrimidine", DABCO: "1,4-diazabicyclo[2.2.2]octane",
    Et3N: "N,N-diethylethanamine", TEA: "N,N-diethylethanamine", DIPEA: "N-ethyl-N-(propan-2-yl)propan-2-amine",
    DIEA: "N-ethyl-N-(propan-2-yl)propan-2-amine", iPr2NEt: "N-ethyl-N-(propan-2-yl)propan-2-amine",
    TMEDA: "N,N,N',N'-tetramethylethane-1,2-diamine", TEMPO: "smiles:CC1(C)CCCC(C)(C)N1[O]",
    TFA: "trifluoroacetic acid", TFAA: "trifluoroacetic anhydride", TfOH: "trifluoromethanesulfonic acid",
    Tf2O: "trifluoromethanesulfonic anhydride", TsOH: "4-methylbenzenesulfonic acid", pTsOH: "4-methylbenzenesulfonic acid",
    TsCl: "4-methylbenzenesulfonyl chloride", MsCl: "methanesulfonyl chloride", Ac2O: "acetic anhydride", AcCl: "acetyl chloride",
    Boc2O: "di-tert-butyl dicarbonate", NBS: "1-bromopyrrolidine-2,5-dione", NCS: "1-chloropyrrolidine-2,5-dione",
    NIS: "1-iodopyrrolidine-2,5-dione", NHS: "1-hydroxypyrrolidine-2,5-dione", mCPBA: "3-chlorobenzenecarboperoxoic acid",
    DCC: "N,N'-dicyclohexylmethanediimine", DIC: "N,N'-di(propan-2-yl)methanediimine",
    EDC: "3-(ethyliminomethylideneamino)-N,N-dimethylpropan-1-amine", CDI: "di(imidazol-1-yl)methanone", HOBt: "1H-benzotriazol-1-ol",
    DEAD: "diethyl diazene-1,2-dicarboxylate", DIAD: "dipropan-2-yl diazene-1,2-dicarboxylate", PPh3: "triphenylphosphane",
    TPPO: "triphenylphosphine oxide", TBAF: "tetrabutylammonium fluoride", TBAB: "tetrabutylammonium bromide", TBAI: "tetrabutylammonium iodide",
    TMSCl: "chloro(trimethyl)silane", TBSCl: "tert-butyl(chloro)dimethylsilane", TBDMSCl: "tert-butyl(chloro)dimethylsilane",
    TMSOTf: "trimethylsilyl trifluoromethanesulfonate", LDA: "lithium di(propan-2-yl)azanide", LiHMDS: "lithium bis(trimethylsilyl)azanide",
    NaHMDS: "sodium bis(trimethylsilyl)azanide", KHMDS: "potassium bis(trimethylsilyl)azanide", nBuLi: "butyllithium",
    tBuLi: "tert-butyllithium", sBuLi: "sec-butyllithium", DIBAL: "diisobutylaluminium hydride", "DIBAL-H": "diisobutylaluminium hydride",
    LiAlH4: "lithium aluminium hydride", LAH: "lithium aluminium hydride", NaBH4: "sodium borohydride", NaBH3CN: "sodium cyanoborohydride",
    STAB: "sodium triacetoxyborohydride", DDQ: "4,5-dichloro-3,6-dioxocyclohexa-1,4-diene-1,2-dicarbonitrile",
    HBpin: "4,4,5,5-tetramethyl-1,3,2-dioxaborolane", B2pin2: "4,4,4',4',5,5,5',5'-octamethyl-2,2'-bi(1,3,2-dioxaborolane)",
    "Hantzsch ester": "diethyl 2,6-dimethyl-1,4-dihydropyridine-3,5-dicarboxylate", Tris: "2-amino-2-(hydroxymethyl)propane-1,3-diol",
    "tris(hydroxymethyl)aminomethane": "2-amino-2-(hydroxymethyl)propane-1,3-diol",
    HEPES: "2-[4-(2-hydroxyethyl)piperazin-1-yl]ethanesulfonic acid", DTT: "1,4-bis(sulfanyl)butane-2,3-diol",
    "Et3N·HCl": "smiles:CC[NH+](CC)CC.[Cl-]", MeMgBr: "smiles:C[Mg]Br", EtMgBr: "smiles:CC[Mg]Br",
    PhMgBr: "smiles:Br[Mg]c1ccccc1", iPrMgCl: "smiles:CC(C)[Mg]Cl", MeLi: "smiles:[Li]C", PhLi: "smiles:[Li]c1ccccc1",
    LiTMP: "smiles:[Li+].CC1(C)CCCC(C)(C)[N-]1", KOtBu: "smiles:[K+].CC(C)(C)[O-]", NaOtBu: "smiles:[Na+].CC(C)(C)[O-]",
    NaOMe: "smiles:[Na+].C[O-]", NaOEt: "smiles:[Na+].CC[O-]", NaOAc: "smiles:[Na+].CC([O-])=O", KOAc: "smiles:[K+].CC([O-])=O",
    NH4OAc: "smiles:[NH4+].CC([O-])=O", TMSCN: "smiles:C[Si](C)(C)C#N", TMSCHN2: "smiles:C[Si](C)(C)C=[N+]=[N-]", CH2N2: "smiles:C=[N+]=[N-]",
    Et3SiH: "smiles:CC[SiH](CC)CC", Bu3SnH: "smiles:CCCC[SnH](CCCC)CCCC", AIBN: "smiles:CC(C)(C#N)N=NC(C)(C)C#N", BPO: "dibenzoyl peroxide",
    DAST: "smiles:CCN(CC)S(F)(F)F", "Burgess reagent": "smiles:COC(=O)[N-]S(=O)(=O)[N+](CC)(CC)CC",
    "Lawesson's reagent": "smiles:COc1ccc(cc1)P1(=S)SP(=S)(S1)c1ccc(OC)cc1",
    PCC: "smiles:c1cc[nH+]cc1.[O-][Cr](Cl)(=O)=O", PDC: "smiles:c1cc[nH+]cc1.c1cc[nH+]cc1.[O-][Cr](=O)(=O)O[Cr]([O-])(=O)=O",
    DMP: "smiles:CC(=O)OI1(OC(C)=O)(OC(C)=O)OC(=O)c2ccccc12", "Dess-Martin periodinane": "smiles:CC(=O)OI1(OC(C)=O)(OC(C)=O)OC(=O)c2ccccc12",
    IBX: "smiles:OI1(=O)OC(=O)c2ccccc12", TPAP: "smiles:CCC[N+](CCC)(CCC)CCC.[O-][Ru](=O)(=O)=O", NMO: "smiles:C[N+]1([O-])CCOCC1",
    HATU: "smiles:CN(C)C(=[N+](C)C)N1N=[N+]([O-])C2=C1C=CC=N2.F[P-](F)(F)(F)(F)F",
    HBTU: "smiles:CN(C)C(=[N+](C)C)ON1N=NC2=CC=CC=C21.F[P-](F)(F)(F)(F)F",
    TBTU: "smiles:CN(C)C(=[N+](C)C)ON1N=NC2=CC=CC=C21.F[B-](F)(F)F",
    PyBOP: "smiles:C1CCN(C1)[P+](N1CCCC1)(N1CCCC1)ON1N=NC2=CC=CC=C21.F[P-](F)(F)(F)(F)F", HOAt: "smiles:ON1N=NC2=C1N=CC=C2",
    T3P: "smiles:CCCP1(=O)OP(=O)(CCC)OP(=O)(CCC)O1", EDCI: "3-(ethyliminomethylideneamino)-N,N-dimethylpropan-1-amine",
    TBDPSCl: "smiles:CC(C)(C)[Si](Cl)(c1ccccc1)c1ccccc1", TIPSCl: "smiles:CC(C)[Si](Cl)(C(C)C)C(C)C", TESCl: "smiles:CC[Si](Cl)(CC)CC",
    TBSOTf: "smiles:CC(C)(C)[Si](C)(C)OS(=O)(=O)C(F)(F)F", TIPSOTf: "smiles:CC(C)[Si](OS(=O)(=O)C(F)(F)F)(C(C)C)C(C)C",
    "Fmoc-Cl": "smiles:ClC(=O)OCC1c2ccccc2-c2ccccc12", "Cbz-Cl": "benzyl carbonochloridate", BnBr: "(bromomethyl)benzene",
    BnCl: "(chloromethyl)benzene", MOMCl: "chloro(methoxy)methane", SEMCl: "smiles:C[Si](C)(C)CCOCCl",
    MeI: "iodomethane", CH3I: "iodomethane", EtI: "iodoethane", EtBr: "bromoethane", Me2SO4: "dimethyl sulfate",
    MeOTf: "methyl trifluoromethanesulfonate", CCl4: "tetrachloromethane", CBr4: "tetrabromomethane", CHBr3: "tribromomethane",
    SiCl4: "tetrachlorosilane",
    "proton sponge": "N1,N1,N8,N8-tetramethylnaphthalene-1,8-diamine", NMI: "1-methyl-1H-imidazole", NMM: "4-methylmorpholine",
    "2,6-lutidine": "2,6-dimethylpyridine", collidine: "2,4,6-trimethylpyridine",
    TBHP: "2-methylpropane-2-peroxol", DTBP: "di-tert-butyl peroxide", DCP: "bis(2-phenylpropan-2-yl) peroxide",
    BHT: "2,6-di-tert-butyl-4-methylphenol", NHPI: "2-hydroxy-1H-isoindole-1,3(2H)-dione", TBN: "tert-butyl nitrite", tBuONO: "=TBN",
    PIDA: "smiles:CC(=O)OI(OC(C)=O)c1ccccc1", "PhI(OAc)2": "=PIDA", BAIB: "=PIDA",
    PIFA: "smiles:FC(F)(F)C(=O)OI(OC(=O)C(F)(F)F)c1ccccc1", "PhI(OCOCF3)2": "=PIFA", "PhI(TFA)2": "=PIFA",
    TCCA: "1,3,5-trichloro-1,3,5-triazinane-2,4,6-trione", DCDMH: "1,3-dichloro-5,5-dimethylimidazolidine-2,4-dione",
    DBDMH: "1,3-dibromo-5,5-dimethylimidazolidine-2,4-dione", NFSI: "N-(benzenesulfonyl)-N-fluorobenzenesulfonamide",
    TMSN3: "smiles:C[Si](C)(C)N=[N+]=[N-]", TsN3: "4-methylbenzenesulfonyl azide", TfN3: "trifluoromethanesulfonyl azide",
    TsNH2: "4-methylbenzenesulfonamide", TsNHNH2: "4-methylbenzenesulfonohydrazide", NsCl: "2-nitrobenzenesulfonyl chloride",
    oNsCl: "=NsCl", pNsCl: "4-nitrobenzenesulfonyl chloride",
    HCl: "smiles:Cl", HBr: "smiles:Br", HI: "smiles:I", HF: "smiles:F", H2SO4: "smiles:OS(=O)(=O)O", HNO3: "smiles:O[N+]([O-])=O",
    H3PO4: "smiles:OP(O)(O)=O", H2O: "smiles:O", H2O2: "smiles:OO", NH3: "smiles:N", D2O: "smiles:[2H]O[2H]",
    CDCl3: "smiles:[2H]C(Cl)(Cl)Cl", "DMSO-d6": "smiles:[2H]C([2H])([2H])S(=O)C([2H])([2H])[2H]", CD3OD: "smiles:[2H]OC([2H])([2H])[2H]",
    C6D6: "smiles:[2H]c1c([2H])c([2H])c([2H])c([2H])c1[2H]", CD3CN: "smiles:[2H]C([2H])([2H])C#N",
    NaOH: "smiles:[Na+].[OH-]", KOH: "smiles:[K+].[OH-]", LiOH: "smiles:[Li+].[OH-]", NaH: "smiles:[Na+].[H-]", KH: "smiles:[K+].[H-]",
    CaH2: "smiles:[Ca+2].[H-].[H-]", NaNH2: "smiles:[Na+].[NH2-]",
    K2CO3: "smiles:[K+].[K+].[O-]C([O-])=O", Na2CO3: "smiles:[Na+].[Na+].[O-]C([O-])=O", Cs2CO3: "smiles:[Cs+].[Cs+].[O-]C([O-])=O",
    NaHCO3: "smiles:[Na+].OC([O-])=O", KHCO3: "smiles:[K+].OC([O-])=O", K3PO4: "smiles:[K+].[K+].[K+].[O-]P([O-])([O-])=O",
    Na2SO4: "smiles:[Na+].[Na+].[O-]S([O-])(=O)=O", MgSO4: "smiles:[Mg+2].[O-]S([O-])(=O)=O",
    NaCl: "smiles:[Na+].[Cl-]", KCl: "smiles:[K+].[Cl-]", LiCl: "smiles:[Li+].[Cl-]", NH4Cl: "smiles:[NH4+].[Cl-]", CaCl2: "smiles:[Ca+2].[Cl-].[Cl-]",
    NaBr: "smiles:[Na+].[Br-]", KBr: "smiles:[K+].[Br-]", LiBr: "smiles:[Li+].[Br-]", NaI: "smiles:[Na+].[I-]", KI: "smiles:[K+].[I-]",
    KF: "smiles:[K+].[F-]", CsF: "smiles:[Cs+].[F-]", NaN3: "smiles:[Na+].[N-]=[N+]=[N-]", NaNO2: "smiles:[Na+].[O-]N=O",
    NaCN: "smiles:[Na+].[C-]#N", KCN: "smiles:[K+].[C-]#N", NaOCl: "smiles:[Na+].[O-]Cl", NaIO4: "smiles:[Na+].[O-]I(=O)(=O)=O",
    KMnO4: "smiles:[K+].[O-][Mn](=O)(=O)=O", Na2S2O3: "smiles:[Na+].[Na+].[O-]S([O-])(=O)=S", NaHSO3: "smiles:[Na+].OS([O-])=O",
    SOCl2: "smiles:O=S(Cl)Cl", SO2Cl2: "smiles:O=S(=O)(Cl)Cl", POCl3: "smiles:O=P(Cl)(Cl)Cl", PCl3: "smiles:ClP(Cl)Cl",
    PCl5: "smiles:ClP(Cl)(Cl)(Cl)Cl", PBr3: "smiles:BrP(Br)Br", "(COCl)2": "oxalyl dichloride", BBr3: "smiles:BrB(Br)Br", BF3: "smiles:FB(F)F",
    "BF3·OEt2": "smiles:FB(F)F.CCOCC", AlCl3: "smiles:Cl[Al](Cl)Cl", FeCl3: "smiles:Cl[Fe](Cl)Cl", TiCl4: "smiles:Cl[Ti](Cl)(Cl)Cl",
    ZnCl2: "smiles:Cl[Zn]Cl", SnCl2: "smiles:Cl[Sn]Cl", SnCl4: "smiles:Cl[Sn](Cl)(Cl)Cl", CuI: "smiles:[Cu]I", CuBr: "smiles:[Cu]Br",
    CuCl: "smiles:[Cu]Cl", CuCN: "smiles:[Cu+].[C-]#N", CuSO4: "smiles:[Cu+2].[O-]S([O-])(=O)=O", "Cu(OAc)2": "smiles:CC(=O)O[Cu]OC(C)=O",
    "Cu(OTf)2": "smiles:FC(F)(F)S(=O)(=O)O[Cu]OS(=O)(=O)C(F)(F)F", AgNO3: "smiles:[Ag+].[O-][N+]([O-])=O", Ag2O: "smiles:[Ag]O[Ag]",
    Ag2CO3: "smiles:[Ag+].[Ag+].[O-]C([O-])=O", OsO4: "smiles:O=[Os](=O)(=O)=O", CrO3: "smiles:O=[Cr](=O)=O", MnO2: "smiles:O=[Mn]=O",
    SeO2: "smiles:O=[Se]=O", I2: "smiles:II", Br2: "smiles:BrBr", Cl2: "smiles:ClCl", H2: "smiles:[HH]", O2: "smiles:O=O", N2: "smiles:N#N",
    O3: "smiles:[O-][O+]=O", CO2: "smiles:O=C=O", SO2: "smiles:O=S=O", SO3: "smiles:O=S(=O)=O", CS2: "smiles:S=C=S",
    N2O: "smiles:[N-]=[N+]=O", COCl2: "smiles:O=C(Cl)Cl", BCl3: "smiles:ClB(Cl)Cl", SF6: "smiles:FS(F)(F)(F)(F)F",
    "Pd(PPh3)4": "smiles:[Pd](P(c1ccccc1)(c1ccccc1)c1ccccc1)(P(c1ccccc1)(c1ccccc1)c1ccccc1)(P(c1ccccc1)(c1ccccc1)c1ccccc1)P(c1ccccc1)(c1ccccc1)c1ccccc1",
    "Pd(OAc)2": "smiles:CC(=O)O[Pd]OC(C)=O", PdCl2: "smiles:Cl[Pd]Cl",
    "PdCl2(PPh3)2": "smiles:Cl[Pd](Cl)(P(c1ccccc1)(c1ccccc1)c1ccccc1)P(c1ccccc1)(c1ccccc1)c1ccccc1",
    "Pd(PPh3)2Cl2": "smiles:Cl[Pd](Cl)(P(c1ccccc1)(c1ccccc1)c1ccccc1)P(c1ccccc1)(c1ccccc1)c1ccccc1",
    "Pd2(dba)3": "smiles:[Pd].[Pd].O=C(/C=C/c1ccccc1)/C=C/c1ccccc1.O=C(/C=C/c1ccccc1)/C=C/c1ccccc1.O=C(/C=C/c1ccccc1)/C=C/c1ccccc1",
    "Pd(dba)2": "smiles:[Pd].O=C(/C=C/c1ccccc1)/C=C/c1ccccc1.O=C(/C=C/c1ccccc1)/C=C/c1ccccc1",
    "Ni(cod)2": "smiles:[Ni].C1/C=C\\CC/C=C\\C1.C1/C=C\\CC/C=C\\C1",
    "Grubbs catalyst": "smiles:Cl[Ru](Cl)(=Cc1ccccc1)(P(C1CCCCC1)(C1CCCCC1)C1CCCCC1)P(C1CCCCC1)(C1CCCCC1)C1CCCCC1",
    "Grubbs I": "smiles:Cl[Ru](Cl)(=Cc1ccccc1)(P(C1CCCCC1)(C1CCCCC1)C1CCCCC1)P(C1CCCCC1)(C1CCCCC1)C1CCCCC1",
    "Grubbs II": "smiles:Cc1cc(C)c(c(C)c1)N1CCN(C1=[Ru](Cl)(Cl)(=Cc1ccccc1)P(C1CCCCC1)(C1CCCCC1)C1CCCCC1)c1c(C)cc(C)cc1C",
    "Hoveyda-Grubbs II": "smiles:CC(C)Oc1ccccc1C=[Ru](Cl)(Cl)=C1N(CCN1c1c(C)cc(C)cc1C)c1c(C)cc(C)cc1C",
    "tetrakis(triphenylphosphine)palladium(0)": "=Pd(PPh3)4", "bis(triphenylphosphine)palladium(II) dichloride": "=PdCl2(PPh3)2",
    "tris(dibenzylideneacetone)dipalladium(0)": "=Pd2(dba)3", "bis(dibenzylideneacetone)palladium(0)": "=Pd(dba)2",
    "bis(cycloocta-1,5-diene)nickel(0)": "=Ni(cod)2",
    "Wilkinson's catalyst": "smiles:Cl[Rh](P(c1ccccc1)(c1ccccc1)c1ccccc1)(P(c1ccccc1)(c1ccccc1)c1ccccc1)P(c1ccccc1)(c1ccccc1)c1ccccc1",
    "Pd(dppf)Cl2": "smiles:Cl[Pd]1(Cl)P(C2=CC=CC=C2)(C2=CC=CC=C2)[C-]2C=CC=C2.[C-]2(C=CC=C2)P1(C1=CC=CC=C1)C1=CC=CC=C1.[Fe+2]",
    "PdCl2(dppf)": "=Pd(dppf)Cl2", "Pd(PtBu3)2": "smiles:CC(C)(C)P(C(C)(C)C)(C(C)(C)C)[Pd]P(C(C)(C)C)(C(C)(C)C)C(C)(C)C",
    "Pd(P(tBu)3)2": "=Pd(PtBu3)2",
    "Rh2(OAc)4": "smiles:[Rh]%10%13%14(OC(C)=O%11)OC(C)=O%12.[Rh]%10%11%12(OC(C)=O%13)OC(C)=O%14",
    "Rh2(TFA)4": "smiles:[Rh]%10%13%14(OC(=O%11)C(F)(F)F)OC(=O%12)C(F)(F)F.[Rh]%10%11%12(OC(=O%13)C(F)(F)F)OC(=O%14)C(F)(F)F",
    "Rh2(oct)4": "smiles:[Rh]%10%13%14(OC(=O%11)CCCCCCC)OC(=O%12)CCCCCCC.[Rh]%10%11%12(OC(=O%13)CCCCCCC)OC(=O%14)CCCCCCC",
    "Rh2(piv)4": "smiles:[Rh]%10%13%14(OC(=O%11)C(C)(C)C)OC(=O%12)C(C)(C)C.[Rh]%10%11%12(OC(=O%13)C(C)(C)C)OC(=O%14)C(C)(C)C",
    "Rh2(OPiv)4": "=Rh2(piv)4",
    "Rh2(esp)2": "smiles:[Rh]%10%11%12%13%14.[Rh]%10%15%16%17%18.O%11C(=O%15)C(C)(C)Cc1cccc(c1)CC(C)(C)C(O%16)=O%12.O%13C(=O%17)C(C)(C)Cc1cccc(c1)CC(C)(C)C(O%18)=O%14",
    "[Rh(cod)Cl]2": "smiles:Cl1[Rh]Cl[Rh]1.C1/C=C\\CC/C=C\\C1.C1/C=C\\CC/C=C\\C1",
    "[Ir(cod)Cl]2": "smiles:Cl1[Ir]Cl[Ir]1.C1/C=C\\CC/C=C\\C1.C1/C=C\\CC/C=C\\C1",
    "[Cp*RhCl2]2": "smiles:C[C-]1C(C)=C(C)C(C)=C1C.C[C-]1C(C)=C(C)C(C)=C1C.Cl[Rh+]1Cl[Rh+](Cl)Cl1",
    "[Cp*IrCl2]2": "smiles:C[C-]1C(C)=C(C)C(C)=C1C.C[C-]1C(C)=C(C)C(C)=C1C.Cl[Ir+]1Cl[Ir+](Cl)Cl1",
    CuTC: "smiles:[Cu]OC(=O)C1=CC=CS1", "[Cu(MeCN)4]PF6": "smiles:CC#N[Cu+](N#CC)(N#CC)N#CC.F[P-](F)(F)(F)(F)F",
    "Cu(MeCN)4PF6": "=[Cu(MeCN)4]PF6", "Mn(CO)5Br": "smiles:Br[Mn](=C=O)(=C=O)(=C=O)(=C=O)=C=O",
    "Co(acac)2": "smiles:CC1=CC(C)=O[Co]2(O1)OC(C)=CC(C)=O2", "Ni(acac)2": "smiles:CC1=CC(C)=O[Ni]2(O1)OC(C)=CC(C)=O2",
    "Cu(acac)2": "smiles:CC1=CC(C)=O[Cu]2(O1)OC(C)=CC(C)=O2", "Fe(acac)3": "smiles:CC1=CC(C)=O[Fe]23(O1)(OC(C)=CC(C)=O2)OC(C)=CC(C)=O3",
    "Jacobsen's catalyst": "smiles:[C@H]12[N]3[Mn]4(Cl)([N]([C@@H]1CCCC2)=CC1=CC(C(C)(C)C)=CC(C(C)(C)C)=C1O4)OC1=C(C=3)C=C(C(C)(C)C)C=C1C(C)(C)C",
    TREN: "N1,N1-bis(2-aminoethyl)ethane-1,2-diamine", Me6TREN: "N1,N1-bis[2-(dimethylamino)ethyl]-N2,N2-dimethylethane-1,2-diamine",
    TPA: "1-(pyridin-2-yl)-N,N-bis(pyridin-2-ylmethyl)methanamine", TPMA: "=TPA", en: "ethane-1,2-diamine",
    dien: "N1-(2-aminoethyl)ethane-1,2-diamine", trien: "N1,N2-bis(2-aminoethyl)ethane-1,2-diamine",
    tetren: "N1-(2-aminoethyl)-N2-{2-[(2-aminoethyl)amino]ethyl}ethane-1,2-diamine",
    PMDETA: "N1-[2-(dimethylamino)ethyl]-N1,N2,N2-trimethylethane-1,2-diamine",
    HMTETA: "N1,N2-bis[2-(dimethylamino)ethyl]-N1,N2-dimethylethane-1,2-diamine",
    cyclam: "1,4,8,11-tetraazacyclotetradecane", cyclen: "1,4,7,10-tetraazacyclododecane", TACN: "1,4,7-triazonane",
    Me3TACN: "1,4,7-trimethyl-1,4,7-triazonane", py: "pyridine", Hpz: "1H-pyrazole", Im: "1H-imidazole", MeIm: "1-methyl-1H-imidazole",
    bpy: "2,2'-bipyridine", bipy: "=bpy", dtbbpy: "4,4'-di-tert-butyl-2,2'-bipyridine", dmbpy: "4,4'-dimethyl-2,2'-bipyridine",
    "4,4'-dmbpy": "=dmbpy", "5,5'-dmbpy": "5,5'-dimethyl-2,2'-bipyridine", "6,6'-dmbpy": "6,6'-dimethyl-2,2'-bipyridine",
    dcbpy: "[2,2'-bipyridine]-4,4'-dicarboxylic acid", dmcbpy: "dimethyl [2,2'-bipyridine]-4,4'-dicarboxylate",
    bpz: "2,2'-bipyrazine", bpm: "2,2'-bipyrimidine", tpy: "2,2':6',2''-terpyridine", terpy: "=tpy",
    phen: "1,10-phenanthroline", neocuproine: "2,9-dimethyl-1,10-phenanthroline", dmphen: "=neocuproine",
    bathophenanthroline: "4,7-diphenyl-1,10-phenanthroline", Bphen: "=bathophenanthroline",
    bathocuproine: "2,9-dimethyl-4,7-diphenyl-1,10-phenanthroline", Me4phen: "3,4,7,8-tetramethyl-1,10-phenanthroline",
    phendione: "1,10-phenanthroline-5,6-dione",
    ppy: "2-phenylpyridine", dfppy: "2-(2,4-difluorophenyl)pyridine", "dF(CF3)ppy": "2-(2,4-difluorophenyl)-5-(trifluoromethyl)pyridine",
    piq: "1-phenylisoquinoline", btp: "2-(1-benzothiophen-2-yl)pyridine",
    PCy3: "tricyclohexylphosphane", "P(tBu)3": "tri-tert-butylphosphane", PtBu3: "=P(tBu)3", PMe3: "trimethylphosphane",
    "P(OPh)3": "triphenyl phosphite", dppm: "methylenebis(diphenylphosphane)", dppe: "ethane-1,2-diylbis(diphenylphosphane)",
    dppp: "propane-1,3-diylbis(diphenylphosphane)", dppb: "butane-1,4-diylbis(diphenylphosphane)",
    dppbz: "1,2-phenylenebis(diphenylphosphane)", dppf: "1,1'-bis(diphenylphosphanyl)ferrocene",
    dcpe: "ethane-1,2-diylbis(dicyclohexylphosphane)", dmpe: "ethane-1,2-diylbis(dimethylphosphane)", depe: "ethane-1,2-diylbis(diethylphosphane)",
    DPEphos: "[oxydi(2,1-phenylene)]bis(diphenylphosphane)",
    Xantphos: "(9,9-dimethylxanthene-4,5-diyl)bis(diphenylphosphane)", BINAP: "[1,1'-binaphthalene]-2,2'-diylbis(diphenylphosphane)",
    SEGPHOS: "(4,4'-bi-1,3-benzodioxole-5,5'-diyl)bis(diphenylphosphane)",
    "DM-SEGPHOS": "(4,4'-bi-1,3-benzodioxole-5,5'-diyl)bis[bis(3,5-dimethylphenyl)phosphane]",
    "MeO-BIPHEP": "(6,6'-dimethoxy[1,1'-biphenyl]-2,2'-diyl)bis(diphenylphosphane)",
    DIOP: "[(2,2-dimethyl-1,3-dioxolane-4,5-diyl)bis(methylene)]bis(diphenylphosphane)",
    "Me-DuPhos": "1,2-bis(2,5-dimethylphospholan-1-yl)benzene", "Et-DuPhos": "1,2-bis(2,5-diethylphospholan-1-yl)benzene",
    "Me-BPE": "1,2-bis(2,5-dimethylphospholan-1-yl)ethane", "Ph-BPE": "1,2-bis(2,5-diphenylphospholan-1-yl)ethane",
    "QuinoxP*": "2,3-bis[tert-butyl(methyl)phosphanyl]quinoxaline",
    XPhos: "dicyclohexyl[2',4',6'-tri(propan-2-yl)biphenyl-2-yl]phosphane", SPhos: "dicyclohexyl(2',6'-dimethoxybiphenyl-2-yl)phosphane",
    RuPhos: "dicyclohexyl[2',6'-di(propan-2-yloxy)[1,1'-biphenyl]-2-yl]phosphane",
    BrettPhos: "dicyclohexyl[3,6-dimethoxy-2',4',6'-tri(propan-2-yl)[1,1'-biphenyl]-2-yl]phosphane",
    tBuXPhos: "di-tert-butyl[2',4',6'-tri(propan-2-yl)[1,1'-biphenyl]-2-yl]phosphane",
    tBuBrettPhos: "di-tert-butyl[3,6-dimethoxy-2',4',6'-tri(propan-2-yl)[1,1'-biphenyl]-2-yl]phosphane",
    JohnPhos: "[1,1'-biphenyl]-2-yl(di-tert-butyl)phosphane", CyJohnPhos: "[1,1'-biphenyl]-2-yl(dicyclohexyl)phosphane",
    MePhos: "dicyclohexyl(2'-methyl[1,1'-biphenyl]-2-yl)phosphane",
    DavePhos: "2'-(dicyclohexylphosphanyl)-N,N-dimethyl[1,1'-biphenyl]-2-amine", "cataCXium A": "butyldi(adamantan-1-yl)phosphane",
    BOX: "2,2'-(propane-2,2-diyl)bis(4,5-dihydro-1,3-oxazole)", "Ph-BOX": "2,2'-(propane-2,2-diyl)bis(4-phenyl-4,5-dihydro-1,3-oxazole)",
    "tBu-BOX": "2,2'-(propane-2,2-diyl)bis(4-tert-butyl-4,5-dihydro-1,3-oxazole)", PyBOX: "2,6-bis(4,5-dihydro-1,3-oxazol-2-yl)pyridine",
    "iPr-PyBOX": "2,6-bis[4-(propan-2-yl)-4,5-dihydro-1,3-oxazol-2-yl]pyridine", "Ph-PyBOX": "2,6-bis(4-phenyl-4,5-dihydro-1,3-oxazol-2-yl)pyridine",
    salen: "smiles:Oc1ccccc1/C=N/CC/N=C/c1ccccc1O", H2salen: "=salen",
    salophen: "smiles:Oc1ccccc1/C=N/c1ccccc1/N=C/c1ccccc1O", H2salophen: "=salophen",
    "Jacobsen's ligand": "2,4-di-tert-butyl-6-[(E)-({(1R,2R)-2-[(E)-(3,5-di-tert-butyl-2-hydroxybenzylidene)amino]cyclohexyl}imino)methyl]phenol",
    acacH: "pentane-2,4-dione", Hacac: "=acacH", acac: "pentane-2,4-dione", hfacH: "1,1,1,5,5,5-hexafluoropentane-2,4-dione",
    Hhfac: "=hfacH", hfac: "=hfacH", tfacH: "1,1,1-trifluoropentane-2,4-dione", Htfac: "=tfacH", tfac: "=tfacH",
    Hdpm: "2,2,6,6-tetramethylheptane-3,5-dione", Hthd: "=Hdpm", thd: "=Hdpm",
    Cp: "cyclopenta-2,4-dien-1-ide", CpH: "cyclopenta-1,3-diene", "Cp*": "1,2,3,4,5-pentamethylcyclopenta-2,4-dien-1-ide",
    "Cp*H": "1,2,3,4,5-pentamethylcyclopenta-1,3-diene", Ind: "1H-inden-1-ide", cod: "cycloocta-1,5-diene",
    nbd: "bicyclo[2.2.1]hepta-2,5-diene", COT: "cycloocta-1,3,5,7-tetraene", dba: "1,5-diphenylpenta-1,4-dien-3-one",
    IMes: "smiles:Cc1cc(C)c(c(C)c1)N1[C]N(C=C1)c1c(C)cc(C)cc1C", IPr: "smiles:CC(C)c1cccc(C(C)C)c1N1[C]N(c2c(C(C)C)cccc2C(C)C)C=C1",
    SIMes: "smiles:Cc1cc(C)c(c(C)c1)N1[C]N(CC1)c1c(C)cc(C)cc1C", SIPr: "smiles:CC(C)c1cccc(C(C)C)c1N1[C]N(c2c(C(C)C)cccc2C(C)C)CC1",
    "IMes·HCl": "1,3-bis(2,4,6-trimethylphenyl)-1H-imidazol-3-ium chloride",
    "IPr·HCl": "1,3-bis[2,6-di(propan-2-yl)phenyl]-1H-imidazol-3-ium chloride",
    "SIMes·HCl": "1,3-bis(2,4,6-trimethylphenyl)-4,5-dihydro-1H-imidazol-3-ium chloride",
    "SIPr·HCl": "1,3-bis[2,6-di(propan-2-yl)phenyl]-4,5-dihydro-1H-imidazol-3-ium chloride",
    "Ir(ppy)3": "smiles:[Ir]123(C4=CC=CC=C4C4=CC=CC=N41)(C1=CC=CC=C1C1=CC=CC=N12)C1=CC=CC=C1C1=CC=CC=N13", "fac-Ir(ppy)3": "=Ir(ppy)3",
    "[Ir(dF(CF3)ppy)2(dtbbpy)]PF6": "smiles:[Ir+]123(C4=CC(F)=CC(F)=C4C4=CC=C(C(F)(F)F)C=N41)(C1=CC(F)=CC(F)=C1C1=CC=C(C(F)(F)F)C=N12)N1=CC=C(C=C1C1=CC(=CC=N13)C(C)(C)C)C(C)(C)C.F[P-](F)(F)(F)(F)F",
    "Ir(dF(CF3)ppy)2(dtbbpy)PF6": "=[Ir(dF(CF3)ppy)2(dtbbpy)]PF6",
    "[Ru(bpy)3]Cl2": "smiles:C12C3=CC=CC=N3[Ru+2]34(N5=CC=CC=C5C5N3=CC=CC=5)(N=1C=CC=C2)N1=C(C2C=CC=CN=24)C=CC=C1.[Cl-].[Cl-]",
    "Ru(bpy)3Cl2": "=[Ru(bpy)3]Cl2",
    "[Ru(bpy)3](PF6)2": "smiles:C12C3=CC=CC=N3[Ru+2]34(N5=CC=CC=C5C5N3=CC=CC=5)(N=1C=CC=C2)N1=C(C2C=CC=CN=24)C=CC=C1.F[P-](F)(F)(F)(F)F.F[P-](F)(F)(F)(F)F",
    "Ru(bpy)3(PF6)2": "=[Ru(bpy)3](PF6)2",
    "4CzIPN": "2,4,5,6-tetra(carbazol-9-yl)benzene-1,3-dicarbonitrile",
    "4DPAIPN": "2,4,5,6-tetrakis(diphenylamino)benzene-1,3-dicarbonitrile",
    "Eosin Y": "2',4',5',7'-tetrabromo-3',6'-dihydroxy-3H-spiro[[2]benzofuran-1,9'-xanthen]-3-one",
    "methylene blue": "3,7-bis(dimethylamino)phenothiazin-5-ium chloride",
    "Mes-Acr+": "10-methyl-9-(2,4,6-trimethylphenyl)acridin-10-ium", "Mes-Acr-Me+": "10-methyl-9-(2,4,6-trimethylphenyl)acridin-10-ium",
    "Fukuzumi catalyst": "10-methyl-9-(2,4,6-trimethylphenyl)acridin-10-ium perchlorate",
    H2TPP: "5,10,15,20-tetraphenylporphyrin", "meso-tetraphenylporphyrin": "5,10,15,20-tetraphenylporphyrin",
    Ala: "L-alanine", Arg: "L-arginine", Asn: "L-asparagine", Asp: "L-aspartic acid", Cys: "L-cysteine", Gln: "L-glutamine",
    Glu: "L-glutamic acid", Gly: "glycine", His: "L-histidine", Ile: "L-isoleucine", Leu: "L-leucine", Lys: "L-lysine",
    Met: "L-methionine", Phe: "L-phenylalanine", Pro: "L-proline", Ser: "L-serine", Thr: "L-threonine", Trp: "L-tryptophan",
    Tyr: "L-tyrosine", Val: "L-valine", Ade: "adenine", Gua: "guanine", Cyt: "cytosine", Thy: "thymine", Ura: "uracil",
    ...DRUG_NAMES,
    "Hünig's base": "N-ethyl-N-(propan-2-yl)propan-2-amine", "Boc anhydride": "di-tert-butyl dicarbonate",
    TPT: "2,4,6-triphenylpyrylium tetrafluoroborate", Selectfluor: "1-(chloromethyl)-4-fluoro-1,4-diazoniabicyclo[2.2.2]octane bis(tetrafluoroborate)",
};
const commonKey = (name) => name.toLowerCase().replace(/[\s‐-―'’ʼ-]/g, "").replace(/[.•∙⋅]/g, "·");
exports.commonKey = commonKey;
const DRUG_KEYS = new Set(Object.keys(DRUG_NAMES));
function citable(key, counts) {
    if (DRUG_KEYS.has(key))
        return false;
    const spelt = formulaOf(key);
    return !spelt || Object.keys({ ...spelt, ...counts }).some((el) => (spelt[el] ?? 0) !== (counts[el] ?? 0));
}
function formulaOf(key) {
    const total = {};
    for (const part of key.split("·")) {
        const lead = /^\d*/.exec(part)[0], stack = [{}];
        const add = (into, el, n) => { into[el] = (into[el] ?? 0) + n; };
        for (const t of part.slice(lead.length).match(/[A-Z][a-z]?\d*|\)\d*|./g) ?? []) {
            const top = stack[stack.length - 1], element = /^([A-Z][a-z]?)(\d*)$/.exec(t);
            if (t === "(")
                stack.push({});
            else if (t[0] === ")" && stack.length > 1) {
                stack.pop();
                for (const [el, n] of Object.entries(top))
                    add(stack[stack.length - 1], el, n * Number(t.slice(1) || 1));
            }
            else if (element && (labels_ts_1.ELEMENTS.has(element[1]) || element[1] === "T"))
                add(top, /^[DT]$/.test(element[1]) ? "H" : element[1], Number(element[2] || 1));
            else
                return undefined;
        }
        if (stack.length !== 1 || !part.slice(lead.length))
            return undefined;
        for (const [el, n] of Object.entries(stack[0]))
            add(total, el, n * Number(lead || 1));
    }
    return total;
}

  };
  defs["cip.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stereoMarks = stereoMarks;
exports.keptHolds = keptHolds;
exports.handOf = handOf;
exports.cipLabels = cipLabels;
const render_ts_1 = require("render.ts");
const labels_ts_1 = require("labels.ts");
const rings_ts_1 = require("rings.ts");
const mass_ts_1 = require("mass.ts");
const axial_ts_1 = require("axial.ts");
const MOST_ATOMS = 1000, MOST_NODES = 10000, MOST_CALLS = 100000, ALL_NODES = 200000, ALL_CALLS = 2000000;
const SYMBOLS = [...labels_ts_1.ELEMENTS];
const symbol = (label) => (label === "D" || label === "T" ? "H" : label);
const numberOf = (label) => SYMBOLS.indexOf(symbol(label)) + 1 || 200;
function chemOf(m) {
    const n = m.atoms.length, z = m.atoms.map((a) => numberOf(a.label)), q = m.atoms.map((a) => a.charge ?? 0);
    const kept = m.bonds.flatMap((b, k) => (b.type !== render_ts_1.HBOND && b.atoms[0] !== b.atoms[1] && b.atoms.every((i) => i >= 0 && i < n) ? [k] : []));
    const order = m.bonds.map((b) => (b.type === 2 || b.type === 3 ? b.type : b.type === render_ts_1.QUADRUPLE ? 4 : 1));
    const used = m.atoms.map(() => 0), single = m.atoms.map(() => 0);
    for (const k of kept)
        for (const i of m.bonds[k].atoms) {
            used[i] += m.bonds[k].type === render_ts_1.AROMATIC ? 1.5 : order[k];
            single[i] += order[k];
        }
    const h = m.atoms.map((a, i) => a.implicitHCount ?? (0, render_ts_1.hydrogens)(a.label, q[i], used[i], a.radical === 1 ? 1 : a.radical ? 2 : 0));
    const arom = kept.filter((k) => m.bonds[k].type === render_ts_1.AROMATIC);
    if (arom.length) {
        const can = [...new Set(arom.flatMap((k) => m.bonds[k].atoms))].filter((i) => (0, render_ts_1.hydrogens)(m.atoms[i].label, q[i], single[i]) - h[i] >= 1).sort((a, b) => Number(z[a] !== 6) - Number(z[b] !== 6));
        (0, rings_ts_1.kekulise)(arom.map((k) => m.bonds[k].atoms), can).forEach((p, j) => { if (p)
            order[arom[j]] = 2; });
    }
    const adj = m.atoms.map(() => []);
    for (const k of kept) {
        const [i, j] = m.bonds[k].atoms;
        adj[i].push({ to: j, bond: k, order: order[k] });
        adj[j].push({ to: i, bond: k, order: order[k] });
    }
    const massNo = m.atoms.map((a) => a.isotope ?? (a.label === "D" ? 2 : a.label === "T" ? 3 : 0));
    const mass = m.atoms.map((a, i) => (0, mass_ts_1.atomMass)(symbol(a.label), massNo[i]) ?? NaN);
    const ring = ringBonds(n, adj, m.bonds.length);
    return { z, massNo, mass, h, q, adj, ring, frac: mancude(z, q, h, adj, ring) };
}
function ringBonds(n, adj, bonds) {
    const ring = new Array(bonds).fill(true), seen = new Array(n).fill(-1), low = new Array(n).fill(0);
    let t = 0;
    for (let s = 0; s < n; s++) {
        if (seen[s] >= 0)
            continue;
        const stack = [[s, -1, 0]];
        seen[s] = low[s] = t++;
        while (stack.length) {
            const top = stack[stack.length - 1], [v, via] = top;
            if (top[2] < adj[v].length) {
                const { to, bond } = adj[v][top[2]++];
                if (bond === via)
                    continue;
                if (seen[to] < 0) {
                    seen[to] = low[to] = t++;
                    stack.push([to, bond, 0]);
                }
                else
                    low[v] = Math.min(low[v], seen[to]);
            }
            else {
                stack.pop();
                if (stack.length) {
                    const u = stack[stack.length - 1][0];
                    low[u] = Math.min(low[u], low[v]);
                    if (low[v] > seen[u])
                        ring[via] = false;
                }
            }
        }
    }
    return ring;
}
function mancude(z, q, h, adj, ring) {
    const n = z.length, type = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        if (!adj[i].some((e) => ring[e.bond]))
            continue;
        let s = h[i], d = 0, other = 0;
        for (const e of adj[i])
            if (e.order === 1)
                s++;
            else if (e.order === 2)
                d++;
            else
                other++;
        if (other)
            continue;
        if ([6, 14, 32].includes(z[i]))
            type[i] = q[i] === 0 && d === 1 && s === 2 ? 1 : q[i] === -1 && !d && s === 3 ? 2 : 0;
        else if ([7, 15, 33].includes(z[i]))
            type[i] = q[i] === 0 && d === 1 && s === 1 ? 1 : q[i] === -1 && !d && s === 2 ? 2 : q[i] === 1 && d === 1 && s === 2 ? 1 : 0;
        else if (z[i] === 8)
            type[i] = q[i] === 1 && d === 1 && s === 1 ? 1 : 0;
    }
    const typedRing = (i) => adj[i].filter((e) => ring[e.bond] && type[e.to]);
    const count = type.map((t, i) => (t ? typedRing(i).length : 0)), queue = type.flatMap((t, i) => (t && count[i] <= 1 ? [i] : []));
    while (queue.length) {
        const i = queue.shift();
        if (!type[i])
            continue;
        type[i] = 0;
        for (const e of adj[i])
            if (ring[e.bond] && type[e.to] && --count[e.to] === 1)
                queue.push(e.to);
    }
    const part = new Array(n).fill(0);
    let parts = 0;
    for (let s = 0; s < n; s++) {
        if (!type[s] || part[s])
            continue;
        part[s] = ++parts;
        for (const stack = [s]; stack.length;)
            for (const e of adj[stack.pop()])
                if (ring[e.bond] && type[e.to] && !part[e.to]) {
                    part[e.to] = parts;
                    stack.push(e.to);
                }
    }
    const frac = new Array(n).fill(undefined);
    if (!parts)
        return frac;
    const sum = new Array(parts + 1).fill(0), size = new Array(parts + 1).fill(0), anion = new Array(parts + 1).fill(false);
    for (let i = 0; i < n; i++) {
        if (!part[i])
            continue;
        const near = adj[i].filter((e) => part[e.to] === part[i]);
        if (near.length > 1)
            frac[i] = near.reduce((t, e) => t + z[e.to], 0) / near.length;
        if (type[i] === 2)
            anion[part[i]] = true;
        size[part[i]]++;
        for (const e of near)
            if (e.order > 1)
                sum[part[i]] += (e.order - 1) * z[e.to];
    }
    for (let i = 0; i < n; i++)
        if (part[i] && anion[part[i]] && size[part[i]] > 1)
            frac[i] = sum[part[i]] / size[part[i]];
    return frac;
}
const EPS = 1e-3;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a) => { const l = Math.hypot(...a); return l > 1e-6 ? [a[0] / l, a[1] / l, a[2] / l] : undefined; };
function sector(v1, v2, u) {
    const sin1 = v1[0] * v2[1] - v1[1] * v2[0], sin2 = v1[0] * u[1] - v1[1] * u[0];
    if (Math.abs(sin1) < EPS)
        return Math.abs(sin2) < EPS ? undefined : sin2 > 0 ? 4 : 8;
    return sin1 * sin2 < -EPS * EPS || dot(v1, u) < dot(v1, v2) ? 2 : 1;
}
function turn(v1, v2, v3) {
    if (dot(v1, v2) > 0.997 || dot(v1, v3) > 0.997 || dot(v2, v3) > 0.997)
        return undefined;
    const r = (v1[0] - v3[0]) * (v2[1] - v3[1]) - (v1[1] - v3[1]) * (v2[0] - v3[0]);
    return r > EPS ? 1 : r < -EPS ? -1 : undefined;
}
const CENTRES = [
    ["C", 0, 3, 0, false], ["C", 0, 4, 0, false], ["Si", 0, 3, 0, false], ["Si", 0, 4, 0, false], ["As", 0, 4, 0, false], ["B", -1, 4, 0, false],
    ["N", 1, 3, 0, false], ["N", 1, 4, 0, false], ["N", 0, 4, 1, false], ["N", 0, 3, 0, true], ["S", 0, 4, 2, false], ["S", 1, 3, 0, true],
    ["S", 1, 4, 1, false], ["S", 0, 3, 1, true], ["P", 0, 3, 0, true], ["P", 1, 4, 0, false], ["P", 0, 4, 1, false],
];
function pyramid(m, i, near, dirOf, lone) {
    const pureH = (j) => m.atoms[j].label === "H" && !m.atoms[j].isotope;
    const order = [...near].sort((a, b) => (pureH(a) ? 1e9 + a : a) - (pureH(b) ? 1e9 + b : b));
    const v = order.map((j) => unit(sub(m.atoms[j].location, m.atoms[i].location))), d = order.map(dirOf), h = order.filter(pureH).length;
    if (!d.some(Boolean) || v.some((x) => !x))
        return undefined;
    const w = v;
    if (order.length === 4) {
        const m1 = d.findIndex(Boolean);
        if (h > 1)
            return undefined;
        let m2 = -1, s1 = -1, s2 = -1;
        for (const [o, a, b] of [[1, 2, 3], [2, 1, 3], [3, 1, 2]]) {
            const x = sector(w[m1], w[(m1 + o) % 4], w[(m1 + a) % 4]), y = sector(w[m1], w[(m1 + o) % 4], w[(m1 + b) % 4]);
            if (x === undefined || y === undefined)
                return undefined;
            if (x + y === 3 || x + y === 12) {
                m2 = (m1 + o) % 4;
                s1 = (m1 + a) % 4;
                s2 = (m1 + b) % 4;
                break;
            }
        }
        if (m2 < 0 || d[m2] === -d[m1] || d[s1] === d[m1] || d[s2] === d[m1])
            return undefined;
        const last = m1 === 3 || m2 === 3 ? d[m1] : -d[m1], t = turn(w[0], w[1], w[2]);
        if (!t)
            return undefined;
        return last === t ? order : [order[0], order[2], order[1], order[3]];
    }
    if (order.length !== 3)
        return undefined;
    const up = d.filter((x) => x > 0).length, down = d.filter((x) => x < 0).length;
    let mid = -1, flat = true, sense = 1;
    for (let k = 0; k < 3; k++) {
        const x = sector(w[(k + 1) % 3], w[(k + 2) % 3], w[k]);
        if (x === undefined)
            return undefined;
        if (x === 1)
            mid = k;
        if (x === 2)
            flat = false;
    }
    if (mid >= 0) {
        if (d[mid]) {
            if (d[(mid + 1) % 3] === d[mid] || d[(mid + 2) % 3] === d[mid])
                return undefined;
            if (d[mid] > 0)
                sense = -1;
        }
        else {
            const d1 = d[(mid + 1) % 3] || d[(mid + 2) % 3], d2 = d[(mid + 2) % 3];
            if (d2 && d1 !== d2)
                return undefined;
            if (d1 < 0)
                sense = -1;
        }
    }
    else if (!flat) {
        if (up && down)
            return h && !lone ? undefined : fromPoints([...order, -1], w.map((x, k) => [x[0], x[1], d[k]]));
        if (!lone && (up === 3 || down === 3))
            return undefined;
        if (down)
            sense = -1;
    }
    else
        return undefined;
    if (h && !lone)
        return undefined;
    const t = turn(w[0], w[1], w[2]);
    if (!t)
        return undefined;
    return t === sense ? [order[0], order[2], order[1], -1] : [order[0], order[1], order[2], -1];
}
function fromPoints(ids, p, least = 1e-3) {
    const q = p.map(unit);
    if (q.some((x) => !x))
        return undefined;
    const u = q;
    if (u.length === 3)
        u.push([-u[0][0] - u[1][0] - u[2][0], -u[0][1] - u[1][1] - u[2][1], -u[0][2] - u[1][2] - u[2][2]]);
    const vol = dot(sub(u[0], u[3]), cross(sub(u[1], u[3]), sub(u[2], u[3])));
    return Math.abs(vol) < least ? undefined : vol < 0 ? ids : [ids[0], ids[2], ids[1], ids[3]];
}
function stereoMarks(m, i, atoms) {
    return atoms.map((j) => {
        if (j < 0)
            return "h";
        const b = m.bonds.find((x) => x.type !== render_ts_1.HBOND && x.atoms.includes(i) && x.atoms.includes(j));
        return b ? `${b.stereo ?? 0}${b.atoms[0] === i ? ">" : "<"}${b.display ?? ""}` : "?";
    }).join(" ");
}
function keptHolds(m, i, kept) {
    const near = new Set(m.bonds.flatMap((b) => (b.type !== render_ts_1.HBOND && b.atoms.includes(i) ? [b.atoms[0] === i ? b.atoms[1] : b.atoms[0]] : [])));
    const drawn = kept.atoms.filter((j) => j >= 0);
    return kept.atoms.length === 4 && near.size === drawn.length && near.size >= 3 && drawn.every((j) => near.has(j)) && stereoMarks(m, i, kept.atoms) === kept.marks;
}
function sameSide(m, beg, end, nb, ne) {
    const at = (i) => m.atoms[i].location, diff = sub(at(beg), at(end));
    const norm = unit(cross(cross(diff, sub(at(nb), at(beg))), diff)), b = unit(sub(at(nb), at(beg))), e = unit(sub(at(ne), at(end)));
    if (!norm || !b || !e)
        return 0;
    const pb = dot(b, norm), pe = dot(e, norm);
    return Math.abs(pb) < 0.1 || Math.abs(pe) < 0.1 ? 0 : pb * pe > 0 ? 1 : -1;
}
function dirsOf(m, c) {
    const stereo = new Map(), other = new Map();
    m.bonds.forEach((b, k) => {
        const [i, j] = b.atoms, wedge = b.stereo === 1 || b.display === "hollow" ? 1 : b.stereo === 6 ? -1 : 0;
        if (wedge) {
            stereo.set(`${i} ${j}`, wedge);
            other.set(`${j} ${i}`, -wedge);
            return;
        }
        const flat = b.type === 1 && (b.display === "hashed" || b.display === "dashed" ? -1 : b.display === "bold" && !c.ring[k] ? 1 : 0);
        if (flat) {
            other.set(`${i} ${j}`, flat);
            other.set(`${j} ${i}`, flat);
        }
    });
    return { stereo, other };
}
function arrangement(m, i, near, lone, amine, d) {
    const kept = m.atoms[i].kept, depth = (j) => m.atoms[j].location[2] ?? 0;
    if (kept && keptHolds(m, i, kept))
        return kept.atoms;
    if (!amine && near.some((j) => Math.abs(depth(j) - depth(i)) >= 0.2)) {
        const p = fromPoints([...near, -1].slice(0, 4), near.map((j) => sub(m.atoms[j].location, m.atoms[i].location)), 0.1);
        if (p)
            return p;
    }
    const from = (j) => d.stereo.get(`${i} ${j}`) ?? 0;
    return near.some((j) => from(j)) ? pyramid(m, i, near, from, lone) : lone ? undefined : pyramid(m, i, near, (j) => d.other.get(`${i} ${j}`) ?? 0, false);
}
function handOf(m, i, ranked) {
    try {
        const c = chemOf(m), near = c.adj[i].map((e) => e.to);
        if (near.length !== 4 || new Set(near).size !== 4 || m.bonds.some((b) => b.display === "wavy" && b.atoms.includes(i)))
            return undefined;
        const around = arrangement(m, i, near, false, false, dirsOf(m, c)), odd = around && parity(around, ranked);
        return odd === undefined ? undefined : odd ? "S" : "R";
    }
    catch {
        return undefined;
    }
}
function stereoUnits(m, c) {
    const units = [], n = m.atoms.length;
    const wavy = new Set(m.bonds.flatMap((b) => (b.display === "wavy" ? b.atoms : [])));
    const dirs = dirsOf(m, c);
    for (let i = 0; i < n; i++) {
        const near = c.adj[i].map((e) => e.to), doubles = c.adj[i].filter((e) => e.order === 2).length;
        if (wavy.has(i) || near.length < 3 || near.length > 4 || c.adj[i].some((e) => e.order > 2))
            continue;
        const el = symbol(m.atoms[i].label), q = c.q[i];
        const allowed = CENTRES.find(([e, ch, deg, dbl]) => e === el && ch === q && deg === near.length && dbl === doubles);
        if (!allowed)
            continue;
        const around = arrangement(m, i, near, allowed[4], el === "N" && allowed[4], dirs);
        if (around)
            units.push({ kind: "centre", foci: [i], around });
    }
    const cumulated = (i) => c.adj[i].length === 2 && c.adj[i].every((e) => e.order === 2);
    const done = new Set();
    m.bonds.forEach((b, k) => {
        if (b.type !== 2 || b.display === "either" || done.has(k))
            return;
        const chain = [...b.atoms];
        for (const end of [0, 1]) {
            for (let guard = 0; guard < n; guard++) {
                const x = end ? chain[chain.length - 1] : chain[0], prev = end ? chain[chain.length - 2] : chain[1];
                if (!cumulated(x))
                    break;
                const next = c.adj[x].find((e) => e.to !== prev).to;
                if (chain.includes(next))
                    return;
                if (end)
                    chain.push(next);
                else
                    chain.unshift(next);
            }
        }
        const bonds = chain.slice(1).map((x, j) => c.adj[x].find((e) => e.to === chain[j]).bond);
        bonds.forEach((j) => done.add(j));
        const f1 = chain[0], f2 = chain[chain.length - 1];
        if (bonds.length % 2 === 0) {
            const a = axisOf(m, c, chain);
            if (a)
                units.push(a);
            return;
        }
        if (bonds.some((j) => m.bonds[j].display === "either"))
            return;
        if (!chain.every((f) => ["C", "N", "Si", "Ge"].includes(m.atoms[f]?.label)) || wavy.has(f1) || wavy.has(f2))
            return;
        const s1 = c.adj[f1].filter((e) => e.to !== chain[1]), s2 = c.adj[f2].filter((e) => e.to !== chain[chain.length - 2]);
        if (!s1.length || !s2.length || s1.length > 2 || s2.length > 2 || [...s1, ...s2].some((e) => e.order !== 1))
            return;
        if (s1.some((e) => s2.some((x) => x.to === e.to)))
            return;
        const dist = new Map([[f1, 0]]);
        for (const queue = [f1]; queue.length;) {
            const v = queue.shift();
            if (dist.get(v) >= 7 - bonds.length)
                continue;
            for (const e of c.adj[v])
                if (!bonds.includes(e.bond) && !dist.has(e.to)) {
                    dist.set(e.to, dist.get(v) + 1);
                    queue.push(e.to);
                }
        }
        if (dist.has(f2))
            return;
        const [c1, c2] = [s1[0].to, s2[0].to];
        const line = (f, g, s) => { const x = unit(sub(m.atoms[f].location, m.atoms[g].location)), y = unit(sub(m.atoms[s].location, m.atoms[f].location)); return !x || !y || dot(cross(x, y), cross(x, y)) < 0.01; };
        if (s1.length === 2 ? sameSide(m, f1, f2, c1, s1[1].to) !== -1 : line(f1, f2, c1))
            return;
        if (s2.length === 2 ? sameSide(m, f2, f1, c2, s2[1].to) !== -1 : line(f2, f1, c2))
            return;
        const side = sameSide(m, f1, f2, c1, c2);
        if (side)
            units.push({ kind: "double", foci: [f1, f2], chain, carriers: [c1, c2], cis: side > 0, bond: bonds[(bonds.length - 1) / 2] });
    });
    return units;
}
function axisOf(m, c, chain) {
    const ends = [chain[0], chain[chain.length - 1]], inner = [chain[1], chain[chain.length - 2]];
    if (ends[0] === ends[1] || chain.some((x, k) => k && k < chain.length - 1 && c.adj[x].length !== 2))
        return undefined;
    const z = new Map();
    for (const b of m.bonds)
        if ((b.stereo === 1 || b.stereo === 6) && ends.includes(b.atoms[0]))
            z.set(b.atoms[1], (z.get(b.atoms[1]) ?? 0) + (b.stereo === 1 ? 1 : -1));
    const at = (i) => [m.atoms[i].location[0], m.atoms[i].location[1], z.get(i) ?? 0], place = new Map(), h = [undefined, undefined];
    for (const [k, t] of ends.entries()) {
        const others = c.adj[t].filter((e) => e.to !== inner[k]).map((e) => e.to);
        if (others.length + c.h[t] !== 2 || !others.length)
            return undefined;
        for (const o of others)
            place.set(o, at(o));
        if (others.length === 1) {
            const p = at(others[0]), q = at(t), u = unit(sub(q, at(inner[k]))), v = sub(p, q);
            if (!u)
                return undefined;
            const along = dot(v, u);
            h[k] = [q[0] + 2 * along * u[0] - v[0], q[1] + 2 * along * u[1] - v[1], q[2] + 2 * along * u[2] - v[2]];
        }
    }
    if (![...place.keys()].some((i) => z.get(i)))
        return undefined;
    return { kind: "axis", foci: [chain[(chain.length - 1) / 2]], chain, place, h };
}
const ATOM = 0, RING = 1, BOND = 2, HYDROGEN = 3;
const fail = (why) => { throw new Error(`CIP: ${why}`); };
const H_MASS = (0, mass_ts_1.atomMass)("H");
class Digraph {
    constructor(c, atom, spent) {
        this.seen = new Set();
        this.count = 0;
        this.calls = 0;
        this.toward = new Map();
        this.epoch = 0;
        this.ref6 = -1;
        this.c = c;
        this.spent = spent;
        this.origin = this.root = this.make(atom, undefined, -1, ATOM, c.z[atom]);
        this.toward.set(this.origin, undefined);
    }
    make(atom, up, bond, kind, z, dist = 0) {
        if (++this.count > MOST_NODES || ++this.spent.nodes > ALL_NODES)
            fail("too many nodes");
        if (atom >= 0)
            this.seen.add(atom);
        const c = this.c, real = kind === ATOM;
        return { id: this.count, atom, up, bond, depth: up ? up.depth + 1 : 1, dist, kind, z, el: atom < 0 ? 1 : c.z[atom], massNo: real ? c.massNo[atom] : 0, mass: real ? c.mass[atom] : kind === HYDROGEN ? H_MASS : 0, aux: "" };
    }
    onPath(n, atom) {
        for (let p = n; p; p = p.up)
            if (p.atom === atom)
                return p.depth;
        return 0;
    }
    kids(n) {
        if (n.kids)
            return n.kids;
        const out = [], c = this.c, a = n.atom;
        n.kids = out;
        if (n.kind !== ATOM)
            return out;
        const dups = (to, bond, order) => {
            for (let k = c.q[a] < 0 && c.frac[a] !== undefined ? 0 : 1; k < order; k++)
                out.push(this.make(to, n, bond, BOND, c.frac[a] ?? c.z[to]));
        };
        for (const { to, bond, order } of c.adj[a]) {
            const at = this.onPath(n, to);
            if (!at) {
                out.push(this.make(to, n, bond, ATOM, c.z[to]));
                if (n !== this.origin)
                    dups(to, bond, order);
            }
            else if (bond === n.bond) {
                if (to !== this.origin.atom)
                    for (let k = 1; k < order; k++)
                        out.push(this.make(to, n, bond, BOND, c.frac[a] ?? c.z[to]));
            }
            else {
                out.push(this.make(to, n, bond, RING, c.z[to], at));
                dups(to, bond, order);
            }
        }
        for (let k = 0; k < c.h[a]; k++)
            out.push(this.make(-1, n, -1, HYDROGEN, 1));
        return out;
    }
    outs(n) {
        if (this.root === this.origin || !this.toward.has(n))
            return this.kids(n);
        const t = this.toward.get(n), out = n.up ? [n.up] : [];
        for (const k of this.kids(n))
            if (k !== t)
                out.push(k);
        return out;
    }
    terminal(n) { return n.kind !== ATOM || this.kids(n).length + (n.up ? 1 : 0) <= 1; }
    reroot(n) {
        if (n === this.root)
            return;
        for (const p of this.toward.keys())
            p.memo = undefined;
        this.root = n;
        this.toward.clear();
        for (let p = n, prev; p; prev = p, p = p.up) {
            this.toward.set(p, prev);
            p.memo = undefined;
        }
    }
    changed() { this.epoch++; }
    rank(from, edges, rs) {
        const list = [...edges];
        let unique = true, pseudo = 0;
        for (let i = 1; i < list.length; i++)
            for (let j = i; j > 0; j--) {
                const d = this.compare(from, list[j - 1], list[j], rs);
                if (d < -1 || d > 1)
                    pseudo++;
                if (d < 0)
                    [list[j - 1], list[j]] = [list[j], list[j - 1]];
                else {
                    if (!d)
                        unique = false;
                    break;
                }
            }
        return { list, unique, pseudo: pseudo === 1 };
    }
    sorted(n, rs) {
        const memo = (n.memo ?? (n.memo = new Map())), hit = memo.get(rs);
        if (hit && (!rs.aux || hit.epoch === this.epoch))
            return hit;
        const s = { ...this.rank(n, this.outs(n), rs), epoch: this.epoch };
        memo.set(rs, s);
        return s;
    }
    compare(from, a, b, rs) {
        for (const rule of rs.rules) {
            if (rule === R6 && this.ref6 < 0)
                break;
            const d = this.explore(rule, from, a, b);
            if (d)
                return d;
        }
        return 0;
    }
    explore(rule, from, a, b) {
        if (++this.calls > MOST_CALLS || ++this.spent.calls > ALL_CALLS)
            fail("too much work");
        let d = rule.node(this, a, b, from === this.root);
        if (d || rule.rootOnly)
            return d;
        const qa = [a], qb = [b];
        for (let p = 0; p < qa.length && p < qb.length; p++) {
            const xs = this.outs(qa[p]), ys = this.outs(qb[p]);
            const sx = this.shallow(xs, rule), sy = this.shallow(ys, rule);
            for (let k = 0; k < sx.length && k < sy.length; k++)
                if ((d = rule.node(this, sx[k], sy[k], false)))
                    return d;
            if (xs.length !== ys.length)
                return xs.length > ys.length ? 1 : -1;
            const dx = this.sorted(qa[p], rule.sorter).list, dy = this.sorted(qb[p], rule.sorter).list;
            for (let k = 0; k < dx.length; k++) {
                if ((d = rule.node(this, dx[k], dy[k], false)))
                    return d;
                qa.push(dx[k]);
                qb.push(dy[k]);
            }
        }
        return 0;
    }
    shallow(xs, rule) {
        const list = [...xs];
        for (let i = 1; i < list.length; i++)
            for (let j = i; j > 0; j--) {
                let d = 0;
                for (const r of rule.sorter.rules)
                    if ((d = r.node(this, list[j - 1], list[j], false)))
                        break;
                if (d < 0)
                    [list[j - 1], list[j]] = [list[j], list[j - 1]];
                else
                    break;
            }
        return list;
    }
    references(n) {
        let level = [[n]];
        while (level.length) {
            for (const group of level) {
                let r = 0, s = 0;
                for (const x of group) {
                    const d = ref(x.aux);
                    if (d === "R")
                        r++;
                    else if (d === "S")
                        s++;
                }
                if (r || s)
                    return r > s ? ["R"] : s > r ? ["S"] : ["R", "S"];
            }
            const next = [];
            for (const group of level) {
                const parts = group.map((x) => this.groups(x, this.sorted(x, RULE4B.sorter).list.filter((y) => !this.terminal(y)), RULE4B.sorter));
                if (parts.some((p) => p.length !== parts[0].length))
                    fail("unequal groups");
                for (let i = 0; i < (parts[0]?.length ?? 0); i++)
                    next.push(parts.flatMap((p) => p[i]));
            }
            level = next;
        }
        return [];
    }
    groups(from, list, rs) {
        const out = [];
        list.forEach((x, k) => { if (!k || this.compare(from, list[k - 1], x, rs))
            out.push([]); out[out.length - 1].push(x); });
        return out;
    }
    pairList(n, reference, rs) {
        const out = [reference], queue = [n];
        for (let p = 0; p < queue.length; p++) {
            const d = ref(queue[p].aux);
            if (d)
                out.push(d);
            for (const x of this.sorted(queue[p], rs).list)
                if (!this.terminal(x))
                    queue.push(x);
        }
        return out;
    }
    rule4b(a, b) {
        const ra = this.references(a), rb = this.references(b);
        if (!ra.length !== !rb.length)
            fail("unequal references");
        if (ra.length === 1 && rb.length === 1) {
            const qa = [a], qb = [b], rsA = LIKE4B[ra[0]], rsB = LIKE4B[rb[0]];
            for (let p = 0; p < qa.length && p < qb.length; p++) {
                const la = ref(qa[p].aux) === ra[0], lb = ref(qb[p].aux) === rb[0];
                if (la !== lb)
                    return la ? 1 : -1;
                for (const x of this.sorted(qa[p], rsA).list)
                    if (!this.terminal(x))
                        qa.push(x);
                for (const x of this.sorted(qb[p], rsB).list)
                    if (!this.terminal(x))
                        qb.push(x);
            }
            return 0;
        }
        const la = ra.map((r) => this.pairList(a, r, LIKE4B[r])).sort((x, y) => likePairs(y, x)), lb = rb.map((r) => this.pairList(b, r, LIKE4B[r])).sort((x, y) => likePairs(y, x));
        for (let i = 0; i < la.length && i < lb.length; i++) {
            const d = likePairs(la[i], lb[i]);
            if (d)
                return d;
        }
        return 0;
    }
    rule5(a, b) {
        const r = likePairs(this.pairList(a, "R", LIKE5.R), this.pairList(b, "R", LIKE5.R)), s = likePairs(this.pairList(a, "S", LIKE5.S), this.pairList(b, "S", LIKE5.S));
        return r < 0 ? (s < 0 ? -1 : -2) : r > 0 ? (s > 0 ? 1 : 2) : 0;
    }
    centre(n, u, rs) {
        this.reroot(n);
        const edges = this.outs(n);
        if (edges.length < 3)
            return "";
        let s = this.rank(n, edges, rs);
        if (!s.unique && edges.length === 4 && rs === ALL) {
            const groups = this.groups(n, s.list, rs).length, real = (x) => (x.kind === ATOM ? x.atom : -1);
            const by = (ref, list) => { this.ref6 = ref; this.changed(); try {
                return this.rank(n, list, rs);
            }
            finally {
                this.ref6 = -1;
                this.changed();
            } };
            if (groups === 2 && real(s.list[1]) >= 0)
                s = by(real(s.list[1]), s.list);
            else if (groups === 1 && real(s.list[0]) >= 0) {
                const first = by(real(s.list[0]), s.list);
                if (real(first.list[1]) < 0)
                    return "?";
                s = by(real(first.list[1]), first.list);
                if (parity(first.list.map((x) => x.id), s.list.map((x) => x.id)))
                    return "?";
            }
        }
        if (!s.unique)
            return "?";
        const ranked = s.list.filter((x) => x.kind !== BOND && x.kind !== HYDROGEN).map((x) => x.atom);
        while (ranked.length < 4)
            ranked.push(-1);
        const odd = parity(u.around, ranked);
        return odd === undefined ? "?" : odd ? (s.pseudo ? "s" : "S") : s.pseudo ? "r" : "R";
    }
    along(n, chain) {
        let p = n;
        for (const atom of chain.slice(1))
            p = p && [...(p.up ? [p.up] : []), ...this.kids(p)].find((x) => x.kind === ATOM && x.atom === atom);
        return p;
    }
    double(n1, u, rs) {
        const swap = n1.atom !== u.foci[0], chain = swap ? [...u.chain].reverse() : u.chain, [c1, c2] = swap ? [u.carriers[1], u.carriers[0]] : u.carriers;
        const n2 = this.along(n1, chain);
        if (!n2)
            return "?";
        this.reroot(n1);
        const e1 = this.outs(n1).filter((x) => x.atom !== chain[1]);
        const p1 = this.rank(n1, e1, rs);
        this.reroot(n2);
        const e2 = this.outs(n2).filter((x) => x.atom !== chain[chain.length - 2]);
        if (!e1.length || !e2.length)
            return "";
        const p2 = this.rank(n2, e2, rs);
        if (!p1.unique || !p2.unique)
            return "?";
        let cis = u.cis;
        if (e1.length > 1 && p1.list[0].atom !== c1)
            cis = !cis;
        if (e2.length > 1 && p2.list[0].atom !== c2)
            cis = !cis;
        const pseudo = p1.pseudo !== p2.pseudo;
        return cis ? (pseudo ? "c" : "Z") : pseudo ? "t" : "E";
    }
    axis(n, u, rs) {
        const mid = (u.chain.length - 1) / 2, ends = [this.along(n, u.chain.slice(0, mid + 1).reverse()), this.along(n, u.chain.slice(mid))];
        const inner = [u.chain[1], u.chain[u.chain.length - 2]], ranked = [];
        for (const [k, e] of ends.entries()) {
            if (!e)
                return "";
            this.reroot(e);
            const subs = this.outs(e).filter((x) => (x.kind === ATOM || x.kind === HYDROGEN) && x.atom !== inner[k]);
            if (!subs.length || subs.length > 2)
                return "";
            const s = this.rank(e, subs, rs);
            if (!s.unique)
                return "?";
            ranked.push(s);
        }
        const place = (x, k) => (!x ? u.h[k] : x.kind === HYDROGEN ? u.h[k] : u.place.get(x.atom));
        const ps = ranked.flatMap((s, k) => [place(s.list[0], k), place(s.list[1], k)]);
        if (ps.some((p) => !p))
            return "?";
        const hand = (0, axial_ts_1.handedness)(...ps), pseudo = ranked[0].pseudo !== ranked[1].pseudo;
        return !hand ? "?" : hand === "R" ? (pseudo ? "m" : "M") : pseudo ? "p" : "P";
    }
    label(u, rs) {
        this.reroot(this.origin);
        return u.kind === "centre" ? this.centre(this.origin, u, rs) : u.kind === "double" ? this.double(this.origin, u, rs) : "";
    }
    auxiliary(u, units) {
        this.reroot(this.origin);
        const found = [];
        for (const v of units) {
            if (v === u || !v.foci.some((f) => this.seen.has(f)))
                continue;
            for (const n of this.nodesOf(v.foci[0])) {
                const far = v.kind === "double" ? this.along(n, v.chain) : undefined;
                found.push([far && far.depth < n.depth ? far : n, v]);
            }
        }
        found.sort((x, y) => y[0].depth - x[0].depth);
        const queue = new Map();
        const flush = () => { for (const [n, l] of queue)
            n.aux = l; queue.clear(); this.changed(); };
        let prev = Infinity;
        for (const [n, v] of found) {
            if (n.depth < prev) {
                flush();
                prev = n.depth;
            }
            queue.set(n, v.kind === "centre" ? this.centre(n, v, ALL) : v.kind === "double" ? this.double(n, v, ALL) : this.axis(n, v, ALL));
        }
        flush();
    }
    nodesOf(atom) {
        const out = [];
        for (const queue = [this.origin]; queue.length;) {
            const n = queue.pop();
            if (n.atom === atom && n.kind === ATOM)
                out.push(n);
            queue.push(...this.kids(n));
        }
        return out.sort((x, y) => x.depth - y.depth || x.id - y.id);
    }
}
const ref = (d) => (d === "R" || d === "M" || d === "c" ? "R" : d === "S" || d === "P" || d === "t" ? "S" : "");
function likePairs(x, y) {
    if (x.length !== y.length)
        fail("unequal pair lists");
    for (let i = 1; i < x.length; i++) {
        const a = x[i] === x[0], b = y[i] === y[0];
        if (a !== b)
            return a ? 1 : -1;
    }
    return 0;
}
function parity(from, to) {
    const at = to.map((x) => from.indexOf(x));
    if (at.length !== from.length || at.some((x) => x < 0) || new Set(at).size !== at.length)
        return undefined;
    let odd = false;
    for (let i = 0; i < at.length; i++)
        for (let j = i + 1; j < at.length; j++)
            if (at[i] > at[j])
                odd = !odd;
    return odd;
}
const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const ORD3 = { Z: 2, E: 1 }, ORD4A = { R: 2, S: 2, M: 2, P: 2, c: 2, t: 2, r: 1, s: 1, m: 1, p: 1, E: 1, Z: 1 }, ORD4C = { r: 2, m: 2, s: 1, p: 1 };
const rule = (node, rootOnly = false) => ({ node, rootOnly, sorter: { rules: [], aux: false } });
const R1A = rule((_, a, b) => sign(a.z - b.z));
const R1B = rule((_, a, b) => (a.kind === RING && b.kind === RING ? sign(b.dist - a.dist) : a.kind === RING ? 1 : b.kind === RING ? -1 : 0));
const R2 = rule((_, a, b) => (!a.el || !b.el ? sign(a.el - b.el) : !a.massNo && !b.massNo ? 0 : sign(a.mass - b.mass) || 0));
const R3 = rule((_, a, b) => sign((ORD3[a.aux] ?? 0) - (ORD3[b.aux] ?? 0)));
const R4A = rule((_, a, b) => sign((ORD4A[a.aux] ?? 0) - (ORD4A[b.aux] ?? 0)));
const RULE4B = rule((g, a, b, atRoot) => (atRoot ? g.rule4b(a, b) : 0), true);
const R4C = rule((_, a, b) => sign((ORD4C[a.aux] ?? 0) - (ORD4C[b.aux] ?? 0)));
const R5 = rule((g, a, b, atRoot) => (atRoot ? g.rule5(a, b) : 0), true);
const R6 = rule((g, a, b) => (g.ref6 < 0 || (a.atom === g.ref6) === (b.atom === g.ref6) ? 0 : a.atom === g.ref6 ? 2 : -2));
const MAIN = [R1A, R1B, R2, R3, R4A, RULE4B, R4C, R5, R6];
MAIN.forEach((r, i) => { r.sorter = { rules: MAIN.slice(0, i + 1), aux: i > 2 }; });
const CONSTITUTIONAL = { rules: [R1A, R1B, R2], aux: false }, ALL = { rules: MAIN, aux: true };
const liking = (reference) => {
    const r = rule((_, a, b) => { if (!a.aux || !b.aux)
        return 0; const x = ref(a.aux) === reference, y = ref(b.aux) === reference; return x === y ? 0 : x ? 1 : -1; });
    r.sorter = { rules: [r], aux: true };
    return r;
};
const LIKE4B = Object.fromEntries(["R", "S"].map((x) => [x, { rules: [...MAIN.slice(0, 5), liking(x)], aux: true }]));
const LIKE5 = Object.fromEntries(["R", "S"].map((x) => [x, { rules: [...MAIN.slice(0, 7), liking(x)], aux: true }]));
function cipLabels(m) {
    const out = { atoms: m.atoms.map(() => undefined), bonds: m.bonds.map(() => undefined) };
    if (m.atoms.length > MOST_ATOMS)
        return out;
    let c, units;
    try {
        c = chemOf(m);
        units = stereoUnits(m, c);
    }
    catch {
        return out;
    }
    const spent = { nodes: 0, calls: 0 };
    for (const u of units) {
        if (u.kind === "axis")
            continue;
        try {
            const g = new Digraph(c, u.foci[0], spent);
            u.label = g.label(u, CONSTITUTIONAL);
            if (u.label === "?") {
                g.auxiliary(u, units);
                u.label = g.label(u, ALL);
            }
        }
        catch {
            u.label = "";
        }
    }
    for (const u of units) {
        if (u.kind === "centre" && /^[RSrs]$/.test(u.label ?? ""))
            out.atoms[u.foci[0]] = u.label;
        if (u.kind === "double" && /^[EZct]$/.test(u.label ?? ""))
            out.bonds[u.bond] = u.label === "c" ? "Z" : u.label === "t" ? "E" : u.label;
    }
    return out;
}

  };
  defs["mass.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elementalAnalysis = void 0;
exports.isotopesOf = isotopesOf;
exports.atomMass = atomMass;
exports.counts = counts;
exports.isotopePattern = isotopePattern;
const isotopes_ts_1 = require("isotopes.ts");
const TRITIUM = 3.01604928132;
function isotopesOf(key) {
    if (isotopes_ts_1.ISOTOPES[key])
        return isotopes_ts_1.ISOTOPES[key];
    if (key === "D")
        return [[isotopes_ts_1.ISOTOPES.H[1][0], 100]];
    if (key === "T")
        return [[TRITIUM, 100]];
    const [, n, el] = /^\[(\d+)([A-Z][a-z]?)\]$/.exec(key) ?? [];
    const one = el && isotopes_ts_1.ISOTOPES[el]?.find(([m]) => Math.round(m) === Number(n));
    return one ? [[one[0], 100]] : el === "H" && n === "3" ? [[TRITIUM, 100]] : undefined;
}
function atomMass(el, massNumber) {
    const iso = isotopes_ts_1.ISOTOPES[el];
    if (massNumber)
        return iso?.find(([m]) => Math.round(m) === massNumber)?.[0] ?? massNumber;
    return iso && iso.reduce((t, [m, a]) => t + m * a, 0) / iso.reduce((t, [, a]) => t + a, 0);
}
function counts(formula) {
    const out = {}, text = formula.replace(/\s+/g, "");
    if (!/^([A-Z][a-z]?\d*)+$/.test(text))
        return undefined;
    for (const [, el, n] of text.matchAll(/([A-Z][a-z]?)(\d*)/g))
        out[el] = (out[el] ?? 0) + (n ? Number(n) : 1);
    return out;
}
function isotopePattern(formula, least = 0.5) {
    const n = typeof formula === "string" ? counts(formula) : formula;
    if (!n || Object.keys(n).some((el) => !isotopesOf(el)) || Object.values(n).reduce((a, b) => a + b, 0) > 2000)
        return undefined;
    let peaks = [[0, 1]];
    for (const [el, k] of Object.entries(n)) {
        const iso = isotopesOf(el).map(([m, a]) => [m, a / 100]);
        for (let i = 0; i < k; i++) {
            const next = new Map();
            for (const [m, p] of peaks)
                for (const [im, ip] of iso) {
                    const mass = m + im, prob = p * ip, key = Math.round(mass * 1000);
                    const was = next.get(key);
                    next.set(key, was ? [(was[0] * was[1] + mass * prob) / (was[1] + prob), was[1] + prob] : [mass, prob]);
                }
            const top = Math.max(...[...next.values()].map((x) => x[1]));
            peaks = [...next.values()].filter((x) => x[1] > top * 1e-6);
        }
    }
    const light = Math.min(...peaks.map((x) => x[0])), merged = new Map();
    for (const [m, p] of peaks) {
        const key = Math.round(m - light), was = merged.get(key);
        merged.set(key, was ? [(was[0] * was[1] + m * p) / (was[1] + p), was[1] + p] : [m, p]);
    }
    const top = Math.max(...[...merged.values()].map((x) => x[1]));
    return [...merged.values()].map(([mz, p]) => ({ mz, rel: (p / top) * 100 })).filter((x) => x.rel >= least).sort((a, b) => a.mz - b.mz);
}
const elementalAnalysis = (composition) => composition.trim().split(/\s+/).reduce((out, x, i, all) => (i % 2 ? out : [...out, `${x}, ${all[i + 1]}`]), []).join("; ");
exports.elementalAnalysis = elementalAnalysis;

  };
  defs["isotopes.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISOTOPES = void 0;
exports.ISOTOPES = {
    H: [[1.00782503223, 99.9885], [2.01410177812, 0.0115]],
    He: [[3.0160293201, 0.000134], [4.00260325413, 99.999866]],
    Li: [[6.0151228874, 7.59], [7.0160034366, 92.41]],
    Be: [[9.012183065, 100]],
    B: [[10.01293695, 19.9], [11.00930536, 80.1]],
    C: [[12.0000000, 98.93], [13.00335483507, 1.07]],
    N: [[14.00307400443, 99.636], [15.00010889888, 0.364]],
    O: [[15.99491461957, 99.757], [16.99913175650, 0.038], [17.99915961286, 0.205]],
    F: [[18.99840316273, 100]],
    Ne: [[19.9924401762, 90.48], [20.993846685, 0.27], [21.991385114, 9.25]],
    Na: [[22.9897692820, 100]],
    Mg: [[23.985041697, 78.99], [24.985836976, 10], [25.982592968, 11.01]],
    Al: [[26.98153853, 100]],
    Si: [[27.97692653465, 92.223], [28.97649466490, 4.685], [29.973770136, 3.092]],
    P: [[30.97376199842, 100]],
    S: [[31.9720711744, 94.99], [32.9714589098, 0.75], [33.967867004, 4.25], [35.96708071, 0.01]],
    Cl: [[34.968852682, 75.76], [36.965902602, 24.24]],
    Ar: [[35.967545105, 0.3336], [37.96273211, 0.0629], [39.9623831237, 99.6035]],
    K: [[38.9637064864, 93.2581], [39.963998166, 0.0117], [40.9618252579, 6.7302]],
    Ca: [[39.962590863, 96.941], [41.95861783, 0.647], [42.95876644, 0.135], [43.95548156, 2.086], [45.9536890, 0.004], [47.95252276, 0.187]],
    Sc: [[44.95590828, 100]],
    Ti: [[45.95262772, 8.25], [46.95175879, 7.44], [47.94794198, 73.72], [48.94786568, 5.41], [49.94478689, 5.18]],
    V: [[49.94715601, 0.25], [50.94395704, 99.75]],
    Cr: [[49.94604183, 4.345], [51.94050623, 83.789], [52.94064815, 9.501], [53.93887916, 2.365]],
    Mn: [[54.93804391, 100]],
    Fe: [[53.93960899, 5.845], [55.93493633, 91.754], [56.93539284, 2.119], [57.93327443, 0.282]],
    Co: [[58.93319429, 100]],
    Ni: [[57.93534241, 68.077], [59.93078588, 26.223], [60.93105557, 1.1399], [61.92834537, 3.6346], [63.92796682, 0.9255]],
    Cu: [[62.92959772, 69.15], [64.92778970, 30.85]],
    Zn: [[63.92914201, 49.17], [65.92603381, 27.73], [66.92712775, 4.04], [67.92484455, 18.45], [69.9253192, 0.61]],
    Ga: [[68.9255735, 60.108], [70.92470258, 39.892]],
    Ge: [[69.92424875, 20.57], [71.922075826, 27.45], [72.923458956, 7.75], [73.921177761, 36.5], [75.921402726, 7.73]],
    As: [[74.92159457, 100]],
    Se: [[73.922475934, 0.89], [75.919213704, 9.37], [76.919914154, 7.63], [77.91730928, 23.77], [79.9165218, 49.61], [81.9166995, 8.73]],
    Br: [[78.9183376, 50.69], [80.9162897, 49.31]],
    Kr: [[77.92036494, 0.355], [79.91637808, 2.286], [81.91348273, 11.593], [82.91412716, 11.5], [83.9114977282, 56.987], [85.9106106269, 17.279]],
    Rb: [[84.9117897379, 72.17], [86.9091805310, 27.83]],
    Sr: [[83.9134191, 0.56], [85.9092606, 9.86], [86.9088775, 7], [87.9056125, 82.58]],
    Y: [[88.9058403, 100]],
    Zr: [[89.9046977, 51.45], [90.9056396, 11.22], [91.9050347, 17.15], [93.9063108, 17.38], [95.9082714, 2.8]],
    Nb: [[92.9063730, 100]],
    Mo: [[91.90680796, 14.53], [93.90508490, 9.15], [94.90583877, 15.84], [95.90467612, 16.67], [96.90601812, 9.6], [97.90540482, 24.39], [99.9074718, 9.82]],
    Ru: [[95.90759025, 5.54], [97.9052868, 1.87], [98.9059341, 12.76], [99.9042143, 12.6], [100.9055769, 17.06], [101.9043441, 31.55], [103.9054275, 18.62]],
    Rh: [[102.9054980, 100]],
    Pd: [[101.9056022, 1.02], [103.9040305, 11.14], [104.9050796, 22.33], [105.9034804, 27.33], [107.9038916, 26.46], [109.90517220, 11.72]],
    Ag: [[106.9050916, 51.839], [108.9047553, 48.161]],
    Cd: [[105.9064599, 1.25], [107.9041834, 0.89], [109.90300661, 12.49], [110.90418287, 12.8], [111.90276287, 24.13], [112.90440813, 12.22], [113.90336509, 28.73], [115.90476315, 7.49]],
    In: [[112.90406184, 4.29], [114.903878776, 95.71]],
    Sn: [[111.90482387, 0.97], [113.9027827, 0.66], [114.903344699, 0.34], [115.90174280, 14.54], [116.90295398, 7.68], [117.90160657, 24.22], [118.90331117, 8.59], [119.90220163, 32.58], [121.9034438, 4.63], [123.9052766, 5.79]],
    Sb: [[120.9038120, 57.21], [122.9042132, 42.79]],
    Te: [[119.9040593, 0.09], [121.9030435, 2.55], [122.9042698, 0.89], [123.9028171, 4.74], [124.9044299, 7.07], [125.9033109, 18.84], [127.90446128, 31.74], [129.906222748, 34.08]],
    I: [[126.9044719, 100]],
    Xe: [[123.9058920, 0.0952], [125.9042983, 0.089], [127.9035310, 1.9102], [128.9047808611, 26.4006], [129.903509349, 4.071], [130.90508406, 21.2324], [131.9041550856, 26.9086], [133.90539466, 10.4357], [135.907214484, 8.8573]],
    Cs: [[132.9054519610, 100]],
    Ba: [[129.9063207, 0.106], [131.9050611, 0.101], [133.90450818, 2.417], [134.90568838, 6.592], [135.90457573, 7.854], [136.90582714, 11.232], [137.90524700, 71.698]],
    La: [[137.9071149, 0.08881], [138.9063563, 99.91119]],
    Ce: [[135.90712921, 0.185], [137.905991, 0.251], [139.9054431, 88.45], [141.9092504, 11.114]],
    Pr: [[140.9076576, 100]],
    Nd: [[141.9077290, 27.152], [142.9098200, 12.174], [143.9100930, 23.798], [144.9125793, 8.293], [145.9131226, 17.189], [147.9168993, 5.756], [149.9209022, 5.638]],
    Sm: [[143.9120065, 3.07], [146.9149044, 14.99], [147.9148292, 11.24], [148.9171921, 13.82], [149.9172829, 7.38], [151.9197397, 26.75], [153.9222169, 22.75]],
    Eu: [[150.9198578, 47.81], [152.9212380, 52.19]],
    Gd: [[151.9197995, 0.2], [153.9208741, 2.18], [154.9226305, 14.8], [155.9221312, 20.47], [156.9239686, 15.65], [157.9241123, 24.84], [159.9270624, 21.86]],
    Tb: [[158.9253547, 100]],
    Dy: [[155.9242847, 0.056], [157.9244159, 0.095], [159.9252046, 2.329], [160.9269405, 18.889], [161.9268056, 25.475], [162.9287383, 24.896], [163.9291819, 28.26]],
    Ho: [[164.9303288, 100]],
    Er: [[161.9287884, 0.139], [163.9292088, 1.601], [165.9302995, 33.503], [166.9320546, 22.869], [167.9323767, 26.978], [169.9354702, 14.91]],
    Tm: [[168.9342179, 100]],
    Yb: [[167.9338896, 0.123], [169.9347664, 2.982], [170.9363302, 14.09], [171.9363859, 21.68], [172.9382151, 16.103], [173.9388664, 32.026], [175.9425764, 12.996]],
    Lu: [[174.9407752, 97.401], [175.9426897, 2.599]],
    Hf: [[173.9400461, 0.16], [175.9414076, 5.26], [176.9432277, 18.6], [177.9437058, 27.28], [178.9458232, 13.62], [179.9465570, 35.08]],
    Ta: [[179.9474648, 0.01201], [180.9479958, 99.98799]],
    W: [[179.9467108, 0.12], [181.94820394, 26.5], [182.95022275, 14.31], [183.95093092, 30.64], [185.9543628, 28.43]],
    Re: [[184.9529545, 37.4], [186.9557501, 62.6]],
    Os: [[183.9524885, 0.02], [185.9538350, 1.59], [186.9557474, 1.96], [187.9558352, 13.24], [188.9581442, 16.15], [189.9584437, 26.26], [191.9614770, 40.78]],
    Ir: [[190.9605893, 37.3], [192.9629216, 62.7]],
    Pt: [[189.9599297, 0.012], [191.9610387, 0.782], [193.9626809, 32.86], [194.9647917, 33.78], [195.96495209, 25.21], [197.9678949, 7.356]],
    Au: [[196.96656879, 100]],
    Hg: [[195.9658326, 0.15], [197.96676860, 9.97], [198.96828064, 16.87], [199.96832659, 23.1], [200.97030284, 13.18], [201.97064340, 29.86], [203.97349398, 6.87]],
    Tl: [[202.9723446, 29.52], [204.9744278, 70.48]],
    Pb: [[203.9730440, 1.4], [205.9744657, 24.1], [206.9758973, 22.1], [207.9766525, 52.4]],
    Bi: [[208.9803991, 100]],
    Th: [[232.0380558, 100]],
    Pa: [[231.0358842, 100]],
    U: [[234.0409523, 0.0054], [235.0439301, 0.7204], [238.0507884, 99.2742]],
};

  };
  defs["axial.ts"] = function (module, exports, require) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareBranches = compareBranches;
exports.handedness = handedness;
exports.axialLabels = axialLabels;
const render_ts_1 = require("render.ts");
const labels_ts_1 = require("labels.ts");
const rings_ts_1 = require("rings.ts");
const SYMBOLS = [...labels_ts_1.ELEMENTS];
const atomicNumber = (label) => (label === "D" || label === "T" ? 1 : SYMBOLS.indexOf(label) + 1);
const NATURAL = { 1: 1.008, 6: 12.011, 7: 14.007, 8: 15.999, 9: 18.998, 16: 32.06, 17: 35.45, 35: 79.904, 53: 126.9 };
const massOf = (label, isotope) => isotope ?? (label === "D" ? 2 : label === "T" ? 3 : NATURAL[atomicNumber(label)] ?? atomicNumber(label) * 2 + 0.5);
function graphOf(m) {
    const order = (type) => (type >= 1 && type <= 3 ? type : 1);
    const used = m.atoms.map(() => 0);
    for (const b of m.bonds)
        for (const i of b.atoms)
            used[i] += order(b.type);
    const h = m.atoms.map((a, i) => a.implicitHCount ?? (0, render_ts_1.hydrogens)(a.label, a.charge ?? 0, used[i], a.radical === 1 ? 1 : a.radical ? 2 : 0));
    const arom = (0, rings_ts_1.aromaticAtoms)({ atoms: m.atoms.map((a, i) => ({ el: a.text ? "X" : a.label, charge: a.charge ?? 0, h: h[i] })), bonds: m.bonds.map((b) => ({ a: b.atoms[0], b: b.atoms[1], order: order(b.type) })) });
    const ringList = (0, rings_ts_1.rings)({ atoms: m.atoms.map(() => ({ el: "C", charge: 0, h: 0 })), bonds: m.bonds.map((b) => ({ a: b.atoms[0], b: b.atoms[1], order: 1 })) });
    const inRing = (i, j) => ringList.some((r) => r.some((x, k) => x === i && (r[(k + 1) % r.length] === j || r[(k + r.length - 1) % r.length] === j)));
    const near = m.atoms.map(() => []);
    for (const b of m.bonds) {
        const [i, j] = b.atoms, o = arom[i] && arom[j] && inRing(i, j) ? 1 : order(b.type);
        near[i].push({ to: j, order: o });
        near[j].push({ to: i, order: o });
    }
    const z = m.atoms.map((a) => atomicNumber(a.label)), mass = m.atoms.map((a) => massOf(a.label, a.isotope));
    const mancude = m.atoms.map((_, i) => {
        const ring = arom[i] ? near[i].filter((e) => arom[e.to] && inRing(i, e.to)).map((e) => e.to) : [];
        return ring.length ? [ring.reduce((t, j) => t + z[j], 0) / ring.length, ring.reduce((t, j) => t + mass[j], 0) / ring.length] : undefined;
    });
    return { near, h, z, mass, arom, mancude, rings: ringList };
}
const MOST_NODES = 4000, MOST_SPHERES = 30;
function compareBranches(m, root, a, b, g = graphOf(m)) {
    for (const rule of [0, 1]) {
        const key = (n) => (n.h ? [1, 1.008][rule] : n.key ? n.key[rule] : rule ? g.mass[n.atom] : g.z[n.atom]);
        const sets = (start) => [[{ atom: start, dup: false, path: [root, start] }]];
        let la = sets(a), lb = sets(b), count = 0;
        for (let sphere = 0; sphere < MOST_SPHERES && (la.length || lb.length); sphere++) {
            const ka = la.flatMap((s) => s.map(key)), kb = lb.flatMap((s) => s.map(key));
            for (let k = 0; k < Math.max(ka.length, kb.length); k++)
                if ((ka[k] ?? 0) !== (kb[k] ?? 0))
                    return (ka[k] ?? 0) - (kb[k] ?? 0);
            la = next(g, la, key);
            lb = next(g, lb, key);
            count += la.length + lb.length;
            if (count > MOST_NODES)
                return 0;
        }
    }
    return 0;
}
function next(g, level, key) {
    const lex = (x, y) => { for (let k = 0; k < Math.max(x.length, y.length); k++) {
        const d = (y[k] ? key(y[k]) : 0) - (x[k] ? key(x[k]) : 0);
        if (d)
            return d;
    } return 0; };
    return level.flatMap((s) => s.map((n) => ({ n, c: children(g, n, key) })).sort((x, y) => key(y.n) - key(x.n) || lex(x.c, y.c)).map((x) => x.c)).filter((c) => c.length);
}
function children(g, n, key) {
    if (n.dup || n.h)
        return [];
    const from = n.path[n.path.length - 2], out = [];
    for (const e of g.near[n.atom]) {
        const dup = (atom) => ({ atom, dup: true, path: [...n.path, atom] });
        if (e.to === from) {
            for (let k = 1; k < e.order; k++)
                out.push(dup(e.to));
            continue;
        }
        out.push(n.path.includes(e.to) ? dup(e.to) : { atom: e.to, dup: false, path: [...n.path, e.to] });
        for (let k = 1; k < e.order; k++)
            out.push(dup(e.to));
    }
    const mancude = g.mancude[n.atom];
    if (mancude)
        out.push({ atom: n.atom, dup: true, key: mancude, path: n.path });
    for (let k = 0; k < g.h[n.atom]; k++)
        out.push({ atom: n.atom, dup: false, h: true, path: n.path });
    return out.sort((x, y) => key(y) - key(x));
}
function handedness(p1, p2, p3, p4) {
    const d = (p) => [p[0] - p4[0], p[1] - p4[1], p[2] - p4[2]], a = d(p1), b = d(p2), c = d(p3);
    const v = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
    return Math.abs(v) < 1e-6 ? undefined : v < 0 ? "R" : "S";
}
function depths(m, from) {
    const out = new Map();
    for (const b of m.bonds)
        if ((b.stereo === 1 || b.stereo === 6) && from.has(b.atoms[0]))
            out.set(b.atoms[1], (out.get(b.atoms[1]) ?? 0) + (b.stereo === 1 ? 1 : -1));
    return out;
}
const at = (m, i, z = 0) => [m.atoms[i].location[0], m.atoms[i].location[1], z];
function endOf(m, g, t, others, axis, place) {
    if (others.length === 2) {
        const c = compareBranches(m, t, others[0], others[1], g);
        if (!c)
            return undefined;
        const [hi, lo] = c > 0 ? others : [others[1], others[0]];
        return { ligands: [hi, lo], places: [place(hi), place(lo)] };
    }
    if (others.length !== 1 || g.h[t] !== 1)
        return undefined;
    const o = others[0], p = place(o), c = at(m, t), u = unit(sub(c, at(m, axis))), v = sub(p, c), along = dot(v, u);
    const h = [c[0] + 2 * along * u[0] - v[0], c[1] + 2 * along * u[1] - v[1], c[2] + 2 * along * u[2] - v[2]];
    return g.z[o] === 1 && !m.atoms[o].isotope ? undefined : { ligands: [o, -1], places: [p, h] };
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a) => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const helicity = (near, far) => ({ R: "M", S: "P", undefined: undefined })[String(handedness(near.places[0], near.places[1], far.places[0], far.places[1]))];
function axialLabels(m) {
    const atoms = m.atoms.map(() => undefined), bonds = m.bonds.map(() => undefined);
    if (!m.bonds.some((b) => b.stereo === 1 || b.stereo === 6))
        return { atoms, bonds };
    const g = graphOf(m), near = (i) => g.near[i].map((e) => e.to);
    const cumulated = (i) => g.near[i].length === 2 && g.near[i].every((e) => e.order === 2);
    const seen = new Set();
    m.atoms.forEach((_, i) => {
        if (!cumulated(i) || seen.has(i))
            return;
        const chain = [i];
        seen.add(i);
        for (const dir of [0, 1]) {
            let prev = i, cur = g.near[i][dir].to;
            while (cumulated(cur) && !seen.has(cur)) {
                seen.add(cur);
                dir ? chain.push(cur) : chain.unshift(cur);
                const next = near(cur).find((x) => x !== prev);
                prev = cur;
                cur = next;
            }
            dir ? chain.push(cur) : chain.unshift(cur);
        }
        const [t1, t2] = [chain[0], chain[chain.length - 1]];
        if (chain.length % 2 === 0 || t1 === t2 || cumulated(t1) || cumulated(t2))
            return;
        const z = depths(m, new Set([t1, t2])), place = (k) => at(m, k, z.get(k) ?? 0);
        const e1 = endOf(m, g, t1, near(t1).filter((x) => x !== chain[1]), chain[1], place);
        const e2 = endOf(m, g, t2, near(t2).filter((x) => x !== chain[chain.length - 2]), chain[chain.length - 2], place);
        if (e1 && e2)
            atoms[chain[(chain.length - 1) / 2]] = helicity(e1, e2);
    });
    m.bonds.forEach((b, k) => {
        const [a, c] = b.atoms;
        if (b.type !== 1 || !g.arom[a] || !g.arom[c] || near(a).length !== 3 || near(c).length !== 3)
            return;
        const inRings = g.rings.filter((r) => r.includes(a) && r.includes(c) && r.some((x, j) => (x === a && (r[(j + 1) % r.length] === c || r[(j + r.length - 1) % r.length] === c))));
        if (inRings.length && !inRings.some((r) => r.length === 7))
            return;
        const orthoA = near(a).filter((x) => x !== c), orthoC = near(c).filter((x) => x !== a);
        if ([...orthoA, ...orthoC].filter((o) => near(o).length === 3).length < 3)
            return;
        const zs = depths(m, new Set([a, c])), zo = depths(m, new Set([...orthoA, ...orthoC]));
        const tilt = new Map();
        for (const [ring, axis] of [[orthoA, a], [orthoC, c]]) {
            const own = ring.map((o) => (zs.get(o) ?? 0) + near(o).filter((s) => s !== axis).reduce((t, s) => t + (zo.get(s) ?? 0), 0));
            const d = Math.sign(own[0] - own[1]);
            ring.forEach((o, j) => tilt.set(o, j === 0 ? d : -d));
        }
        const place = (o) => at(m, o, tilt.get(o) ?? 0);
        const e1 = endOf(m, g, a, orthoA, c, place), e2 = endOf(m, g, c, orthoC, a, place);
        if (e1 && e2)
            bonds[k] = helicity(e1, e2);
    });
    return { atoms, bonds };
}

  };
  var n = Object.assign({}, require("namer.ts"), require("complexes.ts"));
  window.OctetNamer = { iupacName: n.iupacName, iupacNameWhy: n.iupacNameWhy, complexName: n.complexName };
})();
