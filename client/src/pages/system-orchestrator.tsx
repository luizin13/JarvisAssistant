import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, AlertCircle, Info, BarChart, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tipos para os dados do orquestrador
interface OrchestratorState {
  available: boolean;
  isRunning: boolean;
  currentCycle: number;
  metrics: {
    totalCycles: number;
    totalAnalyses: number;
    totalImplementedChanges: number;
    successRate: number;
    averageCycleDuration: number;
  };
  activeAgents: string[];
  lastUpdateTime: string;
  lastCycleEndTime?: string;
}

interface Analysis {
  id: string;
  agentType: string;
  timestamp: string;
  summary: string;
  details: string;
  suggestedActions: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface Change {
  id: string;
  timestamp: string;
  description: string;
  agentType: string;
  status: 'success' | 'failure';
  rollbackAvailable: boolean;
}

interface OrchestratorConfig {
  cycleDuration: number;
  maxConcurrentAgents: number;
  enabledAgents: string[];
  autoImplementChanges: boolean;
  notifyOnChanges: boolean;
  learningRate: number;
  maxHistoryItems: number;
}

const SystemOrchestratorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Busca o status do orquestrador
  const { data: statusData = {} as OrchestratorState, isLoading: isStatusLoading, error: statusError, refetch: refetchStatus } = useQuery<OrchestratorState>({
    queryKey: ['/api/system-orchestrator/status'],
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });

  // Busca as análises
  const { data: analysesData = [], isLoading: isAnalysesLoading } = useQuery<Analysis[]>({
    queryKey: ['/api/system-orchestrator/analyses'],
    refetchInterval: 5000,
    enabled: activeTab === 'analyses',
  });

  // Busca as mudanças implementadas
  const { data: changesData = [], isLoading: isChangesLoading } = useQuery<Change[]>({
    queryKey: ['/api/system-orchestrator/changes'],
    refetchInterval: 5000,
    enabled: activeTab === 'changes',
  });

  // Busca os logs
  const { data: logsData = [], isLoading: isLogsLoading } = useQuery<string[]>({
    queryKey: ['/api/system-orchestrator/logs'],
    refetchInterval: 5000,
    enabled: activeTab === 'logs',
  });

  // Mutações para controle do orquestrador
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/system-orchestrator/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Falha ao inicializar orquestrador');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Orquestrador inicializado',
        description: 'O orquestrador foi inicializado com sucesso',
        variant: 'default',
      });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/system-orchestrator/status'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro na inicialização',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/system-orchestrator/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Falha ao iniciar orquestrador');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Orquestrador iniciado',
        description: 'O ciclo de evolução contínua foi iniciado com sucesso',
        variant: 'default',
      });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/system-orchestrator/status'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao iniciar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/system-orchestrator/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Falha ao parar orquestrador');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Orquestrador parado',
        description: 'O ciclo de evolução contínua foi interrompido com sucesso',
        variant: 'default',
      });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/system-orchestrator/status'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao parar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const executeCycleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/system-orchestrator/execute-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Falha ao executar ciclo');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Ciclo manual executado',
        description: 'Um ciclo foi executado manualmente com sucesso',
        variant: 'default',
      });
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/system-orchestrator/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system-orchestrator/analyses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system-orchestrator/changes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system-orchestrator/logs'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao executar ciclo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  const isInitialized = statusData?.available;
  const isRunning = statusData?.isRunning;
  
  // Ajusta a formatação de data e hora
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };
  
  // Ajusta a formatação de duração
  const formatDuration = (ms: number) => {
    if (!ms || isNaN(ms)) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  };
  
  // Mapeia a prioridade para cores
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };
  
  // Mapeia tipo de agente para título amigável
  const getAgentTypeTitle = (type: string) => {
    const titles: Record<string, string> = {
      'tester': 'Testes',
      'refactor': 'Refatoração',
      'security': 'Segurança',
      'performance': 'Desempenho',
      'learner': 'Aprendizado',
      'monitor': 'Monitoramento'
    };
    return titles[type] || type;
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Orquestrador de Sistema Autônomo</h1>
          <p className="text-muted-foreground">Sistema de evolução contínua e autogerenciável</p>
        </div>
        <div className="flex space-x-2">
          {!isInitialized && (
            <Button 
              onClick={() => initializeMutation.mutate()}
              disabled={initializeMutation.isPending || isStatusLoading}
            >
              {initializeMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inicializando</>
              ) : (
                'Inicializar'
              )}
            </Button>
          )}
          
          {isInitialized && !isRunning && (
            <Button 
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending || isStatusLoading}
              variant="default"
            >
              {startMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando</>
              ) : (
                'Iniciar Ciclo Contínuo'
              )}
            </Button>
          )}
          
          {isInitialized && isRunning && (
            <Button 
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending || isStatusLoading}
              variant="destructive"
            >
              {stopMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parando</>
              ) : (
                'Parar Ciclo'
              )}
            </Button>
          )}
          
          {isInitialized && (
            <Button 
              onClick={() => executeCycleMutation.mutate()}
              disabled={executeCycleMutation.isPending || isStatusLoading}
              variant="outline"
            >
              {executeCycleMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Executando</>
              ) : (
                'Executar Ciclo Manual'
              )}
            </Button>
          )}
        </div>
      </div>

      {isStatusLoading ? (
        <div className="flex justify-center items-center p-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-4 text-lg">Carregando estado do orquestrador...</span>
        </div>
      ) : statusError ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Erro ao carregar dados do orquestrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{statusError instanceof Error ? statusError.message : 'Erro desconhecido'}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => refetchStatus()} variant="outline">Tentar novamente</Button>
          </CardFooter>
        </Card>
      ) : !statusData?.available ? (
        <Card>
          <CardHeader>
            <CardTitle>Orquestrador não inicializado</CardTitle>
            <CardDescription>
              O orquestrador de sistema precisa ser inicializado para começar a funcionar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Clique no botão Inicializar acima para configurar o orquestrador de sistema
              e habilitar a evolução contínua do sistema.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="analyses">Análises</TabsTrigger>
            <TabsTrigger value="changes">Mudanças</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge variant={isRunning ? "default" : "outline"}>
                        {isRunning ? "Em execução" : "Parado"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ciclo atual:</span>
                      <span>{statusData.currentCycle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Última atualização:</span>
                      <span>{formatDateTime(statusData.lastUpdateTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Último ciclo:</span>
                      <span>{formatDateTime(statusData.lastCycleEndTime)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Métricas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de ciclos:</span>
                      <span>{statusData.metrics?.totalCycles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total de análises:</span>
                      <span>{statusData.metrics?.totalAnalyses || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mudanças implementadas:</span>
                      <span>{statusData.metrics?.totalImplementedChanges || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa de sucesso:</span>
                      <span>{(statusData.metrics?.successRate * 100 || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duração média:</span>
                      <span>{formatDuration(statusData.metrics?.averageCycleDuration || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Agentes Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  {statusData.activeAgents && statusData.activeAgents.length > 0 ? (
                    <div className="space-y-2">
                      {statusData.activeAgents.map((agent: string, index: number) => (
                        <div key={index} className="flex items-center">
                          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                          <span>{getAgentTypeTitle(agent)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Nenhum agente ativo no momento</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="analyses">
            {isAnalysesLoading ? (
              <div className="flex justify-center items-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-4 text-lg">Carregando análises...</span>
              </div>
            ) : !analysesData || analysesData.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sem análises</CardTitle>
                  <CardDescription>
                    Nenhuma análise foi realizada pelos agentes ainda.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    As análises aparecerão aqui quando os agentes completarem seus ciclos de execução.
                    Você pode iniciar o sistema ou executar um ciclo manual para gerar análises.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  {analysesData.map((analysis: Analysis) => (
                    <AccordionItem key={analysis.id} value={analysis.id}>
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center">
                            <Badge className={`mr-3 ${getPriorityColor(analysis.priority)}`}>
                              {analysis.priority.toUpperCase()}
                            </Badge>
                            <span>{analysis.summary}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getAgentTypeTitle(analysis.agentType)} • {formatDateTime(analysis.timestamp)}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 p-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Detalhes</h4>
                            <p className="text-sm whitespace-pre-line">{analysis.details}</p>
                          </div>
                          
                          {analysis.suggestedActions && analysis.suggestedActions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">Ações Sugeridas</h4>
                              <ul className="list-disc pl-5 space-y-1">
                                {analysis.suggestedActions.map((action, i) => (
                                  <li key={i} className="text-sm">{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="flex justify-between pt-2">
                            <Badge variant="outline">Status: {analysis.status}</Badge>
                            <span className="text-xs text-muted-foreground">ID: {analysis.id}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="changes">
            {isChangesLoading ? (
              <div className="flex justify-center items-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-4 text-lg">Carregando mudanças...</span>
              </div>
            ) : !changesData || changesData.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sem mudanças implementadas</CardTitle>
                  <CardDescription>
                    Nenhuma mudança foi implementada pelos agentes ainda.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    As mudanças aparecerão aqui quando o sistema implementar automaticamente 
                    as sugestões de alta prioridade dos agentes.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Table>
                <TableCaption>Lista de mudanças implementadas pelo sistema</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changesData.map((change: Change) => (
                    <TableRow key={change.id}>
                      <TableCell>{change.description}</TableCell>
                      <TableCell>{getAgentTypeTitle(change.agentType)}</TableCell>
                      <TableCell>
                        {change.status === 'success' ? (
                          <Badge variant="default" className="bg-green-500">Sucesso</Badge>
                        ) : (
                          <Badge variant="destructive">Falha</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDateTime(change.timestamp)}</TableCell>
                      <TableCell className="text-right">
                        {change.rollbackAvailable && (
                          <Button size="sm" variant="outline" disabled>
                            Rollback
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="logs">
            {isLogsLoading ? (
              <div className="flex justify-center items-center p-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-4 text-lg">Carregando logs...</span>
              </div>
            ) : !logsData || logsData.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sem logs disponíveis</CardTitle>
                  <CardDescription>
                    Nenhum log foi registrado pelo orquestrador ainda.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Os logs aparecerão aqui conforme o sistema executar suas operações.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Logs do Sistema</CardTitle>
                  <CardDescription>
                    Registro de atividades do orquestrador de sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                    <div className="space-y-1">
                      {logsData.map((log: string, index: number) => (
                        <div key={index} className="text-sm font-mono">
                          {log}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Configurações do Orquestrador</CardTitle>
                  <CardDescription>
                    Ajuste os parâmetros de funcionamento do sistema autônomo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-500 mb-4">
                    <Info className="h-4 w-4 inline mr-2" />
                    A edição das configurações será implementada em uma versão futura.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-implement">Implementação Automática</Label>
                        <p className="text-sm text-muted-foreground">
                          Permite que o sistema implemente automaticamente as sugestões de alta prioridade
                        </p>
                      </div>
                      <Switch id="auto-implement" disabled />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notifications">Notificações</Label>
                        <p className="text-sm text-muted-foreground">
                          Envia notificações sobre mudanças e análises importantes
                        </p>
                      </div>
                      <Switch id="notifications" disabled />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Backup e Restauração</CardTitle>
                  <CardDescription>
                    Exporte e importe a configuração do orquestrador
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Exportar Configuração</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Baixe a configuração atual do orquestrador como um arquivo JSON
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={() => window.open('/api/system-orchestrator/config/export', '_blank')}
                      >
                        Exportar Configuração
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Importar Configuração</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Carregue um arquivo de configuração previamente exportado
                      </p>
                      <input
                        type="file"
                        id="config-upload"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              try {
                                const configJson = event.target?.result as string;
                                
                                const response = await fetch('/api/system-orchestrator/config/import', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ configJson })
                                });
                                
                                if (response.ok) {
                                  toast({
                                    title: 'Configuração importada',
                                    description: 'A configuração foi importada com sucesso',
                                    variant: 'default',
                                  });
                                  
                                  // Atualiza os dados
                                  refetchStatus();
                                  queryClient.invalidateQueries({ queryKey: ['/api/system-orchestrator/status'] });
                                } else {
                                  const error = await response.json();
                                  throw new Error(error.message || 'Erro ao importar configuração');
                                }
                              } catch (error) {
                                toast({
                                  title: 'Erro ao importar',
                                  description: error instanceof Error ? error.message : 'Erro desconhecido',
                                  variant: 'destructive',
                                });
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={() => document.getElementById('config-upload')?.click()}
                      >
                        Selecionar Arquivo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default SystemOrchestratorPage;