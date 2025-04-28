import { v4 as uuidv4 } from 'uuid';
import { ISpecializedAgent, AgentContext, AgentResponse } from './agent-interface';
import { openaiClient } from '../../openai';
import { perplexityClient } from '../../perplexity';
import { anthropicClient } from '../../anthropic';

/**
 * Interface para capacidade de um agente
 */
export interface AgentCapability {
  name: string;
  description: string;
  execute: (context: AgentContext) => Promise<AgentResponse>;
}

/**
 * Agente técnico especializado em tarefas avançadas
 */
export class TechnicalAgent implements ISpecializedAgent {
  id: string;
  name: string;
  description: string;
  domain: string;
  capabilities: Map<string, AgentCapability>;
  private defaultCapability: string = 'analyze_context';
  private llmProvider: 'openai' | 'anthropic' | 'perplexity' = 'openai';

  /**
   * Construtor do agente técnico
   */
  constructor(
    id: string = 'technical-agent',
    name: string = 'Agente Técnico',
    description: string = 'Agente especializado em análises técnicas e implementações',
    domain: string = 'technical'
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.domain = domain;
    this.capabilities = new Map();

    // Registra capabilities padrão
    this.registerDefaultCapabilities();
  }

  /**
   * Inicializa o agente
   */
  async initialize(): Promise<boolean> {
    try {
      console.log(`[TechnicalAgent] Inicializando agente técnico ${this.id}...`);
      
      // Seleciona melhor provedor LLM disponível
      await this.selectBestLLMProvider();
      
      console.log(`[TechnicalAgent] Agente técnico ${this.id} inicializado com sucesso. Usando ${this.llmProvider}`);
      return true;
    } catch (error) {
      console.error(`[TechnicalAgent] Erro ao inicializar agente técnico ${this.id}:`, error);
      return false;
    }
  }

  /**
   * Seleciona o melhor provedor LLM disponível
   */
  private async selectBestLLMProvider(): Promise<void> {
    try {
      // Tenta OpenAI primeiro (prioridade é OpenAI > Anthropic > Perplexity)
      if (process.env.OPENAI_API_KEY) {
        this.llmProvider = 'openai';
        return;
      }
      
      // Tenta Anthropic em seguida
      if (process.env.ANTHROPIC_API_KEY) {
        this.llmProvider = 'anthropic';
        return;
      }
      
      // Tenta Perplexity por último
      if (process.env.PERPLEXITY_API_KEY) {
        this.llmProvider = 'perplexity';
        return;
      }
      
      // Fallback para OpenAI mesmo se não tiver API key
      this.llmProvider = 'openai';
    } catch (error) {
      console.error(`[TechnicalAgent] Erro ao selecionar provedor LLM:`, error);
      this.llmProvider = 'openai'; // Fallback
    }
  }

  /**
   * Registra capacidades padrão do agente
   */
  private registerDefaultCapabilities(): void {
    // Capacidade de análise de contexto
    this.registerCapability('analyze_context', {
      name: 'Análise de Contexto',
      description: 'Analisa o contexto e fornece insights relevantes',
      execute: async (context: AgentContext) => {
        return this.analyzeContext(context);
      }
    });

    // Otimização de arquitetura
    this.registerCapability('optimize_system_architecture', {
      name: 'Otimização de Arquitetura',
      description: 'Analisa e propõe melhorias na arquitetura do sistema',
      execute: async (context: AgentContext) => {
        return this.optimizeSystemArchitecture(context);
      }
    });

    // Diagnóstico de problemas
    this.registerCapability('diagnose_issues', {
      name: 'Diagnóstico de Problemas',
      description: 'Diagnostica problemas e propõe soluções',
      execute: async (context: AgentContext) => {
        return this.diagnoseIssues(context);
      }
    });

    // Extração de insights
    this.registerCapability('extract_insights', {
      name: 'Extração de Insights',
      description: 'Extrai insights relevantes de dados',
      execute: async (context: AgentContext) => {
        return this.extractInsights(context);
      }
    });
  }

  /**
   * Registra uma capacidade no agente
   */
  public registerCapability(id: string, capability: AgentCapability): void {
    this.capabilities.set(id, capability);
    console.log(`[TechnicalAgent] Capacidade ${id} registrada no agente ${this.id}`);
  }

  /**
   * Processa uma solicitação com contexto
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    try {
      console.log(`[TechnicalAgent] Processando solicitação no agente ${this.id}...`);
      
      // Determina a capacidade a ser usada com base no contexto
      const capabilityId = this.determineCapability(context);
      console.log(`[TechnicalAgent] Usando capability ${capabilityId}`);
      
      // Obtém a capacidade
      const capability = this.capabilities.get(capabilityId);
      
      if (!capability) {
        throw new Error(`Capacidade ${capabilityId} não encontrada`);
      }
      
      // Executa a capacidade
      return await capability.execute(context);
    } catch (error) {
      console.error(`[TechnicalAgent] Erro ao processar solicitação no agente ${this.id}:`, error);
      
      return {
        success: false,
        message: `Erro ao processar solicitação: ${error.message || 'Erro desconhecido'}`,
        data: null,
        insights: [
          {
            type: 'error',
            content: `Falha ao processar solicitação: ${error.message || 'Erro desconhecido'}`,
            confidence: 1.0
          }
        ]
      };
    }
  }

  /**
   * Determina a capacidade a ser usada com base no contexto
   */
  private determineCapability(context: AgentContext): string {
    try {
      // Se o contexto especificar explicitamente uma capacidade
      if (context.request && context.request.query) {
        const query = context.request.query.toLowerCase();
        
        // Mapeamento de palavras-chave para capacidades
        const keywordMappings: Record<string, string> = {
          'otimizar': 'optimize_system_architecture',
          'arquitetura': 'optimize_system_architecture',
          'diagnosticar': 'diagnose_issues',
          'problema': 'diagnose_issues',
          'erro': 'diagnose_issues',
          'insight': 'extract_insights',
          'extrair': 'extract_insights',
          'analisar': 'analyze_context'
        };
        
        // Verifica palavras-chave na consulta
        for (const [keyword, capability] of Object.entries(keywordMappings)) {
          if (query.includes(keyword)) {
            return capability;
          }
        }
      }
      
      // Se não encontrar correspondência, usa a capacidade padrão
      return this.defaultCapability;
    } catch (error) {
      console.error(`[TechnicalAgent] Erro ao determinar capacidade:`, error);
      return this.defaultCapability;
    }
  }

  /**
   * Fornece assistência a outro agente
   */
  async provideAssistance(requestingAgentId: string, query: any): Promise<any> {
    try {
      console.log(`[TechnicalAgent] Fornecendo assistência para agente ${requestingAgentId}`);
      
      // Adapta a query para o formato de contexto do agente
      const context: AgentContext = {
        request: {
          agentId: requestingAgentId,
          query: typeof query === 'string' ? query : JSON.stringify(query),
          timestamp: new Date().toISOString()
        },
        parameters: query
      };
      
      // Processa com a capacidade apropriada
      const result = await this.process(context);
      
      console.log(`[TechnicalAgent] Assistência fornecida para ${requestingAgentId} com sucesso`);
      return result;
    } catch (error) {
      console.error(`[TechnicalAgent] Erro ao fornecer assistência para ${requestingAgentId}:`, error);
      throw error;
    }
  }

  /**
   * Obtém ajuda de outro agente
   */
  async requestAssistance(targetAgentId: string, query: any): Promise<any> {
    console.log(`[TechnicalAgent] Solicitando assistência do agente ${targetAgentId}`);
    
    // Emite evento para o orquestrador
    if (global.eventEmitter) {
      global.eventEmitter.emit('agent:collaboration:request', {
        sourceAgentId: this.id,
        targetAgentId,
        query
      });
    }
    
    // Esta implementação depende do orquestrador gerenciar a solicitação e retornar o resultado
    // Em uma implementação completa, aguardaria um evento de resposta
    
    return { 
      success: true, 
      message: `Solicitação de assistência enviada para ${targetAgentId}` 
    };
  }

  /**
   * Analisa o contexto e fornece insights
   */
  private async analyzeContext(context: AgentContext): Promise<AgentResponse> {
    try {
      const prompt = `
        Analise o seguinte contexto e forneça insights relevantes:
        
        ${JSON.stringify(context, null, 2)}
        
        Forneça:
        1. Uma análise sucinta do contexto
        2. Insights estratégicos
        3. Ações recomendadas
        4. Aprendizados potenciais
      `;
      
      // Usa o provedor LLM selecionado
      let aiResponse;
      if (this.llmProvider === 'openai') {
        aiResponse = await openaiClient.generateChatResponse(prompt, {
          userId: 1, // Sistema
          systemPrompt: "Você é um analista técnico especializado. Forneça análises precisas, diretas e acionáveis."
        });
      } else if (this.llmProvider === 'anthropic') {
        aiResponse = await anthropicClient.generateResponse(prompt, {
          systemPrompt: "Você é um analista técnico especializado. Forneça análises precisas, diretas e acionáveis."
        });
      } else {
        aiResponse = await perplexityClient.generateResponse(prompt, {
          systemPrompt: "Você é um analista técnico especializado. Forneça análises precisas, diretas e acionáveis."
        });
      }
      
      // Prepara a resposta
      return {
        success: true,
        message: aiResponse.text,
        data: { context, provider: this.llmProvider },
        insights: [
          {
            type: 'analysis',
            content: aiResponse.text,
            confidence: 0.9
          }
        ],
        learnings: [
          {
            category: 'context_analysis',
            content: 'Análise de contexto realizada com sucesso',
            source: this.id
          }
        ]
      };
    } catch (error) {
      console.error(`[TechnicalAgent] Erro na análise de contexto:`, error);
      
      return {
        success: false,
        message: `Erro na análise de contexto: ${error.message || 'Erro desconhecido'}`,
        insights: [
          {
            type: 'error',
            content: `Falha na análise de contexto: ${error.message || 'Erro desconhecido'}`,
            confidence: 1.0
          }
        ]
      };
    }
  }

  /**
   * Otimiza a arquitetura do sistema
   */
  private async optimizeSystemArchitecture(context: AgentContext): Promise<AgentResponse> {
    try {
      const prompt = `
        Analise a arquitetura atual do sistema e identifique oportunidades de otimização:
        
        ${JSON.stringify(context, null, 2)}
        
        Forneça:
        1. Pontos fracos na arquitetura atual
        2. Oportunidades de otimização de alta prioridade
        3. Recomendações específicas e acionáveis
        4. Impacto esperado das melhorias
      `;
      
      // Usa o provedor LLM selecionado
      let aiResponse;
      if (this.llmProvider === 'openai') {
        aiResponse = await openaiClient.generateChatResponse(prompt, {
          userId: 1, // Sistema
          systemPrompt: "Você é um arquiteto de sistemas especializado em otimização. Identifique problemas, ineficiências e oportunidades de melhoria com precisão."
        });
      } else if (this.llmProvider === 'anthropic') {
        aiResponse = await anthropicClient.generateResponse(prompt, {
          systemPrompt: "Você é um arquiteto de sistemas especializado em otimização. Identifique problemas, ineficiências e oportunidades de melhoria com precisão."
        });
      } else {
        aiResponse = await perplexityClient.generateResponse(prompt, {
          systemPrompt: "Você é um arquiteto de sistemas especializado em otimização. Identifique problemas, ineficiências e oportunidades de melhoria com precisão."
        });
      }
      
      // Prepara a resposta
      return {
        success: true,
        message: aiResponse.text,
        data: { context, provider: this.llmProvider },
        insights: [
          {
            type: 'optimization',
            content: aiResponse.text,
            confidence: 0.85
          }
        ],
        actionItems: [
          {
            action: 'review_optimization_suggestions',
            parameters: { source: this.id, timestamp: new Date().toISOString() },
            priority: 'high'
          }
        ]
      };
    } catch (error) {
      console.error(`[TechnicalAgent] Erro na otimização de arquitetura:`, error);
      
      return {
        success: false,
        message: `Erro na otimização de arquitetura: ${error.message || 'Erro desconhecido'}`,
        insights: [
          {
            type: 'error',
            content: `Falha na otimização de arquitetura: ${error.message || 'Erro desconhecido'}`,
            confidence: 1.0
          }
        ]
      };
    }
  }

  /**
   * Diagnostica problemas no sistema
   */
  private async diagnoseIssues(context: AgentContext): Promise<AgentResponse> {
    try {
      const prompt = `
        Diagnostique os seguintes problemas no sistema:
        
        ${JSON.stringify(context, null, 2)}
        
        Forneça:
        1. Identificação precisa dos problemas
        2. Causas prováveis para cada problema
        3. Soluções recomendadas (específicas e acionáveis)
        4. Passos para prevenção futura
      `;
      
      // Usa o provedor LLM selecionado
      let aiResponse;
      if (this.llmProvider === 'openai') {
        aiResponse = await openaiClient.generateChatResponse(prompt, {
          userId: 1, // Sistema
          systemPrompt: "Você é um especialista em diagnóstico e resolução de problemas técnicos. Identifique problemas com precisão e forneça soluções práticas."
        });
      } else if (this.llmProvider === 'anthropic') {
        aiResponse = await anthropicClient.generateResponse(prompt, {
          systemPrompt: "Você é um especialista em diagnóstico e resolução de problemas técnicos. Identifique problemas com precisão e forneça soluções práticas."
        });
      } else {
        aiResponse = await perplexityClient.generateResponse(prompt, {
          systemPrompt: "Você é um especialista em diagnóstico e resolução de problemas técnicos. Identifique problemas com precisão e forneça soluções práticas."
        });
      }
      
      // Prepara a resposta
      return {
        success: true,
        message: aiResponse.text,
        data: { context, provider: this.llmProvider },
        insights: [
          {
            type: 'diagnosis',
            content: aiResponse.text,
            confidence: 0.9
          }
        ],
        actionItems: [
          {
            action: 'address_identified_issues',
            parameters: { source: this.id, timestamp: new Date().toISOString() },
            priority: 'high'
          }
        ]
      };
    } catch (error) {
      console.error(`[TechnicalAgent] Erro no diagnóstico de problemas:`, error);
      
      return {
        success: false,
        message: `Erro no diagnóstico de problemas: ${error.message || 'Erro desconhecido'}`,
        insights: [
          {
            type: 'error',
            content: `Falha no diagnóstico de problemas: ${error.message || 'Erro desconhecido'}`,
            confidence: 1.0
          }
        ]
      };
    }
  }

  /**
   * Extrai insights de dados
   */
  private async extractInsights(context: AgentContext): Promise<AgentResponse> {
    try {
      const prompt = `
        Extraia insights relevantes dos seguintes dados:
        
        ${JSON.stringify(context, null, 2)}
        
        Forneça:
        1. Padrões principais identificados
        2. Insights não óbvios ou surpreendentes
        3. Oportunidades estratégicas baseadas nos insights
        4. Recomendações para ação
      `;
      
      // Usa o provedor LLM selecionado
      let aiResponse;
      if (this.llmProvider === 'openai') {
        aiResponse = await openaiClient.generateChatResponse(prompt, {
          userId: 1, // Sistema
          systemPrompt: "Você é um analista de dados especializado em extrair insights significativos. Identifique padrões não óbvios e oportunidades estratégicas."
        });
      } else if (this.llmProvider === 'anthropic') {
        aiResponse = await anthropicClient.generateResponse(prompt, {
          systemPrompt: "Você é um analista de dados especializado em extrair insights significativos. Identifique padrões não óbvios e oportunidades estratégicas."
        });
      } else {
        aiResponse = await perplexityClient.generateResponse(prompt, {
          systemPrompt: "Você é um analista de dados especializado em extrair insights significativos. Identifique padrões não óbvios e oportunidades estratégicas."
        });
      }
      
      // Prepara a resposta
      return {
        success: true,
        message: aiResponse.text,
        data: { context, provider: this.llmProvider },
        insights: [
          {
            type: 'data_insight',
            content: aiResponse.text,
            confidence: 0.85
          }
        ],
        learnings: [
          {
            category: 'data_analysis',
            content: 'Padrões e insights extraídos dos dados',
            source: this.id
          }
        ]
      };
    } catch (error) {
      console.error(`[TechnicalAgent] Erro na extração de insights:`, error);
      
      return {
        success: false,
        message: `Erro na extração de insights: ${error.message || 'Erro desconhecido'}`,
        insights: [
          {
            type: 'error',
            content: `Falha na extração de insights: ${error.message || 'Erro desconhecido'}`,
            confidence: 1.0
          }
        ]
      };
    }
  }
}

export default TechnicalAgent;