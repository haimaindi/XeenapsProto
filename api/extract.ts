
import { Innertube, UniversalCache } from 'youtubei.js';

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

    /**
     * RAHASIA NOTEGPT: Menggunakan Client Spoofing.
     * Kita mencoba client 'TV_EMBEDDED' karena YouTube memberikan proteksi paling rendah
     * pada request yang datang dari integrasi Smart TV.
     */
    const yt = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      device_category: 'tv' // Menyamar sebagai Smart TV
    });
    
    try {
      const info = await yt.getInfo(videoId);
      const basicInfo = info.basic_info;
      
      if (!basicInfo) {
        throw new Error("Video tidak dapat diakses.");
      }

      let transcript = '';
      let hasTranscript = false;

      /**
       * Mengambil Transkrip dengan cara yang lebih agresif
       */
      try {
        const transcriptData = await info.getTranscript();
        const segments = transcriptData.transcript.content?.body?.initial_segments || [];
        
        if (segments.length > 0) {
          hasTranscript = true;
          transcript = segments.map((s: any) => {
            const ms = parseInt(s.start_ms);
            const m = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            const timestamp = `[${m}:${sec.toString().padStart(2, '0')}]`;
            return `${timestamp} ${s.snippet?.text || ''}`;
          }).join('\n');
        }
      } catch (tErr) {
        console.warn("Transkrip gagal diambil lewat client TV, mencoba metadata saja.");
      }

      // Jika transkrip masih kosong, NoteGPT biasanya mengambil deskripsi sebagai fallback
      const finalMetadata = {
        title: basicInfo.title,
        author: basicInfo.author,
        description: basicInfo.short_description || '',
        view_count: basicInfo.view_count,
        publish_date: basicInfo.publish_date,
        thumbnail: basicInfo.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        duration: basicInfo.duration
      };

      return res.status(200).json({
        status: 'success',
        metadata: finalMetadata,
        transcript: transcript,
        hasTranscript: hasTranscript,
        video_id: videoId,
        method: "Spoofed_TV_Client"
      });

    } catch (innerError: any) {
      // Fallback terakhir jika client TV gagal total (kemungkinan IP diblokir provider cloud)
      return res.status(500).json({ 
        status: 'error', 
        message: "YouTube mendeteksi aktivitas otomatis. Silakan gunakan metode MANUAL (Copy-Paste) untuk saat ini." 
      });
    }
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
