package main

// The page may write only to files the user chose: in a Save or Open dialog, or by opening the file with the app
// (double-click, Open with, a file handed over by a second window). A path the page makes up is refused, so a
// document cannot make the app overwrite other files. The list is kept in allowed-paths.json beside the app's data,
// so a document restored after a restart can still be saved to its own file.

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"unicode"
	"sync"
)

var allowMu sync.Mutex
var allowList []string

func allowFile() string { return filepath.Join(app.base, "allowed-paths.json") }

func normPath(p string) string {
	if a, err := filepath.Abs(p); err == nil {
		p = a
	}
	p = filepath.Clean(p)
	if runtime.GOOS == "windows" || runtime.GOOS == "darwin" {
		p = strings.ToLower(p)
	}
	return p
}

func loadAllowed() {
	if allowList != nil {
		return
	}
	allowList = []string{}
	if b, err := os.ReadFile(allowFile()); err == nil {
		json.Unmarshal(b, &allowList)
	}
}

func allowPath(p string) {
	if p == "" {
		return
	}
	allowMu.Lock()
	defer allowMu.Unlock()
	loadAllowed()
	n := normPath(p)
	out := []string{n}
	for _, q := range allowList {
		if q != n {
			out = append(out, q)
		}
	}
	if len(out) > 500 {
		out = out[:500]
	}
	allowList = out
	if b, err := json.Marshal(allowList); err == nil {
		os.MkdirAll(filepath.Dir(allowFile()), 0755)
		os.WriteFile(allowFile(), b, 0600)
	}
}

// the page may add .reactio (or .json) to a name chosen in Save as when the extension is not one it saves
func pathAllowed(p string) bool {
	allowMu.Lock()
	defer allowMu.Unlock()
	loadAllowed()
	n := normPath(p)
	for _, q := range allowList {
		if q == n || q+".json" == n || q+".reactio" == n {
			return true
		}
	}
	// Copy for LaTeX: the figure's .pdf and .tex beside a .reactio file the user chose, named after it (texStem in the page)
	ext := filepath.Ext(n)
	if ext != ".pdf" && ext != ".tex" {
		return false
	}
	dir, stem := filepath.Dir(n), strings.TrimSuffix(filepath.Base(n), ext)
	for _, q := range allowList {
		if filepath.Ext(q) == ".reactio" && filepath.Dir(q) == dir && (texStem(filepath.Base(q)) == stem || plainStem(filepath.Base(q)) == stem) {
			return true
		}
	}
	return false
}

var texBad = regexp.MustCompile(`[^A-Za-z0-9._-]+`)
var texLead = regexp.MustCompile(`^[._]+`)

// Cyrillic in Latin letters, accents dropped: the same table and rule as texStem in the page and in macapp/main.swift
const texLatinTable = "а a б b в v г g ґ g д d е e ё yo є ye ж zh з z и i і i ї yi й y к k л l м m н n о o п p р r с s т t у u ў u ф f х kh ц ts ч ch ш sh щ shch ъ - ы y ь - э e ю yu я ya à a á a â a ã a ä a å a ā a ă a ą a æ ae ç c ć c č c ď d đ d è e é e ê e ë e ē e ė e ę e ě e ğ g ì i í i î i ï i ī i ı i ł l ñ n ń n ň n ò o ó o ô o õ o ö o ø o ō o ő o œ oe ř r ś s š s ş s ß s ť t ù u ú u û u ü u ū u ů u ű u ý y ÿ y ź z ż z ž z"

var texLatin = func() map[rune]string {
	m := map[rune]string{}
	f := strings.Fields(texLatinTable)
	for i := 0; i+1 < len(f); i += 2 {
		m[[]rune(f[i])[0]] = f[i+1]
	}
	return m
}()

// Names are composed first, as the page's normalize('NFC') does (a decomposed é or й, as macOS file names often are,
// reads as the letter itself, and a letter outside the table stays one character). The data below is the canonical
// composition for the combining marks U+0300..U+036F, which are the only ones the rule drops: for each mark, pairs of
// a letter and what the letter with that mark is.
var texCompose = map[rune]string{
	0x300: "AÀEÈIÌNǸOÒUÙWẀYỲaàeèiìnǹoòuùwẁyỳ¨῭ÂẦÊỀÔỒÜǛâầêềôồüǜĂẰăằĒḔēḕŌṐōṑƠỜơờƯỪưừΑᾺΕῈΗῊΙῚΟῸΥῪΩῺαὰεὲηὴιὶοὸυὺωὼϊῒϋῢЕЀИЍеѐиѝἀἂἁἃἈἊἉἋἐἒἑἓἘἚἙἛἠἢἡἣἨἪἩἫἰἲἱἳἸἺἹἻὀὂὁὃὈὊὉὋὐὒὑὓὙὛὠὢὡὣὨὪὩὫ᾿῍῾῝",
	0x301: "AÁCĆEÉGǴIÍKḰLĹMḾNŃOÓPṔRŔSŚUÚWẂYÝZŹaácćeégǵiíkḱlĺmḿnńoópṕrŕsśuúwẃyýzź¨΅ÂẤÅǺÆǼÇḈÊẾÏḮÔỐÕṌØǾÜǗâấåǻæǽçḉêếïḯôốõṍøǿüǘĂẮăắĒḖēḗŌṒōṓŨṸũṹƠỚơớƯỨưứΑΆΕΈΗΉΙΊΟΌΥΎΩΏαάεέηήιίοόυύωώϊΐϋΰϒϓГЃКЌгѓкќἀἄἁἅἈἌἉἍἐἔἑἕἘἜἙἝἠἤἡἥἨἬἩἭἰἴἱἵἸἼἹἽὀὄὁὅὈὌὉὍὐὔὑὕὙὝὠὤὡὥὨὬὩὭ᾿῎῾῞",
	0x302: "AÂCĈEÊGĜHĤIÎJĴOÔSŜUÛWŴYŶZẐaâcĉeêgĝhĥiîjĵoôsŝuûwŵyŷzẑẠẬạậẸỆẹệỌỘọộ",
	0x303: "AÃEẼIĨNÑOÕUŨVṼYỸaãeẽiĩnñoõuũvṽyỹÂẪÊỄÔỖâẫêễôỗĂẴăẵƠỠơỡƯỮưữ",
	0x304: "AĀEĒGḠIĪOŌUŪYȲaāeēgḡiīoōuūyȳÄǞÆǢÕȬÖȪÜǕäǟæǣõȭöȫüǖǪǬǫǭȦǠȧǡȮȰȯȱΑᾹΙῙΥῩαᾱιῑυῡИӢУӮиӣуӯḶḸḷḹṚṜṛṝ",
	0x306: "AĂEĔGĞIĬOŎUŬaăeĕgğiĭoŏuŭȨḜȩḝΑᾸΙῘΥῨαᾰιῐυῠАӐЕӖЖӁИЙУЎаӑеӗжӂийуўẠẶạặ",
	0x307: "AȦBḂCĊDḊEĖFḞGĠHḢIİMṀNṄOȮPṖRṘSṠTṪWẆXẊYẎZŻaȧbḃcċdḋeėfḟgġhḣmṁnṅoȯpṗrṙsṡtṫwẇxẋyẏzżŚṤśṥŠṦšṧſẛṢṨṣṩ",
	0x308: "AÄEËHḦIÏOÖUÜWẄXẌYŸaäeëhḧiïoötẗuüwẅxẍyÿÕṎõṏŪṺūṻΙΪΥΫιϊυϋϒϔІЇАӒЕЁЖӜЗӞИӤОӦУӰЧӴЫӸЭӬаӓеёжӝзӟиӥоӧуӱчӵыӹэӭіїӘӚәӛӨӪөӫ",
	0x309: "AẢEẺIỈOỎUỦYỶaảeẻiỉoỏuủyỷÂẨÊỂÔỔâẩêểôổĂẲăẳƠỞơởƯỬưử",
	0x30A: "AÅUŮaåuůwẘyẙ",
	0x30B: "OŐUŰoőuűУӲуӳ",
	0x30C: "AǍCČDĎEĚGǦHȞIǏKǨLĽNŇOǑRŘSŠTŤUǓZŽaǎcčdďeěgǧhȟiǐjǰkǩlľnňoǒrřsštťuǔzžÜǙüǚƷǮʒǯ",
	0x30F: "AȀEȄIȈOȌRȐUȔaȁeȅiȉoȍrȑuȕѴѶѵѷ",
	0x311: "AȂEȆIȊOȎRȒUȖaȃeȇiȋoȏrȓuȗ",
	0x313: "ΑἈΕἘΗἨΙἸΟὈΩὨαἀεἐηἠιἰοὀρῤυὐωὠ",
	0x314: "ΑἉΕἙΗἩΙἹΟὉΡῬΥὙΩὩαἁεἑηἡιἱοὁρῥυὑωὡ",
	0x31B: "OƠUƯoơuư",
	0x323: "AẠBḄDḌEẸHḤIỊKḲLḶMṂNṆOỌRṚSṢTṬUỤVṾWẈYỴZẒaạbḅdḍeẹhḥiịkḳlḷmṃnṇoọrṛsṣtṭuụvṿwẉyỵzẓƠỢơợƯỰưự",
	0x324: "UṲuṳ",
	0x325: "AḀaḁ",
	0x326: "SȘTȚsștț",
	0x327: "CÇDḐEȨGĢHḨKĶLĻNŅRŖSŞTŢcçdḑeȩgģhḩkķlļnņrŗsştţ",
	0x328: "AĄEĘIĮOǪUŲaąeęiįoǫuų",
	0x32D: "DḒEḘLḼNṊTṰUṶdḓeḙlḽnṋtṱuṷ",
	0x32E: "HḪhḫ",
	0x330: "EḚIḬUṴeḛiḭuṵ",
	0x331: "BḆDḎKḴLḺNṈRṞTṮZẔbḇdḏhẖkḵlḻnṉrṟtṯzẕ",
	0x338: "<≮=≠>≯←↚→↛↔↮⇐⇍⇒⇏⇔⇎∃∄∈∉∋∌∣∤∥∦∼≁≃≄≅≇≈≉≍≭≡≢≤≰≥≱≲≴≳≵≶≸≷≹≺⊀≻⊁≼⋠≽⋡⊂⊄⊃⊅⊆⊈⊇⊉⊑⋢⊒⋣⊢⊬⊨⊭⊩⊮⊫⊯⊲⋪⊳⋫⊴⋬⊵⋭",
	0x342: "¨῁αᾶηῆιῖυῦωῶϊῗϋῧἀἆἁἇἈἎἉἏἠἦἡἧἨἮἩἯἰἶἱἷἸἾἹἿὐὖὑὗὙὟὠὦὡὧὨὮὩὯ᾿῏῾῟",
	0x345: "ΑᾼΗῌΩῼάᾴήῄαᾳηῃωῳώῴἀᾀἁᾁἂᾂἃᾃἄᾄἅᾅἆᾆἇᾇἈᾈἉᾉἊᾊἋᾋἌᾌἍᾍἎᾎἏᾏἠᾐἡᾑἢᾒἣᾓἤᾔἥᾕἦᾖἧᾗἨᾘἩᾙἪᾚἫᾛἬᾜἭᾝἮᾞἯᾟὠᾠὡᾡὢᾢὣᾣὤᾤὥᾥὦᾦὧᾧὨᾨὩᾩὪᾪὫᾫὬᾬὭᾭὮᾮὯᾯὰᾲὴῂὼῲᾶᾷῆῇῶῷ",
}

// the characters that decompose to one other character (or two that do not compose back)
var texSingle = map[rune]string{0x340: "\u0300", 0x341: "\u0301", 0x343: "\u0313", 0x344: "\u0308\u0301", 0x37E: ";", 0x1F71: "\u03AC", 0x1F73: "\u03AD", 0x1F75: "\u03AE", 0x1F77: "\u03AF", 0x1F79: "\u03CC", 0x1F7B: "\u03CD", 0x1F7D: "\u03CE", 0x1FBB: "\u0386", 0x1FC9: "\u0388", 0x1FCB: "\u0389", 0x1FD3: "\u0390", 0x1FDB: "\u038A", 0x1FE3: "\u03B0", 0x1FEB: "\u038E", 0x1FEE: "\u0385", 0x1FEF: "`", 0x1FF9: "\u038C", 0x1FFB: "\u038F", 0x212A: "K", 0x212B: "Å", 0x2ADC: "\u2ADD\u0338"}

// the canonical combining class of U+0300..U+036F, which decides how marks are ordered and which compose
var texMarkClass = [0x70]uint8{
	230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 232, 220, 220, 220, 220, 232, 216,
	220, 220, 220, 220, 220, 202, 202, 220, 220, 220, 220, 202, 202, 220, 220, 220, 220, 220, 220, 220, 220, 220, 220, 220, 1, 1, 1, 1,
	1, 220, 220, 220, 220, 230, 230, 230, 230, 230, 230, 230, 230, 240, 230, 220, 220, 220, 230, 230, 230, 220, 220, 0, 230, 230, 230, 220,
	220, 220, 220, 230, 232, 220, 220, 230, 233, 234, 234, 233, 234, 234, 233, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230, 230,
}

var texPair, texSplit = func() (map[[2]rune]rune, map[rune][2]rune) {
	p, s := map[[2]rune]rune{}, map[rune][2]rune{}
	for m, l := range texCompose {
		r := []rune(l)
		for i := 0; i+1 < len(r); i += 2 {
			p[[2]rune{r[i], m}] = r[i+1]
			s[r[i+1]] = [2]rune{r[i], m}
		}
	}
	return p, s
}()

func texClass(c rune) uint8 {
	if c >= 0x300 && c <= 0x36f {
		return texMarkClass[c-0x300]
	}
	return 0
}

// canonical decomposition, canonical order and canonical composition, as Unicode's NFC for these marks
func texNFC(name string) string {
	var r []rune
	var split func(c rune)
	split = func(c rune) {
		if d, ok := texSingle[c]; ok {
			for _, x := range d {
				split(x)
			}
		} else if p, ok := texSplit[c]; ok {
			split(p[0])
			r = append(r, p[1])
		} else {
			r = append(r, c)
		}
	}
	for _, c := range name {
		split(c)
	}
	for i := 1; i < len(r); i++ {
		for j := i; j > 0 && texClass(r[j]) != 0 && texClass(r[j-1]) > texClass(r[j]); j-- {
			r[j], r[j-1] = r[j-1], r[j]
		}
	}
	out := r[:0]
	start, last := -1, uint8(0)
	for _, c := range r {
		cc := texClass(c)
		if start >= 0 && (len(out)-1 == start || last != 0 && last < cc) {
			if k, ok := texPair[[2]rune{out[start], c}]; ok {
				out[start] = k
				continue
			}
		}
		if cc == 0 {
			start = len(out)
		}
		last = cc
		out = append(out, c)
	}
	return string(out)
}

func latinName(name string) string {
	var b strings.Builder
	for _, c := range texNFC(name) {
		if c >= 0x300 && c <= 0x36f {
			continue
		}
		low := unicode.ToLower(c)
		t, ok := texLatin[low]
		switch {
		case !ok:
			b.WriteRune(c)
		case t == "-":
		case c == low:
			b.WriteString(t)
		default:
			b.WriteString(strings.ToUpper(t[:1]) + t[1:])
		}
	}
	return b.String()
}

// a name as figures were called before the rule above: an existing figure keeps its files
func plainStem(name string) string {
	if i := strings.LastIndex(name, "."); i > 0 {
		name = name[:i]
	}
	s := texLead.ReplaceAllString(texBad.ReplaceAllString(name, "_"), "")
	if s == "" {
		return "figure"
	}
	return s
}

func texStem(name string) string { return plainStem(latinName(name)) }
