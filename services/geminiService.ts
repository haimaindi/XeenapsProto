
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
  sourceMethod: 'upload' | 'link', 
  language: 'EN' | 'ID',
  fileData?: string,
  extractedText?: string 
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const langName = language === 'ID' ? 'Indonesian' : 'English';
  const isVideo = sourceValue.includes('youtube.com') || sourceValue.includes('youtu.be') || extractedText?.includes('TRANSCRIPT:');
  
  const systemInstruction = `You are a Senior Academic Researcher and Video Analyst. Analyze the provided ${isVideo ? 'YouTube Video Transcript' : (sourceMethod === 'upload' ? 'document content' : 'URL link')} strictly.
  
  OUTPUT LANGUAGE: **${langName.toUpperCase()}** ONLY. All explanations, summaries, and points must be in ${langName} except for TITLE, PUBLISHER, AUTHOR'S NAME, KEYWORDS, TAG/LABELS, CITATION.

  *** METADATA EXTRACTION RULES (HIGHEST PRIORITY) ***
  1. **AUTHOR NAME**: Extract ONLY real names. For videos, this is the Channel Name or Speaker.
  2. **TITLE**: Extract exact full academic or video title.
  3. **PUBLISHER**: Identify Journal, University, or Platform (YouTube).
  4. **YEAR**: Extract publication year.
  5. **KEYWORDS & TAG/LABELS**: MUST be in ENGLISH.

  *** SPECIAL VIDEO ANALYSIS RULES ***
  If this is a video/transcript:
  1. **SUMMARY**: Provide a "Timeline Summary" using HTML styling (e.g., <b>[02:30]</b>: Explanation). 
  2. **RESEARCH METHODOLOGY**: Describe the context/nature of the video (e.g., Expert Interview, Documentary, Tutorial).

  *** CRITICAL VISUAL FORMATTING RULES ***
  1. **REQUIRED**: Use HTML tags only for styling: <b>bold</b>, <i>italic</i>, and <span style="color:#0088A3">highlights</span>. NO MARKDOWN.

  RULES BY SECTION:
  1. **RESEARCH METHODOLOGY**: Translate description to ${langName}. 
  2. **ABSTRACT**: MANDATORY translation to ${langName}.
  3. **SUMMARY**: Provide deep narrative summary in ${langName}. IMRaD structure for academic papers, Timeline for videos.
  4. **STRENGTH & WEAKNESS**: Minimum 3 points each.
  5. **UNFAMILIAR TERMINOLOGY**: Extract terms and translate explanations to ${langName}.
  6. **SUPPORTING REFERENCES**: Provide high-confidence links or Google Scholar search URLs.
  7. **TIPS FOR YOU**: Actionable advice paragraph with HTML styling.
  8. **CITATIONS**: Plain text only.

  OUTPUT FORMAT: Return raw JSON object.
  `;

  const prompt = `Perform a deep academic audit of the source.
  Generate detailed analysis in ${langName}.
  ${isVideo ? "This is a YouTube video. Focus on extracting key insights from the transcript segments." : ""}
  
  MANDATORY: 
  1. Use the provided TEXT CONTENT (Transcript or Document Text) as the primary source of truth.
  2. If citations are unavailable, return empty string "".
  3. Return ONLY raw JSON.`;

  const parts: any[] = [{ text: prompt }];
  
  if (extractedText && extractedText.trim().length > 10) {
      parts.push({
          text: `\n\n--- SOURCE CONTENT ---\n${extractedText}\n--- END CONTENT ---`
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
      model: 'gemini-3-pro-preview', 
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
        },
        tools: [{ googleSearch: {} }],
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};
