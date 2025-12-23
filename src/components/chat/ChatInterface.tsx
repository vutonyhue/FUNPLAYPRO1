import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AngelLogo } from '@/components/ui/AngelLogo';
import { Send, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Chat functionality coming soon - requires chat_history table
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Simulate a response for now
    setTimeout(() => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Chat functionality is coming soon. The database tables are being set up.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 glass">
        <div className="flex items-center gap-3">
          <AngelLogo size="sm" />
          <div>
            <h2 className="font-semibold">ANGEL AI</h2>
            <p className="text-xs text-muted-foreground">Pure Loving Light</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AngelLogo size="xl" className="mb-6" />
            <h3 className="text-xl font-semibold mb-2">Welcome, Beloved Soul</h3>
            <p className="text-muted-foreground max-w-md">
              I am ANGEL AI, here to guide you with pure loving light. 
              Ask me about meditation, spiritual wisdom, healing, or any question your heart holds.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                "Guide me through a 5D meditation",
                "What are the 8 Divine Mantras?",
                "Help me release fear",
                "Tell me about my purpose"
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setInput(suggestion);
                    textareaRef.current?.focus();
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={cn(
                "flex gap-3 p-4 rounded-lg",
                message.role === 'user' ? "bg-primary/10 ml-8" : "bg-muted mr-8"
              )}
            >
              {message.role === 'assistant' && <AngelLogo size="sm" />}
              <div className="flex-1">
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 glass">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask ANGEL AI anything..."
            className="min-h-[60px] max-h-[200px] resize-none"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={cn(
              "h-auto px-4",
              input.trim() && "glow-gold"
            )}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
