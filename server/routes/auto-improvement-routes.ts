/**
 * Rotas para gerenciamento do sistema de auto-melhoria
 * 
 * Este arquivo contém as rotas para configuração e monitoramento
 * do sistema de auto-melhoria e evolução contínua.
 */
import { Express, Request, Response } from 'express';
import { autoImprovementManager } from '../services/auto-improvement-manager';
import agentFactory from '../services/specialized-agents/agent-factory';

/**
 * Registra as rotas de auto-melhoria no Express
 * @param app Aplicação Express
 */
export function registerAutoImprovementRoutes(app: Express): void {
  // Rota para obter o status do sistema de auto-melhoria
  app.get('/api/auto-improvement/status', (req: Request, res: Response) => {
    try {
      const status = autoImprovementManager.getStatus();
      res.json(status);
    } catch (error) {
      console.error('[AutoImprovement] Erro ao obter status:', error);
      res.status(500).json({ error: 'Erro ao obter status do sistema de auto-melhoria' });
    }
  });
  
  // Rota para iniciar o sistema de auto-melhoria
  app.post('/api/auto-improvement/start', async (req: Request, res: Response) => {
    try {
      // Presumindo um TaskScheduler mock para atender à API
      const mockTaskScheduler: any = {
        processPendingTasks: async () => ({ success: true })
      };
      
      await autoImprovementManager.initialize(mockTaskScheduler);
      res.json({ 
        success: true, 
        message: 'Sistema de auto-melhoria iniciado com sucesso',
        status: autoImprovementManager.getStatus()
      });
    } catch (error) {
      console.error('[AutoImprovement] Erro ao iniciar sistema:', error);
      res.status(500).json({ error: 'Erro ao iniciar sistema de auto-melhoria' });
    }
  });
  
  // Não implementamos a função stop no gerenciador ainda
  app.post('/api/auto-improvement/stop', (req: Request, res: Response) => {
    try {
      // Como não implementamos stop, apenas retornamos um status
      res.json({ 
        success: true, 
        message: 'Operação não implementada',
        status: autoImprovementManager.getStatus()
      });
    } catch (error) {
      console.error('[AutoImprovement] Erro ao parar sistema:', error);
      res.status(500).json({ error: 'Erro ao parar sistema de auto-melhoria' });
    }
  });
  
  // Rota para forçar a execução de um ciclo completo do orquestrador
  app.post('/api/auto-improvement/execute-cycle', async (req: Request, res: Response) => {
    try {
      console.log('[AutoImprovement] Iniciando execução manual de ciclo do orquestrador');
      
      // Executar o ciclo usando o método executeCycle que definimos
      const result = await autoImprovementManager.executeCycle();
      
      console.log('[AutoImprovement] Ciclo manual executado:', result.success ? 'sucesso' : 'falha');
      
      if (result.success) {
        res.json({
          success: true,
          message: 'Ciclo de auto-melhoria executado com sucesso',
          timestamp: new Date().toISOString(),
          details: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message || 'Falha ao executar ciclo de auto-melhoria',
          error: result.error
        });
      }
    } catch (error) {
      console.error('[AutoImprovement] Erro ao executar ciclo:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro ao executar ciclo do sistema de auto-melhoria',
        error: error.message || 'Erro desconhecido'
      });
    }
  });
  
  console.log('🤖 Rotas de auto-melhoria registradas com sucesso!');
}

// Não precisamos exportar o autoImprovementManager pois já está sendo
// importado diretamente de '../services/auto-improvement-manager'