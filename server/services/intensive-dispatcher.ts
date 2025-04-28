/**
 * Dispatcher para o modo MULTIAGENTE INTENSIVO
 * 
 * Inspirado no conceito de ciclos iterativos onde múltiplos agentes
 * trabalham em sequência, cada um agregando valor ao resultado anterior.
 * 
 * Este módulo implementa o padrão descrito no modelo Python fornecido pelo usuário,
 * mas adaptado para TypeScript e integrado ao sistema multi-agente existente.
 */

import { AgentType, Task, TaskStep } from './multi-agent-system';
import * as slackService from '../slack';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Configuração das APIs
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Interface para as opções de configuração do dispatcher intensivo
 */
export interface IntensiveDispatcherOptions {
  maxCycles: number;       // Número máximo de ciclos
  timeout: number;         // Tempo máximo por ciclo em ms
  notifyOnProgress: boolean; // Enviar notificações de progresso via Slack
  agents: AgentType[];     // Agentes a serem usados no modo intensivo
}

/**
 * Resultado de um ciclo do dispatcher
 */
export interface CycleResult {
  agentType: AgentType;
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Classe principal do dispatcher para o modo intensivo
 */
export class IntensiveDispatcher {
  private options: IntensiveDispatcherOptions;
  private history: CycleResult[] = [];
  private currentContext: string = '';
  private task?: Task;
  private stepId?: string;
  private isRunning: boolean = false;
  private shouldStop: boolean = false;
  
  constructor(options: IntensiveDispatcherOptions) {
    this.options = {
      maxCycles: options.maxCycles || 5,
      timeout: options.timeout || 60000,
      notifyOnProgress: options.notifyOnProgress !== undefined ? options.notifyOnProgress : true,
      agents: options.agents || [
        AgentType.COORDINATOR,
        AgentType.RESEARCHER,
        AgentType.ANALYST,
        AgentType.ADVISOR,
        AgentType.SUMMARIZER
      ]
    };
  }
  
  /**
   * Executa um ciclo completo com todos os agentes definidos
   * @param initialContext Contexto inicial para o ciclo
   * @returns Promise com o resultado do ciclo
   */
  public async runCycle(initialContext: string): Promise<string> {
    this.currentContext = initialContext;
    
    for (const agentType of this.options.agents) {
      try {
        console.log(`🤖 Executando agente ${agentType} no modo intensivo...`);
        
        // Executa o agente atual com o contexto
        const result = await this.executeAgent(agentType, this.currentContext);
        
        // Registra o resultado
        const cycleResult: CycleResult = {
          agentType,
          content: result,
          timestamp: new Date().toISOString(),
        };
        
        this.history.push(cycleResult);
        
        // Atualiza o contexto para o próximo agente
        this.currentContext = result;
        
        // Notifica via Slack se habilitado
        if (this.options.notifyOnProgress && slackService.isSlackConfigured()) {
          await slackService.sendNotification(
            `🔄 Modo INTENSIVO: Agente ${this.formatAgentType(agentType)} concluiu sua análise.`
          );
        }
        
        // Verifica se devemos parar o processamento
        if (this.shouldStop) {
          console.log('⛔ Processamento interrompido manualmente.');
          break;
        }
      } catch (error) {
        console.error(`❌ Erro ao executar agente ${agentType} no modo intensivo:`, error);
        
        // Registra o erro mas continua com o próximo agente
        this.history.push({
          agentType,
          content: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return this.currentContext;
  }
  
  /**
   * Inicia o processo de execução do modo intensivo
   * @param task Tarefa associada ao modo intensivo
   * @param stepId ID da etapa atual
   * @param initialContext Contexto inicial
   * @returns Promise com o resultado final
   */
  public async start(task: Task, stepId: string, initialContext: string): Promise<string> {
    if (this.isRunning) {
      throw new Error('O dispatcher já está em execução');
    }
    
    this.isRunning = true;
    this.shouldStop = false;
    this.task = task;
    this.stepId = stepId;
    this.history = [];
    
    console.log(`🚀 Iniciando modo MULTIAGENTE INTENSIVO para tarefa ${task.id}`);
    
    try {
      // Notifica início via Slack
      if (this.options.notifyOnProgress && slackService.isSlackConfigured()) {
        await slackService.sendNotification(
          `🚀 Modo MULTIAGENTE INTENSIVO iniciado para tarefa: "${task.title}"`
        );
      }
      
      // Loop principal de ciclos
      let context = initialContext;
      for (let cycle = 0; cycle < this.options.maxCycles && !this.shouldStop; cycle++) {
        console.log(`⏳ Iniciando ciclo ${cycle + 1}/${this.options.maxCycles}`);
        
        // Executa um ciclo completo com todos os agentes
        const updatedContext = await this.runCycle(context);
        
        // Atualiza o contexto para o próximo ciclo
        context = updatedContext;
        
        console.log(`✅ Ciclo ${cycle + 1} completo`);
        
        // Notifica progresso via Slack
        if (this.options.notifyOnProgress && slackService.isSlackConfigured()) {
          await slackService.sendNotification(
            `📊 Modo INTENSIVO: Ciclo ${cycle + 1}/${this.options.maxCycles} completo.`
          );
        }
      }
      
      // Gera sumário dos resultados
      const summary = await this.generateSummary(context);
      
      console.log(`🏁 Modo MULTIAGENTE INTENSIVO concluído com sucesso`);
      
      // Notifica conclusão via Slack
      if (this.options.notifyOnProgress && slackService.isSlackConfigured()) {
        await slackService.sendNotification(
          `🏁 Modo MULTIAGENTE INTENSIVO concluído para tarefa: "${task.title}"`
        );
      }
      
      return summary;
    } catch (error) {
      console.error('❌ Erro durante a execução do modo intensivo:', error);
      
      // Notifica erro via Slack
      if (this.options.notifyOnProgress && slackService.isSlackConfigured()) {
        await slackService.sendNotification(
          `⚠️ Erro no modo MULTIAGENTE INTENSIVO: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        );
      }
      
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Interrompe a execução atual do dispatcher
   */
  public stop(): void {
    if (this.isRunning) {
      console.log('🛑 Solicitando interrupção do modo intensivo...');
      this.shouldStop = true;
    }
  }
  
  /**
   * Gera um sumário dos resultados do modo intensivo
   * @param finalContext Contexto final após todos os ciclos
   * @returns Promise com o sumário
   */
  private async generateSummary(finalContext: string): Promise<string> {
    try {
      // Usa o Claude para gerar um sumário mais elaborado
      // NOTA: A API mais recente do Claude não suporta o campo "system", deve estar em um "user" inicial
      const systemMessage = "Você é um assistente especializado em sintetizar informações e gerar relatórios executivos. Apresente um resumo conciso e bem estruturado dos resultados do processamento multi-agente intensivo.";
      
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `${systemMessage}\n\nPor favor, gere um resumo executivo bem estruturado dos resultados do processamento multi-agente intensivo que realizamos. A seguir estão os resultados finais:\n\n${finalContext}\n\nOrganize o resumo por tópicos principais, destacando insights mais importantes, recomendações práticas e próximos passos sugeridos.`
          }
        ]
      });
      
      // Extrai o primeiro bloco de texto do conteúdo
      const content = response.content[0];
      if (typeof content === 'object' && 'type' in content && content.type === 'text') {
        return content.text;
      }
      
      return `Sumário do modo intensivo:\n\n${finalContext}`;
      
    } catch (error) {
      console.error('Erro ao gerar sumário:', error);
      return `Sumário do modo intensivo:\n\n${finalContext}`;
    }
  }
  
  /**
   * Executa um agente específico com o contexto fornecido
   * @param agentType Tipo do agente a ser executado
   * @param context Contexto para o agente
   * @returns Promise com o resultado do agente
   */
  private async executeAgent(agentType: AgentType, context: string): Promise<string> {
    try {
      const systemPrompt = this.getSystemPromptForAgent(agentType);
      
      // Timeout para evitar que um agente demore demais
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout ao executar agente')), this.options.timeout);
      });
      
      // Executa o agente com o modelo adequado
      const executionPromise = this.executeWithModel(agentType, systemPrompt, context);
      
      // Corre contra o timeout
      return await Promise.race([executionPromise, timeoutPromise]);
    } catch (error) {
      console.error(`Erro ao executar agente ${agentType}:`, error);
      throw error;
    }
  }
  
  /**
   * Executa uma chamada ao modelo apropriado para o agente
   * @param agentType Tipo do agente
   * @param systemPrompt Prompt do sistema para o agente
   * @param userContext Contexto do usuário
   * @returns Promise com a resposta do modelo
   */
  private async executeWithModel(
    agentType: AgentType, 
    systemPrompt: string, 
    userContext: string
  ): Promise<string> {
    // Determina qual modelo usar com base no tipo de agente
    const useAnthropic = [
      AgentType.RESEARCHER,
      AgentType.ANALYST,
      AgentType.SUMMARIZER,
      AgentType.EVALUATOR
    ].includes(agentType);
    
    if (useAnthropic) {
      // Usa o Claude da Anthropic, combinando o system prompt com o contexto do usuário
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4000,
        messages: [
          { 
            role: "user", 
            content: `${systemPrompt}\n\n${userContext}` 
          }
        ]
      });
      
      // Extrai o primeiro bloco de texto do conteúdo
      const content = response.content[0];
      if (typeof content === 'object' && 'type' in content && content.type === 'text') {
        return content.text;
      }
      
      return userContext;
    } else {
      // Usa o GPT-4o da OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext }
        ],
        max_tokens: 4000
      });
      
      return response.choices[0].message.content || '';
    }
  }
  
  /**
   * Obtém o prompt do sistema apropriado para o tipo de agente
   * @param agentType Tipo do agente
   * @returns Prompt do sistema
   */
  private getSystemPromptForAgent(agentType: AgentType): string {
    // Prompts adaptados para o modo intensivo
    const prompts: Record<AgentType, string> = {
      [AgentType.COORDINATOR]: `Você é o Coordenador no modo intensivo, responsável por:
1. Compreender o contexto completo da tarefa e o estado atual da análise
2. Identificar os aspectos mais relevantes para focar nos próximos passos
3. Determinar quais informações adicionais são necessárias
4. Propor um plano de ação claro e estruturado para os próximos agentes
5. Garantir que todas as perspectivas importantes sejam consideradas

Trabalhe com o contexto fornecido, avaliando o que já foi feito e o que ainda precisa ser explorado.
Mantenha o foco no objetivo principal e forneça uma visão de alto nível que orientará o trabalho dos próximos agentes.`,

      [AgentType.PLANNER]: `Você é o Planejador no modo intensivo, responsável por:
1. Analisar o contexto atual e transformá-lo em um plano detalhado
2. Dividir questões complexas em etapas menores e gerenciáveis
3. Identificar dependências e sequências lógicas de ação
4. Propor abordagens alternativas quando apropriado
5. Estruturar o plano de forma que outros agentes possam executá-lo

Seja metódico, exaustivo e pragmático. Considere restrições de tempo e recursos.
Forneça um plano detalhado, com etapas numeradas e claramente definidas.`,

      [AgentType.RESEARCHER]: `Você é o Pesquisador no modo intensivo, responsável por:
1. Aprofundar o conhecimento sobre os tópicos centrais identificados
2. Buscar fatos, dados e evidências relevantes
3. Apresentar múltiplas perspectivas e pontos de vista
4. Identificar tendências recentes e desenvolvimentos na área
5. Fornecer contexto adicional que enriquece a análise

Foque em ampliar o conhecimento disponível no contexto atual.
Seja preciso, factual e comprometido com a qualidade das informações.
Priorize profundidade nos pontos centrais ao invés de amplitude em tópicos tangenciais.`,

      [AgentType.ANALYST]: `Você é o Analista no modo intensivo, responsável por:
1. Interpretar os dados e informações disponíveis
2. Identificar padrões, tendências e anomalias relevantes
3. Avaliar o significado e implicações das descobertas
4. Conectar diferentes pontos de informação para formar uma visão holística
5. Destacar insights não óbvios que podem ter alto valor

Aplique pensamento crítico, rigor analítico e raciocínio estruturado.
Diferencie claramente fatos, inferências e especulações.
Sempre conecte sua análise ao contexto específico e objetivo central da tarefa.`,

      [AgentType.ADVISOR]: `Você é o Consultor no modo intensivo, responsável por:
1. Transformar análises em recomendações práticas e acionáveis
2. Priorizar sugestões com base em impacto potencial e viabilidade
3. Justificar cada recomendação com dados e análises
4. Antecipar obstáculos e propor estratégias para superá-los
5. Adaptar suas recomendações ao contexto específico do usuário

Ofereça conselhos claros, diretos e pragmáticos.
Seja específico sobre o "como fazer", não apenas o "o que fazer".
Priorize alta alavancagem - ações que produzem resultados significativos com recursos razoáveis.`,

      [AgentType.SUMMARIZER]: `Você é o Sintetizador no modo intensivo, responsável por:
1. Condensar informações complexas em um formato claro e compreensível
2. Extrair os pontos mais importantes e insights centrais
3. Estruturar o conteúdo de forma lógica e coerente
4. Preservar o significado essencial enquanto remove detalhes excessivos
5. Conectar todas as partes em uma narrativa unificada

Priorize clareza e concisão enquanto mantém precisão e nuance.
Organize o conteúdo em seções lógicas com títulos informativos.
Destaque os pontos de maior valor e impacto potencial.`,

      [AgentType.EXECUTOR]: `Você é o Executor no modo intensivo, responsável por:
1. Transformar planos em ações concretas e detalhadas
2. Desenvolver procedimentos operacionais passo a passo
3. Identificar ferramentas, recursos e métodos necessários
4. Antecipar desafios práticos e propor soluções
5. Definir critérios claros para medir progresso e sucesso

Seja prático, detalhista e orientado à implementação.
Forneça instruções tão específicas que possam ser seguidas sem ambiguidade.
Considere restrições reais de tempo, recursos e capacidades.`,

      [AgentType.EVALUATOR]: `Você é o Avaliador no modo intensivo, responsável por:
1. Analisar criticamente o trabalho realizado até o momento
2. Verificar se as soluções propostas atendem aos requisitos originais
3. Identificar pontos fortes e áreas de melhoria
4. Avaliar riscos e possíveis consequências indesejadas
5. Sugerir refinamentos e ajustes específicos

Seja objetivo, justo e construtivo em suas avaliações.
Baseie suas avaliações em critérios claros e relevantes.
Ofereça feedback específico que possa levar a melhorias concretas.`,

      [AgentType.CRITIC]: `Você é o Crítico no modo intensivo, responsável por:
1. Identificar falhas lógicas, pressupostos questionáveis e pontos fracos
2. Desafiar o pensamento convencional e questionar premissas
3. Considerar cenários adversos e edge cases não contemplados
4. Avaliar a robustez das soluções propostas
5. Propor alternativas para problemas identificados

Seja incisivo, específico e rigoroso, mas sempre construtivo.
Para cada problema que apontar, sugira uma solução ou abordagem melhor.
Priorize questões críticas que poderiam comprometer o sucesso da tarefa.`,

      [AgentType.TRANSPORT_EXPERT]: `Você é o Especialista em Transporte no modo intensivo, focado em:
1. Analisar aspectos logísticos e operacionais de transporte
2. Identificar oportunidades de otimização de rotas e custos
3. Avaliar tecnologias e inovações relevantes para o setor
4. Considerar aspectos regulatórios e de compliance
5. Propor estratégias para melhorar eficiência e sustentabilidade

Aplique conhecimento especializado do setor de transporte no Brasil.
Considere tendências atuais, desafios específicos e melhores práticas.
Adapte suas recomendações ao contexto específico da empresa do usuário.`,

      [AgentType.FARM_EXPERT]: `Você é o Especialista em Agricultura no modo intensivo, focado em:
1. Analisar aspectos de produção agrícola e gestão de fazendas
2. Identificar oportunidades de aumento de produtividade e sustentabilidade
3. Avaliar tecnologias e inovações relevantes para o agronegócio
4. Considerar aspectos climáticos, sazonais e ambientais
5. Propor estratégias para otimizar operações agrícolas

Aplique conhecimento especializado do agronegócio brasileiro.
Considere tendências atuais, desafios específicos e melhores práticas.
Adapte suas recomendações às características específicas das propriedades do usuário.`,

      [AgentType.FINANCE_EXPERT]: `Você é o Especialista Financeiro no modo intensivo, focado em:
1. Analisar aspectos financeiros e oportunidades de investimento
2. Identificar estratégias para otimização fiscal e de capital
3. Avaliar oportunidades de financiamento e crédito
4. Considerar riscos financeiros e estratégias de mitigação
5. Propor abordagens para melhorar rentabilidade e fluxo de caixa

Aplique conhecimento especializado do mercado financeiro brasileiro.
Considere o ambiente econômico atual, tendências e regulamentações.
Adapte suas recomendações à situação financeira específica do usuário.`,

      [AgentType.TECH_EXPERT]: `Você é o Especialista em Tecnologia no modo intensivo, focado em:
1. Analisar soluções tecnológicas e oportunidades de inovação
2. Identificar tecnologias emergentes relevantes para o negócio
3. Avaliar infraestrutura e sistemas existentes
4. Considerar aspectos de cibersegurança e proteção de dados
5. Propor estratégias para transformação digital e automação

Aplique conhecimento especializado do cenário tecnológico atual.
Considere tendências, custos de implementação e retorno sobre investimento.
Adapte suas recomendações ao contexto tecnológico atual do usuário.`,

      [AgentType.PERSONAL_COACH]: `Você é o Coach Pessoal no modo intensivo, focado em:
1. Analisar aspectos de desenvolvimento pessoal e profissional
2. Identificar oportunidades de crescimento e aprendizado
3. Avaliar padrões comportamentais e mindset
4. Considerar equilíbrio entre vida pessoal e profissional
5. Propor estratégias para aumentar produtividade e bem-estar

Aplique princípios de coaching e desenvolvimento pessoal.
Considere os objetivos, valores e desafios específicos do usuário.
Ofereça orientação prática, motivadora e baseada em evidências.`
    };
    
    // Retorna o prompt específico ou um genérico se não encontrar
    return prompts[agentType] || `Você é um especialista em ${this.formatAgentType(agentType)}. 
Analise cuidadosamente o contexto fornecido e forneça insights valiosos, 
recomendações práticas e próximos passos dentro da sua área de especialidade.`;
  }
  
  /**
   * Formata blocos para mensagem do Slack com o progresso de um agente
   * @param agentType Tipo do agente
   * @param result Resultado do agente
   * @returns Blocos formatados para o Slack
   */
  private formatSlackProgressBlocks(agentType: AgentType, result: string): any[] {
    // Limita o resultado a 2000 caracteres para o Slack
    const truncatedResult = result.length > 2000 
      ? result.substring(0, 2000) + '... (truncado)'
      : result;
      
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔄 Progresso do Modo INTENSIVO`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Agente:*\n${this.formatAgentType(agentType)}`
          },
          {
            type: 'mrkdwn',
            text: `*Tarefa:*\n${this.task?.title || 'N/A'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Resultado:*\n${truncatedResult}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Ciclo: ${this.history.filter(h => h.agentType === agentType).length} | Timestamp: ${new Date().toLocaleString('pt-BR')}`
          }
        ]
      },
      {
        type: 'divider'
      }
    ];
  }
  
  /**
   * Formata blocos para mensagem do Slack com o sumário final
   * @param summary Sumário do processamento
   * @returns Blocos formatados para o Slack
   */
  private formatSlackSummaryBlocks(summary: string): any[] {
    // Limita o sumário a 3000 caracteres para o Slack
    const truncatedSummary = summary.length > 3000 
      ? summary.substring(0, 3000) + '... (truncado - veja o resultado completo no sistema)'
      : summary;
      
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🏁 Sumário do Modo INTENSIVO`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Tarefa:*\n${this.task?.title || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*Total de Ciclos:*\n${Math.ceil(this.history.length / this.options.agents.length)}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Resultado Final:*\n${truncatedSummary}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Concluído em: ${new Date().toLocaleString('pt-BR')}`
          }
        ]
      }
    ];
  }
  
  /**
   * Formata o tipo de agente para exibição
   * @param agentType Tipo do agente
   * @returns Nome formatado
   */
  private formatAgentType(agentType: AgentType): string {
    const nameMap: Record<AgentType, string> = {
      [AgentType.COORDINATOR]: '👨‍💼 Coordenador',
      [AgentType.PLANNER]: '📝 Planejador',
      [AgentType.RESEARCHER]: '🔍 Pesquisador',
      [AgentType.ANALYST]: '📊 Analista',
      [AgentType.ADVISOR]: '🧠 Consultor',
      [AgentType.SUMMARIZER]: '📋 Sintetizador',
      [AgentType.EXECUTOR]: '⚙️ Executor',
      [AgentType.EVALUATOR]: '⚖️ Avaliador',
      [AgentType.CRITIC]: '🔬 Crítico',
      [AgentType.TRANSPORT_EXPERT]: '🚚 Especialista em Transporte',
      [AgentType.FARM_EXPERT]: '🌾 Especialista em Agricultura',
      [AgentType.FINANCE_EXPERT]: '💰 Especialista Financeiro',
      [AgentType.TECH_EXPERT]: '💻 Especialista em Tecnologia',
      [AgentType.PERSONAL_COACH]: '🧘 Coach Pessoal'
    };
    
    return nameMap[agentType] || `Agente ${agentType}`;
  }
  
  /**
   * Obtém o histórico completo de execução
   * @returns Array com o histórico
   */
  public getHistory(): CycleResult[] {
    return [...this.history];
  }
  
  /**
   * Retorna informações detalhadas sobre o status atual do dispatcher
   * @returns Objeto com informações de status
   */
  public getStatus(): any {
    // Calcula estatísticas sobre os ciclos
    const completedCycles = this.history.length;
    const totalCycles = this.options.maxCycles * this.options.agents.length;
    const failedCycles = this.history.filter(cycle => cycle.content.startsWith('Erro:')).length;
    
    // Calcula tempo médio por ciclo se houver ciclos completos
    let averageTimePerCycle = 0;
    if (completedCycles > 1) {
      const firstTimestamp = new Date(this.history[0].timestamp).getTime();
      const lastTimestamp = new Date(this.history[completedCycles - 1].timestamp).getTime();
      averageTimePerCycle = (lastTimestamp - firstTimestamp) / (completedCycles - 1);
    }
    
    // Coleta logs para monitoramento
    const logs: string[] = [];
    
    // Adiciona logs de inicialização
    if (this.task) {
      logs.push(`[${new Date().toISOString()}] Tarefa: ${this.task.title}`);
      logs.push(`[${new Date().toISOString()}] Agentes envolvidos: ${this.options.agents.join(', ')}`);
      logs.push(`[${new Date().toISOString()}] Máximo de ciclos: ${this.options.maxCycles}`);
    }
    
    // Adiciona logs do progresso atual
    logs.push(`[${new Date().toISOString()}] Progresso: ${completedCycles}/${totalCycles} ciclos (${Math.round(completedCycles/totalCycles*100)}%)`);
    
    // Pega informações do último agente executado (se houver)
    const currentAgentType = this.history.length > 0 ? 
      this.history[this.history.length - 1].agentType : 
      this.options.agents[0];
    
    // Determina o próximo agente (se houver)
    const currentAgentIndex = this.options.agents.indexOf(currentAgentType);
    const nextAgentType = currentAgentIndex < this.options.agents.length - 1 ? 
      this.options.agents[currentAgentIndex + 1] : 
      null;
    
    if (nextAgentType) {
      logs.push(`[${new Date().toISOString()}] Próximo agente: ${nextAgentType}`);
    }
    
    // Retorna objeto com todas as informações de status
    return {
      isRunning: this.isRunning,
      shouldStop: this.shouldStop,
      currentTaskId: this.task?.id,
      currentStepId: this.stepId,
      options: { ...this.options },
      progress: {
        completedCycles,
        totalCycles,
        failedCycles,
        percentComplete: Math.round(completedCycles/totalCycles*100)
      },
      timing: {
        averageTimePerCycle,
        currentCycleStartTime: this.history.length > 0 ? 
          this.history[this.history.length - 1].timestamp : null,
        estimatedTimeRemaining: averageTimePerCycle > 0 ? 
          averageTimePerCycle * (totalCycles - completedCycles) : null
      },
      currentState: {
        lastAgentType: currentAgentType,
        nextAgentType,
        contextLength: this.currentContext.length
      },
      logs,
      history: this.getHistory(),
      lastUpdate: new Date().toISOString()
    };
  }
  
  /**
   * Verifica se o dispatcher está em execução
   * @returns true se estiver em execução
   */
  public isExecuting(): boolean {
    return this.isRunning;
  }
}

/**
 * Cria e retorna uma nova instância do dispatcher com as opções especificadas
 * @param options Opções para o dispatcher
 * @returns Nova instância do dispatcher
 */
export function createIntensiveDispatcher(options: Partial<IntensiveDispatcherOptions> = {}): IntensiveDispatcher {
  const defaultOptions: IntensiveDispatcherOptions = {
    maxCycles: 5,
    timeout: 60000,
    notifyOnProgress: true,
    agents: [
      AgentType.COORDINATOR,
      AgentType.RESEARCHER,
      AgentType.ANALYST, 
      AgentType.ADVISOR,
      AgentType.SUMMARIZER
    ]
  };
  
  return new IntensiveDispatcher({
    ...defaultOptions,
    ...options
  });
}