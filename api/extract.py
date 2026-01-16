
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import yt_dlp

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

        # Konfigurasi yt-dlp untuk ekstraksi metadata saja tanpa download
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'skip_download': True,
            'extract_flat': False, # Kita butuh info lengkap
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                
                # Ekstrak Tahun dari upload_date (format YYYYMMDD)
                upload_date = info.get('upload_date', '')
                year = upload_date[:4] if len(upload_date) >= 4 else ""
                
                # Ambil Tags sebagai keywords
                tags = info.get('tags', [])
                keywords_str = ", ".join(tags[:10]) if tags else f"Video, YouTube, {info.get('uploader', 'YouTube')}"
                
                response_data = {
                    "status": "success",
                    "transcript": "", 
                    "hasTranscript": False,
                    "metadata": {
                        "title": info.get('title', 'YouTube Video'),
                        "author": info.get('uploader', 'Unknown Channel'),
                        "publisher": "YouTube",
                        "year": year,
                        "keywords": keywords_str,
                        "thumbnail": info.get('thumbnail', '')
                    }
                }
                self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Gagal ekstraksi yt-dlp: {str(e)}",
                "hasTranscript": False
            }).encode())
