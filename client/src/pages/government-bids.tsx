import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { GovernmentBid } from "@/lib/types";
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export default function GovernmentBidsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  
  const { data: bids, isLoading, error } = useQuery<GovernmentBid[]>({
    queryKey: ['/api/government-bids', category],
  });
  
  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? undefined : value);
  };
  
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return 'data desconhecida';
    }
  };
  
  const formatRelativeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (e) {
      return 'data desconhecida';
    }
  };
  
  const getDaysRemaining = (closingDate: string) => {
    const today = new Date();
    const closeDate = new Date(closingDate);
    
    // Calcular a diferença em dias
    const diff = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (diff <= 0) {
      return "Encerrado";
    } else if (diff === 1) {
      return "1 dia";
    } else {
      return `${diff} dias`;
    }
  };
  
  const getStatusBadge = (status: string, closingDate: string) => {
    const daysRemaining = getDaysRemaining(closingDate);
    
    if (daysRemaining === "Encerrado" || status === "closed") {
      return <Badge variant="outline" className="bg-gray-100 text-gray-600">Encerrado</Badge>;
    } else if (status === "draft") {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-600">Rascunho</Badge>;
    } else if (typeof daysRemaining === "string" && parseInt(daysRemaining) <= 5) {
      return <Badge variant="outline" className="bg-red-100 text-red-600">Urgente - {daysRemaining}</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-600">Aberto - {daysRemaining}</Badge>;
    }
  };
  
  const filteredBids = bids?.filter(bid => {
    if (searchTerm === "") return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      bid.title.toLowerCase().includes(searchLower) ||
      bid.description.toLowerCase().includes(searchLower) ||
      bid.agency.toLowerCase().includes(searchLower) ||
      bid.bidNumber.toLowerCase().includes(searchLower)
    );
  });
  
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
          Licitações Governamentais
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Oportunidades de negócios com o governo para sua transportadora e fazenda.
        </p>
      </div>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"></i>
              <Input 
                type="text" 
                placeholder="Buscar licitações..." 
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
                <SelectItem value="general">Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <p className="text-red-700 dark:text-red-400">Erro ao carregar as licitações</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredBids?.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <i className="ri-file-list-3-line text-3xl text-gray-500 dark:text-gray-400"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma licitação encontrada</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Não encontramos licitações que correspondem aos seus critérios de busca. Tente modificar os filtros ou realizar uma nova busca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredBids?.map((bid) => (
            <Card key={bid.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{bid.title}</CardTitle>
                  {getStatusBadge(bid.status, bid.closingDate)}
                </div>
                <CardDescription className="flex items-center">
                  <span className="font-medium">{bid.agency}</span>
                  <span className="text-gray-500 dark:text-gray-400 mx-2">•</span>
                  <span className="text-sm">{bid.bidNumber}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {bid.description}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mt-4">
                  <div className="flex items-center">
                    <i className="ri-calendar-line text-gray-500 dark:text-gray-400 mr-2"></i>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Publicação:</span>
                      <span className="font-medium">{formatDate(bid.publishedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-time-line text-gray-500 dark:text-gray-400 mr-2"></i>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Encerramento:</span>
                      <span className="font-medium">{formatDate(bid.closingDate)}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <i className="ri-money-dollar-circle-line text-gray-500 dark:text-gray-400 mr-2"></i>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Valor estimado:</span>
                      <span className="font-medium">{bid.value}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <i className="ri-time-line mr-1"></i>
                        <span>{formatRelativeDate(bid.publishedAt)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Publicado em {formatDate(bid.publishedAt)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button asChild variant="outline">
                  <a href={bid.url} target="_blank" rel="noopener noreferrer">
                    Ver licitação
                    <i className="ri-external-link-line ml-2"></i>
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}