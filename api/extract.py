
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import urllib.request
import re
from datetime import datetime

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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }

        try:
            # 1. Ambil Data Dasar dari oEmbed
            oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
            oembed_req = urllib.request.Request(oembed_url, headers=headers)
            
            with urllib.request.urlopen(oembed_req) as response:
                oembed_data = json.loads(response.read().decode('utf-8'))
            
            title = oembed_data.get('title', 'YouTube Video')
            author = oembed_data.get('author_name', 'Unknown Channel')
            
            # 2. Ambil Tahun & Keywords dari HTML (Scraping Ringan Meta Tags)
            # Kita hanya butuh 50KB pertama dari page untuk mencari meta tags
            video_req = urllib.request.Request(video_url, headers=headers)
            year = str(datetime.now().year) # Default fallback
            keywords = f"Video, YouTube, {author}"
            
            try:
                with urllib.request.urlopen(video_req) as response:
                    # Baca hanya bagian awal untuk performa dan menghindari deteksi bot berat
                    html_head = response.read(100000).decode('utf-8', errors='ignore')
                    
                    # Cari Tahun (datePublished atau uploadDate)
                    date_match = re.search(r'itemprop="datePublished" content="(\d{4})-\d{2}-\d{2}"', html_head)
                    if not date_match:
                        date_match = re.search(r'"uploadDate":"(\d{4})-\d{2}-\d{2}"', html_head)
                    
                    if date_match:
                        year = date_match.group(1)
                    
                    # Cari Keywords asli dari YouTube
                    keyword_match = re.search(r'name="keywords" content="([^"]+)"', html_head)
                    if keyword_match:
                        keywords = keyword_match.group(1)
            except:
                pass # Jika scraping gagal, gunakan default dari oEmbed

            response_data = {
                "status": "success",
                "transcript": "", 
                "hasTranscript": False,
                "metadata": {
                    "title": title,
                    "author": author,
                    "publisher": "YouTube",
                    "year": year,
                    "keywords": keywords,
                    "thumbnail": oembed_data.get('thumbnail_url', '')
                }
            }
            self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Gagal mengambil metadata: {str(e)}",
                "hasTranscript": False
            }).encode())
