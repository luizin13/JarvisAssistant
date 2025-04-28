/**
 * Serviço para integração com a API do Perplexity
 * 
 * Este módulo fornece funções para enriquecer respostas com dados atualizados
 * da web usando a API do Perplexity, complementando as capacidades do OpenAI e Anthropic.
 */

import axios from 'axios';
import { logger } from './services/logging-service';
import { cacheManager } from './services/cache-manager';

// Cache para respostas do Perplexity
const perplexityCache = cacheManager.getCache<{
  content: string;
  citations: string[];
  tokensUsed: number;
  timestamp: number;
}>('perplexity', 200); // Limite de 200 itens no cache

// Tipo de resposta da API do Perplexity
interface PerplexityResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  citations: string[];
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Opções para consultas no Perplexity
export interface PerplexityOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  search_recency_filter?: 'day' | 'week' | 'month' | 'year' | 'none';
  return_citations?: boolean;
  return_related_questions?: boolean;
  cache_ttl_minutes?: number; // Tempo de vida do cache em minutos
  skip_cache?: boolean; // Se deve ignorar o cache
  timeout_ms?: number; // Timeout da requisição em milissegundos
}

// Modelos disponíveis no Perplexity
// Atualizado em abril de 2025
export enum PerplexityModel {
  SONAR_SMALL = 'llama-3.1-sonar-small-128k-online',
  SONAR_MEDIUM = 'llama-3.1-sonar-medium-128k-online', // Novo modelo intermediário
  SONAR_LARGE = 'llama-3.1-sonar-large-128k-online',
  SONAR_HUGE = 'llama-3.1-sonar-huge-128k-online',
  MIXTRAL = 'mixtral-8x7b-instruct', // Modelo offline para consultas que não precisam de dados online
}

/**
 * Verifica se a chave de API do Perplexity está disponível
 * @returns {boolean} Verdadeiro se a chave estiver disponível
 */
export function isPerplexityAvailable(): boolean {
  const hasKey = !!process.env.PERPLEXITY_API_KEY;
  if (!hasKey) {
    logger.warn('PerplexityService', 'API key do Perplexity não está configurada');
  }
  return hasKey;
}

/**
 * Gera uma chave única para cache com base na consulta e opções
 */
function generateCacheKey(query: string, options: PerplexityOptions): string {
  const relevantOptions = {
    model: options.model,
    temperature: options.temperature,
    system_prompt: options.system_prompt,
    search_recency_filter: options.search_recency_filter,
  };
  
  return `${query}__${JSON.stringify(relevantOptions)}`;
}

/**
 * Consulta a API do Perplexity para obter informações atualizadas
 * @param query Consulta a ser realizada
 * @param options Opções para a consulta
 * @returns Resposta com informações atualizadas e citações
 */
export async function queryPerplexity(query: string, options: PerplexityOptions = {}): Promise<{
  content: string;
  citations: string[];
  tokensUsed: number;
  fromCache?: boolean;
}> {
  const startTime = Date.now();
  const cacheKey = generateCacheKey(query, options);
  
  try {
    logger.debug('PerplexityService', `Iniciando consulta: "${query.substring(0, 50)}..."`, {
      options: {
        model: options.model,
        temperature: options.temperature,
        recency: options.search_recency_filter
      }
    });
    
    // Verificar se a API key está disponível
    if (!process.env.PERPLEXITY_API_KEY) {
      logger.error('PerplexityService', 'PERPLEXITY_API_KEY não encontrada no ambiente');
      throw new Error('PERPLEXITY_API_KEY não encontrada no ambiente');
    }
    
    // Verificar cache se não estiver explicitamente ignorando
    if (!options.skip_cache) {
      const cachedData = perplexityCache.get(cacheKey);
      
      if (cachedData) {
        // Verificar se o cache ainda é válido (padrão: 30 minutos)
        const cacheTtl = options.cache_ttl_minutes || 30;
        const cacheAgeMinutes = (Date.now() - cachedData.timestamp) / (1000 * 60);
        
        if (cacheAgeMinutes < cacheTtl) {
          logger.info('PerplexityService', `Usando resposta em cache para: "${query.substring(0, 30)}..."`, {
            cacheAge: `${Math.round(cacheAgeMinutes)} minutos`
          });
          
          return {
            ...cachedData,
            fromCache: true
          };
        } else {
          logger.debug('PerplexityService', 'Cache expirado, buscando dados atualizados');
        }
      }
    }

    // Configurações padrão
    const defaultOptions: PerplexityOptions = {
      model: PerplexityModel.SONAR_SMALL,
      temperature: 0.2,
      max_tokens: 1000,
      system_prompt: 'Você é um assistente útil especializado em fornecer informações atualizadas sobre negócios no Brasil, com foco em transportes e agricultura. Seja preciso, factual e cite suas fontes.',
      search_recency_filter: 'month',
      return_citations: true,
      return_related_questions: false,
      timeout_ms: 30000, // 30 segundos de timeout padrão
    };

    // Combina opções padrão com as fornecidas
    const mergedOptions = { ...defaultOptions, ...options };

    // Prepara os dados para a requisição
    const requestData = {
      model: mergedOptions.model,
      messages: [
        {
          role: 'system',
          content: mergedOptions.system_prompt
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: mergedOptions.temperature,
      max_tokens: mergedOptions.max_tokens,
      search_recency_filter: mergedOptions.search_recency_filter,
      return_citations: mergedOptions.return_citations,
      stream: false,
    };

    // Faz a requisição para a API com timeout configurável
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: mergedOptions.timeout_ms
      }
    );

    const data = response.data as PerplexityResponse;
    
    // Calcula tempo de resposta
    const responseTime = Date.now() - startTime;
    
    // Adiciona ao cache
    const result = {
      content: data.choices[0].message.content,
      citations: data.citations || [],
      tokensUsed: data.usage.total_tokens,
      timestamp: Date.now()
    };
    
    perplexityCache.set(cacheKey, result);
    
    logger.info('PerplexityService', `Consulta completada em ${responseTime}ms`, {
      model: data.model,
      tokensUsed: data.usage.total_tokens,
      citations: data.citations?.length || 0
    });

    // Retorna o conteúdo, citações e uso de tokens
    return result;
  } catch (error) {
    // Mede o tempo até o erro
    const errorTime = Date.now() - startTime;
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        logger.error('PerplexityService', `Timeout na consulta após ${errorTime}ms: "${query.substring(0, 30)}..."`, {
          timeout: options.timeout_ms || 30000
        });
        throw new Error(`Timeout ao consultar Perplexity após ${errorTime}ms. Por favor, tente novamente.`);
      }
      
      if (error.response) {
        logger.error('PerplexityService', `Erro da API Perplexity (${error.response.status}): ${error.response.statusText}`, {
          data: error.response.data,
          query: query.substring(0, 100)
        });
        
        // Tratamento específico para tipos comuns de erro
        switch (error.response.status) {
          case 401:
            throw new Error('Erro de autenticação na API do Perplexity. Verifique sua chave de API.');
          case 429:
            throw new Error('Limite de taxa excedido na API do Perplexity. Tente novamente mais tarde.');
          case 500:
            throw new Error('Erro interno do servidor Perplexity. Tente novamente mais tarde.');
          default:
            throw new Error(`Erro na API do Perplexity (${error.response.status}): ${error.response.statusText}`);
        }
      }
    }
    
    logger.error('PerplexityService', `Erro ao consultar Perplexity: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { 
      errorObj: error 
    });
    
    throw new Error(`Falha ao consultar Perplexity: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Obtém informações atualizadas sobre o mercado de transportes no Brasil
 * @returns Informações atualizadas sobre o mercado de transportes
 */
export async function getTransportMarketInsights(): Promise<{
  content: string;
  citations: string[];
}> {
  const query = 'Quais são as tendências e eventos recentes mais importantes no setor de transportes no Brasil? Foque em transporte rodoviário de cargas, legislação recente, inovações tecnológicas e impactos econômicos. Forneça dados sobre custos, regulamentações e tendências de mercado que um empresário do setor deveria saber.';
  
  const result = await queryPerplexity(query, {
    system_prompt: 'Você é um analista especializado no setor de transportes brasileiro. Forneça informações atualizadas, precisas e relevantes sobre o mercado de transportes no Brasil, com foco em dados que seriam úteis para um empresário do setor. Cite fontes oficiais e confiáveis.',
    search_recency_filter: 'month'
  });
  
  return {
    content: result.content,
    citations: result.citations
  };
}

// Cliente Perplexity para o sistema multi-agente
export const perplexityClient = {
  queryPerplexity: async (query: string, options: PerplexityOptions = {}): Promise<{
    content: string;
    citations?: string[];
    model: string;
  }> => {
    try {
      const result = await queryPerplexity(query, options);
      return {
        content: result.content,
        citations: result.citations,
        model: options.model || PerplexityModel.SONAR_SMALL
      };
    } catch (error) {
      console.error('Erro no cliente Perplexity:', error);
      throw error;
    }
  },
  PerplexityModel
};

/**
 * Obtém informações atualizadas sobre o agronegócio brasileiro
 * @returns Informações atualizadas sobre o agronegócio
 */
export async function getAgribusinessInsights(): Promise<{
  content: string;
  citations: string[];
}> {
  const query = 'Quais são as tendências e eventos recentes mais importantes no agronegócio brasileiro? Foque em produção agrícola, preços de commodities, tecnologias agrícolas, regulamentações e perspectivas para os próximos meses. Forneça dados sobre safras, exportações e oportunidades que um empresário do setor deveria conhecer.';
  
  const result = await queryPerplexity(query, {
    system_prompt: 'Você é um analista especializado no agronegócio brasileiro. Forneça informações atualizadas, precisas e relevantes sobre o setor agrícola no Brasil, com foco em dados que seriam úteis para um empresário do setor. Cite fontes oficiais e confiáveis.',
    search_recency_filter: 'month'
  });
  
  return {
    content: result.content,
    citations: result.citations
  };
}

/**
 * Enriquece uma resposta com informações factuais atualizadas
 * @param query Consulta original
 * @param initialResponse Resposta inicial (de outro modelo)
 * @returns Resposta enriquecida com fatos atualizados
 */
export async function enrichResponseWithFacts(query: string, initialResponse: string): Promise<{
  enhancedResponse: string;
  citations: string[];
}> {
  try {
    const systemPrompt = `Você é um assistente de análise de negócios que enriquece respostas com dados factuais verificados.
    
Você receberá uma consulta original e uma resposta inicial. Sua tarefa é:
1. Analisar a resposta inicial para identificar afirmações que precisam de verificação ou atualização
2. Adicionar dados factuais atualizados, estatísticas e contexto relevante
3. Manter o tom e estilo da resposta original, mas melhorando sua precisão e atualidade
4. Incorporar as informações de forma natural, como se fossem parte da resposta original
5. Citar fontes para os dados adicionados
    
Resposta original para enriquecer: "${initialResponse}"`;

    const result = await queryPerplexity(query, {
      system_prompt: systemPrompt,
      search_recency_filter: 'month',
      model: PerplexityModel.SONAR_LARGE
    });

    return {
      enhancedResponse: result.content,
      citations: result.citations
    };
  } catch (error) {
    console.error('Erro ao enriquecer resposta:', error);
    // Em caso de erro, retornamos a resposta original
    return {
      enhancedResponse: initialResponse,
      citations: []
    };
  }
}

/**
 * Determina qual provedor de IA (OpenAI, Anthropic ou Perplexity) deve ser usado
 * com base no tipo de consulta e contexto
 * 
 * @param query Consulta a ser analisada
 * @param context Contexto adicional sobre o usuário e situação
 * @returns Nome do provedor recomendado e justificativa
 */
export function determineOptimalProvider(
  query: string, 
  context: { 
    needsRealTimeData?: boolean; 
    businessType?: 'transport' | 'farm' | 'both';
    requiresCitations?: boolean;
    previousProvider?: string;
  }
): { provider: 'openai' | 'anthropic' | 'perplexity'; reason: string } {
  
  // Verifica se perplexity está disponível
  const perplexityAvailable = isPerplexityAvailable();
  
  // Se precisar explicitamente de dados em tempo real e Perplexity estiver disponível
  if (context.needsRealTimeData && perplexityAvailable) {
    return { 
      provider: 'perplexity', 
      reason: 'A consulta requer dados em tempo real que o Perplexity pode fornecer via busca online.' 
    };
  }
  
  // Palavras-chave que indicam necessidade de dados atualizados
  const realTimeKeywords = [
    'hoje', 'atual', 'recente', 'notícia', 'último', 'agora',
    'mercado', 'preço', 'cotação', 'taxa', 'tendência', 'semana',
    'novidade', 'atualização', 'legislação', 'regulamentação'
  ];
  
  // Verifica se a consulta contém palavras-chave de dados em tempo real
  const likelyNeedsRealTimeData = realTimeKeywords.some(keyword => 
    query.toLowerCase().includes(keyword));
  
  // Se provavelmente precisa de dados em tempo real e Perplexity está disponível
  if (likelyNeedsRealTimeData && perplexityAvailable) {
    return { 
      provider: 'perplexity', 
      reason: 'A consulta contém palavras-chave que sugerem necessidade de dados atualizados.' 
    };
  }
  
  // Para consultas relacionadas à argumentação, criatividade ou conselho
  const creativeKeywords = [
    'ideia', 'sugestão', 'criar', 'desenvolver', 'planejar',
    'estratégia', 'visão', 'criativo', 'alternativa', 'possibilidade'
  ];
  
  const needsCreativity = creativeKeywords.some(keyword => 
    query.toLowerCase().includes(keyword));
  
  if (needsCreativity) {
    return { 
      provider: 'anthropic', 
      reason: 'A consulta requer pensamento criativo ou estratégico, área onde o Claude se destaca.' 
    };
  }
  
  // Para consultas que requerem citações explícitas
  if (context.requiresCitations && perplexityAvailable) {
    return { 
      provider: 'perplexity', 
      reason: 'A consulta requer citações explícitas, que o Perplexity fornece automaticamente.' 
    };
  }
  
  // Padrão para o OpenAI se nenhum outro critério for atendido
  return { 
    provider: 'openai', 
    reason: 'Padrão para consultas gerais, devido à sua versatilidade e eficiência.' 
  };
}