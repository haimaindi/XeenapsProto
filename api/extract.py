
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

        # Header browser untuk menghindari deteksi bot sederhana
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }

        try:
            # 1. Ambil HTML
            req = urllib.request.Request(video_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                html = response.read().decode('utf-8', errors='ignore')

            metadata = {
                "title": "YouTube Video",
                "author": "Unknown Channel",
                "publisher": "YouTube",
                "year": "",
                "keywords": ""
            }

            # 2. EKSTRAKSI JSON INTERNAL (Sumber Paling Akurat)
            # YouTube menyimpan data player di objek ytInitialPlayerResponse
            json_pattern = r'ytInitialPlayerResponse\s*=\s*({.*?});'
            json_match = re.search(json_pattern, html)
            
            if json_match:
                try:
                    data = json.loads(json_match.group(1))
                    video_details = data.get('videoDetails', {})
                    microformat = data.get('microformat', {}).get('playerMicroformatRenderer', {})

                    metadata["title"] = video_details.get('title', metadata["title"])
                    metadata["author"] = video_details.get('author', metadata["author"])
                    
                    # Ambil Tahun dari uploadDate (Format: 2024-03-20)
                    upload_date = microformat.get('uploadDate', '')
                    if upload_date:
                        metadata["year"] = upload_date[:4]
                    
                    # Ambil Keywords (Tags) asli
                    keywords_list = video_details.get('keywords', [])
                    if keywords_list:
                        metadata["keywords"] = ", ".join(keywords_list)
                except Exception:
                    pass

            # 3. FALLBACK: META TAGS (Jika JSON Gagal)
            if not metadata["year"]:
                # Mencari datePublished di microdata
                date_match = re.search(r'itemprop="datePublished" content="(\d{4})-\d{2}-\d{2}"', html)
                if date_match:
                    metadata["year"] = date_match.group(1)
            
            if not metadata["keywords"]:
                # Mencari og:video:tag (YouTube biasanya mengirim banyak baris ini)
                tags = re.findall(r'<meta property="og:video:tag" content="([^"]+)">', html)
                if tags:
                    metadata["keywords"] = ", ".join(tags)
                else:
                    # Fallback terakhir ke meta keywords standar
                    kw_match = re.search(r'<meta name="keywords" content="([^"]+)">', html)
                    if kw_match:
                        metadata["keywords"] = kw_match.group(1)

            # 4. FINAL CLEANUP
            if not metadata["title"] or metadata["title"] == "YouTube":
                # Gunakan oEmbed sebagai usaha terakhir untuk Judul dan Author
                oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
                try:
                    with urllib.request.urlopen(urllib.request.Request(oembed_url, headers=headers)) as res:
                        o_data = json.loads(res.read().decode('utf-8'))
                        metadata["title"] = o_data.get('title', metadata["title"])
                        metadata["author"] = o_data.get('author_name', metadata["author"])
                except:
                    pass

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
