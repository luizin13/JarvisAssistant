import { v4 as uuidv4 } from 'uuid';
import {
  AgentCapability,
  AgentContext,
  AgentResponse,
  AgentStats,
  ISpecializedAgent
} from './agent-interface';

/**
 * Classe base abstrata para todos os agentes especializados
 * Implementa funcionalidades comuns e deixa métodos específicos para as subclasses
 */
export abstract class BaseSpecializedAgent implements ISpecializedAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  domain: string;
  capabilities: AgentCapability[];
  stats: AgentStats;
  protected learningData: any[] = [];
  protected knowledgeBase: Map<string, any> = new Map();

  constructor(
    name: string,
    description: string,
    domain: string,
    capabilities: AgentCapability[] = []
  ) {
    this.id = uuidv4();
    this.name = name;
    this.version = '1.0.0';
    this.description = description;
    this.domain = domain;
    this.capabilities = capabilities;
    this.stats = this.initializeStats();
  }

  private initializeStats(): AgentStats {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      confidenceScore: 0.7, // Começa com confiança moderada
      learningProgress: 0,
      lastUpdated: new Date().toISOString(),
      performanceHistory: []
    };
  }

  async initialize(): Promise<boolean> {
    // Implementação básica que pode ser sobrescrita por agentes específicos
    console.log(`Inicializando agente ${this.name} (${this.id})`);
    return true;
  }

  abstract process(context: AgentContext): Promise<AgentResponse>;

  async learn(feedback: any): Promise<boolean> {
    try {
      // Armazena o feedback para aprendizado
      this.learningData.push({
        ...feedback,
        timestamp: new Date().toISOString()
      });

      // Atualiza o progresso de aprendizado
      this.stats.learningProgress = Math.min(
        1.0,
        this.stats.learningProgress + 0.01
      );
      this.stats.lastUpdated = new Date().toISOString();

      // Extrai padrões e os adiciona à base de conhecimento (implementado pelos agentes específicos)
      await this.extractPatterns();
      return true;
    } catch (error) {
      console.error(`Erro no aprendizado do agente ${this.name}:`, error);
      return false;
    }
  }

  protected abstract extractPatterns(): Promise<void>;

  getStats(): AgentStats {
    return { ...this.stats };
  }

  getCapabilities(): AgentCapability[] {
    return [...this.capabilities];
  }
  
  getCapability(name: string): AgentCapability | undefined {
    return this.capabilities.find(capability => capability.name === name);
  }
  
  registerCapability(capability: AgentCapability): void {
    // Verifica se já existe capacidade com o mesmo nome
    const existingIndex = this.capabilities.findIndex(cap => cap.name === capability.name);
    if (existingIndex >= 0) {
      // Substitui a existente
      this.capabilities[existingIndex] = capability;
      console.log(`Capacidade ${capability.name} atualizada no agente ${this.name}`);
    } else {
      // Adiciona nova
      this.capabilities.push(capability);
      console.log(`Capacidade ${capability.name} registrada no agente ${this.name}`);
    }
  }

  async evolve(): Promise<boolean> {
    try {
      // Incrementa a versão secundária
      const [major, minor, patch] = this.version.split('.').map(Number);
      this.version = `${major}.${minor + 1}.${patch}`;
      
      // Implementação base de evolução
      console.log(`Evoluindo agente ${this.name} para versão ${this.version}`);
      
      // Registra a evolução
      this.stats.performanceHistory.push({
        date: new Date().toISOString(),
        successRate: this.stats.successfulRequests / (this.stats.totalRequests || 1),
        averageProcessingTime: this.stats.averageProcessingTime,
        confidenceScore: this.stats.confidenceScore
      });
      
      return true;
    } catch (error) {
      console.error(`Erro na evolução do agente ${this.name}:`, error);
      return false;
    }
  }

  async resetLearning(): Promise<boolean> {
    try {
      this.learningData = [];
      this.knowledgeBase.clear();
      this.stats.learningProgress = 0;
      this.stats.lastUpdated = new Date().toISOString();
      console.log(`Aprendizado do agente ${this.name} foi reiniciado`);
      return true;
    } catch (error) {
      console.error(`Erro ao reiniciar aprendizado do agente ${this.name}:`, error);
      return false;
    }
  }

  async requestCollaboration(agentId: string, query: any): Promise<any> {
    // Esta implementação deve ser substituída pelo Orquestrador que conectará os agentes
    console.log(`Agente ${this.name} solicita colaboração com ${agentId}`);
    return { success: false, message: 'Método não implementado no agente base' };
  }

  async provideAssistance(requestingAgentId: string, query: any): Promise<any> {
    // Implementação padrão que pode ser sobrescrita pelos agentes específicos
    console.log(`Agente ${this.name} fornecendo assistência para ${requestingAgentId}`);
    
    // Processa a consulta e retorna o resultado
    const context: AgentContext = {
      request: query,
      systemContext: {
        collaborationMode: true,
        requestingAgentId
      }
    };
    
    return this.process(context);
  }

  protected updateStats(startTime: number, success: boolean): void {
    // Atualiza estatísticas após cada processamento
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    
    // Atualiza o tempo médio de processamento
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalRequests - 1) + processingTime) / 
      this.stats.totalRequests;
    
    this.stats.lastUpdated = new Date().toISOString();
  }
}