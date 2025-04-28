import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MetaAd } from "@/lib/types";
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function MetaAdsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  
  const { data: ads, isLoading, error } = useQuery<MetaAd[]>({
    queryKey: ['/api/ads', category],
  });

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? undefined : value);
  };

  const filteredAds = ads?.filter(ad => {
    if (searchTerm === "") return true;
    return (
      ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.company.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Anúncios Meta
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Encontre parceiros e serviços relevantes para seu negócio.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"></i>
              <Input 
                type="text" 
                placeholder="Buscar anúncios" 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select onValueChange={handleCategoryChange} defaultValue="all">
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Todas categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                <SelectItem value="transport">Transportadora</SelectItem>
                <SelectItem value="farm">Fazenda</SelectItem>
                <SelectItem value="other">Outros</SelectItem>
              </SelectContent>
            </Select>
            <Button className="shrink-0">
              <i className="ri-filter-line mr-2"></i>
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700"></div>
              <CardContent className="pt-6 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <p className="text-red-700 dark:text-red-400">Erro ao carregar os anúncios</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredAds?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <i className="ri-advertisement-line text-3xl text-gray-500 dark:text-gray-400"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum anúncio encontrado</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Nenhum anúncio corresponde aos seus critérios de busca. Tente modificar os filtros ou realizar uma nova busca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAds?.map((ad) => (
            <Card key={ad.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                <span className="absolute top-2 right-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  Patrocinado
                </span>
                <span className="absolute top-2 left-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
                  {ad.category === 'transport' ? 'Transporte' : 
                   ad.category === 'farm' ? 'Fazenda' : 'Geral'}
                </span>
              </div>
              <CardContent className="pt-4">
                <CardTitle className="text-lg">{ad.title}</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-3">
                  {ad.description}
                </p>
              </CardContent>
              <CardFooter className="flex items-center justify-between pt-0">
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
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button variant="outline" className="mr-2" disabled>
          <i className="ri-arrow-left-s-line mr-1"></i>
          Anterior
        </Button>
        <Button variant="outline" disabled>
          Próximo
          <i className="ri-arrow-right-s-line ml-1"></i>
        </Button>
      </div>
    </div>
  );
}
