#!/bin/sh
# Builds inchi.wasm, the InChI library (https://github.com/IUPAC-InChI/InChI, MIT) for Reactio Draw.
# Source used: commit 68afb202241e4148722c89404b1b622763ce2bc1. Toolchain: wasi-sdk 25 (https://github.com/WebAssembly/wasi-sdk).
# Then: gzip -9 inchi.wasm, base64, and put it in index.html as a JSON string in <script type="application/json" id="inchiWasm">.
# The stack is 8 MB and comes first in memory: InChI recurses once per atom along a chain, and the default 64 KB stack
# ran over into the data on structures of about 900 atoms (the page's renderer crashed); an overflow now traps instead.
set -e
INCHI=${INCHI:-InChI}      # a clone of https://github.com/IUPAC-InChI/InChI
WASI=${WASI:-wasi-sdk-25.0-x86_64-linux}
B=$INCHI/INCHI-1-SRC
SRCS=$(ls $B/INCHI_BASE/src/*.c $B/INCHI_API/libinchi/src/*.c | grep -v inchi_dll_main.c)
$WASI/bin/clang --target=wasm32-wasi --sysroot=$WASI/share/wasi-sysroot -O2 -mexec-model=reactor \
  -D_WASI_EMULATED_PROCESS_CLOCKS -DTARGET_API_LIB -DCOMPILE_ANSI_ONLY -I$B/INCHI_BASE/src -I$B/INCHI_API/libinchi/src -w \
  -lwasi-emulated-process-clocks -Wl,--no-entry -Wl,-z,stack-size=8388608 -Wl,--stack-first -Wl,--strip-all -o inchi.wasm "$(dirname "$0")/rd_inchi.c" $SRCS
