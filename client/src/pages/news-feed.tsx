import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle,
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  TrendingUp, 
  BarChart, 
  Clock, 
  Search,
  Filter,
  Eye
} from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Tipos de dados
interface NewsArticle {
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

interface Comment {
  id: number;
  username: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  likes: number;
}

// Comentários gerados por IA para cada notícia (serão substituídos por dados reais)
const aiGeneratedComments: Record<string, Comment[]> = {
  'default': [
    {
      id: 1,
      username: 'AssistenteAI',
      userAvatar: '',
      content: 'Este artigo pode ter implicações significativas para o seu negócio de transporte. Seria interessante considerar como essas tendências afetam sua operação.',
      timestamp: new Date().toISOString(),
      likes: 5
    }
  ]
};

// Componente principal
export default function NewsFeedPage() {
  // Estado
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [relevanceFilter, setRelevanceFilter] = useState<number>(0); // 0 = todos, 50 = média relevância, 80 = alta relevância
  const [openArticleId, setOpenArticleId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [savedArticles, setSavedArticles] = useState<number[]>([]);

  // Consulta de notícias
  const { data: newsArticles, isLoading, isError } = useQuery({
    queryKey: ['/api/news'],
    // A API já retorna todas as propriedades necessárias
  });

  // Consulta de tendências de IA
  const { data: aiTrends, isLoading: isLoadingAI } = useQuery({
    queryKey: ['/api/ai-trends'],
  });

  // Efeito para inicializar os comentários
  useEffect(() => {
    if (newsArticles && Array.isArray(newsArticles) && newsArticles.length > 0) {
      const initialComments: Record<number, Comment[]> = {};
      newsArticles.forEach((article: NewsArticle) => {
        initialComments[article.id] = aiGeneratedComments.default.map(comment => ({
          ...comment,
          content: comment.content.replace('transporte', article.category === 'farm' ? 'agricultura' : 'transporte')
        }));
      });
      setComments(initialComments);
    }
  }, [newsArticles]);

  // Artigos filtrados com base na pesquisa e filtros
  const filteredArticles = activeTab === 'ai' 
    ? (aiTrends && Array.isArray(aiTrends) ? aiTrends : [])
    : (newsArticles && Array.isArray(newsArticles)) 
      ? newsArticles
          .filter((article: NewsArticle) => {
            // Filtro de pesquisa
            if (searchQuery && !article.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
                !article.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
              return false;
            }
            
            // Filtro de relevância
            if (relevanceFilter > 0 && article.relevance && article.relevance < relevanceFilter) {
              return false;
            }
            
            return true;
          })
      : [];

  // Formatar data
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  // Adicionar comentário
  const handleAddComment = (articleId: number) => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now(),
      username: 'João Silva',
      userAvatar: '',
      content: newComment,
      timestamp: new Date().toISOString(),
      likes: 0
    };
    
    setComments(prev => ({
      ...prev,
      [articleId]: [...(prev[articleId] || []), comment]
    }));
    
    setNewComment('');
  };

  // Alternar favorito
  const toggleSaved = (articleId: number) => {
    setSavedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  // Renderizar sentimento
  const renderSentiment = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Positivo</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Negativo</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">Neutro</Badge>;
    }
  };

  // Renderizar indicador de relevância
  const renderRelevanceIndicator = (relevance: number) => {
    if (relevance >= 80) {
      return (
        <div className="flex items-center text-amber-500" title={`Relevância: ${relevance}%`}>
          <TrendingUp className="w-4 h-4 mr-1" />
          <span className="text-xs font-medium">Alta Relevância</span>
        </div>
      );
    } else if (relevance >= 50) {
      return (
        <div className="flex items-center text-blue-500" title={`Relevância: ${relevance}%`}>
          <BarChart className="w-4 h-4 mr-1" />
          <span className="text-xs font-medium">Relevante</span>
        </div>
      );
    }
    return null;
  };

  // Renderizar cartão de notícia
  const renderNewsCard = (article: NewsArticle) => {
    const isOpen = openArticleId === article.id;
    const isSaved = savedArticles.includes(article.id);
    const articleComments = comments[article.id] || [];
    
    return (
      <Card key={article.id} className="mb-6 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={`https://avatar.vercel.sh/${article.source.replace(/\s+/g, '')}.png`} />
                <AvatarFallback>{article.source.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{article.source}</p>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(article.publishedAt)}
                </p>
              </div>
            </div>
            <Badge variant="outline">{article.category}</Badge>
          </div>
          <CardTitle className="text-xl mt-3">{article.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {article.imageUrl && (
            <div className="mb-4 overflow-hidden rounded-md">
              <img 
                src={article.imageUrl} 
                alt={article.title} 
                className="w-full h-auto object-cover transition-transform hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?ixlib=rb-1.2.1&auto=format&fit=crop&w=400&q=80";
                }}
              />
            </div>
          )}

          <div className={`prose prose-sm dark:prose-invert max-w-none ${!isOpen && 'line-clamp-3'}`}>
            <p>{article.content}</p>
          </div>
          
          {!isOpen && (
            <Button variant="link" className="p-0 mt-1 h-auto" onClick={() => setOpenArticleId(article.id)}>
              Ler mais
            </Button>
          )}
          
          {isOpen && (
            <>
              {article.businessImpact && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-md">
                  <h4 className="text-blue-700 dark:text-blue-400 font-medium text-sm flex items-center mb-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Impacto nos Negócios:
                  </h4>
                  <p className="text-blue-600 dark:text-blue-300 text-sm">{article.businessImpact}</p>
                </div>
              )}
              
              {article.keywords && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {article.keywords.split(',').map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword.trim()}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {renderSentiment(article.sentiment)}
                  {renderRelevanceIndicator(article.relevance)}
                </div>
                <Button variant="link" className="text-sm" onClick={() => window.open(article.url, '_blank')}>
                  Fonte Original <Eye className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4 flex flex-col items-stretch">
          <div className="flex justify-between mb-4">
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <ThumbsUp className="h-4 w-4 mr-2" />
                <span>Útil</span>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpenArticleId(openArticleId === article.id ? null : article.id)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                <span>{articleComments.length}</span>
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Share2 className="h-4 w-4 mr-2" />
                <span>Compartilhar</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={isSaved ? "text-primary" : "text-muted-foreground"}
                onClick={() => toggleSaved(article.id)}
              >
                <Bookmark className="h-4 w-4 mr-2" fill={isSaved ? "currentColor" : "none"} />
                <span>{isSaved ? "Salvo" : "Salvar"}</span>
              </Button>
            </div>
          </div>
          
          {isOpen && (
            <div className="mt-2">
              <div className="space-y-4">
                {articleComments.map((comment) => (
                  <div key={comment.id} className="flex items-start">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={comment.userAvatar || `https://avatar.vercel.sh/${comment.username}.png`} />
                      <AvatarFallback>{comment.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex justify-between">
                          <span className="font-medium text-sm">{comment.username}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(comment.timestamp)}</span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                      </div>
                      <div className="flex items-center mt-1 ml-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          <span className="text-xs">{comment.likes}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2">
                          <span className="text-xs">Responder</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex items-start mt-4">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src="https://avatar.vercel.sh/joao.png" />
                  <AvatarFallback>JS</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea 
                    placeholder="Adicione um comentário..." 
                    className="min-h-[80px] resize-none"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <Button 
                      size="sm" 
                      onClick={() => handleAddComment(article.id)}
                      disabled={!newComment.trim()}
                    >
                      Comentar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  // Renderizar esqueletos de carregamento
  const renderSkeletons = () => (
    Array(3).fill(null).map((_, index) => (
      <Card key={index} className="mb-6">
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-3 w-[70px]" />
            </div>
          </div>
          <Skeleton className="h-6 w-3/4 mt-4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[200px] w-full rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex justify-between w-full">
            <Skeleton className="h-8 w-[120px]" />
            <Skeleton className="h-8 w-[120px]" />
          </div>
        </CardFooter>
      </Card>
    ))
  );

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Feed de Notícias</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Fique por dentro das notícias mais relevantes para seus negócios e interesses pessoais.
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className="relative w-full md:w-1/2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar notícias..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                {relevanceFilter === 0 ? 'Todos' : relevanceFilter === 80 ? 'Alta Relevância' : 'Relevante'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setRelevanceFilter(0)}>
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRelevanceFilter(50)}>
                Relevante (50%+)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRelevanceFilter(80)}>
                Alta Relevância (80%+)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="default">
            Atualizar
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="all">Todas as Notícias</TabsTrigger>
          <TabsTrigger value="ai">Tendências de IA</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-0">
          {isLoading ? (
            renderSkeletons()
          ) : isError ? (
            <div className="text-center py-8">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-medium">Erro ao carregar notícias</h3>
              <p className="text-muted-foreground mt-2">
                Não foi possível carregar as notícias. Tente novamente mais tarde.
              </p>
              <Button className="mt-4" variant="outline">Tentar novamente</Button>
            </div>
          ) : (Array.isArray(filteredArticles) && filteredArticles.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma notícia encontrada com os filtros atuais.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div>
                {Array.isArray(filteredArticles) && filteredArticles.map((article: NewsArticle) => renderNewsCard(article))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
        
        <TabsContent value="ai" className="mt-0">
          {isLoadingAI ? (
            renderSkeletons()
          ) : (!aiTrends || !Array.isArray(aiTrends) || aiTrends.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Nenhuma tendência de IA encontrada no momento.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div>
                {Array.isArray(aiTrends) && aiTrends.map((article: NewsArticle) => renderNewsCard(article))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}