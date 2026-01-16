
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    // Header High-Fidelity untuk meniru browser asli
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Cache-Control': 'no-cache',
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
          error: "Akses diblokir (403).",
          suggestion: "Situs ini memblokir pembaca otomatis. Silakan gunakan mode 'MANUAL' dan tempel teksnya langsung." 
        });
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const html = await response.text();

    // 1. Bersihkan HTML kasar sebelum diproses JSDOM untuk performa
    const rawSanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '');

    const dom = new JSDOM(rawSanitized, { 
      url,
      virtualConsole: new (require('jsdom')).VirtualConsole()
    });
    
    // 2. Hapus elemen navigasi/footer secara manual untuk membantu Readability
    const doc = dom.window.document;
    const elementsToRemove = doc.querySelectorAll('nav, footer, header, aside, .sidebar, .ads, .comments');
    elementsToRemove.forEach(el => el.remove());

    // 3. Ekstrak konten utama
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error("Gagal mengenali konten teks utama di halaman ini.");
    }

    // 4. Pembersihan Whitespace Agresif (Sangat penting untuk efisiensi 45k chunk)
    // Menghapus baris kosong berlebih dan spasi ganda tanpa menghilangkan paragraf
    const finalCleanText = article.textContent
      .replace(/\r/g, '')               // Hapus carriage returns
      .replace(/[ \t]+/g, ' ')          // Satukan spasi/tab berlebih menjadi satu spasi
      .replace(/\n\s*\n/g, '\n\n')      // Satukan baris kosong berlebih menjadi maksimal dua newline
      .trim();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
      title: article.title || "Untitled Webpage",
      textContent: finalCleanText,
      byline: article.byline,
      siteName: article.siteName,
      length: finalCleanText.length
    });

  } catch (error) {
    console.error('Extraction Logic Error:', error);
    res.status(500).json({ error: error.message });
  }
}
