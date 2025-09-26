import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  name: text("name").notNull(),
  interrogator: text("interrogator").notNull(),
  subject: text("subject").notNull(),
  history: text("history").notNull().default("[]"), // JSON string
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const systemPrompts = sqliteTable("system_prompts", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  role: text("role").notNull().unique(), // 'interrogator' or 'subject'
  content: text("content").notNull(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const appSettings = sqliteTable("app_settings", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertSystemPromptSchema = createInsertSchema(systemPrompts).omit({
  id: true,
  updatedAt: true,
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({
  id: true,
  updatedAt: true,
});
