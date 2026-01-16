
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

    // Menggunakan Innertube (youtubei.js) - Mirip cara kerja yt-dlp di Python
    const yt = await Innertube.create();
    
    try {
      const info = await yt.getInfo(videoId);
      const basicInfo = info.basic_info;
      
      if (!basicInfo) {
        throw new Error("Video tidak ditemukan atau diproteksi.");
      }

      let transcript = '';
      let hasTranscript = false;

      // Coba ambil transkrip jika tersedia (Mirip youtube-transcript-api)
      if (info.captions && info.captions.caption_tracks && info.captions.caption_tracks.length > 0) {
        try {
          const transcriptData = await info.getTranscript();
          const segments = transcriptData.transcript.content?.body?.initial_segments || [];
          
          if (segments.length > 0) {
            hasTranscript = true;
            transcript = segments.map((s: any) => {
              const ms = parseInt(s.start_ms);
              const m = Math.floor(ms / 60000);
              const sec = Math.floor((ms % 60000) / 1000);
              return `[${m}:${sec.toString().padStart(2, '0')}] ${s.snippet?.text || ''}`;
            }).join('\n');
          }
        } catch (tErr) {
          console.warn("Gagal mengambil transkrip, lanjut ke metadata saja.");
        }
      }

      return res.status(200).json({
        status: 'success',
        metadata: {
          title: basicInfo.title,
          author: basicInfo.author,
          description: basicInfo.short_description || '',
          view_count: basicInfo.view_count,
          publish_date: basicInfo.publish_date,
          thumbnail: basicInfo.thumbnail?.[0]?.url || '',
          duration: basicInfo.duration
        },
        transcript: transcript,
        hasTranscript: hasTranscript,
        video_id: videoId,
        engine: "Innertube (No API Key Required)"
      });

    } catch (innerError: any) {
      console.error("YouTube Inner Error:", innerError);
      return res.status(500).json({ status: 'error', message: innerError.message });
    }
  } catch (error: any) {
    console.error("Global API Error:", error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
