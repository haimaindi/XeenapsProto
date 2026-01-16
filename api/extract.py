
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import urllib.request

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

        try:
            # Menggunakan endpoint oEmbed resmi YouTube
            oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
            
            req = urllib.request.Request(oembed_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            })
            
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                response_data = {
                    "status": "success",
                    "transcript": "", # Kosong karena kita hanya ambil metadata
                    "hasTranscript": False,
                    "metadata": {
                        "title": data.get('title', 'YouTube Video'),
                        "author": data.get('author_name', 'Unknown Channel'),
                        "thumbnail": data.get('thumbnail_url', '')
                    }
                }
                self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Gagal mengambil metadata: {str(e)}",
                "hasTranscript": False
            }).encode())
