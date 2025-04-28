import { useQuery } from "@tanstack/react-query";

export interface ExternalAgent {
  id: string;
  name: string;
  description: string;
  permissions: {
    createTasks: boolean;
    createDiagnostics: boolean;
    createSuggestions: boolean;
    querySystem: boolean;
    generateReports: boolean;
  };
  metadata: {
    registeredAt: string;
    lastActivity?: string;
    activityCount: number;
    type: string;
  };
  tokenValido: boolean;
}

export interface AgentActivity {
  agentId: string;
  action: string;
  timestamp: string;
  details: {
    comando: string;
    contexto?: string;
    resultado_id?: string;
    timestamp: string;
  };
}

export function useExternalAgents() {
  return useQuery({
    queryKey: ['/api/agentes-externos'],
    queryFn: async () => {
      const response = await fetch('/api/agentes-externos');
      if (!response.ok) {
        throw new Error('Falha ao buscar agentes externos');
      }
      return await response.json() as ExternalAgent[];
    }
  });
}

export function useAgentActivities(agentId: string) {
  return useQuery({
    queryKey: ['/api/agentes-externos', agentId, 'atividades'],
    queryFn: async () => {
      const response = await fetch(`/api/agentes-externos/${agentId}/atividades`);
      if (!response.ok) {
        throw new Error('Falha ao buscar atividades do agente');
      }
      return await response.json() as AgentActivity[];
    },
    enabled: !!agentId
  });
}