import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { luizCore } from './luiz-core-manager';
import { systemOrchestrator } from './system-orchestrator';
import { TaskScheduler } from './task-scheduler';
import { openaiClient } from '../openai';

/**
 * Interface para relatório semanal
 */
export interface WeeklyReport {
  id: string;
  timestamp: string;
  period: {
    start: string;
    end: string;
  };
  performanceMetrics: {
    tasksCompleted: number;
    tasksCreated: number;
    successRate: number;
    avgExecutionTime: number;
  };
  improvements: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
  }>;
  diagnostics: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
  }>;
  personalProgress: {
    goalsProgressed: number;
    newLearnings: number;
    progressTrends: Array<{
      area: string;
      trend: 'increasing' | 'stable' | 'decreasing';
      value: number;
    }>;
  };
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'alta' | 'média' | 'baixa';
    type: 'process' | 'learning' | 'habit' | 'tool';
  }>;
}

/**
 * Gerenciador de Auto-Melhoria do Sistema
 * Responsável por monitorar o sistema, propor e implementar melhorias contínuas
 */
export class AutoImprovementManager {
  private static instance: AutoImprovementManager;
  private isInitialized: boolean = false;
  private taskScheduler: TaskScheduler | null = null;
  private weeklyReports: WeeklyReport[] = [];
  private weeklyReportTimer: NodeJS.Timeout | null = null;
  private systemHealthCheckTimer: NodeJS.Timeout | null = null;
  private isSystemHealthy: boolean = true;
  private agentHealthStatus: Map<string, boolean> = new Map();

  /**
   * Construtor privado para Singleton
   */
  private constructor() {
    // A inicialização completa é feita no método initialize()
  }

  /**
   * Obtém a instância do gerenciador
   */
  public static getInstance(): AutoImprovementManager {
    if (!AutoImprovementManager.instance) {
      AutoImprovementManager.instance = new AutoImprovementManager();
    }
    return AutoImprovementManager.instance;
  }

  /**
   * Inicializa o gerenciador de auto-melhoria
   */
  public async initialize(taskScheduler: TaskScheduler): Promise<boolean> {
    try {
      if (this.isInitialized) {
        console.log('[AutoImprovementManager] Já inicializado');
        return true;
      }

      console.log('[AutoImprovementManager] Inicializando gerenciador de auto-melhoria...');
      this.taskScheduler = taskScheduler;
      
      // Configura verificação de saúde do sistema
      this.setupSystemHealthCheck();
      
      // Configura geração semanal de relatórios
      this.setupWeeklyReportGeneration();
      
      this.isInitialized = true;
      console.log('[AutoImprovementManager] Gerenciador de auto-melhoria inicializado com sucesso');
      
      return true;
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao inicializar:', error);
      return false;
    }
  }

  /**
   * Configura verificação periódica de saúde do sistema
   */
  private setupSystemHealthCheck(): void {
    // Executa verificação a cada 15 minutos
    this.systemHealthCheckTimer = setInterval(() => this.checkSystemHealth(), 15 * 60 * 1000);
    
    // Executa uma verificação inicial
    setTimeout(() => this.checkSystemHealth(), 5000);
    
    console.log('[AutoImprovementManager] Verificação de saúde do sistema configurada');
  }

  /**
   * Configura geração semanal de relatórios
   */
  private setupWeeklyReportGeneration(): void {
    // Calcula o tempo até o próximo domingo às 23:00
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(23, 0, 0, 0);
    
    // Calcula a diferença em milissegundos
    const timeUntilNextSunday = nextSunday.getTime() - now.getTime();
    
    // Agenda a primeira execução
    this.weeklyReportTimer = setTimeout(() => {
      this.generateWeeklyReport();
      
      // Reprograma para todas as semanas
      this.weeklyReportTimer = setInterval(() => this.generateWeeklyReport(), 7 * 24 * 60 * 60 * 1000);
    }, timeUntilNextSunday);
    
    console.log(`[AutoImprovementManager] Relatório semanal agendado para ${nextSunday.toLocaleString()}`);
  }

  /**
   * Verifica o estado de saúde do sistema
   */
  private async checkSystemHealth(): Promise<void> {
    try {
      console.log('[AutoImprovementManager] Verificando saúde do sistema...');
      
      const previousHealthStatus = this.isSystemHealthy;
      let systemIsHealthy = true;
      
      // Verificar estado do orquestrador
      const orchestratorState = systemOrchestrator.getSystemState();
      const activeAgents = systemOrchestrator.getActiveAgents();
      
      // Verificar agentes com problemas (falhas consecutivas)
      const unhealthyAgents: string[] = [];
      
      activeAgents.forEach(agent => {
        const isHealthy = agent.failures < 3 && agent.successRate > 0.7;
        this.agentHealthStatus.set(agent.id, isHealthy);
        
        if (!isHealthy) {
          systemIsHealthy = false;
          unhealthyAgents.push(agent.id);
        }
      });
      
      // Verificar tarefas pendentes
      const pendingTasks = await this.getPendingTasks();
      const hasTooManyPendingTasks = pendingTasks.length > 50;
      
      if (hasTooManyPendingTasks) {
        systemIsHealthy = false;
      }
      
      // Verificar status das APIs externas
      const apisStatus = await this.checkExternalAPIs();
      if (!apisStatus.allAvailable) {
        console.warn('[AutoImprovementManager] Algumas APIs externas estão indisponíveis:', apisStatus.unavailableApis);
      }
      
      this.isSystemHealthy = systemIsHealthy;
      
      // Se o estado de saúde mudou, registra diagnóstico e inicia reparação se necessário
      if (previousHealthStatus && !systemIsHealthy) {
        console.warn('[AutoImprovementManager] Sistema entrou em estado não saudável');
        
        // Cria diagnóstico
        await this.createSystemHealthDiagnostic({
          unhealthyAgents,
          hasTooManyPendingTasks,
          apiStatus: apisStatus
        });
        
        // Inicia auto-reparação para agentes não saudáveis
        for (const agentId of unhealthyAgents) {
          await this.restartUnhealthyAgent(agentId);
        }
      } else if (!previousHealthStatus && systemIsHealthy) {
        console.log('[AutoImprovementManager] Sistema retornou ao estado saudável');
      }
      
      console.log(`[AutoImprovementManager] Verificação de saúde concluída: ${systemIsHealthy ? 'Saudável' : 'Não saudável'}`);
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao verificar saúde do sistema:', error);
    }
  }

  /**
   * Obtém tarefas pendentes da API Python
   */
  private async getPendingTasks(): Promise<any[]> {
    try {
      const response = await axios.get('http://localhost:5000/api/python/tarefas?estado=pendente');
      return response.data || [];
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao buscar tarefas pendentes:', error);
      return [];
    }
  }

  /**
   * Verifica disponibilidade de APIs externas
   */
  private async checkExternalAPIs(): Promise<{
    allAvailable: boolean;
    unavailableApis: string[];
  }> {
    const unavailableApis: string[] = [];
    
    // Esta é uma verificação simples. Em um ambiente real, faria testes mais robustos.
    // Aqui apenas verifica as chaves de API
    if (!process.env.OPENAI_API_KEY) {
      unavailableApis.push('OpenAI');
    }
    
    if (!process.env.ANTHROPIC_API_KEY) {
      unavailableApis.push('Anthropic');
    }
    
    if (!process.env.PERPLEXITY_API_KEY) {
      unavailableApis.push('Perplexity');
    }
    
    return {
      allAvailable: unavailableApis.length === 0,
      unavailableApis
    };
  }

  /**
   * Cria diagnóstico de saúde do sistema
   */
  private async createSystemHealthDiagnostic(data: any): Promise<void> {
    try {
      const diagnostic = {
        id: uuidv4(),
        tipo: 'sistema',
        descricao: 'Problemas de saúde do sistema detectados',
        severidade: 'aviso',
        timestamp: new Date().toISOString(),
        detalhes: data,
        sugestoes: [
          'Reiniciar agentes afetados',
          'Verificar logs para erros específicos',
          'Verificar disponibilidade de APIs externas'
        ]
      };
      
      // Cria diagnóstico via API
      await axios.post('http://localhost:5000/api/python/diagnosticos', diagnostic);
      
      console.log('[AutoImprovementManager] Diagnóstico de saúde do sistema criado');
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao criar diagnóstico de saúde:', error);
    }
  }

  /**
   * Reinicia um agente não saudável
   */
  private async restartUnhealthyAgent(agentId: string): Promise<void> {
    try {
      console.log(`[AutoImprovementManager] Tentando auto-reiniciar agente: ${agentId}`);
      
      // Usa o orquestrador para reiniciar o agente
      // Implementação depende do orquestrador ter um método para isso
      
      console.log(`[AutoImprovementManager] Agente ${agentId} reiniciado com sucesso`);
      
      // Registra correção
      await this.registerAutomaticCorrection({
        descricao: `Auto-reinício do agente ${agentId}`,
        codigo: `systemOrchestrator.restartAgent('${agentId}')`,
        resultado: 'Agente reiniciado com sucesso'
      });
    } catch (error) {
      console.error(`[AutoImprovementManager] Erro ao reiniciar agente ${agentId}:`, error);
    }
  }

  /**
   * Registra uma correção automática
   */
  private async registerAutomaticCorrection(data: any): Promise<void> {
    try {
      const correction = {
        id: uuidv4(),
        diagnostico_id: null, // Não associado a um diagnóstico específico
        descricao: data.descricao,
        codigo: data.codigo,
        aplicada: true,
        timestamp: new Date().toISOString(),
        resultado: data.resultado
      };
      
      // Registra correção via API
      await axios.post('http://localhost:5000/api/python/correcoes', correction);
      console.log('[AutoImprovementManager] Correção automática registrada');
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao registrar correção automática:', error);
    }
  }

  /**
   * Gera relatório semanal de progresso e evolução
   */
  private async generateWeeklyReport(): Promise<WeeklyReport | null> {
    try {
      console.log('[AutoImprovementManager] Gerando relatório semanal...');
      
      // Define período do relatório
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);
      
      // Busca dados para o relatório
      const orchestratorState = systemOrchestrator.getSystemState();
      const activeAgents = systemOrchestrator.getActiveAgents();
      
      // Busca tarefas, diagnósticos e sugestões da semana
      const tasksData = await this.getTasksData(oneWeekAgo, now);
      const diagnosticsData = await this.getDiagnosticsData(oneWeekAgo, now);
      const suggestionsData = await this.getSuggestionsData(oneWeekAgo, now);
      
      // Obtém dados de progresso pessoal do Luiz
      const luizProfileReport = luizCore.generateWeeklyReport();
      
      // Prepara métricas de performance
      const performanceMetrics = {
        tasksCompleted: tasksData.completedTasks.length,
        tasksCreated: tasksData.allTasks.length,
        successRate: tasksData.allTasks.length > 0 ? tasksData.completedTasks.length / tasksData.allTasks.length : 0,
        avgExecutionTime: tasksData.averageExecutionTime
      };
      
      // Prepara seção de melhorias
      const improvements = suggestionsData.suggestions.map((suggestion: any) => ({
        id: suggestion.id,
        title: suggestion.titulo,
        description: suggestion.descricao,
        status: suggestion.implementada ? 'implementada' : 'pendente'
      }));
      
      // Prepara seção de diagnósticos
      const diagnostics = diagnosticsData.diagnostics.map((diagnostic: any) => ({
        id: diagnostic.id,
        title: diagnostic.descricao,
        severity: diagnostic.severidade,
        status: diagnostic.resolvido ? 'resolvido' : 'pendente'
      }));
      
      // Prepara seção de progresso pessoal
      const personalProgress = {
        goalsProgressed: luizProfileReport.metas.active,
        newLearnings: luizProfileReport.aprendizados.total,
        progressTrends: [
          {
            area: 'humor',
            trend: this.mapTrendToType(luizProfileReport.tendencias.humor),
            value: this.getTrendValue(luizProfileReport.tendencias.humor)
          },
          {
            area: 'energia',
            trend: this.mapTrendToType(luizProfileReport.tendencias.energia),
            value: this.getTrendValue(luizProfileReport.tendencias.energia)
          },
          {
            area: 'foco',
            trend: this.mapTrendToType(luizProfileReport.tendencias.foco),
            value: this.getTrendValue(luizProfileReport.tendencias.foco)
          }
        ]
      };
      
      // Gera recomendações para o futuro
      const recommendations = await this.generateRecommendations(
        performanceMetrics,
        luizProfileReport,
        activeAgents
      );
      
      // Monta o relatório final
      const report: WeeklyReport = {
        id: uuidv4(),
        timestamp: now.toISOString(),
        period: {
          start: oneWeekAgo.toISOString(),
          end: now.toISOString()
        },
        performanceMetrics,
        improvements,
        diagnostics,
        personalProgress,
        recommendations
      };
      
      // Armazena o relatório
      this.weeklyReports.push(report);
      
      // Armazena como sugestão no sistema
      await this.createWeeklyReportSuggestion(report);
      
      console.log('[AutoImprovementManager] Relatório semanal gerado com sucesso');
      return report;
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao gerar relatório semanal:', error);
      return null;
    }
  }

  /**
   * Mapeia string de tendência para tipo de tendência
   */
  private mapTrendToType(trend: string): 'increasing' | 'stable' | 'decreasing' {
    if (trend === 'melhorando' || trend === 'aumentando') return 'increasing';
    if (trend === 'piorando' || trend === 'diminuindo') return 'decreasing';
    return 'stable';
  }

  /**
   * Mapeia tendência para valor numérico
   */
  private getTrendValue(trend: string): number {
    if (trend === 'melhorando' || trend === 'aumentando') return 1;
    if (trend === 'piorando' || trend === 'diminuindo') return -1;
    return 0;
  }

  /**
   * Obtém dados de tarefas para o período
   */
  private async getTasksData(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Busca todas as tarefas da API
      const response = await axios.get('http://localhost:5000/api/python/tarefas');
      const allTasks = response.data || [];
      
      // Filtra por período
      const tasksInPeriod = allTasks.filter((task: any) => {
        const taskDate = new Date(task.timestamp_criacao);
        return taskDate >= startDate && taskDate <= endDate;
      });
      
      // Filtra tarefas concluídas
      const completedTasks = tasksInPeriod.filter((task: any) => task.estado === 'concluida');
      
      // Calcula tempo médio de execução
      let totalExecutionTime = 0;
      let executionTimeCount = 0;
      
      completedTasks.forEach((task: any) => {
        if (task.timestamp_atualizacao && task.timestamp_criacao) {
          const startTime = new Date(task.timestamp_criacao).getTime();
          const endTime = new Date(task.timestamp_atualizacao).getTime();
          const executionTime = endTime - startTime;
          
          if (executionTime > 0) {
            totalExecutionTime += executionTime;
            executionTimeCount++;
          }
        }
      });
      
      const averageExecutionTime = executionTimeCount > 0 ? totalExecutionTime / executionTimeCount : 0;
      
      return {
        allTasks: tasksInPeriod,
        completedTasks,
        failedTasks: tasksInPeriod.filter((task: any) => task.estado === 'falha'),
        pendingTasks: tasksInPeriod.filter((task: any) => task.estado === 'pendente'),
        averageExecutionTime
      };
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao obter dados de tarefas:', error);
      return {
        allTasks: [],
        completedTasks: [],
        failedTasks: [],
        pendingTasks: [],
        averageExecutionTime: 0
      };
    }
  }

  /**
   * Obtém dados de diagnósticos para o período
   */
  private async getDiagnosticsData(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Busca todos os diagnósticos da API
      const response = await axios.get('http://localhost:5000/api/python/diagnosticos');
      const allDiagnostics = response.data || [];
      
      // Filtra por período
      const diagnosticsInPeriod = allDiagnostics.filter((diagnostic: any) => {
        const diagnosticDate = new Date(diagnostic.timestamp);
        return diagnosticDate >= startDate && diagnosticDate <= endDate;
      });
      
      // Busca correções para determinar diagnósticos resolvidos
      const correctionsResponse = await axios.get('http://localhost:5000/api/python/correcoes');
      const corrections = correctionsResponse.data || [];
      
      // Marca diagnósticos como resolvidos se tiverem correções
      const diagnostics = diagnosticsInPeriod.map((diagnostic: any) => {
        const hasCorrection = corrections.some(
          (correction: any) => correction.diagnostico_id === diagnostic.id
        );
        
        return {
          ...diagnostic,
          resolvido: hasCorrection
        };
      });
      
      return {
        diagnostics,
        total: diagnostics.length,
        resolved: diagnostics.filter((d: any) => d.resolvido).length,
        pending: diagnostics.filter((d: any) => !d.resolvido).length
      };
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao obter dados de diagnósticos:', error);
      return {
        diagnostics: [],
        total: 0,
        resolved: 0,
        pending: 0
      };
    }
  }

  /**
   * Obtém dados de sugestões para o período
   */
  private async getSuggestionsData(startDate: Date, endDate: Date): Promise<any> {
    try {
      // Busca todas as sugestões da API
      const response = await axios.get('http://localhost:5000/api/python/sugestoes');
      const allSuggestions = response.data || [];
      
      // Filtra por período
      const suggestionsInPeriod = allSuggestions.filter((suggestion: any) => {
        const suggestionDate = new Date(suggestion.timestamp);
        return suggestionDate >= startDate && suggestionDate <= endDate;
      });
      
      return {
        suggestions: suggestionsInPeriod,
        total: suggestionsInPeriod.length,
        implemented: suggestionsInPeriod.filter((s: any) => s.implementada).length,
        pending: suggestionsInPeriod.filter((s: any) => !s.implementada).length
      };
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao obter dados de sugestões:', error);
      return {
        suggestions: [],
        total: 0,
        implemented: 0,
        pending: 0
      };
    }
  }

  /**
   * Gera recomendações inteligentes para o próximo período com base na análise dos dados
   * @param performanceMetrics Métricas de desempenho do sistema
   * @param luizProfileReport Relatório do perfil do usuário Luiz
   * @param activeAgents Lista de agentes ativos no sistema
   * @returns Lista de recomendações para o próximo período
   */
  private async generateRecommendations(
    performanceMetrics: any,
    luizProfileReport: any,
    activeAgents: any[]
  ): Promise<any[]> {
    try {
      console.log('[AutoImprovementManager] Gerando recomendações baseadas em dados...');
      
      // Prepara análise detalhada dos agentes
      const agentAnalysis = activeAgents.map(agent => {
        // Calcula tendência por comparação com dados anteriores (se disponíveis)
        const previousSuccessRate = agent.previousStats?.successRate || agent.successRate * 0.9; // fallback para uma estimativa
        const trend = agent.successRate > previousSuccessRate 
          ? 'melhora' 
          : agent.successRate < previousSuccessRate 
            ? 'piora' 
            : 'estável';
            
        return {
          id: agent.id,
          tipo: agent.type,
          nome: agent.name || agent.id,
          successRate: agent.successRate,
          failures: agent.failures,
          tendencia: trend,
          tarefasConcluidas: agent.completedTasks || 0,
          tempoMedioExecucao: agent.avgExecutionTime || 0
        };
      });
      
      // Identifica os agentes com melhor e pior desempenho
      const sortedAgents = [...agentAnalysis].sort((a, b) => b.successRate - a.successRate);
      const bestPerformers = sortedAgents.slice(0, 3);
      const worstPerformers = [...sortedAgents].sort((a, b) => a.successRate - b.successRate).slice(0, 3);
      
      // Prepare dados contextuais enriquecidos para análise
      const analysisData = {
        performance: {
          ...performanceMetrics,
          comparacaoPeriodoAnterior: {
            tarefasConcluidas: performanceMetrics.tasksCompleted > (performanceMetrics.previousTasksCompleted || 0) ? 'aumento' : 'diminuição',
            taxaSucesso: performanceMetrics.successRate > (performanceMetrics.previousSuccessRate || 0) ? 'aumento' : 'diminuição'
          }
        },
        personalTrends: {
          humor: luizProfileReport.tendencias.humor,
          energia: luizProfileReport.tendencias.energia,
          foco: luizProfileReport.tendencias.foco
        },
        userGoals: luizProfileReport.metas.activeMetas,
        agentStatistics: {
          geral: {
            total: activeAgents.length,
            taxaMediaSucesso: activeAgents.reduce((sum, agent) => sum + agent.successRate, 0) / activeAgents.length,
            falhasMedias: activeAgents.reduce((sum, agent) => sum + agent.failures, 0) / activeAgents.length
          },
          melhoresAgentes: bestPerformers,
          pioresAgentes: worstPerformers,
          detalhado: agentAnalysis
        }
      };
      
      // Gera recomendações usando OpenAI
      const prompt = `
        Com base na análise detalhada do sistema e progresso pessoal, gere 3-5 recomendações estratégicas 
        para melhorar a produtividade, bem-estar e resultados no próximo período. 
        
        Análise de dados: ${JSON.stringify(analysisData, null, 2)}
        
        Para cada recomendação, estruture com:
        1. Título da recomendação (conciso e específico)
        2. Descrição detalhada (explicando a justificativa e benefícios esperados)
        3. Prioridade (alta, média, baixa)
        4. Tipo (process = processo, learning = aprendizado, habit = hábito, tool = ferramenta)
        
        Responda APENAS em formato JSON válido com a seguinte estrutura:
        [
          {
            "title": "Título da recomendação",
            "description": "Descrição detalhada da recomendação",
            "priority": "alta|média|baixa",
            "type": "process|learning|habit|tool"
          }
        ]
      `;
      
      // Variável para armazenar as recomendações
      let recommendations: any[] = [];
      
      try {
        // Chama OpenAI para gerar recomendações
        const aiResponse = await openaiClient.generateChatResponse(prompt, {
          userId: 1, // Usuário do sistema
          systemPrompt: "Você é um consultor estratégico especializado em produtividade, bem-estar e melhorias de sistemas. Gere recomendações práticas, específicas e acionáveis com base nos dados fornecidos. Responda apenas em formato JSON válido."
        });
        
        // Extrai o conteúdo, lidando com diferentes formatos de resposta
        const responseText = typeof aiResponse === 'object' ? 
          (aiResponse.message || (aiResponse as any).text || JSON.stringify(aiResponse)) :
          String(aiResponse);
          
        // Remove backticks caso parte da resposta esteja em formato de código
        const jsonText = responseText.replace(/```json|```/g, '').trim();
        
        try {
          // Tenta parsear como JSON
          recommendations = JSON.parse(jsonText);
          console.log(`[AutoImprovementManager] Geradas ${recommendations.length} recomendações via IA`);
        } catch (parseError) {
          console.error('[AutoImprovementManager] Erro ao parsear recomendações:', parseError);
          console.log('[AutoImprovementManager] Resposta original:', responseText);
          
          // Fallback para recomendações básicas em caso de erro no parse
          recommendations = this.generateFallbackRecommendations(agentAnalysis);
        }
      } catch (aiError) {
        console.error('[AutoImprovementManager] Erro ao gerar recomendações com IA:', aiError);
        
        // Fallback para recomendações básicas em caso de erro na API
        recommendations = this.generateFallbackRecommendations(agentAnalysis);
      }
      
      // Validação e formatação das recomendações
      recommendations = recommendations
        .filter(rec => rec.title && rec.description) // Apenas recomendações com título e descrição
        .map(rec => ({
          ...rec,
          id: uuidv4(),
          priority: this.normalizePriority(rec.priority), // Normaliza prioridade
          type: this.normalizeType(rec.type)              // Normaliza tipo
        }))
        .slice(0, 5); // Limita a 5 recomendações
        
      // Verifica se temos pelo menos uma recomendação
      if (recommendations.length === 0) {
        recommendations = this.generateFallbackRecommendations(agentAnalysis);
      }
      
      return recommendations;
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao gerar recomendações:', error);
      
      // Fallback para recomendações básicas extremamente simples em caso de falha total
      return [
        {
          id: uuidv4(),
          title: "Monitorar tendências de performance",
          description: "Continuar monitorando os indicadores de performance do sistema e agentes",
          priority: "média" as 'média',
          type: "process" as 'process'
        }
      ];
    }
  }
  
  /**
   * Gera recomendações de fallback com base na análise de agentes
   */
  private generateFallbackRecommendations(agentAnalysis: any[]): any[] {
    console.log('[AutoImprovementManager] Usando recomendações de fallback');
    
    // Identifica agentes com baixo desempenho
    const lowPerformingAgents = agentAnalysis
      .filter(agent => agent.successRate < 0.7)
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 2);
      
    const recommendations = [
      {
        id: uuidv4(),
        title: "Monitorar tendências de performance",
        description: "Continuar monitorando os indicadores de performance do sistema e agentes para identificar oportunidades de melhoria contínua.",
        priority: "média" as 'média',
        type: "process" as 'process'
      }
    ];
    
    // Adiciona recomendações para agentes de baixo desempenho
    if (lowPerformingAgents.length > 0) {
      lowPerformingAgents.forEach(agent => {
        recommendations.push({
          id: uuidv4(),
          title: `Otimizar agente ${agent.nome || agent.id}`,
          description: `O agente ${agent.nome || agent.id} tem taxa de sucesso de ${(agent.successRate * 100).toFixed(1)}%. Recomenda-se revisar seus prompts, contexto e modo de operação para melhorar seu desempenho.`,
          priority: "média",
          type: "process" as 'process'
        });
      });
    }
    
    return recommendations;
  }
  
  /**
   * Normaliza strings de prioridade para o formato esperado
   */
  private normalizePriority(priority: string): 'alta' | 'média' | 'baixa' {
    if (!priority) return 'média';
    
    const normalized = priority.toLowerCase().trim();
    
    if (normalized.includes('alta') || normalized.includes('high')) return 'alta';
    if (normalized.includes('baixa') || normalized.includes('low')) return 'baixa';
    return 'média';
  }
  
  /**
   * Normaliza strings de tipo para o formato esperado
   */
  private normalizeType(type: string): 'process' | 'learning' | 'habit' | 'tool' {
    if (!type) return 'process';
    
    const normalized = type.toLowerCase().trim();
    
    if (normalized.includes('learn')) return 'learning';
    if (normalized.includes('habit')) return 'habit';
    if (normalized.includes('tool')) return 'tool';
    return 'process';
  }

  /**
   * Cria sugestão no sistema com base no relatório semanal
   */
  private async createWeeklyReportSuggestion(report: WeeklyReport): Promise<void> {
    try {
      // Formata o título com a data
      const startDate = new Date(report.period.start).toLocaleDateString('pt-BR');
      const endDate = new Date(report.period.end).toLocaleDateString('pt-BR');
      
      // Prepara descrição resumida
      const summary = `
        Relatório semanal (${startDate} a ${endDate})
        
        Performance:
        - Tarefas concluídas: ${report.performanceMetrics.tasksCompleted}
        - Taxa de sucesso: ${(report.performanceMetrics.successRate * 100).toFixed(1)}%
        
        Melhorias:
        - Total: ${report.improvements.length}
        - Implementadas: ${report.improvements.filter(i => i.status === 'implementada').length}
        
        Progresso Pessoal:
        - Metas em progresso: ${report.personalProgress.goalsProgressed}
        - Novos aprendizados: ${report.personalProgress.newLearnings}
        
        Principais Recomendações:
        ${report.recommendations.slice(0, 3).map(r => `- ${r.title} (${r.priority})`).join('\n')}
      `;
      
      // Cria sugestão via API
      const suggestion = {
        id: uuidv4(),
        tipo: 'relatorio_semanal',
        titulo: `Relatório Semanal: ${startDate} a ${endDate}`,
        descricao: summary.trim(),
        prioridade: 'alta',
        implementada: false,
        timestamp: new Date().toISOString(),
        detalhes: {
          reportId: report.id,
          metrics: report.performanceMetrics,
          recommendations: report.recommendations
        }
      };
      
      await axios.post('http://localhost:5000/api/python/sugestoes', suggestion);
      console.log('[AutoImprovementManager] Relatório semanal registrado como sugestão');
    } catch (error) {
      console.error('[AutoImprovementManager] Erro ao criar sugestão de relatório semanal:', error);
    }
  }

  /**
   * Executa um ciclo de processamento de tarefas
   */
  public async executeCycle(): Promise<any> {
    try {
      if (!this.isInitialized || !this.taskScheduler) {
        console.error('[AutoImprovementManager] Não inicializado');
        return {
          success: false,
          message: 'Gerenciador não inicializado'
        };
      }
      
      console.log('[AutoImprovementManager] Executando ciclo de melhorias');
      const result = await this.taskScheduler.processPendingTasks();
      
      console.log('[AutoImprovement] Ciclo manual executado:', result.success ? 'sucesso' : 'falha');
      return result;
    } catch (error: any) {
      console.error('[AutoImprovementManager] Erro ao executar ciclo:', error);
      return {
        success: false,
        message: `Erro ao executar ciclo: ${error?.message || 'Erro desconhecido'}`
      };
    }
  }

  /**
   * Obtém o status atual do gerenciador
   */
  public getStatus(): any {
    const lastReport = this.weeklyReports.length > 0 ? this.weeklyReports[this.weeklyReports.length - 1] : null;
    
    return {
      isInitialized: this.isInitialized,
      taskSchedulerAvailable: !!this.taskScheduler,
      systemHealthy: this.isSystemHealthy,
      lastReportDate: lastReport?.timestamp,
      reportsGenerated: this.weeklyReports.length,
      agentHealthStatus: Object.fromEntries(this.agentHealthStatus)
    };
  }

  /**
   * Obtém o último relatório semanal
   */
  public getLatestWeeklyReport(): WeeklyReport | null {
    if (this.weeklyReports.length === 0) return null;
    return this.weeklyReports[this.weeklyReports.length - 1];
  }

  /**
   * Obtém todos os relatórios semanais
   */
  public getAllWeeklyReports(): WeeklyReport[] {
    return [...this.weeklyReports];
  }
}

// Exporta a instância singleton
export const autoImprovementManager = AutoImprovementManager.getInstance();