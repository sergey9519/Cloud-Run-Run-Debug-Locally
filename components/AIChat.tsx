import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface AIChatProps {
  onCallAction?: (action: string, params: any) => Promise<any>;
  freelancers?: any[];
  projects?: any[];
  assignments?: any[];
  customTitle?: string;
  customSystemInstruction?: string;
  customTools?: any[];
}

const AIChat: React.FC<AIChatProps> = ({ onCallAction, customTitle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      parts: [{ text: 'Hello! I\'m your AI assistant for Studio Roster. How can I help you manage your projects and freelancers today?' }]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      parts: [{ text: input }]
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simple stub response for now
      setTimeout(() => {
        const response: ChatMessage = {
          role: 'model',
          parts: [{ text: `I understand you want help with: "${input}". This is a stub implementation - the full AI functionality will be implemented later.` }]
        };
        setMessages(prev => [...prev, response]);
        setIsLoading(false);
      }, 1000);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: "I'm having trouble connecting right now." }] 
      }]);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-4 border-b border-border-subtle bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-ink-primary">{customTitle || "AI Assistant"}</h3>
            <p className="text-xs text-ink-secondary">Ready to help</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-2' : ''}`}>
              <div className={`p-4 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-primary text-white ml-auto' 
                  : 'bg-subtle text-ink-primary'
              }`}>
                <p className="text-sm leading-relaxed">{msg.parts[0].text}</p>
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-ink-primary flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-subtle p-4 rounded-2xl">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-ink-tertiary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-ink-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-ink-tertiary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-border-subtle">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your projects, freelancers, or assignments..."
            className="flex-1 p-3 border border-border-subtle rounded-xl resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
