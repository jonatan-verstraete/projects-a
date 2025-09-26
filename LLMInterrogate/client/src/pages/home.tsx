import { useEffect } from "react";
import AppHeader from "@/components/app-header";
import ConversationDisplay from "@/components/conversation-display";
import ChatInput from "@/components/chat-input";
import SystemPromptMenu from "@/components/system-prompt-menu";
import ConversationSidebar from "@/components/conversation-sidebar";
import { useConversation } from "@/contexts/ConversationContext";

export default function Home() {
  const { 
    conversation, 
    isLoading, 
    error,
    initializeApp,
  } = useConversation();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading application</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <ConversationSidebar />
      <div className="flex-1 flex flex-col">
        <AppHeader />
        <SystemPromptMenu />
        <main className="flex-1 px-4 py-6 flex flex-col">
          <ConversationDisplay />
          <ChatInput />
        </main>
      </div>
    </div>
  );
}
