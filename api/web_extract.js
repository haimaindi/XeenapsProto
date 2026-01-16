
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Set timeout untuk fetch agar tidak gantung (15 detik)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };

    const response = await fetch(url, { 
      headers,
      signal: controller.signal 
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("403 Forbidden: Situs ini memblokir akses bot. Gunakan mode 'MANUAL' (Salin-Tempel teks).");
      }
      throw new Error(`Gagal mengambil halaman: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Inisialisasi JSDOM dengan virtual console untuk menekan error CSS/JS dari halaman target
    const dom = new JSDOM(html, { 
      url,
      virtualConsole: new (require('jsdom')).VirtualConsole()
    });
    
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error("Gagal mengekstrak konten artikel. Halaman mungkin tidak berisi teks utama yang jelas.");
    }

    // Pembersihan teks: hapus whitespace berlebih agar hemat karakter di Spreadsheet
    const cleanedText = article.textContent
      .replace(/[\t\r\n]+/g, '\n') // Satukan baris baru
      .replace(/ {2,}/g, ' ')      // Satukan spasi berlebih
      .trim();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
      title: article.title || "Untitled Webpage",
      content: article.content, // HTML version
      textContent: cleanedText,  // Cleaned Text version
      byline: article.byline,
      siteName: article.siteName,
      length: cleanedText.length
    });

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Web Extraction Error:', error);
    
    const message = error.name === 'AbortError' 
      ? "Waktu habis (Timeout). Situs merespons terlalu lama." 
      : error.message;

    res.status(500).json({ error: message });
  }
}
