from http.server import BaseHTTPRequestHandler
import youtube_transcript_api
import json
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Tambahkan CORS header untuk semua respon
        def send_error(code, message):
            self.send_response(code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "error", "message": message}).encode())

        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        video_url = params.get('url', [None])[0]

        if not video_url:
            send_error(400, "Missing URL parameter")
            return

        try:
            # Ekstrak ID Video dengan cara yang lebih aman
            video_id = None
            if "v=" in video_url:
                video_id = video_url.split("v=")[1].split("&")[0]
            elif "youtu.be/" in video_url:
                video_id = video_url.split("youtu.be/")[1].split("?")[0]
            else:
                # Asumsi input adalah ID langsung
                video_id = video_url

            if not video_id:
                send_error(400, "Invalid YouTube URL or Video ID")
                return

            # Menggunakan akses modul penuh untuk menghindari 'no attribute' error
            # Mencoba mengambil transkrip
            try:
                # Coba bahasa Indonesia atau Inggris
                data = youtube_transcript_api.YouTubeTranscriptApi.get_transcript(video_id, languages=['id', 'en'])
            except Exception:
                # Fallback: ambil apa saja yang tersedia
                data = youtube_transcript_api.YouTubeTranscriptApi.get_transcript(video_id)
            
            # Formatting transkrip
            full_text = ""
            for entry in data:
                start = int(entry['start'])
                minutes = start // 60
                seconds = start % 60
                timestamp = f"[{minutes}:{seconds:02d}]"
                full_text += f"{timestamp} {entry['text']}\n"

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "transcript": full_text.strip(),
                "video_id": video_id
            }).encode())

        except Exception as e:
            send_error(500, f"Python Error: {str(e)}")
