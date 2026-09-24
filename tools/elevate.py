import ctypes
import os
import sys

bat_path = os.path.abspath("install_drivers.bat")
print(f"Launching elevated: {bat_path}")

ret = ctypes.windll.shell32.ShellExecuteW(
    None,
    "runas",
    "cmd.exe",
    f'/c "{bat_path}"',
    None,
    1  # SW_SHOWNORMAL
)

print(f"ShellExecuteW return code: {ret}")
if ret > 32:
    print("SUCCESS: Elevated installer launched! Windows UAC prompt is displayed.")
else:
    print(f"FAILED with error code: {ret}")
