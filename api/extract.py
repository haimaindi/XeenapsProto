
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import urllib.request
import re

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

        query = parse_qs(urlparse(self.path).query)
        video_url = query.get('url', [None])[0]

        if not video_url:
            self.wfile.write(json.dumps({"status": "error", "message": "URL required"}).encode())
            return

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }

        try:
            # Fetch HTML
            req = urllib.request.Request(video_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                html = response.read().decode('utf-8', errors='ignore')

            # --- EKSTRAKSI METADATA ---
            metadata = {
                "title": "",
                "author": "",
                "publisher": "YouTube",
                "year": "",
                "keywords": ""
            }

            # 1. Ambil dari LD+JSON (Format SEO paling standar)
            ld_json_match = re.search(r'<script type="application/ld\+json">({.*?})</script>', html)
            if ld_json_match:
                try:
                    ld_data = json.loads(ld_json_match.group(1))
                    metadata["title"] = ld_data.get('name', '')
                    metadata["author"] = ld_data.get('author', '')
                    
                    # UploadDate biasanya: "2023-05-12T07:00:11-07:00"
                    upload_date = ld_data.get('uploadDate', '')
                    if upload_date:
                        metadata["year"] = upload_date[:4]
                except:
                    pass

            # 2. Fallback Title dari OpenGraph jika LD+JSON gagal
            if not metadata["title"]:
                title_match = re.search(r'<meta property="og:title" content="([^"]+)">', html)
                if title_match:
                    metadata["title"] = title_match.group(1)

            # 3. Ambil Keywords dari Meta Tag SEO (Paling Akurat untuk Keywords)
            kw_match = re.search(r'<meta name="keywords" content="([^"]+)">', html)
            if kw_match:
                # Membersihkan keywords dari koma berlebih atau spasi
                raw_kws = kw_match.group(1).split(',')
                clean_kws = [k.strip() for k in raw_kws if k.strip()]
                metadata["keywords"] = ", ".join(clean_kws[:15]) # Ambil 15 tags teratas

            # 4. Ambil Author Name yang lebih bersih dari meta atau link tag
            if not metadata["author"]:
                author_match = re.search(r'<link itemprop="name" content="([^"]+)">', html)
                if author_match:
                    metadata["author"] = author_match.group(1)

            # --- FINAL FALLBACK KE OEMBED JIKA MASIH KOSONG ---
            if not metadata["title"] or not metadata["author"]:
                oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
                try:
                    with urllib.request.urlopen(urllib.request.Request(oembed_url, headers=headers)) as res:
                        o_data = json.loads(res.read().decode('utf-8'))
                        if not metadata["title"]: metadata["title"] = o_data.get('title', '')
                        if not metadata["author"]: metadata["author"] = o_data.get('author_name', '')
                except:
                    pass

            # Pastikan Title tidak "YouTube" saja
            if not metadata["title"] or metadata["title"] == "YouTube":
                metadata["title"] = "Untitled YouTube Video"

            response_data = {
                "status": "success",
                "transcript": "",
                "hasTranscript": False,
                "metadata": metadata
            }
            self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Extraction failed: {str(e)}",
                "hasTranscript": False
            }).encode())
