
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

        # Menggunakan oEmbed YouTube yang resmi dan CORS-friendly (biasanya)
        # Ini hanya untuk Judul dan Author dasar.
        oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

        try:
            req = urllib.request.Request(oembed_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                o_data = json.loads(response.read().decode('utf-8'))
                
                response_data = {
                    "status": "success",
                    "transcript": "",
                    "hasTranscript": False,
                    "metadata": {
                        "title": o_data.get('title', 'YouTube Video'),
                        "author": o_data.get('author_name', 'Unknown Channel'),
                        "publisher": "YouTube",
                        "year": "", # Akan diisi oleh Gemini
                        "keywords": "" # Akan diisi oleh Gemini
                    }
                }
                self.wfile.write(json.dumps(response_data).encode())
        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Basic extraction failed: {str(e)}",
                "hasTranscript": False
            }).encode())
