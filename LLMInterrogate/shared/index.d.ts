import { z } from "zod";

import {
  conversations,
  systemPrompts,
  appSettings,
  insertConversationSchema,
  insertSystemPromptSchema,
  insertAppSettingSchema,
} from "./schema";

declare global {
  type Message = {
    index: number;
    model: string;
    content: string;
    timestamp: string;
    role: "interrogator" | "subject";
  };

  // Database representation (as stored)
  type ConversationRow = typeof conversations.$inferSelect;
  
  // Application representation (with parsed history)
  type Conversation = Omit<ConversationRow, 'history'> & {
    history: Message[];
  };
  
  // For creating conversations - history should be Message[]
  type InsertConversation = Omit<z.infer<typeof insertConversationSchema>, 'history'> & {
    history?: Message[];
  };
  type SystemPrompt = typeof systemPrompts.$inferSelect;
  type InsertSystemPrompt = z.infer<typeof insertSystemPromptSchema>;
  type AppSetting = typeof appSettings.$inferSelect;
  type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

  type Database = {
    conversations: Record<string, Conversation>;
    lastConversation: string | null;
    systemPrompts: Record<string, SystemPrompt>;
  };

  type ChatRequest = {
    conversationId: string;
    modelName: string;
    message?: string;
  };

  type InitResponse = {
    conversation: Conversation | null;
    systemPrompts: Record<string, SystemPrompt>;
    availableModels: string[];
  };

  interface OllamaRequest {
    model: string;
    prompt: string;
    system?: string;
    stream?: boolean;
  }

  interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
  }

  interface OllamaResponse {
    response: string;
    done: boolean;
    model: string;
  }



// {
//     "message": {
//         "model": "open-orca-platypus2:latest",
//         "content": "Great! Could you clarify what you’d like to test? Are you looking to probe a specific concept, evaluate a logical argument, or explore a hypothetical scenario? Knowing the context will help me ask a targeted, probing question to get at the core of what you’re interested in.",
//         "timestamp": "2025-09-25T16:19:09.010Z",
//         "role": "interrogator"
//     },
//     "conversation": {
//         "name": "Consciousness Exploration",
//         "interrogator": "open-orca-platypus2:latest",
//         "subject": "qwen3:4b-thinking-2507-fp16",
//         "history": [
//             {
//                 "model": "open-orca-platypus2:latest",
//                 "content": "Great! Could you clarify what you’d like to test? Are you looking to probe a specific concept, evaluate a logical argument, or explore a hypothetical scenario? Knowing the context will help me ask a targeted, probing question to get at the core of what you’re interested in.",
//                 "timestamp": "2025-09-25T16:19:09.010Z",
//                 "role": "interrogator",
//                 "index": 0
//             }
//         ],
//         "id": "f60e6d3f-d3d8-43cc-8578-5c095a56fb9d",
//         "createdAt": "2025-09-25T16:18:25.693Z"
//     }
// }
}

export {};
