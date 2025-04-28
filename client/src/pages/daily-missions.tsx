import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { BusinessSuggestion } from '@shared/schema';
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircleCheck, Target, BookOpen, Calendar, RefreshCw, ArrowRight, CheckCircle2, PenLine, MessageSquare, PlusCircle, Award, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

// Interface para missão diária
interface DailyMission {
  id: number;
  title: string;
  description: string;
  details: {
    titulo: string;
    descricao: string;
    passos: string[];
    beneficios: string[];
    tempoPrevisto: number;
    fundamentacao: string;
    categoria: string;
    nivel: string;
    data_criacao: string;
  };
  category: string;
  tags: string[];
  icon: string;
  color: string;
  completed?: boolean;
  reflection?: string;
}

// Componente principal da página de Missões Diárias
export default function DailyMissionsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('atual');
  const [selectedMission, setSelectedMission] = useState<DailyMission | null>(null);
  const [reflection, setReflection] = useState('');
  const [isReflectionDialogOpen, setIsReflectionDialogOpen] = useState(false);
  const [isGeneratingMission, setIsGeneratingMission] = useState(false);
  const [newMissionParams, setNewMissionParams] = useState({
    categoria: 'performance_pessoal',
    nivel: 'intermediario',
    foco: '',
  });

  // Obter sugestões/missões do servidor
  const { 
    data: suggestions, 
    isLoading, 
    error,
    refetch 
  } = useQuery<BusinessSuggestion[]>({
    queryKey: ['/api/suggestions'],
    queryFn: async () => {
      const response = await fetch('/api/suggestions');
      if (!response.ok) {
        throw new Error('Falha ao carregar missões');
      }
      return response.json();
    }
  });

  // Filtra apenas as missões diárias (com tag evolução_diária)
  const missions = suggestions?.filter(
    suggestion => suggestion.tags.includes('evolução_diária')
  ).map(suggestion => {
    // Tentar fazer parse do JSON na descrição
    try {
      const details = JSON.parse(suggestion.description);
      return {
        ...suggestion,
        details,
        completed: false, // Estado inicial, será atualizado depois
      } as DailyMission;
    } catch (e) {
      console.error('Erro ao parsear missão:', e);
      return {
        ...suggestion,
        details: {
          titulo: suggestion.title,
          descricao: suggestion.description,
          passos: ['Missão com formato inválido'],
          beneficios: [''],
          tempoPrevisto: 30,
          fundamentacao: '',
          categoria: 'performance_pessoal',
          nivel: 'intermediario',
          data_criacao: new Date().toISOString()
        },
        completed: false
      } as DailyMission;
    }
  }) || [];

  // Ordenar missões por data de criação (mais recente primeiro)
  const sortedMissions = [...missions].sort((a, b) => {
    const dateA = new Date(a.details.data_criacao).getTime();
    const dateB = new Date(b.details.data_criacao).getTime();
    return dateB - dateA;
  });

  // Missão atual (a mais recente)
  const currentMission = sortedMissions.length > 0 ? sortedMissions[0] : null;
  
  // Missões anteriores (todas exceto a atual)
  const previousMissions = sortedMissions.slice(1);

  // Mutação para completar/refletir sobre uma missão
  const completeMissionMutation = useMutation({
    mutationFn: async (data: { 
      missaoId: number; 
      completada: boolean; 
      reflexao: string;
      dificuldade?: string;
    }) => {
      return await apiRequest('/api/multi-agent/mission/complete', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
      toast({
        title: 'Missão atualizada',
        description: 'Sua reflexão foi registrada com sucesso.',
      });
      setReflection('');
      setIsReflectionDialogOpen(false);
    },
    onError: (error) => {
      console.error('Erro ao atualizar missão:', error);
      toast({
        title: 'Erro ao atualizar missão',
        description: 'Não foi possível registrar sua reflexão. Tente novamente.',
        variant: 'destructive',
      });
    }
  });

  // Mutação para gerar uma nova missão
  const generateMissionMutation = useMutation({
    mutationFn: async (data: { 
      categoria: string; 
      nivel: string; 
      foco?: string;
    }) => {
      return await apiRequest('/api/multi-agent/mission/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/suggestions'] });
      toast({
        title: 'Nova missão gerada',
        description: 'Sua missão diária foi criada com sucesso.',
      });
      setIsGeneratingMission(false);
    },
    onError: (error) => {
      console.error('Erro ao gerar missão:', error);
      toast({
        title: 'Erro ao gerar missão',
        description: 'Não foi possível criar sua missão. Tente novamente.',
        variant: 'destructive',
      });
      setIsGeneratingMission(false);
    }
  });

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Componente de cartão para a missão atual
  const CurrentMissionCard = ({ mission }: { mission: DailyMission }) => {
    return (
      <Card className="mb-6 border-2 border-primary/30 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <Badge className="mb-2" variant="secondary">
                {mission.details.categoria.replace('_', ' ')}
              </Badge>
              <Badge className="mb-2 ml-2" variant="outline">
                {mission.details.nivel}
              </Badge>
            </div>
            <Badge className="bg-primary">Hoje</Badge>
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold">
            {mission.details.titulo}
          </CardTitle>
          <CardDescription className="text-sm pt-1">
            Criada em {formatDate(mission.details.data_criacao)}
            {' • '} Tempo estimado: {mission.details.tempoPrevisto} min
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-md mb-2 flex items-center">
                <Target className="h-4 w-4 mr-2 text-primary" />
                Objetivo
              </h4>
              <p className="text-muted-foreground">{mission.details.descricao}</p>
            </div>
            
            <div>
              <h4 className="font-semibold text-md mb-2 flex items-center">
                <ArrowRight className="h-4 w-4 mr-2 text-primary" />
                Passos
              </h4>
              <ul className="space-y-2 ml-2">
                {mission.details.passos.map((passo, index) => (
                  <li key={index} className="flex items-start">
                    <div className="mt-1 mr-2 flex-shrink-0">
                      <div className="h-5 w-5 rounded-full border border-primary flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                    </div>
                    <span className="text-sm">{passo}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-md mb-2 flex items-center">
                <Award className="h-4 w-4 mr-2 text-primary" />
                Benefícios
              </h4>
              <ul className="space-y-1 ml-6 list-disc">
                {mission.details.beneficios.map((beneficio, index) => (
                  <li key={index} className="text-sm">{beneficio}</li>
                ))}
              </ul>
            </div>
            
            {mission.details.fundamentacao && (
              <div className="p-3 bg-muted rounded-md mt-4">
                <h4 className="font-medium text-sm mb-1 flex items-center">
                  <BookOpen className="h-4 w-4 mr-1 text-primary" />
                  Fundamentação
                </h4>
                <p className="text-xs text-muted-foreground">{mission.details.fundamentacao}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-1">
          <div className="flex flex-col w-full gap-3">
            <Button 
              className="w-full"
              onClick={() => {
                setSelectedMission(mission);
                setIsReflectionDialogOpen(true);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Completar e Refletir
            </Button>
          </div>
        </CardFooter>
      </Card>
    );
  };

  // Componente de cartão para missões anteriores
  const PreviousMissionCard = ({ mission }: { mission: DailyMission }) => {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <Badge variant="outline">
              {mission.details.categoria.replace('_', ' ')}
            </Badge>
            <Badge variant="outline">
              {formatDate(mission.details.data_criacao).split(' ')[0]}
            </Badge>
          </div>
          <CardTitle className="text-lg mt-2">{mission.details.titulo}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2">{mission.details.descricao}</p>
          
          {mission.reflection ? (
            <div className="mt-3 p-2 bg-muted rounded-md">
              <h4 className="font-medium text-sm mb-1 flex items-center">
                <PenLine className="h-4 w-4 mr-1 text-primary" />
                Sua reflexão
              </h4>
              <p className="text-xs text-muted-foreground">{mission.reflection}</p>
            </div>
          ) : (
            <div className="mt-3">
              <Button 
                variant="outline" 
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelectedMission(mission);
                  setIsReflectionDialogOpen(true);
                }}
              >
                <PenLine className="mr-2 h-3 w-3" />
                Adicionar reflexão
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Modal para reflexão sobre uma missão
  const ReflectionDialog = () => {
    if (!selectedMission) return null;
    
    return (
      <Dialog 
        open={isReflectionDialogOpen} 
        onOpenChange={setIsReflectionDialogOpen}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reflexão sobre a missão</DialogTitle>
            <DialogDescription>
              Registre suas reflexões sobre a missão "{selectedMission.details.titulo}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">O que você aprendeu com esta missão?</h4>
              <Textarea
                placeholder="Compartilhe suas reflexões, aprendizados e resultados..."
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsReflectionDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                completeMissionMutation.mutate({
                  missaoId: selectedMission.id,
                  completada: true,
                  reflexao: reflection
                })
              }}
              disabled={completeMissionMutation.isPending}
            >
              {completeMissionMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Salvar Reflexão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Modal para criar nova missão
  const NewMissionDialog = () => {
    return (
      <Dialog 
        open={isGeneratingMission} 
        onOpenChange={setIsGeneratingMission}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Missão Diária</DialogTitle>
            <DialogDescription>
              Configure os parâmetros para sua próxima missão de evolução de 1%
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Categoria da Missão</h4>
              <select 
                className="w-full p-2 border rounded-md" 
                value={newMissionParams.categoria}
                onChange={(e) => setNewMissionParams({
                  ...newMissionParams,
                  categoria: e.target.value
                })}
              >
                <option value="performance_pessoal">Performance Pessoal</option>
                <option value="mentalidade_lideranca">Mentalidade de Liderança</option>
                <option value="decisoes_empresariais">Decisões Empresariais</option>
                <option value="habitos_produtivos">Hábitos Produtivos</option>
                <option value="comunicacao_estrategica">Comunicação Estratégica</option>
                <option value="negociacao">Negociação</option>
                <option value="gestao_tempo">Gestão de Tempo</option>
                <option value="inteligencia_emocional">Inteligência Emocional</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Nível de Desafio</h4>
              <select 
                className="w-full p-2 border rounded-md" 
                value={newMissionParams.nivel}
                onChange={(e) => setNewMissionParams({
                  ...newMissionParams,
                  nivel: e.target.value
                })}
              >
                <option value="iniciante">Iniciante</option>
                <option value="intermediario">Intermediário</option>
                <option value="avancado">Avançado</option>
                <option value="especialista">Especialista</option>
                <option value="mestre">Mestre</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Foco Específico (opcional)</h4>
              <Input
                placeholder="Ex: reuniões, gestão de equipe, tomada de decisão..."
                value={newMissionParams.foco}
                onChange={(e) => setNewMissionParams({
                  ...newMissionParams,
                  foco: e.target.value
                })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsGeneratingMission(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                generateMissionMutation.mutate({
                  categoria: newMissionParams.categoria,
                  nivel: newMissionParams.nivel,
                  foco: newMissionParams.foco || undefined
                })
              }}
              disabled={generateMissionMutation.isPending}
            >
              {generateMissionMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Gerar Missão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-8 flex justify-center items-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-4">Erro ao carregar missões</h1>
        <p className="text-muted-foreground">{(error as Error).message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Missões Diárias</h1>
          <p className="text-muted-foreground">Evolução diária de 1% para resultados extraordinários</p>
        </div>
        <Button onClick={() => setIsGeneratingMission(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Missão
        </Button>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-xl font-semibold">Seu progresso</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Missões concluídas</span>
                <span className="text-2xl font-bold">{previousMissions.filter(m => m.completed).length}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Sequência atual</span>
                <span className="text-2xl font-bold">3 dias</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Nível médio</span>
                <span className="text-2xl font-bold">Intermediário</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Categoria favorita</span>
                <span className="text-2xl font-bold">Liderança</span>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progresso semanal</span>
                <span>5/7 dias</span>
              </div>
              <Progress value={71} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs 
        defaultValue="atual" 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="atual">Missão Atual</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="atual" className="mt-4">
          {currentMission ? (
            <CurrentMissionCard mission={currentMission} />
          ) : (
            <Card className="p-8 flex flex-col items-center justify-center text-center">
              <Avatar className="h-16 w-16 mb-4 bg-primary/20">
                <AvatarFallback>
                  <Target className="h-8 w-8 text-primary" />
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold mb-2">Nenhuma missão ativa</h3>
              <p className="text-muted-foreground mb-6">
                Você não tem uma missão ativa no momento. Crie uma nova missão para continuar sua evolução diária.
              </p>
              <Button onClick={() => setIsGeneratingMission(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Nova Missão
              </Button>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="historico" className="mt-4">
          <ScrollArea className="h-[600px] pr-4">
            {previousMissions.length > 0 ? (
              <div className="space-y-4">
                {previousMissions.map((mission) => (
                  <PreviousMissionCard key={mission.id} mission={mission} />
                ))}
              </div>
            ) : (
              <Card className="p-8 flex flex-col items-center justify-center text-center">
                <Avatar className="h-16 w-16 mb-4 bg-primary/20">
                  <AvatarFallback>
                    <Calendar className="h-8 w-8 text-primary" />
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold mb-2">Sem histórico</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não tem missões anteriores.
                  Comece hoje mesmo sua jornada de crescimento de 1% diário!
                </p>
              </Card>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
      
      {/* Diálogos */}
      <ReflectionDialog />
      <NewMissionDialog />
    </div>
  );
}