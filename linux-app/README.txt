Reactio Draw for Linux
======================

A free chemical structure and reaction editor. This folder is the whole program.

Install
  1. Put the "Reactio Draw" folder where it should stay (for example ~/Applications or ~/.local/opt).
  2. In a terminal, in that folder:  ./install.sh
     It adds Reactio Draw to the applications menu for you (no root needed), makes Reactio Draw documents (.reactio)
     open in it on double-click, and tells you if WebKitGTK is missing.
  3. WebKitGTK draws the window. Most desktops have it; if not, install it once:
       Debian, Ubuntu, Mint:  sudo apt install libwebkit2gtk-4.1-0
       Fedora:                sudo dnf install webkit2gtk4.1
       Arch:                  sudo pacman -S webkit2gtk-4.1
     Without it the program opens in your web browser instead (everything works there except the items below).

Extras (optional)
  Paste name (systematic names to structures) needs Java 8 or newer:  sudo apt install default-jre
  Name it (structure to IUPAC name) needs Python 3.11 or newer with openclatura:
       python3 -m venv ~/.reactio-python && ~/.reactio-python/bin/pip install openclatura
  Local API and MCP (scripts and AI assistants on this computer): the separate download "Reactio Draw - AI assistants"
       (./install-ai.sh there), then Info tab → API; see "Install with AI assistants.txt" in it.
  Command line: ./reactio (or reactio after install.sh) renders, converts and checks files without a window;
       reactio --help, and "Command line.txt".

Where things are
  Documents, settings and the log (ReactioDraw.log): ~/.local/share/ReactioDraw
  Remove: ./uninstall.sh, then delete this folder (and ~/.local/share/ReactioDraw to remove your data too).

Every function and button is described in "Reactio Draw - Getting started.pdf".
License: GNU AGPL v3 or later (LICENSE.txt); third-party parts: THIRD-PARTY-NOTICES.md and LICENSES/.
