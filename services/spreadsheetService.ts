
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

export const fetchSettings = async (): Promise<{ geminiKeys: string[] }> => {
  if (WEB_APP_URL.includes("PASTE_YOUR")) return { geminiKeys: [] };
  try {
    const response = await fetch(`${WEB_APP_URL}?action=get_settings`, { redirect: 'follow' });
    const data = await response.json();
    // Pastikan geminiKeys selalu berupa array, meskipun API mengembalikan error atau struktur lain
    return { geminiKeys: Array.isArray(data?.geminiKeys) ? data.geminiKeys : [] };
  } catch (error) {
    console.error("Fetch Settings Error:", error);
    return { geminiKeys: [] };
  }
};

export const saveSettingsToGAS = async (geminiKeys: string[]) => {
  if (WEB_APP_URL.includes("PASTE_YOUR")) return;
  try {
    await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: 'save_settings', geminiKeys }),
    });
  } catch (error) {
    console.error("Save Settings Error:", error);
  }
};

export interface WebExtractionResult {
  title: string;
  content: string;
  textContent: string;
  byline?: string;
  siteName?: string;
}

export const fetchWebContent = async (url: string): Promise<WebExtractionResult> => {
  try {
    const apiUrl = `/api/web_extract?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Web extraction failed.");
    return data;
  } catch (error: any) {
    throw error;
  }
};

export interface YoutubeExtractionResult {
  title: string;
  author: string;
  transcript: string;
  hasTranscript: boolean;
  year?: string;
  keywords?: string;
  publisher?: string;
}

export const fetchYoutubeTranscript = async (url: string): Promise<YoutubeExtractionResult> => {
  try {
    const apiUrl = `/api/extract?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const result = await response.json();
    if (result.status === 'error') throw new Error(result.message);
    return {
      title: result.metadata.title,
      author: result.metadata.author,
      year: result.metadata.year,
      keywords: result.metadata.keywords,
      publisher: result.metadata.publisher,
      transcript: result.transcript,
      hasTranscript: result.hasTranscript
    };
  } catch (error: any) {
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
    return null;
  }
};

export const saveCollectionToGAS = async (entry: Partial<CollectionEntry>) => {
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
  } catch (error) {}
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
  } catch (error) {}
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
  } catch (error) {}
};
