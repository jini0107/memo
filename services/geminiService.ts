import { GoogleGenAI } from "@google/genai";
import { Item } from "../types";

const getApiKey = () => {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

const getAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set in environment variables.');
  }
  return new GoogleGenAI({ apiKey });
};

export const searchWithGemini = async (query: string, items: Item[]): Promise<string[]> => {
  try {
    const ai = getAIClient();
    const itemsContext = items.map(i => `- ${i.name} (위치: ${i.locationPath}, 메모: ${i.notes.join(',')})`).join('\n');

    const prompt = `
      다음은 사용자가 저장한 물건 목록입니다:
      ${itemsContext}

      사용자의 질문: "${query}"
      
      위 목록에서 질문과 가장 관련 있는 물건의 이름들을 찾아주세요. 
      답변은 오직 관련 있는 물건들의 정확한 이름들을 콤마(,)로 구분해서 나열하십시오. 
      관련 있는 게 없다면 '없음'이라고 답하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const resultText = response.text || '';
    if (resultText.includes('없음')) return [];
    return resultText.split(',').map(s => s.trim());
  } catch (error) {
    console.error("Gemini Search Error:", error);
    return [];
  }
};

export const suggestCategoryAndNotes = async (itemName: string): Promise<{ category: string, notes: string[] }> => {
  try {
    const ai = getAIClient();
    const prompt = `
      물건 이름: "${itemName}"
      이 물건에 적절한 카테고리와 검색을 위한 연관 메모 3개를 추천해줘.
      카테고리는 반드시 다음 중 하나여야 함: [서류/문서, 가전/IT, 의류/패션, 생활용품, 디지털 정보, 기타]
      결과는 반드시 JSON 형식으로 줘: {"category": "카테고리명", "notes": ["메모1", "메모2", "메모3"]}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' }
    });
    const resultText = response.text || '{}';
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini Suggest Error:", error);
    return { category: '기타', notes: [] };
  }
};

export const analyzeImage = async (base64Image: string): Promise<{ name: string, category: string, notes: string[] }> => {
  try {
    const ai = getAIClient();
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const prompt = `
      이 이미지를 분석하여 주요 물건을 식별해주세요.
      1. 물건의 핵심적인 이름을 짧은 한국어로 제안해주세요 (name).
      2. 다음 리스트 중 가장 적합한 카테고리를 선택해주세요 (category): [서류/문서, 가전/IT, 의류/패션, 생활용품, 디지털 정보, 기타].
      3. 검색에 도움이 될만한 연관 한국어 메모 3개를 제안해주세요 (notes).
      
      반드시 JSON 형식으로만 답변하세요: {"name": "...", "category": "...", "notes": ["...", "...", "..."]}
    `;

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

    const resultText = response.text || '{}';
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Gemini Image Analysis Error:", error);
    return { name: '', category: '기타', notes: [] };
  }
};
