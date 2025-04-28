import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MetaAd } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MetaAdsSectionProps {
  limit?: number;
  showFilter?: boolean;
}

export default function MetaAdsSection({ limit, showFilter = true }: MetaAdsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  
  const { data: ads, isLoading, error } = useQuery<MetaAd[]>({
    queryKey: ['/api/ads', selectedCategory],
  });

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "all" ? undefined : value);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-heading font-medium text-gray-900 dark:text-white">Anúncios Relevantes</h2>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-200 dark:bg-gray-700"></div>
                <div className="p-3 space-y-2">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-heading font-medium text-gray-900 dark:text-white">Anúncios Relevantes</h2>
        </div>
        <div className="p-4">
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
            <p className="text-red-700 dark:text-red-400">Erro ao carregar os anúncios</p>
          </div>
        </div>
      </div>
    );
  }

  const displayAds = limit ? ads?.slice(0, limit) : ads;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-heading font-medium text-gray-900 dark:text-white">Anúncios Relevantes</h2>
        <div className="flex items-center">
          {showFilter && (
            <Select onValueChange={handleCategoryChange}>
              <SelectTrigger className="text-sm h-8 w-[130px] mr-2">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="transport">Transportadora</SelectItem>
                <SelectItem value="farm">Fazenda</SelectItem>
              </SelectContent>
            </Select>
          )}
          <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center">
            Ver todos
            <i className="ri-arrow-right-s-line ml-1"></i>
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {displayAds?.map((ad) => (
            <div key={ad.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <div className="h-40 bg-gray-200 dark:bg-gray-700 relative">
                <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">Patrocinado</span>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-gray-900 dark:text-white">{ad.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{ad.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{ad.company}</span>
                  <a 
                    href={ad.contactUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center"
                  >
                    Contato
                    <i className="ri-external-link-line ml-1"></i>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
