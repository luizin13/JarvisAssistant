import { v4 as uuidv4 } from 'uuid';
import { openaiClient } from '../openai';
import { generateSpeechWithElevenLabs } from '../elevenlabs';
import { luizCore } from './luiz-core-manager';
import { DynamicMemoryManager } from './memory/dynamic-memory-manager';
import { systemOrchestrator } from './system-orchestrator';

/**
 * Interfaces para o funcionamento do assistente Jarvis
 */
export interface JarvisResponse {
  id: string;
  text: string;
  audioUrl?: string;
  timestamp: string;
  context?: any;
  source?: string;
  actionItems?: any[];
  conversationLevel?: ConversationLevel;
}

export interface JarvisRequest {
  userId: number;
  message: string;
  context?: any;
  requireVoice?: boolean;
  expectsResponse?: boolean;
}

export enum ConversationLevel {
  MOTIVACIONAL = 'motivacional',
  ESTRATEGICO = 'estrategico',
  REFLEXIVO = 'reflexivo'
}

/**
 * Assistente Jarvis - Assistente pessoal e estratégico do Luiz
 * Implementa funcionalidades de assistente de voz proativo
 */
export class JarvisAssistant {
  private static instance: JarvisAssistant;
  private memoryManager: DynamicMemoryManager;
  private dailyReflectionScheduled: boolean = false;
  private lastSpontaneousCommunication: Date = new Date();
  private activationPhrase: string = 'jarvis';
  private proactiveMode: boolean = true;

  /**
   * Construtor privado para Singleton
   */
  private constructor() {
    this.memoryManager = DynamicMemoryManager.getInstance();
    this.setupDailyReflection();
    this.setupWeeklyMemoryUpdate();
    this.setupProactiveCommunication();
    
    // Sincroniza com o core
    this.activationPhrase = luizCore.getProfile().configSistema.palavraAtivacao.toLowerCase();
    
    console.log(`[JarvisAssistant] Inicializado com palavra de ativação: ${this.activationPhrase}`);
  }

  /**
   * Obtém a instância do assistente
   */
  public static getInstance(): JarvisAssistant {
    if (!JarvisAssistant.instance) {
      JarvisAssistant.instance = new JarvisAssistant();
    }
    return JarvisAssistant.instance;
  }

  /**
   * Configura a reflexão diária no final do dia
   */
  private setupDailyReflection(): void {
    const scheduleReflection = () => {
      // Busca o horário final do dia no perfil do Luiz
      const profile = luizCore.getProfile();
      const endTime = profile.preferencias.horarios.fimTrabalho;
      
      // Parse do horário (formato HH:MM)
      const [hour, minute] = endTime.split(':').map(Number);
      
      const now = new Date();
      const reflectionTime = new Date(now);
      reflectionTime.setHours(hour, minute, 0, 0);
      
      // Se o horário já passou, agenda para o próximo dia
      if (now >= reflectionTime) {
        reflectionTime.setDate(reflectionTime.getDate() + 1);
      }
      
      // Calcula o tempo até a reflexão
      const timeToReflection = reflectionTime.getTime() - now.getTime();
      
      // Agenda a reflexão
      setTimeout(() => {
        this.triggerDailyReflection();
        // Re-agenda para o próximo dia
        scheduleReflection();
      }, timeToReflection);
      
      console.log(`[JarvisAssistant] Reflexão diária agendada para ${reflectionTime.toLocaleString()}`);
    };
    
    // Inicia o agendamento
    scheduleReflection();
  }

  /**
   * Configura a atualização semanal da memória
   */
  private setupWeeklyMemoryUpdate(): void {
    // Agenda para domingo às 23:00
    const scheduleMemoryUpdate = () => {
      const now = new Date();
      const updateTime = new Date(now);
      
      // Define para o próximo domingo às 23:00
      const daysUntilSunday = 7 - now.getDay();
      updateTime.setDate(now.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
      updateTime.setHours(23, 0, 0, 0);
      
      // Calcula o tempo até a atualização
      const timeToUpdate = updateTime.getTime() - now.getTime();
      
      // Agenda a atualização
      setTimeout(() => {
        this.updateMemories();
        // Re-agenda para a próxima semana
        scheduleMemoryUpdate();
      }, timeToUpdate);
      
      console.log(`[JarvisAssistant] Atualização semanal de memórias agendada para ${updateTime.toLocaleString()}`);
    };
    
    // Inicia o agendamento
    scheduleMemoryUpdate();
  }

  /**
   * Configura comunicação proativa
   */
  private setupProactiveCommunication(): void {
    // Verifica periodicamente se deve iniciar uma comunicação proativa
    setInterval(() => {
      if (!this.proactiveMode) return;
      
      const now = new Date();
      const hoursSinceLastCommunication = (now.getTime() - this.lastSpontaneousCommunication.getTime()) / (1000 * 60 * 60);
      
      // Verifica se faz mais de 4 horas desde a última comunicação proativa
      if (hoursSinceLastCommunication >= 4) {
        this.considerProactiveCommunication();
      }
    }, 30 * 60 * 1000); // Verifica a cada 30 minutos
  }

  /**
   * Considera iniciar uma comunicação proativa baseada em contexto
   */
  private async considerProactiveCommunication(): Promise<void> {
    try {
      // Verifica se está em horário de trabalho
      if (!this.isWithinWorkHours()) return;
      
      const profile = luizCore.getProfile();
      const currentState = profile.estadoAtual;
      
      // Determina o nível de comunicação com base no estado atual
      const conversationLevel = this.determineConversationLevel(currentState);
      
      // Busca informações relevantes do orchestrator
      const systemState = await systemOrchestrator.getSystemState();
      
      // Verifica se há alertas ou oportunidades importantes
      if (systemState.alerts && systemState.alerts.length > 0) {
        const importantAlert = systemState.alerts.find(alert => alert.priority === 'high');
        if (importantAlert) {
          this.triggerProactiveCommunication(
            `Preciso alertá-lo sobre algo importante: ${importantAlert.message}`,
            { alert: importantAlert },
            conversationLevel
          );
          return;
        }
      }
      
      // Verifica oportunidades de negócio
      if (systemState.opportunities && systemState.opportunities.length > 0) {
        const relevantOpportunity = systemState.opportunities[0];
        this.triggerProactiveCommunication(
          `Identifiquei uma oportunidade que pode ser do seu interesse: ${relevantOpportunity.title}`,
          { opportunity: relevantOpportunity },
          conversationLevel
        );
        return;
      }
      
      // Verifica metas com prazo se aproximando
      const upcomingDeadlines = profile.historico.metas
        .filter(goal => goal.status === 'em_andamento')
        .filter(goal => {
          const deadline = new Date(goal.prazo);
          const daysToDeadline = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          return daysToDeadline > 0 && daysToDeadline <= 7 && goal.progresso < 80;
        });
      
      if (upcomingDeadlines.length > 0) {
        const mostUrgent = upcomingDeadlines[0];
        this.triggerProactiveCommunication(
          `Lembrete importante: a meta "${mostUrgent.descricao}" está com prazo se aproximando e progresso de ${mostUrgent.progresso}%`,
          { goal: mostUrgent },
          conversationLevel
        );
        return;
      }
      
      // Busca insights estratégicos ou motivacionais caso não haja urgências
      const memories = await this.memoryManager.retrieveMemories({
        query: "insights estratégicos ou motivacionais para o momento atual",
        limit: 3
      });
      
      if (memories && memories.length > 0) {
        const memoryContent = memories[0].content;
        this.triggerProactiveCommunication(
          `Um insight para este momento: ${memoryContent}`,
          { memory: memories[0] },
          conversationLevel
        );
      }
    } catch (error) {
      console.error('[JarvisAssistant] Erro ao considerar comunicação proativa:', error);
    }
  }

  /**
   * Verifica se o horário atual está dentro do horário de trabalho
   */
  private isWithinWorkHours(): boolean {
    const now = new Date();
    const profile = luizCore.getProfile();
    
    // Parse dos horários (formato HH:MM)
    const [startHour, startMinute] = profile.preferencias.horarios.inicioTrabalho.split(':').map(Number);
    const [endHour, endMinute] = profile.preferencias.horarios.fimTrabalho.split(':').map(Number);
    
    const startTime = new Date(now);
    startTime.setHours(startHour, startMinute, 0, 0);
    
    const endTime = new Date(now);
    endTime.setHours(endHour, endMinute, 0, 0);
    
    return now >= startTime && now <= endTime;
  }

  /**
   * Determina o nível de conversa com base no estado atual
   */
  private determineConversationLevel(state: any): ConversationLevel {
    // Lógica baseada no humor e foco
    if (state.humor === 'negativo' || state.energia === 'baixa') {
      return ConversationLevel.MOTIVACIONAL;
    }
    
    if (state.foco === 'reflexivo') {
      return ConversationLevel.REFLEXIVO;
    }
    
    return ConversationLevel.ESTRATEGICO; // Padrão
  }

  /**
   * Inicia uma comunicação proativa
   */
  private async triggerProactiveCommunication(
    message: string, 
    context: any, 
    level: ConversationLevel
  ): Promise<void> {
    this.lastSpontaneousCommunication = new Date();
    
    const response: JarvisResponse = {
      id: uuidv4(),
      text: message,
      timestamp: new Date().toISOString(),
      context,
      source: 'proactive',
      conversationLevel: level
    };
    
    // Gera áudio se necessário
    const voicePreferences = luizCore.getProfile().preferencias.voz;
    try {
      const audioResult = await generateSpeechWithElevenLabs(message, {
        voiceType: voicePreferences.tipo as any,
        stability: 0.7,
        similarity: 0.7
      });
      
      if (audioResult && audioResult.audioUrl) {
        response.audioUrl = audioResult.audioUrl;
      }
    } catch (error) {
      console.error('[JarvisAssistant] Erro ao gerar áudio para comunicação proativa:', error);
    }
    
    // Registra a interação no perfil
    luizCore.addInteraction({
      tipo: 'proativo',
      conteudo: message,
      agente: 'jarvis',
      contexto: context
    });
    
    // Envia a resposta através do canal apropriado (via evento ou websocket)
    this.emitResponse(response);
  }

  /**
   * Processa uma solicitação ao assistente
   */
  public async processRequest(request: JarvisRequest): Promise<JarvisResponse> {
    try {
      console.log(`[JarvisAssistant] Processando solicitação: ${request.message}`);
      
      // Verifica se a mensagem contém a palavra de ativação
      const containsActivationPhrase = request.message.toLowerCase().includes(this.activationPhrase);
      
      // Obtém o estado atual do Luiz e determina o nível de conversa
      const profile = luizCore.getProfile();
      const conversationLevel = this.determineConversationLevel(profile.estadoAtual);
      
      // Recupera memórias relevantes para o contexto
      const memories = await this.memoryManager.retrieveMemories({
        query: request.message,
        limit: 5
      });
      
      // Contextualiza o pedido com base no nível de conversa
      let promptContext = `Você é JARVIS, assistente pessoal estratégico de ${profile.perfil.nome}.\n`;
      promptContext += `Seu nome vem de "Just A Rather Very Intelligent System" e você atua como um mentor estratégico e parceiro.\n`;
      
      // Adiciona informações do perfil
      promptContext += `O perfil do Luiz indica que ele trabalha nos setores: ${profile.perfil.setores.join(', ')}.\n`;
      promptContext += `Seu estado atual indica humor ${profile.estadoAtual.humor}, energia ${profile.estadoAtual.energia} e foco ${profile.estadoAtual.foco}.\n`;
      
      // Ajusta o tom e estilo conforme o nível da conversa
      switch (conversationLevel) {
        case ConversationLevel.MOTIVACIONAL:
          promptContext += `Use um tom MOTIVACIONAL. Seja inspirador, encorajador e focado em levantar o ânimo. Destaque pontos positivos e oportunidades.\n`;
          break;
        case ConversationLevel.ESTRATEGICO:
          promptContext += `Use um tom ESTRATÉGICO. Seja analítico, orientado a resultados e focado em soluções práticas para alcançar objetivos.\n`;
          break;
        case ConversationLevel.REFLEXIVO:
          promptContext += `Use um tom REFLEXIVO. Seja filosófico, profundo e focado em insights que promovam autoconhecimento e crescimento pessoal.\n`;
          break;
      }
      
      // Adiciona as prioridades atuais
      promptContext += `As prioridades atuais de negócio são:\n`;
      profile.prioridades.negocios.forEach(p => {
        promptContext += `- ${p.setor}: ${p.foco} (prioridade ${p.prioridade})\n`;
      });
      
      // Adiciona as prioridades de desenvolvimento
      promptContext += `As prioridades de desenvolvimento pessoal são:\n`;
      profile.prioridades.desenvolvimento.forEach(p => {
        promptContext += `- ${p.area} (prioridade ${p.prioridade})\n`;
      });
      
      // Adiciona memórias relevantes
      if (memories && memories.length > 0) {
        promptContext += `\nInformações relevantes da memória:\n`;
        memories.forEach(memory => {
          promptContext += `- ${memory.content}\n`;
        });
      }
      
      // Adiciona contexto da requisição
      if (request.context) {
        promptContext += `\nContexto adicional: ${JSON.stringify(request.context)}\n`;
      }
      
      // Define as preferências de comunicação
      promptContext += `\nPreferências de comunicação: estilo ${profile.preferencias.comunicacao.estilo}, detalhamento ${profile.preferencias.comunicacao.detalhamento}, tom ${profile.preferencias.comunicacao.tom}, formalidade ${profile.preferencias.comunicacao.formalidade}.\n`;
      
      // Adiciona instruções de resposta
      promptContext += `\nResponda de forma personalizada em português brasileiro (pt-BR). `;
      promptContext += `Não mencione estes contextos explicitamente, apenas use-os para formatar sua resposta de maneira adequada.`;
      
      // Gera a resposta usando o OpenAI
      const openaiResponse = await openaiClient.generateChatResponse(request.message, {
        userId: request.userId,
        systemPrompt: promptContext,
        messageContext: memories && memories.length > 0 ? 'Usando memórias relevantes para contextualizar a resposta' : undefined
      });
      
      const responseText = openaiResponse.text;
      
      // Cria o objeto de resposta
      const response: JarvisResponse = {
        id: uuidv4(),
        text: responseText,
        timestamp: new Date().toISOString(),
        context: {
          memories: memories?.length || 0,
          conversationLevel,
          containsActivationPhrase
        },
        conversationLevel
      };
      
      // Gera áudio se necessário
      if (request.requireVoice) {
        try {
          const voicePreferences = profile.preferencias.voz;
          const audioResult = await generateSpeechWithElevenLabs(responseText, {
            voiceType: voicePreferences.tipo as any,
            stability: 0.7,
            similarity: 0.7
          });
          
          if (audioResult && audioResult.audioUrl) {
            response.audioUrl = audioResult.audioUrl;
          }
        } catch (error) {
          console.error('[JarvisAssistant] Erro ao gerar áudio:', error);
        }
      }
      
      // Armazena a interação na memória
      await this.memoryManager.storeMemory({
        type: 'conversation',
        content: responseText,
        metadata: {
          query: request.message,
          userId: request.userId,
          timestamp: new Date().toISOString(),
          conversationLevel
        }
      });
      
      // Registra a interação no perfil
      luizCore.addInteraction({
        tipo: 'conversa',
        conteudo: request.message,
        agente: 'jarvis',
        contexto: { resposta: responseText }
      });
      
      return response;
    } catch (error) {
      console.error('[JarvisAssistant] Erro ao processar solicitação:', error);
      
      return {
        id: uuidv4(),
        text: 'Desculpe, tive um problema ao processar sua solicitação. Poderia tentar novamente?',
        timestamp: new Date().toISOString(),
        context: { error: true }
      };
    }
  }

  /**
   * Atualiza as memórias de maneira mais dinâmica
   */
  private async updateMemories(): Promise<void> {
    try {
      console.log('[JarvisAssistant] Iniciando atualização semanal de memórias...');
      
      // Obtém o perfil
      const profile = luizCore.getProfile();
      
      // Analisa interações recentes
      const interactionAnalysis = luizCore.analyzeRecentInteractions(7);
      const goalAnalysis = luizCore.analyzeGoalProgress();
      const weeklyReport = luizCore.generateWeeklyReport();
      
      // Memórias a serem consolidadas
      const memoriesToStore = [];
      
      // Consolida memórias sobre metas
      if (goalAnalysis && goalAnalysis.activeMetas) {
        for (const meta of goalAnalysis.activeMetas) {
          memoriesToStore.push({
            type: 'goal_progress',
            content: `Meta "${meta.descricao}" está com progresso de ${meta.progresso}% e prazo até ${new Date(meta.prazo).toLocaleDateString('pt-BR')}.`,
            metadata: {
              goalId: meta.id,
              timestamp: new Date().toISOString()
            }
          });
        }
      }
      
      // Consolida tendências do perfil
      if (weeklyReport && weeklyReport.tendencias) {
        const trendSummary = `As tendências recentes mostram: humor ${weeklyReport.tendencias.humor}, energia ${weeklyReport.tendencias.energia}, foco ${weeklyReport.tendencias.foco}.`;
        
        memoriesToStore.push({
          type: 'profile_trends',
          content: trendSummary,
          metadata: {
            timestamp: new Date().toISOString(),
            period: weeklyReport.periodo
          }
        });
      }
      
      // Consolida aprendizados
      const recentLearnings = profile.historico.aprendizados
        .filter(learning => new Date(learning.data) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
      
      for (const learning of recentLearnings) {
        memoriesToStore.push({
          type: 'learning',
          content: `Aprendizado em ${learning.categoria}: ${learning.descricao}`,
          metadata: {
            learningId: learning.id,
            timestamp: learning.data,
            source: learning.fonte
          }
        });
      }
      
      // Armazena todas as memórias
      for (const memory of memoriesToStore) {
        await this.memoryManager.storeMemory(memory);
      }
      
      // Consolida memórias para insight estratégico
      if (weeklyReport && weeklyReport.recomendacoes) {
        for (const rec of weeklyReport.recomendacoes) {
          await this.memoryManager.storeMemory({
            type: 'strategic_insight',
            content: `Recomendação ${rec.tipo}: ${rec.descricao} (prioridade ${rec.prioridade})`,
            metadata: {
              timestamp: new Date().toISOString(),
              priority: rec.prioridade,
              category: rec.tipo
            }
          });
        }
      }
      
      console.log(`[JarvisAssistant] Atualização de memórias concluída: ${memoriesToStore.length} memórias atualizadas`);
    } catch (error) {
      console.error('[JarvisAssistant] Erro ao atualizar memórias:', error);
    }
  }

  /**
   * Aciona a reflexão diária
   */
  private async triggerDailyReflection(): Promise<void> {
    try {
      console.log('[JarvisAssistant] Iniciando reflexão diária...');
      
      // Obtém o perfil
      const profile = luizCore.getProfile();
      
      // Gera prompt para reflexão
      let promptContext = `Você é JARVIS, assistente pessoal estratégico de ${profile.perfil.nome}.\n`;
      promptContext += `Está chegando ao final do dia e você deseja iniciar uma reflexão diária.\n`;
      promptContext += `Baseado nas atividades e diálogos do dia, formule 2-3 perguntas reflexivas que ajudem ${profile.perfil.nome} a revisar o dia e extrair aprendizados.\n`;
      promptContext += `Considere seu estado atual (humor ${profile.estadoAtual.humor}, energia ${profile.estadoAtual.energia} e foco ${profile.estadoAtual.foco}).\n`;
      promptContext += `Use um tom amigável e estimulante, sem ser intrusivo, pois esta é uma conversa de encerramento do dia.\n`;
      promptContext += `Diga que é a reflexão diária e inclua uma pergunta sobre aprendizados do dia, sucessos/desafios e uma pergunta reflexiva mais profunda.\n`;
      promptContext += `Responda em português brasileiro (pt-BR).`;
      
      // Gera a mensagem usando o OpenAI
      const openaiResponse = await openaiClient.generateChatResponse("Reflexão diária", {
        userId: 1, // Usuário padrão (Luiz)
        systemPrompt: promptContext
      });
      
      const responseText = openaiResponse.text;
      
      // Cria o objeto de resposta
      const response: JarvisResponse = {
        id: uuidv4(),
        text: responseText,
        timestamp: new Date().toISOString(),
        context: {
          type: 'daily_reflection'
        },
        conversationLevel: ConversationLevel.REFLEXIVO
      };
      
      // Gera áudio
      try {
        const voicePreferences = profile.preferencias.voz;
        const audioResult = await generateSpeechWithElevenLabs(responseText, {
          voiceType: voicePreferences.tipo as any,
          stability: 0.7,
          similarity: 0.7
        });
        
        if (audioResult && audioResult.audioUrl) {
          response.audioUrl = audioResult.audioUrl;
        }
      } catch (error) {
        console.error('[JarvisAssistant] Erro ao gerar áudio para reflexão diária:', error);
      }
      
      // Registra a interação no perfil
      luizCore.addInteraction({
        tipo: 'reflexao_diaria',
        conteudo: responseText,
        agente: 'jarvis',
        contexto: { iniciativaJarvis: true }
      });
      
      // Emite a resposta
      this.emitResponse(response);
      
      console.log('[JarvisAssistant] Reflexão diária iniciada com sucesso');
    } catch (error) {
      console.error('[JarvisAssistant] Erro ao acionar reflexão diária:', error);
    }
  }

  /**
   * Emite a resposta através do canal apropriado
   */
  private emitResponse(response: JarvisResponse): void {
    // Aqui implementaremos a lógica para enviar via server-sent events ou websocket
    // Por enquanto, apenas logamos
    console.log(`[JarvisAssistant] Resposta emitida: ${response.text.substring(0, 50)}...`);
    
    // Aqui deve estar a integração com o canal de comunicação
    if (global.eventEmitter) {
      global.eventEmitter.emit('jarvis:response', response);
    }
  }

  /**
   * Atualiza a configuração com base no perfil do Luiz
   */
  public updateConfig(): void {
    try {
      const profile = luizCore.getProfile();
      this.activationPhrase = profile.configSistema.palavraAtivacao.toLowerCase();
      this.proactiveMode = profile.configSistema.modoIntensivo;
      
      console.log(`[JarvisAssistant] Configuração atualizada: palavra de ativação = ${this.activationPhrase}, modo proativo = ${this.proactiveMode}`);
    } catch (error) {
      console.error('[JarvisAssistant] Erro ao atualizar configuração:', error);
    }
  }
}

// Exporta a instância singleton
export const jarvisAssistant = JarvisAssistant.getInstance();