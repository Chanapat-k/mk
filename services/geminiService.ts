import { GoogleGenAI, Content, Part } from "@google/genai";
import { AppSettings, Message } from '../types';

export const generateResponse = async (
  input: string,
  history: Message[],
  settings: AppSettings
): Promise<string> => {
  if (!settings.geminiApiKey) {
    throw new Error("API Key is missing. Please set it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });

  // Convert internal Message format to Gemini Content format
  // Filter out system messages if any, handled via config
  const historyContents: Content[] = history
    .filter(h => h.role !== 'system')
    .map(h => ({
      role: h.role,
      parts: [{ text: h.content } as Part]
    }));

  const chat = ai.chats.create({
    model: settings.modelName || 'gemini-2.5-flash',
    history: historyContents,
    config: {
      systemInstruction: settings.systemInstruction,
    },
  });

  try {
    const result = await chat.sendMessage({ message: input });
    return result.text || "No response generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I encountered an error processing your request.";
  }
};