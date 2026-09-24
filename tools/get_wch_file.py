import urllib.request
import json

# Let's inspect the network request made when clicking download on wch-ic.com or wch.cn
# In wch.cn / wch-ic.com, files are downloaded via:
# https://www.wch.cn/downloads/file/65.html or an API
req = urllib.request.Request(
    'https://api1.wch.cn/api/official/website/files/getFilesById?id=65',
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        import pprint
        text = json.dumps(data, ensure_ascii=True, indent=2)
        print(text[:2000])
except Exception as e:
    print("Error:", e)
