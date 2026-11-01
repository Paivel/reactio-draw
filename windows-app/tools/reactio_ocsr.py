"""Structure recognition for Reactio Draw (recognizeStructures), through MolScribe when it is installed on this computer.

MolScribe (MIT licence, https://github.com/thomas0809/MolScribe) is not part of Reactio Draw: it needs PyTorch and its
model (about 1.1 GB), so it is installed apart, in a Python of its own:

    python3.10 -m venv ~/.reactio-ocsr
    ~/.reactio-ocsr/bin/pip install "numpy<2" torch MolScribe huggingface_hub

The model (about 1.1 GB) is read from the file named by MOLSCRIBE_CKPT, else ~/.reactio-ocsr/molscribe.pth, else
~/.reactio-ocsr/models/molscribe.pth; only when none is there is it downloaded (yujieq/MolScribe on Hugging Face, once).

One JSON request on stdin: {"b64": "<PNG or JPEG of the figure>", "boxes": [[x0, y0, x1, y1], ...]} (the figure's pixels);
one JSON answer on stdout: {"ok": true, "results": [{"box", "smiles", "confidence", "atoms": [{"symbol", "x", "y",
"confidence"}], "bonds": [{"a", "b", "type", "confidence"}]}, ...]} with atoms in the figure's pixels.
"""
import base64
import io
import json
import os
import sys


def fail(msg):
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(0)


def checkpoint():
    p = os.environ.get("MOLSCRIBE_CKPT")
    if p and os.path.isfile(p):
        return p
    for p in ("~/.reactio-ocsr/molscribe.pth", "~/.reactio-ocsr/models/molscribe.pth"):
        p = os.path.expanduser(p)
        if os.path.isfile(p):
            return p
    try:
        from huggingface_hub import hf_hub_download
    except ImportError:
        fail("the MolScribe model is not found: put it at ~/.reactio-ocsr/molscribe.pth (or models/molscribe.pth there, or name it in MOLSCRIBE_CKPT) or install huggingface_hub")
    return hf_hub_download("yujieq/MolScribe", "swin_base_char_aux_1m680k.pth")


def main():
    try:
        req = json.loads(sys.stdin.read())
    except ValueError:
        fail("the request could not be read")
    try:
        import numpy as np
        import torch
        from PIL import Image
        from molscribe import MolScribe
    except ImportError as e:
        fail("MolScribe is not installed in " + sys.executable + " (" + str(e) + "). In Terminal: python3.10 -m venv "
             "~/.reactio-ocsr && ~/.reactio-ocsr/bin/pip install \"numpy<2\" torch MolScribe huggingface_hub "
             "(Python 3.10: no torch 1.x for 3.11 or newer; numpy 2 stops torch)")
    if int(np.__version__.split(".")[0]) >= 2:
        fail("numpy " + np.__version__ + " is installed: torch for MolScribe needs numpy<2. In Terminal: "
             "~/.reactio-ocsr/bin/pip install \"numpy<2\"")
    img = Image.open(io.BytesIO(base64.b64decode(req.get("b64", "")))).convert("RGB")
    W, H = img.size
    boxes = req.get("boxes") or [[0, 0, W, H]]
    crops, frames = [], []
    for b in boxes:
        x0, y0, x1, y1 = [float(v) for v in b[:4]]
        # a white margin round each structure: the model reads a drawing with paper round it better
        m = max(8.0, 0.08 * max(x1 - x0, y1 - y0))
        cx0, cy0 = max(0, int(x0 - m)), max(0, int(y0 - m))
        cx1, cy1 = min(W, int(x1 + m + 1)), min(H, int(y1 + m + 1))
        if cx1 <= cx0 or cy1 <= cy0:
            crops.append(None)
            frames.append(None)
            continue
        crops.append(np.array(img.crop((cx0, cy0, cx1, cy1))))
        frames.append((cx0, cy0, cx1 - cx0, cy1 - cy0))
    model = MolScribe(checkpoint(), device=torch.device("cuda" if torch.cuda.is_available() else "cpu"))
    todo = [c for c in crops if c is not None]
    preds = model.predict_images(todo, return_atoms_bonds=True, return_confidence=True) if todo else []
    out, k = [], 0
    for b, c, f in zip(boxes, crops, frames):
        if c is None:
            out.append({"box": b, "error": "empty box"})
            continue
        p = preds[k]
        k += 1
        fx, fy, fw, fh = f
        atoms = [{"symbol": a.get("atom_symbol", "C"), "x": fx + float(a["x"]) * fw, "y": fy + float(a["y"]) * fh,
                  "confidence": float(a.get("confidence", 1))} for a in p.get("atoms", [])]
        bonds = [{"a": int(q["endpoint_atoms"][0]), "b": int(q["endpoint_atoms"][1]), "type": q.get("bond_type", "single"),
                  "confidence": float(q.get("confidence", 1))} for q in p.get("bonds", [])]
        out.append({"box": b, "smiles": p.get("smiles", ""), "confidence": float(p.get("confidence", 0) or 0),
                    "atoms": atoms, "bonds": bonds})
    print(json.dumps({"ok": True, "results": out}))


if __name__ == "__main__":
    main()
