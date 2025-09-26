export class OllamaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
  }

  async generateResponse(
    model: string,
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const request: OllamaRequest = {
        model,
        prompt,
        system: systemPrompt,
        stream: false,
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`
        );
      }

      const data: OllamaResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error("Error generating response from Ollama:", error);
      throw new Error(
        `Failed to generate response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json()
      return data.models?.map((model: OllamaModel) => model.name) || [];
    } catch (error) {
      console.error("Error fetching available models:", error);
      return [
        "open-orca-platypus2:latest",
        "qwen3:4b-thinking-2507-fp16",
      ]; // Fallback models
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const ollamaService = new OllamaService();
