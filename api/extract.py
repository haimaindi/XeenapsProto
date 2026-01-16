
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
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

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }

        try:
            # 1. Fetch Page HTML
            req = urllib.request.Request(video_url, headers=headers)
            with urllib.request.urlopen(req) as response:
                html = response.read().decode('utf-8', errors='ignore')

            # 2. Extract internal YouTube JSON (ytInitialPlayerResponse)
            # Ini adalah tambang emas data metadata YouTube
            json_pattern = r'ytInitialPlayerResponse\s*=\s*({.+?});'
            match = re.search(json_pattern, html)
            
            metadata = {
                "title": "YouTube Video",
                "author": "Unknown Channel",
                "publisher": "YouTube",
                "year": "",
                "keywords": ""
            }

            if match:
                data = json.loads(match.group(1))
                video_details = data.get('videoDetails', {})
                microformat = data.get('microformat', {}).get('playerMicroformatRenderer', {})

                metadata["title"] = video_details.get('title', metadata["title"])
                metadata["author"] = video_details.get('author', metadata["author"])
                
                # Ekstrak Tahun dari uploadDate
                upload_date = microformat.get('uploadDate', '') # Format: 2023-11-01
                if upload_date:
                    metadata["year"] = upload_date.split('-')[0]
                
                # Ekstrak Keywords (Tags)
                keywords = video_details.get('keywords', [])
                if not keywords:
                    # Fallback ke meta tags jika JSON tidak ada keywords
                    kw_match = re.search(r'name="keywords" content="([^"]+)"', html)
                    if kw_match:
                        metadata["keywords"] = kw_match.group(1)
                else:
                    metadata["keywords"] = ", ".join(keywords)

            # 3. Fallback ke oEmbed jika JSON gagal
            else:
                oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
                with urllib.request.urlopen(urllib.request.Request(oembed_url, headers=headers)) as res:
                    o_data = json.loads(res.read().decode('utf-8'))
                    metadata["title"] = o_data.get('title', metadata["title"])
                    metadata["author"] = o_data.get('author_name', metadata["author"])

            response_data = {
                "status": "success",
                "transcript": "",
                "hasTranscript": False,
                "metadata": metadata
            }
            self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Extraction failed: {str(e)}",
                "hasTranscript": False
            }).encode())
