Set oShell = CreateObject("Shell.Application")
batPath = "c:\Users\varun\Downloads\hackathone project\install_drivers.bat"
oShell.ShellExecute "cmd.exe", "/k """ & batPath & """", "", "runas", 1
