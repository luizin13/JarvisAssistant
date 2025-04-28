/**
 * Interface base para assistentes do sistema
 * 
 * Define a estrutura básica que todos os assistentes devem implementar,
 * permitindo uma integração consistente com o sistema principal.
 */
import { storage } from '../storage';

/**
 * Tipo para representar uma mensagem no sistema
 */
export interface Message {
  id?: string;
  userId: number;
  content: string;
  timestamp?: Date;
  metadata?: {
    source?: string;
    confidence?: number;
    emotion?: string;
    intent?: string;
    agentId?: string;
    [key: string]: any;
  };
}

/**
 * Interface para resultados de processamento de assistentes
 */
export interface AssistantResponse {
  message: string;
  content?: string;  // Campo adicional para compatibilidade com código legado
  audioUrl?: string;
  source?: string;
  confidence?: number;
  metadata?: Record<string, any>;
  suggestedActions?: string[];
  agentResponses?: {
    agentId: string;
    response: string;
    confidence: number;
  }[];
}

/**
 * Interface para a configuração base de assistentes
 */
export interface AssistantConfig {
  nomeAssistente: string;
  palavraChaveAtivacao: string;
  activeProviders: string[];
  defaultLanguage: string;
  securityLevel: string;
  defaultVoice: string;
  isActive: boolean;
}

/**
 * Classe base abstrata para todos os assistentes do sistema
 */
export abstract class BaseAssistant {
  protected config: AssistantConfig;
  protected id: string;
  protected learningData: any[] = [];
  
  constructor(id: string, config: AssistantConfig) {
    this.id = id;
    this.config = config;
  }
  
  /**
   * Processa uma mensagem e retorna uma resposta
   * @param message Mensagem a ser processada
   * @param userId ID do usuário que enviou a mensagem
   * @returns Resposta do assistente
   */
  abstract processMessage(message: string, userId: number): Promise<AssistantResponse>;
  
  /**
   * Atualiza a configuração do assistente
   * @param config Nova configuração
   */
  updateConfig(config: Partial<AssistantConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    console.log(`[${this.config.nomeAssistente}] Configuração atualizada`);
  }
  
  /**
   * Registra dados de aprendizado para análise e melhoria do assistente
   * @param data Dados de aprendizado
   */
  protected async registerLearning(data: any): Promise<void> {
    try {
      // Adicionar dados ao conjunto local
      this.learningData.push(data);
      
      // Limitar o tamanho do conjunto de dados em memória
      if (this.learningData.length > 100) {
        this.learningData = this.learningData.slice(-100);
      }
      
      // Registrar no armazenamento persistente
      await storage.createLearningRecord({
        action: 'assistant_learning',
        context: `Assistente: ${this.config.nomeAssistente}`,
        result: data.result || 'processamento_mensagem',
        learning: JSON.stringify(data),
        impact_level: data.impact_level || 'médio',
        strategic_area: 'assistentes_inteligentes',
        created_at: new Date()
      });
    } catch (error) {
      console.error(`[${this.config.nomeAssistente}] Erro ao registrar aprendizado:`, error);
    }
  }
  
  /**
   * Verifica se uma mensagem deve ser processada por este assistente
   * @param message Mensagem a ser verificada
   * @returns Verdadeiro se a mensagem deve ser processada
   */
  shouldProcessMessage(message: string): boolean {
    if (!message || typeof message !== 'string') return false;
    
    const messageLower = message.toLowerCase();
    const activationKeyword = this.config.palavraChaveAtivacao.toLowerCase();
    
    return messageLower.includes(activationKeyword) || 
           messageLower.startsWith(activationKeyword);
  }
  
  /**
   * Obtém o ID do assistente
   * @returns ID do assistente
   */
  getId(): string {
    return this.id;
  }
  
  /**
   * Obtém o nome do assistente
   * @returns Nome do assistente
   */
  getName(): string {
    return this.config.nomeAssistente;
  }
  
  /**
   * Verifica se o assistente está ativo
   * @returns Verdadeiro se o assistente estiver ativo
   */
  isActive(): boolean {
    return this.config.isActive;
  }
}