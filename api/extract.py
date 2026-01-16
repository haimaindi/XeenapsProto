
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import urllib.request
import re
import html as html_parser

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

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }

        try:
            # 1. Fetch Page HTML
            req = urllib.request.Request(video_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                html_content = response.read().decode('utf-8', errors='ignore')

            # 2. Extract ytInitialPlayerResponse
            # Gunakan regex yang lebih teliti untuk menangkap JSON blok besar
            json_pattern = r'ytInitialPlayerResponse\s*=\s*({.+?});\s*(?:var|</script)'
            match = re.search(json_pattern, html_content)
            
            metadata = {
                "title": "YouTube Video",
                "author": "Unknown Channel",
                "publisher": "YouTube",
                "year": "",
                "keywords": ""
            }
            transcript_text = ""
            has_transcript = False

            if match:
                data = json.loads(match.group(1))
                video_details = data.get('videoDetails', {})
                microformat = data.get('microformat', {}).get('playerMicroformatRenderer', {})

                # Metadata Utama
                metadata["title"] = video_details.get('title', metadata["title"])
                metadata["author"] = video_details.get('author', metadata["author"])
                
                # Keywords & Year
                if 'keywords' in video_details:
                    metadata["keywords"] = ", ".join(video_details['keywords'])
                
                upload_date = microformat.get('uploadDate', '')
                if upload_date:
                    metadata["year"] = upload_date[:4]

                # 3. EXTRACTION TRANSCRIPT (The "NoteGPT" Logic)
                captions = data.get('captions', {}).get('playerCaptionsTracklistRenderer', {}).get('captionTracks', [])
                if captions:
                    # Ambil track pertama (biasanya English atau Auto-generated)
                    transcript_url = captions[0].get('baseUrl')
                    if transcript_url:
                        with urllib.request.urlopen(transcript_url) as tr_res:
                            tr_xml = tr_res.read().decode('utf-8')
                            # Bersihkan XML tag sederhana: <text start=".." dur="..">Teks</text>
                            lines = re.findall(r'<text.*?>([^<]*)</text>', tr_xml)
                            transcript_text = " ".join([html_parser.unescape(line) for line in lines])
                            has_transcript = len(transcript_text) > 0

            # 4. Fallback Metadata jika JSON gagal
            if not metadata["year"]:
                meta_year = re.search(r'itemprop="datePublished" content="(\d{4})', html_content)
                if meta_year: metadata["year"] = meta_year.group(1)

            if not metadata["keywords"]:
                meta_kw = re.search(r'name="keywords" content="([^"]+)"', html_content)
                if meta_kw: metadata["keywords"] = meta_kw.group(1)

            response_data = {
                "status": "success",
                "transcript": transcript_text,
                "hasTranscript": has_transcript,
                "metadata": metadata
            }
            self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Extraction failed: {str(e)}",
                "hasTranscript": False
            }).encode())
