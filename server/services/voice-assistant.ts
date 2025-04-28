import { v4 as uuidv4 } from 'uuid';
import { generateSpeechWithElevenLabs } from '../elevenlabs';
import { jarvisAssistant, ConversationLevel } from './jarvis-assistant';
import { luizCore } from './luiz-core-manager';

/**
 * Interface para mensagem de voz
 */
export interface VoiceMessage {
  id: string;
  text: string;
  audioUrl: string;
  timestamp: string;
  direction: 'incoming' | 'outgoing';
  conversationLevel: ConversationLevel;
  isProactive: boolean;
  context?: any;
}

/**
 * Interface para solicitação de voz
 */
export interface VoiceRequest {
  userId: number;
  message: string;
  context?: any;
}

/**
 * Interface para configuração do assistente de voz
 */
export interface VoiceAssistantConfig {
  activationPhrase: string;
  voiceType: string;
  voiceSpeed: number;
  proactiveMode: boolean;
  notifyOpportunities: boolean;
  notifyNews: boolean;
  conversationTimeout: number;
}

/**
 * Assistente de Voz Avançado
 * Implementa funcionalidades de assistente de voz proativo com conversas em 3 níveis
 */
export class VoiceAssistant {
  private static instance: VoiceAssistant;
  private recentMessages: VoiceMessage[] = [];
  private conversationActive: boolean = false;
  private lastInteractionTime: Date = new Date();
  private conversationTimeoutMs: number = 60000; // 1 minuto por padrão
  private config: VoiceAssistantConfig;
  private subscribers: Map<string, (message: VoiceMessage) => void>;

  /**
   * Construtor privado para Singleton
   */
  private constructor() {
    // Carrega configuração inicial do perfil
    const profile = luizCore.getProfile();
    
    this.config = {
      activationPhrase: profile.configSistema.palavraAtivacao.toLowerCase(),
      voiceType: profile.preferencias.voz.tipo,
      voiceSpeed: profile.preferencias.voz.velocidade,
      proactiveMode: profile.configSistema.modoIntensivo,
      notifyOpportunities: profile.preferencias.notificacoes.oportunidadesNegocio,
      notifyNews: profile.preferencias.notificacoes.noticiasRelevantes,
      conversationTimeout: 60000 // 1 minuto
    };
    
    this.subscribers = new Map();
    
    // Configura detecção de timeout de conversa
    setInterval(() => this.checkConversationTimeout(), 10000); // Verifica a cada 10 segundos
    
    // Inscreve-se para receber atualizações do perfil
    luizCore.subscribe('voice-assistant', (profile) => {
      this.updateConfigFromProfile(profile);
    });
    
    console.log(`[VoiceAssistant] Inicializado com palavra de ativação: ${this.config.activationPhrase}`);
  }

  /**
   * Obtém a instância do assistente de voz
   */
  public static getInstance(): VoiceAssistant {
    if (!VoiceAssistant.instance) {
      VoiceAssistant.instance = new VoiceAssistant();
    }
    return VoiceAssistant.instance;
  }

  /**
   * Atualiza a configuração com base no perfil do Luiz
   */
  private updateConfigFromProfile(profile: any): void {
    this.config = {
      activationPhrase: profile.configSistema.palavraAtivacao.toLowerCase(),
      voiceType: profile.preferencias.voz.tipo,
      voiceSpeed: profile.preferencias.voz.velocidade,
      proactiveMode: profile.configSistema.modoIntensivo,
      notifyOpportunities: profile.preferencias.notificacoes.oportunidadesNegocio,
      notifyNews: profile.preferencias.notificacoes.noticiasRelevantes,
      conversationTimeout: 60000 // 1 minuto
    };
    
    console.log(`[VoiceAssistant] Configuração atualizada: palavra de ativação = ${this.config.activationPhrase}`);
  }

  /**
   * Verifica se uma conversa ativa deve ser encerrada por timeout
   */
  private checkConversationTimeout(): void {
    if (!this.conversationActive) return;
    
    const now = new Date();
    const elapsedMs = now.getTime() - this.lastInteractionTime.getTime();
    
    if (elapsedMs > this.conversationTimeoutMs) {
      console.log(`[VoiceAssistant] Conversa encerrada por timeout após ${elapsedMs}ms de inatividade`);
      this.conversationActive = false;
      
      // Notifica encerramento
      const message: VoiceMessage = {
        id: uuidv4(),
        text: "",
        audioUrl: "",
        timestamp: new Date().toISOString(),
        direction: 'outgoing',
        conversationLevel: ConversationLevel.ESTRATEGICO,
        isProactive: false,
        context: { type: 'conversation_ended', reason: 'timeout' }
      };
      
      this.notifySubscribers(message);
    }
  }

  /**
   * Processa uma solicitação de voz e gera resposta
   */
  public async processVoiceRequest(request: VoiceRequest): Promise<VoiceMessage> {
    try {
      console.log(`[VoiceAssistant] Processando solicitação de voz: ${request.message}`);
      
      // Atualiza temporizador de conversa
      this.lastInteractionTime = new Date();
      this.conversationActive = true;
      
      // Registra a mensagem do usuário
      const userMessage: VoiceMessage = {
        id: uuidv4(),
        text: request.message,
        audioUrl: "", // Mensagens do usuário não têm áudio
        timestamp: new Date().toISOString(),
        direction: 'incoming',
        conversationLevel: this.determineConversationLevel(),
        isProactive: false,
        context: request.context
      };
      
      this.recentMessages.push(userMessage);
      this.notifySubscribers(userMessage);
      
      // Verifica ativação por palavra-chave
      const containsActivationPhrase = request.message.toLowerCase().includes(this.config.activationPhrase);
      
      // Processa com o Jarvis Assistant
      let jarvisResponse;
      try {
        jarvisResponse = await jarvisAssistant.processRequest({
          userId: request.userId,
          message: request.message,
          context: request.context,
          requireVoice: true,
          expectsResponse: true
        });
      } catch (jarvisError: any) {
        console.error('[VoiceAssistant] Erro ao processar com Jarvis:', jarvisError);
        throw new Error(`Falha na resposta do assistente: ${jarvisError?.message || 'Erro desconhecido'}`);
      }
      
      // Registra a resposta no histórico do Luiz
      try {
        await luizCore.addInteraction({
          tipo: 'voz',
          conteudo: request.message,
          agente: 'jarvis',
          contexto: {
            resposta: jarvisResponse.text,
            nivel: jarvisResponse.conversationLevel
          }
        });
      } catch (historyError) {
        console.error('[VoiceAssistant] Erro ao registrar interação no histórico:', historyError);
        // Continua mesmo se falhar o registro no histórico
      }
      
      // Cria a mensagem de resposta
      const responseMessage: VoiceMessage = {
        id: jarvisResponse.id,
        text: jarvisResponse.text,
        audioUrl: jarvisResponse.audioUrl || '',
        timestamp: jarvisResponse.timestamp,
        direction: 'outgoing',
        conversationLevel: jarvisResponse.conversationLevel || this.determineConversationLevel(),
        isProactive: false,
        context: jarvisResponse.context
      };
      
      // Gera áudio se não foi fornecido pelo Jarvis
      if (!responseMessage.audioUrl) {
        responseMessage.audioUrl = await this.generateAudioWithFallback(responseMessage.text);
      }
      
      // Adiciona ao histórico
      this.recentMessages.push(responseMessage);
      
      // Notifica os assinantes
      this.notifySubscribers(responseMessage);
      
      return responseMessage;
    } catch (error: any) {
      console.error('[VoiceAssistant] Erro ao processar solicitação de voz:', error);
      
      // Cria mensagem de erro
      const errorMessage: VoiceMessage = {
        id: uuidv4(),
        text: 'Desculpe, tive um problema ao processar sua solicitação. Poderia tentar novamente?',
        audioUrl: '',
        timestamp: new Date().toISOString(),
        direction: 'outgoing',
        conversationLevel: ConversationLevel.ESTRATEGICO,
        isProactive: false,
        context: { error: true, originalError: error?.message || 'Erro desconhecido' }
      };
      
      // Gera áudio para a mensagem de erro
      errorMessage.audioUrl = await this.generateAudioWithFallback(errorMessage.text);
      
      // Adiciona ao histórico
      this.recentMessages.push(errorMessage);
      
      // Notifica os assinantes
      this.notifySubscribers(errorMessage);
      
      return errorMessage;
    }
  }
  
  /**
   * Gera áudio para texto com sistema de fallback integrado e robusta recuperação de falhas
   * Implementa múltiplos níveis de fallback para garantir a continuidade do serviço de voz
   */
  private async generateAudioWithFallback(text: string): Promise<string> {
    // Configurações do sistema de fallback
    const MAX_RETRIES = 2;
    const DELAY_BETWEEN_RETRIES_MS = 1500;
    const FALLBACK_PROVIDERS = ['elevenlabs', 'openai', 'local']; // Ordem de prioridade
    
    let audioUrl = '';
    let lastError = null;
    let successfulProvider = null;
    
    console.log(`[VoiceAssistant] Iniciando geração de áudio para texto de ${text.length} caracteres`);
    
    // Para cada provedor na ordem de prioridade
    for (const provider of FALLBACK_PROVIDERS) {
      // Pula provedor se a URL do áudio já foi gerada
      if (audioUrl) break;
      
      console.log(`[VoiceAssistant] Tentando provedor: ${provider}`);
      
      // Para cada tentativa
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          // ElevenLabs: primeiro provedor (alta qualidade)
          if (provider === 'elevenlabs') {
            // Sanitiza o texto para melhor pronúncia
            const sanitizedText = this.sanitizeTextForSpeech(text);
            
            const result = await generateSpeechWithElevenLabs(sanitizedText, {
              voiceType: this.config.voiceType as any,
              stability: 0.75,
              similarity: 0.75,
              useCache: true // Usa cache para evitar gerações repetitivas
            });
            
            if (result && result.audioUrl) {
              console.log(`[VoiceAssistant] Áudio gerado com sucesso usando ${provider} (tentativa ${attempt + 1})`);
              audioUrl = result.audioUrl;
              successfulProvider = provider;
              break;
            }
          } 
          // OpenAI: segundo provedor (fallback principal)
          else if (provider === 'openai') {
            try {
              const { generateSpeech } = await import('../openai');
              if (generateSpeech) {
                // Sanitiza o texto para melhor pronúncia
                const sanitizedText = this.sanitizeTextForSpeech(text);
                
                const result = await generateSpeech(sanitizedText);
                if (result && result.audioUrl) {
                  console.log(`[VoiceAssistant] Áudio gerado com sucesso usando ${provider} (tentativa ${attempt + 1})`);
                  audioUrl = result.audioUrl;
                  successfulProvider = provider;
                  break;
                }
              }
            } catch (openaiError) {
              console.error(`[VoiceAssistant] Erro ao usar OpenAI como fallback:`, openaiError);
              lastError = openaiError;
              
              // Aguarda antes de tentar novamente
              if (attempt < MAX_RETRIES - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RETRIES_MS));
              }
              continue;
            }
          }
          // Local: terceiro provedor (fallback de último recurso - gera áudio via API Web Speech do navegador)
          else if (provider === 'local') {
            try {
              // Gera um identificador único para o arquivo
              const timestamp = new Date().getTime();
              const fileName = `tts_fallback_${timestamp}.txt`;
              
              // Armazena o texto em um arquivo para ser lido pelo front-end
              const fs = (await import('fs')).default;
              const path = (await import('path')).default;
              
              // Garante que o diretório exista
              const dirPath = './public/audio/fallback';
              if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
              }
              
              // Cria o arquivo com o texto
              const filePath = path.join(dirPath, fileName);
              fs.writeFileSync(filePath, text);
              
              // Retorna URL para o arquivo de texto
              const fallbackUrl = `/audio/fallback/${fileName}`;
              console.log(`[VoiceAssistant] Criado fallback local em ${fallbackUrl}`);
              
              // Este URL especial será interceptado pelo front-end para gerar o áudio localmente
              audioUrl = `local://${fallbackUrl}`;
              successfulProvider = 'local';
              break;
            } catch (localError) {
              console.error(`[VoiceAssistant] Erro ao criar fallback local:`, localError);
              lastError = localError;
            }
          }
        } catch (error) {
          console.error(`[VoiceAssistant] Erro ao gerar áudio com ${provider} (tentativa ${attempt + 1}):`, error);
          lastError = error;
          
          // Aguarda antes de tentar novamente
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RETRIES_MS));
          }
        }
      }
    }
    
    // Se todos os provedores falharam
    if (!audioUrl) {
      console.error('[VoiceAssistant] Todos os provedores de áudio falharam:', lastError);
      
      // Notifica sistema sobre falha persistente
      try {
        const diagnostico = {
          id: uuidv4(),
          tipo: 'sistema',
          descricao: 'Falha persistente na síntese de voz',
          severidade: 'erro',
          timestamp: new Date().toISOString(),
          detalhes: {
            texto: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            provedoresTentados: FALLBACK_PROVIDERS,
            erro: lastError && typeof lastError === 'object' ? 
              (lastError as any).message || JSON.stringify(lastError) : 
              'Erro desconhecido'
          },
          sugestoes: [
            'Verificar credenciais das APIs de TTS',
            'Verificar conectividade de rede',
            'Considerar implementar sistema de cache local para respostas comuns'
          ]
        };
        
        // Usando Axios para enviar o diagnóstico para a API
        const axios = (await import('axios')).default;
        await axios.post('http://localhost:5000/api/python/diagnosticos', diagnostico);
      } catch (diagError) {
        console.error('[VoiceAssistant] Erro ao criar diagnóstico para falha de voz:', diagError);
      }
      
      // Cria marcador silencioso como último recurso
      audioUrl = '/audio/silent-marker.mp3';
    }
    
    // Se o provedor usado não foi o primeiro da lista, registra sugestão para investigar
    if (successfulProvider && successfulProvider !== FALLBACK_PROVIDERS[0]) {
      try {
        const sugestao = {
          id: uuidv4(),
          tipo: 'otimizacao',
          titulo: `Investigar problema com provedor de voz ${FALLBACK_PROVIDERS[0]}`,
          descricao: `O sistema precisou usar ${successfulProvider} como fallback para síntese de voz. Verificar configurações e disponibilidade do provedor principal.`,
          prioridade: 'média',
          implementada: false,
          timestamp: new Date().toISOString()
        };
        
        // Usando Axios para enviar a sugestão para a API
        const axios = (await import('axios')).default;
        await axios.post('http://localhost:5000/api/python/sugestoes', sugestao)
          .catch(err => console.error('[VoiceAssistant] Erro ao registrar sugestão:', err));
      } catch (sugError) {
        console.error('[VoiceAssistant] Erro ao criar sugestão para problema de voz:', sugError);
      }
    }
    
    return audioUrl;
  }
  
  /**
   * Sanitiza texto para melhor pronúncia em sistemas TTS
   * @param text Texto original
   * @returns Texto otimizado para síntese de voz
   */
  private sanitizeTextForSpeech(text: string): string {
    if (!text) return '';
    
    let sanitized = text;
    
    // Expande abreviações comuns
    const abbrevMap: Record<string, string> = {
      'Sr.': 'Senhor',
      'Sra.': 'Senhora',
      'Dr.': 'Doutor',
      'Dra.': 'Doutora',
      'Prof.': 'Professor',
      'Profa.': 'Professora',
      'min.': 'minutos',
      'seg.': 'segundos',
      'tel.': 'telefone',
      'pág.': 'página',
      'núm.': 'número',
      'etc.': 'et cetera',
      'vs.': 'versus',
    };
    
    // Aplica substituições de abreviações
    Object.entries(abbrevMap).forEach(([abbrev, expanded]) => {
      const regex = new RegExp(`\\b${abbrev.replace('.', '\\.')}\\b`, 'g');
      sanitized = sanitized.replace(regex, expanded);
    });
    
    // Função local para obter nome do mês
    const getMonthName = (monthNumber: number): string => {
      const months = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
      ];
      
      // Ajusta para o índice do array (0-11)
      const index = (monthNumber - 1) % 12;
      return months[index < 0 ? 0 : index];
    };
    
    // Ajusta números e símbolos
    sanitized = sanitized
      // Adiciona espaços após pontuação se não existirem
      .replace(/([.!?;:,])([^\s])/g, '$1 $2')
      // Converte datas no formato DD/MM/YYYY para formato verbal
      .replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, (match, day, month, year) => {
        return `${day} de ${getMonthName(parseInt(month))} de ${year}`;
      })
      // Adiciona pausa após frases longas para melhorar o ritmo
      .replace(/([^.!?;]{40,}[.!?;])/g, '$1 <break time="300ms"/>')
      // Trata URLs de forma especial
      .replace(/https?:\/\/\S+/g, url => 'o link fornecido');
    
    return sanitized;
  }

  /**
   * Envia uma mensagem proativa sem solicitação do usuário
   */
  public async sendProactiveMessage(text: string, level: ConversationLevel, context?: any): Promise<VoiceMessage> {
    try {
      console.log(`[VoiceAssistant] Enviando mensagem proativa: ${text}`);
      
      // Cria a mensagem
      const message: VoiceMessage = {
        id: uuidv4(),
        text,
        audioUrl: '',
        timestamp: new Date().toISOString(),
        direction: 'outgoing',
        conversationLevel: level,
        isProactive: true,
        context
      };
      
      // Gera áudio para a mensagem usando o sistema de fallback
      message.audioUrl = await this.generateAudioWithFallback(text);
      
      // Adiciona ao histórico
      this.recentMessages.push(message);
      
      // Registra a interação no perfil
      try {
        await luizCore.addInteraction({
          tipo: 'proativo_voz',
          conteudo: text,
          agente: 'jarvis',
          contexto: context
        });
      } catch (historyError) {
        console.error('[VoiceAssistant] Erro ao registrar interação proativa no histórico:', historyError);
        // Continua mesmo se falhar o registro no histórico
      }
      
      // Notifica os assinantes
      this.notifySubscribers(message);
      
      // Atualiza status de conversa ativa
      this.conversationActive = true;
      this.lastInteractionTime = new Date();
      
      return message;
    } catch (error) {
      console.error('[VoiceAssistant] Erro ao enviar mensagem proativa:', error);
      
      // Notifica sistema sobre falha
      try {
        const diagnostico = {
          tipo: 'sistema',
          descricao: 'Falha ao enviar mensagem proativa',
          severidade: 'aviso',
          detalhes: {
            texto: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            nivel: level,
            erro: error instanceof Error ? error.message : String(error)
          }
        };
        
        const axios = (await import('axios')).default;
        await axios.post('http://localhost:5000/api/python/diagnosticos', diagnostico);
      } catch (diagError) {
        console.error('[VoiceAssistant] Erro ao criar diagnóstico para falha proativa:', diagError);
      }
      
      throw error;
    }
  }

  /**
   * Determina o nível de conversa com base no estado atual
   */
  private determineConversationLevel(): ConversationLevel {
    const profile = luizCore.getProfile();
    const state = profile.estadoAtual;
    
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
   * Obtém as mensagens recentes
   */
  public getRecentMessages(limit: number = 10): VoiceMessage[] {
    return this.recentMessages.slice(-limit);
  }

  /**
   * Inscreve-se para receber novas mensagens
   */
  public subscribe(id: string, callback: (message: VoiceMessage) => void): void {
    this.subscribers.set(id, callback);
  }

  /**
   * Cancela a inscrição para mensagens
   */
  public unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Notifica todos os assinantes sobre nova mensagem
   */
  private notifySubscribers(message: VoiceMessage): void {
    this.subscribers.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[VoiceAssistant] Erro ao notificar assinante:', error);
      }
    });
  }

  /**
   * Inicia chamada espontânea baseada em eventos do sistema
   */
  public async initiateSpontaneousCall(
    trigger: 'opportunity' | 'alert' | 'reminder' | 'news',
    data: any
  ): Promise<VoiceMessage | null> {
    try {
      // Verifica configurações de notificação
      if (!this.config.proactiveMode) return null;
      
      // Verifica regras específicas por tipo de trigger
      if (trigger === 'opportunity' && !this.config.notifyOpportunities) return null;
      if (trigger === 'news' && !this.config.notifyNews) return null;
      
      // Determina nível de conversa apropriado para o trigger
      let level = ConversationLevel.ESTRATEGICO;
      let message = '';
      
      switch (trigger) {
        case 'opportunity':
          message = `Identifiquei uma oportunidade que pode ser do seu interesse: ${data.title || 'Nova oportunidade'}`;
          break;
        case 'alert':
          message = `Atenção: ${data.message || 'Um alerta importante foi detectado'}`;
          level = ConversationLevel.ESTRATEGICO;
          break;
        case 'reminder':
          message = `Lembrete: ${data.message || 'Você tem um compromisso agendado'}`;
          break;
        case 'news':
          message = `Notícia relevante: ${data.title || 'Uma notícia importante foi publicada'}`;
          break;
      }
      
      return await this.sendProactiveMessage(message, level, { trigger, data });
    } catch (error) {
      console.error('[VoiceAssistant] Erro ao iniciar chamada espontânea:', error);
      return null;
    }
  }

  /**
   * Obtém o status atual da conversa
   */
  public getConversationStatus(): any {
    return {
      active: this.conversationActive,
      lastInteraction: this.lastInteractionTime.toISOString(),
      messagesCount: this.recentMessages.length,
      currentLevel: this.determineConversationLevel()
    };
  }
}

// Exporta a instância singleton
export const voiceAssistant = VoiceAssistant.getInstance();