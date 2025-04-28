import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, PlayCircle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function PythonAPIPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Consulta status da API Python
  const { 
    data: apiStatus, 
    isLoading: isLoadingStatus, 
    error: statusError 
  } = useQuery({
    queryKey: ['/api/python/status'],
    queryFn: async () => {
      const res = await fetch('/api/python/status');
      return res.json();
    },
    refetchInterval: 5000 // Atualiza a cada 5 segundos
  });
  
  // Iniciar API Python
  const startApiMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/python/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "API de Gerenciamento em inicialização",
        description: "Aguarde alguns segundos enquanto a API de Gerenciamento é iniciada...",
      });
      // Atualizar status após alguns segundos
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/python/status'] });
      }, 3000);
    },
    onError: (error) => {
      toast({
        title: "Erro ao iniciar API de Gerenciamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  });
  
  // Dados das tarefas
  const { 
    data: tarefas,
    isLoading: isLoadingTarefas
  } = useQuery({
    queryKey: ['/api/python/tarefas'],
    queryFn: async () => {
      if (!apiStatus?.connected) return [];
      const res = await fetch('/api/python/tarefas');
      return res.json();
    },
    enabled: !!apiStatus?.connected
  });
  
  // Dados dos diagnósticos
  const { 
    data: diagnosticos,
    isLoading: isLoadingDiagnosticos
  } = useQuery({
    queryKey: ['/api/python/diagnosticos'],
    queryFn: async () => {
      if (!apiStatus?.connected) return [];
      const res = await fetch('/api/python/diagnosticos');
      return res.json();
    },
    enabled: !!apiStatus?.connected
  });
  
  // Dados das correções
  const { 
    data: correcoes,
    isLoading: isLoadingCorrecoes
  } = useQuery({
    queryKey: ['/api/python/correcoes'],
    queryFn: async () => {
      if (!apiStatus?.connected) return [];
      const res = await fetch('/api/python/correcoes');
      return res.json();
    },
    enabled: !!apiStatus?.connected
  });
  
  // Dados das sugestões
  const { 
    data: sugestoes,
    isLoading: isLoadingSugestoes
  } = useQuery({
    queryKey: ['/api/python/sugestoes'],
    queryFn: async () => {
      if (!apiStatus?.connected) return [];
      const res = await fetch('/api/python/sugestoes');
      return res.json();
    },
    enabled: !!apiStatus?.connected
  });
  
  const getStatusBadge = () => {
    if (isLoadingStatus) {
      return <Badge variant="outline" className="ml-2 gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Verificando</Badge>;
    }
    
    if (statusError) {
      return <Badge variant="destructive" className="ml-2 gap-1"><XCircle className="h-3 w-3" /> Erro</Badge>;
    }
    
    if (apiStatus?.connected) {
      return <Badge variant="success" className="ml-2 gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>;
    }
    
    return <Badge variant="secondary" className="ml-2 gap-1"><AlertCircle className="h-3 w-3" /> Desconectado</Badge>;
  };
  
  const renderOverview = () => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          Status da API de Gerenciamento {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          API JavaScript para gerenciamento autônomo de tarefas, diagnósticos e sugestões
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!apiStatus?.connected ? (
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">API de Gerenciamento não está disponível</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              A API de Gerenciamento não está em execução no momento. Inicie-a para ter acesso aos recursos de gerenciamento autônomo.
            </p>
            <Button 
              onClick={() => startApiMutation.mutate()}
              disabled={startApiMutation.isPending}
              className="gap-2"
            >
              {startApiMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              Iniciar API de Gerenciamento
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Tarefas</h3>
                <div className="flex justify-between">
                  <span className="text-2xl font-bold">{tarefas?.length || 0}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                {apiStatus?.tarefas?.por_estado && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(apiStatus.tarefas.por_estado).map(([estado, count]) => (
                      <div key={estado} className="flex justify-between text-sm">
                        <span className="capitalize">{estado}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Diagnósticos</h3>
                <div className="flex justify-between">
                  <span className="text-2xl font-bold">{diagnosticos?.length || 0}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                {apiStatus?.diagnosticos?.por_severidade && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(apiStatus.diagnosticos.por_severidade).map(([severidade, count]) => (
                      <div key={severidade} className="flex justify-between text-sm">
                        <span className="capitalize">{severidade}</span>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Correções</h3>
                <div className="flex justify-between">
                  <span className="text-2xl font-bold">{correcoes?.length || 0}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                {apiStatus?.correcoes && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Aplicadas</span>
                      <span>{apiStatus.correcoes.aplicadas || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pendentes</span>
                      <span>{apiStatus.correcoes.pendentes || 0}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Sugestões</h3>
                <div className="flex justify-between">
                  <span className="text-2xl font-bold">{sugestoes?.length || 0}</span>
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                {apiStatus?.sugestoes && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Implementadas</span>
                      <span>{apiStatus.sugestoes.implementadas || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pendentes</span>
                      <span>{apiStatus.sugestoes.pendentes || 0}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  const renderTasksList = () => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Tarefas</CardTitle>
        <CardDescription>Lista de tarefas gerenciadas pela API de Gerenciamento</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingTarefas ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !apiStatus?.connected ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p>API de Gerenciamento não está conectada</p>
          </div>
        ) : tarefas?.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma tarefa encontrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tarefas?.map((tarefa) => (
              <div key={tarefa.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{tarefa.titulo}</h3>
                  <StatusBadge status={tarefa.estado} />
                </div>
                <p className="text-sm text-muted-foreground mb-3">{tarefa.descricao}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">Prioridade: {tarefa.prioridade}</Badge>
                  {tarefa.agente_responsavel && (
                    <Badge variant="outline">Agente: {tarefa.agente_responsavel}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  const renderDiagnosticosList = () => (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Diagnósticos</CardTitle>
        <CardDescription>Diagnósticos gerados pela API de Gerenciamento</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingDiagnosticos ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !apiStatus?.connected ? (
          <div className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p>API de Gerenciamento não está conectada</p>
          </div>
        ) : diagnosticos?.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">Nenhum diagnóstico encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {diagnosticos?.map((diagnostico) => (
              <div key={diagnostico.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">{diagnostico.tipo}</h3>
                  <SeveridadeBadge severidade={diagnostico.severidade} />
                </div>
                <p className="text-sm text-muted-foreground mb-3">{diagnostico.descricao}</p>
                {diagnostico.sugestoes && diagnostico.sugestoes.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium mb-1">Sugestões:</h4>
                    <ul className="text-xs text-muted-foreground list-disc pl-5">
                      {diagnostico.sugestoes.map((sugestao, index) => (
                        <li key={index}>{sugestao}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-2">API de Gerenciamento Integrada</h1>
      <p className="text-muted-foreground mb-6">
        Sistema de gerenciamento autônomo de tarefas, diagnósticos e sugestões (implementação JavaScript)
      </p>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          <TabsTrigger value="diagnosticos">Diagnósticos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          {renderOverview()}
        </TabsContent>
        
        <TabsContent value="tarefas">
          {renderTasksList()}
        </TabsContent>
        
        <TabsContent value="diagnosticos">
          {renderDiagnosticosList()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'pendente':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pendente</Badge>;
    case 'em_andamento':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Em andamento</Badge>;
    case 'concluida':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Concluída</Badge>;
    case 'falha':
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Falha</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface SeveridadeBadgeProps {
  severidade: string;
}

function SeveridadeBadge({ severidade }: SeveridadeBadgeProps) {
  switch (severidade) {
    case 'info':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Info</Badge>;
    case 'aviso':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Aviso</Badge>;
    case 'erro':
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Erro</Badge>;
    case 'critico':
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Crítico</Badge>;
    default:
      return <Badge variant="outline">{severidade}</Badge>;
  }
}