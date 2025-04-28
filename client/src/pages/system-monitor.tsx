import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, AlertTriangle, CheckCircle, PlayCircle, PauseCircle, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Tipos
interface Task {
  id: string;
  titulo: string;
  descricao: string;
  estado: 'pendente' | 'em_andamento' | 'concluida' | 'falha';
  agente_responsavel: string | null;
  prioridade: string;
  timestamp_criacao: string;
  timestamp_atualizacao: string | null;
  resultado: string | null;
}

interface Diagnostic {
  id: string;
  tipo: 'sistema' | 'agente' | 'tarefa' | 'conexao';
  descricao: string;
  severidade: 'info' | 'aviso' | 'erro' | 'critico';
  timestamp: string;
  detalhes: any;
  sugestoes: string[] | null;
}

interface Correction {
  id: string;
  diagnostico_id: string | null;
  descricao: string;
  codigo: string | null;
  aplicada: boolean;
  timestamp: string;
  resultado: string | null;
}

interface Suggestion {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  prioridade: string;
  implementada: boolean;
  timestamp: string;
  detalhes: any;
}

interface SystemStatus {
  autoImprovementStatus: {
    isInitialized: boolean;
    taskSchedulerStatus: {
      enabled: boolean;
      intervalMinutes: number;
      isRunning: boolean;
      lastRunAt: string | null;
      nextRunAt: string | null;
    };
    orchestratorEnabled: boolean;
    diagnosticMonitorEnabled: boolean;
  };
}

// Componente para Gerenciamento de Sistema
export default function SystemMonitorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tarefas");

  // Consultas para carregar dados
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/python/tarefas'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/python/tarefas');
        return response.data as Task[];
      } catch (error) {
        console.error("Erro ao buscar tarefas:", error);
        return [];
      }
    },
    refetchInterval: 10000 // Recarrega a cada 10 segundos
  });

  const { data: diagnostics, isLoading: diagnosticsLoading } = useQuery({
    queryKey: ['/api/python/diagnosticos'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/python/diagnosticos');
        return response.data as Diagnostic[];
      } catch (error) {
        console.error("Erro ao buscar diagnósticos:", error);
        return [];
      }
    },
    refetchInterval: 10000
  });

  const { data: corrections, isLoading: correctionsLoading } = useQuery({
    queryKey: ['/api/python/correcoes'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/python/correcoes');
        return response.data as Correction[];
      } catch (error) {
        console.error("Erro ao buscar correções:", error);
        return [];
      }
    },
    refetchInterval: 10000
  });

  const { data: suggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/python/sugestoes'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/python/sugestoes');
        return response.data as Suggestion[];
      } catch (error) {
        console.error("Erro ao buscar sugestões:", error);
        return [];
      }
    },
    refetchInterval: 10000
  });

  const { data: systemStatus, isLoading: systemStatusLoading } = useQuery({
    queryKey: ['/api/auto-improvement/status'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/auto-improvement/status');
        return {
          autoImprovementStatus: response.data // Ajuste na estrutura para corresponder ao tipo SystemStatus
        } as SystemStatus;
      } catch (error) {
        console.error('Erro ao buscar status do sistema:', error);
        return null;
      }
    },
    refetchInterval: 5000
  });

  // Mutations
  const startSystemMutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/auto-improvement/start');
    },
    onSuccess: () => {
      toast({
        title: "Sistema Iniciado",
        description: "O sistema de auto-melhoria foi iniciado com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auto-improvement/status'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao Iniciar Sistema",
        description: "Não foi possível iniciar o sistema de auto-melhoria."
      });
    }
  });

  const stopSystemMutation = useMutation({
    mutationFn: async () => {
      await axios.post('/api/auto-improvement/stop');
    },
    onSuccess: () => {
      toast({
        title: "Sistema Parado",
        description: "O sistema de auto-melhoria foi parado com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auto-improvement/status'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao Parar Sistema",
        description: "Não foi possível parar o sistema de auto-melhoria."
      });
    }
  });

  const executeCycleMutation = useMutation({
    mutationFn: async () => {
      try {
        const response = await axios.post('/api/auto-improvement/execute-cycle');
        return response.data;
      } catch (error: any) {
        if (error.response && error.response.status === 501) {
          return { notImplemented: true, message: error.response.data.message };
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data && data.success) {
        // Verificar se diagnosticsCreated ou tasksProcessed possui informações
        const diagnosticsMessage = data.details?.diagnosticsCreated 
          ? `${data.details.diagnosticsCreated} diagnósticos criados. ` 
          : '';
        
        const tasksMessage = data.details?.tasksProcessed 
          ? `${data.details.tasksProcessed} tarefas processadas.` 
          : '';
          
        toast({
          title: "Ciclo Executado com Sucesso",
          description: `${diagnosticsMessage}${tasksMessage}`
        });
      } else if (data && (data.notImplemented || (data.message && data.message.includes("não implementada")))) {
        toast({
          title: "Funcionalidade em Desenvolvimento",
          description: "A execução manual de ciclos ainda está sendo implementada. O sistema continua operando automaticamente."
        });
      } else {
        toast({
          title: "Ciclo Executado",
          description: "O ciclo de auto-melhoria foi executado."
        });
      }
      
      // Invalidar todas as consultas relevantes para atualizar a interface
      queryClient.invalidateQueries({ queryKey: ['/api/auto-improvement/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/python/tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/python/diagnosticos'] });
      queryClient.invalidateQueries({ queryKey: ['/api/python/correcoes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/python/sugestoes'] });
    },
    onError: (error: any) => {
      let errorMessage = "Não foi possível executar o ciclo de auto-melhoria.";
      
      // Verificar se há uma mensagem de erro mais específica
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        variant: "destructive",
        title: "Erro ao Executar Ciclo",
        description: errorMessage
      });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (newTask: any) => {
      await axios.post('/api/python/tarefas', newTask);
    },
    onSuccess: () => {
      toast({
        title: "Tarefa Criada",
        description: "A tarefa foi criada com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/python/tarefas'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao Criar Tarefa",
        description: "Não foi possível criar a tarefa."
      });
    }
  });

  const applyCorrectionMutation = useMutation({
    mutationFn: async (correctionId: string) => {
      await axios.patch(`/api/python/correcoes/${correctionId}`, { aplicada: true });
    },
    onSuccess: () => {
      toast({
        title: "Correção Aplicada",
        description: "A correção foi aplicada com sucesso."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/python/correcoes'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Erro ao Aplicar Correção",
        description: "Não foi possível aplicar a correção."
      });
    }
  });

  // Funções auxiliares
  const getStateBadge = (state: string) => {
    switch (state) {
      case 'pendente':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pendente</Badge>;
      case 'em_andamento':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Em Andamento</Badge>;
      case 'concluida':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Concluída</Badge>;
      case 'falha':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Falha</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'info':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Informação</Badge>;
      case 'aviso':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Aviso</Badge>;
      case 'erro':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Erro</Badge>;
      case 'critico':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Crítico</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="container px-4 py-6">
      <h1 className="text-3xl font-bold mb-2">Monitor do Sistema</h1>
      <p className="text-muted-foreground mb-6">Gerenciamento de tarefas, diagnósticos e auto-melhoria do sistema</p>

      {/* Status do Sistema */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Status do Sistema</CardTitle>
          <CardDescription>Estado atual do sistema de auto-melhoria</CardDescription>
        </CardHeader>
        <CardContent>
          {systemStatusLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : systemStatus && systemStatus.autoImprovementStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">Agendador de Tarefas</h3>
                <div className="space-y-2">
                  {systemStatus.autoImprovementStatus.taskSchedulerStatus ? (
                    <>
                      <div className="flex items-center">
                        <span className="mr-2">Status:</span>
                        {systemStatus.autoImprovementStatus.taskSchedulerStatus.enabled ? (
                          <Badge className="bg-green-50 text-green-700">Ativo</Badge>
                        ) : (
                          <Badge className="bg-gray-50 text-gray-700">Inativo</Badge>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">Intervalo:</span>
                        <span>{systemStatus.autoImprovementStatus.taskSchedulerStatus.intervalMinutes} minutos</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">Última execução:</span>
                        <span>{formatDate(systemStatus.autoImprovementStatus.taskSchedulerStatus.lastRunAt)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="mr-2">Próxima execução:</span>
                        <span>{formatDate(systemStatus.autoImprovementStatus.taskSchedulerStatus.nextRunAt)}</span>
                      </div>
                    </>
                  ) : (
                    <div>Informações do agendador não disponíveis</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">Monitoramento</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="mr-2">Orquestrador:</span>
                    {systemStatus.autoImprovementStatus.orchestratorEnabled !== undefined ? (
                      systemStatus.autoImprovementStatus.orchestratorEnabled ? (
                        <Badge className="bg-green-50 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge className="bg-gray-50 text-gray-700">Inativo</Badge>
                      )
                    ) : (
                      <Badge className="bg-yellow-50 text-yellow-700">Desconhecido</Badge>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">Monitor de Diagnósticos:</span>
                    {systemStatus.autoImprovementStatus.diagnosticMonitorEnabled !== undefined ? (
                      systemStatus.autoImprovementStatus.diagnosticMonitorEnabled ? (
                        <Badge className="bg-green-50 text-green-700">Ativo</Badge>
                      ) : (
                        <Badge className="bg-gray-50 text-gray-700">Inativo</Badge>
                      )
                    ) : (
                      <Badge className="bg-yellow-50 text-yellow-700">Desconhecido</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                Não foi possível carregar o status do sistema.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => executeCycleMutation.mutate()}
            disabled={executeCycleMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Executar Ciclo
          </Button>
          {systemStatus && systemStatus.autoImprovementStatus && systemStatus.autoImprovementStatus.isInitialized ? (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => stopSystemMutation.mutate()}
              disabled={stopSystemMutation.isPending}
            >
              <PauseCircle className="h-4 w-4 mr-2" />
              Parar Sistema
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => startSystemMutation.mutate()}
              disabled={startSystemMutation.isPending}
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              Iniciar Sistema
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Abas para as diferentes seções */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="diagnosticos">Diagnósticos</TabsTrigger>
          <TabsTrigger value="correcoes">Correções</TabsTrigger>
          <TabsTrigger value="sugestoes">Sugestões</TabsTrigger>
        </TabsList>

        {/* Conteúdo da aba Tarefas */}
        <TabsContent value="tarefas" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Tarefas do Sistema</h2>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/python/tarefas'] })}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>

          {tasksLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map(task => (
                <Card key={task.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{task.titulo}</CardTitle>
                      {getStateBadge(task.estado)}
                    </div>
                    <CardDescription>
                      {task.agente_responsavel ? `Agente: ${task.agente_responsavel}` : 'Sem agente designado'} • 
                      Prioridade: {task.prioridade.charAt(0).toUpperCase() + task.prioridade.slice(1)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">{task.descricao}</p>
                    {task.resultado && (
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold mb-1">Resultado:</h4>
                        <p className="text-xs bg-muted p-2 rounded">{task.resultado}</p>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-muted-foreground mt-4">
                      <span>Criado em: {formatDate(task.timestamp_criacao)}</span>
                      {task.timestamp_atualizacao && (
                        <span>Atualizado em: {formatDate(task.timestamp_atualizacao)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Nenhuma tarefa</AlertTitle>
              <AlertDescription>
                Não há tarefas registradas no sistema.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Conteúdo da aba Diagnósticos */}
        <TabsContent value="diagnosticos" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Diagnósticos do Sistema</h2>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/python/diagnosticos'] })}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>

          {diagnosticsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : diagnostics && diagnostics.length > 0 ? (
            <div className="space-y-4">
              {diagnostics.map(diagnostic => (
                <Card key={diagnostic.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{diagnostic.descricao}</CardTitle>
                      {getSeverityBadge(diagnostic.severidade)}
                    </div>
                    <CardDescription>
                      Tipo: {diagnostic.tipo.charAt(0).toUpperCase() + diagnostic.tipo.slice(1)} • 
                      {formatDate(diagnostic.timestamp)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {diagnostic.detalhes && (
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold mb-1">Detalhes:</h4>
                        <p className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
                          {JSON.stringify(diagnostic.detalhes, null, 2)}
                        </p>
                      </div>
                    )}
                    {diagnostic.sugestoes && diagnostic.sugestoes.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold mb-1">Sugestões:</h4>
                        <ul className="text-xs list-disc list-inside">
                          {diagnostic.sugestoes.map((sugestao, index) => (
                            <li key={index}>{sugestao}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Nenhum diagnóstico</AlertTitle>
              <AlertDescription>
                Não há diagnósticos registrados no sistema.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Conteúdo da aba Correções */}
        <TabsContent value="correcoes" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Correções do Sistema</h2>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/python/correcoes'] })}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>

          {correctionsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : corrections && corrections.length > 0 ? (
            <div className="space-y-4">
              {corrections.map(correction => (
                <Card key={correction.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{correction.descricao}</CardTitle>
                      {correction.aplicada ? (
                        <Badge className="bg-green-50 text-green-700">Aplicada</Badge>
                      ) : (
                        <Badge className="bg-yellow-50 text-yellow-700">Pendente</Badge>
                      )}
                    </div>
                    <CardDescription>
                      {correction.diagnostico_id ? `Diagnóstico: ${correction.diagnostico_id}` : 'Sem diagnóstico associado'} • 
                      {formatDate(correction.timestamp)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {correction.codigo && (
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold mb-1">Código:</h4>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
                          {correction.codigo}
                        </pre>
                      </div>
                    )}
                    {correction.resultado && (
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold mb-1">Resultado:</h4>
                        <p className="text-xs bg-muted p-2 rounded">{correction.resultado}</p>
                      </div>
                    )}
                  </CardContent>
                  {!correction.aplicada && (
                    <CardFooter className="pt-0 flex justify-end">
                      <Button 
                        size="sm" 
                        onClick={() => applyCorrectionMutation.mutate(correction.id)}
                        disabled={applyCorrectionMutation.isPending}
                      >
                        Aplicar Correção
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Nenhuma correção</AlertTitle>
              <AlertDescription>
                Não há correções registradas no sistema.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Conteúdo da aba Sugestões */}
        <TabsContent value="sugestoes" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Sugestões de Melhoria</h2>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/python/sugestoes'] })}
            >
              <RotateCcw className="h-4 w-4 mr-2" /> Atualizar
            </Button>
          </div>

          {suggestionsLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="space-y-4">
              {suggestions.map(suggestion => (
                <Card key={suggestion.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{suggestion.titulo}</CardTitle>
                      {suggestion.implementada ? (
                        <Badge className="bg-green-50 text-green-700">Implementada</Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-700">Pendente</Badge>
                      )}
                    </div>
                    <CardDescription>
                      Tipo: {suggestion.tipo.charAt(0).toUpperCase() + suggestion.tipo.slice(1)} • 
                      Prioridade: {suggestion.prioridade.charAt(0).toUpperCase() + suggestion.prioridade.slice(1)} • 
                      {formatDate(suggestion.timestamp)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">{suggestion.descricao}</p>
                    {suggestion.detalhes && (
                      <div className="mt-2">
                        <h4 className="text-sm font-semibold mb-1">Detalhes:</h4>
                        <p className="text-xs bg-muted p-2 rounded overflow-auto max-h-24">
                          {JSON.stringify(suggestion.detalhes, null, 2)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Nenhuma sugestão</AlertTitle>
              <AlertDescription>
                Não há sugestões registradas no sistema.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}