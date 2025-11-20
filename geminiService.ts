import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateMotivation = async (currentPoints: number): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // We use flash for quick, low-latency responses appropriate for a mini-app
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, punchy, 1-sentence motivational quote for a user who is building their digital wealth. 
      They currently have ${currentPoints} points. Be encouraging, slightly futuristic, and use one emoji at the end.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for speed
      }
    });

    return response.text || "Keep pushing forward! 🚀";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Success is the sum of small efforts repeated. 💪";
  }
};
