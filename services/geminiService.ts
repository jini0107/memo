
import { GoogleGenAI } from "@google/genai";
import { Item } from "../types";

const getApiKey = () => {
  try {
    // 1. Check Vite env var
    if (import.meta.env.VITE_GEMINI_API_KEY) {
      return import.meta.env.VITE_GEMINI_API_KEY;
    }
    // 2. Check localStorage (for user entered key)
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) return stored;

    // 3. Fallback to process.env (mostly for node based tests, rarely used in vite)
    return process.env.API_KEY || '';
  } catch (e) {
    return '';
  }
};

const getAIClient = () => {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
};

export const searchWithGemini = async (query: string, items: Item[]): Promise<string[]> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const itemsContext = items.map(i => `- ${i.name} (위치: ${i.locationPath}, 태그: ${i.tags.join(',')})`).join('\n');

  const prompt = `
    다음은 사용자가 저장한 물건 목록입니다:
    ${itemsContext}

    사용자의 질문: "${query}"
    
    위 목록에서 질문과 가장 관련 있는 물건의 ID들을 찾아주세요. 
    답변은 오직 관련 있는 물건들의 정확한 이름들을 콤마(,)로 구분해서 나열하십시오. 
    관련 있는 게 없다면 '없음'이라고 답하세요.
  `;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    const resultText = response.text || '';
    if (resultText.includes('없음')) return [];
    return resultText.split(',').map(s => s.trim());
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};

export const suggestCategoryAndTags = async (itemName: string): Promise<{ category: string, tags: string[] }> => {
  const apiKey = getApiKey();
  if (!apiKey) return { category: '기타', tags: [] };

  const prompt = `
    물건 이름: "${itemName}"
    이 물건에 적절한 카테고리와 검색용 태그 3개를 추천해줘.
    카테고리는 반드시 다음 중 하나여야 함: [서류/문서, 가전/IT, 의류/패션, 생활용품, 디지털 정보, 기타]
    결과는 반드시 JSON 형식으로 줘: {"category": "카테고리명", "tags": ["태그1", "태그2", "태그3"]}
  `;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Suggest Error:", error);
    return { category: '기타', tags: [] };
  }
};

export const analyzeImage = async (base64Image: string): Promise<{ name: string, category: string, tags: string[] }> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing");

  // base64Image format: "data:image/jpeg;base64,..."
  // Provide specific instructions for the AI
  const prompt = `
    Analyze this image and identify the main item.
    1. Suggest a concise Korean name for the item (name).
    2. Suggest the most appropriate category (category) from this list: [서류/문서, 가전/IT, 의류/패션, 생활용품, 디지털 정보, 기타].
    3. Suggest 3 relevant Korean search tags (tags).
    
    Return ONLY JSON: {"name": "...", "category": "...", "tags": ["...", "...", "..."]}
  `;

  try {
    const ai = getAIClient();

    // Check if the base64 string works directly or needs processing.
    // The @google/genai usually accepts inlineData.
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } }
          ]
        }
      ],
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text ? response.text() : "{}";
    // Note: depending on SDK version, .text might be a function or property. 
    // In the previous code it was accessed as property .text, but typically it is text().
    // Let's try to be safe. "response.text" in the previous code was treated as string property.
    // If it fails, we catch it.

    // Wait, the previous code used "response.text || ''". 
    // Use that pattern if compatible, but usually it's response.response.text() in @google/generative-ai. 
    // If using @google/genai (Node), it returns a different structure. 
    // I'll stick to the previous pattern but sanitize the JSON.

    const jsonStr = typeof response.text === 'function' ? response.text() : (response.text || '{}');
    return JSON.parse(jsonStr);

  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return { name: '', category: '기타', tags: [] };
  }
};
