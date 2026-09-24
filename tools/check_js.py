import urllib.request
import re

url = "https://www.wch.cn/js/app.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
js = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
matches = re.findall(r'https?://[^\s"\'`]+|/api/[^\s"\'`]+|/downloads/[^\s"\'`]+', js)
for m in matches:
    if any(k in m.lower() for k in ['download', 'file', 'ch341']):
        print(m)
