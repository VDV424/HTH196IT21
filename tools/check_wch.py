import urllib.request
import re

url = "https://www.wch.cn/downloads/CH341SER_EXE.html"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

# Find JS scripts
js_files = re.findall(r'src=["\']([^"\']+\.js[^"\']*)["\']', html)
print("JS files:", js_files)

# Look for any text mentioning file or download
for line in html.splitlines():
    if any(k in line.lower() for k in ['download', 'ch341ser', 'file', 'api']):
        print(line[:120])
