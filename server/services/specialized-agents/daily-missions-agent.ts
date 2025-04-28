/**
 * Interface do Agente de Missões Diárias
 * 
 * Define a interface para os agentes de missões diárias que gerenciam
 * a criação e acompanhamento de missões para desenvolvimento pessoal.
 */
import { ISpecializedAgent } from './agent-interface';

/**
 * Interface para o Agente de Missões Diárias
 * Estende a interface base ISpecializedAgent
 */
export interface DailyMissionsAgent extends ISpecializedAgent {
  /**
   * Cria uma nova missão diária
   * @param params Parâmetros para criação da missão
   */
  createMission?(params: CreateMissionParams): Promise<MissionResult>;
  
  /**
   * Avalia uma missão completada
   * @param params Parâmetros para avaliação da missão
   */
  evaluateMission?(params: EvaluateMissionParams): Promise<MissionEvaluationResult>;
  
  /**
   * Sugere uma missão baseada no perfil do usuário
   * @param params Parâmetros para sugestão de missão
   */
  suggestMission?(params: SuggestMissionParams): Promise<MissionSuggestionResult>;
}

// Interfaces para os parâmetros dos métodos

/**
 * Parâmetros para criação de missão
 */
export interface CreateMissionParams {
  userId: number;
  categoria?: string;
  nivel?: string;
  foco?: string;
  prazo?: number;
}

/**
 * Parâmetros para avaliação de missão
 */
export interface EvaluateMissionParams {
  missionId: number;
  userId: number;
  completada: boolean;
  reflexao?: string;
  dificuldade?: string;
}

/**
 * Parâmetros para sugestão de missão
 */
export interface SuggestMissionParams {
  userId: number;
  interesses?: string[];
  ultimasMissoes?: number;
  nivelPreferido?: string;
}

// Interfaces para os resultados dos métodos

/**
 * Resultado da criação de missão
 */
export interface MissionResult {
  success: boolean;
  message: string;
  mission?: any;
  error?: string;
}

/**
 * Resultado da avaliação de missão
 */
export interface MissionEvaluationResult {
  success: boolean;
  message: string;
  feedback?: string;
  sugestoes?: string[];
  proximosPassos?: string[];
  error?: string;
}

/**
 * Resultado da sugestão de missão
 */
export interface MissionSuggestionResult {
  success: boolean;
  message: string;
  sugestoes: any[];
  razoes?: string[];
  error?: string;
}