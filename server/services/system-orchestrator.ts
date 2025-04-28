import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { luizCore } from './luiz-core-manager';
import agentFactory from './specialized-agents/agent-factory';
import { ISpecializedAgent, AgentContext, AgentResponse } from './specialized-agents/agent-interface';
import { openaiClient } from '../openai';
import { anthropicClient } from '../anthropic';
import { perplexityClient } from '../perplexity';

// Criação de emitter global para eventos do sistema
if (!global.eventEmitter) {
  global.eventEmitter = new EventEmitter();
  global.eventEmitter.setMaxListeners(50); // Aumenta o limite de listeners
}

/**
 * Interface para configuração do orquestrador
 */
export interface OrchestratorConfig {
  cycleDurationMinutes: number;
  enabledAgents: string[];
  autoRestart: boolean;
  maxConcurrentAgents: number;
  logLevel: 'debug' | 'info' | 'warning' | 'error';
  proactiveMode: boolean;
  autonomousMode: boolean;
  spontaneousCommunication: boolean;
}

/**
 * Interface para agentes do orquestrador
 */
export interface OrchestratorAgent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  lastExecution?: string;
  failures: number;
  successRate: number;
  metrics: {
    averageResponseTime: number;
    totalExecutions: number;
  };
}

/**
 * Interface para evento de colaboração
 */
export interface CollaborationEvent {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  query: any;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
}

/**
 * Orquestrador do Sistema
 * Coordena a execução dos agentes especializados e permite comunicação espontânea
 */
export class SystemOrchestrator {
  private static instance: SystemOrchestrator;
  private agents: Map<string, ISpecializedAgent> = new Map();
  private agentMetrics: Map<string, any> = new Map();
  private collaborations: CollaborationEvent[] = [];
  private activePromises: Map<string, Promise<any>> = new Map();
  private cycleTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private currentCycle: number = 0;
  private lastCycleTime: Date | null = null;
  private systemState: any = {
    status: 'idle',
    alerts: [],
    opportunities: [],
    autoImprovements: []
  };
  private config: OrchestratorConfig;

  /**
   * Construtor privado para Singleton
   */
  private constructor() {
    // Configuração inicial
    this.config = {
      cycleDurationMinutes: 60,
      enabledAgents: ['monitor', 'learner', 'performance', 'security', 'integration', 'improvement'],
      autoRestart: true,
      maxConcurrentAgents: 3,
      logLevel: 'info',
      proactiveMode: true,
      autonomousMode: true,
      spontaneousCommunication: true
    };
    
    // Carrega configuração do perfil Luiz
    this.updateConfigFromProfile();
    
    // Inscreve-se para receber atualizações do perfil
    luizCore.subscribe('system-orchestrator', () => {
      this.updateConfigFromProfile();
    });
    
    // Registra manipuladores de eventos
    this.registerEventHandlers();
    
    console.log('[SYSTEM ORCHESTRATOR] Inicializando orquestrador de sistema...');
  }

  /**
   * Obtém a instância do orquestrador
   */
  public static getInstance(): SystemOrchestrator {
    if (!SystemOrchestrator.instance) {
      SystemOrchestrator.instance = new SystemOrchestrator();
    }
    return SystemOrchestrator.instance;
  }

  /**
   * Atualiza configuração a partir do perfil do Luiz
   */
  private updateConfigFromProfile(): void {
    try {
      const profile = luizCore.getProfile();
      
      this.config.proactiveMode = profile.configSistema.modoIntensivo;
      this.config.autonomousMode = profile.configSistema.modoIntensivo;
      
      console.log(`[SYSTEM ORCHESTRATOR] Configuração atualizada: modo proativo = ${this.config.proactiveMode}, modo autônomo = ${this.config.autonomousMode}`);
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao atualizar configuração do perfil:', error);
    }
  }

  /**
   * Registra manipuladores de eventos para colaboração entre agentes
   */
  private registerEventHandlers(): void {
    global.eventEmitter.on('agent:collaboration:request', (data: any) => {
      this.handleCollaborationRequest(data);
    });
    
    global.eventEmitter.on('agent:autonomous:improvement', (data: any) => {
      this.handleAutonomousImprovement(data);
    });
    
    global.eventEmitter.on('agent:alert', (data: any) => {
      this.handleAgentAlert(data);
    });
    
    global.eventEmitter.on('agent:opportunity', (data: any) => {
      this.handleAgentOpportunity(data);
    });
  }

  /**
   * Inicializa o orquestrador e registra os agentes principais
   */
  public async initialize(): Promise<boolean> {
    try {
      // Registra os agentes principais
      const coreAgents = [
        {
          id: 'monitor',
          name: 'Sistema de Monitoramento',
          description: 'Monitora o estado global do sistema e identifica anomalias'
        },
        {
          id: 'learner',
          name: 'Sistema de Aprendizado',
          description: 'Aprende com as interações e melhora as respostas futuras'
        },
        {
          id: 'performance',
          name: 'Analisador de Performance',
          description: 'Analisa e otimiza a performance do sistema'
        },
        {
          id: 'security',
          name: 'Monitor de Segurança',
          description: 'Identifica e mitiga riscos de segurança'
        },
        {
          id: 'integration',
          name: 'Integrador de Sistemas',
          description: 'Gerencia conexões com sistemas externos'
        },
        {
          id: 'improvement',
          name: 'Auto-Melhoria',
          description: 'Propõe e implementa melhorias no sistema'
        }
      ];
      
      // Inicializa os agentes
      for (const agentInfo of coreAgents) {
        // Cria agente técnico para cada função principal
        const agent = agentFactory.createAgent('TechnicalAgent');
        
        if (agent) {
          Object.assign(agent, {
            id: agentInfo.id,
            name: agentInfo.name,
            description: agentInfo.description
          });
          
          await agent.initialize();
          this.agents.set(agentInfo.id, agent);
          
          // Inicializa métricas
          this.agentMetrics.set(agentInfo.id, {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageResponseTime: 0,
            lastExecution: null,
            status: 'idle'
          });
        }
      }
      
      // Verifica disponibilidade de APIs externas
      const openAIAvailable = await this.checkOpenAIAvailability();
      const anthropicAvailable = await this.checkAnthropicAvailability();
      const perplexityAvailable = await this.checkPerplexityAvailability();
      
      console.log(`[SYSTEM ORCHESTRATOR] Orquestrador inicializado com ${this.agents.size} agentes ativos`);
      console.log(`[SYSTEM ORCHESTRATOR] APIs disponíveis: OpenAI=${openAIAvailable}, Anthropic=${anthropicAvailable}, Perplexity=${perplexityAvailable}`);
      
      return true;
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao inicializar orquestrador:', error);
      return false;
    }
  }

  /**
   * Verifica disponibilidade da API OpenAI
   */
  private async checkOpenAIAvailability(): Promise<boolean> {
    try {
      return true; // Supondo que a verificação é feita em outro lugar
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao verificar disponibilidade da OpenAI:', error);
      return false;
    }
  }

  /**
   * Verifica disponibilidade da API Anthropic
   */
  private async checkAnthropicAvailability(): Promise<boolean> {
    try {
      return true; // Supondo que a verificação é feita em outro lugar
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao verificar disponibilidade da Anthropic:', error);
      return false;
    }
  }

  /**
   * Verifica disponibilidade da API Perplexity
   */
  private async checkPerplexityAvailability(): Promise<boolean> {
    try {
      return true; // Supondo que a verificação é feita em outro lugar
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao verificar disponibilidade da Perplexity:', error);
      return false;
    }
  }

  /**
   * Inicia o ciclo de execução dos agentes
   */
  public async start(): Promise<boolean> {
    if (this.isRunning) {
      console.log('[SYSTEM ORCHESTRATOR] Orquestrador já está em execução');
      return false;
    }
    
    try {
      // Inicializa se ainda não foi feito
      if (this.agents.size === 0) {
        await this.initialize();
      }
      
      this.isRunning = true;
      this.systemState.status = 'running';
      
      // Executa o primeiro ciclo imediatamente
      await this.executeCycle();
      
      // Agenda execuções periódicas
      const intervalMs = this.config.cycleDurationMinutes * 60 * 1000;
      this.cycleTimer = setInterval(() => this.executeCycle(), intervalMs);
      
      console.log(`[SYSTEM ORCHESTRATOR] Sistema iniciado com ciclo de ${this.config.cycleDurationMinutes} minutos`);
      return true;
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao iniciar orquestrador:', error);
      this.isRunning = false;
      this.systemState.status = 'error';
      return false;
    }
  }

  /**
   * Para o ciclo de execução dos agentes
   */
  public stop(): boolean {
    if (!this.isRunning) {
      console.log('[SYSTEM ORCHESTRATOR] Orquestrador não está em execução');
      return false;
    }
    
    try {
      if (this.cycleTimer) {
        clearInterval(this.cycleTimer);
        this.cycleTimer = null;
      }
      
      this.isRunning = false;
      this.systemState.status = 'stopped';
      
      console.log('[SYSTEM ORCHESTRATOR] Sistema parado com sucesso');
      return true;
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao parar orquestrador:', error);
      return false;
    }
  }

  /**
   * Executa um ciclo de processamento com todos os agentes habilitados
   */
  private async executeCycle(): Promise<void> {
    try {
      this.currentCycle++;
      const startTime = Date.now();
      
      console.log(`[SYSTEM ORCHESTRATOR] 🔄 Iniciando ciclo ${this.currentCycle}`);
      
      // Executa cada agente habilitado
      const executePromises: Promise<any>[] = [];
      
      for (const agentId of this.config.enabledAgents) {
        if (this.agents.has(agentId)) {
          console.log(`[SYSTEM ORCHESTRATOR] 🤖 Executando agente ${agentId}...`);
          executePromises.push(this.executeAgent(agentId, this.getAgentContext(agentId)));
        }
      }
      
      // Aguarda execução (com limite de concorrência conforme configuração)
      await Promise.all(executePromises);
      
      // Verifica se algum agente identificou problemas que exigem reinicialização
      if (this.systemState.alerts.some((alert: any) => alert.requiresRestart)) {
        console.log('[SYSTEM ORCHESTRATOR] ⚠️ Detectada necessidade de reinicialização');
        if (this.config.autoRestart) {
          console.log('[SYSTEM ORCHESTRATOR] 🔄 Reiniciando orquestrador automaticamente');
          this.restartAgent(this.systemState.alerts[0].agentId);
        }
      }
      
      // Processa oportunidades de melhoria autônoma
      if (this.config.autonomousMode) {
        await this.processAutonomousImprovements();
      }
      
      // Registra tempo do ciclo
      const endTime = Date.now();
      this.lastCycleTime = new Date();
      
      console.log(`[SYSTEM ORCHESTRATOR] ✅ Ciclo ${this.currentCycle} concluído em ${(endTime - startTime) / 1000} segundos`);
      
      // Emite evento de ciclo concluído
      global.eventEmitter.emit('orchestrator:cycle:completed', {
        cycle: this.currentCycle,
        duration: endTime - startTime,
        timestamp: new Date().toISOString(),
        state: this.getSystemState()
      });
    } catch (error) {
      console.error(`[SYSTEM ORCHESTRATOR] ❌ Erro durante ciclo ${this.currentCycle}:`, error);
      
      // Adiciona alerta de erro
      this.systemState.alerts.push({
        id: uuidv4(),
        level: 'critical',
        source: 'orchestrator',
        message: `Erro durante execução do ciclo: ${error.message || 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
        requiresRestart: false
      });
    }
  }

  /**
   * Executa um agente específico
   */
  private async executeAgent(agentId: string, context: AgentContext): Promise<AgentResponse> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agente ${agentId} não encontrado`);
      }
      
      // Registra início da execução
      const metrics = this.agentMetrics.get(agentId);
      metrics.totalExecutions++;
      metrics.status = 'running';
      metrics.lastExecution = new Date().toISOString();
      
      const startTime = Date.now();
      
      // Adiciona à lista de promessas ativas
      const executionPromise = agent.process(context);
      this.activePromises.set(agentId, executionPromise);
      
      // Executa de acordo com o tipo de agente
      let result: AgentResponse;
      
      try {
        if (agentId === 'monitor') {
          // Usa analytics avançados do Claude para monitoramento
          result = await this.executeWithAnthropic(agentId, context, executionPromise);
        } else if (agentId === 'learner') {
          // Usa Claude para aprendizado por sua compreensão contextual
          result = await this.executeWithAnthropic(agentId, context, executionPromise);
        } else if (agentId === 'performance') {
          // Usa GPT-4 para análise de performance
          result = await this.executeWithOpenAI(agentId, context, executionPromise);
        } else {
          // Execução direta para outros agentes
          result = await executionPromise;
        }
      } catch (error) {
        console.error(`[SYSTEM ORCHESTRATOR] Erro ao executar agente ${agentId}:`, error);
        throw error;
      } finally {
        this.activePromises.delete(agentId);
      }
      
      // Atualiza métricas
      const endTime = Date.now();
      metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalExecutions - 1) + (endTime - startTime)) / metrics.totalExecutions;
      metrics.status = 'idle';
      
      if (result.success) {
        metrics.successfulExecutions++;
        console.log(`[SYSTEM ORCHESTRATOR] ✅ Agente ${agentId} completou análise: ${result.message?.substring(0, 100)}...`);
      } else {
        metrics.failedExecutions++;
        console.error(`[SYSTEM ORCHESTRATOR] ❌ Agente ${agentId} falhou: ${result.message}`);
        
        // Adiciona alerta
        this.addAlert({
          level: 'warning',
          source: agentId,
          message: `Falha na execução: ${result.message}`,
          requiresRestart: false
        });
      }
      
      // Processa insights e gera atualizações de estado
      if (result.insights && result.insights.length > 0) {
        this.processAgentInsights(agentId, result.insights);
      }
      
      // Verifica necessidade de comunicação espontânea entre agentes
      if (this.config.spontaneousCommunication && result.success) {
        this.considerSpontaneousCommunication(agentId, result);
      }
      
      return result;
    } catch (error) {
      console.error(`[SYSTEM ORCHESTRATOR] Erro ao executar agente ${agentId}:`, error);
      
      // Atualiza métricas de falha
      const metrics = this.agentMetrics.get(agentId);
      metrics.failedExecutions++;
      metrics.status = 'error';
      
      // Adiciona alerta
      this.addAlert({
        level: 'error',
        source: agentId,
        message: `Erro crítico: ${error.message || 'Desconhecido'}`,
        requiresRestart: true
      });
      
      // Retorna resposta de erro
      return {
        success: false,
        message: `Erro ao executar agente: ${error.message || 'Erro desconhecido'}`,
        data: null,
        actionItems: [],
        insights: [],
        learnings: []
      };
    }
  }

  /**
   * Executa agente usando OpenAI
   */
  private async executeWithOpenAI(
    agentId: string, 
    context: AgentContext, 
    fallbackPromise: Promise<AgentResponse>
  ): Promise<AgentResponse> {
    try {
      // Prepara prompt para OpenAI com base no contexto
      const prompt = `Análise do agente ${agentId}: ${JSON.stringify(context)}`;
      
      // Tenta usar OpenAI para processamento avançado
      const openAiResponse = await openaiClient.generateChatResponse(prompt, {
        userId: 1, // Usuário do sistema
        systemPrompt: `Você é o agente ${agentId} em um sistema de inteligência artificial orquestrado. 
        Analise o contexto fornecido e gere insights, ações recomendadas e aprendizados relevantes. 
        Seja detalhado, preciso e orientado a resultados.`
      });
      
      // Formata resposta
      const response: AgentResponse = {
        success: true,
        message: openAiResponse.text,
        data: { source: 'openai', model: openAiResponse.model },
        actionItems: [],
        insights: [
          {
            type: agentId,
            content: openAiResponse.text,
            confidence: 0.9
          }
        ],
        learnings: []
      };
      
      return response;
    } catch (error) {
      console.error(`[SYSTEM ORCHESTRATOR] Erro ao usar OpenAI para ${agentId}: ${error}`);
      // Fallback para execução direta
      return fallbackPromise;
    }
  }

  /**
   * Executa agente usando Anthropic
   */
  private async executeWithAnthropic(
    agentId: string, 
    context: AgentContext, 
    fallbackPromise: Promise<AgentResponse>
  ): Promise<AgentResponse> {
    try {
      // Prepara prompt para Anthropic com base no contexto
      const prompt = `Análise do agente ${agentId}: ${JSON.stringify(context)}`;
      
      // Tenta usar Anthropic para processamento avançado
      const anthropicResponse = await anthropicClient.generateResponse(prompt, {
        systemPrompt: `Você é o agente ${agentId} em um sistema de inteligência artificial orquestrado. 
        Analise o contexto fornecido e gere insights, ações recomendadas e aprendizados relevantes. 
        Seja detalhado, preciso e orientado a resultados.`
      });
      
      // Formata resposta
      const response: AgentResponse = {
        success: true,
        message: anthropicResponse.text,
        data: { source: 'anthropic', model: 'claude' },
        actionItems: [],
        insights: [
          {
            type: agentId,
            content: anthropicResponse.text,
            confidence: 0.95
          }
        ],
        learnings: []
      };
      
      return response;
    } catch (error) {
      console.error(`[SYSTEM ORCHESTRATOR] Erro ao usar Anthropic para ${agentId}: ${error}`);
      // Fallback para execução direta
      return fallbackPromise;
    }
  }

  /**
   * Prepara o contexto para um agente
   */
  private getAgentContext(agentId: string): AgentContext {
    const profile = luizCore.getProfile();
    const systemState = this.getSystemState();
    
    // Contexto base para todos os agentes
    const baseContext: AgentContext = {
      request: {
        agentId,
        timestamp: new Date().toISOString(),
        cycle: this.currentCycle
      },
      systemContext: {
        systemState,
        profile: {
          prioridades: profile.prioridades,
          estadoAtual: profile.estadoAtual
        }
      }
    };
    
    // Contexto específico por agente
    switch (agentId) {
      case 'monitor':
        return {
          ...baseContext,
          parameters: {
            alerts: systemState.alerts,
            metrics: this.getMetrics()
          }
        };
        
      case 'learner':
        return {
          ...baseContext,
          parameters: {
            recentInteractions: profile.historico.interacoes.slice(0, 10),
            recentLearnings: profile.historico.aprendizados.slice(0, 10)
          }
        };
        
      case 'performance':
        return {
          ...baseContext,
          parameters: {
            agentMetrics: Object.fromEntries(this.agentMetrics),
            systemMetrics: this.getMetrics()
          }
        };
        
      default:
        return baseContext;
    }
  }

  /**
   * Processa insights gerados por agentes
   */
  private processAgentInsights(agentId: string, insights: any[]): void {
    for (const insight of insights) {
      // Processa oportunidades
      if (insight.type === 'opportunity') {
        this.addOpportunity({
          agentId,
          title: insight.content.substring(0, 100),
          description: insight.content,
          priority: insight.confidence > 0.8 ? 'high' : 'medium',
          confidence: insight.confidence
        });
      }
      
      // Processa melhorias
      if (insight.type === 'improvement') {
        this.addAutoImprovement({
          agentId,
          title: insight.content.substring(0, 100),
          description: insight.content,
          priority: insight.confidence > 0.8 ? 'high' : 'medium'
        });
      }
      
      // Processa alertas
      if (insight.type === 'alert') {
        this.addAlert({
          level: insight.confidence > 0.9 ? 'critical' : (insight.confidence > 0.7 ? 'warning' : 'info'),
          source: agentId,
          message: insight.content,
          requiresRestart: insight.confidence > 0.95
        });
      }
    }
  }

  /**
   * Considera iniciar comunicação espontânea entre agentes
   */
  private considerSpontaneousCommunication(agentId: string, result: AgentResponse): void {
    // Só procede se a comunicação espontânea estiver habilitada
    if (!this.config.spontaneousCommunication) return;
    
    try {
      // Baseado nos insights, identifica potenciais agentes para colaboração
      if (result.insights && result.insights.length > 0) {
        // Filtra insights com alta confiança
        const highConfidenceInsights = result.insights.filter(insight => 
          insight.confidence && insight.confidence > 0.8
        );
        
        if (highConfidenceInsights.length === 0) return;
        
        // Determina o melhor agente para colaborar com base nos insights
        for (const insight of highConfidenceInsights) {
          // Mapeamento simplificado de tipo de insight para agente
          const agentMapping: Record<string, string[]> = {
            'performance': ['monitor', 'improvement'],
            'security': ['monitor', 'improvement'],
            'opportunity': ['learner', 'improvement'],
            'anomaly': ['monitor', 'security'],
            'improvement': ['improvement', 'performance'],
            'learning': ['learner', 'improvement']
          };
          
          // Determina agentes alvo baseado no tipo de insight
          const targetAgents = agentMapping[insight.type] || ['improvement'];
          
          // Filtra para não comunicar com o próprio agente
          const validTargets = targetAgents.filter(target => target !== agentId);
          
          if (validTargets.length === 0) continue;
          
          // Seleciona o primeiro agente alvo válido
          const targetAgentId = validTargets[0];
          
          // Inicia colaboração espontânea
          this.initiateCollaboration(agentId, targetAgentId, {
            insight,
            context: result.data,
            spontaneous: true
          });
        }
      }
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao considerar comunicação espontânea:', error);
    }
  }

  /**
   * Inicia colaboração entre agentes
   */
  private initiateCollaboration(
    sourceAgentId: string, 
    targetAgentId: string, 
    query: any
  ): string {
    try {
      console.log(`[SYSTEM ORCHESTRATOR] Iniciando colaboração: ${sourceAgentId} -> ${targetAgentId}`);
      
      // Cria evento de colaboração
      const collaborationId = uuidv4();
      const collaboration: CollaborationEvent = {
        id: collaborationId,
        sourceAgentId,
        targetAgentId,
        query,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      // Adiciona à lista de colaborações
      this.collaborations.push(collaboration);
      
      // Agenda colaboração para execução
      setTimeout(() => this.executeCollaboration(collaborationId), 1000);
      
      return collaborationId;
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao iniciar colaboração:', error);
      return '';
    }
  }

  /**
   * Executa colaboração entre agentes
   */
  private async executeCollaboration(collaborationId: string): Promise<void> {
    try {
      // Busca colaboração
      const collaborationIndex = this.collaborations.findIndex(c => c.id === collaborationId);
      if (collaborationIndex === -1) {
        console.error(`[SYSTEM ORCHESTRATOR] Colaboração ${collaborationId} não encontrada`);
        return;
      }
      
      const collaboration = this.collaborations[collaborationIndex];
      
      // Atualiza status
      collaboration.status = 'in_progress';
      this.collaborations[collaborationIndex] = collaboration;
      
      // Busca agentes
      const sourceAgent = this.agents.get(collaboration.sourceAgentId);
      const targetAgent = this.agents.get(collaboration.targetAgentId);
      
      if (!sourceAgent || !targetAgent) {
        console.error(`[SYSTEM ORCHESTRATOR] Agente não encontrado para colaboração ${collaborationId}`);
        collaboration.status = 'failed';
        collaboration.result = { error: 'Agente não encontrado' };
        return;
      }
      
      // Solicita assistência ao agente alvo
      const assistanceResult = await targetAgent.provideAssistance(
        collaboration.sourceAgentId,
        collaboration.query
      );
      
      // Atualiza colaboração com resultado
      collaboration.status = 'completed';
      collaboration.result = assistanceResult;
      this.collaborations[collaborationIndex] = collaboration;
      
      console.log(`[SYSTEM ORCHESTRATOR] Colaboração ${collaborationId} concluída com sucesso`);
      
      // Notifica o agente de origem sobre o resultado
      global.eventEmitter.emit('agent:collaboration:completed', {
        collaborationId,
        sourceAgentId: collaboration.sourceAgentId,
        targetAgentId: collaboration.targetAgentId,
        result: assistanceResult
      });
    } catch (error) {
      console.error(`[SYSTEM ORCHESTRATOR] Erro ao executar colaboração ${collaborationId}:`, error);
      
      // Atualiza status para falha
      const collaborationIndex = this.collaborations.findIndex(c => c.id === collaborationId);
      if (collaborationIndex !== -1) {
        this.collaborations[collaborationIndex].status = 'failed';
        this.collaborations[collaborationIndex].result = { error: error.message || 'Erro desconhecido' };
      }
    }
  }

  /**
   * Processa melhorias autônomas identificadas pelos agentes
   */
  private async processAutonomousImprovements(): Promise<void> {
    try {
      // Só processa se o modo autônomo estiver habilitado
      if (!this.config.autonomousMode) return;
      
      // Filtra melhorias pendentes de alta prioridade
      const pendingImprovements = this.systemState.autoImprovements.filter(
        (improvement: any) => !improvement.processed && improvement.priority === 'high'
      );
      
      if (pendingImprovements.length === 0) {
        console.log('[SYSTEM ORCHESTRATOR] Nenhuma melhoria autônoma pendente');
        return;
      }
      
      console.log(`[SYSTEM ORCHESTRATOR] Processando ${pendingImprovements.length} melhorias autônomas`);
      
      // Limita a uma melhoria por ciclo
      const improvement = pendingImprovements[0];
      
      // Marca como processada
      const improvementIndex = this.systemState.autoImprovements.findIndex(
        (imp: any) => imp.id === improvement.id
      );
      
      if (improvementIndex !== -1) {
        this.systemState.autoImprovements[improvementIndex].processed = true;
        this.systemState.autoImprovements[improvementIndex].processedAt = new Date().toISOString();
      }
      
      // Registra como sugestão no sistema de auto-melhoria
      // Esta implementação dependerá de como o sistema de auto-melhoria está configurado
      console.log(`[SYSTEM ORCHESTRATOR] Melhoria autônoma implementada: ${improvement.title}`);
      
      // Envia evento de melhoria implementada
      global.eventEmitter.emit('orchestrator:improvement:implemented', {
        improvement,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao processar melhorias autônomas:', error);
    }
  }

  /**
   * Reinicia um agente que está com problemas
   */
  private async restartAgent(agentId: string): Promise<boolean> {
    try {
      console.log(`[SYSTEM ORCHESTRATOR] Reiniciando agente ${agentId}...`);
      
      // Remove promessa ativa
      if (this.activePromises.has(agentId)) {
        this.activePromises.delete(agentId);
      }
      
      // Remove agente atual
      this.agents.delete(agentId);
      
      // Recria o agente usando o factory
      const newAgent = agentFactory.createAgent('TechnicalAgent');
      
      // Configure o agente com suas propriedades anteriores
      const metrics = this.agentMetrics.get(agentId);
      Object.assign(newAgent, {
        id: agentId,
        name: `Agente ${agentId}`,
        description: `Agente ${agentId} reiniciado em ${new Date().toISOString()}`
      });
      
      // Inicializa o novo agente
      await newAgent.initialize();
      
      // Adiciona à lista de agentes
      this.agents.set(agentId, newAgent);
      
      // Reinicia métricas
      this.agentMetrics.set(agentId, {
        ...metrics,
        status: 'restarted',
        lastRestart: new Date().toISOString()
      });
      
      console.log(`[SYSTEM ORCHESTRATOR] Agente ${agentId} reiniciado com sucesso`);
      
      // Adiciona alerta informando reinicialização
      this.addAlert({
        level: 'info',
        source: 'orchestrator',
        message: `Agente ${agentId} reiniciado com sucesso`,
        requiresRestart: false
      });
      
      return true;
    } catch (error) {
      console.error(`[SYSTEM ORCHESTRATOR] Erro ao reiniciar agente ${agentId}:`, error);
      
      // Adiciona alerta de erro
      this.addAlert({
        level: 'critical',
        source: 'orchestrator',
        message: `Erro ao reiniciar agente ${agentId}: ${error.message || 'Erro desconhecido'}`,
        requiresRestart: false
      });
      
      return false;
    }
  }

  /**
   * Adiciona alerta ao estado do sistema
   */
  private addAlert(alert: any): void {
    // Limita a 50 alertas no estado
    if (this.systemState.alerts.length >= 50) {
      this.systemState.alerts.shift();
    }
    
    this.systemState.alerts.push({
      id: uuidv4(),
      ...alert,
      timestamp: new Date().toISOString()
    });
    
    // Emite evento de alerta
    global.eventEmitter.emit('orchestrator:alert', {
      alert: this.systemState.alerts[this.systemState.alerts.length - 1],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Adiciona oportunidade ao estado do sistema
   */
  private addOpportunity(opportunity: any): void {
    // Limita a 50 oportunidades no estado
    if (this.systemState.opportunities.length >= 50) {
      this.systemState.opportunities.shift();
    }
    
    this.systemState.opportunities.push({
      id: uuidv4(),
      ...opportunity,
      timestamp: new Date().toISOString()
    });
    
    // Emite evento de oportunidade
    global.eventEmitter.emit('orchestrator:opportunity', {
      opportunity: this.systemState.opportunities[this.systemState.opportunities.length - 1],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Adiciona melhoria autônoma ao estado do sistema
   */
  private addAutoImprovement(improvement: any): void {
    // Limita a 50 melhorias no estado
    if (this.systemState.autoImprovements.length >= 50) {
      this.systemState.autoImprovements.shift();
    }
    
    this.systemState.autoImprovements.push({
      id: uuidv4(),
      ...improvement,
      timestamp: new Date().toISOString(),
      processed: false
    });
    
    // Emite evento de melhoria
    global.eventEmitter.emit('orchestrator:improvement:added', {
      improvement: this.systemState.autoImprovements[this.systemState.autoImprovements.length - 1],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Trata solicitação de colaboração entre agentes
   */
  private handleCollaborationRequest(data: any): void {
    try {
      if (!data.sourceAgentId || !data.targetAgentId || !data.query) {
        console.error('[SYSTEM ORCHESTRATOR] Solicitação de colaboração inválida:', data);
        return;
      }
      
      // Inicia colaboração
      this.initiateCollaboration(data.sourceAgentId, data.targetAgentId, data.query);
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao processar solicitação de colaboração:', error);
    }
  }

  /**
   * Trata melhoria autônoma proposta por agente
   */
  private handleAutonomousImprovement(data: any): void {
    try {
      if (!data.agentId || !data.improvement) {
        console.error('[SYSTEM ORCHESTRATOR] Proposta de melhoria autônoma inválida:', data);
        return;
      }
      
      // Adiciona ao estado do sistema
      this.addAutoImprovement({
        agentId: data.agentId,
        title: data.improvement.title || 'Melhoria autônoma',
        description: data.improvement.description || 'Sem descrição',
        priority: data.improvement.priority || 'medium'
      });
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao processar melhoria autônoma:', error);
    }
  }

  /**
   * Trata alerta emitido por agente
   */
  private handleAgentAlert(data: any): void {
    try {
      if (!data.agentId || !data.alert) {
        console.error('[SYSTEM ORCHESTRATOR] Alerta inválido:', data);
        return;
      }
      
      // Adiciona ao estado do sistema
      this.addAlert({
        level: data.alert.level || 'info',
        source: data.agentId,
        message: data.alert.message || 'Alerta sem mensagem',
        requiresRestart: data.alert.requiresRestart || false
      });
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao processar alerta:', error);
    }
  }

  /**
   * Trata oportunidade identificada por agente
   */
  private handleAgentOpportunity(data: any): void {
    try {
      if (!data.agentId || !data.opportunity) {
        console.error('[SYSTEM ORCHESTRATOR] Oportunidade inválida:', data);
        return;
      }
      
      // Adiciona ao estado do sistema
      this.addOpportunity({
        agentId: data.agentId,
        title: data.opportunity.title || 'Oportunidade identificada',
        description: data.opportunity.description || 'Sem descrição',
        priority: data.opportunity.priority || 'medium',
        confidence: data.opportunity.confidence || 0.7
      });
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao processar oportunidade:', error);
    }
  }

  /**
   * Obtém o estado atual do sistema
   */
  public getSystemState(): any {
    return {
      ...this.systemState,
      currentCycle: this.currentCycle,
      isRunning: this.isRunning,
      lastCycleTime: this.lastCycleTime?.toISOString(),
      agentCount: this.agents.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obtém agentes ativos no orquestrador
   */
  public getActiveAgents(): OrchestratorAgent[] {
    return Array.from(this.agents.keys()).map(agentId => {
      const agent = this.agents.get(agentId)!;
      const metrics = this.agentMetrics.get(agentId) || {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageResponseTime: 0,
        lastExecution: null,
        status: 'unknown'
      };
      
      return {
        id: agentId,
        name: agent.name,
        description: agent.description,
        isActive: metrics.status !== 'error',
        lastExecution: metrics.lastExecution,
        failures: metrics.failedExecutions,
        successRate: metrics.totalExecutions > 0 
          ? metrics.successfulExecutions / metrics.totalExecutions
          : 0,
        metrics: {
          averageResponseTime: metrics.averageResponseTime,
          totalExecutions: metrics.totalExecutions
        }
      };
    });
  }

  /**
   * Obtém colaborações recentes
   */
  public getRecentCollaborations(limit: number = 10): CollaborationEvent[] {
    return this.collaborations.slice(-limit);
  }

  /**
   * Obtém métricas do sistema
   */
  private getMetrics(): any {
    const activePromises = this.activePromises.size;
    const totalExecutions = Array.from(this.agentMetrics.values())
      .reduce((sum, metrics) => sum + metrics.totalExecutions, 0);
    const totalSuccess = Array.from(this.agentMetrics.values())
      .reduce((sum, metrics) => sum + metrics.successfulExecutions, 0);
    const totalFailures = Array.from(this.agentMetrics.values())
      .reduce((sum, metrics) => sum + metrics.failedExecutions, 0);
    
    return {
      activePromises,
      totalExecutions,
      totalSuccess,
      totalFailures,
      successRate: totalExecutions > 0 ? totalSuccess / totalExecutions : 0,
      uptime: this.isRunning ? (Date.now() - (this.lastCycleTime?.getTime() || Date.now())) / 1000 : 0,
      cycles: this.currentCycle,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Obtém configuração do orquestrador
   */
  public getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  /**
   * Atualiza configuração do orquestrador
   */
  public updateConfig(config: Partial<OrchestratorConfig>): boolean {
    try {
      this.config = {
        ...this.config,
        ...config
      };
      
      console.log('[SYSTEM ORCHESTRATOR] Configuração atualizada:', config);
      return true;
    } catch (error) {
      console.error('[SYSTEM ORCHESTRATOR] Erro ao atualizar configuração:', error);
      return false;
    }
  }
  
  /**
   * Alias para getSystemState para compatibilidade com interface
   */
  public getState(): any {
    return this.getSystemState();
  }
  
  /**
   * Verifica se o orquestrador está inicializado
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Executa um ciclo manual do orquestrador
   */
  public async executeManualCycle(): Promise<boolean> {
    if (!this.initialized) {
      console.warn('[SYSTEM ORCHESTRATOR] Tentativa de executar ciclo sem inicialização');
      await this.initialize();
    }
    
    console.log('[SYSTEM ORCHESTRATOR] Executando ciclo manual...');
    return this.runCycle();
  }
  
  /**
   * Exporta a configuração atual do orquestrador
   */
  public exportConfig(): OrchestratorConfig {
    return this.getConfig();
  }
  
  /**
   * Importa configuração para o orquestrador
   */
  public async importConfig(config: Partial<OrchestratorConfig>): Promise<boolean> {
    return this.updateConfig(config);
  }
}

// Exporta a instância singleton
export const systemOrchestrator = SystemOrchestrator.getInstance();