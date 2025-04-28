import { useState } from "react";
import { useExternalAgents, useAgentActivities, type ExternalAgent } from "@/hooks/use-external-agents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle, AlertCircle, ArrowUpRightSquare, Activity, RefreshCw } from "lucide-react";

export default function ExternalAgentsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const { data: agents, isLoading: isLoadingAgents, error: agentsError } = useExternalAgents();
  const { data: activities, isLoading: isLoadingActivities } = useAgentActivities(selectedAgentId);
  
  if (isLoadingAgents) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-xl">Carregando agentes externos...</span>
      </div>
    );
  }
  
  if (agentsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Erro ao carregar agentes</h2>
        <p className="text-muted-foreground">
          Não foi possível obter a lista de agentes externos. Tente novamente mais tarde.
        </p>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Agentes Externos</h1>
          <p className="text-muted-foreground">
            Gerenciamento de agentes externos integrados ao sistema
          </p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Atualizar</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="space-y-4">
            {agents && agents.length > 0 ? (
              agents.map((agent) => (
                <AgentCard 
                  key={agent.id} 
                  agent={agent}
                  isSelected={agent.id === selectedAgentId}
                  onClick={() => setSelectedAgentId(agent.id)}
                />
              ))
            ) : (
              <div className="bg-muted/40 rounded-lg p-8 text-center">
                <h3 className="font-semibold text-lg mb-2">Nenhum agente encontrado</h3>
                <p className="text-muted-foreground">
                  Não existem agentes externos registrados no sistema.
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-2">
          {selectedAgentId ? (
            <AgentDetails 
              agent={agents?.find(a => a.id === selectedAgentId)} 
              activities={activities || []}
              isLoading={isLoadingActivities}
            />
          ) : (
            <div className="bg-muted/40 rounded-lg p-12 text-center flex flex-col items-center justify-center h-full">
              <Activity className="h-12 w-12 text-muted-foreground/70 mb-4" />
              <h3 className="font-semibold text-xl mb-2">Selecione um agente</h3>
              <p className="text-muted-foreground max-w-md">
                Selecione um agente na lista à esquerda para visualizar suas atividades e detalhes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ 
  agent, 
  isSelected,
  onClick 
}: { 
  agent: ExternalAgent;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card 
      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-accent/50'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{agent.name}</CardTitle>
          <Badge variant={agent.tokenValido ? "default" : "destructive"}>
            {agent.tokenValido ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <CardDescription>{agent.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex items-center">
            <span className="w-5 h-5 inline-flex justify-center items-center rounded-full border mr-1">
              {agent.permissions.createTasks ? 
                <CheckCircle className="w-3 h-3 text-primary" /> : 
                <span className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
              }
            </span>
            <span className="text-muted-foreground">Tarefas</span>
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 inline-flex justify-center items-center rounded-full border mr-1">
              {agent.permissions.createDiagnostics ? 
                <CheckCircle className="w-3 h-3 text-primary" /> : 
                <span className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
              }
            </span>
            <span className="text-muted-foreground">Diagnósticos</span>
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 inline-flex justify-center items-center rounded-full border mr-1">
              {agent.permissions.createSuggestions ? 
                <CheckCircle className="w-3 h-3 text-primary" /> : 
                <span className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
              }
            </span>
            <span className="text-muted-foreground">Sugestões</span>
          </div>
          <div className="flex items-center">
            <span className="w-5 h-5 inline-flex justify-center items-center rounded-full border mr-1">
              {agent.permissions.querySystem ? 
                <CheckCircle className="w-3 h-3 text-primary" /> : 
                <span className="w-2 h-2 bg-muted-foreground/30 rounded-full" />
              }
            </span>
            <span className="text-muted-foreground">Consultas</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground pt-0">
        <div className="w-full flex justify-between">
          <span>Tipo: {agent.metadata.type}</span>
          <span>{new Date(agent.metadata.registeredAt).toLocaleDateString()}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

function AgentDetails({ 
  agent, 
  activities,
  isLoading
}: { 
  agent?: ExternalAgent;
  activities: any[];
  isLoading: boolean;
}) {
  if (!agent) return null;
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          {agent.name}
          <Badge className="ml-2" variant="outline">
            {agent.metadata.type}
          </Badge>
        </CardTitle>
        <CardDescription>
          {agent.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="activities" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="activities">Atividades</TabsTrigger>
            <TabsTrigger value="permissions">Permissões</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="activities" className="space-y-4">
            <div className="text-sm font-medium flex justify-between">
              <span>Histórico de atividades</span>
              <span className="text-muted-foreground">
                Total: {agent.metadata.activityCount || 0}
              </span>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {activities.map((activity, index) => (
                  <div 
                    key={index} 
                    className="border bg-card rounded-md p-3 text-sm space-y-2"
                  >
                    <div className="flex justify-between">
                      <div className="font-medium capitalize">
                        {activity.action.replace(/_/g, ' ')}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                    
                    {activity.details && (
                      <div className="text-xs space-y-1">
                        <div className="font-medium">Comando: <span className="font-normal">{activity.details.comando}</span></div>
                        {activity.details.contexto && (
                          <div className="font-medium">Contexto: <span className="font-normal">{activity.details.contexto}</span></div>
                        )}
                        {activity.details.resultado_id && (
                          <div className="font-medium">ID Resultado: <span className="font-normal">{activity.details.resultado_id}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg p-8 text-center">
                <h3 className="font-medium text-base mb-1">Nenhuma atividade registrada</h3>
                <p className="text-sm text-muted-foreground">
                  Este agente ainda não realizou nenhuma ação no sistema.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="permissions">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PermissionCard 
                title="Criar Tarefas" 
                description="Permite que o agente crie tarefas no sistema"
                enabled={agent.permissions.createTasks}
              />
              <PermissionCard 
                title="Criar Diagnósticos" 
                description="Permite que o agente crie diagnósticos de sistema"
                enabled={agent.permissions.createDiagnostics}
              />
              <PermissionCard 
                title="Criar Sugestões" 
                description="Permite que o agente crie sugestões de otimização"
                enabled={agent.permissions.createSuggestions}
              />
              <PermissionCard 
                title="Consultar Sistema" 
                description="Permite que o agente busque informações do sistema"
                enabled={agent.permissions.querySystem}
              />
              <PermissionCard 
                title="Gerar Relatórios" 
                description="Permite que o agente gere relatórios de atividades"
                enabled={agent.permissions.generateReports}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="details">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Informações Gerais</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <p className="font-mono text-xs mt-1 break-all">{agent.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="mt-1">{agent.metadata.type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Registrado em:</span>
                    <p className="mt-1">
                      {new Date(agent.metadata.registeredAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Última atividade:</span>
                    <p className="mt-1">
                      {agent.metadata.lastActivity ? 
                        new Date(agent.metadata.lastActivity).toLocaleString() : 
                        "Nenhuma atividade"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">Status da Integração</h3>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={agent.tokenValido ? "default" : "destructive"}
                    className="px-3 py-1"
                  >
                    {agent.tokenValido ? "Autenticação Válida" : "Autenticação Inválida"}
                  </Badge>
                  {agent.tokenValido ? (
                    <span className="text-xs text-muted-foreground">
                      O token de autenticação está validado e operacional
                    </span>
                  ) : (
                    <span className="text-xs text-destructive">
                      Problema com o token de autenticação
                    </span>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PermissionCard({ 
  title, 
  description, 
  enabled 
}: { 
  title: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className={`p-4 rounded-lg border ${enabled ? 'bg-primary/5' : 'bg-muted/30'}`}>
      <div className="flex items-start space-x-3">
        <div className={`mt-0.5 p-1 rounded-full ${enabled ? 'bg-primary/10' : 'bg-muted'}`}>
          {enabled ? (
            <CheckCircle className="h-4 w-4 text-primary" />
          ) : (
            <AlertCircle className="h-4 w-4 text-muted-foreground/70" />
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}