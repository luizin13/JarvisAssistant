import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertChatMessageSchema, insertUserSchema } from "@shared/schema";
import { generateBusinessSuggestions, generateChatResponse, generateLatestNews } from "./openai";
import { VoiceRequest } from "./services/voice-assistant";
import path from "path";
import fs from "fs";
import { generateSpeech } from "./openai";
import agentSystem from "./services/specialized-agents/agent-system";
import { fetchGovernmentBids } from "./services/government-bids";
import { fetchGovernmentOfficials } from "./services/government-officials";
import { fetchOfficialData, fetchGovernmentAuthorities, fetchAuthorityDetails, fetchCreditPrograms, fetchGovernmentContracts, mapOfficialDataToAppFormat } from "./services/gov-api";
import { initializePersonalGuide, processPersonalQuery, updateGuideSettings, suggestRelevantContent, GuidanceCategory } from "./services/personal-guide";
import { generateContextualNewsAnalysis, generateContextualComment, generateContextualBusinessSuggestion, generatePersonalAdvice, extractUserContextFromRequest } from "./services/context-aware-ai";
import { getMultiAgentSystem, AgentType, TaskState } from './services/multi-agent-system';
import { systemOrchestrator } from './services/system-orchestrator';
// Definição temporária para SystemAgentType
enum SystemAgentType {
  TESTER = 'tester',
  REFACTOR = 'refactor',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  LEARNER = 'learner',
  MONITOR = 'monitor'
}

// Função temporária para compatibilidade
function getSystemOrchestrator(multiAgentSystem?: any) {
  // Retorna a instância singleton do systemOrchestrator para compatibilidade
  return systemOrchestrator;
}
import { getPythonApiConnector } from './services/python-api-connector';
import { getJsPythonConnector } from './services/js-python-connector';
import { missionService } from './services/mission-service';
import { ComandoGPT, processarComando, obterHistoricoComandos } from './services/bot-gpt-agent';
import externalAgentManager from './services/external-agent-manager';
import { exec } from 'child_process';
import { registerAssistantRoutes } from './routes/assistant-routes';
import { registerAutoImprovementRoutes } from './routes/auto-improvement-routes';
import { registerIntensiveImprovementRoutes } from './routes/intensive-improvement-routes-register';
import intelligenceRoutes from './routes/intelligence-routes';
import { getIntelligenceOrchestrator } from './services/intelligence-orchestrator';

export async function registerRoutes(app: Express): Promise<Server> {
  // Registrar as rotas do assistente JARVIS
  registerAssistantRoutes(app);
  
  // Registrar as rotas do sistema de auto-melhoria
  registerAutoImprovementRoutes(app);
  
  // Registrar as rotas do sistema de melhoria intensiva
  registerIntensiveImprovementRoutes(app);
  
  // Registrar as rotas do Orquestrador de Inteligência
  app.use('/api/intelligence', intelligenceRoutes);
  
  // Inicializar o Orquestrador de Inteligência
  try {
    const intelligenceOrchestrator = getIntelligenceOrchestrator();
    await intelligenceOrchestrator.initialize();
    console.log('🧠 Orquestrador de Inteligência Luiz-JARVIS inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar o Orquestrador de Inteligência:', error);
  }
  
  // Configurar pasta de áudio para ser acessível publicamente com MIME types corretos
  app.use('/audio', express.static(path.join(process.cwd(), 'public', 'audio'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.mp3')) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }
    }
  }));
  // User routes
  app.get("/api/me", async (req, res) => {
    // In a real app, you'd use session management
    // For this prototype, we'll use a fixed user
    const user = await storage.getUser(1);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Don't send password
    const { password, ...safeUser } = user;
    res.json(safeUser);
  });
  
  // Business stats routes
  app.get("/api/stats", async (req, res) => {
    const { category } = req.query;
    // For demo purposes, use the first user
    const stats = await storage.getBusinessStats(1, category as string);
    res.json(stats);
  });
  
  // Credit opportunities routes
  app.get("/api/credit", async (req, res) => {
    const { category } = req.query;
    const opportunities = await storage.getCreditOpportunities(category as string);
    res.json(opportunities);
  });
  
  app.get("/api/credit/:id", async (req, res) => {
    const id = Number(req.params.id);
    const opportunity = await storage.getCreditOpportunity(id);
    
    if (!opportunity) {
      return res.status(404).json({ message: "Credit opportunity not found" });
    }
    
    res.json(opportunity);
  });
  
  // Meta ads routes
  app.get("/api/ads", async (req, res) => {
    const { category } = req.query;
    const ads = await storage.getMetaAds(category as string);
    res.json(ads);
  });
  
  app.get("/api/ads/:id", async (req, res) => {
    const id = Number(req.params.id);
    const ad = await storage.getMetaAd(id);
    
    if (!ad) {
      return res.status(404).json({ message: "Ad not found" });
    }
    
    res.json(ad);
  });
  
  // Business suggestions routes
  app.get("/api/suggestions", async (req, res) => {
    const { category } = req.query;
    const suggestions = await storage.getBusinessSuggestions(category as string);
    res.json(suggestions);
  });
  
  app.get("/api/suggestions/:id", async (req, res) => {
    const id = Number(req.params.id);
    const suggestion = await storage.getBusinessSuggestion(id);
    
    if (!suggestion) {
      return res.status(404).json({ message: "Suggestion not found" });
    }
    
    res.json(suggestion);
  });
  
  app.post("/api/suggestions/generate", async (req, res) => {
    try {
      const requestSchema = z.object({
        businessType: z.string(),
        context: z.string().optional()
      });
      
      const { businessType, context } = requestSchema.parse(req.body);
      
      const suggestions = await generateBusinessSuggestions(businessType, context);
      res.json(suggestions);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      
      console.error("Error generating suggestions:", error);
      res.status(500).json({ message: "Failed to generate suggestions" });
    }
  });
  
  // News articles routes
  app.get("/api/news", async (req, res) => {
    try {
      const { category, limit, refresh } = req.query;
      const parsedLimit = limit ? parseInt(limit as string) : undefined;
      
      // Importa o serviço de notícias aprimorado
      const enhancedNewsService = await import('./services/enhanced-news');
      
      // Se o parâmetro refresh for true ou se não houver artigos suficientes no sistema, gerar novos artigos
      if (refresh === "true") {
        // Verifica se é solicitada uma categoria específica
        if (category) {
          // Lista de categorias suportadas pelo serviço aprimorado
          const validCategories = ['transport', 'farm', 'tech', 'ai', 'economy', 'sustainability', 'consumer', 'policy', 'education'];
          
          // Converte para o tipo apropriado ou usa 'all'
          const newsCategory = validCategories.includes(category as string) ? category as string : 'all';
          
          // Busca e retorna notícias da categoria específica usando o serviço aprimorado
          const news = await enhancedNewsService.fetchEnhancedNews(newsCategory as any, parsedLimit || 10);
          
          // Também salva no armazenamento para uso futuro
          await enhancedNewsService.saveNewsToStorage(news).catch(err => {
            console.error("Erro ao salvar notícias no armazenamento:", err);
          });
          
          return res.json(news);
        } else {
          // Obtém notícias categorizadas para todas as categorias principais
          const categorizedNews = await enhancedNewsService.fetchCategorizedNews(parsedLimit || 20);
          
          // Salva os destaques no armazenamento
          if (categorizedNews.highlights) {
            await enhancedNewsService.saveNewsToStorage(categorizedNews.highlights).catch(err => {
              console.error("Erro ao salvar destaques no armazenamento:", err);
            });
          }
          
          return res.json(categorizedNews);
        }
      } else {
        // Fluxo para quando não há refresh - verifica o armazenamento primeiro
        const articles = await storage.getNewsArticles(
          category as string, 
          parsedLimit
        );
        
        // Se não houver notícias no armazenamento ou houver poucas, busca novas
        if (!articles || articles.length < 5) {
          console.log("Poucas notícias no armazenamento, buscando novas...");
          
          // Atualiza o banco de dados de notícias em background
          enhancedNewsService.updateNewsDatabase().catch(err => {
            console.error("Erro ao atualizar banco de dados de notícias:", err);
          });
          
          // Se não houver nenhuma notícia, busca algumas imediatamente
          if (articles.length === 0) {
            const freshNews = await enhancedNewsService.fetchEnhancedNews('all', parsedLimit || 10);
            return res.json(freshNews);
          }
        }
        
        res.json(articles);
      }
    } catch (error) {
      console.error("Erro ao buscar ou gerar notícias:", error);
      // Fallback para o método original
      try {
        // Gere novas notícias através da OpenAI como fallback
        const newsData = await generateLatestNews(req.query.category as string);
        const articles = newsData?.articles || [];
        
        if (articles && Array.isArray(articles)) {
          // Adicione uma imagem aleatória para cada artigo
          const imageUrls = [
            "https://images.unsplash.com/photo-1582284540020-8acbe03f4924?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80", // Agricultura
            "https://images.unsplash.com/photo-1530835500872-940ca0a6d253?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80", // Campos
            "https://images.unsplash.com/photo-1580674684089-3c8d9d329fab?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80", // Caminhão
            "https://images.unsplash.com/photo-1634128221889-82ed6efebfc3?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80", // Finanças
            "https://images.unsplash.com/photo-1598449356655-f9fbfff258d8?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80"  // Logística
          ];
          
          const processedArticles = articles.map(article => {
            const randomIndex = Math.floor(Math.random() * imageUrls.length);
            return {
              ...article,
              imageUrl: article.imageUrl || imageUrls[randomIndex]
            };
          });
          
          // Salvar os novos artigos no storage
          for (const article of processedArticles) {
            await storage.createNewsArticle(article);
          }
          
          return res.json(processedArticles);
        }
      } catch (fallbackError) {
        console.error("Erro no fallback de notícias:", fallbackError);
      }
      
      // Se tudo falhar, retorna os dados existentes
      const existingArticles = await storage.getNewsArticles(
        req.query.category as string, 
        req.query.limit ? parseInt(req.query.limit as string) : undefined
      );
      
      res.json(existingArticles);
    }
  });
  
  app.get("/api/news/:id", async (req, res) => {
    const id = Number(req.params.id);
    const article = await storage.getNewsArticle(id);
    
    if (!article) {
      return res.status(404).json({ message: "News article not found" });
    }
    
    res.json(article);
  });
  
  // Rota especial para buscar tendências de IA relevantes para os negócios do usuário
  app.get("/api/ai-trends", async (req, res) => {
    try {
      const { limit } = req.query;
      const parsedLimit = limit ? parseInt(limit as string) : 10;
      
      // Importa o serviço de notícias aprimorado
      const enhancedNewsService = await import('./services/enhanced-news');
      
      // Busca tendências específicas de IA
      const aiTrends = await enhancedNewsService.fetchAITrends();
      
      // Salva as tendências no armazenamento para referência futura
      enhancedNewsService.saveNewsToStorage(aiTrends).catch(err => {
        console.error("Erro ao salvar tendências de IA no armazenamento:", err);
      });
      
      res.json(aiTrends);
    } catch (error) {
      console.error("Erro ao buscar tendências de IA:", error);
      
      // Fallback para notícias de IA do armazenamento
      try {
        const aiNewsFromStorage = await storage.getNewsArticles("ai", 5);
        return res.json(aiNewsFromStorage);
      } catch (fallbackError) {
        console.error("Erro no fallback para notícias de IA:", fallbackError);
        res.status(500).json({ message: "Falha ao buscar tendências de IA" });
      }
    }
  });
  
  // Government bids routes
  app.get("/api/government-bids", async (req, res) => {
    try {
      const { category, limit } = req.query;
      const parsedLimit = limit ? parseInt(limit as string) : 10;
      
      const bids = await fetchGovernmentBids(category as string, parsedLimit);
      res.json(bids);
    } catch (error) {
      console.error("Erro ao buscar licitações governamentais:", error);
      res.status(500).json({ 
        message: "Falha ao buscar licitações governamentais. Por favor, tente novamente mais tarde." 
      });
    }
  });
  
  // Government officials routes
  app.get("/api/government-officials", async (req, res) => {
    try {
      const { creditProgram, institution, authority, limit, source } = req.query;
      const parsedLimit = limit ? parseInt(limit as string) : 50;
      
      // Tenta buscar dados da API oficial quando solicitado, caso contrário usa o mock
      if (source === "api" && process.env.API_GOV_DADOS) {
        try {
          // Busca via API oficial do Portal da Transparência
          const nome = req.query.nome as string;
          const orgao = req.query.orgao as string;
          
          // Busca autoridades da API oficial do governo
          const apiData = await fetchGovernmentAuthorities(nome, orgao);
          
          // Converte os dados para o formato da aplicação
          const officials = mapOfficialDataToAppFormat(apiData, 'authorities');
          return res.json(officials);
        } catch (apiError) {
          console.error("Erro ao buscar dados via API oficial:", apiError);
          // Continua para usar o fallback com dados simulados
        }
      }
      
      // Fallback para os dados simulados
      const officials = await fetchGovernmentOfficials(
        creditProgram as string, 
        institution as string,
        authority as string,
        parsedLimit
      );
      res.json(officials);
    } catch (error) {
      console.error("Erro ao buscar autoridades governamentais:", error);
      res.status(500).json({ 
        message: "Falha ao buscar informações sobre autoridades governamentais. Por favor, tente novamente mais tarde." 
      });
    }
  });

  // Rota para buscar detalhes específicos de uma autoridade via API oficial
  app.get("/api/government-officials/official/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!process.env.API_GOV_DADOS) {
        return res.status(400).json({ 
          message: "Configuração da API do Portal da Transparência não encontrada" 
        });
      }
      
      const officialData = await fetchAuthorityDetails(id);
      res.json(officialData);
    } catch (error) {
      console.error("Erro ao buscar detalhes da autoridade via API oficial:", error);
      res.status(500).json({ 
        message: "Falha ao buscar dados detalhados da autoridade governamental." 
      });
    }
  });

  // Rota para buscar programas de crédito governamentais via API oficial
  app.get("/api/official/credit-programs", async (req, res) => {
    try {
      const { ano, programa } = req.query;
      
      if (!process.env.API_GOV_DADOS) {
        return res.status(400).json({ 
          message: "Configuração da API do Portal da Transparência não encontrada" 
        });
      }
      
      const programsData = await fetchCreditPrograms(
        ano ? parseInt(ano as string) : undefined,
        programa as string
      );
      
      const formattedPrograms = mapOfficialDataToAppFormat(programsData, 'programs');
      res.json(formattedPrograms);
    } catch (error) {
      console.error("Erro ao buscar programas de crédito via API oficial:", error);
      res.status(500).json({ 
        message: "Falha ao buscar programas de crédito governamentais." 
      });
    }
  });

  // Rota para buscar contratos governamentais via API oficial
  app.get("/api/official/government-contracts", async (req, res) => {
    try {
      const { dataInicial, dataFinal, orgao } = req.query;
      
      if (!process.env.API_GOV_DADOS) {
        return res.status(400).json({ 
          message: "Configuração da API do Portal da Transparência não encontrada" 
        });
      }
      
      // Valida os parâmetros de data
      if (!dataInicial || !dataFinal) {
        return res.status(400).json({ 
          message: "Parâmetros de data (dataInicial e dataFinal) são obrigatórios no formato YYYYMMDD" 
        });
      }
      
      const contractsData = await fetchGovernmentContracts(
        dataInicial as string,
        dataFinal as string,
        orgao as string
      );
      
      const formattedContracts = mapOfficialDataToAppFormat(contractsData, 'contracts');
      res.json(formattedContracts);
    } catch (error) {
      console.error("Erro ao buscar contratos governamentais via API oficial:", error);
      res.status(500).json({ 
        message: "Falha ao buscar contratos governamentais." 
      });
    }
  });
  
  // Chat messages routes
  app.get("/api/chat", async (req, res) => {
    const { limit } = req.query;
    const parsedLimit = limit ? parseInt(limit as string) : undefined;
    
    // For demo purposes, use the first user
    const messages = await storage.getChatMessages(1, parsedLimit);
    res.json(messages);
  });
  
  app.post("/api/chat", async (req, res) => {
    try {
      const userMessageSchema = z.object({
        content: z.string().min(1),
      });
      
      const { content } = userMessageSchema.parse(req.body);
      
      // Add user message to DB - using fixed user ID for demo
      const userMessage = await storage.createChatMessage({
        userId: 1,
        content,
        isBot: false
      });
      
      // Generate AI response
      const aiResponse = await generateChatResponse(content, {
        userId: 1,
        messageContext: "transportadora e fazenda"
      });
      
      // Add AI response to DB
      const botMessage = await storage.createChatMessage({
        userId: 1,
        content: typeof aiResponse === 'string' ? aiResponse : "Desculpe, não consegui processar sua solicitação.",
        isBot: true
      });
      
      // Return both messages
      res.json({
        userMessage,
        botMessage
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      
      console.error("Error processing chat:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });
  
  // Rota para processar comandos de voz
  app.post("/api/voice-command", async (req, res) => {
    try {
      const commandSchema = z.object({
        command: z.string().min(1),
        userId: z.number().default(1),
        isOffline: z.boolean().optional().default(false),
        responseStyle: z.enum(['conciso', 'detalhado', 'técnico', 'simples']).optional(),
        voiceType: z.enum(['clara', 'bella', 'nicole', 'maria', 'ana', 'custom']).optional()
      });
      
      const { command, userId, isOffline, responseStyle, voiceType } = commandSchema.parse(req.body);
      
      // Se foram fornecidas preferências, atualizamos elas antes de processar o comando
      if (responseStyle || voiceType) {
        try {
          // Aqui usaríamos um serviço para atualizar as preferências
          // Por enquanto, apenas logamos
          console.log(`Preferências do usuário ${userId}:`, { responseStyle, voiceType });
        } catch (prefError) {
          console.error("Erro ao atualizar preferências:", prefError);
          // Continuamos mesmo se houver erro na atualização de preferências
        }
      }
      
      // Salvar a mensagem do usuário no histórico de chat
      // Primeiro, salve a mensagem do usuário
      const userMessage = await storage.createChatMessage({
        userId,
        content: command,
        isBot: false
      });
      
      // Usar o JARVIS em vez do assistente de voz antigo
      const { jarvisAssistant } = await import('./routes/assistant-routes');
      
      // Processar o comando com o JARVIS
      const jarvisResponse = await jarvisAssistant.processMessage(command, userId);
      
      // Salvar a resposta do JARVIS no histórico de chat
      const botMessageContent = jarvisResponse.message || jarvisResponse.content || "Sem resposta";
      const botMessage = await storage.createChatMessage({
        userId,
        content: botMessageContent,
        isBot: true
      });
      
      // Converter a resposta do JARVIS para o formato esperado pelo componente VoiceCommand
      const response = {
        content: botMessageContent,
        type: 'text',
        audioUrl: jarvisResponse.audioUrl,
        source: jarvisResponse.source || 'jarvis',
        confidence: jarvisResponse.confidence || 0.85,
        metadata: jarvisResponse.metadata || {
          processedBy: "jarvis",
          usedAgents: jarvisResponse.agentResponses?.map(ar => ar.agentId) || [],
          emotionalTone: "neutro",
          timestamp: new Date().toISOString()
        },
        // Extrair ações se houver
        actionRequired: jarvisResponse.metadata?.actionRequired || false,
        actionType: jarvisResponse.metadata?.actionType,
        actionTarget: jarvisResponse.metadata?.actionTarget,
        actionParams: jarvisResponse.metadata?.actionParams,
        // Adicionar as mensagens para o cliente saber o que foi salvo
        userMessage,
        botMessage,
        // Incluir também as respostas dos agentes
        agentResponses: jarvisResponse.agentResponses || []
      };
      
      console.log("Resposta do JARVIS processada e salva:", {
        user: command,
        bot: botMessageContent,
        source: response.source,
        confidence: response.confidence
      });
      
      res.json(response);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      
      console.error("Erro ao processar comando de voz:", error);
      res.status(500).json({ 
        content: "Desculpe, tive um problema ao processar seu comando. Por favor, tente novamente.",
        type: 'alert',
        actionRequired: true
      });
    }
  });
  
  // Rota para gerar briefings por áudio
  app.post("/api/audio-briefing", async (req, res) => {
    try {
      const briefingSchema = z.object({
        type: z.enum(['daily', 'weekly', 'transport', 'farm'])
      });
      
      const { type } = briefingSchema.parse(req.body);
      
      // Gera o briefing usando o serviço de assistente de voz
      // Implementação temporária para o briefing
      const briefing = { 
        summary: `Briefing diário para ${type}`,
        items: [
          { topic: 'Tarefas pendentes', content: 'Verificar novas oportunidades' },
          { topic: 'Eventos importantes', content: 'Reunião de estratégia às 14h' },
          { topic: 'Tendências de mercado', content: 'Aumento na demanda de transporte sustentável' }
        ],
        generatedAt: new Date().toISOString()
      };
      
      // Adiciona ao início da lista de briefings
      audioBriefings.unshift(briefing);
      
      // Limita a quantidade de briefings armazenados em memória (máximo 20)
      if (audioBriefings.length > 20) {
        audioBriefings.pop();
      }
      
      res.json(briefing);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      
      console.error("Erro ao gerar briefing:", error);
      res.status(500).json({
        content: "Falha ao gerar o briefing. Por favor, tente novamente mais tarde."
      });
    }
  });
  
  // Array para armazenar os briefings de áudio (em memória)
  const audioBriefings: any[] = [];
  
  // Rota para listar briefings disponíveis
  app.get("/api/audio-briefings", async (req, res) => {
    try {
      res.json(audioBriefings);
    } catch (error) {
      console.error("Erro ao buscar briefings:", error);
      res.status(500).json({
        message: "Falha ao carregar os briefings disponíveis."
      });
    }
  });
  
  // Rota para sintetizar fala com voz mais natural usando o ElevenLabs
  app.post("/api/speech", async (req, res) => {
    try {
      const speechSchema = z.object({
        text: z.string().min(1),
        voiceType: z.enum(['clara', 'bella', 'nicole', 'maria', 'ana', 'custom']).optional().default('clara'),
        stability: z.number().min(0).max(1).optional().default(0.5),
        similarity: z.number().min(0).max(1).optional().default(0.75),
        style: z.number().min(0).max(1).optional().default(0.25),
        useCache: z.boolean().optional().default(true)
      });
      
      const { text, voiceType, stability, similarity, style, useCache } = speechSchema.parse(req.body);
      
      console.log('Gerando voz natural para texto:', text.substring(0, 100) + '...');
      console.log('Preferências de voz:', { voiceType, stability, similarity, style });
      
      // Importa o serviço do ElevenLabs
      const elevenLabsService = await import('./elevenlabs');
      
      // Gera o áudio usando a API do ElevenLabs com as preferências especificadas
      const result = await elevenLabsService.generateSpeechWithElevenLabs(text, {
        voiceType,
        stability,
        similarity,
        style,
        useCache
      });
      
      // Verificar se o arquivo existe
      const audioPath = result.audioUrl.replace('/audio/', '');
      const audioFilePath = path.join(process.cwd(), 'public', 'audio', audioPath);
      
      if (!fs.existsSync(audioFilePath)) {
        return res.status(404).json({ 
          message: "Arquivo de áudio não encontrado",
          path: audioFilePath 
        });
      }
      
      // Adiciona timestamp para evitar cache do navegador
      result.audioUrl = `${result.audioUrl}?t=${Date.now()}`;
      
      console.log('Áudio gerado com sucesso:', result.audioUrl);
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      
      console.error("Erro ao gerar síntese de fala:", error);
      res.status(500).json({ 
        message: "Falha ao gerar áudio. Por favor, tente novamente.",
        fallback: true
      });
    }
  });
  
  // Rotas para o Guia Pessoal
  
  // Inicializa o guia pessoal com configurações personalizadas
  app.post("/api/personal-guide/initialize", async (req, res) => {
    try {
      const settingsSchema = z.object({
        activeHours: z.object({
          start: z.number().min(0).max(23).default(8),
          end: z.number().min(0).max(23).default(22)
        }).optional(),
        interactionFrequency: z.number().min(15).max(240).default(120).optional(),
        focusCategories: z.array(z.nativeEnum(GuidanceCategory)).optional(),
        userName: z.string().optional(),
        businessTypes: z.array(z.string()).optional(),
        learningGoals: z.array(z.string()).optional(),
        wellnessGoals: z.array(z.string()).optional()
      });
      
      const settings = settingsSchema.parse(req.body);
      
      // Inicializa o guia e recebe a mensagem de boas-vindas
      const welcomeResult = await initializePersonalGuide(settings);
      
      res.json({
        success: true,
        message: welcomeResult.message,
        audioUrl: welcomeResult.audioUrl
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      
      console.error("Erro ao inicializar guia pessoal:", error);
      res.status(500).json({ 
        message: "Falha ao configurar o guia pessoal. Por favor, tente novamente."
      });
    }
  });
  
  // Processa consultas pessoais e retorna orientação
  app.post("/api/personal-guide/query", async (req, res) => {
    try {
      const querySchema = z.object({
        query: z.string().min(1)
      });
      
      const { query } = querySchema.parse(req.body);
      
      // Processa a consulta e gera resposta personalizada
      const response = await processPersonalQuery(query);
      
      res.json({
        message: response.message,
        audioUrl: response.audioUrl,
        category: response.category
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      
      console.error("Erro ao processar consulta pessoal:", error);
      res.status(500).json({ 
        message: "Falha ao processar sua consulta. Por favor, tente novamente."
      });
    }
  });
  
  // Atualiza configurações do guia pessoal
  app.patch("/api/personal-guide/settings", async (req, res) => {
    try {
      const settingsSchema = z.object({
        activeHours: z.object({
          start: z.number().min(0).max(23),
          end: z.number().min(0).max(23)
        }).optional(),
        interactionFrequency: z.number().min(15).max(240).optional(),
        focusCategories: z.array(z.nativeEnum(GuidanceCategory)).optional(),
        userName: z.string().optional(),
        businessTypes: z.array(z.string()).optional(),
        learningGoals: z.array(z.string()).optional(),
        wellnessGoals: z.array(z.string()).optional()
      });
      
      const settings = settingsSchema.parse(req.body);
      
      // Atualiza as configurações
      const updatedSettings = updateGuideSettings(settings);
      
      res.json({
        success: true,
        settings: updatedSettings
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      
      console.error("Erro ao atualizar configurações do guia pessoal:", error);
      res.status(500).json({ 
        message: "Falha ao atualizar configurações. Por favor, tente novamente."
      });
    }
  });
  
  // Obtém sugestões de conteúdo relevante para desenvolvimento pessoal
  app.get("/api/personal-guide/content", async (req, res) => {
    try {
      // Busca sugestões personalizadas de conteúdo
      const content = await suggestRelevantContent();
      
      res.json(content);
    } catch (error) {
      console.error("Erro ao obter sugestões de conteúdo:", error);
      res.status(500).json({ 
        message: "Falha ao buscar conteúdo personalizado. Por favor, tente novamente."
      });
    }
  });
  
  // Rotas para IA contextualizada
  
  // Análise contextual de notícias
  app.post("/api/contextual/news-analysis", async (req, res) => {
    try {
      const { newsTitle, newsContent } = req.body;
      
      if (!newsTitle || !newsContent) {
        return res.status(400).json({ message: "Título e conteúdo da notícia são obrigatórios" });
      }
      
      const options = extractUserContextFromRequest(req);
      const analysis = await generateContextualNewsAnalysis(newsTitle, newsContent, options);
      
      res.json({ analysis });
    } catch (error) {
      console.error("Erro ao gerar análise contextual:", error);
      res.status(500).json({ 
        message: "Falha ao gerar análise contextual da notícia" 
      });
    }
  });
  
  // Comentário contextual para feed de notícias
  app.post("/api/contextual/news-comment", async (req, res) => {
    try {
      const { newsTitle, newsContent } = req.body;
      
      if (!newsTitle) {
        return res.status(400).json({ message: "Título da notícia é obrigatório" });
      }
      
      const options = extractUserContextFromRequest(req);
      const comment = await generateContextualComment(newsTitle, newsContent || "", options);
      
      res.json({ comment });
    } catch (error) {
      console.error("Erro ao gerar comentário contextual:", error);
      res.status(500).json({ 
        message: "Falha ao gerar comentário para a notícia" 
      });
    }
  });
  
  // Sugestão de negócios contextualizada
  app.post("/api/contextual/business-suggestion", async (req, res) => {
    try {
      const { businessType, currentChallenges } = req.body;
      
      if (!businessType || !currentChallenges) {
        return res.status(400).json({ 
          message: "Tipo de negócio e desafios atuais são obrigatórios" 
        });
      }
      
      const options = extractUserContextFromRequest(req);
      const suggestion = await generateContextualBusinessSuggestion(
        businessType as 'transport' | 'farm' | 'both',
        currentChallenges,
        options
      );
      
      res.json({ suggestion });
    } catch (error) {
      console.error("Erro ao gerar sugestão de negócios contextualizada:", error);
      res.status(500).json({ 
        message: "Falha ao gerar sugestão de negócios" 
      });
    }
  });
  
  // Conselhos pessoais contextualizados
  app.post("/api/contextual/personal-advice", async (req, res) => {
    try {
      const { situation, goal } = req.body;
      
      if (!situation || !goal) {
        return res.status(400).json({ 
          message: "Situação atual e objetivo são obrigatórios" 
        });
      }
      
      const options = extractUserContextFromRequest(req);
      const advice = await generatePersonalAdvice(situation, goal, options);
      
      res.json({ advice });
    } catch (error) {
      console.error("Erro ao gerar conselho pessoal:", error);
      res.status(500).json({ 
        message: "Falha ao gerar conselho pessoal" 
      });
    }
  });

  // Rotas para o sistema multi-agente (estilo Manus AI)
  
  // Cria uma nova tarefa no sistema multi-agente
  app.post("/api/multi-agent/tasks", async (req, res) => {
    try {
      const { title, description, businessType, userMemory, userPreferences, additionalContext } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ 
          message: "Título e descrição da tarefa são obrigatórios" 
        });
      }
      
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Cria uma nova tarefa
      const task = await multiAgentSystem.createTask(title, description, {
        businessType,
        userMemory,
        userPreferences,
        additionalContext
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
      res.status(500).json({ 
        message: "Falha ao criar tarefa no sistema multi-agente" 
      });
    }
  });
  
  // Obtém uma tarefa específica
  app.get("/api/multi-agent/tasks/:taskId", (req, res) => {
    try {
      const { taskId } = req.params;
      
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém a tarefa
      const task = multiAgentSystem.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ 
          message: "Tarefa não encontrada" 
        });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Erro ao obter tarefa:", error);
      res.status(500).json({ 
        message: "Falha ao obter tarefa do sistema multi-agente" 
      });
    }
  });
  
  // Lista todas as tarefas
  app.get("/api/multi-agent/tasks", (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém todas as tarefas
      const tasks = multiAgentSystem.getAllTasks();
      
      res.json(tasks);
    } catch (error) {
      console.error("Erro ao listar tarefas:", error);
      res.status(500).json({ 
        message: "Falha ao listar tarefas do sistema multi-agente" 
      });
    }
  });
  
  // Ativa/desativa o modo intensivo
  app.post("/api/multi-agent/intensive-mode", (req, res) => {
    try {
      const { enabled, options } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ 
          message: "Parâmetro 'enabled' deve ser booleano" 
        });
      }
      
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Ativa/desativa o modo intensivo
      const result = multiAgentSystem.toggleIntensiveMode(enabled, options);
      
      res.status(200).json({ 
        enabled: result,
        options: multiAgentSystem.getIntensiveModeOptions() 
      });
    } catch (error) {
      console.error("Erro ao configurar modo intensivo:", error);
      res.status(500).json({ 
        message: "Falha ao configurar modo intensivo do sistema multi-agente" 
      });
    }
  });
  
  // Verifica o status do modo intensivo
  app.get("/api/multi-agent/intensive-mode", (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      res.status(200).json({ 
        enabled: multiAgentSystem.isIntensiveModeEnabled(),
        options: multiAgentSystem.getIntensiveModeOptions() 
      });
    } catch (error) {
      console.error("Erro ao verificar modo intensivo:", error);
      res.status(500).json({ 
        message: "Falha ao verificar modo intensivo do sistema multi-agente" 
      });
    }
  });
  
  // Obtém o status detalhado do modo intensivo com informações de progresso em tempo real
  app.get("/api/multi-agent/intensive-mode/status", (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém informações detalhadas sobre o status atual
      const status = multiAgentSystem.getIntensiveModeStatus();
      
      res.status(200).json(status);
    } catch (error) {
      console.error("Erro ao obter status detalhado do modo intensivo:", error);
      res.status(500).json({ 
        message: "Falha ao obter status detalhado do modo intensivo" 
      });
    }
  });
  
  // Realiza um diagnóstico completo do sistema e gera relatório
  app.get("/api/multi-agent/diagnostic", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Executa diagnóstico completo
      const report = await multiAgentSystem.diagnoseSystem();
      
      res.status(200).json(report);
    } catch (error) {
      console.error("Erro ao realizar diagnóstico do sistema:", error);
      res.status(500).json({ 
        message: "Falha ao realizar diagnóstico do sistema" 
      });
    }
  });
  
  // Reinicia o loop de execução sem perder o estado do sistema
  app.post("/api/multi-agent/reset-execution", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Reinicia o loop de execução
      const result = await multiAgentSystem.resetExecutionLoop();
      
      if (result.success) {
        // Retorna sucesso com a mensagem
        res.status(200).json({ 
          success: true,
          message: result.message
        });
      } else {
        // Retorna falha com a mensagem de erro
        res.status(500).json({ 
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("Erro ao reiniciar loop de execução:", error);
      res.status(500).json({ 
        success: false,
        message: "Falha ao reiniciar loop de execução"
      });
    }
  });
  
  // Rotas para o orquestrador de agentes
  
  // Inicia o processamento de uma tarefa com o orquestrador
  app.post("/api/multi-agent/orchestrator/tasks/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Verifica se a tarefa existe
      const task = multiAgentSystem.getTask(taskId);
      if (!task) {
        return res.status(404).json({ 
          message: "Tarefa não encontrada" 
        });
      }
      
      // Inicia o processamento da tarefa com o orquestrador
      const started = await multiAgentSystem.processTaskWithOrchestrator(taskId);
      
      if (started) {
        res.status(200).json({ 
          success: true,
          message: "Tarefa iniciada com orquestrador de agentes" 
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: "Falha ao iniciar tarefa com orquestrador" 
        });
      }
    } catch (error) {
      console.error("Erro ao iniciar tarefa com orquestrador:", error);
      res.status(500).json({ 
        success: false,
        message: "Falha ao iniciar tarefa com orquestrador de agentes"
      });
    }
  });
  
  // Obtém o estado atual do orquestrador
  app.get("/api/multi-agent/orchestrator/status", (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o estado do orquestrador
      const state = multiAgentSystem.getOrchestratorState();
      
      if (state) {
        res.status(200).json(state);
      } else {
        res.status(404).json({ 
          message: "Orquestrador não disponível ou não inicializado" 
        });
      }
    } catch (error) {
      console.error("Erro ao obter estado do orquestrador:", error);
      res.status(500).json({ 
        message: "Falha ao obter estado do orquestrador de agentes" 
      });
    }
  });
  
  // Para o orquestrador de agentes
  app.post("/api/multi-agent/orchestrator/stop", (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Para o orquestrador
      const stopped = multiAgentSystem.stopOrchestrator();
      
      if (stopped) {
        res.status(200).json({ 
          success: true,
          message: "Orquestrador de agentes parado com sucesso" 
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: "Falha ao parar orquestrador" 
        });
      }
    } catch (error) {
      console.error("Erro ao parar orquestrador:", error);
      res.status(500).json({ 
        success: false,
        message: "Falha ao parar orquestrador de agentes"
      });
    }
  });
  
  // Submete input do usuário para uma etapa específica
  app.post("/api/multi-agent/tasks/:taskId/steps/:stepId/input", async (req, res) => {
    try {
      const { taskId, stepId } = req.params;
      const { input } = req.body;
      
      if (!input) {
        return res.status(400).json({ 
          message: "Input do usuário é obrigatório" 
        });
      }
      
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Verifica se a tarefa existe
      const task = multiAgentSystem.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ 
          message: "Tarefa não encontrada" 
        });
      }
      
      // Verifica se a etapa existe
      const step = task.steps.find((s: any) => s.id === stepId);
      
      if (!step) {
        return res.status(404).json({ 
          message: "Etapa não encontrada" 
        });
      }
      
      // Verifica se a etapa está aguardando input do usuário
      if (step.state !== TaskState.AWAITING_USER_INPUT) {
        return res.status(400).json({ 
          message: "Esta etapa não está aguardando input do usuário" 
        });
      }
      
      // Submete o input do usuário
      await multiAgentSystem.submitUserInput(taskId, stepId, input);
      
      // Obtém a tarefa atualizada
      const updatedTask = multiAgentSystem.getTask(taskId);
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Erro ao submeter input do usuário:", error);
      res.status(500).json({ 
        message: "Falha ao submeter input do usuário" 
      });
    }
  });
  
  // Rotas para missões diárias
  app.post("/api/multi-agent/mission/generate", async (req, res) => {
    try {
      console.log('Recebida solicitação para gerar missão:', req.body);
      
      const { categoria, nivel, foco } = req.body;
      
      const result = await missionService.generateMission({
        categoria,
        nivel,
        foco,
        userId: 1 // ID default para protótipo
      });
      
      if (!result.success) {
        return res.status(500).json({
          message: result.message,
          error: result.error
        });
      }
      
      res.status(201).json({
        message: result.message,
        mission: result.mission
      });
    } catch (error) {
      console.error('Erro ao gerar missão diária:', error);
      res.status(500).json({
        message: 'Falha ao gerar missão diária',
        error: (error as Error).message
      });
    }
  });
  
  app.post("/api/multi-agent/mission/complete", async (req, res) => {
    try {
      console.log('Recebida solicitação para completar missão:', req.body);
      
      const { missaoId, completada, reflexao, dificuldade } = req.body;
      
      const result = await missionService.completeMission({
        missaoId,
        completada,
        reflexao,
        dificuldade,
        userId: 1 // ID default para protótipo
      });
      
      if (!result.success) {
        return res.status(500).json({
          message: result.message,
          error: result.error
        });
      }
      
      res.json({
        message: result.message,
        mission: result.mission
      });
    } catch (error) {
      console.error('Erro ao completar missão diária:', error);
      res.status(500).json({
        message: 'Falha ao atualizar missão diária',
        error: (error as Error).message
      });
    }
  });
  
  app.get("/api/multi-agent/mission/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await missionService.getMissionById(id);
      
      if (!result || !result.success) {
        return res.status(404).json({
          message: result?.message || 'Missão não encontrada',
          error: result?.error || 'ID inválido ou não encontrado'
        });
      }
      
      res.json({
        message: result.message,
        mission: result.mission
      });
    } catch (error) {
      console.error('Erro ao obter missão diária:', error);
      res.status(500).json({
        message: 'Falha ao buscar missão diária',
        error: (error as Error).message
      });
    }
  });
  
  app.get("/api/multi-agent/missions", async (req, res) => {
    try {
      const { categoria, nivel, completed, tag } = req.query;
      
      const filters = {
        categoria: categoria as string,
        nivel: nivel as string,
        completed: completed === 'true',
        tag: tag as string
      };
      
      const result = await missionService.getUserMissions(1, filters); // ID default para protótipo
      
      if (!result.success) {
        return res.status(500).json({
          message: result.message,
          error: result.error
        });
      }
      
      res.json({
        message: result.message,
        missions: result.missions,
        total: result.total
      });
    } catch (error) {
      console.error('Erro ao listar missões diárias:', error);
      res.status(500).json({
        message: 'Falha ao listar missões diárias',
        error: (error as Error).message
      });
    }
  });

  // Implementa endpoint de eventos para comunicação em tempo real (SSE)
  app.get("/api/multi-agent/events", (req, res) => {
    // Configura headers para SSE com configurações otimizadas
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Impede o buffering de proxy
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Permite CORS
    
    // Envia um comentário inicial para manter a conexão ativa
    // Isso ajuda a lidar com proxies e load balancers que podem fechar conexões inativas
    res.write(':keep-alive\n\n');
    
    // Configura intervalo de keep-alive para evitar timeouts em proxies e firewalls
    const keepAliveInterval = setInterval(() => {
      if (res.writableEnded) {
        return clearInterval(keepAliveInterval);
      }
      // Envia keep-alive e timestamp para evitar caching
      const timestamp = new Date().getTime();
      res.write(`:keep-alive ${timestamp}\n\n`);
    }, 15000); // Envia keep-alive a cada 15 segundos para maior confiabilidade
    
    // Função para enviar eventos para o cliente
    const sendEvent = (event: string, data: any) => {
      if (res.writableEnded) return; // Verifica se a conexão ainda está ativa
      
      try {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error(`[SSE] Erro ao enviar evento ${event}:`, error);
        clearInterval(keepAliveInterval);
        res.end();
      }
    };
    
    // Obtém o sistema multi-agente
    const multiAgentSystem = getMultiAgentSystem();
    
    // Registra handlers para eventos
    const eventHandlers: Record<string, (...args: any[]) => void> = {
      'task:created': (task) => sendEvent('task:created', task),
      'task:updated': (task) => sendEvent('task:updated', task),
      'task:completed': (task) => sendEvent('task:completed', task),
      'task:failed': (task) => sendEvent('task:failed', task),
      'task:step:added': (data) => sendEvent('task:step:added', data),
      'task:step:started': (data) => sendEvent('task:step:started', data),
      'task:step:completed': (data) => sendEvent('task:step:completed', data),
      'task:step:failed': (data) => sendEvent('task:step:failed', data),
      'task:user:input:required': (data) => sendEvent('task:user:input:required', data),
      'task:user:input:received': (data) => sendEvent('task:user:input:received', data),
      // Eventos do orquestrador de agentes
      'agent:orchestrator:update': (state) => sendEvent('agent:orchestrator:update', state)
    };
    
    // Registra listeners para todos os eventos
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      multiAgentSystem.subscribe(event, handler);
    });
    
    // Envia um evento inicial de conexão
    sendEvent('connected', { message: 'Conectado ao sistema de eventos multi-agente' });
    
    // Quando o cliente desconecta, remove os listeners e limpa os recursos
    req.on('close', () => {
      console.log('[SSE] Cliente desconectado, removendo listeners');
      // Limpa o intervalo de keep-alive
      clearInterval(keepAliveInterval);
      
      // Remove os event listeners
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        multiAgentSystem.unsubscribe(event, handler);
      });
    });
  });

  // Rota para verificar a disponibilidade do Perplexity e retornar metadados
  app.get("/api/perplexity/status", async (req, res) => {
    try {
      // Importa o serviço do Perplexity
      const perplexityService = await import('./perplexity');
      
      const isAvailable = perplexityService.isPerplexityAvailable();
      
      if (!isAvailable) {
        return res.status(200).json({ 
          available: false,
          message: "API do Perplexity não configurada. Configure a variável de ambiente PERPLEXITY_API_KEY para habilitar esta funcionalidade.",
          models: []
        });
      }
      
      // Retorna informações sobre a disponibilidade e modelos
      res.json({
        available: true,
        message: "API do Perplexity disponível e configurada corretamente.",
        models: [
          {
            id: "llama-3.1-sonar-small-128k-online",
            name: "Sonar Small",
            description: "Modelo de tamanho pequeno com contexto extenso e capacidade de busca online."
          },
          {
            id: "llama-3.1-sonar-large-128k-online",
            name: "Sonar Large",
            description: "Modelo de tamanho grande com contexto extenso e capacidade de busca online."
          },
          {
            id: "llama-3.1-sonar-huge-128k-online",
            name: "Sonar Huge",
            description: "Modelo de tamanho máximo com contexto extenso e capacidade de busca online."
          }
        ]
      });
    } catch (error) {
      console.error("Erro ao verificar status do Perplexity:", error);
      res.status(500).json({ 
        available: false,
        message: "Erro ao verificar disponibilidade do Perplexity",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para realizar consultas específicas no Perplexity
  app.post("/api/perplexity/query", async (req, res) => {
    try {
      // Validação da requisição
      const requestSchema = z.object({
        query: z.string().min(3),
        options: z.object({
          model: z.string().optional(),
          temperature: z.number().min(0).max(1).optional(),
          max_tokens: z.number().positive().optional(),
          system_prompt: z.string().optional(),
          search_recency_filter: z.enum(['day', 'week', 'month', 'year', 'none']).optional(),
          return_citations: z.boolean().optional(),
          return_related_questions: z.boolean().optional()
        }).optional()
      });
      
      const { query, options } = requestSchema.parse(req.body);
      
      // Importa o serviço do Perplexity
      const perplexityService = await import('./perplexity');
      
      // Verifica se a API está disponível
      if (!perplexityService.isPerplexityAvailable()) {
        return res.status(503).json({ 
          message: "API do Perplexity não configurada. Configure a variável de ambiente PERPLEXITY_API_KEY para habilitar esta funcionalidade."
        });
      }
      
      // Realiza a consulta
      const result = await perplexityService.queryPerplexity(query, options);
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos", 
          details: error.errors 
        });
      }
      
      console.error("Erro ao consultar Perplexity:", error);
      res.status(500).json({ 
        message: "Erro ao processar consulta no Perplexity",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // ==================
  // ROTAS PARA SISTEMA ORQUESTRADOR AUTÔNOMO DE EVOLUÇÃO CONTÍNUA
  // ==================
  
  // Rota para verificar a disponibilidade do orquestrador de sistema
  app.get("/api/system-orchestrator/status", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Obtém o estado atual
      const state = systemOrchestrator.getState();
      
      res.status(200).json({
        available: true,
        isRunning: state.isRunning,
        currentCycle: state.currentCycle,
        metrics: state.metrics,
        activeAgents: state.activeAgents,
        lastUpdateTime: state.lastUpdateTime,
        lastCycleEndTime: state.lastCycleEndTime
      });
    } catch (error) {
      console.error("Erro ao verificar status do orquestrador de sistema:", error);
      res.status(500).json({
        available: false,
        message: "Erro ao verificar status do orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota para inicializar o orquestrador de sistema
  app.post("/api/system-orchestrator/initialize", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Inicializa o orquestrador
      const initialized = await systemOrchestrator.initialize();
      
      if (initialized) {
        res.status(200).json({
          success: true,
          message: "Orquestrador de sistema inicializado com sucesso",
          state: systemOrchestrator.getState()
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Falha ao inicializar orquestrador de sistema"
        });
      }
    } catch (error) {
      console.error("Erro ao inicializar orquestrador de sistema:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao inicializar orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota para iniciar o orquestrador de sistema (ciclo de evolução contínua)
  app.post("/api/system-orchestrator/start", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Verifica se o orquestrador está inicializado
      if (!systemOrchestrator.getState().isRunning) {
        // Tenta inicializar se ainda não foi inicializado
        await systemOrchestrator.initialize();
      }
      
      // Inicia o orquestrador
      const started = systemOrchestrator.start();
      
      if (started) {
        res.status(200).json({
          success: true,
          message: "Orquestrador de sistema iniciado com sucesso",
          state: systemOrchestrator.getState()
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Falha ao iniciar orquestrador de sistema"
        });
      }
    } catch (error) {
      console.error("Erro ao iniciar orquestrador de sistema:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao iniciar orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota para parar o orquestrador de sistema
  app.post("/api/system-orchestrator/stop", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Para o orquestrador
      const stopped = systemOrchestrator.stop();
      
      if (stopped) {
        res.status(200).json({
          success: true,
          message: "Orquestrador de sistema parado com sucesso",
          state: systemOrchestrator.getState()
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Falha ao parar orquestrador de sistema"
        });
      }
    } catch (error) {
      console.error("Erro ao parar orquestrador de sistema:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao parar orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota para executar um ciclo manual no orquestrador de sistema
  app.post("/api/system-orchestrator/execute-cycle", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Executa um ciclo manualmente (atualmente não implementado diretamente)
      // Temporariamente, inicia e para o orquestrador para simular um ciclo
      await systemOrchestrator.initialize();
      systemOrchestrator.start();
      
      // Simula espera pelo ciclo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Para o orquestrador
      systemOrchestrator.stop();
      
      res.status(200).json({
        success: true,
        message: "Ciclo manual executado com sucesso",
        state: systemOrchestrator.getState()
      });
    } catch (error) {
      console.error("Erro ao executar ciclo manual:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao executar ciclo manual",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota para atualizar a configuração do orquestrador de sistema
  app.post("/api/system-orchestrator/config", async (req, res) => {
    try {
      // Validação da requisição
      const configSchema = z.object({
        cycleDuration: z.number().positive().optional(),
        maxConcurrentAgents: z.number().positive().optional(),
        enabledAgents: z.array(z.enum([
          SystemAgentType.TESTER,
          SystemAgentType.REFACTOR,
          SystemAgentType.SECURITY,
          SystemAgentType.PERFORMANCE,
          SystemAgentType.LEARNER,
          SystemAgentType.MONITOR
        ])).optional(),
        autoImplementChanges: z.boolean().optional(),
        notifyOnChanges: z.boolean().optional(),
        learningRate: z.number().min(0).max(1).optional(),
        maxHistoryItems: z.number().positive().optional()
      });
      
      const config = configSchema.parse(req.body);
      
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Atualiza a configuração
      const updated = systemOrchestrator.updateConfig(config);
      
      if (updated) {
        res.status(200).json({
          success: true,
          message: "Configuração do orquestrador atualizada com sucesso",
          config: systemOrchestrator.getState().config
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Falha ao atualizar configuração do orquestrador"
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Parâmetros de configuração inválidos",
          details: error.errors
        });
      }
      
      console.error("Erro ao atualizar configuração do orquestrador:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao atualizar configuração do orquestrador",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota para obter o histórico completo de análises
  app.get("/api/system-orchestrator/analyses", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Obtém o histórico de análises
      const { analysisHistory } = systemOrchestrator.getState();
      
      res.status(200).json(analysisHistory);
    } catch (error) {
      console.error("Erro ao obter histórico de análises:", error);
      res.status(500).json({
        message: "Erro ao obter histórico de análises",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota para obter o histórico de mudanças implementadas
  app.get("/api/system-orchestrator/changes", async (req, res) => {
    try {
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Obtém o histórico de mudanças
      const { implementedChanges } = systemOrchestrator.getState();
      
      res.status(200).json(implementedChanges);
    } catch (error) {
      console.error("Erro ao obter histórico de mudanças:", error);
      res.status(500).json({
        message: "Erro ao obter histórico de mudanças",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Rota para obter logs do orquestrador
  app.get("/api/system-orchestrator/logs", async (req, res) => {
    try {
      const { limit } = req.query;
      const parsedLimit = limit ? parseInt(limit as string) : 100;
      
      // Obtém o sistema multi-agente
      const multiAgentSystem = getMultiAgentSystem();
      
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(multiAgentSystem);
      
      // Obtém os logs
      const { logs } = systemOrchestrator.getState();
      
      // Limita o número de logs retornados
      const limitedLogs = logs.slice(0, parsedLimit);
      
      res.status(200).json(limitedLogs);
    } catch (error) {
      console.error("Erro ao obter logs do orquestrador:", error);
      res.status(500).json({
        message: "Erro ao obter logs do orquestrador",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para obter insights do mercado de transportes
  app.get("/api/perplexity/transport-insights", async (req, res) => {
    try {
      // Importa o serviço do Perplexity
      const perplexityService = await import('./perplexity');
      
      // Verifica se a API está disponível
      if (!perplexityService.isPerplexityAvailable()) {
        return res.status(503).json({ 
          message: "API do Perplexity não configurada. Configure a variável de ambiente PERPLEXITY_API_KEY para habilitar esta funcionalidade."
        });
      }
      
      // Obtém insights do mercado de transportes
      const insights = await perplexityService.getTransportMarketInsights();
      
      res.json(insights);
    } catch (error) {
      console.error("Erro ao obter insights sobre transportes:", error);
      res.status(500).json({ 
        message: "Erro ao obter insights sobre o mercado de transportes",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para obter insights do agronegócio
  app.get("/api/perplexity/agribusiness-insights", async (req, res) => {
    try {
      // Importa o serviço do Perplexity
      const perplexityService = await import('./perplexity');
      
      // Verifica se a API está disponível
      if (!perplexityService.isPerplexityAvailable()) {
        return res.status(503).json({ 
          message: "API do Perplexity não configurada. Configure a variável de ambiente PERPLEXITY_API_KEY para habilitar esta funcionalidade."
        });
      }
      
      // Obtém insights do agronegócio
      const insights = await perplexityService.getAgribusinessInsights();
      
      res.json(insights);
    } catch (error) {
      console.error("Erro ao obter insights sobre agronegócio:", error);
      res.status(500).json({ 
        message: "Erro ao obter insights sobre o agronegócio",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para enriquecer uma resposta com fatos atualizados
  app.post("/api/perplexity/enrich-response", async (req, res) => {
    try {
      // Validação da requisição
      const requestSchema = z.object({
        query: z.string().min(3),
        initialResponse: z.string().min(10)
      });
      
      const { query, initialResponse } = requestSchema.parse(req.body);
      
      // Importa o serviço do Perplexity
      const perplexityService = await import('./perplexity');
      
      // Verifica se a API está disponível
      if (!perplexityService.isPerplexityAvailable()) {
        // Se não está disponível, apenas retorna a resposta original
        return res.json({
          enhancedResponse: initialResponse,
          citations: [],
          wasEnhanced: false,
          message: "API do Perplexity não configurada. A resposta original foi retornada sem enriquecimento."
        });
      }
      
      // Enriquece a resposta com fatos atualizados
      const result = await perplexityService.enrichResponseWithFacts(query, initialResponse);
      
      res.json({
        ...result,
        wasEnhanced: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos", 
          details: error.errors 
        });
      }
      
      console.error("Erro ao enriquecer resposta com o Perplexity:", error);
      
      // Em caso de erro, retorna a resposta original
      try {
        const { initialResponse } = req.body;
        return res.json({
          enhancedResponse: initialResponse,
          citations: [],
          wasEnhanced: false,
          error: error instanceof Error ? error.message : "Erro desconhecido"
        });
      } catch {
        res.status(500).json({ 
          message: "Erro ao processar requisição",
          error: error instanceof Error ? error.message : "Erro desconhecido"
        });
      }
    }
  });

  // Rota para determinar qual provedor de IA é mais adequado para uma consulta
  app.post("/api/ai-provider/determine", async (req, res) => {
    try {
      // Validação da requisição
      const requestSchema = z.object({
        query: z.string().min(3),
        context: z.object({
          needsRealTimeData: z.boolean().optional(),
          businessType: z.enum(['transport', 'farm', 'both']).optional(),
          requiresCitations: z.boolean().optional(),
          previousProvider: z.string().optional()
        }).optional()
      });
      
      const { query, context = {} } = requestSchema.parse(req.body);
      
      // Importa o serviço do Perplexity
      const perplexityService = await import('./perplexity');
      
      // Determina o provedor ideal
      const recommendation = perplexityService.determineOptimalProvider(query, context);
      
      res.json({
        ...recommendation,
        perplexityAvailable: perplexityService.isPerplexityAvailable()
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos", 
          details: error.errors 
        });
      }
      
      console.error("Erro ao determinar provedor de IA:", error);
      res.status(500).json({ 
        message: "Erro ao determinar provedor ideal",
        error: error instanceof Error ? error.message : "Erro desconhecido",
        // Fallback para OpenAI em caso de erro
        provider: "openai",
        reason: "Fallback devido a erro na determinação"
      });
    }
  });

  // ==================
  // ROTAS PARA INTEGRAÇÃO COM SLACK
  // ==================

  // Rota para verificar a disponibilidade do Slack e retornar metadados
  app.get("/api/slack/status", async (req, res) => {
    try {
      // Importa o serviço do Slack
      const slackService = await import('./slack');
      
      const isAvailable = slackService.isSlackConfigured();
      
      if (!isAvailable) {
        return res.status(200).json({ 
          available: false,
          message: "Integração com Slack não configurada. Configure as variáveis de ambiente SLACK_BOT_TOKEN e SLACK_CHANNEL_ID para habilitar esta funcionalidade."
        });
      }
      
      // Retorna informações sobre a disponibilidade
      res.json({
        available: true,
        message: "Integração com Slack disponível e configurada corretamente.",
        defaultChannel: process.env.SLACK_CHANNEL_ID
      });
    } catch (error) {
      console.error("Erro ao verificar status do Slack:", error);
      res.status(500).json({ 
        available: false,
        message: "Erro ao verificar disponibilidade do Slack",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para enviar uma notificação simples para o Slack
  app.post("/api/slack/notification", async (req, res) => {
    try {
      // Validação da requisição
      const requestSchema = z.object({
        text: z.string().min(1),
        channelId: z.string().optional()
      });
      
      const { text, channelId } = requestSchema.parse(req.body);
      
      // Importa o serviço do Slack
      const slackService = await import('./slack');
      
      // Verifica se a integração está disponível
      if (!slackService.isSlackConfigured()) {
        return res.status(503).json({ 
          message: "Integração com Slack não configurada. Configure as variáveis de ambiente SLACK_BOT_TOKEN e SLACK_CHANNEL_ID para habilitar esta funcionalidade."
        });
      }
      
      // Envia a notificação
      const timestamp = await slackService.sendNotification(text, channelId);
      
      if (timestamp) {
        res.json({ success: true, timestamp });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Não foi possível enviar a notificação" 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos", 
          details: error.errors 
        });
      }
      
      console.error("Erro ao enviar notificação para o Slack:", error);
      res.status(500).json({ 
        message: "Erro ao enviar notificação para o Slack",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para enviar um alerta para o Slack
  app.post("/api/slack/alert", async (req, res) => {
    try {
      // Validação da requisição
      const requestSchema = z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        severity: z.enum(['info', 'warning', 'error']).optional(),
        channelId: z.string().optional()
      });
      
      const { title, message, severity, channelId } = requestSchema.parse(req.body);
      
      // Importa o serviço do Slack
      const slackService = await import('./slack');
      
      // Verifica se a integração está disponível
      if (!slackService.isSlackConfigured()) {
        return res.status(503).json({ 
          message: "Integração com Slack não configurada. Configure as variáveis de ambiente SLACK_BOT_TOKEN e SLACK_CHANNEL_ID para habilitar esta funcionalidade."
        });
      }
      
      // Envia o alerta
      const timestamp = await slackService.sendAlert(title, message, severity, channelId);
      
      if (timestamp) {
        res.json({ success: true, timestamp });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Não foi possível enviar o alerta" 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos", 
          details: error.errors 
        });
      }
      
      console.error("Erro ao enviar alerta para o Slack:", error);
      res.status(500).json({ 
        message: "Erro ao enviar alerta para o Slack",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para enviar um relatório de negócios para o Slack
  app.post("/api/slack/business-report", async (req, res) => {
    try {
      // Validação da requisição
      const requestSchema = z.object({
        title: z.string().min(1),
        summary: z.string().min(1),
        metrics: z.record(z.union([z.string(), z.number()])),
        businessType: z.enum(['transport', 'farm', 'both']).optional(),
        channelId: z.string().optional()
      });
      
      const { title, summary, metrics, businessType, channelId } = requestSchema.parse(req.body);
      
      // Importa o serviço do Slack
      const slackService = await import('./slack');
      
      // Verifica se a integração está disponível
      if (!slackService.isSlackConfigured()) {
        return res.status(503).json({ 
          message: "Integração com Slack não configurada. Configure as variáveis de ambiente SLACK_BOT_TOKEN e SLACK_CHANNEL_ID para habilitar esta funcionalidade."
        });
      }
      
      // Envia o relatório
      const timestamp = await slackService.sendBusinessReport(title, summary, metrics, businessType, channelId);
      
      if (timestamp) {
        res.json({ success: true, timestamp });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Não foi possível enviar o relatório" 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos", 
          details: error.errors 
        });
      }
      
      console.error("Erro ao enviar relatório para o Slack:", error);
      res.status(500).json({ 
        message: "Erro ao enviar relatório para o Slack",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para enviar uma notícia para o Slack
  app.post("/api/slack/news", async (req, res) => {
    try {
      // Validação da requisição
      const requestSchema = z.object({
        title: z.string().min(1),
        summary: z.string().min(1),
        url: z.string().url(),
        source: z.string().min(1),
        category: z.string().min(1),
        businessImpact: z.string().optional(),
        channelId: z.string().optional()
      });
      
      const { title, summary, url, source, category, businessImpact, channelId } = requestSchema.parse(req.body);
      
      // Importa o serviço do Slack
      const slackService = await import('./slack');
      
      // Verifica se a integração está disponível
      if (!slackService.isSlackConfigured()) {
        return res.status(503).json({ 
          message: "Integração com Slack não configurada. Configure as variáveis de ambiente SLACK_BOT_TOKEN e SLACK_CHANNEL_ID para habilitar esta funcionalidade."
        });
      }
      
      // Envia a notícia
      const timestamp = await slackService.sendNewsUpdate({
        title,
        summary,
        url,
        source,
        category,
        businessImpact
      }, channelId);
      
      if (timestamp) {
        res.json({ success: true, timestamp });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Não foi possível enviar a notícia" 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos", 
          details: error.errors 
        });
      }
      
      console.error("Erro ao enviar notícia para o Slack:", error);
      res.status(500).json({ 
        message: "Erro ao enviar notícia para o Slack",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para enviar uma atualização de tarefa para o Slack
  app.post("/api/slack/task-update", async (req, res) => {
    try {
      // Validação da requisição
      const requestSchema = z.object({
        task: z.object({
          id: z.string().min(1),
          title: z.string().min(1),
          description: z.string().min(1),
          state: z.string().min(1),
          result: z.string().optional(),
          steps: z.array(z.any()).optional()
        }),
        status: z.enum(['created', 'updated', 'completed']),
        channelId: z.string().optional()
      });
      
      const { task, status, channelId } = requestSchema.parse(req.body);
      
      // Importa o serviço do Slack
      const slackService = await import('./slack');
      
      // Verifica se a integração está disponível
      if (!slackService.isSlackConfigured()) {
        return res.status(503).json({ 
          message: "Integração com Slack não configurada. Configure as variáveis de ambiente SLACK_BOT_TOKEN e SLACK_CHANNEL_ID para habilitar esta funcionalidade."
        });
      }
      
      // Envia a atualização
      const timestamp = await slackService.sendTaskUpdate(task, status, channelId);
      
      if (timestamp) {
        res.json({ success: true, timestamp });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Não foi possível enviar a atualização da tarefa" 
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Parâmetros inválidos", 
          details: error.errors 
        });
      }
      
      console.error("Erro ao enviar atualização de tarefa para o Slack:", error);
      res.status(500).json({ 
        message: "Erro ao enviar atualização de tarefa para o Slack",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para ler o histórico de mensagens do Slack
  app.get("/api/slack/history", async (req, res) => {
    try {
      const channelId = req.query.channelId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Importa o serviço do Slack
      const slackService = await import('./slack');
      
      // Verifica se a integração está disponível
      if (!slackService.isSlackConfigured()) {
        return res.status(503).json({ 
          message: "Integração com Slack não configurada. Configure as variáveis de ambiente SLACK_BOT_TOKEN e SLACK_CHANNEL_ID para habilitar esta funcionalidade."
        });
      }
      
      // Lê o histórico
      const history = await slackService.readSlackHistory(channelId, limit);
      
      res.json(history);
    } catch (error) {
      console.error("Erro ao ler histórico do Slack:", error);
      res.status(500).json({ 
        message: "Erro ao ler histórico do Slack",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rota para verificar respostas a uma mensagem específica
  app.get("/api/slack/message-responses", async (req, res) => {
    try {
      const messageTs = req.query.messageTs as string;
      const channelId = req.query.channelId as string | undefined;
      
      // Validação da requisição
      if (!messageTs) {
        return res.status(400).json({ 
          message: "Parâmetro messageTs é obrigatório" 
        });
      }
      
      // Importa o serviço do Slack
      const slackService = await import('./slack');
      
      // Verifica se a integração está disponível
      if (!slackService.isSlackConfigured()) {
        return res.status(503).json({ 
          message: "Integração com Slack não configurada. Configure as variáveis de ambiente SLACK_BOT_TOKEN e SLACK_CHANNEL_ID para habilitar esta funcionalidade."
        });
      }
      
      // Verifica respostas
      const responses = await slackService.checkMessageResponses(messageTs, channelId);
      
      res.json(responses);
    } catch (error) {
      console.error("Erro ao verificar respostas de mensagem no Slack:", error);
      res.status(500).json({ 
        message: "Erro ao verificar respostas de mensagem no Slack",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rotas para o Orquestrador de Sistema Autônomo
  app.get("/api/system-orchestrator/status", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Obtém o estado atual do orquestrador
      const state = systemOrchestrator.getState();
      
      // Retorna informações básicas sobre o estado
      res.json({
        available: systemOrchestrator.isInitialized(),
        isRunning: state.isRunning,
        currentCycle: state.currentCycle,
        lastUpdateTime: state.lastUpdateTime,
        lastCycleEndTime: state.lastCycleEndTime,
        activeAgents: state.activeAgents,
        metrics: state.metrics
      });
    } catch (error) {
      console.error("Erro ao obter status do orquestrador de sistema:", error);
      res.status(500).json({
        message: "Falha ao obter status do orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.post("/api/system-orchestrator/initialize", async (req, res) => {
    try {
      // Obtém ou cria o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Inicializa o orquestrador
      const success = await systemOrchestrator.initialize();
      
      if (success) {
        res.json({
          success: true,
          message: "Orquestrador de sistema inicializado com sucesso"
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Falha ao inicializar orquestrador de sistema"
        });
      }
    } catch (error) {
      console.error("Erro ao inicializar orquestrador de sistema:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao inicializar orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.post("/api/system-orchestrator/start", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Inicia o ciclo de evolução contínua
      const success = systemOrchestrator.start();
      
      if (success) {
        res.json({
          success: true,
          message: "Ciclo de evolução contínua iniciado com sucesso"
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Falha ao iniciar ciclo de evolução contínua"
        });
      }
    } catch (error) {
      console.error("Erro ao iniciar orquestrador de sistema:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao iniciar orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.post("/api/system-orchestrator/stop", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Para o ciclo de evolução contínua
      const success = systemOrchestrator.stop();
      
      if (success) {
        res.json({
          success: true,
          message: "Ciclo de evolução contínua parado com sucesso"
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Falha ao parar ciclo de evolução contínua"
        });
      }
    } catch (error) {
      console.error("Erro ao parar orquestrador de sistema:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao parar orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.post("/api/system-orchestrator/execute-cycle", async (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Executa um ciclo manualmente
      if (!systemOrchestrator.isInitialized()) {
        await systemOrchestrator.initialize();
      }
      
      // Execução manual
      systemOrchestrator.executeManualCycle().then(() => {
        console.log("Ciclo manual executado com sucesso");
      }).catch(error => {
        console.error("Erro na execução manual do ciclo:", error);
      });
      
      res.json({
        success: true,
        message: "Ciclo manual iniciado. Verificar resultados em status."
      });
    } catch (error) {
      console.error("Erro ao executar ciclo manual do orquestrador:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao executar ciclo manual",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.get("/api/system-orchestrator/analyses", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Obtém o histórico de análises
      const state = systemOrchestrator.getState();
      
      res.json(state.analysisHistory || []);
    } catch (error) {
      console.error("Erro ao obter análises do orquestrador:", error);
      res.status(500).json({
        message: "Falha ao obter análises do orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.get("/api/system-orchestrator/changes", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Obtém o histórico de mudanças implementadas
      const state = systemOrchestrator.getState();
      
      res.json(state.implementedChanges || []);
    } catch (error) {
      console.error("Erro ao obter mudanças implementadas pelo orquestrador:", error);
      res.status(500).json({
        message: "Falha ao obter mudanças implementadas pelo orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.get("/api/system-orchestrator/logs", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Obtém os logs do orquestrador
      const state = systemOrchestrator.getState();
      
      res.json(state.logs || []);
    } catch (error) {
      console.error("Erro ao obter logs do orquestrador:", error);
      res.status(500).json({
        message: "Falha ao obter logs do orquestrador de sistema",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.post("/api/system-orchestrator/config", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Valida e atualiza a configuração
      const success = systemOrchestrator.updateConfig(req.body);
      
      if (success) {
        res.json({
          success: true,
          message: "Configuração do orquestrador atualizada com sucesso",
          config: systemOrchestrator.getState().config
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Falha ao atualizar configuração do orquestrador"
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar configuração do orquestrador:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao atualizar configuração do orquestrador",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.get("/api/system-orchestrator/config/export", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Exporta a configuração como JSON
      const configJson = systemOrchestrator.exportConfig();
      
      // Configura o cabeçalho para download de arquivo
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=system-orchestrator-config.json');
      
      res.send(configJson);
    } catch (error) {
      console.error("Erro ao exportar configuração do orquestrador:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao exportar configuração do orquestrador",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  app.post("/api/system-orchestrator/config/import", (req, res) => {
    try {
      // Obtém o orquestrador de sistema
      const systemOrchestrator = getSystemOrchestrator(getMultiAgentSystem());
      
      // Verifica se o corpo da requisição contém o JSON da configuração
      if (!req.body.configJson) {
        return res.status(400).json({
          success: false,
          message: "JSON de configuração não fornecido"
        });
      }
      
      // Importa a configuração
      const success = systemOrchestrator.importConfig(req.body.configJson);
      
      if (success) {
        res.json({
          success: true,
          message: "Configuração do orquestrador importada com sucesso",
          config: systemOrchestrator.getState().config
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Falha ao importar configuração do orquestrador"
        });
      }
    } catch (error) {
      console.error("Erro ao importar configuração do orquestrador:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao importar configuração do orquestrador",
        error: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // ==================
  // ROTAS PARA API PYTHON DE GERENCIAMENTO DE TAREFAS E DIAGNÓSTICOS
  // ==================
  
  // Rota para iniciar a API Python (não é mais necessário com a implementação JS, mas mantida para compatibilidade)
  app.post("/api/python/start", async (req, res) => {
    try {
      // A API JavaScript já está sempre disponível, então apenas retornamos sucesso
      console.log('API Python (modo JavaScript) iniciada');
      res.json({ success: true, message: 'API Python (modo JavaScript) iniciada' });
    } catch (error) {
      console.error('Erro ao iniciar API Python (modo JavaScript):', error);
      res.status(500).json({ success: false, error: 'Não foi possível iniciar a API Python' });
    }
  });
  
  // Rotas para tarefas
  app.get("/api/python/tarefas", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const options = {
        estado: req.query.estado as string,
        agente: req.query.agente as string,
        prioridade: req.query.prioridade as string,
        limite: req.query.limite ? parseInt(req.query.limite as string) : undefined
      };
      
      const tarefas = await pythonApi.listTasks(options);
      res.json(tarefas);
    } catch (error) {
      console.error('Erro ao listar tarefas:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  app.post("/api/python/tarefa", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const tarefa = await pythonApi.createTask(req.body);
      res.status(201).json(tarefa);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  app.patch("/api/python/tarefa/:id", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const tarefaAtualizada = await pythonApi.updateTask(req.params.id, req.body);
      res.json(tarefaAtualizada);
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  // Rotas para diagnósticos
  app.get("/api/python/diagnosticos", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const options = {
        tipo: req.query.tipo as string,
        severidade: req.query.severidade as string,
        limite: req.query.limite ? parseInt(req.query.limite as string) : undefined
      };
      
      const diagnosticos = await pythonApi.listDiagnostics(options);
      res.json(diagnosticos);
    } catch (error) {
      console.error('Erro ao listar diagnósticos:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  app.post("/api/python/diagnostico", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const diagnostico = await pythonApi.createDiagnostic(req.body);
      res.status(201).json(diagnostico);
    } catch (error) {
      console.error('Erro ao criar diagnóstico:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  // Rotas para correções
  app.get("/api/python/correcoes", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const options = {
        aplicada: req.query.aplicada === 'true',
        diagnostico_id: req.query.diagnostico_id as string,
        limite: req.query.limite ? parseInt(req.query.limite as string) : undefined
      };
      
      const correcoes = await pythonApi.listCorrections(options);
      res.json(correcoes);
    } catch (error) {
      console.error('Erro ao listar correções:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  app.post("/api/python/correcao", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const correcao = await pythonApi.createCorrection(req.body);
      res.status(201).json(correcao);
    } catch (error) {
      console.error('Erro ao criar correção:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  // Rotas para sugestões
  app.get("/api/python/sugestoes", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const options = {
        tipo: req.query.tipo as string,
        prioridade: req.query.prioridade as string,
        implementada: req.query.implementada === 'true',
        limite: req.query.limite ? parseInt(req.query.limite as string) : undefined
      };
      
      const sugestoes = await pythonApi.listSuggestions(options);
      res.json(sugestoes);
    } catch (error) {
      console.error('Erro ao listar sugestões:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  app.post("/api/python/sugestao", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const sugestao = await pythonApi.createSuggestion(req.body);
      res.status(201).json(sugestao);
    } catch (error) {
      console.error('Erro ao criar sugestão:', error);
      res.status(500).json({ success: false, error: 'Erro ao processar a requisição' });
    }
  });
  
  // Rota para status da API
  app.get("/api/python/status", async (req, res) => {
    try {
      const pythonApi = getJsPythonConnector();
      
      const status = await pythonApi.getStatus();
      status.connected = true;
      status.implementation = 'javascript';
      
      res.json(status);
    } catch (error) {
      console.error('Erro ao obter status da API:', error);
      res.json({ 
        connected: true,
        implementation: 'javascript',
        error: 'Erro ao obter status detalhado'
      });
    }
  });

  // Endpoints para gerenciamento de agentes externos
  app.get("/api/agentes-externos", (req, res) => {
    try {
      const agentes = externalAgentManager.getAgents();
      
      // Remover dados sensíveis (token) para exibição
      const agentesParaExibicao = agentes.map(agente => {
        const { authToken, ...dadosPublicos } = agente;
        return {
          ...dadosPublicos,
          tokenValido: !!authToken
        };
      });
      
      res.json(agentesParaExibicao);
    } catch (error) {
      console.error("Erro ao listar agentes externos:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  app.get("/api/agentes-externos/:id/atividades", (req, res) => {
    try {
      const { id } = req.params;
      const atividades = externalAgentManager.getAgentActivity(id);
      
      if (atividades.length === 0) {
        const agente = externalAgentManager.getAgents().find(a => a.id === id);
        if (!agente) {
          return res.status(404).json({
            success: false,
            mensagem: "Agente não encontrado"
          });
        }
      }
      
      res.json(atividades);
    } catch (error) {
      console.error("Erro ao obter atividades do agente:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Endpoint para gerar um novo token para um agente externo
  app.post("/api/agentes-externos/:id/token", (req, res) => {
    try {
      const { token: adminToken } = req.body;
      const agentId = req.params.id;
      
      // Apenas com o token mestre podemos gerar novos tokens
      const adminAgent = externalAgentManager.validateToken(adminToken);
      
      if (!adminToken || !adminAgent) {
        return res.status(401).json({
          success: false,
          mensagem: "Token administrativo inválido ou não fornecido"
        });
      }
      
      // Verificar se o agente alvo existe
      const agentes = externalAgentManager.getAgents();
      const targetAgent = agentes.find(a => a.id === agentId);
      
      if (!targetAgent) {
        return res.status(404).json({
          success: false,
          mensagem: "Agente não encontrado"
        });
      }
      
      // Opções de expiração do token
      const { expirationDays = 30 } = req.body;
      
      // Gerar o novo token
      const newToken = externalAgentManager.generateSecureToken(agentId, expirationDays);
      
      // Registrar a atividade
      externalAgentManager.logActivity(
        adminAgent.id,
        "gerar_token",
        {
          target_agent_id: agentId,
          target_agent_name: targetAgent.name,
          expiration_days: expirationDays
        }
      );
      
      return res.status(200).json({
        success: true,
        mensagem: "Token gerado com sucesso",
        token: newToken,
        agent: {
          id: targetAgent.id,
          name: targetAgent.name
        },
        expires_at: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString()
      });
      
    } catch (error) {
      console.error("Erro ao gerar token para agente externo:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Endpoint para revogar um token específico
  app.post("/api/revogar-token", (req, res) => {
    try {
      const { token: adminToken, tokenToRevoke } = req.body;
      
      // Verificar se o solicitante tem autorização
      const adminAgent = externalAgentManager.validateToken(adminToken);
      
      if (!adminToken || !adminAgent) {
        return res.status(401).json({
          success: false,
          mensagem: "Token administrativo inválido ou não fornecido"
        });
      }
      
      // Revogar o token especificado
      const wasRevoked = externalAgentManager.revokeToken(tokenToRevoke);
      
      if (wasRevoked) {
        // Registrar a atividade
        externalAgentManager.logActivity(
          adminAgent.id,
          "revogar_token",
          {
            token_prefix: tokenToRevoke.substring(0, 8) + '...'
          }
        );
        
        return res.status(200).json({
          success: true,
          mensagem: "Token revogado com sucesso"
        });
      } else {
        return res.status(404).json({
          success: false,
          mensagem: "Token não encontrado ou já revogado"
        });
      }
      
    } catch (error) {
      console.error("Erro ao revogar token:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Endpoint para obter estatísticas do sistema de agentes externos
  app.get("/api/agentes-externos/estatisticas", (req, res) => {
    try {
      // Verificar se o solicitante tem um token válido (opcional, podemos restringir apenas para tokens autorizados)
      const { token } = req.query;
      
      if (token) {
        // Se um token for fornecido, validar
        const agent = externalAgentManager.validateToken(token as string);
        if (!agent) {
          return res.status(401).json({
            success: false,
            mensagem: "Token inválido"
          });
        }
        
        // Registrar a atividade
        externalAgentManager.logActivity(
          agent.id,
          "consultar_estatisticas",
          { timestamp: new Date().toISOString() }
        );
      } 
      
      // Obter as estatísticas
      const estatisticas = externalAgentManager.getSystemStats();
      
      // Adicionar timestamp
      const resposta = {
        success: true,
        timestamp: new Date().toISOString(),
        estatisticas: estatisticas
      };
      
      return res.status(200).json(resposta);
      
    } catch (error) {
      console.error("Erro ao obter estatísticas do sistema:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Endpoint para configurar um webhook para um agente externo
  app.post("/api/agentes-externos/:id/webhook", (req, res) => {
    try {
      const { token } = req.body;
      const agentId = req.params.id;
      
      // Verificar autenticação
      const adminAgent = externalAgentManager.validateToken(token);
      
      if (!token || !adminAgent) {
        return res.status(401).json({
          success: false,
          mensagem: "Token administrativo inválido ou não fornecido"
        });
      }
      
      // Extrair configuração do webhook do corpo da requisição
      const { url, secret, events, enabled } = req.body;
      
      if (!url || !events || !Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          mensagem: "Parâmetros inválidos. 'url' e 'events' (array) são obrigatórios."
        });
      }
      
      // Configurar o webhook
      const webhookConfig = {
        url,
        secret,
        events,
        enabled: enabled !== undefined ? enabled : true,
        retryCount: 0
      };
      
      const updatedAgent = externalAgentManager.configureWebhook(agentId, webhookConfig);
      
      if (!updatedAgent) {
        return res.status(404).json({
          success: false,
          mensagem: "Agente não encontrado"
        });
      }
      
      // Remover dados sensíveis para retorno
      const { authToken, webhook, ...agentPublic } = updatedAgent;
      const webhookResponse = webhook ? {
        ...webhook,
        secret: webhook.secret ? "••••••" : undefined
      } : undefined;
      
      return res.status(200).json({
        success: true,
        mensagem: "Webhook configurado com sucesso",
        agente: {
          ...agentPublic,
          webhook: webhookResponse
        }
      });
      
    } catch (error) {
      console.error("Erro ao configurar webhook:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Endpoint para remover um webhook de um agente
  app.delete("/api/agentes-externos/:id/webhook", (req, res) => {
    try {
      const { token } = req.body;
      const agentId = req.params.id;
      
      // Verificar autenticação
      const adminAgent = externalAgentManager.validateToken(token);
      
      if (!token || !adminAgent) {
        return res.status(401).json({
          success: false,
          mensagem: "Token administrativo inválido ou não fornecido"
        });
      }
      
      // Remover webhook
      const success = externalAgentManager.removeWebhook(agentId);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          mensagem: "Agente não encontrado ou webhook não configurado"
        });
      }
      
      return res.status(200).json({
        success: true,
        mensagem: "Webhook removido com sucesso"
      });
      
    } catch (error) {
      console.error("Erro ao remover webhook:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Endpoint para testar um webhook
  app.post("/api/agentes-externos/:id/webhook/test", async (req, res) => {
    try {
      const { token } = req.body;
      const agentId = req.params.id;
      
      // Verificar autenticação
      const adminAgent = externalAgentManager.validateToken(token);
      
      if (!token || !adminAgent) {
        return res.status(401).json({
          success: false,
          mensagem: "Token administrativo inválido ou não fornecido"
        });
      }
      
      // Verificar se o agente existe
      const agent = externalAgentManager.getAgents().find(a => a.id === agentId);
      
      if (!agent) {
        return res.status(404).json({
          success: false,
          mensagem: "Agente não encontrado"
        });
      }
      
      if (!agent.webhook) {
        return res.status(400).json({
          success: false,
          mensagem: "Webhook não configurado para este agente"
        });
      }
      
      // Enviar um evento de teste
      const success = await externalAgentManager.triggerWebhook(
        agentId, 
        "webhook_test", 
        { 
          message: "Este é um evento de teste para verificar a configuração do webhook",
          timestamp: new Date().toISOString()
        }
      );
      
      if (success) {
        return res.status(200).json({
          success: true,
          mensagem: "Webhook testado com sucesso",
          webhookStatus: agent.webhook.lastDelivery
        });
      } else {
        return res.status(200).json({
          success: false,
          mensagem: "Falha ao enviar evento de teste para o webhook",
          webhookStatus: agent.webhook.lastDelivery
        });
      }
      
    } catch (error) {
      console.error("Erro ao testar webhook:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });
  
  // Endpoint para integração com IA externa (ChatGPT)
  // Endpoint para registrar decisões estratégicas
  app.post("/api/registrar-decisao", async (req, res) => {
    try {
      const { token } = req.body;
      
      // Validação do token usando o gerenciador de agentes externos
      const agent = externalAgentManager.validateToken(token);
      
      if (!agent) {
        console.warn('Tentativa de acesso não autorizado ao endpoint /api/registrar-decisao');
        return res.status(401).json({ 
          success: false, 
          mensagem: "Acesso não autorizado. Token inválido ou agente não registrado." 
        });
      }
      
      // Verificar permissão específica
      if (!agent.permissions.canRegisterDecisions) {
        return res.status(403).json({
          success: false,
          mensagem: "O agente não tem permissão para registrar decisões estratégicas."
        });
      }
      
      const { action, context, result, learning, impact_level, strategic_area, user_id } = req.body;
      
      // Validação básica
      if (!action || !context) {
        return res.status(400).json({
          success: false,
          mensagem: "Os campos 'action' e 'context' são obrigatórios."
        });
      }
      
      // Registrar a decisão estratégica
      const decisao = await storage.createStrategicDecision({
        action,
        context,
        result,
        learning,
        impact_level: impact_level || "médio",
        strategic_area: strategic_area || "geral",
        user_id: user_id || null,
        agent_id: agent.id
      });
      
      console.log(`[${agent.name}] Decisão estratégica registrada: ${action} (Área: ${strategic_area || 'geral'})`);
      
      // Registrar a atividade no gerenciador de agentes externos
      externalAgentManager.logActivity(
        agent.id,
        "registrar_decisao",
        { 
          decisao_id: decisao.id,
          action: decisao.action,
          strategic_area: decisao.strategic_area,
          impact_level: decisao.impact_level
        }
      );
      
      // Disparar evento de webhook se algum agente estiver interessado
      externalAgentManager.broadcastEvent(
        "decisao_estrategica_criada",
        {
          decisao_id: decisao.id,
          action: decisao.action,
          context: decisao.context,
          strategic_area: decisao.strategic_area,
          impact_level: decisao.impact_level,
          created_by: {
            agent_id: agent.id,
            agent_name: agent.name,
            agent_type: agent.metadata.type
          },
          created_at: decisao.created_at
        }
      ).catch(err => {
        console.warn("Erro ao notificar webhooks sobre decisão estratégica:", err);
      });
      
      return res.status(201).json({
        success: true,
        mensagem: "Decisão estratégica registrada com sucesso",
        decisao: decisao
      });
    } catch (error) {
      console.error("Erro ao registrar decisão estratégica:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error.message
      });
    }
  });
  
  // Endpoint para criar tarefas melhoradas
  app.post("/api/tarefas-melhoradas", async (req, res) => {
    try {
      const { token } = req.body;
      
      // Validação do token usando o gerenciador de agentes externos
      const agent = externalAgentManager.validateToken(token);
      
      if (!agent) {
        console.warn('Tentativa de acesso não autorizado ao endpoint /api/tarefas-melhoradas');
        return res.status(401).json({ 
          success: false, 
          mensagem: "Acesso não autorizado. Token inválido ou agente não registrado." 
        });
      }
      
      // Verificar permissão para criar tarefas
      if (!agent.permissions.createTasks) {
        return res.status(403).json({
          success: false,
          mensagem: "O agente não tem permissão para criar tarefas melhoradas."
        });
      }
      
      const { title, description, priority, strategic_impact, estimated_roi, impact_areas, assigned_to } = req.body;
      
      // Validação básica
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          mensagem: "Os campos 'title' e 'description' são obrigatórios."
        });
      }
      
      // Criar tarefa melhorada
      const tarefa = await storage.createEnhancedTask({
        title,
        description,
        state: "pendente",
        priority: priority || "normal",
        strategic_impact,
        estimated_roi,
        impact_areas: impact_areas || [],
        agent_id: agent.id,
        assigned_to: assigned_to || null
      });
      
      console.log(`[${agent.name}] Tarefa melhorada criada: ${title} (Impacto estratégico: ${strategic_impact || 'não especificado'})`);
      
      // Registrar a atividade no gerenciador de agentes externos
      externalAgentManager.logActivity(
        agent.id,
        "criar_tarefa_melhorada",
        { 
          tarefa_id: tarefa.id,
          title: tarefa.title,
          priority: tarefa.priority,
          strategic_impact: tarefa.strategic_impact,
          estimated_roi: tarefa.estimated_roi
        }
      );
      
      // Disparar evento de webhook se algum agente estiver interessado
      externalAgentManager.broadcastEvent(
        "tarefa_melhorada_criada",
        {
          tarefa_id: tarefa.id,
          title: tarefa.title,
          description: tarefa.description,
          priority: tarefa.priority,
          strategic_impact: tarefa.strategic_impact,
          estimated_roi: tarefa.estimated_roi,
          impact_areas: tarefa.impact_areas,
          state: tarefa.state,
          created_by: {
            agent_id: agent.id,
            agent_name: agent.name,
            agent_type: agent.metadata.type
          },
          created_at: tarefa.created_at
        }
      ).catch(err => {
        console.warn("Erro ao notificar webhooks sobre criação de tarefa:", err);
      });
      
      return res.status(201).json({
        success: true,
        mensagem: "Tarefa melhorada criada com sucesso",
        tarefa: tarefa
      });
    } catch (error) {
      console.error("Erro ao criar tarefa melhorada:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error.message
      });
    }
  });
  
  // Endpoint para atualizar tarefas melhoradas
  app.put("/api/tarefas-melhoradas/:id", async (req, res) => {
    try {
      const { token } = req.body;
      const tarefaId = parseInt(req.params.id);
      
      if (isNaN(tarefaId)) {
        return res.status(400).json({
          success: false,
          mensagem: "ID da tarefa inválido"
        });
      }
      
      // Validação do token usando o gerenciador de agentes externos
      const agent = externalAgentManager.validateToken(token);
      
      if (!agent) {
        console.warn('Tentativa de acesso não autorizado ao endpoint /api/tarefas-melhoradas');
        return res.status(401).json({ 
          success: false, 
          mensagem: "Acesso não autorizado. Token inválido ou agente não registrado." 
        });
      }
      
      // Verificar permissão para atualizar tarefas
      if (!agent.permissions.updateTasks) {
        return res.status(403).json({
          success: false,
          mensagem: "O agente não tem permissão para atualizar tarefas melhoradas."
        });
      }
      
      // Verificar se a tarefa existe
      const tarefaExistente = await storage.getEnhancedTask(tarefaId);
      if (!tarefaExistente) {
        return res.status(404).json({
          success: false,
          mensagem: "Tarefa não encontrada"
        });
      }
      
      // Extrair dados atualizados
      const { title, description, state, priority, strategic_impact, estimated_roi, impact_areas, assigned_to } = req.body;
      
      // Atualizar tarefa
      const tarefaAtualizada = await storage.updateEnhancedTask(tarefaId, {
        title,
        description,
        state,
        priority,
        strategic_impact,
        estimated_roi,
        impact_areas,
        assigned_to
      });
      
      console.log(`[${agent.name}] Tarefa atualizada: ${tarefaId} - Novo estado: ${state || tarefaExistente.state}`);
      
      // Registrar a atividade no gerenciador de agentes externos
      externalAgentManager.logActivity(
        agent.id,
        "atualizar_tarefa_melhorada",
        { 
          tarefa_id: tarefaId,
          novo_estado: state || tarefaExistente.state,
          descricao_atualizada: Boolean(description && description !== tarefaExistente.description)
        }
      );
      
      // Disparar evento de webhook se algum agente estiver interessado e se a tarefa foi atualizada com sucesso
      if (tarefaAtualizada) {
        // Verificar se houve mudança de estado, pois isso é importante para outros sistemas
        const estadoMudou = state && state !== tarefaExistente.state;
        const tipoEvento = estadoMudou ? "tarefa_melhorada_estado_alterado" : "tarefa_melhorada_atualizada";
        
        externalAgentManager.broadcastEvent(
          tipoEvento,
          {
            tarefa_id: tarefaId,
            title: tarefaAtualizada.title,
            estado_anterior: tarefaExistente.state,
            estado_atual: tarefaAtualizada.state,
            updated_by: {
              agent_id: agent.id,
              agent_name: agent.name,
              agent_type: agent.metadata.type
            },
            updated_at: tarefaAtualizada.updated_at,
            mudancas: {
              titulo: title && title !== tarefaExistente.title,
              descricao: description && description !== tarefaExistente.description,
              prioridade: priority && priority !== tarefaExistente.priority,
              impacto_estrategico: strategic_impact && strategic_impact !== tarefaExistente.strategic_impact
            },
            campos_atualizados: Object.keys(req.body).filter(k => 
              k !== 'token' && req.body[k] !== undefined
            )
          }
        ).catch(err => {
          console.warn("Erro ao notificar webhooks sobre atualização de tarefa:", err);
        });
      }
      
      return res.status(200).json({
        success: true,
        mensagem: "Tarefa atualizada com sucesso",
        tarefa: tarefaAtualizada
      });
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error.message
      });
    }
  });
  
  // Endpoint para listar tarefas melhoradas
  app.get("/api/tarefas-melhoradas", async (req, res) => {
    try {
      const { state, priority, limit } = req.query;
      const parsedLimit = limit ? parseInt(limit as string) : undefined;
      
      const tarefas = await storage.getEnhancedTasks(
        state as string,
        priority as string,
        parsedLimit
      );
      
      return res.status(200).json(tarefas);
    } catch (error) {
      console.error("Erro ao listar tarefas melhoradas:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error.message
      });
    }
  });
  
  // Endpoint para obter tarefa melhorada específica
  app.get("/api/tarefas-melhoradas/:id", async (req, res) => {
    try {
      const tarefaId = parseInt(req.params.id);
      
      if (isNaN(tarefaId)) {
        return res.status(400).json({
          success: false,
          mensagem: "ID da tarefa inválido"
        });
      }
      
      const tarefa = await storage.getEnhancedTask(tarefaId);
      
      if (!tarefa) {
        return res.status(404).json({
          success: false,
          mensagem: "Tarefa não encontrada"
        });
      }
      
      return res.status(200).json(tarefa);
    } catch (error) {
      console.error("Erro ao obter tarefa melhorada:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error.message
      });
    }
  });
  
  // Endpoint para listar decisões estratégicas
  app.get("/api/decisoes-estrategicas", async (req, res) => {
    try {
      const { user_id, area, limit } = req.query;
      const parsedUserId = user_id ? parseInt(user_id as string) : undefined;
      const parsedLimit = limit ? parseInt(limit as string) : undefined;
      
      const decisoes = await storage.getStrategicDecisions(
        parsedUserId,
        area as string,
        parsedLimit
      );
      
      return res.status(200).json(decisoes);
    } catch (error) {
      console.error("Erro ao listar decisões estratégicas:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error.message
      });
    }
  });
  
  // Endpoint para obter decisão estratégica específica
  app.get("/api/decisoes-estrategicas/:id", async (req, res) => {
    try {
      const decisaoId = parseInt(req.params.id);
      
      if (isNaN(decisaoId)) {
        return res.status(400).json({
          success: false,
          mensagem: "ID da decisão inválido"
        });
      }
      
      const decisao = await storage.getStrategicDecision(decisaoId);
      
      if (!decisao) {
        return res.status(404).json({
          success: false,
          mensagem: "Decisão estratégica não encontrada"
        });
      }
      
      return res.status(200).json(decisao);
    } catch (error) {
      console.error("Erro ao obter decisão estratégica:", error);
      res.status(500).json({
        success: false,
        mensagem: "Erro interno ao processar a solicitação",
        erro: error.message
      });
    }
  });
  
  app.post("/api/gpt-inteligencia", async (req, res) => {
    try {
      const { comando, contexto, token } = req.body;
      
      // Validação do token usando o gerenciador de agentes externos
      const agent = externalAgentManager.validateToken(token);
      
      if (!agent) {
        console.warn('Tentativa de acesso não autorizado ao endpoint /api/gpt-inteligencia');
        return res.status(401).json({ 
          success: false, 
          mensagem: "Acesso não autorizado. Token inválido ou agente não registrado." 
        });
      }
      
      console.log(`[${agent.name}] Comando recebido: ${comando} (Contexto: ${contexto || 'geral'})`);
      
      // Obter o conector da API para executar ações
      const apiConector = getJsPythonConnector();
      
      // Variável para guardar o resultado da ação
      let resultado = null;
      let acao = "comando_generico";
      
      // Processar diferentes tipos de comandos
      if (comando.startsWith('tarefa:')) {
        // Verificar permissão
        if (!agent.permissions.createTasks) {
          return res.status(403).json({
            success: false,
            mensagem: "O agente não tem permissão para criar tarefas."
          });
        }
        
        // Criar uma nova tarefa
        const dadosTarefa = {
          titulo: comando.replace('tarefa:', '').trim(),
          descricao: contexto || 'Tarefa criada pela IA externa',
          estado: "pendente",
          prioridade: "normal"
        };
        
        resultado = await apiConector.createTask(dadosTarefa);
        acao = "criar_tarefa";
        console.log(`[${agent.name}] Tarefa criada: ${resultado.id}`);
      } 
      else if (comando.startsWith('diagnostico:')) {
        // Verificar permissão
        if (!agent.permissions.createDiagnostics) {
          return res.status(403).json({
            success: false,
            mensagem: "O agente não tem permissão para criar diagnósticos."
          });
        }
        
        // Criar um diagnóstico
        const dadosDiagnostico = {
          tipo: 'sistema',
          descricao: comando.replace('diagnostico:', '').trim(),
          severidade: 'info',
          detalhes: { 
            origem: agent.name, 
            agente_id: agent.id,
            contexto 
          }
        };
        
        resultado = await apiConector.createDiagnostic(dadosDiagnostico);
        acao = "criar_diagnostico";
        console.log(`[${agent.name}] Diagnóstico criado: ${resultado.id}`);
      }
      else if (comando.startsWith('sugestao:')) {
        // Verificar permissão
        if (!agent.permissions.createSuggestions) {
          return res.status(403).json({
            success: false,
            mensagem: "O agente não tem permissão para criar sugestões."
          });
        }
        
        // Criar uma sugestão
        const dadosSugestao = {
          tipo: 'otimizacao',
          titulo: comando.replace('sugestao:', '').trim(),
          descricao: contexto || 'Sugestão criada pela IA externa',
          prioridade: 'media',
          implementada: false
        };
        
        resultado = await apiConector.createSuggestion(dadosSugestao);
        acao = "criar_sugestao";
        console.log(`[${agent.name}] Sugestão criada: ${resultado.id}`);
      }
      else if (comando.startsWith('buscar:')) {
        // Verificar permissão
        if (!agent.permissions.querySystem) {
          return res.status(403).json({
            success: false,
            mensagem: "O agente não tem permissão para consultar o sistema."
          });
        }
        
        // Buscar informações do sistema
        const termosBusca = comando.replace('buscar:', '').trim();
        
        if (termosBusca === 'tarefas') {
          resultado = await apiConector.listTasks();
          acao = "listar_tarefas";
        } 
        else if (termosBusca === 'diagnosticos') {
          resultado = await apiConector.listDiagnostics();
          acao = "listar_diagnosticos";
        }
        else if (termosBusca === 'sugestoes') {
          resultado = await apiConector.listSuggestions();
          acao = "listar_sugestoes";
        }
        else if (termosBusca === 'status') {
          resultado = await apiConector.getStatus();
          acao = "obter_status";
        }
        else {
          resultado = { mensagem: `Tipo de busca não reconhecido: ${termosBusca}` };
          acao = "busca_invalida";
        }
      }
      else if (comando.startsWith('relatorio:')) {
        // Verificar permissão
        if (!agent.permissions.generateReports) {
          return res.status(403).json({
            success: false,
            mensagem: "O agente não tem permissão para gerar relatórios."
          });
        }
        
        // Para demonstração, apenas retorna dados simulados
        resultado = { 
          titulo: comando.replace('relatorio:', '').trim(),
          gerado_em: new Date().toISOString(),
          conteudo: "Relatório gerado com sucesso. Os dados detalhados serão implementados em breve.",
          agente: agent.name
        };
        acao = "gerar_relatorio";
      }
      else {
        // Para comandos genéricos, apenas registra e responde
        console.log(`[${agent.name}] Comando genérico processado`);
        resultado = { 
          mensagem: "Comando processado com sucesso", 
          tipo: "genérico",
          timestamp: new Date().toISOString()
        };
      }
      
      // Registrar a atividade do agente
      externalAgentManager.logActivity(agent.id, acao, {
        comando,
        contexto,
        resultado_id: resultado?.id,
        timestamp: new Date().toISOString()
      });
      
      // Responder com o resultado da operação
      res.status(200).json({
        success: true,
        agente: {
          id: agent.id,
          nome: agent.name
        },
        resultado,
        mensagem: "Comando processado com sucesso"
      });
      
    } catch (error) {
      console.error('Erro ao processar comando da IA externa:', error);
      res.status(500).json({ 
        success: false, 
        mensagem: "Erro ao processar comando", 
        erro: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  });

  // Rotas para sistema de agentes especializados
  
  // Rota para listar templates de agentes disponíveis
  app.get("/api/agentes-especializados/templates", async (req, res) => {
    try {
      // Importação do AgentFactory
      const agentFactory = await import('./services/specialized-agents/agent-factory').then(m => m.default);
      
      // Obtém a lista de templates disponíveis
      const templatesDisponiveis = agentFactory.listAvailableTemplates();
      
      res.json(templatesDisponiveis);
    } catch (error: unknown) {
      console.error("Erro ao listar templates de agentes:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao listar templates de agentes"
      });
    }
  });
  
  app.get("/api/agentes-especializados", async (req, res) => {
    try {
      // Inicializa o sistema de agentes se ainda não estiver inicializado
      if (!agentSystem.getActiveAgents().length) {
        await agentSystem.initialize();
      }
      
      // Obtém a lista de agentes ativos
      const agentesAtivos = agentSystem.getActiveAgents().map(agent => ({
        id: agent.id,
        nome: agent.name,
        dominio: agent.domain,
        versao: agent.version,
        descricao: agent.description,
        capacidades: agent.capabilities,
        estatisticas: agent.stats
      }));
      
      res.json(agentesAtivos);
    } catch (error: unknown) {
      console.error("Erro ao listar agentes especializados:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao listar agentes especializados"
      });
    }
  });
  
  app.get("/api/agentes-especializados/estatisticas", async (req, res) => {
    try {
      // Inicializa o sistema de agentes se ainda não estiver inicializado
      if (!agentSystem.getActiveAgents().length) {
        await agentSystem.initialize();
      }
      
      // Obtém estatísticas do sistema
      const estatisticas = agentSystem.getSystemStats();
      res.json(estatisticas);
    } catch (error: unknown) {
      console.error("Erro ao obter estatísticas do sistema de agentes:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao obter estatísticas do sistema de agentes"
      });
    }
  });
  
  app.get("/api/agentes-especializados/:agentId", async (req, res) => {
    try {
      const { agentId } = req.params;
      
      // Inicializa o sistema de agentes se ainda não estiver inicializado
      if (!agentSystem.getActiveAgents().length) {
        await agentSystem.initialize();
      }
      
      // Obtém o agente específico
      const agente = agentSystem.getActiveAgents().find(a => a.id === agentId);
      
      if (!agente) {
        return res.status(404).json({
          success: false,
          message: "Agente especializado não encontrado"
        });
      }
      
      res.json({
        id: agente.id,
        nome: agente.name,
        dominio: agente.domain,
        versao: agente.version,
        descricao: agente.description,
        capacidades: agente.capabilities,
        estatisticas: agente.stats
      });
    } catch (error: unknown) {
      console.error("Erro ao obter detalhes do agente especializado:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao obter detalhes do agente especializado"
      });
    }
  });
  
  app.post("/api/agentes-especializados/processar", async (req, res) => {
    try {
      const { consulta, requisicao, dominio, agente_id, parametros } = req.body;
      
      // Aceita tanto consulta quanto requisicao como entrada
      const queryText = consulta || requisicao;
      
      if (!queryText) {
        return res.status(400).json({
          success: false,
          message: "A consulta/requisição é obrigatória"
        });
      }
      
      // Inicializa o sistema de agentes se ainda não estiver inicializado
      if (!agentSystem.getActiveAgents().length) {
        await agentSystem.initialize();
      }
      
      // Processa a solicitação 
      const processRequest = {
        query: queryText,
        domain: dominio || null,
        agentId: agente_id || null, // Suporte para ID do agente específico
        parameters: parametros || {}, // Parâmetros adicionais
        timestamp: new Date().toISOString(),
        userId: 1, // Placeholder para o ID do usuário real
        contextData: req.body.contexto || {}
      };
      
      const response = await agentSystem.processRequest(processRequest);
      res.json(response);
    } catch (error: unknown) {
      console.error("Erro ao processar consulta por agentes especializados:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao processar consulta por agentes especializados"
      });
    }
  });
  
  app.post("/api/agentes-especializados/criar", async (req, res) => {
    try {
      const { dominio, nome } = req.body;
      
      if (!dominio) {
        return res.status(400).json({
          success: false,
          message: "O domínio do agente é obrigatório"
        });
      }
      
      // Inicializa o sistema de agentes se ainda não estiver inicializado
      if (!agentSystem.getActiveAgents().length) {
        await agentSystem.initialize();
      }
      
      // Cria e registra o novo agente
      const novoAgente = await agentSystem.createAndRegisterAgent(dominio, nome);
      
      if (!novoAgente) {
        return res.status(400).json({
          success: false,
          message: `Não foi possível criar agente de domínio '${dominio}'`
        });
      }
      
      res.status(201).json({
        success: true,
        message: `Agente ${novoAgente.name} criado com sucesso`,
        agente: {
          id: novoAgente.id,
          nome: novoAgente.name,
          dominio: novoAgente.domain,
          versao: novoAgente.version,
          descricao: novoAgente.description
        }
      });
    } catch (error: unknown) {
      console.error("Erro ao criar novo agente especializado:", error);
      res.status(500).json({
        success: false,
        message: "Erro ao criar novo agente especializado"
      });
    }
  });

  // Endpoint para o Bot GPT-Agent
  app.post("/api/bot-gpt-agent", async (req, res) => {
    try {
      const token = req.headers['authorization'];

      // Validar o token para autorização
      if (token !== `Bearer luiz2024legadoimparavel`) {
        return res.status(403).json({ erro: 'Token inválido' });
      }

      const comando: ComandoGPT = req.body;
      
      // Validar o formato do comando
      if (!comando || !comando.tipo || !comando.conteudo) {
        return res.status(400).json({ 
          status: 'erro',
          mensagem: 'Formato de comando inválido. É necessário informar "tipo" e "conteudo".'
        });
      }

      // Processar o comando
      console.log(`[GPT-Agent] Recebido comando: ${comando.tipo} - "${comando.conteudo}"`);
      const resultado = await processarComando(comando);
      
      res.json(resultado);
    } catch (error) {
      console.error('[GPT-Agent] Erro ao processar comando:', error);
      res.status(500).json({
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro interno no servidor',
      });
    }
  });

  // Endpoint para obter histórico de comandos do GPT-Agent
  app.get("/api/bot-gpt-agent/historico", async (req, res) => {
    try {
      const token = req.headers['authorization'];

      // Validar o token para autorização
      if (token !== `Bearer luiz2024legadoimparavel`) {
        return res.status(403).json({ erro: 'Token inválido' });
      }

      const limite = req.query.limite ? parseInt(req.query.limite as string) : 100;
      const historico = obterHistoricoComandos(limite);
      
      res.json({
        status: 'sucesso',
        total: historico.length,
        historico
      });
    } catch (error) {
      console.error('[GPT-Agent] Erro ao obter histórico:', error);
      res.status(500).json({
        status: 'erro',
        mensagem: error instanceof Error ? error.message : 'Erro interno no servidor',
      });
    }
  });

  // Caixas de Comando Inteligente para comandos diretos das IAs
  app.use('/api/comando-inteligente', (await import('./services/comando-inteligente')).default);
  console.log('📦 Caixa de Comando Inteligente instalada e pronta para uso');

  const httpServer = createServer(app);
  return httpServer;
}
