import { useQuery } from "@tanstack/react-query";
import { CreditOpportunity } from "@/lib/types";
import { Button } from "@/components/ui/button";

interface CreditOpportunitiesProps {
  category?: string;
  limit?: number;
}

export default function CreditOpportunities({ category, limit }: CreditOpportunitiesProps) {
  const { data: opportunities, isLoading, error } = useQuery<CreditOpportunity[]>({
    queryKey: ['/api/credit', category],
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-heading font-medium text-gray-900 dark:text-white">Oportunidades de Crédito</h2>
        </div>
        <div className="p-4 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="ml-3 space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
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
          <h2 className="font-heading font-medium text-gray-900 dark:text-white">Oportunidades de Crédito</h2>
        </div>
        <div className="p-4">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
            <p className="text-red-700 dark:text-red-400">Erro ao carregar as oportunidades de crédito</p>
          </div>
        </div>
      </div>
    );
  }

  const displayOpportunities = limit ? opportunities?.slice(0, limit) : opportunities;

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-600 dark:text-green-400',
          badge: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        };
      case 'blue':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
        };
      case 'primary':
        return {
          bg: 'bg-primary-100 dark:bg-primary-900/30',
          text: 'text-primary-600 dark:text-primary-400',
          badge: 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800/70',
          text: 'text-gray-600 dark:text-gray-400',
          badge: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-heading font-medium text-gray-900 dark:text-white">Oportunidades de Crédito</h2>
        <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center">
          Ver todas
          <i className="ri-arrow-right-s-line ml-1"></i>
        </button>
      </div>
      
      <div className="p-4">
        <div className="space-y-4">
          {displayOpportunities?.map((opportunity) => {
            const colorClasses = getColorClasses(opportunity.color);
            
            return (
              <div key={opportunity.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-start">
                    <div className={`w-10 h-10 rounded-full ${colorClasses.bg} flex items-center justify-center ${colorClasses.text} shrink-0`}>
                      <i className={`${opportunity.icon} text-xl`}></i>
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-gray-900 dark:text-white">{opportunity.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{opportunity.description}</p>
                      <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <span className={`${colorClasses.badge} px-2 py-0.5 rounded text-xs font-medium`}>{opportunity.institution}</span>
                        <span className="ml-2">{opportunity.amount}</span>
                      </div>
                    </div>
                  </div>
                  <Button className="shrink-0" size="sm">Detalhes</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
