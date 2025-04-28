import { BaseSpecializedAgent } from './base-agent';
import { AgentContext, AgentResponse, AgentCapability } from './agent-interface';

/**
 * Agente especializado em aprendizado e retroalimentação do sistema
 * Registra histórico, identifica padrões e melhora os demais agentes
 */
export class LearningAgent extends BaseSpecializedAgent {
  // Armazenamento de dados históricos
  private interactionHistory: Array<any> = [];
  private patternRepository: Map<string, any> = new Map();
  private agentPerformanceData: Map<string, any> = new Map();
  private systemInsights: Array<any> = [];
  
  constructor() {
    // Define capabilities específicas do agente de aprendizado
    const capabilities: AgentCapability[] = [
      {
        name: 'analyze_system_patterns',
        description: 'Analisa padrões nas interações do sistema para identificar oportunidades de melhoria',
        parameters: [
          {
            name: 'timeframe',
            type: 'string',
            required: false,
            description: 'Período de análise (ex: "last_30_days", "all_time")'
          },
          {
            name: 'data_category',
            type: 'string',
            required: false,
            description: 'Categoria de dados a analisar (ex: "user_queries", "agent_responses")'
          }
        ],
        examples: [
          'Analisar padrões nas consultas dos últimos 30 dias',
          'Identificar tendências nas solicitações relacionadas a crédito'
        ]
      },
      {
        name: 'identify_improvement_opportunities',
        description: 'Identifica oportunidades de melhoria para os agentes baseado em dados históricos',
        parameters: [
          {
            name: 'agent_id',
            type: 'string',
            required: false,
            description: 'ID do agente específico (ou "all" para todos)'
          },
          {
            name: 'focus_area',
            type: 'string',
            required: false,
            description: 'Área de foco para melhorias (ex: "response_quality", "processing_time")'
          }
        ],
        examples: [
          'Encontrar oportunidades de melhoria para o agente de crédito',
          'Sugerir otimizações gerais para todos os agentes'
        ]
      },
      {
        name: 'generate_learning_insights',
        description: 'Gera insights de aprendizado baseados na análise do histórico do sistema',
        parameters: [
          {
            name: 'insight_type',
            type: 'string',
            required: false,
            description: 'Tipo de insight desejado (ex: "usage_patterns", "agent_correlations")'
          },
          {
            name: 'detail_level',
            type: 'string',
            required: false,
            description: 'Nível de detalhe (ex: "summary", "detailed")'
          }
        ],
        examples: [
          'Gerar insights sobre os padrões de uso do sistema',
          'Análise detalhada da correlação entre consultas de diferentes domínios'
        ]
      },
      {
        name: 'suggest_knowledge_enhancement',
        description: 'Sugere melhorias específicas na base de conhecimento dos agentes',
        parameters: [
          {
            name: 'knowledge_area',
            type: 'string',
            required: true,
            description: 'Área de conhecimento a ser aprimorada'
          },
          {
            name: 'enhancement_type',
            type: 'string',
            required: false,
            description: 'Tipo de aprimoramento (ex: "expand", "update", "correct")'
          }
        ],
        examples: [
          'Sugerir expansão de conhecimento sobre linhas de crédito do BNDES',
          'Identificar informações desatualizadas na base jurídica'
        ]
      }
    ];

    // Chama o construtor da classe base
    super(
      'AgenteAprendiz',
      'Registra todo o histórico, identifica padrões e retroalimenta os demais agentes',
      'aprendizado',
      capabilities
    );
  }

  /**
   * Processa uma solicitação recebida pelo agente
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    let success = false;
    
    try {
      // Extrair informações do contexto
      const request = context.request;
      const systemContext = context.systemContext || {};
      
      // Registra esta interação no histórico
      this.recordInteraction({
        timestamp: new Date().toISOString(),
        request,
        systemContext
      });
      
      // Identifica o tipo de solicitação
      let responseData: any = null;
      let insights: any[] = [];
      let learnings: any[] = [];
      
      // Executa a capacidade solicitada
      if (typeof request === 'string') {
        if (request.includes('analisar padrões') || request.includes('analyze patterns')) {
          responseData = await this.analyzeSystemPatterns(request);
          insights = this.generateInsightsFromPatterns(responseData.patterns);
        }
        else if (request.includes('identificar melhorias') || request.includes('improvement opportunities')) {
          responseData = await this.identifyImprovementOpportunities(request);
          insights = responseData.opportunities.map((opp: any) => ({
            type: 'improvement_opportunity',
            content: opp.description,
            confidence: opp.confidence_score
          }));
        }
        else if (request.includes('insights') || request.includes('insights de aprendizado')) {
          responseData = await this.generateLearningInsights(request);
          insights = responseData.insights.map((insight: any) => ({
            type: 'system_insight',
            content: insight.description,
            confidence: insight.confidence,
            sources: insight.sources
          }));
        }
        else if (request.includes('sugerir conhecimento') || request.includes('enhance knowledge')) {
          const knowledgeArea = this.extractKnowledgeArea(request);
          responseData = await this.suggestKnowledgeEnhancement(knowledgeArea);
          
          learnings = responseData.suggestions.map((sugg: any) => ({
            pattern: sugg.pattern,
            observation: sugg.rationale,
            applicability: sugg.expected_impact
          }));
        }
        else {
          // Resposta padrão se não identificar o comando
          responseData = {
            message: "Posso ajudar com análise de padrões, identificação de melhorias, geração de insights e sugestões de aprimoramento de conhecimento. Como posso assistir hoje?",
            available_commands: this.capabilities.map(c => c.name)
          };
        }
      }
      else if (typeof request === 'object') {
        // Processa solicitações estruturadas
        if (request.command === 'analyze_patterns' || request.action === 'analyze_patterns') {
          const timeframe = request.timeframe || request.parameters?.timeframe || 'last_30_days';
          const category = request.category || request.parameters?.data_category || 'all';
          
          responseData = await this.analyzeSystemPatterns({
            timeframe,
            category
          });
          
          insights = this.generateInsightsFromPatterns(responseData.patterns);
        }
        else if (request.command === 'identify_improvements' || request.action === 'identify_improvements') {
          const agentId = request.agent_id || request.parameters?.agent_id || 'all';
          const focusArea = request.focus_area || request.parameters?.focus_area || 'all';
          
          responseData = await this.identifyImprovementOpportunities({
            agentId,
            focusArea
          });
          
          insights = responseData.opportunities.map((opp: any) => ({
            type: 'improvement_opportunity',
            content: opp.description,
            confidence: opp.confidence_score
          }));
        }
        else if (request.command === 'generate_insights' || request.action === 'generate_insights') {
          const insightType = request.insight_type || request.parameters?.insight_type || 'usage_patterns';
          const detailLevel = request.detail_level || request.parameters?.detail_level || 'summary';
          
          responseData = await this.generateLearningInsights({
            insightType,
            detailLevel
          });
          
          insights = responseData.insights.map((insight: any) => ({
            type: 'system_insight',
            content: insight.description,
            confidence: insight.confidence,
            sources: insight.sources
          }));
        }
        else {
          // Resposta padrão para comando não reconhecido
          responseData = {
            message: "Comando não reconhecido. Por favor, especifique uma das seguintes ações: analyze_patterns, identify_improvements, generate_insights, suggest_knowledge_enhancement",
            available_commands: this.capabilities.map(c => c.name)
          };
        }
      }
      
      // Aproveita esta interação para aprendizado
      this.learn({
        request,
        response: responseData,
        systemContext,
        timestamp: new Date().toISOString()
      }).catch(err => {
        console.error("Erro no aprendizado:", err);
      });
      
      // Constrói resposta final
      const response: AgentResponse = {
        success: true,
        message: "Análise de aprendizado concluída com sucesso",
        data: responseData,
        insights,
        learnings,
        metadata: {
          processingTime: Date.now() - startTime,
          confidenceLevel: 0.85,
          modelUsed: "LearningAnalysisSystem",
          version: this.version
        }
      };
      
      success = true;
      return response;
      
    } catch (error) {
      console.error(`Erro no processamento do ${this.name}:`, error);
      
      const errorResponse: AgentResponse = {
        success: false,
        message: `Erro ao processar solicitação de aprendizado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        metadata: {
          processingTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      };
      
      return errorResponse;
    } finally {
      // Atualiza estatísticas
      this.updateStats(startTime, success);
    }
  }

  /**
   * Registra uma interação no histórico
   */
  private recordInteraction(interaction: any): void {
    this.interactionHistory.push(interaction);
    
    // Limita o tamanho do histórico para evitar problemas de memória
    if (this.interactionHistory.length > 1000) {
      this.interactionHistory = this.interactionHistory.slice(-1000);
    }
  }

  /**
   * Analisa padrões nas interações do sistema
   */
  private async analyzeSystemPatterns(params: any): Promise<any> {
    // Determina o período de análise
    let timeframe = 'last_30_days';
    let category = 'all';
    
    if (typeof params === 'string') {
      // Extrai parâmetros da string
      if (params.includes('last_7_days') || params.includes('última semana')) {
        timeframe = 'last_7_days';
      } else if (params.includes('last_24_hours') || params.includes('último dia')) {
        timeframe = 'last_24_hours';
      } else if (params.includes('all_time') || params.includes('todo histórico')) {
        timeframe = 'all_time';
      }
      
      // Extrai categoria
      if (params.includes('user_queries') || params.includes('consultas')) {
        category = 'user_queries';
      } else if (params.includes('agent_responses') || params.includes('respostas')) {
        category = 'agent_responses';
      } else if (params.includes('performance') || params.includes('desempenho')) {
        category = 'performance';
      }
    } else if (typeof params === 'object') {
      timeframe = params.timeframe || timeframe;
      category = params.category || category;
    }
    
    // Filtra o histórico de acordo com o timeframe
    const now = new Date();
    const filteredHistory = this.interactionHistory.filter(item => {
      const itemDate = new Date(item.timestamp);
      
      if (timeframe === 'last_24_hours') {
        return (now.getTime() - itemDate.getTime()) <= 24 * 60 * 60 * 1000;
      } else if (timeframe === 'last_7_days') {
        return (now.getTime() - itemDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      } else if (timeframe === 'last_30_days') {
        return (now.getTime() - itemDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      } else {
        // all_time
        return true;
      }
    });
    
    // Estrutura padrões identificados por categoria
    const patterns: any[] = [];
    
    // Análise de padrões por categoria
    if (category === 'all' || category === 'user_queries') {
      const queryPatterns = this.analyzeQueryPatterns(filteredHistory);
      patterns.push(...queryPatterns);
    }
    
    if (category === 'all' || category === 'performance') {
      const performancePatterns = this.analyzePerformancePatterns(filteredHistory);
      patterns.push(...performancePatterns);
    }
    
    if (category === 'all' || category === 'agent_responses') {
      const responsePatterns = this.analyzeResponsePatterns(filteredHistory);
      patterns.push(...responsePatterns);
    }
    
    // Armazena os padrões identificados para uso futuro
    this.updatePatternRepository(patterns);
    
    return {
      timeframe,
      category,
      analysis_time: new Date().toISOString(),
      total_interactions_analyzed: filteredHistory.length,
      patterns
    };
  }

  /**
   * Analisa padrões nas consultas dos usuários
   */
  private analyzeQueryPatterns(history: any[]): any[] {
    // Esta é uma implementação simplificada
    // Uma implementação real usaria técnicas avançadas de processamento de linguagem natural
    
    const patterns: any[] = [];
    const queryTerms: Record<string, number> = {};
    const domainDistribution: Record<string, number> = {};
    
    // Conta frequência de termos e domínios
    for (const item of history) {
      let query = '';
      
      if (typeof item.request === 'string') {
        query = item.request;
      } else if (item.request?.query) {
        query = item.request.query;
      } else if (item.request?.comando) {
        query = item.request.comando;
      } else if (typeof item.request === 'object') {
        query = JSON.stringify(item.request);
      }
      
      // Extrai e conta termos das consultas
      const words = query.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .split(/\s+/);
      
      for (const word of words) {
        if (word.length > 3) { // Ignora palavras muito curtas
          queryTerms[word] = (queryTerms[word] || 0) + 1;
        }
      }
      
      // Registra domínio da consulta
      const domain = item.systemContext?.domain || 'desconhecido';
      domainDistribution[domain] = (domainDistribution[domain] || 0) + 1;
    }
    
    // Identifica termos mais comuns
    const topTerms = Object.entries(queryTerms)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));
    
    if (topTerms.length > 0) {
      patterns.push({
        type: 'frequent_terms',
        description: 'Termos mais frequentes nas consultas dos usuários',
        data: topTerms,
        confidence: 0.8
      });
    }
    
    // Analisa distribuição de domínios
    const domainData = Object.entries(domainDistribution)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .map(([domain, count]) => ({ domain, count }));
    
    if (domainData.length > 0) {
      patterns.push({
        type: 'domain_distribution',
        description: 'Distribuição de consultas por domínio',
        data: domainData,
        confidence: 0.9
      });
    }
    
    return patterns;
  }

  /**
   * Analisa padrões de desempenho do sistema
   */
  private analyzePerformancePatterns(history: any[]): any[] {
    const patterns: any[] = [];
    
    // Calcula tempos de resposta médios
    if (history.length > 0) {
      let totalProcessingTime = 0;
      let successCount = 0;
      let failureCount = 0;
      
      for (const item of history) {
        const metadata = item.response?.metadata || {};
        
        if (metadata.processingTime) {
          totalProcessingTime += metadata.processingTime;
        }
        
        if (item.response?.success === true) {
          successCount++;
        } else if (item.response?.success === false) {
          failureCount++;
        }
      }
      
      const avgProcessingTime = totalProcessingTime / history.length;
      const successRate = history.length > 0 ? successCount / history.length : 0;
      
      patterns.push({
        type: 'performance_metrics',
        description: 'Métricas de desempenho do sistema',
        data: {
          average_processing_time_ms: avgProcessingTime,
          success_rate: successRate,
          failure_rate: 1 - successRate,
          total_interactions: history.length
        },
        confidence: 0.95
      });
    }
    
    // Identifica horários de pico
    if (history.length >= 10) {
      const hourDistribution: Record<number, number> = {};
      
      for (const item of history) {
        if (item.timestamp) {
          const hour = new Date(item.timestamp).getHours();
          hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
        }
      }
      
      const peakHours = Object.entries(hourDistribution)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }));
      
      patterns.push({
        type: 'usage_patterns',
        description: 'Padrões de uso do sistema',
        data: {
          peak_hours: peakHours,
          hour_distribution: Object.entries(hourDistribution)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => a.hour - b.hour)
        },
        confidence: 0.75
      });
    }
    
    return patterns;
  }

  /**
   * Analisa padrões nas respostas dos agentes
   */
  private analyzeResponsePatterns(history: any[]): any[] {
    const patterns: any[] = [];
    const responsesByAgent: Record<string, any[]> = {};
    
    // Agrupa respostas por agente
    for (const item of history) {
      const agentId = item.systemContext?.agentId || 'unknown';
      
      if (!responsesByAgent[agentId]) {
        responsesByAgent[agentId] = [];
      }
      
      if (item.response) {
        responsesByAgent[agentId].push(item.response);
      }
    }
    
    // Analisa cada agente
    for (const [agentId, responses] of Object.entries(responsesByAgent)) {
      if (responses.length < 5) continue; // Ignora agentes com poucas respostas
      
      let successCount = 0;
      let insightCount = 0;
      let actionItemCount = 0;
      
      for (const response of responses) {
        if (response.success) successCount++;
        if (response.insights?.length > 0) insightCount++;
        if (response.actionItems?.length > 0) actionItemCount++;
      }
      
      patterns.push({
        type: 'agent_response_pattern',
        description: `Padrões de resposta do agente ${agentId}`,
        agent_id: agentId,
        data: {
          total_responses: responses.length,
          success_rate: responses.length > 0 ? successCount / responses.length : 0,
          with_insights_rate: responses.length > 0 ? insightCount / responses.length : 0,
          with_action_items_rate: responses.length > 0 ? actionItemCount / responses.length : 0
        },
        confidence: 0.8
      });
    }
    
    return patterns;
  }

  /**
   * Atualiza o repositório de padrões com novos insights
   */
  private updatePatternRepository(newPatterns: any[]): void {
    for (const pattern of newPatterns) {
      const patternKey = `${pattern.type}_${new Date().toISOString().split('T')[0]}`;
      this.patternRepository.set(patternKey, {
        ...pattern,
        identified_at: new Date().toISOString()
      });
    }
    
    // Limita o tamanho do repositório
    if (this.patternRepository.size > 500) {
      // Remove os padrões mais antigos
      const keys = Array.from(this.patternRepository.keys()).sort();
      for (let i = 0; i < keys.length - 500; i++) {
        this.patternRepository.delete(keys[i]);
      }
    }
  }

  /**
   * Gera insights a partir dos padrões identificados
   */
  private generateInsightsFromPatterns(patterns: any[]): any[] {
    const insights: any[] = [];
    
    for (const pattern of patterns) {
      switch (pattern.type) {
        case 'frequent_terms':
          if (pattern.data?.length > 0) {
            insights.push({
              type: 'usage_insight',
              content: `Os termos mais frequentes nas consultas são: ${pattern.data.slice(0, 3).map((t: any) => t.term).join(', ')}`,
              confidence: 0.85
            });
          }
          break;
          
        case 'domain_distribution':
          if (pattern.data?.length > 0) {
            const topDomain = pattern.data[0];
            insights.push({
              type: 'domain_insight',
              content: `O domínio "${topDomain.domain}" representa a maior parte das consultas (${(topDomain.count / pattern.data.reduce((sum: number, item: any) => sum + item.count, 0) * 100).toFixed(1)}%)`,
              confidence: 0.9
            });
          }
          break;
          
        case 'performance_metrics':
          if (pattern.data?.success_rate < 0.8) {
            insights.push({
              type: 'performance_insight',
              content: `A taxa de sucesso atual de ${(pattern.data.success_rate * 100).toFixed(1)}% está abaixo do ideal. Recomenda-se análise das falhas recorrentes.`,
              confidence: 0.85
            });
          }
          break;
      }
    }
    
    return insights;
  }

  /**
   * Identifica oportunidades de melhoria para os agentes
   */
  private async identifyImprovementOpportunities(params: any): Promise<any> {
    // Determinar agente alvo e área de foco
    let agentId = 'all';
    let focusArea = 'all';
    
    if (typeof params === 'string') {
      // Extrair parâmetros da string
      const agentMatch = params.match(/agente\s+(\w+)/i) || params.match(/agent\s+(\w+)/i);
      if (agentMatch) {
        agentId = agentMatch[1];
      }
      
      if (params.includes('resposta') || params.includes('response')) {
        focusArea = 'response_quality';
      } else if (params.includes('desempenho') || params.includes('performance')) {
        focusArea = 'performance';
      } else if (params.includes('conhecimento') || params.includes('knowledge')) {
        focusArea = 'knowledge_base';
      }
    } else if (typeof params === 'object') {
      agentId = params.agentId || agentId;
      focusArea = params.focusArea || focusArea;
    }
    
    // Lista de oportunidades de melhoria identificadas
    const opportunities: any[] = [];
    
    // Analisa histórico recente para identificar oportunidades
    const recentHistory = this.interactionHistory.slice(-100); // Últimas 100 interações
    
    // Oportunidades relacionadas à qualidade da resposta
    if (focusArea === 'all' || focusArea === 'response_quality') {
      const responseQualityOpportunities = this.identifyResponseQualityOpportunities(recentHistory, agentId);
      opportunities.push(...responseQualityOpportunities);
    }
    
    // Oportunidades relacionadas ao desempenho
    if (focusArea === 'all' || focusArea === 'performance') {
      const performanceOpportunities = this.identifyPerformanceOpportunities(recentHistory, agentId);
      opportunities.push(...performanceOpportunities);
    }
    
    // Oportunidades relacionadas à base de conhecimento
    if (focusArea === 'all' || focusArea === 'knowledge_base') {
      const knowledgeOpportunities = this.identifyKnowledgeOpportunities(recentHistory, agentId);
      opportunities.push(...knowledgeOpportunities);
    }
    
    return {
      target_agent: agentId,
      focus_area: focusArea,
      analysis_time: new Date().toISOString(),
      total_interactions_analyzed: recentHistory.length,
      opportunities: opportunities.sort((a, b) => b.priority_score - a.priority_score)
    };
  }

  /**
   * Identifica oportunidades relacionadas à qualidade da resposta
   */
  private identifyResponseQualityOpportunities(history: any[], targetAgentId: string): any[] {
    const opportunities: any[] = [];
    
    // Filtrar histórico pelo agente alvo se necessário
    const filteredHistory = targetAgentId === 'all' ? 
      history : 
      history.filter(item => item.systemContext?.agentId === targetAgentId);
    
    // Verifica problemas com respostas sem ação clara
    const responsesWithoutActionItems = filteredHistory.filter(item => {
      return item.response?.success === true && 
             (!item.response.actionItems || item.response.actionItems.length === 0);
    });
    
    if (responsesWithoutActionItems.length > 5) {
      const ratio = responsesWithoutActionItems.length / filteredHistory.length;
      opportunities.push({
        type: 'actionable_content',
        description: `${(ratio * 100).toFixed(1)}% das respostas não contêm itens de ação concretos`,
        recommendation: 'Adicionar sugestões de ação claras e específicas em todas as respostas',
        target_agent: targetAgentId,
        priority_score: ratio > 0.5 ? 0.9 : 0.7,
        confidence_score: 0.85
      });
    }
    
    // Verifica problemas com respostas muito genéricas
    // Análise simplificada - uma implementação real usaria NLP
    const genericResponses = filteredHistory.filter(item => {
      const responseText = item.response?.message || '';
      const genericPhrases = ['não foi possível', 'tente novamente', 'erro interno', 'comando não reconhecido'];
      return genericPhrases.some(phrase => responseText.toLowerCase().includes(phrase));
    });
    
    if (genericResponses.length > 3) {
      const ratio = genericResponses.length / filteredHistory.length;
      opportunities.push({
        type: 'response_specificity',
        description: `${(ratio * 100).toFixed(1)}% das respostas são muito genéricas ou contêm mensagens de erro`,
        recommendation: 'Melhorar o processamento de erros e fornecer respostas mais específicas',
        target_agent: targetAgentId,
        priority_score: ratio > 0.3 ? 0.85 : 0.6,
        confidence_score: 0.8
      });
    }
    
    return opportunities;
  }

  /**
   * Identifica oportunidades relacionadas ao desempenho
   */
  private identifyPerformanceOpportunities(history: any[], targetAgentId: string): any[] {
    const opportunities: any[] = [];
    
    // Filtrar histórico pelo agente alvo se necessário
    const filteredHistory = targetAgentId === 'all' ? 
      history : 
      history.filter(item => item.systemContext?.agentId === targetAgentId);
    
    // Analisa tempo de processamento
    const processingTimes = filteredHistory
      .map(item => item.response?.metadata?.processingTime)
      .filter(time => typeof time === 'number');
    
    if (processingTimes.length > 10) {
      const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      const slowResponses = processingTimes.filter(time => time > avgProcessingTime * 1.5);
      
      if (slowResponses.length > processingTimes.length * 0.2) {
        opportunities.push({
          type: 'processing_speed',
          description: `${slowResponses.length} respostas (${(slowResponses.length / processingTimes.length * 100).toFixed(1)}%) têm tempo de processamento significativamente acima da média`,
          recommendation: 'Otimizar algoritmos e implementar cache para tipos comuns de solicitações',
          target_agent: targetAgentId,
          priority_score: 0.8,
          confidence_score: 0.85
        });
      }
    }
    
    // Analisa taxa de erros
    const failedResponses = filteredHistory.filter(item => item.response?.success === false);
    
    if (failedResponses.length > 0 && filteredHistory.length > 5) {
      const failureRate = failedResponses.length / filteredHistory.length;
      
      if (failureRate > 0.1) { // Taxa de falha maior que 10%
        opportunities.push({
          type: 'error_rate',
          description: `Taxa de erro de ${(failureRate * 100).toFixed(1)}% está acima do limite aceitável`,
          recommendation: 'Implementar tratamento de erros mais robusto e validação de entradas',
          target_agent: targetAgentId,
          priority_score: failureRate > 0.2 ? 0.95 : 0.8,
          confidence_score: 0.9
        });
      }
    }
    
    return opportunities;
  }

  /**
   * Identifica oportunidades relacionadas à base de conhecimento
   */
  private identifyKnowledgeOpportunities(history: any[], targetAgentId: string): any[] {
    const opportunities: any[] = [];
    
    // Filtrar histórico pelo agente alvo se necessário
    const filteredHistory = targetAgentId === 'all' ? 
      history : 
      history.filter(item => item.systemContext?.agentId === targetAgentId);
    
    // Análise de termos não reconhecidos
    // Simplificação: na implementação real, usaria NLP para identificar conceitos desconhecidos
    const potentialUnknownTerms: Record<string, number> = {};
    
    for (const item of filteredHistory) {
      if (item.response?.success === false) {
        const query = typeof item.request === 'string' ? 
          item.request : 
          JSON.stringify(item.request);
        
        // Extrai palavras-chave potenciais (simplificado)
        const words = query.toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 4); // Palavras significativas tendem a ser mais longas
        
        for (const word of words) {
          potentialUnknownTerms[word] = (potentialUnknownTerms[word] || 0) + 1;
        }
      }
    }
    
    // Identifica termos recorrentes em consultas com falha
    const recurringUnknownTerms = Object.entries(potentialUnknownTerms)
      .filter(([_, count]) => count > 1)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5)
      .map(([term, count]) => ({ term, count }));
    
    if (recurringUnknownTerms.length > 0) {
      opportunities.push({
        type: 'knowledge_gap',
        description: `Potenciais lacunas na base de conhecimento relacionadas a: ${recurringUnknownTerms.map(t => t.term).join(', ')}`,
        recommendation: 'Expandir a base de conhecimento para incluir estes conceitos',
        target_agent: targetAgentId,
        priority_score: 0.85,
        confidence_score: 0.75,
        details: {
          recurring_terms: recurringUnknownTerms
        }
      });
    }
    
    // Identifica potenciais informações desatualizadas (simplificado)
    // Na implementação real, seria necessário cruzar com fontes externas atualizadas
    opportunities.push({
      type: 'knowledge_freshness',
      description: 'A base de conhecimento pode conter informações que precisam ser atualizadas periodicamente',
      recommendation: 'Implementar processo de verificação regular de atualidade das informações',
      target_agent: targetAgentId,
      priority_score: 0.7,
      confidence_score: 0.6
    });
    
    return opportunities;
  }

  /**
   * Gera insights de aprendizado baseados na análise do histórico
   */
  private async generateLearningInsights(params: any): Promise<any> {
    // Determinar tipo de insight e nível de detalhe
    let insightType = 'usage_patterns';
    let detailLevel = 'summary';
    
    if (typeof params === 'string') {
      if (params.includes('correlação') || params.includes('correlation')) {
        insightType = 'agent_correlations';
      } else if (params.includes('crescimento') || params.includes('growth')) {
        insightType = 'growth_opportunities';
      } else if (params.includes('problemas') || params.includes('issues')) {
        insightType = 'recurring_issues';
      }
      
      if (params.includes('detalhado') || params.includes('detailed')) {
        detailLevel = 'detailed';
      }
    } else if (typeof params === 'object') {
      insightType = params.insightType || insightType;
      detailLevel = params.detailLevel || detailLevel;
    }
    
    // Gerar insights com base no tipo solicitado
    const insights: any[] = [];
    
    switch (insightType) {
      case 'usage_patterns':
        insights.push(...this.generateUsagePatternInsights(detailLevel));
        break;
        
      case 'agent_correlations':
        insights.push(...this.generateAgentCorrelationInsights(detailLevel));
        break;
        
      case 'growth_opportunities':
        insights.push(...this.generateGrowthOpportunityInsights(detailLevel));
        break;
        
      case 'recurring_issues':
        insights.push(...this.generateRecurringIssueInsights(detailLevel));
        break;
    }
    
    return {
      insight_type: insightType,
      detail_level: detailLevel,
      analysis_time: new Date().toISOString(),
      insights
    };
  }

  /**
   * Gera insights sobre padrões de uso
   */
  private generateUsagePatternInsights(detailLevel: string): any[] {
    // Análise simplificada - uma implementação real seria mais sofisticada
    const recentPatterns = Array.from(this.patternRepository.values())
      .filter(pattern => pattern.type === 'usage_patterns' || pattern.type === 'domain_distribution');
    
    if (recentPatterns.length === 0) {
      return [{
        type: 'insufficient_data',
        description: 'Dados insuficientes para gerar insights sobre padrões de uso',
        confidence: 0.9,
        sources: []
      }];
    }
    
    const insights: any[] = [];
    
    // Insight sobre distribuição de domínios
    const domainDistribution = recentPatterns.find(p => p.type === 'domain_distribution');
    if (domainDistribution) {
      const topDomains = domainDistribution.data.slice(0, 3).map((d: any) => d.domain);
      
      insights.push({
        type: 'domain_preference',
        description: `Os domínios mais consultados são ${topDomains.join(', ')}`,
        confidence: 0.85,
        sources: ['domain_distribution_analysis'],
        recommendations: detailLevel === 'detailed' ? [
          'Priorizar melhorias nos agentes desses domínios',
          'Considerar expansão de capacidades nesses domínios'
        ] : []
      });
    }
    
    // Insight sobre horários de uso
    const usagePatterns = recentPatterns.find(p => p.type === 'usage_patterns');
    if (usagePatterns && usagePatterns.data?.peak_hours) {
      const peakHours = usagePatterns.data.peak_hours.map((h: any) => h.hour);
      
      insights.push({
        type: 'usage_timing',
        description: `O sistema é mais utilizado nos horários: ${peakHours.map(h => `${h}h`).join(', ')}`,
        confidence: 0.8,
        sources: ['hourly_usage_analysis'],
        implications: detailLevel === 'detailed' ? [
          'Otimizar recursos do sistema para esses horários de pico',
          'Considerar processos em lote fora dos horários de pico'
        ] : []
      });
    }
    
    return insights;
  }

  /**
   * Gera insights sobre correlações entre agentes
   */
  private generateAgentCorrelationInsights(detailLevel: string): any[] {
    // Análise simplificada - uma implementação real faria análise estatística
    
    // Obter agentes que têm colaborado em tarefas
    const collaborationMap = new Map<string, Set<string>>();
    
    for (const interaction of this.interactionHistory) {
      if (interaction.systemContext?.collaboratingAgents?.length > 1) {
        const agents = interaction.systemContext.collaboratingAgents;
        
        for (const agent of agents) {
          if (!collaborationMap.has(agent)) {
            collaborationMap.set(agent, new Set());
          }
          
          // Registra colaborações com outros agentes
          for (const otherAgent of agents) {
            if (otherAgent !== agent) {
              collaborationMap.get(agent)!.add(otherAgent);
            }
          }
        }
      }
    }
    
    // Se não houver dados de colaboração, retorne insight genérico
    if (collaborationMap.size === 0) {
      return [{
        type: 'collaboration_insight',
        description: 'Não há dados suficientes sobre colaboração entre agentes',
        confidence: 0.9,
        sources: [],
        recommendation: 'Implementar rastreamento de colaborações entre agentes'
      }];
    }
    
    // Identifica agentes com mais colaborações
    const collaborationCounts = Array.from(collaborationMap.entries())
      .map(([agent, collaborators]) => ({
        agent,
        collaborationCount: collaborators.size
      }))
      .sort((a, b) => b.collaborationCount - a.collaborationCount);
    
    // Agentes mais colaborativos
    const topCollaborators = collaborationCounts.slice(0, 3);
    
    const insights = [{
      type: 'collaboration_pattern',
      description: `Os agentes com maior colaboração são: ${topCollaborators.map(tc => tc.agent).join(', ')}`,
      confidence: 0.85,
      sources: ['agent_collaboration_analysis'],
      details: detailLevel === 'detailed' ? {
        top_collaborators: topCollaborators
      } : undefined
    }];
    
    // Para análise detalhada, adiciona padrões de colaboração específicos
    if (detailLevel === 'detailed' && collaborationMap.size >= 2) {
      const collaborationPatterns = [];
      
      for (const [agent, collaborators] of collaborationMap.entries()) {
        if (collaborators.size > 0) {
          collaborationPatterns.push({
            agent,
            frequent_collaborators: Array.from(collaborators)
          });
        }
      }
      
      insights.push({
        type: 'detailed_collaboration',
        description: 'Padrões detalhados de colaboração entre agentes',
        confidence: 0.8,
        sources: ['agent_collaboration_analysis'],
        collaboration_patterns: collaborationPatterns
      });
    }
    
    return insights;
  }

  /**
   * Gera insights sobre oportunidades de crescimento
   */
  private generateGrowthOpportunityInsights(detailLevel: string): any[] {
    // Para uma implementação real, estas oportunidades seriam baseadas
    // em análise sofisticada dos dados históricos e tendências
    
    const insights = [
      {
        type: 'capability_expansion',
        description: 'Expansão de capacidades em áreas de alta demanda',
        confidence: 0.8,
        sources: ['domain_distribution_analysis', 'query_pattern_analysis'],
        opportunity_details: detailLevel === 'detailed' ? {
          recommended_areas: [
            {
              domain: 'credito',
              capability: 'produtos_inovadores',
              rationale: 'Consultas frequentes sobre alternativas de financiamento'
            },
            {
              domain: 'legal',
              capability: 'automatizacao_documentos',
              rationale: 'Pedidos recorrentes de análise de documentos jurídicos'
            }
          ]
        } : undefined
      },
      {
        type: 'integration_opportunity',
        description: 'Oportunidades de integração com sistemas externos',
        confidence: 0.75,
        sources: ['agent_capability_analysis'],
        details: detailLevel === 'detailed' ? {
          potential_integrations: [
            {
              system: 'APIs bancárias',
              benefit: 'Acesso a dados de crédito em tempo real',
              complexity: 'Média'
            },
            {
              system: 'Sistemas de registros públicos',
              benefit: 'Verificação automática de certidões e cadastros',
              complexity: 'Alta'
            }
          ]
        } : undefined
      }
    ];
    
    return insights;
  }

  /**
   * Gera insights sobre problemas recorrentes
   */
  private generateRecurringIssueInsights(detailLevel: string): any[] {
    // Analisa falhas recorrentes no histórico
    const failedInteractions = this.interactionHistory.filter(
      item => item.response?.success === false
    );
    
    if (failedInteractions.length < 5) {
      return [{
        type: 'insufficient_failure_data',
        description: 'Dados insuficientes sobre falhas para identificar padrões recorrentes',
        confidence: 0.9,
        sources: []
      }];
    }
    
    // Categoriza falhas (simplificado)
    const failureCategories: Record<string, any[]> = {
      'input_validation': [],
      'knowledge_gap': [],
      'processing_error': [],
      'external_dependency': [],
      'other': []
    };
    
    for (const failure of failedInteractions) {
      const errorMessage = failure.response?.message || '';
      const errorDetails = failure.response?.metadata?.error || '';
      
      if (errorMessage.includes('validação') || errorMessage.includes('validation') ||
          errorMessage.includes('inválido') || errorMessage.includes('invalid')) {
        failureCategories['input_validation'].push(failure);
      }
      else if (errorMessage.includes('não reconhecido') || errorMessage.includes('desconhecido') ||
               errorMessage.includes('unknown') || errorMessage.includes('not recognized')) {
        failureCategories['knowledge_gap'].push(failure);
      }
      else if (errorMessage.includes('processamento') || errorMessage.includes('processing') ||
               errorMessage.includes('interno') || errorMessage.includes('internal')) {
        failureCategories['processing_error'].push(failure);
      }
      else if (errorMessage.includes('serviço externo') || errorMessage.includes('external service') ||
               errorMessage.includes('API') || errorMessage.includes('conexão') || 
               errorMessage.includes('connection')) {
        failureCategories['external_dependency'].push(failure);
      }
      else {
        failureCategories['other'].push(failure);
      }
    }
    
    // Identifica categorias mais problemáticas
    const categoryCounts = Object.entries(failureCategories)
      .map(([category, failures]) => ({
        category,
        count: failures.length,
        percentage: (failures.length / failedInteractions.length) * 100
      }))
      .sort((a, b) => b.count - a.count);
    
    const insights = [];
    
    // Insight principal sobre categoria mais problemática
    if (categoryCounts[0].count > 0) {
      const topCategory = categoryCounts[0];
      
      insights.push({
        type: 'primary_issue',
        description: `A categoria "${this.translateFailureCategory(topCategory.category)}" representa ${topCategory.percentage.toFixed(1)}% das falhas`,
        confidence: 0.85,
        sources: ['failure_analysis'],
        recommendations: [
          this.getRecommendationForCategory(topCategory.category)
        ]
      });
    }
    
    // Para análise detalhada, adiciona distribuição completa de falhas
    if (detailLevel === 'detailed') {
      insights.push({
        type: 'failure_distribution',
        description: 'Distribuição detalhada de falhas por categoria',
        confidence: 0.9,
        sources: ['failure_analysis'],
        categories: categoryCounts.filter(c => c.count > 0).map(c => ({
          category: this.translateFailureCategory(c.category),
          count: c.count,
          percentage: c.percentage.toFixed(1) + '%',
          recommendation: this.getRecommendationForCategory(c.category)
        }))
      });
    }
    
    return insights;
  }

  /**
   * Traduz categoria de falha para português
   */
  private translateFailureCategory(category: string): string {
    const translations: Record<string, string> = {
      'input_validation': 'Validação de entrada',
      'knowledge_gap': 'Lacuna de conhecimento',
      'processing_error': 'Erro de processamento',
      'external_dependency': 'Dependência externa',
      'other': 'Outros erros'
    };
    
    return translations[category] || category;
  }

  /**
   * Obtém recomendação para categoria de falha
   */
  private getRecommendationForCategory(category: string): string {
    const recommendations: Record<string, string> = {
      'input_validation': 'Melhorar validação de entradas com feedback claro ao usuário',
      'knowledge_gap': 'Expandir base de conhecimento para cobrir conceitos frequentemente não reconhecidos',
      'processing_error': 'Revisar e otimizar algoritmos de processamento para maior robustez',
      'external_dependency': 'Implementar mecanismos de fallback e retry para integrações externas',
      'other': 'Analisar logs detalhados para identificar padrões específicos de erro'
    };
    
    return recommendations[category] || 'Investigar causas específicas e implementar correções';
  }

  /**
   * Sugere melhorias na base de conhecimento
   */
  private async suggestKnowledgeEnhancement(knowledgeArea: string): Promise<any> {
    // Analisa histórico para identificar potenciais melhorias
    const suggestions: any[] = [];
    
    if (knowledgeArea === 'credito' || knowledgeArea.includes('credito') || knowledgeArea.includes('crédito')) {
      suggestions.push({
        area: 'credito',
        type: 'expand',
        pattern: 'novos_produtos_credito',
        description: 'Expandir conhecimento sobre novas linhas e produtos de crédito',
        rationale: 'Consultas frequentes sobre alternativas aos produtos tradicionais',
        expected_impact: 'Permitirá oferecer opções mais amplas e personalizadas'
      });
      
      suggestions.push({
        area: 'credito',
        type: 'update',
        pattern: 'taxas_juros_atuais',
        description: 'Atualizar base de conhecimento com as taxas de juros mais recentes',
        rationale: 'Taxas de juros mudam frequentemente e informações atualizadas são críticas',
        expected_impact: 'Recomendações mais precisas e alinhadas ao mercado atual'
      });
    }
    
    if (knowledgeArea === 'legal' || knowledgeArea.includes('legal') || knowledgeArea.includes('jurídico')) {
      suggestions.push({
        area: 'legal',
        type: 'expand',
        pattern: 'legislacao_ambiental',
        description: 'Expandir conhecimento sobre legislação ambiental para agronegócio',
        rationale: 'Aumento em consultas sobre conformidade ambiental em operações rurais',
        expected_impact: 'Melhor orientação sobre requisitos de conformidade'
      });
    }
    
    if (knowledgeArea === 'tecnico' || knowledgeArea.includes('tecnico') || knowledgeArea.includes('técnico')) {
      suggestions.push({
        area: 'tecnico',
        type: 'update',
        pattern: 'algoritmos_ia',
        description: 'Atualizar conhecimento sobre algoritmos avançados de IA',
        rationale: 'O campo de IA evolui rapidamente com novos algoritmos e abordagens',
        expected_impact: 'Melhoria contínua na eficiência e qualidade das respostas'
      });
    }
    
    // Se nenhuma área específica for identificada, retorna sugestões gerais
    if (suggestions.length === 0) {
      suggestions.push({
        area: 'geral',
        type: 'expand',
        pattern: 'terminologia_setorial',
        description: 'Expandir glossário de termos específicos dos setores atendidos',
        rationale: 'Melhor compreensão do vocabulário específico das indústrias melhora precisão',
        expected_impact: 'Maior acurácia na interpretação de consultas'
      });
      
      suggestions.push({
        area: 'geral',
        type: 'update',
        pattern: 'tendencias_mercado',
        description: 'Incorporar análise de tendências de mercado atualizadas',
        rationale: 'Informações de mercado se tornam obsoletas rapidamente',
        expected_impact: 'Recomendações mais alinhadas às tendências atuais'
      });
    }
    
    return {
      knowledge_area: knowledgeArea,
      analysis_time: new Date().toISOString(),
      suggestions
    };
  }

  /**
   * Extrai área de conhecimento de uma string
   */
  private extractKnowledgeArea(text: string): string {
    // Análise simplificada - versão real usaria NLP
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('crédito') || lowerText.includes('credito') || 
        lowerText.includes('financiamento') || lowerText.includes('banco')) {
      return 'credito';
    }
    
    if (lowerText.includes('legal') || lowerText.includes('jurídico') || 
        lowerText.includes('juridico') || lowerText.includes('contrato')) {
      return 'legal';
    }
    
    if (lowerText.includes('financeiro') || lowerText.includes('investimento') || 
        lowerText.includes('fluxo de caixa')) {
      return 'financeiro';
    }
    
    if (lowerText.includes('técnico') || lowerText.includes('tecnico') || 
        lowerText.includes('tecnologia') || lowerText.includes('sistema')) {
      return 'tecnico';
    }
    
    if (lowerText.includes('comunicação') || lowerText.includes('comunicacao') || 
        lowerText.includes('marketing')) {
      return 'comunicacao';
    }
    
    // Se nenhuma área específica for identificada
    return 'geral';
  }

  /**
   * Implementação do método abstrato de extração de padrões
   */
  protected async extractPatterns(): Promise<void> {
    if (this.learningData.length < 10) return;
    
    // Esta implementação é intencionalmente mais simples
    // Já que o agente de aprendizado implementa análises mais sofisticadas
    // em seus outros métodos específicos
    
    const recentLearnings = this.learningData.slice(-20);
    
    // Identifica tendências em consultas recentes
    const queryTextSamples = recentLearnings
      .map(item => {
        if (typeof item.request === 'string') return item.request;
        if (item.request?.query) return item.request.query;
        if (item.request?.comando) return item.request.comando;
        return '';
      })
      .filter(text => text.length > 0);
    
    if (queryTextSamples.length > 0) {
      console.log(`${this.name} analisou ${queryTextSamples.length} consultas recentes para extrair padrões`);
      
      // Uma implementação real faria análise de tópicos ou clustering
      // para identificar tendências, mas para este exemplo mantemos simples
    }
  }
}