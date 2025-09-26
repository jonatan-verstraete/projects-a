import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ollamaService } from "./services/ollama";
import { z } from "zod";
import { insertSystemPromptSchema } from "@shared/schema";

const chatRequestSchema = z.object({
  conversationId: z.string(),
  modelName: z.string(),
  message: z.string().optional(),
});


const removeThoughtsFromContent = (res: string)=>{
  for(const tag of ['think', 'reason']){
    const open = `<${tag}>`
    const close = `</${tag}>`
    if(res.startsWith(open)){
      return res.slice(res.indexOf(close) + close.length)
    }
  }
  return res
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize endpoint - returns active conversation and system prompts
  app.get("/api/init", async (req, res) => {
    try {
      const conversation = await storage.getLastConversation() ?? null
      const allSystemPrompts = await storage.getAllSystemPrompts();
      const availableModels = await ollamaService.getAvailableModels();
      
      const systemPromptsMap = allSystemPrompts.reduce((acc, prompt) => {
        acc[prompt.role] = prompt;
        return acc;
      }, {} as Record<string, any>);

      const response: InitResponse = {
        conversation,
        systemPrompts: systemPromptsMap,
        availableModels,
      };

      res.json(response);
    } catch (error) {
      console.error("Error in /api/init:", error);
      res.status(500).json({ error: "Failed to initialize application" });
    }
  });

  // Chat endpoint - processes conversation and queries Ollama
  app.post("/api/chat", async (req, res) => {
    try {
      const { conversationId, modelName, message } = chatRequestSchema.parse(req.body);
      
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      let promptToSend = message || "";
      
      // If no message provided, we need to determine the next response automatically
      if (!message) {
        const history = conversation.history || [];
        if (history.length === 0) {
          promptToSend = "Start the conversation with a thoughtful, probing question.";
        } else {
          // Build context from conversation history (limit to last 10 messages for better performance)
          const recentHistory = history.slice(-10);
          const context = recentHistory
            .map(msg => `${msg.role === 'interrogator' ? 'Interrogator' : 'Subject'}: ${removeThoughtsFromContent(msg.content)}`)
            .join('\n\n');
          
          if (modelName === conversation.interrogator) {
            promptToSend = `Based on this conversation:\n\n${context}\n\nAsk a follow-up question that probes deeper or explores a new angle.`;
          } else {
            const lastMessage = history[history.length - 1];
            promptToSend = lastMessage ? removeThoughtsFromContent(lastMessage.content) : "";
          }
        }
      }

      // Determine role and get system prompt
      const role: 'interrogator' | 'subject' = modelName === conversation.interrogator ? 'interrogator' : 'subject';
      const systemPrompt = await storage.getSystemPrompt(role);
      
      // Generate response using Ollama
      const response = await ollamaService.generateResponse(
        modelName,
        promptToSend,
        systemPrompt?.content
      );

      // Add message to conversation (apply thought removal to the response)
      const newMessage: Omit<Message, 'index'> = {
        model: modelName,
        content: removeThoughtsFromContent(response),
        timestamp: new Date().toISOString(),
        role,
      };

      const updatedConversation = await storage.addMessageToConversation(conversationId, newMessage);
      
      if (!updatedConversation) {
        return res.status(500).json({ error: "Failed to update conversation" });
      }

      // Set as last conversation
      await storage.setLastConversation(conversationId);

      res.json({
        message: newMessage,
        conversation: updatedConversation,
      });
    } catch (error) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ error: "Failed to process chat request" });
    }
  });

  // Get system prompt for specific role
  app.get("/api/system-prompt/:role", async (req, res) => {
    try {
      const { role } = req.params;
      
      if (role !== 'interrogator' && role !== 'subject') {
        return res.status(400).json({ error: "Role must be 'interrogator' or 'subject'" });
      }
      
      const systemPrompt = await storage.getSystemPrompt(role as 'interrogator' | 'subject');
      
      if (!systemPrompt) {
        return res.status(404).json({ error: "System prompt not found" });
      }

      res.json(systemPrompt);
    } catch (error) {
      console.error("Error getting system prompt:", error);
      res.status(500).json({ error: "Failed to get system prompt" });
    }
  });

  // Update system prompt
  app.post("/api/system-prompt", async (req, res) => {
    try {
      const systemPrompt = insertSystemPromptSchema.parse(req.body);
      const updated = await storage.createOrUpdateSystemPrompt(systemPrompt);
      res.json(updated);
    } catch (error) {
      console.error("Error updating system prompt:", error);
      res.status(500).json({ error: "Failed to update system prompt" });
    }
  });

  // Get all conversations
  app.get("/api/conversations", async (req, res) => {
    try {
      const conversations = await storage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req, res) => {
    try {
      const conversationData = req.body;
      const conversation = await storage.createConversation(conversationData);
      await storage.setLastConversation(conversation.id);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Update conversation
  app.put("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const conversation = await storage.updateConversation(id, updates);
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteConversation(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Check Ollama connection status
  app.get("/api/status", async (req, res) => {
    try {
      const isConnected = await ollamaService.checkConnection();
      const availableModels = isConnected ? await ollamaService.getAvailableModels() : [];
      
      res.json({
        ollamaConnected: isConnected,
        availableModels,
      });
    } catch (error) {
      console.error("Error checking status:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
