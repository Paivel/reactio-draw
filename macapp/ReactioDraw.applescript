-- Reactio Draw tabs in Word and Excel on a Mac. Their macros may run other programs only through a script in
-- ~/Library/Application Scripts/com.microsoft.Word (or .Excel); "Install Word tab.command" and "Install Excel tab.command"
-- put this one there.
-- Reactio Draw (c) 2026 Pavel Sakharov. Free software under the GNU Affero General Public License v3.0 or later.
property appPath : "__APP__"
-- the handler is written |rd| because rd alone is AppleScript's ordinal suffix (3rd); Word calls it as "rd"
-- the call is "command<tab>a<tab>b"; the answer is "" when all went well, a message otherwise
-- (pending, tag and dir answer with what was asked for)

on |rd|(p)
	set AppleScript's text item delimiters to tab
	set parts to text items of p
	set AppleScript's text item delimiters to ""
	set cmd to item 1 of parts
	set src to item 2 of parts
	set out to ""
	if (count of parts) > 2 then set out to item 3 of parts
	set cli to appPath & "/Contents/MacOS/reactio"
	-- drawings edited for Word pass through Office's own folder, which Word can read
	set xdir to (POSIX path of (path to home folder)) & "Library/Group Containers/UBF8T346G9.Office/Reactio Draw/"
	try
		if cmd is "open" then
			do shell script "open -a " & quoted form of appPath & " " & quoted form of src
		else if cmd is "plain" then
			do shell script quoted form of cli & " word-clean " & quoted form of src & " -o " & quoted form of out
			try
				do shell script "test -f " & quoted form of out
			on error
				return "There are no Reactio Draw drawings in this document."
			end try
			do shell script "open -a 'Microsoft Word' " & quoted form of out
		else if cmd is "table" then
			-- Excel's tab: src the SMILES table, out the folder for the pictures and properties, then the options
			set opts to ""
			if (count of parts) > 3 then set opts to item 4 of parts
			do shell script quoted form of cli & " table " & quoted form of src & " -o " & quoted form of out & " " & opts
		else if cmd is "cdxml" then
			do shell script quoted form of cli & " convert " & quoted form of src & " -o " & quoted form of out
		else if cmd is "edit" then
			-- src: the picture's id, out: its alt text (the drawing is in it); Reactio Draw opens it in a tab
			do shell script "mkdir -p " & quoted form of xdir
			set f to xdir & src & ".rdword"
			set fp to open for access (POSIX file f) with write permission
			set eof fp to 0
			write out to fp
			close access fp
			do shell script "open -a " & quoted form of appPath & " " & quoted form of f
		else if cmd is "pending" then
			-- the ids of drawings Reactio Draw has sent back, tab-separated; ones left from ten minutes ago or more (their picture
			-- was not found then) and drawings opened for editing days ago are cleared away first
			return do shell script "cd " & quoted form of xdir & " 2>/dev/null && find . -maxdepth 1 \\( -name '*.tag' -o -name '*.png' -o -name '*.svg' \\) -mmin +10 -delete; find . -maxdepth 1 -name '*.rdword' -mtime +2 -delete; for f in *.tag; do [ -f \"$f\" ] && printf '%s\\t' \"${f%.tag}\"; done; true"
		else if cmd is "tag" then
			return do shell script "cat " & quoted form of (xdir & src & ".tag")
		else if cmd is "dir" then
			return xdir
		else if cmd is "done" then
			do shell script "cd " & quoted form of xdir & " && rm -f " & quoted form of (src & ".tag") & " " & quoted form of (src & ".png") & " " & quoted form of (src & ".svg") & " " & quoted form of (src & ".rdword")
		end if
		return ""
	on error e
		return "Reactio Draw could not do this: " & e
	end try
end |rd|
