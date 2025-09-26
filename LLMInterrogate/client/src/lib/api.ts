import { apiRequest } from "./queryClient";

export const api = {
  async initialize(): Promise<InitResponse> {
    const response = await apiRequest("GET", "/api/init");
    return response.json();
  },

  async sendMessage(request: ChatRequest) {
    const response = await apiRequest("POST", "/api/chat", request);
    return response.json();
  },

  async getSystemPrompt(role: 'interrogator' | 'subject'): Promise<SystemPrompt> {
    const response = await apiRequest("GET", `/api/system-prompt/${role}`);
    return response.json();
  },

  async updateSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt> {
    const response = await apiRequest("POST", "/api/system-prompt", prompt);
    return response.json();
  },

  async getStatus() {
    const response = await apiRequest("GET", "/api/status");
    return response.json();
  },

  async getConversations() {
    const response = await apiRequest("GET", "/api/conversations");
    return response.json();
  },

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const response = await apiRequest(
      "POST",
      "/api/conversations",
      conversation
    );
    return response.json();
  },

  async updateConversation(id: string, updates: Partial<Conversation>) {
    const response = await apiRequest(
      "PUT",
      `/api/conversations/${id}`,
      updates
    );
    return response.json();
  },

  async deleteConversation(id: string) {
    const response = await apiRequest("DELETE", `/api/conversations/${id}`);
    return response.json();
  },
};
