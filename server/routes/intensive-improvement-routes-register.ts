/**
 * Registro das rotas do sistema de melhoria intensiva
 */
import { Express } from 'express';
import {
  iniciarMelhoriaIntensiva,
  pausarMelhoriaIntensiva,
  retomarMelhoriaIntensiva,
  pararMelhoriaIntensiva,
  executarCicloManualmente,
  getEstadoMelhoriaIntensiva,
  getHistoricoMelhoriaIntensiva,
  inicializarServicoMelhoriaIntensiva
} from './intensive-improvement-routes';

/**
 * Registra as rotas do sistema de melhoria intensiva
 * @param app Aplicação Express
 */
export function registerIntensiveImprovementRoutes(app: Express): void {
  console.log('[IntensiveImprovementRoutes] Registrando rotas de melhoria intensiva...');
  
  // Rotas GET
  app.get('/api/intensive-improvement/estado', getEstadoMelhoriaIntensiva);
  app.get('/api/intensive-improvement/historico', getHistoricoMelhoriaIntensiva);
  
  // Rotas POST
  app.post('/api/intensive-improvement/iniciar', iniciarMelhoriaIntensiva);
  app.post('/api/intensive-improvement/pausar', pausarMelhoriaIntensiva);
  app.post('/api/intensive-improvement/retomar', retomarMelhoriaIntensiva);
  app.post('/api/intensive-improvement/parar', pararMelhoriaIntensiva);
  app.post('/api/intensive-improvement/executar-ciclo', executarCicloManualmente);
  
  // Inicializar o serviço
  inicializarServicoMelhoriaIntensiva();
  
  console.log('[IntensiveImprovementRoutes] Rotas de melhoria intensiva registradas com sucesso!');
}