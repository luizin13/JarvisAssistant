import { ISpecializedAgent, AgentContext, AgentResponse, AgentCapability } from './agent-interface';
import { EventEmitter } from 'events';

/**
 * Orquestrador de Agentes Especializados
 * Responsável por coordenar a comunicação e execução entre os diversos agentes
 */
export class AgentOrchestrator {
  private agents: Map<string, ISpecializedAgent> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private tasks: Map<string, any> = new Map();
  private executionHistory: any[] = [];
  private systemStats = {
    totalAgents: 0,
    activeAgents: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageTaskTime: 0,
    lastActivity: new Date().toISOString()
  };

  constructor() {
    // Aumenta o limite de listeners para evitar warnings
    this.eventEmitter.setMaxListeners(100);
    console.log('Orquestrador de agentes especialistas inicializado');
  }

  /**
   * Registra um novo agente no orquestrador
   */
  registerAgent(agent: ISpecializedAgent): boolean {
    try {
      if (this.agents.has(agent.id)) {
        console.warn(`Agente com ID ${agent.id} já está registrado`);
        return false;
      }

      // Registra o agente
      this.agents.set(agent.id, agent);
      
      // Inicializa o agente
      agent.initialize().catch(err => {
        console.error(`Erro ao inicializar agente ${agent.name}:`, err);
      });
      
      // Atualiza estatísticas
      this.systemStats.totalAgents = this.agents.size;
      this.systemStats.activeAgents = this.getActiveAgents().length;
      this.systemStats.lastActivity = new Date().toISOString();
      
      console.log(`Agente ${agent.name} (${agent.id}) registrado com sucesso`);
      
      // Emite evento de registro
      this.eventEmitter.emit('agent:registered', {
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao registrar agente:', error);
      return false;
    }
  }

  /**
   * Remove um agente do orquestrador
   */
  unregisterAgent(agentId: string): boolean {
    if (!this.agents.has(agentId)) {
      console.warn(`Agente com ID ${agentId} não encontrado`);
      return false;
    }

    const agent = this.agents.get(agentId);
    this.agents.delete(agentId);
    
    // Atualiza estatísticas
    this.systemStats.totalAgents = this.agents.size;
    this.systemStats.activeAgents = this.getActiveAgents().length;
    this.systemStats.lastActivity = new Date().toISOString();
    
    console.log(`Agente ${agent?.name} (${agentId}) removido com sucesso`);
    
    // Emite evento de remoção
    this.eventEmitter.emit('agent:unregistered', {
      id: agentId,
      name: agent?.name,
      timestamp: new Date().toISOString()
    });
    
    return true;
  }

  /**
   * Processa uma requisição através do sistema de agentes
   */
  async processRequest(request: any): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Extrai os dados da requisição
      const query = request.query || request;
      const domain = request.domain;
      const agentId = request.agentId;
      const parameters = request.parameters || {};
      
      // Prepara o contexto da solicitação
      const context: AgentContext = {
        request: typeof query === 'string' ? query : JSON.stringify(query),
        parameters,
        systemContext: {
          timestamp: new Date().toISOString(),
          orchestratorVersion: '1.0.0'
        }
      };
      
      // Se tiver um ID de agente específico, usa esse agente diretamente
      if (agentId) {
        const agent = this.agents.find(a => a.id === agentId);
        if (agent) {
          console.log(`Processando requisição diretamente pelo agente ${agent.name} (${agent.id})`);
          return await agent.process(context);
        } else {
          console.warn(`Agente com ID ${agentId} não encontrado`);
        }
      }
      
      // Identifica o domínio principal da solicitação
      const identifiedDomain = domain || this.identifyDomain(query);
      
      // Encontra os agentes apropriados para o domínio
      const primaryAgent = this.findBestAgentForDomain(identifiedDomain);
      
      if (!primaryAgent) {
        // Nenhum agente apropriado encontrado
        const errorResponse: AgentResponse = {
          success: false,
          message: `Não encontrei um agente especializado para processar solicitações de ${identifiedDomain}`,
          insights: [{
            type: 'error',
            content: 'Domínio não suportado atualmente',
            confidence: 1.0
          }]
        };
        
        return errorResponse;
      }
      
      // Processa a solicitação com o agente primário
      console.log(`Delegando solicitação para o agente ${primaryAgent.name}`);
      const response = await primaryAgent.process(context);
      
      // Registra a execução
      this.logExecution({
        agentId: primaryAgent.id,
        domain: identifiedDomain,
        request,
        response,
        processingTime: Date.now() - startTime
      });
      
      // Atualiza estatísticas
      if (response.success) {
        this.systemStats.completedTasks++;
      } else {
        this.systemStats.failedTasks++;
      }
      
      const totalTasks = this.systemStats.completedTasks + this.systemStats.failedTasks;
      const newTaskTime = Date.now() - startTime;
      this.systemStats.averageTaskTime = 
        (this.systemStats.averageTaskTime * (totalTasks - 1) + newTaskTime) / totalTasks;
      
      this.systemStats.lastActivity = new Date().toISOString();
      
      return response;
    } catch (error) {
      console.error('Erro ao processar solicitação no orquestrador:', error);
      
      // Incrementa contador de falhas
      this.systemStats.failedTasks++;
      
      // Retorna resposta de erro
      return {
        success: false,
        message: 'Ocorreu um erro interno no processamento da solicitação',
        metadata: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Identifica o domínio da solicitação
   * Esta função pode ser melhorada com algoritmos de classificação de texto
   */
  private identifyDomain(request: any): string {
    const domainKeywords: Record<string, string[]> = {
      'credito': ['credito', 'empréstimo', 'financiamento', 'bndes', 'scr', 'banco', 'juros', 'capital', 'investimento'],
      'legal': ['jurídico', 'contrato', 'legal', 'processo', 'judicial', 'regularização', 'licença', 'cnd', 'certidão', 'licitação'],
      'financeiro': ['financeiro', 'fluxo de caixa', 'balanço', 'dre', 'investimento', 'retorno', 'roi', 'capital', 'lucro'],
      'hack': ['atalho', 'oportunidade', 'incentivo', 'programa', 'benefício', 'subsídio', 'desconto', 'estratégia'],
      'comunicacao': ['comunicação', 'persuasão', 'articulação', 'contato', 'networking', 'influência', 'negociação'],
      'tecnico': ['técnico', 'arquitetura', 'código', 'sistema', 'otimização', 'tecnologia', 'software', 'desenvolvimento'],
      'aprendizado': ['aprendizado', 'histórico', 'padrão', 'tendência', 'evolução', 'melhoria', 'feedback']
    };
    
    // Função pra normalizar texto (remover acentos, tudo minúsculo)
    const normalizeText = (text: string): string => {
      return text.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .toLowerCase();
    };
    
    // Converte a solicitação para texto se necessário
    let requestText = '';
    if (typeof request === 'string') {
      requestText = request;
    } else if (request.query) {
      requestText = request.query;
    } else if (request.comando) {
      requestText = request.comando;
    } else if (request.text) {
      requestText = request.text;
    } else {
      requestText = JSON.stringify(request);
    }
    
    // Normaliza o texto da solicitação
    const normalizedText = normalizeText(requestText);
    
    // Conta ocorrências de keywords por domínio
    const domainScores: Record<string, number> = {};
    
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      domainScores[domain] = 0;
      for (const keyword of keywords) {
        // Verifica se a keyword está presente no texto normalizado
        const regex = new RegExp(`\\b${normalizeText(keyword)}\\b`, 'g');
        const matches = normalizedText.match(regex);
        if (matches) {
          domainScores[domain] += matches.length;
        }
      }
    }
    
    // Encontra o domínio com maior pontuação
    let bestDomain = 'geral';
    let bestScore = 0;
    
    for (const [domain, score] of Object.entries(domainScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domain;
      }
    }
    
    // Se a pontuação for muito baixa, retorna domínio geral
    return bestScore > 0 ? bestDomain : 'geral';
  }

  /**
   * Encontra o melhor agente para um domínio específico
   */
  private findBestAgentForDomain(domain: string): ISpecializedAgent | null {
    // Filtra os agentes por domínio
    const candidates = Array.from(this.agents.values())
      .filter(agent => agent.domain.toLowerCase() === domain.toLowerCase());
    
    if (candidates.length === 0) {
      // Se não houver agente para o domínio específico, procura por um agente geral
      const generalAgents = Array.from(this.agents.values())
        .filter(agent => agent.domain.toLowerCase() === 'geral');
      
      return generalAgents.length > 0 ? generalAgents[0] : null;
    }
    
    // Retorna o agente com maior score de confiança
    return candidates.reduce((best, current) => {
      return (current.stats.confidenceScore > best.stats.confidenceScore) ? current : best;
    }, candidates[0]);
  }

  /**
   * Cria um novo agente dinamicamente com base em um template
   */
  async createDynamicAgent(
    name: string, 
    description: string, 
    domain: string, 
    capabilities: AgentCapability[]
  ): Promise<string | null> {
    try {
      // Esta função seria responsável por instanciar um novo agente a partir de um template
      // Para implementação completa, seria necessário um sistema de templates e factory de agentes
      console.log(`Tentativa de criar agente dinâmico: ${name} (${domain})`);
      
      // Aqui criaria o agente...
      
      return null; // Por enquanto retorna null, implementação completa requer módulo de factory
    } catch (error) {
      console.error('Erro ao criar agente dinâmico:', error);
      return null;
    }
  }

  /**
   * Avalia e substitui agentes com baixo desempenho
   */
  async evaluateAndReplaceWeakAgents(): Promise<void> {
    // Identificar agentes com baixo desempenho
    const threshold = 0.4; // Limiar de confiança
    const weakAgents = Array.from(this.agents.values())
      .filter(agent => 
        agent.stats.totalRequests > 10 && // Pelo menos 10 requisições
        agent.stats.confidenceScore < threshold
      );
    
    console.log(`Avaliação de agentes: ${weakAgents.length} agentes com baixo desempenho identificados`);
    
    // Para cada agente fraco, tenta evoluir ou substituir
    for (const agent of weakAgents) {
      const evolveSuccess = await agent.evolve();
      
      if (!evolveSuccess) {
        console.log(`Agente ${agent.name} não conseguiu evoluir. Considerando substituição.`);
        // Aqui implementaria a lógica para substituir o agente
      }
    }
  }

  /**
   * Obtém todos os agentes ativos
   */
  getActiveAgents(): ISpecializedAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Obtém um agente específico por ID
   */
  getAgent(id: string): ISpecializedAgent | undefined {
    return this.agents.get(id);
  }

  /**
   * Obtém estatísticas do sistema
   */
  getSystemStats(): any {
    return {
      ...this.systemStats,
      agents: this.getActiveAgents().map(agent => ({
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        version: agent.version,
        stats: agent.stats
      }))
    };
  }

  /**
   * Registra detalhes de execução para análise posterior
   */
  private logExecution(executionDetails: any): void {
    this.executionHistory.push({
      ...executionDetails,
      timestamp: new Date().toISOString()
    });
    
    // Limita o histórico para evitar problemas de memória
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000);
    }
  }

  /**
   * Facilita a comunicação entre agentes
   */
  async facilitateAgentCollaboration(
    requestingAgentId: string,
    targetAgentId: string,
    query: any
  ): Promise<any> {
    const requestingAgent = this.agents.get(requestingAgentId);
    const targetAgent = this.agents.get(targetAgentId);
    
    if (!requestingAgent || !targetAgent) {
      return {
        success: false,
        message: 'Um ou ambos os agentes não encontrados'
      };
    }
    
    try {
      console.log(`Facilitando colaboração: ${requestingAgent.name} -> ${targetAgent.name}`);
      
      // Solicita assistência do agente alvo
      const response = await targetAgent.provideAssistance(requestingAgentId, query);
      
      // Registra a colaboração
      this.logExecution({
        type: 'collaboration',
        requestingAgentId,
        targetAgentId,
        query,
        response,
        timestamp: new Date().toISOString()
      });
      
      return response;
    } catch (error) {
      console.error('Erro na colaboração entre agentes:', error);
      return {
        success: false,
        message: 'Erro na colaboração entre agentes',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Decompõe uma tarefa complexa em subtarefas para diferentes agentes
   */
  async delegateComplexTask(task: any): Promise<AgentResponse> {
    try {
      console.log('Delegando tarefa complexa para múltiplos agentes');
      
      // Analisa a tarefa e identifica componentes
      const subtasks = this.decomposeTask(task);
      
      // Associa cada subtarefa a um agente apropriado
      const assignments = subtasks.map(subtask => ({
        subtask,
        agentId: this.findBestAgentForDomain(subtask.domain)?.id
      })).filter(assignment => assignment.agentId);
      
      // Executa subtarefas em paralelo ou sequencialmente conforme necessário
      const results = await Promise.all(
        assignments.map(async ({ subtask, agentId }) => {
          const agent = this.agents.get(agentId!);
          if (!agent) return { success: false, message: 'Agente não encontrado' };
          
          const context: AgentContext = {
            request: subtask.data,
            systemContext: {
              parentTaskId: task.id,
              isSubtask: true
            }
          };
          
          return agent.process(context);
        })
      );
      
      // Consolida os resultados
      const consolidatedResponse = this.consolidateResults(results);
      
      // Registra a execução
      this.logExecution({
        type: 'complex_task',
        task,
        subtasks: assignments,
        results,
        consolidatedResponse
      });
      
      return consolidatedResponse;
    } catch (error) {
      console.error('Erro ao delegar tarefa complexa:', error);
      return {
        success: false,
        message: 'Erro ao processar tarefa complexa',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Decompõe uma tarefa complexa em subtarefas
   */
  private decomposeTask(task: any): Array<{ domain: string; data: any }> {
    // Esta é uma implementação simplificada
    // Uma versão avançada usaria análise de texto ou um LLM para decomposição inteligente
    
    const subtasks: Array<{ domain: string; data: any }> = [];
    
    // Exemplo de decomposição baseada em domínios primários
    const domains = ['credito', 'legal', 'financeiro', 'hack', 'comunicacao', 'tecnico'];
    
    // Verifica se há componentes específicos de cada domínio na tarefa
    if (task.comando?.includes('analisar:') && task.comando?.includes('crédito')) {
      subtasks.push({
        domain: 'credito',
        data: { ...task, specific: 'credit_analysis' }
      });
    }
    
    if (task.comando?.includes('estrategia:')) {
      subtasks.push({
        domain: 'financeiro',
        data: { ...task, specific: 'strategy_planning' }
      });
      
      subtasks.push({
        domain: 'hack',
        data: { ...task, specific: 'opportunity_finding' }
      });
    }
    
    if (task.comando?.includes('melhoria:') && task.comando?.includes('sistema')) {
      subtasks.push({
        domain: 'tecnico',
        data: { ...task, specific: 'system_improvement' }
      });
    }
    
    // Se nenhuma subtarefa for identificada, trate como uma tarefa geral
    if (subtasks.length === 0) {
      const domain = this.identifyDomain(task);
      subtasks.push({
        domain,
        data: { ...task, specific: 'general_task' }
      });
    }
    
    return subtasks;
  }

  /**
   * Consolida resultados de múltiplos agentes
   */
  private consolidateResults(results: AgentResponse[]): AgentResponse {
    // Filtra resultados bem-sucedidos
    const successfulResults = results.filter(r => r.success);
    
    // Se nenhum resultado for bem-sucedido, retorna erro
    if (successfulResults.length === 0) {
      return {
        success: false,
        message: 'Nenhum agente conseguiu processar a tarefa com sucesso',
        data: results.map(r => r.message)
      };
    }
    
    // Combina insights de todos os resultados
    const allInsights = results
      .flatMap(r => r.insights || [])
      .filter(insight => insight !== undefined);
    
    // Combina itens de ação de todos os resultados
    const allActionItems = results
      .flatMap(r => r.actionItems || [])
      .filter(action => action !== undefined);
    
    // Combina aprendizados de todos os resultados
    const allLearnings = results
      .flatMap(r => r.learnings || [])
      .filter(learning => learning !== undefined);
    
    // Calcula confiança média
    const averageConfidence = results.reduce((sum, r) => 
      sum + (r.metadata?.confidenceLevel || 0), 0) / results.length;
    
    // Constrói resposta consolidada
    return {
      success: true,
      message: 'Tarefa processada por múltiplos agentes especializados',
      data: {
        results: results.map(r => ({
          success: r.success,
          message: r.message,
          data: r.data
        }))
      },
      insights: allInsights,
      actionItems: allActionItems,
      learnings: allLearnings,
      metadata: {
        agentCount: results.length,
        successCount: successfulResults.length,
        averageConfidence
      }
    };
  }
}

// Cria instância singleton do orquestrador
const agentOrchestrator = new AgentOrchestrator();
export default agentOrchestrator;