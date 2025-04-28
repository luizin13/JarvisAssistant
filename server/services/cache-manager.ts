/**
 * Gerenciador de cache com limite de tamanho para evitar vazamentos de memória
 * Implementa padrão LRU (Least Recently Used) para remover itens quando o limite é atingido
 */

import { logger } from './logging-service';

export class LimitedCache<T> {
  private cache = new Map<string, { value: T, lastAccessed: number }>();
  private maxSize: number;
  private name: string;
  
  /**
   * Cria uma nova instância de cache limitado
   * @param name Nome identificador do cache para logging
   * @param maxSize Tamanho máximo do cache (padrão: 1000 itens)
   */
  constructor(name: string, maxSize = 1000) {
    this.maxSize = maxSize;
    this.name = name;
    logger.info('CacheManager', `Cache '${name}' inicializado com limite de ${maxSize} itens`);
  }
  
  /**
   * Define um valor no cache
   * @param key Chave única para identificar o item
   * @param value Valor a ser armazenado
   */
  set(key: string, value: T): void {
    // Verifica se o cache atingiu o limite
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      // Encontra o item menos recentemente acessado
      let oldestKey = '';
      let oldestAccess = Date.now();
      
      for (const [cacheKey, item] of this.cache.entries()) {
        if (item.lastAccessed < oldestAccess) {
          oldestAccess = item.lastAccessed;
          oldestKey = cacheKey;
        }
      }
      
      // Remove o item mais antigo
      if (oldestKey) {
        this.cache.delete(oldestKey);
        logger.debug('CacheManager', `Cache '${this.name}' removeu item mais antigo: ${oldestKey}`);
      }
    }
    
    // Adiciona o novo item
    this.cache.set(key, { 
      value, 
      lastAccessed: Date.now() 
    });
  }
  
  /**
   * Obtém um valor do cache
   * @param key Chave do item
   * @returns O valor armazenado ou undefined se não encontrado
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (item) {
      // Atualiza o timestamp de acesso
      item.lastAccessed = Date.now();
      return item.value;
    }
    
    return undefined;
  }
  
  /**
   * Verifica se uma chave existe no cache
   * @param key Chave a verificar
   * @returns true se a chave existir, false caso contrário
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }
  
  /**
   * Remove um item do cache
   * @param key Chave do item a remover
   * @returns true se o item foi removido, false caso não exista
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('CacheManager', `Cache '${this.name}' foi limpo completamente`);
  }
  
  /**
   * Retorna o tamanho atual do cache
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Retorna as chaves armazenadas no cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Retorna estatísticas sobre o cache
   */
  getStats(): { name: string, size: number, maxSize: number, usage: number } {
    return {
      name: this.name,
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: this.cache.size / this.maxSize
    };
  }
}

/**
 * Gerenciador central de caches do sistema
 * Permite criar e gerenciar múltiplos caches com limites independentes
 */
export class CacheManager {
  private static instance: CacheManager;
  private caches: Map<string, LimitedCache<any>> = new Map();
  
  private constructor() {
    logger.info('CacheManager', 'Gerenciador de cache inicializado');
  }
  
  /**
   * Obtém a instância única do gerenciador de cache (padrão Singleton)
   */
  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  /**
   * Cria ou retorna um cache existente
   * @param name Nome único do cache
   * @param maxSize Tamanho máximo do cache (ignorado se o cache já existir)
   * @returns Instância do cache
   */
  public getCache<T>(name: string, maxSize = 1000): LimitedCache<T> {
    if (!this.caches.has(name)) {
      const cache = new LimitedCache<T>(name, maxSize);
      this.caches.set(name, cache);
    }
    
    return this.caches.get(name) as LimitedCache<T>;
  }
  
  /**
   * Remove um cache do gerenciador
   * @param name Nome do cache a remover
   * @returns true se o cache foi removido, false caso contrário
   */
  public removeCache(name: string): boolean {
    if (this.caches.has(name)) {
      const cache = this.caches.get(name)!;
      cache.clear();
      this.caches.delete(name);
      logger.info('CacheManager', `Cache '${name}' foi removido do gerenciador`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Limpa todos os caches gerenciados
   */
  public clearAllCaches(): void {
    for (const [name, cache] of this.caches.entries()) {
      cache.clear();
    }
    
    logger.info('CacheManager', `Todos os caches foram limpos (${this.caches.size} caches)`);
  }
  
  /**
   * Retorna estatísticas de todos os caches
   */
  public getAllCacheStats(): Array<{ name: string, size: number, maxSize: number, usage: number }> {
    const stats = [];
    
    for (const [name, cache] of this.caches.entries()) {
      stats.push(cache.getStats());
    }
    
    return stats;
  }
}

// Exporta uma instância única do gerenciador para uso em todo o sistema
export const cacheManager = CacheManager.getInstance();