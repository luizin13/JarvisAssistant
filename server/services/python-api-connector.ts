/**
 * Conector com a API Python embutida
 * 
 * Permite comunicação com o serviço Python interno para tarefas
 * de análise, diagnóstico e gerenciamento do sistema.
 */

import axios, { AxiosInstance } from 'axios';
import { 
  Tarefa, 
  Diagnostico, 
  Correcao, 
  Sugestao,
  StatusApi,
  ListarTarefasParams,
  ListarDiagnosticosParams,
  ListarCorrecoesParams,
  ListarSugestoesParams,
  AtualizarTarefaParams,
  ExecutarCicloOrquestradorParams,
  StatusResponse
} from '../types/python-api';

/**
 * Classe para gerenciar a conexão com o serviço Python embutido
 */
export class PythonApiConnector {
  private static instance: PythonApiConnector;
  private client: AxiosInstance;
  private baseUrl: string;
  
  private constructor() {
    // URL padrão para o serviço Python interno
    this.baseUrl = 'http://localhost:5000/api/python';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Interceptor para tratamento de erros
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          console.error(`Erro da API Python: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          console.error('Sem resposta da API Python. Verifique se o serviço está em execução.');
        } else {
          console.error(`Erro ao configurar requisição: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }
  
  /**
   * Obtém a instância singleton do conector
   */
  public static getInstance(): PythonApiConnector {
    if (!PythonApiConnector.instance) {
      PythonApiConnector.instance = new PythonApiConnector();
    }
    return PythonApiConnector.instance;
  }
  
  /**
   * Verifica o status da API Python
   */
  public async obterStatus(): Promise<StatusApi> {
    try {
      const response = await this.client.get('/status');
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar status da API Python:', error);
      throw error;
    }
  }
  
  /**
   * Cria uma nova tarefa no sistema
   */
  public async criarTarefa(tarefa: Tarefa): Promise<Tarefa> {
    try {
      const response = await this.client.post('/tarefas', tarefa);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      throw error;
    }
  }
  
  /**
   * Lista tarefas com filtros opcionais
   */
  public async listarTarefas(params: ListarTarefasParams): Promise<Tarefa[]> {
    try {
      const response = await this.client.get('/tarefas', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar tarefas:', error);
      throw error;
    }
  }
  
  /**
   * Obtém detalhes de uma tarefa específica
   */
  public async obterTarefa(id: string): Promise<Tarefa> {
    try {
      const response = await this.client.get(`/tarefas/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao obter tarefa ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Atualiza o estado de uma tarefa
   */
  public async atualizarTarefa(id: string, atualizacao: AtualizarTarefaParams): Promise<Tarefa> {
    try {
      const response = await this.client.patch(`/tarefas/${id}`, atualizacao);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar tarefa ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Cria um novo diagnóstico no sistema
   */
  public async criarDiagnostico(diagnostico: Diagnostico): Promise<Diagnostico> {
    try {
      const response = await this.client.post('/diagnosticos', diagnostico);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar diagnóstico:', error);
      throw error;
    }
  }
  
  /**
   * Lista diagnósticos com filtros opcionais
   */
  public async listarDiagnosticos(params: ListarDiagnosticosParams): Promise<Diagnostico[]> {
    try {
      const response = await this.client.get('/diagnosticos', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar diagnósticos:', error);
      throw error;
    }
  }
  
  /**
   * Cria uma nova correção no sistema
   */
  public async criarCorrecao(correcao: Correcao): Promise<Correcao> {
    try {
      const response = await this.client.post('/correcoes', correcao);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar correção:', error);
      throw error;
    }
  }
  
  /**
   * Lista correções com filtros opcionais
   */
  public async listarCorrecoes(params: ListarCorrecoesParams): Promise<Correcao[]> {
    try {
      const response = await this.client.get('/correcoes', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar correções:', error);
      throw error;
    }
  }
  
  /**
   * Cria uma nova sugestão no sistema
   */
  public async criarSugestao(sugestao: Sugestao): Promise<Sugestao> {
    try {
      const response = await this.client.post('/sugestoes', sugestao);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar sugestão:', error);
      throw error;
    }
  }
  
  /**
   * Lista sugestões com filtros opcionais
   */
  public async listarSugestoes(params: ListarSugestoesParams): Promise<Sugestao[]> {
    try {
      const response = await this.client.get('/sugestoes', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao listar sugestões:', error);
      throw error;
    }
  }
  
  /**
   * Lista ciclos de execução do orquestrador
   */
  public async listarCiclosOrquestrador(): Promise<any[]> {
    try {
      const response = await this.client.get('/ciclos-orquestrador');
      return response.data;
    } catch (error) {
      console.error('Erro ao listar ciclos do orquestrador:', error);
      throw error;
    }
  }
  
  /**
   * Executa manualmente um ciclo do orquestrador
   */
  public async executarCicloOrquestrador(params: ExecutarCicloOrquestradorParams): Promise<StatusResponse> {
    try {
      const response = await this.client.post('/executar-ciclo-orquestrador', params);
      return response.data;
    } catch (error) {
      console.error('Erro ao executar ciclo do orquestrador:', error);
      throw error;
    }
  }
}

/**
 * Exporta uma função para obter a instância do conector
 */
export function getPythonApiConnector(): PythonApiConnector {
  return PythonApiConnector.getInstance();
}