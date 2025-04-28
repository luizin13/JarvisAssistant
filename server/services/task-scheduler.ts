/**
 * Sistema de agendamento de tarefas automatizadas
 * 
 * Responsável por gerenciar a execução periódica de tarefas e acionar
 * os agentes especializados para processar pendências
 */
import AgentFactory from './specialized-agents/agent-factory';
import axios from 'axios';

interface TaskSchedulerConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxTasksPerRun: number;
  agentTimeoutMs: number;
}

export class TaskScheduler {
  private config: TaskSchedulerConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private agentFactory: any;
  private lastRun: Date | null = null;

  constructor(agentFactory: any) {
    this.agentFactory = agentFactory;
    
    // Configuração padrão
    this.config = {
      enabled: true,
      intervalMinutes: 15, // Executa a cada 15 minutos
      maxTasksPerRun: 5,   // Processa até 5 tarefas por execução
      agentTimeoutMs: 60000 // Timeout de 1 minuto por tarefa
    };
  }

  /**
   * Inicia o agendador de tarefas
   */
  public start(): void {
    if (this.intervalId) {
      console.log('[TaskScheduler] Agendador já está em execução');
      return;
    }

    console.log(`[TaskScheduler] Iniciando agendador de tarefas (intervalo: ${this.config.intervalMinutes} minutos)`);
    
    // Executa imediatamente na primeira vez
    this.processPendingTasks();
    
    // Agenda execuções periódicas
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => this.processPendingTasks(), intervalMs);
  }

  /**
   * Para o agendador de tarefas
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[TaskScheduler] Agendador de tarefas parado');
    }
  }

  /**
   * Atualiza a configuração do agendador
   */
  public updateConfig(config: Partial<TaskSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reinicia o agendador com a nova configuração
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }

  /**
   * Processa tarefas pendentes
   * @returns Informações sobre o processamento realizado
   */
  public async processPendingTasks(): Promise<any> {
    if (this.isRunning) {
      console.log('[TaskScheduler] Já existe um processamento em andamento, pulando execução');
      return {
        success: false,
        message: 'Já existe um processamento em andamento'
      };
    }

    try {
      this.isRunning = true;
      this.lastRun = new Date();
      console.log(`[TaskScheduler] Iniciando processamento de tarefas pendentes em ${this.lastRun.toISOString()}`);

      // 1. Buscar tarefas pendentes da API Python
      const pendingTasks = await this.fetchPendingTasks();
      console.log(`[TaskScheduler] Encontradas ${pendingTasks.length} tarefas pendentes`);

      if (pendingTasks.length === 0) {
        console.log('[TaskScheduler] Nenhuma tarefa pendente para processar');
        return {
          success: true,
          message: 'Nenhuma tarefa pendente encontrada',
          tasksProcessed: 0
        };
      }

      // 2. Processar tarefas com limite por execução
      const tasksToProcess = pendingTasks.slice(0, this.config.maxTasksPerRun);
      
      // 3. Processar tarefas em sequência
      const processedTasks = [];
      for (const task of tasksToProcess) {
        const result = await this.processTask(task);
        processedTasks.push({
          id: task.id,
          title: task.titulo,
          status: result ? 'success' : 'failed',
          agent: task.agente_responsavel
        });
      }

      // 4. Buscar diagnósticos pendentes e criar correções
      const diagnosticsResult = await this.processUnresolvedDiagnostics();

      console.log(`[TaskScheduler] Concluído o processamento de ${tasksToProcess.length} tarefas`);
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        message: `Processadas ${tasksToProcess.length} tarefas`,
        tasksProcessed: tasksToProcess.length,
        tasks: processedTasks,
        diagnosticsProcessed: diagnosticsResult?.diagnosticsProcessed || 0
      };
    } catch (error) {
      console.error('[TaskScheduler] Erro durante o processamento de tarefas:', error);
      return {
        success: false,
        message: `Erro ao processar tarefas: ${error.message || 'Erro desconhecido'}`,
        error: error.message || 'Erro desconhecido'
      };
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Executa um ciclo de processamento programado
   * @returns Resultado da execução
   */
  public async executeScheduledRun(): Promise<any> {
    return this.processPendingTasks();
  }

  /**
   * Busca tarefas pendentes da API Python
   */
  private async fetchPendingTasks(): Promise<any[]> {
    try {
      const response = await axios.get('http://localhost:5000/api/python/tarefas?estado=pendente');
      return response.data || [];
    } catch (error) {
      console.error('[TaskScheduler] Erro ao buscar tarefas pendentes:', error);
      return [];
    }
  }

  /**
   * Processa uma tarefa com um agente especializado
   * @returns true se o processamento foi bem-sucedido, false caso contrário
   */
  private async processTask(task: any): Promise<boolean> {
    console.log(`[TaskScheduler] Processando tarefa: ${task.id} - ${task.titulo}`);
    
    try {
      // 1. Selecionar agente especializado para a tarefa
      const agentName = task.agente_responsavel || this.selectAppropriateAgent(task);
      console.log(`[TaskScheduler] Selecionado agente ${agentName} para a tarefa ${task.id}`);

      // 2. Criar instância do agente especializado
      const agent = this.agentFactory.createAgent(agentName);
      
      if (!agent) {
        console.error(`[TaskScheduler] Não foi possível criar o agente ${agentName}`);
        await this.updateTaskStatus(task.id, 'falha', 'Agente especializado não encontrado');
        return false;
      }

      // 3. Marcar tarefa como em andamento
      await this.updateTaskStatus(task.id, 'em_andamento');
      
      // 4. Executar agente com timeout
      const agentPromise = agent.process({
        request: {
          taskId: task.id,
          title: task.titulo,
          description: task.descricao,
          priority: task.prioridade
        },
        systemContext: {
          taskType: this.determineTaskType(task)
        },
        parameters: task.contexto || {}
      });
      
      // Adicionar timeout à promessa do agente
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao processar tarefa')), this.config.agentTimeoutMs);
      });
      
      // Executa a tarefa com timeout
      const result = await Promise.race([agentPromise, timeoutPromise]) as any;
      
      // 5. Processar resultado e atualizar status da tarefa
      if (result && result.success) {
        await this.updateTaskStatus(task.id, 'concluida', JSON.stringify(result.data || result.message));
        console.log(`[TaskScheduler] Tarefa ${task.id} concluída com sucesso`);
        
        // Criar diagnóstico ou sugestão com base no resultado
        if (result.insights && result.insights.length > 0) {
          await this.createDiagnosticFromResult(task, result);
        }
        
        if (result.learnings && result.learnings.length > 0) {
          await this.createSuggestionFromResult(task, result);
        }
        
        return true;
      } else {
        await this.updateTaskStatus(task.id, 'falha', 'Falha na execução da tarefa');
        console.error(`[TaskScheduler] Falha ao processar tarefa ${task.id}`);
        return false;
      }
    } catch (error: any) {
      console.error(`[TaskScheduler] Erro ao processar tarefa ${task.id}:`, error);
      await this.updateTaskStatus(task.id, 'falha', `Erro: ${error.message || 'Desconhecido'}`);
      return false;
    }
  }

  /**
   * Atualiza o status de uma tarefa
   */
  private async updateTaskStatus(taskId: string, status: 'em_andamento' | 'concluida' | 'falha', resultado?: string): Promise<void> {
    try {
      const update: any = {
        estado: status,
        timestamp_atualizacao: new Date().toISOString()
      };
      
      if (resultado) {
        update.resultado = resultado;
      }
      
      await axios.patch(`http://localhost:5000/api/python/tarefas/${taskId}`, update);
      console.log(`[TaskScheduler] Status da tarefa ${taskId} atualizado para ${status}`);
    } catch (error) {
      console.error(`[TaskScheduler] Erro ao atualizar status da tarefa ${taskId}:`, error);
    }
  }

  /**
   * Processa diagnósticos não resolvidos para gerar correções
   */
  private async processUnresolvedDiagnostics(): Promise<{diagnosticsProcessed: number}> {
    try {
      // 1. Buscar diagnósticos sem correção (severidade erro ou aviso)
      const response = await axios.get('http://localhost:5000/api/python/diagnosticos?severidade=erro,aviso');
      const diagnostics = response.data || [];
      
      if (diagnostics.length === 0) {
        return { diagnosticsProcessed: 0 };
      }
      
      console.log(`[TaskScheduler] Processando ${diagnostics.length} diagnósticos não resolvidos`);
      
      // 2. Buscar correções existentes para filtrar diagnósticos já tratados
      const correctionsResponse = await axios.get('http://localhost:5000/api/python/correcoes');
      const existingCorrections = correctionsResponse.data || [];
      
      // Mapa de diagnósticos que já possuem correções
      const diagnosticsWithCorrections = new Set(
        existingCorrections.map((c: any) => c.diagnostico_id).filter(Boolean)
      );
      
      // 3. Filtrar diagnósticos sem correção
      const unresolvedDiagnostics = diagnostics.filter(
        (d: any) => !diagnosticsWithCorrections.has(d.id)
      );
      
      console.log(`[TaskScheduler] ${unresolvedDiagnostics.length} diagnósticos sem correção`);
      
      // 4. Processar cada diagnóstico não resolvido
      for (const diagnostic of unresolvedDiagnostics) {
        await this.createCorrectionForDiagnostic(diagnostic);
      }
      
      return {
        diagnosticsProcessed: unresolvedDiagnostics.length
      };
    } catch (error) {
      console.error('[TaskScheduler] Erro ao processar diagnósticos não resolvidos:', error);
      return { diagnosticsProcessed: 0 };
    }
  }

  /**
   * Cria uma correção para um diagnóstico
   */
  private async createCorrectionForDiagnostic(diagnostic: any): Promise<void> {
    try {
      // 1. Criar um agente especializado em correções
      const agent = this.agentFactory.createAgent('AgenteCorrecaoAutomatica');
      
      if (!agent) {
        console.error('[TaskScheduler] Não foi possível criar o agente de correção automática');
        return;
      }
      
      console.log(`[TaskScheduler] Criando correção para diagnóstico ${diagnostic.id}`);
      
      // 2. Executar o agente para gerar a correção
      const result = await agent.process({
        request: {
          diagnosticId: diagnostic.id,
          description: diagnostic.descricao,
          severity: diagnostic.severidade,
          type: diagnostic.tipo
        },
        systemContext: {
          taskType: 'correction',
          details: diagnostic.detalhes || {}
        }
      });
      
      // 3. Criar a correção se o processamento foi bem-sucedido
      if (result && result.success) {
        const correction = {
          diagnostico_id: diagnostic.id,
          descricao: result.message || `Correção automática para: ${diagnostic.descricao}`,
          codigo: result.data?.code || null,
          aplicada: false
        };
        
        // 4. Salvar a correção na API
        await axios.post('http://localhost:5000/api/python/correcoes', correction);
        console.log(`[TaskScheduler] Correção criada para diagnóstico ${diagnostic.id}`);
      } else {
        console.error(`[TaskScheduler] Falha ao gerar correção para diagnóstico ${diagnostic.id}`);
      }
    } catch (error) {
      console.error(`[TaskScheduler] Erro ao criar correção para diagnóstico ${diagnostic.id}:`, error);
    }
  }

  /**
   * Cria um diagnóstico a partir do resultado de uma tarefa
   */
  private async createDiagnosticFromResult(task: any, result: any): Promise<void> {
    // Implementar apenas para os insights mais relevantes
    const relevantInsight = result.insights.find((i: any) => i.confidence > 0.7);
    
    if (!relevantInsight) return;
    
    try {
      const diagnostic = {
        tipo: this.mapInsightToDiagnosticType(relevantInsight),
        descricao: relevantInsight.content,
        severidade: this.mapConfidenceToSeverity(relevantInsight.confidence),
        detalhes: {
          origem: 'TaskScheduler',
          agente_id: task.agente_responsavel || 'system',
          contexto: {
            tarefa_origem: task.id,
            titulo_tarefa: task.titulo,
            fontes: relevantInsight.sources || []
          }
        }
      };
      
      await axios.post('http://localhost:5000/api/python/diagnosticos', diagnostic);
      console.log(`[TaskScheduler] Diagnóstico criado a partir da tarefa ${task.id}`);
    } catch (error) {
      console.error(`[TaskScheduler] Erro ao criar diagnóstico para tarefa ${task.id}:`, error);
    }
  }

  /**
   * Cria uma sugestão a partir do resultado de uma tarefa
   */
  private async createSuggestionFromResult(task: any, result: any): Promise<void> {
    // Implementar apenas para os aprendizados mais aplicáveis
    const relevantLearning = result.learnings.find((l: any) => 
      l.applicability && l.applicability.toLowerCase().includes('alta')
    );
    
    if (!relevantLearning) return;
    
    try {
      const suggestion = {
        tipo: 'otimizacao',
        titulo: `Otimização: ${relevantLearning.pattern}`,
        descricao: relevantLearning.observation,
        prioridade: 'media',
        implementada: false,
        detalhes: {
          origem: 'TaskScheduler',
          tarefa_origem: task.id,
          pattern: relevantLearning.pattern,
          applicability: relevantLearning.applicability
        }
      };
      
      await axios.post('http://localhost:5000/api/python/sugestoes', suggestion);
      console.log(`[TaskScheduler] Sugestão criada a partir da tarefa ${task.id}`);
    } catch (error) {
      console.error(`[TaskScheduler] Erro ao criar sugestão para tarefa ${task.id}:`, error);
    }
  }

  /**
   * Seleciona o agente mais apropriado para uma tarefa
   */
  private selectAppropriateAgent(task: any): string {
    // Palavras-chave para classificação de tarefas
    const keywordMap: Record<string, string> = {
      'analis': 'AgenteAnaliseSistema',
      'diagnos': 'AgenteAnaliseSistema',
      'corr': 'AgenteCorrecaoAutomatica',
      'fix': 'AgenteCorrecaoAutomatica',
      'soluc': 'AgenteCorrecaoAutomatica',
      'melhoria': 'AgenteMelhoriaContinua',
      'otimiz': 'AgenteMelhoriaContinua',
      'aprend': 'AgenteAcademia'
    };
    
    const taskText = `${task.titulo} ${task.descricao}`.toLowerCase();
    
    // Tentar encontrar o melhor agente com base nas palavras-chave
    for (const [keyword, agentName] of Object.entries(keywordMap)) {
      if (taskText.includes(keyword)) {
        return agentName;
      }
    }
    
    // Agente padrão para tarefas não classificadas
    return 'TechnicalAgent';
  }

  /**
   * Determina o tipo de tarefa para contextualização
   */
  private determineTaskType(task: any): string {
    const taskText = `${task.titulo} ${task.descricao}`.toLowerCase();
    
    if (taskText.includes('analis') || taskText.includes('diagnos')) {
      return 'analysis';
    }
    
    if (taskText.includes('corr') || taskText.includes('fix')) {
      return 'correction';
    }
    
    if (taskText.includes('melhoria') || taskText.includes('otimiz')) {
      return 'improvement';
    }
    
    if (taskText.includes('aprend') || taskText.includes('treina')) {
      return 'learning';
    }
    
    return 'general';
  }

  /**
   * Mapeia um insight para um tipo de diagnóstico
   */
  private mapInsightToDiagnosticType(insight: any): 'sistema' | 'agente' | 'tarefa' | 'conexao' {
    const insightType = (insight.type || '').toLowerCase();
    
    if (insightType.includes('agent')) return 'agente';
    if (insightType.includes('task')) return 'tarefa';
    if (insightType.includes('connect')) return 'conexao';
    
    return 'sistema';
  }

  /**
   * Mapeia um nível de confiança para severidade
   */
  private mapConfidenceToSeverity(confidence: number): 'info' | 'aviso' | 'erro' {
    if (confidence > 0.9) return 'erro';
    if (confidence > 0.7) return 'aviso';
    return 'info';
  }

  /**
   * Obtém o status atual do agendador
   */
  public getStatus(): any {
    return {
      enabled: this.config.enabled,
      intervalMinutes: this.config.intervalMinutes,
      isRunning: this.isRunning,
      lastRunAt: this.lastRun ? this.lastRun.toISOString() : null,
      nextRunAt: this.lastRun && this.intervalId 
        ? new Date(this.lastRun.getTime() + (this.config.intervalMinutes * 60 * 1000)).toISOString() 
        : null
    };
  }
}