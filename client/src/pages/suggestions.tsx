import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BusinessSuggestion } from "@/lib/types";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SuggestionsPage() {
  const [category, setCategory] = useState<string | undefined>();
  
  const { data: suggestions, isLoading, error } = useQuery<BusinessSuggestion[]>({
    queryKey: ['/api/suggestions', category],
  });

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? undefined : value);
  };

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
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Sugestões para seu Negócio
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ideias e estratégias para melhorar seus negócios.
          </p>
        </div>
        <div className="flex items-center">
          <Select onValueChange={handleCategoryChange} defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              <SelectItem value="transport">Transportadora</SelectItem>
              <SelectItem value="farm">Fazenda</SelectItem>
              <SelectItem value="general">Geral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Gerar Novas Sugestões</CardTitle>
          <CardDescription>
            Use inteligência artificial para criar sugestões personalizadas para seu negócio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="w-full sm:w-auto" variant="outline">
              <i className="ri-truck-line mr-2"></i>
              Para Transportadora
            </Button>
            <Button className="w-full sm:w-auto" variant="outline">
              <i className="ri-plant-line mr-2"></i>
              Para Fazenda
            </Button>
            <Button className="w-full sm:w-auto">
              <i className="ri-lightbulb-line mr-2"></i>
              Sugestões Personalizadas
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                  <div className="flex space-x-2 mt-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <p className="text-red-700 dark:text-red-400">Erro ao carregar as sugestões</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {suggestions?.map((suggestion) => {
            const gradientClasses = getGradientClasses(suggestion.color);
            const colorClasses = getColorClasses(suggestion.color);
            
            return (
              <Card key={suggestion.id} className={`overflow-hidden`}>
                <div className={`${gradientClasses}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full ${colorClasses.bg} flex items-center justify-center ${colorClasses.text}`}>
                        <i className={`${suggestion.icon} text-xl`}></i>
                      </div>
                      <CardTitle>{suggestion.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{suggestion.description}</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {suggestion.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className={getBadgeColor(tag, suggestion.color)}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">
                      <i className="ri-chat-1-line mr-2"></i>
                      Discutir esta sugestão
                    </Button>
                  </CardFooter>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
