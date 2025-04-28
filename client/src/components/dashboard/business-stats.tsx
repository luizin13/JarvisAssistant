import { useQuery } from "@tanstack/react-query";
import { BusinessStat } from "@/lib/types";

interface BusinessStatsProps {
  category?: string;
}

export default function BusinessStats({ category }: BusinessStatsProps) {
  const { data: stats, isLoading, error } = useQuery<BusinessStat[]>({
    queryKey: ['/api/stats', category],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg mb-6">
        <p className="text-red-700 dark:text-red-400">Erro ao carregar os dados estatísticos</p>
      </div>
    );
  }

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return {
          bg: 'bg-primary-100 dark:bg-primary-900/30',
          text: 'text-primary-600 dark:text-primary-400'
        };
      case 'secondary':
        return {
          bg: 'bg-secondary-100 dark:bg-secondary-900/30',
          text: 'text-secondary-600 dark:text-secondary-400'
        };
      case 'accent':
        return {
          bg: 'bg-accent-100 dark:bg-accent-900/30',
          text: 'text-accent-600 dark:text-accent-400'
        };
      case 'purple':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-600 dark:text-purple-400'
        };
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-900/30',
          text: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  const getChangeStatusClasses = (changeType?: string) => {
    if (!changeType) return 'text-blue-600 dark:text-blue-400';
    
    switch (changeType) {
      case 'increase':
        return 'text-green-600 dark:text-green-400';
      case 'decrease':
        return 'text-red-600 dark:text-red-400';
      case 'neutral':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getChangeIcon = (changeType?: string) => {
    if (!changeType) return 'ri-checkbox-circle-line';
    
    switch (changeType) {
      case 'increase':
        return 'ri-arrow-up-s-line';
      case 'decrease':
        return 'ri-arrow-down-s-line';
      case 'neutral':
        return 'ri-checkbox-circle-line';
      default:
        return 'ri-information-line';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats?.map((stat) => {
        const colorClasses = getColorClasses(stat.color);
        const changeStatusClasses = getChangeStatusClasses(stat.changeType);
        const changeIcon = getChangeIcon(stat.changeType);
        
        return (
          <div key={stat.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-full ${colorClasses.bg} flex items-center justify-center ${colorClasses.text}`}>
                <i className={`${stat.icon} text-xl`}></i>
              </div>
            </div>
            {stat.change && (
              <div className="mt-2 flex items-center">
                <span className={`text-sm ${changeStatusClasses} flex items-center`}>
                  <i className={`${changeIcon} mr-1`}></i>
                  {stat.change}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">vs. mês anterior</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
