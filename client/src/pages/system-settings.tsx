import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Settings, Shield, Activity, Zap, RefreshCw, Download, Upload,
  AlertTriangle, Check, CheckCircle, XCircle, Play, Pause, Clock,
  RotateCw, Database, HardDrive, AlertCircle, ArrowUpRight, BarChart4
} from "lucide-react";

// Interfaces para os dados
interface SystemStatus {
  available: boolean;
  status: string;
  lastCycleAt: string | null;
  activeProviders: string[];
  currentMappings: Record<string, string>;
  activeAgents: number;
  totalAgents: number;
  pendingTasks: number;
  isHealthy: boolean;
  healthChecks: {
    database: boolean;
    memory: boolean;
    externalApis: boolean;
    pendingTasks: boolean;
  };
}

interface ImproveStatus {
  emExecucao: boolean;
  cicloAtual: number;
  ultimoCicloTimestamp: string | null;
  isPaused: boolean;
  historicoSize: number;
  ultimoHistorico: {
    timestamp: string;
    ciclos: number;
    diagnosticos: any[];
    correcoes: any[];
  } | null;
}

interface Diagnostico {
  id: string;
  tipo: string;
  descricao: string;
  severidade: string;
  timestamp: string;
  detalhes?: any;
  sugestoes?: string[];
}

interface DiagnosticosSistema {
  total: number;
  porTipo: Record<string, number>;
  recentes: Diagnostico[];
}

/**
 * Página de configurações do sistema
 */
export default function SystemSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Consulta o status do orquestrador de sistema
  const { 
    data: systemStatus, 
    isLoading: loadingStatus,
    error: statusError,
    refetch: refetchStatus
  } = useQuery<SystemStatus>({
    queryKey: ['/api/system-orchestrator/status'],
    queryFn: async () => {
      try {
        return await apiRequest<SystemStatus>('GET', '/api/system-orchestrator/status');
      } catch (error) {
        console.error("Erro ao buscar status do orquestrador:", error);
        throw error;
      }
    },
    refetchInterval: 10000 // Atualiza a cada 10 segundos
  });

  // Consulta o status do sistema de melhoria intensiva
  const { 
    data: improveStatus, 
    isLoading: loadingImprove,
    error: improveError,
    refetch: refetchImprove
  } = useQuery<ImproveStatus>({
    queryKey: ['/api/intensive-improvement/estado'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/intensive-improvement/estado');
        return response.json();
      } catch (error) {
        console.error("Erro ao buscar status de melhoria intensiva:", error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível obter o status do sistema de melhoria intensiva",
          variant: "destructive"
        });
        return null;
      }
    },
    refetchInterval: 5000 // Atualiza a cada 5 segundos
  });

  // Consulta os diagnósticos do sistema
  const { 
    data: diagnosticos, 
    isLoading: loadingDiag,
    error: diagError,
    refetch: refetchDiag
  } = useQuery<DiagnosticosSistema>({
    queryKey: ['/api/python/diagnosticos/resumo'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/python/diagnosticos');
        const data = await response.json();
        
        // Processar os dados para o formato esperado
        const diags = Array.isArray(data) ? data : [];
        const porTipo: Record<string, number> = {};
        
        diags.forEach((diag: Diagnostico) => {
          porTipo[diag.tipo] = (porTipo[diag.tipo] || 0) + 1;
        });
        
        return {
          total: diags.length,
          porTipo,
          recentes: diags.slice(0, 5) // 5 diagnósticos mais recentes
        };
      } catch (error) {
        console.error("Erro ao buscar diagnósticos:", error);
        toast({
          title: "Erro de conexão",
          description: "Não foi possível obter os diagnósticos do sistema",
          variant: "destructive"
        });
        return {
          total: 0,
          porTipo: {},
          recentes: []
        };
      }
    },
    refetchInterval: 10000
  });

  // Mutação para iniciar o ciclo do orquestrador
  const iniciarCicloMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{success: boolean, message: string}>('POST', '/api/system-orchestrator/cycle');
    },
    onSuccess: () => {
      toast({
        title: "Ciclo iniciado",
        description: "O ciclo do orquestrador foi iniciado com sucesso.",
        variant: "default"
      });
      
      // Atualizar dados após breve delay para dar tempo ao ciclo iniciar
      setTimeout(() => {
        refetchStatus();
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao iniciar ciclo",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutação para iniciar o sistema de melhoria intensiva
  const iniciarMelhoriaMutation = useMutation({
    mutationFn: async () => {
      const intervalo = 30; // 30 segundos entre ciclos
      return await apiRequest<{success: boolean, message: string}>('POST', '/api/intensive-improvement/iniciar', { intervalo });
    },
    onSuccess: () => {
      toast({
        title: "Modo Intensivo Iniciado",
        description: "O sistema de melhoria intensiva foi iniciado com sucesso.",
        variant: "default"
      });
      refetchImprove();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Iniciar",
        description: `Falha ao iniciar o modo intensivo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutação para pausar o sistema de melhoria intensiva
  const pausarMelhoriaMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{success: boolean, message: string}>('POST', '/api/intensive-improvement/pausar');
    },
    onSuccess: () => {
      toast({
        title: "Modo Intensivo Pausado",
        description: "O sistema de melhoria intensiva foi pausado temporariamente.",
        variant: "default"
      });
      refetchImprove();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Pausar",
        description: `Falha ao pausar o modo intensivo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutação para retomar o sistema de melhoria intensiva
  const retomarMelhoriaMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{success: boolean, message: string}>('POST', '/api/intensive-improvement/retomar');
    },
    onSuccess: () => {
      toast({
        title: "Modo Intensivo Retomado",
        description: "O sistema de melhoria intensiva foi retomado com sucesso.",
        variant: "default"
      });
      refetchImprove();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Retomar",
        description: `Falha ao retomar o modo intensivo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutação para parar o sistema de melhoria intensiva
  const pararMelhoriaMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{success: boolean, message: string}>('POST', '/api/intensive-improvement/parar');
    },
    onSuccess: () => {
      toast({
        title: "Modo Intensivo Parado",
        description: "O sistema de melhoria intensiva foi parado com sucesso.",
        variant: "default"
      });
      refetchImprove();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Parar",
        description: `Falha ao parar o modo intensivo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Mutação para executar um ciclo de melhoria manualmente
  const executarCicloMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<{success: boolean, message: string}>('POST', '/api/intensive-improvement/executar-ciclo');
    },
    onSuccess: () => {
      toast({
        title: "Ciclo Executado",
        description: "O ciclo de melhoria intensiva foi executado manualmente com sucesso.",
        variant: "default"
      });
      
      // Recarregar dados após breve delay
      setTimeout(() => {
        refetchImprove();
        refetchDiag();
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Executar Ciclo",
        description: `Falha ao executar ciclo: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Formatar data para exibição
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Mapeamento de cores para severidade
  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critico':
      case 'critíco':
      case 'critica':
      case 'crítico':
      case 'crítica':
      case 'critical':
      case 'erro':
      case 'error':
        return 'bg-red-500';
      case 'aviso':
      case 'warning':
        return 'bg-yellow-500';
      case 'informação':
      case 'informacao':
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="container px-4 py-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie o sistema autoimune, configure o monitoramento e otimize o desempenho
          </p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 max-w-4xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="autoimune">Sistema Autoimune</TabsTrigger>
          <TabsTrigger value="orquestrador">Orquestrador</TabsTrigger>
          <TabsTrigger value="diagnosticos">Diagnósticos</TabsTrigger>
          <TabsTrigger value="agentes">Agentes</TabsTrigger>
          <TabsTrigger value="avancado">Avançado</TabsTrigger>
        </TabsList>

        {/* Dashboard - Visão geral dos sistemas */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status do Sistema */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Status do Sistema
                </CardTitle>
                <CardDescription>Estado atual do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingStatus ? (
                  <div className="flex items-center justify-center h-24">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : statusError ? (
                  <div className="bg-red-100 text-red-800 p-4 rounded-md">
                    Erro ao carregar status do sistema
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estado:</span>
                      <Badge variant={systemStatus?.isHealthy ? "default" : "destructive"}>
                        {systemStatus?.isHealthy ? "Saudável" : "Necessita Atenção"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Último Ciclo:</span>
                      <span className="text-sm">
                        {formatDate(systemStatus?.lastCycleAt || null)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Agentes Ativos:</span>
                      <span className="text-sm">
                        {systemStatus?.activeAgents} / {systemStatus?.totalAgents}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  size="sm" 
                  className="w-full" 
                  variant="outline"
                  onClick={() => refetchStatus()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </CardFooter>
            </Card>

            {/* Status da Melhoria Intensiva */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  Melhoria Intensiva
                </CardTitle>
                <CardDescription>Sistema autoimune</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingImprove ? (
                  <div className="flex items-center justify-center h-24">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : improveError ? (
                  <div className="bg-red-100 text-red-800 p-4 rounded-md">
                    Erro ao carregar status do sistema
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Estado:</span>
                      <Badge variant={improveStatus?.emExecucao ? "default" : "secondary"}>
                        {improveStatus?.emExecucao 
                          ? (improveStatus?.isPaused ? "Pausado" : "Ativo") 
                          : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ciclo Atual:</span>
                      <span className="text-sm">{improveStatus?.cicloAtual || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Última Execução:</span>
                      <span className="text-sm">
                        {formatDate(improveStatus?.ultimoCicloTimestamp || null)}
                      </span>
                    </div>
                    {improveStatus?.ultimoHistorico && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Diagnósticos:</span>
                        <span className="text-sm">
                          {improveStatus.ultimoHistorico.diagnosticos.length}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => executarCicloMutation.mutate()}
                  disabled={executarCicloMutation.isPending}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Executar Ciclo Agora
                </Button>
              </CardFooter>
            </Card>

            {/* Diagnósticos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Diagnósticos
                </CardTitle>
                <CardDescription>Problemas detectados</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingDiag ? (
                  <div className="flex items-center justify-center h-24">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : diagError ? (
                  <div className="bg-red-100 text-red-800 p-4 rounded-md">
                    Erro ao carregar diagnósticos
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total:</span>
                      <Badge variant="outline">{diagnosticos?.total || 0}</Badge>
                    </div>
                    
                    {Object.entries(diagnosticos?.porTipo || {}).map(([tipo, count]) => (
                      <div key={tipo} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{tipo}:</span>
                        <span className="text-sm">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  size="sm" 
                  className="w-full" 
                  variant="outline"
                  onClick={() => setActiveTab('diagnosticos')}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Ver Todos
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Controles Principais do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle>Controles do Sistema</CardTitle>
              <CardDescription>
                Ações para gerenciamento do sistema autoimune e monitoramento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Controle do Sistema de Melhoria Intensiva */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Melhoria Intensiva
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-improve">Ativar melhoria automática</Label>
                      <Switch 
                        id="auto-improve"
                        checked={improveStatus?.emExecucao && !improveStatus?.isPaused}
                        onCheckedChange={(checked) => {
                          if (!improveStatus?.emExecucao && checked) {
                            iniciarMelhoriaMutation.mutate();
                          } else if (improveStatus?.emExecucao && !checked) {
                            pararMelhoriaMutation.mutate();
                          }
                        }}
                        disabled={loadingImprove || iniciarMelhoriaMutation.isPending || 
                                 pararMelhoriaMutation.isPending}
                      />
                    </div>
                    
                    {improveStatus?.emExecucao && !improveStatus?.isPaused && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => pausarMelhoriaMutation.mutate()}
                        disabled={pausarMelhoriaMutation.isPending}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar
                      </Button>
                    )}
                    
                    {improveStatus?.emExecucao && improveStatus?.isPaused && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="w-full"
                        onClick={() => retomarMelhoriaMutation.mutate()}
                        disabled={retomarMelhoriaMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Retomar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Controle do Orquestrador */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Orquestrador
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Status: {systemStatus?.status || "Desconhecido"}
                      </span>
                      <Badge variant={systemStatus?.available ? "default" : "secondary"}>
                        {systemStatus?.available ? "Disponível" : "Indisponível"}
                      </Badge>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => iniciarCicloMutation.mutate()}
                      disabled={iniciarCicloMutation.isPending || !systemStatus?.available}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Iniciar Ciclo
                    </Button>
                  </div>
                </div>

                {/* Verificação de Saúde do Sistema */}
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Saúde do Sistema
                  </h3>
                  
                  {systemStatus?.healthChecks ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Banco de Dados:</span>
                        {systemStatus.healthChecks.database ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Uso de Memória:</span>
                        {systemStatus.healthChecks.memory ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">APIs Externas:</span>
                        {systemStatus.healthChecks.externalApis ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Tarefas Pendentes:</span>
                        {systemStatus.healthChecks.pendingTasks ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      Dados de saúde não disponíveis
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sistema Autoimune */}
        <TabsContent value="autoimune" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Sistema Autoimune
              </CardTitle>
              <CardDescription>
                Sistema de auto-diagnóstico, correção e aprimoramento contínuo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingImprove ? (
                <div className="flex items-center justify-center h-24">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">Estado</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={improveStatus?.emExecucao ? "default" : "secondary"}>
                          {improveStatus?.emExecucao 
                            ? (improveStatus?.isPaused ? "Pausado" : "Ativo") 
                            : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Ciclo Atual:</span>
                        <span className="text-sm">{improveStatus?.cicloAtual || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Histórico:</span>
                        <span className="text-sm">{improveStatus?.historicoSize || 0} ciclos</span>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">Última Execução</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Data:</span>
                        <span className="text-sm">
                          {formatDate(improveStatus?.ultimoCicloTimestamp || null)}
                        </span>
                      </div>
                      {improveStatus?.ultimoHistorico && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Diagnósticos:</span>
                            <span className="text-sm">
                              {improveStatus.ultimoHistorico.diagnosticos.length}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Correções:</span>
                            <span className="text-sm">
                              {improveStatus.ultimoHistorico.correcoes.length}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">Ações</h3>
                      <div className="space-y-2">
                        {!improveStatus?.emExecucao ? (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full"
                            onClick={() => iniciarMelhoriaMutation.mutate()}
                            disabled={iniciarMelhoriaMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Iniciar Sistema
                          </Button>
                        ) : improveStatus?.isPaused ? (
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full"
                            onClick={() => retomarMelhoriaMutation.mutate()}
                            disabled={retomarMelhoriaMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Retomar
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => pausarMelhoriaMutation.mutate()}
                            disabled={pausarMelhoriaMutation.isPending}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pausar
                          </Button>
                        )}
                        
                        {improveStatus?.emExecucao && (
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full"
                            onClick={() => pararMelhoriaMutation.mutate()}
                            disabled={pararMelhoriaMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Parar Sistema
                          </Button>
                        )}
                        
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full"
                          onClick={() => executarCicloMutation.mutate()}
                          disabled={executarCicloMutation.isPending}
                        >
                          <RotateCw className="h-4 w-4 mr-2" />
                          Executar Ciclo Agora
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Último Ciclo de Melhoria</h3>
                    
                    {improveStatus?.ultimoHistorico ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Diagnósticos Encontrados</h4>
                          {improveStatus.ultimoHistorico.diagnosticos.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              Nenhum diagnóstico encontrado no último ciclo.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {improveStatus.ultimoHistorico.diagnosticos.map((diag: Diagnostico) => (
                                <div key={diag.id} className="p-3 border rounded-lg">
                                  <div className="flex items-start justify-between mb-2">
                                    <h5 className="text-sm font-medium">{diag.descricao}</h5>
                                    <Badge className={getSeverityColor(diag.severidade)}>
                                      {diag.severidade}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Tipo: {diag.tipo} • {formatDate(diag.timestamp)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Correções Aplicadas</h4>
                          {improveStatus.ultimoHistorico.correcoes.length === 0 ? (
                            <div className="text-sm text-muted-foreground">
                              Nenhuma correção aplicada no último ciclo.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {improveStatus.ultimoHistorico.correcoes.map((correcao: any) => (
                                <div key={correcao.id} className="p-3 border rounded-lg">
                                  <div className="mb-2">
                                    <h5 className="text-sm font-medium">{correcao.descricao}</h5>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Aplicada: {correcao.aplicada ? 'Sim' : 'Não'} • 
                                    {formatDate(correcao.timestamp)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        Nenhum histórico de ciclo de melhoria disponível.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orquestrador */}
        <TabsContent value="orquestrador" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart4 className="h-5 w-5 text-primary" />
                Orquestrador do Sistema
              </CardTitle>
              <CardDescription>
                Gerenciamento e configuração do orquestrador central
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStatus ? (
                <div className="flex items-center justify-center h-24">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : statusError ? (
                <div className="bg-red-100 text-red-800 p-4 rounded-md">
                  Erro ao carregar status do orquestrador
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">Estado</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Disponível:</span>
                        <Badge variant={systemStatus?.available ? "default" : "secondary"}>
                          {systemStatus?.available ? "Sim" : "Não"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Status:</span>
                        <span className="text-sm">{systemStatus?.status || "Desconhecido"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Último Ciclo:</span>
                        <span className="text-sm">
                          {formatDate(systemStatus?.lastCycleAt || null)}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">Agentes</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Ativos:</span>
                        <span className="text-sm">
                          {systemStatus?.activeAgents || 0} / {systemStatus?.totalAgents || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Tarefas Pendentes:</span>
                        <span className="text-sm">{systemStatus?.pendingTasks || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Saúde do Sistema:</span>
                        <Badge variant={systemStatus?.isHealthy ? "default" : "destructive"}>
                          {systemStatus?.isHealthy ? "Saudável" : "Necessita Atenção"}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h3 className="text-lg font-medium mb-2">Ações</h3>
                      <div className="space-y-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="w-full"
                          onClick={() => iniciarCicloMutation.mutate()}
                          disabled={iniciarCicloMutation.isPending || !systemStatus?.available}
                        >
                          <RotateCw className="h-4 w-4 mr-2" />
                          Iniciar Ciclo do Orquestrador
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => refetchStatus()}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Atualizar Status
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Mapeamentos de Provedores</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Provedores Disponíveis</h4>
                        <div className="space-y-1">
                          {systemStatus?.activeProviders?.map((provider: string) => (
                            <div key={provider} className="flex items-center">
                              <Check className="h-4 w-4 text-green-500 mr-2" />
                              <span className="text-sm">{provider}</span>
                            </div>
                          )) || <div className="text-sm text-muted-foreground">Nenhum provedor disponível</div>}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Mapeamentos Atuais</h4>
                        <div className="space-y-1">
                          {systemStatus?.currentMappings ? 
                            Object.entries(systemStatus.currentMappings).map(([type, provider]) => (
                              <div key={type} className="flex items-center justify-between">
                                <span className="text-sm font-medium">{type}:</span>
                                <span className="text-sm">{provider}</span>
                              </div>
                            ))
                            : <div className="text-sm text-muted-foreground">Nenhum mapeamento disponível</div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnósticos */}
        <TabsContent value="diagnosticos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                Diagnósticos do Sistema
              </CardTitle>
              <CardDescription>
                Problemas detectados pelo sistema autoimune
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDiag ? (
                <div className="flex items-center justify-center h-24">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : diagError ? (
                <div className="bg-red-100 text-red-800 p-4 rounded-md">
                  Erro ao carregar diagnósticos
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Total de Diagnósticos: {diagnosticos?.total || 0}
                    </h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => refetchDiag()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Object.entries(diagnosticos?.porTipo || {}).map(([tipo, count]) => (
                      <Badge key={tipo} variant="outline">
                        {tipo}: {count}
                      </Badge>
                    ))}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Diagnósticos Recentes</h3>
                    
                    {diagnosticos?.recentes.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        Nenhum diagnóstico encontrado.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {diagnosticos?.recentes.map((diag: Diagnostico) => (
                          <div key={diag.id} className="p-4 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="text-base font-medium">{diag.descricao}</h4>
                                <p className="text-xs text-muted-foreground">
                                  ID: {diag.id}
                                </p>
                              </div>
                              <Badge className={getSeverityColor(diag.severidade)}>
                                {diag.severidade}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <h5 className="text-sm font-medium mb-1">Detalhes</h5>
                                <div className="text-sm text-muted-foreground">
                                  <p>Tipo: {diag.tipo}</p>
                                  <p>Data: {formatDate(diag.timestamp)}</p>
                                  {diag.detalhes && (
                                    <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-20">
                                      {JSON.stringify(diag.detalhes, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                              
                              {diag.sugestoes && diag.sugestoes.length > 0 && (
                                <div>
                                  <h5 className="text-sm font-medium mb-1">Sugestões</h5>
                                  <ul className="list-disc list-inside text-sm">
                                    {diag.sugestoes.map((sugestao, index) => (
                                      <li key={index} className="text-muted-foreground">
                                        {sugestao}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agentes */}
        <TabsContent value="agentes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Agentes</CardTitle>
              <CardDescription>
                Configure os agentes especializados do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <div className="mb-4">
                  <HardDrive className="h-16 w-16 mx-auto text-muted-foreground/60" />
                </div>
                <h2 className="text-xl font-medium">Funcionalidade Em Desenvolvimento</h2>
                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                  O gerenciamento de agentes estará disponível em breve, permitindo o controle
                  detalhado de cada agente especializado do sistema.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Avançado */}
        <TabsContent value="avancado" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Avançadas</CardTitle>
              <CardDescription>
                Opções avançadas de configuração do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Backup e Restauração</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Configuração
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      Importar Configuração
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Manutenção</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button variant="secondary" className="w-full">
                      <Database className="h-4 w-4 mr-2" />
                      Limpar Cache
                    </Button>
                    <Button variant="secondary" className="w-full">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Reiniciar Orquestrador
                    </Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg border-red-200 dark:border-red-900">
                  <h3 className="text-lg font-medium mb-2 text-red-600 dark:text-red-400">
                    Zona de Perigo
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded text-sm text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4 inline-block mr-2" />
                      As ações abaixo podem afetar drasticamente o funcionamento do sistema. 
                      Use apenas em situações extremas.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button variant="destructive" className="w-full">
                        Redefinir Todas as Configurações
                      </Button>
                      <Button variant="destructive" className="w-full">
                        Limpar Todos os Dados
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}