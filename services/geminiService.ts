
import { GoogleGenAI, Type } from "@google/genai";
import { fetchSettings } from "./spreadsheetService";

let cachedKeys: string[] = [];

const refreshKeys = async () => {
  try {
    const settings = await fetchSettings();
    cachedKeys = Array.isArray(settings?.geminiKeys) ? settings.geminiKeys : [];
  } catch (e) {
    cachedKeys = [];
  }
  return cachedKeys;
};

const executeWithRotation = async (operation: (ai: GoogleGenAI) => Promise<any>) => {
  // Defensive check for array presence
  if (!Array.isArray(cachedKeys) || cachedKeys.length === 0) {
    await refreshKeys();
  }

  const currentKeys = Array.isArray(cachedKeys) ? cachedKeys : [];

  if (currentKeys.length === 0) {
    throw new Error("No Gemini API Keys found. Please add them in Settings.");
  }

  let lastError: any = null;
  
  // Try each key in sequence
  for (let i = 0; i < currentKeys.length; i++) {
    const key = currentKeys[i];
    if (!key) continue;
    
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      return await operation(ai);
    } catch (error: any) {
      lastError = error;
      // If it's a quota/usage limit error (429), try next key
      if (error.message?.includes("429") || error.message?.includes("quota")) {
        console.warn(`Key ${i+1} reached quota, rotating to next key...`);
        continue;
      }
      // If it's another error, throw it immediately
      throw error;
    }
  }

  throw new Error(`All available API Keys exhausted their quota or failed. Last error: ${lastError?.message || "Unknown error"}`);
};

export const performResearch = async (query: string) => {
  return await executeWithRotation(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: `You are an academic research assistant for Smart Scholar Library. Provide a deep, structured summary for the research query: "${query}". Include key concepts, recent developments, and potential areas for further study. Use Markdown.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "No response received.";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || "Reference",
      uri: chunk.web?.uri || "#"
    })) || [];

    return { text, sources };
  });
};

export const analyzeCollectionSource = async (
  sourceValue: string, 
  sourceMethod: 'upload' | 'link', 
  language: 'EN' | 'ID',
  fileData?: string,
  extractedText?: string 
) => {
  return await executeWithRotation(async (ai) => {
    const langName = language === 'ID' ? 'Indonesian' : 'English';

    const systemInstruction = `You are a Senior Academic Researcher and Data Analyst for Smart Scholar Library. 
    Your goal is to perform a high-level academic audit of the provided content.
    OUTPUT LANGUAGE: **${langName.toUpperCase()}** ONLY. All summaries and points must be in ${langName}.
    Use ONLY basic HTML tags for styling: <b>bold</b>, <i>italic</i>. DO NOT USE MARKDOWN.
    OUTPUT FORMAT: Return raw JSON object strictly following the provided schema.`;

    const prompt = `Perform a deep academic audit of this source. 
    Source Method: ${sourceMethod}
    Language Preference: ${langName}
    CONTENT: ${extractedText ? extractedText : "Source Link: " + sourceValue}`;

    const parts: any[] = [{ text: prompt }];
    
    if (sourceMethod === 'upload' && fileData && !extractedText) {
        const [mimeInfo, base64Data] = fileData.split(',');
        const mimeType = mimeInfo.match(/:(.*?);/)?.[1] || 'application/pdf';
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: { parts: parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            authorName: { type: Type.STRING },
            year: { type: Type.STRING },
            publisher: { type: Type.STRING },
            keyword: { type: Type.STRING },
            tagLabel: { type: Type.STRING },
            inTextCitation: {
              type: Type.OBJECT,
              properties: {
                apa: { type: Type.STRING },
                harvard: { type: Type.STRING }
              }
            },
            inReferenceCitation: {
              type: Type.OBJECT,
              properties: {
                apa: { type: Type.STRING },
                harvard: { type: Type.STRING }
              }
            },
            researchMethodology: { type: Type.STRING },
            abstract: { type: Type.STRING },
            summary: { type: Type.STRING },
            strength: { type: Type.STRING },
            weakness: { type: Type.STRING },
            unfamiliarTerminology: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                }
              }
            },
            supportingReferences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  citation: { type: Type.STRING },
                  relevance: { type: Type.STRING },
                  link: { type: Type.STRING }
                }
              }
            },
            tipsForYou: { type: Type.STRING }
          },
          required: [
            "title", "authorName", "year", "publisher", "keyword", "tagLabel", 
            "inTextCitation", "inReferenceCitation", "researchMethodology", 
            "abstract", "summary", "strength", "weakness", 
            "unfamiliarTerminology", "supportingReferences", "tipsForYou"
          ]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  });
};
