import { storage } from '../storage';
import { DailyMissionsAgent } from './specialized-agents/daily-missions-agent';
import agentFactory from './specialized-agents/agent-factory';

// Interface para o serviço de missões diárias
export interface MissionService {
  generateMission(options: GenerateMissionOptions): Promise<MissionResponse>;
  completeMission(options: CompleteMissionOptions): Promise<MissionResponse>;
  getMissionById(id: number): Promise<MissionResponse | null>;
  getUserMissions(userId?: number, filters?: MissionFilters): Promise<MissionsListResponse>;
}

// Interfaces de parâmetros e respostas
export interface GenerateMissionOptions {
  categoria?: string;
  nivel?: string;
  foco?: string;
  userId?: number;
}

export interface CompleteMissionOptions {
  missaoId: number;
  completada: boolean;
  reflexao?: string;
  dificuldade?: string;
  userId?: number;
}

export interface MissionFilters {
  categoria?: string;
  nivel?: string;
  completed?: boolean;
  dataCriacao?: { inicio?: string; fim?: string };
  tag?: string;
}

export interface MissionResponse {
  success: boolean;
  message: string;
  mission?: any;
  error?: string;
}

export interface MissionsListResponse {
  success: boolean;
  message: string;
  missions: any[];
  total: number;
  error?: string;
}

/**
 * Implementação do serviço de missões diárias
 * Este serviço gerencia toda a lógica de missões e reflexões
 */
class MissionServiceImpl implements MissionService {
  private missionsAgent: DailyMissionsAgent;

  constructor() {
    // Obter instância do agente de missões diárias
    const agent = agentFactory.createAgent('missoes-diarias');
    if (!agent) {
      console.error('Não foi possível criar o agente de missões diárias');
      throw new Error('Falha ao inicializar o serviço de missões diárias');
    }
    // Conversão segura para DailyMissionsAgent
    this.missionsAgent = agent as unknown as DailyMissionsAgent;
  }

  /**
   * Gera uma nova missão diária personalizada
   */
  async generateMission(options: GenerateMissionOptions): Promise<MissionResponse> {
    try {
      console.log(`[MissionService] Gerando nova missão com parâmetros:`, options);
      
      // Preparar contexto para o agente
      const context = {
        parameters: {
          categoria: options.categoria,
          nivel: options.nivel,
          foco: options.foco
        }
      };
      
      // Obter capacidade de geração de missão
      const capability = this.missionsAgent.getCapability('gerar_missao_diaria');
      
      if (!capability) {
        throw new Error('Capacidade de geração de missão não encontrada');
      }
      
      // Executar a capacidade
      const response = await capability.execute(context);
      
      if (!response || !response.success) {
        throw new Error('Resposta do agente inválida ou vazia');
      }
      
      return {
        success: true,
        message: 'Missão gerada com sucesso',
        mission: response.data
      };
    } catch (error) {
      console.error('[MissionService] Erro ao gerar missão:', error);
      return {
        success: false,
        message: 'Falha ao gerar missão',
        error: (error as Error).message
      };
    }
  }

  /**
   * Registra a conclusão ou reflexão sobre uma missão
   */
  async completeMission(options: CompleteMissionOptions): Promise<MissionResponse> {
    try {
      console.log(`[MissionService] Concluindo missão ID ${options.missaoId}`);
      
      // Verificar se a missão existe
      const suggestion = await storage.getBusinessSuggestion(options.missaoId);
      
      if (!suggestion) {
        throw new Error(`Missão com ID ${options.missaoId} não encontrada`);
      }
      
      // Verificar se é uma missão diária (tem a tag necessária)
      if (!suggestion.tags.includes('evolução_diária')) {
        throw new Error('O item não é uma missão diária válida');
      }
      
      // Preparar contexto para o agente
      const context = {
        parameters: {
          missao_id: String(options.missaoId),
          completada: options.completada,
          resultado: options.reflexao || '',
          dificuldade: options.dificuldade || 'adequada'
        }
      };
      
      // Obter capacidade de avaliação de conclusão
      const capability = this.missionsAgent.getCapability('avaliar_conclusao_missao');
      
      if (!capability) {
        throw new Error('Capacidade de avaliação de missão não encontrada');
      }
      
      // Executar a capacidade
      const response = await capability.execute(context);
      
      if (!response || !response.success) {
        throw new Error('Resposta do agente inválida ou vazia');
      }
      
      // Salvar reflexão na missão existente
      if (options.reflexao) {
        const missionDetails = JSON.parse(suggestion.description);
        missionDetails.reflexao = options.reflexao;
        missionDetails.completada = options.completada;
        
        await storage.updateBusinessSuggestion(options.missaoId, {
          ...suggestion,
          description: JSON.stringify(missionDetails)
        });
      }
      
      return {
        success: true,
        message: 'Missão atualizada com sucesso',
        mission: response.data
      };
    } catch (error) {
      console.error('[MissionService] Erro ao completar missão:', error);
      return {
        success: false,
        message: 'Falha ao atualizar missão',
        error: (error as Error).message
      };
    }
  }

  /**
   * Obtém detalhes de uma missão específica
   */
  async getMissionById(id: number): Promise<MissionResponse | null> {
    try {
      console.log(`[MissionService] Obtendo missão ID ${id}`);
      
      // Buscar sugestão no armazenamento
      const suggestion = await storage.getBusinessSuggestion(id);
      
      if (!suggestion) {
        return null;
      }
      
      // Verificar se é uma missão diária (tem a tag necessária)
      if (!suggestion.tags.includes('evolução_diária')) {
        return {
          success: false,
          message: 'O item não é uma missão diária',
          error: 'Tipo inválido'
        };
      }
      
      // Tentar fazer parse dos detalhes
      let missionDetails;
      try {
        missionDetails = JSON.parse(suggestion.description);
      } catch (error) {
        return {
          success: false,
          message: 'Falha ao processar detalhes da missão',
          error: 'Formato inválido'
        };
      }
      
      // Montar resposta com detalhes
      return {
        success: true,
        message: 'Missão encontrada',
        mission: {
          ...suggestion,
          details: missionDetails
        }
      };
    } catch (error) {
      console.error('[MissionService] Erro ao obter missão:', error);
      return {
        success: false,
        message: 'Falha ao obter missão',
        error: (error as Error).message
      };
    }
  }

  /**
   * Lista missões com filtros opcionais
   */
  async getUserMissions(userId?: number, filters?: MissionFilters): Promise<MissionsListResponse> {
    try {
      console.log(`[MissionService] Listando missões do usuário ${userId || 'todos'}`);
      
      // Obter todas as sugestões
      const allSuggestions = await storage.getBusinessSuggestions();
      
      // Filtrar apenas as que são missões diárias
      const missions = allSuggestions
        .filter(suggestion => suggestion.tags.includes('evolução_diária'))
        .map(suggestion => {
          // Tentar fazer parse dos detalhes
          try {
            const details = JSON.parse(suggestion.description);
            return {
              ...suggestion,
              details
            };
          } catch (error) {
            // Se falhar, retornar com os detalhes básicos
            return suggestion;
          }
        });
      
      // Aplicar filtros adicionais
      let filteredMissions = [...missions];
      
      if (filters) {
        if (filters.categoria) {
          filteredMissions = filteredMissions.filter(mission => 
            mission.details?.categoria === filters.categoria
          );
        }
        
        if (filters.nivel) {
          filteredMissions = filteredMissions.filter(mission => 
            mission.details?.nivel === filters.nivel
          );
        }
        
        if (filters.completed !== undefined) {
          filteredMissions = filteredMissions.filter(mission => 
            Boolean(mission.details?.completada) === filters.completed
          );
        }
        
        if (filters.tag) {
          filteredMissions = filteredMissions.filter(mission => 
            mission.tags.includes(filters.tag)
          );
        }
      }
      
      // Ordenar por data de criação (mais recente primeiro)
      filteredMissions.sort((a, b) => {
        const dateA = new Date(a.details?.data_criacao || 0).getTime();
        const dateB = new Date(b.details?.data_criacao || 0).getTime();
        return dateB - dateA;
      });
      
      return {
        success: true,
        message: 'Missões encontradas',
        missions: filteredMissions,
        total: filteredMissions.length
      };
    } catch (error) {
      console.error('[MissionService] Erro ao listar missões:', error);
      return {
        success: false,
        message: 'Falha ao listar missões',
        error: (error as Error).message,
        missions: [],
        total: 0
      };
    }
  }
}

// Exporta a instância única do serviço de missões
export const missionService = new MissionServiceImpl();