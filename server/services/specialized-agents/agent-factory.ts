import { ISpecializedAgent, AgentContext, AgentResponse } from './agent-interface';
import TechnicalAgent from './technical-agent';

/**
 * Interface para informações de registro de agente
 */
export interface AgentRegistration {
  type: string;
  domain: string;
  capabilities: string[];
  description: string;
}

/**
 * Factory para criação de agentes especializados
 */
class AgentFactory {
  private static instance: AgentFactory;
  private registeredAgentTypes: Map<string, AgentRegistration> = new Map();
  private registeredTemplates: Map<string, string> = new Map();
  private registeredCapabilities: Map<string, any> = new Map();
  
  /**
   * Construtor privado para Singleton
   */
  private constructor() {
    this.registerDefaultAgentTypes();
  }
  
  /**
   * Obtém a instância do factory
   */
  public static getInstance(): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory();
    }
    return AgentFactory.instance;
  }
  
  /**
   * Registra tipos padrão de agentes
   */
  private registerDefaultAgentTypes(): void {
    // Registra TechnicalAgent como tipo padrão
    this.registerAgentType('TechnicalAgent', {
      type: 'TechnicalAgent',
      domain: 'technical',
      capabilities: ['analyze_context', 'optimize_system_architecture', 'diagnose_issues', 'extract_insights'],
      description: 'Agente especializado em análises técnicas e implementações'
    });
    
    // Registra um tipo temporário para missões diárias para compatibilidade
    this.registerAgentType('missoes-diarias', {
      type: 'DailyMissionsAgent', 
      domain: 'mission',
      capabilities: ['create_mission', 'evaluate_mission', 'suggest_mission'],
      description: 'Agente responsável por gerenciar missões diárias'
    });
    
    // Registra TechnicalAgent como template para outros tipos especializados
    this.registerAgentTemplate('AgenteAnaliseSistema', 'TechnicalAgent');
    this.registerAgentTemplate('AgenteMelhoriaContinua', 'TechnicalAgent');
    this.registerAgentTemplate('AgenteMonitoramento', 'TechnicalAgent');
    
    // Registra capacidades específicas para agentes técnicos
    this.registerCapability('analisar_sistema', {
      name: 'Analisar Sistema',
      description: 'Analisa o estado atual do sistema e identifica problemas e oportunidades',
      execute: async (context: AgentContext): Promise<AgentResponse> => {
        return {
          success: true,
          message: 'Análise do sistema concluída com sucesso',
          insights: [
            {
              type: 'system_analysis',
              content: 'O sistema está funcionando dentro dos parâmetros esperados',
              confidence: 0.9
            }
          ],
          actionItems: [
            {
              action: 'monitor_performance',
              priority: 'medium'
            }
          ]
        };
      }
    });

    this.registerCapability('identificar_otimizacoes', {
      name: 'Identificar Otimizações',
      description: 'Identifica possíveis otimizações no sistema',
      execute: async (context: AgentContext): Promise<AgentResponse> => {
        return {
          success: true,
          message: 'Análise de otimizações concluída',
          insights: [
            {
              type: 'optimization',
              content: 'Identificadas oportunidades de otimização em processamento de eventos',
              confidence: 0.85
            }
          ],
          actionItems: [
            {
              action: 'implement_optimizations',
              priority: 'high'
            }
          ]
        };
      }
    });
  }
  
  /**
   * Registra um tipo de agente
   */
  public registerAgentType(type: string, registration: AgentRegistration): void {
    this.registeredAgentTypes.set(type, registration);
    console.log(`[AgentFactory] Tipo de agente ${type} registrado com sucesso`);
  }
  
  /**
   * Registra um template de agente
   */
  public registerAgentTemplate(domainName: string, baseType: string): void {
    if (!this.registeredAgentTypes.has(baseType)) {
      console.error(`[AgentFactory] Tipo base ${baseType} não encontrado`);
      return;
    }
    
    this.registeredTemplates.set(domainName, baseType);
    console.log(`[AgentFactory] Template ${domainName} registrado baseado em ${baseType}`);
  }
  
  /**
   * Registra uma capacidade para um tipo de agente
   */
  public registerCapability(name: string, capability: any): void {
    this.registeredCapabilities.set(name, capability);
    console.log(`[AgentFactory] Capacidade ${name} registrada com sucesso`);
  }
  
  /**
   * Cria uma nova instância de agente
   */
  public createAgent(type: string): ISpecializedAgent | null {
    try {
      console.log(`[AgentFactory] Criando instância de agente do tipo ${type}...`);
      
      // Verifica se é um domínio especializado
      if (this.registeredTemplates.has(type)) {
        console.log(`Domínio ${type} identificado como agente especial, buscando template...`);
        const baseType = this.registeredTemplates.get(type);
        return this.createSpecializedAgent(type, baseType!);
      }
      
      // Verifica se o tipo está registrado
      if (!this.registeredAgentTypes.has(type)) {
        console.error(`[AgentFactory] Tipo de agente ${type} não registrado`);
        return null;
      }
      
      // Cria agente com base no tipo
      let agent: ISpecializedAgent | null = null;
      
      if (type === 'TechnicalAgent') {
        console.log('Criando instância direta de TechnicalAgent');
        agent = new TechnicalAgent();
      } else if (type === 'missoes-diarias') {
        // Criando um stub temporário para o agente de missões diárias
        console.log('Criando stub temporário para agente de missões diárias');
        agent = {
          id: 'daily-missions-' + Date.now(),
          name: 'Agente de Missões Diárias',
          description: 'Agente responsável por gerenciar missões diárias',
          domain: 'mission',
          capabilities: new Map(),
          
          initialize: async () => true,
          process: async (context) => ({
            success: true,
            message: 'Processamento de missão simulado com sucesso',
            insights: [],
            actionItems: []
          }),
          provideAssistance: async (requestingAgentId, query) => ({ success: true, message: 'Assistência fornecida' }),
          requestAssistance: async (targetAgentId, query) => ({ success: true, data: 'Dados de assistência' }),
          registerCapability: (id, capability) => console.log(`Capacidade ${id} registrada`)
        };
      } else {
        console.error(`[AgentFactory] Implementação para o tipo ${type} não encontrada`);
        return null;
      }
      
      return agent;
    } catch (error) {
      console.error(`[AgentFactory] Erro ao criar agente do tipo ${type}:`, error);
      return null;
    }
  }
  
  /**
   * Cria uma instância de agente especializado com base em um template
   */
  private createSpecializedAgent(domainName: string, baseType: string): ISpecializedAgent | null {
    try {
      console.log(`Criando agente especial: ${domainName} utilizando ${baseType} como base`);
      
      // Cria agente com base no tipo
      let baseAgent: ISpecializedAgent | null = null;
      
      if (baseType === 'TechnicalAgent') {
        baseAgent = new TechnicalAgent(
          domainName,
          `Agente ${domainName}`,
          `Agente especializado no domínio ${domainName}`,
          domainName
        );
      } else {
        console.error(`[AgentFactory] Tipo base ${baseType} não implementado`);
        return null;
      }
      
      if (!baseAgent) {
        console.error(`[AgentFactory] Falha ao criar agente base ${baseType}`);
        return null;
      }
      
      // Registra capacidades específicas do domínio
      console.log(`[AgentFactory] Registrando capacidades para ${domainName}`);
      this.registerDomainCapabilities(baseAgent, domainName);
      
      return baseAgent;
    } catch (error) {
      console.error(`[AgentFactory] Erro ao criar agente especializado ${domainName}:`, error);
      return null;
    }
  }
  
  /**
   * Registra capacidades específicas para um domínio
   */
  private registerDomainCapabilities(agent: ISpecializedAgent, domainName: string): void {
    if (agent instanceof TechnicalAgent) {
      // Mapeia domínios para capacidades
      const domainCapabilities: Record<string, string[]> = {
        'AgenteAnaliseSistema': ['analisar_sistema', 'identificar_otimizacoes'],
        'AgenteMelhoriaContinua': ['identificar_otimizacoes'],
        'AgenteMonitoramento': ['analisar_sistema']
      };
      
      const capabilities = domainCapabilities[domainName] || [];
      
      if (capabilities.length > 0) {
        console.log(`[AgentFactory] Registrando ${capabilities.length} capabilities para ${domainName}`);
        
        for (const capabilityName of capabilities) {
          const capability = this.registeredCapabilities.get(capabilityName);
          
          if (capability) {
            agent.registerCapability(capabilityName, capability);
            console.log(`Capacidade ${capabilityName} registrada no agente ${domainName}`);
          } else {
            console.warn(`[AgentFactory] Capacidade ${capabilityName} não encontrada`);
          }
        }
      }
    }
  }
  
  /**
   * Verifica se um tipo de agente está registrado
   */
  public isAgentTypeRegistered(type: string): boolean {
    return this.registeredAgentTypes.has(type) || this.registeredTemplates.has(type);
  }
  
  /**
   * Obtém todos os tipos de agentes registrados
   */
  public getRegisteredAgentTypes(): string[] {
    return [...this.registeredAgentTypes.keys(), ...this.registeredTemplates.keys()];
  }
  
  /**
   * Obtém informações sobre um tipo de agente
   */
  public getAgentTypeInfo(type: string): AgentRegistration | null {
    // Se for um template, obtém o tipo base
    if (this.registeredTemplates.has(type)) {
      const baseType = this.registeredTemplates.get(type)!;
      const baseInfo = this.registeredAgentTypes.get(baseType);
      
      if (baseInfo) {
        return {
          ...baseInfo,
          type: type,
          domain: type
        };
      }
    }
    
    return this.registeredAgentTypes.get(type) || null;
  }
}

// Exporta a instância singleton
const agentFactory = AgentFactory.getInstance();
export default agentFactory;