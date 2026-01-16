
import { Innertube } from 'youtubei.js';

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ status: 'error', message: 'Parameter URL diperlukan.' });
  }

  try {
    let videoId = '';
    
    // Ekstraksi ID yang lebih cerdas
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === 'youtu.be') {
        videoId = parsedUrl.pathname.slice(1);
      } else if (parsedUrl.pathname === '/watch') {
        videoId = parsedUrl.searchParams.get('v') || '';
      } else if (parsedUrl.pathname.startsWith('/shorts/')) {
        videoId = parsedUrl.pathname.split('/')[2];
      } else if (parsedUrl.pathname.startsWith('/live/')) {
        videoId = parsedUrl.pathname.split('/')[2];
      }
    } catch (e) {
      // Jika bukan URL, asumsi itu ID langsung
      videoId = url;
    }

    if (!videoId || videoId.length !== 11) {
      return res.status(400).json({ status: 'error', message: 'ID Video YouTube tidak valid.' });
    }

    // Inisialisasi Innertube (YouTube Client Simulator)
    const yt = await Innertube.create();
    
    try {
      const info = await yt.getInfo(videoId);
      const transcriptData = await info.getTranscript();

      if (!transcriptData || !transcriptData.transcript) {
         throw new Error("Transkrip tidak ditemukan di data YouTube.");
      }

      // Format transkrip menjadi teks dengan timestamp
      let fullText = '';
      
      // Mengambil segmen transkrip (mendukung transkrip manual maupun otomatis)
      const sections = transcriptData.transcript.content?.body?.initial_segments || [];
      
      if (sections.length === 0) {
        throw new Error("Video ini tidak memiliki transkrip yang dapat diambil.");
      }

      for (const segment of sections) {
        const startMs = parseInt(segment.start_ms);
        const minutes = Math.floor(startMs / 60000);
        const seconds = Math.floor((startMs % 60000) / 1000);
        const timestamp = `[${minutes}:${seconds.toString().padStart(2, '0')}]`;
        fullText += `${timestamp} ${segment.snippet?.text || ''}\n`;
      }

      return res.status(200).json({
        status: 'success',
        transcript: fullText.trim(),
        video_id: videoId
      });

    } catch (transError: any) {
      console.error("Transcript Extraction Detail:", transError);
      return res.status(404).json({ 
        status: 'error', 
        message: `Gagal mengambil transkrip: ${transError.message || 'Transkrip mungkin dinonaktifkan atau hanya tersedia di wilayah tertentu.'}` 
      });
    }

  } catch (error: any) {
    console.error("API Error:", error);
    return res.status(500).json({ status: 'error', message: `Server Error: ${error.message}` });
  }
}
