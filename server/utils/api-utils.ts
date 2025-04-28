/**
 * Utilitários para lidar com chamadas de API externas
 * Fornece funções para gerenciar timeouts, retentativas e tratamento de erros
 */

import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger } from '../services/logging-service';

// Configuração para retentativas
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  exponentialBackoff: boolean;
  retryStatusCodes: number[];
}

// Configuração padrão para retentativas
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  exponentialBackoff: true,
  retryStatusCodes: [408, 429, 500, 502, 503, 504]
};

/**
 * Calcula o tempo de espera para a próxima tentativa
 * @param attempt Número da tentativa atual
 * @param config Configuração de retentativa
 * @returns Tempo de espera em ms
 */
function calculateBackoff(attempt: number, config: RetryConfig): number {
  if (config.exponentialBackoff) {
    // Backoff exponencial com jitter para evitar tempestade de requisições
    const exponentialDelay = config.initialDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 + 0.85; // 85% a 115% do valor base
    return Math.min(exponentialDelay * jitter, config.maxDelayMs);
  } else {
    // Backoff linear
    return Math.min(config.initialDelayMs * attempt, config.maxDelayMs);
  }
}

/**
 * Verifica se um erro deve ter retentativa
 * @param error Erro da requisição
 * @param config Configuração de retentativa
 * @returns true se deve tentar novamente
 */
function shouldRetry(error: AxiosError, config: RetryConfig): boolean {
  // Não retentar se não for um erro de rede ou resposta
  if (!error.response && !error.code) return false;
  
  // Retentar para timeouts
  if (error.code === 'ECONNABORTED') return true;
  
  // Retentar para erros de rede
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') return true;
  
  // Verificar códigos de status que devem ser retentados
  if (error.response && config.retryStatusCodes.includes(error.response.status)) {
    return true;
  }
  
  return false;
}

/**
 * Função para esperar um tempo especificado
 * @param ms Tempo em milissegundos
 * @returns Promise que resolve após o tempo especificado
 */
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executa uma requisição HTTP com timeout e retentativas configuráveis
 * @param config Configuração da requisição Axios
 * @param retryConfig Configuração de retentativas
 * @returns Promise com a resposta da requisição
 */
export async function fetchWithRetry<T = any>(
  config: AxiosRequestConfig,
  retryConfig: Partial<RetryConfig> = {}
): Promise<AxiosResponse<T>> {
  // Mescla configurações padrão com as fornecidas
  const finalRetryConfig: RetryConfig = { ...defaultRetryConfig, ...retryConfig };
  
  // Assegura que há um timeout configurado
  if (!config.timeout) {
    config.timeout = 30000; // 30 segundos padrão
  }
  
  // Nome para logging
  const requestName = config.url ? 
    `${config.method?.toUpperCase() || 'GET'} ${config.url.split('?')[0]}` : 
    'Requisição API';
  
  let attempt = 0;
  
  while (true) {
    try {
      const startTime = Date.now();
      
      if (attempt > 0) {
        logger.info('ApiUtils', `Tentativa ${attempt + 1}/${finalRetryConfig.maxRetries + 1} para ${requestName}`);
      }
      
      // Executa a requisição
      const response = await axios(config);
      
      // Calcula e registra o tempo de resposta
      const responseTime = Date.now() - startTime;
      
      if (attempt > 0) {
        logger.info('ApiUtils', `Requisição bem-sucedida na tentativa ${attempt + 1} após ${responseTime}ms`, {
          url: config.url,
          status: response.status
        });
      } else if (responseTime > 1000) {
        logger.debug('ApiUtils', `Requisição completada em ${responseTime}ms`, {
          url: config.url,
          status: response.status
        });
      }
      
      return response;
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorTime = Date.now() - (axiosError.config?.transitional as any)?.startTime || 0;
      
      // Adiciona informação de tentativa e tempo ao erro
      logger.warn('ApiUtils', `Erro na tentativa ${attempt + 1}/${finalRetryConfig.maxRetries + 1} para ${requestName}: ${axiosError.message}`, {
        url: config.url,
        status: axiosError.response?.status,
        errorTime,
        code: axiosError.code
      });
      
      // Verifica se deve retentar
      if (attempt < finalRetryConfig.maxRetries && shouldRetry(axiosError, finalRetryConfig)) {
        // Calcula o tempo de espera
        const backoffTime = calculateBackoff(attempt, finalRetryConfig);
        
        logger.info('ApiUtils', `Aguardando ${Math.round(backoffTime)}ms antes da próxima tentativa`, {
          attempt: attempt + 1,
          maxRetries: finalRetryConfig.maxRetries
        });
        
        // Aguarda o tempo calculado antes de tentar novamente
        await delay(backoffTime);
        
        // Incrementa o contador de tentativas
        attempt++;
      } else {
        // Se não deve retentar ou atingiu o limite, relança o erro
        logger.error('ApiUtils', `Falha permanente após ${attempt + 1} tentativas para ${requestName}: ${axiosError.message}`, {
          url: config.url,
          status: axiosError.response?.status,
          code: axiosError.code
        });
        
        // Formata uma mensagem de erro mais útil
        const errorDetails = axiosError.response?.data 
          ? `Detalhes: ${typeof axiosError.response.data === 'string' 
              ? axiosError.response.data 
              : JSON.stringify(axiosError.response.data).substring(0, 100)
            }` 
          : '';
        
        const enhancedError = new Error(
          `Falha na requisição [${requestName}]: ${axiosError.message}. ${
            axiosError.code === 'ECONNABORTED' 
              ? `Timeout após ${config.timeout}ms.` 
              : `Status: ${axiosError.response?.status || 'Desconhecido'}.`
          } ${errorDetails}`
        );
        
        // Preserva a stack trace original
        enhancedError.stack = axiosError.stack;
        
        throw enhancedError;
      }
    }
  }
}

/**
 * Executa uma função com limite de tempo (timeout)
 * @param fn Função a ser executada
 * @param timeoutMs Tempo máximo em milissegundos
 * @param name Nome da operação para logs
 * @returns Resultado da função
 */
export async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  name: string = 'Operação'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const startTime = Date.now();
    
    // Cria o timeout
    const timeoutId = setTimeout(() => {
      const elapsedTime = Date.now() - startTime;
      logger.error('ApiUtils', `Timeout de ${timeoutMs}ms excedido para ${name} após ${elapsedTime}ms`);
      reject(new Error(`Timeout de ${timeoutMs}ms excedido para ${name}`));
    }, timeoutMs);
    
    // Executa a função
    fn()
      .then(result => {
        clearTimeout(timeoutId);
        const elapsedTime = Date.now() - startTime;
        
        if (elapsedTime > 1000) {
          logger.debug('ApiUtils', `${name} completada em ${elapsedTime}ms`);
        }
        
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        const elapsedTime = Date.now() - startTime;
        
        logger.error('ApiUtils', `Erro em ${name} após ${elapsedTime}ms: ${error.message}`, { 
          error: error.stack || error.message 
        });
        
        reject(error);
      });
  });
}

/**
 * Verifica disponibilidade de um serviço externo
 * @param url URL do serviço a ser verificada
 * @param options Opções adicionais
 * @returns Status da disponibilidade
 */
export async function checkServiceAvailability(
  url: string,
  options: {
    timeoutMs?: number;
    acceptableCodes?: number[];
    headers?: Record<string, string>;
    method?: 'GET' | 'POST' | 'HEAD';
  } = {}
): Promise<{
  available: boolean;
  responseTimeMs: number;
  status?: number;
  error?: string;
}> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs || 5000;
  const acceptableCodes = options.acceptableCodes || [200, 201, 202, 204, 301, 302, 307, 308];
  const method = options.method || 'HEAD';
  
  try {
    const response = await axios({
      url,
      method,
      timeout: timeoutMs,
      headers: options.headers,
      validateStatus: () => true // Não rejeitar em nenhum status HTTP
    });
    
    const responseTime = Date.now() - startTime;
    const available = acceptableCodes.includes(response.status);
    
    logger.info('ApiUtils', `Verificação de disponibilidade para ${url}: ${available ? 'Disponível' : 'Indisponível'} (${response.status}) em ${responseTime}ms`);
    
    return {
      available,
      responseTimeMs: responseTime,
      status: response.status
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const axiosError = error as AxiosError;
    
    logger.warn('ApiUtils', `Erro ao verificar disponibilidade de ${url}: ${axiosError.message}`, {
      responseTime,
      code: axiosError.code
    });
    
    return {
      available: false,
      responseTimeMs: responseTime,
      error: axiosError.message
    };
  }
}