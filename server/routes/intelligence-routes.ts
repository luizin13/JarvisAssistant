import express from 'express';
import { getIntelligenceOrchestrator, CommandType, AIProvider } from '../services/intelligence-orchestrator';

const router = express.Router();
const orchestrator = getIntelligenceOrchestrator();

/**
 * GET /api/intelligence/interactions
 * Retorna as interações recentes processadas pelo orquestrador
 */
router.get('/interactions', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const interactions = orchestrator.getRecentInteractions(limit);
    res.json(interactions);
  } catch (error) {
    console.error('Erro ao obter interações:', error);
    res.status(500).json({ error: 'Falha ao obter interações' });
  }
});

/**
 * GET /api/intelligence/metrics
 * Retorna as métricas de performance dos provedores de IA
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = orchestrator.getPerformanceMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Erro ao obter métricas:', error);
    res.status(500).json({ error: 'Falha ao obter métricas' });
  }
});

/**
 * GET /api/intelligence/mappings
 * Retorna os mapeamentos atuais de tipos de comando para provedores
 */
router.get('/mappings', async (req, res) => {
  try {
    const mappings = orchestrator.getProviderMappings();
    res.json(mappings);
  } catch (error) {
    console.error('Erro ao obter mapeamentos:', error);
    res.status(500).json({ error: 'Falha ao obter mapeamentos' });
  }
});

/**
 * POST /api/intelligence/optimize
 * Força a otimização dos mapeamentos com base no histórico
 */
router.post('/optimize', async (req, res) => {
  try {
    await orchestrator.forceOptimization();
    res.json({ success: true, message: 'Otimização concluída com sucesso' });
  } catch (error) {
    console.error('Erro na otimização:', error);
    res.status(500).json({ error: 'Falha na otimização' });
  }
});

/**
 * GET /api/intelligence/state
 * Retorna o estado completo do orquestrador (debug)
 */
router.get('/state', async (req, res) => {
  try {
    const state = orchestrator.getState();
    res.json(state);
  } catch (error) {
    console.error('Erro ao obter estado:', error);
    res.status(500).json({ error: 'Falha ao obter estado' });
  }
});

/**
 * POST /api/intelligence/process
 * Processa uma consulta através do orquestrador
 */
router.post('/process', async (req, res) => {
  try {
    const { query, userId, systemPrompt, messageContext, confidenceThreshold, forceProvider } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query é obrigatória' });
    }
    
    const options = {
      userId: userId || 1,
      systemPrompt,
      messageContext,
      confidenceThreshold
    };
    
    const result = await orchestrator.processQuery(query, options, forceProvider);
    res.json(result);
  } catch (error) {
    console.error('Erro ao processar consulta:', error);
    res.status(500).json({ error: 'Falha ao processar consulta' });
  }
});

/**
 * POST /api/intelligence/test-provider
 * Testa um provedor específico com uma consulta direta
 */
router.post('/test-provider', async (req, res) => {
  try {
    const { query, provider, commandType, userId, systemPrompt, messageContext } = req.body;
    
    if (!query || !provider) {
      return res.status(400).json({ error: 'Query e provider são obrigatórios' });
    }
    
    const options = {
      userId: userId || 1,
      systemPrompt,
      messageContext,
      confidenceThreshold: 0.7,
      forceProvider: provider
    };
    
    const result = await orchestrator.processQuery(query, options, provider);
    res.json(result);
  } catch (error) {
    console.error('Erro ao testar provedor:', error);
    res.status(500).json({ error: 'Falha ao testar provedor' });
  }
});

export default router;