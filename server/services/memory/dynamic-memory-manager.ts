import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { openaiClient } from '../../openai';

/**
 * Interface para versão de memória
 */
export interface MemoryVersion {
  content: string;
  timestamp: string;
  embeddingVector?: number[];
  importance: number;
  metadata?: any;
  changedBy?: string;
  changeReason?: string;
}

/**
 * Interface para memórias armazenadas
 */
export interface Memory {
  id: string;
  type: string;
  content: string;
  embeddingVector?: number[];
  timestamp: string;
  lastAccessed?: string;
  importance: number;
  metadata?: any;
  version: number;
  versionHistory: MemoryVersion[];
}

/**
 * Interface para consulta de memórias
 */
export interface MemoryQuery {
  query?: string;
  type?: string;
  limit?: number;
  minImportance?: number;
  metadata?: any;
}

/**
 * Interface para armazenamento de memórias
 */
export interface MemoryStorage {
  id?: string;
  type: string;
  content: string;
  metadata?: any;
  importance?: number;
}

/**
 * Gerenciador de Memória Dinâmica
 * Permite armazenar e recuperar memórias com relevância contextual
 */
export class DynamicMemoryManager {
  private static instance: DynamicMemoryManager;
  private memories: Memory[] = [];
  private filePath: string;
  private initialized: boolean = false;
  private lastConsolidation: Date = new Date();

  /**
   * Construtor privado para Singleton
   */
  private constructor() {
    this.filePath = path.join(process.cwd(), 'data', 'memories.json');
    this.loadMemories();
    
    // Agendar consolidação periódica
    setInterval(() => this.consolidateMemories(), 24 * 60 * 60 * 1000); // Diariamente
  }

  /**
   * Obtém a instância do gerenciador
   */
  public static getInstance(): DynamicMemoryManager {
    if (!DynamicMemoryManager.instance) {
      DynamicMemoryManager.instance = new DynamicMemoryManager();
    }
    return DynamicMemoryManager.instance;
  }

  /**
   * Carrega as memórias do arquivo
   */
  private async loadMemories(): Promise<void> {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        this.memories = JSON.parse(data);
        console.log(`[DynamicMemoryManager] Carregadas ${this.memories.length} memórias`);
      } else {
        console.log('[DynamicMemoryManager] Arquivo de memórias não encontrado, iniciando com memória vazia');
        this.memories = [];
        this.saveMemories();
      }
      this.initialized = true;
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao carregar memórias:', error);
      this.memories = [];
      this.initialized = true;
    }
  }

  /**
   * Salva as memórias no arquivo
   */
  private saveMemories(): void {
    try {
      if (!fs.existsSync(path.dirname(this.filePath))) {
        fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.memories, null, 2), 'utf8');
      console.log(`[DynamicMemoryManager] Salvas ${this.memories.length} memórias`);
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao salvar memórias:', error);
    }
  }

  /**
   * Gera embedding para o conteúdo usando OpenAI
   */
  private async generateEmbedding(content: string): Promise<number[] | undefined> {
    try {
      // Aqui implementaremos a chamada para a API de embeddings da OpenAI
      // Por enquanto, retornamos um vetor simulado
      return Array(1536).fill(0).map(() => Math.random() - 0.5);
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao gerar embedding:', error);
      return undefined;
    }
  }

  /**
   * Calcula a similaridade de coseno entre dois vetores de embedding
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Armazena uma nova memória
   */
  public async storeMemory(memoryData: MemoryStorage): Promise<string> {
    if (!this.initialized) {
      await new Promise<void>(resolve => {
        const checkInitialized = () => {
          if (this.initialized) {
            resolve();
          } else {
            setTimeout(checkInitialized, 100);
          }
        };
        checkInitialized();
      });
    }
    
    try {
      const embedding = await this.generateEmbedding(memoryData.content);
      
      const currentTime = new Date().toISOString();
      const calculatedImportance = memoryData.importance || this.calculateImportance(memoryData);
      
      const memory: Memory = {
        id: memoryData.id || uuidv4(),
        type: memoryData.type,
        content: memoryData.content,
        embeddingVector: embedding,
        timestamp: currentTime,
        importance: calculatedImportance,
        metadata: memoryData.metadata || {},
        version: 1,
        versionHistory: []
      };
      
      this.memories.push(memory);
      this.saveMemories();
      
      return memory.id;
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao armazenar memória:', error);
      throw error;
    }
  }

  /**
   * Calcula a importância da memória com base no tipo e conteúdo
   */
  private calculateImportance(memoryData: MemoryStorage): number {
    // Valores iniciais de importância por tipo
    const typeImportance: Record<string, number> = {
      'goal': 0.8,
      'conversation': 0.5,
      'decision': 0.9,
      'learning': 0.85,
      'reflection': 0.7,
      'observation': 0.6,
      'strategic_insight': 0.95,
      'profile_trends': 0.75,
      'goal_progress': 0.65
    };
    
    // Importância base pelo tipo
    let importance = typeImportance[memoryData.type] || 0.5;
    
    // Ajusta importância com base no comprimento do conteúdo
    // Conteúdos mais longos são geralmente mais informativos
    const contentLength = memoryData.content.length;
    if (contentLength > 500) {
      importance += 0.1;
    } else if (contentLength < 50) {
      importance -= 0.1;
    }
    
    // Ajusta com base em palavras-chave importantes
    const importantKeywords = [
      'urgente', 'prioritário', 'crucial', 'crítico', 'importante',
      'prazo', 'deadline', 'meta', 'objetivo', 'decisão',
      'estratégia', 'inovação', 'oportunidade', 'risco'
    ];
    
    const content = memoryData.content.toLowerCase();
    for (const keyword of importantKeywords) {
      if (content.includes(keyword)) {
        importance += 0.05;
        break; // Limita o aumento a 0.05 mesmo que haja várias palavras-chave
      }
    }
    
    // Metadados podem alterar importância
    if (memoryData.metadata) {
      // Se há uma prioridade explícita no metadata
      if (memoryData.metadata.priority === 'high') {
        importance += 0.15;
      } else if (memoryData.metadata.priority === 'low') {
        importance -= 0.15;
      }
      
      // Se está relacionado a uma decisão ou meta específica
      if (memoryData.metadata.decisionId || memoryData.metadata.goalId) {
        importance += 0.1;
      }
    }
    
    // Limita entre 0 e 1
    return Math.max(0, Math.min(1, importance));
  }

  /**
   * Recupera memórias relevantes com base em uma consulta
   */
  public async retrieveMemories(query: MemoryQuery): Promise<Memory[]> {
    if (!this.initialized) {
      await new Promise<void>(resolve => {
        const checkInitialized = () => {
          if (this.initialized) {
            resolve();
          } else {
            setTimeout(checkInitialized, 100);
          }
        };
        checkInitialized();
      });
    }
    
    try {
      // Limite padrão
      const limit = query.limit || 10;
      
      // Filtro por tipo
      let filteredMemories = query.type 
        ? this.memories.filter(memory => memory.type === query.type)
        : [...this.memories];
      
      // Filtro por importância mínima
      if (query.minImportance !== undefined) {
        filteredMemories = filteredMemories.filter(
          memory => memory.importance >= query.minImportance!
        );
      }
      
      // Filtro por metadados
      if (query.metadata) {
        filteredMemories = filteredMemories.filter(memory => {
          if (!memory.metadata) return false;
          
          for (const [key, value] of Object.entries(query.metadata!)) {
            if (memory.metadata[key] !== value) {
              return false;
            }
          }
          
          return true;
        });
      }
      
      // Se não houver consulta de texto, retorna por ordem de importância
      if (!query.query) {
        return filteredMemories
          .sort((a, b) => b.importance - a.importance)
          .slice(0, limit)
          .map(memory => this.markMemoryAccessed(memory));
      }
      
      // Gera embedding para a consulta
      const queryEmbedding = await this.generateEmbedding(query.query);
      
      if (!queryEmbedding) {
        // Fallback para busca por importância se não conseguir gerar embedding
        return filteredMemories
          .sort((a, b) => b.importance - a.importance)
          .slice(0, limit)
          .map(memory => this.markMemoryAccessed(memory));
      }
      
      // Calcula similaridade com cada memória
      const scoredMemories = filteredMemories
        .filter(memory => memory.embeddingVector !== undefined)
        .map(memory => ({
          memory,
          score: this.cosineSimilarity(queryEmbedding, memory.embeddingVector!)
        }));
      
      // Ordena por pontuação (combinação de similaridade e importância)
      const result = scoredMemories
        .sort((a, b) => {
          // Pontuação combinada: 70% similaridade + 30% importância
          const scoreA = (a.score * 0.7) + (a.memory.importance * 0.3);
          const scoreB = (b.score * 0.7) + (b.memory.importance * 0.3);
          return scoreB - scoreA;
        })
        .slice(0, limit)
        .map(item => this.markMemoryAccessed(item.memory));
      
      return result;
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao recuperar memórias:', error);
      return [];
    }
  }

  /**
   * Marca uma memória como acessada, atualizando seu timestamp de último acesso
   */
  private markMemoryAccessed(memory: Memory): Memory {
    const index = this.memories.findIndex(m => m.id === memory.id);
    if (index !== -1) {
      this.memories[index].lastAccessed = new Date().toISOString();
    }
    return {
      ...memory,
      lastAccessed: new Date().toISOString()
    };
  }

  /**
   * Atualiza uma memória existente com versões
   * @param id ID da memória a ser atualizada
   * @param updates Atualizações a serem aplicadas
   * @param changedBy Identificador de quem está realizando a alteração
   * @param changeReason Razão da alteração (opcional)
   */
  public async updateMemory(
    id: string, 
    updates: Partial<Omit<Memory, 'id'>>, 
    changedBy: string = 'system',
    changeReason?: string
  ): Promise<boolean> {
    try {
      const index = this.memories.findIndex(memory => memory.id === id);
      
      if (index === -1) {
        console.error(`[DynamicMemoryManager] Memória com ID ${id} não encontrada`);
        return false;
      }

      const oldMemory = this.memories[index];
      const currentTime = new Date().toISOString();
      
      // Se o conteúdo for alterado, regenera o embedding
      let newEmbedding = oldMemory.embeddingVector;
      if (updates.content && updates.content !== oldMemory.content) {
        newEmbedding = await this.generateEmbedding(updates.content);
      }
      
      // Prepara a versão atual para o histórico
      const currentVersion: MemoryVersion = {
        content: oldMemory.content,
        timestamp: oldMemory.timestamp,
        embeddingVector: oldMemory.embeddingVector,
        importance: oldMemory.importance,
        metadata: oldMemory.metadata
      };
      
      // Verifica se o histórico de versões já existe e adiciona a versão atual
      const versionHistory = oldMemory.versionHistory || [];
      versionHistory.push({
        ...currentVersion,
        changedBy,
        changeReason
      });
      
      // Atualiza a memória com a nova versão
      this.memories[index] = {
        ...oldMemory,
        ...updates,
        embeddingVector: updates.content ? newEmbedding : oldMemory.embeddingVector,
        timestamp: updates.timestamp || currentTime,
        version: (oldMemory.version || 1) + 1,
        versionHistory
      };
      
      console.log(`[DynamicMemoryManager] Memória ${id} atualizada para versão ${this.memories[index].version}`);
      this.saveMemories();
      return true;
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao atualizar memória:', error);
      return false;
    }
  }
  
  /**
   * Recupera histórico completo de versões de uma memória
   * @param id ID da memória 
   * @returns Histórico de versões ou null se não encontrada
   */
  public getMemoryVersionHistory(id: string): { current: Memory, history: MemoryVersion[] } | null {
    try {
      const memory = this.memories.find(m => m.id === id);
      
      if (!memory) {
        console.error(`[DynamicMemoryManager] Memória com ID ${id} não encontrada`);
        return null;
      }
      
      return {
        current: memory,
        history: memory.versionHistory || []
      };
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao recuperar histórico de versões:', error);
      return null;
    }
  }

  /**
   * Remove uma memória
   */
  public removeMemory(id: string): boolean {
    try {
      const initialLength = this.memories.length;
      this.memories = this.memories.filter(memory => memory.id !== id);
      
      if (this.memories.length !== initialLength) {
        this.saveMemories();
        return true;
      }
      
      console.error(`[DynamicMemoryManager] Memória com ID ${id} não encontrada para remoção`);
      return false;
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao remover memória:', error);
      return false;
    }
  }

  /**
   * Consolida memórias, combinando informações relacionadas e removendo redundâncias
   */
  private async consolidateMemories(): Promise<void> {
    try {
      console.log('[DynamicMemoryManager] Iniciando consolidação de memórias...');
      
      // Frequência máxima de consolidação (uma vez por dia)
      const now = new Date();
      const hoursSinceLastConsolidation = 
        (now.getTime() - this.lastConsolidation.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastConsolidation < 24) {
        console.log('[DynamicMemoryManager] Consolidação já realizada nas últimas 24h. Pulando.');
        return;
      }
      
      // Agrupa memórias por tipo
      const memoriesByType: Record<string, Memory[]> = {};
      
      this.memories.forEach(memory => {
        if (!memoriesByType[memory.type]) {
          memoriesByType[memory.type] = [];
        }
        memoriesByType[memory.type].push(memory);
      });
      
      // Para cada tipo, consolida memórias relacionadas
      for (const [type, typeMemories] of Object.entries(memoriesByType)) {
        // Pula tipos com poucas memórias
        if (typeMemories.length < 5) continue;
        
        // Ordena por data mais recente
        const sortedMemories = [...typeMemories]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Analisa as 10 memórias mais recentes para criar resumos
        if (sortedMemories.length >= 5) {
          const recentMemories = sortedMemories.slice(0, 10);
          
          // Se forem memórias de conversação, cria um resumo
          if (type === 'conversation') {
            await this.consolidateConversations(recentMemories);
          }
          
          // Se forem aprendizados, cria um resumo de padrões
          if (type === 'learning') {
            await this.consolidateLearnings(recentMemories);
          }
          
          // Se forem insights estratégicos, consolida em direções
          if (type === 'strategic_insight') {
            await this.consolidateInsights(recentMemories);
          }
        }
      }
      
      // Atualiza timestamp da última consolidação
      this.lastConsolidation = now;
      console.log('[DynamicMemoryManager] Consolidação de memórias concluída');
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro na consolidação de memórias:', error);
    }
  }

  /**
   * Consolida memórias de conversação em um resumo
   */
  private async consolidateConversations(conversations: Memory[]): Promise<void> {
    try {
      // Prepara conteúdo para análise
      const conversationTexts = conversations
        .map(conv => `Data: ${new Date(conv.timestamp).toLocaleString('pt-BR')}\nConteúdo: ${conv.content}`)
        .join('\n\n');
      
      // Gera resumo usando OpenAI
      const prompt = `Analise as seguintes conversas e extraia os principais temas, preocupações e interesses recorrentes:\n\n${conversationTexts}\n\nResuma em um parágrafo conciso os padrões e temas principais dessas conversas.`;
      
      let content: string;
      
      try {
        const response = await openaiClient.generateChatResponse(prompt, {
          userId: 1, // Usuário padrão
          systemPrompt: "Você é um assistente de análise de conversas que identifica padrões e temas recorrentes. Seja conciso e objetivo."
        });
        
        // Extrai o conteúdo, lidando com diferentes formatos de resposta
        content = typeof response === 'object' ? 
          (response.message || (response as any).text || JSON.stringify(response)) :
          String(response);
      } catch (aiError) {
        console.error('[DynamicMemoryManager] Erro ao gerar resumo de conversas com IA:', aiError);
        return; // Interrompe a execução se falhar a geração com IA
      }
      
      // Armazena o resumo como uma nova memória
      try {
        await this.storeMemory({
          type: 'conversation_summary',
          content,
          metadata: {
            period: {
              start: conversations[conversations.length - 1].timestamp,
              end: conversations[0].timestamp
            },
            conversationsAnalyzed: conversations.length,
            conversationIds: conversations.map(c => c.id)
          },
          importance: 0.9 // Resumos têm alta importância
        });
        
        console.log('[DynamicMemoryManager] Conversas consolidadas em um resumo');
      } catch (storageError) {
        console.error('[DynamicMemoryManager] Erro ao armazenar resumo de conversas:', storageError);
      }
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao consolidar conversas:', error);
    }
  }

  /**
   * Consolida memórias de aprendizado em padrões
   */
  private async consolidateLearnings(learnings: Memory[]): Promise<void> {
    try {
      // Prepara conteúdo para análise
      const learningTexts = learnings
        .map(learning => `Categoria: ${learning.metadata?.category || 'N/A'}\nAprendizado: ${learning.content}`)
        .join('\n\n');
      
      // Gera padrões usando OpenAI
      const prompt = `Analise os seguintes aprendizados e identifique padrões, tendências ou conexões entre eles:\n\n${learningTexts}\n\nDescreva 1-2 insights sobre esses aprendizados e como eles se relacionam.`;
      
      let content: string;
      
      try {
        const response = await openaiClient.generateChatResponse(prompt, {
          userId: 1, // Usuário padrão
          systemPrompt: "Você é um assistente especializado em identificar padrões em aprendizados e criar insights significativos. Seja conciso e objetivo."
        });
        
        // Extrai o conteúdo, lidando com diferentes formatos de resposta
        content = typeof response === 'object' ? 
          (response.message || (response as any).text || JSON.stringify(response)) :
          String(response);
      } catch (aiError) {
        console.error('[DynamicMemoryManager] Erro ao gerar padrões com IA:', aiError);
        return; // Interrompe a execução se falhar a geração com IA
      }
          
      // Armazena o padrão como uma nova memória
      try {
        await this.storeMemory({
          type: 'learning_pattern',
          content,
          metadata: {
            period: {
              start: learnings[learnings.length - 1].timestamp,
              end: learnings[0].timestamp
            },
            learningsAnalyzed: learnings.length,
            learningIds: learnings.map(l => l.id)
          },
          importance: 0.85 // Padrões de aprendizado têm alta importância
        });
        
        console.log('[DynamicMemoryManager] Aprendizados consolidados em padrões');
      } catch (storageError) {
        console.error('[DynamicMemoryManager] Erro ao armazenar padrão de aprendizado:', storageError);
      }
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao consolidar aprendizados:', error);
    }
  }

  /**
   * Consolida insights estratégicos em direções
   */
  private async consolidateInsights(insights: Memory[]): Promise<void> {
    try {
      // Prepara conteúdo para análise
      const insightTexts = insights
        .map(insight => `Categoria: ${insight.metadata?.category || 'N/A'}\nInsight: ${insight.content}`)
        .join('\n\n');
      
      // Gera direções usando OpenAI
      const prompt = `Analise os seguintes insights estratégicos e sintetize-os em direções ou áreas de foco claras:\n\n${insightTexts}\n\nResuma em 1-2 direções estratégicas concretas baseadas nesses insights.`;
      
      let content: string;
      
      try {
        const response = await openaiClient.generateChatResponse(prompt, {
          userId: 1, // Usuário padrão
          systemPrompt: "Você é um consultor estratégico especializado em identificar direções claras a partir de múltiplos insights. Seja conciso, objetivo e prático."
        });
        
        // Extrai o conteúdo, lidando com diferentes formatos de resposta
        content = typeof response === 'object' ? 
          (response.message || (response as any).text || JSON.stringify(response)) :
          String(response);
      } catch (aiError) {
        console.error('[DynamicMemoryManager] Erro ao gerar direções estratégicas com IA:', aiError);
        return; // Interrompe a execução se falhar a geração com IA
      }
      
      // Armazena as direções como uma nova memória
      try {
        await this.storeMemory({
          type: 'strategic_direction',
          content,
          metadata: {
            period: {
              start: insights[insights.length - 1].timestamp,
              end: insights[0].timestamp
            },
            insightsAnalyzed: insights.length,
            insightIds: insights.map(i => i.id)
          },
          importance: 0.95 // Direções estratégicas têm altíssima importância
        });
        
        console.log('[DynamicMemoryManager] Insights consolidados em direções estratégicas');
      } catch (storageError) {
        console.error('[DynamicMemoryManager] Erro ao armazenar direção estratégica:', storageError);
      }
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao consolidar insights estratégicos:', error);
    }
  }

  /**
   * Obtém estatísticas sobre as memórias armazenadas
   */
  public getMemoryStats(): any {
    try {
      // Total de memórias
      const totalMemories = this.memories.length;
      
      // Memórias por tipo
      const memoriesByType = this.memories.reduce((acc, memory) => {
        acc[memory.type] = (acc[memory.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Média de importância
      const averageImportance = this.memories.reduce((sum, memory) => sum + memory.importance, 0) / totalMemories;
      
      // Distribuição temporal
      const now = new Date();
      const last24h = this.memories.filter(
        memory => new Date(memory.timestamp).getTime() > now.getTime() - 24 * 60 * 60 * 1000
      ).length;
      
      const last7d = this.memories.filter(
        memory => new Date(memory.timestamp).getTime() > now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).length;
      
      const last30d = this.memories.filter(
        memory => new Date(memory.timestamp).getTime() > now.getTime() - 30 * 24 * 60 * 60 * 1000
      ).length;
      
      return {
        totalMemories,
        memoriesByType,
        averageImportance,
        temporalDistribution: {
          last24h,
          last7d,
          last30d,
          older: totalMemories - last30d
        },
        lastConsolidation: this.lastConsolidation.toISOString()
      };
    } catch (error) {
      console.error('[DynamicMemoryManager] Erro ao obter estatísticas de memória:', error);
      return {
        error: 'Falha ao gerar estatísticas',
        totalMemories: this.memories.length
      };
    }
  }
}

// Exporta a instância singleton
export const DynamicMemoryManagerInstance = DynamicMemoryManager.getInstance();
export default DynamicMemoryManagerInstance;