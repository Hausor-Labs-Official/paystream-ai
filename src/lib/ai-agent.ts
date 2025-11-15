import { generate } from './gemini';

export class AIAgent {
  private systemPrompt: string;

  constructor(systemPrompt: string) {
    this.systemPrompt = systemPrompt;
  }

  public async run(input: string): Promise<string> {
    const fullPrompt = `${this.systemPrompt}\n\n${input}`;

    try {
      const response = await generate(fullPrompt);
      return response.trim();
    } catch (error) {
      console.error('AIAgent error:', error);
      throw new Error(`AI Agent failed: ${(error as Error).message}`);
    }
  }

  public async runWithContext(input: string, context: Record<string, any>): Promise<string> {
    const contextString = Object.entries(context)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    const fullPrompt = `${this.systemPrompt}\n\nContext:\n${contextString}\n\nInput: ${input}`;

    try {
      const response = await generate(fullPrompt);
      return response.trim();
    } catch (error) {
      console.error('AIAgent error:', error);
      throw new Error(`AI Agent failed: ${(error as Error).message}`);
    }
  }
}

export default AIAgent;
