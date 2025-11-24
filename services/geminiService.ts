
import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private currentModelId: string = "gemini-2.5-flash";

  constructor() {
    // The key is obtained from the environment variable.
    // In a real packaged app, you might handle this differently or ensure the env is injected.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  isConfigured(): boolean {
    return !!process.env.API_KEY;
  }

  private getClient(): GoogleGenAI {
    return this.ai;
  }

  async startChat(modelId: string, systemInstruction?: string, bookContext?: string) {
    const client = this.getClient();
    this.currentModelId = modelId;
    
    let instruction = systemInstruction || "You are an intelligent literary assistant called Lumina. You help users understand books, analyze themes, and translate text. Be concise, helpful, and polite.";

    // Logic: If book context is provided, we inject it into the system instruction.
    if (bookContext) {
        instruction += `\n\n=== ATTACHED BOOK CONTENT ===\nThe user is currently reading the following book. Use this text as the primary source of truth for your answers. Quote specific passages where relevant. If the user asks about the plot, characters, or themes, use this full text to provide accurate, deep analysis.\n\n${bookContext}\n\n=== END OF BOOK CONTENT ===`;
    }

    this.chatSession = client.chats.create({
      model: modelId,
      config: {
        systemInstruction: instruction,
      },
    });
  }

  async sendMessageStream(message: string, context?: string, bookFullText?: string, modelId: string = "gemini-2.5-flash"): Promise<AsyncIterable<GenerateContentResponse>> {
    // If model changed or session doesn't exist, restart chat
    if (!this.chatSession || this.currentModelId !== modelId) {
      await this.startChat(modelId, undefined, bookFullText);
    }
    
    let fullMessage = message;
    
    // If there is a specific selection (highlight), we prioritize that in the immediate prompt
    if (context) {
      fullMessage = `User Highlighted Selection:\n"""${context}"""\n\nQuestion about selection: ${message}`;
    }

    if (!this.chatSession) {
        // Fallback initialization if something went wrong
        await this.startChat(modelId, undefined, bookFullText);
        if (!this.chatSession) throw new Error("Failed to initialize chat session");
    }

    try {
        return await this.chatSession.sendMessageStream({ message: fullMessage });
    } catch (e) {
        // If the session fails (e.g. token limit or expiration), try restarting with context
        console.warn("Session error, restarting chat...", e);
        await this.startChat(modelId, undefined, bookFullText);
        // We can't retry the stream easily here without recursion, but throwing allows the UI to handle it
        throw e;
    }
  }

  async analyzeSelection(modelId: string, selection: string, promptType: 'explain' | 'summarize' | 'translate'): Promise<string> {
    const client = this.getClient();
    
    let prompt = "";
    switch (promptType) {
      case 'explain':
        prompt = `Explain the following text in the context of general knowledge or literature:\n"${selection}"`;
        break;
      case 'summarize':
        prompt = `Summarize the following text concisely:\n"${selection}"`;
        break;
      case 'translate':
        prompt = `Translate the following text to English (if it's not) or to a modern, easy-to-read style:\n"${selection}"`;
        break;
    }

    const response = await client.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    
    return response.text || "No response generated.";
  }
}

export const geminiService = new GeminiService();