
'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, X, User, Sparkles } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { askChatbot } from '../../../../ai/actions';
import Textarea from 'react-textarea-autosize';

type Message = {
  role: 'user' | 'model';
  content: string;
  timestamp?: Date;
};

// Componente para renderizar mensagens com formatação
const MessageContent = ({ content }: { content: string }) => {
  // Simples formatação de texto (você pode expandir para markdown completo)
  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-700 px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div 
      dangerouslySetInnerHTML={{ __html: formatText(content) }}
      className="leading-relaxed"
    />
  );
};

// Componente de avatar animado
const Avatar = ({ type, isTyping = false }: { type: 'user' | 'bot', isTyping?: boolean }) => {
  return (
    <div className={cn(
      "relative p-2.5 rounded-full border-2 transition-all duration-300",
      type === 'bot' 
        ? "bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-400/50 shadow-lg shadow-emerald-500/25" 
        : "bg-gradient-to-br from-blue-500 to-purple-600 border-blue-400/50 shadow-lg shadow-blue-500/25",
      isTyping && "animate-pulse"
    )}>
      {type === 'bot' ? (
        <Bot className="w-4 h-4 text-white" />
      ) : (
        <User className="w-4 h-4 text-white" />
      )}
      {isTyping && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
      )}
    </div>
  );
};

// Componente de mensagem individual
const MessageBubble = ({ message, isLatest }: { message: Message, isLatest: boolean }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isLatest) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isLatest]);

  return (
    <div className={cn(
      "flex items-start gap-3 transition-all duration-500 transform group",
      message.role === 'user' && 'justify-end',
      isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
    )}>
      {message.role === 'model' && <Avatar type="bot" />}
      
      <div className={cn(
        "relative max-w-[75%] transition-all duration-300 hover:scale-[1.02]",
        message.role === 'user' 
          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl rounded-br-md shadow-lg shadow-blue-500/25' 
          : 'bg-slate-800/90 backdrop-blur-sm text-slate-100 rounded-2xl rounded-tl-md shadow-lg border border-slate-700/50'
      )}>
        <div className="px-4 py-3">
          <MessageContent content={message.content} />
        </div>
        
        {/* Timestamp sutil */}
        {message.timestamp && (
          <div className={cn(
            "absolute -bottom-5 text-xs opacity-0 group-hover:opacity-60 transition-opacity",
            message.role === 'user' ? 'right-0 text-slate-400' : 'left-0 text-slate-500'
          )}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
      
      {message.role === 'user' && <Avatar type="user" />}
    </div>
  );
};

// Componente de loading melhorado
const TypingIndicator = () => {
  return (
    <div className="flex items-start gap-3 animate-in fade-in-50 slide-in-from-left-5 duration-300">
      <Avatar type="bot" isTyping />
      <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl rounded-tl-md p-4 border border-slate-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
          </div>
          <span className="text-slate-400 text-sm ml-2">Assistente está digitando...</span>
        </div>
      </div>
    </div>
  );
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await askChatbot({ 
        query: input,
        history: messages 
      });
      
      const modelMessage: Message = { 
        role: 'model', 
        content: response.response,
        timestamp: new Date()
      };
      
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = { 
        role: 'model', 
        content: 'Desculpe, não consegui processar sua pergunta. Tente novamente.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleOpen = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <>
      {/* Botão flutuante melhorado */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={toggleOpen}
          className={cn(
            "relative rounded-full w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-2xl transition-all duration-300 hover:shadow-emerald-500/25 border-2 border-emerald-400/30",
            "hover:scale-110 hover:rotate-3 active:scale-95",
            isOpen && "rotate-180 bg-gradient-to-br from-slate-600 to-slate-700"
          )}
        >
          {isOpen ? (
            <X className="w-8 h-8 transition-transform duration-300" />
          ) : (
            <>
              <Bot className="w-8 h-8 transition-transform duration-300" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-white" />
              </div>
            </>
          )}
        </Button>
      </div>
      
      {isOpen && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-full sm:max-w-md z-50">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl flex flex-col h-[70vh] animate-in fade-in-50 slide-in-from-bottom-10 duration-500 overflow-hidden">
            
            {/* Header melhorado */}
            <div className="relative bg-gradient-to-r from-emerald-600 to-green-600 p-4 border-b border-emerald-500/30">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/80 to-green-600/80 backdrop-blur-sm"></div>
              <div className="relative flex items-center justify-between">
                <div className='flex items-center gap-3'>
                  <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">Assistente Fadex</h3>
                    <p className="text-emerald-100 text-xs">Online • Sempre disponível</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleOpen} 
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Chat container melhorado */}
            <div 
              ref={chatContainerRef} 
              className="flex-1 p-4 space-y-4 overflow-y-auto bg-gradient-to-b from-slate-900/50 to-slate-900/80 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
            >
              {/* Mensagem de boas-vindas melhorada */}
              <div className="flex items-start gap-3 animate-in fade-in-50 slide-in-from-left-5 duration-700">
                <Avatar type="bot" />
                <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl rounded-tl-md p-4 max-w-[80%] text-slate-100 shadow-lg border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-400">Olá!</span>
                  </div>
                  <p className="leading-relaxed">
                    Como posso ajudar você a usar o sistema <strong>Notas Fadex</strong> hoje? 
                    Estou aqui para esclarecer dúvidas e orientar você! ✨
                  </p>
                </div>
              </div>

              {/* Mensagens */}
              <div className="space-y-4 group">
                {messages.map((msg, index) => (
                  <MessageBubble 
                    key={index} 
                    message={msg} 
                    isLatest={index === messages.length - 1}
                  />
                ))}
              </div>

              {/* Loading indicator melhorado */}
              {loading && <TypingIndicator />}
            </div>

            {/* Input area melhorada */}
            <div className="p-4 bg-slate-800/50 backdrop-blur-sm border-t border-slate-700/50">
              <div className="relative bg-slate-700/50 rounded-2xl border border-slate-600/50 focus-within:border-emerald-500/50 transition-all duration-200 overflow-hidden">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder="Digite sua dúvida aqui... (Enter para enviar)"
                  minRows={1}
                  maxRows={4}
                  className="w-full bg-transparent border-none pl-4 pr-14 py-3 text-white placeholder-slate-400 focus:outline-none resize-none scrollbar-thin scrollbar-thumb-slate-600"
                  disabled={loading}
                />
                <Button 
                  onClick={handleSubmit}
                  size="icon" 
                  variant="ghost" 
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 rounded-full transition-all duration-200",
                    input.trim() && !loading
                      ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 scale-100" 
                      : "text-slate-500 scale-75"
                  )}
                  disabled={loading || !input.trim()}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin"/>
                  ) : (
                    <Send className="w-5 h-5"/>
                  )}
                </Button>
              </div>
              
              {/* Contador de caracteres sutil */}
              {input.length > 100 && (
                <div className="absolute -top-6 right-0 text-xs text-slate-500">
                  {input.length}/500
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
