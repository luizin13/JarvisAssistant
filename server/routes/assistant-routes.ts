/**
 * Rotas para gerenciamento do assistente JARVIS
 * 
 * Este arquivo contém as rotas para configuração e interação com o assistente principal
 * do sistema multi-agente.
 */
import { Express, Request, Response } from 'express';
import { validateJarvisConfig, updateJarvisConfig, getJarvisConfig, JarvisConfig } from '../assistants/jarvis-config';
import { JarvisAssistant } from '../assistants/jarvis-assistant';

// Adiciona definição para o objeto user na requisição
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        name?: string;
        role?: string;
      };
    }
  }
}

// Instância global do assistente JARVIS
const jarvisAssistant = new JarvisAssistant();

/**
 * Registra as rotas do assistente JARVIS no Express
 * @param app Aplicação Express
 */
export function registerAssistantRoutes(app: Express): void {
  // Rota para obter a configuração atual do JARVIS
  app.get('/api/assistant/jarvis/config', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 1; // Fallback para userId 1 se não autenticado
      const config = await getJarvisConfig(userId);
      res.json(config);
    } catch (error) {
      console.error('[JARVIS] Erro ao obter configuração:', error);
      res.status(500).json({ error: 'Erro ao obter configuração do JARVIS' });
    }
  });
  
  // Rota para atualizar a configuração do JARVIS
  app.post('/api/assistant/jarvis/config', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 1; // Fallback para userId 1 se não autenticado
      const newConfig = req.body as Partial<JarvisConfig>;
      
      // Validar a configuração recebida
      if (!newConfig || typeof newConfig !== 'object') {
        return res.status(400).json({ error: 'Configuração inválida' });
      }
      
      // Atualizar a configuração no armazenamento
      const updatedConfig = await updateJarvisConfig(userId, newConfig);
      
      // Atualizar a configuração da instância do assistente
      jarvisAssistant.updateJarvisConfig(updatedConfig);
      
      res.json(updatedConfig);
    } catch (error) {
      console.error('[JARVIS] Erro ao atualizar configuração:', error);
      res.status(500).json({ error: 'Erro ao atualizar configuração do JARVIS' });
    }
  });
  
  // Rota para enviar uma mensagem para o JARVIS
  app.post('/api/assistant/jarvis/message', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 1; // Fallback para userId 1 se não autenticado
      const { message } = req.body;
      
      // Validar a mensagem recebida
      if (!message || typeof message !== 'string' || message.trim() === '') {
        return res.status(400).json({ error: 'Mensagem inválida' });
      }
      
      // Importar o storage para salvar as mensagens
      const { storage } = await import('../storage');
      
      // Salvar mensagem do usuário
      const userMessage = await storage.createChatMessage({
        userId,
        content: message,
        isBot: false
      });
      
      // Processar a mensagem com o assistente JARVIS
      const jarvisResponse = await jarvisAssistant.processMessage(message, userId);
      
      // Salvar a resposta do JARVIS
      const botMessageContent = jarvisResponse.message || jarvisResponse.content || "Desculpe, não consegui processar sua solicitação.";
      const botMessage = await storage.createChatMessage({
        userId,
        content: botMessageContent,
        isBot: true
      });
      
      // Retornar a resposta completa com as mensagens salvas
      res.json({
        ...jarvisResponse,
        userMessage,
        botMessage
      });
    } catch (error) {
      console.error('[JARVIS] Erro ao processar mensagem:', error);
      res.status(500).json({ 
        error: 'Erro ao processar mensagem',
        message: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
      });
    }
  });
  
  // Rota para verificar a ativação do JARVIS por comando de voz
  app.post('/api/assistant/jarvis/check-activation', (req: Request, res: Response) => {
    try {
      const { transcript } = req.body;
      
      // Validar o transcript recebido
      if (!transcript || typeof transcript !== 'string') {
        return res.status(400).json({ error: 'Transcript inválido' });
      }
      
      // Obter a palavra-chave de ativação do assistente
      const activationKeyword = jarvisAssistant.getName().toLowerCase();
      
      // Verificar se o transcript contém a palavra-chave
      const isActivated = transcript.toLowerCase().includes(activationKeyword);
      
      res.json({ 
        activated: isActivated,
        activationKeyword,
        transcript
      });
    } catch (error) {
      console.error('[JARVIS] Erro ao verificar ativação:', error);
      res.status(500).json({ error: 'Erro ao verificar ativação do JARVIS' });
    }
  });
  
  // Rota para processar um comando específico do JARVIS
  app.post('/api/assistant/jarvis/execute-command', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 1; // Fallback para userId 1 se não autenticado
      const { command, parameters } = req.body;
      
      // Validar o comando recebido
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: 'Comando inválido' });
      }
      
      // Formatar a mensagem como um comando específico
      const formattedMessage = `${jarvisAssistant.getName()}, ${command} ${
        parameters ? JSON.stringify(parameters) : ''
      }`.trim();
      
      // Processar o comando com o assistente JARVIS
      const response = await jarvisAssistant.processMessage(formattedMessage, userId);
      
      res.json({
        ...response,
        command,
        parameters
      });
    } catch (error) {
      console.error('[JARVIS] Erro ao executar comando:', error);
      res.status(500).json({ error: 'Erro ao executar comando do JARVIS' });
    }
  });
  
  // Rota para obter o histórico de mensagens do JARVIS
  app.get('/api/assistant/jarvis/chat-history', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id || 1; // Fallback para userId 1 se não autenticado
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      // Importar o storage para acessar as mensagens
      const { storage } = await import('../storage');
      
      // Buscar as mensagens do usuário com o JARVIS
      const messages = await storage.getChatMessages(userId, limit);
      
      res.json(messages);
    } catch (error) {
      console.error('[JARVIS] Erro ao obter histórico de chat:', error);
      res.status(500).json({ 
        error: 'Erro ao obter histórico de chat do JARVIS',
        messages: [] // Retornar array vazio em caso de erro para não quebrar o cliente
      });
    }
  });
  
  console.log('🤖 Rotas do assistente JARVIS registradas com sucesso!');
}

// Exportar a instância do assistente para uso em outros módulos
export { jarvisAssistant };