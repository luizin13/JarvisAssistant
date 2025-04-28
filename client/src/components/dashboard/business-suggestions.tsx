import { useQuery } from "@tanstack/react-query";
import { BusinessSuggestion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BusinessSuggestionsProps {
  category?: string;
  limit?: number;
}

export default function BusinessSuggestions({ category, limit }: BusinessSuggestionsProps) {
  const { data: suggestions, isLoading, error } = useQuery<BusinessSuggestion[]>({
    queryKey: ['/api/suggestions', category],
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-heading font-medium text-gray-900 dark:text-white">Sugestões para seu Negócio</h2>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
              <div className="flex">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="ml-3 space-y-2 flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
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
          <h2 className="font-heading font-medium text-gray-900 dark:text-white">Sugestões para seu Negócio</h2>
        </div>
        <div className="p-4">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
            <p className="text-red-700 dark:text-red-400">Erro ao carregar as sugestões</p>
          </div>
        </div>
      </div>
    );
  }

  const displaySuggestions = limit ? suggestions?.slice(0, limit) : suggestions;

  const getGradientClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-gradient-to-r from-primary-50 to-white dark:from-primary-900/20 dark:to-gray-800';
      case 'secondary':
        return 'bg-gradient-to-r from-secondary-50 to-white dark:from-secondary-900/20 dark:to-gray-800';
      case 'accent':
        return 'bg-gradient-to-r from-accent-50 to-white dark:from-accent-900/20 dark:to-gray-800';
      default:
        return 'bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800';
    }
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return {
          bg: 'bg-primary-100 dark:bg-primary-900/40',
          text: 'text-primary-600 dark:text-primary-400',
          button: 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'
        };
      case 'secondary':
        return {
          bg: 'bg-secondary-100 dark:bg-secondary-900/40',
          text: 'text-secondary-600 dark:text-secondary-400',
          button: 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300'
        };
      case 'accent':
        return {
          bg: 'bg-accent-100 dark:bg-accent-900/40',
          text: 'text-accent-600 dark:text-accent-400',
          button: 'text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800/40',
          text: 'text-gray-600 dark:text-gray-400',
          button: 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        };
    }
  };

  const getBadgeColor = (tag: string, color: string) => {
    // We could map specific tags to specific colors, but for simplicity
    // we'll mostly use the suggestion's main color with some variation
    switch (tag.toLowerCase()) {
      case 'redução de custos':
        return 'bg-primary-100 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300';
      case 'eficiência operacional':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
      case 'aumento de produtividade':
        return 'bg-secondary-100 dark:bg-secondary-900/40 text-secondary-800 dark:text-secondary-300';
      case 'tecnologia agrícola':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-heading font-medium text-gray-900 dark:text-white">Sugestões para seu Negócio</h2>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {displaySuggestions?.map((suggestion) => {
            const gradientClasses = getGradientClasses(suggestion.color);
            const colorClasses = getColorClasses(suggestion.color);
            
            return (
              <div key={suggestion.id} className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg ${gradientClasses}`}>
                <div className="flex">
                  <div className={`w-10 h-10 rounded-full ${colorClasses.bg} flex items-center justify-center ${colorClasses.text} shrink-0`}>
                    <i className={`${suggestion.icon} text-xl`}></i>
                  </div>
                  <div className="ml-3">
                    <h3 className="font-medium text-gray-900 dark:text-white">{suggestion.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{suggestion.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestion.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className={getBadgeColor(tag, suggestion.color)}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-3">
                      <button className={`text-sm ${colorClasses.button} font-medium flex items-center`}>
                        Discutir esta sugestão
                        <i className="ri-chat-1-line ml-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
