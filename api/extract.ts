
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

    // 1. Fetch the video page with a standard browser User-Agent
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}&ucbcb=1`;
    const response = await fetch(ytUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });

    if (!response.ok) throw new Error(`YouTube returned status ${response.status}`);
    const html = await response.text();

    // 2. Extract ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
    if (!playerResponseMatch) {
      // Fallback: Check if it's a "Sign in" block
      if (html.includes('class="g-recaptcha"') || html.includes('Sign in to confirm you')) {
        return res.status(403).json({ 
          status: 'error', 
          message: "YouTube memblokir akses otomatis (IP Cloud Terdeteksi). Gunakan tombol MANUAL." 
        });
      }
      throw new Error("Gagal mengekstrak data player YouTube.");
    }

    const playerResponse = JSON.parse(playerResponseMatch[1]);
    const videoDetails = playerResponse.videoDetails || {};
    const captions = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

    // 3. Extract Metadata
    const metadata = {
      title: videoDetails.title || 'Untitled Video',
      author: videoDetails.author || 'Unknown Channel',
      description: videoDetails.shortDescription || '',
      view_count: videoDetails.viewCount || '0',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      duration: parseInt(videoDetails.lengthSeconds) || 0,
      publish_date: '' // Not always available in playerResponse
    };

    // 4. Extract Transcript
    let transcriptText = '';
    let hasTranscript = false;

    if (captions.length > 0) {
      // Prioritize English, then Indonesian, then anything else
      const track = captions.find((t: any) => t.languageCode === 'en') || 
                    captions.find((t: any) => t.languageCode === 'id') || 
                    captions[0];

      if (track && track.baseUrl) {
        try {
          const transcriptRes = await fetch(track.baseUrl + '&fmt=json3');
          const transcriptJson = await transcriptRes.json();
          
          if (transcriptJson.events) {
            hasTranscript = true;
            transcriptText = transcriptJson.events
              .filter((e: any) => e.segs)
              .map((e: any) => {
                const start = Math.floor(e.tStartMs / 1000);
                const m = Math.floor(start / 60);
                const s = start % 60;
                const timestamp = `[${m}:${s.toString().padStart(2, '0')}]`;
                const text = e.segs.map((s: any) => s.utf8).join(' ');
                return `${timestamp} ${text}`;
              })
              .join('\n');
          }
        } catch (e) {
          console.error("Transcript fetch failed", e);
        }
      }
    }

    return res.status(200).json({
      status: 'success',
      metadata,
      transcript: transcriptText,
      hasTranscript,
      video_id: videoId,
      method: "Direct_TimedText_Extraction"
    });

  } catch (error: any) {
    console.error("Extract API Error:", error);
    return res.status(500).json({ 
      status: 'error', 
      message: error.message || "Gagal mengambil data video." 
    });
  }
}
