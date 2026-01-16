
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
      return res.status(400).json({ status: 'error', message: 'ID Video tidak valid.' });
    }

    // Menggunakan Innertube (youtubei.js) yang jauh lebih tangguh
    const yt = await Innertube.create();
    const info = await yt.getInfo(videoId);

    const metadata = {
      title: info.basic_info.title || 'Untitled Video',
      author: info.basic_info.author || 'Unknown Channel',
      description: info.basic_info.short_description || '',
      view_count: info.basic_info.view_count || '0',
      thumbnail: info.basic_info.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      duration: info.basic_info.duration || 0,
    };

    let transcriptText = '';
    let hasTranscript = false;

    try {
      const transcriptData = await info.getTranscript();
      if (transcriptData && transcriptData.transcript?.content?.body?.initial_segments) {
        hasTranscript = true;
        transcriptText = transcriptData.transcript.content.body.initial_segments
          .map((segment: any) => {
            const startMs = segment.start_ms;
            const m = Math.floor(startMs / 60000);
            const s = Math.floor((startMs % 60000) / 1000);
            const timestamp = `[${m}:${s.toString().padStart(2, '0')}]`;
            const text = segment.snippet?.text || '';
            return `${timestamp} ${text}`;
          })
          .join('\n');
      }
    } catch (transcriptError) {
      console.warn("Gagal mengambil transkrip otomatis:", transcriptError);
    }

    return res.status(200).json({
      status: 'success',
      metadata,
      transcript: transcriptText,
      hasTranscript,
      video_id: videoId,
      method: "Innertube_Extraction"
    });

  } catch (error: any) {
    console.error("Extract API Error (Innertube):", error);
    
    // Fallback: Jika youtubei.js pun gagal karena pemblokiran IP di level hosting
    return res.status(500).json({ 
      status: 'error', 
      message: "YouTube memblokir akses otomatis (IP Cloud Terdeteksi). Silakan gunakan metode INPUT MANUAL atau tempel transkrip secara langsung." 
    });
  }
}
