/**
 * Serviço centralizado de logging para o sistema
 * Implementa padrão Singleton para garantir uma única instância
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

export class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private maxLogs: number = 5000; // Limite para evitar vazamento de memória
  
  private constructor() {
    console.log('[LoggingService] Inicializado');
  }
  
  /**
   * Obtém a instância única do serviço de logging (padrão Singleton)
   */
  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }
  
  /**
   * Registra uma mensagem de log
   * @param level Nível de severidade do log
   * @param module Nome do módulo/componente de origem
   * @param message Mensagem descritiva
   * @param data Dados adicionais relacionados (opcional)
   */
  public log(level: LogLevel, module: string, message: string, data?: any): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      module,
      message,
      data
    };
    
    this.logs.push(logEntry);
    
    // Formata e exibe no console
    const formattedMessage = `[${level.toUpperCase()}][${module}] ${message}`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.log(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage);
        break;
    }
    
    // Limita o tamanho do histórico para evitar vazamento de memória
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
  
  /**
   * Registra uma mensagem de debug
   */
  public debug(module: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, module, message, data);
  }
  
  /**
   * Registra uma mensagem informativa
   */
  public info(module: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, module, message, data);
  }
  
  /**
   * Registra um aviso
   */
  public warn(module: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, module, message, data);
  }
  
  /**
   * Registra um erro
   */
  public error(module: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, module, message, data);
  }
  
  /**
   * Registra um erro crítico
   */
  public critical(module: string, message: string, data?: any): void {
    this.log(LogLevel.CRITICAL, module, message, data);
  }
  
  /**
   * Obtém os logs mais recentes
   * @param count Número de logs a retornar
   * @param level Nível de severidade para filtrar (opcional)
   * @returns Array de entradas de log
   */
  public getRecentLogs(count = 100, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(-count);
  }
  
  /**
   * Limpa os logs do sistema
   */
  public clearLogs(): void {
    this.logs = [];
    this.info('LoggingService', 'Histórico de logs limpo');
  }
}

// Exporta uma instância única do serviço para uso em todo o sistema
export const logger = LoggingService.getInstance();