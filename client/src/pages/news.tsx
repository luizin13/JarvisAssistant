import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { NewsArticle } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Badge,
} from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  source: string;
  category: string;
  imageUrl: string | null;
  publishedAt: string;
  url: string;
  relevance: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string;
  businessImpact: string | null;
}

export default function NewsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState("all");
  
  // Query para notícias normais
  const { data: articles, isLoading, error, refetch } = useQuery<NewsArticle[]>({
    queryKey: ['/api/news', category],
    enabled: activeTab === "all",
  });
  
  // Query específica para tendências de IA
  const { data: aiTrends, isLoading: aiTrendsLoading, error: aiTrendsError, refetch: refetchAiTrends } = useQuery<NewsItem[]>({
    queryKey: ['/api/ai-trends'],
    enabled: activeTab === "ai-trends",
  });
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  
  // Função para atualizar as notícias com dados mais recentes
  const refreshNews = async () => {
    try {
      setIsRefreshing(true);
      toast({
        title: "Atualizando notícias",
        description: "Buscando as notícias mais recentes...",
      });
      
      await fetch(`/api/news?refresh=true${category ? `&category=${category}` : ''}`);
      await refetch();
      
      toast({
        title: "Notícias atualizadas",
        description: "As notícias foram atualizadas com sucesso!",
        variant: "default",
      });
    } catch (err) {
      console.error("Erro ao atualizar notícias:", err);
      toast({
        title: "Erro ao atualizar notícias",
        description: "Não foi possível buscar as notícias mais recentes. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? undefined : value);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (e) {
      return 'data desconhecida';
    }
  };

  // Filtrar artigos
  const filteredArticles = articles ? articles.filter(article => {
    if (searchTerm === "") return true;
    return (
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.summary && article.summary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      article.source.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }) : [];
  
  // Filtrar tendências de IA
  const filteredAiTrends = aiTrends ? aiTrends.filter(article => {
    if (searchTerm === "") return true;
    return (
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.content && article.content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      article.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (article.keywords && article.keywords.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }) : [];

  return (
    <div className="p-4 lg:p-6 animate-in fade-in duration-500">
      <div className="mb-8 cognitive-group p-4 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start">
            <div className="p-2 rounded-full bg-primary/10 mr-3 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-primary">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                <path d="M18 14h-8"></path>
                <path d="M15 18h-5"></path>
                <path d="M10 6h8v4h-8V6Z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
                Notícias do Setor
              </h1>
              <p className="text-muted-foreground mt-1">
                Fique por dentro das últimas novidades sobre transportes e agricultura.
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="mt-3 sm:mt-0 cognitive-button"
            onClick={refreshNews}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? (
              <>
                <div className="cognitive-loading mr-2"></div>
                Atualizando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                Atualizar Notícias
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs 
        defaultValue="all" 
        className="mb-8 cognitive-tabs"
        onValueChange={(value) => setActiveTab(value)}
      >
        <TabsList className="mb-4 grid grid-cols-2 max-w-md cognitive-input-focus">
          <TabsTrigger value="all" className="cognitive-tab">Todas Notícias</TabsTrigger>
          <TabsTrigger value="ai-trends" className="cognitive-tab">
            Tendências de IA
            <Badge className="ml-2 cognitive-badge cognitive-badge-info text-xs">Novo</Badge>
          </TabsTrigger>
        </TabsList>
        
        <Card className="cognitive-card shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"></i>
                <Input 
                  type="text" 
                  placeholder="Buscar notícias" 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {activeTab === "all" && (
                <Select onValueChange={handleCategoryChange} defaultValue="all">
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Todas categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas categorias</SelectItem>
                    <SelectItem value="transport">Transportes</SelectItem>
                    <SelectItem value="farm">Fazenda</SelectItem>
                    <SelectItem value="tech">Tecnologia</SelectItem>
                    <SelectItem value="ai">Inteligência Artificial</SelectItem>
                    <SelectItem value="economy">Economia</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {activeTab === "ai-trends" && (
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto"
                  onClick={() => refetchAiTrends()}
                  disabled={aiTrendsLoading || isRefreshing}
                >
                  <i className="ri-robot-line mr-2"></i>
                  Atualizar Tendências
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Tabs>

      {/* Conteúdo da aba "Todas Notícias" */}
      {activeTab === "all" && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="flex">
                    <div className="shrink-0 w-24 h-24 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="p-4 w-full">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-3"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="pt-6">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <p className="text-red-700 dark:text-red-400">Erro ao carregar as notícias</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredArticles?.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <i className="ri-newspaper-line text-3xl text-gray-500 dark:text-gray-400"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma notícia encontrada</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Nenhuma notícia corresponde aos seus critérios de busca. Tente modificar os filtros ou realizar uma nova busca.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredArticles.map((article) => {
                const contentField = article.content;
                return (
                  <Card key={article.id} className="cognitive-card overflow-hidden transition-all">
                    <div className="flex flex-col sm:flex-row">
                      <div className="shrink-0 w-full sm:w-48 h-40 sm:h-auto bg-gray-200 dark:bg-gray-700 relative overflow-hidden group">
                        <img 
                          src={article.imageUrl || ""} 
                          alt={article.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-1/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <CardTitle className="mb-2 leading-tight">{article.title}</CardTitle>
                          {article.relevance && parseInt(article.relevance.toString()) > 80 && (
                            <Badge className="ml-2 cognitive-badge cognitive-badge-warning">
                              Relevante
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-muted-foreground mb-4 flex-1 line-clamp-3">{contentField}</p>
                        
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-primary font-medium">{article.source}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{formatDate(article.publishedAt)}</span>
                            <span className="text-muted-foreground">•</span>
                            <Badge variant="outline" className="text-xs cognitive-badge">
                              {article.category}
                            </Badge>
                          </div>
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="cognitive-actionable text-primary hover:text-primary flex items-center px-3 py-1 rounded-md"
                          >
                            Ler mais
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                              <path d="M7 7h10v10"></path>
                              <path d="M7 17 17 7"></path>
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Conteúdo da aba "Tendências de IA" */}
      {activeTab === "ai-trends" && (
        <>
          {aiTrendsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden animate-pulse">
                  <div className="flex">
                    <div className="shrink-0 w-24 h-24 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="p-4 w-full">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-3"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : aiTrendsError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                  <p className="text-red-700 dark:text-red-400">Erro ao carregar as tendências de IA</p>
                </div>
              </CardContent>
            </Card>
          ) : filteredAiTrends?.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <i className="ri-robot-line text-3xl text-gray-500 dark:text-gray-400"></i>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhuma tendência de IA encontrada</h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Nenhuma tendência corresponde aos seus critérios de busca. Tente modificar os filtros ou realizar uma nova busca.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredAiTrends.map((article) => {
                const sentimentColorClass = 
                  article.sentiment === 'positive' ? 'bg-green-500' : 
                  article.sentiment === 'negative' ? 'bg-red-500' : 
                  'bg-gray-500';
                
                const keywordsArray = article.keywords && typeof article.keywords === 'string' ? article.keywords.split(',') : [];
                
                return (
                  <Card key={article.id} className="cognitive-card overflow-hidden transition-all">
                    <div className="flex flex-col sm:flex-row">
                      <div className="shrink-0 w-full sm:w-48 h-40 sm:h-auto bg-gray-200 dark:bg-gray-700 relative overflow-hidden group">
                        <img 
                          src={article.imageUrl || "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80"} 
                          alt={article.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="mb-1 leading-tight flex items-center">
                            {article.title}
                            <span 
                              className={`ml-2 w-3 h-3 rounded-full ${sentimentColorClass} flex-shrink-0`} 
                              title={`Sentimento: ${article.sentiment === 'positive' ? 'Positivo' : article.sentiment === 'negative' ? 'Negativo' : 'Neutro'}`}
                            ></span>
                          </CardTitle>
                          <div className="flex">
                            {article.relevance && parseInt(article.relevance.toString()) > 80 && (
                              <Badge className="ml-2 cognitive-badge cognitive-badge-warning">
                                Alta Relevância
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground mb-3 flex-1 line-clamp-3">{article.content}</p>
                        
                        {article.businessImpact && (
                          <div className="mb-4 p-3 cognitive-alert cognitive-alert-info">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mr-2 h-5 w-5 text-blue-600 dark:text-blue-400">
                              <path d="M12 16v-4"></path>
                              <path d="M12 8h.01"></path>
                              <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                            <div>
                              <h4 className="text-blue-700 dark:text-blue-400 font-medium text-sm mb-1">Impacto nos Negócios:</h4>
                              <p className="text-blue-600 dark:text-blue-300 text-sm">{article.businessImpact}</p>
                            </div>
                          </div>
                        )}
                        
                        {keywordsArray.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {keywordsArray.map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-xs cognitive-badge">
                                {keyword.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-sm pt-2 border-t border-border/40">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-primary font-medium">{article.source}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{formatDate(article.publishedAt)}</span>
                            <span className="text-muted-foreground">•</span>
                            <Badge variant="outline" className="text-xs cognitive-badge">
                              {article.category === 'ai' ? 'IA' : article.category}
                            </Badge>
                          </div>
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="cognitive-actionable text-primary hover:text-primary flex items-center px-3 py-1 rounded-md"
                          >
                            Explorar
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                              <path d="M7 7h10v10"></path>
                              <path d="M7 17 17 7"></path>
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-8 flex justify-center items-center space-x-2 cognitive-group p-2 rounded-full inline-flex mx-auto">
        <Button variant="outline" className="rounded-full cognitive-button" disabled>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Anterior
        </Button>
        <div className="flex items-center space-x-1 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">1</div>
          <div className="w-8 h-8 rounded-full bg-muted/30 text-muted-foreground flex items-center justify-center">2</div>
          <div className="w-8 h-8 rounded-full bg-muted/30 text-muted-foreground flex items-center justify-center">3</div>
        </div>
        <Button variant="outline" className="rounded-full cognitive-button" disabled>
          Próximo
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Button>
      </div>
    </div>
  );
}