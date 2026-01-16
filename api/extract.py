from http.server import BaseHTTPRequestHandler
import youtube_transcript_api
import json
from urllib.parse import urlparse, parse_qs

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        def send_response_json(code, data):
            self.send_response(code)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode())

        parsed_url = urlparse(self.path)
        params = parse_qs(parsed_url.query)
        raw_url = params.get('url', [None])[0]

        if not raw_url:
            send_response_json(400, {"status": "error", "message": "Parameter URL tidak ditemukan."})
            return

        try:
            # Ekstraksi ID Video yang lebih robust
            video_id = None
            
            # 1. Bersihkan URL jika user mempaste URL hasil pencarian secara tidak sengaja
            if "results?search_query" in raw_url:
                send_response_json(400, {"status": "error", "message": "Ini adalah link PENCARIAN. Silakan klik videonya dulu, lalu copy link dari halaman video tersebut."})
                return

            parsed_vid = urlparse(raw_url)
            
            if parsed_vid.netloc in ['www.youtube.com', 'youtube.com', 'm.youtube.com']:
                if parsed_vid.path == '/watch':
                    video_id = parse_qs(parsed_vid.query).get('v', [None])[0]
                elif parsed_vid.path.startswith('/shorts/'):
                    video_id = parsed_vid.path.split('/')[2]
                elif parsed_vid.path.startswith('/live/'):
                    video_id = parsed_vid.path.split('/')[2]
            elif parsed_vid.netloc == 'youtu.be':
                video_id = parsed_vid.path[1:]

            # Jika parsing gagal, coba regex sederhana atau asumsi input adalah ID
            if not video_id:
                if len(raw_url) == 11: # Panjang standar ID YouTube
                    video_id = raw_url
                else:
                    send_response_json(400, {"status": "error", "message": f"URL tidak valid atau ID video tidak ditemukan: {raw_url}"})
                    return

            # Mengambil transkrip dengan metode yang benar
            try:
                # Coba ambil bahasa Indonesia atau Inggris
                transcript_list = youtube_transcript_api.YouTubeTranscriptApi.get_transcript(video_id, languages=['id', 'en'])
            except Exception as e:
                # Fallback: ambil transkrip pertama yang tersedia (apapun bahasanya)
                try:
                    transcript_list = youtube_transcript_api.YouTubeTranscriptApi.get_transcript(video_id)
                except Exception as inner_e:
                    send_response_json(404, {"status": "error", "message": f"Transkrip tidak tersedia untuk video ini. YouTube Error: {str(inner_e)}"})
                    return

            # Formatting transkrip menjadi teks terbaca
            full_text = ""
            for entry in transcript_list:
                start = int(entry['start'])
                minutes = start // 60
                seconds = start % 60
                timestamp = f"[{minutes}:{seconds:02d}]"
                full_text += f"{timestamp} {entry['text']}\n"

            send_response_json(200, {
                "status": "success",
                "transcript": full_text.strip(),
                "video_id": video_id
            })

        except Exception as e:
            send_response_json(500, {"status": "error", "message": f"Terjadi kesalahan internal: {str(e)}"})
