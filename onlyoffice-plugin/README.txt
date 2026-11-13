Reactio Draw for ONLYOFFICE

ReactioDraw-ONLYOFFICE.plugin is the plugin for the ONLYOFFICE Document, Spreadsheet and Presentation editors
(the desktop app and the server). It carries this version of Reactio Draw and works offline.

Install: in ONLYOFFICE, Plugins -> Plugin Manager -> install the plugin from this file. A newer one replaces it the same way.

The plugin runs in the background from the start of the editor (ONLYOFFICE 8.1 or later):
- Insert -> Reactio Draw: draw, press OK; double-click the drawing (or right-click -> Edit Reactio drawing) to edit it.
- Insert -> Paste Reactio, right-click -> Paste Reactio drawing, or Alt+Shift+V (Control+Shift+V on a Mac): a drawing
  copied in Reactio Draw goes in as an editable object, without opening the editor.
- Insert -> Reactio Draw (the arrow) -> Number compounds: [[key]] marks in the text and the drawings become compound
  numbers, as on the Word tab; Show marks, Remove marks, Final copy.
Plugins -> Background plugins turns it off (and with it the double-click). For the keys ONLYOFFICE tells it of the keys
pressed in the document; it looks only for these, keeps nothing, and has no network.

More: chapter 9 of "Reactio Draw - Getting started.pdf". A test document:
examples/Reactio Draw - marks test (ONLYOFFICE).docx.

The .plugin is a zip: its files (config.json, the .html and .js files) are the plugin's code under the Mozilla Public
License 2.0; reactio/ holds Reactio Draw's page and its licences.
