import { useQuery } from "@tanstack/react-query";
import { NewsArticle } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsSectionProps {
  category?: string;
  limit?: number;
}

export default function NewsSection({ category, limit = 3 }: NewsSectionProps) {
  const { data: articles, isLoading, error } = useQuery<NewsArticle[]>({
    queryKey: ['/api/news', category, limit],
  });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (e) {
      return 'data desconhecida';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-heading font-medium text-gray-900 dark:text-white">Notícias do Setor</h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 animate-pulse">
              <div className="flex items-start">
                <div className="shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="ml-3 flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-heading font-medium text-gray-900 dark:text-white">Notícias do Setor</h2>
        </div>
        <div className="p-4">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
            <p className="text-red-700 dark:text-red-400">Erro ao carregar as notícias</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-heading font-medium text-gray-900 dark:text-white">Notícias do Setor</h2>
        <div className="flex">
          <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center">
            Ver mais
            <i className="ri-arrow-right-s-line ml-1"></i>
          </button>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {articles?.slice(0, limit).map((article) => (
          <div key={article.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750">
            <div className="flex items-start">
              <div className="shrink-0 w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <img src={article.imageUrl} alt={article.title} className="h-full w-full object-cover" />
              </div>
              <div className="ml-3">
                <h3 className="font-medium text-gray-900 dark:text-white text-sm">{article.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{article.summary}</p>
                <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>{article.source}</span>
                  <span className="mx-1">•</span>
                  <span>{formatDate(article.publishedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
