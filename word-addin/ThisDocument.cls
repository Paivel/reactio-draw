' Reactio Draw tab in Word: the template's own document module. It listens to Word, so that a double-click on a Reactio
' Draw picture opens it in Reactio Draw (as Edit drawing does) instead of Word's picture settings. Other pictures and
' Reactio Draw objects on Windows keep what Word does with them. The tab starts listening when Word loads it (RD_Load).
' Reactio Draw (c) 2026 Pavel Sakharov. This Source Code Form is subject to the terms of the Mozilla
' Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at
' https://mozilla.org/MPL/2.0/.
Option Explicit

Public WithEvents RDApp As Word.Application

Public Sub RDListen()
    Set RDApp = Word.Application
End Sub

Private Sub RDApp_WindowBeforeDoubleClick(ByVal Sel As Selection, Cancel As Boolean)
    If ReactioDraw.RD_DoubleClick(Sel) Then Cancel = True
End Sub
