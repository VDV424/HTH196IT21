import os
import re

FRONTEND_DIR = r"c:\Users\varun\Downloads\hackathone project\triagepulse\frontend"

REPLACEMENTS = {
    # Light theme backgrounds
    "bg-slate-950": "bg-slate-50",
    "bg-slate-900": "bg-white",
    "bg-slate-800": "bg-slate-100",
    "bg-slate-700": "bg-slate-200",
    "bg-slate-600": "bg-slate-300",
    
    # Border colors
    "border-slate-800": "border-slate-200",
    "border-slate-700": "border-slate-300",
    "border-slate-600": "border-slate-400",
    
    # Text colors
    "text-white": "text-slate-900",
    "text-slate-100": "text-slate-800",
    "text-slate-200": "text-slate-700",
    "text-slate-300": "text-slate-600",
    "text-slate-400": "text-slate-500",
    "text-slate-500": "text-slate-500", # keep
    
    # Blue theme removal (replace with teal/emerald)
    "cyan-400": "teal-600",
    "cyan-500": "teal-500",
    "cyan-600": "teal-600",
    "cyan-800": "teal-200",
    "cyan-950": "teal-50",
    
    "blue-400": "emerald-600",
    "blue-500": "emerald-500",
    "blue-600": "emerald-600",
    "blue-800": "emerald-200",
    "blue-950": "emerald-50",
    
    "indigo-400": "violet-600",
    "indigo-500": "violet-500",
    "indigo-600": "violet-600",
    "indigo-800": "violet-200",
    "indigo-950": "violet-50",
    
    "sky-400": "emerald-600",
    "sky-500": "emerald-500",
    
    # Specific opacity variants
    "bg-slate-950/80": "bg-slate-50/80",
    "bg-slate-950/70": "bg-slate-50/70",
    "bg-slate-950/60": "bg-slate-50/60",
    "bg-slate-900/90": "bg-white/90",
    "bg-slate-900/95": "bg-white/95",
    "bg-slate-800/80": "bg-slate-100/80",
    "bg-slate-800/60": "bg-slate-100/60",
    "bg-slate-800/40": "bg-slate-100/40",
    
    "border-slate-800/80": "border-slate-200/80",
    "border-slate-800/40": "border-slate-200/40",
    
    "shadow-cyan-500/20": "shadow-teal-500/20",
    "shadow-cyan-500/30": "shadow-teal-500/30",
    "shadow-cyan-500/50": "shadow-teal-500/50",
    "shadow-cyan-600/30": "shadow-teal-600/30",
    "shadow-indigo-600/30": "shadow-violet-600/30",
    "shadow-blue-600/30": "shadow-emerald-600/30",
    
    # Remove HTML dark class
    '<html lang="en" class="dark">': '<html lang="en">',
    
    # Color references in SVG or components
    "text-cyan-400": "text-teal-600",
    "text-blue-400": "text-emerald-600",
}

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    # Order by length descending so that we don't accidentally replace a sub-part
    for k in sorted(REPLACEMENTS.keys(), key=len, reverse=True):
        content = content.replace(k, REPLACEMENTS[k])
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(FRONTEND_DIR):
    if "node_modules" in root:
        continue
    for file in files:
        if file.endswith(('.tsx', '.ts', '.css', '.html')):
            update_file(os.path.join(root, file))

print("Done updating theme.")
