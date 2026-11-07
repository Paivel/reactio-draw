// Reactio Draw for Mac: its own window around the page (system WebKit), with native Save/Open panels
// and the clipboard for Word. Built on the Mac by "Install Reactio Draw.command" (swiftc from the Command Line Tools).
import Cocoa
import WebKit
import PDFKit
import Network
import Vision
import ImageIO
import CryptoKit

let GV = NSPasteboard.PasteboardType("com.microsoft.Art--GVML-ClipFormat")

/* Command line: "ReactioDraw --cli <command> …" (the reactio script beside it in the app) runs the page without
   showing a window. The files named on the command line are read here and handed to the page with the arguments; the
   page answers with cliDone {out, err, code, writes}, and only the path after -o (or files inside that folder) is written. */
/* The folders the AI assistants (reactio-mcp) may read and write, set in Info → API → Folders for AI assistants and kept
   in allowed-folders.json beside api.json: added only through this app's own folder panel, taken off only by the user's
   click; nothing that comes in through the API or MCP changes it. reactio-mcp applies the rules (mcp/folders.go). The
   command line (reactio) is the user's own and is not limited by it. */
let rdConfigDir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/ReactioDraw").path
/* the AI add-on ("Reactio Draw — AI assistants") is installed: reactio-mcp inside the app */
func aiKitInstalled() -> Bool { FileManager.default.isExecutableFile(atPath: Bundle.main.bundlePath + "/Contents/MacOS/reactio-mcp") }
func defaultFolders() -> [String] { return [] }  /* no folder until the user adds one */
func allowedFolders() -> [String] {
    guard let d = try? Data(contentsOf: URL(fileURLWithPath: rdConfigDir + "/allowed-folders.json")),
          let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any], let f = o["folders"] as? [String] else { return defaultFolders() }
    return f
}
func saveFolders(_ list: [String]) {
    try? FileManager.default.createDirectory(atPath: rdConfigDir, withIntermediateDirectories: true)
    if let d = try? JSONSerialization.data(withJSONObject: ["folders": list], options: [.prettyPrinted]) {
        let p = rdConfigDir + "/allowed-folders.json"
        try? d.write(to: URL(fileURLWithPath: p)); try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: p)
    }
}
let cliArgs: [String]? = CommandLine.arguments.count > 1 && CommandLine.arguments[1] == "--cli" ? Array(CommandLine.arguments.dropFirst(2)) : nil
var cliOut = ""
func cliErr(_ s: String) { FileHandle.standardError.write(s.data(using: .utf8) ?? Data()) }
func cliScript(_ args: [String]) -> String {
    var files: [String: [String: String]] = [:], dirs: [String] = []
    let fm = FileManager.default
    var i = 0
    while i < args.count {
        let a = args[i]
        var isDir: ObjCBool = false
        if a == "-o" || a == "--output" {
            if i + 1 < args.count {
                let p = args[i + 1]
                cliOut = URL(fileURLWithPath: p).standardizedFileURL.path
                if fm.fileExists(atPath: p, isDirectory: &isDir), isDir.boolValue { dirs.append(p) }
            }
            i += 2; continue
        }
        if fm.fileExists(atPath: a, isDirectory: &isDir), !isDir.boolValue,
           let d = try? Data(contentsOf: URL(fileURLWithPath: a)), d.count < 64 << 20 {
            files[a] = ["name": (a as NSString).lastPathComponent, "b64": d.base64EncodedString()]
        }
        i += 1
    }
    let obj: [String: Any] = ["argv": args, "files": files, "dirs": dirs]
    let j = (try? JSONSerialization.data(withJSONObject: obj)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
    return "window.__rdCli=\(j);"
}
func cliDone(_ msg: String) -> Never {
    guard let d = msg.data(using: .utf8), let r = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] else {
        cliErr("reactio: bad answer from the page\n"); cliExit(1)
    }
    var err = r["err"] as? String ?? ""
    var code = (r["code"] as? NSNumber)?.int32Value ?? 1
    let root = cliOut.hasSuffix("/") ? cliOut : cliOut + "/"
    for w in r["writes"] as? [[String: Any]] ?? [] {
        let path = w["path"] as? String ?? ""
        let p = URL(fileURLWithPath: path).standardizedFileURL.path
        if cliOut.isEmpty || !(p == cliOut || p.hasPrefix(root)) { err += "reactio: not written (outside -o): \(path)\n"; code = 1; continue }
        let data = Data(base64Encoded: w["b64"] as? String ?? "") ?? Data()
        try? FileManager.default.createDirectory(at: URL(fileURLWithPath: p).deletingLastPathComponent(), withIntermediateDirectories: true)
        do { try data.write(to: URL(fileURLWithPath: p)) } catch { err += "reactio: \(error.localizedDescription)\n"; code = 1 }
    }
    FileHandle.standardOutput.write((r["out"] as? String ?? "").data(using: .utf8) ?? Data())
    cliErr(err)
    cliExit(code)
}
func cliExit(_ code: Int32) -> Never { Opsin.shared.stop(); Namer.shared.stop(); exit(code) }

/* The page may write only to files the user chose: in a Save or Open panel, or opened from Finder. A path the page
   makes up is refused, so a document cannot make the app overwrite other files. The list is kept in the app's
   preferences, so a document restored after a restart can still be saved to its own file. */
func normPath(_ p: String) -> String { return URL(fileURLWithPath: p).standardizedFileURL.path.lowercased() }
func allowPath(_ p: String) {
    if p.isEmpty { return }
    let n = normPath(p)
    var list = UserDefaults.standard.stringArray(forKey: "rd.allowedPaths") ?? []
    list.removeAll { $0 == n }
    list.insert(n, at: 0)
    if list.count > 500 { list = Array(list.prefix(500)) }
    UserDefaults.standard.set(list, forKey: "rd.allowedPaths")
}
/* the page may add .reactio (or .json) to a name chosen in Save as when the extension is not one it saves */
func pathAllowed(_ p: String) -> Bool {
    let n = normPath(p)
    let list = UserDefaults.standard.stringArray(forKey: "rd.allowedPaths") ?? []
    return list.contains(n) || list.contains { $0 + ".json" == n || $0 + ".reactio" == n }
}

/* Update (Info → Check for updates, then Update): only when the person asks. The newest release's Mac archive (and the
   AI-assistants add-on, when it is installed) is downloaded, checked against the SHA-256 GitHub gives for it and
   unpacked; then its own installer starts and waits: the app closes as on Quit (unsaved documents are asked about
   first), and the installer builds the new app in the same folder and opens it. */
final class Updater: NSObject {
    static let shared = Updater()
    var busy = false
    var obs: NSKeyValueObservation?
    weak var bridge: Bridge?
    let api = "https://api.github.com/repos/Paivel/reactio-draw/releases/latest"
    let dl = "https://github.com/Paivel/reactio-draw/releases/download/"

    func run(_ b: Bridge, id: String, tag: String) {
        if busy { b.reply(id, ["ok": false, "err": "an update is already running"]); return }
        busy = true; bridge = b
        DispatchQueue.global(qos: .userInitiated).async { self.work(id, tag) }
    }
    func fail(_ id: String, _ msg: String) {
        DispatchQueue.main.async { self.busy = false; self.bridge?.reply(id, ["ok": false, "err": msg]) }
    }
    func progress(_ p: Double) {
        let js = "window.__rdUpdProgress&&window.__rdUpdProgress(" + String(format: "%.3f", p) + ")"
        DispatchQueue.main.async { self.bridge?.web?.evaluateJavaScript(js, completionHandler: nil) }
    }
    @discardableResult func sh(_ path: String, _ args: [String]) -> Int32 {
        let p = Process(); p.executableURL = URL(fileURLWithPath: path); p.arguments = args
        p.standardOutput = FileHandle.nullDevice; p.standardError = FileHandle.nullDevice
        do { try p.run() } catch { return -1 }
        p.waitUntilExit(); return p.terminationStatus
    }
    func getJSON() -> [String: Any]? {
        var req = URLRequest(url: URL(string: api)!, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 30)
        req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        var out: Data?
        let sem = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: req) { d, r, _ in
            if (r as? HTTPURLResponse)?.statusCode == 200 { out = d }
            sem.signal()
        }.resume()
        sem.wait()
        guard let d = out else { return nil }
        return (try? JSONSerialization.jsonObject(with: d)) as? [String: Any]
    }
    /* one asset into dir, its SHA-256 checked; done/total: the share of all downloads before it and its own */
    func download(_ a: [String: Any], into dir: URL, before: Double, total: Double) -> (URL?, String) {
        guard let name = a["name"] as? String, let s = a["browser_download_url"] as? String, s.hasPrefix(dl), let url = URL(string: s),
              let size = a["size"] as? Double, size > 0, size < 400 * 1048576 else { return (nil, "unexpected download") }
        let want = ((a["digest"] as? String) ?? "").lowercased().replacingOccurrences(of: "sha256:", with: "")
        if want.count != 64 { return (nil, "GitHub gives no SHA-256 for \(name): not installed") }
        let dst = dir.appendingPathComponent(name)
        var err = ""
        let sem = DispatchSemaphore(value: 0)
        let t = URLSession.shared.downloadTask(with: URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 60)) { tmp, r, e in
            if let tmp = tmp, (r as? HTTPURLResponse)?.statusCode == 200 {
                do { try FileManager.default.moveItem(at: tmp, to: dst) } catch { err = error.localizedDescription }
            } else { err = e?.localizedDescription ?? "the download of \(name) failed" }
            sem.signal()
        }
        obs = t.progress.observe(\.fractionCompleted) { pr, _ in self.progress((before + pr.fractionCompleted * size) / total) }
        t.resume()
        sem.wait()
        obs = nil
        if !err.isEmpty { return (nil, err) }
        guard let data = try? Data(contentsOf: dst, options: .mappedIfSafe), Double(data.count) == size else { return (nil, "the download of \(name) is incomplete") }
        let got = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        if got != want { return (nil, "the download of \(name) does not match its SHA-256: not installed") }
        return (dst, "")
    }
    func work(_ id: String, _ tag: String) {
        guard sh("/usr/bin/xcrun", ["-f", "swiftc"]) == 0 else {
            fail(id, "updating builds the app on this Mac and needs Apple's Command Line Tools; install the new version from its download instead"); return
        }
        guard let j = getJSON(), let rtag = j["tag_name"] as? String, let assets = j["assets"] as? [[String: Any]] else {
            fail(id, "could not reach GitHub"); return
        }
        if !tag.isEmpty && rtag != tag { fail(id, "the newest version changed meanwhile (\(rtag)): check again"); return }
        func asset(_ n: String) -> [String: Any]? { assets.first { ($0["name"] as? String) == n } }
        guard let main = asset("ReactioDraw-Mac.zip") else { fail(id, "ReactioDraw-Mac.zip is not in release \(rtag)"); return }
        let kit = aiKitInstalled() ? asset("ReactioDraw-Mac-AI-assistants.zip") : nil
        let fm = FileManager.default
        let work = fm.temporaryDirectory.appendingPathComponent("ReactioDraw-update-" + UUID().uuidString)
        do { try fm.createDirectory(at: work, withIntermediateDirectories: true) } catch { fail(id, error.localizedDescription); return }
        let sMain = (main["size"] as? Double) ?? 1, sKit = (kit?["size"] as? Double) ?? 0
        let (zMain, e1) = download(main, into: work, before: 0, total: sMain + sKit)
        guard let zm = zMain else { fail(id, e1); return }
        let mainDir = work.appendingPathComponent("main")
        guard sh("/usr/bin/ditto", ["-x", "-k", zm.path, mainDir.path]) == 0 else { fail(id, "could not unpack \(zm.lastPathComponent)"); return }
        let inst = mainDir.appendingPathComponent("Reactio Draw/Files/Install Reactio Draw.command")
        guard fm.fileExists(atPath: inst.path) else { fail(id, "the archive has no installer"); return }
        if let k = kit {
            let (zKit, e2) = download(k, into: work, before: sMain, total: sMain + sKit)
            guard let zk = zKit else { fail(id, e2); return }
            let kitDir = work.appendingPathComponent("kit")
            guard sh("/usr/bin/ditto", ["-x", "-k", zk.path, kitDir.path]) == 0 else { fail(id, "could not unpack \(zk.lastPathComponent)"); return }
            #if arch(arm64)
            let m = "reactio-mcp-arm64"
            #else
            let m = "reactio-mcp-x86_64"
            #endif
            /* the new reactio-mcp goes into this app; the installer carries it into the app it builds */
            let src = kitDir.appendingPathComponent("Reactio Draw - AI assistants/Files/" + m)
            let dst = URL(fileURLWithPath: Bundle.main.bundlePath + "/Contents/MacOS/reactio-mcp")
            let tmp = URL(fileURLWithPath: dst.path + ".new")
            try? fm.removeItem(at: tmp)
            do {
                try fm.copyItem(at: src, to: tmp)
                try fm.setAttributes([.posixPermissions: 0o755], ofItemAtPath: tmp.path)
                _ = try fm.replaceItemAt(dst, withItemAt: tmp)
            } catch { fail(id, "could not put the new reactio-mcp in place: \(error.localizedDescription)"); return }
        }
        progress(1)
        /* the installer runs on its own (it outlives this app): once the app has closed it builds the new one and opens it */
        let log = work.appendingPathComponent("install.log").path
        let p = Process(); p.executableURL = URL(fileURLWithPath: "/bin/bash")
        p.arguments = ["-c", "nohup /bin/bash \"$0\" >\"$1\" 2>&1 &", inst.path, log]
        var env = ProcessInfo.processInfo.environment
        env["RD_ASK"] = "1"; env["RD_DEST"] = (Bundle.main.bundlePath as NSString).deletingLastPathComponent
        env["RD_WAIT_PID"] = String(ProcessInfo.processInfo.processIdentifier)
        p.environment = env
        do { try p.run(); p.waitUntilExit() } catch { fail(id, "could not start the installer: \(error.localizedDescription)"); return }
        DispatchQueue.main.async { self.busy = false; self.bridge?.reply(id, ["ok": true, "tag": rtag, "restart": "quit", "build": true]) }
    }
}

final class Bridge: NSObject, WKScriptMessageHandler, NSWindowDelegate {
    weak var web: WKWebView?
    var lastCC = NSPasteboard.general.changeCount

    func reply(_ id: String, _ obj: [String: Any]) {
        guard let d = try? JSONSerialization.data(withJSONObject: obj), let s = String(data: d, encoding: .utf8),
              let idj = try? JSONSerialization.data(withJSONObject: [id, s]), let args = String(data: idj, encoding: .utf8) else { return }
        // args is ["id","{...}"]
        web?.evaluateJavaScript("window.__rdReply.apply(null,\(args))", completionHandler: nil)
    }

    func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let s = message.body as? String, let d = s.data(using: .utf8),
              let m = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any],
              let id = m["id"] as? String, let cmd = m["cmd"] as? String else { return }
        switch cmd {
        case "save":
            let p = NSSavePanel(); p.nameFieldStringValue = m["name"] as? String ?? "Reactio Draw"; p.canCreateDirectories = true
            if p.runModal() == .OK, let url = p.url, let b = m["b64"] as? String, let data = Data(base64Encoded: b) {
                do { try data.write(to: url); allowPath(url.path); reply(id, ["ok": true, "path": url.path]) } catch { reply(id, ["ok": false, "error": "\(error)"]) }
            } else { reply(id, ["ok": false]) }
        case "open":
            let o = NSOpenPanel(); o.allowsMultipleSelection = false; o.canChooseDirectories = false
            if o.runModal() == .OK, let url = o.url, let data = try? Data(contentsOf: url) {
                allowPath(url.path)
                reply(id, ["name": url.lastPathComponent, "path": url.path, "b64": data.base64EncodedString()])
            } else { reply(id, ["cancel": true]) }
        case "saveAs":
            // Save as: the panel only; the page then writes the file in the format the name asks for
            let p = NSSavePanel(); p.nameFieldStringValue = m["name"] as? String ?? "Reactio Draw.reactio"; p.canCreateDirectories = true
            p.allowsOtherFileTypes = true; p.isExtensionHidden = false
            let chosen = p.runModal() == .OK ? (p.url?.path ?? "") : ""
            allowPath(chosen)
            reply(id, ["path": chosen])
        case "write":
            guard let path = m["path"] as? String, !path.isEmpty, let d = Data(base64Encoded: m["b64"] as? String ?? "") else { reply(id, ["ok": false, "err": "no file"]); return }
            if !pathAllowed(path) { reply(id, ["ok": false, "ask": true]); return }
            do { try d.write(to: URL(fileURLWithPath: path), options: .atomic); reply(id, ["ok": true]) } catch { reply(id, ["ok": false, "err": "\(error.localizedDescription)"]) }
        case "link":
            // a link on the page (Credits, what is new) opens in the default browser; only web addresses
            if let s = m["url"] as? String, let u = URL(string: s), ["http", "https"].contains(u.scheme?.lowercased() ?? "") {
                NSWorkspace.shared.open(u); reply(id, ["ok": true])
            } else { reply(id, ["ok": false]) }
        case "print":
            // Print: the page sends the drawing as a PDF; it goes to the Mac's own print dialog, no wider than the page
            // (the dialog's PDF menu saves it as a file too)
            guard let data = Data(base64Encoded: m["b64"] as? String ?? ""), let doc = PDFDocument(data: data) else { reply(id, ["ok": false]); return }
            let pi = (NSPrintInfo.shared.copy() as? NSPrintInfo) ?? NSPrintInfo.shared
            pi.isHorizontallyCentered = true; pi.isVerticallyCentered = false
            guard let op = doc.printOperation(for: pi, scalingMode: .pageScaleDownToFit, autoRotate: true) else { reply(id, ["ok": false]); return }
            op.jobTitle = m["name"] as? String ?? "Reactio Draw"
            op.showsPrintPanel = true; op.showsProgressPanel = true
            reply(id, ["ok": true])
            if let w = web?.window { op.runModal(for: w, delegate: nil, didRun: nil, contextInfo: nil) } else { op.run() }
        case "quit":
            reply(id, ["ok": true]); Bridge.quitOK = true; NSApp.terminate(nil)
        case "wordReturn":
            // a drawing edited for Word (Reactio Draw tab in Word: Edit in Reactio Draw): its picture, its drawing tag and an SVG go to
            // the exchange folder Word can read (Office's group container), then Word is asked to run the tab's RD_Update macro,
            // which puts the new picture in place of the old one. The first time, macOS asks to let Reactio Draw control Word.
            let wid = m["wid"] as? String ?? ""
            guard wid.range(of: "^[A-Za-z0-9_-]{1,64}$", options: .regularExpression) != nil,
                  let png = Data(base64Encoded: m["png"] as? String ?? ""), !png.isEmpty else { reply(id, ["ok": false, "err": "no drawing"]); return }
            let dir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Group Containers/UBF8T346G9.Office/Reactio Draw", isDirectory: true)
            do {
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
                try png.write(to: dir.appendingPathComponent(wid + ".png"), options: .atomic)
                let svg = m["svg"] as? String ?? ""
                if !svg.isEmpty { try Data(svg.utf8).write(to: dir.appendingPathComponent(wid + ".svg"), options: .atomic) }
                try Data((m["tag"] as? String ?? "").utf8).write(to: dir.appendingPathComponent(wid + ".tag"), options: .atomic)
            } catch { reply(id, ["ok": false, "err": error.localizedDescription]); return }
            var err: NSDictionary?
            _ = NSAppleScript(source: "tell application \"Microsoft Word\" to run VB macro macro name \"RD_Update\"")?.executeAndReturnError(&err)
            reply(id, ["ok": true, "word": err == nil])
        case "clipgvml":
            guard let g = Data(base64Encoded: m["gvml"] as? String ?? ""), let png = Data(base64Encoded: m["png"] as? String ?? "") else { reply(id, ["ok": false]); return }
            let pb = NSPasteboard.general; pb.clearContents()
            let it = NSPasteboardItem(); it.setData(g, forType: GV); it.setData(png, forType: .png)
            // Ctrl+C also carries the CDXML text: chemistry editors and Reactio Draw paste structures from it
            if let t = m["text"] as? String, !t.isEmpty { it.setString(t, forType: .string) }
            let ok = pb.writeObjects([it]); lastCC = pb.changeCount; reply(id, ["ok": ok])
        case "clipown":
            // a Reactio Draw object copied in Word (made on Windows): Word on Mac puts the object's storage here
            if let d = NSPasteboard.general.data(forType: NSPasteboard.PasteboardType("com.microsoft.Embedded-Object")), !d.isEmpty {
                reply(id, ["b64": d.base64EncodedString()])
            } else if let c = Bridge.cdxData() {
                // copied in a chemistry editor: its binary drawing (CDX) or CDXML text, whatever type name it goes by
                reply(id, c)
            } else if let tag = Bridge.findTag(NSPasteboard.general.pasteboardItems ?? []) {
                // a Reactio Draw picture copied in Word or PowerPoint before the app was running
                reply(id, ["tag": tag])
            } else { reply(id, [:]) }
        case "apiStart":
            // the local API listens only after it is turned on in the page (Info tab), never by itself; never from the
            // command line, which runs beside the open app and must not take its api.json
            if cliArgs != nil { reply(id, ["ok": false]); return }
            /* only with the AI add-on installed (reactio-mcp inside the app): without it the API never starts */
            if !aiKitInstalled() { reply(id, ["ok": false, "noKit": true]); return }
            if let w = web { LocalAPI.shared.start(web: w) }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { self.reply(id, ["ok": LocalAPI.shared.port > 0, "port": LocalAPI.shared.port]) }
        case "apiStop":
            if cliArgs == nil { LocalAPI.shared.stop() }
            reply(id, ["ok": true])
        case "update":
            // Info → Check for updates → Update: download, check and install the new version (Updater below)
            if cliArgs != nil { reply(id, ["ok": false, "err": "not from the command line"]); return }
            Updater.shared.run(self, id: id, tag: m["name"] as? String ?? "")
        case "aiKit":
            reply(id, ["installed": aiKitInstalled()])
        case "aiFolders":
            reply(id, ["folders": allowedFolders()])
        case "aiFolderAdd":
            /* the only way a folder is added: this panel, chosen by the user */
            let o = NSOpenPanel(); o.canChooseDirectories = true; o.canChooseFiles = false; o.allowsMultipleSelection = false; o.canCreateDirectories = true
            o.message = "A folder the AI assistants may read and write"
            if o.runModal() == .OK, let u = o.url {
                var list = allowedFolders()
                if !list.contains(where: { $0.lowercased() == u.path.lowercased() }) { list.append(u.path); saveFolders(list) }
            }
            reply(id, ["folders": allowedFolders()])
        case "aiFolderRemove":
            let p = (m["path"] as? String ?? "").lowercased()
            saveFolders(allowedFolders().filter { $0.lowercased() != p })
            reply(id, ["folders": allowedFolders()])
        case "cliDone":
            cliDone(m["msg"] as? String ?? "")
        case "apiResult":
            LocalAPI.shared.deliver(m["name"] as? String ?? "", m["msg"] as? String ?? "")
            reply(id, ["ok": true])
        case "iupac":
            let smi = m["name"] as? String ?? ""
            Namer.queue.async {
                let r = Namer.shared.name(for: smi)
                DispatchQueue.main.async { self.reply(id, r) }
            }
        case "opsin":
            // OPSIN may take a second to start: work off the main thread, answer on it
            let name = m["name"] as? String ?? ""
            Opsin.queue.async {
                let r = Opsin.shared.smiles(for: name)
                DispatchQueue.main.async { self.reply(id, r) }
            }
        case "ocr":
            // the text lines of a picture (macOS Vision, on this Mac): each with its box in the picture's pixels, top-left origin
            let b64 = m["b64"] as? String ?? ""
            DispatchQueue.global(qos: .userInitiated).async {
                var out: [[String: Any]] = []
                var err: String? = nil
                if let d = Data(base64Encoded: b64), let src = CGImageSourceCreateWithData(d as CFData, nil),
                   let img = CGImageSourceCreateImageAtIndex(src, 0, nil) {
                    let w = Double(img.width), h = Double(img.height)
                    let req = VNRecognizeTextRequest()
                    req.recognitionLevel = .accurate
                    req.usesLanguageCorrection = false
                    do {
                        try VNImageRequestHandler(cgImage: img, options: [:]).perform([req])
                        let obs = (req.results as? [VNRecognizedTextObservation]) ?? []
                        for o in obs {
                            guard let c = o.topCandidates(1).first else { continue }
                            let bb = o.boundingBox
                            out.append(["text": c.string, "conf": Double(c.confidence),
                                        "x0": Double(bb.minX) * w, "y0": (1 - Double(bb.maxY)) * h,
                                        "x1": Double(bb.maxX) * w, "y1": (1 - Double(bb.minY)) * h])
                        }
                    } catch { err = "\(error)" }
                } else { err = "the picture could not be read" }
                DispatchQueue.main.async {
                    if let e = err { self.reply(id, ["ok": false, "error": e]) } else { self.reply(id, ["ok": true, "lines": out]) }
                }
            }
        case "ocsr":
            // structures read from boxes of a picture by MolScribe, when it is installed apart (reactio_ocsr.py, README)
            let req: [String: Any] = ["b64": m["b64"] as? String ?? "", "boxes": (m["boxes"] as? [Any]) ?? [Any]()]
            DispatchQueue.global(qos: .userInitiated).async {
                let ans = OCSR.run(req)
                DispatchQueue.main.async { self.reply(id, ans) }
            }
        default: reply(id, ["ok": false])
        }
    }

    /* a Reactio Draw picture copied in Word or PowerPoint: add its drawing as text, so Cmd+V in Reactio Draw restores it */
    @objc func watchClipboard() {
        let pb = NSPasteboard.general
        guard pb.changeCount != lastCC else { return }
        lastCC = pb.changeCount
        guard let items = pb.pasteboardItems, let it = items.first else { return }
        if let s = it.string(forType: .string), s.range(of: Bridge.tagRe, options: .regularExpression) != nil { return }
        guard let tag = Bridge.findTag(items) else { return }
        let ni = NSPasteboardItem()
        for t in it.types where t != .string { if let d = it.data(forType: t), !d.isEmpty { ni.setData(d, forType: t) } }
        ni.setString(tag, forType: .string)
        pb.clearContents(); pb.writeObjects([ni]); lastCC = pb.changeCount
    }

    /* the drawing tag (RDRAW1:...) wherever Office put it: the alt text in the drawing XML (Word), the PNG text chunk
       of the picture (PowerPoint drops alt text), inside zipped clipboard packages, in any pasteboard type */
    /* the tag that carries a Reactio Draw drawing inside a picture */
    static let tagRe = "RDRAW1:[A-Za-z0-9+/=]+"

    static func findTag(_ items: [NSPasteboardItem]) -> String? {
        let re = tagRe
        for it in items {
            for t in it.types {
                guard let d = it.data(forType: t), d.count > 20, d.count < 80_000_000 else { continue }
                var hay = String(decoding: d, as: UTF8.self)
                if hay.range(of: re, options: .regularExpression) == nil, d.prefix(2) == Data("PK".utf8) { hay = unzipped(d, "*") ?? "" }
                if let r = hay.range(of: re, options: .regularExpression) { return "Reactio Draw drawing " + hay[r] }
            }
        }
        return nil
    }

    /* Help > Clipboard Report: what the clipboard holds now (types, sizes, where a drawing tag was found), saved to Downloads */
    static func clipReport() -> URL? {
        let pb = NSPasteboard.general
        var lines = ["Reactio Draw clipboard report", "changeCount \(pb.changeCount)", ""]
        for (n, it) in (pb.pasteboardItems ?? []).enumerated() {
            lines.append("item \(n)")
            for t in it.types {
                let d = it.data(forType: t) ?? Data()
                var found = String(decoding: d, as: UTF8.self).range(of: tagRe, options: .regularExpression) != nil
                var note = ""
                if !found, d.prefix(2) == Data("PK".utf8) { found = (unzipped(d, "*") ?? "").range(of: tagRe, options: .regularExpression) != nil; note = " zip" }
                lines.append("  \(t.rawValue)  \(d.count) bytes\(note)\(found ? "  <- drawing tag found" : "")")
            }
        }
        let url = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0].appendingPathComponent("Reactio Draw clipboard report.txt")
        do { try lines.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8) } catch { return nil }
        return url
    }

    static func cdxData() -> [String: Any]? {
        guard let it = NSPasteboard.general.pasteboardItems?.first else { return nil }
        for t in it.types {
            guard let d = it.data(forType: t), d.count > 30 else { continue }
            if d.prefix(8) == Data("VjCD0100".utf8) { return ["cdx": d.base64EncodedString()] }
        }
        for t in it.types where t.rawValue.lowercased().contains("cdx") {
            if let d = it.data(forType: t), let x = String(data: d, encoding: .utf8), x.contains("<CDXML") { return ["cdxml": x] }
        }
        return nil
    }

    static func drawingXML(_ zip: Data) -> String? { unzipped(zip, "clipboard/drawings/*.xml") }

    static func unzipped(_ zip: Data, _ pattern: String) -> String? {
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("rd-gvml.zip")
        guard (try? zip.write(to: tmp)) != nil else { return nil }
        let p = Process(); p.executableURL = URL(fileURLWithPath: "/usr/bin/unzip"); p.arguments = ["-p", tmp.path, pattern]
        let out = Pipe(); p.standardOutput = out; p.standardError = Pipe()
        do { try p.run() } catch { return nil }
        let d = out.fileHandleForReading.readDataToEndOfFile(); p.waitUntilExit()
        return String(decoding: d, as: UTF8.self)
    }

    /* closing the window or quitting asks the page first: documents with unsaved changes ask to be saved */
    static var quitOK = false
    func askQuit() { web?.evaluateJavaScript("window.__rdBeforeQuit?window.__rdBeforeQuit():window.webkit.messageHandlers.rd.postMessage(JSON.stringify({id:'x',cmd:'quit'}))", completionHandler: nil) }
    func windowShouldClose(_ sender: NSWindow) -> Bool { if Bridge.quitOK { return true }; askQuit(); return false }
    func windowWillClose(_ notification: Notification) { Opsin.shared.stop(); Namer.shared.stop(); LocalAPI.shared.stop(); NSApp.terminate(nil) }
}


/* Name → structure: OPSIN (MIT, https://github.com/dan2097/opsin), shipped unchanged in the app's Resources and run
   as a separate Java program that stays running and answers one SMILES line per name line */
final class Opsin {
    static let shared = Opsin()
    static let queue = DispatchQueue(label: "opsin")
    var proc: Process?
    var inH: FileHandle?
    var outH: FileHandle?
    var errBuf = Data()
    let errLock = NSLock()
    var outBuf = Data()

    func javaPath() -> String? {
        var c: [String] = []
        if let h = ProcessInfo.processInfo.environment["JAVA_HOME"] { c.append(h + "/bin/java") }
        // /usr/libexec/java_home knows the installed JDKs; plain /usr/bin/java is only a stub when none is installed
        let p = Process(); p.executableURL = URL(fileURLWithPath: "/usr/libexec/java_home")
        let o = Pipe(); p.standardOutput = o; p.standardError = Pipe()
        if (try? p.run()) != nil { p.waitUntilExit()
            if p.terminationStatus == 0 { let h = String(decoding: o.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines); if !h.isEmpty { c.append(h + "/bin/java") } } }
        c += ["/opt/homebrew/opt/openjdk/bin/java", "/usr/local/opt/openjdk/bin/java"]
        return c.first { FileManager.default.isExecutableFile(atPath: $0) }
    }

    func start() -> String? {
        guard let java = javaPath() else { return "nojava" }
        guard let jar = Bundle.main.path(forResource: "opsin", ofType: "jar") else { return "noopsin" }
        let p = Process(); p.executableURL = URL(fileURLWithPath: java); p.arguments = ["-jar", jar, "-osmi"]
        let i = Pipe(), o = Pipe(), e = Pipe(); p.standardInput = i; p.standardOutput = o; p.standardError = e
        e.fileHandleForReading.readabilityHandler = { [weak self] h in let d = h.availableData; guard let s = self else { return }; s.errLock.lock(); s.errBuf.append(d); if s.errBuf.count > 4000 { s.errBuf = s.errBuf.suffix(4000) }; s.errLock.unlock() }
        do { try p.run() } catch { return "nojava" }
        proc = p; inH = i.fileHandleForWriting; outH = o.fileHandleForReading; outBuf = Data()
        return nil
    }

    func stop() { proc?.terminate(); proc = nil }

    func readLine(timeout: TimeInterval) -> String? {
        let end = Date().addingTimeInterval(timeout)
        while Date() < end {
            if let r = outBuf.firstIndex(of: 10) { let line = outBuf[outBuf.startIndex..<r]; outBuf = outBuf[(r + 1)...]; return String(decoding: line, as: UTF8.self) }
            guard let h = outH, proc?.isRunning == true else { return nil }
            let d = h.availableData; if d.isEmpty { return nil }; outBuf.append(d)
        }
        return nil
    }

    func smiles(for raw: String) -> [String: Any] {
        let name = raw.replacingOccurrences(of: "\n", with: " ").replacingOccurrences(of: "\r", with: " ").trimmingCharacters(in: .whitespaces)
        if name.isEmpty { return ["err": "empty"] }
        for _ in 0..<2 {
            if proc == nil || proc?.isRunning != true { if let err = start() { return ["err": err] } }
            errLock.lock(); errBuf = Data(); errLock.unlock()
            inH?.write((name + "\n").data(using: .utf8)!)
            guard let line = readLine(timeout: 30) else { stop(); continue }
            let smi = line.trimmingCharacters(in: .whitespaces)
            if !smi.isEmpty { return ["smiles": smi] }
            Thread.sleep(forTimeInterval: 0.03)
            errLock.lock(); var msg = String(decoding: errBuf, as: UTF8.self); errLock.unlock()
            if let r = msg.range(of: "uninterpretable: ") { msg = String(msg[r.upperBound...]); if let t = msg.range(of: " The following") { msg = String(msg[..<t.lowerBound]) }; msg = "not understood: " + msg.trimmingCharacters(in: .whitespacesAndNewlines) }
            return ["err": "unparsable", "msg": msg.trimmingCharacters(in: .whitespacesAndNewlines)]
        }
        return ["err": "nojava"]
    }
}


/* Structures read from a picture: MolScribe (MIT, https://github.com/thomas0809/MolScribe), installed apart in a Python of
   its own (~/.reactio-ocsr), through reactio_ocsr.py (in the app's Resources): one JSON request in, one JSON answer out */
enum OCSR {
    static func run(_ req: [String: Any]) -> [String: Any] {
        guard let script = Bundle.main.path(forResource: "reactio_ocsr", ofType: "py") else { return ["ok": false, "error": "reactio_ocsr.py is missing: reinstall Reactio Draw"] }
        guard let body = try? JSONSerialization.data(withJSONObject: req) else { return ["ok": false, "error": "the request could not be written"] }
        let home = NSHomeDirectory()
        var c: [String] = []
        if let p = ProcessInfo.processInfo.environment["REACTIO_OCSR_PYTHON"] { c.append(p) }
        c.append(home + "/.reactio-ocsr/bin/python3")
        c.append(home + "/.reactio-python/bin/python3")
        let pys = c.filter { FileManager.default.isExecutableFile(atPath: $0) }
        if pys.isEmpty { return ["ok": false, "error": "structure recognition needs MolScribe in ~/.reactio-ocsr. In Terminal: python3.10 -m venv ~/.reactio-ocsr && ~/.reactio-ocsr/bin/pip install \"numpy<2\" torch MolScribe huggingface_hub (Python 3.10: there is no torch 1.x for 3.11 or newer; numpy 2 stops torch with 'Numpy is not available'). A Python that already has MolScribe can be linked instead: ln -s <its venv folder> ~/.reactio-ocsr"] }
        var last = ""
        for py in pys {
            let p = Process(); p.executableURL = URL(fileURLWithPath: py); p.arguments = ["-u", script]
            var env = ProcessInfo.processInfo.environment; env["PYTHONIOENCODING"] = "utf-8"; p.environment = env
            let i = Pipe(), o = Pipe(), e = Pipe(); p.standardInput = i; p.standardOutput = o; p.standardError = e
            do { try p.run() } catch { last = "\(error)"; continue }
            var outData = Data(), errData = Data()
            let g = DispatchGroup()
            g.enter(); DispatchQueue.global().async { outData = o.fileHandleForReading.readDataToEndOfFile(); g.leave() }
            g.enter(); DispatchQueue.global().async { errData = e.fileHandleForReading.readDataToEndOfFile(); g.leave() }
            i.fileHandleForWriting.write(body); try? i.fileHandleForWriting.close()
            // the first run downloads the model: up to ten minutes
            if g.wait(timeout: .now() + 600) == .timedOut { p.terminate(); return ["ok": false, "error": "structure recognition took too long"] }
            p.waitUntilExit()
            let txt = String(decoding: outData, as: UTF8.self)
            if let line = txt.split(separator: "\n").last, let d = line.data(using: .utf8),
               let ans = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] {
                if ans["ok"] as? Bool == true { return ans }
                last = ans["error"] as? String ?? "failed"
                continue
            }
            let err = String(decoding: errData, as: UTF8.self).split(separator: "\n").suffix(3).joined(separator: " ")
            last = err.isEmpty ? "no answer from " + py : err
        }
        return ["ok": false, "error": last]
    }
}

/* Structure → name: openclatura (MIT, https://github.com/lamalab-org/openclatura) in the Mac's own Python, unchanged, through
   reactio_name.py (in the app's Resources): it stays running, one SMILES line in, one JSON line out */
final class Namer {
    static let shared = Namer()
    static let queue = DispatchQueue(label: "namer")
    var proc: Process?
    var inH: FileHandle?
    var outH: FileHandle?
    var outBuf = Data()

    func candidates() -> [String] {
        let home = NSHomeDirectory()
        var c: [String] = []
        if let p = ProcessInfo.processInfo.environment["REACTIO_PYTHON"] { c.append(p) }
        /* a Python made just for Reactio Draw (see README: python3 -m venv ~/.reactio-python) */
        c.append(home + "/.reactio-python/bin/python3")
        /* the Python the user's own terminal finds (a Mac app does not get the terminal's PATH) */
        let sh = Process(); sh.executableURL = URL(fileURLWithPath: "/bin/zsh")
        /* a login shell, not an interactive one: ~/.zshrc (and whatever it runs) is not run by the app */
        sh.arguments = ["-lc", "for n in python3.14 python3.13 python3.12 python3.11 python3; do whence -ap $n; done 2>/dev/null; for q in $(whence -ap pip3 pip 2>/dev/null); do head -1 \"$q\" 2>/dev/null; echo; done"]
        let so = Pipe(); sh.standardOutput = so; sh.standardError = FileHandle.nullDevice; sh.standardInput = FileHandle.nullDevice
        if (try? sh.run()) != nil {
            let t = Date().addingTimeInterval(8); while sh.isRunning && Date() < t { usleep(50000) }
            if sh.isRunning { sh.terminate() }
            let out = String(decoding: so.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
            for l in out.split(separator: "\n") { let x = l.trimmingCharacters(in: .whitespaces); if x.hasPrefix("/") { c.append(x) } else if x.hasPrefix("#!/") { let i = String(x.dropFirst(2)).split(separator: " ").first.map(String.init) ?? ""; if !i.hasSuffix("/env") { c.append(i) } } }
        }
        for b in ["/opt/homebrew/bin", "/usr/local/bin", home + "/miniconda3/bin", home + "/anaconda3/bin", home + "/miniforge3/bin", home + "/mambaforge/bin"] { for n in ["python3.14", "python3.13", "python3.12", "python3.11", "python3"] { c.append(b + "/" + n) } }
        let pyenv = home + "/.pyenv/versions"
        if let vs = try? FileManager.default.contentsOfDirectory(atPath: pyenv) { for v in vs.sorted(by: >) { c.append(pyenv + "/" + v + "/bin/python3") } }
        for v in ["3.14", "3.13", "3.12", "3.11"] { c.append("/Library/Frameworks/Python.framework/Versions/\(v)/bin/python3") }
        for d in ["miniconda3", "anaconda3", "miniforge3", "mambaforge", "opt/anaconda3", ".pyenv/shims"] { c.append(home + "/" + d + (d.hasSuffix("shims") ? "/python3" : "/bin/python3")) }
        c.append("/usr/bin/python3")
        var seen = Set<String>()
        return c.filter { FileManager.default.isExecutableFile(atPath: $0) && seen.insert(URL(fileURLWithPath: $0).resolvingSymlinksInPath().path).inserted }
    }

    func readLine(timeout: TimeInterval) -> String? {
        let end = Date().addingTimeInterval(timeout)
        while Date() < end {
            if let r = outBuf.firstIndex(of: 10) { let line = outBuf[outBuf.startIndex..<r]; outBuf = outBuf[(r + 1)...]; return String(decoding: line, as: UTF8.self) }
            guard let h = outH, proc?.isRunning == true else { return nil }
            let d = h.availableData; if d.isEmpty { return nil }; outBuf.append(d)
        }
        return nil
    }

    func start() -> [String: Any]? {
        guard let script = Bundle.main.path(forResource: "reactio_name", ofType: "py") else { return ["err": "nopython", "msg": "reactio_name.py is missing"] }
        var last = "no Python 3 found"; var tried: [String] = []
        for py in candidates() {
            let p = Process(); p.executableURL = URL(fileURLWithPath: py); p.arguments = ["-u", script]
            var env = ProcessInfo.processInfo.environment; env["PYTHONIOENCODING"] = "utf-8"; p.environment = env
            let i = Pipe(), o = Pipe(); p.standardInput = i; p.standardOutput = o; p.standardError = FileHandle.nullDevice
            do { try p.run() } catch { continue }
            proc = p; inH = i.fileHandleForWriting; outH = o.fileHandleForReading; outBuf = Data()
            if let first = readLine(timeout: 90), let d = first.data(using: .utf8), let m = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] {
                if m["ready"] != nil { return nil }
                if let s = m["msg"] as? String { tried.append(py + " (" + s + ")") }
            } else { tried.append(py + " (did not start)") }
            p.terminate(); proc = nil
        }
        if !tried.isEmpty { last = "tried " + tried.joined(separator: "; ") }
        return ["err": "nopython", "msg": last]
    }

    func stop() { proc?.terminate(); proc = nil }

    func name(for raw: String) -> [String: Any] {
        let smi = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if smi.isEmpty { return ["err": "empty"] }
        for _ in 0..<2 {
            if proc == nil || proc?.isRunning != true { if let e = start() { return e } }
            inH?.write((smi + "\n").data(using: .utf8)!)
            guard let line = readLine(timeout: 60), let d = line.data(using: .utf8),
                  let m = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] else { stop(); continue }
            if let n = m["name"] as? String, !n.isEmpty { return ["name": n] }
            return ["err": "noname", "msg": m["msg"] as? String ?? ""]
        }
        return ["err": "nopython"]
    }
}


/* Local API: scripts on this Mac send commands over HTTP on 127.0.0.1 only.
   POST http://127.0.0.1:<port>/api, header X-Reactio-Token, JSON body {"op":"calc","args":{"smiles":"CCO"}}.
   Port and token are in ~/Library/Application Support/ReactioDraw/api.json while the app runs. */
final class LocalAPI {
    static let shared = LocalAPI()
    var listener: NWListener?
    var token = ""
    weak var web: WKWebView?
    var waits: [String: NWConnection] = [:]
    var seq = 0
    var infoURL: URL { FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("ReactioDraw/api.json") }

    var port = 0
    func start(web: WKWebView) {
        self.web = web
        // already listening: write api.json again (another program may have replaced or removed it)
        if listener != nil { if port > 0 { writeInfo(port) }; return }
        token = (0..<16).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined()
        tryPort(47615)
    }

    func tryPort(_ p: UInt16) {
        guard p < 47630, let port = NWEndpoint.Port(rawValue: p) else { return }
        let params = NWParameters.tcp
        params.requiredLocalEndpoint = NWEndpoint.hostPort(host: "127.0.0.1", port: port)
        params.allowLocalEndpointReuse = false
        guard let l = try? NWListener(using: params) else { tryPort(p + 1); return }
        l.stateUpdateHandler = { [weak self] st in
            guard let self = self else { return }
            switch st {
            case .ready:
                self.port = Int(p)
                self.writeInfo(Int(p))
            case .failed(_):
                l.cancel(); DispatchQueue.main.async { self.tryPort(p + 1) }
            default: break
            }
        }
        l.newConnectionHandler = { [weak self] c in self?.accept(c) }
        l.start(queue: .main)
        listener = l
    }

    func writeInfo(_ p: Int) {
        let info: [String: Any] = ["port": p, "token": token, "url": "http://127.0.0.1:\(p)/api", "pid": Int(ProcessInfo.processInfo.processIdentifier)]
        try? FileManager.default.createDirectory(at: infoURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        if let d = try? JSONSerialization.data(withJSONObject: info) { try? d.write(to: infoURL); try? FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: infoURL.path) }
    }

    // api.json goes only if it is this app's own (not one another copy of the app wrote)
    func stop() {
        listener?.cancel(); listener = nil; port = 0
        if let d = try? Data(contentsOf: infoURL), let m = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any],
           (m["pid"] as? Int) != Int(ProcessInfo.processInfo.processIdentifier) { return }
        try? FileManager.default.removeItem(at: infoURL)
    }

    func accept(_ c: NWConnection) {
        c.start(queue: .main)
        read(c, Data())
    }

    func read(_ c: NWConnection, _ buf: Data) {
        c.receive(minimumIncompleteLength: 1, maximumLength: 1 << 20) { [weak self] data, _, done, err in
            guard let self = self else { return }
            var b = buf; if let d = data { b.append(d) }
            if let r = b.range(of: Data("\r\n\r\n".utf8)) {
                let head = String(decoding: b[b.startIndex..<r.lowerBound], as: UTF8.self)
                var len = 0, tok = "", origin = "", host = ""
                let lines = head.components(separatedBy: "\r\n")
                for line in lines.dropFirst() {
                    let kv = line.split(separator: ":", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespaces) }
                    if kv.count == 2 {
                        switch kv[0].lowercased() {
                        case "content-length": len = Int(kv[1]) ?? 0
                        case "x-reactio-token": tok = kv[1]
                        case "origin": origin = kv[1]
                        case "host": host = kv[1]
                        default: break
                        }
                    }
                }
                // only scripts on this computer: a browser request for a web page carries an Origin header, and the Host
                // must be this address (a site that points its own name at 127.0.0.1 is turned away too); at most 8 MB
                if !origin.isEmpty || (host != "127.0.0.1:\(self.port)" && host != "localhost:\(self.port)") || len > 8 << 20 {
                    self.send(c, "403 Forbidden", "{\"ok\":false,\"error\":\"the local API answers scripts on this computer only (no browser requests)\"}"); return
                }
                let body = b[r.upperBound...]
                if body.count >= len || done || err != nil {
                    self.handle(c, method: lines.first?.components(separatedBy: " ").first ?? "", token: tok, body: Data(body.prefix(len)))
                    return
                }
            } else if done || err != nil || b.count > 64 << 10 { c.cancel(); return }
            self.read(c, b)
        }
    }

    /* compared in constant time, so the answer time says nothing about how much of a guess was right */
    func sameToken(_ a: String, _ b: String) -> Bool {
        let x = Array(a.utf8), y = Array(b.utf8)
        if x.count != y.count { return false }
        var d: UInt8 = 0
        for i in 0..<x.count { d |= x[i] ^ y[i] }
        return d == 0
    }

    func send(_ c: NWConnection, _ status: String, _ json: String) {
        let body = Data(json.utf8)
        var h = "HTTP/1.1 \(status)\r\nContent-Type: application/json\r\nContent-Length: \(body.count)\r\nConnection: close\r\n\r\n"
        var d = Data(h.utf8); d.append(body); h = ""
        c.send(content: d, completion: .contentProcessed { _ in c.cancel() })
    }

    func handle(_ c: NWConnection, method: String, token tok: String, body: Data) {
        if !sameToken(tok, token) { send(c, "403 Forbidden", "{\"ok\":false,\"error\":\"wrong or missing X-Reactio-Token (see api.json)\"}"); return }
        var op = "help", args = "{}"
        if method == "POST" {
            guard let m = (try? JSONSerialization.jsonObject(with: body)) as? [String: Any], let o = m["op"] as? String else {
                send(c, "400 Bad Request", "{\"ok\":false,\"error\":\"send JSON like {\\\"op\\\":\\\"calc\\\",\\\"args\\\":{\\\"smiles\\\":\\\"CCO\\\"}}\"}"); return }
            op = o
            if let a = m["args"], let d = try? JSONSerialization.data(withJSONObject: a, options: [.fragmentsAllowed]) { args = String(decoding: d, as: UTF8.self) }
        }
        seq += 1; let id = "api\(seq)"; waits[id] = c
        guard let opj = try? JSONSerialization.data(withJSONObject: [id, op]), let pair = String(data: opj, encoding: .utf8) else { send(c, "500 Internal Server Error", "{\"ok\":false}"); return }
        // pair is ["id","op"]; the page gets (id, op, args)
        let js = "(function(p){window.__rdApiCall&&window.__rdApiCall(p[0],p[1],\(args));})(\(pair))"
        web?.evaluateJavaScript(js, completionHandler: nil)
        // a long command (a batch fitting many structures) may take minutes: the answer is waited for up to 30 min
        DispatchQueue.main.asyncAfter(deadline: .now() + 1800) { [weak self] in
            if let w = self?.waits.removeValue(forKey: id) { self?.send(w, "504 Gateway Timeout", "{\"ok\":false,\"error\":\"timed out\"}") }
        }
    }

    func deliver(_ id: String, _ out: String) {
        if let c = waits.removeValue(forKey: id) { send(c, "200 OK", out) }
    }

    // the page was loaded again (reloaded, or the window opened anew): the commands it was working on will never answer
    func failWaiting(_ why: String) {
        guard let d = try? JSONSerialization.data(withJSONObject: ["ok": false, "error": why]), let s = String(data: d, encoding: .utf8) else { return }
        for (_, c) in waits { send(c, "200 OK", s) }
        waits.removeAll()
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var web: WKWebView!
    let bridge = Bridge()
    var timer: Timer?

    func applicationDidFinishLaunching(_ n: Notification) {
        if let args = cliArgs { startCli(args); return }
        buildMenu()
        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(bridge, name: "rd")
        cfg.userContentController.addUserScript(WKUserScript(source: "window.__rdUpdate={asset:'ReactioDraw-Mac.zip'};", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        cfg.preferences.setValue(true, forKey: "developerExtrasEnabled")
        let rect = NSRect(x: 0, y: 0, width: 1440, height: 920)
        web = WKWebView(frame: rect, configuration: cfg); web.autoresizingMask = [.width, .height]
        web.navigationDelegate = self
        bridge.web = web
        window = NSWindow(contentRect: rect, styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Reactio Draw"; window.minSize = NSSize(width: 800, height: 560); window.contentView = web; window.delegate = bridge
        window.isReleasedWhenClosed = false
        if let url = Bundle.main.url(forResource: "index", withExtension: "html"), let html = try? String(contentsOf: url, encoding: .utf8) {
            web.loadHTMLString(html, baseURL: URL(string: "https://app.reactiodraw.local/"))
        }
        window.center(); window.setFrameAutosaveName("ReactioDrawMain"); window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        timer = Timer.scheduledTimer(timeInterval: 0.5, target: bridge, selector: #selector(Bridge.watchClipboard), userInfo: nil, repeats: true)
    }

    /* the command line: the page in a window nobody sees (transparent, ignores the mouse, not in the Dock) */
    func startCli(_ args: [String]) {
        let cfg = WKWebViewConfiguration()
        // a storage of its own that is thrown away: the command line never touches the open app's documents or settings
        cfg.websiteDataStore = .nonPersistent()
        cfg.userContentController.add(bridge, name: "rd")
        cfg.userContentController.addUserScript(WKUserScript(source: cliScript(args), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let rect = NSRect(x: 0, y: 0, width: 1200, height: 800)
        web = WKWebView(frame: rect, configuration: cfg)
        bridge.web = web
        window = NSWindow(contentRect: rect, styleMask: [.borderless], backing: .buffered, defer: false)
        window.contentView = web; window.alphaValue = 0; window.ignoresMouseEvents = true; window.isReleasedWhenClosed = false
        window.collectionBehavior = [.transient, .ignoresCycle]
        window.orderBack(nil)
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html"), let html = try? String(contentsOf: url, encoding: .utf8) else {
            cliErr("reactio: index.html is missing from the app\n"); exit(1)
        }
        web.loadHTMLString(html, baseURL: URL(string: "https://app.reactiodraw.local/?embed&cli"))
        DispatchQueue.main.asyncAfter(deadline: .now() + 600) { cliErr("reactio: no answer after 10 minutes\n"); cliExit(1) }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ s: NSApplication) -> Bool { true }
    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if Bridge.quitOK || !loaded { return .terminateNow }
        bridge.askQuit(); return .terminateCancel
    }

    /* files opened from Finder (double-click, Open With, dropped on the Dock icon): handed to the page once it has loaded */
    var pending: [URL] = []
    var loaded = false
    func application(_ sender: NSApplication, openFiles filenames: [String]) {
        if cliArgs != nil { sender.reply(toOpenOrPrint: .success); return } // the command line reads its own files
        pending += filenames.map { URL(fileURLWithPath: $0) }
        flushFiles()
        sender.reply(toOpenOrPrint: .success)
    }
    func webView(_ w: WKWebView, didFinish navigation: WKNavigation!) { loaded = true; flushFiles(); LocalAPI.shared.failWaiting("the page was loaded again before it answered: the command may have been done in part; look at the sheet before sending it again") }
    func flushFiles() {
        guard loaded, let web = web else { return }
        let list = pending; pending = []
        for url in list {
            guard let d = try? Data(contentsOf: url), d.count < 64 << 20,
                  let j = try? JSONSerialization.data(withJSONObject: [url.lastPathComponent, d.base64EncodedString(), url.path]),
                  let a = String(data: j, encoding: .utf8) else { continue }
            allowPath(url.path)
            web.evaluateJavaScript("window.__rdOpenFile&&window.__rdOpenFile.apply(null,\(a))", completionHandler: nil)
        }
        if !list.isEmpty { window?.makeKeyAndOrderFront(nil); NSApp.activate(ignoringOtherApps: true) }
    }

    func buildMenu() {
        let bar = NSMenu()
        let appItem = NSMenuItem(); let am = NSMenu(title: "Reactio Draw")
        am.addItem(withTitle: "Hide Reactio Draw", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        am.addItem(.separator())
        am.addItem(withTitle: "Quit Reactio Draw", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = am; bar.addItem(appItem)
        let editItem = NSMenuItem(); let em = NSMenu(title: "Edit")
        em.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        em.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        em.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        em.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = em; bar.addItem(editItem)
        let winItem = NSMenuItem(); let wm = NSMenu(title: "Window")
        wm.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        wm.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        winItem.submenu = wm; bar.addItem(winItem)
        let helpItem = NSMenuItem(); let hm = NSMenu(title: "Help")
        hm.addItem(withTitle: "Clipboard Report (saved to Downloads)", action: #selector(AppDelegate.clipReport(_:)), keyEquivalent: "")
        helpItem.submenu = hm; bar.addItem(helpItem)
        NSApp.mainMenu = bar
    }

    @objc func clipReport(_ sender: Any?) {
        if let u = Bridge.clipReport() { NSWorkspace.shared.open(u) }
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(cliArgs == nil ? .regular : .accessory)
app.run()
