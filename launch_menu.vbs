' NeuralScaler 4K - Silent Context Menu Dispatcher
Option Explicit
Dim WshShell, FSO, ScriptDir, targetPy, cmdLine

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

If FSO.FileExists(ScriptDir & "\python\pythonw.exe") Then
    targetPy = ScriptDir & "\python\pythonw.exe"
ElseIf FSO.FileExists(ScriptDir & "\..\..\.venv\Scripts\pythonw.exe") Then
    targetPy = ScriptDir & "\..\..\.venv\Scripts\pythonw.exe"
Else
    targetPy = "pythonw.exe"
End If

If WScript.Arguments.Count > 0 Then
    cmdLine = """" & targetPy & """ """ & ScriptDir & "\server.py"" """ & WScript.Arguments(0) & """ --gui"
Else
    cmdLine = """" & targetPy & """ """ & ScriptDir & "\server.py"" --gui"
End If

WshShell.Run cmdLine, 0, False
