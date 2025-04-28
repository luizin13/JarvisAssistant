import agentOrchestrator from './agent-orchestrator';
import agentFactory from './agent-factory';
import { ISpecializedAgent } from './agent-interface';

/**
 * Classe principal para gerenciar o sistema de agentes especializados
 * Responsável por inicializar e integrar todo o sistema
 */
export class AgentSystem {
  private initialized: boolean = false;
  
  constructor() {}
  
  /**
   * Inicializa o sistema de agentes especializados
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      console.log('Sistema de agentes já está inicializado');
      return true;
    }
    
    try {
      console.log('Inicializando sistema de agentes especializados');
      
      // Cria agentes iniciais
      const initialAgents = this.createInitialAgents();
      
      // Registra agentes no orquestrador
      for (const agent of initialAgents) {
        if (agent) {
          const success = agentOrchestrator.registerAgent(agent);
          if (success) {
            console.log(`Agente ${agent.name} registrado com sucesso`);
          } else {
            console.error(`Falha ao registrar agente ${agent.name}`);
          }
        }
      }
      
      // Inicializa tarefa de avaliação periódica
      this.setupPeriodicEvaluation();
      
      this.initialized = true;
      console.log('Sistema de agentes especialistas inicializado com sucesso');
      
      return true;
    } catch (error: unknown) {
      console.error('Erro ao inicializar sistema de agentes:', error);
      return false;
    }
  }
  
  /**
   * Cria instâncias dos agentes iniciais
   */
  private createInitialAgents(): ISpecializedAgent[] {
    const agents: ISpecializedAgent[] = [];
    
    // Cria agente de crédito
    const creditAgent = agentFactory.createAgent('credito');
    if (creditAgent) {
      agents.push(creditAgent);
    } else {
      console.error('Falha ao criar agente de crédito');
    }
    
    // Cria agente de aprendizado
    const learningAgent = agentFactory.createAgent('aprendizado');
    if (learningAgent) {
      agents.push(learningAgent);
    } else {
      console.error('Falha ao criar agente de aprendizado');
    }
    
    // No futuro, adicionar outros agentes aqui
    
    return agents;
  }
  
  /**
   * Configura avaliação periódica dos agentes
   */
  private setupPeriodicEvaluation(): void {
    // Executa avaliação a cada 6 horas
    const EVAL_INTERVAL = 6 * 60 * 60 * 1000;
    
    setInterval(() => {
      console.log('Iniciando avaliação periódica dos agentes');
      agentOrchestrator.evaluateAndReplaceWeakAgents()
        .then(() => {
          console.log('Avaliação periódica dos agentes concluída');
        })
        .catch((error: unknown) => {
          console.error('Erro na avaliação periódica dos agentes:', error);
        });
    }, EVAL_INTERVAL);
    
    // Também executa imediatamente após a inicialização
    setTimeout(() => {
      console.log('Iniciando avaliação inicial dos agentes');
      agentOrchestrator.evaluateAndReplaceWeakAgents()
        .catch((error: unknown) => {
          console.error('Erro na avaliação inicial dos agentes:', error);
        });
    }, 60 * 1000); // 1 minuto após inicialização
  }
  
  /**
   * Processa uma solicitação através do sistema de agentes
   */
  async processRequest(request: any): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return agentOrchestrator.processRequest(request);
  }
  
  /**
   * Obtém estatísticas do sistema de agentes
   */
  getSystemStats(): any {
    return agentOrchestrator.getSystemStats();
  }
  
  /**
   * Obtém lista de agentes ativos
   */
  getActiveAgents(): ISpecializedAgent[] {
    return agentOrchestrator.getActiveAgents();
  }
  
  /**
   * Cria um novo agente dinamicamente e o registra
   */
  async createAndRegisterAgent(domain: string, customName?: string): Promise<ISpecializedAgent | null> {
    // Cria o agente
    const agent = agentFactory.createAgent(domain, customName);
    
    if (!agent) {
      return null;
    }
    
    // Registra o agente no orquestrador
    const success = agentOrchestrator.registerAgent(agent);
    
    if (!success) {
      console.error(`Falha ao registrar agente ${agent.name}`);
      return null;
    }
    
    return agent;
  }
}

// Cria instância singleton do sistema de agentes
const agentSystem = new AgentSystem();
export default agentSystem;