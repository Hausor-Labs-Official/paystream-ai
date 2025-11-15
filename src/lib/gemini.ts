import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiClient {
  private static instance: GeminiClient;
  private genAI: GoogleGenerativeAI;
  private model: any;

  private constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  public static getInstance(): GeminiClient {
    if (!GeminiClient.instance) {
      GeminiClient.instance = new GeminiClient();
    }
    return GeminiClient.instance;
  }

  public async generate(prompt: string, retries = 3): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) {
          throw new Error('Empty response from Gemini');
        }

        return text;
      } catch (error) {
        lastError = error as Error;
        console.error(`Gemini API attempt ${attempt}/${retries} failed:`, error);

        if (attempt < retries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Gemini API failed after ${retries} attempts: ${lastError?.message}`);
  }
}

// Export singleton instance method
export const generate = async (prompt: string): Promise<string> => {
  const client = GeminiClient.getInstance();
  return client.generate(prompt);
};

export default GeminiClient;
