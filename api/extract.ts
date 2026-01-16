
import { Innertube } from 'youtubei.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ status: 'error', message: 'URL required' });

  try {
    let videoId = '';
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname === 'youtu.be') {
        videoId = parsedUrl.pathname.slice(1);
      } else {
        videoId = parsedUrl.searchParams.get('v') || parsedUrl.pathname.split('/').pop() || '';
      }
    } catch (e) {
      videoId = url;
    }

    if (!videoId || videoId.length !== 11) {
      return res.status(400).json({ status: 'error', message: 'Invalid Video ID' });
    }

    // Inisialisasi tanpa opsi generate_session_store untuk menghindari error TypeScript
    const yt = await Innertube.create();
    
    try {
      const info = await yt.getInfo(videoId);
      
      // Cek apakah video memiliki caption/transkrip tersedia
      if (!info.captions || !info.captions.caption_tracks || info.captions.caption_tracks.length === 0) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Video ini tidak memiliki transkrip atau teks terjemahan yang tersedia (Closed Captions disabled).' 
        });
      }

      // Ambil transkrip
      const transcriptData = await info.getTranscript();
      const segments = transcriptData.transcript.content?.body?.initial_segments || [];
      
      if (segments.length === 0) {
        throw new Error("Transkrip kosong atau tidak dapat diurai.");
      }

      let fullText = '';
      for (const segment of segments) {
        const startMs = parseInt(segment.start_ms);
        const mins = Math.floor(startMs / 60000);
        const secs = Math.floor((startMs % 60000) / 1000);
        const timestamp = `[${mins}:${secs.toString().padStart(2, '0')}]`;
        fullText += `${timestamp} ${segment.snippet?.text || ''}\n`;
      }

      return res.status(200).json({
        status: 'success',
        transcript: fullText.trim(),
        video_id: videoId
      });

    } catch (innerError: any) {
      console.error("YouTube Inner Error:", innerError);
      const msg = innerError.message || "";
      if (msg.includes('400')) {
        return res.status(400).json({ 
          status: 'error', 
          message: 'YouTube menolak permintaan transkrip (Error 400). Ini bisa terjadi jika video tidak memiliki teks otomatis yang dihasilkan atau sedang diproteksi.' 
        });
      }
      return res.status(500).json({ status: 'error', message: innerError.message });
    }
  } catch (error: any) {
    console.error("Global API Error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
