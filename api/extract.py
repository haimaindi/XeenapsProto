
from http.server import BaseHTTPRequestHandler
from youtube_transcript_api import YouTubeTranscriptApi
import json
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parsing parameter dari URL menggunakan urllib.parse (Python 3)
        parsed_path = urlparse(self.path)
        params = parse_qs(parsed_path.query)
        video_url = params.get('url', [None])[0]

        if not video_url:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Missing URL parameter"}).encode())
            return

        try:
            # Ekstrak ID Video dari URL YouTube
            video_id = ""
            if "v=" in video_url:
                video_id = video_url.split("v=")[1].split("&")[0]
            elif "youtu.be/" in video_url:
                video_id = video_url.split("youtu.be/")[1].split("?")[0]
            else:
                video_id = video_url

            # Ambil Transkrip menggunakan youtube-transcript-api
            # Mencoba bahasa Indonesia ('id') dahulu, baru Inggris ('en')
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
            
            try:
                transcript = transcript_list.find_transcript(['id', 'en'])
            except:
                # Jika tidak ada bahasa yang diminta, ambil yang tersedia secara otomatis
                transcript = transcript_list.find_manually_created_transcript(['id', 'en'])
            
            data = transcript.fetch()
            
            # Formatting transkrip menjadi teks dengan timestamp [mm:ss]
            full_text = ""
            for entry in data:
                start = int(entry['start'])
                minutes = start // 60
                seconds = start % 60
                timestamp = f"[{minutes}:{seconds:02d}]"
                full_text += f"{timestamp} {entry['text']}\n"

            # Kirim respon sukses
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*') # Membantu saat development
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "success",
                "transcript": full_text.strip(),
                "video_id": video_id
            }).encode())

        except Exception as e:
            # Kirim respon error jika video tidak punya transkrip atau ID salah
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "error",
                "message": str(e)
            }).encode())
