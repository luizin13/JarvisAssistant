/**
 * Sistema de Orquestração de Agentes
 * 
 * Baseado no modelo de agentes cooperativos com aprendizado contínuo,
 * verificação e correção automática interna.
 */

import { EventEmitter } from 'events';
import { MultiAgentSystem } from './multi-agent-system';
import { generateAnthropicResponse, isAnthropicAvailable } from '../anthropic';
import { openaiClient, isOpenAIAvailable } from '../openai';
import { perplexityClient, isPerplexityAvailable } from '../perplexity';
import { isSlackConfigured, sendTaskUpdate } from '../slack';

export interface AgentResult {
  agentType: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
  status: 'success' | 'error' | 'warning';
}

export interface OrchestrationCycle {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  results: AgentResult[];
  input: string;
  output: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
  corrections?: {
    before: string;
    after: string;
    reason: string;
  }[];
  learnings?: string[];
}

export interface OrchestratorOptions {
  maxCycles: number;
  timeout: number;
  agents: string[];
  autoCorrect: boolean;
  storeHistory: boolean;
  notifyOnProgress: boolean;
  continueOnError: boolean;
}

export interface AgentOrchestratorState {
  enabled: boolean;
  options: OrchestratorOptions;
  activeTasks: string[];
  cycles: OrchestrationCycle[];
  logs: string[];
  stats: {
    totalCycles: number;
    completedCycles: number;
    pendingCycles: number;
    failedCycles: number;
    averageTimePerCycle: number;
    autoCorrections: number;
    learningEntries: number;
  };
  lastUpdate: string;
}

const DEFAULT_OPTIONS: OrchestratorOptions = {
  maxCycles: 5,
  timeout: 60000,
  agents: ['coordinator', 'planner', 'researcher', 'analyst', 'advisor', 'summarizer'],
  autoCorrect: true,
  storeHistory: true,
  notifyOnProgress: true,
  continueOnError: true
};

export class AgentOrchestrator extends EventEmitter {
  private state: AgentOrchestratorState;
  private multiAgentSystem: MultiAgentSystem;
  private shouldStop: boolean = false;
  private currentCycleTimeout?: NodeJS.Timeout;

  constructor(multiAgentSystem: MultiAgentSystem) {
    super();
    this.multiAgentSystem = multiAgentSystem;
    this.state = {
      enabled: false,
      options: { ...DEFAULT_OPTIONS },
      activeTasks: [],
      cycles: [],
      logs: [],
      stats: {
        totalCycles: 0,
        completedCycles: 0,
        pendingCycles: 0,
        failedCycles: 0,
        averageTimePerCycle: 0,
        autoCorrections: 0,
        learningEntries: 0
      },
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Inicia o orquestrador de agentes para uma tarefa específica
   */
  public async start(
    taskId: string, 
    input: string, 
    options: Partial<OrchestratorOptions> = {}
  ): Promise<boolean> {
    try {
      if (this.state.activeTasks.includes(taskId)) {
        this.log(`Tarefa ${taskId} já está sendo processada pelo orquestrador`);
        return false;
      }

      this.shouldStop = false;
      this.state.enabled = true;
      this.state.options = { ...DEFAULT_OPTIONS, ...options };
      this.state.activeTasks.push(taskId);
      this.state.lastUpdate = new Date().toISOString();

      this.log(`Iniciando orquestrador de agentes para tarefa ${taskId}`);
      
      const initialCycle: OrchestrationCycle = {
        id: this.generateId(),
        taskId,
        startTime: new Date().toISOString(),
        results: [],
        input,
        output: '',
        status: 'pending'
      };
      
      this.state.cycles.push(initialCycle);
      this.state.stats.totalCycles++;
      this.state.stats.pendingCycles++;
      
      this.emitStateUpdate();
      
      // Para esta implementação inicial, vamos apenas simular o processamento
      await this.simulateProcessing(taskId, initialCycle);
      return true;
    } catch (error) {
      this.log(`Erro ao iniciar orquestrador: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Simula o processamento de uma tarefa (versão simplificada para testes)
   */
  private async simulateProcessing(taskId: string, cycle: OrchestrationCycle): Promise<void> {
    try {
      this.log('Simulando processamento...');
      
      // Atualiza o ciclo para "running"
      cycle.status = 'running';
      this.emitStateUpdate();
      
      // Simula um atraso de 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simula resultados dos agentes
      const results: AgentResult[] = [];
      for (const agentType of this.state.options.agents.slice(0, 2)) {
        results.push({
          agentType,
          content: `Resultado simulado do agente ${agentType} para tarefa ${taskId}`,
          timestamp: new Date().toISOString(),
          status: 'success'
        });
      }
      
      cycle.results = results;
      cycle.output = `Resultado final simulado para tarefa ${taskId}`;
      cycle.status = 'completed';
      cycle.endTime = new Date().toISOString();
      
      this.state.stats.completedCycles++;
      this.state.stats.pendingCycles--;
      
      // Remove a tarefa dos ativos
      const index = this.state.activeTasks.indexOf(taskId);
      if (index !== -1) {
        this.state.activeTasks.splice(index, 1);
      }
      
      this.log(`Simulação concluída para tarefa ${taskId}`);
      this.emitStateUpdate();
    } catch (error) {
      this.log(`Erro na simulação: ${error instanceof Error ? error.message : String(error)}`);
      cycle.status = 'failed';
      cycle.error = String(error);
      this.emitStateUpdate();
    }
  }

  /**
   * Para a execução do orquestrador
   */
  public stop(): void {
    this.log('🛑 Parando orquestrador de agentes');
    this.shouldStop = true;
    if (this.currentCycleTimeout) {
      clearTimeout(this.currentCycleTimeout);
      this.currentCycleTimeout = undefined;
    }
  }

  /**
   * Obtém o estado atual do orquestrador
   */
  public getState(): AgentOrchestratorState {
    return this.state;
  }

  /**
   * Logs internos do orquestrador
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    this.state.logs.push(logMessage);
    
    // Limita o número de logs armazenados
    if (this.state.logs.length > 1000) {
      this.state.logs = this.state.logs.slice(-1000);
    }
    
    // Também exibe no console para fins de debug
    console.log(`[ORQUESTRADOR] ${message}`);
  }

  /**
   * Emite um evento de atualização de estado
   */
  private emitStateUpdate(): void {
    this.state.lastUpdate = new Date().toISOString();
    this.emit('stateUpdate', this.state);
  }

  /**
   * Gera um ID único
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}