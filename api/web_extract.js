
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Robust header set to mimic a real Chrome browser on Windows
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://www.google.com/'
    };

    const response = await fetch(url, { 
      headers,
      redirect: 'follow'
    });

    if (!response.ok) {
      if (response.status === 403) {
        return res.status(403).json({ 
          error: "403 Forbidden: Access Denied.",
          suggestion: "Situs ini memblokir akses otomatis. Gunakan mode 'MANUAL' (Salin-Tempel teks)." 
        });
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const html = await response.text();

    // Pre-processing to remove heavy elements before JSDOM handles them
    const sanitizedHtml = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

    const dom = new JSDOM(sanitizedHtml, { 
      url,
      virtualConsole: new (require('jsdom')).VirtualConsole()
    });
    
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error("Gagal mengekstrak konten utama dari halaman ini.");
    }

    // Advanced whitespace cleaning for Chunking Optimization
    const cleanedText = article.textContent
      .replace(/\r/g, '')               // Remove carriage returns
      .replace(/\n\s*\n/g, '\n\n')      // Collapse multiple newlines
      .replace(/[ \t]+/g, ' ')          // Collapse multiple spaces/tabs
      .trim();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
      title: article.title || "Untitled Webpage",
      textContent: cleanedText,
      byline: article.byline,
      siteName: article.siteName,
      length: cleanedText.length
    });

  } catch (error) {
    console.error('Web Extraction Server Error:', error);
    res.status(500).json({ error: error.message });
  }
}
