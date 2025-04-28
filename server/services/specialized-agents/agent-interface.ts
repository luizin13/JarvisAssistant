/**
 * Interface para contexto de entrada do agente
 */
export interface AgentContext {
  request?: {
    agentId?: string;
    timestamp?: string;
    cycle?: number;
    query?: string;
  };
  systemContext?: {
    systemState?: any;
    profile?: any;
  };
  parameters?: any;
}

/**
 * Interface para resposta do agente
 */
export interface AgentResponse {
  success: boolean;
  message: string;
  data?: any;
  actionItems?: Array<{
    action: string;
    parameters?: any;
    priority?: 'high' | 'medium' | 'low';
  }>;
  insights?: Array<{
    type: string;
    content: string;
    confidence?: number;
  }>;
  learnings?: Array<{
    category: string;
    content: string;
    source?: string;
  }>;
}

/**
 * Interface para agentes especializados
 */
export interface ISpecializedAgent {
  id: string;
  name: string;
  description: string;
  domain?: string;
  capabilities?: Map<string, any>;

  /**
   * Inicializa o agente
   */
  initialize(): Promise<boolean>;

  /**
   * Processa uma solicitação com contexto
   */
  process(context: AgentContext): Promise<AgentResponse>;

  /**
   * Fornece assistência a outro agente
   */
  provideAssistance(requestingAgentId: string, query: any): Promise<any>;

  /**
   * Obtém ajuda de outro agente
   */
  requestAssistance(targetAgentId: string, query: any): Promise<any>;
  
  /**
   * Registra uma capacidade no agente
   */
  registerCapability?(id: string, capability: any): void;
}