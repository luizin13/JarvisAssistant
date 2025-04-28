import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, RefreshCw, Settings, 
  Paperclip, Image, Mic, SlackIcon, Loader2, Send
} from "lucide-react";

interface JarvisResponse {
  content: string;
  audioUrl?: string;
  source?: string;
  confidence?: number;
  type?: string;
  actionRequired?: boolean;
  actionType?: string;
  actionTarget?: string;
  actionParams?: any;
  relatedData?: any;
  metadata?: {
    processedBy: string;
    usedAgents: string[];
    emotionalTone: string;
    timestamp: string;
  };
  agentResponses?: any[];
  userMessage?: ChatMessage;
  botMessage?: ChatMessage;
}

export default function ChatBox() {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastResponse, setLastResponse] = useState<JarvisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Consulta histórico de mensagens JARVIS
  const { data: messageHistory = [], isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/assistant/jarvis/chat-history'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/assistant/jarvis/chat-history');
        if (!response.ok) {
          throw new Error(`Erro ao buscar histórico: ${response.status}`);
        }
        
        const data = await response.json();
        // Ordenar mensagens das mais antigas para mais recentes (para exibição em ordem cronológica)
        return Array.isArray(data) 
          ? [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          : [];
      } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        setErrorMessage("Não foi possível carregar o histórico de mensagens");
        return [];
      }
    },
    refetchInterval: 5000 // Atualiza a cada 5 segundos para pegar mensagens de outras interfaces
  });

  // Reproduzir áudio quando um novo é recebido
  useEffect(() => {
    if (lastResponse?.audioUrl) {
      const audio = new Audio(lastResponse.audioUrl);
      audio.play().catch(e => console.error("Erro ao reproduzir áudio:", e));
    }
  }, [lastResponse]);

  // Manter foco no campo de input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll para o fim quando novas mensagens chegarem
  useEffect(() => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messageHistory, isTyping]);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      setErrorMessage(null);
      
      // Usa a mesma API que o assistente de voz usa
      const response = await fetch('/api/voice-command', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          command: message,
          userId: 1,
          isOffline: false,
          responseStyle: 'detalhado', 
          voiceType: 'maria'
        }),
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro (${response.status}): ${errorText || response.statusText}`);
      }
      
      return await response.json();
    },
    onMutate: (message) => {
      setIsTyping(true);
      
      // Otimisticamente adicionamos a mensagem do usuário à UI
      const optimisticUserMsg: ChatMessage = {
        id: Date.now(), // ID temporário
        userId: 1,
        content: message,
        isBot: false,
        timestamp: new Date().toISOString()
      };
      
      // Atualizamos o state otimisticamente enquanto a resposta não chega
      queryClient.setQueryData<ChatMessage[]>(['/api/assistant/jarvis/chat-history'], (oldData = []) => {
        return [...oldData, optimisticUserMsg];
      });
    },
    onSuccess: (response) => {
      console.log("Resposta JARVIS:", response);
      setLastResponse(response);
      
      // Invalidar a consulta para forçar uma atualização dos dados reais
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/jarvis/chat-history'] });
      
      // Desligar o indicador de digitação após um delay
      setTimeout(() => {
        setIsTyping(false);
      }, 300);
    },
    onError: (error) => {
      setIsTyping(false);
      setErrorMessage(`Falha ao enviar mensagem: ${error.message}`);
      
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message || "Ocorreu um erro ao enviar sua mensagem. Tente novamente.",
        variant: "destructive",
      });
      
      // Invalidar o cache para garantir que temos os dados corretos
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/jarvis/chat-history'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const message = inputValue.trim();
    if (message === "") return;
    
    // Enviar a mensagem
    sendMessage.mutate(message);
    
    // Limpar o campo de entrada IMEDIATAMENTE
    setInputValue("");
    
    // Manter o foco no campo de entrada
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Formatar data para exibição
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="bg-transparent rounded-lg border border-blue-500/30 dark:border-blue-400/20 overflow-hidden flex flex-col h-[500px]">
      {/* Cabeçalho */}
      <div className="px-4 py-3 border-b border-blue-500/30 dark:border-blue-400/20 flex items-center bg-black/40 backdrop-blur">
        <div className="w-8 h-8 rounded-full bg-blue-500/80 flex items-center justify-center text-white">
          <MessageSquare className="h-4 w-4" />
        </div>
        <h2 className="font-heading font-medium text-blue-100 ml-2">JARVIS Chat</h2>
        <div className="ml-auto flex space-x-2">
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/assistant/jarvis/chat-history'] })}
            className="text-blue-300 hover:text-blue-100 transition-colors"
            aria-label="Atualizar conversa"
            title="Atualizar conversa"
          >
            <RefreshCw className={`h-4 w-4 ${messagesLoading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            className="text-blue-300 hover:text-blue-100 transition-colors"
            aria-label="Configurações"
            title="Configurações"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Área de mensagens */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-black/70 to-black/90"
        id="chat-messages"
      >
        {/* Estado de carregamento inicial */}
        {messagesLoading && messageHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <p className="text-sm text-blue-300">Carregando conversa...</p>
          </div>
        ) : messageHistory.length === 0 ? (
          // Estado vazio - primeira conversa
          <div className="flex flex-col items-center justify-center h-full space-y-3 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-600/30 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-blue-100">Assistente JARVIS</h3>
            <p className="text-sm text-blue-300 max-w-md">
              Olá! Sou seu assistente pessoal JARVIS. Estou aqui para ajudar com suas perguntas e tarefas. 
              Como posso ajudar hoje?
            </p>
          </div>
        ) : (
          // Lista de mensagens
          <>
            {/* Mensagem de erro, se houver */}
            {errorMessage && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-200 rounded-lg p-3 text-sm">
                <p className="font-medium">Erro:</p>
                <p>{errorMessage}</p>
              </div>
            )}
            
            {/* Mensagens da conversa */}
            {messageHistory.map((msg) => (
              <div key={msg.id} className={`flex items-start ${msg.isBot ? "" : "justify-end"}`}>
                {msg.isBot && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                )}
                
                <div 
                  className={`${
                    msg.isBot 
                      ? "ml-3 bg-blue-950/40 border border-blue-500/20 text-blue-100 rounded-lg rounded-tl-none" 
                      : "mr-3 bg-blue-600/80 text-white rounded-lg rounded-tr-none"
                  } px-4 py-2 max-w-[85%]`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-blue-300">
                      {msg.isBot ? 'JARVIS' : 'Você'}
                    </span>
                    <span className="text-xs opacity-50">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className="text-sm">
                        {line || <br />}
                      </p>
                    ))}
                  </div>
                  
                  {/* Metadados para mensagens do JARVIS */}
                  {msg.isBot && lastResponse?.metadata && 
                   msg.content === lastResponse.content && (
                    <div className="mt-2 pt-2 border-t border-blue-500/20 text-xs text-blue-300/70">
                      <p>
                        Fonte: {lastResponse.source || 'JARVIS'} • 
                        Confiança: {Math.round((lastResponse.confidence || 0) * 100)}%
                      </p>
                      {lastResponse.metadata.usedAgents?.length > 0 && (
                        <p className="mt-1">
                          Agentes: {lastResponse.metadata.usedAgents.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {!msg.isBot && (
                  <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center shrink-0">
                    <span className="text-blue-950 text-sm font-medium">L</span>
                  </div>
                )}
              </div>
            ))}
            
            {/* Indicador de digitação */}
            {isTyping && (
              <div className="flex items-start opacity-70">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="ml-3 bg-blue-950/40 border border-blue-500/20 rounded-lg rounded-tl-none px-4 py-3 max-w-[85%]">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Elemento para scroll automático */}
            <div ref={messageEndRef} />
          </>
        )}
      </div>
      
      {/* Área de entrada de mensagem */}
      <div className="border-t border-blue-500/30 dark:border-blue-400/20 p-3 bg-black/40 backdrop-blur">
        <form className="flex items-center" onSubmit={handleSubmit}>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Digite uma mensagem para o JARVIS..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sendMessage.isPending}
            className="flex-1 border border-blue-500/30 bg-blue-950/30 rounded-l-lg px-4 py-2 focus-visible:ring-blue-500 text-blue-100 placeholder:text-blue-300/50"
          />
          <Button 
            type="submit" 
            disabled={sendMessage.isPending || inputValue.trim() === ""}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-l-none"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        
        {/* Barra de informações e atalhos */}
        <div className="mt-2 flex items-center justify-between text-xs text-blue-300/70 px-1">
          <div className="flex items-center">
            <button 
              className="hover:text-blue-100 transition-colors" 
              title="Anexar arquivo"
              aria-label="Anexar arquivo"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button 
              className="ml-2 hover:text-blue-100 transition-colors"
              title="Enviar imagem"
              aria-label="Enviar imagem"
            >
              <Image className="h-4 w-4" />
            </button>
            <button 
              className="ml-2 hover:text-blue-100 transition-colors"
              title="Usar comando de voz"
              aria-label="Usar comando de voz"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button 
              className="ml-2 hover:text-blue-100 transition-colors"
              title="Enviar para Slack"
              aria-label="Enviar para Slack"
            >
              <SlackIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div>
            <span className="text-xs opacity-70">
              {sendMessage.isPending 
                ? "Processando mensagem..." 
                : lastResponse
                  ? `Última atualização: ${formatTime(new Date().toISOString())}`
                  : 'Pronto para conversar'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
