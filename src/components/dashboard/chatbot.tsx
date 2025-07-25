'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, Loader2, Send, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { askChatbot } from '@/ai/actions';
import Textarea from 'react-textarea-autosize';
type Message = {
  role: 'user' | 'model';
  content: string;
};

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await askChatbot({ 
        query: input,
        history: messages 
    });
      const modelMessage: Message = { role: 'model', content: response.response };
      setMessages((prev) => [...prev, modelMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = { role: 'model', content: 'Desculpe, não consegui processar sua pergunta. Tente novamente.' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleOpen = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
        setMessages([]); // Reset chat on open
    }
  }


  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={toggleOpen}
          className="rounded-full w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg hover:scale-110 transition-transform duration-300"
        >
          {isOpen ? <X className="w-8 h-8" /> : <Bot className="w-8 h-8" />}
        </Button>
      </div>
      
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl flex flex-col h-[60vh] animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className='flex items-center gap-3'>
                    <Bot className="w-6 h-6 text-primary" />
                    <h3 className="font-bold text-lg text-white">Assistente Virtual</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleOpen} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </Button>
            </div>

            <div ref={chatContainerRef} className="flex-1 p-4 space-y-6 overflow-y-auto">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-800 rounded-full border border-border">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="bg-slate-800 rounded-xl rounded-tl-none p-3 max-w-xs text-white text-sm">
                        Olá! Como posso ajudar você a usar o sistema Notas Fadex hoje?
                    </div>
                </div>
                {messages.map((msg, index) => (
                    <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' && 'justify-end')}>
                         {msg.role === 'model' && (
                             <div className="p-2 bg-slate-800 rounded-full border border-border">
                                <Bot className="w-5 h-5 text-primary" />
                            </div>
                         )}
                         <div className={cn("rounded-xl p-3 max-w-xs text-sm", 
                            msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground rounded-br-none' 
                            : 'bg-slate-800 text-white rounded-tl-none'
                         )}>
                            {msg.content}
                         </div>
                          {msg.role === 'user' && (
                             <div className="p-2 bg-slate-800 rounded-full border border-border">
                                <User className="w-5 h-5 text-slate-400" />
                            </div>
                         )}
                    </div>
                ))}
                 {loading && (
                    <div className="flex items-start gap-3">
                       <div className="p-2 bg-slate-800 rounded-full border border-border">
                          <Bot className="w-5 h-5 text-primary" />
                       </div>
                       <div className="bg-slate-800 rounded-xl rounded-tl-none p-3 max-w-xs text-white text-sm flex items-center gap-2">
                           <Loader2 className="w-4 h-4 animate-spin"/>
                           <span>Pensando...</span>
                       </div>
                   </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
                <div className="relative">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        placeholder="Digite sua dúvida aqui..."
                        minRows={1}
                        maxRows={4}
                        className="w-full bg-slate-800/80 border-border rounded-lg pl-4 pr-12 py-2.5 text-white placeholder-slate-400 focus:border-primary/50 focus:outline-none resize-none"
                        disabled={loading}
                    />
                    <Button type="submit" size="icon" variant="ghost" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary" disabled={loading || !input.trim()}>
                        <Send className="w-5 h-5"/>
                    </Button>
                </div>
            </form>
        </div>
      )}
    </>
  );
}
