/**
 * Memory Manager
 * 
 * Este módulo implementa um sistema de memória para o assistente,
 * permitindo que ele mantenha contexto das interações e preferências do usuário.
 * Isso resulta em respostas mais personalizadas e específicas ao contexto do negócio.
 */

import PrivacyManager, { DataCategory } from './privacy-manager';

export enum MemoryCategory {
  BUSINESS_VISION = 'business_vision',      // Visão geral dos negócios e objetivos
  PERSONAL_PREFERENCES = 'personal_preferences', // Preferências do usuário
  INTERACTION_HISTORY = 'interaction_history',  // Histórico de interações importantes
  LEARNED_PATTERNS = 'learned_patterns',     // Padrões de comportamento e decisão
  NEWS_FEEDBACK = 'news_feedback',          // Feedback sobre tipos de notícias preferidas
  SUGGESTIONS_FEEDBACK = 'suggestions_feedback', // Feedback sobre sugestões dadas
  STRATEGIC_DECISIONS = 'strategic_decisions',  // Decisões estratégicas importantes
  HEALTH_ROUTINES = 'health_routines',      // Rotinas e objetivos de saúde
}

export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  content: string;
  importance: number; // 1-10, sendo 10 o mais importante
  timestamp: string;
  source: 'user' | 'system' | 'inference';
  relatedBusiness?: 'transport' | 'farm' | 'both' | 'personal';
  expirationDate?: string; // Data opcional de expiração da memória
  tags: string[];  // Tags para categorização mais flexível
}

export interface Memory {
  entries: MemoryEntry[];
  lastSyncDate?: string;
}

/**
 * Gerenciador de memória do assistente
 */
class MemoryManager {
  private static instance: MemoryManager;
  private memory: Memory;
  private storageKey = 'assistant_memory';
  
  private constructor() {
    // Carregamento inicial da memória
    const storedMemory = localStorage.getItem(this.storageKey);
    if (storedMemory) {
      try {
        const decryptedMemory = PrivacyManager.getInstance().decryptSensitiveData(storedMemory);
        this.memory = decryptedMemory;
      } catch (error) {
        console.error('Erro ao carregar memória:', error);
        this.memory = { entries: [] };
      }
    } else {
      this.memory = { entries: [] };
    }
  }
  
  /**
   * Obtém a instância singleton
   */
  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }
  
  /**
   * Salva a memória atual com criptografia (se ativada)
   */
  private saveMemory(): void {
    const encryptedMemory = PrivacyManager.getInstance().encryptSensitiveData(this.memory);
    localStorage.setItem(this.storageKey, encryptedMemory);
  }
  
  /**
   * Adiciona uma nova entrada à memória
   */
  public addEntry(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): MemoryEntry {
    const newEntry: MemoryEntry = {
      ...entry,
      id: `mem_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    
    this.memory.entries.push(newEntry);
    this.saveMemory();
    return newEntry;
  }
  
  /**
   * Remove uma entrada da memória
   */
  public removeEntry(id: string): boolean {
    const initialLength = this.memory.entries.length;
    this.memory.entries = this.memory.entries.filter(entry => entry.id !== id);
    
    if (initialLength !== this.memory.entries.length) {
      this.saveMemory();
      return true;
    }
    return false;
  }
  
  /**
   * Atualiza uma entrada existente
   */
  public updateEntry(id: string, updates: Partial<MemoryEntry>): MemoryEntry | null {
    const entryIndex = this.memory.entries.findIndex(entry => entry.id === id);
    
    if (entryIndex === -1) return null;
    
    this.memory.entries[entryIndex] = {
      ...this.memory.entries[entryIndex],
      ...updates,
    };
    
    this.saveMemory();
    return this.memory.entries[entryIndex];
  }
  
  /**
   * Obtém entradas por categoria
   */
  public getEntriesByCategory(category: MemoryCategory): MemoryEntry[] {
    return this.memory.entries.filter(entry => entry.category === category);
  }
  
  /**
   * Obtém entradas relacionadas a uma área de negócio
   */
  public getEntriesByBusiness(business: 'transport' | 'farm' | 'both' | 'personal'): MemoryEntry[] {
    return this.memory.entries.filter(entry => 
      entry.relatedBusiness === business || entry.relatedBusiness === 'both'
    );
  }
  
  /**
   * Obtém entradas por tags
   */
  public getEntriesByTags(tags: string[]): MemoryEntry[] {
    return this.memory.entries.filter(entry => 
      tags.some(tag => entry.tags.includes(tag))
    );
  }
  
  /**
   * Obtém entradas por importância mínima
   */
  public getEntriesByImportance(minImportance: number): MemoryEntry[] {
    return this.memory.entries.filter(entry => entry.importance >= minImportance);
  }
  
  /**
   * Obtém o contexto de memória para uma interação
   * @param categories Categorias de memória a incluir
   * @param maxEntries Número máximo de entradas a retornar
   * @param contextTags Tags relacionadas ao contexto atual
   */
  public getMemoryContext(
    categories: MemoryCategory[] = Object.values(MemoryCategory),
    maxEntries: number = 10,
    contextTags: string[] = []
  ): MemoryEntry[] {
    // Filtra por categorias solicitadas
    let relevantEntries = this.memory.entries.filter(entry => 
      categories.includes(entry.category)
    );
    
    // Prioriza entradas com tags relacionadas ao contexto
    const scoredEntries = relevantEntries.map(entry => {
      let score = entry.importance;
      
      // Aumenta pontuação para entradas com tags relacionadas
      if (contextTags.length > 0) {
        const matchingTags = entry.tags.filter(tag => contextTags.includes(tag));
        score += matchingTags.length * 2;
      }
      
      // Entradas mais recentes têm pontuação maior
      const ageInDays = (Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      score -= Math.min(ageInDays / 30, 3); // Reduz até 3 pontos baseado na idade (máx 90 dias)
      
      return { entry, score };
    });
    
    // Ordena por pontuação e retorna as entradas mais relevantes
    return scoredEntries
      .sort((a, b) => b.score - a.score)
      .slice(0, maxEntries)
      .map(item => item.entry);
  }
  
  /**
   * Gera um resumo do contexto de memória em formato de texto
   * para ser usado em prompts para APIs de IA
   */
  public getMemoryContextText(
    categories: MemoryCategory[] = Object.values(MemoryCategory),
    maxEntries: number = 10,
    contextTags: string[] = []
  ): string {
    const entries = this.getMemoryContext(categories, maxEntries, contextTags);
    
    if (entries.length === 0) {
      return "Não há informações de contexto disponíveis.";
    }
    
    // Agrupa entradas por categoria para melhor estruturação
    const entriesByCategory: Record<string, MemoryEntry[]> = {};
    
    entries.forEach(entry => {
      if (!entriesByCategory[entry.category]) {
        entriesByCategory[entry.category] = [];
      }
      entriesByCategory[entry.category].push(entry);
    });
    
    // Constrói o texto de contexto
    let contextText = "CONTEXTO DE MEMÓRIA DO USUÁRIO:\n\n";
    
    Object.entries(entriesByCategory).forEach(([category, categoryEntries]) => {
      contextText += `== ${this.formatCategoryName(category)} ==\n`;
      
      categoryEntries.forEach(entry => {
        const source = entry.source === 'user' ? 'Informado pelo usuário' : 
                      entry.source === 'system' ? 'Registrado pelo sistema' : 
                      'Inferido de interações';
                      
        contextText += `- ${entry.content} [${source}, Importância: ${entry.importance}/10`;
        
        if (entry.relatedBusiness) {
          contextText += `, Área: ${this.formatBusinessArea(entry.relatedBusiness)}`;
        }
        
        contextText += `]\n`;
      });
      
      contextText += '\n';
    });
    
    return contextText;
  }
  
  /**
   * Adiciona feedback de sugestão à memória
   */
  public addSuggestionFeedback(
    suggestion: string,
    feedback: 'positive' | 'negative' | 'neutral',
    userComments: string = '',
    businessArea: 'transport' | 'farm' | 'both' | 'personal'
  ): MemoryEntry {
    const content = `${feedback === 'positive' ? 'Gostou' : feedback === 'negative' ? 'Não gostou' : 'Neutro sobre'} 
                    a sugestão: "${suggestion}"${userComments ? `. Comentários: ${userComments}` : ''}`;
    
    return this.addEntry({
      category: MemoryCategory.SUGGESTIONS_FEEDBACK,
      content,
      importance: feedback === 'positive' ? 8 : feedback === 'negative' ? 7 : 5,
      source: 'user',
      relatedBusiness: businessArea,
      tags: ['sugestão', feedback, businessArea],
    });
  }
  
  /**
   * Adiciona feedback de notícia à memória
   */
  public addNewsFeedback(
    newsTitle: string,
    reaction: 'saved' | 'useful' | 'comment' | 'shared' | 'hidden',
    userComment: string = '',
    category: string
  ): MemoryEntry {
    const content = `${this.formatReaction(reaction)} na notícia: "${newsTitle}"${userComment ? `. Comentário: ${userComment}` : ''}`;
    
    return this.addEntry({
      category: MemoryCategory.NEWS_FEEDBACK,
      content,
      importance: reaction === 'saved' || reaction === 'shared' ? 7 : 
                 reaction === 'comment' ? 6 : 
                 reaction === 'useful' ? 5 : 3,
      source: 'user',
      tags: ['notícia', reaction, category],
    });
  }
  
  /**
   * Adiciona uma visão de negócio à memória
   */
  public addBusinessVision(
    vision: string,
    businessArea: 'transport' | 'farm' | 'both',
    importance: number = 9,
    tags: string[] = []
  ): MemoryEntry {
    return this.addEntry({
      category: MemoryCategory.BUSINESS_VISION,
      content: vision,
      importance,
      source: 'user',
      relatedBusiness: businessArea,
      tags: ['visão', 'estratégia', 'objetivo', ...tags],
    });
  }
  
  /**
   * Adiciona uma preferência pessoal à memória
   */
  public addPersonalPreference(
    preference: string,
    importance: number = 7,
    tags: string[] = []
  ): MemoryEntry {
    return this.addEntry({
      category: MemoryCategory.PERSONAL_PREFERENCES,
      content: preference,
      importance,
      source: 'user',
      relatedBusiness: 'personal',
      tags: ['preferência', 'personal', ...tags],
    });
  }
  
  /**
   * Adiciona uma rotina de saúde à memória
   */
  public addHealthRoutine(
    routine: string,
    importance: number = 6,
    tags: string[] = []
  ): MemoryEntry {
    return this.addEntry({
      category: MemoryCategory.HEALTH_ROUTINES,
      content: routine,
      importance,
      source: 'user',
      relatedBusiness: 'personal',
      tags: ['saúde', 'rotina', 'bem-estar', ...tags],
    });
  }
  
  /**
   * Limpa entradas expiradas da memória
   */
  public clearExpiredEntries(): number {
    const now = new Date();
    const initialCount = this.memory.entries.length;
    
    this.memory.entries = this.memory.entries.filter(entry => {
      if (!entry.expirationDate) return true;
      return new Date(entry.expirationDate) > now;
    });
    
    if (initialCount !== this.memory.entries.length) {
      this.saveMemory();
    }
    
    return initialCount - this.memory.entries.length;
  }
  
  /**
   * Limpa a memória completamente (uso com cautela)
   */
  public clearAllMemory(): void {
    this.memory = { entries: [] };
    this.saveMemory();
  }
  
  /**
   * Helper para formatar nome de categoria
   */
  private formatCategoryName(category: string): string {
    switch(category) {
      case MemoryCategory.BUSINESS_VISION: return 'Visão de Negócio';
      case MemoryCategory.PERSONAL_PREFERENCES: return 'Preferências Pessoais';
      case MemoryCategory.INTERACTION_HISTORY: return 'Histórico de Interações';
      case MemoryCategory.LEARNED_PATTERNS: return 'Padrões Aprendidos';
      case MemoryCategory.NEWS_FEEDBACK: return 'Feedback sobre Notícias';
      case MemoryCategory.SUGGESTIONS_FEEDBACK: return 'Feedback sobre Sugestões';
      case MemoryCategory.STRATEGIC_DECISIONS: return 'Decisões Estratégicas';
      case MemoryCategory.HEALTH_ROUTINES: return 'Rotinas de Saúde';
      default: return category;
    }
  }
  
  /**
   * Helper para formatar área de negócio
   */
  private formatBusinessArea(area: string): string {
    switch(area) {
      case 'transport': return 'Transportadora';
      case 'farm': return 'Fazenda';
      case 'both': return 'Ambos os Negócios';
      case 'personal': return 'Pessoal';
      default: return area;
    }
  }
  
  /**
   * Helper para formatar reação a notícias
   */
  private formatReaction(reaction: string): string {
    switch(reaction) {
      case 'saved': return 'Salvou';
      case 'useful': return 'Marcou como útil';
      case 'comment': return 'Comentou';
      case 'shared': return 'Compartilhou';
      case 'hidden': return 'Ocultou';
      default: return reaction;
    }
  }
}

export default MemoryManager;