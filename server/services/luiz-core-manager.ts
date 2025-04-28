import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface para o perfil do Luiz
 */
export interface LuizProfile {
  perfil: {
    nome: string;
    papel: string;
    setores: string[];
    idiomaPrincipal: string;
  };
  preferencias: {
    comunicacao: {
      estilo: string;
      detalhamento: string;
      tom: string;
      formalidade: string;
    };
    horarios: {
      inicioTrabalho: string;
      fimTrabalho: string;
      pausasPreferidas: string[];
    };
    notificacoes: {
      urgentes: boolean;
      oportunidadesNegocio: boolean;
      noticiasRelevantes: boolean;
      lembretesMetas: boolean;
    };
    voz: {
      tipo: string;
      velocidade: number;
      tom: string;
    };
  };
  prioridades: {
    negocios: Array<{
      setor: string;
      foco: string;
      prioridade: string;
    }>;
    desenvolvimento: Array<{
      area: string;
      prioridade: string;
    }>;
  };
  estadoAtual: {
    humor: 'positivo' | 'neutro' | 'negativo';
    energia: 'alta' | 'média' | 'baixa';
    foco: 'estratégico' | 'operacional' | 'reflexivo';
    ultimaAtualizacao: string;
  };
  historico: {
    interacoes: Array<{
      id: string;
      timestamp: string;
      tipo: string;
      conteudo: string;
      agente: string;
      contexto?: any;
    }>;
    decisoes: Array<{
      id: string;
      timestamp: string;
      descricao: string;
      area: string;
      resultado?: string;
    }>;
    metas: Array<{
      id: string;
      descricao: string;
      prazo: string;
      status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada';
      progresso: number;
      anotacoes?: string;
    }>;
    aprendizados: Array<{
      id: string;
      data: string;
      categoria: string;
      descricao: string;
      fonte: string;
      aplicacoes?: string[];
    }>;
  };
  conexoes: {
    contatos: any[];
    redesSociais: any[];
    sistemasIntegrados: Array<{
      nome: string;
      tipo: string;
      atualizacao: string;
    }>;
  };
  configSistema: {
    modoIntensivo: boolean;
    inicioAutomatico: string;
    relatorioDiario: boolean;
    relatórioSemanal: boolean;
    palavraAtivacao: string;
    nivelPrivacidade: string;
    backupAutomatico: boolean;
  };
}

/**
 * Gerenciador do núcleo de perfil do Luiz
 * Responsável por gerenciar o perfil, preferências, prioridades e estado atual
 */
export class LuizCoreManager {
  private static instance: LuizCoreManager;
  private profile: LuizProfile;
  private filePath: string;
  private subscribers: Map<string, (profile: LuizProfile) => void>;
  private changeLogEvents: any[] = [];

  /**
   * Construtor privado para Singleton
   */
  private constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'luizProfile.json');
    this.subscribers = new Map();
    this.loadProfile();
    
    // Definir intervalo para salvar automaticamente as alterações
    setInterval(() => this.saveProfile(), 5 * 60 * 1000); // Salva a cada 5 minutos
  }

  /**
   * Obtém a instância do gerenciador
   */
  public static getInstance(): LuizCoreManager {
    if (!LuizCoreManager.instance) {
      LuizCoreManager.instance = new LuizCoreManager();
    }
    return LuizCoreManager.instance;
  }

  /**
   * Carrega o perfil do arquivo
   */
  private loadProfile(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        this.profile = JSON.parse(data);
        console.log('[LuizCoreManager] Perfil carregado com sucesso');
      } else {
        console.error('[LuizCoreManager] Arquivo de perfil não encontrado');
        throw new Error('Arquivo de perfil não encontrado');
      }
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao carregar perfil:', error);
      throw error;
    }
  }

  /**
   * Salva o perfil no arquivo
   */
  public saveProfile(): boolean {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.profile, null, 2), 'utf8');
      console.log('[LuizCoreManager] Perfil salvo com sucesso');
      return true;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao salvar perfil:', error);
      return false;
    }
  }

  /**
   * Obtém o perfil completo
   */
  public getProfile(): LuizProfile {
    return { ...this.profile };
  }

  /**
   * Atualiza o estado atual do Luiz
   */
  public updateCurrentState(state: Partial<LuizProfile['estadoAtual']>): boolean {
    try {
      this.profile.estadoAtual = {
        ...this.profile.estadoAtual,
        ...state,
        ultimaAtualizacao: new Date().toISOString()
      };
      
      this.notifySubscribers();
      this.logChange('updateCurrentState', state);
      return true;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao atualizar estado atual:', error);
      return false;
    }
  }

  /**
   * Registra uma interação no histórico
   */
  public addInteraction(interaction: Omit<LuizProfile['historico']['interacoes'][0], 'id' | 'timestamp'>): string {
    try {
      const id = uuidv4();
      const newInteraction = {
        id,
        timestamp: new Date().toISOString(),
        ...interaction
      };
      
      this.profile.historico.interacoes.unshift(newInteraction);
      
      // Limitar o histórico a 1000 interações
      if (this.profile.historico.interacoes.length > 1000) {
        this.profile.historico.interacoes = this.profile.historico.interacoes.slice(0, 1000);
      }
      
      this.notifySubscribers();
      this.logChange('addInteraction', newInteraction);
      return id;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao adicionar interação:', error);
      return '';
    }
  }

  /**
   * Registra uma decisão no histórico
   */
  public addDecision(decision: Omit<LuizProfile['historico']['decisoes'][0], 'id' | 'timestamp'>): string {
    try {
      const id = uuidv4();
      const newDecision = {
        id,
        timestamp: new Date().toISOString(),
        ...decision
      };
      
      this.profile.historico.decisoes.unshift(newDecision);
      
      this.notifySubscribers();
      this.logChange('addDecision', newDecision);
      return id;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao adicionar decisão:', error);
      return '';
    }
  }

  /**
   * Adiciona uma nova meta
   */
  public addGoal(goal: Omit<LuizProfile['historico']['metas'][0], 'id'>): string {
    try {
      const id = uuidv4();
      const newGoal = {
        id,
        ...goal
      };
      
      this.profile.historico.metas.push(newGoal);
      
      this.notifySubscribers();
      this.logChange('addGoal', newGoal);
      return id;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao adicionar meta:', error);
      return '';
    }
  }

  /**
   * Atualiza uma meta existente
   */
  public updateGoal(goalId: string, updates: Partial<Omit<LuizProfile['historico']['metas'][0], 'id'>>): boolean {
    try {
      const goalIndex = this.profile.historico.metas.findIndex(g => g.id === goalId);
      
      if (goalIndex === -1) {
        console.error(`[LuizCoreManager] Meta com ID ${goalId} não encontrada`);
        return false;
      }
      
      this.profile.historico.metas[goalIndex] = {
        ...this.profile.historico.metas[goalIndex],
        ...updates
      };
      
      this.notifySubscribers();
      this.logChange('updateGoal', { goalId, updates });
      return true;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao atualizar meta:', error);
      return false;
    }
  }

  /**
   * Adiciona um aprendizado ao histórico
   */
  public addLearning(learning: Omit<LuizProfile['historico']['aprendizados'][0], 'id'>): string {
    try {
      const id = uuidv4();
      const newLearning = {
        id,
        ...learning
      };
      
      this.profile.historico.aprendizados.unshift(newLearning);
      
      this.notifySubscribers();
      this.logChange('addLearning', newLearning);
      return id;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao adicionar aprendizado:', error);
      return '';
    }
  }

  /**
   * Atualiza as prioridades de negócios
   */
  public updateBusinessPriorities(priorities: LuizProfile['prioridades']['negocios']): boolean {
    try {
      this.profile.prioridades.negocios = priorities;
      
      this.notifySubscribers();
      this.logChange('updateBusinessPriorities', priorities);
      return true;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao atualizar prioridades de negócios:', error);
      return false;
    }
  }

  /**
   * Atualiza as prioridades de desenvolvimento
   */
  public updateDevelopmentPriorities(priorities: LuizProfile['prioridades']['desenvolvimento']): boolean {
    try {
      this.profile.prioridades.desenvolvimento = priorities;
      
      this.notifySubscribers();
      this.logChange('updateDevelopmentPriorities', priorities);
      return true;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao atualizar prioridades de desenvolvimento:', error);
      return false;
    }
  }

  /**
   * Atualiza as preferências de comunicação
   */
  public updateCommunicationPreferences(preferences: Partial<LuizProfile['preferencias']['comunicacao']>): boolean {
    try {
      this.profile.preferencias.comunicacao = {
        ...this.profile.preferencias.comunicacao,
        ...preferences
      };
      
      this.notifySubscribers();
      this.logChange('updateCommunicationPreferences', preferences);
      return true;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao atualizar preferências de comunicação:', error);
      return false;
    }
  }

  /**
   * Atualiza as preferências de voz
   */
  public updateVoicePreferences(preferences: Partial<LuizProfile['preferencias']['voz']>): boolean {
    try {
      this.profile.preferencias.voz = {
        ...this.profile.preferencias.voz,
        ...preferences
      };
      
      this.notifySubscribers();
      this.logChange('updateVoicePreferences', preferences);
      return true;
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao atualizar preferências de voz:', error);
      return false;
    }
  }

  /**
   * Analisa o histórico e gera um resumo das interações recentes
   */
  public analyzeRecentInteractions(days: number = 7): any {
    try {
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      const recentInteractions = this.profile.historico.interacoes.filter(
        interaction => new Date(interaction.timestamp) >= cutoffDate
      );
      
      // Análise por tipo de interação
      const interactionTypes = recentInteractions.reduce((acc, interaction) => {
        acc[interaction.tipo] = (acc[interaction.tipo] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Análise por agente
      const interactionsByAgent = recentInteractions.reduce((acc, interaction) => {
        acc[interaction.agente] = (acc[interaction.agente] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return {
        totalInteractions: recentInteractions.length,
        interactionTypes,
        interactionsByAgent,
        earliestDate: cutoffDate.toISOString(),
        latestDate: now.toISOString()
      };
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao analisar interações recentes:', error);
      return null;
    }
  }

  /**
   * Analisa o progresso nas metas
   */
  public analyzeGoalProgress(): any {
    try {
      const activeMetas = this.profile.historico.metas.filter(
        meta => meta.status === 'pendente' || meta.status === 'em_andamento'
      );
      
      const completedMetas = this.profile.historico.metas.filter(
        meta => meta.status === 'concluida'
      );
      
      const canceledMetas = this.profile.historico.metas.filter(
        meta => meta.status === 'cancelada'
      );
      
      // Análise do progresso geral
      const averageProgress = activeMetas.length > 0
        ? activeMetas.reduce((total, meta) => total + meta.progresso, 0) / activeMetas.length
        : 0;
      
      return {
        total: this.profile.historico.metas.length,
        active: activeMetas.length,
        completed: completedMetas.length,
        canceled: canceledMetas.length,
        averageProgress,
        activeMetas: activeMetas.map(meta => ({
          id: meta.id,
          descricao: meta.descricao,
          progresso: meta.progresso,
          prazo: meta.prazo
        }))
      };
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao analisar progresso de metas:', error);
      return null;
    }
  }

  /**
   * Gera um relatório semanal de evolução
   */
  public generateWeeklyReport(): any {
    try {
      const interactionAnalysis = this.analyzeRecentInteractions(7);
      const goalAnalysis = this.analyzeGoalProgress();
      
      // Análise de tendências de humor e energia
      const lastWeekStates = this.changeLogEvents
        .filter(event => event.action === 'updateCurrentState' 
          && new Date(event.timestamp) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      
      const moodTrend = this.analyzeTrend(lastWeekStates, 'humor');
      const energyTrend = this.analyzeTrend(lastWeekStates, 'energia');
      const focusTrend = this.analyzeTrend(lastWeekStates, 'foco');
      
      const learningsByCategory = this.profile.historico.aprendizados
        .filter(learning => new Date(learning.data) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .reduce((acc, learning) => {
          acc[learning.categoria] = (acc[learning.categoria] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      
      return {
        periodo: {
          inicio: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          fim: new Date().toISOString()
        },
        interacoes: interactionAnalysis,
        metas: goalAnalysis,
        tendencias: {
          humor: moodTrend,
          energia: energyTrend,
          foco: focusTrend
        },
        aprendizados: {
          total: this.profile.historico.aprendizados.filter(
            learning => new Date(learning.data) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          ).length,
          porCategoria: learningsByCategory
        },
        recomendacoes: this.generateRecommendations(
          interactionAnalysis, 
          goalAnalysis, 
          { humor: moodTrend, energia: energyTrend, foco: focusTrend }
        )
      };
    } catch (error) {
      console.error('[LuizCoreManager] Erro ao gerar relatório semanal:', error);
      return null;
    }
  }

  /**
   * Analisa tendências em um conjunto de eventos
   */
  private analyzeTrend(events: any[], property: string): string {
    if (events.length < 2) return 'estável';
    
    let lastValues = events
      .filter(event => event.data && event.data[property])
      .map(event => event.data[property]);
    
    if (lastValues.length < 2) return 'estável';
    
    // Análise simplificada de tendência
    const firstValue = lastValues[lastValues.length - 1];
    const lastValue = lastValues[0];
    
    if (firstValue === lastValue) return 'estável';
    
    // Mapeamento específico para humor
    if (property === 'humor') {
      const humorValues = { positivo: 2, neutro: 1, negativo: 0 };
      if (humorValues[lastValue] > humorValues[firstValue]) return 'melhorando';
      return 'piorando';
    }
    
    // Mapeamento específico para energia
    if (property === 'energia') {
      const energyValues = { alta: 2, média: 1, baixa: 0 };
      if (energyValues[lastValue] > energyValues[firstValue]) return 'aumentando';
      return 'diminuindo';
    }
    
    // Análise genérica
    if (lastValue > firstValue) return 'aumentando';
    return 'diminuindo';
  }

  /**
   * Gera recomendações com base nas análises
   */
  private generateRecommendations(
    interactionAnalysis: any, 
    goalAnalysis: any, 
    trends: any
  ): any[] {
    const recommendations = [];
    
    // Recomendações baseadas no progresso das metas
    if (goalAnalysis.averageProgress < 30) {
      recommendations.push({
        tipo: 'meta',
        descricao: 'Revisar e priorizar metas em andamento que estão com baixo progresso',
        prioridade: 'alta'
      });
    }
    
    // Recomendações baseadas nas tendências de humor e energia
    if (trends.humor === 'piorando' || trends.energia === 'diminuindo') {
      recommendations.push({
        tipo: 'bem-estar',
        descricao: 'Considerar ajustes em rotinas para melhorar humor e energia',
        prioridade: 'alta'
      });
    }
    
    // Recomendações baseadas nas interações
    if (interactionAnalysis.totalInteractions < 10) {
      recommendations.push({
        tipo: 'engajamento',
        descricao: 'Aumentar frequência de uso do assistente para obter mais benefícios',
        prioridade: 'média'
      });
    }
    
    // Recomendação padrão para evolução contínua
    recommendations.push({
      tipo: 'desenvolvimento',
      descricao: 'Considerar expandir o uso do sistema para novas áreas de negócio',
      prioridade: 'baixa'
    });
    
    return recommendations;
  }

  /**
   * Inscreve-se para receber atualizações quando o perfil mudar
   */
  public subscribe(id: string, callback: (profile: LuizProfile) => void): void {
    this.subscribers.set(id, callback);
  }

  /**
   * Cancela a inscrição para atualizações
   */
  public unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Notifica todos os inscritos sobre mudanças no perfil
   */
  private notifySubscribers(): void {
    const profile = this.getProfile();
    this.subscribers.forEach(callback => {
      try {
        callback(profile);
      } catch (error) {
        console.error('[LuizCoreManager] Erro ao notificar assinante:', error);
      }
    });
  }

  /**
   * Registra uma mudança no log de alterações
   */
  private logChange(action: string, data: any): void {
    this.changeLogEvents.push({
      timestamp: new Date().toISOString(),
      action,
      data
    });
    
    // Limitar o log a 1000 eventos
    if (this.changeLogEvents.length > 1000) {
      this.changeLogEvents = this.changeLogEvents.slice(-1000);
    }
  }
}

// Exportar a instância singleton
export const luizCore = LuizCoreManager.getInstance();