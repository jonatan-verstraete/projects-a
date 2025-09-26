import { useConversation } from "@/contexts/ConversationContext";
import { useQuery } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useEffect } from "react";

export default function AppHeader() {
  const { toggleMenu, autoMode, setAutoMode, isGenerating } = useConversation();

  const { data: status } = useQuery<{ ollamaConnected: boolean } | null>({
    queryKey: ["/api/status"],
    // refetchInterval: 30000, // Check every 30 seconds
    staleTime: Infinity,
  });

  useEffect(() => {
    return () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/status"],
      });
    };
  }, []);

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-custom sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-foreground">
            Interrogator & Subject
          </h1>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  status?.ollamaConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span>
                {status?.ollamaConnected
                  ? "Ollama Connected"
                  : "Ollama Disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Auto Mode Toggle */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {autoMode && isGenerating && (
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
              <label className="text-sm text-muted-foreground">
                Auto Mode {autoMode && isGenerating && "(Running)"}
              </label>
            </div>
            <Switch
              checked={autoMode}
              onCheckedChange={setAutoMode}
              data-testid="toggle-auto-mode"
            />
          </div>

          {/* Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMenu}
            data-testid="button-menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
