import {
  User, InsertUser,
  ChatMessage, InsertChatMessage,
  BusinessStat, InsertBusinessStat,
  CreditOpportunity, InsertCreditOpportunity,
  MetaAd, InsertMetaAd,
  BusinessSuggestion, InsertBusinessSuggestion,
  NewsArticle, InsertNewsArticle,
  StrategicDecision, InsertStrategicDecision,
  EnhancedTask, InsertEnhancedTask
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat methods
  getChatMessages(userId: number, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Business stats methods
  getBusinessStats(userId: number, category?: string): Promise<BusinessStat[]>;
  createBusinessStat(stat: InsertBusinessStat): Promise<BusinessStat>;
  
  // Credit opportunities methods
  getCreditOpportunities(category?: string): Promise<CreditOpportunity[]>;
  getCreditOpportunity(id: number): Promise<CreditOpportunity | undefined>;
  createCreditOpportunity(opportunity: InsertCreditOpportunity): Promise<CreditOpportunity>;
  
  // Meta ads methods
  getMetaAds(category?: string): Promise<MetaAd[]>;
  getMetaAd(id: number): Promise<MetaAd | undefined>;
  createMetaAd(ad: InsertMetaAd): Promise<MetaAd>;
  
  // Business suggestions methods
  getBusinessSuggestions(category?: string): Promise<BusinessSuggestion[]>;
  getBusinessSuggestion(id: number): Promise<BusinessSuggestion | undefined>;
  createBusinessSuggestion(suggestion: InsertBusinessSuggestion): Promise<BusinessSuggestion>;
  updateBusinessSuggestion(id: number, updates: Partial<BusinessSuggestion>): Promise<BusinessSuggestion | undefined>;
  
  // News articles methods
  getNewsArticles(category?: string, limit?: number): Promise<NewsArticle[]>;
  getNewsArticle(id: number): Promise<NewsArticle | undefined>;
  createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle>;
  
  // Strategic decisions methods
  getStrategicDecisions(user_id?: number, area?: string, limit?: number): Promise<StrategicDecision[]>;
  getStrategicDecision(id: number): Promise<StrategicDecision | undefined>;
  createStrategicDecision(decision: InsertStrategicDecision): Promise<StrategicDecision>;
  
  // Enhanced tasks methods
  getEnhancedTasks(state?: string, priority?: string, limit?: number): Promise<EnhancedTask[]>;
  getEnhancedTask(id: number): Promise<EnhancedTask | undefined>;
  createEnhancedTask(task: InsertEnhancedTask): Promise<EnhancedTask>;
  updateEnhancedTask(id: number, updates: Partial<InsertEnhancedTask>): Promise<EnhancedTask | undefined>;

  // Learning records methods for system evolution
  getLearningRecords(limit?: number): Promise<any[]>;
  createLearningRecord(record: any): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chatMessages: Map<number, ChatMessage>;
  private businessStats: Map<number, BusinessStat>;
  private creditOpportunities: Map<number, CreditOpportunity>;
  private metaAds: Map<number, MetaAd>;
  private businessSuggestions: Map<number, BusinessSuggestion>;
  private newsArticles: Map<number, NewsArticle>;
  private strategicDecisions: Map<number, StrategicDecision>;
  private enhancedTasks: Map<number, EnhancedTask>;
  private learningRecords: Map<number, any>;
  
  private userIdCounter: number;
  private chatMessageIdCounter: number;
  private businessStatIdCounter: number;
  private creditOpportunityIdCounter: number;
  private metaAdIdCounter: number;
  private businessSuggestionIdCounter: number;
  private newsArticleIdCounter: number;
  private strategicDecisionIdCounter: number;
  private enhancedTaskIdCounter: number;
  private learningRecordIdCounter: number;

  constructor() {
    this.users = new Map();
    this.chatMessages = new Map();
    this.businessStats = new Map();
    this.creditOpportunities = new Map();
    this.metaAds = new Map();
    this.businessSuggestions = new Map();
    this.newsArticles = new Map();
    this.strategicDecisions = new Map();
    this.enhancedTasks = new Map();
    this.learningRecords = new Map();
    
    this.userIdCounter = 1;
    this.chatMessageIdCounter = 1;
    this.businessStatIdCounter = 1;
    this.creditOpportunityIdCounter = 1;
    this.metaAdIdCounter = 1;
    this.businessSuggestionIdCounter = 1;
    this.newsArticleIdCounter = 1;
    this.strategicDecisionIdCounter = 1;
    this.enhancedTaskIdCounter = 1;
    this.learningRecordIdCounter = 1;
    
    // Initialize with a sample user
    this.createUser({
      username: "luiz",
      password: "password",
      name: "Luiz",
      role: "admin"
    });
    
    // Initialize with sample data
    this.seedInitialData();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Chat methods
  async getChatMessages(userId: number, limit?: number): Promise<ChatMessage[]> {
    const messages = Array.from(this.chatMessages.values())
      .filter(message => message.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return limit ? messages.slice(0, limit) : messages;
  }
  
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const id = this.chatMessageIdCounter++;
    const chatMessage: ChatMessage = { 
      ...message, 
      id, 
      timestamp: new Date() 
    };
    this.chatMessages.set(id, chatMessage);
    return chatMessage;
  }
  
  // Business stats methods
  async getBusinessStats(userId: number, category?: string): Promise<BusinessStat[]> {
    let stats = Array.from(this.businessStats.values()).filter(stat => stat.userId === userId);
    
    if (category) {
      stats = stats.filter(stat => stat.category === category);
    }
    
    return stats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  
  async createBusinessStat(stat: InsertBusinessStat): Promise<BusinessStat> {
    const id = this.businessStatIdCounter++;
    const businessStat: BusinessStat = { 
      ...stat, 
      id, 
      timestamp: new Date() 
    };
    this.businessStats.set(id, businessStat);
    return businessStat;
  }
  
  // Credit opportunities methods
  async getCreditOpportunities(category?: string): Promise<CreditOpportunity[]> {
    let opportunities = Array.from(this.creditOpportunities.values());
    
    if (category) {
      opportunities = opportunities.filter(opportunity => opportunity.category === category);
    }
    
    return opportunities;
  }
  
  async getCreditOpportunity(id: number): Promise<CreditOpportunity | undefined> {
    return this.creditOpportunities.get(id);
  }
  
  async createCreditOpportunity(opportunity: InsertCreditOpportunity): Promise<CreditOpportunity> {
    const id = this.creditOpportunityIdCounter++;
    const creditOpportunity: CreditOpportunity = { ...opportunity, id };
    this.creditOpportunities.set(id, creditOpportunity);
    return creditOpportunity;
  }
  
  // Meta ads methods
  async getMetaAds(category?: string): Promise<MetaAd[]> {
    let ads = Array.from(this.metaAds.values());
    
    if (category) {
      ads = ads.filter(ad => ad.category === category);
    }
    
    return ads;
  }
  
  async getMetaAd(id: number): Promise<MetaAd | undefined> {
    return this.metaAds.get(id);
  }
  
  async createMetaAd(ad: InsertMetaAd): Promise<MetaAd> {
    const id = this.metaAdIdCounter++;
    const metaAd: MetaAd = { ...ad, id };
    this.metaAds.set(id, metaAd);
    return metaAd;
  }
  
  // Business suggestions methods
  async getBusinessSuggestions(category?: string): Promise<BusinessSuggestion[]> {
    let suggestions = Array.from(this.businessSuggestions.values());
    
    if (category) {
      suggestions = suggestions.filter(suggestion => suggestion.category === category);
    }
    
    return suggestions;
  }
  
  async getBusinessSuggestion(id: number): Promise<BusinessSuggestion | undefined> {
    return this.businessSuggestions.get(id);
  }
  
  async createBusinessSuggestion(suggestion: InsertBusinessSuggestion): Promise<BusinessSuggestion> {
    const id = this.businessSuggestionIdCounter++;
    const businessSuggestion: BusinessSuggestion = { ...suggestion, id };
    this.businessSuggestions.set(id, businessSuggestion);
    return businessSuggestion;
  }
  
  async updateBusinessSuggestion(id: number, updates: Partial<BusinessSuggestion>): Promise<BusinessSuggestion | undefined> {
    const suggestion = this.businessSuggestions.get(id);
    
    if (!suggestion) {
      return undefined;
    }
    
    const updatedSuggestion: BusinessSuggestion = { 
      ...suggestion, 
      ...updates
    };
    
    this.businessSuggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }
  
  // News articles methods
  async getNewsArticles(category?: string, limit?: number): Promise<NewsArticle[]> {
    let articles = Array.from(this.newsArticles.values());
    
    if (category) {
      articles = articles.filter(article => article.category === category);
    }
    
    articles = articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    
    return limit ? articles.slice(0, limit) : articles;
  }
  
  async getNewsArticle(id: number): Promise<NewsArticle | undefined> {
    return this.newsArticles.get(id);
  }
  
  async createNewsArticle(article: InsertNewsArticle): Promise<NewsArticle> {
    const id = this.newsArticleIdCounter++;
    const newsArticle: NewsArticle = { ...article, id };
    this.newsArticles.set(id, newsArticle);
    return newsArticle;
  }
  
  // Strategic decisions methods
  async getStrategicDecisions(user_id?: number, area?: string, limit?: number): Promise<StrategicDecision[]> {
    let decisions = Array.from(this.strategicDecisions.values());
    
    if (user_id) {
      decisions = decisions.filter(decision => decision.user_id === user_id);
    }
    
    if (area) {
      decisions = decisions.filter(decision => decision.strategic_area === area);
    }
    
    decisions = decisions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return limit ? decisions.slice(0, limit) : decisions;
  }
  
  async getStrategicDecision(id: number): Promise<StrategicDecision | undefined> {
    return this.strategicDecisions.get(id);
  }
  
  async createStrategicDecision(decision: InsertStrategicDecision): Promise<StrategicDecision> {
    const id = this.strategicDecisionIdCounter++;
    const strategicDecision: StrategicDecision = { 
      ...decision, 
      id, 
      created_at: new Date() 
    };
    this.strategicDecisions.set(id, strategicDecision);
    return strategicDecision;
  }
  
  // Enhanced tasks methods
  async getEnhancedTasks(state?: string, priority?: string, limit?: number): Promise<EnhancedTask[]> {
    let tasks = Array.from(this.enhancedTasks.values());
    
    if (state) {
      tasks = tasks.filter(task => task.state === state);
    }
    
    if (priority) {
      tasks = tasks.filter(task => task.priority === priority);
    }
    
    tasks = tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return limit ? tasks.slice(0, limit) : tasks;
  }
  
  async getEnhancedTask(id: number): Promise<EnhancedTask | undefined> {
    return this.enhancedTasks.get(id);
  }
  
  async createEnhancedTask(task: InsertEnhancedTask): Promise<EnhancedTask> {
    const id = this.enhancedTaskIdCounter++;
    const enhancedTask: EnhancedTask = { 
      ...task, 
      id, 
      created_at: new Date(),
      updated_at: new Date()
    };
    this.enhancedTasks.set(id, enhancedTask);
    return enhancedTask;
  }
  
  async updateEnhancedTask(id: number, updates: Partial<InsertEnhancedTask>): Promise<EnhancedTask | undefined> {
    const task = this.enhancedTasks.get(id);
    
    if (!task) {
      return undefined;
    }
    
    const updatedTask: EnhancedTask = { 
      ...task, 
      ...updates, 
      updated_at: new Date() 
    };
    
    this.enhancedTasks.set(id, updatedTask);
    return updatedTask;
  }

  // Learning records methods
  async getLearningRecords(limit?: number): Promise<any[]> {
    let records = Array.from(this.learningRecords.values());
    
    // Ordenar por data de criação (mais recentes primeiro)
    records = records.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return limit ? records.slice(0, limit) : records;
  }
  
  async createLearningRecord(record: any): Promise<any> {
    const id = this.learningRecordIdCounter++;
    
    // Garantir que todos os campos necessários estejam presentes
    const learningRecord = { 
      ...record, 
      id,
      created_at: record.created_at || new Date(),
      // Definir valores padrão para campos opcionais
      result: record.result || null,
      learning: record.learning || null,
      impact_level: record.impact_level || 'baixo',
      strategic_area: record.strategic_area || 'sistema',
      user_id: record.user_id || null,
      agent_id: record.agent_id || null
    };
    
    this.learningRecords.set(id, learningRecord);
    return learningRecord;
  }
  
  // Seed initial data for development
  private seedInitialData() {
    // Seed business stats
    const initialStats: InsertBusinessStat[] = [
      {
        userId: 1,
        category: "transport",
        name: "Caminhões Ativos",
        value: "12",
        change: "3%",
        changeType: "increase",
        icon: "ri-truck-line",
        color: "primary"
      },
      {
        userId: 1,
        category: "farm",
        name: "Produção Agrícola",
        value: "85ton",
        change: "5%",
        changeType: "increase",
        icon: "ri-plant-line",
        color: "secondary"
      },
      {
        userId: 1,
        category: "credit",
        name: "Oportunidades Crédito",
        value: "7",
        change: "4 novas",
        changeType: "neutral",
        icon: "ri-bank-card-line",
        color: "accent"
      },
      {
        userId: 1,
        category: "ads",
        name: "Anúncios Relevantes",
        value: "16",
        change: "6 potenciais",
        changeType: "neutral",
        icon: "ri-advertisement-line",
        color: "purple"
      }
    ];
    
    initialStats.forEach(stat => this.createBusinessStat(stat));
    
    // Seed credit opportunities
    const initialCreditOpportunities: InsertCreditOpportunity[] = [
      {
        title: "Crédito Rural - Safra 2023",
        description: "Taxa de 4.5% a.a. com carência de 2 anos",
        institution: "Banco do Brasil",
        amount: "Até R$ 2.5M",
        interestRate: "4.5% a.a.",
        term: "5 anos (2 de carência)",
        category: "farm",
        icon: "ri-plant-line",
        color: "green"
      },
      {
        title: "BNDES - Renovação de Frota",
        description: "Financiamento para caminhões com taxa TJLP + 2.5%",
        institution: "BNDES",
        amount: "Até 80% do valor",
        interestRate: "TJLP + 2.5%",
        term: "6 anos",
        category: "transport",
        icon: "ri-truck-line",
        color: "blue"
      }
    ];
    
    initialCreditOpportunities.forEach(opportunity => this.createCreditOpportunity(opportunity));
    
    // Seed Meta ads
    const initialMetaAds: InsertMetaAd[] = [
      {
        title: "Tratores Agrícolas - Financiamento 0%",
        description: "Promoção especial de financiamento com entrada facilitada e parcelas em até 60 meses.",
        company: "AgroMáquinas SA",
        imageUrl: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
        category: "farm",
        contactUrl: "https://example.com/contact"
      },
      {
        title: "Modernize sua Frota - Scania G450",
        description: "Nova linha com maior eficiência de combustível e menor custo operacional.",
        company: "Scania Brasil",
        imageUrl: "https://images.unsplash.com/photo-1627634777217-c864268db30c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
        category: "transport",
        contactUrl: "https://example.com/contact"
      }
    ];
    
    initialMetaAds.forEach(ad => this.createMetaAd(ad));
    
    // Seed business suggestions
    const initialSuggestions: InsertBusinessSuggestion[] = [
      {
        title: "Implementação de Rastreamento IoT",
        description: "Sistemas de rastreamento IoT podem reduzir custos operacionais em até 15% e melhorar a eficiência da frota.",
        category: "transport",
        tags: ["Redução de Custos", "Eficiência Operacional"],
        icon: "ri-lightbulb-line",
        color: "primary"
      },
      {
        title: "Agricultura de Precisão com Drones",
        description: "Utilize drones para monitoramento de plantações, podendo aumentar a produtividade em até 20% e reduzir o uso de insumos.",
        category: "farm",
        tags: ["Aumento de Produtividade", "Tecnologia Agrícola"],
        icon: "ri-leaf-line",
        color: "secondary"
      }
    ];
    
    initialSuggestions.forEach(suggestion => this.createBusinessSuggestion(suggestion));
    
    // Seed news articles
    const initialNewsArticles: InsertNewsArticle[] = [
      {
        title: "Governo anuncia novos incentivos para o agronegócio",
        summary: "Pacote inclui linhas de crédito especiais e redução de impostos para produtores rurais.",
        source: "Agro Negócios",
        category: "farm",
        imageUrl: "https://images.unsplash.com/photo-1530835500872-940ca0a6d253?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        url: "https://example.com/news/1"
      },
      {
        title: "Novos veículos elétricos para transporte de carga chegam ao Brasil",
        summary: "Empresas de logística já começam a testar caminhões elétricos em rotas urbanas.",
        source: "Transporte & Logística",
        category: "transport",
        imageUrl: "https://images.unsplash.com/photo-1580674684089-3c8d9d329fab?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
        url: "https://example.com/news/2"
      },
      {
        title: "Banco Central reduz taxa Selic e impacta crédito rural",
        summary: "Redução deverá beneficiar produtores com taxas de juros mais atrativas.",
        source: "Economia & Finanças",
        category: "finance",
        imageUrl: "https://images.unsplash.com/photo-1634128221889-82ed6efebfc3?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        url: "https://example.com/news/3"
      }
    ];
    
    initialNewsArticles.forEach(article => this.createNewsArticle(article));
    
    // Seed initial chat messages
    const initialChatMessages: InsertChatMessage[] = [
      {
        userId: 1,
        content: "Bom dia, Luiz! Vi que você tem algumas licitações potenciais para sua transportadora esta semana. Gostaria de analisá-las comigo?",
        isBot: true
      },
      {
        userId: 1,
        content: "Sim, pode me mostrar quais são as mais interessantes.",
        isBot: false
      },
      {
        userId: 1,
        content: "Encontrei 3 licitações que se encaixam no seu perfil:",
        isBot: true
      },
      {
        userId: 1,
        content: "Prefeitura de São Paulo: Transporte de materiais escolares - 12 caminhões. Prazo: 20 dias | Valor estimado: R$ 320.000\n\nSecretaria de Agricultura - MG: Escoamento de produção rural - 8 caminhões. Prazo: 45 dias | Valor estimado: R$ 280.000",
        isBot: true
      },
      {
        userId: 1,
        content: "Gostaria que eu preparasse uma análise completa de uma dessas oportunidades?",
        isBot: true
      }
    ];
    
    initialChatMessages.forEach(message => this.createChatMessage(message));
  }
}

export const storage = new MemStorage();
