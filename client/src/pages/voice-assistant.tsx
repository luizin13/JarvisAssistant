import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useRoute } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import VoiceCommand from "@/components/voice/voice-command";
import ChatBox from "@/components/chat/chat-box";
import { 
  PlayCircle, Pause, Download, Clock, BarChart2, RefreshCw, 
  CalendarDays, Truck, Tractor, Info, MessageSquare, ArrowRight,
  Volume2, Mic, ListMusic, ListPlus, ListMinus, Keyboard
} from "lucide-react";

interface AudioBriefing {
  id: string;
  title: string;
  duration: string;
  createdAt: string;
  type: 'daily' | 'weekly' | 'transport' | 'farm' | 'custom';
  content: string;
}

// Interface para a resposta do comando de voz
interface VoiceCommandResponse {
  content: string;
  type?: 'text' | 'briefing' | 'alert' | 'action' | 'navigation' | 'multiagent';
  actionRequired?: boolean;
  actionType?: 'navigate' | 'generate' | 'filter' | 'search' | 'refresh' | 'create_task' | 'submit_input';
  actionTarget?: string;
  actionParams?: Record<string, any>;
  relatedData?: any;
}

export default function VoiceAssistantPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("assistente");
  const [isListening, setIsListening] = useState(false);
  const [currentBriefing, setCurrentBriefing] = useState<AudioBriefing | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>("");
  const [commandHistory, setCommandHistory] = useState<{command: string; response: string}[]>([]);
  const [location, setLocation] = useLocation();
  
  // Manipula os comandos de voz recebidos
  const handleCommand = (command: string) => {
    setLastCommand(command);
    setIsListening(true);
  };
  
  // Manipula as ações especiais do assistente de voz
  const handleAction = (action: VoiceCommandResponse) => {
    console.log("Ação recebida:", action);
    
    // Adiciona a comando e resposta ao histórico
    if (action.content) {
      setCommandHistory(prev => [...prev, {
        command: lastCommand,
        response: action.content
      }]);
    }
    
    // Trata ações de navegação
    if (action.type === 'navigation' && action.actionType === 'navigate') {
      if (action.actionTarget === 'back') {
        window.history.back();
      } else if (action.actionTarget) {
        setLocation(action.actionTarget);
        toast({
          title: "Navegando",
          description: `Redirecionando para ${action.actionTarget}`,
        });
      }
    }
    
    // Trata ações de geração de briefing
    else if (action.type === 'action' && action.actionType === 'generate' && action.actionTarget === 'briefing') {
      const type = action.actionParams?.type || 'daily';
      generateNewBriefing(type as any);
      setActiveTab("briefings");
    }
    
    // Trata ações de atualização de dados
    else if (action.type === 'action' && action.actionType === 'refresh') {
      toast({
        title: "Atualizando dados",
        description: "Buscando dados mais recentes para você",
      });
      
      // Invalida e recarrega várias caches de dados
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/news'] });
      queryClient.invalidateQueries({ queryKey: ['/api/credit'] });
      queryClient.invalidateQueries({ queryKey: ['/api/government-bids'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
      refetchBriefings();
    }
    
    // Trata alertas importantes
    else if (action.type === 'alert' && action.actionRequired) {
      toast({
        title: "Alerta",
        description: action.content,
        variant: "destructive",
      });
    }
  };

  // Busca os briefings disponíveis
  const { data: briefings = [], refetch: refetchBriefings } = useQuery<AudioBriefing[]>({
    queryKey: ['/api/audio-briefings'],
    queryFn: async () => {
      try {
        const response = await apiRequest<AudioBriefing[]>('GET', '/api/audio-briefings');
        return response || [];
      } catch (error) {
        console.error("Erro ao buscar briefings:", error);
        return [];
      }
    },
  });

  // Gera um novo briefing
  const generateNewBriefing = async (type: 'daily' | 'weekly' | 'transport' | 'farm') => {
    try {
      setIsGenerating(true);
      
      const briefing = await apiRequest<AudioBriefing>('POST', '/api/audio-briefing', { type });
      
      setCurrentBriefing(briefing);
      refetchBriefings();
      toast({
        title: "Briefing gerado",
        description: `${briefing.title} está pronto para reprodução.`,
      });
    } catch (error) {
      console.error("Erro ao gerar briefing:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o briefing. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Reproduz um briefing
  const playBriefing = (briefing: AudioBriefing) => {
    if (!window.speechSynthesis) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta síntese de voz.",
        variant: "destructive",
      });
      return;
    }
    
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      
      if (currentBriefing?.id !== briefing.id) {
        setCurrentBriefing(briefing);
        setTimeout(() => {
          speakText(briefing.content);
          setIsPlaying(true);
        }, 100);
      }
    } else {
      setCurrentBriefing(briefing);
      speakText(briefing.content);
      setIsPlaying(true);
    }
  };

  // Pausa ou resume a reprodução
  const togglePlayback = () => {
    if (!window.speechSynthesis) return;
    
    if (isPlaying) {
      window.speechSynthesis.pause();
    } else {
      window.speechSynthesis.resume();
    }
    
    setIsPlaying(!isPlaying);
  };

  // Função para transformar texto em fala
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Limpa qualquer fala pendente
    window.speechSynthesis.cancel();
    
    // Cria um novo objeto de fala
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configuração para português brasileiro
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0; // Velocidade normal
    utterance.pitch = 1.0; // Tonalidade normal
    
    // Encontrar uma voz em português brasileiro, se disponível
    const voices = window.speechSynthesis.getVoices();
    const portugueseVoice = voices.find(voice => 
      voice.lang.includes('pt-BR') || voice.lang.includes('pt')
    );
    
    if (portugueseVoice) {
      utterance.voice = portugueseVoice;
    }
    
    // Evento de fim de reprodução
    utterance.onend = () => {
      setIsPlaying(false);
    };
    
    // Reproduz o áudio
    window.speechSynthesis.speak(utterance);
  };

  // Formata a data de criação
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Componente para exibir um briefing na lista
  const BriefingItem = ({ briefing }: { briefing: AudioBriefing }) => {
    const isActive = currentBriefing?.id === briefing.id;
    
    const getBriefingIcon = () => {
      switch (briefing.type) {
        case 'daily':
          return <CalendarDays size={16} className="mr-2" />;
        case 'weekly':
          return <BarChart2 size={16} className="mr-2" />;
        case 'transport':
          return <Truck size={16} className="mr-2" />;
        case 'farm':
          return <Tractor size={16} className="mr-2" />;
        default:
          return <Clock size={16} className="mr-2" />;
      }
    };
    
    return (
      <div 
        className={`flex items-center justify-between p-3 rounded-md mb-2 cursor-pointer transition-colors ${
          isActive
            ? "bg-primary/10 border border-primary/30"
            : "hover:bg-gray-100 dark:hover:bg-gray-800"
        }`}
        onClick={() => playBriefing(briefing)}
      >
        <div className="flex items-center">
          {getBriefingIcon()}
          <div>
            <h4 className="font-medium text-sm">{briefing.title}</h4>
            <div className="flex items-center text-xs text-gray-500">
              <Clock size={12} className="mr-1" />
              <span>{briefing.duration}</span>
              <span className="mx-2">•</span>
              <span>{formatDate(briefing.createdAt)}</span>
            </div>
          </div>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8">
          <PlayCircle size={18} />
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <span className="inline-block mr-3 p-2 bg-primary/10 rounded-full">
            <Volume2 className="h-6 w-6 text-primary" />
          </span>
          Painel de Comando JARVIS
        </h1>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="hidden md:flex"
            onClick={() => setActiveTab("briefings")}
          >
            <ListMusic className="mr-2 h-4 w-4" />
            Briefings
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar Dados
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 cognitive-input-focus">
          <TabsTrigger value="assistente" className="cognitive-actionable">Comandos de Voz</TabsTrigger>
          <TabsTrigger value="chat" className="cognitive-actionable">Chat</TabsTrigger>
          <TabsTrigger value="briefings" className="cognitive-actionable">Briefings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="mt-4">
          <div className="max-w-5xl mx-auto">
            <Card className="cognitive-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center">
                  <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                    <Keyboard className="h-5 w-5 text-primary" />
                  </span>
                  Chat com JARVIS
                </CardTitle>
                <CardDescription>
                  Converse com o assistente por texto quando preferir não usar comandos de voz
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[calc(100vh-300px)] min-h-[500px]">
                  <ChatBox />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="assistente" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="mb-8 cognitive-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                      <Mic className="h-4 w-4 text-primary" />
                    </span>
                    Assistente de Voz JARVIS
                  </CardTitle>
                  <CardDescription>
                    Pergunte sobre seus negócios, notícias, oportunidades de crédito e mais usando sua voz. O assistente responderá por áudio.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <VoiceCommand 
                    isListening={isListening}
                    onCommand={handleCommand}
                    onAction={handleAction}
                    className="shadow-none border-0 p-0"
                  />
                  
                  <div className="mt-8">
                    <h3 className="text-sm font-medium mb-3 flex items-center">
                      <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      </span>
                      Sugestões de comandos:
                    </h3>
                    <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300 pl-1">
                      <li className="cognitive-actionable p-1.5 rounded-md hover:bg-primary/5 cursor-pointer transition-colors">
                        "Quais são as estatísticas atuais do meu negócio de transporte?"
                      </li>
                      <li className="cognitive-actionable p-1.5 rounded-md hover:bg-primary/5 cursor-pointer transition-colors">
                        "Mostre as oportunidades de crédito para agricultura"
                      </li>
                      <li className="cognitive-actionable p-1.5 rounded-md hover:bg-primary/5 cursor-pointer transition-colors">
                        "Quais são as notícias recentes sobre o setor agrícola?"
                      </li>
                      <li className="cognitive-actionable p-1.5 rounded-md hover:bg-primary/5 cursor-pointer transition-colors">
                        "Gere um resumo diário das minhas operações"
                      </li>
                      <li className="cognitive-actionable p-1.5 rounded-md hover:bg-primary/5 cursor-pointer transition-colors">
                        "Quais são as licitações governamentais disponíveis agora?"
                      </li>
                    </ul>
                  </div>
                  
                  {commandHistory.length > 0 && (
                    <div className="mt-8">
                      <Separator className="my-4" />
                      <h3 className="text-sm font-medium mb-3 flex items-center">
                        <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                        </span>
                        Histórico de Comandos:
                      </h3>
                      <ScrollArea className="h-[230px] rounded-md border cognitive-card">
                        <div className="p-4">
                          {commandHistory.slice().reverse().map((item, index) => (
                            <div key={index} className="mb-6 last:mb-0 transition-all duration-300" 
                                 style={{ 
                                   opacity: 1, 
                                   transform: 'translateY(0)', 
                                   boxShadow: index === 0 ? 'var(--cognitive-shadow-soft)' : 'none',
                                   borderRadius: '0.5rem',
                                   padding: index === 0 ? '0.5rem' : '0'
                                 }}>
                              <div className="flex items-start mb-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary">
                                  <span className="text-sm">L</span>
                                </div>
                                <div className="ml-2 p-3 bg-muted/50 rounded-lg rounded-tl-none text-sm flex-1"
                                     style={{ boxShadow: 'var(--cognitive-shadow-soft)' }}>
                                  {item.command}
                                </div>
                              </div>
                              
                              <div className="flex items-start pl-10">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center text-primary">
                                  <Volume2 size={16} />
                                </div>
                                <div className="ml-2 p-3 bg-primary/10 rounded-lg rounded-tl-none text-sm flex-1"
                                     style={{ boxShadow: 'var(--cognitive-shadow-soft)' }}>
                                  {item.response}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="cognitive-card border-primary/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                      <Volume2 className="h-4 w-4 text-primary" />
                    </span>
                    Recursos de Voz
                  </CardTitle>
                  <CardDescription>
                    Capacidades avançadas do seu assistente de voz
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-md cognitive-actionable hover:bg-primary/5 cursor-pointer transition-all">
                    <h3 className="text-sm font-medium flex items-center mb-2">
                      <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                        <Info size={14} className="text-primary" />
                      </span>
                      Navegação por Voz
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Navegue pela aplicação usando comandos como "Ir para dashboard" ou "Abrir página de transportes".
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-md cognitive-actionable hover:bg-primary/5 cursor-pointer transition-all">
                    <h3 className="text-sm font-medium flex items-center mb-2">
                      <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                        <MessageSquare size={14} className="text-primary" />
                      </span>
                      Consultas Inteligentes
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Pergunte sobre estatísticas, tendências e insights sobre seus negócios com linguagem natural.
                    </p>
                  </div>
                  
                  <div className="p-3 bg-muted/50 rounded-md cognitive-actionable hover:bg-primary/5 cursor-pointer transition-all">
                    <h3 className="text-sm font-medium flex items-center mb-2">
                      <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                        <RefreshCw size={14} className="text-primary" />
                      </span>
                      Atualização de Dados
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Diga "Atualizar dados" ou "Refrescar informações" para obter as informações mais recentes.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col items-start">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                      <ArrowRight size={14} className="text-primary" />
                    </span>
                    <span>Acesse a aba de Briefings para ouvir resumos</span>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full cognitive-actionable"
                    onClick={() => setActiveTab("briefings")}
                  >
                    <PlayCircle size={14} className="mr-2" />
                    Ver Briefings de Áudio
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="briefings" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="cognitive-card">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="flex items-center">
                        <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                          <Volume2 className="h-4 w-4 text-primary" />
                        </span>
                        {currentBriefing ? currentBriefing.title : "Centro de Inteligência Estratégica"}
                      </CardTitle>
                      {currentBriefing && (
                        <CardDescription className="flex items-center mt-1">
                          <Clock size={14} className="mr-1 text-primary/70" />
                          {currentBriefing.duration}
                          <span className="mx-2">•</span>
                          {formatDate(currentBriefing.createdAt)}
                        </CardDescription>
                      )}
                    </div>
                    {currentBriefing && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Compartilhar">
                          <ArrowRight size={14} />
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Download">
                          <Download size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {currentBriefing ? (
                    <>
                      <div className="bg-muted/50 rounded-md p-4 mb-5 max-h-[300px] overflow-y-auto"
                           style={{ boxShadow: 'var(--cognitive-shadow-soft)' }}>
                        <p className="whitespace-pre-line">{currentBriefing.content}</p>
                      </div>
                      
                      <div className="flex space-x-3">
                        <Button
                          onClick={togglePlayback}
                          disabled={!currentBriefing}
                          className="flex-1 cognitive-actionable"
                          size="lg"
                        >
                          {isPlaying ? 
                            <><Pause size={18} className="mr-2" /> Pausar</> : 
                            <><PlayCircle size={18} className="mr-2" /> Reproduzir</>
                          }
                        </Button>
                        <Button
                          variant="outline"
                          disabled={!currentBriefing}
                          className="cognitive-actionable"
                        >
                          <Download size={18} className="mr-2" /> Baixar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-block p-4 mb-5 rounded-full bg-primary/10">
                        <Volume2 className="h-8 w-8 text-primary/80" />
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Selecione um briefing da lista ou gere um novo resumo para ouvir as informações mais relevantes sobre seus negócios
                      </p>
                      <Button 
                        onClick={() => generateNewBriefing('daily')}
                        disabled={isGenerating}
                        className="cognitive-actionable"
                        size="lg"
                      >
                        {isGenerating ? 
                          <RefreshCw size={17} className="mr-2 animate-spin" /> : 
                          <PlayCircle size={17} className="mr-2" />
                        }
                        Gerar Resumo Diário
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="cognitive-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                      <ListPlus className="h-4 w-4 text-primary" />
                    </span>
                    Gerar Novo Briefing
                  </CardTitle>
                  <CardDescription>
                    Escolha o tipo de relatório que deseja ouvir
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generateNewBriefing('daily')}
                      disabled={isGenerating}
                      className="justify-start cognitive-actionable hover:bg-primary/5 transition-colors"
                    >
                      <CalendarDays size={14} className="mr-2 text-primary" />
                      Diário
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generateNewBriefing('weekly')}
                      disabled={isGenerating}
                      className="justify-start cognitive-actionable hover:bg-primary/5 transition-colors"
                    >
                      <BarChart2 size={14} className="mr-2 text-primary" />
                      Semanal
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generateNewBriefing('transport')}
                      disabled={isGenerating}
                      className="justify-start cognitive-actionable hover:bg-primary/5 transition-colors"
                    >
                      <Truck size={14} className="mr-2 text-primary" />
                      Transporte
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generateNewBriefing('farm')}
                      disabled={isGenerating}
                      className="justify-start cognitive-actionable hover:bg-primary/5 transition-colors"
                    >
                      <Tractor size={14} className="mr-2 text-primary" />
                      Agricultura
                    </Button>
                  </div>
                  
                  <Separator className="my-5" />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center">
                      <span className="inline-block mr-2 p-1 bg-primary/10 rounded-full">
                        <ListMusic className="h-3.5 w-3.5 text-primary" />
                      </span>
                      Briefings Recentes
                    </h3>
                    
                    <ScrollArea className="h-[300px] rounded-md border cognitive-card pr-3">
                      {Array.isArray(briefings) && briefings.length > 0 ? (
                        <div className="space-y-2 p-2">
                          {briefings.map((briefing: AudioBriefing) => (
                            <BriefingItem key={briefing.id} briefing={briefing} />
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-center p-4">
                          <ListMinus className="h-10 w-10 text-muted-foreground mb-2" />
                          <p className="text-sm text-gray-500">
                            Nenhum briefing disponível
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Gere seu primeiro briefing usando os botões acima
                          </p>
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}