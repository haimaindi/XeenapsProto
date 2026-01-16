
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import urllib.request
import re
from datetime import datetime

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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9'
        }

        try:
            # 1. Ambil Data Dasar dari oEmbed (Sangat reliabel untuk Title & Author)
            oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
            oembed_req = urllib.request.Request(oembed_url, headers=headers)
            
            with urllib.request.urlopen(oembed_req) as response:
                oembed_data = json.loads(response.read().decode('utf-8'))
            
            title = oembed_data.get('title', 'YouTube Video')
            author = oembed_data.get('author_name', 'Unknown Channel')
            
            # 2. Ambil Tahun & Keywords dari HTML (Mencari di dalam JSON internal YouTube)
            video_req = urllib.request.Request(video_url, headers=headers)
            year = str(datetime.now().year) 
            keywords_str = f"Video, YouTube, {author}"
            
            try:
                with urllib.request.urlopen(video_req) as response:
                    # Baca 150KB pertama (YouTube menaruh data JSON di awal-awal script)
                    html_content = response.read(150000).decode('utf-8', errors='ignore')
                    
                    # Pattern 1: Mencari di publishDate (paling akurat)
                    date_match = re.search(r'\"publishDate\":\"(\d{4})-\d{2}-\d{2}\"', html_content)
                    if not date_match:
                        date_match = re.search(r'\"uploadDate\":\"(\d{4})-\d{2}-\d{2}\"', html_content)
                    if not date_match:
                        date_match = re.search(r'itemprop=\"datePublished\" content=\"(\d{4})-\d{2}-\d{2}\"', html_content)
                    
                    if date_match:
                        year = date_match.group(1)
                    
                    # Pattern 2: Mencari Keywords di meta tag atau JSON
                    # Meta tag keywords
                    kw_meta = re.search(r'name=\"keywords\" content=\"([^"]+)\"', html_content)
                    if kw_meta:
                        keywords_str = kw_meta.group(1)
                    else:
                        # Cari keywords di dalam array JSON
                        kw_json = re.search(r'\"keywords\":\[(.*?)\]', html_content)
                        if kw_json:
                            # Bersihkan kutipan dan spasi
                            kws = kw_json.group(1).replace('"', '').split(',')
                            keywords_str = ", ".join([k.strip() for k in kws[:10]]) # Ambil 10 pertama

            except Exception as e:
                print(f"Scraping error: {str(e)}")

            response_data = {
                "status": "success",
                "transcript": "", 
                "hasTranscript": False,
                "metadata": {
                    "title": title,
                    "author": author,
                    "publisher": "YouTube",
                    "year": year,
                    "keywords": keywords_str,
                    "thumbnail": oembed_data.get('thumbnail_url', '')
                }
            }
            self.wfile.write(json.dumps(response_data).encode())

        except Exception as e:
            self.wfile.write(json.dumps({
                "status": "error",
                "message": f"Gagal mengambil metadata: {str(e)}",
                "hasTranscript": False
            }).encode())
