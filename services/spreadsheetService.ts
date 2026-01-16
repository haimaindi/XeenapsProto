
import { CollectionEntry } from '../types';

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw4A1VjOY1Ok65w2q6twp8et-4vMzI-8WG4FMyBv5QKoFBEFMHsFrI6PSWuBkzcJPSr/exec";

export const fetchCollections = async (): Promise<CollectionEntry[] | null> => {
  if (WEB_APP_URL.includes("PASTE_YOUR")) return [];
  try {
    const response = await fetch(WEB_APP_URL, { redirect: 'follow' });
    if (!response.ok) throw new Error("Failed to fetch from GAS");
    const rawData = await response.json();
    if (!Array.isArray(rawData)) return [];
    return rawData.map((item: any) => ({
      ...item,
      id: item.id || item.ID || crypto.randomUUID(),
      title: item.title || item.Title || "Untitled",
      sourceMethod: (item.sourceMethod || item['Source Method']) === 'link' ? 'link' : 'upload',
      isFavourite: item.isFavourite === true || item.isFavourite === "true" || item.isFavourite === "TRUE",
      isBookmarked: item.isBookmarked === true || item.isBookmarked === "true" || item.isBookmarked === "TRUE",
    }));
  } catch (error) {
    console.error("Fetch Collections Error:", error);
    return null;
  }
};

export const fetchWebContent = async (url: string): Promise<string> => {
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error("Proxy server returned an error.");
    return await response.text();
  } catch (error) {
    console.error("Fetch Web Error:", error);
    throw new Error("Gagal mengambil data otomatis. Gunakan tombol 'MANUAL'.");
  }
};

export const fetchYoutubeTranscript = async (url: string): Promise<{title: string, transcript: string}> => {
  if (url.includes('results?search_query')) {
    throw new Error("Anda memasukkan link HASIL PENCARIAN. Silakan klik salah satu video terlebih dahulu.");
  }

  try {
    const apiUrl = `/api/extract?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const result = await response.json().catch(() => ({ status: 'error', message: 'Unknown error occurred' }));
    
    if (!response.ok) {
      throw new Error(result.message || "Gagal mengambil transkrip video.");
    }

    if (result.status === 'error') {
      throw new Error(result.message || "Gagal mengekstrak transkrip.");
    }

    let title = "YouTube Video";
    try {
      const webProxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const webRes = await fetch(webProxy);
      const html = await webRes.text();
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch) title = titleMatch[1].replace(" - YouTube", "");
    } catch (e) {
      console.warn("Could not fetch title via proxy.");
    }

    return { 
      title, 
      transcript: result.transcript 
    };
  } catch (error: any) {
    console.error("YouTube Integration Error:", error);
    // Berikan saran spesifik jika error 400
    if (error.message.includes('400')) {
       throw new Error("YouTube menolak akses otomatis ke transkrip video ini. Ini biasanya terjadi pada video musik atau video yang teks otomatisnya dinonaktifkan oleh pemiliknya.");
    }
    throw error;
  }
};

export interface DriveFileData {
  status: string;
  data: string;
  fileName: string;
  mimeType: string;
}

export const fetchFileData = async (url: string): Promise<DriveFileData | null> => {
  if (WEB_APP_URL.includes("PASTE_YOUR")) return null;
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'get_file_data', url }),
    });
    const result = await response.json();
    return result.status === 'success' ? result : null;
  } catch (error) {
    console.error("Fetch File Data Error:", error);
    return null;
  }
};

export const saveCollectionToGAS = async (entry: Partial<CollectionEntry> & { fileData?: string, fileName?: string, fileMimeType?: string }) => {
  if (WEB_APP_URL.includes("PASTE_YOUR")) return { status: 'mock', url: entry.sourceValue || 'mock-url' };
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'create', data: entry }),
    });
    return await response.json();
  } catch (error) {
    console.error("GAS Create Error:", error);
    throw error;
  }
};

export const deleteCollectionsFromGAS = async (ids: string[]) => {
  if (WEB_APP_URL.includes("PASTE_YOUR")) return;
  try {
    await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'delete', ids }),
    });
  } catch (error) { console.error(error); }
};

export const updateCollectionStatusInGAS = async (id: string, field: string, value: any) => {
  if (WEB_APP_URL.includes("PASTE_YOUR")) return;
  try {
    await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'update_field', id, field, value: value === undefined ? null : value }),
    });
  } catch (error) { console.error(error); }
};

export const updateCollectionInGAS = async (id: string, updates: Partial<CollectionEntry>) => {
  if (WEB_APP_URL.includes("PASTE_YOUR")) return;
  try {
    await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'update_entry', id, updates }),
    });
  } catch (error) { console.error(error); }
};
