package main

// Reading a picture, for assistants copying a scheme:
//   - the text lines of a picture: Windows' own text recognition (Windows.Media.Ocr, built into Windows 10 and 11), called
//     through PowerShell; nothing is installed;
//   - structures from boxes of a picture: MolScribe (MIT, https://github.com/thomas0809/MolScribe), installed apart in a
//     Python of its own (%USERPROFILE%\.reactio-ocsr), through tools\reactio_ocsr.py: one JSON request in, one JSON answer out.

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"image"
	"image/color"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

func hiddenCmd(ctx context.Context, name string, args ...string) *exec.Cmd {
	c := exec.CommandContext(ctx, name, args...)
	c.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x08000000} // no console window
	return c
}

// ---------- structures: MolScribe ----------

func ocsrPythons() []string {
	home, _ := os.UserHomeDir()
	c := []string{}
	if p := os.Getenv("REACTIO_OCSR_PYTHON"); p != "" {
		c = append(c, p)
	}
	c = append(c, filepath.Join(home, ".reactio-ocsr", "Scripts", "python.exe"), filepath.Join(home, ".reactio-python", "Scripts", "python.exe"))
	out := []string{}
	for _, p := range c {
		if st, err := os.Stat(p); err == nil && !st.IsDir() {
			out = append(out, p)
		}
	}
	return out
}

func ocsrRun(b64 string, boxes json.RawMessage) map[string]interface{} {
	script := toolPath("reactio_ocsr.py")
	if st, err := os.Stat(script); err != nil || st.IsDir() {
		return map[string]interface{}{"ok": false, "error": "tools\\reactio_ocsr.py is missing beside the program: reinstall it from the download"}
	}
	pys := ocsrPythons()
	if len(pys) == 0 {
		return map[string]interface{}{"ok": false, "error": "structure recognition needs MolScribe in %USERPROFILE%\\.reactio-ocsr. In a command prompt: " +
			"py -3.10 -m venv %USERPROFILE%\\.reactio-ocsr && %USERPROFILE%\\.reactio-ocsr\\Scripts\\pip install \"numpy<2\" torch MolScribe huggingface_hub " +
			"(Python 3.10: there is no torch 1.x for 3.11 or newer; numpy 2 stops torch). Then close and open Reactio Draw"}
	}
	if len(boxes) == 0 {
		boxes = json.RawMessage("[]")
	}
	body, _ := json.Marshal(map[string]interface{}{"b64": b64, "boxes": boxes})
	last := ""
	for _, py := range pys {
		// the first run downloads the model: up to ten minutes
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		c := hiddenCmd(ctx, py, "-u", script)
		c.Env = append(os.Environ(), "PYTHONIOENCODING=utf-8")
		c.Stdin = bytes.NewReader(body)
		var so, se bytes.Buffer
		c.Stdout = &so
		c.Stderr = &se
		err := c.Run()
		cancel()
		if ctx.Err() == context.DeadlineExceeded {
			return map[string]interface{}{"ok": false, "error": "structure recognition took too long"}
		}
		lines := strings.Split(strings.TrimSpace(so.String()), "\n")
		if len(lines) > 0 {
			var ans map[string]interface{}
			if json.Unmarshal([]byte(strings.TrimSpace(lines[len(lines)-1])), &ans) == nil {
				if ok, _ := ans["ok"].(bool); ok {
					return ans
				}
				if e, _ := ans["error"].(string); e != "" {
					last = e
					continue
				}
			}
		}
		el := strings.Split(strings.TrimSpace(se.String()), "\n")
		if len(el) > 3 {
			el = el[len(el)-3:]
		}
		last = strings.Join(el, " ")
		if last == "" && err != nil {
			last = err.Error()
		}
		if last == "" {
			last = "no answer from " + py
		}
	}
	return map[string]interface{}{"ok": false, "error": last}
}

// ---------- text: Windows.Media.Ocr ----------

const ocrScript = `param([string]$path)
$ErrorActionPreference = 'Stop'
trap { Write-Output ('{"ok":false,"error":' + (ConvertTo-Json -InputObject ('Windows text recognition: ' + $_.Exception.Message) -Compress) + '}'); exit }
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrResult, Windows.Foundation, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` + "`" + `1' })[0]
function Await($op, [type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.GetAwaiter().GetResult() }
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($path)) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$eng = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new('en-US'))
if ($eng -eq $null) { $eng = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if ($eng -eq $null) { Write-Output '{"ok":false,"error":"no text recognition language is installed in Windows: Settings > Time & language > Language & region, add English (United States) with its basic typing / optical character recognition feature"}'; exit }
$res = Await ($eng.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
$stream.Dispose()
$out = @()
foreach ($l in $res.Lines) {
  $x0 = 1e9; $y0 = 1e9; $x1 = -1e9; $y1 = -1e9
  foreach ($w in $l.Words) { $r = $w.BoundingRect; if ($r.X -lt $x0) { $x0 = $r.X }; if ($r.Y -lt $y0) { $y0 = $r.Y }; if ($r.X + $r.Width -gt $x1) { $x1 = $r.X + $r.Width }; if ($r.Y + $r.Height -gt $y1) { $y1 = $r.Y + $r.Height } }
  $out += [pscustomobject]@{ text = $l.Text; conf = 1; x0 = $x0; y0 = $y0; x1 = $x1; y1 = $y1 }
}
$json = ConvertTo-Json -InputObject @($out) -Compress -Depth 3
Write-Output ('{"ok":true,"lines":' + $json + '}')
`

// a picture larger than Windows' text recognition takes is made smaller first (its boxes scaled back)
func ocrPrepare(b []byte) ([]byte, float64) {
	img, _, err := image.Decode(bytes.NewReader(b))
	if err != nil {
		return b, 1
	}
	const max = 2500
	w, h := img.Bounds().Dx(), img.Bounds().Dy()
	k := 1.0
	if w > max || h > max {
		if w > h {
			k = float64(max) / float64(w)
		} else {
			k = float64(max) / float64(h)
		}
	}
	nw, nh := int(float64(w)*k+0.5), int(float64(h)*k+0.5)
	if nw < 1 || nh < 1 {
		return b, 1
	}
	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	b0 := img.Bounds().Min
	for y := 0; y < nh; y++ {
		for x := 0; x < nw; x++ {
			sx, sy := int(float64(x)/k), int(float64(y)/k)
			r, g, bb, a := img.At(b0.X+sx, b0.Y+sy).RGBA()
			// transparent pixels become paper
			af := float64(a) / 65535
			wh := func(c uint32) uint8 { return uint8((float64(c)/257)*1 + 255*(1-af) + 0.5) }
			if a == 0 {
				dst.Set(x, y, color.RGBA{255, 255, 255, 255})
			} else {
				dst.Set(x, y, color.RGBA{wh(r), wh(g), wh(bb), 255})
			}
		}
	}
	var buf bytes.Buffer
	if png.Encode(&buf, dst) != nil {
		return b, 1
	}
	return buf.Bytes(), k
}

func ocrRun(b64 string) map[string]interface{} {
	raw, err := base64.StdEncoding.DecodeString(b64)
	if err != nil || len(raw) == 0 {
		return map[string]interface{}{"ok": false, "error": "the picture could not be read"}
	}
	pic, k := ocrPrepare(raw)
	dir, err := os.MkdirTemp("", "reactio-ocr")
	if err != nil {
		return map[string]interface{}{"ok": false, "error": err.Error()}
	}
	defer os.RemoveAll(dir)
	ip, sp := filepath.Join(dir, "pic.png"), filepath.Join(dir, "ocr.ps1")
	if os.WriteFile(ip, pic, 0600) != nil || os.WriteFile(sp, []byte("\xef\xbb\xbf"+ocrScript), 0600) != nil {
		return map[string]interface{}{"ok": false, "error": "could not write a temporary file"}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	c := hiddenCmd(ctx, "powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", sp, ip)
	var so, se bytes.Buffer
	c.Stdout = &so
	c.Stderr = &se
	_ = c.Run()
	lines := strings.Split(strings.TrimSpace(so.String()), "\n")
	var ans map[string]interface{}
	if len(lines) == 0 || json.Unmarshal([]byte(strings.TrimSpace(lines[len(lines)-1])), &ans) != nil {
		e := strings.TrimSpace(se.String())
		if len(e) > 400 {
			e = e[:400]
		}
		if e == "" {
			e = "no answer from Windows text recognition"
		}
		return map[string]interface{}{"ok": false, "error": e}
	}
	// the boxes back in the picture's own pixels
	if k != 1 {
		if ls, ok := ans["lines"].([]interface{}); ok {
			for _, l := range ls {
				if m, ok := l.(map[string]interface{}); ok {
					for _, f := range []string{"x0", "y0", "x1", "y1"} {
						if v, ok := m[f].(float64); ok {
							m[f] = v / k
						}
					}
				}
			}
		}
	}
	return ans
}
