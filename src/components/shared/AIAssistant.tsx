import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Bot, Send, Loader2, X, Sparkles } from 'lucide-react';

import { useCompany } from '@/contexts/CompanyContext';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  context?: string;
  placeholder?: string;
  suggestions?: string[];
}

const defaultSuggestions = [
  'Como está meu fluxo de caixa?',
  'Quais clientes estão inadimplentes?',
  'Quais produtos preciso repor?',
  'Resumo geral da empresa',
];

export function AIAssistant({
  context = '',
  placeholder = 'Pergunte algo sobre seus dados...',
  suggestions = defaultSuggestions
}: AIAssistantProps) {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { currentCompany } = useCompany();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const messageToSend = text || message;
    if (!messageToSend.trim() || !currentCompany) return;

    setLoading(true);
    setResponse('');
    setMessage('');

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-ai`;
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: messageToSend }],
          type: 'chat',
          companyId: currentCompany.id
        }),
      });

      if (!resp.ok) {
        throw new Error('Erro ao conectar com a IA');
      }

      if (!resp.body) {
        throw new Error('No response body');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              setResponse(fullResponse);
            }
          } catch {}
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          // Try parsing as raw JSON (non-streaming response)
          const rawJson = JSON.parse(buffer);
          const content = rawJson.choices?.[0]?.message?.content || '';
          if (content) {
            fullResponse = content;
            setResponse(content);
          }
        } catch {
          // Process remaining SSE lines
          for (const line of buffer.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                setResponse(fullResponse);
              }
            } catch {}
          }
        }
      }

      if (!fullResponse) {
        setResponse('Não consegui processar a resposta. Tente novamente.');
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      setResponse('Erro ao processar sua pergunta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 transition-all duration-300",
          isOpen && "rotate-180"
        )}
        size="icon"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </Button>

      {/* Chat panel */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-50 w-80 md:w-96 max-h-[500px] flex flex-col shadow-2xl border-border/50 animate-in slide-in-from-bottom-5">
          <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              Assistente IA
            </CardTitle>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-4 min-h-[200px] max-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : response ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm text-foreground/90">
                  {response}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Olá! Posso ajudar você a analisar seus dados. Experimente:
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-2.5"
                      onClick={() => sendMessage(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-3 pt-0">
            <div className="flex w-full gap-2">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={placeholder}
                className="min-h-[44px] max-h-[100px] resize-none text-sm"
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <Button 
                size="icon" 
                onClick={() => sendMessage()}
                disabled={loading || !message.trim()}
                className="shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}
    </>
  );
}
