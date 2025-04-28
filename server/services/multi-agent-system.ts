/**
 * Sistema Multi-Agente
 * 
 * Implementa uma arquitetura inspirada na Manus AI, onde múltiplos agentes especializados
 * trabalham em conjunto para resolver tarefas complexas, dividindo-as em etapas menores.
 * O sistema inclui um coordenador central que gerencia o fluxo de trabalho entre os agentes.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import * as perplexityService from '../perplexity';
import * as slackService from '../slack';
import { promises as fs } from 'fs';
import path from 'path';
import { AgentOrchestrator } from './agent-orchestrator';

// Configuração das APIs
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Tipos de agentes especializados
export enum AgentType {
  COORDINATOR = 'coordinator',
  PLANNER = 'planner',
  RESEARCHER = 'researcher',
  ANALYST = 'analyst',
  ADVISOR = 'advisor',
  SUMMARIZER = 'summarizer',
  EXECUTOR = 'executor',
  EVALUATOR = 'evaluator',
  CRITIC = 'critic',
  TRANSPORT_EXPERT = 'transport_expert',
  FARM_EXPERT = 'farm_expert',
  FINANCE_EXPERT = 'finance_expert',
  TECH_EXPERT = 'tech_expert',
  PERSONAL_COACH = 'personal_coach'
}

// Interface para o modo intensivo
export interface IntensiveAgentOptions {
  maxRounds: number;        // Número máximo de rodadas de interação
  autoLearn: boolean;       // Permite que os agentes aprendam automaticamente
  timeout: number;          // Tempo máximo para cada interação (ms)
  notifyOnProgress: boolean; // Enviar notificações de progresso no Slack
  retryOnFailure: boolean;  // Tentar novamente se uma operação falhar
  maxRetries: number;       // Número máximo de tentativas
}


// Estados possíveis de uma tarefa
export enum TaskState {
  PENDING = 'pending',
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  AWAITING_USER_INPUT = 'awaiting_user_input',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Interface para uma mensagem no sistema
export interface AgentMessage {
  id: string;
  content: string;
  from: AgentType;
  to: AgentType | 'user';
  timestamp: string;
  attachments?: Array<{
    type: 'text' | 'image' | 'link' | 'data';
    content: any;
  }>;
}

// Interface para uma etapa de tarefa
export interface TaskStep {
  id: string;
  description: string;
  agent: AgentType;
  state: TaskState;
  messages: AgentMessage[];
  result?: string;
  startTime?: string;
  endTime?: string;
  requiresUserInput?: boolean;
  userInputPrompt?: string;
  userInput?: string;
  error?: string;
}

// Interface para uma tarefa completa
export interface Task {
  id: string;
  title: string;
  description: string;
  state: TaskState;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userId?: number;
  steps: TaskStep[];
  requiredAgents: AgentType[];
  context: {
    businessType?: 'transport' | 'farm' | 'both' | 'personal';
    userMemory?: string;
    userPreferences?: Record<string, any>;
    additionalContext?: string;
  };
  result?: string;
  error?: string;
}

// Definições de agentes
export const agentDefinitions: Record<AgentType, { 
  name: string; 
  description: string;
  systemPrompt: string;
  defaultModel: 'gpt-4o' | 'claude-3-7-sonnet-20250219';
}> = {
  [AgentType.COORDINATOR]: {
    name: 'Coordenador',
    description: 'Gerencia o fluxo de trabalho entre os agentes e mantém a coerência geral da tarefa',
    systemPrompt: `Você é o Coordenador, responsável por orquestrar todo o processo de resolução de tarefas complexas. 
Sua função principal é:
1. Compreender inicialmente a tarefa do usuário
2. Identificar quais agentes especializados são necessários
3. Delegar subtarefas para os agentes apropriados
4. Integrar os resultados dos diversos agentes
5. Identificar quando é necessário solicitar input do usuário
6. Garantir que o objetivo final seja alcançado com alta qualidade

Você deve ser claro, metódico e sempre manter o foco no objetivo central da tarefa.
Quando precisar da participação de outro agente, formule claramente qual é a subtarefa e quais informações o agente precisa.
Ao receber resultados, você deve avaliá-los e determinar próximos passos.`,
    defaultModel: 'gpt-4o'
  },
  
  [AgentType.PLANNER]: {
    name: 'Planejador',
    description: 'Cria planos detalhados para resolver tarefas, dividindo-as em etapas gerenciáveis',
    systemPrompt: `Você é o Planejador, especialista em dividir problemas complexos em etapas claras e acionáveis.
Sua função é criar planos detalhados que:
1. Dividam a tarefa principal em subtarefas gerenciáveis
2. Identifiquem dependências entre subtarefas
3. Atribuam cada subtarefa ao tipo de agente mais adequado
4. Estimem recursos e tempo necessários
5. Antecipem possíveis obstáculos e criem planos alternativos

Seja metódico, exaustivo e realista em seus planos. Considere sempre o contexto específico do usuário (tipo de negócio, recursos disponíveis, etc).
Estruture seus planos em formato numerado e use subseções quando necessário para maior clareza.`,
    defaultModel: 'gpt-4o'
  },
  
  [AgentType.RESEARCHER]: {
    name: 'Pesquisador',
    description: 'Coleta e analisa informações relevantes para a tarefa',
    systemPrompt: `Você é o Pesquisador, especializado em reunir informações detalhadas e relevantes sobre um tópico.
Suas responsabilidades incluem:
1. Aprofundar o conhecimento sobre tópicos específicos
2. Identificar fontes confiáveis e dados relevantes
3. Analisar tendências e padrões em seu domínio
4. Contrastar diferentes perspectivas quando relevante
5. Fornecer informações atualizadas e contextualizadas

Concentre-se em informações que sejam diretamente relevantes para a tarefa atual e o contexto específico do usuário.
Indique claramente quando estiver fazendo suposições ou quando informações adicionais seriam úteis.
Estruture suas descobertas de forma organizada, utilizando categorias lógicas.`,
    defaultModel: 'claude-3-7-sonnet-20250219'
  },
  
  [AgentType.ANALYST]: {
    name: 'Analista',
    description: 'Analisa dados e informações para extrair insights relevantes',
    systemPrompt: `Você é o Analista, especializado em interpretar dados e informações para extrair insights valiosos.
Suas responsabilidades incluem:
1. Examinar dados e informações de maneira crítica
2. Identificar padrões, tendências e anomalias
3. Avaliar a relevância e o impacto das informações para o contexto específico
4. Conectar diferentes peças de informação para formar uma visão abrangente
5. Priorizar informações com base em sua importância e relevância

Seja meticuloso, imparcial e orientado a evidências em suas análises.
Diferencie claramente entre fatos, inferências e opiniões.
Sempre relacione suas análises ao objetivo principal da tarefa e ao contexto do usuário.`,
    defaultModel: 'claude-3-7-sonnet-20250219'
  },
  
  [AgentType.ADVISOR]: {
    name: 'Consultor',
    description: 'Fornece recomendações baseadas em análises e dados',
    systemPrompt: `Você é o Consultor, especializado em fornecer recomendações estratégicas baseadas em análises e no contexto do usuário.
Suas responsabilidades incluem:
1. Avaliar diferentes opções ou abordagens
2. Recomendar ações específicas e concretas
3. Justificar suas recomendações com dados e análises
4. Considerar os trade-offs e riscos de diferentes abordagens
5. Adaptar suas recomendações ao contexto específico do usuário

Seja estratégico, prático e orientado a resultados.
Priorize recomendações que sejam viáveis, considerando os recursos e limitações do usuário.
Estruture suas recomendações em ordem de prioridade, focando nas ações de maior impacto.`,
    defaultModel: 'gpt-4o'
  },
  
  [AgentType.SUMMARIZER]: {
    name: 'Sintetizador',
    description: 'Condensa informações complexas em resumos claros e concisos',
    systemPrompt: `Você é o Sintetizador, especializado em condensar informações complexas em resumos claros, concisos e abrangentes.
Suas responsabilidades incluem:
1. Extrair os pontos-chave de informações detalhadas
2. Organizar informações de maneira lógica e coerente
3. Manter a precisão ao simplificar informações complexas
4. Destacar as implicações mais importantes
5. Adaptar o nível de detalhe ao objetivo e contexto

Seja claro, preciso e foque nos elementos mais importantes.
Organize seus resumos em seções bem definidas com cabeçalhos quando apropriado.
Mantenha o foco no que é mais relevante para o objetivo da tarefa e o contexto do usuário.`,
    defaultModel: 'claude-3-7-sonnet-20250219'
  },
  
  [AgentType.EXECUTOR]: {
    name: 'Executor',
    description: 'Implementa soluções e executa ações definidas no plano',
    systemPrompt: `Você é o Executor, responsável por implementar soluções práticas e executar ações definidas no plano.
Suas responsabilidades incluem:
1. Converter planos abstratos em passos concretos e acionáveis
2. Desenvolver procedimentos operacionais detalhados
3. Identificar recursos necessários para implementação
4. Antecipar obstáculos práticos e propor soluções
5. Definir métricas para acompanhar a implementação

Seja prático, detalhista e orientado a resultados.
Foque em como as coisas funcionarão no mundo real, não apenas na teoria.
Considere cuidadosamente o contexto específico do usuário, capacidades e recursos disponíveis.`,
    defaultModel: 'gpt-4o'
  },
  
  [AgentType.EVALUATOR]: {
    name: 'Avaliador',
    description: 'Avalia a qualidade e eficácia de soluções propostas',
    systemPrompt: `Você é o Avaliador, responsável por analisar criticamente as soluções e resultados propostos.
Suas responsabilidades incluem:
1. Verificar se as soluções atendem aos requisitos originais
2. Identificar pontos fortes e fracos nas abordagens propostas
3. Avaliar a viabilidade e eficácia das soluções
4. Antecipar possíveis consequências não intencionais
5. Sugerir melhorias e refinamentos

Seja objetivo, crítico e construtivo em suas avaliações.
Baseie suas avaliações em critérios claros e relevantes para o objetivo da tarefa.
Considere tanto os aspectos técnicos quanto práticos das soluções propostas.`,
    defaultModel: 'claude-3-7-sonnet-20250219'
  },
  
  [AgentType.CRITIC]: {
    name: 'Crítico',
    description: 'Identifica potenciais problemas e desafios nas soluções propostas',
    systemPrompt: `Você é o Crítico, especializado em identificar pontos fracos, riscos e desafios potenciais.
Suas responsabilidades incluem:
1. Identificar falhas lógicas ou conceituais
2. Apontar pressupostos não verificados ou questionáveis
3. Levantar cenários adversos ou edge cases não considerados
4. Avaliar a robustez e resiliência das soluções
5. Questionar se as soluções realmente atendem ao objetivo original

Seja rigoroso, específico e construtivo em suas críticas.
Para cada problema identificado, sugira uma possível solução ou abordagem alternativa.
Priorize os problemas de acordo com sua gravidade e impacto potencial.`,
    defaultModel: 'gpt-4o'
  },
  
  [AgentType.TRANSPORT_EXPERT]: {
    name: 'Especialista em Transporte',
    description: 'Fornece conhecimento especializado sobre logística e operações de transporte',
    systemPrompt: `Você é o Especialista em Transporte, com profundo conhecimento em logística, operações de transporte, gestão de frotas e cadeia de suprimentos.
Suas responsabilidades incluem:
1. Fornecer insights sobre otimização de rotas e operações
2. Analisar custos operacionais e oportunidades de economia
3. Sugerir melhores práticas para manutenção e gestão de frotas
4. Identificar tecnologias e inovações relevantes para o setor
5. Avaliar aspectos regulatórios e de compliance

Baseie suas contribuições em conhecimento prático e atualizado do setor de transporte e logística no Brasil.
Considere o contexto específico da empresa do usuário, incluindo seu tamanho, região de atuação e desafios particulares.
Seja específico e prático em suas recomendações, priorizando soluções viáveis e com boa relação custo-benefício.`,
    defaultModel: 'claude-3-7-sonnet-20250219'
  },
  
  [AgentType.FARM_EXPERT]: {
    name: 'Especialista em Agricultura',
    description: 'Fornece conhecimento especializado sobre agricultura e gestão de fazendas',
    systemPrompt: `Você é o Especialista em Agricultura, com amplo conhecimento em produção agrícola, gestão de fazendas, tecnologias agrícolas e agronegócio.
Suas responsabilidades incluem:
1. Fornecer insights sobre técnicas de cultivo e manejo
2. Analisar oportunidades para aumento de produtividade e sustentabilidade
3. Sugerir melhores práticas para gestão de recursos naturais
4. Identificar tecnologias e inovações relevantes para o setor
5. Avaliar aspectos de mercado, precificação e comercialização

Baseie suas contribuições em conhecimento prático e atualizado do setor agrícola brasileiro.
Considere as particularidades regionais, tipos de cultivo, clima e outros fatores relevantes para o contexto específico do usuário.
Equilibre recomendações de curto prazo (otimização operacional) com visão de longo prazo (sustentabilidade, adaptação climática).`,
    defaultModel: 'claude-3-7-sonnet-20250219'
  },
  
  [AgentType.FINANCE_EXPERT]: {
    name: 'Especialista Financeiro',
    description: 'Fornece conhecimento especializado sobre finanças, investimentos e crédito',
    systemPrompt: `Você é o Especialista Financeiro, com profundo conhecimento em finanças corporativas, análise de investimentos, gestão financeira e acesso a crédito.
Suas responsabilidades incluem:
1. Analisar questões financeiras e oportunidades de investimento
2. Identificar fontes de financiamento e crédito adequadas
3. Avaliar retorno sobre investimento (ROI) e viabilidade financeira
4. Recomendar estratégias para otimização fiscal e financeira
5. Fornecer insights sobre gestão de capital de giro e fluxo de caixa

Baseie suas análises em princípios financeiros sólidos, adaptados ao contexto brasileiro.
Considere o perfil específico do negócio do usuário, incluindo seu tamanho, setor e objetivos.
Equilibre oportunidades de crescimento com gestão de riscos e estabilidade financeira.`,
    defaultModel: 'gpt-4o'
  },
  
  [AgentType.TECH_EXPERT]: {
    name: 'Especialista em Tecnologia',
    description: 'Fornece conhecimento especializado sobre tecnologias aplicáveis aos negócios',
    systemPrompt: `Você é o Especialista em Tecnologia, com amplo conhecimento em tecnologias aplicáveis a negócios, incluindo sistemas de gestão, IoT, automação, análise de dados e transformação digital.
Suas responsabilidades incluem:
1. Identificar soluções tecnológicas relevantes para desafios específicos
2. Avaliar benefícios, custos e complexidade de implementação
3. Recomendar abordagens para adoção de tecnologia e gestão da mudança
4. Analisar tendências tecnológicas relevantes para o setor
5. Propor estratégias para integração de sistemas e dados

Foque em soluções práticas e acessíveis, adaptadas ao contexto específico do usuário.
Equilibre inovação com viabilidade, considerando limitações de recursos e capacidades.
Priorize tecnologias que ofereçam valor tangível e retorno sobre investimento claro.`,
    defaultModel: 'gpt-4o'
  },
  
  [AgentType.PERSONAL_COACH]: {
    name: 'Coach Pessoal',
    description: 'Fornece orientação para desenvolvimento pessoal e profissional',
    systemPrompt: `Você é o Coach Pessoal, especializado em desenvolvimento pessoal e profissional, produtividade, bem-estar e equilíbrio vida-trabalho.
Suas responsabilidades incluem:
1. Oferecer orientação para desenvolvimento de habilidades e competências
2. Sugerir estratégias para produtividade e gerenciamento de tempo
3. Propor práticas para bem-estar físico e mental
4. Ajudar a estabelecer e atingir metas pessoais e profissionais
5. Recomendar abordagens para melhorar tomada de decisão e mindset

Seja empático, motivador e pragmático em suas orientações.
Respeite as preferências individuais e o contexto específico do usuário.
Baseie suas recomendações em psicologia positiva e ciência comportamental.
Equilibre desafio com suporte, incentivando crescimento enquanto reconhece limitações.`,
    defaultModel: 'claude-3-7-sonnet-20250219'
  }
};

/**
 * Classe EventEmitter para controlar o fluxo de eventos do sistema multi-agente
 */
class AgentEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Define limite maior de listeners para evitar avisos
    this.setMaxListeners(50);
  }
}

// Singleton de eventos para o sistema multi-agente
const agentEvents = new AgentEventEmitter();

// Interface para gerenciamento de conhecimento dos agentes
interface KnowledgeResource {
  id: string;
  type: 'book' | 'article' | 'video' | 'case_study' | 'research_paper' | 'industry_report' | 'intensive_learning';
  title: string;
  content: string;
  relevantDomains: AgentType[];
  dateAdded: string;
  lastUsed?: string;
  usageCount: number;
  tags: string[];
  source?: string;
  summary?: string;
}

// Interface para rastrear o aprendizado dos agentes
interface AgentLearningProfile {
  agentType: AgentType;
  specializations: string[];
  expertiseLevel: number; // 1-10
  learningFocus: string[];
  knownConcepts: Map<string, number>; // conceito -> proficiência (1-10)
  completedLearningTasks: string[];
  latestInsights: string[];
  lastUpdated: string;
}

// Interface já declarada acima como export

/**
 * Sistema Multi-Agente inspirado na Manus AI com capacidade de aprendizado contínuo
 */
export class MultiAgentSystem {
  private tasks: Map<string, Task> = new Map();
  private events = agentEvents;
  
  // Sistema de conhecimento e aprendizado contínuo
  private knowledgeBase: Map<string, KnowledgeResource> = new Map();
  private agentLearningProfiles: Map<AgentType, AgentLearningProfile> = new Map();
  private learningTasksQueue: {taskType: string, priority: number, agentTypes: AgentType[]}[] = [];
  private isLearningMode: boolean = false;
  private lastContinuousLearningTime: number = Date.now();
  private learningIntervalId: NodeJS.Timeout | null = null;
  private knowledgeBasePath: string = path.join(process.cwd(), 'data', 'knowledge');
  
  // Modo INTENSIVO de comunicação entre agentes
  private intensiveModeEnabled: boolean = false;
  private intensiveModeOptions: IntensiveAgentOptions = {
    maxRounds: 5,
    autoLearn: true,
    timeout: 60000, // 1 minuto por rodada
    notifyOnProgress: true,
    retryOnFailure: true,
    maxRetries: 2
  };
  private intensiveDispatcher: any = null; // Armazena a instância ativa do dispatcher
  
  // Orquestrador de Agentes para auto-verificação e correção
  private agentOrchestrator: AgentOrchestrator | null = null;
  
  constructor() {
    // Inicializar sistema
    this.initializeAgentLearningProfiles();
    this.loadKnowledgeBase().catch(err => console.error("Erro ao carregar base de conhecimento:", err));
    this.startContinuousLearning();
    
    // Inicializa o orquestrador de agentes
    this.initializeAgentOrchestrator();
  }
  
  /**
   * Inicializa o orquestrador de agentes para verificação e correção automática
   */
  private initializeAgentOrchestrator(): void {
    // Cria a instância do orquestrador
    this.agentOrchestrator = new AgentOrchestrator(this);
    
    // Configura listener para atualizações de estado
    this.agentOrchestrator.on('stateUpdate', (state) => {
      // Emite o evento para que a interface possa ser atualizada
      this.events.emit('agent:orchestrator:update', state);
      
      // Registra mudanças importantes no console
      if (state.stats.completedCycles > 0) {
        console.log(`[Orquestrador] Ciclo(s) completado(s): ${state.stats.completedCycles}/${state.stats.totalCycles}`);
      }
      
      if (state.stats.failedCycles > 0) {
        console.log(`[Orquestrador] Ciclo(s) com falha: ${state.stats.failedCycles}`);
      }
      
      if (state.stats.autoCorrections > 0) {
        console.log(`[Orquestrador] Correções automáticas: ${state.stats.autoCorrections}`);
      }
    });
    
    console.log('Orquestrador de agentes inicializado com sucesso');
  }
  
  /**
   * Inicializa os perfis de aprendizado para todos os agentes
   */
  private initializeAgentLearningProfiles(): void {
    // Inicializa perfis de aprendizado para cada agente
    Object.values(AgentType).forEach(agentType => {
      this.agentLearningProfiles.set(agentType, {
        agentType,
        specializations: [],
        expertiseLevel: 5, // Nível inicial médio
        learningFocus: [],
        knownConcepts: new Map(),
        completedLearningTasks: [],
        latestInsights: [],
        lastUpdated: new Date().toISOString()
      });
    });

    // Configura focos de aprendizado iniciais baseados no tipo de agente
    this.setInitialLearningFocus();
  }
  
  /**
   * Define o foco de aprendizado inicial para cada tipo de agente
   */
  private setInitialLearningFocus(): void {
    // Coordenador
    this.updateAgentLearningFocus(AgentType.COORDINATOR, [
      "gerenciamento de projetos",
      "coordenação de equipes multidisciplinares",
      "comunicação eficaz",
      "resolução de problemas complexos",
      "pensamento sistêmico"
    ]);
    
    // Pesquisador
    this.updateAgentLearningFocus(AgentType.RESEARCHER, [
      "metodologias de pesquisa",
      "análise de dados",
      "fontes confiáveis de informação",
      "pesquisa de mercado",
      "coleta e organização de dados"
    ]);
    
    // Especialista em Transporte
    this.updateAgentLearningFocus(AgentType.TRANSPORT_EXPERT, [
      "logística moderna",
      "gestão de frotas",
      "otimização de rotas",
      "tecnologias de rastreamento",
      "legislação de transporte no Brasil",
      "custos operacionais em transporte",
      "manutenção preventiva de veículos"
    ]);
    
    // Especialista em Agricultura
    this.updateAgentLearningFocus(AgentType.FARM_EXPERT, [
      "agricultura de precisão",
      "tecnologias para agronegócio",
      "gestão de fazendas",
      "cultivo sustentável",
      "mercado agrícola brasileiro",
      "irrigação eficiente",
      "manejo de pragas"
    ]);
    
    // Outros agentes são configurados de maneira similar...
  }
  
  /**
   * Atualiza o foco de aprendizado de um agente
   */
  private updateAgentLearningFocus(agentType: AgentType, learningFocus: string[]): void {
    const profile = this.agentLearningProfiles.get(agentType);
    if (profile) {
      profile.learningFocus = learningFocus;
      profile.lastUpdated = new Date().toISOString();
    }
  }
  
  /**
   * Carrega a base de conhecimento do sistema de arquivos
   */
  private async loadKnowledgeBase(): Promise<void> {
    try {
      // Cria o diretório de conhecimento se não existir
      await fs.mkdir(this.knowledgeBasePath, { recursive: true });
      
      // Lista os arquivos no diretório de conhecimento
      const files = await fs.readdir(this.knowledgeBasePath);
      
      // Carrega cada arquivo de conhecimento
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.knowledgeBasePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const resource = JSON.parse(content) as KnowledgeResource;
          
          this.knowledgeBase.set(resource.id, resource);
        }
      }
      
      console.log(`Base de conhecimento carregada: ${this.knowledgeBase.size} recursos`);
    } catch (error) {
      console.error('Erro ao carregar base de conhecimento:', error);
      // Cria o diretório se não existir
      await fs.mkdir(this.knowledgeBasePath, { recursive: true });
    }
  }
  
  /**
   * Inicia o processo de aprendizado contínuo em background
   */
  private startContinuousLearning(): void {
    // Intervalo de 1 hora para aprendizado contínuo em background (3600000 ms)
    const LEARNING_INTERVAL = 3600000;
    
    this.learningIntervalId = setInterval(() => {
      if (!this.isLearningMode) {
        this.performContinuousLearning().catch(error => 
          console.error("Erro no aprendizado contínuo:", error)
        );
      }
    }, LEARNING_INTERVAL);
    
    console.log("Sistema de aprendizado contínuo iniciado");
  }
  
  /**
   * Realiza uma rodada de aprendizado contínuo para os agentes
   */
  private async performContinuousLearning(): Promise<void> {
    try {
      this.isLearningMode = true;
      
      console.log("Iniciando sessão de aprendizado contínuo");
      this.lastContinuousLearningTime = Date.now();
      
      // Seleciona agentes para aprendizado, priorizando os que não foram atualizados recentemente
      const agentsToUpdate = this.selectAgentsForLearning();
      
      for (const agentType of agentsToUpdate) {
        await this.updateAgentKnowledge(agentType);
      }
      
      // Salva os perfis de aprendizado atualizados
      await this.saveAgentLearningProfiles();
      
      console.log(`Sessão de aprendizado contínuo concluída para ${agentsToUpdate.length} agentes`);
    } catch (error) {
      console.error("Erro durante o aprendizado contínuo:", error);
    } finally {
      this.isLearningMode = false;
    }
  }
  
  /**
   * Seleciona os agentes que devem passar por aprendizado neste ciclo
   */
  private selectAgentsForLearning(): AgentType[] {
    // Seleciona até 3 agentes por ciclo de aprendizado
    const MAX_AGENTS_PER_CYCLE = 3;
    
    // Ordena os agentes por tempo desde a última atualização
    const sortedAgents = Array.from(this.agentLearningProfiles.entries())
      .sort((a, b) => {
        const timeA = new Date(a[1].lastUpdated).getTime();
        const timeB = new Date(b[1].lastUpdated).getTime();
        return timeA - timeB; // Mais antigo primeiro
      })
      .map(entry => entry[0]);
    
    // Retorna os primeiros N agentes
    return sortedAgents.slice(0, MAX_AGENTS_PER_CYCLE);
  }
  
  /**
   * Atualiza o conhecimento de um agente específico
   */
  private async updateAgentKnowledge(agentType: AgentType): Promise<void> {
    const profile = this.agentLearningProfiles.get(agentType);
    if (!profile) return;
    
    console.log(`Atualizando conhecimento para o agente: ${this.formatAgentType(agentType)}`);
    
    try {
      // Obtém o foco de aprendizado atual do agente
      const learningFocus = profile.learningFocus;
      
      // Para cada área de foco, busca informações atualizadas
      for (const focus of learningFocus) {
        const query = `Quais são os conhecimentos mais recentes, abordagens inovadoras e melhores práticas em "${focus}" no contexto de ${this.formatAgentType(agentType)}? Inclua referências a livros, artigos ou pesquisas recentes.`;
        
        // Busca informações atualizadas usando Perplexity
        if (perplexityService.isPerplexityAvailable()) {
          const enrichedData = await perplexityService.queryPerplexity(query, {
            search_recency_filter: 'month',
            return_citations: true
          });
          
          // Cria um novo recurso de conhecimento
          const knowledgeId = uuidv4();
          const newResource: KnowledgeResource = {
            id: knowledgeId,
            type: 'research_paper',
            title: `Atualização em ${focus} para ${this.formatAgentType(agentType)}`,
            content: enrichedData.content,
            relevantDomains: [agentType],
            dateAdded: new Date().toISOString(),
            usageCount: 0,
            tags: [focus, ...focus.split(" ")],
            source: 'perplexity',
            summary: `Pesquisa sobre ${focus} para melhorar as capacidades do agente ${this.formatAgentType(agentType)}`
          };
          
          // Adiciona à base de conhecimento
          this.knowledgeBase.set(knowledgeId, newResource);
          
          // Salva o recurso no sistema de arquivos
          await this.saveKnowledgeResource(newResource);
          
          // Atualiza o perfil do agente
          profile.latestInsights.push(`Nova informação sobre ${focus}: ${enrichedData.content.substring(0, 150)}...`);
          if (profile.latestInsights.length > 10) {
            profile.latestInsights.shift(); // Mantém apenas os 10 mais recentes
          }
          
          // Extrai conceitos-chave e atualiza o conhecimento do agente
          this.extractAndUpdateConcepts(profile, enrichedData.content, focus);
          
          // Registra a tarefa de aprendizado como concluída
          profile.completedLearningTasks.push(`Aprendizado em ${focus} em ${new Date().toISOString()}`);
          
          // Notifica via Slack
          if (slackService.isSlackConfigured()) {
            await slackService.sendNotification(
              `🧠 O agente ${this.formatAgentType(agentType)} acaba de se especializar em "${focus}" através de aprendizado contínuo.`
            );
          }
        }
      }
      
      // Atualiza o nível de expertise com base no número de conceitos conhecidos
      profile.expertiseLevel = Math.min(10, 5 + Math.floor(profile.knownConcepts.size / 20));
      
      // Atualiza a data da última atualização
      profile.lastUpdated = new Date().toISOString();
      
      console.log(`Conhecimento atualizado para ${this.formatAgentType(agentType)}, novo nível de expertise: ${profile.expertiseLevel}`);
    } catch (error) {
      console.error(`Erro ao atualizar conhecimento para ${agentType}:`, error);
    }
  }
  
  /**
   * Extrai conceitos-chave de um texto e atualiza o perfil de conhecimento do agente
   */
  private extractAndUpdateConcepts(profile: AgentLearningProfile, text: string, context: string): void {
    // Extrai conceitos importantes usando a API do modelo
    const extractConcepts = async () => {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "Extraia os 10 conceitos-chave mais importantes do texto a seguir. Retorne apenas uma lista de conceitos, sem numeração ou explicação adicional."
            },
            {
              role: "user",
              content: text
            }
          ]
        });
        
        const concepts = response.choices[0]?.message?.content?.split("\n")
          .map(c => c.trim())
          .filter(c => c.length > 0) || [];
        
        // Atualiza o mapa de conceitos do agente
        for (const concept of concepts) {
          const currentLevel = profile.knownConcepts.get(concept) || 0;
          profile.knownConcepts.set(concept, Math.min(10, currentLevel + 1));
        }
      } catch (error) {
        console.error("Erro ao extrair conceitos:", error);
      }
    };
    
    // Executa a extração de conceitos, mas não aguarda conclusão para não bloquear
    extractConcepts();
  }
  
  /**
   * Salva um recurso de conhecimento no sistema de arquivos
   */
  private async saveKnowledgeResource(resource: KnowledgeResource): Promise<void> {
    try {
      const filePath = path.join(this.knowledgeBasePath, `${resource.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(resource, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Erro ao salvar recurso de conhecimento ${resource.id}:`, error);
    }
  }
  
  /**
   * Salva todos os perfis de aprendizado dos agentes
   */
  private async saveAgentLearningProfiles(): Promise<void> {
    try {
      const profilesPath = path.join(this.knowledgeBasePath, 'agent_profiles.json');
      
      // Converte Map para um formato serializável
      const serializableProfiles = Array.from(this.agentLearningProfiles.entries()).map(([key, profile]) => {
        return {
          ...profile,
          knownConcepts: Array.from(profile.knownConcepts.entries())
        };
      });
      
      await fs.writeFile(profilesPath, JSON.stringify(serializableProfiles, null, 2), 'utf-8');
    } catch (error) {
      console.error("Erro ao salvar perfis de aprendizado:", error);
    }
  }
  
  /**
   * Cria uma nova tarefa no sistema
   */
  public async createTask(
    title: string, 
    description: string,
    context: {
      businessType?: 'transport' | 'farm' | 'both' | 'personal';
      userMemory?: string;
      userPreferences?: Record<string, any>;
      additionalContext?: string;
    } = {}
  ): Promise<Task> {
    const taskId = uuidv4();
    
    const task: Task = {
      id: taskId,
      title,
      description,
      state: TaskState.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [],
      requiredAgents: [AgentType.COORDINATOR], // Começa sempre com o coordenador
      context
    };
    
    this.tasks.set(taskId, task);
    
    // Inicia o fluxo de trabalho com o coordenador
    await this.addTaskStep(taskId, {
      id: uuidv4(),
      description: 'Analisar tarefa e planejar abordagem',
      agent: AgentType.COORDINATOR,
      state: TaskState.PENDING,
      messages: []
    });
    
    // Emite evento de criação de tarefa
    this.events.emit('task:created', task);
    
    // Notifica a criação via Slack
    if (slackService.isSlackConfigured()) {
      await slackService.sendTaskUpdate(
        {
          id: task.id,
          title: task.title,
          description: task.description,
          state: task.state,
          steps: task.steps.map(step => ({
            description: step.description,
            state: step.state
          }))
        },
        'created'
      );
    }
    
    // Inicia o processamento automático da tarefa
    this.processTask(taskId);
    
    return task;
  }
  
  /**
   * Adiciona uma nova etapa à tarefa
   */
  private async addTaskStep(taskId: string, step: Omit<TaskStep, 'messages'> & { messages?: AgentMessage[] }): Promise<TaskStep> {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Tarefa não encontrada: ${taskId}`);
    }
    
    const newStep: TaskStep = {
      ...step,
      messages: step.messages || []
    };
    
    task.steps.push(newStep);
    task.updatedAt = new Date().toISOString();
    
    this.tasks.set(taskId, task);
    
    // Emite evento de nova etapa
    this.events.emit('task:step:added', { taskId, step: newStep });
    
    return newStep;
  }
  
  /**
   * Processa uma tarefa existente
   */
  private async processTask(taskId: string): Promise<void> {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Tarefa não encontrada: ${taskId}`);
    }
    
    // Verifica se a tarefa já está completa ou falhou
    if (task.state === TaskState.COMPLETED || task.state === TaskState.FAILED) {
      return;
    }
    
    // Atualiza o estado da tarefa
    const oldState = task.state;
    task.state = TaskState.IN_PROGRESS;
    task.updatedAt = new Date().toISOString();
    
    this.tasks.set(taskId, task);
    this.events.emit('task:updated', task);
    
    // Notifica alteração de estado via Slack, se configurado
    if (oldState !== TaskState.IN_PROGRESS) {
      this.notifyTaskStateChange(task, oldState, TaskState.IN_PROGRESS);
    }
    
    // Verifica se deve usar o modo intensivo
    if (this.intensiveModeEnabled) {
      console.log(`[MultiAgentSystem] Tarefa ${taskId} será processada em modo INTENSIVO`);
      await this.processTaskInIntensiveMode(taskId);
      return;
    }
    
    // Modo regular: processa todas as etapas pendentes
    for (const step of task.steps) {
      if (step.state === TaskState.PENDING) {
        await this.processTaskStep(taskId, step.id);
      }
    }
  }
  
  /**
   * Processa uma etapa específica da tarefa
   */
  private async processTaskStep(taskId: string, stepId: string): Promise<void> {
    console.log(`[MultiAgentSystem] Iniciando processamento da etapa ${stepId} da tarefa ${taskId}`);
    const task = this.getTask(taskId);
    if (!task) {
      console.error(`[MultiAgentSystem] Tarefa não encontrada: ${taskId}`);
      throw new Error(`Tarefa não encontrada: ${taskId}`);
    }
    
    const stepIndex = task.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      console.error(`[MultiAgentSystem] Etapa não encontrada: ${stepId}`);
      throw new Error(`Etapa não encontrada: ${stepId}`);
    }
    
    const step = task.steps[stepIndex];
    console.log(`[MultiAgentSystem] Etapa encontrada: ${step.description}, estado atual: ${step.state}`);
    
    // Verifica se a etapa já foi processada
    if (step.state !== TaskState.PENDING) {
      console.log(`[MultiAgentSystem] Etapa ${stepId} já está em processamento ou foi concluída: ${step.state}`);
      return;
    }
    
    // Atualiza o estado da etapa
    step.state = TaskState.IN_PROGRESS;
    step.startTime = new Date().toISOString();
    
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
    
    // Emite evento de início de processamento da etapa
    this.events.emit('task:step:started', { taskId, stepId });
    console.log(`[MultiAgentSystem] Evento emitido: task:step:started para etapa ${stepId}`);
    
    try {
      // Obtém o agente responsável pela etapa
      const agentType = step.agent;
      console.log(`[MultiAgentSystem] Agente responsável: ${agentType}`);
      
      // Prepara o contexto para o agente
      const agentContext = this.prepareAgentContext(task, step);
      console.log(`[MultiAgentSystem] Contexto preparado para o agente ${agentType}`);
      
      // Executa o agente
      console.log(`[MultiAgentSystem] Iniciando execução do agente ${agentType}`);
      const result = await this.executeAgent(agentType, agentContext);
      
      // Analisa o resultado para verificar se requer input do usuário
      const requiresUserInput = this.checkIfRequiresUserInput(result);
      
      if (requiresUserInput) {
        // Extrai a pergunta para o usuário
        const userInputPrompt = this.extractUserInputPrompt(result);
        
        // Atualiza o estado da etapa
        step.state = TaskState.AWAITING_USER_INPUT;
        step.requiresUserInput = true;
        step.userInputPrompt = userInputPrompt;
        
        task.updatedAt = new Date().toISOString();
        this.tasks.set(taskId, task);
        
        // Emite evento solicitando input do usuário
        this.events.emit('task:user:input:required', {
          taskId,
          stepId,
          prompt: userInputPrompt
        });
      } else {
        // Finaliza a etapa com sucesso
        this.completeTaskStep(taskId, stepId, result);
        
        // Determina a próxima etapa com base no resultado
        await this.determineNextSteps(taskId, result);
      }
    } catch (error) {
      console.error(`Erro ao processar etapa ${stepId}:`, error);
      
      // Atualiza o estado da etapa para falha
      step.state = TaskState.FAILED;
      step.error = error.toString();
      step.endTime = new Date().toISOString();
      
      task.updatedAt = new Date().toISOString();
      this.tasks.set(taskId, task);
      
      // Emite evento de falha
      this.events.emit('task:step:failed', {
        taskId,
        stepId,
        error: error.toString()
      });
      
      // Verifica se deve tentar uma abordagem alternativa ou falhar a tarefa
      await this.handleStepFailure(taskId, stepId);
    }
  }
  
  /**
   * Prepara o contexto para o agente com base na tarefa e etapa
   */
  private prepareAgentContext(task: Task, step: TaskStep): string {
    let context = `TAREFA: ${task.title}\nDESCRIÇÃO: ${task.description}\n\n`;
    
    // Adiciona contexto de negócio
    if (task.context.businessType) {
      context += `TIPO DE NEGÓCIO: ${this.formatBusinessType(task.context.businessType)}\n\n`;
    }
    
    // Adiciona a memória do usuário se disponível
    if (task.context.userMemory) {
      context += `CONTEXTO DO USUÁRIO:\n${task.context.userMemory}\n\n`;
    }
    
    // Adiciona preferências do usuário se disponíveis
    if (task.context.userPreferences) {
      context += `PREFERÊNCIAS DO USUÁRIO:\n`;
      for (const [key, value] of Object.entries(task.context.userPreferences)) {
        context += `- ${key}: ${value}\n`;
      }
      context += '\n';
    }
    
    // Adiciona contexto adicional
    if (task.context.additionalContext) {
      context += `CONTEXTO ADICIONAL:\n${task.context.additionalContext}\n\n`;
    }
    
    // Adiciona informação sobre o modo intensivo se estiver ativado
    if (this.intensiveModeEnabled) {
      context += `MODO MULTIAGENTE INTENSIVO ATIVADO:\nVocê está operando no modo de colaboração intensiva entre agentes especializados. Suas respostas devem ser estruturadas para otimizar o trabalho conjunto e minimizar a necessidade de intervenção humana. Máximo de ${this.intensiveModeOptions.maxRounds} rodadas de interação.\n\n`;
    }
    
    // Adiciona informações sobre o nível de expertise e conhecimentos do agente
    const agentProfile = this.agentLearningProfiles.get(step.agent);
    if (agentProfile) {
      context += `PERFIL DE ESPECIALIZAÇÃO DO AGENTE:\n`;
      context += `Nível de Expertise: ${agentProfile.expertiseLevel}/10\n`;
      
      if (agentProfile.specializations.length > 0) {
        context += `Especializações: ${agentProfile.specializations.join(', ')}\n`;
      }
      
      // Adiciona os 10 conceitos mais relevantes que o agente conhece
      const sortedConcepts = Array.from(agentProfile.knownConcepts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      if (sortedConcepts.length > 0) {
        context += `Principais áreas de conhecimento:\n`;
        sortedConcepts.forEach(([concept, level]) => {
          context += `- ${concept} (nível ${level}/10)\n`;
        });
      }
      
      // Adiciona insights recentes relevantes para a tarefa atual
      if (agentProfile.latestInsights.length > 0) {
        // Filtra os insights que podem ser relevantes para a tarefa
        const relevantInsights = agentProfile.latestInsights.filter(insight => {
          return task.title.includes(insight.substring(0, 15)) || 
                 task.description.includes(insight.substring(0, 15)) ||
                 (task.context.additionalContext && task.context.additionalContext.includes(insight.substring(0, 15)));
        });
        
        if (relevantInsights.length > 0) {
          context += `\nINSIGHTS RECENTES RELEVANTES:\n`;
          relevantInsights.slice(0, 3).forEach(insight => {
            context += `- ${insight}\n`;
          });
          context += '\n';
        }
      }
    }
    
    // Adiciona conhecimentos da base de conhecimento relevantes para a tarefa
    const relevantKnowledge = this.findRelevantKnowledgeForTask(task, step.agent);
    if (relevantKnowledge.length > 0) {
      context += `\nCONHECIMENTO ESPECIALIZADO RELEVANTE:\n`;
      relevantKnowledge.slice(0, 2).forEach(resource => {
        context += `[${resource.title}]\n${resource.summary}\n\n`;
        
        // Incrementa o contador de uso do recurso
        resource.usageCount++;
        resource.lastUsed = new Date().toISOString();
        this.saveKnowledgeResource(resource).catch(error => 
          console.error(`Erro ao atualizar recurso de conhecimento: ${error}`)
        );
      });
      context += '\n';
    }
    
    // Adiciona histórico de etapas anteriores
    if (task.steps.length > 1) {
      context += 'HISTÓRICO DE ETAPAS:\n';
      
      for (const prevStep of task.steps) {
        // Inclui apenas etapas anteriores que já foram completadas
        if (prevStep.id !== step.id && prevStep.state === TaskState.COMPLETED) {
          context += `- ${prevStep.description} (${prevStep.agent}): ${prevStep.result ? prevStep.result.substring(0, 200) + (prevStep.result.length > 200 ? '...' : '') : 'Sem resultado'}\n`;
        }
      }
      
      context += '\n';
    }
    
    // Adiciona mensagens anteriores desta etapa
    if (step.messages.length > 0) {
      context += 'MENSAGENS ANTERIORES NESTA ETAPA:\n';
      
      for (const message of step.messages) {
        context += `[${message.from} -> ${message.to}]: ${message.content}\n`;
      }
      
      context += '\n';
    }
    
    // Adiciona input do usuário, se disponível
    if (step.userInput) {
      context += `INPUT DO USUÁRIO: ${step.userInput}\n\n`;
    }
    
    // Adiciona a descrição da etapa atual
    context += `ETAPA ATUAL: ${step.description}\n`;
    
    return context;
  }
  
  /**
   * Encontra recursos de conhecimento relevantes para uma tarefa específica
   */
  private findRelevantKnowledgeForTask(task: Task, agentType: AgentType): KnowledgeResource[] {
    // Se a base de conhecimento estiver vazia, retorna lista vazia
    if (this.knowledgeBase.size === 0) {
      return [];
    }
    
    // Extrai palavras-chave da tarefa
    const keywords = [
      ...task.title.toLowerCase().split(/\s+/),
      ...task.description.toLowerCase().split(/\s+/)
    ].filter(word => word.length > 3);
    
    // Filtra recursos relevantes
    const relevantResources = Array.from(this.knowledgeBase.values())
      .filter(resource => {
        // Verifica se o recurso é relevante para este agente
        const isForThisAgent = resource.relevantDomains.includes(agentType);
        
        // Verifica se o conteúdo do recurso contém palavras-chave da tarefa
        const hasRelevantKeywords = keywords.some(keyword => 
          resource.title.toLowerCase().includes(keyword) || 
          resource.tags.some(tag => tag.toLowerCase().includes(keyword))
        );
        
        return isForThisAgent && hasRelevantKeywords;
      })
      .sort((a, b) => {
        // Classifica por relevância: soma do número de palavras-chave correspondentes
        const scoreA = keywords.filter(keyword => 
          a.title.toLowerCase().includes(keyword) || 
          a.tags.some(tag => tag.toLowerCase().includes(keyword))
        ).length;
        
        const scoreB = keywords.filter(keyword => 
          b.title.toLowerCase().includes(keyword) || 
          b.tags.some(tag => tag.toLowerCase().includes(keyword))
        ).length;
        
        return scoreB - scoreA;
      });
    
    return relevantResources;
  }
  
  /**
   * Executa um agente com o contexto fornecido
   */
  private async executeAgent(agentType: AgentType, context: string): Promise<string> {
    console.log(`[MultiAgentSystem][executeAgent] Iniciando execução do agente ${agentType}`);
    const agentDef = agentDefinitions[agentType];
    
    if (!agentDef) {
      console.error(`[MultiAgentSystem][executeAgent] Tipo de agente não definido: ${agentType}`);
      throw new Error(`Tipo de agente não definido: ${agentType}`);
    }
    
    // Constrói o prompt para o agente
    const systemPrompt = agentDef.systemPrompt;
    const userPrompt = context;
    console.log(`[MultiAgentSystem][executeAgent] Prompt preparado para ${agentType}`);
    
    let response = "";
    
    // Verifica se é um agente que se beneficiaria de informações atualizadas via Perplexity
    const needsRealTimeData = (
      agentType === AgentType.RESEARCHER || 
      agentType === AgentType.ANALYST || 
      agentType === AgentType.TRANSPORT_EXPERT || 
      agentType === AgentType.FARM_EXPERT
    );
    
    try {
      // Decide qual API usar com base no modelo padrão do agente
      if (agentDef.defaultModel.startsWith('claude')) {
        console.log(`[MultiAgentSystem][executeAgent] Usando Anthropic API para ${agentType}`);
        // Usa Anthropic API
        if (!process.env.ANTHROPIC_API_KEY) {
          console.error('[MultiAgentSystem][executeAgent] API key para Anthropic não configurada');
          throw new Error('API key para Anthropic não configurada');
        }
        
        try {
          console.log(`[MultiAgentSystem][executeAgent] Enviando requisição para Anthropic`);
          
          // Adiciona timeout para evitar que a chamada fique presa
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao chamar API Anthropic após 30 segundos')), 30000);
          });
          
          const responsePromise = anthropic.messages.create({
            model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
            max_tokens: 1024,
            messages: [
              { role: 'user', content: userPrompt }
            ],
            system: systemPrompt,
          });
          
          const message = await Promise.race([responsePromise, timeoutPromise]);
          
          console.log(`[MultiAgentSystem][executeAgent] Resposta recebida de Anthropic`);
          
          // Verifica e extrai o conteúdo da resposta
          if (message.content && message.content.length > 0 && message.content[0].type === 'text') {
            response = message.content[0].text;
            console.log(`[MultiAgentSystem][executeAgent] Resposta de Anthropic extraída com sucesso (${response.length} caracteres)`);
          } else {
            console.error('[MultiAgentSystem][executeAgent] Resposta de Anthropic recebida mas com formato inesperado');
            response = "Não foi possível gerar uma resposta.";
          }
        } catch (error) {
          console.error('[MultiAgentSystem][executeAgent] Erro ao chamar API Anthropic:', error);
          throw error;
        }
      } else {
        console.log(`[MultiAgentSystem][executeAgent] Usando OpenAI API para ${agentType}`);
        // Usa OpenAI API
        if (!process.env.OPENAI_API_KEY) {
          console.error('[MultiAgentSystem][executeAgent] API key para OpenAI não configurada');
          throw new Error('API key para OpenAI não configurada');
        }
        
        try {
          console.log(`[MultiAgentSystem][executeAgent] Enviando requisição para OpenAI`);
          
          // Adiciona timeout para evitar que a chamada fique presa
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao chamar API OpenAI após 30 segundos')), 30000);
          });
          
          const responsePromise = openai.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 1024,
          });
          
          const completion = await Promise.race([responsePromise, timeoutPromise]);
          
          console.log(`[MultiAgentSystem][executeAgent] Resposta recebida de OpenAI`);
          
          if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
            response = completion.choices[0].message.content || "Não foi possível gerar uma resposta.";
            console.log(`[MultiAgentSystem][executeAgent] Resposta de OpenAI extraída com sucesso (${response.length} caracteres)`);
          } else {
            console.error('[MultiAgentSystem][executeAgent] Resposta de OpenAI recebida mas com formato inesperado');
            response = "Não foi possível gerar uma resposta.";
          }
        } catch (error) {
          console.error('[MultiAgentSystem][executeAgent] Erro ao chamar API OpenAI:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error(`[MultiAgentSystem][executeAgent] Erro ao executar agente ${agentType}:`, error);
      throw error;
    }
    
    // Se for um agente que se beneficia de dados em tempo real e o Perplexity estiver disponível,
    // enriquece a resposta com informações atualizadas
    if (needsRealTimeData && perplexityService.isPerplexityAvailable()) {
      try {
        // Extrai a consulta relevante com base no contexto e na resposta inicial
        const relevantContext = this.extractRelevantContextForPerplexity(agentType, context, response);
        
        console.log(`[MultiAgentSystem][executeAgent] Enriquecendo resposta com Perplexity`);
        
        // Adiciona timeout para evitar que a chamada fique presa
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout ao chamar API Perplexity após 30 segundos')), 30000);
        });
        
        // Consulta Perplexity para dados atualizados
        const responsePromise = perplexityService.enrichResponseWithFacts(
          relevantContext, 
          response
        );
        
        const enrichedData = await Promise.race([responsePromise, timeoutPromise]);
        console.log(`[MultiAgentSystem][executeAgent] Resposta de Perplexity recebida com sucesso`);
        
        // Formata a resposta enriquecida com citações
        if (enrichedData.enhancedResponse) {
          response = this.formatEnrichedResponse(response, {
            content: enrichedData.enhancedResponse,
            citations: enrichedData.citations
          });
          
          // Envia notificação para o Slack sobre o uso de dados atualizados, se configurado
          if (slackService.isSlackConfigured()) {
            await this.notifyDataSourceUsage(agentType, relevantContext, enrichedData.citations);
          }
        }
      } catch (error) {
        console.error("Erro ao enriquecer resposta com Perplexity:", error);
        // Continua com a resposta original em caso de erro
      }
    }
    
    return response;
  }
  
  /**
   * Extrai o contexto relevante para consulta no Perplexity com base no tipo de agente
   */
  private extractRelevantContextForPerplexity(agentType: AgentType, context: string, initialResponse: string): string {
    // Adapta a consulta com base no tipo de agente
    switch (agentType) {
      case AgentType.TRANSPORT_EXPERT:
        return `Informações atualizadas sobre o mercado de transportes no Brasil relacionadas a: ${context.slice(0, 200)}`;
      
      case AgentType.FARM_EXPERT:
        return `Dados recentes sobre o agronegócio brasileiro relacionados a: ${context.slice(0, 200)}`;
      
      case AgentType.RESEARCHER:
      case AgentType.ANALYST:
        // Extrai os tópicos principais da resposta inicial para focar a consulta
        const mainPoints = initialResponse
          .split('\n')
          .filter(line => line.trim().length > 0)
          .slice(0, 3)
          .join('. ');
        
        return `Informações factuais atualizadas sobre: ${mainPoints}`;
      
      default:
        return context.slice(0, 250);
    }
  }
  
  /**
   * Formata a resposta enriquecida com dados do Perplexity
   */
  private formatEnrichedResponse(originalResponse: string, enrichedData: { content: string, citations: string[] }): string {
    // Adiciona os dados enriquecidos e as fontes
    let formattedResponse = originalResponse;
    
    // Adiciona uma seção de dados atualizados
    formattedResponse += "\n\n## Dados Atualizados\n";
    formattedResponse += enrichedData.content;
    
    // Adiciona as citações se disponíveis
    if (enrichedData.citations && enrichedData.citations.length > 0) {
      formattedResponse += "\n\n## Fontes\n";
      enrichedData.citations.forEach((citation, index) => {
        formattedResponse += `${index + 1}. ${citation}\n`;
      });
    }
    
    return formattedResponse;
  }
  
  /**
   * Notifica o uso de dados em tempo real via Slack
   */
  private async notifyDataSourceUsage(agentType: AgentType, query: string, citations: string[] = []): Promise<void> {
    try {
      if (slackService.isSlackConfigured()) {
        await slackService.sendAlert(
          "Dados em Tempo Real Utilizados",
          `O agente ${this.formatAgentType(agentType)} utilizou dados em tempo real para enriquecer sua resposta.`,
          "info"
        );
      }
    } catch (error) {
      console.error("Erro ao enviar notificação para o Slack:", error);
      // Ignora erros de notificação para não interromper o fluxo principal
    }
  }
  
  /**
   * Notifica mudanças de estado de tarefas via Slack
   */
  private async notifyTaskStateChange(task: Task, oldState: TaskState, newState: TaskState): Promise<void> {
    try {
      if (!slackService.isSlackConfigured()) {
        return;
      }
      
      // Formata os estados para exibição
      const formatState = (state: TaskState): string => {
        switch (state) {
          case TaskState.PENDING: return "Pendente";
          case TaskState.PLANNING: return "Em Planejamento";
          case TaskState.IN_PROGRESS: return "Em Andamento";
          case TaskState.AWAITING_USER_INPUT: return "Aguardando Input do Usuário";
          case TaskState.COMPLETED: return "Concluída";
          case TaskState.FAILED: return "Falhou";
          default: return state;
        }
      };
      
      // Determina a prioridade da notificação
      let severity: 'info' | 'warning' | 'error' = 'info';
      if (newState === TaskState.FAILED) {
        severity = 'error';
      } else if (newState === TaskState.AWAITING_USER_INPUT) {
        severity = 'warning';
      }
      
      // Personaliza a mensagem com base no novo estado
      let messageDetail = '';
      if (newState === TaskState.COMPLETED) {
        messageDetail = `com ${task.steps.length} etapas completadas.`;
      } else if (newState === TaskState.AWAITING_USER_INPUT) {
        const awaitingStep = task.steps.find(step => step.state === TaskState.AWAITING_USER_INPUT);
        if (awaitingStep && awaitingStep.userInputPrompt) {
          messageDetail = `\nInformação solicitada: "${awaitingStep.userInputPrompt.substring(0, 100)}${awaitingStep.userInputPrompt.length > 100 ? '...' : ''}"`;
        }
      } else if (newState === TaskState.IN_PROGRESS) {
        const pendingSteps = task.steps.filter(step => step.state === TaskState.PENDING || step.state === TaskState.IN_PROGRESS);
        messageDetail = `com ${pendingSteps.length} etapa(s) em andamento ou pendente(s).`;
      }
      
      // Determina o status da tarefa para o Slack
      let taskStatus: 'created' | 'updated' | 'completed' = 'updated';
      if (newState === TaskState.COMPLETED) {
        taskStatus = 'completed';
      }
      
      // Envia a notificação via Slack
      await slackService.sendTaskUpdate(
        {
          id: task.id,
          title: task.title,
          description: task.description,
          state: newState,
          steps: task.steps.map(step => ({
            description: step.description,
            state: step.state
          }))
        },
        taskStatus
      );
      
    } catch (error) {
      console.error("Erro ao enviar notificação de mudança de estado para o Slack:", error);
      // Ignora erros de notificação para não interromper o fluxo principal
    }
  }
  
  /**
   * Verifica se o resultado do agente requer input do usuário
   */
  private checkIfRequiresUserInput(result: string): boolean {
    // Busca por padrões que indicam necessidade de input do usuário
    const inputPatterns = [
      /\[input do usuário necessário\]/i,
      /\[requer informação do usuário\]/i,
      /\[aguardando resposta do usuário\]/i,
      /pergunta para o usuário:/i,
      /o usuário precisa fornecer:/i,
      /preciso que o usuário informe:/i,
      /necessito da seguinte informação do usuário:/i
    ];
    
    return inputPatterns.some(pattern => pattern.test(result));
  }
  
  /**
   * Extrai a pergunta para o usuário do resultado do agente
   */
  private extractUserInputPrompt(result: string): string {
    // Padrões para extrair a pergunta do usuário
    const promptPatterns = [
      /pergunta para o usuário:(.*?)(?:\[fim da pergunta\]|$)/is,
      /o usuário precisa fornecer:(.*?)(?:\[fim\]|$)/is,
      /preciso que o usuário informe:(.*?)(?:\[fim\]|$)/is,
      /necessito da seguinte informação do usuário:(.*?)(?:\[fim\]|$)/is
    ];
    
    for (const pattern of promptPatterns) {
      const match = result.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Se nenhum padrão específico for encontrado, busca por conteúdo após os marcadores
    const markerIndex = Math.max(
      result.indexOf('[input do usuário necessário]'),
      result.indexOf('[requer informação do usuário]'),
      result.indexOf('[aguardando resposta do usuário]')
    );
    
    if (markerIndex !== -1) {
      return result.substring(markerIndex).trim();
    }
    
    // Se não encontrar nada específico, retorna o resultado completo
    return `Por favor, forneça informações adicionais: ${result}`;
  }
  
  /**
   * Registra uma resposta do usuário para uma etapa que está aguardando input
   */
  public async submitUserInput(taskId: string, stepId: string, userInput: string): Promise<void> {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Tarefa não encontrada: ${taskId}`);
    }
    
    const stepIndex = task.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Etapa não encontrada: ${stepId}`);
    }
    
    const step = task.steps[stepIndex];
    
    // Verifica se a etapa está aguardando input do usuário
    if (step.state !== TaskState.AWAITING_USER_INPUT) {
      throw new Error(`Etapa não está aguardando input do usuário: ${stepId}`);
    }
    
    // Registra o input do usuário
    step.userInput = userInput;
    
    // Atualiza o estado da etapa e da tarefa
    const oldStepState = step.state;
    step.state = TaskState.IN_PROGRESS;
    
    // Atualiza o estado da tarefa para em andamento
    const oldTaskState = task.state;
    task.state = TaskState.IN_PROGRESS;
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
    
    // Emite evento de input do usuário recebido
    this.events.emit('task:user:input:received', {
      taskId,
      stepId,
      input: userInput
    });
    
    // Notifica a mudança de estado via Slack
    if (oldTaskState === TaskState.AWAITING_USER_INPUT) {
      this.notifyTaskStateChange(task, oldTaskState, TaskState.IN_PROGRESS);
    }
    
    // Adiciona uma mensagem do usuário
    const message: AgentMessage = {
      id: uuidv4(),
      content: userInput,
      from: 'user' as any,
      to: step.agent,
      timestamp: new Date().toISOString()
    };
    
    step.messages.push(message);
    
    // Continua o processamento da etapa
    try {
      // Prepara o contexto atualizado para o agente
      const agentContext = this.prepareAgentContext(task, step);
      
      // Executa o agente novamente com o input do usuário
      const result = await this.executeAgent(step.agent, agentContext);
      
      // Verifica se ainda requer input do usuário
      const requiresMoreInput = this.checkIfRequiresUserInput(result);
      
      if (requiresMoreInput) {
        // Extrai a nova pergunta para o usuário
        const userInputPrompt = this.extractUserInputPrompt(result);
        
        // Atualiza o estado da etapa
        const oldState = task.state;
        step.state = TaskState.AWAITING_USER_INPUT;
        step.requiresUserInput = true;
        step.userInputPrompt = userInputPrompt;
        
        // Atualiza o estado da tarefa para aguardando input
        task.state = TaskState.AWAITING_USER_INPUT;
        task.updatedAt = new Date().toISOString();
        this.tasks.set(taskId, task);
        
        // Emite evento solicitando mais input do usuário
        this.events.emit('task:user:input:required', {
          taskId,
          stepId,
          prompt: userInputPrompt
        });
        
        // Notifica a mudança de estado via Slack
        this.notifyTaskStateChange(task, oldState, TaskState.AWAITING_USER_INPUT);
      } else {
        // Finaliza a etapa com sucesso
        this.completeTaskStep(taskId, stepId, result);
        
        // Determina a próxima etapa com base no resultado
        await this.determineNextSteps(taskId, result);
      }
    } catch (error) {
      console.error(`Erro ao processar etapa ${stepId} após input do usuário:`, error);
      
      // Atualiza o estado da etapa para falha
      step.state = TaskState.FAILED;
      step.error = error.toString();
      step.endTime = new Date().toISOString();
      
      task.updatedAt = new Date().toISOString();
      this.tasks.set(taskId, task);
      
      // Emite evento de falha
      this.events.emit('task:step:failed', {
        taskId,
        stepId,
        error: error.toString()
      });
      
      // Verifica se deve tentar uma abordagem alternativa ou falhar a tarefa
      await this.handleStepFailure(taskId, stepId);
    }
  }
  
  /**
   * Marca uma etapa como concluída com o resultado fornecido
   */
  private completeTaskStep(taskId: string, stepId: string, result: string): void {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Tarefa não encontrada: ${taskId}`);
    }
    
    const stepIndex = task.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Etapa não encontrada: ${stepId}`);
    }
    
    const step = task.steps[stepIndex];
    
    // Atualiza o estado da etapa
    step.state = TaskState.COMPLETED;
    step.result = result;
    step.endTime = new Date().toISOString();
    
    task.updatedAt = new Date().toISOString();
    this.tasks.set(taskId, task);
    
    // Emite evento de conclusão da etapa
    this.events.emit('task:step:completed', {
      taskId,
      stepId,
      result
    });
  }
  
  /**
   * Determina as próximas etapas com base no resultado da etapa atual
   */
  private async determineNextSteps(taskId: string, result: string): Promise<void> {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Tarefa não encontrada: ${taskId}`);
    }
    
    // Verifica se todas as etapas foram concluídas
    const allStepsCompleted = task.steps.every(
      step => step.state === TaskState.COMPLETED || step.state === TaskState.FAILED
    );
    
    if (allStepsCompleted) {
      // Se o último agente foi o coordenador, a tarefa está concluída
      const lastStep = task.steps[task.steps.length - 1];
      
      if (lastStep.agent === AgentType.COORDINATOR) {
        // Marca a tarefa como concluída
        const oldState = task.state;
        task.state = TaskState.COMPLETED;
        task.completedAt = new Date().toISOString();
        task.result = lastStep.result;
        
        task.updatedAt = new Date().toISOString();
        this.tasks.set(taskId, task);
        
        // Emite evento de conclusão da tarefa
        this.events.emit('task:completed', task);
        
        // Notifica a conclusão via Slack
        this.notifyTaskStateChange(task, oldState, TaskState.COMPLETED);
        return;
      }
      
      // Caso contrário, adiciona uma etapa final com o coordenador
      await this.addTaskStep(taskId, {
        id: uuidv4(),
        description: 'Finalizar e sintetizar resultados',
        agent: AgentType.COORDINATOR,
        state: TaskState.PENDING,
        messages: []
      });
      
      // Processa a nova etapa
      const newStep = task.steps[task.steps.length - 1];
      await this.processTaskStep(taskId, newStep.id);
      return;
    }
    
    // Analisa o resultado para determinar próximas etapas
    // Este é um ponto onde o sistema pode ser estendido para ter uma lógica mais sofisticada
    
    // Por padrão, se o agente atual foi o coordenador, 
    // extrai recomendações de próximos agentes do resultado
    const lastStep = task.steps[task.steps.length - 1];
    
    if (lastStep.agent === AgentType.COORDINATOR) {
      const nextAgents = this.extractNextAgentsFromCoordinatorResult(result);
      
      // Se não conseguir extrair automaticamente, usa o planner
      if (nextAgents.length === 0) {
        await this.addTaskStep(taskId, {
          id: uuidv4(),
          description: 'Desenvolver plano detalhado',
          agent: AgentType.PLANNER,
          state: TaskState.PENDING,
          messages: []
        });
        
        // Processa a nova etapa
        const newStep = task.steps[task.steps.length - 1];
        await this.processTaskStep(taskId, newStep.id);
        return;
      }
      
      // Adiciona etapas para cada agente recomendado
      for (const { agent, description } of nextAgents) {
        await this.addTaskStep(taskId, {
          id: uuidv4(),
          description: description || `Executar tarefa como ${this.formatAgentType(agent)}`,
          agent,
          state: TaskState.PENDING,
          messages: []
        });
      }
      
      // Processa a próxima etapa
      const newStep = task.steps[task.steps.length - 1];
      await this.processTaskStep(taskId, newStep.id);
      return;
    }
    
    // Se o agente atual foi o planner, extrai o plano do resultado
    if (lastStep.agent === AgentType.PLANNER) {
      const steps = this.extractStepsFromPlannerResult(result);
      
      // Se não conseguir extrair automaticamente, volta ao coordenador
      if (steps.length === 0) {
        await this.addTaskStep(taskId, {
          id: uuidv4(),
          description: 'Revisar plano e determinar próximos passos',
          agent: AgentType.COORDINATOR,
          state: TaskState.PENDING,
          messages: []
        });
        
        // Processa a nova etapa
        const newStep = task.steps[task.steps.length - 1];
        await this.processTaskStep(taskId, newStep.id);
        return;
      }
      
      // Adiciona etapas para cada etapa do plano
      for (const step of steps) {
        await this.addTaskStep(taskId, {
          id: uuidv4(),
          description: step.description,
          agent: step.agent,
          state: TaskState.PENDING,
          messages: []
        });
      }
      
      // Processa a próxima etapa
      const newStep = task.steps[task.steps.length - 1];
      await this.processTaskStep(taskId, newStep.id);
      return;
    }
    
    // Para qualquer outro agente, adiciona uma etapa com o coordenador para avaliar o resultado
    await this.addTaskStep(taskId, {
      id: uuidv4(),
      description: 'Avaliar resultado e determinar próximos passos',
      agent: AgentType.COORDINATOR,
      state: TaskState.PENDING,
      messages: []
    });
    
    // Processa a nova etapa
    const newStep = task.steps[task.steps.length - 1];
    await this.processTaskStep(taskId, newStep.id);
  }
  
  /**
   * Extrai recomendações de próximos agentes do resultado do coordenador
   */
  private extractNextAgentsFromCoordinatorResult(result: string): Array<{ agent: AgentType; description?: string; }> {
    const nextAgents: Array<{ agent: AgentType; description?: string; }> = [];
    
    // Busca por padrões como "Próximo agente: [AGENTE]" ou "Recomendo o agente [AGENTE]"
    const agentMatches = result.matchAll(/(?:próximo agente|agente recomendado|delegar para|usar o agente):\s*([a-z_]+)(?:\s*-\s*(.+?))?(?:\n|$)/gi);
    
    for (const match of agentMatches) {
      const agentTypeString = match[1]?.trim().toLowerCase();
      const description = match[2]?.trim();
      
      // Converte a string para o enum AgentType
      const agentTypeKey = Object.keys(AgentType).find(
        key => AgentType[key].toLowerCase() === agentTypeString
      );
      
      if (agentTypeKey) {
        nextAgents.push({ 
          agent: AgentType[agentTypeKey], 
          description 
        });
      }
    }
    
    // Verifica seções específicas no resultado
    const sections = [
      { 
        pattern: /próximos passos:(.*?)(?:\n\n|$)/is,
        agentExtractionPattern: /([a-z_]+)(?:\s*-\s*(.+?))?(?:\n|$)/gi
      },
      { 
        pattern: /agentes necessários:(.*?)(?:\n\n|$)/is,
        agentExtractionPattern: /([a-z_]+)(?:\s*-\s*(.+?))?(?:\n|$)/gi
      }
    ];
    
    for (const section of sections) {
      const sectionMatch = result.match(section.pattern);
      if (sectionMatch && sectionMatch[1]) {
        const sectionContent = sectionMatch[1].trim();
        const agentMatches = sectionContent.matchAll(section.agentExtractionPattern);
        
        for (const match of agentMatches) {
          const agentTypeString = match[1]?.trim().toLowerCase();
          const description = match[2]?.trim();
          
          // Tenta encontrar o agente pelo nome aproximado
          let foundAgentType: AgentType | undefined;
          
          // Tenta corresponder com nomes de agentes
          for (const [key, value] of Object.entries(AgentType)) {
            if (value.includes(agentTypeString) || agentTypeString.includes(value)) {
              foundAgentType = value as AgentType;
              break;
            }
          }
          
          if (foundAgentType) {
            nextAgents.push({ 
              agent: foundAgentType, 
              description 
            });
          }
        }
      }
    }
    
    return nextAgents;
  }
  
  /**
   * Extrai etapas do resultado do planner
   */
  private extractStepsFromPlannerResult(result: string): Array<{ description: string; agent: AgentType; }> {
    const steps: Array<{ description: string; agent: AgentType; }> = [];
    
    // Busca por padrões como "1. [Descrição] - [Agente]" ou "Etapa 1: [Descrição] ([Agente])"
    const stepPatterns = [
      /(\d+)\.\s*([^-\n]+)\s*-\s*([a-z_]+)/gi,
      /etapa\s*(\d+)\s*:\s*([^(]+)\s*\(([a-z_]+)\)/gi,
      /passo\s*(\d+)\s*:\s*([^(]+)\s*\(([a-z_]+)\)/gi
    ];
    
    for (const pattern of stepPatterns) {
      const stepMatches = result.matchAll(pattern);
      
      for (const match of stepMatches) {
        const description = match[2]?.trim();
        const agentTypeString = match[3]?.trim().toLowerCase();
        
        if (!description || !agentTypeString) continue;
        
        // Tenta encontrar o agente pelo nome aproximado
        let foundAgentType: AgentType | undefined;
        
        // Verifica correspondência direta com o enum
        const agentTypeKey = Object.keys(AgentType).find(
          key => AgentType[key].toLowerCase() === agentTypeString
        );
        
        if (agentTypeKey) {
          foundAgentType = AgentType[agentTypeKey];
        } else {
          // Tenta corresponder com nomes de agentes de forma mais flexível
          for (const [key, value] of Object.entries(AgentType)) {
            if (value.includes(agentTypeString) || agentTypeString.includes(value)) {
              foundAgentType = value as AgentType;
              break;
            }
          }
          
          // Se não encontrou, tenta corresponder com o nome formatado do agente
          if (!foundAgentType) {
            for (const [key, value] of Object.entries(AgentType)) {
              const formattedName = this.formatAgentType(value as AgentType).toLowerCase();
              if (formattedName.includes(agentTypeString) || agentTypeString.includes(formattedName)) {
                foundAgentType = value as AgentType;
                break;
              }
            }
          }
        }
        
        if (foundAgentType) {
          steps.push({ 
            description, 
            agent: foundAgentType 
          });
        }
      }
      
      // Se encontrou pelo menos um passo, para de procurar com outros padrões
      if (steps.length > 0) {
        break;
      }
    }
    
    return steps;
  }
  
  /**
   * Lida com uma falha em uma etapa
   */
  private async handleStepFailure(taskId: string, stepId: string): Promise<void> {
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Tarefa não encontrada: ${taskId}`);
    }
    
    const stepIndex = task.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) {
      throw new Error(`Etapa não encontrada: ${stepId}`);
    }
    
    const step = task.steps[stepIndex];
    
    // Verifica se é a última etapa
    const isLastStep = stepIndex === task.steps.length - 1;
    
    if (isLastStep) {
      // Se for a última etapa, adiciona uma etapa com o coordenador para lidar com a falha
      await this.addTaskStep(taskId, {
        id: uuidv4(),
        description: 'Lidar com falha e determinar abordagem alternativa',
        agent: AgentType.COORDINATOR,
        state: TaskState.PENDING,
        messages: []
      });
      
      // Processa a nova etapa
      const newStep = task.steps[task.steps.length - 1];
      await this.processTaskStep(taskId, newStep.id);
    } else {
      // Se não for a última etapa, verifica se alguma etapa subsequente pode ser executada
      const nextStep = task.steps[stepIndex + 1];
      
      if (nextStep.state === TaskState.PENDING) {
        // Processa a próxima etapa
        await this.processTaskStep(taskId, nextStep.id);
      } else {
        // Se não houver próxima etapa pendente, marca a tarefa como falha
        const oldState = task.state;
        task.state = TaskState.FAILED;
        task.error = `Falha na etapa: ${step.description}`;
        task.updatedAt = new Date().toISOString();
        
        this.tasks.set(taskId, task);
        
        // Emite evento de falha na tarefa
        this.events.emit('task:failed', task);
        
        // Notifica a falha via Slack
        this.notifyTaskStateChange(task, oldState, TaskState.FAILED);
      }
    }
  }
  
  /**
   * Obtém uma tarefa pelo ID
   */
  public getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }
  
  /**
   * Obtém todas as tarefas
   */
  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * Se inscreve em eventos do sistema multi-agente
   */
  public subscribe(event: string, callback: (...args: any[]) => void): void {
    this.events.on(event, callback);
  }
  
  /**
   * Cancela inscrição em eventos
   */
  public unsubscribe(event: string, callback: (...args: any[]) => void): void {
    this.events.off(event, callback);
  }
  
  /**
   * Ativa ou desativa o modo intensivo de comunicação entre agentes
   * @param enabled Define se o modo intensivo deve ser ativado ou desativado
   * @param options Opções para o modo intensivo (opcional)
   * @returns Status atual do modo intensivo após a alteração
   */
  public toggleIntensiveMode(enabled: boolean, options?: Partial<IntensiveAgentOptions>): boolean {
    this.intensiveModeEnabled = enabled;
    
    // Atualiza as opções se fornecidas
    if (options) {
      this.intensiveModeOptions = {
        ...this.intensiveModeOptions,
        ...options
      };
    }
    
    console.log(`Modo MULTIAGENTE INTENSIVO ${enabled ? 'ativado' : 'desativado'} com opções:`, this.intensiveModeOptions);
    
    // Notifica a mudança via Slack
    if (slackService.isSlackConfigured()) {
      slackService.sendNotification(
        `🔄 Modo MULTIAGENTE INTENSIVO ${enabled ? 'ativado' : 'desativado'} com ${this.intensiveModeOptions.maxRounds} rodadas máximas de interação.`
      ).catch(err => console.error("Erro ao enviar notificação Slack:", err));
    }
    
    return this.intensiveModeEnabled;
  }
  
  /**
   * Verifica se o modo intensivo está ativado
   * @returns true se o modo intensivo estiver ativado, false caso contrário
   */
  public isIntensiveModeEnabled(): boolean {
    return this.intensiveModeEnabled;
  }
  
  /**
   * Obtém as opções do modo intensivo
   * @returns Opções atuais do modo intensivo
   */
  public getIntensiveModeOptions(): IntensiveAgentOptions {
    return { ...this.intensiveModeOptions };
  }
  
  /**
   * Obtém o status detalhado do modo intensivo com informações em tempo real
   * @returns Status detalhado do modo intensivo
   */
  public getIntensiveModeStatus(): any {
    // Obtém informações básicas sobre o modo intensivo
    const status = {
      enabled: this.intensiveModeEnabled,
      options: this.getIntensiveModeOptions(),
      activeTasks: [] as any[],
      logs: [] as string[],
      stats: {
        totalCycles: 0,
        completedCycles: 0,
        pendingCycles: 0,
        failedCycles: 0,
        averageTimePerCycle: 0,
        currentCycleStartTime: null as string | null,
        estimatedCompletion: null as string | null
      },
      lastUpdate: new Date().toISOString(),
    };
    
    // Verifica se há um dispatcher ativo
    if (this.intensiveDispatcher) {
      try {
        // Obtém informações do dispatcher
        const dispatcherStatus = this.intensiveDispatcher.getStatus();
        
        // Adiciona logs do dispatcher
        status.logs = dispatcherStatus.logs || [];
        
        // Adiciona informações sobre ciclos e progresso
        status.stats.totalCycles = dispatcherStatus.totalCycles || 0;
        status.stats.completedCycles = dispatcherStatus.completedCycles || 0;
        status.stats.pendingCycles = status.stats.totalCycles - status.stats.completedCycles;
        status.stats.failedCycles = dispatcherStatus.failedCycles || 0;
        status.stats.averageTimePerCycle = dispatcherStatus.averageTimePerCycle || 0;
        status.stats.currentCycleStartTime = dispatcherStatus.currentCycleStartTime || null;
        
        // Calcula estimativa de conclusão
        if (status.stats.averageTimePerCycle > 0 && status.stats.pendingCycles > 0) {
          const estimatedRemainingMs = status.stats.averageTimePerCycle * status.stats.pendingCycles;
          const estimatedCompletion = new Date(Date.now() + estimatedRemainingMs);
          status.stats.estimatedCompletion = estimatedCompletion.toISOString();
        }
        
        // Adiciona histórico de atividades
        status.history = dispatcherStatus.history || [];
        
        // Adiciona tarefas ativas
        if (dispatcherStatus.currentTaskId) {
          const task = this.getTask(dispatcherStatus.currentTaskId);
          if (task) {
            status.activeTasks.push({
              id: task.id,
              title: task.title,
              state: task.state,
              currentStep: task.steps.find(s => s.state === 'in_progress' || s.state === 'awaiting_user_input')
            });
          }
        }
      } catch (error) {
        console.error('Erro ao obter status do dispatcher intensivo:', error);
        status.logs.push(`Erro ao obter status detalhado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    return status;
  }
  
  /**
   * Formata o tipo de agente para exibição
   */
  private formatAgentType(agentType: AgentType): string {
    return agentDefinitions[agentType]?.name || agentType;
  }
  
  /**
   * Formata o tipo de negócio para exibição
   */
  private formatBusinessType(businessType: string): string {
    switch (businessType) {
      case 'transport':
        return 'Empresa de Transporte';
      case 'farm':
        return 'Fazenda / Agronegócio';
      case 'both':
        return 'Transporte e Agronegócio';
      case 'personal':
        return 'Desenvolvimento Pessoal';
      default:
        return businessType;
    }
  }
  
  /**
   * Processa uma tarefa no modo intensivo, permitindo comunicação autônoma entre agentes
   * @param taskId ID da tarefa a ser processada em modo intensivo
   */
  private async processTaskInIntensiveMode(taskId: string): Promise<void> {
    // Importa o dispatcher para o modo intensivo
    const { createIntensiveDispatcher } = await import('./intensive-dispatcher');
    
    // Verifica se o modo intensivo está habilitado
    if (!this.intensiveModeEnabled) {
      console.log('Modo intensivo não está habilitado. Ignorando processamento.');
      return;
    }
    
    console.log(`Processando tarefa ${taskId} em modo MULTIAGENTE INTENSIVO`);
    
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`Tarefa ${taskId} não encontrada`);
      return;
    }
    
    // Verifica se a tarefa não está em progresso ou já foi concluída
    if (task.state === TaskState.COMPLETED || task.state === TaskState.FAILED) {
      console.log(`Tarefa ${taskId} já está ${task.state}. Ignorando processamento.`);
      return;
    }
    
    try {
      // Atualiza o estado da tarefa para em progresso
      const oldState = task.state;
      task.state = TaskState.IN_PROGRESS;
      task.updatedAt = new Date().toISOString();
      this.tasks.set(taskId, task);
      
      // Emite evento de atualização
      this.events.emit('task:updated', task);
      
      // Notifica via Slack se configurado
      this.notifyTaskStateChange(task, oldState, TaskState.IN_PROGRESS);
      
      // Cria uma nova etapa para a tarefa se não existir
      let stepId = '';
      if (!task.steps || task.steps.length === 0) {
        // Cria uma nova etapa para o modo intensivo
        const newStep: TaskStep = {
          id: uuidv4(),
          description: 'Processamento em modo MULTIAGENTE INTENSIVO',
          agent: AgentType.COORDINATOR,
          state: 'in_progress',
          messages: [],
          startTime: new Date().toISOString(),
        };
        
        stepId = newStep.id;
        task.steps = [newStep];
        this.tasks.set(taskId, task);
      } else {
        // Usa a primeira etapa disponível
        stepId = task.steps[0].id;
      }
      
      // Prepara o contexto inicial para o dispatcher
      const initialContext = `
        TAREFA: ${task.title}
        DESCRIÇÃO: ${task.description}
        CONTEXTO: ${task.context.additionalContext || 'Nenhum contexto adicional fornecido'}
        TIPO DE NEGÓCIO: ${this.formatBusinessType(task.context.businessType || 'both')}
        
        Esta tarefa será processada no modo MULTIAGENTE INTENSIVO, que permite uma colaboração mais profunda entre múltiplos agentes especializados.
        
        Cada agente contribuirá com sua especialidade para resolver esta tarefa de forma colaborativa.
      `;
      
      // Cria e configura o dispatcher para o modo intensivo
      this.intensiveDispatcher = createIntensiveDispatcher({
        maxCycles: this.intensiveModeOptions.maxRounds,
        timeout: this.intensiveModeOptions.timeout,
        notifyOnProgress: this.intensiveModeOptions.notifyOnProgress,
        agents: task.requiredAgents.length > 0 ? task.requiredAgents : [
          AgentType.COORDINATOR,
          AgentType.RESEARCHER,
          AgentType.ANALYST,
          AgentType.ADVISOR,
          AgentType.SUMMARIZER
        ]
      });
      
      console.log(`Iniciando dispatcher com ${this.intensiveModeOptions.maxRounds} ciclos máximos`);
      
      // Executa o dispatcher
      const result = await this.intensiveDispatcher.start(task, stepId, initialContext);
      
      // Limpa a referência ao dispatcher
      const dispatcher = this.intensiveDispatcher;
      this.intensiveDispatcher = null;
      
      // Atualiza a tarefa com o resultado
      const taskUpdate = this.tasks.get(taskId);
      if (taskUpdate) {
        // Adiciona o resultado à tarefa
        taskUpdate.result = result;
        
        // Atualiza a etapa
        if (taskUpdate.steps && taskUpdate.steps.length > 0) {
          const step = taskUpdate.steps.find(s => s.id === stepId);
          if (step) {
            step.state = 'completed';
            step.result = result;
            step.endTime = new Date().toISOString();
            
            // Adiciona as mensagens do histórico do dispatcher
            if (dispatcher) {
              const history = dispatcher.getHistory();
              for (const item of history) {
                step.messages.push({
                  id: uuidv4(),
                  from: item.agentType,
                  to: 'user',
                  content: item.content,
                  timestamp: item.timestamp
                });
              }
            }
          }
        }
        
        // Atualiza o estado da tarefa
        const oldState = taskUpdate.state;
        taskUpdate.state = TaskState.COMPLETED;
        taskUpdate.completedAt = new Date().toISOString();
        taskUpdate.updatedAt = new Date().toISOString();
        
        // Salva as alterações
        this.tasks.set(taskId, taskUpdate);
        
        // Emite evento de tarefa concluída
        this.events.emit('task:completed', taskUpdate);
        
        // Notifica via Slack
        this.notifyTaskStateChange(taskUpdate, oldState, TaskState.COMPLETED);
        
        console.log(`Tarefa ${taskId} concluída com sucesso no modo MULTIAGENTE INTENSIVO`);
      }
    } catch (error) {
      console.error(`Erro ao processar tarefa ${taskId} em modo intensivo:`, error);
      const task = this.tasks.get(taskId);
      
      if (task) {
        const oldState = task.state;
        task.state = TaskState.FAILED;
        task.error = `Falha no processamento em modo intensivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        task.updatedAt = new Date().toISOString();
        
        // Salva as alterações
        this.tasks.set(taskId, task);
        
        // Emite evento de falha
        this.events.emit('task:failed', task);
        
        // Notifica via Slack
        this.notifyTaskStateChange(task, oldState, TaskState.FAILED);
      }
    }
  }
  
  /**
   * Realiza um diagnóstico completo do sistema e gera um relatório
   * @returns Relatório com diagnóstico detalhado do sistema
   */
  public async diagnoseSystem(): Promise<any> {
    console.log('Iniciando diagnóstico completo do sistema...');
    
    // Coleta informações sobre o estado do sistema
    const report = {
      timeStamp: new Date().toISOString(),
      systemState: {
        intensiveModeEnabled: this.intensiveModeEnabled,
        hasActiveDispatcher: !!this.intensiveDispatcher,
        taskCount: this.tasks.size,
        pendingTasks: [...this.tasks.values()].filter(t => t.state === TaskState.PENDING).length,
        activeTasks: [...this.tasks.values()].filter(t => t.state === TaskState.IN_PROGRESS).length,
        completedTasks: [...this.tasks.values()].filter(t => t.state === TaskState.COMPLETED).length,
        failedTasks: [...this.tasks.values()].filter(t => t.state === TaskState.FAILED).length,
      },
      activeDispatcherStatus: null,
      errors: [] as string[],
      activeAgents: [],
      lastExecutions: [] as any[],
      pendingTasksList: [] as any[]
    };
    
    // Adiciona informações sobre o dispatcher se estiver ativo
    if (this.intensiveDispatcher) {
      try {
        report.activeDispatcherStatus = this.intensiveDispatcher.getStatus();
      } catch (error) {
        report.errors.push(`Erro ao obter status do dispatcher: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    }
    
    // Coleta informações sobre tarefas pendentes
    const pendingTasks = [...this.tasks.values()].filter(t => t.state === TaskState.PENDING);
    report.pendingTasksList = pendingTasks.map(t => ({
      id: t.id,
      title: t.title,
      createdAt: t.createdAt,
      requiredAgents: t.requiredAgents
    }));
    
    // Coleta informações sobre erros em tarefas com falha
    const failedTasks = [...this.tasks.values()].filter(t => t.state === TaskState.FAILED);
    for (const task of failedTasks) {
      if (task.error) {
        report.errors.push(`Erro na tarefa ${task.id} (${task.title}): ${task.error}`);
      }
    }
    
    console.log('Diagnóstico do sistema completado');
    return report;
  }
  
  /**
   * Reinicia o loop de execução sem perder o estado do sistema
   * @returns Resultado da operação de reinicialização
   */
  public async resetExecutionLoop(): Promise<{success: boolean, message: string}> {
    console.log('Reiniciando loop de execução do sistema...');
    
    try {
      // Verifica se há um dispatcher ativo
      if (this.intensiveDispatcher) {
        console.log('Interrompendo dispatcher atual...');
        // Força a parada do dispatcher atual
        await this.intensiveDispatcher.stop();
        // Limpa a referência
        this.intensiveDispatcher = null;
      }
      
      // Libera tarefas travadas
      let taskCount = 0;
      for (const task of this.tasks.values()) {
        if (task.state === TaskState.IN_PROGRESS) {
          // Volta a tarefa para o estado pendente para ser reprocessada
          const oldState = task.state;
          task.state = TaskState.PENDING;
          task.updatedAt = new Date().toISOString();
          
          // Adiciona uma mensagem de sistema
          if (task.steps && task.steps.length > 0) {
            const step = task.steps[0];
            step.messages.push({
              id: uuidv4(),
              content: 'Sistema reiniciado após travamento. Retomando execução...',
              from: AgentType.COORDINATOR,
              to: 'user',
              timestamp: new Date().toISOString()
            });
          }
          
          this.tasks.set(task.id, task);
          
          // Notifica a alteração
          this.events.emit('task:updated', task);
          this.notifyTaskStateChange(task, oldState, TaskState.PENDING);
          
          taskCount++;
        }
      }
      
      console.log(`Reinicialização concluída. ${taskCount} tarefas liberadas.`);
      return {
        success: true,
        message: `Loop de execução reiniciado com sucesso. ${taskCount} tarefas foram liberadas e retornadas ao estado pendente.`
      };
    } catch (error) {
      console.error('Erro ao reiniciar loop de execução:', error);
      return {
        success: false,
        message: `Erro ao reiniciar loop de execução: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }
  
  /**
   * Executa uma rodada de comunicação intensiva entre agentes
   */
  private async executeIntensiveRound(taskId: string, context: any): Promise<void> {
    // Implementação a ser expandida
    // Esta função será responsável pela comunicação entre os agentes em uma rodada
    
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    // Atualiza o status da tarefa para refletir a rodada atual
    task.updatedAt = new Date().toISOString();
    if (task.result) {
      task.result += `\n\n[Rodada ${context.currentRound}/${context.maxRounds} do modo intensivo em andamento]`;
    } else {
      task.result = `[Rodada ${context.currentRound}/${context.maxRounds} do modo intensivo em andamento]`;
    }
    
    // Notifica progresso se configurado
    if (this.intensiveModeOptions.notifyOnProgress && context.currentRound === 1) {
      // Apenas notifica na primeira rodada para não sobrecarregar
      if (slackService.isSlackConfigured()) {
        slackService.sendNotification(
          `🔄 Iniciando processamento intensivo para tarefa "${task.title}" (${context.maxRounds} rodadas máximas)`
        ).catch(err => console.error("Erro ao enviar notificação Slack:", err));
      }
    }
    
    // Atualiza a tarefa
    this.tasks.set(taskId, task);
    
    // Emite evento de atualização
    this.events.emit('task:updated', task);
  }
  
  /**
   * Registra pontos de aprendizado obtidos durante o modo intensivo
   */
  private async registerIntensiveLearningPoints(taskId: string, learningPoints: string[]): Promise<void> {
    // Implementação a ser expandida
    // Esta função irá registrar os insights na base de conhecimento para uso futuro
    
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    console.log(`Registrando ${learningPoints.length} pontos de aprendizado da tarefa ${taskId}`);
    
    // Para cada ponto de aprendizado, registra na base de conhecimento
    for (const point of learningPoints) {
      const knowledgeId = uuidv4();
      
      // Determina quais agentes se beneficiam deste conhecimento
      const relevantAgents = task.requiredAgents;
      
      // Cria um novo recurso de conhecimento
      const newResource: KnowledgeResource = {
        id: knowledgeId,
        type: 'intensive_learning',
        title: `Aprendizado em modo intensivo: ${task.title}`,
        content: point,
        relevantDomains: relevantAgents,
        dateAdded: new Date().toISOString(),
        usageCount: 0,
        tags: ['intensive_mode', 'auto_learning', ...task.title.split(' ')],
        source: 'intensive_mode',
        summary: point.length > 100 ? `${point.substring(0, 100)}...` : point
      };
      
      // Adiciona o conhecimento à base
      this.knowledgeBase.set(knowledgeId, newResource);
      
      // Atualiza os perfis dos agentes envolvidos
      for (const agentType of relevantAgents) {
        const profile = this.agentLearningProfiles.get(agentType);
        if (profile) {
          profile.latestInsights.push(point.length > 150 ? `${point.substring(0, 150)}...` : point);
          if (profile.latestInsights.length > 10) {
            profile.latestInsights.shift(); // Mantém apenas os 10 mais recentes
          }
          
          profile.completedLearningTasks.push(`Aprendizado em modo intensivo (${task.id}) em ${new Date().toISOString()}`);
          
          this.agentLearningProfiles.set(agentType, profile);
        }
      }
    }
  }
  
  /**
   * Processa uma tarefa usando o orquestrador de agentes
   * @param taskId ID da tarefa
   * @returns true se o orquestrador foi iniciado com sucesso
   */
  public async processTaskWithOrchestrator(taskId: string): Promise<boolean> {
    try {
      // Verifica se a tarefa existe
      const task = this.getTask(taskId);
      if (!task) {
        throw new Error(`Tarefa não encontrada: ${taskId}`);
      }
      
      // Verifica se o orquestrador está disponível
      if (!this.agentOrchestrator) {
        throw new Error('Orquestrador de agentes não inicializado');
      }
      
      // Prepara o contexto da tarefa
      const context = `
      Tipo de Negócio: ${this.formatBusinessType(task.context.businessType || 'both')}
      ${task.context.additionalContext ? `Contexto adicional: ${task.context.additionalContext}` : ''}
      ${task.context.userMemory ? `Memória do usuário: ${task.context.userMemory}` : ''}
      `;
      
      // Atualiza o estado da tarefa
      task.state = TaskState.IN_PROGRESS;
      task.updatedAt = new Date().toISOString();
      
      // Emite evento de atualização
      this.events.emit('task:updated', task);
      
      // Configura as opções do orquestrador
      const options = {
        maxCycles: this.intensiveModeOptions.maxRounds,
        timeout: this.intensiveModeOptions.timeout,
        notifyOnProgress: this.intensiveModeOptions.notifyOnProgress,
        agents: task.requiredAgents.length > 0 
          ? task.requiredAgents.map(a => a.toString()) 
          : ['coordinator', 'researcher', 'analyst', 'advisor', 'summarizer'],
        autoCorrect: true,
        storeHistory: true,
        continueOnError: this.intensiveModeOptions.retryOnFailure
      };
      
      // Inicia o processamento com o orquestrador
      const started = await this.agentOrchestrator.start(
        taskId, 
        `${task.title}\n${task.description}\n${context}`,
        options
      );
      
      if (started) {
        console.log(`Tarefa ${taskId} iniciada com orquestrador de agentes`);
        
        // Notifica via Slack
        if (slackService.isSlackConfigured() && this.intensiveModeOptions.notifyOnProgress) {
          await slackService.sendTaskUpdate({
            id: taskId,
            title: task.title,
            description: `Tarefa iniciada com orquestrador de agentes autônomos`,
            state: "in_progress" as any,
            progress: 5
          }, 'started');
        }
      } else {
        console.error(`Falha ao iniciar tarefa ${taskId} com orquestrador`);
        task.state = TaskState.FAILED;
        task.error = 'Falha ao iniciar com orquestrador de agentes';
        task.updatedAt = new Date().toISOString();
        this.events.emit('task:updated', task);
      }
      
      return started;
    } catch (error) {
      console.error('Erro ao processar tarefa com orquestrador:', error);
      return false;
    }
  }
  
  /**
   * Obtém o estado atual do orquestrador de agentes
   * @returns Estado do orquestrador ou null se não estiver disponível
   */
  public getOrchestratorState(): any {
    if (!this.agentOrchestrator) {
      return null;
    }
    
    try {
      return this.agentOrchestrator.getState();
    } catch (error) {
      console.error('Erro ao obter estado do orquestrador:', error);
      return null;
    }
  }
  
  /**
   * Interrompe o orquestrador de agentes para uma determinada tarefa
   * @param taskId ID da tarefa
   * @returns true se a interrupção foi bem-sucedida
   */
  public stopOrchestrator(): boolean {
    if (!this.agentOrchestrator) {
      return false;
    }
    
    try {
      this.agentOrchestrator.stop();
      return true;
    } catch (error) {
      console.error('Erro ao parar orquestrador:', error);
      return false;
    }
  }
  
  /**
   * Emite um evento para o barramento de eventos do sistema
   * @param eventName Nome do evento
   * @param data Dados do evento
   */
  public emitEvent(eventName: string, data: any): void {
    this.events.emit(eventName, data);
  }
  
  /**
   * Realiza uma atualização de estado na tarefa
   * @param taskId ID da tarefa
   * @param stateUpdate Dados para atualização
   * @returns Tarefa atualizada ou undefined se não encontrada
   */
  public async updateTaskState(
    taskId: string, 
    stateUpdate: { state?: TaskState; result?: string; error?: string }
  ): Promise<Task | undefined> {
    const task = this.getTask(taskId);
    if (!task) {
      return undefined;
    }
    
    // Atualiza o estado da tarefa
    if (stateUpdate.state) {
      task.state = stateUpdate.state;
    }
    
    // Atualiza o resultado
    if (stateUpdate.result) {
      task.result = stateUpdate.result;
    }
    
    // Atualiza o erro
    if (stateUpdate.error) {
      task.error = stateUpdate.error;
    }
    
    // Atualiza a data
    task.updatedAt = new Date().toISOString();
    
    // Se a tarefa foi concluída, registra a data de conclusão
    if (task.state === TaskState.COMPLETED && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }
    
    // Emite evento de atualização
    this.events.emit('task:updated', task);
    
    return task;
  }
}

// Instância singleton do sistema multi-agente
let multiAgentSystemInstance: MultiAgentSystem | null = null;

/**
 * Obtém a instância singleton do sistema multi-agente
 */
export function getMultiAgentSystem(): MultiAgentSystem {
  if (!multiAgentSystemInstance) {
    multiAgentSystemInstance = new MultiAgentSystem();
  }
  
  return multiAgentSystemInstance;
}

/**
 * Reset da instância (útil para testes)
 */
export function resetMultiAgentSystem(): void {
  multiAgentSystemInstance = null;
}