import { useConversation } from "@/contexts/ConversationContext";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { useEffect, useRef } from "react";

export default function ConversationDisplay() {
  const { conversation, isGenerating } = useConversation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.history]);

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">No conversation loaded</p>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="flex-1 overflow-y-auto conversation-scroll mb-6 space-y-4"
      data-testid="conversation-display"
    >
      {(conversation.history || []).map((message: any, index: number) => (
        <div key={index} className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="font-mono" data-testid={`text-model-${index}`}>
              {message.model}
            </span>
            <span>•</span>
            <span data-testid={`text-timestamp-${index}`}>
              {new Date(message.timestamp).toLocaleString()}
            </span>
            <span 
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                message.role === 'interrogator' 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-secondary text-secondary-foreground'
              }`}
              data-testid={`badge-role-${index}`}
            >
              {message.role === 'interrogator' ? 'Interrogator' : 'Subject'}
            </span>
          </div>
          
          <div 
            className={`bg-card border border-border rounded-lg p-4 message-content ${
              message.role === 'subject' ? 'ml-8' : ''
            }`}
            data-testid={`message-content-${index}`}
          >
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-auto p-0 text-xs text-muted-foreground hover:text-accent"
              data-testid={`button-edit-${index}`}
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
        </div>
      ))}
      
      {/* Loading State */}
      {isGenerating && (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="font-mono">Generating...</span>
            <span>•</span>
            <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs font-medium">
              {(conversation.history?.length || 0) % 2 === 0 ? 'Interrogator' : 'Subject'}
            </span>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 message-content ml-8">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
              <span className="text-muted-foreground">Thinking...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
