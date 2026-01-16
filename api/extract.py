
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

        # User-Agent iOS yang modern
        MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'

        # Konfigurasi yt-dlp tingkat lanjut untuk bypass bot
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['id', 'en', '.*'], 
            'quiet': True,
            'no_warnings': True,
            'user_agent': MOBILE_UA,
            'referer': 'https://www.youtube.com/',
            'extractor_args': {
                'youtube': {
                    # 'ios' saat ini paling stabil melewati bot check
                    'player_client': ['ios', 'android', 'mweb'],
                    'player_skip': ['webpage', 'configs']
                }
            },
            'http_headers': {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Sec-Fetch-Mode': 'navigate',
            }
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Mengambil info video
                info = ydl.extract_info(video_url, download=False)
                
                title = info.get('title', 'YouTube Video')
                uploader = info.get('uploader', 'Unknown Channel')
                
                subtitles = info.get('subtitles', {})
                auto_subs = info.get('automatic_captions', {})
                
                transcript_url = None
                selected_lang = None

                # Cari subtitle yang tersedia
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
                    if subtitles:
                        selected_lang = next(iter(subtitles))
                        transcript_url = self.get_json_or_vtt_url(subtitles[selected_lang])
                    elif auto_subs:
                        selected_lang = next(iter(auto_subs))
                        transcript_url = self.get_json_or_vtt_url(auto_subs[selected_lang])

                if not transcript_url:
                    raise Exception("Transcript tidak ditemukan atau diblokir oleh YouTube.")

                # Ambil konten transkrip
                req = urllib.request.Request(transcript_url, headers={
                    'User-Agent': MOBILE_UA,
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
            # Pesan error yang lebih membantu jika masih terdeteksi bot
            if "Sign in to confirm" in error_msg or "bot" in error_msg.lower():
                error_msg = "YouTube memblokir koneksi server (Bot Detection). Coba gunakan video lain atau input teks manual."
            
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
            data = json.loads(content)
            full_text = []
            for event in data.get('events', []):
                if 'segs' in event:
                    line = "".join([s.get('utf8', '') for s in event['segs']]).strip()
                    if line:
                        full_text.append(line)
            return " ".join(full_text)
        except:
            content = re.sub(r'WEBVTT|Kind:.*|Language:.*|STYLE.*|}', '', content, flags=re.DOTALL)
            content = re.sub(r'\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*', '', content)
            content = re.sub(r'<[^>]*>', '', content)
            lines = [l.strip() for l in content.split('\n') if l.strip()]
            unique_lines = []
            for l in lines:
                if not unique_lines or l != unique_lines[-1]:
                    unique_lines.append(l)
            return " ".join(unique_lines)
