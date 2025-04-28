import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { logger } from './services/logging-service';
import { cacheManager } from './services/cache-manager';
import { executeWithTimeout } from './utils/api-utils';

// Cache para respostas do OpenAI
const openaiCache = cacheManager.getCache<{
  message: string;
  model: string;
  role: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  timestamp: number;
}>('openai', 100); // Limite de 100 itens no cache

// Cache para arquivos de áudio
const speechCache = cacheManager.getCache<{
  audioUrl: string;
  text: string;
  timestamp: number;
}>('openai-speech', 50); // Limite de 50 itens no cache

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export enum OpenAIModel {
  GPT4O = "gpt-4o",
  GPT4_TURBO = "gpt-4-turbo",
  GPT4_VISION = "gpt-4-vision-preview",
  GPT35_TURBO = "gpt-3.5-turbo",
}

// Modelo padrão
const DEFAULT_MODEL = OpenAIModel.GPT4O;

// Cria o cliente
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || undefined
});

// Opções para geração de texto
export interface OpenAIOptions {
  model?: OpenAIModel | string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: "text" | "json_object";
  timeout?: number; // Em milissegundos
  cache?: boolean; // Se deve usar cache
  cacheTtlMinutes?: number; // Tempo de vida do cache em minutos
}

/**
 * Verifica se o cliente OpenAI está disponível
 */
export function isOpenAIAvailable(): boolean {
  const hasKey = !!process.env.OPENAI_API_KEY;
  if (!hasKey) {
    logger.warn('OpenAIClient', 'API key do OpenAI não está configurada');
  }
  return hasKey;
}

/**
 * Gera uma chave única para cache com base no prompt e opções
 */
function generateCacheKey(prompt: string, options: OpenAIOptions = {}): string {
  const relevantOptions = {
    model: options.model || DEFAULT_MODEL,
    systemPrompt: options.systemPrompt,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
    responseFormat: options.responseFormat
  };
  
  return `${prompt}__${JSON.stringify(relevantOptions)}`;
}

/**
 * Cliente OpenAI para o sistema multi-agente
 */
export const openaiClient = {
  chat: {
    completions: {
      create: async (params: any) => {
        if (!isOpenAIAvailable() && !params.model.includes("gpt-3.5")) {
          const error = new Error('Cliente OpenAI não configurado adequadamente. Defina OPENAI_API_KEY.');
          logger.error('OpenAIClient', 'Tentativa de acessar cliente não configurado', { error });
          throw error;
        }
        
        const startTime = Date.now();
        logger.debug('OpenAIClient', 'Iniciando chat.completions.create', {
          model: params.model,
          maxTokens: params.max_tokens
        });
        
        try {
          // Executa com timeout
          const timeout = params.timeout || 60000; // 60 segundos padrão
          const response = await executeWithTimeout(
            () => openai.chat.completions.create(params),
            timeout,
            `OpenAI chat.completions.create (${params.model})`
          );
          
          const responseTime = Date.now() - startTime;
          logger.info('OpenAIClient', `Resposta recebida em ${responseTime}ms`, {
            model: params.model,
            responseTime,
            tokens: response.usage?.total_tokens
          });
          
          return response;
        } catch (error) {
          const errorTime = Date.now() - startTime;
          logger.error('OpenAIClient', `Erro na requisição após ${errorTime}ms`, {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            model: params.model
          });
          throw error;
        }
      }
    }
  },
  audio: {
    speech: {
      create: async (params: any) => {
        if (!isOpenAIAvailable()) {
          const error = new Error('Cliente OpenAI não configurado adequadamente. Defina OPENAI_API_KEY.');
          logger.error('OpenAIClient', 'Tentativa de acessar cliente de fala não configurado', { error });
          throw error;
        }
        
        const startTime = Date.now();
        logger.debug('OpenAIClient', 'Iniciando audio.speech.create', {
          model: params.model,
          voice: params.voice,
          inputLength: params.input.length
        });
        
        try {
          // Executa com timeout (2 minutos para áudio, que pode demorar mais)
          const response = await executeWithTimeout(
            () => openai.audio.speech.create(params),
            120000,
            `OpenAI audio.speech.create (${params.model})`
          );
          
          const responseTime = Date.now() - startTime;
          logger.info('OpenAIClient', `Áudio gerado em ${responseTime}ms`, {
            model: params.model,
            voice: params.voice,
            inputLength: params.input.length
          });
          
          return response;
        } catch (error) {
          const errorTime = Date.now() - startTime;
          logger.error('OpenAIClient', `Erro ao gerar áudio após ${errorTime}ms`, {
            error: error instanceof Error ? error.message : 'Erro desconhecido',
            model: params.model,
            voice: params.voice
          });
          throw error;
        }
      }
    }
  },
  // Adiciona método wrapper para generateChatResponse para compatibilidade com agentes
  generateChatResponse: async (message: string, options: ChatRequestOptions) => {
    return generateChatResponse(message, options);
  }
};

// Diretório para armazenar arquivos de áudio gerados
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

// Certificar-se de que o diretório existe
try {
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
    console.log(`Diretório de áudio criado em ${AUDIO_DIR}`);
  }
} catch (error) {
  console.error('Erro ao criar diretório de áudio:', error);
}

export interface ChatRequestOptions {
  userId: number;
  systemPrompt?: string;
  messageContext?: string;
  // Opções adicionadas para suportar cache e controle de timeout
  model?: OpenAIModel | string;
  maxTokens?: number;
  temperature?: number;
  cache?: boolean;
  cacheTtlMinutes?: number;
  timeout?: number;
}

export async function generateChatResponse(message: string, options: ChatRequestOptions) {
  const startTime = Date.now();
  const useCache = options.cache !== false; // Por padrão, usa cache
  const model = options.model || DEFAULT_MODEL;
  
  // Default system prompt for our assistant
  const defaultSystemPrompt = `Você é um assistente de IA profissional focado em negócios de transporte e agricultura.
  Você fornece informações úteis, precisas e concisas para auxiliar na tomada de decisões empresariais.
  Sua experiência inclui logística, gerenciamento de frota, práticas agrícolas, equipamentos, soluções financeiras para empresas,
  opções de crédito e tendências de mercado para os setores de transporte e agricultura.
  Sempre mantenha um tom profissional e amigável.
  
  Responda sempre em português do Brasil.
  
  O usuário é ${options.messageContext || "um empresário dos setores de transporte e agricultura"}.`;

  const systemPrompt = options.systemPrompt || defaultSystemPrompt;
  
  // Gera chave de cache
  const cacheKey = `chat_${options.userId}_${createHash('md5').update(message + systemPrompt).digest('hex')}`;

  logger.debug('OpenAIClient', `Iniciando geração de resposta de chat: "${message.substring(0, 50)}..."`, {
    model,
    userId: options.userId,
    useCache
  });

  // Verificar cache se estiver habilitado
  if (useCache) {
    const cachedResponse = openaiCache.get(cacheKey);
    
    if (cachedResponse) {
      // Verificar idade do cache (padrão: 120 minutos para chat)
      const cacheTtl = options.cacheTtlMinutes || 120;
      const cacheAgeMinutes = (Date.now() - cachedResponse.timestamp) / (1000 * 60);
      
      if (cacheAgeMinutes < cacheTtl) {
        logger.info('OpenAIClient', `Usando resposta em cache para chat: "${message.substring(0, 30)}..."`, {
          cacheAge: `${Math.round(cacheAgeMinutes)} minutos`,
          model: cachedResponse.model,
          userId: options.userId
        });
        
        return {
          message: cachedResponse.message,
          model: cachedResponse.model,
          role: cachedResponse.role,
          fromCache: true
        };
      } else {
        logger.debug('OpenAIClient', 'Cache de chat expirado, gerando nova resposta');
      }
    }
  }

  try {
    // Executa com timeout
    const timeout = options.timeout || 60000; // 60 segundos padrão
    
    const response = await executeWithTimeout(
      () => openai.chat.completions.create({
        model: model.toString(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens
      }),
      timeout,
      `OpenAI chat response (${model})`
    );

    // Garantimos que o conteúdo nunca será nulo
    const content = response.choices[0].message.content || '';
    
    // Adicionar ao cache se habilitado
    const result = {
      message: content,
      model: model.toString(),
      role: "assistant",
      usage: response.usage,
      timestamp: Date.now()
    };
    
    if (useCache) {
      openaiCache.set(cacheKey, result);
    }
    
    // Calcula e registra o tempo de resposta
    const responseTime = Date.now() - startTime;
    logger.info('OpenAIClient', `Resposta de chat gerada em ${responseTime}ms`, {
      model,
      userId: options.userId,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      promptLength: message.length
    });
    
    return {
      message: content,
      model: model.toString(),
      role: "assistant"
    };
  } catch (error) {
    // Calcula tempo até o erro
    const errorTime = Date.now() - startTime;
    
    logger.error('OpenAIClient', `Erro ao gerar resposta de chat após ${errorTime}ms: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { 
      error: error instanceof Error ? error.stack : error,
      model,
      userId: options.userId
    });
    
    throw new Error(`Falha ao gerar resposta de IA: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Por favor, tente novamente mais tarde.`);
  }
}

export async function generateBusinessSuggestions(businessType: string, userContext?: string) {
  try {
    const prompt = `Gere 3 sugestões estratégicas de negócios para um proprietário de ${businessType}. 
    ${userContext ? `Contexto sobre o negócio: ${userContext}` : ""}
    
    Para cada sugestão, inclua:
    1. Um título claro e específico
    2. Uma descrição curta explicando os benefícios e implementação
    3. 2-3 tags/categorias relevantes
    4. Qual ícone melhor representaria isso (use a nomenclatura do Remix Icon, ex: ri-truck-line)
    5. Uma categoria de cor adequada (primary, secondary, accent, etc.)
    
    Formate a resposta como um array JSON com objetos contendo os campos title, description, tags, icon e color.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Você é um consultor de negócios especializado em fornecer sugestões práticas para empresas de transporte e agricultura. Responda sempre em português do Brasil."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    if (!content || content === '{}') {
      throw new Error("Resposta vazia da API");
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating business suggestions:", error);
    throw new Error("Falha ao gerar sugestões de negócios. Por favor, tente novamente mais tarde.");
  }
}

export async function analyzeMetaAdRelevance(adContent: string, businessContext: string) {
  try {
    const prompt = `Analise o seguinte conteúdo de anúncio e determine sua relevância para este negócio:
    
    Conteúdo do Anúncio: ${adContent}
    
    Contexto do Negócio: ${businessContext}
    
    Forneça uma pontuação de relevância de 1 a 10 e uma breve explicação de por que este anúncio pode ser relevante ou não para o negócio.
    Formate sua resposta como JSON com os campos 'score' e 'explanation'.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Você é uma IA especializada em analisar a relevância de publicidade para empresas. Responda sempre em português do Brasil."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    // Verificação para garantir que não temos null
    if (!content || content === '{}') {
      throw new Error("Resposta vazia da API");
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error analyzing ad relevance:", error);
    throw new Error("Falha ao analisar a relevância do anúncio. Por favor, tente novamente mais tarde.");
  }
}

export async function summarizeBusinessNews(newsText: string, businessType: string) {
  try {
    const prompt = `Resuma o seguinte artigo de notícias e explique seu potencial impacto em um negócio de ${businessType}:
    
    "${newsText}"
    
    Forneça um resumo conciso e análise de relevância em formato JSON com os campos 'summary' e 'relevance'.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Você é uma IA especializada em analisar notícias de negócios e identificar impactos relevantes. Responda sempre em português do Brasil."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    // Verificação para garantir que não temos null
    if (!content || content === '{}') {
      throw new Error("Resposta vazia da API");
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error summarizing news:", error);
    throw new Error("Falha ao resumir o artigo de notícias. Por favor, tente novamente mais tarde.");
  }
}

// Nova função para gerar notícias atualizadas usando o conhecimento do modelo
export async function generateLatestNews(category?: string) {
  try {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    let categoryPrompt = "";
    if (category === "farm") {
      categoryPrompt = "agricultura, agronegócio, fazendas e produção rural";
    } else if (category === "transport") {
      categoryPrompt = "transporte, logística, caminhões e fretes";
    } else if (category === "finance") {
      categoryPrompt = "finanças, crédito rural, investimentos e economia";
    } else {
      categoryPrompt = "negócios rurais, transporte, logística, e agronegócio";
    }

    const prompt = `Gere 3 notícias recentes e relevantes (considere que estamos em ${month}/${year}) sobre ${categoryPrompt}. Estas notícias devem ser realistas, atuais e relevantes para empresários brasileiros do setor.

    Para cada notícia, inclua:
    1. Um título informativo e atual
    2. Um breve resumo (máximo 2 linhas)
    3. Uma fonte plausível (nome de jornal ou portal de notícias brasileiro)
    4. A categoria principal (farm, transport, finance ou general)
    5. Uma URL fictícia mas plausível
    
    Formate a resposta como JSON com um array de objetos contendo 'title', 'summary', 'source', 'category', 'url' e 'publishedAt' (para publishedAt use uma data recente em timestamp ISO).`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Você é um especialista em criar notícias atualizadas e relevantes sobre negócios, focando especialmente em agricultura e transporte no Brasil. Suas notícias devem parecer reais e atuais para 2025, com fontes plausíveis. Responda sempre em português do Brasil."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    if (!content || content === '{}') {
      throw new Error("Resposta vazia da API");
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating latest news:", error);
    throw new Error("Falha ao gerar notícias atualizadas. Por favor, tente novamente mais tarde.");
  }
}

/**
 * Gera áudio natural a partir de texto usando a API TTS da OpenAI
 * @param text Texto a ser convertido em áudio
 * @returns URL para o arquivo de áudio gerado
 */
export async function generateSpeech(text: string, options: {
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  model?: 'tts-1' | 'tts-1-hd';
  speed?: number;
  timeout?: number;
} = {}): Promise<{ audioUrl: string; fromCache?: boolean }> {
  const startTime = Date.now();
  
  // Define valores padrão
  const voice = options.voice || 'nova'; // Nova é a mais natural e feminina
  const model = options.model || 'tts-1-hd'; // HD para maior qualidade
  const speed = options.speed || 1.0;
  const timeout = options.timeout || 120000; // 2 minutos por padrão
  
  try {
    // Verifica se o cliente está disponível
    if (!isOpenAIAvailable()) {
      logger.error('OpenAIClient', 'Tentativa de gerar áudio sem API key configurada');
      throw new Error('Cliente OpenAI não configurado. Defina OPENAI_API_KEY.');
    }
    
    // Gera um hash do texto e parâmetros para usar como nome do arquivo (para cache)
    const hashInput = `${text}_${voice}_${model}_${speed}`;
    const hash = createHash('md5').update(hashInput).digest('hex');
    const fileName = `${hash}.mp3`;
    const filePath = path.join(AUDIO_DIR, fileName);
    const publicUrl = `/audio/${fileName}`;
    
    // Verifica o cache em memória
    const cacheKey = `speech_${hash}`;
    const cachedSpeech = speechCache.get(cacheKey);
    
    if (cachedSpeech) {
      logger.info('OpenAIClient', 'Usando áudio em cache', {
        textLength: text.length,
        cacheAge: `${Math.round((Date.now() - cachedSpeech.timestamp) / (1000 * 60))} minutos`
      });
      return { audioUrl: cachedSpeech.audioUrl, fromCache: true };
    }
    
    // Verifica se já existe um arquivo para este texto no sistema de arquivos
    if (fs.existsSync(filePath)) {
      logger.info('OpenAIClient', 'Arquivo de áudio encontrado em cache no sistema de arquivos', {
        filePath,
        textLength: text.length
      });
      
      // Adiciona ao cache em memória
      speechCache.set(cacheKey, {
        audioUrl: publicUrl,
        text,
        timestamp: Date.now()
      });
      
      return { audioUrl: publicUrl, fromCache: true };
    }

    logger.debug('OpenAIClient', 'Gerando novo áudio', {
      textLength: text.length,
      voice,
      model
    });

    // Sanitiza o texto para garantir melhor pronúncia
    const sanitizedText = sanitizeTextForSpeech(text);
    
    // Gera o áudio usando a API da OpenAI com timeout
    const mp3 = await executeWithTimeout(
      async () => openai.audio.speech.create({
        model,
        voice,
        input: sanitizedText,
        speed,
        response_format: "mp3",
      }),
      timeout,
      'OpenAI speech generation'
    );

    // Converte a resposta para buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    
    // Salva o arquivo de áudio
    fs.writeFileSync(filePath, buffer);
    
    // Adiciona ao cache em memória
    speechCache.set(cacheKey, {
      audioUrl: publicUrl,
      text,
      timestamp: Date.now()
    });
    
    const responseTime = Date.now() - startTime;
    logger.info('OpenAIClient', `Áudio gerado e salvo em ${responseTime}ms`, {
      filePath,
      textLength: text.length,
      audioSize: buffer.length,
      voice,
      model
    });
    
    return { audioUrl: publicUrl };
  } catch (error) {
    const errorTime = Date.now() - startTime;
    
    logger.error('OpenAIClient', `Erro ao gerar áudio após ${errorTime}ms:`, {
      error: error instanceof Error ? error.message : 'Erro desconhecido', 
      textLength: text.length,
      voice,
      model
    });
    
    throw new Error(`Falha ao gerar áudio: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Por favor, tente novamente mais tarde.`);
  }
}

/**
 * Prepara o texto para síntese de voz
 * @param text Texto a ser sanitizado
 * @returns Texto preparado para melhor pronúncia
 */
function sanitizeTextForSpeech(text: string): string {
  // Remove caracteres especiais excessivos que não são letras, números, pontuação ou espaços
  let cleanText = text.replace(/[^a-zA-ZáàâãéèêíìóòôõúùûçÁÀÂÃÉÈÊÍÌÓÒÔÕÚÙÛÇ0-9.,;:!?()[\]{}""''`´\s-]/g, '');
  
  // Substitui abreviações comuns para melhorar a pronúncia
  const abbreviations: Record<string, string> = {
    'Dr.': 'Doutor',
    'Sr.': 'Senhor',
    'Sra.': 'Senhora',
    'Prof.': 'Professor',
    'R$': 'reais',
    '%': 'por cento',
    'Km': 'quilômetros',
    'Kg': 'quilos',
    'Nº': 'número',
    'nº': 'número',
    // Adicionar outras abreviações conforme necessário
  };
  
  // Substitui as abreviações
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    cleanText = cleanText.replace(regex, full);
  });
  
  // Adiciona pausas com pontuação para melhorar o ritmo da fala
  cleanText = cleanText.replace(/[.!?]\s+/g, match => match + ' ');
  
  // Melhora a pronúncia de siglas lendo letra por letra
  cleanText = cleanText.replace(/\b[A-Z]{2,}\b/g, match => {
    // Adiciona espaços entre as letras para que sejam pronunciadas separadamente
    return match.split('').join('. ') + '.';
  });
  
  return cleanText;
}
