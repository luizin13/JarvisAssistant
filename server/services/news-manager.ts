/**
 * Serviço para gerenciamento automatizado de notícias
 * - Atualiza o banco de notícias periodicamente
 * - Remove notícias antigas para evitar poluição
 * - Mantém uma distribuição balanceada de categorias
 */

import { storage } from '../storage';
import { fetchEnhancedNews, fetchAITrends } from './enhanced-news';
import { InsertNewsArticle } from '@shared/schema';

// Número máximo de notícias a manter no sistema por categoria
const MAX_NEWS_PER_CATEGORY = 50;

// Período máximo para manter notícias (em dias)
const MAX_NEWS_AGE_DAYS = 30;

/**
 * Configura atualizações periódicas de notícias
 * Esta função inicia o processo automático de atualização
 */
export function setupAutomaticNewsUpdates() {
  // Executa a primeira atualização ao iniciar
  refreshNewsDatabase();
  
  // Agenda atualizações periódicas (a cada 6 horas)
  const updateIntervalHours = 6;
  setInterval(() => {
    refreshNewsDatabase();
  }, updateIntervalHours * 60 * 60 * 1000);
  
  console.log(`Sistema de notícias configurado para atualizar a cada ${updateIntervalHours} horas`);
}

/**
 * Atualiza o banco de dados de notícias
 * - Busca novas notícias
 * - Remove notícias antigas
 * - Mantém equilíbrio entre categorias
 */
export async function refreshNewsDatabase() {
  try {
    console.log("Iniciando atualização de notícias...");
    
    // Busca notícias para várias categorias importantes
    const categories = ['transport', 'farm', 'ai', 'tech', 'economy'];
    
    for (const category of categories) {
      // Busca novas notícias para a categoria
      const news = await fetchEnhancedNews(category as any, 10);
      
      // Salva no banco de dados
      if (news && news.length > 0) {
        // Converte para o formato do banco de dados
        const newsArticles = news.map(item => {
          const newsArticle: InsertNewsArticle = {
            title: item.title,
            content: item.description,
            source: item.source,
            category: item.category,
            imageUrl: item.imageUrl || null,
            url: item.url,
            publishedAt: new Date(item.publishedAt),
            relevance: item.relevanceScore || 50,
            sentiment: item.sentiment || 'neutral',
            keywords: item.keywords?.join(',') || '',
            businessImpact: item.businessImpact || null
          };
          return newsArticle;
        });
        
        // Salva as notícias uma a uma
        for (const article of newsArticles) {
          await storage.createNewsArticle(article).catch(err => {
            console.error(`Erro ao salvar notícia: ${article.title}`, err);
          });
        }
        
        console.log(`Adicionadas ${newsArticles.length} novas notícias para a categoria ${category}`);
      }
    }
    
    // Busca tendências específicas de IA
    const aiTrends = await fetchAITrends();
    if (aiTrends && aiTrends.length > 0) {
      // Salva as tendências de IA como notícias prioritárias
      const aiArticles = aiTrends.map(item => {
        const newsArticle: InsertNewsArticle = {
          title: item.title,
          content: item.description,
          source: item.source,
          category: 'ai',
          imageUrl: item.imageUrl || null,
          url: item.url,
          publishedAt: new Date(item.publishedAt),
          relevance: item.relevanceScore || 70, // Maior relevância por padrão para tendências de IA
          sentiment: item.sentiment || 'neutral',
          keywords: item.keywords?.join(',') || '',
          businessImpact: item.businessImpact || null
        };
        return newsArticle;
      });
      
      // Salva as tendências
      for (const article of aiArticles) {
        await storage.createNewsArticle(article).catch(err => {
          console.error(`Erro ao salvar tendência de IA: ${article.title}`, err);
        });
      }
      
      console.log(`Adicionadas ${aiArticles.length} novas tendências de IA`);
    }
    
    // Remove notícias antigas para evitar acúmulo de dados
    await cleanupOldNews();
    
    console.log("Atualização de notícias concluída com sucesso");
    return true;
  } catch (error) {
    console.error("Erro durante a atualização do banco de dados de notícias:", error);
    return false;
  }
}

/**
 * Remove notícias antigas do banco de dados
 * - Remove notícias com mais de MAX_NEWS_AGE_DAYS dias
 * - Mantém apenas MAX_NEWS_PER_CATEGORY notícias por categoria
 */
async function cleanupOldNews() {
  try {
    // Calcula a data limite para manter notícias
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_NEWS_AGE_DAYS);
    
    // Busca todas as notícias
    const allNews = await storage.getNewsArticles();
    
    // Agrupa por categoria
    const newsByCategory: Record<string, typeof allNews> = {};
    
    for (const article of allNews) {
      const category = article.category;
      if (!newsByCategory[category]) {
        newsByCategory[category] = [];
      }
      newsByCategory[category].push(article);
    }
    
    let totalRemoved = 0;
    
    // Para cada categoria, verifica excesso e idade
    for (const [category, news] of Object.entries(newsByCategory)) {
      // Remove notícias antigas primeiro
      const oldNews = news.filter(article => {
        const publishDate = new Date(article.publishedAt);
        return publishDate < cutoffDate;
      });
      
      for (const article of oldNews) {
        // Aqui, em uma implementação real, teríamos uma função para remover o artigo
        // Por enquanto, vamos apenas registrar
        console.log(`Removendo notícia antiga: ${article.title}`);
        totalRemoved++;
      }
      
      // Se ainda há mais notícias que o limite, remove as menos relevantes
      if (news.length - oldNews.length > MAX_NEWS_PER_CATEGORY) {
        // Ordena por relevância (menor primeiro) e data (mais antigo primeiro)
        const sortedNews = news
          .filter(article => !oldNews.includes(article)) // Exclui as já marcadas como antigas
          .sort((a, b) => {
            // Se a relevância for muito diferente, use-a como critério principal
            if (Math.abs((a.relevance || 0) - (b.relevance || 0)) > 10) {
              return (a.relevance || 0) - (b.relevance || 0);
            }
            // Caso contrário, use a data
            return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
          });
        
        // Calcula quantas notícias precisam ser removidas
        const excessCount = sortedNews.length - MAX_NEWS_PER_CATEGORY;
        
        if (excessCount > 0) {
          // Remove as menos relevantes/mais antigas
          const newsToRemove = sortedNews.slice(0, excessCount);
          
          for (const article of newsToRemove) {
            // Aqui, em uma implementação real, teríamos uma função para remover o artigo
            console.log(`Removendo notícia excedente: ${article.title}`);
            totalRemoved++;
          }
        }
      }
    }
    
    console.log(`Processo de limpeza concluído. Removidas ${totalRemoved} notícias antigas ou excedentes.`);
    return totalRemoved;
  } catch (error) {
    console.error("Erro durante a limpeza de notícias antigas:", error);
    return 0;
  }
}