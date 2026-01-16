
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import yt_dlp
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

        # Konfigurasi yt-dlp
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['id', 'en', '.*'], # Prioritas Indonesia, lalu Inggris, lalu apapun
            'quiet': True,
            'no_warnings': True,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                
                title = info.get('title', 'YouTube Video')
                uploader = info.get('uploader', 'Unknown Channel')
                
                # Cari subtitle yang tersedia
                subtitles = info.get('subtitles', {})
                auto_subs = info.get('automatic_captions', {})
                
                transcript_url = None
                selected_lang = None

                # Cari di manual subtitles dulu (id -> en)
                for lang in ['id', 'en']:
                    if lang in subtitles:
                        transcript_url = self.get_json_or_vtt_url(subtitles[lang])
                        selected_lang = lang
                        break
                
                # Jika tidak ada manual, cari di auto-generated (id -> en)
                if not transcript_url:
                    for lang in ['id', 'en']:
                        if lang in auto_subs:
                            transcript_url = self.get_json_or_vtt_url(auto_subs[lang])
                            selected_lang = lang
                            break

                if not transcript_url:
                    raise Exception("Video ini tidak memiliki subtitle atau transkrip yang tersedia.")

                # Ambil konten subtitle dari URL
                req = urllib.request.Request(transcript_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    raw_content = response.read().decode('utf-8')

                # Bersihkan konten (VTT parsing sederhana)
                clean_transcript = self.clean_vtt(raw_content)

                response_data = {
                    "status": "success",
                    "video_id": info.get('id'),
                    "transcript": clean_transcript,
                    "hasTranscript": True,
                    "metadata": {
                        "title": title,
                        "author": uploader,
                        "language": selected_lang
                    }
                }
                self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": str(e),
                "hasTranscript": False
            }).encode())

    def get_json_or_vtt_url(self, sub_list):
        # Cari format yang lebih mudah diproses (json3 > vtt)
        for sub in sub_list:
            if sub.get('ext') == 'json3':
                return sub.get('url')
        for sub in sub_list:
            if sub.get('ext') == 'vtt':
                return sub.get('url')
        return sub_list[0].get('url') if sub_list else None

    def clean_vtt(self, content):
        # Jika formatnya JSON3 (YouTube internal)
        try:
            data = json.loads(content)
            full_text = ""
            for event in data.get('events', []):
                if 'segs' in event:
                    line = "".join([s.get('utf8', '') for s in event['segs']]).strip()
                    if line:
                        full_text += line + " "
            return full_text.strip()
        except:
            # Jika formatnya VTT standar
            # Hapus header
            content = re.sub(r'WEBVTT|Kind:.*|Language:.*', '', content)
            # Hapus timestamp dan metadata cue (00:00:00.000 --> 00:00:00.000)
            content = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*', '', content)
            # Hapus tag HTML/VTT (misal <c>)
            content = re.sub(r'<[^>]*>', '', content)
            # Gabungkan baris
            lines = [l.strip() for l in content.split('\n') if l.strip()]
            # Hapus duplikasi baris berurutan (sering terjadi di VTT YouTube)
            unique_lines = []
            for l in lines:
                if not unique_lines or l != unique_lines[-1]:
                    unique_lines.append(l)
            return " ".join(unique_lines)
