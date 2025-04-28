/**
 * Cliente Anthropic para o sistema multi-agente
 * Implementa caching e gerenciamento de erro/timeout
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from './services/logging-service';
import { cacheManager } from './services/cache-manager';
import { executeWithTimeout } from './utils/api-utils';

// Cache para respostas do Anthropic
const anthropicCache = cacheManager.getCache<{
  text: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  timestamp: number;
}>('anthropic', 100); // Limite de 100 itens no cache

// o modelo mais recente da Anthropic é "claude-3-7-sonnet-20250219" que foi lançado em 24 de fevereiro de 2025
export enum AnthropicModel {
  HAIKU = 'claude-3-7-haiku-20250219',
  SONNET = 'claude-3-7-sonnet-20250219',
  OPUS = 'claude-3-7-opus-20250219',
  
  // Legacy models
  SONNET_LEGACY = 'claude-3-sonnet-20240229',
  OPUS_LEGACY = 'claude-3-opus-20240229',
  HAIKU_LEGACY = 'claude-3-haiku-20240307'
}

// Modelo padrão
const DEFAULT_MODEL = AnthropicModel.SONNET;

// Verifica se a chave API está disponível
const apiKey = process.env.ANTHROPIC_API_KEY;

// Cria o cliente apenas se a chave estiver disponível
const client = apiKey 
  ? new Anthropic({ apiKey }) 
  : null;

// Opções para a geração de resposta
export interface AnthropicOptions {
  model?: AnthropicModel;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number; 
  topK?: number;
  timeout?: number; // Em milissegundos
  cache?: boolean; // Se deve usar cache
  cacheTtlMinutes?: number; // Tempo de vida do cache em minutos
}

/**
 * Verifica se o cliente Anthropic está disponível
 */
export function isAnthropicAvailable(): boolean {
  const hasKey = !!client;
  if (!hasKey) {
    logger.warn('AnthropicClient', 'API key do Anthropic não está configurada');
  }
  return hasKey;
}

/**
 * Obtém o cliente Anthropic ou lança erro se não estiver configurado
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    const error = new Error('Cliente Anthropic não configurado. Defina ANTHROPIC_API_KEY.');
    logger.error('AnthropicClient', 'Tentativa de acessar cliente não configurado', { error });
    throw error;
  }
  return client;
}

/**
 * Gera uma chave única para cache com base no prompt e opções
 */
function generateCacheKey(prompt: string, options: AnthropicOptions = {}): string {
  const relevantOptions = {
    model: options.model || DEFAULT_MODEL,
    systemPrompt: options.systemPrompt,
    maxTokens: options.maxTokens,
    temperature: options.temperature
  };
  
  return `${prompt}__${JSON.stringify(relevantOptions)}`;
}

/**
 * Funções para usar o cliente externamente
 */
export const anthropicClient = {
  messages: {
    create: async (params: any) => {
      if (!isAnthropicAvailable()) {
        throw new Error('Cliente Anthropic não configurado. Defina ANTHROPIC_API_KEY.');
      }
      
      const startTime = Date.now();
      logger.debug('AnthropicClient', 'Iniciando requisição messages.create', {
        model: params.model,
        maxTokens: params.max_tokens
      });
      
      try {
        // Executa com timeout
        const response = await executeWithTimeout(
          () => getAnthropicClient().messages.create(params),
          params.timeout || 60000,
          'Anthropic API call'
        );
        
        const responseTime = Date.now() - startTime;
        logger.info('AnthropicClient', `Resposta do Anthropic recebida em ${responseTime}ms`, {
          model: params.model,
          responseTime
        });
        
        return response;
      } catch (error) {
        const errorTime = Date.now() - startTime;
        logger.error('AnthropicClient', `Erro na requisição ao Anthropic após ${errorTime}ms`, {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          model: params.model
        });
        throw error;
      }
    }
  },
  
  /**
   * Método wrapper para compatibilidade com o System Orchestrator
   * Aceita um objeto de opções no formato { systemPrompt } semelhante ao padrão OpenAI
   */
  generateResponse: async (prompt: string, options: AnthropicOptions = {}) => {
    return {
      text: await generateAnthropicResponse(prompt, options),
      model: options.model || DEFAULT_MODEL
    };
  }
};

/**
 * Gera resposta do Anthropic para um prompt específico
 */
export async function generateAnthropicResponse(
  prompt: string,
  options: AnthropicOptions = {}
): Promise<string> {
  const startTime = Date.now();
  const useCache = options.cache !== false; // Por padrão, usa cache
  const cacheKey = generateCacheKey(prompt, options);
  
  logger.debug('AnthropicClient', `Iniciando geração de resposta: "${prompt.substring(0, 50)}..."`, {
    model: options.model || DEFAULT_MODEL,
    maxTokens: options.maxTokens || 1000,
    useCache
  });
  
  if (!isAnthropicAvailable()) {
    logger.error('AnthropicClient', 'Tentativa de gerar resposta sem API key configurada');
    throw new Error('Cliente Anthropic não configurado. Defina ANTHROPIC_API_KEY.');
  }

  // Verificar cache se estiver habilitado
  if (useCache) {
    const cachedResponse = anthropicCache.get(cacheKey);
    
    if (cachedResponse) {
      // Verificar idade do cache (padrão: 60 minutos)
      const cacheTtl = options.cacheTtlMinutes || 60;
      const cacheAgeMinutes = (Date.now() - cachedResponse.timestamp) / (1000 * 60);
      
      if (cacheAgeMinutes < cacheTtl) {
        logger.info('AnthropicClient', `Usando resposta em cache para: "${prompt.substring(0, 30)}..."`, {
          cacheAge: `${Math.round(cacheAgeMinutes)} minutos`,
          model: cachedResponse.model
        });
        
        return cachedResponse.text;
      } else {
        logger.debug('AnthropicClient', 'Cache expirado, gerando nova resposta');
      }
    }
  }

  try {
    // Definir modelo e outros parâmetros
    const model = options.model || DEFAULT_MODEL;
    const maxTokens = options.maxTokens || 1000;
    const timeout = options.timeout || 60000; // 60 segundos por padrão
    
    // Preparar mensagens
    const messages = options.systemPrompt
      ? [
          { role: 'system', content: options.systemPrompt },
          { role: 'user', content: prompt }
        ]
      : [
          { role: 'user', content: prompt }
        ];

    // Parâmetros adicionais de configuração
    const additionalParams: Record<string, any> = {};
    
    if (options.temperature !== undefined) {
      additionalParams.temperature = options.temperature;
    }
    
    if (options.topP !== undefined) {
      additionalParams.top_p = options.topP;
    }
    
    if (options.topK !== undefined) {
      additionalParams.top_k = options.topK;
    }

    // Executa com timeout
    const response = await executeWithTimeout(
      async () => getAnthropicClient().messages.create({
        model,
        max_tokens: maxTokens,
        messages: messages as any,
        ...additionalParams
      }),
      timeout,
      `Anthropic API call (${model})`
    );

    // Extrair o texto da resposta do Anthropic
    let responseText = "Não foi possível gerar uma resposta com o Anthropic.";
    
    if (response.content && response.content.length > 0) {
      const contentBlock = response.content[0];
      if (contentBlock.type === 'text') {
        responseText = contentBlock.text;
      }
    }
    
    // Adicionar ao cache se habilitado
    if (useCache) {
      anthropicCache.set(cacheKey, {
        text: responseText,
        usage: {
          input_tokens: response.usage?.input_tokens || 0,
          output_tokens: response.usage?.output_tokens || 0
        },
        model,
        timestamp: Date.now()
      });
    }
    
    // Calcula e registra o tempo de resposta
    const responseTime = Date.now() - startTime;
    logger.info('AnthropicClient', `Resposta gerada em ${responseTime}ms`, {
      model,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      promptLength: prompt.length
    });
    
    return responseText;
  } catch (error) {
    // Calcula tempo até o erro
    const errorTime = Date.now() - startTime;
    
    logger.error('AnthropicClient', `Erro ao gerar resposta após ${errorTime}ms: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { 
      error: error instanceof Error ? error.stack : error,
      model: options.model || DEFAULT_MODEL
    });
    
    throw new Error(`Falha ao gerar resposta com Anthropic: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}