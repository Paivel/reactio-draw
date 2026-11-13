Reactio Draw for ONLYOFFICE

ReactioDraw-ONLYOFFICE.plugin is the plugin for the ONLYOFFICE Document, Spreadsheet and Presentation editors
(the desktop app and the server). It carries this version of Reactio Draw and works offline.

Install: in ONLYOFFICE, Plugins -> Plugin Manager -> install the plugin from this file. A newer one replaces it the same way.

- Plugins -> Reactio Draw: draw, press OK; double-click the drawing to edit it again.
- Reactio Draw (the arrow) -> Paste Reactio drawing: a drawing copied in Reactio Draw goes in as the plugin's
  object, editable by double-click, without opening the editor.
- Reactio Draw (the arrow) -> Number compounds: [[key]] marks in the text and the drawings become compound numbers,
  as on the Word tab; Show marks, Remove marks, Final copy.

ReactioDraw-Paste-ONLYOFFICE.plugin (optional, small, install it next to the first): the same paste as a button on
the Insert tab, in the right-click menu and on Alt+Shift+V (Control+Shift+V on a Mac). It runs in the background
(Plugins -> Background plugins turns it off), uses the Reactio Draw plugin's Reactio Draw and inserts its objects. For
the keys ONLYOFFICE tells it of the keys pressed in the document; it looks only for these, keeps nothing, and has no
network.

More: chapter 9 of "Reactio Draw - Getting started.pdf". A test document:
examples/Reactio Draw - marks test (ONLYOFFICE).docx.

A .plugin is a zip: its files (config.json, the .html and .js files) are the plugin's code under the Mozilla Public
License 2.0; reactio/ in the first holds Reactio Draw's page and its licences.
