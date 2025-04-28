import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CircleCheck, CircleX, Cpu, AlertCircle, BarChart, Clock, Zap, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Define os tipos para a API
interface AIPerformanceMetrics {
  averageResponseTime: number;
  averageConfidenceScore: number;
  successRate: number;
  usageCount: number;
  lastUsed: string;
}

enum CommandType {
  CREATIVE = 'creative',       // Criatividade, ideias inovadoras
  STRATEGIC = 'strategic',     // Estratégia, negócios, análise competitiva
  INFORMATIONAL = 'informational', // Informações, fatos, dados
  EMOTIONAL = 'emotional',     // Suporte emocional, motivação
  TECHNICAL = 'technical',     // Explicações técnicas, código
  VOICE = 'voice'              // Síntese de voz
}

enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  PERPLEXITY = 'perplexity',
  ELEVENLABS = 'elevenlabs',
  SLACK = 'slack',
  GOV_API = 'gov_api', 
  FALLBACK = 'fallback'
}

interface Interaction {
  id: string;
  timestamp: string;
  query: string;
  response: string;
  commandType: CommandType;
  primaryProvider: AIProvider;
  actualProvider: AIProvider;
  responseTime: number;
  confidenceScore: number;
  successful: boolean;
  metadata?: Record<string, any>;
}

interface PerformanceMetrics {
  [key: string]: {
    [key: string]: AIPerformanceMetrics;
  };
}

interface OrchestratorMapping {
  [key: string]: string;
}

// Mapeia os tipos de comando para nomes mais amigáveis
const commandTypeLabels: Record<CommandType, string> = {
  [CommandType.CREATIVE]: 'Criativa',
  [CommandType.STRATEGIC]: 'Estratégica',
  [CommandType.INFORMATIONAL]: 'Informacional',
  [CommandType.EMOTIONAL]: 'Emocional',
  [CommandType.TECHNICAL]: 'Técnica',
  [CommandType.VOICE]: 'Voz'
};

// Mapeia provedores para cores e símbolos
const providerColors: Record<AIProvider, string> = {
  [AIProvider.OPENAI]: 'bg-emerald-500',
  [AIProvider.ANTHROPIC]: 'bg-purple-500',
  [AIProvider.PERPLEXITY]: 'bg-blue-500',
  [AIProvider.ELEVENLABS]: 'bg-yellow-500',
  [AIProvider.SLACK]: 'bg-slate-500',
  [AIProvider.GOV_API]: 'bg-green-500',
  [AIProvider.FALLBACK]: 'bg-red-500'
};

const providerIcons: Record<AIProvider, React.ReactNode> = {
  [AIProvider.OPENAI]: <div className="text-emerald-500">GPT</div>,
  [AIProvider.ANTHROPIC]: <div className="text-purple-500">Claude</div>,
  [AIProvider.PERPLEXITY]: <div className="text-blue-500">Perp</div>,
  [AIProvider.ELEVENLABS]: <div className="text-yellow-500">11Labs</div>,
  [AIProvider.SLACK]: <div className="text-slate-500">Slack</div>,
  [AIProvider.GOV_API]: <div className="text-green-500">Gov</div>,
  [AIProvider.FALLBACK]: <div className="text-red-500">Fallback</div>
};

// Componente principal
export default function IntelligencePanel() {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedCommandType, setSelectedCommandType] = useState<string | null>(null);
  
  // Busca os dados da API
  const { data: recentInteractions, isLoading: loadingInteractions, refetch: refetchInteractions } = 
    useQuery<Interaction[]>({
      queryKey: ['/api/intelligence/interactions'],
      queryFn: async () => {
        const response = await fetch('/api/intelligence/interactions');
        if (!response.ok) throw new Error('Falha ao carregar interações');
        return response.json();
      }
    });
    
  const { data: performanceMetrics, isLoading: loadingMetrics, refetch: refetchMetrics } = 
    useQuery<PerformanceMetrics>({
      queryKey: ['/api/intelligence/metrics'],
      queryFn: async () => {
        const response = await fetch('/api/intelligence/metrics');
        if (!response.ok) throw new Error('Falha ao carregar métricas');
        return response.json();
      }
    });
    
  const { data: providerMappings, isLoading: loadingMappings, refetch: refetchMappings } = 
    useQuery<OrchestratorMapping>({
      queryKey: ['/api/intelligence/mappings'],
      queryFn: async () => {
        const response = await fetch('/api/intelligence/mappings');
        if (!response.ok) throw new Error('Falha ao carregar mapeamentos');
        return response.json();
      }
    });
    
  // Força a otimização dos mapeamentos
  const handleForceOptimization = async () => {
    try {
      const response = await fetch('/api/intelligence/optimize', {
        method: 'POST'
      });
      
      if (response.ok) {
        // Recarrega os dados
        refetchMappings();
        refetchMetrics();
        alert('Otimização concluída com sucesso!');
      } else {
        alert('Erro ao otimizar mapeamentos');
      }
    } catch (error) {
      console.error('Erro na otimização:', error);
      alert('Erro ao otimizar mapeamentos');
    }
  };
  
  // Filtra interações com base nos seletores
  const filteredInteractions = recentInteractions?.filter(interaction => {
    if (selectedProvider && interaction.actualProvider !== selectedProvider) return false;
    if (selectedCommandType && interaction.commandType !== selectedCommandType) return false;
    return true;
  });
  
  // Calcula estatísticas gerais
  const calculateStats = () => {
    if (!recentInteractions || recentInteractions.length === 0) {
      return {
        totalInteractions: 0,
        averageResponseTime: 0,
        successRate: 0,
        fallbackRate: 0
      };
    }
    
    const total = recentInteractions.length;
    const avgTime = recentInteractions.reduce((acc, cur) => acc + cur.responseTime, 0) / total;
    const successCount = recentInteractions.filter(i => i.successful).length;
    const fallbackCount = recentInteractions.filter(i => i.primaryProvider !== i.actualProvider).length;
    
    return {
      totalInteractions: total,
      averageResponseTime: avgTime,
      successRate: (successCount / total) * 100,
      fallbackRate: (fallbackCount / total) * 100
    };
  };
  
  const stats = calculateStats();
  
  // Efeito para recarregar dados periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      refetchInteractions();
      refetchMetrics();
      refetchMappings();
    }, 30000); // Atualiza a cada 30 segundos
    
    return () => clearInterval(interval);
  }, [refetchInteractions, refetchMetrics, refetchMappings]);
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 jarvis-text-glow">Orquestrador de Inteligência</h1>
          <p className="text-muted-foreground mt-1">
            Gerenciamento inteligente de múltiplos provedores de IA
          </p>
        </div>
        <Brain className="h-12 w-12 text-blue-400 jarvis-icon-glow" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="commander-card">
          <CardHeader className="pb-2">
            <CardTitle>Total de Interações</CardTitle>
            <CardDescription>Processadas pelo orquestrador</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalInteractions}</div>
          </CardContent>
        </Card>
        
        <Card className="commander-card">
          <CardHeader className="pb-2">
            <CardTitle>Taxa de Sucesso</CardTitle>
            <CardDescription>Respostas completas e corretas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{stats.successRate.toFixed(1)}%</div>
              {stats.successRate > 90 ? (
                <CircleCheck className="text-green-500" />
              ) : stats.successRate > 70 ? (
                <AlertCircle className="text-yellow-500" />
              ) : (
                <CircleX className="text-red-500" />
              )}
            </div>
            <Progress value={stats.successRate} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card className="commander-card">
          <CardHeader className="pb-2">
            <CardTitle>Tempo Médio de Resposta</CardTitle>
            <CardDescription>Velocidade de processamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{(stats.averageResponseTime / 1000).toFixed(2)}s</div>
              <Clock className="text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="mappings" className="mb-6">
        <TabsList className="commander-tabs mb-4">
          <TabsTrigger value="mappings">Mapeamentos</TabsTrigger>
          <TabsTrigger value="metrics">Métricas de Desempenho</TabsTrigger>
          <TabsTrigger value="interactions">Interações Recentes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="mappings" className="commander-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="commander-card">
              <CardHeader>
                <CardTitle>Mapeamentos de Provedores</CardTitle>
                <CardDescription>
                  Configuração atual de roteamento de solicitações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMappings ? (
                  <div className="text-center py-4">Carregando mapeamentos...</div>
                ) : (
                  <div className="space-y-4">
                    {providerMappings && Object.entries(providerMappings).map(([commandType, provider]) => (
                      <div key={commandType} className="flex items-center justify-between">
                        <div className="font-medium">{commandTypeLabels[commandType as CommandType] || commandType}</div>
                        <Badge 
                          className={`${providerColors[provider as AIProvider]} text-white font-medium`}
                        >
                          {provider}
                        </Badge>
                      </div>
                    ))}
                    
                    <Separator className="my-4" />
                    
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleForceOptimization}
                        className="commander-button flex gap-2 items-center"
                      >
                        <Zap className="h-4 w-4" />
                        Força Otimização
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="commander-card">
              <CardHeader>
                <CardTitle>Como Funciona o Orquestrador</CardTitle>
                <CardDescription>
                  Processo inteligente de seleção de provedores
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">1. Análise de Intenção</h3>
                  <p className="text-sm text-muted-foreground">
                    O sistema analisa o conteúdo da mensagem para identificar o tipo de tarefa.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">2. Seleção de Provedor</h3>
                  <p className="text-sm text-muted-foreground">
                    Com base no tipo da tarefa, escolhe o provedor de IA mais adequado.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">3. Fallback Automático</h3>
                  <p className="text-sm text-muted-foreground">
                    Se um provedor falhar, tenta alternativas automaticamente.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">4. Aprendizado Contínuo</h3>
                  <p className="text-sm text-muted-foreground">
                    Registra métricas de performance e otimiza os mapeamentos semanalmente.
                  </p>
                </div>
                
                <Alert className="commander-alert mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Otimização Automática</AlertTitle>
                  <AlertDescription>
                    O sistema otimiza automaticamente a cada 7 dias com base no desempenho histórico.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="metrics" className="commander-content">
          <Card className="commander-card">
            <CardHeader>
              <CardTitle>Métricas de Desempenho por Provedor e Tipo</CardTitle>
              <CardDescription>
                Dados históricos de performance dos provedores de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMetrics ? (
                <div className="text-center py-4">Carregando métricas...</div>
              ) : !performanceMetrics ? (
                <div className="text-center py-4">Sem dados de métricas disponíveis</div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(performanceMetrics).map(([commandType, providers]) => (
                    <div key={commandType} className="space-y-4">
                      <h3 className="font-medium text-lg">
                        {commandTypeLabels[commandType as CommandType] || commandType}
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {Object.entries(providers).map(([provider, metrics]) => (
                          <Card key={provider} className="commander-card-light">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <CardTitle className="text-base">
                                  {provider}
                                </CardTitle>
                                <Badge 
                                  className={`${providerColors[provider as AIProvider]} text-white`}
                                >
                                  {metrics.usageCount} usos
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-2 pt-0">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="font-medium">Sucesso:</div>
                                <div>{(metrics.successRate * 100).toFixed(1)}%</div>
                                
                                <div className="font-medium">Confiança:</div>
                                <div>{(metrics.averageConfidenceScore * 100).toFixed(1)}%</div>
                                
                                <div className="font-medium">Tempo:</div>
                                <div>{(metrics.averageResponseTime / 1000).toFixed(2)}s</div>
                                
                                <div className="font-medium">Último uso:</div>
                                <div title={metrics.lastUsed}>
                                  {new Date(metrics.lastUsed).toLocaleDateString()}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      
                      <Separator />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="interactions" className="commander-content">
          <Card className="commander-card">
            <CardHeader>
              <CardTitle>Interações Recentes</CardTitle>
              <CardDescription>
                Histórico das últimas consultas processadas
              </CardDescription>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <div className="mr-2 font-medium">Filtrar por:</div>
                
                <Badge 
                  onClick={() => setSelectedCommandType(null)}
                  className={`cursor-pointer ${!selectedCommandType ? 'bg-blue-500' : 'bg-secondary'}`}
                >
                  Todos os tipos
                </Badge>
                
                {Object.values(CommandType).map(type => (
                  <Badge 
                    key={type}
                    onClick={() => setSelectedCommandType(type)}
                    className={`cursor-pointer ${selectedCommandType === type ? 'bg-blue-500' : 'bg-secondary'}`}
                  >
                    {commandTypeLabels[type]}
                  </Badge>
                ))}
                
                <div className="w-full h-0 my-1" />
                
                <Badge 
                  onClick={() => setSelectedProvider(null)}
                  className={`cursor-pointer ${!selectedProvider ? 'bg-blue-500' : 'bg-secondary'}`}
                >
                  Todos os provedores
                </Badge>
                
                {Object.values(AIProvider).map(provider => (
                  <Badge 
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={`cursor-pointer ${selectedProvider === provider ? 'bg-blue-500' : 'bg-secondary'}`}
                  >
                    {provider}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {loadingInteractions ? (
                <div className="text-center py-4">Carregando interações...</div>
              ) : !filteredInteractions || filteredInteractions.length === 0 ? (
                <div className="text-center py-4">Nenhuma interação encontrada</div>
              ) : (
                <div className="space-y-6">
                  {filteredInteractions.map((interaction) => (
                    <Card key={interaction.id} className="commander-card-light">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">
                              {new Date(interaction.timestamp).toLocaleString()}
                            </CardTitle>
                            <Badge className="bg-secondary">
                              {commandTypeLabels[interaction.commandType]}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {interaction.primaryProvider !== interaction.actualProvider && (
                              <Badge variant="outline" className="text-orange-400 border-orange-400">
                                Fallback
                              </Badge>
                            )}
                            
                            <Badge 
                              className={`${providerColors[interaction.actualProvider]} text-white`}
                            >
                              {interaction.actualProvider}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div>
                            <div className="font-medium mb-1">Consulta:</div>
                            <div className="text-sm bg-background/50 p-2 rounded">{interaction.query}</div>
                          </div>
                          
                          <div>
                            <div className="font-medium mb-1">Resposta:</div>
                            <div className="text-sm bg-background/50 p-2 rounded truncate max-h-20 overflow-auto">
                              {interaction.response.startsWith('{') && interaction.response.includes('"type":"audio"') 
                                ? '[ Conteúdo de áudio ]' 
                                : interaction.response
                              }
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-sm pt-2">
                            <div>
                              <span className="font-medium">Tempo:</span>{' '}
                              {(interaction.responseTime / 1000).toFixed(2)}s
                            </div>
                            <div>
                              <span className="font-medium">Confiança:</span>{' '}
                              {(interaction.confidenceScore * 100).toFixed(0)}%
                            </div>
                            <div>
                              <span className="font-medium">Status:</span>{' '}
                              {interaction.successful ? (
                                <span className="text-green-500">Sucesso</span>
                              ) : (
                                <span className="text-red-500">Falha</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}