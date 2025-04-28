import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle, Clock, Cpu, FileText, Info, MessageSquare, RefreshCw, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Tipos que refletem os do backend
export enum CommandType {
  CREATIVE = 'creative',
  STRATEGIC = 'strategic',
  INFORMATIONAL = 'informational',
  EMOTIONAL = 'emotional',
  TECHNICAL = 'technical',
  VOICE = 'voice'
}

export enum AIProvider {
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
    [key: string]: {
      averageResponseTime: number;
      averageConfidenceScore: number;
      successRate: number;
      usageCount: number;
      lastUsed: string;
    } | undefined;
  };
}

// Mapeia AIProviders para ícones e cores
const providerIcons: Record<AIProvider, { icon: React.ReactNode, color: string, label: string }> = {
  [AIProvider.OPENAI]: { 
    icon: <i className="ri-openai-fill"></i>,
    color: 'bg-green-500',
    label: 'OpenAI'
  },
  [AIProvider.ANTHROPIC]: { 
    icon: <i className="ri-cloud-fill"></i>, 
    color: 'bg-purple-500',
    label: 'Anthropic'
  },
  [AIProvider.PERPLEXITY]: { 
    icon: <i className="ri-search-line"></i>, 
    color: 'bg-blue-500',
    label: 'Perplexity'
  },
  [AIProvider.ELEVENLABS]: { 
    icon: <i className="ri-volume-up-fill"></i>, 
    color: 'bg-indigo-500',
    label: 'ElevenLabs'
  },
  [AIProvider.SLACK]: { 
    icon: <i className="ri-slack-fill"></i>, 
    color: 'bg-yellow-500',
    label: 'Slack'
  },
  [AIProvider.GOV_API]: { 
    icon: <i className="ri-government-fill"></i>, 
    color: 'bg-red-500',
    label: 'Gov API'
  },
  [AIProvider.FALLBACK]: { 
    icon: <AlertCircle size={16} />, 
    color: 'bg-gray-500',
    label: 'Fallback'
  }
};

// Mapeia tipos de comando para ícones e cores
const commandTypeIcons: Record<CommandType, { icon: React.ReactNode, color: string, label: string }> = {
  [CommandType.CREATIVE]: { 
    icon: <i className="ri-lightbulb-flash-line"></i>, 
    color: 'bg-pink-500',
    label: 'Criativo'
  },
  [CommandType.STRATEGIC]: { 
    icon: <i className="ri-strategy-line"></i>, 
    color: 'bg-blue-600',
    label: 'Estratégico'
  },
  [CommandType.INFORMATIONAL]: { 
    icon: <i className="ri-information-line"></i>, 
    color: 'bg-green-600',
    label: 'Informativo'
  },
  [CommandType.EMOTIONAL]: { 
    icon: <i className="ri-emotion-line"></i>, 
    color: 'bg-yellow-600',
    label: 'Emocional'
  },
  [CommandType.TECHNICAL]: { 
    icon: <i className="ri-code-s-slash-line"></i>, 
    color: 'bg-violet-600',
    label: 'Técnico'
  },
  [CommandType.VOICE]: { 
    icon: <i className="ri-mic-line"></i>, 
    color: 'bg-cyan-600',
    label: 'Voz'
  }
};

// Componente para o painel de inteligência
export default function IntelligencePanel() {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('interactions');
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Carrega os dados inicialmente
  useEffect(() => {
    loadData();
  }, []);

  // Função para carregar todos os dados
  const loadData = async () => {
    setLoading(true);
    try {
      const [interactionsData, metricsData, mappingsData] = await Promise.all([
        apiRequest<Interaction[]>('/api/intelligence/interactions'),
        apiRequest<PerformanceMetrics>('/api/intelligence/metrics'),
        apiRequest<Record<string, string>>('/api/intelligence/mappings')
      ]);
      
      setInteractions(interactionsData);
      setMetrics(metricsData);
      setMappings(mappingsData);
    } catch (error) {
      console.error('Erro ao carregar dados do orquestrador:', error);
    } finally {
      setLoading(false);
    }
  };

  // Força uma otimização dos mapeamentos
  const forceOptimize = async () => {
    setOptimizing(true);
    try {
      await apiRequest('/api/intelligence/optimize', {
        method: 'POST'
      });
      await loadData(); // Recarrega os dados após a otimização
    } catch (error) {
      console.error('Erro ao otimizar mapeamentos:', error);
    } finally {
      setOptimizing(false);
    }
  };

  // Tenta novamente uma interação com um provedor diferente
  const retryWithDifferentProvider = async (interaction: Interaction, newProvider: AIProvider) => {
    setRetryingId(interaction.id);
    try {
      const result = await apiRequest<Interaction>('/api/intelligence/retry', {
        method: 'POST',
        body: JSON.stringify({
          query: interaction.query,
          provider: newProvider
        })
      });
      
      // Atualiza a lista de interações
      setInteractions(prevInteractions => {
        const updated = [...prevInteractions];
        const index = updated.findIndex(i => i.id === interaction.id);
        
        if (index !== -1) {
          // Adiciona a nova interação no lugar da antiga
          updated[index] = {
            ...result,
            id: Date.now().toString() // Nova ID para a interação
          };
        }
        
        return updated;
      });
    } catch (error) {
      console.error('Erro ao tentar novamente com outro provedor:', error);
    } finally {
      setRetryingId(null);
    }
  };

  // Renderiza uma badge para o provedor
  const renderProviderBadge = (provider: AIProvider, isActual = false) => {
    const { icon, color, label } = providerIcons[provider];
    
    return (
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1 ${isActual ? 'border-2' : ''}`}
      >
        <span className={`w-2 h-2 rounded-full ${color}`}></span>
        {icon}
        <span className="ml-1">{label}</span>
      </Badge>
    );
  };

  // Renderiza uma badge para o tipo de comando
  const renderCommandTypeBadge = (type: CommandType) => {
    const { icon, color, label } = commandTypeIcons[type];
    
    return (
      <Badge 
        variant="outline" 
        className="flex items-center gap-1"
      >
        <span className={`w-2 h-2 rounded-full ${color}`}></span>
        {icon}
        <span className="ml-1">{label}</span>
      </Badge>
    );
  };

  // Formata o tempo de resposta de forma legível
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Renderiza uma barra de confiança
  const renderConfidenceBar = (score: number) => {
    let color = 'bg-red-500';
    if (score >= 0.7) color = 'bg-green-500';
    else if (score >= 0.4) color = 'bg-yellow-500';
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full`}
          style={{ width: `${score * 100}%` }}
        ></div>
      </div>
    );
  };

  // Renderiza o card de uma interação
  const renderInteractionCard = (interaction: Interaction) => {
    const { 
      id, timestamp, query, response, commandType, 
      primaryProvider, actualProvider, responseTime, 
      confidenceScore, successful 
    } = interaction;
    
    const date = new Date(timestamp).toLocaleString('pt-BR');
    const isRetrying = id === retryingId;
    
    // Lista de provedores alternativos para tentar novamente
    const alternativeProviders = Object.values(AIProvider).filter(
      p => p !== actualProvider && p !== AIProvider.FALLBACK
    );
    
    return (
      <Card key={id} className="mb-4 jarvis-card">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {renderCommandTypeBadge(commandType)}
              {successful ? 
                <CheckCircle size={16} className="text-green-500" /> : 
                <XCircle size={16} className="text-red-500" />
              }
            </div>
            <div className="text-sm text-muted-foreground">{date}</div>
          </div>
          <CardTitle className="text-lg mt-2 text-blue-300">
            {query.length > 100 ? query.substring(0, 100) + '...' : query}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>{formatResponseTime(responseTime)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                {primaryProvider !== actualProvider && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          {renderProviderBadge(primaryProvider)}
                          <i className="ri-arrow-right-line mx-1"></i>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Provedor original que falhou</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                
                {renderProviderBadge(actualProvider, true)}
              </div>
            </div>
            
            <div className="mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs">Confiança</span>
                <span className="text-xs">{Math.round(confidenceScore * 100)}%</span>
              </div>
              {renderConfidenceBar(confidenceScore)}
            </div>
            
            <div className="bg-gray-900/50 p-3 rounded-md mt-2 text-sm border border-gray-800">
              <p className="text-blue-100/90">{response.substring(0, 200)}{response.length > 200 ? '...' : ''}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-3 flex justify-between commander-border">
          <div className="text-xs text-muted-foreground">ID: {id.substring(0, 8)}</div>
          
          <div className="flex gap-2">
            {!successful && (
              <Button 
                variant="jarvis" 
                size="sm" 
                disabled={isRetrying}
                onClick={() => retryWithDifferentProvider(interaction, alternativeProviders[0])}
              >
                {isRetrying ? "Tentando..." : "Tentar novamente"}
              </Button>
            )}
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="px-2" disabled={isRetrying}>
                    <RefreshCw size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tentar com outro provedor</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardFooter>
      </Card>
    );
  };

  // Renderiza a métrica para um tipo de comando e provedor específicos
  const renderMetricCard = (commandType: string, provider: string, metric: any) => {
    if (!metric) return null;
    
    const { 
      averageResponseTime, 
      averageConfidenceScore, 
      successRate, 
      usageCount,
      lastUsed
    } = metric;
    
    const lastUsedDate = new Date(lastUsed).toLocaleString('pt-BR');
    
    return (
      <Card key={`${commandType}-${provider}`} className="mb-4 jarvis-card">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {renderCommandTypeBadge(commandType as CommandType)}
              {renderProviderBadge(provider as AIProvider)}
            </div>
            <Badge variant="outline">
              {usageCount} usos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs">Taxa de Sucesso</span>
                <span className="text-xs">{Math.round(successRate * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${successRate >= 0.7 ? 'bg-green-500' : successRate >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'} h-2 rounded-full`}
                  style={{ width: `${successRate * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs">Confiança Média</span>
                <span className="text-xs">{Math.round(averageConfidenceScore * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`${averageConfidenceScore >= 0.7 ? 'bg-green-500' : averageConfidenceScore >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'} h-2 rounded-full`}
                  style={{ width: `${averageConfidenceScore * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span className="text-sm">Tempo médio:</span>
              </div>
              <span>{formatResponseTime(averageResponseTime)}</span>
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Último uso:</span>
              <span>{lastUsedDate}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderiza o mapeamento atual de provedores
  const renderMappingsTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b commander-border">
              <th className="text-left py-2 px-4">Tipo de Comando</th>
              <th className="text-left py-2 px-4">Provedor Principal</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(mappings).map(([commandType, provider]) => (
              <tr key={commandType} className="border-b commander-border hover:bg-gray-900/30">
                <td className="py-2 px-4">
                  {renderCommandTypeBadge(commandType as CommandType)}
                </td>
                <td className="py-2 px-4">
                  {renderProviderBadge(provider as AIProvider)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Card className="jarvis-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-300 jarvis-text-glow">Painel de Inteligência Luiz-JARVIS</CardTitle>
            <CardDescription>Monitoramento e otimização de respostas de IA</CardDescription>
          </div>
          <Button 
            variant="jarvis" 
            size="sm" 
            className="h-8"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs 
          defaultValue="interactions" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 mb-4 jarvis-card">
            <TabsTrigger value="interactions" className="data-[state=active]:jarvis-text-glow data-[state=active]:bg-blue-900/20">
              <MessageSquare size={16} className="mr-2" />
              Interações
            </TabsTrigger>
            <TabsTrigger value="metrics" className="data-[state=active]:jarvis-text-glow data-[state=active]:bg-blue-900/20">
              <FileText size={16} className="mr-2" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="mappings" className="data-[state=active]:jarvis-text-glow data-[state=active]:bg-blue-900/20">
              <Cpu size={16} className="mr-2" />
              Mapeamentos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="interactions" className="mt-0">
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : interactions.length > 0 ? (
                interactions.map(interaction => renderInteractionCard(interaction))
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Info size={24} className="mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma interação registrada ainda.</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="metrics" className="mt-0">
            <ScrollArea className="h-[500px] pr-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : Object.keys(metrics).length > 0 ? (
                <div>
                  {Object.entries(metrics).map(([commandType, providers]) => (
                    <div key={commandType} className="mb-6">
                      <h3 className="text-lg font-medium mb-2 flex items-center">
                        {renderCommandTypeBadge(commandType as CommandType)}
                        <span className="ml-2">{commandTypeIcons[commandType as CommandType].label}</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(providers).map(([provider, metric]) => 
                          renderMetricCard(commandType, provider, metric)
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Info size={24} className="mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma métrica disponível ainda.</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="mappings" className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Mapeamentos Atuais</h3>
                  <Button 
                    variant="jarvis" 
                    size="sm"
                    onClick={forceOptimize}
                    disabled={optimizing}
                  >
                    <RefreshCw size={16} className={optimizing ? 'animate-spin mr-2' : 'mr-2'} />
                    Otimizar Mapeamentos
                  </Button>
                </div>
                
                {renderMappingsTable()}
                
                <div className="mt-4 p-4 bg-blue-900/20 rounded-md border commander-border">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Info size={16} className="mr-2" />
                    Sobre Otimização
                  </h4>
                  <p className="text-sm text-blue-200/80">
                    O sistema ajusta automaticamente os mapeamentos a cada semana com base no desempenho 
                    histórico de cada provedor de IA. A otimização manual força essa reavaliação imediatamente.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}