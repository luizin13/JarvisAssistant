/**
 * Orquestrador de Inteligência Luiz-Jarvis
 * 
 * Este módulo implementa a lógica para selecionar inteligentemente qual API de IA
 * deve ser utilizada com base no tipo de tarefa, disponibilidade das APIs e
 * histórico de desempenho.
 */

import { isOpenAIAvailable, openaiClient } from "../openai";
import { isAnthropicAvailable, anthropicClient } from "../anthropic";
import { isPerplexityAvailable, perplexityClient } from "../perplexity";
import * as elevenLabsService from "../elevenlabs";
import * as slackService from "../slack";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

// Tipos de comandos que podem ser analisados
export enum CommandType {
  CREATIVE = 'creative',       // Criatividade, ideias inovadoras
  STRATEGIC = 'strategic',     // Estratégia, negócios, análise competitiva
  INFORMATIONAL = 'informational', // Informações, fatos, dados
  EMOTIONAL = 'emotional',     // Suporte emocional, motivação
  TECHNICAL = 'technical',     // Explicações técnicas, código
  VOICE = 'voice'              // Síntese de voz
}

// Possíveis provedores de IA que podem ser selecionados
export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  PERPLEXITY = 'perplexity',
  ELEVENLABS = 'elevenlabs',
  SLACK = 'slack',
  GOV_API = 'gov_api', 
  FALLBACK = 'fallback' // Usado quando a IA principal falha
}

// Interface para representar uma interação
export interface Interaction {
  id: string;
  timestamp: string;
  query: string;
  response: string;
  commandType: CommandType;
  primaryProvider: AIProvider;
  actualProvider: AIProvider; // Pode ser diferente se houve fallback
  responseTime: number; // em ms
  confidenceScore: number; // 0-1
  successful: boolean;
  metadata?: Record<string, any>;
}

// Interface para métricas de performance de um provedor de IA
export interface AIPerformanceMetrics {
  averageResponseTime: number;
  averageConfidenceScore: number;
  successRate: number;
  usageCount: number;
  lastUsed: string;
}

// Interface para métricas de performance por tipo de comando
export interface PerformanceMetrics {
  [CommandType.CREATIVE]?: Record<string, AIPerformanceMetrics>;
  [CommandType.STRATEGIC]?: Record<string, AIPerformanceMetrics>;
  [CommandType.INFORMATIONAL]?: Record<string, AIPerformanceMetrics>;
  [CommandType.EMOTIONAL]?: Record<string, AIPerformanceMetrics>;
  [CommandType.TECHNICAL]?: Record<string, AIPerformanceMetrics>;
  [CommandType.VOICE]?: Record<string, AIPerformanceMetrics>;
}

// Interface para o estado do orquestrador
export interface IntelligenceOrchestratorState {
  interactions: Interaction[];
  performanceMetrics: PerformanceMetrics;
  availableProviders: AIProvider[];
  primaryProviderMappings: Record<CommandType, AIProvider>;
  lastPerformanceOptimization: string | null;
}

/**
 * Classe principal do Orquestrador de Inteligência
 */
export class IntelligenceOrchestrator {
  private static instance: IntelligenceOrchestrator;
  private state: IntelligenceOrchestratorState;
  private stateLoaded: boolean = false;
  private maxInteractionsToKeep = 1000; // Número máximo de interações a armazenar

  private constructor() {
    this.state = {
      interactions: [],
      performanceMetrics: this.initializeEmptyMetrics(),
      availableProviders: [],
      primaryProviderMappings: {
        [CommandType.CREATIVE]: AIProvider.OPENAI,
        [CommandType.STRATEGIC]: AIProvider.ANTHROPIC,
        [CommandType.INFORMATIONAL]: AIProvider.PERPLEXITY,
        [CommandType.EMOTIONAL]: AIProvider.ANTHROPIC,
        [CommandType.TECHNICAL]: AIProvider.OPENAI,
        [CommandType.VOICE]: AIProvider.ELEVENLABS
      },
      lastPerformanceOptimization: null
    };
  }

  /**
   * Inicializa um objeto de métricas vazio
   */
  private initializeEmptyMetrics(): PerformanceMetrics {
    return {
      [CommandType.CREATIVE]: {},
      [CommandType.STRATEGIC]: {},
      [CommandType.INFORMATIONAL]: {},
      [CommandType.EMOTIONAL]: {},
      [CommandType.TECHNICAL]: {},
      [CommandType.VOICE]: {}
    };
  }

  /**
   * Obtém a instância única do orquestrador (padrão Singleton)
   */
  public static getInstance(): IntelligenceOrchestrator {
    if (!IntelligenceOrchestrator.instance) {
      IntelligenceOrchestrator.instance = new IntelligenceOrchestrator();
    }
    return IntelligenceOrchestrator.instance;
  }

  /**
   * Inicializa o orquestrador carregando o estado e verificando as APIs disponíveis
   */
  public async initialize(): Promise<void> {
    await this.loadState();
    await this.checkAvailableProviders();
    this.adaptMappingsToAvailability();
    
    // Verifica se já passou tempo suficiente desde a última otimização
    if (this.state.lastPerformanceOptimization) {
      const lastOpt = new Date(this.state.lastPerformanceOptimization);
      if (this.daysSince(lastOpt) >= 7) {
        await this.optimizeProviderMappings();
      }
    }
    
    console.log("[IntelligenceOrchestrator] Inicializado com sucesso!");
    console.log("[IntelligenceOrchestrator] Provedores disponíveis:", this.state.availableProviders);
    console.log("[IntelligenceOrchestrator] Mapeamentos atuais:", this.state.primaryProviderMappings);
    
    await this.saveState();
  }

  /**
   * Calcula quantos dias se passaram desde uma data
   */
  private daysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Carrega o estado do arquivo
   */
  private async loadState(): Promise<void> {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      const filePath = path.join(dataDir, 'intelligence-orchestrator-state.json');
      
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        const loadedState = JSON.parse(fileData);
        
        this.state = {
          ...this.state,
          ...loadedState,
          // Garantimos que os mapeamentos base estão presentes
          primaryProviderMappings: {
            ...this.state.primaryProviderMappings,
            ...loadedState.primaryProviderMappings
          }
        };
        
        // Limita o número de interações armazenadas
        if (this.state.interactions.length > this.maxInteractionsToKeep) {
          this.state.interactions = this.state.interactions.slice(-this.maxInteractionsToKeep);
        }
        
        this.stateLoaded = true;
        console.log("[IntelligenceOrchestrator] Estado carregado do arquivo");
      } else {
        console.log("[IntelligenceOrchestrator] Arquivo de estado não encontrado, usando padrões");
      }
    } catch (error) {
      console.error("[IntelligenceOrchestrator] Erro ao carregar estado:", error);
    }
  }

  /**
   * Salva o estado em arquivo
   */
  public async saveState(): Promise<void> {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      
      // Cria o diretório se não existir
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const filePath = path.join(dataDir, 'intelligence-orchestrator-state.json');
      fs.writeFileSync(filePath, JSON.stringify(this.state, null, 2), 'utf8');
      console.log("[IntelligenceOrchestrator] Estado salvo com sucesso");
    } catch (error) {
      console.error("[IntelligenceOrchestrator] Erro ao salvar estado:", error);
    }
  }

  /**
   * Verifica quais provedores de IA estão disponíveis
   */
  private async checkAvailableProviders(): Promise<void> {
    this.state.availableProviders = [];
    
    // Verifica OpenAI
    if (await isOpenAIAvailable()) {
      this.state.availableProviders.push(AIProvider.OPENAI);
    }
    
    // Verifica Anthropic
    if (await isAnthropicAvailable()) {
      this.state.availableProviders.push(AIProvider.ANTHROPIC);
    }
    
    // Verifica Perplexity
    if (await isPerplexityAvailable()) {
      this.state.availableProviders.push(AIProvider.PERPLEXITY);
    }
    
    // Verifica ElevenLabs (assumindo que a chave está disponível)
    if (process.env.ELEVENLABS_API_KEY) {
      this.state.availableProviders.push(AIProvider.ELEVENLABS);
    }
    
    // Verifica Slack
    if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_CHANNEL_ID) {
      this.state.availableProviders.push(AIProvider.SLACK);
    }
    
    // Verifica API Gov
    if (process.env.API_GOV_DADOS) {
      this.state.availableProviders.push(AIProvider.GOV_API);
    }
  }

  /**
   * Adapta os mapeamentos de provedores primários com base na disponibilidade
   */
  private adaptMappingsToAvailability(): void {
    for (const commandType of Object.values(CommandType)) {
      const currentProvider = this.state.primaryProviderMappings[commandType];
      
      // Se o provedor atual não estiver disponível, escolha um alternativo
      if (!this.state.availableProviders.includes(currentProvider)) {
        const alternatives = this.getAlternativeProviders(commandType);
        
        // Encontrar o primeiro alternativo disponível
        for (const alt of alternatives) {
          if (this.state.availableProviders.includes(alt)) {
            this.state.primaryProviderMappings[commandType] = alt;
            console.log(`[IntelligenceOrchestrator] Trocando provedor para ${commandType}: ${currentProvider} -> ${alt}`);
            break;
          }
        }
      }
    }
  }

  /**
   * Retorna provedores alternativos para um tipo de comando
   */
  private getAlternativeProviders(commandType: CommandType): AIProvider[] {
    switch (commandType) {
      case CommandType.CREATIVE:
        return [AIProvider.ANTHROPIC, AIProvider.PERPLEXITY, AIProvider.OPENAI];
      
      case CommandType.STRATEGIC:
        return [AIProvider.OPENAI, AIProvider.PERPLEXITY, AIProvider.ANTHROPIC];
      
      case CommandType.INFORMATIONAL:
        return [AIProvider.OPENAI, AIProvider.ANTHROPIC, AIProvider.PERPLEXITY];
      
      case CommandType.EMOTIONAL:
        return [AIProvider.OPENAI, AIProvider.PERPLEXITY, AIProvider.ANTHROPIC];
      
      case CommandType.TECHNICAL:
        return [AIProvider.ANTHROPIC, AIProvider.PERPLEXITY, AIProvider.OPENAI];
      
      case CommandType.VOICE:
        return [AIProvider.OPENAI, AIProvider.ELEVENLABS];
      
      default:
        return [AIProvider.OPENAI, AIProvider.ANTHROPIC, AIProvider.PERPLEXITY];
    }
  }

  /**
   * Otimiza os mapeamentos de provedores com base no histórico de desempenho
   */
  private async optimizeProviderMappings(): Promise<void> {
    // Só otimiza se houver interações suficientes
    if (this.state.interactions.length < 50) {
      console.log("[IntelligenceOrchestrator] Interações insuficientes para otimização");
      return;
    }
    
    // Para cada tipo de comando, encontra o melhor provedor com base em métricas
    for (const commandType of Object.values(CommandType)) {
      const metrics = this.state.performanceMetrics[commandType];
      if (!metrics) continue;
      
      let bestProvider = this.state.primaryProviderMappings[commandType];
      let bestScore = 0;
      
      // Analisa cada provedor disponível para este tipo de comando
      for (const provider of this.state.availableProviders) {
        const providerMetrics = metrics[provider];
        if (!providerMetrics || providerMetrics.usageCount < 5) continue;
        
        // Calcular pontuação composta (quanto maior, melhor)
        const score = (
          providerMetrics.successRate * 0.5 +
          providerMetrics.averageConfidenceScore * 0.3 +
          (1 - (providerMetrics.averageResponseTime / 10000)) * 0.2 // Normaliza para 0-1
        );
        
        if (score > bestScore) {
          bestScore = score;
          bestProvider = provider;
        }
      }
      
      // Atualiza o mapeamento com o melhor provedor
      const oldProvider = this.state.primaryProviderMappings[commandType];
      if (bestProvider !== oldProvider) {
        console.log(`[IntelligenceOrchestrator] Atualizando provedor para ${commandType}: ${oldProvider} -> ${bestProvider}`);
        this.state.primaryProviderMappings[commandType] = bestProvider;
      }
    }
    
    this.state.lastPerformanceOptimization = new Date().toISOString();
    await this.saveState();
  }

  /**
   * Analisa o tipo de comando com base no texto
   */
  public async analyzeCommandType(text: string): Promise<CommandType> {
    // Palavras-chave para detecção
    const keywords = {
      [CommandType.CREATIVE]: ['criar', 'imaginar', 'inventar', 'criativo', 'ideia', 'inovação'],
      [CommandType.STRATEGIC]: ['estratégia', 'negócio', 'planejar', 'competidor', 'mercado', 'análise'],
      [CommandType.INFORMATIONAL]: ['informação', 'pesquisar', 'dados', 'fatos', 'notícia', 'atual'],
      [CommandType.EMOTIONAL]: ['motivação', 'sentimento', 'ânimo', 'conselho', 'suporte', 'ajuda'],
      [CommandType.TECHNICAL]: ['código', 'programação', 'técnico', 'implementar', 'explicar', 'como'],
      [CommandType.VOICE]: ['falar', 'voz', 'sintetizar', 'áudio', 'pronunciar', 'escutar']
    };
    
    // Texto em minúsculas para comparação
    const lowerText = text.toLowerCase();
    
    // Contadores para cada tipo
    const counts: Record<CommandType, number> = {
      [CommandType.CREATIVE]: 0,
      [CommandType.STRATEGIC]: 0,
      [CommandType.INFORMATIONAL]: 0,
      [CommandType.EMOTIONAL]: 0,
      [CommandType.TECHNICAL]: 0,
      [CommandType.VOICE]: 0
    };
    
    // Conta ocorrências de palavras-chave
    for (const [type, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (lowerText.includes(word)) {
          counts[type as CommandType]++;
        }
      }
    }
    
    // Determina o tipo com mais ocorrências
    let maxCount = 0;
    let commandType = CommandType.INFORMATIONAL; // Padrão
    
    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        commandType = type as CommandType;
      }
    }
    
    return commandType;
  }

  /**
   * Seleciona o melhor provedor para um tipo de comando
   */
  public selectProvider(commandType: CommandType): AIProvider {
    // Retorna o provedor primário mapeado
    return this.state.primaryProviderMappings[commandType];
  }

  /**
   * Processa uma consulta usando o provedor mais apropriado
   * Esta é a função principal a ser chamada pelos outros módulos
   */
  public async processQuery(
    query: string, 
    options: {
      userId: number;
      systemPrompt?: string;
      messageContext?: string;
      confidenceThreshold?: number; // Limiar de confiança para usar fallback
    },
    forceProvider?: AIProvider 
  ): Promise<{ 
    response: string;
    provider: AIProvider;
    commandType: CommandType;
    confidence: number;
    responseTime: number;
  }> {
    // Determina o tipo de comando
    const commandType = await this.analyzeCommandType(query);
    
    // Usa o provider forçado ou seleciona o melhor para o tipo de comando
    let primaryProvider: AIProvider;
    if (forceProvider && this.state.availableProviders.includes(forceProvider)) {
      primaryProvider = forceProvider;
    } else {
      primaryProvider = this.selectProvider(commandType);
    }
    
    let actualProvider = primaryProvider;
    const startTime = Date.now();
    let response: string;
    let success = true;
    let confidence = 0.9; // Valor padrão
    
    try {
      // Tenta com o provedor primário
      response = await this.getResponseFromProvider(
        primaryProvider, 
        query, 
        commandType,
        options
      );
      
      // Se a resposta for muito curta, tenta usar alternativas
      if (options.confidenceThreshold && 
          response.length < 20 && 
          commandType !== CommandType.VOICE) {
        
        confidence = 0.5; // Baixa confiança para respostas curtas
        
        // Se abaixo do limiar, tenta com alternativas
        if (confidence < (options.confidenceThreshold || 0.7)) {
          console.log(`[IntelligenceOrchestrator] Resposta com baixa confiança, tentando alternativa`);
          
          const alternatives = this.getAlternativeProviders(commandType);
          
          for (const alt of alternatives) {
            if (alt !== primaryProvider && this.state.availableProviders.includes(alt)) {
              try {
                const altResponse = await this.getResponseFromProvider(
                  alt, 
                  query, 
                  commandType,
                  options
                );
                
                if (altResponse.length > response.length * 1.5) {
                  response = altResponse;
                  actualProvider = alt;
                  confidence = 0.85; // Confiança para alternativa bem-sucedida
                  break;
                }
              } catch (error) {
                console.error(`[IntelligenceOrchestrator] Erro na alternativa ${alt}:`, error);
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error(`[IntelligenceOrchestrator] Erro no provedor primário:`, error);
      
      // Tenta usar provedores alternativos
      success = false;
      let foundAlternative = false;
      
      const alternatives = this.getAlternativeProviders(commandType);
      
      for (const alt of alternatives) {
        if (alt !== primaryProvider && this.state.availableProviders.includes(alt)) {
          try {
            response = await this.getResponseFromProvider(
              alt, 
              query, 
              commandType,
              options
            );
            
            actualProvider = alt;
            success = true;
            foundAlternative = true;
            confidence = 0.7; // Confiança para fallback bem-sucedido
            break;
          } catch (altError) {
            console.error(`[IntelligenceOrchestrator] Erro na alternativa ${alt}:`, altError);
          }
        }
      }
      
      if (!foundAlternative) {
        response = `Desculpe, não consegui processar sua solicitação no momento. Erro: ${error.message || 'Desconhecido'}`;
        actualProvider = AIProvider.FALLBACK;
        confidence = 0.1; // Baixa confiança
      }
    }
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Registro da interação
    const interaction: Interaction = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      query,
      response,
      commandType,
      primaryProvider,
      actualProvider,
      responseTime,
      confidenceScore: confidence,
      successful: success
    };
    
    this.state.interactions.push(interaction);
    
    // Limita o tamanho do histórico
    if (this.state.interactions.length > this.maxInteractionsToKeep) {
      this.state.interactions = this.state.interactions.slice(-this.maxInteractionsToKeep);
    }
    
    // Atualiza métricas
    this.updatePerformanceMetrics(interaction);
    
    // Salva o estado periodicamente (a cada 10 interações)
    if (this.state.interactions.length % 10 === 0) {
      this.saveState();
    }
    
    return {
      response,
      provider: actualProvider,
      commandType,
      confidence,
      responseTime
    };
  }

  /**
   * Obtém resposta de um provedor específico
   */
  private async getResponseFromProvider(
    provider: AIProvider,
    query: string,
    commandType: CommandType,
    options: {
      userId: number;
      systemPrompt?: string;
      messageContext?: string;
    }
  ): Promise<string> {
    console.log(`[IntelligenceOrchestrator] Tentando obter resposta de ${provider}`);
    
    switch (provider) {
      case AIProvider.OPENAI:
        return await openaiClient.generateChatResponse(query, options);
        
      case AIProvider.ANTHROPIC:
        return await anthropicClient.generateChatResponse(query, options);
        
      case AIProvider.PERPLEXITY:
        const result = await perplexityClient.queryPerplexity(query, {
          system_prompt: options.systemPrompt,
          search_recency_filter: 'day' // Dados mais recentes
        });
        return result.text;
        
      case AIProvider.ELEVENLABS:
        if (commandType === CommandType.VOICE) {
          const { audioUrl } = await elevenLabsService.generateSpeechWithElevenLabs(query);
          return JSON.stringify({ type: 'audio', url: audioUrl });
        } else {
          throw new Error('ElevenLabs só pode ser usado para síntese de voz');
        }
        
      case AIProvider.SLACK:
        // Envio para o Slack (notificação)
        await slackService.sendSlackMessage({
          channel: process.env.SLACK_CHANNEL_ID || '',
          text: `Nova mensagem de Luiz-JARVIS: ${query}`
        });
        return "Mensagem enviada para o Slack com sucesso.";
        
      case AIProvider.GOV_API:
        // Implementação simplificada para API Gov
        return `Consulta a API do Governo sobre: "${query}" [Funcionalidade em implementação]`;
        
      case AIProvider.FALLBACK:
      default:
        return "Nenhum provedor disponível no momento. Por favor, tente novamente mais tarde.";
    }
  }

  /**
   * Atualiza as métricas de performance com base na interação
   */
  private updatePerformanceMetrics(interaction: Interaction): void {
    const { commandType, actualProvider, responseTime, confidenceScore, successful } = interaction;
    
    // Inicializa o objeto de métricas se não existir
    if (!this.state.performanceMetrics[commandType]) {
      this.state.performanceMetrics[commandType] = {};
    }
    
    if (!this.state.performanceMetrics[commandType][actualProvider]) {
      this.state.performanceMetrics[commandType][actualProvider] = {
        averageResponseTime: 0,
        averageConfidenceScore: 0,
        successRate: 0,
        usageCount: 0,
        lastUsed: new Date().toISOString()
      };
    }
    
    const metrics = this.state.performanceMetrics[commandType][actualProvider]!;
    
    // Atualiza as métricas
    metrics.usageCount += 1;
    metrics.lastUsed = new Date().toISOString();
    
    // Média móvel para tempo de resposta
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.usageCount - 1) + responseTime) / metrics.usageCount;
    
    // Média móvel para confiança
    metrics.averageConfidenceScore = 
      (metrics.averageConfidenceScore * (metrics.usageCount - 1) + confidenceScore) / metrics.usageCount;
    
    // Atualiza taxa de sucesso
    const totalSuccesses = Math.round(metrics.successRate * (metrics.usageCount - 1)) + (successful ? 1 : 0);
    metrics.successRate = totalSuccesses / metrics.usageCount;
  }

  /**
   * Obtém o estado atual do orquestrador
   */
  public getState(): IntelligenceOrchestratorState {
    return { ...this.state };
  }

  /**
   * Obtém as interações recentes
   */
  public getRecentInteractions(limit: number = 20): Interaction[] {
    return this.state.interactions.slice(-limit);
  }

  /**
   * Obtém as métricas de performance
   */
  public getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.state.performanceMetrics };
  }

  /**
   * Obtém os mapeamentos atuais de provedores
   */
  public getProviderMappings(): Record<CommandType, AIProvider> {
    return { ...this.state.primaryProviderMappings };
  }

  /**
   * Força uma reotimização dos mapeamentos
   */
  public async forceOptimization(): Promise<void> {
    await this.optimizeProviderMappings();
  }
}

/**
 * Exporta a função para obter a instância
 */
export function getIntelligenceOrchestrator(): IntelligenceOrchestrator {
  return IntelligenceOrchestrator.getInstance();
}