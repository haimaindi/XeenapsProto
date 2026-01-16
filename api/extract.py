
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

        # Konfigurasi yt-dlp agar lebih mirip browser asli (Stealth Mode)
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['id', 'en', '.*'], 
            'quiet': True,
            'no_warnings': True,
            # Gunakan User-Agent Chrome terbaru
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'referer': 'https://www.youtube.com/',
            # Gunakan client yang sering memiliki limitasi bot lebih rendah
            'extractor_args': {
                'youtube': {
                    'player_client': ['mweb', 'android', 'web'],
                    'player_skip': ['webpage', 'configs']
                }
            }
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(video_url, download=False)
                
                title = info.get('title', 'YouTube Video')
                uploader = info.get('uploader', 'Unknown Channel')
                
                subtitles = info.get('subtitles', {})
                auto_subs = info.get('automatic_captions', {})
                
                transcript_url = None
                selected_lang = None

                # Prioritas: Bahasa Indonesia (Manual) -> Inggris (Manual) -> Lainnya (Manual)
                # Lalu: Bahasa Indonesia (Auto) -> Inggris (Auto) -> Lainnya (Auto)
                
                for lang in ['id', 'en']:
                    if lang in subtitles:
                        transcript_url = self.get_json_or_vtt_url(subtitles[lang])
                        selected_lang = lang
                        break
                
                if not transcript_url:
                    for lang in ['id', 'en']:
                        if lang in auto_subs:
                            transcript_url = self.get_json_or_vtt_url(auto_subs[lang])
                            selected_lang = lang
                            break

                if not transcript_url:
                    # Jika id/en tidak ada, ambil apa saja yang tersedia pertama kali
                    if subtitles:
                        selected_lang = next(iter(subtitles))
                        transcript_url = self.get_json_or_vtt_url(subtitles[selected_lang])
                    elif auto_subs:
                        selected_lang = next(iter(auto_subs))
                        transcript_url = self.get_json_or_vtt_url(auto_subs[selected_lang])

                if not transcript_url:
                    raise Exception("Video ini tidak memiliki transkrip yang bisa diakses tanpa login.")

                # Ambil konten subtitle dari URL dengan Header yang sesuai
                req = urllib.request.Request(transcript_url, headers={
                    'User-Agent': ydl_opts['user_agent'],
                    'Referer': 'https://www.youtube.com/'
                })
                with urllib.request.urlopen(req) as response:
                    raw_content = response.read().decode('utf-8')

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
            error_msg = str(e)
            # Berikan saran yang lebih membantu jika terdeteksi bot
            if "Sign in to confirm" in error_msg:
                error_msg = "YouTube memblokir akses otomatis (Bot Detection). Coba gunakan video lain atau input transkrip secara manual."
            
            self.wfile.write(json.dumps({
                "status": "error",
                "message": error_msg,
                "hasTranscript": False
            }).encode())

    def get_json_or_vtt_url(self, sub_list):
        for sub in sub_list:
            if sub.get('ext') == 'json3':
                return sub.get('url')
        for sub in sub_list:
            if sub.get('ext') == 'vtt':
                return sub.get('url')
        return sub_list[0].get('url') if sub_list else None

    def clean_vtt(self, content):
        try:
            # Handle JSON3 format (lebih akurat)
            data = json.loads(content)
            full_text = []
            for event in data.get('events', []):
                if 'segs' in event:
                    line = "".join([s.get('utf8', '') for s in event['segs']]).strip()
                    if line:
                        full_text.append(line)
            return " ".join(full_text)
        except:
            # Handle VTT format
            content = re.sub(r'WEBVTT|Kind:.*|Language:.*|STYLE.*|}', '', content, flags=re.DOTALL)
            content = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*', '', content)
            content = re.sub(r'<[^>]*>', '', content)
            lines = [l.strip() for l in content.split('\n') if l.strip()]
            
            # Hapus duplikasi baris berturut-turut
            unique_lines = []
            for l in lines:
                if not unique_lines or l != unique_lines[-1]:
                    unique_lines.append(l)
            return " ".join(unique_lines)
