
import { GoogleGenAI, Type } from "@google/genai";

export const performResearch = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
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
  } catch (error) {
    console.error("Research Error:", error);
    throw error;
  }
};

/**
 * Menggunakan Gemini AI + Google Search untuk mendapatkan metadata YouTube 
 * yang tidak bisa diambil lewat scraping standar (Tahun, Keywords, Konten).
 */
export const getYoutubeAIExtraction = async (url: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Analyze this YouTube video link: ${url}. 
  Find the following information using Google Search:
  1. Exact Upload Year.
  2. Keywords/Tags used by the creator.
  3. A detailed content overview or transcript-like summary of what is discussed in the video.
  
  Return the data in a clean JSON format.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.STRING },
            keywords: { type: Type.STRING, description: "Comma separated keywords" },
            contentSummary: { type: Type.STRING, description: "A transcript-like detailed summary" },
            author: { type: Type.STRING }
          },
          required: ["year", "keywords", "contentSummary"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("YouTube AI Extraction Error:", error);
    throw error;
  }
};

export const analyzeCollectionSource = async (
  sourceValue: string, 
  sourceMethod: 'upload' | 'link', 
  language: 'EN' | 'ID',
  fileData?: string,
  extractedText?: string 
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const langName = language === 'ID' ? 'Indonesian' : 'English';
  const modelToUse = 'gemini-3-pro-preview';

  const systemInstruction = `You are a Senior Academic Researcher and Data Analyst for Smart Scholar Library. 
  Your goal is to perform a high-level academic audit of the provided content.
  
  OUTPUT LANGUAGE: **${langName.toUpperCase()}** ONLY. All summaries and points must be in ${langName}.
  Metadata like TITLE, AUTHOR, PUBLISHER, YEAR, KEYWORDS, and CITATIONS must follow the source's original facts (Keywords/Tags in English).

  *** ANALYSIS RULES ***
  1. **SUMMARY**: Provide a comprehensive scholarly summary.
  2. **ABSTRACT**: Provide a concise academic abstract.
  3. **STRENGTH/WEAKNESS**: Evaluate the scholarly value and limitations.
  4. **TERMINOLOGY**: Identify difficult terms and explain them simply.
  5. **CITATIONS**: Generate APA and Harvard citations.

  *** VISUAL FORMATTING ***
  Use ONLY basic HTML tags for styling: <b>bold</b>, <i>italic</i>. DO NOT USE MARKDOWN.

  OUTPUT FORMAT: Return raw JSON object strictly following the provided schema.`;

  const prompt = `Perform a deep academic audit of this source. 
  Source Method: ${sourceMethod}
  Language Preference: ${langName}
  
  CONTENT TO ANALYZE:
  ${extractedText ? extractedText : "Source Link: " + sourceValue}`;

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

  try {
    const response = await ai.models.generateContent({
      model: modelToUse, 
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
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};
