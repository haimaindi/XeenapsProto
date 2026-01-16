
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

export const analyzeCollectionSource = async (
  sourceValue: string, 
  sourceMethod: 'upload' | 'link' | 'audio', 
  language: 'EN' | 'ID',
  fileData?: string,
  extractedText?: string 
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const langName = language === 'ID' ? 'Indonesian' : 'English';
  const isVideoOrAudio = sourceMethod === 'audio' || sourceValue.includes('youtube.com') || sourceValue.includes('youtu.be') || extractedText?.includes('TRANSCRIPT:');
  
  // Menggunakan model audio jika sumbernya adalah file audio/video langsung
  const modelToUse = sourceMethod === 'audio' ? 'gemini-2.5-flash-native-audio-preview-12-2025' : 'gemini-3-pro-preview';

  const systemInstruction = `You are a Senior Academic Researcher and Speech-to-Text Analyst. 
  Analyze the provided ${sourceMethod === 'audio' ? 'Audio/Video file' : (sourceMethod === 'upload' ? 'document content' : 'URL/Transcript')} strictly.
  
  OUTPUT LANGUAGE: **${langName.toUpperCase()}** ONLY. All explanations, summaries, and points must be in ${langName} except for TITLE, PUBLISHER, AUTHOR'S NAME, KEYWORDS, TAG/LABELS, CITATION.

  *** SPEECH-TO-TEXT & ANALYSIS RULES ***
  1. If audio is provided, TRANSCRIBE the key points first, then analyze.
  2. **SUMMARY**: For audio/video, provide a "Timeline Summary" using HTML styling (e.g., <b>[02:30]</b>: Explanation). 
  3. **RESEARCH METHODOLOGY**: Describe the nature of the recording (e.g., Lecture, Interview, Seminar).

  *** METADATA EXTRACTION RULES ***
  1. **AUTHOR NAME**: Channel Name, Speaker, or Author.
  2. **KEYWORDS & TAG/LABELS**: MUST be in ENGLISH.

  *** CRITICAL VISUAL FORMATTING ***
  1. Use HTML tags only: <b>bold</b>, <i>italic</i>, and <span style="color:#0088A3">highlights</span>. NO MARKDOWN.

  OUTPUT FORMAT: Return raw JSON object.`;

  const prompt = `Perform a deep academic audit of the source.
  Generate detailed analysis in ${langName}.
  ${sourceMethod === 'audio' ? "LISTEN CAREFULLY to the audio and transcribe the main arguments." : ""}
  Return ONLY raw JSON.`;

  const parts: any[] = [{ text: prompt }];
  
  if (sourceMethod === 'audio' && fileData) {
    const [mimeInfo, base64Data] = fileData.split(',');
    const mimeType = mimeInfo.match(/:(.*?);/)?.[1] || 'audio/mp3';
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Data
      }
    });
  } else if (extractedText && extractedText.trim().length > 10) {
      parts.push({
          text: `\n\n--- CONTENT ---\n${extractedText}\n--- END CONTENT ---`
      });
  } else if (sourceMethod === 'upload' && fileData) {
      const [mimeInfo, base64Data] = fileData.split(',');
      const mimeType = mimeInfo.match(/:(.*?);/)?.[1] || 'application/pdf';
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
  } else {
    parts.push({ text: `Source Link: ${sourceValue}` });
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
