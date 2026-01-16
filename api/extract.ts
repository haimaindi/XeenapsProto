
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

    // Inisialisasi Innertube dengan cache universal untuk performa lebih baik
    const yt = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
    
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

    // Strategi Ekstraksi Transkrip Bertingkat
    try {
      const transcriptData = await info.getTranscript();
      const segments = transcriptData?.transcript?.content?.body?.initial_segments;
      
      if (segments && segments.length > 0) {
        hasTranscript = true;
        transcriptText = segments
          .map((segment: any) => {
            const startMs = segment.start_ms;
            const m = Math.floor(startMs / 60000);
            const s = Math.floor((startMs % 60000) / 1000);
            const timestamp = `[${m}:${s.toString().padStart(2, '0')}]`;
            return `${timestamp} ${segment.snippet?.text || ''}`;
          })
          .join('\n');
      }
    } catch (e) {
      console.warn("Metode getTranscript() gagal, mencoba fallback ke track metadata...");
      
      // Fallback: Coba mencari captions di metadata dasar jika getTranscript diblokir
      const captionTracks = info.captions?.caption_tracks;
      if (captionTracks && captionTracks.length > 0) {
        // Kita tahu video punya transkrip, tapi API server mungkin diblokir saat mencoba mendownload track spesifik
        // Informasikan ke UI bahwa video punya transkrip tapi gagal diunduh server
        return res.status(200).json({
          status: 'partial_success',
          metadata,
          hasTranscript: true,
          error_type: 'DOWNLOAD_BLOCKED',
          message: 'Transkrip terdeteksi namun YouTube memblokir akses server. Silakan gunakan metode PASTE MANUAL.'
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      metadata,
      transcript: transcriptText,
      hasTranscript: hasTranscript && transcriptText.length > 0,
      video_id: videoId
    });

  } catch (error: any) {
    console.error("Extract API Error:", error);
    
    // Deteksi blokir IP secara eksplisit
    const isIpBlock = error.message?.includes('403') || error.message?.includes('Sign in');
    
    return res.status(500).json({ 
      status: 'error', 
      is_ip_block: isIpBlock,
      message: isIpBlock 
        ? "YouTube memblokir akses otomatis dari server (Bot Protection). Silakan gunakan metode INPUT MANUAL." 
        : "Gagal mengambil data video. Pastikan link benar." 
    });
  }
}
