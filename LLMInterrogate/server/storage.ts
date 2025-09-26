import { randomUUID } from "crypto";

export interface IStorage {
  // Conversations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationByName(name: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;
  getAllConversations(): Promise<Conversation[]>;
  getLastConversation(): Promise<Conversation | undefined>;
  setLastConversation(id: string): Promise<void>;
  
  // System Prompts (role-based)
  getSystemPrompt(role: 'interrogator' | 'subject'): Promise<SystemPrompt | undefined>;
  createOrUpdateSystemPrompt(prompt: InsertSystemPrompt): Promise<SystemPrompt>;
  getAllSystemPrompts(): Promise<SystemPrompt[]>;
  
  // Messages
  addMessageToConversation(conversationId: string, message: Omit<Message, 'index'>): Promise<Conversation | undefined>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;
  private systemPrompts: Map<string, SystemPrompt>;
  private lastConversationId: string | null;

  constructor() {
    this.conversations = new Map();
    this.systemPrompts = new Map();
    this.lastConversationId = null;
    
  }



  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationByName(name: string): Promise<Conversation | undefined> {
    return Array.from(this.conversations.values()).find(conv => conv.name === name);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      history: insertConversation.history || [],
      createdAt: new Date(),
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const existing = this.conversations.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.conversations.set(id, updated);
    return updated;
  }

  async deleteConversation(id: string): Promise<boolean> {
    const deleted = this.conversations.delete(id);
    if (this.lastConversationId === id) {
      this.lastConversationId = null;
    }
    return deleted;
  }

  async getAllConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  async getLastConversation(): Promise<Conversation | undefined> {
    if (!this.lastConversationId) return undefined;
    return this.conversations.get(this.lastConversationId);
  }

  async setLastConversation(id: string): Promise<void> {
    this.lastConversationId = id;
  }

  async getSystemPrompt(role: 'interrogator' | 'subject'): Promise<SystemPrompt | undefined> {
    return this.systemPrompts.get(role);
  }

  async createOrUpdateSystemPrompt(insertPrompt: InsertSystemPrompt): Promise<SystemPrompt> {
    const existing = this.systemPrompts.get(insertPrompt.role);
    const prompt: SystemPrompt = {
      id: existing?.id || randomUUID(),
      ...insertPrompt,
      updatedAt: new Date(),
    };
    this.systemPrompts.set(insertPrompt.role, prompt);
    return prompt;
  }

  async getAllSystemPrompts(): Promise<SystemPrompt[]> {
    return Array.from(this.systemPrompts.values());
  }

  async addMessageToConversation(conversationId: string, message: Omit<Message, 'index'>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return undefined;

    const newMessage: Message = {
      ...message,
      index: conversation.history?.length || 0,
    };

    const updatedHistory = [...(conversation.history || []), newMessage];
    const updated = { ...conversation, history: updatedHistory };
    this.conversations.set(conversationId, updated);
    return updated;
  }
}

// import { DatabaseStorage } from './db-storage';

export const storage = new MemStorage();
