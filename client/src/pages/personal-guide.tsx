import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { 
  User, 
  Settings, 
  MessageSquare, 
  FileText, 
  Calendar, 
  Brain, 
  BarChart3, 
  Heart, 
  BookOpen, 
  Zap, 
  Sparkles, 
  Send, 
  Pause, 
  Play, 
  ArrowRight, 
  Clock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Tipos para o guia pessoal
enum GuidanceCategory {
  DAILY_PLANNING = 'daily_planning',
  PRODUCTIVITY = 'productivity',
  PERSONAL_GROWTH = 'personal_growth',
  HEALTH = 'health',
  LEARNING = 'learning',
  MINDFULNESS = 'mindfulness',
  BUSINESS = 'business',
  MOTIVATION = 'motivation',
  REFLECTION = 'reflection'
}

// Mapeamento de ícones para categorias
const categoryIcons = {
  [GuidanceCategory.DAILY_PLANNING]: <Calendar className="h-5 w-5" />,
  [GuidanceCategory.PRODUCTIVITY]: <Zap className="h-5 w-5" />,
  [GuidanceCategory.PERSONAL_GROWTH]: <Sparkles className="h-5 w-5" />,
  [GuidanceCategory.HEALTH]: <Heart className="h-5 w-5" />,
  [GuidanceCategory.LEARNING]: <BookOpen className="h-5 w-5" />,
  [GuidanceCategory.MINDFULNESS]: <Brain className="h-5 w-5" />,
  [GuidanceCategory.BUSINESS]: <BarChart3 className="h-5 w-5" />,
  [GuidanceCategory.MOTIVATION]: <Zap className="h-5 w-5" />,
  [GuidanceCategory.REFLECTION]: <FileText className="h-5 w-5" />
};

// Mapeamento de nomes para categorias (em português)
const categoryNames = {
  [GuidanceCategory.DAILY_PLANNING]: 'Planejamento Diário',
  [GuidanceCategory.PRODUCTIVITY]: 'Produtividade',
  [GuidanceCategory.PERSONAL_GROWTH]: 'Desenvolvimento Pessoal',
  [GuidanceCategory.HEALTH]: 'Saúde e Bem-estar',
  [GuidanceCategory.LEARNING]: 'Aprendizado Contínuo',
  [GuidanceCategory.MINDFULNESS]: 'Atenção Plena',
  [GuidanceCategory.BUSINESS]: 'Negócios',
  [GuidanceCategory.MOTIVATION]: 'Motivação',
  [GuidanceCategory.REFLECTION]: 'Reflexão'
};

// Interface para mensagens
interface Message {
  id?: number;
  content: string;
  isBot: boolean;
  timestamp?: Date;
  category?: GuidanceCategory;
  audioUrl?: string;
}

// Interface para configurações do guia
interface PersonalGuideSettings {
  activeHours: {
    start: number;
    end: number;
  };
  interactionFrequency: number;
  focusCategories: GuidanceCategory[];
  userName: string;
  businessTypes: string[];
  learningGoals: string[];
  wellnessGoals: string[];
}

// Interface para conteúdo sugerido
interface ContentSuggestion {
  title: string;
  type: 'article' | 'practice' | 'trend';
  category: GuidanceCategory;
  summary: string;
}

export default function PersonalGuidePage() {
  // Estado para mensagens
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  // Estado para configurações
  const [settings, setSettings] = useState<PersonalGuideSettings>({
    activeHours: { start: 8, end: 22 },
    interactionFrequency: 120,
    focusCategories: [
      GuidanceCategory.DAILY_PLANNING,
      GuidanceCategory.PRODUCTIVITY,
      GuidanceCategory.BUSINESS
    ],
    userName: 'João',
    businessTypes: ['transport', 'farm'],
    learningGoals: ['novas tecnologias agrícolas', 'gestão de logística'],
    wellnessGoals: ['melhorar concentração', 'reduzir estresse']
  });
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Query para buscar histórico de mensagens
  const { data: chatHistory } = useQuery({
    queryKey: ['/api/chat'],
    select: (data: any) => data.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      isBot: msg.isBot,
      timestamp: new Date(msg.timestamp)
    })).sort((a: Message, b: Message) => 
      new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime()
    )
  });
  
  // Query para sugestões de conteúdo
  const { data: contentSuggestions } = useQuery({
    queryKey: ['/api/personal-guide/content'],
    select: (data: any) => data.suggestions as ContentSuggestion[]
  });
  
  // Mutation para inicializar o guia
  const initializeMutation = useMutation({
    mutationFn: (settings: Partial<PersonalGuideSettings>) => 
      apiRequest('/api/personal-guide/initialize', 'POST', settings),
    onSuccess: (data: any) => {
      if (data.message && data.audioUrl) {
        addBotMessage(data.message, data.audioUrl);
        toast({
          title: "Guia pessoal inicializado",
          description: "Configurações aplicadas com sucesso",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível inicializar o guia pessoal.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation para enviar consultas ao guia
  const queryMutation = useMutation({
    mutationFn: (query: string) => 
      apiRequest('/api/personal-guide/query', 'POST', { query }),
    onSuccess: (data: any) => {
      if (data.message) {
        addBotMessage(data.message, data.audioUrl, data.category);
      }
      setIsProcessing(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível processar sua consulta.",
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  });
  
  // Mutation para atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<PersonalGuideSettings>) => 
      apiRequest('/api/personal-guide/settings', 'PATCH', settings),
    onSuccess: (data: any) => {
      if (data.settings) {
        setSettings(data.settings);
        toast({
          title: "Configurações atualizadas",
          description: "Suas preferências foram aplicadas com sucesso.",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar as configurações.",
        variant: "destructive"
      });
    }
  });
  
  // Efeito para carregar mensagens do histórico
  useEffect(() => {
    if (chatHistory) {
      setMessages(chatHistory);
    }
  }, [chatHistory]);
  
  // Efeito para rolar para o fim das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Função para adicionar mensagem do bot
  const addBotMessage = (content: string, audioUrl?: string, category?: GuidanceCategory) => {
    const newMsg: Message = {
      content,
      isBot: true,
      timestamp: new Date(),
      audioUrl,
      category
    };
    
    setMessages((prev) => [...prev, newMsg]);
    
    // Reproduz áudio automaticamente
    if (audioUrl) {
      playAudio(audioUrl);
    }
  };
  
  // Função para adicionar mensagem do usuário
  const addUserMessage = (content: string) => {
    const newMsg: Message = {
      content,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages((prev) => [...prev, newMsg]);
  };
  
  // Função para enviar mensagem
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    addUserMessage(newMessage);
    setIsProcessing(true);
    
    queryMutation.mutate(newMessage);
    setNewMessage('');
  };
  
  // Função para inicializar o guia
  const handleInitialize = () => {
    initializeMutation.mutate(settings);
  };
  
  // Função para atualizar configurações
  const handleUpdateSettings = () => {
    updateSettingsMutation.mutate(settings);
  };
  
  // Função para reproduzir áudio
  const playAudio = (url: string) => {
    if (currentAudio) {
      currentAudio.pause();
    }
    
    const audio = new Audio(url);
    setCurrentAudio(audio);
    
    audio.onplay = () => setIsAudioPlaying(true);
    audio.onpause = () => setIsAudioPlaying(false);
    audio.onended = () => setIsAudioPlaying(false);
    
    audio.play().catch(err => {
      console.error("Erro ao reproduzir áudio:", err);
      toast({
        title: "Erro",
        description: "Não foi possível reproduzir o áudio.",
        variant: "destructive"
      });
    });
  };
  
  // Função para pausar/continuar áudio
  const toggleAudio = () => {
    if (!currentAudio) return;
    
    if (isAudioPlaying) {
      currentAudio.pause();
    } else {
      currentAudio.play();
    }
  };
  
  // Função para formatar hora (00:00)
  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };
  
  // Renderização da interface
  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <User className="mr-2 h-7 w-7" />
        Guia Pessoal
      </h1>
      
      <Tabs defaultValue="chat" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="chat" className="flex items-center">
            <MessageSquare className="mr-2 h-4 w-4" />
            Conversa
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            Conteúdo Sugerido
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>
        
        {/* Aba de Conversa */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" />
                Assistente Pessoal
              </CardTitle>
              <CardDescription>
                Converse com seu guia pessoal para obter orientações sobre desenvolvimento pessoal e profissional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[60vh] flex flex-col">
                <div className="flex-1 overflow-y-auto pr-4 mb-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <Brain className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                      <h3 className="text-lg font-medium">Seu guia pessoal está pronto para ajudar</h3>
                      <p className="text-muted-foreground mt-2 max-w-md">
                        Compartilhe seus objetivos, faça perguntas sobre desenvolvimento pessoal ou peça ajuda com seus desafios diários.
                      </p>
                      <Button onClick={handleInitialize} className="mt-4">
                        Iniciar Jornada
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg, index) => (
                        <div 
                          key={index} 
                          className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
                        >
                          <div 
                            className={`max-w-[80%] p-4 rounded-lg ${
                              msg.isBot 
                                ? 'bg-secondary text-secondary-foreground' 
                                : 'bg-primary text-primary-foreground'
                            }`}
                          >
                            {msg.category && (
                              <div className="flex items-center mb-2">
                                <Badge variant="outline" className="flex items-center gap-1 bg-background/50">
                                  {categoryIcons[msg.category]}
                                  <span>{categoryNames[msg.category]}</span>
                                </Badge>
                              </div>
                            )}
                            
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                            
                            {msg.audioUrl && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => playAudio(msg.audioUrl!)}
                                className="mt-2"
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Ouvir
                              </Button>
                            )}
                            
                            <div className="text-xs opacity-70 mt-2">
                              {msg.timestamp?.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>
                
                <div className="flex items-center">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 mr-2"
                    disabled={isProcessing}
                  />
                  <Button onClick={handleSendMessage} disabled={isProcessing || !newMessage.trim()}>
                    {isProcessing ? (
                      <div className="flex items-center">
                        <div className="animate-spin h-4 w-4 mr-2 border-2 border-b-transparent rounded-full"></div>
                        Processando
                      </div>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
                
                {currentAudio && (
                  <div className="mt-4 flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={toggleAudio}
                      >
                        {isAudioPlaying ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5" />
                        )}
                      </Button>
                      <span className="text-sm ml-2">
                        {isAudioPlaying ? "Reproduzindo áudio..." : "Áudio pausado"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Conteúdo Sugerido */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Conteúdo Recomendado
              </CardTitle>
              <CardDescription>
                Recomendações personalizadas para apoiar seu desenvolvimento pessoal e profissional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contentSuggestions ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {contentSuggestions.map((item, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="mb-2 flex items-center gap-1">
                            {categoryIcons[item.category]}
                            <span>{categoryNames[item.category]}</span>
                          </Badge>
                          <Badge className={`
                            ${item.type === 'article' && 'bg-blue-100 text-blue-800 border-blue-200'} 
                            ${item.type === 'practice' && 'bg-green-100 text-green-800 border-green-200'}
                            ${item.type === 'trend' && 'bg-amber-100 text-amber-800 border-amber-200'}
                          `}>
                            {item.type === 'article' && 'Artigo'}
                            {item.type === 'practice' && 'Prática'}
                            {item.type === 'trend' && 'Tendência'}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{item.summary}</p>
                        <Button variant="link" className="px-0 mt-2">
                          Explorar <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-medium">Nenhuma recomendação disponível</h3>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    As recomendações personalizadas aparecerão aqui conforme você interage com o sistema.
                  </p>
                  <Button onClick={() => handleInitialize()} className="mt-4">
                    Gerar Recomendações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Aba de Configurações */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Configurações do Guia Pessoal
              </CardTitle>
              <CardDescription>
                Personalize seu assistente para melhor atender às suas necessidades.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h3 className="font-medium text-lg mb-4">Seus Dados</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome</label>
                    <Input 
                      value={settings.userName} 
                      onChange={(e) => setSettings({...settings, userName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipos de Negócio</label>
                    <Input 
                      value={settings.businessTypes.join(', ')} 
                      onChange={(e) => setSettings({
                        ...settings, 
                        businessTypes: e.target.value.split(',').map(s => s.trim())
                      })}
                      placeholder="Ex: transporte, agricultura"
                    />
                  </div>
                </div>
              </div>
              
              {/* Objetivos */}
              <div>
                <h3 className="font-medium text-lg mb-4">Seus Objetivos</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Objetivos de Aprendizado</label>
                    <Input 
                      value={settings.learningGoals.join(', ')} 
                      onChange={(e) => setSettings({
                        ...settings, 
                        learningGoals: e.target.value.split(',').map(s => s.trim())
                      })}
                      placeholder="Ex: novas tecnologias, gestão financeira"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Objetivos de Bem-estar</label>
                    <Input 
                      value={settings.wellnessGoals.join(', ')} 
                      onChange={(e) => setSettings({
                        ...settings, 
                        wellnessGoals: e.target.value.split(',').map(s => s.trim())
                      })}
                      placeholder="Ex: reduzir estresse, melhorar foco"
                    />
                  </div>
                </div>
              </div>
              
              {/* Interações */}
              <div>
                <h3 className="font-medium text-lg mb-4">Preferências de Interação</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Horário Ativo</label>
                      <span className="text-sm text-muted-foreground">
                        {formatHour(settings.activeHours.start)} - {formatHour(settings.activeHours.end)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={settings.activeHours.start.toString()}
                        onValueChange={(value) => setSettings({
                          ...settings,
                          activeHours: {
                            ...settings.activeHours,
                            start: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Início" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {formatHour(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <span>-</span>
                      
                      <Select
                        value={settings.activeHours.end.toString()}
                        onValueChange={(value) => setSettings({
                          ...settings,
                          activeHours: {
                            ...settings.activeHours,
                            end: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Fim" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {formatHour(i)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Frequência de Interação</label>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm text-muted-foreground">
                          {settings.interactionFrequency} minutos
                        </span>
                      </div>
                    </div>
                    <Slider
                      value={[settings.interactionFrequency]}
                      min={15}
                      max={240}
                      step={15}
                      onValueChange={(value) => setSettings({
                        ...settings,
                        interactionFrequency: value[0]
                      })}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>15 min</span>
                      <span>2h</span>
                      <span>4h</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Categorias de Foco */}
              <div>
                <h3 className="font-medium text-lg mb-4">Áreas de Foco</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.values(GuidanceCategory).map((category) => (
                    <Badge
                      key={category}
                      variant={settings.focusCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer flex items-center gap-1 py-1.5 px-3"
                      onClick={() => {
                        if (settings.focusCategories.includes(category)) {
                          // Garantir que sempre tenha pelo menos uma categoria
                          if (settings.focusCategories.length > 1) {
                            setSettings({
                              ...settings,
                              focusCategories: settings.focusCategories.filter(c => c !== category)
                            });
                          }
                        } else {
                          setSettings({
                            ...settings,
                            focusCategories: [...settings.focusCategories, category]
                          });
                        }
                      }}
                    >
                      {categoryIcons[category]}
                      <span>{categoryNames[category]}</span>
                    </Badge>
                  ))}
                </div>
              </div>
              
              <Button onClick={handleUpdateSettings} className="mt-4">
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}