
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
from youtube_transcript_api import YouTubeTranscriptApi

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

        video_id = ""
        try:
            if "youtu.be" in video_url:
                video_id = video_url.split("/")[-1].split("?")[0]
            elif "v=" in video_url:
                video_id = video_url.split("v=")[1].split("&")[0]
            else:
                video_id = video_url
        except Exception:
            self.wfile.write(json.dumps({"status": "error", "message": "Invalid URL format"}).encode())
            return

        try:
            # Mengambil transkrip (mencoba bahasa Indonesia dulu, lalu Inggris, lalu auto-generated)
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['id', 'en'])
            
            full_transcript = ""
            for entry in transcript_list:
                start = int(entry['start'])
                m, s = divmod(start, 60)
                timestamp = f"[{m}:{s:02d}]"
                full_transcript += f"{timestamp} {entry['text']}\n"

            response = {
                "status": "success",
                "video_id": video_id,
                "transcript": full_transcript,
                "hasTranscript": True,
                "metadata": {
                    "title": f"YouTube Video ({video_id})",
                    "author": "YouTube Content"
                }
            }
            self.wfile.write(json.dumps(response).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": "Video ini tidak memiliki transkrip/CC yang bisa diakses.",
                "hasTranscript": False
            }).encode())
