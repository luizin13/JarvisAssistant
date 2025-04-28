import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CreditOpportunity } from "@/lib/types";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CreditPage() {
  const [category, setCategory] = useState<string | undefined>();
  
  const { data: opportunities, isLoading, error } = useQuery<CreditOpportunity[]>({
    queryKey: ['/api/credit', category],
  });

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? undefined : value);
  };

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
    <div className="p-4 lg:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            Oportunidades de Crédito
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Explore opções de financiamento para seus negócios.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select onValueChange={handleCategoryChange} defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todas categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              <SelectItem value="transport">Transportadora</SelectItem>
              <SelectItem value="farm">Fazenda</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <i className="ri-filter-line mr-2"></i>
            Filtros
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="recommended">Recomendadas</TabsTrigger>
          <TabsTrigger value="new">Novas</TabsTrigger>
          <TabsTrigger value="expiring">A vencer</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="space-y-2">
                          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <p className="text-red-700 dark:text-red-400">Erro ao carregar as oportunidades de crédito</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {opportunities?.map((opportunity) => {
                const colorClasses = getColorClasses(opportunity.color);
                
                return (
                  <Card key={opportunity.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-full ${colorClasses.bg} flex items-center justify-center ${colorClasses.text}`}>
                            <i className={`${opportunity.icon} text-xl`}></i>
                          </div>
                          <div>
                            <CardTitle className="text-lg">{opportunity.title}</CardTitle>
                            <CardDescription>{opportunity.institution}</CardDescription>
                          </div>
                        </div>
                        <span className={`${colorClasses.badge} px-2 py-1 rounded-full text-xs font-medium`}>
                          {opportunity.category === 'transport' ? 'Transportadora' : 'Fazenda'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{opportunity.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        {opportunity.amount && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Valor:</p>
                            <p className="font-medium">{opportunity.amount}</p>
                          </div>
                        )}
                        {opportunity.interestRate && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Taxa de Juros:</p>
                            <p className="font-medium">{opportunity.interestRate}</p>
                          </div>
                        )}
                        {opportunity.term && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Prazo:</p>
                            <p className="font-medium">{opportunity.term}</p>
                          </div>
                        )}
                      </div>
                      <Button className="w-full">Ver Detalhes</Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Other tabs would show filtered content */}
        <TabsContent value="recommended" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500 dark:text-gray-400">
                Selecione a aba "Todas" para ver as oportunidades disponíveis
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="new" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500 dark:text-gray-400">
                Selecione a aba "Todas" para ver as oportunidades disponíveis
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expiring" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500 dark:text-gray-400">
                Selecione a aba "Todas" para ver as oportunidades disponíveis
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Precisa de ajuda com crédito?</CardTitle>
            <CardDescription>
              Nosso assistente pode ajudar a encontrar a melhor solução para seu negócio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full">
              <i className="ri-robot-line mr-2"></i>
              Conversar com o Assistente
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
