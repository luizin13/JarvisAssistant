/**
 * Inicializador do sistema de Auto-Melhoria
 * 
 * Este arquivo fornece uma função para inicializar corretamente o autoImprovementManager
 * com uma instância de TaskScheduler configurada.
 */
import { autoImprovementManager } from './auto-improvement-manager';
import agentFactory from './specialized-agents/agent-factory';
import { TaskScheduler } from './task-scheduler';

/**
 * Inicializa o sistema de auto-melhoria com o agendador de tarefas
 * @returns true se a inicialização foi bem-sucedida
 */
export function initializeAutoImprovementSystem(): boolean {
  try {
    // Cria uma instância do TaskScheduler
    const taskScheduler = new TaskScheduler(agentFactory);
    
    // Inicializa o gerenciador de auto-melhoria
    autoImprovementManager.initialize(taskScheduler);
    
    console.log('[AutoImprovementInit] Sistema de auto-melhoria inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('[AutoImprovementInit] Erro ao inicializar sistema de auto-melhoria:', error);
    return false;
  }
}