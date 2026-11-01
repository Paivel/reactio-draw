Attribute VB_Name = "ReactioExcel"
' Reactio Draw tab in Excel (Windows and Mac): structures and properties for a column of SMILES.
' Select the cells with SMILES (one column), then
'   DrawStructures      - a picture of each structure, in the column headed "Structure" (or the first free column)
'   CalculateProperties - formula, Mol. Wt., exact mass, cLogP, TPSA, H-bond donors and acceptors, rotatable bonds and
'                         InChIKey: into the columns whose header (the row above the SMILES) names them, or, when no
'                         header names any, all of them into the first free columns, with the headers written above
'   =REACTIO(A2, "MW")    - one property in any cell: MW, formula, exact mass, cLogP, TPSA, HBD, HBA, rotatable bonds, InChIKey
' The work is done by Reactio Draw's command line (reactio table), all rows in one run.
' Reactio Draw (c) 2026 Pavel Sakharov and contributors. Free software under the GNU Affero General Public License v3.0 or later.
Option Explicit

Private Const TTL As String = "Reactio Draw"
' the ribbon's choices, kept between sessions: journal style (acs, rsc, nature, angewandte, app) and atom colours
Private Const STYLES As String = "acs|rsc|nature|angewandte|app"
' the REACTIO formula: answers kept while Excel is open, SMILES waiting for the next run, a run on its way
Private RXCache As New Collection, RXQueue As New Collection, RXBusy As Boolean
Private RXAsked As Date, RXName As Boolean, RXNMR As Boolean, RXSmi As Boolean

Public Sub RX_StyleCount(control As Object, ByRef n)
    n = UBound(Split(STYLES, "|")) + 1
End Sub

Public Sub RX_StyleLabel(control As Object, i As Integer, ByRef lbl)
    lbl = Array("ACS", "RSC", "Nature", "Angewandte", "As in Reactio Draw")(i)
End Sub

Public Sub RX_StyleIndex(control As Object, ByRef i)
    Dim k As Long, a() As String
    a = Split(STYLES, "|")
    i = 0
    For k = 0 To UBound(a)
        If a(k) = CurStyle() Then i = k
    Next k
End Sub

Public Sub RX_StyleChange(control As Object, id As String, i As Integer)
    SaveSetting "ReactioDraw", "Excel", "Style", Split(STYLES, "|")(i)
End Sub

Public Sub RX_ColorState(control As Object, ByRef pressed)
    pressed = (GetSetting("ReactioDraw", "Excel", "Colors", "0") = "1")
End Sub

Public Sub RX_Color(control As Object, pressed As Boolean)
    SaveSetting "ReactioDraw", "Excel", "Colors", IIf(pressed, "1", "0")
End Sub

Private Function CurStyle() As String
    CurStyle = GetSetting("ReactioDraw", "Excel", "Style", "acs")
End Function

' the options for reactio table: --style acs (or none: the app's own), --colors, --scale 3
Private Function TableOpts(pics As Boolean, r As Range) As String
    Dim o As String
    If pics Then
        o = " --png --scale 3"
        If CurStyle() <> "app" Then o = o & " --style " & CurStyle()
        If GetSetting("ReactioDraw", "Excel", "Colors", "0") = "1" Then o = o & " --colors"
    Else
        o = " --props --inchikey"
        ' names and NMR take longer and fill wide cells: only when a header asks for them
        If HeaderCol(r, PropNames(10)) > 0 Then o = o & " --name"
        If HeaderCol(r, PropNames(11)) > 0 Or HeaderCol(r, PropNames(12)) > 0 Then o = o & " --nmr"
        If HeaderCol(r, PropNames(13)) > 0 Then o = o & " --smiles"
    End If
    TableOpts = o
End Function

' ---------- the buttons ----------
' Excel's Macros list shows only macros without arguments: these two are for it
Public Sub DrawStructures()
Attribute DrawStructures.VB_Description = "Reactio Draw: a picture of each SMILES in the selected column, in the column headed Structure (or the first free one)."
    RunTable True
End Sub

Public Sub CalculateProperties()
Attribute CalculateProperties.VB_Description = "Reactio Draw: properties of each SMILES in the selected column, into the columns their headers name (or all of them into the first free columns)."
    RunTable False
End Sub

' and these for the buttons on the Reactio Draw tab
Public Sub RX_Structures(control As Object)
    RunTable True
End Sub

Public Sub RX_Properties(control As Object)
    RunTable False
End Sub

Private Sub RunTable(pics As Boolean)
    Dim r As Range, c As Range, n As Long, wd As String, inF As String, outD As String, f As Integer, s As String
    If TypeName(Selection) <> "Range" Then
        MsgBox "Select the cells with SMILES first (one column).", vbInformation, TTL
        Exit Sub
    End If
    Set r = Intersect(Selection, ActiveSheet.UsedRange)
    If r Is Nothing Then Exit Sub
    If r.Columns.Count > 1 Then Set r = r.Columns(1)
    wd = WorkDir()
    If wd = "" Then Exit Sub
    inF = wd & "in.tsv"
    ' a folder of its own for each run, so no picture of an earlier run is taken
    outD = wd & "out-" & Format(Now, "yyyymmdd-hhnnss")
    f = FreeFile
    Open inF For Output As #f
    n = 0
    For Each c In r.Cells
        ' a SMILES or a name (Reactio Draw turns a name into its structure first)
        s = Trim$(Replace(Replace(CStr(c.Value), vbTab, " "), vbLf, " "))
        If s <> "" Then
            Print #f, CStr(c.Row) & vbTab & s
            n = n + 1
        End If
    Next c
    Close #f
    If n = 0 Then
        MsgBox "There are no SMILES in the selected cells.", vbInformation, TTL
        Exit Sub
    End If
    Application.StatusBar = "Reactio Draw: " & n & " structure" & IIf(n > 1, "s", "") & "..."
    If Not RunCli(TableOpts(pics, r), inF, outD) Then
        Application.StatusBar = False
        Exit Sub
    End If
    Application.ScreenUpdating = False
    If pics Then PlacePictures r, outD Else FillProperties r, outD
    Application.ScreenUpdating = True
    Application.StatusBar = False
End Sub

' the Formula menu of the tab: a column of =REACTIO(cell, "MW") beside the selected SMILES or names, in the column headed
' with that property (or the first free column, with the header written above); the values come as the formula computes
Public Sub RX_Formula(control As Object)
    AddFormulas CStr(control.Tag)
End Sub

Private Sub AddFormulas(what As String)
    Dim r As Range, c As Range, col As Long
    If TypeName(Selection) <> "Range" Then
        MsgBox "Select the cells with SMILES or names first (one column).", vbInformation, TTL
        Exit Sub
    End If
    Set r = Intersect(Selection, ActiveSheet.UsedRange)
    If r Is Nothing Then Exit Sub
    If r.Columns.Count > 1 Then Set r = r.Columns(1)
    col = HeaderCol(r, PropNames(PropIndex(what)))
    If col = 0 Then
        col = FreeCol(r)
        If r.Row > 1 Then ActiveSheet.Cells(r.Row - 1, col).Value = what
    End If
    For Each c In r.Cells
        If Trim$(CStr(c.Value)) <> "" Then ActiveSheet.Cells(c.Row, col).Formula = "=REACTIO(" & c.Address(False, False) & ",""" & what & """)"
    Next c
End Sub

' ---------- where the results go ----------
' a header is compared without case, spaces, dots, dashes and underscores: "Mol. Wt.", "MW" and "molwt" are the same
Private Function Norm(ByVal v As String) As String
    Dim ch As Variant
    v = LCase$(Trim$(v))
    For Each ch In Array(" ", ".", "-", "_", "(", ")", ",")
        v = Replace(v, ch, "")
    Next ch
    Norm = v
End Function

' the column in the header row whose header is one of the names ("|" between them), to the right of the SMILES; 0 if none
Private Function HeaderCol(r As Range, names As String) As Long
    Dim c As Long, last As Long, v As String
    HeaderCol = 0
    If r.Row = 1 Then Exit Function
    last = ActiveSheet.Cells(r.Row - 1, ActiveSheet.Columns.Count).End(xlToLeft).Column
    For c = r.Column + 1 To last
        v = Norm(CStr(ActiveSheet.Cells(r.Row - 1, c).Value))
        If v <> "" And InStr("|" & names & "|", "|" & v & "|") > 0 Then
            HeaderCol = c
            Exit Function
        End If
    Next c
End Function

' the first column to the right of everything in the selected rows and their header row
Private Function FreeCol(r As Range) As Long
    Dim c As Range, k As Long, m As Long
    m = r.Column
    For Each c In r.Cells
        k = ActiveSheet.Cells(c.Row, ActiveSheet.Columns.Count).End(xlToLeft).Column
        If k > m Then m = k
    Next c
    If r.Row > 1 Then
        k = ActiveSheet.Cells(r.Row - 1, ActiveSheet.Columns.Count).End(xlToLeft).Column
        If k > m Then m = k
    End If
    FreeCol = m + 1
End Function

' ---------- pictures: one per row ----------
' Natural size (the default): each structure at the journal size of the style (sizes.tsv gives it in pt); the row grows
' to the picture and the column to the widest one. "Fit to cells" shrinks each picture into its cell instead.
Private Sub PlacePictures(r As Range, outD As String)
    Dim c As Range, t As Range, p As String, sh As Shape, k As Double, nm As String, col As Long, o As Object, inCell As Boolean, ok As Boolean, smi As String
    Dim sz As New Collection, f As Integer, ln As String, parts() As String, w As Double, h As Double, wMax As Double, fit As Boolean
    fit = (GetSetting("ReactioDraw", "Excel", "Fit", "0") = "1")
    inCell = True
    col = HeaderCol(r, "structure|structures|picture|pictures|image|drawing")
    If col = 0 Then
        col = FreeCol(r)
        If r.Row > 1 Then ActiveSheet.Cells(r.Row - 1, col).Value = "Structure"
    End If
    f = FreeFile
    On Error Resume Next
    Open outD & Sep() & "sizes.tsv" For Input As #f
    If Err.Number = 0 Then
        Do While Not EOF(f)
            Line Input #f, ln
            parts = Split(ln, vbTab)
            If UBound(parts) >= 2 Then sz.Add Array(Val(parts(1)), Val(parts(2))), "r" & parts(0)
        Loop
        Close #f
    End If
    Err.Clear
    On Error GoTo 0
    For Each c In r.Cells
        p = outD & Sep() & CStr(c.Row) & ".png"
        If Dir$(p) <> "" Then
            Set t = ActiveSheet.Cells(c.Row, col)
            nm = "RD_" & t.Address(False, False)
            On Error Resume Next
            ActiveSheet.Shapes(nm).Delete
            w = 0: h = 0
            w = sz("r" & CStr(c.Row))(0): h = sz("r" & CStr(c.Row))(1)
            On Error GoTo 0
            If inCell Then
                ' Excel 365: the picture goes into the cell itself ("Place in Cell") and scales with it, keeping its shape,
                ' when the column or the row changes. Excel puts it only into the active cell, so the cell is selected
                ' first; if the SMILES changed all the same, it is put back and pictures go over the cells from here on.
                smi = CStr(c.Value)
                t.Select
                Set o = Selection
                Err.Clear
                On Error Resume Next
                o.InsertPictureInCell p
                ok = (Err.Number = 0)
                On Error GoTo 0
                If CStr(c.Value) <> smi Then c.Value = smi: ok = False
                If ok Then
                    If fit Or w = 0 Then
                        If t.RowHeight < 60 Then t.RowHeight = 60
                        If t.ColumnWidth < 18 Then t.ColumnWidth = 18
                    Else
                        If t.RowHeight < h + 6 Then t.RowHeight = Application.WorksheetFunction.Min(409, h + 6)
                        If w + 6 > wMax Then wMax = w + 6
                    End If
                    GoTo nextc
                End If
                inCell = False
            End If
            Set sh = ActiveSheet.Shapes.AddPicture(p, False, True, t.Left, t.Top, -1, -1)
            ' free of the cells while the rows and the column change size, or it would stretch with them
            sh.Placement = xlFreeFloating
            sh.LockAspectRatio = msoTrue
            If fit Or w = 0 Then
                If t.RowHeight < 60 Then t.RowHeight = 60
                If t.ColumnWidth < 18 Then t.ColumnWidth = 18
                k = Application.WorksheetFunction.Min((t.Width - 4) / sh.Width, (t.Height - 4) / sh.Height, 1)
                sh.Width = sh.Width * k
            Else
                sh.Width = w
                If t.RowHeight < sh.Height + 6 Then t.RowHeight = Application.WorksheetFunction.Min(409, sh.Height + 6)
                If sh.Width + 6 > wMax Then wMax = sh.Width + 6
            End If
            sh.Name = nm
            sh.AlternativeText = CStr(c.Value)
        End If
nextc:
    Next c
    r.Select
    ' the column as wide as the widest picture (width in points: about 5.25 pt a character of the standard font)
    If wMax > 0 Then
        If ActiveSheet.Columns(col).Width < wMax Then
            ActiveSheet.Columns(col).ColumnWidth = wMax / 5.25
            ' the width in characters depends on the font: one correction from the width it really got
            If ActiveSheet.Columns(col).Width > 0 Then ActiveSheet.Columns(col).ColumnWidth = _
                Application.WorksheetFunction.Min(255, ActiveSheet.Columns(col).ColumnWidth * wMax / ActiveSheet.Columns(col).Width)
        End If
    End If
    ' every picture centred in its cell once the rows and the column have their final size, then tied to the cell
    For Each c In r.Cells
        Set t = ActiveSheet.Cells(c.Row, col)
        On Error Resume Next
        Set sh = Nothing
        Set sh = ActiveSheet.Shapes("RD_" & t.Address(False, False))
        On Error GoTo 0
        If Not sh Is Nothing Then
            ' never out of its cell: a picture larger than the cell can grow (409 pt a row) is made smaller
            k = Application.WorksheetFunction.Min((t.Width - 4) / sh.Width, (t.Height - 4) / sh.Height, 1)
            If k < 1 And k > 0 Then sh.Width = sh.Width * k
            sh.Left = t.Left + (t.Width - sh.Width) / 2
            sh.Top = t.Top + (t.Height - sh.Height) / 2
            sh.Placement = xlMove
        End If
    Next c
End Sub

Public Sub RX_FitState(control As Object, ByRef pressed)
    pressed = (GetSetting("ReactioDraw", "Excel", "Fit", "0") = "1")
End Sub

Public Sub RX_Fit(control As Object, pressed As Boolean)
    SaveSetting "ReactioDraw", "Excel", "Fit", IIf(pressed, "1", "0")
End Sub

' ---------- properties ----------
' the names each property is found under in a header
Private Function PropNames(i As Long) As String
    PropNames = Choose(i, "formula|molecularformula", "molwt|mw|molecularweight|molweight|mwt", _
        "exactmass|monoisotopicmass|monoisotopic", "clogp|logp", "tpsa|psa", "hbonddonors|hbd|donors|hdonors", _
        "hbondacceptors|hba|acceptors|hacceptors", "rotatablebonds|rotbonds|rotb|nrotb|rotatable", "inchikey", _
        "name|iupacname|iupac|systematicname", "1hnmr|hnmr|1h|protonnmr|nmr1h|1hnmrpredictednmrshiftdb2", _
        "13cnmr|cnmr|13c|carbonnmr|nmr13c|13cnmrpredictednmrshiftdb2", "smiles|canonicalsmiles")
End Function

Private Sub FillProperties(r As Range, outD As String)
    Dim f As Integer, ln As String, parts() As String, hdr() As String, i As Long, rw As Long, first As Boolean
    Dim col() As Long, named As Boolean, nx As Long, k As Long
    f = FreeFile
    On Error GoTo nofile
    Open outD & Sep() & "properties.tsv" For Input As #f
    On Error GoTo 0
    first = True
    Do While Not EOF(f)
        Line Input #f, ln
        parts = Split(ln, vbTab)
        If first Then
            ' header names the columns: only those are filled; no header names any: all of them, in the first free columns
            hdr = parts
            ReDim col(1 To UBound(hdr))
            named = False
            For i = 1 To UBound(hdr)
                k = PropIndex(hdr(i))
                If k > 0 Then col(i) = HeaderCol(r, PropNames(k))
                If col(i) > 0 Then named = True
            Next i
            If Not named Then
                nx = FreeCol(r)
                For i = 1 To UBound(hdr)
                    col(i) = nx + i - 1
                    If r.Row > 1 Then ActiveSheet.Cells(r.Row - 1, col(i)).Value = hdr(i)
                Next i
            End If
            first = False
        ElseIf UBound(parts) >= 1 Then
            rw = CLng(parts(0))
            For i = 1 To UBound(parts)
                If i <= UBound(col) Then
                    If col(i) > 0 Then
                        ' numbers come with a point whatever the computer's decimal sign: Val reads them so
                        If parts(i) <> "" And Not (parts(i) Like "*[!0-9.eE+-]*") Then
                            ActiveSheet.Cells(rw, col(i)).Value = Val(parts(i))
                        Else
                            ActiveSheet.Cells(rw, col(i)).Value = parts(i)
                        End If
                    End If
                End If
            Next i
        End If
    Loop
    Close #f
    If Not first Then
        For i = 1 To UBound(col)
            If col(i) > 0 And Not named Then ActiveSheet.Columns(col(i)).AutoFit
        Next i
    End If
    Exit Sub
nofile:
    MsgBox "Reactio Draw did not return the properties.", vbExclamation, TTL
End Sub

' ---------- formulas: =REACTIO(A2, "MW") ----------
' A formula cannot start another program while Excel calculates, so a SMILES seen for the first time shows "..." and is
' queued; right after the calculation all queued SMILES go to Reactio Draw in one run, and the sheet is calculated again.
' The answers are kept while Excel is open (the cells keep their values in the saved file too).

' Collection keys ignore case, SMILES do not: every capital gets a "^" in front
Private Function CKey(ByVal smi As String) As String
    Dim i As Long, ch As String, k As String
    For i = 1 To Len(smi)
        ch = Mid$(smi, i, 1)
        If ch Like "[A-Z]" Then k = k & "^" & ch Else k = k & ch
    Next i
    CKey = "s" & k
End Function

Private Function PropIndex(ByVal what As String) As Long
    Dim i As Long, v As String
    v = Norm(what)
    PropIndex = 0
    For i = 1 To 13
        If InStr("|" & PropNames(i) & "|", "|" & v & "|") > 0 Then PropIndex = i: Exit Function
    Next i
End Function

' Excel's formula help (the fx box): what REACTIO does and what each argument is. Auto_Open runs when the book or the
' add-in opens; run it once by hand after importing this module.
Public Sub Auto_Open()
    On Error Resume Next
    Application.MacroOptions Macro:="REACTIO", Category:="Reactio Draw", _
        Description:="A property of a structure given as SMILES or as a name, calculated by Reactio Draw on this computer.", _
        ArgumentDescriptions:=Array("The cell with the SMILES or the name (or the text itself, in quotes): caffeine, 2-acetyloxybenzoic acid, CCO.", _
            "Which property: ""MW"" (the default), ""formula"", ""exact mass"", ""cLogP"", ""TPSA"", ""HBD"", ""HBA"", ""rotatable bonds"", ""InChIKey"", ""name"", ""SMILES"", ""1H NMR"" or ""13C NMR"" (predicted from nmrshiftdb2 data).")
End Sub

Public Function REACTIO(smiles As Variant, Optional what As Variant = "MW") As Variant
Attribute REACTIO.VB_Description = "Reactio Draw: a property of a structure given as SMILES or as a name: MW, formula, exact mass, cLogP, TPSA, HBD, HBA, rotatable bonds, InChIKey, name, SMILES, 1H NMR or 13C NMR."
    Dim smi As String, i As Long, a As Variant, k As String, have As Boolean
    If TypeName(smiles) = "Range" Then smi = Trim$(CStr(smiles.Cells(1, 1).Value)) Else smi = Trim$(CStr(smiles))
    If smi = "" Then REACTIO = "": Exit Function
    i = PropIndex(CStr(what))
    If i = 0 Then REACTIO = CVErr(xlErrValue): Exit Function
    k = CKey(smi)
    On Error Resume Next
    a = RXCache(k)
    have = (Err.Number = 0)
    Err.Clear
    On Error GoTo 0
    If have Then
        If a(0) = "ERR" Then REACTIO = CVErr(xlErrNA): Exit Function
        If Not IsEmpty(a(i)) Then
            If a(i) <> "" And Not (a(i) Like "*[!0-9.eE+-]*") Then REACTIO = Val(a(i)) Else REACTIO = a(i)
            Exit Function
        End If
    End If
    ' not known yet (or known without this property): into the queue, with what the next run must add
    If i = 10 Then RXName = True
    If i = 11 Or i = 12 Then RXNMR = True
    If i = 13 Then RXSmi = True
    On Error Resume Next
    RXQueue.Add smi, k
    Err.Clear
    On Error GoTo 0
    ' a run not started within a minute is asked for again
    If Not RXBusy Or Now - RXAsked > 1 / 1440 Then
        RXBusy = True
        RXAsked = Now
        ' a second later, with the book's name: Excel drops a run asked for while it is still calculating, and the formula
        ' may be in another book than this code (the add-in)
        Application.OnTime Now + TimeSerial(0, 0, 1), "'" & ThisWorkbook.Name & "'!ReactioFormulasRun"
    End If
    REACTIO = "..."
End Function

' the Update button of the tab: every REACTIO formula of the open workbooks calculated again, the new SMILES and names
' sent to Reactio Draw at once (without waiting for Excel to start the run by itself)
Public Sub RX_Update(control As Object)
    ReactioUpdate
End Sub

Public Sub ReactioUpdate()
Attribute ReactioUpdate.VB_Description = "Reactio Draw: calculate every REACTIO formula again, now."
    Application.CalculateFull
    ReactioFormulasRun
End Sub

' runs after the calculation, by itself: all queued SMILES in one run of Reactio Draw
Public Sub ReactioFormulasRun()
Attribute ReactioFormulasRun.VB_Description = "Reactio Draw: used by the REACTIO formula (runs by itself)."
    Dim wd As String, inF As String, outD As String, f As Integer, n As Long, i As Long, j As Long, ln As String
    Dim parts() As String, hdr() As String, smis As New Collection, keys As New Collection, v As Variant, opts As String
    ' the queue is taken at once: whatever happens next, no SMILES is asked for again and again
    For i = 1 To RXQueue.Count
        smis.Add RXQueue(i)
        keys.Add CKey(RXQueue(i)), CStr(i)
    Next i
    Set RXQueue = New Collection
    opts = "--props --inchikey"
    If RXName Then opts = opts & " --name"
    If RXNMR Then opts = opts & " --nmr"
    If RXSmi Then opts = opts & " --smiles"
    RXName = False: RXNMR = False: RXSmi = False
    n = smis.Count
    On Error GoTo done
    If n = 0 Then GoTo done
    wd = WorkDir()
    If wd = "" Then GoTo done
    inF = wd & "f-in.tsv"
    outD = wd & "f-out-" & Format(Now, "yyyymmdd-hhnnss")
    f = FreeFile
    Open inF For Output As #f
    For i = 1 To n
        Print #f, CStr(i) & vbTab & smis(i)
    Next i
    Close #f
    Application.StatusBar = "Reactio Draw: properties of " & n & " SMILES..."
    If Not RunCli(opts, inF, outD) Then GoTo done
    f = FreeFile
    Open outD & Sep() & "properties.tsv" For Input As #f
    If Not EOF(f) Then Line Input #f, ln: hdr = Split(ln, vbTab)
    Do While Not EOF(f)
        Line Input #f, ln
        parts = Split(ln, vbTab)
        If UBound(parts) >= 1 Then
            ' places 1 to 13, one for each property; Empty = not asked for yet; "ERR" in place 0: not read
            On Error Resume Next
            v = Empty
            v = RXCache(keys(parts(0)))
            If IsEmpty(v) Then ReDim v(0 To 13)
            RXCache.Remove keys(parts(0))
            On Error GoTo done
            If UBound(parts) = 1 And Left$(parts(1), 9) = "(not read" Then
                v(0) = "ERR"
            Else
                For j = 1 To UBound(parts)
                    If j <= UBound(hdr) Then
                        If PropIndex(hdr(j)) > 0 Then v(PropIndex(hdr(j))) = parts(j)
                    End If
                Next j
            End If
            RXCache.Add v, keys(parts(0))
        End If
    Loop
    Close #f
done:
    On Error Resume Next
    Close #f
    ' a SMILES that got no answer (Reactio Draw not reached, say): #N/A, not "..." for ever
    For i = 1 To n
        Err.Clear
        v = RXCache(keys(CStr(i)))
        If Err.Number <> 0 Then
            ReDim v(0 To 13)
            v(0) = "ERR"
            RXCache.Add v, keys(CStr(i))
        End If
    Next i
    Application.StatusBar = False
    RXBusy = False
    Application.CalculateFull
End Sub

Private Function Sep() As String
#If Mac Then
    Sep = "/"
#Else
    Sep = "\"
#End If
End Function

' ---------- running Reactio Draw ----------
#If Mac Then
' Excel on a Mac may run other programs only through a script in ~/Library/Application Scripts/com.microsoft.Excel,
' and read files only in its own places: the work goes through Office's shared folder
Private Function WorkDir() As String
    Dim d As String
    d = AskHelper("dir", "", "")
    If Left$(d, 1) <> "/" Then
        MsgBox "Excel is not connected to Reactio Draw yet. Run ""Install Excel tab.command"" from the Reactio Draw folder " & _
            "(after ""Install Reactio Draw.command""), then try again.", vbExclamation, TTL
        WorkDir = ""
        Exit Function
    End If
    On Error Resume Next
    If Dir$(d, vbDirectory) = "" Then MkDir Left$(d, Len(d) - 1)
    On Error GoTo 0
    WorkDir = d & "excel-"
End Function

Private Function AskHelper(cmd As String, a As String, b As String) As String
    On Error Resume Next
    AskHelper = AppleScriptTask("ReactioDraw.scpt", "rd", cmd & vbTab & a & vbTab & b)
    If Err.Number <> 0 Then AskHelper = "Reactio Draw is not connected to Excel. Run ""Install Excel tab.command"" from the Reactio Draw folder again."
End Function

Private Function RunCli(opts As String, inF As String, outD As String) As Boolean
    Dim r As String
    ' the script runs: reactio table <in> -o <out> <opts>
    r = AskHelper("table", inF, outD & vbTab & Trim$(opts))
    If r = "" Then
        RunCli = True
    Else
        MsgBox r, vbExclamation, TTL
    End If
End Function
#Else
Private Function WorkDir() As String
    Dim d As String
    d = Environ("TEMP") & "\ReactioDraw"
    If Dir$(d, vbDirectory) = "" Then MkDir d
    WorkDir = d & "\excel-"
End Function

' ReactioDraw.exe writes its folder here when it starts
Private Function RunCli(opts As String, inF As String, outD As String) As Boolean
    Dim f As String, sh As Object, code As Long
    f = GetSetting("ReactioDraw", "App", "Folder", "")
    If f = "" Or Dir$(f & "\reactio.exe") = "" Then
        MsgBox "Reactio Draw was not found. Start ReactioDraw.exe once: it connects itself to Office.", vbExclamation, TTL
        Exit Function
    End If
    Set sh = CreateObject("WScript.Shell")
    code = sh.Run("""" & f & "\reactio.exe"" table """ & inF & """ -o """ & outD & """" & opts, 0, True)
    If code <> 0 Then
        MsgBox "Reactio Draw could not do this (exit code " & code & ").", vbExclamation, TTL
        Exit Function
    End If
    RunCli = True
End Function
#End If
