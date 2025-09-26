import { useConversation } from "@/contexts/ConversationContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export default function SystemPromptMenu() {
  const { 
    isMenuOpen, 
    toggleMenu, 
    systemPrompts,
    updateSystemPrompts,
    conversation,
    updateConversationModels,
    availableModels,
    isUpdatingPrompts,
  } = useConversation();

  console.log({availableModels})

  console.log('SystemPromptMenu render, isMenuOpen:', isMenuOpen);

  if (!isMenuOpen) return null;

  const interrogatorPrompt = systemPrompts["interrogator"] || { content: "" };
  const subjectPrompt = systemPrompts["subject"] || { content: "" };

  const handleSave = async () => {
    await updateSystemPrompts();
    toggleMenu();
  };

  return (
    <div className="fixed inset-0 z-50" data-testid="system-prompt-menu">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-custom" onClick={toggleMenu} />
      <div className="absolute top-16 right-4 w-96 bg-popover border border-border rounded-lg shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">System Prompts</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              data-testid="button-close-menu"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Interrogator System Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Interrogator Model
            </label>
            <Select
              value={conversation?.interrogator || ""}
              onValueChange={(value) => updateConversationModels({ interrogator: value })}
              data-testid="select-interrogator-model"
            >
              <SelectTrigger className="w-full bg-input border-border">
                <SelectValue placeholder="Select interrogator model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model: string) => (
                  <SelectItem key={'a'+model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={interrogatorPrompt.content}
              onChange={(e) => {
                updateSystemPrompts({
                  "interrogator": {
                    ...interrogatorPrompt,
                    content: e.target.value,
                  }
                });
              }}
              className="w-full mt-2 bg-input border-border focus:ring-accent resize-none"
              rows={4}
              placeholder="Enter system prompt for interrogator role..."
              data-testid="textarea-interrogator-prompt"
            />
          </div>
          
          {/* Subject System Prompt */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Subject Model
            </label>
            <Select
              value={conversation?.subject || ""}
              onValueChange={(value) => updateConversationModels({ subject: value })}
              data-testid="select-subject-model"
            >
              <SelectTrigger className="w-full bg-input border-border">
                <SelectValue placeholder="Select subject model" />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={subjectPrompt.content}
              onChange={(e) => {
                updateSystemPrompts({
                  "subject": {
                    ...subjectPrompt,
                    content: e.target.value,
                  }
                });
              }}
              className="w-full mt-2 bg-input border-border focus:ring-accent resize-none"
              rows={4}
              placeholder="Enter system prompt for subject role..."
              data-testid="textarea-subject-prompt"
            />
          </div>
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isUpdatingPrompts}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-save-prompts"
          >
            {isUpdatingPrompts ? "Saving..." : "Save System Prompts"}
          </Button>
        </div>
      </div>
    </div>
  );
}
