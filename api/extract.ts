
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
     * METODE TERBAIK (TIRU NOTEGPT/EIGHTIFY):
     * Kita menggunakan client 'ANDROID' karena YouTube memberikan data transkrip
     * paling konsisten ke perangkat mobile untuk fitur Accessibility (TalkBack).
     */
    const createYTInstance = async (clientType: string) => {
      return await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
        device_category: clientType as any,
        // Kita tambahkan User Agent Mobile agar tidak terdeteksi sebagai Server Cloud
        fetch: (input: any, init: any) => {
          const headers = new Headers(init?.headers);
          headers.set('User-Agent', 'com.google.android.youtube/19.05.36 (Linux; U; Android 14; en_US; Pixel 8 Pro; Build/UQ1A.240205.002) (gzip)');
          return fetch(input, { ...init, headers });
        }
      });
    };

    let yt;
    try {
      // Coba Client ANDROID dahulu (Favorit NoteGPT)
      yt = await createYTInstance('ANDROID');
    } catch (e) {
      // Fallback ke ANDROID_VR jika gagal
      yt = await createYTInstance('ANDROID_VR');
    }
    
    try {
      const info = await yt.getInfo(videoId);
      const basicInfo: any = info.basic_info;
      
      if (!basicInfo) {
        throw new Error("Video tidak ditemukan atau private.");
      }

      let transcript = '';
      let hasTranscript = false;

      /**
       * Ekstraksi Transkrip
       */
      try {
        const transcriptData = await info.getTranscript();
        const segments = (transcriptData as any).transcript?.content?.body?.initial_segments || [];
        
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
        console.warn("Transkrip otomatis gagal, mencoba mengambil caption dasar.");
      }

      const finalMetadata = {
        title: basicInfo.title || 'Untitled Video',
        author: basicInfo.author || 'Unknown Creator',
        description: basicInfo.short_description || '',
        view_count: basicInfo.view_count || '0',
        publish_date: basicInfo.publish_date || '',
        thumbnail: basicInfo.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        duration: basicInfo.duration || 0
      };

      return res.status(200).json({
        status: 'success',
        metadata: finalMetadata,
        transcript: transcript,
        hasTranscript: hasTranscript,
        video_id: videoId,
        method: "NoteGPT_Android_Spoof"
      });

    } catch (innerError: any) {
      // Jika error 403 (Forbidden), ini berarti IP Vercel sudah diblokir keras
      if (innerError.status === 403 || innerError.message?.includes('403')) {
        return res.status(500).json({ 
          status: 'error', 
          message: "YouTube memblokir akses otomatis (IP Cloud Terdeteksi). Silakan gunakan tombol MANUAL untuk menempelkan transkrip." 
        });
      }
      throw innerError;
    }
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
}
