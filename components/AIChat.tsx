
import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Bot, User as UserIcon, Loader2, Globe, BrainCircuit } from 'lucide-react';
import { GoogleGenAI, FunctionDeclaration, Type, Content, Tool } from "@google/genai";
import { Freelancer, Project, Assignment } from '../types';

interface AIChatProps {
    freelancers: Freelancer[];
    projects: Project[];
    assignments: Assignment[];
    onCallAction?: (action: string, params: any) => Promise<any>;
    agentMode?: boolean;
    customTitle?: string;
    customSystemInstruction?: string;
    customTools?: FunctionDeclaration[];
    contextData?: string; 
}

type ChatMode = 'standard' | 'thinking' | 'search';

// Simple Markdown Renderer with Grounding Support
const SimpleMarkdown = ({ text, groundingChunks }: { text: string, groundingChunks?: any[] }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="text-sm leading-relaxed text-gray-700 space-y-2">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
            const content = part.slice(3, -3);
            return (
              <div key={index} className="bg-gray-900 text-gray-100 p-3 rounded-md font-mono text-xs my-2 overflow-x-auto custom-scrollbar">
                <pre>{content}</pre>
              </div>
            );
        }
        return <p key={index} className="whitespace-pre-wrap">{part}</p>;
      })}
      
      {groundingChunks && groundingChunks.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <Globe size={10} /> Sources
              </div>
              <div className="flex flex-wrap gap-2">
                  {groundingChunks.map((chunk, i) => (
                      chunk.web?.uri ? (
                          <a key={i} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="bg-gray-100 hover:bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-[10px] truncate max-w-[200px] block transition-colors border border-gray-200">
                              {chunk.web.title || chunk.web.uri}
                          </a>
                      ) : null
                  ))}
              </div>
          </div>
      )}
    </div>
  );
};

const AIChat: React.FC<AIChatProps> = ({ 
    freelancers, projects, assignments, onCallAction, agentMode, customTitle, customSystemInstruction, customTools, contextData 
}) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState<ChatMode>('standard');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || !process.env.API_KEY) return;
        const userMsg = input;
        setInput('');
        setIsLoading(true);

        // Add user message to UI state
        setMessages(prev => [...prev, { role: 'user', parts: [{ text: userMsg }] }]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Construct system instruction
            let systemInstruction = customSystemInstruction || `You are Studio Roster AI. 
            You have access to:
            - ${freelancers.length} freelancers
            - ${projects.length} projects
            - ${assignments.length} assignments
            
            Current Date: ${new Date().toLocaleDateString()}
            `;
            
            if (contextData) systemInstruction += `\n\nContext Data:\n${contextData}`;

            let tools: Tool[] | undefined;
            let model = 'gemini-3-pro-preview'; // Default for Standard and Thinking
            let config: any = { systemInstruction };

            // Mode Configuration
            if (mode === 'search') {
                model = 'gemini-2.5-flash';
                tools = [{ googleSearch: {} }];
            } else if (mode === 'thinking') {
                model = 'gemini-3-pro-preview';
                config.thinkingConfig = { thinkingBudget: 32768 };
            } else if (customTools || onCallAction) {
                // Standard mode with Function Calling
                const funcs = customTools || (onCallAction ? [
                     {
                         name: 'create_project',
                         description: 'Create a new project',
                         parameters: {
                             type: Type.OBJECT,
                             properties: {
                                 name: { type: Type.STRING },
                                 clientName: { type: Type.STRING }
                             },
                             required: ['name']
                         }
                     },
                     {
                         name: 'create_freelancer',
                         description: 'Add a new freelancer',
                         parameters: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                role: { type: Type.STRING }
                            },
                            required: ['name', 'role']
                         }
                     },
                     {
                         name: 'assign_freelancer',
                         description: 'Assign a freelancer to a project',
                         parameters: {
                             type: Type.OBJECT,
                             properties: {
                                 projectId: { type: Type.STRING },
                                 freelancerId: { type: Type.STRING },
                                 role: { type: Type.STRING }
                             },
                             required: ['projectId', 'freelancerId']
                         }
                     }
                ] : []);
                tools = [{ functionDeclarations: funcs }];
            }

            config.tools = tools;

            // Chat History for context
            // Note: Thinking models might have stricter history requirements, but for now we pass full history
            const chatHistory = messages.map(m => ({ role: m.role, parts: m.parts }));
            chatHistory.push({ role: 'user', parts: [{ text: userMsg }] });
            
            const response = await ai.models.generateContent({
                model,
                contents: chatHistory,
                config
            });

            const modelResponse = response.text;
            const functionCalls = response.functionCalls;
            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

            if (functionCalls && functionCalls.length > 0 && onCallAction) {
                for (const call of functionCalls) {
                     const result = await onCallAction(call.name, call.args);
                     setMessages(prev => [...prev, { 
                        role: 'model', 
                        parts: [{ text: `Executed ${call.name}: ${JSON.stringify(result)}` }] 
                    }]);
                }
            } else if (modelResponse) {
                setMessages(prev => [...prev, { 
                    role: 'model', 
                    parts: [{ text: modelResponse }],
                    groundingChunks 
                }]);
            }

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: "I'm having trouble connecting right now." }] }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-white ${agentMode ? '' : 'rounded-2xl border border-gray-100 shadow-sm'}`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                        <Bot size={18} />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-gray-900">{customTitle || 'Studio Intelligence'}</div>
                        <div className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                            {mode === 'search' ? <Globe size={10} className="text-blue-500"/> : 
                             mode === 'thinking' ? <BrainCircuit size={10} className="text-rose-500"/> :
                             <Sparkles size={10} className="text-emerald-500"/>}
                            {mode === 'search' ? 'Search Grounding' : mode === 'thinking' ? 'Deep Think' : 'Gemini 3 Pro'}
                        </div>
                    </div>
                </div>
                
                {/* Mode Toggles */}
                <div className="flex bg-gray-200/50 p-0.5 rounded-lg">
                    <button 
                        onClick={() => setMode('standard')} 
                        className={`p-1.5 rounded-md transition-all ${mode === 'standard' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Standard Chat"
                    >
                        <Bot size={14}/>
                    </button>
                    <button 
                        onClick={() => setMode('thinking')} 
                        className={`p-1.5 rounded-md transition-all ${mode === 'thinking' ? 'bg-white shadow-sm text-rose-500' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Deep Thinking"
                    >
                        <BrainCircuit size={14}/>
                    </button>
                    <button 
                        onClick={() => setMode('search')} 
                        className={`p-1.5 rounded-md transition-all ${mode === 'search' ? 'bg-white shadow-sm text-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                        title="Search Web"
                    >
                        <Globe size={14}/>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        <div className="mx-auto w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                            {mode === 'thinking' ? <BrainCircuit size={24} className="text-rose-300"/> : 
                             mode === 'search' ? <Globe size={24} className="text-blue-300"/> :
                             <Sparkles size={24} className="text-emerald-300"/>}
                        </div>
                        <p className="text-sm font-medium text-gray-600">
                            {mode === 'thinking' ? 'Ask complex questions requiring reasoning.' :
                             mode === 'search' ? 'Ask about recent events or live data.' :
                             'How can I help you manage the studio today?'}
                        </p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                            {msg.role === 'user' ? <UserIcon size={14}/> : <Bot size={14}/>}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>
                            <SimpleMarkdown text={msg.parts[0].text || ''} groundingChunks={msg.groundingChunks} />
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Bot size={14}/>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-2 text-gray-400">
                             <Loader2 size={16} className="animate-spin"/> 
                             {mode === 'thinking' ? 'Reasoning...' : mode === 'search' ? 'Searching...' : 'Generating...'}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-100">
                <div className="relative">
                    <input 
                        className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm placeholder-gray-400"
                        placeholder={mode === 'thinking' ? "Ask a complex question..." : mode === 'search' ? "Search the web..." : "Ask anything..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm ${mode === 'thinking' ? 'bg-rose-500 hover:bg-rose-600' : mode === 'search' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;
