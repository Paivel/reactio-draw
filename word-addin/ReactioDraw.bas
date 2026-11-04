Attribute VB_Name = "ReactioDraw"
' Reactio Draw tab in Word (Windows and Mac). Its buttons run Reactio Draw on the saved document:
'   Plain pictures        a copy of the document with plain vector pictures and no Reactio Draw data, opened in Word
'   Export to CDXML       all structures of the document in one CDXML file next to it, one under another
'   Open in Reactio Draw  all structures of the document on one sheet in Reactio Draw
'   Edit drawing          the selected drawing in Reactio Draw; Save there puts it back (Mac: also a double-click on the picture; keys: Tools > Customize Keyboard > Macros > ReactioDrawEdit; on Windows, double-click the object)
'   Update                puts drawings saved in Reactio Draw back into Word (Reactio Draw asks Word to do it by itself)
'   Mark drawings         a hidden mark beside every Reactio Draw drawing, shown on screen, never printed; the button stays pressed while they are on
'   Number compounds      numbers the compounds of this document from their marks ([[key]] 7, [[key.sub.letter]] 7a, [[key.sub.num]] 7.1),
'                         in the text and in Reactio Draw drawings, in the open document (it stays open; Undo takes it back)
'   Show marks            the same document with the marks shown instead of the numbers, to see which key is which
'   Remove marks          a copy with the numbers as plain text and no marks left (drawings stay Reactio Draw drawings), opened in Word
'   Final copy            the same with plain vector pictures too: the copy to send
' Reactio Draw (c) 2026 Pavel Sakharov. Free software under the GNU Affero General Public License v3.0 or later.
Option Explicit

Private Const TTL As String = "Reactio Draw"
Private RDRibbon As Object   ' the tab, to redraw the Mark drawings button
Private RDNumPath As String  ' the document Number compounds / Show marks works on, and which of the two
Private RDNumCmd As String

Public Sub RD_Plain(control As Object)
    Listen
    Dim p As String, o As String
    p = DocPath()
    If p = "" Then Exit Sub
    o = Left$(p, Len(p) - 5) & " (plain).docx"
    If RunRD("plain", p, o) Then OpenResult o
End Sub

Public Sub RD_Cdxml(control As Object)
    Listen
    Dim p As String, o As String
    p = DocPath()
    If p = "" Then Exit Sub
    o = Left$(p, Len(p) - 5) & ".cdxml"
    If RunRD("cdxml", p, o) Then MsgBox "All structures of the document, one under another, are saved in" & vbCr & o, vbInformation, TTL
End Sub

' ---------- compound numbers ----------
Public Sub RD_Number(control As Object)
    NumberDoc False
End Sub

Public Sub RD_ShowMarks(control As Object)
    NumberDoc True
End Sub

Public Sub RD_Unmark(control As Object)
    Listen
    Dim p As String, o As String
    p = DocPath()
    If p = "" Then Exit Sub
    o = Left$(p, Len(p) - 5) & " (no marks).docx"
    If RunRD("unmark", p, o) Then OpenResult o
End Sub

Public Sub RD_Final(control As Object)
    Listen
    Dim p As String, o As String
    p = DocPath()
    If p = "" Then Exit Sub
    o = Left$(p, Len(p) - 5) & " (final).docx"
    If RunRD("final", p, o) Then OpenResult o
End Sub

' Number compounds and Show marks: the document is saved, Reactio Draw numbers a copy of it, and that copy takes the place of
' the document's text in the open document (one step for Undo; tracked changes are left off for it); headers and footers
' stay as they are. With an older Reactio Draw that cannot make the copy, the document is closed, numbered in place and
' opened again, a moment after the button returns (Word on a Mac may refuse to close a document from inside the button's
' own call, error 4198)
Private Sub NumberDoc(marks As Boolean)
    Listen
    Dim p As String, t As String, d As Object, cmd As String
    p = DocPath()
    If p = "" Then Exit Sub
    Set d = ActiveDocument
    cmd = "number"
    If marks Then cmd = "marks"
    t = NumberedFile()
    On Error Resume Next
    Kill t
    On Error GoTo 0
    If Not RunRD(cmd & "-here", p, t) Then Exit Sub
    If Dir$(t) = "" Then
        RDNumPath = p
        RDNumCmd = cmd
        Application.OnTime When:=Now, Name:="RD_NumberNow"
        Exit Sub
    End If
    PutContent d, t
    On Error Resume Next
    Kill t
End Sub

' where Reactio Draw writes the numbered copy: a folder Word may read (on a Mac, Office's own)
Private Function NumberedFile() As String
#If Mac Then
    NumberedFile = AskHelper("dir", "", "") & "numbered.docx"
#Else
    NumberedFile = Environ$("TEMP") & "\ReactioDraw numbered.docx"
#End If
End Function

' the text of document d replaced by that of file t, where the cursor was
Private Sub PutContent(d As Object, t As String)
    Dim trk As Boolean, pos As Long, r As Object, e As Object, ur As Object
    On Error Resume Next
    Set ur = Application.UndoRecord
    If Not ur Is Nothing Then ur.StartCustomRecord "Number compounds"
    On Error GoTo 0
    trk = d.TrackRevisions
    d.TrackRevisions = False
    pos = Selection.Start
    Application.ScreenUpdating = False
    Set r = d.Range(0, d.Content.End - 1)
    r.InsertFile FileName:=t
    ' the file's own last paragraph mark comes in before the document's: one empty paragraph too many at the end
    If d.Content.End >= 2 Then
        Set e = d.Range(d.Content.End - 2, d.Content.End - 1)
        If e.Text = vbCr Then e.Delete
    End If
    d.TrackRevisions = trk
    If pos > d.Content.End - 1 Then pos = d.Content.End - 1
    d.Range(pos, pos).Select
    Application.ScreenUpdating = True
    On Error Resume Next
    If Not ur Is Nothing Then ur.EndCustomRecord
End Sub

Public Sub RD_NumberNow()
    Dim p As String, d As Object, i As Integer, open1 As Boolean
    p = RDNumPath
    RDNumPath = ""
    If p = "" Then Exit Sub
    On Error Resume Next
    For Each d In Documents
        If d.FullName = p Then
            If Not d.Saved Then d.Save
            Err.Clear
            d.Close SaveChanges:=0
        End If
    Next d
    For Each d In Documents
        If d.FullName = p Then open1 = True
    Next d
    On Error GoTo 0
    If open1 Then
        MsgBox "Word did not close the document, so it was not numbered. Press the button again.", vbExclamation, TTL
        Exit Sub
    End If
    RunRD RDNumCmd, p, p
    On Error Resume Next
    For i = 1 To 20
        Err.Clear
        Documents.Open FileName:=p
        If Err.Number = 0 Then Exit For
        DoEvents
    Next i
    If Err.Number <> 0 Then MsgBox "The document is ready but Word could not open it again: open it yourself." & vbCr & p, vbInformation, TTL
    On Error GoTo 0
End Sub

Public Sub RD_Open(control As Object)
    Listen
    Dim p As String
    p = DocPath()
    If p = "" Then Exit Sub
    RunRD "open", p, ""
End Sub

' the document's file: saved, on this computer, as .docx
Private Function DocPath() As String
    Dim d As Object
    If Documents.Count = 0 Then
        MsgBox "Open a Word document first.", vbInformation, TTL
        Exit Function
    End If
    Set d = ActiveDocument
    If d.Path = "" Then
        MsgBox "Save the document first (as a Word document, .docx).", vbInformation, TTL
        Exit Function
    End If
    If InStr(d.FullName, "://") > 0 Then
        MsgBox "This document is stored online. Save a copy on this computer, then try again.", vbInformation, TTL
        Exit Function
    End If
    If LCase$(Right$(d.FullName, 5)) <> ".docx" Then
        MsgBox "Reactio Draw reads Word documents saved as .docx. Save the document as .docx, then try again.", vbInformation, TTL
        Exit Function
    End If
    If Not d.Saved Then
        On Error Resume Next
        d.Save
        If Err.Number <> 0 Then
            MsgBox "Word could not save the document (" & Err.Description & "). Save it, then try again.", vbExclamation, TTL
            Exit Function
        End If
        On Error GoTo 0
    End If
    DocPath = d.FullName
End Function

' ---------- editing one drawing ----------

' the picture or object that is selected (one click on it)
Private Function SelectedShape() As Object
    On Error Resume Next
    If Documents.Count = 0 Then Exit Function
    If Selection.InlineShapes.Count > 0 Then Set SelectedShape = Selection.InlineShapes(1): Exit Function
    ' a picture made from an SVG file is selected as a shape on a Mac, though it sits in the text: take it as the picture in the text
    If Selection.Range.InlineShapes.Count > 0 Then Set SelectedShape = Selection.Range.InlineShapes(1): Exit Function
    If Selection.ShapeRange.Count > 0 Then Set SelectedShape = Selection.ShapeRange(1)
End Function

' the key [RD:...] in a picture's alt text or title (a Mac keeps what is set on a selected shape in either)
Private Function HasKey(s As Object, key As String) As Boolean
    Dim a As String, t As String
    On Error Resume Next
    a = s.AlternativeText
    t = s.Title
    On Error GoTo 0
    HasKey = InStr(a, key) > 0 Or InStr(t, key) > 0
End Function

' a Reactio Draw drawing: a picture with the drawing in its alt text (Mac), or a Reactio Draw object (Windows)
Private Function IsRD(s As Object) As Boolean
    ' (an error inside an If's condition under Resume Next would run its Then part: each value is read first)
    Dim a As String, p As String
    On Error Resume Next
    a = s.AlternativeText
    p = s.OLEFormat.ProgID
    On Error GoTo 0
    IsRD = InStr(a, "RDRAW1:") > 0 Or InStr(p, "ReactioDraw") > 0
End Function

' the id that ties a picture to its drawing open in Reactio Draw: [RD:...] at the end of its alt text
Private Function DrawingId(s As Object) As String
    Dim a As String, i As Long, j As Long
    a = s.AlternativeText
    i = InStr(a, "[RD:")
    If i > 0 Then
        j = InStr(i, a, "]")
        If j > i Then DrawingId = Mid$(a, i + 4, j - i - 4): Exit Function
    End If
    Randomize
    DrawingId = Format$(Now, "yymmddhhnnss") & CStr(Int(Rnd * 9000) + 1000)
    s.AlternativeText = a & " [RD:" & DrawingId & "]"
End Function

' for keys (Tools > Customize Keyboard > Macros): Word lists only macros without arguments
Public Sub ReactioDrawEdit()
    RD_Edit Nothing
End Sub

Public Sub ReactioDrawUpdate()
    RD_Update Nothing
End Sub

Public Sub RD_Edit(Optional control As Object)
    Listen
    Dim s As Object
    Set s = SelectedShape()
    If s Is Nothing Then
        MsgBox "Click a Reactio Draw picture once to select it, then press Edit.", vbInformation, TTL
        Exit Sub
    End If
    If Not IsRD(s) Then
        MsgBox "This picture has no Reactio Draw drawing in it.", vbInformation, TTL
        Exit Sub
    End If
#If Mac Then
    Dim wid As String
    wid = DrawingId(s)
    RunRD "edit", wid, s.AlternativeText
#Else
    On Error Resume Next
    s.OLEFormat.DoVerb 0
    If Err.Number <> 0 Then MsgBox "Double-click the Reactio Draw object to edit it.", vbInformation, TTL
#End If
End Sub

' drawings saved in Reactio Draw go back in place of their pictures; Reactio Draw runs this by itself after Save
Public Sub RD_Update(Optional control As Object)
    Listen
#If Mac Then
    Dim list As String, ids() As String, i As Long, n As Long, xdir As String
    list = AskHelper("pending", "", "")
    If Left$(list, 13) = "Reactio Draw " Then MsgBox list, vbExclamation, TTL: Exit Sub
    If list = "" Then
        If Not control Is Nothing Then MsgBox "No drawings are waiting: edit one with Edit, then Save in Reactio Draw.", vbInformation, TTL
        Exit Sub
    End If
    xdir = AskHelper("dir", "", "")
    ids = Split(list, vbTab)
    For i = LBound(ids) To UBound(ids)
        If ids(i) <> "" Then
            If PutBack(ids(i), AskHelper("tag", ids(i), ""), xdir) Then n = n + 1: AskHelper "done", ids(i), ""
        End If
    Next i
#Else
    MsgBox "On Windows a Reactio Draw object updates itself: double-click it, edit, and save.", vbInformation, TTL
#End If
End Sub

' the picture with this id, in any open document, replaced by the new one at the same place; its size changes as much as the drawing did
' (Reactio Draw writes "RDSIZE <width ratio> <height ratio>" on the first line of the tag file)
Private Function PutBack(wid As String, tag As String, xdir As String) As Boolean
    Dim d As Object, s As Object, n As Object, r As Object, key As String, i As Long, p() As String, rw As Single, rh As Single, ow As Single, oh As Single
    key = "[RD:" & wid & "]"
    If Left$(tag, 7) = "RDSIZE " Then
        i = InStr(tag, vbLf): If i = 0 Then i = InStr(tag, vbCr)
        If i > 0 Then
            p = Split(Trim$(Mid$(tag, 8, i - 8)), " ")
            If UBound(p) >= 1 Then rw = Val(p(0)): rh = Val(p(1))
            tag = Mid$(tag, i + 1)
            Do While Left$(tag, 1) = vbLf Or Left$(tag, 1) = vbCr: tag = Mid$(tag, 2): Loop
        End If
    End If
    If InStr(tag, "RDRAW1:") = 0 Then Exit Function
    For Each d In Documents
        For Each s In d.InlineShapes
            If HasKey(s, key) Then
                ow = s.Width: oh = s.Height
                Set r = s.Range
                r.Collapse 1
                Set n = Nothing
                On Error Resume Next
                Set n = d.InlineShapes.AddPicture(FileName:=xdir & wid & ".svg", LinkToFile:=False, SaveWithDocument:=True, Range:=r)
                If n Is Nothing Then Err.Clear: Set n = d.InlineShapes.AddPicture(FileName:=xdir & wid & ".png", LinkToFile:=False, SaveWithDocument:=True, Range:=r)
                On Error GoTo 0
                If n Is Nothing Then
                    MsgBox "Word could not insert the new picture.", vbExclamation, TTL
                    Exit Function
                End If
                ' the new size: as much bigger or smaller as the drawing got, but never wider than the text column
                ' (both set in one step)
                SizeTo n, IIf(rw > 0, ow * rw, n.Width), IIf(rh > 0, oh * rh, n.Height)
                n.AlternativeText = tag & " " & key
                s.Delete
                PutBack = True
                Exit Function
            End If
        Next s
        For Each s In d.Shapes
            If HasKey(s, key) Then
                MsgBox "The picture is not in line with the text. Set it In Line with Text (Wrap Text), then press Update.", vbInformation, TTL
                Exit Function
            End If
        Next s
    Next d
    MsgBox "The picture this drawing came from is not in an open document. Open that document, then press Update.", vbInformation, TTL
End Function

' a picture set to width w and height h, scaled down (keeping its proportions) when w is wider than the text between the margins
Private Sub SizeTo(n As Object, w As Single, h As Single)
    Dim maxW As Single
    On Error Resume Next
    With n.Range.Sections(1).PageSetup
        maxW = .PageWidth - .LeftMargin - .RightMargin - .Gutter
    End With
    If maxW > 0 And w > maxW Then h = h * maxW / w: w = maxW
    If Abs(n.Width - w) < 0.5 And Abs(n.Height - h) < 0.5 Then Exit Sub
    n.LockAspectRatio = 0
    n.Width = w
    n.Height = h
    n.LockAspectRatio = -1
End Sub

' ---------- marks: hidden text, seen on screen, never printed; the button stays pressed while they are on ----------

Public Sub RD_Load(ribbon As Object)
    Set RDRibbon = ribbon
    RD_Tick
End Sub

' Word starts the template: listen to double-clicks (ThisDocument does)
Public Sub AutoExec()
    RD_Tick
End Sub

' Word drops the listening now and then (after some macros end), so it is started again every few seconds, by every
' button and by every drawing that comes back
Private Sub Listen()
    On Error Resume Next
    If ThisDocument.RDApp Is Nothing Then ThisDocument.RDListen
End Sub

Public Sub RD_Tick()
    On Error Resume Next
    Listen
    FitPage
    Application.OnTime When:=Now + TimeSerial(0, 0, 3), Name:="RD_Tick"
End Sub

' a Reactio Draw drawing wider than the text between the margins (pasted, or grown after editing; on Windows the object
' takes the size Reactio Draw gives it) is scaled down to that width, keeping its proportions
Private Sub FitPage()
    Dim s As Object, maxW As Single
    On Error Resume Next
    If Documents.Count = 0 Then Exit Sub
    For Each s In ActiveDocument.InlineShapes
        With s.Range.Sections(1).PageSetup
            maxW = .PageWidth - .LeftMargin - .RightMargin - .Gutter
        End With
        If maxW > 0 And s.Width > maxW + 0.5 Then
            If IsRD(s) Then SizeTo s, s.Width, s.Height
        End If
    Next s
End Sub

' a double-click in Word (ThisDocument listens): True when it was on a Reactio Draw picture, which then opens in Reactio Draw
Public Function RD_DoubleClick(Sel As Object) As Boolean
#If Mac Then
    Dim s As Object
    On Error Resume Next
    If Sel.InlineShapes.Count > 0 Then Set s = Sel.InlineShapes(1)
    If s Is Nothing Then
        If Sel.Range.InlineShapes.Count > 0 Then Set s = Sel.Range.InlineShapes(1)
    End If
    If s Is Nothing Then
        If Sel.ShapeRange.Count > 0 Then Set s = Sel.ShapeRange(1)
    End If
    On Error GoTo 0
    If s Is Nothing Then Exit Function
    If Not IsRD(s) Then Exit Function
    RunRD "edit", DrawingId(s), s.AlternativeText
    RD_DoubleClick = True
#End If
End Function

Private Function MarkText() As String
    MarkText = ChrW(9004) & " Reactio"
End Function

Private Function HasMarks(d As Object) As Boolean
    Dim r As Object
    On Error Resume Next
    Set r = d.Content
    r.TextRetrievalMode.IncludeHiddenText = True
    HasMarks = InStr(r.Text, MarkText()) > 0
End Function

' the button's state: pressed while the document has marks
Public Sub RD_MarkState(control As Object, ByRef pressed)
    pressed = False
    If Documents.Count > 0 Then pressed = HasMarks(ActiveDocument)
End Sub

Public Sub RD_Mark(control As Object, Optional pressed As Boolean = True)
    Listen
    Dim d As Object, s As Object, r As Object, n As Long, had As Boolean
    If Documents.Count = 0 Then Exit Sub
    Set d = ActiveDocument
    had = ActiveWindow.View.ShowHiddenText
    ' first take away the marks there are (hidden text is found only while it is shown)
    ActiveWindow.View.ShowHiddenText = True
    Set r = d.Content
    With r.Find
        .ClearFormatting
        .Replacement.ClearFormatting
        .Text = MarkText()
        .Replacement.Text = ""
        .Forward = True
        .Wrap = 0
        .MatchWildcards = False
        .Execute Replace:=2
    End With
    If Not pressed Then
        ActiveWindow.View.ShowHiddenText = had
        If Not RDRibbon Is Nothing Then RDRibbon.InvalidateControl "rdMark"
        Exit Sub
    End If
    For Each s In d.InlineShapes
        If IsRD(s) Then n = n + AddMark(d, s.Range.End)
    Next s
    For Each s In d.Shapes
        If IsRD(s) Then n = n + AddMark(d, s.Anchor.Paragraphs(1).Range.Start)
    Next s
    If n = 0 Then MsgBox "There are no Reactio Draw drawings in this document.", vbInformation, TTL
    If Not RDRibbon Is Nothing Then RDRibbon.InvalidateControl "rdMark"
End Sub

Private Function AddMark(d As Object, at As Long) As Long
    Dim r As Object
    Set r = d.Range(at, at)
    r.InsertAfter MarkText()
    r.Font.Hidden = True
    r.Font.Size = 7
    r.Font.Color = RGB(37, 99, 235)
    AddMark = 1
End Function

' ---------- running Reactio Draw ----------

#If Mac Then
' Word on a Mac may run other programs only through a script in ~/Library/Application Scripts/com.microsoft.Word
Private Function AskHelper(cmd As String, a As String, b As String) As String
    On Error Resume Next
    AskHelper = AppleScriptTask("ReactioDraw.applescript", "rd", cmd & vbTab & a & vbTab & b)
    If Err.Number <> 0 Then AskHelper = "Reactio Draw is not connected to Word. Run ""Install Word tab.command"" from the Reactio Draw folder again."
End Function

Private Function RunRD(cmd As String, p As String, o As String) As Boolean
    Dim r As String
    r = AskHelper(cmd, p, o)
    If r = "" Then
        RunRD = True
    Else
        MsgBox r, vbExclamation, TTL
    End If
End Function

Private Sub OpenResult(o As String)
    ' the script has opened it already (Word may not open a new file by itself on a Mac)
End Sub
#Else
' ReactioDraw.exe writes its folder (and its own path) here when it starts
Private Function RunRD(cmd As String, p As String, o As String) As Boolean
    Dim f As String, sh As Object, code As Long, t As String, a As String
    f = GetSetting("ReactioDraw", "App", "Folder", "")
    If f = "" Then
        MsgBox "Reactio Draw was not found. Start ReactioDraw.exe once: it connects itself to Word.", vbExclamation, TTL
        Exit Function
    End If
    If Dir$(f & "\reactio.exe") = "" Then
        MsgBox "Reactio Draw was not found in " & f & ". Start ReactioDraw.exe once from its new folder.", vbExclamation, TTL
        Exit Function
    End If
    Set sh = CreateObject("WScript.Shell")
    If cmd = "open" Then
        sh.Run """" & GetSetting("ReactioDraw", "App", "Exe", f & "\ReactioDraw.exe") & """ """ & p & """", 1, False
        RunRD = True
        Exit Function
    End If
    If cmd = "number-here" Or cmd = "marks-here" Then
        a = ""
        If cmd = "marks-here" Then a = " --marks"
        code = sh.Run("""" & f & "\reactio.exe"" word-number """ & p & """ -o """ & o & """" & a, 0, True)
        If code <> 0 Then
            MsgBox "Reactio Draw could not number this document (exit code " & code & ").", vbExclamation, TTL
            Exit Function
        End If
        If Dir$(o) = "" Then
            MsgBox "There are no [[key]] marks in this document: write [[name]] where a compound's number goes.", vbInformation, TTL
            Exit Function
        End If
        RunRD = True
        Exit Function
    End If
    If cmd = "number" Or cmd = "marks" Then
        t = Environ$("TEMP") & "\ReactioDraw numbered.docx"
        If Dir$(t) <> "" Then Kill t
        a = ""
        If cmd = "marks" Then a = " --marks"
        code = sh.Run("""" & f & "\reactio.exe"" word-number """ & p & """ -o """ & t & """" & a, 0, True)
        If code <> 0 Then
            MsgBox "Reactio Draw could not number this document (exit code " & code & ").", vbExclamation, TTL
            Exit Function
        End If
        If Dir$(t) = "" Then
            MsgBox "There are no [[key]] marks in this document: write [[name]] where a compound's number goes.", vbInformation, TTL
            Exit Function
        End If
        FileCopy p, Environ$("TEMP") & "\ReactioDraw before numbering.docx"
        FileCopy t, p
        Kill t
        RunRD = True
        Exit Function
    End If
    If cmd = "unmark" Then code = sh.Run("""" & f & "\reactio.exe"" word-number """ & p & """ -o """ & o & """ --strip", 0, True)
    If cmd = "final" Then code = sh.Run("""" & f & "\reactio.exe"" word-clean """ & p & """ -o """ & o & """ --strip", 0, True)
    If cmd = "plain" Then code = sh.Run("""" & f & "\reactio.exe"" word-clean """ & p & """ -o """ & o & """", 0, True)
    If cmd = "cdxml" Then code = sh.Run("""" & f & "\reactio.exe"" convert """ & p & """ -o """ & o & """", 0, True)
    If code <> 0 Then
        MsgBox "Reactio Draw could not do this (exit code " & code & "). Are there chemical drawings in the document?", vbExclamation, TTL
        Exit Function
    End If
    If Dir$(o) = "" Then
        MsgBox "There are no Reactio Draw drawings in this document.", vbInformation, TTL
        Exit Function
    End If
    RunRD = True
End Function

Private Sub OpenResult(o As String)
    Documents.Open o
End Sub
#End If
