/**
 * Conector JavaScript para a API Python de Orquestração de Agentes
 * 
 * Este módulo fornece a mesma interface que o python-api-connector.ts,
 * mas utiliza a implementação JavaScript da API em vez de fazer chamadas HTTP
 * para um servidor Python externo.
 */

import { EventEmitter } from 'events';
import { getEmbeddedPythonApi } from './embedded-python-api';

// Interface para tarefas
interface PythonTask {
  id: string;
  titulo: string;
  descricao: string;
  estado: 'pendente' | 'em_andamento' | 'concluida' | 'falha';
  agente_responsavel?: string;
  prioridade: 'baixa' | 'normal' | 'alta' | 'critica';
  timestamp_criacao: string;
  timestamp_atualizacao?: string;
  resultado?: string;
  contexto?: Record<string, any>;
}

// Interface para diagnósticos
interface PythonDiagnostic {
  id: string;
  tipo: 'sistema' | 'agente' | 'tarefa' | 'conexao';
  descricao: string;
  severidade: 'info' | 'aviso' | 'erro' | 'critico';
  timestamp: string;
  detalhes?: Record<string, any>;
  sugestoes?: string[];
}

// Interface para correções
interface PythonCorrection {
  id: string;
  diagnostico_id?: string;
  descricao: string;
  codigo?: string;
  aplicada: boolean;
  timestamp: string;
  resultado?: string;
}

// Interface para sugestões
interface PythonSuggestion {
  id: string;
  tipo: 'otimizacao' | 'nova_funcionalidade' | 'correcao' | 'arquitetura';
  titulo: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta';
  implementada: boolean;
  timestamp: string;
  detalhes?: Record<string, any>;
}

/**
 * Classe de conexão à API Python usando a implementação JavaScript
 */
export class JsPythonConnector extends EventEmitter {
  private embeddedApi = getEmbeddedPythonApi();
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly pollingDelay: number = 15000; // 15 segundos

  constructor() {
    super();
    this.initialize();
    
    // Configurar event listeners para eventos da API embutida
    this.embeddedApi.on('tarefa_criada', (tarefa) => {
      this.emit('tarefa_criada', tarefa);
    });
    
    this.embeddedApi.on('tarefa_atualizada', (tarefa) => {
      this.emit('tarefa_atualizada', tarefa);
    });
    
    this.embeddedApi.on('diagnostico_criado', (diagnostico) => {
      this.emit('diagnostico_criado', diagnostico);
    });
    
    this.embeddedApi.on('correcao_criada', (correcao) => {
      this.emit('correcao_criada', correcao);
    });
    
    this.embeddedApi.on('sugestao_criada', (sugestao) => {
      this.emit('sugestao_criada', sugestao);
    });
    
    this.embeddedApi.on('ciclo_executado', (resultado) => {
      this.emit('ciclo_executado', resultado);
    });
  }

  /**
   * Inicializa o conector
   */
  public async initialize(): Promise<boolean> {
    try {
      // A API JavaScript está sempre disponível
      console.log('Conectado com sucesso à API Python embutida');
      
      // Iniciar polling para sincronização
      this.startPolling();
      
      this.emit('connected', {
        timestamp: new Date().toISOString(),
        status: 'connected'
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao inicializar API Python embutida:', error);
      return false;
    }
  }

  /**
   * Inicia o polling para sincronização periódica
   */
  private startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    this.pollingInterval = setInterval(async () => {
      try {
        // Obter status do sistema
        const status = await this.getStatus();
        
        this.emit('status_update', {
          timestamp: new Date().toISOString(),
          status
        });
      } catch (error) {
        console.error('Erro durante polling para API Python embutida:', error);
      }
    }, this.pollingDelay);
  }

  /**
   * Para o polling para sincronização
   */
  public stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Verifica se está conectado à API Python
   */
  public isApiConnected(): boolean {
    return true; // Sempre conectado, pois é uma implementação JavaScript
  }

  // === Métodos para tarefas ===

  /**
   * Cria uma nova tarefa
   */
  public async createTask(task: Omit<PythonTask, 'id' | 'timestamp_criacao'>): Promise<PythonTask> {
    return this.embeddedApi.criarTarefa(task);
  }

  /**
   * Lista tarefas
   */
  public async listTasks(options?: { 
    estado?: string, 
    agente?: string, 
    prioridade?: string, 
    limite?: number
  }): Promise<PythonTask[]> {
    return this.embeddedApi.listarTarefas(options);
  }

  /**
   * Atualiza uma tarefa existente
   */
  public async updateTask(taskId: string, update: Partial<PythonTask>): Promise<PythonTask> {
    const result = this.embeddedApi.atualizarTarefa(taskId, update);
    if (!result) {
      throw new Error(`Tarefa com ID ${taskId} não encontrada`);
    }
    return result;
  }

  // === Métodos para diagnósticos ===

  /**
   * Envia um novo diagnóstico
   */
  public async createDiagnostic(diagnostic: Omit<PythonDiagnostic, 'id' | 'timestamp'>): Promise<PythonDiagnostic> {
    return this.embeddedApi.criarDiagnostico(diagnostic);
  }

  /**
   * Lista diagnósticos
   */
  public async listDiagnostics(options?: {
    tipo?: string,
    severidade?: string,
    limite?: number
  }): Promise<PythonDiagnostic[]> {
    return this.embeddedApi.listarDiagnosticos(options);
  }

  // === Métodos para correções ===

  /**
   * Envia uma nova correção
   */
  public async createCorrection(correction: Omit<PythonCorrection, 'id' | 'timestamp'>): Promise<PythonCorrection> {
    return this.embeddedApi.criarCorrecao(correction);
  }

  /**
   * Lista correções
   */
  public async listCorrections(options?: {
    aplicada?: boolean,
    diagnostico_id?: string,
    limite?: number
  }): Promise<PythonCorrection[]> {
    return this.embeddedApi.listarCorrecoes(options);
  }

  // === Métodos para sugestões ===

  /**
   * Envia uma nova sugestão
   */
  public async createSuggestion(suggestion: Omit<PythonSuggestion, 'id' | 'timestamp'>): Promise<PythonSuggestion> {
    return this.embeddedApi.criarSugestao(suggestion);
  }

  /**
   * Lista sugestões
   */
  public async listSuggestions(options?: {
    tipo?: string,
    prioridade?: string,
    implementada?: boolean,
    limite?: number
  }): Promise<PythonSuggestion[]> {
    return this.embeddedApi.listarSugestoes(options);
  }

  /**
   * Obtém o status atual do sistema
   */
  public async getStatus(): Promise<any> {
    return this.embeddedApi.obterStatus();
  }

  /**
   * Acessa a funcionalidade que comunica com o orquestrador
   */
  public async getOrchestratorCycles(): Promise<any> {
    return this.embeddedApi.listarCiclosOrquestrador();
  }

  /**
   * Executa um ciclo no orquestrador
   */
  public async executeOrchestratorCycle(): Promise<any> {
    return this.embeddedApi.executarCicloOrquestrador();
  }
}

// Singleton para o conector
let jsPythonConnectorInstance: JsPythonConnector | null = null;

/**
 * Obtém a instância do conector
 */
export function getJsPythonConnector(): JsPythonConnector {
  if (!jsPythonConnectorInstance) {
    jsPythonConnectorInstance = new JsPythonConnector();
  }
  
  return jsPythonConnectorInstance;
}

/**
 * Reseta a instância do conector (útil para testes)
 */
export function resetJsPythonConnector(): void {
  if (jsPythonConnectorInstance) {
    jsPythonConnectorInstance.stopPolling();
    jsPythonConnectorInstance = null;
  }
}