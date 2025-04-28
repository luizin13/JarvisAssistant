import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2, Play, Pause, Square, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Interfaces para os dados
interface DiagnosticoInfo {
  id: string;
  tipo: 'sistema' | 'agente' | 'tarefa' | 'conexao';
  descricao: string;
  severidade: 'info' | 'aviso' | 'erro' | 'critico';
  timestamp: string;
  detalhes?: Record<string, any>;
  sugestoes?: string[];
}

interface CorrecaoInfo {
  id: string;
  diagnostico_id: string;
  descricao: string;
  codigo?: string;
  aplicada: boolean;
  timestamp: string;
  resultado?: string;
}

interface HistoricoMelhoria {
  id: string;
  timestamp: string;
  fase: string;
  diagnosticos: string[];
  correcoes: string[];
  resultadosTeste: any[];
  tempoTotal: number;
  resumo: string;
}

interface EstadoMelhoria {
  emExecucao: boolean;
  cicloAtual: number;
  ultimoCicloTimestamp: string | null;
  isPaused: boolean;
  historicoSize: number;
  ultimoHistorico: HistoricoMelhoria | null;
}

/**
 * Componente para controle do Modo de Melhoria Intensiva
 */
export default function IntensiveImprovementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('status');

  // Consulta o estado atual do sistema de melhoria intensiva
  const { data: estadoMelhoria, isLoading: isLoadingEstado, error: errorEstado, refetch: refetchEstado } = 
    useQuery<EstadoMelhoria>({
      queryKey: ['/api/intensive-improvement/estado'],
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', '/api/intensive-improvement/estado');
          return res.json();
        } catch (error) {
          console.error("Erro ao buscar estado do modo intensivo:", error);
          toast({
            title: "Erro de conexão",
            description: "Não foi possível obter o estado do modo intensivo",
            variant: "destructive"
          });
          return null;
        }
      },
      refetchInterval: 5000 // Atualiza a cada 5 segundos
    });

  // Consulta o histórico de melhorias
  const { data: historicoMelhorias, isLoading: isLoadingHistorico, error: errorHistorico } = 
    useQuery<HistoricoMelhoria[]>({
      queryKey: ['/api/intensive-improvement/historico'],
      queryFn: async () => {
        try {
          const res = await apiRequest('GET', '/api/intensive-improvement/historico');
          return res.json();
        } catch (error) {
          console.error("Erro ao buscar histórico de melhorias:", error);
          toast({
            title: "Erro de conexão",
            description: "Não foi possível obter o histórico de melhorias",
            variant: "destructive"
          });
          return [];
        }
      },
      enabled: activeTab === 'historico'
    });

  // Mutação para iniciar o modo de melhoria intensiva
  const iniciarMutation = useMutation({
    mutationFn: async () => {
      const intervalo = 30; // 30 segundos entre ciclos
      const data = { intervalo };
      const res = await apiRequest('POST', '/api/intensive-improvement/iniciar', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Modo Intensivo Iniciado",
        description: "O sistema de melhoria intensiva foi iniciado com sucesso.",
        variant: "default"
      });
      refetchEstado();
    },
    onError: (error) => {
      toast({
        title: "Erro ao Iniciar",
        description: `Falha ao iniciar o modo intensivo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutação para pausar o modo de melhoria intensiva
  const pausarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/intensive-improvement/pausar');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Modo Intensivo Pausado",
        description: "O sistema de melhoria intensiva foi pausado temporariamente.",
        variant: "default"
      });
      refetchEstado();
    },
    onError: (error) => {
      toast({
        title: "Erro ao Pausar",
        description: `Falha ao pausar o modo intensivo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutação para retomar o modo de melhoria intensiva
  const retomarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/intensive-improvement/retomar');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Modo Intensivo Retomado",
        description: "O sistema de melhoria intensiva foi retomado com sucesso.",
        variant: "default"
      });
      refetchEstado();
    },
    onError: (error) => {
      toast({
        title: "Erro ao Retomar",
        description: `Falha ao retomar o modo intensivo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutação para parar o modo de melhoria intensiva
  const pararMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/intensive-improvement/parar');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Modo Intensivo Parado",
        description: "O sistema de melhoria intensiva foi parado com sucesso.",
        variant: "default"
      });
      refetchEstado();
    },
    onError: (error) => {
      toast({
        title: "Erro ao Parar",
        description: `Falha ao parar o modo intensivo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutação para executar manualmente um ciclo
  const executarCicloMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/intensive-improvement/executar-ciclo');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Ciclo Executado",
        description: "Um ciclo de melhoria intensiva foi executado manualmente com sucesso.",
        variant: "default"
      });
      refetchEstado();
    },
    onError: (error) => {
      toast({
        title: "Erro ao Executar Ciclo",
        description: `Falha ao executar ciclo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Estado de carregamento para qualquer mutação
  const isAnyMutationLoading = 
    iniciarMutation.isPending || 
    pausarMutation.isPending || 
    retomarMutation.isPending || 
    pararMutation.isPending || 
    executarCicloMutation.isPending;

  // Formatador de data
  const formatarDataHora = (timestamp: string | null) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Função para obter o ícone baseado na severidade
  const getIconBySeverity = (severity: string) => {
    switch (severity) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'aviso':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'erro':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'critico':
        return <AlertTriangle className="h-4 w-4 text-red-700" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Função para obter a cor baseada na severidade
  const getColorBySeverity = (severity: string) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'aviso':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'erro':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'critico':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">Modo de Melhoria Intensiva</h1>
          <p className="text-gray-600 dark:text-gray-400">Sistema de auto-evolução, diagnóstico e correção automática</p>
        </div>
        <div className="flex items-center space-x-2">
          {estadoMelhoria?.emExecucao ? (
            estadoMelhoria.isPaused ? (
              <>
                <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                  Pausado
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => retomarMutation.mutate()}
                  disabled={isAnyMutationLoading}
                >
                  {retomarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Retomar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => pararMutation.mutate()}
                  disabled={isAnyMutationLoading}
                >
                  {pararMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Parar
                </Button>
              </>
            ) : (
              <>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  Em Execução
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => pausarMutation.mutate()}
                  disabled={isAnyMutationLoading}
                >
                  {pausarMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Pause className="h-4 w-4 mr-2" />
                  )}
                  Pausar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => pararMutation.mutate()}
                  disabled={isAnyMutationLoading}
                >
                  {pararMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Parar
                </Button>
              </>
            )
          ) : (
            <>
              <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                Inativo
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => iniciarMutation.mutate()}
                disabled={isAnyMutationLoading}
              >
                {iniciarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Iniciar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => executarCicloMutation.mutate()}
                disabled={isAnyMutationLoading}
              >
                {executarCicloMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Executar Ciclo
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          {isLoadingEstado ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2">Carregando estado do sistema...</span>
            </div>
          ) : errorEstado ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                Não foi possível carregar o estado do sistema. {errorEstado.toString()}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Estado do Sistema</CardTitle>
                  <CardDescription>Informações sobre o estado atual do modo de melhoria intensiva</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Status</p>
                      <div className="flex items-center">
                        {estadoMelhoria?.emExecucao ? (
                          estadoMelhoria.isPaused ? (
                            <>
                              <Pause className="h-4 w-4 text-orange-500 mr-2" />
                              <span>Pausado</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 text-green-500 mr-2" />
                              <span>Em execução</span>
                            </>
                          )
                        ) : (
                          <>
                            <Square className="h-4 w-4 text-gray-500 mr-2" />
                            <span>Inativo</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Ciclo Atual</p>
                      <p>{estadoMelhoria?.cicloAtual || 0}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Último Ciclo</p>
                      <p>{formatarDataHora(estadoMelhoria?.ultimoCicloTimestamp || null)}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Histórico</p>
                      <p>{estadoMelhoria?.historicoSize || 0} ciclos registrados</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {estadoMelhoria?.ultimoHistorico && (
                <Card>
                  <CardHeader>
                    <CardTitle>Último Ciclo Executado</CardTitle>
                    <CardDescription>Detalhes do ciclo mais recente</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">ID</p>
                        <p className="text-xs">{estadoMelhoria.ultimoHistorico.id}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Timestamp</p>
                        <p>{formatarDataHora(estadoMelhoria.ultimoHistorico.timestamp || null)}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Fase</p>
                        <p>{estadoMelhoria.ultimoHistorico.fase}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Tempo Total</p>
                        <p>{estadoMelhoria.ultimoHistorico.tempoTotal.toFixed(2)}s</p>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <p className="text-sm font-medium">Resumo</p>
                        <p>{estadoMelhoria.ultimoHistorico.resumo}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Diagnósticos</p>
                        <p>{estadoMelhoria.ultimoHistorico.diagnosticos.length} identificados</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Correções</p>
                        <p>{estadoMelhoria.ultimoHistorico.correcoes.length} aplicadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          {isLoadingHistorico ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2">Carregando histórico de melhorias...</span>
            </div>
          ) : errorHistorico ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                Não foi possível carregar o histórico de melhorias. {errorHistorico.toString()}
              </AlertDescription>
            </Alert>
          ) : !historicoMelhorias || historicoMelhorias.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <Info className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium">Nenhum histórico disponível</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Não há registros de ciclos de melhoria intensiva executados.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {historicoMelhorias.map((historico) => (
                <Card key={historico.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{formatarDataHora(historico.timestamp)}</CardTitle>
                      <Badge variant="outline">
                        {historico.fase}
                      </Badge>
                    </div>
                    <CardDescription>
                      Tempo total: {historico.tempoTotal.toFixed(2)}s
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Resumo</h4>
                      <p className="text-sm">{historico.resumo}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Diagnósticos</h4>
                        <p className="text-sm">{historico.diagnosticos.length} identificados</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Correções</h4>
                        <p className="text-sm">{historico.correcoes.length} aplicadas</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}