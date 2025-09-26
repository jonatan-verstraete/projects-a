import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ConversationContextType {
  // State
  isMenuOpen: boolean;
  autoMode: boolean;
  conversation: Conversation | null;
  conversations: Conversation[];
  systemPrompts: Record<string, SystemPrompt>;
  availableModels: string[];
  isGenerating: boolean;
  isLoading: boolean;
  error: Error | null;
  isUpdatingPrompts: boolean;

  // Actions
  toggleMenu: () => void;
  setAutoMode: (enabled: boolean) => void;
  sendMessage: (message?: string) => Promise<void>;
  updateSystemPrompts: (prompts?: Record<string, SystemPrompt>) => Promise<void> | void;
  updateConversationModels: (models: { interrogator?: string; subject?: string }) => Promise<void>;
  clearConversation: () => Promise<void>;
  switchConversation: (conversationId: string) => Promise<void>;
  createNewConversation: (name: string, interrogator: string, subject: string) => Promise<Conversation>;
  deleteConversation: (conversationId: string) => Promise<void>;
  initializeApp: () => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [autoMode, setAutoMode] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [systemPrompts, setSystemPrompts] = useState<Record<string, SystemPrompt>>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { toast } = useToast();
  const autoModeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const initializeApp = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load initial data and all conversations
      const [initResponse, conversationsResponse] = await Promise.all([
        api.initialize(),
        api.getConversations(),
      ]);

      setConversation(initResponse.conversation);
      setSystemPrompts(initResponse.systemPrompts);
      setAvailableModels(initResponse.availableModels);
      setConversations(conversationsResponse);
      setIsLoading(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error("Failed to initialize");
      setError(errorMessage);
      setIsLoading(false);
      toast({
        title: "Initialization Failed",
        description: "Failed to initialize the application",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Auto mode effect - triggers when autoMode is enabled and conversation updates
  useEffect(() => {
    if (!autoMode || !conversation || isGenerating) return;

    const runAutoMode = async () => {
      try {
        setIsGenerating(true);
        
        const messageCount = conversation.history?.length || 0;
        const isInterrogatorTurn = messageCount % 2 === 0;
        const modelName = isInterrogatorTurn ? conversation.interrogator : conversation.subject;

        const request: ChatRequest = {
          conversationId: conversation.id,
          modelName,
        };

        const response = await api.sendMessage(request);
        const updatedConversation = response.conversation as Conversation;
        
        setConversation(updatedConversation);
        setConversations(prev => prev.map(conv => 
          conv.id === updatedConversation.id ? updatedConversation : conv
        ));
        
        setIsGenerating(false);
      } catch (error) {
        setIsGenerating(false);
        setAutoMode(false); // Stop auto mode on error
        toast({
          title: "Auto Mode Failed",
          description: error instanceof Error ? error.message : "An error occurred in auto mode",
          variant: "destructive",
        });
      }
    };

    // Delay before running auto mode to allow UI updates
    autoModeTimeoutRef.current = setTimeout(() => {
      runAutoMode();
    }, 1500);

    return () => {
      if (autoModeTimeoutRef.current) {
        clearTimeout(autoModeTimeoutRef.current);
      }
    };
  }, [autoMode, conversation?.history?.length, isGenerating, toast]);

  // Start/stop auto mode
  const toggleAutoMode = useCallback((enabled: boolean) => {
    setAutoMode(enabled);
    
    if (!enabled) {
      // Stop auto mode and clear timeout
      if (autoModeTimeoutRef.current) {
        clearTimeout(autoModeTimeoutRef.current);
        autoModeTimeoutRef.current = null;
      }
    }
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (autoModeTimeoutRef.current) {
        clearTimeout(autoModeTimeoutRef.current);
      }
    };
  }, []);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message?: string) => {
      if (!conversation) throw new Error("No active conversation");

      const messageCount = conversation.history?.length || 0;
      const isInterrogatorTurn = messageCount % 2 === 0;
      const modelName = isInterrogatorTurn ? conversation.interrogator : conversation.subject;

      const request: ChatRequest = {
        conversationId: conversation.id,
        modelName,
        message,
      };

      const response = await api.sendMessage(request);
      return response;
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (data) => {
      const updatedConversation = data.conversation as Conversation;
      setConversation(updatedConversation);

      // Update the conversations list with the updated conversation
      setConversations(prev =>
        prev.map(conv =>
          conv.id === updatedConversation.id ? updatedConversation : conv
        )
      );

      setIsGenerating(false);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: "Message Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update system prompts mutation
  const updatePromptsMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(systemPrompts).map(([role, prompt]) =>
        api.updateSystemPrompt({ role: role as 'interrogator' | 'subject', content: prompt.content })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      toast({
        title: "Prompts Updated",
        description: "System prompts have been saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const sendMessage = useCallback(async (message?: string) => {
    // Stop auto mode when manually sending a message
    if (autoMode) {
      setAutoMode(false);
      if (autoModeTimeoutRef.current) {
        clearTimeout(autoModeTimeoutRef.current);
        autoModeTimeoutRef.current = null;
      }
    }
    await sendMessageMutation.mutateAsync(message);
  }, [sendMessageMutation, autoMode]);

  const updateSystemPrompts = useCallback((prompts?: Record<string, SystemPrompt>) => {
    if (prompts) {
      setSystemPrompts(prev => ({ ...prev, ...prompts }));
    } else {
      return updatePromptsMutation.mutateAsync();
    }
  }, [updatePromptsMutation]);

  const updateConversationModels = useCallback(async (models: { interrogator?: string; subject?: string }) => {
    if (!conversation) return;

    try {
      const updatedConversation = await api.updateConversation(conversation.id, models);
      setConversation(updatedConversation);

      // Update the conversations list
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id ? updatedConversation : conv
        )
      );
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update conversation models",
        variant: "destructive",
      });
    }
  }, [conversation, toast]);

  const clearConversation = useCallback(async () => {
    if (!conversation) return;

    try {
      // Stop auto mode when clearing
      if (autoMode) {
        setAutoMode(false);
        if (autoModeTimeoutRef.current) {
          clearTimeout(autoModeTimeoutRef.current);
          autoModeTimeoutRef.current = null;
        }
      }

      const clearedConversation = await api.updateConversation(conversation.id, { history: [] });
      setConversation(clearedConversation);

      // Update the conversations list
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversation.id ? clearedConversation : conv
        )
      );

      toast({
        title: "Conversation Cleared",
        description: "The conversation has been cleared",
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: error instanceof Error ? error.message : "Failed to clear the conversation",
        variant: "destructive",
      });
    }
  }, [conversation, toast, autoMode]);

  const switchConversation = useCallback(async (conversationId: string) => {
    try {
      // Stop auto mode when switching conversations
      if (autoMode) {
        setAutoMode(false);
        if (autoModeTimeoutRef.current) {
          clearTimeout(autoModeTimeoutRef.current);
          autoModeTimeoutRef.current = null;
        }
      }

      const selectedConversation = conversations.find(conv => conv.id === conversationId);
      if (selectedConversation) {
        setConversation(selectedConversation);
      }
    } catch (error) {
      toast({
        title: "Switch Failed",
        description: error instanceof Error ? error.message : "Failed to switch conversation",
        variant: "destructive",
      });
    }
  }, [conversations, toast, autoMode]);

  const createNewConversation = useCallback(async (name: string, interrogator: string, subject: string) => {
    try {
      const newConversation = await api.createConversation({
        name,
        interrogator,
        subject,
        history: [],
      });

      setConversations(prev => [...prev, newConversation]);
      setConversation(newConversation);

      toast({
        title: "Conversation Created",
        description: `New conversation "${name}" created successfully`,
      });

      return newConversation;
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create conversation",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      await api.deleteConversation(conversationId);
      
      // Remove from conversations list
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If we're deleting the current conversation, switch to another one or clear
      if (conversation?.id === conversationId) {
        const remaining = conversations.filter(conv => conv.id !== conversationId);
        if (remaining.length > 0) {
          setConversation(remaining[0]);
        } else {
          setConversation(null);
        }
      }

      toast({
        title: "Conversation Deleted",
        description: "The conversation has been deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete conversation",
        variant: "destructive",
      });
    }
  }, [conversation, conversations, toast]);

  const value: ConversationContextType = {
    // State
    isMenuOpen,
    autoMode,
    conversation,
    conversations,
    systemPrompts,
    availableModels,
    isGenerating,
    isLoading,
    error,
    isUpdatingPrompts: updatePromptsMutation.isPending,

    // Actions
    toggleMenu,
    setAutoMode: toggleAutoMode,
    sendMessage,
    updateSystemPrompts,
    updateConversationModels,
    clearConversation,
    switchConversation,
    createNewConversation,
    deleteConversation,
    initializeApp,
  };

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
}