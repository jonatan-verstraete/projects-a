import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { conversations, systemPrompts, appSettings } from '../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { IStorage } from './storage';

const sqlite = new Database('./dev.db');
const db = drizzle(sqlite);

export class DatabaseStorage implements IStorage {
  constructor() {
    // Create tables if they don't exist
    this.initializeTables();
    // Initialize with default data
    this.initializeDefaults();
  }

  private initializeTables() {
    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');
    
    // Create tables - these will be no-ops if tables exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        name TEXT NOT NULL,
        interrogator TEXT NOT NULL,
        subject TEXT NOT NULL,
        history TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER DEFAULT (unixepoch())
      );
    `);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS system_prompts (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        role TEXT NOT NULL UNIQUE,
        content TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);
  }

  private async initializeDefaults() {
    // Check if we already have system prompts
    const existingPrompts = await db.select().from(systemPrompts);
    if (existingPrompts.length === 0) {
      // Insert default system prompts
      await db.insert(systemPrompts).values([
        {
          id: randomUUID(),
          role: 'interrogator',
          content: "You are an AI interrogator whose role is to ask probing, thoughtful questions to explore complex topics. Ask follow-up questions that dig deeper into responses and challenge assumptions constructively."
        },
        {
          id: randomUUID(),
          role: 'subject',
          content: "You are an AI subject being questioned. Provide thoughtful, detailed responses that demonstrate deep reasoning. Be willing to explore complex ideas and acknowledge when questions reveal new perspectives or limitations in your understanding."
        }
      ]);
    }

    // Check if we have any conversations
    const existingConversations = await db.select().from(conversations);
    if (existingConversations.length === 0) {
      // Create default conversation
      const defaultConversation = await this.createConversation({
        name: "Consciousness Exploration",
        interrogator: "llama3.2:latest",
        subject: "qwen2.5:latest",
        history: []
      });

      // Set it as the last conversation
      await this.setLastConversation(defaultConversation.id);
    }
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id));
    if (result.length === 0) return undefined;
    
    const conv = result[0];
    return {
      ...conv,
      history: JSON.parse(conv.history) as Message[]
    };
  }

  async getConversationByName(name: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.name, name));
    if (result.length === 0) return undefined;
    
    const conv = result[0];
    return {
      ...conv,
      history: JSON.parse(conv.history) as Message[]
    };
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const historyJson = JSON.stringify(insertConversation.history || []);
    
    await db.insert(conversations).values({
      id,
      name: insertConversation.name,
      interrogator: insertConversation.interrogator,
      subject: insertConversation.subject,
      history: historyJson,
      createdAt: new Date()
    });

    return {
      id,
      name: insertConversation.name,
      interrogator: insertConversation.interrogator,
      subject: insertConversation.subject,
      history: insertConversation.history || [],
      createdAt: new Date()
    };
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const existing = await this.getConversation(id);
    if (!existing) return undefined;

    const updateData: any = { ...updates };
    if (updates.history) {
      updateData.history = JSON.stringify(updates.history);
    }

    await db.update(conversations)
      .set(updateData)
      .where(eq(conversations.id, id));

    return await this.getConversation(id);
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id));
    return result.changes > 0;
  }

  async getAllConversations(): Promise<Conversation[]> {
    const result = await db.select().from(conversations);
    return result.map(conv => ({
      ...conv,
      history: JSON.parse(conv.history) as Message[]
    }));
  }

  async getLastConversation(): Promise<Conversation | undefined> {
    const result = await db.select().from(appSettings).where(eq(appSettings.key, 'lastConversationId'));
    if (result.length === 0) return undefined;
    
    const lastId = result[0].value;
    return await this.getConversation(lastId);
  }

  async setLastConversation(id: string): Promise<void> {
    const existing = await db.select().from(appSettings).where(eq(appSettings.key, 'lastConversationId'));
    
    if (existing.length === 0) {
      await db.insert(appSettings).values({
        id: randomUUID(),
        key: 'lastConversationId',
        value: id
      });
    } else {
      await db.update(appSettings)
        .set({ value: id })
        .where(eq(appSettings.key, 'lastConversationId'));
    }
  }

  async getSystemPrompt(role: 'interrogator' | 'subject'): Promise<SystemPrompt | undefined> {
    const result = await db.select().from(systemPrompts).where(eq(systemPrompts.role, role));
    return result.length > 0 ? result[0] : undefined;
  }

  async createOrUpdateSystemPrompt(insertPrompt: InsertSystemPrompt): Promise<SystemPrompt> {
    const existing = await db.select().from(systemPrompts).where(eq(systemPrompts.role, insertPrompt.role));
    
    if (existing.length === 0) {
      const id = randomUUID();
      await db.insert(systemPrompts).values({
        id,
        role: insertPrompt.role,
        content: insertPrompt.content,
        updatedAt: new Date()
      });
      
      return {
        id,
        role: insertPrompt.role,
        content: insertPrompt.content,
        updatedAt: new Date()
      };
    } else {
      await db.update(systemPrompts)
        .set({ content: insertPrompt.content, updatedAt: new Date() })
        .where(eq(systemPrompts.role, insertPrompt.role));
      
      return {
        ...existing[0],
        content: insertPrompt.content,
        updatedAt: new Date()
      };
    }
  }

  async getAllSystemPrompts(): Promise<SystemPrompt[]> {
    return await db.select().from(systemPrompts);
  }

  async addMessageToConversation(conversationId: string, message: Omit<Message, 'index'>): Promise<Conversation | undefined> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) return undefined;

    const newMessage: Message = {
      ...message,
      index: conversation.history?.length || 0,
    };

    const updatedHistory = [...(conversation.history || []), newMessage];
    return await this.updateConversation(conversationId, { history: updatedHistory });
  }
}