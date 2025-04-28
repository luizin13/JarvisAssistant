/**
 * Implementação do assistente JARVIS
 * 
 * Assistente principal que coordena os diferentes agentes especializados 
 * e mantém o contexto das interações com o usuário.
 */
import { BaseAssistant, AssistantResponse } from './base-assistant';
import { JarvisConfig, validateJarvisConfig, jarvisDefaultConfig } from './jarvis-config';
import { storage } from '../storage';
import { generateSpeechWithElevenLabs } from '../elevenlabs';
import { generateChatResponse } from '../openai';
import { enrichResponseWithFacts } from '../perplexity';
import { v4 as uuidv4 } from 'uuid';

// Importar os serviços de agentes especializados
import agentFactory from '../services/specialized-agents/agent-factory';

/**
 * Classe concreta do assistente JARVIS
 */
export class JarvisAssistant extends BaseAssistant {
  private jarvisConfig: JarvisConfig;
  private conversationContext: Map<number, string[]> = new Map();
  private maxContextSize = 10; // Máximo de mensagens a manter no contexto
  
  constructor(id: string = `jarvis-${uuidv4()}`) {
    // Inicializar com a configuração base
    super(id, jarvisDefaultConfig);
    this.jarvisConfig = jarvisDefaultConfig;
    console.log(`[JARVIS] Inicializado com sucesso. ID: ${id}`);
  }
  
  /**
   * Atualiza a configuração específica do JARVIS
   * @param config Nova configuração parcial
   */
  updateJarvisConfig(config: Partial<JarvisConfig>): void {
    // Validar e atualizar a configuração
    this.jarvisConfig = validateJarvisConfig(config);
    // Atualizar também a configuração base
    super.updateConfig(this.jarvisConfig);
    console.log(`[JARVIS] Configuração JARVIS atualizada`);
  }
  
  /**
   * Implementação do método abstrato para processamento de mensagens
   * @param message Mensagem a ser processada
   * @param userId ID do usuário que enviou a mensagem
   * @returns Resposta do assistente
   */
  async processMessage(message: string, userId: number): Promise<AssistantResponse> {
    try {
      console.log(`[JARVIS] Processando mensagem de ${userId}: "${message.substring(0, 50)}..."`);
      
      // Validar entradas
      if (!message || typeof message !== 'string' || message.trim() === '') {
        return {
          message: "Não consegui entender a mensagem. Pode reformular?",
          confidence: 0.5,
          source: 'jarvis',
          metadata: { error: 'empty_message' }
        };
      }
      
      // Adicionar mensagem ao contexto da conversa
      this.addToConversationContext(userId, message);
      
      // Determinar quais agentes devem processar a mensagem
      const relevantAgents = this.determineRelevantAgents(message);
      
      // Coletar respostas dos agentes relevantes
      const agentResponses = await this.collectAgentResponses(message, userId, relevantAgents);
      
      // Sintetizar uma resposta a partir das respostas dos agentes
      let synthesizedResponse = await this.synthesizeResponse(message, agentResponses, userId);
      
      // Verificar se a resposta precisa de enriquecimento com dados externos
      if (this.shouldEnrichWithExternalData(message, synthesizedResponse)) {
        synthesizedResponse = await this.enrichResponseWithExternalData(synthesizedResponse, message);
      }
      
      // Gerar áudio se a configuração estiver ativada
      let audioUrl = undefined;
      if (this.jarvisConfig.vozAtivada) {
        try {
          const voiceOptions = {
            voiceType: this.jarvisConfig.defaultVoice as 'maria' | 'clara' | 'bella' | 'nicole' | 'ana' | 'custom',
            stability: 0.6,
            similarity: 0.85,
            style: 0.35,
            useCache: true
          };
          
          const audioResult = await generateSpeechWithElevenLabs(synthesizedResponse.message, voiceOptions);
          audioUrl = audioResult.audioUrl;
        } catch (audioError) {
          console.error('[JARVIS] Erro ao gerar áudio:', audioError);
          // Continuar sem áudio em caso de erro
        }
      }
      
      // Registrar dados de aprendizado
      await this.registerLearning({
        userId,
        message,
        response: synthesizedResponse.message,
        agentResponses: agentResponses.map(r => ({ agentId: r.agentId, confidence: r.confidence })),
        result: 'processado',
        impact_level: 'médio'
      });
      
      // Adicionar a resposta ao contexto da conversa
      this.addToConversationContext(userId, `JARVIS: ${synthesizedResponse.message}`);
      
      // Retornar a resposta completa
      return {
        message: synthesizedResponse.message,
        audioUrl,
        source: 'jarvis',
        confidence: synthesizedResponse.confidence,
        metadata: {
          processedBy: 'jarvis',
          usedAgents: relevantAgents,
          emotionalTone: this.detectEmotionalTone(synthesizedResponse.message),
          timestamp: new Date().toISOString()
        },
        agentResponses
      };
    } catch (error) {
      console.error('[JARVIS] Erro ao processar mensagem:', error);
      
      // Resposta em caso de erro
      return {
        message: "Desculpe, encontrei um problema ao processar sua mensagem. Posso ajudar com algo mais?",
        source: 'jarvis',
        confidence: 0.3,
        metadata: { 
          error: true,
          errorType: error.name, 
          errorMessage: error.message 
        }
      };
    }
  }
  
  /**
   * Adiciona uma mensagem ao contexto da conversa para um usuário
   * @param userId ID do usuário
   * @param message Mensagem a ser adicionada
   */
  private addToConversationContext(userId: number, message: string): void {
    if (!this.conversationContext.has(userId)) {
      this.conversationContext.set(userId, []);
    }
    
    const context = this.conversationContext.get(userId);
    
    if (context) {
      context.push(message);
      
      // Limitar o tamanho do contexto
      if (context.length > this.maxContextSize) {
        this.conversationContext.set(userId, context.slice(-this.maxContextSize));
      }
    }
  }
  
  /**
   * Determina quais agentes são relevantes para processar uma mensagem
   * @param message Mensagem a ser processada
   * @returns Lista de IDs de agentes relevantes
   */
  private determineRelevantAgents(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const relevantAgents: string[] = [];
    
    // Verificar se há menção direta a missões diárias
    if (lowerMessage.includes('missão') || 
        lowerMessage.includes('desafio') || 
        lowerMessage.includes('evolução 1%')) {
      relevantAgents.push('DailyMissionsAgent');
    }
    
    // Verificar se há menção direta a aprendizado ou estudos
    if (lowerMessage.includes('aprender') || 
        lowerMessage.includes('estudo') || 
        lowerMessage.includes('academia')) {
      relevantAgents.push('AgenteAcademia');
    }
    
    // Sempre incluir o agente conversador para garantir uma resposta
    relevantAgents.push('AgenteConversador');
    
    // Se não houver agentes específicos, usar os configurados
    if (relevantAgents.length <= 1) {
      return this.jarvisConfig.agentesIntegrados;
    }
    
    return relevantAgents;
  }
  
  /**
   * Coleta respostas dos agentes relevantes
   * @param message Mensagem original
   * @param userId ID do usuário
   * @param agentIds IDs dos agentes relevantes
   * @returns Lista de respostas dos agentes
   */
  private async collectAgentResponses(message: string, userId: number, agentIds: string[]): Promise<{
    agentId: string;
    response: string;
    confidence: number;
  }[]> {
    const agentResponses = [];
    
    // Obter o contexto da conversa para este usuário
    const conversationContext = this.conversationContext.get(userId) || [];
    const conversationText = conversationContext.slice(-3).join('\n');
    
    // Processar com cada agente em paralelo
    const responsePromises = agentIds.map(async (agentId) => {
      try {
        const agent = agentFactory.createAgent(agentId);
        
        if (!agent) {
          console.warn(`[JARVIS] Agente ${agentId} não encontrado`);
          return null;
        }
        
        const agentResponse = await agent.process({
          request: {
            message,
            requestType: 'text'
          },
          systemContext: {
            userId,
            conversationHistory: conversationText
          },
          parameters: {}
        });
        
        return {
          agentId,
          response: typeof agentResponse.data === 'string' 
            ? agentResponse.data 
            : (agentResponse.message || JSON.stringify(agentResponse.data)),
          confidence: agentResponse.metadata?.confidenceLevel || 0.5
        };
      } catch (error) {
        console.error(`[JARVIS] Erro ao processar com agente ${agentId}:`, error);
        return null;
      }
    });
    
    // Aguardar todas as respostas ou timeout
    const responses = await Promise.all(responsePromises);
    
    // Filtrar respostas nulas
    return responses.filter(response => response !== null) as {
      agentId: string;
      response: string;
      confidence: number;
    }[];
  }
  
  /**
   * Sintetiza uma resposta a partir das respostas dos agentes
   * @param originalMessage Mensagem original
   * @param agentResponses Respostas dos agentes
   * @param userId ID do usuário
   * @returns Resposta sintetizada
   */
  private async synthesizeResponse(
    originalMessage: string, 
    agentResponses: { agentId: string; response: string; confidence: number; }[],
    userId: number
  ): Promise<{ message: string; confidence: number }> {
    // Se não houver respostas de agentes, gerar uma resposta padrão
    if (agentResponses.length === 0) {
      return this.generateDefaultResponse(originalMessage, userId);
    }
    
    // Se houver apenas uma resposta com alta confiança, usá-la diretamente
    if (agentResponses.length === 1 && agentResponses[0].confidence > 0.8) {
      return {
        message: agentResponses[0].response,
        confidence: agentResponses[0].confidence
      };
    }
    
    // Preparar o prompt para o modelo de linguagem
    const systemPrompt = this.buildSynthesisSystemPrompt();
    const userPrompt = this.buildSynthesisUserPrompt(originalMessage, agentResponses);
    
    try {
      // Usar o modelo de linguagem para sintetizar uma resposta
      const response = await generateChatResponse(userPrompt, {
        userId,
        systemPrompt,
        messageContext: this.conversationContext.get(userId)?.slice(-5).join('\n') || ''
      });
      
      return {
        message: response.message || "Estou processando sua solicitação. Tente ser mais específico para que eu possa ajudar melhor.",
        confidence: 0.85 // Confiança fixa para respostas sintetizadas
      };
    } catch (error) {
      console.error('[JARVIS] Erro ao sintetizar resposta:', error);
      
      // Em caso de erro, usar a resposta do agente com maior confiança
      const bestResponse = agentResponses.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      , agentResponses[0]);
      
      return {
        message: bestResponse.response,
        confidence: bestResponse.confidence * 0.9 // Reduzir a confiança por não ser sintetizada
      };
    }
  }
  
  /**
   * Gera uma resposta padrão quando não há respostas de agentes
   * @param originalMessage Mensagem original
   * @param userId ID do usuário
   * @returns Resposta padrão
   */
  private async generateDefaultResponse(originalMessage: string, userId: number): Promise<{ message: string; confidence: number }> {
    try {
      // Usar o OpenAI diretamente para gerar uma resposta
      const systemPrompt = `Você é ${this.jarvisConfig.nomeAssistente}, um assistente inteligente que combina características de ${
        this.jarvisConfig.personalidade.amigo ? 'um amigo próximo, ' : ''
      }${
        this.jarvisConfig.personalidade.mentor ? 'um mentor sábio, ' : ''
      }${
        this.jarvisConfig.personalidade.estrategista ? 'um estrategista visionário, ' : ''
      }focado em ajudar de forma eficiente.
      
      Responda de forma ${this.jarvisConfig.modoResposta} e em português brasileiro.
      
      Mantenha a resposta concisa, direta, mas completa.`;
      
      const response = await generateChatResponse(originalMessage, {
        userId,
        systemPrompt,
        messageContext: this.conversationContext.get(userId)?.slice(-5).join('\n') || ''
      });
      
      return {
        message: response.message || "Estou processando sua solicitação. Pode me dar mais detalhes para que eu possa ajudar melhor?",
        confidence: 0.75 // Confiança padrão para respostas diretas
      };
    } catch (error) {
      console.error('[JARVIS] Erro ao gerar resposta padrão:', error);
      
      // Fallback em caso de erro
      return {
        message: "Estou processando sua solicitação. Pode me dar mais detalhes para que eu possa ajudar melhor?",
        confidence: 0.4
      };
    }
  }
  
  /**
   * Constrói o prompt de sistema para sintetizar respostas
   * @returns Prompt de sistema
   */
  private buildSynthesisSystemPrompt(): string {
    return `Você é ${this.jarvisConfig.nomeAssistente}, um assistente inteligente que combina características de ${
      this.jarvisConfig.personalidade.amigo ? 'um amigo próximo, ' : ''
    }${
      this.jarvisConfig.personalidade.mentor ? 'um mentor sábio, ' : ''
    }${
      this.jarvisConfig.personalidade.estrategista ? 'um estrategista visionário, ' : ''
    }focado em ajudar de forma eficiente.
    
    Sua tarefa é sintetizar as melhores partes das respostas dos agentes especializados em uma única resposta coerente.
    
    Siga estas diretrizes:
    1. Responda sempre em português brasileiro
    2. Priorize informações dos agentes com maior nível de confiança
    3. Responda no estilo ${this.jarvisConfig.modoResposta}
    4. Mantenha a resposta concisa, direta, mas completa
    5. Não mencione que está sintetizando respostas ou que consultou agentes
    6. Use um tom amigável, mas profissional
    7. Inclua informações específicas e úteis das respostas originais
    `;
  }
  
  /**
   * Constrói o prompt do usuário para sintetizar respostas
   * @param originalMessage Mensagem original
   * @param agentResponses Respostas dos agentes
   * @returns Prompt do usuário
   */
  private buildSynthesisUserPrompt(originalMessage: string, agentResponses: { agentId: string; response: string; confidence: number; }[]): string {
    let prompt = `Mensagem original: "${originalMessage}"\n\n`;
    prompt += "Respostas dos agentes especializados:\n\n";
    
    agentResponses.forEach((response, index) => {
      prompt += `Agente ${index + 1} (${response.agentId}, confiança: ${response.confidence.toFixed(2)}):\n`;
      prompt += `"${response.response}"\n\n`;
    });
    
    prompt += "Sintetize uma única resposta combinando as melhores informações das respostas acima.";
    
    return prompt;
  }
  
  /**
   * Verifica se a resposta deve ser enriquecida com dados externos
   * @param originalMessage Mensagem original
   * @param synthesizedResponse Resposta sintetizada
   * @returns Verdadeiro se a resposta deve ser enriquecida
   */
  private shouldEnrichWithExternalData(originalMessage: string, synthesizedResponse: { message: string; confidence: number }): boolean {
    const lowerMessage = originalMessage.toLowerCase();
    
    // Verificar se a mensagem contém perguntas sobre dados atuais ou factuais
    const factualQueries = [
      'quanto', 'quando', 'onde', 'qual', 'quem', 'como funciona', 
      'notícias', 'atualidade', 'mercado', 'dados', 'estatísticas'
    ];
    
    // Verificar palavras-chave para dados atuais
    const currentDataKeywords = [
      'recente', 'atual', 'hoje', 'ontem', 'semana', 'mês', 'mercado',
      'preço', 'preços', 'cotação', 'ação', 'ações', 'tendência', 'tendências'
    ];
    
    // Verificar se há uma pergunta factual ou pedido de dados atuais
    const hasFactualQuery = factualQueries.some(query => lowerMessage.includes(query));
    const needsCurrentData = currentDataKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Também verificar se a confiança na resposta é relativamente baixa
    const lowConfidence = synthesizedResponse.confidence < 0.7;
    
    return (hasFactualQuery || needsCurrentData) || lowConfidence;
  }
  
  /**
   * Enriquece a resposta com dados externos
   * @param synthesizedResponse Resposta sintetizada
   * @param originalMessage Mensagem original
   * @returns Resposta enriquecida
   */
  private async enrichResponseWithExternalData(
    synthesizedResponse: { message: string; confidence: number },
    originalMessage: string
  ): Promise<{ message: string; confidence: number }> {
    try {
      // Tentar enriquecer com dados do Perplexity
      const enrichedResult = await enrichResponseWithFacts(originalMessage, synthesizedResponse.message);
      
      if (enrichedResult && enrichedResult.enhancedResponse) {
        return {
          message: enrichedResult.enhancedResponse,
          confidence: Math.min(synthesizedResponse.confidence + 0.1, 0.95) // Aumentar confiança, mas não além de 0.95
        };
      }
    } catch (error) {
      console.error('[JARVIS] Erro ao enriquecer resposta com dados externos:', error);
      // Continuar com a resposta original em caso de erro
    }
    
    // Retornar a resposta original se não foi possível enriquecer
    return synthesizedResponse;
  }
  
  /**
   * Detecta o tom emocional de uma mensagem
   * @param message Mensagem a ser analisada
   * @returns Tom emocional da mensagem
   */
  private detectEmotionalTone(message: string): string {
    // Lista de emoções e palavras-chave associadas
    const emotionKeywords: Record<string, string[]> = {
      'animado': ['ótimo', 'excelente', 'fantástico', 'incrível', 'parabéns', 'sucesso'],
      'empático': ['entendo', 'compreendo', 'difícil', 'desafio', 'preocupado'],
      'motivacional': ['vamos', 'consegue', 'potencial', 'melhorar', 'avançar', 'progresso'],
      'analítico': ['analisar', 'considerar', 'dados', 'estratégia', 'planejar'],
      'neutro': ['informar', 'responder', 'explicar']
    };
    
    // Contagem de ocorrências para cada emoção
    const counts: Record<string, number> = {
      'animado': 0,
      'empático': 0,
      'motivacional': 0,
      'analítico': 0,
      'neutro': 1 // Iniciar com 1 para neutro como fallback
    };
    
    // Contar ocorrências de palavras-chave
    const lowerMessage = message.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          counts[emotion]++;
        }
      }
    }
    
    // Encontrar a emoção com maior contagem
    return Object.entries(counts).reduce((max, [emotion, count]) => 
      count > max[1] ? [emotion, count] : max
    , ['neutro', 0])[0];
  }
}