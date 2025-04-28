import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Loader2, Send, Play, CalendarRange, CircleHelp, Brain, Users, RefreshCw, CheckCircle, BellRing, X, Stethoscope, RefreshCcw } from "lucide-react";

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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// Interfaces
interface AgentMessage {
  id: string;
  content: string;
  from: string;
  to: string;
  timestamp: string;
  attachments?: Array<{
    type: 'text' | 'image' | 'link' | 'data';
    content: any;
  }>;
}

interface TaskStep {
  id: string;
  description: string;
  agent: string;
  state: 'pending' | 'planning' | 'in_progress' | 'awaiting_user_input' | 'completed' | 'failed';
  messages: AgentMessage[];
  result?: string;
  startTime?: string;
  endTime?: string;
  requiresUserInput?: boolean;
  userInputPrompt?: string;
  userInput?: string;
  error?: string;
  slackNotified?: boolean;
  slackMessageTs?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  state: 'pending' | 'planning' | 'in_progress' | 'awaiting_user_input' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userId?: number;
  steps: TaskStep[];
  requiredAgents: string[];
  context: {
    businessType?: 'transport' | 'farm' | 'both' | 'personal';
    userMemory?: string;
    userPreferences?: Record<string, any>;
    additionalContext?: string;
  };
  result?: string;
  error?: string;
  slackNotified?: boolean;
  slackMessageTs?: string;
}

// Interface para status do modo intensivo
interface IntensiveModeStatus {
  enabled: boolean;
  options: {
    maxRounds: number;
    autoLearn: boolean;
    timeout: number;
    notifyOnProgress: boolean;
    retryOnFailure: boolean;
    maxRetries: number;
  };
  activeTasks?: Array<{
    agentType: string;
    startTime?: string;
    taskId?: string;
  }>;
  logs?: string[];
  history?: Array<{
    agentType: string;
    content?: string;
    timestamp: string;
  }>;
  stats?: {
    totalCycles: number;
    completedCycles: number;
    pendingCycles: number;
    failedCycles: number;
    averageTimePerCycle: number;
    currentCycleStartTime: string | null;
    estimatedCompletion: string | null;
  };
  lastUpdate?: string;
}

// Componente de avatar para agentes
const AgentAvatar = ({ agentType }: { agentType: string }) => {
  // Determina a cor de fundo com base no tipo de agente
  const getAvatarColor = (type: string) => {
    const colorMap: Record<string, string> = {
      coordinator: 'bg-amber-500',
      planner: 'bg-indigo-500',
      researcher: 'bg-green-500',
      analyst: 'bg-purple-500',
      advisor: 'bg-blue-500',
      summarizer: 'bg-teal-500',
      executor: 'bg-red-500',
      evaluator: 'bg-cyan-500',
      critic: 'bg-lime-500',
      transport_expert: 'bg-orange-500',
      farm_expert: 'bg-emerald-500',
      finance_expert: 'bg-pink-500',
      tech_expert: 'bg-violet-500',
      personal_coach: 'bg-yellow-500',
      user: 'bg-slate-600'
    };
    
    return colorMap[type.toLowerCase()] || 'bg-gray-500';
  };
  
  // Determina as iniciais com base no tipo de agente
  const getInitials = (type: string) => {
    if (type === 'user') return 'US';
    
    const displayNameMap: Record<string, string> = {
      coordinator: 'CO',
      planner: 'PL',
      researcher: 'PE',
      analyst: 'AN',
      advisor: 'AD',
      summarizer: 'SI',
      executor: 'EX',
      evaluator: 'AV',
      critic: 'CR',
      transport_expert: 'TR',
      farm_expert: 'AG',
      finance_expert: 'FI',
      tech_expert: 'TE',
      personal_coach: 'PC'
    };
    
    return displayNameMap[type.toLowerCase()] || type.substring(0, 2).toUpperCase();
  };
  
  // Define a imagem com base no tipo de agente
  const getAgentImage = (type: string) => {
    return undefined; // Para implementação futura com imagens personalizadas
  };
  
  return (
    <Avatar className={`${getAvatarColor(agentType)} h-8 w-8`}>
      <AvatarImage src={getAgentImage(agentType)} />
      <AvatarFallback>{getInitials(agentType)}</AvatarFallback>
    </Avatar>
  );
};

// Componente para exibir o status da tarefa
const TaskStatusBadge = ({ state, hasNotification = false }: { state: string; hasNotification?: boolean }) => {
  const statusMap: Record<string, { 
    label: string; 
    color: string; 
    icon: React.ReactNode;
    description: string;
  }> = {
    pending: { 
      label: 'Pendente', 
      color: 'bg-slate-500', 
      icon: <Play className="h-3 w-3 mr-1" />,
      description: 'Aguardando processamento'
    },
    planning: { 
      label: 'Planejando', 
      color: 'bg-amber-500', 
      icon: <Brain className="h-3 w-3 mr-1" />,
      description: 'Desenvolvendo estratégia'
    },
    in_progress: { 
      label: 'Em Progresso', 
      color: 'bg-blue-500',
      icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
      description: 'Processando a tarefa'
    },
    awaiting_user_input: { 
      label: 'Aguardando Input', 
      color: 'bg-purple-500',
      icon: <CircleHelp className="h-3 w-3 mr-1" />,
      description: 'Esperando sua resposta'
    },
    completed: { 
      label: 'Concluída', 
      color: 'bg-green-500',
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
      description: 'Tarefa finalizada com sucesso'
    },
    failed: { 
      label: 'Falha', 
      color: 'bg-red-500',
      icon: <X className="h-3 w-3 mr-1" />,
      description: 'Ocorreu um erro durante o processamento'
    }
  };
  
  const status = statusMap[state] || { 
    label: state, 
    color: 'bg-gray-500',
    icon: <RefreshCw className="h-3 w-3 mr-1" />,
    description: 'Estado desconhecido'
  };
  
  return (
    <div className="flex items-end gap-2">
      {hasNotification && (
        <Badge 
          variant="outline" 
          className="bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-300 flex items-center gap-1"
          title="Notificação enviada ao Slack"
        >
          <BellRing className="h-3 w-3" />
          Slack
        </Badge>
      )}
      <Badge 
        className={`${status.color} hover:${status.color} flex items-center`}
        title={status.description}
      >
        {status.icon}
        {status.label}
      </Badge>
    </div>
  );
};

// Função para iniciar um diálogo entre os agentes especializados para melhorar o sistema
const startSystemImprovementDialogue = async () => {
  try {
    const response = await fetch('/api/multi-agent/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Análise colaborativa para melhoria do sistema',
        description: 'Realizar uma análise completa do sistema atual, identificar pontos de melhoria e colaborar entre agentes especializados para propor implementações que otimizem a experiência do usuário, especialmente na integração entre assistente de voz e tarefas multi-agente.',
        businessType: 'both',
        additionalContext: `
        Realizar uma análise colaborativa entre diferentes especialistas com o objetivo de:
        
        1. Analisar pontos fortes e fracos da integração atual entre assistente de voz e sistema multi-agente
        2. Identificar possíveis problemas de usabilidade na interface e propor melhorias
        3. Explorar formas de otimizar a comunicação entre os diferentes agentes
        4. Sugerir novos recursos que possam beneficiar um empresário com negócios em transporte e agronegócio
        5. Propor um plano de implementação para as melhorias mais prioritárias
        
        Este é um diálogo meta, onde os agentes devem analisar o próprio sistema em que estão operando e propor melhorias técnicas e de experiência de usuário. 
        Considerar perspectivas técnicas, de negócios e de experiência do usuário.
        `
      })
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao criar tarefa: ${response.status} ${response.statusText}`);
    }
    
    const taskResponse = await response.json();
    return taskResponse.id;
  } catch (error) {
    console.error('Erro ao iniciar diálogo de melhoria do sistema:', error);
    throw error;
  }
};

// Componente principal do Sistema Multi-Agente
export default function MultiAgentPage() {
  const { toast } = useToast();
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("tasks");
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    businessType: 'both',
    additionalContext: ''
  });
  const [userInput, setUserInput] = useState('');
  const [isStartingSystemImprovement, setIsStartingSystemImprovement] = useState(false);
  const eventsSourceRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Estado para o modo intensivo
  const [intensiveMode, setIntensiveMode] = useState({
    enabled: false,
    options: {
      maxRounds: 5,
      autoLearn: true,
      timeout: 60000,
      notifyOnProgress: true,
      retryOnFailure: true,
      maxRetries: 2
    }
  });
  
  // Função para selecionar uma tarefa e mudar para a aba de progresso
  const handleSelectTask = (taskId: string) => {
    console.log('Selecionando tarefa:', taskId);
    setActiveTask(taskId);
    setActiveTab('progress');
  };
  
  // Consulta para obter todas as tarefas
  const { 
    data: tasks, 
    isLoading, 
    error 
  } = useQuery<Task[]>({
    queryKey: ['/api/multi-agent/tasks'],
    refetchInterval: 5000 // Atualiza a cada 5 segundos
  });
  
  // Consulta para obter detalhes de uma tarefa específica
  const { 
    data: taskDetails, 
    isLoading: isLoadingTaskDetails 
  } = useQuery<Task>({
    queryKey: ['/api/multi-agent/tasks', activeTask],
    enabled: !!activeTask,
    refetchInterval: activeTask ? 2000 : false // Atualiza a cada 2 segundos quando há uma tarefa ativa
  });
  
  // Mutação para criar uma nova tarefa
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest('/api/multi-agent/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks'] });
      handleSelectTask(data.id);
      toast({
        title: 'Tarefa criada',
        description: 'Sua tarefa foi criada com sucesso e está em processamento.',
      });
      // Limpa o formulário
      setNewTaskForm({
        title: '',
        description: '',
        businessType: 'both',
        additionalContext: ''
      });
    },
    onError: (error) => {
      console.error('Erro ao criar tarefa:', error);
      toast({
        title: 'Erro ao criar tarefa',
        description: 'Não foi possível criar a tarefa. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutação para enviar input do usuário
  const submitUserInputMutation = useMutation({
    mutationFn: async ({ taskId, stepId, input }: { taskId: string; stepId: string; input: string }) => {
      return await apiRequest(`/api/multi-agent/tasks/${taskId}/steps/${stepId}/input`, {
        method: 'POST',
        body: JSON.stringify({ input }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks', activeTask] });
      setUserInput('');
      toast({
        title: 'Input enviado',
        description: 'Seu input foi enviado com sucesso e está sendo processado.',
      });
    },
    onError: (error) => {
      console.error('Erro ao enviar input:', error);
      toast({
        title: 'Erro ao enviar input',
        description: 'Não foi possível enviar seu input. Por favor, tente novamente.',
        variant: 'destructive',
      });
    }
  });
  
  // Função para converter a data para formato legível
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Data desconhecida';
      const date = new Date(dateString);
      // Verifica se a data é válida
      if (isNaN(date.getTime())) return 'Data inválida';
      
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateString);
      return 'Data inválida';
    }
  };
  
  // Tipo para o modo intensivo
  interface IntensiveModeStatus {
    enabled: boolean;
    options: {
      maxRounds: number;
      autoLearn: boolean;
      timeout: number;
      notifyOnProgress: boolean;
      retryOnFailure: boolean;
      maxRetries: number;
    };
  }
  
  // Consulta para obter o status do modo intensivo
  const { 
    data: intensiveModeStatus,
    isLoading: isLoadingIntensiveMode,
    error: intensiveModeError 
  } = useQuery<IntensiveModeStatus>({
    queryKey: ['/api/multi-agent/intensive-mode'],
    refetchOnWindowFocus: false,
    retry: 3
  });
  
  // Consulta para status detalhado do modo intensivo (inclui progresso em tempo real)
  const {
    data: intensiveDetailedStatus,
    isLoading: isLoadingDetailedStatus,
    error: detailedStatusError
  } = useQuery<any>({
    queryKey: ['/api/multi-agent/intensive-mode/status'],
    refetchInterval: intensiveModeStatus?.enabled ? 1000 : false, // Atualiza a cada segundo se o modo intensivo estiver ativado
    enabled: !!intensiveModeStatus?.enabled,
    retry: 2
  });
  
  // Registra erros no console
  useEffect(() => {
    if (intensiveModeError) {
      console.error('Erro ao verificar modo intensivo:', intensiveModeError);
    }
  }, [intensiveModeError]);
  
  // Atualiza o estado local quando os dados são carregados
  useEffect(() => {
    if (intensiveModeStatus) {
      console.log('Status do modo intensivo carregado:', intensiveModeStatus);
      setIntensiveMode({
        enabled: intensiveModeStatus.enabled,
        options: intensiveModeStatus.options
      });
    }
  }, [intensiveModeStatus]);
  
  // Mutação para ativar/desativar o modo intensivo
  const toggleIntensiveModeMutation = useMutation({
    mutationFn: async (data: { enabled: boolean, options?: IntensiveModeStatus['options'] }) => {
      const url = '/api/multi-agent/intensive-mode';
      const options = {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      };
      
      try {
        const response = await fetch(url, { 
          ...options, 
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
        const jsonData = await response.json();
        return jsonData as IntensiveModeStatus;
      } catch (error) {
        console.error('Erro ao chamar API de modo intensivo:', error);
        throw error;
      }
    },
    onSuccess: (data: IntensiveModeStatus) => {
      console.log('Modo intensivo atualizado com sucesso:', data);
      setIntensiveMode(data);
      toast({
        title: `Modo MULTIAGENTE INTENSIVO ${data.enabled ? 'ativado' : 'desativado'}`,
        description: data.enabled 
          ? `Modo intensivo ativado com ${data.options.maxRounds} rodadas máximas de interação.`
          : 'Modo intensivo desativado.',
      });
    },
    onError: (error) => {
      console.error('Erro ao configurar modo intensivo:', error);
      toast({
        title: 'Erro ao configurar modo intensivo',
        description: 'Não foi possível configurar o modo intensivo.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutação para reiniciar o loop de execução
  const resetExecutionLoopMutation = useMutation({
    mutationFn: async () => {
      const url = '/api/multi-agent/reset-execution';
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };
      
      try {
        const response = await fetch(url, { 
          ...options, 
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Erro ao reiniciar loop de execução:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Loop de execução reiniciado com sucesso:', data);
      
      // Atualiza todas as consultas relacionadas para refletir as mudanças
      queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/intensive-mode/status'] });
      
      toast({
        title: 'Sistema reiniciado',
        description: data.message || 'O loop de execução foi reiniciado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Erro ao reiniciar loop de execução:', error);
      toast({
        title: 'Erro ao reiniciar sistema',
        description: 'Não foi possível reiniciar o loop de execução.',
        variant: 'destructive',
      });
    }
  });
  
  // Mutação para realizar diagnóstico do sistema
  const systemDiagnosticMutation = useMutation({
    mutationFn: async () => {
      const url = '/api/multi-agent/diagnostic';
      
      try {
        const response = await fetch(url, { 
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Erro ao realizar diagnóstico do sistema:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Diagnóstico do sistema concluído:', data);
      
      // Exibe resultado do diagnóstico em um toast
      toast({
        title: 'Diagnóstico do sistema',
        description: 'Diagnóstico concluído. Verificando problemas...',
      });
      
      // Se houver erros no diagnóstico, exibe alerta
      if (data.errors && data.errors.length > 0) {
        toast({
          title: 'Problemas detectados',
          description: `${data.errors.length} problemas encontrados. Considere reiniciar o loop de execução.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sistema funcionando normalmente',
          description: 'Nenhum problema crítico detectado.',
        });
      }
    },
    onError: (error) => {
      console.error('Erro ao realizar diagnóstico do sistema:', error);
      toast({
        title: 'Erro ao diagnosticar sistema',
        description: 'Não foi possível realizar o diagnóstico do sistema.',
        variant: 'destructive',
      });
    }
  });
  
  // Função para encontrar a etapa que aguarda input do usuário
  const findStepAwaitingUserInput = (task?: Task): TaskStep | undefined => {
    if (!task || !task.steps) return undefined;
    return task.steps.find(step => step.state === 'awaiting_user_input');
  };
  
  // Manipulador para o envio do formulário de nova tarefa
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate(newTaskForm);
  };
  
  // Manipulador para o envio de input do usuário
  const handleSubmitUserInput = (taskId: string, stepId: string) => {
    if (!userInput.trim()) {
      toast({
        title: 'Input vazio',
        description: 'Por favor, forneça uma resposta para continuar.',
        variant: 'destructive',
      });
      return;
    }
    
    submitUserInputMutation.mutate({ taskId, stepId, input: userInput });
  };
  
  // Configura a conexão com eventos do servidor (SSE)
  useEffect(() => {
    // Contador de tentativas para implementar backoff exponencial
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10; // Máximo de tentativas
    const BASE_RECONNECT_DELAY = 2000; // Delay base em ms (2 segundos)
    const MAX_RECONNECT_DELAY = 30000; // Delay máximo em ms (30 segundos)
    
    // Função para calcular o tempo de espera usando backoff exponencial
    const getReconnectDelay = () => {
      // Incrementa o contador de tentativas
      reconnectAttempts++;
      
      // Calcula o delay usando backoff exponencial com jitter
      // O jitter adiciona uma pequena variação aleatória para evitar que múltiplos clientes 
      // tentem reconectar simultaneamente
      const delay = Math.min(
        MAX_RECONNECT_DELAY, 
        BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts) + 
        Math.floor(Math.random() * 1000) // Jitter de até 1 segundo
      );
      
      console.log(`Tentativa de reconexão ${reconnectAttempts} em ${delay}ms`);
      return delay;
    };
    
    // Conecta aos eventos do servidor
    const connectToEvents = () => {
      if (eventsSourceRef.current) {
        eventsSourceRef.current.close();
      }
      
      console.log('Iniciando conexão com servidor de eventos...');
      
      // Define keepalive para evitar timeouts em proxies/load balancers
      // Adiciona parâmetros para cache control e identificador único para evitar caching
      const timestamp = new Date().getTime();
      const eventSource = new EventSource(`/api/multi-agent/events?_=${timestamp}`);
      eventsSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        setConnected(true);
        console.log('Conexão SSE estabelecida');
        // Reseta o contador de tentativas quando a conexão é bem-sucedida
        reconnectAttempts = 0;
      };
      
      eventSource.onerror = (e) => {
        console.error('Erro na conexão SSE:', e);
        setConnected(false);
        
        // Sempre feche a conexão atual antes de tentar reconectar
        eventSource.close();
        
        // Limita o número de tentativas para evitar sobrecarga
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const reconnectDelay = getReconnectDelay();
          console.log(`Reconectando em ${reconnectDelay}ms (tentativa ${reconnectAttempts} de ${MAX_RECONNECT_ATTEMPTS})...`);
          setTimeout(connectToEvents, reconnectDelay);
        } else {
          console.error('Número máximo de tentativas de reconexão atingido. Por favor, recarregue a página.');
          toast({
            title: 'Erro de conexão',
            description: 'Não foi possível restabelecer a conexão com o servidor. Por favor, recarregue a página.',
            variant: 'destructive',
          });
        }
      };
      
      // Handler para evento de conexão
      eventSource.addEventListener('connected', (e) => {
        const data = JSON.parse(e.data);
        console.log('Evento de conexão:', data);
      });
      
      // Handler para evento de tarefa criada
      eventSource.addEventListener('task:created', (e) => {
        const data = JSON.parse(e.data);
        console.log('Tarefa criada:', data);
        queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks'] });
      });
      
      // Handler para evento de tarefa atualizada
      eventSource.addEventListener('task:updated', (e) => {
        const data = JSON.parse(e.data);
        console.log('Tarefa atualizada:', data);
        queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks'] });
        
        if (activeTask === data.id) {
          queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks', activeTask] });
        }
      });
      
      // Handler para evento de tarefa concluída
      eventSource.addEventListener('task:completed', (e) => {
        const data = JSON.parse(e.data);
        console.log('Tarefa concluída:', data);
        queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks'] });
        
        if (activeTask === data.id) {
          queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks', activeTask] });
          
          toast({
            title: 'Tarefa concluída',
            description: 'A tarefa foi concluída com sucesso!',
          });
        }
      });
      
      // Handler para evento de falha na tarefa
      eventSource.addEventListener('task:failed', (e) => {
        const data = JSON.parse(e.data);
        console.log('Tarefa falhou:', data);
        queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks'] });
        
        if (activeTask === data.id) {
          queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks', activeTask] });
          
          toast({
            title: 'Tarefa falhou',
            description: `A tarefa falhou: ${data.error}`,
            variant: 'destructive',
          });
        }
      });
      
      // Handler para evento que requer input do usuário
      eventSource.addEventListener('task:user:input:required', (e) => {
        const data = JSON.parse(e.data);
        console.log('Input do usuário requerido:', data);
        
        if (activeTask === data.taskId) {
          queryClient.invalidateQueries({ queryKey: ['/api/multi-agent/tasks', activeTask] });
          
          toast({
            title: 'Input necessário',
            description: 'A tarefa precisa de sua intervenção para continuar.',
          });
        }
      });
    };
    
    connectToEvents();
    
    // Limpa a conexão quando o componente é desmontado
    return () => {
      if (eventsSourceRef.current) {
        eventsSourceRef.current.close();
      }
    };
  }, [activeTask, toast]);
  
  // Encontra a etapa que está aguardando input do usuário
  const stepAwaitingInput = findStepAwaitingUserInput(taskDetails);
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema Multi-Agente</h1>
          <p className="text-muted-foreground">
            Delegue tarefas complexas para um time de IA especializada
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isStartingSystemImprovement ? (
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  setIsStartingSystemImprovement(true);
                  const taskId = await startSystemImprovementDialogue();
                  handleSelectTask(taskId);
                  toast({
                    title: 'Análise iniciada',
                    description: 'O sistema iniciou uma análise colaborativa para melhoria.',
                  });
                } catch (error) {
                  console.error('Erro ao iniciar melhoria do sistema:', error);
                  toast({
                    title: 'Erro',
                    description: 'Não foi possível iniciar a análise de melhoria.',
                    variant: 'destructive',
                  });
                } finally {
                  setIsStartingSystemImprovement(false);
                }
              }}
              disabled={isStartingSystemImprovement}
              className="h-10 px-4"
            >
              {isStartingSystemImprovement ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Análise do Sistema
                </>
              )}
            </Button>
          ) : (
            <Button disabled className="h-10 px-4">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Iniciando Análise...
            </Button>
          )}
          
          <Badge 
            className={connected ? 'bg-green-500 hover:bg-green-500' : 'bg-red-500 hover:bg-red-500'}
            variant="default"
          >
            {connected ? 'Conectado' : 'Desconectado'}
          </Badge>
          
          <div className="flex items-center space-x-2 ml-3">
            <Switch
              id="intensive-mode"
              checked={intensiveMode?.enabled || false}
              onCheckedChange={(checked) => {
                // Certifica-se de que temos um objeto completo para passar na mutação
                const options = intensiveMode?.options || {
                  maxRounds: 5,
                  autoLearn: true,
                  timeout: 60000,
                  notifyOnProgress: true,
                  retryOnFailure: true,
                  maxRetries: 2
                };
                
                // Executa a mutação com dados completos
                toggleIntensiveModeMutation.mutate({ 
                  enabled: checked,
                  options: options 
                });
              }}
              disabled={toggleIntensiveModeMutation.isPending || isLoadingIntensiveMode}
            />
            <label
              htmlFor="intensive-mode"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {toggleIntensiveModeMutation.isPending ? (
                <div className="flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Processando...
                </div>
              ) : isLoadingIntensiveMode ? (
                <div className="flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Carregando...
                </div>
              ) : (
                <>
                  Modo <span className={intensiveMode?.enabled ? "font-bold text-orange-500" : "font-bold"}>MULTIAGENTE INTENSIVO</span>
                </>
              )}
            </label>
          </div>
        </div>
      </div>
      
      {/* Botões de Diagnóstico e Reset do Sistema */}
      <div className="flex mt-4 gap-2">
        <Button 
          variant="outline" 
          className="flex items-center gap-1 text-xs"
          size="sm"
          onClick={() => systemDiagnosticMutation.mutate()}
          disabled={systemDiagnosticMutation.isPending}
        >
          {systemDiagnosticMutation.isPending ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Activity className="h-3 w-3 mr-1" />
              Diagnóstico do Sistema
            </>
          )}
        </Button>
        
        <Button 
          variant="destructive" 
          className="flex items-center gap-1 text-xs"
          size="sm"
          onClick={() => resetExecutionLoopMutation.mutate()}
          disabled={resetExecutionLoopMutation.isPending}
        >
          {resetExecutionLoopMutation.isPending ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Reiniciando...
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 mr-1" />
              Reiniciar Execução
            </>
          )}
        </Button>
      </div>
      
      {/* Componente de Status do Modo Intensivo */}
      {intensiveMode?.enabled && intensiveDetailedStatus && (
        <Card className="mt-4 border-orange-500 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-orange-500" />
                  Status do Modo Intensivo
                </CardTitle>
                <CardDescription>
                  Status em tempo real do processamento multi-agente intensivo
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-orange-500 text-orange-500">
                Atualiza a cada segundo
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Estatísticas gerais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Ciclos Totais</div>
                  <div className="text-2xl font-bold">{intensiveDetailedStatus.stats?.totalCycles || 0}</div>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Ciclos Completados</div>
                  <div className="text-2xl font-bold">{intensiveDetailedStatus.stats?.completedCycles || 0}</div>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Tempo Médio/Ciclo</div>
                  <div className="text-2xl font-bold">
                    {intensiveDetailedStatus.stats?.averageTimePerCycle
                      ? `${Math.round(intensiveDetailedStatus.stats.averageTimePerCycle / 1000)}s`
                      : 'N/A'}
                  </div>
                </div>
                <div className="bg-muted rounded-md p-3">
                  <div className="text-sm text-muted-foreground">Conclusão Estimada</div>
                  <div className="text-xl font-bold">
                    {intensiveDetailedStatus.stats?.estimatedCompletion || 'Calculando...'}
                  </div>
                </div>
              </div>
              
              {/* Barra de progresso */}
              {intensiveDetailedStatus.stats && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso Total</span>
                    <span>
                      {intensiveDetailedStatus.stats.completedCycles} de {intensiveDetailedStatus.stats.totalCycles} ciclos
                      ({Math.round((intensiveDetailedStatus.stats.completedCycles / Math.max(1, intensiveDetailedStatus.stats.totalCycles)) * 100)}%)
                    </span>
                  </div>
                  <Progress 
                    value={(intensiveDetailedStatus.stats.completedCycles / Math.max(1, intensiveDetailedStatus.stats.totalCycles)) * 100} 
                    className="h-2"
                  />
                </div>
              )}
              
              {/* Ciclo atual */}
              {intensiveDetailedStatus.activeTasks && intensiveDetailedStatus.activeTasks.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Ciclo Atual</h4>
                  <div className="bg-muted/50 rounded-md p-3">
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin text-orange-500" />
                      <div>
                        <div className="font-medium">Agente: {intensiveDetailedStatus.activeTasks[0]?.agentType || 'Preparando...'}</div>
                        <div className="text-sm text-muted-foreground">
                          Iniciado: {intensiveDetailedStatus.activeTasks[0]?.startTime 
                            ? new Date(intensiveDetailedStatus.activeTasks[0].startTime).toLocaleTimeString() 
                            : 'Aguardando...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Histórico de ciclos */}
              {intensiveDetailedStatus.history && intensiveDetailedStatus.history.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Histórico de Ciclos</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                    {intensiveDetailedStatus.history.slice().reverse().map((cycle: any, index: number) => (
                      <div key={`cycle-${index}`} className="bg-muted/30 rounded-md p-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{cycle.agentType}</span>
                          <span className="text-muted-foreground">{new Date(cycle.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Logs do sistema */}
              {intensiveDetailedStatus.logs && intensiveDetailedStatus.logs.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Logs do Sistema</h4>
                  <ScrollArea className="h-24 w-full rounded-md border">
                    <div className="p-2 text-sm font-mono">
                      {intensiveDetailedStatus.logs.map((log: string, index: number) => (
                        <div key={`log-${index}`} className="text-xs">
                          {log}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs 
        defaultValue="tasks" 
        className="w-full"
        value={activeTab}
        onValueChange={(value) => {
          console.log("Mudando para a aba:", value);
          setActiveTab(value);
          // Se voltar para 'tasks', limpe a tarefa ativa
          if (value === 'tasks') {
            setActiveTask(null);
          }
        }}
      >
        <TabsList className="grid w-full md:w-[600px] grid-cols-3">
          <TabsTrigger value="tasks" onClick={() => setActiveTask(null)}>Minhas Tarefas</TabsTrigger>
          <TabsTrigger value="progress" disabled={!activeTask}>Progresso da Tarefa</TabsTrigger>
          <TabsTrigger value="new">Nova Tarefa</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks" className="space-y-4 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Carregando tarefas...</span>
            </div>
          ) : error ? (
            <div className="bg-destructive/20 p-4 rounded-md">
              <p className="text-destructive">Erro ao carregar tarefas</p>
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map((task) => (
                <Card 
                  key={task.id} 
                  className={`cursor-pointer hover:border-primary transition-colors ${activeTask === task.id ? 'border-primary' : ''}`}
                  onClick={() => handleSelectTask(task.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg line-clamp-1">{task.title}</CardTitle>
                      <TaskStatusBadge state={task.state} hasNotification={task.slackNotified} />
                    </div>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <CalendarRange className="h-3 w-3" />
                      {formatDate(task.createdAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm line-clamp-2">{task.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {task.requiredAgents && task.requiredAgents.slice(0, 3).map((agent) => (
                        <AgentAvatar key={agent} agentType={agent} />
                      ))}
                      {task.requiredAgents && task.requiredAgents.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{task.requiredAgents.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <div className="w-full flex justify-between items-center text-xs text-muted-foreground">
                      <span>{task.steps ? task.steps.length : 0} etapas</span>
                      <span>
                        {task.steps ? task.steps.filter(s => s.state === 'completed').length : 0} concluídas
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma tarefa encontrada</h3>
              <p className="text-muted-foreground text-center max-w-md mt-2">
                Crie sua primeira tarefa para o sistema multi-agente processar
              </p>
              <Button 
                className="mt-4"
                onClick={() => document.querySelector('[data-value="new"]')?.dispatchEvent(new Event('click'))}
              >
                Criar tarefa
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 pt-4">
          {activeTask && taskDetails ? (
            <div className="flex flex-col h-[calc(100vh-220px)]">
              {/* Cabeçalho da tarefa */}
              <div className="flex items-center justify-between bg-card p-4 border-b mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{taskDetails.title}</h2>
                    <p className="text-sm text-muted-foreground">{formatDate(taskDetails.createdAt)}</p>
                  </div>
                </div>
                <TaskStatusBadge state={taskDetails.state} hasNotification={taskDetails.slackNotified} />
              </div>
              
              {/* Área principal de conversa no estilo chat */}
              <div className="flex-grow overflow-hidden flex flex-col gap-4">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-6 pb-4">
                    {/* Mensagem inicial com a descrição da tarefa */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                        LZ
                      </div>
                      <div className="flex-1 max-w-[80%]">
                        <div className="bg-muted/70 p-4 rounded-lg shadow-sm">
                          <p className="text-sm font-medium mb-2">Solicitação Inicial</p>
                          <p className="text-sm whitespace-pre-line">{taskDetails.description}</p>
                          
                          {taskDetails.context && taskDetails.context.additionalContext && (
                            <div className="mt-3 pt-3 border-t border-border/60">
                              <p className="text-xs text-muted-foreground mb-1">Contexto adicional:</p>
                              <p className="text-sm">{taskDetails.context.additionalContext}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-2">
                          {formatDate(taskDetails.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Renderiza uma conversa estilo chat para cada etapa da tarefa */}
                    {taskDetails.steps && taskDetails.steps.map((step, stepIndex) => {
                      const isCurrent = step.state === 'in_progress' || step.state === 'awaiting_user_input';
                      const isCompleted = step.state === 'completed';
                      const isFailed = step.state === 'failed';
                      
                      return (
                        <div key={step.id} className="space-y-4">
                          {/* Separador para mostrar a etapa atual */}
                          {isCurrent && (
                            <div className="flex items-center gap-2 my-6">
                              <div className="h-[1px] flex-grow bg-border"></div>
                              <Badge variant="outline" className="font-normal text-xs flex gap-1 items-center py-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                Etapa Atual
                              </Badge>
                              <div className="h-[1px] flex-grow bg-border"></div>
                            </div>
                          )}
                          
                          {/* Cabeçalho da etapa */}
                          <div className="flex items-center gap-2 px-4">
                            <AgentAvatar agentType={step.agent} />
                            <div>
                              <p className="text-sm font-medium">{formatAgentName(step.agent)}</p>
                              <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                            <div className="flex-grow"></div>
                            <TaskStatusBadge state={step.state} />
                          </div>
                          
                          {/* Mensagem principal da etapa (resultado) */}
                          {step.result && (
                            <div className="flex gap-3">
                              <AgentAvatar agentType={step.agent} />
                              <div className="flex-1 max-w-[80%]">
                                <div className={`p-4 rounded-lg shadow-sm ${
                                  isCompleted ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800' :
                                  isFailed ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' :
                                  'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                                }`}>
                                  <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <div className="whitespace-pre-line">{step.result}</div>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 ml-2">
                                  {step.endTime ? formatDate(step.endTime) : 'Em processamento...'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Mensagens adicionais da etapa */}
                          {step.messages && step.messages.length > 0 && step.messages.map((msg) => (
                            <div key={msg.id} className="flex gap-3">
                              <AgentAvatar agentType={msg.from} />
                              <div className="flex-1 max-w-[80%]">
                                <div className="bg-muted/50 p-4 rounded-lg shadow-sm">
                                  <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <p>{msg.content}</p>
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 ml-2">
                                  {formatDate(msg.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                          
                          {/* Erro da etapa */}
                          {step.error && (
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-500 flex items-center justify-center text-white">
                                <X className="h-5 w-5" />
                              </div>
                              <div className="flex-1 max-w-[80%]">
                                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-lg shadow-sm">
                                  <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">Erro na execução</p>
                                  <p className="text-sm text-red-700 dark:text-red-300">{step.error}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 ml-2">
                                  {step.endTime ? formatDate(step.endTime) : 'Erro detectado'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Input do usuário */}
                          {step.state === 'awaiting_user_input' && (
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                                <CircleHelp className="h-5 w-5" />
                              </div>
                              <div className="flex-1 max-w-[80%]">
                                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg shadow-sm">
                                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">Input Necessário</p>
                                  <p className="text-sm text-purple-700 dark:text-purple-300">{step.userInputPrompt || 'Por favor, forneça informações adicionais para continuar.'}</p>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 ml-2">
                                  Aguardando sua resposta...
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {/* Mensagem de resultado final */}
                    {taskDetails.state === 'completed' && taskDetails.result && (
                      <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="h-[1px] flex-grow bg-border"></div>
                          <Badge variant="outline" className="font-normal text-xs flex gap-1 items-center py-1 bg-green-50 text-green-700 border-green-300">
                            <CheckCircle className="h-3 w-3" />
                            Resultado Final
                          </Badge>
                          <div className="h-[1px] flex-grow bg-border"></div>
                        </div>
                        
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                          <div className="flex-1 max-w-[80%]">
                            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-4 rounded-lg shadow-sm">
                              <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Tarefa concluída com sucesso</p>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                <div className="whitespace-pre-line">{taskDetails.result}</div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 ml-2">
                              {taskDetails.completedAt ? formatDate(taskDetails.completedAt) : formatDate(taskDetails.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Mensagem de carregamento enquanto processa */}
                    {(!taskDetails.steps || taskDetails.steps.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <RefreshCw className="h-12 w-12 text-primary animate-spin mb-4" />
                        <h3 className="text-lg font-medium">Iniciando tarefa...</h3>
                        <p className="text-muted-foreground text-center max-w-md mt-2">
                          O sistema está criando o plano de execução para sua tarefa.
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
              
              {/* Área de input do usuário para responder a etapa atual */}
              {stepAwaitingInput && (
                <div className="mt-auto border-t pt-4 pb-2 px-4 bg-background shadow-md">
                  <div className="flex items-center gap-3">
                    <Input
                      placeholder="Digite sua resposta..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && userInput.trim() && !submitUserInputMutation.isPending) {
                          e.preventDefault();
                          handleSubmitUserInput(taskDetails.id, stepAwaitingInput.id);
                        }
                      }}
                    />
                    <Button 
                      onClick={() => handleSubmitUserInput(taskDetails.id, stepAwaitingInput.id)}
                      disabled={submitUserInputMutation.isPending || !userInput.trim()}
                      size="icon"
                      className="h-10 w-10"
                    >
                      {submitUserInputMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma tarefa selecionada</h3>
              <p className="text-muted-foreground text-center max-w-md mt-2">
                Selecione uma tarefa na aba "Minhas Tarefas" para visualizar seu progresso
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="new" className="pt-4">
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="pr-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Criar nova tarefa</CardTitle>
                  <CardDescription>
                    Descreva uma tarefa para o sistema multi-agente realizar. Quanto mais detalhes você fornecer, melhor será o resultado.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTask} className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="title" className="text-sm font-medium">
                        Título da tarefa
                      </label>
                      <Input
                        id="title"
                        placeholder="Ex: Analisar tendências do mercado de transporte para 2025"
                        value={newTaskForm.title}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="description" className="text-sm font-medium">
                        Descrição detalhada
                      </label>
                      <Textarea
                        id="description"
                        placeholder="Explique em detalhes o que você deseja. Quanto mais informação, melhores serão os resultados."
                        value={newTaskForm.description}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                        required
                        className="min-h-[120px]"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="businessType" className="text-sm font-medium">
                        Contexto de Negócio
                      </label>
                      <select
                        id="businessType"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newTaskForm.businessType}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, businessType: e.target.value as any })}
                      >
                        <option value="transport">Transporte</option>
                        <option value="farm">Agronegócio</option>
                        <option value="both">Ambos (Transporte e Agronegócio)</option>
                        <option value="personal">Desenvolvimento Pessoal</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="additionalContext" className="text-sm font-medium">
                        Contexto Adicional (opcional)
                      </label>
                      <Textarea
                        id="additionalContext"
                        placeholder="Adicione qualquer informação que possa ajudar os agentes a entender melhor seu contexto, preferências ou requisitos específicos."
                        value={newTaskForm.additionalContext}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, additionalContext: e.target.value })}
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={createTaskMutation.isPending}
                    >
                      {createTaskMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Iniciar Tarefa
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Formata o nome do agente para exibição
function formatAgentName(agentType: string): string {
  const nameMap: Record<string, string> = {
    coordinator: 'Coordenador',
    planner: 'Planejador',
    researcher: 'Pesquisador',
    analyst: 'Analista',
    advisor: 'Consultor',
    summarizer: 'Sintetizador',
    executor: 'Executor',
    evaluator: 'Avaliador',
    critic: 'Crítico',
    transport_expert: 'Especialista em Transporte',
    farm_expert: 'Especialista em Agricultura',
    finance_expert: 'Especialista Financeiro',
    tech_expert: 'Especialista em Tecnologia',
    personal_coach: 'Coach Pessoal',
    user: 'Usuário'
  };
  
  return nameMap[agentType.toLowerCase()] || agentType;
}