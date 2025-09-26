import { useState } from "react";
import { useConversation } from "@/contexts/ConversationContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, MessageSquare, Calendar, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConversationSidebar() {
  const { 
    conversations, 
    conversation, 
    switchConversation, 
    createNewConversation,
    deleteConversation,
    availableModels,
    isLoading 
  } = useConversation();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newConversationName, setNewConversationName] = useState("");
  const [selectedInterrogator, setSelectedInterrogator] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateConversation = async () => {
    if (!newConversationName.trim() || !selectedInterrogator || !selectedSubject) {
      return;
    }

    try {
      setIsCreating(true);
      await createNewConversation(newConversationName, selectedInterrogator, selectedSubject);
      
      // Reset form
      setNewConversationName("");
      setSelectedInterrogator("");
      setSelectedSubject("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString();
  };

  const getMessageCount = (conv: any) => {
    return conv.history?.length || 0;
  };

  return (
    <div className="w-80 bg-card border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Conversation Name</label>
                  <Input
                    value={newConversationName}
                    onChange={(e) => setNewConversationName(e.target.value)}
                    placeholder="Enter conversation name..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Interrogator Model</label>
                  <Select value={selectedInterrogator} onValueChange={setSelectedInterrogator}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select interrogator model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject Model</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
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
                </div>
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateConversation}
                    disabled={!newConversationName.trim() || !selectedInterrogator || !selectedSubject || isCreating}
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-accent/20 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {conversations.map((conv) => (
                <div key={conv.id} className="relative group">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full p-3 h-auto flex flex-col items-start text-left space-y-2",
                      conversation?.id === conv.id && "bg-accent border-l-2 border-primary"
                    )}
                    onClick={() => switchConversation(conv.id)}
                  >
                    <div className="flex items-center w-full">
                      <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="font-medium truncate flex-1">{conv.name}</span>
                    </div>
                    <div className="w-full text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(conv.createdAt)}
                      </div>
                      <div className="flex justify-between">
                        <span>{getMessageCount(conv)} messages</span>
                        <span className="text-xs bg-secondary px-1 py-0.5 rounded">
                          {conv.interrogator.split(":")[0]} ↔ {conv.subject.split(":")[0]}
                        </span>
                      </div>
                    </div>
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{conv.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteConversation(conv.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
              
              {conversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs">Create your first conversation to get started</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}