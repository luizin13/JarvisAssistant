import axios from 'axios';
import { storage } from '../storage';
import { NewsArticle, InsertNewsArticle } from '../../shared/schema';
import { createHash } from 'crypto';

interface NewsSource {
  name: string;
  type: 'api' | 'rss' | 'social';
  category: NewsCategory | 'all';
  url: string;
  apiKey?: string;
  params?: Record<string, string>;
  parser: (data: any) => NewsItem[];
}

type NewsCategory = 
  'transport' | 
  'farm' | 
  'tech' | 
  'ai' | 
  'economy' | 
  'sustainability' | 
  'consumer' | 
  'policy' | 
  'education';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  category: NewsCategory;
  imageUrl?: string;
  relevanceScore?: number; // 0-100 baseado em quão relevante é para os interesses do usuário
  sentiment?: 'positive' | 'neutral' | 'negative';
  keywords?: string[];
  businessImpact?: string; // Breve análise de como isso pode impactar os negócios
}

// Verifique se a API está disponível e retorne uma chave substituta para desenvolvimento se necessário
function getApiKey(keyName: string): string {
  const key = process.env[keyName];
  if (!key) {
    console.warn(`Chave de API ${keyName} não encontrada no ambiente. Usando modo de desenvolvimento.`);
    return 'development';
  }
  return key;
}

// Lista de fontes de notícias
const newsSources: NewsSource[] = [
  // Fonte de notícias gerais - adaptável para qualquer categoria
  {
    name: 'News API',
    type: 'api',
    category: 'all',
    url: 'https://newsapi.org/v2/everything',
    apiKey: getApiKey('NEWS_API_KEY'),
    parser: (data: any): NewsItem[] => {
      if (!data.articles || !Array.isArray(data.articles)) {
        return [];
      }
      
      return data.articles.map((article: any) => ({
        title: article.title || 'Sem título',
        description: article.description || article.content || 'Sem descrição',
        url: article.url || '',
        publishedAt: article.publishedAt || new Date().toISOString(),
        source: article.source?.name || 'News API',
        category: determineCategory(article.title, article.description),
        imageUrl: article.urlToImage || null,
        relevanceScore: calculateRelevance(article.title, article.description),
        sentiment: analyzeSentiment(article.title, article.description),
        keywords: extractKeywords(article.title, article.description),
        businessImpact: generateBusinessImpact(article.title, article.description)
      }));
    }
  },
  
  // Fonte específica para IA e tecnologia
  {
    name: 'Tech News',
    type: 'api',
    category: 'ai',
    url: 'https://newsapi.org/v2/everything',
    apiKey: getApiKey('NEWS_API_KEY'),
    params: {
      q: 'inteligência artificial OR IA OR "machine learning" OR GPT OR "large language model" OR "generative ai"',
      language: 'pt',
      sortBy: 'publishedAt'
    },
    parser: (data: any): NewsItem[] => {
      if (!data.articles || !Array.isArray(data.articles)) {
        return [];
      }
      
      return data.articles.map((article: any) => ({
        title: article.title || 'Sem título',
        description: article.description || article.content || 'Sem descrição',
        url: article.url || '',
        publishedAt: article.publishedAt || new Date().toISOString(),
        source: article.source?.name || 'Tech News',
        category: 'ai',
        imageUrl: article.urlToImage || null,
        relevanceScore: calculateAIRelevance(article.title, article.description),
        sentiment: analyzeSentiment(article.title, article.description),
        keywords: extractKeywords(article.title, article.description),
        businessImpact: generateAIBusinessImpact(article.title, article.description)
      }));
    }
  },
  
  // Fonte de notícias econômicas
  {
    name: 'Economy News',
    type: 'api',
    category: 'economy',
    url: 'https://newsapi.org/v2/everything',
    apiKey: getApiKey('NEWS_API_KEY'),
    params: {
      q: 'economia OR macroeconomia OR "banco central" OR inflação OR "taxa de juros" OR "taxa selic" OR pib',
      language: 'pt',
      sortBy: 'publishedAt'
    },
    parser: (data: any): NewsItem[] => {
      if (!data.articles || !Array.isArray(data.articles)) {
        return [];
      }
      
      return data.articles.map((article: any) => ({
        title: article.title || 'Sem título',
        description: article.description || article.content || 'Sem descrição',
        url: article.url || '',
        publishedAt: article.publishedAt || new Date().toISOString(),
        source: article.source?.name || 'Economy News',
        category: 'economy',
        imageUrl: article.urlToImage || null,
        relevanceScore: calculateRelevance(article.title, article.description),
        sentiment: analyzeSentiment(article.title, article.description),
        keywords: extractKeywords(article.title, article.description),
        businessImpact: generateEconomyBusinessImpact(article.title, article.description)
      }));
    }
  }
];

// Determina a categoria de uma notícia com base no texto
function determineCategory(title: string, description: string): NewsCategory {
  const text = `${title} ${description}`.toLowerCase();
  
  // Palavras-chave para cada categoria
  const keywords = {
    transport: ['transporte', 'logística', 'caminhão', 'caminhões', 'frota', 'frete', 'entrega', 'rodoviário'],
    farm: ['agricultura', 'fazenda', 'agronegócio', 'safra', 'colheita', 'plantio', 'rural', 'agro'],
    tech: ['tecnologia', 'inovação', 'digital', 'software', 'aplicativo', 'startup', 'internet'],
    ai: ['inteligência artificial', 'ia', 'machine learning', 'aprendizado de máquina', 'gpt', 'chatgpt', 'ml'],
    economy: ['economia', 'mercado', 'finanças', 'juros', 'inflação', 'pib', 'bolsa', 'dólar'],
    sustainability: ['sustentabilidade', 'esg', 'ambiental', 'carbono', 'verde', 'renovável', 'clima'],
    consumer: ['consumidor', 'varejo', 'compra', 'cliente', 'comportamento', 'tendência', 'experiência'],
    policy: ['política', 'governo', 'regulamentação', 'lei', 'decreto', 'congresso', 'antt'],
    education: ['educação', 'aprendizado', 'curso', 'qualificação', 'treinamento', 'desenvolvimento']
  };
  
  // Verifica cada categoria e conta palavras-chave encontradas
  const scores: Record<NewsCategory, number> = {
    transport: 0, farm: 0, tech: 0, ai: 0, economy: 0, 
    sustainability: 0, consumer: 0, policy: 0, education: 0
  };
  
  Object.entries(keywords).forEach(([category, terms]) => {
    terms.forEach(term => {
      if (text.includes(term)) {
        scores[category as NewsCategory] += 1;
      }
    });
  });
  
  // Encontra a categoria com maior pontuação
  let maxScore = 0;
  let topCategory: NewsCategory = 'tech'; // Default
  
  Object.entries(scores).forEach(([category, score]) => {
    if (score > maxScore) {
      maxScore = score;
      topCategory = category as NewsCategory;
    }
  });
  
  return topCategory;
}

// Calcula o quão relevante é uma notícia para o usuário (0-100)
function calculateRelevance(title: string, description: string): number {
  // Implementação básica - poderia ser refinada com ML
  const text = `${title} ${description}`.toLowerCase();
  
  // Termos de alta relevância geral para negócios
  const highRelevanceTerms = [
    'oportunidade', 'crescimento', 'lucro', 'expansão', 'tendência',
    'mercado', 'economia', 'investimento', 'tecnologia', 'inovação'
  ];
  
  // Conta termos de alta relevância
  let relevanceScore = 0;
  highRelevanceTerms.forEach(term => {
    if (text.includes(term)) {
      relevanceScore += 10;
    }
  });
  
  // Limita a 100
  return Math.min(relevanceScore, 100);
}

// Calcula relevância específica para notícias de IA
function calculateAIRelevance(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  
  // Termos de alta relevância para IA aplicada a negócios
  const aiBusinessTerms = [
    'automação', 'produtividade', 'eficiência', 'redução de custos', 
    'previsão', 'análise de dados', 'decisão', 'cliente', 'operacional',
    'logística', 'agronegócio', 'transporte', 'gestão'
  ];
  
  // Base score para notícias de IA
  let relevanceScore = 50;
  
  // Adiciona pontos para termos específicos de aplicação de IA em negócios
  aiBusinessTerms.forEach(term => {
    if (text.includes(term)) {
      relevanceScore += 5;
    }
  });
  
  // Limita a 100
  return Math.min(relevanceScore, 100);
}

// Análise simples de sentimento
function analyzeSentiment(title: string, description: string): 'positive' | 'neutral' | 'negative' {
  const text = `${title} ${description}`.toLowerCase();
  
  const positiveTerms = [
    'crescimento', 'aumento', 'sucesso', 'positivo', 'ganho', 'lucro',
    'oportunidade', 'melhoria', 'avanço', 'inovação', 'solução'
  ];
  
  const negativeTerms = [
    'queda', 'redução', 'problema', 'crise', 'risco', 'prejuízo',
    'dificuldade', 'desafio', 'ameaça', 'falha', 'perda'
  ];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  positiveTerms.forEach(term => {
    if (text.includes(term)) positiveScore++;
  });
  
  negativeTerms.forEach(term => {
    if (text.includes(term)) negativeScore++;
  });
  
  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

// Extrai palavras-chave do texto
function extractKeywords(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  
  // Lista de palavras-chave relevantes para negócios
  const potentialKeywords = [
    'economia', 'mercado', 'tecnologia', 'ia', 'inteligência artificial',
    'sustentabilidade', 'logística', 'transporte', 'agricultura', 'inovação',
    'finanças', 'gestão', 'produtividade', 'eficiência', 'estratégia',
    'política', 'regulamentação', 'consumidor', 'tendência', 'futuro',
    'digital', 'automação', 'machine learning', 'dados', 'previsão'
  ];
  
  // Filtra palavras-chave que aparecem no texto
  return potentialKeywords.filter(keyword => text.includes(keyword));
}

// Gera um breve impacto nos negócios com base no texto
function generateBusinessImpact(title: string, description: string): string {
  // Simplificado - em produção, poderíamos usar IA para uma análise mais detalhada
  const sentiment = analyzeSentiment(title, description);
  const keywords = extractKeywords(title, description);
  
  if (keywords.length === 0) {
    return 'Impacto indeterminado nos negócios.';
  }
  
  if (sentiment === 'positive') {
    return `Possível impacto positivo relacionado a ${keywords.slice(0, 3).join(', ')}.`;
  } else if (sentiment === 'negative') {
    return `Possível desafio ou risco relacionado a ${keywords.slice(0, 3).join(', ')}.`;
  } else {
    return `Desenvolvimento neutro em ${keywords.slice(0, 3).join(', ')} que merece atenção.`;
  }
}

// Gera impacto nos negócios para notícias de IA
function generateAIBusinessImpact(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  const sentiment = analyzeSentiment(title, description);
  
  // Verifica aplicabilidade a setores específicos
  let sectors = [];
  if (text.includes('transporte') || text.includes('logística') || text.includes('frota')) {
    sectors.push('transporte');
  }
  if (text.includes('agricultura') || text.includes('agro') || text.includes('rural')) {
    sectors.push('agricultura');
  }
  
  const aiType = 
    text.includes('automação') ? 'automação de processos' :
    text.includes('previsão') || text.includes('predição') ? 'análise preditiva' :
    text.includes('atendimento') || text.includes('cliente') ? 'atendimento ao cliente' :
    text.includes('decisão') ? 'suporte à decisão' :
    'inovação em IA';
  
  if (sectors.length > 0) {
    return `Oportunidade de ${aiType} aplicável ao setor de ${sectors.join(' e ')}.`;
  } else {
    if (sentiment === 'positive') {
      return `Avanço em ${aiType} com potencial aplicação nos seus negócios.`;
    } else if (sentiment === 'negative') {
      return `Desafio em ${aiType} que pode impactar estratégias de adoção de IA.`;
    } else {
      return `Desenvolvimento em ${aiType} que merece atenção para possíveis aplicações futuras.`;
    }
  }
}

// Gera impacto nos negócios para notícias econômicas
function generateEconomyBusinessImpact(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  const sentiment = analyzeSentiment(title, description);
  
  // Tópicos econômicos específicos
  const topic = 
    text.includes('juros') ? 'taxa de juros' :
    text.includes('inflação') ? 'inflação' :
    text.includes('câmbio') || text.includes('dólar') ? 'câmbio' :
    text.includes('pib') ? 'crescimento econômico' :
    text.includes('crédito') ? 'disponibilidade de crédito' :
    'economia';
  
  if (sentiment === 'positive') {
    return `Cenário favorável de ${topic} pode beneficiar investimentos e expansão de negócios.`;
  } else if (sentiment === 'negative') {
    return `Condições adversas de ${topic} podem exigir revisão de estratégia financeira.`;
  } else {
    return `Mudanças em ${topic} que podem influenciar decisões de médio e longo prazo.`;
  }
}

// Função principal para buscar notícias de múltiplas fontes
export async function fetchEnhancedNews(
  category?: NewsCategory | 'all',
  limit: number = 20,
  useCache: boolean = true
): Promise<NewsItem[]> {
  try {
    // Para desenvolvimento, se não houver API keys configuradas
    if (process.env.NODE_ENV === 'development' && !process.env.NEWS_API_KEY) {
      return generateMockNewsItems(category, limit);
    }
    
    // Seleciona as fontes apropriadas com base na categoria
    const sourcesToUse = category === 'all' || !category
      ? newsSources
      : newsSources.filter(source => source.category === 'all' || source.category === category);
    
    if (sourcesToUse.length === 0) {
      console.warn(`Nenhuma fonte disponível para a categoria: ${category}`);
      return [];
    }
    
    // Busca de cada fonte em paralelo
    const newsPromises = sourcesToUse.map(async (source) => {
      try {
        const params = {
          ...(source.params || {}),
          apiKey: source.apiKey
        };
        
        // Adiciona parâmetros específicos para a categoria se não estiver na configuração da fonte
        if (category && category !== 'all' && !source.params?.q) {
          (params as any).q = getCategorySearchTerms(category);
        }
        
        // Realiza a chamada API
        const response = await axios.get(source.url, { params });
        return source.parser(response.data);
      } catch (error) {
        console.error(`Erro ao buscar notícias de ${source.name}:`, error);
        return [];
      }
    });
    
    // Aguarda todas as chamadas API
    const allNewsItemArrays = await Promise.all(newsPromises);
    
    // Combina todos os resultados em um único array
    let allNewsItems = allNewsItemArrays.flat();
    
    // Remove duplicatas baseado em URLs semelhantes
    allNewsItems = removeDuplicateNews(allNewsItems);
    
    // Ordena por relevância e data de publicação
    allNewsItems.sort((a, b) => {
      // Prioriza relevância alta
      const relevanceDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (relevanceDiff !== 0) return relevanceDiff;
      
      // Depois por data de publicação (mais recentes primeiro)
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Limita o número de resultados
    return allNewsItems.slice(0, limit);
    
  } catch (error) {
    console.error('Erro ao buscar notícias:', error);
    return [];
  }
}

// Remove notícias duplicadas com base na similaridade da URL
function removeDuplicateNews(items: NewsItem[]): NewsItem[] {
  const uniqueUrls = new Set<string>();
  const result: NewsItem[] = [];
  
  for (const item of items) {
    // Normaliza a URL removendo parâmetros de consulta
    const normalizedUrl = item.url.split('?')[0];
    
    // Verifica se já temos uma URL similar
    let isDuplicate = false;
    // Converte o Set para Array para evitar problemas de compilação
    Array.from(uniqueUrls).forEach(existingUrl => {
      if (areSimilarUrls(existingUrl, normalizedUrl)) {
        isDuplicate = true;
      }
    });
    
    if (!isDuplicate) {
      uniqueUrls.add(normalizedUrl);
      result.push(item);
    }
  }
  
  return result;
}

// Verifica se duas URLs são similares
function areSimilarUrls(url1: string, url2: string): boolean {
  // Implementação simples - poderia ser melhorada
  return url1 === url2 || url1.includes(url2) || url2.includes(url1);
}

// Obtém termos de pesquisa para uma categoria específica
function getCategorySearchTerms(category: NewsCategory): string {
  const terms: Record<NewsCategory, string> = {
    transport: 'transporte OR logística OR caminhão OR frota OR rodoviário',
    farm: 'agricultura OR agronegócio OR fazenda OR safra OR rural',
    tech: 'tecnologia OR digital OR inovação OR software',
    ai: 'inteligência artificial OR IA OR machine learning OR GPT OR LLM',
    economy: 'economia OR mercado financeiro OR bolsa OR juros OR inflação',
    sustainability: 'sustentabilidade OR ESG OR ambiental OR renovável',
    consumer: 'consumidor OR varejo OR tendências de consumo',
    policy: 'política OR regulamentação OR governo OR legislação',
    education: 'educação OR capacitação OR desenvolvimento profissional'
  };
  
  return terms[category] || '';
}

// Função para salvar notícias no armazenamento para uso futuro
export async function saveNewsToStorage(newsItems: NewsItem[]): Promise<NewsArticle[]> {
  const savedArticles: NewsArticle[] = [];
  
  for (const item of newsItems) {
    // Cria um ID único para a notícia baseado na URL
    const id = createHash('md5').update(item.url).digest('hex');
    
    // Formata para o formato do armazenamento
    const newsArticle: InsertNewsArticle = {
      title: item.title,
      content: item.description,
      source: item.source,
      category: item.category,
      imageUrl: item.imageUrl || null,
      url: item.url,
      publishedAt: new Date(item.publishedAt), // Converter de string ISO para Date
      relevance: item.relevanceScore || 50,
      sentiment: item.sentiment || 'neutral',
      keywords: item.keywords?.join(',') || '',
      businessImpact: item.businessImpact || null
    };
    
    try {
      // Salva no armazenamento
      const saved = await storage.createNewsArticle(newsArticle);
      savedArticles.push(saved);
    } catch (error) {
      console.error(`Erro ao salvar notícia: ${item.title}`, error);
    }
  }
  
  return savedArticles;
}

// Para desenvolvimento, gera notícias fictícias para testes
function generateMockNewsItems(category?: NewsCategory | 'all', limit: number = 10): NewsItem[] {
  const mockNews: Record<NewsCategory, NewsItem[]> = {
    ai: [
      {
        title: 'Nova versão do ChatGPT será lançada com melhorias para empresas',
        description: 'A OpenAI anunciou que lançará uma nova versão do ChatGPT focada em aplicações empresariais, com recursos avançados para automação de processos e atendimento ao cliente. A nova versão promete maior personalização e integração com sistemas existentes.',
        url: 'https://exemplo.com/chatgpt-empresas',
        publishedAt: new Date().toISOString(),
        source: 'Tech News Brasil',
        category: 'ai',
        relevanceScore: 90,
        sentiment: 'positive',
        keywords: ['ChatGPT', 'IA', 'automação', 'empresas'],
        businessImpact: 'Oportunidade de automação de processos aplicável ao setor de transporte e agricultura.'
      },
      {
        title: 'Inteligência Artificial está transformando a logística em todo o mundo',
        description: 'Sistemas de IA estão otimizando rotas, reduzindo custos de combustível e melhorando a eficiência de entregas. Empresas que adotam essas tecnologias relatam economias de até 30% em custos operacionais.',
        url: 'https://exemplo.com/ia-logistica',
        publishedAt: new Date().toISOString(),
        source: 'Revista Logística',
        category: 'ai',
        relevanceScore: 95,
        sentiment: 'positive',
        keywords: ['IA', 'logística', 'transporte', 'eficiência'],
        businessImpact: 'Avanço em análise preditiva com potencial aplicação nos seus negócios de transporte.'
      }
    ],
    transport: [
      {
        title: 'Governo anuncia novas linhas de crédito para renovação de frota',
        description: 'O Ministério dos Transportes anunciou hoje novas linhas de crédito com juros subsidiados para empresas de transporte renovarem suas frotas. A medida visa estimular a modernização e reduzir a idade média dos caminhões no Brasil.',
        url: 'https://exemplo.com/credito-transporte',
        publishedAt: new Date().toISOString(),
        source: 'Portal do Transporte',
        category: 'transport',
        relevanceScore: 85,
        sentiment: 'positive',
        keywords: ['crédito', 'frota', 'caminhões', 'financiamento'],
        businessImpact: 'Possível impacto positivo relacionado a financiamento, renovação de frota.'
      }
    ],
    farm: [
      {
        title: 'Tecnologias de agricultura de precisão aumentam produtividade em 40%',
        description: 'Estudo mostra que fazendas que adotaram tecnologias de agricultura de precisão viram aumento de produtividade em até 40%, com redução de custos de insumos em 25%.',
        url: 'https://exemplo.com/agricultura-precisao',
        publishedAt: new Date().toISOString(),
        source: 'Revista Agro',
        category: 'farm',
        relevanceScore: 80,
        sentiment: 'positive',
        keywords: ['agricultura de precisão', 'produtividade', 'tecnologia', 'custos'],
        businessImpact: 'Possível impacto positivo relacionado a produtividade, tecnologia, redução de custos.'
      }
    ],
    tech: [
      {
        title: 'Startups brasileiras de tecnologia batem recorde de investimentos',
        description: 'Ecossistema de startups brasileiro recebeu mais de R$ 20 bilhões em investimentos no último ano, com destaque para setores de fintechs, agtechs e logtechs.',
        url: 'https://exemplo.com/startups-investimentos',
        publishedAt: new Date().toISOString(),
        source: 'Startup News',
        category: 'tech',
        relevanceScore: 75,
        sentiment: 'positive',
        keywords: ['startups', 'investimentos', 'tecnologia', 'inovação'],
        businessImpact: 'Desenvolvimento neutro em inovação, investimentos que merece atenção.'
      }
    ],
    economy: [
      {
        title: 'Banco Central reduz previsão de inflação para o próximo ano',
        description: 'O Banco Central revisou para baixo sua previsão de inflação para o próximo ano, indicando possibilidade de redução nas taxas de juros nos próximos meses.',
        url: 'https://exemplo.com/inflacao-juros',
        publishedAt: new Date().toISOString(),
        source: 'Economia Hoje',
        category: 'economy',
        relevanceScore: 70,
        sentiment: 'positive',
        keywords: ['inflação', 'juros', 'banco central', 'economia'],
        businessImpact: 'Cenário favorável de taxa de juros pode beneficiar investimentos e expansão de negócios.'
      }
    ],
    sustainability: [
      {
        title: 'Empresas que investem em sustentabilidade têm melhor desempenho financeiro',
        description: 'Estudo global mostra que empresas com fortes práticas ESG superam concorrentes em rentabilidade e atraem mais investimentos de longo prazo.',
        url: 'https://exemplo.com/esg-rentabilidade',
        publishedAt: new Date().toISOString(),
        source: 'ESG Brasil',
        category: 'sustainability',
        relevanceScore: 65,
        sentiment: 'positive',
        keywords: ['ESG', 'sustentabilidade', 'rentabilidade', 'investimentos'],
        businessImpact: 'Possível impacto positivo relacionado a ESG, rentabilidade, imagem corporativa.'
      }
    ],
    consumer: [
      {
        title: 'Novos hábitos de consumo transformam logística de entregas',
        description: 'Consumidores exigem cada vez mais rapidez e transparência nas entregas, forçando empresas a investirem em tecnologias de rastreamento e logística de última milha.',
        url: 'https://exemplo.com/consumo-logistica',
        publishedAt: new Date().toISOString(),
        source: 'Consumidor Moderno',
        category: 'consumer',
        relevanceScore: 85,
        sentiment: 'neutral',
        keywords: ['consumo', 'entregas', 'logística', 'rastreamento'],
        businessImpact: 'Desenvolvimento em hábitos de consumo que merece atenção para ajuste de operações de entrega.'
      }
    ],
    policy: [
      {
        title: 'Nova regulamentação para transporte de cargas entra em vigor',
        description: 'ANTT publicou novas regras para o transporte rodoviário de cargas, com mudanças em requisitos de segurança e documentação. Empresas têm 90 dias para se adequarem.',
        url: 'https://exemplo.com/regulacao-transporte',
        publishedAt: new Date().toISOString(),
        source: 'Diário Oficial',
        category: 'policy',
        relevanceScore: 90,
        sentiment: 'neutral',
        keywords: ['regulamentação', 'ANTT', 'transporte de cargas', 'legislação'],
        businessImpact: 'Mudanças em regulamentação que podem influenciar decisões operacionais de médio prazo.'
      }
    ],
    education: [
      {
        title: 'Cursos online de gestão empresarial ganham popularidade entre empreendedores',
        description: 'Plataformas de educação à distância reportam aumento de 150% na procura por cursos de gestão, finanças e marketing digital por empresários de pequeno e médio porte.',
        url: 'https://exemplo.com/cursos-gestao',
        publishedAt: new Date().toISOString(),
        source: 'Educação Executiva',
        category: 'education',
        relevanceScore: 60,
        sentiment: 'positive',
        keywords: ['educação', 'gestão', 'cursos online', 'capacitação'],
        businessImpact: 'Possível impacto positivo relacionado a capacitação, gestão, competitividade.'
      }
    ]
  };
  
  if (category && category !== 'all') {
    return mockNews[category].slice(0, limit);
  }
  
  // Combina todas as categorias
  const allNews = Object.values(mockNews).flat();
  
  // Ordena por relevância
  allNews.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  
  return allNews.slice(0, limit);
}

// Função para buscar notícias categorizadas
export async function fetchCategorizedNews(limit: number = 20): Promise<Record<string, NewsItem[]>> {
  // Categorias focadas em transporte, agro, IA e economia
  const targetCategories: NewsCategory[] = ['transport', 'farm', 'ai', 'economy'];
  const result: Record<string, NewsItem[]> = {};
  
  // Busca notícias para cada categoria em paralelo
  const promises = targetCategories.map(async category => {
    const news = await fetchEnhancedNews(category, Math.max(5, Math.floor(limit / targetCategories.length)));
    result[category] = news;
  });
  
  await Promise.all(promises);
  
  // Adiciona um array consolidado com as notícias mais relevantes
  const allNews = Object.values(result).flat();
  allNews.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  result['highlights'] = allNews.slice(0, 5);
  
  return result;
}

// Função para buscar e salvar notícias no armazenamento
export async function updateNewsDatabase(): Promise<boolean> {
  try {
    // Busca notícias de todas as categorias
    const news = await fetchEnhancedNews('all', 50);
    
    // Salva no armazenamento
    await saveNewsToStorage(news);
    
    console.log(`${news.length} notícias atualizadas no banco de dados`);
    return true;
  } catch (error) {
    console.error('Erro ao atualizar banco de dados de notícias:', error);
    return false;
  }
}

// Função para buscar tendências de IA específicas para os negócios do usuário
export async function fetchAITrends(): Promise<NewsItem[]> {
  return fetchEnhancedNews('ai', 10);
}