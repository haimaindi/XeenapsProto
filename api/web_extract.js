
import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let browser = null;
  try {
    // Konfigurasi untuk Vercel Serverless
    // Kita paksa headless menjadi boolean karena Playwright tidak menerima string "true"/"false"
    const isHeadless = chromium.headless === 'true' || chromium.headless === true;

    browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: isHeadless,
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // Navigasi dengan timeout 30 detik
    // Menggunakan networkidle agar memastikan konten JavaScript selesai dirender
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Ambil konten HTML setelah dirender
    const html = await page.content();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Playwright Error:', error);
    res.status(500).json({ error: 'Failed to extract content: ' + error.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
