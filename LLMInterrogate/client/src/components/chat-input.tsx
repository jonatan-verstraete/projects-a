import { useState } from "react";
import { useConversation } from "@/contexts/ConversationContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, RotateCcw } from "lucide-react";

export default function ChatInput() {
  const { 
    conversation, 
    sendMessage, 
    clearConversation, 
    isGenerating, 
    autoMode 
  } = useConversation();
  
  const [inputMessage, setInputMessage] = useState("");

  const handleSend = async () => {
    if (!conversation || isGenerating) return;
    
    await sendMessage(inputMessage.trim() || undefined);
    setInputMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const getNextModel = () => {
    if (!conversation) return "";
    
    const messageCount = conversation.history.length;
    const isInterrogatorTurn = messageCount % 2 === 0;
    
    return isInterrogatorTurn 
      ? `Interrogator (${conversation.interrogator})`
      : `Subject (${conversation.subject})`;
  };

  const getStatus = () => {
    if (isGenerating) return "Generating...";
    if (!conversation) return "No conversation";
    return "Ready";
  };

  return (
    <div className="border-t border-border pt-6">
      <div className="flex flex-col space-y-3">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span>Next question from</span>
          <span 
            className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-medium"
            data-testid="text-next-model"
          >
            {getNextModel()}
          </span>
        </div>
        
        <div className="flex space-x-3">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            className="flex-1 min-h-[100px] bg-input border-border focus:ring-accent focus:border-transparent resize-none"
            placeholder={autoMode 
              ? "Auto mode enabled - questions will be generated automatically..." 
              : "Enter your question or let the interrogator generate the next question automatically..."
            }
            disabled={isGenerating || autoMode}
            data-testid="textarea-input"
          />
          
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleSend}
              disabled={isGenerating || !conversation}
              className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-send"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
            
            <Button
              onClick={clearConversation}
              variant="secondary"
              size="sm"
              disabled={isGenerating}
              data-testid="button-clear"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span data-testid="text-conversation-name">
              Conversation: "{conversation?.name || 'None'}"
            </span>
            <span data-testid="text-message-count">
              {conversation?.history.length || 0} messages
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span>Status:</span>
            <span 
              className={`${isGenerating ? 'text-amber-400' : 'text-green-400'}`}
              data-testid="text-status"
            >
              {getStatus()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
